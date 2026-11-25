// Canlı sitede Kendin Tasarla kontrolü: model sayfasındaki kart, Ürün Bul panelindeki araç, fiyat, sepete ekleme (tarayıcının
// anonim sepeti; sipariş verilmez), kurulum kılavuzu indirme ve menü bağlantısı.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const IC = (sec) => `(() => { const h = document.getElementById('urun-arama-root'), sr = h && h.shadowRoot, pane = sr && sr.querySelector('.pane.tasar'), ic = pane && pane.firstElementChild && pane.firstElementChild.shadowRoot; return ic && ic.querySelector('${sec}'); })()`;
const yaz = (p, sec) => p.evaluate(`(${IC(sec)} || {}).textContent`);
const URL = 'https://hasturkgubre.com.tr/galvaniz-bahce-kemeri-kesik-cati-2-bolum';
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const p = await (await b.newContext({ viewport: vp, acceptDownloads: true })).newPage(), hata = [];
  p.on('pageerror', (e) => hata.push(e.message.slice(0, 160)));
  p.on('console', (m) => { if (m.type() === 'error') hata.push(m.text().slice(0, 160)); });
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(8000);
  const kart = await p.$('#ua-tsk button');
  console.log(vp.width + 'px kart:', !!kart, '· eski çerçeve:', await p.evaluate(() => !!document.getElementById('ua-tasarla')));
  if (kart) {
    await kart.click(); await p.waitForTimeout(12000);
    const r = await p.evaluate(() => { const h = document.getElementById('urun-arama-root'), sr = h && h.shadowRoot, pane = sr && sr.querySelector('.pane.tasar'), ic = pane && pane.firstElementChild && pane.firstElementChild.shadowRoot;
      return { sekme: !!(sr && sr.querySelector('.tb.on[data-v="tasar"]')), yazi: pane ? pane.textContent.slice(0, 60) : '', tur: ic && (ic.querySelector('.tur-bas b') || {}).textContent, olcu: ic && (ic.querySelector('#disolcu') || {}).textContent, kanvas: !!(ic && ic.querySelector('canvas')) }; });
    console.log(vp.width + 'px panel:', JSON.stringify(r));
    // Fiyat (secenek.json yüklenince) ve sepete ekleme
    for (let i = 0; i < 20 && /Hesaplan/.test(await yaz(p, '.fiyat b')); i++) await p.waitForTimeout(1000);
    console.log(vp.width + 'px fiyat:', await yaz(p, '.fiyat b'), '·', await yaz(p, '.dip .not'));
    if (vp.width > 1000) {
      await p.evaluate(`${IC('.dip .sepet')}.click()`); await p.waitForTimeout(5000);
      console.log('sepete ekleme:', await yaz(p, '#toast'));
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }).catch(() => null), p.evaluate(`${IC('#bFoy')}.click()`)]);
      console.log('kılavuz:', d ? d.suggestedFilename() : 'İNMEDİ', '·', await yaz(p, '#toast'));
      // Seçeneği eksik bir tasarım: müşteri hizmetlerine yönlendirmeli
      await p.goto('https://hasturkgubre.com.tr/#tasarla=HG-D1-200_80_75_1', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {}); await p.waitForTimeout(14000);
      console.log('eksik seçenekli masa:', await yaz(p, '.tur-bas b'), '·', await yaz(p, '.fiyat b'), '·', await yaz(p, '.dip .not'));
    }
  }
  console.log(vp.width + 'px sayfa hatası:', hata.join(' | ') || 'yok');
  if (vp.width > 1000) {
    await p.goto('https://hasturkgubre.com.tr/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {}); await p.waitForTimeout(6000);
    const a = await p.$('.ua-dnav a.ti[data-n="Galvaniz Modüler Yapılar"]'); if (a) { await a.hover(); await p.waitForTimeout(1800); }
    console.log('menü bağlantısı:', JSON.stringify(await p.$$eval('a[href*="tasarla"]', (l) => l.map((x) => [x.textContent.trim().slice(0, 30), x.getAttribute('href')]))));
  }
  if (vp.width > 1000) {
    // "Kendi Seranı Tasarla" ürün sayfası Kendin Tasarla aracına yönlenmeli; ?kalsin=1 ile sayfa açık kalmalı
    await p.goto('https://hasturkgubre.com.tr/kendi-serani-tasarla', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {}); await p.waitForTimeout(12000);
    console.log('ürün sayfası yönlendirme:', p.url(), '· araç açık:', await p.evaluate(`!!${IC('canvas')}`), '·', await yaz(p, '.tur-bas b'));
    await p.goto('https://hasturkgubre.com.tr/kendi-serani-tasarla?kalsin=1', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {}); await p.waitForTimeout(6000);
    console.log('kalsin=1:', p.url());
  }
  await p.close();
}
await b.close();
