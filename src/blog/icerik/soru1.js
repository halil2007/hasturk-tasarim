// Müşteri hizmetlerine sık gelen sorulardan derlenen soru-cevaplar (1/2).
// Soran "Bir bahçe sever" olarak gösterilir (derleme = 1); cevaplar ekipten isimli üyelerle yayınlanır.
// gun: kaç gün önce soruldu, saat: soru saati, sonra: cevabın sorudan kaç saat sonra geldiği
export const SORU_1 = [
  {
    kategori: 'cicekler', gun: 44, saat: '21:10',
    baslik: 'Orkidemin kökleri saksıdan dışarı çıkıyor, kesmeli miyim?',
    metin: 'Phalaenopsis orkidemin birkaç kökü saksının üstünden havaya doğru uzadı. Kesmem mi gerekiyor yoksa saksı mı değiştirmeliyim?',
    cevaplar: [
      { yazar: 'Hatice Kübra Çelik', sonra: 5, metin: `Kesmeyin; bunlar hava kökleridir ve orkide için tamamen doğaldır. Phalaenopsis doğada ağaç gövdelerine tutunarak yaşar ve köklerinin bir kısmı her zaman havada durur. Bu kökler havadaki nemi alır ve bitkiyi besler.

Sağlıklı hava kökü yeşil ya da gümüşi gri, sert ve dolgundur. Yalnızca kahverengi, yumuşak, içi boşalmış ya da tamamen kurumuş kökleri temiz bir makasla kesebilirsiniz.

Kökler saksıdan dışarı taşıyor ve kabuk ortamı da ufalanıp sıkıştıysa çiçeklenme bittikten sonra bir boy büyük saksıya ve taze orkide kabuğuna geçebilirsiniz. Hava köklerini zorla saksının içine sokmaya çalışmayın; kırılabilirler.` },
    ],
  },
  {
    kategori: 'bitki-bakimi', gun: 43, saat: '10:25',
    baslik: 'Barış çiçeğimin yaprak uçları kahverengileşiyor, neden?',
    metin: 'Salonda duran barış çiçeğimin yapraklarının uçları kahverengi ve kuru. Haftada iki kez suluyorum, gübre de verdim. Ne yanlış yapıyorum?',
    cevaplar: [
      { yazar: 'Rümeysa Altınova', sonra: 7, metin: `Barış çiçeğinde yaprak uçlarının kahverengileşmesinin üç yaygın nedeni vardır:

1. Düşük hava nemi: Kaloriferli evlerde en sık neden budur. Saksıyı içinde çakıl ve su bulunan bir tepsinin üzerine koymak ya da bitkileri bir arada gruplamak nemi artırır.
2. Tuz birikimi: Sık gübreleme ve kireçli su toprakta tuz biriktirir. Ayda bir saksıyı bol suyla yıkayıp altından su akıtın ve gübreyi büyüme döneminde ayda bire indirin.
3. Düzensiz sulama: Toprak tamamen kurumadan ve bitki iyice sarkmadan sulayın ama kupkuru da bırakmayın.

Kahverengi uçları yaprağın şeklini koruyarak makasla düzeltebilirsiniz; yeni yapraklar düzelirse sorun çözülmüş demektir.` },
      { yazar: 'Halil İbrahim Çelik', sonra: 20, metin: `Bir ek: Haftada iki kez sulama kışın barış çiçeği için fazla olabilir. Sulamadan önce parmağınızı toprağa batırın; üst 2–3 cm kuruysa sulayın. Barış çiçeği susadığında yapraklarını belirgin şekilde sarkıtarak zaten haber verir.` },
    ],
  },
  {
    kategori: 'bitki-bakimi', gun: 42, saat: '14:40',
    baslik: 'Paşa kılıcı ne kadar sıklıkla sulanır, kışın da aynı mı?',
    metin: 'Yeni bir paşa kılıcı aldım. Çok az su istediğini duydum ama ne kadar az olduğunu bilmiyorum. Kışın sulamayı değiştirmem gerekir mi?',
    cevaplar: [
      { yazar: 'Mehmet Fatih Çelik', sonra: 4, metin: `Paşa kılıcı (Sansevieria) yapraklarında su depolar ve fazla sudan, susuzluktan çok daha fazla zarar görür.

- İlkbahar ve yaz: Toprak tamamen kuruduğunda bol sulayın. Bu genellikle 2–3 haftada bir olur.
- Kış: Ayda bir, hatta serin odalarda daha seyrek sulama yeterlidir.

Sulamadan önce toprağın en altına kadar kuru olduğundan emin olun. Yapraklar dipten yumuşayıp sararıyorsa fazla sulama yapılıyordur. Süzek bir toprak ve drenaj delikli bir saksı çok önemlidir; kaktüs ve sukulent toprağı paşa kılıcı için de uygundur.` },
    ],
  },
  {
    kategori: 'sebze-meyve', gun: 41, saat: '18:05',
    baslik: 'Fesleğenim çiçek açtı, yaprakları hâlâ yenir mi?',
    metin: 'Balkondaki fesleğenim ucunda beyaz çiçekler açtı. Yaprakları yemeye devam edebilir miyim, çiçekleri kesmeli miyim?',
    cevaplar: [
      { yazar: 'Rümeysa Altınova', sonra: 3, metin: `Yaprakları yemeye devam edebilirsiniz; zararlı değildir. Ancak fesleğen çiçeklenmeye başladığında yaprak üretimi azalır, yapraklar sertleşir ve tadı biraz acılaşabilir.

Çiçek salkımlarını, altındaki ilk yaprak çiftinin hemen üstünden kesin. Bu, bitkiyi yeniden yaprak üretmeye yönlendirir ve yana doğru dallanmasını sağlar. Bundan sonra uçları düzenli olarak alırsanız çiçeklenme önemli ölçüde gecikir.

Çiçekler de yenilebilir; salatalarda hafif bir fesleğen aroması verir.` },
    ],
  },
  {
    kategori: 'toprak-rehberi', gun: 40, saat: '09:15',
    baslik: 'Saksıdaki toprağın üstünde beyaz kabuk oluştu, bu ne?',
    metin: 'Birkaç saksımda toprağın yüzeyinde ve saksının kenarlarında beyaz, sert bir tabaka oluştu. Küf mü, yoksa başka bir şey mi?',
    cevaplar: [
      { yazar: 'Ahmet Sacit Çelik', sonra: 6, metin: `Sert ve kabuk gibi bir tabaka genellikle tuz ve kireç birikimidir; küf ise pamuk gibi yumuşak ve kabarık olur.

Tuz birikimi kireçli şebeke suyu ve sık gübreleme sonucu oluşur. Zamanla köklere zarar verebilir ve yaprak uçlarında kahverengileşmeye yol açar.

Ne yapabilirsiniz:
- Beyaz kabuklu üst toprağı 1–2 cm kazıyıp taze toprakla değiştirin.
- Ayda bir saksıyı bol suyla sulayıp altından bolca su akmasını sağlayın; tuzlar yıkanır.
- Mümkünse bekletilmiş ya da filtrelenmiş su kullanın.
- Gübre dozunu azaltın.

Pişmiş toprak saksıların dışındaki beyaz izleri sirkeli suyla fırçalayarak temizleyebilirsiniz.` },
    ],
  },
  {
    kategori: 'bitki-bakimi', gun: 39, saat: '20:50',
    baslik: 'Kaktüsüm uzayıp inceldi, düzelir mi?',
    metin: 'Kaktüsüm yukarı doğru uzadı, üst kısmı alt kısmından daha ince ve rengi açık yeşil oldu. Eski haline döner mi?',
    cevaplar: [
      { yazar: 'Rümeysa Altınova', sonra: 9, metin: `Bu duruma etiyolasyon denir ve kaktüsün yeterli ışık almadığını gösterir. Bitki ışığı bulmak için uzar ve incelir.

Maalesef incelmiş kısım eski haline dönmez. Ancak kaktüsü daha aydınlık bir yere (güney ya da batı penceresi) aldığınızda bundan sonraki büyüme yeniden kalın ve sağlıklı olur.

Birkaç öneri:
- Kaktüsü birden doğrudan sert güneşe çıkarmayın; bir iki hafta içinde yavaş yavaş alıştırın, yoksa yanık lekeleri oluşur.
- Görünüm sizi rahatsız ediyorsa ilkbaharda incelmiş kısmı kesip birkaç gün kurutarak yeni bir bitki olarak köklendirebilirsiniz. Kalan ana gövde de yanlardan yeni yavrular verebilir.` },
    ],
  },
  {
    kategori: 'bitki-bakimi', gun: 38, saat: '11:30',
    baslik: 'Salon sarmaşığı suda köklendirilebilir mi?',
    metin: 'Uzayan salon sarmaşığımın dallarını kesip çoğaltmak istiyorum. Suda köklendirebilir miyim, yoksa doğrudan toprağa mı dikmeliyim?',
    cevaplar: [
      { yazar: 'Hatice Kübra Çelik', sonra: 4, metin: `Evet, salon sarmaşığı (Epipremnum, pothos) suda çok kolay köklenir.

1. Her çelikte en az bir iki boğum (yaprağın gövdeye bağlandığı ve küçük kahverengi kök çıkıntılarının bulunduğu nokta) olacak şekilde 10–15 cm'lik parçalar kesin.
2. Suyun içinde kalacak yaprakları koparın.
3. Çelikleri boğumları suyun içinde kalacak şekilde bir kavanoza koyun.
4. Aydınlık ama doğrudan güneş almayan bir yerde tutun ve suyu haftada bir değiştirin.

Kökler genellikle iki üç hafta içinde çıkar. Kökler 5 cm olduğunda saksıya dikin. Birkaç çeliği aynı saksıya dikerseniz daha gür bir görünüm elde edersiniz.` },
    ],
  },
  {
    kategori: 'cicekler', gun: 37, saat: '16:20',
    baslik: 'Gül fidanını saksıdan bahçeye ne zaman dikebilirim?',
    metin: 'Saksıda aldığım bir gül fidanını bahçeye dikmek istiyorum. Hangi ay dikmem daha doğru olur?',
    cevaplar: [
      { yazar: 'Mikdat Çelik', sonra: 8, metin: `Saksılı (tüplü) gül fidanları aslında yılın büyük bölümünde dikilebilir; ancak en uygun dönemler sonbahar (Ekim–Kasım) ve ilkbahar başıdır (Mart).

Sonbahar dikimi özellikle avantajlıdır: Toprak hâlâ sıcak olduğu için gül kışı kök salarak geçirir ve ilkbaharda daha güçlü başlar.

Dikimde dikkat edilecekler:
- Günde en az 6 saat güneş alan bir yer seçin.
- Kök topundan iki kat geniş bir çukur açın ve toprağı kompost ya da solucan gübresiyle zenginleştirin.
- Fidanı saksıdaki derinliğinde dikin, aşı noktası toprak seviyesinde ya da biraz üstünde kalsın.
- Dikimden sonra bol can suyu verin.

Yaz sıcağında ve donlu günlerde dikimden kaçının.` },
    ],
  },
  {
    kategori: 'sebze-meyve', gun: 36, saat: '08:45',
    baslik: 'Domates fidelerim çok uzadı ve inceldi, ne yapmalıyım?',
    metin: 'Evde tohumdan çıkardığım domates fideleri çok uzun ve ince oldu, bazıları yatıyor. Kurtarabilir miyim?',
    cevaplar: [
      { yazar: 'Ahmet Sacit Çelik', sonra: 5, metin: `Fidelerin uzayıp incelmesi neredeyse her zaman ışık yetersizliğinden kaynaklanır. İyi haber şu ki domates bu durumdan kurtarılabilen nadir sebzelerden biridir.

- Domates, gövdesinin toprağa gömülen kısmından da kök verir. Fideleri daha derin saksılara şaşırtırken gövdeyi ilk yapraklara kadar toprağa gömün. Böylece fide hem dik durur hem de daha güçlü bir kök sistemi oluşturur.
- Fideleri hemen en aydınlık pencereye alın ve her gün saksıyı çevirin. Mümkünse bir bitki lambası kullanın.
- Ortam çok sıcaksa fideler daha hızlı uzar; gece biraz daha serin bir ortam büyümeyi dengeler.
- Fidelere her gün elinizle hafifçe dokunmak ya da hafif bir esinti sağlamak gövdeyi kalınlaştırır.` },
      { yazar: 'Mehmet Fatih Çelik', sonra: 26, metin: `Ekleyeyim: Biber fidelerinde aynı derin dikim yöntemi işe yaramaz; biberi gövdesini gömmeden eski derinliğinde dikmek gerekir. Bu yöntem domatese özeldir.` },
    ],
  },
  {
    kategori: 'gubreleme', gun: 35, saat: '19:30',
    baslik: 'Kahve telvesi bitkilere gübre olarak verilir mi?',
    metin: 'Her gün kahve içiyorum ve telveyi saksılarıma dökmeyi düşünüyorum. Faydalı mı, zarar verir mi?',
    cevaplar: [
      { yazar: 'Halil İbrahim Çelik', sonra: 6, metin: `Kahve telvesi bir miktar azot ve organik madde içerir; ancak doğrudan ve bol miktarda saksıya dökmek önerilmez.

- Telve topraktaki ince bir tabaka halinde birikince sıkışır, suyun ve havanın geçişini zorlaştırır.
- Nemli telvede küf oluşabilir.
- Taze telve bazı bitkilerin gelişimini yavaşlatabilir.

En iyi kullanım yolu telveyi komposta eklemektir; kompostta diğer malzemelerle birlikte ayrışır ve değerli bir besine dönüşür. Doğrudan kullanmak isterseniz kurutup çok ince bir kat halinde toprağa karıştırın ve bunu ayda bir ile sınırlayın.

Bitkileri dengeli beslemek için solucan gübresi gibi organik gübreler çok daha güvenilir sonuç verir.` },
    ],
  },
  {
    kategori: 'gubreleme', gun: 34, saat: '13:00',
    baslik: 'Yumurta kabuğu saksıya konur mu, işe yarar mı?',
    metin: 'Yumurta kabuklarını ezip saksılara koymanın kalsiyum verdiğini duydum. Doğru mu?',
    cevaplar: [
      { yazar: 'Mehmet Fatih Çelik', sonra: 4, metin: `Yumurta kabuğu büyük oranda kalsiyum karbonattan oluşur; ancak kabuk parçaları toprakta çok yavaş çözünür. İri parçalar halinde saksıya koymak bitkiye kısa vadede neredeyse hiç kalsiyum sağlamaz.

Fayda sağlamak istiyorsanız:
- Kabukları iyice yıkayıp kurutun ve toz haline gelene kadar öğütün.
- Bu tozu az miktarda toprağa karıştırın ya da komposta ekleyin.

Ayrıca kalsiyum karbonat toprağın pH değerini bir miktar yükseltir. Ortanca, yaban mersini ve açelya gibi asit seven bitkilerde yumurta kabuğu kullanmayın.

Domatesteki çiçek burnu çürüklüğü çoğu zaman topraktaki kalsiyum eksikliğinden değil düzensiz sulamadan kaynaklanır; düzenli sulama daha etkili bir çözümdür.` },
    ],
  },
  {
    kategori: 'gubreleme', gun: 33, saat: '17:15',
    baslik: 'Sıvı solucan gübresini yapraklara püskürtebilir miyim?',
    metin: 'Sıvı solucan gübresini sulama suyuna karıştırıyorum. Yapraklara püskürterek de kullanılabilir mi?',
    cevaplar: [
      { yazar: 'Halil İbrahim Çelik', sonra: 3, metin: `Sıvı solucan gübresi ürün etiketinde yapraktan uygulamaya uygun olduğu belirtilmişse, önerilen oranda seyreltilerek yapraklara da püskürtülebilir. Yapraktan uygulama besinin bir kısmının yaprak yüzeyinden hızla alınmasını sağlar.

Dikkat edilecekler:
- Mutlaka etiketteki seyreltme oranına uyun; koyu karışım yaprakları yakabilir.
- Uygulamayı sabah erken ya da akşamüstü yapın; güneşin altında yaprakta kalan damlalar lekelere yol açabilir.
- Tüylü yapraklı bitkilerde (menekşe, begonya) yaprağa püskürtme yapmayın.
- Yapraktan uygulama, topraktan beslemenin yerini tutmaz; destek olarak kullanılmalıdır.

Ana beslemeyi her zaman toprağa, sulama suyuyla birlikte yapmanız daha dengeli sonuç verir.` },
    ],
  },
  {
    kategori: 'sebze-meyve', gun: 32, saat: '10:40',
    baslik: 'Saksıdaki zeytin ağacım kışın balkonda kalabilir mi?',
    metin: 'İstanbul\'da yaşıyorum, balkonda saksıda bir zeytin ağacım var. Kışın içeri almam gerekir mi?',
    cevaplar: [
      { yazar: 'Ahmet Sacit Çelik', sonra: 7, metin: `İstanbul gibi ılıman kıyı bölgelerinde saksıdaki zeytin çoğu kış balkonda kalabilir. Zeytin kısa süreli hafif donlara dayanır; ancak saksıdaki kökler bahçedekine göre çok daha hassastır.

Balkonda kışlatıyorsanız:
- Saksıyı rüzgâr almayan, duvar dibindeki bir köşeye alın.
- Saksının etrafını karton ya da jütle sarın ve tahta bir altlığın üzerine koyun.
- Kışın sulamayı azaltın; toprağın ıslak kalması soğukta kök çürümesine yol açar.
- Birkaç gün sürecek sert don ve kar uyarılarında ağacı geçici olarak kapalı balkona ya da serin bir odaya alın.

Zeytinin kışın serin bir dönem geçirmesi aslında çiçeklenmesi için faydalıdır; sıcak bir salonda kışlatmak yerine serin bir yer tercih edin.` },
    ],
  },
  {
    kategori: 'sebze-meyve', gun: 31, saat: '15:55',
    baslik: 'Yaban mersini saksıda yetişir mi, hangi toprak gerekir?',
    metin: 'Balkonda yaban mersini yetiştirmek istiyorum. Saksıda olur mu, toprağı nasıl olmalı?',
    cevaplar: [
      { yazar: 'Mikdat Çelik', sonra: 5, metin: `Yaban mersini saksıda çok iyi yetişir; hatta toprağını kontrol edebildiğiniz için saksı birçok bahçeden daha uygundur.

En önemli konu toprak asitliğidir: Yaban mersini pH 4,5–5,5 arası asidik bir toprak ister. Normal saksı ya da bahçe toprağında yaprakları sararır ve gelişmez. Asidik torf ağırlıklı, yaban mersinine özel bir karışım kullanın.

Diğer öneriler:
- En az 30–40 litrelik, drenaj delikli bir saksı.
- Günde en az 6 saat güneş.
- Toprağı sürekli hafif nemli tutun; yaban mersini kuraklığı sevmez.
- Mümkünse yağmur suyu ya da bekletilmiş suyla sulayın; kireçli su zamanla pH'ı yükseltir.
- Daha iyi meyve tutumu için iki farklı çeşit yan yana yetiştirin.` },
      { yazar: 'Rümeysa Altınova', sonra: 22, metin: `Küçük bir not: Saksıdaki yaban mersininin ilk bir iki yıl verdiği çiçekleri koparmak, bitkinin önce kök ve dal geliştirmesini sağlar ve sonraki yıllarda hasadı artırır.` },
    ],
  },
  {
    kategori: 'toprak-rehberi', gun: 30, saat: '12:20',
    baslik: 'Orkideyi normal saksı toprağına dikersem ne olur?',
    metin: 'Orkide toprağı bulamadım, elimdeki normal saksı toprağına diksem sorun olur mu?',
    cevaplar: [
      { yazar: 'Hatice Kübra Çelik', sonra: 4, metin: `Phalaenopsis gibi orkideler normal saksı toprağında uzun süre yaşayamaz. Bu orkidelerin kökleri doğada ağaç kabuklarına tutunur ve sürekli havayla temas halindedir.

Normal saksı toprağı suyu uzun süre tutar ve kökler arasındaki havayı keser. Birkaç hafta içinde kökler oksijensiz kalıp çürümeye başlar; yapraklar sararır ve buruşur.

Orkide için çam kabuğu ağırlıklı, iri taneli ve havadar bir orkide ortamı kullanmanız gerekir. Kısa süreliğine geçici bir çözüm olarak orkideyi kendi eski kabuğunda bırakmak, toprağa dikmekten çok daha güvenlidir. Saksı değiştirmeyi uygun orkide ortamını bulana kadar erteleyebilirsiniz.` },
    ],
  },
  {
    kategori: 'toprak-rehberi', gun: 29, saat: '18:35',
    baslik: 'Kokopit (hindistan cevizi torfu) nedir, torf yerine kullanılır mı?',
    metin: 'Bazı topraklarda kokopit yazıyor. Ne işe yarıyor ve torfun yerine kullanabilir miyim?',
    cevaplar: [
      { yazar: 'Mehmet Fatih Çelik', sonra: 6, metin: `Kokopit, hindistan cevizi kabuğunun lifli ve tozlu kısmından elde edilen doğal bir yetiştirme ortamıdır. Torfa benzer şekilde suyu çok iyi tutar ve toprağa hafif, gevşek bir yapı kazandırır.

Torfla karşılaştırınca:
- pH değeri nötre yakındır; torf ise genellikle asidiktir.
- Kuruduktan sonra yeniden ıslanması torfa göre daha kolaydır.
- Yenilenebilir bir kaynaktır.

Kokopit çoğu saksı karışımında torfun yerine ya da torfla birlikte kullanılabilir. Ancak ortanca ve yaban mersini gibi asit seven bitkilerde asidik torf daha uygundur. Kokopit besin içermediği için karışıma perlit gibi bir havalandırıcı ve solucan gübresi gibi bir besin kaynağı eklemek gerekir. Sıkıştırılmış blok halinde satılan kokopiti kullanmadan önce suyla şişirmeyi unutmayın.` },
    ],
  },
  {
    kategori: 'bahce-ipuclari', gun: 28, saat: '09:50',
    baslik: 'Saksının dibine çakıl koymak gerekli mi?',
    metin: 'Hep saksının dibine çakıl ya da taş koymak gerektiğini duydum. Bu gerçekten drenajı artırıyor mu?',
    cevaplar: [
      { yazar: 'Mikdat Çelik', sonra: 5, metin: `Bu çok yaygın bir inanış ama çoğu durumda beklenen faydayı sağlamaz. Saksı dibindeki çakıl katmanı suyun daha hızlı akmasını sağlamaz; aksine su, toprakla çakılın birleştiği noktada tutunur ve ıslak bölge yukarı, köklerin olduğu kısma kayar.

Drenajı asıl sağlayan iki şey vardır:
1. Saksının altındaki drenaj deliği.
2. Toprağın kendisinin süzek olması (perlit gibi katkılar).

Ne yapmalı:
- Mutlaka drenaj delikli saksı kullanın.
- Toprağın deliği tıkamaması için deliğin üzerine bir parça tül ya da filtre koyabilirsiniz.
- Çok büyük saksılarda dibe ince bir kat kil bilyesi koymak saksıyı hafifletir ve sorun yaratmaz; ama drenajın asıl kaynağı yine delik ve süzek topraktır.` },
    ],
  },
  {
    kategori: 'bahce-ipuclari', gun: 27, saat: '14:10',
    baslik: 'Musluk suyu bitkilere zarar verir mi?',
    metin: 'Bitkilerimi doğrudan musluk suyuyla suluyorum. Bekletmem ya da başka bir su kullanmam gerekir mi?',
    cevaplar: [
      { yazar: 'Ahmet Sacit Çelik', sonra: 4, metin: `Çoğu bitki için musluk suyu kullanılabilir; ancak bölgenize göre suyun kireç oranı yüksekse uzun vadede bazı sorunlar çıkabilir.

- Kireçli su toprağın pH değerini zamanla yükseltir. Ortanca, yaban mersini, açelya, gardenya ve orkide gibi bitkiler bundan etkilenir; yapraklarda damarlar yeşil kalıp aralar sararır.
- Toprak yüzeyinde ve saksı kenarında beyaz kabuk oluşabilir.

Basit önlemler:
- Suyu bir gece bekletmek klorun buharlaşmasını sağlar ve suyun oda sıcaklığına gelmesine yardımcı olur.
- Hassas bitkiler için yağmur suyu, filtrelenmiş su ya da kaynatılıp soğutulmuş su kullanabilirsiniz.
- Ayda bir saksıyı bol suyla yıkayıp tuzların akmasını sağlayın.

Kaktüs, paşa kılıcı, sardunya ve zeytin gibi bitkiler kireçli suya oldukça dayanıklıdır.` },
    ],
  },
  {
    kategori: 'bahce-ipuclari', gun: 26, saat: '20:15',
    baslik: '10 gün tatile gidiyorum, kaktüslerime bir şey olur mu?',
    metin: 'Evde birkaç kaktüs ve sukulentim var. On günlük tatil için önlem almam gerekiyor mu?',
    cevaplar: [
      { yazar: 'Rümeysa Altınova', sonra: 3, metin: `Hiç endişelenmeyin; kaktüs ve sukulentler on günlük bir tatili rahatlıkla geçirir. Hatta bu bitkiler için asıl risk susuzluk değil, fazla sudur.

- Tatile çıkmadan birkaç gün önce, toprak kuruysa normal şekilde bol sulayın ve fazla suyun süzülmesini bekleyin.
- Bitkileri her zamanki aydınlık yerlerinde bırakabilirsiniz; yazın çok sıcak bir cam önündeyseniz biraz geri çekmek yeterlidir.
- Kaktüslerin altındaki tabaklarda su bırakmayın.
- Komşunuz sulama yapacaksa kaktüsleri ayırın ve sulanmaması gerektiğini not edin.

Daha uzun tatillerde ya da nem seven bitkileriniz için fitil sulama gibi yöntemleri blogumuzdaki "Tatilde Bitkiler Nasıl Sulanır?" yazısında anlattık.` },
    ],
  },
  {
    kategori: 'bahce-ipuclari', gun: 25, saat: '11:45',
    baslik: 'Saksıdaki küçük siyah sineklerden nasıl kurtulurum?',
    metin: 'Salon bitkilerimin etrafında küçük siyah sinekler uçuşuyor. Toprakta yaşıyorlar gibi. Ne yapmalıyım?',
    cevaplar: [
      { yazar: 'Halil İbrahim Çelik', sonra: 5, metin: `Bunlar büyük ihtimalle toprak sinekleridir. Erişkin sinekler zararsızdır ama larvaları sürekli ıslak toprakta çoğalır ve genç kökleri kemirebilir. Varlıkları genellikle fazla sulamanın işaretidir.

Kimyasal kullanmadan uygulayabileceğiniz adımlar:
1. Sulamayı seyreltin ve toprağın üst 3–4 cm'inin tamamen kurumasına izin verin. Larvalar kuru toprakta yaşayamaz.
2. Sarı yapışkan tuzakları saksılara yerleştirin; erişkinleri yakalar ve yeni yumurtlamayı azaltır.
3. Toprak yüzeyine ince bir kat kum ya da kil bilyesi serin; sineklerin yumurta bırakmasını zorlaştırır.
4. Altlıkta su bırakmayın.
5. Çok yoğun bulaşmada toprağı tamamen yenileyin.

Birkaç hafta düzenli uygulandığında sinekler büyük ölçüde ortadan kalkar.` },
      { yazar: 'Hatice Kübra Çelik', sonra: 30, metin: `Ben de bir ipucu ekleyeyim: Mümkünse saksıları alttan sulayın. Saksıyı 15–20 dakika su dolu bir kaba koyduğunuzda toprağın yüzeyi kuru kalır ve sineklerin yumurtlaması zorlaşır.` },
    ],
  },
];
