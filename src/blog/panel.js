// Blog yönetim paneli (tasarım: public/blog-statik/panel.css, kullanıcının örnek panel görselleri v2).
// Giriş: panel yetkisi olan üye hesabı ya da Cloudflare'deki AK_PANEL_KEY şifresi (→ "HasTürk Editör Ekibi" hesabı).
// Sunucuda HTML üretilir; formlar POST → yönlendirme (PRG). Küçük etkileşimler: /blog-statik/panel.js
import { BOT_TUR } from './ortak.js';
import { esc, trTarih, trTarihSaat, goreli, binlik, kisaSayi, okumaDk, kirp, bas, renk, html, yonlendir, jsonYanit, formOku, slugYap, yerelGiris, yereldenTs, gun, sha256, esit, rastgele, sifreOzet, AY_ADI, TR_SAAT } from './ortak.js';
import { YAYINDA, sinir, ayarYaz } from './db.js';
import { render, sssCoz, duz } from './md.js';
import { eslestir, oneriler, urunBul, gorselUrl, kartYaziIci, kelimeler } from './urun.js';
import { SOSYAL } from './sosyal.js';
import { YAZAR_LISTE } from './yazarlar.js';
import { FOTO_ADLARI } from './fotolar.js';
import GSC from './gsc-ozet.json';
import { canli } from './ga-canli.js';
import { veriIc as bbVeriIc, kararIc as bbKararIc } from '../inceleme.js';
import { denetle as bbDenetle } from '../denetim.js';
import { googleVeri, googleOtorite, aralikCoz, ARALIKLAR } from './google-veri.js';
import { seoPuan, SEO_ESIK } from './seo-puan.js';
import { yetkili, oturumAc, oturumKapat, giris as uyeGiris, kararSay, guven, ROLLER, ROL_AD } from './uye.js';
import { katSifirla, ayrilmisMi } from './index.js';
import { bildir, soruTamUrl, gonder, MAIL_VARSAYILAN, MAIL_TURLER, GIZLI_AYAR, gizliSifrele, kimlik } from './mail.js';

const IK = (id, st = '') => `<svg${st ? ` style="${st}"` : ''}><use href="/blog-statik/ikon.svg#${id}"/></svg>`;
const SURUM = '17';
const FOTOLAR = FOTO_ADLARI.map((k) => '/blog-statik/foto/' + k + '.webp');
const BANNER_FOTO = '/blog-statik/foto/bahce-magaza.webp';
// Kapak görselini kullanan diğer yazılar (çöp hariç): { gorsel: 'yazı başlığı' }
async function kullanilanGorseller(db, haricId) {
  const r = (await db.prepare("SELECT gorsel, baslik FROM b_yazi WHERE durum != 'cop' AND id != ? AND gorsel != ''").bind(haricId || 0).all()).results;
  return Object.fromEntries(r.map((x) => [x.gorsel, x.baslik]));
}
const DURUM = { taslak: ['Taslak', 'c-o'], inceleme: ['İncelemede', 'c-y'], zamanli: ['Zamanlandı', 'c-p'], yayinda: ['Yayında', 'c-g'], cop: ['Çöp', 'c-r'] };
const P = (c, p = '') => c.base + '/panel' + p;
const MSJ = { denetlendi: 'Denetim tamamlandı; sonuçlar aşağıda.', kaydedildi: 'Kaydedildi.', silindi: 'Silindi.', onaylandi: 'Onaylandı.', reddedildi: 'Reddedildi.', gonderildi: 'Gönderildi.', yetki: 'Bu işlem için yetkiniz yok.', hata: 'İşlem yapılamadı; alanları kontrol edin.', slug: 'Bu adres (slug) başka bir yazıda ya da sistemde kullanılıyor; farklı bir adres yazın.', seo: 'Kaydedildi, ancak SEO puanı ' + SEO_ESIK + "'in altında olduğu için yayına alınmadı, taslak olarak bırakıldı. Sağdaki SEO Analizi'ndeki eksikleri tamamlayıp yeniden yayınlayın.", gorsel: 'Kaydedildi. Uyarı: seçtiğiniz kapak görseli başka bir yazıda da kullanılıyor; her yazıya farklı bir görsel seçmenizi öneririz.' };

// ---------- Yönlendirici ----------
let SAYAC = null;
export async function panel(c, p) {
  const G = c.req.method === 'GET', Po = c.req.method === 'POST';
  if (p[0] === 'giris') return Po ? girisPost(c) : girisSayfa(c);
  if (!yetkili(c.uye, 'panel')) return yonlendir(P(c, '/giris'));
  if (p[0] === 'cikis') return yonlendir(P(c, '/giris'), { 'Set-Cookie': await oturumKapat(c.db, c.uye) });
  // Menü sayaçları her sayfada gerekir: 30 sn bellekte tutulur (her geçişte veritabanına ayrıca gidilmesin); bir işlem
  // (POST) yapılınca sıfırlanır, böylece onaylanan / cevaplanan iş sayaçtan hemen düşer
  if (Po) SAYAC = null;
  const S = SAYAC && Date.now() - SAYAC.t < 30000 ? SAYAC.v : (SAYAC = { t: Date.now(), v: (await c.db.prepare("SELECT (SELECT COUNT(*) FROM b_yorum WHERE durum = 'bekliyor') y, (SELECT COUNT(*) FROM b_soru WHERE durum = 'bekliyor') + (SELECT COUNT(*) FROM b_cevap WHERE durum = 'bekliyor') s, (SELECT COUNT(*) FROM b_soru WHERE durum = 'onayli' AND cevap_sayisi = 0) sc, (SELECT COUNT(*) FROM b_yazi WHERE durum = 'zamanli' AND yayin_ts > ?1) z, (SELECT MIN(yayin_ts) FROM b_yazi WHERE durum = 'zamanli' AND yayin_ts > ?1) zs").bind(Date.now()).first()) }).v;
  // Bilge Bey: denetimde hatalı + onay bekleyen (yalnız yönetici; tablo yoksa sessizce 0)
  if (S.bb === undefined && yetkili(c.uye, 'ayar')) S.bb = await c.db.prepare("SELECT (SELECT COUNT(DISTINCT s.qn) FROM ak_denetim d JOIN ak_soru s ON s.id = d.soru_id WHERE d.durum = 'acik') + (SELECT COUNT(*) FROM ak_soru WHERE kaynak = 'ai' AND durum = 'onay-bekliyor' AND ts >= ?) n").bind(new Date(Date.now() - 30 * 864e5).toISOString()).first('n').catch(() => 0) || 0;
  c.sayac = S;
  const r = p[0] || '';
  if (r === '' && G) return genel(c);
  if (r === 'trafik' && G) return trafik(c);
  if (r === 'canli' && G) return canliKart(c);
  if (r === 'reklam-karar' && Po) return reklamKarar(c);
  if (r === 'yazilar' && G) return yazilar(c);
  if (r === 'yazi') {
    if (p[1] === 'kaydet' && Po) return yaziKaydet(c);
    if (p[2] === 'sil' && Po) return yaziSil(c, +p[1]);
    if (G) return editor(c, p[1] === 'yeni' ? null : +p[1]);
  }
  if (r === 'onizle' && Po) return onizle(c);
  if (r === 'urun-ara' && G) return urunAra(c);
  if (r === 'kategoriler' && G) return kategoriler(c);
  if (r === 'kategori' && Po) return kategoriKaydet(c, p[1]);
  if (r === 'sorular' && G) return sorular(c);
  if ((r === 'soru' || r === 'cevap') && Po) return soruKarar(c, r, +p[1], p[2]);
  if (r === 'yorumlar' && G) return yorumlar(c);
  if (r === 'fotograflar' && G) return fotograflar(c);
  if (r === 'foto' && Po) return fotoSil(c, p[1]);
  if (r === 'yorum' && Po) return yorumKarar(c, p[1], p[2]);
  if (r === 'kurallar' && Po) return kurallarKaydet(c);
  if (r === 'anasayfa' && G) return anasayfa(c);
  if (r === 'banner' && Po) return bannerKaydet(c, p[1], p[2]);
  if (r === 'one-urunler' && Po) return oneUrunKaydet(c);
  if (r === 'bolumler' && Po) return bolumKaydet(c);
  if (r === 'uyeler' && G) return uyeler(c);
  if (r === 'uye' && Po) return uyeKaydet(c, +p[1]);
  if (r === 'seo' && G) return seo(c);
  if (r === 'ayarlar' && Po) return ayarKaydet(c);
  if (r === 'eposta' && G) return eposta(c);
  if (r === 'eposta' && Po) return epostaKaydet(c);
  if (r === 'eposta-test' && Po) return epostaTest(c);
  if (r === 'bulten.csv' && G) return bultenCsv(c);
  if (r === 'bilge') { if (p[1] === 'karar' && Po) return bilgeKarar(c); if (p[1] === 'denetim' && Po) return bilgeDenetim(c); if (G) return bilge(c); }
  return pSayfa(c, { baslik: 'Bulunamadı', govde: '<div class="card">Sayfa bulunamadı.</div>' });
}

// ---------- İskelet ----------
// v4 kurumsal konsol: koyu kenar menü (çalışma alanı + bölümler + kullanıcı), üstte sayfa yolu, arama ve yayın hattı durumu
const SAYFA_AD = { genel: 'Genel Bakış', trafik: 'Arama & Trafik', yazilar: 'İçerik', editor: 'Yazı Editörü', kategoriler: 'Kategoriler', sorular: 'Soru-Cevap', yorumlar: 'Yorumlar', fotograflar: 'Üye Fotoğrafları', anasayfa: 'Ana Sayfa & Vitrin', uyeler: 'Kullanıcılar & Roller', seo: 'SEO & Site Ayarları', eposta: 'E-posta Bildirimleri' };
// "bugün 07:20", "yarın 09:10" ya da "17 Ocak 07:15"
const kisaZaman = (ts) => { const g = gun(ts), b = gun(), s = trTarihSaat(ts).slice(-5); return g === b ? 'bugün ' + s : g === gun(Date.now() + 864e5) ? 'yarın ' + s : trTarih(ts).replace(/ \d{4}$/, '') + ' ' + s; };
function pSayfa(c, { baslik, alt = '', aktif = '', govde, acts = '', selam = '' }) {
  const u = c.uye, S = c.sayac || {};
  const m = (k, yol, ik, ad, ek = '') => `<a href="${P(c, yol)}"${aktif === k ? ' class="on" aria-current="page"' : ''}>${IK(ik)}<span>${ad}</span>${ek}</a>`;
  const n = (x, cls = '') => x ? `<span class="n${cls}">${binlik(x)}</span>` : '';
  const msg = MSJ[c.url.searchParams.get('m')];
  const body = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(baslik)} · HasTürk Yönetim Konsolu</title><meta name="robots" content="noindex, nofollow"><link rel="icon" href="/blog-statik/fav/favicon.ico?v=2" sizes="48x48"><link rel="apple-touch-icon" href="/blog-statik/fav/apple-touch-icon.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/blog-statik/panel.css?v=${SURUM}">
<script type="speculationrules">${JSON.stringify({ prerender: [{ source: 'document', where: { and: [{ href_matches: P(c, '/*') }, { not: { href_matches: P(c, '/cikis') } }, { not: { href_matches: P(c, '/bulten.csv') } }, { not: { href_matches: P(c, '/onizle*') } }] }, eagerness: 'moderate' }] })}</script></head><body>
<aside class="side" id="side">
  <a class="brand" href="${P(c)}"><img src="/blog-statik/logo.webp" alt="HasTürk" width="132" height="38"></a>
  <nav class="menu">
    <small>Panorama</small>
    ${m('genel', '', 'i-dash', 'Genel Bakış')}
    ${m('trafik', '/trafik', 'i-chart', 'Arama &amp; Trafik')}
    <small>İçerik</small>
    ${m('yazilar', '/yazilar', 'i-doc', 'Tüm Yazılar', n(S.z, ' g').replace('class="n g"', 'class="n g" title="zamanlanmış"'))}
    ${m('editor', '/yazi/yeni', 'i-edit', 'Yeni Yazı')}
    ${m('kategoriler', '/kategoriler', 'i-tag', 'Kategoriler')}
    ${yetkili(u, 'moderasyon') ? `<small>Topluluk</small>${m('sorular', '/sorular', 'i-chat', 'Soru-Cevap', n(S.s + S.sc, ' g'))}${m('yorumlar', '/yorumlar', 'i-msg', 'Yorumlar', n(S.y))}${m('fotograflar', '/fotograflar', 'i-image', 'Üye Fotoğrafları')}` : ''}
    ${yetkili(u, 'ayar') ? `<small>Asistan</small>${m('bilge', '/bilge', 'i-bulb', 'Bilge Bey', n(S.bb))}` : ''}
    ${yetkili(u, 'anasayfa') ? `<small>Vitrin</small>${m('anasayfa', '/anasayfa', 'i-home', 'Ana Sayfa &amp; Bannerlar')}` : ''}
    ${yetkili(u, 'seo') ? `<small>Yönetim</small>${m('seo', '/seo', 'i-gear', 'SEO &amp; Site Ayarları')}${yetkili(u, 'kullanici') ? m('uyeler', '/uyeler', 'i-users', 'Kullanıcılar &amp; Roller') : ''}${yetkili(u, 'ayar') ? m('eposta', '/eposta', 'i-mail', 'E-posta Bildirimleri') : ''}` : ''}
  </nav>
  <script>(function(){var m=document.currentScript.previousElementSibling;function k(){try{var v=sessionStorage.getItem('pnl-menu');if(v!==null)m.scrollTop=+v;}catch(e){}var a=m.querySelector('a.on');if(a){var r=a.getBoundingClientRect(),q=m.getBoundingClientRect();if(r.top<q.top||r.bottom>q.bottom)m.scrollTop+=r.top-q.top-q.height/3;}}k();document.addEventListener('prerenderingchange',k);function y(){try{sessionStorage.setItem('pnl-menu',m.scrollTop);}catch(e){}}m.addEventListener('click',y);addEventListener('pagehide',y);})();</script>
  <div class="sfoot"><span class="av" style="background:${renk(u.ad)}">${esc(bas(u.ad))}</span><div><b>${esc(u.ad)}</b><small>${ROL_AD[u.rol]}</small></div><a href="${P(c, '/cikis')}" title="Çıkış" aria-label="Çıkış">${IK('i-ext')}</a></div>
</aside>
<div class="scrim" id="scrim"></div>
<div class="main">
  <header class="top">
    <button class="burger" id="burger" aria-label="Menü">${IK('i-menu')}</button>
    <div class="tbas"><h1 class="ttl">${esc(baslik)}</h1>${alt || selam ? `<p class="talt">${selam ? selam + ' · ' : ''}${alt}</p>` : ''}</div>
    ${acts ? `<div class="tacts">${acts}</div>` : `<form class="tsearch" method="get" action="${P(c, '/yazilar')}"><label class="sr" for="tq">Yazı ara</label>${IK('i-search')}<input id="tq" name="q" placeholder="Yazı ara…"></form>`}
    <div class="tr">
      ${(() => { const b = (S.s || 0) + (S.sc || 0) + (S.y || 0); return `<a class="ib" href="${P(c, b ? (S.s || S.sc ? '/sorular' : '/yorumlar') : '')}" title="${b ? binlik(b) + ' bekleyen iş' : 'Bekleyen iş yok'}" aria-label="Bildirimler">${IK('i-bell')}${b ? '<i class="dot"></i>' : ''}</a>`; })()}
      <a class="ib" href="${c.base || '/'}" target="_blank" rel="noopener" title="Siteyi gör" aria-label="Siteyi gör">${IK('i-ext')}</a>
      <span class="av tav" style="background:${renk(u.ad)}" title="${esc(u.ad)} · ${ROL_AD[u.rol]}">${esc(bas(u.ad))}</span>
      <a class="btn btn-g" href="${P(c, '/yazi/yeni')}">${IK('i-plus')}<span>Yeni Yazı</span></a>
    </div>
  </header>
  <section class="pg on">
    ${msg ? `<div class="flash${/yetki|hata|slug/.test(c.url.searchParams.get('m')) ? ' err' : c.url.searchParams.get('m') === 'gorsel' ? ' warn' : ''}" role="status">${esc(msg)}</div>` : ''}
    ${govde}
  </section>
</div>
<script src="/blog-statik/panel.js?v=${SURUM}" defer></script>
</body></html>`;
  return html(body, { noindex: true });
}
const yetkiYok = (c, geri) => yonlendir((geri || P(c)) + '?m=yetki');
const kpi = (ic, renk_, ad, deger, alt) => `<div class="kpi"><span class="ic ${renk_}">${IK(ic)}</span><small>${ad}</small><b>${deger}</b><span class="d">${alt}</span></div>`;
const pill = (d) => { const x = DURUM[d] || [d, 'c-o']; return `<span class="pill ${x[1]}">${x[0]}</span>`; };
const seoRozet = (v) => `<span class="pos ${v >= 80 ? 'p1' : v >= 60 ? 'p2' : 'p3'}" title="SEO puanı">${v}</span>`;
const ring = (v) => `<span class="ring" style="--v:${v};--c:${v >= 80 ? 'var(--green-lt)' : v >= 60 ? '#e8891c' : '#d8343f'}"><span>${v}</span></span>`;
const tgl = (ad, acik, etiket) => `<label class="tgl"><input type="checkbox" name="${ad}" value="1"${acik ? ' checked' : ''}><span class="tg" aria-hidden="true"></span><span class="sr">${esc(etiket || ad)}</span></label>`;

// ---------- Giriş ----------
function girisSayfa(c, hata = '') {
  if (yetkili(c.uye, 'panel')) return yonlendir(P(c));
  const anahtar = String(c.env.AK_PANEL_KEY || '').length >= 8;
  return html(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Giriş · HasTürk Yönetim Konsolu</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"><link rel="stylesheet" href="/blog-statik/panel.css?v=${SURUM}"></head>
<body class="girisb"><main class="girisk card"><img src="/blog-statik/logo.webp" alt="HasTürk Gübre" width="177" height="46"><div><h1>Yönetim Konsolu</h1><p class="muted" style="font-size:13px;margin-top:4px">HasTürk Blog · yetkili ekip girişi</p></div>
${c.uye ? `<p class="flash err">${esc(c.uye.ad)} hesabının panel yetkisi yok.</p>` : ''}${hata ? `<p class="flash err" role="alert">${esc(hata)}</p>` : ''}
<form method="post" class="frm"><label class="lab">E-posta<input class="inp" type="email" name="eposta" autocomplete="username"></label><label class="lab">Şifre<input class="inp" type="password" name="sifre" autocomplete="current-password"></label>
${anahtar ? `<details><summary>Yönetici şifresiyle giriş</summary><label class="lab">Yönetici şifresi (Cloudflare AK_PANEL_KEY)<input class="inp" type="password" name="anahtar" autocomplete="off"></label></details>` : ''}
<button class="btn btn-g">Giriş Yap</button></form><p class="muted" style="font-size:12px"><a href="${c.base || '/'}">← Siteye dön</a></p></main></body></html>`, { status: hata ? 400 : 200, noindex: true });
}
async function girisPost(c) {
  const f = await formOku(c.req);
  const ipk = await sha256((c.req.headers.get('CF-Connecting-IP') || '') + (c.A.ip_tuz || ''));
  if (!(await sinir(c.db, 'panel:' + ipk, 10, 900))) return girisSayfa(c, 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
  let id = null;
  const key = String(c.env.AK_PANEL_KEY || '');
  if (f.anahtar && key.length >= 8) {
    if (!esit(String(f.anahtar), key)) return girisSayfa(c, 'Yönetici şifresi hatalı.');
    let ekip = await c.db.prepare("SELECT id FROM b_uye WHERE eposta = 'ekip@hasturk.blog'").first();
    if (!ekip) {
      const tuz = rastgele(16);
      const r = await c.db.prepare("INSERT INTO b_uye (ad, eposta, sifre, tuz, rol, olus_ts) VALUES ('HasTürk Editör Ekibi', 'ekip@hasturk.blog', ?, ?, 'yonetici', ?)").bind(await sifreOzet(rastgele(24), tuz), tuz, Date.now()).run();
      ekip = { id: r.meta.last_row_id };
    }
    id = ekip.id;
  } else {
    const r = await uyeGiris(c.db, f);
    if (r.hata) return girisSayfa(c, r.hata);
    const u = await c.db.prepare('SELECT * FROM b_uye WHERE id = ?').bind(r.id).first();
    if (!yetkili(u, 'panel')) return girisSayfa(c, 'Bu hesabın panel yetkisi yok.');
    id = r.id;
  }
  return yonlendir(P(c), { 'Set-Cookie': await oturumAc(c.db, id) });
}

// ---------- Genel bakış ----------
// SEO puanı: ölçütler seo-puan.js'te (editördeki canlı kontrol ve yazı paketi denetimi de aynısını kullanır)
const odakNorm = (x) => String(x || '').toLocaleLowerCase('tr-TR').trim();
async function digerOdaklar(db, haricId) {
  return (await db.prepare("SELECT odak FROM b_yazi WHERE durum != 'cop' AND id != ? AND odak != ''").bind(haricId || 0).all()).results.map((r) => odakNorm(r.odak));
}
// ---------- Grafik yardımcıları ----------
// Grafik (7 Kasım 2026, kullanıcının isteği: "üzerine gelince ne kadar olduğunu göremiyorum, yanındaki rakamlar acemice"):
// çizgiler SVG'de, eksen yazıları HTML'de (esnemez, net okunur); üzerine gelince / dokununca o günün değerleri kutuda görünür
// (/blog-statik/panel.js > .gr). seriler: [{ ad, v: [...], r: renk, alan, kesik, sag: sağ eksen, f: 'sira' | 'yuzde' | 'para' }]
const TR_AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const gunAd = (d) => +String(d).slice(8, 10) + ' ' + TR_AY[+String(d).slice(5, 7) - 1];
const eksenSayi = (n) => n >= 1e6 ? (n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' mn' : n >= 1e4 ? (n / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' bin' : n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
function olcek(max) {
  if (!(max > 0)) return { tavan: 4, adim: 1 };
  const kaba = max / 4, k = Math.pow(10, Math.floor(Math.log10(kaba))), f = kaba / k;
  const adim = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * k;
  return { tavan: Math.max(adim, Math.ceil(max / adim) * adim), adim };
}
function cizgi(gunler, seriler, { H = 240 } = {}) {
  const n = gunler.length, sagVar = seriler.some((s) => s.sag);
  const deg = (f) => seriler.filter(f).flatMap((s) => s.v).filter((v) => v != null);
  const O = { sol: olcek(Math.max(0, ...deg((s) => !s.sag))), sag: olcek(Math.max(0, ...deg((s) => s.sag))) };
  const xv = (i) => n < 2 ? 500 : (i / (n - 1)) * 1000, yv = (v, o) => 100 - (v / o.tavan) * 100;
  // Değeri olmayan gün (null: Google verisi henüz gelmedi) çizgide boşluk olur
  const yol = (s) => { let acik = false; return s.v.map((v, i) => { if (v == null) { acik = false; return ''; } const k = (acik ? 'L' : 'M') + xv(i).toFixed(1) + ' ' + yv(v, s.sag ? O.sag : O.sol).toFixed(2); acik = true; return k; }).join(' '); };
  const tikler = (o) => Array.from({ length: Math.round(o.tavan / o.adim) + 1 }, (_, k) => k * o.adim);
  const izgara = tikler(O.sol).map((v) => `<path d="M0 ${yv(v, O.sol).toFixed(2)}H1000"/>`).join('');
  const eksen = (o, cls) => `<div class="gr-y${cls}">${tikler(o).map((v) => `<span style="bottom:${(v / o.tavan * 100).toFixed(2)}%">${eksenSayi(v)}</span>`).join('')}</div>`;
  const adim = Math.max(1, Math.ceil((n - 1) / 6));
  const xs = gunler.map((d, i) => (i % adim === 0 && (n - 1 - i >= adim * 0.9 || i === 0)) || i === n - 1 ? `<span style="left:${(xv(i) / 10).toFixed(2)}%"${i === 0 ? ' class="b"' : i === n - 1 ? ' class="s"' : ''}>${gunAd(d)}</span>` : '').join('');
  const alan = seriler.filter((s) => s.alan && !s.v.some((v) => v == null)).map((s, k) => `<defs><linearGradient id="gr${k}${s.r.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.r}" stop-opacity=".18"/><stop offset="1" stop-color="${s.r}" stop-opacity="0"/></linearGradient></defs><path d="${yol(s)} L1000 100 L0 100 Z" fill="url(#gr${k}${s.r.slice(1)})"/>`).join('');
  const veri = { x: gunler, s: seriler.map((s) => ({ ad: s.ad || '', r: s.r, v: s.v, t: (s.sag ? O.sag : O.sol).tavan, f: s.f || '' })) };
  return `<div class="gr${sagVar ? ' iki' : ''}" style="--h:${H}px" data-g="${esc(JSON.stringify(veri))}">${eksen(O.sol, '')}<div class="gr-p"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="Günlük grafik"><g stroke="#e9edf2" stroke-width="1" vector-effect="non-scaling-stroke" fill="none">${izgara}</g>${alan}${seriler.map((s) => `<path d="${yol(s)}" fill="none" stroke="${s.r}" stroke-width="${s.ince ? 1.6 : 2.2}"${s.kesik ? ' stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`).join('')}</svg><i class="gr-cz" hidden></i><div class="gr-tip" hidden></div></div>${sagVar ? eksen(O.sag, ' sag') : ''}<div class="gr-x">${xs}</div></div>`;
}
// Grafik başlığındaki renk açıklaması (seri adlarıyla)
const lejant = (seriler) => `<div class="legend">${seriler.map((s) => `<span><i style="background:${s.r}"></i>${s.ad}${s.sag ? ' <em>(sağ eksen)</em>' : ''}</span>`).join('')}</div>`;
// KPI kartı altındaki küçük eğri; x (tarihler) verilirse üzerine gelince günün değeri görünür
function egri(v, r = '#17784a', { x = null, ad = '', f = '' } = {}) {
  if (!v || v.length < 2 || !v.some((y) => y)) return '<div class="sp"></div>';
  const max = Math.max(...v, 1), xv = (i) => (i / (v.length - 1)) * 100, yv = (n) => 28 - (n / max) * 24;
  const d = v.map((n, i) => (i ? 'L' : 'M') + xv(i).toFixed(2) + ' ' + yv(n).toFixed(2)).join(' ');
  const svg = `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L100 30 L0 30 Z" fill="${r}" fill-opacity=".09"/><path d="${d}" fill="none" stroke="${r}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  if (!x || x.length !== v.length) return `<div class="sp">${svg}</div>`;
  return `<div class="sp gr mini" data-g="${esc(JSON.stringify({ x, s: [{ ad, r, v, t: max, f }] }))}"><div class="gr-p">${svg}<i class="gr-cz" hidden></i><div class="gr-tip" hidden></div></div></div>`;
}
// Son 7 gün ile önceki 7 günü karşılaştırır (yeterli veri yoksa boş)
function degisim(v) {
  if (!v || v.length < 14) return '';
  const a = v.slice(-7).reduce((x, y) => x + y, 0), b = v.slice(-14, -7).reduce((x, y) => x + y, 0);
  if (!b) return a ? '<span class="dl2 u">yeni</span>' : '';
  const y = Math.round((a - b) / b * 100);
  return `<span class="dl2 ${y > 0 ? 'u' : y < 0 ? 'd' : 'z'}" title="Son 7 gün, önceki 7 güne göre">${y > 0 ? '▲' : y < 0 ? '▼' : ''} %${Math.abs(y)}</span>`;
}
// İki dönemi karşılaştırır (ters: düşük olan iyi, ör. Google sırası)
function farkRozet(a, b, { ters = false, not = '' } = {}) {
  if (!b) return a ? `<span class="dl2 u" title="${not}">yeni</span>` : '';
  const y = Math.round((a - b) / b * 100), iyi = ters ? y < 0 : y > 0;
  return `<span class="dl2 ${!y ? 'z' : iyi ? 'u' : 'd'}" title="${not}">${y > 0 ? '▲' : y < 0 ? '▼' : ''} %${Math.abs(y)}</span>`;
}
const kpi2 = ({ ik, ad, deger, alt = '', seri, renk: r, kaynak = '', degis = true, x = null, seriAd = '', f = '', fark = '' }) => `<div class="kpi">${kaynak ? `<span class="src">${kaynak}</span>` : ''}<small>${IK(ik)}${ad}</small><b>${deger}</b><span class="d">${fark || (seri && degis ? degisim(seri) : '')}${alt}</span>${seri ? egri(seri, r, { x, ad: seriAd || ad, f }) : '<div class="sp bos"></div>'}</div>`;
const sira = (p) => `<span class="pos ${p <= 3 ? 'p1' : p <= 10 ? 'p2' : 'p3'}">${String(p).replace('.', ',')}</span>`;
const yuzde = (x) => '%' + String(x).replace('.', ',');

// ---------- Search Console özeti (GitHub işi her gün src/blog/gsc-ozet.json'u yeniler) ----------
const SITE_RENK = { hasturk: '#17784a', tarim: '#c2410c', blog: '#4f46e5' };
const gscSiteler = () => (GSC && GSC.siteler) || [];
const gaSiteler = () => (GSC && GSC.ga) || [];
function gscGunler(siteler) {
  const set = new Set(); siteler.forEach((s) => s.gunluk.forEach((g) => set.add(g[0])));
  const t = [...set].sort();
  if (!t.length) return [];
  const out = [], son = new Date(t[t.length - 1] + 'T00:00:00Z');
  for (let d = new Date(t[0] + 'T00:00:00Z'); d <= son; d = new Date(+d + 864e5)) out.push(d.toISOString().slice(0, 10));
  return out;
}
const gscSeri = (s, gunler, i) => { const m = new Map(s.gunluk.map((g) => [g[0], g[i]])); return gunler.map((d) => m.get(d) || 0); };
// Birden çok sitenin sorgularını birleştirir: tıklama/gösterim toplanır, sıra gösterime göre ağırlıklı ortalama
function gscBirlestir(siteler, alan) {
  const m = new Map();
  for (const s of siteler) for (const [k, tik, gos, sr] of s[alan]) {
    const x = m.get(k) || { k, tik: 0, gos: 0, sw: 0, site: new Set() };
    x.tik += tik; x.gos += gos; x.sw += sr * gos; x.site.add(s.ad); m.set(k, x);
  }
  return [...m.values()].map((x) => ({ k: x.k, tik: x.tik, gos: x.gos, sira: x.gos ? Math.round(x.sw / x.gos * 10) / 10 : 0, ctr: x.gos ? Math.round(x.tik / x.gos * 1000) / 10 : 0, site: [...x.site] })).sort((a, b) => b.gos - a.gos);
}
const siteNokta = (ad) => `<i class="site-k" style="background:${SITE_RENK[ad] || '#94a3b8'}" title="${esc((gscSiteler().find((s) => s.ad === ad) || {}).etiket || ad)}"></i>`;

// ---------- Genel bakış (komuta merkezi) ----------
async function genel(c) {
  const db = c.db, now = Date.now();
  // Canlı Google verisi (son 28 gün) önbellekteyse o kullanılır; yoksa günlük rapor, canlı veri arkada hazırlanır
  const CV = await googleVeri(c.env, aralikCoz(new URLSearchParams()), gscSiteler(), { ctx: c.ctx, bekle: false }).catch(() => null);
  // Son 30 gün ve önceki 30 gün (karşılaştırma için)
  const gunler = Array.from({ length: 30 }, (_, i) => gun(now - (29 - i) * 86400000));
  const once0 = gun(now - 59 * 864e5), once1 = gun(now - 30 * 864e5);
  const [istat, ozet, enCok, onceY, katOk, katYazi, son, takvim, hafta] = await Promise.all([
    db.prepare("SELECT d, SUM(n) n FROM b_istat WHERE d >= ? AND k = 'okunma' GROUP BY d").bind(once0).all(),
    db.prepare(`SELECT (SELECT COUNT(*) FROM b_yazi WHERE ${YAYINDA}) yazi, (SELECT COUNT(*) FROM b_yazi WHERE durum != 'cop') tum, (SELECT COUNT(*) FROM b_uye) uye, (SELECT COUNT(*) FROM b_uye WHERE olus_ts > ?) uye30,
      (SELECT COUNT(*) FROM b_soru WHERE durum = 'onayli') soru, (SELECT COUNT(*) FROM b_yorum WHERE durum = 'onayli') yorum, (SELECT COUNT(*) FROM b_yazi WHERE durum = 'inceleme') inc,
      (SELECT MAX(yayin_ts) FROM b_yazi WHERE durum = 'zamanli') zson, (SELECT COUNT(*) FROM b_yazi WHERE durum IN ('yayinda','zamanli') AND yayin_ts BETWEEN ? AND ?) bugun,
      (SELECT COUNT(*) FROM b_bulten) bulten, (SELECT COUNT(*) FROM b_yazi WHERE durum = 'taslak') taslak, (SELECT COUNT(*) FROM b_yazi WHERE durum != 'cop' AND COALESCE(gorsel, '') = '') kapaksiz`).bind(now, now - 30 * 86400000, now - ((now + TR_SAAT) % 864e5), now - ((now + TR_SAAT) % 864e5) + 864e5).first(),
    db.prepare("SELECT i.x, SUM(i.n) n, y.id, y.slug, y.baslik, y.gorsel, y.okunma FROM b_istat i JOIN b_yazi y ON y.id = CAST(i.x AS INTEGER) WHERE i.k = 'okuma_y' AND i.d >= ? GROUP BY i.x ORDER BY n DESC LIMIT 8").bind(gunler[0]).all(),
    db.prepare("SELECT x, SUM(n) n FROM b_istat WHERE k = 'okuma_y' AND d >= ? AND d <= ? GROUP BY x").bind(once0, once1).all(),
    db.prepare("SELECT y.kategori_id k, SUM(i.n) n FROM b_istat i JOIN b_yazi y ON y.id = CAST(i.x AS INTEGER) WHERE i.k = 'okuma_y' AND i.d >= ? GROUP BY y.kategori_id").bind(gunler[0]).all(),
    db.prepare(`SELECT kategori_id k, COUNT(*) n FROM b_yazi WHERE ${YAYINDA} GROUP BY kategori_id`).bind(now).all(),
    db.prepare(`SELECT * FROM (SELECT 'yorum' t, m.ts, u.ad, u.rol, y.baslik b, y.slug sl, m.durum d, m.yazi_id ref FROM b_yorum m JOIN b_uye u ON u.id = m.uye_id JOIN b_yazi y ON y.id = m.yazi_id ORDER BY m.ts DESC LIMIT 6)
      UNION ALL SELECT * FROM (SELECT 'soru', s.ts, u.ad, u.rol, s.baslik, s.slug, s.durum, s.id FROM b_soru s JOIN b_uye u ON u.id = s.uye_id WHERE s.durum != 'kopya' ORDER BY s.ts DESC LIMIT 6)
      UNION ALL SELECT * FROM (SELECT 'uye', olus_ts, ad, rol, '', '', durum, id FROM b_uye ORDER BY olus_ts DESC LIMIT 6) ORDER BY ts DESC LIMIT 7`).all(),
    db.prepare("SELECT y.id, y.slug, y.baslik, y.yayin_ts, y.durum, y.gorsel, k.ad kad FROM b_yazi y LEFT JOIN b_kategori k ON k.id = y.kategori_id WHERE y.durum IN ('yayinda','zamanli') AND y.yayin_ts >= ? AND y.yayin_ts < ? ORDER BY y.yayin_ts").bind(now - 40 * 86400000, now + 40 * 86400000).all(),
    db.prepare(`SELECT COUNT(*) n FROM b_yazi WHERE ${YAYINDA} AND yayin_ts >= ?`).bind(now, now - 7 * 864e5).first(),
  ]);
  const okM = new Map(istat.results.map((r) => [r.d, r.n]));
  const ok = gunler.map((d) => okM.get(d) || 0), okOnce = istat.results.filter((r) => r.d <= once1).reduce((a, r) => a + r.n, 0);
  const top = (a) => a.reduce((x, y) => x + (y || 0), 0);
  const S = c.sayac;
  // Google: Genel Bakış yalnız blogu gösterir (üç site birlikte Arama & Trafik'te); karşılaştırma son 7 gün / önceki 7 gün
  const GS = CV && CV.siteler && CV.siteler.some((s) => s.toplam) ? CV.siteler.map((s) => ({ ...(gscSiteler().find((x) => x.ad === s.ad) || {}), ...s })) : gscSiteler(), B = GS.find((s) => s.ad === 'blog');
  const bg = B ? gscGunler([B]) : [];
  const bGos = B ? gscSeri(B, bg, 2) : [], bTik = B ? gscSeri(B, bg, 1) : [];
  const bSira = B ? (() => { const m = new Map(B.gunluk.map((g) => [g[0], g[3]])); return bg.map((d) => m.get(d) || null); })() : [];
  const BT = (B && B.toplam) || {};
  const s7 = (v) => top(v.slice(-7)), o7 = (v) => top(v.slice(-14, -7));
  const agirSira = (a, b) => { const g = bGos.slice(a, b), sr = bSira.slice(a, b); const t = top(g); return t ? g.reduce((x, n, i) => x + n * (sr[i] || 0), 0) / t : 0; };
  // Birleşik grafik: son 30 gün; Google verisi 2–3 gün geriden gelir (o günler boş kalır)
  const gM = (i) => { const m = new Map(B ? B.gunluk.map((g) => [g[0], g[i]]) : []); return gunler.map((d) => m.has(d) ? m.get(d) : null); };
  const seriBlog = [
    ...(B ? [{ ad: 'Google gösterimi', v: gM(2), r: '#4f46e5', alan: true }, { ad: 'Google tıklaması', v: gM(1), r: '#16a34a', sag: true }] : []),
    { ad: 'Yazı okunma', v: ok, r: '#ea580c', sag: !!B, kesik: !!B },
  ];
  // En çok okunan yazılar: son 30 gün, önceki 30 güne göre
  const onceMap = new Map(onceY.results.map((r) => [String(r.x), r.n]));
  // Kategori performansı
  const kok = new Map(katOk.results.map((r) => [r.k, r.n])), kyz = new Map(katYazi.results.map((r) => [r.k, r.n]));
  const katlar = c.kat.map((k) => ({ ad: k.ad, id: k.id, ok: kok.get(k.id) || 0, yazi: kyz.get(k.id) || 0 })).filter((k) => k.yazi).sort((a, b) => b.ok - a.ok || b.yazi - a.yazi).slice(0, 8);
  const katMax = Math.max(1, ...katlar.map((k) => k.ok));
  // Blogun Google sayfaları → yazı başlığı
  const bSayfa = B ? B.sayfa.slice(0, 8) : [];
  const OT = B ? await googleOtorite(c.env, B.mulk, { ctx: c.ctx }).catch(() => null) : null;
  const slugYol = (u) => String(u).replace(/^https?:\/\/[^/]+\/?/, '').replace(/\/$/, '');
  const slugs = [...new Set([...bSayfa.map((r) => r[0]), ...(OT ? [...OT.yukselen, ...OT.dusen].map((x) => x.u) : [])].map(slugYol).filter(Boolean))];
  const baslikM = new Map(slugs.length ? (await db.prepare(`SELECT slug, baslik, id FROM b_yazi WHERE slug IN (${slugs.map(() => '?').join(',')})`).bind(...slugs).all()).results.map((r) => [r.slug, r]) : []);
  // Takvim: bu ay
  const t = new Date(now + TR_SAAT), yil = t.getUTCFullYear(), ay = t.getUTCMonth(), bugun = t.getUTCDate();
  const ilk = (new Date(Date.UTC(yil, ay, 1)).getUTCDay() + 6) % 7, gs = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
  const gunDurum = {}, gunYazi = {};
  takvim.results.forEach((y) => { const d = new Date(y.yayin_ts + TR_SAAT); if (d.getUTCMonth() === ay && d.getUTCFullYear() === yil) { const g = d.getUTCDate(); gunDurum[g] = (gunDurum[g] || '') + (y.yayin_ts > now ? 'z' : 'y'); (gunYazi[g] = gunYazi[g] || []).push(y); } });
  // Takvim: yazısı olan güne basınca altında o günün yazıları açılır (saat, kategori, sitede gör, düzenle); betik yoksa Yazılar'a gider
  const gunTarih = (g) => `${yil}-${String(ay + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
  const cal = Array.from({ length: ilk }, () => '<span class="x"></span>').join('') + Array.from({ length: gs }, (_, i) => { const g = i + 1, d = gunDurum[g] || '', sinif = `${g === bugun ? 't ' : ''}${g === bugun ? 'sec ' : ''}${d.includes('z') && d.includes('y') ? 'e e2' : d.includes('z') ? 'e e3' : d ? 'e' : ''}`.trim(); return d ? `<a class="${sinif}" href="${P(c, '/yazilar?gun=' + gunTarih(g))}" data-gun="${g}" title="${d.length} yazı">${g}</a>` : `<span class="${sinif}">${g}</span>`; }).join('');
  const gunListe = Object.entries(gunYazi).map(([g, l]) => `<div class="cgun" data-gun="${g}"${+g === bugun ? '' : ' hidden'}><div class="cgun-b"><b>${+g} ${AY_ADI[ay]} ${['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][new Date(Date.UTC(yil, ay, +g)).getUTCDay()]}</b><span>${l.length} yazı · ${l.filter((y) => y.yayin_ts <= now).length} yayında, ${l.filter((y) => y.yayin_ts > now).length} planlı</span><a href="${P(c, '/yazilar?gun=' + gunTarih(+g))}">Listede aç</a></div>${l.map((y) => `<div class="cy"><span class="cs">${trTarihSaat(y.yayin_ts).slice(-5)}</span><div><b>${esc(y.baslik)}</b><small>${pill(y.yayin_ts > now ? 'zamanli' : 'yayinda')}${y.kad ? ' · ' + esc(y.kad) : ''}</small></div><a class="dots" href="${c.base}/${esc(y.slug)}" target="_blank" rel="noopener" title="Sitede gör" aria-label="Sitede gör">${IK('i-eye')}</a><a class="dots" href="${P(c, '/yazi/' + y.id)}" title="Düzenle" aria-label="Düzenle">${IK('i-edit')}</a></div>`).join('')}</div>`).join('');
  const ilerleme = ozet.tum ? Math.round(ozet.yazi / ozet.tum * 100) : 0;
  const bos = (ik, a, b) => `<div class="empty">${IK(ik)}<b>${a}</b><span>${b}</span></div>`;
  const isK = (n, yol, ik, renk_, ad) => `<a class="is${n ? '' : ' sifir'}" href="${P(c, yol)}"><span class="ic ${renk_}">${IK(ik)}</span><b>${binlik(n || 0)}</b><small>${ad}</small></a>`;
  const isKutu = `<div class="isler">
${isK(S.sc, '/sorular?t=cevapsiz', 'i-chat', 'c-b', 'Cevap bekleyen soru')}
${isK((S.s || 0) + (S.y || 0), S.s ? '/sorular?t=onay' : '/yorumlar', 'i-check', 'c-o', 'Onay bekleyen soru / yorum')}
${isK(ozet.inc, '/yazilar?d=inceleme', 'i-eye', 'c-p', 'İncelemedeki yazı')}
${isK(ozet.bugun, '/yazilar?gun=' + gun(now), 'i-cal', 'c-g', 'Bugün yayımlanan / planlı')}
${isK(ozet.taslak, '/yazilar?d=taslak', 'i-edit', 'c-y', 'Taslak')}
${isK(ozet.kapaksiz, '/yazilar?f=kapaksiz', 'i-image', 'c-r', 'Kapak görseli olmayan')}
</div>`;
  const not7 = 'Son 7 gün, önceki 7 güne göre';
  const sr7 = agirSira(-7), srO = agirSira(-14, -7);
  const kpiler = `<div class="kpis">
${kpi2({ ik: 'i-eye', ad: 'Google gösterimi', deger: binlik(BT.gos || 0), alt: B ? `${bg.length} gün · blog` : 'bağlantı bekleniyor', seri: bGos, x: bg, renk: '#4f46e5', kaynak: 'GSC', fark: B ? farkRozet(s7(bGos), o7(bGos), { not: not7 }) : '' })}
${kpi2({ ik: 'i-arrow', ad: 'Google tıklaması', deger: binlik(BT.tik || 0), alt: BT.gos ? 'TO ' + yuzde(Math.round(BT.tik / BT.gos * 1000) / 10) + ' · blog' : '', seri: bTik, x: bg, renk: '#16a34a', kaynak: 'GSC', fark: B ? farkRozet(s7(bTik), o7(bTik), { not: not7 }) : '' })}
${kpi2({ ik: 'i-star', ad: 'Ortalama sıra', deger: BT.sira ? String(BT.sira).replace('.', ',') : '—', alt: 'düşük olan daha iyi', seri: bSira.map((v) => v || 0), x: bg, f: 'sira', renk: '#0e7490', kaynak: 'GSC', fark: sr7 && srO ? farkRozet(sr7, srO, { ters: true, not: not7 }) : '' })}
${kpi2({ ik: 'i-doc', ad: 'Yazı okunma', deger: binlik(top(ok)), alt: 'son 30 gün', seri: ok, x: gunler, renk: '#ea580c', fark: okOnce ? farkRozet(top(ok), okOnce, { not: 'Son 30 gün, önceki 30 güne göre' }) : '' })}
${kpi2({ ik: 'i-users', ad: 'Topluluk', deger: binlik(ozet.uye), alt: `üye · bu ay +${binlik(ozet.uye30)}` })}
${kpi2({ ik: 'i-check', ad: 'Yayındaki yazı', deger: binlik(ozet.yazi), alt: `<span class="dl2 u">+${binlik(hafta.n)}</span> bu hafta · ${binlik(S.z)} sırada` })}
</div>`;
  const anaGrafik = `<div class="card"><div class="hd"><h3>Blog performansı <span class="sub">· son 30 gün, günlük</span></h3><a href="${P(c, '/trafik?s=blog')}">Ayrıntılı rapor</a></div>
${lejant(seriBlog)}<div class="chart2">${cizgi(gunler, seriBlog, { H: 260 })}</div>
<p class="note">Okunma: blog sunucusunun saydığı gerçek açılışlar (botlar hariç). Google: Search Console, blog.hasturkgubre.com.tr · son 2–3 gün henüz gelmediği için boştur.</p></div>`;
  const okunan = `<div class="card"><div class="hd"><h3>En çok okunan yazılar <span class="sub">· son 30 gün</span></h3><a href="${P(c, '/yazilar')}">Tümü</a></div>${enCok.results.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Yazı</th><th class="n">Okunma</th><th class="n">Değişim</th></tr></thead><tbody>${enCok.results.map((y, i) => `<tr><td class="q"><span class="rk">${i + 1}.</span> <a href="${P(c, '/yazi/' + y.id)}">${esc(kirp(y.baslik, 64))}</a></td><td class="n">${binlik(y.n)}</td><td class="n">${farkRozet(y.n, onceMap.get(String(y.x)) || 0, { not: 'Önceki 30 güne göre' }) || '—'}</td></tr>`).join('')}</tbody></table></div>` : bos('i-doc', 'Okunma verisi birikiyor', 'Yazılar okundukça son 30 günün sıralaması burada görünür.')}</div>`;
  const kategori = `<div class="card"><div class="hd"><h3>Kategori performansı <span class="sub">· son 30 gün</span></h3><a href="${P(c, '/kategoriler')}">Kategoriler</a></div>${katlar.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Kategori</th><th class="n">Yazı</th><th class="n">Okunma</th><th class="n">Yazı başına</th></tr></thead><tbody>${katlar.map((k) => `<tr><td class="q"><a href="${P(c, '/yazilar?kat=' + k.id)}">${esc(k.ad)}</a><span class="kbar"><i style="--w:${Math.round(k.ok / katMax * 100)}%"></i></span></td><td class="n">${binlik(k.yazi)}</td><td class="n">${binlik(k.ok)}</td><td class="n">${k.yazi ? (k.ok / k.yazi).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) : '—'}</td></tr>`).join('')}</tbody></table></div>` : bos('i-tag', 'Kategori verisi yok', '')}</div>`;
  const aramalar = `<div class="card"><div class="hd"><h3>Blogun Google aramaları <span class="sub">· 28 gün</span></h3><a href="${P(c, '/trafik?s=blog')}">Tümü</a></div>${B && B.sorgu.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Arama</th><th class="n">Gösterim</th><th class="n">Tıklama</th><th class="n">Sıra</th></tr></thead><tbody>${B.sorgu.slice(0, 8).map((r) => `<tr><td class="q">${esc(r[0])}</td><td class="n">${binlik(r[2])}</td><td class="n">${binlik(r[1])}</td><td class="n">${sira(r[3])}</td></tr>`).join('')}</tbody></table></div>` : bos('i-search', 'Veri bekleniyor', 'Search Console bağlantısı kurulunca görünür.')}</div>`;
  const sayfalar = `<div class="card"><div class="hd"><h3>Google'da en çok görünen yazılar <span class="sub">· 28 gün, blog</span></h3><a href="${P(c, '/trafik?s=blog')}">Tümü</a></div>${bSayfa.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Yazı</th><th class="n">Gösterim</th><th class="n">Tıklama</th><th class="n">TO</th><th class="n">Sıra</th></tr></thead><tbody>${bSayfa.map((r) => { const sl = String(r[0]).replace(/^https?:\/\/[^/]+\/?/, '').replace(/\/$/, ''), y = baslikM.get(sl); return `<tr><td class="q">${y ? `<a href="${P(c, '/yazi/' + y.id)}">${esc(kirp(y.baslik, 70))}</a>` : esc(sl || 'Ana sayfa')}</td><td class="n">${binlik(r[2])}</td><td class="n">${binlik(r[1])}</td><td class="n">${r[2] ? yuzde(Math.round(r[1] / r[2] * 1000) / 10) : '—'}</td><td class="n">${sira(r[3])}</td></tr>`; }).join('')}</tbody></table></div>` : bos('i-search', 'Veri bekleniyor', '')}</div>`;
  // Siteler: blog diğer iki siteyle yan yana (hangi sayının hangi siteye ait olduğu açık olsun)
  const GA = new Map(gaSiteler().filter((g) => g.toplam).map((g) => [g.ad, g.toplam]));
  const siteler = `<div class="card"><div class="hd"><h3>Siteler karşılaştırması <span class="sub">· 28 gün</span></h3><a href="${P(c, '/trafik')}">Arama & Trafik</a></div>${GS.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Site</th><th class="n">Gösterim</th><th class="n">Tıklama</th><th class="n">Sıra</th><th class="n">Ziyaretçi</th></tr></thead><tbody>${GS.map((s) => { const x = s.toplam || {}, g = GA.get(s.ad); return `<tr${s.ad === 'blog' ? ' class="bu"' : ''}><td class="q">${siteNokta(s.ad)}${esc(s.etiket)}${s.ad === 'blog' ? ' <em class="bu-e">bu panel</em>' : ''}</td><td class="n">${binlik(x.gos || 0)}</td><td class="n">${binlik(x.tik || 0)}</td><td class="n">${x.sira ? sira(x.sira) : '—'}</td><td class="n">${g ? binlik(g.activeUsers) : '—'}</td></tr>`; }).join('')}</tbody></table></div><p class="note sn">Ziyaretçi: Google Analytics. Blogun Analytics ölçümü yeni başladığı için düşük görünebilir; okunma sayısı daha güvenilirdir.</p>` : bos('i-chart', 'Veri bekleniyor', '')}</div>`;
  // Son hareketler: hepsi bu blogda (blog.hasturkgubre.com.tr) olur; kim yaptı (ekip / üye) ve neye yaptı açıkça yazılır
  const alanAdi = String(c.A.site_url || 'blog.hasturkgubre.com.tr').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const hareket = (h) => {
    const ekip = h.rol && h.rol !== 'uye';
    const [ik, tur, yol, metin] = h.t === 'yorum' ? ['i-msg', 'Yorum', '/yorumlar', `“${esc(kirp(h.b, 70))}” yazısına yorum yazdı`]
      : h.t === 'soru' ? ['i-chat', 'Soru', '/sorular', `soru sordu: ${esc(kirp(h.b, 80))}`] : ['i-users', 'Üyelik', '/uyeler?q=' + encodeURIComponent(h.ad), 'üye oldu'];
    return `<a class="li hr" href="${P(c, yol)}"><span class="ic">${IK(ik)}</span><div class="tx"><b>${esc(h.ad)}</b>${ekip ? ' <span class="et ekip">Ekip</span>' : ''} ${metin}<small><span class="et">${tur}</span><span class="et site">${esc(alanAdi)}</span>${goreli(h.ts)}${h.d === 'bekliyor' ? ' · <b class="dn">onay bekliyor</b>' : ''}</small></div></a>`;
  };
  // Google otoritesi: bu hafta / önceki hafta
  const yaziAd = (u) => { const y = baslikM.get(slugYol(u)); return y ? `<a href="${P(c, '/yazi/' + y.id)}">${esc(kirp(y.baslik, 64))}</a>` : esc(slugYol(u) || 'Ana sayfa'); };
  const otorite = (() => {
    const bas = `<div class="card oto"><div class="hd"><h3>Google otoritesi <span class="sub">· blog, haftalık</span></h3><a href="${P(c, '/trafik?s=blog')}">Arama raporu</a></div>`;
    if (!B) return '';
    if (!OT) return bas + `<p class="note">Haftalık Google karşılaştırması hazırlanıyor; birkaç dakika sonra sayfayı yenileyin.</p></div>`;
    const b = OT.bu, o = OT.once, tarih = (x) => `${gunAd(x.bas)} – ${gunAd(x.bit)}`;
    const yon = (a, z, ters) => a === z ? 'aynı kaldı' : (ters ? a < z : a > z) ? 'arttı' : 'azaldı';
    const yz = (a, z) => z ? Math.abs(Math.round((a - z) / z * 100)) : 0;
    const cumle = [
      `Google blogu bu hafta <b>${binlik(b.gos)}</b> kez gösterdi; önceki haftaya göre ${o.gos ? `<b>%${yz(b.gos, o.gos)} ${b.gos >= o.gos ? 'daha fazla' : 'daha az'}</b>` : 'ilk kez ölçüldü'}.`,
      `Tıklama ${binlik(o.tik)} → <b>${binlik(b.tik)}</b> (${yon(b.tik, o.tik)}).`,
      b.sira && o.sira ? `Ortalama sıra ${String(o.sira).replace('.', ',')} → <b>${String(b.sira).replace('.', ',')}</b> (${b.sira < o.sira ? 'yükseldi' : b.sira > o.sira ? 'geriledi' : 'aynı'}).` : '',
      `İlk 10'da görünen arama sayısı ${binlik(o.ilk10)} → <b>${binlik(b.ilk10)}</b>.`,
    ].filter(Boolean).join(' ');
    const dz = Object.entries(B.dizin || {}).reduce((t, [k, n]) => t + (/indexed|Dizine eklendi/i.test(k) && !/not/i.test(k) ? n : 0), 0);
    const os = (ad, a, z, { ters = false, f = binlik, not = '' } = {}) => `<div class="os"><small>${ad}</small><b>${f(a)}</b><span>${farkRozet(a, z, { ters, not: 'Önceki hafta: ' + f(z) }) || '<span class="dl2 z">—</span>'}<em>önceki ${f(z)}</em></span>${not ? `<i>${not}</i>` : ''}</div>`;
    const sr = (x) => x ? String(x).replace('.', ',') : '—';
    return bas + `<p class="oto-oz">${cumle}</p><p class="note">Bu hafta: ${tarih(b)} · önceki hafta: ${tarih(o)} · Google verisi 2–3 gün geriden gelir.</p>
<div class="oto-g">
${os('Gösterim', b.gos, o.gos)}${os('Tıklama', b.tik, o.tik)}${os('Ortalama sıra', b.sira, o.sira, { ters: true, f: sr, not: 'düşük olan iyi' })}${os('Google\'da görünen yazı', b.sayfa, o.sayfa)}
${os('Görüldüğü arama', b.arama, o.arama, { not: 'farklı arama sayısı' })}${os('İlk 10\'daki arama', b.ilk10, o.ilk10)}${os('İlk 3\'teki arama', b.ilk3, o.ilk3)}
<div class="os"><small>Dizindeki sayfa</small><b>${binlik(dz)}</b><span><em>${binlik(B.dizinSayi || 0)} sayfa denetlendi${GSC && GSC.olusturma ? ' · ' + trTarih(Date.parse(GSC.olusturma)) : ''}</em></span></div>
</div>
<div class="g g2 mt oto-l">
<div><h4>Öne çıkan yazılar <span class="sub">· gösterimi en çok artan</span></h4>${OT.yukselen.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Yazı</th><th class="n">Gösterim</th><th class="n">Sıra</th></tr></thead><tbody>${OT.yukselen.slice(0, 6).map((x) => `<tr><td class="q">${yaziAd(x.u)}</td><td class="n">${binlik(x.gos)} <span class="dl2 u">+${binlik(x.gos - x.oGos)}</span></td><td class="n">${x.oSira ? `${sr(x.oSira)} → ` : ''}${sira(x.sira)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Bu hafta gösterimi artan yazı yok.</p>'}</div>
<div><h4>İlk 10'a yeni giren aramalar</h4>${OT.yeniIlk10.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Arama</th><th class="n">Gösterim</th><th class="n">Sıra</th></tr></thead><tbody>${OT.yeniIlk10.slice(0, 6).map((x) => `<tr><td class="q">${esc(x.k)}</td><td class="n">${binlik(x.gos)}</td><td class="n">${x.oSira ? `${sr(x.oSira)} → ` : '<span class="dl2 u">yeni</span> '}${sira(x.sira)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Bu hafta ilk 10\'a yeni giren arama yok.</p>'}
${OT.dusen.length ? `<h4 class="mt">Gerileyen yazılar</h4><div class="tw"><table class="tbl"><tbody>${OT.dusen.slice(0, 4).map((x) => `<tr><td class="q">${yaziAd(x.u)}</td><td class="n">${binlik(x.gos)} <span class="dl2 d">${binlik(x.gos - x.oGos)}</span></td></tr>`).join('')}</tbody></table></div>` : ''}</div>
</div></div>`;
  })();
  const govde = `${isKutu}${kpiler}${otorite}
<div class="g g-31"><div class="col">${anaGrafik}</div><div class="col">
<div class="card"><div class="hd"><h3>Yayın hattı</h3><a href="${P(c, '/yazilar?d=zamanli')}">Sıra</a></div>
<div class="big">${binlik(S.z)}</div><p class="note" style="margin-top:2px">zamanlanmış yazı · ${ozet.zson ? trTarih(ozet.zson) + ' tarihine kadar dolu' : 'sıra boş'}</p>
<div class="prog" style="--w:${ilerleme}%"><i></i></div><p class="note">${binlik(ozet.yazi)} / ${binlik(ozet.tum)} yazı yayında (%${ilerleme})</p>
<div class="pipe mt">
<a class="r" href="${P(c, '/yazilar?gun=' + gun(now))}"><span>Bugün yayımlanan / planlı</span><b>${binlik(ozet.bugun)}</b></a>
<div class="r"><span>Sıradaki yayın</span><b>${S.zs ? kisaZaman(S.zs) : '—'}</b></div>
<div class="r"><span>Son 7 günde yayımlanan</span><b>${binlik(hafta.n)}</b></div>
<div class="r"><span>Üye · bülten</span><b>${binlik(ozet.uye)} · ${binlik(ozet.bulten)}</b></div>
</div></div>
</div></div>
${CANLI_KUTU}
<div class="g g2 mt">${okunan}${kategori}</div>
<div class="g g2 mt">${sayfalar}${aramalar}</div>
<div class="mt">${siteler}</div>
<div class="g g2 mt alt2">
<div class="card takvim"><div class="hd"><h3>Yayın takvimi</h3><span class="sub">${AY_ADI[ay]} ${yil} · güne basın</span></div><div class="cal"><b>Pt</b><b>Sa</b><b>Ça</b><b>Pe</b><b>Cu</b><b>Ct</b><b>Pz</b>${cal}</div><div class="legend" style="margin-top:12px"><span><i class="lg-y"></i>Yayımlandı</span><span><i class="lg-p"></i>Planlandı</span></div>${gunListe ? `<div class="cgunler">${gunListe}</div>` : ''}</div>
<div class="card"><div class="hd"><h3>Son hareketler <span class="sub">· ${esc(alanAdi)}</span></h3></div><div class="list">${son.results.map(hareket).join('') || bos('i-users', 'Henüz hareket yok', '')}</div></div>
</div>`;
  const saat = new Date(now + TR_SAAT).getUTCHours(), GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const selam = `${saat >= 5 && saat < 11 ? 'Günaydın' : saat < 18 && saat >= 11 ? 'İyi günler' : 'İyi akşamlar'}, ${esc(String(c.uye.ad || '').split(' ')[0] || 'hoş geldiniz')}`;
  const ozetSatir = `${trTarih(now)} ${GUNLER[new Date(now + TR_SAAT).getUTCDay()]} · bugün ${binlik(ozet.bugun)} yazı yayında ya da planlı${S.sc ? ` · ${binlik(S.sc)} soru cevap bekliyor` : ''}`;
  return pSayfa(c, { baslik: 'Genel Bakış', selam, alt: ozetSatir, aktif: 'genel', govde, acts: `<a class="btn btn-o" href="${P(c, '/trafik')}">${IK('i-chart')}Arama raporu</a><a class="btn btn-o" href="${c.base}/sitemap.xml" target="_blank">${IK('i-doc')}Site haritası</a>` });
}

// ---------- Bilge Bey (sitedeki asistan) ----------
// 7 Kasım 2026, kullanıcının isteği: Bilge Bey'in inceleme işleri (/ak/inceleme, ayrı şifreli sayfa) blog yönetim panelinden
// yapılsın. Yalnız yönetici görür (müşteri soruları kişisel veri sayılır). Veri aynı veritabanından (src/inceleme.js).
const BB_SITE = (s) => s === 'tarim' ? 'Tarım Dünyası' : s === 'blog' ? 'HasTürk Blog' : 'HasTürk Gübre';
const BB_KAYNAK = { havuz: ['Hazır cevap', 'c-b'], 'havuz-ai': ['Kayıtlı cevap', 'c-p'], ai: ['Yapay zekâ', 'c-o'], onay: ['Onaylı', 'c-g'], yok: ['Cevapsız', 'c-r'], yonlendir: ['Müşteri hizmetlerine', 'c-y'] };
const BB_KARAR = { yanlis: ['Yanlış', 'c-r'], alakasiz: ['Alakasız', 'c-r'], eksik: ['Eksik', 'c-o'], dogru: ['Doğru', 'c-g'] };
const bbPill = (m, k) => { const x = m[k] || [k, 'c-b']; return `<span class="pill ${x[1]}">${esc(x[0])}</span>`; };
const bbZaman = (ts) => { const t = Date.parse(ts); return t ? kisaZaman(t) : esc(ts || ''); };
async function bilge(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c));
  const t = ['ozet', 'denetim', 'onay', 'olumsuz', 'cevapsiz', 'son'].includes(c.url.searchParams.get('t')) ? c.url.searchParams.get('t') : 'ozet';
  let V; try { V = await bbVeriIc(c.env); } catch (e) { V = { ok: false }; }
  if (!V || !V.ok) return pSayfa(c, { baslik: 'Bilge Bey', alt: 'Sitedeki asistanın soru-cevap kayıtları', aktif: 'bilge', govde: '<div class="card"><p class="muted">Bilge Bey kayıtlarına şu an ulaşılamadı. Biraz sonra tekrar deneyin.</p></div>' });
  const O = V.ozet || {}, oy = O.oy || {}, dk = (O.denetim || {}).karar || {};
  const say = { denetim: V.denetim.length, onay: V.bekleyen.length, olumsuz: V.hayir.length, cevapsiz: V.cevapsiz.length, son: V.son.length };
  const tab = (k, ad, n) => `<a href="${P(c, '/bilge' + (k === 'ozet' ? '' : '?t=' + k))}"${t === k ? ' class="on"' : ''}>${ad}${n != null ? ` <i>${binlik(n)}</i>` : ''}</a>`;
  const sekme = `<div class="tabs">${tab('ozet', 'Özet')}${tab('denetim', 'Denetimde hatalı', say.denetim)}${tab('onay', 'Onay bekleyen', say.onay)}${tab('olumsuz', '“İşe yaramadı” denenler', say.olumsuz)}${tab('cevapsiz', 'Cevapsız', say.cevapsiz)}${tab('son', 'Son sorular', say.son)}</div>`;
  const bos = (a) => `<div class="card"><div class="empty">${IK('i-check')}<b>${a}</b></div></div>`;
  const cevapKutu = (m) => m ? `<details class="bb-c"><summary>Bilge Bey'in verdiği cevap</summary><div class="bb-m">${esc(m)}</div></details>` : '';
  let govde = sekme;
  if (t === 'ozet') {
    const top = O.toplam || 0, hz = O.hazir || 0;
    const dT = Object.values(dk).reduce((a, n) => a + n, 0);
    govde += `<div class="kpis">
${kpi2({ ik: 'i-chat', ad: 'Sorulan soru', deger: binlik(top), alt: 'son 7 gün · ' + binlik(O.cevapsiz || 0) + ' cevapsız' })}
${kpi2({ ik: 'i-check', ad: 'Hazır cevapla', deger: top ? '%' + Math.round(hz / top * 100) : '—', alt: binlik(hz) + ' soru · ücretsiz, anında' })}
${kpi2({ ik: 'i-bulb', ad: 'Yapay zekâ cevabı', deger: binlik(O.claude || 0), alt: 'tahmini maliyet $' + String(O.tahmini_usd || 0).replace('.', ',') })}
${kpi2({ ik: 'i-star', ad: 'İşe yaradı', deger: binlik(oy.evet || 0), alt: `işe yaramadı: ${binlik(oy.hayir || 0)}${oy.evet + oy.hayir ? ' · memnuniyet %' + Math.round(oy.evet / (oy.evet + oy.hayir) * 100) : ''}` })}
${kpi2({ ik: 'i-cart', ad: 'Sepete eklenen', deger: binlik(O.sepete_eklenen || 0), alt: 'Bilge Bey kartlarından · 7 gün' })}
${kpi2({ ik: 'i-eye', ad: 'Denetlenen cevap', deger: binlik(dT), alt: `${binlik((dk.yanlis || 0) + (dk.alakasiz || 0))} hatalı · ${binlik(dk.eksik || 0)} eksik` })}
</div>
<div class="g g2 bb-g">
<div class="card"><div class="hd"><h3>Haftalık denetim</h3><span class="sub">her pazartesi 07:17 otomatik</span></div>
<p class="note" style="margin-top:0">Geçen haftanın cevapları yapay zekâyla tek tek değerlendirilir. Yanlış bulunan hazır cevap o soruya bir daha verilmez; önerilen düzeltme “Denetimde hatalı” sekmesinde onayınızı bekler.</p>
<div class="bb-k">${['dogru', 'eksik', 'yanlis', 'alakasiz'].map((k) => `<div><span>${bbPill(BB_KARAR, k)}</span><b>${binlik(dk[k] || 0)}</b></div>`).join('')}</div>
<form method="post" action="${P(c, '/bilge/denetim')}" class="mt" data-yukleniyor="Denetleniyor, 1–2 dakika sürebilir…"><button class="btn btn-o">${IK('i-eye')}Denetimi şimdi çalıştır</button><p class="note">Son 7 günün henüz bakılmamış en çok 40 sorusu · yaklaşık 0,1 $</p></form></div>
<div class="card"><div class="hd"><h3>Sorun çıkan konular</h3><span class="sub">denetim · 7 gün</span></div>${((O.denetim || {}).sorunlu_konular || []).length ? `<div class="kv">${O.denetim.sorunlu_konular.map((r) => `<span>${esc(r.konu)}</span><b>${binlik(r.n)}</b>`).join('')}</div>` : '<p class="muted">Bu hafta sorunlu konu yok.</p>'}</div>
</div>
<div class="g g2 bb-g">
<div class="card"><div class="hd"><h3>En çok sorulanlar</h3><span class="sub">hazır cevaplar · 7 gün</span></div>${(O.en_cok_konular || []).length ? `<div class="kv">${O.en_cok_konular.map((r) => `<span>${esc(r.soru)}</span><b>${binlik(r.n)}</b>`).join('')}</div>` : '<p class="muted">Veri yok.</p>'}</div>
<div class="card"><div class="hd"><h3>Sepete en çok eklenen</h3><span class="sub">7 gün</span></div>${(O.sepete_en_cok || []).length ? `<div class="kv">${O.sepete_en_cok.map((r) => `<span>${esc(r.urun)}</span><b>${binlik(r.n)}</b>`).join('')}</div>` : '<p class="muted">Veri yok.</p>'}</div>
</div>`;
  } else if (t === 'denetim') {
    govde += V.denetim.length ? `<p class="note bb-not">Düzeltmeyi onaylarsanız aynı soru bundan sonra bu cevabı alır. Metni göndermeden önce düzenleyebilirsiniz. “Kapat” yalnız listeden kaldırır.</p>` + V.denetim.map((r) => `<div class="card bb">
<div class="bb-u">${bbPill(BB_KARAR, r.karar)}${r.konu ? `<span class="et">${esc(r.konu)}</span>` : ''}<span class="et site">${BB_SITE(r.site)}</span><span class="muted">${bbZaman(r.ts)}</span></div>
${r.onceki ? `<p class="bb-o"><small>Önceki mesajı</small>${esc(r.onceki)}</p>` : ''}<p class="bb-q"><small>Müşterinin sorusu</small>${esc(r.q)}</p>
${cevapKutu(r.cevap)}
<p class="bb-n"><small>Denetçinin notu</small>${esc(r.neden || '')}${r.niyet ? ` <span class="muted">· İstenen: ${esc(r.niyet)}</span>` : ''}</p>
<form method="post" action="${P(c, '/bilge/karar')}"><input type="hidden" name="d" value="1"><input type="hidden" name="id" value="${r.id}"><input type="hidden" name="t" value="denetim">
<label class="lab">Önerilen cevap (düzenleyebilirsiniz)</label><textarea class="inp" name="cevap" rows="4">${esc(r.oneri || '')}</textarea>
<div class="bb-b"><button class="btn btn-g" name="karar" value="onayla">${IK('i-check')}Düzeltmeyi onayla</button><button class="btn btn-o" name="karar" value="kapat">Kapat</button></div></form></div>`).join('') : bos('Denetimde bekleyen hatalı cevap yok.');
  } else if (t === 'onay') {
    govde += V.bekleyen.length ? `<p class="note bb-not">Yapay zekânın verdiği cevaplar. Onaylanan cevap hazır cevaplara katılır; aynı soru sonra ücretsiz ve anında cevaplanır.</p>` + V.bekleyen.map((r) => `<div class="card bb">
<div class="bb-u">${bbPill(BB_KAYNAK, 'ai')}<span class="muted">${bbZaman(r.ts)}</span></div><p class="bb-q"><small>Müşterinin sorusu</small>${esc(r.q)}</p>
<form method="post" action="${P(c, '/bilge/karar')}"><input type="hidden" name="id" value="${r.id}"><input type="hidden" name="t" value="onay">
<label class="lab">Verilen cevap (düzenleyip onaylayabilirsiniz)</label><textarea class="inp" name="cevap" rows="5">${esc(r.cevap || '')}</textarea>
<div class="bb-b"><button class="btn btn-g" name="karar" value="onaylandi">${IK('i-check')}Onayla</button><button class="btn btn-o" name="karar" value="reddedildi">Reddet</button></div></form></div>`).join('') : bos('Onay bekleyen cevap yok.');
  } else if (t === 'olumsuz') {
    govde += V.hayir.length ? `<div class="card"><div class="list">${V.hayir.map((r) => `<div class="li bb-li"><div class="tx"><b>${esc(r.q)}</b><small>${bbPill(BB_KAYNAK, r.kaynak)} ${bbZaman(r.ts)}${r.bugun ? ' · bugün verilecek hazır cevap gösteriliyor' : ''}</small>${cevapKutu(r.cevap)}</div></div>`).join('')}</div></div>` : bos('“İşe yaramadı” denen cevap yok.');
  } else if (t === 'cevapsiz') {
    govde += V.cevapsiz.length ? `<div class="card"><p class="note" style="margin-top:0">Bilge Bey'in cevap veremediği ya da müşteri hizmetlerine yönlendirdiği sorular (30 gün). Sık tekrar edenler yeni hazır cevap ya da blog yazısı için fırsattır.</p><div class="list">${V.cevapsiz.map((r) => `<div class="li bb-li"><div class="tx"><b>${esc(r.q)}</b><small>${bbPill(BB_KAYNAK, r.durum === 'yonlendir' ? 'yonlendir' : 'yok')} ${bbZaman(r.ts)}</small>${cevapKutu(r.cevap)}</div></div>`).join('')}</div></div>` : bos('Cevapsız soru yok.');
  } else {
    govde += `<div class="card"><div class="list">${V.son.map((r) => `<div class="li bb-li"><div class="tx"><b>${esc(r.q)}</b><small>${bbPill(BB_KAYNAK, r.kaynak)}<span class="et site">${BB_SITE(r.site)}</span> ${bbZaman(r.ts)}</small>${cevapKutu(r.cevap)}</div></div>`).join('') || '<p class="muted">Kayıt yok.</p>'}</div></div>`;
  }
  return pSayfa(c, { baslik: 'Bilge Bey', alt: 'Sitedeki asistanın soru-cevap kayıtları, haftalık denetim ve onaylar · son 7–30 gün', aktif: 'bilge', govde });
}
async function bilgeKarar(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c));
  const f = await formOku(c.req);
  const t = ['denetim', 'onay'].includes(f.t) ? f.t : 'denetim';
  const r = await bbKararIc(c.env, { d: f.d === '1' ? 1 : undefined, id: f.id, karar: f.karar, cevap: f.cevap }).catch(() => ({ ok: false }));
  return yonlendir(P(c, `/bilge?t=${t}&m=${r.ok ? (/onay/.test(f.karar) ? 'onaylandi' : f.karar === 'reddedildi' ? 'reddedildi' : 'kaydedildi') : 'hata'}`));
}
async function bilgeDenetim(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c));
  const ad = ['ANTHROPIC_API_KEY', 'akbilge', 'AKBILGE', 'AkBilge', 'Akbilge'].find((n) => typeof c.env[n] === 'string' && c.env[n].trim());
  if (!ad) return yonlendir(P(c, '/bilge?m=hata'));
  const r = await bbDenetle(c.env, String(c.env[ad]).trim(), { azami: 40, zorla: true }).catch(() => ({ ok: false }));
  return yonlendir(P(c, '/bilge?' + (r.ok ? 'm=denetlendi&n=' + (r.incelenen || 0) : 'm=hata')));
}

// ---------- Canlı: son 30 dakika (Google Analytics gerçek zamanlı) ----------
// Panel sayfası boş bir kutu basar, /blog-statik/panel.js bu kartı yükler ve dakikada bir yeniler
const CANLI_KUTU = '<div class="card canli" data-canli><div class="hd"><h3><i class="nabiz"></i>Şu an sitelerde</h3><span class="sub">son 30 dakika · yükleniyor…</span></div></div>';
async function canliKart(c) {
  const v = await canli(c.env);
  const CIHAZ = { mobile: 'Mobil', desktop: 'Masaüstü', tablet: 'Tablet' };
  let ic;
  if (v.hata) ic = `<div class="setup"><b>Canlı veri için bir adım kaldı</b><ol><li>${v.hata === 'anahtar' ? "Cloudflare → Workers &amp; Pages → <b>hasturk-arama</b> → Settings → Variables and Secrets → <b>Add</b>: tür <b>Secret</b>, ad <code>GSC_ANAHTAR</code>, değer: servis hesabı JSON dosyasının tamamı." : 'Google oturumu açılamadı; GSC_ANAHTAR değerini kontrol edin.'}</li></ol></div>`;
  else {
    const S = v.siteler.filter((s) => !s.hata), top = S.reduce((a, s) => a + s.aktif, 0);
    const dk = Array(30).fill(0); S.forEach((s) => s.dakika.forEach((n, i) => { dk[i] += n; }));
    const dmax = Math.max(1, ...dk);
    const sayfa = S.flatMap((s) => s.sayfa.map((r) => ({ ad: s.ad, r }))).sort((a, b) => b.r[1] - a.r[1]).slice(0, 8);
    const sehir = new Map(); S.forEach((s) => s.sehir.forEach(([k, n]) => sehir.set(k, (sehir.get(k) || 0) + n)));
    const cihaz = new Map(); S.forEach((s) => s.cihaz.forEach(([k, n]) => cihaz.set(k, (cihaz.get(k) || 0) + n)));
    ic = `<div class="canli-g"><div><div class="big">${binlik(top)}</div><p class="note">aktif kullanıcı · son 30 dakika</p>
<div class="dk" aria-label="Dakika dakika aktif kullanıcı">${dk.map((n, i) => `<i style="--h:${Math.max(4, Math.round(n / dmax * 100))}%" title="${29 - i} dk önce: ${n}"></i>`).join('')}</div><div class="dk-x"><span>30 dk önce</span><span>şimdi</span></div>
<div class="kv mt">${v.siteler.map((s) => `<span>${siteNokta(s.ad)}${esc(s.etiket)}</span><b>${s.hata ? '<span class="muted">erişim yok</span>' : binlik(s.aktif)}</b>`).join('')}</div></div>
<div><h4 class="ch">Hangi sayfada</h4>${sayfa.length ? `<table class="tbl"><tbody>${sayfa.map(({ ad, r }) => `<tr><td class="q">${siteNokta(ad)}${esc(r[0] || '(başlıksız)')}</td><td class="n">${binlik(r[1])}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Şu an sitede kimse yok.</p>'}</div>
<div><h4 class="ch">Şehir</h4><div class="kv">${[...sehir].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `<span>${esc(k === '(not set)' ? 'Belirsiz' : k)}</span><b>${binlik(n)}</b>`).join('') || '<span>—</span><b></b>'}</div>
<h4 class="ch mt">Cihaz</h4><div class="kv">${[...cihaz].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span>${CIHAZ[k] || esc(k)}</span><b>${binlik(n)}</b>`).join('') || '<span>—</span><b></b>'}</div></div></div>`;
  }
  const saat = new Date(v.ts + TR_SAAT).toISOString().slice(11, 16);
  return html(`<div class="hd"><h3><i class="nabiz"></i>Şu an sitelerde</h3><span class="sub">Google Analytics · ${saat} · dakikada bir yenilenir</span></div>${ic}`, { noindex: true });
}

// ---------- Reklam önerileri: ekip kararı (yalnız panelde kayıt; Google Ads'te hiçbir şey değişmez) ----------
const KARAR = { uygulandi: ['Uygulandı', 'c-g'], yoksay: ['Yoksayıldı', 'c-r'], sonra: ['Sonraya bırakıldı', 'c-o'] };
async function reklamKarar(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c, '/trafik'));
  const f = await formOku(c.req);
  const id = String(f.id || '').slice(0, 300), d = String(f.d || '');
  const k = { ...(c.A.ads_karar || {}) };
  if (id && KARAR[d]) k[id] = { d, ts: Date.now(), kim: c.uye.ad };
  else if (id && d === 'sil') delete k[id];
  await ayarYaz(c.db, 'ads_karar', k);
  return yonlendir(P(c, '/trafik?t=oneri&s=' + encodeURIComponent(String(f.s || 'tum')) + '#oneriler'));
}
// Önerinin dayandığı ilke(ler): bilgi tabanı (scripts/reklam-bilgi.mjs) rapor özetinde gelir
function dayanak(o) {
  const B = (GSC && GSC.bilgi) || {};
  const d = (o.dayanak || []).filter((k) => B[k]);
  if (!d.length) return '';
  return `<details class="dy"><summary><b>Dayanak:</b> ${d.map((k) => esc(B[k].baslik)).join(' · ')}</summary>${d.map((k) => `<p><b>${esc(B[k].baslik)}.</b> ${esc(B[k].ilke)} ${B[k].kaynak.map(([ad, u]) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(ad)} ↗</a>` : `<span class="muted">${esc(ad)}</span>`).join(' · ')}</p>`).join('')}</details>`;
}
function oneriKart(c, o, sSec) {
  const k = (c.A.ads_karar || {})[o.id];
  const ON = { 1: ['Öncelikli', 'c-r'], 2: ['Önerilen', 'c-o'], 3: ['Bilgi', 'c-b'] }[o.oncelik] || ['Öneri', 'c-o'];
  const btn = (d, ad) => `<form method="post" action="${P(c, '/reklam-karar')}"><input type="hidden" name="id" value="${esc(o.id)}"><input type="hidden" name="s" value="${esc(sSec)}"><button class="btn btn-o btn-s" name="d" value="${d}">${ad}</button></form>`;
  return `<article class="oneri o${o.oncelik}${k ? ' karar' : ''}"><div class="oh"><span class="pill ${ON[1]}">${ON[0]}</span><span class="chipf">${siteNokta(o.site)}${esc(o.etiket)}</span>${o.etki ? `<span class="note">etki ≈ ${binlik(Math.round(o.etki))} ₺ / 28 gün</span>` : ''}</div>
<h4>${esc(o.baslik)}</h4><p class="ne"><b>Neden?</b> ${esc(o.neden)}</p>
<div class="ny"><b>Ne yapılmalı?</b><ol>${o.yapilacak.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
${dayanak(o)}
${o.liste && o.liste.length ? `<details class="ol"><summary>Liste (${o.liste.length})</summary><table class="tbl"><tbody>${o.liste.map((r) => `<tr><td class="q">${esc(r[0])}<small class="muted" style="display:block">${esc(r[2] || '')}</small></td><td class="nw" style="text-align:right">${esc(r[1])}</td></tr>`).join('')}</tbody></table></details>` : ''}
<div class="of">${k ? `<span class="pill ${KARAR[k.d][1]}">${KARAR[k.d][0]}</span><span class="note">${esc(k.kim || '')} · ${trTarih(k.ts)}</span>${btn('sil', 'Geri al')}` : `${btn('uygulandi', 'Uygulandı')}${btn('sonra', 'Sonra')}${btn('yoksay', 'Yoksay')}`}</div></article>`;
}

// ---------- Satış kaynakları: hangi kaynak/sayfa satış getiriyor (blog, video, sosyal, arama, reklam) ----------
// Oturum kaynağı (son tıklama) + kullanıcının ilk geliş kaynağı + giriş sayfası. Blog yazıları iki yoldan görünür:
// 1) bu blogdan mağazaya giden bağlantılar utm_source=blog, utm_campaign=<yazı adresi>; 2) mağazanın kendi /blog sayfaları (giriş sayfası).
const VIDEO = /youtube|youtu\.be|instagram|facebook|(^|\.)fb\.|tiktok|pinterest|(^|\.)t\.co$|twitter|(^|\.)x\.com$|linkedin/i;
const YZ = /chatgpt|openai|copilot|perplexity|gemini\.google|claude\.ai/i;
// Ödeme sayfası / e-posta deposu yönlendirmeleri: satış kaynağı değil, ölçüm kaybı (GA4 istenmeyen yönlendirmeler listesine eklenmeli)
const ODEME = /tami\.com\.tr|paytr|masterpass|iyzico|garanti|akbank|isbank|yapikredi|ziraat|3dsecure|amazonaws/i;
export function satisKaynak(c, V, sSec, url) {
  const yon = yetkili(c.uye, 'ayar');
  const G = V.ga.filter((g) => g.satKaynak && g.ad !== 'blog');
  const bos = (a, b) => `<div class="empty">${IK('i-cart')}<b>${a}</b><span>${b}</span></div>`;
  if (!V.canli) return `<div class="card">${bos('Satış kaynağı verisi anlık çekilir', 'Google bağlantısı (Cloudflare GSC_ANAHTAR) gerekli; şu an anlık veri alınamadı.')}</div>`;
  if (!G.length) return `<div class="card">${bos('Veri yok', 'Mağaza mülklerinden satış kaynağı verisi gelmedi.')}</div>`;
  const sel = sSec === 'tum' ? G : G.filter((g) => g.ad === sSec);
  const TL = (x) => binlik(Math.round(x)) + ' ₺';
  const grup = (src, med) => /blog\.hasturkgubre|^blog$/i.test(src) ? 'Blog (blog.hasturkgubre)' : src === '(not set)' ? 'Kaynaksız (ölçüm kaybı)' : ODEME.test(src) ? 'Ödeme sayfası (ölçüm kaybı)' : YZ.test(src) ? 'Yapay zekâ asistanları' : VIDEO.test(src) ? 'Video / sosyal medya' : /cpc|ppc|paid/i.test(med) || /googleads|syndicatedsearch/i.test(src) ? 'Reklam' : med === 'organic' ? 'Organik arama' : src === '(direct)' ? 'Doğrudan' : med === 'referral' ? 'Diğer siteler' : 'Diğer';
  const topla = (rows, kf) => { const m = new Map(); rows.forEach((r) => { const k = kf(r); const x = m.get(k) || { k, ot: 0, sat: 0, gel: 0 }; x.ot += r[2]; x.sat += r[3]; x.gel += r[4]; m.set(k, x); }); return [...m.values()].sort((a, b) => b.gel - a.gel || b.sat - a.sat); };
  const kaynak = sel.flatMap((g) => g.satKaynak.map((r) => ({ ad: g.ad, r })));
  const gruplar = topla(kaynak.map((x) => x.r), (r) => grup(r[0], r[1]));
  const ilkGrup = topla(sel.flatMap((g) => g.satIlk || []), (r) => grup(r[0], r[1]));
  const T = gruplar.reduce((a, x) => ({ ot: a.ot + x.ot, sat: a.sat + x.sat, gel: a.gel + x.gel }), { ot: 0, sat: 0, gel: 0 });
  const blogG = gruplar.find((x) => x.k.startsWith('Blog')) || { ot: 0, sat: 0, gel: 0 }, vidG = gruplar.find((x) => x.k.startsWith('Video')) || { ot: 0, sat: 0, gel: 0 };
  const magBlog = sel.flatMap((g) => (g.satGiris || []).filter((r) => /^\/blog\//.test(r[0])).map((r) => ({ ad: g.ad, r }))).sort((a, b) => b.r[3] - a.r[3] || b.r[2] - a.r[2]);
  const mb = magBlog.reduce((a, { r }) => ({ ot: a.ot + r[1], sat: a.sat + r[2], gel: a.gel + r[3] }), { ot: 0, sat: 0, gel: 0 });
  const blogYazi = sel.flatMap((g) => (g.satKampanya || []).filter((r) => r[0] === 'blog').map((r) => ({ ad: g.ad, r }))).sort((a, b) => b.r[4] - a.r[4] || b.r[3] - a.r[3]);
  const vidSat = kaynak.filter(({ r }) => VIDEO.test(r[0]) || YZ.test(r[0])).sort((a, b) => b.r[4] - a.r[4] || b.r[3] - a.r[3] || b.r[2] - a.r[2]).slice(0, 20);
  const kayip = gruplar.filter((x) => /ölçüm kaybı/.test(x.k)).reduce((a, x) => ({ sat: a.sat + x.sat, gel: a.gel + x.gel }), { sat: 0, gel: 0 });
  const gel = (x) => yon ? `<td class="n">${TL(x)}</td>` : '';
  const gelB = yon ? '<th class="n">Gelir</th>' : '';
  const oran = (s, o) => o ? '%' + (s / o * 100).toFixed(1).replace('.', ',') : '—';
  const siteSec = `<div class="seg"><a href="${url({ s: 'tum' })}"${sSec === 'tum' ? ' class="on"' : ''}>İki mağaza</a>${G.map((g) => `<a href="${url({ s: g.ad })}"${sSec === g.ad ? ' class="on"' : ''}>${siteNokta(g.ad)}${esc(g.etiket)}</a>`).join('')}</div>`;
  return `<div class="ayar-nav" style="position:static;padding-top:0">${siteSec}<span class="note">Kaynak: mağazaların Google Analytics verisi</span></div>
<div class="kpis k4">
${kpi2({ ik: 'i-cart', ad: 'Toplam satış', deger: binlik(T.sat), alt: yon ? TL(T.gel) + ' gelir' : binlik(T.ot) + ' oturum' })}
${kpi2({ ik: 'i-doc', ad: 'Blogdan gelen satış', deger: binlik(blogG.sat + mb.sat), alt: `blog.hasturkgubre ${binlik(blogG.sat)} · mağaza blogu ${binlik(mb.sat)}${yon ? ' · ' + TL(blogG.gel + mb.gel) : ''}` })}
${kpi2({ ik: 'i-yt', ad: 'Video / sosyal medya satışı', deger: binlik(vidG.sat), alt: binlik(vidG.ot) + ' oturum' + (yon ? ' · ' + TL(vidG.gel) : '') })}
${kpi2({ ik: 'i-users', ad: 'İlk gelişi blog/video olup satın alan', deger: binlik(ilkGrup.filter((x) => /^Blog|^Video/.test(x.k)).reduce((a, x) => a + x.sat, 0)), alt: 'sonradan başka yoldan dönüp alanlar dahil' })}
</div>
<div class="g g2"><div class="card"><div class="hd"><h3>Satış hangi kanaldan geliyor</h3><span class="sub">oturum kaynağı · son tıklama</span></div><div class="tw"><table class="tbl"><thead><tr><th>Kanal</th><th class="n">Oturum</th><th class="n">Satış</th><th class="n">Dönüşüm</th>${gelB}</tr></thead><tbody>${gruplar.map((x) => `<tr><td class="q">${esc(x.k)}</td><td class="n">${binlik(x.ot)}</td><td class="n">${binlik(x.sat)}</td><td class="n">${oran(x.sat, x.ot)}</td>${gel(x.gel)}</tr>`).join('')}</tbody></table></div>${kayip.sat ? `<p class="note" style="padding-top:10px">${binlik(kayip.sat)} satışın${yon ? ' (' + TL(kayip.gel) + ')' : ''} gerçek kaynağı bilinmiyor: müşteri ödeme sayfasından dönünce Analytics yeni ziyaret başlatıyor. Analytics → Veri akışı → Etiket ayarları → "İstenmeyen yönlendirmeler"e ödeme alan adları eklenince bu satışlar doğru kanala yazılır.</p>` : ''}</div>
<div class="card"><div class="hd"><h3>Müşteri bizi ilk nereden buldu</h3><span class="sub">ilk geliş kaynağı · sonra alışveriş</span></div><div class="tw"><table class="tbl"><thead><tr><th>İlk kaynak</th><th class="n">Kullanıcı</th><th class="n">Satış</th>${gelB}</tr></thead><tbody>${ilkGrup.map((x) => `<tr><td class="q">${esc(x.k)}</td><td class="n">${binlik(x.ot)}</td><td class="n">${binlik(x.sat)}</td>${gel(x.gel)}</tr>`).join('')}</tbody></table></div><p class="note" style="padding-top:10px">Örnek: müşteri ilk kez bir videodan geldi, iki gün sonra Google'dan dönüp aldıysa satış solda "Organik arama", burada "Video" altında görünür.</p></div></div>
<div class="g g2 mt"><div class="card"><div class="hd"><h3>Satış getiren mağaza blog yazıları</h3><span class="sub">hasturkgubre.com.tr/blog · giriş sayfası</span></div>${magBlog.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Yazı</th><th class="n">Oturum</th><th class="n">Satış</th>${gelB}</tr></thead><tbody>${magBlog.slice(0, 15).map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[0].replace(/^\/blog\//, ''))}</td><td class="n">${binlik(r[1])}</td><td class="n">${binlik(r[2])}</td>${gel(r[3])}</tr>`).join('')}</tbody></table></div>` : bos('Bu aralıkta veri yok', '')}<p class="note" style="padding-top:10px">Ziyaretin bu yazıyla başladığı ve aynı ziyarette alışveriş yapılan oturumlar.</p></div>
<div class="card"><div class="hd"><h3>Satış getiren blog.hasturkgubre yazıları</h3><span class="sub">utm_source=blog · yazı adresi</span></div>${blogYazi.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Yazı</th><th>Yer</th><th class="n">Oturum</th><th class="n">Satış</th>${gelB}</tr></thead><tbody>${blogYazi.slice(0, 25).map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[1])}</td><td>${esc(r[2] === '(not set)' ? '—' : r[2])}</td><td class="n">${binlik(r[3])}</td><td class="n">${binlik(r[4])}</td>${gel(r[5])}</tr>`).join('')}</tbody></table></div>` : bos('Henüz veri yok', 'Blogdaki ürün kartlarına tıklayan ziyaretçiler yazı adıyla etiketlenir; ilk satışlarla burada görünür.')}</div></div>
<div class="card mt"><div class="hd"><h3>Video, sosyal medya ve yapay zekâdan gelen ziyaret ve satış</h3><span class="sub">YouTube, Instagram, Facebook, TikTok, ChatGPT, Copilot · en çok 20</span></div>${vidSat.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Kaynak / ortam</th><th class="n">Oturum</th><th class="n">Satış</th><th class="n">Dönüşüm</th>${gelB}</tr></thead><tbody>${vidSat.map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[0] + ' / ' + r[1])}</td><td class="n">${binlik(r[2])}</td><td class="n">${binlik(r[3])}</td><td class="n">${oran(r[3], r[2])}</td>${gel(r[4])}</tr>`).join('')}</tbody></table></div>` : bos('Bu aralıkta video/sosyal kaynaklı ziyaret yok', '')}<p class="note" style="padding-top:10px">Videoya koyduğunuz bağlantılara <code>?utm_source=youtube&amp;utm_campaign=video-adi</code> eklerseniz hangi videonun satış getirdiği ayrı ayrı görünür.</p></div>`;
}

// ---------- Arama & Trafik ----------
// Sekmeler: Google (Search Console, üç site) · Site içi aramalar (blog, mağaza, sonuçsuz) · Google Analytics (kurulum)
async function trafik(c) {
  const t = ['google', 'site', 'bot', 'analytics', 'kaynak', 'reklam', 'oneri'].includes(c.url.searchParams.get('t')) ? c.url.searchParams.get('t') : 'google';
  // Tarih aralığı: Google'dan anlık (15 dk önbellek); anahtar yoksa ya da hata olursa günlük rapor (28 gün) gösterilir
  const ar = aralikCoz(c.url.searchParams);
  let V = null, vHata = '';
  // Varsayılan aralıkta (28 gün) Google beklenmez: önbellekte yoksa günlük rapor gösterilir, anlık veri arkada hazırlanır
  let hazirlaniyor = false;
  if (t !== 'site' && t !== 'bot') { try { V = await googleVeri(c.env, ar, gscSiteler(), { ctx: c.ctx, bekle: ar.k !== '28' }); hazirlaniyor = !V; } catch (e) { vHata = e.message; } }
  if (!V) V = { siteler: gscSiteler(), ga: gaSiteler(), canli: false };
  const arAd = V.canli || t === 'site' || t === 'bot' ? `${ar.ad} · ${ar.bas.split('-').reverse().join('.')}${ar.bas !== ar.bit ? ' – ' + ar.bit.split('-').reverse().join('.') : ''}` : 'Son 28 gün (günlük rapor)';
  const GS = V.siteler;
  const sSec = c.url.searchParams.get('s') || 'tum';
  const sec = sSec === 'tum' ? GS : GS.filter((s) => s.ad === sSec);
  const q = (c.url.searchParams.get('q') || '').trim().toLocaleLowerCase('tr-TR'), tumu = c.url.searchParams.get('n') === 'tum';
  const arP = ar.k === 'ozel' ? { r: 'ozel', bas: ar.bas, bit: ar.bit } : ar.k === '28' ? {} : { r: ar.k };
  const url = (o) => { const u = new URLSearchParams({ t, s: sSec, ...arP, ...o }); return P(c, '/trafik?' + u); };
  const tl = (tt) => P(c, '/trafik?' + new URLSearchParams({ t: tt, ...arP }));
  const aralikSec = `<div class="aralik"><div class="seg">${ARALIKLAR.map(([k, a]) => `<a href="${url({ r: k, bas: '', bit: '' }).replace(/&bas=&bit=/, '')}"${ar.k === k ? ' class="on"' : ''}>${a}</a>`).join('')}</div>
<form method="get" action="${P(c, '/trafik')}" class="ozel${ar.k === 'ozel' ? ' on' : ''}"><input type="hidden" name="t" value="${esc(t)}"><input type="hidden" name="s" value="${esc(sSec)}"><input type="hidden" name="r" value="ozel"><label><span class="sr">Başlangıç</span><input type="date" name="bas" value="${esc(ar.bas)}" max="${esc(ar.bit > ar.bas ? ar.bit : ar.bas)}"></label><span>–</span><label><span class="sr">Bitiş</span><input type="date" name="bit" value="${esc(ar.bit)}"></label><button class="btn btn-o btn-s">Uygula</button></form>
<span class="note">${esc(arAd)}${t !== 'site' && t !== 'bot' && !V.canli ? (hazirlaniyor ? ' · anlık veri hazırlanıyor, birazdan yenileyin' : ' · anlık veri alınamadı') : ''}</span></div>`;
  const sekme = `<div class="tabs"><a href="${tl('google')}"${t === 'google' ? ' class="on"' : ''}>${IK('i-g')}Google Arama</a><a href="${tl('site')}"${t === 'site' ? ' class="on"' : ''}>${IK('i-search')}Site içi aramalar</a><a href="${tl('bot')}"${t === 'bot' ? ' class="on"' : ''}>${IK('i-eye')}Bot taramaları</a><a href="${tl('analytics')}"${t === 'analytics' ? ' class="on"' : ''}>${IK('i-chart')}Google Analytics</a><a href="${tl('kaynak')}"${t === 'kaynak' ? ' class="on"' : ''}>${IK('i-cart')}Satış kaynakları</a>${yetkili(c.uye, 'ayar') ? `<a href="${tl('reklam')}"${t === 'reklam' ? ' class="on"' : ''}>${IK('i-fire')}Google Ads</a><a href="${tl('oneri')}"${t === 'oneri' ? ' class="on"' : ''}>${IK('i-bulb')}Reklam önerileri${(() => { const n = ((GSC && GSC.reklamOneri) || []).filter((o) => !(c.A.ads_karar || {})[o.id]).length; return n ? ` <i>${n}</i>` : ''; })()}</a>` : ''}</div>`;
  const bos = (ik, a, b) => `<div class="empty">${IK(ik)}<b>${a}</b><span>${b}</span></div>`;
  let govde = sekme + aralikSec;
  if (t === 'google') {
    if (!GS.length) govde += `<div class="card">${bos('i-g', 'Search Console verisi henüz yok', 'Rapor işi her sabah Google verisini çeker; ilk çalıştırmadan sonra burada görünür.')}</div>`;
    else {
      const gg = gscGunler(sec);
      const top = (i) => gg.map((_, k) => sec.reduce((a, s) => a + gscSeri(s, gg, i)[k], 0));
      const gos = top(2), tik = top(1);
      const T = sec.reduce((a, s) => { const x = s.toplam || {}; return { tik: a.tik + (x.tik || 0), gos: a.gos + (x.gos || 0), sw: a.sw + (x.sira || 0) * (x.gos || 0) }; }, { tik: 0, gos: 0, sw: 0 });
      const sorgu = gscBirlestir(sec, 'sorgu').filter((x) => !q || String(x.k).toLocaleLowerCase('tr-TR').includes(q));
      const sayfa = gscBirlestir(sec, 'sayfa');
      const firsat = sorgu.filter((x) => x.sira > 3 && x.sira <= 20 && x.gos >= 3 && x.ctr < 5).slice(0, 12);
      const cihaz = gscBirlestir(sec, 'cihaz'), ulke = gscBirlestir(sec, 'ulke').slice(0, 6);
      const CIHAZ = { MOBILE: 'Mobil', DESKTOP: 'Masaüstü', TABLET: 'Tablet' }, ULKE = { tur: 'Türkiye', deu: 'Almanya', nld: 'Hollanda', aze: 'Azerbaycan', usa: 'ABD', gbr: 'Birleşik Krallık', fra: 'Fransa', aut: 'Avusturya', bel: 'Belçika', cyp: 'Kıbrıs', bra: 'Brezilya', che: 'İsviçre', arg: 'Arjantin', aus: 'Avustralya', rus: 'Rusya', irq: 'Irak', bgr: 'Bulgaristan', grc: 'Yunanistan', swe: 'İsveç', dnk: 'Danimarka', ita: 'İtalya', esp: 'İspanya', geo: 'Gürcistan', ukr: 'Ukrayna', can: 'Kanada', sau: 'Suudi Arabistan', are: 'BAE', ind: 'Hindistan', irn: 'İran', syr: 'Suriye', kaz: 'Kazakistan', uzb: 'Özbekistan', tkm: 'Türkmenistan', kgz: 'Kırgızistan', mkd: 'Kuzey Makedonya', bih: 'Bosna-Hersek', alb: 'Arnavutluk', xkx: 'Kosova', pol: 'Polonya', rou: 'Romanya', nor: 'Norveç' };
      const dizin = {}; sec.forEach((s) => Object.entries(s.dizin || {}).forEach(([k, n]) => { dizin[k] = (dizin[k] || 0) + n; }));
      const DIZ = (k) => /Submitted and indexed|Dizine eklendi|indexed/i.test(k) && !/not/i.test(k) ? 'Dizinde' : /Crawled - currently not indexed/i.test(k) ? 'Tarandı, dizinde değil' : /Discovered - currently not indexed/i.test(k) ? 'Keşfedildi, taranmadı' : /unknown/i.test(k) ? 'Google henüz bilmiyor' : k;
      const yolKisa = (u) => String(u).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      const siteSec = `<div class="seg"><a href="${url({ s: 'tum' })}"${sSec === 'tum' ? ' class="on"' : ''}>Tüm siteler</a>${GS.map((s) => `<a href="${url({ s: s.ad })}"${sSec === s.ad ? ' class="on"' : ''}>${siteNokta(s.ad)}${esc(s.etiket)}</a>`).join('')}</div>`;
      govde += `<div class="ayar-nav" style="position:static;padding-top:0">${siteSec}<span class="note">Kaynak: Google Search Console${V.canli ? ' · son 2–3 günün verisi eksik olabilir' : ''}</span></div>
<div class="kpis k4">
${kpi2({ ik: 'i-eye', ad: 'Gösterim', deger: binlik(T.gos), seri: gos, x: gg, renk: '#4f46e5' })}
${kpi2({ ik: 'i-arrow', ad: 'Tıklama', deger: binlik(T.tik), seri: tik, x: gg, renk: '#16a34a' })}
${kpi2({ ik: 'i-chart', ad: 'Tıklama oranı (TO)', deger: T.gos ? yuzde(Math.round(T.tik / T.gos * 1000) / 10) : '—', alt: 'tıklama / gösterim' })}
${kpi2({ ik: 'i-star', ad: 'Ortalama sıra', deger: T.gos ? String(Math.round(T.sw / T.gos * 10) / 10).replace('.', ',') : '—', alt: 'düşük olan daha iyi' })}
</div>
${(() => { const sr = [{ ad: 'Gösterim', v: gos, r: '#4f46e5', alan: true }, { ad: 'Tıklama', v: tik, r: '#16a34a', sag: true }]; return `<div class="card"><div class="hd"><h3>Günlük gösterim ve tıklama</h3>${lejant(sr)}</div><div class="chart2">${cizgi(gg, sr, { H: 260 })}</div></div>`; })()}
<div class="g g-31 mt"><div class="card"><div class="hd"><h3>Arama sorguları <span class="sub">· ${binlik(sorgu.length)} sorgu</span></h3><form method="get" action="${P(c, '/trafik')}" class="fin" style="max-width:260px;height:32px"><input type="hidden" name="t" value="google"><input type="hidden" name="s" value="${esc(sSec)}">${IK('i-search')}<input name="q" value="${esc(q)}" placeholder="Sorgu filtrele…"></form></div>
<div class="tw"><table class="tbl"><thead><tr><th>Sorgu</th><th class="n">Tıklama</th><th class="n">Gösterim</th><th class="n">TO</th><th class="n">Sıra</th></tr></thead><tbody>${sorgu.slice(0, tumu ? 300 : 25).map((r) => `<tr><td class="q">${sSec === 'tum' ? r.site.map(siteNokta).join('') : ''}${esc(r.k)}</td><td class="n">${binlik(r.tik)}</td><td class="n">${binlik(r.gos)}</td><td class="n">${yuzde(r.ctr)}</td><td class="n">${sira(r.sira)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Eşleşen sorgu yok.</td></tr>'}</tbody></table></div>${sorgu.length > 25 ? `<p class="note" style="padding:12px 0 0">${tumu ? `${binlik(Math.min(300, sorgu.length))} sorgu gösteriliyor · <a class="lnk" href="${url({ q })}">Kısalt</a>` : `İlk 25 sorgu · <a class="lnk" href="${url({ q, n: 'tum' })}">Tümünü göster (${binlik(sorgu.length)})</a>`}</p>` : ''}</div>
<div class="g" style="align-content:start"><div class="card"><div class="hd"><h3>Fırsatlar</h3><span class="sub">1. sayfaya yakın, az tıklanan</span></div>${firsat.length ? `<div class="tw"><table class="tbl"><tbody>${firsat.map((r) => `<tr><td class="q">${esc(r.k)}</td><td class="n">${binlik(r.gos)}</td><td class="n">${sira(r.sira)}</td></tr>`).join('')}</tbody></table></div><p class="note" style="padding-top:12px">Bu sorgularda başlık ve açıklama iyileştirilirse tıklama artar.</p>` : bos('i-star', 'Şimdilik fırsat yok', '')}</div>
<div class="card"><div class="hd"><h3>Cihaz</h3></div><div class="kv">${cihaz.map((r) => `<span>${CIHAZ[r.k] || esc(r.k)}</span><b>${binlik(r.gos)} · ${T.gos ? Math.round(r.gos / T.gos * 100) : 0}%</b>`).join('')}</div></div>
<div class="card"><div class="hd"><h3>Ülke</h3></div><div class="kv">${ulke.map((r) => `<span>${ULKE[r.k] || esc(String(r.k).toUpperCase())}</span><b>${binlik(r.gos)}</b>`).join('')}</div></div>
<div class="card"><div class="hd"><h3>Dizin durumu</h3><span class="sub">URL denetimi</span></div>${Object.keys(dizin).length ? `<div class="kv">${Object.entries(dizin).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span>${esc(DIZ(k))}</span><b>${binlik(n)}</b>`).join('')}</div><p class="note" style="padding-top:10px">${sec.map((s) => `${esc(s.etiket)}: ${binlik(s.dizinSayi || 0)} sayfa denetlendi`).join(' · ')}</p>` : bos('i-check', 'Denetim bekleniyor', '')}</div>
<div class="card"><div class="hd"><h3>Site haritaları</h3></div><div class="list">${sec.flatMap((s) => (s.harita || []).map((h) => `<div class="li"><span class="ic">${IK(h.hata ? 'i-x2' : 'i-check')}</span><div class="tx"><b>${siteNokta(s.ad)}${esc(yolKisa(h.yol).replace(/^[^/]+/, ''))}</b><small>${binlik(h.gonderilen)} adres${h.hata ? ` · <span class="dn">${h.hata} hata</span>` : ''}${h.uyari ? ` · ${h.uyari} uyarı` : ''}${h.son ? ' · son okuma ' + esc(String(h.son).slice(0, 10).split('-').reverse().join('.')) : ''}</small></div></div>`)).join('') || '<p class="muted">Gönderilmiş site haritası yok.</p>'}</div></div></div></div>
<div class="card mt"><div class="hd"><h3>En çok görünen sayfalar</h3></div><div class="tw"><table class="tbl"><thead><tr><th>Sayfa</th><th class="n">Tıklama</th><th class="n">Gösterim</th><th class="n">TO</th><th class="n">Sıra</th></tr></thead><tbody>${sayfa.slice(0, 20).map((r) => `<tr><td class="q">${sSec === 'tum' ? r.site.map(siteNokta).join('') : ''}<a href="${esc(r.k)}" target="_blank" rel="noopener">${esc(yolKisa(r.k))}</a></td><td class="n">${binlik(r.tik)}</td><td class="n">${binlik(r.gos)}</td><td class="n">${yuzde(r.ctr)}</td><td class="n">${sira(r.sira)}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
  } else if (t === 'bot') {
    // Bot taramaları: blogun sunucusunun kendi kaydı (src/blog/index.js); bot adı tarayıcının kendini tanıttığı addan
    const al = (sql, ...b) => c.db.prepare(sql).bind(...b).all().then((r) => r.results || []).catch(() => []);
    // Bot kaydı anlık: hazır aralıklar bugünü de kapsar (Google verisi gibi bir gün geriden gelmez)
    const bitB = ['dun', 'ozel'].includes(ar.k) ? ar.bit : gun();
    const [gunluk, sayfa, hata, yazi] = await Promise.all([
      al("SELECT d, x, SUM(n) n FROM b_istat WHERE k = 'bot' AND d >= ? AND d <= ? GROUP BY d, x", ar.bas, bitB),
      al("SELECT x, SUM(n) n FROM b_istat WHERE k = 'bot_s' AND d >= ? AND d <= ? GROUP BY x", ar.bas, bitB),
      al("SELECT x, SUM(n) n, MAX(d) son FROM b_istat WHERE k = 'bot_h' AND d >= ? AND d <= ? GROUP BY x ORDER BY n DESC LIMIT 40", ar.bas, bitB),
      al(`SELECT slug, baslik, id, yayin_ts FROM b_yazi WHERE ${YAYINDA} ORDER BY yayin_ts DESC`, Date.now()),
    ]);
    const GRUP = Object.fromEntries(BOT_TUR.map(([ad, g]) => [ad, g])); GRUP['Diğer bot'] = 'diger';
    const GAD = { arama: 'Arama motorları', yz: 'Yapay zekâ botları', seo: 'SEO araçları', sosyal: 'Sosyal önizleme', diger: 'Diğer botlar' };
    const GRENK = { arama: '#4f46e5', yz: '#ea580c', seo: '#0e7490', sosyal: '#16a34a', diger: '#94a3b8' };
    const gg = []; for (let d = ar.bas; d <= bitB; d = new Date(Date.parse(d + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10)) gg.push(d);
    const botTop = new Map(), botSon = new Map();
    gunluk.forEach((r) => { botTop.set(r.x, (botTop.get(r.x) || 0) + r.n); if (!botSon.has(r.x) || botSon.get(r.x) < r.d) botSon.set(r.x, r.d); });
    const top = [...botTop.values()].reduce((a, n) => a + n, 0), grupTop = (g) => [...botTop].filter(([b]) => (GRUP[b] || 'diger') === g).reduce((a, [, n]) => a + n, 0);
    const google = (botTop.get('Googlebot') || 0), hataTop = hata.reduce((a, r) => a + r.n, 0);
    const seriG = (g) => gg.map((d) => gunluk.filter((r) => r.d === d && (GRUP[r.x] || 'diger') === g).reduce((a, r) => a + r.n, 0));
    const seriler = ['arama', 'yz', 'seo', 'sosyal', 'diger'].filter((g) => grupTop(g)).map((g, i) => ({ ad: GAD[g], v: seriG(g), r: GRENK[g], alan: i === 0 }));
    // Sayfalar: yol → toplam, Google, yapay zekâ
    const SM = new Map();
    sayfa.forEach((r) => { const i = r.x.indexOf('|'), b = r.x.slice(0, i), y = r.x.slice(i + 1); const o = SM.get(y) || { y, n: 0, g: 0, yz: 0 }; o.n += r.n; if (b === 'Googlebot') o.g += r.n; if (GRUP[b] === 'yz') o.yz += r.n; SM.set(y, o); });
    const sayfalar = [...SM.values()].sort((a, b) => b.n - a.n);
    const yaziM = new Map(yazi.map((y) => [y.slug, y]));
    const yolAd = (y) => { const s = y.replace(/^\//, ''); const z = yaziM.get(s); return z ? `<a href="${P(c, '/yazi/' + z.id)}">${esc(kirp(z.baslik, 70))}</a><small class="yol">${esc(y)}</small>` : `<span class="yol-k">${esc(y)}</span>`; };
    const googleGordu = new Set(sayfalar.filter((s) => s.g).map((s) => s.y.replace(/^\//, '')));
    const ugramayan = yazi.filter((y) => !googleGordu.has(y.slug));
    govde += `<div class="kpis k4">
${kpi2({ ik: 'i-search', ad: 'Bot isteği', deger: binlik(top), alt: `${binlik(botTop.size)} farklı bot` })}
${kpi2({ ik: 'i-g', ad: 'Googlebot', deger: binlik(google), alt: `${binlik(googleGordu.size)} farklı sayfa taradı` })}
${kpi2({ ik: 'i-bulb', ad: 'Yapay zekâ botları', deger: binlik(grupTop('yz')), alt: 'ChatGPT, Claude, Perplexity…' })}
${kpi2({ ik: 'i-x2', ad: 'Botlara hata', deger: binlik(hataTop), alt: hataTop ? 'bulunamadı / sunucu hatası' : 'hata yok' })}
</div>
${top ? `<div class="card"><div class="hd"><h3>Günlük bot taraması</h3>${lejant(seriler)}</div><div class="chart2">${cizgi(gg, seriler, { H: 240 })}</div><p class="note">Botlar kendilerini tarayıcı adıyla tanıtır (Googlebot, GPTBot…). Sahte ad kullanan bot da olabilir; sayılar yaklaşık gösterge olarak okunmalı. Kayıt 7 Kasım 2026'da başladı.</p></div>` : `<div class="card"><div class="empty">${IK('i-search')}<b>Bot kaydı birikiyor</b><span>Kayıt 7 Kasım 2026'da başladı; botlar siteyi taradıkça burada görünür.</span></div></div>`}
<div class="g g-31">
<div class="card"><div class="hd"><h3>En çok taranan sayfalar</h3><span class="sub">${binlik(sayfalar.length)} sayfa</span></div>${sayfalar.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Sayfa</th><th class="n">Toplam</th><th class="n">Google</th><th class="n">Yapay zekâ</th></tr></thead><tbody>${sayfalar.slice(0, tumu ? 300 : 30).map((s) => `<tr><td class="q">${yolAd(s.y)}</td><td class="n">${binlik(s.n)}</td><td class="n">${binlik(s.g)}</td><td class="n">${binlik(s.yz)}</td></tr>`).join('')}</tbody></table></div>${sayfalar.length > 30 && !tumu ? `<p class="note"><a href="${url({ n: 'tum' })}">Tümünü göster (${binlik(sayfalar.length)})</a></p>` : ''}` : '<p class="muted">Henüz kayıt yok.</p>'}</div>
<div class="card"><div class="hd"><h3>Botlar</h3><span class="sub">istek · son görülme</span></div>${botTop.size ? `<div class="tw"><table class="tbl"><tbody>${[...botTop].sort((a, b) => b[1] - a[1]).map(([b, n]) => `<tr><td class="q"><i class="site-k" style="background:${GRENK[GRUP[b] || 'diger']}"></i>${esc(b)}<small class="yol">${GAD[GRUP[b] || 'diger']}</small></td><td class="n">${binlik(n)}</td><td class="n muted">${gunAd(botSon.get(b))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Henüz kayıt yok.</p>'}</div>
</div>
<div class="g g2">
<div class="card"><div class="hd"><h3>Botlara hata veren sayfalar</h3><span class="sub">404 ve sunucu hataları</span></div>${hata.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Sayfa</th><th>Bot</th><th class="n">Kod</th><th class="n">Kez</th></tr></thead><tbody>${hata.map((r) => { const [b, kod, ...y] = r.x.split('|'); return `<tr><td class="q"><span class="yol-k">${esc(y.join('|'))}</span></td><td>${esc(b)}</td><td class="n"><span class="pill c-r">${esc(kod)}</span></td><td class="n">${binlik(r.n)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">Bu aralıkta botlara hata veren sayfa yok.</p>'}</div>
<div class="card"><div class="hd"><h3>Googlebot'un uğramadığı yazılar</h3><span class="sub">${binlik(ugramayan.length)} / ${binlik(yazi.length)} yayındaki yazı · seçilen aralıkta</span></div>${top ? (ugramayan.length ? `<div class="tw"><table class="tbl"><tbody>${ugramayan.slice(0, 15).map((y) => `<tr><td class="q"><a href="${P(c, '/yazi/' + y.id)}">${esc(kirp(y.baslik, 80))}</a></td><td class="n muted nw">${trTarih(y.yayin_ts)}</td></tr>`).join('')}</tbody></table></div><p class="note">Google bir sayfayı her gün taramaz; uzun süre listede kalan yazı için Search Console'dan “Dizine eklenmeyi iste” yapılabilir.</p>` : '<p class="muted">Googlebot bu aralıkta bütün yazılara uğradı.</p>') : '<p class="muted">Kayıt birikince görünür.</p>'}</div>
</div>`;
  } else if (t === 'site') {
    const now = Date.now(), g30 = ar.bas, g2 = ar.bit;
    const guvenli = (p) => p.then((r) => r.results || []).catch(() => []);
    const [blogAr, magAr, sonucsuz, bilge] = await Promise.all([
      guvenli(c.db.prepare("SELECT x, SUM(n) n FROM b_istat WHERE k = 'arama' AND d >= ? AND d <= ? GROUP BY x ORDER BY n DESC LIMIT 40").bind(g30, g2).all()),
      guvenli(c.db.prepare("SELECT x, SUM(n) n FROM ev WHERE k = 'q' AND d >= ? AND d <= ? GROUP BY x ORDER BY n DESC LIMIT 40").bind(g30, g2).all()),
      guvenli(c.db.prepare("SELECT x, SUM(n) n FROM ev WHERE k = 'q0' AND d >= ? AND d <= ? GROUP BY x ORDER BY n DESC LIMIT 40").bind(g30, g2).all()),
      yetkili(c.uye, 'ayar') ? guvenli(c.db.prepare("SELECT qn x, COUNT(*) n FROM ak_soru WHERE substr(ts, 1, 10) >= ? AND substr(ts, 1, 10) <= ? GROUP BY qn HAVING n >= 2 ORDER BY n DESC LIMIT 25").bind(g30, g2).all()) : Promise.resolve([]),
    ]);
    const tb = (rows, ad, not) => `<div class="card"><div class="hd"><h3>${ad}</h3><span class="sub">${not}</span></div>${rows.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Kelime</th><th class="n">Arama</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td class="q"><span class="rk">${i + 1}.</span> ${esc(r.x)}</td><td class="n">${binlik(r.n)}<span class="mbar"><i style="--w:${Math.round(r.n / rows[0].n * 100)}%"></i></span></td></tr>`).join('')}</tbody></table></div>` : bos('i-search', 'Henüz veri yok', 'Ziyaretçiler arama yaptıkça burada görünür.')}</div>`;
    const top = (a) => a.reduce((x, r) => x + r.n, 0);
    govde += `<div class="kpis k4">
${kpi2({ ik: 'i-search', ad: 'Mağaza araması', deger: binlik(top(magAr) + top(sonucsuz)), alt: 'seçilen aralık · ilk 40 kelime' })}
${kpi2({ ik: 'i-x2', ad: 'Sonuçsuz arama', deger: binlik(top(sonucsuz)), alt: top(magAr) + top(sonucsuz) ? '%' + Math.round(top(sonucsuz) / (top(magAr) + top(sonucsuz)) * 100) + ' oranında' : '' })}
${kpi2({ ik: 'i-doc', ad: 'Blog içi arama', deger: binlik(top(blogAr)), alt: 'seçilen aralık' })}
${kpi2({ ik: 'i-chat', ad: "Bilge Bey'e tekrar eden soru", deger: binlik(bilge.length), alt: yetkili(c.uye, 'ayar') ? 'en az 2 kez sorulan' : 'yönetici yetkisi gerekir' })}
</div>
<div class="g g3">${tb(magAr, 'Mağazada en çok arananlar', 'sonuç bulunan')}${tb(sonucsuz, 'Sonuçsuz kalan aramalar', 'ürün ya da içerik fırsatı')}${tb(blogAr, 'Blogda arananlar', 'yeni yazı fikri')}</div>
${yetkili(c.uye, 'ayar') ? `<div class="mt">${tb(bilge, "Bilge Bey'e en sık sorulanlar", 'seçilen aralık · yazı konusu için')}</div>` : ''}`;
  } else if (t === 'reklam') {
    // Harcama ve gelir yalnız yönetici; veri GA4'e bağlı Google Ads hesabından gelir (GA'nın kampanya ataması)
    if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c, '/trafik'));
    const R = V.ga.filter((g) => g.reklam && g.reklam.some((r) => r[1] > 0));
    const TL = (x) => binlik(Math.round(x)) + ' ₺';
    if (!R.length) govde += `<div class="card"><div class="hd"><h3>Google Ads</h3><span class="pill c-o">Veri yok</span></div><div class="setup"><b>Reklam verisi gelmedi</b><ol><li>Google Ads hesabı Analytics mülküne bağlı olmalı: Analytics → <b>Yönetici → Ürün bağlantıları → Google Ads bağlantıları</b>.</li><li>Bağlantı yeni kurulduysa veri bir sonraki sabah raporunda görünür.</li></ol></div></div>`;
    else {
      const sel = sSec === 'tum' ? R : R.filter((g) => g.ad === sSec);
      const kamp = sel.flatMap((g) => g.reklam.filter((r) => r[1] > 0 || !/^\(/.test(r[0])).map((r) => ({ ad: g.ad, r }))).sort((a, b) => b.r[1] - a.r[1]);
      const T = kamp.reduce((a, { r }) => ({ cost: a.cost + r[1], tik: a.tik + r[2], gos: a.gos + r[3], ot: a.ot + r[4], sat: a.sat + r[5], gel: a.gel + r[6] }), { cost: 0, tik: 0, gos: 0, ot: 0, sat: 0, gel: 0 });
      const once = sel.reduce((a, g) => a + ((g.reklamOnce || [])[0] || 0), 0);
      const fark = once ? (() => { const y = Math.round((T.cost - once) / once * 100); return `<span class="dl2 ${y > 0 ? 'u' : y < 0 ? 'd' : 'z'}">${y > 0 ? '▲' : y < 0 ? '▼' : ''} %${Math.abs(y)}</span> önceki döneme göre`; })() : '';
      const gg = [...new Set(sel.flatMap((g) => (g.reklamGun || []).map((r) => r[0])))].sort();
      const gs = (i) => gg.map((d) => sel.reduce((a, g) => a + (((g.reklamGun || []).find((r) => r[0] === d) || [])[i] || 0), 0));
      const roas = (gel, cost) => cost ? (gel / cost).toFixed(1).replace('.', ',') + '×' : '—';
      const siteSec = `<div class="seg"><a href="${url({ s: 'tum' })}"${sSec === 'tum' ? ' class="on"' : ''}>Tüm siteler</a>${R.map((g) => `<a href="${url({ s: g.ad })}"${sSec === g.ad ? ' class="on"' : ''}>${siteNokta(g.ad)}${esc(g.etiket)}</a>`).join('')}</div>`;
      const bekleyenSay = ((GSC && GSC.reklamOneri) || []).filter((o) => (sSec === 'tum' || o.site === sSec) && !(c.A.ads_karar || {})[o.id]).length;
      govde += `<div class="ayar-nav" style="position:static;padding-top:0">${siteSec}<span class="note">Kaynak: Google Ads → Google Analytics 4 · yalnız yöneticiler görür</span></div>
${bekleyenSay ? `<a class="card bant" href="${url({ t: 'oneri' })}">${IK('i-bulb')}<span><b>${binlik(bekleyenSay)} reklam önerisi karar bekliyor</b><small>Neden, ne yapılmalı ve dayanağıyla birlikte · Reklam önerileri sekmesi</small></span>${IK('i-right')}</a>` : ''}
<div class="mt"></div>
<div class="kpis">
${kpi2({ ik: 'i-fire', ad: 'Reklam harcaması', deger: TL(T.cost), alt: fark, seri: gs(1), x: gg, f: 'para', renk: '#c2410c', degis: false })}
${kpi2({ ik: 'i-arrow', ad: 'Reklam tıklaması', deger: binlik(T.tik), alt: T.gos ? 'TO %' + (T.tik / T.gos * 100).toFixed(1).replace('.', ',') : '', seri: gs(2), x: gg, renk: '#4f46e5' })}
${kpi2({ ik: 'i-tag', ad: 'Tıklama başı maliyet', deger: T.tik ? (T.cost / T.tik).toFixed(2).replace('.', ',') + ' ₺' : '—', alt: binlik(T.gos) + ' gösterim' })}
${kpi2({ ik: 'i-cart', ad: 'Reklamdan satış', deger: binlik(T.sat), alt: T.sat ? 'satış başı ' + TL(T.cost / T.sat) : '' })}
${kpi2({ ik: 'i-star', ad: 'Reklamdan gelir', deger: TL(T.gel), alt: 'GA kampanya ataması' })}
${kpi2({ ik: 'i-chart', ad: 'ROAS', deger: roas(T.gel, T.cost), alt: 'gelir / harcama' })}
</div>
<div class="card"><div class="hd"><h3>Günlük reklam harcaması ve mağaza cirosu</h3>${lejant([{ ad: 'Reklam harcaması (₺)', r: '#c2410c' }, { ad: 'Ciro, tüm kanallar (₺)', r: '#16a34a', sag: true }])}</div><div class="chart2">${cizgi(gg, [{ ad: 'Reklam harcaması', v: gs(1), r: '#c2410c', alan: true, f: 'para' }, { ad: 'Ciro', v: gs(3), r: '#16a34a', sag: true, f: 'para' }])}</div></div>
<div class="card mt"><div class="hd"><h3>Kampanyalar</h3><span class="sub">${binlik(kamp.length)} kampanya</span></div><div class="tw"><table class="tbl"><thead><tr><th>Kampanya</th><th class="n">Harcama</th><th class="n">Tıklama</th><th class="n">TBM</th><th class="n">Oturum</th><th class="n">Satış</th><th class="n">Gelir</th><th class="n">ROAS</th></tr></thead><tbody>${kamp.map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[0])}</td><td class="n">${TL(r[1])}</td><td class="n">${binlik(r[2])}</td><td class="n">${r[2] ? (r[1] / r[2]).toFixed(2).replace('.', ',') : '—'}</td><td class="n">${binlik(r[4])}</td><td class="n">${binlik(r[5])}</td><td class="n">${TL(r[6])}</td><td class="n">${r[1] ? `<span class="pos ${r[6] / r[1] >= 4 ? 'p1' : r[6] / r[1] >= 2 ? 'p2' : 'p3'}">${roas(r[6], r[1])}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div><p class="note" style="padding-top:12px">Gelir ve satış, Google Analytics'in oturumu ilgili kampanyaya ataması üzerinden hesaplanır; Google Ads panelindeki dönüşüm sayılarından farklı olabilir.</p></div>`;
    }
  } else if (t === 'oneri') {
    if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c, '/trafik'));
    {
      const oneri = ((GSC && GSC.reklamOneri) || []).filter((o) => sSec === 'tum' || o.site === sSec);
      const bekleyen = oneri.filter((o) => !(c.A.ads_karar || {})[o.id]), karar = oneri.filter((o) => (c.A.ads_karar || {})[o.id]);
      const oSiteler = [...new Set(((GSC && GSC.reklamOneri) || []).map((o) => o.site))];
      const siteSec = `<div class="seg"><a href="${url({ s: 'tum' })}"${sSec === 'tum' ? ' class="on"' : ''}>Tüm siteler</a>${oSiteler.map((s) => `<a href="${url({ s })}"${sSec === s ? ' class="on"' : ''}>${siteNokta(s)}${esc(((GSC.ga || []).find((g) => g.ad === s) || {}).etiket || s)}</a>`).join('')}</div>`;
      govde += `<div class="ayar-nav" style="position:static;padding-top:0">${siteSec}<span class="note">Öneriler her sabah son 28 günün verisiyle hesaplanır · tarih filtresinden etkilenmez</span></div>
<section class="card" id="oneriler"><div class="hd"><h3>Reklam önerileri <span class="sub">· ${binlik(bekleyen.length)} karar bekliyor</span></h3><span class="pill c-g">Yalnız öneri · onaysız işlem yok</span></div>
<p class="note" style="margin:-6px 0 14px">Sistem reklam hesabına yalnız okuma izniyle bağlıdır; hiçbir kampanyayı, bütçeyi ya da teklifi değiştiremez. Öneriyi uygulamak isterseniz Google Ads panelinden siz yaparsınız, burada "Uygulandı" ile işaretlersiniz. Öneriler her sabah yeni veriyle yenilenir.</p>
${bekleyen.length ? `<div class="oneriler">${bekleyen.map((o) => oneriKart(c, o, sSec)).join('')}</div>` : '<div class="empty">' + IK('i-check') + '<b>Karar bekleyen öneri yok</b><span>Yeni öneriler sabah raporuyla gelir.</span></div>'}
${karar.length ? `<details class="mt"><summary class="lnk">Karar verilenler (${karar.length})</summary><div class="oneriler mt">${karar.map((o) => oneriKart(c, o, sSec)).join('')}</div></details>` : ''}
<details class="mt bilgi"><summary class="lnk">Öneriler hangi kurallara dayanıyor? (${Object.keys((GSC && GSC.bilgi) || {}).length} ilke)</summary><div class="bilgi-l">${Object.values((GSC && GSC.bilgi) || {}).map((b) => `<div><b>${esc(b.baslik)}</b><p>${esc(b.ilke)}</p><small>${b.kaynak.map(([ad, u]) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(ad)} ↗</a>` : esc(ad)).join(' · ')}</small></div>`).join('')}</div><p class="note">Kaynaklar Google Ads ve Merchant Center resmi yardım sayfalarıdır. Motor bu ilkelerin dışında öneri üretmez.</p></details></section>`;
    }
  } else if (t === 'kaynak') {
    govde += satisKaynak(c, V, sSec, url);
  } else {
    const GA = V.ga, hazir = GA.filter((g) => g.toplam);
    const kurulum = `<div class="setup"><b>Bağlantı durumu</b><ol>${GA.length ? GA.map((g) => `<li>${siteNokta(g.ad)}<b>${esc(g.etiket)}</b> (${esc(g.mulkId)}): ${g.toplam ? '<span class="up">bağlı</span>' : `<span class="dn">erişim yok</span> — Analytics → Yönetici → Mülk erişim yönetimi'nde <code>hasturk-gsc@elated-cathode-487309-p5.iam.gserviceaccount.com</code> “Görüntüleyen” olmalı`}</li>`).join('') : '<li>Rapor işi henüz Analytics verisi çekmedi; her sabah otomatik çalışır.</li>'}</ol></div>`;
    if (!hazir.length) govde += `<div class="card"><div class="hd"><h3>Google Analytics</h3><span class="pill c-o">Veri bekleniyor</span></div>${kurulum}</div>`;
    else {
      const sel = sSec === 'tum' ? hazir : hazir.filter((g) => g.ad === sSec);
      const topl = (k) => sel.reduce((a, g) => a + ((g.toplam || {})[k] || 0), 0), once = (k) => sel.reduce((a, g) => a + ((g.once || {})[k] || 0), 0);
      const oturum = topl('sessions');
      const agir = (k) => oturum ? sel.reduce((a, g) => a + ((g.toplam || {})[k] || 0) * ((g.toplam || {}).sessions || 0), 0) / oturum : 0;
      const fark = (k) => { const a = topl(k), b = once(k); if (!b) return ''; const y = Math.round((a - b) / b * 100); return `<span class="dl2 ${y > 0 ? 'u' : y < 0 ? 'd' : 'z'}">${y > 0 ? '▲' : y < 0 ? '▼' : ''} %${Math.abs(y)}</span> önceki döneme göre`; };
      const gg = [...new Set(sel.flatMap((g) => g.gunluk.map((r) => r[0])))].sort();
      const gs = (i) => gg.map((d) => sel.reduce((a, g) => a + ((g.gunluk.find((r) => r[0] === d) || [])[i] || 0), 0));
      // Birleştirme: aynı boyut değeri sitelerde toplanır; sayfalarda site ayrımı korunur
      const birles = (alan, n = 15) => { const m = new Map(); sel.forEach((g) => (g[alan] || []).forEach((r) => { const k = r[0]; const x = m.get(k) || [k, ...r.slice(1).map(() => 0)]; r.slice(1).forEach((v, i) => { x[i + 1] += v; }); m.set(k, x); })); return [...m.values()].sort((a, b) => b[1] - a[1]).slice(0, n); };
      const sayfa = sel.flatMap((g) => (g.sayfa || []).map((r) => ({ ad: g.ad, r }))).sort((a, b) => b.r[1] - a.r[1]).slice(0, 25);
      const giris = sel.flatMap((g) => (g.giris || []).map((r) => ({ ad: g.ad, r }))).sort((a, b) => b.r[1] - a.r[1]).slice(0, 15);
      const KANAL = { 'Organic Search': 'Organik arama', Direct: 'Doğrudan', 'Organic Social': 'Sosyal medya', Referral: 'Yönlendiren site', 'Paid Search': 'Ücretli arama', 'Paid Social': 'Ücretli sosyal', Email: 'E-posta', Unassigned: 'Atanmamış', 'Organic Shopping': 'Organik alışveriş', 'Cross-network': 'Çapraz ağ', Display: 'Görüntülü reklam', 'Organic Video': 'Organik video', 'Paid Shopping': 'Ücretli alışveriş', 'Paid Other': 'Ücretli diğer' };
      const CIHAZ = { mobile: 'Mobil', desktop: 'Masaüstü', tablet: 'Tablet' };
      const sure = (sn) => { sn = Math.round(sn); return sn >= 60 ? Math.floor(sn / 60) + ' dk ' + (sn % 60) + ' sn' : sn + ' sn'; };
      const kanal = birles('kanal', 10), kmax = Math.max(1, ...kanal.map((r) => r[1]));
      const siteSec = `<div class="seg"><a href="${url({ s: 'tum' })}"${sSec === 'tum' ? ' class="on"' : ''}>Tüm siteler</a>${hazir.map((g) => `<a href="${url({ s: g.ad })}"${sSec === g.ad ? ' class="on"' : ''}>${siteNokta(g.ad)}${esc(g.etiket)}</a>`).join('')}</div>`;
      // Satış ve gelir yalnız yönetici (ayar yetkisi) görür
      const satis = yetkili(c.uye, 'ayar') ? topl('ecommercePurchases') : 0;
      govde += `${CANLI_KUTU}<div class="ayar-nav mt" style="position:static;padding-top:0">${siteSec}<span class="note">Kaynak: Google Analytics 4</span></div>
<div class="kpis${satis ? '' : ' k5'}">
${kpi2({ ik: 'i-users', ad: 'Kullanıcı', deger: binlik(topl('activeUsers')), alt: fark('activeUsers'), seri: gs(1), x: gg, degis: false, renk: '#4f46e5' })}
${kpi2({ ik: 'i-user', ad: 'Yeni kullanıcı', deger: binlik(topl('newUsers')), alt: topl('activeUsers') ? '%' + Math.round(topl('newUsers') / topl('activeUsers') * 100) + ' oranında' : '' })}
${kpi2({ ik: 'i-dash', ad: 'Oturum', deger: binlik(oturum), alt: fark('sessions'), seri: gs(2), x: gg, degis: false, renk: '#16a34a' })}
${kpi2({ ik: 'i-eye', ad: 'Sayfa görüntüleme', deger: binlik(topl('screenPageViews')), alt: fark('screenPageViews'), seri: gs(3), x: gg, degis: false, renk: '#0e7490' })}
${kpi2({ ik: 'i-clock', ad: 'Etkileşim', deger: '%' + Math.round(agir('engagementRate') * 100), alt: 'ort. oturum ' + sure(agir('averageSessionDuration')) })}
${satis ? kpi2({ ik: 'i-cart', ad: 'Satın alma', deger: binlik(satis), alt: topl('purchaseRevenue') ? binlik(Math.round(topl('purchaseRevenue'))) + ' ₺ gelir' : '' }) : ''}
</div>
<div class="g g-31"><div class="card"><div class="hd"><h3>Günlük kullanıcı ve oturum</h3>${lejant([{ ad: 'Kullanıcı', r: '#4f46e5' }, { ad: 'Oturum', r: '#16a34a' }])}</div><div class="chart2">${cizgi(gg, [{ ad: 'Kullanıcı', v: gs(1), r: '#4f46e5', alan: true }, { ad: 'Oturum', v: gs(2), r: '#16a34a' }])}</div></div>
<div class="card"><div class="hd"><h3>Trafik kanalları</h3><span class="sub">oturum</span></div><div class="bars">${kanal.map((r) => `<div class="bar" style="grid-template-columns:1fr auto"><div class="t"><b>${esc(KANAL[r[0]] || r[0])}</b><i style="--w:${Math.round(r[1] / kmax * 100)}%"></i></div><span>${binlik(r[1])}</span></div>`).join('')}</div></div></div>
<div class="g g-31 mt"><div class="card"><div class="hd"><h3>En çok görüntülenen sayfalar</h3></div><div class="tw"><table class="tbl"><thead><tr><th>Sayfa</th><th class="n">Görüntüleme</th><th class="n">Kullanıcı</th><th class="n">Ort. süre</th></tr></thead><tbody>${sayfa.map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[0])}</td><td class="n">${binlik(r[1])}</td><td class="n">${binlik(r[2])}</td><td class="n">${r[2] ? sure(r[3] / r[2]) : '—'}</td></tr>`).join('')}</tbody></table></div></div>
<div class="g" style="align-content:start">
<div class="card"><div class="hd"><h3>Kaynak / ortam</h3></div><div class="kv">${birles('kaynak', 10).map((r) => `<span>${esc(r[0])}</span><b>${binlik(r[1])}</b>`).join('')}</div></div>
<div class="card"><div class="hd"><h3>Cihaz</h3></div><div class="kv">${birles('cihaz', 4).map((r) => `<span>${CIHAZ[r[0]] || esc(r[0])}</span><b>${binlik(r[1])} · ${topl('activeUsers') ? Math.round(r[1] / topl('activeUsers') * 100) : 0}%</b>`).join('')}</div></div>
<div class="card"><div class="hd"><h3>Şehir</h3></div><div class="kv">${birles('sehir', 10).map((r) => `<span>${esc(r[0] === '(not set)' ? 'Belirsiz' : r[0])}</span><b>${binlik(r[1])}</b>`).join('')}</div></div>
<div class="card"><div class="hd"><h3>Yeni / geri gelen</h3></div><div class="kv">${birles('yeniEski', 3).map((r) => `<span>${r[0] === 'new' ? 'Yeni' : r[0] === 'returning' ? 'Geri gelen' : 'Belirsiz'}</span><b>${binlik(r[1])}</b>`).join('')}</div></div>
</div></div>
${(() => {
  const yon = yetkili(c.uye, 'ayar');
  const u = sel.flatMap((g) => (g.urunler || []).filter((r) => r[0] && !/^\(/.test(r[0]) && (r[3] > 0 || r[1] > 0)).map((r) => ({ ad: g.ad, r }))).sort((a, b) => (b.r[4] - a.r[4]) || (b.r[3] - a.r[3])).slice(0, 25);
  return u.length ? `<div class="card mt"><div class="hd"><h3>En çok satan ürünler</h3><span class="sub">görüntüleme → sepet → satış</span></div><div class="tw"><table class="tbl"><thead><tr><th>Ürün</th><th class="n">Görüntüleme</th><th class="n">Sepete ekleme</th><th class="n">Satış (adet)</th><th class="n">Dönüşüm</th>${yon ? '<th class="n">Ciro</th>' : ''}</tr></thead><tbody>${u.map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[0])}</td><td class="n">${binlik(r[1])}</td><td class="n">${binlik(r[2])}</td><td class="n">${binlik(r[3])}</td><td class="n">${r[1] ? '%' + (r[3] / r[1] * 100).toFixed(1).replace('.', ',') : '—'}</td>${yon ? `<td class="n">${binlik(Math.round(r[4]))} ₺</td>` : ''}</tr>`).join('')}</tbody></table></div></div>` : '';
})()}
<div class="card mt"><div class="hd"><h3>Giriş sayfaları</h3><span class="sub">ziyaretin başladığı sayfa</span></div><div class="tw"><table class="tbl"><thead><tr><th>Sayfa</th><th class="n">Oturum</th><th class="n">Kullanıcı</th><th class="n">Etkileşim</th></tr></thead><tbody>${giris.map(({ ad, r }) => `<tr><td class="q">${sSec === 'tum' ? siteNokta(ad) : ''}${esc(r[0] || '/')}</td><td class="n">${binlik(r[1])}</td><td class="n">${binlik(r[2])}</td><td class="n">%${Math.round(r[3] * 100)}</td></tr>`).join('')}</tbody></table></div></div>
${hazir.length < GA.length ? `<div class="card mt">${kurulum}</div>` : ''}`;
    }
  }
  return pSayfa(c, { baslik: 'Arama & Trafik', alt: 'Google arama performansı, site içi aramalar ve ziyaretçi verisi tek ekranda.', aktif: 'trafik', govde });
}

// ---------- Yazılar ----------
async function yazilar(c) {
  const d = c.url.searchParams.get('d') || '', q = (c.url.searchParams.get('q') || '').trim(), kat = +c.url.searchParams.get('kat') || 0;
  // Hızlı süzgeç: kapak görseli olmayan, öne çıkan, gündem yazıları
  const f = ['kapaksiz', 'one', 'gundem'].includes(c.url.searchParams.get('f')) ? c.url.searchParams.get('f') : '';
  const s = Math.max(1, +c.url.searchParams.get('s') || 1);
  // Gün süzgeci (?gun=YYYY-AA-GG): o gün yayımlanan ya da yayımlanacak yazılar, saat sırasıyla (Genel Bakış'taki "Bugün" kutusu ve takvim buraya gelir)
  const gunS = /^\d{4}-\d{2}-\d{2}$/.test(c.url.searchParams.get('gun') || '') ? c.url.searchParams.get('gun') : '';
  const w = [], b = [];
  if (gunS) { const b0 = Date.parse(gunS + 'T00:00:00Z') - TR_SAAT; w.push("y.durum IN ('yayinda','zamanli') AND y.yayin_ts >= ? AND y.yayin_ts < ?"); b.push(b0, b0 + 864e5); }
  // Zamanı gelmiş "zamanli" yazı sitede yayındadır (YAYINDA koşulu); sayım ve sekmeler de bu gerçek duruma göre
  const now = Date.now();
  if (d === 'yayinda') { w.push("y.durum IN ('yayinda','zamanli') AND y.yayin_ts <= ?"); b.push(now); }
  else if (d === 'zamanli') { w.push("y.durum = 'zamanli' AND y.yayin_ts > ?"); b.push(now); }
  else if (d) { w.push('y.durum = ?'); b.push(d); } else w.push("y.durum != 'cop'");
  if (q) { w.push('(y.baslik LIKE ? OR y.etiketler LIKE ?)'); b.push('%' + q + '%', '%' + q + '%'); }
  if (kat) { w.push('y.kategori_id = ?'); b.push(kat); }
  if (f === 'kapaksiz') w.push("COALESCE(y.gorsel, '') = ''");
  else if (f === 'one') w.push('y.one_cikan = 1');
  else if (f === 'gundem') w.push("y.tur = 'gundem'");
  const boy = [10, 20, 50].includes(+c.url.searchParams.get('n')) ? +c.url.searchParams.get('n') : 20;
  const [list, say_, filtre, gunluk, katSay, ozel] = await Promise.all([
    c.db.prepare(`SELECT y.*, k.ad kad FROM b_yazi y LEFT JOIN b_kategori k ON k.id = y.kategori_id WHERE ${w.join(' AND ')} ORDER BY ${gunS ? 'y.yayin_ts ASC' : 'COALESCE(y.yayin_ts, y.olus_ts) DESC'} LIMIT ${boy} OFFSET ${(s - 1) * boy}`).bind(...b).all(),
    c.db.prepare("SELECT CASE WHEN durum = 'zamanli' AND yayin_ts <= ? THEN 'yayinda' ELSE durum END durum, COUNT(*) n FROM b_yazi GROUP BY 1").bind(now).all(),
    c.db.prepare(`SELECT COUNT(*) n FROM b_yazi y WHERE ${w.join(' AND ')}`).bind(...b).first(),
    c.db.prepare("SELECT COUNT(*) n FROM b_yazi WHERE durum = 'zamanli' AND yayin_ts > ? AND yayin_ts <= ?").bind(now, now + 7 * 864e5).first(),
    c.db.prepare("SELECT kategori_id k, COUNT(*) n FROM b_yazi WHERE durum != 'cop' GROUP BY kategori_id").all(),
    c.db.prepare("SELECT SUM(CASE WHEN COALESCE(gorsel, '') = '' THEN 1 ELSE 0 END) kapaksiz, SUM(CASE WHEN one_cikan = 1 THEN 1 ELSE 0 END) one, SUM(CASE WHEN tur = 'gundem' THEN 1 ELSE 0 END) gundem FROM b_yazi WHERE durum != 'cop'").first(),
  ]);
  const toplamF = filtre.n, sayfaN = Math.max(1, Math.ceil(toplamF / boy));
  const qs = (o) => '?' + new URLSearchParams(Object.entries({ d, q, kat: kat || '', f, gun: gunS, n: boy === 20 ? '' : boy, s: '', ...o }).filter(([, v]) => v !== '' && v !== 1 && v != null)).toString();
  const nums = [...new Set([1, 2, 3, s - 1, s, s + 1, sayfaN - 1, sayfaN])].filter((x) => x >= 1 && x <= sayfaN).sort((a, b_) => a - b_);
  const n = Object.fromEntries(say_.results.map((r) => [r.durum, r.n])), tum = say_.results.filter((r) => r.durum !== 'cop').reduce((a, r) => a + r.n, 0);
  const tab = (k, ad, x) => `<a href="${P(c, '/yazilar')}${qs({ d: k, s: '' }).replace(/^\?$/, '')}"${d === k ? ' class="on"' : ''}>${ad} <i>${binlik(x || 0)}</i></a>`;
  const ks = Object.fromEntries(katSay.results.map((r) => [r.k, r.n]));
  // Süzgeç: sekmelerin sağında tek satır; kategori açılır listede, arama küçük kutuda (kalabalık yok)
  const F_AD = { kapaksiz: 'Kapak görseli yok', one: 'Öne çıkan', gundem: 'Gündem' };
  const suzgec = `<form class="ysuz" method="get" role="search">${d ? `<input type="hidden" name="d" value="${esc(d)}">` : ''}${f ? `<input type="hidden" name="f" value="${f}">` : ''}
<input class="sel tarih" type="date" name="gun" value="${gunS}" data-oto aria-label="Yayın gününe göre süz" title="Yayın günü">
<select class="sel" name="kat" data-oto aria-label="Kategoriye göre süz"><option value="">Tüm kategoriler</option>${c.kat.filter((k) => ks[k.id]).map((k) => `<option value="${k.id}"${k.id === kat ? ' selected' : ''}>${esc(k.ad)} (${binlik(ks[k.id])})</option>`).join('')}</select>
<label class="fin">${IK('i-search')}<input name="q" value="${esc(q)}" placeholder="Yazılarda ara…" aria-label="Yazılarda ara"></label></form>`;
  const bugunS = gun(), yarinS = gun(Date.now() + 864e5);
  const gunEt = gunS ? `<span>${IK('i-cal')}${gunS === bugunS ? 'Bugün' : gunS === yarinS ? 'Yarın' : ''} ${trTarih(Date.parse(gunS + 'T12:00:00Z'))} · ${binlik(filtre.n)} yazı</span>` : '';
  const etiket = f || q || kat || gunS ? `<div class="ysec">${gunEt}${f ? `<span>${F_AD[f]} · ${binlik(ozel[f] || 0)}</span>` : ''}${q ? `<span>“${esc(q)}”</span>` : ''}${kat ? `<span>${esc((c.kat.find((k) => k.id === kat) || {}).ad || '')}</span>` : ''}<a href="${P(c, '/yazilar')}${d ? '?d=' + d : ''}">${IK('i-undo')}Süzgeci temizle</a></div>` : `<div class="ysec"><a href="${P(c, '/yazilar?gun=' + bugunS)}">${IK('i-cal')}Bugünün yazıları</a><a href="${P(c, '/yazilar?gun=' + yarinS)}">Yarının yazıları</a></div>`;
  const govde = `<div class="kpis k5">${kpi('i-doc', 'c-g', 'Toplam', binlik(tum), 'çöp hariç')}${kpi('i-check', 'c-b', 'Yayında', binlik(n.yayinda || 0), '')}${kpi('i-cal', 'c-p', 'Zamanlanmış', binlik(n.zamanli || 0), '')}${kpi('i-edit', 'c-o', 'Taslak', binlik(n.taslak || 0), '')}${kpi('i-eye', 'c-y', 'İncelemede', binlik(n.inceleme || 0), '')}</div>
<div class="card"><div class="ybar"><div class="tabs">${tab('', 'Tümü', tum)}${tab('yayinda', 'Yayında', n.yayinda)}${tab('zamanli', 'Zamanlanmış', n.zamanli)}${tab('taslak', 'Taslak', n.taslak)}${tab('inceleme', 'İncelemede', n.inceleme)}${tab('cop', 'Çöp', n.cop)}</div></div>${etiket}
<div class="tw"><table class="tbl ytab"><thead><tr><th>Yazı</th><th>Kategori</th><th>Durum</th><th class="n">SEO</th><th class="n">Okunma</th><th>Yayın</th><th></th></tr></thead><tbody>
${list.results.map((y) => `<tr><td><a class="tt" href="${P(c, '/yazi/' + y.id)}"><img src="${esc(y.gorsel || '/blog-statik/logo.webp')}" alt=""><div><b>${esc(y.baslik)}</b><small>${esc(y.yazar || '')} · ${okumaDk(y.govde)} dk${y.one_cikan ? ' · ★ öne çıkan' : ''}${y.tur === 'gundem' ? ' · gündem' : ''}</small></div></a></td><td>${y.kad ? `<span class="kchip">${IK('i-leaf')}${esc(y.kad)}</span>` : '—'}</td><td>${pill(y.durum === 'zamanli' && y.yayin_ts <= now ? 'yayinda' : y.durum)}</td><td class="n">${seoRozet(seoPuan(y))}</td><td class="n">${binlik(y.okunma)}</td><td class="muted nw">${y.yayin_ts ? trTarihSaat(y.yayin_ts) : trTarih(y.olus_ts)}</td><td class="nw acts"><a class="dots" href="${P(c, '/yazi/' + y.id)}" aria-label="Düzenle">${IK('i-edit')}</a><a class="dots" href="${c.base}/${esc(y.slug)}" target="_blank" aria-label="Görüntüle">${IK('i-eye')}</a></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Yazı bulunamadı.</td></tr>'}
</tbody></table>
<div class="pager2"><span class="muted">${toplamF ? `${binlik((s - 1) * boy + 1)}–${binlik((s - 1) * boy + list.results.length)} / ${binlik(toplamF)} içerik` : '0 içerik'}</span>
<form method="get" class="pboy">${Object.entries({ d, q, kat: kat || '', f, gun: gunS }).filter(([, v]) => v).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')}<label>Sayfa başına <select class="sel" name="n" data-oto>${[10, 20, 50].map((x) => `<option${x === boy ? ' selected' : ''}>${x}</option>`).join('')}</select></label></form>
<nav class="pnum" aria-label="Sayfalar">${s > 1 ? `<a href="${qs({ s: s - 1 })}" aria-label="Önceki">${IK('i-left')}</a>` : `<span class="dis">${IK('i-left')}</span>`}${nums.map((x, i) => `${i && x - nums[i - 1] > 1 ? '<span class="gap">…</span>' : ''}${x === s ? `<a class="on" aria-current="page">${x}</a>` : `<a href="${qs({ s: x })}">${x}</a>`}`).join('')}${s < sayfaN ? `<a href="${qs({ s: s + 1 })}" aria-label="Sonraki">${IK('i-right')}</a>` : `<span class="dis">${IK('i-right')}</span>`}</nav></div></div></div>
${c.sayac.z ? `<div class="plan-band"><span>${IK('i-cal')}<b>Yayın planı aktif</b> · Önümüzdeki 7 günde ${binlik(gunluk.n)} yazı (günde ort. ${Math.round(gunluk.n / 7)}) · Sıradaki yayın ${kisaZaman(c.sayac.zs)}</span><a class="btn btn-o" href="${P(c, '/yazilar?d=zamanli')}">${IK('i-cal')}Sırayı Gör</a></div>` : ''}`;
  return pSayfa(c, { baslik: 'Tüm Yazılar', alt: `${binlik(tum)} yazı · ${binlik(n.yayinda || 0)} yayında, ${binlik(n.zamanli || 0)} zamanlanmış`, aktif: 'yazilar', govde, acts: suzgec });
}

// ---------- Editör ----------
async function editor(c, id) {
  let y = { baslik: '', slug: '', ozet: '', kisaca: '', govde: '', sss: '', kategori_id: (c.kat[0] || {}).id, etiketler: '', gorsel: FOTOLAR[0], gorsel_alt: '', seo_baslik: '', seo_aciklama: '', odak: '', durum: 'taslak', tur: 'yazi', one_cikan: 0, urunler: '[]', urun_oto: 1, yazar: 'HasTürk Editör Ekibi', yayin_ts: null };
  if (id) { y = await c.db.prepare('SELECT * FROM b_yazi WHERE id = ?').bind(id).first(); if (!y) return pSayfa(c, { baslik: 'Yazı bulunamadı', govde: '' }); }
  const kul = await kullanilanGorseller(c.db, id);
  if (!id) y.gorsel = FOTOLAR.find((f) => !kul[f]) || FOTOLAR[0];
  const U = await c.U();
  let manuel = []; try { manuel = JSON.parse(y.urunler || '[]'); } catch {}
  const oneri = oneriler(U, { ...y, govde: duz(y.govde) }, { n: 6, haric: manuel });
  const ic = id ? (await c.db.prepare(`SELECT id, slug, baslik FROM b_yazi WHERE ${YAYINDA} AND id != ? ORDER BY okunma DESC LIMIT 200`).bind(Date.now(), id).all()).results : [];
  const govdeK = duz(y.govde).toLocaleLowerCase('tr-TR');
  const icOner = ic.filter((x) => !String(y.govde).includes('/' + x.slug)).map((x) => ({ x, k: kelimeler(x.baslik).filter((w) => w.length > 4 && govdeK.includes(w.slice(0, 5))) })).filter((o) => o.k.length >= 2).slice(0, 4);
  const yayinla = yetkili(c.uye, 'yayinla');
  const diger = await digerOdaklar(c.db, id);
  const sc = seoPuan(y, diger);
  const toc = String(y.govde || '').split('\n').filter((l) => /^#{2,3} /.test(l)).map((l) => [l.startsWith('### ') ? 3 : 2, l.replace(/^#+\s*/, '')]);
  const govde = `<form method="post" action="${P(c, '/yazi/kaydet')}" class="ed-wrap ed3" id="edform">
<input type="hidden" name="id" value="${id || ''}">
<aside class="ed-toc" aria-label="İçindekiler"><b>${IK('i-list')}İçindekiler</b><ol id="edtoc">${toc.map(([d, t]) => `<li class="d${d}"><button type="button" data-baslik="${esc(t)}">${esc(t)}</button></li>`).join('') || '<li class="bos">## ile başlık ekledikçe burada görünür.</li>'}</ol>
<div class="ed-say" id="edsay"></div></aside>
<div class="card ed-ana">
<input class="ed-title" name="baslik" required maxlength="140" value="${esc(y.baslik)}" placeholder="Yazı başlığı" aria-label="Başlık">
<div class="permalink">${IK('i-link', 'width:14px;height:14px')}${esc((c.A.site_url || '').replace(/^https?:\/\//, ''))}/<input class="slug" name="slug" value="${esc(y.slug)}" placeholder="otomatik" aria-label="Adres (slug)" pattern="[a-z0-9-]*"></div>
<label class="lab">Giriş paragrafı (özet) <em data-say="ozet">0</em></label><textarea class="inp" name="ozet" rows="2" maxlength="300" placeholder="Başlığın altında görünen 1–2 cümlelik giriş. Boş bırakılırsa meta açıklaması da bu olur.">${esc(y.ozet || '')}</textarea>
<label class="lab mt8">Kısaca kutusu <em>Google'ın öne çıkan cevabı için 2–3 cümlelik net cevap</em></label><textarea class="inp" name="kisaca" rows="3" maxlength="600">${esc(y.kisaca || '')}</textarea>
<div class="ed-bar mt8" role="toolbar" aria-label="Biçim">
<button type="button" data-ekle="## " title="Başlık">H2</button><button type="button" data-ekle="### " title="Alt başlık">H3</button><span class="sep"></span>
<button type="button" data-sar="**" title="Kalın"><b>B</b></button><button type="button" data-sar="*" title="İtalik"><i>I</i></button><button type="button" data-link title="Bağlantı">${IK('i-link')}</button><span class="sep"></span>
<button type="button" data-ekle="- " title="Liste">${IK('i-list')}</button><button type="button" data-blok="> İpucu: " title="İpucu kutusu">${IK('i-bulb')}İpucu</button><button type="button" data-blok="> Unutmayın: " title="Not kutusu">${IK('i-shield')}Not</button>
<button type="button" data-blok="| Başlık 1 | Başlık 2 |\n|---|---|\n| … | … |" title="Tablo">${IK('i-grid')}</button><button type="button" data-gorsel title="Görsel">${IK('i-image')}</button><button type="button" data-urun title="Ürün kartı">${IK('i-cart')}Ürün</button>
<button type="button" class="add" data-onizle>${IK('i-eye')}<span>Önizle</span></button></div>
<textarea class="ed-text" name="govde" id="govde" spellcheck="true" placeholder="## İlk başlık&#10;&#10;Paragraf yazın…">${esc(y.govde || '')}</textarea>
<div class="onz" id="onz" hidden><div class="row"><b>Önizleme</b><button type="button" class="btn btn-o btn-s" data-onizle>Kapat</button></div><iframe title="Önizleme" id="onzf"></iframe></div>
<label class="lab mt8">Sık sorulan sorular <em>S: soru / C: cevap, aralarında boş satır</em></label><textarea class="inp mono" name="sss" rows="5" placeholder="S: Ortanca ne zaman budanır?&#10;C: Kış sonunda…">${esc(y.sss || '')}</textarea>
<details class="yardim mt8" id="yardim"><summary>${IK('i-bulb')} Yazı biçimi nasıl kullanılır?</summary><div class="code">## Başlık            → numaralı bölüm başlığı (içindekiler otomatik)
### Alt başlık
**kalın**  *italik*  [metin](/blog/baska-yazi)
- madde            → yeşil onay işaretli liste
1. madde           → numaralı liste
&gt; İpucu: …         → Bahçıvan İpucu kutusu
&gt; Unutmayın: …     → mavi not kutusu
| A | B |            → tablo (ilk satır başlık)
![açıklama](/blog-statik/foto/ortanca.webp "alt yazı")
[ürün:hg-cicek-topragi]   → mağazadan ürün kartı (görsel, fiyat, bağlantı)</div></details>
</div>
<div style="display:grid;gap:16px;align-content:start">
<details class="card sbx acc" open><summary class="hd"><h3>Yayınla</h3>${pill(y.durum)}</summary><div class="bd">
<label class="row"><span>Kategori</span><select class="sel" name="kategori_id">${c.kat.map((k) => `<option value="${k.id}"${k.id === y.kategori_id ? ' selected' : ''}>${esc(k.ad)}</option>`).join('')}</select></label>
<label class="row"><span>Tür</span><select class="sel" name="tur"><option value="yazi">Yazı</option><option value="gundem"${y.tur === 'gundem' ? ' selected' : ''}>Gündem (kısa haber)</option></select></label>
<label class="row"><span>Yazar</span><input class="inp" style="max-width:190px" name="yazar" value="${esc(y.yazar || 'HasTürk Editör Ekibi')}"></label>
<label class="row"><span>Yayın zamanı</span><input class="inp" style="max-width:200px" type="datetime-local" name="yayin" value="${yerelGiris(y.yayin_ts)}"></label>
<div class="row"><span>Ana sayfa vitrini</span>${tgl('one_cikan', y.one_cikan, 'Öne çıkan')}</div>
<div><label class="lab">Etiketler <em>virgülle</em></label><input class="inp" name="etiketler" value="${esc(y.etiketler || '')}" placeholder="limon, saksı, kışlatma"></div>
<div class="btns"><button class="btn btn-o" name="durum" value="taslak">Taslak Kaydet</button>${yayinla ? `<button class="btn btn-o" name="durum" value="zamanli" title="Yayın zamanı ileri bir tarihse o saatte yayına girer">Zamanla</button><button class="btn btn-g" name="durum" value="yayinda">Yayınla</button>` : `<button class="btn btn-g" name="durum" value="inceleme">İncelemeye Gönder</button>`}</div>
<button class="btn btn-o btn-s" name="durum" value="${esc(y.durum || 'taslak')}" formaction="${P(c, '/yazi/kaydet')}?onizle=1">${IK('i-eye')}Kaydet ve sitede önizle</button>
${id ? `<button class="lnk sil" formaction="${P(c, '/yazi/' + id + '/sil')}" data-onay="${y.durum === 'cop' ? 'Yazı kalıcı olarak silinecek. Emin misiniz?' : 'Yazı çöpe taşınacak. Emin misiniz?'}">${y.durum === 'cop' ? 'Kalıcı olarak sil' : 'Çöpe taşı'}</button>` : ''}
</div></details>
<details class="card sbx acc" open><summary class="hd"><h3>SEO Analizi</h3><span class="ring" id="seoring" style="--v:${sc}"><span>${sc}</span></span></summary><div class="bd">
<div><label class="lab">Odak anahtar kelime</label><input class="inp" name="odak" value="${esc(y.odak || '')}" placeholder="ör. saksıda limon ağacı bakımı"></div>
<div class="chk-l" id="seochk" data-odaklar="${esc(JSON.stringify(diger))}" data-esik="${SEO_ESIK}"></div><p class="muted" style="font-size:12px;margin-top:6px">Yeni yazı ${SEO_ESIK} puanın altındaysa yayına alınmaz, taslak olarak kaydedilir.</p></div></details>
<details class="card sbx acc"><summary class="hd"><h3>Arama ve Sosyal Önizleme</h3></summary><div class="bd">
<div><label class="lab">SEO başlığı <em data-say="seo_baslik">0 / 60</em></label><input class="inp" name="seo_baslik" maxlength="90" value="${esc(y.seo_baslik || '')}" placeholder="Boşsa yazı başlığı kullanılır"><div class="cnt"><i data-bar="seo_baslik"></i></div></div>
<div><label class="lab">Meta açıklaması <em data-say="seo_aciklama">0 / 155</em></label><textarea class="inp" name="seo_aciklama" rows="3" maxlength="200" placeholder="Boşsa giriş paragrafı kullanılır">${esc(y.seo_aciklama || '')}</textarea><div class="cnt"><i data-bar="seo_aciklama"></i></div></div>
<div class="serp"><div class="u"><img src="/blog-statik/logo.webp" alt="">${esc((c.A.site_url || '').replace(/^https?:\/\//, ''))}</div><div class="t" id="serpt"></div><div class="d" id="serpd"></div></div>
</div></details>
<details class="card sbx acc" open><summary class="hd"><h3>Öne Çıkan Görsel</h3></summary><div class="bd">
<img id="gorselon" src="${esc(y.gorsel || FOTOLAR[0])}" alt="" style="border-radius:10px;aspect-ratio:16/9;object-fit:cover;width:100%">
<div><label class="lab">Görsel adresi</label><input class="inp" name="gorsel" id="gorsel" value="${esc(y.gorsel || '')}" list="fotolar"><datalist id="fotolar">${FOTOLAR.map((f) => `<option value="${f}">`).join('')}</datalist></div>
<p class="gtekrar" id="gtekrar" hidden></p>
<p class="muted" style="font-size:12px;margin:2px 0 6px">Her yazıya farklı bir görsel seçin. Soluk görünenler başka bir yazıda kullanılıyor.</p>
<details class="galeri"><summary>${IK('i-image')}Galeriden görsel seç <em>${FOTOLAR.length - Object.keys(kul).length} kullanılmamış</em></summary><div class="fotos" data-kullanilan="${esc(JSON.stringify(kul))}">${[...FOTOLAR.filter((f) => !kul[f]), ...FOTOLAR.filter((f) => kul[f])].map((f) => `<button type="button" data-foto="${f}" class="${kul[f] ? 'kul' : ''}" title="${kul[f] ? esc('Kullanılıyor: ' + kul[f]) : 'Kullanılmıyor'}" aria-label="Görsel seç"><img src="${f}" alt="" loading="lazy"></button>`).join('')}</div></details>
<div><label class="lab">Alt metin (görme engelliler ve Google için)</label><input class="inp" name="gorsel_alt" value="${esc(y.gorsel_alt || '')}"></div></div></details>
<details class="card sbx acc"><summary class="hd"><h3>Ürünler</h3><span class="tag">HasTürk Mağaza</span></summary><div class="bd">
<p class="muted" style="font-size:12px;margin:0 0 8px">Yazı sonunda her zaman 4 ürün gösterilir: önce elle seçtikleriniz, kalan yerler yazının konusuna göre otomatik dolar.</p>
<div><label class="lab">Elle seçilen ürünler <em>yazı sonunda önce bunlar</em></label><input class="inp mono" name="urunler" id="urunler" value="${esc(manuel.join(', '))}" placeholder="ürün adresleri, virgülle"></div>
<label class="fin" style="max-width:none">${IK('i-search')}<input id="urunq" placeholder="Mağazada ürün ara…" autocomplete="off"></label><div class="sug" id="urunsonuc"></div>
<p class="muted" style="font-size:12px;margin-top:4px">Şu anki metne göre öneriler:</p>
<div class="sug">${oneri.map((p) => `<div><img src="${gorselUrl(U, p.img, 180)}" alt=""><p><b>${esc(p.n)}</b><small>${esc(p.s)}</small></p><button type="button" class="btn btn-l btn-s" data-urunekle="${esc(p.s)}">Ekle</button></div>`).join('') || '<p class="muted" style="font-size:12px">Metin yazdıkça öneri çıkar.</p>'}</div>
</div></details>
${icOner.length ? `<details class="card sbx acc" open><summary class="hd"><h3>İç Bağlantı Önerileri</h3></summary><div class="bd"><div class="ilink">${icOner.map((o) => `<div>“${esc(o.k.slice(0, 2).join(', '))}” → <b>${esc(o.x.baslik)}</b><button type="button" data-icekle="[${esc(o.x.baslik)}](${c.base}/${esc(o.x.slug)})">Ekle</button></div>`).join('')}</div></div></details>` : ''}
</div></form>`;
  return pSayfa(c, { baslik: id ? 'Yazıyı Düzenle' : 'Yeni Yazı', alt: id ? `${esc(y.slug)} · son güncelleme ${goreli(y.guncel_ts || y.olus_ts)}` : 'Yazınızı yazın, kaydedin, önizleyin.', aktif: 'editor', govde,
    acts: id ? `<a class="btn btn-o" href="${c.base}/${esc(y.slug)}" target="_blank">${IK('i-eye')}Sitede Gör</a>` : '' });
}

async function yaziKaydet(c) {
  const f = await formOku(c.req);
  const id = +f.id || 0;
  const eski = id ? await c.db.prepare('SELECT * FROM b_yazi WHERE id = ?').bind(id).first() : null;
  if (id && !eski) return yonlendir(P(c, '/yazilar?m=hata'));
  let durum = ['taslak', 'inceleme', 'zamanli', 'yayinda', 'cop'].includes(f.durum) ? f.durum : 'taslak';
  if (['zamanli', 'yayinda'].includes(durum) && !yetkili(c.uye, 'yayinla')) durum = 'inceleme';
  const baslik = String(f.baslik || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  if (!baslik) return yonlendir(P(c, id ? '/yazi/' + id : '/yazi/yeni') + '?m=hata');
  const slug = slugYap(f.slug || baslik);
  if (ayrilmisMi(slug) || await c.db.prepare('SELECT 1 FROM b_yazi WHERE slug = ? AND id != ?').bind(slug, id).first()) return yonlendir(P(c, id ? '/yazi/' + id : '/yazi/yeni') + '?m=slug');
  const now = Date.now();
  let yayin = yereldenTs(f.yayin) || (eski && eski.yayin_ts) || 0;
  if (durum === 'yayinda' && (!yayin || yayin > now)) yayin = yayin > now ? yayin : now;
  if (durum === 'yayinda' && yayin > now) durum = 'zamanli';
  if (durum === 'zamanli' && !yayin) durum = 'taslak';
  // Yeni yayına girecek yazı SEO eşiğini geçmeli (zaten yayında olan yazının düzeltmesi engellenmez)
  let seoDusuk = false;
  if (['zamanli', 'yayinda'].includes(durum) && !(eski && ['zamanli', 'yayinda'].includes(eski.durum))) {
    const p = seoPuan({ ...f, slug, baslik, urun_oto: f.urun_oto ? 1 : 0 }, await digerOdaklar(c.db, id));
    if (p < SEO_ESIK) { durum = 'taslak'; seoDusuk = true; }
  }
  const urunler = JSON.stringify(String(f.urunler || '').split(/[\s,]+/).map((x) => x.trim()).filter((x) => /^[a-z0-9-]+$/.test(x)).slice(0, 8));
  const v = [slug, baslik, f.ozet || '', f.kisaca || '', String(f.govde || '').slice(0, 200000), f.sss || '', +f.kategori_id || null, f.etiketler || '', f.gorsel || '', f.gorsel_alt || '', f.seo_baslik || '', f.seo_aciklama || '', f.odak || '', durum, f.tur === 'gundem' ? 'gundem' : 'yazi', f.one_cikan ? 1 : 0, urunler, f.urun_oto ? 1 : 0, String(f.yazar || 'HasTürk Editör Ekibi').slice(0, 60), yayin || null, now];
  let yeniId = id;
  if (id) await c.db.prepare('UPDATE b_yazi SET slug=?, baslik=?, ozet=?, kisaca=?, govde=?, sss=?, kategori_id=?, etiketler=?, gorsel=?, gorsel_alt=?, seo_baslik=?, seo_aciklama=?, odak=?, durum=?, tur=?, one_cikan=?, urunler=?, urun_oto=?, yazar=?, yayin_ts=?, guncel_ts=?, ornek=0 WHERE id=?').bind(...v, id).run();
  else yeniId = (await c.db.prepare('INSERT INTO b_yazi (slug, baslik, ozet, kisaca, govde, sss, kategori_id, etiketler, gorsel, gorsel_alt, seo_baslik, seo_aciklama, odak, durum, tur, one_cikan, urunler, urun_oto, yazar, yayin_ts, guncel_ts, olus_ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...v, now).run()).meta.last_row_id;
  if (c.url.searchParams.get('onizle')) return yonlendir(c.base + '/' + slug);
  const tekrar = f.gorsel && durum !== 'cop' && await c.db.prepare("SELECT 1 FROM b_yazi WHERE gorsel = ? AND id != ? AND durum != 'cop'").bind(f.gorsel, yeniId).first();
  return yonlendir(P(c, '/yazi/' + yeniId) + (seoDusuk ? '?m=seo' : tekrar ? '?m=gorsel' : '?m=kaydedildi'));
}
async function yaziSil(c, id) {
  const y = await c.db.prepare('SELECT durum FROM b_yazi WHERE id = ?').bind(id).first();
  if (!y) return yonlendir(P(c, '/yazilar'));
  if (!yetkili(c.uye, 'yayinla')) return yetkiYok(c, P(c, '/yazi/' + id));
  if (y.durum === 'cop') await c.db.batch([c.db.prepare('DELETE FROM b_yorum WHERE yazi_id = ?').bind(id), c.db.prepare('DELETE FROM b_yazi WHERE id = ?').bind(id)]);
  else await c.db.prepare("UPDATE b_yazi SET durum = 'cop', one_cikan = 0 WHERE id = ?").bind(id).run();
  return yonlendir(P(c, '/yazilar') + '?m=silindi');
}
async function onizle(c) {
  const f = await formOku(c.req);
  const U = await c.U();
  const r = render(String(f.govde || ''), { urunKart: (s) => kartYaziIci(U, c.base, urunBul(U, s), '') });
  const sss = sssCoz(f.sss);
  const doc = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"><link rel="stylesheet" href="/blog-statik/site.css?v=${SURUM}"><base target="_blank"></head><body><main class="wrap" style="padding:20px 18px"><article class="art"><h1 style="margin-top:0">${esc(f.baslik || '')}</h1>${f.ozet ? `<p class="lead">${esc(f.ozet)}</p>` : ''}${f.kisaca ? `<div class="summary"><b>Kısaca</b><p>${esc(f.kisaca)}</p></div>` : ''}<div class="prose">${r.html}</div>${sss.length ? `<h2 style="margin-top:22px">Sık Sorulan Sorular</h2><div class="faq">${sss.map((q) => `<details open><summary>${esc(q.s)}</summary><p>${esc(q.c)}</p></details>`).join('')}</div>` : ''}</article></main></body></html>`;
  return jsonYanit({ html: doc, basliklar: r.basliklar.length });
}
async function urunAra(c) {
  const q = (c.url.searchParams.get('q') || '').toLocaleLowerCase('tr-TR').trim();
  const U = await c.U();
  if (q.length < 2) return jsonYanit({ l: [] });
  const l = U.liste.filter((p) => p.st > 0 && p.p > 0 && p.n.toLocaleLowerCase('tr-TR').includes(q)).slice(0, 8).map((p) => ({ s: p.s, n: p.n, p: p.p, img: gorselUrl(U, p.img, 180), uygun: p.uygun }));
  return jsonYanit({ l });
}

// ---------- Kategoriler ----------
async function kategoriler(c) {
  const say_ = Object.fromEntries((await c.db.prepare('SELECT kategori_id k, COUNT(*) n FROM b_yazi WHERE durum != \'cop\' GROUP BY kategori_id').all()).results.map((r) => [r.k, r.n]));
  const duzenle = yetkili(c.uye, 'anasayfa');
  const satir = (k) => `<form method="post" action="${P(c, '/kategori/' + (k.id || 'yeni'))}" class="katsatir card">
<div class="g katg"><img src="${esc(k.gorsel || '/blog-statik/foto/kat-bitki.webp')}" alt="" style="width:120px;aspect-ratio:1;object-fit:cover;border-radius:10px">
<div class="g g2" style="gap:10px"><label class="lab">Ad<input class="inp" name="ad" required value="${esc(k.ad || '')}"></label><label class="lab">Adres (slug)<input class="inp" name="slug" value="${esc(k.slug || '')}" placeholder="otomatik"></label>
<label class="lab">Kısa açıklama (kutularda)<input class="inp" name="kisa" value="${esc(k.kisa || '')}"></label><label class="lab">Görsel<input class="inp" name="gorsel" value="${esc(k.gorsel || '')}" list="fotolar"></label>
<label class="lab">Üst kategori<select class="sel" name="ust_id" style="display:block;width:100%;margin-top:5px"><option value="">— Ana kategori —</option>${c.kat.filter((x) => !x.ust_id && x.id !== k.id && !c.kat.some((y) => y.ust_id === k.id && k.id)).map((x) => `<option value="${x.id}"${k.ust_id === x.id ? ' selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label><span></span>
<label class="lab" style="grid-column:1/-1">Açıklama (kategori sayfası ve Google)<textarea class="inp" name="aciklama" rows="2">${esc(k.aciklama || '')}</textarea></label>
<div class="row" style="grid-column:1/-1;flex-wrap:wrap;gap:14px"><span class="row" style="gap:8px">Menüde ${tgl('menude', k.menude, 'Menüde göster')}</span><span class="row" style="gap:8px">Ana sayfa kutularında ${tgl('vitrin', k.id ? k.vitrin : 1, 'Ana sayfada göster')}</span><label class="row" style="gap:8px">Sıra<input class="inp" style="width:70px" type="number" name="sira" value="${k.sira || 0}"></label>
<label class="row" style="gap:8px">Etiket rengi<select class="sel" name="renk">${[['', 'Yeşil'], ['pink', 'Pembe'], ['soil', 'Toprak'], ['blue', 'Mavi']].map(([v, a]) => `<option value="${v}"${(k.renk || '') === v ? ' selected' : ''}>${a}</option>`).join('')}</select></label>
<span style="margin-left:auto;display:flex;gap:8px">${k.id ? `<span class="muted" style="font-size:12px;align-self:center">${say_[k.id] || 0} yazı</span>` : ''}${duzenle ? `<button class="btn btn-g btn-s">${k.id ? 'Kaydet' : 'Ekle'}</button>${k.id && !say_[k.id] ? `<button class="btn btn-r btn-s" name="sil" value="1" data-onay="Kategori silinsin mi?">Sil</button>` : ''}` : ''}</span></div></div></div></form>`;
  const govde = `<datalist id="fotolar">${FOTOLAR.map((f) => `<option value="${f}">`).join('')}</datalist><div class="g">${c.kat.map(satir).join('')}${duzenle ? `<h2 style="font-size:16px;margin-top:8px">Yeni kategori</h2>${satir({})}` : ''}</div>`;
  return pSayfa(c, { baslik: 'Kategoriler', alt: 'Menü, ana sayfa kutuları ve kategori sayfaları buradan yönetilir.', aktif: 'kategoriler', govde });
}
async function kategoriKaydet(c, id) {
  if (!yetkili(c.uye, 'anasayfa')) return yetkiYok(c, P(c, '/kategoriler'));
  const f = await formOku(c.req);
  if (f.sil && +id) {
    const n = await c.db.prepare('SELECT COUNT(*) n FROM b_yazi WHERE kategori_id = ?').bind(+id).first();
    if (!n.n) await c.db.batch([c.db.prepare('UPDATE b_kategori SET ust_id = NULL WHERE ust_id = ?').bind(+id), c.db.prepare('DELETE FROM b_kategori WHERE id = ?').bind(+id)]);
  } else {
    const ad = String(f.ad || '').trim();
    if (!ad) return yonlendir(P(c, '/kategoriler?m=hata'));
    const slug = slugYap(f.slug || ad);
    if (await c.db.prepare('SELECT 1 FROM b_kategori WHERE slug = ? AND id != ?').bind(slug, +id || 0).first()) return yonlendir(P(c, '/kategoriler?m=slug'));
    // Alt kategori tek seviye: üst kategori bir ana kategori olmalı ve kendisi değil
    const ust = c.kat.find((x) => x.id === +f.ust_id && !x.ust_id && x.id !== +id && !c.kat.some((y) => y.ust_id === +id && +id));
    const v = [slug, ad, f.aciklama || '', f.kisa || '', f.gorsel || '', +f.sira || 0, f.menude ? 1 : 0, f.vitrin ? 1 : 0, f.renk || '', ust ? ust.id : null];
    if (+id) await c.db.prepare('UPDATE b_kategori SET slug=?, ad=?, aciklama=?, kisa=?, gorsel=?, sira=?, menude=?, vitrin=?, renk=?, ust_id=? WHERE id=?').bind(...v, +id).run();
    else await c.db.prepare('INSERT INTO b_kategori (slug, ad, aciklama, kisa, gorsel, sira, menude, vitrin, renk, ust_id) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(...v).run();
  }
  katSifirla();
  return yonlendir(P(c, '/kategoriler?m=kaydedildi'));
}

// ---------- Soru-Cevap ----------
async function sorular(c) {
  if (!yetkili(c.uye, 'moderasyon')) return yetkiYok(c);
  const sec = +c.url.searchParams.get('id') || 0, qq = (c.url.searchParams.get('q') || '').trim().slice(0, 80);
  const say_ = await c.db.prepare("SELECT (SELECT COUNT(*) FROM b_soru WHERE durum = 'bekliyor') + (SELECT COUNT(DISTINCT soru_id) FROM b_cevap WHERE durum = 'bekliyor') onay, SUM(CASE WHEN durum = 'onayli' AND cevap_sayisi = 0 THEN 1 ELSE 0 END) cevapsiz, SUM(CASE WHEN durum = 'onayli' AND cevap_sayisi > 0 AND cozum_id IS NULL THEN 1 ELSE 0 END) cevaplandi, SUM(CASE WHEN durum = 'onayli' AND cozum_id IS NOT NULL THEN 1 ELSE 0 END) cozuldu, SUM(CASE WHEN durum = 'zamanli' THEN 1 ELSE 0 END) zamanli, SUM(CASE WHEN durum = 'cop' THEN 1 ELSE 0 END) cop, SUM(CASE WHEN durum != 'zamanli' THEN 1 ELSE 0 END) top FROM b_soru").first();
  // Sekme seçilmemişse iş bekleyen ilk sekme açılır (boş "Onay Bekleyen" yerine)
  const t = c.url.searchParams.get('t') || ['onay', 'cevapsiz', 'cevaplandi', 'cozuldu'].find((k) => say_[k]) || 'onay';
  const kos = { onay: "s.durum = 'bekliyor' OR s.id IN (SELECT soru_id FROM b_cevap WHERE durum = 'bekliyor')", cevapsiz: "s.durum = 'onayli' AND s.cevap_sayisi = 0", cevaplandi: "s.durum = 'onayli' AND s.cevap_sayisi > 0 AND s.cozum_id IS NULL", cozuldu: "s.durum = 'onayli' AND s.cozum_id IS NOT NULL", zamanli: "s.durum = 'zamanli'", cop: "s.durum = 'cop'" }[t] || "s.durum = 'bekliyor'";
  const [list, ist] = await Promise.all([
    c.db.prepare(`SELECT s.*, u.ad uad, u.onayli uon, u.rol urol, k.ad kad, (SELECT COUNT(*) FROM b_cevap WHERE soru_id = s.id AND durum = 'bekliyor') bc FROM b_soru s JOIN b_uye u ON u.id = s.uye_id LEFT JOIN b_kategori k ON k.id = s.kategori_id WHERE (${kos})${qq ? ' AND (s.baslik LIKE ?1 OR s.metin LIKE ?1)' : ''} ORDER BY s.ts ${t === 'zamanli' ? 'ASC' : 'DESC'} LIMIT 30`).bind(...(qq ? ['%' + qq + '%'] : [])).all(),
    c.db.prepare("SELECT AVG(ilk - s.ts) ort FROM b_soru s JOIN (SELECT soru_id, MIN(ts) ilk FROM b_cevap WHERE durum = 'onayli' GROUP BY soru_id) a ON a.soru_id = s.id WHERE s.ts > ?").bind(Date.now() - 30 * 86400000).first(),
  ]);
  const s = sec ? await c.db.prepare('SELECT s.*, u.ad uad, u.onayli uon, u.rol urol, k.ad kad FROM b_soru s JOIN b_uye u ON u.id = s.uye_id LEFT JOIN b_kategori k ON k.id = s.kategori_id WHERE s.id = ?').bind(sec).first() : list.results[0];
  const cevaplar = s ? (await c.db.prepare("SELECT a.*, u.ad uad, u.onayli uon, u.rol urol FROM b_cevap a JOIN b_uye u ON u.id = a.uye_id WHERE a.soru_id = ? AND a.durum != 'cop' ORDER BY a.ts").bind(s.id).all()).results : [];
  const tab = (k, ad, n) => `<a href="${P(c, '/sorular?t=' + k)}"${t === k ? ' class="on"' : ''}>${ad} <i>${n || 0}</i></a>`;
  const ort = ist && ist.ort ? (ist.ort > 3600000 ? Math.round(ist.ort / 3600000) + ' sa' : Math.round(ist.ort / 60000) + ' dk') : '—';
  const guvenEt = (x) => { const g = guven({ rol: x.urol, onayli: x.uon }, c.A); return g ? `<span class="trust ${g.sinif}">${esc(g.ad)}</span>` : ''; };
  const karar = (tur, id, ...d) => `<form method="post" action="${P(c, '/' + tur + '/' + id + '/karar')}" style="display:inline-flex;gap:6px">${d.map(([k, a, cls]) => `<button class="btn ${cls} btn-s" name="karar" value="${k}"${k === 'sil' ? ' data-onay="Silinsin mi?"' : ''}>${a}</button>`).join('')}<input type="hidden" name="geri" value="${esc(c.url.pathname + c.url.search)}"></form>`;
  const govde = `<div class="kpis k5">${kpi('i-chat', 'c-o', 'Toplam Soru', binlik(say_.top), '')}${kpi('i-clock', 'c-r', 'Onay Bekleyen', say_.onay || 0, 'soru ya da cevap')}${kpi('i-chat', 'c-y', 'Cevap Bekleyen', say_.cevapsiz || 0, 'henüz cevapsız')}${kpi('i-check', 'c-g', 'Çözüldü', say_.cozuldu || 0, 'çözüm işaretli')}${kpi('i-clock', 'c-b', 'Ort. İlk Cevap', ort, 'son 30 gün')}</div>
<div class="split"><div class="card" style="padding:0"><div style="padding:16px 16px 0"><div class="tabs" style="margin:0">${tab('onay', 'Onay Bekleyen', say_.onay)}${tab('cevapsiz', 'Cevapsız', say_.cevapsiz)}${tab('cevaplandi', 'Cevaplandı', say_.cevaplandi)}${tab('cozuldu', 'Çözüldü', say_.cozuldu)}${tab('zamanli', 'Zamanlanmış', say_.zamanli)}${tab('cop', 'Çöp', say_.cop)}</div>
<form class="qara" method="get"><input type="hidden" name="t" value="${esc(t)}"><label class="fin">${IK('i-search')}<input name="q" value="${esc(qq)}" placeholder="Sorularda ara…" aria-label="Sorularda ara"></label></form></div>
${list.results.map((x) => `<a class="q${s && x.id === s.id ? ' sel' : ''}" href="${P(c, '/sorular?t=' + t + (qq ? '&q=' + encodeURIComponent(qq) : '') + '&id=' + x.id)}"><span class="av s" style="background:${renk(x.uad)}">${esc(bas(x.uad))}</span><div><b>${esc(x.baslik)}</b><small>${x.kad ? `<span class="tag">${esc(x.kad)}</span>` : ''}${esc(x.uad)} · ${goreli(x.ts)}</small></div><div class="r">${x.durum === 'bekliyor' ? '<span class="pill c-o">Onay bekliyor</span>' : x.bc ? `<span class="pill c-o">${x.bc} cevap bekliyor</span>` : x.cozum_id ? '<span class="pill c-g">Çözüldü</span>' : x.cevap_sayisi ? '<span class="pill c-b">Cevaplandı</span>' : '<span class="pill c-r">Cevapsız</span>'}<span>${x.cevap_sayisi} cevap</span></div></a>`).join('') || `<p class="muted" style="padding:16px">${qq ? 'Aramaya uyan soru yok.' : 'Bu sekmede soru yok.'}</p>`}</div>
${s ? `<div class="card det"><div class="row">${s.durum === 'bekliyor' ? `<span class="pill c-o">Onay bekliyor${s.neden ? ' · ' + esc(s.neden) : ''}</span>` : s.durum === 'cop' ? '<span class="pill c-r">Çöpte</span>' : '<span class="pill c-g">Yayında</span>'}<a class="btn btn-o btn-s" href="${c.base}/soru-cevap/${s.id}-${esc(s.slug)}" target="_blank">${IK('i-ext')}Sitede Gör</a></div>
<h2>${esc(s.baslik)}</h2><div class="meta"><span class="av s" style="background:${renk(s.uad)}">${esc(bas(s.uad))}</span><b style="color:var(--ink)">${esc(s.uad)}</b>${guvenEt(s)}<span>· ${goreli(s.ts)}${s.kad ? ' · ' + esc(s.kad) : ''} · ${binlik(s.goruntulenme)} görüntülenme</span></div>
<div class="body">${esc(s.metin).replace(/\n/g, '<br>')}</div>
<div>${s.durum === 'bekliyor' ? karar('soru', s.id, ['onay', 'Onayla', 'btn-g'], ['ret', 'Reddet', 'btn-r']) : s.durum === 'onayli' ? karar('soru', s.id, ['ret', 'Yayından kaldır', 'btn-r']) : karar('soru', s.id, ['onay', 'Geri al ve yayınla', 'btn-o'], ['sil', 'Kalıcı sil', 'btn-r'])}</div>
${cevaplar.map((a) => `<div class="ans${a.id === s.cozum_id ? ' sol' : ''}"><div class="h"><span class="av s" style="background:${a.ekip ? '#2e6b30' : renk(a.uad)}">${esc(bas(a.uad))}</span><b>${esc(a.uad)}</b>${guvenEt(a)}<span class="muted">· ${goreli(a.ts)}</span>${a.id === s.cozum_id ? '<span class="pill c-g">Çözüm</span>' : ''}${a.durum === 'bekliyor' ? `<span class="pill c-o">Onay bekliyor${a.neden ? ' · ' + esc(a.neden) : ''}</span>` : ''}</div><p>${esc(a.metin).replace(/\n/g, '<br>')}</p>
<div class="f"><span>▲ ${a.oy} oy</span>${a.durum === 'bekliyor' ? karar('cevap', a.id, ['onay', 'Onayla', 'btn-g'], ['ret', 'Reddet', 'btn-r']) : karar('cevap', a.id, ...(a.id !== s.cozum_id ? [['cozum', 'Çözüm olarak işaretle', 'btn-l']] : []), ['ret', 'Gizle', 'btn-o'])}</div></div>`).join('')}
${s.durum === 'onayli' ? `<form class="reply" method="post" action="${P(c, '/soru/' + s.id + '/cevap')}"><textarea name="metin" required minlength="10" placeholder="HasTürk Ekibi olarak cevap yazın…"></textarea><div class="bt"><span class="muted" style="font-size:12px">Cevap “${esc(c.uye.ad)}” adıyla, Ekip rozetiyle yayınlanır.</span><span class="sp"></span><label style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="checkbox" class="chk" name="cozum" value="1">Çözüm olarak işaretle</label><button class="btn btn-g btn-s">Ekip Cevabı Gönder</button></div><input type="hidden" name="geri" value="${esc(c.url.pathname + c.url.search)}"></form>` : ''}
</div>` : '<div class="card muted">Soru seçin.</div>'}</div>`;
  return pSayfa(c, { baslik: 'Topluluk & Soru-Cevap', alt: 'Üyelerin sorularını onaylayın, cevaplayın, en iyi cevabı çözüm olarak işaretleyin.', aktif: 'sorular', govde });
}
async function soruKarar(c, tur, id, is) {
  if (!yetkili(c.uye, 'moderasyon')) return yetkiYok(c);
  const f = await formOku(c.req);
  const geri = String(f.geri || '').startsWith(P(c)) ? f.geri : P(c, '/sorular');
  const now = Date.now();
  if (tur === 'soru' && is === 'cevap') {
    const s = await c.db.prepare("SELECT id, slug, baslik, uye_id FROM b_soru WHERE id = ? AND durum = 'onayli'").bind(id).first();
    const m = String(f.metin || '').trim();
    if (s && m.length >= 10) {
      const r = await c.db.prepare("INSERT INTO b_cevap (soru_id, uye_id, metin, ekip, durum, ts) VALUES (?, ?, ?, 1, 'onayli', ?)").bind(id, c.uye.id, m.slice(0, 4000), now).run();
      await c.db.prepare(`UPDATE b_soru SET cevap_sayisi = (SELECT COUNT(*) FROM b_cevap WHERE soru_id = ? AND durum = 'onayli'), son_ts = ?${f.cozum ? ', cozum_id = ' + Number(r.meta.last_row_id) : ''} WHERE id = ?`).bind(id, now, id).run();
      if (s.uye_id !== c.uye.id) bildir(c, 'cevap', s.uye_id, { soru: s.baslik, cevaplayan: c.uye.ad, cevap: kirp(m, 300), baglanti: soruTamUrl(c, s) + '#c' + r.meta.last_row_id });
    }
    return yonlendir(geri + (geri.includes('?') ? '&' : '?') + 'm=gonderildi');
  }
  const k = f.karar;
  if (tur === 'soru') {
    const s = await c.db.prepare('SELECT * FROM b_soru WHERE id = ?').bind(id).first();
    if (!s) return yonlendir(geri);
    if (k === 'onay') { await c.db.prepare("UPDATE b_soru SET durum = 'onayli', neden = NULL WHERE id = ?").bind(id).run(); if (s.durum === 'bekliyor') { await kararSay(c.db, s.uye_id, true, c.A); bildir(c, 'soru', s.uye_id, { soru: s.baslik, baglanti: soruTamUrl(c, s) }); } }
    else if (k === 'ret') { await c.db.prepare("UPDATE b_soru SET durum = 'cop' WHERE id = ?").bind(id).run(); if (s.durum === 'bekliyor') await kararSay(c.db, s.uye_id, false, c.A); }
    else if (k === 'sil') await c.db.batch([c.db.prepare('DELETE FROM b_cevap WHERE soru_id = ?').bind(id), c.db.prepare('DELETE FROM b_soru WHERE id = ?').bind(id)]);
  } else {
    const a = await c.db.prepare('SELECT * FROM b_cevap WHERE id = ?').bind(id).first();
    if (!a) return yonlendir(geri);
    if (k === 'onay') {
      await c.db.prepare("UPDATE b_cevap SET durum = 'onayli', neden = NULL WHERE id = ?").bind(id).run();
      if (a.durum === 'bekliyor') {
        await kararSay(c.db, a.uye_id, true, c.A);
        const s = await c.db.prepare('SELECT s.id, s.slug, s.baslik, s.uye_id, u.ad cad FROM b_soru s, b_uye u WHERE s.id = ? AND u.id = ?').bind(a.soru_id, a.uye_id).first();
        if (s && s.uye_id !== a.uye_id) bildir(c, 'cevap', s.uye_id, { soru: s.baslik, cevaplayan: s.cad, cevap: kirp(a.metin, 300), baglanti: soruTamUrl(c, s) + '#c' + a.id });
      }
    }
    else if (k === 'ret') { await c.db.prepare("UPDATE b_cevap SET durum = 'cop' WHERE id = ?").bind(id).run(); if (a.durum === 'bekliyor') await kararSay(c.db, a.uye_id, false, c.A); await c.db.prepare('UPDATE b_soru SET cozum_id = NULL WHERE id = ? AND cozum_id = ?').bind(a.soru_id, id).run(); }
    else if (k === 'cozum' && a.durum === 'onayli') await c.db.prepare('UPDATE b_soru SET cozum_id = ? WHERE id = ?').bind(id, a.soru_id).run();
    await c.db.prepare("UPDATE b_soru SET cevap_sayisi = (SELECT COUNT(*) FROM b_cevap WHERE soru_id = ? AND durum = 'onayli'), son_ts = ? WHERE id = ?").bind(a.soru_id, now, a.soru_id).run();
  }
  return yonlendir(geri + (geri.includes('?') ? '&' : '?') + 'm=' + (k === 'onay' || k === 'cozum' ? 'onaylandi' : k === 'sil' ? 'silindi' : 'reddedildi'));
}

// ---------- Yorumlar ----------
// Üyelerin yüklediği fotoğraflar (soru fotoğrafları ve profil fotoğrafları): son yüklenenler, tek tıkla kaldırma
async function fotograflar(c) {
  if (!yetkili(c.uye, 'moderasyon')) return yetkiYok(c);
  const [list, top] = await Promise.all([
    c.db.prepare("SELECT d.id, d.tur, d.hedef, d.boyut, d.ts, u.ad uad, s.slug ss, s.baslik sb FROM b_dosya d JOIN b_uye u ON u.id = d.uye_id LEFT JOIN b_soru s ON d.tur = 'soru' AND s.id = d.hedef WHERE d.durum = 'aktif' ORDER BY d.ts DESC LIMIT 60").all(),
    c.db.prepare("SELECT COUNT(*) n, COALESCE(SUM(boyut), 0) b FROM b_dosya WHERE durum = 'aktif'").first(),
  ]);
  const geri = esc(c.url.pathname);
  const govde = `<div class="card"><div class="hd"><h3>Son yüklenen fotoğraflar</h3><span class="muted" style="font-size:12.5px">${binlik(top.n)} fotoğraf · ${(top.b / 1048576).toFixed(1)} MB</span></div>
<p class="muted" style="font-size:12.5px;margin:0 0 12px">Uygunsuz, kişisel bilgi içeren ya da konu dışı fotoğrafı kaldırın; kaldırılan fotoğraf sitede hemen görünmez olur. Soru fotoğrafları, soru onaylanmadan herkese açık sayfalarda gösterilmez.</p>
${list.results.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px">${list.results.map((d) => `<div style="border:1px solid var(--line);border-radius:10px;overflow:hidden"><a href="${c.base}/dosya/${d.id}" target="_blank"><img src="${c.base}/dosya/${d.id}" alt="" loading="lazy" style="width:100%;aspect-ratio:1;object-fit:cover;display:block"></a><div style="padding:8px 10px;font-size:12px"><b>${esc(d.uad)}</b> · ${d.tur === 'profil' ? 'profil' : `<a class="lnk" href="${c.base}/soru-cevap/${d.hedef}-${esc(d.ss || '')}" target="_blank">${esc(kirp(d.sb || 'soru', 40))}</a>`}<br><span class="muted">${goreli(d.ts)} · ${Math.round(d.boyut / 1024)} KB</span><form method="post" action="${P(c, '/foto/' + d.id)}" style="margin-top:6px"><input type="hidden" name="geri" value="${geri}"><button class="btn btn-o btn-s" onclick="return confirm('Fotoğraf kaldırılsın mı?')">Kaldır</button></form></div></div>`).join('')}</div>` : '<p class="muted">Henüz üye fotoğrafı yok.</p>'}</div>`;
  return pSayfa(c, { baslik: 'Üye Fotoğrafları', alt: 'Soru-cevaba eklenen fotoğraflar ve profil fotoğrafları.', aktif: 'fotograflar', govde });
}
async function fotoSil(c, id) {
  if (!yetkili(c.uye, 'moderasyon')) return yetkiYok(c);
  if (/^[a-z0-9]{8,24}$/.test(id || '')) {
    await c.db.prepare("UPDATE b_dosya SET durum = 'silindi', veri = x'' WHERE id = ?").bind(id).run();
    await c.db.prepare('UPDATE b_uye SET foto = NULL WHERE foto = ?').bind(id).run();
  }
  return yonlendir(P(c, '/fotograflar?m=kaydedildi'));
}
async function yorumlar(c) {
  if (!yetkili(c.uye, 'moderasyon')) return yetkiYok(c);
  const t = c.url.searchParams.get('t') || 'bekliyor';
  const [list, say_, ist] = await Promise.all([
    c.db.prepare('SELECT m.*, u.ad uad, u.onayli uon, u.rol urol, y.baslik yb, y.slug ys FROM b_yorum m JOIN b_uye u ON u.id = m.uye_id JOIN b_yazi y ON y.id = m.yazi_id WHERE m.durum = ? ORDER BY m.ts DESC LIMIT 50').bind(t).all(),
    c.db.prepare('SELECT durum, COUNT(*) n FROM b_yorum GROUP BY durum').all(),
    c.db.prepare("SELECT SUM(CASE WHEN durum = 'onayli' AND neden IS NULL THEN 1 ELSE 0 END) oto, SUM(CASE WHEN durum = 'onayli' THEN 1 ELSE 0 END) onay, SUM(CASE WHEN durum IN ('spam','cop') THEN 1 ELSE 0 END) ret FROM b_yorum WHERE ts > ?").bind(Date.now() - 30 * 86400000).first(),
  ]);
  const n = Object.fromEntries(say_.results.map((r) => [r.durum, r.n]));
  const tab = (k, ad) => `<a href="${P(c, '/yorumlar?t=' + k)}"${t === k ? ' class="on"' : ''}>${ad} <i>${n[k] || 0}</i></a>`;
  const A = c.A, geri = esc(c.url.pathname + c.url.search);
  const btn = (id, k, ik, cls, et) => `<button class="${cls}" name="karar" value="${k}" form="f${id}" aria-label="${et}" title="${et}">${IK(ik)}</button>`;
  const govde = `<div class="kpis k4">${kpi('i-clock', 'c-o', 'Onay Bekleyen', n.bekliyor || 0, 'yeni hesaplar ve bağlantılılar')}${kpi('i-check', 'c-g', 'Otomatik Yayınlanan', ist.onay ? '%' + Math.round((ist.oto || 0) / ist.onay * 100) : '—', 'son 30 gün')}${kpi('i-shield', 'c-r', 'Spam / Reddedilen', ist.ret || 0, 'son 30 gün')}${kpi('i-msg', 'c-b', 'Yayındaki Yorum', n.onayli || 0, '')}</div>
<div class="g g-21"><div class="card" style="padding:0"><div style="padding:16px 16px 0"><div class="tabs" style="margin:0">${tab('bekliyor', 'Onay Bekleyen')}${tab('onayli', 'Onaylı')}${tab('spam', 'Spam')}${tab('cop', 'Çöp')}</div></div>
${t === 'bekliyor' && list.results.length ? `<form method="post" action="${P(c, '/yorum/toplu')}" id="toplu" class="toplu"><input type="hidden" name="geri" value="${geri}"><label style="display:flex;gap:8px;align-items:center;font-size:12.5px"><input type="checkbox" class="chk" data-hepsi>Tümünü seç</label><button class="btn btn-o btn-s" name="karar" value="onay">${IK('i-check')}Seçilenleri onayla</button><button class="btn btn-r btn-s" name="karar" value="spam">Seçilenleri spam say</button></form>` : ''}
${list.results.map((m) => { const g = guven({ rol: m.urol, onayli: m.uon }, A); return `<div class="cm"><input type="checkbox" class="chk" name="id" value="${m.id}" form="toplu" aria-label="Seç"><span class="av s" style="background:${renk(m.uad)}">${esc(bas(m.uad))}</span><div class="tx"><div class="who"><b>${esc(m.uad)}</b>${g ? `<span class="trust ${g.sinif}">${esc(g.ad)}</span>` : ''}${m.neden ? `<span class="trust c-r">${esc(m.neden)}</span>` : ''}<span class="muted" style="font-size:11.5px">· ${goreli(m.ts)}</span></div>${esc(m.metin).replace(/\n/g, '<br>')}<div class="on-p">Yazı: <a href="${c.base}/${esc(m.ys)}#y${m.id}" target="_blank">${esc(m.yb)}</a>${m.ust_id ? ' · yanıt' : ''}</div>
<details class="ycev"><summary>Cevapla</summary><form method="post" action="${P(c, '/yorum/' + m.id + '/cevap')}"><textarea class="inp" name="metin" rows="2" required placeholder="Ekip olarak yanıt…"></textarea><input type="hidden" name="geri" value="${geri}"><button class="btn btn-g btn-s">Gönder${m.durum === 'bekliyor' ? ' (yorum da onaylanır)' : ''}</button></form></details></div>
<form method="post" action="${P(c, '/yorum/' + m.id + '/karar')}" id="f${m.id}"><input type="hidden" name="geri" value="${geri}"></form>
<div class="acts">${t !== 'onayli' ? btn(m.id, 'onay', 'i-check', 'a1', 'Onayla') : ''}${t !== 'spam' ? btn(m.id, 'spam', 'i-shield', 'a3', 'Spam') : ''}${t !== 'cop' ? btn(m.id, 'cop', 'i-x2', 'a2', 'Çöpe at') : `<button class="a2" name="karar" value="sil" form="f${m.id}" aria-label="Kalıcı sil" data-onay="Kalıcı silinsin mi?">${IK('i-x2')}</button>`}</div></div>`; }).join('') || '<p class="muted" style="padding:16px">Bu sekmede yorum yok.</p>'}
</div>
<div style="display:grid;gap:16px;align-content:start">
<form class="card" method="post" action="${P(c, '/kurallar')}"><div class="hd"><h3>Otomatik Onay Kuralları</h3><span class="pill c-g">Açık</span></div>
<div class="rule"><span class="ic c-o">${IK('i-user')}</span><div><b>Yeni hesap</b><small>İlk paylaşımları (yorum, soru, cevap) elle onaylanır.</small></div><span class="num">İlk <input name="yorum_esik" type="number" min="0" max="50" value="${esc(A.yorum_esik || '3')}" aria-label="Elle onay sayısı"></span></div>
<div class="rule"><span class="ic c-g">${IK('i-shield')}</span><div><b>Düzenli hesap</b><small>Bu sayıya ulaşan hesabın paylaşımları beklemeden yayınlanır.</small></div><span class="muted" style="font-size:12px">otomatik</span></div>
<div class="rule"><span class="ic c-r">${IK('i-link')}</span><div><b>Bağlantı içeren paylaşım</b><small>Düzenli hesap olsa da elle onaya düşer.</small></div>${tgl('link_beklet', A.link_beklet !== '0', 'Bağlantıları beklet')}</div>
<div class="rule"><span class="ic c-y">${IK('i-x2')}</span><div><b>Reddedilen paylaşım</b><small>Hesap yeniden “yeni” seviyesine döner.</small></div>${tgl('ret_sifirla', A.ret_sifirla !== '0', 'Seviyeyi sıfırla')}</div>
<div class="rule"><span class="ic c-g">${IK('i-star')}</span><div><b>Güvenilir rozeti</b><small>Bu kadar onaylı paylaşımı olan hesaba rozet.</small></div><span class="num"><input name="guvenilir_esik" type="number" min="1" max="500" value="${esc(A.guvenilir_esik || '20')}" aria-label="Güvenilir eşiği"></span></div>
<div class="rule"><span class="ic c-b">${IK('i-filter')}</span><div><b>Arka plan filtresi</b><small>Kelime ve spam filtresi · sonraki aşamada</small></div><span class="tag">Yakında</span></div>
${yetkili(c.uye, 'seo') ? '<button class="btn btn-g btn-s" style="margin-top:12px">Kuralları Kaydet</button>' : ''}</form>
<div class="card"><div class="hd"><h3>Hesap Güven Seviyesi</h3></div><div class="flow">
<div class="c-o"><b>Yeni</b><small>İlk ${esc(A.yorum_esik || '3')} paylaşım</small><small>Elle onay</small></div>
<div class="c-b"><b>Düzenli</b><small>${esc(A.yorum_esik || '3')}+ onaylı</small><small>Otomatik</small></div>
<div class="c-g"><b>Güvenilir</b><small>${esc(A.guvenilir_esik || '20')}+ onaylı</small><small>Otomatik + rozet</small></div></div></div>
</div></div>`;
  return pSayfa(c, { baslik: 'Yorum Moderasyonu', alt: 'Yeni hesapların ilk yorumları elle onaylanır; düzenli hesaplar otomatik yayınlanır.', aktif: 'yorumlar', govde });
}
async function yorumKarar(c, id, is) {
  if (!yetkili(c.uye, 'moderasyon')) return yetkiYok(c);
  const f = await formOku(c.req);
  const geri = String(f.geri || '').startsWith(P(c)) ? f.geri : P(c, '/yorumlar');
  const ids = id === 'toplu' ? [].concat(f.id || []).map(Number).filter(Boolean).slice(0, 100) : [+id];
  if (is === 'cevap') {
    const m = await c.db.prepare('SELECT * FROM b_yorum WHERE id = ?').bind(+id).first();
    const metin_ = String(f.metin || '').trim();
    if (m && metin_.length >= 2) {
      if (m.durum === 'bekliyor') { await c.db.prepare("UPDATE b_yorum SET durum = 'onayli', neden = NULL WHERE id = ?").bind(m.id).run(); await kararSay(c.db, m.uye_id, true, c.A); }
      await c.db.prepare("INSERT INTO b_yorum (yazi_id, uye_id, ust_id, metin, durum, ts) VALUES (?, ?, ?, ?, 'onayli', ?)").bind(m.yazi_id, c.uye.id, m.ust_id || m.id, metin_.slice(0, 3000), Date.now()).run();
    }
    return yonlendir(geri + (geri.includes('?') ? '&' : '?') + 'm=gonderildi');
  }
  const k = f.karar;
  for (const i of ids) {
    const m = await c.db.prepare('SELECT * FROM b_yorum WHERE id = ?').bind(i).first();
    if (!m) continue;
    if (k === 'onay') { await c.db.prepare("UPDATE b_yorum SET durum = 'onayli', neden = NULL WHERE id = ?").bind(i).run(); if (m.durum === 'bekliyor') await kararSay(c.db, m.uye_id, true, c.A); }
    else if (k === 'spam' || k === 'cop') { await c.db.prepare('UPDATE b_yorum SET durum = ? WHERE id = ?').bind(k, i).run(); if (m.durum === 'bekliyor') await kararSay(c.db, m.uye_id, false, c.A); }
    else if (k === 'sil') await c.db.prepare('DELETE FROM b_yorum WHERE id = ? OR ust_id = ?').bind(i, i).run();
  }
  return yonlendir(geri + (geri.includes('?') ? '&' : '?') + 'm=' + (k === 'onay' ? 'onaylandi' : k === 'sil' ? 'silindi' : 'reddedildi'));
}
async function kurallarKaydet(c) {
  if (!yetkili(c.uye, 'seo')) return yetkiYok(c, P(c, '/yorumlar'));
  const f = await formOku(c.req);
  await ayarYaz(c.db, 'yorum_esik', String(Math.max(0, Math.min(50, +f.yorum_esik || 0))));
  await ayarYaz(c.db, 'guvenilir_esik', String(Math.max(1, Math.min(500, +f.guvenilir_esik || 20))));
  await ayarYaz(c.db, 'link_beklet', f.link_beklet ? '1' : '0');
  await ayarYaz(c.db, 'ret_sifirla', f.ret_sifirla ? '1' : '0');
  return yonlendir(P(c, '/yorumlar?m=kaydedildi'));
}

// ---------- Ana sayfa & bannerlar ----------
const ALANLAR = { B2: 'Sağ sütun üst kart (ana sayfa)', B3: 'Ana sayfa mağaza bandı', B5: 'Kategori sayfası alt bant' };
const BOLUMLER = [['sorular', 'Topluluktan Sorular'], ['gundem', 'Gündem'], ['ay', 'Bu Ay Bahçede'], ['ipucu', 'Günün Bitki İpucu'], ['bulten', 'Bülten kutusu']];
async function anasayfa(c) {
  if (!yetkili(c.uye, 'anasayfa')) return yetkiYok(c);
  const [bn, one, ist] = await Promise.all([
    c.db.prepare('SELECT * FROM b_banner ORDER BY alan, id DESC').all(),
    c.db.prepare(`SELECT id, baslik, gorsel FROM b_yazi WHERE one_cikan = 1 AND ${YAYINDA} ORDER BY yayin_ts DESC`).bind(Date.now()).all(),
    c.db.prepare("SELECT SUM(n) n FROM b_istat WHERE k = 'tik' AND d >= ?").bind(gun(Date.now() - 29 * 86400000)).first(),
  ]);
  const U = await c.U();
  const secili = Array.isArray(c.A.one_urunler) ? c.A.one_urunler : [];
  const sec = urunBul(U, secili);
  const now = Date.now();
  const bForm = (b) => `<form class="bn${b.id ? '' : ' bnyeni'}" method="post" action="${P(c, '/banner/' + (b.id || 'yeni'))}"><div class="pv"><img src="${esc(b.gorsel || BANNER_FOTO)}" alt=""><div class="ov"><b>${esc(b.baslik || 'Banner başlığı')}</b><small>${esc(b.alt || '')}</small><i>${esc(b.dugme || 'Alışverişe Başla')}</i></div><span class="loc">${esc(b.alan || 'B3')} · ${esc(ALANLAR[b.alan || 'B3'])}</span></div>
<div class="bi"><div class="g g2" style="gap:8px"><label class="lab">Alan<select class="sel" name="alan">${Object.entries(ALANLAR).map(([k, a]) => `<option value="${k}"${(b.alan || 'B3') === k ? ' selected' : ''}>${k} · ${a}</option>`).join('')}</select></label><label class="lab">İç ad<input class="inp" name="ad" value="${esc(b.ad || '')}" placeholder="ör. Sonbahar kampanyası"></label>
<label class="lab" style="grid-column:1/-1">Başlık<input class="inp" name="baslik" required value="${esc(b.baslik || '')}"></label><label class="lab" style="grid-column:1/-1">Alt metin<input class="inp" name="alt" value="${esc(b.alt || '')}"></label>
<label class="lab">Düğme yazısı<input class="inp" name="dugme" value="${esc(b.dugme || 'Alışverişe Başla')}"></label><label class="lab">Bağlantı (HasTürk)<input class="inp" name="link" value="${esc(b.link || c.A.magaza_url || '')}"></label>
<label class="lab" style="grid-column:1/-1">Görsel adresi<input class="inp" name="gorsel" value="${esc(b.gorsel || '')}" list="fotolar" placeholder="/blog-statik/foto/… ya da https://…"></label>
<label class="lab">Başlangıç<input class="inp" type="datetime-local" name="bas" value="${yerelGiris(b.bas_ts)}"></label><label class="lab">Bitiş<input class="inp" type="datetime-local" name="bit" value="${yerelGiris(b.bit_ts)}"></label></div>
<div class="row" style="margin-top:6px"><span class="st">${b.id ? `Gösterim <b>${binlik(b.gosterim)}</b> · Tıklama <b>${binlik(b.tik)}</b>${b.gosterim ? ` · TO %${(b.tik / b.gosterim * 100).toFixed(1)}` : ''}${b.bit_ts && b.bit_ts < now ? ' · <b style="color:#d8343f">süresi doldu</b>' : ''}` : 'Yeni banner'}</span><span style="display:flex;gap:6px;align-items:center">${tgl('aktif', b.id ? b.aktif : 1, 'Aktif')}<button class="btn btn-g btn-s">${b.id ? 'Kaydet' : 'Ekle'}</button>${b.id ? `<button class="btn btn-r btn-s" name="sil" value="1" data-onay="Banner silinsin mi?">Sil</button>` : ''}</span></div></div></form>`;
  const govde = `<datalist id="fotolar">${FOTOLAR.map((f) => `<option value="${f}">`).join('')}</datalist>
<div class="kpis k4">${kpi('i-image', 'c-g', 'Aktif Banner', bn.results.filter((b) => b.aktif && (!b.bit_ts || b.bit_ts >= now)).length, Object.keys(ALANLAR).length + ' alan')}${kpi('i-eye', 'c-b', 'Banner Gösterimi', binlik(bn.results.reduce((a, b) => a + b.gosterim, 0)), 'toplam')}${kpi('i-ext', 'c-o', 'Banner Tıklama', binlik(bn.results.reduce((a, b) => a + b.tik, 0)), 'toplam')}${kpi('i-cart', 'c-t', 'Ürün Linki Tıklama', binlik(ist.n || 0), 'son 30 gün')}</div>
<div class="g g-12"><div style="display:grid;gap:16px;align-content:start">
<form class="card" method="post" action="${P(c, '/bolumler')}"><div class="hd"><h3>Ana Sayfa Bölümleri</h3></div>
<div class="mod"><span class="hdl"></span><span class="ic c-g">${IK('i-image')}</span><div><b>Vitrin (kaydırmalı alan)</b><small>Her hafta en çok okunan ve aranan 7 yazı kendiliğinden seçilir · elle seçilen: ${one.results.length}</small></div><span></span><span class="tag">sabit</span></div>
<div class="mod"><span class="hdl"></span><span class="ic c-b">${IK('i-grid')}</span><div><b>Kategoriler</b><small>${c.kat.filter((k) => k.vitrin).length} kutu · <a href="${P(c, '/kategoriler')}">düzenle</a></small></div><span></span><span class="tag">sabit</span></div>
<div class="mod"><span class="hdl"></span><span class="ic c-y">${IK('i-star')}</span><div><b>Son Yazılar</b><small>En yeni 6 yazı</small></div><span></span><span class="tag">sabit</span></div>
${BOLUMLER.map(([k, a]) => `<div class="mod"><span class="hdl"></span><span class="ic c-o">${IK(k === 'gundem' ? 'i-news' : k === 'ay' ? 'i-cal' : k === 'ipucu' ? 'i-bulb' : k === 'bulten' ? 'i-mail' : 'i-chat')}</span><div><b>${a}</b></div><span></span>${tgl('b_' + k, c.A['bolum_' + k] !== '0', a)}</div>`).join('')}
<button class="btn btn-g btn-s" style="margin-top:12px">Kaydet</button></form>
<div class="card"><div class="hd"><h3>Vitrindeki Yazılar</h3></div><div class="list">${one.results.map((y) => `<a class="li" href="${P(c, '/yazi/' + y.id)}"><img class="th" src="${esc(y.gorsel)}" alt=""><div class="tx"><b>${esc(y.baslik)}</b></div></a>`).join('') || '<p class="muted" style="font-size:13px">Vitrin boşsa son yazılar gösterilir.</p>'}</div></div>
</div>
<div class="card"><div class="hd"><h3>Banner Alanları</h3><span class="muted" style="font-size:12px">Kendi görselleriniz · yalnız HasTürk'e bağlantı</span></div>
<div class="g g2">${bn.results.map(bForm).join('')}${bForm({})}</div></div></div>
<form class="card mt" method="post" action="${P(c, '/one-urunler')}"><div class="hd" style="flex-wrap:wrap"><h3 style="flex-wrap:wrap">Öne Çıkan Ürünler <span class="tag">en çok satan verisi yoksa ana sayfada bunlar gösterilir</span></h3><label class="fin" style="max-width:260px;min-width:0">${IK('i-search')}<input id="urunq" placeholder="Mağazada ürün ara…" autocomplete="off"></label></div>
<div class="sug" id="urunsonuc"></div>
<input type="hidden" name="urunler" id="urunler" value="${esc(secili.join(', '))}">
<div class="pp" id="secili" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${sec.map((p) => `<div class="on" data-s="${esc(p.s)}"><img src="${gorselUrl(U, p.img, 180)}" alt=""><b>${esc(p.n)}</b><span>${binlik(p.p)} TL</span><button type="button" class="lnk" data-urunsil="${esc(p.s)}">Kaldır</button></div>`).join('')}</div>
<p class="muted" style="font-size:12px;margin-top:10px">İlk 3 ürün gösterilir; stokta olmayan ürün otomatik atlanır ve yerine çok satanlardan biri gelir.</p><button class="btn btn-g btn-s" style="margin-top:8px">Kaydet</button></form>`;
  return pSayfa(c, { baslik: 'Ana Sayfa, Ürün & Banner Yönetimi', alt: 'Banner alanlarına kendi görsellerinizi yerleştirin, öne çıkan ürünleri seçin.', aktif: 'anasayfa', govde });
}
async function bannerKaydet(c, id) {
  if (!yetkili(c.uye, 'anasayfa')) return yetkiYok(c);
  const f = await formOku(c.req);
  if (f.sil && +id) await c.db.prepare('DELETE FROM b_banner WHERE id = ?').bind(+id).run();
  else {
    const link = /^(https?:\/\/|\/)/.test(f.link || '') ? f.link : c.A.magaza_url;
    const v = [ALANLAR[f.alan] ? f.alan : 'B3', f.ad || '', f.baslik || '', f.alt || '', f.dugme || '', link, f.gorsel || '', f.aktif ? 1 : 0, yereldenTs(f.bas) || null, yereldenTs(f.bit) || null];
    if (+id) await c.db.prepare('UPDATE b_banner SET alan=?, ad=?, baslik=?, alt=?, dugme=?, link=?, gorsel=?, aktif=?, bas_ts=?, bit_ts=? WHERE id=?').bind(...v, +id).run();
    else await c.db.prepare('INSERT INTO b_banner (alan, ad, baslik, alt, dugme, link, gorsel, aktif, bas_ts, bit_ts) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(...v).run();
  }
  return yonlendir(P(c, '/anasayfa?m=kaydedildi'));
}
async function oneUrunKaydet(c) {
  if (!yetkili(c.uye, 'anasayfa')) return yetkiYok(c);
  const f = await formOku(c.req);
  await ayarYaz(c.db, 'one_urunler', String(f.urunler || '').split(/[\s,]+/).filter((x) => /^[a-z0-9-]+$/.test(x)).slice(0, 12));
  return yonlendir(P(c, '/anasayfa?m=kaydedildi'));
}
async function bolumKaydet(c) {
  if (!yetkili(c.uye, 'anasayfa')) return yetkiYok(c);
  const f = await formOku(c.req);
  for (const [k] of BOLUMLER) await ayarYaz(c.db, 'bolum_' + k, f['b_' + k] ? '1' : '0');
  return yonlendir(P(c, '/anasayfa?m=kaydedildi'));
}

// ---------- Kullanıcılar ----------
async function uyeler(c) {
  if (!yetkili(c.uye, 'kullanici')) return yetkiYok(c);
  const q = (c.url.searchParams.get('q') || '').trim(), rol = c.url.searchParams.get('rol') || '';
  const w = ['1=1'], b = [];
  if (q) { w.push('(ad LIKE ? OR eposta LIKE ?)'); b.push('%' + q + '%', '%' + q + '%'); }
  if (rol === 'ekip') w.push("rol != 'uye'"); else if (rol === 'engelli') w.push("durum != 'aktif'"); else if (rol) { w.push('rol = ?'); b.push(rol); }
  const [list, say_] = await Promise.all([
    c.db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM b_soru WHERE uye_id = u.id) ns, (SELECT COUNT(*) FROM b_cevap WHERE uye_id = u.id) nc, (SELECT COUNT(*) FROM b_yorum WHERE uye_id = u.id) ny FROM b_uye u WHERE ${w.join(' AND ')} ORDER BY (rol != 'uye') DESC, olus_ts DESC LIMIT 100`).bind(...b).all(),
    c.db.prepare(`SELECT COUNT(*) top, SUM(CASE WHEN rol != 'uye' THEN 1 ELSE 0 END) ekip, SUM(CASE WHEN durum != 'aktif' THEN 1 ELSE 0 END) eng, SUM(CASE WHEN onayli >= ? THEN 1 ELSE 0 END) guv FROM b_uye`).bind(+c.A.guvenilir_esik || 20).first(),
  ]);
  const tab = (k, ad, n) => `<a href="${P(c, '/uyeler')}${k ? '?rol=' + k : ''}"${rol === k ? ' class="on"' : ''}>${ad} <i>${n || 0}</i></a>`;
  const govde = `<div class="kpis k4">${kpi('i-users', 'c-p', 'Toplam Kullanıcı', binlik(say_.top), '')}${kpi('i-shield', 'c-g', 'Güvenilir Üye', say_.guv || 0, `${esc(c.A.guvenilir_esik || 20)}+ onaylı paylaşım`)}${kpi('i-user', 'c-b', 'Ekip', say_.ekip || 0, 'panel yetkili')}${kpi('i-x2', 'c-r', 'Engellenen', say_.eng || 0, '')}</div>
<div class="g g-21"><div class="card"><div class="tabs">${tab('', 'Tümü', say_.top)}${tab('ekip', 'Ekip', say_.ekip)}${tab('uye', 'Üyeler', say_.top - say_.ekip)}${tab('engelli', 'Engellenen', say_.eng)}</div>
<form class="filters" method="get"><input type="hidden" name="rol" value="${esc(rol)}"><label class="fin">${IK('i-search')}<input name="q" value="${esc(q)}" placeholder="İsim ya da e-posta ara…"></label><button class="btn btn-o">Ara</button></form>
<div class="tw"><table><thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>Güven</th><th>Soru / Cevap / Yorum</th><th>Katılım</th><th></th></tr></thead><tbody>
${list.results.map((u) => { const g = guven(u, c.A); const ben = u.id === c.uye.id; return `<tr><td><div class="tt" style="min-width:190px"><span class="av" style="background:${renk(u.ad)}">${esc(bas(u.ad))}</span><div><b>${esc(u.ad)}</b><small>${esc(u.eposta)}</small>${u.rol !== 'uye' ? `<input class="inp" name="ad" form="u${u.id}" value="${esc(u.ad)}" minlength="2" maxlength="40" aria-label="Sitede görünen ad" title="Sitede görünen ad (ör. Ayşe Yılmaz · HasTürk)" style="margin-top:6px;padding:6px 8px;font-size:12.5px">` : ''}</div></div></td>
<td><form method="post" action="${P(c, '/uye/' + u.id)}" id="u${u.id}"><select class="sel" name="rol"${ben ? ' disabled' : ''}>${ROLLER.map((r) => `<option value="${r}"${u.rol === r ? ' selected' : ''}>${ROL_AD[r]}</option>`).join('')}</select></form></td>
<td><select class="sel" name="durum" form="u${u.id}"${ben ? ' disabled' : ''}><option value="aktif">Aktif</option><option value="engelli"${u.durum !== 'aktif' ? ' selected' : ''}>Engelli</option></select></td>
<td>${g ? `<span class="trust ${g.sinif}">${esc(g.ad)}</span>` : ''}</td><td>${u.ns} / ${u.nc} / ${u.ny}</td><td class="muted">${trTarih(u.olus_ts)}</td><td>${ben ? `<button class="btn btn-o btn-s" form="u${u.id}" title="Yalnız görünen ad kaydedilir">Kaydet</button> <span class="muted" style="font-size:12px">siz</span>` : `<button class="btn btn-o btn-s" form="u${u.id}">Kaydet</button>`}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Kullanıcı yok.</td></tr>'}
</tbody></table></div></div>
<div style="display:grid;gap:12px;align-content:start">
${[['yonetici', 'Tüm ayarlar, kullanıcılar ve roller.'], ['editor', 'Yazı yazar, yayınlar; ana sayfa, banner ve SEO; topluluk moderasyonu.'], ['moderator', 'Yorum ve soru onayı, ekip cevabı.'], ['yazar', 'Taslak yazar, incelemeye gönderir; yayınlayamaz.'], ['uye', 'Soru sorar, cevap ve yorum yazar.']].map(([r, a]) => `<div class="role"><div class="row"><b>${ROL_AD[r]}</b></div><small>${a}</small></div>`).join('')}
<p class="muted" style="font-size:12px">Ekibe birini eklemek için: kişi sitede ücretsiz üye olsun, sonra burada rolünü değiştirin.</p>
</div></div>`;
  return pSayfa(c, { baslik: 'Kullanıcılar, Roller & Yetkiler', alt: 'Üyeleri yönetin, ekip üyelerine rol verin.', aktif: 'uyeler', govde });
}
async function uyeKaydet(c, id) {
  if (!yetkili(c.uye, 'kullanici')) return yetkiYok(c);
  const f = await formOku(c.req);
  // Ekip hesaplarının sitede görünen adı (ör. cevaplarda gerçek çalışan adı) buradan değiştirilir
  const ad = String(f.ad || '').replace(/\s+/g, ' ').trim();
  if (ad.length >= 2 && ad.length <= 40) await c.db.prepare("UPDATE b_uye SET ad = ? WHERE id = ? AND rol != 'uye'").bind(ad, id).run();
  if (id === c.uye.id) return yonlendir(P(c, '/uyeler?m=kaydedildi'));
  const rol = ROLLER.includes(f.rol) ? f.rol : 'uye', durum = f.durum === 'engelli' ? 'engelli' : 'aktif';
  await c.db.prepare('UPDATE b_uye SET rol = ?, durum = ? WHERE id = ?').bind(rol, durum, id).run();
  if (durum !== 'aktif') await c.db.prepare('DELETE FROM b_oturum WHERE uye_id = ?').bind(id).run();
  return yonlendir(P(c, '/uyeler?m=kaydedildi'));
}

// ---------- SEO & ayarlar ----------
async function seo(c) {
  if (!yetkili(c.uye, 'seo')) return yetkiYok(c);
  const A = c.A, now = Date.now();
  const [yz, bul, ar] = await Promise.all([
    c.db.prepare(`SELECT id, slug, baslik, ozet, seo_aciklama, seo_baslik, odak, govde, kisaca, gorsel, gorsel_alt, sss FROM b_yazi WHERE ${YAYINDA}`).bind(now).all(),
    c.db.prepare('SELECT COUNT(*) n FROM b_bulten').first(),
    c.db.prepare("SELECT x, SUM(n) n FROM b_istat WHERE k = 'arama' AND d >= ? GROUP BY x ORDER BY n DESC LIMIT 10").bind(gun(now - 29 * 86400000)).all(),
  ]);
  const odaklar = yz.results.map((y) => odakNorm(y.odak));
  const puanlar = yz.results.map((y, i) => ({ y, p: seoPuan(y, odaklar.filter((_, j) => j !== i)) }));
  const ort = puanlar.length ? Math.round(puanlar.reduce((a, x) => a + x.p, 0) / puanlar.length) : 0;
  const zayif = puanlar.filter((x) => x.p < 70).sort((a, b) => a.p - b.p).slice(0, 6);
  const canli = A.yayin === 'canli';
  const ta = (k, ad, rows = 4, not = '') => `<label class="lab">${ad}${not ? ` <em>${not}</em>` : ''}<textarea class="inp" name="${k}" rows="${rows}">${esc(Array.isArray(A[k]) ? A[k].join('\n') : A[k] || '')}</textarea></label>`;
  const inp = (k, ad, ph = '', not = '') => `<label class="lab">${ad}${not ? ` <em>${not}</em>` : ''}<input class="inp" name="${k}" value="${esc(A[k] || '')}" placeholder="${esc(ph)}"></label>`;
  const govde = `<div class="g g3"><div class="card" style="display:flex;gap:16px;align-items:center">${ring(ort).replace('class="ring"', 'class="ring lg"').replace(`<span>${ort}</span>`, `<span>${ort}<small>/100</small></span>`)}<div><h3 style="font-size:15px">Ortalama SEO Puanı</h3><p class="muted" style="font-size:12.5px;margin:3px 0 8px">${puanlar.length} yayındaki yazı · ${zayif.length} yazı 70 altında</p></div></div>
<div class="card"><div class="hd" style="margin-bottom:8px"><h3>Yayın Durumu</h3>${canli ? '<span class="pill c-g">Canlı</span>' : '<span class="pill c-o">Kurulum</span>'}</div><p class="muted" style="font-size:12.5px">${canli ? `Arama motorlarına açık (${esc(A.site_url)}).` : 'Arama motorlarına kapalı. Alan adı bağlanıp içerik hazır olunca “Canlı” yapın.'}</p></div>
<div class="card"><div class="hd" style="margin-bottom:8px"><h3>Bülten Aboneleri</h3><b style="font-size:20px">${binlik(bul.n)}</b></div>${yetkili(c.uye, 'ayar') && bul.n ? `<a class="lnk" href="${P(c, '/bulten.csv')}">Listeyi indir (CSV)</a>` : '<p class="muted" style="font-size:12px">E-posta gönderimi sonraki aşamada bağlanacak.</p>'}</div></div>
<div class="g g2 mt"><div class="card"><div class="hd"><h3>Geliştirilecek Yazılar</h3></div><div class="list">${zayif.map(({ y, p }) => `<a class="li" href="${P(c, '/yazi/' + y.id)}">${ring(p)}<div class="tx"><b>${esc(y.baslik)}</b><small>${!y.odak ? 'odak kelime yok · ' : ''}${(y.seo_aciklama || y.ozet || '').length < 120 ? 'meta açıklaması kısa · ' : ''}${!y.sss ? 'SSS yok · ' : ''}${duz(y.govde).split(/\s+/).length < 800 ? 'metin kısa' : ''}</small></div></a>`).join('') || '<p class="muted">Tüm yazılar 70 puan üzerinde. 👍</p>'}</div></div>
<div class="card"><div class="hd"><h3>Blogda en çok arananlar</h3><a href="${P(c, '/trafik?t=site')}">Arama raporu</a></div>${ar.results.length ? `<div class="bars">${ar.results.map((r) => `<div class="bar" style="grid-template-columns:1fr auto"><div class="t"><b>${esc(r.x)}</b><i style="--w:${Math.round(r.n / ar.results[0].n * 100)}%"></i></div><span>${r.n}</span></div>`).join('')}</div>` : '<p class="muted" style="font-size:13px">Ziyaretçiler blogda arama yaptıkça burada görünecek.</p>'}</div></div>
<div class="g g2 mt"><div class="card"><div class="hd"><h3>Yapısal Veri (Schema)</h3><span class="pill c-g">Otomatik</span></div><div class="sch">
<div>${IK('i-doc', 'color:var(--green)')}Yazı <code>BlogPosting</code> · Gündem <code>NewsArticle</code></div><div>${IK('i-chat', 'color:var(--green)')}Sık sorulan sorular <code>FAQPage</code></div><div>${IK('i-users', 'color:var(--green)')}Soru-Cevap <code>QAPage</code> (cevaplı sorular)</div><div>${IK('i-right', 'color:var(--green)')}Sayfa yolu <code>BreadcrumbList</code></div><div>${IK('i-home', 'color:var(--green)')}Kurum <code>Organization</code> → HasTürk Gübre</div><div>${IK('i-search', 'color:var(--green)')}Site içi arama <code>WebSite</code></div></div></div>
<div class="card"><div class="hd"><h3>Site Haritası, Robots &amp; Yapay Zekâ Dosyaları</h3></div><div class="sch">
<div>${IK('i-check', 'color:var(--green)')}<a href="${c.base}/sitemap.xml" target="_blank">sitemap.xml</a><code>${puanlar.length} yazı + cevaplı sorular</code></div>
<div>${IK('i-check', 'color:var(--green)')}<a href="${c.base}/robots.txt" target="_blank">robots.txt</a><code>${canli ? 'açık' : 'kurulum: kapalı'}</code></div>
<div>${IK('i-check', 'color:var(--green)')}<a href="${c.base}/llms.txt" target="_blank">llms.txt</a><code>yapay zekâ asistanları için site özeti</code></div>
<div>${IK('i-check', 'color:var(--green)')}<a href="${c.base}/feed.xml" target="_blank">RSS</a><code>son 30 yazı</code></div></div></div></div>
<form class="mt" method="post" action="${P(c, '/ayarlar')}" id="ayarlar">
<div class="ayar-nav"><div class="seg" role="tablist" data-ayar>${[['genel', 'Genel'], ['sosyal', 'Sosyal medya'], ['yazar', 'Yazarlar'], ['yasal', 'Yasal metinler']].map(([k, a], i) => `<button type="button" role="tab" data-b="${k}"${i ? '' : ' class="on" aria-selected="true"'}>${a}</button>`).join('')}</div>${yetkili(c.uye, 'ayar') ? '<button class="btn btn-g">Ayarları Kaydet</button>' : '<span class="muted" style="font-size:12px">Değiştirmek için yönetici yetkisi gerekir</span>'}</div>
<div class="card ayar-bol on" data-bol="genel"><div class="hd"><h3>Genel ayarlar</h3><span class="sub">yayın modu, adresler, ölçüm ve sayfa metinleri</span></div>
<div class="g g2" style="gap:14px">
<label class="lab">Yayın modu<select class="sel" name="yayin" style="display:block;width:100%;margin-top:5px"><option value="kurulum">Kurulum (arama motorlarına kapalı)</option><option value="canli"${canli ? ' selected' : ''}>Canlı (arama motorlarına açık)</option></select></label>
${inp('site_url', 'Blog adresi', 'https://blog.hasturkgubre.com.tr', 'canonical ve site haritası')}${inp('magaza_url', 'Mağaza adresi', 'https://hasturkgubre.com.tr')}${inp('site_adi', 'Site adı')}${inp('slogan', 'Slogan')}
${inp('ga4', 'Google Analytics 4 ölçüm kimliği', 'G-XXXXXXX')}${inp('gsc_dogrulama', 'Search Console doğrulama kodu', 'meta etiketindeki content değeri')}
${ta('ipuclari', 'Günün bitki ipuçları', 5, 'her satır bir ipucu')}
${ta('kurallar', 'Topluluk kuralları', 5, 'her satır bir kural')}
${ta('hakkimizda', 'Hakkımızda metni', 6)}
</div></div>
<div class="card ayar-bol" data-bol="sosyal"><div class="hd"><h3>Sosyal medya hesapları</h3></div>
<p class="muted" style="font-size:12.5px;margin:-6px 0 14px">Site altında simge olarak görünür. Hesabın tam adresini (https:// ile) yazın; boş bırakılan hesap gösterilmez.</p>
<div class="g g2" style="gap:14px">${SOSYAL.map((s) => inp('sosyal_' + s.k, s.ad, 'https://…')).join('')}</div></div>
<div class="card ayar-bol" data-bol="yazar"><div class="hd"><h3>Yazarlar</h3><span class="sub">yazar sayfası, yazı altındaki yazar kutusu ve Google için Person bilgisi</span></div>
<p class="muted" style="font-size:12.5px;margin:-6px 0 14px">Gerçek ve doğrulanabilir bilgi yazın: unvan, kısa biyografi (deneyim, ilgi alanı) ve kişinin kendi LinkedIn profili. Biyografi boşsa yazarın yazdığı kategorilerden kısa bir tanıtım gösterilir.</p>
<div class="g g2" style="gap:14px">${YAZAR_LISTE.map((y) => `<div class="card" style="padding:12px"><b style="font-size:13.5px">${esc(y.ad)}</b> <a class="lnk" href="${c.base}/yazar/${y.slug}" target="_blank" style="font-size:12px">sayfayı aç</a><div class="g" style="gap:8px;margin-top:8px">${inp('yazar_' + y.slug + '_unvan', 'Unvan', 'HasTürk Gübre Ekibi')}${inp('yazar_' + y.slug + '_linkedin', 'LinkedIn', y.linkedin || 'https://www.linkedin.com/in/…', y.linkedin ? 'boşsa kayıtlı profil kullanılır' : '')}${inp('yazar_' + y.slug + '_instagram', 'Instagram', y.instagram || 'https://www.instagram.com/…', y.instagram ? 'boşsa kayıtlı profil kullanılır' : '')}${inp('yazar_' + y.slug + '_web', 'Diğer profil / web', 'https://…')}${ta('yazar_' + y.slug + '_bio', 'Kısa biyografi', 3, 'en fazla 600 karakter')}</div></div>`).join('')}</div></div>
<div class="card ayar-bol" data-bol="yasal"><div class="hd"><h3>Yasal metinler ve şirket bilgileri</h3></div>
<p class="muted" style="font-size:12.5px;margin:-6px 0 14px">Şirket bilgileri sözleşmelerdeki {unvan}, {adres}, {eposta}, {telefon}, {kep}, {mersis} yer tutucularına yazılır; boş bırakılan bilgi sayfada gösterilmez. Metinleri yayından önce bir hukukçuya kontrol ettirmenizi öneririz.</p>
<div class="g g2" style="gap:14px">
${inp('sirket_unvan', 'Ticari unvan', 'ör. HasTürk Gübre Tarım San. ve Tic. Ltd. Şti.', 'veri sorumlusu')}${inp('sirket_adres', 'Açık adres', 'Mahalle, cadde, no, ilçe / il')}
${inp('iletisim_eposta', 'İletişim / KVKK e-postası', 'ör. kvkk@hasturkgubre.com.tr')}${inp('iletisim_tel', 'Telefon', 'ör. 0 (xxx) xxx xx xx')}
${inp('sirket_kep', 'KEP adresi', 'varsa')}${inp('sirket_mersis', 'MERSİS numarası', 'varsa')}
${inp('hukuk_tarih', 'Son güncelleme tarihi', 'YYYY-AA-GG', 'metni değiştirince güncelleyin')}<span></span>
${ta('sozlesme', 'Üyelik ve kullanım sözleşmesi', 10, '## başlık, - madde, | tablo | kullanılabilir')}${ta('kvkk', 'KVKK aydınlatma metni', 10)}
${ta('cerez', 'Çerez politikası', 8)}
</div></div>
</form>`;
  return pSayfa(c, { baslik: 'SEO & Site Ayarları', alt: 'SEO sağlığı, yapısal veri, site ayarları ve yasal metinler.', aktif: 'seo', govde, acts: `<a class="btn btn-o" href="${P(c, '/trafik')}">${IK('i-chart')}Arama & Trafik</a>` });
}
async function ayarKaydet(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c, '/seo'));
  const f = await formOku(c.req);
  const sat = (k) => String(f[k] || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const url = (v, d) => /^https:\/\/[a-z0-9.-]+(\/[^\s]*)?$/i.test(String(v || '').trim()) ? String(v).trim().replace(/\/$/, '') : d;
  await ayarYaz(c.db, 'yayin', f.yayin === 'canli' ? 'canli' : 'kurulum');
  await ayarYaz(c.db, 'site_url', url(f.site_url, c.A.site_url));
  await ayarYaz(c.db, 'magaza_url', url(f.magaza_url, c.A.magaza_url));
  for (const k of ['site_adi', 'slogan']) if (String(f[k] || '').trim()) await ayarYaz(c.db, k, String(f[k]).trim().slice(0, 80));
  await ayarYaz(c.db, 'ga4', /^G-[A-Z0-9]{4,15}$/i.test(String(f.ga4 || '').trim()) ? String(f.ga4).trim().toUpperCase() : '');
  await ayarYaz(c.db, 'gsc_dogrulama', String(f.gsc_dogrulama || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100));
  for (const s of SOSYAL) await ayarYaz(c.db, 'sosyal_' + s.k, url(f['sosyal_' + s.k], ''));
  for (const y of YAZAR_LISTE) {
    const k = 'yazar_' + y.slug + '_';
    await ayarYaz(c.db, k + 'unvan', String(f[k + 'unvan'] || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 80));
    await ayarYaz(c.db, k + 'linkedin', /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s"<>]+$/i.test(String(f[k + 'linkedin'] || '').trim()) ? String(f[k + 'linkedin']).trim().replace(/[?#].*$/, '') : '');
    await ayarYaz(c.db, k + 'instagram', /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?(\?.*)?$/i.test(String(f[k + 'instagram'] || '').trim()) ? String(f[k + 'instagram']).trim().replace(/[?#].*$/, '').replace(/\/$/, '') : '');
    await ayarYaz(c.db, k + 'web', url(f[k + 'web'], ''));
    await ayarYaz(c.db, k + 'bio', String(f[k + 'bio'] || '').replace(/\s+/g, ' ').trim().slice(0, 600));
  }
  await ayarYaz(c.db, 'ipuclari', sat('ipuclari'));
  for (const k of ['kurallar', 'hakkimizda', 'kvkk', 'sozlesme', 'cerez']) await ayarYaz(c.db, k, String(f[k] || '').slice(0, 20000));
  for (const k of ['sirket_unvan', 'sirket_adres', 'iletisim_eposta', 'iletisim_tel', 'sirket_kep', 'sirket_mersis']) await ayarYaz(c.db, k, String(f[k] || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300));
  await ayarYaz(c.db, 'hukuk_tarih', /^\d{4}-\d{2}-\d{2}$/.test(String(f.hukuk_tarih || '').trim()) ? String(f.hukuk_tarih).trim() : c.A.hukuk_tarih || '');
  return yonlendir(P(c, '/seo?m=kaydedildi'));
}
// ---------- E-posta bildirimleri ----------
async function eposta(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c);
  const A = { ...MAIL_VARSAYILAN, ...c.A };
  const kk = { smtp: await kimlik(c.env, A, 'smtp'), api: await kimlik(c.env, A, 'api') };
  const anahtarVar = String(c.env.AK_PANEL_KEY || '').length >= 8;
  const durum = (k) => ({ panel: '<span class="pill c-g">Kayıtlı (şifreli)</span>', cloudflare: '<span class="pill c-g">Cloudflare\'de tanımlı</span>', cozulemedi: '<span class="pill c-r">Yeniden girin</span>' })[k.kaynak] || '<span class="pill c-r">Girilmedi</span>';
  const sifreAlan = (tur, ad) => `<label class="lab">${ad} ${durum(kk[tur])}<input class="inp" type="password" name="${GIZLI_AYAR[tur]}" value="" autocomplete="new-password" placeholder="${kk[tur].kaynak === 'panel' ? 'Değiştirmek için yeni şifreyi yazın' : 'Şifreyi buraya yazın'}"${anahtarVar ? '' : ' disabled'}>${kk[tur].kaynak === 'panel' ? `<span style="display:flex;gap:6px;align-items:center;margin-top:6px;font-size:12.5px;font-weight:400"><input type="checkbox" name="${GIZLI_AYAR[tur]}_sil" value="1"> Kayıtlı şifreyi sil</span>` : ''}</label>`;
  const son = (await c.db.prepare('SELECT m.*, u.ad FROM b_mail m LEFT JOIN b_uye u ON u.id = m.uye_id ORDER BY m.id DESC LIMIT 15').all()).results;
  const inp = (k, ad, ph = '', tip = 'text') => `<label class="lab">${ad}<input class="inp" type="${tip}" name="${k}" value="${esc(A[k] || '')}" placeholder="${esc(ph)}"></label>`;
  const sablon = (t) => `<div class="card mt"><div class="hd"><h3>${esc(MAIL_TURLER[t])}</h3></div><div class="g" style="gap:12px">${inp(`mail_${t}_konu`, 'Konu')}<label class="lab">Metin <em>{ad}, {soru}, {cevaplayan}, {cevap} kullanılabilir</em><textarea class="inp" name="mail_${t}_metin" rows="7">${esc(A[`mail_${t}_metin`] || '')}</textarea></label>${inp(`mail_${t}_dugme`, 'Düğme yazısı')}</div></div>`;
  const govde = `<form method="post" action="${P(c, '/eposta')}">
<div class="card"><div class="hd"><h3>Gönderim ayarları</h3><button class="btn btn-g btn-s">Kaydet</button></div>
<div class="g g2" style="gap:14px">
<label class="lab">Bildirimler<select class="sel" name="mail_aktif" style="display:block;width:100%;margin-top:5px"><option value="0">Kapalı</option><option value="1"${A.mail_aktif === '1' ? ' selected' : ''}>Açık</option></select></label>
<label class="lab">Gönderim servisi<select class="sel" name="mail_saglayici" style="display:block;width:100%;margin-top:5px"><option value="smtp">SMTP (kendi e-posta hesabınız, ör. Turhost)</option><option value="resend"${A.mail_saglayici === 'resend' ? ' selected' : ''}>Resend</option><option value="brevo"${A.mail_saglayici === 'brevo' ? ' selected' : ''}>Brevo</option></select></label>
${inp('smtp_sunucu', 'SMTP sunucusu (giden)', 'srvc28.trwww.com')}${inp('smtp_port', 'SMTP portu', '465')}
${inp('smtp_kullanici', 'SMTP kullanıcı adı', 'noreply@hasturkgubre.com.tr')}
${inp('mail_gonderen_ad', 'Gönderen adı', 'HasTürk Blog')}${inp('mail_gonderen', 'Gönderen adresi', 'bilgi@blog.hasturkgubre.com.tr', 'email')}
${inp('mail_yanit', 'Yanıt adresi (isteğe bağlı)', 'destek@hasturkgubre.com.tr', 'email')}
${sifreAlan('smtp', 'SMTP şifresi (e-posta hesabının şifresi)')}${sifreAlan('api', 'Resend / Brevo API anahtarı')}
</div>
<p class="muted" style="font-size:12.5px;margin-top:12px">${anahtarVar ? 'Şifreler şifrelenerek saklanır ve bu ekranda bir daha gösterilmez; boş bırakırsanız kayıtlı şifre değişmez. ' : 'Şifre kaydı için Cloudflare\'de AK_PANEL_KEY tanımlı olmalıdır. '}Gönderen adresinin alan adı seçtiğiniz serviste doğrulanmış olmalıdır (servis size eklemeniz gereken DNS kayıtlarını verir). Ekip hesaplarına ve bildirimi kapatan üyelere e-posta gönderilmez.</p></div>
${Object.keys(MAIL_TURLER).map(sablon).join('')}
</form>
<form class="card mt" method="post" action="${P(c, '/eposta-test')}"><div class="hd"><h3>Deneme gönderimi</h3></div><div class="row" style="gap:10px;flex-wrap:wrap"><input class="inp" type="email" name="alici" required placeholder="deneme@ornek.com" style="max-width:320px"><select class="sel" name="tur">${Object.entries(MAIL_TURLER).map(([k, a]) => `<option value="${k}">${esc(a)}</option>`).join('')}</select><button class="btn btn-o">Gönder</button></div></form>
<div class="card mt"><div class="hd"><h3>Son gönderimler</h3></div><div class="tw"><table><thead><tr><th>Zaman</th><th>Tür</th><th>Üye</th><th>Durum</th></tr></thead><tbody>${son.map((m) => `<tr><td class="muted">${trTarihSaat(m.ts)}</td><td>${esc(MAIL_TURLER[m.tur] || m.tur)}</td><td>${esc(m.ad || '—')}</td><td>${m.ok ? '<span class="pill c-g">Gönderildi</span>' : `<span class="pill c-r" title="${esc(m.hata || '')}">Hata</span> <small class="muted">${esc(String(m.hata || '').slice(0, 80))}</small>`}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Henüz gönderim yok.</td></tr>'}</tbody></table></div></div>`;
  return pSayfa(c, { baslik: 'E-posta Bildirimleri', alt: 'Hoş geldin, sorunuz yayınlandı ve sorunuza cevap geldi e-postaları.', aktif: 'eposta', govde });
}
async function epostaKaydet(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c, '/eposta'));
  const f = await formOku(c.req);
  const ep = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()) ? String(v).trim() : '');
  await ayarYaz(c.db, 'mail_aktif', f.mail_aktif === '1' ? '1' : '0');
  await ayarYaz(c.db, 'mail_saglayici', ['brevo', 'resend'].includes(f.mail_saglayici) ? f.mail_saglayici : 'smtp');
  await ayarYaz(c.db, 'smtp_sunucu', String(f.smtp_sunucu || '').trim().replace(/[^a-z0-9.-]/gi, '').slice(0, 120));
  await ayarYaz(c.db, 'smtp_port', String(parseInt(f.smtp_port, 10) || 465));
  await ayarYaz(c.db, 'smtp_kullanici', ep(f.smtp_kullanici));
  await ayarYaz(c.db, 'mail_gonderen_ad', String(f.mail_gonderen_ad || '').trim().slice(0, 60) || 'HasTürk Blog');
  await ayarYaz(c.db, 'mail_gonderen', ep(f.mail_gonderen));
  await ayarYaz(c.db, 'mail_yanit', ep(f.mail_yanit));
  for (const k of Object.values(GIZLI_AYAR)) {
    const yeni = String(f[k] || '');
    if (f[k + '_sil'] === '1') await ayarYaz(c.db, k, '');
    else if (yeni && yeni.length <= 500) { const s = await gizliSifrele(c.env, yeni); if (s) await ayarYaz(c.db, k, s); }
  }
  for (const t of Object.keys(MAIL_TURLER)) for (const k of ['konu', 'metin', 'dugme']) {
    const v = String(f[`mail_${t}_${k}`] || '').trim();
    await ayarYaz(c.db, `mail_${t}_${k}`, v ? v.slice(0, k === 'metin' ? 4000 : 160) : MAIL_VARSAYILAN[`mail_${t}_${k}`]);
  }
  return yonlendir(P(c, '/eposta?m=kaydedildi'));
}
async function epostaTest(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c, P(c, '/eposta'));
  const f = await formOku(c.req);
  const A = { ...MAIL_VARSAYILAN, ...c.A, mail_aktif: '1' };
  const t = MAIL_TURLER[f.tur] ? f.tur : 'hosgeldin';
  const v = { ad: 'Deneme Üye', soru: 'Limon ağacımın yaprakları neden sararıyor?', cevaplayan: 'HasTürk Ekibi', cevap: 'Bu bir deneme cevabıdır.' };
  const d = (x) => String(A[`mail_${t}_${x}`] || '').replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
  const r = await gonder(c.env, A, { alici: String(f.alici || '').trim(), konu: '[Deneme] ' + d('konu'), metin: d('metin'), baglanti: String(c.A.site_url || ''), dugme: d('dugme') });
  await c.db.prepare('INSERT INTO b_mail (ts, tur, uye_id, ok, hata) VALUES (?, ?, NULL, ?, ?)').bind(Date.now(), t, r.ok ? 1 : 0, r.ok ? null : r.hata).run();
  return yonlendir(P(c, '/eposta?m=' + (r.ok ? 'gonderildi' : 'hata')));
}
async function bultenCsv(c) {
  if (!yetkili(c.uye, 'ayar')) return yetkiYok(c);
  const r = await c.db.prepare('SELECT eposta, ts FROM b_bulten ORDER BY ts').all();
  const csv = 'eposta,tarih\n' + r.results.map((x) => `${x.eposta.replace(/[",\n]/g, '')},${new Date(x.ts).toISOString().slice(0, 10)}`).join('\n');
  return new Response('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="bulten.csv"', 'Cache-Control': 'no-store' } });
}
export { kisaSayi };
