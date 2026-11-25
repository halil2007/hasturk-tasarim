// Telefon menüsü (Ürün Bul paneli > "Tüm kategoriler") masaüstü menüyle aynı düzende mi?
// config.json > desktopMenu: items (sıra), hide (gizlenenler), labels (gösterilen ad) telefonda da uygulanır.
// MODE=canli (yayındaki widget) | yeni (daldaki widget; iş akışı önce derler). SITE_URL ile site seçilir.
import { chromium, devices } from 'playwright';
import { readFileSync, appendFileSync } from 'node:fs';
const SITE = process.env.SITE_URL || 'https://hasturkgubre.com.tr';
const MODE = process.env.MODE || 'canli';
const HOST = 'hasturk-arama.halilc2007.workers.dev';
const cfg = JSON.parse(readFileSync('config.json', 'utf8')).desktopMenu;
const out = [];
const log = (s) => { out.push(s); console.log(s); };
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'] });
if (MODE === 'yeni') await ctx.route((u) => u.hostname === HOST && u.pathname === '/pm-search.js', (r) => r.fulfill({ status: 200, body: readFileSync('public/pm-search.js'), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' } }));
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
await p.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(7000);
await p.getByRole('button', { name: /Reddet|Kabul/ }).first().click({ timeout: 2000 }).catch(() => {});
let bad = 0;
const sr = () => document.getElementById('urun-arama-root').shadowRoot;
// ☰ düğmesine gerçek dokunuş: panel açılmalı
const hb = await p.evaluate(() => {
  const c = [...document.querySelectorAll('header button, header a, header [role=button], button[aria-label]')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < 90 && r.width > 14 && r.width < 80 && r.left < 100; });
  const e = c.find((x) => /menu|menü|burger|drawer/i.test((x.getAttribute('aria-label') || '') + x.className)) || c[0];
  if (!e) return false; e.setAttribute('data-mm-test', '1'); return true;
});
if (hb) await p.locator('[data-mm-test="1"]').tap().catch(() => {});
await p.waitForTimeout(2500);
let acik = await p.evaluate(() => { const h = document.getElementById('urun-arama-root'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('.catsec, .cx')); });
log(`☰ dokunuşu: ${hb ? (acik ? 'Ürün Bul paneli açıldı' : 'panel açılmadı, API ile açılıyor') : 'menü düğmesi bulunamadı, API ile açılıyor'}`);
if (!acik) { await p.evaluate(() => window.UrunArama && window.UrunArama.open && window.UrunArama.open('')); await p.waitForTimeout(3000); }
const rows = async () => p.evaluate(() => { const s = document.getElementById('urun-arama-root').shadowRoot; return [...s.querySelectorAll('.clist .li .n')].map((n) => (n.firstChild ? n.firstChild.textContent : n.textContent).trim()); });
await p.evaluate(() => { const s = document.getElementById('urun-arama-root').shadowRoot; const cx = s.querySelector('[data-act="catx"]'); if (cx && cx.getAttribute('aria-expanded') !== 'true') cx.click(); });
await p.waitForTimeout(1200);
const tops = await rows();
log('Ana kategoriler: ' + tops.join(' › '));
const lab = cfg.labels || {};
const beklenen = cfg.items.map((n) => lab[n] || n);
const sira = tops.slice(0, beklenen.length);
if (JSON.stringify(sira) !== JSON.stringify(beklenen)) { bad++; log(`   ✗ sıra beklenen gibi değil. Beklenen: ${beklenen.join(' › ')}`); }
for (const h of cfg.hide) if (tops.includes(h)) { bad++; log(`   ✗ gizli olması gereken kategori görünüyor: ${h}`); }
const son = tops.slice(beklenen.length);
log('Sonda: ' + son.join(' › '));
// "Öne çıkan kategoriler" (görselli kutular): config.json > featured sırasıyla; Fideler, Tohumlar'ın hemen yanında; gizli kategori yok
const feat = await p.evaluate(() => { const s = document.getElementById('urun-arama-root').shadowRoot; return [...s.querySelectorAll('.feat .ft .fn b')].map((b) => b.textContent.trim()); });
log('Öne çıkan kategoriler: ' + feat.join(' › '));
const fi = feat.indexOf('Fideler'), ti = feat.indexOf('Tohumlar');
if (fi < 0 || ti < 0 || ti !== fi + 1 || fi % 2 !== 0) { bad++; log('   ✗ Fideler kutusu Tohumların üstünde (solunda) ve aynı satırda değil'); }
if (fi >= 0 && fi > 3) { bad++; log('   ✗ Fideler kutusu ilk sıralarda değil'); }
if (feat.indexOf('Kendi Toprak Karışımını Oluştur') !== 1) { bad++; log('   ✗ "Kendi Toprak Karışımını Oluştur" kutusu 2. sırada değil'); }
const pi = feat.indexOf('İlaçlama Pompaları'), tpi = feat.indexOf('Topraklar');
if (pi < 0 || tpi !== pi + 1 || pi % 2 !== 0) { bad++; log('   ✗ Topraklar kutusu İlaçlama Pompaları ile aynı satırda, yanında değil'); }
const yi = feat.indexOf('Bahçe Yatakları ve Kuleleri'), gi = feat.indexOf('Galvaniz Modüler Yapılar');
if (yi < 0 || gi !== yi + 1 || yi % 2 !== 0) { bad++; log('   ✗ Galvaniz kutusu Bahçe Yatakları ve Kuleleri ile aynı satırda, yanında değil'); }
for (const h of cfg.hide) if (feat.includes(h)) { bad++; log(`   ✗ öne çıkanlarda gizli kategori: ${h}`); }
// Alt kategoriler: Saksı & Bahçe Yatağı → Bahçe Yatakları ve Kuleleri → 7 alt kategori
const git = async (ad) => { const ok = await p.evaluate((ad) => { const s = document.getElementById('urun-arama-root').shadowRoot; const b = [...s.querySelectorAll('.clist .li')].find((x) => ((x.querySelector('.n').firstChild || {}).textContent || '').trim() === ad); if (!b) return false; b.click(); return true; }, ad); await p.waitForTimeout(900); return ok; };
if (await git(lab['Saksılar ve Bahçe Yatakları'] || 'Saksılar ve Bahçe Yatakları')) {
  const k1 = await rows();
  log('Saksı & Bahçe Yatağı altında: ' + k1.join(' › '));
  for (const h of cfg.hide) if (k1.includes(h)) { bad++; log(`   ✗ alt listede gizli kategori görünüyor: ${h}`); }
  if (await git('Bahçe Yatakları ve Kuleleri')) {
    const k2 = await rows();
    log('Bahçe Yatakları ve Kuleleri altında: ' + k2.join(' › '));
    for (const a of ['Klasik Sebze Yatakları', 'Şekilli Sebze Yatakları', 'Uzun Sebze Yatakları', 'Çiçeklik Serisi Yataklar', 'Balkon ve Teras Sebze Yatakları', 'Dikey Tarım Kuleleri', 'Bitki Destek Üniteleri']) if (!k2.includes(a)) { bad++; log(`   ✗ eksik alt kategori: ${a}`); }
  } else { bad++; log('   ✗ "Bahçe Yatakları ve Kuleleri" satırı yok'); }
} else { bad++; log('   ✗ Saksı & Bahçe Yatağı satırı bulunamadı'); }
await p.screenshot({ path: 'mobil-menu.png' });
if (errs.length) log('Sayfa hataları: ' + errs.slice(0, 3).join(' | '));
log(bad ? `SONUÇ: ${bad} sorun` : 'SONUÇ: hepsi doğru');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${SITE} · ${MODE}\n\n\`\`\`\n${out.join('\n')}\n\`\`\`\n`);
await b.close();
process.exit(bad ? 1 : 0);
