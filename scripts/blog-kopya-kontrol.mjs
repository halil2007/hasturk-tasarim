// Yamyamlık (aynı arama niyetine iki yazı) denetimi: depodaki bütün yazılar (tohum, icerik, paketler) ve isteğe bağlı plan.
// Başlık, odak, etiket ve ara başlıklardan TF-IDF benzerliği hesaplanır; benzerliği yüksek VE niyeti aynı
// (genel / toprak / gübre / budama / hastalık / çoğaltma / fide / tohum / hasat / çeşit / kış) iki yazı "kopya şüphesi" sayılır.
// İncelenip ayrı niyette olduğuna karar verilen çiftler docs/blog-kopya-izin.txt dosyasına "slug1 slug2" olarak yazılır.
// Kullanım: node scripts/blog-kopya-kontrol.mjs [--esik 0.72] [--plan docs/a.txt,docs/b.txt]   · Çıkış kodu 1: izinsiz şüpheli çift var
// --plan: plandaki henüz yazılmamış konular (aile|kat|odak|başlık|gün ya da takvim satırı: tarih saat | kat | odak | başlık | ...) da "plan:odak" adıyla denetime girer.
import fs from 'node:fs'; import zlib from 'node:zlib';
import { TOHUM_YAZI, TOHUM_YAZI2 } from '../src/blog/tohum.js';
import { YENIDEN, YENI, HAFTA } from '../src/blog/icerik/index.js';
const arg = process.argv.slice(2);
const esik = Number(arg[arg.indexOf('--esik') + 1]) || 0.72;
const tr = (s) => String(s || '').toLocaleLowerCase('tr-TR');
const harita = new Map();
const yen = Object.fromEntries(YENIDEN.map((y) => [y.slug, y]));
for (const y of [...TOHUM_YAZI, ...TOHUM_YAZI2].map((y) => ({ ...y, ...(yen[y.slug] || {}) })).concat(YENI, HAFTA)) harita.set(y.slug, y);
for (const f of fs.readdirSync('veri/blog-paket').filter((f) => f.endsWith('.txt')).sort()) {
  for (const b of fs.readFileSync('veri/blog-paket/' + f, 'utf8').split(/^### YAZI\s*$/m).slice(1)) {
    const g = (k) => (new RegExp('^' + k + ':\\s?(.*)$', 'm').exec(b) || [])[1] || '';
    const govde = (b.split(/^@govde\s*$/m)[1] || '').split(/^@sss\s*$/m)[0];
    if (g('slug')) harita.set(g('slug'), { slug: g('slug'), baslik: g('baslik'), odak: g('odak'), etiketler: g('etiketler'), govde });
  }
}
const odaklar = new Set([...harita.values()].map((y) => tr(y.odak).trim()));
const planlar = arg.includes('--plan') ? arg[arg.indexOf('--plan') + 1].split(',').filter(Boolean) : [];
for (const f of planlar) for (const s of fs.readFileSync(f, 'utf8').split('\n').filter((s) => /^[A-Z0-9]\|/.test(s) || /^\d{4}-\d\d-\d\d \d\d:\d\d \|/.test(s))) {
  const [, , odak, baslik] = s.split('|');
  if (odaklar.has(tr(odak).trim())) continue;
  odaklar.add(tr(odak).trim());
  harita.set('plan:' + tr(odak).trim(), { slug: 'plan:' + tr(odak).trim().replace(/\s+/g, '-'), baslik: baslik.trim(), odak, etiketler: '', govde: '' });
}
const Y = [...harita.values()];
const DUR = new Set('ve ile için nasıl nedir ne neden mi mı mu mü bir en iyi doğru rehber rehberi yöntem püf adım zaman zamanı yapılır edilir kadar hangi olur yol yolları ipuçları tüm kolay bu da de çok daha gibi olan olarak veya ya her sonra önce göre ama yani ise'.split(' '));
const kok = (w) => (w.length > 6 ? w.slice(0, 6) : w);
const kel = (s) => tr(s).replace(/[^a-zçğıöşü\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !DUR.has(w)).map(kok);
const NIYET = [['toprak', /toprağ|toprak|karışım/], ['gubre', /gübre/], ['budama', /budam/], ['hastalik', /hastalı|zararlı|sarar|kurur|çürü|neden/], ['cogaltma', /çoğalt|çelik/],
  ['fide', /fide/], ['tohum', /tohum/], ['hasat', /hasat|olgun|saklama|depola/], ['cesit', /çeşit|türleri/], ['kis', /kış|don /], ['set', /set/]];
const niyet = (y) => { const o = tr(y.odak || y.baslik); return (NIYET.find(([, re]) => re.test(o)) || ['genel'])[0]; };
const vek = Y.map((y) => {
  const h2 = [...String(y.govde || '').matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]).join(' ');
  const m = new Map(); const ekle = (s, w) => { for (const k of kel(s)) m.set(k, (m.get(k) || 0) + w); };
  ekle(y.baslik, 3); ekle(y.odak, 4); ekle(y.etiketler, 1.5); ekle(h2, 1); ekle(String(y.govde || '').slice(0, 2500), 0.15);
  return m;
});
const df = new Map(); for (const m of vek) for (const k of m.keys()) df.set(k, (df.get(k) || 0) + 1);
const N = vek.length;
const nv = vek.map((m) => { const v = new Map(); let n = 0; for (const [k, x] of m) { const w = x * Math.log(N / df.get(k)); v.set(k, w); n += w * w; } n = Math.sqrt(n) || 1; for (const [k, w] of v) v.set(k, w / n); return v; });
const izin = new Set(fs.existsSync('docs/blog-kopya-izin.txt') ? fs.readFileSync('docs/blog-kopya-izin.txt', 'utf8').split('\n').filter((s) => s && !s.startsWith('#')).map((s) => s.trim().split(/\s+/).sort().join(' ')) : []);
const ni = Y.map(niyet), sup = [];
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  if (ni[i] !== ni[j]) continue;
  let s = 0; const [a, b] = nv[i].size < nv[j].size ? [nv[i], nv[j]] : [nv[j], nv[i]];
  for (const [k, w] of a) { const u = b.get(k); if (u) s += w * u; }
  if (s >= esik && !izin.has([Y[i].slug, Y[j].slug].sort().join(' '))) sup.push([s, i, j]);
}
sup.sort((a, b) => b[0] - a[0]);
console.log(`${N} yazı · eşik ${esik} · izinsiz kopya şüphesi: ${sup.length}`);
for (const [s, i, j] of sup) console.log(`${s.toFixed(2)} [${ni[i]}]\n   ${Y[i].baslik}  /${Y[i].slug}\n   ${Y[j].baslik}  /${Y[j].slug}`);
process.exit(sup.length ? 1 : 0);
