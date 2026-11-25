// Blog ortak yardımcıları: HTML kaçışı, tarih, şifre özeti, çerez, yanıt kalıpları.
// Türkiye saati sabit UTC+3 (yaz saati uygulaması yok).

export const TR_SAAT = 3 * 3600 * 1000;
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AY_ADI = AYLAR;

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function trKucuk(s) { return String(s || '').toLocaleLowerCase('tr-TR'); }

export function slugYap(s) {
  const m = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return trKucuk(s).replace(/[çğıöşüâîû]/g, (c) => m[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'yazi';
}

export function trTarih(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts) + TR_SAAT);
  return d.getUTCDate() + ' ' + AYLAR[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
export function trTarihSaat(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts) + TR_SAAT);
  return trTarih(ts) + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
}
// <input type="datetime-local"> değeri (Türkiye saati) ↔ zaman damgası
export function yerelGiris(ts) {
  if (!ts) return '';
  return new Date(Number(ts) + TR_SAAT).toISOString().slice(0, 16);
}
export function yereldenTs(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - TR_SAAT;
}
export function gun(ts = Date.now()) { return new Date(ts + TR_SAAT).toISOString().slice(0, 10); }
export function trAy(ts = Date.now()) { return new Date(ts + TR_SAAT).getUTCMonth(); }

export function goreli(ts) {
  const s = Math.max(0, (Date.now() - Number(ts)) / 1000);
  if (s < 60) return 'az önce';
  if (s < 3600) return Math.floor(s / 60) + ' dk önce';
  if (s < 86400) return Math.floor(s / 3600) + ' saat önce';
  if (s < 172800) return 'dün';
  if (s < 30 * 86400) return Math.floor(s / 86400) + ' gün önce';
  return trTarih(ts);
}

export function kisaSayi(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' Mn';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',').replace(',0', '') + ' B';
  return String(n);
}
export function binlik(n) { return (Number(n) || 0).toLocaleString('tr-TR'); }
export function fiyat(n) { return (Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' TL'; }

export function okumaDk(metin) { return Math.max(1, Math.round(String(metin || '').split(/\s+/).filter(Boolean).length / 200)); }

const enc = new TextEncoder();
function hex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(String(s)))); }
export function rastgele(n = 32) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// Şifre: PBKDF2-SHA256, 100.000 tur (Workers üst sınırı), 16 bayt tuz
export async function sifreOzet(sifre, tuz) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(sifre)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(tuz), iterations: 100000 }, key, 256);
  return hex(bits);
}
// Sabit süreli karşılaştırma (zamanlama saldırısına karşı)
export function esit(a, b) {
  a = String(a); b = String(b);
  let f = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) f |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return f === 0;
}

export function cerezler(req) {
  const o = {};
  String(req.headers.get('Cookie') || '').split(/;\s*/).forEach((p) => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
  return o;
}

export const BOT = /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview|curl|wget|python|httpclient|go-http/i;
export function botMu(req) { return BOT.test(req.headers.get('User-Agent') || ''); }
// Bot adı (tarama kaydı için; kimlik kendi bildirdiği tarayıcı adından, sahtesi de olabilir). [ad, grup]
// grup: arama (arama motoru), yz (yapay zekâ), seo (SEO araçları), sosyal (bağlantı önizleme), diger
export const BOT_TUR = [
  ['Googlebot', 'arama', /Googlebot|Google-InspectionTool|GoogleOther|Storebot-Google|Google-Site-Verification/i],
  ['Google Ads', 'arama', /AdsBot-Google|Mediapartners-Google/i],
  ['Bingbot', 'arama', /bingbot|BingPreview|msnbot|adidxbot/i],
  ['YandexBot', 'arama', /Yandex/i],
  ['Applebot', 'arama', /Applebot/i],
  ['DuckDuckBot', 'arama', /DuckDuck/i],
  ['ChatGPT (OpenAI)', 'yz', /GPTBot|ChatGPT-User|OAI-SearchBot/i],
  ['Claude (Anthropic)', 'yz', /ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai/i],
  ['Perplexity', 'yz', /Perplexity/i],
  ['Gemini / Google YZ', 'yz', /Google-Extended|GoogleAgent|Gemini/i],
  ['Meta YZ', 'yz', /meta-externalagent|meta-externalfetcher/i],
  ['Diğer yapay zekâ', 'yz', /CCBot|Bytespider|Amazonbot|cohere|YouBot|Diffbot|MistralAI|DuckAssistBot|PetalBot/i],
  ['SEO aracı', 'seo', /AhrefsBot|SemrushBot|MJ12bot|DotBot|SerpstatBot|DataForSeoBot|BLEXBot|Screaming Frog|Sitebulb|rogerbot/i],
  ['Sosyal önizleme', 'sosyal', /facebookexternalhit|FacebookBot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Pinterest/i],
];
export function botAdi(req) {
  const ua = req.headers.get('User-Agent') || '';
  for (const [ad, grup, re] of BOT_TUR) if (re.test(ua)) return [ad, grup];
  return BOT.test(ua) ? ['Diğer bot', 'diger'] : null;
}

export function html(body, { status = 200, headers = {}, noindex = false } = {}) {
  const h = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...headers };
  if (noindex) h['X-Robots-Tag'] = 'noindex, nofollow';
  return new Response(body, { status, headers: h });
}
export function yonlendir(yer, headers = {}) { return new Response(null, { status: 303, headers: { Location: yer, 'Cache-Control': 'no-store', ...headers } }); }
export function jsonYanit(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
export function metin(body, tur = 'text/plain', headers = {}) { return new Response(body, { headers: { 'Content-Type': tur + '; charset=utf-8', 'Cache-Control': 'public, max-age=600', ...headers } }); }

// Başka siteden gönderilen formları reddet (CSRF): POST'ta Origin varsa aynı alan adı olmalı
export function ayniKaynak(req) {
  const o = req.headers.get('Origin');
  if (!o) return true;
  try { return new URL(o).host === new URL(req.url).host; } catch { return false; }
}

export async function formOku(req) {
  const ct = req.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return await req.json().catch(() => ({}));
  const f = await req.formData().catch(() => null);
  const o = {};
  // Dosyalar (fotoğraf yükleme) ayrı tutulur: o._dosya[ad] = [File, …]
  if (f) for (const [k, v] of f.entries()) { if (typeof v === 'string') o[k] = k in o ? [].concat(o[k], v) : v; else if (v && v.size) { o._dosya = o._dosya || {}; (o._dosya[k] = o._dosya[k] || []).push(v); } }
  return o;
}

export function kirp(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

// Kullanıcı metni: kaçış + satır sonları (bağlantı üretilmez)
export function duzMetin(s) {
  return String(s || '').trim().split(/\n{2,}/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
}

export function bas(ad) {
  const p = String(ad || '?').trim().split(/\s+/);
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toLocaleUpperCase('tr-TR');
}
const RENK = ['#b05c8a', '#3c7fa2', '#c46a2f', '#7a4fa0', '#2f7d9a', '#3f8f5f', '#b5402f', '#5a6fb0'];
export function renk(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return RENK[h % RENK.length]; }
