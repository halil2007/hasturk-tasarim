// Kendin Tasarla bilgi kutuları: tasarımın yanında gösterilen kapasite, verim, kaplama, ölçü özeti ve uyarı metinleri.
// Metinler ve hesaplar üreticinin aracıyla aynıdır (scripts/tasarla-dogrula.mjs veri/tasarla/kahin-bilgi.json ile denetler).
// Bir kutu, satır dizisidir: ['h', başlık] · ['b', büyük sonuç] · ['r', etiket, değer] · ['t', not] · ['w', uyarı] · ['li', kalın başlık, metin] · ['cal', 12 ay ağırlığı].
// kutular(m, P, R) → { kutu: [[satır…]…], parcaNot: parça listesinin üstündeki not, dip: listenin altındaki not }.
import { KLD, CKD, GPV, OGCAR, KUHAYVAN, RFD, CQD } from './motor.js';

const F1 = (x) => String(x).replace('.', ',');
const fm = (x) => (x / 1000).toFixed(2).replace('.', ',');
const fx1 = (x) => String(+x.toFixed(1)).replace('.', ',');
const fx2 = (x) => String(+x.toFixed(2)).replace('.', ',');
const FMT2 = (x) => (+x.toFixed(2)).toLocaleString('tr-TR');
const TR = (x) => Math.round(x).toLocaleString('tr-TR');
const H = (t) => ['h', t], B = (t) => ['b', t], R_ = (l, v) => ['r', l, v], T = (t) => ['t', t], W = (t) => ['w', t], LI = (l, x) => ['li', l, x];
const KONNOT = 'Konnektör eşleştirmesi otomatik çıkarıldı, üretimden önce doğrulayın.';
const OZEL = 'Profiller ölçünüze göre özel kesilir; her profil, boyuna en yakın üst standart profilin fiyatından hesaplanır.';

/* ---------- Sera: yetiştirilecek ürün ---------- */
export const CR = [
  { k: 'Domates', n: 2.8, y: 20, c: 'tek uzun dönem (~9 ay)', nt: 'Dikim sıklığı dekara 2.800 fide (T.C. Tarım ve Orman Bakanlığı topraksız domates fizibilitesi). Aynı rapor ısıtmalı, topraksız profesyonel serada 40 kg/m²/yıl veriyor; kutudaki değer ısıtmasız/orta düzey için bunun yarısıdır (tahmin).' },
  { k: 'Hıyar (Salatalık)', n: 3, y: 12, c: 'yılda 2 dönem', nt: 'Dekara 3.000 fide, yılda 2 dönem (Bakanlık hıyar fizibilitesi: Mart-Haziran ve Ağustos-Ocak). Rapor 24 kg/m²/yıl veriyor (ısıtmalı, profesyonel); kutudaki değer bunun yarısıdır (tahmin).' },
  { k: 'Biber', n: 2.8, y: 14, c: 'yılda 2 dönem', nt: 'Dekara 2.800 fide, yılda 2 dönem (Bakanlık biber fizibilitesi). Rapor 28,8 kg/m²/yıl veriyor (ısıtmalı, profesyonel); kutudaki değer bunun yarısıdır (tahmin).' },
  { k: 'Patlıcan', n: 2, y: 10, c: 'tek uzun dönem', nt: 'Kaynaklarda sera için net rakam bulunamadı; dikim sıklığı ve verim yaygın uygulama ortalamasından alınan tahmindir.' },
  { k: 'Kabak', n: 1.5, y: 8, c: 'yılda 1-2 dönem', fw: 0.25, nt: 'Kaynaklarda sera için net rakam bulunamadı; sakız kabağı için dikim sıklığı ve verim tahmindir (bitki başına yaklaşık 10-30 meyve).' },
  { g: 'Yeşillikler ve yapraklı sebzeler', k: 'Marul', n: 11, y: 10, c: 'yılda 3-4 dönem (6-8 hafta)', fw: 0.3, nt: 'Masura üzerinde 25-40 cm aralık (Samsun İl Tarım Müdürlüğü, Sebzecilik). Verim ve dönem sayısı tahmindir.' },
  { g: 'Yeşillikler ve yapraklı sebzeler', k: 'Kıvırcık', n: 11, y: 10, c: 'yılda 3-4 dönem', fw: 0.3, nt: 'Marul gibi sıklıkta dikilir. Verim ve dönem sayısı tahmindir.' },
  { g: 'Yeşillikler ve yapraklı sebzeler', k: 'Roka', n: 300, y: 9, c: 'yılda 5-6 dönem (kesimli)', nt: 'Sık ekilir; bitki sayısı yaklaşık değerdir. Verim ve dönem sayısı tahmindir.' },
  { g: 'Yeşillikler ve yapraklı sebzeler', k: 'Maydanoz', n: 100, y: 10, c: 'tüm yıl kesimli', nt: 'Sık ekilir/dikilir; bitki sayısı yaklaşık değerdir. Verim tahmindir.' },
  { g: 'Yeşillikler ve yapraklı sebzeler', k: 'Dereotu', n: 150, y: 10, c: 'yılda 4-5 dönem', nt: 'Sık ekilir; bitki sayısı yaklaşık değerdir. Verim tahmindir.' },
  { g: 'Yeşillikler ve yapraklı sebzeler', k: 'Taze soğan', n: 100, y: 10, c: 'yılda 3-4 dönem', nt: 'Sık dikilir; bitki sayısı yaklaşık değerdir. Verim tahmindir.' },
  { k: 'Muz', n: 0.15, y: 4.5, c: 'çok yıllık, yılda 1 hasat', nt: 'Sera muzunda dekara ~150 fidan ve 4-5 ton/da verim tahmini kullanıldı; kaynaklarda net rakam bulunamadı. Fidan dikiminden ilk hasada yaklaşık 12-18 ay sürer.' },
  { k: 'Çilek', n: 6.5, y: 5, c: 'yılda 1 dönem (çok yıllık)', nt: 'Yaz dikiminde dekara 6.000-7.000 fide ve 5-7 ton/da verim (Alata Bahçe Kültürleri Araştırma Enstitüsü). Kutuda dar aralığın alt ucu alınmıştır.' },
  { k: 'Kavun', n: 1.5, y: 6, c: 'yılda 1 dönem', fw: 1.8, nt: 'Kaynaklarda sera için net rakam bulunamadı; dikim sıklığı (dikey kültürde ~1,5 bitki/m²) ve verim tahmindir.' },
  { k: 'Karpuz', n: 0.9, y: 6, c: 'yılda 1 dönem', fw: 5.5, nt: 'Serada yerde yetiştirmede dekara 800-1.000 bitki (askıda 2.000-3.000), meyve 5-6 kg tercih edilir (Alata Bahçe Kültürleri Araştırma Enstitüsü). Verim tahmindir.' },
];
function seraKutu(P, R) {
  const o = CR[Math.max(0, Math.min(CR.length - 1, +P.cr || 0))], A = R.ek.ia * 0.7;
  return [H('Yetiştirilecek ürün'), B(TR(A * o.n) + ' bitki'), T('Ekim alanı ' + FMT2(A) + " m² (iç zeminin %70'i, yol ve kenar payı hariç)"), R_("1 m²'de bitki", FMT2(o.n) + ' adet'), R_("1 m²'den yıllık ürün", FMT2(o.y) + ' kg'), R_('Serada yıllık ürün', '≈ ' + TR(A * o.y) + ' kg'),
    ...(o.fw ? [R_('Yaklaşık meyve/baş adedi', '≈ ' + TR((A * o.y) / o.fw) + ' adet')] : []), R_('Yetiştirme süresi', o.c), T(o.nt + ' Rakamlar yaklaşık ortalamadır; iklim, çeşit ve bakıma göre değişir.')];
}

/* ---------- Kümes: hayvan kapasitesi ve verim ---------- */
const KUNOT = [
  'Kapasite iç zemin alanından, 3 tavuk/m² (tavuk başına yaklaşık 0,33 m²) ile hesaplanır. Yumurta: tavuk başına günde yaklaşık 0,7 (yılda ~255). Kışın ve yaşlı tavuklarda düşer. Et: yıl sonunda her tavuğun kesildiği varsayımıyla kuş başı ~1,5 kg karkas. Bu değerler ırka ve beslenmeye göre değişen tahmini ortalamalardır.',
  'Kapasite iç zemin alanından, 2 kaz/m² (kaz başına yaklaşık 0,5 m²) ile hesaplanır. Yumurta: kaz başına yılda yaklaşık 40 adet (günde ~0,11), mevsimlik ve yalnız ilkbahar-yaz aylarında. Et: yıl sonunda her kuşun kesildiği varsayımıyla kuş başı ~3,5 kg karkas. Bu değerler ırka ve besiye göre değişen tahmini ortalamalardır.',
  'Kapasite iç zemin alanından, 2,5 ördek/m² (ördek başına yaklaşık 0,4 m²) ile hesaplanır. Yumurta: yumurtacı ördekte (Khaki Campbell gibi) yılda yaklaşık 200 adet (günde ~0,55). Et: yıl sonunda her ördeğin kesildiği varsayımıyla kuş başı ~2 kg karkas. Bu değerler ırka ve besiye göre değişen tahmini ortalamalardır, kaynaktan doğrulanmamıştır.',
];
const yumurtaSatir = (hn, u) => { const ER = KUHAYVAN.ER[u], MK = KUHAYVAN.MK[u]; return [R_('Günlük yumurta', '≈ ' + Math.round(hn * ER) + ' adet'), R_('Haftalık yumurta', '≈ ' + Math.round(hn * ER * 7) + ' adet'), R_('Aylık yumurta', '≈ ' + Math.round(hn * ER * 30) + ' adet'), R_('Yıllık yumurta', '≈ ' + Math.round(hn * ER * 365).toLocaleString('tr-TR') + ' adet'), R_('Yıllık et (karkas)', '≈ ' + Math.round(hn * MK).toLocaleString('tr-TR') + ' kg')]; };
function kumesKutu(u, ia) {
  const hn = Math.floor(ia * KUHAYVAN.DEN[u]), ad = KUHAYVAN.ad[u];
  return [B(hn + ' ' + ad), T('İç zemin ' + F1(ia.toFixed(1)) + ' m² · ' + KUHAYVAN.DEN[u] + ' ' + ad + '/m²'), ...yumurtaSatir(hn, u), T(KUNOT[u])];
}
function hobiKutu(e) {
  const u = e.hu, ad = KUHAYVAN.ad[u], DH = KUHAYVAN.DEN[u], DR = [1, 0.4, 0.7][u], ER = KUHAYVAN.ER[u], MK = KUHAYVAN.MK[u];
  const nt = 'Kapasite, kulübe için ' + F1(DH) + ' ' + ad + '/m² ve gezinti alanı için ' + F1(DR) + ' ' + ad + '/m² sınırından küçük olanla hesaplanır. Yumurta: ' + ['tavuk başına günde yaklaşık 0,7', 'kaz başına yılda yaklaşık 40 adet (günde ~0,11, yalnız ilkbahar-yaz)', 'ördek başına yılda yaklaşık 200 adet (günde ~0,55)'][u] + '. Et: yıl sonunda her kuşun kesildiği varsayımıyla kuş başı ~' + F1(MK) + ' kg karkas. Kaz ve ördek değerleri ile gezinti yoğunlukları ırka ve besiye göre değişen tahmini ortalamalardır, kaynaktan doğrulanmamıştır.';
  return [B(e.hn + ' ' + ad), T('Kulübe ' + F1(e.hA.toFixed(1)) + ' m² · gezinti alanı ' + F1(e.rA.toFixed(1)) + ' m²'), ...yumurtaSatir(e.hn, u), T(nt)];
}

/* ---------- Arı kovanı sehpası: bölgeye göre bal verimi ---------- */
export const ARR = [
  { k: 'Marmara', y: 12.59, f: [4, 11], typ: 200, pl: 'Ayçiçeği, kanola, kestane, ıhlamur, akasya, kekik, yonca', bal: 'Ayçiçeği balı (Trakya), kestane balı, çiçek balı', ref: 'Edirne Haziran-Ağustos (ayçiçeği, kanola), Bursa Nisan-Kasım (kestane, ıhlamur, akasya)', nt: 'Ayçiçeği bölge arıcılığı için önemlidir. Kaynak, arıcılığın burada Ege ve Karadeniz kadar ticarileşmediğini belirtiyor.' },
  { k: 'Ege', y: 14.58, f: [4, 9], typ: 300, pl: 'Çam (salgı), narenciye, kekik, zeytin, üçgül, adaçayı, okaliptüs, korunga', bal: 'Çam balı (Muğla, Aydın), narenciye balı, kekik balı, çiçek balı', ref: 'İzmir Nisan-Eylül (zeytin, çam, kekik, narenciye)', nt: "Türkiye'de en çok kovan bu bölgededir. Muğla çam balıyla bilinir; narenciye bahçeleri ve tohumluk yonca iyi kaliteli bal verir." },
  { k: 'Akdeniz', y: 14.59, f: [3, 9], typ: 300, pl: 'Narenciye, pamuk, susam, çam, akasya, geven, kekik, okaliptüs', bal: 'Narenciye balı, çam balı, pamuk balı, kekik balı', ref: 'Adana Mart-Eylül, Antalya Şubat-Kasım (ilçeye göre)', nt: 'Narenciye bahçeleri ve yem bitkileri ana kaynaktır. Sezon erken başlar; kıyıdan yaylaya göç yaygındır.' },
  { k: 'İç Anadolu', y: 12.26, f: [5, 10], typ: 1000, pl: 'Yonca, korunga, fiğ, ayçiçeği, geven, kekik, kanola', bal: 'Korunga ve yonca balı, geven balı, ayçiçeği balı', ref: 'Konya Mayıs-Ekim (yonca, korunga, ayçiçeği, geven)', nt: 'Arıcılık tüm illerde yapılır, ama yaz ortasında kısa boylu bozkır bitkileri kuruyup sararınca verim düşer.' },
  { k: 'Karadeniz', y: 15.97, f: [6, 8], typ: 400, pl: 'Kestane, ormangülü, akasya, böğürtlen, ıhlamur, fındık, geven, kekik', bal: 'Kestane balı, yayla çiçek balı, akasya balı', ref: 'Giresun Haziran-Ağustos, Kastamonu Mayıs-Ağustos', nt: 'Kovan başına verimde ilk sıradadır. Arıcılar çiçeklenmeye göre kovan taşır; Ordu arıcıları yazın Erzurum, Kars, Ağrı yaylalarına gider.' },
  { k: 'Doğu Anadolu', y: 10.16, f: [6, 8], typ: 1700, pl: 'Yayla çiçekleri, yonca, korunga, fiğ, ballıbaba, kekik, adaçayı, geven', bal: 'Yayla çiçek balı (Erzurum, Kars), geven balı', ref: 'Erzurum Haziran-Ağustos (yonca, korunga, ballıbaba, kekik, geven)', nt: 'Bozkır bitkileri balın tadını artırır, Erzurum ve Kars balı piyasada bilinir. Sert karasal iklim ve çok soğuk geceler sezonu kısaltır.' },
  { k: 'Güneydoğu Anadolu', y: 8.47, f: [3, 10], typ: 700, pl: 'Pamuk, üçgül, badem, geven, kekik, susam, hayıt, sumak, zahter', bal: 'Pamuk balı, kekik balı, geven balı, dağ çiçek balı', ref: 'Diyarbakır Mart-Ekim, Gaziantep Mayıs-Ekim', nt: 'Resmi istatistikte verim düşük görünse de nektar kaynakları zengindir; gezginci arıcıların balı yüksek fiyata satılır.' },
];
export const ARALT = [{ k: '0-500 m', m: 250 }, { k: '500-1000 m', m: 750 }, { k: '1000-1500 m', m: 1250 }, { k: '1500 m ve üstü', m: 1750 }];
const ARREHBER = [
  ['Yön:', 'Kovan girişleri güneye veya doğuya baksın; sabah güneşi arıyı erken çalıştırır.'], ['Su:', 'Arılık bir su kaynağına en fazla 800 m uzaklıkta olsun; yoksa kovan yanına suluk koyun.'],
  ['Zemin ve rüzgâr:', 'Düz, kuru ve sert bir zemin seçin; uçuş önü açık kalsın. Rüzgâr almayan, insan, hayvan ve gürültüden uzak bir yer seçin.'],
  ['Sehpa neden:', 'Kovanı nemden, karınca ve kemirgenlerden korur, malzemenin ömrünü uzatır, eğilmeden çalışmayı sağlar. Sehpa çok yüksek olursa ballık kaldırmak zorlaşır.'],
  ['Kovan arası:', 'Çok sık dizilen kovanlarda arılar huzursuzlaşır, çok seyrekte iş yükü artar. Arıların yanlış kovana girmesini (şaşırma) azaltmak için at nalı dizin, rüzgâr kesici kurun veya kovan önlerini farklı renge boyayın.'],
  ['Yasal mesafe:', 'Arılık köy ve mahalle yollarına en az 50 m, ilçeler arası yollara en az 200 m uzakta olmalı. Cami, okul, sağlık ocağı, karakol, çeşme gibi yerlere en az 200 m, dağınık yerleşimde en yakın eve 50 m. Mesafe sağlanamıyorsa giriş yola bakıyorsa 3 m, bakmıyorsa 2 m yüksek çit gerekir (Arıcılık Yönetmeliği 2024, Md. 18).'],
  ['Kayıt ve plaka:', "Kovanlar AKS'ye kayıtlı olmalı; sarı kovan plakası giriş yüzünün sağ alt köşesine takılır. Kayıtsız koloniye nakil belgesi verilmez (Md. 9-12, 17)."],
  ['Gezginci arıcılık:', 'Arı nakil belgesi alın, il dışına çıkışta veteriner sağlık raporu gerekir; konaklayacağınız arazinin sahibiyle yazılı anlaşma yapın. Orman alanında yangın söndürücü bulundurmak zorunludur (Md. 7, 18, 19).'],
  ['Koloni gücü:', "Aktif sezonda bir koloni en az 5-6 çerçeve arılı, 3-4 çerçeve yavrulu olmalıdır. Arı 10 °C'nin altında uçmaz."],
  ['Rüzgâr ve kazık:', 'Açık tarlada dolu sehpayı kuvvetli rüzgâra karşı zemine kazıkla sabitleyin; kovan önü hafif öne eğik dursun ki yağmur suyu içeri girmesin.'],
];
function arilarKutu(P, R) {
  const hives = R.ek.hives, Rg = ARR[Math.max(0, Math.min(6, +P.arr || 0))], A = ARALT[Math.max(0, Math.min(3, +P.ara || 0))], d = ((A.m - Rg.typ) / 100) * 3, a0 = Math.max(0, Rg.f[0] - 1 + d / 30), b0 = Math.min(12, Rg.f[1] - d / 60), b1 = Math.max(a0 + 0.5, b0);
  const w = []; let ws = 0; for (let m = 1; m <= 12; m++) { const v = Math.max(0, Math.min(b1, m) - Math.max(a0, m - 1)); w.push(v); ws += v; }
  const mf = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'], sm = [[3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 1, 2]], sn = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
  const share = sm.map((q) => q.reduce((t, m) => t + w[m - 1], 0) / (ws || 1)), Ytot = Rg.y * hives;
  const fmM = (x) => { const m = Math.min(11, Math.max(0, Math.floor(x + 1e-6))); return x - m < 0.34 ? 'başı ' : x - m < 0.67 ? 'ortası ' : 'sonu '; };
  const ay1 = mf[Math.min(11, Math.floor(a0 + 1e-6))], ay2 = mf[Math.min(11, Math.max(0, Math.ceil(b1) - 1))];
  const akim = 'Bal akımı yaklaşık ' + ay1 + ' ' + fmM(a0).trim() + ' ile ' + ay2 + ' ' + fmM(b1 - 1e-6).trim() + ' arası.' + (Math.abs(d) >= 7 ? ' Seçtiğiniz rakım bölgenin tipik rakımından ' + (d > 0 ? 'yüksek: çiçeklenme yaklaşık ' + Math.round(d / 7) + ' hafta geç başlar, sezon kısalır.' : 'alçak: çiçeklenme yaklaşık ' + Math.round(-d / 7) + ' hafta erken başlar.') : '');
  const b = [H('Bölgeye göre bal verimi'), T('Haritadan bölgenize dokunun, sonra rakımı seçin.'), B(TR(Ytot) + ' kg / yıl'), T(hives + ' kovan × kovan başına ' + F1(Rg.y) + ' kg · ' + Rg.k + ', ' + A.k), H('Çiçeklenme takvimi'), ['cal', w], T(akim),
    ...sn.map((q, i) => R_(q, share[i] > 0.005 ? fx1(Rg.y * share[i]) + ' kg/kovan · ' + TR(Ytot * share[i]) + ' kg' : '—')), R_('Yıllık', fx1(Rg.y) + ' kg/kovan · ' + TR(Ytot) + ' kg'), R_('Başlıca bal türleri', Rg.bal), R_('Ana nektar bitkileri', Rg.pl), R_('Çiçeklenme kaynağı', Rg.ref),
    R_('Hasat', 'Genelde akım bitince, petek hücrelerinin üçte ikisi sırlanınca (çoğu yerde Eylül)'), R_('Kışlık bal', 'Koloni başına yaklaşık 15 kg kovanda bırakılır'),
    T(Rg.nt + ' Kovan başına verim, bölgenin 2018 resmi kovan ve üretim verisinden hesaplanan ortalamadır (Türkiye 2023 ortalaması 12,45 kg). Mevsimlere dağılım bir tahmindir: yıllık verim çiçeklenme aylarına eşit paylaştırılmıştır. Rakım etkisi her 100 m için yaklaşık 3 günlük çiçeklenme gecikmesiyle hesaplanır; verimi değiştirmez. Gerçek verim koloni gücüne, hava koşullarına, varroa mücadelesine ve gezginci olup olmamanıza göre bölge ortalamasının yarısından iki katına kadar değişebilir.')];
  return [b, [H('Arılık kurulum rehberi'), ...ARREHBER.map(([l, x]) => LI(l, x))]];
}

/* ---------- Kaplama hesabı (konteyner, odunluk çatısı, raf tablası) ---------- */
export const CMAT = [{ k: 'Bordex', t: 'strip', w: 1, note: 'etkin genişlik 1,00 m, boy ihtiyaca göre kesilir' }, { k: 'Sandviç panel', t: 'strip', w: 1, note: 'etkin genişlik 1,00 m, boy ihtiyaca göre kesilir' }, { k: 'Galvaniz saç', t: 'sheet', a: 1.25, b: 2.5, note: 'levha 1,25 × 2,50 m, %10 fire payı' }, { k: 'Lambiri', t: 'fixed', w: 0.09, len: 3, note: '9 cm × 3 m çıta' }];
export const CFL = [{ k: 'OSB / Sunta (18 mm)', t: 'sheet', a: 1.22, b: 2.44, note: 'levha 1,22 × 2,44 m, %10 fire payı' }, { k: 'Kontrplak (18 mm)', t: 'sheet', a: 1.22, b: 2.44, note: 'levha 1,22 × 2,44 m, %10 fire payı' }, { k: 'Galvaniz saç', t: 'sheet', a: 1.25, b: 2.5, note: 'levha 1,25 × 2,50 m, %10 fire payı' }];
const ODC = [{ k: 'Branda' }, { k: 'Sunta', t: 'sheet', a: 1.83, b: 3.66, note: 'levha 1,83 × 3,66 m, %10 fire payı. Sunta suya dayanıksızdır: üstünü mutlaka su yalıtım örtüsü veya shingle ile kaplayın; dış ortam için OSB-3 tercih edin.' }, { k: 'Galvaniz trapez sac', t: 'strip', w: 1, note: 'etkin genişlik 1,00 m, boy eğim uzunluğuna göre kesilir. Vidaları contalı çatı vidası olsun.' }];
function kaplama(m, list) {
  const rows = []; let tot = 0, cnt = 0, run = 0;
  if (m.t == 'sheet') { list.forEach((o) => { tot += o.c * o.w * o.l; rows.push([o.n, fx2(o.c * o.w * o.l) + ' m²']); }); const need = Math.ceil((tot * 1.1) / (m.a * m.b) - 1e-9); rows.push(['Sipariş', need + ' levha']); return { rows, tot, sum: need + ' levha' }; }
  list.forEach((o) => { const st = Math.ceil(o.w / m.w - 1e-9); tot += o.c * o.w * o.l; let pc;
    if (m.t == 'strip') { pc = st * o.c; run += pc * o.l; rows.push([o.n, pc + ' adet × ' + fx2(o.l) + ' m']); }
    else { const per = o.l <= m.len ? Math.max(1, Math.floor(m.len / o.l + 1e-9)) : 0, bd = per ? Math.ceil(st / per) : st * Math.ceil(o.l / m.len); pc = bd * o.c; rows.push([o.n, pc + ' çıta']); } cnt += pc; });
  if (m.t == 'strip') return { rows, tot, sum: cnt + ' adet · ' + fx2(run) + ' mt' }; return { rows, tot, sum: cnt + ' çıta' };
}
const satirlar = (rows) => rows.map((r) => R_(r[0], r[1]));

/* ---------- Konteyner: kapatılacak alan ve kaplama miktarı ---------- */
function konteynerKutu(P, R) {
  const { Wo, Lo, Ho } = R.ek, mt = CMAT[+P.cqm || 0], ft = CFL[+P.cqf || 0], W1 = Wo / 1000, L1 = Lo / 1000, H1 = Ho / 1000;
  const a = kaplama(mt, [{ n: 'Yan duvar (2)', c: 2, w: L1, l: H1 }, { n: 'Ön/arka duvar (2)', c: 2, w: W1, l: H1 }, { n: 'Çatı', c: 1, w: L1, l: W1 }]), b = kaplama(ft, [{ n: 'Zemin', c: 1, w: W1, l: L1 }]);
  const wallA = 2 * L1 * H1 + 2 * W1 * H1, roofA = W1 * L1, floorA = W1 * L1;
  return [H('Kapatılacak alan'), R_('Duvarlar', fx1(wallA) + ' m²'), R_('Çatı', fx1(roofA) + ' m²'), R_('Zemin', fx1(floorA) + ' m²'), R_('Toplam', fx1(wallA + roofA + floorA) + ' m²'), H(mt.k), ...satirlar(a.rows), ...(mt.t == 'sheet' ? [] : [R_('Toplam', a.sum)]), T(mt.note), H(ft.k + ' (zemin)'), ...satirlar(b.rows), T(ft.note)];
}

/* ---------- Salma kuş kafesi: kuş türüne göre kapasite ---------- */
const BAND = [[100, 0.37, 0.18], [200, 0.72, 0.36], [300, 1, 0.5], [400, 1.5, 0.75], [500, 2.5, 1.25], [900, 5, 2.5]];
export const BD = [{ g: 'Küçük kuşlar', k: 'Zebra ispinozu', l: 100 }, { g: 'Küçük kuşlar', k: 'Kanarya', l: 130 }, { g: 'Küçük kuşlar', k: 'Sevda papağanı', l: 150 }, { g: 'Küçük kuşlar', k: 'Muhabbet kuşu', l: 180 },
  { g: 'Orta boy papağanlar', k: 'Konür', l: 300 }, { g: 'Orta boy papağanlar', k: 'Sultan papağanı', l: 320 }, { g: 'Orta boy papağanlar', k: 'Jako', l: 330 }, { g: 'Orta boy papağanlar', k: 'Amazon papağanı', l: 350 }, { g: 'Orta boy papağanlar', k: 'Küçük kakadu', l: 350 },
  { g: 'Büyük papağanlar', k: 'Büyük kakadu', l: 550 }, { g: 'Büyük papağanlar', k: 'Ara (makav)', l: 900 }, { g: 'Güvercin ve kumru', k: 'Kumru', l: 300 }, { g: 'Güvercin ve kumru', k: 'Güvercin', l: 340 },
  { g: 'Yer kuşları', k: 'Bıldırcın', l: 180 }, { g: 'Yer kuşları', k: 'Keklik', l: 330 }, { g: 'Yer kuşları', k: 'Süs sülünü', l: 700 }];
export const KUSLAR = BD.map((b) => b.k);
function kusKutu(P, R) {
  const b = BD[Math.max(0, Math.min(15, +P.qgb || 0))], A = R.ek.A, q = BAND.find((x) => b.l <= x[0]) || BAND[BAND.length - 1], n = A >= q[1] - 1e-9 ? 2 + Math.floor((A - q[1]) / q[2] + 1e-9) : 0, cnt = Math.min(n, 60);
  return [[H('Kuş türü'), B(n ? n + ' adet' : 'Yetmez'), T(b.k + (n ? ' · çift ve ek kuşlar dahil' : ' · en az bir çift için ' + fx2(q[1]) + ' m² iç taban gerekir (şimdi ' + fx2(A) + ' m²)')),
    T('Bir çift için asgari ' + fx2(q[1]) + ' m², her ek kuş için +' + fx2(q[2]) + ' m² · yaklaşık boy ' + b.l / 10 + ' cm · yükseklik standardı ≥1,8 m karşılanıyor'),
    ...(b.k.includes('Ara') || b.k.includes('Büyük kakadu') ? [W('Büyük papağanlar tablonun kapsamı dışındadır; sonuç yalnızca boy bandına göre bir kıyastır. Mutlaka uzman görüşü alın.')] : []),
    T('Kafeste ' + cnt + ' ' + b.k.toLowerCase() + ' gösteriliyor' + (n > 60 ? ' (görselde en fazla 60)' : '') + '.'),
    T('Sayılar bir çift için asgari alan + her ek kuş için ek alan esasına göre hesaplanır (Logan Şehir Konseyi, Queensland, dış mekân kuş kafesi tablosu). Kuş boyları yaklaşık değerdir. Kış barınağı, gürültü ve bina/belediye kuralları ayrıca kontrol edilmelidir.')]];
}

/* ---------- Kedi balkon kafesi ---------- */
function kediKutu(P, R) {
  const { fa, sha, ea, cats, Ho } = R.ek;
  return [[H('Kaç kedi'), B(cats ? cats + ' kedi' : 'Yetersiz'), T('Etkin alan ' + fx2(ea) + ' m² = taban ' + fx2(fa) + ' m² + ' + P.kfs + ' raf ' + fx2(sha) + ' m²'),
    T('Varsayım: ilk kedi için 1,5 m², her ek kedi için +0,9 m² etkin alan. Kediler dikey alanı kullandığı için tünek rafları etkin alana eklenir. Bu resmi bir standart değildir; kaynaklarda kedi başına bağlayıcı bir ölçü bulunamadı, rakamlar yaygın catio tavsiyelerinden türetilmiş varsayımdır. Kedileriniz birbiriyle geçimsizse daha geniş tutun.'),
    ...(Ho < 1500 ? [W("Yükseklik 1,5 m'nin altında: tünek rafı sığmaz ve temizlik zor olur.")] : [])],
  [H('Güvenlik uyarısı'), W('Bu ürün yüksek katlı bir balkona monte edilir ve kedinin düşmesini önlemek içindir. Kafes mutlaka bina duvarına dübelle ve balkon zeminine sabitlenmelidir; kendi ağırlığıyla durmasına güvenmeyin. Tel örgüyü kedi tırnağına dayanıklı seçin, kapıya kedinin açamayacağı bir kilit takın. Montajı yapan kişi sabitlemeden sorumludur; kiracıysanız bina yönetiminden izin alın.')]];
}

/* ---------- Odunluk: odun kapasitesi, çatı örtüsü, rehber ---------- */
export const ODW = [{ k: 'Meşe', d: 740, r: '600-900' }, { k: 'Kayın', d: 750, r: '700-900' }, { k: 'Dişbudak', d: 710, r: '' }, { k: 'Akasya', d: 690, r: '670-710' }, { k: 'Huş', d: 670, r: '510-770' }, { k: 'Ceviz', d: 570, r: '' }, { k: 'Kestane', d: 560, r: '' }, { k: 'Kızılağaç', d: 550, r: '420-680' }, { k: 'Çam (sarıçam)', d: 510, r: '' }, { k: 'Kavak', d: 425, r: '350-500' }];
export const ODUNLAR = ODW.map((w) => w.k);
function odunKutu(P, R) {
  const { L, D, He, Do, OV, Lr } = R.ek, odr = +P.odr ? 1 : 0, w = ODW[Math.max(0, Math.min(9, +P.ods || 0))], Vst = ((L - 30) * (D - 30) * (He - 30)) / 1e9, Vtri = odr ? 0 : ((D - 30) * (D - 30) / 4 * (L - 30)) / 1e9, solid = Vst * 0.7, kg = solid * w.d;
  return [[H('Odun kapasitesi'), B(fx1(Vst) + ' ster'), T('İstif hacmi ' + fx1(Vst) + ' m³ (1 ster = 1 m³ istif odun) · yaklaşık ' + TR(kg) + ' kg kuru ' + w.k.toLowerCase()), R_('İç istif ölçüsü', fm(L - 30) + ' × ' + fm(D - 30) + ' × ' + fm(He - 30) + ' m'), R_('İstif hacmi', fx1(Vst) + ' ster'), R_('Katı odun hacmi (× 0,7)', fx1(solid) + ' m³'),
    R_(w.k + ' yoğunluğu (kuru)', w.d + ' kg/m³' + (w.r ? ' (' + w.r + ')' : '')), R_('Ağırlık (bu türle)', TR(kg) + ' kg'), R_('OGM genel kabulüyle', '~' + TR(Vst * 500) + ' kg (500 kg/ster)'), R_('Çatı altı ek boşluk', odr ? 'yok (düz çatı)' : fx1(Vtri) + ' m³ (üçgen; istifi zor, sayılmadı)'),
    T("Ster, 1 m³ boşluğa istif edilmiş odun miktarıdır (TS 2378). OGM bir sterde yaklaşık 0,7 m³ katı odun ve 500 kg kabul eder; ince ve eğri odunda oran 0,4-0,5'e kadar düşer. Yoğunluklar kurutulmuş odun içindir, yaş odun çok daha ağırdır. Evinizin bir kışta kaç ster yaktığına dair güvenilir bir Türkiye ortalaması bulunamadı; geçen kış aldığınız odunu bu rakamla karşılaştırın.")],
  [H('Odunluk rehberi'), LI('Üç yan + çatı:', 'Odunu her yönden kapatmayın; hava akımı odunu kuru tutar ve kurumasını sağlar. Ön taraf açık kalsın ya da kafes kapı kullanın.'), LI('Zemin:', 'Odunluğu sert ve kuru bir zemine kurun (beton, stabilize veya çakıl). Toprak nemi alt sıraya çeker ve böcek getirir; toprak zeminde en alt sıranın altına palet koyun.'),
    LI('Saçak:', 'Çatı odun yığınından her yönde taşmalı, eğim suyu dışarı atmalı. Ev tarafındaki saçağa oluk takın ki su duvar dibine dökülmesin.'), LI('Yön:', 'Açık ön tarafı hakim rüzgârın tersine çevirin; güneş görmesi kurumayı hızlandırır.'),
    LI('Yan çıtalar:', 'Kaplama isterseniz çıtalar arasında 5-10 cm boşluk bırakın; rüzgâr geçer, yağmur kesilir.'), LI('Kurutma:', 'Kesilmiş odun tam kurumak için yaklaşık bir yıl ister. Yarılmış odun daha hızlı kurur; yarmadan istiflemeyin.'),
    LI('İstif:', 'Parçalar paralel ve düzgün sıralar halinde dizilsin. Çok sıkı istif havayı keser, çok gevşek istif yer kaybettirir. Duvar tarafında birkaç cm boşluk bırakın.'), LI('Sabitleme:', 'Odunluğu ev duvarına dübelle bağlayın; dolu istif ve rüzgâr yükünde devrilmeye karşı en güvenli yol budur.')]];
}
function odunCati(P, R) {
  const { D, Do, OV, Lr } = R.ek, odr = +P.odr ? 1 : 0, cv = ODC[Math.max(0, Math.min(2, +P.odc || 0))], Sl = odr ? Do + 2 * OV : (D / 2) * Math.SQRT2 + OV, RA = ((odr ? 1 : 2) * Lr * Sl) / 1e6; let rows, note;
  if (!P.odc) { rows = [['Çatı alanı (saçak payıyla)', fx1(RA) + ' m²'], ['Branda (bindirme ve bağlama payı %15)', fx1(RA * 1.15) + ' m²']]; note = 'Branda: kenarlarından kuşaklara halat veya lastik gergiyle bağlanır, mahyada tek parça geçirilirse su almaz. UV dayanımlı PVC branda seçin.'; }
  else { const b = kaplama(cv, [{ n: odr ? 'Düz çatı' : 'Çatı (2 eğim)', c: odr ? 1 : 2, w: Lr / 1000, l: Sl / 1000 }]); rows = [['Çatı alanı (saçak payıyla)', fx1(RA) + ' m²']].concat(b.rows); note = cv.note; }
  return [H(cv.k), ...satirlar(rows), T(note + ' Örtü her yönden yaklaşık 15 cm taşacak şekilde hesaplandı.')];
}

/* ---------- Raf sistemi: tabla ihtiyacı ve yük uyarısı ---------- */
function rafKutu(P, R) {
  const e = R.ek, ft = CFL[+P.rfm || 0], grp = {}; e.U.forEach((u) => { grp[u.nb] = (grp[u.nb] || 0) + 1; });
  const items = Object.entries(grp).map(([nb, c]) => { const len = nb * e.s + 30; return { n: fm(len) + ' × ' + fm(e.Du) + ' m tabla (' + c + ' ünite × ' + e.nk + ' kat)', c: c * e.nk, w: e.Du / 1000, l: len / 1000 }; });
  const b = items.length ? kaplama(ft, items) : { rows: [] };
  return [[H('Tabla ihtiyacı'), R_('Toplam raf alanı', fx1(e.At) + ' m²'), ...satirlar(b.rows), T(ft.note), ...(e.Du > 1100 ? [W('Tabla açıklığı ' + fm(e.Du) + ' m: 18 mm levha bu açıklıkta ağır yükte eğilir. Daha kalın levha kullanın veya tek sıra derinliği seçin.')] : []),
    T('Tabla malzemesi satışa dahil değildir. Tablalar derinlik boyunca uzanır, ön ve arka kuşağa oturur.')],
  [H('Yük uyarısı'), W('Konnektörlerin kat başına taşıma kapasitesi henüz ölçülmedi. Bu raf hafif yük için tasarlanmıştır: kutu, ambalaj, hobi malzemesi, saksı. Ağır yük (motor parçası, çimento, kitap istifi) koymayın ve rafı mutlaka duvara sabitleyin. Kapasite testi yaptırmadan rafın üzerine çıkmayın.')]];
}

/* ---------- Ortak ve diğer modüller ---------- */
const lev = (R, ad) => (R.levha || []).find((r) => r[0] === ad);
const levSatir = (R, ...adlar) => adlar.map((a) => lev(R, a)).filter(Boolean).map((r) => R_(r[0], r[1]));
const KURUTMA = [['Yer:', 'Tezgahı güneş alan, rüzgârlı ve tozdan uzak bir yere kurun; ev önünde yol tozundan uzak durması önemlidir.'], ['Dilimleme:', 'Domatesi ikiye veya dörde, elmayı 5-8 mm halka şeklinde kesin; dilimler tek kat ve birbirine değmeden serilsin.'], ['Kapak:', 'Gündüz kapak kapalı kalsın; sinek teli böcek ve kuşlardan korur. Akşam nem ve çiyden korumak için ürünü içeri alın veya üstünü örtün.'],
  ['Çevirme:', 'Ürünü günde bir kez çevirin, alt telin altından hava dolaşsın.'], ['Süre:', 'Hava durumuna göre domates yaklaşık 5-10, elma 3-5 güneşli gün sürer (tahmini).'], ['Hijyen:', 'Teli her sezon yıkayın; gıdaya temas eden tel paslanmaz olmalıdır.']];
const MASA = (P) => { const L = P.msL * 10, Wd = P.msW * 10;
  return [[H('Tabla ve raf ölçüsü'), R_('Tabla', fm(L) + ' × ' + fm(Wd) + ' m'), R_('Tabla alanı', ((L * Wd) / 1e6).toFixed(2).replace('.', ',') + ' m²'), ...(+P.msR ? [R_('Raf levhası', fm(L - 20) + ' × ' + fm(Wd - 20) + ' m'), R_('Raf levhası notu', 'ayakların geçtiği yerlerden 3 × 3 cm oyulur')] : []), T('Tabla ve raf levhası satışa dahil değildir; ölçüler levhayı kestirmeniz içindir. 18 mm MDF, sunta veya kontrplak uygundur.')],
    [H('Yük uyarısı'), W('Masanın taşıma kapasitesi henüz test edilmedi. Masa çalışma, paketleme ve hafif işler içindir; üzerine çıkmayın, ağır makine veya örs koymayın. Tablayı iskelete vidayla sabitleyin.')]]; };
const gunesCihaz = (R) => R;

export function kutular(m, P, R) {
  const k = { kutu: [], parcaNot: '', dip: KONNOT };
  switch (m) {
    case 'S': k.kutu = [seraKutu(P, R)]; k.dip = 'Ölçüler DWG verisinden. Dayanım ve kar yükü hesabı mühendis onayı gerektirir.'; break;
    case 'K':
      if (P.ks === 'H') { k.kutu = [hobiKutu(R.ek)]; k.dip = 'Konnektör eşleştirmesi kol sayısı ve yönlerinden otomatik çıkarıldı, üretimden önce doğrulayın.'; }
      else { k.kutu = [kumesKutu(R.ek.ku, R.ek.ia)]; k.dip = 'Ölçüler DWG verisinden. Dayanım ve kar yükü hesabı mühendis onayı gerektirir.'; }
      break;
    case 'J': { const ku = [0, 1, 2].includes(+P.hxU) ? +P.hxU : 0; k.kutu = [kumesKutu(ku, R.ek.ia), [H('Hareketli kümes'), ...levSatir(R, 'Bölüm', 'Ana profil', 'Kapı', 'Menteşe'), T('Tel kafes, örtü ve zemin sabitleme malzemesi pakete dahil değildir.')],
      [H('Bilgi'), T('Ön alındaki kapı tavana kadar uzanır ve çerçevenin içine oturur. Kapının yeri sabittir. Kümes hafif olduğu için bahçede yeri değiştirilebilir; kullanırken köşelerini zemine sabitleyin.')]]; break; }
    case 'A': k.kutu = arilarKutu(P, R); k.dip = KONNOT + " Dolu bir kovan ballıklarla 60-80 kg'a çıkabilir; kat başına taşıma kapasitesi henüz test edilmedi."; break;
    case 'Q': k.kutu = kusKutu(P, R); k.dip = 'Konnektör eşleştirmesi kol sayısı ve yönlerinden otomatik çıkarıldı, üretimden önce doğrulayın. Rüzgâr ve duvara bağlantı için uzman onayı gerekir; bu tasarım iskelet taslağıdır.'; break;
    case 'F': k.kutu = kediKutu(P, R); k.dip = KONNOT + ' Kedi kapasitesi resmi bir standart değil, aşağıda açıklanan varsayıma dayanır.'; break;
    case 'W': k.kutu = odunKutu(P, R); k.parcaNot = 'Pakete yalnızca aşağıdaki profiller ve konnektörler girer. Çatı örtüsü, kütükler ve ev görseldir, satışa dahil değildir.'; k.dip = KONNOT + ' Kar yükü ve dolu istifin yan duvarlara yaptığı baskı için taşıma kapasitesi test edilmedi; kar yağışı yoğun bölgelerde çatıdaki karı temizleyin.'; k.ayar = [odunCati(P, R)]; break;
    case 'C': k.ayar = [konteynerKutu(P, R)]; k.dip = 'Konnektör eşleştirmesi kol sayısı ve yönlerinden otomatik çıkarıldı, üretimden önce doğrulayın. Dayanım ve yük kapasitesi için mühendis onayı gerekir; bu tasarım yük taşıma konteyneri değil, iskelet taslağıdır.'; break;
    case 'R': k.kutu = rafKutu(P, R); k.dip = 'Konnektör eşleştirmesi kol sayısı ve yönlerinden otomatik çıkarıldı, üretimden önce doğrulayın.'; break;
    case 'D': k.kutu = MASA(P); k.parcaNot = OZEL; break;
    case 'Y': { const A1 = R.ek.A1; k.kutu = [[H('Tel ve kapak'), ...levSatir(R, 'Alt tel (ürün serilen)', 'Kapak teli', 'Toplam tel (%10 payla)'), R_('Tavsiye', 'alt: 1-2 cm gözlü paslanmaz tel · kapak: sinek teli'), R_('Tek seferde kapasite (tahmini)', '~' + Math.round(A1 * 6) + ' kg taze dilimlenmiş domates veya elma'),
      T('Tel satışa dahil değildir; miktarlar alışveriş için tahmindir. Gıdaya temas edeceği için paslanmaz çelik veya gıdaya uygun kaplamalı tel seçin.')], [H('Kurutma rehberi'), ...KURUTMA.map(([l, x]) => LI(l, x))]]; k.parcaNot = OZEL + ' Tel, ürünler ve ev görseldir, satışa dahil değildir.'; break; }
    case 'G': { const { Wo, Do } = R.ek; k.kutu = [[H('Kemer ölçüleri'), ...levSatir(R, 'Geçiş genişliği', 'Geçiş yüksekliği', 'Geçiş yüksekliği (ortada)', 'Yan yükseklik (saçak)', 'Derinlik'), R_('Taban alanı', ((Wo * Do) / 1e6).toFixed(2).replace('.', ',') + ' m²'), T('Sarmaşık gül, yasemin, akasma, ortanca sarmaşığı veya üzüm gibi tırmanıcı bitkiler için uygundur. Görseldeki bitkiler ve taş yol satışa dahil değildir.')],
      [H('Sabitleme uyarısı'), W('Kemeri rüzgâra karşı mutlaka zemine sabitleyin: toprakta kazıkla, betonda dübelle. Sabitleme malzemesi pakete dahil değildir. Taşıma kapasitesi test edilmedi; kemere tırmanmayın, ağır saksı asmayın.')]]; break; }
    case 'O': { const e = R.ek, car = e.car; k.kutu = [[H('Araç ve gölgelik'), R_('Araç (' + car.k + ', ortalama)', fm(car.L) + ' × ' + fm(car.W) + ' × ' + fm(car.H) + ' m'), ...levSatir(R, 'İç genişlik', 'Aracın iki yanında boşluk'),
      R_('Gölgelik uzunluğu', fm(e.Do) + ' m (' + e.n + ' bölüm)' + (e.Do < car.L - 20 ? ' · araç ' + fm(car.L - e.Do) + ' m taşar' : e.Do - car.L < 100 ? ' · araç boyu kadar' : ' · önde/arkada ' + fm((e.Do - car.L) / 2) + ' m pay')), ...levSatir(R, 'Giriş yüksekliği (yanda)', 'Giriş yüksekliği (ortada)'),
      R_('Taban alanı', ((e.Wo * e.Do) / 1e6).toFixed(2).replace('.', ',') + ' m²'), T('Araç ölçüleri bu sınıftaki yaygın modellerin ortalamasıdır. Örtü (branda, gölge filesi veya polikarbon) ve araç satışa dahil değildir.')],
      [H('Sabitleme uyarısı'), W('Örtülü gölgelik rüzgârı yelken gibi tutar. Her dikmeyi zemine mutlaka sabitleyin: betonda dübel ve L plakayla, toprakta kazıkla. Sabitleme malzemesi pakete dahil değildir. Kar yükü ve fırtına için test edilmedi; kışın ve fırtınada örtüyü sökün.')]]; break; }
    case 'L': { const d = KLD[Math.max(0, Math.min(KLD.length - 1, +P.klD || 0))], rows = (R.levha || []).map((r) => R_(r[0], r[1])), tip = R_('Kafes tipi', 'ABCDEFG'[d.c] + ' · ' + KLD.filter((x) => x.c == d.c).map((x) => x.k).join(', '));
      k.kutu = [[H('Cihaz ve kafes'), rows[0], rows[1], tip, ...rows.slice(2), T('Cihaz ölçüleri bu sınıftaki yaygın modellerin ortalamasıdır; cihazınızın ölçüsünü kontrol edin. Kafes teli veya delikli sac ve cihaz satışa dahil değildir.')],
        [H('Hava akışı ve bakım'), T('Kafesi seyrek tel (en az 5 cm göz) veya delikli sacla kaplayın; sık tel veya düz sac hava akışını keser, klima verimi düşer. Fan önünde engel bırakmayın. Bakım için ön kapak açılır; kilit veya asma kilit takılabilir. Kafesi zemine ya da duvara sabitleyin.')]]; break; }
    case 'U': { const rows = (R.levha || []).map((r) => R_(r[0], r[1]));
      k.kutu = [[H('Konteyner ve muhafaza'), ...rows, T('Konteyner ölçüleri piyasadaki yaygın modellerin ölçüsüdür; konteynerinizin ölçüsünü kontrol edin. Konteyner ve kaplama malzemesi satışa dahil değildir.')],
        [H('Kullanım'), T('Önde alt kayıt yoktur; konteyner tekerlekleriyle doğrudan içeri girip çıkar. Kapaklı modelde üst kapak açılıp çöp atılır, ön kapı yalnızca boşaltma günü açılır. Yanları ve arkayı tel, delikli sac veya ahşap çıtayla kaplayabilirsiniz. Muhafazayı zemine sabitleyin.')]]; break; }
    case 'P': k.kutu = [[H('Sehpa ve panel'), ...(R.levha || []).slice(0, 3).map((r) => R_(r[0], r[1])), R_('Ön eğik profil (panel taşıyıcı)', F1(R.ek.L1 / 10) + ' cm'), ...(R.levha || []).slice(3).map((r) => R_(r[0], r[1])), R_('Mahya yüksekliği', fm(R.ek.yC + 15) + ' m'), T('Güneş paneli, panel kelepçeleri / bağlantı elemanları, kablo, akü ve inverter pakete dahil değildir.')],
      [H('Uyarılar'), W('Açı 45° sabittir. Zemine sabitleme parçası yoktur; rüzgârda devrilmemesi için her zemin profilinin üzerine 2 adet briket/beton blok konmalıdır. Paneli sehpaya bağlamak için panelinize uygun kelepçe kullanınız.')],
      [H('Kurulum sırası'), T('Yan makasları yerde kurun, boyuna profillerle birleştirin, arka bağı takın; sehpayı yerine koyup briketleri yerleştirin; paneli oturtup kelepçeyle sabitleyin.')]]; k.dip = 'Konnektörler sıkı geçmedir, bu üründe civata kullanılmaz.'; break;
    case 'E': k.kutu = [[H('Likya sera'), ...(R.levha || []).slice(0, 5).map((r) => R_(r[0], r[1])), R_('Kapı', 'Yok (tünel sera)'), T('Örtü (naylon veya polikarbonat) ve zemin sabitleme malzemesi pakete dahil değildir.')],
      [H('Bilgi'), T('Likya sera kapısızdır; tünel sera gibi örtü ön ve arka alından açılır. Ön ve arka alında mahyadan zemine inen orta kolon vardır; 4 bölümden itibaren ortada destek kolonu eklenir, her 2 bölümde bir kolon daha. Seranın köşelerini zemine sabitleyin; rüzgârlı bölgelerde örtüyü gergin bağlayın.')]]; break;
    case 'N': k.kutu = [[H('Aspendos sera'), ...(R.levha || []).map((r) => R_(r[0], r[1])), T('Örtü (naylon veya polikarbonat) ve zemin sabitleme malzemesi pakete dahil değildir.')],
      [H('Bilgi'), T('Ön alındaki kapı tavana kadar uzanır ve çerçevenin içine oturur. Arka alındaki havalandırma penceresi çerçevenin içine oturur, üstten menteşelidir ve aşağıdan dışarı açılır. Kapının ve pencerenin yeri sabittir. Seranın köşelerini zemine sabitleyin.')]]; break;
    case 'X': k.kutu = [[H('Köpek evi'), ...(R.levha || []).slice(0, -1).map((r) => R_(r[0], r[1])), R_('Dikme', '149,5 cm'), R_('Çatı açısı', '45°'), ...(R.levha || []).slice(-1).map((r) => R_(r[0], r[1])), T('Tel kafes, kulübe kaplaması (duvar ve raf tablası), çatı örtüsü ve zemin sabitleme malzemesi pakete dahil değildir.')],
      [H('Uyarılar'), W('Kulübe ile gezinme alanı arasında kapı yoktur, köpek serbestçe geçer. Kapı çerçevenin içine oturur. Yan kol (L) en öndeki bölüme bağlanır; bunun için gezinme alanı en az 2 bölüm olmalıdır. Yapının köşelerini zemine sabitleyin.')]]; break;
    default: break;
  }
  return k;
}
export const bilgiSatir = (e) => (e[0] === 'r' ? e[1] + ' :: ' + e[2] : e[0] === 'li' ? e[1] + ' ' + e[2] : e[0] === 'cal' ? ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'].join('|') : e[1]);
