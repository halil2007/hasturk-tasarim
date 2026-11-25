// Blogun arama motoru ve yapay zekâ uyumunu canlıda kontrol eder (yalnız okuma): robots.txt, llms.txt,
// llms-full.txt, IndexNow anahtarı, yazı sayfası etiketleri, ürün bağlantıları ve tarayıcıların engellenip engellenmediği.
// Sonucu cikti/seo.txt dosyasına yazar.
import { mkdirSync, writeFileSync } from 'node:fs';
const B = process.argv[2] || 'https://blog.hasturkgubre.com.tr';
const M = 'https://hasturkgubre.com.tr';
mkdirSync('cikti', { recursive: true });
const log = [];
const L = (s) => { log.push(s); console.log(s); };
const al = async (u, ua) => { try { const r = await fetch(u, { headers: ua ? { 'User-Agent': ua } : {}, redirect: 'manual' }); return { d: r.status, t: await r.text(), h: r.headers }; } catch (e) { return { d: 'hata ' + e.message, t: '', h: new Headers() }; } };

const rb = await al(B + '/robots.txt');
L(`robots.txt ${rb.d} · GPTBot: ${/User-agent: GPTBot/.test(rb.t)} · ClaudeBot: ${/ClaudeBot/.test(rb.t)} · Sitemap: ${/Sitemap:/.test(rb.t)}`);
L('--- robots.txt (ilk 8 satır) ---\n' + rb.t.split('\n').slice(0, 8).join('\n'));
const ll = await al(B + '/llms.txt');
L(`llms.txt ${ll.d} · ${ll.t.split('\n').filter((x) => x.startsWith('- [')).length} bağlantı`);
const lf = await al(B + '/llms-full.txt');
L(`llms-full.txt ${lf.d} · ${Math.round(lf.t.length / 1024)} KB · ${(lf.t.match(/^## /gm) || []).length} yazı`);
const kl = await al(B + '/b3e745c827283a6403b5d84af1bfb53a.txt');
L(`IndexNow anahtar dosyası ${kl.d} · ${kl.t.trim() === 'b3e745c827283a6403b5d84af1bfb53a' ? 'doğru' : 'YANLIŞ'}`);
const sm = await al(B + '/sitemap.xml');
L(`sitemap.xml ${sm.d} · ${(sm.t.match(/<loc>/g) || []).length} adres`);

const ilk = ((ll.t.split('](').find((x, i) => i && x.startsWith(B + '/') && !x.startsWith(B + '/soru-cevap')) || '').split(')')[0]) || B + '/';
const y = await al(ilk);
L(`örnek yazı ${ilk} → ${y.d}`);
L(`  robots meta: ${(y.t.match(/<meta name="robots" content="([^"]+)"/) || [])[1]}`);
L(`  doğrudan mağaza bağlantısı: ${(y.t.match(/href="https:\/\/hasturkgubre\.com\.tr\/[^"]+" data-git/g) || []).length} · nofollow: ${(y.t.match(/rel="nofollow"/g) || []).length}`);
L(`  JSON-LD türleri: ${[...y.t.matchAll(/"@type":"(\w+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);
const kat = await al(B + '/kategori/bitki-bakimi');
L(`kategori sayfası ${kat.d} · CollectionPage: ${/CollectionPage/.test(kat.t)}`);

L('--- tarayıcı erişimi (blog yazısı / mağaza ana sayfa) ---');
for (const [ad, ua] of [['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'], ['Bingbot', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
  ['GPTBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot'], ['OAI-SearchBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot'],
  ['ChatGPT-User', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot'], ['ClaudeBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
  ['PerplexityBot', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)']]) {
  const a = await al(ilk, ua), m = await al(M + '/', ua);
  L(`${ad}: blog ${a.d} · mağaza ${m.d}`);
}
const mr = await al(M + '/robots.txt');
L(`--- mağaza robots.txt (${mr.d}) ---\n` + mr.t.slice(0, 1500));
writeFileSync('cikti/seo.txt', log.join('\n'));
