// Blog başlangıç verisi: kategoriler, ayarlar ve "örnek" işaretli birkaç yazı (panelden silinebilir).
// Yazı gövde biçimi md.js'de: ## başlık, > İpucu: …, - liste, | tablo |, ![alt](görsel "açıklama"), [ürün:slug]
// Görseller /blog-statik/foto/ altında (telifsiz CC0 fotoğraflar; yerlerine kendi fotoğraflarınız konabilir).

const F = (k) => '/blog-statik/foto/' + k + '.webp';

export const TOHUM_KATEGORI = [
  { slug: 'bitki-bakimi', ad: 'Bitki Bakımı', kisa: 'İç ve dış mekân bitkileri', aciklama: 'Bitkilerinizin daha sağlıklı, daha canlı ve uzun ömürlü olması için bakım bilgileri: sulama, ışık, saksı değişimi ve sık yapılan hatalar.', gorsel: F('hero1'), menude: true },
  { slug: 'cicekler', ad: 'Çiçekler', kisa: 'Sağlıklı ve uzun ömürlü çiçekler', aciklama: 'Saksıda ve bahçede çiçek yetiştirme, çiçeklenmeyi uzatma ve mevsimlik bakım.', gorsel: F('kat-cicek'), renk: 'pink' },
  { slug: 'toprak-rehberi', ad: 'Toprak Rehberi', kisa: 'Bitkiye göre doğru toprak', aciklama: 'Hangi bitki hangi toprağı sever, toprak nasıl hazırlanır, perlit, torf ve organik madde ne işe yarar.', gorsel: F('fide'), menude: true, renk: 'soil' },
  { slug: 'gubreleme', ad: 'Gübreleme', kisa: 'Ne, ne zaman, ne kadar', aciklama: 'Organik gübreler, solucan gübresi ve doğru gübreleme zamanları.', gorsel: F('saksi-degisimi'), menude: true },
  { slug: 'sebze-meyve', ad: 'Sebze ve Meyve', kisa: 'Evde doğal üretim', aciklama: 'Balkonda, bahçede ve saksıda sebze ve meyve yetiştirme rehberleri.', gorsel: F('kat-sebze'), renk: 'soil' },
  { slug: 'bahce-ipuclari', ad: 'Bahçe İpuçları', kisa: 'Daha yeşil bahçeler', aciklama: 'Bahçe düzeni, mevsimlik işler ve pratik bahçecilik önerileri.', gorsel: F('kat-bahce') },
  { slug: 'ekim-takvimi', ad: 'Ekim Takvimi', kisa: 'Ay ay ne ekilir', aciklama: 'Aylara göre ekim, dikim ve bahçe işleri takvimi.', gorsel: F('sonbahar'), menude: true, renk: 'blue', vitrin: false },
  { slug: 'gundem', ad: 'Gündem', kisa: 'Kısa haberler', aciklama: 'Bahçe ve tarım dünyasından kısa haberler ve mevsimlik uyarılar.', gorsel: F('tarla'), vitrin: false, renk: 'blue' },
];

// Bu Ay Bahçede (yan sütun): her ay için "iş|kısa not" satırları
const AYLIK = {
  0: ['Meyve ağaçlarında kış budaması|don olmayan günlerde', 'Saksı bitkilerini az sulayın|toprak kurudukça', 'Tohum siparişlerini planlayın|ilkbahar için'],
  1: ['Domates ve biber tohumu|içeride, fide için', 'Gül budaması|şubat sonu', 'Saksı toprağını yenileme hazırlığı|bahar öncesi'],
  2: ['Saksı değişimi zamanı|bitkiler uyanırken', 'Marul ve ıspanak ekimi|açık alanda', 'Gübrelemeye başlayın|yeni sürgünlerle'],
  3: ['Fide şaşırtma|hava ısındıkça', 'Çim ekimi ve bakımı|ılık günlerde', 'Salon bitkilerine bahar gübresi|ayda bir'],
  4: ['Domates, biber, patlıcan dikimi|son dondan sonra', 'Malçlama|nemi korumak için', 'Çiçek tarhlarını hazırlayın|mevsimlik çiçekler'],
  5: ['Sabah erken sulama|sıcak saatlerden önce', 'Domates koltuk alma|haftalık', 'Saksıları öğle güneşinden koruyun|yarı gölge'],
  6: ['Düzenli sulama|toprak kontrolüyle', 'Kışlık sebze fideleri|temmuz sonu', 'Solmuş çiçekleri temizleyin|yeni çiçek için'],
  7: ['Kışlık lahana ve brokoli fidesi|ağustos', 'Tohum toplama|olgun meyvelerden', 'Saksılarda su birikmesine dikkat|alt tabaklar'],
  8: ['Soğanlı çiçek dikimi|lale, sümbül', 'Kışlık sebze dikimi|ılık bölgelerde', 'Sulamayı azaltmaya başlayın|serinleyen havada'],
  9: ['Saksı bitkilerini kışa hazırlayın|içeri alma planı', 'Bahçe temizliği|dökülen yapraklar', 'Sarımsak ve bakla ekimi|ekim–kasım'],
  10: ['Bezelye ekimi|kışı ılık bölgeler', 'Saksıları içeri alın|soğuk geceler başlamadan', 'Meyve fidanı dikimi|yapraklar dökülünce'],
  11: ['Salon bitkilerini cereyandan koruyun|kalorifer yakınından uzak', 'Sulamayı seyreltin|kış dinlenmesi', 'Bahçe aletlerinin bakımı|yeni sezon için'],
};

export const TOHUM_AYAR = {
  yayin: 'kurulum', // kurulum: arama motorlarına kapalı (noindex) · canli: açık
  site_url: 'https://blog.hasturkgubre.com.tr',
  magaza_url: 'https://hasturkgubre.com.tr',
  site_adi: 'HasTürk Blog',
  slogan: 'Bitkilerle Daha Güzel Bir Yaşam',
  yorum_esik: '3', // yeni hesabın elle onaylanacak ilk yorum/soru/cevap sayısı
  guvenilir_esik: '20',
  link_beklet: '1',
  ret_sifirla: '1',
  aylik: AYLIK,
  ipuclari: [
    'Bitkilerinizi sabah saatlerinde sulamak, yaprakların gün içinde kurumasını ve mantar riskinin azalmasını sağlar.',
    'Saksınızın altında mutlaka su çıkış deliği olsun; kökler suda kalırsa çürür.',
    'Parmağınızı toprağa 2–3 cm daldırın: kuruysa sulama zamanı, nemliyse bekleyin.',
    'Salon bitkilerinin yapraklarını ayda bir nemli bezle silmek ışık almalarını kolaylaştırır.',
    'Kışın bitkiler daha yavaş büyür; sulamayı ve gübrelemeyi azaltın.',
    'Saksı değiştirirken yalnızca bir boy büyük saksı seçin; çok büyük saksıda toprak geç kurur.',
    'Perlit, toprağı havalandırır ve fazla suyun akmasını kolaylaştırır.',
  ],
  one_urunler: ['tarim-perliti', 'hasturk-sivi-solucan-gubresi', 'hg-monstera-deve-tabani-topragi'],
  hakkimizda: 'HasTürk Blog, HasTürk Gübre\'nin bitki bakımı ve bahçecilik rehberidir. Amacımız, saksıda ya da bahçede bitki yetiştiren herkesin doğru bilgiye kolayca ulaşmasıdır.\n\nYazılarımız HasTürk Editör Ekibi tarafından hazırlanır ve yayından önce kontrol edilir. Topluluk bölümünde bahçe severler birbirine soru sorar, deneyimlerini paylaşır; ekibimiz de cevaplar.\n\nÜrünlerimizi incelemek için HasTürk Mağaza\'yı ziyaret edebilirsiniz. Sipariş ve teslimatla ilgili konularda müşteri hizmetlerimiz size yardımcı olur.',
  kurallar: 'Saygılı olun; kişisel bilgilerinizi (telefon, adres) paylaşmayın.\nBaşka site ya da mağaza bağlantısı paylaşmayın.\nİlaç dozu yazmayın; ürün etiketine ve uzman görüşüne yönlendirin.\nReklam, spam ve konu dışı içerikler kaldırılır.\nYeni hesapların ilk paylaşımları kısa bir kontrolden sonra yayınlanır.',
  kvkk: 'Bu metin taslaktır, yayına geçmeden önce hukuki kontrolden geçirilmelidir.\n\nÜyelik sırasında verdiğiniz görünen ad ve e-posta adresi; hesabınızı oluşturmak, yorum ve sorularınızı yayınlamak ve size bildirim göndermek amacıyla işlenir. E-posta adresiniz sitede gösterilmez ve üçüncü kişilerle paylaşılmaz.\n\nŞifreniz tek yönlü şifrelenerek saklanır. Hesabınızın silinmesini istediğinizde müşteri hizmetlerimize yazabilirsiniz.',
  sozlesme: 'Bu metin taslaktır, yayına geçmeden önce hukuki kontrolden geçirilmelidir.\n\nÜye olarak topluluk kurallarına uymayı kabul edersiniz. Paylaştığınız yorum, soru ve cevapların sorumluluğu size aittir. Kurallara aykırı paylaşımlar yayından kaldırılabilir, tekrarında hesap kapatılabilir.',
};

export const TOHUM_YAZI = [
  {
    slug: 'ortanca-bakimi-ve-cicek-actirma-rehberi', kategori: 'cicekler', one_cikan: true,
    baslik: 'Ortanca Bakımı ve Sağlıklı Çiçek Açtırma Rehberi',
    ozet: 'Ortanca yarı gölge, düzenli nem ve asidik toprak sever. Sulama, budama, toprak seçimi ve çiçek rengini etkileyen etkenleri adım adım anlattık.',
    seo_baslik: 'Ortanca Bakımı: Sulama, Toprak, Budama ve Çiçek Rengi',
    odak: 'ortanca bakımı', etiketler: 'ortanca, çiçek, asidik toprak, budama',
    gorsel: F('ortanca'), gorsel_alt: 'Pembe ve mavi ortanca çiçekleri',
    kisaca: 'Ortanca yarı gölge ve düzenli nem sever; organik maddece zengin, hafif asidik toprakta en iyi gelişir. Budama türüne göre değişir; emin değilseniz yalnızca solmuş çiçekleri temizleyin. Çiçek rengi toprağın pH\'ından etkilenir: asidik toprakta mavi, nötr ya da kireçli toprakta pembe tonlar görülür.',
    govde: `## Ortanca Çiçeği Hakkında Genel Bilgiler

![Bahçede açmış çiçekler](${F('cicek-tarhi')} "Ortanca doğru bakımla yaz boyunca çiçek açar.")

Ortanca (Hydrangea), iri ve gösterişli çiçekleriyle bahçe ve saksı kültüründe en sevilen süs bitkilerinden biridir. Pembe, mavi, mor ve beyaz tonlarda açan çiçekleri yaz aylarını renklendirir. Ilıman iklimi sever ve doğru bakımla uzun yıllar yaşar.

## Ortanca Bakımı Nasıl Yapılır?

Ortancanın sağlıklı gelişmesi için düzenli sulama, besin desteği ve doğru konum önemlidir. Yarı gölgeli yerleri sever; özellikle yazın düzenli suya ihtiyaç duyar. Toprağın hafif nemli kalması çiçeklerin daha canlı ve uzun ömürlü olmasını sağlar.

> İpucu: Yaz aylarında ortancanızı sabah erken saatlerde sulayın. Bitki gün boyu ihtiyaç duyduğu nemi korur ve sıcakta daha az strese girer.

## Ortanca İçin Doğru Toprak Seçimi

Ortanca organik maddece zengin, iyi drene olan ve hafif asidik toprakları sever. Kireçli ve ağır topraklarda yapraklarda sararma görülebilir. Saksıda yetiştiriyorsanız asit seven bitkiler için hazırlanmış bir karışım işinizi kolaylaştırır.

[ürün:yaban-mersini-ve-ortanca-topragi]

## Sulama, Işık ve Konum

- **Sulama:** Toprağın üst kısmı kurudukça sulayın. Yazın daha sık, kışın daha seyrek.
- **Işık:** Sabah güneşi alan, öğle güneşinden korunan yerler idealdir.
- **Konum:** Rüzgârdan korunaklı, nemi tutan alanlar tercih edin.
- **Saksı:** Altında su çıkış deliği olan, kök topundan bir boy büyük saksı seçin.

## Budama Zamanı ve Yöntemi

Ortanca türlerinin bir kısmı çiçeklerini bir önceki yılın dallarında, bir kısmı o yılın yeni sürgünlerinde açar. Bu yüzden budama zamanı türe göre değişir. Türünüzü bilmiyorsanız sonbaharda sert budama yapmayın; kış sonunda yalnızca solmuş çiçekleri ve kurumuş dalları temizleyin.

> Unutmayın: Sonbaharda yapılan sert budama, gelecek yılın çiçek tomurcuklarını kesebilir. Ortancanız hiç çiçek açmıyorsa ilk bakılacak yer budama zamanıdır.

## Çiçek Rengini Etkileyen Etkenler

| Toprak | Çiçek rengi | Ne yapılabilir? |
|---|---|---|
| Asidik | Mavi – mor | Asit seven bitki toprağı kullanın |
| Nötr | Pembe – açık mor | Dengeli, organik toprak |
| Kireçli | Pembe | Kireçli suyla sulamaktan kaçının |

Beyaz çiçekli ortancalarda renk toprağa göre değişmez.

## Gübreleme

İlkbahardan yaz ortasına kadar organik bir gübreyle beslemek çiçeklenmeyi destekler. Sonbaharda gübrelemeyi bırakın; bitki kışa dinlenmeye hazırlanır.

[ürün:hasturk-sivi-solucan-gubresi]`,
    sss: 'S: Ortanca güneşte mi gölgede mi yetişir?\nC: Yarı gölge idealdir. Sabah güneşi alan, öğle güneşinden korunan yerlerde daha uzun süre çiçek açar.\n\nS: Ortanca ne zaman budanır?\nC: Türe göre değişir. Emin değilseniz kış sonunda yalnızca solmuş çiçekleri ve kuru dalları temizleyin.\n\nS: Ortancanın rengi neden değişir?\nC: Toprağın pH\'ı çiçek rengini etkiler: asidik toprakta mavi, nötr ya da kireçli toprakta pembe tonlar görülür.',
  },
  {
    slug: 'saksida-limon-agaci-bakimi', kategori: 'bitki-bakimi', one_cikan: true,
    baslik: 'Saksıda Limon Ağacı Bakımı: Toprak, Sulama, Kışlatma',
    ozet: 'Saksıda limon ağacı için doğru toprak, sulama sıklığı, ışık ve kışlatma. Yaprak dökülmesinin en sık nedenleri ve çözümleri.',
    odak: 'saksıda limon ağacı bakımı', etiketler: 'limon, narenciye, saksı, kışlatma',
    gorsel: F('hero1'), gorsel_alt: 'Pencere önünde saksıda bitkiler',
    kisaca: 'Limon ağacı bol ışık, iyi drene olan hafif asidik toprak ve düzenli ama aşırı olmayan sulama ister. Toprağın üst kısmı kuruyunca sulayın, saksıda su birikmesine izin vermeyin. Soğuğa hassastır; kışın don görülen yerlerde aydınlık ve serin bir ortama alın.',
    govde: `## Doğru Saksı ve Toprak

Limon kökleri suyun birikmesini sevmez. Altında su çıkış delikleri olan, kök topundan bir boy büyük bir saksı seçin. Torf, perlit ve organik madde içeren, süzek ve hafif asidik bir karışım en iyi sonucu verir.

> İpucu: Saksının dibine birkaç santim perlit ya da iri drenaj malzemesi koymak fazla suyun hızla akmasına yardımcı olur.

[ürün:limon-agaci-topragi-ozel-organik-karisim]

## Sulama: Ne Sıklıkla, Ne Kadar?

Sabit bir gün yerine toprağa bakarak sulayın. Parmağınızı toprağa 3–4 cm daldırın; kuruysa saksının altından su çıkana kadar sulayın, ardından alttaki tabağı boşaltın.

- **Yazın:** Sıcak ve rüzgârlı günlerde daha sık kontrol edin.
- **Kışın:** Bitki yavaş büyür; sulama aralığını açın.
- **Saksı değişiminden sonra:** Yeni toprak nemi uzun tutar, ilk haftalarda daha az sulayın.

## Işık ve Konum

Limon günde en az 6 saat doğrudan güneş ister. Balkonda güney ya da batı cephe uygundur. İçeride en aydınlık pencerenin önü tercih edilmelidir.

## Kışlatma

Limon soğuğa hassastır. Gece sıcaklıkları sıfıra yaklaşmaya başladığında saksıyı aydınlık, serin ve cereyan almayan bir yere alın. Kalorifer peteğinin hemen yanı uygun değildir; kuru sıcak hava yaprak dökülmesine yol açabilir.

> Unutmayın: Ani yer ve sıcaklık değişimi limonun yaprak dökmesine neden olabilir. İçeri alırken bitkiyi birkaç gün içinde yavaş yavaş alıştırın.

## Yapraklar Neden Dökülür?

| Belirti | Olası neden | Ne yapılabilir? |
|---|---|---|
| Kıvrılan, sararan yaprak | Fazla sulama | Toprağın kurumasını bekleyin, drenajı kontrol edin |
| Kuru, kenarı yanık yaprak | Susuzluk ya da kuru hava | Düzenli sulayın, peteğin yanından alın |
| Ani yaprak dökümü | Yer veya sıcaklık değişimi | Bitkiyi sabit bir yerde tutun, sabırlı olun |
| Damarları yeşil, arası sarı | Besin eksikliği | Büyüme döneminde düzenli besleyin |

## Gübreleme

İlkbahar ve yaz boyunca düzenli beslemek meyve tutumunu destekler. Kışın gübrelemeye ara verin.

[ürün:hasturk-sivi-solucan-gubresi]`,
    sss: 'S: Saksıdaki limon ağacı ne sıklıkla sulanır?\nC: Sabit bir gün yoktur; toprağın üst 3–4 cm\'si kuruyunca sulayın ve saksının altında su birikmesine izin vermeyin.\n\nS: Limon ağacı kışın dışarıda kalabilir mi?\nC: Don görülen yerlerde kalmamalıdır. Aydınlık, serin ve cereyan almayan bir yere alın.',
  },
  {
    slug: 'hangi-bitki-hangi-topragi-sever', kategori: 'toprak-rehberi',
    baslik: 'Hangi Bitki Hangi Toprağı Sever?',
    ozet: 'Kaktüsten ortancaya, limondan monsteraya: bitki türüne göre doğru toprak nasıl seçilir? Süzeklik, asitlik ve organik madde için kısa rehber.',
    odak: 'hangi bitki hangi toprağı sever', etiketler: 'toprak, saksı toprağı, perlit, torf',
    gorsel: F('fide'), gorsel_alt: 'Fide viyolünde genç fideler',
    kisaca: 'Her bitki aynı toprağı sevmez. Kaktüs ve sukulentler çok süzek toprak ister; ortanca ve yaban mersini asidik toprak sever; monstera gibi tropik bitkiler havadar, organik maddece zengin karışımlarda iyi gelişir. Toprağı seçerken süzeklik, asitlik ve organik madde oranına bakın.',
    govde: `## Toprak Seçerken Neye Bakmalı?

- **Süzeklik:** Fazla su ne kadar hızlı akıyor? Kökler hem suya hem havaya ihtiyaç duyar.
- **Asitlik (pH):** Bazı bitkiler asidik, çoğu bitki nötre yakın toprak sever.
- **Organik madde:** Besin tutar, toprağın yapısını iyileştirir.

## Bitkiye Göre Toprak Tablosu

| Bitki | Sevdiği toprak | Dikkat |
|---|---|---|
| Kaktüs ve sukulent | Çok süzek, mineral ağırlıklı | Suyu tutan topraktan kaçının |
| Ortanca, yaban mersini | Asidik, organik | Kireçli sudan kaçının |
| Limon ve narenciye | Süzek, hafif asidik | Su birikmesine izin vermeyin |
| Monstera ve tropikler | Havadar, organik, kabuklu | Sıkışan topraktan kaçının |
| Çiçekli saksı bitkileri | Dengeli, besince zengin | Düzenli besleme |

## Kaktüs ve Sukulentler

Doğal ortamları kumlu ve taşlıdır. Saksıda da suyu hızla akıtan, perlit ya da pomza oranı yüksek bir karışım ister.

[ürün:kaktus-ve-sukulent-topragi]

## Asit Seven Bitkiler

Ortanca, yaban mersini, açelya ve kamelya asidik toprakta besinleri daha kolay alır. Kireçli toprakta yapraklarda sararma görülebilir.

[ürün:yaban-mersini-ve-ortanca-topragi]

## Tropik Salon Bitkileri

Monstera, filodendron ve benzerleri havadar, kökün nefes alabildiği karışımları sever.

> İpucu: Hangi bitki olursa olsun, saksının altında su çıkış deliği olmalı. En iyi toprak bile delik olmayan saksıda kökleri çürütebilir.

## Perlit Ne İşe Yarar?

Perlit, volkanik kökenli hafif bir mineraldir. Toprağa karıştırıldığında havalanmayı artırır ve fazla suyun akmasını kolaylaştırır. Ağır gelen bir toprağı hafifletmek için iyi bir yardımcıdır.`,
    sss: 'S: Her bitkiye aynı toprak kullanılabilir mi?\nC: Kısa süre idare eder ama uzun vadede bitkinin ihtiyacına uygun toprak daha sağlıklı gelişim sağlar.\n\nS: Bahçe toprağı saksıda kullanılır mı?\nC: Bahçe toprağı saksıda sıkışır ve geç kurur. Saksı için hazırlanmış, süzek bir karışım tercih edin.',
  },
  {
    slug: 'saksi-bitkilerini-kisa-hazirlama-zamani', kategori: 'gundem', tur: 'gundem',
    baslik: 'Saksı Bitkilerini Kışa Hazırlama Zamanı',
    ozet: 'Geceler serinlerken balkondaki saksı bitkileri için içeri alma, sulama ve gübreleme düzenini gözden geçirme zamanı.',
    odak: 'saksı bitkileri kış hazırlığı', etiketler: 'kış bakımı, saksı, mevsim',
    gorsel: F('sonbahar'), gorsel_alt: 'Sonbaharda bahçe',
    kisaca: 'Gece sıcaklıkları düşmeye başladığında soğuğa hassas saksı bitkilerini içeri almayı planlayın, sulamayı seyreltin ve gübrelemeye ara verin.',
    govde: `Sonbaharın ilerlemesiyle birlikte gece ve gündüz arasındaki sıcaklık farkı artıyor. Limon, sardunya ve tropik salon bitkileri gibi soğuğa hassas bitkiler için kış hazırlığına başlamanın tam zamanı.

- Soğuğa hassas bitkileri gece sıcaklığı sıfıra yaklaşmadan içeri alın.
- İçeri almadan önce yaprak altlarını ve saksıyı kontrol edin.
- Kışın bitkiler yavaş büyür; sulamayı ve gübrelemeyi azaltın.
- Kalorifer peteklerinin hemen yanından ve cereyandan uzak tutun.`,
  },
];

// Soru-Cevap başlangıç içeriği: müşteri hizmetlerine en sık gelen sorulardan derlendi (uydurma üye adı yok).
// Soran "HasTürk Müşteri Hizmetleri", cevaplayan "HasTürk Editör Ekibi"; soru sayfasında "derlenmiştir" notu görünür.
export const TOHUM_SORU = [
  { kategori: 'bitki-bakimi', baslik: 'Saksı toprağının üstünde beyaz küf oluştu, bitkiye zarar verir mi?',
    metin: 'Saksıdaki bitkinin toprağının üstünde beyaz, pamuk gibi ince bir tabaka oluştu. Bitkiye zarar verir mi, ne yapmak gerekir?',
    cevap: 'Toprak yüzeyindeki beyaz tabaka çoğunlukla nemli ve hava almayan ortamda çoğalan zararsız bir mantardır; bitkinin kendisine doğrudan zarar vermez. Ancak toprağın uzun süre ıslak kaldığını gösterir.\n\nNe yapmalı:\n- Üstteki 1–2 cm toprağı kazıyıp atın, yerine taze toprak koyun.\n- Toprağın üst kısmı kurumadan tekrar sulamayın.\n- Saksıyı daha aydınlık ve havadar bir yere alın.\n- Saksının altında su çıkış deliği olduğundan ve tabakta su birikmediğinden emin olun.\n\nOrganik maddece zengin yeni topraklarda ilk haftalarda görülebilir ve sulama düzene girince kendiliğinden kaybolur. Yapraklarda solma ve topraktan kötü koku varsa kökleri kontrol etmek gerekir; bu durumda saksı değişimi daha doğru olur.' },
  { kategori: 'gubreleme', baslik: 'Solucan gübresi saksıda ne kadar ve ne sıklıkla kullanılır?',
    metin: 'Saksı bitkilerinde katı solucan gübresini ne kadar kullanmalıyım? Ne sıklıkla eklemek gerekir?',
    cevap: 'Toprağı yeni hazırlıyorsanız solucan gübresi karışıma genellikle hacimce yüzde 10–20 civarında katılır. Bitkiniz zaten saksıdaysa toprağın üstüne 1–2 cm serpip yüzeye hafifçe karıştırmanız ve ardından sulamanız yeterlidir.\n\nBüyüme döneminde (ilkbahar ve yaz) bu işlemi 1–2 ayda bir tekrarlayabilirsiniz. Kışın bitkiler yavaş büyüdüğü için aralığı açın.\n\nSolucan gübresi organik ve yavaş salınımlıdır; doğru kullanıldığında kökleri yakma riski düşüktür. Daha hızlı destek isterseniz sıvı solucan gübresini sulama suyuna karıştırarak kullanabilirsiniz; bu durumda ürün etiketindeki karışım oranına uyun.' },
  { kategori: 'toprak-rehberi', baslik: 'Perlit ile vermikülit arasındaki fark nedir, hangisini kullanmalıyım?',
    metin: 'Toprak karışımlarında perlit ve vermikülit geçiyor. İkisi arasındaki fark nedir, hangi bitkide hangisi kullanılır?',
    cevap: 'İkisi de toprağın yapısını iyileştiren doğal minerallerdir ama görevleri farklıdır.\n\nPerlit: Isıyla genleştirilmiş volkanik bir mineraldir. Toprağı havalandırır, fazla suyun akmasını kolaylaştırır ve su tutmaz. Kaktüs, sukulent, orkide ve kökleri suda kalmaya hassas bitkiler için ve ağır toprakları hafifletmek için uygundur.\n\nVermikülit: Genleştirilmiş bir mika mineralidir. Süngerimsi yapısıyla suyu ve besinleri tutar. Tohum çimlendirme, fide yetiştirme ve nemi seven bitkiler için uygundur.\n\nKısaca: kök çürümesinden korkuyorsanız perlit, toprağın nemi daha uzun tutmasını istiyorsanız vermikülit. İkisi aynı karışımda birlikte de kullanılabilir.' },
  { kategori: 'bitki-bakimi', baslik: 'Monstera yaprakları neden sararır?',
    metin: 'Salondaki monsteranın alt yapraklarından biri sarardı, bir tanesinde de sararma başladı. Neden olur, ne yapmak gerekir?',
    cevap: 'Monsterada sararmanın en sık nedeni fazla sulamadır. Toprak sürekli nemli kalırsa kökler havasız kalır ve önce alt yapraklar sararır.\n\nKontrol edin:\n- Parmağınızı toprağa 3–4 cm daldırın; nemliyse sulamayı erteleyin.\n- Saksının altında su çıkış deliği var mı, tabakta su birikiyor mu?\n- Bitki yeterince ışık alıyor mu? Monstera aydınlık ama doğrudan öğle güneşi almayan yerleri sever.\n- Toprak çok mu sıkışık? Kabuk ve perlit içeren havadar bir karışım kökler için daha sağlıklıdır.\n\nEn alttaki tek bir yaprağın zamanla sararması doğal yaşlanma da olabilir. Büyüme döneminde ayda bir organik besin desteği vermek yeni yaprakların sağlıklı gelmesine yardımcı olur. Yaprak kenarlarında kahverengi kuruma varsa neden genellikle kuru hava ya da susuzluktur.' },
  { kategori: 'bitki-bakimi', baslik: 'Kaktüs ne sıklıkla sulanmalı?',
    metin: 'Evde saksıda kaktüs var. Ne sıklıkla ve ne kadar su vermek gerekir? Kışın da aynı şekilde mi sulanır?',
    cevap: 'Kaktüslerde en sık yapılan hata fazla sulamadır. Kural basit: toprak tamamen kuruduktan sonra sulayın.\n\nYazın: Toprak kuruyunca saksının altından su çıkana kadar bol sulayın, sonra tabaktaki suyu boşaltın. Ortama göre değişmekle birlikte bu genellikle 7–14 günde bir denk gelir.\n\nKışın: Kaktüsler dinlenmeye geçer. Ayda bir ya da daha seyrek sulamak yeterlidir; serin ortamda duruyorsa neredeyse hiç su istemez.\n\nSüzek bir kaktüs toprağı ve delikli saksı kullanmak işinizi çok kolaylaştırır. Gövdede yumuşama, şeffaflaşma ya da dipte kararma fazla suyun işaretidir; buruşma ve incelme ise susuzluğu gösterir.' },
  { kategori: 'bitki-bakimi', baslik: 'Saksı değişiminin zamanı geldiği nasıl anlaşılır?',
    metin: 'Bitkimin saksısını ne zaman değiştirmem gerektiğini nasıl anlarım? Değiştirirken nelere dikkat etmeliyim?',
    cevap: 'Şu işaretler saksının küçüldüğünü gösterir:\n- Kökler saksının altındaki delikten dışarı çıkıyor.\n- Su toprağa işlemeden kenarlardan hızla akıp gidiyor.\n- Toprak eskisinden çok daha çabuk kuruyor.\n- Bitkinin büyümesi durdu ya da saksı kolayca devriliyor.\n\nEn uygun zaman, bitkilerin uyanıp büyümeye başladığı ilkbahar başıdır. Çiçek açtığı dönemde değiştirmemek daha iyidir.\n\nDikkat edilecekler: Bir boy, yani çapı 2–5 cm daha büyük bir saksı seçin; çok büyük saksıda toprak geç kurur. Taze ve bitkiye uygun bir toprak kullanın, kök topunu hafifçe gevşetin. Değişimden sonra birkaç gün bitkiyi doğrudan güneşten koruyun ve ilk ay gübre vermeyin.' },
  { kategori: 'cicekler', baslik: 'Ortanca mavi açıyordu, neden pembe açmaya başladı?',
    metin: 'Aldığımızda mavi çiçek açan ortanca bu yıl pembeye döndü. Bunun sebebi nedir, tekrar mavi açtırmak mümkün mü?',
    cevap: 'Mavi ve pembe ortancalarda çiçek rengi büyük ölçüde toprağın asitliğine bağlıdır. Asidik toprakta mavi, nötr ya da kireçli toprakta pembe tonlar görülür. Kireçli musluk suyuyla sulamak da zamanla toprağın asitliğini azaltır ve rengi pembeye çeker.\n\nTekrar mavi açtırmak için:\n- Asit seven bitkiler için hazırlanmış bir toprak kullanın.\n- Mümkünse yağmur suyu ya da kireci az bir su ile sulayın.\n- Toprağa asidik organik malzemeler (ör. torf) eklemek yardımcı olur.\n\nRenk değişimi bir anda olmaz; genellikle bir sonraki çiçeklenmede kademeli olarak görülür. Beyaz çiçekli ortancalarda renk topraktan etkilenmez.' },
  { kategori: 'sebze-meyve', baslik: 'Balkonda domates için ne büyüklükte saksı gerekir?',
    metin: 'Balkonda saksıda domates yetiştirmek istiyorum. Kaç litrelik saksı gerekir, başka nelere dikkat etmeliyim?',
    cevap: 'Saksının büyüklüğü domatesin verimini doğrudan etkiler.\n- Çeri ve bodur çeşitler için en az 15–20 litrelik saksı,\n- Normal boylu çeşitler için 25–40 litrelik ve en az 30–40 cm derinliğinde saksı önerilir.\n\nKüçük saksıda toprak çok çabuk kurur; bitki strese girer, meyve az olur ve düzensiz sulamaya bağlı meyve ucunda kararma görülebilir.\n\nDiğer önemli noktalar:\n- Günde en az 6–8 saat güneş alan bir yer seçin.\n- Organik maddece zengin, süzek bir toprak kullanın.\n- Bitkiyi bir destek çubuğuna bağlayın.\n- Toprağı düzenli nemli tutun; sıcak günlerde her gün kontrol edin.\n- Meyveler oluşmaya başlayınca organik gübreyle destekleyin.' },
  { kategori: 'sebze-meyve', baslik: 'Limon ağacı çiçek açıyor ama meyve tutmuyor, neden?',
    metin: 'Saksıdaki limon ağacı her yıl çiçek açıyor ama çiçekler dökülüyor, meyve tutmuyor. Sebebi ne olabilir?',
    cevap: 'Limonda çiçeklerin dökülüp meyve tutmamasının birkaç yaygın nedeni vardır:\n- Işık yetersizliği: Limon günde en az 6 saat doğrudan güneş ister.\n- Ani değişimler: Çiçeklenme döneminde yer, sıcaklık ya da ortam değişikliği çiçek dökümüne yol açar.\n- Düzensiz sulama: Toprağın tamamen kuruyup sonra çok ıslanması çiçekleri döktürür.\n- Tozlaşma eksikliği: Kapalı ortamda böcek olmadığı için tozlaşma zayıf kalabilir. Yumuşak bir fırçayla çiçekten çiçeğe hafifçe dokunarak yardım edebilirsiniz.\n- Genç ağaç: İlk yıllarda çiçeklerin büyük kısmının dökülmesi normaldir.\n- Fazla azotlu gübre: Bitki meyve yerine yaprak yapmaya yönelir.\n\nAğacı aydınlık bir yerde sabit tutmak, toprağın üst kısmı kuruyunca düzenli sulamak ve dengeli, organik bir besleme yapmak genellikle sonucu iyileştirir.' },
  { kategori: 'toprak-rehberi', baslik: 'Bahçe toprağı saksıda kullanılır mı?',
    metin: 'Bahçeden aldığım toprağı saksı bitkilerinde kullanabilir miyim, yoksa hazır toprak mı almalıyım?',
    cevap: 'Bahçe toprağını doğrudan saksıda kullanmak önerilmez. Saksıda sulandıkça sıkışır, suyu iyi akıtmaz ve kökler havasız kalır. Ayrıca yabancı ot tohumu, böcek ya da hastalık etkeni taşıyabilir.\n\nSaksı bitkileri için hafif, süzek ve organik maddece zengin bir karışım daha sağlıklıdır. Bahçe toprağını yine de kullanacaksanız perlit ve organik madde (ör. solucan gübresi ya da kompost) ekleyerek hafifletin.\n\nKaktüs, ortanca, limon gibi farklı ihtiyaçları olan bitkiler için o bitkiye göre hazırlanmış karışımları tercih etmek en kolay yoldur.' },
];

// İkinci yazı paketi (10 yazı; var olan kurulumlara 'tohum_yazi2' ayarıyla bir kez eklenir, "örnek içerik" işaretli)
export const TOHUM_YAZI2 = [
  {
    slug: 'kaktus-bakimi-sulama-isik-ve-toprak', kategori: 'bitki-bakimi', one_cikan: true,
    baslik: 'Kaktüs Bakımı: Sulama, Işık ve Toprak Rehberi',
    ozet: 'Kaktüs ve sukulentler az bakım ister ama doğru bakım ister. Sulama aralığı, ışık, toprak ve kış bakımında dikkat edilecekleri anlattık.',
    seo_aciklama: 'Kaktüs ne sıklıkla sulanır, ne kadar ışık ister, hangi toprak uygundur? Kaktüs ve sukulent bakımında en sık yapılan hatalar ve çözümleri.',
    odak: 'kaktüs bakımı', etiketler: 'kaktüs, sukulent, sulama, saksı',
    gorsel: F('kaktus'), gorsel_alt: 'Saksıda kaktüs ve sukulentler',
    kisaca: 'Kaktüsler toprak tamamen kuruduktan sonra bol ve seyrek sulanmalı, günde en az 4–6 saat güçlü ışık almalı ve suyu hızla akıtan süzek bir toprakta yetiştirilmelidir. Kışın dinlenmeye geçtikleri için sulama büyük ölçüde azaltılır.',
    govde: `## Kaktüsler Neden Kolay Ama Hassastır?

Kaktüsler doğada uzun kurak dönemlere alışmış bitkilerdir; gövdelerinde su depolarlar. Bu yüzden susuzluğa dayanıklıdırlar ama fazla suya karşı çok hassastırlar. Evde kaktüs kaybının en büyük nedeni ihmal değil, fazla ilgidir.

## Sulama: "Az Ama Bol" Kuralı

Kaktüsü sık sık az az sulamak yerine, toprak tamamen kuruduğunda bir kez bol sulayın. Su saksının altından akana kadar verin, sonra tabakta biriken suyu boşaltın.

- **Yaz:** Ortama göre genellikle 7–14 günde bir.
- **Sonbahar:** Aralığı yavaş yavaş açın.
- **Kış:** Ayda bir ya da daha seyrek; serin ortamda neredeyse hiç.

> İpucu: Toprağa ince bir tahta çubuk batırıp çıkarın. Çubuk temiz ve kuru çıkıyorsa sulama zamanı gelmiştir.

## Işık ve Konum

Kaktüsler güçlü ışığı sever. Güney ya da batıya bakan bir pencere önü idealdir. Uzun süre loş yerde kalan kaktüs incelir, ışığa doğru uzar ve rengi solar. Gölgede kalmış bir kaktüsü birden yakıcı güneşe çıkarmayın; birkaç günde alıştırın.

## Doğru Toprak ve Saksı

Kaktüs toprağı suyu tutmamalı, hızla akıtmalıdır. Mineral oranı yüksek, perlit ya da pomza içeren karışımlar en iyi sonucu verir. Saksının altında mutlaka su çıkış deliği olmalı.

[ürün:kaktus-ve-sukulent-topragi]

## Sık Görülen Sorunlar

| Belirti | Olası neden | Ne yapılmalı? |
|---|---|---|
| Gövdede yumuşama, dipte kararma | Fazla su | Sulamayı kesin, kökleri kontrol edin |
| Buruşma, incelme | Uzun süre susuzluk | Bol sulayın, sonra düzenli aralık |
| Işığa doğru uzama | Işık yetersiz | Daha aydınlık yere alın |
| Üstte sarı-kahverengi leke | Ani güneş yanığı | Güneşe kademeli alıştırın |

> Unutmayın: Kışın sıcak bir odada duran kaktüs dinlenemez. Mümkünse serin ve aydınlık bir yerde tutmak, ilkbaharda çiçeklenmeyi de destekler.

## Besleme

Büyüme döneminde (ilkbahar–yaz) ayda bir kaktüslere uygun, düşük dozlu bir besin yeterlidir. Kışın beslemeyin.

[ürün:florist-konsantre-sivi-kaktus-ve-sukulent-bitki-besini]`,
    sss: 'S: Kaktüs ne sıklıkla sulanır?\nC: Toprak tamamen kuruduktan sonra; yazın genellikle 7–14 günde bir, kışın ayda bir ya da daha seyrek.\n\nS: Kaktüs güneşte mi durmalı?\nC: Evet, güçlü ışığı sever. Güney ya da batı cephesindeki pencere önü idealdir; ani güneşe kademeli alıştırın.\n\nS: Kaktüsüm neden yumuşadı?\nC: Yumuşama ve dipte kararma genellikle fazla sulamanın işaretidir. Sulamayı kesip kökleri kontrol edin.',
  },
  {
    slug: 'orkide-bakimi-yeniden-cicek-actirma', kategori: 'cicekler', one_cikan: true,
    baslik: 'Orkide Bakımı: Yeniden Çiçek Açtırmanın Yolları',
    ozet: 'Çiçekleri dökülen orkide çöpe atılmaz. Doğru ışık, sulama ve dinlenme dönemiyle orkidenizi yeniden çiçeklendirebilirsiniz.',
    seo_aciklama: 'Orkide nasıl sulanır, nereye konur, çiçekleri dökülünce ne yapılır? Orkideyi yeniden çiçek açtırmak için adım adım bakım rehberi.',
    odak: 'orkide bakımı', etiketler: 'orkide, çiçek, salon bitkisi, sulama',
    gorsel: F('orkide'), gorsel_alt: 'Mor orkide çiçeği',
    kisaca: 'Orkide parlak ama doğrudan güneş almayan bir yerde, kabuklu özel orkide ortamında yetiştirilmeli; kökler gümüşi-gri olunca sulanmalıdır. Çiçekler döküldükten sonra gece-gündüz sıcaklık farkı olan serin bir dönem, yeni çiçek dalını tetikler.',
    govde: `## Evde En Çok Yetiştirilen Orkide

Evlerde en sık gördüğümüz orkide Phalaenopsis (kelebek orkide) türüdür. Doğada ağaç gövdelerine tutunarak yaşar; kökleri toprakta değil, havada ve kabuk arasında nefes alır. Bakımındaki her şey bu özelliğe göre şekillenir.

## Işık: Aydınlık Ama Yakıcı Değil

Orkide parlak, dolaylı ışık ister. Doğu cephesindeki pencere ya da tül perdenin arkası idealdir. Doğrudan öğle güneşi yapraklarda yanık lekelerine yol açar.

- Koyu yeşil, sarkık yapraklar: ışık az.
- Sarımsı, açık renkli yapraklar: ışık fazla.

## Sulama: Köklere Bakın

Orkideyi takvime göre değil, köklerine bakarak sulayın. Şeffaf saksıda kökler **gümüşi-gri** görünüyorsa sulama zamanıdır; **yeşil** ise henüz suyu vardır.

> İpucu: Saksıyı oda sıcaklığındaki suya 10–15 dakika daldırıp sonra suyunu tamamen süzdürmek, orkideyi sulamanın en kolay yoludur.

Yaprakların birleştiği tepe noktasında su bırakmayın; burada biriken su çürümeye neden olabilir.

## Doğru Ortam ve Saksı

Orkide normal saksı toprağında yaşayamaz; kökleri havasız kalır ve çürür. Çam kabuğu ağırlıklı, havadar bir orkide ortamı ve altı delikli, tercihen şeffaf bir saksı kullanın.

[ürün:gartengold-orkide-topragi]

## Yeniden Çiçek Açtırmak

Çiçekler döküldükten sonra:
1. Çiçek dalı yeşilse, en üstteki boğumun biraz üzerinden kesebilirsiniz; bu boğumdan yeni dal çıkabilir. Dal kurumuşsa dibinden kesin.
2. Bitkiyi birkaç hafta gece sıcaklığının gündüzden birkaç derece düşük olduğu serin ama aydınlık bir yere alın. Bu sıcaklık farkı yeni çiçek dalını tetikler.
3. Büyüme döneminde düzenli ama seyreltilmiş orkide besini verin.

> Unutmayın: Yeni çiçek dalının çıkması birkaç ay sürebilir. Bu sürede bitki yeni yaprak ve kök yapıyorsa sağlıklıdır; sabırlı olun.

[ürün:orkide-topragi-besini-bakim-seti]`,
    sss: 'S: Orkide ne sıklıkla sulanır?\nC: Kökler gümüşi-gri renge dönünce; ortama göre genellikle 7–10 günde bir. Kökler yeşilse beklemek gerekir.\n\nS: Orkidenin çiçek dalı kesilir mi?\nC: Dal yeşilse en üst boğumun biraz üzerinden kesilebilir; kurumuşsa dibinden kesilir.\n\nS: Orkide normal toprağa dikilir mi?\nC: Hayır. Kökleri hava ister; kabuk ağırlıklı özel orkide ortamı kullanılmalıdır.',
  },
  {
    slug: 'gul-bakimi-bol-cicek-icin-oneriler', kategori: 'cicekler',
    baslik: 'Gül Bakımı: Daha Bol Çiçek İçin Öneriler',
    ozet: 'Güller güneşi, düzenli suyu ve doğru budamayı sever. Saksıda ve bahçede gülden daha çok çiçek almak için bakım önerileri.',
    seo_aciklama: 'Gül nasıl budanır, ne zaman gübrelenir, ne kadar sulanır? Saksıda ve bahçede bol çiçekli güller için pratik bakım rehberi.',
    odak: 'gül bakımı', etiketler: 'gül, budama, çiçek, gübreleme',
    gorsel: F('gul'), gorsel_alt: 'Turuncu-kırmızı gül çiçeği',
    kisaca: 'Güller günde en az 6 saat güneş, derin ve seyrek sulama, besince zengin süzek toprak ister. Kış sonunda yapılan budama ve solan çiçeklerin düzenli temizlenmesi, sezon boyunca daha bol çiçek almanızı sağlar.',
    govde: `## Gülün Temel İhtiyaçları

Gül, doğru yerde ve doğru toprakta yıllarca çiçek veren cömert bir bitkidir. Temel ihtiyaçları üç başlıkta toplanır: bol güneş, düzenli su ve besin.

## Konum: Güneş Şart

Güller günde en az 6 saat doğrudan güneş almalıdır. Gölgede kalan gül az çiçek açar ve mantar hastalıklarına daha açık hâle gelir. Hava akımı olan, ama sert rüzgâr almayan bir yer idealdir.

## Sulama: Derin ve Seyrek

Her gün az su vermek yerine, haftada 1–2 kez derin sulama yapın. Böylece kökler aşağıya doğru gelişir ve bitki kuraklığa daha dayanıklı olur.

> İpucu: Gülü yapraklarına değil, dibine sulayın ve sabah saatlerini tercih edin. Islak kalan yapraklar mantar hastalıklarını kolaylaştırır.

## Toprak ve Saksı

Güller organik maddece zengin, iyi drene olan topraklarda en iyi gelişir. Saksıda yetiştirecekseniz kökler derine indiği için en az 30–40 litrelik, derin bir saksı seçin.

[ürün:hg-gul-topragi-gullere-ozel-toprak-karisimi]

## Budama: Ne Zaman, Nasıl?

- **Ana budama:** Kış sonunda, tomurcuklar şişmeye başlamadan önce yapılır. Kuru, zayıf ve içe doğru büyüyen dallar kesilir.
- **Kesim yeri:** Dışa bakan bir gözün 0,5–1 cm üzerinden, eğimli kesin.
- **Yaz boyunca:** Solan çiçekleri ilk 5 yapraklı yaprağın üzerinden kesmek yeni çiçek oluşumunu hızlandırır.

> Unutmayın: Budama aletlerinizin keskin ve temiz olması, kesik yerlerinin hızlı iyileşmesini sağlar.

## Besleme

İlkbaharda yeni sürgünlerle birlikte beslemeye başlayın ve yaz ortasına kadar düzenli devam edin. Organik gübreler toprağın yapısını da iyileştirir. Sonbaharda beslemeyi bırakın ki bitki kışa hazırlansın.

[ürün:hasturk-kati-solucan-gubresi]`,
    sss: 'S: Gül ne zaman budanır?\nC: Ana budama kış sonunda, tomurcuklar şişmeden önce yapılır. Yaz boyunca solan çiçekler temizlenir.\n\nS: Gül saksıda yetişir mi?\nC: Evet; en az 30–40 litrelik derin bir saksı, bol güneş ve düzenli bakımla saksıda da bol çiçek verir.\n\nS: Güller ne sıklıkla sulanır?\nC: Haftada 1–2 kez derin sulama yeterlidir; sıcak ve rüzgârlı günlerde toprağı daha sık kontrol edin.',
  },
  {
    slug: 'saksida-zeytin-agaci-yetistirme', kategori: 'sebze-meyve',
    baslik: 'Saksıda Zeytin Ağacı Nasıl Yetiştirilir?',
    ozet: 'Zeytin ağacı balkon ve terasta da yetişir. Saksı seçimi, toprak, sulama, kış bakımı ve budama için bilmeniz gerekenler.',
    seo_aciklama: 'Saksıda zeytin ağacı bakımı: hangi saksı, hangi toprak, ne kadar su, kışın ne yapılır? Balkonda zeytin yetiştirme rehberi.',
    odak: 'saksıda zeytin ağacı', etiketler: 'zeytin, meyve ağacı, saksı, balkon',
    gorsel: F('zeytin'), gorsel_alt: 'Dalında yeşil zeytinler',
    kisaca: 'Saksıda zeytin için geniş ve derin, delikli bir saksı, suyu iyi akıtan bir toprak ve bol güneş gerekir. Toprak kuruduktan sonra sulanmalı, sert donlarda saksı korunaklı bir yere alınmalıdır.',
    govde: `## Zeytin Saksıda Neden Sevilir?

Zeytin, kuraklığa dayanıklı, uzun ömürlü ve gösterişli bir ağaçtır. Akdeniz iklimini sevse de doğru bakımla balkon ve teraslarda saksıda yıllarca yetişebilir.

## Saksı Seçimi

Zeytin kökleri suyun birikmesini sevmez. Altında birden fazla su çıkış deliği olan, geniş ve derin bir saksı seçin. Fidan büyüdükçe 2–3 yılda bir, bir boy büyük saksıya alın.

> İpucu: Toprak ve pişmiş kil saksılar fazla nemin buharlaşmasına yardımcı olduğu için zeytin için iyi bir seçimdir.

## Toprak

Zeytin için suyu hızla akıtan, hafif ve organik madde içeren bir karışım uygundur. Ağır ve sıkışan topraklarda kökler havasız kalır. Karışıma perlit eklemek drenajı belirgin şekilde iyileştirir.

[ürün:organik-toprak, tarim-perliti]

## Işık ve Sulama

- **Işık:** Günde en az 6–8 saat güneş. Güney ve batı cepheleri idealdir.
- **Sulama:** Toprağın üst 4–5 cm'si kuruyunca, saksının altından su akana kadar sulayın. Yazın daha sık, kışın daha seyrek.
- Tabakta su bırakmayın.

## Kış Bakımı

Toprakta yetişen zeytin soğuğa oldukça dayanıklıdır; ancak saksıdaki kökler dondan daha çabuk etkilenir. Sert don beklenen gecelerde saksıyı duvar dibine, rüzgâr almayan bir köşeye çekin ya da saksının etrafını sarın.

> Unutmayın: Zeytin meyve vermek için kışın bir süre serinliğe ihtiyaç duyar. Bütün kış sıcak bir odada tutulan ağaç genellikle çiçek açmaz.

## Budama ve Besleme

Budamayı ilkbahar başında yapın; kuru, zayıf ve iç içe geçmiş dalları temizleyerek tacın hava almasını sağlayın. Büyüme döneminde organik gübreyle beslemek yeni sürgünleri destekler.`,
    sss: 'S: Saksıda zeytin meyve verir mi?\nC: Verebilir; bol güneş, yeterli büyüklükte saksı ve kışın bir süre serin kalması meyve için önemlidir.\n\nS: Saksıdaki zeytin ne sıklıkla sulanır?\nC: Toprağın üst 4–5 cm\'si kuruyunca; yazın daha sık, kışın daha seyrek.',
  },
  {
    slug: 'balkonda-cilek-yetistirme', kategori: 'sebze-meyve',
    baslik: 'Balkonda Çilek Yetiştirme: Saksı, Toprak ve Bakım',
    ozet: 'Çilek, balkonda saksıda en kolay yetişen meyvelerden biri. Doğru saksı, toprak, sulama ve hasat için adım adım rehber.',
    seo_aciklama: 'Balkonda saksıda çilek nasıl yetiştirilir? Saksı boyutu, toprak, sulama, güneş ve hasat ipuçlarıyla çilek yetiştirme rehberi.',
    odak: 'balkonda çilek yetiştirme', etiketler: 'çilek, balkon, saksı, meyve',
    gorsel: F('cilek'), gorsel_alt: 'Saksıda olgunlaşan çilek',
    kisaca: 'Çilek günde en az 6 saat güneş, hafif asidik ve organik maddece zengin süzek bir toprak ve düzenli nem ister. Her bitkiye en az 2–3 litre toprak düşecek şekilde saksı seçilmeli, meyveler toprağa değmeyecek şekilde yetiştirilmelidir.',
    govde: `## Çilek Balkona Neden Uygun?

Çilek kökleri yüzeysel olduğu için derin saksıya ihtiyaç duymaz. Askılı saksılarda, balkon kasalarında ve dikey yetiştirme sistemlerinde rahatça yetişir; ilk yılından meyve verir.

## Saksı Seçimi

- Her bitki için en az 2–3 litre toprak hesaplayın.
- Saksı derinliği 15–20 cm yeterlidir.
- Altında su çıkış deliği mutlaka olmalı.

> İpucu: Askılı saksılarda meyveler sarkarak toprağa değmeden olgunlaşır; böylece çürüme azalır.

## Toprak

Çilek hafif asidik, organik maddece zengin ve suyu iyi akıtan toprakları sever. Kökler yüzeye yakın olduğu için toprağın sıkışmaması önemlidir.

[ürün:hg-cilek-topragi]

## Dikim

Fideyi dikerken bitkinin ortasındaki **taç** kısmını toprağın üstünde bırakın. Taç toprağa gömülürse çürüyebilir, fazla açıkta kalırsa kökler kurur. İlkbahar ve sonbahar dikim için en uygun dönemlerdir.

## Sulama ve Güneş

- Günde en az 6 saat güneş alan bir yer seçin.
- Toprağı sürekli hafif nemli tutun ama ıslak bırakmayın.
- Sıcak yaz günlerinde saksıları her gün kontrol edin; küçük saksılar çabuk kurur.
- Mümkünse yapraklara değil dibe sulayın.

## Besleme ve Hasat

Çiçeklenme başladığında organik bir gübreyle beslemek meyve tutumunu destekler. Meyveler tamamen kızardığında, sapıyla birlikte koparın. Bitkinin uzattığı ince sürgünler (stolonlar) yeni bitki verir; meyve almak istiyorsanız bunları kesebilir, çoğaltmak istiyorsanız yeni bir saksıya köklendirebilirsiniz.

[ürün:hasturk-sivi-solucan-gubresi]

> Unutmayın: Çilek bitkileri 2–3 yıl sonra verimini kaybeder. Stolonlardan aldığınız yeni bitkilerle saksılarınızı yenileyebilirsiniz.`,
    sss: 'S: Saksıda çilek kaç yıl meyve verir?\nC: Genellikle 2–3 yıl verimli olur; sonra stolonlardan alınan yeni bitkilerle yenilemek gerekir.\n\nS: Çilek ne sıklıkla sulanır?\nC: Toprak sürekli hafif nemli kalacak şekilde; sıcak günlerde her gün kontrol edilmelidir.',
  },
  {
    slug: 'saksida-feslegen-yetistirme', kategori: 'sebze-meyve',
    baslik: 'Saksıda Fesleğen Yetiştirme: Adım Adım Rehber',
    ozet: 'Mis kokulu fesleğeni mutfak penceresinde ya da balkonda kolayca yetiştirebilirsiniz. Tohumdan hasada fesleğen bakımı.',
    seo_aciklama: 'Fesleğen saksıda nasıl yetiştirilir? Tohum ekimi, sulama, güneş, uç alma ve hasat ile fesleğeni gür ve uzun ömürlü yetiştirme yolları.',
    odak: 'saksıda fesleğen', etiketler: 'fesleğen, reyhan, aromatik bitki, tohum',
    gorsel: F('feslegen'), gorsel_alt: 'Ahşap saksıda fesleğen',
    kisaca: 'Fesleğen sıcağı ve güneşi seven, hızlı büyüyen bir bitkidir. Bol ışık, hafif nemli toprak ve düzenli uç alma ile gür bir bitki elde edilir; çiçek açmasına izin verilmezse yaprak verimi uzun süre devam eder.',
    govde: `## Fesleğen Neyi Sever?

Fesleğen (reyhan) sıcak iklim bitkisidir. Soğuğa dayanıksızdır, gece sıcaklıkları 10 °C'nin altına düştüğünde zarar görür. Bol güneş ve düzenli suyla birkaç hafta içinde gür bir bitkiye dönüşür.

## Tohumdan Yetiştirme

1. Tohumları nemli toprağın yüzeyine serpin ve çok ince bir toprak tabakasıyla örtün.
2. Toprağı püskürtme şişesiyle nemli tutun.
3. Sıcak bir ortamda tohumlar genellikle 1–2 hafta içinde çimlenir.
4. Fideler 4–6 yapraklı olunca seyreltin ya da ayrı saksılara alın.

[ürün:arzuman-mor-reyhan-tohumu]

## Saksı ve Toprak

Tek bir fesleğen için 2–3 litrelik, delikli bir saksı yeterlidir. Organik maddece zengin, hafif ve suyu iyi akıtan bir toprak kullanın.

[ürün:solucan-gubreli-sebze-topragi]

## Sulama ve Işık

- Günde en az 6 saat güneş alan bir pencere önü ya da balkon idealdir.
- Toprağın üstü kurudukça sulayın; fesleğen kuruyunca hemen yaprak sarkıtır.
- Sabah sulamak yaprakların gün içinde kurumasını sağlar.

## Uç Alma: Gür Fesleğenin Sırrı

Bitki 15–20 cm boya ulaştığında en üstteki yaprak çiftini bir boğumun hemen üzerinden koparın. Bu, bitkinin yana dallanmasını sağlar ve daha gür bir görünüm verir.

> İpucu: Çiçek tomurcuklarını gördüğünüz anda koparın. Çiçek açan fesleğen yaprak üretimini azaltır ve yaprakların tadı acılaşır.

## Hasat

Yaprakları her zaman üstten, boğumun üzerinden koparın; tek tek alttan yaprak toplamak bitkiyi zayıflatır. Düzenli hasat, bitkiyi daha da gürleştirir.

> Unutmayın: Fesleğen soğuktan zarar görür. Sonbaharda geceler serinleyince saksıyı içeriye, aydınlık bir pencere önüne alın.`,
    sss: 'S: Fesleğen ne zaman ekilir?\nC: Hava ısındığında, ilkbaharın sonunda dışarıda; içeride aydınlık bir pencerede yıl boyunca ekilebilir.\n\nS: Fesleğen neden çiçek açınca kesilmeli?\nC: Çiçek açan fesleğen yaprak üretimini azaltır ve yapraklarının tadı değişir; tomurcukları koparmak yaprak verimini uzatır.',
  },
  {
    slug: 'yapraklar-neden-sararir', kategori: 'bitki-bakimi', one_cikan: true,
    baslik: 'Yapraklar Neden Sararır? 6 Neden, 6 Çözüm',
    ozet: 'Saksı bitkilerinde yaprak sararması en sık karşılaşılan sorundur. Sararmanın şeklinden nedenini nasıl anlayacağınızı ve ne yapacağınızı anlattık.',
    seo_aciklama: 'Bitki yaprakları neden sararır? Fazla sulama, ışık, besin eksikliği ve diğer nedenleri belirtilerinden tanıyın; saksı bitkilerinde sararmayı çözün.',
    odak: 'yapraklar neden sararır', etiketler: 'sararma, yaprak, bitki sağlığı, sulama',
    gorsel: F('sararma'), gorsel_alt: 'Sararmaya başlamış yaprak',
    kisaca: 'Yaprak sararmasının en sık nedeni fazla sulamadır. Bunu ışık eksikliği, besin eksikliği, saksının küçülmesi, ani ortam değişimi ve doğal yaşlanma izler. Sararmanın hangi yapraklarda ve nasıl başladığına bakmak nedeni bulmayı kolaylaştırır.',
    govde: `## Önce Belirtiye Bakın

Sararma bir hastalık değil, bir belirtidir. Hangi yaprakların, nasıl sarardığı size nedeni söyler. Aşağıdaki tablo hızlı bir başlangıç sağlar.

| Nasıl sararıyor? | En olası neden |
|---|---|
| Alt yapraklar sararıp yumuşuyor, toprak hep nemli | Fazla sulama |
| Yapraklar sararıp kuruyor, kenarlar gevrek | Susuzluk |
| Bitki soluk, ışığa doğru uzuyor | Işık yetersiz |
| Yeni yapraklarda damarlar yeşil, arası sarı | Besin eksikliği |
| Taşınmadan sonra birkaç yaprak birden sarardı | Ani ortam değişimi |
| Sadece en alttaki tek yaprak sarardı | Doğal yaşlanma |

## 1. Fazla Sulama

En yaygın nedendir. Kökler sürekli ıslak toprakta havasız kalır ve suyu alamaz hâle gelir. Toprağın üst kısmı kurumadan sulamayın ve saksı altında su birikmesine izin vermeyin.

## 2. Susuzluk

Toprak tamamen kuruyup uzun süre öyle kalırsa yapraklar sararıp kurur. Sulama düzeni kurun ve sıcak dönemlerde toprağı daha sık kontrol edin.

## 3. Işık Eksikliği

Işık yetersizse bitki enerjisini sınırlı sayıda yaprağa ayırır ve alt yaprakları bırakır. Bitkiyi ihtiyacına uygun, daha aydınlık bir yere alın.

## 4. Besin Eksikliği

Uzun süre aynı toprakta kalan bitkilerde besin tükenir. Büyüme döneminde organik bir gübreyle düzenli besleme yapın; kireçli topraklarda asit seven bitkilerde demir alımı zorlaşabilir.

[ürün:hasturk-sivi-solucan-gubresi, leonardit-organik-toprak-duzenleyici]

## 5. Saksı Küçüldü

Kökler saksıyı doldurduysa su ve besin yetmez. Kökler alttan çıkıyorsa bir boy büyük saksıya alın.

## 6. Ani Ortam Değişimi

Yer, sıcaklık ya da ışık değişimi birkaç yaprağın sararmasına yol açabilir. Bitkiyi sabit bir yerde tutun; genellikle kısa sürede toparlanır.

> İpucu: Sararan yaprak tekrar yeşile dönmez. Nedeni çözdükten sonra sararmış yaprakları dibinden temizleyin; bitki enerjisini yeni yapraklara versin.

> Unutmayın: Aynı anda birden fazla şeyi değiştirmeyin. Önce sulamayı düzenleyin, birkaç hafta gözlemleyin; sonra gerekiyorsa ışığa ve beslemeye geçin.`,
    sss: 'S: Sararan yaprak tekrar yeşerir mi?\nC: Hayır. Nedeni çözdükten sonra sararmış yaprakları temizlemek en doğrusudur.\n\nS: Yaprak sararmasının en yaygın nedeni nedir?\nC: Saksı bitkilerinde en sık neden fazla sulamadır.',
  },
  {
    slug: 'bitkiler-ne-siklikla-sulanmali', kategori: 'bahce-ipuclari',
    baslik: 'Bitkiler Ne Sıklıkla Sulanmalı? Doğru Sulama Rehberi',
    ozet: 'Her bitkinin su ihtiyacı farklıdır. Takvim yerine toprağa bakarak sulamayı, mevsime ve saksıya göre sulama düzenini anlattık.',
    seo_aciklama: 'Saksı bitkileri ne sıklıkla sulanır? Parmak testi, sabah sulaması, mevsime ve bitki türüne göre doğru sulama rehberi.',
    odak: 'bitkiler ne sıklıkla sulanmalı', etiketler: 'sulama, saksı bitkileri, bahçe, bakım',
    gorsel: F('sulama'), gorsel_alt: 'Yeşil sulama kabı',
    kisaca: 'Bitkileri sabit bir günde değil, toprak ihtiyaç duyduğunda sulayın. Parmağınızı toprağa 2–3 cm daldırın; kuruysa saksının altından su akana kadar sulayın, nemliyse bekleyin. Yazın ve küçük saksılarda daha sık, kışın daha seyrek sulama gerekir.',
    govde: `## Takvim Değil, Toprak

"Haftada iki kez sula" gibi sabit kurallar çoğu zaman sorun çıkarır. Aynı bitkinin su ihtiyacı mevsime, saksı boyutuna, ışığa ve odanın sıcaklığına göre değişir. En güvenilir yöntem toprağın kendisine bakmaktır.

## Parmak Testi

Parmağınızı toprağa 2–3 cm daldırın:
- **Kuru:** Sulama zamanı.
- **Nemli:** Bir iki gün bekleyin.
- **Islak:** Sulamayın; drenajı kontrol edin.

> İpucu: Saksıyı sulamadan önce ve sonra kaldırıp ağırlığını hissedin. Bir süre sonra sadece kaldırarak su ihtiyacını anlayabilirsiniz.

## Nasıl Sulamalı?

Az az ve sık sulamak yerine, gerektiğinde bol sulayın. Su saksının altından akana kadar verin; böylece tüm kök bölgesi ıslanır. Ardından tabakta biriken suyu boşaltın.

## Mevsime ve Duruma Göre

| Durum | Sulama ihtiyacı |
|---|---|
| Yaz, sıcak ve güneşli ortam | Daha sık |
| Kış, dinlenme dönemi | Daha seyrek |
| Küçük ve pişmiş toprak saksı | Daha çabuk kurur |
| Büyük ve plastik saksı | Nemi daha uzun tutar |
| Kaktüs ve sukulent | Toprak tamamen kuruyunca |
| Eğrelti, nem seven bitkiler | Toprak hafif nemli kalmalı |

## Hangi Saatte?

Bahçede ve balkonda en iyi zaman sabahın erken saatleridir. Su köklere ulaşır, yapraklar gün içinde kurur. Akşam sulamada yaprakların gece boyunca ıslak kalması mantar hastalıklarını kolaylaştırır.

## Toprağın Payı

Suyu çok tutan, sıkışmış toprak fazla sulama sorununu büyütür. Toprağa perlit eklemek havalandırmayı artırır; vermikülit ise suyu daha uzun tutar.

[ürün:tarim-perliti, hg-vermikulit]

> Unutmayın: Saksı bitkilerinde en sık ölüm nedeni susuzluk değil, fazla sudur. Kararsız kaldığınızda bir gün beklemek çoğu zaman daha güvenlidir.`,
    sss: 'S: Saksı bitkileri hangi saatte sulanmalı?\nC: Sabah saatleri en uygunudur; yapraklar gün içinde kurur ve mantar riski azalır.\n\nS: Bitkinin susadığını nasıl anlarım?\nC: Parmağınızı toprağa 2–3 cm daldırın; kuruysa sulama zamanıdır. Saksının hafiflemesi de bir işarettir.',
  },
  {
    slug: 'solucan-gubresi-nedir-nasil-kullanilir', kategori: 'gubreleme', one_cikan: true,
    baslik: 'Solucan Gübresi Nedir, Nasıl Kullanılır?',
    ozet: 'Solucan gübresi toprağı besleyen ve yapısını iyileştiren doğal bir gübredir. Ne işe yaradığını, nasıl ve ne kadar kullanılacağını anlattık.',
    seo_aciklama: 'Solucan gübresi nedir, faydaları nelerdir? Saksı, bahçe ve sebzelerde katı ve sıvı solucan gübresi nasıl ve ne kadar kullanılır?',
    odak: 'solucan gübresi nasıl kullanılır', etiketler: 'solucan gübresi, organik gübre, toprak, gübreleme',
    gorsel: F('kat-sebze'), gorsel_alt: 'Topraktan yeni çıkarılmış sebzeler',
    kisaca: 'Solucan gübresi, organik atıkların solucanlar tarafından işlenmesiyle oluşan doğal bir gübredir. Toprağın yapısını iyileştirir, besinleri yavaş salar ve doğru kullanıldığında kökleri yakmaz. Saksı karışımlarına genellikle hacimce yüzde 10–20 oranında katılır.',
    govde: `## Solucan Gübresi Nedir?

Solucan gübresi (vermikompost), organik maddelerin kırmızı solucanlar tarafından sindirilmesiyle ortaya çıkan, koyu renkli ve toprak kokulu bir maddedir. Hem bitkiyi besler hem de toprağın yapısını iyileştirir.

## Faydaları

- Besinleri yavaş ve dengeli salar; doğru kullanıldığında kökleri yakmaz.
- Toprağın su tutma kapasitesini ve havalanmasını iyileştirir.
- Topraktaki yararlı mikroorganizma yaşamını destekler.
- Saksı, bahçe, sebze ve meyve ağaçlarında kullanılabilir.

## Katı Solucan Gübresi Nasıl Kullanılır?

| Kullanım | Önerilen uygulama |
|---|---|
| Yeni saksı toprağı hazırlarken | Karışıma hacimce %10–20 civarında |
| Mevcut saksı bitkisi | Toprağın üstüne 1–2 cm serpip hafifçe karıştırın |
| Fide ve sebze dikimi | Dikim çukuruna bir avuç |
| Bahçe ve ağaç dipleri | Taç izdüşümüne serpip toprağa karıştırın |

Büyüme döneminde uygulamayı 1–2 ayda bir tekrarlayabilirsiniz.

[ürün:hasturk-kati-solucan-gubresi]

## Sıvı Solucan Gübresi

Sıvı solucan gübresi sulama suyuna karıştırılarak kullanılır ve bitkiye daha hızlı ulaşır. Özellikle büyüme ve çiçeklenme dönemlerinde katı gübreye ek destek olarak uygundur. Karışım oranı için ürün etiketine uyun.

[ürün:hasturk-sivi-solucan-gubresi]

> İpucu: Katı solucan gübresi toprağın yapısını uzun vadede iyileştirir, sıvı solucan gübresi ise hızlı destek verir. İkisini birlikte kullanmak çoğu bitki için iyi bir denge sağlar.

## Dikkat Edilecekler

- Gübreyi kuru toprağa değil, uygulamadan sonra sulayarak verin.
- Kışın dinlenmedeki bitkilerde uygulama aralığını açın.
- Kaktüs gibi az besin isteyen bitkilerde daha düşük oranda kullanın.

> Unutmayın: Organik gübreler toprağı zamanla zenginleştirir. Sonuçlar kimyasal gübreler kadar hızlı görünmeyebilir ama toprak her uygulamada daha sağlıklı hâle gelir.`,
    sss: 'S: Solucan gübresi kökleri yakar mı?\nC: Doğru miktarda kullanıldığında yakma riski düşüktür; besinleri yavaş ve dengeli salar.\n\nS: Solucan gübresi ne sıklıkla kullanılır?\nC: Büyüme döneminde 1–2 ayda bir; kışın aralık açılır.\n\nS: Katı ve sıvı solucan gübresi arasındaki fark nedir?\nC: Katı olan toprağın yapısını uzun vadede iyileştirir, sıvı olan sulama suyuyla verilir ve daha hızlı etki eder.',
  },
  {
    slug: 'kasim-ayinda-bahcede-yapilacaklar', kategori: 'ekim-takvimi',
    baslik: 'Kasım Ayında Bahçede ve Balkonda Yapılacaklar',
    ozet: 'Kasım, bahçeyi kışa hazırlama ve bazı ekimler için doğru zaman. Ay boyunca yapılacak işleri kısa bir takvimde topladık.',
    seo_aciklama: 'Kasım ayında ne ekilir, bahçede ne yapılır? Kışlık ekim, saksı bitkilerini içeri alma, fidan dikimi ve bahçe bakımı için kasım takvimi.',
    odak: 'kasım ayında ne ekilir', etiketler: 'kasım, ekim takvimi, kış hazırlığı, bahçe',
    gorsel: F('sera'), gorsel_alt: 'Serada çiçek tarhları',
    kisaca: 'Kasımda soğuğa hassas saksı bitkileri içeri alınır, sulama ve gübreleme azaltılır. Ilıman bölgelerde bezelye, bakla ve sarımsak ekimi yapılabilir; yaprağını döken meyve fidanlarının dikimi için de uygun bir dönemdir.',
    govde: `## Kasım: Hazırlık Ayı

Kasımda bahçe yavaşlar ama işler bitmez. Bu ayda yapılan hazırlıklar, ilkbaharda sağlıklı bir başlangıcın temelini atar. Aşağıdaki öneriler genel bir rehberdir; bulunduğunuz bölgenin iklimine göre birkaç hafta öne ya da geriye kayabilir.

## Saksı Bitkileri

- Limon, sardunya ve tropik bitkiler gibi soğuğa hassas bitkileri, gece sıcaklıkları düşmeden içeri alın.
- İçeri almadan önce yaprak altlarını ve saksıyı kontrol edin.
- Sulamayı azaltın; çoğu bitki kışın yavaş büyür.
- Gübrelemeye ara verin.

> İpucu: Bitkileri kalorifer peteklerinin hemen yanına ve cereyan alan kapı önlerine koymayın. Kuru ve sıcak hava yaprak dökülmesine neden olabilir.

## Ekim ve Dikim

| İş | Not |
|---|---|
| Bezelye ve bakla ekimi | Kışı ılık geçen bölgelerde |
| Sarımsak dikimi | Dişler sivri ucu yukarı bakacak şekilde |
| Soğanlı çiçekler (lale, sümbül) | Toprak donmadan önce |
| Meyve fidanı dikimi | Yapraklar döküldükten sonra |

[ürün:ekim-ayi-sebze-tohumu-seti-6-cesit-kislik-tohum]

## Bahçe Bakımı

- Dökülen yaprakları toplayın; hastalıklı olmayanları kompost yapabilirsiniz.
- Boşalan sebze tarhlarının toprağını organik maddeyle zenginleştirin.
- Bahçe aletlerinizi temizleyip yağlayın, kışa hazır hâle getirin.

[ürün:hasturk-kati-solucan-gubresi]

> Unutmayın: Kasımda toprağa eklenen organik madde kış boyunca toprakla karışır ve ilkbahara verimli bir toprak bırakır.`,
    sss: 'S: Kasımda ne ekilir?\nC: Ilıman bölgelerde bezelye, bakla ve sarımsak ekilebilir; lale ve sümbül gibi soğanlı çiçekler dikilir.\n\nS: Saksı bitkileri ne zaman içeri alınır?\nC: Gece sıcaklıkları düşmeye başladığında, soğuğa hassas bitkiler don görülmeden içeri alınmalıdır.',
  },
];
