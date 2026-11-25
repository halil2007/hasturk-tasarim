// Kendin Tasarla: tasarımın fiyatı ve sepet seçenekleri (ikas kişiselleştirilmiş ürün).
// Ürün = taban fiyat + her profil fiyat boyu ve her konnektör için birer seçenek. Bir seçeneğin değerleri adet basamaklarıdır
// (1, 2, 3, 4, 10, 20, 30, 40, 100 …); istenen adet bu değerlerin toplamı olarak seçilir (ör. 23 = 20 + 3). Fiyat seçilen
// değerlerin fiyatlarının toplamıdır; sepet de aynı toplamı hesaplar. Veri: secenek.json (scripts/tasarla-veri.mjs).
const BASAMAK = [[], [1], [2], [3], [4], [1, 4], [2, 4], [3, 4], [1, 3, 4], [2, 3, 4]];
const num = (t) => parseFloat(String(t).replace(/\./g, '').replace(',', '.'));
// Fiyata yalnız profiller ve konnektörler girer (üretim hesabıyla aynı); civata, menteşe, öneri satırları, aparat ve yatak
// parçaları gibi diğer kalemler ayrıca fiyatlanmaz, Tasarım Kodu alanındaki listeyle siparişe yazılır. Yatak destek ünitesinde
// sebze yatağının kendisi de fiyata girer; bunun için seçenek tanımlanana kadar o tasarımlar müşteri hizmetlerine yönlendirilir.

/** n adedi seçeneğin değerlerine böler: [{id, adet, fiyat}] ya da null (bir basamağın değeri tanımlı değilse) */
export function bol(opt, n) {
  const out = []; let k = 1;
  while (n > 0) { const d = n % 10; for (const s of BASAMAK[d]) { const v = opt.d.find((x) => x.adet === s * k); if (!v) return null; out.push(v); } n = Math.floor(n / 10); k *= 10; }
  return out;
}
/** R: motorun sonucu (parca, kon, kod, olcu); S: secenek.json. Dönen: { tamam, eksik[], kalem[], birim, secenekler[] } */
export function fiyatPlan(R, S, ad) {
  const kalem = [], eksik = [], gecici = [], gercek = [];
  const ekle = (etiket, opt, n, anahtar) => {
    if (!opt) { eksik.push(etiket); return; }
    const v = bol(opt, n); if (!v) { eksik.push(etiket + ' (' + n + ' adet)'); return; }
    kalem.push({ etiket, anahtar, n, opt: opt.id, values: v.map((x) => x.id), tutar: v.reduce((a, x) => a + x.fiyat, 0) });
  };
  const prof = {}; let yatak = null;
  for (const [t, q] of R.parca) {
    const m = t.match(/^Profil ([\d,]+) cm(?: \(özel kesim, ([\d,]+) fiyatı\))?/);
    if (m) { const fb = String(num(m[2] || m[1])); prof[fb] = (prof[fb] || 0) + num(q); gercek.push(t.replace(/ \(özel kesim.*\)/, '') + ' × ' + num(q)); }
    else if (/^Sebze yatağı/.test(t)) yatak = t; // sebze yatağı bu ürünün fiyatına girmez (ayrı ürün); müşteriye not olarak gösterilir
  }
  // Seçeneği henüz tanımlı olmayan boy, sistemin çalışması için geçici olarak tanımlı bir boyla fiyatlanır: kısa boy bir üstteki
  // boyun fiyatıyla, 199,5 cm iki adet 99,5 cm fiyatıyla (gerçek boy ve adet Tasarım Kodu alanında yazılı kalır)
  const tanimli = Object.keys(S.profil).map(Number).sort((a, b) => a - b), yerine = {};
  for (const fb of Object.keys(prof)) {
    if (S.profil[fb]) { yerine[fb] = (yerine[fb] || 0) + prof[fb]; continue; }
    const L = +fb, ust = tanimli.find((v) => v >= L);
    if (ust != null) yerine[String(ust)] = (yerine[String(ust)] || 0) + prof[fb];
    else if (S.profil['99.5'] && L <= 200) yerine['99.5'] = (yerine['99.5'] || 0) + 2 * prof[fb];
    else { eksik.push('Profil ' + fb.replace('.', ',') + ' cm'); continue; }
    gecici.push('Profil ' + fb.replace('.', ',') + ' cm');
  }
  for (const fb of Object.keys(yerine).sort((a, b) => b - a)) ekle('Profil ' + fb.replace('.', ',') + ' cm', S.profil[fb], yerine[fb], 'P' + fb);
  for (const [t, q] of R.kon) { const k = t.split(' ')[0]; if (/^Toplam/.test(t)) continue; ekle(k, S.kon[k], num(q), k); }
  const birim = S.taban + kalem.reduce((a, x) => a + x.tutar, 0);
  const secenekler = kalem.map((x) => ({ productOptionId: x.opt, productOptionsSetId: S.set, values: x.values }));
  if (S.kod && S.kod.id) {
    const ozet = 'Profiller: ' + gercek.join(', ') + ' · Konnektörler: ' + R.kon.filter((r) => !/^Toplam/.test(r[0])).map((r) => r[0].split(' ')[0] + ' × ' + num(r[1])).join(', ') + (yatak ? ' · ' + yatak + ' (ayrı)' : '');
    secenekler.push({ productOptionId: S.kod.id, productOptionsSetId: S.set, values: [(R.kod + ' · ' + (ad || '') + ' · ' + (R.olcu || '') + ' · ' + ozet).slice(0, S.kod.max || 1000)] });
  }
  return { tamam: !eksik.length, eksik, gecici, yatak, kalem, birim, secenekler };
}
