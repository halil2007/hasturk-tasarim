// Blog veritabanı: Bilge Bey ile aynı D1 (Doğu Avrupa, EEUR), tüm tablolar b_ önekli.
// Tablolar ilk istekte kurulur; boşsa başlangıç kategorileri, ayarlar ve örnek yazılar eklenir (tohum.js).
import { rastgele } from './ortak.js';
import { TOHUM_KATEGORI, TOHUM_YAZI, TOHUM_AYAR, TOHUM_SORU, TOHUM_YAZI2 } from './tohum.js';
import { slugYap } from './ortak.js';
import { HUKUK, HUKUK_SURUM, HUKUK_YAMA } from './hukuk.js';
import { YENIDEN, YENI, SORU_EK, HAFTA, KAPAK, KAPAK2, KAPAK3 } from './icerik/index.js';
import { PAKETLER } from './icerik/paket.js';
import { SOSYAL } from './sosyal.js';

const SEMA = [
  'CREATE TABLE IF NOT EXISTS b_ayar (k TEXT PRIMARY KEY, v TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS b_kategori (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, ad TEXT NOT NULL, aciklama TEXT, kisa TEXT, gorsel TEXT, sira INTEGER DEFAULT 0, menude INTEGER DEFAULT 0, vitrin INTEGER DEFAULT 1, renk TEXT)',
  'CREATE TABLE IF NOT EXISTS b_yazi (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, baslik TEXT NOT NULL, ozet TEXT, kisaca TEXT, govde TEXT, sss TEXT, kategori_id INTEGER, etiketler TEXT, gorsel TEXT, gorsel_alt TEXT, seo_baslik TEXT, seo_aciklama TEXT, odak TEXT, durum TEXT NOT NULL DEFAULT \'taslak\', tur TEXT NOT NULL DEFAULT \'yazi\', one_cikan INTEGER DEFAULT 0, urunler TEXT, urun_oto INTEGER DEFAULT 1, yazar TEXT, yayin_ts INTEGER, guncel_ts INTEGER, olus_ts INTEGER, okunma INTEGER DEFAULT 0, ornek INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS b_yazi_yayin ON b_yazi (durum, yayin_ts)',
  'CREATE INDEX IF NOT EXISTS b_yazi_kat ON b_yazi (kategori_id, yayin_ts)',
  'CREATE TABLE IF NOT EXISTS b_uye (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT NOT NULL, eposta TEXT UNIQUE NOT NULL, sifre TEXT NOT NULL, tuz TEXT NOT NULL, rol TEXT NOT NULL DEFAULT \'uye\', durum TEXT NOT NULL DEFAULT \'aktif\', onayli INTEGER DEFAULT 0, ret INTEGER DEFAULT 0, olus_ts INTEGER, son_ts INTEGER)',
  'CREATE TABLE IF NOT EXISTS b_oturum (id TEXT PRIMARY KEY, uye_id INTEGER NOT NULL, ts INTEGER NOT NULL, bitis INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS b_yorum (id INTEGER PRIMARY KEY AUTOINCREMENT, yazi_id INTEGER NOT NULL, uye_id INTEGER NOT NULL, ust_id INTEGER, metin TEXT NOT NULL, durum TEXT NOT NULL DEFAULT \'bekliyor\', neden TEXT, ts INTEGER NOT NULL, faydali INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS b_yorum_yazi ON b_yorum (yazi_id, durum)',
  'CREATE TABLE IF NOT EXISTS b_soru (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, baslik TEXT NOT NULL, metin TEXT NOT NULL, uye_id INTEGER NOT NULL, kategori_id INTEGER, durum TEXT NOT NULL DEFAULT \'bekliyor\', neden TEXT, cozum_id INTEGER, ts INTEGER NOT NULL, son_ts INTEGER, goruntulenme INTEGER DEFAULT 0, cevap_sayisi INTEGER DEFAULT 0, oy INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS b_soru_durum ON b_soru (durum, ts)',
  'CREATE TABLE IF NOT EXISTS b_cevap (id INTEGER PRIMARY KEY AUTOINCREMENT, soru_id INTEGER NOT NULL, uye_id INTEGER NOT NULL, metin TEXT NOT NULL, ekip INTEGER DEFAULT 0, durum TEXT NOT NULL DEFAULT \'bekliyor\', neden TEXT, ts INTEGER NOT NULL, oy INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS b_cevap_soru ON b_cevap (soru_id, durum)',
  'CREATE TABLE IF NOT EXISTS b_oy (tur TEXT NOT NULL, hedef INTEGER NOT NULL, uye_id INTEGER NOT NULL, deger INTEGER NOT NULL, PRIMARY KEY (tur, hedef, uye_id))',
  'CREATE TABLE IF NOT EXISTS b_banner (id INTEGER PRIMARY KEY AUTOINCREMENT, alan TEXT NOT NULL, ad TEXT, baslik TEXT, alt TEXT, dugme TEXT, link TEXT, gorsel TEXT, aktif INTEGER DEFAULT 1, bas_ts INTEGER, bit_ts INTEGER, kategori_id INTEGER, gosterim INTEGER DEFAULT 0, tik INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS b_bulten (eposta TEXT PRIMARY KEY, ts INTEGER NOT NULL, izin INTEGER DEFAULT 1)',
  'CREATE TABLE IF NOT EXISTS b_mail (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, tur TEXT NOT NULL, uye_id INTEGER, ok INTEGER, hata TEXT)',
  'CREATE TABLE IF NOT EXISTS b_deneme (k TEXT PRIMARY KEY, n INTEGER NOT NULL, ts INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS b_dosya (id TEXT PRIMARY KEY, uye_id INTEGER NOT NULL, tur TEXT NOT NULL, hedef INTEGER, mime TEXT NOT NULL, veri BLOB NOT NULL, boyut INTEGER NOT NULL, durum TEXT NOT NULL DEFAULT \'aktif\', ts INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS b_dosya_hedef ON b_dosya (tur, hedef, durum)',
  'CREATE TABLE IF NOT EXISTS b_istat (d TEXT NOT NULL, k TEXT NOT NULL, x TEXT NOT NULL DEFAULT \'\', n INTEGER NOT NULL, PRIMARY KEY (d, k, x))',
];

// Sonradan eklenen sütunlar (var olan kurulumlar için)
const SUTUN = [
  'ALTER TABLE b_soru ADD COLUMN derleme INTEGER DEFAULT 0',
  'ALTER TABLE b_kategori ADD COLUMN ust_id INTEGER',
  'ALTER TABLE b_uye ADD COLUMN bildirim INTEGER DEFAULT 1',
  'ALTER TABLE b_uye ADD COLUMN foto TEXT',
];
// Şema değişince anahtar da değişir; şema yalnız o zaman yeniden kurulur
const SEMA_ANAHTAR = 'sema_' + [...SEMA, ...SUTUN].join(';').split('').reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36);

// Yeni Worker örneğinin ilk isteğinde çalışır. Veritabanı Avrupa'da olduğundan her sorgu ayrı bir gidiş-dönüş;
// bu yüzden tamamlanmış kurulum adımları tek sorguyla okunur (önceden ~25 ardışık sorgu, ilk açılış 4-6 sn sürüyordu).
let HAZIR = null;
export function kur(db, env) {
  if (!HAZIR) HAZIR = (async () => {
    const yapildi = new Set(((await db.prepare('SELECT k FROM b_ayar').all().catch(() => null)) || { results: [] }).results.map((r) => r.k));
    if (!yapildi.has(SEMA_ANAHTAR)) {
      await db.batch(SEMA.map((s) => db.prepare(s)));
      for (const s of SUTUN) await db.prepare(s).run().catch(() => {});
    }
    if (!yapildi.has('kurulum')) await tohumla(db);
    if (!yapildi.has('tohum_sc')) await tohumSoru(db);
    if (!yapildi.has('tohum_yazi2')) await tohumYazi2(db);
    if (!yapildi.has('hukuk_v')) await hukukGuncelle(db);
    if (!yapildi.has('hukuk_v2')) await hukukYama(db);
    if (!yapildi.has('hukuk_v3')) await hukukYama3(db);
    if (!yapildi.has('tohum_v3')) await yaziYenile(db);
    if (!yapildi.has('mail_v1')) await mailAyar(db);
    if (!yapildi.has('tel_v1')) await telefonAyar(db);
    if (!yapildi.has('tohum_v4')) await yaziEkle(db);
    if (!yapildi.has('tohum_sc2')) await soruEkle(db);
    if (!yapildi.has('tohum_v5')) await zamanliAc(db);
    if (!yapildi.has('yayin_v1')) await canliyaAl(db);
    if (!yapildi.has('sosyal_v1')) await sosyalAyar(db);
    if (!yapildi.has('hafta_v1')) await haftaEkle(db);
    if (!yapildi.has('kapak_v1')) await kapakYenile(db);
    if (!yapildi.has('kapak_v2')) await kapakDuzelt(db);
    if (!yapildi.has('yazar_v1')) await yazarDuzelt(db);
    if (!yapildi.has('kapak_v3')) await kapakUrunsuz(db);
    if (!yapildi.has('soru_cikar_v1')) await soruCikar(db);
    if (!yapildi.has(KAYNAK_ANAHTAR)) await kaynakGuncelle(db);
    if (!yapildi.has('soru_kopya_v1')) await soruKopyaTemizle(db);
    if (!yapildi.has('soru_kopya_v2')) await soruAsilGoogle(db);
    if (!yapildi.has('yazi_kopya_v1')) await yaziKopyaIptal(db);
    if (!yapildi.has(SEMA_ANAHTAR)) await db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(SEMA_ANAHTAR, String(Date.now())).run();
  })().catch((e) => { HAZIR = null; throw e; });
  return HAZIR.then(() => paketler(db, env));
}

// Yazı paketleri (50'şer yazı + soru-cevap): public/blog-statik/veri/ altında sıkıştırılmış dosyalar, kod paketini büyütmez.
// Her paket bir kez yüklenir; hata olursa site çalışmaya devam eder, 5 dakika sonra yeniden denenir.
let PAKET = null, PAKET_HATA = 0;
function paketler(db, env) {
  if (!env || !env.ASSETS || !PAKETLER.length) return;
  if (!PAKET && Date.now() - PAKET_HATA > 300000) PAKET = paketYukle(db, env).catch((e) => { console.error('paket', e && e.message); PAKET = null; PAKET_HATA = Date.now(); });
  return PAKET;
}
async function paketYukle(db, env) {
  const yuklu = Object.fromEntries((await db.prepare("SELECT k, v FROM b_ayar WHERE k LIKE 'paket_%'").all()).results.map((r) => [r.k, r.v]));
  for (const [ad, dosya, ozet] of PAKETLER) {
    const once = yuklu['paket_' + ad];
    if (once === ozet) continue;
    const r = await env.ASSETS.fetch(new Request('https://paket.yerel/blog-statik/veri/' + dosya));
    if (!r.ok) throw new Error(ad + ' ' + r.status);
    const P = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
    await yazilarEkle(db, P.yazilar || []);
    // Paket daha önce yüklendiyse (düzeltilmiş sürüm): panelden düzenlenmemiş yazılar güncellenir
    if (once) await yazilarGuncelle(db, P.yazilar || []);
    await sorularEkle(db, P.sorular || []);
    await db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind('paket_' + ad, ozet).run();
  }
}
async function yazilarGuncelle(db, liste) {
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const now = Date.now();
  const q = liste.flatMap((p) => {
    const ts = trTarihTs(p.yayin);
    return [
      db.prepare('UPDATE b_yazi SET baslik=?, ozet=?, kisaca=?, govde=?, sss=?, kategori_id=?, etiketler=?, gorsel=?, gorsel_alt=?, seo_baslik=?, seo_aciklama=?, odak=?, urunler=?, urun_oto=?, yazar=? WHERE slug = ? AND ornek = 1')
        .bind(p.baslik, p.ozet, p.kisaca, p.govde, p.sss || '', kat[p.kategori] || null, p.etiketler || '', p.gorsel, p.gorsel_alt || '', p.seo_baslik || '', p.seo_aciklama || p.ozet, p.odak || '', JSON.stringify(p.urunler || []), p.urun_oto === 0 ? 0 : 1, p.yazar, p.slug),
      db.prepare("UPDATE b_yazi SET yayin_ts = ?, durum = ? WHERE slug = ? AND ornek = 1 AND durum = 'zamanli'").bind(ts, ts <= now ? 'yayinda' : 'zamanli', p.slug),
    ];
  });
  for (let i = 0; i < q.length; i += 40) await db.batch(q.slice(i, i + 40));
}
async function yazilarEkle(db, liste) {
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const now = Date.now();
  const q = liste.map((p) => {
    const ts = trTarihTs(p.yayin);
    return db.prepare('INSERT OR IGNORE INTO b_yazi (slug, baslik, ozet, kisaca, govde, sss, kategori_id, etiketler, gorsel, gorsel_alt, seo_baslik, seo_aciklama, odak, durum, tur, one_cikan, urunler, urun_oto, yazar, yayin_ts, guncel_ts, olus_ts, ornek) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
      .bind(p.slug, p.baslik, p.ozet, p.kisaca, p.govde, p.sss || '', kat[p.kategori] || null, p.etiketler || '', p.gorsel, p.gorsel_alt || '', p.seo_baslik || '', p.seo_aciklama || p.ozet, p.odak || '', ts <= now ? 'yayinda' : 'zamanli', p.tur || 'yazi', 0, JSON.stringify(p.urunler || []), p.urun_oto === 0 ? 0 : 1, p.yazar, ts, Math.min(ts, now), now);
  });
  for (let i = 0; i < q.length; i += 40) await db.batch(q.slice(i, i + 40));
}
// Paket soruları: yayın saati gelmemiş soru ve cevaplar 'zamanli' durumunda bekler, zamanliSoruAc ile açılır
async function sorularEkle(db, liste) {
  if (!liste.length) return;
  const soran = await ekipHesabi(db, 'destek@hasturk.blog', 'HasTürk Müşteri Hizmetleri', 'moderator');
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const ekip = {};
  for (const ad of [...new Set(liste.flatMap((s) => s.cevaplar.map((c) => c.yazar)))]) ekip[ad] = await ekipHesabi(db, ekipEposta(ad), ad, 'editor');
  const now = Date.now();
  for (const s of liste) {
    const ts = trTarihTs(s.yayin), cts = s.cevaplar.map((c) => ts + Math.round(c.sonra * 3600000));
    const acik = cts.filter((t) => t <= now);
    const r = await db.prepare("INSERT INTO b_soru (slug, baslik, metin, uye_id, kategori_id, durum, ts, son_ts, cevap_sayisi, derleme) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM b_soru WHERE baslik = ?)")
      .bind(slugYap(s.baslik), s.baslik, s.metin, soran, kat[s.kategori] || null, ts <= now ? 'onayli' : 'zamanli', ts, acik.length ? Math.max(...acik) : ts, acik.length, s.baslik).run();
    if (!r.meta.changes) continue;
    const sid = r.meta.last_row_id;
    const ids = (await db.batch(s.cevaplar.map((c, i) => db.prepare('INSERT INTO b_cevap (soru_id, uye_id, metin, ekip, durum, ts) VALUES (?, ?, ?, 1, ?, ?)').bind(sid, ekip[c.yazar], c.metin, cts[i] <= now ? 'onayli' : 'zamanli', cts[i])))).map((x) => x.meta.last_row_id);
    if (cts[0] <= now) await db.prepare('UPDATE b_soru SET cozum_id = ? WHERE id = ?').bind(ids[0], sid).run();
  }
}

// Zamanlanmış soru ve cevapları saati gelince yayına alır (dakikada en fazla bir kez); derleme sorularda ilk cevap çözüm olur
let SORU_KONTROL = 0;
export async function zamanliSoruAc(db) {
  const now = Date.now();
  if (now - SORU_KONTROL < 60000) return;
  SORU_KONTROL = now;
  const bekleyen = await db.prepare("SELECT (SELECT COUNT(*) FROM b_soru WHERE durum = 'zamanli' AND ts <= ?) + (SELECT COUNT(*) FROM b_cevap WHERE durum = 'zamanli' AND ts <= ?) n").bind(now, now).first();
  if (!bekleyen || !bekleyen.n) return;
  await db.batch([
    db.prepare("UPDATE b_soru SET durum = 'onayli' WHERE durum = 'zamanli' AND ts <= ?").bind(now),
    db.prepare("UPDATE b_cevap SET durum = 'onayli' WHERE durum = 'zamanli' AND ts <= ?").bind(now),
    db.prepare("UPDATE b_soru SET cevap_sayisi = (SELECT COUNT(*) FROM b_cevap WHERE soru_id = b_soru.id AND durum = 'onayli'), son_ts = MAX(ts, COALESCE((SELECT MAX(ts) FROM b_cevap WHERE soru_id = b_soru.id AND durum = 'onayli'), ts)), cozum_id = CASE WHEN cozum_id IS NULL AND derleme = 1 THEN (SELECT MIN(id) FROM b_cevap WHERE soru_id = b_soru.id AND durum = 'onayli') ELSE cozum_id END WHERE id IN (SELECT soru_id FROM b_cevap WHERE ts <= ? AND ts > ?)").bind(now, now - 30 * 86400000),
  ]);
}

// Yazar adı düzeltmesi: Miktat Çelik → Mikdat Çelik (yazılar ve soru-cevap hesabı)
async function yazarDuzelt(db) {
  const eski = await db.prepare("SELECT id FROM b_uye WHERE eposta = 'miktat.celik@hasturk.blog'").first();
  const yeni = await db.prepare("SELECT id FROM b_uye WHERE eposta = 'mikdat.celik@hasturk.blog'").first();
  const q = [db.prepare("UPDATE b_yazi SET yazar = 'Mikdat Çelik' WHERE yazar = 'Miktat Çelik'")];
  if (eski) q.push(yeni ? db.prepare('UPDATE b_cevap SET uye_id = ? WHERE uye_id = ?').bind(yeni.id, eski.id) : db.prepare("UPDATE b_uye SET ad = 'Mikdat Çelik', eposta = 'mikdat.celik@hasturk.blog' WHERE id = ?").bind(eski.id));
  q.push(db.prepare("UPDATE b_uye SET ad = 'Mikdat Çelik' WHERE ad = 'Miktat Çelik'"));
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('yazar_v1', '1')"));
  await db.batch(q);
}

// Ürün ambalajı fotoğrafı olan kapaklar konuyu gösteren fotoğraflarla değiştirilir (panelden başka görsel seçildiyse dokunulmaz)
// Paketten çıkarılan (benzeri başka günde bulunan) derleme sorular: henüz yayına girmediyse cevaplarıyla silinir
const CIKAN_SORU = [
  'Saksıdaki limon ağacımın yeni yaprakları sararıyor ama damarları yeşil, neden?',
  "Calathea'mın yaprakları kıvrılıyor ve uçları kahverengileşiyor, ne yapmalıyım?",
];
async function soruCikar(db) {
  const yer = CIKAN_SORU.map(() => '?').join(',');
  await db.batch([
    db.prepare(`DELETE FROM b_cevap WHERE soru_id IN (SELECT id FROM b_soru WHERE derleme = 1 AND durum = 'zamanli' AND baslik IN (${yer}))`).bind(...CIKAN_SORU),
    db.prepare(`DELETE FROM b_soru WHERE derleme = 1 AND durum = 'zamanli' AND baslik IN (${yer})`).bind(...CIKAN_SORU),
    db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('soru_cikar_v1', '1')"),
  ]);
}
async function kapakUrunsuz(db) {
  const q = Object.entries(KAPAK3).map(([slug, [g, alt, eskiler]]) => db.prepare(`UPDATE b_yazi SET gorsel = ?, gorsel_alt = ? WHERE slug = ? AND gorsel IN (${eskiler.map(() => '?').join(',')})`).bind(g, alt, slug, ...eskiler));
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('kapak_v3', '1')"));
  await db.batch(q);
}

async function tohumla(db) {
  const now = Date.now();
  const q = [];
  for (const [k, v] of Object.entries({ ...TOHUM_AYAR, ip_tuz: rastgele(24) })) q.push(db.prepare('INSERT OR IGNORE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, typeof v === 'string' ? v : JSON.stringify(v)));
  TOHUM_KATEGORI.forEach((c, i) => q.push(db.prepare('INSERT OR IGNORE INTO b_kategori (slug, ad, aciklama, kisa, gorsel, sira, menude, vitrin, renk) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(c.slug, c.ad, c.aciklama, c.kisa, c.gorsel, i + 1, c.menude ? 1 : 0, c.vitrin === false ? 0 : 1, c.renk || '')));
  await db.batch(q);
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const y = TOHUM_YAZI.map((p, i) => db.prepare('INSERT OR IGNORE INTO b_yazi (slug, baslik, ozet, kisaca, govde, sss, kategori_id, etiketler, gorsel, gorsel_alt, seo_baslik, seo_aciklama, odak, durum, tur, one_cikan, yazar, yayin_ts, guncel_ts, olus_ts, ornek) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
    .bind(p.slug, p.baslik, p.ozet, p.kisaca, p.govde, p.sss || '', kat[p.kategori] || null, p.etiketler || '', p.gorsel, p.gorsel_alt || '', p.seo_baslik || '', p.seo_aciklama || p.ozet, p.odak || '', 'yayinda', p.tur || 'yazi', p.one_cikan ? 1 : 0, 'HasTürk Editör Ekibi', now - (i + 1) * 86400000, now, now));
  if (y.length) await db.batch(y);
  await db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('kurulum', ?)").bind(String(now)).run();
}

// Ekip hesapları (rastgele şifreli; panelden yönetici şifresiyle girilir)
async function ekipHesabi(db, eposta, ad, rol) {
  const r = await db.prepare('SELECT id FROM b_uye WHERE eposta = ?').bind(eposta).first();
  if (r) return r.id;
  const tuz = rastgele(16);
  return (await db.prepare('INSERT INTO b_uye (ad, eposta, sifre, tuz, rol, olus_ts) VALUES (?, ?, ?, ?, ?, ?)').bind(ad, eposta, rastgele(32), tuz, rol, Date.now()).run()).meta.last_row_id;
}
async function tohumSoru(db) {
  const soran = await ekipHesabi(db, 'destek@hasturk.blog', 'HasTürk Müşteri Hizmetleri', 'moderator');
  const ekip = await ekipHesabi(db, 'ekip@hasturk.blog', 'HasTürk Editör Ekibi', 'yonetici');
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const now = Date.now();
  for (const [i, q] of TOHUM_SORU.entries()) {
    const ts = now - (TOHUM_SORU.length - i) * 20 * 3600 * 1000;
    const s = await db.prepare("INSERT INTO b_soru (slug, baslik, metin, uye_id, kategori_id, durum, ts, son_ts, cevap_sayisi, derleme) VALUES (?, ?, ?, ?, ?, 'onayli', ?, ?, 1, 1)")
      .bind(slugYap(q.baslik), q.baslik, q.metin, soran, kat[q.kategori] || null, ts, ts + 3 * 3600 * 1000).run();
    const sid = s.meta.last_row_id;
    const c = await db.prepare("INSERT INTO b_cevap (soru_id, uye_id, metin, ekip, durum, ts) VALUES (?, ?, ?, 1, 'onayli', ?)").bind(sid, ekip, q.cevap, ts + 3 * 3600 * 1000).run();
    await db.prepare('UPDATE b_soru SET cozum_id = ? WHERE id = ?').bind(c.meta.last_row_id, sid).run();
  }
  await db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('tohum_sc', ?)").bind(String(now)).run();
}

async function tohumYazi2(db) {
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const now = Date.now();
  // Yayın tarihleri son günlere yayılır (en yeni yazı 1 gün önce)
  const q = TOHUM_YAZI2.map((p, i) => db.prepare('INSERT OR IGNORE INTO b_yazi (slug, baslik, ozet, kisaca, govde, sss, kategori_id, etiketler, gorsel, gorsel_alt, seo_baslik, seo_aciklama, odak, durum, tur, one_cikan, yazar, yayin_ts, guncel_ts, olus_ts, ornek) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
    .bind(p.slug, p.baslik, p.ozet, p.kisaca, p.govde, p.sss || '', kat[p.kategori] || null, p.etiketler || '', p.gorsel, p.gorsel_alt || '', p.seo_baslik || '', p.seo_aciklama || p.ozet, p.odak || '', 'yayinda', 'yazi', p.one_cikan ? 1 : 0, 'HasTürk Editör Ekibi', now - (i + 1) * 30 * 3600 * 1000, now, now));
  await db.batch(q);
  await db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('tohum_yazi2', ?)").bind(String(now)).run();
}

// Türkiye saatiyle bugünden `gun` gün önceki günün 'SS:DD' saati (gun eksiyse ileri tarih)
function trZaman(gun, saat) {
  const gece = Math.floor((Date.now() + TR) / 86400000) * 86400000 - TR;
  const [h, m] = String(saat || '09:00').split(':').map(Number);
  return gece - gun * 86400000 + (h * 60 + m) * 60000;
}
const TR = 3 * 3600 * 1000;

// İkinci yazı paketi: tarihleri son haftalara yayılır; ileri tarihli olanlar zamanlanmış olarak girer ve günü gelince yayınlanır
async function yaziEkle(db) {
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const now = Date.now();
  const q = YENI.map((p) => {
    const ts = trZaman(p.gun, p.saat);
    return db.prepare('INSERT OR IGNORE INTO b_yazi (slug, baslik, ozet, kisaca, govde, sss, kategori_id, etiketler, gorsel, gorsel_alt, seo_baslik, seo_aciklama, odak, durum, tur, one_cikan, urun_oto, yazar, yayin_ts, guncel_ts, olus_ts, ornek) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
      .bind(p.slug, p.baslik, p.ozet, p.kisaca, p.govde, p.sss || '', kat[p.kategori] || null, p.etiketler || '', p.gorsel, p.gorsel_alt || '', p.seo_baslik || '', p.seo_aciklama || p.ozet, p.odak || '', ts <= now ? 'yayinda' : 'zamanli', p.tur || 'yazi', p.one_cikan ? 1 : 0, p.urun_oto === 0 ? 0 : 1, p.yazar, ts, Math.min(ts, now), Math.min(ts, now));
  });
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('tohum_v4', ?)").bind(String(now)));
  await db.batch(q);
}

// Zamanlanmış örnek yazılar geçmiş tarihle hemen yayına alınır (tarih içerik dosyasındaki gun/saat)
async function zamanliAc(db) {
  const now = Date.now();
  const q = YENI.filter((p) => p.gun > 0).map((p) => {
    const ts = trZaman(p.gun, p.saat);
    return db.prepare("UPDATE b_yazi SET durum = 'yayinda', yayin_ts = ?, guncel_ts = ?, olus_ts = ? WHERE slug = ? AND durum = 'zamanli' AND ornek = 1").bind(ts, ts, ts, p.slug);
  });
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('tohum_v5', ?)").bind(String(now)));
  await db.batch(q);
}

// Site sahibinin isteğiyle blog arama motorlarına açılır (bir kez; sonra panelden yeniden kuruluma alınabilir)
async function canliyaAl(db) {
  const A = await ayarlar(db), q = [];
  const yaz = (k, v) => db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, v);
  q.push(yaz('yayin', 'canli'));
  if (!String(A.site_url || '').trim()) q.push(yaz('site_url', 'https://blog.hasturkgubre.com.tr'));
  q.push(yaz('yayin_v1', '1'));
  await db.batch(q);
}

// Mağazanın sosyal medya hesapları varsayılan olarak girilir; panelde girilmiş bir değer varsa korunur
async function sosyalAyar(db) {
  const q = SOSYAL.filter((s) => s.url).map((s) => db.prepare('INSERT OR IGNORE INTO b_ayar (k, v) VALUES (?, ?)').bind('sosyal_' + s.k, s.url));
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('sosyal_v1', '1')"));
  await db.batch(q);
}

// Türkiye saatiyle 'YYYY-AA-GG SS:DD' → zaman damgası
function trTarihTs(t) {
  const [g, s] = String(t).split(' ');
  const [y, a, d] = g.split('-').map(Number), [h, m] = (s || '09:00').split(':').map(Number);
  return Date.UTC(y, a - 1, d, h, m) - TR;
}

// Haftalık plan (19-25 Ekim, günde 10 yazı): yazılar panelde "Zamanlanmış" olarak durur, yayın saati gelince kendiliğinden yayınlanır
async function haftaEkle(db) {
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const now = Date.now();
  const q = HAFTA.map((p) => {
    const ts = trTarihTs(p.yayin);
    return db.prepare('INSERT OR IGNORE INTO b_yazi (slug, baslik, ozet, kisaca, govde, sss, kategori_id, etiketler, gorsel, gorsel_alt, seo_baslik, seo_aciklama, odak, durum, tur, one_cikan, urun_oto, yazar, yayin_ts, guncel_ts, olus_ts, ornek) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
      .bind(p.slug, p.baslik, p.ozet, p.kisaca, p.govde, p.sss || '', kat[p.kategori] || null, p.etiketler || '', p.gorsel, p.gorsel_alt || '', p.seo_baslik || '', p.seo_aciklama || p.ozet, p.odak || '', ts <= now ? 'yayinda' : 'zamanli', p.tur || 'yazi', p.one_cikan ? 1 : 0, p.urun_oto === 0 ? 0 : 1, p.yazar, ts, Math.min(ts, now), now);
  });
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('hafta_v1', ?)").bind(String(now)));
  await db.batch(q);
}

// Eski yazılarda tekrar eden kapak görselleri her yazıya ayrı görselle değiştirilir (panelden değiştirilmiş görsele dokunulmaz)
async function kapakYenile(db) {
  const ilk = Object.fromEntries([...TOHUM_YAZI, ...TOHUM_YAZI2, ...YENI].map((y) => [y.slug, y.gorsel]));
  const q = Object.entries(KAPAK).filter(([slug]) => ilk[slug])
    .map(([slug, [g, alt]]) => db.prepare('UPDATE b_yazi SET gorsel = ?, gorsel_alt = ? WHERE slug = ? AND gorsel = ?').bind(g, alt, slug, ilk[slug]));
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('kapak_v1', '1')"));
  await db.batch(q);
}

// Konuyla uyuşmayan kapakların düzeltilmesi: yalnız görseli hâlâ eski (sistemin koyduğu) görsel olan yazılar güncellenir
async function kapakDuzelt(db) {
  const q = [];
  for (const [slug, [g, alt, eskiler]] of Object.entries(KAPAK2)) {
    q.push(db.prepare(`UPDATE b_yazi SET gorsel = ?, gorsel_alt = ? WHERE slug = ? AND gorsel IN (${eskiler.map(() => '?').join(',')})`).bind(g, alt, slug, ...eskiler));
  }
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('kapak_v2', '1')"));
  await db.batch(q);
}

// Ekip üyesi adına hesap (ör. Halil İbrahim Çelik → halil.ibrahim.celik@hasturk.blog)
const ekipEposta = (ad) => slugYap(ad).replace(/-/g, '.') + '@hasturk.blog';

// Soru-cevap paketi: sık gelen sorulardan derlenen sorular ekipteki isimlerle cevaplanır; ilk cevap çözüm olarak işaretlenir.
// Önceki derleme soruların ortak ekip hesabıyla yazılmış cevapları da sırayla ekip üyelerine dağıtılır.
async function soruEkle(db) {
  const soran = await ekipHesabi(db, 'destek@hasturk.blog', 'HasTürk Müşteri Hizmetleri', 'moderator');
  const kat = Object.fromEntries((await db.prepare('SELECT id, slug FROM b_kategori').all()).results.map((r) => [r.slug, r.id]));
  const ekip = {};
  for (const ad of [...new Set(SORU_EK.flatMap((s) => s.cevaplar.map((c) => c.yazar)))]) ekip[ad] = await ekipHesabi(db, ekipEposta(ad), ad, 'editor');
  const now = Date.now();
  for (const s of SORU_EK) {
    if (await db.prepare('SELECT id FROM b_soru WHERE baslik = ?').bind(s.baslik).first()) continue;
    const ts = Math.min(trZaman(s.gun, s.saat), now - 2 * 3600 * 1000);
    const cts = s.cevaplar.map((c) => Math.min(ts + c.sonra * 3600 * 1000, now - 60000));
    const ek = (await db.prepare("INSERT INTO b_soru (slug, baslik, metin, uye_id, kategori_id, durum, ts, son_ts, cevap_sayisi, derleme) SELECT ?, ?, ?, ?, ?, 'onayli', ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM b_soru WHERE baslik = ?)")
      .bind(slugYap(s.baslik), s.baslik, s.metin, soran, kat[s.kategori] || null, ts, Math.max(...cts), s.cevaplar.length, s.baslik).run()).meta;
    if (!ek.changes) continue;
    const sid = ek.last_row_id;
    const ids = (await db.batch(s.cevaplar.map((c, i) => db.prepare("INSERT INTO b_cevap (soru_id, uye_id, metin, ekip, durum, ts) VALUES (?, ?, ?, 1, 'onayli', ?)").bind(sid, ekip[c.yazar], c.metin, cts[i])))).map((r) => r.meta.last_row_id);
    await db.prepare('UPDATE b_soru SET cozum_id = ? WHERE id = ?').bind(ids[0], sid).run();
  }
  const ortak = await db.prepare("SELECT id FROM b_uye WHERE eposta = 'ekip@hasturk.blog'").first();
  const adlar = Object.values(ekip);
  if (ortak && adlar.length) {
    const eski = (await db.prepare('SELECT c.id FROM b_cevap c JOIN b_soru s ON s.id = c.soru_id WHERE c.uye_id = ? AND s.derleme = 1 ORDER BY c.id').bind(ortak.id).all()).results;
    if (eski.length) await db.batch(eski.map((c, i) => db.prepare('UPDATE b_cevap SET uye_id = ? WHERE id = ?').bind(adlar[i % adlar.length], c.id)));
  }
  await db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('tohum_sc2', ?)").bind(String(now)).run();
}

// HasTürk e-posta hesabı (Turhost SMTP) ile gönderim ayarları; şifre panelden girilir ve D1'de şifreli durur (bkz. mail.js).
// Panelden gönderen adresi daha önce girildiyse dokunulmaz.
// Müşteri hizmetleri telefonu (yasal sayfalardaki iletişim satırı); sonradan panelden değiştirilebilir
async function telefonAyar(db) {
  const yaz = (k, v) => db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, v);
  await db.batch([yaz('iletisim_tel', '+90 553 727 29 29'), yaz('tel_v1', '1')]);
}
async function mailAyar(db) {
  const A = await ayarlar(db), q = [];
  const yaz = (k, v) => db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, v);
  if (!String(A.mail_gonderen || '').trim()) {
    for (const [k, v] of Object.entries({ mail_aktif: '1', mail_saglayici: 'smtp', mail_gonderen: 'noreply@hasturkgubre.com.tr', mail_yanit: 'info@hasturkgubre.com.tr', smtp_sunucu: 'srvc28.trwww.com', smtp_port: '465', smtp_kullanici: 'noreply@hasturkgubre.com.tr' })) q.push(yaz(k, v));
  }
  q.push(yaz('mail_v1', '1'));
  await db.batch(q);
}

// Kaynak dosyadaki ilk yazılar (tohum, YENI, HAFTA) veritabanına bir kez eklenir; sonradan kaynakta yapılan düzeltmeler
// (bilgi düzeltmesi, yönlendirme cümleleri…) içerik özeti değişince panelden düzenlenmemiş (ornek = 1) yazılara aktarılır.
const KAYNAK_YAZI = (() => {
  const yen = Object.fromEntries(YENIDEN.map((y) => [y.slug, y]));
  return [...TOHUM_YAZI, ...TOHUM_YAZI2].map((y) => ({ ...y, ...(yen[y.slug] || {}) })).concat(YENI, HAFTA);
})();
const KAYNAK_ANAHTAR = (() => {
  const s = KAYNAK_YAZI.map((y) => [y.slug, y.baslik, y.odak, y.etiketler, y.ozet, y.kisaca, y.govde, y.sss, y.seo_aciklama].join('|')).join('§');
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return 'kaynak_' + h.toString(36) + '_' + s.length.toString(36);
})();
// Aynı arama niyetine ikinci yazı (yamyamlık): yayına girmemiş kopyalar taslağa alınır, adresleri yaşayan yazıya yönlenir (site.js > KOPYA_YON)
export const KOPYA_YON = { 'nane-yetistirme': 'saksida-nane-yetistirme', 'su-boncuklari': 'su-boncugu-hidrojel-nasil-kullanilir', 'aspirin-suyu-bitkiye': 'bitkilere-aspirin', 'roka-yetistirme': 'roka-ve-tere-yetistirme', 'aloe-vera-cogaltma-yavru-ayirma': 'aloe-vera-bakimi-ve-cogaltma', 'sulama-sistemi-kislatma': 'hortum-kislatma' };
async function yaziKopyaIptal(db) {
  const l = Object.keys(KOPYA_YON);
  await db.batch([
    db.prepare(`UPDATE b_yazi SET durum = 'taslak' WHERE durum = 'zamanli' AND slug IN (${l.map(() => '?').join(',')})`).bind(...l),
    db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind('yazi_kopya_v1', String(Date.now())),
  ]);
}
async function kaynakGuncelle(db) {
  const q = KAYNAK_YAZI.map((y) => db.prepare('UPDATE b_yazi SET baslik = ?, odak = ?, etiketler = ?, ozet = ?, kisaca = ?, govde = ?, sss = ?, seo_aciklama = ? WHERE slug = ? AND ornek = 1')
    .bind(y.baslik, y.odak || '', y.etiketler || '', y.ozet || '', y.kisaca || '', y.govde || '', y.sss || '', y.seo_aciklama || y.ozet || '', y.slug));
  q.push(db.prepare("DELETE FROM b_ayar WHERE k LIKE 'kaynak\\_%' ESCAPE '\\'"));
  q.push(db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(KAYNAK_ANAHTAR, String(Date.now())));
  for (let i = 0; i < q.length; i += 40) await db.batch(q.slice(i, i + 40));
}

// Derleme soruların eşzamanlı ilk kurulumda iki kez eklenmiş kopyaları: en eski kayıt kalır, kopyalar 'kopya' durumuna
// alınır (listelerde ve site haritasında görünmez, adresi açılınca asıl soruya kalıcı yönlenir)
async function soruKopyaTemizle(db) {
  await db.batch([
    db.prepare("UPDATE b_soru SET durum = 'kopya' WHERE derleme = 1 AND id NOT IN (SELECT MIN(id) FROM b_soru WHERE derleme = 1 GROUP BY baslik)"),
    db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('soru_kopya_v1', ?)").bind(String(Date.now())),
  ]);
}

// Google bu kopya çiftinde sonraki kaydı (48) standart sayfa seçti ve tıklamaları o aldı; asıl soru o olsun,
// eski kayıt (47) ona kalıcı yönlensin. Yalnız asıl olacak kaydın cevabı varsa değiştirilir.
const GOOGLE_ASIL = ['Saksı toprağı ne zaman değiştirilir, eski toprak tekrar kullanılır mı?'];
async function soruAsilGoogle(db) {
  const q = [];
  for (const b of GOOGLE_ASIL) {
    const son = await db.prepare("SELECT MAX(id) id FROM b_soru WHERE derleme = 1 AND baslik = ? AND durum IN ('onayli', 'kopya') AND cevap_sayisi > 0").bind(b).first();
    if (!son || !son.id) continue;
    q.push(db.prepare("UPDATE b_soru SET durum = CASE WHEN id = ? THEN 'onayli' ELSE 'kopya' END WHERE derleme = 1 AND baslik = ? AND durum IN ('onayli', 'kopya')").bind(son.id, b));
  }
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('soru_kopya_v2', ?)").bind(String(Date.now())));
  await db.batch(q);
}

// Örnek yazıların geliştirilmiş hâlleri: yalnızca gövdesi ilk tohumla aynı kalan (panelden düzenlenmemiş) yazılar güncellenir
async function yaziYenile(db) {
  const ilk = Object.fromEntries([...TOHUM_YAZI, ...TOHUM_YAZI2].map((y) => [y.slug, y.govde]));
  const now = Date.now(), q = [];
  for (const y of YENIDEN) {
    if (!ilk[y.slug]) continue;
    q.push(db.prepare('UPDATE b_yazi SET baslik = ?, ozet = ?, seo_aciklama = ?, odak = ?, etiketler = ?, gorsel_alt = ?, kisaca = ?, govde = ?, sss = ?, yazar = ?, guncel_ts = ? WHERE slug = ? AND govde = ?')
      .bind(y.baslik, y.ozet, y.seo_aciklama, y.odak, y.etiketler, y.gorsel_alt, y.kisaca, y.govde, y.sss, y.yazar, now, y.slug, ilk[y.slug]));
  }
  q.push(db.prepare("INSERT OR REPLACE INTO b_ayar (k, v) VALUES ('tohum_v3', ?)").bind(String(now)));
  await db.batch(q);
}

// Yasal metinler: yalnızca ilk taslaklar (ya da boş alanlar) yenileriyle değiştirilir; panelden elle düzenlenmiş metne dokunulmaz
async function hukukGuncelle(db) {
  const A = await ayarlar(db);
  const eskiKural = TOHUM_AYAR.kurallar;
  const yaz = (k, v) => db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, v);
  const q = [];
  for (const k of ['sozlesme', 'kvkk']) if (!String(A[k] || '').trim() || String(A[k]).startsWith('Bu metin taslaktır')) q.push(yaz(k, HUKUK[k]));
  if (!String(A.cerez || '').trim()) q.push(yaz('cerez', HUKUK.cerez));
  if (!String(A.kurallar || '').trim() || A.kurallar === eskiKural) q.push(yaz('kurallar', HUKUK.kurallar));
  if (!A.hukuk_tarih) q.push(yaz('hukuk_tarih', HUKUK_SURUM));
  q.push(yaz('hukuk_v', HUKUK_SURUM));
  await db.batch(q);
}

// Google Analytics (onaylı) ile ilgili cümleleri kayıtlı metinlere ekle; ölçüm kimliği boşsa HasTürk Blog kimliğini yaz
async function hukukYama(db) {
  const A = await ayarlar(db);
  const yaz = (k, v) => db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, v);
  const yeni = {}, q = [];
  for (const [k, a, b] of HUKUK_YAMA) { const m = yeni[k] ?? String(A[k] || ''); if (m.includes(a) && !m.includes(b)) yeni[k] = m.replace(a, b); }
  for (const [k, v] of Object.entries(yeni)) q.push(yaz(k, v));
  if (Object.keys(yeni).length) q.push(yaz('hukuk_tarih', HUKUK_SURUM));
  if (!String(A.ga4 || '').trim()) q.push(yaz('ga4', 'G-SMBH2B2LJ9'));
  q.push(yaz('hukuk_v2', '1'));
  await db.batch(q);
}

// GA opt-in → opt-out: eski "yalnızca onayla / Kabul Et demediğiniz sürece" metnini taşıyan çerez ve KVKK sayfalarını
// güncel metinle (HUKUK) yeniler. Elle tamamen özelleştirilmiş (bu ifadeleri içermeyen) sayfalara dokunmaz.
async function hukukYama3(db) {
  const A = await ayarlar(db);
  const yaz = (k, v) => db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, v);
  const q = [];
  for (const k of ['cerez', 'kvkk']) {
    const m = String(A[k] || '');
    if (m && (m.includes('yalnızca onay') || m.includes('demediğiniz sürece'))) q.push(yaz(k, HUKUK[k]));
  }
  if (q.length) q.push(yaz('hukuk_tarih', HUKUK_SURUM));
  q.push(yaz('hukuk_v3', '1'));
  await db.batch(q);
}

// Ayarlar: küçük tablo; her sayfada gerekir. 15 sn bellekte tutulur (her geçişte veritabanına gidilmesin, sayfalar hızlı açılsın);
// panelden ayar kaydedilince (ayarYaz) hemen tazelenir
let AYAR = null;
export async function ayarlar(db) {
  if (AYAR && Date.now() - AYAR.t < 15000) return { ...AYAR.o };
  const r = await db.prepare('SELECT k, v FROM b_ayar').all();
  const o = {};
  for (const { k, v } of r.results) { try { o[k] = /^[[{]/.test(v) ? JSON.parse(v) : v; } catch { o[k] = v; } }
  AYAR = { t: Date.now(), o };
  return { ...o };
}
export async function ayarYaz(db, k, v) {
  AYAR = null;
  await db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind(k, typeof v === 'string' ? v : JSON.stringify(v)).run();
}

// Günlük sayaç (görüntülenme, mağaza tıklaması, banner)
export function say(db, k, x = '', n = 1) {
  const d = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  return db.prepare('INSERT INTO b_istat (d, k, x, n) VALUES (?, ?, ?, ?) ON CONFLICT (d, k, x) DO UPDATE SET n = n + excluded.n').bind(d, k, String(x).slice(0, 120), n).run();
}

// Hız sınırı: pencere içinde en fazla `max` deneme
export async function sinir(db, anahtar, max, pencereSn) {
  const now = Date.now();
  const r = await db.prepare('SELECT n, ts FROM b_deneme WHERE k = ?').bind(anahtar).first();
  if (r && now - r.ts < pencereSn * 1000) {
    if (r.n >= max) return false;
    await db.prepare('UPDATE b_deneme SET n = n + 1 WHERE k = ?').bind(anahtar).run();
    return true;
  }
  await db.prepare('INSERT OR REPLACE INTO b_deneme (k, n, ts) VALUES (?, 1, ?)').bind(anahtar, now).run();
  if (Math.random() < 0.02) await db.prepare('DELETE FROM b_deneme WHERE ts < ?').bind(now - 86400000).run();
  return true;
}

// Yayında sayılan yazı koşulu (zamanlanmış yazı, saati gelince kendiliğinden yayına girer)
export const YAYINDA = "durum IN ('yayinda','zamanli') AND yayin_ts <= ?";
