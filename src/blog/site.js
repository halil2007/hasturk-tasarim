// Blog ziyaretçi sayfaları (sunucuda HTML üretilir; tasarım: public/blog-statik/site.css, kullanıcının örnek tasarımı v2).
// c (bağlam): { req, env, ctx, db, url, base, A (ayarlar), uye, kat (kategoriler), U() (mağaza ürünleri) }
import { sosyalHesaplar } from './sosyal.js';
import { FOTO_KREDI } from './fotolar.js';
import { esc, trTarih, goreli, kisaSayi, binlik, okumaDk, kirp, duzMetin, bas, renk, html, yonlendir, formOku, slugYap, trAy, botMu, sha256, ayniKaynak } from './ortak.js';
import { YAYINDA, say, sinir, kur, ayarYaz, KOPYA_YON } from './db.js';
import { render, sssCoz, duz } from './md.js';
import { hukukDoldur } from './hukuk.js';
import { icLink, urunIfadeleri } from './baglanti.js';
import { bildir, soruTamUrl } from './mail.js';
import { ayrilmisMi } from './index.js';
import { eslestir, oneriler, urunBul, urunBulYedekli, kartRc, kartPm, kartRs, kartYaziIci, gorselUrl } from './urun.js';
import { kayit, giris, oturumAc, oturumKapat, paylasimDurumu, guven, yetkili } from './uye.js';
import { yaziJsonLd, kirintiJsonLd, sssJsonLd, soruJsonLd, siteJsonLd, indexlenir } from './seo.js';
import { YAZAR_LISTE, yazarBul, yazarTanitim, kisiJsonLd } from './yazarlar.js';
import { fotoKaydet, fotoUrl, SORU_FOTO_MAX } from './dosya.js';
import { yaziAra, soruAra, norm, tumYazilar, tumSorular } from './ara.js';
import { TAKVIM, BOLUMLER, AY_SLUG, AY_AD, AY_DA, AY_GORSEL, AY_DESEN, satir, CIZELGE, MEVSIM, MEVSIM_AD, SEBZE_BILGI, BOLUM_SLUG, BOLUM_SAYFA, AY_DONEM, AY_GUN, IS_URUN } from './takvim.js';
import { soruBaslikDuzelt, soruMetinDuzelt, soruSeoBaslik, soruAciklama, kategoriTahmin } from './soru-duzen.js';

const IK = (id) => `<svg><use href="/blog-statik/ikon.svg#${id}"/></svg>`;
const SURUM = '35';
// Atıf gerektiren (CC BY / CC BY-SA) kapak fotoğrafının yazarı ve lisansı
const LISANS_URL = (l) => { const m = /^cc (by(?:-sa)?) ([1-4]\.0)/i.exec(l || ''); return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/deed.tr` : ''; };
function krediSatiri(g) {
  const k = FOTO_KREDI[(/\/foto\/([a-z0-9-]+)\.webp$/.exec(g || '') || [])[1]];
  if (!k) return '';
  const lu = LISANS_URL(k[1]);
  return `<p class="kredi">Fotoğraf: <a href="${esc(k[2])}" rel="nofollow noopener" target="_blank">${esc(k[0])}</a> · ${lu ? `<a href="${lu}" rel="nofollow noopener license" target="_blank">${esc(k[1])}</a>` : esc(k[1])} · Wikimedia Commons</p>`;
}
export const L = (c, p = '') => (c.base + p) || '/';
const MSJ = {
  yorum_ok: 'Yorumunuz yayınlandı. Teşekkürler!', yorum_bekliyor: 'Yorumunuz alındı; kısa bir kontrolden sonra yayınlanacak.',
  foto_ok: 'Profil fotoğrafınız güncellendi.', foto_silindi: 'Profil fotoğrafınız kaldırıldı.', foto_sinir: 'Bugün için fotoğraf yükleme sınırına ulaştınız.',
  foto_hata: 'Fotoğraf yüklenemedi. JPEG, PNG ya da WebP biçiminde ve daha küçük bir fotoğraf deneyin.',
  soru_ok: 'Sorunuz yayınlandı.', soru_bekliyor: 'Sorunuz alındı; kısa bir kontrolden sonra yayınlanacak.',
  cevap_ok: 'Cevabınız yayınlandı. Teşekkürler!', cevap_bekliyor: 'Cevabınız alındı; kısa bir kontrolden sonra yayınlanacak.',
  bulten_ok: 'Bültene kaydoldunuz. Teşekkürler!', cozum_ok: 'Cevap çözüm olarak işaretlendi.', hiz: 'Çok sık paylaşım yaptınız; biraz sonra tekrar deneyin.',
  kisa: 'Mesaj çok kısa; biraz daha ayrıntı yazın.', hos: 'Hoş geldiniz! Artık yorum yapabilir ve soru sorabilirsiniz.', kaydedildi: 'Tercihiniz kaydedildi.', cikis: 'Çıkış yaptınız.', oy: 'Oyunuz kaydedildi.',
};

function chip(k) { return k && k.krenk ? ' ' + k.krenk : ''; }
const avR = (x) => (x.derleme ? '#5aa84a' : x.urol && x.urol !== 'uye' ? '#2e7d43' : renk(x.uad));
// Müşteri sorularından derlenen sorularda soranın adı bilinmez: kurumsal hesap yerine "Bir bahçe sever" yazılır
const soran = (x) => (x.derleme ? 'Bir bahçe sever' : x.uad);
// Avatar: üyenin profil fotoğrafı varsa fotoğraf, yoksa baş harfler
const avatar = (c, ad, renk_, foto, ek = '') => (foto ? `<span class="av av-f"${ek}><img src="${fotoUrl(c.base, foto)}" alt="" loading="lazy" decoding="async"></span>` : `<span class="av" style="background:${renk_}"${ek}>${esc(bas(ad))}</span>`);
function ph(src, alt = '', ek = '') { return `<div class="ph"${ek}><img src="${esc(src || '/blog-statik/foto/hero1.webp')}" alt="${esc(alt)}" loading="lazy" decoding="async"></div>`; }
function yaziUrl(c, y) { return L(c, '/' + y.slug); }
function soruUrl(c, s) { return L(c, '/soru-cevap/' + s.id + '-' + s.slug); }
function meta(y, dk = true) { return `<div class="meta"><span>${IK('i-cal')}${trTarih(y.yayin_ts)}</span>${dk ? `<span>${IK('i-clock')}${y.dk || okumaDk(y.govde)} dk okuma</span>` : ''}</div>`; }

const YAZI_SEC = `SELECT y.id, y.slug, y.baslik, y.ozet, y.gorsel, y.gorsel_alt, y.yayin_ts, y.okunma, y.tur, y.govde, k.slug kslug, k.ad kad, k.renk krenk FROM b_yazi y LEFT JOIN b_kategori k ON k.id = y.kategori_id`;
async function yazilar(c, kosul = '', bag = [], son = 'ORDER BY y.yayin_ts DESC LIMIT 6') {
  return (await c.db.prepare(`${YAZI_SEC} WHERE ${YAYINDA.replace(/durum|yayin_ts/g, (m) => 'y.' + m)} ${kosul} ${son}`).bind(Date.now(), ...bag).all()).results;
}

// Yazının odak kelimesinden metinde aranacak ifadeler: tam hâli ve baştaki yer sözcüğü atılmış iki kelimelik konu ("saksıda limon ağacı bakımı" → "limon ağacı")
function konuIfadeleri(odak, etiketler) {
  const t = String(odak || '').toLocaleLowerCase('tr').trim(), out = [];
  // İlk etiket tek ve ayırt edici bir kelimeyse (orkide, kaktüs, fesleğen…) o da aranır
  const e1 = String(etiketler || '').split(',')[0].toLocaleLowerCase('tr').trim();
  if (t.length >= 8) out.push(t);
  const k = t.split(/\s+/).filter((w) => !/^(saksıda|balkonda|bahçede|evde|evinizde)$/.test(w));
  if (k.length >= 2 && !/^(ne|neden|nasıl|hangi|mi|mı|için|ile|ayında)$/.test(k[1])) out.push(k.slice(0, 2).join(' '));
  if (/^[a-zçğıöşü]{5,}$/.test(e1) && !/^(toprak|saksı|bitki|bahçe|çiçek|yaprak|kasım|ekim|gübre)/.test(e1)) out.push(e1);
  return [...new Set(out)];
}
function postKart(c, y) {
  return `<a class="post" href="${yaziUrl(c, y)}"><div class="ph"><img src="${esc(y.gorsel || '/blog-statik/foto/hero1.webp')}" alt="${esc(y.gorsel_alt || '')}" loading="lazy" decoding="async">${y.kad ? `<span class="chip${chip(y)}">${esc(y.kad)}</span>` : ''}</div><div class="bd"><h3>${esc(y.baslik)}</h3><p>${esc(kirp(y.ozet, 140))}</p>${meta(y)}</div></a>`;
}
function rank(c, list, sayac = true) {
  if (!list.length) return '<p class="muted" style="font-size:13px">Henüz yazı yok.</p>';
  return `<div class="rank">${list.map((y, i) => `<a class="rk" href="${yaziUrl(c, y)}"${sayac ? '' : ' style="grid-template-columns:56px minmax(0,1fr)"'}>${sayac ? `<i>${i + 1}</i>` : ''}${ph(y.gorsel, '', sayac ? '' : ' style="width:56px;height:48px"')}<div><b>${esc(y.baslik)}</b><small>${sayac && y.okunma >= 50 ? kisaSayi(y.okunma) + ' okuma' : trTarih(y.yayin_ts)}</small></div></a>`).join('')}</div>`;
}
function bulten(c, kisa) {
  if (c.A.bolum_bulten === '0') return '';
  return `<div class="box nl"><h3>${IK('i-mail')}HasTürk Bültenine Abone Olun</h3><p>${kisa ? 'Yeni yazılar ve ayın bahçe takvimi e-postanıza gelsin.' : 'Bitki bakımı, yeni yazılar ve ayın bahçe takvimi e-postanıza gelsin.'}</p>
<form method="post" action="${L(c, '/api/bulten')}"><input type="hidden" name="geri" value="${esc(c.url.pathname)}"><label class="sr" for="em${kisa ? 2 : 1}">E-posta</label><input id="em${kisa ? 2 : 1}" name="eposta" type="email" required placeholder="E-posta adresiniz" autocomplete="email"><button class="btn btn-g">Abone Ol</button></form>
<small class="muted">Abone olarak içerik duyurularını e-posta ile almayı onaylamış olursunuz; istediğiniz an ayrılabilirsiniz. <a href="${L(c, '/gizlilik')}">Aydınlatma Metni</a></small></div>`;
}
function aramaKutu(c, ph_ = 'Hangi konuda bilgi arıyorsunuz?', ek = '') {
  return `<form class="sbox" method="get" action="${L(c, '/ara')}"><input name="q" placeholder="${esc(ph_)}" aria-label="Blogda ara">${ek}<button aria-label="Ara">${IK('i-search')}</button></form>`;
}
async function banner(c, alan, katId) {
  const now = Date.now();
  const b = await c.db.prepare('SELECT * FROM b_banner WHERE alan = ? AND aktif = 1 AND (bas_ts IS NULL OR bas_ts <= ?) AND (bit_ts IS NULL OR bit_ts >= ?) AND (kategori_id IS NULL OR kategori_id = ?) ORDER BY id DESC LIMIT 1').bind(alan, now, now, katId || 0).first();
  if (b && !botMu(c.req)) c.ctx.waitUntil(c.db.prepare('UPDATE b_banner SET gosterim = gosterim + 1 WHERE id = ?').bind(b.id).run().catch(() => {}));
  return b;
}
function bannerLink(c, b) { return L(c, '/b/' + b.id); }
async function bant(c, alan, varsayilan, katId, genis) {
  const b = await banner(c, alan, katId);
  const d = b ? { baslik: b.baslik, alt: b.alt, dugme: b.dugme || 'Alışverişe Başla', link: bannerLink(c, b), gorsel: b.gorsel } : varsayilan;
  return `<div class="band${genis ? ' wideband' : ''}">${ph(d.gorsel)}<div class="in"><h2>${esc(d.baslik)}</h2>${d.alt ? `<p>${esc(d.alt)}</p>` : ''}<a class="btn btn-g" href="${esc(d.link)}"${b ? '' : ' rel="nofollow"'}>${esc(d.dugme)} ${IK('i-arrow')}</a></div><span class="sign hand">${genis ? 'Daha yeşil<br>bir yaşam…' : 'Bahçeniz<br>Sizi Bekliyor'}</span></div>`;
}
// Ana sayfa mağaza alanı: iki mağazanın gerçek siparişlerinden çıkan "en çok satanlar" (products.json > trend.best,
// ürün eşitlemesi her gün günceller). Seçim haftada bir yenilenir ve b_ayar 'magaza_oto' içinde saklanır; böylece
// ürünler hafta içinde sabit kalır. Ev içi haşere/akar ürünleri blogda gösterilmez; stokta olmayan atlanır.
const EV_HASERE = /haşere|hasere|akar|mite|repellent|sinek|böcek|bocek|tahta kurdu|hamam|pire|kene|fare|köpek|kedi|ödül maması/i;
async function encokSatanlar(c, n = 4) {
  const U = await c.U();
  const uygun = (p) => p && p.st > 0 && p.p > 0 && !EV_HASERE.test(p.n + ' ' + p.s);
  let kayit = c.A.magaza_oto;
  if (typeof kayit === 'string') { try { kayit = JSON.parse(kayit); } catch { kayit = null; } }
  const taze = kayit && Array.isArray(kayit.ids) && Date.now() - (kayit.t || 0) < 7 * 864e5;
  let ids = taze ? kayit.ids : (U.trend || []).filter((s) => uygun(U.harita.get(s))).slice(0, n);
  if (!taze && ids.length) c.ctx.waitUntil(ayarYaz(c.db, 'magaza_oto', { t: Date.now(), ids }).catch(() => {}));
  let list = ids.map((s) => U.harita.get(s)).filter(uygun);
  if (list.length < n) list = list.concat(urunBulYedekli(U, Array.isArray(c.A.one_urunler) ? c.A.one_urunler : []).filter((p) => uygun(p) && !list.includes(p)));
  return { U, list: list.slice(0, n), cok: list.length > 0 && ids.length > 0 };
}
async function oneUrunler(c, n = 3) {
  const U = await c.U();
  let list = urunBulYedekli(U, Array.isArray(c.A.one_urunler) ? c.A.one_urunler : []);
  if (list.length < n) list = list.concat(urunBul(U, U.trend).filter((p) => p.uygun && !list.includes(p))).slice(0, n);
  return { U, list: list.slice(0, n) };
}
function ipucu(c) {
  if (c.A.bolum_ipucu === '0') return '';
  const l = Array.isArray(c.A.ipuclari) ? c.A.ipuclari : [];
  if (!l.length) return '';
  const g = Math.floor(Date.now() / 86400000);
  return `<div class="box tip"><h3>${IK('i-bulb')}Günün Bitki İpucu</h3><div class="in">${ph('/blog-statik/foto/sulama.webp')}<p>${esc(l[g % l.length])}</p></div></div>`;
}
// Ana sayfa "Bu Ay Bahçede": içinde bulunulan ayın takvim sayfasına bölüm bölüm kısa yol (ay değişince kendiliğinden değişir)
function ayKutu(c) {
  if (c.A.bolum_ay === '0') return '';
  const ay = trAy(), t = TAKVIM[ay], sonraki = (ay + 1) % 12, u = L(c, '/bahce-takvimi/' + AY_SLUG[ay]);
  return `<div class="box tkk"><div class="tkk-bas"><h3>${IK('i-cal')}Bu Ay Bahçede: ${AY_AD[ay]}</h3><a href="${L(c, '/bahce-takvimi')}">12 ay</a></div>
<p class="tkk-giris">${esc(kirp(t.giris, 130))}</p>
<ul class="tkk-l">${BOLUMLER.map(([k, ad, ik]) => `<li><a href="${u}/${BOLUM_SLUG[k]}"><span class="tkk-ik">${IK(ik)}</span><span class="tkk-m"><b>${esc(AY_DA[ay])} ${esc(ad.toLocaleLowerCase('tr'))}</b><small>${esc(t[k].slice(0, 3).map((x) => satir(x).is).join(' · '))}</small></span>${IK('i-right')}</a></li>`).join('')}</ul>
<a class="btn btn-g tkk-btn" href="${u}">${AY_AD[ay]} bahçe takvimi ${IK('i-arrow')}</a>
<a class="tkk-sonra" href="${L(c, '/bahce-takvimi/' + AY_SLUG[sonraki])}">${AY_AD[sonraki]} için hazırlık ${IK('i-right')}</a></div>`;
}
function flash(c) {
  const m = MSJ[c.url.searchParams.get('m')];
  return m ? `<div class="flash" role="status">${IK('i-check')}<span>${esc(m)}</span></div>` : '';
}
function hataKutu(h) { return h ? `<div class="flash err" role="alert">${esc(h)}</div>` : ''; }

// ---------- Sayfa iskeleti ----------
// Kapak görsellerinin çoğu 960x640; farklı olanlar elle (og:image ölçüsü paylaşım önizlemesi için)
const OLCU_FARKLI = { 'bahce-magaza': [1024, 683], 'cicek-tarhi': [960, 540], cilek: [960, 540], feslegen: [1024, 683], fide: [1024, 683], gul: [600, 600], hero1: [960, 658], hero4: [960, 639],
  'kat-bahce': [600, 600], 'kat-bitki': [600, 600], 'kat-cicek': [600, 600], 'kat-sebze': [600, 600], 'saksi-degisimi': [600, 600], sararma: [960, 641], sera: [1400, 1050], sonbahar: [960, 638],
  sulama: [1024, 588], tarla: [960, 720], yabanmersini: [960, 540], zeytin: [600, 600] };
function gorselOlcu(u) { const m = /\/blog-statik\/foto\/([a-z0-9-]+)\.webp$/.exec(u); return m ? OLCU_FARKLI[m[1]] || [960, 640] : null; }
// Mağazanın "Ürün Bul" paneli (arama, kategoriler, Bilge Bey) blogda da açılır. data-store mağazayı gösterir: blogda
// "Sepete ekle" mağazayı açar ve ürün orada sepete eklenir; blogun kendi arama kutuları yakalanmaz (widget/pm-search.js > OFFSITE)
const UA_BETIK = (mag) => `<script src="https://hasturk-arama.halilc2007.workers.dev/pm-search.js" data-store="${mag}" async></script>`;
export function sayfa(c, { baslik, aciklama = '', yol = '', gorsel = '', gorselAlt = '', makale = null, jsonld = [], govde, aktif = '', tur = 'website', noindex = false, durum = 200, girisYok = false, seoBaslik = '', okunma = 0 }) {
  const A = c.A, idx = indexlenir(c) && !noindex;
  const tamBaslik = seoBaslik ? seoBaslik : baslik ? `${baslik} | ${A.site_adi || 'HasTürk Blog'}` : `${A.site_adi || 'HasTürk Blog'} – ${A.slogan || ''}`;
  const kanonik = (A.site_url || '') + (yol || '/');
  const og = gorsel ? (/^https?:/.test(gorsel) ? gorsel : (A.site_url || '') + gorsel) : (A.site_url || '') + '/blog-statik/foto/ortanca.webp';
  const menu = c.kat.filter((k) => k.menude);
  // Menü sade: logo ana sayfaya, Hakkımızda alt bölümde
  const nav = [['/kategoriler', 'Kategoriler', 'kategoriler'], ...menu.map((k) => ['/kategori/' + k.slug, k.ad, 'k:' + k.slug]), ['/bahce-takvimi', 'Bahçe Takvimi', 'takvim'], ['/soru-cevap', 'Soru-Cevap', 'sc']];
  const gundem = c.kat.find((k) => k.slug === 'gundem');
  if (gundem) nav.push(['/kategori/gundem', 'Gündem', 'k:gundem']);
  const mag = esc(A.magaza_url || 'https://hasturkgubre.com.tr');
  const u = c.uye;
  const body = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tamBaslik)}</title><meta name="description" content="${esc(kirp(aciklama, 160))}">
${idx ? `<link rel="canonical" href="${esc(kanonik)}"><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">` : '<meta name="robots" content="noindex, nofollow">'}
<meta property="og:type" content="${tur}"><meta property="og:title" content="${esc(baslik || A.site_adi)}"><meta property="og:description" content="${esc(kirp(aciklama, 200))}"><meta property="og:url" content="${esc(kanonik)}"><meta property="og:image" content="${esc(og)}">${(() => { const d = gorselOlcu(og); return d ? `<meta property="og:image:width" content="${d[0]}"><meta property="og:image:height" content="${d[1]}">` : ''; })()}${gorselAlt ? `<meta property="og:image:alt" content="${esc(gorselAlt)}">` : ''}${makale ? `<meta property="article:published_time" content="${esc(makale.yayin)}"><meta property="article:modified_time" content="${esc(makale.guncel)}">${makale.bolum ? `<meta property="article:section" content="${esc(makale.bolum)}">` : ''}` : ''}<meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="${esc(A.site_adi || 'HasTürk Blog')}"><meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(A.site_adi)}" href="${L(c, '/feed.xml')}">
<link rel="icon" href="/blog-statik/fav/favicon.ico?v=2" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/blog-statik/fav/192.png?v=2"><link rel="apple-touch-icon" href="/blog-statik/fav/apple-touch-icon.png?v=2"><link rel="manifest" href="/blog-statik/site.webmanifest"><meta name="theme-color" content="#2e7d43">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/blog-statik/site.css?v=${SURUM}">
${[siteJsonLd(c), ...jsonld].filter(Boolean).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
${A.ga4 ? `<meta name="hb-ga" content="${esc(A.ga4)}">` : ''}${okunma ? `<meta name="hb-okunma" content="${okunma}">` : ''}
<script type="speculationrules">${JSON.stringify({ prefetch: [{ source: 'document', where: { and: [{ href_matches: (c.base || '') + '/*' }, ...['/panel*', '/git/*', '/b/*', '/api/*', '/cikis*', '/giris*', '/kayit*', '/hesabim*', '/dosya/*', '/*.xml', '/*.txt'].map((x) => ({ not: { href_matches: (c.base || '') + x } }))] }, eagerness: 'moderate' }] })}</script>
${A.gsc_dogrulama ? `<meta name="google-site-verification" content="${esc(A.gsc_dogrulama)}">` : ''}
</head><body>
<a class="sr" href="#icerik">İçeriğe geç</a>
<header class="head"><div class="wrap">
  <button type="button" class="menu-btn" data-ckm aria-label="Menüyü aç" aria-controls="ckm" aria-expanded="false">${IK('i-menu')}</button>
  <a class="logo" href="${L(c)}" aria-label="HasTürk Blog ana sayfa"><img src="/blog-statik/logo.webp" alt="HasTürk Gübre Blog" width="162" height="42"></a>
  <nav class="ust-nav" aria-label="Ana menü">
    <div class="un-oge"><button type="button" class="un-bas${aktif === 'kategoriler' ? ' on' : ''}" aria-haspopup="true">Kategoriler${IK('i-down')}</button><div class="un-acilir un-genis"><div class="un-izgara">${c.kat.filter((k) => !k.ust_id).map((k) => `<a href="${L(c, '/kategori/' + k.slug)}">${ph(k.gorsel)}<span>${esc(k.ad)}</span></a>`).join('')}</div><a class="un-tum" href="${L(c, '/kategoriler')}">Tüm kategoriler ${IK('i-arrow')}</a></div></div>
    ${menu.filter((k) => !k.ust_id).map((k) => { const alt = c.kat.filter((x) => x.ust_id === k.id); const on = aktif === 'k:' + k.slug || alt.some((x) => aktif === 'k:' + x.slug);
      // Ekim Takvimi menüsünde ayın bahçe takvimi ve 12 aylık takvim
      if (k.slug === 'ekim-takvimi') { const ay = trAy(); return `<div class="un-oge"><a class="un-bas${on || aktif === 'takvim' ? ' on' : ''}" href="${L(c, '/kategori/' + k.slug)}" aria-haspopup="true">${esc(k.ad)}${IK('i-down')}</a><div class="un-acilir"><a href="${L(c, '/bahce-takvimi/' + AY_SLUG[ay])}"><b>Bu ay: ${AY_AD[ay]} bahçe takvimi</b></a><a href="${L(c, '/bahce-takvimi/' + AY_SLUG[(ay + 1) % 12])}">${AY_AD[(ay + 1) % 12]} için hazırlık</a><a href="${L(c, '/bahce-takvimi')}">12 aylık bahçe takvimi</a>${alt.map((x) => `<a href="${L(c, '/kategori/' + x.slug)}">${esc(x.ad)}</a>`).join('')}<a href="${L(c, '/kategori/' + k.slug)}">Tüm ${esc(k.ad)} yazıları</a></div></div>`; }
      return alt.length ? `<div class="un-oge"><a class="un-bas${on ? ' on' : ''}" href="${L(c, '/kategori/' + k.slug)}" aria-haspopup="true">${esc(k.ad)}${IK('i-down')}</a><div class="un-acilir"><a href="${L(c, '/kategori/' + k.slug)}"><b>Tüm ${esc(k.ad)}</b></a>${alt.map((x) => `<a href="${L(c, '/kategori/' + x.slug)}">${esc(x.ad)}</a>`).join('')}</div></div>` : `<a class="un-bas${on ? ' on' : ''}" href="${L(c, '/kategori/' + k.slug)}">${esc(k.ad)}</a>`; }).join('')}
    <a class="un-bas${aktif === 'sc' ? ' on' : ''}" href="${L(c, '/soru-cevap')}">Soru-Cevap</a>
  </nav>
  <form class="search" role="search" method="get" action="${L(c, '/ara')}"><label class="sr" for="q">Blogda ara</label><input id="q" name="q" value="${esc(c.url.searchParams.get('q') || '')}" placeholder="Bitki bakımı, toprak, gübre… ne arıyorsunuz?" data-oneri autocomplete="off"><button aria-label="Ara">${IK('i-search')}</button></form>
  <div class="hr">
    <button type="button" class="ara-btn" data-ara aria-label="Blogda ara" aria-expanded="false">${IK('i-search')}</button>
    <a class="shop" href="${mag}" rel="noopener">${IK('i-cart')}<span><b>Mağaza</b></span></a>
    ${u ? `<a class="icon me" href="${L(c, '/hesabim')}" aria-label="Hesabım">${avatar(c, u.ad, renk(u.ad), u.foto)}</a>` : `<a class="uye-btn" href="${L(c, '/giris')}" data-giris>${IK('i-user')}<span>Giriş Yap</span></a>`}
  </div>
</div></header>
<div class="ckm" id="ckm" aria-hidden="true"><div class="ckm-ic" role="dialog" aria-modal="true" aria-label="Menü">
<div class="ckm-bas"><a href="${L(c)}"><img src="/blog-statik/logo.webp" alt="HasTürk Gübre Blog" width="124" height="32"></a><button type="button" class="ckm-x" data-ckm-kapat aria-label="Menüyü kapat">×</button></div>
${u ? `<a class="ckm-hesap" href="${L(c, '/hesabim')}">${avatar(c, u.ad, renk(u.ad), u.foto)}<span><b>${esc(u.ad)}</b><small>Hesabım</small></span>${IK('i-right')}</a>`
    : `<div class="ckm-uye"><p>Yorum yazmak ve soru sormak için giriş yapın.</p><div><a class="btn btn-g" href="${L(c, '/giris')}" data-giris>Giriş Yap</a><a class="btn btn-o" href="${L(c, '/kayit')}" data-giris>Üye Ol</a></div></div>`}
<nav class="ckm-nav" aria-label="Menü"><a href="${L(c)}"${aktif === 'ana' ? ' class="on"' : ''}>${IK('i-home')}Ana Sayfa</a><a href="${L(c, '/kategoriler')}"${aktif === 'kategoriler' ? ' class="on"' : ''}>${IK('i-grid')}Tüm Kategoriler</a><a href="${L(c, '/bahce-takvimi/' + AY_SLUG[trAy()])}"${aktif === 'takvim' ? ' class="on"' : ''}>${IK('i-cal')}Bahçe Takvimi</a><a href="${L(c, '/soru-cevap')}"${aktif === 'sc' ? ' class="on"' : ''}>${IK('i-chat')}Soru-Cevap</a>${gundem ? `<a href="${L(c, '/kategori/gundem')}"${aktif === 'k:gundem' ? ' class="on"' : ''}>${IK('i-news')}Gündem</a>` : ''}</nav>
<div class="ckm-bl">Kategoriler</div>
<nav class="ckm-kat" aria-label="Kategoriler">${c.kat.filter((k) => k.slug !== 'gundem' && !k.ust_id).map((k) => {
  const alt = c.kat.filter((x) => x.ust_id === k.id);
  const satir = `${ph(k.gorsel)}<span>${esc(k.ad)}</span>`;
  if (!alt.length) return `<a href="${L(c, '/kategori/' + k.slug)}"${aktif === 'k:' + k.slug ? ' class="on"' : ''}>${satir}${IK('i-right')}</a>`;
  const acik = aktif === 'k:' + k.slug || alt.some((x) => aktif === 'k:' + x.slug);
  return `<details class="ckm-grup"${acik ? ' open' : ''}><summary>${satir}${IK('i-down')}</summary><div class="ckm-alt-kat"><a href="${L(c, '/kategori/' + k.slug)}"${aktif === 'k:' + k.slug ? ' class="on"' : ''}>Tüm ${esc(k.ad)}</a>${alt.map((x) => `<a href="${L(c, '/kategori/' + x.slug)}"${aktif === 'k:' + x.slug ? ' class="on"' : ''}>${esc(x.ad)}</a>`).join('')}</div></details>`;
}).join('')}</nav>
<div class="ckm-cta"><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}">${IK('i-chat')}Soru Sor</a><a class="btn btn-o" href="${mag}" rel="noopener">${IK('i-cart')}HasTürk Mağaza</a></div>
<div class="ckm-alt"><a href="${L(c, '/hakkimizda')}">Hakkımızda</a><a href="${L(c, '/topluluk-kurallari')}">Topluluk Kuralları</a><a href="${L(c, '/gizlilik')}">Gizlilik ve KVKK</a><a href="${L(c, '/cerez-politikasi')}">Çerez Politikası</a></div>
</div></div>
<div id="icerik">${govde}</div>
<footer>
  <div class="wrap">
    <div><a class="logo" href="${L(c)}"><img src="/blog-statik/logo.webp" alt="HasTürk Gübre" width="150" height="39" style="height:40px"></a>
      <p class="about">HasTürk Blog; bitki bakımı, bahçe ipuçları, toprak rehberleri ve daha fazlasıyla doğa severlere yol gösteren bir içerik platformudur. HasTürk Mağaza'nın bir parçasıdır.</p>${sosyalBlok(A)}</div>
    <div><h4>Hızlı Erişim</h4><ul><li><a href="${L(c)}">Ana Sayfa</a></li><li><a href="${L(c, '/kategoriler')}">Kategoriler</a></li>${menu.slice(0, 3).map((k) => `<li><a href="${L(c, '/kategori/' + k.slug)}">${esc(k.ad)}</a></li>`).join('')}<li><a href="${L(c, '/soru-cevap')}">Soru-Cevap</a></li><li><a href="${L(c, '/yazarlar')}">Yazarlarımız</a></li><li><a href="${L(c, '/hakkimizda')}">Hakkımızda</a></li></ul></div>
    <div><h4>HasTürk Mağaza</h4><ul><li><a href="${mag}" rel="noopener">Tüm Ürünler</a></li><li><a href="${mag}/topraklar" rel="noopener">Topraklar</a></li><li><a href="${mag}/gubreler" rel="noopener">Gübreler</a></li><li><a href="${mag}/tohumlar" rel="noopener">Tohumlar</a></li><li><a href="${mag}/bahce-ekipmanlari" rel="noopener">Bahçe Ekipmanları</a></li><li><a href="${mag}/saksilar-ve-bahce-yataklari" rel="noopener">Saksılar</a></li></ul></div>
    <div><h4>Yardım</h4><ul><li><a href="${L(c, '/topluluk-kurallari')}">Topluluk Kuralları</a></li><li><a href="${L(c, '/gizlilik')}">Gizlilik ve KVKK</a></li><li><a href="${L(c, '/uyelik-sozlesmesi')}">Üyelik Sözleşmesi</a></li><li><a href="${L(c, '/cerez-politikasi')}">Çerez Politikası</a></li>${A.ga4 ? '<li><button type="button" class="lnk-f" data-cerez-ayar>Çerez Tercihleri</button></li>' : ''}<li><a href="${L(c, '/feed.xml')}">RSS</a></li></ul></div>
    <div class="deco"><span class="hand">Daha yeşil<br>bir gelecek için…</span>${ph('/blog-statik/foto/kat-bitki.webp')}</div>
  </div>
  <div class="copy"><div class="wrap"><span>© ${new Date().getFullYear()} HasTürk Blog. Tüm hakları saklıdır. | HasTürk Mağaza'nın bir içerik platformudur.</span><span class="gelistiren">Designed &amp; Developed by <a href="https://hasturkcrm.com/" target="_blank" rel="noopener">HasTürk CRM Sistemleri</a></span><span>Doğayı sev, birlikte büyütelim. ${IK('i-leaf')}</span></div></div>
</footer>
${u || girisYok ? '' : `<div class="gpen" id="gpen" role="dialog" aria-modal="true" aria-label="Giriş yap ya da üye ol">${girisKart(c, 'giris', '', {}, true)}</div>`}
${A.ga4 ? `<div class="cerez" id="cerez" role="region" aria-label="Çerez tercihi" hidden><p>Sitemizi nasıl kullandığınızı anlamak ve geliştirmek için Google Analytics ölçüm çerezlerini kullanıyoruz. İstemiyorsanız reddedebilirsiniz; tercihiniz tarayıcınızda saklanır. <a href="${L(c, '/cerez-politikasi')}">Çerez Politikası</a></p><div><button type="button" class="btn btn-o" data-cerez="hayir">Reddet</button><button type="button" class="btn btn-g" data-cerez="evet">Tamam</button></div></div>` : ''}
<script src="/blog-statik/site.js?v=${SURUM}" defer></script>
${UA_BETIK(mag)}
</body></html>`;
  return html(body, { status: durum, noindex: !idx });
}

// Site altındaki sosyal medya simgeleri (panelde boş bırakılan hesap gösterilmez)
function sosyalBlok(A) {
  const h = sosyalHesaplar(A);
  if (!h.length) return '';
  return `<p class="soc-bas">Bizi takip edin</p><div class="soc">${h.map((s) => `<a href="${esc(s.link)}" target="_blank" rel="noopener me" aria-label="HasTürk ${esc(s.ad)}" title="${esc(s.ad)}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${s.svg}</svg></a>`).join('')}</div>`;
}

// ---------- Ana sayfa ----------
// ---------- Bahçe Takvimi: /bahce-takvimi ve /bahce-takvimi/<ay> ----------
const ayDeseni = (i) => (t) => AY_DESEN[i].test(norm(t));
// Takvimdeki bir işe uygun yazı: aranan kelimelerin hepsi başlıkta geçmeli (kelime kökü sıkı: "kasımpatı" ≠ "kasım");
// mevsime ters düşen yazı (mayısta "kışın…", aralıkta "yazın…") bağlanmaz. Uygun yazı yoksa iş bağlantısız gösterilir.
const SIKI_KOK = (w) => (w.length >= 6 ? w.slice(0, Math.max(5, w.length - 2)) : w);
// Mevsim kelimeleri ve geçerli oldukları aylar (0 = ocak): başlıkta mevsim geçen yazı yalnız o aylarda bağlanır
const MEVSIM_KEL = [
  [/\b(sonbahar\w*|guz\w*)\b/, [7, 8, 9, 10]],
  [/\b(ilkbahar\w*|bahar\w*)\b/, [1, 2, 3, 4]],
  [/\b(kisa hazir\w*|kisa girerken)\b/, [8, 9, 10]],
  [/\b(kis|kisin|kislik|kislatma|kisi)\b/, [9, 10, 11, 0, 1]],
  [/\b(yaz|yazin|yazlik)\b/, [4, 5, 6, 7]],
  [/\bhasat sonrasi\b/, [8, 9, 10, 11, 0]],
];
// Konu belirtmeyen başlık kelimeleri: yazının asıl konusu ilk "anlamlı" kelimesidir (ör. "Nar Ağacı Bakımı" → nar)
const GENEL_BASLIK = new Set('saksida bahcede evde balkonda serada kisin yazin ilkbaharda sonbaharda bitkiler bitki bitkileri ne nasil neden hangi dogru kolay adim yeni ilk en kucuk buyuk ev'.split(' '));
const KOK4 = (w) => w.slice(0, 4);
// Takvimdeki bir işe uygun yazı: aranan kelimelerin hepsi başlıkta geçmeli (kelime kökü sıkı: "kasımpatı" ≠ "kasım"); başlığında başka ay adı ya da
// mevsimine ters bir kelime geçen yazı ve asıl konusu (başlıktaki ilk anlamlı kelime) işte geçmeyen yazı bağlanmaz. Uygun yazı yoksa iş bağlantısız gösterilir.
async function takvimYazi(c, x, ay) {
  const r = satir(x), ara = r.ara;
  const kel = norm(ara).split(' ').filter((w) => w.length >= 2 && !['ve', 'ile', 'icin', 'ne'].includes(w));
  const isKok = new Set(norm([r.is, r.not, ara].join(' ')).split(' ').filter((w) => w.length >= 3).map(KOK4));
  const aday = await yaziAra(c.db, ara, { n: 12, siki: true });
  return aday.find((y) => yaziUygun(y.baslik, ay, kel, isKok, norm(ara))) || null;
}
function yaziUygun(baslik, ay, kel, isKok, araN = '') {
  const b = norm(baslik);
  if (kel && !kel.every((w) => b.startsWith(SIKI_KOK(w)) || b.includes(' ' + SIKI_KOK(w)))) return false;
  if (AY_DESEN.some((re, i) => i !== ay && re.test(b))) return false;
  // "Ekim-Kasım Rehberi" gibi ay adı tek başına geçen başlıklar (ekim ve aralık iki anlamlı olduğu için hariç)
  const AYK = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', '', 'kasim', ''];
  if (ay >= 0 && AYK.some((k, i) => k && i !== ay && new RegExp('\\b' + k + '\\b').test(b))) return false;
  if (ay >= 0) for (const [re, aylar] of MEVSIM_KEL) if (re.test(b) && !re.test(araN) && !aylar.includes(ay) && !MEVSIM_KEL.some(([re2, a2]) => re2 !== re && re2.test(b) && a2.includes(ay))) return false;
  if (isKok) {
    const ilk = norm(baslik.split(/[:?]/)[0]).split(' ').find((w) => w.length >= 3 && !GENEL_BASLIK.has(w));
    if (ilk && !isKok.has(KOK4(ilk))) return false;
  }
  return true;
}
// Bir ayın sebze durumu (çizelgeden): her sebze için ılık ve iç bölgede bu ay yapılan iş (t: fide hazırlığı, d: ekim/dikim, h: hasat)
const durum_ = (b, m) => ['t', 'd', 'h'].filter((k) => (b[k] || []).includes(m));
function ayCizelge(ay) {
  return CIZELGE.map(([ad, ara, il, ic]) => ({ ad, ara, il: durum_(il, ay + 1), ic: durum_(ic, ay + 1), b: SEBZE_BILGI[ad] || [] })).filter((x) => x.il.length || x.ic.length);
}
const listele = (l, n = 7) => { const a = l.slice(0, n); return a.length > 1 ? a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1] : a[0] || ''; };
const kucukHarf = (s) => s.toLocaleLowerCase('tr-TR');
const DURUM_AD = { t: 'Fide hazırlığı', d: 'Ekim / dikim', h: 'Hasat' };
// Tabloda önce bu ay ekilenler, sonra fidesi hazırlananlar, sonra yalnız hasat edilenler
const sira_ = (x) => (x.il.includes('d') || x.ic.includes('d') ? 0 : x.il.includes('t') || x.ic.includes('t') ? 1 : 2);
const BOLUM_ISIM = { fidan: 'meyve ağaçlarında ve fidanlarda', cicek: 'çiçek bahçesinde', saksi: 'saksı ve ev bitkilerinde', isler: 'bahçede' };
const BOLUM_KONU = { sebze: 'sebze ekimi fide tohum', fidan: 'meyve ağacı fidan budama', cicek: 'çiçek soğanı çiçek bakımı', saksi: 'saksı salon bitkisi', isler: 'bahçe işleri' };
const BOLUM_REHBER = { sebze: /sebze|ekilir|ekim|fide/, fidan: /fidan|meyve|ağaç|budama/, cicek: /çiçek/, saksi: /saksı|salon|ev bitki/, isler: /yapılacak|bahçe işleri|bahçede/ };
const bolumUrl = (c, ay, k) => L(c, '/bahce-takvimi/' + AY_SLUG[ay] + (k ? '/' + BOLUM_SLUG[k] : ''));
const isId = (x) => 'is-' + slugYap(satir(x).is).slice(0, 40);

// Bu ay ekilebilecek / fidesi hazırlanabilecek sebzelerin mağazadaki tohumları (her sebzeden bir; stokta olanlar)
function ayTohumlari(U, ay, n = 8) {
  const out = [], kul = new Set(), yedek = [];
  for (const x of ayCizelge(ay).filter((x) => x.il.includes('d') || x.ic.includes('d') || x.il.includes('t') || x.ic.includes('t'))) {
    const kelime = (x.b[3] || kucukHarf(x.ad)).replace('kabak', 'kaba[kğ]');
    const re = new RegExp('(^|[^a-zçğıöşü])(' + kelime + ')', 'i');
    const aday = U.liste.filter((p) => p.uygun && p.tur === 'tohum' && !kul.has(p.s) && re.test(kucukHarf(p.n)) && !/çiçe|süs/.test(kucukHarf(p.n)))
      .sort((a, b) => (b.h || 0) - (a.h || 0) || a.p - b.p);
    if (aday[0]) { out.push(aday[0]); kul.add(aday[0].s); }
    if (aday[1]) yedek.push(aday[1]);
    if (out.length >= n) break;
  }
  // Sıra eksik kalmasın: gerekirse aynı sebzenin ikinci çeşidi
  for (const p of yedek) { if (out.length >= n || out.length % 4 === 0 && out.length >= 4) break; if (!kul.has(p.s)) { out.push(p); kul.add(p.s); } }
  return out.length > 4 ? out.slice(0, out.length - (out.length % 4)) : out;
}
// Bölüme uygun ürünler: sebzede önce bu ayın tohumları, diğerlerinde bölümün işlerine göre öneri
function bolumUrunleri(U, ay, k, n = 4) {
  const t = TAKVIM[ay];
  const tohum = k === 'sebze' ? ayTohumlari(U, ay, n > 4 ? n - 3 : 2).slice(0, n > 4 ? n - 3 : 2) : [];
  const yazi = { slug: 'takvim-' + ay + '-' + k, baslik: BOLUM_KONU[k], etiketler: t[k].map((x) => satir(x).is + ', ' + satir(x).ara).join(', '), ozet: t[k].map((x) => satir(x).not).join(', ') };
  // Kışın dinlenen saksı bitkilerine besin önerilmez (sayfadaki öğütle çelişmesin); sebzede tohumlar yukarıda ayrıca seçildi
  const kis = [10, 11, 0].includes(ay);
  const uyar = (p) => !(tohum.length && p.tur === 'tohum') && !(kis && k === 'saksi' && p.tur === 'besin') && p.tur !== 'yatak-ek';
  // Önce her işe en uygun bir ürün (fidan dikimi → fidan toprağı, budama → makas), sonra bölümün genel önerisi
  const secim = [], kurallar = new Set();
  for (const x of t[k]) {
    const r = satir(x), metin = kucukHarf(r.is + ' ' + r.not + ' ' + r.ara);
    for (const [isRe, urunRe, bolumler] of IS_URUN) {
      if (!isRe.test(metin) || (bolumler && !bolumler.includes(k)) || kurallar.has(urunRe)) continue;
      kurallar.add(urunRe);
      const p = U.liste.find((q) => q.uygun && q.st > 0 && urunRe.test(kucukHarf(q.n)) && !secim.includes(q) && !tohum.includes(q) && uyar(q));
      if (p) { if (!secim.some((q) => q.aile === p.aile)) secim.push(p); break; }
    }
  }
  // Boşluk dolduran öneride bitkiye özel ürün (orkide, ortanca toprağı…) olmaz; onlar yalnız işin kuralıyla gelir
  const diger = oneriler(U, yazi, { secili: secim.map((p) => p.s), n: n - tohum.length + 6, haric: tohum.map((p) => p.s) }).filter((p) => uyar(p) && (secim.includes(p) || !p.ozel));
  return [...tohum, ...diger].slice(0, n);
}
// Bölümün rehber yazıları: başlığında ay adı ve bölüm konusu geçenler önce, sonra işlere bağlanan yazılar
function bolumRehberleri(ay, k, hepsi, bag) {
  const ayY = hepsi.filter((y) => ayDeseni(ay)(y.baslik) && BOLUM_REHBER[k].test(kucukHarf(y.baslik))).sort((a, b) => b.yayin_ts - a.yayin_ts);
  const isY = TAKVIM[ay][k].map((x) => bag[x]).filter(Boolean);
  return [...new Map([...ayY, ...isY].map((y) => [y.id, y])).values()];
}
function bolgeSec(ad) {
  return `<div class="tka-bolge" role="radiogroup" aria-label="Bölge"><input type="radio" name="${ad}" id="${ad}-il" checked><label for="${ad}-il"><b>Ilık kıyılar</b><small>Akdeniz, Ege, Marmara</small></label><input type="radio" name="${ad}" id="${ad}-ic"><label for="${ad}-ic"><b>İç bölgeler</b><small>İç ve Doğu Anadolu</small></label></div>`;
}
// Ay sayfası ve bölüm sayfaları için ortak veri
async function takvimVeri(c, ay) {
  const t = TAKVIM[ay];
  const bag = {};
  await Promise.all(BOLUMLER.flatMap(([k]) => t[k].map(async (x) => { const y = await takvimYazi(c, x, ay); if (y) bag[x] = y; })));
  const [hepsi, sorular, U] = await Promise.all([tumYazilar(c.db), tumSorular(c.db), c.U()]);
  return { t, bag, hepsi, sorular: sorular.filter((x) => x.cevap_sayisi > 0 && ayDeseni(ay)(x.baslik)).sort((a, b) => (b.goruntulenme || 0) - (a.goruntulenme || 0)), U };
}
const isKart = (c, x, y, no) => {
  const r = satir(x);
  return `<li class="tka-is" id="${isId(x)}"><span class="tka-no">${no}</span><div class="tka-is-m"><h3>${esc(r.is)}</h3>${r.not ? `<span class="tka-not">${esc(r.not)}</span>` : ''}${r.detay ? `<p>${esc(r.detay)}</p>` : ''}${y ? `<a class="tka-rehber" href="${yaziUrl(c, y)}">${ph(y.gorsel, y.gorsel_alt || '')}<span><small>Adım adım rehber</small><b>${esc(y.baslik)}</b></span>${IK('i-right')}</a>` : ''}</div></li>`;
};

export async function takvimSayfa(c, slug, bolum) {
  if (!slug) return await takvimDizin(c);
  const ay = AY_SLUG.indexOf(slug);
  if (ay < 0) return null;
  if (bolum) { const k = Object.keys(BOLUM_SLUG).find((x) => BOLUM_SLUG[x] === bolum); return k ? await takvimBolum(c, ay, k) : null; }
  const simdi = trAy(), onceki = (ay + 11) % 12, sonraki = (ay + 1) % 12, m = MEVSIM[ay];
  const { t, bag, hepsi, sorular, U } = await takvimVeri(c, ay);
  const cz = ayCizelge(ay);
  const ekIl = cz.filter((x) => x.il.includes('d')), ekIc = cz.filter((x) => x.ic.includes('d'));
  // Bu ayın rehberleri: başlığında ay adı geçenler önce, sonra işlere bağlanan yazılar
  const ayY = hepsi.filter((y) => ayDeseni(ay)(y.baslik)).sort((a, b) => b.yayin_ts - a.yayin_ts);
  const yazi0 = [...new Map([...ayY, ...Object.values(bag)].map((y) => [y.id, y])).values()];
  const yazi = yazi0.slice(0, yazi0.length >= 6 ? 6 : yazi0.length >= 3 ? 3 : yazi0.length);
  const tohumlar = ayTohumlari(U, ay, 8);
  const bakim = [];
  for (const k of ['fidan', 'cicek', 'saksi', 'isler']) { const p = bolumUrunleri(U, ay, k, 2).find((q) => !bakim.includes(q) && !tohumlar.includes(q)); if (p) bakim.push(p); }
  const oncelik = BOLUMLER.slice(0, 4).map(([k]) => [k, t[k][0]]);
  const sutun = (bolge, tur, ad) => {
    const l = cz.filter((x) => x[bolge].includes(tur));
    return `<div class="tka-sut s-${tur}"><h3><i></i>${ad}<em>${l.length}</em></h3>${l.length ? `<div class="tka-cipler">${l.map((x) => `<a href="${bolumUrl(c, ay, 'sebze')}#tablo">${esc(x.ad)}</a>`).join('')}</div>` : '<p>Bu ay yok</p>'}</div>`;
  };
  // Başlık "takvim" odaklı: "X ayında ne ekilir / bahçede yapılacaklar" aramaları aylık yazıların, bu sayfa takvimin
  const baslik = `${AY_AD[ay]} Bahçe Takvimi: Sebze, Fidan, Çiçek ve Saksı Bitkileri`;
  const aciklama = `${AY_AD[ay]} bahçe takvimi: bu ay ekilen sebzeler, dikilen fidanlar, çiçek ve saksı bitkisi bakımı ve bahçe işleri tek listede; bölgeye göre farklar ve ayrıntılı rehberler.`;
  const yol = '/bahce-takvimi/' + slug;
  const govde = `<main class="tka">
<section class="tka-hero m${m}"><div class="wrap">
<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <a href="${L(c, '/bahce-takvimi')}">Bahçe Takvimi</a> › <span>${AY_AD[ay]}</span></div>
<div class="tka-hero-ic"><div class="tka-hero-m">
<span class="tk-etiket">${IK('i-cal')}Bahçe Takvimi · ${MEVSIM_AD[m]}${ay === simdi ? ' · Bu ay' : ''}</span>
<h1>${esc(AY_AD[ay])} Bahçe Takvimi</h1>
<p class="tka-giris">${esc(t.giris)}</p>
<div class="tka-btn"><a class="btn btn-g" href="${bolumUrl(c, ay, 'sebze')}">${IK('i-leaf')}${esc(AY_AD[ay])} sebze takvimi</a><a class="btn btn-o" href="#oncelik">Bu ayın öncelikleri</a></div>
</div><figure class="tka-foto">${ph(AY_GORSEL[ay], AY_AD[ay] + ' ayında bahçe')}</figure></div>
<div class="tka-veri">
<div><span>${IK('i-sun')}Dönem</span><b>${esc(AY_DONEM[ay])}</b></div>
<div><span>${IK('i-clock')}Gün uzunluğu</span><b>≈ ${String(AY_GUN[ay]).replace('.', ',')} saat</b></div>
<div><span>${IK('i-leaf')}Ilık kıyılarda ekim</span><b>${ekIl.length ? ekIl.length + ' sebze' : 'Açık alanda yok'}</b></div>
<div><span>${IK('i-leaf')}İç bölgelerde ekim</span><b>${ekIc.length ? ekIc.length + ' sebze' : 'Açık alanda yok'}</b></div>
</div></div></section>
<div class="wrap tka-ic">
<nav class="tk-aylar" aria-label="Aylar">${AY_SLUG.map((x, i) => `<a href="${L(c, '/bahce-takvimi/' + x)}"${i === ay ? ' class="on" aria-current="page"' : ''}>${AY_AD[i]}${i === simdi ? '<i></i>' : ''}</a>`).join('')}</nav>
<section class="tka-blok" id="oncelik"><div class="tka-bb"><h2>${esc(AY_AD[ay])} ayının öncelikleri</h2><p>Bu ay ertelenmemesi gereken dört iş</p></div>
<ol class="tka-oncelik">${oncelik.map(([k, x], i) => { const r = satir(x), b = BOLUMLER.find((z) => z[0] === k); return `<li><a href="${bolumUrl(c, ay, k)}#${isId(x)}"><span class="tka-no">${i + 1}</span><small>${IK(b[2])}${esc(BOLUM_SAYFA[k][2])}</small><b>${esc(r.is)}</b><em>${esc(r.not)}</em></a></li>`; }).join('')}</ol></section>
<section class="tka-blok tka-ne"><div class="tka-bb"><h2>${esc(AY_DA[ay])} toprağa ne girer?</h2><p>Bölgenizi seçin: bu ay ekilen, fidesi hazırlanan ve hasat edilen sebzeler</p></div>
${bolgeSec('ne')}
<div class="tka-sutun b-il">${sutun('il', 'd', 'Ekim ve dikim')}${sutun('il', 't', 'Fide hazırlığı (içeride)')}${sutun('il', 'h', 'Hasat')}</div>
<div class="tka-sutun b-ic">${sutun('ic', 'd', 'Ekim ve dikim')}${sutun('ic', 't', 'Fide hazırlığı (içeride)')}${sutun('ic', 'h', 'Hasat')}</div>
<a class="tka-devam" href="${bolumUrl(c, ay, 'sebze')}#tablo">Yöntem, dikim aralığı ve hasat süresiyle ${esc(AY_AD[ay])} sebze tablosu ${IK('i-arrow')}</a></section>
<section class="tka-blok"><div class="tka-bb"><h2>${esc(AY_AD[ay])} takvimi, bölüm bölüm</h2><p>Her bölümün ayrı sayfasında işlerin nasıl yapılacağı, rehberler ve ürünler</p></div>
<div class="tka-bolumler">${BOLUMLER.map(([k, ad, ik]) => `<a class="tka-bol k-${k}" id="${k}" href="${bolumUrl(c, ay, k)}"><div class="tka-bol-bas"><span class="tka-ik">${IK(ik)}</span><div><h3>${esc(AY_DA[ay])} ${esc(kucukHarf(ad))}</h3><small>${t[k].length} iş${k === 'sebze' ? ' · ' + cz.length + ' sebze tabloda' : ''}</small></div></div><ul>${t[k].map((x) => `<li><b>${esc(satir(x).is)}</b><span>${esc(satir(x).not)}</span></li>`).join('')}</ul><span class="tka-git">${esc(BOLUM_SAYFA[k][2])} sayfası ${IK('i-arrow')}</span></a>`).join('')}</div></section>
${tohumlar.length >= 3 ? `<section class="tka-blok tka-urun"><div class="tka-bb"><h2>${esc(AY_DA[ay])} ekebileceğiniz tohumlar</h2><p>Bu ay ekimi ya da fide hazırlığı yapılan sebzelerin HasTürk Mağaza'daki tohumları</p></div><div class="tka-urunler">${tohumlar.map((p) => kartPm(U, c.base, p, 'takvim-tohum-' + slug)).join('')}</div></section>` : ''}
${yazi.length ? `<section class="tka-blok"><div class="tka-bb"><h2>${esc(AY_AD[ay])} rehberleri</h2><p>Bu ayın işlerini adım adım anlatan yazılar</p></div><div class="posts">${yazi.map((y) => postKart(c, y)).join('')}</div></section>` : ''}
${sorular.length ? `<section class="tka-blok"><div class="tka-bb"><h2>${esc(AY_AD[ay])} ayında sorulanlar</h2><p>Bahçe severlerin soruları ve HasTürk ekibinin cevapları</p></div><div class="yn-sorular">${sorular.slice(0, 4).map((x) => soruKart(c, x, true)).join('')}</div><a class="tka-devam" href="${L(c, '/soru-cevap/sor')}">Sorunuzu sorun ${IK('i-arrow')}</a></section>` : ''}
${bakim.length ? `<section class="tka-blok tka-urun"><div class="tka-bb"><h2>${esc(AY_AD[ay])} bakımı için ürünler</h2><p>Fidan, çiçek, saksı ve bahçe işleri için</p></div><div class="tka-urunler">${bakim.map((p) => kartPm(U, c.base, p, 'takvim-' + slug)).join('')}</div></section>` : ''}
<p class="tk-not">${IK('i-sun')}Takvim Türkiye geneli içindir. Akdeniz, Ege ve Marmara kıyılarında işler 2–4 hafta erken, İç ve Doğu Anadolu'da 2–4 hafta geç yapılabilir; ekimden önce bölgenizin son don tarihine bakın.</p>
<div class="tk-gecis"><a href="${L(c, '/bahce-takvimi/' + AY_SLUG[onceki])}">${IK('i-left')}<span><small>Önceki ay</small><b>${AY_AD[onceki]}</b></span></a><a href="${L(c, '/bahce-takvimi/' + AY_SLUG[sonraki])}"><span><small>Sonraki ay</small><b>${AY_AD[sonraki]}</b></span>${IK('i-right')}</a></div>
</div></main>`;
  const tam_ = (p) => (c.A.site_url || '') + p;
  return sayfa(c, { baslik, seoBaslik: `${AY_AD[ay]} Bahçe Takvimi: Bölgelere Göre Ekim, Dikim ve Bakım`, aciklama, yol, gorsel: AY_GORSEL[ay], govde, aktif: 'takvim',
    jsonld: [kirintiJsonLd(c, [['Bahçe Takvimi', '/bahce-takvimi'], [AY_AD[ay], yol]]),
      { '@context': 'https://schema.org', '@type': 'Article', headline: baslik, description: aciklama, inLanguage: 'tr-TR', mainEntityOfPage: tam_(yol), image: [tam_(AY_GORSEL[ay])],
        author: { '@type': 'Organization', name: 'HasTürk Editör Ekibi', url: tam_('/hakkimizda') }, publisher: { '@type': 'Organization', name: 'HasTürk Gübre', url: c.A.magaza_url || 'https://hasturkgubre.com.tr' },
        about: BOLUMLER.map(([k, ad]) => ({ '@type': 'Thing', name: AY_DA[ay] + ' ' + kucukHarf(ad) })),
        hasPart: BOLUMLER.map(([k, ad]) => ({ '@type': 'ItemList', name: ad, url: tam_(yol + '/' + BOLUM_SLUG[k]), itemListElement: t[k].map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: satir(x).is + (satir(x).not ? ' (' + satir(x).not + ')' : '') })) })) }] });
}

// Bölüm sayfası: /bahce-takvimi/<ay>/<bölüm>
async function takvimBolum(c, ay, k) {
  const simdi = trAy(), onceki = (ay + 11) % 12, sonraki = (ay + 1) % 12, m = MEVSIM[ay];
  const { t, bag, hepsi, U } = await takvimVeri(c, ay);
  const [, ad, ik] = BOLUMLER.find((b) => b[0] === k);
  const yer = (s) => s.replace('{da}', AY_DA[ay]).replace('{ad}', AY_AD[ay]);
  const baslik = yer(BOLUM_SAYFA[k][0]), seoBaslik = yer(BOLUM_SAYFA[k][1]);
  const cz = ayCizelge(ay);
  const ad_ = (b, tur) => cz.filter((x) => x[b].includes(tur)).map((x) => x.ad);
  const giris = k === 'sebze'
    ? `${AY_DA[ay]} ılık kıyılarda ${ad_('il', 'd').length ? kucukHarf(listele(ad_('il', 'd'))) + ' toprağa girer' : 'açık alana ekim yapılmaz'}; iç bölgelerde ${ad_('ic', 'd').length ? kucukHarf(listele(ad_('ic', 'd'))) + ' ekilip dikilir' : 'açık alanda ekim yoktur, örtü altı ve planlama öne çıkar'}.${ad_('il', 'h').length ? ' Hasatta ' + kucukHarf(listele(ad_('il', 'h'), 5)) + ' var.' : ''}`
    : `${t.giris} Bu sayfada ${AY_AD[ay]} ayında ${BOLUM_ISIM[k]} yapılacakları, nasıl yapılacağını ve ilgili rehberleri bulursunuz.`;
  const rehberler = bolumRehberleri(ay, k, hepsi, bag);
  // Bu bölümün aylık yazısı (ör. "Kasım Ayında Hangi Fideler Dikilir?") varsa sayfanın başında "ayrıntılı rehber" olarak öne çıkar
  const anaRehber = rehberler.find((y) => ayDeseni(ay)(y.baslik) && BOLUM_REHBER[k].test(kucukHarf(y.baslik)));
  const urunler = bolumUrunleri(U, ay, k, k === 'sebze' ? 8 : 4);
  // Sık sorulanlar: çizelge ve işlerden üretilir (cevaplar sayfadaki bilgiyle aynı)
  const sss = [];
  if (k === 'sebze') {
    sss.push({ s: `${AY_AD[ay]} sebze takviminde ılık kıyılarla iç bölgeler arasında ne fark var?`, c: `Ilık kıyılarda (Akdeniz, Ege, Marmara) ${ad_('il', 'd').length ? kucukHarf(listele(ad_('il', 'd'), 12)) + ' ekilir ya da dikilir' : 'açık alana ekim yapılmaz'}. İç ve Doğu Anadolu'da ${ad_('ic', 'd').length ? kucukHarf(listele(ad_('ic', 'd'), 12)) + ' ekilir ya da dikilir' : 'açık alanda ekim yapılmaz; sera ve örtü altında yeşillik yetiştirilebilir'}.` });
    const h = [...new Set([...ad_('il', 'h'), ...ad_('ic', 'h')])];
    if (h.length) sss.push({ s: `${AY_AD[ay]} ayında hangi sebzeler hasat edilir?`, c: `${listele(h, 12)} ${AY_AD[ay]} ayında hasat edilebilir; ılık kıyılarda hasat iç bölgelerden daha erken başlar.` });
    const f = [...new Set([...ad_('il', 't'), ...ad_('ic', 't')])];
    if (f.length) sss.push({ s: `${AY_AD[ay]} ayında hangi sebzelerin fidesi hazırlanır?`, c: `${listele(f, 12)} için ${AY_AD[ay]} ayında içeride ya da örtü altında fide hazırlığı yapılır; fideler dikim zamanı gelince açık alana alınır.` });
  } else {
    // Soru takvim odaklı: "X ayında bahçede ne yapılır" araması aylık yazılarındır
    sss.push({ s: `${baslik} hangi işleri kapsar?`, c: t[k].map((x, i) => (i ? kucukHarf(satir(x).is.charAt(0)) + satir(x).is.slice(1) : satir(x).is) + (satir(x).not ? ' (' + satir(x).not + ')' : '')).join('; ') + '.' });
  }
  // Emir kipindeki işler ("Saksıları içeri alın") soruya çevrilmez; diğerleri "… için ne yapılır?" olur
  for (const x of t[k].filter((x) => satir(x).detay && !/[ıiuü]n$/.test(satir(x).is.trim())).slice(0, 3)) sss.push({ s: `${AY_DA[ay]} ${kucukHarf(satir(x).is)} için ne yapılır?`, c: satir(x).detay });
  const tablo = k === 'sebze' && cz.length ? `<section class="tka-blok" id="tablo"><div class="tka-bb"><h2>${esc(AY_AD[ay])} sebze tablosu</h2><p>Bu ay ekilen, fidesi hazırlanan ya da hasat edilen sebzeler; iki bölge için</p></div>
<div class="tka-lejant"><span class="s-d"><i></i>Ekim / dikim</span><span class="s-t"><i></i>Fide hazırlığı</span><span class="s-h"><i></i>Hasat</span></div>
<div class="tka-tablo"><table><thead><tr><th>Sebze</th><th>Ilık kıyılar</th><th>İç bölgeler</th><th>Yöntem</th><th>Dikim aralığı</th><th>Hasada süre</th></tr></thead><tbody>
${[...cz].sort((a, b) => sira_(a) - sira_(b)).map((x) => { const rozet = (l) => (l.length ? l.map((d) => `<span class="rz s-${d}">${DURUM_AD[d]}</span>`).join('') : '<span class="rz yok">—</span>'); return `<tr><th>${esc(x.ad)}</th><td>${rozet(x.il)}</td><td>${rozet(x.ic)}</td><td>${esc(x.b[0] || '')}</td><td>${esc(x.b[1] || '')}</td><td>${esc(x.b[2] || '')}</td></tr>`; }).join('')}
</tbody></table></div><p class="tka-dip">Aralık sıra üzeri mesafedir; süreler genel değerlerdir ve çeşide, toprağa, iklime göre değişir.</p></section>` : '';
  const yol = '/bahce-takvimi/' + AY_SLUG[ay] + '/' + BOLUM_SLUG[k];
  const aciklama = k === 'sebze' ? `${AY_AD[ay]} ayında hangi sebzeler ekilir, dikilir ve hasat edilir? Ilık kıyılar ve iç bölgeler için ${AY_AD[ay]} sebze takvimi: yöntem, dikim aralığı, hasat süresi.`
    : `${AY_AD[ay]} ayında ${BOLUM_ISIM[k]} yapılacaklar: ${kirp(t[k].map((x) => kucukHarf(satir(x).is)).join(', '), 110)}. Nasıl yapılır, rehberler ve ürünler.`;
  const govde = `<main class="tka">
<section class="tka-hero tka-hero-k m${m}"><div class="wrap">
<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <a href="${L(c, '/bahce-takvimi')}">Bahçe Takvimi</a> › <a href="${bolumUrl(c, ay)}">${AY_AD[ay]}</a> › <span>${esc(BOLUM_SAYFA[k][2])}</span></div>
<div class="tka-k-bas"><span class="tka-ik buyuk">${IK(ik)}</span><div><span class="tk-etiket">${IK('i-cal')}${esc(AY_AD[ay])} · ${esc(AY_DONEM[ay])}${ay === simdi ? ' · Bu ay' : ''}</span><h1>${esc(baslik)}</h1><p class="tka-giris">${esc(giris)}</p></div></div>
<nav class="tka-sek" aria-label="${esc(AY_AD[ay])} bölümleri"><a href="${bolumUrl(c, ay)}">${IK('i-cal')}${esc(AY_AD[ay])} özeti</a>${BOLUMLER.map(([kk, , ii]) => `<a href="${bolumUrl(c, ay, kk)}"${kk === k ? ' class="on" aria-current="page"' : ''}>${IK(ii)}${esc(BOLUM_SAYFA[kk][2])}</a>`).join('')}</nav>
</div></section>
<div class="wrap"><div class="layout tka-lay"><div class="col">
${anaRehber ? `<a class="tka-ana-rehber" href="${yaziUrl(c, anaRehber)}">${ph(anaRehber.gorsel, anaRehber.gorsel_alt || '')}<span><small>${IK('i-doc')}Ayrıntılı rehber</small><b>${esc(anaRehber.baslik)}</b>${anaRehber.ozet ? `<em>${esc(kirp(anaRehber.ozet, 150))}</em>` : ''}</span>${IK('i-arrow')}</a>` : ''}
${tablo}
<section class="tka-blok" id="isler"><div class="tka-bb"><h2>${k === 'sebze' ? 'Bu ayın sebze işleri' : esc(AY_DA[ay]) + ' yapılacaklar'}</h2><p>Ne yapılır, nasıl yapılır ve adım adım rehberi</p></div>
<ol class="tka-isler">${t[k].map((x, i) => isKart(c, x, bag[x], i + 1)).join('')}</ol></section>
${urunler.length ? `<section class="tka-blok tka-urun"><div class="tka-bb"><h2>${k === 'sebze' ? esc(AY_DA[ay]) + ' ekebileceğiniz tohumlar ve ürünler' : 'Bu işler için ürünler'}</h2><p>HasTürk Mağaza'da</p></div><div class="tka-urunler">${urunler.map((p) => kartPm(U, c.base, p, 'takvim-' + AY_SLUG[ay] + '-' + k)).join('')}</div></section>` : ''}
${sss.length ? `<section class="tka-blok"><div class="tka-bb"><h2>Sık sorulanlar</h2></div><div class="tka-sss">${sss.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.s)}</summary><p>${esc(q.c)}</p></details>`).join('')}</div></section>` : ''}
${rehberler.filter((y) => y !== anaRehber).length ? `<section class="tka-blok"><div class="tka-bb"><h2>${esc(AY_AD[ay])} rehberleri</h2><p>${esc(BOLUM_SAYFA[k][2])} için ayrıntılı yazılar</p></div><div class="posts">${(() => { const l = rehberler.filter((y) => y !== anaRehber); return l.slice(0, l.length >= 6 ? 6 : l.length >= 3 ? 3 : l.length); })().map((y) => postKart(c, y)).join('')}</div></section>` : ''}
<div class="tk-gecis"><a href="${bolumUrl(c, onceki, k)}">${IK('i-left')}<span><small>Önceki ay</small><b>${esc(BOLUM_SAYFA[k][0].replace('{da}', AY_DA[onceki]).replace('{ad}', AY_AD[onceki]))}</b></span></a><a href="${bolumUrl(c, sonraki, k)}"><span><small>Sonraki ay</small><b>${esc(BOLUM_SAYFA[k][0].replace('{da}', AY_DA[sonraki]).replace('{ad}', AY_AD[sonraki]))}</b></span>${IK('i-right')}</a></div>
</div>
<aside class="side">
<div class="box tka-yan"><h3>${IK('i-cal')}${esc(AY_AD[ay])} bölümleri</h3><a href="${bolumUrl(c, ay)}">${esc(AY_AD[ay])} özeti</a>${BOLUMLER.map(([kk, aa]) => `<a href="${bolumUrl(c, ay, kk)}"${kk === k ? ' class="on"' : ''}>${esc(BOLUM_SAYFA[kk][0].replace('{ad}', AY_AD[ay]))}<em>${t[kk].length}</em></a>`).join('')}</div>
<div class="box"><h3>${IK(ik)}${esc(BOLUM_SAYFA[k][2])}: diğer aylar</h3><div class="tk-mini">${AY_SLUG.map((x, i) => `<a href="${bolumUrl(c, i, k)}"${i === ay ? ' class="on"' : ''}>${AY_AD[i]}</a>`).join('')}</div></div>
${bulten(c, true)}
</aside></div></div></main>`;
  const tam_ = (p) => (c.A.site_url || '') + p;
  return sayfa(c, { baslik, seoBaslik: seoBaslik + ' | Bahçe Takvimi', aciklama, yol, gorsel: AY_GORSEL[ay], govde, aktif: 'takvim',
    jsonld: [kirintiJsonLd(c, [['Bahçe Takvimi', '/bahce-takvimi'], [AY_AD[ay], '/bahce-takvimi/' + AY_SLUG[ay]], [BOLUM_SAYFA[k][2], yol]]),
      { '@context': 'https://schema.org', '@type': 'Article', headline: seoBaslik, description: aciklama, inLanguage: 'tr-TR', mainEntityOfPage: tam_(yol), image: [tam_(AY_GORSEL[ay])],
        author: { '@type': 'Organization', name: 'HasTürk Editör Ekibi', url: tam_('/hakkimizda') }, publisher: { '@type': 'Organization', name: 'HasTürk Gübre', url: c.A.magaza_url || 'https://hasturkgubre.com.tr' },
        hasPart: { '@type': 'ItemList', name: baslik, itemListElement: t[k].map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: satir(x).is, url: tam_(yol) + '#' + isId(x) })) } },
      ...(sss.length ? [sssJsonLd(sss)] : [])] });
}
// Yıl çarkı: 12 ay mevsim renkli dilimler (Ocak üstte, saat yönünde); içinde bulunulan ay koyu yeşil, her dilim ay sayfasına bağlanır
function yilCarki(c, simdi) {
  const R = 150, r = 66, cx = 160, cy = 160, nok = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)].map((v) => v.toFixed(1)).join(' ');
  return `<svg class="tk-cark" viewBox="0 0 320 320" role="img" aria-label="12 aylık bahçe takvimi çarkı">${AY_AD.map((ad, i) => {
    const a0 = (i / 12) * 2 * Math.PI - Math.PI / 2 - Math.PI / 12, a1 = a0 + (2 * Math.PI) / 12, am = (a0 + a1) / 2;
    const d = `M ${nok(a0, R)} A ${R} ${R} 0 0 1 ${nok(a1, R)} L ${nok(a1, r)} A ${r} ${r} 0 0 0 ${nok(a0, r)} Z`;
    return `<a href="${L(c, '/bahce-takvimi/' + AY_SLUG[i])}" aria-label="${AY_AD[i]} bahçe takvimi"><path d="${d}" class="m${MEVSIM[i]}${i === simdi ? ' on' : ''}"/><text x="${nok(am, (R + r) / 2).split(' ')[0]}" y="${nok(am, (R + r) / 2).split(' ')[1]}" class="${i === simdi ? 'on' : ''}">${ad.slice(0, 3)}</text></a>`;
  }).join('')}<circle cx="${cx}" cy="${cy}" r="${r - 6}" class="ic"/><text x="${cx}" y="${cy - 8}" class="ic1">Bu ay</text><text x="${cx}" y="${cy + 16}" class="ic2">${AY_AD[simdi]}</text></svg>`;
}
async function takvimDizin(c) {
  const simdi = trAy();
  const sira = [...Array(12).keys()].map((i) => (simdi + i) % 12);
  const bag = {};
  await Promise.all(CIZELGE.map(async ([ad, ara]) => { const y = await takvimYazi(c, ad + '||' + ara, -1); if (y) bag[ad] = y; }));
  const hucre = (o, ay) => { const k = ['t', 'd', 'h'].filter((x) => (o[x] || []).includes(ay)); return k.map((x) => `<i class="c-${x}"></i>`).join(''); };
  const ayK = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const govde = `<main class="wrap"><div class="col" style="gap:26px">
<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>Bahçe Takvimi</span></div>
<section class="tk-yil"><div class="tk-yil-m"><span class="tk-etiket">${IK('i-cal')}Bahçe Takvimi · 12 Ay</span><h1>Ne zaman ekilir, ne zaman dikilir?</h1>
<p>Türkiye'nin iklimine göre hazırlanmış ay ay bahçe takvimi. Çarktan bir ay seçin ya da aşağıdaki çizelgeden sebzenizin ekim ve hasat zamanını bulun.</p>
<div class="tk-yil-b"><a class="btn btn-g" href="${L(c, '/bahce-takvimi/' + AY_SLUG[simdi])}">${AY_AD[simdi]} takvimi ${IK('i-arrow')}</a><a class="btn btn-o" href="${L(c, '/bahce-takvimi/' + AY_SLUG[(simdi + 1) % 12])}">${AY_AD[(simdi + 1) % 12]} için hazırlık</a></div>
<div class="tk-mevsim">${MEVSIM_AD.map((m, i) => `<span><i class="m${i}"></i>${m}</span>`).join('')}</div></div>
${yilCarki(c, simdi)}</section>
<section class="tk-cz-k" id="cizelge"><div class="sh"><div><h2>${IK('i-grid')}Sebze ekim ve hasat çizelgesi</h2><p>Bölgenizi seçin; renkli kutular o ayda yapılacak işi gösterir</p></div></div>
<input type="radio" name="bolge" id="b-ilik" class="sr" checked><input type="radio" name="bolge" id="b-ic" class="sr">
<div class="tk-bolge" role="radiogroup" aria-label="Bölge"><label for="b-ilik">Ilık kıyılar <small>Akdeniz, Ege, Marmara</small></label><label for="b-ic">İç bölgeler <small>İç ve Doğu Anadolu</small></label></div>
<div class="tk-lejant"><span><i class="c-t"></i>Fide hazırlığı (içeride tohum)</span><span><i class="c-d"></i>Ekim / dikim</span><span><i class="c-h"></i>Hasat</span></div>
<div class="tk-cz"><table><thead><tr><th>Sebze</th>${ayK.map((a, i) => `<th${i === simdi ? ' class="on"' : ''}><a href="${L(c, '/bahce-takvimi/' + AY_SLUG[i])}">${a}</a></th>`).join('')}</tr></thead><tbody>
${CIZELGE.map(([ad, , ilik, ic]) => `<tr><th>${bag[ad] ? `<a href="${yaziUrl(c, bag[ad])}">${esc(ad)}</a>` : esc(ad)}</th>${ayK.map((_, i) => `<td${i === simdi ? ' class="on"' : ''}><span class="b-ilik">${hucre(ilik, i + 1)}</span><span class="b-ic">${hucre(ic, i + 1)}</span></td>`).join('')}</tr>`).join('')}
</tbody></table></div>
<p class="tk-not">${IK('i-sun')}Çizelge yaklaşıktır; aynı bölge içinde de rakım ve yöne göre 2–4 haftalık fark olabilir. Ekimden önce bölgenizin son don tarihine bakın.</p></section>
<section><div class="sh"><div><h2>${IK('i-leaf')}Ay ay bahçe işleri</h2><p>Her ayın ekim, dikim, çiçek ve bakım listesi</p></div></div>
<div class="tk-aylar2">${sira.map((i) => `<a class="tk-ay2 m${MEVSIM[i]}${i === simdi ? ' on' : ''}" href="${L(c, '/bahce-takvimi/' + AY_SLUG[i])}"><div class="tk-ay2-b"><b>${AY_AD[i]}</b><span>${i === simdi ? 'Bu ay' : i === (simdi + 1) % 12 ? 'Gelecek ay' : MEVSIM_AD[MEVSIM[i]]}</span></div><p>${esc(kirp(TAKVIM[i].giris, 96))}</p><ul>${TAKVIM[i].sebze.slice(0, 3).map((x) => `<li>${esc(satir(x).is)}</li>`).join('')}</ul><em>Takvimi aç ${IK('i-arrow')}</em></a>`).join('')}</div></section>
</div></main>`;
  return sayfa(c, { baslik: 'Bahçe Takvimi: Ay Ay Ekim, Dikim ve Bakım', seoBaslik: 'Bahçe Takvimi: Ay Ay Ne Ekilir, Ne Dikilir? | HasTürk Blog', aciklama: 'Ay ay bahçe takvimi ve sebze ekim çizelgesi: hangi sebze ne zaman ekilir, ne zaman hasat edilir? Ilık kıyılar ve iç bölgeler için ayrı takvim.', yol: '/bahce-takvimi', gorsel: AY_GORSEL[simdi], govde, aktif: 'takvim',
    jsonld: [kirintiJsonLd(c, [['Bahçe Takvimi', '/bahce-takvimi']]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Bahçe Takvimi', url: (c.A.site_url || '') + '/bahce-takvimi', inLanguage: 'tr-TR',
      mainEntity: { '@type': 'ItemList', itemListElement: AY_SLUG.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: (c.A.site_url || '') + '/bahce-takvimi/' + x, name: AY_AD[i] + ' bahçe takvimi' })) } }] });
}

export async function anaSayfa(c) {
  let one = await oneCikanlar(c);
  const son0 = await yazilar(c, "AND y.tur = 'yazi'", [], 'ORDER BY y.yayin_ts DESC LIMIT 20');
  if (one.length < VITRIN_ADET) one = one.concat(son0.filter((y) => !one.some((o) => o.id === y.id))).slice(0, VITRIN_ADET);
  const son = son0.filter((y) => !one.some((o) => o.id === y.id)).slice(0, 8);
  const gundem = await yazilar(c, "AND y.tur = 'gundem'", [], 'ORDER BY y.yayin_ts DESC LIMIT 3');
  const pop = await yazilar(c, '', [], 'ORDER BY y.okunma DESC, y.yayin_ts DESC LIMIT 6');
  const sorular = (await c.db.prepare(`SELECT s.*, u.ad uad, u.rol urol, u.foto ufoto, k.ad kad, ${CEVAP_ONIZLEME} FROM b_soru s JOIN b_uye u ON u.id = s.uye_id LEFT JOIN b_kategori k ON k.id = s.kategori_id${CEVAP_JOIN} WHERE s.durum = 'onayli' ORDER BY s.ts DESC LIMIT 4`).all()).results;
  const scSay = await c.db.prepare("SELECT COUNT(*) n, SUM(CASE WHEN cozum_id IS NOT NULL THEN 1 ELSE 0 END) z FROM b_soru WHERE durum = 'onayli'").first();
  const katSay = Object.fromEntries((await c.db.prepare(`SELECT kategori_id k, COUNT(*) n FROM b_yazi WHERE ${YAYINDA} GROUP BY kategori_id`).bind(Date.now()).all()).results.map((r) => [r.k, r.n]));
  const vitrin = c.kat.filter((k) => k.vitrin && !k.ust_id && k.slug !== 'gundem').slice(0, 8);
  const { U, list, cok } = await encokSatanlar(c, 4);
  const b2 = await banner(c, 'B2');
  const slayt = one.slice(0, VITRIN_SLAYT), yan = one.slice(VITRIN_SLAYT, VITRIN_ADET), ana = slayt[0];
  const hizli = c.kat.filter((k) => k.menude && !k.ust_id).slice(0, 5);
  const govde = `<main class="yn">
<div class="wrap">${flash(c)}
<section class="yn-giris"><div class="yn-giris-m"><span class="yn-ust">${IK('i-leaf')}HasTürk Blog</span><h1>Bitkiniz, toprağınız ve bahçeniz için pratik rehber</h1><p>Bitki bakımından gübrelemeye, ekim takviminden toprak hazırlığına; HasTürk ekibinin hazırladığı uygulamalı bilgiler ve bahçe severlerin soru-cevap topluluğu.</p>
<form class="yn-ara" method="get" action="${L(c, '/ara')}" role="search">${IK('i-search')}<label class="sr" for="ynq">Blogda ara</label><input id="ynq" name="q" placeholder="Örn. limon yaprakları sararıyor, solucan gübresi…" data-oneri autocomplete="off"><button class="btn btn-g">Ara</button></form>
<div class="yn-hizli"><span>Popüler:</span>${hizli.map((k) => `<a href="${L(c, '/kategori/' + k.slug)}">${esc(k.ad)}</a>`).join('')}<a href="${L(c, '/soru-cevap')}">Soru-Cevap</a></div></div>
<div class="yn-giris-s"><a class="yn-say" href="${L(c, '/kategoriler')}"><b>${binlik(Object.values(katSay).reduce((a, b) => a + b, 0))}</b><span>yazı</span></a><a class="yn-say" href="${L(c, '/soru-cevap')}"><b>${binlik(scSay.n || 0)}</b><span>cevaplı soru</span></a><a class="yn-say vurgu" href="${L(c, '/soru-cevap/sor')}">${IK('i-chat')}<span>Sorunuzu sorun, ekibimiz cevaplasın</span></a></div></section>
${ana ? `<section class="yn-vitrin" aria-label="Öne çıkan yazılar"><div class="yn-slayt" data-slayt aria-roledescription="carousel"><div class="yn-iz" tabindex="0">${slayt.map((y, i) => `<a class="yn-buyuk" href="${yaziUrl(c, y)}" aria-roledescription="slide" aria-label="${i + 1} / ${slayt.length}"><img src="${esc(y.gorsel || '/blog-statik/foto/hero1.webp')}" alt="${esc(y.gorsel_alt || '')}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"><div class="yn-buyuk-in"><div class="yn-rozet">${y.kad ? `<span class="chip solid">${esc(y.kad)}</span>` : ''}<span class="yn-trend">${IK('i-fire')}Şu sıralar çok okunuyor</span></div>${i ? `<h3 class="yn-bh">${esc(y.baslik)}</h3>` : `<h2 class="yn-bh">${esc(y.baslik)}</h2>`}<p>${esc(kirp(y.ozet, 150))}</p>${meta(y)}</div></a>`).join('')}</div>
${slayt.length > 1 ? `<button type="button" class="yn-ok sol" data-yon="-1" aria-label="Önceki yazı">${IK('i-left')}</button><button type="button" class="yn-ok sag" data-yon="1" aria-label="Sonraki yazı">${IK('i-right')}</button><div class="yn-nokta">${slayt.map((_, i) => `<button type="button" data-git="${i}" aria-label="${i + 1}. yazı"${i ? '' : ' class="on"'}></button>`).join('')}</div>` : ''}</div>
${yan.length ? `<div class="yn-yan">${yan.map((y) => `<a class="yn-kucuk" href="${yaziUrl(c, y)}">${ph(y.gorsel, y.gorsel_alt || '')}<div>${y.kad ? `<span class="yn-kat">${esc(y.kad)}</span>` : ''}<h3>${esc(y.baslik)}</h3>${meta(y)}</div></a>`).join('')}</div>` : ''}</section>` : ''}
<section class="yn-bol"><div class="yn-bb"><h2>Konulara göz atın</h2><a class="more" href="${L(c, '/kategoriler')}">Tüm kategoriler ${IK('i-arrow')}</a></div>
<div class="yn-katlar">${vitrin.map((k) => `<a class="yn-katk" href="${L(c, '/kategori/' + k.slug)}">${ph(k.gorsel)}<span><b>${esc(k.ad)}</b><small>${katSay[k.id] || 0} yazı</small></span></a>`).join('')}</div></section>
<section class="yn-bol"><div class="yn-bb"><h2>Son yazılar</h2><a class="more" href="${L(c, '/kategoriler')}">Tüm yazılar ${IK('i-arrow')}</a></div>
${son.length ? `<div class="yn-yazilar">${son.map((y) => postKart(c, y)).join('')}</div>` : '<div class="empty">Henüz yayınlanmış yazı yok.</div>'}</section>
</div>
${c.A.bolum_sorular === '0' ? '' : `<section class="yn-sc"><div class="wrap yn-sc-ic"><div class="yn-sc-m"><span class="yn-ust">${IK('i-chat')}Soru-Cevap</span><h2>Bitkinizde bir sorun mu var?</h2><p>Sorunuzu yazın; bahçe severler deneyimlerini paylaşsın, HasTürk ekibi cevaplasın.</p>
<div class="yn-sc-btn"><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}">${IK('i-plus')}Soru Sor</a><a class="btn btn-o" href="${L(c, '/soru-cevap')}">Tüm Sorular</a></div>
<ul class="yn-sc-adim"><li><b>1</b>Ücretsiz üye olun</li><li><b>2</b>Sorununuzu ve bitkinizi anlatın</li><li><b>3</b>Ekibimizden ve topluluktan cevap alın</li></ul></div>
<div class="yn-sc-l">${sorular.length ? sorular.map((s) => soruKart(c, s, true)).join('') : `<div class="empty">${IK('i-chat')}<p>Topluluk yeni açıldı. İlk soruyu siz sorun; ekibimiz cevaplasın.</p></div>`}</div></div></section>`}
<div class="wrap">
<section class="yn-bol yn-iki2">
<div class="yn-iki-ust${c.A.bolum_ay === '0' ? ' tek' : ''}">${c.A.bolum_ay === '0' ? '' : ayKutu(c)}<div class="box yn-rank"><h3>${IK('i-fire')}En çok okunanlar</h3>${rank(c, pop)}</div></div>
<div class="yn-magaza yn-magaza-g"><div class="yn-mg-bas">${ph(b2 ? b2.gorsel : '/blog-statik/foto/bahce-magaza.webp')}<div class="in"><span class="yn-ust">${IK('i-cart')}HasTürk Mağaza</span><h2>${esc(b2 ? b2.baslik : 'Bitkiniz için gereken her şey tek adreste')}</h2><p>${esc(b2 ? b2.alt || '' : 'Topraklar, gübreler, tohumlar, saksılar ve bahçe ekipmanları.')}</p><a class="btn btn-g" href="${b2 ? bannerLink(c, b2) : esc(c.A.magaza_url)}" rel="nofollow">${esc(b2 ? b2.dugme || 'Alışverişe Başla' : 'Alışverişe Başla')} ${IK('i-arrow')}</a></div></div>
${list.length ? `<div class="yn-urunler-k">${cok ? `<span class="yn-cs">${IK('i-fire')}Bu hafta en çok satanlar</span>` : ''}<div class="yn-urunler">${list.map((p) => kartPm(U, c.base, p, 'ana-cok-satan')).join('')}</div></div>` : ''}</div>
</section>
${gundem.length && c.A.bolum_gundem !== '0' ? `<section class="yn-bol"><div class="yn-bb"><h2>Gündem</h2><a class="more" href="${L(c, '/kategori/gundem')}">Tüm haberler ${IK('i-arrow')}</a></div>
<div class="yn-gundem">${gundem.map((y) => `<a class="yn-gk" href="${yaziUrl(c, y)}">${ph(y.gorsel, y.gorsel_alt || '')}<div><h3>${esc(y.baslik)}</h3><p>${esc(kirp(y.ozet, 110))}</p>${meta(y, false)}</div></a>`).join('')}</div></section>` : ''}
${c.A.bolum_bulten === '0' ? '' : `<section class="yn-bulten"><div><h2>${IK('i-mail')}Ayın bahçe takvimi e-postanıza gelsin</h2><p>Yeni yazılar ve mevsimin yapılacakları ayda birkaç e-postayla. İstediğiniz an ayrılabilirsiniz.</p></div>
<form method="post" action="${L(c, '/api/bulten')}"><input type="hidden" name="geri" value="${esc(c.url.pathname)}"><label class="sr" for="ynem">E-posta</label><input id="ynem" name="eposta" type="email" required placeholder="E-posta adresiniz" autocomplete="email"><button class="btn btn-g">Abone Ol</button><small>Abone olarak içerik duyurularını almayı onaylarsınız. <a href="${L(c, '/gizlilik')}">Aydınlatma Metni</a></small></form></section>`}
</div></main>`;
  return sayfa(c, { baslik: '', aciklama: 'Bitki bakımı, toprak rehberleri, gübreleme ve ekim takvimi. HasTürk Editör Ekibi\'nden pratik bahçe bilgileri ve bahçe severlerin soru-cevap topluluğu.', yol: '/', aktif: 'ana', govde });
}

// Ana sayfa vitrini haftada bir kendiliğinden değişir: son 14 günde en çok okunan yazılar ile en çok aranan konulara en
// uygun yazılar puanlanır (aramalar 3 kat ağırlıklı). Seçim veritabanına (b_ayar: vitrin_oto) yazılır; hafta dolana kadar
// aynı yazılar gösterilir, yeniden hesap yapılmaz. Yeterli veri yoksa elle "öne çıkan" işaretlenenler, sonra tüm
// zamanların en çok okunanları kullanılır. Yapay zekâ kullanılmaz; yalnız birkaç veritabanı sorgusudur.
const VITRIN_SURE = 7 * 86400000;
// Vitrin: kaydırılabilir alanda 7 yazı, yanında 3 yazı daha
const VITRIN_SLAYT = 7, VITRIN_ADET = 10;
async function oneCikanlar(c) {
  const kayit = c.A.vitrin_oto && typeof c.A.vitrin_oto === 'object' ? c.A.vitrin_oto : null;
  let ids = kayit && Date.now() - kayit.t < VITRIN_SURE && Array.isArray(kayit.ids) && kayit.ids.length >= VITRIN_ADET ? kayit.ids.map(Number).filter(Boolean) : null;
  if (!ids) {
    const d14 = new Date(Date.now() + 3 * 3600000 - 14 * 86400000).toISOString().slice(0, 10);
    const [ok, ar] = await Promise.all([
      c.db.prepare("SELECT x, SUM(n) n FROM b_istat WHERE k = 'okuma_y' AND d >= ? GROUP BY x ORDER BY n DESC LIMIT 60").bind(d14).all(),
      c.db.prepare("SELECT x, SUM(n) n FROM b_istat WHERE k = 'arama' AND d >= ? GROUP BY x ORDER BY n DESC LIMIT 25").bind(d14).all(),
    ]);
    const puan = new Map();
    for (const r of ok.results) puan.set(Number(r.x), (puan.get(Number(r.x)) || 0) + r.n);
    for (const r of ar.results) (await yaziAra(c.db, r.x, { n: 3, tur: 'yazi' })).forEach((y, i) => puan.set(y.id, (puan.get(y.id) || 0) + (r.n * 3) / (i + 1)));
    const aday = [...puan.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter(Boolean).slice(0, 30);
    let secim = [];
    if (aday.length) {
      const r = await yazilar(c, `AND y.tur = 'yazi' AND y.gorsel IS NOT NULL AND y.id IN (${aday.map(() => '?').join(',')})`, aday, 'LIMIT 30');
      secim = aday.map((id) => r.find((y) => y.id === id)).filter(Boolean).slice(0, VITRIN_ADET).map((y) => y.id);
    }
    if (secim.length < VITRIN_ADET) {
      const el = await yazilar(c, "AND y.one_cikan = 1 AND y.tur = 'yazi'", [], 'ORDER BY y.yayin_ts DESC LIMIT 4');
      const pop = await yazilar(c, "AND y.tur = 'yazi' AND y.gorsel IS NOT NULL", [], 'ORDER BY y.okunma DESC, y.yayin_ts DESC LIMIT 20');
      for (const y of [...el, ...pop]) if (secim.length < VITRIN_ADET && !secim.includes(y.id)) secim.push(y.id);
    }
    ids = secim;
    c.ctx.waitUntil(ayarYaz(c.db, 'vitrin_oto', { t: Date.now(), ids }).catch(() => {}));
  }
  if (!ids.length) return [];
  const r = await yazilar(c, `AND y.id IN (${ids.map(() => '?').join(',')})`, ids, 'LIMIT ' + VITRIN_ADET);
  return ids.map((id) => r.find((y) => y.id === id)).filter(Boolean);
}

// Soru listelerinde gösterilen cevap önizlemesi: çözüm cevabı, yoksa ekip cevabı, yoksa en çok oy alan cevap
const CEVAP_ONIZLEME = 'ca.metin cmetin, cu.ad cad, ca.ekip cekip';
const CEVAP_JOIN = ` LEFT JOIN b_cevap ca ON ca.id = COALESCE(s.cozum_id, (SELECT a2.id FROM b_cevap a2 WHERE a2.soru_id = s.id AND a2.durum = 'onayli' ORDER BY a2.ekip DESC, a2.oy DESC, a2.ts LIMIT 1)) LEFT JOIN b_uye cu ON cu.id = ca.uye_id`;
// Anonim (derleme) soran için harf yerine yaprak simgesi
const soranAv = (c, x) => (x.derleme ? `<span class="av av-anon" aria-hidden="true">${IK('i-leaf')}</span>` : avatar(c, x.uad, avR(x), x.ufoto));
function soruKart(c, x, kisa = false) {
  const durum = x.cozum_id ? `<span class="yq-d ok">${IK('i-check')}Çözüldü</span>` : x.cevap_sayisi ? `<span class="yq-d">${x.cevap_sayisi} cevap</span>` : '<span class="yq-d bek">Cevap bekliyor</span>';
  const cev = x.cmetin ? `<div class="yq-cev">${x.cekip ? `<span class="av av-ekip" aria-hidden="true">${IK('i-leaf')}</span>` : `<span class="av" style="background:${renk(x.cad)}">${esc(bas(x.cad))}</span>`}<div><b>${esc(x.cad)}${x.cekip ? ' <span class="yq-ekip">HasTürk Ekibi</span>' : ''}</b><p>${esc(kirp(duz(x.cmetin).replace(/(^|\s)[-•*]\s+/g, '$1').replace(/\s+/g, ' '), kisa ? 120 : 190))}</p></div></div>` : '';
  return `<a class="yq${kisa ? ' kisa' : ''}" href="${soruUrl(c, x)}"><div class="yq-ust">${x.kad ? `<span class="yq-kat">${esc(x.kad)}</span>` : ''}${durum}</div><h3>${esc(soruBaslikDuzelt(x.baslik))}</h3>${kisa ? '' : `<p class="yq-metin">${esc(kirp(soruMetinDuzelt(x.metin), 160))}</p>`}${cev}<div class="yq-alt">${soranAv(c, x)}<span>${esc(soran(x))}</span><span aria-hidden="true">·</span><span>${goreli(x.ts)}</span>${x.foto_n ? `<span class="yq-foto">${IK('i-image')}${x.foto_n}</span>` : ''}<span class="yq-c">${IK('i-chat')}${x.cevap_sayisi}</span>${kisa ? '' : `<span class="yq-c">${IK('i-eye')}${kisaSayi(x.goruntulenme || 0)}</span>`}</div></a>`;
}

// ---------- Kategoriler ----------
// Kategoriler: her ana kategori fotoğraflı bir kart; yazı sayısı (alt kategoriler dahil), kısa açıklama,
// alt kategoriler ve en çok okunan 3 yazı. Masaüstünde 3, tablette 2, telefonda tek sütun.
export async function kategorilerSayfa(c) {
  const say_ = Object.fromEntries((await c.db.prepare(`SELECT kategori_id k, COUNT(*) n FROM b_yazi WHERE ${YAYINDA} GROUP BY kategori_id`).bind(Date.now()).all()).results.map((r) => [r.k, r.n]));
  const ust = c.kat.filter((k) => !k.ust_id);
  const altlar = (k) => c.kat.filter((x) => x.ust_id === k.id);
  const ids = (k) => [k.id, ...altlar(k).map((x) => x.id)];
  const yazilar_ = await tumYazilar(c.db);
  const kart = (k) => {
    const n = ids(k).reduce((t, i) => t + (say_[i] || 0), 0);
    const pop = yazilar_.filter((y) => ids(k).includes(y.kategori_id)).sort((a, b) => (b.okunma || 0) - (a.okunma || 0)).slice(0, 3);
    const u = L(c, '/kategori/' + k.slug);
    return `<article class="kt-kart"><a class="kt-gor" href="${u}" tabindex="-1" aria-hidden="true">${ph(k.gorsel, '')}</a>
<div class="kt-ic"><div class="kt-ust"><h2><a href="${u}">${esc(k.ad)}</a></h2><span class="kt-say">${n} yazı</span></div>
<p class="kt-acik">${esc(kirp(k.aciklama || k.kisa || '', 120))}</p>
${altlar(k).length ? `<div class="kt-alt">${altlar(k).map((x) => `<a href="${L(c, '/kategori/' + x.slug)}">${esc(x.ad)}</a>`).join('')}</div>` : ''}
${pop.length ? `<ul class="kt-pop">${pop.map((y) => `<li><a href="${yaziUrl(c, y)}">${esc(y.baslik)}</a></li>`).join('')}</ul>` : ''}
<a class="kt-git" href="${u}">Tüm ${esc(k.ad)} yazıları ${IK('i-arrow')}</a></div></article>`;
  };
  const govde = `<main class="wrap"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>Kategoriler</span></div>
<div class="kt-bas"><h1>Kategoriler</h1><p>İlgi alanınıza göre içerikleri keşfedin: bitki bakımından toprak ve gübreye, sebze bahçesinden ekim takvimine.</p></div>
<div class="kt-izgara">${ust.map(kart).join('')}</div></main>`;
  return sayfa(c, { baslik: 'Kategoriler', aciklama: 'HasTürk Blog kategorileri: bitki bakımı, çiçekler, toprak rehberi, gübreleme, sebze ve meyve, ekim takvimi.', yol: '/kategoriler', aktif: 'kategoriler', govde,
    jsonld: [kirintiJsonLd(c, [['Kategoriler', '/kategoriler']]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Kategoriler', url: (c.A.site_url || '') + '/kategoriler', inLanguage: 'tr-TR',
      mainEntity: { '@type': 'ItemList', itemListElement: ust.map((k, i) => ({ '@type': 'ListItem', position: i + 1, url: (c.A.site_url || '') + '/kategori/' + k.slug, name: k.ad })) } }] });
}

const SAYFA_BOY = 9;
export async function kategoriSayfa(c, slug) {
  const k = c.kat.find((x) => x.slug === slug);
  if (!k) return bulunamadi(c);
  const s = Math.max(1, parseInt(c.url.searchParams.get('s'), 10) || 1);
  const sira = c.url.searchParams.get('sira') === 'okunan' ? 'y.okunma DESC, y.yayin_ts DESC' : 'y.yayin_ts DESC';
  // Ana kategoride alt kategorilerin yazıları da listelenir
  const altlar = c.kat.filter((x) => x.ust_id === k.id), ids = [k.id, ...altlar.map((x) => x.id)], soru_ = ids.map(() => '?').join(',');
  const ust = k.ust_id ? c.kat.find((x) => x.id === k.ust_id) : null;
  const top = (await c.db.prepare(`SELECT COUNT(*) n FROM b_yazi WHERE ${YAYINDA} AND kategori_id IN (${soru_})`).bind(Date.now(), ...ids).first()).n;
  const list = await yazilar(c, `AND y.kategori_id IN (${soru_})`, ids, `ORDER BY ${sira} LIMIT ${SAYFA_BOY} OFFSET ${(s - 1) * SAYFA_BOY}`);
  const pop = await yazilar(c, `AND y.kategori_id IN (${soru_})`, ids, 'ORDER BY y.okunma DESC LIMIT 3');
  const sayilar = Object.fromEntries((await c.db.prepare(`SELECT kategori_id k, COUNT(*) n FROM b_yazi WHERE ${YAYINDA} GROUP BY kategori_id`).bind(Date.now()).all()).results.map((r) => [r.k, r.n]));
  const U = await c.U();
  const recs = oneriler(U, { slug: 'kat-' + k.slug, baslik: k.ad, odak: k.ad, ozet: k.aciklama || '', govde: list.map((y) => y.baslik).join(' . ') }, { n: 3 });
  const sayfaSay = Math.max(1, Math.ceil(top / SAYFA_BOY));
  const q = (n) => L(c, '/kategori/' + k.slug) + (n > 1 || c.url.searchParams.get('sira') ? '?' + new URLSearchParams({ ...(n > 1 ? { s: n } : {}), ...(c.url.searchParams.get('sira') ? { sira: 'okunan' } : {}) }) : '');
  const govde = `<main class="wrap"><div class="layout"><div class="col" style="gap:20px">
<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <a href="${L(c, '/kategoriler')}">Kategoriler</a> › ${ust ? `<a href="${L(c, '/kategori/' + ust.slug)}">${esc(ust.ad)}</a> › ` : ''}<span>${esc(k.ad)}</span></div>
<div class="cathero">${ph(k.gorsel)}<div class="in"><span class="chip solid">Kategori</span><h1>${esc(k.ad)}</h1><p>${esc(k.aciklama || '')}</p></div><span class="hand">Daha yeşil<br>bir yaşam mümkün…</span></div>
<div class="filters">${(altlar.length || ust ? [ust || k, ...c.kat.filter((x) => x.ust_id === (ust || k).id)] : c.kat.filter((x) => !x.ust_id)).map((x, i) => `<a${x.id === k.id ? ' class="on" aria-current="page"' : ''} href="${L(c, '/kategori/' + x.slug)}">${(altlar.length || ust) && i === 0 ? 'Tümü' : esc(x.ad)}</a>`).join('')}</div>
<div><div class="sh"><div><h2>${IK('i-leaf')}${esc(k.ad)} Yazıları</h2><p>${top} yazı</p></div>
<form method="get"><label class="sr" for="srt">Sırala</label><select id="srt" class="sort" name="sira" data-oto><option value="">En Yeni</option><option value="okunan"${c.url.searchParams.get('sira') === 'okunan' ? ' selected' : ''}>En Çok Okunan</option></select><noscript><button class="btn btn-o">Sırala</button></noscript></form></div>
${list.length ? `<div class="posts">${list.map((y) => postKart(c, y)).join('')}</div>` : '<div class="empty">Bu kategoride henüz yazı yok.</div>'}
${sayfaSay > 1 ? `<nav class="pager" aria-label="Sayfalar">${s > 1 ? `<a href="${q(s - 1)}" aria-label="Önceki sayfa">‹</a>` : ''}${Array.from({ length: sayfaSay }, (_, i) => i + 1).filter((n) => n === 1 || n === sayfaSay || Math.abs(n - s) <= 2).map((n) => `<a${n === s ? ' class="on" aria-current="page"' : ''} href="${q(n)}">${n}</a>`).join('')}${s < sayfaSay ? `<a href="${q(s + 1)}" aria-label="Sonraki sayfa">›</a>` : ''}</nav>` : ''}
</div></div>
<aside class="side">
<div class="box"><h3>${IK('i-search')}Blog'da Ara</h3>${aramaKutu(c, k.ad + ' yazılarında ara…', `<input type="hidden" name="kat" value="${esc(k.slug)}">`)}</div>
<div class="box"><h3>${IK('i-leaf')}Kategoriler</h3><div class="subcat">${c.kat.filter((x) => x.id !== k.id).map((x) => `<a href="${L(c, '/kategori/' + x.slug)}">${ph(x.gorsel)}<div><b>${esc(x.ad)}</b><small>${sayilar[x.id] || 0} yazı</small></div>${IK('i-right')}</a>`).join('')}</div></div>
${pop.length ? `<div class="box"><h3>${IK('i-fire')}En Çok Okunan</h3>${rank(c, pop)}</div>` : ''}
${bulten(c, true)}
${recs.length ? `<div class="box"><h3>${IK('i-leaf')}Önerilen Ürünler</h3><div class="pmini">${recs.map((p) => kartPm(U, c.base, p, 'kat-' + k.slug)).join('')}</div></div>` : ''}
</aside></div>
${await bant(c, 'B5', { baslik: "Bitki Bakımında İhtiyacınız Olan Her Şey HasTürk Mağaza'da!", alt: 'Topraklar, gübreler, tohumlar ve daha fazlası için mağazamızı ziyaret edin.', dugme: 'Alışverişe Başla', link: c.A.magaza_url, gorsel: '/blog-statik/foto/bahce-magaza.webp' }, k.id, true)}
</main>`;
  return sayfa(c, { baslik: k.ad + (s > 1 ? ` – Sayfa ${s}` : ''), aciklama: k.aciklama, yol: '/kategori/' + k.slug + (s > 1 ? '?s=' + s : ''), gorsel: k.gorsel, aktif: 'k:' + k.slug, govde, jsonld: [kirintiJsonLd(c, [['Kategoriler', '/kategoriler'], [k.ad, '/kategori/' + k.slug]]),
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: k.ad, description: k.aciklama || undefined, url: (c.A.site_url || '') + '/kategori/' + k.slug, inLanguage: 'tr-TR',
      mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.map((y, i) => ({ '@type': 'ListItem', position: (s - 1) * SAYFA_BOY + i + 1, url: (c.A.site_url || '') + '/' + y.slug, name: y.baslik })) } }] });
}

// ---------- Yazarlar ----------
// Yazar avatarı: kayıtlı fotoğrafı varsa yuvarlak fotoğraf, yoksa baş harfler
function yazarAv(yz, ad, sinif = '') {
  if (yz && yz.foto) return `<span class="lg av-yazar${sinif}" style="background:#fff;padding:0;overflow:hidden"><img src="${esc(yz.foto)}" alt="${esc(yz.ad)}" width="96" height="96" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></span>`;
  return `<span class="lg av-yazar${sinif}" style="background:${renk(ad)}">${esc(bas(ad))}</span>`;
}
const YAZAR_BOY = 12;
export async function yazarSayfa(c, slug) {
  const yz = yazarBul(c.A, slug);
  if (!yz) return bulunamadi(c);
  const s = Math.max(1, parseInt(c.url.searchParams.get('s'), 10) || 1);
  const top = (await c.db.prepare(`SELECT COUNT(*) n FROM b_yazi WHERE ${YAYINDA} AND yazar = ?`).bind(Date.now(), yz.ad).first()).n;
  const list = await yazilar(c, 'AND y.yazar = ?', [yz.ad], `ORDER BY y.yayin_ts DESC LIMIT ${YAZAR_BOY} OFFSET ${(s - 1) * YAZAR_BOY}`);
  const kat = (await c.db.prepare(`SELECT k.slug, k.ad, COUNT(*) n FROM b_yazi y JOIN b_kategori k ON k.id = y.kategori_id WHERE y.yazar = ? AND ${YAYINDA.replace(/durum|yayin_ts/g, (m) => 'y.' + m)} GROUP BY k.slug, k.ad ORDER BY n DESC`).bind(yz.ad, Date.now()).all()).results;
  const tanitim = yazarTanitim(yz, kat);
  const sayfaSay = Math.max(1, Math.ceil(top / YAZAR_BOY));
  const yol = '/yazar/' + yz.slug, q = (n) => L(c, yol) + (n > 1 ? '?s=' + n : '');
  const tam_ = (c.A.site_url || '') + yol;
  const govde = `<main class="wrap"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <a href="${L(c, '/yazarlar')}">Yazarlar</a> › <span>${esc(yz.ad)}</span></div>
<section class="yzr-bas">${yazarAv(yz, yz.ad, ' yzr-av')}<div><h1>${esc(yz.ad)}</h1><p class="yzr-unvan">${esc(yz.unvan)} · ${top} yazı</p>${String(tanitim).split(/\n+/).map((x, i) => `<p class="yzr-bio"${i ? ' style="margin-top:10px"' : ''}>${esc(x)}</p>`).join('')}
${kat.length ? `<div class="yzr-konu">${kat.slice(0, 5).map((k) => `<a href="${L(c, '/kategori/' + k.slug)}">${esc(k.ad)} <span>${k.n}</span></a>`).join('')}</div>` : ''}
${yz.sameAs.length ? `<p class="yzr-lnk">${yz.linkedin ? `<a class="btn btn-o" href="${esc(yz.linkedin)}" rel="me noopener" target="_blank">LinkedIn profili</a>` : ''}${yz.instagram ? `<a class="btn btn-o" href="${esc(yz.instagram)}" rel="me noopener" target="_blank">Instagram</a>` : ''}${yz.web ? `<a class="btn btn-o" href="${esc(yz.web)}" rel="me noopener" target="_blank">Web sitesi</a>` : ''}</p>` : ''}</div></section>
<div class="sh"><div><h2>${IK('i-leaf')}${esc(yz.ad)} Yazıları</h2></div></div>
${list.length ? `<div class="posts">${list.map((y) => postKart(c, y)).join('')}</div>` : '<div class="empty">Bu yazarın henüz yayında yazısı yok.</div>'}
${sayfaSay > 1 ? `<nav class="pager" aria-label="Sayfalar">${s > 1 ? `<a href="${q(s - 1)}" aria-label="Önceki sayfa">‹</a>` : ''}${Array.from({ length: sayfaSay }, (_, i) => i + 1).filter((n) => n === 1 || n === sayfaSay || Math.abs(n - s) <= 2).map((n) => `<a${n === s ? ' class="on" aria-current="page"' : ''} href="${q(n)}">${n}</a>`).join('')}${s < sayfaSay ? `<a href="${q(s + 1)}" aria-label="Sonraki sayfa">›</a>` : ''}</nav>` : ''}
</main>`;
  const kisi = kisiJsonLd(yz, tam_, { description: tanitim, knowsAbout: kat.slice(0, 5).map((k) => k.ad) });
  return sayfa(c, { baslik: yz.ad + ' · HasTürk Blog Yazarı' + (s > 1 ? ` – Sayfa ${s}` : ''), aciklama: kirp(tanitim, 155), yol: yol + (s > 1 ? '?s=' + s : ''), tur: 'profile', noindex: !top, govde,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'ProfilePage', url: tam_, mainEntity: kisi }, kirintiJsonLd(c, [['Yazarlar', '/yazarlar'], [yz.ad, yol]])] });
}
export async function yazarlarSayfa(c) {
  const say_ = Object.fromEntries((await c.db.prepare(`SELECT yazar, COUNT(*) n FROM b_yazi WHERE ${YAYINDA} GROUP BY yazar`).bind(Date.now()).all()).results.map((r) => [r.yazar, r.n]));
  const liste = YAZAR_LISTE.map((x) => yazarBul(c.A, x.ad)).filter((y) => say_[y.ad]).sort((a, b) => say_[b.ad] - say_[a.ad]);
  const govde = `<main class="wrap"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>Yazarlar</span></div>
<div class="sh"><div><h1 class="h2">${IK('i-users')}Yazarlarımız</h1><p>HasTürk Blog yazıları, HasTürk Gübre ekibi tarafından hazırlanır ve yayından önce kontrol edilir.</p></div></div>
<div class="yzr-liste">${liste.map((y) => `<a class="yzr-kart" href="${L(c, '/yazar/' + y.slug)}">${yazarAv(y, y.ad)}<div><b>${esc(y.ad)}</b><small>${esc(y.unvan)} · ${say_[y.ad]} yazı</small></div></a>`).join('')}</div></main>`;
  return sayfa(c, { baslik: 'Yazarlarımız', aciklama: 'HasTürk Blog yazarları: bahçe, toprak, gübre ve bitki bakımı yazılarını hazırlayan HasTürk Gübre ekibi.', yol: '/yazarlar', govde, jsonld: [kirintiJsonLd(c, [['Yazarlar', '/yazarlar']])] });
}

// ---------- Yazı ----------
export async function yaziSayfa(c, slug) {
  const y = await c.db.prepare('SELECT y.*, k.slug kslug, k.ad kad, k.renk krenk FROM b_yazi y LEFT JOIN b_kategori k ON k.id = y.kategori_id WHERE y.slug = ?').bind(slug).first();
  const yayinda = y && ['yayinda', 'zamanli'].includes(y.durum) && y.yayin_ts <= Date.now();
  const onizleme = y && !yayinda && yetkili(c.uye, 'yazi');
  // Kaldırılan kopya yazının adresi, aynı konunun yayındaki yazısına kalıcı yönlenir
  if ((!y || (!yayinda && !onizleme)) && KOPYA_YON[slug]) return new Response(null, { status: 301, headers: { Location: L(c, '/' + KOPYA_YON[slug]) } });
  if (!y || (!yayinda && !onizleme)) return bulunamadi(c);
  const yz = yazarBul(c.A, y.yazar);
  // Birbirinden bağımsız sorgular aynı anda gider (her biri Avrupa'daki veritabanına ayrı gidiş-dönüş)
  const [U, yayindaR, digerR] = await Promise.all([
    c.U(),
    c.db.prepare(`SELECT slug FROM b_yazi WHERE ${YAYINDA}`).bind(Date.now()).all(),
    c.db.prepare(`SELECT slug, odak, etiketler FROM b_yazi WHERE ${YAYINDA} AND id != ? AND odak IS NOT NULL AND odak != ''`).bind(Date.now(), y.id).all(),
  ]);
  const inline = [];
  // Yazı içi bağlantılar: yayında olmayan (ör. ileri tarihli) yazılara giden bağlantı düz metin kalır, yayına girince kendiliğinden bağlanır
  const yayindakiler = new Set(yayindaR.results.map((x) => x.slug));
  const govdeL = String(y.govde || '').replace(/\[([^\]]+)\]\(\/([a-z0-9-]+)\)/g, (m, metin, sl) => (yayindakiler.has(sl) || ayrilmisMi(sl) ? `[${metin}](${c.base}/${sl})` : metin));
  const r = render(govdeL, { urunKart: (s) => { const l = urunBulYedekli(U, s, inline); inline.push(...l.map((p) => p.s)); return kartYaziIci(U, c.base, l, 'yazi-ici'); } });
  let manuel = []; try { manuel = JSON.parse(y.urunler || '[]'); } catch {}
  // Yazı sonu ürünleri: önce elle seçilenler, sonra yazı içinde geçenler, sonra konuya göre otomatik öneriler
  // Yazı sonu ürünleri (her zaman 4): önce elle seçilenler ve yazı içinde geçenler, kalan yerler konuya göre (urun.js > oneriler)
  const recs = oneriler(U, { ...y, govde: duz(y.govde) }, { secili: [...new Set([...manuel, ...inline])], n: 4 });
  // İç linkleme: metinde geçen diğer yazıların konusuna ve bu yazıdaki ürünlerin adına bağlantı
  const digerleri = digerR.results;
  const mag = String(c.A.magaza_url || 'https://hasturkgubre.com.tr').replace(/\/$/, '');
  const hedef = [
    ...digerleri.map((d) => ({ ifadeler: konuIfadeleri(d.odak, d.etiketler), url: L(c, '/' + d.slug) })),
    ...urunBul(U, [...new Set([...inline, ...recs.map((p) => p.s)])]).map((p) => ({ ifadeler: urunIfadeleri(p.n), url: `${mag}/${p.s}`, ek: ` data-urun="${esc(p.s)}"` })),
  ];
  r.html = icLink(r.html, hedef, 6);
  const sss = sssCoz(y.sss);
  const now = Date.now();
  const [onceki, sonraki, benzer, sonY, pop] = await Promise.all([
    c.db.prepare(`SELECT slug, baslik, gorsel FROM b_yazi WHERE ${YAYINDA} AND yayin_ts < ? ORDER BY yayin_ts DESC LIMIT 1`).bind(now, y.yayin_ts || now).first(),
    c.db.prepare(`SELECT slug, baslik, gorsel FROM b_yazi WHERE ${YAYINDA} AND yayin_ts > ? ORDER BY yayin_ts ASC LIMIT 1`).bind(now, y.yayin_ts || now).first(),
    yazilar(c, 'AND y.id != ? AND y.kategori_id IS ?', [y.id, y.kategori_id], 'ORDER BY y.yayin_ts DESC LIMIT 3'),
    yazilar(c, 'AND y.id != ?', [y.id], 'ORDER BY y.yayin_ts DESC LIMIT 4'),
    yazilar(c, 'AND y.id != ?', [y.id], 'ORDER BY y.okunma DESC, y.yayin_ts DESC LIMIT 4'),
  ]);
  if (benzer.length < 3) benzer.push(...(await yazilar(c, 'AND y.id != ?', [y.id], 'ORDER BY y.yayin_ts DESC LIMIT 4')).filter((b) => !benzer.some((x) => x.id === b.id)).slice(0, 3 - benzer.length));
  const yorumlar = (await c.db.prepare("SELECT m.*, u.ad uad, u.rol urol, u.foto ufoto, u.onayli uon FROM b_yorum m JOIN b_uye u ON u.id = m.uye_id WHERE m.yazi_id = ? AND (m.durum = 'onayli' OR (m.durum = 'bekliyor' AND m.uye_id = ?)) ORDER BY m.ts ASC").bind(y.id, c.uye ? c.uye.id : -1).all()).results;
  const ana = yorumlar.filter((m) => !m.ust_id), alt = (id) => yorumlar.filter((m) => m.ust_id === id);
  const onayliSay = yorumlar.filter((m) => m.durum === 'onayli').length;
  const toc = [...r.basliklar, ...(sss.length ? [{ id: 'sss', metin: 'Sık sorulan sorular' }] : []), { id: 'yorumlar', metin: 'Yorumlar' }];
  const yorumHtml = (m, cevap) => {
    const g = guven({ rol: m.urol, onayli: m.uon }, c.A);
    return `<div class="cm${cevap ? ' reply' : ''}" id="y${m.id}">${avatar(c, m.uad, m.urol !== 'uye' ? '#2e7d43' : renk(m.uad), m.ufoto)}<div><div class="hd"><b>${esc(m.uad)}</b>${g && g.etiket ? `<span class="${g.etiket}">${esc(g.ad)}</span>` : ''}<span>· ${goreli(m.ts)}</span>${m.durum === 'bekliyor' ? '<span class="st wait">Onay bekliyor · yalnız siz görüyorsunuz</span>' : ''}</div>${duzMetin(m.metin)}
<div class="act">${m.durum === 'onayli' ? `<form method="post" action="${L(c, '/api/oy')}"><input type="hidden" name="tur" value="yorum"><input type="hidden" name="hedef" value="${m.id}"><input type="hidden" name="deger" value="1"><input type="hidden" name="geri" value="${esc(c.url.pathname)}#y${m.id}"><button>${IK('i-heart')}Faydalı · ${m.faydali || 0}</button></form>${!cevap && c.uye ? `<button type="button" data-yanit="${m.id}" data-ad="${esc(m.uad)}">Yanıtla</button>` : ''}` : ''}</div></div></div>`;
  };
  const geri = encodeURIComponent(c.url.pathname + '#yorumlar');
  const paylas = `<div class="yz-paylas" data-paylas aria-label="Paylaş"><a href="https://wa.me/?text=" data-p="wa" aria-label="WhatsApp'ta paylaş" rel="noopener" target="_blank">${IK('i-wa')}</a><a href="https://www.facebook.com/sharer/sharer.php?u=" data-p="fb" aria-label="Facebook'ta paylaş" rel="noopener" target="_blank">${IK('i-fb')}</a><a href="https://pinterest.com/pin/create/button/?url=" data-p="pin" aria-label="Pinterest'te paylaş" rel="noopener" target="_blank">${IK('i-pin')}</a><a href="https://twitter.com/intent/tweet?url=" data-p="x" aria-label="X'te paylaş" rel="noopener" target="_blank">${IK('i-x')}</a><a href="#" data-p="kopya" aria-label="Bağlantıyı kopyala">${IK('i-link')}</a></div>`;
  const tocListe = toc.map((t) => `<li><a href="#${t.id}">${esc(t.metin)}</a></li>`).join('');
  const govde = `<main class="wrap">
${onizleme ? `<div class="flash warn">${IK('i-eye')}<span>Önizleme: bu yazı henüz yayında değil (durum: ${esc(y.durum)}). Ziyaretçiler göremez.</span> <a href="${L(c, '/panel/yazi/' + y.id)}">Düzenle</a></div>` : ''}${flash(c)}
<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › ${y.kad ? `<a href="${L(c, '/kategori/' + y.kslug)}">${esc(y.kad)}</a> › ` : ''}<span>${esc(y.baslik)}</span></div>
<div class="layout yz-layout"><article class="yz" style="min-width:0">
<header class="yz-bas">
${y.kad ? `<a class="yz-kat" href="${L(c, '/kategori/' + y.kslug)}">${esc(y.kad)}</a>` : ''}
<h1>${esc(y.baslik)}</h1>
${y.ozet ? `<p class="lead">${esc(y.ozet)}</p>` : ''}
<div class="yz-kim">${!y.yazar || /ekib/i.test(y.yazar) ? '<span class="lg"><img src="/blog-statik/logo.webp" alt=""></span>' : yazarAv(yazarBul(c.A, y.yazar), y.yazar)}<div class="yz-au"><b>${yz ? `<a href="${L(c, '/yazar/' + yz.slug)}" rel="author">${esc(yz.ad)}</a>` : esc(y.yazar || 'HasTürk Editör Ekibi')}</b><span><time datetime="${new Date(y.yayin_ts || now).toISOString()}">${trTarih(y.yayin_ts)}</time> · ${okumaDk(y.govde)} dk okuma${y.guncel_ts && y.guncel_ts - (y.yayin_ts || 0) > 86400000 ? ` · Güncellendi: ${trTarih(y.guncel_ts)}` : ''}${y.okunma >= 50 ? ` · ${kisaSayi(y.okunma)} okuma` : ''}</span></div>${paylas}</div>
</header>
<figure class="yz-gorsel"><img src="${esc(y.gorsel || '/blog-statik/foto/hero1.webp')}" alt="${esc(y.gorsel_alt || y.baslik)}" fetchpriority="high" decoding="async"></figure>${krediSatiri(y.gorsel)}
<div class="yz-icerik">
${y.kisaca ? `<div class="summary"><b>Kısaca</b><p>${esc(y.kisaca)}</p></div>` : ''}
${toc.length > 2 ? `<nav class="yz-toc" aria-label="İçindekiler"><b>Bu yazıda</b><ol>${tocListe}</ol></nav>` : ''}
<div class="prose">${r.html}</div>
${recs.length ? `<section class="recs"><div class="sh" style="margin-bottom:12px"><div><h2>Bu Yazıyla İlgili Ürünler</h2><p style="padding-left:0">HasTürk Mağaza'da</p></div><a class="more" href="${esc(c.A.magaza_url)}" rel="noopener">Mağazaya Git ${IK('i-arrow')}</a></div><div class="grid">${recs.map((p) => kartRc(U, c.base, p, 'yazi-sonu')).join('')}</div></section>` : ''}
${sss.length ? `<section class="yz-sss" id="sss"><h2>Sık Sorulan Sorular</h2><div class="faq">${sss.map((q, i) => `<details${i ? '' : ' open'}><summary>${esc(q.s)}</summary><p>${esc(q.c)}</p></details>`).join('')}</div></section>` : ''}
${yz ? `<div class="authorbox">${yazarAv(yz, yz.ad)}<div><b><a href="${L(c, '/yazar/' + yz.slug)}" rel="author">${esc(yz.ad)}</a></b><small>${esc(yz.unvan)}</small><p>Sorunuz varsa yorumlara yazın ya da <a href="${L(c, '/soru-cevap/sor')}">topluluğa sorun</a>.</p><p class="ab-lnk"><a href="${L(c, '/yazar/' + yz.slug)}">Yazar hakkında bilgi edinin</a>${yz.linkedin ? `<a href="${esc(yz.linkedin)}" rel="me noopener" target="_blank">LinkedIn profili</a>` : ''}${yz.instagram ? `<a href="${esc(yz.instagram)}" rel="me noopener" target="_blank">Instagram</a>` : ''}</p></div></div>` : `<div class="authorbox"><span class="lg"><img src="/blog-statik/logo.webp" alt=""></span><div><b>${esc(y.yazar || 'HasTürk Editör Ekibi')}</b><small>Bahçe ve bitki bakımı</small><p>Yazılarımız HasTürk'ün ürün kullanım bilgileri ve bitki bakım deneyimiyle hazırlanır, yayından önce kontrol edilir. Sorunuz varsa yorumlara yazın ya da <a href="${L(c, '/soru-cevap/sor')}">topluluğa sorun</a>.</p></div></div>`}
${onceki || sonraki ? `<div class="pn">${onceki ? `<a href="${L(c, '/' + onceki.slug)}">${ph(onceki.gorsel)}<div><small>‹ Önceki Yazı</small><b>${esc(onceki.baslik)}</b></div></a>` : '<span></span>'}${sonraki ? `<a href="${L(c, '/' + sonraki.slug)}"><div><small>Sonraki Yazı ›</small><b>${esc(sonraki.baslik)}</b></div>${ph(sonraki.gorsel)}</a>` : ''}</div>` : ''}
<section class="comments" id="yorumlar"><h2>Yorumlar <span>${onayliSay}</span></h2>
${c.uye ? `<form class="cform" method="post" action="${L(c, '/api/yorum')}" id="yorumform"><input type="hidden" name="yazi_id" value="${y.id}"><input type="hidden" name="ust_id" value=""><div class="yanit-not" hidden></div><label class="sr" for="cm">Yorumunuz</label><textarea id="cm" name="metin" required minlength="5" maxlength="3000" placeholder="Bu yazıyla ilgili soru ya da deneyiminizi paylaşın…"></textarea><div class="row"><small>${esc(c.uye.ad)} olarak yorum yapıyorsunuz. ${paylasimDurumu(c.uye, '', c.A).durum === 'onayli' ? '' : 'İlk yorumlarınız kısa bir kontrolden sonra yayınlanır.'}</small><button class="btn btn-g">Gönder</button></div></form>`
    : `<div class="cform"><label class="sr" for="cm">Yorumunuz</label><textarea id="cm" disabled placeholder="Yorum yapmak için giriş yapın…"></textarea><div class="row"><small>Yorum yapmak için üye girişi gerekir. İlk yorumlarınız kısa bir kontrolden sonra yayınlanır.</small><a class="btn btn-g" href="${L(c, '/giris')}?geri=${geri}">Giriş Yap / Üye Ol</a></div></div>`}
<div>${ana.length ? ana.map((m) => yorumHtml(m) + alt(m.id).map((a) => yorumHtml(a, true)).join('')).join('') : '<p class="muted" style="padding:14px 0;font-size:14px">Henüz yorum yok. İlk yorumu siz yazın.</p>'}</div></section>
${benzer.length ? `<section class="yz-benzer"><div class="sh"><div><h2>Benzer Yazılar</h2></div>${y.kslug ? `<a class="more" href="${L(c, '/kategori/' + y.kslug)}">Tümü ${IK('i-arrow')}</a>` : ''}</div><div class="similar">${benzer.map((b) => `<a class="sm" href="${yaziUrl(c, b)}">${ph(b.gorsel)}<div>${b.kad ? `<small>${esc(b.kad)}</small>` : ''}<b>${esc(b.baslik)}</b></div></a>`).join('')}</div></section>` : ''}
</div></article>
<aside class="side yz-yan">
<div class="box"><h3>Blog'da Ara</h3>${aramaKutu(c)}</div>
${recs.length ? `<div class="box"><h3>Bu Yazıdaki Ürünler</h3><div class="rec-side">${recs.slice(0, 3).map((p) => kartRs(U, c.base, p, 'yazi-yan')).join('')}</div><a class="more" href="${esc(c.A.magaza_url)}" rel="noopener" style="margin-top:12px">Tüm ürünler ${IK('i-arrow')}</a></div>` : ''}
<div class="box yz-cta"><h3>Sorunuz mu var?</h3><p>Bitkinizle ilgili sorunuzu yazın; bahçe severler ve HasTürk ekibi cevaplasın.</p><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}">Soru Sor</a></div>
${pop.length ? `<div class="box"><h3>En Çok Okunanlar</h3>${rank(c, pop)}</div>` : ''}
${sonY.length ? `<div class="box"><h3>Son Yazılar</h3>${rank(c, sonY, false)}</div>` : ''}
${bulten(c, true)}
</aside></div></main>`;
  // Tarayıcı sayfayı önceden yüklüyorsa (bağlantının üzerine gelindi, henüz açılmadı) okunma sayılmaz; sayfa gerçekten
  // açılınca tarayıcı /api/okunma'ya bildirir (bkz. okunmaPost)
  const onYukleme = /prefetch|prerender/i.test(c.req.headers.get('sec-purpose') || c.req.headers.get('purpose') || '');
  if (yayinda && !onYukleme && !botMu(c.req) && !(c.uye && c.uye.rol !== 'uye')) c.ctx.waitUntil(okunmaSay(c, y.id));
  return sayfa(c, { okunma: yayinda && onYukleme ? y.id : 0,
    baslik: y.seo_baslik || y.baslik, aciklama: y.seo_aciklama || y.ozet, yol: '/' + y.slug, gorsel: y.gorsel, gorselAlt: y.gorsel_alt || '', tur: 'article', noindex: !yayinda, govde,
    makale: { yayin: new Date(y.yayin_ts || Date.now()).toISOString(), guncel: new Date(y.guncel_ts || y.yayin_ts || Date.now()).toISOString(), bolum: y.kad || '' },
    aktif: y.kslug ? 'k:' + y.kslug : '',
    jsonld: [yaziJsonLd(c, y), kirintiJsonLd(c, [...(y.kad ? [[y.kad, '/kategori/' + y.kslug]] : []), [y.baslik, '/' + y.slug]]), sss.length ? sssJsonLd(sss) : null],
  });
}

// ---------- Soru-Cevap ----------
export async function scSayfa(c) {
  const t = c.url.searchParams.get('t') || 'yeni';
  const konu = c.url.searchParams.get('konu') || '';
  const qq = (c.url.searchParams.get('q') || '').trim().slice(0, 80);
  const s = Math.max(1, parseInt(c.url.searchParams.get('s'), 10) || 1);
  const k = c.kat.find((x) => x.slug === konu);
  const w = ["s.durum = 'onayli'"], bag = [];
  if (k) { w.push('s.kategori_id = ?'); bag.push(k.id); }
  const tw = t === 'bekleyen' ? ' AND s.cevap_sayisi = 0' : t === 'cozulen' ? ' AND s.cozum_id IS NOT NULL' : '';
  const sira = t === 'oy' ? 's.oy DESC, s.goruntulenme DESC, s.ts DESC' : 's.ts DESC';
  const where = w.join(' AND ');
  const N = 12;
  const SEC = `SELECT s.*, u.ad uad, u.rol urol, u.foto ufoto, k.ad kad, (SELECT COUNT(*) FROM b_dosya d WHERE d.tur = 'soru' AND d.hedef = s.id AND d.durum = 'aktif') foto_n, ${CEVAP_ONIZLEME} FROM b_soru s JOIN b_uye u ON u.id = s.uye_id LEFT JOIN b_kategori k ON k.id = s.kategori_id${CEVAP_JOIN}`;
  let sayilar, list;
  if (norm(qq).length >= 2) {
    // Arama: Türkçe uyumlu motor ilgiye göre sıralar; sekme ve konu süzgeci sonuca uygulanır
    let hits = await soruAra(c.db, qq);
    if (k) hits = hits.filter((h) => h.kategori_id === k.id);
    sayilar = { n: hits.length, b: hits.filter((h) => !h.cevap_sayisi).length, z: hits.filter((h) => h.cozum_id).length };
    let f = t === 'bekleyen' ? hits.filter((h) => !h.cevap_sayisi) : t === 'cozulen' ? hits.filter((h) => h.cozum_id) : hits;
    if (t === 'oy') f = [...f].sort((a, b) => b.oy - a.oy || b.goruntulenme - a.goruntulenme);
    const ids = f.slice((s - 1) * N, s * N).map((h) => h.id);
    const r = ids.length ? (await c.db.prepare(`${SEC} WHERE s.id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results : [];
    list = { results: ids.map((id) => r.find((x) => x.id === id)).filter(Boolean) };
    if (!botMu(c.req)) c.ctx.waitUntil(say(c.db, 'arama', qq.toLocaleLowerCase('tr-TR')).catch(() => {}));
  } else {
    [sayilar, list] = await Promise.all([
      c.db.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN s.cevap_sayisi = 0 THEN 1 ELSE 0 END) b, SUM(CASE WHEN s.cozum_id IS NOT NULL THEN 1 ELSE 0 END) z FROM b_soru s WHERE ${where}`).bind(...bag).first(),
      c.db.prepare(`${SEC} WHERE ${where}${tw} ORDER BY ${sira} LIMIT ${N} OFFSET ${(s - 1) * N}`).bind(...bag).all(),
    ]);
  }
  const genel = await c.db.prepare("SELECT COUNT(*) n, SUM(CASE WHEN cozum_id IS NOT NULL THEN 1 ELSE 0 END) z, (SELECT COUNT(*) FROM b_cevap WHERE durum = 'onayli') c FROM b_soru WHERE durum = 'onayli'").first();
  const toplam = t === 'bekleyen' ? sayilar.b || 0 : t === 'cozulen' ? sayilar.z || 0 : sayilar.n || 0;
  const sayfaN = Math.max(1, Math.ceil(toplam / N));
  const konular = (await c.db.prepare("SELECT k.slug, k.ad, COUNT(*) n FROM b_soru s JOIN b_kategori k ON k.id = s.kategori_id WHERE s.durum = 'onayli' GROUP BY k.id ORDER BY n DESC").all()).results;
  const qs = (o) => L(c, '/soru-cevap') + '?' + new URLSearchParams(Object.fromEntries(Object.entries({ t, konu, q: qq, ...o }).filter(([, v]) => v && v !== 'yeni')));
  const gizli = (o) => Object.entries(o).filter(([, v]) => v && v !== 'yeni').map(([k_, v]) => `<input type="hidden" name="${k_}" value="${esc(v)}">`).join('');
  const kurallar = String(c.A.kurallar || '').split('\n').map((x) => x.trim()).filter(Boolean);
  // Sayfa numaraları: ilk, son ve geçerli sayfanın iki yanı
  const nums = [...new Set([1, s - 1, s, s + 1, sayfaN].filter((x) => x >= 1 && x <= sayfaN))].sort((a, b) => a - b);
  const pager = sayfaN > 1 ? `<nav class="yn-pager" aria-label="Sayfalar">${s > 1 ? `<a href="${qs({ s: s - 1 > 1 ? s - 1 : '' })}" aria-label="Önceki sayfa">${IK('i-left')}</a>` : ''}${nums.map((x, i) => `${i && x - nums[i - 1] > 1 ? '<span>…</span>' : ''}<a href="${qs({ s: x > 1 ? x : '' })}"${x === s ? ' class="on" aria-current="page"' : ''}>${x}</a>`).join('')}${s < sayfaN ? `<a href="${qs({ s: s + 1 })}" aria-label="Sonraki sayfa">${IK('i-right')}</a>` : ''}</nav>` : '';
  const govde = `<main class="yn">
<section class="yn-sc-bas"><div class="wrap">${flash(c)}<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>Soru-Cevap</span></div>
<div class="yn-sc-bas-ic"><div><h1>Bahçe Soru-Cevap</h1><p>Bitkinizle ilgili merak ettiğinizi sorun; bahçe severler deneyimlerini paylaşsın, HasTürk ekibi cevaplasın.</p>
<form class="yn-ara" method="get" action="${L(c, '/soru-cevap')}" role="search">${IK('i-search')}<label class="sr" for="scq">Sorularda ara</label><input id="scq" name="q" value="${esc(qq)}" placeholder="Sorularda ara: limon yaprak dökülmesi" data-oneri="soru" autocomplete="off">${gizli({ t, konu })}<button class="btn btn-g">Ara</button></form></div>
<div class="yn-sc-ozet"><div><b>${binlik(genel.n || 0)}</b><span>soru</span></div><div><b>${binlik(genel.c || 0)}</b><span>cevap</span></div><div><b>%${genel.n ? Math.round(100 * (genel.z || 0) / genel.n) : 0}</b><span>çözüldü</span></div><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}">${IK('i-plus')}Soru Sor</a></div></div></div></section>
<div class="wrap"><div class="layout"><div class="col">
<nav class="yn-konular" aria-label="Konular"><a href="${qs({ konu: '', s: '' })}"${!konu ? ' class="on"' : ''}>Tümü</a>${konular.map((x) => `<a href="${qs({ konu: x.slug, s: '' })}"${x.slug === konu ? ' class="on"' : ''}>${esc(x.ad)} <small>${x.n}</small></a>`).join('')}</nav>
<div class="yn-sc-arac"><nav class="yn-sekme" aria-label="Sıralama"><a${t === 'yeni' ? ' class="on"' : ''} href="${qs({ t: '', s: '' })}">En yeni</a><a${t === 'oy' ? ' class="on"' : ''} href="${qs({ t: 'oy', s: '' })}">Popüler</a><a${t === 'cozulen' ? ' class="on"' : ''} href="${qs({ t: 'cozulen', s: '' })}">Çözülen <span>${sayilar.z || 0}</span></a><a${t === 'bekleyen' ? ' class="on"' : ''} href="${qs({ t: 'bekleyen', s: '' })}">Cevap bekleyen <span>${sayilar.b || 0}</span></a></nav>
<span class="yn-sc-n">${binlik(toplam)} soru${qq ? ` · “${esc(qq)}”` : ''}${k ? ` · ${esc(k.ad)}` : ''}${qq || konu ? ` · <a href="${L(c, '/soru-cevap')}">Filtreyi temizle</a>` : ''}</span></div>
${list.results.length ? `<div class="yn-ql">${list.results.map((x) => soruKart(c, x)).join('')}</div>` : `<div class="empty">${IK('i-chat')}<p>${qq || konu || t !== 'yeni' ? 'Bu aramaya uygun soru bulunamadı. Sorunuzu siz sorun; ekibimiz cevaplasın.' : 'Henüz soru yok. İlk soruyu siz sorun!'}</p><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}${qq ? '?baslik=' + encodeURIComponent(qq) : ''}">${qq ? 'Bu soruyu sor' : 'Soru Sor'}</a></div>`}
${pager}
</div>
<aside class="side">
<div class="box yn-sor-kart"><span class="yn-ikon">${IK('i-chat')}</span><h3>Cevabını bulamadınız mı?</h3><p>Sorunuzu yazın; bahçe severler ve HasTürk ekibi cevaplasın.</p><ol class="yn-adim"><li><b>1</b><span>Ücretsiz üye olun</span></li><li><b>2</b><span>Bitkinizi, belirtileri ve bakımınızı anlatın; mümkünse fotoğraf ekleyin</span></li><li><b>3</b><span>İşe yarayan cevabı çözüm olarak işaretleyin</span></li></ol><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}">${IK('i-plus')}Soru Sor</a></div>
<div class="box yn-ipucu"><h3>${IK('i-bulb')}İyi bir soru için</h3><ul><li>Bitkinin adı ya da fotoğrafı</li><li>Ne zamandır böyle, nasıl başladı</li><li>Sulama sıklığı, ışık ve bulunduğu yer</li><li>Son yaptığınız değişiklik (saksı, gübre, yer)</li></ul></div>
${kurallar.length ? `<div class="box"><h3>Topluluk kuralları</h3><ul class="rules">${kurallar.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul><a class="more" href="${L(c, '/topluluk-kurallari')}" style="margin-top:10px">Tüm kurallar ${IK('i-arrow')}</a></div>` : ''}
</aside></div></div></main>`;
  return sayfa(c, { baslik: 'Bahçe Soru-Cevap', aciklama: 'Bitki bakımı, toprak, gübre ve bahçe sorularınızı sorun; bahçe severler ve HasTürk ekibi cevaplasın.', yol: '/soru-cevap', aktif: 'sc', govde, noindex: !!(qq || s > 1 || t !== 'yeni' || konu) });
}

export async function soruSorSayfa(c, hata = '', f = {}) {
  if (!c.uye) return yonlendir(L(c, '/giris') + '?geri=' + encodeURIComponent(L(c, '/soru-cevap/sor') + c.url.search));
  if (!f.baslik && c.url.searchParams.get('baslik')) f = { ...f, baslik: c.url.searchParams.get('baslik').slice(0, 140) };
  const d = paylasimDurumu(c.uye, '', c.A).durum;
  const govde = `<main class="wrap"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <a href="${L(c, '/soru-cevap')}">Soru-Cevap</a> › <span>Soru Sor</span></div>
<div class="layout yn-sor"><div class="col"><div class="qd"><h1>Soru Sor</h1><p class="muted">Bitkinizi, belirtileri, ne sıklıkla suladığınızı ve nerede durduğunu yazarsanız daha iyi cevap alırsınız.</p>${hataKutu(hata)}
<form method="post" action="${L(c, '/api/soru')}" class="form" enctype="multipart/form-data">
<label class="fld">Sorunuz (başlık)<input name="baslik" required minlength="10" maxlength="140" value="${esc(f.baslik || '')}" placeholder="ör. Limon ağacımın yaprakları neden dökülüyor?" data-oneri="soru" data-oneri-baslik="Benzer sorular: cevabınız burada olabilir" autocomplete="off"></label>
<label class="fld">Konu<select name="kategori_id">${c.kat.filter((x) => x.slug !== 'gundem').map((x) => `<option value="${x.id}"${String(f.kategori_id) === String(x.id) ? ' selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label>
<label class="fld">Ayrıntılar<textarea name="metin" required minlength="20" maxlength="4000" rows="7" placeholder="Bitkinin yaşı, saksı boyu, sulama sıklığı, ışık durumu…">${esc(f.metin || '')}</textarea></label>
<div class="fld"><span>Fotoğraf <em class="muted" style="font-style:normal;font-weight:400">(isteğe bağlı, en fazla ${SORU_FOTO_MAX})</em></span><label class="foto-sec"><input type="file" name="foto" accept="image/jpeg,image/png,image/webp" multiple data-foto="soru" data-max="${SORU_FOTO_MAX}">${IK('i-image')}<span>Bitkinin genel hâli ve sorunlu yaprağın yakından fotoğrafı</span></label><div class="foto-on" aria-live="polite"></div><small class="muted">Fotoğraflar yüklenmeden önce küçültülür, konum bilgisi silinir. Yüz, adres ya da kişisel bilgi içeren fotoğraf eklemeyin.</small></div>
<p class="muted" style="font-size:12.5px">${d === 'onayli' ? '' : 'İlk sorularınız kısa bir kontrolden sonra yayınlanır. '}Başka site bağlantısı eklemeyin, ilaç dozu sormayın.</p>
<button class="btn btn-g">Soruyu Gönder</button></form></div></div>
<aside class="side"><div class="box yn-ipucu"><h3>${IK('i-bulb')}Hızlı ve doğru cevap için</h3><ul><li>Bitkinin adını yazın, bilmiyorsanız fotoğraf ekleyin</li><li>Belirtinin ne zaman başladığını anlatın</li><li>Sulama sıklığını, ışığı ve bitkinin yerini belirtin</li><li>Son yaptığınız değişikliği yazın: saksı, gübre, yer</li></ul></div>
<div class="box"><h3>Örnek iyi soru</h3><p class="yn-ornek"><b>Limon ağacımın yaprakları sararıp dökülüyor</b>3 yaşında, 30 litrelik saksıda, güney balkonda. Haftada iki kez suluyorum. Yapraklar iki haftadır alt dallardan başlayarak sararıyor. Geçen ay saksısını değiştirdim.</p></div>
<div class="box"><h3>Topluluk kuralları</h3><ul class="rules"><li>Başka site bağlantısı eklemeyin.</li><li>İlaç dozu sormayın ve yazmayın; ürün etiketine ve yetkili kişilere başvurun.</li><li>Telefon, adres gibi kişisel bilgileri paylaşmayın.</li></ul></div></aside></div></main>`;
  return sayfa(c, { baslik: 'Soru Sor', yol: '/soru-cevap/sor', aktif: 'sc', govde, noindex: true });
}

export async function soruSayfa(c, id) {
  const s = await c.db.prepare('SELECT s.*, u.ad uad, u.rol urol, u.foto ufoto, u.onayli uon, k.ad kad, k.slug kslug FROM b_soru s JOIN b_uye u ON u.id = s.uye_id LEFT JOIN b_kategori k ON k.id = s.kategori_id WHERE s.id = ?').bind(id).first();
  const sahip = s && c.uye && c.uye.id === s.uye_id, ekip = yetkili(c.uye, 'moderasyon');
  // Aynı başlıkla iki kez eklenmiş derleme sorunun kopyası: adres asıl soruya kalıcı yönlenir
  if (s && s.durum === 'kopya') {
    const asil = await c.db.prepare("SELECT id, slug FROM b_soru WHERE baslik = ? AND durum = 'onayli' ORDER BY id LIMIT 1").bind(s.baslik).first();
    if (asil) return new Response(null, { status: 301, headers: { Location: soruUrl(c, asil), 'Cache-Control': 'public, max-age=3600' } });
  }
  if (!s || (s.durum !== 'onayli' && !sahip && !ekip)) return bulunamadi(c);
  if (c.url.pathname !== soruUrl(c, s) && s.durum === 'onayli') return yonlendir(soruUrl(c, s));
  // Eski kayıtlar da düzgün görünsün: başlık ve metin gösterimde biçim olarak düzeltilir (veritabanı değişmez)
  s.baslik = soruBaslikDuzelt(s.baslik); s.metin = soruMetinDuzelt(s.metin);
  const cevaplar = (await c.db.prepare("SELECT a.*, u.ad uad, u.rol urol, u.foto ufoto, u.onayli uon FROM b_cevap a JOIN b_uye u ON u.id = a.uye_id WHERE a.soru_id = ? AND (a.durum = 'onayli' OR (a.durum = 'bekliyor' AND a.uye_id = ?)) ORDER BY (a.id = ?) DESC, a.oy DESC, a.ts ASC").bind(s.id, c.uye ? c.uye.id : -1, s.cozum_id || 0).all()).results;
  let benzer = (await c.db.prepare("SELECT id, slug, baslik, cevap_sayisi, cozum_id FROM b_soru WHERE durum = 'onayli' AND id != ? AND kategori_id IS ? ORDER BY cozum_id IS NULL, ts DESC LIMIT 5").bind(s.id, s.kategori_id).all()).results;
  if (benzer.length < 3) benzer = benzer.concat((await c.db.prepare("SELECT id, slug, baslik, cevap_sayisi, cozum_id FROM b_soru WHERE durum = 'onayli' AND id != ? AND kategori_id IS NOT ? ORDER BY ts DESC LIMIT ?").bind(s.id, s.kategori_id, 5 - benzer.length).all()).results);
  const fotolar = (await c.db.prepare("SELECT id FROM b_dosya WHERE tur = 'soru' AND hedef = ? AND durum = 'aktif' ORDER BY ts LIMIT 3").bind(s.id).all()).results;
  const U = await c.U();
  const recs = oneriler(U, { slug: 'soru-' + s.id, baslik: s.baslik, ozet: s.metin, govde: s.kad || '' }, { n: 2 });
  const ilgili = await yazilar(c, 'AND (y.baslik LIKE ? OR y.etiketler LIKE ? OR y.kategori_id IS ?)', ['%' + (s.baslik.split(/\s+/).find((w) => w.length > 4) || s.baslik) + '%', '%' + (s.kad || '-') + '%', s.kategori_id], 'ORDER BY y.okunma DESC LIMIT 3');
  const oyForm = (tur, hedef, deger, icon, etiket) => `<form method="post" action="${L(c, '/api/oy')}"><input type="hidden" name="tur" value="${tur}"><input type="hidden" name="hedef" value="${hedef}"><input type="hidden" name="deger" value="${deger}"><input type="hidden" name="geri" value="${esc(c.url.pathname)}"><button aria-label="${etiket}">${IK(icon)}</button></form>`;
  const gS = guven({ rol: s.urol, onayli: s.uon }, c.A);
  const kim = (ad, rol, g, ts, ek = '', derleme = 0, foto = null) => `<div class="sq-kim">${derleme ? soranAv(c, { derleme: 1 }) : avatar(c, ad, avR({ urol: rol, uad: ad, derleme }), foto)}<div><b>${esc(ad)}</b>${g && g.etiket ? ` <span class="${g.etiket}">${esc(g.ad)}</span>` : ''}<small>${goreli(ts)}${ek}</small></div></div>`;
  const cevapHtml = (a) => {
    const g = guven({ rol: a.urol, onayli: a.uon }, c.A), coz = a.id === s.cozum_id;
    return `<div class="sa${coz ? ' coz' : ''}" id="c${a.id}">${coz ? `<div class="sa-coz">${IK('i-check')}Çözüm olarak işaretlendi</div>` : ''}
<div class="sa-ust">${kim(a.uad, a.urol, g, a.ts, '', 0, a.ufoto)}${a.durum === 'bekliyor' ? '<span class="st wait">Onay bekliyor · yalnız siz görüyorsunuz</span>' : ''}</div>
<div class="sa-metin">${duzMetin(a.metin)}</div>
${a.durum === 'onayli' ? `<div class="sa-alt"><span class="sa-soru">Bu cevap işinize yaradı mı?</span><span class="vote">${oyForm('cevap', a.id, 1, 'i-up', 'Faydalı')}<b>${a.oy}</b>${oyForm('cevap', a.id, -1, 'i-dn', 'Faydalı değil')}</span>${(sahip || ekip) && !coz ? `<form method="post" action="${L(c, '/api/cozum')}"><input type="hidden" name="soru_id" value="${s.id}"><input type="hidden" name="cevap_id" value="${a.id}"><button class="lnk">✓ Çözüm olarak işaretle</button></form>` : ''}</div>` : ''}</div>`;
  };
  const durumEt = s.durum !== 'onayli' ? '<span class="qk-d bek">Onay bekliyor</span>' : s.cozum_id ? '<span class="qk-d ok">✓ Çözüldü</span>' : s.cevap_sayisi ? '' : '<span class="qk-d bek">Cevap bekliyor</span>';
  const onayliN = cevaplar.filter((a) => a.durum === 'onayli').length;
  const govde = `<main class="wrap">${flash(c)}
<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <a href="${L(c, '/soru-cevap')}">Soru-Cevap</a>${s.kad ? ` › <a href="${L(c, '/soru-cevap')}?konu=${esc(s.kslug)}">${esc(s.kad)}</a>` : ''}</div>
<div class="layout"><div class="col sc-col">
<article class="sq">
<div class="qk-ust">${s.kad ? `<a class="qk-kat" href="${L(c, '/soru-cevap')}?konu=${esc(s.kslug)}">${esc(s.kad)}</a>` : ''}${durumEt}</div>
<h1>${esc(s.baslik)}</h1>
${s.derleme ? kim(soran(s), 'uye', null, s.ts, ` · ${binlik(s.goruntulenme)} görüntülenme`, 1) : kim(s.uad, s.urol, gS, s.ts, ` · ${binlik(s.goruntulenme)} görüntülenme`, 0, s.ufoto)}
<div class="sq-metin">${duzMetin(s.metin)}</div>
${fotolar.length ? `<div class="sq-foto">${fotolar.map((f, i) => `<a href="${fotoUrl(c.base, f.id)}" target="_blank" rel="noopener"><img src="${fotoUrl(c.base, f.id)}" alt="${esc(s.baslik)} – fotoğraf ${i + 1}" loading="lazy" decoding="async"></a>`).join('')}</div>` : ''}
${s.derleme ? '<p class="derleme">Bu soru, müşteri hizmetlerimize sık gelen sorulardan derlenmiştir.</p>' : ''}
${s.durum === 'onayli' ? `<div class="sq-alt"><span class="vote" title="Bu soru faydalı mı?">${oyForm('soru', s.id, 1, 'i-up', 'Faydalı soru')}<b>${s.oy}</b>${oyForm('soru', s.id, -1, 'i-dn', 'Faydalı değil')}</span><div class="yz-paylas sq-paylas" data-paylas aria-label="Paylaş"><a href="https://wa.me/?text=" data-p="wa" aria-label="WhatsApp'ta paylaş" rel="noopener" target="_blank">${IK('i-wa')}</a><a href="#" data-p="kopya" aria-label="Bağlantıyı kopyala">${IK('i-link')}</a></div></div>` : ''}
</article>
<h2 class="sc-bl">${onayliN ? `${onayliN} Cevap` : 'Henüz cevap yok'}</h2>
${cevaplar.map(cevapHtml).join('') || '<p class="muted" style="font-size:14px">Deneyiminiz varsa ilk cevabı siz yazın.</p>'}
${s.durum === 'onayli' ? (c.uye ? `<form class="cform" method="post" action="${L(c, '/api/cevap')}"><b style="font-size:15px">Cevabınızı yazın</b><input type="hidden" name="soru_id" value="${s.id}"><label class="sr" for="an">Cevabınız</label><textarea id="an" name="metin" required minlength="10" maxlength="4000" placeholder="Deneyiminizi paylaşın. Başka site bağlantısı eklemeyin, ilaç dozu yazmayın."></textarea><div class="row"><small>${paylasimDurumu(c.uye, '', c.A).durum === 'onayli' ? (ekip ? 'Cevabınız HasTürk ekibi cevabı olarak görünür.' : '') : 'İlk cevaplarınız kısa bir kontrolden sonra yayınlanır.'}</small><button class="btn btn-g">Gönder</button></div></form>`
    : `<div class="cform"><b style="font-size:15px">Cevabınızı yazın</b><div class="row"><small>Cevap yazmak için üye girişi gerekir.</small><a class="btn btn-g" href="${L(c, '/giris')}?geri=${encodeURIComponent(c.url.pathname)}">Giriş Yap / Üye Ol</a></div></div>`) : ''}
</div>
<aside class="side">
${benzer.length ? `<div class="box"><h3>Benzer Sorular</h3><div class="sc-benzer">${benzer.map((x) => `<a href="${soruUrl(c, x)}"><span>${esc(soruBaslikDuzelt(x.baslik))}</span><small>${x.cozum_id ? '✓ Çözüldü · ' : ''}${x.cevap_sayisi} cevap</small></a>`).join('')}</div><a class="more" href="${L(c, '/soru-cevap')}${s.kslug ? '?konu=' + esc(s.kslug) : ''}" style="margin-top:10px">Tüm sorular ${IK('i-arrow')}</a></div>` : ''}
${ilgili.length ? `<div class="box"><h3>Bu Konuda Yazılar</h3>${rank(c, ilgili, false)}</div>` : ''}
${recs.length ? `<div class="box"><h3>İlgili Ürünler</h3><div class="rec-side">${recs.map((p) => kartRs(U, c.base, p, 'soru')).join('')}</div></div>` : ''}
<div class="box sc-cta"><h3>Sizin de sorunuz mu var?</h3><p>Bahçe severler ve HasTürk ekibi cevaplasın.</p><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}">Soru Sor</a></div>
</aside></div></main>`;
  if (s.durum === 'onayli' && !botMu(c.req)) c.ctx.waitUntil(c.db.prepare('UPDATE b_soru SET goruntulenme = goruntulenme + 1 WHERE id = ?').bind(s.id).run().catch(() => {}));
  const onayli = cevaplar.filter((a) => a.durum === 'onayli');
  return sayfa(c, { baslik: s.baslik, seoBaslik: soruSeoBaslik(s.baslik, c.A.site_adi || 'HasTürk Blog'), aciklama: soruAciklama(s, onayli), yol: '/soru-cevap/' + s.id + '-' + s.slug, aktif: 'sc', govde, noindex: s.durum !== 'onayli' || !onayli.length,
    jsonld: s.durum === 'onayli' && onayli.length ? [soruJsonLd(c, s, onayli, fotolar.map((f) => (c.A.site_url || '') + '/dosya/' + f.id)), kirintiJsonLd(c, [['Soru-Cevap', '/soru-cevap'], [s.baslik, '/soru-cevap/' + s.id + '-' + s.slug]])] : [] });
}

// ---------- Arama ----------
export async function aramaSayfa(c) {
  const q = (c.url.searchParams.get('q') || '').trim().slice(0, 80);
  const kat = c.kat.find((k) => k.slug === c.url.searchParams.get('kat'));
  let ylist = [], slist = [];
  if (norm(q).length >= 2) {
    [ylist, slist] = await Promise.all([yaziAra(c.db, q, { kat: kat ? kat.id : null, n: 24 }), soruAra(c.db, q, { n: 6 })]);
    if (slist.length) {
      const ids = slist.map((s) => s.id);
      const ek = (await c.db.prepare(`SELECT s.id, s.derleme, u.ad uad, u.rol urol, u.foto ufoto, ${CEVAP_ONIZLEME} FROM b_soru s JOIN b_uye u ON u.id = s.uye_id${CEVAP_JOIN} WHERE s.id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
      const m = Object.fromEntries(ek.map((x) => [x.id, x]));
      slist = slist.map((s) => ({ ...s, ...(m[s.id] || {}), kad: s.kad }));
    }
    if (!botMu(c.req)) c.ctx.waitUntil(say(c.db, 'arama', q.toLocaleLowerCase('tr-TR')).catch(() => {}));
  }
  const toplam = ylist.length + slist.length;
  const oneri = c.kat.filter((k) => k.menude && !k.ust_id).slice(0, 5);
  const govde = `<main class="yn">
<section class="yn-sc-bas"><div class="wrap"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>Arama</span></div>
<h1>${q ? `“${esc(q)}” için sonuçlar` : 'Blogda ara'}</h1><p class="yn-ara-ozet">${q ? (toplam ? `${ylist.length} yazı ve ${slist.length} soru bulundu${kat ? ' · ' + esc(kat.ad) : ''}.` : 'Sonuç bulunamadı.') : 'Bitki adı, sorun ya da konu yazın; örneğin “limon yaprak dökülmesi”.'}</p>
<form class="yn-ara" method="get" action="${L(c, '/ara')}" role="search">${IK('i-search')}<label class="sr" for="araq">Blogda ara</label><input id="araq" name="q" value="${esc(q)}" placeholder="Bitki, toprak, sorun… ör. yaprak sararması" data-oneri autocomplete="off"><button class="btn btn-g">Ara</button></form></div></section>
<div class="wrap">
${!q || !toplam ? `<div class="yn-bos">${q ? `<p><b>Aradığınızı bulamadık.</b> Daha kısa ya da farklı bir kelime deneyin (ör. “sarımsak” ya da “yaprak sararması”). Sorunuzu ekibimize de sorabilirsiniz.</p><a class="btn btn-g" href="${L(c, '/soru-cevap/sor')}?baslik=${encodeURIComponent(q)}">${IK('i-chat')}Bu soruyu sor</a>` : ''}
<div class="yn-hizli"><span>Konular:</span>${oneri.map((k) => `<a href="${L(c, '/kategori/' + k.slug)}">${esc(k.ad)}</a>`).join('')}<a href="${L(c, '/soru-cevap')}">Soru-Cevap</a></div></div>` : ''}
${slist.length ? `<section class="yn-bol"><div class="yn-bb"><h2>Soru-Cevap</h2><a class="more" href="${L(c, '/soru-cevap')}?q=${encodeURIComponent(q)}">Tüm sorularda ara ${IK('i-arrow')}</a></div><div class="yn-sc-l">${slist.map((s) => soruKart(c, s, true)).join('')}</div></section>` : ''}
${ylist.length ? `<section class="yn-bol"><div class="yn-bb"><h2>Yazılar</h2></div><div class="yn-yazilar">${ylist.map((y) => postKart(c, y)).join('')}</div></section>` : ''}
${q && toplam ? `<div class="yn-bos alt"><p>Aradığınız cevabı bulamadınız mı? Sorunuzu yazın, HasTürk ekibi cevaplasın.</p><a class="btn btn-o" href="${L(c, '/soru-cevap/sor')}?baslik=${encodeURIComponent(q)}">${IK('i-chat')}Soru sor</a></div>` : ''}
</div></main>`;
  return sayfa(c, { baslik: q ? `“${q}” araması` : 'Arama', yol: '/ara', govde, noindex: true });
}

// Yazarken öneri: başlıkla eşleşen ilk yazılar ve sorular (JSON)
export async function aramaOneri(c) {
  const q = (c.url.searchParams.get('q') || '').trim().slice(0, 80);
  const tur = c.url.searchParams.get('tur');
  if (norm(q).length < 2) return new Response('{"y":[],"s":[]}', { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const [y, s] = await Promise.all([tur === 'soru' ? [] : yaziAra(c.db, q, { n: 5, siki: true }), soruAra(c.db, q, { n: tur === 'soru' ? 5 : 3, siki: true })]);
  const j = { y: y.map((x) => ({ u: yaziUrl(c, x), b: x.baslik, k: x.kad || '', g: x.gorsel || '' })), s: s.map((x) => ({ u: soruUrl(c, x), b: soruBaslikDuzelt(x.baslik), n: x.cevap_sayisi, z: x.cozum_id ? 1 : 0 })) };
  return new Response(JSON.stringify(j), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex' } });
}

// ---------- Sabit sayfalar ----------
const SABIT = {
  hakkimizda: ['Hakkımızda', 'hakkimizda'], 'topluluk-kurallari': ['Topluluk Kuralları', 'kurallar'],
  gizlilik: ['Gizlilik ve KVKK Aydınlatma Metni', 'kvkk'], 'uyelik-sozlesmesi': ['Üyelik ve Kullanım Sözleşmesi', 'sozlesme'],
  'cerez-politikasi': ['Çerez Politikası', 'cerez'],
};
const YASAL = [['uyelik-sozlesmesi', 'Üyelik Sözleşmesi'], ['gizlilik', 'KVKK Aydınlatma Metni'], ['cerez-politikasi', 'Çerez Politikası'], ['topluluk-kurallari', 'Topluluk Kuralları']];
export function sabitVar(slug) { return slug in SABIT; }
export function sabitSayfa(c, slug) {
  const [ad, k] = SABIT[slug];
  const metin_ = String(c.A[k] || '');
  if (k === 'hakkimizda') {
    const govde = `<main class="wrap" style="max-width:820px"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>${esc(ad)}</span></div>
<article class="qd sayfa-metin"><h1>${esc(ad)}</h1>${duzMetin(metin_)}
<p><a class="btn btn-g" href="${esc(c.A.magaza_url)}" rel="noopener">HasTürk Mağaza'yı Ziyaret Edin ${IK('i-arrow')}</a></p></article></main>`;
    return sayfa(c, { baslik: ad, aciklama: kirp(metin_, 155), yol: '/' + slug, aktif: 'hakkimizda', govde });
  }
  const t = Date.parse(c.A.hukuk_tarih || '');
  const tarih = t ? trTarih(t) : '';
  let ic, toc = [];
  if (k === 'kurallar') {
    ic = `<p class="hk-giris">HasTürk Blog topluluğu, bitki seven herkesin birbirine güvenle danışabildiği bir yer olsun diye bu kurallar var. Paylaşım yapan her üye bu kuralları kabul etmiş sayılır.</p><ol class="hk-kural">${metin_.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
  } else {
    const r = render(hukukDoldur(metin_, c.A).replace(/\]\(\//g, '](' + c.base + '/'));
    ic = r.html; toc = r.basliklar;
  }
  const govde = `<main class="wrap hk-wrap"><div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>${esc(ad)}</span></div>
<div class="hk-layout">
<article class="hk">
<header class="hk-bas"><span class="hk-tur">Yasal Bilgilendirme</span><h1>${esc(ad)}</h1>${tarih ? `<p class="hk-tarih">Son güncelleme: <time datetime="${esc(c.A.hukuk_tarih)}">${tarih}</time></p>` : ''}</header>
${toc.length > 2 ? `<details class="hk-toc-m"><summary>İçindekiler</summary><ol>${toc.map((h) => `<li><a href="#${h.id}">${esc(h.metin.replace(/^\d+\.\s*/, ''))}</a></li>`).join('')}</ol></details>` : ''}
<div class="hk-metin prose">${ic}</div>
<footer class="hk-alt"><button type="button" class="btn btn-o" onclick="window.print()">Yazdır / PDF olarak kaydet</button><span>Sorularınız için <a href="${L(c, '/gizlilik')}#b1">iletişim bilgilerimizi</a> kullanabilirsiniz.</span></footer>
</article>
<aside class="hk-yan">
${toc.length > 2 ? `<nav class="box hk-toc" aria-label="İçindekiler"><h3>İçindekiler</h3><ol>${toc.map((h) => `<li><a href="#${h.id}">${esc(h.metin.replace(/^\d+\.\s*/, ''))}</a></li>`).join('')}</ol></nav>` : ''}
<nav class="box hk-diger" aria-label="Diğer yasal metinler"><h3>Yasal Metinler</h3>${YASAL.map(([sl, a]) => `<a href="${L(c, '/' + sl)}"${sl === slug ? ' class="on" aria-current="page"' : ''}>${esc(a)}</a>`).join('')}</nav>
</aside></div></main>`;
  return sayfa(c, { baslik: ad, aciklama: kirp(duz(hukukDoldur(metin_, c.A)), 155), yol: '/' + slug, govde });
}

// ---------- Giriş / kayıt / hesap ----------
function guvenliGeri(c, g) {
  g = String(g || '');
  return g.startsWith(c.base + '/') && !g.startsWith('//') && !/[\r\n]/.test(g) ? g : L(c);
}
// Giriş ve üye ol aynı kartta, iki sekme (sayfada pencere olarak açılır; /giris adresi betiksiz yedek)
function girisKart(c, mod, hata, f, pencere) {
  const geri = esc(f.geri || c.url.searchParams.get('geri') || (pencere ? c.url.pathname + c.url.search : ''));
  const kay = mod === 'kayit';
  const hp = '<div class="hp" aria-hidden="true"><label>Web sitesi<input name="web" tabindex="-1" autocomplete="off"></label></div>';
  const id = pencere ? 'p' : 's';
  return `<div class="gkart">${pencere ? '<button type="button" class="kapat" data-kapat aria-label="Kapat">×</button>' : ''}
<img src="/blog-statik/logo.webp" alt="HasTürk" width="124" height="32" style="height:32px;width:auto">
<div class="gsek" role="tablist"><button type="button" role="tab" data-sekme="giris"${kay ? '' : ' class="on" aria-selected="true"'}>Giriş Yap</button><button type="button" role="tab" data-sekme="kayit"${kay ? ' class="on" aria-selected="true"' : ''}>Üye Ol</button></div>
${hataKutu(hata)}
<form method="post" action="${L(c, '/giris')}" data-form="giris"${pencere ? ' novalidate' : ''}${kay ? ' hidden' : ''}>
<input type="hidden" name="geri" value="${geri}">${hp}
<label class="fld">E-posta<input type="email" name="eposta" id="${id}ge" required value="${esc(kay ? '' : f.eposta || '')}" autocomplete="email"></label>
<label class="fld">Şifre<span class="sifre"><input type="password" name="sifre" required autocomplete="current-password"><button type="button" class="goster" data-goster aria-label="Şifreyi göster">Göster</button></span></label>
<button class="btn btn-g">Giriş Yap</button>
<p class="not">Yorum yapmak ve soru sormak için giriş yapın. Yazıları okumak için üyelik gerekmez.</p></form>
<form method="post" action="${L(c, '/kayit')}" data-form="kayit"${pencere ? ' novalidate' : ''}${kay ? '' : ' hidden'}>
<input type="hidden" name="geri" value="${geri}">${hp}
<label class="fld">Ad soyad (sitede görünür)<input name="ad" required minlength="2" maxlength="40" value="${esc(f.ad || '')}" placeholder="ör. Ayşe K." autocomplete="nickname"></label>
<label class="fld">E-posta<input type="email" name="eposta" required value="${esc(kay ? f.eposta || '' : '')}" autocomplete="email"></label>
<label class="fld">Şifre<span class="sifre"><input type="password" name="sifre" required minlength="8" placeholder="En az 8 karakter" autocomplete="new-password"><button type="button" class="goster" data-goster aria-label="Şifreyi göster">Göster</button></span></label>
<label class="kv"><input type="checkbox" name="kvkk" value="1" required> <span><a href="${L(c, '/uyelik-sozlesmesi')}" target="_blank">Üyelik Sözleşmesi</a>'ni okudum ve kabul ediyorum. Kişisel verilerimin işlenmesine ilişkin <a href="${L(c, '/gizlilik')}" target="_blank">Aydınlatma Metni</a>'ni okudum.</span></label>
<button class="btn btn-g">Üye Ol</button></form></div>`;
}
export function girisSayfa(c, mod = 'giris', hata = '', f = {}) {
  if (c.uye && c.req.method === 'GET') return yonlendir(guvenliGeri(c, c.url.searchParams.get('geri')));
  const govde = `<main class="wrap"><div class="gsayfa">${girisKart(c, mod, hata, f, false)}</div></main>`;
  return sayfa(c, { baslik: mod === 'kayit' ? 'Üye Ol' : 'Giriş Yap', yol: mod === 'kayit' ? '/kayit' : '/giris', govde, noindex: true, durum: hata ? 400 : 200, girisYok: true });
}

export async function girisPost(c, mod) {
  const f = await formOku(c.req);
  if (f.web) return yonlendir(L(c)); // bal tuzağı: botlar gizli alanı doldurur
  const ipk = await sha256((c.req.headers.get('CF-Connecting-IP') || '') + (c.A.ip_tuz || ''));
  if (mod === 'kayit') {
    if (!f.kvkk) return girisSayfa(c, 'kayit', 'Devam etmek için Üyelik Sözleşmesi\'ni onaylayın.', f);
    if (!(await sinir(c.db, 'kayit:' + ipk, 5, 3600))) return girisSayfa(c, 'kayit', 'Çok fazla deneme yapıldı. Bir saat sonra tekrar deneyin.', f);
    const r = await kayit(c.db, f);
    if (r.hata) return girisSayfa(c, 'kayit', r.hata, f);
    const cerez = await oturumAc(c.db, r.id);
    bildir(c, 'hosgeldin', r.id);
    const g = guvenliGeri(c, f.geri);
    return yonlendir(g + (g.includes('?') ? '&' : '?') + 'm=hos', { 'Set-Cookie': cerez });
  }
  if (!(await sinir(c.db, 'giris:' + ipk, 10, 900))) return girisSayfa(c, 'giris', 'Çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.', f);
  const r = await giris(c.db, f);
  if (r.hata) return girisSayfa(c, 'giris', r.hata, f);
  return yonlendir(guvenliGeri(c, f.geri), { 'Set-Cookie': await oturumAc(c.db, r.id) });
}

export async function cikis(c) {
  return yonlendir(L(c) + '?m=cikis', { 'Set-Cookie': await oturumKapat(c.db, c.uye) });
}

export async function hesabimPost(c) {
  if (!c.uye) return yonlendir(L(c, '/giris'));
  const f = await formOku(c.req);
  const islem = [].concat(f.islem || []), sil = islem.includes('foto_sil');
  if (sil || islem.includes('foto')) {
    const eski = c.uye.foto;
    if (sil) {
      await c.db.prepare('UPDATE b_uye SET foto = NULL WHERE id = ?').bind(c.uye.id).run();
    } else {
      const dosya = f._dosya && f._dosya.foto && f._dosya.foto[0];
      if (!(await sinir(c.db, 'foto:' + c.uye.id, 30, 86400))) return yonlendir(L(c, '/hesabim') + '?m=foto_sinir');
      const k = await fotoKaydet(c.db, { dosya, uye_id: c.uye.id, tur: 'profil' });
      if (k.hata) return yonlendir(L(c, '/hesabim') + '?m=foto_hata');
      await c.db.prepare('UPDATE b_uye SET foto = ? WHERE id = ?').bind(k.id, c.uye.id).run();
    }
    if (eski) await c.db.prepare("UPDATE b_dosya SET durum = 'silindi', veri = x'' WHERE id = ? AND uye_id = ?").bind(eski, c.uye.id).run();
    return yonlendir(L(c, '/hesabim') + '?m=' + (sil ? 'foto_silindi' : 'foto_ok'));
  }
  await c.db.prepare('UPDATE b_uye SET bildirim = ? WHERE id = ?').bind(f.bildirim ? 1 : 0, c.uye.id).run();
  return yonlendir(L(c, '/hesabim') + '?m=kaydedildi');
}
export async function hesabimSayfa(c) {
  if (!c.uye) return yonlendir(L(c, '/giris') + '?geri=' + encodeURIComponent(L(c, '/hesabim')));
  const u = c.uye, g = guven(u, c.A);
  const [ym, sr] = await Promise.all([
    c.db.prepare('SELECT m.*, y.slug, y.baslik FROM b_yorum m JOIN b_yazi y ON y.id = m.yazi_id WHERE m.uye_id = ? ORDER BY m.ts DESC LIMIT 20').bind(u.id).all(),
    c.db.prepare('SELECT * FROM b_soru WHERE uye_id = ? ORDER BY ts DESC LIMIT 20').bind(u.id).all(),
  ]);
  const dt = (d) => d === 'onayli' ? '<span class="st ok">Yayında</span>' : d === 'bekliyor' ? '<span class="st wait">Onay bekliyor</span>' : '<span class="st">Yayınlanmadı</span>';
  const govde = `<main class="wrap" style="max-width:900px">${flash(c)}<div class="crumb"><a href="${L(c)}">Ana Sayfa</a> › <span>Hesabım</span></div>
<div class="qd"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${avatar(c, u.ad, renk(u.ad), u.foto, ' style="width:72px;height:72px;font-size:24px"')}<div><h1 style="font-size:22px">${esc(u.ad)}</h1><p class="muted" style="font-size:13px">${esc(u.eposta)} · ${g ? esc(g.ad) : ''} · üyelik: ${trTarih(u.olus_ts)}</p></div><span style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">${yetkili(u, 'panel') ? `<a class="btn btn-o" href="${L(c, '/panel')}">Yönetim Paneli</a>` : ''}<a class="btn btn-o" href="${L(c, '/cikis')}">Çıkış Yap</a></span></div></div>
<form class="box profil-f" method="post" action="${L(c, '/hesabim')}" enctype="multipart/form-data" style="margin-top:16px"><input type="hidden" name="islem" value="foto"><div><b>Profil fotoğrafı</b><br><small class="muted">Sorularınızda, cevaplarınızda ve yorumlarınızda adınızın yanında görünür. Fotoğraf küçültülür, konum bilgisi silinir.</small></div><label class="foto-sec kucuk"><input type="file" name="foto" accept="image/jpeg,image/png,image/webp" required data-foto="profil" data-oto-gonder>${IK('i-image')}<span>${u.foto ? 'Fotoğrafı değiştir' : 'Fotoğraf seç'}</span></label>${u.foto ? `<button class="btn btn-o btn-s" formaction="${L(c, '/hesabim')}" formnovalidate name="islem" value="foto_sil">Kaldır</button>` : ''}<noscript><button class="btn btn-g btn-s">Yükle</button></noscript></form>
<form class="box bildirim-f" method="post" action="${L(c, '/hesabim')}" style="margin-top:12px"><label class="kv"><input type="checkbox" name="bildirim" value="1"${u.bildirim === 0 ? '' : ' checked'} data-oto-gonder> <span><b>E-posta bildirimleri</b><br><small class="muted">Sorunuz yayınlandığında ve sorunuza cevap geldiğinde e-posta alın.</small></span></label><button class="btn btn-o btn-s">Kaydet</button></form>
<div class="sh" style="margin-top:22px"><div><h2>${IK('i-chat')}Sorularım</h2></div><a class="more" href="${L(c, '/soru-cevap/sor')}">Yeni Soru ${IK('i-arrow')}</a></div>
${sr.results.length ? `<div class="box" style="padding:2px 16px">${sr.results.map((s) => `<a class="qrow" style="grid-template-columns:minmax(0,1fr) auto auto" href="${soruUrl(c, s)}"><div><b>${esc(s.baslik)}</b><small>${goreli(s.ts)}</small></div><div class="cnt"><b>${s.cevap_sayisi}</b><br>cevap</div>${dt(s.durum)}</a>`).join('')}</div>` : '<p class="muted">Henüz soru sormadınız.</p>'}
<div class="sh" style="margin-top:22px"><div><h2>${IK('i-chat')}Yorumlarım</h2></div></div>
${ym.results.length ? `<div class="box" style="padding:2px 16px">${ym.results.map((m) => `<a class="qrow" style="grid-template-columns:minmax(0,1fr) auto" href="${L(c, '/' + m.slug)}#y${m.id}"><div><b>${esc(kirp(m.metin, 90))}</b><small>${esc(m.baslik)} · ${goreli(m.ts)}</small></div>${dt(m.durum)}</a>`).join('')}</div>` : '<p class="muted">Henüz yorum yazmadınız.</p>'}
</main>`;
  return sayfa(c, { baslik: 'Hesabım', yol: '/hesabim', govde, noindex: true });
}

// ---------- Paylaşım işlemleri (POST) ----------
function geriMesaj(c, yol, m, hash = '') { return yonlendir(guvenliGeri(c, yol) + (m ? '?m=' + m : '') + hash); }

export async function yorumPost(c) {
  if (!c.uye) return yonlendir(L(c, '/giris'));
  const f = await formOku(c.req);
  const y = await c.db.prepare(`SELECT id, slug FROM b_yazi WHERE id = ? AND ${YAYINDA}`).bind(Number(f.yazi_id) || 0, Date.now()).first();
  if (!y) return bulunamadi(c);
  const metin_ = String(f.metin || '').trim().slice(0, 3000);
  const yol = L(c, '/' + y.slug);
  if (metin_.length < 5) return geriMesaj(c, yol, 'kisa', '#yorumlar');
  if (!(await sinir(c.db, 'yorum:' + c.uye.id, 10, 3600))) return geriMesaj(c, yol, 'hiz', '#yorumlar');
  let ust = Number(f.ust_id) || null;
  if (ust && !(await c.db.prepare("SELECT 1 FROM b_yorum WHERE id = ? AND yazi_id = ? AND ust_id IS NULL AND durum = 'onayli'").bind(ust, y.id).first())) ust = null;
  const d = paylasimDurumu(c.uye, metin_, c.A);
  const r = await c.db.prepare('INSERT INTO b_yorum (yazi_id, uye_id, ust_id, metin, durum, neden, ts) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(y.id, c.uye.id, ust, metin_, d.durum, d.neden || null, Date.now()).run();
  return geriMesaj(c, yol, d.durum === 'onayli' ? 'yorum_ok' : 'yorum_bekliyor', '#y' + r.meta.last_row_id);
}

export async function soruPost(c) {
  if (!c.uye) return yonlendir(L(c, '/giris'));
  const f = await formOku(c.req);
  // Ziyaretçinin yazdığı başlık ve metin biçim olarak düzeltilir (büyük harf kilidi, Türkçe harf, noktalama, soru işareti)
  const baslik = soruBaslikDuzelt(String(f.baslik || '').slice(0, 160)).slice(0, 140), metin_ = soruMetinDuzelt(String(f.metin || '').slice(0, 4000));
  if (baslik.length < 10) return soruSorSayfa(c, 'Soru başlığı en az 10 karakter olmalı.', f);
  if (metin_.length < 20) return soruSorSayfa(c, 'Lütfen biraz daha ayrıntı yazın (en az 20 karakter).', f);
  if (!(await sinir(c.db, 'soru:' + c.uye.id, 5, 3600))) return soruSorSayfa(c, 'Çok sık soru gönderdiniz; biraz sonra tekrar deneyin.', f);
  const kat = c.kat.find((k) => k.id === Number(f.kategori_id)) || kategoriTahmin(baslik + ' ' + metin_, c.kat);
  const d = paylasimDurumu(c.uye, baslik + ' ' + metin_, c.A);
  const now = Date.now();
  const dosyalar = ((f._dosya && f._dosya.foto) || []).slice(0, SORU_FOTO_MAX);
  if (dosyalar.length && !(await sinir(c.db, 'foto:' + c.uye.id, 30, 86400))) return soruSorSayfa(c, 'Bugün için fotoğraf yükleme sınırına ulaştınız; soruyu fotoğrafsız gönderebilirsiniz.', f);
  const r = await c.db.prepare('INSERT INTO b_soru (slug, baslik, metin, uye_id, kategori_id, durum, neden, ts, son_ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(slugYap(baslik), baslik, metin_, c.uye.id, kat ? kat.id : null, d.durum, d.neden || null, now, now).run();
  let fotoHata = '';
  for (const dosya of dosyalar) { const k = await fotoKaydet(c.db, { dosya, uye_id: c.uye.id, tur: 'soru', hedef: r.meta.last_row_id }); if (k.hata) fotoHata = k.hata; }
  if (d.durum === 'onayli') bildir(c, 'soru', c.uye.id, { soru: baslik, baglanti: soruTamUrl(c, { id: r.meta.last_row_id, slug: slugYap(baslik) }) });
  return yonlendir(L(c, '/soru-cevap/' + r.meta.last_row_id + '-' + slugYap(baslik)) + '?m=' + (fotoHata ? 'foto_hata' : d.durum === 'onayli' ? 'soru_ok' : 'soru_bekliyor'));
}

export async function cevapPost(c) {
  if (!c.uye) return yonlendir(L(c, '/giris'));
  const f = await formOku(c.req);
  const s = await c.db.prepare("SELECT id, slug, baslik, uye_id FROM b_soru WHERE id = ? AND durum = 'onayli'").bind(Number(f.soru_id) || 0).first();
  if (!s) return bulunamadi(c);
  const yol = L(c, '/soru-cevap/' + s.id + '-' + s.slug);
  const metin_ = String(f.metin || '').trim().slice(0, 4000);
  if (metin_.length < 10) return geriMesaj(c, yol, 'kisa');
  if (!(await sinir(c.db, 'cevap:' + c.uye.id, 15, 3600))) return geriMesaj(c, yol, 'hiz');
  const d = paylasimDurumu(c.uye, metin_, c.A);
  const ekip = yetkili(c.uye, 'ekip_cevap') ? 1 : 0;
  const now = Date.now();
  const r = await c.db.prepare('INSERT INTO b_cevap (soru_id, uye_id, metin, ekip, durum, neden, ts) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(s.id, c.uye.id, metin_, ekip, d.durum, d.neden || null, now).run();
  if (d.durum === 'onayli') await c.db.prepare("UPDATE b_soru SET cevap_sayisi = (SELECT COUNT(*) FROM b_cevap WHERE soru_id = ? AND durum = 'onayli'), son_ts = ? WHERE id = ?").bind(s.id, now, s.id).run();
  if (d.durum === 'onayli' && s.uye_id !== c.uye.id) bildir(c, 'cevap', s.uye_id, { soru: s.baslik, cevaplayan: c.uye.ad, cevap: kirp(metin_, 300), baglanti: soruTamUrl(c, s) + '#c' + r.meta.last_row_id });
  return geriMesaj(c, yol, d.durum === 'onayli' ? 'cevap_ok' : 'cevap_bekliyor', '#c' + r.meta.last_row_id);
}

export async function oyPost(c) {
  const f = await formOku(c.req);
  if (!c.uye) return yonlendir(L(c, '/giris') + '?geri=' + encodeURIComponent(guvenliGeri(c, String(f.geri || '').split('#')[0])));
  const tur = ['soru', 'cevap', 'yorum'].includes(f.tur) ? f.tur : null, hedef = Number(f.hedef) || 0;
  const deger = tur === 'yorum' ? 1 : Number(f.deger) === -1 ? -1 : 1;
  if (!tur || !hedef) return yonlendir(L(c));
  const tablo = { soru: ['b_soru', 'oy'], cevap: ['b_cevap', 'oy'], yorum: ['b_yorum', 'faydali'] }[tur];
  if (await sinir(c.db, 'oy:' + c.uye.id, 60, 3600)) {
    await c.db.prepare('INSERT INTO b_oy (tur, hedef, uye_id, deger) VALUES (?, ?, ?, ?) ON CONFLICT (tur, hedef, uye_id) DO UPDATE SET deger = excluded.deger').bind(tur, hedef, c.uye.id, deger).run();
    await c.db.prepare(`UPDATE ${tablo[0]} SET ${tablo[1]} = (SELECT COALESCE(SUM(deger), 0) FROM b_oy WHERE tur = ? AND hedef = ?) WHERE id = ?`).bind(tur, hedef, hedef).run();
  }
  const [yol, hash] = String(f.geri || '').split('#');
  return geriMesaj(c, yol, '', hash ? '#' + hash.replace(/[^a-z0-9]/gi, '') : '');
}

export async function cozumPost(c) {
  const f = await formOku(c.req);
  const s = await c.db.prepare('SELECT id, slug, uye_id FROM b_soru WHERE id = ?').bind(Number(f.soru_id) || 0).first();
  if (!s || !c.uye || (c.uye.id !== s.uye_id && !yetkili(c.uye, 'moderasyon'))) return bulunamadi(c);
  const a = await c.db.prepare("SELECT id FROM b_cevap WHERE id = ? AND soru_id = ? AND durum = 'onayli'").bind(Number(f.cevap_id) || 0, s.id).first();
  if (a) await c.db.prepare('UPDATE b_soru SET cozum_id = ? WHERE id = ?').bind(a.id, s.id).run();
  return geriMesaj(c, L(c, '/soru-cevap/' + s.id + '-' + s.slug), 'cozum_ok');
}

export async function bultenPost(c) {
  const f = await formOku(c.req);
  const e = String(f.eposta || '').trim().toLowerCase();
  const ipk = await sha256((c.req.headers.get('CF-Connecting-IP') || '') + (c.A.ip_tuz || ''));
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120 && (await sinir(c.db, 'bulten:' + ipk, 5, 3600))) {
    await c.db.prepare('INSERT OR IGNORE INTO b_bulten (eposta, ts) VALUES (?, ?)').bind(e, Date.now()).run();
  }
  return geriMesaj(c, f.geri, 'bulten_ok');
}

// Mağaza ve banner tıklaması: say, sonra yönlendir
export async function gitYonlendir(c, slug) {
  const U = await c.U();
  const p = U.harita.get(slug);
  const mag = String(c.A.magaza_url || 'https://hasturkgubre.com.tr').replace(/\/$/, '');
  if (!p) return yonlendir(mag);
  if (!botMu(c.req)) c.ctx.waitUntil(Promise.all([say(c.db, 'tik', slug), say(c.db, 'tik_k', c.url.searchParams.get('k') || '')]).catch(() => {}));
  // UTM: kampanya = tıklamanın yapıldığı blog yazısının adresi (Referer), içerik = karttaki yer (yazı-içi, yazı-sonu…);
  // mağazanın Analytics'inde "blog" kaynağı altında hangi yazının ne kadar satış getirdiği böyle görünür
  let yazi = 'blog';
  try { const r = new URL(c.req.headers.get('Referer') || ''); if (r.host === c.url.host) yazi = r.pathname.replace(/^\/blog/, '').replace(/^\/+|\/+$/g, '').split('/').pop() || 'anasayfa'; } catch {}
  const k = c.url.searchParams.get('k') || 'kart';
  // Blog sepetinde bekleyen ürünler (Ürün Bul, ?ua-ekle=varyant:adet,…) mağazaya birlikte taşınır
  const ek = c.url.searchParams.get('ua-ekle') || '';
  const uaEkle = /^[0-9a-f-]{8,40}:\d{1,2}(,[0-9a-f-]{8,40}:\d{1,2}){0,39}$/i.test(ek) ? `&ua-ekle=${encodeURIComponent(ek)}` : '';
  return new Response(null, { status: 302, headers: { Location: `${mag}/${p.s}?utm_source=blog&utm_medium=referral&utm_campaign=${encodeURIComponent(yazi.slice(0, 90))}&utm_content=${encodeURIComponent(k)}${uaEkle}`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
// Yazı içindeki doğrudan ürün bağlantılarına tıklama sayacı (tarayıcı sendBeacon ile bildirir)
const okunmaSay = (c, id) => Promise.all([c.db.prepare('UPDATE b_yazi SET okunma = okunma + 1 WHERE id = ?').bind(id).run(), say(c.db, 'okunma'), say(c.db, 'okuma_y', id)]).catch(() => {});
// Önceden yüklenmiş yazı gerçekten açılınca tarayıcı bildirir: yazı yayındaysa okunma bir artar (bot ve ekip sayılmaz)
export async function okunmaPost(c) {
  const id = parseInt(String(await c.req.text().catch(() => '')).trim(), 10) || 0;
  if (id && !botMu(c.req) && !(c.uye && c.uye.rol !== 'uye')) {
    const y = await c.db.prepare(`SELECT id FROM b_yazi WHERE id = ? AND ${YAYINDA}`).bind(id, Date.now()).first();
    if (y) c.ctx.waitUntil(okunmaSay(c, y.id));
  }
  return new Response(null, { status: 204 });
}
export async function tikPost(c) {
  const slug = String(await c.req.text().catch(() => '')).trim().slice(0, 200);
  const U = await c.U();
  if (slug && U.harita.has(slug) && !botMu(c.req)) c.ctx.waitUntil(Promise.all([say(c.db, 'tik', slug), say(c.db, 'tik_k', 'yazi-metin')]).catch(() => {}));
  return new Response(null, { status: 204 });
}
export async function bannerYonlendir(c, id) {
  const b = await c.db.prepare('SELECT id, link FROM b_banner WHERE id = ?').bind(Number(id) || 0).first();
  const mag = c.A.magaza_url || 'https://hasturkgubre.com.tr';
  if (!b) return yonlendir(mag);
  if (!botMu(c.req)) c.ctx.waitUntil(c.db.prepare('UPDATE b_banner SET tik = tik + 1 WHERE id = ?').bind(b.id).run().catch(() => {}));
  const link = /^(https?:\/\/|\/)/.test(b.link || '') ? b.link : mag;
  return new Response(null, { status: 302, headers: { Location: link, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}

export function bulunamadi(c) {
  const govde = `<main class="wrap"><div class="empty" style="margin:40px 0">${IK('i-leaf')}<h1 class="h2">Aradığınız sayfa bulunamadı</h1><p>Sayfa taşınmış ya da kaldırılmış olabilir.</p><div style="max-width:460px;margin:14px auto">${aramaKutu(c)}</div><a class="btn btn-g" href="${L(c)}">Ana Sayfaya Dön</a></div></main>`;
  return sayfa(c, { baslik: 'Sayfa bulunamadı', govde, noindex: true, durum: 404 });
}
export { ayniKaynak, kur };
