// Canlı sitenin alt bilgi (footer) yapısını okur: başlıklar, bağlantılar, sınıf adları ve kısaltılmış HTML. Mağazaya dokunmaz.
// Kullanım: node scripts/footer-yapi.mjs <url>
import { chromium } from 'playwright';
const url = process.argv[2] || 'https://hasturkgubre.com.tr/';
const b = await chromium.launch();
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(3000);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const yol = (el) => { const o = []; for (let e = el, i = 0; e && e !== document.body && i < 10; e = e.parentElement, i++) o.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')); return o.join(' < '); };
    const bas = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && /^\s*Kurumsal\s*$/.test(e.textContent || ''));
    const ft = document.querySelector('footer') || (bas && bas.closest('div'));
    const kisalt = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/ style="[^"]*"/g, '').replace(/\s+/g, ' ');
    return {
      footerVar: !!document.querySelector('footer'),
      kurumsalYolu: bas ? yol(bas) : '',
      basliklar: [...(ft ? ft.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div') : [])].filter((e) => e.children.length === 0 && /^(Kurumsal|Kategoriler|Bilgilendirme|Hesabım|İletişim Bilgilerimiz)$/.test((e.textContent || '').trim())).map((e) => yol(e)),
      linkler: [...(ft ? ft.querySelectorAll('a') : [])].map((a) => (a.textContent || '').trim().slice(0, 40) + ' -> ' + a.getAttribute('href') + ' | ' + yol(a).split(' < ').slice(0, 3).join(' < ')),
      gorseller: [...(ft ? ft.querySelectorAll('img') : [])].map((i) => i.getAttribute('alt') + ' ' + i.getAttribute('src')),
      html: ft ? kisalt(ft.outerHTML).slice(0, 14000) : '',
    };
  });
  console.log('\n===== ' + vp.width + 'px');
  for (const [k, v] of Object.entries(r)) console.log(k + ':\n  ' + (Array.isArray(v) ? v.join('\n  ') : v));
  await p.close();
}
await b.close();
