// Yeni ürünlerin (bahçe kemeri, sera, kümes, sera+yatak seti) iki mağaza için ikas'a eklenecek hâlini üretir.
// Girdi: veri/yeni-urunler/kaynak.json (bahcekulesi.com ürün sayfalarından: fiyat, görsel, ölçü, paket içeriği;
// sera ve kümes ölçüleri ürünün ilk görselindeki teknik çizimden). Çıktı: veri/yeni-urunler/cikti/{hasturk,tarim}.json.
// Ürün adı, adres ve kategori iki mağazada aynıdır; açıklama, meta başlık ve meta açıklama her mağazada ayrı yazılır
// ki arama motorları kopya içerik görmesin. Metinlerde yalnız kaynak sayfadaki ve görsellerdeki bilgiler kullanılır.
// Kullanım: node scripts/yeni-urun-icerik.mjs  (uzunluk ve kopya denetimi; hata varsa çıkış kodu 1)
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const KAYNAK = 'veri/yeni-urunler/kaynak.json';
const CIKTI = 'veri/yeni-urunler/cikti';
const urunler = JSON.parse(await readFile(KAYNAK, 'utf8'));
const hatalar = [];
const SITELER = ['hasturk', 'tarim'];
const MARKA = { hasturk: 'HasTürk', tarim: 'Tarım Dünyası' };

const sayi = (s) => parseFloat(String(s).replace(',', '.'));
const cm = (m) => String(Math.round(sayi(m) * 100));
const fiyatTl = (n) => n.toLocaleString('tr-TR') + ' TL';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ul = (a) => '<ul>' + a.map((x) => `<li>${x}</li>`).join('') + '</ul>';
const tablo = (satirlar) => '<table><tbody>' + satirlar.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('') + '</tbody></table>';
const sss = (liste) => liste.map(([s, c]) => `<h3>${esc(s)}</h3><p>${esc(c)}</p>`).join('');
const kucuk = (s) => s.toLocaleLowerCase('tr-TR');

// --- Kategoriler (adlar ve adresler iki mağazada aynı; meta metinleri ayrı) -------------------------------------
const KAT = { kemer: 'Bahçe Kemerleri', sera: 'Sera İskeletleri', kumes: 'Kümes İskeletleri', set: 'Sera ve Sebze Yatağı Setleri' };
const kategoriler = (site) => [
  {
    // Sera, kümes ve kemerler profimod ürünleriyle aynı galvaniz sistem: tek ana kategori altında (29 Ekim'de taşındı)
    name: 'Galvaniz Modüler Yapılar', slug: 'galvaniz-moduler-yapilar',
    ...(site === 'hasturk'
      ? { pageTitle: 'Galvaniz Modüler Yapılar | HasTürk Gübre', description: 'Galvaniz profil sera ve kümes iskeletleri, bahçe kemerleri, odunluk, raf, tezgah ve kafesler. Kaynaksız, civatalı kolay kurulum, kargoyla kapınıza.' }
      : { pageTitle: 'Galvaniz Bahçe Yapıları ve İskeletler | Tarım Dünyası', description: 'Hobi serası ve kümes iskeletleri, metal gül kemerleri, odunluk, raf ve kafesler. Galvaniz çelik profil, kaynak gerektirmeyen montaj, her bahçeye uygun.' }),
    children: [
      { name: KAT.kemer, slug: 'bahce-kemeri', ...(site === 'hasturk'
        ? { pageTitle: 'Bahçe Kemeri Modelleri | Gül ve Sarmaşık Kemeri', description: 'Galvaniz profil bahçe kemerleri: düz ve kesik çatı, 1-3 bölüm. Sarmaşık gül, yasemin, asma ve sarılgan sebzeler için kaynaksız kurulan metal kemer.' }
        : { pageTitle: 'Metal Gül Kemeri ve Bahçe Tüneli | Tarım Dünyası', description: 'Tırmanıcı gül, yasemin, asma ve sarılgan sebzeler için galvaniz metal bahçe kemerleri ve tünelleri. 6 model, düz ve köşk tipi çatı, kolay montaj.' }) },
      { name: KAT.sera, slug: 'sera-iskeleti', ...(site === 'hasturk'
        ? { pageTitle: 'Modüler Sera İskeleti Fiyatları | Hobi Serası', description: 'Bahçe ve hobi alanları için galvaniz profil modüler sera iskeletleri. Likya ve Olimpos modelleri, 3,8 ile 13 m² arası seçenekler, kaynaksız montaj.' }
        : { pageTitle: 'Hobi Serası İskeleti Modelleri | Tarım Dünyası', description: 'Dört mevsim yetiştiricilik için galvaniz çelik hobi serası iskeletleri. Örtü ya da polikarbonla kaplanır; Likya ve Olimpos serisi, farklı metrekareler.' }) },
      { name: KAT.kumes, slug: 'kumes-iskeleti', ...(site === 'hasturk'
        ? { pageTitle: 'Modüler Kümes İskeleti | Bahçe Tavuk Kümesi', description: 'Bahçede hobi tavukçuluğu için galvaniz profil modüler kümes iskeletleri. 1,5 m² mini kümes ve sera olarak da kullanılan 3,8 m² model, kaynaksız kurulum.' }
        : { pageTitle: 'Bahçe Tavuk Kümesi İskeleti | Tarım Dünyası', description: 'Hobi tavukçuluğu için galvaniz çelik modüler kümes iskeletleri. Küçük bahçelere 1,5 m² mini kümes, büyüyen sürüler için 3,8 m² sera-kümes iskeleti.' }) },
      { name: KAT.set, slug: 'sera-ve-sebze-yatagi-seti', ...(site === 'hasturk'
        ? { pageTitle: 'Sera ve Sebze Yatağı Seti | Tek Siparişte Bahçe', description: 'Seraya uygun ölçüde U şekilli sebze yatağıyla birlikte gelen galvaniz profil sera iskeleti setleri. Tek siparişle örtülü yetiştirme alanınızı kurun.' }
        : { pageTitle: 'Sera ve Sebze Yatağı Seti | Tarım Dünyası', description: 'Hobi serası iskeleti ve içine göre tasarlanmış U şekilli sebze yatağı bir arada. Tek siparişle örtülü sebze bahçenizi kurmanız için gereken set.' }) },
    ],
  },
];

// --- Bahçe kemerleri ---------------------------------------------------------------------------------------
const kemerler = urunler.filter((u) => u.tur === 'kemer');
const catiAd = { duz: 'Düz Çatı', kesik: 'Kesik Çatı' };
const olcuCm = (dis) => dis.split(' × ').map(cm).join('x');
const kemerGiris = {
  hasturk: {
    'duz-1': 'Bahçe girişine, yürüyüş yolunun başına ya da iki sebze yatağının arasına kurulan klasik bir gül ve sarmaşık kemeri. Düz çatısı sayesinde serideki en yüksek geçişi verir; sarmaşık gül, yasemin ve akasma birkaç sezonda kemeri sararak bahçeye gösterişli bir giriş kazandırır.',
    'duz-2': 'İki bölümlü, 1,58 m derinliğinde düz çatılı bahçe kemeri. Tek bölümlü modele göre daha dolgun bir yeşil geçit oluşturur: sarmaşık gül ve yasemin için gösterişli bir çiçek kemeri, kabak ve fasulye gibi sarılgan sebzeler için kısa bir tünel olarak kullanılır.',
    'duz-3': 'Üç bölümlü, 2,35 m derinliğinde düz çatılı bahçe tüneli. Asma, üzüm, su kabağı ve fasulye üzerinde ilerleyerek uzun bir yeşil koridor oluşturur; yaz aylarında altında gölgeli bir yürüyüş yolu kalır.',
    'kesik-1': 'Kesik (köşk tipi) çatılı, tek bölümlü bahçe kemeri. Eğimli çatı hatları klasik bir kemer görünümü verir; 1,86 m geçiş genişliğiyle bahçe girişleri, yürüyüş yolları ve düğün süslemeleri için ferah bir geçit oluşturur.',
    'kesik-2': 'Kesik (köşk tipi) çatılı, iki bölümlü bahçe kemeri. 1,86 m geniş geçişi ve 1,58 m derinliğiyle sarmaşık gül ve yasemin için dolgun bir çiçek kemeri, sarılgan sebzeler için kısa bir tünel olur.',
    'kesik-3': 'Kesik (köşk tipi) çatılı, üç bölümlü bahçe tüneli. Serinin en geniş ve en derin modelidir: 1,86 m geçiş genişliği ve 2,35 m derinliğiyle asma, üzüm ve su kabağı için gölgeli, ferah bir yürüyüş koridoru oluşturur.',
  },
  tarim: {
    'duz-1': 'Bahçenize bir giriş kapısı gibi duran, tek bölümlü düz çatılı metal kemer. 2,31 m geçiş yüksekliğiyle uzun boylu biri bile eğilmeden geçer; tırmanıcı gül, yasemin ya da akasma dikildiğinde kısa sürede yeşil bir çerçeveye dönüşür.',
    'duz-2': 'Yürüyüş yolunuzu 1,58 m boyunca yeşille örtmek için iki bölümlü düz çatılı kemer. Hem çiçekli sarmaşıklar hem de fasulye, kabak, salatalık gibi sarılgan sebzeler için kullanılır; altında kısa bir gölge tüneli oluşur.',
    'duz-3': 'Yazın altında serin bir yol isteyenler için 2,35 m uzunluğunda, üç bölümlü düz çatılı bahçe tüneli. Asma ve üzüm, su kabağı ya da sırık fasulye bu tünelin üzerinde ilerleyerek yürüyüş yolunuzu gölgeler.',
    'kesik-1': 'Köşk tipi eğimli çatısıyla klasik kemer görünümünü arayanlar için tek bölümlü model. 1,86 m genişliğindeki geçişi el arabasıyla geçmeye bile yeter; bahçe girişleri, düğün ve davet süslemeleri için de kullanılır.',
    'kesik-2': 'Köşk tipi çatılı, iki bölümlü kemer: geniş bir giriş ve 1,58 m boyunca devam eden kısa bir çiçek tüneli. Sarmaşık gül ve yasemin ile dolgun bir kemer, sarılgan sebzelerle verimli bir tünel olur.',
    'kesik-3': 'Serinin en geniş tüneli: köşk tipi çatı, 1,86 m geçiş ve 2,35 m uzunluk. Asma, üzüm ve su kabağı için bahçenin bir köşesinde gölgeli bir oturma ya da yürüyüş alanı oluşturur.',
  },
};
const kemerAd = (u) => `Galvaniz Bahçe Kemeri ${catiAd[u.cati]} ${u.bolum} Bölüm ${olcuCm(u.dis)} cm – Gül ve Sarmaşık Kemeri`;
const kemerSlug = (u) => `galvaniz-bahce-kemeri-${u.cati}-cati-${u.bolum}-bolum`;
const tunelMi = (u) => (u.bolum === 3 ? 'bahçe tüneli' : 'bahçe kemeri');
function kemerMeta(u, site) {
  if (site === 'hasturk') return {
    pageTitle: `${catiAd[u.cati]} Bahçe Kemeri ${u.bolum} Bölüm ${olcuCm(u.dis)} cm | HasTürk`,
    description: `Galvaniz ${kucuk(catiAd[u.cati])} ${tunelMi(u)}, ${u.bolum} bölüm, ${u.dis} m. Gül, sarmaşık ve asma için kaynaksız, civatalı kurulum. Paket içeriği ve ölçüler.`,
  };
  return {
    pageTitle: `Metal Gül Kemeri ${catiAd[u.cati]} ${u.bolum} Bölüm | Tarım Dünyası`,
    description: `${u.dis} m ${kucuk(catiAd[u.cati])}, ${u.bolum} bölümlü metal ${tunelMi(u)}. Galvaniz profil, kaynaksız montaj, resimli kılavuz. Sarmaşık gül ve asma için.`,
  };
}
function kemerOlcu(u) {
  const s = [['Dış ölçü (genişlik × derinlik × yükseklik)', `${u.dis} m`], ['Geçiş genişliği', `${u.gecisGenislik} m`], [u.sacak ? 'Geçiş yüksekliği (ortada)' : 'Geçiş yüksekliği', `${u.gecisYukseklik} m`]];
  if (u.sacak) s.push(['Yan yükseklik (saçak)', `${u.sacak} m`]);
  s.push(['Taban alanı', `${u.taban} m²`], ['Bölüm sayısı', `${u.bolum} (her bölüm 77,5 cm)`], ['Profil', '30×30×1,2 mm galvaniz kutu profil, 74,5 cm tek boy'], ['Konnektör', '%30 cam elyaf takviyeli poliamid (PA)'], ['Toplam profil ağırlığı', `yaklaşık ${u.agirlik} kg`]);
  return s;
}
function kemerTablosu(u) {
  const sirali = kemerler.slice().sort((a, b) => (a.cati === b.cati ? a.bolum - b.bolum : a.cati === 'duz' ? -1 : 1));
  const satir = sirali.map((k) => {
    const ad = `${catiAd[k.cati]}, ${k.bolum} bölüm`;
    const link = k === u ? `<strong>${ad} (bu ürün)</strong>` : `<a href="/${kemerSlug(k)}">${ad}</a>`;
    return `<tr><td>${link}</td><td>${k.dis} m</td><td>${k.gecisGenislik} m</td><td>${k.gecisYukseklik} m</td><td>${fiyatTl(k.fiyat)}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Model</th><th>Dış ölçü</th><th>Geçiş genişliği</th><th>Geçiş yüksekliği</th><th>Fiyat</th></tr></thead><tbody>${satir}</tbody></table>`;
}
function kemerSss(u, site) {
  const l = [
    ['Kemer paslanır mı?', 'Profiller galvaniz kaplamalıdır ve dış mekânda paslanmaya karşı korunur. Konnektörler cam elyaf takviyeli poliamid (PA) plastiktir.'],
    ['Kurulum için kaynak ya da delme gerekir mi?', 'Hayır. Profiller konnektörlere oturur ve civata-somunla sabitlenir. Kesim, delme veya kaynak gerekmez; kurulum anahtarı ve basılı resimli kılavuz pakettedir.'],
    ['Zemine sabitleme malzemesi pakette var mı?', 'Hayır. Pakette yalnızca iskelet (profil, konnektör, civata) bulunur. Kemeri rüzgâra karşı mutlaka zemine sabitleyin: toprakta kazık, betonda dübel kullanın.'],
    ['Bitki ya da taş yol dahil mi?', 'Hayır, bitkiler, taş yol ve zemin sabitleme malzemesi dahil değildir.'],
    ['Düz çatı ile kesik çatı arasındaki fark nedir?', 'Düz çatılı modeller daha yüksektir (geçiş yüksekliği 2,31 m). Kesik (köşk tipi) çatılı modellerin geçişi daha geniştir (1,86 m); eğimli çatı klasik bir kemer görünümü verir.'],
    ['Kemere saksı asılabilir mi?', 'Kemere ağır saksı asılmamalı ve kemere tırmanılmamalıdır.'],
    ['Kemer ne kadar ağır?', `Bu modelin toplam profil ağırlığı yaklaşık ${u.agirlik} kg'dır.`],
  ];
  return site === 'hasturk' ? l : [l[4], l[1], l[0], l[2], l[6], l[5], l[3]];
}
function kemerAciklama(u, site) {
  const g = kemerGiris[site][`${u.cati}-${u.bolum}`];
  if (site === 'hasturk') return [
    `<p>${g}</p>`, '<h2>Öne çıkan özellikler</h2>',
    ul([
      '<strong>Bahçeyi yukarı büyütür:</strong> Tırmanıcı bitkiler ve sarılgan sebzeler yerde yer kaplamadan yukarı yönlendirilir; aynı alanda daha çok bitki yetişir.',
      '<strong>Tek tip parça:</strong> Bütün iskelet aynı boyda, 74,5 cm\'lik 30×30×1,2 mm galvaniz kutu profilden kurulur; parça karıştırma derdi yoktur.',
      '<strong>Kaynaksız kurulum:</strong> Profiller %30 cam elyaf takviyeli poliamid konnektörlere boşluksuz oturur ve civata-somunla sabitlenir.',
      '<strong>Dış mekâna dayanıklı:</strong> Galvaniz kaplamalı profiller paslanmaya karşı korunur.',
      '<strong>Resimli kurulum kılavuzu:</strong> Pakete basılı olarak eklenir; kemeri adım adım kendiniz kurarsınız.',
    ]),
    `<h2>${catiAd[u.cati]} ${u.bolum} bölüm bahçe kemeri ölçüleri</h2>`, tablo(kemerOlcu(u)),
    '<h2>Paket içeriği</h2>', ul(u.paket.map(esc)),
    '<h2>Hangi bitkiler için uygun?</h2>',
    '<p>Sarmaşık gül, yasemin ve akasma gibi tırmanıcı süs bitkileri; asma ve üzüm; kabak, su kabağı, fasulye ve salatalık gibi sarılgan sebzeler. Kemer bahçe girişinde, yürüyüş yolunda, sebze yataklarının arasında ya da düğün ve organizasyon süslemesinde kullanılır.</p>',
    '<h2>Kurulum ve güvenlik</h2>',
    '<p>Pakette yalnızca iskelet bulunur. Kurulumdan sonra kemeri rüzgâra karşı mutlaka zemine sabitleyin: toprakta kazık, betonda dübel kullanın. Kemere tırmanmayın ve ağır saksı asmayın.</p>',
    '<h2>Hangi modeli seçmeliyim?</h2>',
    '<p>Serideki 6 modelde düz çatılılar daha yüksek, kesik çatılılar daha geniş geçişlidir. Bölüm sayısı arttıkça kemer bir gölgelik tüneline dönüşür.</p>',
    kemerTablosu(u), '<h2>Sık sorulan sorular</h2>', sss(kemerSss(u, site)),
  ].join('\n');
  return [
    `<p>${g}</p>`, '<h2>Bu kemer kimin için?</h2>',
    ul(['Bahçe girişine ya da yürüyüş yoluna dekoratif bir geçit isteyenler', 'Sarmaşık gül, yasemin, akasma gibi tırmanıcı bitkilere destek arayanlar', 'Asma, üzüm, kabak, fasulye ve salatalığı yerden kaldırıp yukarı yönlendirmek isteyenler', 'Düğün, nişan ve bahçe davetleri için süslenecek sağlam bir iskelet arayanlar']),
    '<h2>Teknik bilgiler</h2>', tablo(kemerOlcu(u)),
    '<h2>Neden bu iskelet sistemi?</h2>',
    '<p>Kemerin bütün iskeleti tek boy (74,5 cm) galvaniz kutu profilden oluşur; hangi parçanın nereye gideceğini düşünmeden kurarsınız. Profiller cam elyaf takviyeli poliamid konnektörlere boşluksuz oturur ve civata-somunla sıkılır. Kesim, delme ya da kaynak gerekmez; galvaniz kaplama dış mekânda paslanmaya karşı korur. Her bölüm 77,5 cm\'dir ve bölüm sayısı arttıkça kemer gölgelik tüneline dönüşür.</p>',
    '<h2>Kutudan çıkanlar</h2>', ul(u.paket.map(esc)),
    '<p>Bitkiler, taş yol ve zemin sabitleme malzemesi pakete dahil değildir. Kurduktan sonra kemeri toprakta kazıkla, betonda dübelle zemine sabitleyin; kemere tırmanmayın ve ağır saksı asmayın.</p>',
    `<h2>${catiAd[u.cati]} mı, ${u.cati === 'duz' ? 'kesik' : 'düz'} çatı mı?</h2>`,
    '<p>Daha yüksek bir geçiş istiyorsanız düz çatılı, daha geniş bir geçiş ve klasik kemer görünümü istiyorsanız kesik (köşk tipi) çatılı modeli seçin. Tüm modeller:</p>',
    kemerTablosu(u), '<h2>Merak edilenler</h2>', sss(kemerSss(u, site)),
  ].join('\n');
}

// --- Sera ve kümes iskeletleri -------------------------------------------------------------------------------
const yapilar = urunler.filter((u) => ['sera', 'sera-kumes', 'kumes'].includes(u.tur));
const seraKumesi = yapilar.find((u) => u.tur === 'sera-kumes');
const tabanCm = (u) => `${cm(u.en)}x${cm(u.boy)}`;
function yapiAd(u) {
  if (u.tur === 'kumes') return `Galvaniz Modüler Mini Kümes İskeleti ${u.m2} m² (${tabanCm(u)} cm)`;
  if (u.tur === 'sera-kumes') return `Galvaniz Modüler Sera ve Kümes İskeleti ${u.m2} m² (${tabanCm(u)} cm)`;
  return `Galvaniz Modüler Sera İskeleti ${u.model} ${u.m2} m² (${tabanCm(u)} cm)`;
}
function yapiSlug(u) {
  if (u.tur === 'kumes') return `galvaniz-mini-kumes-iskeleti-${cm(u.m2) / 100 === 1.5 ? '1-5' : u.m2.replace(',', '-')}-m2`;
  if (u.tur === 'sera-kumes') return `galvaniz-sera-ve-kumes-iskeleti-${u.m2.replace(',', '-')}-m2`;
  return `galvaniz-sera-iskeleti-${kucuk(u.model).replace(/ /g, '-')}-${u.m2.replace(',', '-')}-m2`;
}
const yapiKat = (u) => (u.tur === 'kumes' ? [KAT.kumes] : u.tur === 'sera-kumes' ? [KAT.sera, KAT.kumes] : [KAT.sera]);
const kisaAd = (u) => (u.tur === 'kumes' ? 'mini kümes iskeleti' : u.tur === 'sera-kumes' ? 'sera ve kümes iskeleti' : `${u.model} sera iskeleti`);
function yapiMeta(u, site) {
  const taban = `${u.en} × ${u.boy} m`;
  if (u.tur === 'kumes') return site === 'hasturk'
    ? { pageTitle: `Mini Kümes İskeleti ${u.m2} m² Galvaniz | HasTürk`, description: `${taban} tabanlı, ${u.tepe} m yüksekliğinde galvaniz modüler mini kümes iskeleti. Kapı kanatlı, kaynaksız civatalı kurulum. Hobi tavukçuluğu için.` }
    : { pageTitle: `Bahçe Tavuk Kümesi İskeleti ${u.m2} m² | Tarım Dünyası`, description: `Küçük bahçeler için ${u.m2} m² mini tavuk kümesi iskeleti: ${taban} taban, ${u.yan} m yan, ${u.tepe} m tepe yüksekliği. Galvaniz çelik, kolay montaj.` };
  if (u.tur === 'sera-kumes') return site === 'hasturk'
    ? { pageTitle: `Sera ve Kümes İskeleti ${u.m2} m² Galvaniz | HasTürk`, description: `${taban} taban, ${u.tepe} m yükseklik. Sera, kümes ya da depo olarak kaplanan galvaniz modüler iskelet. Kapı kanatlı, kaynaksız civatalı kurulum.` }
    : { pageTitle: `${u.m2} m² Hobi Serası ve Kümes İskeleti | Tarım Dünyası`, description: `Örtüyle sera, telle kümes, kaplamayla bahçe deposu: ${taban} tabanlı, ${u.tepe} m yüksek galvaniz çelik iskelet. Kapısı var, kaynak gerekmez.` };
  return site === 'hasturk'
    ? { pageTitle: `${u.model} Sera İskeleti ${u.m2} m² Galvaniz | HasTürk`, description: `${taban} tabanlı, ${u.tepe} m tepe yüksekliğinde galvaniz modüler hobi serası iskeleti. Örtü veya polikarbonla kaplanır, kaynaksız civatalı kurulum.` }
    : { pageTitle: `${u.model} Hobi Serası ${u.m2} m² | Tarım Dünyası`, description: `${u.m2} m² hobi serası iskeleti: ${taban} taban, ${u.yan} m yan ve ${u.tepe} m tepe yüksekliği. Galvaniz çelik profil, sera naylonu ya da polikarbonla kaplanır.` };
}
function yapiOlcu(u) {
  const s = [['Kullanım alanı', `${u.m2} m²`], ['Taban (en × boy)', `${u.en} × ${u.boy} m`], ['Yan duvar yüksekliği', `${u.yan} m`], ['Tepe (mahya) yüksekliği', `${u.tepe} m`], ['Çatı', 'Beşik (iki yana eğimli) çatı']];
  if (u.kapi) s.push(['Kapı', 'Teknik çizimde menteşeli kapı kanadı bulunur']);
  s.push(['Profil', 'Galvaniz çelik profil'], ['Konnektör', 'Fiber katkılı poliamid'], ['Model kodu', u.sku]);
  return s;
}
const kutu = ['Galvaniz çelik profiller', 'Fiber katkılı poliamid konnektörler', 'Civatalar ve somunlar', 'Kurulum anahtarları', 'Profimod kurulum kılavuzu'];
function seraTablosu(u) {
  const seralar = yapilar.filter((x) => x.tur !== 'kumes').sort((a, b) => sayi(a.m2) - sayi(b.m2));
  return `<table><thead><tr><th>Model</th><th>Alan</th><th>Taban</th><th>Tepe yüksekliği</th><th>Fiyat</th></tr></thead><tbody>${seralar.map((k) => {
    const ad = k.tur === 'sera-kumes' ? 'Sera/Kümes 3,8 m²' : k.model;
    return `<tr><td>${k === u ? `<strong>${ad} (bu ürün)</strong>` : `<a href="/${yapiSlug(k)}">${ad}</a>`}</td><td>${k.m2} m²</td><td>${k.en} × ${k.boy} m</td><td>${k.tepe} m</td><td>${fiyatTl(k.fiyat)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
const yapiGiris = {
  hasturk: {
    P0001: 'Likya serisinin giriş modeli: 2,2 × 3 m taban üzerinde 6,8 m²lik bir hobi serası iskeleti. Bahçede fide yetiştirmek, kışın sebze üretimini sürdürmek ya da hassas bitkileri korumak için dört mevsim kullanılacak örtülü bir alan oluşturur.',
    P0002: 'Likya serisinin 10 m²lik modeli: aynı 2,2 m genişlik, 4,5 m uzunluk. Daha fazla sıra fide, domates, biber ve yeşillik için uzun bir hobi serası iskeleti; ortasından yürüyerek iki yandaki ekimlere ulaşırsınız.',
    P0003: 'Likya serisinin en büyük modeli: 2,2 × 6 m taban, 13 m² kullanım alanı. Aile ihtiyacını karşılayacak ölçüde sebze ve fide üretmek isteyenler için uzun, ferah bir hobi serası iskeleti.',
    P0005: 'Olimpos serisinin 5,3 m²lik modeli: 2,35 × 2,25 m kareye yakın taban, menteşeli kapı kanadı ve çatıda sık kirişli yapı. Bahçenin bir köşesine sığan, dört mevsim kullanılacak bir hobi serası iskeleti.',
    P0006: 'Olimpos serisinin geniş modeli: 3,9 × 2,25 m taban ve 9 m² kullanım alanı. Kapı kanadı ve sık çatı kirişleriyle hem yetiştirme hem de raf ve tezgâh kurmaya elverişli bir hobi serası iskeleti.',
    P0004: '1,6 × 2,35 m tabanlı, 2,35 m yüksekliğinde çok amaçlı modüler iskelet. Sera örtüsü ya da polikarbonla kaplandığında hobi serası, tel ile kaplandığında tavuk kümesi, kapalı bir kaplamayla bahçe deposu olarak kullanılır.',
    P0007: '1 × 1,5 m tabanlı, 1,6 m yüksekliğinde mini kümes iskeleti. Bahçede birkaç tavukla hobi tavukçuluğuna başlamak isteyenler için kapı kanatlı, beşik çatılı, kaynaksız kurulan bir iskelet.',
  },
  tarim: {
    P0001: 'Kendi fidesini yetiştirmek, kışın da taze yeşillik toplamak isteyenler için 6,8 m²lik Likya Medium. 2,2 m genişliği ve 3 m uzunluğuyla orta boy bahçelere rahatça yerleşir; çatı mahyası 2,7 m yüksekliktedir.',
    P0002: 'Likya Large, 4,5 m uzunluğuyla ortadan yürüme yolu bırakıp iki yanına uzun ekim sıraları kurmaya uygun bir hobi serası iskeletidir. 10 m² alan; domates, biber, salatalık ve fideler için bol yer demektir.',
    P0003: 'Serada ciddi üretim yapmak isteyen hobi bahçıvanları için 6 m uzunluğunda Likya XLarge. 13 m²lik alanı, ilkbaharda fideliğe, yazın sebze üretimine, kışın yeşilliğe ayrılabilir.',
    P0005: 'Olimpos, kareye yakın 2,35 × 2,25 m tabanıyla küçük bahçelere uygun, kapı kanatlı bir hobi serasıdır. Sık kirişli çatısı örtü ya da polikarbon levhaların oturması için daha çok taşıyıcı hat sunar.',
    P0006: 'Olimpos Large, 3,9 m cephesi ve kapı kanadıyla bahçeye bakan geniş bir hobi serası kurmak isteyenler için. 9 m² içinde yetiştirme sıraları ile fide rafları bir arada düzenlenebilir.',
    P0004: 'Tek iskelet, üç farklı kullanım: sera naylonu ya da polikarbonla örterseniz hobi serası, kümes teliyle sararsanız tavuk kümesi, levhayla kaplarsanız bahçe deposu. 1,6 × 2,35 m taban, 2,35 m yükseklik.',
    P0007: 'Birkaç tavukla başlamak için yeterli, küçük bahçeye sığan mini kümes iskeleti: 1 × 1,5 m taban, 1 m yan ve 1,6 m tepe yüksekliği. Kapı kanadı sayesinde yem, su ve yumurta toplama kolaydır.',
  },
};
function yapiSss(u, site) {
  const kaplama = u.tur === 'kumes'
    ? ['Kümes teli ve çatı örtüsü pakette var mı?', 'Ürün iskelet setidir: profiller, konnektörler, civata, somun ve anahtarlar kutudadır. Kümes teli ve çatı örtüsü ihtiyaca göre ayrıca seçilir.']
    : ['Sera örtüsü pakette var mı?', 'Ürün iskelet setidir: profiller, konnektörler, civata, somun ve anahtarlar kutudadır. İskeleti ihtiyacınıza göre sera örtüsü (naylon) ya da polikarbon levhayla kaplayabilirsiniz; kaplama malzemesi ayrıca seçilir.'];
  const l = [
    kaplama,
    ['Kurulum için kaynak gerekir mi?', 'Hayır. Profiller fiber katkılı poliamid konnektörlere takılır ve civatalarla sıkılır. Kaynak ya da karmaşık işçilik gerekmez; kurulum için gereken anahtarlar kutudadır.'],
    ['Kurulum nasıl yapılır?', 'Önce kurulum alanının zeminini düzleyin, ardından kurulum kılavuzunu okuyun. Profilleri konnektörlerle birleştirin, civataları iyice sıkın ve kullanmaya başlayın.'],
    ['İskelet paslanır mı?', 'Profiller galvaniz kaplı çeliktir; galvaniz kaplama dış mekânda paslanmaya karşı korur.'],
    ['Ölçüleri nedir?', `Taban ${u.en} × ${u.boy} m, yan duvar yüksekliği ${u.yan} m, tepe yüksekliği ${u.tepe} m; kullanım alanı yaklaşık ${u.m2} m².`],
  ];
  if (u.kapi) l.push(['Kapısı var mı?', 'Evet, teknik çizimde menteşeli bir kapı kanadı bulunur.']);
  if (u.tur === 'sera-kumes') l.push(['Hem sera hem kümes olarak kullanılabilir mi?', 'Aynı iskelet örtüyle kaplandığında sera, telle kaplandığında kümes, kapalı bir kaplamayla depo olarak kullanılır. Bir seferde tek amaçla kaplanır.']);
  return site === 'hasturk' ? l : [l[4], l[0], ...l.slice(5), l[2], l[1], l[3]];
}
function yapiAciklama(u, site) {
  const g = yapiGiris[site][u.sku];
  const olcu = tablo(yapiOlcu(u));
  const kullanim = u.tur === 'kumes'
    ? ul(['Bahçede birkaç tavukla hobi tavukçuluğu', 'Kümes teli ve çatı örtüsüyle kaplanarak gece barınağı ve gündüz gezinti alanı', 'Kaynaksız, civatalı yapı sayesinde gerektiğinde sökülüp başka yere kurulabilir'])
    : u.tur === 'sera-kumes'
      ? ul(['<strong>Sera:</strong> sera örtüsü ya da polikarbonla kaplanarak fide ve sebze yetiştirme', '<strong>Kümes:</strong> kümes teliyle sarılarak hobi tavukçuluğu', '<strong>Depo:</strong> levha kaplamayla bahçe aletleri için kapalı alan'])
      : ul(['Fide yetiştirme ve ilkbaharda ekimi öne çekme', 'Kışın yeşillik ve sebze üretimini sürdürme', 'Soğuğa hassas bitkileri koruma', 'Örtüyü ihtiyaca göre seçme: sera naylonu ya da polikarbon']);
  const kemer = (site === 'hasturk' ? 'Profillerin ' : 'İskeletin ') + 'galvaniz kaplaması dış mekânda paslanmaya karşı korur; köşelerdeki fiber katkılı poliamid konnektörler profilleri boşluksuz tutar.';
  const seriNot = u.seri === 'Likya'
    ? 'Likya serisi aynı 2,2 m genişlik ve 2,7 m tepe yüksekliğini korur; uzunluk 3 m, 4,5 m ve 6 m seçenekleriyle büyür.'
    : u.seri === 'Olimpos' ? 'Olimpos serisi kapı kanatlı, sık çatı kirişli yapısıyla öne çıkar; 2,25 m derinlikte 2,35 m ve 3,9 m cephe seçenekleri vardır.' : '';
  const karsilastir = u.tur === 'kumes'
    ? `<p>Daha geniş bir kümes için ${fiyatTl(seraKumesi.fiyat)} fiyatlı <a href="/${yapiSlug(seraKumesi)}">${seraKumesi.m2} m² sera ve kümes iskeletine</a> bakabilirsiniz: ${seraKumesi.en} × ${seraKumesi.boy} m taban, ${seraKumesi.tepe} m yükseklik.</p>`
    : seraTablosu(u);
  if (site === 'hasturk') return [
    `<p>${g}</p>`, '<h2>Öne çıkan özellikler</h2>',
    ul(['<strong>Kaynaksız kurulum:</strong> Profiller konnektörlere takılır ve civatayla sıkılır; karmaşık işçilik gerekmez.', '<strong>İhtiyacınız olan her şey kutuda:</strong> anahtarlar, civatalar ve somunlar pakettedir.', '<strong>Dayanıklı malzeme:</strong> ' + kemer, '<strong>Modüler yapı:</strong> sökülüp yeniden kurulabilir.']),
    `<h2>${kisaAd(u).replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'))} ölçüleri</h2>`, olcu,
    '<h2>Ne için kullanılır?</h2>', kullanim,
    '<h2>Kutu içeriği</h2>', ul(kutu), `<p>${kaplamaNotu(u)}</p>`,
    '<h2>Kurulum adımları</h2>', '<ol><li>Zemini düzleyin.</li><li>Kurulum kılavuzunu okuyun.</li><li>Profilleri konnektörlerle birleştirin.</li><li>Civataları iyice sıkın ve kullanmaya başlayın.</li></ol>',
    `<h2>${u.tur === 'kumes' ? 'Daha büyük bir model mi lazım?' : 'Model karşılaştırma'}</h2>`, seriNot ? `<p>${seriNot}</p>` : '', karsilastir,
    '<h2>Sık sorulan sorular</h2>', sss(yapiSss(u, site)),
  ].filter(Boolean).join('\n');
  return [
    `<p>${g}</p>`, '<h2>Teknik bilgiler</h2>', olcu,
    `<h2>${u.tur === 'kumes' ? 'Kimler için uygun?' : 'Bu iskeletle neler yapılır?'}</h2>`, kullanim,
    '<h2>Malzeme ve dayanıklılık</h2>', `<p>${kemer} Bağlantılar civata ve somunla yapılır; kaynak gerektirmediği için iskelet sökülüp başka bir yere yeniden kurulabilir.</p>`,
    '<h2>Kutudan çıkanlar</h2>', ul(kutu), `<p>${kaplamaNotu(u)}</p>`,
    '<h2>Dört adımda kurulum</h2>', '<p>Kurulum alanının zeminini düzleyin, kılavuzu okuyun, profilleri konnektörlere takın ve civataları sıkın. Kurulum için gereken anahtarlar kutudadır.</p>',
    `<h2>${u.tur === 'kumes' ? 'Diğer seçenek' : 'Hangi boyutu seçmeliyim?'}</h2>`, seriNot ? `<p>${seriNot}</p>` : '', karsilastir,
    '<h2>Merak edilenler</h2>', sss(yapiSss(u, site)),
  ].filter(Boolean).join('\n');
}
function kaplamaNotu(u) {
  return u.tur === 'kumes'
    ? 'Ürün iskelet setidir; kümes teli ve çatı örtüsü ihtiyaca göre ayrıca seçilir.'
    : u.tur === 'sera-kumes'
      ? 'Ürün iskelet setidir; sera örtüsü, polikarbon, kümes teli ya da depo kaplaması kullanım amacına göre ayrıca seçilir.'
      : 'Ürün iskelet setidir; iskeleti ihtiyacınıza göre sera örtüsü (naylon) ya da polikarbon levhayla kaplayabilirsiniz. Kaplama malzemesi ayrıca seçilir.';
}

// --- Sera + sebze yatağı seti --------------------------------------------------------------------------------
const set = urunler.find((u) => u.tur === 'kombinasyon');
const setSera = urunler.find((u) => u.sku === set.seraSku);
const setAd = `Galvaniz Sera İskeleti ${setSera.m2} m² ve U Şekilli Sebze Yatağı Seti`;
const setSlug = `galvaniz-sera-iskeleti-${setSera.m2.replace(',', '-')}-m2-ve-u-sekilli-sebze-yatagi-seti`;
function setMeta(site) {
  return site === 'hasturk'
    ? { pageTitle: `Sera İskeleti ${setSera.m2} m² ve Sebze Yatağı Seti | HasTürk`, description: `${setSera.en} × ${setSera.boy} m galvaniz modüler sera iskeleti ve seraya uygun ölçüde U şekilli sebze yatağı bir arada. Bej veya gri yatak seçeneği.` }
    : { pageTitle: `Hobi Serası ve U Sebze Yatağı Seti | Tarım Dünyası`, description: `Tek siparişte sera ve içindeki yatak: ${setSera.m2} m² galvaniz çelik sera iskeleti ile 220 × 140 cm U şekilli sebze yatağı. Bej ya da gri renk.` };
}
function setAciklama(site) {
  const seraOlcu = tablo([['Sera kullanım alanı', `${setSera.m2} m²`], ['Sera tabanı', `${setSera.en} × ${setSera.boy} m`], ['Sera yan / tepe yüksekliği', `${setSera.yan} m / ${setSera.tepe} m`], ['Kapı', 'Teknik çizimde menteşeli kapı kanadı bulunur'], ['Sebze yatağı biçimi', 'U şekilli, seraya uygun ölçüde özel tasarım'], ['Sebze yatağı dış ölçüsü', set.yatak.dis], ['U yatağın iç açıklığı', set.yatak.ic], ['Yatak rengi', 'Bej veya gri (siparişte seçilir)']]);
  const sorular = [
    ['Sette neler var?', `${setSera.m2} m² galvaniz modüler sera iskeleti ile bu seraya uygun ölçülerde tasarlanmış U şekilli sebze yatağı.`],
    ['Sera örtüsü sete dahil mi?', 'Sera iskelet olarak gelir; iskeleti ihtiyacınıza göre sera örtüsü (naylon) ya da polikarbon levhayla kaplayabilirsiniz. Kaplama malzemesi ayrıca seçilir.'],
    ['Yatak rengini seçebilir miyim?', 'Evet, sebze yatağı bej ya da gri renk seçeneğiyle sipariş edilir.'],
    ['Sera kurulumu için kaynak gerekir mi?', 'Hayır. Profiller fiber katkılı poliamid konnektörlere takılır ve civatalarla sıkılır; kurulum anahtarları kutudadır.'],
    ['Sera tek başına satılıyor mu?', `Evet, aynı iskelet tek başına da satılır: ${yapiAd(setSera)}.`],
  ];
  if (site === 'hasturk') return [
    `<p>Tek siparişle hem ${setSera.m2} m²lik bir seraya hem de bu seranın ölçülerine göre tasarlanmış U şekilli bir sebze yatağına sahip olursunuz. Yatak seranın içine yerleşir; ortadaki ${set.yatak.ic}lik açıklık yürüme yolu olarak kalır ve iki yandaki kollar ile arka kısım ekim alanı olur.</p>`,
    '<h2>Set içeriği</h2>', ul([`<a href="/${yapiSlug(setSera)}">${yapiAd(setSera)}</a>`, `U şekilli sebze yatağı (${set.yatak.dis}, bej veya gri)`]),
    '<h2>Ölçüler</h2>', seraOlcu,
    '<h2>Neden set olarak almalı?</h2>', '<p>Yatak, seranın tabanına göre ölçülendirildiği için ayrı ayrı ölçü hesaplamanız gerekmez. Seranın içinde örtülü, düzenli ve toprağı sınırları belli bir yetiştirme alanı tek seferde kurulur.</p>',
    '<h2>Sera iskeletinin özellikleri</h2>', ul(['Galvaniz çelik profiller, fiber katkılı poliamid konnektörler', 'Kaynaksız, civatalı kurulum; anahtar, civata ve somun kutuda', 'Sera örtüsü ya da polikarbonla kaplanabilir (kaplama ayrıca seçilir)']),
    '<h2>Sık sorulan sorular</h2>', sss(sorular),
  ].join('\n');
  return [
    `<p>Sera kurup içine ne koyacağınızı düşünmeyin: bu sette ${setSera.m2} m² galvaniz çelik sera iskeleti ile tam bu seraya göre çizilmiş U şekilli bir sebze yatağı birlikte gelir. U'nun ortasındaki ${set.yatak.ic}lik boşluk sizin yürüme yolunuz, üç kenar ise ekim alanınız olur.</p>`,
    '<h2>Teknik bilgiler</h2>', seraOlcu,
    '<h2>Setin içinden çıkanlar</h2>', ul([`Sera iskeleti: <a href="/${yapiSlug(setSera)}">${yapiAd(setSera)}</a>`, `U şekilli sebze yatağı: ${set.yatak.dis}, bej ya da gri`]),
    '<h2>Kimler için uygun?</h2>', ul(['Bahçesinde örtülü bir sebze köşesi kurmak isteyenler', 'Domates, biber, marul gibi sebzeleri sera içinde düzenli bir yatakta yetiştirmek isteyenler', 'Sera ve yatak ölçüsünü ayrı ayrı hesaplamakla uğraşmak istemeyenler']),
    '<h2>Kurulum</h2>', '<p>Sera iskeleti kaynak gerektirmez: profiller konnektörlere takılır, civatalar sıkılır. Kurulumdan önce zemini düzlemeniz yeterlidir; anahtarlar kutudadır. Sera iskeleti örtüsüz gelir, sera naylonu ya da polikarbonla kaplanır.</p>',
    '<h2>Merak edilenler</h2>', sss([sorular[0], sorular[2], sorular[1], sorular[4], sorular[3]]),
  ].join('\n');
}

// --- Çıktı ve denetim --------------------------------------------------------------------------------------
function denetle(site, ad, meta) {
  const t = meta.pageTitle.length, d = meta.description.length;
  if (t > 60 || t < 30) hatalar.push(`${site} · ${ad}: meta başlık ${t} karakter (30–60): ${meta.pageTitle}`);
  if (d > 158 || d < 120) hatalar.push(`${site} · ${ad}: meta açıklama ${d} karakter (120–158): ${meta.description}`);
}
const sonuc = {};
for (const site of SITELER) {
  const liste = [];
  const ekle = (u, ad, slug, meta, kategori, aciklama, ek = {}) => {
    const m = { slug, ...meta };
    denetle(site, ad, m);
    liste.push({ kaynak: u.kaynak, sku: u.sku, ad, kategoriler: kategori, fiyat: u.fiyat, indirimli: u.indirimli, gorseller: u.gorseller, metaData: m, aciklama, ...ek });
  };
  for (const u of kemerler) ekle(u, kemerAd(u), kemerSlug(u), kemerMeta(u, site), [KAT.kemer], kemerAciklama(u, site), { agirlikKg: Number(u.agirlik) });
  for (const u of yapilar) ekle(u, yapiAd(u), yapiSlug(u), yapiMeta(u, site), yapiKat(u), yapiAciklama(u, site));
  ekle(set, setAd, setSlug, setMeta(site), [KAT.set], setAciklama(site), { secenek: set.secenek });
  const walk = (a) => a.forEach((c) => { denetle(site, 'kategori ' + c.name, c); if (c.children) walk(c.children); });
  walk(kategoriler(site));
  sonuc[site] = { site, kategoriler: kategoriler(site), urunler: liste };
}
// iki mağaza: ad, adres ve kategori aynı; açıklama ve meta metinleri farklı olmalı
sonuc.hasturk.urunler.forEach((x, i) => {
  const y = sonuc.tarim.urunler[i];
  if (x.ad !== y.ad || x.metaData.slug !== y.metaData.slug) hatalar.push('ad/adres iki mağazada farklı: ' + x.ad);
  for (const k of ['pageTitle', 'description']) if (x.metaData[k] === y.metaData[k]) hatalar.push(`iki mağazada aynı ${k}: ${x.metaData[k]}`);
  if (x.aciklama === y.aciklama) hatalar.push('iki mağazada aynı açıklama: ' + x.ad);
});
const sluglar = sonuc.hasturk.urunler.map((x) => x.metaData.slug);
if (new Set(sluglar).size !== sluglar.length) hatalar.push('aynı adres iki üründe kullanılıyor');
await mkdir(CIKTI, { recursive: true });
for (const site of SITELER) {
  await writeFile(`${CIKTI}/${site}.json`, JSON.stringify(sonuc[site], null, 1) + '\n');
  console.log(`${site}: ${sonuc[site].urunler.length} ürün`);
}
if (hatalar.length) { console.log('HATALAR:\n' + hatalar.join('\n')); process.exit(1); }
console.log('Denetim temiz.');
