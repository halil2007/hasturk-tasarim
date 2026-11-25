// Bilgi kaynağı keşfi (içerik indirmez, kaydetmez): her site için robots.txt izni, site haritası ve bakım / rehber
// sayfası sayısı. Sonuç yalnız sayılar ve örnek sayfa adresleri (iş özeti). Siteler: scripts/kaynak-siteler.txt.
import { readFileSync, appendFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (compatible; HasTurkBilgeBey/1.0; +https://hasturkgubre.com.tr)';
const siteler = readFileSync('scripts/kaynak-siteler.txt', 'utf8').split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
// Bitki bakımı içeriği olabilecek sayfalar (adresinde)
const BAKIM = /blog|rehber|bakim|bakım|nasil|nasıl|yetistir|yetiştir|gubre|gübre|toprak|budama|ekim|dikim|sulama|hastalik|hastalık|zararli|zararlı|bilgi|makale|yayin|yayın|kitap|brosur|broşür|plant|grow|care|soil|fertili|pruning|garden|how-to|advice|factsheet|publication|pdf/i;
const URUN = /\/(urun|product|products|kategori|category|collections|sepet|cart|marka|brand)\b/i;
const get = async (u, ms = 20000) => {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: c.signal }); return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' }; }
  catch (e) { return { ok: false, status: String(e.name || e).slice(0, 20), text: '' }; } finally { clearTimeout(t); }
};
const robotsIzin = (txt) => {
  // Basit okuma: "User-agent: *" bölümünde "Disallow: /" varsa tüm site kapalı
  let bizim = false, kapali = false, dis = [];
  for (const l of txt.split('\n')) {
    const m = l.replace(/#.*/, '').trim().match(/^(user-agent|disallow|allow|sitemap)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') bizim = v === '*';
    else if (k === 'disallow' && bizim) { if (v === '/') kapali = true; else if (v) dis.push(v); }
  }
  return { kapali, dis };
};
const out = [], log = (s) => { out.push(s); console.log(s); };
for (const site of siteler) {
  const kok = 'https://' + site, rb = await get(kok + '/robots.txt');
  const iz = rb.ok ? robotsIzin(rb.text) : { kapali: false, dis: [] };
  const hm = rb.ok ? [...rb.text.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]) : [];
  if (!hm.length) hm.push(kok + '/sitemap.xml');
  const urls = new Set(), gez = async (u, d) => {
    if (d > 2 || urls.size > 20000) return;
    const r = await get(u); if (!r.ok) return;
    const L = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/i.test(r.text)) { for (const s of L.slice(0, 60)) await gez(s, d + 1); } else L.forEach((x) => urls.add(x));
  };
  for (const s of hm.slice(0, 5)) await gez(s, 0);
  const izinli = [...urls].filter((u) => { try { const p = new URL(u).pathname; return !iz.dis.some((d) => d !== '/' && p.startsWith(d.replace(/\*.*$/, ''))); } catch { return false; } });
  const bakim = izinli.filter((u) => BAKIM.test(decodeURIComponent(u)) && !URUN.test(u));
  log(`\n== ${site} · ana sayfa ${(await get(kok, 15000)).status} · robots.txt ${rb.status}${iz.kapali ? ' · TÜM SİTE KAPALI (robots)' : ''} · site haritası adresi ${urls.size} · bakım/rehber adayı ${bakim.length}`);
  bakim.slice(0, 12).forEach((u) => log('   ' + decodeURIComponent(u).slice(0, 140)));
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n');
