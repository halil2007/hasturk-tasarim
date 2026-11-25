// Soru-cevap: ziyaretçinin yazdığı soru başlığını ve metnini düzgün hale getirir, arama motorları için sayfa başlığı ve
// açıklaması üretir, kategori seçilmemişse konudan kategori tahmin eder. Hem kayıtta (soruPost) hem gösterimde kullanılır;
// böylece eski sorular da veritabanına dokunmadan düzgün görünür. Anlamı değiştirmez: yalnız biçim düzeltir.

const KUCUK = (s) => String(s || '').toLocaleLowerCase('tr-TR');
const BUYUK = (s) => String(s || '').toLocaleUpperCase('tr-TR');
const ilkBuyuk = (s) => s.replace(/^(\s*["'(“‘]*)(\p{L})/u, (_, a, h) => a + BUYUK(h));

// Türkçe klavye olmadan yazılmış metinde (hiç ç, ğ, ı, ö, ş, ü yoksa) sık geçen bahçe kelimelerinin harflerini düzeltir.
// Yalnız tam kelime eşleşir ve listede belirsiz (iki anlamlı) kelime yoktur.
const HARF = {
  nasil: 'nasıl', kac: 'kaç', icin: 'için', nicin: 'niçin', cok: 'çok', simdi: 'şimdi', boyle: 'böyle', gibi: 'gibi',
  cicek: 'çiçek', cicegi: 'çiçeği', cicegim: 'çiçeğim', cicekler: 'çiçekler', ciceklerim: 'çiçeklerim', cicekleri: 'çiçekleri',
  agac: 'ağaç', agaci: 'ağacı', agacim: 'ağacım', agaclar: 'ağaçlar', agacin: 'ağacın', agaclari: 'ağaçları', agacima: 'ağacıma', agacimin: 'ağacımın', agacina: 'ağacına',
  gubre: 'gübre', gubresi: 'gübresi', gubreyi: 'gübreyi', gubreleme: 'gübreleme', gubrelemek: 'gübrelemek',
  topragi: 'toprağı', topragin: 'toprağın', topragim: 'toprağım', topraga: 'toprağa', topragina: 'toprağına', topragini: 'toprağını',
  domatesim: 'domatesim', yapraklarim: 'yapraklarım', cicegime: 'çiçeğime', saksiyi: 'saksıyı', sulamak: 'sulamak',
  saksi: 'saksı', saksida: 'saksıda', saksiya: 'saksıya', saksisi: 'saksısı', saksidaki: 'saksıdaki', saksilar: 'saksılar',
  yapragi: 'yaprağı', yapraklari: 'yaprakları', yapraklarim: 'yapraklarım', yapraklarin: 'yaprakların',
  sarariyor: 'sararıyor', sarardi: 'sarardı', sari: 'sarı', kurudu: 'kurudu',
  curudu: 'çürüdü', curuyor: 'çürüyor', curume: 'çürüme', curumesi: 'çürümesi', dokuluyor: 'dökülüyor', dokuldu: 'döküldü', dokulmesi: 'dökülmesi',
  buyumuyor: 'büyümüyor', buyume: 'büyüme', buyudu: 'büyüdü', cimlenmedi: 'çimlenmedi', cimlenmiyor: 'çimlenmiyor', cimlenme: 'çimlenme',
  cim: 'çim', cimi: 'çimi', cimim: 'çimim', cimler: 'çimler', bocek: 'böcek', bocegi: 'böceği', bocekler: 'böcekler',
  kokleri: 'kökleri', koku: 'kökü', ilac: 'ilaç', ilaci: 'ilacı', ilaclama: 'ilaçlama', hastalik: 'hastalık', hastaligi: 'hastalığı',
  isik: 'ışık', isigi: 'ışığı', gunes: 'güneş', gunesi: 'güneşi', gunde: 'günde', gun: 'gün', haftada: 'haftada',
  salatalik: 'salatalık', patlican: 'patlıcan', uzum: 'üzüm', menekse: 'menekşe', gul: 'gül', gulum: 'gülüm', kayisi: 'kayısı',
  sulamaliyim: 'sulamalıyım', yapmaliyim: 'yapmalıyım', yapabilirim: 'yapabilirim', kullanmaliyim: 'kullanmalıyım', vermeliyim: 'vermeliyim',
  lutfen: 'lütfen', tesekkurler: 'teşekkürler', tesekkur: 'teşekkür', merhaba: 'merhaba', oldugu: 'olduğu', degil: 'değil', mudur: 'mudur',
};
const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
function harfDuzelt(s) {
  if (TR_HARF.test(s)) return s;
  return s.replace(/\p{L}+/gu, (w) => {
    const d = HARF[KUCUK(w)];
    if (!d) return w;
    return w === BUYUK(w) && w.length > 1 ? BUYUK(d) : /^\p{Lu}/u.test(w) ? ilkBuyuk(d) : d;
  });
}

// Büyük harf kilidiyle yazılmış metin (harflerin çoğu büyük) → normal yazım
function capsDuzelt(s) {
  const harf = s.match(/\p{L}/gu) || [];
  const buyuk = harf.filter((h) => h !== KUCUK(h)).length;
  if (harf.length >= 8 && buyuk / harf.length > 0.7) {
    return KUCUK(s).replace(/(^|[.!?…]\s+|\n\s*)(\p{L})/gu, (_, a, h) => a + BUYUK(h));
  }
  return s;
}

function noktalama(s) {
  // Noktadan sonra boşluk unutulmuşsa ("Merhaba.domatesim") ekle; adres içeren metne dokunma
  if (!/https?:|www\.|\.com/i.test(s)) s = s.replace(/(\p{L}{2,})\.(\p{L}{2,})/gu, '$1. $2');
  return s.replace(/([!?])[!?]+/g, '$1').replace(/\.{4,}/g, '...').replace(/,{2,}/g, ',')
    .replace(/\s+([,.!?;:])/g, '$1').replace(/([,;:])(?=\p{L})/gu, '$1 ').replace(/\?\s*\./g, '?').replace(/\.\s*\?/g, '?');
}

// Soru kelimesi geçiyorsa başlık soru işaretiyle biter
const SORU_KELIME = /(^|\s)(nasıl|neden|niçin|niye|ne zaman|nerede|hangi|hangisi|kaç|ne kadar|nedir|ne yapmalı\p{L}*|ne yapabilirim|ne yapayım)(\s|$|[,.!?])|(\s|^)(mı|mi|mu|mü)(\s|$|[,.!?])|\s(mı|mi|mu|mü)(yım|yim|yum|yüm|sın|sin|sun|sün|dır|dir|dur|dür|yız|yiz|yuz|yüz|sınız|siniz|sunuz|sünüz)(\s|$|[,.!?])/iu;
export function soruMu(s) { return SORU_KELIME.test(KUCUK(s)); }

export function soruBaslikDuzelt(b) {
  let s = String(b || '').replace(/\p{Extended_Pictographic}|️/gu, '').replace(/\s+/g, ' ').trim();
  if (!s) return s;
  s = noktalama(harfDuzelt(capsDuzelt(s)));
  s = ilkBuyuk(s).replace(/[\s.,;:]+$/, '');
  if (soruMu(s)) s = s.replace(/!$/, '') + (/\?$/.test(s) ? '' : '?');
  return s;
}

export function soruMetinDuzelt(m) {
  let s = String(m || '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!s) return s;
  s = noktalama(harfDuzelt(capsDuzelt(s)));
  // Cümle başları büyük harf (yalnız nokta, ünlem, soru işareti ve satır başından sonra)
  return s.replace(/(^|[.!?]\s+|\n)(\p{Ll})/gu, (_, a, h) => a + BUYUK(h));
}

// Sözcük ortasından kesmeden kısaltma; mümkünse cümle sonunda biter
function cumleKirp(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const kes = s.slice(0, n), son = Math.max(kes.lastIndexOf('. '), kes.lastIndexOf('? '), kes.lastIndexOf('! '));
  if (son >= n * 0.55) return kes.slice(0, son + 1);
  return kes.slice(0, n - 1).replace(/\s+\S*$/, '').replace(/[\s,;:–-]+$/, '') + '…';
}

// <title> için başlık: en çok 60 karakter (site adı sığarsa eklenir). Uzun soruda virgülden önceki anlamlı kısım alınır.
export function soruSeoBaslik(baslik, siteAdi = 'HasTürk Blog') {
  let b = soruBaslikDuzelt(baslik);
  if (b.length > 60) {
    const v = b.indexOf(', ');
    const ana = v >= 25 && v <= 58 ? b.slice(v + 2) : '';
    // "Bahçemde X var, Y nasıl yapılır?" gibi sorularda asıl soru virgülden sonradır
    b = ana && ana.length <= 60 && ana.length >= 20 && soruMu(ana) ? ilkBuyuk(ana) : cumleKirp(b, 60);
  }
  const ek = ' | ' + siteAdi;
  return b.length + ek.length <= 65 ? b + ek : b;
}

// Meta açıklama (120–158 karakter): sorunun özü + varsa ekibin ya da çözüm olarak seçilen cevabın başı
export function soruAciklama(s, cevaplar = []) {
  const metin = soruMetinDuzelt(s.metin), baslik = soruBaslikDuzelt(s.baslik);
  const c = (cevaplar.find((a) => a.id === s.cozum_id) || cevaplar[0] || {}).metin;
  let d;
  if (c) {
    const soruK = cumleKirp(metin.length >= 30 ? metin : baslik, 70);
    d = soruK + ' Cevap: ' + cumleKirp(soruMetinDuzelt(c), 156 - soruK.length - 8);
  } else {
    // Kısa metinde başlık da açıklamaya girer (metin başlığı zaten tekrar ediyorsa girmez)
    const tekrar = KUCUK(metin).includes(KUCUK(baslik).replace(/[?!.]$/, ''));
    d = cumleKirp(metin.length >= 110 || tekrar ? metin : baslik + ' ' + metin, 156);
  }
  for (const ek of [' Bahçe severler ve HasTürk ekibi cevaplıyor.', ' Benzer sorular ve bitki bakım rehberleri HasTürk Blog\'da.', ' Bitki bakımı, toprak ve gübre sorularınızı HasTürk Blog soru-cevap bölümünde sorabilirsiniz.']) {
    if (d.length < 120 && d.length + ek.length <= 158) d += ek;
  }
  return d;
}

// Kategori seçilmeden gönderilen soruya konudan kategori tahmini (kategori sluglarından biri ya da null)
const KAT = [
  ['gubreleme', /gübre|gubre|solucan|guano|hümik|humik|leonardit|besin|npk|azot|fosfor|potas/],
  ['toprak-rehberi', /toprak|toprağ|torf|perlit|kokopit|cocopeat|vermikülit|pomza|drenaj|ph\b|kireç|saksı karışım/],
  ['sebze-meyve', /domates|biber|salatalık|patlıcan|marul|fasulye|kabak|çilek|limon|portakal|mandalina|elma|armut|zeytin|incir|üzüm|sebze|meyve|fide/],
  ['cicekler', /çiçek|gül|orkide|menekşe|sardunya|lale|ortanca|begonvil|papatya|lavanta|krizantem|açelya/],
  ['ekim-takvimi', /ne zaman ek|hangi ay|ekim zamanı|dikim zamanı|takvim/],
  ['bitki-bakimi', /yaprak|sula|saksı|salon|monstera|kaktüs|sukulent|benjamin|kauçuk|pothos|ışık|budama|çoğalt/],
  ['bahce-ipuclari', /bahçe|çim|ağaç|bocek|böcek|zararlı|hastalık|kurt|salyangoz/],
];
export function kategoriTahmin(metin, kategoriler) {
  const t = KUCUK(harfDuzelt(String(metin || '')));
  for (const [slug, re] of KAT) {
    if (re.test(t)) { const k = kategoriler.find((x) => x.slug === slug); if (k) return k; }
  }
  return null;
}
