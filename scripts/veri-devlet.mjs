// Resmî kaynaklardan bilgi toplama (Tarım ve Orman Bakanlığı, TAGEM araştırma enstitüleri): site haritası olmadığı
// için ana sayfadan başlayıp aynı sitedeki bağlantıları gezer, yetiştiricilik / bakım / gübreleme / budama / hastalık
// yayınlarını (PDF ve sayfa) bulur, metne çevirir ve ŞİFRELEYEREK veri/ham/<site>.enc olarak kaydeder.
// robots.txt'ye uyar, istekler arası en az 1,5 sn. Zirai ilaç dozları kullanılmaz (müşteriye ilaç dozu verilmez).
// Kullanım: node scripts/veri-devlet.mjs <site> [başlangıç yolu …] (ör. araştırma enstitülerinin alt siteleri: /yalovabahce /alata)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync, constants as Z } from 'node:zlib';
import crypto from 'node:crypto';
const site = process.argv[2], kok = 'https://' + site, tohum = process.argv.slice(3).map((y) => kok + (y.startsWith('/') ? y : '/' + y));
const UA = 'Mozilla/5.0 (compatible; HasTurkBilgeBey/1.0; +https://hasturkgubre.com.tr)';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u, ikili = false, ms = 45000) => {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: c.signal }); const tip = r.headers.get('content-type') || '';
    return { ok: r.ok, tip, veri: r.ok ? (ikili || /pdf/.test(tip) ? Buffer.from(await r.arrayBuffer()) : await r.text()) : null }; }
  catch (e) { return { ok: false, tip: '', veri: null }; } finally { clearTimeout(t); }
};
// robots.txt
const rb = await get(kok + '/robots.txt'); let bizim = false; const yasak = [];
for (const l of (rb.ok ? String(rb.veri) : '').split('\n')) { const m = l.replace(/#.*/, '').trim().match(/^(user-agent|disallow)\s*:\s*(.*)$/i); if (!m) continue; if (/user-agent/i.test(m[1])) bizim = m[2].trim() === '*'; else if (bizim && m[2].trim()) yasak.push(m[2].trim().replace(/\*.*$/, '')); }
const ana = (h) => h.replace(/^www\./, ''), izinli = (u) => { try { const x = new URL(u); return ana(x.hostname) === ana(site) && !yasak.some((d) => d && x.pathname.startsWith(d)); } catch { return false; } };
// Konu: bitki yetiştiriciliği / bakımı. Kapsam dışı: ihale, duyuru, personel, mevzuat, hayvancılık, su ürünleri…
const KONU = /liflet|kitap[çc][ıi]k|yeti[sş]tir|bak[ıi]m|g[üu]brele|budama|a[sş][ıi]lama|dikim|ekim|fidan|fide|meyve|sebze|s[üu]s bitki|[çc]i[çc]ek|zeytin|narenciye|asma|ba[gğ]|f[ıi]nd[ıi]k|antep|[çc]ilek|domates|hastal[ıi]k|zararl[ıi]|toprak|kompost|organik|sera|bah[çc]e|tohum|yay[ıi]n|bro[sş][üu]r|kitap|b[üu]lten|teknik/i;
const DIS = /ihale|duyuru|personel|kadro|mevzuat|y[öo]netmelik|genelge|haber|etkinlik|hayvan|s[üu]t|su [üu]r[üu]n|bal[ıi]k|ar[ıi]c[ıi]l|orman yang|av |tender|kvkk|iletisim|ileti[sş]im|misyon|vizyon|tarih[çc]e|organizasyon|kalite politika|hizmet standart|hesap no|m[üu]d[üu]r yard|kurumsal yap|g[öo]revlerimiz|laboratuvar|basın|bas[ıi]n/i;
const ONCELIK = /liflet|kitap[çc][ıi]k|yay[ıi]n|bro[sş][üu]r|kitap|belge|b[üu]lten|dok[üu]man|teknik|yeti[sş]tiricili|el kitab|rehber|pdf/i;
// Başlangıç yolları verildiyse (enstitü alt siteleri) gezinti oradan başlar; ana sayfa en sona kalır
const bas = tohum.length ? [...tohum, kok + '/'] : [kok + '/'];
const sayfalar = new Map(bas.map((u) => [u, 0])), gorulen = new Set(), pdf = new Map(), kayit = [];
const kuyruk = [...bas];
const metin = (h) => h.replace(/<(script|style|noscript|svg|header|footer|nav|select|button)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<h[1-4][^>]*>/gi, '\n## ').replace(/<li[^>]*>/gi, '\n• ').replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1).join('\n');
// İş 90 dakikada kesilir: gezinti 55, PDF okuma 80 dakikada durur ve elde olan kaydedilir
const BASLA = Date.now(), dk = (n) => Date.now() - BASLA > n * 60000;
while (kuyruk.length && gorulen.size < 1500 && !dk(55)) {
  const u = kuyruk.shift(); if (gorulen.has(u)) continue; gorulen.add(u);
  const r = await get(u); await bekle(1500);
  if (!r.ok || typeof r.veri !== 'string') continue;
  const d = sayfalar.get(u) || 0, h = r.veri;
  // Bağlantılar: <a href> ve açılır listelerdeki <option value> (enstitü listesi açılır menüde duruyor)
  const baglar = [...h.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi), ...[...h.matchAll(/<option\b[^>]*value=["']((?:https?:)?\/[^"'#]+)["'][^>]*>([\s\S]*?)<\/option>/gi)].map((m) => [m[0], m[1], m[2] + ' yayın'])];
  for (const m of baglar) {
    let v; try { v = new URL(m[1].replace(/&amp;/g, '&'), u).href; } catch { continue; }
    if (!izinli(v)) continue;
    const yazi = (m[2].replace(/<[^>]+>/g, ' ') + ' ' + decodeURIComponent(v)).replace(/\s+/g, ' ');
    if (/\.pdf($|\?)/i.test(v)) { if (KONU.test(yazi) && !DIS.test(yazi) && pdf.size < 300) pdf.set(v, yazi.slice(0, 200)); }
    else if (d < 6 && !sayfalar.has(v) && !/\.(jpe?g|png|gif|docx?|xlsx?|zip|rar|mp4)($|\?)/i.test(v) && (d < 2 || KONU.test(yazi) || ONCELIK.test(yazi)) && !DIS.test(yazi)) { sayfalar.set(v, d + 1); if (ONCELIK.test(yazi)) kuyruk.unshift(v); else kuyruk.push(v); }
  }
}
console.log(`${site}: gezilen sayfa ${gorulen.size}, konu sayfası ${kayit.length}, bulunan PDF ${pdf.size}`);
let pn = 0;
for (const [u, yazi] of pdf) {
  if (dk(80)) break;
  const r = await get(u, true); await bekle(1500);
  if (!r.ok || !r.veri || r.veri.slice(0, 4).toString() !== '%PDF') continue;
  writeFileSync('/tmp/y.pdf', r.veri);
  let t = ''; try { t = execFileSync('pdftotext', ['-layout', '/tmp/y.pdf', '-'], { maxBuffer: 64 << 20 }).toString(); } catch { continue; }
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 800) { kayit.push({ u, b: yazi, t: t.slice(0, 120000), pdf: 1 }); pn++; }
}
console.log(`${site}: okunan PDF ${pn}, toplam kayıt ${kayit.length}`);
const ham = gzipSync(Buffer.from(kayit.map((k) => JSON.stringify(k)).join('\n')), { level: Z.Z_BEST_COMPRESSION });
const key = crypto.randomBytes(32), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(ham), c.final()]), tag = c.getAuthTag();
const k = crypto.publicEncrypt({ key: readFileSync('scripts/veri-anahtar.pub', 'utf8'), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
mkdirSync('veri/ham', { recursive: true });
writeFileSync(`veri/ham/${site}.enc`, JSON.stringify({ site, tarih: new Date().toISOString(), adet: kayit.length, k: k.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64'), ct: ct.toString('base64') }));
console.log(`${site}: veri/ham/${site}.enc ${(ct.length / 1024).toFixed(0)} KB (şifreli)`);
