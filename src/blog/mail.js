// E-posta bildirimleri: hoş geldin, "sorunuz yayınlandı", "sorunuza cevap geldi".
// Gönderim SMTP (ör. Turhost e-posta hesabı, 465 SSL) ya da Resend/Brevo HTTP API ile yapılır. Ayarlar, şablonlar ve SMTP şifresi / API anahtarı
// panelden (E-posta bildirimleri) girilir. Şifre D1'de AES-GCM ile şifreli durur; anahtar Cloudflare'deki AK_PANEL_KEY'den türetilir, düz hâli
// depoya, kayıtlara ve panel ekranına hiç yazılmaz. Panelde şifre yoksa eski Cloudflare gizli değişkenleri (SMTP_PASS, MAIL_API_KEY) kullanılır.
import { connect } from 'cloudflare:sockets';
import { esc } from './ortak.js';

export const MAIL_VARSAYILAN = {
  mail_aktif: '0', mail_saglayici: 'smtp', mail_gonderen_ad: 'HasTürk Blog', mail_gonderen: '', mail_yanit: '',
  smtp_sunucu: '', smtp_port: '465', smtp_kullanici: '',
  mail_hosgeldin_konu: 'HasTürk Blog\'a hoş geldiniz, {ad}',
  mail_hosgeldin_metin: 'Merhaba {ad},\n\nHasTürk Blog topluluğuna katıldığınız için teşekkür ederiz. Artık yazılara yorum yazabilir, bitkinizle ilgili soru sorabilir ve diğer bahçe severlerin sorularını cevaplayabilirsiniz.\n\nSorunuzu sorarken bitkinin türünü, belirtileri, sulama sıklığını ve nerede durduğunu yazarsanız daha hızlı ve doğru cevap alırsınız.\n\nKeyifli okumalar,\nHasTürk Ekibi',
  mail_hosgeldin_dugme: 'Soru Sor',
  mail_soru_konu: 'Sorunuz yayınlandı: {soru}',
  mail_soru_metin: 'Merhaba {ad},\n\n“{soru}” başlıklı sorunuz yayınlandı. Bahçe severler ve HasTürk ekibi cevap yazdığında size e-postayla haber vereceğiz.\n\nİşe yarayan cevabı “Çözüm” olarak işaretlemeyi unutmayın; aynı sorunu yaşayan başka biri de doğru cevabı hemen bulsun.',
  mail_soru_dugme: 'Soruyu Görüntüle',
  mail_cevap_konu: 'Sorunuza yeni bir cevap geldi',
  mail_cevap_metin: 'Merhaba {ad},\n\n“{soru}” sorunuza {cevaplayan} cevap yazdı:\n\n{cevap}\n\nCevap işinize yaradıysa “Çözüm olarak işaretle” düğmesine basabilirsiniz.',
  mail_cevap_dugme: 'Cevabı Oku',
};

export const MAIL_TURLER = { hosgeldin: 'Hoş geldin', soru: 'Sorunuz yayınlandı', cevap: 'Sorunuza cevap geldi' };
const ayar = (A, k) => String(A[k] ?? MAIL_VARSAYILAN[k] ?? '');

// ---------- Panelden girilen şifrenin saklanması ----------
export const GIZLI_AYAR = { smtp: 'smtp_sifre_enc', api: 'mail_api_enc' };
const bayt64 = (u) => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
const baytCoz = (s) => Uint8Array.from(atob(s), (x) => x.charCodeAt(0));
async function gizliAnahtar(env) {
  const k = String(env.AK_PANEL_KEY || '');
  if (k.length < 8) return null;
  const enc = new TextEncoder();
  const ham = await crypto.subtle.importKey('raw', enc.encode(k), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('hasturk-blog-eposta'), info: enc.encode('v1') }, ham, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function gizliSifrele(env, duz) {
  const key = await gizliAnahtar(env);
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(duz))));
  return 'v1.' + bayt64(iv) + '.' + bayt64(ct);
}
export async function gizliCoz(env, v) {
  const m = /^v1\.([A-Za-z0-9+/=]+)\.([A-Za-z0-9+/=]+)$/.exec(String(v || ''));
  const key = m && (await gizliAnahtar(env));
  if (!key) return null;
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: baytCoz(m[1]) }, key, baytCoz(m[2]))); } catch { return null; }
}
// Gönderimde kullanılacak şifre/anahtar ve kaynağı: önce panel, yoksa Cloudflare gizli değişkeni
export async function kimlik(env, A, tur) {
  if (A[GIZLI_AYAR[tur]]) {
    const d = await gizliCoz(env, A[GIZLI_AYAR[tur]]);
    if (d) return { deger: d, kaynak: 'panel' };
  }
  const e = tur === 'smtp' ? env.SMTP_PASS : env.MAIL_API_KEY;
  return e ? { deger: e, kaynak: 'cloudflare' } : { deger: '', kaynak: A[GIZLI_AYAR[tur]] ? 'cozulemedi' : '' };
}
const doldur = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));

function htmlYap(A, metin, baglanti, dugme) {
  const site = String(A.site_url || 'https://blog.hasturkgubre.com.tr').replace(/\/$/, '');
  const p = esc(metin).split(/\n{2,}/).map((x) => `<p style="margin:0 0 14px;line-height:1.6">${x.replace(/\n/g, '<br>')}</p>`).join('');
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#f6f7f6;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border:1px solid #ececec;border-radius:14px;padding:28px 26px">
<img src="${site}/blog-statik/logo-eposta.png" alt="HasTürk Gübre" width="140" style="height:auto;margin-bottom:18px">
<div style="font-size:15px">${p}</div>
${baglanti ? `<p style="margin:22px 0 4px"><a href="${esc(baglanti)}" style="display:inline-block;background:#2e7d43;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">${esc(dugme || 'Siteye Git')}</a></p>` : ''}
</div><p style="font-size:12px;color:#71717a;line-height:1.5;margin:14px 6px">Bu e-postayı HasTürk Blog üyeliğiniz nedeniyle aldınız. Bildirim tercihlerinizi <a href="${site}/hesabim" style="color:#2e7d43">hesabınızdan</a> değiştirebilirsiniz.</p></div></body></html>`;
}

// UTF-8 metni base64'e çevirir (e-posta başlıkları ve gövdesi için)
function b64(s) { let b = ''; for (const x of new TextEncoder().encode(String(s))) b += String.fromCharCode(x); return btoa(b); }
const satirla = (s) => s.replace(/.{1,76}/g, '$&\r\n');
const baslikKodla = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

// SMTP ile gönderim: 465 doğrudan SSL, 587 STARTTLS; kimlik doğrulama AUTH LOGIN
async function smtpGonder(env, A, { gonderen, ad, yanit, alici, konu, html, text }, sifre) {
  const host = ayar(A, 'smtp_sunucu').trim(), port = parseInt(ayar(A, 'smtp_port'), 10) || 465, kullanici = ayar(A, 'smtp_kullanici').trim() || gonderen;
  if (!host) return { ok: false, hata: 'SMTP sunucusu yok' };
  if (!sifre) return { ok: false, hata: 'SMTP şifresi girilmemiş (panel › E-posta bildirimleri)' };
  const guvenlik = port === 465 ? 'on' : port === 587 ? 'starttls' : 'off';
  let sock = connect({ hostname: host, port }, { secureTransport: guvenlik, allowHalfOpen: false });
  let yazici = sock.writable.getWriter(), okuyucu = sock.readable.getReader(), tampon = '';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const yaz = (x) => yazici.write(enc.encode(x + '\r\n'));
  const oku = async () => {
    for (;;) {
      const s = tampon.split('\r\n');
      for (let i = 0; i < s.length - 1; i++) if (/^\d{3}( |$)/.test(s[i])) { tampon = s.slice(i + 1).join('\r\n'); return { kod: +s[i].slice(0, 3), metin: s.slice(0, i + 1).join(' ') }; }
      const { value, done } = await okuyucu.read();
      if (done) throw new Error('sunucu bağlantıyı kapattı');
      tampon += dec.decode(value, { stream: true });
    }
  };
  const komut = async (k, bek) => { if (k !== null) await yaz(k); const y = await oku(); if (!bek.includes(y.kod)) throw new Error(`SMTP ${y.kod} ${y.metin.slice(0, 140)}`); return y; };
  const sinir = 'hb' + crypto.randomUUID().replace(/-/g, '');
  const mesaj = [
    `From: ${baslikKodla(ad)} <${gonderen}>`, `To: <${alici}>`, ...(yanit ? [`Reply-To: <${yanit}>`] : []),
    `Subject: ${baslikKodla(konu)}`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomUUID()}@${gonderen.split('@')[1]}>`,
    'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${sinir}"`, '',
    `--${sinir}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', satirla(b64(text)),
    `--${sinir}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', satirla(b64(html)),
    `--${sinir}--`, '',
  ].join('\r\n');
  const is = (async () => {
    await komut(null, [220]);
    await komut('EHLO blog.hasturkgubre.com.tr', [250]);
    if (guvenlik === 'starttls') {
      await komut('STARTTLS', [220]);
      yazici.releaseLock(); okuyucu.releaseLock();
      sock = sock.startTls(); yazici = sock.writable.getWriter(); okuyucu = sock.readable.getReader(); tampon = '';
      await komut('EHLO blog.hasturkgubre.com.tr', [250]);
    }
    await komut('AUTH LOGIN', [334]);
    await komut(b64(kullanici), [334]);
    await komut(b64(sifre), [235]);
    await komut(`MAIL FROM:<${gonderen}>`, [250]);
    await komut(`RCPT TO:<${alici}>`, [250, 251]);
    await komut('DATA', [354]);
    await yazici.write(enc.encode(mesaj + '\r\n.\r\n'));
    await komut(null, [250]);
    await yaz('QUIT').catch(() => {});
  })();
  try {
    await Promise.race([is, new Promise((_, ret) => setTimeout(() => ret(new Error('zaman aşımı')), 20000))]);
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: String(e && e.message || e).slice(0, 200) };
  } finally {
    try { await sock.close(); } catch {}
  }
}

// Tek e-posta gönderir; sonuç { ok, hata }
export async function gonder(env, A, { alici, konu, metin, baglanti, dugme }) {
  if (ayar(A, 'mail_aktif') !== '1') return { ok: false, hata: 'kapalı' };
  const gonderen = ayar(A, 'mail_gonderen').trim(), ad = ayar(A, 'mail_gonderen_ad').trim() || 'HasTürk Blog', yanit = ayar(A, 'mail_yanit').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gonderen)) return { ok: false, hata: 'gönderen adresi yok' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(alici || ''))) return { ok: false, hata: 'alıcı adresi geçersiz' };
  const html = htmlYap(A, metin, baglanti, dugme), text = metin + (baglanti ? `\n\n${baglanti}` : '');
  if (ayar(A, 'mail_saglayici') === 'smtp') return smtpGonder(env, A, { gonderen, ad, yanit, alici, konu, html, text }, (await kimlik(env, A, 'smtp')).deger);
  const apiKey = (await kimlik(env, A, 'api')).deger;
  if (!apiKey) return { ok: false, hata: 'API anahtarı girilmemiş (panel › E-posta bildirimleri)' };
  const resend = ayar(A, 'mail_saglayici') !== 'brevo';
  const r = await fetch(resend ? 'https://api.resend.com/emails' : 'https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: resend ? { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' } : { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(resend
      ? { from: `${ad} <${gonderen}>`, to: [alici], subject: konu, html, text, ...(yanit ? { reply_to: yanit } : {}) }
      : { sender: { name: ad, email: gonderen }, to: [{ email: alici }], subject: konu, htmlContent: html, textContent: text, ...(yanit ? { replyTo: { email: yanit } } : {}) }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));
  return r.ok ? { ok: true } : { ok: false, hata: `HTTP ${r.status} ${String(await r.text()).slice(0, 160)}` };
}

// Üyeye bildirim: ekip/örnek hesaplarına ve bildirimi kapatanlara gönderilmez; arka planda çalışır, sonuç kayda geçer
export function bildir(c, tur, uyeId, veri = {}) {
  const is = (async () => {
    const u = await c.db.prepare('SELECT id, ad, eposta, bildirim FROM b_uye WHERE id = ?').bind(uyeId).first();
    if (!u || u.bildirim === 0 || /@hasturk\.blog$/i.test(u.eposta)) return;
    const site = String(c.A.site_url || '').replace(/\/$/, '');
    const v = { ad: u.ad, site: 'HasTürk Blog', ...veri };
    const baglanti = veri.baglanti || (tur === 'hosgeldin' ? site + '/soru-cevap/sor' : site);
    const r = await gonder(c.env, c.A, { alici: u.eposta, konu: doldur(ayar(c.A, `mail_${tur}_konu`), v), metin: doldur(ayar(c.A, `mail_${tur}_metin`), v), baglanti, dugme: ayar(c.A, `mail_${tur}_dugme`) });
    if (r.hata === 'kapalı') return;
    await c.db.prepare('INSERT INTO b_mail (ts, tur, uye_id, ok, hata) VALUES (?, ?, ?, ?, ?)').bind(Date.now(), tur, u.id, r.ok ? 1 : 0, r.hata || null).run();
  })().catch((e) => console.error('mail', tur, e && e.message));
  if (c.ctx && c.ctx.waitUntil) c.ctx.waitUntil(is);
  return is;
}

// Soru sayfasının tam adresi (e-postadaki bağlantı için)
export function soruTamUrl(c, s) {
  return String(c.A.site_url || '').replace(/\/$/, '') + '/soru-cevap/' + s.id + '-' + s.slug;
}
