// Kendin Tasarla: kurulum kılavuzu (PDF). Tasarımın kendi parça listesinden, adım adım numaralı çizimlerle hazırlanır.
// İçerik: kapak (görsel, ölçü, tasarım kodu), paket içeriği (profiller, konnektörler, profil numaraları), gerekli aletler,
// kurulumdan önce, civata uyarısı, kurulum adımları (her adımda takılan profil numaraları ve konnektör kodları), kapı / kapak /
// pencere, ölçü çizimi (3B + önden, yandan, üstten ölçülü görünüşler, 1,75 m ölçek figürü), önemli notlar, müşteri hizmetleri.
// Sayfalar tuvale çizilir, JPEG olarak küçük bir PDF dosyasına yazılır (dış kitaplık yok). THREE genel değişken olarak gelir.
const YESIL = '#1f6b3a', MUREKKEP = '#15181c', GRI = '#5f666e', CIZGI = '#d9d6cf', ZEMIN = '#f4f6f2', TEL = '+90 553 727 2929';
const FF = 'Poppins, Arial, sans-serif';
const F1 = (x) => String(+(+x).toFixed(1)).replace('.', ',');
const F2 = (x) => (+x).toFixed(2).replace('.', ',');
const num = (t) => parseFloat(String(t).replace(/\./g, '').replace(',', '.'));
const k3 = (p) => p.map((v) => Math.round(v)).join();
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Yapı: düğüm kodları, profil boyları ---------------- */
// Konnektör kodu, düğüme bağlanan kolların yönlerinden bulunur (hesap motorundaki sınıflandırmayla aynı kural)
function kodBul(uyeler, W) {
  const arms = {}, NT = {};
  uyeler.forEach((m) => [[m.a, m.b], [m.b, m.a]].forEach(([u, v]) => { const d = [v[0] - u[0], v[1] - u[1], v[2] - u[2]], l = Math.hypot(...d) || 1, k = k3(u); (arms[k] = arms[k] || { p: u, d: [] }).d.push(d.map((t) => Math.round((t / l) * 100) / 100)); }));
  Object.entries(arms).forEach(([key, { p, d }]) => {
    d = d.filter((a, i, A) => A.findIndex((b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) < 0.05) === i);
    const dg = d.filter((v) => Math.abs(v[1]) > 0.1 && Math.hypot(v[0], v[2]) > 0.1), nn = d.length; let t = null;
    if (dg.length) {
      const dn = dg.filter((v) => v[1] < 0).length, up = dg.length - dn;
      if (dn == 2) { const hcol = d.some((v) => v[1] < -0.9); t = hcol ? (nn == 4 ? 'PC011-1' : 'PC012-1') : nn == 3 ? 'PC011-2' : 'PC012-2'; }
      else if (up == 1 && dn == 0) { const g = dg[0], l = Math.hypot(g[0], g[2]) || 1, hz = d.filter((v) => Math.abs(v[1]) < 0.1), tie = hz.filter((v) => Math.abs((v[0] * g[0] + v[2] * g[2]) / l) > 0.9).length, al = hz.length - tie; t = (al >= 2 ? 'PC010' : p[0] < W / 2 ? 'PC008' : 'PC009') + (tie ? '-1' : '-2'); }
      else if (dn == 1 && up == 0 && dg.length == 1) { const g = dg[0], l = Math.hypot(g[0], g[2]) || 1, hz = d.filter((v) => Math.abs(v[1]) < 0.1), tr = hz.filter((v) => Math.abs((v[0] * g[0] + v[2] * g[2]) / l) > 0.9).length, al = hz.length - tr, vt = d.some((v) => Math.abs(v[1]) > 0.9); t = tr ? (al >= 2 ? 'PC010' : p[0] < W / 2 ? 'PC009' : 'PC008') + (vt ? '-1' : '-2') : null; }
      else t = nn == 2 ? 'PC001' : nn == 3 ? 'PC003' : nn == 4 ? 'PC004' : null;
    } else if (nn) {
      const ax = new Set(d.map((v) => v.findIndex((q) => Math.abs(q) > 0.5))), pr = [0, 1, 2].filter((i) => d.some((v) => v[i] > 0.5) && d.some((v) => v[i] < -0.5)).length;
      t = nn == 1 ? null : nn == 2 ? (pr ? 'PC001' : 'PC002') : nn == 3 ? (ax.size == 3 ? 'PC005' : 'PC003') : nn == 4 ? (pr == 2 ? 'PC004' : pr == 1 ? 'PC006' : null) : null;
    }
    NT[key] = { p, kod: t };
  });
  return NT;
}
function yapiHazirla(R) {
  const tum = R.yapi.uye.map((u, i) => ({ ...u, i, kapi: u.k === 'd' && !u.win, win: !!u.win }));
  const ana = tum.filter((u) => !u.kapi && !u.win);
  let x0 = 1e9, x1 = -1e9; ana.forEach((u) => [u.a, u.b].forEach((q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }));
  const NT = kodBul(ana, x1 + x0), verilen = {}; (R.yapi.dugum || []).forEach((d) => { if (d.kod && /^PC\d/.test(d.kod)) verilen[k3(d.p)] = d.kod; });
  // Tek kollu uçlar (zemine ya da pime basan ayak ucu) konnektör değildir; çizimde ve adımlarda yer almaz
  const dug = Object.entries(NT).map(([k, v]) => ({ p: v.p, kod: verilen[k] || v.kod, key: k })).filter((d) => d.kod);
  const kapiNT = kodBul(tum.filter((u) => u.kapi), 0), kapiDug = Object.entries(kapiNT).map(([k, v]) => ({ p: v.p, kod: v.kod, key: k, kapi: true })).filter((d) => d.kod);
  const winNT = kodBul(tum.filter((u) => u.win), 0), winDug = Object.entries(winNT).map(([k, v]) => ({ p: v.p, kod: v.kod || 'PC002', key: k, win: true }));
  // Profil boyu: motor verdiyse o; yoksa parça listesindeki boylara (adetleri kadar) en yakın eşleşme
  const aday = [], CAP = {};
  R.parca.forEach(([t, q]) => { const m = t.match(/^Profil ([\d,]+) cm/); if (m) { const L = num(m[1]); if (!CAP[L]) aday.push(L); CAP[L] = (CAP[L] || 0) + num(q); } });
  const eksen = (u) => Math.hypot(u.b[0] - u.a[0], u.b[1] - u.a[1], u.b[2] - u.a[2]) / 10;
  const bos = tum.filter((u) => !(u.len > 0));
  if (bos.length) {
    const hata = (o) => bos.reduce((a, u) => a + Math.min(...aday.map((c) => Math.abs(c - (eksen(u) - o)))), 0), OFF = [0, 3, 1.5, 4.5].reduce((b, o) => (hata(o) < hata(b) ? o : b), 0);
    const kalan = { ...CAP }; tum.filter((u) => u.len > 0).forEach((u) => { const L = +(+u.len).toFixed(1); if (kalan[L] > 0) kalan[L]--; });
    const cift = []; bos.forEach((u) => aday.forEach((c) => { const d = Math.abs(c - (eksen(u) - OFF)); if (d < 2.5) cift.push([d, u, c]); }));
    cift.sort((p, q) => p[0] - q[0]); cift.forEach(([, u, c]) => { if (!(u.len > 0) && kalan[c] > 0) { u.len = c; kalan[c]--; } });
    bos.forEach((u) => { if (!(u.len > 0)) { const L = eksen(u) - OFF; u.len = aday.reduce((b, c) => (Math.abs(c - L) < Math.abs(b - L) ? c : b), aday[0] || Math.round(L * 2) / 2); } });
  }
  tum.forEach((u) => { u.len = +(+u.len).toFixed(1); const dy = Math.abs(u.b[1] - u.a[1]), dh = Math.hypot(u.b[0] - u.a[0], u.b[2] - u.a[2]); u.yat = dy < 5; u.dik = dh < 5; u.egik = !u.yat && !u.dik; u.lo = Math.min(u.a[1], u.b[1]); u.hi = Math.max(u.a[1], u.b[1]); u.cy = (u.a[1] + u.b[1]) / 2; u.m = [(u.a[0] + u.b[0]) / 2, u.cy, (u.a[2] + u.b[2]) / 2]; });
  return { tum, ana, dug, kapiDug, winDug };
}

/* ---------------- Kurulum adımları ---------------- */
function adimlar(Y, R, tur) {
  const { ana, dug } = Y, SH = new Set(), st = [], E = 20;
  const ekle = (baslik, metin, ms, cs, etiket) => { if (!ms.length && !cs.length) return; ms.forEach((f) => SH.add(f)); cs.forEach((f) => SH.add(f)); st.push({ baslik, metin, goster: new Set(SH), yeniU: ms, yeniD: cs, etiket }); };
  const dg = ana.filter((u) => u.egik), y1 = Math.max(...dug.map((c) => c.p[1])), saçak = dg.length ? Math.min(...dg.map((u) => u.lo)) : y1, ust = dg.length ? saçak : y1;
  const LV = [...new Set(dug.filter((c) => c.p[1] <= ust + E).map((c) => Math.round(c.p[1])))].sort((a, b) => a - b).reduce((a, y) => { const l = a[a.length - 1]; if (l && y - l.hi < 70) l.hi = y; else a.push({ lo: y, hi: y }); return a; }, []);
  const inL = (y, L) => y >= L.lo - E && y <= L.hi + E, kapiVar = Y.tum.some((u) => u.kapi), kapiNot = kapiVar && tur !== 'Y' ? ['Kapı kanadını şimdilik takmayın; kapı son adımlarda takılacak.'] : [];
  if (!LV.length) return st;
  const yuksek = LV[0].lo > 150;
  if (yuksek) {
    ekle(LV.length > 1 ? 'Alt çerçeve' : 'Üst çerçeve', ['Konnektörleri ve yatay profilleri birleştirerek çerçeveyi yerde kurun. Profili konnektöre sonuna kadar itin; civata takmayın. Çerçevenin gönyesinde olduğunu iki köşegeni ölçerek kontrol edin: iki köşegen eşit olmalıdır.'], ana.filter((u) => u.yat && inL(u.cy, LV[0])), dug.filter((c) => inL(c.p[1], LV[0])), true);
    ekle('Ayaklar', ['Ayak profillerini çerçeve konnektörlerinin aşağı bakan kollarına takın. Çerçeveyi ters çevirip yere yatırırsanız ayaklar daha kolay takılır; ayaklar takılınca yapıyı ayaklarının üzerine çevirin.'], ana.filter((u) => !SH.has(u) && u.dik && u.hi <= LV[0].hi + E), [], false);
  } else ekle('Taban çerçevesi', ['Zemine gelen profilleri konnektörlerle birleştirerek taban çerçevesini kurun. Profili konnektöre sonuna kadar itin; civata takmayın, konnektör profili kendi tutar. Çerçevenin gönyesinde olduğunu iki köşegeni ölçerek kontrol edin: iki köşegen eşit olmalıdır.'], ana.filter((u) => u.yat && inL(u.cy, LV[0])), dug.filter((c) => inL(c.p[1], LV[0])), true);
  for (let i = 1; i < LV.length; i++) {
    const L = LV[i];
    ekle('Dikmeler', [i == 1 && !yuksek ? 'Zemin konnektörlerinin yukarı bakan kollarına dikme profillerini takın. Profili konnektöre sonuna kadar itin; civata takmayın.' : 'Bir önceki adımda taktığınız konnektörlerin yukarı bakan boş kollarına dikme profillerini takın. Civata takmayın.'], ana.filter((u) => !SH.has(u) && u.dik && u.hi <= L.hi + E), [], false);
    ekle('Dikmelerin üst konnektörleri', ['Dikme profillerinin üst uçlarına konnektörleri takın. Her noktaya hangi konnektörün geleceği görselde koduyla yazılıdır; kolların yönüne dikkat edin.'], [], dug.filter((c) => !SH.has(c) && inL(c.p[1], L)), true);
    ekle('Yatay kuşaklar', ['Bir önceki adımda taktığınız konnektörlere yatay profilleri takarak çerçeveyi kapatın. Dikmelerin dik durduğunu kontrol edin.'].concat(i == 1 ? kapiNot : []), ana.filter((u) => !SH.has(u) && u.yat && inL(u.cy, L)), [], false);
  }
  if (dg.length) {
    ekle('Çatı dikmeleri', ['Mahya dikmelerini saçak seviyesindeki konnektörlerin yukarı bakan kollarına takın.'], ana.filter((u) => !SH.has(u) && u.dik && u.lo >= saçak - E), [], false);
    ekle('Çatı profilleri', ['Eğimli çatı profillerini saçak konnektörlerine takın. Çatıda çalışırken merdiveni sağlam zemine kurun ve yardımcınız merdiveni tutsun.'], ana.filter((u) => !SH.has(u) && u.egik), [], false);
    ekle('Mahya konnektörleri', ['Çatı profillerinin ve dikmelerin üst uçlarına mahya konnektörlerini takın. Konnektör kodları görselde yazılıdır.'], [], dug.filter((c) => !SH.has(c) && c.p[1] > saçak + E), true);
    ekle('Mahya profilleri', ['Mahya konnektörlerini mahya profilleriyle birbirine bağlayarak çatıyı tamamlayın.'], ana.filter((u) => !SH.has(u) && u.yat && u.cy > saçak + E), [], false);
  }
  const kalanU = ana.filter((u) => !SH.has(u)), kalanD = dug.filter((c) => !SH.has(c));
  if (kalanU.length || kalanD.length) ekle('Kalan profiller', ['Kalan profilleri ve konnektörleri görseldeki yerlerine takarak iskeleti tamamlayın.'], kalanU, kalanD, true);
  if (tur === 'Z') {
    const kemer = R.yatak && R.yatak.cift > 1;
    st.unshift({ baslik: 'Aparatları yatağa takın', metin: kemer ? ['Önce iki sebze yatağını kendi kılavuzuna göre kurun ve aralarında geçiş payı bırakarak paralel yerleştirin.', 'Profil yatak birleştirme aparatlarını iki yatağın birbirine bakan uzun kenarlarına takın: aparatın kenarı yatağı üstten kavrar, bacağı yol tarafında kalır. O noktadaki yatak civatasını çıkarıp aparatın deliğinden geçirerek yeniden takın ve sıkın.'] : ['Önce sebze yatağını kendi kılavuzuna göre kurun.', 'Profil yatak birleştirme aparatlarını yatağın kısa kenarlarında, köşe parçasının düz parçayla birleştiği yerlere takın: aparatın kenarı yatağı üstten kavrar, bacağı dışarıda kalır. O noktadaki yatak civatasını çıkarıp aparatın deliğinden geçirerek yeniden takın ve sıkın.'], goster: new Set(), yeniU: [], yeniD: [], sabit: 1 });
    st.push({ baslik: kemer ? 'Kemeri yataklara oturtun' : 'Üniteyi yatağa oturtun', metin: [(kemer ? 'Kemeri iki ya da üç kişi kaldırın' : 'Üst çerçeveyi dikmeleriyle birlikte iki kişi kaldırın') + ' ve dikmelerin alt uçlarını aparatların pimlerine sonuna kadar geçirin.', 'İpleri yaklaşık 20 cm aralıkla üst kuşaklara bağlayıp toprağa kadar indirin; domates ve salatalık bu iplere tırmanır (ip pakete dahil değildir).'], goster: new Set(SH), yeniU: [], yeniD: [], sabit: 1 });
  }
  st.push({ baslik: 'Civataları takın ve sıkın', metin: ['İskelet tamamlandı. Ölçüleri bu kılavuzdaki ölçü çizimiyle karşılaştırın ve köşegenleri kontrol edin. Her şey doğruysa bütün civata somun setlerini takıp somun anahtarıyla iyice sıkın. Yapıyı zemine, duvara dayalı yapılarda ayrıca duvara sabitleyin.'], goster: new Set(SH), yeniU: [], yeniD: [], son: 1 });
  return st;
}
// Kapı / kapak kanatları: birbirine bağlı kapı profilleri bir kanat; aynı boylardaki kanatlar tek adımda "n adet" olarak verilir
function kanatlar(uyeler) {
  const grup = [], gor = new Set();
  uyeler.forEach((u) => { if (gor.has(u)) return; const g = [u], q = [u]; gor.add(u);
    while (q.length) { const a = q.pop(); uyeler.forEach((b) => { if (gor.has(b)) return; if ([a.a, a.b].some((p) => [b.a, b.b].some((r) => Math.hypot(p[0] - r[0], p[1] - r[1], p[2] - r[2]) < 60))) { gor.add(b); g.push(b); q.push(b); } }); }
    grup.push(g); });
  const imza = (g) => g.map((u) => u.len).sort((a, b) => a - b).join('|'), tek = {};
  grup.forEach((g) => { const k = imza(g); (tek[k] = tek[k] || { uye: g, n: 0 }).n++; });
  return Object.values(tek);
}

/* ---------------- Çizim (beyaz zemin, numaralı) ---------------- */
function cizici(Y, insanYap) {
  const W = 1400, H = 900, rn = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  rn.setPixelRatio(1); rn.setSize(W, H, false); rn.setClearColor(0xffffff, 1);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, 10, 200000), orto = new THREE.OrthographicCamera(-1, 1, 1, -1, -100000, 100000);
  sc.add(new THREE.AmbientLight(0xffffff, 0.72)); const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(0.5, 1, 0.8); sc.add(dl);
  const M = { yeni: new THREE.MeshLambertMaterial({ color: 0x2c3238 }), eski: new THREE.MeshLambertMaterial({ color: 0xaeb4ba }), kon: new THREE.MeshLambertMaterial({ color: 0x8f969d }), konY: new THREE.MeshLambertMaterial({ color: 0x1f6b3a }), kapi: new THREE.MeshLambertMaterial({ color: 0x6e757c }), insan: new THREE.MeshLambertMaterial({ color: 0xc2c7cc }) };
  const KUTU = new THREE.BoxGeometry(1, 1, 1), mesh = new Map();
  const uyeMesh = (u) => { const a = new THREE.Vector3(...u.a), b = new THREE.Vector3(...u.b), m = new THREE.Mesh(KUTU, M.eski), L = a.distanceTo(b); m.scale.set(30, 30, Math.max(1, L)); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); return m; };
  Y.tum.forEach((u) => { const m = uyeMesh(u); sc.add(m); mesh.set(u, m); });
  Y.dug.concat(Y.kapiDug, Y.winDug).forEach((c) => { const m = new THREE.Mesh(KUTU, M.kon); m.scale.setScalar(44); m.position.set(...c.p); sc.add(m); mesh.set(c, m); });
  const ins = insanYap ? insanYap() : null; if (ins) { ins.traverse((o) => { if (o.isMesh) o.material = M.insan; }); sc.add(ins); }
  const bb = new THREE.Box3(); Y.tum.forEach((u) => { bb.expandByPoint(new THREE.Vector3(...u.a)); bb.expandByPoint(new THREE.Vector3(...u.b)); });
  const mrk = bb.getCenter(new THREE.Vector3()), boy = bb.getSize(new THREE.Vector3());
  const bak = (az, el, hedef, kutu) => { const s = kutu || boy, r = 0.5 * Math.hypot(s.x, s.y, s.z) + 120, d = r / Math.sin((cam.fov * Math.PI) / 360) * 1.02; cam.aspect = W / H; cam.updateProjectionMatrix();
    const t = hedef || mrk; cam.position.set(t.x + d * Math.cos(el) * Math.sin(az), t.y + d * Math.sin(el), t.z + d * Math.cos(el) * Math.cos(az)); cam.lookAt(t); return cam; };
  const goster = (f) => mesh.forEach((m, k) => (m.visible = f(k)));
  const proj = (c, p) => { const v = new THREE.Vector3(...p).project(c); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]; };
  const kopya = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(rn.domElement, 0, 0); return c; };
  const kirp = (c, pay = 24) => { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4; if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 <= x0) return c; x0 = Math.max(0, x0 - pay); y0 = Math.max(0, y0 - pay); x1 = Math.min(c.width, x1 + pay); y1 = Math.min(c.height, y1 + pay);
    const o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o; };
  // Etiketler: profil numarası (daire) ve konnektör kodu (kutu); çakışan etiket kaydırılır, yer yoksa atlanır
  const etiketle = (c, cv, liste) => { const g = cv.getContext('2d'), dolu = [];
    const yer = (x, y, w, h) => { for (const [dx, dy] of [[0, 0], [0, -h - 4], [w * 0.6, 0], [-w * 0.6, 0], [0, h + 4], [w * 0.6, -h], [-w * 0.6, -h], [0, -2 * h - 8]]) { const r = [x + dx - w / 2, y + dy - h / 2, w, h]; if (r[0] < 2 || r[1] < 2 || r[0] + w > W - 2 || r[1] + h > H - 2) continue; if (!dolu.some((q) => r[0] < q[0] + q[2] && r[0] + w > q[0] && r[1] < q[1] + q[3] && r[1] + h > q[1])) { dolu.push(r); return r; } } return null; };
    liste.filter((e) => e.d).forEach((e) => { const [x, y] = proj(c, e.p); const r = yer(x, y, 34, 34); if (!r) return; const cx = r[0] + 17, cy = r[1] + 17; g.fillStyle = '#fff'; g.strokeStyle = MUREKKEP; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill(); g.stroke(); g.fillStyle = MUREKKEP; g.font = `700 20px ${FF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.t, cx, cy + 1); });
    liste.filter((e) => !e.d).forEach((e) => { const [x, y] = proj(c, e.p); g.font = `600 17px ${FF}`; const w = g.measureText(e.t).width + 12, r = yer(x + w / 2 + 8, y - 15, w, 24); if (!r) return; g.strokeStyle = YESIL; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(r[0], r[1] + 11); g.stroke(); g.fillStyle = '#fff'; g.fillRect(r[0], r[1], w, 24); g.strokeRect(r[0], r[1], w, 24); g.fillStyle = YESIL; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(e.t, r[0] + 6, r[1] + 12); });
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; };
  const AZ = 0.62, EL = 0.42;
  return {
    adim(goster0, yeniU, yeniD, etiket) {
      const yu = new Set(yeniU), yd = new Set(yeniD);
      mesh.forEach((m, k) => { m.visible = goster0.has(k); if (k.a) m.material = yu.has(k) ? M.yeni : M.eski; else m.material = yd.has(k) ? M.konY : M.kon; }); if (ins) ins.visible = false;
      const c = bak(AZ, EL); rn.render(sc, c); const cv = kopya(); etiketle(c, cv, etiket); return kirp(cv);
    },
    tum(sec) { mesh.forEach((m, k) => { m.visible = !sec || sec(k); m.material = k.a ? (k.kapi || k.win ? M.kapi : M.yeni) : M.kon; }); if (ins) ins.visible = false; const c = bak(AZ, EL); rn.render(sc, c); return kirp(kopya()); },
    kanat(uyeler, dugler, etiket) {
      const s = new Set([...uyeler, ...dugler]); mesh.forEach((m, k) => { m.visible = s.has(k); m.material = k.a ? M.yeni : M.konY; }); if (ins) ins.visible = false;
      const b = new THREE.Box3(); uyeler.forEach((u) => { b.expandByPoint(new THREE.Vector3(...u.a)); b.expandByPoint(new THREE.Vector3(...u.b)); }); const sz = b.getSize(new THREE.Vector3()), t = b.getCenter(new THREE.Vector3());
      const c = bak(sz.x < sz.z ? Math.PI / 2 + 0.12 : 0.12, 0.08, t, sz); rn.render(sc, c); const cv = kopya(); etiketle(c, cv, etiket); return kirp(cv);
    },
    // Ölçü çizimi: 3B görünüş + 1,75 m insan figürü, ölçü çizgileri
    olcu3b(et) {
      mesh.forEach((m, k) => { m.visible = true; m.material = k.a ? (k.kapi || k.win ? M.kapi : M.yeni) : M.kon; });
      if (ins) { ins.visible = true; ins.position.set(bb.min.x - 900, 0, bb.max.z - 300); ins.rotation.y = 0.4; }
      const kb = bb.clone(); if (ins) kb.expandByObject(ins); const c = bak(AZ, EL, kb.getCenter(new THREE.Vector3()), kb.getSize(new THREE.Vector3())); rn.render(sc, c); const cv = kopya(), g = cv.getContext('2d');
      const p = (x, y, z) => proj(c, [x, y, z]), x0 = bb.min.x - 15, x1 = bb.max.x + 15, z0 = bb.min.z - 15, z1 = bb.max.z + 15, y0 = Math.max(0, bb.min.y), y1 = bb.max.y + 15, o = 380;
      cizgi(g, p(x0, 0, z1 + o), p(x1, 0, z1 + o), et.gen); cizgi(g, p(x1 + o, 0, z1), p(x1 + o, 0, z0), et.uzun); cizgi(g, p(x1 + o, y0, z0), p(x1 + o, y1, z0), et.yuk);
      if (ins) { const [hx, hy] = proj(c, [ins.position.x, 1850, ins.position.z]); kutuYazi(g, hx, hy, 'Boy 1,75 m'); }
      return kirp(cv);
    },
    // Ortografik görünüş: 'on' (önden, x–y), 'yan' (yandan, z–y), 'ust' (üstten, x–z)
    gorunus(yon, et) {
      mesh.forEach((m, k) => { m.visible = true; m.material = k.a ? (k.kapi || k.win ? M.kapi : M.yeni) : M.kon; }); if (ins) ins.visible = false;
      const pay = Math.max(boy.x, boy.y, boy.z) * 0.18 + 300, A = W / H; let w, h;
      if (yon === 'on') { orto.position.set(mrk.x, mrk.y, mrk.z + 50000); orto.up.set(0, 1, 0); w = boy.x; h = boy.y; }
      else if (yon === 'yan') { orto.position.set(mrk.x + 50000, mrk.y, mrk.z); orto.up.set(0, 1, 0); w = boy.z; h = boy.y; }
      else { orto.position.set(mrk.x, mrk.y + 50000, mrk.z); orto.up.set(0, 0, -1); w = boy.x; h = boy.z; }
      let hw = w / 2 + pay, hh = h / 2 + pay; if (hw / hh > A) hh = hw / A; else hw = hh * A;
      Object.assign(orto, { left: -hw, right: hw, top: hh, bottom: -hh }); orto.lookAt(mrk); orto.updateProjectionMatrix(); rn.render(sc, orto);
      const cv = kopya(), g = cv.getContext('2d'), p = (q) => proj(orto, q), x0 = bb.min.x - 15, x1 = bb.max.x + 15, z0 = bb.min.z - 15, z1 = bb.max.z + 15, y0 = Math.max(0, bb.min.y), y1 = bb.max.y + 15, o = pay * 0.45;
      if (yon === 'on') { cizgi(g, p([x0, y0 - o, z1]), p([x1, y0 - o, z1]), et.gen); cizgi(g, p([x1 + o, y0, z1]), p([x1 + o, y1, z1]), et.yuk); }
      else if (yon === 'yan') { cizgi(g, p([x1, y0 - o, z1]), p([x1, y0 - o, z0]), et.uzun); cizgi(g, p([x1, y0, z0 - o]), p([x1, y1, z0 - o]), et.yuk); }
      else { cizgi(g, p([x0, 0, z1 + o]), p([x1, 0, z1 + o]), et.gen); cizgi(g, p([x1 + o, 0, z1]), p([x1 + o, 0, z0]), et.uzun); }
      return kirp(cv);
    },
    kapat() { rn.dispose(); },
  };
}
function kutuYazi(g, x, y, t, s = 24) { g.font = `600 ${s}px ${FF}`; const w = g.measureText(t).width + 18, h = s + 14; g.fillStyle = '#fff'; g.strokeStyle = MUREKKEP; g.lineWidth = 1.4; g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeRect(x - w / 2, y - h / 2, w, h); g.fillStyle = MUREKKEP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
function cizgi(g, a, b, t) {
  if (!t) return; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 9, ny = dx / l * 9;
  g.strokeStyle = MUREKKEP; g.lineWidth = 1.6; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); [a, b].forEach((q) => { g.moveTo(q[0] - nx, q[1] - ny); g.lineTo(q[0] + nx, q[1] + ny); }); g.stroke();
  const ok = (q, s) => { const ux = (dx / l) * s, uy = (dy / l) * s; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0] + ux * 12 - uy * 5, q[1] + uy * 12 + ux * 5); g.lineTo(q[0] + ux * 12 + uy * 5, q[1] + uy * 12 - ux * 5); g.closePath(); g.fillStyle = MUREKKEP; g.fill(); };
  ok(a, 1); ok(b, -1); kutuYazi(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, t);
}

/* ---------------- Sayfa düzeni (A4, 150 dpi) ---------------- */
function belge(ust) {
  const W = 1240, H = 1754, M = 92, LIM = H - 110, sayfa = []; let c, x, y;
  const yeni = () => { c = document.createElement('canvas'); c.width = W; c.height = H; x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); sayfa.push(c);
    if (sayfa.length > 1) { x.fillStyle = YESIL; x.fillRect(0, 0, W, 8); x.font = `600 19px ${FF}`; x.fillStyle = GRI; x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillText('HASTÜRK · Kurulum Kılavuzu', M, 54); x.textAlign = 'right'; x.fillText(ust, W - M, 54); x.textAlign = 'left'; x.fillStyle = CIZGI; x.fillRect(M, 70, W - 2 * M, 2); y = 104; } else y = M; };
  const yer = (h) => { if (y + h > LIM) yeni(); };
  const sar = (t, font, mw) => { x.font = font; const out = []; String(t).split('\n').forEach((par) => { let l = ''; par.split(' ').forEach((w) => { const tt = l ? l + ' ' + w : w; if (x.measureText(tt).width > mw && l) { out.push(l); l = w; } else l = tt; }); out.push(l); }); return out; };
  const yazi = (t, o = {}) => { const sz = o.size || 23, font = `${o.w || 400} ${sz}px ${FF}`, lh = o.lh || Math.round(sz * 1.45), ind = o.ind || 0, ls = sar(t, font, (o.mw || W - 2 * M) - ind);
    ls.forEach((l) => { yer(lh); x.font = font; x.fillStyle = o.col || MUREKKEP; x.fillText(l, M + ind, y + sz); y += lh; }); y += o.sonra === undefined ? 8 : o.sonra; };
  const h2 = (t, ayir = 170) => { yer(ayir); y += 10; x.fillStyle = YESIL; x.fillRect(M, y + 6, 8, 34); yazi(t, { size: 32, w: 700, ind: 22, col: YESIL, sonra: 10 }); };
  const madde = (L) => L.forEach((t) => { const ls = sar(t, `400 22px ${FF}`, W - 2 * M - 36); yer(ls.length * 32 + 4); x.fillStyle = MUREKKEP; x.beginPath(); x.arc(M + 10, y + 16, 5, 0, 7); x.fill(); ls.forEach((l) => { x.font = `400 22px ${FF}`; x.fillText(l, M + 30, y + 24); y += 32; }); y += 4; });
  const gorsel = (cv, maxH, minH, cerceve = true) => { if (!cv) return; const mw = W - 2 * M, nat = Math.min(maxH, (cv.height * mw) / cv.width); let h = nat; const kalan = LIM - y - 12; if (h > kalan) { if (kalan >= Math.min(minH || 300, nat)) h = kalan; else { yeni(); h = Math.min(nat, LIM - y - 12); } }
    const r = Math.min(mw / cv.width, h / cv.height), w = cv.width * r, hh = cv.height * r; x.drawImage(cv, M + (mw - w) / 2, y, w, hh); if (cerceve) { x.strokeStyle = CIZGI; x.lineWidth = 1.5; x.strokeRect(M, y, mw, hh); } y += hh + 14; };
  const tablo = (satir, baslik) => { if (!satir.length) return; if (baslik) { yer(100); yazi(baslik, { size: 24, w: 700, sonra: 4 }); }
    satir.forEach((r) => { const ls = sar(r[0], `${r.top ? 700 : 400} 21px ${FF}`, W - 2 * M - 300), hh = Math.max(36, ls.length * 28 + 8); yer(hh); if (r.top) { x.fillStyle = ZEMIN; x.fillRect(M, y, W - 2 * M, hh); }
      x.fillStyle = CIZGI; x.fillRect(M, y + hh - 1, W - 2 * M, 1); x.fillStyle = MUREKKEP; x.font = `${r.top ? 700 : 400} 21px ${FF}`; ls.forEach((l, k) => { if (r.daire) { daire(x, M + 26, y + 18, r.daire); x.font = `${r.top ? 700 : 400} 21px ${FF}`; x.fillStyle = MUREKKEP; x.fillText(l, M + 52, y + 25 + k * 28); } else x.fillText(l, M + 12, y + 25 + k * 28); });
      x.textAlign = 'right'; x.font = `${r.top ? 700 : 600} 21px ${FF}`; x.fillText(String(r[1] || ''), W - M - 12, y + 25); x.textAlign = 'left'; y += hh; }); y += 14; };
  const kutu = (baslik, satirlar, buyuk) => { const lw = W - 2 * M - 64, ls = satirlar.map((t) => sar(t, `400 21px ${FF}`, lw)), hh = 70 + ls.reduce((a, l) => a + l.length * 30 + 6, 0) + (buyuk ? 52 : 10); yer(hh + 12);
    x.fillStyle = ZEMIN; x.fillRect(M, y, W - 2 * M, hh); x.fillStyle = YESIL; x.fillRect(M, y, 10, hh); x.fillStyle = MUREKKEP; x.font = `700 25px ${FF}`; x.fillText(baslik, M + 34, y + 44);
    let yy = y + 76; ls.forEach((l, i) => { if (satirlar.length > 1) { x.font = `700 21px ${FF}`; x.fillText(i + 1 + '.', M + 34, yy + 20); } l.forEach((t) => { x.font = `400 21px ${FF}`; x.fillText(t, M + (satirlar.length > 1 ? 64 : 34), yy + 20); yy += 30; }); yy += 6; });
    if (buyuk) { x.font = `700 32px ${FF}`; x.fillStyle = YESIL; x.fillText(buyuk, M + 34, yy + 28); } y += hh + 18; };
  const adim = (n, baslik, metin, cv, prof, kon) => {
    const pl = prof && prof.length ? 'Bu adımda takılan profiller: ' + prof.map((q) => `(${q.n}) ${F1(q.len)} cm × ${q.cnt}`).join(',  ') : '', kl = kon && kon.length ? 'Bu adımda takılan konnektörler: ' + kon.map(([k, v]) => `${k.replace(/^PC(\d+)/, 'PC-$1')} × ${v}`).join(',  ') : '';
    const tl = metin.reduce((a, t) => a + sar(t, `400 22px ${FF}`, W - 2 * M).length * 32 + 8, 0), xl = (pl ? sar(pl, `700 20px ${FF}`, W - 2 * M).length * 29 + 4 : 0) + (kl ? sar(kl, `700 20px ${FF}`, W - 2 * M).length * 29 + 4 : 0);
    const minG = cv ? Math.min(300, (cv.height * (W - 2 * M)) / cv.width) : 0; if (y + 60 + tl + minG + xl + 20 > LIM) yeni();
    x.fillStyle = YESIL; x.beginPath(); x.arc(M + 24, y + 24, 24, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = `700 23px ${FF}`; x.textAlign = 'center'; x.fillText(String(n), M + 24, y + 32); x.textAlign = 'left';
    x.fillStyle = MUREKKEP; x.font = `700 27px ${FF}`; x.fillText(baslik, M + 64, y + 34); y += 58; metin.forEach((t) => yazi(t, { size: 22, sonra: 6 }));
    if (cv) { const mw = W - 2 * M, nat = Math.min(560, (cv.height * mw) / cv.width); let h = Math.min(nat, LIM - y - 14 - xl); if (h < Math.min(260, nat)) { yeni(); h = Math.min(nat, LIM - y - 14 - xl); } const r = Math.min(mw / cv.width, h / cv.height), w = cv.width * r, hh = cv.height * r; x.drawImage(cv, M + (mw - w) / 2, y, w, hh); x.strokeStyle = CIZGI; x.lineWidth = 1.5; x.strokeRect(M, y, mw, hh); y += hh + 12; }
    if (pl) yazi(pl, { size: 20, w: 700, sonra: 2 }); if (kl) yazi(kl, { size: 20, w: 700, sonra: 2 }); y += 18; };
  yeni();
  return { W, H, M, get x() { return x; }, get y() { return y; }, set y(v) { y = v; }, yeni, yer, yazi, h2, madde, gorsel, tablo, kutu, adim, sayfa,
    bitir() { const N = sayfa.length; sayfa.forEach((pc, i) => { const g = pc.getContext('2d'); g.font = `400 18px ${FF}`; g.fillStyle = GRI; g.textAlign = 'left'; g.fillText('hasturkgubre.com.tr  ·  Müşteri hizmetleri ' + TEL, M, H - 46); g.textAlign = 'right'; g.fillText(`Sayfa ${i + 1} / ${N}`, W - M, H - 46); g.textAlign = 'left'; }); return sayfa; } };
}
function daire(x, cx, cy, n) { x.fillStyle = '#fff'; x.strokeStyle = MUREKKEP; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 14, 0, 7); x.fill(); x.stroke(); x.fillStyle = MUREKKEP; x.font = `700 17px ${FF}`; x.textAlign = 'center'; x.fillText(String(n), cx, cy + 6); x.textAlign = 'left'; }

/* ---------------- PDF (JPEG sayfalar) ---------------- */
function pdfYap(sayfa) {
  const enc = new TextEncoder(), parca = [], ofs = []; let boy = 0;
  const yaz = (v) => { const b = typeof v === 'string' ? enc.encode(v) : v; parca.push(b); boy += b.length; };
  const nesne = (n, govde, akis) => { ofs[n] = boy; yaz(`${n} 0 obj\n${govde}\n`); if (akis) { yaz('stream\n'); yaz(akis); yaz('\nendstream\n'); } yaz('endobj\n'); };
  const PW = 595.28, PH = 841.89, n = sayfa.length;
  yaz('%PDF-1.4\n'); yaz(new Uint8Array([37, 226, 227, 207, 211, 10]));
  nesne(1, '<< /Type /Catalog /Pages 2 0 R >>');
  nesne(2, `<< /Type /Pages /Count ${n} /Kids [${sayfa.map((_, i) => 3 + i * 3 + ' 0 R').join(' ')}] >>`);
  sayfa.forEach((c, i) => { const b = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), jpg = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) jpg[k] = b.charCodeAt(k);
    const p = 3 + i * 3, icerik = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
    nesne(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`);
    nesne(p + 1, `<< /Length ${icerik.length} >>`, icerik);
    nesne(p + 2, `<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg); });
  const son = 3 + n * 3, xref = boy; yaz(`xref\n0 ${son}\n0000000000 65535 f \n`); for (let i = 1; i < son; i++) yaz(String(ofs[i]).padStart(10, '0') + ' 00000 n \n');
  yaz(`trailer\n<< /Size ${son} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parca, { type: 'application/pdf' });
}

/* ---------------- Kılavuz ---------------- */
/** o: { R, ad, tur, kapak (canvas), fiyat (TL ya da null), konAdi(kod), insan() } → { blob, dosya } */
export async function kilavuz(o) {
  const { R, ad, tur, konAdi } = o, Y = yapiHazirla(R), AD = adimlar(Y, R, tur), C = cizici(Y, o.insan);
  try {
    // Profil numaraları: boy sırasına göre (uzundan kısaya) 1, 2, 3 …
    const boylar = [...new Set(Y.tum.map((u) => u.len))].sort((a, b) => b - a), PN = new Map(boylar.map((L, i) => [L, i + 1])), PC = {}; Y.tum.forEach((u) => (PC[u.len] = (PC[u.len] || 0) + 1));
    const profOf = (ms) => { const g = {}; ms.forEach((u) => (g[u.len] = (g[u.len] || 0) + 1)); return Object.keys(g).map((L) => ({ n: PN.get(+L), len: +L, cnt: g[L] })).sort((a, b) => a.n - b.n); };
    const konOf = (cs) => { const g = {}; cs.forEach((c) => { if (c.kod) g[c.kod] = (g[c.kod] || 0) + 1; }); return Object.entries(g).sort(); };
    const isaret = (ms) => { const sinir = ms.length > 40 ? 4 : 1e9, say = {}; return ms.filter((u) => (say[u.len] = (say[u.len] || 0) + 1) <= sinir).map((u) => ({ p: u.m, t: String(PN.get(u.len)), d: 1 })); };
    const konIsaret = (cs) => { const L = cs.filter((c) => c.kod); if (L.length <= 36) return L.map((c) => ({ p: c.p, t: c.kod.replace(/^PC(\d+)/, 'PC-$1') })); const s = {}; return L.filter((c) => (s[c.kod] = (s[c.kod] || 0) + 1) <= 2).map((c) => ({ p: c.p, t: c.kod.replace(/^PC(\d+)/, 'PC-$1') })); };
    for (const s of AD) { if (s.son || s.sabit) { s.cv = s.goster.size ? C.tum((k) => s.goster.has(k)) : null; continue; } s.prof = profOf(s.yeniU); s.kon = konOf(s.yeniD); s.cv = C.adim(s.goster, s.yeniU, s.yeniD, (s.etiket ? konIsaret(s.yeniD) : []).concat(isaret(s.yeniU))); await bekle(5); }
    // Kapı / kapak kanatları ve pencereler
    const kapak = tur === 'Y', ekAd = [];
    kanatlar(Y.tum.filter((u) => u.kapi)).forEach(({ uye, n }) => { const ds = Y.kapiDug.filter((c) => uye.some((u) => [u.a, u.b].some((q) => Math.hypot(q[0] - c.p[0], q[1] - c.p[1], q[2] - c.p[2]) < 5)));
      const g = {}; ds.forEach((c) => { if (c.kod) g[c.kod] = (g[c.kod] || 0) + n; });
      AD.push({ baslik: kapak ? 'Kapağı hazırlayın' : 'Kapı kanadını hazırlayın', metin: [(kapak ? 'Kapak çerçevesini' : 'Kapı kanadını') + ' düz bir zemine yatırarak kurun. Profilleri ve köşe konnektörlerini görseldeki numaralara göre birleştirin; ardından civataları takıp sıkın.' + (n > 1 ? ' Bu ' + (kapak ? 'kapaktan ' : 'kanattan ') + n + ' adet hazırlayın.' : '')],
        cv: C.kanat(uye, ds, konIsaret(ds).concat(isaret(uye))), prof: profOf(uye).map((q) => ({ ...q, cnt: q.cnt * n })), kon: Object.entries(g).sort() }); ekAd.push(1); });
    if (Y.tum.some((u) => u.kapi)) AD.push({ baslik: kapak ? 'Kapağı takın' : 'Kapıyı takın', metin: ['Bu adımda el matkabına ihtiyacınız var. ' + (kapak ? 'Kapağı tezgâhın üst çerçevesine oturtun; kelebek menteşeleri akıllı vidalarla kapağın arka kenarına ve üst çerçevenin arka kuşağına takın. Kapağın serbestçe açılıp kapandığını kontrol edin.' : 'Kapı kanadını kapı boşluğuna oturtun. Kapının açılacağı yöne göre kelebek menteşeleri akıllı vidalarla kanada ve dikmeye takın. Kanadın serbestçe açılıp kapandığını kontrol edin.')], cv: C.tum() });
    const pen = Y.tum.filter((u) => u.win); if (pen.length) { const nw = Math.round(pen.length / 4); AD.push({ baslik: 'Pencereyi hazırlayın ve takın', metin: ['Pencere kanadını düz bir zemine yatırarak kurun: 4 profili köşelerde PC002 konnektörlerle birleştirin ve civatalarını sıkın.', 'Kanadı görseldeki bölmeye, çerçevenin içine her yanda eşit boşlukla oturtun. Üst kenarını 2 kelebek menteşe ile üstteki profile el matkabı ve akıllı vidalarla takın; pencere alttan dışarı doğru açılır.' + (nw > 1 ? ' ' + nw + ' adet pencere hazırlayın.' : '')], cv: C.tum(), prof: profOf(pen), kon: [['PC002', 4 * nw]] }); }
    // Ölçü etiketleri
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y1 = -1e9; Y.tum.forEach((u) => [u.a, u.b].forEach((q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[2]); y1 = Math.max(y1, q[1]); }));
    const gen = (x1 - x0 + 30) / 1000, uz = (z1 - z0 + 30) / 1000, yuk = (Math.max(0, y1) + 15) / 1000, et = { gen: 'Genişlik ' + F2(gen) + ' m', uzun: 'Derinlik ' + F2(uz) + ' m', yuk: 'Yükseklik ' + F2(yuk) + ' m' };
    const ol3 = C.olcu3b(et), on = C.gorunus('on', et), yan = C.gorunus('yan', et), ust = C.gorunus('ust', et);
    const kap = o.kapak;

    /* --- sayfalar --- */
    const B = belge(ad + ' · ' + R.kod), x = () => B.x, tarih = new Date().toLocaleDateString('tr-TR');
    B.x.fillStyle = YESIL; B.x.fillRect(0, 0, B.W, 14); B.x.font = `700 22px ${FF}`; B.x.fillStyle = YESIL; B.x.fillText('HASTÜRK · KENDİN TASARLA', B.M, 70);
    B.x.fillStyle = MUREKKEP; B.x.font = `700 62px ${FF}`; B.x.fillText('Kurulum Kılavuzu', B.M, 146); B.x.font = `600 32px ${FF}`; B.x.fillText(ad, B.M, 196); B.x.fillRect(B.M, 218, B.W - 2 * B.M, 3); B.y = 244;
    B.gorsel(kap || C.tum(), 640, 420);
    B.yazi(R.olcu, { size: 38, w: 700, sonra: 2 }); if (R.alt) B.yazi(R.alt, { size: 22, col: GRI, sonra: 10 });
    B.yazi('Tasarım kodu: ' + R.kod + '   ·   Tarih: ' + tarih, { size: 22, w: 700, sonra: 8 });
    B.yazi('Bu kılavuz, Kendin Tasarla aracında oluşturduğunuz tasarımdan otomatik hazırlanmıştır. Parça adetleri, ölçüler ve görseller bu tasarıma özeldir. Tasarım kodunu müşteri hizmetlerimize ilettiğinizde aynı tasarımı birebir açabiliriz.', { size: 20, col: GRI, sonra: 12 });

    B.h2('1. Paket içeriği');
    B.yazi('Kuruluma başlamadan önce paketten çıkan parçaları bu listeyle karşılaştırın ve profilleri boylarına göre ayrı gruplar hâlinde dizin.', { size: 22 });
    B.tablo(R.parca.map((r) => Object.assign([r[0], r[1]], { top: /^Toplam/.test(r[0]) })), 'Profiller ve bağlantı malzemeleri');
    B.tablo(R.kon.map((r) => Object.assign([/^Toplam/.test(r[0]) ? r[0] : konAdi(r[0]), r[1]], { top: /^Toplam/.test(r[0]) })), 'Konnektörler');
    B.tablo(boylar.map((L) => Object.assign(['Profil ' + F1(L) + ' cm', PC[L] + ' adet'], { daire: PN.get(L) })), 'Profil numaraları');
    B.yazi('Kurulum adımlarındaki görsellerde profiller bu numaralarla, konnektörler kodlarıyla işaretlenmiştir. Kuruluma başlamadan önce profilleri boylarına göre ayırıp bu numaralarla gruplayın.', { size: 21, w: 600 });
    if (o.fiyat) B.yazi('Fiyat: ' + Math.round(o.fiyat).toLocaleString('tr-TR') + ' TL', { size: 23, w: 700, sonra: 6 });
    B.yazi(o.paket || 'Pakette yalnız iskelet bulunur: profiller, konnektörler ve civata somun setleri. Örtü, tel, ahşap tabla ve görsellerdeki diğer nesneler pakete dahil değildir.', { size: 21, w: 700, sonra: 14 });
    B.h2('Gerekli aletler');
    const yukseklik = yuk, delik = Y.tum.some((u) => u.kapi || u.win);
    B.madde(['Somun anahtarı (kutunun içinde)'].concat(delik ? ['El matkabı ve akıllı vida (menteşeler için)'] : [], yukseklik > 1.8 ? ['Merdiven (yapı ' + F2(yukseklik) + ' m yüksekliğinde)'] : [], ['Şerit metre (köşegen kontrolü için)', 'İş eldiveni']));
    B.h2('Kurulumdan önce');
    B.madde(['Kurulum yerini düzleyin; zemin sert, düz ve su tutmayan olsun.', 'Rüzgârlı ve yağışlı havada kurulum yapmayın.', 'En az iki kişiyle çalışın; uzun profilleri tek başınıza taşımayın.', 'Profilleri boylarına, konnektörleri kodlarına göre ayırın; eksik parça varsa kuruluma başlamadan bize bildirin.']);
    B.kutu('Önemli: Civataları en son takın', ['Kurulum boyunca hiçbir civatayı takmayın. Konnektörler profillere sıkıca oturur ve iskelet civatasız da ayakta durur. Önce bütün profilleri konnektörlerle birleştirin, her şeyin doğru yerde olduğundan emin olun; civataları en sonda takıp iyice sıkın.', 'Yanlış takılan bir parçayı sökmek civatasızken çok daha kolaydır.', 'Bazı profilleri takarken yandaki profili hafifçe esnetmeniz gerekir; civata takılıysa profil esnemez ve montaj zorlaşır.']);
    B.h2('2. Kurulum adımları', 640);
    AD.forEach((s, i) => B.adim(i + 1, s.baslik, s.metin, s.cv, s.prof, s.kon));
    B.h2('3. Ölçüler');
    B.yazi('Ölçüler profillerin dış yüzeyinden alınmıştır. Kurulumdan sonra bu ölçülerle karşılaştırın; köşegenler eşitse yapı gönyesindedir.', { size: 21, col: GRI });
    B.gorsel(ol3, 820, 420, true);
    B.tablo([['Genişlik', F2(gen) + ' m'], ['Derinlik', F2(uz) + ' m'], ['Yükseklik (en üst nokta)', F2(yuk) + ' m'], ['Kapladığı alan', F1(gen * uz) + ' m²']].concat((R.levha || []).map((r) => [r[0], r[1]]), R.alt ? [['Özet', R.alt]] : []), 'Ölçü tablosu');
    B.yazi('Önden görünüş', { size: 24, w: 700, sonra: 4 }); B.gorsel(on, 560, 300);
    B.yazi('Yandan görünüş', { size: 24, w: 700, sonra: 4 }); B.gorsel(yan, 560, 300);
    B.yazi('Üstten görünüş', { size: 24, w: 700, sonra: 4 }); B.gorsel(ust, 560, 300);
    B.h2('4. Önemli notlar');
    B.madde([].concat(R.not ? [R.not] : [], o.uyari || [], ['Profillerin kesik uçları keskin olabilir; kurulum boyunca eldiven kullanın.', 'Yapının taşıma kapasitesi test edilmemiştir; üzerine çıkmayın, yük asmayın.', 'Kar ve fırtına beklenen günlerde yapıyı kontrol edin, çatıda biriken karı temizleyin.', 'Rüzgâr alan yerlerde yapıyı zemine sabitleyin.', 'Çocukları ve evcil hayvanları kurulum alanından uzak tutun.']));
    B.kutu('Takıldığınız bir nokta mı var?', ['Kurulum sırasında takıldığınız bir yer olursa tasarım kodunuzla birlikte müşteri hizmetlerimizi arayın.'], '☎ ' + TEL);
    const blob = pdfYap(B.bitir());
    const dosya = ('hasturk-kurulum-' + ad + '-' + R.kod).toLowerCase().replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-') + '.pdf';
    return { blob, dosya, sayfa: B.sayfa.length };
  } finally { C.kapat(); }
}
