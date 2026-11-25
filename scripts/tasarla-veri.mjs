// "Kendin Tasarla" sipariş ürününün seçenekleri → public/tasarla/secenek.json (tasarım aracı okur).
// Kaynak: ürün sayfasının __NEXT_DATA__ verisi (ikas seçenek seti; fiyatlar sitede herkese açık).
// Ürün bir taban fiyat + her profil boyu ve her konnektör için birer seçenekten oluşur. Bir seçeneğin değerleri adet
// basamaklarıdır (1, 2, 3, 4, 10, 20 … 4000); istenen adet bu değerlerin toplamı olarak seçilir. "Tasarım Kodu" metin
// alanına tasarım kodu ve parça listesi yazılır.
// Kullanım: node scripts/tasarla-veri.mjs   (ham=1 ile tüm seçenekleri ekrana döker)
import { writeFile, mkdir } from 'node:fs/promises';
const SITE = process.env.SITE_URL || 'https://hasturkgubre.com.tr';
const SLUG = process.env.SLUG || 'kendi-serani-tasarla';
const html = await (await fetch(`${SITE}/${SLUG}`, { headers: { 'user-agent': 'Mozilla/5.0 (HasTurk urun-senkron)' } })).text();
const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (!m) throw new Error('__NEXT_DATA__ bulunamadı');
let urun = null;
(function walk(o, d) { if (urun || !o || typeof o !== 'object' || d > 16) return; if (o.metaData && o.metaData.slug === SLUG && o.productOptionSet) { urun = o; return; } for (const k in o) walk(o[k], d + 1); })(JSON.parse(m[1]), 0);
if (!urun) throw new Error('ürün / seçenek seti bulunamadı');
const set = urun.productOptionSet, v = urun.variants[0], fiyat = (v.prices || [])[0] || {};
const temiz = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const sayi = (s) => { const x = temiz(s).replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/); return x ? +x[0] : null; };
const tum = []; (function topla(L) { for (const o of L || []) { tum.push(o); topla(o.childOptions); } })(set.options);
if (process.env.ham) for (const o of tum) console.log(o.type, o.id, JSON.stringify(temiz(o.name)), o.isRequired ? 'zorunlu' : '', 'çoklu:', JSON.stringify(o.selectSettings && { min: o.selectSettings.minSelect, max: o.selectSettings.maxSelect, tip: o.selectSettings.type }),
  ((o.selectSettings || {}).values || []).filter((x) => !x.deleted).map((x) => `${temiz(x.value)}=${x.price}`).join(' '));
const deger = (o) => ((o.selectSettings || {}).values || []).filter((x) => !x.deleted).map((x) => ({ id: x.id, ad: temiz(x.value), adet: sayi(x.value), fiyat: x.price })).filter((x) => x.adet > 0 && x.fiyat != null).sort((a, b) => a.adet - b.adet);
const secim = tum.filter((o) => o.type === 'CHOICE' || o.selectSettings);
const profil = {}, kon = {}, diger = [];
for (const o of secim) {
  const ad = temiz(o.name), d = deger(o), coklu = !!(o.selectSettings && (o.selectSettings.maxSelect == null || o.selectSettings.maxSelect > 1)), kayit = { id: o.id, ad, coklu, d };
  const pc = ad.match(/PC\s*0*(\d{1,3})/i), pr = ad.match(/profil[^\d]*(\d+(?:[.,]\d)?)/i) || ad.match(/^(\d+(?:[.,]\d)?)\s*cm/i);
  // Saçak / mahya konnektörlerinin iki türü var (-1 yatay bağlı ya da dikmeli, -2 bağsız ya da dikmesiz). Adda "PC008-2" ya da
  // "No:8-1" yazar; eki olmayan PC008–PC012 seçeneği -1 sayılır.
  const ek = ad.match(/PC\s*0*\d+\s*-\s*(\d)/i) || ad.match(/No\s*:\s*\d+\s*-\s*(\d)/i), kk = pc && 'PC' + String(pc[1]).padStart(3, '0') + (ek ? '-' + ek[1] : +pc[1] >= 8 ? '-1' : '');
  if (pc) { if (kon[kk]) diger.push({ ...kayit, not: kk + ' iki kez tanımlı' }); else kon[kk] = kayit; } else if (pr) profil[String(+pr[1].replace(',', '.'))] = kayit; else diger.push(kayit);
}
const kodOpt = tum.find((o) => /TEXT/i.test(o.type) && /kod|tasar|not/i.test(o.name)) || tum.find((o) => /TEXT/i.test(o.type));
const out = { guncel: new Date().toISOString().slice(0, 10), urun: urun.id, varyant: v.id, set: set.id, taban: fiyat.discountPrice || fiyat.sellPrice || 0, profil, kon, diger,
  kod: kodOpt ? { id: kodOpt.id, ad: temiz(kodOpt.name), max: (kodOpt.textSettings || {}).max || null } : null };
await mkdir('public/tasarla', { recursive: true });
await writeFile(process.env.OUT || 'public/tasarla/secenek.json', JSON.stringify(out) + '\n');
console.log(`Kendin Tasarla ürünü: taban ${out.taban} TL · profil ${Object.keys(profil).join(', ')} · konnektör ${Object.keys(kon).join(', ')} · diğer ${diger.map((x) => x.ad).join(' | ') || 'yok'} · kod alanı ${out.kod ? out.kod.ad : 'YOK'}`);
