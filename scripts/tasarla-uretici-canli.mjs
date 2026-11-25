// Üreticinin (profimod.com) Kendin Tasarla aracını gerçek tarayıcıda çalıştırır; yalnız okur (sipariş/sepet yok, mağazaya dokunmaz).
// Çıktı: kur kaynağı ve değeri, sekmelerin görünürlüğü, örnek tasarım kodlarının parça sayıları ve ekranda görünen fiyat.
// Karşılaştırma: docs/tasarla-profimod-karsilastirma.md
// (tanı betiği; ikinci deneme)
import { chromium } from 'playwright';
const KODLAR = ["PM-D1-70_130_60_0", "PM-D1-1000_110_70_0", "PM-D1-650_150_70_1", "PM-D1-490_70_80_1", "PM-Y1-600_80_80_0", "PM-Y1-180_110_100_0", "PM-Y1-160_110_90_0", "PM-Y1-310_130_60_1", "PM-A1-6_2_8_4_1", "PM-A1-6_1_11_0_2", "PM-A1-2_1_11_6_1", "PM-A1-4_2_11_0_2", "PM-G1-1_3", "PM-G1-0_2", "PM-G1-0_3", "PM-G1-1_2", "PM-O1-0_1_3", "PM-O1-0_1_4", "PM-O1-2_1_3", "PM-O1-1_1_4", "PM-L1-9", "PM-L1-10", "PM-L1-8", "PM-L1-3", "PM-U1-3_0", "PM-U1-1_0", "PM-U1-4_0", "PM-U1-1_1", "PM-P1-2_4", "PM-P1-2_3", "PM-P1-1_2", "PM-P1-0_2", "PM-E1-0_1", "PM-E1-1_3", "PM-E1-1_2", "PM-E1-0_3", "PM-N1-2", "PM-N1-3", "PM-J1-3_1", "PM-J1-1_2", "PM-J1-2_2", "PM-J1-2_1", "PM-X1-6_-1_0", "PM-X1-4_4_0", "PM-X1-6_-4_0", "PM-X1-5_-6_0", "PM-S1-C_2_N_FB_1_0_0_w", "PM-S1-C_2_N_F_0_0_0_w1LW", "PM-S1-C_6_S_FB_1_0_0_w2R", "PM-S1-C_8_N_FB_1_0_0_w1LW", "PM-Z1-2_5_b_1", "PM-Z1-4_7_b_1", "PM-Z1-2_7_b_0", "PM-Z1-3_6_b_0", "PM-D1-200_80_75_1", "PM-S1-C_2_S_F_0_0_0_w", "PM-A1-4_1_2_1_0"];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(), ag = [];
p.on('requestfinished', (r) => { if (/kur|tcmb/i.test(r.url())) ag.push('OK ' + r.url()); });
p.on('requestfailed', (r) => { if (/kur|tcmb/i.test(r.url())) ag.push('HATA ' + r.url() + ' ' + (r.failure() || {}).errorText); });
p.on('response', (r) => { if (/kur|tcmb/i.test(r.url())) ag.push(r.status() + ' ' + r.url()); });
const hata = []; p.on('pageerror', (e) => hata.push(e.message.slice(0, 160)));
const ADRES = process.env.ADRES || 'https://www.profimod.com/kendin-tasarla.html';
await p.goto(ADRES, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.log('goto', e.message));
await p.waitForTimeout(12000);
let f = p.frames().find((x) => /yapi-tasarimi/.test(x.url())) || p.mainFrame();
console.log('çerçeve:', f.url(), '· üst sayfa:', p.url());
console.log('ağ (kur):', ag.join(' | ') || 'yok');
console.log('KUR:', JSON.stringify(await f.evaluate(() => { try { return { KUR, SITE: window.SITE, yerel: localStorage.getItem('pm-kur') }; } catch (e) { return String(e); } })));
console.log('sekmeler:', JSON.stringify(await f.evaluate(() => [...document.querySelectorAll('#tabs button[data-m]')].map((x) => [x.dataset.m, x.textContent.trim(), x.hidden || getComputedStyle(x).display === 'none' ? 'gizli' : 'görünür']))));
console.log('dil:', JSON.stringify(await f.evaluate(() => [...document.querySelectorAll('#lang option')].map((x) => x.value))));
console.log('başlık düğmeleri:', JSON.stringify(await f.evaluate(() => [...document.querySelectorAll('header button')].map((x) => [x.id, x.hidden ? 'gizli' : 'görünür', (x.title || x.textContent || '').trim().slice(0, 40)]))));
const sonuc = [];
for (const k of KODLAR) {
  const r = await f.evaluate((kod) => { try { const ok = pmLoad(kod); if (!ok) return { kod, ok }; const i = gInfo(); try { gUpdPrice(); } catch (e) {} return { kod, ok, ad: i.name, olcu: i.big, fiyat: gPrice(i), ekran: (document.getElementById('gprice') || {}).textContent, not: (document.getElementById('gprn') || {}).textContent, kur: KUR.usd, parca: i.parts.length, kon: i.conn.length }; } catch (e) { return { kod, hata: String(e).slice(0, 120) }; } }, k);
  sonuc.push(r);
}
for (const r of sonuc) console.log('F', JSON.stringify(r));
console.log('sayfa hatası:', hata.join(' | ') || 'yok');
await b.close();
