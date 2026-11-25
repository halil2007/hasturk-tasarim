// Kendin Tasarla hesap motoru: galvaniz profil yapıların ve modüler sebze yatağının parça listesi.
// Kurallar üretim tarafının hesabıyla birebir aynıdır; her değişiklik scripts/tasarla-dogrula.mjs ile
// veri/tasarla/kahin-*.json kayıtlarına karşı denetlenir (parça adı, boy, adet, konnektör kodu, civata).
// Ölçüler mm; profil boyları cm. Tarayıcıda ve Node'da ES modülü olarak çalışır.

export const SDG = [29.5, 39.5, 59.5, 74.5, 99.5, 119.5, 149.5]; // standart profil boyları (cm)
const PSTD = SDG;
export const CN = {
  PC001: 'Düz ekleme', PC002: '90° dirsek (kapı)', PC003: 'T bağlantı', PC004: 'Artı (+)', PC005: 'Kutu köşesi', PC006: 'T + derinlik',
  PC008: 'Köşe saçak', 'PC008-1': 'Köşe saçak (yatay bağlı)', 'PC008-2': 'Köşe saçak (yatay bağsız)', PC009: 'Köşe saçak (ayna)',
  'PC009-1': 'Köşe saçak, ayna (yatay bağlı)', 'PC009-2': 'Köşe saçak, ayna (yatay bağsız)', PC010: 'Ara saçak', 'PC010-1': 'Ara saçak (yatay bağlı)',
  'PC010-2': 'Ara saçak (yatay bağsız)', PC011: 'Alın mahyası (dikmeli)', 'PC011-1': 'Alın mahyası (dikmeli)', 'PC011-2': 'Alın mahyası (dikmesiz)',
  PC012: 'Ara mahya (dikmeli)', 'PC012-1': 'Ara mahya (dikmeli)', 'PC012-2': 'Ara mahya (dikmesiz)', KÇ: 'Kesik çatı köşesi (yeni konnektör gerekebilir)',
};
const F1 = (x) => String(x).replace('.', ',');
const fm = (x) => (x / 1000).toFixed(2).replace('.', ',');

// Özel kesim profilin fiyatlandığı standart boy: %10'a kadar uzun kesim bir alt standardın, daha uzunu bir üst standardın fiyatı
export function fiyatBoyu(l, mx = 149.5) {
  const L = mx > 149.5 ? PSTD.concat([199.5]) : PSTD;
  let lo = null; L.forEach((v) => { if (v <= l + 1e-6) lo = v; });
  if (lo != null && l <= lo * 1.1 + 1e-6) return lo;
  const up = L.find((v) => v >= l - 1e-6);
  return up != null ? up : L[L.length - 1];
}
function snapL(v) { const S = [59.5, 74.5, 99.5, 119.5, 149.5], q = S.find((x) => Math.abs(x - v) <= 0.1001); return q != null ? q : +(Math.round(v * 10) / 10).toFixed(1); }
function cStop(t, d) {
  t = String(t || '').replace('PC-', 'PC');
  const dg = (v) => Math.abs(v[1]) > 0.1 && Math.hypot(v[0], v[2]) > 0.1;
  if (/^PC0(08|09|10)/.test(t) || /^PC01(1|2)/.test(t)) return dg(d) ? 31.36 : 15;
  return 15;
}

// Düğüm sınıflandırma: her düğümdeki kol yönlerinden konnektör kodu. M: [{p,q,len,k}] (mm), W: yapının x boyu (ayna saçak için)
export function siniflandir(M, W, secenek = {}) {
  const nk = (p) => p.map((v) => Math.round(v)).join(), arms = {}, C = {}, NT = {}, cn = (k) => (C[k] = (C[k] || 0) + 1);
  M.forEach((m) => { const r = +(Math.round(m.len * 10) / 10).toFixed(1); if (r !== m.len) { m.len = r; if (m.k !== 'd') m.k = SDG.includes(r) ? 'g' : 'o'; } });
  M.forEach((m) => [[m.p, m.q], [m.q, m.p]].forEach(([u, v]) => { const d = [v[0] - u[0], v[1] - u[1], v[2] - u[2]], l = Math.hypot(...d), k = nk(u); (arms[k] = arms[k] || { p: u, d: [] }).d.push(d.map((t) => Math.round((t / l) * 100) / 100)); }));
  Object.values(arms).forEach(({ p, d }) => {
    const dg = d.filter((v) => Math.abs(v[0]) > 0.01 && Math.abs(v[1]) > 0.01), nn = d.length; let t;
    if (dg.length) {
      const dn = dg.filter((v) => v[1] < 0).length, up = dg.length - dn;
      if (dn == 2) { const hcol = d.some((v) => v[1] < -0.9); t = hcol ? (nn == 4 ? 'PC011-1' : 'PC012-1') : nn == 3 ? 'PC011-2' : 'PC012-2'; }
      else if (up == 1 && dn == 0) { const g = dg[0], l = Math.hypot(g[0], g[2]) || 1, hz = d.filter((v) => Math.abs(v[1]) < 0.1), tie = hz.filter((v) => Math.abs((v[0] * g[0] + v[2] * g[2]) / l) > 0.9).length, al = hz.length - tie; t = (al >= 2 ? 'PC010' : p[0] < W / 2 ? 'PC008' : 'PC009') + (tie ? '-1' : '-2'); }
      else if (dn == 1 && up == 0 && dg.length == 1) { const g = dg[0], l = Math.hypot(g[0], g[2]) || 1, hz = d.filter((v) => Math.abs(v[1]) < 0.1), tr = hz.filter((v) => Math.abs((v[0] * g[0] + v[2] * g[2]) / l) > 0.9).length, al = hz.length - tr, vt = d.some((v) => Math.abs(v[1]) > 0.9); t = tr ? (al >= 2 ? 'PC010' : p[0] < W / 2 ? 'PC009' : 'PC008') + (vt ? '-1' : '-2') : 'KÇ'; }
      else t = nn == 2 ? 'PC001' : nn == 3 ? 'PC003' : nn == 4 ? 'PC004' : 'Diğer (' + nn + ' kol)';
    } else {
      const ax = new Set(d.map((v) => v.findIndex((q) => Math.abs(q) > 0.5))), pr = [0, 1, 2].filter((i) => d.some((v) => v[i] > 0.5) && d.some((v) => v[i] < -0.5)).length;
      t = nn == 2 ? (pr ? 'PC001' : 'PC002') : nn == 3 ? (ax.size == 3 ? 'PC005' : 'PC003') : nn == 4 ? (pr == 2 ? 'PC004' : pr == 1 ? 'PC006' : 'Diğer') : 'Diğer (' + nn + ' kol)';
    }
    cn(t); NT[nk(p)] = t;
  });
  M.forEach((m) => {
    const D = [m.q[0] - m.p[0], m.q[1] - m.p[1], m.q[2] - m.p[2]], L = Math.hypot(...D); if (!L) return;
    const u = D.map((x) => x / L), ku = nk(m.p), kv = nk(m.q), re = /^PC01[12]|^PC0(08|09|10)/;
    if (secenek.diyagonalAtla && Math.abs(u[1]) > 0.1 && Math.hypot(u[0], u[2]) > 0.1) return;
    if (!re.test(String(NT[ku])) && !re.test(String(NT[kv]))) return;
    const nl = snapL((L - cStop(NT[ku], u) - cStop(NT[kv], u.map((x) => -x))) / 10);
    if (Math.abs(nl - m.len) > 0.005) { m.len = nl; if (m.k !== 'd') m.k = SDG.includes(nl) ? 'g' : 'o'; }
  });
  return { C, NT };
}

// Profil yapısının parça ve konnektör tablosu (üretim listesiyle aynı satırlar)
function tablo(M, C, ekSatir = []) {
  const g = {}; let tl = 0;
  M.forEach((m) => { const l1 = +m.len.toFixed(2), k = String(l1); g[k] = g[k] || { len: l1, q: 0, s: !SDG.includes(l1) }; g[k].q++; tl += m.len / 100; });
  const parca = Object.values(g).sort((x, y) => y.len - x.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim, ' + F1(fiyatBoyu(o.len)) + ' fiyatı)' : ''), o.q + ' adet']);
  parca.push(['Toplam profil', M.length + ' adet'], ...ekSatir, ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg']);
  let ct = 0; const kon = Object.entries(C).filter(([k]) => !/^Diğer/.test(k)).sort().map(([k, v]) => { ct += v; return [k + ' ' + (CN[k] || ''), v + ' adet']; });
  kon.push(['Toplam konnektör', ct + ' adet']);
  return { parca, kon };
}
const yapiCiz = (M, C, NT) => ({ uye: M.map((m) => ({ a: m.p, b: m.q, k: m.k, len: m.len })), dugum: Object.entries(NT).filter(([, t]) => /^PC/.test(t)).map(([k, t]) => ({ p: k.split(',').map(Number), kod: t })) });
function ekleyici() {
  const M = [], seen = new Set(), key = (a, b) => { const ka = a.map(Math.round).join(), kb = b.map(Math.round).join(); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
  const ad = (a, b, k, lf) => { const kk = key(a, b); if (seen.has(kk)) return; seen.add(kk); const t = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = +((t - 30) / 10).toFixed(2); M.push({ p: a, q: b, len, k: k || (SDG.includes(len) ? 'g' : 'o'), lf }); };
  return { M, ad };
}
const civata = (M) => M.reduce((a, m) => a + (m.p[1] < 0 ? 2 : 4), 0);

/* ---------------- Modüller ---------------- */
export const MODUL = {};

// Masa (D): L 60–1000, W 40–150, H 50–100 (cm, 10'ar), R alt raf 0/1
MODUL.D = {
  ad: 'Masa', anahtar: ['msL', 'msW', 'msH', 'msR'], varsayilan: { msL: 200, msW: 80, msH: 75, msR: 1 },
  sinir: { msL: [60, 1000, 10], msW: [40, 150, 10], msH: [50, 100, 10], msR: [0, 1, 1] },
  hesapla(P) {
    const L = P.msL * 10, W = P.msW * 10, H = P.msH * 10, Lx = L - 50, Wz = W - 50, yt = H - 43, ys = 225, n = Math.max(1, Math.ceil(Lx / 1225 - 1e-9)), bx = Lx / n, X = (i) => i * bx;
    const { M, ad } = ekleyici();
    for (let i = 0; i <= n; i++) [0, Wz].forEach((z) => { if (P.msR) { ad([X(i), -15, z], [X(i), ys, z]); ad([X(i), ys, z], [X(i), yt, z]); } else ad([X(i), -15, z], [X(i), yt, z]); });
    [0, Wz].forEach((z) => { for (let i = 0; i < n; i++) ad([X(i), yt, z], [X(i + 1), yt, z]); });
    for (let i = 0; i <= n; i++) ad([X(i), yt, 0], [X(i), yt, Wz]);
    if (P.msR) {
      const xs = []; for (let i = 0; i < n; i++) { xs.push(X(i)); if (bx > 700) xs.push(X(i) + bx / 2); } xs.push(Lx);
      [0, Wz].forEach((z) => { for (let j = 0; j < xs.length - 1; j++) ad([xs[j], ys, z], [xs[j + 1], ys, z]); });
      xs.filter((x, j) => j == 0 || j == xs.length - 1 || (bx > 700 && j % 2 == 1)).forEach((x) => ad([x, ys, 0], [x, ys, Wz]));
    }
    const { C, NT } = siniflandir(M, Lx);
    const T = tablo(M, C, [['Civata somun seti', civata(M) + ' adet']]);
    return { ...T, olcu: fm(L) + ' × ' + fm(W) + ' × ' + fm(H) + ' m', alt: 'Uzunluk × genişlik × yükseklik (tabla üstü) · ' + (n + 1) * 2 + ' ayak · ' + (P.msR ? 'alt raflı' : 'rafsız'),
      not: 'Ayaklar arası ' + fm(bx) + ' m (' + n + ' bölüm). Masa uzadıkça ara ayak eklenir; bölüm en fazla 1,23 m olur.',
      yapi: yapiCiz(M, C, NT), tabla: [{ x: -25, y: yt + 25, z: -25, w: L, h: 18, d: W, ad: 'Tabla' }].concat(P.msR ? [{ x: -15, y: ys + 25, z: -15, w: Lx + 30, h: 18, d: Wz + 30, ad: 'Raf levhası' }] : []),
      levha: [['Tabla', fm(L) + ' × ' + fm(W) + ' m']].concat(P.msR ? [['Raf levhası', fm(Lx + 30) + ' × ' + fm(Wz + 30) + ' m (ayakların geçtiği yerler 3 × 3 cm oyulur)']] : []) };
  },
};

// Kurutma tezgâhı (Y): L, W, H aynı sınırlar; O: kapak görünümü (yalnız görsel)
MODUL.Y = {
  ad: 'Kurutma tezgâhı', anahtar: ['kyL', 'kyW', 'kyH', 'kyO'], varsayilan: { kyL: 200, kyW: 100, kyH: 80, kyO: 1 },
  sinir: { kyL: [60, 1000, 10], kyW: [40, 150, 10], kyH: [50, 100, 10], kyO: [0, 1, 1] },
  hesapla(P) {
    const L = P.kyL * 10, W = P.kyW * 10, H = P.kyH * 10, Lx = L - 50, Wz = W - 50, yt = H - 25, yh = yt + 30, n = Math.max(1, Math.ceil(Lx / 1225 - 1e-9)), bx = Lx / n, X = (i) => i * bx, ms = Math.max(1, Math.ceil(bx / 700 - 1e-9));
    const { M, ad } = ekleyici();
    for (let i = 0; i <= n; i++) [0, Wz].forEach((z) => ad([X(i), -15, z], [X(i), yt, z]));
    const xs = []; for (let i = 0; i < n; i++) for (let j = 0; j < ms; j++) xs.push(X(i) + (bx * j) / ms); xs.push(Lx);
    [0, Wz].forEach((z) => { for (let j = 0; j < xs.length - 1; j++) ad([xs[j], yt, z], [xs[j + 1], yt, z]); });
    xs.forEach((x) => ad([x, yt, 0], [x, yt, Wz]));
    const kapak = []; for (let i = 0; i < n; i++) { const x0 = X(i) + (i > 0 ? 20 : 0), x1 = X(i + 1) - (i < n - 1 ? 20 : 0), lf = { i, x0, x1 }; kapak.push(lf);
      ad([x0, yh, 0], [x1, yh, 0], 'd', lf); ad([x0, yh, Wz], [x1, yh, Wz], 'd', lf); ad([x0, yh, 0], [x0, yh, Wz], 'd', lf); ad([x1, yh, 0], [x1, yh, Wz], 'd', lf); }
    const nh = kapak.reduce((a, l) => a + (l.x1 - l.x0 > 1000 ? 3 : 2), 0);
    const { C, NT } = siniflandir(M, Lx);
    const T = tablo(M, C, [['Kelebek menteşe', nh + ' adet'], ['Civata somun seti', civata(M) + ' adet']]);
    const A1 = ((Lx + 30) * (Wz + 30)) / 1e6, A2 = kapak.reduce((a, l) => a + ((l.x1 - l.x0 + 30) * (Wz + 30)) / 1e6, 0), f2 = (x) => x.toFixed(2).replace('.', ',');
    return { ...T, ek: { A1 }, olcu: fm(L) + ' × ' + fm(W) + ' × ' + fm(H) + ' m',
      alt: 'Uzunluk × genişlik × yükseklik (alt tel) · ' + (n + 1) * 2 + ' ayak · ' + n + ' kapak · kapak açıkken toplam yükseklik ' + fm(yh + 25 + Math.sin((62 * Math.PI) / 180) * Wz) + ' m',
      not: 'Ayaklar arası ' + fm(bx) + ' m (' + n + ' bölüm), enine kuşaklar ' + fm(bx / ms) + ' m arayla. Tezgâh uzadıkça ara ayak eklenir. Her bölümde arka kenardan menteşeli, yukarı açılan bir kapak vardır.',
      yapi: yapiCiz(M, C, NT), kapak: kapak.map((l) => ({ ...l, y: yh, Wz })),
      levha: [['Alt tel (ürün serilen)', f2(A1) + ' m² · ' + fm(Lx + 30) + ' × ' + fm(Wz + 30) + ' m'], ['Kapak teli', f2(A2) + ' m² (' + n + ' kapak)'], ['Toplam tel (%10 payla)', f2((A1 + A2) * 1.1) + ' m²']] };
  },
};

// Arı kovanı sehpası (A): arw kovan yeri (yan yana), ark kat 1/2, arn sehpa adedi 1–12; arr bölge, ara rakım (yalnız bilgi)
MODUL.A = {
  ad: 'Arı kovanı sehpası', anahtar: ['arw', 'ark', 'arn', 'arr', 'ara'], varsayilan: { arw: 4, ark: 1, arn: 2, arr: 1, ara: 0 },
  alan: { arw: [2, 4, 6], ark: [1, 2], arn: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], arr: [0, 1, 2, 3, 4, 5, 6], ara: [0, 1, 2, 3] },
  hesapla(P) {
    const nx = P.arw, nk = P.ark, n = P.arn, ys = nk == 2 ? [0, 480, 1505] : [0, 480], sx = 625, sz = 380;
    const g = ekleyici();
    ys.forEach((y, k) => { if (k == 0) return; const full = k == ys.length - 1;
      [0, sz].forEach((z) => { for (let j = 0; j < nx; j++) g.ad([j * sx, y, z], [(j + 1) * sx, y, z]); });
      for (let j = 0; j <= nx; j++) { if (!full && j != 0 && j != nx) continue; g.ad([j * sx, y, 0], [j * sx, y, sz]); } });
    for (let j = 0; j <= nx; j++) [0, sz].forEach((z) => { g.ad([j * sx, -15, z], [j * sx, ys[1], z]); for (let k = 1; k < ys.length - 1; k++) g.ad([j * sx, ys[k], z], [j * sx, ys[k + 1], z]); });
    const Wst = nx * sx + 30, Dst = sz + 30, GX = 1000, GZ = 3000, org = (i) => [(i % 4) * (Wst + GX), Math.floor(i / 4) * (Dst + GZ)];
    const M = []; for (let i = 0; i < n; i++) { const o = org(i); g.M.forEach((m) => M.push({ p: [o[0] + 15 + m.p[0], m.p[1], o[1] + 15 + m.p[2]], q: [o[0] + 15 + m.q[0], m.q[1], o[1] + 15 + m.q[2]], len: m.len, k: m.k })); }
    const { C, NT } = siniflandir(M, Wst);
    const T = tablo(M, C, [['Civata somun seti', civata(M) + ' adet'], ['Zemin kazığı (öneri, rüzgâra karşı)', n * 4 + ' adet']]);
    const hives = n * nx * nk, Ht = ys[ys.length - 1] + 15;
    return { ...T, ek: { hives }, olcu: n + ' sehpa · ' + hives + ' kovan', alt: 'Bir sehpa ' + fm(Wst) + ' × ' + fm(Dst) + ' m, ' + nk + ' kat, sehpa yüksekliği ' + fm(Ht) + ' m · kovan oturma yüksekliği 0,50 m · 59,5 cm profil',
      not: 'Her kovan yeri 62,5 cm: Langstroth kovan 41,3 cm ve yanlarda çalışma payı. Kovan, 41 cm aralıklı iki kuşağın üstüne oturur. Sehpalar 1 m arayla sıralanır, 4 sehpadan sonra 3 m geride yeni sıra başlar.',
      yapi: yapiCiz(M, C, NT) };
  },
};

// Bahçe kemeri (G): gkR 0 düz çatı / 1 kesik çatı, gkN bölüm 1–3 (74,5 cm profil, 77,5 cm eksen)
MODUL.G = {
  ad: 'Bahçe kemeri', anahtar: ['gkR', 'gkN'], varsayilan: { gkR: 0, gkN: 1 }, alan: { gkR: [0, 1], gkN: [1, 2, 3] },
  hesapla(P) {
    const B = 775, KR = P.gkR == 1, n = Math.max(1, Math.min(3, Math.round(+P.gkN) || 1)), Dz = n * B, ny = KR ? 2 : 3, He = ny * B, RUN = (745 * 10 + 2 * 313.6) / 10 / Math.SQRT2,
      W = KR ? 2 * RUN + B : 2 * B, Rh = KR ? He + RUN : He, Z = (i) => i * B, Y = (k) => k * B;
    const { M, ad } = ekleyici();
    [0, W].forEach((x) => { for (let i = 0; i <= n; i++) for (let k = 0; k < ny; k++) ad([x, Y(k), Z(i)], [x, Y(k + 1), Z(i)]); for (let k = 0; k <= ny; k++) for (let i = 0; i < n; i++) ad([x, Y(k), Z(i)], [x, Y(k), Z(i + 1)]); });
    if (!KR) { for (let i = 0; i <= n; i++) { ad([0, He, Z(i)], [B, He, Z(i)]); ad([B, He, Z(i)], [W, He, Z(i)]); } for (let i = 0; i < n; i++) ad([B, He, Z(i)], [B, He, Z(i + 1)]); }
    else { const xa = RUN, xb = W - RUN; for (let i = 0; i <= n; i++) { ad([0, He, Z(i)], [xa, Rh, Z(i)]); ad([W, He, Z(i)], [xb, Rh, Z(i)]); ad([xa, Rh, Z(i)], [xb, Rh, Z(i)]); } [xa, xb].forEach((x) => { for (let i = 0; i < n; i++) ad([x, Rh, Z(i)], [x, Rh, Z(i + 1)]); }); }
    const { C, NT } = siniflandir(M, W);
    const T = tablo(M, C, [['Civata somun seti', M.length * 4 + ' adet']]);
    const Wo = W + 30, Do = Dz + 30, Ho = Rh + 15, pw = W - 30;
    return { ...T, ek: { Wo, Do }, olcu: fm(Wo) + ' × ' + fm(Do) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × derinlik × yükseklik · geçiş genişliği ' + fm(pw) + ' m · ' + (KR ? 'kesik çatı' : 'düz çatı'),
      levha: [['Geçiş genişliği', fm(pw) + ' m'], KR ? ['Geçiş yüksekliği (ortada)', fm(Rh - 15) + ' m'] : ['Geçiş yüksekliği', fm(He - 15) + ' m'], KR ? ['Yan yükseklik (saçak)', fm(He + 15) + ' m'] : null, ['Derinlik', fm(Do) + ' m (' + n + ' bölüm)']].filter(Boolean),
      yapi: yapiCiz(M, C, NT) };
  },
};

// Araç gölgeliği (O): ogC araç tipi (0 hatchback, 1 sedan, 2 SUV; yalnız bilgi), ogW geniş (sabit 1), ogN bölüm 3–4. Kesik çatı, 149,5 cm profil.
export const OGCAR = [{ k: 'Hatchback', L: 4100, W: 1760, H: 1480, n: 3 }, { k: 'Sedan', L: 4600, W: 1800, H: 1460, n: 4 }, { k: 'SUV', L: 4500, W: 1840, H: 1660, n: 4 }];
MODUL.O = {
  ad: 'Araç gölgeliği', anahtar: ['ogC', 'ogW', 'ogN'], varsayilan: { ogC: 1, ogW: 1, ogN: 4 }, alan: { ogC: [0, 1, 2], ogW: [1], ogN: [3, 4] },
  hesapla(P) {
    P.ogW = 1; P.ogN = Math.max(3, Math.min(4, Math.round(+P.ogN) || 3));
    const car = OGCAR[P.ogC] || OGCAR[1], B = 1525, n = Math.max(3, Math.min(4, Math.round(+P.ogN) || 3)), Dz = n * B, He = 1525, PR = 1495, RUN = Math.round((PR + 2 * 31.36) / Math.SQRT2), TOP = 1525,
      W = 2 * RUN + TOP, Rh = He + RUN, xa = RUN, xb = W - RUN, Z = (i) => i * B;
    const { M, ad } = ekleyici();
    for (let i = 0; i <= n; i++) { const z = Z(i); [0, W].forEach((x) => ad([x, 0, z], [x, He, z])); ad([0, He, z], [xa, Rh, z]); ad([W, He, z], [xb, Rh, z]); ad([xa, Rh, z], [xb, Rh, z]); }
    for (let i = 0; i < n; i++) { [0, W].forEach((x) => { ad([x, 0, Z(i)], [x, 0, Z(i + 1)]); ad([x, He, Z(i)], [x, He, Z(i + 1)]); }); [xa, xb].forEach((x) => ad([x, Rh, Z(i)], [x, Rh, Z(i + 1)])); }
    { const z = Dz; [0, He].forEach((y) => { ad([0, y, z], [xa, y, z]); ad([xa, y, z], [xb, y, z]); ad([xb, y, z], [W, y, z]); }); [xa, xb].forEach((x) => ad([x, 0, z], [x, He, z])); }
    const { C, NT } = siniflandir(M, W);
    const T = tablo(M, C, [['Civata somun seti', M.length * 4 + ' adet'], ['Zemin sabitleme (öneri, dikme başına)', 2 * (n + 1) + ' adet']]);
    const Wo = W + 30, Do = Dz + 30, Ho = Rh + 15, Wi = W - 30, side = (Wi - car.W) / 2;
    return { ...T, ek: { Wo, Do, n, car }, olcu: fm(Wo) + ' × ' + fm(Do) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × uzunluk × yükseklik · ' + ((Wo * Do) / 1e6).toFixed(1).replace('.', ',') + ' m² · ' + car.k + ' için · kesik çatı',
      levha: [['İç genişlik', fm(Wi) + ' m'], ['Aracın iki yanında boşluk', fm(side) + ' m (kapı açmak için)'], ['Giriş yüksekliği (yanda)', fm(He - 15) + ' m'], ['Giriş yüksekliği (ortada)', fm(Rh - 15) + ' m']],
      not: 'Ön taraf araç girişi için tamamen açıktır. Bütün iskelet 149,5 cm profildir.', yapi: yapiCiz(M, C, NT) };
  },
};

// Klima ve kompresör kafesi (L): klD cihaz (katalog sırası). Kafes tipi cihaza göre seçilir; önde menteşeli bakım kapağı.
const KLT = [{ id: 'A', x: [995], z: [595], y: [745] }, { id: 'B', x: [1195], z: [595], y: [995] }, { id: 'C', x: [1195], z: [595], y: [1495] }, { id: 'D', x: [1495], z: [745], y: [1195] }, { id: 'E', x: [1195], z: [995], y: [1195] }, { id: 'F', x: [995, 595], z: [745], y: [1195] }, { id: 'G', x: [1495], z: [995], y: [995, 745] }];
export const KLD = [
  { k: 'Split klima 9.000 BTU', g: 'Split klima dış ünitesi', W: 720, D: 270, H: 500, c: 0 }, { k: 'Split klima 12.000 BTU', g: 'Split klima dış ünitesi', W: 780, D: 290, H: 550, c: 0 },
  { k: 'Split klima 18.000 BTU', g: 'Split klima dış ünitesi', W: 850, D: 320, H: 700, c: 1 }, { k: 'Split klima 24.000 BTU', g: 'Split klima dış ünitesi', W: 900, D: 350, H: 740, c: 1 },
  { k: 'Multi split (2-4 oda)', g: 'Multi split dış ünitesi', W: 950, D: 350, H: 830, c: 1 }, { k: 'VRF / çift fanlı ünite', g: 'VRF, büyük multi split', W: 940, D: 330, H: 1380, c: 2 },
  { k: 'Isı pompası monoblok 5-8 kW', g: 'Hava kaynaklı ısı pompası', W: 1000, D: 500, H: 850, c: 3 }, { k: 'Isı pompası monoblok 12-16 kW', g: 'Hava kaynaklı ısı pompası', W: 1270, D: 530, H: 1020, c: 3 },
  { k: 'Hava kompresörü 50 L', g: 'Pistonlu hava kompresörü', W: 720, D: 330, H: 650, c: 1 }, { k: 'Hava kompresörü 100 L', g: 'Pistonlu hava kompresörü', W: 1000, D: 420, H: 780, c: 3 },
  { k: 'Hava kompresörü 200 L', g: 'Pistonlu hava kompresörü', W: 1360, D: 480, H: 960, c: 5 }, { k: 'Vidalı kompresör 7,5-11 kW', g: 'Vidalı kompresör (tanksız)', W: 840, D: 700, H: 1085, c: 4 },
  { k: 'Vidalı kompresör 270 L tanklı', g: 'Vidalı kompresör (tank üstü)', W: 1200, D: 650, H: 1540, c: 6 }];
MODUL.L = {
  ad: 'Klima kafesi', anahtar: ['klD'], varsayilan: { klD: 1 }, alan: { klD: KLD.map((_, i) => i) },
  hesapla(P) {
    P.klD = Math.max(0, Math.min(KLD.length - 1, P.klD | 0));
    const d = KLD[P.klD], TY = KLT[d.c], xs = [0]; TY.x.forEach((L) => xs.push(xs[xs.length - 1] + L + 30));
    const zs = [0]; TY.z.forEach((L) => zs.push(zs[zs.length - 1] + L + 30)); const ys = [0]; TY.y.forEach((L) => ys.push(ys[ys.length - 1] + L + 30));
    const W = xs[xs.length - 1], Dp = zs[zs.length - 1], Ht = ys[ys.length - 1];
    const { M, ad } = ekleyici();
    const posts = []; xs.forEach((x) => [0, Dp].forEach((z) => posts.push([x, z]))); zs.slice(1, -1).forEach((z) => [0, W].forEach((x) => posts.push([x, z])));
    posts.forEach(([x, z]) => { for (let k = 0; k < ys.length - 1; k++) ad([x, ys[k], z], [x, ys[k + 1], z]); });
    ys.forEach((y) => { [0, Dp].forEach((z) => { for (let i = 0; i < xs.length - 1; i++) ad([xs[i], y, z], [xs[i + 1], y, z]); }); [0, W].forEach((x) => { for (let j = 0; j < zs.length - 1; j++) ad([x, y, zs[j]], [x, y, zs[j + 1]]); }); });
    xs.slice(1, -1).forEach((x) => { for (let j = 0; j < zs.length - 1; j++) ad([x, Ht, zs[j]], [x, Ht, zs[j + 1]]); });
    const nb = xs.length - 1; let bi = 0; for (let i = 1; i < nb; i++) if (xs[i + 1] - xs[i] > xs[bi + 1] - xs[bi]) bi = i;
    const xa = xs[bi], xb = xs[bi + 1], lf = { xh: xa, left: true };
    [xa, xb].forEach((x) => { for (let k = 0; k < ys.length - 1; k++) ad([x, ys[k], -30], [x, ys[k + 1], -30], 'd', lf); }); ys.forEach((y) => ad([xa, y, -30], [xb, y, -30], 'd', lf));
    const { C, NT } = siniflandir(M, W), hn = 2;
    const T = tablo(M, C, [['Kelebek menteşe', hn + ' adet'], ['Civata somun seti', M.length * 4 + ' adet']]);
    const Wo = W + 30, Do = Dp + 30, Ho = Ht + 30, iw = W - 30 - (xs.length - 2) * 30, ih = Ht - 30, id = Dp - 30 - (zs.length - 2) * 30, mesh = (2 * Wo * Ho + 2 * Do * Ho + Wo * Do) / 1e6;
    return { ...T, olcu: fm(Wo) + ' × ' + fm(Do) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × derinlik × yükseklik · Kafes tipi ' + TY.id,
      levha: [['Cihaz (' + d.g + ')', d.W / 10 + ' × ' + d.D / 10 + ' × ' + d.H / 10 + ' cm'], ['Kafes iç ölçüsü', fm(iw) + ' × ' + fm(id) + ' × ' + fm(ih) + ' m'], ['Cihaz çevresinde boşluk', 'en az 10 cm (yanlarda, önde, arkada ve üstte)'], ['Ön bakım kapağı', '1 kanat, ' + hn + ' menteşe'], ['Kaplanacak alan (tel / delikli sac)', mesh.toFixed(1).replace('.', ',') + ' m² (önde kapak dahil, zemin hariç)']],
      yapi: yapiCiz(M, C, NT) };
  },
};

// Çöp konteyneri muhafazası (U): ckD konteyner (katalog sırası), ckT 0 kapaklı / 1 üstü açık
export const CKD = [{ k: 'Çöp kovası 120 L', g: 'İki tekerlekli çöp kovası', W: 480, D: 560, H: 940 }, { k: 'Çöp kovası 240 L', g: 'İki tekerlekli çöp kovası', W: 585, D: 730, H: 1080 },
  { k: 'Çöp kovası 360 L', g: 'İki tekerlekli çöp kovası', W: 625, D: 860, H: 1100 }, { k: 'Konteyner 400 L', g: 'Dört tekerlekli konteyner', W: 1000, D: 620, H: 1150 },
  { k: 'Konteyner 770 L', g: 'Dört tekerlekli konteyner (galvaniz veya plastik)', W: 1370, D: 800, H: 1370 }, { k: 'Konteyner 1100 L', g: 'Dört tekerlekli konteyner', W: 1370, D: 1190, H: 1400 }];
const CKS = [295, 395, 595, 745, 995, 1195, 1495], ckSpan = (need) => { for (const a of CKS) if (a >= need) return a; return 1495; };
MODUL.U = {
  ad: 'Çöp muhafazası', anahtar: ['ckD', 'ckT'], varsayilan: { ckD: 1, ckT: 0 }, alan: { ckD: CKD.map((_, i) => i), ckT: [0, 1] },
  hesapla(P) {
    P.ckD = Math.max(0, Math.min(CKD.length - 1, P.ckD | 0)); P.ckT = P.ckT ? 1 : 0;
    const d = CKD[P.ckD], n = 1, lid = !P.ckT, BX = ckSpan(d.W + 100), BZ = ckSpan(d.D + 100), BY = ckSpan(d.H + 90), xs = [0]; for (let i = 0; i < n; i++) xs.push(xs[i] + BX + 30);
    const W = xs[n], Dp = BZ + 30, Ht = BY + 30, { M, ad } = ekleyici();
    xs.forEach((x) => { [0, Dp].forEach((z) => ad([x, 0, z], [x, Ht, z])); ad([x, 0, 0], [x, 0, Dp]); ad([x, Ht, 0], [x, Ht, Dp]); });
    for (let i = 0; i < n; i++) { ad([xs[i], 0, Dp], [xs[i + 1], 0, Dp]); ad([xs[i], Ht, Dp], [xs[i + 1], Ht, Dp]); ad([xs[i], Ht, 0], [xs[i + 1], Ht, 0]); }
    const leaves = [], lids = [];
    for (let i = 0; i < n; i++) { const x0 = i == 0 ? xs[0] : xs[i] + 20, x1 = i == n - 1 ? xs[n] : xs[i + 1] - 20, dbl = BX >= 995, parts = dbl ? [[x0, (x0 + x1) / 2 - 5, true], [(x0 + x1) / 2 + 5, x1, false]] : [[x0, x1, i % 2 == 0]];
      parts.forEach(([xa, xb, left]) => { const lf = { xh: left ? xa : xb }; leaves.push({ xa, xb, lf }); [xa, xb].forEach((x) => ad([x, 0, -30], [x, Ht, -30], 'd', lf)); [0, Ht].forEach((y) => ad([xa, y, -30], [xb, y, -30], 'd', lf)); });
      if (lid) { const lf = { lid: 1, zh: Dp }; lids.push({ x0, x1, lf }); [x0, x1].forEach((x) => ad([x, Ht + 30, 0], [x, Ht + 30, Dp], 'd', lf)); [0, Dp].forEach((z) => ad([x0, Ht + 30, z], [x1, Ht + 30, z], 'd', lf)); } }
    const { C, NT } = siniflandir(M, W), hn = (leaves.length + lids.length) * 2;
    const T = tablo(M, C, [['Kelebek menteşe', hn + ' adet'], ['Civata somun seti', M.length * 4 + ' adet']]);
    const Wo = W + 30, Do = Dp + 30, Ho = Ht + 30, clad = (2 * Do * Ho + Wo * Ho) / 1e6;
    return { ...T, olcu: fm(Wo) + ' × ' + fm(Do) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × derinlik × yükseklik · ' + d.k,
      levha: [['Konteyner (' + d.g + ')', d.W / 10 + ' × ' + d.D / 10 + ' × ' + d.H / 10 + ' cm'], ['Bölme iç ölçüsü', fm(BX) + ' × ' + fm(BZ) + ' × ' + fm(BY) + ' m'], ['Ön kapı', leaves.length + ' kanat, ' + leaves.length * 2 + ' menteşe'], ['Üst kapak', lid ? lids.length + ' kapak, ' + lids.length * 2 + ' menteşe' : 'Yok (üst açık)'], ['Kaplanacak alan (yanlar ve arka)', clad.toFixed(1).replace('.', ',') + ' m²']],
      yapi: yapiCiz(M, C, NT) };
  },
};

// Güneş paneli sehpası (P): gpV panel tipi 0–2, gpN sehpa adedi 1–4. Çatı tipi, 45° sabit.
export const GPV = [{ k: 'Küçük', g: '2 adet 100–200 W panel', L1: 1495, L2: 395, X: 745, pn: 2, pl: 1200, pw: 680 }, { k: 'Orta 400–455 W', g: '1 adet 400–455 W panel', L1: 1195, L2: 595, X: 995, pn: 1, pl: 1722, pw: 1134 },
  { k: 'Büyük 540–600 W', g: '1 adet 540–600 W panel', L1: 1195, L2: 595, X: 1495, pn: 1, pl: 2278, pw: 1134 }];
MODUL.P = {
  ad: 'Güneş paneli sehpası', anahtar: ['gpV', 'gpN'], varsayilan: { gpV: 1, gpN: 1 }, alan: { gpV: [0, 1, 2], gpN: [1, 2, 3, 4] },
  hesapla(P) {
    P.gpV = Math.max(0, Math.min(2, P.gpV | 0)); P.gpN = Math.max(1, Math.min(4, P.gpN | 0));
    const v = GPV[P.gpV], n = P.gpN, R2 = Math.SQRT2, hB = 325, A = (v.L1 + 62.72) / R2, Bh = (v.L2 + 62.72) / R2, Dp = A + Bh, W = v.X + 30, yC = hB + A, ru = A - Bh - 30,
      ruS = SDG.map((L) => L * 10).find((L) => Math.abs(L - ru) <= 1.5), yD = ruS ? hB + 30 + ruS : hB + A - Bh;
    const { M, ad } = ekleyici();
    [0, W].forEach((x) => { const Pa = [x, 0, 0], Pb = [x, hB, 0], Pc = [x, yC, A], Pd = [x, yD, Dp], Pe = [x, hB, Dp], Pf = [x, 0, Dp]; ad(Pa, Pf); ad(Pa, Pb); ad(Pb, Pc); ad(Pc, Pd); ad(Pf, Pe); ad(Pe, Pd); ad(Pb, Pe); });
    [[hB, 0], [yC, A], [yD, Dp], [hB, Dp]].forEach(([y, z]) => ad([0, y, z], [W, y, z]));
    const sw = (q) => [q[2], q[1], q[0]], M2 = M.map((m) => Object.assign({}, m, { p: sw(m.p), q: sw(m.q) })), { C: C0, NT } = siniflandir(M2, 1e9);
    M2.forEach((m, i) => { M[i].len = m.len; M[i].k = m.k; });
    const C1 = {}; Object.entries(C0).forEach(([k, c]) => { if (/^Diğer/.test(k)) return; const mm2 = k.match(/^PC00[89](-[12])$/); if (mm2) { const h = c / 2; C1['PC008' + mm2[1]] = (C1['PC008' + mm2[1]] || 0) + h; C1['PC009' + mm2[1]] = (C1['PC009' + mm2[1]] || 0) + h; } else C1[k] = (C1[k] || 0) + c; });
    const g = {}; let tl = 0; M.forEach((m) => { const l1 = +m.len.toFixed(2), k = String(l1); g[k] = g[k] || { len: l1, q: 0, s: !SDG.includes(l1) }; g[k].q += n; tl += (m.len / 100) * n; });
    const parca = Object.values(g).sort((x, y) => y.len - x.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim, ' + F1(fiyatBoyu(o.len)) + ' fiyatı)' : ''), o.q + ' adet']);
    parca.push(['Toplam profil', M.length * n + ' adet'], ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg']);
    let ct = 0; const kon = Object.entries(C1).sort().map(([k, c]) => { ct += c * n; return [k + ' ' + (CN[k] || ''), c * n + ' adet']; }); kon.push(['Toplam konnektör', ct + ' adet']);
    const pitch = Math.max(W + 30, v.pl) + 60, Wt = (n - 1) * pitch + W, ss = Math.sin(Math.PI / 4), ptop = v.pn * v.pw * ss + hB + 35 * ss + 30, Hmax = Math.max(yC + 15, ptop);
    const yapi = yapiCiz(M2.map((m) => ({ ...m, p: sw(m.p), q: sw(m.q) })), C1, Object.fromEntries(Object.entries(NT).map(([k, t]) => [sw(k.split(',').map(Number)).join(), t])));
    return { parca, kon, olcu: fm(Wt + 30) + ' × ' + fm(Dp + 30) + ' × ' + fm(Hmax) + ' m', alt: 'Genişlik × derinlik × yükseklik · ' + (n > 1 ? n + ' × ' : '') + v.k,
      levha: [['Panel', v.g], ['Panel ölçüsü (örnek)', fm(v.pl) + ' × ' + fm(v.pw) + ' m' + (v.pn > 1 ? ' · 2 adet' : '')], ['Açı', '45°'], ['Sehpa ölçüsü', fm(W + 30) + ' × ' + fm(Dp + 30) + ' × ' + fm(yC + 15) + ' m']],
      ek: { L1: v.L1, yC }, yapi, adet: n, aralik: pitch };
  },
};

// Likya sera (E): kapısız tünel sera, 45° çatı; lyH 0 → 149,5 cm, 1 → 199,5 cm dikme ve mertek; lyN bölüm 1–4
const LYS = SDG.concat([199.5]);
MODUL.E = {
  ad: 'Likya sera', anahtar: ['lyH', 'lyN'], varsayilan: { lyH: 0, lyN: 3 }, alan: { lyH: [0, 1], lyN: [1, 2, 3, 4] },
  hesapla(P) {
    P.lyH = P.lyH ? 1 : 0; P.lyN = Math.max(1, Math.min(4, P.lyN | 0));
    const n = P.lyN, po = P.lyH ? 1995 : 1495, He = po + 30, Hw = (po + 62.72) / Math.SQRT2, W = 2 * Hw, yR = He + Hw, BY = P.lyH ? 2025 : 1525, L = n * BY;
    const nk = n >= 4 ? 1 + Math.floor((n - 4) / 2) : 0, colF = new Set([0, n]); for (let j = 1; j <= nk; j++) colF.add(Math.round((j * n) / (nk + 1)));
    const { M, ad } = ekleyici();
    for (let i = 0; i <= n; i++) { const z = i * BY, end = i == 0 || i == n;
      [0, W].forEach((x) => { ad([x, 0, z], [x, He, z]); ad([x, He, z], [Hw, yR, z]); });
      if (colF.has(i)) { ad([0, 0, z], [Hw, 0, z]); ad([Hw, 0, z], [W, 0, z]); ad([Hw, 0, z], [Hw, He, z]); ad([Hw, He, z], [Hw, yR, z]); }
      if (end || (P.lyH && colF.has(i))) { ad([0, He, z], [Hw, He, z]); ad([Hw, He, z], [W, He, z]); } }
    for (let i = 0; i < n; i++) { const a = i * BY, b = a + BY; [0, W].forEach((x) => { ad([x, 0, a], [x, 0, b]); ad([x, He, a], [x, He, b]); }); ad([Hw, yR, a], [Hw, yR, b]); }
    const { C, NT } = siniflandir(M, W);
    M.forEach((m) => { if (m.p[1] == m.q[1] && m.p[2] == m.q[2] && Math.abs(m.p[0] - m.q[0]) > 1) m.len = +((Math.abs(m.q[0] - m.p[0]) - 30) / 10).toFixed(1); m.k = LYS.includes(+m.len.toFixed(1)) ? 'g' : 'o'; });
    const g = {}; let tl = 0; M.forEach((m) => { const l1 = +m.len.toFixed(2), k = String(l1); g[k] = g[k] || { len: l1, q: 0, s: !LYS.includes(l1) }; g[k].q++; tl += m.len / 100; });
    const parca = Object.values(g).sort((x, y) => y.len - x.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim, ' + F1(o.len > 149.5 ? 199.5 : fiyatBoyu(o.len)) + ' fiyatı)' : ''), o.q + ' adet']);
    parca.push(['Toplam profil', M.length + ' adet'], ['Civata somun seti', M.length * 4 + ' adet'], ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg']);
    let ct = 0; const kon = Object.entries(C).filter(([k]) => !/^Diğer/.test(k)).sort().map(([k, v]) => { ct += v; return [k + ' ' + (CN[k] || ''), v + ' adet']; }); kon.push(['Toplam konnektör', ct + ' adet']);
    const Wo = W + 30, Lo = L + 30, Ho = yR + 15, ar = (Wo * Lo) / 1e6;
    return { parca, kon, olcu: fm(Wo) + ' × ' + fm(Lo) + ' m', alt: ar.toFixed(1).replace('.', ',') + ' m² · saçak ' + fm(He + 15) + ' m · mahya ' + fm(Ho) + ' m',
      sera: { W, L, profil: [[0, 0], [0, He], [Hw, yR], [W, He], [W, 0]], kapi: 0 },
      levha: [['Bölüm', n + ' × ' + (P.lyH ? '2' : '1,5') + ' m'], ['Çerçeve', n + 1 + ' adet'], ['Dikme ve mertek', F1(po / 10) + ' cm'], ['Orta kolon', colF.size + ' adet'], ['Çatı açısı', '45°'], ['Kapı', 'Yok (tünel sera; giriş ön alından)']],
      yapi: yapiCiz(M, C, NT) };
  },
};

// Aspendos sera (N) ve hareketli kümes (J): kesik çatı, önde tavana kadar kapı; seranın arka alnında havalandırma penceresi
function aspendos(P, JV) {
  const n = JV ? Math.max(1, Math.min(3, P.hxN | 0)) : Math.max(2, Math.min(3, P.asN | 0)); if (JV) P.hxN = n; else P.asN = n;
  const He = JV ? 1025 : 1225, a = 625, T = 775, W = 2 * a + T, yT = He + a, BY = He, L = n * BY, xa = a, xb = a + T, { M, ad } = ekleyici();
  for (let i = 0; i <= n; i++) { const z = i * BY, fr = i == 0, bk = i == n;
    [0, W].forEach((x) => ad([x, 0, z], [x, He, z])); ad([0, He, z], [xa, yT, z]); ad([W, He, z], [xb, yT, z]); ad([xa, yT, z], [xb, yT, z]);
    if (fr || bk) { [[0, xa], [xb, W]].forEach(([u, v]) => { ad([u, 0, z], [v, 0, z]); ad([u, He, z], [v, He, z]); }); [xa, xb].forEach((x) => { ad([x, 0, z], [x, He, z]); ad([x, He, z], [x, yT, z]); });
      ad([xa, 0, z], [xb, 0, z]); if (bk) ad([xa, He, z], [xb, He, z]); } }
  for (let i = 0; i < n; i++) { const z0 = i * BY, z1 = z0 + BY; [0, W].forEach((x) => { ad([x, 0, z0], [x, 0, z1]); ad([x, He, z0], [x, He, z1]); }); [xa, xb].forEach((x) => ad([x, yT, z0], [x, yT, z1])); }
  const dlf = { xh: xa + 35 }, dya = 35, dyb = yT - 35, dym = (dya + dyb) / 2, dx0 = xa + 35, dx1 = xb - 35;
  [dx0, dx1].forEach((x) => { ad([x, dya, 0], [x, dym, 0], 'd', dlf); ad([x, dym, 0], [x, dyb, 0], 'd', dlf); }); [dya, dym, dyb].forEach((y) => ad([dx0, y, 0], [dx1, y, 0], 'd', dlf));
  const { C, NT } = siniflandir(M, W);
  const wx0 = xa + 35, wx1 = xb - 35, wy0 = He + 35, wy1 = yT - 35;
  const WN = JV ? [] : [[[wx0, wy0, L], [wx1, wy0, L]], [[wx0, wy1, L], [wx1, wy1, L]], [[wx0, wy0, L], [wx0, wy1, L]], [[wx1, wy0, L], [wx1, wy1, L]]].map(([p, q]) => ({ p, q, len: +((Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) - 30) / 10).toFixed(2), k: 'd', win: 1 }));
  if (!JV) C.PC002 = (C.PC002 || 0) + 4;
  const AL = [...M, ...WN], hn = 4;
  const T2 = tablo(AL, C, [['Kelebek menteşe', hn + ' adet'], ['Civata somun seti', AL.length * 4 + ' adet']]);
  const Wo = W + 30, Lo = L + 30, Ho = yT + 15, ar = (Wo * Lo) / 1e6, r = { ...T2, ek: { ia: ((W - 30) * (L - 30)) / 1e6 }, olcu: fm(Wo) + ' × ' + fm(Lo) + ' m', alt: ar.toFixed(1).replace('.', ',') + ' m² · saçak ' + fm(He + 15) + ' m · mahya ' + fm(Ho) + ' m',
    sera: JV ? null : { W, L, profil: [[0, 0], [0, He], [xa, yT], [xb, yT], [W, He], [W, 0]], kapi: 1 },
    levha: [['Bölüm', n + ' × ' + (JV ? '1,0' : '1,2') + ' m'], ['Ana profil', JV ? '99,5 cm' : '119,5 cm'], ['Kapı', 'Tavana kadar, ' + fm(T - 30) + ' × ' + fm(yT) + ' m'], ...(JV ? [] : [['Pencere', 'Arka alında, ' + fm(T - 30) + ' × ' + fm(a - 30) + ' m']]), ['Menteşe', hn + ' adet']],
    yapi: yapiCiz(AL, C, NT) };
  if (JV) { const ku = [0, 1, 2].includes(+P.hxU) ? +P.hxU : 0, DEN = [3, 2, 2.5][ku], ia = ((W - 30) * (L - 30)) / 1e6; P.hxU = ku; r.levha.push(['Kapasite (tahmini)', Math.floor(ia * DEN) + ' ' + ['tavuk', 'kaz', 'ördek'][ku] + ' · iç zemin ' + F1(ia.toFixed(1)) + ' m²']); }
  return r;
}
MODUL.N = { ad: 'Aspendos sera', anahtar: ['asN'], varsayilan: { asN: 3 }, alan: { asN: [2, 3] }, hesapla: (P) => aspendos(P, false) };
MODUL.J = { ad: 'Hareketli kümes', anahtar: ['hxN', 'hxU'], varsayilan: { hxN: 1, hxU: 0 }, alan: { hxN: [1, 2, 3], hxU: [0, 1, 2] }, hesapla: (P) => aspendos(P, true) };

// Köpek evi (X): arkada çatılı kulübe, önde gezinme alanı xk 0–8 bölüm, xm L yan kolu (−6..6; işaret yön), xd kapının olduğu yüzey
export function kopekYuzeyleri(k, m) {
  const P = 1025, W = 1025, z0 = -k * P, L = [{ c: 0, a: [0, z0], b: [W, z0] }], s = Math.sign(m), n = Math.abs(m);
  for (let i = 0; i < k; i++) { const za = z0 + i * P, zb = za + P; if (!(s < 0 && i == 0)) L.push({ c: 100 + i, a: [0, za], b: [0, zb] }); if (!(s > 0 && i == 0)) L.push({ c: 200 + i, a: [W, za], b: [W, zb] }); }
  if (n) { const x0 = s > 0 ? W : 0, xs = (j) => x0 + s * j * P; for (let j = 0; j < n; j++) { L.push({ c: 300 + j, a: [xs(j), z0], b: [xs(j + 1), z0] }); L.push({ c: 400 + j, a: [xs(j), z0 + P], b: [xs(j + 1), z0 + P] }); } L.push({ c: 500, a: [xs(n), z0], b: [xs(n), z0 + P] }); }
  return L;
}
MODUL.X = {
  ad: 'Köpek evi', anahtar: ['xk', 'xm', 'xd'], varsayilan: { xk: 2, xm: 0, xd: 0 },
  hesapla(P) {
    P.xk = Math.max(0, Math.min(8, Math.round(+P.xk) || 0)); P.xm = Math.max(-6, Math.min(6, Math.round(+P.xm) || 0)); if (P.xk < 2) P.xm = 0;
    const Pp = 1025, W = 1025, He = 1525, Fy = 300, RR = He + W / 2, k = P.xk, z0 = -k * Pp, L = Pp, s = Math.sign(P.xm), na = Math.abs(P.xm), x0 = s > 0 ? W : 0, xs = (j) => x0 + s * j * Pp;
    const PN = kopekYuzeyleri(k, P.xm); if (!PN.some((p) => p.c === +P.xd)) P.xd = 0; P.xd = +P.xd; const DP = PN.find((p) => p.c === P.xd);
    const M = [], seen = new Set(), key = (a, b) => { const ka = a.map(Math.round).join(), kb = b.map(Math.round).join(); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
    const ad = (a, b, kk) => { const q = key(a, b); if (seen.has(q)) return; seen.add(q); const t = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = +((t - 30) / 10).toFixed(2); M.push({ p: a, q: b, len, k: kk || (LYS.includes(len) ? 'g' : 'o') }); };
    const ZS = []; for (let i = 0; i <= k + 1; i++) ZS.push(z0 + i * Pp);
    ZS.forEach((z) => [0, W].forEach((x) => { if (z >= 0) { ad([x, 0, z], [x, Fy, z]); ad([x, Fy, z], [x, He, z]); } else ad([x, 0, z], [x, He, z]); }));
    for (let i = 0; i < ZS.length - 1; i++) [0, W].forEach((x) => [0, He].forEach((y) => ad([x, y, ZS[i]], [x, y, ZS[i + 1]])));
    if (k) [0, He].forEach((y) => ad([0, y, z0], [W, y, z0]));
    [0, L].forEach((z) => { ad([0, He, z], [W, He, z]); ad([0, 0, z], [W / 2, 0, z]); ad([W / 2, 0, z], [W, 0, z]); ad([0, Fy, z], [W / 2, Fy, z]); ad([W / 2, Fy, z], [W, Fy, z]); ad([W / 2, 0, z], [W / 2, Fy, z]); ad([0, He, z], [W / 2, RR, z]); ad([W, He, z], [W / 2, RR, z]); });
    [0, W / 2, W].forEach((x) => ad([x, Fy, 0], [x, Fy, L])); ad([W / 2, RR, 0], [W / 2, RR, L]);
    if (na) { const za = z0, zb = z0 + Pp; for (let j = 1; j <= na; j++) [za, zb].forEach((z) => { ad([xs(j), 0, z], [xs(j), He, z]); [0, He].forEach((y) => ad([xs(j - 1), y, z], [xs(j), y, z])); }); [0, He].forEach((y) => ad([xs(na), y, za], [xs(na), y, zb])); }
    const ya = k ? 50 : Fy + 50, yb = He - 35, ym = (ya + yb) / 2, dA = [DP.a[0], DP.a[1]], dB = [DP.b[0], DP.b[1]], ux = (dB[0] - dA[0]) / Pp, uz = (dB[1] - dA[1]) / Pp, pa = [dA[0] + 35 * ux, dA[1] + 35 * uz], pb = [dB[0] - 35 * ux, dB[1] - 35 * uz];
    [pa, pb].forEach((q) => { ad([q[0], ya, q[1]], [q[0], ym, q[1]], 'd'); ad([q[0], ym, q[1]], [q[0], yb, q[1]], 'd'); }); [ya, ym, yb].forEach((y) => ad([pa[0], y, pa[1]], [pb[0], y, pb[1]], 'd'));
    const { C, NT } = siniflandir(M, W);
    const g = {}; let tl = 0; M.forEach((m) => { const l1 = +m.len.toFixed(1), q = String(l1); g[q] = g[q] || { len: l1, q: 0, s: !LYS.includes(l1) }; g[q].q++; tl += m.len / 100; });
    const gv = Object.values(g), parca = gv.sort((x, y) => y.len - x.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim, ' + F1(fiyatBoyu(o.len, 199.5)) + ' fiyatı)' : ''), o.q + ' adet']);
    parca.push(['Toplam profil', M.length + ' adet'], ['Boy çeşidi', gv.filter((o) => !o.s).length + ' standart + ' + gv.filter((o) => o.s).length + ' özel'], ['Kelebek menteşe', '2 adet'], ['Civata somun seti', M.length * 4 + ' adet'], ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg']);
    let ct = 0; const kon = Object.entries(C).sort().map(([q, v]) => { ct += v; return [q + ' ' + (CN[q] || ''), v + ' adet']; }); kon.push(['Toplam konnektör', ct + ' adet']);
    const xmin = s < 0 ? xs(na) : 0, xmax = s > 0 ? xs(na) : W, Wo = xmax - xmin + 30, Lo = L - z0 + 30, Ho = RR + 15, ga = (k * Pp * W + na * Pp * Pp) / 1e6;
    const dTx = P.xd == 0 ? (k ? 'Gezinme alanının önünde' : 'Kulübenin önünde, raf hizasının üstünde') : P.xd < 200 ? 'Sağ yanda' : P.xd < 300 ? 'Sol yanda' : 'Yan kolda';
    return { parca, kon, olcu: fm(Wo) + ' × ' + fm(Lo) + ' m', alt: 'saçak ' + fm(He + 15) + ' m · mahya ' + fm(Ho) + ' m',
      levha: [['Kulübe', '1 bölüm, ' + fm(W + 30) + ' × ' + fm(Pp + 30) + ' m'], ['Raf', 'Yerden 30 cm'], ['Gezinme alanı', k ? k + ' bölüm' : 'Yok'], ...(na ? [['Yan kol (L)', na + ' bölüm, ' + (s > 0 ? 'solda' : 'sağda')]] : []), ...(k ? [['Gezinme alanı (iç)', F1(ga.toFixed(1)) + ' m²']] : []), ['Kapı', dTx]],
      yapi: yapiCiz(M, C, NT), yuzey: PN };
  },
};

/* ---------------- Modüler sebze yatağı (V) ---------------- */
// Kare ızgarası: her kare 26 cm; iki köşe doğrudan birleşince 34 cm. Yükseklik 30 cm.
export const VB = { c: 260, o: 40, H: 300, rK: 155, rT: 70, aK: 185, aT: 105, lap: 30, cap: 14 };
export const VCOL = { b: { ad: 'Bej', hex: 0xd9c7a1, css: '#d9c7a1' }, g: { ad: 'Gri', hex: 0xb6babd, css: '#b6babd' } };
export const VSHP = { R: 'Dikdörtgen', L: 'L şekli', U: 'U şekli', T: 'T şekli', X: 'Serbest' };
export const VAMAX = 4, VNMAX = 60;
function vBase(b) {
  const A = b.a, k = b.k, C3 = b.t == 'U' ? b.c || b.b : b.b, B = b.t == 'U' ? Math.max(b.b, C3) : b.b, c = [];
  if (b.t == 'U') { for (let j = 0; j < B; j++) { const r = []; for (let i = 0; i < A; i++) r.push(j >= B - k || (i < k && j >= B - b.b) || (i >= A - k && j >= B - C3) ? 1 : 0); c.push(r); } return c; }
  for (let j = 0; j < B; j++) { const r = []; for (let i = 0; i < A; i++) { let f = 1;
    if (b.t == 'L') f = i < k || j >= B - k ? 1 : 0; else if (b.t == 'T') { const s = Math.floor((A - k) / 2); f = j < k || (i >= s && i < s + k) ? 1 : 0; } else if (b.t == 'X') f = b.m && b.m[j] && b.m[j][i] ? 1 : 0;
    r.push(f); } c.push(r); }
  return c;
}
function vRot(c, r) { for (let q = 0; q < (r & 3); q++) { const H = c.length, W = c[0].length, n = []; for (let i = 0; i < W; i++) { const row = []; for (let j = H - 1; j >= 0; j--) row.push(c[j][i]); n.push(row); } c = n; } return c; }
function vTrim(c) { let j0 = 0, j1 = c.length - 1, i0 = 0, i1 = c[0].length - 1; const er = (j) => !c[j].some(Boolean), ec = (i) => !c.some((r) => r[i]);
  while (j0 < j1 && er(j0)) j0++; while (j1 > j0 && er(j1)) j1--; while (i0 < i1 && ec(i0)) i0++; while (i1 > i0 && ec(i1)) i1--; return c.slice(j0, j1 + 1).map((r) => r.slice(i0, i1 + 1)); }
export function vMask(b) { return vTrim(vRot(vBase(b), b.r)); }
export function vKmax(b) { return Math.min(VAMAX, b.t == 'L' ? Math.min(b.a, b.b) - 1 : b.t == 'U' ? Math.min(Math.floor((b.a - 1) / 2), b.b - 1, (b.c || b.b) - 1) : b.t == 'T' ? Math.min(b.a - 2, b.b - 1) : 1); }
export function vAmax(b) { return b.t == 'R' ? VAMAX : b.t == 'X' ? 20 : VNMAX; }
export function vAmin(b) { return b.t == 'L' ? b.k + 1 : b.t == 'U' ? 2 * b.k + 1 : b.t == 'T' ? b.k + 2 : 1; }
export function vBmin(b) { return b.t == 'R' || b.t == 'X' ? 1 : b.k + 1; }
export function vFix(b) {
  if (b.t == 'U') { b.c = Math.max(1, Math.min(VNMAX, (b.c || b.b) | 0)); b.c = Math.max(b.c, (b.k | 0) + 1); } else delete b.c;
  b.a = Math.max(1, Math.min(vAmax(b), b.a | 0)); b.b = Math.max(1, Math.min(VNMAX, b.b | 0)); b.k = Math.max(1, b.k | 0);
  if (b.t != 'R' && b.t != 'X') { b.a = Math.max(b.a, vAmin(b)); b.b = Math.max(b.b, vBmin(b)); b.k = Math.min(b.k, Math.max(1, vKmax(b))); }
}
export function vValid(c) {
  const H = c.length, W = H ? c[0].length : 0; let n = 0, s = null;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (c[j][i]) { n++; if (!s) s = [i, j]; }
  if (!n) return 'Yatakta en az bir kare olmalı.';
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) { const a = c[j][i], b = c[j][i + 1], d = c[j + 1][i], e = c[j + 1][i + 1]; if ((a && e && !b && !d) || (b && d && !a && !e)) return 'İki kare yalnızca köşeden birbirine değemez; aralarına bir kare ekleyin.'; }
  for (let j = 0; j + 5 <= H; j++) for (let i = 0; i + 5 <= W; i++) { let f = true; for (let q = 0; q < 25 && f; q++) if (!c[j + ((q / 5) | 0)][i + (q % 5)]) f = false; if (f) return 'Yatak eni en fazla 112 cm (3 düz parça) olabilir; ortasına elinizin yetişmesi için.'; }
  const seen = new Set([s.join()]), st = [s];
  while (st.length) { const [i, j] = st.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < W && y < H && c[y][x] && !seen.has(x + ',' + y)) { seen.add(x + ',' + y); st.push([x, y]); } }); }
  return seen.size !== n ? 'Bütün kareler birbirine bağlı olmalı.' : '';
}
function vLoops(c) {
  const H = c.length, W = c[0].length, f = (i, j) => i >= 0 && j >= 0 && i < W && j < H && c[j][i], nx = new Map(), ad = (a, b) => nx.set(a[0] + ',' + a[1], b);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { if (!f(i, j)) continue; if (!f(i, j - 1)) ad([i, j], [i + 1, j]); if (!f(i + 1, j)) ad([i + 1, j], [i + 1, j + 1]); if (!f(i, j + 1)) ad([i + 1, j + 1], [i, j + 1]); if (!f(i - 1, j)) ad([i, j + 1], [i, j]); }
  const loops = [], used = new Set();
  for (const k0 of nx.keys()) { if (used.has(k0)) continue; const pts = []; let k = k0; while (!used.has(k)) { used.add(k); pts.push(k.split(',').map(Number)); const q = nx.get(k); k = q[0] + ',' + q[1]; }
    const N = pts.length, cs = []; for (let t = 0; t < N; t++) { const a = pts[(t - 1 + N) % N], b = pts[t], d = pts[(t + 1) % N], d1 = [b[0] - a[0], b[1] - a[1]], d2 = [d[0] - b[0], d[1] - b[1]]; if (d1[0] == d2[0] && d1[1] == d2[1]) continue; cs.push({ p: b, d1, d2, cv: d1[0] * d2[1] - d1[1] * d2[0] > 0 }); }
    loops.push(cs); }
  return loops;
}
// Bir yatağın parçaları ve dış yüz yolu (mm; yatak yerel: ızgaranın sol üstü 0,0)
export function vGeo(b) {
  const c = vMask(b), err = vValid(c), h = c.length, w = c[0].length, G = { c, w, h, err, Wo: w * VB.c + 2 * VB.o, Lo: h * VB.c + 2 * VB.o, duz: 0, kose: 0, ters: 0, loops: [], cells: 0 };
  c.forEach((r) => r.forEach((v) => { if (v) G.cells++; })); if (err) return G;
  const L = (d) => [d[1], -d[0]];
  vLoops(c).forEach((cs) => {
    const N = cs.length, Q = cs.map((k) => { const a = L(k.d1), bb = L(k.d2); return [k.p[0] * VB.c + VB.o * (a[0] + bb[0]), k.p[1] * VB.c + VB.o * (a[1] + bb[1])]; }), S = [], J = [];
    cs.forEach((k, t) => {
      const R = k.cv ? VB.rK : VB.rT, q = Q[t], d1 = k.d1.map(Math.sign), d2 = k.d2.map(Math.sign), T1 = [q[0] - d1[0] * R, q[1] - d1[1] * R], T2 = [q[0] + d2[0] * R, q[1] + d2[1] * R],
        rn = k.cv ? [-d1[1], d1[0]] : [d1[1], -d1[0]], C = [T1[0] + rn[0] * R, T1[1] + rn[1] * R], a0 = Math.atan2(T1[1] - C[1], T1[0] - C[0]), a1 = Math.atan2(T2[1] - C[1], T2[0] - C[0]);
      let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      for (let s = 0; s <= 12; s++) { const an = a0 + (da * s) / 12, nn = k.cv ? [Math.cos(an), Math.sin(an)] : [-Math.cos(an), -Math.sin(an)]; S.push({ x: C[0] + Math.cos(an) * R, z: C[1] + Math.sin(an) * R, nx: nn[0], nz: nn[1] }); }
      if (k.cv) G.kose++; else G.ters++;
      const k2 = cs[(t + 1) % N], n = Math.abs(k2.p[0] - k.p[0]) + Math.abs(k2.p[1] - k.p[1]); G.duz += n - 1;
      const A = k.cv ? VB.aK : VB.aT, nl = L(d2); for (let i = 0; i < n; i++) { const s = A - VB.lap / 2 + VB.c * i; J.push({ x: q[0] + d2[0] * s, z: q[1] + d2[1] * s, dx: d2[0], dz: d2[1], nx: nl[0], nz: nl[1] }); }
    });
    let ar = 0; for (let i = 0; i < S.length; i++) { const p = S[i], q = S[(i + 1) % S.length]; ar += p.x * q.z - q.x * p.z; }
    G.loops.push({ S, J, ar: ar / 2 });
  });
  G.parts = G.duz + G.kose + G.ters;
  // Destek mili (gijon): 6 veya daha fazla düz parçalı bir kenar varsa yatak gijonludur; hiçbir kenarda 4 düz parça gijonsuz yan yana gelemez.
  G.rods = []; G.rodErr = '';
  { const f = (i, j) => i >= 0 && j >= 0 && i < G.w && j < G.h && G.c[j][i], seen = new Set(), RMAX = 112, runs = [];
    vLoops(G.c).forEach((cs) => { const N = cs.length; cs.forEach((k, t) => { const k2 = cs[(t + 1) % N], n = Math.abs(k2.p[0] - k.p[0]) + Math.abs(k2.p[1] - k.p[1]); runs.push({ k, d: k.d2.map(Math.sign), nd: n - 1 }); }); });
    if (runs.some((r) => r.nd >= 6)) { runs.sort((a, b) => b.nd - a.nd);
      runs.forEach(({ k, d, nd }) => { if (nd < 4) return; const neg = d[0] < 0 || d[1] < 0, inw = [-d[1], d[0]];
        const E = (c) => { const cc = neg ? nd - c : c; return [k.p[0] + d[0] * (cc + 0.5), k.p[1] + d[1] * (cc + 0.5)]; };
        const rod = (c) => { const e = E(c); let ci = [e[0] + inw[0] * 0.5, e[1] + inw[1] * 0.5], steps = 0; while (f(Math.floor(ci[0]), Math.floor(ci[1])) && steps < 99) { ci = [ci[0] + inw[0], ci[1] + inw[1]]; steps++; } if (!steps) return null;
          const far = [ci[0] - inw[0] * 0.5, ci[1] - inw[1] * 0.5], a = [e[0] * VB.c - inw[0] * VB.o, e[1] * VB.c - inw[1] * VB.o], b = [far[0] * VB.c + inw[0] * VB.o, far[1] * VB.c + inw[1] * VB.o], len = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10); return len <= RMAX ? { a, b, len } : null; };
        const fixed = []; for (let c = 0; c <= nd; c++) { const e = E(c), q = [e[0] * VB.c - inw[0] * VB.o, e[1] * VB.c - inw[1] * VB.o]; if (G.rods.some((r) => [r.a, r.b].some((u) => Math.abs(u[0] - q[0]) < 2 && Math.abs(u[1] - q[1]) < 2))) fixed.push(c); }
        const R = []; for (let c = 0; c <= nd; c++) R[c] = rod(c);
        let best = null; const go = (last, list) => { if (nd - last <= 3) { const gaps = []; let pv = 0; list.forEach((c) => { gaps.push(c - pv); pv = c; }); gaps.push(nd - pv); const av = nd / gaps.length;
            const sc = list.filter((c) => !fixed.includes(c)).length * 1e6 + list.reduce((s, c) => s + (fixed.includes(c) ? 0 : R[c].len), 0) * 10 + gaps.reduce((s, g) => s + (g - av) * (g - av), 0); if (!best || sc < best.sc) best = { sc, list: list.slice() }; }
          if (list.length > nd) return; for (let c = last + 1; c <= Math.min(nd, last + 3); c++) { if (!fixed.includes(c) && !R[c]) continue; if (fixed.some((fc) => fc > last && fc < c)) continue; list.push(c); go(c, list); list.pop(); } };
        go(0, []); if (!best) { G.rodErr = 'Bu kenarda 112 cm’yi geçmeyen destek mili konamıyor.'; return; }
        best.list.forEach((c) => { if (fixed.includes(c)) return; const r = R[c], key = [r.a, r.b].map((q) => q.map(Math.round).join(',')).sort().join('|'); if (seen.has(key)) return; seen.add(key); G.rods.push(r); }); }); } }
  G.gij = G.rods.length * 2; G.bolt = 4 * G.parts - 2 * G.gij;
  return G;
}
export function vSoilArea(G) { let a = 0; G.loops.forEach((l) => { let s = 0; const P = l.S.map((p) => [p.x - p.nx * 26, p.z - p.nz * 26]); for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; s += p[0] * q[1] - q[0] * p[1]; } a += s / 2; }); return Math.abs(a) / 1e6; }
export const vDims = (G) => Math.round(G.Wo / 10) + ' × ' + Math.round(G.Lo / 10) + ' cm';
// Bahçe planındaki yatakların parça listesi (yatak sırası ve bahçe ölçüsüyle)
export function yatakListe(D) {
  const GS = D.yataklar.map(vGeo), ok = GS.filter((G) => !G.err), sum = (k) => ok.reduce((a, G) => a + G[k], 0), P = sum('parts'), ar = ok.reduce((a, G) => a + vSoilArea(G), 0), lt = Math.round((ar * 280) / 10) * 10;
  const GJ = {}; ok.forEach((G) => G.rods.forEach((r) => { GJ[r.len] = (GJ[r.len] || 0) + 2; }));
  const parca = [['Düz parça', sum('duz')], ['Köşe parça', sum('kose')], ['Ters köşe parça', sum('ters')]].filter((r) => r[1]).map((r) => [r[0], r[1] + ' adet']);
  parca.push(['Toplam parça', P + ' adet'], ...Object.keys(GJ).sort((a, b) => b - a).map((l) => ['Destek mili (gijon) ' + l + ' cm', GJ[l] + ' adet']), ['Civata somun seti (M6×16)', sum('bolt') + ' adet']);
  const yatak = D.yataklar.map((b, i) => { const G = GS[i]; return ['Yatak ' + (i + 1) + ' · ' + VSHP[b.t] + ' · ' + (G.err ? 'geçersiz' : vDims(G)), G.err ? '—' : [G.duz ? G.duz + ' düz' : '', G.kose + ' köşe', G.ters ? G.ters + ' ters köşe' : '', G.gij ? G.gij + ' gijon' : ''].filter(Boolean).join(' · ')]; });
  return { GS, parca, yatak, parcaSay: P, ekimAlani: ar, toprakLt: lt,
    olcu: D.yataklar.length == 1 && ok.length ? vDims(ok[0]) + ' × 30 cm' : D.yataklar.length + ' yatak · ' + ar.toFixed(2).replace('.', ',') + ' m² ekim alanı',
    alt: 'Renk: ' + VCOL[D.renk].ad + ' · Bahçe ' + (D.bW / 1000).toFixed(2).replace('.', ',') + ' × ' + (D.bL / 1000).toFixed(2).replace('.', ',') + ' m · yükseklik 30 cm · toplam ' + P + ' parça' };
}
// Tasarım kodu: üretim tarafının aracında aynı tasarımı açar
export function yatakKod(D) {
  const bs = D.yataklar.map((b) => [Math.round(b.x / 10), Math.round(b.z / 10), b.r, b.t, b.a, b.b, b.k, b.p || '0'].concat(b.t == 'U' ? [b.c || b.b] : []).join('.') + (b.t == 'X' ? '.' + b.m.map((r) => parseInt(r.map((v) => (v ? 1 : 0)).reverse().join(''), 2).toString(36)).join('-') : ''));
  return 'HG-Y2-' + [Math.round(D.bW / 10), Math.round(D.bL / 10), D.renk].concat(bs).join('_');
}
export function yatakKodAc(txt) {
  const g = String(txt || '').match(/(?:BK-V2|HG-Y2)-([A-Za-z0-9_.\-]+)/); if (!g) return null;
  const v = g[1].replace(/[._-]+$/, '').split('_'); if (v.length < 4) return null;
  const bW = +v[0] * 10, bL = +v[1] * 10, renk = v[2]; if (!(bW >= 1000 && bL >= 1000) || !VCOL[renk]) return null;
  const yataklar = v.slice(3).map((s) => { const f = s.split('.'), b = { x: +f[0] * 10, z: +f[1] * 10, r: +f[2] & 3, t: f[3], a: +f[4], b: +f[5], k: +f[6] || 1 }; if (f[7] && f[7] !== '0') b.p = f[7]; f.splice(7, 1);
    if (b.t == 'U' && f[7]) b.c = +f[7];
    if (b.t == 'X') { b.m = (f[7] || '').split('-').map((r) => { const n = parseInt(r, 36), a = []; for (let i = 0; i < b.a; i++) a.push((n >> i) & 1); return a; }); }
    if (!VSHP[b.t]) throw new Error('şekil'); return b; });
  return { bW, bL, renk, yataklar };
}

/* ---------------- Olimpos sera (S, beşik çatı, 99,5 cm profil) ---------------- */
// Anahtarlar: w profil ('C'), n bölüm 2–10, dr kapı ('S' var / 'N' yok), pl2 kapı yeri ('F' ön, 'FB' ön ve arka), sr çatı (0 beşik),
// sti (beşik çatıda 0), cr ürün seçimi (yalnız bilgi), swn pencereler ('w' + bölüm, L/R yan, W duvar; örn. w1L x2RW)
const CF = { C: { W: 2945.3, bay: 1025, lg: 99.5, po: 99.5, ax: 99.5, sp: 86.53, mr: 99.5, mm: 99.5, bill: 99.5, sm: 41.77, smb: 59.5 },
  F: { W: 2238.2, bay: 775, lg: 74.5, po: 74.5, ax: 74.5, sp: 65.82, mr: 74.5, mm: 74.5, bill: 74.5, sm: 31.41, smb: 59.5 } };
const TT = [1250, 1550, 2000, 2500, 3100], SWANG = (30 * Math.PI) / 180;
const colsOf = (W, T) => (T > 2000 ? [W / 2 - T / 4, W / 2, W / 2 + T / 4] : [W / 2]);
const subd = (xs) => { const o = [xs[0]]; for (let j = 1; j < xs.length; j++) { const g = xs[j] - xs[j - 1], k = Math.max(1, Math.ceil(g / 1525 - 1e-9)); for (let t = 1; t <= k; t++) o.push(xs[j - 1] + (g * t) / k); } return o; };
// Pencere kanadı: e saçak düğümü [x,y], t üst düğüm, za–zb bölme, ang açıklık; kanat çerçevenin içine (35 mm) oturur, üstten asılı
function kanat(e, t, za, zb, ang, nOv) {
  const dx = t[0] - e[0], dy = t[1] - e[1], Ls = Math.hypot(dx, dy), u = [dx / Ls, dy / Ls]; let nr = [-u[1], u[0]]; if (nr[1] < 0) nr = [-nr[0], -nr[1]]; if (nOv) nr = nOv;
  const Lz = sn1((zb - za - 70 - 30) / 10), Lsl = sn1((Ls - 70 - 30) / 10), aZ = Lz * 10 + 30, aS = Lsl * 10 + 30; if (Lz < 20 || Lsl < 20) return null;
  const Hx = e[0] + u[0] * (Ls - 35), Hy = e[1] + u[1] * (Ls - 35), z0 = za + 35, z1 = z0 + aZ;
  const Pn = (d, z, a) => [Hx + d * (-u[0] * Math.cos(a) + nr[0] * Math.sin(a)), Hy + d * (-u[1] * Math.cos(a) + nr[1] * Math.sin(a)), z];
  const mem = (a) => [[Pn(0, z0, a), Pn(0, z1, a)], [Pn(aS, z0, a), Pn(aS, z1, a)], [Pn(0, z0, a), Pn(aS, z0, a)], [Pn(0, z1, a), Pn(aS, z1, a)]];
  return { open: mem(ang), closed: mem(0), Lz, Lsl };
}
// Olimpos ve Pergamon iskeleti (üretim çizimiyle aynı düğümler). sr: kesik çatı; profil boyları yalnız Pergamon'da buradan hesaplanır.
function seraIskelet(c, n, P, swin) {
  const sr = P.sr, a0 = c.po * 10 + 30, Hk = a0 + 15, He = 2 * a0 + 15, Wg = c.W, Tz = sr ? TT[0] : 0, W = Wg + Tz, R = He + Wg / 2, x1 = c.ax * 10 + 30, K = 0.001, CX = colsOf(W, Tz), SM = [], gor = [];
  const M = (a, b, m) => { const len = Math.hypot((b[0] - a[0]) * K, (b[1] - a[1]) * K, (b[2] - a[2]) * K);
    if (sr) { let ll = +((len * 1000 - 30) / 10).toFixed(2); if (m != 'd' && Math.abs(a[0] - b[0]) < 1 && Math.abs(a[2] - b[2]) < 1 && Math.min(a[1], b[1]) < 1) ll = +(ll - 1.5).toFixed(2); if (m != 'd') m = SDG.includes(ll) ? 'g' : 'o'; SM.push({ p: a, q: b, len: ll, k: m || 'g' }); }
    gor.push({ a, b, k: m === 'd' ? 'd' : 'g' }); };
  const H = (y, z, xs) => { const q = subd(xs); for (let j = 0; j < q.length - 1; j++) M([q[j], y, z], [q[j + 1], y, z]); };
  const across = (y, z, sp) => { if (sr) return H(y, z, [0, x1, W - x1, W]); M([0, y, z], [x1, y, z]); M([x1, y, z], [W - x1, y, z], sp ? 'o' : 'g'); M([W - x1, y, z], [W, y, z]); };
  const acc = (y, z) => { if (sr) return H(y, z, y == He ? [0, x1, ...CX, W - x1, W] : [0, x1, W / 2, W - x1, W]); const h = W / 2; M([0, y, z], [x1, y, z]); M([x1, y, z], [h, y, z], 'o'); M([h, y, z], [W - x1, y, z], 'o'); M([W - x1, y, z], [W, y, z]); };
  const dd = (i) => i == 0 || (P.pl2 == 'FB' && i == n), hc = (i) => i == 0 || i == n || (n >= 4 && i % 2 == 0 && i <= n - 2);
  const leaf = (z, fr) => { const ya = 50, yb = He - 35, ym = (ya + yb) / 2, xa = fr ? W - x1 + 35 : 35, xb = fr ? W - 35 : x1 - 35; [xa, xb].forEach((x) => { M([x, ya, z], [x, ym, z], 'd'); M([x, ym, z], [x, yb, z], 'd'); }); [ya, ym, yb].forEach((y) => M([xa, y, z], [xb, y, z], 'd')); };
  const colU = (z) => CX.forEach((h) => { M([h, He, z], [h, He + x1, z]); M([h, He + x1, z], [h, R, z], 'o'); });
  const col = (z) => { const h = W / 2; M([h, 0, z], [h, Hk, z]); M([h, Hk, z], [h, He, z]); colU(z); };
  const PS = (x, z) => { M([x, 0, z], [x, Hk, z]); M([x, Hk, z], [x, He, z]); };
  const f = (c.mr * 10 + 46.36) / ((c.mr + c.mm) * 10 + 92.72);
  for (let i = 0; i <= n; i++) { const z = i * c.bay, end = i == 0 || i == n; PS(0, z); PS(W, z);
    if (end) { PS(x1, z); PS(W - x1, z);
      if (hc(i)) { acc(0, z); if (dd(i)) { const h = W / 2, fr = i == 0; if (sr) H(Hk, z, [x1, W / 2, W - x1]); else { M([x1, Hk, z], [h, Hk, z], 'o'); M([h, Hk, z], [W - x1, Hk, z], 'o'); } M(fr ? [0, Hk, z] : [W - x1, Hk, z], fr ? [x1, Hk, z] : [W, Hk, z]); if (P.dr == 'S') leaf(z, fr); } else acc(Hk, z); acc(He, z); col(z); }
      else { across(0, z, 1); if (dd(i)) { M([0, Hk, z], [x1, Hk, z]); M([W - x1, Hk, z], [W, Hk, z]); leaf(z); } else across(Hk, z, 1); across(He, z, 1); } }
    else if (hc(i)) { acc(He, z); if (sr) { col(z); H(0, z, [0, x1, W / 2, W - x1, W]); } else colU(z); } else across(He, z, 1);
    [[0, 1], [W, -1]].forEach(([x, sg]) => { const mx = x + ((sg * Wg) / 2) * f, my = He + (Wg / 2) * f; M([x, He, z], [mx, my, z]); M([mx, my, z], [x ? W - Wg / 2 : Wg / 2, R, z]); });
    if (sr) H(R, z, [Wg / 2, ...CX, W - Wg / 2]); }
  for (let i = 0; i < n; i++) { const a = i * c.bay, b = a + c.bay; [0, W].forEach((x) => [0, Hk, He].forEach((y) => M([x, y, a], [x, y, b]))); (sr ? [Wg / 2, W - Wg / 2] : [W / 2]).forEach((x) => M([x, R, a], [x, R, b])); [(Wg / 2) * f, W - (Wg / 2) * f].forEach((x) => M([x, He + (Wg / 2) * f, a], [x, He + (Wg / 2) * f, b])); }
  const hw = (Wg / 2) * f, pan = (i, s2) => kanat(s2 ? [W, He] : [0, He], s2 ? [W - hw, He + hw] : [hw, He + hw], i * c.bay, (i + 1) * c.bay, SWANG), wpan = (i, s2) => kanat(s2 ? [W, Hk] : [0, Hk], s2 ? [W, He] : [0, He], i * c.bay, (i + 1) * c.bay, SWANG, s2 ? [1, 0] : [-1, 0]);
  swin.forEach((q) => { const G = q.w ? wpan(q.i, q.s) : pan(q.i, q.s); if (!G) return; G.open.forEach(([a, b]) => gor.push({ a, b, k: 'd', win: 1 }));
    if (sr) G.closed.forEach(([a, b]) => SM.push({ p: a, q: b, len: +((Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) - 30) / 10).toFixed(2), k: 'd', win: 1 })); });
  return { SM, gor, W, He, Hk, R, L: n * c.bay, profil: [[0, 0], [0, He], [Wg / 2, R], [W - Wg / 2, R], [W, He], [W, 0]] };
}
// Dar sera (74,5 cm profil, tek parça mertek, en fazla 4 bölüm)
function darSera(P, swin) {
  const c = CF.F, n = P.n, A = c.ax * 10 + 30, W = 2 * A, Hk = A, He = 2 * A, R = He + A, B = c.bay, L = n * B, { M, ad } = ekleyici(), leaves = [], wl = [];
  const opening = (i) => (i == 0 ? [A, W] : P.pl2 == 'FB' && i == n ? [0, A] : null);
  for (let i = 0; i <= n; i++) { const z = i * B, end = i == 0 || i == n;
    [0, W].forEach((x) => { ad([x, 0, z], [x, Hk, z]); ad([x, Hk, z], [x, He, z]); ad([x, He, z], [A, R, z]); });
    if (end) { ad([0, 0, z], [A, 0, z]); ad([A, 0, z], [W, 0, z]); ad([A, 0, z], [A, Hk, z]); ad([A, Hk, z], [A, He, z]); ad([A, He, z], [A, R, z]); ad([0, He, z], [A, He, z]); ad([A, He, z], [W, He, z]);
      const op = opening(i); [[0, A], [A, W]].forEach(([u0, u1]) => { if (!op || op[0] != u0) ad([u0, Hk, z], [u1, Hk, z]); });
      if (op && P.dr == 'S') { const lf = { kind: 'door', uh: op[0] + 35, uf: op[1] - 35, ya: 35, yb: He - 35 }; leaves.push(lf); const ym = (lf.ya + lf.yb) / 2;
        [lf.uh, lf.uf].forEach((x) => { ad([x, lf.ya, z], [x, ym, z], 'd', lf); ad([x, ym, z], [x, lf.yb, z], 'd', lf); }); [lf.ya, ym, lf.yb].forEach((y) => ad([lf.uh, y, z], [lf.uf, y, z], 'd', lf)); } } }
  for (let i = 0; i < n; i++) { const a = i * B, b = a + B; [0, W].forEach((x) => [0, Hk, He].forEach((y) => ad([x, y, a], [x, y, b]))); ad([A, R, a], [A, R, b]); }
  const span = (i, s2, w2) => (w2 ? kanat(s2 ? [W, Hk] : [0, Hk], s2 ? [W, He] : [0, He], i * B, (i + 1) * B, SWANG, s2 ? [1, 0] : [-1, 0]) : kanat(s2 ? [W, He] : [0, He], [A, R], i * B, (i + 1) * B, SWANG));
  const acik = []; swin.forEach((q) => { const G = span(q.i, q.s, q.w); if (!G) return; const lf = { kind: 'win' }; wl.push(G); G.closed.forEach(([p1, q1]) => ad(p1, q1, 'd', lf)); G.open.forEach(([a, b]) => acik.push({ a, b, k: 'd', win: 1 })); });
  const { C, NT } = siniflandir(M.filter((m) => !(m.lf && m.lf.kind == 'win')), W); if (wl.length) C.PC002 = (C.PC002 || 0) + 4 * wl.length;
  return { M, C, NT, W, He, Hk, R, L, hn: 2 * leaves.length + 2 * wl.length, acik, profil: [[0, 0], [0, He], [A, R], [W, He], [W, 0]] };
}
const sn1 = (v) => { const q = SDG.find((x) => Math.abs(x - v) <= 0.151); return q != null ? q : +(Math.round(v * 10) / 10).toFixed(1); };
function pencereKanat(e, t, za, zb) { const Ls = Math.hypot(t[0] - e[0], t[1] - e[1]), Lz = sn1((zb - za - 70 - 30) / 10), Lsl = sn1((Ls - 70 - 30) / 10); return Lz < 20 || Lsl < 20 ? null : { Lz, Lsl }; }
export function pencereCoz(t, n) { const kept = []; String(t || '').replace(/^w/, '').split('x').filter(Boolean).forEach((q) => { const m = q.match(/^(\d+)([LR])(W?)$/); if (!m) return; const p = { i: +m[1], s: m[2] == 'R' ? 1 : 0, w: m[3] ? 1 : 0 }; if (!(p.i >= 0 && p.i < n)) return; if (kept.some((k) => k.i === p.i && k.s === p.s && k.w === p.w)) return; kept.push(p); }); return kept; }
export const pencereKod = (L) => 'w' + L.map((q) => q.i + (q.s ? 'R' : 'L') + (q.w ? 'W' : '')).join('x');
MODUL.S = {
  ad: 'Sera', anahtar: ['w', 'n', 'dr', 'pl2', 'sr', 'sti', 'cr', 'swn'], varsayilan: { w: 'C', n: 2, dr: 'S', pl2: 'F', sr: 0, sti: 0, cr: 0, swn: 'w' },
  hesapla(P, secenek = {}) {
    if (P.w !== 'F') P.w = 'C'; P.sr = P.w === 'F' ? 0 : P.sr ? 1 : 0; P.sti = 0; if (P.dr !== 'S') P.dr = 'N'; if (P.pl2 !== 'FB') P.pl2 = 'F';
    P.n = Math.max(secenek.kumes ? 1 : 2, Math.min(P.w === 'F' ? 4 : 10, P.n | 0)); P.cr = +P.cr || 0;
    const c = CF[P.w], n = P.n, swin = pencereCoz(P.swn, n); P.swn = pencereKod(swin);
    const fmt2 = (x) => F1(x), satirlar = (g, tp, tl, hn, boy) => { const gv = Object.values(g), r = gv.sort((a, b) => b.len - a.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim, ' + F1(o.s === true ? fiyatBoyu(o.len) : o.s) + ' fiyatı)' : ''), o.q + ' adet']);
      r.push(['Toplam profil', tp + ' adet'], ...(boy ? [['Boy çeşidi', gv.filter((o) => !o.s).length + ' standart + ' + gv.filter((o) => o.s).length + ' özel']] : []), ...(hn ? [['Kelebek menteşe', hn + ' adet']] : []), ['Civata somun seti', tp * 4 + ' adet'], ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg']); return r; };
    const konSatir = (C, sirala) => { let ct = 0; let e = Object.entries(C).filter((x) => x[1] > 0); if (sirala) e = e.sort(); const r = e.map(([k, v]) => { ct += v; return [k + ' ' + (CN[k] || ''), v + ' adet']; }); r.push(['Toplam konnektör', ct + ' adet']); return r; };
    let parca, kon, gor, Wo, Lo, alt, levha, ad;
    if (P.w === 'F') {
      const D = darSera(P, swin), g = {}; let tl = 0; D.M.forEach((m) => { const l1 = +m.len.toFixed(2), k = String(l1); g[k] = g[k] || { len: l1, q: 0, s: !SDG.includes(l1) }; g[k].q++; tl += m.len / 100; });
      parca = satirlar(g, D.M.length, tl, D.hn, true); kon = konSatir(D.C, true); Wo = D.W + 30; Lo = D.L + 30; ad = 'Dar sera';
      alt = fmt2(((Wo * Lo) / 1e6).toFixed(1)) + ' m² · saçak ' + fmt2((Math.round((D.He + 20) / 10) / 100).toFixed(2)) + ' m · mahya ' + fmt2(((D.R + 15) / 1000).toFixed(2)) + ' m';
      gor = D.M.filter((m) => !(m.lf && m.lf.kind == 'win')).map((m) => ({ a: m.p, b: m.q, k: m.k === 'd' ? 'd' : 'g' })).concat(D.acik); var dug = D.NT, iskelet = D;
      levha = [['Bölüm', n + ' × 0,78 m (en fazla 4)'], ['Profil', '74,5 cm, tek parça mertek'], ['Kapı', P.dr === 'S' ? (P.pl2 === 'FB' ? 'Önde ve arkada' : 'Önde') : 'Yok'], ['Pencere', swin.length ? swin.length + ' adet' : 'Yok'], ['Menteşe', D.hn + ' adet']];
    } else {
      const f = n + 1, m = n < 4 ? 0 : Math.floor((n - 2) / 2), dB = P.pl2 == 'FB' ? 1 : 0, d = 1 + dB, lv = P.dr == 'S' ? d : 0, H0 = 2 * (c.po * 10 + 30) + 15, cl = c.ax * 10 + 30, wd = cl - 40,
        rl = Math.round((wd - 60) * 10) / 100, sl = Math.round(((H0 - 85) / 2 - 30) * 10) / 100, e = 2;
      const R = [['Alın dikmesi alt', c.po, 4 + e], ['Alın dikmesi üst', c.po, 4 + e], ['Alın kuşağı', c.ax, 4 - d], ['Alın kuşağı (özel)', c.sm, 2 * e, fiyatBoyu(c.sm)], ['Alın kuşağı (orta)', c.sp, 2 - e, fiyatBoyu(c.sp)], ['Alın tabanı', c.ax, 4], ['Alın tabanı (özel)', c.sm, 2 * e, fiyatBoyu(c.sm)],
        ['Alın tabanı (orta)', c.sp, 2 - e, fiyatBoyu(c.sp)], ['Alın bağı (özel)', c.sm, 2 * e, fiyatBoyu(c.sm)], ['Alın orta dikme (mahya)', c.ax, e + m], ['Alın orta dikme (mahya, özel)', snapL(c.sm), e + m, fiyatBoyu(snapL(c.sm))], ['Dikme alt', c.po, 2 * f], ['Dikme üst', c.po, 2 * f],
        ['Mahya kirişi', c.lg, n, SDG.includes(c.lg) ? 0 : fiyatBoyu(c.lg)], ['Mertek (mahya parçası)', c.mm, 2 * f], ['Mertek (saçak parçası)', c.mr, 2 * f], ['Saçak kirişi', c.lg, 2 * n], ['Yan kuşak', c.lg, 2 * n], ['Yan taban', c.lg, 2 * n], ['Yatay bağ', c.ax, 2 * f],
        ['Yatay bağ (orta)', c.sp, n + 1 - e - m, fiyatBoyu(c.sp)], ['Yatay bağ (kolonlu, özel)', c.sm, 2 * m, fiyatBoyu(c.sm)], ['Çatı aşığı (mertek bağı)', c.lg, 2 * n], ['Kapı kuşağı', rl, 3 * lv, fiyatBoyu(rl)], ['Kapı dikmesi', sl, 4 * lv, fiyatBoyu(sl)]];
      const C = { PC001: 4 * n + e + m - 2 * (n + 1), PC002: 4 * lv, PC003: 2 * n + 6 + e + 2 * lv + 2 * d + 4 + m, PC004: 2 * n + 2 + 2 * e - d + 2 * (n - 1), PC005: 4, PC006: 4 - d, 'PC008-1': 2, 'PC009-1': 2, 'PC010-1': 2 * (n - 1), 'PC011-1': e, 'PC011-2': 2 - e, 'PC012-1': m, 'PC012-2': n - 1 - m };
      const f0 = (c.mr * 10 + 46.36) / ((c.mr + c.mm) * 10 + 92.72), hw = (c.W / 2) * f0, SZ = pencereKanat([0, H0], [hw, H0 + hw], 0, c.bay), SZW = pencereKanat([0, c.po * 10 + 45], [0, H0], 0, c.bay),
        nwR = SZ ? swin.filter((q) => !q.w).length : 0, nwW = SZW ? swin.filter((q) => q.w).length : 0, nw = nwR + nwW;
      if (nwR) R.push(['Pencere kanadı (boy)', SZ.Lz, 2 * nwR, SDG.includes(SZ.Lz) ? 0 : fiyatBoyu(SZ.Lz)], ['Pencere kanadı (eğim)', SZ.Lsl, 2 * nwR, SDG.includes(SZ.Lsl) ? 0 : fiyatBoyu(SZ.Lsl)]);
      if (nwW) R.push(['Yan pencere kanadı (boy)', SZW.Lz, 2 * nwW, SDG.includes(SZW.Lz) ? 0 : fiyatBoyu(SZW.Lz)], ['Yan pencere kanadı (yükseklik)', SZW.Lsl, 2 * nwW, SDG.includes(SZW.Lsl) ? 0 : fiyatBoyu(SZW.Lsl)]);
      if (nw) C.PC002 += 4 * nw;
      R.forEach((r) => { if (typeof r[1] == 'number') r[1] = +(Math.round(r[1] * 10) / 10).toFixed(1); });
      const hn = 2 * lv + 2 * nw, IS = seraIskelet(c, n, P, swin);
      if (!P.sr) { const g = {}; let tl = 0, tp = 0; R.forEach(([, len, q, sx]) => { if (!q) return; const k = len + (sx ? 's' : ''); g[k] = g[k] || { len, q: 0, s: sx }; g[k].q += q; tl += (len * q) / 100; tp += q; });
        parca = satirlar(g, tp, tl, hn, true); kon = konSatir(C, false); ad = 'Olimpos sera'; }
      else { const { C: C0 } = siniflandir(IS.SM.filter((x) => !x.win), c.W + TT[0]), g = {}; let tl = 0; IS.SM.forEach((x) => { const l1 = +x.len.toFixed(1), k = String(l1); g[k] = g[k] || { len: l1, q: 0, s: !SDG.includes(l1) }; g[k].q++; tl += x.len / 100; });
        const nw0 = IS.SM.filter((x) => x.win).length / 4; if (nw0) C0.PC002 = (C0.PC002 || 0) + 4 * nw0; parca = satirlar(g, IS.SM.length, tl, hn, false); kon = konSatir(C0, true); ad = 'Pergamon sera'; }
      const Tx = P.sr ? TT[0] : 0; Wo = c.W + Tx + 30; Lo = n * c.bay + 30;
      alt = fmt2(((Wo * Lo) / 1e6).toFixed(1)) + ' m² · saçak ' + fmt2((Math.round((H0 + 5) / 10) / 100).toFixed(2)) + ' m · mahya ' + fmt2(((H0 + c.W / 2 + 15) / 1000).toFixed(2)) + ' m';
      gor = IS.gor; var iskelet = IS;
      levha = [['Bölüm', n + ' × 1,02 m (en fazla 10)'], ['Çatı', P.sr ? 'Kesik çatı, 4,23 m geniş' : 'Beşik çatı'], ['Kapı', P.dr === 'S' ? (dB ? 'Önde ve arkada' : 'Önde') : 'Yok'], ['Pencere', swin.length ? swin.length + ' adet (' + nwR + ' çatıda, ' + nwW + ' yan duvarda)' : 'Yok'], ['Menteşe', hn + ' adet']];
    }
    const dugum = []; const seen = new Set(); gor.forEach((u) => { if (u.win || u.k === 'd') return; [u.a, u.b].forEach((q) => { const k = q.map(Math.round).join(); if (!seen.has(k)) { seen.add(k); dugum.push({ p: q, kod: 'PC' }); } }); });
    return { parca, kon, olcu: fmt2((Wo / 1000).toFixed(2)) + ' × ' + fmt2((Lo / 1000).toFixed(2)) + ' m', alt, levha, ad, ek: { Wo, Lo, ia: ((Wo - 60) * (Lo - 60)) / 1e6 }, sera: { W: iskelet.W, L: iskelet.L, profil: iskelet.profil, kapi: P.dr === 'S' ? (P.pl2 === 'FB' ? 2 : 1) : 0 }, yapi: { uye: gor, dugum }, pencere: swin };
  },
};

/* ---------------- Yatak destek üniteleri (Z) ---------------- */
// zdA yatak eni (kare) 2–4, zdB yatak boyu (kare), zdC renk b/g, zdT 0 düz iskelet / 1 kemer tipi (iki yatak arası geçiş)
const ZDB = [3, 9];
MODUL.Z = {
  ad: 'Yatak destek ünitesi', anahtar: ['zdA', 'zdB', 'zdC', 'zdT', 'zdW'], varsayilan: { zdA: 4, zdB: 7, zdC: 'b', zdT: 0, zdW: 0 }, kemerB: [4, 9], eskiKod: '0', // zdW: tekerlek seti (üreticide 5. değer; burada henüz yok, hep 0). Eski 4 değerli kodlar açılır.
  alan: { zdA: [2, 3, 4], zdB: [3, 4, 5, 6, 7, 8, 9], zdC: ['b', 'g'], zdT: [0, 1], zdW: [0] },
  hesapla(P) {
    P.zdA = [2, 3, 4].includes(+P.zdA) ? +P.zdA : 4; P.zdT = +P.zdT === 1 ? 1 : 0; P.zdW = 0; if (!VCOL[P.zdC]) P.zdC = 'b';
    const ZB = P.zdT ? MODUL.Z.kemerB : ZDB; P.zdB = Math.max(ZB[0], Math.min(ZB[1], Math.round(+P.zdB) || 7));
    const a = P.zdA, b = P.zdB, Wo = a * VB.c + 2 * VB.o, Lo = b * VB.c + 2 * VB.o, HB = VB.H, YA = HB + 5.7, col = VCOL[P.zdC];
    const M = [], seen = new Set(), key = (p, q) => { const ka = p.map(Math.round).join(), kb = q.map(Math.round).join(); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
    const BG = vGeo({ x: 0, z: 0, r: 0, t: 'R', a, b, k: 1 }), cift = P.zdT ? 2 : 1, GJ = {};
    let C, NT, nApr, olcu, alt, levha, g = {}, tl = 0;
    if (!P.zdT) {
      const XP = 170, ZO = 1.5, YT = HB + 1515.7, sn = (l) => { const q = LYS.find((v) => Math.abs(v - l) <= 0.151); return q != null ? q : +l.toFixed(1); };
      const ad = (p, q, len) => { const k = key(p, q); if (seen.has(k)) return; seen.add(k); const t = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), L = len != null ? len : sn((t - 30) / 10); M.push({ p, q, len: L, k: LYS.includes(L) ? 'g' : 'o' }); };
      const X = [XP, Wo - XP], Z = [-ZO, Lo + ZO];
      X.forEach((x) => Z.forEach((z) => ad([x, YA, z], [x, YT, z], 149.5)));
      Z.forEach((z) => ad([X[0], YT, z], [X[1], YT, z]));
      const sp = Z[1] - Z[0]; let nk = 1; while (sp / nk - 30 > 1495 + 1e-6) nk++;
      X.forEach((x) => { for (let j = 0; j < nk; j++) ad([x, YT, Z[0] + (sp * j) / nk], [x, YT, Z[0] + (sp * (j + 1)) / nk]); });
      for (let j = 1; j < nk; j++) ad([X[0], YT, Z[0] + (sp * j) / nk], [X[1], YT, Z[0] + (sp * j) / nk]);
      ({ C, NT } = siniflandir(M, Wo)); nApr = 4;
      M.forEach((m) => { const l1 = +m.len.toFixed(1), q = String(l1); g[q] = g[q] || { len: l1, q: 0, s: !LYS.includes(l1) }; g[q].q++; tl += m.len / 100; });
      olcu = fm(Wo) + ' × ' + fm(Lo) + ' m'; alt = 'yatak ' + fm(HB) + ' m · toplam yükseklik ' + fm(HB + 1530.7) + ' m';
      levha = [['Sebze yatağı', Math.round(Wo / 10) + ' × ' + Math.round(Lo / 10) + ' cm, ' + col.ad], ['Dikme', '4 × 149,5 cm'], ['Uzun kuşak', nk > 1 ? nk + ' parça (PC003 ile)' : 'Tek parça'], ...(nk > 1 ? [['Ara kuşak', nk - 1 + ' adet']] : []), ['Yatak üstünden yükseklik', fm(1530.7) + ' m']];
    } else {
      const PL = 59.5, Y1 = YA + PL * 10 + 15, YT = Y1 + PL * 10 + 30, RUN = (PL * 10 + 2 * 31.36) / Math.SQRT2, TOP = PL * 10 + 30, W = 2 * RUN + TOP, gap = W + 3, xA = Wo + 1.49, xB = Wo + gap - 1.49, xa = xA + RUN, xb = xB - RUN, YR = YT + RUN, TW = 2 * Wo + gap;
      const nf = Math.floor((b - 1) / 3) + 1, k0 = Math.floor((b - 1 - 3 * (nf - 1)) / 2), Zf = []; for (let i = 0; i < nf; i++) Zf.push(170 + (k0 + 3 * i) * VB.c);
      const ad = (p, q, len) => { const k = key(p, q); if (seen.has(k)) return; seen.add(k); const t = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), L = len != null ? len : +((t - 30) / 10).toFixed(1); M.push({ p, q, len: L, k: LYS.includes(L) ? 'g' : 'o', dk: len != null }); };
      Zf.forEach((z) => { [xA, xB].forEach((x) => { ad([x, YA, z], [x, Y1, z], PL); ad([x, Y1, z], [x, YT, z], PL); }); ad([xA, YT, z], [xa, YR, z]); ad([xB, YT, z], [xb, YR, z]); ad([xa, YR, z], [xb, YR, z]); });
      for (let i = 0; i < nf - 1; i++) [[xA, Y1], [xB, Y1], [xA, YT], [xB, YT], [xa, YR], [xb, YR]].forEach(([x, y]) => ad([x, y, Zf[i]], [x, y, Zf[i + 1]]));
      ({ C, NT } = siniflandir(M, TW));
      M.forEach((m) => { if (m.dk) m.len = PL; m.len = +(+m.len).toFixed(1); m.k = LYS.includes(m.len) ? 'g' : 'o'; });
      nApr = 2 * nf; M.forEach((m) => { const q = String(m.len); g[q] = g[q] || { len: m.len, q: 0, s: !LYS.includes(m.len) }; g[q].q++; tl += m.len / 100; });
      olcu = fm(TW) + ' × ' + fm(Lo) + ' m'; alt = 'yatak ' + fm(HB) + ' m · toplam yükseklik ' + fm(YR + 15) + ' m';
      levha = [['Sebze yatağı', '2 × ' + Math.round(Wo / 10) + ' × ' + Math.round(Lo / 10) + ' cm, ' + col.ad], ['Kemer sayısı', nf + ' adet'], ['Kemer aralığı', '78 cm'], ['Geçiş genişliği', fm(gap - 33) + ' m'], ['Saçak yüksekliği', fm(YT + 15) + ' m'], ['Tepe yüksekliği', fm(YR + 15) + ' m']];
    }
    Object.keys(C).forEach((k) => { if (/^Diğer/.test(k)) delete C[k]; });
    (BG.rods || []).forEach((r) => { GJ[r.len] = (GJ[r.len] || 0) + 2 * cift; });
    const parca = Object.values(g).sort((x, y) => y.len - x.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim, ' + F1(fiyatBoyu(o.len, 199.5)) + ' fiyatı)' : ''), o.q + ' adet']);
    parca.push(['Toplam profil', M.length + ' adet'], ['Profil yatak birleştirme aparatı', nApr + ' adet'], ['Civata somun seti', M.length * 4 + ' adet'], ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg'],
      ['Sebze yatağı (' + col.ad + ')' + (cift > 1 ? ' × 2' : ''), cift * (BG.parts || 0) + ' parça'], ...[['Yatak düz parça', cift * BG.duz], ['Yatak köşe parça', cift * BG.kose]].filter((r) => r[1]).map((r) => [r[0], r[1] + ' adet']),
      ...Object.keys(GJ).sort((p, q) => q - p).map((l) => ['Yatak destek mili (gijon) ' + l + ' cm', GJ[l] + ' adet']), ['Yatak civata somun seti (M6×16)', cift * (BG.bolt || 0) + ' adet']);
    let ct = 0; const kon = Object.entries(C).sort().map(([k, v]) => { ct += v; return [k + ' ' + (CN[k] || ''), v + ' adet']; }); kon.push(['Toplam konnektör', ct + ' adet']);
    return { parca, kon, olcu, alt, levha, yapi: yapiCiz(M, C, NT), yatak: { G: BG, cift, renk: P.zdC } };
  },
};

/* ---------------- Salma kuş kafesi (Q) ---------------- */
// qgw genişlik (bölüm 1–5), qgl uzunluk (bölüm 1–5), qgh yükseklik (0: 2 m, 1: 3 m), qgb kuş türü (0–15; yalnız bilgi). Düz çatı, tek kapı, hepsi 99,5 cm profil.
const fx2 = (x) => String(+x.toFixed(2)).replace('.', ',');
MODUL.Q = {
  ad: 'Salma kuş kafesi', anahtar: ['qgw', 'qgl', 'qgh', 'qgb'], varsayilan: { qgw: 1, qgl: 2, qgh: 0, qgb: 0 },
  alan: { qgw: [1, 2, 3, 4, 5], qgl: [1, 2, 3, 4, 5], qgh: [0, 1], qgb: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  hesapla(P) {
    const kl = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || a)); P.qgw = kl(P.qgw, 1, 5); P.qgl = kl(P.qgl, 1, 5); P.qgh = P.qgh ? 1 : 0; P.qgb = kl(P.qgb, 0, 15);
    const s = 1025, nx = P.qgw, nz = P.qgl, ny = P.qgh ? 3 : 2, W = nx * s, L = nz * s, H = ny * s, i0 = Math.floor((nx - 1) / 2), DH = 2 * s, X = (j) => j * s, Y = (k) => k * s, Z = (i) => i * s;
    const { M, ad } = ekleyici();
    const face = (z, door) => { for (let k = 0; k <= ny; k++) for (let j = 0; j < nx; j++) { if (door && j == i0 && k == 1) continue; ad([X(j), Y(k), z], [X(j + 1), Y(k), z]); } for (let j = 0; j <= nx; j++) for (let k = 0; k < ny; k++) ad([X(j), Y(k), z], [X(j), Y(k + 1), z]); };
    face(0, true); face(L, false);
    const a2 = Math.min(nx, nz), b2 = Math.max(nx, nz), ncol = a2 >= 2 && b2 >= 3 ? a2 - 1 : 0, lz = nz >= nx, ev = b2 % 2 == 0, cpos = [];
    if (ncol) { if (lz) for (let j = 1; j < nx; j++) cpos.push([X(j), L / 2]); else for (let i = 1; i < nz; i++) cpos.push([W / 2, Z(i)]); }
    const seg2 = (a, b, mid) => { if (!mid) { ad(a, b); return; } ad(a, mid); ad(mid, b); };
    [0, W].forEach((x) => { for (let k = 0; k <= ny; k++) for (let i = 0; i < nz; i++) { const sp = ncol && lz && !ev && k == 0 && i == Math.floor(nz / 2); seg2([x, Y(k), Z(i)], [x, Y(k), Z(i + 1)], sp ? [x, 0, L / 2] : null); } for (let i = 0; i <= nz; i++) for (let k = 0; k < ny; k++) ad([x, Y(k), Z(i)], [x, Y(k + 1), Z(i)]); });
    for (let i = 0; i <= nz; i++) { if (ncol && lz && ev && i == nz / 2) continue; for (let j = 0; j < nx; j++) { const sp = ncol && !lz && !ev && i > 0 && i < nz && j == Math.floor(nx / 2); seg2([X(j), H, Z(i)], [X(j + 1), H, Z(i)], sp ? [W / 2, H, Z(i)] : null); } }
    for (let j = 0; j <= nx; j++) { if (ncol && !lz && ev && j == nx / 2) continue; for (let i = 0; i < nz; i++) { const sp = ncol && lz && !ev && j > 0 && j < nx && i == Math.floor(nz / 2); seg2([X(j), H, Z(i)], [X(j), H, Z(i + 1)], sp ? [X(j), H, L / 2] : null); } }
    cpos.forEach(([x, z]) => { for (let k = 0; k < ny; k++) ad([x, Y(k), z], [x, Y(k + 1), z]); });
    [...new Set(cpos.map((c) => c[1]))].forEach((z) => { const xs = []; for (let j = 0; j <= nx; j++) xs.push(X(j)); if (!lz && !ev) xs.push(W / 2); xs.sort((p, q) => p - q); for (let t = 1; t < xs.length; t++) ad([xs[t - 1], 0, z], [xs[t], 0, z]); });
    const lf = { ax: 'z', c: 0, out: -1, uh: X(i0) + 35, uf: X(i0 + 1) - 35, ya: 35, yb: DH - 35, kind: 'door' };
    { const mw = 1, mh = Math.ceil((lf.yb - lf.ya) / s - 1e-9), pt = (u, y) => [u, y, 0], gx = (i) => lf.uh + ((lf.uf - lf.uh) * i) / mw, gy = (k) => lf.ya + ((lf.yb - lf.ya) * k) / mh;
      for (let k = 0; k <= mh; k++) for (let i = 0; i < mw; i++) ad(pt(gx(i), gy(k)), pt(gx(i + 1), gy(k)), 'd', lf); for (let i = 0; i <= mw; i++) for (let k = 0; k < mh; k++) ad(pt(gx(i), gy(k)), pt(gx(i), gy(k + 1)), 'd', lf); }
    const { C, NT } = siniflandir(M, W);
    const T = tablo(M, C, [['Kelebek menteşe', '2 adet'], ['Civata somun seti', M.length * 4 + ' adet']]);
    const Wo = W + 30, Lo = L + 30, Ho = H + 30, A = ((W - 30) * (L - 30)) / 1e6;
    return { ...T, olcu: fm(Wo) + ' × ' + fm(Lo) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × uzunluk × yükseklik · iç taban ' + fx2(A) + ' m² · kapı açıklığı 2,04 m · tüm iskelet 99,5 cm profil' + (ncol ? ' · ' + ncol + ' orta kolon' : ''),
      not: 'Genişlik ' + fm(Wo) + ' m, uzunluk ' + fm(Lo) + ' m, yükseklik ' + fm(Ho) + ' m. Her bölüm 102,5 cm (99,5 cm profil + konnektör), bu yüzden ölçüler 1 m değil yaklaşık 1,05 m basamaklarla artar.' + (ncol ? ' Çatı açıklığı büyük olduğu için uzun kenarın ortasına ' + ncol + ' kolon eklendi; kolon ayakları zeminde yan duvarlara profille bağlanır.' : ' Bu ölçüde düz çatı kolonsuz taşınır.') + ' Ön yüzde tek kanatlı, dışarı açılan standart kapı vardır; kapı yüksekliği 2 m ve 3 m kafeste aynıdır. Arka yüz ve sağdaki yan yüz duvara bitişiktir.',
      ek: { A, W: Wo, L: Lo, H: Ho, nx, nz, ncol }, yapi: yapiCiz(M, C, NT) };
  },
};

/* ---------------- Kedi balkon kafesi (F) ---------------- */
// kfw genişlik (bölüm 1–5), kfp derinlik (bölüm 1–3), kfh yükseklik (0: 1,25 m, 1: 1,88 m, 2: 2,5 m), kfs tünek rafı 0–4 (ahşap, pakete dahil değil). 59,5 cm profil, bölüm 62,5 cm.
const KFH = [2, 3, 4];
MODUL.F = {
  ad: 'Kedi balkon kafesi', anahtar: ['kfw', 'kfp', 'kfh', 'kfs'], varsayilan: { kfw: 3, kfp: 2, kfh: 1, kfs: 2 },
  alan: { kfw: [1, 2, 3, 4, 5], kfp: [1, 2, 3], kfh: [0, 1, 2], kfs: [0, 1, 2, 3, 4] },
  hesapla(P) {
    const kl = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || a)); P.kfw = kl(P.kfw, 1, 5); P.kfp = kl(P.kfp, 1, 3); P.kfh = kl(P.kfh, 0, 2); P.kfs = Math.max(0, Math.min(4, Math.round(+P.kfs) || 0));
    const s = 625, nx = P.kfw, nz = P.kfp, ny = KFH[P.kfh], W = nx * s, L = nz * s, H = ny * s, i0 = Math.floor((nx - 1) / 2), dk = Math.min(ny, 3), X = (j) => j * s, Y = (k) => k * s, Z = (i) => i * s;
    const { M, ad } = ekleyici();
    [0, H].forEach((y) => { for (let i = 0; i <= nz; i++) for (let j = 0; j < nx; j++) ad([X(j), y, Z(i)], [X(j + 1), y, Z(i)]); for (let j = 0; j <= nx; j++) for (let i = 0; i < nz; i++) ad([X(j), y, Z(i)], [X(j), y, Z(i + 1)]); });
    [0, W].forEach((x) => { for (let k = 0; k <= ny; k++) for (let i = 0; i < nz; i++) ad([x, Y(k), Z(i)], [x, Y(k), Z(i + 1)]); for (let i = 0; i <= nz; i++) for (let k = 0; k < ny; k++) ad([x, Y(k), Z(i)], [x, Y(k + 1), Z(i)]); });
    const face = (z, door) => { for (let k = 0; k <= ny; k++) for (let j = 0; j < nx; j++) { if (door && j == i0 && k < dk) continue; ad([X(j), Y(k), z], [X(j + 1), Y(k), z]); } for (let j = 0; j <= nx; j++) for (let k = 0; k < ny; k++) ad([X(j), Y(k), z], [X(j), Y(k + 1), z]); };
    face(0, true); face(L, false);
    const lf = { uh: X(i0) + 35, uf: X(i0 + 1) - 35, c: 0, out: -1, ya: 35, yb: Y(dk) - 35 };
    { const mw = 1, mh = Math.max(1, Math.ceil((lf.yb - lf.ya) / s - 1e-9)), gx = (i) => lf.uh + ((lf.uf - lf.uh) * i) / mw, gy = (k) => lf.ya + ((lf.yb - lf.ya) * k) / mh;
      for (let k = 0; k <= mh; k++) for (let i = 0; i < mw; i++) ad([gx(i), gy(k), 0], [gx(i + 1), gy(k), 0], 'd', lf); for (let i = 0; i <= mw; i++) for (let k = 0; k < mh; k++) ad([gx(i), gy(k), 0], [gx(i), gy(k + 1), 0], 'd', lf); }
    const { C, NT } = siniflandir(M, W);
    const Wo = W + 30, Lo = L + 30, Ho = H + 30, fa = ((W - 30) * (L - 30)) / 1e6, shW = W - 120, shD = 380, sha = (P.kfs * shW * shD) / 1e6, ea = fa + sha, cats = ea >= 1.5 ? 1 + Math.floor((ea - 1.5) / 0.9 + 1e-9) : 0;
    const T = tablo(M, C, [['Kelebek menteşe', '2 adet'], ['Civata somun seti', M.length * 4 + ' adet'], ['Ahşap tünek rafı', P.kfs + ' adet · ' + fm(shW) + ' × ' + fm(shD) + ' m'], ['Duvar ankraj seti', 2 * (nz + 1) + ' adet']]);
    return { ...T, olcu: fm(Wo) + ' × ' + fm(Lo) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × derinlik × yükseklik · taban ' + fx2(fa) + ' m² · ' + P.kfs + ' tünek rafı · kapı açıklığı ' + fm(Y(dk) - 15) + ' m',
      not: 'Her bölüm 62,5 cm (59,5 cm profil). Balkon ölçünüze göre genişlik ve derinliği seçin; kafes bina duvarına dayanır. Ahşap tünek rafları kafesin içine asılır, profil iskelete dahil değildir; ölçü ve adetleri listede ayrıca verilir. Ön yüzde tek kanatlı, dışarı açılan kapı vardır. Arka yüz bina duvarına, alt kenar balkon zeminine sabitlenir.',
      ek: { fa, sha, ea, cats, shW, shD, Ho }, yapi: yapiCiz(M, C, NT) };
  },
};

/* ---------------- Odunluk (W) ---------------- */
// odn uzunluk (bölüm 2–6), odd derinlik (0: 0,83 m, 1: 1,08 m, 2: 1,28 m), odh yükseklik (0: 1,28 m, 1: 1,58 m, 2: 1,91 m), odk kapı (0/1), odc çatı örtüsü (0 branda, 1 sunta, 2 sac; yalnız bilgi),
// ods odun türü (0–9; yalnız bilgi), odr çatı (0 beşik, 1 düz). Ev duvarına dayalı, 74,5 cm profil ağırlıklı.
export const ODD = [400, 525, 625], ODH = [[2, 625], [2, 775], [3, 625]], ODS = 775;
MODUL.W = {
  ad: 'Odunluk', anahtar: ['odn', 'odd', 'odh', 'odk', 'odc', 'ods', 'odr'], varsayilan: { odn: 3, odd: 1, odh: 1, odk: 0, odc: 2, ods: 0, odr: 0 },
  alan: { odn: [2, 3, 4, 5, 6], odd: [0, 1, 2], odh: [0, 1, 2], odk: [0, 1], odc: [0, 1, 2], ods: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], odr: [0, 1] },
  hesapla(P) {
    const kl = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || a)); P.odn = kl(P.odn, 2, 6); P.odd = Math.max(0, Math.min(2, Math.round(+P.odd) || 0)); P.odh = Math.max(0, Math.min(2, Math.round(+P.odh) || 0)); P.odk = P.odk ? 1 : 0; P.odc = Math.max(0, Math.min(2, Math.round(+P.odc) || 0)); P.ods = Math.max(0, Math.min(9, Math.round(+P.ods) || 0)); P.odr = P.odr ? 1 : 0;
    const s = ODS, n = P.odn, cz = ODD[P.odd], D = 2 * cz, ny = ODH[P.odh][0], hy = ODH[P.odh][1], He = ny * hy, L = n * s, X = (j) => j * cz, Y = (k) => k * hy, Z = (i) => i * s, odr = P.odr, Hr = (j) => (odr ? He : He + Math.min(X(j), D - X(j)));
    const { M, ad } = ekleyici();
    for (let i = 0; i <= n; i++) for (let j = 0; j < 2; j++) ad([X(j), 0, Z(i)], [X(j + 1), 0, Z(i)]);
    for (let j = 0; j <= 2; j++) for (let i = 0; i < n; i++) ad([X(j), 0, Z(i)], [X(j), 0, Z(i + 1)]);
    for (let k = 0; k <= ny; k++) for (let i = 0; i < n; i++) ad([D, Y(k), Z(i)], [D, Y(k), Z(i + 1)]);
    [0, D].forEach((x) => { for (let i = 0; i <= n; i++) for (let k = 0; k < ny; k++) ad([x, Y(k), Z(i)], [x, Y(k + 1), Z(i)]); });
    for (let i = 0; i < n; i++) ad([0, He, Z(i)], [0, He, Z(i + 1)]);
    [0, L].forEach((z) => { for (let k = 0; k <= ny; k++) for (let j = 0; j < 2; j++) ad([X(j), Y(k), z], [X(j + 1), Y(k), z]); for (let k = 0; k < ny; k++) ad([X(1), Y(k), z], [X(1), Y(k + 1), z]); if (!odr) ad([X(1), He, z], [X(1), Hr(1), z]); });
    for (let i = 0; i <= n; i++) for (let j = 0; j < 2; j++) { ad([X(j), Hr(j), Z(i)], [X(j + 1), Hr(j + 1), Z(i)]); ad([X(j), He, Z(i)], [X(j + 1), He, Z(i)]); }
    for (let j = 0; j <= 2; j++) for (let i = 0; i < n; i++) ad([X(j), Hr(j), Z(i)], [X(j), Hr(j), Z(i + 1)]);
    const leaves = [];
    if (P.odk) { for (let i = 0; i < n; i++) { const lt = i % 2 == 0, uh = lt ? Z(i) + 35 : Z(i + 1) - 35, uf = lt ? Z(i + 1) - 35 : Z(i) + 35, lf = { c: 0, out: -1, uh, uf, ya: 35, yb: He - 35 }; leaves.push(lf);
      const mh = Math.max(1, Math.ceil((lf.yb - lf.ya) / s - 1e-9)), gx = (q) => uh + (uf - uh) * q, gy = (k) => lf.ya + ((lf.yb - lf.ya) * k) / mh;
      for (let k = 0; k <= mh; k++) ad([0, gy(k), gx(0)], [0, gy(k), gx(1)], 'd', lf); [0, 1].forEach((q) => { for (let k = 0; k < mh; k++) ad([0, gy(k), gx(q)], [0, gy(k + 1), gx(q)], 'd', lf); }); } }
    const { C, NT } = siniflandir(M, D);
    const Lo = L + 30, Do = D + 30, Ho = He + 30, Rh = Hr(1) + 30, OV = 150, Lr = Lo + 2 * OV;
    const ek = [...(P.odk ? [['Kelebek menteşe', leaves.length * 2 + ' adet']] : []), ['Civata somun seti', M.length * 4 + ' adet'], ...(odr ? [] : [['Yağmur oluğu (öneri, ev tarafındaki saçağa)', fm(Lr) + ' m']])];
    const T = tablo(M, C, ek);
    return { ...T, olcu: fm(Lo) + ' × ' + fm(Do) + ' × ' + fm(Rh) + ' m', alt: odr ? 'Uzunluk × derinlik × toplam yükseklik (iskelet zemininden) · ' + n + ' bölüm · düz çatı' : 'Uzunluk × derinlik × mahya yüksekliği (iskelet zemininden) · saçak ' + fm(Ho) + ' m · ' + n + ' bölüm · beşik çatı, mahya duvara paralel',
      not: ["0,83 m: 2 sıra 33 cm'lik soba odunu veya 1 sıra 60-70 cm'lik odun, arkada hava payı.", "1,08 m: 3 sıra 33 cm'lik veya 2 sıra 50 cm'lik şömine odunu.", "1,28 m: 3 sıra 40 cm'lik veya 2 sıra 60 cm'lik odun; derin istif, arka sıralara uzanmak zorlaşır."][P.odd] + ' (sıra hesabı tavsiyedir) ' +
        (P.odk ? 'Önde her bölümde tek kanat var; komşu kanatlar çift kapı gibi ortadan açılır. Kanatlar kafes olduğu için hava geçer, kar ve savrulan yağmur azalır. ' + leaves.length + ' kanat, ' + leaves.length * 2 + ' menteşe. ' : 'Ön taraf açık: odun yüklemek ve almak kolay, hava en iyi şekilde dolaşır. ') +
        (odr ? 'Düz çatı kar yağmayan, az yağışlı yerler içindir. Su göllenmesin diye örtüyü öne doğru hafif eğimle gerin veya sacın arkasını 3-5 cm takozla yükseltin; branda düz çatıda su tutar, sac tercih edin.' : 'Beşik çatı karı ve yağmuru iki yana atar; kar yağan bölgeler için önerilir. Ev tarafındaki saçağa oluk takın.'),
      ek: { L, D, He, Lo, Do, Ho, Rh, OV, Lr, n }, yapi: yapiCiz(M, C, NT) };
  },
};

/* ---------------- Konteyner iskeleti (C) ---------------- */
// cqd profil yoğunluğu (0: az 99,5 cm, 1: orta 74,5 cm, 2: çok 59,5 cm; kesit 2/3/4 bölüm), cqn uzunluk (bölüm; cqd'ye göre aralık), cqe kapı sayısı (0: tek, 2: iki; kapılar çift kanatlı),
// cqm duvar/çatı kaplaması, cqf zemin kaplaması (kaplama yalnız hesap), cqdr kapı yerleri ('d' + F/B/L/R + yan yüzde başlangıç bölmesi, 'x' ile ayrılır).
export const CQD = [995, 745, 595], CQR = [[2, 9], [2, 12], [2, 16]];
function cqKapilar(P, n, nx) {
  const want = P.cqe == 2 ? 2 : 1, ham = String(P.cqdr == null ? '' : P.cqdr).replace(/^d/, '').split('x').map((t) => { const m = t.match(/^([FBLR])(\d+)$/); return m ? { f: m[1], o: +m[2] } : null; }).filter(Boolean);
  const L = ham.length ? ham : [{ f: 'F', o: 0 }, { f: 'B', o: 0 }].slice(0, want);
  const ok = (d) => (d.f == 'F' || d.f == 'B' ? ((d.o = 0), true) : (d.f == 'L' || d.f == 'R') && n >= nx ? ((d.o = Math.max(0, Math.min(n - nx, d.o))), true) : false), clash = (a, b) => a.f == b.f && (a.f == 'F' || a.f == 'B' || Math.abs(a.o - b.o) < nx);
  const out = []; L.forEach((d) => { if (ok(d) && !out.some((q) => clash(q, d))) out.push(d); });
  const cand = [{ f: 'F', o: 0 }, { f: 'B', o: 0 }, { f: 'R', o: 0 }, { f: 'L', o: 0 }]; while (out.length < want) { const c = cand.find((c) => ok(c) && !out.some((q) => clash(q, c))); if (!c) break; out.push(c); }
  out.length = Math.min(out.length, want); return out;
}
export const cqKapiAdaylari = (cqd, cqn) => { const nx = [2, 3, 4][cqd]; const o = [['F', 0, 'Ön'], ['B', 0, 'Arka']]; if (cqn >= nx) for (const [f, ad] of [['R', 'Sağ yan'], ['L', 'Sol yan']]) for (let b = 0; b <= cqn - nx; b++) o.push([f, b, ad + ' ' + (b + 1) + '. bölme']); return o; };
MODUL.C = {
  ad: 'Konteyner iskeleti', anahtar: ['cqd', 'cqn', 'cqe', 'cqm', 'cqf', 'cqdr'], varsayilan: { cqd: 0, cqn: 4, cqe: 0, cqm: 0, cqf: 0, cqdr: 'dF0' },
  alan: { cqd: [0, 1, 2], cqe: [0, 2], cqm: [0, 1, 2, 3], cqf: [0, 1, 2] },
  hesapla(P) {
    P.cqd = Math.max(0, Math.min(2, Math.round(+P.cqd) || 0)); P.cqe = +P.cqe == 2 ? 2 : 0; P.cqm = Math.max(0, Math.min(3, Math.round(+P.cqm) || 0)); P.cqf = Math.max(0, Math.min(2, Math.round(+P.cqf) || 0));
    const [n0, n1] = CQR[P.cqd]; P.cqn = Math.max(n0, Math.min(n1, Math.round(+P.cqn) || n0));
    const p = CQD[P.cqd], s = p + 30, nx = [2, 3, 4][P.cqd], ny = nx, n = P.cqn, W = nx * s, H = ny * s, L = n * s, X = (j) => j * s, Y = (k) => k * s, Z = (i) => i * s;
    const DR = cqKapilar(P, n, nx); P.cqdr = 'd' + DR.map((q) => q.f + q.o).join('x');
    const { M, ad } = ekleyici();
    [0, H].forEach((y) => { for (let i = 0; i <= n; i++) for (let j = 0; j < nx; j++) ad([X(j), y, Z(i)], [X(j + 1), y, Z(i)]); for (let j = 0; j <= nx; j++) for (let i = 0; i < n; i++) ad([X(j), y, Z(i)], [X(j), y, Z(i + 1)]); });
    const sd = (x) => DR.find((d) => d.f == (x ? 'R' : 'L'));
    [0, W].forEach((x) => { const d = sd(x), inD = (i) => d && i > d.o && i < d.o + nx, bayD = (i) => d && i >= d.o && i < d.o + nx; for (let i = 0; i <= n; i++) { if (inD(i)) continue; for (let k = 0; k < ny; k++) ad([x, Y(k), Z(i)], [x, Y(k + 1), Z(i)]); } for (let k = 0; k <= ny; k++) for (let i = 0; i < n; i++) { if (k > 0 && k < ny && bayD(i)) continue; ad([x, Y(k), Z(i)], [x, Y(k), Z(i + 1)]); } });
    const dF = DR.some((d) => d.f == 'F'), dB = DR.some((d) => d.f == 'B');
    [[0, dF], [n, dB]].forEach(([i, dr]) => { if (dr) return; for (let j = 1; j < nx; j++) for (let k = 0; k < ny; k++) ad([X(j), Y(k), Z(i)], [X(j), Y(k + 1), Z(i)]); for (let k = 1; k < ny; k++) for (let j = 0; j < nx; j++) ad([X(j), Y(k), Z(i)], [X(j + 1), Y(k), Z(i)]); });
    const ya = 35, yb = H - 35, xm = W / 2 - 17.5, mh = Math.ceil((yb - ya) / s - 1e-9), mw = Math.ceil((xm - 35) / s - 1e-9); let nleaf = 0;
    const leaf = (z, out, left) => { const xa = left ? 35 : W - 35, xb = left ? xm : W - xm, lf = { z, out, xh: xa, xa, xb, left }; nleaf++; const gx = (i) => xa + ((xb - xa) * i) / mw, gy = (k) => ya + ((yb - ya) * k) / mh;
      for (let k = 0; k <= mh; k++) for (let i = 0; i < mw; i++) ad([gx(i), gy(k), z], [gx(i + 1), gy(k), z], 'd', lf); for (let i = 0; i <= mw; i++) for (let k = 0; k < mh; k++) ad([gx(i), gy(k), z], [gx(i), gy(k + 1), z], 'd', lf); };
    if (dF) { leaf(0, -1, true); leaf(0, -1, false); } if (dB) { leaf(Z(n), 1, true); leaf(Z(n), 1, false); }
    const leafS = (x, out, z0, z1, left) => { const zm = (z0 + z1) / 2, za = left ? z0 + 35 : z1 - 35, zb = left ? zm - 17.5 : zm + 17.5, mwS = Math.ceil(Math.abs(zb - za) / s - 1e-9), lf = { ax: 'x', x, out, zh: za, za, zb, left }; nleaf++; const gz = (i) => za + ((zb - za) * i) / mwS, gy = (k) => ya + ((yb - ya) * k) / mh;
      for (let k = 0; k <= mh; k++) for (let i = 0; i < mwS; i++) ad([x, gy(k), gz(i)], [x, gy(k), gz(i + 1)], 'd', lf); for (let i = 0; i <= mwS; i++) for (let k = 0; k < mh; k++) ad([x, gy(k), gz(i)], [x, gy(k + 1), gz(i)], 'd', lf); };
    [0, W].forEach((x) => { const d = sd(x); if (d) { leafS(x, x ? 1 : -1, Z(d.o), Z(d.o + nx), true); leafS(x, x ? 1 : -1, Z(d.o), Z(d.o + nx), false); } });
    const { C, NT } = siniflandir(M, W);
    const T = tablo(M, C, [['Kelebek menteşe', nleaf * 2 + ' adet'], ['Civata somun seti', M.length * 4 + ' adet']]);
    const Wo = W + 30, Lo = L + 30, Ho = H + 30;
    return { ...T, olcu: fm(Wo) + ' × ' + fm(Lo) + ' × ' + fm(Ho) + ' m', alt: 'Genişlik × uzunluk × yükseklik · ' + fm((Wo * Lo) / 1000) + ' m² taban · profil ' + F1(p / 10) + ' cm',
      not: 'Tüm iskelet (zemin, duvar, çatı, kapı) ' + F1(p / 10) + ' cm profille kurulur; ızgara aralığı ' + F1(s / 10) + ' cm. Genişlik ' + fm(Wo) + ' m, yükseklik ' + fm(Ho) + ' m (sabit, 2,5 m civarı). Her kapı ortadan yanlara açılan çift kanatlıdır (buzdolabı gibi): 2 kanat + her kanatta 2 menteşe. Kapı ön, arka ya da uzun yan duvara konabilir; yan duvarda kapı seçtiğiniz bölmeye ortalanır. Kaplama malzemesi satışa dahil değildir; miktarlar tahmindir, ürün ölçülerini tedarikçinizle doğrulayın.',
      ek: { Wo, Lo, Ho, p, s, n, nx }, yapi: yapiCiz(M, C, NT) };
  },
};


/* ---------------- Kümes (K): üretim kümesi (U) ve hobi kümesi (H) ---------------- */
// ks: 'U' üretim kümesi (kesik çatılı, 4,23 m geniş; Pergamon sera iskeletiyle aynı, 1–10 bölüm) ya da 'H' hobi kümesi (konaklama + gezinti, çatısı yalnız kulübede). Hayvan ku/hu: 0 tavuk, 1 kaz, 2 ördek.
// U: kn bölüm, kd kapı (t/f), kpl kapı yeri (F/FB), kswn pencereler, ku hayvan. H: hk konaklama bölümü 1–3 (gezinti hr = 3 × hk), hu hayvan. kw, kr, kti, hw, hh sabit değerlerdir (eski kodlarla uyum).
export const KUHAYVAN = { ad: ['tavuk', 'kaz', 'ördek'], DEN: [3, 2, 2.5], ER: [0.7, 0.11, 0.55], MK: [1.5, 3.5, 2] };
function hobiKumes(P) {
  const hk = Math.max(1, Math.min(3, Math.round(+P.hk) || 1)), hr = 3 * hk, hu = [0, 1, 2].includes(+P.hu) ? +P.hu : 0;
  const [ra, rb] = [595, 745], LP = 1495, a = 1025, He = LP + 45, W = Math.SQRT2 * (ra + rb + 29) + 90, R = He + W / 2, n = hr + hk, L = n * a, Z = hr * a, SD = [59.5, 74.5, 99.5, 119.5, 149.5], M = [];
  const x1 = W - 1550 - 30 >= 400 ? 775 : 625, fr = (rb + 46.36) / (ra + rb + 92.72), pl = (u, v) => +((v - u - 30) / 10).toFixed(2), ad = (p, q, len, k, t) => M.push({ p, q, len, t, k: k || (SD.includes(len) ? 'g' : 'o') }), ya = 50, yb = He - 35, sl = +((He - 115) / 10).toFixed(1), rl = (x1 - 100) / 10, YP = 485;
  for (let i = 0; i <= n; i++) { const z = i * a, end = i == 0 || i == n, pk = i >= hr, sp = (x) => { ad([x, 0, z], [x, YP, z], (YP - 45) / 10); ad([x, YP, z], [x, He, z], (He - YP - 30) / 10); };
    (end ? [0, x1, W - x1, W] : [0, W]).forEach((x) => { if (pk) sp(x); else ad([x, 0, z], [x, He, z], LP / 10); });
    if (i == hr) sp(W - x1);
    if (pk) { const qs = [0, W / 2, W]; if (i == hr) qs.push(W - x1); if (i == n) qs.push(x1, W - x1); qs.sort((u, v) => u - v); for (let j = 0; j < qs.length - 1; j++) ad([qs[j], YP, z], [qs[j + 1], YP, z], pl(qs[j], qs[j + 1])); }
    const ac = (y) => { const q = [0, x1, W - x1, W]; for (let j = 0; j < 3; j++) ad([q[j], y, z], [q[j + 1], y, z], pl(q[j], q[j + 1])); }; ac(He); if (end || i == hr) ac(0);
    if (i >= hr) [[0, 1], [W, -1]].forEach(([x, s]) => { const m = [x + ((s * W) / 2) * fr, He + (W / 2) * fr, z]; ad([x, He, z], m, rb / 10); ad(m, [W / 2, R, z], ra / 10); }); }
  for (let i = 0; i < n; i++) { const z0 = i * a, z1 = z0 + a; [0, W].forEach((x) => [0, He].forEach((y) => ad([x, y, z0], [x, y, z1], 99.5))); if (i >= hr) { ad([W / 2, R, z0], [W / 2, R, z1], 99.5); [(W / 2) * fr, W - (W / 2) * fr].forEach((x) => ad([x, He + (W / 2) * fr, z0], [x, He + (W / 2) * fr, z1], 99.5)); ad([W / 2, YP, z0], [W / 2, YP, z1], 99.5); } }
  const y2 = YP + 35, sl2 = +((He - YP - 100) / 10).toFixed(1);
  [[0, W - x1 + 35, W - 35, W - 35, -1, ya, sl], [Z, W - x1 + 35, W - 35, W - 35, -1, y2, sl2], [L, 35, x1 - 35, 35, 1, y2, sl2]].forEach(([z, xa, xb, xh, out, y0, sv]) => { const t = { xh, out }; [xa, xb].forEach((x) => ad([x, y0, z], [x, yb, z], sv, 'd', t)); [y0, yb].forEach((y) => ad([xa, y, z], [xb, y, z], rl, 'd', t)); });
  const { C, NT } = siniflandir(M, W, { diyagonalAtla: true });
  const g = {}; let tl = 0; M.forEach((m) => { const s2 = !SD.includes(m.len), k = m.len + (s2 ? 's' : ''); g[k] = g[k] || { len: m.len, q: 0, s: s2 }; g[k].q++; tl += m.len / 100; });
  const parca = Object.values(g).sort((x, y) => y.len - x.len).map((o) => ['Profil ' + F1(o.len) + ' cm' + (o.s ? ' (özel kesim)' : ''), o.q + ' adet']);
  parca.push(['Toplam profil', M.length + ' adet'], ['Boy çeşidi', Object.values(g).filter((o) => !o.s).length + ' standart + ' + Object.values(g).filter((o) => o.s).length + ' özel'], ['Kelebek menteşe', '6 adet'], ['Civata somun seti', M.length * 4 + ' adet'], ['Profillerin toplam ağırlığı (30×30×1,2 mm)', Math.round(tl * 1.085) + ' kg']);
  let ct = 0; const kon = Object.entries(C).sort().map(([k, v]) => { ct += v; return [k + ' ' + (CN[k] || ''), v + ' adet']; }); kon.push(['Toplam konnektör', ct + ' adet']);
  const hA = ((W - 30) * (hk * a - 30)) / 1e6, rA = ((W - 30) * (Z - 30)) / 1e6, H = KUHAYVAN, hn = Math.max(1, Math.min(Math.floor(hA * H.DEN[hu]), Math.floor(rA * [1, 0.4, 0.7][hu])));
  return { parca, kon, olcu: fm(W + 30) + ' × ' + fm(L + 30) + ' m', alt: 'saçak ' + fm(He + 15) + ' m · mahya ' + fm(R + 15) + ' m', ek: { hA, rA, hn, hk, hr, hu, W: W + 30, L: L + 30 }, yapi: yapiCiz(M, C, NT), hu };
}
MODUL.K = {
  ad: 'Kümes', anahtar: ['ks', 'kw', 'kn', 'kd', 'ku', 'kr', 'kti', 'hw', 'hr', 'hk', 'hh', 'hu', 'kpl', 'kswn'],
  varsayilan: { ks: 'U', kw: 0, kn: 2, kd: true, ku: 0, kr: 0, kti: 0, hw: 0, hr: 1, hk: 1, hh: 0, hu: 0, kpl: 'F', kswn: 'w' },
  alan: { ks: ['U', 'H'], ku: [0, 1, 2], hu: [0, 1, 2], hk: [1, 2, 3], kpl: ['F', 'FB'], kd: [true, false], kn: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  hesapla(P) {
    P.ks = P.ks === 'H' ? 'H' : 'U'; P.kd = !!(P.kd === true || +P.kd === 1 || P.kd === 't'); P.kpl = P.kpl === 'FB' ? 'FB' : 'F'; P.kn = Math.max(1, Math.min(10, Math.round(+P.kn) || 2)); P.ku = [0, 1, 2].includes(+P.ku) ? +P.ku : 0; P.hu = [0, 1, 2].includes(+P.hu) ? +P.hu : 0;
    P.hk = Math.max(1, Math.min(3, Math.round(+P.hk) || 1));
    if (P.ks === 'H') { P.hw = 1; P.hh = 2; P.hr = 3 * P.hk; P.kswn = 'w'; return hobiKumes(P); }
    const Q = { w: 'C', n: P.kn, dr: P.kd ? 'S' : 'N', pl2: P.kpl, sr: 1, sti: 0, cr: 0, swn: P.kswn || 'w' };
    const r = MODUL.S.hesapla(Q, { kumes: true }); P.kswn = Q.swn; const ku = P.ku, DEN = KUHAYVAN.DEN[ku], ia = r.ek.ia;
    return { ...r, ek: { ia, hn: Math.floor(ia * DEN), ku } };
  },
};


/* ---------------- Raf sistemi (R) ---------------- */
// rfd profil / kat yüksekliği (0: 59,5 · 1: 74,5 · 2: 99,5 · 3: 29,5 · 4: 39,5 cm), rfw tabla bölümü (1), rfp derinlik sırası (1), rfk kat sayısı (0: otomatik), rfm tabla malzemesi,
// rfL/rfW/rfH oda uzunluk/genişlik/tavan (mm), rfdw kapı duvarı (top/bottom/left/right), rfdp kapı konumu (mm), rfo 0 tek raf · 1 odada, rfb tek raf bölüm sayısı 1–5.
export const RFD = [595, 745, 995, 295, 395], RFT = 225, RFMAXB = 5, RFHMAX = 2500, RDW = 900, AIS = 800, RLIM = { L: [2000, 12000], W: [2000, 12000], H: [2000, 3500] };
const rfClampDoor = (R) => { const ln = R.dw == 'top' || R.dw == 'bottom' ? R.L : R.W; R.dp = Math.max(RDW / 2 + 60, Math.min(ln - RDW / 2 - 60, R.dp)); };
const rfDoorRect = (R) => { const h = RDW / 2 + 100; if (R.dw == 'top') return { x0: R.dp - h, x1: R.dp + h, z0: R.W - RDW - 100, z1: R.W + 1 }; if (R.dw == 'bottom') return { x0: R.dp - h, x1: R.dp + h, z0: -1, z1: RDW + 100 }; if (R.dw == 'left') return { x0: -1, x1: RDW + 100, z0: R.dp - h, z1: R.dp + h }; return { x0: R.L - RDW - 100, x1: R.L + 1, z0: R.dp - h, z1: R.dp + h }; };
function rfGeom(d, w, dp, lv, jl, jr) {
  const p = RFD[d], s = p + 30, nx = w, nz = dp, nk = lv, W = nx * s, L = nz * s, H = (nk - 1) * s + RFT, M = [], seen = new Set(), key = (a, b) => { const ka = a.map(Math.round).join(), kb = b.map(Math.round).join(); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
  const ad = (a, b) => { const kk = key(a, b); if (seen.has(kk)) return; seen.add(kk); const t = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = +((t - 30) / 10).toFixed(2); M.push({ p: a, q: b, len, k: SDG.includes(len) ? 'g' : 'o' }); };
  const X = (j) => j * s, Y = (k) => k * s + RFT, Z = (i) => i * s;
  for (let j = 0; j <= nx; j++) [0, nz].forEach((i) => ad([X(j), -15, Z(i)], [X(j), RFT, Z(i)]));
  for (let k = 0; k < nk; k++) { const y = Y(k), full = k == nk - 1;
    for (let i = 0; i <= nz; i++) for (let j = 0; j < nx; j++) ad([X(j), y, Z(i)], [X(j + 1), y, Z(i)]);
    for (let j = 0; j <= nx; j++) { if (!full && !((j == 0 && !jl) || (j == nx && !jr))) continue; for (let i = 0; i < nz; i++) ad([X(j), y, Z(i)], [X(j), y, Z(i + 1)]); } }
  for (let j = 0; j <= nx; j++) [0, nz].forEach((i) => { for (let k = 0; k < nk - 1; k++) ad([X(j), Y(k), Z(i)], [X(j), Y(k + 1), Z(i)]); });
  return { M, p, s, nx, nz, nk, W, L, H };
}
function rfTek(p, nz, wb, nb, kSel) {
  const s = p + 30, Du = nz * s + 30, len = nb * s + 30, mg = 1200, mxK = Math.max(2, Math.min(8, Math.floor((RFHMAX - 30 - RFT) / s) + 1)), nk = kSel ? Math.max(2, Math.min(mxK, kSel)) : mxK;
  const R = { L: len + 2 * mg, W: Du + 2 * mg, H: 3000, dw: 'top', dp: (len + 2 * mg) / 2 }, units = []; let x = mg, n = Math.floor(nb / wb), rm = nb - n * wb; const list = []; for (let i = 0; i < n; i++) list.push(wb); if (rm >= 1) list.push(rm);
  list.forEach((b) => { units.push({ x0: x, z0: mg, w: b * s + 30, d: Du, nb: b, f: 1, ax: 'X' }); x += b * s; });
  return { R, x0: mg, z0: mg, len, LY: { units, bays: nb, axis: 'X', nk, mxK, s, Du, p } };
}
function rfOda(R, p, nz, mush, wb, kSel) {
  const s = p + 30, Du = nz * s + 30, mxK = Math.max(2, Math.min(8, Math.floor((R.H - 30 - RFT - (mush ? 650 : 350)) / s) + 1, Math.floor((RFHMAX - 30 - RFT) / s) + 1)), nk = kSel ? Math.max(2, Math.min(mxK, kSel)) : mxK, dc = rfDoorRect(R), uL = wb * s + 30;
  const fill = (a, b, toEnd) => { const F = b - a, GP = 30; let tot = Math.floor((F - 30 + 1e-6) / s), k = Math.ceil(tot / RFMAXB); while (tot > 0 && tot * s + k * 30 + (k - 1) * GP > F + 1e-6) { tot--; k = Math.ceil(tot / RFMAXB); } if (tot < 1) return [];
    const pcs = []; for (let i = 0; i < k; i++) pcs.push(Math.floor(tot / k) + (i < tot % k ? 1 : 0));
    const out = [], used = tot * s + k * 30 + (k - 1) * GP; let pos = toEnd ? b - used : a;
    pcs.forEach((pb) => { const n = Math.floor(pb / wb), rm = pb - n * wb, list = []; for (let i = 0; i < n; i++) list.push(wb); if (rm >= 1) list.push(rm); if (toEnd) list.reverse(); list.forEach((nb) => { out.push({ pos, nb }); pos += nb * s; }); pos += 30 + GP; }); return out; };
  const plan = (ax, side) => { const X = ax == 'X', C = X ? R.W : R.L, Lr = X ? R.L : R.W, rc0 = X ? dc.z0 : dc.x0, rc1 = X ? dc.z1 : dc.x1, ru0 = X ? dc.x0 : dc.z0, ru1 = X ? dc.x1 : dc.z1; let rows = [];
    if (C >= 2 * Du + AIS) { const GP = 30, k = Math.floor((C - 2 * Du - AIS) / (2 * Du + GP + AIS) + 1e-9), ag = (C - (2 * Du + 2 * k * Du + k * GP)) / (k + 1); rows.push({ c0: 0, f: 1 }); let c = Du + ag; for (let i = 0; i < k; i++) { rows.push({ c0: c, f: -1 }); rows.push({ c0: c + Du + GP, f: 1 }); c += 2 * Du + GP + ag; } rows.push({ c0: C - Du, f: -1 }); }
    else if (C >= Du + AIS) rows = [side == 'low' ? { c0: 0, f: 1 } : { c0: C - Du, f: -1 }];
    const units = []; let bays = 0;
    rows.forEach((r) => { const c1 = r.c0 + Du; let iv = [[0, Lr]]; if (c1 > rc0 && r.c0 < rc1 && ru1 > 0 && ru0 < Lr) iv = [[0, Math.max(0, ru0)], [Math.min(Lr, ru1), Lr]];
      iv.forEach(([a, b]) => { if (b - a < s + 30) return; fill(a, b, a > 0 && b >= Lr).forEach((u) => { const len = u.nb * s + 30; bays += u.nb; units.push(X ? { x0: u.pos, z0: r.c0, w: len, d: Du, nb: u.nb, f: r.f, ax: 'X' } : { x0: r.c0, z0: u.pos, w: Du, d: len, nb: u.nb, f: r.f, ax: 'Z' }); }); }); });
    return { units, bays, axis: ax }; };
  const one = (ax) => { const X = ax == 'X', C = X ? R.W : R.L; if (C < 2 * Du + AIS && C >= Du + AIS) { const lo = plan(ax, 'low'), hi = plan(ax, 'high'), pf = X ? hi : lo, ot = X ? lo : hi; return ot.bays > pf.bays ? ot : pf; } return plan(ax, 'high'); };
  const px = one('X'), pz = one('Z'), pk = px.bays > pz.bays ? px : pz.bays > px.bays ? pz : R.L >= R.W ? px : pz;
  return { units: pk.units, bays: pk.bays, axis: pk.axis, nk, mxK, s, Du, p };
}
MODUL.R = {
  ad: 'Raf sistemi', anahtar: ['rfd', 'rfw', 'rfp', 'rfk', 'rfm', 'rfL', 'rfW', 'rfH', 'rfdw', 'rfdp', 'rfo', 'rfb'], varsayilan: { rfd: 1, rfw: 1, rfp: 1, rfk: 0, rfm: 0, rfL: 3000, rfW: 3000, rfH: 3000, rfdw: 'top', rfdp: 650, rfo: 0, rfb: 3 },
  alan: { rfd: [3, 4, 0, 1, 2], rfk: [0, 1, 2, 3, 4, 5, 6, 7, 8], rfo: [0, 1], rfb: [1, 2, 3, 4, 5], rfdw: ['top', 'bottom', 'left', 'right'] },
  hesapla(P) {
    P.rfd = [0, 1, 2, 3, 4].includes(+P.rfd) ? +P.rfd : 1; P.rfw = 1; P.rfp = 1; P.rfm = 0; P.rfo = P.rfo ? 1 : 0; P.rfb = Math.max(1, Math.min(RFMAXB, Math.round(+P.rfb) || 3)); P.rfk = Math.max(0, Math.round(+P.rfk) || 0);
    const R0 = { L: Math.max(RLIM.L[0], Math.min(RLIM.L[1], Math.round(+P.rfL) || 3000)), W: Math.max(RLIM.W[0], Math.min(RLIM.W[1], Math.round(+P.rfW) || 3000)), H: Math.max(RLIM.H[0], Math.min(RLIM.H[1], Math.round(+P.rfH) || 3000)), dw: ['top', 'bottom', 'left', 'right'].includes(P.rfdw) ? P.rfdw : 'top', dp: +P.rfdp };
    if (!(R0.dp >= 0)) R0.dp = 650; rfClampDoor(R0);
    const d = P.rfd, dpn = P.rfp, SGL = !P.rfo, RS = SGL ? rfTek(RFD[d], dpn, P.rfw, P.rfb, P.rfk) : null, Rr = RS ? RS.R : R0;
    const LY = RS ? RS.LY : rfOda(Rr, RFD[d], dpn, false, P.rfw, P.rfk), s = LY.s, nk = LY.nk, Hu = (nk - 1) * s + 30 + RFT, U = LY.units; if (P.rfk > LY.mxK) P.rfk = LY.mxK;
    P.rfL = R0.L; P.rfW = R0.W; P.rfH = R0.H; P.rfdw = R0.dw; P.rfdp = R0.dp;
    const ADJ = U.map((u) => { const X = u.ax == 'X', pos = X ? u.x0 : u.z0; let a = false, b = false; U.forEach((v) => { if (v === u || v.ax !== u.ax) return; if (X ? v.z0 === u.z0 && v.d === u.d : v.x0 === u.x0 && v.w === u.w) { const vp = X ? v.x0 : v.z0; if (Math.abs(vp + v.nb * s - pos) < 1) a = true; if (Math.abs(pos + u.nb * s - vp) < 1) b = true; } }); return [a, b]; });
    const NR = U.length - ADJ.filter((a) => a[1]).length, M = [], sn = new Set(), kk = (a, b) => { const x = a.map(Math.round).join(), y = b.map(Math.round).join(); return x < y ? x + '|' + y : y + '|' + x; };
    U.forEach((u, ui) => { const g = rfGeom(d, u.nb, dpn, nk, ADJ[ui][0], ADJ[ui][1]), tf = u.ax == 'X' ? (q) => [u.x0 + 15 + q[0], q[1], u.z0 + 15 + q[2]] : (q) => [u.x0 + 15 + q[2], q[1], u.z0 + 15 + q[0]]; g.M.forEach((m) => { const Pp = tf(m.p), Q = tf(m.q), key = kk(Pp, Q); if (sn.has(key)) return; sn.add(key); M.push({ p: Pp, q: Q, len: m.len, k: m.k }); }); });
    const { C, NT } = siniflandir(M, Rr.L);
    const T = tablo(M, C, [['Raf ünitesi', NR + ' adet'], ['Civata somun seti', civata(M) + ' adet']]);
    const fp = U.reduce((a, u) => a + u.w * u.d, 0) / 1e6, At = fp * nk, RA = (Rr.L * Rr.W) / 1e6, fx1 = (x) => String(+x.toFixed(1)).replace('.', ',');
    return { ...T, olcu: SGL ? 'Raf ' + fm(RS.len) + ' × ' + fm(LY.Du) + ' × ' + fm(Hu) + ' m' : 'Oda ' + fm(Rr.L) + ' × ' + fm(Rr.W) + ' × ' + fm(Rr.H) + ' m',
      alt: SGL ? 'Tek raf · ' + LY.bays + ' bölüm · ' + nk + ' kat · toplam raf alanı ' + fx1(At) + ' m²' : U.length ? NR + ' raf ünitesi · ' + LY.bays + ' bölüm · ' + nk + ' kat · raf yüksekliği ' + fm(Hu) + ' m · toplam raf alanı ' + fx1(At) + ' m² · oda tabanının %' + Math.round((fp / RA) * 100) + "'i raflı" : 'Bu oda ölçüsünde seçilen derinlikte raf sığmıyor; derinliği "Tek sıra" yapın veya odayı büyütün.',
      ek: { U, nk, mxK: LY.mxK, s, Du: LY.Du, Hu, At, NR, bays: LY.bays, tek: SGL, oda: Rr, adj: ADJ }, yapi: yapiCiz(M, C, NT) };
  },
};

/* ---------------- Ortak: tasarım kodu ve hesap ---------------- */
const enc = (v) => (v === true ? 't' : v === false ? 'f' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v));
// Müşteriye görünen kod HasTürk kodudur (HG-…); sipariş üretime iletilirken uretimKodu() ile üretim koduna çevrilir.
export function kod(m, P) { return 'HG-' + m + '1-' + MODUL[m].anahtar.map((k) => enc(P[k])).join('_'); }
export function uretimKodu(k) { return String(k || '').replace(/^HG-Y2-/, 'BK-V2-').replace(/^HG-([A-Z])1-/, 'PM-$11-'); }
export function hgKodu(k) { return String(k || '').replace(/^BK-V2-/, 'HG-Y2-').replace(/^PM-([A-Z])1-/, 'HG-$11-'); }
// Konnektör adı mağazadaki ürün adıyla: PC003 → No:3, PC008-1 → No:8-1
export const konAdi = (t) => String(t).replace(/^PC0*(\d+)(-\d)?\s+/, (x, a, b) => 'No:' + a + (b || '') + ' · ');
export function kodAc(txt) {
  const g = String(txt || '').match(/(?:PM|HG)-([A-Z])1-([A-Za-z0-9_.\-]+)/); if (!g || !MODUL[g[1]]) return null;
  const M = MODUL[g[1]], v = g[2].split('_'); if (v.length === M.anahtar.length - 1 && M.eskiKod != null) v.push(M.eskiKod); if (v.length !== M.anahtar.length) return null;
  const P = {}; M.anahtar.forEach((k, i) => { const t = v[i]; P[k] = t === 't' ? 1 : t === 'f' ? 0 : /^-?\d+(\.\d+)?$/.test(t) ? +t : t; });
  return { m: g[1], P };
}
export function hesapla(m, P) { const r = MODUL[m].hesapla(P); r.kod = kod(m, P); r.ad = r.ad || MODUL[m].ad; return r; }
// Mağazadaki sera ürün adresinden (…-olimpos-2-98-x-4-13-m-…) o ürünün tasarımı: seri ve dış ölçü, tasarım uzayında eşleşen ilk tasarım.
// Ürün sayfasındaki "Kendin tasarla" kartı aracı varsayılan ölçüde değil, ürünün kendi ölçüsünde açsın diye (Olimpos 1,58 m: dar sera; Pergamon: kesik çatı; Likya: genişlik ve bölüm).
export function urunTasarimi(slug) {
  const g = String(slug || '').match(/(olimpos|pergamon|aspendos|likya)-(\d)-(\d\d)-x-(\d)-(\d\d)-m(?:-|$)/); if (!g) return null;
  const olcu = g[2] + ',' + g[3] + ' × ' + g[4] + ',' + g[5] + ' m', seri = g[1], aralik = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const adaylar = seri === 'likya' ? [0, 1].flatMap((lyH) => aralik(1, 4).map((lyN) => ['E', { lyH, lyN }])) : seri === 'aspendos' ? [2, 3].map((asN) => ['N', { asN }])
    : seri === 'pergamon' ? aralik(2, 10).map((n) => ['S', { w: 'C', n, sr: 1 }]) : aralik(2, 4).map((n) => ['S', { w: 'F', n, sr: 0 }]).concat(aralik(2, 10).map((n) => ['S', { w: 'C', n, sr: 0 }]));
  for (const [m, p] of adaylar) { const P = { ...MODUL[m].varsayilan, ...p }; if (hesapla(m, { ...P }).olcu === olcu) return { m, P }; }
  return null;
}
