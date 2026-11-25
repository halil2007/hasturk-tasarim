// Google Search Console raporu: servis hesabı anahtarıyla (GSC_ANAHTAR) yalnız okuma izniyle bağlanır; erişilen her
// mülk (HasTürk Gübre, Tarım Dünyası, Blog) için son 28 günün sorgu, sayfa, gün, cihaz ve ülke kırılımlarını, site haritası
// durumunu ve sayfaların dizin durumunu (URL denetimi) veri/gsc/<site>.json dosyasına, blog panelinin okuduğu kısa özeti
// src/blog/gsc-ozet.json dosyasına yazar.
// Anahtarın içeriği hiçbir zaman ekrana ya da dosyaya yazılmaz.
import { createSign } from 'node:crypto';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { reklamOneri } from './reklam-analiz.mjs';
import { BILGI } from './reklam-bilgi.mjs';

const ham = process.env.GSC_ANAHTAR;
if (!ham) { console.error('✗ GSC_ANAHTAR gizli değeri bulunamadı (GitHub → Settings → Secrets → Actions)'); process.exit(1); }
let A;
try { A = JSON.parse(ham); } catch { console.error('✗ GSC_ANAHTAR geçerli bir JSON değil (dosyanın tamamı { ile başlayıp } ile bitmeli)'); process.exit(1); }
if (!A.client_email || !A.private_key) { console.error('✗ Anahtarda client_email / private_key alanı yok: servis hesabı JSON anahtarı mı?'); process.exit(1); }
console.log('✓ anahtar okundu, hesap:', A.client_email);

const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
async function jeton() {
  const now = Math.floor(Date.now() / 1000);
  const govde = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: A.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const imza = createSign('RSA-SHA256').update(govde).sign(A.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: govde + '.' + imza }) });
  const j = await r.json();
  if (!j.access_token) { console.error('✗ Google oturum açmadı:', r.status, j.error, j.error_description || ''); process.exit(1); }
  console.log('✓ Google oturumu açıldı');
  return j.access_token;
}
const T = await jeton();
async function api(yol, govde) {
  const r = await fetch('https://www.googleapis.com/webmasters/v3/' + yol, { method: govde ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: govde ? JSON.stringify(govde) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.durum = r.status; throw e; }
  return j;
}

let siteler;
try { siteler = (await api('sites')).siteEntry || []; } catch (e) {
  console.error('✗ Search Console API:', e.durum, e.message);
  if (/has not been used|disabled/i.test(e.message)) console.error('  → Google Cloud\'da "Google Search Console API" etkinleştirilmeli');
  process.exit(1);
}
console.log('Erişilen mülkler:', siteler.length ? siteler.map((s) => `${s.siteUrl} (${s.permissionLevel})`).join(', ') : 'YOK');
siteler = siteler.filter((s) => s.permissionLevel !== 'siteUnverifiedUser');
if (!siteler.length) { console.error('✗ Servis hesabı henüz hiçbir mülke eklenmemiş (Search Console → Ayarlar → Kullanıcılar ve izinler → Kullanıcı ekle)'); process.exit(1); }
const blogMulk = (u) => /blog\.hasturkgubre/.test(u);
const host = (u) => u.replace(/^sc-domain:|^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const siteAd = (u) => blogMulk(u) ? 'blog' : /hasturkgubre/.test(u) ? 'hasturk' : /tarim/.test(host(u)) ? 'tarim' : host(u).replace(/[^a-z0-9]+/g, '-');
const ETIKET = { blog: 'HasTürk Blog', hasturk: 'HasTürk Gübre', tarim: 'Tarım Dünyası' };
// Aynı site hem alan adı hem adres öneki mülkü olarak eklenmişse alan adı mülkü (daha kapsamlı) kullanılır
siteler = siteler.filter((s) => !(siteler.some((o) => o !== s && o.siteUrl.startsWith('sc-domain:') && !s.siteUrl.startsWith('sc-domain:') && siteAd(o.siteUrl) === siteAd(s.siteUrl))));
const ozet = { olusturma: new Date().toISOString(), siteler: [] };
// Alan adı mülkü (sc-domain:hasturkgubre.com.tr) blogu da kapsar: ayrı blog mülkü varsa mağaza raporundan blog sayfaları çıkarılır
const ayriBlog = siteler.some((s) => blogMulk(s.siteUrl));

const gun = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const ara = { startDate: gun(30), endDate: gun(2) };
mkdirSync('veri/gsc', { recursive: true });

for (const site of siteler) {
  const blog = blogMulk(site.siteUrl);
  console.log(`\n=== ${site.siteUrl} (${site.permissionLevel}) ===`);
  const filtre = !blog && ayriBlog && site.siteUrl.startsWith('sc-domain:') ? [{ filters: [{ dimension: 'page', operator: 'notContains', expression: 'blog.hasturkgubre.com.tr' }] }] : undefined;
  const yol = 'sites/' + encodeURIComponent(site.siteUrl);
  const sorgu = async (boyut, n = 1000, f = filtre) => ((await api(yol + '/searchAnalytics/query', { ...ara, dimensions: boyut, rowLimit: n, dimensionFilterGroups: f })).rows || [])
    .map((r) => ({ k: r.keys, tik: r.clicks, gos: r.impressions, ctr: +(r.ctr * 100).toFixed(2), sira: +r.position.toFixed(1) }));
  const rapor = { olusturma: new Date().toISOString(), mulk: site.siteUrl, yetki: site.permissionLevel, aralik: ara, blogHaric: !!filtre };
  rapor.toplam = (await sorgu([], 1))[0] || null;
  rapor.gunluk = await sorgu(['date'], 100);
  rapor.cihaz = await sorgu(['device'], 10);
  rapor.ulke = await sorgu(['country'], 15);
  rapor.sorgu = await sorgu(['query'], 1000);
  rapor.sayfa = await sorgu(['page'], 1000);
  rapor.sorguSayfa = await sorgu(['query', 'page'], 2000);
  try { rapor.siteHaritasi = ((await api(yol + '/sitemaps')).sitemap || []).map((s) => ({ yol: s.path, son: s.lastDownloaded, gonderim: s.lastSubmitted, bekliyor: s.isPending, uyari: s.warnings, hata: s.errors, icerik: s.contents })); } catch (e) { rapor.siteHaritasi = 'okunamadı: ' + e.message; }

  // URL denetimi (yalnız okuma): blogda site haritasındaki adresler, mağazada en çok gösterim alan sayfalar (günlük kota 2000/mülk).
  // Uzun sürdüğü için (Actions kotası) yalnız istenince yapılır (DIZIN=1); yapılmazsa önceki raporun dizin bilgisi korunur.
  const dizinYap = process.env.DIZIN === '1';
  let eskiDizin = null;
  if (!dizinYap) { try { eskiDizin = JSON.parse(readFileSync('veri/gsc/' + siteAd(site.siteUrl) + '.json', 'utf8')); } catch { eskiDizin = {}; } }
  let adresler = [];
  if (blog) {
    try {
      const xml = await (await fetch('https://blog.hasturkgubre.com.tr/sitemap.xml')).text();
      adresler = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !/\.(webp|jpg|png)$/i.test(u));
    } catch (e) { console.log('site haritası okunamadı:', e.message); }
  } else {
    adresler = [...rapor.sayfa].sort((a, b) => b.gos - a.gos).map((r) => r.k[0]);
  }
  adresler = dizinYap ? [...new Set(adresler)].slice(0, blog ? 400 : 80) : [];
  // Denetimler 6'şar paralel gider (tek tek ~6 sn sürüyor); kota 600/dk, 2000/gün/mülk
  const denetle = async (u) => {
    try {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify({ inspectionUrl: u, siteUrl: site.siteUrl, languageCode: 'tr' }) });
      const j = await r.json();
      if (!r.ok) return { u, hata: (j.error && j.error.message) || r.status, kota: r.status === 429 };
      const x = j.inspectionResult.indexStatusResult || {}, m = j.inspectionResult.mobileUsabilityResult, z = j.inspectionResult.richResultsResult;
      return { u, karar: x.verdict, durum: x.coverageState, tarama: x.lastCrawlTime, getirme: x.pageFetchState, robots: x.robotsTxtState, dizinleme: x.indexingState, googleKanonik: x.googleCanonical, bizimKanonik: x.userCanonical, mobil: m && m.verdict, zengin: z && z.detectedItems && z.detectedItems.map((d) => d.richResultType) };
    } catch (e) { return { u, hata: e.message }; }
  };
  rapor.dizin = [];
  const sira = [...adresler];
  let kota = false;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (sira.length && !kota) { const d = await denetle(sira.shift()); if (d.kota) kota = true; delete d.kota; rapor.dizin.push(d); }
  }));
  const say = {}; for (const d of rapor.dizin) { const k = d.durum || 'hata: ' + d.hata; say[k] = (say[k] || 0) + 1; }
  rapor.dizinOzet = say;
  if (!dizinYap) { rapor.dizin = eskiDizin.dizin || []; rapor.dizinOzet = eskiDizin.dizinOzet || {}; console.log('dizin denetimi atlandı (DIZIN=1 değil); önceki sonuç korundu'); }

  const ad = siteAd(site.siteUrl), dosya = 'veri/gsc/' + ad + '.json';
  rapor.ad = ad; rapor.etiket = ETIKET[ad] || host(site.siteUrl);
  const kis = (a, n) => [...a].sort((x, y) => y.gos - x.gos).slice(0, n).map((r) => [r.k.length > 1 ? r.k : r.k[0], r.tik, r.gos, r.sira]);
  ozet.siteler.push({ ad, etiket: rapor.etiket, mulk: site.siteUrl, alan: host(site.siteUrl), aralik: ara, toplam: rapor.toplam, gunluk: rapor.gunluk.map((r) => [r.k[0], r.tik, r.gos, r.sira]),
    cihaz: kis(rapor.cihaz, 5), ulke: kis(rapor.ulke, 8), sorgu: kis(rapor.sorgu, 400), sayfa: kis(rapor.sayfa, 250), dizin: rapor.dizinOzet, dizinSayi: rapor.dizin.length,
    harita: Array.isArray(rapor.siteHaritasi) ? rapor.siteHaritasi.map((h) => ({ yol: h.yol, son: h.son, uyari: +h.uyari || 0, hata: +h.hata || 0, gonderilen: (h.icerik || []).reduce((t, c) => t + (+c.submitted || 0), 0) })) : [] });
  writeFileSync(dosya, JSON.stringify(rapor, null, 1));
  const t = rapor.toplam || { tik: 0, gos: 0, ctr: 0, sira: 0 };
  console.log(`${ara.startDate} – ${ara.endDate}: ${t.tik} tıklama, ${t.gos} gösterim, TO %${t.ctr}, ort. sıra ${t.sira} → ${dosya}`);
  console.log(`sorgu: ${rapor.sorgu.length}, sayfa: ${rapor.sayfa.length}`);
  console.log('Dizin durumu:', JSON.stringify(say));
  console.log('Site haritası:', JSON.stringify(rapor.siteHaritasi));
}
rmSync('veri/gsc/rapor.json', { force: true }); rmSync('veri/gsc/magaza.json', { force: true });
ozet.siteler.sort((a, b) => ['hasturk', 'tarim', 'blog'].indexOf(a.ad) - ['hasturk', 'tarim', 'blog'].indexOf(b.ad));

// ---- Google Analytics 4 (Data API, yalnız okuma): servis hesabı her mülke "Görüntüleyen" olarak eklenmiş olmalı ----
const GA_MULK = [['hasturk', 'HasTürk Gübre', '525397457'], ['tarim', 'Tarım Dünyası', '519130782'], ['blog', 'HasTürk Blog', '559468186']];
async function gaRapor(id, govde) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`, { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify(govde) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status); e.durum = r.status; throw e; }
  return (j.rows || []).map((x) => [...(x.dimensionValues || []).map((d) => d.value), ...x.metricValues.map((m) => +(+m.value).toFixed(2))]);
}
ozet.ga = [];
const SON = { startDate: '28daysAgo', endDate: 'yesterday' }, ONCE = { startDate: '56daysAgo', endDate: '29daysAgo' };
const M = (...a) => a.map((name) => ({ name })), D = M;
const TOP = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration', 'ecommercePurchases', 'purchaseRevenue'];
for (const [ad, etiket, id] of GA_MULK) {
  const g = { ad, etiket, mulkId: id };
  try {
    const sor = (dim, met, n = 25, sira = met[0], aralik = SON) => gaRapor(id, { dateRanges: [aralik], dimensions: D(...dim), metrics: M(...met), limit: n, ...(dim[0] === 'date' ? { orderBys: [{ dimension: { dimensionName: 'date' } }] } : { orderBys: [{ metric: { metricName: sira }, desc: true }] }) });
    const [top] = await gaRapor(id, { dateRanges: [SON], metrics: M(...TOP) }).catch(() => gaRapor(id, { dateRanges: [SON], metrics: M(...TOP.slice(0, 6)) }));
    const [once] = await gaRapor(id, { dateRanges: [ONCE], metrics: M('activeUsers', 'sessions', 'screenPageViews') }).catch(() => [[]]);
    g.toplam = top ? Object.fromEntries(TOP.map((k, i) => [k, top[i] ?? 0])) : null;
    g.once = once && once.length ? { activeUsers: once[0], sessions: once[1], screenPageViews: once[2] } : null;
    g.gunluk = (await sor(['date'], ['activeUsers', 'sessions', 'screenPageViews'], 100)).map((r) => [r[0].slice(0, 4) + '-' + r[0].slice(4, 6) + '-' + r[0].slice(6, 8), r[1], r[2], r[3]]);
    g.kanal = await sor(['sessionDefaultChannelGroup'], ['sessions', 'activeUsers', 'engagementRate'], 12);
    g.kaynak = await sor(['sessionSourceMedium'], ['sessions', 'activeUsers'], 20);
    g.sayfa = await sor(['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], 40);
    g.giris = await sor(['landingPage'], ['sessions', 'activeUsers', 'engagementRate'], 25);
    g.cihaz = await sor(['deviceCategory'], ['activeUsers', 'sessions'], 5);
    g.sehir = await sor(['city'], ['activeUsers'], 12);
    g.yeniEski = await sor(['newVsReturning'], ['activeUsers'], 3);
    // Ürünler: görüntüleme, sepete ekleme, satış, ciro (e-ticaret olayları; blogda boş kalır)
    g.urunler = await sor(['itemName'], ['itemsViewed', 'itemsAddedToCart', 'itemsPurchased', 'itemRevenue'], 150, 'itemRevenue').catch(() => []);
    // Google Ads (GA4'e bağlıysa): kampanya bazında harcama, tıklama, gösterim, oturum, satış; günlük harcama
    try {
      g.reklam = await sor(['sessionGoogleAdsCampaignName'], ['advertiserAdCost', 'advertiserAdClicks', 'advertiserAdImpressions', 'sessions', 'ecommercePurchases', 'purchaseRevenue'], 30, 'advertiserAdCost');
      // Reklam metrikleri kampanya boyutu olmadan sorgulanamıyor: gün × kampanya çekilip güne göre toplanır
      const gk = await sor(['date', 'sessionGoogleAdsCampaignName'], ['advertiserAdCost', 'advertiserAdClicks'], 5000);
      const ciro = new Map((await sor(['date'], ['purchaseRevenue'], 100)).map((r) => [r[0], r[1]]));
      const gun = new Map(); gk.forEach(([d, , cost, tik]) => { const x = gun.get(d) || [0, 0]; x[0] += cost; x[1] += tik; gun.set(d, x); });
      g.reklamGun = [...new Set([...gun.keys(), ...ciro.keys()])].sort().map((d) => [d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8), +((gun.get(d) || [0])[0]).toFixed(2), (gun.get(d) || [0, 0])[1], ciro.get(d) || 0]);
      const on = await gaRapor(id, { dateRanges: [ONCE], dimensions: D('sessionGoogleAdsCampaignName'), metrics: M('advertiserAdCost', 'advertiserAdClicks'), limit: 200 }).catch(() => []);
      g.reklamOnce = [+on.reduce((x, r) => x + r[1], 0).toFixed(2), on.reduce((x, r) => x + r[2], 0)];
      // Ayrıntı (öneri motoru için): önceki dönem kampanyaları, reklam grubu, arama terimi, anahtar kelime, açılış sayfası, cihaz, gün.
      // Bazı boyut-metrik birleşimleri GA'da desteklenmeyebilir; her biri ayrı denenir, olmayan boş kalır.
      const AD = ['advertiserAdCost', 'advertiserAdClicks', 'advertiserAdImpressions', 'sessions', 'ecommercePurchases', 'purchaseRevenue'];
      const dene = async (ad, f) => { try { return await f(); } catch (e) { (g.reklamEksik = g.reklamEksik || {})[ad] = e.message.slice(0, 120); return []; } };
      const RD = g.reklamDetay = {};
      RD.onceKamp = await dene('onceKamp', () => gaRapor(id, { dateRanges: [ONCE], dimensions: D('sessionGoogleAdsCampaignName'), metrics: M(...AD), limit: 100 }));
      RD.grup = await dene('grup', () => sor(['sessionGoogleAdsCampaignName', 'sessionGoogleAdsAdGroupName'], AD, 200, 'advertiserAdCost'));
      RD.terim = await dene('terim', () => sor(['sessionGoogleAdsCampaignName', 'sessionGoogleAdsQuery'], AD, 500, 'advertiserAdCost'));
      if (!RD.terim.length) RD.terim = await dene('terim2', () => sor(['sessionGoogleAdsCampaignName', 'sessionGoogleAdsQuery'], ['sessions', 'engagementRate', 'ecommercePurchases', 'purchaseRevenue'], 500, 'sessions'));
      RD.kelime = await dene('kelime', () => sor(['sessionGoogleAdsCampaignName', 'sessionGoogleAdsKeyword'], AD, 300, 'advertiserAdCost'));
      RD.sayfa = await dene('sayfa', () => sor(['sessionGoogleAdsCampaignName', 'landingPage'], ['sessions', 'engagementRate', 'ecommercePurchases', 'purchaseRevenue'], 200, 'sessions'));
      RD.cihaz = await dene('cihaz', () => sor(['sessionGoogleAdsCampaignName', 'deviceCategory'], AD, 50, 'advertiserAdCost'));
      if (!RD.cihaz.length) RD.cihaz = await dene('cihaz2', () => sor(['sessionGoogleAdsCampaignName', 'deviceCategory'], ['sessions', 'engagementRate', 'ecommercePurchases', 'purchaseRevenue'], 50, 'sessions'));
      RD.gun = await dene('gun', () => sor(['sessionGoogleAdsCampaignName', 'dayOfWeek'], AD, 100, 'advertiserAdCost'));
      RD.urun = await dene('urun', () => sor(['sessionGoogleAdsCampaignName', 'itemName'], ['itemsPurchased', 'itemRevenue'], 100, 'itemRevenue'));
    } catch (e) { g.reklamHata = e.message; }
    if (g.reklam) console.log(`  Ads: ${g.reklam.length} kampanya, harcama ${Math.round(g.reklam.reduce((x, r) => x + r[1], 0))}`); else if (g.reklamHata) console.log('  Ads verisi yok: ' + g.reklamHata);
    console.log(`✓ GA ${etiket}: ${g.toplam ? g.toplam.activeUsers : 0} kullanıcı, ${g.toplam ? g.toplam.sessions : 0} oturum (28 gün)`);
  } catch (e) {
    g.hata = e.message;
    console.log(`✗ GA ${etiket} (${id}): ${e.durum || ''} ${e.message}`);
    if (e.durum === 403) console.log('  → Analytics → Yönetici → Mülk erişim yönetimi: ' + A.client_email + ' "Görüntüleyen" olarak eklenmeli');
  }
  ozet.ga.push(g);
}
// Reklam öneri motoru: kurallar scripts/reklam-analiz.mjs'te; yalnız öneri üretir, hiçbir hesapta değişiklik yapmaz
// Mağaza içi aramalar (Worker /trends, herkese açık özet) ve stok için mağaza katalogları
try {
  const r = await fetch('https://hasturk-arama.halilc2007.workers.dev/trends?n=200');
  const j = await r.json();
  if (j.ok) ozet.trend = { q: (j.q || []).slice(0, 100).map((x) => [x[0], x[1]]), q0: (j.q0 || []).slice(0, 100).map((x) => [x[0], x[1]]) };
} catch (e) { console.log('mağaza aramaları alınamadı:', e.message); }
const katalog = {};
for (const [ad, yol] of [['hasturk', 'public/products.json'], ['tarim', 'public/tarim/products.json']]) {
  try { katalog[ad] = JSON.parse(readFileSync(yol, 'utf8')).items.map((i) => ({ n: i.n, s: i.s, st: i.st })); } catch {}
}
ozet.bilgi = BILGI;
try { ozet.reklamOneri = reklamOneri(ozet, katalog); console.log(`✓ reklam önerisi: ${ozet.reklamOneri.length}`); } catch (e) { console.log('✗ reklam önerisi üretilemedi:', e.message); ozet.reklamOneri = []; }
writeFileSync('src/blog/gsc-ozet.json', JSON.stringify(ozet));
console.log('\n✓ panel özeti: src/blog/gsc-ozet.json (' + ozet.siteler.map((s) => s.etiket).join(', ') + ')');
