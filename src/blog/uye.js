// Üyelik, oturum ve paylaşım onay kuralı.
// Onay kuralı (kullanıcının isteği): yeni hesabın ilk N paylaşımı (yorum/soru/cevap) elle onaylanır; yeterli onaylı
// paylaşımı olan hesap otomatik yayınlanır. Bağlantı içeren paylaşım her zaman beklemeye düşer. Reddedilen
// paylaşım hesabı yeniden "yeni" seviyesine indirir. (Kelime/spam filtresi sonraki aşamada.)
import { cerezler, rastgele, sha256, sifreOzet, esit } from './ortak.js';

export const ROLLER = ['uye', 'yazar', 'moderator', 'editor', 'yonetici'];
export const ROL_AD = { uye: 'Üye', yazar: 'Yazar', moderator: 'Moderatör', editor: 'Editör', yonetici: 'Yönetici' };
const SIRA = Object.fromEntries(ROLLER.map((r, i) => [r, i]));
export const YETKI = {
  panel: 'yazar', yazi: 'yazar', yayinla: 'editor', moderasyon: 'moderator', ekip_cevap: 'moderator',
  anasayfa: 'editor', seo: 'editor', kullanici: 'yonetici', ayar: 'yonetici',
};
export function yetkili(uye, is) { return !!uye && uye.durum === 'aktif' && SIRA[uye.rol] >= SIRA[YETKI[is] || 'yonetici']; }

const CEREZ = 'hb_s';
const OMUR = 30 * 86400 * 1000;

export async function uyeOku(req, db) {
  const t = cerezler(req)[CEREZ];
  if (!t || t.length < 20) return null;
  const id = await sha256(t);
  const r = await db.prepare('SELECT u.*, o.bitis FROM b_oturum o JOIN b_uye u ON u.id = o.uye_id WHERE o.id = ?').bind(id).first();
  if (!r || r.bitis < Date.now() || r.durum !== 'aktif') return null;
  delete r.sifre; delete r.tuz;
  r.oturum = id;
  return r;
}

export async function oturumAc(db, uyeId, yol = '/') {
  const t = rastgele(32), id = await sha256(t), now = Date.now();
  await db.batch([
    db.prepare('INSERT INTO b_oturum (id, uye_id, ts, bitis) VALUES (?, ?, ?, ?)').bind(id, uyeId, now, now + OMUR),
    db.prepare('UPDATE b_uye SET son_ts = ? WHERE id = ?').bind(now, uyeId),
    db.prepare('DELETE FROM b_oturum WHERE bitis < ?').bind(now),
  ]);
  return `${CEREZ}=${t}; Path=${yol}; Max-Age=${OMUR / 1000}; HttpOnly; Secure; SameSite=Lax`;
}
export async function oturumKapat(db, uye, yol = '/') {
  if (uye && uye.oturum) await db.prepare('DELETE FROM b_oturum WHERE id = ?').bind(uye.oturum).run();
  return `${CEREZ}=; Path=${yol}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function kayit(db, { ad, eposta, sifre }) {
  ad = String(ad || '').replace(/\s+/g, ' ').trim();
  eposta = String(eposta || '').trim().toLowerCase();
  if (ad.length < 2 || ad.length > 40) return { hata: 'Görünen ad 2–40 karakter olmalı.' };
  if (/https?:|www\.|\.com|@/.test(ad)) return { hata: 'Görünen adda bağlantı ya da e-posta kullanmayın.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta) || eposta.length > 120) return { hata: 'Geçerli bir e-posta adresi yazın.' };
  if (String(sifre || '').length < 8) return { hata: 'Şifre en az 8 karakter olmalı.' };
  if (await db.prepare('SELECT 1 FROM b_uye WHERE eposta = ?').bind(eposta).first()) return { hata: 'Bu e-posta ile zaten üyelik var. Giriş yapmayı deneyin.' };
  const tuz = rastgele(16), oz = await sifreOzet(sifre, tuz);
  const r = await db.prepare('INSERT INTO b_uye (ad, eposta, sifre, tuz, olus_ts) VALUES (?, ?, ?, ?, ?)').bind(ad, eposta, oz, tuz, Date.now()).run();
  return { id: r.meta.last_row_id };
}

export async function giris(db, { eposta, sifre }) {
  eposta = String(eposta || '').trim().toLowerCase();
  const u = await db.prepare('SELECT * FROM b_uye WHERE eposta = ?').bind(eposta).first();
  // Kayıt yoksa da aynı süre harcansın (e-posta var/yok bilgisi sızmasın)
  const oz = await sifreOzet(String(sifre || ''), u ? u.tuz : 'yok-tuz');
  if (!u || !esit(oz, u.sifre)) return { hata: 'E-posta ya da şifre hatalı.' };
  if (u.durum !== 'aktif') return { hata: 'Bu hesap kullanıma kapatılmış.' };
  return { id: u.id };
}

const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|tr|info|shop|store|xyz|biz|co)\b/i;
// Yeni paylaşımın durumu: 'onayli' ya da 'bekliyor' (+ neden)
export function paylasimDurumu(uye, metin, A) {
  if (yetkili(uye, 'moderasyon')) return { durum: 'onayli' };
  if (A.link_beklet !== '0' && LINK.test(metin)) return { durum: 'bekliyor', neden: 'bağlantı içeriyor' };
  const esik = Math.max(0, parseInt(A.yorum_esik, 10) || 3);
  if ((uye.onayli || 0) >= esik) return { durum: 'onayli' };
  return { durum: 'bekliyor', neden: 'yeni hesap ' + ((uye.onayli || 0) + 1) + '/' + esik };
}

export function guven(uye, A) {
  if (!uye) return null;
  if (uye.rol && uye.rol !== 'uye') return { ad: 'Ekip', sinif: 'c-g', etiket: 'tag-team' };
  const esik = parseInt(A.yorum_esik, 10) || 3, g = parseInt(A.guvenilir_esik, 10) || 20;
  if ((uye.onayli || 0) >= g) return { ad: 'Güvenilir', sinif: 'c-g', etiket: 'tag-lvl' };
  if ((uye.onayli || 0) >= esik) return { ad: 'Düzenli', sinif: 'c-b', etiket: 'tag-lvl' };
  return { ad: 'Yeni · ' + (uye.onayli || 0) + '/' + esik, sinif: 'c-o', etiket: '' };
}

// Moderatör kararı sonrası hesabın onay sayacı
export async function kararSay(db, uyeId, onay, A) {
  if (onay) await db.prepare('UPDATE b_uye SET onayli = onayli + 1 WHERE id = ?').bind(uyeId).run();
  else await db.prepare(A.ret_sifirla === '0' ? 'UPDATE b_uye SET ret = ret + 1 WHERE id = ?' : 'UPDATE b_uye SET ret = ret + 1, onayli = 0 WHERE id = ?').bind(uyeId).run();
}
