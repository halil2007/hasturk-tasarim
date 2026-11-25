// Bilge Bey: blog.hasturkgubre.com.tr yazılarının "Sık Sorulan Sorular" bölümleri ve soru-cevap köşesindeki cevaplarımız.
// Kaynak: src/blog/icerik (sitedeki ilk yazılar) ve veri/blog-paket/*.txt (paketler). Yazılar kendi ekibimizindir; yine de
// eski blog süzgeciyle aynı kurallar geçerli: gübre/ilaç miktarı veren cevaplar alınmaz (doğrulanmış kullanım tabloları
// geçerli), yüzde/verim iddiası olanlar alınmaz, iç bağlantılar düz metne çevrilir. Cevaplarda blog bağlantısı verilmez
// (yazının yayın saati gelmemiş olabilir). Çıktı: bilgi/blog-yeni-sss.json (akbilge-havuz.mjs okur).
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { YENIDEN, YENI, HAFTA, SORU_EK } from '../src/blog/icerik/index.js';

const prods = JSON.parse(await readFile('public/products.json', 'utf8')).items;
const lc = (s) => s.toLocaleLowerCase('tr-TR');
// Cevapta adı geçen ürün (akbilge-blog.mjs ile aynı kısa ad kuralı)
const MARKA = /^(has ?türk|hasturk|hg|altınvadi|arzuman|uzman|arom|tarm|florist|chrysamed|gartengold|güzelbahçe|klasmann|qts|icl)\s+/i;
const kisa = (n) => lc(n).replace(/\s*[|–—].*$/, '').replace(/\s+-\s+.*$/, '').replace(/\(.*?\)/g, ' ').replace(/\s+\d+([.,]\d+)?\s*(gr|g|kg|lt|l|ml|adet|cm)\b.*$/i, '').replace(MARKA, '').replace(/\s+/g, ' ').trim();
const URUN = prods.filter((p) => p.st > 0).map((p) => ({ s: p.s, k: kisa(p.n) })).filter((x) => x.k.length >= 9 && !/^(mama|kedi|köpek)/.test(x.k))
  .sort((a, b) => b.k.length - a.k.length);
const DOZ = /(gübre|gubre|besin|ilaç|hümik|humik|leonardit|guano|solucan)[^?]{0,60}(ne kadar|kaç (gram|kg|litre|ml|cc)|doz|miktar|oran)|(ne kadar|kaç (gram|kg|litre|ml)|doz|miktar)[^?]{0,60}(gübre|besin|ilaç|solucan|hümik)/i;
const SAYILI_DOZ = /\d[\d.,–-]*\s*(kg|g|gr|gram|ml|cc|l|lt|litre)\s*\/?\s*(dekar|da|m²|m2|fidan|ağaç|bitki|saksı|ton)|\d[\d.,–-]*\s*(ml|cc)\b/i;
const IDDIA = /%\s?\d|\d\s?%|mucize|garanti|kesin(likle)? (çözüm|sonuç)|verim(i|de)? (artış|art[ıa]r)/i;

// Yazılar: { slug, baslik, sss: [{ soru, cevap }] }
const yazilar = [];
const sssAyir = (t) => String(t || '').split(/\n\s*\n/).map((b) => { const m = b.match(/^\s*S:\s*([\s\S]+?)\n\s*C:\s*([\s\S]+)$/); return m ? { soru: m[1].trim(), cevap: m[2].trim() } : null; }).filter(Boolean);
for (const y of [...YENIDEN, ...YENI, ...HAFTA]) yazilar.push({ slug: y.slug, baslik: y.baslik, sss: sssAyir(y.sss) });
const sorular = SORU_EK.flatMap((s) => (s.cevaplar || []).slice(0, 1).map((c) => ({ slug: 'soru', baslik: s.baslik, sss: [{ soru: s.baslik, cevap: c.metin || c.cevap || '' }] })));
for (const f of (await readdir('veri/blog-paket')).filter((f) => f.endsWith('.txt')).sort()) {
  const metin = await readFile('veri/blog-paket/' + f, 'utf8');
  for (const blok of metin.split(/^### (?=YAZI$|SORU$)/m).slice(1)) {
    const alan = (k) => ((blok.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1] || '').trim();
    if (blok.startsWith('YAZI')) {
      const s = blok.split(/^@sss\s*$/m)[1] || '';
      yazilar.push({ slug: alan('slug'), baslik: alan('baslik'), sss: sssAyir(s.split(/^### /m)[0]) });
    } else {
      const c = (blok.split(/^@cevap .*$/m)[1] || '').trim();
      if (c) sorular.push({ slug: 'soru', baslik: alan('baslik'), sss: [{ soru: alan('baslik'), cevap: c }] });
    }
  }
}

const sss = [], disarda = { doz: 0, iddia: 0, uzunluk: 0, belirsiz: 0, tekrar: 0 }, gorulen = new Set();
const norm = (q) => lc(q).replace(/[^a-zçğıöşü0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
for (const y of [...yazilar, ...sorular]) for (const x of y.sss) {
  const q = x.soru.replace(/\s+/g, ' ').trim();
  // İç bağlantılar düz metne: [domates sulama](/domates-sulama) → domates sulama
  const a = x.cevap.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\[ürün:[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (DOZ.test(q) || (SAYILI_DOZ.test(a) && /gübre|besin|ilaç|hümik|solucan|leonardit|guano/i.test(q + ' ' + a)) || /ilaç|ilac|pestisit|insektisit|fungisit/i.test(q + ' ' + a) && /\d/.test(a)) { disarda.doz++; continue; }
  if (IDDIA.test(a)) { disarda.iddia++; continue; }
  if (a.length < 40 || a.length > 1400 || q.length > 140) { disarda.uzunluk++; continue; }
  if (q.split(/\s+/).filter((w) => w.length >= 4).length < 2) { disarda.belirsiz++; continue; }
  const n = norm(q); if (gorulen.has(n)) { disarda.tekrar++; continue; } gorulen.add(n);
  const metinLc = lc(q + ' ' + a), urunler = [];
  for (const u of URUN) if (urunler.length < 3 && metinLc.includes(u.k) && !urunler.includes(u.s)) urunler.push(u.s);
  sss.push({ kaynak: y.slug, baslik: y.baslik, soru: q, cevap: a, urunler });
}
await writeFile('bilgi/blog-yeni-sss.json', JSON.stringify({ _aciklama: 'blog.hasturkgubre.com.tr SSS ve soru-cevap köşesi cevapları (akbilge-blog-yeni.mjs). Gübre/ilaç miktarı veren ve yüzde/verim iddiası içeren cevaplar hariç.', kayit: sss.length, disarda, sss }, null, 1) + '\n');
console.log(`Yeni blog: ${yazilar.length} yazı + ${sorular.length} soru-cevap → ${sss.length} hazır cevap adayı; dışarıda: ${JSON.stringify(disarda)}`);
