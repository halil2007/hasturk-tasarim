// Canlı ürün sayfasının yapısını okur (widget'ın sayfaya kart ekleyeceği yeri bulmak için). Mağazaya dokunmaz, yalnız okur.
// Kullanım: node scripts/sayfa-yapi.mjs <url>
import { chromium } from 'playwright';
const url = process.argv[2];
const b = await chromium.launch();
for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const yol = (el) => { const o = []; for (let e = el, i = 0; e && e !== document.body && i < 9; e = e.parentElement, i++) o.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')); return o.join(' < '); };
    const h1 = document.querySelector('h1');
    const cb = document.querySelector('input[type=checkbox]');
    const fiyat = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && /₺\s?\d/.test(e.textContent || '') && e.getBoundingClientRect().top < 900);
    const btn = [...document.querySelectorAll('button')].find((e) => /sepete ekle/i.test(e.textContent || ''));
    const rect = (e) => e ? JSON.stringify(e.getBoundingClientRect().toJSON(), (k, v) => typeof v === 'number' ? Math.round(v) : v) : '';
    return { h1: h1 && yol(h1), h1r: rect(h1), cb: cb && yol(cb), cbr: rect(cb), fiyat: fiyat && yol(fiyat) + ' = ' + fiyat.textContent.trim(), fiyatr: rect(fiyat), btn: btn && yol(btn), btnr: rect(btn),
      secenekBaslik: [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /Bitki \/ Not|Sphagnum/i.test(e.textContent || '')).slice(0, 3).map(yol) };
  });
  console.log('== ' + vp.width + 'px\n' + Object.entries(r).map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.join('\n    ') : v)).join('\n'));
  await p.close();
}
await b.close();
