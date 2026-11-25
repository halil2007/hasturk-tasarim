// veri/yeni-urunler/cikti/<site>.json dosyasındaki kategorileri ve ürünleri ikas mağazasına ekler.
// APPLY=1 değilse kuru çalıştırmadır: hiçbir şey değişmez, yalnız ne yapılacağı özet sayfasına yazılır.
// Tekrar çalıştırmak güvenlidir: aynı adreste (slug) ürün ya da aynı üst kategoride aynı adda kategori varsa yeniden açılmaz.
// Görseller kaynak adresten (url) ikas'a yüklenir. GitHub Actions'ta çalışır (.github/workflows/ikas-urun-ekle.yml).
// Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, URUN_FILE, APPLY, STOK_TAKIBI ("0" → stok bitse de satış açık)
import { readFile, appendFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const IMG_API = 'https://api.myikas.com/api/v1/admin/product/upload/image';
const out = [];
const log = (s) => { out.push(s); console.log(s); };
async function summary() { if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n'); }
const die = async (msg) => { log('HATA: ' + msg); await summary(); process.exit(1); };

async function token() {
  const r = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }),
  });
  const t = await r.text();
  if (!r.ok) await die(`Token alınamadı (${r.status}): ${t.slice(0, 200)}`);
  return JSON.parse(t).access_token;
}
let TOKEN;
async function gql(query, variables = {}) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ query, variables }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 500)}`);
  return j.data;
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const typeFields = async (name) => {
  const d = await gql(`${T} query($n: String!) { __type(name: $n) { inputFields { name type { ...T } } } }`, { n: name });
  return (d.__type && d.__type.inputFields) || [];
};
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);

const plan = JSON.parse(await readFile(env.URUN_FILE, 'utf8'));
const apply = env.APPLY === '1';
const stokTakibi = env.STOK_TAKIBI !== '0';
TOKEN = await token();
log(`Mağaza: ${env.IKAS_STORE} · ${apply ? 'UYGULAMA (kategori ve ürünler eklenecek)' : 'KURU ÇALIŞTIRMA (hiçbir şey değişmez)'}`);
log(`Stok: ${stokTakibi ? 'stok takibi açık, stok girilene kadar satılamaz' : 'stok bitse de satışa açık (kaynak sitedeki gibi stok takibi yok)'}`);

// --- Şema ---
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } } }`);
const muts = sch.__schema.mutationType.fields;
const mutIn = async (n) => {
  const m = muts.find((f) => f.name === n);
  if (!m) await die(`${n} mutasyonu yok. Benzerleri: ${muts.map((f) => f.name).filter((x) => /product|categor|stock/i.test(x)).join(', ')}`);
  const tn = tname(m.args.find((a) => a.name === 'input').type);
  return { tn, fields: await typeFields(tn) };
};
const catIn = await mutIn('saveCategory');
const prodIn = await mutIn('saveProduct');
const fieldType = async (fields, n) => { const f = fields.find((x) => x.name === n); return f ? { tn: tname(f.type), fields: await typeFields(tname(f.type)) } : null; };
const varIn = await fieldType(prodIn.fields, 'variants');
const priceIn = varIn && (await fieldType(varIn.fields, 'prices'));
const prodMeta = await fieldType(prodIn.fields, 'metaData');
log(`saveProduct(${prodIn.tn}): ${prodIn.fields.map((f) => f.name + (f.type.kind === 'NON_NULL' ? '!' : '')).join(', ')}`);
if (varIn) log(`variants(${varIn.tn}): ${varIn.fields.map((f) => f.name + (f.type.kind === 'NON_NULL' ? '!' : '')).join(', ')}`);
if (priceIn) log(`prices(${priceIn.tn}): ${priceIn.fields.map((f) => f.name).join(', ')}`);
const has = (fs, n) => fs && fs.fields.some((f) => f.name === n);

// --- Mevcut veriler ---
let cats;
try { cats = listOf(await gql('{ listCategory { id name parentId metaData { slug } } }'), 'listCategory'); }
catch { cats = listOf(await gql('{ listCategory { data { id name parentId metaData { slug } } } }'), 'listCategory'); }
const fold = (s) => String(s || '').toLocaleLowerCase('tr-TR').trim();

// Satış kanalı: mevcut bir ürünün ayarı örnek alınır (yeni ürün sitede aynı şekilde görünsün)
let ornek = null;
for (const q of [
  '{ listProduct(pagination: { limit: 1 }) { data { salesChannelIds salesChannels { id status } brandId } } }',
  '{ listProduct(pagination: { limit: 1 }) { data { salesChannelIds } } }',
]) {
  try { ornek = listOf(await gql(q), 'listProduct')[0] || null; break; } catch (e) { log('not: örnek ürün sorgusu: ' + e.message.slice(0, 160)); }
}
log('Örnek ürünün satış kanalı: ' + JSON.stringify(ornek));

async function urunVarMi(slug) {
  for (const q of [
    `{ listProduct(metaData: { slug: { eq: "${slug}" } }) { data { id name } } }`,
    `{ searchProducts(input: { query: "${slug}" }) { data { id metaData { slug } } } }`,
  ]) {
    try {
      const d = await gql(q);
      const k = Object.keys(d)[0];
      const l = listOf(d, k).filter((p) => !p.metaData || p.metaData.slug === slug);
      return l[0] || null;
    } catch { /* sonraki sorgu */ }
  }
  return null;
}

// --- Kategoriler ---
const catId = {};
async function kategori(list, parentId, depth) {
  for (const c of list) {
    const pad = '  '.repeat(depth);
    let hit = cats.find((x) => fold(x.name) === fold(c.name) && (x.parentId || null) === (parentId || null));
    if (hit) log(`${pad}= Kategori var: ${c.name} (/${hit.metaData && hit.metaData.slug})`);
    else if (!apply) { log(`${pad}+ KATEGORİ AÇILACAK: ${c.name} /${c.slug}\n${pad}    ${c.pageTitle}\n${pad}    ${c.description}`); hit = { id: `(yeni:${c.slug})` }; }
    else {
      const inp = { name: c.name, metaData: { slug: c.slug, pageTitle: c.pageTitle, description: c.description } };
      if (parentId) inp.parentId = parentId;
      if (catIn.fields.some((f) => f.name === 'conditions' && f.type.kind === 'NON_NULL')) inp.conditions = [];
      if (catIn.fields.some((f) => f.name === 'orderType' && f.type.kind === 'NON_NULL')) inp.orderType = 'MANUAL';
      try { hit = (await gql(`mutation($input: ${catIn.tn}!) { saveCategory(input: $input) { id name } }`, { input: inp })).saveCategory; }
      catch (e) { await die(`${c.name} kategorisi açılamadı: ${e.message}`); }
      cats.push({ ...hit, parentId, metaData: { slug: c.slug } });
      log(`${pad}+ KATEGORİ AÇILDI: ${c.name} (id ${hit.id})`);
    }
    catId[c.name] = hit.id;
    if (c.children) await kategori(c.children, hit.id, depth + 1);
  }
}
await kategori(plan.kategoriler, null, 0);

// --- Ürünler ---
async function gorselYukle(variantIds, url, order) {
  const r = await fetch(IMG_API, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify({ productImage: { variantIds, url, order, isMain: order === 0 } }),
  });
  if (!r.ok) throw new Error(`görsel ${order + 1} yüklenemedi (${r.status}): ${(await r.text()).slice(0, 200)}`);
}

// Seçenekli ürünler (ör. Renk: Bej/Gri, Uzunluk: 110 cm …) için mağazadaki seçenek türü ve değerleri.
// Tür ya da değer eksikse uygulamada açılır (yeni değerlere kimlik verilir; kimliksiz iki değer "aynı değer" sayılıp reddediliyor).
let varyantTurleri = null;
async function secenekBul(sec) {
  if (!varyantTurleri) {
    for (const q of ['{ listVariantType { id name selectionType values { id name colorCode } } }', '{ listVariantType { id name values { id name } } }', '{ listVariantType { data { id name values { id name } } } }']) {
      try { varyantTurleri = listOf(await gql(q), 'listVariantType'); break; } catch (e) { log('not: seçenek türü sorgusu: ' + e.message.slice(0, 160)); }
    }
    varyantTurleri = varyantTurleri || [];
  }
  let tur = varyantTurleri.find((v) => fold(v.name) === fold(sec.ad));
  const yok = sec.degerler.filter((d) => !(tur && (tur.values || []).some((v) => fold(v.name) === fold(d))));
  if (yok.length) {
    if (!apply) return { eksik: `"${sec.ad}" seçenek ${tur ? 'türüne şu değerler eklenecek' : 'türü açılacak'}: ${yok.join(', ')}` };
    const st = await mutIn('saveVariantType');
    const ornekTur = varyantTurleri.find((v) => v.selectionType);
    const inp = { name: tur ? tur.name : sec.ad, values: [...(tur ? tur.values.map((v) => ({ id: v.id, name: v.name, ...(v.colorCode ? { colorCode: v.colorCode } : {}) })) : []), ...yok.map((d) => ({ id: crypto.randomUUID(), name: d }))] };
    if (st.fields.some((f) => f.name === 'selectionType')) inp.selectionType = (tur && tur.selectionType) || (ornekTur && ornekTur.selectionType) || 'CHOICE';
    if (tur) inp.id = tur.id;
    tur = (await gql(`mutation($input: ${st.tn}!) { saveVariantType(input: $input) { id name selectionType values { id name } } }`, { input: inp })).saveVariantType;
    varyantTurleri = varyantTurleri.filter((x) => x.id !== tur.id).concat([tur]);
    log(`  + SEÇENEK ${inp.id ? 'GÜNCELLENDİ' : 'AÇILDI'}: ${sec.ad}: ${yok.join(', ')}`);
  }
  return { tur, degerler: sec.degerler.map((d) => tur.values.find((v) => fold(v.name) === fold(d))) };
}
// Marka (u.marka): mağazada aynı adla yoksa uygulamada açılır
let markalar = null;
async function markaBul(ad) {
  if (!ad || !has(prodIn, 'brandId')) return null;
  if (!markalar) {
    for (const q of ['{ listProductBrand { id name } }', '{ listProductBrand { data { id name } } }']) { try { markalar = listOf(await gql(q), 'listProductBrand'); break; } catch { /* sonraki */ } }
    markalar = markalar || [];
  }
  let m = markalar.find((x) => fold(x.name) === fold(ad));
  if (!m && apply) {
    const bt = await mutIn('saveProductBrand');
    m = (await gql(`mutation($input: ${bt.tn}!) { saveProductBrand(input: $input) { id name } }`, { input: { name: ad } })).saveProductBrand;
    markalar.push(m); log(`  + MARKA AÇILDI: ${ad}`);
  }
  return m ? m.id : null;
}
// Etiketler (u.etiketler, örn. ["kdv_20"]): KDV gibi muhasebe etiketleri; mağazada aynı adla yoksa uygulamada açılır
let etiketler = null;
async function etiketBul(adlar) {
  if (!adlar || !adlar.length || !has(prodIn, 'tagIds')) return [];
  if (!etiketler) {
    for (const q of ['{ listProductTag { id name } }', '{ listProductTag { data { id name } } }']) { try { etiketler = listOf(await gql(q), 'listProductTag'); break; } catch { /* sonraki */ } }
    etiketler = etiketler || [];
  }
  const ids = [];
  for (const ad of adlar) {
    let t = etiketler.find((x) => fold(x.name) === fold(ad));
    if (!t && apply) {
      const tt = await mutIn('saveProductTag');
      t = (await gql(`mutation($input: ${tt.tn}!) { saveProductTag(input: $input) { id name } }`, { input: { name: ad } })).saveProductTag;
      etiketler.push(t); log(`  + ETİKET AÇILDI: ${ad}`);
    }
    if (t) ids.push(t.id); else log(`  ~ etiket mağazada yok, uygulamada açılacak: ${ad}`);
  }
  return ids;
}
const GORSEL_SINIR = 10; // ikas bir varyantta en fazla 10 görsel kabul ediyor

let eklenen = 0, olan = 0, DEPO = null;
for (const u of plan.urunler) {
  const var_ = await urunVarMi(u.metaData.slug);
  if (var_) { olan++; log(`= Ürün var, dokunulmadı: ${u.ad} (/${u.metaData.slug})`); continue; }
  const satis = u.indirimli ? { sellPrice: u.fiyat, discountPrice: u.indirimli } : { sellPrice: u.fiyat };
  const temelVaryant = () => {
    // u.stoksuzSat: ürüne özel; false → stok bitince satılamaz (kaynakta "tükendi" olan ürünler)
    const v = { isActive: true, sellIfOutOfStock: u.stoksuzSat != null ? u.stoksuzSat : !stokTakibi, prices: [{ ...satis }] };
    if (has(varIn, 'weight') && u.agirlikKg) v.weight = u.agirlikKg;
    return v;
  };
  // Varyanta özel fiyat / alış fiyatı / sku: u.varyantlar[i] = { deger, fiyat, alis, sku, stok, gorseller } (seçenek sırasıyla)
  const fiyatla = (v, x) => {
    if (!x) return v;
    if (x.fiyat) v.prices = [x.indirimli && x.indirimli < x.fiyat ? { sellPrice: x.fiyat, discountPrice: x.indirimli } : { sellPrice: x.fiyat }];
    if (x.alis != null && has(priceIn, 'buyPrice')) v.prices[0].buyPrice = x.alis;
    if (x.sku) v.sku = x.sku;
    if (x.barkod && has(varIn, 'barcodeList')) v.barcodeList = [x.barkod];
    return v;
  };
  let variants = [fiyatla(temelVaryant(), u.alis != null ? { alis: u.alis } : null)], varyantTipleri = null;
  if (u.sku) variants[0].sku = u.sku;
  if (u.secenek) {
    const s = await secenekBul(u.secenek);
    if (s.eksik) {
      log(`  not: ${u.ad}: ${s.eksik}`);
      variants = u.secenek.degerler.map((d, i) => fiyatla(temelVaryant(), (u.varyantlar || [])[i]));
    } else {
      varyantTipleri = [{ variantTypeId: s.tur.id, variantValueIds: s.degerler.map((d) => d.id), order: 0 }];
      variants = s.degerler.map((d, i) => fiyatla({ ...temelVaryant(), variantValueIds: [{ variantTypeId: s.tur.id, variantValueId: d.id }] }, (u.varyantlar || [])[i]));
    }
  }
  const catIds = (u.kategoriler || [u.kategori]).map((n) => catId[n]).filter(Boolean);
  const inp = { name: u.ad, type: 'PHYSICAL', description: u.aciklama, metaData: { slug: u.metaData.slug, pageTitle: u.metaData.pageTitle, description: u.metaData.description }, categoryIds: catIds, variants };
  if (varyantTipleri && has(prodIn, 'productVariantTypes')) inp.productVariantTypes = varyantTipleri;
  if (ornek && ornek.salesChannelIds && has(prodIn, 'salesChannelIds')) inp.salesChannelIds = ornek.salesChannelIds;
  const bId = await markaBul(u.marka);
  if (bId) inp.brandId = bId;
  const tIds = await etiketBul(u.etiketler);
  if (tIds.length) inp.tagIds = tIds;
  if (!has(prodMeta, 'pageTitle')) delete inp.metaData.pageTitle;
  if (!apply) {
    if (u.varyantlar) log(`    varyantlar: ${u.varyantlar.map((x) => `${x.deger} ${x.fiyat} TL${x.indirimli ? ' → ' + x.indirimli : ''}${x.alis != null ? ` (alış ${x.alis})` : ''} stok ${x.stok} · ${(x.gorseller || []).length} görsel`).join(' | ')}`);
    log(`+ ÜRÜN EKLENECEK: ${u.ad}\n    /${u.metaData.slug} · ${(u.kategoriler || []).join(' + ')} · ${u.fiyat} TL${u.indirimli ? ' → ' + u.indirimli + ' TL' : ''} · ${u.gorseller.length} görsel · ${variants.length} varyant · sku ${u.sku || '-'}${u.marka ? ' · marka ' + u.marka : ''}${u.stoksuzSat === false ? ' · stok bitince satış kapalı' : ''}\n    ${u.metaData.pageTitle}\n    ${u.metaData.description}`);
    continue;
  }
  let p;
  try { p = (await gql(`mutation($input: ${prodIn.tn}!) { saveProduct(input: $input) { id name variants { id } } }`, { input: inp })).saveProduct; }
  catch (e) { await die(`${u.ad} eklenemedi: ${e.message}`); }
  // Görseller: varyanta özel görsel varsa her varyanta kendi görselleri, yoksa bütün varyantlara aynı sırayla
  if (u.varyantlar && u.varyantlar.some((x) => (x.gorseller || []).length)) {
    for (let k = 0; k < p.variants.length; k++) {
      const g = ((u.varyantlar[k] || {}).gorseller || []).concat(u.gorseller || []).filter((x, i, a) => a.indexOf(x) === i).slice(0, GORSEL_SINIR);
      for (let i = 0; i < g.length; i++) {
        try { await gorselYukle([p.variants[k].id], g[i], i); } catch (e) { log('  UYARI: ' + e.message); }
      }
    }
  } else {
    for (let i = 0; i < Math.min(u.gorseller.length, GORSEL_SINIR); i++) {
      try { await gorselYukle(p.variants.map((v) => v.id), u.gorseller[i], i); } catch (e) { log('  UYARI: ' + e.message); }
    }
  }
  // Stok (varyant sırasıyla ya da tek varyantlı üründe u.stok): sitenin satış kanalının ilk deposuna yazılır
  const stoklar = u.varyantlar ? u.varyantlar.map((x) => x.stok) : u.stok != null ? [u.stok] : null;
  if (stoklar) {
    try {
      if (!DEPO) {
        const kl = (await gql('{ listSalesChannel { id type stockLocations { id } } }')).listSalesChannel || [];
        const ch = kl.find((c) => c.type === 'STOREFRONT');
        DEPO = ch && ch.stockLocations && ch.stockLocations[0] && ch.stockLocations[0].id;
      }
      const st = p.variants.map((v, i) => ({ productId: p.id, variantId: v.id, stockLocationId: DEPO, stockCount: Math.max(0, Number(stoklar[i]) || 0) }));
      await gql('mutation($input: SaveStockLocationsInput!) { saveProductStockLocations(input: $input) }', { input: { productStockLocationInputs: st } });
      log(`  stok yazıldı: ${st.map((x) => x.stockCount).join('/')}`);
    } catch (e) { log('  UYARI: stok yazılamadı (panelden girilmeli): ' + e.message.slice(0, 200)); }
  }
  eklenen++;
  log(`+ ÜRÜN EKLENDİ: ${u.ad} (id ${p.id}, ${p.variants.length} varyant, ${u.gorseller.length} görsel)`);
}
log(`Sonuç: ${eklenen} ürün eklendi, ${olan} ürün zaten vardı.`);
await summary();
