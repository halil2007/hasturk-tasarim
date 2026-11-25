// Kendin Tasarla hesap motorunu (public/tasarla/motor.js) üretim tarafının kayıtlarına karşı denetler.
// Kayıtlar: veri/tasarla/kahin-profil.json (profil yapılar), veri/tasarla/kahin-yatak.json (sebze yatağı), veri/tasarla/kahin-bilgi.json (bilgi kutuları).
// Her kayıt için tasarım kodu motora verilir; parça listesi, konnektör listesi, ölçü satırları ve kod birebir aynı olmalı.
// Kullanım: node scripts/tasarla-dogrula.mjs   (hata varsa çıkış kodu 1)
import { readFileSync, existsSync } from 'node:fs';
import { hesapla, kodAc, yatakKodAc, yatakListe, yatakKod, uretimKodu, urunTasarimi } from '../public/tasarla/motor.js';
import { kutular, bilgiSatir } from '../public/tasarla/bilgi.js';

const esit = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let ok = 0, hata = 0;
const yaz = (k, fark) => { hata++; if (hata <= 10) console.log('FARK', k, JSON.stringify(fark).slice(0, 600)); };

const prof = JSON.parse(readFileSync('veri/tasarla/kahin-profil.json', 'utf8')).kayit;
for (const r of prof) {
  const a = kodAc(r.kod); if (!a) { yaz(r.kod, 'kod açılamadı'); continue; }
  const s = hesapla(a.m, a.P), fark = [];
  if (!esit(s.parca, r.parca)) fark.push(['parça', s.parca, r.parca]);
  if (!esit(s.kon, r.kon)) fark.push(['konnektör', s.kon, r.kon]);
  if (s.olcu !== r.olcu) fark.push(['ölçü', s.olcu, r.olcu]);
  if (s.alt !== r.alt) fark.push(['alt', s.alt, r.alt]);
  if (uretimKodu(s.kod) !== r.kod) fark.push(['kod', s.kod, r.kod]);
  if (fark.length) yaz(r.kod, fark); else ok++;
}
if (existsSync('veri/tasarla/kahin-yatak.json')) {
  for (const r of JSON.parse(readFileSync('veri/tasarla/kahin-yatak.json', 'utf8')).kayit) {
    const D = yatakKodAc(r.kod); if (!D) { yaz(r.kod, 'kod açılamadı'); continue; }
    const L = yatakListe(D), fark = [];
    if (!esit(L.parca, r.parca)) fark.push(['parça', L.parca, r.parca]);
    if (!esit(L.yatak, r.kon)) fark.push(['yatak', L.yatak, r.kon]);
    if (L.olcu !== r.olcu) fark.push(['ölçü', L.olcu, r.olcu]);
    if (L.alt !== r.alt) fark.push(['alt', L.alt, r.alt]);
    if (uretimKodu(yatakKod(D)) !== r.kod) fark.push(['kod', yatakKod(D), r.kod]);
    if (fark.length) yaz(r.kod, fark); else ok++;
  }
}
// Bilgi kutuları (kapasite, verim, kaplama hesabı, uyarılar): bilgi.js çıktısı üretim aracının ekranındaki satırlarla aynı olmalı
if (existsSync('veri/tasarla/kahin-bilgi.json')) {
  for (const r of JSON.parse(readFileSync('veri/tasarla/kahin-bilgi.json', 'utf8')).kayit) {
    const a = kodAc(r.kod); if (!a) { yaz(r.kod, 'kod açılamadı'); continue; }
    const R = hesapla(a.m, a.P), K = kutular(a.m, a.P, R), bizde = [];
    K.kutu.forEach((b) => b.forEach((e) => bizde.push(bilgiSatir(e)))); if (K.parcaNot) bizde.push(K.parcaNot); bizde.push(K.dip);
    const fark = []; if (!esit(bizde, r.yaprak)) { const i = bizde.findIndex((x, j) => x !== r.yaprak[j]); fark.push(['bilgi', bizde[i], r.yaprak[i]]); }
    if (r.ayar) { const ay = []; (K.ayar || []).forEach((b) => b.forEach((e) => ay.push(bilgiSatir(e)))); if (!esit(ay, r.ayar)) fark.push(['ayar', ay, r.ayar]); }
    if (fark.length) yaz(r.kod, fark); else ok++;
  }
}
// Mağazadaki sera ürünleri (docs/bilgi/urunler-hasturk.json): ürün adresinden açılan tasarımın ölçüsü ve paket içeriği (profil boyları ve adetleri, menteşe, civata seti)
// ürün açıklamasındaki "Paket İçeriği" ile aynı olmalı. Böylece hazır ürün ile Kendin Tasarla aynı yapıyı anlatır.
if (existsSync('docs/bilgi/urunler-hasturk.json')) {
  let n = 0;
  for (const u of JSON.parse(readFileSync('docs/bilgi/urunler-hasturk.json', 'utf8'))) {
    const g = String(u.adres).match(/sera-iskeleti-(olimpos|pergamon|aspendos|likya)-(\d)-(\d\d)-x-(\d)-(\d\d)-m/); if (!g) continue; n++;
    const T = urunTasarimi(u.adres); if (!T) { yaz(u.adres, 'ürün adresinden tasarım bulunamadı'); continue; }
    const r = hesapla(T.m, { ...T.P }), fark = [], pk = (u.aciklama.split('Paket İçeriği')[1] || '').split('Sık Sorulan')[0], bekle = {}, bizde = {};
    for (const m of pk.matchAll(/(\d+) adet galvaniz profil ([\d,]+) cm/g)) bekle[m[2]] = +m[1];
    for (const row of r.parca) { const m = row[0].match(/^Profil ([\d,]+) cm/); if (m) bizde[m[1]] = parseInt(row[1], 10); }
    if (!esit(bekle, bizde)) fark.push(['profil boyları', bizde, bekle]);
    const hn = +((pk.match(/(\d+) adet kelebek menteşe/) || [])[1] || 0), cv = +((pk.match(/(\d+) adet civata-somun seti/) || [])[1] || 0);
    if (hn !== parseInt((r.parca.find((x) => x[0] === 'Kelebek menteşe') || [0, 0])[1], 10) || cv !== parseInt(r.parca.find((x) => x[0] === 'Civata somun seti')[1], 10)) fark.push(['menteşe/civata', hn, cv]);
    if (!u.ad.includes(g[2] + ',' + g[3] + ' × ' + g[4] + ',' + g[5] + ' m')) fark.push(['başlıkta ölçü yok', u.ad]);
    if (fark.length) yaz(u.adres, fark); else ok++;
  }
  if (n !== 11) yaz('sera ürünleri', 'beklenen 11 sera ürünü, bulunan ' + n);
}
console.log(`Kendin Tasarla motoru: ${ok} kayıt tuttu, ${hata} fark`);
process.exit(hata ? 1 : 0);
