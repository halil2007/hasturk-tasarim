// Kapak fotoğrafı adayları: scripts/foto-aday.json → veri/foto-aday/ (aday listesi + gözle seçim için temas sayfaları)
// Her ad için birkaç sorgudan Wikimedia Commons'ta en fazla 8 aday toplanır (CC0, kamu malı, CC BY, CC BY-SA; fotoğraf olmayanlar elenir).
// Seçim scripts/foto-liste.json'a [ad, 'wc:<sayfa no>'] olarak yazılır, foto-indir.mjs o dosyayı indirir. Bu klasör birleştirmeden önce silinir.
import fs from 'node:fs';
import sharp from 'sharp';

const liste = JSON.parse(fs.readFileSync('scripts/foto-aday.json', 'utf8'));
const DIZIN = 'veri/foto-aday';
const UA = { 'User-Agent': 'HasTurkBlog/1.0 (https://blog.hasturkgubre.com.tr; info@hasturkgubre.com.tr)' };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const LISANS = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0)/i;
const DISI = /painting|drawing|illustration|herbarium|specimen|map|logo|diagram|stamp|poster|engraving|lithograph|plate|scan|book|postcard|catalog|catalogue|page|seed packet|label|sign|protest|demonstration|advert|cover|text|chart|graph|museum|statue|sculpture|coin|banknote|\.svg|\.tif|\.gif|usda|nasa|festival|event|conference|careers/i;
const kullanilan = new Set(Object.values(JSON.parse(fs.readFileSync('public/blog-statik/foto/KAYNAK.json', 'utf8'))).map((k) => k.id));
const red = new Set(fs.existsSync('scripts/foto-red.json') ? JSON.parse(fs.readFileSync('scripts/foto-red.json', 'utf8')) : []);

async function ara(q) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=480`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(r.status);
  const j = await r.json();
  return Object.values(j.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).map((p) => ({ p, ii: (p.imageinfo || [])[0] || {} }))
    .filter(({ p, ii }) => ii.width >= 900 && ii.height >= 560 && ii.width >= ii.height * 1.05 && ii.mime === 'image/jpeg' && !DISI.test(p.title) && LISANS.test(ii.extmetadata?.LicenseShortName?.value || ''))
    .map(({ p, ii }) => ({ id: 'wc:' + p.pageid, baslik: p.title.replace(/^File:/, ''), kucuk: ii.thumburl, lisans: ii.extmetadata.LicenseShortName.value, en: ii.width }));
}

fs.mkdirSync(DIZIN, { recursive: true });
const sonuc = {};
for (const [ad, sorgular, sart] of liste) {
  const aday = [], gorulen = new Set();
  for (const q of [].concat(sorgular)) {
    try {
      for (const a of await ara(q)) {
        if (aday.length >= 8) break;
        if (gorulen.has(a.id) || kullanilan.has(a.id) || red.has(a.id)) continue;
        if (sart && !sart.some((k) => a.baslik.toLocaleLowerCase('en').includes(k.toLowerCase()))) continue;
        gorulen.add(a.id); aday.push(a);
      }
    } catch (e) { console.log(`! ${ad} "${q}": ${e.message}`); }
    if (aday.length >= 8) break;
    await bekle(1200);
  }
  sonuc[ad] = aday;
  console.log(`${ad}: ${aday.length} aday`);
  await bekle(1500);
}
fs.writeFileSync(`${DIZIN}/adaylar.json`, JSON.stringify(sonuc, null, 1));

// Temas sayfaları: her satır bir ad, 8 küçük görsel (numaralı)
const W = 240, H = 160, SATIR = 6, ETIKET = 22;
const adlar = Object.keys(sonuc);
for (let s = 0; s * SATIR < adlar.length; s++) {
  const grup = adlar.slice(s * SATIR, (s + 1) * SATIR), parca = [];
  for (const [r, ad] of grup.entries()) {
    const y0 = r * (H + ETIKET);
    parca.push({ input: Buffer.from(`<svg width="${W * 8}" height="${ETIKET}"><rect width="100%" height="100%" fill="#1d3b22"/><text x="6" y="16" font-size="15" font-family="DejaVu Sans, sans-serif" fill="#fff">${ad}</text></svg>`), left: 0, top: y0 });
    for (const [i, a] of sonuc[ad].entries()) {
      try {
        const buf = Buffer.from(await (await fetch(a.kucuk, { headers: UA, signal: AbortSignal.timeout(30000) })).arrayBuffer());
        const img = await sharp(buf).resize(W, H, { fit: 'cover' }).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}"><rect x="0" y="0" width="26" height="22" fill="rgba(0,0,0,.75)"/><text x="7" y="16" font-size="15" font-family="DejaVu Sans, sans-serif" fill="#fff">${i + 1}</text></svg>`) }]).jpeg({ quality: 70 }).toBuffer();
        parca.push({ input: img, left: i * W, top: y0 + ETIKET });
      } catch (e) { console.log(`  ${ad} #${i + 1} küçük görsel alınamadı`); }
      await bekle(300);
    }
  }
  await sharp({ create: { width: W * 8, height: grup.length * (H + ETIKET), channels: 3, background: '#ffffff' } }).composite(parca).jpeg({ quality: 72 }).toFile(`${DIZIN}/sayfa-${String(s + 1).padStart(2, '0')}.jpg`);
}
console.log('bitti');
