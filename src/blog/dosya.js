// Ziyaretçi fotoğrafları: soruya en fazla 3 fotoğraf ve profil fotoğrafı.
// Fotoğraflar D1'de (b_dosya) saklanır; tarayıcı yüklemeden önce küçültür ve WebP'ye çevirir (public/blog-statik/site.js).
// Sunucu yalnız JPEG/PNG/WebP kabul eder, dosya türünü baytlardan anlar ve EXIF/konum bilgisini siler.

export const SORU_FOTO_MAX = 3;
const SINIR = { soru: 1500 * 1024, profil: 300 * 1024 };

function tur(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null;
}
const u16 = (b, i) => (b[i] << 8) | b[i + 1];
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const l32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

// JPEG: APP1 (EXIF/XMP), APP13 (IPTC) ve yorum bölümleri atılır
function jpegTemizle(b) {
  const out = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1];
    if (m === 0xda) { out.push(b.subarray(i)); break; }
    const n = u16(b, i + 2);
    if (m !== 0xe1 && m !== 0xed && m !== 0xfe) out.push(b.subarray(i, i + 2 + n));
    i += 2 + n;
  }
  return birlestir(out);
}
// PNG: eXIf, tEXt, iTXt, zTXt parçaları atılır
function pngTemizle(b) {
  const out = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const n = u32(b, i), t = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    if (!['eXIf', 'tEXt', 'iTXt', 'zTXt'].includes(t)) out.push(b.subarray(i, i + 12 + n));
    i += 12 + n;
    if (t === 'IEND') break;
  }
  return birlestir(out);
}
// WebP: EXIF ve XMP parçaları atılır, VP8X bayrakları ve RIFF boyu güncellenir
function webpTemizle(b) {
  const out = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const t = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]), n = l32(b, i + 4), son = i + 8 + n + (n & 1);
    if (t !== 'EXIF' && t !== 'XMP ') {
      const p = b.slice(i, Math.min(son, b.length));
      if (t === 'VP8X') p[8] &= ~0x0c;
      out.push(p);
    }
    i = son;
  }
  const govde = birlestir(out), bas = new Uint8Array(12);
  bas.set(b.subarray(0, 12));
  const boy = govde.length + 4;
  bas[4] = boy & 255; bas[5] = (boy >> 8) & 255; bas[6] = (boy >> 16) & 255; bas[7] = (boy >> 24) & 255;
  return birlestir([bas, govde]);
}
function birlestir(parcalar) {
  const t = parcalar.reduce((a, p) => a + p.length, 0), o = new Uint8Array(t);
  let i = 0;
  for (const p of parcalar) { o.set(p, i); i += p.length; }
  return o;
}

// Yüklenen dosyayı doğrular, temizler ve kaydeder. { id } ya da { hata } döner.
export async function fotoKaydet(db, { dosya, uye_id, tur: amac, hedef = null }) {
  if (!dosya || typeof dosya === 'string' || !dosya.size) return { hata: 'Fotoğraf seçilmedi.' };
  if (dosya.size > SINIR[amac] * 3) return { hata: 'Fotoğraf çok büyük.' };
  let b = new Uint8Array(await dosya.arrayBuffer());
  const mime = tur(b);
  if (!mime) return { hata: 'Yalnızca JPEG, PNG ya da WebP fotoğraf yükleyebilirsiniz.' };
  try { b = mime === 'image/jpeg' ? jpegTemizle(b) : mime === 'image/png' ? pngTemizle(b) : webpTemizle(b); } catch { return { hata: 'Fotoğraf okunamadı.' }; }
  if (b.length > SINIR[amac]) return { hata: amac === 'profil' ? 'Profil fotoğrafı en fazla 300 KB olabilir.' : 'Fotoğraf en fazla 1,5 MB olabilir.' };
  const id = [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, '0')).join('');
  await db.prepare("INSERT INTO b_dosya (id, uye_id, tur, hedef, mime, veri, boyut, durum, ts) VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif', ?)").bind(id, uye_id, amac, hedef, mime, b, b.length, Date.now()).run();
  return { id };
}

export async function fotoSun(db, id) {
  if (!/^[a-z0-9]{8,24}$/.test(id)) return new Response('Bulunamadı', { status: 404 });
  const r = await db.prepare("SELECT mime, veri FROM b_dosya WHERE id = ? AND durum = 'aktif'").bind(id).first();
  if (!r) return new Response('Bulunamadı', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(new Uint8Array(r.veri), { headers: { 'Content-Type': r.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Content-Security-Policy': "default-src 'none'" } });
}

export const fotoUrl = (base, id) => `${base}/dosya/${id}`;
