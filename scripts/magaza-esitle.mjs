// İki ikas mağazasını eşitler: kaynak mağazada olup hedefte olmayan ürünleri hedefe ekler.
// Ürünün adı, fiyatı, stoğu, seçenekleri (varyant), görselleri, markası ve kategori yolu kaynaktan okunur;
// açıklama ve meta bilgileri (sayfa başlığı, meta açıklama) hedef mağaza için ayrıca yazılmış dosyadan gelir.
//
// MOD=disa  → kaynak mağazadaki listedeki ürünlerin bütün bilgilerini DISA_DOSYA'ya yazar (mağazaya dokunmaz).
//             Ayrıca hedef mağazanın yazma şemasını (marka, seçenek türü, stok mutasyonları) özete döker.
// MOD=ekle  → ICERIK dosyasındaki ürünleri hedef mağazaya ekler. APPLY=1 değilse kuru çalıştırmadır.
//             Tekrar çalıştırmak güvenlidir: hedefte aynı adreste (slug) ürün varsa dokunulmaz.
// Ortam: KAYNAK_STORE/KAYNAK_ID/KAYNAK_SECRET, HEDEF_STORE/HEDEF_ID/HEDEF_SECRET, KAYNAK_JSON (merchant için
//        public/products.json ya da public/tarim/products.json), LISTE + YON (disa), ICERIK (ekle), APPLY
import { readFile, writeFile, appendFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const IMG_API = 'https://api.myikas.com/api/v1/admin/product/upload/image';
const out = [];
const log = (s) => { out.push(s); console.log(s); };
async function summary() { if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n'); }
const die = async (msg) => { log('HATA: ' + msg); await summary(); process.exit(1); };

async function token(store, id, secret) {
  const r = await fetch(`https://${store}.myikas.com/api/admin/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  const t = await r.text();
  if (!r.ok) await die(`${store}: token alınamadı (${r.status}): ${t.slice(0, 200)}`);
  return JSON.parse(t).access_token;
}
function istemci(tok) {
  return async (query, variables = {}) => {
    for (let deneme = 0; ; deneme++) {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ query, variables }) });
      if (r.status === 429 && deneme < 5) { await new Promise((s) => setTimeout(s, 2000 * (deneme + 1))); continue; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.errors) { const e = new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 600)}`); e.gql = !!j.errors; throw e; }
      return j.data;
    }
  };
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const fold = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

// Alanı olmayan sürümlerde sorgu, hata veren isteğe bağlı alan çıkarılarak yeniden denenir
async function esnek(gql, build, opt, vars) {
  const act = { ...opt };
  for (;;) {
    try { return { data: await gql(build(act), vars), act }; } catch (e) {
      const m = e.message;
      const alan = (m.match(/Cannot query field \\*"(\w+)\\*"/) || [])[1];
      const bad = Object.keys(act).filter((k) => act[k] && act[k].split(/[\s{]/)[0] === alan);
      if (!e.gql || !bad.length) throw e;
      log(`not: ${bad.join(', ')} alanı okunamadı, onsuz devam`);
      for (const k of bad) act[k] = '';
    }
  }
}
const URUN_OPT = {
  description: 'description', shortDescription: 'shortDescription', weight: 'weight',
  metaData: 'metaData { slug pageTitle description }', brand: 'brand { id name }', tags: 'tags { id name }',
  salesChannelIds: 'salesChannelIds', productVariantTypes: 'productVariantTypes { variantTypeId variantValueIds order }',
  barcodeList: 'barcodeList', sellIfOutOfStock: 'sellIfOutOfStock', variantValueIds: 'variantValueIds { variantTypeId variantValueId }',
  vweight: 'weight', stockLocationId: 'stockLocationId', bundleSettings: 'bundleSettings { products { productId quantity } }',
};
const urunSorgu = (o) => `query ($page: Int!) { listProduct(pagination: { page: $page, limit: 100 }) { hasNext data {
  id name type categoryIds ${o.description} ${o.shortDescription} ${o.weight} ${o.metaData} ${o.brand} ${o.tags} ${o.salesChannelIds} ${o.productVariantTypes} ${o.bundleSettings}
  variants { id sku isActive ${o.barcodeList} ${o.sellIfOutOfStock} ${o.variantValueIds} ${o.vweight}
    prices { sellPrice discountPrice priceListId } stocks { stockCount ${o.stockLocationId} } images { imageId fileName isMain order isVideo } } } } }`;
async function tumUrunler(gql) {
  let opt = URUN_OPT; const all = [];
  for (let page = 1; page < 60; page++) {
    const r = await esnek(gql, urunSorgu, opt, { page }); opt = r.act;
    all.push(...r.data.listProduct.data);
    if (!r.data.listProduct.hasNext || !r.data.listProduct.data.length) break;
  }
  return all;
}
async function kategoriler(gql) {
  try { return listOf(await gql('{ listCategory { id name parentId metaData { slug pageTitle description } } }'), 'listCategory'); }
  catch { return listOf(await gql('{ listCategory { data { id name parentId metaData { slug } } } }'), 'listCategory'); }
}
async function varyantTurleri(gql) {
  for (const q of ['{ listVariantType { id name selectionType values { id name colorCode } } }', '{ listVariantType { id name values { id name } } }', '{ listVariantType { data { id name values { id name } } } }']) {
    try { return listOf(await gql(q), 'listVariantType'); } catch { /* sonraki */ }
  }
  return [];
}
// Sitenin satış kanalının (STOREFRONT) depoları: stok yalnız buradan sayılır/yazılır
async function vitrinDepolari(gql) {
  try {
    const list = (await gql('{ listSalesChannel { id name type stockLocations { id } } }')).listSalesChannel || [];
    const ch = list.find((c) => c.type === 'STOREFRONT');
    return ch ? { kanal: ch.id, depolar: (ch.stockLocations || []).map((l) => l.id) } : null;
  } catch (e) { log('not: satış kanalı okunamadı: ' + e.message.slice(0, 160)); return null; }
}
const yol = (cats, id) => { const o = []; let c = cats.find((x) => x.id === id); for (let i = 0; c && i < 8; i++) { o.unshift(c.name); c = cats.find((x) => x.id === c.parentId); } return o; };

const kaynakJson = JSON.parse(await readFile(env.KAYNAK_JSON, 'utf8'));
const merchant = kaynakJson.merchant;
const gorselUrl = (img) => `https://cdn.myikas.com/images/${merchant}/${img.imageId}/1512/${encodeURIComponent((img.fileName || 'image').replace(/\.[a-z0-9]+$/i, ''))}.webp`;

const kGql = istemci(await token(env.KAYNAK_STORE, env.KAYNAK_ID, env.KAYNAK_SECRET));
const hTok = await token(env.HEDEF_STORE, env.HEDEF_ID, env.HEDEF_SECRET);
const hGql = istemci(hTok);
const MOD = env.MOD || 'disa';
log(`Kaynak: ${env.KAYNAK_STORE} → hedef: ${env.HEDEF_STORE} · mod: ${MOD}${MOD === 'ekle' ? (env.APPLY === '1' ? ' (UYGULAMA)' : ' (KURU ÇALIŞTIRMA)') : ''}`);

const [kUrun, kKat, kTur, kDepo] = await Promise.all([tumUrunler(kGql), kategoriler(kGql), varyantTurleri(kGql), vitrinDepolari(kGql)]);
const turAd = new Map(); const degerAd = new Map();
for (const t of kTur) { turAd.set(t.id, t.name); for (const v of t.values || []) degerAd.set(v.id, v.name); }
const stokSay = (v) => (v.stocks || []).filter((s) => !kDepo || !s.stockLocationId || kDepo.depolar.includes(s.stockLocationId)).reduce((a, s) => a + (s.stockCount || 0), 0);

// Kaynak ürünü hedefe taşınacak sade biçime çevirir
function sade(p) {
  return {
    id: p.id, ad: p.name, tur: p.type, aciklama: p.description || '', kisaAciklama: p.shortDescription || '', agirlik: p.weight ?? null,
    metaData: p.metaData || null, marka: p.brand ? p.brand.name : null, etiketler: (p.tags || []).map((t) => t.name),
    kategoriler: (p.categoryIds || []).map((id) => yol(kKat, id)),
    secenekler: (p.productVariantTypes || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((t) => ({ ad: turAd.get(t.variantTypeId), degerler: (t.variantValueIds || []).map((x) => degerAd.get(x)) })),
    paket: p.bundleSettings || null,
    varyantlar: (p.variants || []).map((v) => ({
      sku: v.sku || null, barkod: v.barcodeList || [], aktif: v.isActive !== false, stoksuzSat: !!v.sellIfOutOfStock, agirlik: v.weight ?? null,
      degerler: (v.variantValueIds || []).map((x) => ({ tur: turAd.get(x.variantTypeId), deger: degerAd.get(x.variantValueId) })),
      fiyat: (v.prices || []).filter((x) => !x.priceListId).map((x) => ({ satis: x.sellPrice, indirimli: x.discountPrice ?? null }))[0] || null,
      stok: stokSay(v),
      gorseller: (v.images || []).filter((i) => !i.isVideo && i.imageId).sort((a, b) => a.order - b.order).map((i) => ({ id: i.imageId, url: gorselUrl(i), ana: !!i.isMain })),
      videolar: (v.images || []).filter((i) => i.isVideo).length,
    })),
  };
}

if (MOD === 'disa') {
  const liste = JSON.parse(await readFile(env.LISTE, 'utf8'))[env.YON];
  const byId = new Map(kUrun.map((p) => [p.id, p]));
  const sonuc = []; const yok = [];
  for (const l of liste) { const p = byId.get(l.id); if (p) sonuc.push(sade(p)); else yok.push(l.ad); }
  await writeFile(env.DISA_DOSYA, JSON.stringify({ kaynak: env.KAYNAK_STORE, hedef: env.HEDEF_STORE, tarih: new Date().toISOString(), urunler: sonuc }, null, 1));
  log(`${sonuc.length} ürün okundu → ${env.DISA_DOSYA}${yok.length ? `; kaynakta bulunamayan: ${yok.join(' | ')}` : ''}`);
  log(`Seçenekli ürün: ${sonuc.filter((u) => u.secenekler.length).length}, paket ürün: ${sonuc.filter((u) => u.paket).length}, videolu: ${sonuc.filter((u) => u.varyantlar.some((v) => v.videolar)).length}`);
  // Hedefin yazma şeması: ekleme adımını yazarken kullanılır
  const sch = await hGql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } } }`);
  const ilgili = sch.__schema.mutationType.fields.filter((f) => /brand|variantType|stock|saveProduct$|productImage|tag/i.test(f.name));
  for (const m of ilgili) {
    const a = m.args.map((x) => `${x.name}: ${tname(x.type)}`).join(', ');
    log(`mutasyon ${m.name}(${a})`);
    for (const x of m.args) {
      const tn = tname(x.type);
      try {
        const d = await hGql(`${T} query($n: String!) { __type(name: $n) { inputFields { name type { ...T } } } }`, { n: tn });
        const f = (d.__type && d.__type.inputFields) || [];
        if (f.length) log(`   ${tn}: ${f.map((y) => y.name + ':' + tname(y.type) + (y.type.kind === 'NON_NULL' ? '!' : '')).join(', ')}`);
      } catch { /* skaler */ }
    }
  }
  const hDepo = await vitrinDepolari(hGql);
  log(`Hedef vitrin kanalı ve depoları: ${JSON.stringify(hDepo)} · kaynak: ${JSON.stringify(kDepo)}`);
  await summary();
  process.exit(0);
}
// ---------------------------------------------------------------- ekle
const icerik = JSON.parse(await readFile(env.ICERIK, 'utf8'));
const apply = env.APPLY === '1';
const sonucDosya = env.SONUC_DOSYA;
const inTip = async (n) => {
  const d = await hGql(`${T} query($n: String!) { __type(name: $n) { inputFields { name type { ...T } } enumValues { name } } }`, { n });
  return d.__type || {};
};
const alanlar = async (n) => ((await inTip(n)).inputFields || []);
const sch = await hGql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } } }`);
const mut = (n) => sch.__schema.mutationType.fields.find((f) => f.name === n);
const girdiTipi = (n) => tname(mut(n).args.find((a) => a.name === 'input').type);
const PI = await alanlar('ProductInput');
const altTip = async (fs, n) => { const f = fs.find((x) => x.name === n); return f ? { tn: tname(f.type), f: await alanlar(tname(f.type)) } : null; };
const VI = await altTip(PI, 'variants'), PRI = VI && (await altTip(VI.f, 'prices')), PVT = await altTip(PI, 'productVariantTypes');
const SLI = await alanlar(tname((await alanlar('SaveStockLocationsInput')).find((f) => f.name === 'productStockLocationInputs').type));
const VTI = await alanlar('VariantTypeInput'), VVI = await altTip(VTI, 'values');
const SCI = await altTip(PI, 'salesChannels');
const goster = (ad, fs) => log(`${ad}: ${fs.map((f) => f.name + (f.type.kind === 'NON_NULL' ? '!' : '')).join(', ')}`);
goster('VariantInput', VI.f); goster('prices', PRI.f); goster('productVariantTypes', PVT.f); goster('stok', SLI); goster('VariantValueInput', VVI.f);
if (SCI) goster('salesChannels', SCI.f);
const selEnum = (await inTip('VariantSelectionTypeEnum')).enumValues || [];
log('Seçenek tipleri: ' + selEnum.map((e) => e.name).join(', '));
const var_ = (fs, n) => fs.some((f) => f.name === n);

// Hedefin mevcut verileri
const [hUrun, hDepo] = await Promise.all([tumUrunler(hGql), vitrinDepolari(hGql)]);
let hKat = await kategoriler(hGql), hTur = await varyantTurleri(hGql);
const listeAl = async (qs, k) => { for (const q of qs) { try { return listOf(await hGql(q), k); } catch { /* sonraki */ } } return []; };
const hMarka = await listeAl(['{ listProductBrand { id name } }', '{ listProductBrand { data { id name } } }'], 'listProductBrand');
const hEtiket = await listeAl(['{ listProductTag { id name } }', '{ listProductTag { data { id name } } }'], 'listProductTag');
const hSlug = new Set(hUrun.map((p) => p.metaData && p.metaData.slug).filter(Boolean));
const hAd = new Set(hUrun.map((p) => fold(p.name)));
let ornek = null;
try { ornek = listOf(await hGql('{ listProduct(pagination: { limit: 5 }) { data { salesChannelIds salesChannels { id status } } } }'), 'listProduct').find((p) => (p.salesChannelIds || []).length) || null; }
catch { try { ornek = listOf(await hGql('{ listProduct(pagination: { limit: 5 }) { data { salesChannelIds } } }'), 'listProduct').find((p) => (p.salesChannelIds || []).length) || null; } catch { /* yok */ } }
log(`Hedef: ${hUrun.length} ürün, ${hKat.length} kategori, ${hMarka.length} marka, ${hEtiket.length} etiket, ${hTur.length} seçenek türü · örnek kanal ${JSON.stringify(ornek)}`);

const kById = new Map(kUrun.map((p) => [p.id, p]));
const kSlug = (path) => { // kaynaktaki kategori adresi
  let parent = null, c = null;
  for (const ad of path) { c = kKat.find((x) => fold(x.name) === fold(ad) && (x.parentId || null) === parent); if (!c) return null; parent = c.id; }
  return c && c.metaData ? c.metaData.slug : null;
};
const genelKatMeta = (path) => {
  const ad = path[path.length - 1], m = (icerik.kategoriMeta || {})[path.join(' > ')];
  if (m) return m;
  const site = icerik.site === 'tarim' ? 'Tarım Dünyası' : 'HasTürk Gübre';
  let t = `${ad} | ${site}`; if (t.length > 60) t = ad;
  let d = `${ad} çeşitleri ${site}'nda. Ürün özelliklerini, ölçü ve fiyatlarını karşılaştırın; stoktaki ürünleri hemen sipariş verin.`;
  if (d.length > 158) d = `${ad} çeşitleri ${site}'nda: özellik, ölçü ve fiyatları karşılaştırın, hemen sipariş verin.`;
  return { pageTitle: t, description: d };
};
// Kategorinin sitede görünmesi satış kanalı ayarına bağlı: yeni kategoriler hedefteki kategorilerin çoğundaki ayarı alır
// (verilmezse kategori açılır ama sayfası "bulunamadı" der). Güncellemede kategorinin bütün alanları aynen geri gönderilir.
const katGirdi = girdiTipi('saveCategory'), katAlan = await alanlar(katGirdi);
const katSec = [];
{ // seçim: girdi tipinde olup listCategory çıktısında da bulunan alanlar (alt nesnelerde yalnız düz alanlar)
  const cikti = async (n) => (await hGql(`${T} query($n: String!) { __type(name: $n) { fields { name type { ...T } } } }`, { n })).__type || {};
  const q = await hGql(`${T} { __schema { queryType { fields { name type { ...T } } } } }`);
  let outT = await cikti(tname(q.__schema.queryType.fields.find((f) => f.name === 'listCategory').type));
  if ((outT.fields || []).some((f) => f.name === 'data') && !(outT.fields || []).some((f) => f.name === 'parentId')) outT = await cikti(tname(outT.fields.find((f) => f.name === 'data').type));
  const duz = (t) => !['OBJECT', 'INPUT_OBJECT'].includes((function k(x) { return x.ofType ? k(x.ofType) : x; })(t).kind);
  for (const f of katAlan) {
    const o = (outT.fields || []).find((x) => x.name === f.name);
    if (!o) continue;
    if (duz(o.type)) { katSec.push(f.name); continue; }
    const sub = await cikti(tname(o.type)), subIn = await inTip(tname(f.type));
    const ks = (sub.fields || []).filter((x) => duz(x.type) && (subIn.inputFields || []).some((y) => y.name === x.name)).map((x) => x.name);
    if (ks.length) katSec.push(`${f.name} { ${ks.join(' ')} }`);
  }
}
if (!katSec.includes('id')) katSec.unshift('id');
let hKatTam = [];
try { hKatTam = listOf(await hGql(`{ listCategory { ${katSec.join(' ')} } }`), 'listCategory'); }
catch (e) { try { hKatTam = listOf(await hGql(`{ listCategory { data { ${katSec.join(' ')} } } }`), 'listCategory'); } catch (e2) { log('UYARI: kategori alanları okunamadı: ' + e2.message.slice(0, 200)); } }
const bosKanal = (c) => !c.salesChannels || !c.salesChannels.length || !c.salesChannels.some((x) => x.status && x.status !== 'PASSIVE' && x.status !== 'HIDDEN');
let KAT_SC = null;
{
  const say = new Map();
  for (const c of hKatTam) if (!bosKanal(c)) { const k = JSON.stringify(c.salesChannels); say.set(k, (say.get(k) || 0) + 1); }
  const en = [...say].sort((a, b) => b[1] - a[1])[0];
  if (en) KAT_SC = JSON.parse(en[0]);
  log(`Kategori satış kanalı: ${en ? en[1] : 0}/${hKatTam.length} kategorideki ayar → ${JSON.stringify(KAT_SC)} · kanalsız ${hKatTam.filter(bosKanal).length}`);
}
const yeniKat = [];
async function kategoriYolu(path) {
  let parent = null, c = null;
  for (let i = 0; i < path.length; i++) {
    const ad = path[i], alt = path.slice(0, i + 1);
    c = hKat.find((x) => fold(x.name) === fold(ad) && (x.parentId || null) === parent);
    if (!c) {
      const meta = genelKatMeta(alt);
      const slug = kSlug(alt) || slugla(ad);
      if (!apply) { c = { id: `(yeni:${alt.join('>')})`, name: ad, parentId: parent }; }
      else {
        const inp = { name: ad, metaData: { slug, pageTitle: meta.pageTitle, description: meta.description } };
        if (parent) inp.parentId = parent;
        if (KAT_SC) inp.salesChannels = KAT_SC;
        const ci = await alanlar(girdiTipi('saveCategory'));
        if (ci.some((f) => f.name === 'conditions' && f.type.kind === 'NON_NULL')) inp.conditions = [];
        if (ci.some((f) => f.name === 'orderType' && f.type.kind === 'NON_NULL')) inp.orderType = 'MANUAL';
        try { c = (await hGql(`mutation($input: ${girdiTipi('saveCategory')}!) { saveCategory(input: $input) { id name parentId } }`, { input: inp })).saveCategory; }
        catch (e) { inp.metaData.slug = slug + '-' + Math.random().toString(36).slice(2, 6); c = (await hGql(`mutation($input: ${girdiTipi('saveCategory')}!) { saveCategory(input: $input) { id name parentId } }`, { input: inp })).saveCategory; }
      }
      hKat.push({ ...c, parentId: parent }); yeniKat.push(alt.join(' > '));
      log(`  + KATEGORİ ${apply ? 'AÇILDI' : 'AÇILACAK'}: ${alt.join(' > ')}`);
    }
    parent = c.id;
  }
  return c.id;
}
function slugla(s) {
  const tr = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return String(s).toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, (m) => tr[m]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
async function markaId(ad) {
  if (!ad) return null;
  let m = hMarka.find((x) => fold(x.name) === fold(ad));
  if (!m) {
    if (!apply) { log(`  + MARKA AÇILACAK: ${ad}`); hMarka.push({ id: '(yeni)', name: ad }); return '(yeni)'; }
    m = (await hGql(`mutation($input: ${girdiTipi('saveProductBrand')}!) { saveProductBrand(input: $input) { id name } }`, { input: { name: ad } })).saveProductBrand;
    hMarka.push(m); log(`  + MARKA AÇILDI: ${ad}`);
  }
  return m.id;
}
async function etiketId(ad) {
  let t = hEtiket.find((x) => fold(x.name) === fold(ad));
  if (!t) {
    if (!apply) { log(`  + ETİKET AÇILACAK: ${ad}`); return '(yeni)'; }
    t = (await hGql(`mutation($input: ${girdiTipi('saveProductTag')}!) { saveProductTag(input: $input) { id name } }`, { input: { name: ad } })).saveProductTag;
    hEtiket.push(t); log(`  + ETİKET AÇILDI: ${ad}`);
  }
  return t.id;
}
// Seçenek türü ve değerleri: hedefte aynı adla yoksa açılır, eksik değer varsa türe eklenir
async function secenek(ad, degerler) {
  const kt = kTur.find((x) => x.name === ad);
  let t = hTur.find((x) => fold(x.name) === fold(ad));
  const eksik = degerler.filter((d) => !(t && (t.values || []).some((v) => fold(v.name) === fold(d))));
  if (eksik.length) {
    if (!apply) { log(`  + SEÇENEK ${t ? 'DEĞERİ EKLENECEK' : 'TÜRÜ AÇILACAK'}: ${ad}: ${eksik.join(', ')}`); return { id: '(yeni)', values: degerler.map((d) => ({ id: '(yeni)', name: d })) }; }
    // Yeni değerlere kimlik verilir (kimliksiz iki değer "aynı değer" sayılıp reddediliyor)
    const vals = [...(t ? t.values.map((v) => ({ id: v.id, name: v.name, ...(v.colorCode ? { colorCode: v.colorCode } : {}) })) : []), ...eksik.map((d) => ({ id: crypto.randomUUID(), name: d }))];
    const inp = { name: t ? t.name : ad, selectionType: (t && t.selectionType) || (kt && kt.selectionType) || (selEnum[0] && selEnum[0].name), values: vals };
    if (t) inp.id = t.id;
    t = (await hGql(`mutation($input: ${girdiTipi('saveVariantType')}!) { saveVariantType(input: $input) { id name selectionType values { id name } } }`, { input: inp })).saveVariantType;
    hTur = hTur.filter((x) => x.id !== t.id).concat([t]);
    log(`  + SEÇENEK ${inp.id ? 'GÜNCELLENDİ' : 'AÇILDI'}: ${ad}: ${eksik.join(', ')}`);
  }
  return t;
}
async function gorselYukle(variantIds, url, order, isMain) {
  for (let deneme = 0; deneme < 3; deneme++) {
    const r = await fetch(IMG_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + hTok }, body: JSON.stringify({ productImage: { variantIds, url, order, isMain } }) });
    if (r.ok) return;
    if (deneme === 2) throw new Error(`görsel yüklenemedi (${r.status}): ${(await r.text()).slice(0, 160)}`);
    await new Promise((s) => setTimeout(s, 2000));
  }
}

const sonuc = { eklenen: [], atlanan: [], hata: [], stok: [] };
if (MOD === 'kategori') {
  // Kaynakta olup hedefte olmayan kategori yolları hedefte açılır (iki yönde çalışınca iki mağazanın ağacı aynı olur)
  // Yalnız ürünü olan (kendisinde ya da alt kategorisinde) kategoriler açılır; boş kategori açılmaz
  const dolu = (kats, urunler) => { const s = new Set(); for (const u of urunler) for (const id of u.categoryIds || []) { let c = kats.find((x) => x.id === id); for (let i = 0; c && i < 8; i++) { s.add(c.id); c = kats.find((x) => x.id === c.parentId); } } return s; };
  const kDolu = dolu(kKat, kUrun), hDolu = dolu(hKat, hUrun);
  const kYol = kKat.filter((c) => kDolu.has(c.id)).map((c) => yol(kKat, c.id)).sort((a, b) => a.length - b.length);
  let n = 0;
  for (const path of kYol) {
    let parent = null, ok = true;
    for (const ad of path) { const c = hKat.find((x) => fold(x.name) === fold(ad) && (x.parentId || null) === parent); if (!c) { ok = false; break; } parent = c.id; }
    if (ok) continue;
    await kategoriYolu(path); n++;
  }
  log(`Kategori: ${apply ? 'açıldı' : 'açılacak'} ${yeniKat.length} (kaynakta ${kYol.length} yol)`);
  // Satış kanalı ayarı olmayan (sitede "sayfa bulunamadı" veren) kategoriler onarılır
  sonuc.kanal = [];
  if (KAT_SC) for (const c of hKatTam.filter((x) => bosKanal(x) && hDolu.has(x.id))) {
    const ad = yol(hKat, c.id).join(' > ') || c.name;
    if (!apply) { log(`  ~ KANAL VERİLECEK: ${ad}`); sonuc.kanal.push(ad); continue; }
    const inp = { ...c, salesChannels: KAT_SC };
    for (const k of Object.keys(inp)) if (inp[k] === null) delete inp[k];
    try { await hGql(`mutation($input: ${katGirdi}!) { saveCategory(input: $input) { id } }`, { input: inp }); sonuc.kanal.push(ad); log(`  ~ KANAL VERİLDİ: ${ad}`); }
    catch (e) { sonuc.hata.push({ ad, neden: 'kanal: ' + e.message.slice(0, 200) }); log(`! KANAL VERİLEMEDİ: ${ad}: ${e.message.slice(0, 200)}`); }
  }
  log(`Kanalı onarılan kategori: ${sonuc.kanal.length}`);
  // Ortak ürünlerde kategori farkı: hedefe kaynağın eksik kategorileri eklenir (hiçbiri çıkarılmaz).
  // İki yönde çalışınca iki mağazada da kategoriler birleşimi olur.
  const hByAd = new Map(hUrun.map((p) => [fold(p.name), p]));
  const hYol = (p) => (p.categoryIds || []).map((id) => yol(hKat, id).join(' > ')).sort();
  const farklar = [];
  for (const p of kUrun) {
    const h = hByAd.get(fold(p.name)); if (!h) continue;
    const a = (p.categoryIds || []).map((id) => yol(kKat, id)).filter((x) => x.length), b = hYol(h);
    const eksik = a.filter((x) => !b.includes(x.join(' > ')));
    if (!eksik.length) continue;
    farklar.push({ h, eksik });
    log(`  FARK: ${p.name}\n    hedefte: ${b.join(' + ') || '-'}\n    eklenecek: ${eksik.map((x) => x.join(' > ')).join(' + ')}`);
  }
  // Ürünü olduğu gibi okuyup yalnız categoryIds değiştirilerek kaydedilir; kayıttan sonra yeniden okunur,
  // kategoriler dışında bir şey değiştiyse durur.
  const TAM = `id name type categoryIds description shortDescription weight brandId tagIds salesChannelIds
    salesChannels { id status minQuantityPerCart maxQuantityPerCart productVolumeDiscountId }
    metaData { id slug pageTitle description }
    productVariantTypes { variantTypeId variantValueIds order }
    variants { id sku isActive barcodeList sellIfOutOfStock weight variantValueIds { variantTypeId variantValueId }
      prices { sellPrice discountPrice buyPrice currency priceListId } images { imageId isMain order isVideo } }`;
  const oku = async (id) => listOf(await hGql(`query($id: StringFilterInput) { listProduct(id: $id) { data { ${TAM} } } }`, { id: { eq: id } }), 'listProduct')[0];
  const tipAlan = new Map();
  const uyarla = async (v, tn) => { // girdi tipinde olmayan ve boş alanları atar
    if (Array.isArray(v)) return Promise.all(v.map((x) => uyarla(x, tn)));
    if (v === null || typeof v !== 'object') return v;
    if (!tipAlan.has(tn)) tipAlan.set(tn, await alanlar(tn));
    const o = {};
    for (const f of tipAlan.get(tn)) if (v[f.name] != null) o[f.name] = await uyarla(v[f.name], tname(f.type));
    return o;
  };
  const ozet = (p) => JSON.stringify({ ...p, categoryIds: undefined, updatedAt: undefined });
  let guncel = 0;
  if (!apply && farklar.length) { // denemede okuma ve girdi kurma sınanır
    const once = await oku(farklar[0].h.id);
    log('  deneme girdisi: ' + JSON.stringify(await uyarla(once, girdiTipi('saveProduct'))).slice(0, 1200));
  }
  for (const { h, eksik } of farklar) {
    if (!apply) continue;
    try {
      const once = await oku(h.id);
      if (once.type === 'BUNDLE') { // paket içeriği API'den okunamıyor; kaydetmek reddediliyor
        sonuc.atlanan.push({ ad: h.name, neden: 'paket ürün; kategori elle eklenmeli: ' + eksik.map((x) => x.join(' > ')).join(' + ') });
        log(`- ATLANDI (paket): ${h.name}`); continue;
      }
      const ids = [...once.categoryIds];
      for (const path of eksik) { const id = await kategoriYolu(path); if (!ids.includes(id)) ids.push(id); }
      const inp = await uyarla({ ...once, categoryIds: ids }, girdiTipi('saveProduct'));
      await hGql(`mutation($input: ${girdiTipi('saveProduct')}!) { saveProduct(input: $input) { id } }`, { input: inp });
      const sonra = await oku(h.id);
      if (ozet(once) !== ozet(sonra)) {
        log(`! DURDU: ${h.name} kaydında kategori dışı alan değişti\n    önce:  ${ozet(once).slice(0, 1500)}\n    sonra: ${ozet(sonra).slice(0, 1500)}`);
        sonuc.hata.push({ ad: h.name, neden: 'kategori dışı alan değişti' }); break;
      }
      guncel++; log(`~ KATEGORİ GÜNCELLENDİ: ${h.name}`);
    } catch (e) { sonuc.hata.push({ ad: h.name, neden: e.message.slice(0, 300) }); log(`! HATA: ${h.name}: ${e.message.slice(0, 300)}`); break; }
  }
  log(`Ürün kategorisi: ${farklar.length} üründe fark, ${guncel} güncellendi, ${sonuc.hata.length} hata`);
  sonuc.yeniKategoriler = yeniKat;
  if (sonucDosya) await writeFile(sonucDosya, JSON.stringify(sonuc, null, 1));
  await summary();
  process.exit(0);
}
if (MOD === 'stok') {
  const depo = hDepo && hDepo.depolar[0];
  const hBySlug = new Map(hUrun.map((p) => [p.metaData && p.metaData.slug, p]));
  for (const u of icerik.urunler) {
    if (u.atla) continue;
    const p = kById.get(u.id), h = hBySlug.get(u.metaData.slug);
    if (!p || !h || !depo) continue;
    const s = sade(p);
    const st = s.varyantlar.map((v, i) => ({ productId: h.id, variantId: (h.variants[i] || {}).id, stockLocationId: depo, stockCount: Math.max(0, v.stok || 0) })).filter((x) => x.variantId);
    if (!st.some((x) => x.stockCount > 0)) continue;
    if (!apply) { log(`~ STOK YAZILACAK: ${p.name}: ${st.map((x) => x.stockCount).join('/')}`); continue; }
    try { await hGql('mutation($input: SaveStockLocationsInput!) { saveProductStockLocations(input: $input) }', { input: { productStockLocationInputs: st } }); sonuc.stok.push({ ad: p.name, stok: st.map((x) => x.stockCount) }); log(`~ STOK YAZILDI: ${p.name}`); }
    catch (er) { sonuc.hata.push({ ad: p.name, neden: 'stok: ' + er.message.slice(0, 200) }); log(`! STOK YAZILAMADI: ${p.name}: ${er.message.slice(0, 200)}`); }
  }
  log(`Stok: ${sonuc.stok.length} ürün, ${sonuc.hata.length} hata`);
  if (sonucDosya) await writeFile(sonucDosya, JSON.stringify(sonuc, null, 1));
  await summary();
  process.exit(0);
}
for (const u of icerik.urunler) {
  if (u.atla) { sonuc.atlanan.push({ ad: u.ad, neden: u.atla }); log(`- ATLANDI: ${u.ad} (${u.atla})`); continue; }
  const p = kById.get(u.id);
  if (!p) { sonuc.hata.push({ ad: u.ad, neden: 'kaynakta bulunamadı' }); log(`! Kaynakta yok: ${u.ad}`); continue; }
  if (hSlug.has(u.metaData.slug) || hAd.has(fold(p.name))) { sonuc.atlanan.push({ ad: p.name, neden: 'hedefte zaten var' }); log(`= Zaten var: ${p.name}`); continue; }
  try {
    const s = sade(p);
    const katIds = [];
    for (const path of (u.kategoriler || s.kategoriler)) if (path.length) katIds.push(await kategoriYolu(path));
    const marka = await markaId(u.marka || s.marka);
    const etiketler = []; for (const e of s.etiketler) etiketler.push(await etiketId(e));
    // seçenekler
    const turHedef = [];
    for (const sec of s.secenekler) turHedef.push({ ad: sec.ad, t: await secenek(sec.ad, sec.degerler), degerler: sec.degerler });
    const degerId = (turAd_, deger) => { const x = turHedef.find((y) => y.ad === turAd_); const v = x && (x.t.values || []).find((y) => fold(y.name) === fold(deger)); return x && v ? { variantTypeId: x.t.id, variantValueId: v.id } : null; };
    const varyantlar = s.varyantlar.map((v) => {
      const o = { isActive: v.aktif, sellIfOutOfStock: v.stoksuzSat, prices: [{ sellPrice: v.fiyat ? v.fiyat.satis : 0, ...(v.fiyat && v.fiyat.indirimli != null ? { discountPrice: v.fiyat.indirimli } : {}) }] };
      if (v.sku && var_(VI.f, 'sku')) o.sku = v.sku;
      if (v.barkod.length && var_(VI.f, 'barcodeList')) o.barcodeList = v.barkod;
      if (v.agirlik != null && var_(VI.f, 'weight')) o.weight = v.agirlik;
      if (v.degerler.length) o.variantValueIds = v.degerler.map((d) => degerId(d.tur, d.deger)).filter(Boolean);
      return o;
    });
    const inp = { name: p.name, type: 'PHYSICAL', description: u.aciklama, metaData: { ...u.metaData }, categoryIds: katIds, variants: varyantlar };
    if (marka) inp.brandId = marka;
    if (etiketler.length && var_(PI, 'tagIds')) inp.tagIds = etiketler;
    if (s.agirlik != null && var_(PI, 'weight')) inp.weight = s.agirlik;
    if (turHedef.length) inp.productVariantTypes = turHedef.map((x, i) => ({ variantTypeId: x.t.id, variantValueIds: x.degerler.map((d) => degerId(x.ad, d).variantValueId), order: i }));
    // Yalnız mağazanın kendi sitesinde (vitrin kanalı) görünür; pazaryeri kanallarına kendiliğinden düşmesin
    const vitrin = hDepo && hDepo.kanal;
    if (vitrin) { inp.salesChannelIds = [vitrin]; if (SCI) inp.salesChannels = [{ id: vitrin, status: 'VISIBLE' }]; }
    else if (ornek && ornek.salesChannelIds) inp.salesChannelIds = ornek.salesChannelIds;
    const gorselSay = new Set(s.varyantlar.flatMap((v) => v.gorseller.map((g) => g.id))).size;
    const stokOzet = s.varyantlar.map((v) => (v.stoksuzSat ? 'stoksuz satış' : v.stok)).join('/');
    if (!apply) {
      log(`+ EKLENECEK: ${p.name}\n    /${u.metaData.slug} · ${(u.kategoriler || s.kategoriler).map((k) => k.join(' > ')).join(' + ')} · ${s.marka || '-'} · ${varyantlar.length} varyant · ${gorselSay} görsel · stok ${stokOzet} · ${s.varyantlar.map((v) => v.fiyat && (v.fiyat.indirimli ?? v.fiyat.satis)).join('/')} TL\n    ${u.metaData.pageTitle}`);
      sonuc.eklenen.push({ ad: p.name, deneme: true });
      continue;
    }
    const kayit = (await hGql(`mutation($input: ${girdiTipi('saveProduct')}!) { saveProduct(input: $input) { id name variants { id variantValueIds { variantTypeId variantValueId } } } }`, { input: inp })).saveProduct;
    hSlug.add(u.metaData.slug); hAd.add(fold(p.name));
    // kaynak varyant → hedef varyant (seçenek değerlerine göre; seçeneksizse sırayla)
    const anahtar = (vals) => vals.map((x) => x.variantValueId).sort().join('|');
    const hedefV = s.varyantlar.map((v, i) => {
      if (!v.degerler.length) return kayit.variants[i];
      const k = anahtar(v.degerler.map((d) => degerId(d.tur, d.deger)).filter(Boolean));
      return kayit.variants.find((x) => anahtar(x.variantValueIds || []) === k) || kayit.variants[i];
    });
    // görseller: aynı görsel birden çok varyanttaysa tek seferde hepsine bağlanır
    const gor = new Map();
    s.varyantlar.forEach((v, i) => v.gorseller.forEach((g, sira) => {
      const e = gor.get(g.id) || { url: g.url, ana: g.ana, sira, vids: [] };
      if (hedefV[i]) e.vids.push(hedefV[i].id); e.sira = Math.min(e.sira, sira); gor.set(g.id, e);
    }));
    let gHata = 0, n = 0;
    for (const e of [...gor.values()].sort((a, b) => a.sira - b.sira)) {
      try { await gorselYukle(e.vids, e.url, n, n === 0); n++; } catch (er) { gHata++; log('  UYARI: ' + er.message); }
    }
    // stok: hedefin vitrin deposuna kaynaktaki miktar
    const depo = hDepo && hDepo.depolar[0];
    let stokNot = '';
    if (depo) {
      const st = s.varyantlar.map((v, i) => ({ productId: kayit.id, variantId: hedefV[i] && hedefV[i].id, stockLocationId: depo, stockCount: Math.max(0, v.stok || 0) })).filter((x) => x.variantId);
      try { await hGql(`mutation($input: SaveStockLocationsInput!) { saveProductStockLocations(input: $input) }`, { input: { productStockLocationInputs: st } }); }
      catch (er) { stokNot = 'stok yazılamadı: ' + er.message.slice(0, 160); log('  UYARI: ' + stokNot); }
    } else stokNot = 'vitrin deposu bulunamadı';
    sonuc.eklenen.push({ ad: p.name, id: kayit.id, slug: u.metaData.slug, varyant: kayit.variants.length, gorsel: n, gorselHata: gHata, stok: stokOzet, not: stokNot || undefined });
    log(`+ EKLENDİ: ${p.name} (${kayit.variants.length} varyant, ${n} görsel${gHata ? `, ${gHata} görsel hatası` : ''}, stok ${stokOzet})`);
  } catch (e) {
    sonuc.hata.push({ ad: p.name, neden: e.message.slice(0, 300) });
    log(`! HATA: ${p.name}: ${e.message.slice(0, 300)}`);
  }
}
sonuc.yeniKategoriler = yeniKat;
log(`Sonuç (${apply ? 'uygulandı' : 'deneme'}): ${sonuc.eklenen.length} eklenecek/eklendi, ${sonuc.atlanan.length} atlandı, ${sonuc.hata.length} hata, ${yeniKat.length} yeni kategori`);
if (sonucDosya) await writeFile(sonucDosya, JSON.stringify(sonuc, null, 1));
await summary();
if (sonuc.hata.length && !apply) process.exit(1);
