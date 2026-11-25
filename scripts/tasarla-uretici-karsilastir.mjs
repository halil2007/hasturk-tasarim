// Kendin Tasarla ile üreticinin aracını (profimod.com/tasarim/yapi-tasarimi.html) karşılaştırır. Yalnız okur; mağazaya ve üreticiye yazmaz.
// Üreticinin sayfası (tek dosya, ~1,8 MB) indirilir, jsdom'da çalıştırılır (3B çizim taklit edilir; parça listesi, konnektör, ölçü, kod ve fiyat hesabı gerçek koddan gelir).
// Aynı tasarım koduyla bizim motor (public/tasarla/motor.js, fiyat.js) çalıştırılır; parça/konnektör/ölçü/kod ve fiyat farkları yazılır.
// Kurulum: npm i --no-save jsdom   ·   Kullanım: node scripts/tasarla-uretici-karsilastir.mjs [örnek=40] [kur=50] [modüller=DYAGOLUPEJNXSZQFWCKR]
// Kur: üreticinin aracı TCMB kurunu tarayıcıdan okuyamazsa (CORS) yedek değeri 50 TL kullanır; gerçek ekranda görülen fiyat budur. Kur 2. argümanla verilir.
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { MODUL, hesapla, uretimKodu } from '../public/tasarla/motor.js';
import { fiyatPlan } from '../public/tasarla/fiyat.js';

const ORNEK = +process.argv[2] || 40, KUR = +process.argv[3] || 50, MODUL_LISTE = (process.argv[4] || 'DYAGOLUPEJNXSZQFWCKR').split('');
const SECENEK = JSON.parse(readFileSync(new URL('../public/tasarla/secenek.json', import.meta.url), 'utf8'));
const ADRES = process.env.URETICI_ADRES || 'https://www.profimod.com/tasarim/yapi-tasarimi.html';
const html0 = await (await fetch(ADRES)).text();
const three = readFileSync(new URL('../public/tasarla/three.min.js', import.meta.url), 'utf8'); // üretici de three r128 kullanır
const komut = []; const html = html0.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (m, a, g) => { if (!/src=/.test(a)) komut.push(g); return ''; });
const noop = () => {}, sahteCtx = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : k === 'measureText' ? () => ({ width: 10 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop: noop }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : noop), set: () => true });
const dom = new JSDOM(html, { runScripts: 'outside-only', url: ADRES, pretendToBeVisual: true, virtualConsole: new VirtualConsole() }), w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => sahteCtx; w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
w.ResizeObserver = w.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
w.matchMedia = w.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
w.fetch = async () => ({ ok: false, text: async () => '', json: async () => ({}) }); // kur ağdan okunmaz
w.eval(three); const T = w.THREE, P = (o) => new Proxy(o, { get: (t, k) => (k in t ? t[k] : noop) });
T.WebGLRenderer = function () { return P({ domElement: w.document.createElement('canvas'), shadowMap: {}, capabilities: {}, info: { render: {}, memory: {} }, getPixelRatio: () => 1, getContext: () => sahteCtx, setSize() {}, render() {} }); };
komut.forEach((k, i) => { if (i === komut.length - 1) k += '\nwindow.__u = { gInfo, gPrice, pmLoad, pmCode, setKur(v) { KUR = { usd: v, tarih: "", kaynak: "elle" }; } };'; try { w.eval(k); } catch (e) { console.error('üretici betiği', i, String(e).slice(0, 200)); } });
const U = w.__u; U.setKur(KUR);

let tohum = 20261120; const rnd = () => (tohum = (tohum * 1664525 + 1013904223) % 4294967296) / 4294967296, sec = (a) => a[Math.floor(rnd() * a.length)];
function uret(m) { // tasarım uzayından örnekler (bizim motorun alanları; sera ve köpek evi için elle)
  const M = MODUL[m], k = M.anahtar, o = M.alan || {}, s = M.sinir || {}, out = [];
  if (m === 'S') { for (let i = 0; i < ORNEK; i++) { const w2 = sec(['F', 'C', 'C']); out.push({ w: w2, n: w2 === 'F' ? 2 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 9), dr: sec(['S', 'N']), pl2: sec(['F', 'FB']), sr: w2 === 'F' ? 0 : sec([0, 1]), sti: 0, cr: 0, swn: sec(['w', 'w', 'w1L', 'w2R', 'w1LW']) }); } return out; }
  if (m === 'X') { for (let i = 0; i < ORNEK; i++) { const xk = Math.floor(rnd() * 9); out.push({ xk, xm: xk < 2 ? 0 : Math.floor(rnd() * 13) - 6, xd: 0 }); } return out; }
  if (m === 'C') { for (let i = 0; i < ORNEK; i++) { const cqd = sec([0, 1, 2]), r = [[2, 9], [2, 12], [2, 16]][cqd]; out.push({ cqd, cqn: r[0] + Math.floor(rnd() * (r[1] - r[0] + 1)), cqe: sec([0, 2]), cqm: sec([0, 1, 2, 3]), cqf: sec([0, 1, 2]), cqdr: sec(['dF0', 'dB0', 'dF0xB0', 'dR0', 'dL1']) }); } return out; }
  if (m === 'K') { for (let i = 0; i < ORNEK; i++) out.push({ ks: i % 4 ? 'U' : 'H', kn: 1 + Math.floor(rnd() * 10), kd: sec([true, false]), ku: sec([0, 1, 2]), hk: 1 + Math.floor(rnd() * 3), hu: sec([0, 1, 2]), kpl: sec(['F', 'FB']) }); return out; }
  if (m === 'R') { for (let i = 0; i < ORNEK; i++) out.push({ rfd: sec([0, 1, 2, 3, 4]), rfk: sec([0, 0, 2, 3]), rfL: 2000 + 100 * Math.floor(rnd() * 100), rfW: 2000 + 100 * Math.floor(rnd() * 100), rfH: 2000 + 100 * Math.floor(rnd() * 15), rfdw: sec(['top', 'left', 'bottom', 'right']), rfdp: 600 + 100 * Math.floor(rnd() * 50), rfo: i % 3 ? 1 : 0, rfb: 1 + Math.floor(rnd() * 5) }); return out; }
  const uzay = k.map((kk) => o[kk] || (s[kk] ? Array.from({ length: Math.floor((s[kk][1] - s[kk][0]) / s[kk][2]) + 1 }, (_, i) => s[kk][0] + i * s[kk][2]) : [M.varsayilan[kk]]));
  for (let i = 0; i < ORNEK; i++) { const p = {}; k.forEach((kk, j) => (p[kk] = sec(uzay[j]))); out.push(p); }
  return out;
}
const J = JSON.stringify, tablo = {}, ayrinti = [];
for (const m of MODUL_LISTE) {
  if (!MODUL[m]) continue; const t = (tablo[m] = { ornek: 0, reddedilen: 0, parca: 0, kon: 0, olcu: 0, alt: 0, kod: 0, oran: [], fark: [] });
  for (const p of uret(m)) {
    const r = hesapla(m, { ...MODUL[m].varsayilan, ...p }), kod = uretimKodu(r.kod); t.ornek++;
    if (!U.pmLoad(kod)) { t.reddedilen++; continue; }
    const i = U.gInfo(), tp = i.parts.map((x) => x.c), tk = i.conn.map((x) => x.c);
    if (J(tp) !== J(r.parca)) { t.parca++; ayrinti.push([m, kod, 'parça listesi']); } if (J(tk) !== J(r.kon)) { t.kon++; ayrinti.push([m, kod, 'konnektör']); } if (i.big !== r.olcu) t.olcu++; if (i.small !== r.alt) t.alt++; if (U.pmCode() !== kod) { t.kod++; ayrinti.push([m, kod, 'kod ' + U.pmCode()]); }
    const onlar = U.gPrice(i), pf = fiyatPlan(r, SECENEK, m); if (onlar && pf.tamam) { t.oran.push(pf.birim / onlar); t.fark.push(pf.birim - onlar); }
  }
}
const ozet = {}; for (const [m, t] of Object.entries(tablo)) { const o = t.oran.sort((a, b) => a - b); ozet[m] = { ornek: t.ornek, reddedilen: t.reddedilen, 'parça farkı': t.parca, 'konnektör farkı': t.kon, 'ölçü farkı': t.olcu, 'alt yazı farkı': t.alt, 'kod farkı': t.kod, 'fiyat oranı (bizde/onlarda) min': o.length ? +o[0].toFixed(3) : null, 'ortanca': o.length ? +o[Math.floor(o.length / 2)].toFixed(3) : null, 'max': o.length ? +o[o.length - 1].toFixed(3) : null }; }
console.log(`Üretici aracı ${ADRES} · kur ${KUR} · seçenek verisi ${SECENEK.guncel}`); console.table(ozet);
ayrinti.slice(0, 20).forEach((a) => console.log('FARK', a.join(' | ')));
process.exit(ayrinti.length ? 1 : 0);
