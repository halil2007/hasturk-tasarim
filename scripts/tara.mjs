// Sitenin sayfalarını masaüstü ve telefon boyutunda açar; tam sayfa ekran görüntüsü,
// HTML ve sayfa yapısı özetini tarama/ klasörüne kaydeder.
// Çalıştırma: node scripts/tara.mjs [adres ...]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const urls = process.argv.slice(2).length ? process.argv.slice(2) : ['https://www.hasturkgubre.com.tr/'];
const OUT = process.env.OUT || 'tarama';
const views = [
  { name: 'masaustu', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'telefon', viewport: { width: 390, height: 844 }, mobile: true },
];

const slug = (u) => {
  const p = new URL(u).pathname;
  if (u.startsWith('file:')) return p.split('/').pop().replace(/\.html?$/, '');
  return p.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'ana-sayfa';
};

// Sayfanın yukarıdan aşağıya yapısı: bölümler, başlıklar, görseller, bağlantılar
function outline() {
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const txt = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const top = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
  const items = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,img,a,button,input,section,header,footer,nav')) {
    if (!vis(el)) continue;
    const tag = el.tagName.toLowerCase();
    const row = { y: top(el), tag };
    if (tag === 'img') { row.alt = el.alt; row.src = el.currentSrc || el.src; row.w = el.naturalWidth; row.h = el.naturalHeight; }
    else if (tag === 'a') { row.text = txt(el).slice(0, 80); row.href = el.getAttribute('href'); }
    else if (tag === 'input') { row.placeholder = el.placeholder; row.type = el.type; }
    else if (['section', 'header', 'footer', 'nav'].includes(tag)) { row.cls = el.className && String(el.className).slice(0, 80); row.h = Math.round(el.getBoundingClientRect().height); }
    else row.text = txt(el).slice(0, 120);
    items.push(row);
  }
  items.sort((a, b) => a.y - b.y);
  const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content || '';
  return {
    title: document.title,
    description: meta('description'),
    ogImage: meta('og:image'),
    height: document.documentElement.scrollHeight,
    text: txt(document.body).slice(0, 20000),
    items,
  };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
for (const url of urls) {
  for (const v of views) {
    const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: v.mobile ? 2 : 1, locale: 'tr-TR' });
    const page = await ctx.newPage();
    const name = `${OUT}/${slug(url)}-${v.name}`;
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => console.warn('UYARI:', e.message));
    const loadMs = Date.now() - t0;
    // Tembel yüklenen görseller için sayfayı aşağı kaydır
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${name}-ilk-ekran.png` });
    await page.screenshot({ path: `${name}-tam.png`, fullPage: true });
    await writeFile(`${name}.html`, await page.content());
    const data = await page.evaluate(outline);
    data.url = url; data.view = v.name; data.loadMs = loadMs;
    await writeFile(`${name}.json`, JSON.stringify(data, null, 1));
    console.log(`${url} [${v.name}] ${loadMs} ms, yükseklik ${data.height}px, ${data.items.length} öge`);
    await ctx.close();
  }
}
await browser.close();
