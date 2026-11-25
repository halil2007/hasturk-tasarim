// serakulit.com'daki vermikülit ürünlerini okur: ad, adres, seçenekler (varyantlar), fiyatlar, stok, açıklama metni,
// görsel adresleri, yapılandırılmış veri (JSON-LD, __NEXT_DATA__). Yalnız okur; cikti/serakulit.json'a yazar.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('cikti', { recursive: true });
const KOK = 'https://www.serakulit.com';
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', viewport: { width: 1366, height: 900 } });
const p = await ctx.newPage();
const log = [];
const git = async (u) => { try { const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 }); await p.waitForTimeout(1500); return r && r.status(); } catch (e) { return 'hata ' + e.message.slice(0, 80); } };
// 1) Ürün adreslerini topla: ana sayfa, arama ve site haritası
const adres = new Set();
for (const u of [KOK + '/', KOK + '/search?q=vermik%C3%BClit', KOK + '/arama?q=vermikulit', KOK + '/vermikulit', KOK + '/magaza/', KOK + '/magaza/page/2/', KOK + '/magaza/page/3/']) {
  const s = await git(u);
  log.push(u + ' -> ' + s);
  const linkler = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href).concat((document.body.innerText.match(/https?:\/\/[^\s<]+/g) || [])));
  for (const l of linkler) if (/vermik/i.test(decodeURIComponent(l)) && l.startsWith('http') && l.includes('serakulit')) adres.add(l.split('#')[0]);
}
log.push('Bulunan adresler: ' + [...adres].join(' , '));
// 2) Her adreste ürün bilgisi
const urunler = [];
for (const u of [...adres].filter((x) => /\/urun\//.test(x) && !/kedi|cim-adam|çim/i.test(x))) {
  const s = await git(u);
  const r = await p.evaluate(() => {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((x) => x.textContent);
    const nd = document.getElementById('__NEXT_DATA__');
    const secim = [...document.querySelectorAll('select, [class*=variant] , [class*=Variant], [class*=option]')].slice(0, 15).map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 300));
    return { baslik: document.title, h1: (document.querySelector('h1') || {}).innerText || '', ld, next: nd ? nd.textContent.slice(0, 200000) : '',
      metin: document.body.innerText.slice(0, 12000), secim,
      gorsel: [...new Set([...document.querySelectorAll('.woocommerce-product-gallery a[href], .woocommerce-product-gallery img')]
        .map((e) => e.getAttribute('href') || e.getAttribute('data-large_image') || e.getAttribute('data-src') || e.getAttribute('src'))
        .filter((x) => x && /wp-content\/uploads/.test(x)))],
      aciklama: ((document.querySelector('#tab-description') || {}).innerText || '').slice(0, 6000),
      ekBilgi: ((document.querySelector('#tab-additional_information') || {}).innerText || '').slice(0, 2000) };
  });
  urunler.push({ adres: u, durum: s, ...r });
}
writeFileSync('cikti/serakulit.json', JSON.stringify({ log, urunler }, null, 1));
console.log(log.join('\n'));
for (const x of urunler) console.log('\n## ' + x.adres + ' (' + x.durum + ') ' + x.h1 + '\nLD: ' + x.ld.join(' ').slice(0, 1500) + '\nSEÇİM: ' + x.secim.join(' | ').slice(0, 800) + '\nNEXT: ' + (x.next ? x.next.length + ' karakter' : 'yok'));
await b.close();
