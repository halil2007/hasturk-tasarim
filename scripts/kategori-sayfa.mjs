// Canlı ikas kategori sayfasının yapısını okur: sol alt kategori listesi, filtreler, sıralama çubuğu, ürün kartı.
// Mağazaya dokunmaz, yalnız okur. Ekran görüntüleri ekran/ klasörüne yazılır (iş akışı bunları yükler).
// Kullanım: node scripts/kategori-sayfa.mjs <url> [url ...]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('ekran', { recursive: true });
const b = await chromium.launch();
for (const url of process.argv.slice(2)) {
  const ad = new URL(url).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'ana';
  for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 844, isMobile: true }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.isMobile, deviceScaleFactor: vp.isMobile ? 2 : 1 });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `ekran/${ad}-${vp.width}.png` });
    // Sayfanın o anki HTML'i: panel kurulmazsa yerelde aynı yapıyla denemek için
    await writeFile(`ekran/${ad}-${vp.width}.html`, await p.content());
    // Bizim panel kuruldu mu: widget dosyasının adresi, içinde kategori paneli var mı, sayfadaki kutular
    console.log(`\n#### ${url} @ ${vp.width}px panel: ` + JSON.stringify(await p.evaluate(async () => {
      const s = [...document.scripts].map((x) => x.src).filter((x) => /pm-search/.test(x));
      let yeni = null;
      try { yeni = s[0] ? /ua-kside/.test(await (await fetch(s[0], { cache: 'no-store' })).text()) : null; } catch (e) { yeni = String(e); }
      return { script: s, yeniSurum: yeni, yan: !!document.querySelector('.ua-kside'), cip: !!document.querySelector('.ua-kchips'), yanaTasma: document.documentElement.scrollWidth - innerWidth };
    })));
    if (vp.isMobile) {
      const f = p.locator('.mobil-filters >> text=Filtrele').first();
      if (await f.count()) { await f.click().catch(() => {}); await p.waitForTimeout(1500); await p.screenshot({ path: `ekran/${ad}-${vp.width}-filtrele.png` }); await p.keyboard.press('Escape'); }
      await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(3500);
    }
    // Sayfalama: ilk yüklemede kaç kart var, sona kaydırınca artıyor mu, "daha fazla"/sayfa numarası var mı
    const say = () => p.evaluate(() => document.querySelectorAll('div[data-id] > a[href]').length);
    const ilk = await say();
    for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 4000); await p.waitForTimeout(700); }
    const son = await say();
    const sayfalama = await p.evaluate(() => [...document.querySelectorAll('button,a,span,div')].filter((e) => e.children.length === 0 && /^(daha fazla|daha fazla göster|load more|sonraki|›|»|\d{1,2})$/i.test((e.textContent || '').trim()) && e.closest('main')).slice(0, 8).map((e) => e.tagName + '.' + (e.className || '') + ' = ' + e.textContent.trim()));
    console.log(`\n#### ${url} @ ${vp.width}px kart ilk=${ilk} kaydırınca=${son} sayfalama=${JSON.stringify(sayfalama)}`);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
    await p.screenshot({ path: `ekran/${ad}-${vp.width}-tam.jpg`, fullPage: true, type: 'jpeg', quality: 60 });
    const r = await p.evaluate(() => {
      const yol = (el) => { const o = []; for (let e = el, i = 0; e && e !== document.body && i < 10; e = e.parentElement, i++) o.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 4).join('.') : '')); return o.join(' < '); };
      const rect = (e) => e ? JSON.stringify(e.getBoundingClientRect().toJSON(), (k, v) => typeof v === 'number' ? Math.round(v) : v) : '';
      const metin = (re) => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && re.test((e.textContent || '').trim()));
      const kisalt = (h) => h.replace(/\s+/g, ' ').replace(/(<svg[^>]*>).*?<\/svg>/g, '$1…</svg>').slice(0, 3500);
      const alt = metin(/^Alt Kategoriler$/i)[0];
      let kutu = alt; for (let i = 0; kutu && i < 4; i++) kutu = kutu.parentElement;
      const sira = metin(/^Fiyat artan$/i)[0];
      let sk = sira; for (let i = 0; sk && i < 3; i++) sk = sk.parentElement;
      const sepet = [...document.querySelectorAll('button')].find((e) => /sepete ekle/i.test(e.textContent || ''));
      let kart = sepet; for (let i = 0; kart && i < 5; i++) { kart = kart.parentElement; if (kart && kart.querySelector('img') && kart.querySelector('a[href]')) break; }
      const filtre = [...document.querySelectorAll('input[type=checkbox],input[type=radio],input[type=range],select')].slice(0, 12).map((e) => yol(e));
      const basliklar = metin(/^(Filtre|Filtrele|Fiyat|Marka|Kategori|Stok|Sırala|Sıralama|Varyant|Renk|Boyut)/i).slice(0, 15).map((e) => (e.textContent || '').trim() + ' :: ' + yol(e));
      return {
        baslik: (document.querySelector('h1') || {}).textContent, h1: yol(document.querySelector('h1')),
        altKategori: alt && yol(alt), altKutuRect: rect(kutu), altKutuHTML: kutu && kisalt(kutu.outerHTML),
        siralama: sira && yol(sira), siraHTML: sk && kisalt(sk.outerHTML),
        kart: kart && yol(kart), kartHTML: kart && kisalt(kart.outerHTML),
        filtreGirdileri: filtre, basliklar,
        mobilFiltreDugmesi: metin(/^(Filtrele|Filtre|Kategoriler|Sırala)$/i).slice(0, 6).map((e) => (e.textContent || '').trim() + ' :: ' + yol(e) + ' ' + rect(e)),
      };
    });
    console.log(`\n==== ${url} @ ${vp.width}px\n` + Object.entries(r).map(([k, v]) => `-- ${k}: ` + (Array.isArray(v) ? '\n    ' + v.join('\n    ') : v)).join('\n'));
    await ctx.close();
  }
}
await b.close();
