// Eski yazıların yeni kapak görselleri: her yazının kendine ait, başka yazıda kullanılmayan bir görseli olur.
// Geçiş yalnızca görseli hâlâ ilk hâlinde olan (panelden değiştirilmemiş) yazılara uygulanır.
const F = (k) => '/blog-statik/foto/' + k + '.webp';
export const KAPAK = {
  'perlit-nedir-nasil-kullanilir': [F('perlit'), 'Ellerle karıştırılan perlitli toprak'],
  'evde-mikro-yesillik-yetistirme': [F('mikro-yesillik'), 'Tepsilerde yetişen mikro yeşillikler'],
  'az-isikta-yasayan-salon-bitkileri': [F('az-isik'), 'Sarı kenarlı yapraklarıyla paşa kılıcı'],
  'kisin-salon-bitkisi-bakimi': [F('kis-salon'), 'Aydınlık pencere önünde saksı bitkileri'],
  'balkonda-kompost-yapimi': [F('kompost'), 'Bahçede yeşil kompost kutusu'],
  'ekim-ayinda-ne-ekilir': [F('tohum-cimlendirme'), 'Topraktan yeni çıkan fasulye fidesi'],
  'saksi-secimi-rehberi': [F('saksi-secimi'), 'Farklı boylarda toprak saksılar'],
  'saksi-bitkileri-gubreleme-takvimi': [F('gubre-takvim'), 'Saksıda yeşim bitkisinin dalları'],
  'salon-bitkilerinde-zararlilar': [F('zararli'), 'Yaprak yüzeyinin yakın çekimi'],
  'tatilde-bitkiler-nasil-sulanir': [F('kasim-salon'), 'Pencere önündeki rafta dizili saksılar'],
  'leonardit-nedir': [F('leonardit'), 'Avuçta koyu renkli, yapılı toprak'],
  'saksida-biber-yetistirme': [F('biber'), 'Dalında kızaran sivri biberler'],
  'sivi-gubre-mi-kati-gubre-mi': [F('kat-bahce'), 'Sandalye üzerinde çiçekli saksı'],
  'aralik-ayinda-bahcede-yapilacaklar': [F('aralik-bahce'), 'Karla kaplı kış bahçesi'],
  'sonbaharda-cim-bakimi': [F('cim-sonbahar'), 'Sonbahar renkleri içinde çim alan'],
  'balkonda-domates-yetistirme': [F('domates-balkon'), 'Balkon korkuluğunda olgunlaşan domatesler'],
  'saksi-degistirme-rehberi': [F('saksi-degistirme'), 'Saksıdan çıkarılmış bitkinin kökleri'],
  'sardunya-bakimi': [F('sardunya'), 'Pembe çiçekli sardunya (Pelargonium)'],
  'meyve-fidani-dikimi': [F('meyve-fidani'), 'Bahçede fidan diken bir grup'],
};

// İkinci düzeltme: konuyla uyuşmayan kapaklar (ör. hümik asit, monstera, lale) konuya uygun görsellerle değiştirildi.
// [yeni görsel, açıklama, değiştirilecek eski görseller] — panelden başka bir görsel seçilmişse dokunulmaz.
export const KAPAK2 = {
  'saksida-limon-agaci-bakimi': [F('limon-saksi'), 'Saksıda meyve vermiş limon ağacı', ['/blog-statik/foto/hero1.webp']],
  'solucan-gubresi-nedir-nasil-kullanilir': [F('vermikompost'), 'Kovadan avuçlanan koyu renkli kompost', ['/blog-statik/foto/kat-sebze.webp']],
  'sivi-gubre-mi-kati-gubre-mi': [F('gubre-granul'), 'Granül gübre taneleri', ['/blog-statik/foto/sera.webp', '/blog-statik/foto/kat-bahce.webp']],
  'saksi-bitkileri-gubreleme-takvimi': [F('saksi-sulama'), 'Serada fidelerin sulama kabıyla sulanması', ['/blog-statik/foto/feslegen.webp', '/blog-statik/foto/gubre-takvim.webp']],
  'npk-nedir-gubre-etiketi': [F('gubre-serpme'), 'Tarlaya serpilmiş gübre', ['/blog-statik/foto/hero4.webp']],
  'monstera-deve-tabani-bakimi': [F('monstera2'), 'Yarık yapraklarıyla monstera (deve tabanı)', ['/blog-statik/foto/saksi-degisimi.webp']],
  'lale-sogani-dikimi': [F('lale2'), 'Açmak üzere olan kırmızı lale', ['/blog-statik/foto/kat-cicek.webp']],
  'evde-mikro-yesillik-yetistirme': [F('mikro2'), 'Mor damarlı lahana mikro yeşillikleri', ['/blog-statik/foto/fide.webp', '/blog-statik/foto/mikro-yesillik.webp']],
  'humik-asit-nedir-ne-ise-yarar': [F('humus-toprak'), 'Avuçta humuslu orman toprağı', ['/blog-statik/foto/humik-asit.webp']],
  'kokopit-nedir-nasil-kullanilir': [F('kokopit-lif'), 'Hindistan cevizi lifi (kokopitin hammaddesi)', ['/blog-statik/foto/kokopit.webp']],
  'sivi-solucan-gubresi-nasil-kullanilir': [F('sulama-kabi'), 'Bakır sulama kabı', ['/blog-statik/foto/sivi-solucan.webp']],
  'kumkuat-bakimi-saksida': [F('kumkuat3'), 'Tabakta olgun kumkuat meyveleri', ['/blog-statik/foto/kumkuat.webp']],
  'kis-oncesi-bahce-temizligi-ve-malclama': [F('organik-gubre'), 'Bahçe yatağına serilmiş kompost ve malç', ['/blog-statik/foto/malc.webp']],
  'kaucuk-agaci-bakimi': [F('kaucuk2'), 'Parlak, geniş yapraklı kauçuk ağacı (Ficus elastica)', ['/blog-statik/foto/kaucuk.webp']],
};

// Üçüncü düzeltme: ürün ambalajı fotoğrafı olan kapaklar konuyu gösteren fotoğraflarla değiştirildi (blog kapağında ürün fotoğrafı kullanılmaz).
// [yeni görsel, açıklama, değiştirilecek eski görseller]
const U = (k) => '/blog-statik/foto/' + k + '.webp';
export const KAPAK3 = {
  'humik-asit-nedir-ne-ise-yarar': [F('humus-toprak'), 'Avuçta humuslu orman toprağı', [U('humix')]],
  'kokopit-nedir-nasil-kullanilir': [F('kokopit-lif'), 'Hindistan cevizi lifi (kokopitin hammaddesi)', [U('cocopeat-blok')]],
  'sivi-solucan-gubresi-nasil-kullanilir': [F('sulama-kabi'), 'Bakır sulama kabı', [U('sivi-solucan-sise')]],
  'sivi-gubre-mi-kati-gubre-mi': [F('gubre-granul'), 'Granül gübre taneleri', [U('uclu-set')]],
  'solucan-gubresi-nedir-nasil-kullanilir': [F('vermikompost'), 'Kovadan avuçlanan koyu renkli kompost', [U('solucan-20kg')]],
  'npk-nedir-gubre-etiketi': [F('gubre-serpme'), 'Tarlaya serpilmiş gübre', [U('npk-etiket')]],
  'saksi-bitkileri-gubreleme-takvimi': [F('saksi-sulama'), 'Serada fidelerin sulama kabıyla sulanması', [U('besin-takvim')]],
  'saksida-limon-agaci-bakimi': [F('limon-saksi'), 'Saksıda meyve vermiş limon ağacı', [U('limon-toprak')]],
  'kil-bilyesi-nedir-nasil-kullanilir': [F('leca'), 'Yakın çekim genleştirilmiş kil bilyeleri', [U('kil-bilyesi')]],
  'ilaclama-pompasi-secimi-akulu-mu-manuel-mi': [F('pulverizator'), 'Sırt tipi ilaçlama pompası', [U('ilaclama-pompasi')]],
  'saksiya-kac-litre-toprak-gider': [F('saksi-toprak'), 'Saksıda kırmızı hercai menekşe', [U('saksi-boyut')]],
  'mezar-bakimi-ve-mezar-topragi': [F('mezar-cicek'), 'Mezar başında çiçekler', [U('mezar-bakimi')]],
  'eski-saksi-topragi-nasil-yenilenir': [F('toprak-yenileme'), 'Saksı değişimi için toprakla doldurulmuş saksılar', [U('eski-toprak')]],
};
