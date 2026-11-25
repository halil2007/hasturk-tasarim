// Yazı sonu ürün önerilerini depodaki tüm yazılar için hesaplar ve özetler (src/blog/urun.js > oneriler).
// Kullanım: node scripts/urun-oneri-denetle.mjs [--liste dosya.txt]
// Çıktı: kaç yazıda kaç ürün çıktığı, en sık önerilen ürünler, aynı aileden iki ürün olan yazı sayısı.
import fs from 'fs'; import zlib from 'zlib';
const K = new URL('../src/blog/', import.meta.url);
const t = await import(new URL('tohum.js', K)); const ic = await import(new URL('icerik/index.js', K)); const { PAKETLER } = await import(new URL('icerik/paket.js', K));
const u = await import(new URL('urun.js', K));
const liste = [...(t.TOHUM_YAZI || []), ...(t.TOHUM_YAZI2 || []), ...ic.YENIDEN, ...ic.YENI, ...ic.HAFTA];
for (const [, dosya] of PAKETLER) { const b = fs.readFileSync(new URL('../public/blog-statik/veri/' + dosya, import.meta.url)); let j; try { j = JSON.parse(zlib.gunzipSync(b)); } catch { j = JSON.parse(b); } liste.push(...(Array.isArray(j) ? j : j.yazilar || [])); }
const harita = new Map(); for (const y of liste) if (y && y.slug && y.govde) harita.set(y.slug, { ...harita.get(y.slug), ...y });
const yazilar = [...harita.values()];
const env = { ASSETS: { fetch: async () => new Response(fs.readFileSync(new URL('../public/products.json', import.meta.url))) } };
const U = await u.urunler(env, 'https://x/');
const say = new Map(), adet = [0, 0, 0, 0, 0], satir = []; let ayni = 0;
for (const y of yazilar) {
  const man = Array.isArray(y.urunler) ? y.urunler : (() => { try { return JSON.parse(y.urunler || '[]'); } catch { return []; } })();
  const ic2 = [...String(y.govde).matchAll(/^\[ürün:([a-z0-9,\s-]+)\]$/gim)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
  const r = u.oneriler(U, y, { secili: [...new Set([...man, ...ic2])], n: 4 });
  adet[Math.min(4, r.length)]++; if (new Set(r.map((p) => p.aile)).size < r.length) ayni++;
  for (const p of r) say.set(p.n, (say.get(p.n) || 0) + 1);
  satir.push(y.baslik + '\n   ' + r.map((p) => p.n).join(' · '));
}
const i = process.argv.indexOf('--liste'); if (i > 0) fs.writeFileSync(process.argv[i + 1], satir.join('\n') + '\n');
console.log(`${yazilar.length} yazı · ürün sayısı 0/1/2/3/4: ${adet.join(' / ')} · aynı aileden iki ürün: ${ayni} · farklı ürün: ${say.size}`);
console.log('En sık önerilenler:\n' + [...say].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, k]) => `  ${k}× ${n}`).join('\n'));
