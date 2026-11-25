// Blog yazı planını denetler: konu sayısı, plan içi ve mevcut içerikle odak çakışması, anlamca yakın başlıklar,
// kategori dağılımı ve gün aralıklarının günlük yazı sınırına (plandaki "# Günlük:" satırı, yoksa 10) sığması.
// Plan satırı: "aile|kat|odak|başlık|gün" ya da takvim biçimi "2027-05-01 09:10 | kat | odak | başlık | plan | yazar |".
// Kullanım: node scripts/blog-plan-kontrol.mjs docs/blog-30gun-plani.txt [--hedef 300] [--gun 61-90] [--onceki docs/a.txt,docs/b.txt]
import fs from 'node:fs';
import { TOHUM_YAZI, TOHUM_YAZI2 } from '../src/blog/tohum.js';
import { YENI, HAFTA } from '../src/blog/icerik/index.js';

const arg = process.argv.slice(2);
const dosya = arg[0] || 'docs/blog-30gun-plani.txt';
const hedef = Number(arg[arg.indexOf('--hedef') + 1]) || 300;
const [gunBas, gunSon] = (arg.includes('--gun') ? arg[arg.indexOf('--gun') + 1] : '61-90').split('-').map(Number);
const tr = (x) => String(x || '').toLocaleLowerCase('tr-TR').trim();

// Plan dosyası iki biçimde olabilir: "aile|kat|odak|başlık|gün" ya da takvim satırı "YYYY-AA-GG SS:DD | kat | odak | başlık | plan | yazar |" (gün sütunu yok)
const TAKVIM_SATIR = /^\d{4}-\d\d-\d\d \d\d:\d\d \|/;
const satirOku = (yol) => fs.readFileSync(yol, 'utf8').split('\n').filter((s) => /^[A-Z0-9]\|/.test(s) || TAKVIM_SATIR.test(s)).map((s) => {
  const [aile, kat, odak, baslik, gun = ''] = TAKVIM_SATIR.test(s) ? ['T', ...s.split('|').slice(1, 4).map((x) => x.trim())] : s.split('|');
  return { aile, kat: kat.trim(), odak: tr(odak), baslik: baslik.trim(), gun: gun.trim() };
});

// ---- Mevcut içerik: sitedeki yazılar, paketler, mağaza blogu, 60 günlük plan ----
const mevcut = [];
for (const y of [...TOHUM_YAZI, ...TOHUM_YAZI2, ...YENI, ...HAFTA]) mevcut.push({ kaynak: 'site', odak: tr(y.odak), baslik: y.baslik });
for (const f of fs.readdirSync('veri/blog-paket').filter((f) => f.endsWith('.txt'))) {
  for (const b of fs.readFileSync('veri/blog-paket/' + f, 'utf8').split(/^### YAZI\s*$/m).slice(1)) {
    const g = (k) => (new RegExp('^' + k + ':\\s?(.*)$', 'm').exec(b) || [])[1] || '';
    mevcut.push({ kaynak: f, odak: tr(g('odak')), baslik: g('baslik') });
  }
}
const liste = JSON.parse(fs.readFileSync('docs/blog/_liste.json', 'utf8'));
for (const y of Array.isArray(liste) ? liste : Object.values(liste)) mevcut.push({ kaynak: 'mağaza', odak: '', baslik: y.baslik || y.title || '' });
const plan = satirOku(dosya);
// --onceki a.txt,b.txt: önceki planlar da mevcut sayılır (henüz yazılmamış konularıyla birlikte); yeni plan onlarla çakışmamalı
const onceki = arg.includes('--onceki') ? arg[arg.indexOf('--onceki') + 1].split(',').filter(Boolean) : [];
for (const f of onceki) for (const p of satirOku(f)) mevcut.push({ kaynak: f.replace(/^.*\//, ''), odak: p.odak, baslik: p.baslik });
// Günlük yazı sınırı: plandaki "# Günlük: 91=5 92=7 ..." satırı; yoksa günde 10
const gunlukSatir = (fs.readFileSync(dosya, 'utf8').match(/^# Günlük:(.*)$/m) || [])[1] || '';
const gunluk = Object.fromEntries([...gunlukSatir.matchAll(/(\d+)=(\d+)/g)].map((m) => [+m[1], +m[2]]));
const yeni = plan.filter((p) => p.aile !== '0');
const p12 = plan.filter((p) => p.aile === '0');
// 12. paket konuları da "mevcut" sayılır (30 günlük plan onlarla çakışmamalı)
const karsi = [...mevcut, ...p12.map((p) => ({ kaynak: '12. paket', odak: p.odak, baslik: p.baslik }))];

// ---- Benzerlik: kalıp kelimeler atılır, kalan kökler karşılaştırılır ----
const KALIP = new Set(('nedir nasıl ne neden mi mı mu mü ve ile için yetiştirme yetiştiriciliği bakımı bakım yapılır kullanımı kullanılır '
  + 'zamanı ağacı ağaçları bitki bitkiler bitkileri bitkilerde bitkisi saksıda saksı bahçede bahçe evde kışın kış dikkat edilecekler '
  + 'çeşitleri gerçekten işe yarar doğru olur olmalı gerekir gerekli hangi en ilk yeni başlayanlar adım '
  + 'ne zaman kadar nelere edilir dikkat yöntemi rehberi gübre gübresi gübreleme toprak toprağı toprakta seçimi bahçesi koruma').split(' '));
const kok = (k) => k.replace(/[^a-zçğıöşü0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !KALIP.has(w)).map((w) => w.slice(0, 5));
const benzer = (a, b) => {
  const A = new Set(kok(a)), B = new Set(kok(b));
  if (!A.size || !B.size) return 0;
  let k = 0; for (const x of A) if (B.has(x)) k++;
  // tek ortak kelime yalnız iki taraf da tek kelimeyse sayılır; aksi halde en az iki ortak kök ya da yüksek Jaccard
  const jac = k / (A.size + B.size - k);
  return (k >= 2 && k / Math.min(A.size, B.size) >= 0.66) || jac >= 0.5 ? 1 : 0;
};

const sorun = [], uyari = [];
if (yeni.length !== hedef) sorun.push(`konu sayısı ${yeni.length}, hedef ${hedef}`);
const odakSay = {};
for (const p of plan) odakSay[p.odak] = (odakSay[p.odak] || 0) + 1;
for (const [o, n] of Object.entries(odakSay)) if (n > 1) sorun.push(`planda aynı odak ${n} kez: ${o}`);
const mevcutOdak = new Map(mevcut.filter((m) => m.odak).map((m) => [m.odak, m]));
// 12. paket bölümü yazıldıkça paketlerde görünür; o satırlar bu denetimin dışındadır
for (const p of yeni) if (mevcutOdak.has(p.odak)) sorun.push(`odak zaten yazılmış (${mevcutOdak.get(p.odak).kaynak}): ${p.odak}`);
// Yazımı farklı aynı konu (akvaponik / akuaponik, gübresi / gubresi): harf katlanmış odak, mevcut odakla ya da yazı adresiyle aynıysa hata
const GENEL_EK = /\b(nedir|nasil|nasıl|sistemi?|yetiştirme|yetiştiriciliği|bakımı|rehberi|yapımı|kullanımı)\b/g;
const katla = (x) => tr(x).replace(/-/g, ' ').replace(GENEL_EK, '').replace(/yetistirme|yetistiriciligi|bakimi|nedir|nasil|sistemi?/g, '').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/v/g, 'u').replace(/[^a-z0-9]/g, '');
const katliMevcut = new Map(mevcut.filter((m) => m.odak).map((m) => [katla(m.odak), m]));
for (const y of [...TOHUM_YAZI, ...TOHUM_YAZI2, ...YENI, ...HAFTA]) if (y.slug) katliMevcut.set(katla(y.slug), { kaynak: 'site', odak: y.slug });
for (const f of fs.readdirSync('veri/blog-paket').filter((f) => f.endsWith('.txt'))) for (const m of fs.readFileSync('veri/blog-paket/' + f, 'utf8').matchAll(/^slug:\s?(.*)$/gm)) katliMevcut.set(katla(m[1]), { kaynak: f, odak: m[1].trim() });
for (const p of yeni) {
  const k = katla(p.odak), m = katliMevcut.get(k) || [...katliMevcut.entries()].find(([x]) => x.startsWith(k) && x.length - k.length <= 6)?.[1];
  if (m && !mevcutOdak.has(p.odak)) sorun.push(`yazımı farklı ama aynı konu olabilir (${m.kaynak}): ${p.odak} ~ ${m.odak}`);
}
for (const p of yeni) {
  for (const m of karsi) {
    const s = Math.max(benzer(p.odak, m.odak || m.baslik), benzer(p.odak, m.baslik));
    if (s >= 1) uyari.push(`${p.odak}  ~  ${m.odak || m.baslik}  [${m.kaynak}]`);
  }
}

// ---- Kategori dağılımı ve gün aralıkları ----
const kat = {}; for (const p of yeni) kat[p.kat] = (kat[p.kat] || 0) + 1;
const gunlu = yeni.filter((p) => p.gun).map((p) => { const [a, b] = p.gun.split('-').map(Number); return { ...p, a, b: b || a }; });
for (const p of gunlu) if (p.a < gunBas || p.b > gunSon || p.a > p.b) sorun.push(`gün aralığı plan dışında: ${p.odak} ${p.gun}`);
// Her gün için o günde zorunlu yazı sayısı günlük sınırı (varsayılan 10) geçmemeli (en dar aralıklar önce yerleşir)
const kap = {}; for (let g = gunBas; g <= gunSon; g++) kap[g] = gunluk[g] ?? 10;
if (Object.keys(gunluk).length) { const top = Object.values(gunluk).reduce((a, b) => a + b, 0); if (top !== hedef) sorun.push(`günlük sayıların toplamı ${top}, hedef ${hedef}`); }
for (const p of [...gunlu].sort((x, y) => (x.b - x.a) - (y.b - y.a) || x.a - y.a)) {
  let yer = null; for (let g = p.a; g <= p.b; g++) if (kap[g] > 0 && (yer === null || kap[g] > kap[yer])) yer = g;
  if (yer === null) sorun.push(`gün aralığına sığmıyor: ${p.odak} ${p.gun}`); else kap[yer]--;
}

console.log(`Plan: ${yeni.length} konu (12. paket bölümü: ${p12.length}), tarihli ${gunlu.length}, serbest ${yeni.length - gunlu.length}`);
console.log('Kategori:', Object.entries(kat).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
console.log(`\nAnlamca yakın görünen eşleşmeler (${uyari.length}) — elle bakılmalı:`);
for (const u of uyari) console.log('  ' + u);
if (sorun.length) { console.log(`\nHATA (${sorun.length}):`); for (const s of sorun) console.log('  ' + s); process.exit(1); }
console.log('\nHata yok.');
