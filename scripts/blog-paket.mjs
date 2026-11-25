// Blog yazı paketlerini üretir ve denetler: veri/blog-paket/pNN.txt → public/blog-statik/veri/pNN.<özet>.bin (gzip'li JSON)
// ve src/blog/icerik/paket.js (yükleme listesi). Kullanım: node scripts/blog-paket.mjs [--kontrol]
// Denetim (hata varsa dosya yazılmaz): panel SEO puanı 100, odak kelime tekrarı yok, ürünler mağazada ve stokta,
// iç bağlantılar var olan yazılara gidiyor, kapak görseli var ve başka yazıda kullanılmıyor, ürün fotoğrafı kapak değil,
// içerik kalite kapısı (src/blog/kalite.js: önce bilgi sonra ürün, satış dili yok, doğrudan cevap, kaynak, okunabilirlik) geçiliyor.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { seoKontrol, seoPuan } from '../src/blog/seo-puan.js';
import { kaliteKontrol } from '../src/blog/kalite.js';
import { TOHUM_YAZI, TOHUM_YAZI2, TOHUM_KATEGORI } from '../src/blog/tohum.js';
import { YENIDEN, YENI, HAFTA, KAPAK, KAPAK2, KAPAK3 } from '../src/blog/icerik/index.js';

const KAYNAK = 'veri/blog-paket', CIKTI = 'public/blog-statik/veri', FOTO = 'public/blog-statik/foto';
const YAZARLAR = ['Halil İbrahim Çelik', 'Mehmet Fatih Çelik', 'Mikdat Çelik', 'Rümeysa Altınova', 'Ahmet Sacit Çelik', 'Hatice Kübra Çelik', 'Muhammed Hamza Çelik'];
const KATEGORI = new Set(TOHUM_KATEGORI.map((k) => k.slug));
const tr = (x) => String(x || '').toLocaleLowerCase('tr-TR').trim();

// ---- Ayrıştırma ----
function ayristir(metin, dosya) {
  const yazilar = [], sorular = [];
  for (const blok of metin.split(/^### (?=(?:YAZI|SORU)\s*$)/m).slice(1)) {
    const [tur, ...satir] = blok.split('\n');
    const govdeBas = satir.findIndex((s) => s.startsWith('@'));
    const alan = {};
    for (const s of satir.slice(0, govdeBas < 0 ? satir.length : govdeBas)) { const m = /^([a-z_]+):\s?(.*)$/.exec(s); if (m) alan[m[1]] = m[2].trim(); }
    const bolum = []; let cur = null;
    for (const s of govdeBas < 0 ? [] : satir.slice(govdeBas)) {
      if (s.startsWith('@')) { cur = { ad: s.slice(1).trim(), satir: [] }; bolum.push(cur); } else cur.satir.push(s);
    }
    const metinOf = (b) => b.satir.join('\n').trim();
    if (tur.trim() === 'YAZI') {
      const y = { ...alan };
      for (const b of bolum) y[b.ad] = metinOf(b);
      y.urunler = y.urunler ? y.urunler.split(/\s*,\s*/).filter(Boolean) : [];
      // Elle seçilen ürünler yazı sonunda önce gelir; kalan yerleri sitede konuya göre öneri doldurur (urun.js > oneriler)
      y.urun_oto = alan.urun_oto === '1' ? 1 : 0;
      y.gorsel = '/blog-statik/foto/' + y.gorsel + '.webp';
      y._dosya = dosya;
      yazilar.push(y);
    } else if (tur.trim() === 'SORU') {
      sorular.push({ ...alan, _dosya: dosya, cevaplar: bolum.filter((b) => b.ad.startsWith('cevap')).map((b) => { const [yazar, sonra] = b.ad.replace(/^cevap\s+/, '').split('|').map((x) => x.trim()); return { yazar, sonra: Number(sonra), metin: metinOf(b) }; }) });
    } else throw new Error(dosya + ': bilinmeyen blok ' + tur);
  }
  return { yazilar, sorular };
}

// ---- Mevcut içerik ----
const yen = Object.fromEntries(YENIDEN.map((y) => [y.slug, y]));
const mevcut = [...TOHUM_YAZI, ...TOHUM_YAZI2].map((y) => ({ ...y, ...(yen[y.slug] || {}) })).concat(YENI, HAFTA);
const kapakSon = Object.fromEntries(mevcut.map((y) => [y.slug, y.gorsel]));
for (const M of [KAPAK, KAPAK2, KAPAK3]) for (const [slug, [g]] of Object.entries(M)) kapakSon[slug] = g;
const urunler = JSON.parse(fs.readFileSync('public/products.json', 'utf8')).items;
const stokta = new Set(urunler.filter((p) => p.st > 0).map((p) => p.s));
// Daha önce üretilmiş paketlerde sonradan stoktan düşen ürün yalnız uyarıdır: site yayında stokta olan en benzer ürünü
// gösterir (src/blog/urun.js urunBulYedekli), stok dönünce asıl ürün geri gelir. Yeni pakette stok şartı kesindir.
const uretilmis = new Set((fs.existsSync(CIKTI) ? fs.readdirSync(CIKTI) : []).map((f) => (/^(p\d+)\.[0-9a-f]+\.bin$/.exec(f) || [])[1]).filter(Boolean));
const uyarilar = [];
const kaynakFoto = fs.existsSync(FOTO + '/KAYNAK.json') ? JSON.parse(fs.readFileSync(FOTO + '/KAYNAK.json', 'utf8')) : {};

// Bir paket birden çok dosyaya bölünebilir: p01-1.txt, p01-2.txt … → p01
const dosyalar = fs.existsSync(KAYNAK) ? fs.readdirSync(KAYNAK).filter((f) => /^p\d+(-\d+)?\.txt$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : [];
const paketMap = {};
for (const f of dosyalar) {
  const ad = f.replace(/(-\d+)?\.txt$/, ''), r = ayristir(fs.readFileSync(KAYNAK + '/' + f, 'utf8'), f);
  const p = paketMap[ad] = paketMap[ad] || { ad, yazilar: [], sorular: [] };
  p.yazilar.push(...r.yazilar); p.sorular.push(...r.sorular);
}
const paketler = Object.values(paketMap);
const yeniler = paketler.flatMap((p) => p.yazilar);
const tumSlug = new Set([...mevcut.map((y) => y.slug), ...yeniler.map((y) => y.slug)]);
const yayinTs = Object.fromEntries(yeniler.map((y) => [y.slug, y.yayin]));

// ---- Denetim ----
const hatalar = [];
const hata = (y, m) => hatalar.push(`${y._dosya} ${y.slug || y.baslik}: ${m}`);
const odakSay = {};
for (const y of [...mevcut, ...yeniler]) { const k = tr(y.odak); if (k) odakSay[k] = (odakSay[k] || 0) + 1; }
const gorselKim = {};
const kapakBekleyen = [];
const SINIR_KAPAK = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10) + ' 23:59';
for (const [slug, g] of Object.entries(kapakSon)) gorselKim[g] = slug;
let toplamPuan = 0;
// Meta açıklaması ve SEO başlığı bütün yazılarda tekil olmalı
const aciklamaKim = {}, baslikKim = {};
for (const y of [...mevcut, ...yeniler]) {
  for (const [h, v] of [[aciklamaKim, tr(y.seo_aciklama || y.ozet)], [baslikKim, tr(y.seo_baslik || y.baslik)]]) if (v) h[v] = h[v] && h[v] !== y.slug ? '__cok' : y.slug;
}
for (const y of yeniler) {
  for (const k of ['slug', 'baslik', 'yayin', 'yazar', 'kategori', 'odak', 'seo_aciklama', 'ozet', 'kisaca', 'govde', 'sss', 'gorsel_alt']) if (!y[k]) hata(y, k + ' eksik');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(y.slug || '')) hata(y, 'slug biçimi');
  if (!/^20(26-1[0-2]|27-0[1-9]|27-1[0-2])-\d\d \d\d:\d\d$/.test(y.yayin || '')) hata(y, 'yayın tarihi biçimi');
  if (!YAZARLAR.includes(y.yazar)) hata(y, 'yazar listede yok: ' + y.yazar);
  if (!KATEGORI.has(y.kategori)) hata(y, 'kategori yok: ' + y.kategori);
  const diger = Object.entries(odakSay).filter(([k, n]) => k !== tr(y.odak) || n > 1).map(([k]) => k);
  const kon = seoKontrol({ ...y, urun_oto: 1 }, diger), p = seoPuan({ ...y, urun_oto: 1 }, diger);
  toplamPuan += p;
  if (p < 100) hata(y, `SEO ${p}: ` + kon.filter((k) => !k[0] && k[2]).map((k) => k[1]).join('; '));
  const tag = [...y.govde.matchAll(/\[ürün:([^\]]+)\]/g)].flatMap((m) => m[1].split(',').map((s) => s.trim()));
  for (const s of new Set([...tag, ...y.urunler])) if (!stokta.has(s)) {
    if (uretilmis.has(y._dosya.split(/[-.]/)[0])) uyarilar.push(`${y._dosya} ${y.slug}: stokta değil, sitede yerine benzeri gösterilir: ${s}`);
    else hata(y, 'ürün yok ya da stokta değil: ' + s);
  }
  if (!tag.length && !y.urunler.length) hata(y, 'ürün kartı yok');
  // İleri tarihli yazıya bağlantı serbesttir (o yazı yayınlanınca bağlantı açılır) ama en az 3 bağlantı şu an yayında olan yazılara gitmeli
  const hazir = new Set();
  for (const m of y.govde.matchAll(/\]\(\/([a-z0-9-]+)\)/g)) {
    if (!tumSlug.has(m[1])) hata(y, 'iç bağlantı hedefi yok: ' + m[1]);
    else if (!yayinTs[m[1]] || yayinTs[m[1]] <= y.yayin) hazir.add(m[1]);
    if (m[1] === y.slug) hata(y, 'kendine bağlantı');
  }
  if (hazir.size < 3) hata(y, 'yayın anında açık iç bağlantı ' + hazir.size + ' (en az 3)');
  const ad = (/\/foto\/([a-z0-9-]+)\.webp$/.exec(y.gorsel) || [])[1];
  if (ad === 'bekliyor') {
    // Kapak fotoğrafı henüz eklenmedi (gorsel: bekliyor). Yazı paketlenir ama yayın tarihine 14 gün kala kapak şarttır:
    // fotoğraflar foto-aday → foto-liste akışıyla eklenir ve "gorsel:" satırı gerçek dosya adıyla değiştirilir.
    kapakBekleyen.push(y);
    if (y.yayin <= SINIR_KAPAK) hata(y, 'kapak bekliyor ama yayın tarihi 14 günden yakın: ' + y.yayin);
  } else {
  if (!ad || !fs.existsSync(`${FOTO}/${ad}.webp`)) hata(y, 'kapak dosyası yok: ' + y.gorsel);
  else if (/hasturkgubre/.test((kaynakFoto[ad] || {}).kaynak || '')) hata(y, 'kapakta ürün fotoğrafı: ' + ad);
  if (gorselKim[y.gorsel] && gorselKim[y.gorsel] !== y.slug) hata(y, 'kapak başka yazıda: ' + gorselKim[y.gorsel]);
  gorselKim[y.gorsel] = y.slug;
  }
  // Kalite kapısı: 'yapi' (tablo/adım/bilgi görseli) kuralı yalnız yeni paketlerde kesin, eski paketlerde uyarı
  for (const k of kaliteKontrol(y, { aciklamaKim, baslikKim })) if (!k.ok) {
    if (k.seviye === 'hata' && !(k.kod === 'yapi' && uretilmis.has(y._dosya.split(/[-.]/)[0]))) hata(y, 'kalite: ' + k.mesaj);
  }
  if (/\b(usta|uzman)\b/i.test(y.govde.replace(/\[ürün:[^\]]*\]/g, ''))) hata(y, '"usta/uzman" ifadesi');
  if (/\d+\s*(ml|cc|gr|g)\s*\/\s*(100|1)\s*(l|lt|litre)\b.*(ilaç|fungisit|insektisit)|(ilaç|fungisit|insektisit).*\d+\s*(ml|cc)\s*\/\s*(100|1)\s*(l|lt)/i.test(y.govde)) hata(y, 'ilaç dozu yazılmış olabilir');
}
const baslikSay = {};
for (const y of [...mevcut, ...yeniler]) baslikSay[tr(y.baslik)] = (baslikSay[tr(y.baslik)] || 0) + 1;
for (const y of yeniler) if (baslikSay[tr(y.baslik)] > 1) hata(y, 'aynı başlık başka yazıda');
const slugSay = {};
for (const y of [...mevcut, ...yeniler]) slugSay[y.slug] = (slugSay[y.slug] || 0) + 1;
for (const y of yeniler) if (slugSay[y.slug] > 1) hata(y, 'slug tekrar');
for (const p of paketler) for (const s of p.sorular) {
  if (!s.baslik || !s.metin || !s.kategori || !/^202[67]-\d\d-\d\d \d\d:\d\d$/.test(s.yayin || '')) hatalar.push(`${s._dosya} soru "${s.baslik}": alan eksik`);
  if (!KATEGORI.has(s.kategori)) hatalar.push(`${s._dosya} soru "${s.baslik}": kategori yok`);
  if (!s.cevaplar.length) hatalar.push(`${s._dosya} soru "${s.baslik}": cevap yok`);
  for (const c of s.cevaplar) if (!YAZARLAR.includes(c.yazar) || !(c.sonra > 0) || !c.metin) hatalar.push(`${s._dosya} soru "${s.baslik}": cevap hatalı (${c.yazar})`);
}

if (kapakBekleyen.length) {
  const ay = {};
  for (const y of kapakBekleyen) ay[y.yayin.slice(0, 7)] = (ay[y.yayin.slice(0, 7)] || 0) + 1;
  console.log(`kapak bekleyen yazı: ${kapakBekleyen.length} (` + Object.entries(ay).map(([a, n]) => a + ': ' + n).join(', ') + ')');
}
console.log(`${paketler.length} paket, ${yeniler.length} yazı, ${paketler.reduce((a, p) => a + p.sorular.length, 0)} soru · ortalama SEO ${yeniler.length ? Math.round(toplamPuan / yeniler.length) : 0}`);
if (uyarilar.length) console.log(`uyarı (${uyarilar.length}):\n` + uyarilar.join('\n'));
if (hatalar.length) { console.log(hatalar.join('\n')); console.log(hatalar.length + ' hata'); process.exit(1); }
if (process.argv.includes('--kontrol')) process.exit(0);

// ---- Çıktı ----
fs.mkdirSync(CIKTI, { recursive: true });
const liste = [];
for (const p of paketler) {
  const json = JSON.stringify({ yazilar: p.yazilar.map(({ _dosya, ...y }) => y), sorular: p.sorular.map(({ _dosya, ...s }) => s) });
  const ozet = crypto.createHash('sha256').update(json).digest('hex').slice(0, 10);
  const dosya = `${p.ad}.${ozet}.bin`;
  for (const f of fs.readdirSync(CIKTI)) if (f.startsWith(p.ad + '.') && f !== dosya) fs.unlinkSync(`${CIKTI}/${f}`);
  if (!fs.existsSync(`${CIKTI}/${dosya}`)) fs.writeFileSync(`${CIKTI}/${dosya}`, zlib.gzipSync(json, { level: 9 }));
  liste.push([p.ad, dosya, ozet]);
}
fs.writeFileSync('src/blog/icerik/paket.js', `// Yazı paketleri: [ad, dosya, özet]. Dosyalar scripts/blog-paket.mjs ile veri/blog-paket/*.txt kaynaklarından üretilir
// (public/blog-statik/veri/<ad>.<özet>.bin, gzip'li JSON). Elle düzenlemeyin.
export const PAKETLER = ${JSON.stringify(liste, null, 0).replace(/\],\[/g, '],\n  [').replace(/^\[\[/, '[\n  [').replace(/\]\]$/, '],\n]')};
`);
console.log('yazıldı:', liste.map((l) => l[1]).join(', '));
