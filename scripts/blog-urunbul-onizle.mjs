// Blogda Ürün Bul önizlemesi: canlı blog sayfasına derlenmiş widget (public/pm-search.js, bu daldaki hali) enjekte edilir;
// mağazada da aynı dosya kullanılır. Ekran görüntüleri cikti/ klasörüne yazılır. Siteye hiçbir şey yazılmaz.
// Akış: blog yazısı (kapalı) → panel açık → "domates" araması → Sepete ekle → mağaza açılır ve ürün sepete eklenir.
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
const W = 'https://hasturk-arama.halilc2007.workers.dev/';
const JS = await readFile('public/pm-search.js', 'utf8');
const BLOG = process.env.BLOG || 'https://blog.hasturkgubre.com.tr';
const CANLI = process.env.CANLI === '1';
await mkdir('cikti', { recursive: true });
const b = await chromium.launch();
for (const vp of [{ ad: 'masaustu', width: 1366, height: 860 }, { ad: 'telefon', width: 390, height: 844 }]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  // CANLI=1: hiçbir şey enjekte edilmez, yayındaki blog ve widget denenir
  if (!CANLI) await ctx.route(W + 'pm-search.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: JS }));
  if (!CANLI) await ctx.route(BLOG + '/**', async (r) => {
    if (r.request().resourceType() !== 'document') return r.continue();
    const res = await r.fetch(); let h = await res.text();
    if (!h.includes('pm-search.js')) h = h.replace('</body>', `<script src="${W}pm-search.js" data-store="https://hasturkgubre.com.tr" async></script></body>`);
    return r.fulfill({ response: res, body: h, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
  });
  const p = await ctx.newPage(), hata = [];
  p.on('pageerror', (e) => hata.push(e.message.slice(0, 140)));
  await p.goto(BLOG + '/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  const yazi = await p.$$eval('main a[href]', (l) => l.map((a) => a.href).filter((x) => { try { const u = new URL(x); const s = u.pathname.split('/').filter(Boolean); return u.host === location.host && s.length === 1 && (s[0].match(/-/g) || []).length >= 3 && !/kategori|etiket|yazar|soru|takvim|ara/.test(s[0]); } catch (e) { return false; } })[0]).catch(() => null);
  console.log(vp.ad, 'blog:', p.url(), '· yazı:', yazi);
  if (yazi) await p.goto(yazi, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(6000);
  await p.getByRole('button', { name: 'Reddet' }).first().click({ timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.screenshot({ path: `cikti/${vp.ad}-1-yazi.png` });
  const fab = await p.evaluate(() => { const h = document.getElementById('urun-arama-root'); const f = h && h.shadowRoot && h.shadowRoot.querySelector('.fab, [class*="fab"]'); return !!f; });
  console.log(vp.ad, 'Ürün Bul düğmesi:', fab, '· blog arama kutusu yakalandı mı:', await p.evaluate(() => !!document.querySelector('input[name="q"][data-ua]')));
  await p.evaluate(() => window.UrunArama && window.UrunArama.open && window.UrunArama.open('domates'));
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `cikti/${vp.ad}-2-panel.png` });
  // Blogda iki ürün biriktir: ilk ürün kartındaki "Ekle" (seçenekli üründe alt sayfadaki "Sepete ekle")
  const ekle = async (q) => {
    await p.evaluate((q) => window.UrunArama.open(q), q);
    await p.waitForTimeout(4000);
    const v = await p.evaluate(() => { const sr = document.getElementById('urun-arama-root').shadowRoot; const btn = sr.querySelector('.res [data-act="add"]:not([disabled]), [data-act="add"]:not([disabled])'); if (btn) { btn.click(); return btn.getAttribute('data-v'); } return null; });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const sr = document.getElementById('urun-arama-root').shadowRoot; const g = sr.querySelector('[data-act="shgo"]'); if (g) g.click(); });
    await p.waitForTimeout(1500);
    return v;
  };
  // Yeni kart düğmeleri (İncele + Ekle) canlı blogda henüz yoksa önizlemede aynı işaretleme ve stil uygulanır
  await p.evaluate(() => {
    if (document.querySelector('.kb2')) return;
    const st = document.createElement('style');
    st.textContent = '.kb2{display:grid;grid-template-columns:1fr 1fr;gap:6px}.kb2 .btn{justify-self:stretch;padding:7px 4px;font-size:12.5px;border-radius:7px;gap:4px;min-width:0}.kb2 .btn svg{width:14px;height:14px}';
    document.head.appendChild(st);
    document.querySelectorAll('.rc, .pm').forEach((k) => {
      const a = k.querySelector('a.btn'); if (!a) return;
      const slug = new URL(a.href).pathname.replace(/^\//, '');
      const d = document.createElement('div'); d.className = 'kb2';
      d.innerHTML = '<a class="btn btn-o" href="' + a.href + '">İncele</a><a class="btn btn-g" href="' + a.href + '" data-ua-ekle="' + slug + '"><svg><use href="/blog-statik/ikon.svg#i-cart"/></svg>Ekle</a>';
      a.replaceWith(d);
    });
  });
  await p.evaluate(() => window.UrunArama && window.UrunArama.close && window.UrunArama.close()); await p.waitForTimeout(600);
  const recs = await p.$('.recs');
  if (recs) { await recs.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.screenshot({ path: `cikti/${vp.ad}-0-kartlar.png` }); }
  const sr = () => p.evaluate(() => { const r = document.getElementById('urun-arama-root').shadowRoot; return { sayac: (r.querySelector('.cn') || {}).textContent, bildirim: (r.querySelector('.ptoast') || {}).textContent, liste: localStorage.getItem('ua-off-sepet') }; });
  const kapat = () => p.evaluate(() => window.UrunArama && window.UrunArama.close && window.UrunArama.close());
  // 1) Yan sütundaki ürün kartının sepet düğmesi (yeni işaretleme canlıda yoksa önizlemede eklenir)
  const kartSlug = await p.evaluate(() => {
    const a = document.querySelector('.rs a.cart'); if (!a) return null;
    const s = new URL(a.href).pathname.replace(/^\//, ''); if (!a.getAttribute('data-ua-ekle')) { a.setAttribute('data-ua-ekle', s); a.removeAttribute('data-git'); }
    document.querySelectorAll('.rs a.im').forEach((x) => x.removeAttribute('data-git')); // İncele doğrudan mağazaya (önizleme)
    return s;
  });
  await kapat();
  if (kartSlug) { await p.click('.rs a.cart', { timeout: 8000 }).catch((e) => console.log(vp.ad, 'kart tıklanamadı', e.message.slice(0, 80))); await p.waitForTimeout(2500); }
  await p.evaluate(() => { const g = document.getElementById('urun-arama-root').shadowRoot.querySelector('[data-act="shgo"]'); if (g) g.click(); }); // seçenekli üründe seçenek penceresi
  await p.waitForTimeout(1500);
  console.log(vp.ad, '1) kart düğmesi:', kartSlug, JSON.stringify(await sr()));
  // 2) Ürün Bul'dan iki ürün daha
  await ekle('perlit'); await ekle('solucan gübresi');
  console.log(vp.ad, '2) blogda:', JSON.stringify(await sr()));
  await p.screenshot({ path: `cikti/${vp.ad}-3-blog-sepet.png` });
  await kapat(); await p.waitForTimeout(800);
  // 3) İncele (yan sütundaki ürün görseli): mağaza ürün sayfası açılır, bekleyen ürünler mağaza sepetine geçer
  const incele = await p.evaluate(() => { const a = document.querySelector('.rs a.im'); return a ? a.href : null; });
  if (incele) await p.click('.rs a.im', { timeout: 8000 }).catch(async () => { await p.goto(incele); });
  await p.waitForURL(/hasturkgubre\.com\.tr\//, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(14000);
  const mt = await p.evaluate(() => { const h = document.getElementById('urun-arama-root'), r = h && h.shadowRoot, t = r && r.querySelector('.ptoast'); return { url: location.href, bildirim: t ? t.textContent : null, sayac: (r && r.querySelector('.cn') || {}).textContent }; });
  console.log(vp.ad, '3) İncele sonrası mağaza:', JSON.stringify(mt));
  await p.screenshot({ path: `cikti/${vp.ad}-4-incele.png` });
  // 4) Bloga dön, bir ürün daha ekle: yalnız bu yeni ürün gönderilmeli
  await p.goBack({ waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(6000);
  console.log(vp.ad, '4) bloga dönünce:', JSON.stringify(await sr()));
  await ekle('torf');
  const son = await sr();
  const git = await p.evaluate(() => { const a = document.getElementById('urun-arama-root').shadowRoot.querySelector('.cbtn'); return a && a.href; });
  console.log(vp.ad, '4) yeni ürün sonrası:', JSON.stringify(son), '· Sepete git adresi:', git);
  await p.evaluate(() => { const a = document.getElementById('urun-arama-root').shadowRoot.querySelector('.cbtn'); if (a) a.click(); });
  await p.waitForURL(/hasturkgubre\.com\.tr\/(cart|sepet)/, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(8000);
  await p.screenshot({ path: `cikti/${vp.ad}-5-magaza-sepet.png`, fullPage: false });
  const sep = await p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').replace(/.*Sepetim/, 'Sepetim').slice(0, 1400));
  console.log(vp.ad, '5) sepet:', p.url(), sep);
  console.log(vp.ad, '5) aktarım kaydı:', await p.evaluate(() => sessionStorage.getItem('ua-ekle-iz')));
  console.log(vp.ad, 'sayfa hatası:', hata.join(' | ') || 'yok');
  await ctx.close();
}
await b.close();
