// HasTürk Blog giriş noktası. Önizleme: <worker>/blog/… · ileride blog.hasturkgubre.com.tr kökünden (base '').
// Statik dosyalar (tasarım, simgeler, fotoğraflar) public/blog-statik/ altında; Cloudflare doğrudan sunar.
import { kur, ayarlar, zamanliSoruAc } from './db.js';
import { uyeOku } from './uye.js';
import { urunler, magazaAyarla } from './urun.js';
import { ayniKaynak, html, metin, botAdi } from './ortak.js';
import * as S from './site.js';
import { siteHaritasi, robots, llms, llmsTam, rss, indexNowBildir, INDEXNOW_ANAHTAR } from './seo.js';
import { panel } from './panel.js';
import { fotoSun } from './dosya.js';

const AYRILMIS = new Set(['bahce-takvimi', 'dosya', 'yazar', 'yazarlar', 'kategori', 'kategoriler', 'soru-cevap', 'ara', 'giris', 'kayit', 'cikis', 'hesabim', 'panel', 'api', 'git', 'b', 'feed.xml', 'sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', INDEXNOW_ANAHTAR + '.txt']);
export const ayrilmisMi = (slug) => AYRILMIS.has(slug) || S.sabitVar(slug);

export function blogTabani(url) {
  // blog.hasturkgubre.com.tr (Cloudflare Pages üzerinden gelir) ve Pages'in kendi önizleme adresi kökten çalışır
  if (/^blog\./i.test(url.hostname) || /\.pages\.dev$/i.test(url.hostname)) return '';
  if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) return '/blog';
  return null;
}

// Google Search Console sahiplik doğrulama dosyaları (kökte sunulur)
const GOOGLE_DOGRULAMA = new Set(['google29b16f5fbf542b36.html']);

let KAT = null;
export function katSifirla() { KAT = null; }

// Bot taramaları (7 Kasım 2026, kullanıcının isteği: "botlar kaç kere taradı, hangi sayfaya kaç kere baktı"): bot isteği
// gün gün b_istat'a yazılır: k='bot' x=bot adı · k='bot_s' x='bot|yol' · k='bot_h' x='bot|durum|yol' (4xx/5xx). Panel > Arama & Trafik > Botlar.
export async function blog(req, env, ctx, base) {
  const r = await blogIc(req, env, ctx, base);
  try {
    if ((req.method === 'GET' || req.method === 'HEAD') && env.DB) {
      const b = botAdi(req);
      const yol = new URL(req.url).pathname.slice(base.length) || '/';
      if (b && !/^\/(panel|api|dosya|blog-statik|git|b)(\/|$)/.test(yol)) {
        const g = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10), y = yol.slice(0, 110);
        const ekle = (k, x) => env.DB.prepare('INSERT INTO b_istat (d, k, x, n) VALUES (?, ?, ?, 1) ON CONFLICT (d, k, x) DO UPDATE SET n = n + 1').bind(g, k, x.slice(0, 120));
        const yaz = [ekle('bot', b[0]), ekle('bot_s', b[0] + '|' + y)];
        if (r.status >= 400) yaz.push(ekle('bot_h', b[0] + '|' + r.status + '|' + y));
        ctx.waitUntil(env.DB.batch(yaz).catch(() => {}));
      }
    }
  } catch {}
  return r;
}
async function blogIc(req, env, ctx, base) {
  const url = new URL(req.url);
  const dosya = url.pathname.slice(base.length + 1);
  if (GOOGLE_DOGRULAMA.has(dosya)) return new Response('google-site-verification: ' + dosya, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  if (!env.DB) return html('<h1>Veritabanı bağlı değil</h1>', { status: 503 });
  const db = env.DB;
  await kur(db, env);
  await zamanliSoruAc(db);
  let yol = url.pathname.slice(base.length) || '/';
  if (yol.length > 1 && yol.endsWith('/')) return new Response(null, { status: 301, headers: { Location: base + yol.replace(/\/+$/, '') + url.search } });
  if (req.method === 'POST' && !ayniKaynak(req)) return new Response('Geçersiz istek', { status: 403 });
  const [A, uye] = await Promise.all([ayarlar(db), uyeOku(req, db)]);
  if (!KAT || Date.now() - KAT.t > 60000) KAT = { t: Date.now(), l: (await db.prepare('SELECT * FROM b_kategori ORDER BY sira, id').all()).results };
  magazaAyarla(A.magaza_url);
  let U = null;
  const c = { req, env, ctx, db, url, base, A, uye, kat: KAT.l, U: async () => (U = U || await urunler(env, req.url)) };
  const p = yol.split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
  const G = req.method === 'GET' || req.method === 'HEAD', P = req.method === 'POST';
  // Yeni yayımlanan yazıları arama motorlarına bildir (saatte en fazla bir kontrol; ziyaretçiyi bekletmez)
  if (G && p[0] !== 'panel') ctx.waitUntil(indexNowBildir(c).catch(() => {}));
  try {
    if (p[0] === 'panel') return await panel(c, p.slice(1));
    if (!p.length && G) return await S.anaSayfa(c);
    switch (p[0]) {
      case 'kategoriler': if (G && p.length === 1) return await S.kategorilerSayfa(c); break;
      case 'kategori': if (G && p.length === 2) return await S.kategoriSayfa(c, p[1]); break;
      case 'soru-cevap':
        if (p.length === 1 && G) return await S.scSayfa(c);
        if (p[1] === 'sor' && G) return await S.soruSorSayfa(c);
        if (p.length === 2 && G && /^\d+/.test(p[1])) return await S.soruSayfa(c, parseInt(p[1], 10));
        break;
      case 'ara': if (G && p[1] === 'oneri') return await S.aramaOneri(c); if (G && p.length === 1) return await S.aramaSayfa(c); break;
      case 'dosya': if (G && p.length === 2) return await fotoSun(db, p[1]); break;
      case 'bahce-takvimi': if (G && p.length <= 3) { const r = await S.takvimSayfa(c, p[1], p[2]); if (r) return r; } break;
      case 'yazar': if (G && p.length === 2) return await S.yazarSayfa(c, p[1]); break;
      case 'yazarlar': if (G && p.length === 1) return await S.yazarlarSayfa(c); break;
      case 'giris': return P ? await S.girisPost(c, 'giris') : S.girisSayfa(c, 'giris');
      case 'kayit': return P ? await S.girisPost(c, 'kayit') : S.girisSayfa(c, 'kayit');
      case 'cikis': return await S.cikis(c);
      case 'hesabim': return P ? await S.hesabimPost(c) : await S.hesabimSayfa(c);
      case 'git': if (p[1]) return await S.gitYonlendir(c, p[1]); break;
      case 'b': if (p[1]) return await S.bannerYonlendir(c, p[1]); break;
      case 'sitemap.xml': return await siteHaritasi(c);
      case 'robots.txt': return robots(c);
      case 'llms.txt': return await llms(c);
      case 'llms-full.txt': return await llmsTam(c);
      case INDEXNOW_ANAHTAR + '.txt': return metin(INDEXNOW_ANAHTAR);
      case 'feed.xml': return await rss(c);
      case 'api':
        if (!P) break;
        if (p[1] === 'yorum') return await S.yorumPost(c);
        if (p[1] === 'soru') return await S.soruPost(c);
        if (p[1] === 'cevap') return await S.cevapPost(c);
        if (p[1] === 'oy') return await S.oyPost(c);
        if (p[1] === 'cozum') return await S.cozumPost(c);
        if (p[1] === 'bulten') return await S.bultenPost(c);
        if (p[1] === 'tik') return await S.tikPost(c);
        if (p[1] === 'okunma') return await S.okunmaPost(c);
        break;
      default:
        if (p.length === 1 && G) return S.sabitVar(p[0]) ? S.sabitSayfa(c, p[0]) : await S.yaziSayfa(c, p[0]);
    }
    return S.bulunamadi(c);
  } catch (e) {
    console.error('blog', yol, e && e.stack || e);
    return html(`<!doctype html><meta charset="utf-8"><title>Hata</title><body style="font-family:sans-serif;padding:40px"><h1>Bir sorun oluştu</h1><p>Lütfen biraz sonra tekrar deneyin.</p><p><a href="${base || '/'}">Ana sayfa</a></p>`, { status: 500, noindex: true });
  }
}
