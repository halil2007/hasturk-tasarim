// Yayından sonra blogun yeni ana sayfa, Soru-Cevap, arama ve yazarken öneri özelliklerini canlıda dener;
// ekran görüntülerini cikti/ klasörüne yazar (blog-yeni-test dalına gönderilir). Veritabanına yazmaz.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const B = process.argv[2] || 'https://blog.hasturkgubre.com.tr';
mkdirSync('cikti', { recursive: true });
const log = [];
const L = (s) => { log.push(s); console.log(s); };
const b = await chromium.launch();
for (const [ad, vp, mob] of [['m', { width: 1440, height: 900 }, false], ['t', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1, userAgent: mob ? undefined : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 HasturkTest' });
  const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(e.message));
  for (const [y, isim] of [['/', 'ana'], ['/soru-cevap', 'sc'], ['/kategoriler', 'kat'], ['/bahce-takvimi/kasim', 'takvim'], ['/ara?q=sar%C4%B1msak%20nas%C4%B1l%20ekilir', 'ara']]) {
    const r = await p.goto(B + y + (y.includes('?') ? '&' : '?') + 'r=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
    await p.evaluate(async () => { const c = document.querySelector('[data-cerez="hayir"]'); if (c) c.click(); for (let i = 0; i < document.body.scrollHeight; i += 700) { window.scrollTo(0, i); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(800);
    L(`${ad} ${y} → ${r.status()} · yn: ${await p.locator('.yn').count()} · soru kartı: ${await p.locator('.yq').count()} · yazı kartı: ${await p.locator('.post').count()}`);
    await p.screenshot({ path: `cikti/${ad}-${isim}.png`, fullPage: true });
  }
  // Yazarken öneri
  await p.goto(B + '/?r=' + Date.now(), { waitUntil: 'load' });
  await p.evaluate(() => { const c = document.querySelector('[data-cerez="hayir"]'); if (c) c.click(); });
  await p.fill('#ynq', ''); await p.type('#ynq', 'limon yaprak', { delay: 60 });
  await p.waitForTimeout(1500);
  L(`${ad} öneri: ${await p.locator('.oneri:not([hidden]) a').count()} öğe`);
  await p.screenshot({ path: `cikti/${ad}-oneri.png` });
  L(`${ad} sayfa hataları: ${err.length ? err.join(' | ') : 'yok'}`);
  await ctx.close();
}
await b.close();
const j = await (await fetch(B + '/ara/oneri?q=sarimsak')).json();
L(`oneri API: ${j.y.length} yazı, ${j.s.length} soru · ilk: ${(j.y[0] || {}).b}`);
writeFileSync('cikti/sonuc.txt', log.join('\n'));
