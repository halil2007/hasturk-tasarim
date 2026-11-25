// Reklam bilgi tabanı: öneri motorunun (reklam-analiz.mjs) dayandığı ilkeler. Her madde Google'ın resmi yardım
// sayfalarından özetlendi (Ekim 2026'da derlendi) ve kaynağıyla birlikte panelde "Dayanak" olarak gösterilir.
// Motor bu ilkelerin dışında öneri üretmez; yeni kural eklenecekse önce buraya kaynağıyla eklenir.
// Google sayfaları zamanla değişebilir: yılda bir kaynaklar yeniden kontrol edilmeli.

export const BILGI = {
  ogrenme: {
    baslik: 'Akıllı teklif öğrenme dönemi',
    ilke: 'Teklif stratejisi değiştirildiğinde ya da kampanyada büyük değişiklik yapıldığında sistem bir öğrenme döneminden geçer; Google sonuçların ancak 1–2 hafta sonra değerlendirilmesini önerir. Bütçe ve hedef değişiklikleri bir sonraki açık artırmada uygulanır. Büyük değişiklikleri tek seferde yapmak öğrenme süresini kısaltır. Bu yüzden öneriler bütçeyi kademeli (%15–20) değiştirip en az 7–14 gün izlemeyi söyler.',
    kaynak: [['About Smart Bidding learning', 'https://support.google.com/google-ads/answer/13020501'], ['Fix "Limited by budget"', 'https://support.google.com/google-ads/answer/2616012']],
  },
  butce: {
    baslik: '"Bütçe nedeniyle sınırlı" durumu',
    ilke: 'Kampanya durumu "Bütçe nedeniyle sınırlı" ise günlük bütçe, mevcut ayarlarla alınabilecek tüm gösterim ve tıklamalara yetmiyor demektir; Google bu durumda ek dönüşümlerin kaçırıldığını belirtir. İyi dönen bir kampanyada bütçe artışı ancak bu durum varsa anlamlıdır; yoksa bütçe artışı tek başına satış getirmeyebilir.',
    kaynak: [['Fix "Limited by budget"', 'https://support.google.com/google-ads/answer/2616012']],
  },
  troas: {
    baslik: 'Hedef ROAS ve dönüşüm hacmi',
    ilke: 'Arama ve Alışveriş kampanyalarında hedef ROAS için Google, son 30 günde en az 15 dönüşüm ister; hedefe istikrarlı ulaşmak için reklam grubu başına ayda ~30 dönüşüm önerir. Önerilen hedef son 28 günün ortalamasından, dönüşüm gecikmesi nedeniyle son birkaç gün hariç tutularak hesaplanır. Değerlendirme yaparken de son günlerin gecikmeli satışları hesaba katılmalıdır.',
    kaynak: [['About Target ROAS bidding', 'https://support.google.com/google-ads/answer/6268637'], ['Set up Target ROAS for Shopping', 'https://support.google.com/google-ads/answer/6309035'], ['One-click Target ROAS experiments', 'https://support.google.com/google-ads/answer/11204214']],
  },
  ayar: {
    baslik: 'Akıllı teklifte manuel teklif ayarları',
    ilke: 'Hedef ROAS, Dönüşümleri/Dönüşüm değerini en üst düzeye çıkarma gibi akıllı teklif stratejileri cihaz, konum ve zaman için yapılan yüzde teklif ayarlarını kullanmaz; yalnızca cihaz için -%100 (tamamen kapatma) dikkate alınır. Reklam planlamasındaki gün/saat aralıkları ise uygulanır. Bu yüzden akıllı teklifli kampanyalarda "cihaz/gün teklifini düşür" önerilmez; sorun site deneyiminde ya da gerekiyorsa reklam planlamasında aranır.',
    kaynak: [['About bid adjustments', 'https://support.google.com/google-ads/answer/2732132'], ['Ad schedule bid adjustment', 'https://support.google.com/google-ads/answer/6372644']],
  },
  negatif: {
    baslik: 'Negatif anahtar kelime: ölçülü kullanım',
    ilke: 'Arama terimleri raporu, alakasız aramaları bulup negatif anahtar kelime eklemek içindir. Google, arama terimlerinin 1–2 haftada bir gözden geçirilmesini ve bir terimin ancak tüm kampanyalarda hedefin altında kalıyorsa negatife eklenmesini önerir; fazla negatif eklemek yapay zekânın değerli trafiği bulmasını engelleyebilir. Negatifler yakın varyantları kapsamaz. Performance Max için negatifler hesap ya da kampanya düzeyinde eklenir.',
    kaynak: [['About the search terms report', 'https://support.google.com/google-ads/answer/2472708'], ['Negative keyword ideas from search terms', 'https://support.google.com/google-ads/answer/7102466'], ['Negative keywords in Performance Max', 'https://support.google.com/google-ads/answer/15726455'], ['About negative keywords', 'https://support.google.com/google-ads/answer/16668865']],
  },
  marka: {
    baslik: 'Kendi marka adına reklam: marka hariç tutma',
    ilke: 'Kendi marka adınızla yapılan aramalara ödeme yapmamak için Google, negatif anahtar kelime yerine "marka hariç tutma" (brand exclusions) önerir; yazım hatalarını ve varyantları da kapsar. Performance Max\'te Arama ve Alışveriş envanterine uygulanır. Organikte zaten üstte olunan markalı aramalarda bu bir deneme olarak düşünülmelidir.',
    kaynak: [['About brand exclusions', 'https://support.google.com/google-ads/answer/16669487'], ['Brand settings for Search and PMax', 'https://support.google.com/google-ads/answer/13721847']],
  },
  tema: {
    baslik: 'Satan aramaları öne çıkarma: tam eşleme ve arama temaları',
    ilke: 'Satış getiren arama terimleri, arama kampanyasında ayrı (tam eşleme) anahtar kelime olarak eklenerek teklif, reklam metni ve açılış sayfası bu aramaya göre ayarlanabilir. Performance Max\'te öğe grubu başına 50\'ye kadar arama teması eklenebilir; birbirinin eş anlamlısı olan temalar aynı kitleye ulaştığı için gereksizdir.',
    kaynak: [['Optimize your keyword list', 'https://support.google.com/google-ads/answer/6337820'], ['Search themes in Performance Max', 'https://support.google.com/google-ads/answer/14767319']],
  },
  kalite: {
    baslik: 'Kalite puanı ve açılış sayfası deneyimi',
    ilke: 'Kalite puanı üç bileşenden oluşur: beklenen tıklama oranı, reklam alaka düzeyi ve açılış sayfası deneyimi. Açılış sayfası, reklamı tıklayan kişi için alakalı ve kullanışlı olmalı; reklamdaki ürün ve çağrı sayfada karşılanmalıdır. Ziyaretçinin hemen çıktığı sayfalar hem bütçeyi boşa harcar hem de reklam kalitesini düşürür.',
    kaynak: [['About Quality Score', 'https://support.google.com/google-ads/answer/6167118'], ['Optimise your ads and landing pages', 'https://support.google.com/google-ads/answer/6238826']],
  },
  olcum: {
    baslik: 'Ölçüm: otomatik etiketleme ve GA4 bağlantısı',
    ilke: 'Google Ads tıklamalarının Analytics\'te doğru kampanyaya yazılması ve GA4 dönüşümlerinin Ads\'e aktarılması için Ads hesabında otomatik etiketleme açık olmalı ve GA4 mülkü Ads\'e bağlı olmalıdır. GA4\'te otomatik etiketleme manuel UTM etiketlerinin önüne geçer. Ölçüm eksikse diğer bütün öneriler yanıltıcı olur.',
    kaynak: [['About auto-tagging', 'https://support.google.com/google-ads/answer/3095550'], ['[GA4] Link GA4 and Google Ads', 'https://support.google.com/google-ads/answer/7519537'], ['Create conversions from GA4 events', 'https://support.google.com/google-ads/answer/2375435']],
  },
  atama: {
    baslik: 'Analytics ve Ads rakamları neden farklı',
    ilke: 'Bu paneldeki satış/gelir Analytics\'in oturumu son tıklanan kampanyaya yazmasıyla hesaplanır. Google Ads ise kendi dönüşüm penceresi (varsayılan 30 gün) ve atama modeliyle sayar; özellikle Performance Max ve görüntülü reklamlarda Ads\'teki dönüşümler daha yüksek görünür. Kesme/azaltma kararından önce iki kaynak birlikte değerlendirilmelidir.',
    kaynak: [['About conversion windows', 'https://support.google.com/google-ads/answer/3123169'], ['Performance Max: top questions', 'https://support.google.com/google-ads/answer/14587068']],
  },
  stok: {
    baslik: 'Ürün akışı: stok, başlık, görsel',
    ilke: 'Merchant Center\'da stok bilgisi sitedeki durumla aynı olmalı; uyuşmazsa ürün onaylanmaz. Başlık ürünü açıkça tanımlamalı, varyantlar (boy, renk) ayırt edilmeli; görselde promosyon yazısı/logo olmamalı. Uyarı alan ürünler gösterilmeye devam eder ama performansı sınırlanabilir; onaylanmayanlar hiç gösterilmez. Çok satan ürünlerin akışta sorunsuz ve stokta olması reklam getirisini doğrudan etkiler.',
    kaynak: [['Availability attribute', 'https://support.google.com/merchants/answer/6324448'], ['Title attribute', 'https://support.google.com/merchants/answer/6324415'], ['Image link requirements', 'https://support.google.com/merchants/answer/6324350'], ['Issues in Merchant Center', 'https://support.google.com/merchants/answer/12153802']],
  },
  icarama: {
    baslik: 'Mağaza içi aramalar (kendi verimiz)',
    ilke: 'Bu bir Google kuralı değil, HasTürk ve Tarım Dünyası mağazalarındaki arama kutusunun kayıtlarıdır. Sonuç bulamayan arama, ya ürünün müşterinin kullandığı adla bulunamadığını ya da karşılanmayan bir talebi gösterir. Öneri yalnız tekrar eden (en az 3 kez) aramalar için üretilir.',
    kaynak: [['HasTürk mağaza arama kayıtları (panel → Arama & Trafik → Site içi aramalar)', '']],
  },
};
