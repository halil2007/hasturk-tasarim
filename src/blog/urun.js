// Mağaza ürünleri (public/products.json, saatlik senkron): yazıya göre otomatik eşleştirme ve ürün kartları.
// Yalnız bahçe grupları önerilir (toprak, tohum, gübre, saksı, bitki, bahçe ekipmanı); evcil hayvan, halk sağlığı ve
// ilaç grupları, stokta olmayanlar, fiyatı 0 olanlar ve tonluk dökme ürünler otomatik öneriye girmez.
import { esc, fiyat, trKucuk } from './ortak.js';

const IZINLI_KOK = new Set(['topraklar', 'tohumlar', 'gubreler', 'saksilar-ve-bahce-yataklari', 'bitkiler', 'bahce-ekipmanlari', 'galvaniz-moduler-yapilar']);
// Galvaniz yapılardan yalnız bahçeyle ilgili olanlar (sera, kemer, tezgah, kurutma, kovan sehpası, kümes); raf, garaj, çöp muhafazası vb. önerilmez
const GALVANIZ_IZINLI = /sera|kemer|kurutma|kovan|kümes|tezgah/i;
const YASAK = /hijyen|ilaç(?!lama pompa)|ilac(?!lama pompa)|insektisit|fungisit|herbisit|haşere|hasere|zehir|yedek parça|kendi toprak karışımını/i;
// Ürün adında geçse de konuyu belirlemeyen genel kelimeler (mevsim, ölçü, yer): eşleştirmede sayılmaz
const GENEL = ['kış', 'kışl', 'sonba', 'ilkba', 'yaz', 'yazlı', 'yapra', 'sulam', 'iç', 'dış', 'mekan', 'büyük', 'küçük', 'renk', 'boy', 'model', 'iri', 'genel', 'kulla', 'bahçe', 'ev', 'balko', 'uzun', 'kısa', 'yeni', 'doğal', 'besin', 'özell',
  // Renkler, "yer yer", "ağaç" ve "çiçek" konu belirtmez: "yer yer sararmış" → yer domatesi, "beyaz lekeler" → beyaz lahana olmasın
  'yer', 'beyaz', 'kırmı', 'sarı', 'yeşil', 'mor', 'siyah', 'pembe', 'turun', 'mavi', 'ağaç', 'ağacı', 'çiçek', 'iki', 'üç', 'dört', 'beş',
  // Her yazı başlığında geçebilen işlem kelimeleri ("X Yetiştirme", "X Bakımı") ürün seçtirmez
  'yetiş', 'bakım', 'bakıc', 'karış', 'premi', 'kalit', 'profe', 'avant', 'kampa', 'litre', 'gözlü', 'sabit', 'tekerl', 'dikey', 'konse', 'sıvı', 'katı', 'tarım',
  // Yazıların çoğunda geçen sıradan kelimeler (tüm yazılarda ölçüldü): ürün adında olsalar da ayırt edici değiller
  'göz', 'düzen', 'hazır', 'kök', 'ince', 'geliş', 'tek', 'geniş', 'dikim', 'kenar', 'kalın', 'güçlü', 'alt', 'çeşit', 'ekim', 'renkl', 'parça', 'aydın', 'çalış', 'sıkış', 'şekil', 'yükse', 'çiçeğ', 'kışlı', 'bitki', 'yaprağ', 'seven', 'sever', 'power', 'flex', 'güzel', 'ithal', 'katlı', 'akıll', 'fonks', 'tüm', 'mini', 'modül', 'galva', 'iskel', 'metre', 'santi', 'esnek', 'örgül', 'uyuml', 'tel'];
const DOLGU = new Set(['ve', 'ile', 'için', 'icin', 'özel', 'ozel', 'organik', 'hg', 'hasturk', 'hastürk', 'lt', 'l', 'kg', 'gr', 'ml', 'adet', 'li', 'lu', 'lık', 'set', 'seti', 'paket', 'paketi', 'karışım', 'karisim', 'avantaj', 'kampanya', 'kampanyası', 'ayın', 'bitki', 'bitkiler',
  // Marka adları konu belirtmez
  'altınvadi', 'arzuman', 'florist', 'gartengold', 'serinova', 'uzman', 'sgs', 'raco', 'şahnalı', 'chrysamed', 'gübre', 'gübresi']);

// Ürün türü: öneride çeşitlilik (her türden en çok birkaç ürün) ve konuya uygun tür seçmek için
function turBul(n, yol) {
  const a = n.toLocaleLowerCase('tr-TR');
  if (/bahçe yatakları ve kuleleri/.test(yol)) return /uzatma|tekerlek|kat ilave/.test(a) ? 'yatak-ek' : 'yatak';
  if (/galvaniz/.test(yol)) return 'yapi';
  if (/ilaçlama pompa/.test(yol)) return 'pompa';
  if (/sulama malzeme/.test(yol)) return 'sulama';
  if (/bahçe ekipman/.test(yol)) return 'alet';
  if (/\bset(i)?\b|kampanya|paketi|üçlü/.test(a) && /topra|besin|gübre|cocopeat|perlit/.test(a + ' ' + yol)) return 'set';
  if (/viyol|saksılar/.test(yol) && !/topra/.test(a)) return 'saksi';
  if (/tohumlar/.test(yol) && !/topra/.test(a)) return 'tohum';
  if (/topra(ğı|k)\b/.test(a) && !/düzenleyici/.test(a)) return 'toprak';
  if (/bitki besin/.test(yol)) return 'besin';
  if (/gübreler/.test(yol)) return 'gubre';
  if (/düzenleyici|katkı/.test(yol)) return 'katki';
  if (/topraklar/.test(yol)) return 'toprak';
  return 'diger';
}
// Genel toprakların kullanım yeri: fide, sebze/bahçe, fidan, saksı (salon ve çiçek)
function toprakAlt(n) {
  const a = n.toLocaleLowerCase('tr-TR');
  if (/fide|şaşırtma|torf|potgrond|şaşırtma|parlatıcı|hijyen|önleyici|yaprak bakım sprey|tekne|çimlen/.test(a)) return 'fide';
  if (/fidan|ağaç/.test(a)) return 'fidan';
  if (/sebze|bahçe|yetiştirme/.test(a)) return 'sebze';
  return 'saksi';
}
const KONU_TOPRAK = { ev: ['saksi'], cicek: ['saksi', 'sebze'], sebze: ['sebze', 'fide', 'saksi'], agac: ['fidan', 'sebze'], cim: ['sebze'], toprak: ['sebze', 'fidan'], sulama: ['saksi', 'sebze'], hastalik: ['saksi', 'sebze'], tarla: [] };
// Aynı ürünün boy/paket kopyaları tek aile sayılır: bir öneride aynı aileden yalnız bir ürün olur
function aileBul(tur, n, kel) {
  const a = n.toLocaleLowerCase('tr-TR');
  if (tur === 'gubre' || tur === 'set') {
    if (/solucan/.test(a)) return /sıvı/.test(a) && !/katı/.test(a) ? 'solucan-sivi' : 'solucan-kati';
    if (/leonardit/.test(a)) return 'leonardit';
    if (/hümik|humix|hümix/.test(a)) return 'humik';
  }
  if (/perlit/.test(a) && tur !== 'toprak') return 'perlit';
  if (/cocopeat|torf/.test(a) && tur !== 'toprak') return 'cocopeat';
  if (tur === 'yatak') return /kule/.test(a) ? (/yediveren/.test(a) ? 'kule-yediveren' : 'kule-yonca') : /balkon/.test(a) ? 'yatak-balkon' : /çiçeklik/.test(a) ? 'yatak-ciceklik' : /şekilli/.test(a) ? 'yatak-sekilli' : 'yatak-moduler';
  return tur + ':' + kel.filter((w) => !/^tohum|^topra/.test(w)).slice(0, 2).join(' ');
}
// Neredeyse her konuya "uyan" ürünler: bir öneride en çok iki tane (biri elle seçilmişse otomatikte en çok bir)
const GENEL_AILE = new Set(['solucan-kati', 'solucan-sivi', 'perlit', 'leonardit', 'cocopeat', 'humik']);
// Mağazada az bulunan ürünler: yalnız yazının asıl konusuysa (başlık ya da odak kelimesi) önerilir; elle seçilmiş olsa bile başka yazılarda gösterilmez
export const AZ_STOK = new Set(['budama-makasi']);
// Az stoklu ürünün ana kelimesi (ör. budama) yazının başlığında ya da odak kelimesinde geçmeli
const azKonu = (p, Y) => [...(p.kel1 || [])].some((w) => Y.bo && Y.bo.has(w) && (ORTAK_DISI(w)));
const ORTAK_DISI = (w) => !['topra', 'saksı', 'tohum', 'fide'].includes(w);
const genelMi = (p) => GENEL_AILE.has(p.aile) || /^budama makası$/i.test(p.n);
// Dökme / çiftçi boyu ürünler (ton, 200 litre) yalnız tarla konularında önerilir
// Belli bir bitkiye ya da işe özel ürünler (orkide toprağı, domates tohumu, set): yalnız metinde o bitki/iş geçince önerilir, boşluk doldurmaz
const OZEL = /orkide|kaktüs|sukulent|\bgül|lotus|nilüfer|limon|ortanca|yaban mersini|bonsai|benjamin|paşa|barış|zeytin|aromatik|\bçim|kapama|lavanta|begonya|menekşe|sardunya|monstera|palmiye|turunçgil|akvaryum|teraryum|ayı sebze tohum|biochar|orman toprağı|çilek|narenciye|areka|palmiye|sardunya|menekşe|potgrond|şaşırtma|parlatıcı|hijyen|önleyici|yaprak bakım sprey|tekne|vermikülit|kil bilye|dekoratif taş|podima/i;
// Belli bir bitki adı taşımayan, her yerde kullanılabilen topraklar (geri kalan topraklar bitkiye özeldir)
const GENEL_TOPRAK = /genel|saksı toprağı|bitki toprağı|organik toprak|akıllı|çiçek toprağı|bahçe toprağı|salon bitkilerine|sebze|fide|fidan|torf|potgrond|orman/i;
const TOPLU = /\bton\b|200 litre|\(200 l/i;

// products.json Worker'la birlikte yayınlanan statik dosyadır; yalnız yeni sürümle değişir (yeni sürüm = yeni Worker örneği).
// Bu yüzden örnek başına bir kez hazırlanır; her 10 dakikada yeniden kurmak (~80 ms işlemci) o isteği işlemci sınırına taşıyordu.
let ONBELLEK = null;
export async function urunler(env, url) {
  if (ONBELLEK) return ONBELLEK;
  if (!env.ASSETS) return { t: Date.now(), harita: new Map(), liste: [], merchant: '', trend: [] };
  const r = await env.ASSETS.fetch(new Request(new URL('/products.json', url)));
  if (!r.ok) return ONBELLEK || { t: Date.now(), harita: new Map(), liste: [], merchant: '', trend: [] };
  const d = await r.json();
  const kat = new Map((d.cats || []).map((c) => [c.id, c]));
  const kok = (id) => { let c = kat.get(id), g = 0; while (c && c.p && kat.has(c.p) && g++ < 8) c = kat.get(c.p); return c ? c.s : ''; };
  const yolAd = (id) => { let c = kat.get(id), a = [], g = 0; while (c && g++ < 8) { a.unshift(c.n); c = kat.get(c.p); } return a.join(' > '); };
  const liste = (d.items || []).map((p) => {
    const kokler = new Set((p.c || []).map(kok));
    const katAd = (p.c || []).map((id) => (kat.get(id) || {}).n || '').join(' ');
    const yol = (p.c || []).map(yolAd).join(' ; ').toLocaleLowerCase('tr-TR');
    const n = String(p.n || '').trim();
    const uygun = p.st > 0 && p.p > 0 && [...kokler].some((k) => IZINLI_KOK.has(k)) && !YASAK.test(n + ' ' + katAd) && (!kokler.has('galvaniz-moduler-yapilar') || GALVANIZ_IZINLI.test(n));
    const kel = kelimeler(n), tur = turBul(n, yol);
    // Adın asıl kısmı (parantez, "|" ve "–" öncesi): "Çim Kapama Toprağı (Leonarditli Formül)" → çim kapama toprağı
    const tm = /([a-zçğıöşü]+)\s+tohum/i.exec(n.toLocaleLowerCase('tr-TR'));
    const kel1 = new Set(kelimeler(n.split(/\s[|–(]|\(|\s-\s/)[0]).map(kok5));
    return { s: p.s, n, p: p.p, st: p.st, img: p.img, uygun, kel, katKel: kelimeler(katAd), tur, aile: aileBul(tur, n, kel), kel1, bitki: tm ? kok5(tm[1]) : '', alt: tur === 'toprak' ? toprakAlt(n) : '', toplu: TOPLU.test(n), ozel: OZEL.test(n) || /özel bitki toprak|tohumlar|özel amaçlı ürünler/.test(yol) || (tur === 'toprak' && !GENEL_TOPRAK.test(n)), h: p.h || 0, x: p.x || [], xn: p.xn || [] };
  });
  // Kelime nadirliği (IDF): "toprak", "saksı" gibi her üründe geçen kelimeler az, "ortanca", "limon" gibi ayırt edici kelimeler çok puan alır
  const df = new Map();
  for (const p of liste) for (const k of new Set(p.kel.map(kok5))) df.set(k, (df.get(k) || 0) + 1);
  const idf = new Map([...df].map(([k, n]) => [k, Math.log(liste.length / n)]));
  ONBELLEK = { t: Date.now(), harita: new Map(liste.map((p) => [p.s, p])), liste, idf, merchant: d.merchant || '', trend: (d.trend && d.trend.best) || [] };
  return ONBELLEK;
}

// Birleşik adlar tek kelime sayılır: "hindistan cevizi" (kokopit) ceviz ağacı değildir
const BIRLESIK = (t) => t.replace(/hindistan\s+cevizi?/g, 'kokopit');
export function kelimeler(s) {
  return [...new Set(BIRLESIK(trKucuk(s)).replace(/[^a-zçğıöşü0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !DOLGU.has(w) && !/^\d/.test(w) && !GENEL.includes(w.slice(0, 5))))];
}
// Türkçe ekleri kabaca atmak için ilk 5 harf (toprak / toprağı / toprakta → "topra")
// İlk 5 harfi aynı olan farklı bitkiler ayrılır (begonya / begonvil)
const kok5 = (w) => (w.startsWith('begonv') ? 'begonv' : w.startsWith('biberiy') ? 'biberiy' : w.startsWith('yabani') ? 'yabani' : w.startsWith('karanf') ? 'karanf' : w.slice(0, 5));
// Kısa bitki adlarının ekli halleri (çimde, çimi, güllerin…) ürün adındaki köke bağlanır; "çimlendirme" çim değildir
const KISA = [[/^çim(de|in|e|i|im|ler|leri|lerde|lerin|den)?$/, 'çim'], [/^gül(ü|e|de|ün|üm|ler|leri|lerde|lerin|den)?$/, 'gül']];
const sorguKok = (w) => { for (const [re, k] of KISA) if (re.test(w)) return k; return kok5(w); };

export function gorselUrl(U, img, boy = 360) {
  if (!img || !U.merchant) return '/blog-statik/logo.webp';
  if (/^https?:/.test(img)) return img;
  const [a, b] = String(img).split('/');
  return `https://cdn.myikas.com/images/${U.merchant}/${a}/${boy}/${encodeURIComponent(b || 'image')}.webp`;
}

// ---------- Ürün önerisi ----------
// Yazının konusu: başlık, odak ve etiketler (güçlü), özet (orta) ve gövdeden çıkarılır; her konu hangi ürün türlerinin uygun olduğunu söyler.
const KONU = [
  ['tarla', /tarla|dekar|çiftçi|hektar|buğday|arpa|ayçiçe|pamuk|nohut|mercimek|yonca|hububat|anız|hasat sonrası tarla|üretici/, ['gubre']],
  ['ev', /salon|ev bitki|iç mekan|orkide|kaktüs|sukulent|monstera|potos|paşa kılıcı|sansevi|barış çiçe|benjamin|kauçuk|zamia|aloe|bonsai|saksı|balkon|pencere|teras|kiracı/, ['toprak', 'besin', 'katki', 'set', 'saksi']],
  ['sebze', /sebze|domates|biber|patlıcan|salatalık|kabak|fasulye|marul|ıspanak|lahana|brokoli|karnabahar|soğan|sarımsak|havuç|turp|bezelye|bakla|roka|maydanoz|dereotu|fide|çilek|kavun|karpuz|bamya|patates|pırasa|pancar|yeşillik/, ['tohum', 'toprak', 'gubre', 'saksi', 'katki']],
  ['agac', /ağaç|ağac|fidan|budama|meyve|zeytin|elma|armut|erik|kiraz|vişne|şeftali|kayısı|incir|(?<![a-zçğıöşü])nar(?![a-zçğıöşü])|limon|portakal|mandalina|ceviz|fındık|badem|(?<![a-zçğıöşü])dut|asma|(?<![a-zçğıöşü])bağ|üzüm|trabzon|kivi|ayva|yaban mersini/, ['gubre', 'alet', 'toprak']],
  ['cicek', /çiçe|(?<![a-zçğıöşü])gül|lale|sümbül|lavanta|ortanca|begonya|sardunya|petunya|kasımpatı|menekşe|zambak|nergis|frezya|açelya|kamelya|begonvil|yasemin|zinya|kadife/, ['toprak', 'besin', 'tohum', 'gubre']],
  ['cim', /(?<![a-zçğıöşü])çim/, ['tohum', 'toprak', 'gubre']],
  ['hastalik', /hastalı|zararlı|mantar|leke|böcek|yaprak biti|örümcek|beyaz sinek|ilaçla|küf|çürü|sarar|solgun/, ['pompa', 'besin', 'gubre', 'toprak']],
  ['sulama', /sulama|damla|hortum|nem ölç|su tutucu/, ['sulama', 'katki', 'toprak']],
  ['toprak', /toprak|kompost|gübre|(?<![a-zçğıöşü])ph(?![a-zçğıöşü])|organik madde|humus|perlit|cocopeat|torf|malç/, ['gubre', 'katki', 'toprak']],
];
const kucuk = (s) => trKucuk(String(s || '')).replace(/[#*_>`|[\]()]/g, ' ');
const kokSay = (metin) => { const m = new Map(); for (const w of BIRLESIK(trKucuk(metin)).replace(/[^a-zçğıöşü0-9\s]/g, ' ').split(/\s+/)) { if (w.length < 3) continue; const k = sorguKok(w); m.set(k, (m.get(k) || 0) + 1); } return m; };
const ozet32 = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

function yaziOku(y) {
  const guclu = kucuk([y.baslik, y.odak, y.etiketler].join(' . '));
  const orta = kucuk([y.kisaca, y.ozet].join(' . '));
  const govde = kucuk(y.govde);
  let konu = KONU.map(([ad, re, turler]) => {
    const g = (guclu.match(new RegExp(re.source, 'g')) || []).length, o = (orta.match(new RegExp(re.source, 'g')) || []).length;
    const b = Math.min(8, (govde.match(new RegExp(re.source, 'g')) || []).length);
    return { ad, turler, puan: g * 3 + o * 1.5 + b * 0.25 };
  });
  const tarla = konu.some((k) => k.ad === 'tarla' && k.puan >= 3);
  konu = konu.filter((k) => k.puan >= 1.5).sort((a, b) => b.puan - a.puan).filter((k, i, l) => i === 0 || (i === 1 && k.puan >= l[0].puan * 0.5));
  // İkinci konu yalnız ilk iki türünü ekler (ana konu belirleyici olsun)
  const turler = [...new Set(konu.flatMap((k, i) => (i ? k.turler.slice(0, 2) : k.turler)))];
  const bo = kokSay(kucuk([y.baslik, y.odak].join(' . ')));
  return { bo, ham: guclu, ozetHam: orta, g: kokSay(guclu), o: kokSay(orta), b: kokSay(govde), konu: konu.map((k) => k.ad), turler, tarla };
}

// Ürün adında az geçse de yazılarda çok geçen tür kelimeleri: puana katkı verir ama tek başına ürünü seçtirmez
const ORTAK = new Set(['sebze', 'fide', 'salon', 'meyve', 'fidan', 'sarma', 'tohum', 'topra', 'saksı']);
const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
// Ürünün yazıya uygunluk puanı. Ayırt edici kelime (az üründe geçen: "lahana", "orkide", "budama") başlıkta/etikette geçerse güçlü eşleşme;
// "toprak", "tohum" gibi çok üründe geçen kelimeler yalnız destek puanı verir. Gövdede birkaç kez geçmek de sayılır ama daha az.
function puanla(U, p, Y) {
  let s = 0, guclu = false, ayirt = 0, ust = false, ana = '', enIyi = 0, gsay = 0;
  for (const w of new Set(p.kel.map(kok5))) {
    const asil = !p.kel1 || p.kel1.has(w);
    const idf = (U.idf.get(w) || 1) * (asil ? 1 : 0.4), nadir = asil && idf >= 3 && !ORTAK.has(w);
    if (Y.g.has(w)) { s += idf * 3; if (nadir) { guclu = true; ust = true; ayirt++; gsay++; } }
    else if (Y.o.has(w)) { s += idf * 1.5; if (nadir) { ayirt++; ust = true; } }
    else if (Y.b.has(w)) { const c = Math.min(4, Y.b.get(w)); s += idf * 0.35 * c; if (nadir && c >= (p.ozel ? 3 : 2)) ayirt++; }
    else continue;
    // Ana kelime: eşleşen en ayırt edici kelime (aynı konudan iki ürün çıkmasın: kaktüs toprağı + kaktüs seti)
    if (nadir && idf > enIyi) { enIyi = idf; ana = w; }
  }
  // "Ekim Ayı Sebze Tohumu Seti" gibi aylık setler: başlıkta o ay geçerse güçlü eşleşme
  const ay = /^(\S+) ayı sebze tohum/i.exec(p.n);
  if (ay && Y.ham.includes(trKucuk(ay[1]) + ' ay')) { s += 12; guclu = true; ust = true; ayirt++; }
  return { s, guclu, ayirt, ust, ana, gsay };
}

// Bir öneri listesinin çeşitlilik kuralları: aynı aileden bir ürün; toprak, tohum, gübre en çok 2; diğer türler en çok 1; genel ürün en çok 2
function kurallar(genelSinir = 2) {
  const aile = new Set(), tur = new Map(); let genel = 0;
  const SINIR = { toprak: 2, tohum: 2, gubre: 2, katki: 1, besin: 1, set: 1, saksi: 1, alet: 1, sulama: 1, pompa: 1, yapi: 1, yatak: 1, 'yatak-ek': 1, diger: 1 };
  const anaK = new Set();
  return {
    // ana: ürünün yazıyla eşleştiği ana kelime; başlıkta geçmeyen bir kelimeden ikinci ürün seçilmez
    uyar: (p, ana, baslikta) => !aile.has(p.aile) && (tur.get(p.tur) || 0) < (SINIR[p.tur] || 1) && (!genelMi(p) || genel < genelSinir) && (!ana || baslikta || !anaK.has(ana)),
    ekle: (p, ana) => { aile.add(p.aile); tur.set(p.tur, (tur.get(p.tur) || 0) + 1); if (genelMi(p)) genel++; if (ana) anaK.add(ana); },
  };
}

// Yazı sonu ürün önerisi: her zaman n ürün (ürün varsa).
// 1) Yazara ait seçimler (elle seçilen + yazı içi kartlar), stokta yoksa en benzer ürünle
// 2) Metne en uygun ürünler (puan sırası; tür ve aile çeşitliliği korunur)
// 3) Konuya uygun türlerden; daha önce seçilenlerle birlikte alınanlar ve çok satanlar öne çıkar
// 4) Sebze, balkon ve bahçe yazılarında boş yer kalırsa bir bahçe yatağı / kulesi
// 5) Son çare: bahçe ürünlerinden çok satanlar
// Aynı sıradaki eşit adaylar yazının adresine göre karıştırılır: her yazıda hep aynı ürün çıkmaz.
export function oneriler(U, y, { secili = [], haric = [], n = 4, doldur = true } = {}) {
  const Y = yaziOku(y);
  const K = kurallar(Y.tarla || Y.konu.includes('toprak') ? 3 : 2), out = [], kul = new Set(haric);
  const al = (p, ana) => { out.push(p); kul.add(p.s); K.ekle(p, ana); };
  const tohum = y.slug || y.baslik || '';
  // Yazarın seçtiği genel ürünler (solucan gübresi, perlit, budama makası…) yazının asıl konusu değilse en çok biri, en sona konur;
  // böylece her yazının ilk kartları konuya özel ürünler olur ve aynı ürün her yazıda öne çıkmaz.
  let sona = null;
  for (const p of urunBulYedekli(U, secili, haric)) {
    if (AZ_STOK.has(p.s) && !azKonu(p, Y)) continue;
    if (kul.has(p.s) || out.some((q) => q.aile === p.aile) || (sona && sona.aile === p.aile)) continue;
    if (genelMi(p) && !puanla(U, p, Y).ust && !(['toprak', 'tarla'].includes(Y.konu[0]) && p.tur === 'gubre')) {
      if (!sona) {
        // Aynı ailenin (ör. katı solucan gübresi: 1 kg, 20 kg, üçlü set) ürünleri yazıdan yazıya dönüşümlü gösterilir
        const aile = U.liste.filter((q) => q.uygun && q.aile === p.aile && !kul.has(q.s) && (!q.toplu || Y.tarla) && q.p <= Math.max(2000, p.p * 1.5));
        sona = aile.sort((a, b) => ozet32(tohum + a.s) - ozet32(tohum + b.s))[0] || p;
        kul.add(sona.s); K.ekle(sona);
      }
      continue;
    }
    if (out.length < n) al(p);
  }
  if (sona) { n--; if (out.length > n) out.length = n; }
  const aday = U.liste.filter((p) => p.uygun && !kul.has(p.s) && (!p.toplu || Y.tarla) && (!AZ_STOK.has(p.s) || azKonu(p, Y)));
  const puanlar = new Map(aday.map((p) => [p.s, puanla(U, p, Y)]));
  // 2) Metne uygun ürünler
  const hastalikYazisi = Y.konu[0] === 'hastalik' && !/tohum/.test(Y.ham);
  const sirali = aday.map((p) => {
    const r = puanlar.get(p.s);
    let s = r.s * (Y.turler.includes(p.tur) ? 1.3 : 1);
    // Her yazıda adı geçen genel ürünler (solucan gübresi, perlit, budama makası) yalnız başlık/özet konusuyla eşleşirse
    if (genelMi(p)) { s *= 0.7; if (!r.ust) return { p, s, ok: false }; }
    // Belli bir bitkiye/işe özel ürün (tohum, orkide toprağı, set) yalnız başlık, odak ya da etiketlerde geçerse;
    // sera iskeleti, kovan sehpası gibi yapılar başlıkta en az iki kelimesi geçerse; diğerleri başlık/özet ya da gövdede güçlü tekrar
    let ok;
    if (p.tur === 'yapi') ok = r.gsay >= 2;
    else if (p.ozel || p.tur === 'tohum' || p.tur === 'set' || p.tur === 'pompa' || p.tur === 'yatak-ek') ok = r.guclu && r.s >= 4;
    else ok = (r.guclu && r.s >= 4) || (r.ust && r.s >= 5) || (r.ayirt >= 2 && r.s >= 8);
    if (p.tur === 'tohum' && (hastalikYazisi || (p.bitki && !Y.g.has(p.bitki)))) ok = false;
    return { p, s, ok };
  }).filter((x) => x.ok).sort((a, b) => b.s - a.s);
  for (const { p } of sirali) { if (out.length >= n) break; const r = puanlar.get(p.s); if (!kul.has(p.s) && K.uyar(p, r.ana, Y.g.has(r.ana))) al(p, r.ana); }
  if (!doldur) return sona ? [...out, sona] : out;
  // 4) için yer ayır: sebze / balkon / bahçe yazısında yatak yoksa son sıra bahçe yatağının
  const balkonY = /balkon|teras|kiracı|yükseltilmiş|bahçe yatağ|bahçe kule|dikey/.test(Y.ham + ' ' + (Y.ozetHam || ''));
  const yatakUygun = (Y.konu[0] === 'sebze' || balkonY) && !Y.konu.some((k) => ['cim', 'tarla'].includes(k)) && !out.some((p) => p.tur === 'yatak');
  const hedef3 = yatakUygun ? n - 1 : n;
  // 3) Konuya uygun türler: birlikte alınma + çok satma + zayıf metin uyumu
  const topraklar = Y.tarla ? [] : [...new Set(Y.konu.flatMap((k) => KONU_TOPRAK[k] || []))];
  if (out.length < hedef3 && Y.turler.length) {
    const birlikte = new Map();
    for (const p of out) (p.x || []).forEach((s, i) => birlikte.set(s, (birlikte.get(s) || 0) + Math.min(3, (p.xn[i] || 1) / 5)));
    const havuz = aday.filter((p) => (Y.turler.includes(p.tur) && !['pompa', 'yapi', 'yatak-ek'].includes(p.tur) || (p.tur === 'pompa' && (Y.konu[0] === 'hastalik' || /ilaçla|pülveriz/.test(Y.ham)))) && (!p.ozel || puanlar.get(p.s).guclu) && !(p.tur === 'tohum' && hastalikYazisi) && (!['alet', 'sulama', 'saksi', 'pompa'].includes(p.tur) || puanlar.get(p.s).ust) && (p.tur !== 'tohum' || !p.bitki || Y.g.has(p.bitki)) && (p.tur !== 'toprak' || (p.ozel ? puanlar.get(p.s).guclu : topraklar.includes(p.alt))))
      .map((p) => ({ p, s: puanlar.get(p.s).s * 0.4 + (birlikte.get(p.s) || 0) * 2 + Math.min(1.2, Math.log1p(p.h) * 0.25) + (Y.turler.length - Y.turler.indexOf(p.tur)) * 0.3 + ozet32(tohum + p.s) * 3.5 - (genelMi(p) && !Y.tarla ? 1.5 : 0) + (p.tur === 'toprak' && topraklar.includes(p.alt) ? (topraklar.length - topraklar.indexOf(p.alt)) * 1.6 : 0) }))
      .sort((a, b) => b.s - a.s);
    for (const { p } of havuz) { if (out.length >= hedef3) break; const r = puanlar.get(p.s); if (!kul.has(p.s) && K.uyar(p, r.ana, Y.g.has(r.ana))) al(p, r.ana); }
  }
  if (yatakUygun && out.length < n) {
    const balkon = /balkon|teras|kiracı|dikey|kule/.test(Y.ham + ' ' + Y.ozetHam);
    const yataklar = aday.filter((p) => p.tur === 'yatak' && !kul.has(p.s))
      .map((p) => ({ p, s: puanlar.get(p.s).s * 0.5 + (balkon && /balkon|kule/i.test(p.n) ? 3 : 0) + (Y.konu.includes('cicek') && /çiçeklik/i.test(p.n) ? 3 : 0) + Math.log1p(p.h) * 0.5 + ozet32(tohum + p.s) * 2 }))
      .sort((a, b) => b.s - a.s);
    if (yataklar[0]) al(yataklar[0].p);
  }
  // 5) Son çare: çok satan bahçe ürünleri (toprak, gübre, besin, tohum)
  if (out.length < n) {
    const son = aday.filter((p) => (Y.tarla ? ['gubre'] : ['toprak', 'gubre', 'besin', 'katki']).includes(p.tur) && !p.ozel && (p.tur !== 'toprak' || !topraklar.length || topraklar.includes(p.alt)))
      .map((p) => ({ p, s: Math.log1p(p.h) + ozet32(tohum + p.s) * 1.5 })).sort((a, b) => b.s - a.s);
    for (const { p } of son) { if (out.length >= n) break; if (!kul.has(p.s) && K.uyar(p)) al(p); }
  }
  // 6) Çeşitlilik sınırları yüzünden hâlâ eksikse: aynı aileden olmayan herhangi bir genel bahçe ürünü
  if (out.length < n) {
    const ek = aday.filter((p) => !kul.has(p.s) && !p.ozel && (Y.tarla ? ['gubre'] : ['toprak', 'gubre', 'besin', 'katki', 'alet']).includes(p.tur) && !out.some((q) => q.aile === p.aile) && (!sona || sona.aile !== p.aile))
      .map((p) => ({ p, s: Math.log1p(p.h) + ozet32(tohum + p.s) * 1.5 })).sort((a, b) => b.s - a.s);
    for (const { p } of ek) { if (out.length >= n) break; al(p); }
  }
  if (sona) out.push(sona);
  return out;
}

// Serbest metne göre en uygun ürünler (panel önerileri gibi): yalnız metin uyumu, doldurma yok
export function eslestir(U, metin, n = 4, haric = []) {
  return oneriler(U, { odak: metin }, { n, haric, doldur: false });
}

export function urunBul(U, slugs) { return slugs.map((s) => U.harita.get(s)).filter((p) => p && p.st > 0 && p.p > 0); }
// Seçilen ürün stokta yoksa yerine stokta olan en benzer ürün gelir (ürün verisi saatlik güncellenir; stok dönünce asıl ürün geri gelir)
export function urunBulYedekli(U, slugs, haric = []) {
  const out = [], kullan = new Set(haric);
  for (const s of slugs) {
    const p = U.harita.get(s);
    if (!p) continue;
    if (p.st > 0 && p.p > 0) { if (!kullan.has(p.s)) { out.push(p); kullan.add(p.s); } continue; }
    // Önce aynı türden (gübre yerine gübre, tohum yerine tohum) en benzer ürün
    const adaylar = eslestir(U, [p.n, p.n, ...p.kel].join(' '), 6, [...kullan]);
    const y = adaylar.find((q) => q.tur === p.tur) || (adaylar[0] && ['toprak', 'gubre', 'katki', 'besin'].includes(adaylar[0].tur) && ['toprak', 'gubre', 'katki', 'besin'].includes(p.tur) ? adaylar[0] : null);
    if (y) { out.push(y); kullan.add(y.s); }
  }
  return out;
}

// Mağaza bağlantısı: blog içi sayaç adresinden geçer (/git/slug), sonra mağazaya yönlenir
export function git(base, p, kaynak) { return `${base}/git/${encodeURIComponent(p.s)}${kaynak ? '?k=' + encodeURIComponent(kaynak) : ''}`; }
// Ürün kartı bağlantısı: href doğrudan mağazadaki ürün sayfası (arama motorları takip eder, mağazaya değer aktarır);
// tıklanınca tarayıcı adresi data-git'e çevirir: tık sayılır, mağazaya UTM ile gidilir (site.js)
let MAGAZA = 'https://hasturkgubre.com.tr';
export function magazaAyarla(u) { if (u) MAGAZA = String(u).replace(/\/$/, ''); }
export function urunHref(base, p, kaynak) { return `href="${MAGAZA}/${encodeURIComponent(p.s)}" data-git="${git(base, p, kaynak)}"`; }

const IK = (id) => `<svg><use href="/blog-statik/ikon.svg#${id}"/></svg>`;
// "Sepete ekle": Ürün Bul (pm-search.js) data-ua-ekle'yi yakalar ve ürünü blog sepetine ekler (seçenekli üründe seçenek
// penceresi açılır); betik yüklenmemişse bağlantı ürün sayfasına gider. "İncele" mağazadaki ürün sayfasını açar.
const sepetHref = (p) => `href="${MAGAZA}/${encodeURIComponent(p.s)}" data-ua-ekle="${esc(p.s)}" rel="nofollow"`;
const dugmeler = (base, p, k) => `<div class="kb2"><a class="btn btn-o" ${urunHref(base, p, k)}>İncele</a><a class="btn btn-g" ${sepetHref(p)}>${IK('i-cart')}Ekle</a></div>`;
export function kartRc(U, base, p, k) {
  return `<div class="rc"><a class="im" ${urunHref(base, p, k)}><img src="${gorselUrl(U, p.img)}" alt="${esc(p.n)}" loading="lazy" decoding="async" width="180" height="180"></a><b>${esc(p.n)}</b><span class="pr">${fiyat(p.p)}</span>${dugmeler(base, p, k)}</div>`;
}
export function kartPm(U, base, p, k) {
  return `<div class="pm"><a class="im" ${urunHref(base, p, k)}><img src="${gorselUrl(U, p.img)}" alt="${esc(p.n)}" loading="lazy" decoding="async"></a><b>${esc(p.n)}</b><span class="pr">${fiyat(p.p)}</span>${dugmeler(base, p, k)}</div>`;
}
export function kartRs(U, base, p, k) {
  return `<div class="rs"><a class="im" ${urunHref(base, p, k)}><img src="${gorselUrl(U, p.img)}" alt="${esc(p.n)}" loading="lazy" decoding="async"></a><div><b>${esc(p.n)}</b><span class="pr">${fiyat(p.p)}</span></div><a class="cart" ${sepetHref(p)} aria-label="${esc(p.n)} sepete ekle" title="Sepete ekle">${IK('i-cart')}</a></div>`;
}
// Yazı içi ürün kartı (tek ya da birkaç ürün yan yana)
export function kartYaziIci(U, base, list, k) {
  if (!list.length) return '';
  return `<div class="inprod">${list.map((p) => `<a class="ip" ${urunHref(base, p, k)}><img src="${gorselUrl(U, p.img)}" alt="" loading="lazy" decoding="async" width="72" height="72"><span><b>${esc(p.n)}</b><em>${fiyat(p.p)}</em></span><i>Mağazada Gör ${IK('i-arrow')}</i></a>`).join('')}</div>`;
}
