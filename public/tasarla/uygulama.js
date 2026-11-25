// Kendin Tasarla: arayüz ve 3B görünüm. Hesaplar motor.js'ten gelir (üretim listesiyle birebir).
// Ürün Bul paneline (gölge kök) ya da bağımsız sayfaya kurulur; sepete ekleme ikas window.addToCart ile tek ürün olarak yapılır.
import { CSS, HTML } from './arayuz.js';
import { fiyatPlan } from './fiyat.js';
import { paketNotu } from './paket.js';
import { MODUL, hesapla, kodAc, KLD, CKD, OGCAR, GPV, kopekYuzeyleri, pencereCoz, pencereKod, konAdi, cqKapiAdaylari, CQR, CQD, RFD, urunTasarimi } from './motor.js';
import { kutular, KUSLAR, ODUNLAR, CMAT, CFL, CR } from './bilgi.js';

export function kur(kok, sec = {}) {
  kok.innerHTML = '<style>' + CSS + '</style>' + HTML;
  if (sec.gomulu) kok.querySelector('.ht-t').classList.add('gomulu');
const $ = (s) => kok.querySelector(s);
const F1 = (x) => String(x).replace('.', ',');

/* ---------- Tür kataloğu ve kontroller ---------- */
// ?grup=sera: yalnız sera modelleri (Kendi Seranı Tasarla ürün sayfası)
const SERA = sec.grup === 'sera';
const GRUP = SERA ? [['Sera modelleri', ['S', 'E', 'N']]] : [
  ['Bahçe ve sera', ['S', 'E', 'N', 'G', 'Z']],
  ['Hayvan barınakları', ['K', 'J', 'Q', 'F', 'A', 'X']],
  ['Ev, bahçe ve iş', ['D', 'Y', 'R', 'W', 'C', 'O', 'P', 'L', 'U']],
];
const IK = {
  S: '<path d="M3 30V16l11-9 11 9v14M3 16h22M11 30v-9h6v9M3 23h5M20 23h5"/>', E: '<path d="M4 30V15l10-9 10 9v15M4 15h20M14 6v24"/>', N: '<path d="M4 30V15l6-7h8l6 7v15M4 15h20M11 30V18h6v12"/>', G: '<path d="M6 30V12h16v18M6 12l8-6 8 6M6 20h16"/>',
  Z: '<path d="M3 26h22v4H3zM5 26V12h18v14M5 12h18"/>', J: '<path d="M4 30V16l10-8 10 8v14M9 30v-8h10v8M4 22h20"/>', A: '<path d="M3 18h22M5 18v12M23 18v12M6 10h7v8H6zM15 10h7v8h-7z"/>',
  X: '<path d="M3 30V16l7-6 7 6v14M17 20h10v10M3 22h14"/>', D: '<path d="M3 12h22M6 12v18M22 12v18M6 24h16"/>', Y: '<path d="M3 16h22M6 16v14M22 16v14M3 16l3-6h16l3 6"/>',
  O: '<path d="M2 16l5-7h14l5 7M4 16v14M24 16v14M8 26h12"/>', P: '<path d="M4 30V20l12-12 8 8M8 30V18M20 30V14M10 10l6 6"/>', L: '<path d="M4 8h20v22H4zM4 15h20M4 22h20M12 8v22"/>',
  U: '<path d="M4 10h20v20H4zM4 10l10-4 10 4M14 10v20"/>',
  K: '<path d="M3 30V15l11-8 11 8v15M8 30v-9h12v9M3 22h22M11 15h6"/>', Q: '<path d="M5 30V8h18v22M5 8h18M5 16h18M5 23h18M11 8v22M17 8v22"/>', F: '<path d="M4 30V10h20v20M4 10h20M4 20h20M14 10v20M9 26h6"/>',
  R: '<path d="M4 8h20M4 17h20M4 26h20M4 6v24M24 6v24M14 17V8"/>', W: '<path d="M3 30V13l11-6 11 6v17M3 30h22M7 30v-8h14v8M7 26h14"/>', C: '<path d="M3 11h22v18H3zM3 11l4-4h14l4 4M10 11v18M18 11v18M10 20h8"/>',
};
const ses = (k, ad, d, et, not) => ({ t: 'seg', k, ad, d: d.map((v, i) => [v, et ? et[i] : String(v)]), not });
const say = (k, ad, a, b, st, br, alt) => ({ t: 'say', k, ad, a, b, st, br, alt });
const secim = (k, ad, liste) => ({ t: 'sec', k, ad, liste });
const KONTROL = {
  D: [say('msL', 'Uzunluk', 60, 1000, 10, 'cm'), say('msW', 'Genişlik', 40, 150, 10, 'cm'), say('msH', 'Yükseklik', 50, 100, 10, 'cm', 'Tabla üstü'), ses('msR', 'Alt raf', [0, 1], ['Yok', 'Var'])],
  Y: [say('kyL', 'Uzunluk', 60, 1000, 10, 'cm'), say('kyW', 'Genişlik', 40, 150, 10, 'cm'), say('kyH', 'Yükseklik', 50, 100, 10, 'cm', 'Alt tel hizası'), ses('kyO', 'Kapaklar (görünüm)', [1, 0], ['Açık', 'Kapalı'])],
  A: [ses('arw', 'Kovan yeri (yan yana)', [2, 4, 6]), ses('ark', 'Kat', [1, 2]), say('arn', 'Sehpa adedi', 1, 12, 1, 'adet'), secim('arr', 'Bölge', ['Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu']), ses('ara', 'Rakım', [0, 1, 2, 3], ['0–500 m', '500–1000', '1000–1500', '1500 m +'])],
  G: [ses('gkR', 'Çatı', [0, 1], ['Düz', 'Kesik']), ses('gkN', 'Derinlik', [1, 2, 3], ['1 bölüm', '2 bölüm', '3 bölüm'])],
  O: [ses('ogC', 'Araç', [0, 1, 2], OGCAR.map((c) => c.k)), ses('ogN', 'Uzunluk', [3, 4], ['3 bölüm', '4 bölüm'])],
  L: [secim('klD', 'Cihaz', KLD.map((d) => d.k))],
  U: [secim('ckD', 'Konteyner', CKD.map((d) => d.k)), ses('ckT', 'Üst kapak', [0, 1], ['Kapaklı', 'Üstü açık'])],
  P: [ses('gpV', 'Panel', [0, 1, 2], GPV.map((v) => v.k.split(' ')[0])), ses('gpN', 'Sehpa adedi', [1, 2, 3, 4])],
  E: [ses('lyH', 'Profil boyu', [0, 1], ['1,5 m', '2 m']), ses('lyN', 'Bölüm', [1, 2, 3, 4])],
  N: [ses('asN', 'Bölüm', [2, 3])],
  J: [ses('hxN', 'Bölüm', [1, 2, 3]), ses('hxU', 'Hayvan', [0, 1, 2], ['Tavuk', 'Kaz', 'Ördek'])],
  X: [say('xk', 'Gezinme alanı', 0, 8, 1, 'bölüm'), say('xm', 'Yan kol (L)', -6, 6, 1, 'bölüm', 'Eksi: sağda, artı: solda'), { t: 'kapi', k: 'xd', ad: 'Kapı' }],
  S: [{ t: 'model', k: 'w', ad: 'Model' }, say('n', 'Uzunluk', 2, 10, 1, 'bölüm'), ses('dr', 'Kapı', ['S', 'N'], ['Var', 'Yok'], 'Her kapı için kapı kanadı ve 2 menteşe gelir.'), ses('pl2', 'Kapı yeri', ['F', 'FB'], ['Sadece ön', 'Ön ve arka'], 'Giriş, alın çerçevesinin yan bölmesine açılır; mahya kolonu zemine kadar iner.'), { t: 'pen', k: 'swn', ad: 'Pencereler' }, { ...secim('cr', 'Yetiştirilecek ürün', CR.map((c) => c.k)), grup: CR.map((c) => c.g || '') }],
  K: [ses('ks', 'Tür', ['U', 'H'], ['Üretim kümesi', 'Hobi kümesi']), { ...ses('ku', 'Hayvan', [0, 1, 2], ['Tavuk', 'Kaz', 'Ördek']), g: (p) => p.ks !== 'H' }, { ...say('kn', 'Uzunluk', 1, 10, 1, 'bölüm', 'Genişlik 4,23 m sabit (kesik çatı)'), g: (p) => p.ks !== 'H' }, { ...ses('kd', 'Kapı', [true, false], ['Var', 'Yok']), g: (p) => p.ks !== 'H' },
    { ...ses('kpl', 'Kapı yeri', ['F', 'FB'], ['Sadece ön', 'Ön ve arka']), g: (p) => p.ks !== 'H' }, { ...{ t: 'pen', k: 'kswn', ad: 'Pencereler' }, g: (p) => p.ks !== 'H' },
    { ...ses('hu', 'Hayvan', [0, 1, 2], ['Tavuk', 'Kaz', 'Ördek']), g: (p) => p.ks === 'H' }, { ...ses('hk', 'Boyut', [1, 2, 3], ['Küçük', 'Orta', 'Büyük']), g: (p) => p.ks === 'H' }],
  Q: [say('qgw', 'Genişlik', 1, 5, 1, 'bölüm'), say('qgl', 'Uzunluk (duvara doğru)', 1, 5, 1, 'bölüm'), ses('qgh', 'Yükseklik', [0, 1], ['2 m', '3 m']), secim('qgb', 'Kuş türü', KUSLAR)],
  F: [say('kfw', 'Genişlik', 1, 5, 1, 'bölüm'), say('kfp', 'Derinlik (balkon dışına)', 1, 3, 1, 'bölüm'), ses('kfh', 'Yükseklik', [0, 1, 2], ['1,25 m', '1,88 m', '2,50 m']), say('kfs', 'Tünek / raf', 0, 4, 1, 'raf', 'Ahşap raf, pakete dahil değil')],
  W: [say('odn', 'Uzunluk (duvar boyunca)', 2, 6, 1, 'bölüm'), ses('odd', 'Derinlik', [0, 1, 2], ['0,83 m', '1,08 m', '1,28 m']), ses('odh', 'İstif yüksekliği (saçak)', [0, 1, 2], ['1,28 m', '1,58 m', '1,91 m']), ses('odk', 'Kapı', [0, 1], ['Kapısız', 'Kapılı']), ses('odr', 'Çatı tipi', [0, 1], ['Beşik', 'Düz']), ses('odc', 'Çatı örtüsü', [0, 1, 2], ['Branda', 'Sunta', 'Sac']), secim('ods', 'Odun türü', ODUNLAR)],
  C: [ses('cqd', 'Profil yoğunluğu', [0, 1, 2], ['Az', 'Orta', 'Çok']), { ...say('cqn', 'Uzunluk', 2, 9, 1, 'bölüm'), af: (p) => CQR[p.cqd][0], bf: (p) => CQR[p.cqd][1] }, ses('cqe', 'Kapı', [0, 2], ['Tek kapı', 'İki kapı']), { t: 'kapiC', k: 'cqdr', ad: 'Kapı yeri' }, secim('cqm', 'Duvar ve çatı kaplaması', CMAT.map((c) => c.k)), secim('cqf', 'Zemin kaplaması', CFL.map((c) => c.k))],
  R: [ses('rfo', 'Görünüm', [0, 1], ['Tek raf', 'Odada']), ses('rfd', 'Profil / kat yüksekliği', [3, 4, 0, 1, 2], ['29,5', '39,5', '59,5', '74,5', '99,5']), { ...say('rfb', 'Bölüm sayısı', 1, 5, 1, 'bölüm'), g: (p) => !p.rfo },
    { ...ses('rfk', 'Kat sayısı', [0], ['Otomatik']), d: (p, r) => [[0, 'Otomatik']].concat(Array.from({ length: Math.max(0, ((r && r.ek && r.ek.mxK) || 2) - 1) }, (_, i) => [i + 2, String(i + 2)])) },
    { ...say('rfL', 'Oda uzunluğu', 2000, 12000, 100, 'cm', 'Oda 200–1200 cm'), bol: 10, g: (p) => !!p.rfo }, { ...say('rfW', 'Oda genişliği', 2000, 12000, 100, 'cm'), bol: 10, g: (p) => !!p.rfo }, { ...say('rfH', 'Tavan yüksekliği', 2000, 3500, 100, 'cm', 'Tavan 200–350 cm'), bol: 10, g: (p) => !!p.rfo },
    { ...ses('rfdw', 'Kapı duvarı (planda)', ['top', 'bottom', 'left', 'right'], ['Üst', 'Alt', 'Sol', 'Sağ']), g: (p) => !!p.rfo }, { ...say('rfdp', 'Kapı konumu', 510, 11490, 100, 'cm', 'Duvar boyunca'), bol: 10, af: () => 510, bf: (p) => (p.rfdw === 'left' || p.rfdw === 'right' ? p.rfW : p.rfL) - 510, g: (p) => !!p.rfo }],
  Z: [ses('zdT', 'Tip', [0, 1], ['Düz iskelet', 'Kemer (iki yatak)']), ses('zdA', 'Yatak eni', [2, 3, 4], ['60 cm', '86 cm', '112 cm']), say('zdB', 'Yatak boyu', 3, 9, 1, 'kare', 'Her kare 26 cm'), ses('zdC', 'Yatak rengi', ['b', 'g'], ['Bej', 'Gri'])],
};

let TUR = SERA ? 'S' : 'D', P = { ...MODUL[TUR].varsayilan }, ADET = 1, SEKME = 'tasar', R = null, ORTU_ON = true, TURAC = false;
const MODEL = [['C0', 'Olimpos', 'Beşik çatı'], ['C1', 'Pergamon', 'Geniş, kesik çatı'], ['F0', 'Dar sera', '1,6 m genişlik']];
const nSinir = () => (TUR === 'S' && P.w === 'F' ? 4 : 10);
const gorunur = (c) => !c.g || c.g(P);
const lim = (c) => [c.af ? c.af(P) : c.a, TUR === 'S' && c.k === 'n' ? nSinir() : c.bf ? c.bf(P) : c.b];
const gost = (c) => P[c.k] / (c.bol || 1);

/* ---------- Panel ---------- */
function turlerHTML() {
  return GRUP.map(([g, l]) => `<div class="grp-ad">${g}</div><div class="tipler">${l.map((m) => `<button class="tip${m === TUR ? ' on' : ''}" data-tur="${m}"><svg viewBox="0 0 28 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${IK[m]}</svg>${m === 'S' ? 'Olimpos, Pergamon, dar sera' : MODUL[m].ad}</button>`).join('')}</div>`).join('');
}
// Bölüm / kare sayısıyla seçilen ölçüler müşteriye metre olarak gösterilir (seçimin karşılığı olan dış ölçü)
const METRE = { G: ['gkN'], O: ['ogN'], E: ['lyN'], N: ['asN'], J: ['hxN'], S: ['n'], X: ['xk'], Z: ['zdB'], Q: ['qgw', 'qgl'], F: ['kfw', 'kfp'], W: ['odn'], C: ['cqn'], K: ['kn'] }, _mt = new Map();
const metreMi = (k) => (METRE[TUR] || []).includes(k);
function boyM(k, v) {
  const anah = TUR + JSON.stringify({ ...P, [k]: v }); if (_mt.has(anah)) return _mt.get(anah);
  const ext = (q) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; hesapla(TUR, { ...P, [k]: q }).yapi.uye.forEach((u) => [u.a, u.b].forEach((p) => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); })); return [x1 - x0 + 30, z1 - z0 + 30]; };
  const e = ext(v), o = ext(v === 0 || v === '0' ? 1 : v - 1), eks = Math.abs(e[0] - o[0]) > Math.abs(e[1] - o[1]) ? 0 : 1, t = (e[eks] / 1000).toFixed(2).replace('.', ',') + ' m';
  _mt.set(anah, t); return t;
}
function kontrolHTML(c) {
  if (typeof c.d === 'function') c = { ...c, d: c.d(P, R).map(([v, e]) => [v, e]) };
  if (c.t === 'seg' && metreMi(c.k)) c = { ...c, ad: c.ad === 'Bölüm' ? 'Uzunluk' : c.ad, d: c.d.map(([v]) => [v, boyM(c.k, v)]) };
  if (c.t === 'seg') return `<div class="alan"><div class="ust"><label>${c.ad}</label></div><div class="seg">${c.d.map(([v, e]) => `<button data-s="${c.k}" data-v="${v}" class="${String(P[c.k]) === String(v) ? 'on' : ''}">${e}</button>`).join('')}</div>${c.not ? `<small class="nt">${c.not}</small>` : ''}</div>`;
  if (c.t === 'kapiC') { const kap = String(P.cqdr || '').replace(/^d/, '').split('x').filter(Boolean), aday = cqKapiAdaylari(P.cqd, P.cqn), say2 = P.cqe == 2 ? 2 : 1;
    return Array.from({ length: say2 }, (_, i) => `<div class="alan"><div class="ust"><label for="s-cqk${i}">${c.ad}${say2 > 1 ? ' ' + (i + 1) : ''}</label></div><select id="s-cqk${i}" data-cqk="${i}">${aday.map(([f, o, ad]) => `<option value="${f}${o}"${kap[i] === f + o ? ' selected' : ''}>${ad}</option>`).join('')}</select></div>`).join(''); }
  if (c.t === 'sec') { let gr = ''; // grup: seçenek başına grup adı (boş = grupsuz); ardışık aynı grup tek <optgroup> olur
    const sec2 = c.liste.map((e, i) => { const g = c.grup ? c.grup[i] : '', ac = g && g !== gr ? `${gr ? '</optgroup>' : ''}<optgroup label="${g}">` : !g && gr ? '</optgroup>' : ''; gr = g; return `${ac}<option value="${i}"${+P[c.k] === i ? ' selected' : ''}>${e}</option>`; }).join('') + (gr ? '</optgroup>' : '');
    return `<div class="alan"><div class="ust"><label for="s-${c.k}">${c.ad}</label></div><select id="s-${c.k}" data-sec="${c.k}">${sec2}</select></div>`; }
  if (c.t === 'model') return `<div class="alan"><div class="ust"><label>${c.ad}</label></div><div class="modeller">${MODEL.map(([v, a, b]) => `<button data-model="${v}" class="${P.w + (P.sr ? 1 : 0) === v ? 'on' : ''}"><b>${a}</b><small>${b}</small></button>`).join('')}</div>${P.w === 'F' ? '<small class="nt">Dar sera: 74,5 cm profil, 1,58 m genişlik, tek parça mertek, en fazla 4 bölüm, kesik çatı yok.</small>' : ''}</div>`;
  if (c.t === 'pen') { const nk = c.k === 'kswn' ? 'kn' : 'n', L = pencereCoz(P[c.k], P[nk]), r = L.filter((q) => !q.w).length, w = L.filter((q) => q.w).length, st = (k, ad, v) => `<div class="alan"><div class="ust"><label>${ad}<small>En fazla ${2 * P[nk]}</small></label><div class="deger"><button data-pen="${k}" data-pk="${c.k}" data-a="-1" aria-label="${ad} azalt">−</button><input value="${v}" readonly><i>adet</i><button data-pen="${k}" data-pk="${c.k}" data-a="1" aria-label="${ad} artır">+</button></div></div></div>`;
    return st('r', 'Çatı penceresi', r) + st('w', 'Yan duvar penceresi', w); }
  if (c.t === 'kapi') { const L = kopekYuzeyleri(P.xk, P.xm), et = (q) => (q.c === 0 ? (P.xk ? 'Önde' : 'Kulübe önünde') : q.c < 200 ? 'Sağ yan ' + (q.c - 99) : q.c < 300 ? 'Sol yan ' + (q.c - 199) : q.c === 500 ? 'Yan kol ucu' : 'Yan kol ' + ((q.c % 100) + 1));
    return `<div class="alan"><div class="ust"><label for="s-xd">${c.ad}</label></div><select id="s-xd" data-sec="xd" data-ham="1">${L.map((q) => `<option value="${q.c}"${+P.xd === q.c ? ' selected' : ''}>${et(q)}</option>`).join('')}</select></div>`; }
  if (TUR === 'X' && c.k === 'xk') c = { ...c, ad: 'Toplam uzunluk', alt: 'Kulübe ve gezinme alanı' };
  if (TUR === 'Z' && c.k === 'zdB') c = { ...c, ad: 'Uzunluk', alt: 'Yatak boyu, her kare 26 cm' };
  if (TUR === 'S' && c.k === 'n') c = { ...c, b: nSinir(), alt: P.w === 'F' ? 'Her bölüm 0,78 m' : 'Her bölüm 1,02 m' };
  const [la, lb] = lim(c), yuz = lb > la ? ((P[c.k] - la) / (lb - la)) * 100 : 0;
  return `<div class="alan"><div class="ust"><label for="i-${c.k}">${c.ad}${c.alt ? `<small>${c.alt}</small>` : ''}</label><div class="deger"><button data-k="${c.k}" data-a="${-c.st}" aria-label="${c.ad} azalt">−</button>${metreMi(c.k) ? `<b class="mt" id="m-${c.k}">${boyM(c.k, P[c.k])}</b>` : `<input id="i-${c.k}" data-g="${c.k}" inputmode="numeric" value="${gost(c)}"><i>${c.br}</i>`}<button data-k="${c.k}" data-a="${c.st}" aria-label="${c.ad} artır">+</button></div></div><input type="range" data-r="${c.k}" min="${la}" max="${lb}" step="${c.st}" value="${P[c.k]}" style="--p:${yuz}%" aria-label="${c.ad}"></div>`;
}
const satir = (r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`;
// ---------- Bilgi kutuları (kapasite, verim, kaplama hesabı, uyarılar): metinler ve hesaplar bilgi.js'ten ----------
let BK = { kutu: [], ayar: [], parcaNot: '', dip: '' };
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function kutuHTML(b) {
  let o = '', rows = [], li = [], ilk = true;
  const bit = () => { if (rows.length) o += `<table class="tbl">${rows.map((r) => `<tr><td>${esc(r[1])}</td><td class="num">${esc(r[2])}</td></tr>`).join('')}</table>`; if (li.length) o += `<ul class="rehber">${li.map((r) => `<li><b>${esc(r[1])}</b> ${esc(r[2])}</li>`).join('')}</ul>`; rows = []; li = []; };
  for (const e of b) {
    if (e[0] === 'r') { if (li.length) bit(); rows.push(e); continue; } if (e[0] === 'li') { if (rows.length) bit(); li.push(e); continue; } bit();
    if (e[0] === 'h') { o += ilk ? `<h2>${esc(e[1])}</h2>` : `<h3 class="kb">${esc(e[1])}</h3>`; }
    else if (e[0] === 'b') o += `<div class="buyuk num">${esc(e[1])}</div>`;
    else if (e[0] === 'w') o += `<p class="uyari">${esc(e[1])}</p>`;
    else if (e[0] === 'cal') o += `<div class="takvim">${e[1].map((v, i) => `<span style="${v > 0 ? `background:rgba(224,168,46,${(0.25 + 0.75 * v).toFixed(2)});font-weight:600` : ''}" title="${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][i]}">${'OŞMNMHTAEEKA'[i]}</span>`).join('')}</div>`;
    else o += `<p class="not">${esc(e[1])}</p>`;
    ilk = false;
  }
  bit(); return o;
}
const bilgiHTML = () => (BK.ayar || []).concat(BK.kutu || []).map((b) => `<div class="kutu">${kutuHTML(b)}</div>`).join('');
function panel() {
  const el = $('#icerik');
  if (SEKME === 'liste') {
    el.innerHTML = `<div class="bolum"><h2>Profil ve aksesuar</h2>${BK.parcaNot ? `<p class="not">${esc(BK.parcaNot)}</p>` : ''}<table class="tbl">${R.parca.map(satir).join('')}</table></div>
      <div class="bolum"><h2>Konnektörler</h2><table class="tbl">${R.kon.map((r) => satir([konAdi(r[0]), r[1]])).join('')}</table></div>
      ${R.levha && R.levha.length ? `<div class="bolum"><h2>Ölçüler ve notlar</h2><table class="tbl">${R.levha.map(satir).join('')}</table></div>` : ''}
      ${fiyatDokum()}
      ${BK.dip ? `<p class="not dip2">${esc(BK.dip)}</p>` : ''}
      <div class="bolum"><h2>Tasarım kodu</h2><div class="kod"><code>${R.kod}</code><button id="kodKopya">Kopyala</button></div><div class="kod" style="margin-top:8px"><input id="kodGir" placeholder="Tasarım kodu girin (HG-…)" aria-label="Tasarım kodu" style="flex:1;min-width:0;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px;font:600 12.5px ui-monospace,monospace"><button id="kodAc">Aç</button></div><p class="not">Bu kod, tasarımınızı ve parça listesini birebir tanımlar. Sorunuz için müşteri hizmetleri: +90 553 727 2929</p></div>`;
    return;
  }
  // Tür seçimi tek satır: seçili tür + "Değiştir"; liste yalnız açılınca görünür, ölçüler hemen altta
  const tad = TUR === 'S' ? 'Sera' : MODUL[TUR].ad;
  el.innerHTML = `<div class="tur-sec"><button class="tur-bas${TURAC ? ' acik' : ''}" data-turac="1" aria-expanded="${TURAC}"><span class="ic"><svg viewBox="0 0 28 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${IK[TUR]}</svg></span><span class="ad"><small>Yapı türü</small><b>${tad}</b></span><i>${TURAC ? 'Kapat' : 'Değiştir'}</i></button>${TURAC ? `<div class="tur-liste">${turlerHTML()}</div>` : ''}</div>
    <div class="bolum ilk">${KONTROL[TUR].filter(gorunur).map(kontrolHTML).join('')}</div>
    <div class="bolum" id="notlar">${notlar()}</div>
    <div class="bolum" id="bilgi">${bilgiHTML()}</div>`;
}
// ---------- Fiyat ve sepet ----------
let SEC = sec.secenek || null, FP = null, EKLENIYOR = false;
const TL = (x) => Math.round(x).toLocaleString('tr-TR') + ' TL';
if (!SEC) fetch(new URL('./secenek.json', import.meta.url), { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.varyant) { SEC = j; fiyatYaz(); if (SEKME === 'liste') panel(); } }).catch(() => {});
function fiyatYaz() {
  const b = $('.fiyat b'), not = $('.dip .not'), mf = $('#mFiyat');
  FP = SEC && R ? fiyatPlan(R, SEC, MODUL[TUR].ad) : null;
  const yazi = !SEC ? 'Hesaplanıyor…' : FP.tamam ? TL(FP.birim * ADET) : 'Fiyat sorunuz';
  b.textContent = yazi; b.classList.toggle('bekle', !FP || !FP.tamam); if (mf) mf.textContent = yazi;
  not.textContent = FP && !FP.tamam ? 'Bu ölçünün fiyatını müşteri hizmetlerimiz iletir: +90 553 727 2929' : 'Fiyata ölçüsüne kesilmiş, delinmiş profiller ve konnektörler dahildir.' + (FP && FP.yatak ? ' Sebze yatağı bu fiyata dahil değildir.' : '') + (ADET > 1 ? ' Bir takım: ' + TL(FP ? FP.birim : 0) + '.' : '');
  kok.querySelectorAll('.sepet').forEach((x) => { x.disabled = EKLENIYOR; x.classList.toggle('pasif', !!(FP && !FP.tamam)); });
}
function fiyatDokum() {
  if (!FP || !FP.tamam) return '';
  return `<div class="bolum"><h2>Fiyat dökümü</h2><table class="tbl">${[['Hazırlık ve paketleme', TL(SEC.taban)]].concat(FP.kalem.map((x) => [(x.etiket.startsWith('PC') ? konAdi(x.etiket) : x.etiket) + ' × ' + x.n, TL(x.tutar)])).map(satir).join('')}<tr class="top"><td>Bir takım</td><td class="num">${TL(FP.birim)}</td></tr></table></div>`;
}
async function sepeteEkle() {
  if (EKLENIYOR) return;
  if (!SEC || !FP) { toast('Fiyat bilgisi yükleniyor, birkaç saniye sonra tekrar deneyin'); return; }
  if (!FP.tamam) { toast('Bu ölçünün fiyatını müşteri hizmetlerimiz iletir: +90 553 727 2929'); return; }
  const istek = { variantId: SEC.varyant, quantity: ADET, options: FP.secenekler }, ekle = sec.ekle || (typeof window.addToCart === 'function' ? (x) => window.addToCart(x) : null);
  if (!ekle) { toast('Sepete ekleme mağaza sayfasında çalışır'); return; }
  EKLENIYOR = true; fiyatYaz();
  let ok = false; try { const x = await ekle(istek); ok = !!(x && x.success); } catch (e) { ok = false; }
  EKLENIYOR = false; fiyatYaz();
  toast(ok ? `Tasarımınız sepete eklendi (${TL(FP.birim * ADET)})` : 'Sepete eklenemedi. Müşteri hizmetlerimiz: +90 553 727 2929');
  if (sec.sepet) try { sec.sepet({ tur: 'ht-tasarla-sepet', kod: R.kod, adet: ADET, tutar: FP.birim * ADET, ok }); } catch (e) {}
}
function notlar() {
  const t = [paketNotu(TUR), R.not, 'Profiller 30 × 30 × 1,2 mm galvaniz kutu profildir; parçalar ölçüsüne kesilmiş ve delinmiş gelir, kaynak gerekmez.'].filter(Boolean);
  return '<h2>Bilmeniz gerekenler</h2>' + t.map((x) => `<div class="bilgi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg><span>${x}</span></div>`).join('');
}
function yaz() {
  for (const c of KONTROL[TUR].filter(gorunur)) {
    if (c.t === 'say') { const [la, lb] = lim(c), i = kok.querySelector('#i-' + c.k), r = kok.querySelector(`[data-r="${c.k}"]`); if (i && (kok.activeElement || document.activeElement) !== i) i.value = gost(c); const mt = kok.querySelector('#m-' + c.k); if (mt) mt.textContent = boyM(c.k, P[c.k]); if (r) { r.min = la; r.max = lb; r.value = P[c.k]; r.style.setProperty('--p', (lb > la ? ((P[c.k] - la) / (lb - la)) * 100 : 0) + '%'); } }
  }
  const n = $('#notlar'); if (n) n.innerHTML = notlar();
  const bl = $('#bilgi'); if (bl) bl.innerHTML = bilgiHTML();
}

/* ---------- Hesap ---------- */
const sayi = (rows, re) => rows.filter((r) => re.test(r[0])).reduce((t, r) => t + (parseInt(r[1], 10) || 0), 0);
function hesap(yeni) {
  R = hesapla(TUR, P); BK = kutular(TUR, P, R);
  const prof = sayi(R.parca, /^Toplam profil/), kon = sayi(R.kon, /^Toplam konnektör/);
  $('#disolcu').textContent = R.olcu; $('#disalt').textContent = R.alt;
  $('#parcaSayi').textContent = `${prof * ADET} profil · ${kon * ADET} konnektör`; $('#mAlt').textContent = `${prof * ADET} profil · ${kon * ADET} konnektör`;
  $('#sayi').textContent = prof + kon; $('#adet').textContent = ADET;
  if (sec.bagimsiz) try { history.replaceState(null, '', '#' + R.kod + (ADET > 1 ? '~' + ADET : '')); } catch (e) {}
  if (sec.degisti) try { sec.degisti(R.kod, ADET); } catch (e) {}
  fiyatYaz(); sahne(yeni);
}
const sinir = (k, v) => { const c = KONTROL[TUR].find((x) => x.k === k), [la, lb] = lim(c); return Math.min(lb, Math.max(la, Math.round(v / c.st) * c.st)); };
function turSec(m, P0) { const yeni = m !== TUR; TUR = m; P = { ...MODUL[m].varsayilan, ...(P0 || {}) }; hesap(yeni); panel(); }

$('#icerik').addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'kodAc') { const v = ($('#kodGir').value || '').trim().replace(/^.*#(tasarla=)?/, ''), r = kodAc(decodeURIComponent(v).split('~')[0]); if (!r || !KONTROL[r.m]) { toast('Bu tasarım kodu tanınmadı'); return; } ac(decodeURIComponent(v)); toast('Tasarım açıldı'); return; }
  if (t.id === 'kodKopya') { navigator.clipboard && navigator.clipboard.writeText(R.kod).then(() => toast('Tasarım kodu kopyalandı')); return; }
  if (t.dataset.turac) { TURAC = !TURAC; panel(); return; }
  if (t.dataset.tur) { TURAC = false; if (t.dataset.tur !== TUR) turSec(t.dataset.tur); else panel(); return; }
  if (t.dataset.k) { P[t.dataset.k] = sinir(t.dataset.k, +P[t.dataset.k] + +t.dataset.a); hesap(); TUR === 'X' ? panel() : yaz(); return; }
  if (t.dataset.model) { P.w = t.dataset.model[0]; P.sr = +t.dataset.model[1]; if (P.w === 'F' && P.n > 4) P.n = 4; P.swn = 'w'; hesap(true); panel(); return; }
  if (t.dataset.pen) { const pk = t.dataset.pk || 'swn', nk = pk === 'kswn' ? 'kn' : 'n', L = pencereCoz(P[pk], P[nk]), ww = t.dataset.pen === 'w' ? 1 : 0, mevcut = L.filter((q) => q.w === ww).length, hedef = Math.max(0, Math.min(2 * P[nk], mevcut + +t.dataset.a)), mid = (P[nk] - 1) / 2, aday = [];
    for (let i = 0; i < P[nk]; i++) [0, 1].forEach((sd) => aday.push({ i, s: sd, w: ww })); aday.sort((a, b) => a.s - b.s || Math.abs(a.i - mid) - Math.abs(b.i - mid) || a.i - b.i);
    P[pk] = pencereKod(L.filter((q) => q.w !== ww).concat(aday.slice(0, hedef))); hesap(); panel(); return; }
  if (t.dataset.s) { const v = t.dataset.v; P[t.dataset.s] = /^-?\d+$/.test(v) ? +v : v === 'true' ? true : v === 'false' ? false : v; hesap(); panel(); }
});
$('#icerik').addEventListener('input', (e) => { const r = e.target.dataset.r; if (r) { P[r] = +e.target.value; hesap(); TUR === 'X' ? panel() : yaz(); } });
$('#icerik').addEventListener('change', (e) => {
  const g = e.target.dataset.g, s = e.target.dataset.sec;
  const ck = e.target.dataset.cqk;
  if (ck !== undefined) { const kap = String(P.cqdr || '').replace(/^d/, '').split('x').filter(Boolean); kap[+ck] = e.target.value; P.cqdr = 'd' + kap.join('x'); hesap(); panel(); return; }
  if (g) { const c = KONTROL[TUR].find((x) => x.k === g), v = parseInt(e.target.value, 10); P[g] = sinir(g, isNaN(v) ? P[g] : v * (c.bol || 1)); e.target.value = gost(c); hesap(); yaz(); }
  if (s) { P[s] = +e.target.value; hesap(); panel(); }
});
$('#icerik').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.g) e.target.blur(); if (e.key === 'Enter' && e.target.id === 'kodGir') $('#kodAc').click(); });
$('#sekme').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; SEKME = b.dataset.s; kok.querySelectorAll('#sekme button').forEach((x) => x.classList.toggle('on', x === b)); panel(); });
kok.querySelector('.adet').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; ADET = Math.min(20, Math.max(1, ADET + +b.dataset.adet)); hesap(); });
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('acik'); clearTimeout(toast.z); toast.z = setTimeout(() => el.classList.remove('acik'), 2600); }
kok.querySelectorAll('.sepet').forEach((b) => b.addEventListener('click', sepeteEkle));
// WhatsApp'tan sipariş: tasarımın ölçüsü, kodu, açma bağlantısı, parça listesi ve fiyatı hazır mesaj olarak gelir
const WA_NO = sec.whatsapp || '905537272929';
function waMesaj() {
  const F = (r) => r[0] + ': ' + r[1], pr = R.parca.filter((r) => !/ağırlığı|^Boy çeşidi/.test(r[0])).map((r) => [r[0].replace(/ \(özel kesim[^)]*\)/, ' (özel kesim)'), r[1]]).map(F).join('\n'),
    kn = R.kon.filter((r) => !/^Toplam/.test(r[0])).map((r) => r[0].split(' ')[0] + ' × ' + parseInt(r[1], 10)).join(', '), bag = sec.paylas ? sec.paylas(R.kod, ADET) : location.href;
  return ['Merhaba, Kendin Tasarla ile hazırladığım tasarımı sipariş etmek istiyorum.', '', 'Ürün: ' + (R.ad || MODUL[TUR].ad), 'Ölçü: ' + R.olcu + (R.alt ? ' (' + R.alt + ')' : ''), 'Adet: ' + ADET, 'Tasarım kodu: ' + R.kod, 'Tasarımı aç: ' + bag, '', 'Parçalar:', pr, '', 'Konnektörler: ' + kn].concat(FP && FP.tamam ? ['', 'Fiyat: ' + TL(FP.birim * ADET) + (ADET > 1 ? ' (' + ADET + ' takım)' : '')] : []).join('\n');
}
['#bWa', '#mWa'].forEach((q) => { const b = $(q); if (b) b.addEventListener('click', () => { window.open('https://wa.me/' + WA_NO + '?text=' + encodeURIComponent(waMesaj()), '_blank', 'noopener'); if (sec.olay) try { sec.olay('tasarla_whatsapp', R.kod); } catch (e) {} }); });
$('#bPaylas').addEventListener('click', async () => { try { await navigator.clipboard.writeText(sec.paylas ? sec.paylas(R.kod, ADET) : location.href); toast('Tasarım bağlantısı kopyalandı'); } catch (e) { toast('Adres çubuğundaki bağlantıyı paylaşın'); } });
$('#bSifir').addEventListener('click', () => { P = { ...MODUL[TUR].varsayilan }; ADET = 1; hesap(true); panel(); gorunum('3b'); });
// Kurulum kılavuzu (PDF): kapakta gerçekçi 3B görünüm, içeride adım adım numaralı çizimler ve ölçüler (kilavuz.js)
$('#bFoy').addEventListener('click', async () => {
  const b = $('#bFoy'); if (b.disabled) return; b.disabled = true; toast('Kurulum kılavuzu hazırlanıyor…');
  try {
    TUT.forEach((t) => (t.visible = false)); ciz();
    const k = document.createElement('canvas'); k.width = cv.width; k.height = cv.height; const g = k.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, k.height);
    gr.addColorStop(0, '#c9dbe8'); gr.addColorStop(0.4, '#dfe8ec'); gr.addColorStop(1, '#e6ebe4'); g.fillStyle = gr; g.fillRect(0, 0, k.width, k.height); g.drawImage(cv, 0, 0);
    TUT.forEach((t) => (t.visible = true)); ciz();
    const { kilavuz } = await import('./kilavuz.js');
    const uyari = (BK.kutu || []).flat().filter((e) => e[0] === 'w' || (e[0] === 'h' && 0)).map((e) => e[1]), r = await kilavuz({ R, ad: R.ad || MODUL[TUR].ad, tur: TUR, uyari, paket: paketNotu(TUR), kapak: k, fiyat: FP && FP.tamam ? FP.birim : null, konAdi, insan });
    const url = URL.createObjectURL(r.blob), a = document.createElement('a'); a.href = url; a.download = r.dosya; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast(`Kurulum kılavuzu indirildi (${r.sayfa} sayfa)`);
  } catch (e) { console.error(e); toast('Kılavuz hazırlanamadı, lütfen tekrar deneyin'); }
  finally { b.disabled = false; }
});

/* ---------- 3B sahne ---------- */
const cv = $('#c3');
const RN = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
RN.setPixelRatio(Math.min(2, devicePixelRatio)); RN.outputEncoding = THREE.sRGBEncoding; RN.toneMapping = THREE.ACESFilmicToneMapping; RN.toneMappingExposure = 0.95;
RN.shadowMap.enabled = true; RN.shadowMap.type = THREE.PCFSoftShadowMap;
const SC = new THREE.Scene(), CAM = new THREE.PerspectiveCamera(30, 1, 10, 400000);
(function ortam() {
  const s = new THREE.Scene(), oda = new THREE.Mesh(new THREE.BoxGeometry(100, 60, 100), new THREE.MeshBasicMaterial({ color: 0x45484c, side: THREE.BackSide })); oda.position.y = 20; s.add(oda);
  const isik = (w, h, x, y, z, ry, rx, g) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(g, g, g), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  isik(50, 24, 0, 49, 0, 0, Math.PI / 2, 2.4); isik(24, 30, -49, 20, 10, Math.PI / 2, 0, 1.7); isik(30, 16, 40, 18, 49, 0, 0, 1.2); isik(16, 30, 49, 18, -20, -Math.PI / 2, 0, 0.9);
  SC.environment = new THREE.PMREMGenerator(RN).fromScene(s, 0.035).texture;
})();
const gunes = new THREE.DirectionalLight(0xffffff, 1.2); gunes.castShadow = true; gunes.shadow.mapSize.set(2048, 2048); gunes.shadow.bias = -0.0004; SC.add(gunes); SC.add(gunes.target);
SC.add(new THREE.HemisphereLight(0xffffff, 0xd8d4ca, 0.35));
// Bahçe: çimen zemin, uzakta sise karışan ufuk, çevrede ağaç ve çalılar
const doku = (w, h, ciz) => { const c = document.createElement('canvas'); c.width = w; c.height = h; ciz(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
let tohum = 11; const rnd = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
const cimen = doku(512, 512, (g, w, h) => { g.fillStyle = '#5c7a40'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const x = rnd() * w, y = rnd() * h, v = rnd(); g.fillStyle = v < 0.5 ? `rgba(${55 + v * 50},${88 + v * 60},${38 + v * 24},.55)` : `rgba(${105 + v * 35},${128 + v * 30},${70},.3)`; g.fillRect(x, y, 1 + rnd() * 2, 2 + rnd() * 4); } });
cimen.repeat.set(60, 60);
const ZEMIN = new THREE.Mesh(new THREE.CircleGeometry(90000, 64), new THREE.MeshStandardMaterial({ map: cimen, roughness: 0.95, metalness: 0 })); ZEMIN.rotation.x = -Math.PI / 2; ZEMIN.receiveShadow = true; SC.add(ZEMIN);
const SIS = 0xe6ebe4; SC.fog = new THREE.Fog(SIS, 26000, 75000);
const cakil = doku(256, 256, (g, w, h) => { g.fillStyle = '#b8b0a2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 150 + rnd() * 80; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 2.2, 0, 7); g.fill(); } });
const topDoku = doku(256, 256, (g, w, h) => { g.fillStyle = '#5b4332'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { const v = rnd(); g.fillStyle = `rgba(${60 + v * 50},${42 + v * 34},${30 + v * 22},.6)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const CAKIL = new THREE.MeshStandardMaterial({ map: cakil, roughness: 1 }), TOPRAK2 = new THREE.MeshStandardMaterial({ map: topDoku, roughness: 1 });
const GOVDE = new THREE.MeshStandardMaterial({ color: 0x5a4130, roughness: 0.9 }), YAPRAK = [0x3d6a2e, 0x4a7836, 0x355f2a, 0x527f3a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, envMapIntensity: 0.4 }));
const BITKI = [0x2f6a28, 0x3a7a2e, 0x467f33].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, envMapIntensity: 0.35 })), DOMATES = new THREE.MeshStandardMaterial({ color: 0xc8372d, roughness: 0.5 });
const ORTU_MAT = new THREE.MeshStandardMaterial({ color: 0xeef6f8, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
// Ağaç tacı: gürültüyle bozulmuş küre (yumuşak gölgeli), benekli yaprak dokusu; düz yüzlü "oyuncak" görünüm yok
const yaprakDoku = doku(256, 256, (g, w, h) => { g.fillStyle = '#4d6f34'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = v < 0.45 ? `rgba(${28 + v * 30},${52 + v * 40},${22 + v * 14},.7)` : `rgba(${96 + v * 50},${128 + v * 40},${62 + v * 20},.45)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 1.5 + rnd() * 3, 1 + rnd() * 2, rnd() * 3, 0, 7); g.fill(); } });
yaprakDoku.repeat.set(3, 3);
const TACLAR = [0, 1, 2].map((t) => { const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, v = new THREE.Vector3(), f = 2.3 + t * 0.6, o = t * 1.7;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * f + o) * Math.cos(v.y * f * 1.3 - o) * 0.5 + Math.sin(v.z * f * 2.1 + v.x * 3 + o) * 0.28 + Math.sin(v.y * 9 + v.z * 7 + o) * 0.07; v.multiplyScalar(1 + n * 0.32); if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.4; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g; });
const TAC_MAT = [0x5d7f3e, 0x6a8a45, 0x52763a, 0x77924a].map((c) => new THREE.MeshStandardMaterial({ color: c, map: yaprakDoku, roughness: 0.92, envMapIntensity: 0.25 }));
let CEVRE = null;
function cevre(kutu) {
  if (CEVRE) SC.remove(CEVRE); CEVRE = new THREE.Group(); SC.add(CEVRE); tohum = 23;
  const r0 = Math.max(kutu.W, kutu.D) * 1.1 + 7000, ag = new THREE.CylinderGeometry(70, 140, 1, 9), dal = new THREE.CylinderGeometry(25, 50, 1, 6);
  const agac = (x, z, h, i) => { const g = new THREE.Group(), cl = TAC_MAT[i % 4], gv = h * 0.42;
    const t = new THREE.Mesh(ag, GOVDE); t.scale.set(h / 3800, gv, h / 3800); t.position.y = gv / 2; t.castShadow = true; g.add(t);
    for (let k = 0; k < 3; k++) { const d = new THREE.Mesh(dal, GOVDE), a = rnd() * 6.28; d.scale.y = h * 0.25; d.position.set(Math.cos(a) * h * 0.06, gv + h * 0.05, Math.sin(a) * h * 0.06); d.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); g.add(d); }
    const n = 4 + ((rnd() * 3) | 0); for (let k = 0; k < n; k++) { const c = new THREE.Mesh(TACLAR[(i + k) % 3], cl), sc = h * (0.2 + rnd() * 0.1), a = (k / n) * 6.28 + rnd(), rr = k ? h * 0.16 : 0;
      c.scale.set(sc * (1 + rnd() * 0.3), sc * (0.8 + rnd() * 0.25), sc * (1 + rnd() * 0.3)); c.position.set(Math.cos(a) * rr, h * (0.62 + (k ? rnd() * 0.18 : 0.12)), Math.sin(a) * rr); c.rotation.y = rnd() * 6; c.castShadow = true; c.receiveShadow = true; g.add(c); }
    g.position.set(x, 0, z); g.rotation.y = rnd() * 6; CEVRE.add(g); };
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + rnd() * 0.3, r = r0 + rnd() * 6000; if (Math.sin(a) > 0.45 && r < r0 + 4000) continue; if (Math.cos(a - 4.09) > 0.9) continue; // kameranın önü ve yapının hemen arkası açık
    agac(Math.cos(a) * r, Math.sin(a) * r, 3200 + rnd() * 3200, i); }
  for (let i = 0; i < 34; i++) { const a = rnd() * Math.PI * 2, r = r0 + 9000 + rnd() * 9000; agac(Math.cos(a) * r, Math.sin(a) * r, 4500 + rnd() * 4000, i); } // arka sıra: ufuk çizgisi
  for (let i = 0; i < 22; i++) { const a = rnd() * Math.PI * 2, r = r0 - 1200 + rnd() * 5000; if (Math.sin(a) > 0.5 && r < r0 + 1500) continue; const c = new THREE.Mesh(TACLAR[i % 3], TAC_MAT[i % 4]), sc = 300 + rnd() * 380; c.scale.set(sc * 1.4, sc, sc * 1.25); c.position.set(Math.cos(a) * r, sc * 0.5, Math.sin(a) * r); c.rotation.y = rnd() * 6; c.castShadow = true; c.receiveShadow = true; CEVRE.add(c); }
}
// Sera: örtü (polikarbon görünümlü), çakıl taban, içte ekim sıraları ve fideler
function seraEkle(G, S) {
  const { W, L, profil } = S, d = 18, gr = new THREE.Group();
  if (ORTU_ACIK()) {
    const kenar = profil.slice(1, -1); // yan duvar + çatı çizgisi
    for (let i = 0; i < profil.length - 1; i++) { const [x0, y0] = profil[i], [x1, y1] = profil[i + 1]; if (y0 === 0 && y1 === 0) continue;
      const geo = new THREE.BufferGeometry(), v = [x0, y0, -d, x1, y1, -d, x1, y1, L + d, x0, y0, -d, x1, y1, L + d, x0, y0, L + d]; geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals(); gr.add(new THREE.Mesh(geo, ORTU_MAT)); }
    const sek = new THREE.Shape(profil.map(([x, y]) => new THREE.Vector2(x, y))); [-d, L + d].forEach((z) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(sek), ORTU_MAT); m.position.z = z; gr.add(m); });
  }
  const pad = new THREE.Mesh(new THREE.BoxGeometry(W + 900, 40, L + 900), CAKIL); pad.position.set(W / 2, 20 - 30, L / 2); pad.receiveShadow = true; gr.add(pad);
  // ekim sıraları: kenarlarda iki masura, ortada yol
  const yol = W < 2000 ? W * 0.28 : Math.min(700, W * 0.3), kn = W < 2000 ? 170 : 250, ara = W < 2000 ? 50 : 100, sira = [[kn, W / 2 - yol / 2 - ara], [W / 2 + yol / 2 + ara, W - kn]].filter(([a, b]) => b - a > 200);
  const fide = new THREE.SphereGeometry(1, 9, 7);
  sira.forEach(([a, b], si) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, 120, L - 400), TOPRAK2); m.position.set((a + b) / 2, 50, L / 2); m.receiveShadow = true; gr.add(m);
    const kol = Math.max(1, Math.round((b - a) / 380)); for (let z = 400; z < L - 350; z += 420) for (let k = 0; k < kol; k++) { const x = a + ((k + 0.5) * (b - a)) / kol, h = 180 + rnd() * 220;
      for (let j = 0; j < 4; j++) { const f = new THREE.Mesh(fide, BITKI[(j + k + si) % 3]), r = 70 + rnd() * 50, aa = (j / 4) * 6.28 + rnd(); f.scale.set(r, r * (0.7 + rnd() * 0.5), r); f.position.set(x + Math.cos(aa) * 55 * (j ? 1 : 0), 110 + h * (j ? 0.45 : 0.75), z + Math.sin(aa) * 55 * (j ? 1 : 0)); f.castShadow = true; gr.add(f); }
      if (rnd() < 0.35) { const t = new THREE.Mesh(fide, DOMATES); t.scale.setScalar(30); t.position.set(x + 70, 140 + h * 0.4, z + 50); gr.add(t); } } });
  G.add(gr);
}
const ORTU_ACIK = () => ORTU_ON;
const GALV = new THREE.MeshStandardMaterial({ color: 0xd3d8dd, metalness: 0.95, roughness: 0.28 });
const KAPI = new THREE.MeshStandardMaterial({ color: 0xc7cdd3, metalness: 0.9, roughness: 0.32 });
const KONM = new THREE.MeshStandardMaterial({ color: 0x8d949b, metalness: 0.9, roughness: 0.4 });
const CIZGI = new THREE.LineBasicMaterial({ color: 0x2a2f36 });
const ahsap = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#c9a877'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 140; i++) { const y = Math.random() * 256; g.strokeStyle = `rgba(${Math.random() < 0.5 ? '120,84,44' : '235,210,170'},${Math.random() * 0.12})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 3); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
const TABLA = new THREE.MeshStandardMaterial({ map: ahsap, roughness: 0.78 });
const kesit = (() => { const yk = (s, r) => { const p = new THREE.Shape(), h = s / 2; p.moveTo(-h + r, -h); p.lineTo(h - r, -h); p.quadraticCurveTo(h, -h, h, -h + r); p.lineTo(h, h - r); p.quadraticCurveTo(h, h, h - r, h); p.lineTo(-h + r, h); p.quadraticCurveTo(-h, h, -h, h - r); p.lineTo(-h, -h + r); p.quadraticCurveTo(-h, -h, -h + r, -h); return p; }; const d = yk(30, 3.5); d.holes.push(new THREE.Path(yk(27.6, 2.2).getPoints(4))); return d; })();
const gCache = new Map(), boru = (L) => { const k = Math.round(L); if (!gCache.has(k)) { const g = new THREE.ExtrudeGeometry(kesit, { depth: k, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -k / 2); gCache.set(k, g); } return gCache.get(k); };
const KUP = new THREE.BoxGeometry(46, 46, 46), TAB = new THREE.BoxGeometry(1, 1, 1);
let G = null, OL = null, etiket = [], OLCU = true, kutu = null;
function sahne(yeni) {
  if (G) SC.remove(G); G = new THREE.Group(); SC.add(G);
  const Y = R.yapi, bb = new THREE.Box3(), v = new THREE.Vector3();
  for (const u of Y.uye) { const a = new THREE.Vector3(...u.a), b = new THREE.Vector3(...u.b); a.y = Math.max(0, a.y); b.y = Math.max(0, b.y); bb.expandByPoint(a); bb.expandByPoint(b);
    const L = a.distanceTo(b) - 20; if (L < 5) continue; const m = new THREE.Mesh(boru(L), u.k === 'd' ? KAPI : GALV); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.castShadow = true; m.receiveShadow = true; G.add(m); }
  for (const d of Y.dugum) { if (d.p[1] < 0) continue; const c = new THREE.Mesh(KUP, KONM); c.position.set(...d.p); c.castShadow = true; G.add(c); }
  for (const t of R.tabla || []) { const m = new THREE.Mesh(TAB, TABLA); m.scale.set(t.w, t.h, t.d); m.position.set(t.x + t.w / 2, t.y + t.h / 2, t.z + t.d / 2); m.castShadow = m.receiveShadow = true; G.add(m); bb.expandByPoint(v.set(t.x + t.w, t.y + t.h, t.z + t.d)); }
  if (R.yatak) { const { G: BG, cift, renk } = R.yatak, x2 = cift > 1 ? R.yapi.uye.reduce((m, u) => Math.max(m, u.a[0], u.b[0]), 0) + 1.49 : 0;
    for (let i = 0; i < cift; i++) { const y = yatakMesh(BG, renk); y.position.x = i ? x2 : 0; G.add(y); bb.expandByPoint(v.set(y.position.x + BG.Wo, 300, BG.Lo)); bb.expandByPoint(v.set(y.position.x, 0, 0)); } }
  if (R.adet > 1) { const g0 = G.children.slice(); for (let i = 1; i < R.adet; i++) g0.forEach((o) => { const c = o.clone(); c.position.x += i * R.aralik; G.add(c); }); bb.max.x += (R.adet - 1) * R.aralik; }
  const c = bb.getCenter(new THREE.Vector3()); G.position.set(-c.x, 0, -c.z); kutu = { W: bb.max.x - bb.min.x + 30, D: bb.max.z - bb.min.z + 30, H: bb.max.y + 15, x0: bb.min.x - 15, z0: bb.min.z - 15 };
  if (R.sera) seraEkle(G, R.sera);
  aksesuar(G, bb); tutamacKur(bb);
  cevre(kutu); $('#tOrtu').hidden = !R.sera;
  const r = Math.max(kutu.W, kutu.D, kutu.H); gunes.position.set(r * 0.35, r * 3, r * 0.5); const sc = gunes.shadow.camera; sc.left = sc.bottom = -r * 1.2; sc.right = sc.top = r * 1.2; sc.near = 10; sc.far = r * 6; sc.updateProjectionMatrix();
  if (yeni) { const b = kok.querySelector('#gorunum button.on'), gg = GOR[(b && b.dataset.g) || '3b']; H0.t = gg[0] + yonEk(); }
  olculer(); if (!SURUK) sigdir(yeni); iste();
}
// Modüler sebze yatağı: dış yüz yolundan 30 cm duvar, içinde toprak
const YCOL = { b: 0xd9c7a1, g: 0xb6babd }, TOPRAK = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 });
function yatakMesh(BG, renk) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: YCOL[renk] || YCOL.b, roughness: 0.62, metalness: 0.05 });
  for (const l of BG.loops) {
    const dis = new THREE.Shape(l.S.map((p) => new THREE.Vector2(p.x, p.z))), ic = l.S.map((p) => new THREE.Vector2(p.x - p.nx * 26, p.z - p.nz * 26));
    dis.holes.push(new THREE.Path(ic));
    const geo = new THREE.ExtrudeGeometry(dis, { depth: 300, bevelEnabled: false, curveSegments: 2 }); geo.rotateX(Math.PI / 2); geo.translate(0, 300, 0);
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
    const tg = new THREE.ShapeGeometry(new THREE.Shape(ic)); tg.rotateX(Math.PI / 2); tg.translate(0, 270, 0); const t = new THREE.Mesh(tg, TOPRAK); t.receiveShadow = true; g.add(t);
  }
  return g;
}
function olculer() {
  if (OL) G.remove(OL); OL = new THREE.Group(); G.add(OL); etiket = [];
  const { W, D, H, x0, z0 } = kutu, o = Math.max(150, Math.max(W, H) * 0.07), p = [], fm = (x) => F1((x / 1000).toFixed(2)) + ' m';
  const cz = (a, b, e, y) => { p.push(...a, ...b); for (const q of [a, b]) p.push(...q, q[0] + e[0], q[1] + e[1], q[2] + e[2]); etiket.push({ p: new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), y }); };
  cz([x0, 0, z0 + D + o], [x0 + W, 0, z0 + D + o], [0, 0, -o + 20], fm(W)); cz([x0 + W + o, 0, z0], [x0 + W + o, 0, z0 + D], [-o + 20, 0, 0], fm(D)); cz([x0 - o, 0, z0 + D], [x0 - o, H, z0 + D], [o - 20, 0, 0], fm(H));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); OL.add(new THREE.LineSegments(g, CIZGI)); OL.visible = OLCU;
  $('#etiketler').innerHTML = etiket.map((e) => `<div class="etiket num">${e.y}</div>`).join('');
}
$('#tOrtu').addEventListener('click', (e) => { ORTU_ON = !ORTU_ON; e.currentTarget.classList.toggle('on', ORTU_ON); sahne(false); });
// ---------- Gerçekçi sahne nesneleri: araç, kovan, cihaz, panel, ürün, insan (ölçek için) ----------
const MT = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.05 }, o || {}));
const KUTU1 = new THREE.BoxGeometry(1, 1, 1), KURE = new THREE.SphereGeometry(1, 20, 14), SIL = new THREE.CylinderGeometry(1, 1, 1, 24), KONI = new THREE.ConeGeometry(1, 1, 16), IKO = new THREE.IcosahedronGeometry(1, 0);
function parca(g, geo, mat, sx, sy, sz, x, y, z) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }
function yanKesit(L, H, nok, derin, bevel) { // yandan görünüş çizgisi (L ve H oranı) → kalınlığı derin olan gövde
  const s = new THREE.Shape(); nok.forEach(([x, y], i) => (i ? s.lineTo(x * L, y * H) : s.moveTo(x * L, y * H)));
  const g = new THREE.ExtrudeGeometry(s, { depth: derin - 2 * bevel, bevelEnabled: !!bevel, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 6 }); g.translate(0, 0, -(derin - 2 * bevel) / 2); g.computeVertexNormals(); return g;
}
function arac(car) { // binek araç: boyalı gövde, camlar, farlar, tekerlekler; boyu z yönünde
  const g = new THREE.Group(), boya = MT([0x8d949b, 0x2c3e55, 0x4a4f55][car.i] || 0x8d949b, { metalness: 0.6, roughness: 0.32 }), cam = MT(0x16202a, { metalness: 0.3, roughness: 0.08 }), lastik = MT(0x1a1a1a, { roughness: 0.92 }), jant = MT(0xd2d6da, { metalness: 0.85, roughness: 0.28 }), plast = MT(0x232528, { roughness: 0.7 });
  const { L, W, H } = car, suv = car.i === 2, hb = car.i === 0;
  const govde = suv ? [[-0.5, 0.2], [-0.5, 0.62], [-0.47, 0.95], [0.16, 0.97], [0.3, 0.66], [0.48, 0.6], [0.5, 0.5], [0.5, 0.2]]
    : hb ? [[-0.5, 0.2], [-0.5, 0.58], [-0.45, 0.92], [0.12, 0.97], [0.27, 0.62], [0.47, 0.55], [0.5, 0.45], [0.5, 0.2]]
    : [[-0.5, 0.2], [-0.5, 0.52], [-0.45, 0.58], [-0.3, 0.6], [-0.2, 0.95], [0.12, 0.97], [0.28, 0.62], [0.47, 0.55], [0.5, 0.45], [0.5, 0.2]];
  const yan = suv ? [[-0.44, 0.65], [-0.43, 0.9], [0.14, 0.92], [0.27, 0.66]] : hb ? [[-0.43, 0.6], [-0.41, 0.88], [0.11, 0.92], [0.24, 0.63]] : [[-0.27, 0.62], [-0.19, 0.9], [0.11, 0.92], [0.25, 0.63]];
  const b = new THREE.Mesh(yanKesit(L, H, govde, W * 0.94, 45), boya); b.castShadow = b.receiveShadow = true; g.add(b);
  const c = new THREE.Mesh(yanKesit(L, H, yan, W * 0.94 + 14, 0), cam); g.add(c);
  const on = govde.slice(govde.findIndex((q) => q[1] > 0.9)).filter((q) => q[0] > 0 && q[1] > 0.6).map(([x, y]) => [x + 0.006, y + 0.006]); // ön cam
  if (on.length >= 2) { const s = [...on, [on[on.length - 1][0] - 0.02, on[on.length - 1][1] - 0.03], [on[0][0] - 0.02, on[0][1] - 0.03]]; g.add(new THREE.Mesh(yanKesit(L, H, s, W * 0.82, 0), cam)); }
  const k0 = govde.find((q) => q[0] < 0 && q[1] > 0.85), k1 = govde.filter((q) => q[0] === -0.5 || (q[0] < -0.4 && q[1] > 0.5)).pop(); // arka cam
  if (k0 && hb) g.add(new THREE.Mesh(yanKesit(L, H, [[-0.506, 0.64], [k0[0] - 0.008, k0[1] - 0.04], [k0[0] + 0.02, k0[1] - 0.06], [-0.49, 0.64]], W * 0.8, 0), cam));
  [-1, 1].forEach((s) => { parca(g, KUTU1, MT(0xf4f1e6, { emissive: 0x3a3a30 }), 40, 70, 300, L * 0.5 + 8, H * 0.5, s * W * 0.31); parca(g, KUTU1, MT(0xb3201c, { emissive: 0x300000 }), 40, 70, 260, -L * 0.5 - 8, H * 0.5, s * W * 0.32); });
  parca(g, KUTU1, plast, 60, 120, W * 0.9, L * 0.5 + 10, H * 0.27, 0); parca(g, KUTU1, plast, 60, 120, W * 0.9, -L * 0.5 - 10, H * 0.27, 0);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const x = sx * L * 0.33, z = sz * (W / 2 - 115); const t = parca(g, SIL, lastik, 330, 215, 330, x, 330, z); t.rotation.x = Math.PI / 2; const j = parca(g, SIL, jant, 210, 222, 210, x, 330, z); j.rotation.x = Math.PI / 2; }));
  g.rotation.y = -Math.PI / 2; return g;
}
function insan() { // 1,75 m ölçek figürü
  const g = new THREE.Group(), ten = MT(0xd2a68a, { roughness: 0.7 }), giy = MT(0x41566b, { roughness: 0.85 }), pan = MT(0x2c3038, { roughness: 0.9 }), ayk = MT(0x1e1e1e), sac = MT(0x2b211b, { roughness: 0.9 });
  [-1, 1].forEach((s) => { parca(g, new THREE.CylinderGeometry(1, 0.8, 1, 16), pan, 62, 860, 66, s * 95, 470, 0); parca(g, KUTU1, ayk, 110, 70, 260, s * 95, 35, 40); });
  parca(g, new THREE.CylinderGeometry(1, 0.85, 1, 24), giy, 205, 560, 125, 0, 1170, 0); parca(g, KURE, giy, 205, 90, 125, 0, 1450, 0); parca(g, KURE, pan, 175, 60, 115, 0, 900, 0);
  [-1, 1].forEach((s) => { const k = parca(g, new THREE.CylinderGeometry(1, 0.8, 1, 14), giy, 52, 600, 52, s * 232, 1160, 0); k.rotation.z = s * 0.07; parca(g, KURE, ten, 48, 60, 48, s * 252, 840, 0); });
  parca(g, SIL, ten, 50, 90, 50, 0, 1500, 0); parca(g, KURE, ten, 100, 118, 108, 0, 1625, 0); parca(g, KURE, sac, 104, 70, 112, 0, 1680, -8); return g;
}
function tavuk(beyaz) { const h = new THREE.Group(), tuy = MT(beyaz ? 0xf1ebdf : 0xa45e33, { roughness: 0.9 }), kir = MT(0xc8372d), sari = MT(0xe0a22b);
  parca(h, KURE, tuy, 130, 125, 175, 0, 230, 0); const k = parca(h, KONI, tuy, 95, 170, 70, 0, 330, -150); k.rotation.x = -0.6;
  parca(h, KURE, tuy, 62, 70, 62, 0, 375, 150); parca(h, KUTU1, kir, 14, 55, 60, 0, 445, 150); parca(h, KURE, kir, 14, 26, 14, 0, 320, 196); const g = parca(h, KONI, sari, 16, 40, 16, 0, 375, 222); g.rotation.x = Math.PI / 2;
  [-1, 1].forEach((s) => parca(h, SIL, sari, 9, 120, 9, s * 45, 60, 10)); return h; }
function aksesuar(G, bb) {
  const g = new THREE.Group(), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  if (TUR === 'O') { const c = OGCAR[P.ogC] || OGCAR[1], a = arac({ ...c, i: +P.ogC }); a.position.set(cx, 0, cz); g.add(a); }
  if (TUR === 'A') { // Langstroth kovanlar: gövde, ballık, çatı, uçuş deliği
    const ys = P.ark == 2 ? [0, 480, 1505] : [0, 480], Wst = P.arw * 625 + 30, Dst = 410, renk = [0xf3efe4, 0xe9d8a6, 0xcfe0e6, 0xf3efe4].map((c) => MT(c, { roughness: 0.75 })), cati = MT(0x9aa0a6, { metalness: 0.7, roughness: 0.35 }), giris = MT(0x2a2016);
    let q = 0; for (let i = 0; i < P.arn; i++) { const ox = (i % 4) * (Wst + 1000) + 15, oz = Math.floor(i / 4) * (Dst + 3000) + 15;
      for (let k = 1; k < ys.length; k++) for (let j = 0; j < P.arw; j++) { const x = ox + j * 625 + 312.5, z = oz + 190, y = ys[k] + 15, m = renk[q++ % 4];
        parca(g, KUTU1, m, 413, 245, 505, x, y + 122, z); parca(g, KUTU1, m, 413, 165, 505, x, y + 250 + 82, z); parca(g, KUTU1, MT(0x6b4a2e), 418, 6, 510, x, y + 247, z);
        parca(g, KUTU1, cati, 455, 55, 550, x, y + 415 + 28, z); parca(g, KUTU1, giris, 240, 16, 8, x, y + 14, z + 253); } } }
  if (TUR === 'L') { const d = KLD[P.klD] || KLD[1], m = MT(0xeceee9, { roughness: 0.45 }), siyah = MT(0x2a2d31, { roughness: 0.8 }), y0 = 20; parca(g, KUTU1, m, d.W, d.H, d.D, cx, y0 + d.H / 2, cz);
    const r = Math.min(d.W * 0.55, d.H) * 0.4; [-1, 1].forEach((s) => { const f = parca(g, SIL, siyah, r, 6, r, cx - d.W * 0.14, y0 + d.H * 0.5, cz + s * (d.D / 2 + 2)); f.rotation.x = Math.PI / 2; const t = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.06, 8, 40), m); t.position.set(cx - d.W * 0.14, y0 + d.H * 0.5, cz + s * (d.D / 2 + 6)); g.add(t);
      for (let i = -2; i <= 2; i++) parca(g, KUTU1, m, 8, r * 2, 8, cx - d.W * 0.14 + i * r * 0.36, y0 + d.H * 0.5, cz + s * (d.D / 2 + 6)); });
    parca(g, KUTU1, MT(0xd6d8d4), d.W * 0.22, d.H * 0.8, 6, cx + d.W * 0.34, y0 + d.H * 0.5, cz + d.D / 2 + 2); }
  if (TUR === 'U') { const d = CKD[P.ckD] || CKD[1], m = MT(d.W > 900 ? 0x5b6166 : 0x2f6b3c, { roughness: 0.55 }), siyah = MT(0x1c1c1c);
    const kv = parca(g, new THREE.CylinderGeometry(0.5, 0.46, 1, 4, 1), m, d.W * 1.36, d.H - 70, d.D * 1.32, cx, (d.H - 70) / 2 + 20, cz); kv.rotation.y = Math.PI / 4;
    parca(g, KUTU1, m, d.W + 20, 45, d.D + 30, cx, d.H - 25, cz); parca(g, KUTU1, m, d.W * 0.7, 40, 40, cx, d.H - 60, cz - d.D / 2 - 30);
    if (d.W < 900) [-1, 1].forEach((s) => { const t = parca(g, SIL, siyah, 100, 50, 100, cx + s * (d.W / 2 - 40), 100, cz - d.D / 2 + 60); t.rotation.z = Math.PI / 2; }); }
  if (TUR === 'P') { const v = GPV[P.gpV] || GPV[1], hB = 325, W = v.X + 30, pitch = Math.max(W + 30, v.pl) + 60, cam = MT(0x1b2b4a, { metalness: 0.5, roughness: 0.15 }), cer = MT(0xc9ced3, { metalness: 0.85, roughness: 0.3 }), hat = MT(0x8fa3c4, { metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < P.gpN; i++) for (let k = 0; k < v.pn; k++) { const tm = 60 + k * v.pw + v.pw / 2, p = new THREE.Group();
      parca(p, KUTU1, cer, v.pl, 35, v.pw - 10, 0, 0, 0); parca(p, KUTU1, cam, v.pl - 36, 8, v.pw - 46, 0, 18, 0);
      for (let a = 1; a < 6; a++) parca(p, KUTU1, hat, 4, 2, v.pw - 50, -v.pl / 2 + 18 + (a * (v.pl - 36)) / 6, 23, 0);
      p.rotation.x = -Math.PI / 4; p.position.set(i * pitch + W / 2, hB + 50 + tm * Math.SQRT1_2, 25 + tm * Math.SQRT1_2); g.add(p); } }
  if (TUR === 'Y') { tohum = 5; const L = P.kyL * 10 - 60, W = P.kyW * 10 - 60, y = P.kyH * 10 - 25 + 20, renk = [MT(0xb8241c, { roughness: 0.5 }), MT(0xd98a1e, { roughness: 0.55 }), MT(0x7a2a1e, { roughness: 0.6 })], N = Math.min(260, Math.floor((L * W) / 14000));
    for (let i = 0; i < N; i++) { const r = 34 + rnd() * 14, m = parca(g, SIL, renk[i % 3], r, 7, r * (0.85 + rnd() * 0.3), 40 + rnd() * (L - 60), y, 40 + rnd() * (W - 60)); m.rotation.y = rnd() * 3; m.castShadow = false; } }
  if (TUR === 'G') { tohum = 9; const ciceK = MT(0xc9314b, { roughness: 0.6 }), ciceP = MT(0xf2a7b5, { roughness: 0.6 }); R.yapi.uye.forEach((u) => { if (Math.abs(u.a[1] - u.b[1]) < 5 && u.a[1] < 200) return; const n = Math.max(2, Math.round(Math.hypot(u.b[0] - u.a[0], u.b[1] - u.a[1], u.b[2] - u.a[2]) / 170));
      for (let i = 0; i < n; i++) { const t = (i + rnd()) / n, y = u.a[1] + (u.b[1] - u.a[1]) * t; if (rnd() < (y < 250 ? 0.7 : 0.4)) continue; const r = 36 + rnd() * 30, x = u.a[0] + (u.b[0] - u.a[0]) * t + (rnd() - 0.5) * 50, z = u.a[2] + (u.b[2] - u.a[2]) * t + (rnd() - 0.5) * 50;
        const m = parca(g, IKO, YAPRAK[(rnd() * 4) | 0], r, r * 0.75, r, x, Math.max(40, y), z); m.rotation.set(rnd() * 3, rnd() * 3, 0); if (rnd() < 0.12) parca(g, KURE, rnd() < 0.5 ? ciceK : ciceP, 22, 18, 22, x + (rnd() - 0.5) * 60, y + r * 0.6, z + (rnd() - 0.5) * 60); } }); }
  if (TUR === 'J') { tohum = 3; const n = Math.min(9, 3 * P.hxN); for (let i = 0; i < n; i++) { const h = tavuk(i % 3 !== 2); h.position.set(bb.min.x + 350 + rnd() * (bb.max.x - bb.min.x - 700), 0, bb.min.z + 450 + rnd() * (bb.max.z - bb.min.z - 900)); h.rotation.y = rnd() * 6.28; g.add(h); } }
  if (TUR === 'D' && P.msR) { const L = P.msL * 10, W = P.msW * 10, saksi = MT(0xb5603a, { roughness: 0.8 }); for (let x = 300; x < L - 200; x += 520) { parca(g, new THREE.CylinderGeometry(1, 0.78, 1, 20), saksi, 115, 190, 115, x, 225 + 43 + 95, W * 0.45); for (let k = 0; k < 5; k++) { const m = parca(g, IKO, BITKI[k % 3], 85, 70, 85, x + Math.cos(k * 1.3) * 70, 225 + 43 + 230 + (k % 2) * 60, W * 0.45 + Math.sin(k * 1.3) * 70); m.rotation.y = k; } } }
  if (['O', 'S', 'E', 'N', 'G', 'J', 'X', 'Z', 'K', 'Q', 'F', 'W', 'C', 'R'].includes(TUR)) { const h = insan(); h.position.set(bb.max.x + 900, 0, bb.min.z + Math.min(900, (bb.max.z - bb.min.z) / 2)); h.rotation.y = -0.6; g.add(h); }
  G.add(g);
}
// ---------- Ekranda boyutlandırma: kenardaki tutamaçları sürükle ----------
// [parametre, bir adımın mm karşılığı, adım]; eksen x: uzunluk (sağ), z: derinlik/bölüm, y: yükseklik
const TUTAM = { D: { x: ['msL', 100, 10], z: ['msW', 100, 10], y: ['msH', 100, 10] }, Y: { x: ['kyL', 100, 10], z: ['kyW', 100, 10], y: ['kyH', 100, 10] },
  S: { z: ['n', () => (P.w === 'F' ? 775 : 1025), 1] }, E: { z: ['lyN', () => (P.lyH ? 2025 : 1525), 1] }, N: { z: ['asN', 1225, 1] }, J: { z: ['hxN', 1025, 1] }, G: { z: ['gkN', 775, 1] }, O: { z: ['ogN', 1525, 1] }, Z: { z: ['zdB', 260, 1] }, A: { x: ['arn', 2600, 1] },
  Q: { x: ['qgw', 1025, 1], z: ['qgl', 1025, 1] }, F: { x: ['kfw', 625, 1], z: ['kfp', 625, 1] }, W: { z: ['odn', 775, 1] }, C: { z: ['cqn', () => CQD[P.cqd] + 30, 1] }, K: () => (P.ks === 'H' ? null : { z: ['kn', 1025, 1] }), R: () => (P.rfo ? null : { x: ['rfb', () => RFD[P.rfd] + 30, 1] }) };
const tutam = () => { const t = TUTAM[TUR]; return typeof t === 'function' ? t() : t; };
const TUT_MAT = new THREE.MeshStandardMaterial({ color: 0x1f6b3a, roughness: 0.35, metalness: 0.1, emissive: 0x0b2a16 }), TUT_HALKA = new THREE.MeshBasicMaterial({ color: 0xffffff });
let TUT = [], SURUK = null;
function tutamacKur(bb) {
  TUT = []; const T = tutam(); if (!T) return;
  const g = new THREE.Group(), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, H = bb.max.y, r = Math.max(55, Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, H) * 0.016);
  const yer = { x: [bb.max.x + r * 3, Math.min(H / 2, 700), cz], z: [cx, Math.min(H / 2, 700), bb.max.z + r * 3], y: [cx, H + r * 3, cz] }, yon = { x: [1, 0, 0], z: [0, 0, 1], y: [0, 1, 0] };
  for (const ek of Object.keys(T)) { const t = new THREE.Group(); t.position.set(...yer[ek]);
    const k = new THREE.Mesh(KURE, TUT_MAT); k.scale.setScalar(r); t.add(k);
    [1, -1].forEach((sg) => { const o = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 1.1, 16), TUT_MAT), d = yon[ek]; o.position.set(d[0] * sg * r * 1.9, d[1] * sg * r * 1.9, d[2] * sg * r * 1.9); o.lookAt(o.position.clone().multiplyScalar(2)); o.rotateX(Math.PI / 2); t.add(o); });
    const h = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.12, 8, 32), TUT_HALKA); h.lookAt(new THREE.Vector3(1, 1, 1)); t.add(h);
    t.userData = { ek, yon: yon[ek] }; g.add(t); TUT.push(t); }
  G.add(g);
}
const RAY = new THREE.Raycaster(), _m = new THREE.Vector2();
function tutamacBul(e) { if (!TUT.length) return null; const r = cv.getBoundingClientRect(); _m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); RAY.setFromCamera(_m, CAM);
  const h = RAY.intersectObjects(TUT, true)[0]; if (!h) return null; let o = h.object; while (o && !o.userData.ek) o = o.parent; return o; }
function eksenPiksel(t) { // eksen boyunca 100 mm'nin ekrandaki karşılığı (piksel vektörü)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), w = cv.clientWidth, h = cv.clientHeight; t.getWorldPosition(a); b.copy(a).add(new THREE.Vector3(...t.userData.yon).multiplyScalar(100));
  a.project(CAM); b.project(CAM); return [((b.x - a.x) / 2) * w, (-(b.y - a.y) / 2) * h]; }
function surukle(e) {
  const S = SURUK, [k, mmf, st] = tutam()[S.ek], mm = typeof mmf === 'function' ? mmf() : mmf, dx = e.clientX - S.x0, dy = e.clientY - S.y0, px = S.px, l2 = px[0] * px[0] + px[1] * px[1] || 1;
  const dmm = ((dx * px[0] + dy * px[1]) / l2) * 100, c = KONTROL[TUR].find((q) => q.k === k), lm = c.t === 'say' ? lim(c) : [Math.min(...c.d.map((q) => +q[0])), Math.max(...c.d.map((q) => +q[0]))];
  const yeni = Math.min(lm[1], Math.max(lm[0], S.v0 + Math.round(dmm / mm) * st));
  if (yeni !== P[k]) { P[k] = yeni; hesap(); c.t === 'say' ? yaz() : panel(); }
}
const TAM = $('#tTam'); if (TAM) TAM.addEventListener('click', () => { const v = $('#viewer'), on = !v.classList.contains('tam'); v.classList.toggle('tam', on); TAM.classList.toggle('on', on); setTimeout(() => { sigdir(false); iste(); }, 30); });
$('#tOlcu').addEventListener('click', (e) => { OLCU = !OLCU; e.currentTarget.classList.toggle('on', OLCU); OL.visible = OLCU; $('#etiketler').style.display = OLCU ? '' : 'none'; iste(); });
const K = { t: 0.62, f: 0.36, z: 1 }, H0 = { t: 0.62, f: 0.36, z: 1 }; let mesafe = 4000, merkezY = 600;
const GOR = { '3b': [0.62, 0.36], on: [0, 0.03], yan: [Math.PI / 2, 0.03], ust: [0, 1.48] };
function sigdir(ani) { const { W, D, H } = kutu, yar = 0.5 * Math.hypot(W + 300, H + 200, D + 300), r = cv.clientWidth / Math.max(1, cv.clientHeight), fov = (CAM.fov * Math.PI) / 180, yatay = 2 * Math.atan(Math.tan(fov / 2) * r);
  mesafe = (yar / Math.sin(Math.min(fov, yatay) / 2)) * 1.02; merkezY = H / 2; if (ani) Object.assign(K, H0); }
const yonEk = () => (TUR === 'P' ? Math.PI : 0);
function gorunum(g) { const [t, f] = GOR[g]; H0.t = t + yonEk(); H0.f = f; H0.z = 1; kok.querySelectorAll('#gorunum button').forEach((b) => b.classList.toggle('on', b.dataset.g === g)); iste(); }
$('#gorunum').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) gorunum(b.dataset.g); });
const ptr = new Map(); let son = null, pinch = 0;
cv.addEventListener('pointerdown', (e) => { const tt = ptr.size === 0 ? tutamacBul(e) : null; if (tt) { cv.setPointerCapture(e.pointerId); const k = tutam()[tt.userData.ek][0]; SURUK = { id: e.pointerId, ek: tt.userData.ek, x0: e.clientX, y0: e.clientY, v0: +P[k], px: eksenPiksel(tt) }; cv.classList.add('surukle'); return; }
  cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); cv.classList.add('surukle'); son = [e.clientX, e.clientY]; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
cv.addEventListener('pointermove', (e) => { if (SURUK && e.pointerId === SURUK.id) { surukle(e); return; } if (!ptr.size && TUT.length && e.pointerType === 'mouse') { cv.style.cursor = tutamacBul(e) ? 'ew-resize' : ''; } if (!ptr.has(e.pointerId)) return; ptr.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) H0.z = Math.min(2.2, Math.max(0.35, H0.z * (pinch / d))); pinch = d; iste(); return; }
  H0.t -= (e.clientX - son[0]) / 180; H0.f = Math.min(1.5, Math.max(-0.05, H0.f + (e.clientY - son[1]) / 220)); son = [e.clientX, e.clientY]; kok.querySelectorAll('#gorunum button').forEach((b) => b.classList.remove('on')); iste(); });
const birak = (e) => { if (SURUK && e.pointerId === SURUK.id) { SURUK = null; cv.classList.remove('surukle'); sigdir(false); iste(); return; } ptr.delete(e.pointerId); if (!ptr.size) cv.classList.remove('surukle'); pinch = 0; if (ptr.size === 1) son = [...ptr.values()][0]; };
cv.addEventListener('pointerup', birak); cv.addEventListener('pointercancel', birak);
cv.addEventListener('wheel', (e) => { e.preventDefault(); H0.z = Math.min(2.2, Math.max(0.35, H0.z * (e.deltaY > 0 ? 1.1 : 0.91))); iste(); }, { passive: false });
let calis = false; function iste() { if (!calis) { calis = true; requestAnimationFrame(dongu); } }
function dongu() { let fark = 0; for (const k of ['t', 'f', 'z']) { const d = H0[k] - K[k]; K[k] += d * 0.18; fark = Math.max(fark, Math.abs(d)); } ciz(); if (fark > 0.0005) requestAnimationFrame(dongu); else { Object.assign(K, H0); ciz(); calis = false; } }
const _v = new THREE.Vector3();
function ciz() {
  const w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * RN.getPixelRatio()) || cv.height !== Math.round(h * RN.getPixelRatio())) { RN.setSize(w, h, false); CAM.aspect = w / h; CAM.updateProjectionMatrix(); }
  // Sis ve görüş uzaklığı kameraya göre: uzaklaştırınca büyük yapılar (10 bölüm sera) sise ya da görüş sınırına girip kaybolmasın
  const m = mesafe * K.z; SC.fog.near = m + 18000; SC.fog.far = m + 80000; CAM.position.set(Math.sin(K.t) * Math.cos(K.f) * m, merkezY + Math.sin(K.f) * m, Math.cos(K.t) * Math.cos(K.f) * m); CAM.lookAt(0, merkezY, 0); RN.render(SC, CAM);
  if (OLCU) { const el = $('#etiketler').children; G.updateMatrixWorld(); etiket.forEach((e, i) => { _v.copy(e.p).applyMatrix4(G.matrixWorld).project(CAM); el[i].style.left = ((_v.x + 1) / 2) * w + 'px'; el[i].style.top = ((1 - _v.y) / 2) * h + 'px'; }); }
}
addEventListener('resize', () => { if (kok.isConnected !== false) { sigdir(false); iste(); } });

// Açılış: bağımsız sayfada adres çubuğundaki koddan (#HG-D1-…~2), panelde sec.kod'dan
  // Model sayfasından gelince ürün adresinden ölçü tahmini (ör. bahce-kemeri-kesik-cati-2-bolum → kesik çatı, 2 bölüm)
  function tahmin(m, sl) {
    const o = {}, sy = (re) => { const x = sl.match(re); return x ? +x[1].replace('-', '.') : null; };
    if (m === 'G') { if (/kesik/.test(sl)) o.gkR = 1; const b = sy(/(\d)-bolum/); if (b) o.gkN = b; }
    if (m === 'A') { const k = sy(/-(\d)-l[iu]-/); if (k) o.arw = k; if (/2-katli/.test(sl)) o.ark = 2; }
    if (m === 'U') { const L = sy(/-(\d+)-l-/), i = [120, 240, 360, 400, 770, 1100].indexOf(L); if (i >= 0) o.ckD = i; if (/240-360/.test(sl)) o.ckD = 1; o.ckT = /acik/.test(sl) ? 1 : 0; }
    if (m === 'D') { const x = sl.match(/(\d+)x(\d+)x(\d+)-cm/); if (x) { o.msL = Math.round(+x[1] / 10) * 10; o.msW = Math.round(+x[2] / 10) * 10; o.msH = Math.round(+x[3] / 10) * 10; } o.msR = /alt-rafli/.test(sl) ? 1 : 0; }
    if (m === 'Y') { const x = sl.match(/(\d+(?:-\d)?)-x-(\d+(?:-\d)?)-cm/); if (x) { o.kyL = Math.round(+x[1].replace('-', '.') / 10) * 10; o.kyW = Math.round(+x[2].replace('-', '.') / 10) * 10; } }
    if (m === 'O') o.ogN = /kompakt/.test(sl) ? 3 : 4;
    if (m === 'L') { const t = sl.match(/tip-([a-g])/); if (t) { const c = 'abcdefg'.indexOf(t[1]), i = KLD.findIndex((d) => d.c === c); if (i >= 0) o.klD = i; } }
    return o;
  }
  function ac(txt, sl) {
    const [k, a] = String(txt || '').split('~'), r = kodAc(k), ur = sl ? urunTasarimi(sl) : null; // sera ürün sayfasından açılınca ürünün kendi ölçüsü
    if (ur && KONTROL[ur.m] && (!SERA || GRUP[0][1].includes(ur.m))) { TUR = ur.m; P = { ...MODUL[ur.m].varsayilan, ...ur.P }; }
    else if (r && KONTROL[r.m] && (!SERA || GRUP[0][1].includes(r.m))) { TUR = r.m; P = { ...MODUL[r.m].varsayilan, ...r.P }; if (a) ADET = Math.min(20, Math.max(1, +a || 1)); }
    else if (txt && KONTROL[txt]) { TUR = txt; P = { ...MODUL[txt].varsayilan, ...(sl ? tahmin(txt, sl) : {}) }; }
    else { P = { ...MODUL[TUR].varsayilan }; }
    SEKME = 'tasar'; kok.querySelectorAll('#sekme button').forEach((x) => x.classList.toggle('on', x.dataset.s === 'tasar'));
    hesap(true); panel();
  }
  if (SERA) { if (sec.bagimsiz) document.title = 'Kendi Seranı Tasarla | HasTürk'; const h = kok.querySelector('.baslik h1'); if (h) h.textContent = 'Kendi Seranı Tasarla'; const sm = kok.querySelector('.baslik small'); if (sm) sm.textContent = 'Galvaniz sera iskeleti'; const mb = kok.querySelector('.mob-bar b'); if (mb) mb.textContent = 'Kendi Seranı Tasarla'; }
  ac(sec.bagimsiz ? decodeURIComponent(location.hash.slice(1)) : sec.kod, sec.adres);
  if (sec.bagimsiz) window.addEventListener('hashchange', () => { const h = decodeURIComponent(location.hash.slice(1)); if (h && R && h !== R.kod + (ADET > 1 ? '~' + ADET : '')) ac(h); });
  return { ac, yenile: () => { sigdir(false); iste(); }, kod: () => R && R.kod };
}
