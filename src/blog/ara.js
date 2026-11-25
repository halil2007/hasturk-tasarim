// Blog arama motoru: yazılar ve soru-cevap için Türkçe uyumlu, ilgiye göre sıralanan arama.
// - Büyük/küçük harf ve Türkçe karakter farkı gözetmez (sarımsak = sarimsak = SARIMSAK)
// - Ekleri tolere eder: kelimenin kökü (ilk 5 harf) aranır (sararıyor → sararma, saksıda → saksı)
// - "nasıl, neden, için" gibi dolgu kelimeleri atlanır; kelimelerin çoğu eşleşen sonuçlar gösterilir
// - Başlıkta geçen kelime, metinde geçenden çok daha değerlidir; tam ifade eşleşmesi ayrıca öne alınır
// Dizin her Worker kopyasında 5 dakika bellekte tutulur; veritabanına her aramada gidilmez.
import { YAYINDA } from './db.js';
import { okumaDk } from './ortak.js';

const HARF = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export function norm(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').replace(/i̇/g, 'i').replace(/[çğıöşüâîû]/g, (h) => HARF[h] || h)
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
const DOLGU = new Set(('ve ile icin mi mu mi mı mu ne neden nasil niye hangi hangisi kac kaci zaman olur olmaz yapilir yapmali gerekir gerek ' +
  'bir bu o da de ki ya veya ama gibi en cok az daha var yok mudur midir nedir nelerdir ise icin ben benim bizim sizin onun ' +
  'yaparim yapabilirim olabilir oluyor olur mu miyim misin icinde uzerinde neler nerede').split(' '));
export function kelimeler(q) {
  const t = norm(q).split(' ').filter((w) => w.length >= 2);
  const anlamli = t.filter((w) => !DOLGU.has(w));
  return [...new Set((anlamli.length ? anlamli : t))].slice(0, 8);
}
// Kök: Türkçe eklerin çoğunu tolere etmek için uzun kelimelerde ilk 5 harf, kısa kelimelerde kelimenin tamamı
const kok = (w) => (w.length >= 7 ? w.slice(0, 5) : w.length >= 5 ? w.slice(0, 4) : w);

// Metindeki kelimelerin başlangıcında kök var mı (kelime ortasında eşleşme yok: "ekim" ≠ "sekim")
function gecer(alan, k) { return alan.startsWith(k) || alan.includes(' ' + k); }

function puanla(dok, kel, ifade, agirlik) {
  let puan = 0, eslesen = 0;
  for (let i = 0; i < kel.length; i++) {
    const k = kok(kel[i]);
    let p = 0;
    if (gecer(dok.b, k)) p += 10;
    if (gecer(dok.e, k)) p += 5;
    if (gecer(dok.o, k)) p += 3;
    if (gecer(dok.g, k)) p += 1;
    if (p) { eslesen++; puan += p * agirlik[i]; }
  }
  if (!eslesen) return [0, 0];
  if (ifade.length > 3) { if (dok.b.includes(ifade)) puan += 25; else if (dok.g.includes(ifade) || dok.o.includes(ifade)) puan += 8; }
  return [puan * (0.6 + 0.4 * eslesen / kel.length), eslesen];
}

let YD = null, SD = null;
export function dizinSifirla() { YD = null; SD = null; }
async function yaziDizini(db) {
  if (YD && Date.now() - YD.t < 300000) return YD.l;
  const r = (await db.prepare(`SELECT y.id, y.slug, y.baslik, y.ozet, y.kisaca, y.gorsel, y.gorsel_alt, y.yayin_ts, y.okunma, y.tur, y.etiketler, y.odak, y.sss, y.govde, y.kategori_id, k.slug kslug, k.ad kad, k.renk krenk
    FROM b_yazi y LEFT JOIN b_kategori k ON k.id = y.kategori_id WHERE ${YAYINDA.replace(/durum|yayin_ts/g, (m) => 'y.' + m)}`).bind(Date.now()).all()).results;
  const l = r.map((y) => ({
    y: { id: y.id, slug: y.slug, baslik: y.baslik, ozet: y.ozet, gorsel: y.gorsel, gorsel_alt: y.gorsel_alt, yayin_ts: y.yayin_ts, okunma: y.okunma, tur: y.tur, kategori_id: y.kategori_id, kslug: y.kslug, kad: y.kad, krenk: y.krenk, dk: okumaDk(y.govde) },
    b: norm(y.baslik), e: norm([y.odak, y.etiketler, y.kad].join(' ')), o: norm([y.ozet, y.kisaca, y.sss].join(' ')), g: norm(y.govde).slice(0, 20000),
  }));
  YD = { t: Date.now(), l };
  return l;
}
async function soruDizini(db) {
  if (SD && Date.now() - SD.t < 300000) return SD.l;
  const [sr, cv] = await Promise.all([
    db.prepare("SELECT s.id, s.slug, s.baslik, s.metin, s.ts, s.oy, s.goruntulenme, s.cevap_sayisi, s.cozum_id, s.kategori_id, k.ad kad, k.slug kslug FROM b_soru s LEFT JOIN b_kategori k ON k.id = s.kategori_id WHERE s.durum = 'onayli'").all(),
    db.prepare("SELECT a.soru_id, a.metin FROM b_cevap a JOIN b_soru s ON s.id = a.soru_id WHERE a.durum = 'onayli' AND s.durum = 'onayli'").all(),
  ]);
  const cevap = {};
  for (const a of cv.results) cevap[a.soru_id] = (cevap[a.soru_id] || '') + ' ' + a.metin;
  const l = sr.results.map((s) => ({ s, b: norm(s.baslik), e: norm(s.kad), o: norm(s.metin), g: norm(cevap[s.id] || '').slice(0, 8000) }));
  SD = { t: Date.now(), l };
  return l;
}

function sirala(dizin, q, ek, siki = false) {
  const kel = kelimeler(q);
  if (!kel.length) return [];
  const ifade = norm(q);
  // Nadir kelime daha belirleyicidir: "sarımsak nasıl ekilir" aramasında "sarımsak", "ekilir"den ağır basar
  const agirlik = kel.map((w) => { const k = kok(w); let df = 0; for (const d of dizin) if (gecer(d.b, k) || gecer(d.e, k) || gecer(d.o, k) || gecer(d.g, k)) df++; const v = Math.log(1 + dizin.length / (1 + df)); return v * v; });
  const out = [];
  const kokler = kel.map(kok);
  for (const d of dizin) {
    // Sıkı mod (yazarken öneri): en az bir kelime başlıkta, konu etiketlerinde ya da özette geçmeli
    if (siki && !kokler.some((k) => gecer(d.b, k) || gecer(d.e, k) || gecer(d.o, k))) continue;
    const [p, e] = puanla(d, kel, ifade, agirlik);
    if (p > 0) out.push([p + ek(d), d, e]);
  }
  // Önce bütün kelimeleri içeren sonuçlar; bunlar azsa (3'ten az) kelimelerin en az yarısını içerenler de gösterilir
  const tam = out.filter((x) => x[2] === kel.length);
  const secilen = tam.length >= 3 || kel.length === 1 ? tam : out.filter((x) => x[2] >= Math.ceil(kel.length / 2));
  return secilen.sort((a, b) => b[0] - a[0]);
}
// Yazılar: ilgiye göre; eşit ilgide çok okunan öne (okunma etkisi küçük tutulur)
export async function yaziAra(db, q, { kat = null, n = 30, tur = null, siki = false, tam = false } = {}) {
  let l = await yaziDizini(db);
  if (kat) l = l.filter((d) => d.y.kategori_id === kat);
  if (tur) l = l.filter((d) => d.y.tur === tur);
  let r = sirala(l, q, (d) => Math.log10(1 + (d.y.okunma || 0)), siki);
  // tam: aranan bütün kelimeler başlıkta ya da konu etiketlerinde geçmeli (takvimde işi doğru yazıya bağlamak için)
  if (tam) { const kk = kelimeler(q).map(kok); r = r.filter(([, d]) => kk.every((k) => gecer(d.b, k) || gecer(d.e, k))); }
  return r.slice(0, n).map(([, d]) => d.y);
}
// Bütün yayındaki yazılar ve onaylı sorular (dizinden; veritabanına gitmez)
export async function tumYazilar(db) { return (await yaziDizini(db)).map((d) => d.y); }
export async function tumSorular(db) { return (await soruDizini(db)).map((d) => d.s); }
// Sorular: ilgiye göre; çözülmüş ve çok görüntülenen sorular hafifçe öne
export async function soruAra(db, q, { n = 200, siki = false } = {}) {
  const l = await soruDizini(db);
  return sirala(l, q, (d) => (d.s.cozum_id ? 1 : 0) + Math.log10(1 + (d.s.goruntulenme || 0)), siki).slice(0, n).map(([, d]) => d.s);
}
