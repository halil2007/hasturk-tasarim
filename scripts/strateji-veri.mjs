// Strateji verisi (tek seferlik / elle): Search Console 16 ay ve GA4 12 ay, aylara bölünmüş. Yalnız okuma.
// Çıktı: veri/strateji/<site>.json (hasturk, tarim, blog) ve veri/strateji/magaza-arama.json
// Anahtar GitHub gizli değeri GSC_ANAHTAR; içeriği hiçbir yere yazılmaz.
import { createSign } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const A = JSON.parse(process.env.GSC_ANAHTAR || '{}');
if (!A.client_email) { console.error('✗ GSC_ANAHTAR yok'); process.exit(1); }
const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const jg = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: A.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jg + '.' + createSign('RSA-SHA256').update(jg).sign(A.private_key).toString('base64url') }) })).json();
const T = tok.access_token;
if (!T) { console.error('✗ oturum açılamadı'); process.exit(1); }

const gun = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
async function gsc(site, govde) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify(govde) });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
  return (j.rows || []).map((x) => [x.keys.length > 1 ? x.keys : x.keys[0], x.clicks, x.impressions, +x.position.toFixed(1)]);
}
async function ga(id, govde) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`, { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify(govde) });
  const j = await r.json();
  if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
  return (j.rows || []).map((x) => [...(x.dimensionValues || []).map((d) => d.value), ...x.metricValues.map((m) => +(+m.value).toFixed(2))]);
}
const M = (...a) => a.map((name) => ({ name }));
const dene = async (ad, f) => { try { const v = await f(); console.log('  ✓', ad, Array.isArray(v) ? v.length : ''); return v; } catch (e) { console.log('  ✗', ad, String(e.message).slice(0, 150)); return []; } };

const SITELER = [['hasturk', 'https://hasturkgubre.com.tr/', '525397457'], ['tarim', 'https://tarim-dunyasi.com/', '519130782'], ['blog', 'https://blog.hasturkgubre.com.tr/', '559468186']];
mkdirSync('veri/strateji', { recursive: true });
for (const [ad, mulk, id] of SITELER) {
  console.log('=== ' + ad);
  const o = { ad, mulk, olusturma: new Date().toISOString() };
  const bas = gun(487), bit = gun(2); // ~16 ay (Search Console sınırı)
  o.gscGunluk = await dene('gsc günlük', () => gsc(mulk, { startDate: bas, endDate: bit, dimensions: ['date'], rowLimit: 1000 }));
  o.gscSorgu = await dene('gsc sorgu 16 ay', () => gsc(mulk, { startDate: bas, endDate: bit, dimensions: ['query'], rowLimit: 5000 }));
  o.gscSayfa = await dene('gsc sayfa 16 ay', () => gsc(mulk, { startDate: bas, endDate: bit, dimensions: ['page'], rowLimit: 2000 }));
  o.gscSorguSayfa = await dene('gsc sorgu×sayfa 3 ay', () => gsc(mulk, { startDate: gun(92), endDate: bit, dimensions: ['query', 'page'], rowLimit: 5000 }));
  o.gscCihaz = await dene('gsc cihaz', () => gsc(mulk, { startDate: bas, endDate: bit, dimensions: ['device'], rowLimit: 5 }));
  // Ay ay en çok görünen sorgular (mevsimsellik)
  o.gscAylik = {};
  const ay0 = new Date(bas); ay0.setUTCDate(1);
  for (let d = new Date(ay0); d < new Date(bit); d.setUTCMonth(d.getUTCMonth() + 1)) {
    const a = d.toISOString().slice(0, 7), s = a + '-01';
    const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    o.gscAylik[a] = await dene('gsc ' + a, () => gsc(mulk, { startDate: s < bas ? bas : s, endDate: e > bit ? bit : e, dimensions: ['query'], rowLimit: 300 }));
  }
  // GA4 12 ay
  const R = { startDate: '365daysAgo', endDate: 'yesterday' };
  o.gaAy = await dene('ga ay', () => ga(id, { dateRanges: [R], dimensions: M('yearMonth'), metrics: M('activeUsers', 'sessions', 'ecommercePurchases', 'purchaseRevenue', 'screenPageViews'), orderBys: [{ dimension: { dimensionName: 'yearMonth' } }], limit: 24 }));
  o.gaAyKanal = await dene('ga ay×kanal', () => ga(id, { dateRanges: [R], dimensions: M('yearMonth', 'sessionDefaultChannelGroup'), metrics: M('sessions', 'ecommercePurchases', 'purchaseRevenue'), limit: 500 }));
  o.gaKaynak = await dene('ga oturum kaynağı', () => ga(id, { dateRanges: [R], dimensions: M('sessionSource', 'sessionMedium'), metrics: M('sessions', 'activeUsers', 'ecommercePurchases', 'purchaseRevenue'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 200 }));
  o.gaIlkKaynak = await dene('ga ilk geliş kaynağı', () => ga(id, { dateRanges: [R], dimensions: M('firstUserSource', 'firstUserMedium'), metrics: M('totalUsers', 'ecommercePurchases', 'purchaseRevenue'), orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }], limit: 200 }));
  o.gaGiris = await dene('ga giriş sayfası', () => ga(id, { dateRanges: [R], dimensions: M('landingPage'), metrics: M('sessions', 'engagementRate', 'ecommercePurchases', 'purchaseRevenue'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 1000 }));
  o.gaUrunAy = await dene('ga ürün×ay', () => ga(id, { dateRanges: [R], dimensions: M('yearMonth', 'itemName'), metrics: M('itemsViewed', 'itemsAddedToCart', 'itemsPurchased', 'itemRevenue'), limit: 10000 }));
  o.gaUrun = await dene('ga ürün 12 ay', () => ga(id, { dateRanges: [R], dimensions: M('itemName'), metrics: M('itemsViewed', 'itemsAddedToCart', 'itemsPurchased', 'itemRevenue'), orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }], limit: 1000 }));
  o.gaKategori = await dene('ga ürün kategorisi', () => ga(id, { dateRanges: [R], dimensions: M('itemCategory'), metrics: M('itemsViewed', 'itemsPurchased', 'itemRevenue'), orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }], limit: 200 }));
  o.gaSehir = await dene('ga şehir', () => ga(id, { dateRanges: [R], dimensions: M('city'), metrics: M('activeUsers', 'ecommercePurchases', 'purchaseRevenue'), orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 50 }));
  o.gaCihaz = await dene('ga cihaz', () => ga(id, { dateRanges: [R], dimensions: M('deviceCategory'), metrics: M('activeUsers', 'sessions', 'ecommercePurchases', 'purchaseRevenue'), limit: 5 }));
  o.gaReklamAy = await dene('ga reklam×ay', () => ga(id, { dateRanges: [R], dimensions: M('yearMonth', 'sessionGoogleAdsCampaignName'), metrics: M('advertiserAdCost', 'advertiserAdClicks', 'ecommercePurchases', 'purchaseRevenue'), limit: 2000 }));
  o.gaYeniEski = await dene('ga yeni/geri gelen', () => ga(id, { dateRanges: [R], dimensions: M('newVsReturning'), metrics: M('activeUsers', 'ecommercePurchases', 'purchaseRevenue'), limit: 3 }));
  writeFileSync(`veri/strateji/${ad}.json`, JSON.stringify(o));
}
try { writeFileSync('veri/strateji/magaza-arama.json', JSON.stringify(await (await fetch('https://hasturk-arama.halilc2007.workers.dev/trends?n=1000')).json())); console.log('✓ mağaza aramaları'); } catch (e) { console.log('✗ mağaza aramaları', e.message); }
