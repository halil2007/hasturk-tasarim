// Bilge Bey için bilgi toplama: seçili sitelerin rehber / blog sayfalarını indirir, metne çevirir ve ŞİFRELEYEREK
// veri/ham/<site>.enc olarak kaydeder (depo herkese açık; başka sitelerin yazıları açık metin durmaz). Şifre:
// AES-256-GCM, anahtarı scripts/veri-anahtar.pub (RSA-OAEP) ile sarılı; çözme anahtarı yalnız geliştirme ortamında.
// Bu veriden yalnız genel bitki bilgisi (toprak, sulama, gübre, ekim, budama, sorunlar) çıkarılır ve kendi cümlelerimizle
// yazılır; müşteriye kaynak, site adı, link ya da marka gösterilmez. robots.txt'ye uyulur, saniyede en çok 1 istek.
// Kullanım: node scripts/veri-topla.mjs <site>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync, constants as Z } from 'node:zlib';
import crypto from 'node:crypto';
const SITELER = {
  'fidanistanbul.com': { url: (u) => /\/blog\/[^/]+$/.test(u) && !/fiyat|ithalat|ihracat|kampanya/.test(u), max: 1200 },
  'perlitmarket.com': { url: (u) => /\/(blog|pages)\/[^/]+$/.test(u) && !/iletisim|sozlesme|politika|kvkk|hakkimizda|sss|iade|teslimat|gizlilik|brands|order|siparis/.test(u), max: 900 },
  'fidanburada.com': { url: (u) => /\/blog\/[^/]+\/?$/.test(u), max: 400 },
  'fidansepetim.com': { url: (u) => /\/sayfa\//.test(u) && !/Iletisim|Hakkimizda|Sozlesme|Gizlilik|Iade/i.test(u), max: 100 },
  'tarlasera.com': { url: (u) => /\/makale-\d+/.test(u), max: 400 },
  // NC State Extension Gardener Plant Toolbox: bitki başına ışık, toprak, nem, pH, zehirlilik bilgisi. Türkiye'de ev, balkon ve
  // bahçede yetiştirilen cinsler önce indirilir (süre yetmezse en faydalılar alınmış olur)
  'plants.ces.ncsu.edu': { url: (u) => /\/plants\/[a-z0-9-]+\/?$/.test(u) && !/\/plants\/(all|tags?|cultivars?|search)\/?$/.test(u), max: 2600,
    once: /\/plants\/(phalaenopsis|orchid|monstera|philodendron|epipremnum|sansevieria|dracaena|ficus|zamioculcas|spathiphyllum|anthurium|calathea|goeppertia|maranta|stromanthe|ctenanthe|aglaonema|dieffenbachia|schefflera|chlorophytum|pilea|peperomia|begonia|fuchsia|pelargonium|impatiens|petunia|tagetes|zinnia|cosmos|antirrhinum|viola|primula|cyclamen|hyacinthus|tulipa|narcissus|crocus|lilium|rosa|hydrangea|bougainvillea|nerium|jasminum|lavandula|rosmarinus|salvia|thymus|ocimum|mentha|petroselinum|origanum|solanum|capsicum|cucumis|cucurbita|citrullus|phaseolus|pisum|lactuca|spinacia|brassica|allium|daucus|beta-vulgaris|raphanus|fragaria|rubus|vaccinium|ribes|citrus|olea|punica|prunus|malus|pyrus|cydonia|diospyros|morus|vitis|juglans|corylus|castanea|actinidia|aloe|echeveria|crassula|sedum|kalanchoe|haworthia|gasteria|opuntia|schlumbergera|adenium|hoya|ceropegia|tradescantia|syngonium|alocasia|colocasia|strelitzia|chamaedorea|dypsis|howea|phoenix|cycas|yucca|cordyline|gerbera|chrysanthemum|dahlia|gladiolus|freesia|agapanthus|hibiscus|gardenia|camellia|rhododendron|buxus|cupressus|thuja|lantana|mandevilla|wisteria|clematis|hedera|lonicera|nigella|chenopodium|cymbopogon|rumex|eruca|tropaeolum|calendula|helianthus|echinacea|achillea|paeonia|iris|hosta|heuchera|nephrolepis|asparagus|zantedeschia|clivia|hippeastrum|saintpaulia|streptocarpus|euphorbia|codiaeum|aesculus|acacia|platanus|ginkgo|aronia|chaenomeles|eriobotrya|pistacia|coriandrum|anethum|foeniculum|abelmoschus|cynara|apium|zea-mays|ipomoea|portulaca|gazania|celosia|catharanthus|plumbago|salvia-rosmarinus)\b/ },
};
const site = process.argv[2], S = SITELER[site];
if (!S) { console.log('Bilinmeyen site: ' + site); process.exit(1); }
const UA = 'Mozilla/5.0 (compatible; HasTurkBilgeBey/1.0; +https://hasturkgubre.com.tr)';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u, ms = 25000) => {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: c.signal }); return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' }; }
  catch (e) { return { ok: false, status: String(e.name || e), text: '' }; } finally { clearTimeout(t); }
};
// robots.txt ("User-agent: *" kuralları ve Crawl-delay)
const kok = 'https://' + site, rb = await get(kok + '/robots.txt');
let bizim = false; const yasak = []; let gecikme = 1000;
for (const l of (rb.ok ? rb.text : '').split('\n')) {
  const m = l.replace(/#.*/, '').trim().match(/^(user-agent|disallow|crawl-delay)\s*:\s*(.*)$/i); if (!m) continue;
  const k = m[1].toLowerCase(), v = m[2].trim();
  if (k === 'user-agent') bizim = v === '*'; else if (bizim && k === 'disallow' && v) yasak.push(v.replace(/\*.*$/, '')); else if (bizim && k === 'crawl-delay') gecikme = Math.max(gecikme, (+v || 1) * 1000);
}
const izinli = (u) => { try { const p = new URL(u).pathname; return !yasak.some((d) => d && p.startsWith(d)); } catch { return false; } };
// Site haritası
const urls = new Set(), gez = async (u, d) => {
  if (d > 2) return; const r = await get(u); if (!r.ok) return;
  const L = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  if (/<sitemapindex/i.test(r.text)) { for (const s of L.slice(0, 80)) await gez(s, d + 1); } else L.forEach((x) => urls.add(x));
};
const hm = rb.ok ? [...rb.text.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]) : [];
for (const s of (hm.length ? hm : [kok + '/sitemap.xml']).slice(0, 5)) await gez(s, 0);
// Bakım / yetiştirme konulu sayfalar önce (süre yetmezse en faydalılar alınmış olur)
const ONCE = /bakim|yetistir|nasil|budama|budan|dikim|dikil|sulama|gubre|toprak|hastalik|sarar|cogalt|ekim|hasat|fidan/;
const sec = [...urls].filter((u) => S.url(decodeURIComponent(u)) && izinli(u))
  .sort((a, b) => (S.once || ONCE).test(decodeURIComponent(b).toLowerCase()) - (S.once || ONCE).test(decodeURIComponent(a).toLowerCase())).slice(0, S.max);
console.log(`${site}: site haritası ${urls.size}, seçilen ${sec.length}, robots yasak ${yasak.length}, gecikme ${gecikme} ms`);
// Sayfa → metin (başlık, ara başlıklar "## ", paragraflar, maddeler "• ")
const metin = (h) => {
  // (form atılmaz: bazı siteler sayfanın tamamını tek bir form içine koyuyor)
  let x = h.replace(/<(script|style|noscript|svg|iframe|header|footer|nav|aside|select|button)\b[\s\S]*?<\/\1>/gi, ' ');
  // İçerik kutusu: sayfadaki article / main / içerik bloklarından en uzunu (ilk article bazen küçük bir kart oluyor);
  // çok kısa kalırsa sayfanın tamamı
  const aday = [...x.matchAll(/<(article|main)\b[\s\S]*?<\/\1>/gi), ...x.matchAll(/<div[^>]+(?:class|id)="[^"]*(?:content|icerik|entry|post|blog|article|makale|detail|detay)[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi)].map((m) => m[0]);
  const duz = (y) => y.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').length;
  const en = aday.sort((a, b) => duz(b) - duz(a))[0];
  if (en && duz(en) > 600) x = en; else { const bd = x.match(/<body\b[\s\S]*<\/body>/i); if (bd) x = bd[0]; }
  x = x.replace(/<h[1-4][^>]*>/gi, '\n## ').replace(/<li[^>]*>/gi, '\n• ').replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  x = x.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
  return x.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1).join('\n').replace(/\n{3,}/g, '\n\n');
};
// İş 60 dakikada kesilir: 48 dakikada indirmeyi bırakıp elde olanı kaydet (yarıda kesilince hiçbir şey kaydedilmiyordu)
const BITIS = Date.now() + (+process.env.SURE_DK || 48) * 60000;
const kayit = []; let hata = 0, kesildi = 0;
for (const u of sec) {
  if (Date.now() > BITIS) { kesildi = sec.length - kayit.length - hata; break; }
  const r = await get(u);
  if (r.ok) {
    const baslik = ((r.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
    const t = metin(r.text);
    if (t.length > 300) kayit.push({ u, b: baslik, t: t.slice(0, 40000) });
    else if (kayit.length === 0 && hata < 3) { hata++; console.log(`  tanı: ${u} → ${r.status}, ${r.text.length} bayt, başlık "${baslik.slice(0, 80)}", metin ${t.length} karakter, başı: ${r.text.replace(/\s+/g, ' ').slice(0, 300)}`); }
  } else hata++;
  await bekle(gecikme);
}
console.log(`${site}: indirilen ${kayit.length}, hata ${hata}${kesildi ? `, süre doldu (${kesildi} sayfa kaldı)` : ''}`);
// Şifrele ve kaydet
const ham = gzipSync(Buffer.from(kayit.map((k) => JSON.stringify(k)).join('\n')), { level: Z.Z_BEST_COMPRESSION });
const key = crypto.randomBytes(32), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(ham), c.final()]), tag = c.getAuthTag();
const k = crypto.publicEncrypt({ key: readFileSync('scripts/veri-anahtar.pub', 'utf8'), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, key);
mkdirSync('veri/ham', { recursive: true });
writeFileSync(`veri/ham/${site}.enc`, JSON.stringify({ site, tarih: new Date().toISOString(), adet: kayit.length, k: k.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64'), ct: ct.toString('base64') }));
console.log(`${site}: veri/ham/${site}.enc ${(ct.length / 1024).toFixed(0)} KB (şifreli)`);
