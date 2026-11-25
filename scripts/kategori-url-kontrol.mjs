// Canlı kategori sayfalarını tek tek açar; "sayfa bulunamadı" (404) ya da hata veren kategorileri listeler.
// Kullanım: node scripts/kategori-url-kontrol.mjs [https://hasturkgubre.com.tr public/products.json] [https://tarim-dunyasi.com public/tarim/products.json]
// Yalnız okur (GET). Kategori listesi senkron verisinden (public/products.json) gelir: ikas'ta yeni açılan kategori, senkron çalışana
// kadar bu listede yoktur; önce "ikas ürünlerini senkronla" çalıştırılmalıdır.
import fs from 'node:fs';
const arg = process.argv.slice(2);
const siteler = arg.length ? [[arg[0], arg[1] || 'public/products.json']] : [['https://hasturkgubre.com.tr', 'public/products.json'], ['https://tarim-dunyasi.com', 'public/tarim/products.json']];
let bozuk = 0;
for (const [origin, dosya] of siteler) {
  const d = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const cats = d.cats || [], items = d.items || [];
  const kids = {};
  for (const c of cats) (kids[c.p || ''] = kids[c.p || ''] || []).push(c.id);
  const alt = (id) => [id, ...(kids[id] || []).flatMap(alt)];
  const sayi = (c) => { const s = new Set(alt(c.id)); return items.filter((p) => (p.c || []).some((x) => s.has(x))).length; };
  console.log(`\n== ${origin}: ${cats.length} kategori (veri tarihi ${d.updated})`);
  const sonuc = [];
  const kuyruk = [...cats];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (kuyruk.length) {
      const c = kuyruk.shift();
      try {
        const r = await fetch(`${origin}/${c.s}`, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 kategori-kontrol' } });
        const t = r.status === 200 ? await r.text() : '';
        const yok = r.status === 404 || /sayfa bulunamad|page not found/i.test(t.slice(0, 200000)) && !/category-products|desktop-filters|data-id/.test(t);
        sonuc.push({ ad: c.n, slug: c.s, durum: r.status, urun: sayi(c), yok });
      } catch (e) { sonuc.push({ ad: c.n, slug: c.s, durum: 'HATA ' + (e.cause?.code || e.message), urun: sayi(c), yok: true }); }
    }
  }));
  const kotu = sonuc.filter((s) => s.yok || (typeof s.durum === 'number' && s.durum >= 400));
  for (const s of kotu.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))) console.log(`  BULUNAMADI  ${s.durum}  ${s.ad}  /${s.slug}  (ürün: ${s.urun})`);
  console.log(`  ${sonuc.length - kotu.length}/${sonuc.length} kategori açılıyor, ${kotu.length} sorunlu`);
  bozuk += kotu.length;
}
process.exit(bozuk ? 1 : 0);
