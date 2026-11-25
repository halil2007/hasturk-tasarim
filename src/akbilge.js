// Ak Bilge (isim config.json > akbilge.name ile değişir): müşterinin tarım sorusunu cevaplar.
//   1) Soru önce hazır soru havuzunda aranır (src/akbilge-havuz.json; scripts/akbilge-havuz.mjs üretir). Bulunursa cevap
//      anında ve ücretsiz döner. Havuzdaki rakamlar yalnız doğrulanmış tablolardan gelir.
//   2) Bulunamazsa ve anahtar + günlük sınır uygunsa Claude'a sorulur: en yakın havuz cevapları ve ilgili ürünler bağlam
//      olarak verilir, model yalnız bu bağlamdaki rakamları ve ürünleri kullanabilir.
//   3) Claude'un cevabı veritabanına 'onay-bekliyor' olarak yazılır; onaylanan cevaplar sonraki aynı soruda havuzdan gelir.
// Kişisel veri tutulmaz: soru metni, cevap, tarih; IP / çerez / kimlik yok.
import Anthropic from '@anthropic-ai/sdk';
// Soru havuzu büyük (3,7 MB): Worker'da metin olarak gelir (wrangler.jsonc > rules) ve ilk soruda bir kez çözülür; sunucunun
// açılışı (Cloudflare'in açılış süresi sınırı) bu yükü taşımaz. Yerel testlerde nesne olarak da gelebilir.
import HAVUZ_HAM from './akbilge-havuz.json';
let HAVUZ_ = null;
export const havuz = () => HAVUZ_ || (HAVUZ_ = typeof HAVUZ_HAM === 'string' ? JSON.parse(HAVUZ_HAM) : HAVUZ_HAM);
import TARIM from './akbilge-tarim.json';
import URUN_KART from './akbilge-urun.json';
import { rehberMetni, GRUPLAR, OZEL_KARISIM, TOPRAK_SORUSU, KENDIM, KARISIM_ACIK } from './toprak.js';

export const MODEL = 'claude-opus-5-5';
const DAILY_LIMIT = 150;     // günde en fazla bu kadar Claude sorgusu (env.AK_DAILY_LIMIT ile değişir)
const MAX_Q = 1000;          // karakter (birkaç bitkinin derdi tek mesajda anlatılabilsin)

// ---------- Türkçe metin ----------
const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, (c) => FOLD[c])
  .replace(/['’‘`´]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// Soruya anlam katmayan dolgu kelimeleri (soru kalıbı kelimeleri — ne, nasıl, kaç… — KALIR, niyeti onlar taşır)
const FILL = new Set(['merhaba', 'selam', 'selamlar', 'iyi', 'gunler', 'aksamlar', 'lutfen', 'acaba', 'abi', 'abla', 'hocam', 'usta', 'kardesim',
  'tesekkurler', 'tesekkur', 'ederim', 'almaliyim', 'almali', 'alayim', 'alsam', 'almak', 'onerirsiniz', 'onerir', 'misiniz', 'musunuz', 'yardimci', 'olur', 'musun', 'sayin', 'yetkili', 'bilgi', 'alabilir', 'miyim', 'sormak', 'istiyorum', 'istiyordum', 'bir', 'bu', 'su', 've', 'ile', 'ya', 'da', 'de', 'ki', 'mi', 'mu', 'benim', 'bana', 'sizde', 'var', 'cok', 'sey', 'seyler', 'lazim', 'gerek', 'gerekir', 'gerekiyor', 'almam', 'alirim', 'kullanmaliyim', 'kullanayim', 'kullanmam',
  // yazışma dolguları: "varmı elinizde", "tahtakurusu nu", "dayı"
  'varmi', 'elinizde', 'elinde', 'mevcut', 'mevcutmu', 'dayi', 'nu', 'ni', 'yu', 'yi', 'peki', 'olarak', 'ben', 'simdi', 'ama', 'gibi']);
const stem = (t) => (t.length > 5 ? t.slice(0, 5) : t);
// "ağaç/ağacı/ağacına" bitki adının parçası olarak anlam katmaz (limon ağacı = limon)
const FILL_STEM = new Set(['agac', 'agaci', 'agacl', 'agacm']);
export const toks = (s) => [...new Set(norm(s).split(' ').filter((t) => t && !FILL.has(t)).map(stem).filter((t) => !FILL_STEM.has(t)))];

// ---------- Havuz dizini (her Worker örneğinde bir kez kurulur) ----------
let IDX = null, IDX_X = { key: '', idx: null };
function index(extra = []) {
  if (IDX && !extra.length) return IDX;
  // Ek kayıtlarla (onaylı / kayıtlı Claude cevapları) kurulan dizin, liste değişmedikçe yeniden kurulmaz
  const key = extra.length ? extra.length + ':' + extra[0].i + ':' + extra[extra.length - 1].i : '';
  if (key && IDX_X.key === key) return IDX_X.idx;
  const entries = havuz().concat(extra), pats = [], df = new Map();
  entries.forEach((e, ei) => e.s.forEach((q) => {
    const ts = toks(q); if (!ts.length) return;
    pats.push({ ei, ts, r: ' ' + norm(q) + ' ' });
    ts.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  }));
  const N = pats.length, idf = new Map();
  df.forEach((n, t) => idf.set(t, Math.log(1 + N / n)));
  const byTok = new Map(); // ters dizin: kelime → kalıplar
  pats.forEach((p, pi) => { p.w = p.ts.reduce((a, t) => a + idf.get(t), 0); p.ts.forEach((t) => { if (!byTok.has(t)) byTok.set(t, []); byTok.get(t).push(pi); }); });
  // Her kaydın konu(ları): tüm varyantları konuBul ile etiketlenir (match'te konu uyumsuzluğunu cezalandırmak için)
  const eKonu = entries.map((e) => { const s = new Set(); e.s.forEach((q) => { const k = konuBul(norm(q)); if (k) s.add(k); }); return s; });
  const built = { entries, pats, idf, byTok, N, eKonu };
  if (!extra.length) IDX = built; else IDX_X = { key, idx: built };
  return built;
}
// Konu kelimeleri: soru "gübre" diye soruyorsa "toprak" cevabı verilmez (bu kelimeler sık geçtiği için idf'leri düşük kalır)
const TOPIC = { gubre: 'g', besin: 'g', besle: 'g', dozu: 'g', topra: 't', harci: 't', tohum: 'e', ekili: 'e', ekim: 'e', ekme: 'e', saksi: 's', pompa: 'p', ilac: 'i', ilacl: 'p',
  sulan: 'w', sulam: 'w', gunes: 'l', isik: 'l', golge: 'l', budam: 'b', budan: 'b', zehir: 'z', zarar: 'z' };
const topics = (ts) => new Set(ts.map((t) => TOPIC[t]).filter(Boolean));
// Belirti/bakım konuları: soru bunlardan biriyse, kaydın konusu FARKLI bir belirti/bakım konusuysa puanı düşürülür
// (ör. "yaprak döküyor" sorusuna "yaprak sararır" cevabı gitmesin). Yapısal konular (toprak, gübre, litre, hasta,
// zararlı) buraya katılmaz; toprak/gübre'yi TOPIC kovası, diğerlerini bitki eşlemesi ayırır.
const KONU_AYIRT = new Set(['cicek', 'sararma', 'dokulme', 'kararma', 'kivrilma', 'curume', 'kuruma', 'solma', 'buyume', 'budama', 'sulama', 'isik', 'zehir', 'sicaklik', 'cogaltma', 'hasat', 'dikim', 'altkarar']);
// Kelime benzerliği: aynı kök 1; ilk 4 harf aynı (yazım farkı, ek) 0,7
const sim = (a, b) => (a === b ? 1 : a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4) ? 0.7 : 0);

// En iyi eşleşmeler: kalıbın büyük kısmı soruda, sorunun büyük kısmı kalıpta olmalı (idf ağırlıklı)
export function match(q, { extra = [], top = 5, product = null } = {}) {
  const X = index(extra), qt = toks(q);
  if (!qt.length) return [];
  const qi = (t) => X.idf.get(t) || Math.log(1 + X.N); // havuzda hiç geçmeyen kelime: en nadir sayılır
  const qw = qt.reduce((a, t) => a + qi(t), 0), qtop = topics(qt);
  // Eşitlik bozucu: kökleri aynı iki kalıptan (biber / biberiye) sorudaki kelimeyi AYNEN içeren öne geçer
  const qr = norm(q).split(' ').filter((t) => t.length >= 3);
  const qk = konuBul(norm(q)); // sorunun konusu (sararma/dökülme/sulama…): yanlış konudaki kaydı cezalandırmak için
  const cand = new Set();
  qt.forEach((t) => { (X.byTok.get(t) || []).forEach((pi) => cand.add(pi)); if (t.length >= 4) X.byTok.forEach((list, k) => { if (k !== t && k.slice(0, 4) === t.slice(0, 4)) list.forEach((pi) => cand.add(pi)); }); });
  const best = new Map();
  cand.forEach((pi) => {
    const p = X.pats[pi];
    let hitP = 0, hitQ = 0;
    p.ts.forEach((t) => { let m = 0; qt.forEach((u) => { m = Math.max(m, sim(t, u)); }); hitP += m * X.idf.get(t); });
    qt.forEach((u) => { let m = 0; p.ts.forEach((t) => { m = Math.max(m, sim(t, u)); }); hitQ += m * qi(u); });
    const cp = hitP / p.w, cq = hitQ / qw;
    let sc = 2 * cp * cq / (cp + cq || 1); // iki yönlü kapsama (F1)
    if (qtop.size) { const pt = topics(p.ts); if (pt.size && ![...qtop].some((x) => pt.has(x))) sc *= 0.5;
      // Bakım kartı yalnız sorulan konudaysa: "ne zaman ekilir" sorusuna (bitkinin dikim kartı yoksa) çiçeklenme kartı verilmez
      else if (X.entries[p.ei].t === 'bakim' && ![...qtop].some((x) => pt.has(x))) sc *= 0.4; }
    // Belirli bir bitkiye ait cevap (doz, toprak, ekim) yalnız o bitki soruda geçiyorsa verilir
    const eb = X.entries[p.ei].b;
    // Bitki adı yazım benzerliğiyle değil, kökünden eşleşmeli (kaladyum ≠ kalanşo): biri ötekinin başıysa (nane / naneye) sayılır
    if (eb) { const bt = toks(eb.replace(/\(.*?\)/g, ' ')); if (bt.length && !bt.some((t) => qt.some((u) => t.length >= 3 && u.length >= 3 && (u.startsWith(t) || t.startsWith(u))))) sc *= 0.4; }
    // Konu uyumsuzluğu: soru belirgin bir belirti/bakım konusundaysa, kayıt o konuyu hiç içermeyip başka bir
    // belirti/bakım konusundaysa güçlü ceza (ör. "yaprak döküyor" → "yaprak sararır" kaydı geri plana düşer)
    const eks = X.eKonu[p.ei];
    if (qk && KONU_AYIRT.has(qk) && eks && !eks.has(qk) && [...eks].some((k) => KONU_AYIRT.has(k))) sc *= 0.3;
    if (product && X.entries[p.ei].p === product) sc += 0.08; // müşterinin bulunduğu ürün sayfasıyla ilgili cevaba hafif öncelik
    if (qr.length) sc += 0.004 * qr.filter((t) => p.r.includes(' ' + t + ' ')).length / qr.length;
    const prev = best.get(p.ei);
    if (!prev || sc > prev.sc) best.set(p.ei, { sc, cp, cq, pat: p });
  });
  return [...best.entries()].sort((a, b) => b[1].sc - a[1].sc).slice(0, top)
    .map(([ei, r]) => ({ e: X.entries[ei], sc: +r.sc.toFixed(3), cp: +r.cp.toFixed(3), cq: +r.cq.toFixed(3) }));
}
// ---------- Toprak niyeti: bitki adı (yazım hatasına dayanıklı) + toprak sorusu → bitkinin toprak kartı ----------
// "Bengovil toprağı lazım" (yazım hatası), "kızılcık toprağı hazırlayabilir misin" (karışım isteği) gibi sorular havuz
// kalıbına uymasa da yapay zekâya gitmeden bitkinin kartına (hazır toprak; karışım istenirse tarif ve sepete ekleme) gider.
const mesafe = (a, b) => { // harf ekleme / silme / değiştirme / yan yana yer değiştirme sayısı
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
};
let BT = null;
function bitkiler() {
  if (BT) return BT;
  const voc = new Set(); havuz().forEach((e) => e.s.forEach((q) => norm(q).split(' ').forEach((w) => voc.add(w))));
  const list = havuz().filter((e) => e.t === 'bitki-toprak' && e.b).map((e) => ({ e, adlar: e.b.split(',').map((x) => norm(x.replace(/\(.*?\)/g, ' ')).split(' ').filter((w) => w.length >= 2)).filter((a) => a.length) }));
  const adK = new Set(list.flatMap((x) => x.adlar.flat()));
  return (BT = { list, voc, adK });
}
// Sorudaki kelime bitki adının kelimesi mi: aynısı, ekli hali (begonvilin) ya da sözlükte olmayan yazım hatası (bengovil)
function kelimeUyar(w, t, voc) {
  if (w === t || (t.length >= 3 && w.startsWith(t) && w.length - t.length <= 4)) return 2;
  // Ad sonundaki ünlü düşmüş: "yaban mersin" → yaban mersini
  if (w.length >= 5 && t.length === w.length + 1 && t.startsWith(w) && /[iu]$/.test(t)) return 1;
  if (t.length < 5 || w[0] !== t[0] || voc.has(w)) return 0;
  const k = t.length >= 7 ? 2 : 1;
  return mesafe(w, t) <= k || mesafe(w.slice(0, t.length), t) <= k ? 1 : 0;
}
const TOPRAK_DEGIL = /gubre|ilac|bocek(?! ?yiyen)|hastalik|zararli|sulam|budam/;
// Sorudaki kelimeler; kesme işaretli kelimenin kökü de ayrıca eklenir ("zz'im" → zz, zzim)
const kelimeler = (q) => {
  const ws = norm(q).split(' ').filter((w) => w.length >= 2);
  for (const m of String(q || '').matchAll(/([\p{L}\p{N}]+)['’‘`´][\p{L}]+/gu)) { const k = norm(m[1]); if (k.length >= 2 && !ws.includes(k)) ws.push(k); }
  return ws;
};
const toprakOk = (n) => TOPRAK_SORUSU.test(n) && !TOPRAK_DEGIL.test(n);
export function toprakNiyet(q) {
  const n = norm(q);
  if (!toprakOk(n)) return null;
  const B = bitkiler(), ws = kelimeler(q).filter((w) => !FIIL.has(w));
  let best = null;
  B.list.forEach((x) => x.adlar.forEach((ad) => {
    let puan = 0;
    for (const t of ad) { const m = Math.max(0, ...ws.map((w) => kelimeUyar(w, t, B.voc))); if (!m) return; puan += m * t.length; }
    if (!best || puan > best.puan) best = { e: x.e, puan };
  }));
  return best ? { e: best.e, kendim: KENDIM.test(n) } : null;
}
// ---------- Konuşmayı anlama: günlük yazım, bitki + konu, önceki mesajlar ----------
// Müşteri "monsteranın yapraklari sariyo ne yapim", "abi geçen hafta limon aldım gübre lazım" gibi dağınık yazar ya da
// önceki mesajına bağlı sorar ("peki ne kadar sulayayım"). Cümleden bitki ve konu çıkarılır, havuzun anladığı net soruya
// çevrilir ("monstera yaprakları sararıyor"). Önceki mesajlar yalnız bu istekte kullanılır, kaydedilmez.
const GUNLUK = [[/\b(\w+?[iu])yo\b/g, '$1yor'], [/\b(na?pi?y?(i|a)?m|ne yap(i|a)?y?(i|a)?m|ne yapcam|ne yapicam|napcam)\b/g, 'ne yapmaliyim'],
  [/\bediyo\b/g, 'ediyor'], [/\bdiyo\b/g, 'diyor'], [/\bmisiniz\b/g, 'misiniz'],
  // "bu ay ne ekebilirim" → ne ekilir; "minik sinek" → küçük sinek
  [/\b(ekebilirim|ekebiliriz|ekeyim|eksem|ekilebilir|ekmeliyim)\b/g, 'ekilir'], [/\b(dikebilirim|dikeyim|diksem|dikilebilir|dikmeliyim)\b/g, 'dikilir'], [/\bminik\b/g, 'kucuk'], [/\bucus(uyor|uyorlar|an|ur)\w*/g, 'var']];
export const gunluk = (n) => GUNLUK.reduce((a, [r, t]) => a.replace(r, t), n);
// Konu → havuzun anladığı soru kalıbı (p: bitki adı). t: null olanlar (zararlılar) havuzun kendi bitki adlı kalıplarına bırakılır.
const KONULAR = [
  ['zararli', /\b(bocek\w*|sinek\w*|kurt\w*|kurtcuk\w*|tirtil\w*|bit|biti|bitler\w*|unlu bit\w*|orumcek\w*|salyangoz\w*|karinca\w*)\b/, null],
  ['altkarar', /\b(alti|altlari|dibi|ucu|uclari) (kar\w*|curu\w*|siyah\w*)/, (p) => `${p} meyvesinin altı kararıyor`],
  ['cicek', /cicek\w* (dokul|dok|dus|sol)\w*|(tekrar|yeniden) (cicek )?ac\w*|cicek (ac(mi|ma)\w*|vermi\w*|tutmu\w*)|\bacmiyor\b|\bacmaz\b|cicek(len)?miyor\b/, (p) => `${p} neden çiçek açmıyor`],
  ['sararma', /\bsar(ar|ard|ari|iy|il)\w*|\bsari (oldu|olmus|oluyor|olur|renk\w*)|sarilas\w*/, (p) => `${p} yaprakları sararıyor`],
  ['dokulme', /\bdok(ul|uy|tu|er)\w*|yaprak dok\w*/, (p) => `${p} yaprak döküyor`],
  ['kararma', /\bkarar(iyor|di|mis|ma)\w*|\bsiyahla\w*|\bleke\w*/, (p) => `${p} yapraklarında leke`],
  ['kivrilma', /\bkivril\w*|\bkivir(iyor|di|mis)\w*|\bburus(uyor|tu|mus)\w*/, (p) => `${p} yaprakları kıvrılıyor`],
  ['curume', /\bcuru(du|yor|mus|me|k)\w*/, (p) => `${p} kökleri çürüdü`],
  ['kuruma', /\bkuru(du|yor|mus|maya|yup)\w*|\bkurudu\b/, (p) => `${p} yaprakları kuruyor`],
  ['solma', /\bsol(du|uyor|mus|gun)\w*|boyun\w* buk\w*|\bbayg\w*/, (p) => `${p} soluyor`],
  ['buyume', /buyu(mu|me)yor|\bbuyumuyor\b|\bcelimsiz\b|\bciliz\b/, (p) => `${p} büyümüyor`],
  ['budama', /\bbuda(n|m|r|y|ma|mali)\w*/, (p) => `${p} nasıl budanır`],
  ['sulama', /\bsula(n|m|r|y|di|mali)\w*|\bsu (ister|verme\w*|verilir|verey\w*)|ne kadar su\b|kac gunde bir\b/, (p) => `${p} nasıl sulanır`],
  ['litre', /kac (litre|lt|torba)|ne kadar toprak/, (p) => `${p} için kaç litre toprak lazım`],
  ['toprak', /\btopra\w*|\bharc\w*/, (p) => `${p} için toprak`],
  ['gubre', /\b(ne zaman|ne kadar|nasil|kac (gram|kilo|kg|kasik)) (ver|at)\w*|\bkac (gram|kilo|kg)\b|\bgubre\w*|\bbesin\w*|\bbesle\w*/, (p) => `${p} hangi gübre`],
  ['isik', /\bgunes\w*|\bisik\w*|\bgolge\w*|nereye koy\w*/, (p) => `${p} güneş sever mi`],
  ['zehir', /\bzehir\w*|\bkedi\w*|\bkopek\w*|cocuk\w* (icin )?(zarar|tehlike)\w*/, (p) => `${p} zehirli mi`],
  ['sicaklik', /\bkisa dayan\w*|\bsogug\w*|\bdona dayan\w*|\bkista\b|\bsoguk\w*|\bdon (vur|tut)\w*|\bderece\w*|\bkisin\b|kis bakim\w*|\bdondurur\w*/, (p) => `${p} kaç derecede yaşar`],
  ['cogaltma', /\bcogal\w*|\bcelik\w*|\bkoklen\w*|\byavru\w*/, (p) => `${p} nasıl çoğaltılır`],
  ['hasat', /meyve ver\w*|meyveye yat\w*|\bhasat\w*|\bolgun\w*|ne zaman toplan\w*/, (p) => `${p} ne zaman meyve verir`],
  ['dikim', /saksi\w* degis\w*|saksi\w* (buyut|yenile)\w*|\bdik(il|me|ey|ec)\w*|ne zaman ek\w*|\bekil(ir|mez)\w*/, (p) => `${p} ne zaman dikilir`],
  ['hasta', /\bhasta\w*|\bsorun\w*|\bderdi\b/, null],
];
export const konuBul = (n) => { for (const [k, r] of KONULAR) if (r.test(n)) return k; return null; };
// Yalnız konu sözcüğünden oluşan, bitkisi belli olmayan sorular ("gübre", "gübre lazım", "çiçeğim hasta"): önce bitki sorulur
const NETLESTIR = { gubre: 'Hangi bitkiniz için gübre arıyorsunuz? Bitkinizin adını yazın; ona uygun gübreyi ve miktarını söyleyeyim.',
  toprak: 'Hangi bitkiniz için toprak arıyorsunuz? Bitkinizin adını yazın; ona uygun toprağı söyleyeyim.',
  hasta: 'Bitkinizin adı ne ve ne görüyorsunuz (yapraklarda sararma, leke, kuruma, böcek gibi)? Yazarsanız olası nedenleri ve ne yapmanız gerektiğini söyleyeyim.',
  sulama: 'Hangi bitkinizi soruyorsunuz? Bitkinizin adını yazın; nasıl sulanacağını söyleyeyim.',
  budama: 'Hangi bitkinizi budamak istiyorsunuz? Bitkinizin adını yazın; ne zaman ve nasıl budanacağını söyleyeyim.',
  dikim: 'Hangi bitkiyi dikmek istiyorsunuz? Bitkinin adını yazın; dikim zamanını söyleyeyim.' };
const BOS = new Set(['bitki', 'bitkim', 'bitkime', 'bitkiler', 'bitkilerim', 'cicek', 'cicegim', 'cicegime', 'ciceklerim', 'ciceklere', 'agacim', 'ne', 'nasil', 'hangi', 'icin', 'yapmaliyim', 'zaman', 'kac', 'olmali', 'vereyim', 'verilir', 'verelim', 'lazim', 'iyi', 'gelir', 'peki', 'oldu', 'var', 'gerek', 'acil', 'yardim', 'eder', 'misin', 'misiniz']);
// Bitki adına benzeyen gündelik sözcükler: cam (pencere; Çam değil), soru ekleri (misin ≈ mısır)
// Gündelik fiil ve sözcükler bitki adı sayılmaz (yazım hatası toleransında alacağım ≈ adaçayı oluyordu)
const FIIL = new Set([
  'alacagim', 'alacagiz', 'alacak', 'alacaktim', 'aliyorum', 'almak', 'aldim', 'ekmek', 'ekecegim', 'sermek', 'serecegim', 'dokmek', 'dokecegim', 'istiyorum', 'isterim', 'yapacagim', 'koyacagim', 'kullanacagim', 'varolan', 'mevcut', 'sifirdan', 'uzerine', 'bahceme', 'bahcem', 'bilgin', 'bilginiz', 'acmiyor', 'acmiyorlar', 'acmiyo', 'telefon', 'telefonu']);
const ORTAK = new Set(['cam', 'misin', 'misiniz', 'musun', 'musunuz', 'miyim', 'miyiz', 'midir', 'mudur', 'neden', 'nasil', 'zaman', 'onerir', 'oneri', 'olur', 'olsun', ...FIIL]);
// Sorudaki bitki (havuzdaki bitki-toprak kayıtlarının adları ve diğer adları; yazım hatasına dayanıklı)
export function bitkiEsle(q) {
  const B = bitkiler(), ws = kelimeler(q).filter((w) => !ORTAK.has(w) && !FILL.has(w));
  let best = null;
  B.list.forEach((x) => x.adlar.forEach((ad) => {
    let puan = 0;
    for (const t of ad) { const m = Math.max(0, ...ws.map((w) => kelimeUyar(w, t, B.voc))); if (!m) return; puan += m * t.length; }
    if (!best || puan > best.puan) best = { e: x.e, ad: x.e.b.split(',')[0].trim(), grup: x.e.g || '', puan };
  }));
  return best;
}
// Sorudaki bütün bitkiler ("monstera ve limon ağacım var" → Monstera, Limon)
export function bitkilerHepsi(q) {
  const B = bitkiler(), ws = kelimeler(q).filter((w) => !ORTAK.has(w) && !FILL.has(w)), aday = [], enIyi = ws.map(() => 0);
  // Her adın her parçası sorudaki en iyi uyan kelimeye bağlanır; bir kelimeye tam uyan ad varsa benzeyen ad elenir
  // ("begonvilim": Begonvil evet, Begonya hayır)
  B.list.forEach((x) => x.adlar.forEach((ad) => {
    const es = ad.map((t) => { let bi = -1, bs = 0; ws.forEach((w, i) => { const m = kelimeUyar(w, t, B.voc); if (m > bs) { bs = m; bi = i; } }); return [bi, bs]; });
    if (es.some(([i]) => i < 0)) return;
    es.forEach(([i, sc]) => { enIyi[i] = Math.max(enIyi[i], sc); });
    aday.push({ a: x.e.b.split(',')[0].trim(), es });
  }));
  const out = [], yer = {};
  aday.forEach(({ a, es }) => {
    if (!es.every(([i, sc]) => sc >= enIyi[i])) return;
    if (!out.includes(a)) out.push(a);
    yer[a] = Math.min(yer[a] ?? 99, ...es.map(([i]) => i));
  });
  const r = out.filter((a) => !out.some((b) => b !== a && norm(b).includes(norm(a)))) // "limon" ve "limon otu" ikisi birden değil
    .sort((a, b) => yer[a] - yer[b]); // yazıldığı sırayla
  return r.length > 1 ? r.filter((a) => !/^(Fide|Meyve fidanı)$/.test(a)) : r; // "biber ve domates fidem": genel "fide" ayrıca sayılmaz
}
const ELIPS = new Set(['peki', 'ya', 'de', 'da', 'ta', 'te', 'icin', 'bir', 'ayni', 'aynisi', 'mi', 'mu', 'olur', 'ne', 'bu', 'o', 'ama', 've', 'ile', 'sey', 'onun', 'bunun', 'benim', 'bende', 'gibi', 'oyle', 'durum', 'nasil', 'neyse', 'zaman', 'nasil', 'olur']);
export function yorumla(q, gecmis = []) {
  const n0 = norm(q), n = gunluk(n0), pb = bitkiEsle(n);
  let bitki = pb && pb.ad, grup = pb ? pb.grup : '', konu = konuBul(n), takip = false;
  // "peki ne kadar sulayayım": bitki önceki mesajlardan
  if (!bitki && konu) for (let i = gecmis.length - 1; i >= 0; i--) { const b = bitkiEsle(gunluk(norm(gecmis[i]))); if (b) { bitki = b.ad; grup = b.grup; takip = true; break; } }
  // "gübre" → (hangi bitki?) → "limon": konu son mesajdan
  if (bitki && !konu && gecmis.length) { const son = gunluk(norm(gecmis[gecmis.length - 1])); if (!bitkiEsle(son)) { const k2 = konuBul(son); if (k2) { konu = k2; takip = true; } } }
  // "ne yapmalıyım", "neden olur bu", "başka ne yapabilirim": bitki ve dert önceki mesajlardan
  if (!bitki && !konu && gecmis.length && /\b(ne yapmaliyim|ne yapayim|ne yapmam lazim|ne yapabilirim|neden( olur)?|niye( olur)?|sebebi ne|nedeni ne|cozumu ne|ne onerirsin|ne tavsiye edersin)\b/.test(n)) {
    for (let i = gecmis.length - 1; i >= Math.max(0, gecmis.length - 4); i--) {
      const g = gunluk(norm(gecmis[i]));
      if (!konu) { const k2 = konuBul(g); if (k2 && k2 !== 'hasta') konu = k2; }
      if (!bitki) { const b = bitkiEsle(g); if (b) { bitki = b.ad; grup = b.grup; } }
      if (konu && bitki) break;
    }
    if (konu) takip = true;
  }
  // "monstera nasıl sulanır" → "peki kauçuk?", "ya ortanca", "biber için": yalnız bitki adı yazılmış; konu önceki sorudan
  if (bitki && !konu && gecmis.length) {
    const bt = norm(pb.ad).split(' ').map((t) => t.slice(0, 4)), kalan = n.split(' ').filter((w) => w.length >= 2 && !FILL.has(w) && !ELIPS.has(w) && !bt.some((t) => w.startsWith(t)));
    if (!kalan.length) for (let i = gecmis.length - 1; i >= Math.max(0, gecmis.length - 3) && !konu; i--) { const k2 = konuBul(gunluk(norm(gecmis[i]))); if (k2 && k2 !== 'hasta') { konu = k2; takip = true; } }
  }
  const K = KONULAR.find((x) => x[0] === konu), lc = (x) => x.toLocaleLowerCase('tr-TR');
  const q2 = bitki && K && K[2] ? K[2](lc(bitki)) : (takip && bitki ? `${lc(bitki)} ${n}` : (n !== n0 ? n : null));
  const anlamli = n.split(' ').filter((w) => w.length >= 2 && !FILL.has(w) && !BOS.has(w) && !konuBul(w) && !/^(gubre|topra|harc|hasta|sula|buda|dik)/.test(w));
  const belirsiz = !bitki && !!NETLESTIR[konu] && anlamli.length === 0;
  return { bitki: bitki || null, grup, konu, takip, q2, belirsiz, netlestir: belirsiz ? NETLESTIR[konu] : null };
}
// Bir mesajdaki bütün konular ("monstera nasıl sulanır, hangi gübre" → sulama, gübre). Litre ayrı hesaplanır;
// "sorun / hasta" başka konu varken anlam katmaz
export function konularHepsi(n) {
  const k = KONULAR.filter(([key, r]) => key !== 'litre' && r.test(n)).map((x) => x[0]);
  return k.length > 1 ? k.filter((x) => x !== 'hasta') : k;
}
// Sorulan bitkiler: mesajda yazanlar; yoksa sohbetten ("ikisini" → son iki bitki, "hepsini / bunları" → hepsi,
// aksi hâlde bitki yazılan son mesajdakiler)
export function bitkiSeti(q, gecmis = []) {
  const simdi = bitkilerHepsi(q);
  if (simdi.length || !gecmis.length) return simdi;
  const n = norm(q), cogul = /\b(ikisi\w*|hepsi\w*|bunlar\w*|onlar\w*|tumu\w*)\b/.test(n), gruplar = [];
  for (let i = gecmis.length - 1; i >= 0; i--) {
    const b = bitkilerHepsi(gecmis[i]);
    if (!b.length) continue;
    if (!cogul) return b.slice(0, 6);
    gruplar.unshift(b);
  }
  const sira = gruplar.flat().filter((a, i, l) => l.lastIndexOf(a) === i); // yazıldığı sırayla; tekrar edilen en son yerinde
  return sira.slice(/\bikisi\w*\b/.test(n) ? -2 : -6);
}
// Kayıt bu bitkiye mi ait: adlarından biri bitki adıyla aynı ya da kelime kelime başı ("Limon" ↔ "Limon ağacı"; "Biber" ↔ "Biberiye" değil)
export function bitkiKarti(e, p) {
  if (!p || !e || !e.b) return false;
  const a = norm(p);
  return e.b.split(',').some((x) => { const b = norm(x.trim()); return b && (b === a || b.startsWith(a + ' ') || a.startsWith(b + ' ')); });
}
// Bakım kartı sorulan konunun kartı mı ("monstera yaprak döküyor" sorusuna monsteranın sararma kartı verilmesin)
const KART_KONU = { isik: 'ışık', sulama: 'sulama', sicaklik: 'sıcaklık', cogaltma: 'çoğaltma', budama: 'budama', zehir: 'evcil hayvan ve çocuk', sararma: 'yaprak sararması', cicek: 'çiçeklenme', dikim: 'dikim', hasat: 'meyve' };
export function konuUyar(e, k) {
  if (!e || e.t !== 'bakim' || !k) return true;
  const m = /^.+? — ([^:\n]+):/.exec(e.c);
  return !m || KART_KONU[k] === m[1];
}
// "Peki başka ne önerirsin", "başka hangi ürün var": önceki derde, daha önce önerilmeyen ürünler
const BASKA = /\bbaska\b.*\b(oner\w*|tavsiye\w*|urun\w*|ne (alay|alabil|kullan)\w*|var mi|bir sey)\b|\balternatif\w*|\bbaska ne\b(?! yap)/;
const BELIRTI = /^(sararma|dokulme|kuruma|solma|curume|kararma|kivrilma|buyume|altkarar|cicek)$/;
// Belirtinin bitkisiz genel sorusu (havuzdaki genel sorun cevabına giden kalıp)
const GENEL_BELIRTI = { sararma: 'yaprakları sararıyor', dokulme: 'yaprak döküyor', kuruma: 'yaprakları kuruyor', solma: 'bitkim soldu', curume: 'kökleri çürüdü',
  kararma: 'yapraklarında leke', kivrilma: 'yaprakları kıvrılıyor', buyume: 'bitki büyümüyor', altkarar: 'meyvenin altı kararıyor', cicek: 'neden çiçek açmıyor' };
const SORU_CUMLE = /\?|\b(mi|mu|misin|musun|miyim|ne|nasil|hangi|hangisi|kac|neden|niye|lazim|gerek\w*|almaliyim|yapmaliyim)\b/;
const KONU_AD = { zararli: 'Böcek ve zararlılar', altkarar: 'Meyve altı kararması', cicek: 'Çiçek açma', sararma: 'Yaprak sararması', dokulme: 'Yaprak dökme',
  kararma: 'Yaprak lekesi', kivrilma: 'Yaprak kıvrılması', curume: 'Kök çürümesi', kuruma: 'Kuruma', solma: 'Solma', buyume: 'Büyüme', budama: 'Budama', sulama: 'Sulama', toprak: 'Toprak',
  gubre: 'Gübre', isik: 'Işık ve yer', zehir: 'Evcil hayvan ve çocuk', sicaklik: 'Sıcaklık ve kış', cogaltma: 'Çoğaltma', hasat: 'Meyve ve hasat', dikim: 'Dikim', hasta: 'Sorun' };
// "2 adet yaban mersinim var kaç litre toprak lazım", "3 tane 30 cm saksı": saksı sayısı ve çapından toplam toprak litresi.
// Litreler havuzdaki saksı hesabı cevaplarından (çap → içine giren toprak). Çap yoksa sorulur.
let SAKSI = null;
function saksiTablo() {
  if (SAKSI) return SAKSI;
  SAKSI = havuz().filter((e) => e.t === 'saksi-hesap').map((e) => {
    const d = /^(\d+) cm saks/.exec(e.s[0]), l = /çine yaklaşık ([\d,]+) litre/.exec(e.c);
    return d && l ? [+d[1], +l[1].replace(',', '.')] : null;
  }).filter(Boolean).sort((a, b) => a[0] - b[0]);
  return SAKSI;
}
const SAYI = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
const lt = (x) => String(x >= 5 ? Math.round(x) : Math.round(x * 10) / 10).replace('.', ',');
export function litreHesap(q) {
  const n = norm(q);
  if (!/kac (litre|lt|kilo|kg|torba|paket)|ne kadar (toprak|harc)|kac litrelik|litre (toprak )?(lazim|gerek)/.test(n)) return null;
  const sm = n.match(/(\d{1,3}) (adet|tane|saksi|fidan|fide|bitki|agac|kok)/) || n.match(/(?:^| )(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on) (adet|tane|saksi|fidan|fide|bitki|agac|kok)/);
  const adet = Math.min(500, Math.max(1, sm ? SAYI[sm[1]] || +sm[1] : 1)), cm = n.match(/(\d{1,3}) ?(cm|santim)/), T = saksiTablo();
  const ornek = (d) => T.find((r) => r[0] === d);
  // "20 litrelik saksı": saksının hacmi biliniyor; doldurmak için hacmin ~%90'ı, sulayınca çöktüğü için ~%10 fazlası
  const hl = !cm && n.match(/(\d{1,4}) ?(lt|litre|litrelik|lik|luk)\b[^0-9]{0,20}saksi/);
  if (hl) {
    const v = +hl[1], top = v * adet;
    return { adet, hacim: v, litre: Math.ceil(top), metin: `${v} litrelik saksıyı doldurmak için yaklaşık ${lt(v * 0.9)} litre toprak yeter; sulayınca toprak biraz çöktüğü için ${lt(v)} litre almanızı öneririz` + (adet > 1 ? `. ${adet} saksı için toplam yaklaşık ${lt(top)} litre.` : '.') };
  }
  if (cm && T.length) {
    const d = +cm[1], x = T.reduce((a, r) => (Math.abs(r[0] - d) < Math.abs(a[0] - d) ? r : a));
    if (Math.abs(x[0] - d) <= 3) {
      const top = x[1] * adet;
      return { adet, cap: d, litre: Math.ceil(top), metin: `${d} cm'lik saksıya yaklaşık ${lt(x[1])} litre toprak gider` + (adet > 1 ? `; ${adet} saksı için toplam yaklaşık ${lt(top)} litre.` : '.') };
    }
  }
  const a = ornek(30), b = ornek(40);
  return { adet, metin: 'Kaç litre gerektiği saksınızın boyuna bağlı. Aşağıya saksınızın ölçüsünü yazın, hesaplayayım' +
    (a && b ? ` (30 cm'lik saksıya yaklaşık ${lt(a[1])} litre, 40 cm'lik saksıya yaklaşık ${lt(b[1])} litre toprak gider).` : '.') };
}
// Sorudaki bitki, yapay zekânın daha önce tanıdığı bitkilerden biri mi (yazım hatası ve ekli hali dahil)
export function bitkiBul(q, list) {
  const n = norm(q);
  if (!toprakOk(n)) return null;
  const B = bitkiler(), ws = kelimeler(q);
  let best = null, bp = 0;
  for (const x of list) {
    let puan = 0;
    for (const t of x.w) { const m = Math.max(0, ...ws.map((w) => kelimeUyar(w, t, B.voc))); if (!m) { puan = 0; break; } puan += m * t.length; }
    if (puan > bp) { best = x; bp = puan; }
  }
  return best;
}

// Havuzdan cevap verilecek kadar emin miyiz
export const SURE = 0.72;
const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
// "bu ay ne ekilir" → "ekim ayında ne ekilir" (Türkiye saatine göre bu ay)
const buAy = (q) => q.replace(/\b(bu|şu an(ki)?|şimdiki) ay(ı|da|ında|ki)?\b/giu, AYLAR[new Date(Date.now() + 3 * 3600e3).getUTCMonth()] + ' ayında');
// Aynı net soru ("monstera nasıl sulanır") birçok istekte tekrar aranır: sonuç bellekte tutulur (onaylı ek liste yokken)
const PA = new Map();
export function poolAnswer(q, opts = {}) {
  const key = opts.extra && opts.extra.length ? null : `${q}|${opts.product || ''}|${opts.productName || ''}|${new Date(Date.now() + 3 * 3600e3).getUTCMonth()}`;
  if (key && PA.has(key)) return PA.get(key);
  const r = poolAnswer0(q, opts);
  if (key) { if (PA.size > 400) PA.delete(PA.keys().next().value); PA.set(key, r); }
  return r;
}
function poolAnswer0(q, opts = {}) {
  q = buAy(q);
  let r = match(q, opts);
  // Ürün sayfasındaysa ve soruda ürün adı yoksa ("bunu nasıl kullanırım", "kaç litre"), ürün adıyla birlikte de dene
  if (opts.productName && (!r[0] || r[0].sc < SURE)) {
    const r2 = match(q + ' ' + opts.productName, opts).filter((x) => x.e.p === opts.product);
    if (r2[0] && (!r[0] || r2[0].sc > r[0].sc)) r = r2.concat(r);
  }
  return { hit: r[0] && r[0].sc >= SURE && r[0].cp >= 0.65 && r[0].cq >= 0.8 ? r[0] : null, near: r };
}

// ---------- Claude ----------
const KARISIM_YOK = 'Şu an karışım hazırlama hizmetimiz yok; size uygun hazır toprağımızı öneriyorum.';
export function systemPrompt(name) {
  return `Sen ${name}'sin: HasTürk Gübre'nin (hasturkgubre.com.tr) çevrimiçi tarım ve bahçe danışmanısın. Müşterilerin gübre, toprak, tohum, saksı, bitki bakımı ve ilaçlama ekipmanı sorularını Türkçe, sade ve kısa cevaplarsın.

Dil: Günlük, sade Türkçe kullan; bir bahçe sahibiyle konuşur gibi yaz. Kısa cümleler kur, "siz" diye hitap et. Ağır tarım terimlerini kullanma; gerekiyorsa günlük karşılığını yaz ("taç izdüşümü" yerine "dal uçlarının altı", "su yürümesi" yerine "ağaç uyanıp tomurcuklar kabarınca"). Miktarları "dekara 60–80 kg", "10 litre suya 50 ml", "fidan başına 2 kg" gibi okunur yaz; "cc" yerine "ml" de. Gereksiz giriş, tekrar ve uzun açıklama yapma; gerekiyorsa en fazla 4 madde kullan.

Müşteriler emek, para ve zaman harcıyor: yanlış ya da alakasız bir cevap, hiç cevap vermemekten daha kötüdür. Her ne pahasına cevap vermeye çalışma; doğru bilgin yoksa müşteriyi müşteri hizmetlerimize yönlendir. Gereken yerde yönlendirmekten çekinme, ama bildiğin ve güvenli olan temel bilgiyi de esirgeme.

Kurallar:
- Kıvamında yaz: 2–4 kısa cümle ya da en fazla 4 kısa madde (yaklaşık 70 kelime, asla 100 kelimeyi geçme). Sorunun cevabı için gerekeni eksiksiz ver, gerisini yazma; abartma, süsleme, tekrar etme. "Siz" diye hitap et. Selamlama ve övgü cümlesi yazma.
- Rakam (doz, miktar, litre, gün, cm, sıcaklık, oran) YALNIZCA kullanıcı mesajındaki "Doğrulanmış bilgi" bölümünde, sorulan bitki ve ürün için geçiyorsa kullanılır. Başka bir bitkinin ya da ürünün rakamını bu soruya uyarlama. Rakam yoksa rakam verme.
- "Doğrulanmış bilgi" soruyla ilgisizse onu kullanma; sorulmayan bir konuyu anlatma.
- Zirai ilaç, böcek/haşere/kemirgen ilacı ve dezenfektanlar için asla doz, karışım oranı veya uygulama tarifi verme: ürün etiketine uyulmasını söyle.
- Ürün önerisi yalnız "Önerilebilecek ürünler" listesinden ve yalnız müşterinin sorununu gerçekten çözecekse yapılır; listede olmayan ürün, marka veya rakip mağaza adı yazma. Sorun ışık, sulama ya da yer değişikliğinden kaynaklanıyorsa ürün önerme, ne yapacağını söyle. Önerdiğin her ürün için tek kısa cümleyle neden işe yaradığını (yalnız "Doğrulanmış bilgi"de yazan faydasıyla) ve iki ürün önerdiysen birlikte nasıl kullanılacağını yaz; bu durumda cevap 120 kelimeye kadar çıkabilir.
- Müşteri bir mesajda birden çok bitki ya da konu sorduysa hiçbirini atlama: her birine bitki adıyla başlayan ayrı, kısa bir paragrafla cevap ver; bu durumda cevap 160 kelimeye kadar çıkabilir.
- Toprak sorulduysa (hangi toprak, nasıl bir toprak, toprak karışımı) yalnız toprak öner; gübreyi toprak yerine önerme. Bitkinin kendi hazır toprağı "Önerilebilecek ürünler"de varsa onu öner, tarif verme; ${KARISIM_ACIK ? 'müşteri hazır almak istemeyip karışımı kendisi yapmak istediğini söylerse "Kendi Toprak Karışımını Oluştur" ürününü ve rehberdeki tarifi ver.' : 'karışım hazırlama hizmetimiz şu an yok: müşteri karışımı kendisi yapmak isterse bunu kısaca söyle ve hazır toprağı öner, tarif verme.'} Bitkinin kendi toprağı "Önerilebilecek ürünler"de yoksa "Toprak rehberi"nden bitkiye en uygun grubu seç ve şunu yaz: bitkinin nasıl bir toprak sevdiği (bir cümle), ${KARISIM_ACIK ? 'o grubun hazır toprağı (en yakın seçenek olarak) ve "Kendi Toprak Karışımını Oluştur" ürünüyle hazırlanacak karışım tarifi (ölçü oranlarıyla, rehberdeki gibi). Ürün olarak en uygun hazır toprağı ve Kendi Toprak Karışımını Oluştur\'u seç.' : 'o grubun hazır toprağı (en yakın seçenek olarak). Ürün olarak en uygun hazır toprağı seç.'} Bitkiyi tanımıyorsan genel grubu öner ve müşteri hizmetlerimize danışılabileceğini ekle.
- Bitki hastalığı ya da zararlı teşhisi koyma; "Doğrulanmış bilgi"de o belirtiye ait olası nedenler ve öneriler varsa onları kullan, yoksa yalnız olası nedenleri say. Her durumda fotoğrafla müşteri hizmetlerimize danışılmasını öner. Ev ve halk sağlığı böcek ilaçlarını (sinek, hamamböceği, tahtakurusu, akar spreyleri) bitkiye önerme. İnsan veya hayvan sağlığı konusunda tavsiye verme.
- Bayimiz ve şubemiz yoktur (İstanbul'da da, başka şehirde de); ürünlerimiz yalnız internet sitemizden satılır ve kargoyla gönderilir. Yerimiz sorulursa fabrika adresini ver: Kızılcaali Mahallesi, Karakoçan Çıkmazı Sokak, No:7/1, 34540 Çatalca / İstanbul.
- Müşteri telefona çıkılmadığını ya da ulaşamadığını söylerse özür dile: ekibimiz o sırada başka bir müşteriyle görüşüyor olabilir; WhatsApp'tan yazabileceğini ya da mesaj bırakabileceğini, en kısa sürede dönüş yapacağımızı söyle.
- Bir ürün "var mı" diye sorulursa ve "Önerilebilecek ürünler"de o ürün varsa "var" de; listede olmayan ürün için "yok" demeden önce benzer adlı ürünü kontrol et (ör. "saf orman toprağı" = Doğal Orman Toprağı).
- Mağaza bilgisi: siparişler aynı gün kargoya teslim edilir; bölgeye göre teslimat ertesi gün ya da 2-3 gün içinde gerçekleşir. Müşterinin kendi siparişinin durumu, kargo takibi, iade ve değişim için müşteri hizmetlerimize yönlendir.
- Fiyat ve stok soruluyorsa rakam yazma ve yönlendirme: uygun ürünü "urunler"e ekle, güncel fiyatın ve stok durumunun ürün kartında göründüğünü söyle. Müşteri ürün almak istiyorsa ("4 adet almak istiyorum") yönlendirme; ürünü öner ve ürün kartından boy ya da seçeneği seçip adedi artırarak sepete ekleyebileceğini yaz.
- "Önerilebilecek ürünler"deki ürün adlarında yazan ölçüler (cm, litre, kat, bölüm) doğrulanmış bilgidir. Müşteri bir alana yerleşim ya da kaç adet gerektiğini sorarsa (bahçe yatağı, saksı, raf) bu ölçülerle basit bir öneri yap: hangi modelden kaç adet, aralarda ne kadar yol; hesabını kısaca göster. Ürün adında ölçü yoksa tahmin etme.
- Müşteri galvaniz bir yapıyı (sera, masa ya da tezgâh, kurutma tezgâhı, bahçe kemeri, araç gölgeliği, arı kovanı sehpası, klima ya da kompresör kafesi, çöp kovası muhafazası, köpek evi, hareketli kümes, güneş paneli sehpası) belli bir ölçüde ya da ölçü vererek isterse: "Önerilebilecek ürünler"de o ölçüye uyan ya da en yakın model varsa onu öner ve ölçüsünü yaz; ayrıca istediği ölçüde de yaptırabileceğini söyle: Ürün Bul'daki "Kendin Tasarla" bölümünde ölçüyü seçip yapıyı 3B görebilir, parçalar ölçüsüne göre kesilip delinmiş gönderilir. Bu bölüme cevabın altındaki "İstediğiniz ölçüde tasarlayın" düğmesiyle gidilir. Ölçü uymuyorsa ürün adındaki ölçüyü değiştirerek yazma.
- Yönlendirirken "usta" deme; "müşteri hizmetlerimizden destek alabilirsiniz: ${TEL} (telefon ve WhatsApp)" de. Müşteriyi tarım müdürlüğüne, ziraat odasına ya da başka bir kuruma yönlendirme; ilaç seçimi, miktar ve teşhis için de müşteri hizmetlerimize yönlendir.
- Kaynak, yayın, kurum ya da "şuradan aldım" bilgisi verme; yalnız cevabı yaz.
- Müşteriyi asla başka bir siteye, mağazaya, pazaryerine ya da uygulamaya yönlendirme; web adresi yazma. Bizde olmayan bir markanın adını yazma.

"durum" alanı:
- "cevap": soruyu doğru ve güvenle cevapladın.
- "yonlendir": soru insan desteği gerektiriyor (sipariş/kargo/iade, teşhis, elinde doğru bilgi olmayan teknik soru). "cevap" alanına müşteriye kısa ve nazik bir yönlendirme cümlesi yaz.
- "konu_disi": soru tarım, bahçe ve mağazayla ilgisiz; kibarca yalnız bu konularda yardımcı olabildiğini yaz.
"emin" alanı: cevabındaki her bilgi ya "Doğrulanmış bilgi"de geçiyorsa ya da kimseyi yanıltmayacak kadar temel, herkesçe kabul gören bahçe bilgisiyse (ör. "fesleğen güneşli yer sever") true; en küçük bir şüphen varsa false.

Cevabı yalnız istenen JSON biçiminde ver: "cevap" müşteriye gösterilecek metin; "urunler" listeden seçtiğin ürünlerin kodları (en fazla 3, uygun yoksa boş); "durum"; "emin".`;
}
// ---------- Listede olmayan bitkinin toprak profili ----------
// Ayrı ve dikkatli bir sorgu (config.json > soilMatch.plants ile aynı ölçek). İki bağımsız cevap alınır; ikisi de bitkiyi
// emin şekilde tanımalı, aynı grupta ve her özellikte en çok 1 adım farkla anlaşmalı; ayrıca bitki bilgisine aykırı
// (kumlu ama çok nem isteyen sukulent gibi) profiller reddedilir. Geçmezse kart verilmez, normal cevap akışı sürer.
const GRUP_AI = ['Salon', 'Sukulent', 'Çiçek', 'Asit seven', 'Aromatik', 'Meyve', 'Sebze', 'Bahçe', 'Su bitkisi'];
const BITKI = {
  type: 'object',
  properties: {
    taninan: { type: 'boolean' },
    ad: { type: 'string' },
    latince: { type: 'string' },
    guven: { type: 'string', enum: ['yuksek', 'orta', 'dusuk'] },
    ph_min: { type: 'integer', enum: [1, 2, 3, 4] },
    ph_max: { type: 'integer', enum: [1, 2, 3, 4] },
    drenaj: { type: 'integer', enum: [1, 2, 3] },
    su: { type: 'integer', enum: [1, 2, 3] },
    besin: { type: 'integer', enum: [1, 2, 3] },
    yapi: { type: 'string', enum: ['k', 'h', 'd'] },
    grup: { type: 'string', enum: GRUP_AI },
    aciklama: { type: 'string' },
  },
  required: ['taninan', 'ad', 'latince', 'guven', 'ph_min', 'ph_max', 'drenaj', 'su', 'besin', 'yapi', 'grup', 'aciklama'],
  additionalProperties: false,
};
const BITKI_SISTEM = `Sen saksı ve bahçe bitkilerinin toprak ihtiyaçlarını çok iyi bilen bir ziraat uzmanısın. Müşterinin sorusundaki bitkiyi belirleyip sevdiği toprağı aşağıdaki ölçekle tanımlarsın. Cevabın bir toprak karışımı tarifine dönüşecek; yanlış profil bitkiye zarar verir, bu yüzden dikkatli ol.

Bitkiyi belirle: Türkçe yaygın adı, yöresel adı, yazım hatalı ya da sesle yazılmış hali olabilir ("bengovil" = begonvil). Aynı adla birden çok bitki biliniyorsa Türkiye'de saksıda ya da bahçede en çok yetiştirileni seç. "latince": bitkinin bilimsel adı (cins ve tür; tür belirsizse cins).

Ölçek:
- "ph_min" / "ph_max" (sevdiği pH aralığı): 1 asidik (pH 5,5 altı), 2 hafif asidik (5,5–6,5), 3 nötr (6,5–7,5), 4 kireçli (7,5 üstü).
- "drenaj" (toprağın suyu ne kadar hızlı süzmesi gerekir): 1 orta, 2 yüksek, 3 çok yüksek.
- "su" (toprağın nemi ne kadar tutması gerekir): 1 az (iki sulama arası kurumalı), 2 orta, 3 çok (hep nemli kalmalı).
- "besin": 1 az, 2 orta, 3 zengin.
- "yapi": "k" kumlu-mineralli (kaktüs, Akdeniz bitkisi), "h" havalı-lifli (tropikal salon bitkisi, epifit), "d" dengeli.
- "grup": listeden bitkiye en yakın olanı.

Doğrulanmış örnekler (ph_min ph_max drenaj su besin yapi grup):
Monstera 2 3 3 2 2 h Salon; Philodendron 2 2 3 2 2 h Salon; Zamioculcas 2 3 3 1 1 h Salon; Eğrelti otu 2 2 2 3 2 h Salon; Avokado 2 2 3 2 2 h Meyve;
Kaktüs 2 3 3 1 1 k Sukulent; Aloe vera 2 3 3 1 1 k Sukulent; Begonvil 2 2 3 1 2 k Çiçek; Sardunya 2 3 3 1 2 k Çiçek; Gül 2 2 2 2 3 d Çiçek; Petunya 2 3 2 2 3 d Çiçek;
Ortanca 1 2 2 2 2 d Asit seven; Açelya 1 1 2 2 2 d Asit seven; Yaban mersini 1 1 2 2 2 d Asit seven;
Lavanta 3 4 3 1 1 k Aromatik; Biberiye 3 3 3 1 1 k Aromatik; Fesleğen 2 3 2 2 2 d Aromatik; Nane 2 3 2 3 2 d Aromatik;
Limon 2 3 3 2 3 d Meyve; Zeytin 3 4 3 1 1 k Meyve; Çilek 2 2 2 2 3 d Meyve; Domates 2 3 2 2 3 d Sebze; Çim 2 3 2 2 2 d Bahçe; Mor salkım 2 3 2 2 2 d Bahçe; Nilüfer 2 3 1 3 3 d Su bitkisi.

"guven": bu bitkinin toprak ihtiyacını iyi biliyorsan "yuksek"; genel olarak biliyorsan "orta"; tahmin ediyorsan "dusuk".
Soruda bitki yoksa ya da bitkiyi tanımıyorsan "taninan": false yaz (diğer alanlara listeden herhangi bir değer).
"ad": bitkinin yaygın Türkçe adı (ilk harfi büyük). "aciklama": bitkinin nasıl bir toprak sevdiğini sade Türkçeyle, "siz" diye hitap ederek 1–2 kısa cümle; rakam, ürün ya da marka adı yazma.`;
// Modelin bitki profili → { ad, prof: "23322h", grup, aciklama } ya da null (tanınmadı / emin değil / tutarsız)
export function bitkiProfil(b) {
  if (!b || b.taninan !== true || !/^(yuksek|orta)$/.test(b.guven || '') || String(b.latince || '').trim().length < 3) return null;
  const ad = String(b.ad || '').replace(/[^\p{L}\p{N} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const n = [b.ph_min, b.ph_max, b.drenaj, b.su, b.besin];
  if (ad.length < 3 || !n.every((x) => Number.isInteger(x)) || !/^[khd]$/.test(b.yapi) || !GRUP_AI.includes(b.grup)) return null;
  const [p1, p2] = [Math.min(n[0], n[1]), Math.max(n[0], n[1])], [, , dr, su] = n;
  // Bitki bilgisine aykırı profiller
  if (p2 - p1 > 2 || (b.yapi === 'k' && su === 3) || (b.grup === 'Sukulent' && (b.yapi !== 'k' || su > 1 || dr < 2)) ||
    (b.grup === 'Asit seven' && p2 > 2) || (b.grup === 'Su bitkisi' && su < 3) || (b.yapi === 'h' && dr < 2)) return null;
  const prof = `${p1}${p2}${n[2]}${n[3]}${n[4]}${b.yapi}`;
  if (!/^[1-4][1-4][1-3][1-3][1-3][khd]$/.test(prof)) return null;
  const aciklama = disSuz(String(b.aciklama || '').replace(/\s+/g, ' ').trim().slice(0, 300)).metin;
  return { ad: ad[0].toLocaleUpperCase('tr-TR') + ad.slice(1), prof, grup: b.grup, latince: String(b.latince).trim().slice(0, 60), aciklama };
}
// İki bağımsız profil aynı bitkiyi ve yakın değerleri gösteriyor mu
export function bitkiUyum(a, b) {
  if (!a || !b || a.grup !== b.grup || a.prof[5] !== b.prof[5]) return null;
  const cins = (x) => x.latince.toLocaleLowerCase('en').split(/\s+/)[0];
  if (cins(a) !== cins(b)) return null;
  for (let i = 0; i < 5; i++) if (Math.abs(+a.prof[i] - +b.prof[i]) > 1) return null;
  return a;
}
async function bitkiSor(env, key, q) {
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 25000 });
  const bir = () => client.beta.messages.create({
    model: env.AK_MODEL || MODEL,
    max_tokens: 1500,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: BITKI } },
    system: [{ type: 'text', text: BITKI_SISTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Müşterinin sorusu: ${q}` }],
  }).then((m) => {
    const u = m.usage || {};
    let o = null;
    if (m.stop_reason !== 'refusal' && m.stop_reason !== 'max_tokens') { try { o = JSON.parse(m.content.filter((x) => x.type === 'text').map((x) => x.text).join('')); } catch { o = null; } }
    return { b: bitkiProfil(o), giris: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), cikis: u.output_tokens || 0 };
  });
  // Üç bağımsız cevap: en az ikisi uyuşursa profil kabul (ikili denetim bazen tek bir sapmayla boşa düşüyordu); süre aynı (paralel)
  const r = await Promise.all([bir(), bir(), bir()]);
  const b = bitkiUyum(r[0].b, r[1].b) || bitkiUyum(r[0].b, r[2].b) || bitkiUyum(r[1].b, r[2].b);
  return { b, giris: r.reduce((a, x) => a + x.giris, 0), cikis: r.reduce((a, x) => a + x.cikis, 0) };
}
const SCHEMA = {
  type: 'object',
  properties: {
    cevap: { type: 'string' },
    urunler: { type: 'array', items: { type: 'string' } },
    durum: { type: 'string', enum: ['cevap', 'yonlendir', 'konu_disi'] },
    emin: { type: 'boolean' },
  },
  required: ['cevap', 'urunler', 'durum', 'emin'],
  additionalProperties: false,
};

// Bağlam: en yakın havuz cevapları (doğrulanmış) + onlardaki ürünler + soruda adı geçen ürünler
function context(q, near, products, F, nf = 3, es = (u) => u) {
  // Toprak sorusu: gübre cevapları bilgi olarak verilmez (yapay zekâ toprak yerine gübre önermesin); toprak rehberi,
  // grupların hazır toprakları ve "Kendi Toprak Karışımını Oluştur" önerilebilir ürünlere eklenir
  const toprak = TOPRAK_SORUSU.test(norm(q));
  if (toprak) near = near.filter((x) => !/^(bitki-doz|gubre-genel)$/.test(x.e.t));
  const byS = new Map(products.map((p) => [p.s, p]));
  // Maliyet: en yakın 3 cevap, her biri en fazla ~900 karakter (rakamlar ve kaynak satırı genelde baştadır)
  const facts = near.filter((x) => x.sc >= 0.35).slice(0, toprak ? 2 : nf).map((x) => (x.e.c.length > 900 ? x.e.c.slice(0, 900) + '…' : x.e.c));
  if (toprak) facts.push(rehberMetni(byS, F, (x) => es([x])[0]));
  const slugs = new Set();
  if (toprak) es([...(KARISIM_ACIK ? [OZEL_KARISIM] : []), ...new Set(GRUPLAR.flatMap((g) => g.hazir)), 'tarim-perliti', 'hg-asidik-torf']).forEach((s) => slugs.add(s));
  near.slice(0, 4).forEach((x) => es(x.e.u).forEach((s) => slugs.add(s)));
  const qt = toks(q);
  products.map((p) => ({ p, h: toks(p.n).filter((t) => qt.includes(t)).length })).filter((x) => x.h >= 1)
    .sort((a, b) => b.h - a.h).slice(0, 6).forEach((x) => slugs.add(x.p.s));
  const list = [...slugs].map((s) => byS.get(s)).filter((p) => p && p.st).slice(0, toprak ? 14 : 10);
  return { facts, list };
}
export function userMessage(q, ctx, page, gecmis = []) {
  return `Doğrulanmış bilgi:\n${ctx.facts.length ? ctx.facts.map((f, i) => `[${i + 1}] ${f}`).join('\n\n') : '(yok)'}\n\n` +
    `Önerilebilecek ürünler (kod — ad):\n${ctx.list.length ? ctx.list.map((p) => `${p.s} — ${p.n}`).join('\n') : '(yok)'}\n\n` +
    (page ? `Müşterinin bulunduğu ürün sayfası: ${page}\n\n` : '') +
    (gecmis.length ? `Müşterinin bu konuşmadaki önceki mesajları (yalnız bağlam için; soru son mesajdır):\n${gecmis.map((x) => '- ' + x).join('\n')}\n\n` : '') +
    `Müşterinin sorusu: ${q}`;
}

// Son süzgeç: web adresi ya da başka bir siteye / pazaryerine yönlendiren cümle müşteriye gitmez (talimata rağmen yazılırsa)
const DIS = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|gov|edu|tr|info|shop|store)\b|trendyol|hepsiburada|amazon|n11\b|çiçeksepeti|ciceksepeti|pazarama|google'?(da|dan)|youtube|instagram|facebook|internetten|başka (bir )?(site|mağaza)|(sitesinden|mağazasından|adresinden) (alabilir|bulabilir|sipariş)/i;
export function disSuz(c) {
  const parcalar = String(c || '').split(/(?<=[.!?])\s+|\n+/);
  const kalan = parcalar.filter((x) => !DIS.test(x));
  return { metin: kalan.join(' ').replace(/\s+/g, ' ').trim(), atildi: kalan.length !== parcalar.length };
}
// ---------- Soruyu netleştiren yardımcı model (Claude Haiku) ----------
// Müşteri önceki mesaja bağlı, eksik, düzeltmeli ya da kurallara uymayan biçimde yazınca ("peki manuel olanı", "pardon kauçuk
// demek istedim", noktalamasız uzun anlatım) küçük ve hızlı bir model sohbete bakıp mesajı kendi başına anlaşılır, net bir
// soruya çevirir. Cevabı bu model vermez: net soru yine hazır cevaplardan (yoksa ana yapay zekâdan) cevaplanır.
export const YORUM_MODEL = 'claude-haiku-5-5';
const YORUM_SEMA = {
  type: 'object',
  properties: {
    niyet: { type: 'string', enum: ['soru', 'selam', 'tesekkur', 'onay', 'siparis', 'konu_disi'] },
    mesaj: { type: 'string' },
  },
  required: ['niyet', 'mesaj'],
  additionalProperties: false,
};
export function yorumSistem() {
  return `Bir bahçe ve tarım mağazasının (gübre, toprak, tohum, saksı, ilaçlama pompası, bitki bakımı) soru-cevap sisteminin önünde çalışıyorsun. Görevin müşterinin SON mesajını, önceki mesajlara bakarak, tek başına okunduğunda anlaşılır, net ve kısa Türkçe soru(lar)a çevirmek. Soruyu CEVAPLAMA; yalnız yeniden yaz.

Kurallar:
- Gönderme ve eksik ifadeleri önceki mesajlardan tamamla: "bunu", "onu", "ikisini", "hepsini", "o toprağı", "manuel olanı", "peki ya X", "X için de", "aynısı mı" gibi. Örnek: önceki "monstera nasıl sulanır", son "peki kauçuk?" → "Kauçuk nasıl sulanır?"
- Düzeltmeleri uygula: "pardon kauçuk demek istedim", "limon değil mandalina", "toprak değil gübre soruyorum" → önceki soruyu düzeltilmiş hâliyle yaz.
- "Bunu / bunları" son cevapta önerilen ürünü gösteriyorsa ürünün adını yaz ("HG Tarım Perliti nasıl kullanılır?").
- Yazım hatalarını ve ağız / kısaltmaları düzelt ("sararıyo napcam" → "sararıyor, ne yapmalıyım"). Bitki adını yaygın Türkçe adıyla yaz; mesajda olmayan bitki, ürün, belirti ya da bilgi EKLEME.
- Mesajda birden çok bitki ya da soru varsa hiçbirini atlama; her birini ayrı kısa cümle yap ("Limon yaprakları sararıyor. Gülde böcek var, ne yapmalıyım?"). Hangi derdin hangi bitkiye ait olduğunu koru.
- Son mesaj önceki konudan bağımsız yeni bir soruysa önceki konuyu ekleme; yalnız düzelt.
- niyet: "soru" (bitki, bakım, ürün, toprak, gübre, miktar, genel kargo süresi gibi sorular); "selam" (yalnız selamlama); "tesekkur" (teşekkür, memnuniyet); "onay" (tamam, anladım gibi, soru yok); "siparis" (yalnız müşterinin VERİLMİŞ siparişinin durumu, kargo takibi, iade, değişim, eksik/hasarlı ürün; yeni ürün almak ya da sipariş vermek isteyen — "4 adet almak istiyorum", "nasıl sipariş veririm" — "soru"dur); "konu_disi" (bahçe, tarım ve mağazayla ilgisiz; bitki adı — yabancı ya da yanlış yazılmış olsa da, ör. "blue beriy" = yaban mersini — ya da mağaza, adres, ürün geçen mesaj konu dışı DEĞİLDİR). mesaj her zaman doldurulur (niyet soru değilse müşterinin mesajını aynen yaz).`;
}
export function yorumMesaj(q, gecmis = [], urunler = [], sonBaslik = '') {
  return (gecmis.length ? `Önceki mesajlar (eskiden yeniye):\n${gecmis.slice(-8).map((x) => '- ' + x).join('\n')}\n\n` : '') +
    (sonBaslik ? `Son cevabın konusu: ${sonBaslik}\n` : '') + (urunler.length ? `Son cevapta önerilen ürünler: ${urunler.join(', ')}\n` : '') +
    `\nMüşterinin son mesajı: ${q}`;
}
async function yorumYZ(env, key, q, gecmis, urunler, sonBaslik) {
  const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 9000 });
  const msg = await client.messages.create({
    model: env.AK_YORUM_MODEL || YORUM_MODEL,
    max_tokens: 1500,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: YORUM_SEMA } },
    system: yorumSistem(),
    messages: [{ role: 'user', content: yorumMesaj(q, gecmis, urunler, sonBaslik) }],
  });
  if (msg.stop_reason !== 'end_turn') return null;
  let o;
  try { o = JSON.parse(msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch { return null; }
  if (!o || typeof o.mesaj !== 'string' || !YORUM_SEMA.properties.niyet.enum.includes(o.niyet)) return null;
  const mesaj = disSuz(o.mesaj).metin.replace(/\s+/g, ' ').trim().slice(0, MAX_Q);
  return mesaj.length >= 2 ? { niyet: o.niyet, mesaj, usage: msg.usage } : null;
}

async function askClaude(env, key, name, q, ctx, page, gecmis = []) {
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 25000 });
  const msg = await client.beta.messages.create({
    model: env.AK_MODEL || MODEL,
    max_tokens: 2500,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // Uzun ve sabit sistem talimatı önbelleğe alınır (her soruda yeniden ücretlendirilmesin)
    system: [{ type: 'text', text: systemPrompt(name), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage(q, ctx, page, gecmis) }],
  });
  if (msg.stop_reason === 'refusal') return { refused: true, usage: msg.usage };
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let out;
  try { out = JSON.parse(text); } catch { return { error: 'json', usage: msg.usage }; }
  if (msg.stop_reason === 'max_tokens' || typeof out.cevap !== 'string' || !out.cevap.trim()) return { error: 'kesik', usage: msg.usage };
  const allowed = new Set(ctx.list.map((p) => p.s));
  const sz = disSuz(out.cevap.trim());
  // Süzgeçten sonra anlamlı bir cevap kalmadıysa gösterilmez (müşteri hizmetlerine yönlendirilir)
  return { cevap: sz.metin || out.cevap.trim(), urunler: (out.urunler || []).filter((s) => allowed.has(s)).slice(0, 3), durum: out.durum || 'cevap',
    emin: !!out.emin && (!sz.atildi || sz.metin.length >= 25), usage: msg.usage, model: msg.model };
}

// ---------- Önerilen toprağın kullanımı / dikim ----------
// "Limon için toprak" cevabından sonra "bu toprağa nasıl dikerim, direkt mi kullanıyoruz yoksa karıştırıyor muyuz",
// "mevcut toprağımla karıştırmam mı lazım", "eski toprağı atmam mı lazım": toprak kartı tekrar verilmez, başka ürünün
// içerik listesi de verilmez; önerilen toprağın nasıl kullanılacağı ve dikim adımları anlatılır.
const TOPRAK_KULLAN = /\b(nasil (dik|ek|kullan|doldur|koy|yerlestir|aktar|hazirla)\w*|ne sekilde (dik|ek|kullan)\w*|dikim\w*|dikerken|dikece\w*|dikmem\w*|dikeyim|dikilir|ekece\w*|ekmem\w*|ekeyim|doldur\w*|direkt\w*|direk|dogrudan|oldugu gibi|paketinden|karistir\w*|karismadan|karisik mi|mevcut topra\w*|eski topra\w*|kendi topra\w*|bahce topra\w*|saksi(yi|mi|sini)? degis\w*|aktar\w*|tek basina|saf (olarak|mi|halde|kullan\w*))\b/;
const TOPRAK_GONDER = /\b(bu|su|o|aldigim|aldigimiz|onerdigin\w*|sizin|hazir) (topra\w*|karisim\w*|harc\w*)\b|\btopra(gi|ginizi|gini|ga|gina|giniza)\b/;
// Toprak değil düzenleyici / set: ürün kartının kendi kullanım satırları verilir
const TOPRAK_KATKI = /leonardit|biochar|canlandirma|^organik-toprak$|cim-kapama|kendi-toprak-karisimini|bakim-seti/;
const HAZIR_YAZI = /kullanıma hazır|hazır karışım|doğrudan kullan|paketinden çıktığı gibi|karıştırmaya gerek/i;
export function toprakKullanNiyet(qOrj, gecmis, sonUrun, prods) {
  const nq = norm(qOrj);
  if (!TOPRAK_KULLAN.test(nq) || nq.split(' ').length > 30) return null;
  // Gübre / ilaç / bileşen sorusu ("solucan gübresini toprağa nasıl karıştırırım") bu değil; litre sorusu da değil
  if (/\b(gubre\w*|solucan\w*|ilac\w*|sprey\w*|perlit\w*|torf\w*|kokopit\w*|cocopeat|vermikulit\w*|pomza\w*|leonardit\w*|kac litre|ne kadar topra\w*|tohum\w*)\b/.test(nq)) return null;
  const toprakUrun = (sl) => /topra/.test(sl) && prods.some((p) => p.s === sl);
  const su = sonUrun.find(toprakUrun);
  const sonMesaj = gecmis.length ? norm(gecmis[gecmis.length - 1]) : '';
  const baglam = !!su || /topra|harc/.test(sonMesaj) || TOPRAK_GONDER.test(nq);
  if (!baglam) return null;
  // Bitki: bu mesajdan, yoksa sohbetin sonundan geriye doğru
  let bitki = bitkilerHepsi(qOrj).filter((x) => !/^(Fide|Meyve fidanı)$/.test(x))[0] || null;
  for (let i = gecmis.length - 1; i >= 0 && !bitki; i--) bitki = bitkilerHepsi(gecmis[i])[0] || null;
  // Toprak ürünü: son önerilen toprak; yoksa bitkinin toprak kartındaki ilk stoklu toprak
  let urun = su ? prods.find((p) => p.s === su) : null;
  if (!urun && bitki) { const b = bitkiEsle(norm(bitki)); urun = b && b.e ? (b.e.u || []).map((sl) => prods.find((p) => p.s === sl && p.st)).find(Boolean) || null : null; }
  if (!urun) return null;
  return { bitki, urun };
}
export function toprakKullanCevap({ bitki, urun }, qOrj) {
  const nq = norm(qOrj), ad = String(urun.n).trim(), kart = String(URUN_KART[urun.s] || '') + ' ' + (URUN_OZET[urun.s] || '');
  if (TOPRAK_KATKI.test(urun.s) && kullanimSatir(urun.s)) return `${ad} — ürün kartındaki bilgiye göre:\n${kullanimSatir(urun.s)}`;
  const B = bitki ? bitkiEsle(norm(bitki)) : null, grup = norm((B && B.grup) || '');
  const bahce = /\b(bahce\w*|cukur\w*|tarla\w*|yatag\w*|toprag(a|ina) dik)\b/.test(nq) && !/saksi/.test(nq);
  const kim = bitki || 'bitkiniz';
  const L = [];
  L.push(`${ad} ${HAZIR_YAZI.test(kart) ? 'kullanıma hazırdır; paketinden çıktığı gibi, başka toprakla karıştırmadan kullanılır.' : '— ' + kim.toLocaleLowerCase('tr-TR') + ' için hazırlanmış bir yetiştirme toprağıdır; başka toprakla karıştırmadan doğrudan kullanılır.'} ${bahce ? 'Dikim çukurunu' : 'Saksıyı'} bu toprakla doldurmanız yeterli.`);
  if (/eski|mevcut|kendi|karist|karisik/.test(nq)) L.push('Eski saksı toprağını yeni toprağa katmayın: zamanla besinini kaybeder, sıkışır ve hastalık taşıyabilir. Kökler arasındaki gevşek eski toprağı hafifçe silkeleyip atabilirsiniz.');
  const orkide = /orkide/i.test(kim) || /orkide/.test(urun.s);
  const kural = bitki ? havuz().find((e) => e.t === 'saksi-kural' && (e.s || []).some((x) => norm(x).startsWith(norm(bitki).split(' ')[0]))) : null;
  if (orkide && kural) L.push(kural.c);
  else if (bahce) L.push('Bahçeye dikim:\n• Çukuru kök topunun yaklaşık iki katı genişliğinde açın.\n• Fidanı, kök boğazı (gövdenin toprağa girdiği yer) toprak seviyesinde kalacak şekilde yerleştirin; çevresini bu toprakla doldurup elinizle bastırın.\n• Dikimden sonra bol can suyu verin.');
  else L.push('Saksıya dikim:\n• Saksının dibinde su deliği olsun; dibine birkaç santim toprak koyun.\n• Bitkiyi eski saksısından kök topuyla birlikte çıkarın; çürümüş (kahverengi, yumuşak) kökler varsa temiz bir makasla kesin.\n• Bitkiyi, kök boğazı eskisiyle aynı yükseklikte kalacak şekilde yerleştirin; çevresini toprakla doldurup hafifçe bastırın, saksının ağzından 2–3 cm boşluk bırakın.\n• Dikimden sonra saksının dibinden su gelene kadar can suyu verin; birkaç gün doğrudan güneşe koymayın.');
  // Bitkiye özel dikim bilgisi (havuzdaki bakım kartı: zamanı ve dikimde verilecek gübre)
  if (bitki) {
    const dk = havuz().find((e) => e.t === 'bakim' && /— dikim:/.test(e.c.split('\n')[0] || '') && norm(e.c.split(' — ')[0]) === norm(bitki));
    if (dk) {
      const sat = dk.c.split('\n').map((l) => l.trim()).filter(Boolean), zaman = sat[1] && !/^Önerimiz/.test(sat[1]) ? sat[1] : '', birlikte = sat.find((l) => /^Birlikte:/.test(l));
      if (zaman) L.push(`${bitki} için: ${zaman}`);
      if (birlikte) L.push(birlikte.replace(/^Birlikte: /, 'İsterseniz ') );
    }
  }
  return L.join('\n\n');
}

// ---------- Veritabanı ----------
let dbReady = false;
export async function initDb(db) {
  if (dbReady) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS ak_soru (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, q TEXT NOT NULL, qn TEXT NOT NULL, kaynak TEXT NOT NULL, havuz TEXT, skor REAL, cevap TEXT, urunler TEXT, durum TEXT, site TEXT, sayfa TEXT, giris INTEGER, cikis INTEGER)'),
    db.prepare('CREATE INDEX IF NOT EXISTS ak_soru_durum ON ak_soru (durum, ts)'),
    db.prepare('CREATE TABLE IF NOT EXISTS ak_gun (d TEXT PRIMARY KEY, n INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS ak_oy (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, q TEXT NOT NULL, kaynak TEXT, havuz TEXT, oy INTEGER NOT NULL, site TEXT)'),
    // Haftalık denetim: her cevabın yapay zekâ değerlendirmesi (bkz. src/denetim.js)
    db.prepare('CREATE TABLE IF NOT EXISTS ak_denetim (soru_id INTEGER PRIMARY KEY, ts TEXT NOT NULL, karar TEXT NOT NULL, neden TEXT, niyet TEXT, oneri TEXT, konu TEXT, durum TEXT)'),
    // Denetimde yanlış bulunan hazır cevap: aynı soruda (normalize) bir daha verilmez
    db.prepare('CREATE TABLE IF NOT EXISTS ak_engel (qn TEXT NOT NULL, havuz TEXT NOT NULL, ts TEXT NOT NULL, PRIMARY KEY (qn, havuz))'),
  ]);
  // Sonradan eklenen sütun (varsa hata verir, yok sayılır)
  await db.prepare('ALTER TABLE ak_soru ADD COLUMN onceki TEXT').run().catch(() => {});
  dbReady = true;
}
// Eskimiş bilgi içeren eski Claude cevapları tekrar verilmez: solucan gübresinin harca karışım oranı blogla aynı
// %10–20 oldu (fidede en fazla %10); eski tablodaki "%40–50" geçen solucan gübresi cevapları atlanır
const ESKI = (c) => /solucan/i.test(c) && /%\s?40\s?[–-]\s?50|40\s?[–-]\s?50\s?%/.test(c);
// Onaylanmış Claude cevapları havuza eklenir (5 dakikada bir tazelenir)
// Denetimde yanlış bulunan hazır cevaplar: (normalize soru | havuz kimliği) — 5 dakikada bir tazelenir
let ENGEL = { t: 0, set: new Set() };
async function engeller(db) {
  if (Date.now() - ENGEL.t < 300000) return ENGEL.set;
  const { results } = await db.prepare('SELECT qn, havuz FROM ak_engel ORDER BY ts DESC LIMIT 5000').all();
  ENGEL = { t: Date.now(), set: new Set(results.map((r) => r.qn + '|' + r.havuz)) };
  return ENGEL.set;
}
let APPROVED = { t: 0, list: [] };
async function approved(db) {
  if (Date.now() - APPROVED.t < 300000) return APPROVED.list;
  const { results } = await db.prepare("SELECT id, q, cevap, urunler FROM ak_soru WHERE durum = 'onaylandi' ORDER BY id DESC LIMIT 2000").all();
  APPROVED = { t: Date.now(), list: results.filter((r) => !ESKI(r.cevap || '')).map((r) => ({ i: 'o' + r.id, t: 'onayli', s: [r.q], c: r.cevap, u: JSON.parse(r.urunler || '[]') })) };
  return APPROVED.list;
}

// POST /ak/oy {q, k (kaynak), h (havuz id), oy: 1|0}: müşterinin "işinize yaradı mı" oyu. Olumsuz oylar incelenip
// havuz/kurallar düzeltilir.
export async function vote(req, env, okOrigin) {
  if (!okOrigin || !env.DB) return json({ ok: false }, okOrigin ? 200 : 403);
  let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  const q = String(b.q || '').replace(/\s+/g, ' ').trim().slice(0, MAX_Q);
  if (q.length < 3 || (b.oy !== 1 && b.oy !== 0)) return json({ ok: false }, 400);
  await initDb(env.DB).catch(() => {});
  await env.DB.prepare('INSERT INTO ak_oy (ts, q, kaynak, havuz, oy, site) VALUES (?,?,?,?,?,?)')
    .bind(new Date().toISOString(), q, String(b.k || '').slice(0, 20), /^[ho]\d{1,6}$/.test(b.h || '') ? b.h : null, b.oy, /^[a-z]{1,20}$/.test(b.s || '') ? b.s : 'hasturk').run().catch(() => {});
  return json({ ok: true });
}

// GET /ak/sayac: bugün ve son 7 gün kaç soru havuzdan / Claude'dan cevaplandı, Claude token kullanımı ve tahmini maliyet.
// Soru metni gösterilmez (yalnız sayılar).
// Konum: cevabın hangi Cloudflare merkezinden döndüğü ve veritabanının (D1) hangi bölgede çalıştığı.
// Ziyaretçinin kendi konumu yalnız kendisine gösterilir, kaydedilmez.
const MERKEZ = { IST: 'İstanbul', ADB: 'İzmir', ESB: 'Ankara', SOF: 'Sofya', OTP: 'Bükreş', ATH: 'Atina', FRA: 'Frankfurt', AMS: 'Amsterdam', LHR: 'Londra', CDG: 'Paris', VIE: 'Viyana', MXP: 'Milano', WAW: 'Varşova', ARN: 'Stockholm', DME: 'Moskova', TLV: 'Tel Aviv', IAD: 'Washington (ABD)', ORD: 'Chicago (ABD)', DFW: 'Dallas (ABD)', SJC: 'San Jose (ABD)', LAX: 'Los Angeles (ABD)', SEA: 'Seattle (ABD)', ATL: 'Atlanta (ABD)', EWR: 'New York (ABD)' };
const BOLGE = { EEUR: 'Doğu Avrupa', WEUR: 'Batı Avrupa', ENAM: 'Kuzey Amerika doğu', WNAM: 'Kuzey Amerika batı', APAC: 'Asya-Pasifik', OC: 'Okyanusya', ME: 'Orta Doğu', AF: 'Afrika' };
export async function konum(req, env) {
  const cf = req.cf || {}, out = { ok: true, cevap_merkezi: cf.colo ? `${cf.colo}${MERKEZ[cf.colo] ? ' — ' + MERKEZ[cf.colo] : ''}` : null, sizin_ulke: cf.country || null, havuz: 'Bilge Bey programının içinde (bu merkezde çalışır)' };
  if (env.DB) {
    const t0 = Date.now();
    try {
      const r = await env.DB.prepare('SELECT 1 AS x').all(), m = r.meta || {};
      out.veritabani = { bolge: m.served_by_region ? `${m.served_by_region}${BOLGE[m.served_by_region] ? ' — ' + BOLGE[m.served_by_region] : ''}` : null, ana_kopya: m.served_by_primary ?? null, merkez: m.served_by_colo || null, sql_ms: m.timings ? m.timings.sql_duration_ms : (m.duration ?? null), toplam_ms: Date.now() - t0 };
    } catch (e) { out.veritabani = { hata: true }; }
  }
  return json(out);
}

export async function sayac(env) {
  if (!env.DB) return json({ ok: false, why: 'db' });
  await initDb(env.DB).catch(() => {});
  const gun = today(), hafta = new Date(Date.now() + 3 * 3600e3 - 7 * 864e5).toISOString().slice(0, 10);
  const q = (since) => env.DB.prepare("SELECT kaynak, COALESCE(durum,'') AS durum, COUNT(*) AS n, SUM(COALESCE(giris,0)) AS giris, SUM(COALESCE(cikis,0)) AS cikis FROM ak_soru WHERE substr(ts,1,10) >= ? GROUP BY kaynak, durum").bind(since).all().then((r) => r.results);
  const oy = await env.DB.prepare('SELECT oy, COUNT(*) AS n FROM ak_oy GROUP BY oy').all().then((r) => r.results).catch(() => []);
  const [b, h] = await Promise.all([q(gun), q(hafta)]);
  const ozet = (rows) => {
    const ai = rows.filter((r) => r.kaynak === 'ai'), giris = ai.reduce((a, r) => a + r.giris, 0), cikis = ai.reduce((a, r) => a + r.cikis, 0);
    return { satir: rows, toplam: rows.reduce((a, r) => a + r.n, 0), havuz: rows.filter((r) => r.kaynak === 'havuz' || r.kaynak === 'havuz-ai').reduce((a, r) => a + r.n, 0),
      claude: ai.reduce((a, r) => a + r.n, 0), giris, cikis, tahmini_usd: +((giris * 4 + cikis * 20) / 1e6).toFixed(3) };
  };
  return json({ ok: true, bugun: ozet(b), son7: ozet(h), oylar: oy, model: env.AK_MODEL || MODEL, gunluk_sinir: Number(env.AK_DAILY_LIMIT) || DAILY_LIMIT });
}

// GET /ak/populer: son 30 günde havuzdan en çok cevaplanan sorular (öne çıkan sorular; en az 3 kez sorulmuş olmalı)
let POP = { t: 0, list: [] };
let HAVUZ_I = null;
export async function populer(env) {
  if (Date.now() - POP.t < 600000) return json({ ok: true, sorular: POP.list });
  let list = [];
  if (env.DB) {
    await initDb(env.DB).catch(() => {});
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const { results } = await env.DB.prepare("SELECT havuz, COUNT(*) AS n FROM ak_soru WHERE kaynak = 'havuz' AND ts >= ? GROUP BY havuz HAVING n >= 3 ORDER BY n DESC LIMIT 14")
      .bind(since).all().catch(() => ({ results: [] }));
    // Müşterinin yazdığı metin herkese gösterilmez (ad, telefon vb. içerebilir): aynı hazır cevabın kendi soru kalıbı
    // gösterilir. Havuz yeniden üretilince kimlik değişebilir; bulunamayan atlanır, aynı soru iki kez görünmez.
    if (!HAVUZ_I) HAVUZ_I = new Map(havuz().map((e) => [e.i, e]));
    const gor = new Set();
    list = results.map((r) => { const e = HAVUZ_I.get(r.havuz); return e && e.s && e.s[0] ? String(e.s[0]).slice(0, 80) : ''; })
      .map((q) => q.charAt(0).toLocaleUpperCase('tr-TR') + q.slice(1)).filter((q) => q.length >= 6 && !gor.has(norm(q)) && gor.add(norm(q))).slice(0, 6);
  }
  POP = { t: Date.now(), list };
  return json({ ok: true, sorular: list });
}

// Claude'un daha önce verdiği (müşteriye gösterilen, olumsuz oy almamış) cevaplar: aynı ya da neredeyse aynı soru
// tekrar gelirse Claude'a gitmeden bu cevap verilir (sezonda maliyet birikmesin). 5 dakikada bir tazelenir.
let RECENT = { t: 0, list: [], byQn: new Map() };
async function recentAi(db) {
  if (Date.now() - RECENT.t < 300000) return RECENT;
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { results } = await db.prepare("SELECT s.id, s.q, s.qn, s.cevap, s.urunler FROM ak_soru s WHERE s.kaynak = 'ai' AND s.durum = 'onay-bekliyor' AND s.ts >= ? " +
    "AND NOT EXISTS (SELECT 1 FROM ak_oy o WHERE o.q = s.q AND o.oy = 0) ORDER BY s.id DESC LIMIT 3000").bind(since).all();
  const list = [], byQn = new Map();
  for (const r of results) {
    if (byQn.has(r.qn) || ESKI(r.cevap || '')) continue;
    const e = { i: 'a' + r.id, t: 'ai-kayit', s: [r.q], c: r.cevap, u: JSON.parse(r.urunler || '[]') };
    byQn.set(r.qn, e); list.push(e);
  }
  RECENT = { t: Date.now(), list, byQn };
  return RECENT;
}

// Yapay zekânın tanıdığı bitkiler (ak_soru'da durum 'bitki-ai', havuz "bitki2:Ad|23322h|Grup"; çift sorguyla doğrulanmış): aynı bitki tekrar
// sorulunca Claude'a gidilmeden toprak kartı verilir. Olumsuz oy alanlar atlanır. 5 dakikada bir tazelenir.
let BITKI_AI = { t: 0, list: [] };
async function bitkiKayit(db) {
  if (Date.now() - BITKI_AI.t < 300000) return BITKI_AI.list;
  const { results } = await db.prepare("SELECT s.havuz, s.cevap FROM ak_soru s WHERE s.durum = 'bitki-ai' AND s.havuz LIKE 'bitki2:%' " +
    "AND NOT EXISTS (SELECT 1 FROM ak_oy o WHERE o.q = s.q AND o.oy = 0) ORDER BY s.id DESC LIMIT 2000").all();
  const seen = new Set(), list = [];
  for (const r of results) {
    const [ad, prof, grup] = String(r.havuz).slice(7).split('|'), k = norm(ad);
    if (!k || seen.has(k) || !/^[1-4][1-4][1-3][1-3][1-3][khd]$/.test(prof || '')) continue;
    seen.add(k);
    list.push({ ad, prof, grup, cevap: r.cevap, w: k.split(' ').filter((w) => w.length >= 3) });
  }
  BITKI_AI = { t: Date.now(), list: list.filter((x) => x.w.length) };
  return BITKI_AI.list;
}

const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Türkiye saati
// Karışım hizmeti pasifken hazır cevaplardaki tarif / hazırlatma cümleleri çıkarılır
const karisimsiz = (c) => c.replace(/ ve kendi karışımınız için tarifi aşağıda bulabilirsiniz/g, ' aşağıda bulabilirsiniz')
  .replace(/(^|\n)[^\n]*tarifinizi hazır karışım olarak sipariş edebilirsiniz\.?[^\n]*/g, '');
const json = (o, status = 200) => new Response(JSON.stringify(!KARISIM_ACIK && o && typeof o.cevap === 'string' ? { ...o, cevap: karisimsiz(o.cevap) } : o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });

// "Domates tohumu çeşitleri neler", "hangi çiçek tohumları var": stoktaki çeşitlerden en çok ilgi görenler (3 ürün) ve
// widget'ın altına koyduğu "Tüm çeşitleri gör" araması (ara). Ücretsiz; Claude'a gidilmez. Sorudaki her anlamlı kelime
// ürün adında geçmeli (kök eşleşmesi); en az 2 stoklu çeşit yoksa havuz / Claude devam eder.
const CESIT_RE = /çeşit|cesit|türleri|turleri|neler var|nelerdir|hangi .{2,40}\bvar\b|var m[ıi]|seçenek|secenek/i;
const CESIT_DUR = new Set(['cesit', 'cesitleri', 'cesitler', 'cesidi', 'cesidiniz', 'cesitleriniz', 'neler', 'nelerdir', 'hangi', 'hangileri', 'ne', 'neleriniz', 'turleri',
  'turler', 'turu', 'secenek', 'secenekleri', 'secenekler', 'olan', 'urun', 'urunler', 'urunleriniz', 'satiyor', 'sitenizde', 'elinizde', 'mevcut', 'kac', 'tane',
  'sizin', 'tum', 'butun', 'neydi', 'var', 'mi', 'mu', 'sizde', 'bir', 've', 'ile', 'satisi', 'satiyormusunuz', 'listesi']);
export function cesitAnswer(q, prods) {
  if (!CESIT_RE.test(q) || !prods || !prods.length) return null;
  const w = norm(q).split(' ').filter((t) => t.length >= 3 && !CESIT_DUR.has(t) && !FILL.has(t));
  if (!w.length || w.length > 3) return null;
  // Kök: son harf düşer (çiçek → çiçeği, saksı → saksısı), en çok 5 harf
  const st = w.map((t) => t.slice(0, t.length <= 3 ? 3 : Math.min(5, t.length - 1)));
  // "saksı" sorusunda "saksı toprağı" gibi başka türün adı geçen ürünler sayılmaz (kelimeden sonra tür adı geliyorsa)
  const TUR = ['topra', 'gubre', 'besin', 'ilac', 'altli', 'tabag', 'karis'];
  const uyar = (p) => {
    const ws = norm(p.n).split(' ');
    return st.every((x) => ws.some((y, i) => y.startsWith(x) && !(ws[i + 1] && TUR.some((k) => ws[i + 1].startsWith(k) && !st.some((z) => z.startsWith(k.slice(0, 4)))))));
  };
  const hit = prods.filter((p) => p.st > 0 && uyar(p));
  if (hit.length < 2) return null;
  hit.sort((a, b) => (b.h || 0) - (a.h || 0));
  // Arama ifadesi ürün adındaki tam kelimelerle ("tohumları" değil "Tohumu"): widget araması aynı ürünleri bulsun
  const ad = hit[0].n.replace(/\s*\([^)]*\)/g, ' ').split(/\s+/);
  const ara = st.map((x) => ad.find((y) => norm(y).startsWith(x)) || x).join(' ').toLocaleLowerCase('tr-TR');
  const kw = String(q).toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u).filter((t) => w.includes(norm(t))).join(' ') || ara;
  const konu = kw.charAt(0).toLocaleUpperCase('tr-TR') + kw.slice(1);
  return { i: 'liste', t: 'liste', c: `${konu} için stokta ${hit.length} çeşidimiz var. En çok tercih edilenler aşağıda; hepsini "Tüm çeşitleri gör" ile listeleyebilirsiniz.`, u: hit.slice(0, 3).map((p) => p.s), ara, n: hit.length };
}

// POST /ak  {q, p (ürün sayfası adresi), s (site), n (asistan adı)}
// Bitki sorunu cevabında önerilen ürünler canlı stoğa göre süzülür: stokta olmayan (ya da bu sitede olmayan) ürün listeden
// çıkar (eski biçimdeki "• Ad — fayda" satırı da); hiç ürün kalmazsa "ürünler aşağıda" cümlesi / başlık da kalkar
export function stokSuz(e, prods) {
  if (e.d !== 'sorun' || !e.un || !prods || !prods.length) return e;
  const st = new Map(prods.map((p) => [p.s, p]));
  const yok = new Set(e.u.filter((s) => !(st.get(s) || {}).st));
  if (!yok.size) return e;
  const adlar = e.u.map((s, i) => (yok.has(s) ? e.un[i] : null)).filter(Boolean);
  let c = e.c.split('\n').filter((l) => !adlar.some((n) => l.startsWith('• ' + n + ' — '))).join('\n');
  c = c.replace(/\n\nSitemizde işinize yarayacaklar:(?=\n\n|$)/, '');
  c = c.split('\n').filter((l) => !/^Birlikte: /.test(l)).join('\n'); // ikiliden biri yoksa birlikte kullanım anlatılmaz
  const u = e.u.filter((s) => !yok.has(s));
  if (!u.length) c = c.replace(/\n\nİşinize yarayacak ürünler aşağıda\./, '').replace(/\n\nÖnerimiz:(?=\n\n|$)/, '');
  return { ...e, c, u };
}

const GECMIS_MAX = 150, GECMIS_KAR = 12000;
export function gecmisAl(g) {
  if (!Array.isArray(g)) return [];
  const out = [];
  let top = 0;
  for (let i = g.length - 1; i >= 0 && out.length < GECMIS_MAX; i--) {
    const x = String(g[i] || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    if (x.length < 2) continue;
    if ((top += x.length) > GECMIS_KAR) break;
    out.unshift(x);
  }
  return out;
}
// Yapay zekâya sohbetin kısa özeti: geçen bütün bitkiler, konuşulan konular ve son sorular (uzun sohbette maliyet şişmesin)
export function sohbetOzeti(gecmis) {
  const bit = [], kon = [];
  gecmis.forEach((x) => {
    bitkilerHepsi(x).forEach((a) => { if (!bit.includes(a)) bit.push(a); });
    konularHepsi(gunluk(norm(x))).forEach((k) => { const a = (KONU_AD[k] || k).toLocaleLowerCase('tr-TR'); if (!kon.includes(a)) kon.push(a); });
  });
  return [...(bit.length ? [`(Sohbette geçen bitkiler: ${bit.slice(-10).join(', ')})`] : []), ...(kon.length ? [`(Konuşulan konular: ${kon.slice(-8).join(', ')})`] : []),
    ...(gecmis.length > 6 ? [`(Bu sohbette ${gecmis.length} önceki mesaj var; son sorular:)`] : []), ...gecmis.filter((x, i) => x.length >= 8 || i === gecmis.length - 1).slice(-6)];
}

// Hazır kısa cevaplar (yapay zekâsız): selam, teşekkür, onay; sipariş / iade müşteri hizmetlerine
const SORU_VAR = /\?|\b(ne|neden|nasil|hangi|kac|niye|mi|mu|misin|musun|miyim|lazim|gerek\w*)\b/;
const SELAM = /^(merhaba(lar)?|meraba|selam(lar)?|slm|mrb|sa|selamun aleykum|aleykum selam|iyi (gunler|aksamlar|sabahlar|calismalar)|gunaydin|hey|hello)( (bilge bey|bilge|efendim|hocam|abi|abla|kardesim))?$/;
const TESEKKUR = /\b(tesekkur\w*|sagol\w*|sag ol\w*|eyvallah|eline saglik|allah razi olsun|mersi|tsk\w*|cok iyi|harika|super|cok faydali|isime yaradi)\b/;
const ONAY = /^(tamam(dir)?|anladim|anlasildi|peki|ok|okey|oldu|olur|tamam anladim|anladim tamam|peki tamam|tamam peki|oke)$/;
// Müşteri hizmetleri (config.json > whatsapp ile aynı numara): numara soran müşteriye yönlendirme yerine doğrudan verilir
export const TEL = '+90 553 727 2929';
const ILETISIM = /(musteri hizmet\w*|iletisim (numara|no\b|bilgi|adres|kur)\w*|telefon\w* (numara|no\b|var mi|nedir|ne\b|ver|paylas)\w*|numara(niz|nizi|niza|lariniz\w*|lari var)|whatsapp|watsap|vatsap|wp hatt|size nasil ulas\w*|sizlere nasil ulas\w*|nasil ulasabilir\w*|buradan ulas\w*|ulasabilir miyim|yetkili (biri|kisi|ile|yle)\w*|biriyle gorus\w*|canli destek|kim yardimci olabilir|sizi nasil ara\w*|arayabilir miyim)/;
const SIPARIS = /\b(siparis(im|imi)? (nerede|nerde|durumu|gelmedi|takip\w*|ne durumda|hala|kaldi|iptal\w*)|kargo(m|mu|yu)? (nerede|nerde|takip\w*|gelmedi|hala|kaldi)|takip (no|numara)\w*|iade\w*|degisim\w*|geri gonder\w*|para (iade|geri)\w*|eksik geldi|kirik geldi|hasarli geldi|yanlis urun geldi|faturam)\b/;
// Yeni ürün almak isteyen ("4 adet 40 lt almak istiyorum", "nasıl sipariş veririm"): sipariş takibi değil, satın alma yardımı
const SATIN = /\b(almak isti\w*|satin al\w*|siparis ver\w*|siparis vermek\w*|nasil siparis\w*|nasil alabilir\w*|sepete ekle\w*|(\d+|bir|iki|uc|dort|bes|on) (adet|tane|cuval|paket|kutu|bidon) (alacag\w*|almak\w*|isti\w*|lazim|gerek\w*))\b/;
// Mağazanın yeri / merkezi: adres bilgisi elimizde yok; satış ve gönderim düzeni anlatılır, adres için müşteri hizmetleri
// Mağaza bilgisi (kullanıcı, Kasım 2026): bayimiz ve şubemiz yok; satış internet sitesinden, gönderim kargoyla. Yer sorulursa fabrika adresi.
const FABRIKA = 'Kızılcaali Mahallesi, Karakoçan Çıkmazı Sokak, No:7/1, 34540 Çatalca / İstanbul';
const BAYI = /\b(bayi\w*|bayii\w*|bayilik\w*|satis nokta\w*|satis yer\w*|distributor\w*|toptanci\w*|yetkili satic\w*|subeniz\w*|sube\w* var|magazaniz var|dukkan\w*)\b/;
const BAYI_CEVAP = `Bayimiz ya da şubemiz yok; ürünlerimizi yalnız internet sitemizden satıyoruz. Siparişiniz aynı gün kargoya verilir, bölgenize göre ertesi gün ya da 2–3 gün içinde Türkiye'nin her yerine teslim edilir. Fabrikamız İstanbul Çatalca'da: ${FABRIKA}. Toplu alım için müşteri hizmetlerimiz: +90 553 727 2929 (telefon ve WhatsApp).`;
// Telefona çıkılmadı, ulaşamadım: özür, WhatsApp ve geri dönüş
const ULASAMA = /(telefon\w*|\btel\b|\bhat\w*|numara\w*|arama\w*|aradim\w*|ariyorum\w*)\s*(\w+\s){0,2}(ac\w*m\w*|acilm\w*|bakm\w*|cevap verm\w*|yanit\w*m\w*|ulasam\w*|mesgul\w*)|\b(ulasam\w*|ulasilm\w*|donus (yapm|olm|alam)\w*|geri donm\w*|kimse (acm|bakm|cevap)\w*|mesajima (donm|bakm|cevap)\w*|telefonu acmiyo\w*|telefonlari acmiyo\w*)\b/;
const ULASAMA_CEVAP = `Kusura bakmayın; ekibimiz o sırada başka bir müşterimizle görüşüyor olabilir. +90 553 727 2929 numarasına WhatsApp'tan yazabilir ya da mesaj bırakabilirsiniz; en kısa sürede size dönüş yapıyoruz. Ürün, toprak ya da gübreyle ilgili sorunuzu buraya da yazabilirsiniz, hemen yardımcı olayım.`;
// Kargo / gönderim bölgesi ("Rize'ye gönderim var mı", "her yere kargo var mı", "kargo ücreti"): ürün tanıtımına DEĞİL,
// genel kargo cevabına gider (sipariş durumu SIPARIS'te ayrı yönlendirilir)
const KARGO_BOLGE = /\b((gonderim|teslimat|kargo)\w* (var mi\w*|varmi\w*|oluyor mu|yapiyor\w*|yap(ar|iyor)\w*|mumkun mu|ucret\w*|bedava\w*|ucretsiz\w*|fiyat\w*|ne kadar)|(gonderiyor|yolluyor|gonderir|yollar|kargola\w*) (musunuz|mu)|her ?yere (kargo|gonder\w*|teslim\w*)|turkiye'?nin her (yerine|iline))/;
const KARGO_CEVAP = `Türkiye'nin her yerine kargo yapıyoruz. Siparişiniz aynı gün kargoya verilir; bölgenize göre ertesi gün ya da 2–3 gün içinde teslim edilir. 975 TL ve üzeri siparişlerde kargo ücretsizdir. Siparişinizin durumu ve kargo takibi için müşteri hizmetlerimiz: ${TEL} (telefon ve WhatsApp).`;
// Son kullanma tarihi / raf ömrü ("son kullanma tarihi nedir", "skt", "miad"): ürün tanıtımına DEĞİL, SKT cevabına gider
const SKT = /\b(son kullanma tarih\w*|son kullanim tarih\w*|\bskt\b|miad\w*|raf omru\w*|uretim tarih\w*|tuketim tarih\w*)\b/;
const SKT_CEVAP = `Ürünlerimiz uzun raf ömürlüdür; kesin son kullanma tarihi ürünün ambalajı/etiketi üzerinde yazar. Belirli bir ürünün tarihini öğrenmek isterseniz müşteri hizmetlerimize sorabilirsiniz: ${TEL} (telefon ve WhatsApp).`;
// Ürün adı geçen soru: "var mı / fiyatı" → ürün kartı; "nasıl kullanılır / karıştırılır mı" → ürün kartındaki bilgiyle cevap
const URUN_VAR = /\b(fiyat\w*|kac (tl|lira|para)\w*|ucret\w*|var mi\w*|varmi\w*|var midir|bulabil\w*|bulunur\w*|bulunuyor\w*|satiyor mu\w*|satiyor musunuz|nereden al\w*|nerden al\w*|alabilir mi\w*|stok\w*)\b/;
const URUN_KULLAN = /\b(nasil kullan\w*|kullanim\w*|kullanilir\w*|kullanmali\w*|ne ise yar\w*|ise yar\w*|karistir\w*|karisir\w*|mevcut topra\w*|eski topra\w*|uzerine (ser|dok|kapat|at)\w*|doz\w*|ne kadar (kullan|koy|ver|at|serp)\w*|kac (litre|kg|kilo|gram|olcu|kasik|ml)\b|ne zaman (kullan|uygula|ver|at|serp)\w*|uygula\w*|hangi bitki\w*|icinde ne var|icerig\w*|etkili (olur|mu|mi)\w*|ise yarar m\w*|zararli m\w*|zarar verir\w*)\b/;
const URUN_GENEL = new Set(['ozel', 'karisim', 'karisimi', 'organik', 'hasturk', 'premium', 'formul', 'formullu', 'profesyonel', 'urun', 'urunu', 'icin', 'bitki', 'bitkiler', 'adet', 'paket', 'litre', 'gram', 'yuksek', 'kalite', 'kaliteli', 'dogal']);
// Ürün türü sözcükleri tek başına ürünü belirlemez ("toprak fiyatı" bir ürün değildir)
const URUN_TUR = new Set(['topragi', 'toprak', 'gubre', 'gubresi', 'tohum', 'tohumu', 'saksi', 'saksisi', 'sivi', 'kati', 'seti', 'besin', 'besini', 'ilac', 'ilaci', 'agaci', 'cicek', 'cicegi', 'fidan', 'fidani']);
// Kelime eşleşmesi: kısa kökte (4 harf) tam önek ("kisin" ≠ "kisa", "kargo" ≠ "kare"); 5+ harfte son harf yumuşayabilir (kitap/kitabı)
const kelimeEs = (a, b) => { const n = Math.min(a.length, b.length), k = n >= 5 ? n - 1 : n; return n >= 4 && Math.abs(a.length - b.length) <= 3 && a.slice(0, k) === b.slice(0, k); };
// Ürün türü kökleri: "saksıda", "toprağına", "gübreli" de tür kelimesidir (ürünü tek başına belirlemez)
const TUR_KOK = /^(topra|gubre|tohum|saksi|sivi|kati|setl?i?$|besin|ilac|agac|cicek|fidan|fide)/;
const turMu = (w) => URUN_TUR.has(w) || TUR_KOK.test(w);
// Soru ve mağaza sözcükleri ürün adındaki kelimeye benzese de ürünü belirlemez ("seçenek var mı" ≠ "3 Boy Seçenekli")
const URUN_DUR = /^(lazim|nasil|kadar|zaman|neden|hangi\w*|baska|secenek\w*|cesit\w*|model\w*|sadece|tane|olur\w*|olsun|acaba|merhaba|yardim\w*|ucretsiz|kargo\w*|indirim\w*|siparis\w*|teslim\w*|gonder\w*|istiyorum|isterim|almak|alayim|alabilir\w*|lutfen|tesekkur\w*|sulama\w*|sulamali\w*|kisin|yazin|gunes\w*|gerekir|gerek\w*|yapmali\w*|yapmam|dikmem|ekmem|direkt|direk|dogrudan)$/;
// bitkiVar: soruda bitki adı geçiyor; o zaman ürünün tür kelimesi de (toprağı, gübresi…) soruda geçmeli ("çilek ne zaman meyve verir" ≠ Çilek Toprağı)
export function urunAdla(nq, prods, bitkiVar = false) {
  // Kısa soru ölçüsü soru sözcükleriyle birlikte sayılır ("kaynana dili ne kadar su ister" kısa sayılıp tek kelimeyle ürüne bağlanmasın)
  const qt0 = nq.split(' ').filter((w) => w.length >= 4 && !URUN_GENEL.has(w)), qt = qt0.filter((w) => !URUN_DUR.test(w));
  if (!qt.length) return null;
  let en = null;
  for (const p of prods) {
    const pt = [...new Set(norm(p.n).split(' ').filter((w) => w.length >= 4 && !URUN_GENEL.has(w) && !/\d/.test(w)))];
    if (!pt.length) continue;
    const ayirt = qt.filter((q) => !turMu(q) && pt.some((w) => !turMu(w) && kelimeEs(q, w))).length, tur = qt.filter((q) => pt.some((w) => turMu(w) && kelimeEs(q, w))).length, h = ayirt + Math.min(tur, 1);
    // en az bir ayırt edici kelime (orman, solucan, perlit, limon …); tür kelimesi (toprağı, gübresi) tek başına yetmez
    if (!ayirt || (h < 2 && !(qt0.length <= 3) && pt.filter((w) => !turMu(w)).length > 1)) continue;
    if (bitkiVar && !tur && pt.some(turMu)) continue;
    const k = [h, h / pt.length, p.st ? 1 : 0, p.h || 0, -p.n.length]; p.__ayirt = ayirt;
    const ustun = !en || (() => { for (let i = 0; i < k.length; i++) if (k[i] !== en.k[i]) return k[i] > en.k[i]; return false; })();
    if (ustun) en = { p, k };
  }
  return en ? en.p : null;
}
// "Var mı / fiyatı" cevabında ürünün kısa tanıtımı (ürün kartından); bazı ürünlerde kullanıcının istediği açık bilgi
const URUN_OZET = { 'dogal-orman-topragi-humuslu': 'Kırklareli Istranca ormanlarından alınan, %100 doğal orman toprağıdır; karışım değildir, içinde kimyasal gübre ya da zirai ilaç yoktur. Paketinden çıktığı gibi saksıda, bahçede, fidan dikiminde ve çim alanlarında kullanılır.' };
// Kullanım sorusunun yedek cevabı (yapay zekâya ulaşılamazsa): ürün kartındaki kullanım / uygulama satırları
function kullanimSatir(slug) {
  const L = String(URUN_KART[slug] || '').split('\n').filter((l) => /^[•\-]/.test(l) || /:/.test(l)).filter((l) => !/[?:]$/.test(l) && l.length <= 260)
    .filter((l) => /kullan|uygula|karist|serp|doz|sula|saksi|saksı|yenile|kalınlı|kalinli|kg|litre|gram|metrekare|dekar|cm\b|ekim|dikim|yayın|yay[ıi]n/i.test(l));
  return L.length >= 2 ? L.slice(0, 6).map((l) => (l.startsWith('•') ? l : '• ' + l)).join('\n') : '';
}
function urunOzet(slug) {
  if (URUN_OZET[slug]) return URUN_OZET[slug];
  const t = String(URUN_KART[slug] || '').split('\n').slice(1).find((l) => l.length >= 50 && !/\?/.test(l) && !/^[•\-]/.test(l) && /\.(\s|$)/.test(l) && !/^[^.]{0,40}:/.test(l));
  if (!t) return '';
  const c = t.match(/^.{40,240}?\.(\s|$)/); return c ? c[0].trim() : '';
}
const KONUM = /\b(merkez\w*|adres\w*|fabrika\w*|yeriniz\w*|yeri nere\w*|istanbul\w* (da|de) mi\w*|neredesiniz|nerdesiniz|nerede(siniz)?|nerde|magaza\w* (nerede|nerde|var mi)|fiziki\w*|gelip (alabil|teslim)\w*|yerinden (alabil|teslim)\w*|subeniz\w*|hangi (sehir|il)de\w*)\b/;
// Önceki mesaja bağlı ürün önerisi isteği ("hangi marka tavsiye", "ne önerirsin", "hangisini alayım")
// Galvaniz yapı aileleri (odunluk, kafes, raf …): soru kalıbı, ürün adı kalıbı, başlık, widget araması. Genel soruda
// ("klima kafesi", "kuşhane var mı", "odunluk almak istiyorum") ailenin stoktaki ölçüleri listelenir; hesap isteyen soruda
// ("1 ster odun için hangi odunluk") yapay zekâya ailenin bütün ürünleri ve ürün kartları verilir.
const AILELER = [
  [/odunluk\w*|odun (istif|depo|kulube|sundurma)\w*|\bster\b/, /odunluk/, 'Odunluk', 'odunluk'],
  [/kus ?hane\w*|kus kafes\w*|voliyer\w*|salma kus\w*|kumru kafes\w*|guvercin kafes\w*/, /kus kafesi/, 'Kuş kafesi', 'kuş kafesi'],
  [/kedi\w* (icin )?(balkon|kafes|file)\w*|balkon (kafes|file)\w*/, /kedi balkon kafesi/, 'Kedi balkon kafesi', 'kedi balkon kafesi'],
  [/(klima|isi pompa|vrf|kompresor|dis unite)\w*.{0,24}(kafes|koruma|muhafaza|kilif)\w*|klima kafes\w*|kompresor kafes\w*/, /klima kafesi|isi pompasi ve klima|vrf unite kafesi|kompresor kafesi/, 'Klima ve kompresör kafesi', 'kafesi tip'],
  [/cop (konteyner|kova|bidon)\w*|konteyner muhafaza\w*|cop muhafaza\w*/, /cop (konteyneri|kovasi) muhafazasi/, 'Çöp konteyneri muhafazası', 'muhafazası'],
  [/ari kovan\w*|kovan sehpa\w*|kovan standi\w*/, /ari kovani sehpasi/, 'Arı kovanı sehpası', 'kovanı sehpası'],
  [/konnektor\w*|baglanti parca\w*|profil (ek|birlesim)\w*/, /profil\w* konnektoru|ekleme konnektoru/, 'Profil konnektörü', 'konnektör'],
  [/kutu profil\w*|galvaniz profil\w*|profil (boru|demir)\w*/, /^galvaniz kutu profil/, 'Galvaniz kutu profil', 'kutu profil'],
  [/arac golgelig\w*|carport|araba (golgelig|park|garaj)\w*|oto golgelik\w*|otopark golgelig\w*/, /arac golgeligi/, 'Araç gölgeliği', 'araç gölgeliği'],
  [/konteyner (iskelet|ev|depo)\w*|depo konteyner\w*/, /konteyner iskeleti/, 'Konteyner iskeleti', 'konteyner iskeleti'],
  [/kurutma (tezgah|masa|rafi)\w*/, /kurutma tezgahi/, 'Kurutma tezgâhı', 'kurutma'],
  [/(garaj|depo|kiler|balkon|ofis|fide|ev|metal|galvaniz|celik|koli|bidon)\w*( (icin|ici))? raf\w*|raf (iskelet|sistem)\w*/, /rafi iskeleti/, 'Raf iskeleti', 'rafı iskeleti'],
  [/tezgah\w*|calisma masa\w*|kargo (hazirlama )?masa\w*|saksi masa\w*/, /(tezgahi|masasi) iskeleti/, 'Tezgâh ve çalışma masası', 'iskeleti alt raflı'],
  [/\bkumes(?!\w* gubre)\w*|tavuk (evi|kafes|barinag)\w*/, /kumes iskeleti/, 'Kümes iskeleti', 'kümes'],
  [/sera (iskelet|cati|kur|yap|model|fiyat|olcu)\w*|modul\w* sera\w*|galvaniz sera\w*/, /sera iskeleti|sera ve kumes iskeleti/, 'Sera iskeleti', 'sera iskeleti'],
  [/bahce kemer\w*|gul kemer\w*|sarmasik kemer\w*|pergola\w*|cardak\w*/, /bahce kemeri/, 'Bahçe kemeri', 'bahçe kemeri'],
].map(([q, u, ad, ara]) => ({ q, u, ad, ara }));
// Kendin Tasarla'da ölçüsü seçilebilen aileler (cevapta "istediğiniz ölçüde" notu)
const TASARLANIR = new Set(['arı kovanı sehpası', 'kovanı sehpası', 'kafesi tip', 'muhafazası', 'araç gölgeliği', 'kurutma', 'iskeleti alt raflı', 'sera iskeleti', 'bahçe kemeri']);
export const aileBul = (nq) => AILELER.find((a) => a.q.test(nq)) || null;
// Aile sorusunda aile adından başka bilgi yoksa (var mı, fiyatı, almak istiyorum, ölçüleri) liste verilir
const AILE_DUR = /^(var|mi|mu|misiniz|musunuz|ne|kadar|kac|para|tl|fiyat\w*|olcu\w*|model\w*|cesit\w*|tur\w*|sati\w*|alma\w*|alabil\w*|ister\w*|isti\w*|lazim|ariyor\w*|bakiyor\w*|bilgi\w*|hakkin\w*|urun\w*|galvaniz|tavsiye\w*|oner\w*|hangi\w*|sizde|sizin|elinizde|mevcut|stok\w*|adet|tane|bir|iki|uc|dort|bes|on|\d+|acaba|merhaba|selam\w*|lutfen|kac|nedir|neler)$/;
export function aileListe(nq, prods) {
  const a = aileBul(nq); if (!a) return null;
  const hit = prods.filter((p) => p.st > 0 && a.u.test(norm(p.n)));
  if (!hit.length) return null;
  // Ürün adlarında geçen kelimeler ("sehpası", "kafesi", "muhafazası") da bilgi sayılmaz
  const adK = new Set(hit.flatMap((p) => norm(p.n).split(' ')));
  if (nq.replace(a.q, ' ').split(' ').some((w) => w.length > 1 && !FILL.has(w) && !AILE_DUR.test(w) && !adK.has(w))) return null;
  // Soruda geçen kelime ürün adında da varsa ("garaj rafı" → Garaj Rafı) o ürün öne alınır
  const qw = nq.split(' ').filter((w) => w.length >= 4), sk = (p) => qw.filter((w) => norm(p.n).split(' ').includes(w)).length;
  hit.sort((x, y) => sk(y) - sk(x) || (y.h || 0) - (x.h || 0));
  const adlar = hit.map((p) => '• ' + String(p.n).trim()).sort((x, y) => x.localeCompare(y, 'tr', { numeric: true }));
  const c = `${a.ad} için stokta ${hit.length} ${hit.length > 1 ? 'ölçü ve modelimiz' : 'modelimiz'} var:\n${adlar.slice(0, 12).join('\n')}${adlar.length > 12 ? `\n• … ve ${adlar.length - 12} ölçü daha` : ''}\n\n` +
    `Ölçüyü seçip kartından "Sepete Ekle"ye dokunabilirsiniz. Hangisinin size uygun olduğundan emin değilseniz kullanacağınız alanın ölçüsünü ya da ihtiyacınızı yazın, birlikte seçelim.` +
    (TASARLANIR.has(a.ara) ? `\n\nAradığınız ölçü listede yoksa istediğiniz ölçüde de yaptırabilirsiniz: aşağıdaki "İstediğiniz ölçüde tasarlayın" düğmesiyle ölçünüzü seçin, yapıyı 3B görün; parçalar ölçünüze göre kesilip delinmiş gönderilir.` : '');
  return { i: 'aile:' + a.ara, t: 'liste', c, u: hit.slice(0, 3).map((p) => p.s), ara: a.ara, n: hit.length };
}
const ONERI = /\b(hangi (marka|urun\w*|gubre\w*|topra\w*)|marka\w* (tavsiye|oner)\w*|ne (tavsiye|oner)\w*|tavsiye (eder|edersin|edersiniz|verir|ver)\w*|onerin\w*|hangisini (alay|alma|oner|tavsiye)\w*|ne (alay|almali)\w*)\b/;
export function hazirNiyet(q) {
  const n = norm(q), w = n.split(' ').length;
  if (SELAM.test(n)) return 'selam';
  if (ONAY.test(n)) return 'onay';
  if (TESEKKUR.test(n) && w <= 8 && !SORU_VAR.test(n)) return 'tesekkur';
  if (SIPARIS.test(n)) return 'siparis';
  if (ILETISIM.test(n) && w <= 14) return 'iletisim';
  return null;
}
function niyetCevap(niyet, name) {
  if (niyet === 'selam') return { ok: true, kaynak: 'havuz', tur: 'selam', cevap: `Merhaba! Ben ${name}. Bitkiniz, toprak, gübre, tohum ya da ürünlerimizle ilgili sorunuzu yazın; size yardımcı olayım.`, urunler: [] };
  if (niyet === 'tesekkur') return { ok: true, kaynak: 'havuz', tur: 'tesekkur', cevap: 'Rica ederim, kolay gelsin! Başka bir sorunuz olursa yazmanız yeterli; bu sohbette konuştuklarımızı hatırlıyorum.', urunler: [] };
  if (niyet === 'onay') return { ok: true, kaynak: 'havuz', tur: 'onay', cevap: 'Tamam. Başka merak ettiğiniz bir şey olursa yazmanız yeterli.', urunler: [] };
  if (niyet === 'siparis') return { ok: true, kaynak: 'yonlendir', tur: 'siparis', neden: 'yonlendir', cevap: `Sipariş durumu, kargo takibi, iade ve değişim için müşteri hizmetlerimiz size hemen yardımcı olur: ${TEL} (telefon ve WhatsApp).`, urunler: [] };
  if (niyet === 'iletisim') return { ok: true, kaynak: 'yonlendir', tur: 'iletisim', neden: 'yonlendir', cevap: `Müşteri hizmetlerimize ${TEL} numarasından telefonla ulaşabilir, aynı numaradan WhatsApp ile yazabilirsiniz. Sipariş, kargo, iade ya da ürün seçimi konusunda ekibimiz size yardımcı olur.`, urunler: [] };
  if (niyet === 'konu_disi') return { ok: true, kaynak: 'yonlendir', tur: 'konu_disi', neden: 'konu_disi', cevap: 'Ben yalnız bahçe, bitki bakımı ve mağazamızdaki ürünler konusunda yardımcı olabiliyorum. Bitkiniz ya da ürünlerimizle ilgili bir sorunuz varsa yazın.', urunler: [] };
  return null;
}
// Önceki mesaja bağlı ve kendi başına anlaşılmayabilecek mesaj: yardımcı modelle netleştirilir
const GONDERME = /\b(pardon|yanlis|degil|demek istedim|aslinda|olani|olanini|olanlari|aynisi|ayni mi|o zaman|bunu|bunlari|buna|bunun|onu|onlari|ona|onun|ikisi\w*|hepsi\w*|digeri\w*|oteki\w*|sunu|soyle)\b/;

// Düzeltme: "pardon kauçuk demek istedim", "limon değil mandalina", "toprak değil gübre soruyorum" → önceki soru düzeltilmiş hâliyle
export function duzeltme(q, gecmis = []) {
  const n = gunluk(norm(q));
  if (!gecmis.length || !/\b(pardon|yanlis|degil|demek istedim|kastettim|kastediyorum|aslinda|yok yok)\b/.test(n)) return null;
  const sag = /\bdegil\b/.test(n) ? n.split(/\bdegil\b/).slice(1).join(' ') : n;
  const son = gunluk(norm(gecmis[gecmis.length - 1])), lc = (x) => x.toLocaleLowerCase('tr-TR');
  const yeniB = bitkilerHepsi(sag)[0] || null, yeniK = konularHepsi(sag).filter((k) => k !== 'hasta')[0] || null;
  const eskiB = (bitkiEsle(son) || {}).ad || null, eskiK = konuBul(son);
  const b = yeniB || eskiB, k = yeniK || eskiK, K = KONULAR.find((x) => x[0] === k);
  if (!b || !K || !K[2] || (b === eskiB && k === eskiK)) return null;
  return K[2](lc(b));
}

export async function handle(req, env, ctx, { aiKey, originOk, products, formul }, ic = null) {
  if (!originOk) return json({ ok: false, why: 'origin' }, 403);
  let body;
  if (ic) body = ic.body;
  else try { body = await req.json(); } catch { return json({ ok: false, why: 'json' }, 400); }
  const qOrj = String(body.q || '').replace(/\s+/g, ' ').trim().slice(0, MAX_Q);
  // Kayda müşterinin kendi yazdığı geçer (yardımcı model soruyu netleştirdiyse de)
  const qKayit = ic ? ic.o : qOrj;
  if (qOrj.length < 2) return json({ ok: false, why: 'kisa' }, 400);
  // Sohbetin önceki mesajlarının tamamı (yalnız aşırı uzun sohbette en eski kısım düşer): bu soruyu anlamak için; kaydedilmez
  const gecmis = gecmisAl(body.g);
  // Denetim için: sorudan önceki son müşteri mesajı (takip sorusu ne hakkındaydı); yalnız şifreli inceleme sayfasında görünür
  const onceki = gecmis.length ? String(gecmis[gecmis.length - 1]).slice(0, 300) : null;
  const y = body.on === 1 ? null : yorumla(qOrj, gecmis);
  // Önceki mesaja bağlı soru ("peki ne kadar sulayayım"): bitki eklenmiş hâliyle aranır
  // Ama müşteri yeni bir ürünü soruyorsa ("solucan gübresi nasıl kullanılır") önceki bitkiye bağlanmaz; "bunun için" diyorsa bağlanır
  if (y && y.takip && !/\b(bunun|buna|bunlar\w*|onun|ona|onlar\w*|bitkim\w*|agacim\w*|cicegim\w*)\b/.test(norm(qOrj))) {
    const uh = poolAnswer(qOrj).hit;
    if (uh && /^(urun|pompa|saksi|pompa-genel)$/.test(uh.e.t) && uh.sc >= 0.95) Object.assign(y, { takip: false, bitki: null, grup: '', q2: null });
  }
  // Uzun, kendi başına anlatılmış mesaj (12+ kelime, gönderme yok) önceki bitkiye bağlanmaz
  if (y && y.takip && norm(qOrj).split(' ').length >= 12 && !/\b(bunun|buna|bunu|bunlar\w*|onun|ona|onu|onlar\w*)\b/.test(norm(qOrj))) Object.assign(y, { takip: false, bitki: null, grup: '', q2: null });
  let q = y && y.takip && y.q2 ? y.q2 : qOrj;
  // "Hangi marka tavsiye", "ne önerirsin": bitki bu mesajda yoksa sohbetteki son bitki ve konuyla ("yaban mersini için hangi gübre")
  if (y && gecmis.length && ONERI.test(norm(qOrj)) && !BASKA.test(norm(qOrj)) && !bitkilerHepsi(qOrj).length) {
    let pl = null, k = konuBul(gunluk(norm(qOrj)));
    for (let i = gecmis.length - 1; i >= 0 && !pl; i--) { pl = bitkilerHepsi(gecmis[i])[0] || null; if (!k) k = konuBul(gunluk(norm(gecmis[i]))); }
    if (pl) { q = `${pl.toLocaleLowerCase('tr-TR')} için hangi ${k === 'toprak' ? 'toprak' : 'gübre'}`; Object.assign(y, yorumla(q, [])); }
  }
  // Son cevapta önerilen ürünler (en çok 3): "bunu nasıl kullanırım", "ikisini birlikte nasıl kullanayım"
  const sonUrun = Array.isArray(body.su) ? body.su.filter((x) => /^[a-z0-9-]{2,140}$/.test(x)).slice(0, 3) : [];
  // Bitkisi yazılmamış, sohbete bağlı kısa soru ("peki ya kışın?"): başka bir sohbette verilmiş kayıtlı yapay zekâ cevabı kullanılmaz
  // Sohbete bağlı soru: önceki mesaja gönderme yapıyorsa ("bu toprağa", "peki bunu") ya da bitki adı olmadan kısa soruysa
  // başka bir sohbette verilmiş kayıtlı yapay zekâ cevabı kullanılmaz (aynı cümle başka bitki / ürün için sorulmuş olabilir)
  const atifli = /\b(bu|bunu|bunun|buna|bunlar\w*|su|sunu|onu|onun|ona|onlar\w*|peki|ayni\w*|ikisi\w*|hepsi\w*|bahsettigin\w*|onerdigin\w*)\b/.test(norm(qOrj));
  const baglamli = gecmis.length > 0 && (atifli || (!(y && y.bitki) && norm(qOrj).split(' ').length <= 10));
  const sayfa = /^[a-z0-9-]{1,140}$/.test(body.p || '') ? body.p : null;
  const site = /^[a-z0-9-]{1,30}$/.test(body.s || '') ? body.s : 'hasturk';
  // Tarım Dünyası: havuzdaki HasTürk ürün adresleri o mağazanın adreslerine çevrilir (aynı ürün başka adresle satılıyor);
  // ürün sayfası ve son önerilen ürünler de havuzda aranırken HasTürk adresine geri çevrilir
  const TM = site === 'tarim' ? TARIM.ileri : null, TG = site === 'tarim' ? TARIM.geri : null;
  const esle = (u) => (TM ? u.map((s) => TM[s] || s) : u), geri = (s) => (TG && TG[s]) || s;
  const sx = (e) => stokSuz(TM ? { ...e, u: esle(e.u) } : e, prods);
  const name = String(body.n || 'Bilge Bey').replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 30) || 'Bilge Bey';
  const db = env.DB;
  const ready = db ? initDb(db).catch(() => {}) : Promise.resolve();
  const prods = await products().catch(() => []);
  const pageName = sayfa ? ((prods.find((p) => p.s === sayfa) || {}).n || '') : '';
  const page = sayfa && geri(sayfa);
  const kayitYaz = (o) => { if (db && req.headers.get('x-ak-test') !== '1') ctx.waitUntil(ready.then(() => db.prepare('INSERT INTO ak_soru (ts, q, qn, kaynak, havuz, cevap, site, sayfa, onceki) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(new Date().toISOString(), qKayit, norm(qKayit), o.kaynak, o.havuz, String(o.cevap || '').slice(0, 1500), site, sayfa, onceki).run()).catch(() => {})); };
  // Selam, teşekkür, "tamam", sipariş / iade: hazır kısa cevap
  const hn = body.on === 1 ? null : hazirNiyet(qOrj);
  if (hn) { const c = niyetCevap(hn, name); kayitYaz({ kaynak: c.kaynak, havuz: 'niyet:' + hn, cevap: c.cevap }); return json(c); }
  const nq0 = norm(qOrj), kel = nq0.split(' ').length;
  // Bayi / şube sorusu ve "telefonu açmıyorlar": hazır cevap (gübre, bitki sorusuyla karışmaz)
  if (body.on !== 1 && BAYI.test(nq0) && kel <= 18) { kayitYaz({ kaynak: 'havuz', havuz: 'bayi', cevap: BAYI_CEVAP }); return json({ ok: true, kaynak: 'havuz', id: 'bayi', tur: 'magaza', cevap: BAYI_CEVAP, urunler: [] }); }
  if (body.on !== 1 && ULASAMA.test(nq0) && kel <= 18 && !SIPARIS.test(nq0)) { kayitYaz({ kaynak: 'havuz', havuz: 'ulasamadim', cevap: ULASAMA_CEVAP }); return json({ ok: true, kaynak: 'yonlendir', id: 'ulasamadim', tur: 'iletisim', neden: 'yonlendir', cevap: ULASAMA_CEVAP, urunler: [] }); }
  // Kargo/gönderim bölgesi ve son kullanma tarihi: ürün sayfasında sorulsa bile ürün tanıtımına değil, doğru meta cevabına gider
  if (body.on !== 1 && KARGO_BOLGE.test(nq0) && !SIPARIS.test(nq0) && kel <= 18) { kayitYaz({ kaynak: 'havuz', havuz: 'kargo-bolge', cevap: KARGO_CEVAP }); return json({ ok: true, kaynak: 'havuz', id: 'kargo-bolge', tur: 'magaza', cevap: KARGO_CEVAP, urunler: [] }); }
  if (body.on !== 1 && SKT.test(nq0) && kel <= 18) { kayitYaz({ kaynak: 'havuz', havuz: 'skt', cevap: SKT_CEVAP }); return json({ ok: true, kaynak: 'havuz', id: 'skt', tur: 'magaza', cevap: SKT_CEVAP, urunler: [] }); }
  // Önerilen toprağın kullanımı / dikim ("bu toprağa nasıl dikerim", "mevcut toprakla karıştırayım mı")
  const sonUrun0 = Array.isArray(body.su) ? body.su.filter((x) => /^[a-z0-9-]{2,140}$/.test(x)).slice(0, 3) : [];
  if (body.on !== 1 && !SIPARIS.test(nq0) && !SATIN.test(nq0)) {
    const tk = toprakKullanNiyet(qOrj, gecmis, sonUrun0, prods);
    if (tk) {
      const c = toprakKullanCevap(tk, qOrj);
      kayitYaz({ kaynak: 'havuz', havuz: 'toprak-kullan:' + tk.urun.s, cevap: c });
      return json({ ok: true, kaynak: 'havuz', id: 'toprak-kullan', tur: 'urun', cevap: c, urunler: [tk.urun.s] });
    }
  }
  // Ürün adı geçen ya da ürün sayfasında sorulan soru: ürün kartı / ürün kartındaki bilgiyle cevap
  if (body.on !== 1 && !SIPARIS.test(nq0) && !SATIN.test(nq0)) {
    // Saksı litre sorusu ("30 cm saksıya kaç litre") ürün kartına gitmez; litre hesabı cevaplar
    const litreSoru = !!litreHesap(qOrj);
    const adla0 = litreSoru ? null : urunAdla(nq0, prods, bitkilerHepsi(qOrj).length > 0), sp = sayfa && !litreSoru ? prods.find((p) => p.s === sayfa) : null;
    // Ürün sayfasında soruda başka ürünün adı açıkça geçmiyorsa (en az iki ayırt edici kelime) sayfadaki ürün esas alınır
    const adla = adla0 && (!sp || adla0.__ayirt >= 2) ? adla0 : null, pu = adla || sp;
    // Ürünün elle yazılmış kullanım cevabı varsa (HasTürk ürünleri) o cevap verilir; ürün kartı yolu yalnız onu olmayanlarda
    const elYazi = pu && havuz().some((e) => e.t === 'urun' && e.p === geri(pu.s) && !/Ürün bilgisine göre/.test(e.c));
    if (pu && URUN_VAR.test(nq0) && !URUN_KULLAN.test(nq0) && kel <= 16) {
      const oz = urunOzet(geri(pu.s)), ad = String(pu.n).trim();
      const c = pu.st ? `${/fiyat|ucret|kac (tl|lira|para)/.test(nq0) && !/var mi|bulabil|bulunur/.test(nq0) ? ad + ':' : 'Evet, ' + ad + ' ürünümüz var.'}${oz ? ' ' + oz : ''} Güncel fiyatı ve boy seçenekleri aşağıdaki ürün kartında; kartta boyu seçip "Sepete Ekle"ye dokunabilirsiniz.`
        : `${ad} şu an stokta görünmüyor. Ne zaman geleceğini müşteri hizmetlerimizden öğrenebilirsiniz: ${TEL} (telefon ve WhatsApp).${oz ? ' ' + oz : ''}`;
      kayitYaz({ kaynak: 'havuz', havuz: 'urun-var:' + pu.s, cevap: c });
      return json({ ok: true, kaynak: 'havuz', id: 'urun-var', tur: 'urun', cevap: c, urunler: [pu.s] });
    }
    const kullan = URUN_KULLAN.test(nq0) || (sp && !adla && kel <= 14 && SORU_VAR.test(nq0) && !bitkilerHepsi(qOrj).length);
    if (pu && kullan && !elYazi && URUN_KART[geri(pu.s)] && aiKey && env.AK_AI !== 'off') {
      let used = 0;
      if (db) { const r0 = await db.prepare('INSERT INTO ak_gun (d, n) VALUES (?, 1) ON CONFLICT (d) DO UPDATE SET n = n + 1 RETURNING n').bind(today()).first().catch(() => null); used = r0 ? r0.n : 0; }
      if (used <= (Number(env.AK_DAILY_LIMIT) || DAILY_LIMIT)) {
        const he = havuz().find((e) => e.t === 'urun' && e.p === geri(pu.s));
        const ek = he ? esle(he.u).map((x) => prods.find((p) => p.s === x)).filter((p) => p && p.st && p.s !== pu.s) : [];
        const c = { facts: [`${String(pu.n).trim()} — ürün kartındaki bilgi (doğrulanmış):\n${URUN_KART[geri(pu.s)]}`], list: [pu, ...ek].slice(0, 6) };
        let r = null; try { r = await askClaude(env, aiKey, name, qOrj, c, pageName || String(pu.n).trim(), sohbetOzeti(gecmis)); } catch (e) { r = null; }
        if (r && r.cevap && r.emin && r.durum === 'cevap') {
          kayitYaz({ kaynak: 'ai', havuz: 'urun-kart:' + pu.s, cevap: r.cevap });
          return json({ ok: true, kaynak: 'ai', cevap: r.cevap, urunler: r.urunler && r.urunler.length ? r.urunler : [pu.s] });
        }
      }
    }
    // Yapay zekâya ulaşılamadıysa kullanım sorusu ürün kartındaki kullanım satırlarıyla cevaplanır (bitkinin genel kartı verilmez)
    if (pu && !elYazi && /kullan|uygula|karist|doz|ne kadar|kac (litre|kg|gram|olcu)|ne zaman/.test(nq0) && kullanimSatir(geri(pu.s))) {
      const c = `${String(pu.n).trim()} — ürün kartındaki bilgiye göre:\n${kullanimSatir(geri(pu.s))}\n\nAklınıza takılan bir nokta olursa müşteri hizmetlerimiz: ${TEL} (telefon ve WhatsApp).`;
      kayitYaz({ kaynak: 'havuz', havuz: 'urun-kullanim:' + pu.s, cevap: c });
      return json({ ok: true, kaynak: 'havuz', id: 'urun-kullanim', tur: 'urun', cevap: c, urunler: [pu.s] });
    }
  }
  // Ürün almak isteyen ("bu üründen istiyorum", "4 adet 40 lt almak istiyorum"): ürünün kartı ve sepete ekleme yolu; müşteri
  // hizmetlerine gönderilmez. Ürün: bulunduğu sayfa, yoksa son önerilen ürün, yoksa mesajda adı geçen ürün; hiçbiri yoksa sorulur.
  const nq = norm(qOrj), adetM = /(\d+|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on) (adet|tane|cuval|paket|kutu|bidon)/.exec(nq), boyM = /(\d+[.,]?\d*) ?(lt|litre|l|kg|gr|g|ml|cm)\b/.exec(nq);
  const satinIstek = body.on !== 1 && !SIPARIS.test(nq) && ((sayfa && pageName && /\b(istiyorum|isterim)\b/.test(nq) && nq.split(' ').length <= 8) || SATIN.test(nq)) && nq.split(' ').length <= 16 && !bitkilerHepsi(qOrj).length;
  if (satinIstek) {
    const al = !(sayfa && pageName) && aileListe(nq.replace(SATIN, ' ').replace(/\s+/g, ' ').trim(), prods);
    if (al) { kayitYaz({ kaynak: 'havuz', havuz: al.i, cevap: al.c }); return json({ ok: true, kaynak: 'havuz', id: al.i, tur: 'liste', cevap: al.c, urunler: al.u, ara: al.ara, n: al.n }); }
    const ph = poolAnswer(qOrj).hit;
    // Mesajda adı geçen ürün: ürün adlarıyla en çok ortak kelimesi olan (stokta), eşitlikte kısa ad
    const qt = toks(qOrj).filter((t) => t.length >= 4 && !/^(alma|almak|isti|adet|tane|cuval|paket|kutu|bidon|litre|siparis|sepet)/.test(t));
    const adla = qt.length ? prods.filter((p) => p.st).map((p) => ({ p, h: toks(p.n).filter((t) => qt.includes(t)).length })).filter((x) => x.h >= Math.min(2, qt.length))
      .sort((a, b) => b.h - a.h || a.p.n.length - b.p.n.length)[0] : null;
    const urun = (sayfa && pageName) ? sayfa : sonUrun[0] || (ph && /^(urun|pompa|saksi)$/.test(ph.e.t) && ph.sc >= 0.8 && ph.e.p ? esle([ph.e.p])[0] : null) || (adla ? adla.p.s : null);
    const ad = urun ? String((prods.find((x) => x.s === urun) || {}).n || '').trim() : '';
    const secim = [boyM ? `${boyM[1]} ${boyM[2] === 'l' ? 'lt' : boyM[2]} seçeneğini seçin` : 'istediğiniz boyu ya da seçeneği seçin', adetM ? `adedi ${adetM[1]} yapın` : null].filter(Boolean).join(', ');
    const c = ad ? `${ad} için ürün kartında ${secim} ve "Sepete Ekle"ye dokunun; aşağıdaki karttan da ekleyebilirsiniz. Sepette adedi değiştirebilir, siparişinizi tamamlayabilirsiniz. Toplu alım için müşteri hizmetlerimiz: ${TEL}.`
      : `Hangi ürünü almak istiyorsunuz? Ürünün adını yazın (ör. "${boyM ? boyM[1] + ' ' + (boyM[2] === 'l' ? 'lt' : boyM[2]) + ' ' : ''}torf" ya da "solucan gübresi"); kartını göstereyim. Kartta ${secim}, ardından "Sepete Ekle"ye dokunmanız yeterli.`;
    kayitYaz({ kaynak: 'havuz', havuz: 'satin-al', cevap: c });
    return json({ ok: true, kaynak: 'havuz', id: 'satin-al', tur: 'urun', cevap: c, urunler: urun ? [urun] : [] });
  }
  // Mağazanın yeri / merkezi
  if (body.on !== 1 && KONUM.test(nq) && nq.split(' ').length <= 10 && !bitkilerHepsi(qOrj).length && !/\b(bitki|cicek|toprak|gubre|tohum|saksi)\w*\b/.test(nq)) {
    const c = `Fabrikamız İstanbul Çatalca'da: ${FABRIKA}. Bayimiz ya da şubemiz yok; ürünlerimizi internet sitemizden satıyor, kargoyla Türkiye'nin her yerine gönderiyoruz. Siparişiniz aynı gün kargoya verilir, bölgenize göre ertesi gün ya da 2–3 gün içinde teslim edilir. Fabrikadan teslim almak isterseniz önceden müşteri hizmetlerimizi arayın: ${TEL} (telefon ve WhatsApp).`;
    kayitYaz({ kaynak: 'havuz', havuz: 'konum', cevap: c });
    return json({ ok: true, kaynak: 'havuz', id: 'konum', tur: 'magaza', cevap: c, urunler: [] });
  }
  // Mağazamızda olmayan kompoze gübre ("14-14-17 … nasıl kullanılır"): etiket talimatı + çim/bahçe için kendi seçeneklerimiz
  if (body.on !== 1 && /\b\d{1,2}\s*-\s*\d{1,2}\s*-\s*\d{1,2}\b/.test(qOrj) && /gubre|kullan|doz|miktar/.test(norm(qOrj))
    && !prods.some((p) => p.st > 0 && (qOrj.match(/\d{1,2}\s*-\s*\d{1,2}\s*-\s*\d{1,2}/) || [''])[0].replace(/\s/g, '') && String(p.n).replace(/\s/g, '').includes((qOrj.match(/\d{1,2}\s*-\s*\d{1,2}\s*-\s*\d{1,2}/) || [''])[0].replace(/\s/g, '')))) {
    const e = havuz().find((x) => (x.s || []).includes('kompoze gübre nasıl kullanılır'));
    if (e) { kayitYaz({ kaynak: 'havuz', havuz: e.i, cevap: e.c }); return json({ ok: true, kaynak: 'havuz', id: e.i, tur: e.t, cevap: e.c, urunler: esle(e.u).filter((sl) => (prods.find((x) => x.s === sl) || {}).st) }); }
  }
  // Düzeltme ("limon değil mandalina"): düzeltilmiş soru baştan cevaplanır
  if (!ic && y && norm(qOrj).split(' ').length < 12) { const dz = duzeltme(qOrj, gecmis); if (dz) return handle(req, env, ctx, { aiKey, originOk, products, formul }, { body: { ...body, q: dz }, o: qKayit }); }
  // Yardımcı model (soruyu netleştirme): açık mı, günlük sınır, bir istekte en çok bir kez
  const yorumAcik = !!aiKey && env.AK_AI !== 'off' && env.AK_YORUM !== 'off' && body.on !== 1 && !ic;
  let yorumYapildi = false;
  const netlestir = async () => {
    if (!yorumAcik || yorumYapildi) return null;
    yorumYapildi = true;
    if (db) {
      const r = await db.prepare('INSERT INTO ak_gun (d, n) VALUES (?, 1) ON CONFLICT (d) DO UPDATE SET n = n + 1 RETURNING n').bind(today() + '-y').first().catch(() => null);
      if (r && r.n > (Number(env.AK_YORUM_LIMIT) || 3000)) return null;
    }
    const urunAd = sonUrun.map((sl) => String((prods.find((x) => x.s === sl) || {}).n || '').trim()).filter(Boolean);
    const sb = String(body.sc || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const rw = await yorumYZ(env, aiKey, qOrj, gecmis, urunAd, sb).catch(() => null);
    if (!rw) return null;
    if ((rw.niyet === 'konu_disi' && bitkilerHepsi(qOrj).length) || (rw.niyet === 'siparis' && SATIN.test(norm(qOrj)))) rw.niyet = 'soru';
    if (rw.niyet !== 'soru') { const c = niyetCevap(rw.niyet, name); kayitYaz({ kaynak: c.kaynak, havuz: 'yorum-niyet:' + rw.niyet, cevap: c.cevap }); return json(c); }
    if (norm(rw.mesaj) === norm(qOrj)) return null;
    // Netleşmiş soru baştan, aynı akışla cevaplanır (sohbet ve son önerilen ürünler korunur)
    return handle(req, env, ctx, { aiKey, originOk, products, formul }, { body: { ...body, q: rw.mesaj }, o: qKayit });
  };
  // Önceki mesaja bağlı soru: mesajda bitki yoksa (ve açık bir ürün sorusu değilse) ya da düzeltme / gönderme varsa
  if (yorumAcik && gecmis.length && y && !BASKA.test(norm(qOrj))) {
    const n = norm(qOrj), uh = poolAnswer(qOrj).hit;
    const urunNet = uh && /^(urun|pompa|saksi|pompa-genel|magaza|tohum|tohum-ay)$/.test(uh.e.t) && uh.sc >= 0.95 && !GONDERME.test(n);
    if (!urunNet && (GONDERME.test(n) || !bitkilerHepsi(qOrj).length)) { const r = await netlestir(); if (r) return r; }
  }
  // Veritabanının ana kopyası uzakta (ABD) olabilir: hazır cevap onu beklemeden verilir. Önce havuz + bellekteki onaylı
  // cevaplarla bakılır; bulunamazsa veritabanı beklenip onaylı liste tazelenerek tekrar bakılır.
  const tryPool = (extra) => {
    let { hit, near } = poolAnswer(q, { extra, product: page, productName: pageName });
    // Ürün sayfasında "nasıl kullanılır / ne işe yarar / dozu / özellikleri" gibi sorular o ürünün havuz cevabından gelir
    // (soru ürün adını tam içermese de; Claude'a gidip para harcamasın)
    if (!hit && page && /kullan|işe yar|ise yar|nedir|özellik|ozellik|doz|miktar|nasıl|nasil|kaç litre|kac litre|ölçü|olcu|ekilir/i.test(q)) {
      const pe = havuz().find((e) => e.p === page && (e.t === 'urun' || e.t === 'saksi' || e.t === 'pompa'));
      if (pe && !toks(q).some((t) => t.length >= 4 && !toks(pageName + ' nasıl kullanılır ne işe yarar nedir özellikleri dozu kullanım miktarı kaç litre ölçüleri ne zaman ekilir bu ürün urun').includes(t) && (IDX && IDX.idf.get(t) || 0) > 6)) hit = { e: pe, sc: 0.75 };
    }
    return { hit, near };
  };
  // Odunluk kapasitesi ("odunluk kaç ster alır", "5 ster odun için hangi odunluk"): ürün kartlarındaki ster bilgisinden
  const nqq = norm(q);
  if (body.on !== 1 && /\bster\b/.test(nqq) && /odun/.test(nqq)) {
    const kap = havuz().filter((e) => e.t === 'urun' && /odunluk/.test(e.p || '')).map((e) => ({ s: esle([e.p])[0], n: e.c.split(' — ')[0], ster: parseFloat(((e.c.match(/(\d+(?:,\d+)?) ster/) || [])[1] || '').replace(',', '.')) }))
      .filter((x) => x.ster && (prods.find((p) => p.s === x.s) || {}).st > 0).sort((a, b) => a.ster - b.ster || a.n.localeCompare(b.n, 'tr'));
    if (kap.length) {
      const m = nqq.match(/\b(\d+)(?: (\d))? ster/), ist = m ? parseFloat(m[1] + (m[2] ? '.' + m[2] : '')) : 0;
      const sy = (x) => String(x).replace('.', ','), satir = kap.map((x) => `• ${x.n}: ${sy(x.ster)} ster`).join('\n');
      const uy = kap.filter((x) => x.ster >= ist), sec = uy.length ? uy.filter((x) => x.ster === uy[0].ster) : [];
      let c, u = kap.map((x) => x.s);
      if (ist && sec.length) { c = `${sy(ist)} ster odun için ${sy(sec[0].ster)} ster alan ${sec.length > 1 ? 'şu modellerimiz' : 'modelimiz'} yeterli: ${sec.map((x) => x.n).join(' ya da ')}.\n\nOdunluklarımızın alabildiği istif odun (ürün bilgisine göre):\n${satir}`; u = [...sec.map((x) => x.s), ...u]; }
      else if (ist) { const en = kap[kap.length - 1]; c = `En büyük odunluğumuz (${en.n}) ${sy(en.ster)} ster alır; ${sy(ist)} ster için birden fazla odunluk gerekir. Toplu alımda müşteri hizmetlerimiz yardımcı olur: ${TEL}.\n\nOdunluklarımızın alabildiği istif odun (ürün bilgisine göre):\n${satir}`; u = [en.s, ...u]; }
      else c = `Odunluklarımızın alabildiği istif odun (ürün bilgisine göre):\n${satir}\n\nKaç ster odun koyacağınızı yazarsanız uygun ölçüyü söyleyeyim.`;
      kayitYaz({ kaynak: 'havuz', havuz: 'odunluk-ster', cevap: c });
      return json({ ok: true, kaynak: 'havuz', id: 'odunluk-ster', tur: 'liste', cevap: c, urunler: [...new Set(u)].slice(0, 3) });
    }
  }
  const ce = (body.on !== 1 && aileListe(nqq, prods)) || cesitAnswer(q, prods);
  if (ce) {
    if (body.on !== 1 && db && req.headers.get('x-ak-test') !== '1') ctx.waitUntil(ready.then(() => db.prepare('INSERT INTO ak_soru (ts, q, qn, kaynak, havuz, cevap, site, sayfa, onceki) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(new Date().toISOString(), qKayit, norm(qKayit), 'havuz', 'liste', String(ce.c || '').slice(0, 1500), site, sayfa, onceki).run()).catch(() => {}));
    return json({ ok: true, kaynak: 'havuz', id: ce.i, tur: 'liste', cevap: ce.c, urunler: ce.u, ara: ce.ara, n: ce.n });
  }
  let { hit, near } = tryPool(APPROVED.t ? APPROVED.list : []);
  // Uzun, dağınık anlatılmış mesaj (40+ kelime): tek bir hazır kartla değil, bütün mesaja yapay zekâ cevap verir
  const uzunMsj = norm(qOrj).split(' ').length > 40;
  if (uzunMsj) hit = null;
  let coklu = null;
  const hazir = (e, cevap, tur, u = []) => {
    if (db && req.headers.get('x-ak-test') !== '1') ctx.waitUntil(ready.then(() => db.prepare('INSERT INTO ak_soru (ts, q, qn, kaynak, havuz, cevap, site, sayfa, onceki) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(new Date().toISOString(), qKayit, norm(qKayit), 'havuz', e, String(cevap).slice(0, 1500), site, sayfa, onceki).run()).catch(() => {}));
    return json({ ok: true, kaynak: 'havuz', id: e, tur, cevap, urunler: u });
  };
  if (y && sonUrun.length && !(y.bitki && !y.takip) && /\b(bunu|bunlari|bunlar|bu urun\w*|o urun\w*|onu|onlari|ikisini|ikisi|hepsini|birlikte|bu gubre\w*|bu ilac\w*|bu sprey\w*)\b/.test(norm(qOrj))
    && /kullan|uygula|ne kadar|doz|miktar|karistir|nasil ver|kac (ml|gram|kasik|litre)|ne zaman (ver|kullan|at|uygula)|nasil at/.test(norm(qOrj))) {
    // "bunu nasıl kullanırım": son cevapta önerilen ürün(ler)in kullanım cevabı; "ikisini / hepsini / birlikte" ise hepsi
    const hepsi = /\b(ikisini|ikisi|hepsini|bunlari|bunlar|onlari|birlikte)\b/.test(norm(qOrj));
    const ku = (hepsi ? sonUrun : sonUrun.slice(0, 1)).map((sl) => havuz().find((e) => e.p === geri(sl) && e.t === 'urun')).filter(Boolean);
    if (ku.length) {
      const cevap = ku.map((e) => e.c).join('\n\n');
      return hazir(ku.map((e) => e.i).join('+'), cevap, 'urun');
    }
  }
  if (y && BASKA.test(norm(qOrj))) {
    // "Peki başka ne önerirsin": konu ve bitki bu mesajdan ya da sohbetten; daha önce önerilenler dışındaki ürünler
    // Konu: bu mesajdan; yoksa geriye doğru, en son bitki anılan mesaja kadar (o bitki için konuşulan dert)
    const kb = (x) => { const v = konuBul(gunluk(norm(x))); return v === 'hasta' || v === 'litre' ? null : v; };
    let k = kb(qOrj), pl0 = bitkilerHepsi(qOrj)[0] || null;
    for (let i = gecmis.length - 1; i >= 0 && !(k && pl0); i--) {
      if (!k) k = kb(gecmis[i]);
      const b = bitkilerHepsi(gecmis[i])[0];
      if (b && !pl0) { pl0 = b; if (!k) break; }
    }
    const pl = pl0 || y.bitki, lc = (x) => x.toLocaleLowerCase('tr-TR'), K = k && KONULAR.find((x) => x[0] === k);
    if (pl || K) {
      const ents = [], al = (x) => { const r = x && poolAnswer(x, { product: page, productName: pageName }).hit; return r ? r.e : null; };
      if (pl && K && K[2]) { const e = al(K[2](lc(pl))); if (e && bitkiKarti(e, pl) && konuUyar(e, k)) ents.push(e); }
      if (GENEL_BELIRTI[k]) { const e = al(GENEL_BELIRTI[k]); if (e) ents.push(e); }
      if (pl) {
        const b = bitkiEsle(norm(pl)), gr = norm((b || {}).grup || '');
        let e = al(`${lc(pl)} hangi gübre`);
        if (!(e && bitkiKarti(e, pl))) e = al(/sebze/.test(gr) ? 'sebze bahçesine hangi gübre' : /meyve|bahce/.test(gr) ? 'meyve ağaçlarına hangi gübre' : 'saksı çiçeklerine hangi gübre');
        if (b && b.e) ents.push({ ...b.e, c: b.e.u.map((sl) => `• ${String((prods.find((x) => x.s === esle([sl])[0]) || {}).n || '').trim()} — saksı değişiminde: ${pl} için hazırlanmış hazır toprak.`).join('\n') });
        if (e) ents.push({ ...e, u: e.u.slice(0, 2) }); // gübre cevabının ana iki ürünü (set ve çiçekli bitki besini değil)
      }
      const once = new Set(sonUrun), yeni = [];
      ents.map(sx).forEach((e) => e.u.forEach((sl) => { if (!once.has(sl) && !yeni.includes(sl) && (prods.find((x) => x.s === sl) || {}).st) yeni.push(sl); }));
      const satir = yeni.slice(0, 3).map((sl) => {
        const ad = String((prods.find((x) => x.s === sl) || {}).n || '').trim();
        const hazirSatir = ents.map((e) => e.c.split('\n').find((l) => ad && (l.startsWith('• ' + ad + ' — ') || l.startsWith(ad + ' — ')))).find(Boolean);
        if (hazirSatir) return hazirSatir.startsWith('• ') ? hazirSatir : '• ' + hazirSatir;
        // Miktar tablosundaki "Ürün:" başlığının ilk satırı ("• Yeni dikimde …: fidan başına 1,5–2 kg")
        const doz = ents.map((e) => { const L = e.c.split('\n'), i = L.findIndex((l) => ad && l.trim() === ad + ':'); return i >= 0 && /^• /.test(L[i + 1] || '') ? L[i + 1].slice(2) : null; }).find(Boolean);
        return doz ? `• ${ad} — ${doz}` : `• ${ad}`;
      });
      const kim = [pl, K ? lc(KONU_AD[k] || k) : null].filter(Boolean).join(' — ');
      if (satir.length) return hazir('baska:' + (pl || '') + ':' + (k || ''), `${kim ? kim.charAt(0).toLocaleUpperCase('tr-TR') + kim.slice(1) + ' için ' : ''}önerdiklerimize ek olarak şunlar da işinize yarar:\n${satir.join('\n')}`, 'baska', yeni.slice(0, 3));
      if (ents.length) {
        const c0 = sx(ents[0]).c.split('\n'), ny = c0.findIndex((l) => /^Ne yapmalısınız:/.test(l)), adim = ny >= 0 ? (c0[ny + 1] || '').replace(/^• /, '') : '';
        return hazir('baska-yok:' + (k || ''), `${kim ? kim.charAt(0).toLocaleUpperCase('tr-TR') + kim.slice(1) + ' için ' : 'Bu konuda '}önerebileceğim ürünler bunlardı.` +
          (adim ? ` Asıl çözüm çoğu zaman bakımda: ${adim}.`.replace(/\.\.$/, '.') : '') + (pl ? '' : ' Bitkinizin adını yazarsanız ona özel toprak ve gübreyi de söyleyeyim.'), 'baska');
      }
    }
    // Bitki ve konu sohbetten çıkarılamadıysa (ya da uygun ürün bulunamadıysa) müşteri hizmetlerine göndermek yerine ne için öneri istediği sorulur
    return hazir('baska-sor', 'Hangi bitkiniz ya da hangi konu için öneri istersiniz? Örneğin "orkide için gübre", "domates için toprak" ya da "çime ne kullanayım" yazmanız yeterli; size uygun ürünleri hemen göstereyim.', 'baska');
  }
  if (y) {
    // "20 litrelik saksıya kaç litre toprak": saksı hacmi belli, çap sorulmaz
    const lv = litreHesap(qOrj);
    if (lv && lv.hacim && !toprakNiyet(qOrj)) return hazir('saksi-litre', lv.metin, 'saksi-hesap');
    // "2 tane 20 cm saksıya kaç litre toprak": bitki yoksa doğrudan saksı hesabı
    if (lv && lv.cap && !bitkilerHepsi(qOrj).length) return hazir('saksi-litre', lv.metin, 'saksi-hesap');
    // Kendini / bitkisini tanıtan, soru sormayan mesaj ("balkonda monstera ve limon ağacım var"): karşılayıp ne istediği sorulur
    if (!hit && y.bitki && !y.konu && !y.takip && !/\?|\b(ne|nasil|neden|hangi|kac|mi|mu|misin|musun)\b/.test(norm(qOrj))
      && /\b(var\w*|aldim|aldik|aldi|diktim|ektim|ektik|yetistiriyorum|bakiyorum|sahibiyim|hediye\w*|getirdim)\b/.test(norm(qOrj))) {
      const bl = bitkilerHepsi(qOrj), ad = bl.length ? (bl.length > 1 ? bl.slice(0, -1).join(', ') + ' ve ' + bl[bl.length - 1] : bl[0]) : y.bitki;
      return hazir('tanisma', `${ad} için size yardımcı olayım. Ne öğrenmek istersiniz? Sulama, toprak, gübre, ışık ya da yapraklarda gördüğünüz bir sorun olabilir; yazmanız yeterli. Bu sohbette bitkilerinizi hatırlıyorum, tekrar yazmanıza gerek yok.`, 'tanisma');
    }
    // Yalnız bitki adı yazılmış ("Blue beriy", "yaban mersini"): ne öğrenmek istediği sorulur, bitkinin toprağı gösterilir
    if (!hit && y.bitki && !y.konu && !y.takip && !SORU_VAR.test(norm(qOrj)) && norm(qOrj).split(' ').length <= 4) {
      const b = bitkiEsle(norm(y.bitki)), tu = b && b.e ? esle(b.e.u).filter((sl) => (prods.find((x) => x.s === sl) || {}).st) : [];
      return hazir('bitki-adi', `${y.bitki} için size yardımcı olayım. Toprak, gübre, sulama, budama ya da yapraklarda gördüğünüz bir sorun olabilir; ne öğrenmek istediğinizi yazmanız yeterli.` + (tu.length ? ` ${y.bitki} için hazır toprağımız aşağıda.` : ''), 'tanisma', tu);
    }
    // Yalnız konu sözcüğü ("gübre", "çiçeğim hasta"), bitki belli değil: önce bitki sorulur
    if (y.belirsiz && !(hit && /^(urun|magaza|pompa)/.test(hit.e.t) && hit.sc >= 0.95)) return hazir('netlestir:' + y.konu, y.netlestir, 'netlestir');
    const btP = (e, p) => bitkiKarti(e, p);
    const ara = (x) => poolAnswer(x, { product: page, productName: pageName });
    // Birden çok bitki ("monstera ve limonum sararıyor") ya da bir mesajda birden çok konu ("nasıl sulanır, hangi gübre"):
    // her bitki × konu için ayrı cevap; aynı (genel) cevap tekrarlanmaz. Havuzda olmayanlar yapay zekâya sorulur.
    const P = bitkiSeti(qOrj, gecmis), n1 = gunluk(norm(qOrj));
    let T = konularHepsi(n1);
    if (!T.length && y.konu) T = [y.konu];
    const urunSoru = hit && /^(urun|pompa|saksi|magaza|kargo|siparis)/.test(hit.e.t) && hit.sc >= 0.9;
    const uzunMesaj = n1.split(' ').length > 40; // uzun dağınık anlatımda parça parça hazır cevap yerine bütün mesaja cevap
    if (!urunSoru && !uzunMesaj && T.length && (P.length >= 2 || (P.length === 1 && T.length >= 2))) {
      const lc = (x) => x.toLocaleLowerCase('tr-TR'), pt = P.flatMap((p) => norm(p).split(' ')).filter((t) => t.length >= 2);
      const plSiz = n1.split(' ').filter((w) => !pt.some((t) => w.startsWith(t)) && !/^(ve|ile|da|de|ta|te|ya|veya|bir|iki|uc|benim|bende|bizim)$/.test(w)).join(' ');
      const bol = new Map(), eksik = [], ve = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1] : a[0]);
      // Bir bitki × konu için havuz cevabı: önce bitkiye özel kayıt, yoksa yanıltmayan konularda grubun / konunun genel cevabı
      const bul = (p, k) => {
        if (k === 'toprak') { const b = bitkiEsle(norm(p)); return { r: b && b.e ? { e: b.e } : null, soru: `${lc(p)} toprağı` }; }
        const K = KONULAR.find((x) => x[0] === k), soru = K[2] ? K[2](lc(p)) : `${lc(p)} ${plSiz}`;
        let r = ara(soru).hit;
        if (r && K[2] && (!btP(r.e, p) || !konuUyar(r.e, k))) r = null;
        if (!r) {
          const gr = norm((bitkiEsle(norm(p)) || {}).grup || '');
          const genel = !K[2] ? plSiz : k === 'gubre' ? (/sebze/.test(gr) ? 'sebze bahçesine hangi gübre' : /meyve|bahce/.test(gr) ? 'meyve ağaçlarına hangi gübre' : /salon|cicek|sukulent|aromatik|asit/.test(gr) ? 'saksı çiçeklerine hangi gübre' : null)
            : GENEL_BELIRTI[k] || null;
          if (genel && genel.split(' ').length >= 2) r = ara(genel).hit;
        }
        return { r, soru, ozelsiz: !K[2] };
      };
      // Hangi dert hangi bitkinin: mesaj cümlelere bölünür; bir cümlede bitki ve konu birlikteyse o konu o bitkinindir
      // ("monsteranın yaprakları sararıyor, orkide çiçek açmıyor"); bitkisiz cümledeki konu ("hangi toprak", "kışın") hepsinin
      const cift = [], genelK = [], soruK = [];
      const ekle = (p, k, ozel) => { if (!cift.some((x) => x.p === p && x.k === k)) cift.push({ p, k, ozel }); };
      // Cümleler; bir cümlede virgülle ayrılmış birden çok dert varsa ("monstera sararıyor, limon döküyor") parçalara da bölünür.
      // Tek dertli cümlede virgül liste ayırır ("gül, lavanta ve domates için hangi gübre"): cümle bütün kalır
      const parcalar = qOrj.split(/[.!?;\n]+/).map((x) => x.trim()).filter(Boolean).flatMap((c) => {
        const v = c.split(',').map((x) => x.trim()).filter(Boolean);
        return v.filter((x) => konularHepsi(gunluk(norm(x))).length).length >= 2 ? v : [c];
      });
      if (parcalar.length > 1 && bitkilerHepsi(qOrj).length) {
        for (const c of parcalar) {
          const ks = konularHepsi(gunluk(norm(c)));
          if (!ks.length) continue;
          const ps = bitkilerHepsi(c).filter((x) => P.includes(x));
          if (ps.length) ps.forEach((x) => ks.forEach((k) => ekle(x, k, true)));
          else ks.forEach((k) => { if (!genelK.includes(k)) (SORU_CUMLE.test(norm(c)) ? soruK : genelK).push(k); });
        }
        genelK.unshift(...soruK.filter((k) => !genelK.includes(k))); // soru cümlesindeki konular ("kışın kalır mı?") önce
        genelK.forEach((k) => P.slice(0, 6).forEach((x) => ekle(x, k, false)));
        if (!cift.length) P.slice(0, 6).forEach((x) => T.slice(0, 3).forEach((k) => ekle(x, k, false)));
      } else P.slice(0, 6).forEach((x) => T.slice(0, 3).forEach((k) => ekle(x, k, false)));
      // Çok soru varsa (6'dan fazla bitki × konu): bitkiye özel dertler tam cevaplanır, ortak sorular (toprak, gübre, kış…)
      // her bitki için tek satırla özetlenir; cevap okunmayacak kadar uzamasın
      const kompakt = cift.length > 6;
      const tam = (kompakt ? cift.filter((x) => x.ozel) : cift).slice(0, 6);
      const ozetK = kompakt ? [...new Set(cift.filter((x) => !x.ozel).map((x) => x.k))] : [];
      for (const { p, k } of tam) {
        const { r, soru, ozelsiz } = bul(p, k);
        if (r) { const o = bol.get(r.e.i); if (o) { if (!o.adlar.includes(p)) o.adlar.push(p); } else bol.set(r.e.i, { e: r.e, adlar: [p], k }); }
        else if (ozelsiz) { if (!eksik.some((x) => x.soru === qOrj)) eksik.push({ p: ve(P), k, soru: qOrj }); }
        else eksik.push({ p, k, soru: soru.charAt(0).toLocaleUpperCase('tr-TR') + soru.slice(1) + '?' });
      }
      const ilk = (t, n) => (String(t).match(/[^.!?]+[.!?]+/g) || [String(t)]).slice(0, n).join(' ').replace(/\s+/g, ' ').trim();
      const urunAd = (u) => u.map((sl) => String((prods.find((x) => x.s === sl) || {}).n || '').trim()).filter(Boolean).slice(0, 2);
      const ozetler = [], ozetU = [];
      for (const k of ozetK.slice(0, 3)) {
        const sat = P.slice(0, 6).map((p) => {
          const { r, soru } = bul(p, k);
          if (!r) return `• ${p}: bunun için "${soru}" diye ayrıca sorabilirsiniz.`;
          const e = sx(r.e), ad = urunAd(e.u);
          e.u.slice(0, 2).forEach((x) => ozetU.push(x));
          if (k === 'toprak') return `• ${p}: ` + (ad.length ? `${ad.join(' / ')}.` : `ona özel hazır toprağımız yok; tarif için "${lc(p)} toprağı" yazın.`);
          if (e.t === 'bakim') return `• ${p}: ${ilk(e.c.split('\n').filter((l) => !/:\s*$/.test(l)).join(' '), 2)}`;
          return `• ${p}: ` + (ad.length ? `${ad.join(' ve ')} öneririz; miktarlar için "${soru}" yazın.` : `ayrıntı için "${soru}" yazın.`);
        });
        ozetler.push(`${KONU_AD[k] || k} — bitkilerinize göre:\n${sat.join('\n')}`);
      }
      if (ozetK.length > 3) { const kalan = ozetK.slice(3).map((k) => lc(KONU_AD[k] || k)).join(', '); ozetler.push(`${kalan.charAt(0).toLocaleUpperCase('tr-TR') + kalan.slice(1)} için de yazın; hemen cevaplayayım.`); }
      const parca = [], u = [], notlar = [], gorulen = new Set();
      for (const { e: e0, adlar, k } of bol.values()) {
        const e = sx(e0);
        const bas = norm(e.c).startsWith(norm(adlar[0])) && adlar.length === 1 ? '' : `${ve(adlar)} — ${lc(KONU_AD[k] || k)}:\n`;
        // Her bölümde tekrar eden not satırları ("Bu miktarlar genel öneridir", "1 dekar = …") sonda bir kez yazılır
        let c0 = e.c;
        if (k === 'toprak') { // Çoklu toprak cevabında karışım kartı tek tek açılmaz: ürün adı yazılır, tarif için bitkinin kendi sorusu önerilir
          const adl = e.u.map((sl) => (prods.find((x) => x.s === sl) || {}).n).filter(Boolean);
          c0 = c0.replace(/ Size uygun toprağımız aşağıda\./, adl.length ? ` Uygun toprağımız: ${adl.join(' / ')}.` : '')
            .replace(/ Ona özel hazır toprağımız yok;[^.]*\./, ` Ona özel hazır toprağımız yok; en yakın hazır toprağı ve kendi karışımınızın tarifini görmek için "${lc(adlar[0])} toprağı" yazmanız yeterli.`);
        }
        const c = c0.split('\n').filter((l) => { if (/^(Bu miktarlar genel öneridir|\(1 dekar)/.test(l.trim())) { if (!notlar.includes(l.trim())) notlar.push(l.trim()); return false; } return true; }).join('\n');
        // Aynı ürün önerisi (ve "Birlikte" satırı) önceki bölümde yazıldıysa tekrarlanmaz
        const c2 = c.split('\n').filter((l) => { const m = /^(• [^—]{3,80} — |Birlikte: )/.exec(l); if (!m) return true; const key = m[1] === 'Birlikte: ' ? l : m[1]; if (gorulen.has(key)) return false; gorulen.add(key); return true; })
          .join('\n').replace(/\n\nÖnerimiz:(?=\n\n|\s*$)/, '');
        parca.push((bas + c2).replace(/\n{3,}/g, '\n\n').trim());
        e.u.forEach((s) => { if (!u.includes(s)) u.push(s); });
      }
      parca.push(...ozetler);
      ozetU.forEach((x) => { if (!u.includes(x)) u.push(x); });
      if (notlar.length) parca.push(notlar.join('\n'));
      const lv = T.includes('toprak') ? litreHesap(qOrj) : null;
      if (lv) parca.unshift(lv.metin);
      if (P.length > 6) parca.push('Diğer bitkileriniz için ayrıca yazabilirsiniz; bu sohbette hepsini hatırlıyorum.');
      if (!eksik.length && (bol.size || ozetler.length)) return hazir('coklu:' + [...bol.keys()].join('+'), parca.join('\n\n'), 'coklu', u.slice(0, 6));
      if (eksik.length) {
        coklu = { metin: parca.join('\n\n'), u: u.slice(0, 6), eksik, ids: [...bol.keys()] };
        q = eksik.map((x) => x.soru).join(' ');
        near = eksik.flatMap((x) => ara(x.soru).near.slice(0, 2)).sort((a, b) => b.sc - a.sc);
        hit = null;
      }
    }
    // Bitki + konu: dağınık yazılmış soru havuzun anladığı net soruyla da denenir; bitkiye özel cevap genel cevaba üstün
    const bt = (e) => btP(e, y.bitki) && konuUyar(e, y.konu);
    if (!coklu && hit && y.bitki && !konuUyar(hit.e, y.konu)) hit = null;
    if (!coklu) {
    if (y.bitki ? (!hit || !bt(hit.e)) : (y.q2 && y.q2 !== q && !hit)) {
      let r2 = y.q2 && y.q2 !== q ? ara(y.q2) : { hit: null };
      if (r2.hit && !konuUyar(r2.hit.e, y.konu)) r2 = { hit: null }; // başka konunun kartı: genel cevaba geçilir
      // Bitkiye özel kayıt yoksa grubun / konunun genel cevabı — yalnız genel cevabın yanıltmadığı konularda
      // (budama, çoğaltma, dikim, ışık, sulama bitkiye göre çok değişir: onlar yapay zekâya kalır)
      if (!r2.hit && !hit && y.bitki) {
        const gr = norm(y.grup || '');
        const genel = y.konu === 'gubre' ? (/sebze/.test(gr) ? 'sebze bahçesine hangi gübre' : /meyve|bahce/.test(gr) ? 'meyve ağaçlarına hangi gübre' : /salon|cicek|sukulent|aromatik|asit/.test(gr) ? 'saksı çiçeklerine hangi gübre' : null)
          : GENEL_BELIRTI[y.konu] || null;
        if (genel && genel.split(' ').length >= 2) r2 = ara(genel);
      }
      if (r2.hit && !konuUyar(r2.hit.e, y.konu)) r2 = { hit: null };
      if (r2.hit && (!hit || bt(r2.hit.e) || !y.bitki)) { hit = r2.hit; near = r2.near; }
    }
    // Bitkisi yazılmamış belirti ("bitkim yaprak döküyor"): belirtinin genel cevabı
    if (!hit && !y.bitki && BELIRTI.test(y.konu || '')) {
      const r3 = ara(GENEL_BELIRTI[y.konu]);
      if (r3.hit) { hit = r3.hit; near = r3.near; }
    }
    }
  }
  // Bitkiye toprak sorusu (yazım hatası, "hazırlar mısın" gibi karışım isteği dahil): bitkinin toprak kartı
  // "Toprağa perlit karıştırmam gerekir mi": bileşen sorusu, karışım siparişi ya da toprak kartı değil (hazır cevap / yapay zekâ)
  if (uzunMsj && !coklu) hit = null; // uzun mesaja tek hazır kart verilmez
  const bilesenSoru = /\b(perlit|torf|cocopeat|kokopit|vermikulit|pomza|kum|solucan|leonardit|kil topu|kil bilye)\w*\b/.test(norm(q)) && SORU_VAR.test(norm(q));
  const tn = bilesenSoru ? null : toprakNiyet(q);
  if (bilesenSoru && hit && hit.e.t === 'bitki-toprak') hit = null;
  if (!coklu && !uzunMsj && tn && (tn.kendim || !hit || hit.e.t === 'bitki-toprak' || (/^saksi/.test(hit.e.t) && litreHesap(q))) && body.on !== 1) {
    const e = tn.e, ad = e.b.split(',')[0].trim();
    const lh = litreHesap(q), metin = tn.kendim && KARISIM_ACIK ? `${ad} için karışımınızı hazırladım; tarif ve fiyatı aşağıda. "Bu tarifle hazırlat"a dokunursanız bileşenler tek seferde sepete eklenir; litreyi değiştirebilirsiniz.` : tn.kendim ? `${KARISIM_YOK}\n\n${e.c}` : e.c;
    if (db && req.headers.get('x-ak-test') !== '1') ctx.waitUntil(ready.then(() => db.prepare('INSERT INTO ak_soru (ts, q, qn, kaynak, havuz, cevap, site, sayfa, onceki) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(new Date().toISOString(), qKayit, norm(qKayit), 'havuz', e.i, ((lh ? lh.metin + '\n\n' : '') + metin + ` [${ad} toprak kartı]`).slice(0, 1500), site, sayfa, onceki).run()).catch(() => {}));
    return json({ ok: true, kaynak: 'havuz', id: e.i, tur: e.t, dinamik: 'toprak', bitki: e.b, kendim: tn.kendim && KARISIM_ACIK, urunler: esle(e.u), ...(lh && lh.litre ? { litre: lh.litre } : {}), ...(lh ? { saksi: { adet: lh.adet, cap: lh.cap || '' } } : {}),
      cevap: lh ? `${lh.metin}\n\n${metin}` : metin });
  }
  // Önden yükleme (on: 1): Bilge Bey'in öneri düğmelerinin cevabı müşteri dokunmadan arkada alınır. Yalnız hazır havuz;
  // Claude'a gidilmez, veritabanı beklenmez, kayda geçmez (müşteri dokununca asıl istek ayrıca gelir ve sayılır).
  if (body.on === 1) {
    if (!hit) return json({ ok: false, why: 'yok' });
    const e = sx(hit.e);
    return json({ ok: true, kaynak: 'havuz', id: e.i, tur: e.t, cevap: e.c, urunler: e.u, dinamik: e.d || null, bitki: e.b || null });
  }
  if (!hit && !coklu && db) {
    await ready;
    const extra = await approved(db).catch(() => []);
    if (extra.length) ({ hit, near } = tryPool(extra));
  } else if (db && Date.now() - APPROVED.t >= 300000) ctx.waitUntil(ready.then(() => approved(db)).catch(() => {}));
  // Canlı kontrol testleri (X-Ak-Test: 1) kayda geçmez: sayaç ve 'en çok sorulanlar' gerçek müşterileri göstersin
  const test = req.headers.get('x-ak-test') === '1';
  const log = (o) => db && !test && ctx.waitUntil(ready.then(() => db.prepare('INSERT INTO ak_soru (ts, q, qn, kaynak, havuz, skor, cevap, urunler, durum, site, sayfa, giris, cikis, onceki) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(new Date().toISOString(), qKayit, norm(qKayit), o.kaynak, o.havuz || null, o.skor ?? null, o.cevap || null, JSON.stringify(o.urunler || []), o.durum || null, site, sayfa, o.giris ?? null, o.cikis ?? null, onceki).run()).catch(() => {}));

  // Denetimde bu soruya yanlış bulunmuş hazır cevap verilmez (yapay zekâya bırakılır)
  if (hit && db && !test) {
    const E = await ready.then(() => engeller(db)).catch(() => null);
    if (E && E.has(norm(qKayit) + '|' + hit.e.i)) hit = null;
  }
  if (hit) {
    let e = sx(hit.e);
    if (y && y.bitki && /^(gubre|toprak)$/.test(y.konu || '') && e.t === 'blog' && !(e.u || []).length) {
      const gr = norm(y.grup || ''), ekU = [];
      let ek = '';
      if (y.konu === 'gubre') {
        const gq = /sebze/.test(gr) ? 'sebze bahçesine hangi gübre' : /meyve|bahce/.test(gr) ? 'meyve ağaçlarına hangi gübre' : 'saksı çiçeklerine hangi gübre';
        const g = poolAnswer(gq).hit;
        if (g) { const ge = sx(g.e); ek = ge.c.replace(/^(Saksı çiçekleriniz|Sebze bahçeniz|Meyve ağaçlarınız) için/, `${y.bitki} için`); ekU.push(...ge.u.slice(0, 2)); }
      }
      const b = bitkiEsle(norm(y.bitki));
      if (b && b.e) {
        const tu = esle(b.e.u).filter((sl) => (prods.find((x) => x.s === sl) || {}).st);
        if (tu.length) { ek += `${ek ? '\n\n' : ''}${y.bitki} için toprak: ${tu.map((sl) => String((prods.find((x) => x.s === sl) || {}).n || '').trim()).join(' / ')}.`; ekU.unshift(...tu); }
      }
      if (ek) e = { ...e, t: 'bitki-doz', c: `${e.c}\n\nÖnerimiz:\n${ek}`, u: [...new Set(ekU)].slice(0, 4) };
    }
    // Bitkiye özel kartı olmayan dertte genel cevap verildi: hangi bitki için olduğu başa yazılır ("Domates — yaprak sararması:")
    if (y && y.bitki && y.konu && ((e.t === 'sorun' && (BELIRTI.test(y.konu) || y.konu === 'zararli')) || (e.t === 'gubre-genel' && y.konu === 'gubre')) && !bitkiKarti(e, y.bitki) && !norm(e.c.split('\n')[0]).includes(norm(y.bitki)))
      e = { ...e, c: `${y.bitki} — ${(KONU_AD[y.konu] || 'sorun').toLocaleLowerCase('tr-TR')}:\n${e.c}` };
    // "Solucan gübresi de alayım bunun için": müşterinin andığı ürün cevapta varsa önce onaylanır
    if (y && y.bitki && /^(gubre-genel|bitki-doz)$/.test(e.t) && /\b(alay\w*|aliyim|alirim|alacag\w*|alsam|alabilir\w*|alirsam|kullan\w*|olur mu|uygun mu|verebilir\w*|vereyim|yarar mi)\b/.test(norm(qOrj))) {
      const qn = norm(qOrj), ad = e.c.split('\n').map((l) => (/^(?:• )?([A-ZÇĞİÖŞÜ][^—:\n]{3,60}?)(?: — |:$)/.exec(l) || [])[1]).filter(Boolean)
        .find((n) => norm(n).split(' ').some((w) => w.length >= 5 && !/^(hasturk|gubresi|florist|bitki\w*|cicek\w*|ozel|konsantre)$/.test(w) && qn.includes(w)));
      if (ad) e = { ...e, c: `Evet, ${ad.trim()} ${y.bitki} için uygundur; kullanım miktarları aşağıda.\n\n${e.c}` };
    }
    log({ kaynak: 'havuz', havuz: hit.e.i, skor: hit.sc, cevap: String(e.c || '').slice(0, 1500) });
    return json({ ok: true, kaynak: 'havuz', id: e.i, tur: e.t, cevap: e.c, urunler: e.u, dinamik: e.d || null, bitki: e.b || null });
  }
  // Listede olmayan bitkiye toprak sorusu: yapay zekâ bitkiyi tanıyıp toprak profilini verir, widget bununla toprak
  // kartını (en yakın hazır toprak + HG formülünden uyarlanan tarif + sepete ekleme) gösterir. Aynı bitki tekrar
  // sorulursa kayıttan, ücretsiz.
  const kendim = KENDIM.test(norm(q)) && !bilesenSoru;
  const lh = litreHesap(q);
  const kart = (b, cevap, tekrar) => {
    const metin = kendim && KARISIM_ACIK ? `${b.ad} için karışımınızı hazırladım; tarif ve fiyatı aşağıda. "Bu tarifle hazırlat"a dokunursanız bileşenler tek seferde sepete eklenir; litreyi değiştirebilirsiniz.` : kendim ? `${KARISIM_YOK}\n\n${cevap}` : cevap;
    return json({ ok: true, kaynak: 'ai', ...(tekrar ? { tekrar: true } : {}), dinamik: 'toprak', bitki: b.ad, prof: b.prof, grup: b.grup, kendim: kendim && KARISIM_ACIK, ...(lh && lh.litre ? { litre: lh.litre } : {}), ...(lh ? { saksi: { adet: lh.adet, cap: lh.cap || '' } } : {}),
      cevap: lh ? `${lh.metin}\n\n${metin}` : metin, urunler: [] });
  };
  if (db && !coklu && !bilesenSoru && toprakOk(norm(q))) {
    const b = bitkiBul(q, await bitkiKayit(db).catch(() => []));
    if (b) {
      log({ kaynak: 'havuz-ai', havuz: `bitki2:${b.ad}|${b.prof}|${b.grup}`, cevap: `${b.cevap || ''} [${b.ad} toprak kartı]`.slice(0, 1500) });
      return kart(b, b.cevap, true);
    }
  }
  // Daha önce Claude'un cevapladığı aynı soru: kayıttan, ücretsiz (sohbete bağlı kısa soruda değil: başka bitki için verilmiş olabilir)
  if (db && !baglamli && !coklu) {
    const R = await recentAi(db).catch(() => null);
    if (R && R.list.length) {
      let e = R.byQn.get(norm(q));
      if (!e) { const m = match(q, { extra: R.list, top: 3 }).find((x) => x.e.t === 'ai-kayit' && x.sc >= 0.9 && x.cp >= 0.9 && x.cq >= 0.9); if (m) e = m.e; }
      if (e) {
        log({ kaynak: 'havuz-ai', havuz: e.i });
        return json({ ok: true, kaynak: 'ai', tekrar: true, cevap: e.c, urunler: e.u });
      }
    }
  }
  // Hazır cevap bulunamadı: yardımcı model soruyu netleştirir (yazım hatası, dağınık anlatım, önceki mesaja bağlılık); netleşen
  // soru hazır cevaplarda yeniden aranır, yine yoksa ana yapay zekâ netleşmiş soruyu cevaplar
  if (!coklu && !kendim && (bilesenSoru || !toprakOk(norm(q)))) { const r = await netlestir(); if (r) return r; }
  // Claude: anahtar yoksa, kapalıysa ya da günlük sınır dolduysa "bilmiyorum + müşteri hizmetleri"
  const limit = Number(env.AK_DAILY_LIMIT) || DAILY_LIMIT;
  const off = !aiKey || env.AK_AI === 'off';
  let used = 0;
  if (!off && db) {
    const r = await db.prepare('INSERT INTO ak_gun (d, n) VALUES (?, 1) ON CONFLICT (d) DO UPDATE SET n = n + 1 RETURNING n').bind(today()).first().catch(() => null);
    used = r ? r.n : 0;
  }
  // Çoklu soru: havuzdan bulunan bölümler + yapay zekânın cevabı; yapay zekâ cevap veremezse eksik kalanlar için müşteri hizmetleri
  const cokluSon = (ek, ekU = [], tok = {}) => {
    const eksikMetin = `${coklu.eksik.map((x) => `${x.p} (${(KONU_AD[x.k] || x.k).toLocaleLowerCase('tr-TR')})`).join(', ')} için müşteri hizmetlerimizden destek alabilirsiniz: ${TEL} (telefon ve WhatsApp).`;
    const cevap = [coklu.metin, ek || eksikMetin].filter(Boolean).join('\n\n'), urunler = [...new Set([...coklu.u, ...ekU])].slice(0, 6);
    log({ kaynak: ek ? 'ai' : 'havuz', havuz: 'coklu:' + coklu.ids.join('+'), cevap: cevap.slice(0, 1500), urunler, durum: ek ? 'onay-bekliyor' : null, ...tok });
    return json({ ok: true, kaynak: ek ? 'ai' : 'havuz', tur: 'coklu', cevap, urunler });
  };
  const cokluVar = coklu && coklu.metin;
  if (off || !db || used > limit) {
    if (cokluVar) return cokluSon(null);
    log({ kaynak: 'yok', skor: near[0] ? near[0].sc : null, durum: 'cevapsiz' });
    return json({ ok: true, kaynak: 'yok', cevap: null, urunler: [], neden: off ? 'kapali' : 'sinir' });
  }
  // Listede olmayan bitkiye toprak sorusu: önce bitkinin toprak profili (ayrı, dikkatli sorgu). Tanınırsa toprak kartı
  // verilir (genel cevaba gidilmez); tanınmazsa normal akış sürer.
  if (!coklu && !bilesenSoru && toprakOk(norm(q))) {
    const pb = await bitkiSor(env, aiKey, q).catch(() => null);
    if (pb && pb.b) {
      const b = pb.b, cevap = b.aciklama || `${b.ad} için toprak önerimiz aşağıda.`;
      log({ kaynak: 'ai', havuz: `bitki2:${b.ad}|${b.prof}|${b.grup}`, skor: near[0] ? near[0].sc : null, cevap, durum: 'bitki-ai', giris: pb.giris, cikis: pb.cikis });
      if (!test) BITKI_AI.list.unshift({ ...b, cevap, w: norm(b.ad).split(' ').filter((w) => w.length >= 3) });
      return kart(b, cevap);
    }
  }
  const c = context(q, near, prods, formul ? await formul().catch(() => null) : null, coklu ? Math.min(6, coklu.eksik.length + 1) : 3, esle);
  const tumMetin = norm([qOrj, ...gecmis.slice(-4)].join(' '));
  const ga = aileBul(norm(qOrj)) || aileBul(tumMetin);
  const aile = /bahce yatag\w*|yukseltilmis|sebze yatag\w*|ciceklik/.test(tumMetin) ? /bahce yatag|yukseltilmis|ciceklik|sebze yatag/
    : /bahce kule\w*|dikey bahce/.test(tumMetin) ? /bahce kulesi|kat ilave/ : ga ? ga.u : null;
  if (aile) {
    const var_ = new Set(c.list.map((p) => p.s));
    const ek = prods.filter((p) => p.st && aile.test(norm(p.n)) && !var_.has(p.s)).slice(0, 24);
    ek.forEach((p) => c.list.push(p));
    // Galvaniz ailesinde ürün kartları (ölçü, kapasite, kullanım) doğrulanmış bilgi olarak verilir
    if (ga && aile === ga.u) {
      const sl = new Set(ek.map((p) => p.s)), kart = havuz().filter((e) => e.t === 'urun' && sl.has(esle([e.p])[0])).map((e) => e.c.split('\n\n')[0].slice(0, 320));
      if (kart.length) c.facts.push(`${ga.ad} ürünlerimiz (ürün bilgisine göre):\n${kart.slice(0, 18).map((k) => '- ' + k).join('\n')}`);
    }
  }
  let r;
  const ozet = sohbetOzeti(coklu ? [...gecmis, qOrj] : gecmis);
  try { r = await askClaude(env, aiKey, name, q, c, pageName, ozet); }
  catch (e) {
    if (cokluVar) return cokluSon(null);
    log({ kaynak: 'hata', skor: near[0] ? near[0].sc : null, cevap: String(e && e.status || e && e.message || e).slice(0, 200), durum: 'cevapsiz' });
    return json({ ok: true, kaynak: 'yok', cevap: null, urunler: [], neden: 'hata' });
  }
  if (!r.cevap) {
    if (cokluVar) return cokluSon(null);
    log({ kaynak: r.refused ? 'red' : 'hata', durum: 'cevapsiz', giris: r.usage && r.usage.input_tokens, cikis: r.usage && r.usage.output_tokens });
    return json({ ok: true, kaynak: 'yok', cevap: null, urunler: [], neden: r.refused ? 'red' : 'hata' });
  }
  const tok = { giris: r.usage && (r.usage.input_tokens + (r.usage.cache_read_input_tokens || 0) + (r.usage.cache_creation_input_tokens || 0)), cikis: r.usage && r.usage.output_tokens };
  // Yönlendirme ve konu dışı: modelin kısa cümlesi + iletişim düğmeleri
  if (cokluVar && (r.durum !== 'cevap' || !r.emin)) return cokluSon(null, [], tok);
  if (r.durum === 'yonlendir' || r.durum === 'konu_disi') {
    log({ kaynak: 'ai', skor: near[0] ? near[0].sc : null, cevap: r.cevap, durum: r.durum, ...tok });
    const cv = r.durum === 'yonlendir' && !/553 727/.test(r.cevap) ? `${r.cevap} Müşteri hizmetlerimiz: ${TEL} (telefon ve WhatsApp).` : r.cevap;
    return json({ ok: true, kaynak: 'yonlendir', cevap: cv, urunler: [], neden: r.durum });
  }
  // Model kendi cevabından emin değilse cevap gösterilmez (yanlış bilgi riski); müşteri hizmetlerine yönlendirilir.
  // Cevap inceleme için kaydedilir.
  if (!r.emin) {
    log({ kaynak: 'ai', skor: near[0] ? near[0].sc : null, cevap: r.cevap, urunler: r.urunler, durum: 'emin-degil', ...tok });
    return json({ ok: true, kaynak: 'yok', cevap: null, urunler: [], neden: 'emin-degil' });
  }
  if (cokluVar) return cokluSon(r.cevap, r.urunler, tok);
  log({ kaynak: 'ai', skor: near[0] ? near[0].sc : null, cevap: r.cevap, urunler: r.urunler, durum: 'onay-bekliyor', ...tok });
  return json({ ok: true, kaynak: 'ai', cevap: r.cevap, urunler: r.urunler });
}
