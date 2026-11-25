// Bahçe Kulesi bahçe yatakları ve kuleleri: alt kategorileri açar, ürünleri bu alt kategorilere atar, belirtilen kategorileri
// (Viyoller, Dekoratif Saksılar) satış kanallarında pasife alır. Ürünler pasife alınmaz: arama ve ürün adresleri çalışmaya devam eder.
// Plan: scripts/yatak-duzen/plan-<site>.json { apply, ust, yeni[{name,slug,pageTitle,description,aciklama}], atama{ürün adresi: kategori adı}, pasif[kategori adı] }
// apply: true değilse kuru çalıştırmadır (hiçbir şey değişmez). Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, PLAN
import { readFile, appendFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const out = [];
const log = (s) => { out.push(s); console.log(s); };
async function summary() { if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n'); }
const die = async (msg) => { log('HATA: ' + msg); await summary(); process.exit(1); };

const tr = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }),
});
if (!tr.ok) await die(`token alınamadı (${tr.status})`);
const TOK = (await tr.json()).access_token;
async function gql(query, variables = {}) {
  for (let d = 0; ; d++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 && d < 8) { await new Promise((s) => setTimeout(s, 1500 * (d + 1))); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errors) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 500)}`);
    await new Promise((s) => setTimeout(s, 350));
    return j.data;
  }
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const leaf = (t) => { while (t.ofType) t = t.ofType; return t.kind === 'SCALAR' || t.kind === 'ENUM'; };
const typeOf = async (name) => (await gql(`${T} query($n: String!) { __type(name: $n) { fields { name type { ...T } } inputFields { name type { ...T } } } }`, { n: name })).__type || {};
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const fold = (s) => String(s || '').toLocaleLowerCase('tr-TR').trim();

const plan = JSON.parse(await readFile(env.PLAN, 'utf8'));
const apply = plan.apply === true;
log(`Mağaza: ${env.IKAS_STORE} · ${apply ? 'UYGULAMA' : 'KURU ÇALIŞTIRMA (hiçbir şey değişmez)'} · ${plan.yeni.length} yeni kategori, ${Object.keys(plan.atama).length} ürün ataması, pasif: ${plan.pasif.join(', ')}`);

// ---- şema: kategori ----
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } queryType { fields { name type { ...T } } } } }`);
const girdi = (n) => tname(sch.__schema.mutationType.fields.find((f) => f.name === n).args.find((a) => a.name === 'input').type);
const catIn = girdi('saveCategory'), prodIn = girdi('saveProduct');
const inT = await typeOf(catIn);
let outName = tname(sch.__schema.queryType.fields.find((f) => f.name === 'listCategory').type);
let outT = await typeOf(outName);
if (outT.fields && outT.fields.some((f) => f.name === 'data') && !outT.fields.some((f) => f.name === 'parentId')) { outName = tname(outT.fields.find((f) => f.name === 'data').type); outT = await typeOf(outName); }
const sel = [];
for (const f of inT.inputFields) {
  const o = (outT.fields || []).find((x) => x.name === f.name);
  if (!o) continue;
  if (leaf(o.type)) { sel.push(f.name); continue; }
  const sub = await typeOf(tname(o.type)), subIn = await typeOf(tname(f.type));
  const ks = (sub.fields || []).filter((x) => leaf(x.type) && (subIn.inputFields || []).some((y) => y.name === x.name)).map((x) => x.name);
  if (ks.length) sel.push(`${f.name} { ${ks.join(' ')} }`);
}
if (!sel.includes('id')) sel.unshift('id');
log(`saveCategory(${catIn}) alanları: ${inT.inputFields.map((f) => f.name).join(', ')}`);
const kategoriler = async () => {
  try { return listOf(await gql(`{ listCategory { ${sel.join(' ')} } }`), 'listCategory'); }
  catch { return listOf(await gql(`{ listCategory { data { ${sel.join(' ')} } } }`), 'listCategory'); }
};
let cats = await kategoriler();
const adla = (n, parentId) => cats.filter((c) => fold(c.name) === fold(n) && (parentId === undefined || c.parentId === parentId));
const kaydet = async (c) => {
  const inp = { ...c }; for (const k of Object.keys(inp)) if (inp[k] === null) delete inp[k];
  return (await gql(`mutation($input: ${catIn}!) { saveCategory(input: $input) { id name parentId } }`, { input: inp })).saveCategory;
};

// ---- 1) yeni alt kategoriler ----
const [ust] = adla(plan.ust);
if (!ust) await die(`"${plan.ust}" kategorisi bulunamadı`);
const slugVar = new Set(cats.map((c) => c.metaData && c.metaData.slug).filter(Boolean));
for (const y of plan.yeni) {
  if (adla(y.name, ust.id).length) { log(`= kategori var: ${y.name}`); continue; }
  if (slugVar.has(y.slug)) await die(`"/${y.slug}" adresi başka bir kategoride kullanılıyor (${y.name})`);
  log(`+ KATEGORİ AÇILACAK: ${plan.ust} > ${y.name} (/${y.slug})\n    ${y.pageTitle}\n    ${y.description}`);
  if (!apply) continue;
  const inp = { ...ust }; delete inp.id; delete inp.metaData;
  inp.name = y.name; inp.parentId = ust.id;
  inp.metaData = { slug: y.slug, pageTitle: y.pageTitle, description: y.description };
  if (inT.inputFields.some((f) => f.name === 'description')) inp.description = y.aciklama;
  const k = await kaydet(inp);
  log(`  ✓ açıldı: ${k.name} (${k.id})`);
}
if (apply) cats = await kategoriler();
const hedefId = {};
for (const y of plan.yeni) { const [c] = adla(y.name, ust.id); if (c) hedefId[y.name] = c.id; }

// ---- 2) ürün ataması ----
const TAM = `id name type categoryIds description shortDescription weight brandId tagIds salesChannelIds
  salesChannels { id status minQuantityPerCart maxQuantityPerCart productVolumeDiscountId }
  metaData { id slug pageTitle description }
  productVariantTypes { variantTypeId variantValueIds order }
  variants { id sku isActive barcodeList sellIfOutOfStock weight variantValueIds { variantTypeId variantValueId }
    prices { sellPrice discountPrice buyPrice currency priceListId } images { imageId isMain order isVideo } stocks { stockCount stockLocationId } }`;
const tipAlan = new Map();
const uyarla = async (v, tn) => {
  if (Array.isArray(v)) return Promise.all(v.map((x) => uyarla(x, tn)));
  if (v === null || typeof v !== 'object') return v;
  if (!tipAlan.has(tn)) tipAlan.set(tn, (await typeOf(tn)).inputFields || []);
  const o = {};
  for (const f of tipAlan.get(tn)) if (v[f.name] != null) o[f.name] = await uyarla(v[f.name], tname(f.type));
  return o;
};
const oku = async (id) => listOf(await gql(`query($id: StringFilterInput) { listProduct(id: $id) { data { ${TAM} } } }`, { id: { eq: id } }), 'listProduct')[0];
const hepsi = [];
for (let page = 1; page < 60; page++) {
  const d = (await gql(`query($page: Int!) { listProduct(pagination: { page: $page, limit: 100 }) { hasNext data { id name metaData { slug } } } }`, { page })).listProduct;
  hepsi.push(...d.data); if (!d.hasNext || !d.data.length) break;
}
const bySlug = new Map(hepsi.map((p) => [p.metaData && p.metaData.slug, p]));
const kopya = (p) => JSON.stringify({ ...p, categoryIds: undefined, updatedAt: undefined });
let tamam = 0, ayni = 0, yok = 0; const hata = [];
for (const [slug, kadi] of Object.entries(plan.atama)) {
  const p = bySlug.get(slug);
  if (!p) { log(`- BULUNAMADI: /${slug}`); yok++; continue; }
  const hid = hedefId[kadi];
  if (!hid && apply) { log(`! hedef kategori yok: ${kadi}`); hata.push(slug); continue; }
  const once = await oku(p.id);
  const yeniIds = [hid || `(${kadi})`];
  if (JSON.stringify([...(once.categoryIds || [])].sort()) === JSON.stringify(yeniIds.sort())) { ayni++; continue; }
  const eski = (once.categoryIds || []).map((i) => (cats.find((c) => c.id === i) || {}).name || i).join(' + ');
  if (!apply) { log(`  → ${once.name}: [${eski}] ⇒ [${kadi}]`); tamam++; continue; }
  try {
    const g = { ...once, categoryIds: yeniIds, variants: once.variants.map((v) => ({ ...v, stocks: undefined })) };
    await gql(`mutation($input: ${prodIn}!) { saveProduct(input: $input) { id } }`, { input: await uyarla(g, prodIn) });
    const sonra = await oku(p.id);
    if (JSON.stringify(sonra.categoryIds.sort()) !== JSON.stringify(yeniIds)) throw new Error('kategori yazılmadı: ' + JSON.stringify(sonra.categoryIds));
    if (kopya(once) !== kopya(sonra)) {
      const a = JSON.parse(kopya(once)), b = JSON.parse(kopya(sonra));
      const fark = Object.keys({ ...a, ...b }).filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));
      throw new Error('kategori dışında alan değişti: ' + fark.join(', ') + ' ' + JSON.stringify(a[fark[0]]).slice(0, 200) + ' → ' + JSON.stringify(b[fark[0]]).slice(0, 200));
    }
    log(`  ✓ ${once.name}: [${eski}] ⇒ [${kadi}]`); tamam++;
  } catch (e) { hata.push(slug); log(`! HATA: ${once.name}: ${e.message.slice(0, 500)}`); break; }
}
log(`Ürün ataması: ${tamam} ${apply ? 'yapıldı' : 'yapılacak'}, ${ayni} zaten doğru, ${yok} bulunamadı, ${hata.length} hata`);

// ---- 3) pasif kategoriler (satış kanallarında) ----
for (const ad of plan.pasif || []) {
  const [c] = adla(ad);
  if (!c) { log(`- kategori bulunamadı: ${ad}`); continue; }
  const kanal = c.salesChannels;
  if (!Array.isArray(kanal) || !kanal.length) { log(`! ${ad}: kategorinin satış kanalı alanı yok; ikas panelinden pasife alınabilir (alanlar: ${sel.join(', ')})`); continue; }
  const durum = kanal.map((x) => `${String(x.id).slice(0, 6)}:${x.status}`).join(' ');
  if (kanal.every((x) => x.status === 'PASSIVE')) { log(`= zaten pasif: ${ad} (${durum})`); continue; }
  log(`${apply ? '→ PASİFE ALINIYOR' : '→ PASİFE ALINACAK'}: ${ad} (${durum})`);
  if (!apply) continue;
  await kaydet({ ...c, salesChannels: kanal.map((x) => ({ ...x, status: 'PASSIVE' })) });
  const [yk] = (await kategoriler()).filter((x) => x.id === c.id);
  log(`  sonuç: ${(yk.salesChannels || []).map((x) => `${String(x.id).slice(0, 6)}:${x.status}`).join(' ')}`);
}
await summary();
process.exit(hata.length ? 1 : 0);
