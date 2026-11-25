// Blog için açık lisanslı fotoğraf indirir: scripts/foto-liste.json → public/blog-statik/foto/<ad>.webp (960x640)
// Kaynak bilgileri public/blog-statik/foto/KAYNAK.json'a yazılır. Var olan dosya atlanır; değiştirmek için dosyayı silip yeniden çalıştırın.
// Önce Wikimedia Commons, olmazsa Openverse. Öncelik CC0 / kamu malı; bulunamazsa CC BY / CC BY-SA (yazar ve lisans yazının altında gösterilir).
// Aynı kaynak fotoğraf iki kez kullanılmaz. Sonunda src/blog/fotolar.js (panel listesi + atıf bilgileri) yeniden yazılır.
import fs from 'node:fs';
import sharp from 'sharp';

const DIZIN = 'public/blog-statik/foto';
const KAYNAK = DIZIN + '/KAYNAK.json';
const liste = JSON.parse(fs.readFileSync('scripts/foto-liste.json', 'utf8'));
const red = new Set(fs.existsSync('scripts/foto-red.json') ? JSON.parse(fs.readFileSync('scripts/foto-red.json', 'utf8')) : []);
const kayit = fs.existsSync(KAYNAK) ? JSON.parse(fs.readFileSync(KAYNAK, 'utf8')) : {};
const kullanilan = new Set(Object.values(kayit).map((k) => k.id));
const UA = { 'User-Agent': 'HasTurkBlog/1.0 (https://blog.hasturkgubre.com.tr; info@hasturkgubre.com.tr)' };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function al(url, ms = 25000) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r;
}

async function openverse(q, sart) {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&category=photograph&page_size=30`;
  const j = await (await al(u)).json();
  return (j.results || []).filter((x) => (x.width || 0) >= 800 && (!x.height || x.width >= x.height * 1.1))
    .filter((x) => !sart || sart.some((k) => (x.title || '').toLowerCase().includes(k.toLowerCase())))
    .map((x) => ({ id: 'ov:' + x.id, url: x.url, kaynak: x.foreign_landing_url, yazar: x.creator || '', lisans: (x.license || '').toUpperCase(), baslik: x.title || '' }));
}

// Tablo, çizim, arşiv belgesi gibi fotoğraf olmayan ya da konu dışı görseller elenir
const DISI = /painting|drawing|illustration|herbarium|specimen|nara|map|logo|diagram|stamp|poster|engraving|lithograph|plate|scan|book|postcard|machine|chipper|truck|tractor|minister|candied|dried|\.svg|\.tif/i;
const LISANS = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0)/i;
const serbest = (l) => (/^(cc0|public domain|pd|özgün çizim)/i.test(l) ? 1 : 0);
async function commons(q, sart) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=50&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap -painting -drawing -illustration')}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280`;
  const j = await (await al(u)).json();
  return Object.values(j.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).map((p) => ({ p, ii: (p.imageinfo || [])[0] || {} }))
    .filter(({ p, ii }) => ii.width >= 700 && ii.height >= 460 && ii.mime === 'image/jpeg' && !DISI.test(p.title) && LISANS.test(ii.extmetadata?.LicenseShortName?.value || ''))
    .filter(({ p }) => !sart || sart.some((k) => p.title.toLocaleLowerCase('en').includes(k.toLowerCase())))
    .sort((a, b) => serbest(b.ii.extmetadata.LicenseShortName.value) - serbest(a.ii.extmetadata.LicenseShortName.value))
    .map(({ p, ii }) => ({ id: 'wc:' + p.pageid, url: ii.thumburl || ii.url, kaynak: ii.descriptionurl, yazar: String(ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), lisans: ii.extmetadata.LicenseShortName.value, baslik: p.title }));
}

// Gözle seçilmiş aday: [ad, 'wc:<sayfa no>'] (scripts/foto-aday.mjs ile bulunur)
async function commonsId(id) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&pageids=${id.slice(3)}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280`;
  const j = await (await al(u)).json();
  return Object.values(j.query?.pages || {}).map((p) => ({ p, ii: (p.imageinfo || [])[0] || {} })).filter(({ ii }) => LISANS.test(ii.extmetadata?.LicenseShortName?.value || ''))
    .map(({ p, ii }) => ({ id: 'wc:' + p.pageid, url: ii.thumburl || ii.url, kaynak: ii.descriptionurl, yazar: String(ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), lisans: ii.extmetadata.LicenseShortName.value, baslik: p.title }));
}

let yeni = 0, hata = 0;
for (const [ad, q, sart] of liste) {
  const hedef = `${DIZIN}/${ad}.webp`;
  if (fs.existsSync(hedef)) continue;
  let tamam = false;
  const secili = /^wc:\d+$/.test(q);
  for (const kaynak of secili ? [commonsId] : [commons, openverse]) {
    let aday = [];
    try { aday = await kaynak(q, sart); } catch (e) { console.log(`! ${ad} ${kaynak.name}: ${e.message}`); }
    for (const a of aday) {
      if (kullanilan.has(a.id) || (!secili && red.has(a.id))) continue;
      try {
        const buf = Buffer.from(await (await al(a.url)).arrayBuffer());
        // Siyah-beyaz ve solgun (renksiz) fotoğraflar elenir
        const { data } = await sharp(buf).resize(32, 32, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        let doy = 0; for (let i = 0; i < data.length; i += 3) doy += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
        if (!secili && doy / (data.length / 3) < 18) throw new Error('renksiz'); // gözle seçilenlerde (toprak, gübre gibi doğal soluk konular) uygulanmaz
        await sharp(buf).rotate().resize(960, 640, { fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toFile(hedef);
        kayit[ad] = { ...a, sorgu: q };
        kullanilan.add(a.id);
        console.log(`✓ ${ad} ← ${a.id} ${a.lisans} ${a.kaynak}`);
        tamam = true; yeni++;
        break;
      } catch (e) { console.log(`  ${ad} atlandı ${a.id}: ${e.message}`); }
    }
    if (tamam) break;
    await bekle(1500);
  }
  if (!tamam) { console.log(`✗ ${ad} bulunamadı (${q})`); hata++; }
  fs.writeFileSync(KAYNAK, JSON.stringify(kayit, null, 1));
  await bekle(3500);
}
// Panel listesi ve atıf gerektiren fotoğrafların bilgisi (CC0 / kamu malı olanlar için atıf gerekmez)
const adlar = fs.readdirSync(DIZIN).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
const kredi = Object.fromEntries(adlar.filter((a) => kayit[a] && !serbest(kayit[a].lisans || '') && !/hasturkgubre/.test(kayit[a].kaynak || ''))
  .map((a) => [a, [kayit[a].yazar.replace(/\s+/g, ' ').slice(0, 80) || 'Wikimedia Commons', kayit[a].lisans, kayit[a].kaynak]]));
fs.writeFileSync('src/blog/fotolar.js', `// Panelde seçilebilen kapak görselleri (public/blog-statik/foto). scripts/foto-indir.mjs tarafından üretilir, elle düzenlemeyin.
export const FOTO_ADLARI = ${JSON.stringify(adlar)};
// Atıf gerektiren fotoğraflar: ad → [yazar, lisans, kaynak sayfası]
export const FOTO_KREDI = ${JSON.stringify(kredi, null, 0)};
`);
console.log(`bitti: ${yeni} yeni, ${hata} bulunamadı`);
