// Sera ürünlerini üreticinin sitesiyle (profimod.com) ve Kendin Tasarla aracıyla karşılaştırır. Yalnız okur; mağazaya ve üreticiye yazmaz.
// Üretici tarafı: sitemap-profimod.xml'deki sera ürün sayfaları (ad, fiyat, SKU, ölçü satırları, paket içeriği; sayfadaki JSON-LD ve açıklama).
// Bizim taraf: public/products.json (ad, fiyat, stok), docs/bilgi/urunler-hasturk.json (açıklama), public/tasarla (urunTasarimi → parça listesi ve araç fiyatı).
// Kullanım: node scripts/sera-urun-karsilastir.mjs   (ağ gerekir; fark varsa çıkış kodu 1)
import { readFileSync } from 'node:fs';
import { hesapla, urunTasarimi } from '../public/tasarla/motor.js';
import { fiyatPlan } from '../public/tasarla/fiyat.js';

const KOK = 'https://www.profimod.com', SEC = JSON.parse(readFileSync(new URL('../public/tasarla/secenek.json', import.meta.url), 'utf8'));
const PJ = JSON.parse(readFileSync(new URL('../public/products.json', import.meta.url), 'utf8')), DOC = JSON.parse(readFileSync(new URL('../docs/bilgi/urunler-hasturk.json', import.meta.url), 'utf8'));
const al = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); };
const duz = (h) => h.replace(/<(?:h2|h3)[^>]*>/g, '\n## ').replace(/<li[^>]*>/g, '\n- ').replace(/<p[^>]*>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').split('\n').map((x) => x.trim()).filter((x) => x && x !== '-');
const sitemap = await al(KOK + '/sitemap-profimod.xml'), URUNLER = [...sitemap.matchAll(/<loc>(https:\/\/www\.profimod\.com\/urun\/((?:olimpos|pergamon|aspendos|likya)-sera-(\d)(\d\d)x(\d)(\d\d))\.html)<\/loc>/g)];
const bizSlug = (g) => PJ.items.find((i) => i.s.includes(`sera-iskeleti-${g[1].split('-')[0]}-${g[2]}-${g[3]}-x-${g[4]}-${g[5]}-m`));
let fark = 0; const yaz = (s, ...a) => { fark++; console.log('FARK', s, ...a); };
console.log('Üreticide sera ürünü:', URUNLER.length, '· bizde (Sera İskeletleri):', PJ.items.filter((i) => /^galvaniz-moduler-sera-iskeleti-/.test(i.s)).length);
const tablo = [];
for (const u of URUNLER) {
  const g = u.slice(1), html = await al(g[0]), ld = JSON.parse(html.match(/id="ld-static">(.*?)<\/script>/s)[1])['@graph'].find((x) => x['@type'] === 'Product'), fiyat = +ld.offers.price;
  const ar = html.slice(html.indexOf('<article class="pd-art">'), html.indexOf('</article>')), satir = duz(ar), paket = [];
  let acik = false; for (const x of satir) { if (x.startsWith('## Paket')) { acik = true; continue; } if (x.startsWith('## ') && acik) break; if (acik) paket.push(x.replace(/^- /, '')); }
  const bizim = bizSlug(g), doc = bizim && DOC.find((d) => d.adres === bizim.s);
  if (!bizim) { yaz(g[1], 'bizde bu ölçüde ürün yok'); continue; }
  if (bizim.p !== fiyat) yaz(g[1], 'fiyat: bizde', bizim.p, 'üreticide', fiyat);
  if (!bizim.st) yaz(g[1], 'stokta değil');
  const pk = (doc.aciklama.split('Paket İçeriği')[1] || '').split('Sık Sorulan')[0].split('\n').map((x) => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean);
  if (JSON.stringify(pk) !== JSON.stringify(paket)) yaz(g[1], 'paket içeriği farklı', JSON.stringify(pk), JSON.stringify(paket));
  const T = urunTasarimi(bizim.s), r = hesapla(T.m, { ...T.P }), fp = fiyatPlan(r, SEC, r.ad);
  tablo.push({ urun: g[1], 'üretici fiyat': fiyat, 'bizde ürün': bizim.p, kod: r.kod, 'araç fiyatı': fp.tamam ? fp.birim : null, 'araç-ürün': fp.tamam ? fp.birim - bizim.p : null, SKU: ld.sku });
}
console.table(tablo);
console.log(fark ? fark + ' fark' : 'Üretici sera ürünleri ile mağaza ürünleri (ad dışında) aynı.');
process.exit(fark ? 1 : 0);
