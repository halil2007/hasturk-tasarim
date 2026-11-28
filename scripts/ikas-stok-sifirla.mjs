// Plandaki ürünlerin (slug) tüm varyantlarının stoğunu 0 yapar; başka hiçbir alana dokunmaz.
// Plan (veri/stok/*.json): { marka, urunler: [slug...] }. Marka planda varsa ürünün ikas'taki markası doğrulanır.
// Yazmadan önce ve sonra stok okunur; APPLY=1 değilse kuru çalıştırmadır (mağazaya dokunmaz).
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
    if (!r.ok || j.errors) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 500)}`);
    return j.data;
  }
}
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const plan = JSON.parse(await readFile(env.PLAN, 'utf8'));
const apply = env.APPLY === '1';
log(`${env.IKAS_STORE}: ${apply ? 'UYGULA' : 'KURU ÇALIŞTIRMA (hiçbir şey değişmez)'} · ${plan.urunler.length} ürün · marka ${plan.marka || '-'}`);

let markalar = new Map();
try { markalar = new Map(listOf(await gql('{ listBrand { id name } }'), 'listBrand').map((b) => [b.id, b.name])); } catch (e) { log('not: marka listesi okunamadı: ' + e.message.slice(0, 120)); }

const hepsi = [];
for (let page = 1; page < 60; page++) {
  const d = (await gql(`query($page: Int!) { listProduct(pagination: { page: $page, limit: 100 }) { hasNext data { id name brandId metaData { slug } variants { id sku sellIfOutOfStock stocks { stockCount stockLocationId } } } } }`, { page })).listProduct;
  hepsi.push(...d.data); if (!d.hasNext || !d.data.length) break;
}
const bySlug = new Map(hepsi.map((p) => [p.metaData && p.metaData.slug, p]));
const topla = (p) => p.variants.reduce((a, v) => a + (v.stocks || []).reduce((b, x) => b + (x.stockCount || 0), 0), 0);
let sifirlanan = 0, zatenSifir = 0, yok = 0, markaFarki = 0, satisAcik = 0; const hatalar = [];
for (const slug of plan.urunler) {
  const p = bySlug.get(slug);
  if (!p) { log(`- BULUNAMADI: ${slug}`); yok++; continue; }
  const marka = markalar.get(p.brandId);
  if (plan.marka && marka && marka.toLowerCase() !== plan.marka.toLowerCase()) { log(`- ATLANDI (marka ${marka}): ${p.name}`); markaFarki++; continue; }
  if (p.variants.some((v) => v.sellIfOutOfStock)) satisAcik++;
  const once = topla(p);
  if (once === 0) { zatenSifir++; continue; }
  if (!apply) { log(`~ SIFIRLANACAK: ${p.name} (stok ${once})`); sifirlanan++; continue; }
  const st = p.variants.flatMap((v) => (v.stocks || []).filter((x) => x.stockCount > 0).map((x) => ({ productId: p.id, variantId: v.id, stockLocationId: x.stockLocationId, stockCount: 0 })));
  try {
    await gql('mutation($input: SaveStockLocationsInput!) { saveProductStockLocations(input: $input) }', { input: { productStockLocationInputs: st } });
    log(`✓ ${p.name}: stok ${once} ⇒ 0`);
    sifirlanan++;
  } catch (e) { hatalar.push(p.name); log(`! HATA: ${p.name}: ${e.message.slice(0, 300)}`); if (hatalar.length >= 3) { log('Üç hata üst üste: duruldu.'); break; } }
}
log(`Sonuç: ${sifirlanan} ürün ${apply ? 'sıfırlandı' : 'sıfırlanacak'}, ${zatenSifir} zaten sıfırdı, ${yok} bulunamadı, ${markaFarki} marka farkıyla atlandı, ${hatalar.length} hata. Stok sıfırken satışı açık kalan (sellIfOutOfStock) ürün: ${satisAcik}`);
await summary();
process.exit(hatalar.length ? 1 : 0);
