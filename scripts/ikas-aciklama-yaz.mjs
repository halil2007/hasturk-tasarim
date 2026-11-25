// Plan dosyasındaki ürünlerin yalnız açıklama (HTML) ve/veya meta başlık-açıklama alanlarını günceller (ikas yönetim API'si); başka hiçbir alana dokunmaz.
// Plan: { urunler: [{ site: "hasturk"|"tarim", slug, ad, aciklama?, metaData?: { pageTitle?, description? } }] }. Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, PLAN, SITE, APPLY

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
const alanlar = async (n) => ((await gql(`${T} query($n: String!) { __type(name: $n) { inputFields { name type { ...T } } } }`, { n })).__type || {}).inputFields || [];
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } } }`);
const girdiTipi = (n) => tname(sch.__schema.mutationType.fields.find((f) => f.name === n).args.find((a) => a.name === 'input').type);
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
const oku = async (q) => listOf(await gql(`query($id: StringFilterInput) { listProduct(id: $id) { data { ${TAM} } } }`, { id: { eq: q } }), 'listProduct')[0];


// Bütün ürünlerin adresi (slug) → kimlik
const hepsi = [];
for (let page = 1; page < 60; page++) {
  const d = (await gql(`query($page: Int!) { listProduct(pagination: { page: $page, limit: 100 }) { hasNext data { id name metaData { slug } } } }`, { page })).listProduct;
  hepsi.push(...d.data); if (!d.hasNext || !d.data.length) break;
}
const bySlug = new Map(hepsi.map((p) => [p.metaData && p.metaData.slug, p]));
const plan = JSON.parse(await readFile(env.PLAN, 'utf8')).urunler.filter((u) => !env.SITE || u.site === env.SITE);
const apply = env.APPLY === '1';
log(`${env.IKAS_STORE}: ${hepsi.length} ürün · plan ${plan.length} · ${apply ? 'UYGULA' : 'deneme'}`);
let tamam = 0; const hatalar = [];
for (const u of plan) {
  const k = bySlug.get(u.slug);
  if (!k) { log(`- BULUNAMADI: ${u.ad} (${u.slug})`); hatalar.push(u.ad); continue; }
  try {
    const once = await oku(k.id);
    const yeniAcik = u.aciklama != null ? u.aciklama : once.description;
    const yeniMeta = u.metaData ? { ...once.metaData, pageTitle: u.metaData.pageTitle ?? (once.metaData || {}).pageTitle, description: u.metaData.description ?? (once.metaData || {}).description } : once.metaData;
    const acikDegisir = (once.description || '') !== (yeniAcik || '');
    const metaDegisir = JSON.stringify([(once.metaData || {}).pageTitle, (once.metaData || {}).description]) !== JSON.stringify([(yeniMeta || {}).pageTitle, (yeniMeta || {}).description]);
    if (!acikDegisir && !metaDegisir) { log(`= AYNI: ${once.name}`); continue; }
    log(`~ ${once.name}:${acikDegisir ? ` açıklama ${(once.description || '').length} → ${yeniAcik.length} karakter;` : ''}${metaDegisir ? ` meta: "${(once.metaData || {}).pageTitle}" → "${yeniMeta.pageTitle}"` : ''}`);
    if (!apply) { tamam++; continue; }
    const girdi = { ...once, description: yeniAcik, metaData: yeniMeta, variants: once.variants.map((v) => ({ ...v, stocks: undefined })) };
    await gql(`mutation($input: ${girdiTipi('saveProduct')}!) { saveProduct(input: $input) { id } }`, { input: await uyarla(girdi, girdiTipi('saveProduct')) });
    const sonra = await oku(k.id);
    if (sonra.description !== yeniAcik) throw new Error('açıklama yazıldıktan sonra farklı okundu');
    if (metaDegisir && ((sonra.metaData || {}).pageTitle !== yeniMeta.pageTitle || (sonra.metaData || {}).description !== yeniMeta.description)) throw new Error('meta yazıldıktan sonra farklı okundu');
    const norm = (p) => JSON.stringify({ ...p, updatedAt: undefined, description: undefined, metaData: p.metaData && { slug: p.metaData.slug }, variants: p.variants.map((v) => ({ ...v, stocks: undefined, images: (v.images || []).map((i) => i.imageId) })) });
    if (norm(once) !== norm(sonra)) { log(`! DURDU: ${once.name}: açıklama/meta dışında alan değişti`); hatalar.push(once.name); break; }
    log(`✓ ${once.name}: güncellendi`);
    tamam++;
  } catch (e) { hatalar.push(u.ad); log(`! HATA: ${u.ad}: ${e.message.slice(0, 400)}`); break; }
}
log(`Sonuç: ${tamam} ürün ${apply ? 'güncellendi' : 'güncellenecek'}, ${hatalar.length} hata`);
await summary();
process.exit(hatalar.length ? 1 : 0);
