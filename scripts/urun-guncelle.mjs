// Mağazadaki ürünlerin fiyatını ve görsellerini plan dosyasına göre günceller (ikas yönetim API'si).
// Plan (veri/urun-guncelle/plan.json): { urunler: [{ slug, ad, liste, satis, gorsel? }] }
//   liste: üstü çizili (indirimsiz) fiyat, satis: müşterinin ödediği fiyat (liste ile aynıysa indirim yok)
//   kapat: true → satış kapatılır: stok bitince satılmaz (sellIfOutOfStock=false) ve stok 0 yazılır (ürün sayfası "tükendi" kalır).
//   liste/satis verilmezse fiyata dokunulmaz.
//   gorsel: { ortak: [url...] } ya da { renk: { Bej: [url...], Gri: [url...] }, ortak: [...] }
//           verilirse ürünün eski görselleri kaldırılır, bu görseller sırasıyla yüklenir (ilki ana görsel).
// Ürün olduğu gibi okunur; yalnız fiyat ve görsel değiştirilerek kaydedilir; kayıttan sonra yeniden okunur ve
// başka bir alan değiştiyse durur. APPLY=1 değilse kuru çalıştırmadır (mağazaya dokunmaz).
// Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, PLAN, APPLY, SADECE (virgüllü slug listesi; deneme için)
import { readFile, appendFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const IMG_API = 'https://api.myikas.com/api/v1/admin/product/upload/image';
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
const byAd = new Map(hepsi.map((p) => [p.name, p]));
let turler = [];
for (const q of ['{ listVariantType { id name values { id name } } }', '{ listVariantType { data { id name values { id name } } } }']) { try { turler = listOf(await gql(q), 'listVariantType'); break; } catch { /* sonraki */ } }
const degerAdi = new Map(turler.flatMap((t) => (t.values || []).map((v) => [v.id, v.name])));

const plan = JSON.parse(await readFile(env.PLAN, 'utf8')).urunler;
const sadece = (env.SADECE || '').split(',').map((s) => s.trim()).filter(Boolean);
const apply = env.APPLY === '1';
log(`${env.IKAS_STORE}: ${hepsi.length} ürün · plan ${plan.length} · ${apply ? 'UYGULA' : 'deneme'}${sadece.length ? ' · yalnız ' + sadece.join(',') : ''}`);

const fiyatYaz = (v, liste, satis) => {
  const pr = (v.prices || []).map((x) => ({ ...x }));
  const ana = pr.find((x) => !x.priceListId) || (pr.push({ currency: 'TRY' }), pr[pr.length - 1]);
  ana.sellPrice = liste;
  ana.discountPrice = satis < liste ? satis : null;
  return pr;
};
const GORSEL_SINIR = 10; // ikas bir varyantta en fazla 10 görsel kabul ediyor
const gorselListe = (g, v) => {
  if (!g) return null;
  if (g.renk) for (const x of v.variantValueIds || []) { const ad = degerAdi.get(x.variantValueId); if (ad && g.renk[ad]) return g.renk[ad].concat(g.ortak || []).slice(0, GORSEL_SINIR); }
  return g.ortak ? g.ortak.slice(0, GORSEL_SINIR) : null;
};
async function gorselYukle(variantIds, url, order, isMain) {
  for (let deneme = 0; deneme < 3; deneme++) {
    const r = await fetch(IMG_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: JSON.stringify({ productImage: { variantIds, url, order, isMain } }) });
    if (r.ok) return;
    if (deneme === 2) throw new Error(`görsel yüklenemedi (${r.status}): ${(await r.text()).slice(0, 160)}`);
    await new Promise((s) => setTimeout(s, 2000));
  }
}
const disi = (p, kanal) => JSON.stringify({ ...p, updatedAt: undefined, ...(kanal ? { salesChannels: undefined, salesChannelIds: undefined } : {}), variants: p.variants.map((v) => ({ ...v, prices: undefined, images: undefined, stocks: undefined, sellIfOutOfStock: undefined, isActive: undefined })) });
const fiyatOzet = (p) => p.variants.map((v) => (v.prices || []).filter((x) => !x.priceListId).map((x) => `${x.sellPrice}${x.discountPrice != null ? '→' + x.discountPrice : ''}`).join('')).join(' / ');

let tamam = 0, atla = 0; const hatalar = [];
for (const u of plan) {
  if (sadece.length && !sadece.includes(u.slug)) continue;
  const k = bySlug.get(u.slug) || byAd.get(u.ad);
  if (!k) { log(`- BULUNAMADI: ${u.ad} (${u.slug})`); atla++; continue; }
  try {
    const once = await oku(k.id);
    if (once.type === 'BUNDLE') { log(`- ATLANDI (paket ürün): ${once.name}`); atla++; continue; }
    const yeniFiyat = once.variants.map((v) => (u.liste != null ? fiyatYaz(v, u.liste, u.satis) : v.prices));
    const stokOzet = once.variants.map((v) => (v.stocks || []).reduce((a, x) => a + (x.stockCount || 0), 0)).join('/');
    const kapatGerek = !!u.kapat && (once.variants.some((v) => v.sellIfOutOfStock !== false) ||
      (once.variants.some((v) => (v.stocks || []).some((x) => x.stockCount > 0)) && (once.salesChannels || []).some((c) => c.status !== 'PASSIVE')));
    const fiyatDegisir = JSON.stringify(yeniFiyat.map((p) => p.filter((x) => !x.priceListId).map((x) => [x.sellPrice, x.discountPrice ?? null]))) !==
      JSON.stringify(once.variants.map((v) => (v.prices || []).filter((x) => !x.priceListId).map((x) => [x.sellPrice, x.discountPrice ?? null])));
    const gList = once.variants.map((v) => gorselListe(u.gorsel, v));
    const gorselVar = gList.some((x) => x && x.length);
    if (!fiyatDegisir && !gorselVar && !kapatGerek) { log(`= AYNI: ${once.name}${u.kapat ? ` (satış zaten kapalı, stok ${stokOzet})` : ''}`); continue; }
    const yazi = `${once.name}: ${fiyatOzet(once)}${fiyatDegisir ? ` ⇒ ${u.liste}${u.satis < u.liste ? '→' + u.satis : ''}` : ''}${gorselVar ? ` · görsel ${once.variants.map((v) => (v.images || []).length).join('/')} ⇒ ${gList.map((x) => (x || []).length).join('/')}` : ''}${kapatGerek ? ` · SATIŞ KAPATILACAK (stoksuz satış ${once.variants.map((v) => (v.sellIfOutOfStock ? 'açık' : 'kapalı')).join('/')}, stok ${stokOzet})` : ''}`;
    const kanalOzet = (p) => (p.salesChannels || []).map((c) => c.status).join('/');
    if (!apply) { log('~ ' + yazi); tamam++; continue; }
    // Önce fiyat yazılır ve yeni görsel listesi olan varyantların eski görselleri kaldırılır (ikas varyant başına
    // görsel sayısını sınırlıyor), ardından yeni görseller sırasıyla yüklenir (aynı listeyi paylaşan varyantlara tek seferde).
    const girdi = {
      ...once,
      variants: once.variants.map((v, j) => ({ ...v, prices: yeniFiyat[j], images: gList[j] && gList[j].length ? [] : v.images, ...(kapatGerek ? { sellIfOutOfStock: false } : {}), stocks: undefined })),
    };
    await gql(`mutation($input: ${girdiTipi('saveProduct')}!) { saveProduct(input: $input) { id } }`, { input: await uyarla(girdi, girdiTipi('saveProduct')) });
    if (gorselVar) {
      const grup = new Map();
      once.variants.forEach((v, i) => { const l = gList[i]; if (!l || !l.length) return; const key = JSON.stringify(l); if (!grup.has(key)) grup.set(key, { l, ids: [] }); grup.get(key).ids.push(v.id); });
      for (const { l, ids } of grup.values()) for (let i = 0; i < l.length; i++) await gorselYukle(ids, l[i], i, i === 0);
    }
    let kanalKapali = false;
    if (kapatGerek && once.variants.some((v) => (v.stocks || []).some((x) => x.stockCount > 0))) {
      const st = once.variants.flatMap((v) => (v.stocks || []).filter((x) => x.stockCount > 0).map((x) => ({ productId: once.id, variantId: v.id, stockLocationId: x.stockLocationId, stockCount: 0 })));
      try { await gql('mutation($input: SaveStockLocationsInput!) { saveProductStockLocations(input: $input) }', { input: { productStockLocationInputs: st } }); }
      catch (e) {
        // Stok yazma izni olmayan mağazada (ikas özellik kısıtı; varyantı pasife alma da kabul edilmiyor) ürün,
        // satış kanallarında pasife alınarak yayından kaldırılır; panelden yeniden "görünür" yapılabilir
        log(`  not: ${once.name}: stok 0 yazılamadı (${e.message.slice(0, 120)}); satış kanallarında pasife alınıyor`);
        const ara = await oku(k.id);
        await gql(`mutation($input: ${girdiTipi('saveProduct')}!) { saveProduct(input: $input) { id } }`, { input: await uyarla({ ...ara, salesChannels: (ara.salesChannels || []).map((c) => ({ ...c, status: 'PASSIVE' })), variants: ara.variants.map((v) => ({ ...v, stocks: undefined })) }, girdiTipi('saveProduct')) });
        kanalKapali = true;
      }
    }
    const sonra = await oku(k.id);
    const eksikGorsel = sonra.variants.filter((v, j) => gList[j] && gList[j].length && (v.images || []).length !== gList[j].length);
    if (eksikGorsel.length) { log(`! DURDU: ${once.name}: görsel sayısı beklenenden farklı (${sonra.variants.map((v) => (v.images || []).length).join('/')})`); hatalar.push(once.name); break; }
    if (disi(once, kanalKapali) !== disi(sonra, kanalKapali)) {
      const a = JSON.parse(disi(once, kanalKapali)), b = JSON.parse(disi(sonra, kanalKapali));
      const fark = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((x) => JSON.stringify(a[x]) !== JSON.stringify(b[x]));
      log(`! DURDU: ${once.name} kaydında fiyat/görsel dışı alan değişti: ${fark.map((x) => `${x}: ${JSON.stringify(a[x]).slice(0, 300)} → ${JSON.stringify(b[x]).slice(0, 300)}`).join(' | ')}`);
      hatalar.push(once.name); break;
    }
    log(`✓ ${yazi} · sonuç ${fiyatOzet(sonra)} · görsel ${sonra.variants.map((v) => (v.images || []).length).join('/')}${u.kapat ? ` · stoksuz satış ${sonra.variants.map((v) => (v.sellIfOutOfStock ? 'AÇIK' : 'kapalı')).join('/')}, kanal ${kanalOzet(sonra)}, stok ${sonra.variants.map((v) => (v.stocks || []).reduce((a, x) => a + (x.stockCount || 0), 0)).join('/')}` : ''}`);
    tamam++;
  } catch (e) { hatalar.push(u.ad); log(`! HATA: ${u.ad}: ${e.message.slice(0, 400)}`); break; }
}
log(`Sonuç: ${tamam} ürün ${apply ? 'güncellendi' : 'güncellenecek'}, ${atla} atlandı, ${hatalar.length} hata`);
await summary();
process.exit(hatalar.length ? 1 : 0);
