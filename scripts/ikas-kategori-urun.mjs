// Yeni bir alt kategori açar ve plandaki ürünleri bu kategoriye EKLER (ürünlerin mevcut kategorileri aynen kalır).
// Plan (veri/kategori-urun/*.json): { ebeveyn, ornek, kategori: { ad, slug, pageTitle, description }, urunler: [slug...] }
//   ebeveyn: yeni kategorinin ana kategorisinin adı; ornek: satış kanalı ayarı kopyalanacak kardeş kategori (sitede görünsün diye)
// Ürün olduğu gibi okunur, yalnız categoryIds'e yeni kategori eklenerek kaydedilir; kayıttan sonra yeniden okunur ve
// başka bir alan değiştiyse durur. APPLY=1 değilse kuru çalıştırmadır (mağazaya dokunmaz).
// Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, PLAN, APPLY
import { readFile, appendFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const out = [];
const log = (s) => { out.push(s); console.log(s); };
async function summary() { if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n'); }
const die = async (msg) => { log('HATA: ' + msg); await summary(); process.exit(1); };

const r0 = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }),
});
if (!r0.ok) await die(`token alınamadı (${r0.status})`);
const TOK = (await r0.json()).access_token;
async function gql(query, variables = {}) {
  for (let deneme = 0; ; deneme++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 && deneme < 5) { await new Promise((s) => setTimeout(s, 2000 * (deneme + 1))); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errors) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 600)}`);
    return j.data;
  }
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const fold = (s) => String(s || '').toLocaleLowerCase('tr-TR').trim();
const alanlar = async (n) => ((await gql(`${T} query($n: String!) { __type(name: $n) { inputFields { name type { ...T } } } }`, { n })).__type || {}).inputFields || [];
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } } }`);
const girdiTipi = (n) => {
  const m = sch.__schema.mutationType.fields.find((f) => f.name === n);
  return m ? tname(m.args.find((a) => a.name === 'input').type) : null;
};
const tipAlan = new Map();
const uyarla = async (v, tn) => { // girdi tipinde olmayan ve boş alanları atar
  if (Array.isArray(v)) return Promise.all(v.map((x) => uyarla(x, tn)));
  if (v === null || typeof v !== 'object') return v;
  if (!tipAlan.has(tn)) tipAlan.set(tn, await alanlar(tn));
  const o = {};
  for (const f of tipAlan.get(tn)) if (v[f.name] != null) o[f.name] = await uyarla(v[f.name], tname(f.type));
  return o;
};
const TAM = `id name type categoryIds description shortDescription weight brandId tagIds salesChannelIds
  salesChannels { id status minQuantityPerCart maxQuantityPerCart productVolumeDiscountId }
  metaData { id slug pageTitle description }
  productVariantTypes { variantTypeId variantValueIds order }
  variants { id sku isActive barcodeList sellIfOutOfStock weight variantValueIds { variantTypeId variantValueId }
    prices { sellPrice discountPrice buyPrice currency priceListId } images { imageId isMain order isVideo } stocks { stockCount stockLocationId } }`;
const oku = async (id) => listOf(await gql(`query($id: StringFilterInput) { listProduct(id: $id) { data { ${TAM} } } }`, { id: { eq: id } }), 'listProduct')[0];

const plan = JSON.parse(await readFile(env.PLAN, 'utf8'));
const apply = env.APPLY === '1';
log(`${env.IKAS_STORE}: ${apply ? 'UYGULA' : 'KURU ÇALIŞTIRMA (hiçbir şey değişmez)'} · kategori "${plan.kategori.ad}" · ${plan.urunler.length} ürün`);

// --- Kategori ---
const KAT = 'id name parentId salesChannels { id status } metaData { slug pageTitle description }';
let cats;
try { cats = listOf(await gql(`{ listCategory { ${KAT} } }`), 'listCategory'); }
catch { try { cats = listOf(await gql(`{ listCategory { data { ${KAT} } } }`), 'listCategory'); } catch { cats = listOf(await gql('{ listCategory { data { id name parentId metaData { slug } } } }'), 'listCategory'); } }
const ebeveyn = cats.find((c) => fold(c.name) === fold(plan.ebeveyn));
if (!ebeveyn) await die(`Ana kategori bulunamadı: ${plan.ebeveyn}`);
const ornek = cats.find((c) => fold(c.name) === fold(plan.ornek) && c.parentId === ebeveyn.id);
let hedef = cats.find((c) => fold(c.name) === fold(plan.kategori.ad) && c.parentId === ebeveyn.id);
const slugCakisma = cats.find((c) => c.metaData && c.metaData.slug === plan.kategori.slug && c !== hedef);
if (slugCakisma) await die(`"${plan.kategori.slug}" adresi başka bir kategoride kullanılıyor: ${slugCakisma.name}`);
if (hedef) log(`= Kategori var: ${hedef.name} (id ${hedef.id})`);
else if (!apply) { log(`+ KATEGORİ AÇILACAK: ${plan.kategori.ad} (/${plan.kategori.slug}) ana kategori: ${ebeveyn.name}\n    ${plan.kategori.pageTitle}\n    ${plan.kategori.description}\n    satış kanalı örneği: ${ornek ? JSON.stringify(ornek.salesChannels) : '(örnek kategori yok)'}`); hedef = { id: '(yeni)' }; }
else {
  const catT = girdiTipi('saveCategory');
  const catF = await alanlar(catT);
  const inp = { name: plan.kategori.ad, parentId: ebeveyn.id, metaData: { slug: plan.kategori.slug, pageTitle: plan.kategori.pageTitle, description: plan.kategori.description } };
  if (catF.some((f) => f.name === 'conditions' && f.type.kind === 'NON_NULL')) inp.conditions = [];
  if (catF.some((f) => f.name === 'orderType' && f.type.kind === 'NON_NULL')) inp.orderType = 'MANUAL';
  if (ornek && ornek.salesChannels && ornek.salesChannels.length && catF.some((f) => f.name === 'salesChannels')) inp.salesChannels = ornek.salesChannels.map((k) => ({ id: k.id, status: k.status }));
  try { hedef = (await gql(`mutation($input: ${catT}!) { saveCategory(input: $input) { id name } }`, { input: inp })).saveCategory; }
  catch (e) { await die(`Kategori açılamadı: ${e.message}`); }
  log(`+ KATEGORİ AÇILDI: ${hedef.name} (id ${hedef.id}) · satış kanalı: ${inp.salesChannels ? JSON.stringify(inp.salesChannels) : 'verilmedi (ikas-kategori-yayin ile yayına alınmalı)'}`);
}

// --- Ürünler ---
const hepsi = [];
for (let page = 1; page < 60; page++) {
  const d = (await gql(`query($page: Int!) { listProduct(pagination: { page: $page, limit: 100 }) { hasNext data { id name metaData { slug } } } }`, { page })).listProduct;
  hepsi.push(...d.data); if (!d.hasNext || !d.data.length) break;
}
const bySlug = new Map(hepsi.map((p) => [p.metaData && p.metaData.slug, p]));
const catName = new Map(cats.map((c) => [c.id, c.name]));
const disi = (p) => JSON.stringify({ ...p, categoryIds: undefined, updatedAt: undefined, variants: p.variants.map((v) => ({ ...v, stocks: undefined })) });
let tamam = 0, atla = 0; const hatalar = [];
for (const slug of plan.urunler) {
  const k = bySlug.get(slug);
  if (!k) { log(`- BULUNAMADI: ${slug}`); atla++; continue; }
  try {
    const once = await oku(k.id);
    const mevcut = (once.categoryIds || []).map((c) => catName.get(c) || c).join(' + ');
    if ((once.categoryIds || []).includes(hedef.id)) { log(`= ZATEN VAR: ${once.name} [${mevcut}]`); continue; }
    if (!apply) { log(`~ EKLENECEK: ${once.name} [${mevcut}] + ${plan.kategori.ad}`); tamam++; continue; }
    const girdi = { ...once, categoryIds: [...(once.categoryIds || []), hedef.id], variants: once.variants.map((v) => ({ ...v, stocks: undefined })) };
    await gql(`mutation($input: ${girdiTipi('saveProduct')}!) { saveProduct(input: $input) { id } }`, { input: await uyarla(girdi, girdiTipi('saveProduct')) });
    const sonra = await oku(k.id);
    if (disi(once) !== disi(sonra)) {
      const a = JSON.parse(disi(once)), b = JSON.parse(disi(sonra));
      const fark = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));
      log(`! DURDU: ${once.name} kaydında kategori dışı alan değişti: ${fark.map((x) => `${x}: ${JSON.stringify(a[x]).slice(0, 300)} → ${JSON.stringify(b[x]).slice(0, 300)}`).join(' | ')}`);
      hatalar.push(once.name); break;
    }
    if (!(sonra.categoryIds || []).includes(hedef.id) || (once.categoryIds || []).some((c) => !(sonra.categoryIds || []).includes(c))) { log(`! DURDU: ${once.name}: kategori listesi beklenmedik (${(sonra.categoryIds || []).map((c) => catName.get(c) || c).join(' + ')})`); hatalar.push(once.name); break; }
    log(`✓ ${once.name}: ${mevcut} + ${plan.kategori.ad}`);
    tamam++;
  } catch (e) { hatalar.push(slug); log(`! HATA: ${slug}: ${e.message.slice(0, 400)}`); break; }
}
log(`Sonuç: ${tamam} ürün ${apply ? 'eklendi' : 'eklenecek'}, ${atla} bulunamadı, ${hatalar.length} hata`);
await summary();
process.exit(hatalar.length ? 1 : 0);
