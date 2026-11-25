// Google Analytics canlı (son 30 dakika) raporu: HasTürk Gübre, Tarım Dünyası ve Blog için aktif kullanıcı, sayfa,
// şehir, cihaz ve dakika dağılımı. Servis hesabı anahtarı Cloudflare'de GSC_ANAHTAR gizli değeri olarak durur (yalnız okuma,
// analytics.readonly); erişim jetonu ~55 dk, sonuç 45 sn bellekte tutulur. Kişi bilgisi yoktur, yalnız sayılar.

export const GA_MULK = [['hasturk', 'HasTürk Gübre', '525397457'], ['tarim', 'Tarım Dünyası', '519130782'], ['blog', 'HasTürk Blog', '559468186']];

const JETON = {};
let SONUC = null;
const b64u = (b) => btoa(typeof b === 'string' ? unescape(encodeURIComponent(b)) : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Erişim jetonu (yalnız okuma kapsamları); kapsam başına ~55 dk bellekte
export async function jeton(env, kapsam = 'https://www.googleapis.com/auth/analytics.readonly') {
  if (JETON[kapsam] && JETON[kapsam].bitis > Date.now()) return JETON[kapsam].t;
  let A;
  try { A = JSON.parse(String(env.GSC_ANAHTAR || '')); } catch { A = null; }
  if (!A || !A.client_email || !A.private_key) throw new Error('anahtar');
  const der = Uint8Array.from(atob(A.private_key.replace(/-----[^-]+-----|\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const govde = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ iss: A.client_email, scope: kapsam, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const imza = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(govde)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: govde + '.' + imza }) });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error('oturum');
  JETON[kapsam] = { t: j.access_token, bitis: Date.now() + 55 * 60000 };
  return j.access_token;
}

async function rapor(T, id, boyut, n = 10) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:runRealtimeReport`, {
    method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' },
    body: JSON.stringify({ dimensions: boyut ? [{ name: boyut }] : [], metrics: [{ name: 'activeUsers' }], limit: n, ...(boyut && boyut !== 'minutesAgo' ? { orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] } : {}) }),
  });
  if (!r.ok) throw new Error('ga ' + r.status);
  const j = await r.json();
  return (j.rows || []).map((x) => [x.dimensionValues ? (x.dimensionValues[0] || {}).value : '', +x.metricValues[0].value]);
}

export async function canli(env) {
  if (SONUC && SONUC.ts > Date.now() - 45000) return SONUC;
  let T;
  try { T = await jeton(env); } catch (e) { return { hata: e.message === 'anahtar' ? 'anahtar' : 'oturum', ts: Date.now() }; }
  const siteler = await Promise.all(GA_MULK.map(async ([ad, etiket, id]) => {
    try {
      const [top, sayfa, sehir, cihaz, dk] = await Promise.all([rapor(T, id, null, 1), rapor(T, id, 'unifiedScreenName', 8), rapor(T, id, 'city', 6), rapor(T, id, 'deviceCategory', 3), rapor(T, id, 'minutesAgo', 30)]);
      const dakika = Array(30).fill(0); dk.forEach(([m, n]) => { if (+m < 30) dakika[29 - +m] = n; });
      return { ad, etiket, aktif: top.length ? top[0][1] : 0, sayfa, sehir, cihaz, dakika };
    } catch (e) { return { ad, etiket, hata: e.message }; }
  }));
  SONUC = { ts: Date.now(), siteler };
  return SONUC;
}
