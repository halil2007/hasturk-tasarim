// Canlı blogda Google Analytics'in çerez onayından sonra gerçekten veri gönderip göndermediğini ölçer (yalnız okuma).
import { chromium } from 'playwright';
const ADRES = process.argv[2] || 'https://blog.hasturkgubre.com.tr/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const istek = [];
p.on('request', (r) => { const u = r.url(); if (/google-analytics\.com|googletagmanager\.com/.test(u)) istek.push(u); });
p.on('console', (m) => { if (m.type() === 'error') console.log('konsol hatası:', m.text().slice(0, 200)); });
await p.goto(ADRES, { waitUntil: 'networkidle' });
const meta = await p.getAttribute('meta[name="hb-ga"]', 'content').catch(() => null);
console.log('ölçüm kimliği (meta):', meta);
const gorunur = await p.isVisible('#cerez').catch(() => false);
console.log('çerez bandı görünüyor:', gorunur);
console.log('onaydan önce Google isteği:', istek.length);
await p.screenshot({ path: 'ga-once.png' });
if (gorunur) await p.click('[data-cerez="evet"]');
await p.waitForTimeout(6000);
await p.goto(ADRES.replace(/\/$/, '') + '/soru-cevap', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
const topla = istek.filter((u) => /\/g\/collect/.test(u));
console.log('onaydan sonra gtag.js yüklendi:', istek.some((u) => /gtag\/js/.test(u)));
console.log('collect (veri gönderimi) isteği:', topla.length);
for (const u of topla.slice(0, 4)) { const q = new URL(u).searchParams; console.log('  tid=' + q.get('tid'), 'en=' + q.get('en'), 'dl=' + q.get('dl')); }
const cerezler = (await p.context().cookies()).filter((c) => /^_ga/.test(c.name)).map((c) => c.name + '@' + c.domain);
console.log('GA çerezleri:', cerezler.join(', ') || 'yok');
await b.close();
