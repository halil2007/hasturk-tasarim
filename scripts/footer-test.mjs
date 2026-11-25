// Yeni alt bilgiyi canlı sitede, yayınlamadan dener: sitenin çağırdığı pm-search.js ve menu.json bu daldaki
// dosyalarla değiştirilir, alt bilginin masaüstü ve telefon ekran görüntüsü cikti/ klasörüne yazılır. Mağazaya dokunmaz.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const url = process.argv[2] || 'https://hasturkgubre.com.tr/';
mkdirSync('cikti', { recursive: true });
const js = readFileSync('public/pm-search.js'), menu = readFileSync('public/menu.json'), urun = readFileSync('public/products.json');
const b = await chromium.launch();
for (const [ad, vp, mobil] of [['masaustu', { width: 1440, height: 900 }, false], ['telefon', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobil, hasTouch: mobil, deviceScaleFactor: mobil ? 2 : 1 });
  const p = await ctx.newPage();
  await p.route(/pm-search\.js(\?|$)/, (r) => r.fulfill({ body: js, contentType: 'application/javascript' }));
  await p.route(/\/menu\.json(\?|$)/, (r) => r.fulfill({ body: menu, contentType: 'application/json' }));
  await p.route(/\/products\.json(\?|$)/, (r) => r.fulfill({ body: urun, contentType: 'application/json' }));
  const hatalar = [];
  p.on('pageerror', (e) => hatalar.push(e.message));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(5000);
  const f = await p.$('footer');
  const bilgi = await p.evaluate(() => ({ izgaralar: [...document.querySelectorAll('footer .grid')].map((g) => g.className.split(' ').slice(0, 3).join('.') + (g.hasAttribute('data-ua-ft') ? '[gizli]' : '') + ':' + Math.round(g.getBoundingClientRect().height)), biz: document.querySelectorAll('.ua-ft').length, gizli: document.querySelectorAll('[data-ua-ft]').length,
    gorunen: [...document.querySelectorAll('.ua-ft')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.className) }));
  console.log(ad, JSON.stringify(bilgi), hatalar.length ? 'HATA: ' + hatalar.slice(0, 3).join(' | ') : 'hata yok');
  if (f) await f.screenshot({ path: `cikti/${ad}.png` });
  await ctx.close();
}
await b.close();
