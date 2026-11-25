// Yazılardaki yazı içi ürün kartlarını kalite kuralına uydurur (src/blog/kalite.js > urunYerlestir):
// giriş bölümündeki ve metnin ilk %20'sindeki kartlar bilginin arkasına taşınır, uzunluğa göre fazla kartlar çıkar.
// Paket dosyaları (veri/blog-paket) ve src/blog içindeki yazı dosyaları yerinde düzenlenir. Kullanım: node scripts/blog-urun-yerlestir.mjs [--dene]
import fs from 'node:fs';
import zlib from 'node:zlib';
import { urunYerlestir, kaliteKontrol } from '../src/blog/kalite.js';
const dene = process.argv.includes('--dene');
const bozuk = (y) => kaliteKontrol(y).some((k) => !k.ok && (k.kod === 'urun-sira' || k.kod === 'urun-sayi'));
let paket = 0, js = 0; const atlanan = [];
// 1) Paket dosyaları: @govde … @sss arası
for (const f of fs.readdirSync('veri/blog-paket').filter((f) => f.endsWith('.txt'))) {
  const yol = 'veri/blog-paket/' + f; let s = fs.readFileSync(yol, 'utf8'); let degisti = false;
  const parca = s.split(/(?=^### (?:YAZI|SORU)\s*$)/m);
  for (let i = 0; i < parca.length; i++) {
    const b = parca[i]; if (!/^### YAZI/.test(b)) continue;
    const m = b.match(/^@govde\n([\s\S]*?)\n@sss/m); if (!m) continue;
    const g = (k) => (new RegExp('^' + k + ':\\s?(.*)$', 'm').exec(b) || [])[1] || '';
    const y = { slug: g('slug'), odak: g('odak'), baslik: g('baslik'), govde: m[1] };
    if (!bozuk(y)) continue;
    const yeni = urunYerlestir(m[1]);
    if (yeni !== m[1]) { parca[i] = b.replace(m[0], '@govde\n' + yeni + '\n@sss'); degisti = true; paket++; }
  }
  if (degisti && !dene) fs.writeFileSync(yol, parca.join(''));
}
// 2) src/blog içindeki yazılar: gövde dosyada aynen geçiyorsa değiştirilir
const { TOHUM_YAZI, TOHUM_YAZI2 } = await import('../src/blog/tohum.js');
const ic = await import('../src/blog/icerik/index.js');
const dosyalar = ['src/blog/tohum.js', ...fs.readdirSync('src/blog/icerik').filter((f) => f.endsWith('.js')).map((f) => 'src/blog/icerik/' + f)];
const icerik = Object.fromEntries(dosyalar.map((d) => [d, fs.readFileSync(d, 'utf8')]));
for (const y of [...TOHUM_YAZI, ...TOHUM_YAZI2, ...ic.YENIDEN, ...ic.YENI, ...ic.HAFTA]) {
  if (!y.govde || !bozuk(y)) continue;
  const yeni = urunYerlestir(y.govde); if (yeni === y.govde) continue;
  const d = dosyalar.find((d) => icerik[d].includes(y.govde));
  if (!d) { atlanan.push(y.slug); continue; }
  icerik[d] = icerik[d].replace(y.govde, () => yeni); js++;
}
if (!dene) for (const d of dosyalar) fs.writeFileSync(d, icerik[d]);
console.log(`paket: ${paket} yazı, kaynak dosya: ${js} yazı düzenlendi${dene ? ' (deneme, yazılmadı)' : ''}`);
if (atlanan.length) console.log('gövdesi dosyada aynen bulunamadı:', atlanan.join(' '));
