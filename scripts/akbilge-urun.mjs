// Bilge Bey ürün kartları: docs/bilgi/urunler-hasturk.json (ikas açıklamaları) → src/akbilge-urun.json { adres: açıklama }
// Ürün adı geçen ya da ürün sayfasında sorulan kullanım sorusunda yapay zekâya doğrulanmış bilgi olarak verilir;
// "var mı / fiyatı" sorusunda kısa tanıtım cümlesi buradan alınır. Kullanım: node scripts/akbilge-urun.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const L = JSON.parse(readFileSync('docs/bilgi/urunler-hasturk.json', 'utf8'));
const out = {};
for (const x of L) {
  if (!x.adres || !x.aciklama) continue;
  const t = String(x.aciklama).split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  out[x.adres] = t.length > 1800 ? t.slice(0, 1800).replace(/\s+\S*$/, '') + '…' : t;
}
writeFileSync('src/akbilge-urun.json', JSON.stringify(out));
console.log('Bilge Bey ürün kartları:', Object.keys(out).length, 'ürün,', Math.round(JSON.stringify(out).length / 1024), 'KB');
