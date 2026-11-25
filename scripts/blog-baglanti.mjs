// Yazı yazarken iç bağlantı bulmak için: node scripts/blog-baglanti.mjs anahtar1 anahtar2 ...
// Var olan yazılardan (site + paketler) slug | başlık | yayın tarihi listeler. Yeni yazıdan yalnız yayın tarihi kendi
// yayın tarihinden önce olan yazılara bağlantı verilebilir (blog-paket --kontrol "yayın anında açık iç bağlantı" kuralı).
import fs from 'node:fs';
import { TOHUM_YAZI, TOHUM_YAZI2 } from '../src/blog/tohum.js';
import { YENI, HAFTA } from '../src/blog/icerik/index.js';
const tum = new Map();
for (const y of [...TOHUM_YAZI, ...TOHUM_YAZI2, ...YENI, ...HAFTA]) tum.set(y.slug, { baslik: y.baslik, yayin: y.yayin || '' });
for (const f of fs.readdirSync('veri/blog-paket').filter((f) => f.endsWith('.txt'))) {
  for (const b of fs.readFileSync('veri/blog-paket/' + f, 'utf8').split(/^### YAZI\s*$/m).slice(1)) {
    const g = (k) => (new RegExp('^' + k + ':\\s?(.*)$', 'm').exec(b) || [])[1] || '';
    tum.set(g('slug'), { baslik: g('baslik'), yayin: g('yayin'), dosya: f });
  }
}
const tr = (s) => s.toLocaleLowerCase('tr-TR');
const anah = process.argv.slice(2).map(tr);
for (const [s, v] of tum) if (anah.some((a) => tr(s + ' ' + v.baslik).includes(a))) console.log(s + ' | ' + v.baslik.slice(0, 80) + ' | ' + String(v.yayin).slice(0, 16));
