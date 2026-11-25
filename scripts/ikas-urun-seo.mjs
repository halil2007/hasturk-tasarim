// Bahçe yatakları ve kuleleri ürün sayfaları: mevcut ad / açıklama / meta alanlarını okur (dump) ya da plana göre günceller (apply).
// MODE=dump: veri/yatak-urun-seo/dump-<OUT_NAME>.json yazar (yalnızca okuma).
// MODE=apply: PLAN dosyası { apply, urunler: [{ slug, ad?, aciklama?, pageTitle?, metaAciklama? }] }. apply: true değilse kuru çalıştırmadır.
//   Ürün olduğu gibi okunur; yalnız belirtilen alanlar değiştirilerek kaydedilir; kayıttan sonra yeniden okunur ve
//   istenen dışında bir alan değiştiyse (fiyat, stok, görsel, kategori, adres…) durur.
// Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, MODE, PLAN, OUT_NAME
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';

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
    await new Promise((s) => setTimeout(s, 300));
    return j.data;
  }
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const typeOf = async (name) => (await gql(`${T} query($n: String!) { __type(name: $n) { fields { name type { ...T } } inputFields { name type { ...T } } } }`, { n: name })).__type || {};
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const fold = (s) => String(s || '').toLocaleLowerCase('tr-TR').trim();
const UST = 'Bahçe Yatakları ve Kuleleri';

// kategori ağacı: üst kategori ve altındakiler
let cats;
try { cats = listOf(await gql('{ listCategory { id name parentId } }'), 'listCategory'); } catch { cats = listOf(await gql('{ listCategory { data { id name parentId } } }'), 'listCategory'); }
const kok = cats.find((c) => fold(c.name) === fold(UST));
if (!kok) await die(`"${UST}" kategorisi bulunamadı`);
const ids = new Set([kok.id]);
for (let k = 0; k < 4; k++) for (const c of cats) if (ids.has(c.parentId)) ids.add(c.id);

const TAM = `id name type categoryIds description shortDescription weight brandId tagIds salesChannelIds
  salesChannels { id status minQuantityPerCart maxQuantityPerCart productVolumeDiscountId }
  metaData { id slug pageTitle description }
  productVariantTypes { variantTypeId variantValueIds order }
  variants { id sku isActive barcodeList sellIfOutOfStock weight variantValueIds { variantTypeId variantValueId }
    prices { sellPrice discountPrice buyPrice currency priceListId } images { imageId isMain order isVideo } stocks { stockCount stockLocationId } }`;
const oku = async (id) => listOf(await gql(`query($id: StringFilterInput) { listProduct(id: $id) { data { ${TAM} } } }`, { id: { eq: id } }), 'listProduct')[0];
const hepsi = [];
for (let page = 1; page < 60; page++) {
  const d = (await gql(`query($page: Int!) { listProduct(pagination: { page: $page, limit: 100 }) { hasNext data { id name categoryIds metaData { slug } } } }`, { page })).listProduct;
  hepsi.push(...d.data); if (!d.hasNext || !d.data.length) break;
}
const bizim = hepsi.filter((p) => (p.categoryIds || []).some((c) => ids.has(c)));
log(`Mağaza: ${env.IKAS_STORE} · ${bizim.length} ürün "${UST}" altında`);

if ((env.MODE || 'dump') === 'dump') {
  const rows = [];
  for (const p of bizim) {
    const x = await oku(p.id);
    rows.push({ id: x.id, slug: x.metaData && x.metaData.slug, ad: x.name, pageTitle: x.metaData && x.metaData.pageTitle, metaAciklama: x.metaData && x.metaData.description,
      kisa: x.shortDescription, aciklama: x.description, sku: x.variants.map((v) => v.sku), fiyat: x.variants.map((v) => v.prices.map((q) => [q.sellPrice, q.discountPrice])), gorsel: x.variants.map((v) => v.images.length) });
  }
  await mkdir('veri/yatak-urun-seo', { recursive: true });
  await writeFile(`veri/yatak-urun-seo/dump-${env.OUT_NAME}.json`, JSON.stringify(rows, null, 1) + '\n');
  log(`Yazıldı: veri/yatak-urun-seo/dump-${env.OUT_NAME}.json (${rows.length} ürün; açıklaması boş: ${rows.filter((r) => !String(r.aciklama || '').trim()).length}, meta başlığı boş: ${rows.filter((r) => !r.pageTitle).length}, meta açıklaması boş: ${rows.filter((r) => !r.metaAciklama).length})`);
  await summary();
  process.exit(0);
}

// ---- apply ----
const plan = JSON.parse(await readFile(env.PLAN, 'utf8'));
const apply = plan.apply === true;
log(`${apply ? 'UYGULAMA' : 'KURU ÇALIŞTIRMA (hiçbir şey değişmez)'} · ${plan.urunler.length} ürün`);
const prodIn = tname(((await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } } }`)).__schema.mutationType.fields.find((f) => f.name === 'saveProduct').args.find((a) => a.name === 'input').type));
const tipAlan = new Map();
const uyarla = async (v, tn) => {
  if (Array.isArray(v)) return Promise.all(v.map((x) => uyarla(x, tn)));
  if (v === null || typeof v !== 'object') return v;
  if (!tipAlan.has(tn)) tipAlan.set(tn, (await typeOf(tn)).inputFields || []);
  const o = {};
  for (const f of tipAlan.get(tn)) if (v[f.name] != null) o[f.name] = await uyarla(v[f.name], tname(f.type));
  return o;
};
const bySlug = new Map(bizim.map((p) => [p.metaData && p.metaData.slug, p]));
const hata = []; let tamam = 0, ayni = 0, yok = 0;
for (const u of plan.urunler) {
  const p = bySlug.get(u.slug);
  if (!p) { log(`- BULUNAMADI: /${u.slug}`); yok++; continue; }
  const once = await oku(p.id);
  const g = JSON.parse(JSON.stringify(once));
  if (u.ad != null) g.name = u.ad;
  if (u.aciklama != null) g.description = u.aciklama;
  g.metaData = { ...(g.metaData || {}) };
  if (u.pageTitle != null) g.metaData.pageTitle = u.pageTitle;
  if (u.metaAciklama != null) g.metaData.description = u.metaAciklama;
  if (JSON.stringify(g) === JSON.stringify(once)) { ayni++; continue; }
  const dg = [u.ad != null && g.name !== once.name ? 'ad' : '', u.aciklama != null && g.description !== once.description ? 'açıklama' : '', u.pageTitle != null && g.metaData.pageTitle !== (once.metaData || {}).pageTitle ? 'meta başlık' : '', u.metaAciklama != null && g.metaData.description !== (once.metaData || {}).description ? 'meta açıklama' : ''].filter(Boolean).join(', ');
  if (!apply) { log(`  → ${once.name}${u.ad && u.ad !== once.name ? '  ⇒  ' + u.ad : ''}  [${dg}]`); tamam++; continue; }
  try {
    const ig = { ...g, variants: g.variants.map((v) => ({ ...v, stocks: undefined })) };
    await gql(`mutation($input: ${prodIn}!) { saveProduct(input: $input) { id } }`, { input: await uyarla(ig, prodIn) });
    const sonra = await oku(p.id);
    const kopya = (x) => JSON.stringify({ ...x, name: undefined, description: undefined, metaData: { ...x.metaData, pageTitle: undefined, description: undefined }, updatedAt: undefined });
    if (kopya(once) !== kopya(sonra)) {
      const a = JSON.parse(kopya(once)), b = JSON.parse(kopya(sonra));
      const fark = Object.keys({ ...a, ...b }).filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));
      throw new Error('istenmeyen alan değişti: ' + fark.join(', ') + ' ' + JSON.stringify(a[fark[0]]).slice(0, 200) + ' → ' + JSON.stringify(b[fark[0]]).slice(0, 200));
    }
    if (u.ad != null && sonra.name !== u.ad) throw new Error('ad yazılmadı');
    if (u.pageTitle != null && sonra.metaData.pageTitle !== u.pageTitle) throw new Error('meta başlık yazılmadı');
    log(`  ✓ ${sonra.name}  [${dg}]`); tamam++;
  } catch (e) { hata.push(u.slug); log(`! HATA: ${once.name}: ${e.message.slice(0, 500)}`); break; }
}
log(`Sonuç: ${tamam} ${apply ? 'güncellendi' : 'güncellenecek'}, ${ayni} zaten aynı, ${yok} bulunamadı, ${hata.length} hata`);
await summary();
process.exit(hata.length ? 1 : 0);
