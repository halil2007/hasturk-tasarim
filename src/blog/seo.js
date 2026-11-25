// SEO ve yapay zekâ altyapısı: yapısal veri (JSON-LD), site haritası, robots.txt, llms.txt, RSS.
// Kurulum modunda (ayar yayin=kurulum) ya da asıl alan adı dışında (ör. workers.dev önizlemesi) her şey noindex.
import { esc, metin, kirp } from './ortak.js';
import { YAYINDA } from './db.js';
import { duz, sssCoz } from './md.js';
import { sosyalHesaplar } from './sosyal.js';
import { YAZAR_LISTE, yazarBul, kisiJsonLd } from './yazarlar.js';
import { AY_SLUG, AY_AD, BOLUM_SLUG } from './takvim.js';

export function indexlenir(c) {
  if (c.A.yayin !== 'canli') return false;
  try { return new URL(c.A.site_url).host === c.url.host; } catch { return false; }
}
const tam = (c, p) => (c.A.site_url || '') + p;
const KURUM = (c) => ({ '@type': 'Organization', '@id': (c.A.magaza_url || 'https://hasturkgubre.com.tr').replace(/\/$/, '') + '/#organization', name: 'HasTürk Gübre', url: c.A.magaza_url || 'https://hasturkgubre.com.tr', logo: { '@type': 'ImageObject', url: tam(c, '/blog-statik/logo.webp') },
  contactPoint: { '@type': 'ContactPoint', telephone: '+90-553-727-2929', contactType: 'customer service', areaServed: 'TR', availableLanguage: 'Turkish' }, ...(sosyalHesaplar(c.A).length ? { sameAs: sosyalHesaplar(c.A).map((s) => s.link) } : {}) });

export function siteJsonLd(c) {
  if (c.url.pathname !== (c.base || '/') && c.url.pathname !== c.base + '/') return null;
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: c.A.site_adi || 'HasTürk Blog', url: tam(c, '/'), inLanguage: 'tr-TR', publisher: KURUM(c),
    potentialAction: { '@type': 'SearchAction', target: tam(c, '/ara?q={search_term_string}'), 'query-input': 'required name=search_term_string' } };
}
export function yaziJsonLd(c, y) {
  return { '@context': 'https://schema.org', '@type': y.tur === 'gundem' ? 'NewsArticle' : 'BlogPosting', headline: kirp(y.baslik, 110), description: y.seo_aciklama || y.ozet || '',
    image: y.gorsel ? [/^https?:/.test(y.gorsel) ? y.gorsel : tam(c, y.gorsel)] : undefined, datePublished: new Date(y.yayin_ts || Date.now()).toISOString(),
    dateModified: new Date(y.guncel_ts || y.yayin_ts || Date.now()).toISOString(), inLanguage: 'tr-TR', mainEntityOfPage: tam(c, '/' + y.slug),
    author: yazarKisi(c, y.yazar), publisher: KURUM(c),
    articleSection: y.kad || undefined, keywords: y.etiketler || undefined, wordCount: duz(y.govde).split(/\s+/).length };
}
function yazarKisi(c, ad) {
  const yz = yazarBul(c.A, ad);
  if (yz) return kisiJsonLd(yz, tam(c, '/yazar/' + yz.slug));
  return !ad || /ekib/i.test(ad) ? { '@type': 'Organization', name: ad || 'HasTürk Editör Ekibi', url: tam(c, '/hakkimizda') } : { '@type': 'Person', name: ad, worksFor: { '@type': 'Organization', name: 'HasTürk Gübre' } };
}
export function kirintiJsonLd(c, adimlar) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Ana Sayfa', '/'], ...adimlar].map(([ad, p], i) => ({ '@type': 'ListItem', position: i + 1, name: ad, item: tam(c, p) })) };
}
export function sssJsonLd(sss) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: sss.map((q) => ({ '@type': 'Question', name: q.s, acceptedAnswer: { '@type': 'Answer', text: q.c } })) };
}
// Yazar url'si (Google ister): yazar sayfası olan ekip üyesinde yazar sayfası, diğer ekip cevaplarında Hakkımızda, üye cevabında cevabın kendi adresi
export function soruJsonLd(c, s, cevaplar, gorseller = []) {
  const url = tam(c, '/soru-cevap/' + s.id + '-' + s.slug);
  const cv = (a) => ({ '@type': 'Answer', text: a.metin, dateCreated: new Date(a.ts).toISOString(), upvoteCount: Math.max(0, a.oy || 0), url: url + '#c' + a.id, author: yazan(a) });
  const yazan = (a) => {
    const yz = yazarBul(c.A, a.uad);
    return { '@type': 'Person', name: a.uad, url: yz ? tam(c, '/yazar/' + yz.slug) : a.urol !== 'uye' ? tam(c, '/hakkimizda') : url + '#c' + a.id };
  };
  const coz = cevaplar.find((a) => a.id === s.cozum_id);
  return { '@context': 'https://schema.org', '@type': 'QAPage', mainEntity: { '@type': 'Question', name: s.baslik, text: s.metin, answerCount: cevaplar.length, upvoteCount: Math.max(0, s.oy || 0),
    dateCreated: new Date(s.ts).toISOString(), author: { '@type': 'Person', name: s.derleme ? 'Bir bahçe sever' : s.uad, url }, ...(gorseller.length ? { image: gorseller } : {}), ...(coz ? { acceptedAnswer: cv(coz) } : {}), suggestedAnswer: cevaplar.filter((a) => a !== coz).map(cv) } };
}

export async function siteHaritasi(c) {
  const now = Date.now();
  const [y, k, s, yz] = await Promise.all([
    c.db.prepare(`SELECT slug, guncel_ts, yayin_ts, gorsel FROM b_yazi WHERE ${YAYINDA} ORDER BY yayin_ts DESC LIMIT 5000`).bind(now).all(),
    c.db.prepare('SELECT slug FROM b_kategori').all(),
    c.db.prepare("SELECT id, slug, son_ts, ts FROM b_soru WHERE durum = 'onayli' AND cevap_sayisi > 0 ORDER BY ts DESC LIMIT 5000").all(),
    c.db.prepare(`SELECT yazar, MAX(yayin_ts) son FROM b_yazi WHERE ${YAYINDA} GROUP BY yazar`).bind(now).all(),
  ]);
  const yazarlar = YAZAR_LISTE.map((a) => [a, yz.results.find((r) => r.yazar === a.ad)]).filter(([, r]) => r);
  const t = (ts) => new Date(ts || now).toISOString();
  const u = (loc, lm, img) => `<url><loc>${esc(tam(c, loc))}</loc>${lm ? `<lastmod>${t(lm)}</lastmod>` : ''}${img ? `<image:image><image:loc>${esc(/^https?:/.test(img) ? img : tam(c, img))}</image:loc></image:image>` : ''}</url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${u('/', y.results[0] && y.results[0].yayin_ts)}${u('/kategoriler')}${u('/soru-cevap')}${u('/hakkimizda')}${u('/bahce-takvimi')}${AY_SLUG.map((a) => u('/bahce-takvimi/' + a) + Object.values(BOLUM_SLUG).map((b) => u('/bahce-takvimi/' + a + '/' + b)).join('')).join('')}
${k.results.map((r) => u('/kategori/' + r.slug)).join('')}
${yazarlar.length ? u('/yazarlar') + yazarlar.map(([a, r]) => u('/yazar/' + a.slug, r.son)).join('') : ''}
${y.results.map((r) => u('/' + r.slug, r.guncel_ts || r.yayin_ts, r.gorsel)).join('\n')}
${s.results.map((r) => u('/soru-cevap/' + r.id + '-' + r.slug, r.son_ts || r.ts)).join('\n')}
</urlset>`;
  return metin(xml, 'application/xml', indexlenir(c) ? {} : { 'X-Robots-Tag': 'noindex' });
}

// Arama motoru ve yapay zekâ tarayıcıları: hepsine açık (yazıların ChatGPT, Claude, Perplexity, Gemini, Copilot
// cevaplarında kaynak gösterilebilmesi için). Bir tarayıcı adıyla kural grubu varsa "*" grubunu okumaz; o yüzden
// aynı yasaklar her grupta tekrarlanır. Kurallar önek eşleşir: "/ara" yazılsa "/aralik-ayinda-…" yazıları da
// engellenirdi; bu yüzden tam yol ($) ve ? biçimi kullanılır.
const TARAYICILAR = ['Googlebot', 'Google-Extended', 'Bingbot', 'YandexBot', 'Applebot', 'Applebot-Extended', 'DuckDuckBot',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User',
  'Meta-ExternalAgent', 'Amazonbot', 'CCBot', 'cohere-ai', 'MistralAI-User'];
const YASAK = ['/panel$', '/panel/', '/api/', '/git/', '/b/', '/ara$', '/ara?', '/giris$', '/giris?', '/kayit$', '/kayit?', '/hesabim$', '/hesabim/', '/blog-statik/veri/'];
export function robots(c) {
  if (!indexlenir(c)) return metin('# Kurulum aşaması: arama motorlarına kapalı\nUser-agent: *\nDisallow: /\n');
  const kural = 'Allow: /\n' + YASAK.map((y) => 'Disallow: ' + y).join('\n');
  return metin(`# ${c.A.site_adi || 'HasTürk Blog'}: arama motorları ve yapay zekâ asistanları içerikleri okuyabilir, kaynak göstererek alıntılayabilir.
# Özet: ${tam(c, '/llms.txt')}  Tam metin özetleri: ${tam(c, '/llms-full.txt')}

${TARAYICILAR.map((t) => 'User-agent: ' + t).join('\n')}
${kural}

User-agent: *
${kural}

Sitemap: ${tam(c, '/sitemap.xml')}
`, 'text/plain', { 'Cache-Control': 'public, max-age=3600' });
}

const ILETISIM = (c) => `HasTürk müşteri hizmetleri: +90 553 727 2929 (sipariş, kargo, iade ve ürün seçimi). Mağaza: ${c.A.magaza_url || 'https://hasturkgubre.com.tr'}`;
async function yazilar(c, alanlar) {
  return (await c.db.prepare(`SELECT ${alanlar}, k.ad kad FROM b_yazi y LEFT JOIN b_kategori k ON k.id = y.kategori_id WHERE ${YAYINDA.replace(/durum|yayin_ts/g, (m) => 'y.' + m)} ORDER BY k.sira, y.okunma DESC`).bind(Date.now()).all()).results;
}
// llms.txt: yapay zekâ asistanlarının siteyi doğru tanıması için özet ve bütün yazılar (llmstxt.org biçimi)
export async function llms(c) {
  const [r, s] = await Promise.all([
    yazilar(c, 'y.slug, y.baslik, y.ozet'),
    c.db.prepare("SELECT id, slug, baslik FROM b_soru WHERE durum = 'onayli' AND cevap_sayisi > 0 ORDER BY goruntulenme DESC LIMIT 60").all(),
  ]);
  const grup = {};
  for (const y of r) (grup[y.kad || 'Diğer'] = grup[y.kad || 'Diğer'] || []).push(y);
  const out = [`# ${c.A.site_adi || 'HasTürk Blog'}`, '', `> HasTürk Gübre'nin bitki bakımı, bahçecilik ve tarım rehberi. Saksı, balkon, bahçe ve tarla bitkileri için toprak hazırlığı, sulama, gübreleme, ekim takvimi, hastalık ve zararlı belirtileri, bahçe yatağı ve bahçe kulesi kullanımı; bahçe severlerin soru-cevap topluluğu.`, '',
    'Yazılar HasTürk Editör Ekibi tarafından hazırlanır ve düzenli güncellenir. Her yazının başında "Kısaca" bölümünde soruya doğrudan cevap, sonunda sık sorulan sorular bulunur.',
    ILETISIM(c), '', `Bütün yazıların kısa cevapları ve sık sorulan soruları tek dosyada: ${tam(c, '/llms-full.txt')}`, ''];
  for (const [ad, l] of Object.entries(grup)) { out.push(`## ${ad}`, ''); l.forEach((y) => out.push(`- [${y.baslik}](${tam(c, '/' + y.slug)}): ${kirp(y.ozet, 160)}`)); out.push(''); }
  out.push('## Soru-Cevap', '', `- [Bahçe Soru-Cevap](${tam(c, '/soru-cevap')}): Üyelerin soruları ve HasTürk ekibinin cevapları`);
  s.results.forEach((q) => out.push(`- [${q.baslik}](${tam(c, '/soru-cevap/' + q.id + '-' + q.slug)})`));
  out.push('', '## Bahçe Takvimi', '', `- [Bahçe Takvimi](${tam(c, '/bahce-takvimi')}): Ay ay ekilecek sebzeler, dikilecek fidanlar, çiçek ve saksı bitkisi bakımı, bahçe işleri`);
  AY_SLUG.forEach((a, i) => out.push(`- [${AY_AD[i]} ayında bahçe](${tam(c, '/bahce-takvimi/' + a)})`));
  out.push('', '## Diğer', '', `- [Hakkımızda](${tam(c, '/hakkimizda')})`, `- [Kategoriler](${tam(c, '/kategoriler')})`, `- [Mağaza](${c.A.magaza_url || 'https://hasturkgubre.com.tr'}): HasTürk gübre, toprak, bahçe yatağı, bahçe kulesi ve ilaçlama pompası ürünleri`, '');
  return metin(out.join('\n'), 'text/markdown', { 'Cache-Control': 'public, max-age=3600' });
}
// llms-full.txt: her yazının doğrudan cevabı (Kısaca) ve sık sorulan soruları; yapay zekâ cevaplarında alıntılanmaya uygun
export async function llmsTam(c) {
  const r = await yazilar(c, 'y.slug, y.baslik, y.ozet, y.kisaca, y.sss, y.guncel_ts, y.yayin_ts');
  const out = [`# ${c.A.site_adi || 'HasTürk Blog'}: yazıların kısa cevapları`, '', `> Her bölüm bir yazının özeti, kısa cevabı ve sık sorulan sorularıdır. Ayrıntı için yazının bağlantısına bakın. ${ILETISIM(c)}`, ''];
  for (const y of r) {
    out.push(`## ${y.baslik}`, '', `Kaynak: ${tam(c, '/' + y.slug)} · Konu: ${y.kad || 'Genel'} · Güncelleme: ${new Date(y.guncel_ts || y.yayin_ts).toISOString().slice(0, 10)}`, '');
    if (y.kisaca) out.push(String(y.kisaca).trim(), ''); else if (y.ozet) out.push(String(y.ozet).trim(), '');
    for (const q of sssCoz(y.sss)) out.push(`**${q.s}**`, q.c, '');
  }
  return metin(out.join('\n'), 'text/markdown', { 'Cache-Control': 'public, max-age=3600' });
}

// IndexNow: yeni yayımlanan ya da güncellenen yazıları ve yeni cevaplanan soruları Bing, Yandex ve diğer IndexNow
// arama motorlarına hemen bildirir (ChatGPT ve Copilot aramaları Bing dizinini kullanır). Anahtar herkese açık bir
// doğrulama kodudur (sitede /<anahtar>.txt olarak durur), gizli bilgi değildir. Ziyaretler sırasında en fazla saatte bir kontrol edilir.
export const INDEXNOW_ANAHTAR = 'b3e745c827283a6403b5d84af1bfb53a';
export async function indexNowBildir(c) {
  if (!indexlenir(c)) return;
  const simdi = Date.now(), son = Number(c.A.indexnow_ts) || 0;
  if (simdi - son < 3600000) return;
  await c.db.prepare('INSERT OR REPLACE INTO b_ayar (k, v) VALUES (?, ?)').bind('indexnow_ts', String(simdi)).run();
  const once = son; // ilk çalışmada (son = 0) bütün yazılar ve cevaplı sorular bir kez bildirilir
  const [y, s] = await Promise.all([
    c.db.prepare(`SELECT slug FROM b_yazi WHERE ${YAYINDA} AND (yayin_ts > ? OR guncel_ts > ?) LIMIT 5000`).bind(simdi, once, once).all(),
    c.db.prepare("SELECT id, slug FROM b_soru WHERE durum = 'onayli' AND cevap_sayisi > 0 AND COALESCE(son_ts, ts) > ? LIMIT 4000").bind(once).all(),
  ]);
  const urlList = [...y.results.map((r) => tam(c, '/' + r.slug)), ...s.results.map((r) => tam(c, '/soru-cevap/' + r.id + '-' + r.slug))];
  if (!urlList.length) return;
  urlList.push(tam(c, '/'));
  const host = new URL(c.A.site_url).host;
  await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: INDEXNOW_ANAHTAR, keyLocation: tam(c, '/' + INDEXNOW_ANAHTAR + '.txt'), urlList }) });
}

export async function rss(c) {
  const r = await c.db.prepare(`SELECT slug, baslik, ozet, yayin_ts, gorsel FROM b_yazi WHERE ${YAYINDA} ORDER BY yayin_ts DESC LIMIT 30`).bind(Date.now()).all();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(c.A.site_adi)}</title><link>${esc(tam(c, '/'))}</link><description>${esc(c.A.slogan || '')}</description><language>tr-TR</language><atom:link href="${esc(tam(c, '/feed.xml'))}" rel="self" type="application/rss+xml"/>
${r.results.map((y) => `<item><title>${esc(y.baslik)}</title><link>${esc(tam(c, '/' + y.slug))}</link><guid>${esc(tam(c, '/' + y.slug))}</guid><pubDate>${new Date(y.yayin_ts).toUTCString()}</pubDate><description>${esc(y.ozet || '')}</description></item>`).join('\n')}
</channel></rss>`;
  return metin(xml, 'application/rss+xml', indexlenir(c) ? {} : { 'X-Robots-Tag': 'noindex' });
}
