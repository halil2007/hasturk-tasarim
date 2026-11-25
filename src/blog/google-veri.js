// Arama & Trafik için tarih aralıklı Google verisi (Search Console + GA4, Ads metrikleri GA4 üzerinden), yalnız okuma.
// Panel seçilen aralığı (bugün, dün, son 7/28/30/90 gün, özel) bu modülden ister; sonuç günlük rapor özetiyle
// (gsc-ozet.json) aynı biçimdedir. İstek sayısı Worker sınırının altında kalsın diye GA raporları toplu (batch) gider;
// sonuç 15 dk taze sayılır (bellek + Cache API); 6 saate kadar eski sonuç beklemeden gösterilir, arkada tazelenir
// (sayfa Google'ı beklemesin, 7 Kasım 2026: "Arama & Trafik çok geç açılıyor"). Anahtar: Cloudflare gizli değeri GSC_ANAHTAR.
import { jeton, GA_MULK } from './ga-canli.js';

const TR = 3 * 3600000;
const g_ = (ms) => new Date(ms + TR).toISOString().slice(0, 10);
const gunEkle = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const gunFark = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
export const ARALIKLAR = [['bugun', 'Bugün'], ['dun', 'Dün'], ['7', 'Son 7 gün'], ['28', 'Son 28 gün'], ['30', 'Son 30 gün'], ['90', 'Son 90 gün']];

// ?r=bugun|dun|7|28|30|90|ozel&bas=YYYY-AA-GG&bit=YYYY-AA-GG → { k, bas, bit, ad, onceBas, onceBit }
export function aralikCoz(sp) {
  const bugun = g_(Date.now()), dun = gunEkle(bugun, -1);
  let k = sp.get('r') || '28', bas, bit, ad;
  const tarih = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? x : '';
  if (k === 'ozel' && tarih(sp.get('bas')) && tarih(sp.get('bit'))) {
    bas = sp.get('bas'); bit = sp.get('bit');
    if (bas > bit) [bas, bit] = [bit, bas];
    if (bit > bugun) bit = bugun;
    if (bas > bit) bas = bit;
    if (bas < gunEkle(bugun, -480)) bas = gunEkle(bugun, -480);
    ad = bas.split('-').reverse().join('.') + ' – ' + bit.split('-').reverse().join('.');
  } else {
    if (!ARALIKLAR.some(([x]) => x === k)) k = '28';
    if (k === 'bugun') { bas = bit = bugun; } else if (k === 'dun') { bas = bit = dun; } else { bit = dun; bas = gunEkle(dun, -(+k - 1)); }
    ad = ARALIKLAR.find(([x]) => x === k)[1];
  }
  const n = gunFark(bas, bit);
  return { k, bas, bit, ad, gun: n, onceBit: gunEkle(bas, -1), onceBas: gunEkle(bas, -n) };
}

const ONBELLEK = new Map();
async function gsc(T, site, govde) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify({ dataState: 'all', ...govde }) });
  if (!r.ok) throw new Error('gsc ' + r.status);
  return ((await r.json()).rows || []).map((x) => [x.keys && x.keys.length > 1 ? x.keys : (x.keys || [''])[0], x.clicks, x.impressions, +x.position.toFixed(1)]);
}
async function gaToplu(T, id, istekler) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:batchRunReports`, { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify({ requests: istekler }) });
  if (!r.ok) throw new Error('ga ' + r.status);
  return ((await r.json()).reports || []).map((rp) => (rp.rows || []).map((x) => [...(x.dimensionValues || []).map((d) => d.value), ...x.metricValues.map((m) => +(+m.value).toFixed(2))]));
}
const M = (...a) => a.map((name) => ({ name }));
const rapor = (ar, dim, met, n = 25, sira) => ({ dateRanges: [ar], dimensions: M(...dim), metrics: M(...met), limit: n, ...(dim[0] === 'date' ? { orderBys: [{ dimension: { dimensionName: 'date' } }] } : dim.length ? { orderBys: [{ metric: { metricName: sira || met[0] }, desc: true }] } : {}) });
const tarihDuz = (d) => d.length === 8 ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) : d;
const TOP = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration', 'ecommercePurchases', 'purchaseRevenue'];

// gscSiteler: günlük özetteki Search Console mülkleri (ad, etiket, mulk, dizin, harita); dizin/harita oradan korunur
const TAZE = 15 * 60000, ESKI = 6 * 3600000, SURUYOR = new Map();
// { ctx, bekle }: önbellekte hiç yoksa bekle=false iken null döner ve veri arkada hazırlanır (varsayılan aralık için
// günlük rapor gösterilir); bekle=true iken Google beklenir (kullanıcının seçtiği özel aralık).
export async function googleVeri(env, ar, gscSiteler = [], { ctx = null, bekle = true } = {}) {
  const anahtar = ar.bas + '_' + ar.bit;
  const cache = typeof caches !== 'undefined' ? caches.default : null, ck = new Request('https://onbellek.hasturk/google-veri2/' + anahtar);
  let bel = ONBELLEK.get(anahtar);
  if (!bel && cache) { const h = await cache.match(ck).catch(() => null); if (h) { const v = await h.json().catch(() => null); if (v) { bel = { ts: Date.parse(v.olusturma) || 0, v }; ONBELLEK.set(anahtar, bel); } } }
  const yenile = () => {
    if (!SURUYOR.has(anahtar)) SURUYOR.set(anahtar, cek(env, ar, gscSiteler).then(async (v) => {
      ONBELLEK.set(anahtar, { ts: Date.now(), v });
      if (cache) await cache.put(ck, new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + ESKI / 1000 } })).catch(() => {});
      return v;
    }).finally(() => SURUYOR.delete(anahtar)));
    return SURUYOR.get(anahtar);
  };
  const yas = bel ? Date.now() - bel.ts : Infinity;
  if (yas < TAZE) return bel.v;
  if (yas < ESKI || !bekle) {
    const is = yenile().catch(() => null);
    if (ctx) ctx.waitUntil(is);
    return bel ? bel.v : null;
  }
  return yenile();
}

async function cek(env, ar, gscSiteler) {
  const [Tg, Ta] = await Promise.all([jeton(env, 'https://www.googleapis.com/auth/webmasters.readonly'), jeton(env)]);
  const A = { startDate: ar.bas, endDate: ar.bit }, O = { startDate: ar.onceBas, endDate: ar.onceBit };
  const siteler = await Promise.all(gscSiteler.map(async (s) => {
    try {
      const q = (dimensions, rowLimit) => gsc(Tg, s.mulk, { startDate: ar.bas, endDate: ar.bit, dimensions, rowLimit });
      const [top, gun, cihaz, ulke, sorgu, sayfa] = await Promise.all([q([], 1), q(['date'], 500), q(['device'], 5), q(['country'], 8), q(['query'], 400), q(['page'], 250)]);
      const t = top[0];
      return { ...s, toplam: t ? { tik: t[1], gos: t[2], ctr: t[2] ? +(t[1] / t[2] * 100).toFixed(2) : 0, sira: t[3] } : null, gunluk: gun.map((r) => [r[0], r[1], r[2], r[3]]), cihaz, ulke, sorgu, sayfa };
    } catch (e) { return { ...s, toplam: null, gunluk: [], cihaz: [], ulke: [], sorgu: [], sayfa: [], hata: e.message }; }
  }));
  const ga = await Promise.all(GA_MULK.map(async ([ad, etiket, id]) => {
    const g = { ad, etiket, mulkId: id };
    try {
      // Bir mülkün beş toplu isteği aynı anda gider (sırayla gitmesi sayfayı saniyelerce bekletiyordu)
      const AD = ['advertiserAdCost', 'advertiserAdClicks', 'advertiserAdImpressions', 'sessions', 'ecommercePurchases', 'purchaseRevenue'];
      const [ilk, ikinci, sat, urn, rek] = await Promise.allSettled([
        gaToplu(Ta, id, [{ dateRanges: [A], metrics: M(...TOP) }, { dateRanges: [O], metrics: M('activeUsers', 'sessions', 'screenPageViews') }, rapor(A, ['date'], ['activeUsers', 'sessions', 'screenPageViews'], 500), rapor(A, ['sessionDefaultChannelGroup'], ['sessions', 'activeUsers', 'engagementRate'], 12), rapor(A, ['sessionSourceMedium'], ['sessions', 'activeUsers'], 20)]),
        gaToplu(Ta, id, [rapor(A, ['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], 40), rapor(A, ['landingPage'], ['sessions', 'activeUsers', 'engagementRate'], 25), rapor(A, ['deviceCategory'], ['activeUsers', 'sessions'], 5), rapor(A, ['city'], ['activeUsers'], 12), rapor(A, ['newVsReturning'], ['activeUsers'], 3)]),
        gaToplu(Ta, id, [
          rapor(A, ['sessionSource', 'sessionMedium'], ['sessions', 'ecommercePurchases', 'purchaseRevenue'], 60, 'sessions'),
          rapor(A, ['firstUserSource', 'firstUserMedium'], ['totalUsers', 'ecommercePurchases', 'purchaseRevenue'], 60, 'totalUsers'),
          rapor(A, ['landingPage'], ['sessions', 'ecommercePurchases', 'purchaseRevenue'], 300, 'purchaseRevenue'),
          rapor(A, ['sessionSource', 'sessionCampaignName', 'sessionManualAdContent'], ['sessions', 'ecommercePurchases', 'purchaseRevenue'], 200, 'sessions'),
        ]),
        gaToplu(Ta, id, [rapor(A, ['itemName'], ['itemsViewed', 'itemsAddedToCart', 'itemsPurchased', 'itemRevenue'], 150, 'itemRevenue')]),
        gaToplu(Ta, id, [rapor(A, ['sessionGoogleAdsCampaignName'], AD, 30, 'advertiserAdCost'), rapor(A, ['date', 'sessionGoogleAdsCampaignName'], ['advertiserAdCost', 'advertiserAdClicks'], 5000), rapor(A, ['date'], ['purchaseRevenue'], 500), { dateRanges: [O], dimensions: M('sessionGoogleAdsCampaignName'), metrics: M('advertiserAdCost', 'advertiserAdClicks'), limit: 200 }]),
      ]);
      if (ilk.status === 'rejected') throw ilk.reason;
      const [top, once, gunluk, kanal, kaynak] = ilk.value;
      g.toplam = top[0] ? Object.fromEntries(TOP.map((k, i) => [k, top[0][i] ?? 0])) : null;
      g.once = once[0] ? { activeUsers: once[0][0], sessions: once[0][1], screenPageViews: once[0][2] } : null;
      g.gunluk = gunluk.map((r) => [tarihDuz(r[0]), r[1], r[2], r[3]]); g.kanal = kanal; g.kaynak = kaynak;
      if (ikinci.status === 'rejected') throw ikinci.reason;
      const [sayfa, giris, cihaz, sehir, yeniEski] = ikinci.value;
      Object.assign(g, { sayfa, giris, cihaz, sehir, yeniEski });
      // Satış kaynakları: oturum kaynağı, kullanıcının ilk geliş kaynağı, giriş sayfası ve kampanya (blog UTM'si) → satış
      if (sat.status === 'fulfilled') [g.satKaynak, g.satIlk, g.satGiris, g.satKampanya] = sat.value; else g.satHata = sat.reason.message;
      // Ürünler ve reklam: ayrı toplu istek (biri desteklenmezse diğerleri etkilenmesin)
      g.urunler = urn.status === 'fulfilled' ? urn.value[0] : [];
      if (rek.status === 'fulfilled') try {
        const [kamp, gk, ciro, onceK] = rek.value;
        g.reklam = kamp;
        const gun = new Map(); gk.forEach(([d, , cost, tik]) => { const x = gun.get(d) || [0, 0]; x[0] += cost; x[1] += tik; gun.set(d, x); });
        const cm = new Map(ciro.map((r) => [r[0], r[1]]));
        g.reklamGun = [...new Set([...gun.keys(), ...cm.keys()])].sort().map((d) => [tarihDuz(d), +((gun.get(d) || [0])[0]).toFixed(2), (gun.get(d) || [0, 0])[1], cm.get(d) || 0]);
        g.reklamOnce = [+onceK.reduce((x, r) => x + r[1], 0).toFixed(2), onceK.reduce((x, r) => x + r[2], 0)];
      } catch (e) { g.reklamHata = e.message; } else g.reklamHata = rek.reason.message;
    } catch (e) { g.hata = e.message; }
    return g;
  }));
  return { olusturma: new Date().toISOString(), siteler, ga, canli: true };
}

// ---------- Google otoritesi (haftalık) ----------
// 7 Kasım 2026, kullanıcının isteği: "Google'da kurduğumuz otoriteyi bildirsin; önceki haftaya göre daha çok gösteriliyor mu,
// tıklanıyor mu, sayfalar öne çıkıyor mu". Son tam 7 gün (Google verisi 2–3 gün geriden gelir) önceki 7 günle karşılaştırılır:
// toplamlar, Google'da görünen sayfa ve arama sayısı, ilk 10 / ilk 3'teki arama sayısı, yükselen / düşen sayfalar,
// ilk 10'a yeni giren aramalar. Sonuç 6 saat taze sayılır; panel beklemez (önbellek yoksa arkada hazırlanır).
const OTO = new Map(), OTO_SURUYOR = new Map();
export async function googleOtorite(env, mulk, { ctx = null } = {}) {
  if (!mulk) return null;
  const cache = typeof caches !== 'undefined' ? caches.default : null, ck = new Request('https://onbellek.hasturk/otorite/' + encodeURIComponent(mulk));
  let bel = OTO.get(mulk);
  if (!bel && cache) { const h = await cache.match(ck).catch(() => null); if (h) { const v = await h.json().catch(() => null); if (v) { bel = { ts: Date.parse(v.olusturma) || 0, v }; OTO.set(mulk, bel); } } }
  const yas = bel ? Date.now() - bel.ts : Infinity;
  if (yas > 6 * 3600000 && !OTO_SURUYOR.has(mulk)) {
    const is = otoriteCek(env, mulk).then(async (v) => {
      OTO.set(mulk, { ts: Date.now(), v });
      if (cache) await cache.put(ck, new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=172800' } })).catch(() => {});
      return v;
    }).catch(() => null).finally(() => OTO_SURUYOR.delete(mulk));
    OTO_SURUYOR.set(mulk, is);
    if (ctx) ctx.waitUntil(is);
  }
  return bel ? bel.v : null;
}

async function otoriteCek(env, mulk) {
  const T = await jeton(env, 'https://www.googleapis.com/auth/webmasters.readonly');
  const bit = g_(Date.now() - 3 * 864e5), bas = gunEkle(bit, -6), oBit = gunEkle(bas, -1), oBas = gunEkle(oBit, -6);
  const q = (startDate, endDate, dimensions, rowLimit) => gsc(T, mulk, { startDate, endDate, dimensions, rowLimit });
  const [tB, tO, sB, sO, aB, aO] = await Promise.all([q(bas, bit, [], 1), q(oBas, oBit, [], 1), q(bas, bit, ['page'], 1000), q(oBas, oBit, ['page'], 1000), q(bas, bit, ['query'], 5000), q(oBas, oBit, ['query'], 5000)]);
  const ozet = (t, sayfa, arama) => ({ tik: t[0] ? t[0][1] : 0, gos: t[0] ? t[0][2] : 0, sira: t[0] ? t[0][3] : 0, sayfa: sayfa.length, arama: arama.length,
    ilk10: arama.filter((r) => r[3] <= 10).length, ilk3: arama.filter((r) => r[3] <= 3).length, tikSayfa: sayfa.filter((r) => r[1] > 0).length });
  const oM = new Map(sO.map((r) => [r[0], r]));
  const sayfaFark = sB.map((r) => { const o = oM.get(r[0]); return { u: r[0], gos: r[2], tik: r[1], sira: r[3], oGos: o ? o[2] : 0, oTik: o ? o[1] : 0, oSira: o ? o[3] : null }; });
  const yukselen = sayfaFark.filter((x) => x.gos - x.oGos > 0).sort((a, b) => (b.gos - b.oGos) - (a.gos - a.oGos)).slice(0, 8);
  const dusen = sO.filter((r) => { const b = sB.find((x) => x[0] === r[0]); return !b || b[2] < r[2]; }).map((r) => { const b = sB.find((x) => x[0] === r[0]); return { u: r[0], gos: b ? b[2] : 0, oGos: r[2], sira: b ? b[3] : null, oSira: r[3] }; })
    .sort((a, b) => (a.gos - a.oGos) - (b.gos - b.oGos)).slice(0, 5);
  const aO10 = new Map(aO.map((r) => [r[0], r[3]]));
  const yeniIlk10 = aB.filter((r) => r[3] <= 10 && !(aO10.get(r[0]) <= 10)).sort((a, b) => b[2] - a[2]).slice(0, 8).map((r) => ({ k: r[0], gos: r[2], sira: r[3], oSira: aO10.get(r[0]) ?? null }));
  return { olusturma: new Date().toISOString(), bu: { bas, bit, ...ozet(tB, sB, aB) }, once: { bas: oBas, bit: oBit, ...ozet(tO, sO, aO) }, yukselen, dusen, yeniIlk10 };
}
