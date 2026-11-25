// "Kendin Tasarla" sipariş ürünü — window.addToCart denemesi (gerçek site, anonim sepet, sipariş verilmez).
// Soru: bir seçenekte birden fazla değer (ör. 4 + 1 = 5 adet) aynı anda seçilebiliyor mu, sepetteki fiyat doğru mu?
import { chromium } from 'playwright';
import { appendFileSync } from 'node:fs';
const SITE = process.env.SITE_URL || 'https://hasturkgubre.com.tr', SLUG = 'kendi-serani-tasarla';
const out = []; const log = (s) => { out.push(s); console.log(s); };
const html = await (await fetch(`${SITE}/${SLUG}`)).text();
const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
let urun = null; (function walk(o, d) { if (urun || !o || typeof o !== 'object' || d > 16) return; if (o.metaData && o.metaData.slug === SLUG && o.productOptionSet) { urun = o; return; } for (const k in o) walk(o[k], d + 1); })(JSON.parse(m[1]), 0);
const set = urun.productOptionSet, vid = urun.variants[0].id, taban = (urun.variants[0].prices[0] || {}).sellPrice;
const opt = (re) => set.options.find((o) => re.test(o.name)), val = (o, ad) => o.selectSettings.values.find((v) => v.value.trim() === ad);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
await ctx.route((u) => u.hostname === 'hasturk-arama.halilc2007.workers.dev', (r) => r.abort());
const p = await ctx.newPage();
await p.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForFunction(() => typeof window.addToCart === 'function', null, { timeout: 60000 });
await p.waitForTimeout(1500);
const ekle = async (ad, secim) => {
  const opts = [], bek = [taban];
  for (const [re, degerler] of secim) { const o = opt(re); if (typeof degerler === 'string') { opts.push({ productOptionId: o.id, productOptionsSetId: set.id, values: [degerler] }); continue; }
    const v = degerler.map((d) => val(o, d)); opts.push({ productOptionId: o.id, productOptionsSetId: set.id, values: v.map((x) => x.id) }); v.forEach((x) => bek.push(x.price)); }
  const r = await p.evaluate(async ({ vid, opts }) => { try { const x = await window.addToCart({ variantId: vid, quantity: 1, options: opts }); const its = ((x && x.response && x.response.data && x.response.data.items) || []).filter((i) => i.variant && i.variant.id === vid);
    const it = its[its.length - 1]; return { ok: x && x.success, hata: x && x.response && x.response.errors, satir: its.length, fiyat: it && (it.finalPrice || it.price), secenek: it && JSON.stringify(it.options).slice(0, 1200) }; } catch (e) { return { hata: String(e) }; } }, { vid, opts });
  log(`${ad}: beklenen ${bek.join(' + ')} = ${bek.reduce((a, c) => a + c, 0)} · sonuç ${JSON.stringify(r)}`);
};
await ekle('Tek değer (59,5 cm × 4)', [[/59,5/, ['4 Adet']]]);
await ekle('Çoklu değer (59,5 cm × 4+1=5, PC005 × 4) + kod', [[/59,5/, ['1 Adet', '4 Adet']], [/PC005/, ['4 Adet']], [/Tasarım Kodu/, 'HG-D1-200_80_75_1 (deneme)']]);
await ekle('Büyük adet (149,5 cm × 20+3=23)', [[/149,5/, ['3 Adet', '20 Adet']]]);
await b.close();
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n');
