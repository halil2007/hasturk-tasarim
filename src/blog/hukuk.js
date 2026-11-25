// Yasal metinler (üyelik sözleşmesi, KVKK aydınlatma metni, çerez politikası, topluluk kuralları).
// Metinler panelden düzenlenebilir; buradakiler ilk kurulumda ve eski taslakların yerine yazılır.
// {unvan} {adres} {eposta} {telefon} {kep} {mersis} {site} {magaza} {tarih} yer tutucuları panel ayarlarından doldurulur;
// değeri boş olan yer tutucunun bulunduğu satır sayfada hiç gösterilmez.

export const HUKUK_SURUM = '2026-11-18';

const KIMLIK = `**Veri sorumlusu / hizmet sağlayıcı:** {unvan}
- Adres: {adres}
- E-posta: {eposta}
- Telefon: {telefon}
- KEP adresi: {kep}
- MERSİS no: {mersis}`;

export const HUKUK = {
  sozlesme: `Bu Üyelik ve Kullanım Sözleşmesi ("Sözleşme"), {site} adresinde yayın yapan HasTürk Blog'a ("Blog") üye olan kişi ("Üye") ile Blog'u işleten {unvan} ("HasTürk") arasında, Üye'nin kayıt formundaki onay kutusunu işaretleyip "Üye Ol" düğmesine basmasıyla elektronik ortamda kurulur.

## 1. Taraflar ve iletişim
${KIMLIK}

Üye, kayıt sırasında bildirdiği ad ve e-posta adresiyle tanımlanır. Taraflar arasındaki bildirimler, Üye'nin kayıtlı e-posta adresi ve yukarıdaki iletişim kanalları üzerinden yapılır.

## 2. Sözleşmenin konusu
Bu Sözleşme; Blog'daki yazıların okunması, yorum yazılması, soru sorulması ve cevaplanması, oy verilmesi ve bülten gibi hizmetlerin kullanım koşullarını ve tarafların hak ve yükümlülüklerini düzenler. Blog'daki yazıları okumak için üyelik gerekmez; üyelik yalnızca topluluk özelliklerini kullanmak içindir. Üyelik ücretsizdir.

Ürün satışı Blog üzerinden yapılmaz. Blog'da gösterilen ürün bağlantıları {magaza} adresindeki HasTürk Mağaza'ya yönlendirir. Mağaza'dan yapılan alışverişler, Mağaza'nın kendi mesafeli satış sözleşmesi, ön bilgilendirme formu ve iade koşullarına tabidir.

## 3. Üyelik şartları
- Üye olmak için 18 yaşını doldurmuş ve fiil ehliyetine sahip olmak gerekir. 18 yaşından küçükler, Blog'u yalnızca veli veya vasilerinin izni ve gözetimiyle kullanabilir.
- Üye, kayıt formunda doğru, güncel ve kendisine ait bilgiler vermeyi kabul eder. Başkası adına veya yanıltıcı bir adla hesap açılamaz.
- Bir kişi yalnızca bir hesap açabilir. Hesap kişiye özeldir; devredilemez, satılamaz, başkasına kullandırılamaz.
- Sitede görünen ad herkese açıktır; e-posta adresi hiçbir zaman sitede gösterilmez.

## 4. Hesap güvenliği
Üye, şifresini gizli tutmakla ve başkalarıyla paylaşmamakla yükümlüdür. Hesabın yetkisiz kullanıldığını fark eden Üye bunu gecikmeden HasTürk'e bildirir. Şifreler HasTürk tarafından da okunamayacak şekilde, tek yönlü şifrelenerek saklanır. Üye'nin şifresini paylaşmasından veya korumamasından doğan zararlardan HasTürk sorumlu değildir.

## 5. Üye içerikleri
Üye'nin yazdığı yorum, soru, cevap ve benzeri içeriklerin ("Üye İçeriği") hukuki sorumluluğu Üye'ye aittir. Üye, paylaştığı içeriğin kendisine ait olduğunu veya paylaşma hakkına sahip olduğunu ve üçüncü kişilerin haklarını ihlal etmediğini kabul eder.

Üye, Üye İçeriği'ni Blog'da yayınlanması, arama motorlarında görünmesi ve Blog'un tanıtımında kullanılabilmesi amacıyla HasTürk'e süresiz, ücretsiz, münhasır olmayan ve devredilebilir bir kullanım izni verir. HasTürk, Üye İçeriği'ni anlamını değiştirmeden kısaltabilir, yazım hatalarını düzeltebilir ve kişisel bilgileri gizleyebilir.

## 6. Yasak davranışlar
Üye aşağıdaki davranışlarda bulunmayacağını kabul eder:
- Hakaret, tehdit, nefret söylemi, ayrımcılık, taciz veya müstehcen içerik paylaşmak
- Kendisinin veya başkalarının telefon, adres, kimlik numarası gibi kişisel verilerini paylaşmak
- Reklam, spam, zincir mesaj ya da başka site veya mağazaya yönlendiren bağlantılar paylaşmak
- Zirai mücadele ilaçları için doz, karışım veya uygulama tarifi vermek; ilaç kullanımında ürün etiketi ve yetkili kişilerin yerine geçecek yönlendirmeler yapmak
- Telif, marka veya diğer fikri hakları ihlal eden içerik paylaşmak
- Yanıltıcı, sahte veya gerçeğe aykırı bilgi yaymak, başka bir kişi ya da kurum gibi davranmak
- Blog'un işleyişini bozacak, güvenliğini tehlikeye atacak veya otomatik araçlarla toplu veri çekecek girişimlerde bulunmak
- Oyları veya içerik sıralamasını yapay yollarla değiştirmeye çalışmak

## 7. İçerik denetimi
HasTürk, topluluğun güvenli ve faydalı kalması için Üye İçeriklerini yayından önce veya sonra kontrol edebilir. Yeni hesapların ilk paylaşımları ile bağlantı içeren paylaşımlar yayından önce incelenir. HasTürk; bu Sözleşme'ye, Topluluk Kuralları'na veya mevzuata aykırı gördüğü içerikleri bildirimde bulunmadan yayınlamayabilir, düzenleyebilir veya kaldırabilir. Bu denetim, HasTürk'e Üye İçeriklerinin doğruluğunu taahhüt etme yükümlülüğü yüklemez.

## 8. Bilgilerin niteliği ve sorumluluğun sınırı
Blog'daki yazılar ve topluluk cevapları genel bilgilendirme amaçlıdır. Bitkilerin ihtiyacı tür, iklim, toprak ve bakım koşullarına göre değişebilir; önerilerin sonucu garanti edilmez. Topluluk üyelerinin cevapları kendi görüş ve deneyimleridir ve HasTürk'ün görüşünü yansıtmaz. Zirai mücadele ilaçları ve gübreler mutlaka ürün etiketindeki talimata uygun kullanılmalıdır.

HasTürk, Blog'un kesintisiz ve hatasız çalışması için makul özeni gösterir; ancak bakım, güncelleme, altyapı sağlayıcılarından kaynaklanan kesintiler ve mücbir sebepler nedeniyle hizmetin geçici olarak durmasından sorumlu tutulamaz. HasTürk'ün kanundan doğan sorumluluğu saklıdır.

## 9. Fikri mülkiyet
Blog'daki yazılar, fotoğraflar, tasarım, logo ve yazılım HasTürk'e veya lisans verenlerine aittir. Bu içerikler kaynak gösterilerek kısa alıntı yapılması dışında, HasTürk'ün yazılı izni olmadan kopyalanamaz, çoğaltılamaz veya ticari amaçla kullanılamaz.

## 10. Kişisel verilerin korunması
Üye'nin kişisel verileri, 6698 sayılı Kişisel Verilerin Korunması Kanunu'na uygun olarak ve [Gizlilik ve KVKK Aydınlatma Metni](/gizlilik) ile [Çerez Politikası](/cerez-politikasi)'nda açıklandığı şekilde işlenir.

## 11. Üyeliğin sona ermesi
Üye, dilediği zaman yukarıdaki iletişim kanallarından talepte bulunarak üyeliğini sona erdirebilir. HasTürk; Sözleşme'ye veya Topluluk Kuralları'na aykırılık halinde, aykırılığın ağırlığına göre Üye'yi uyarabilir, paylaşımlarını önceden kontrole alabilir, hesabını geçici olarak askıya alabilir veya kapatabilir. Üyeliğin sona ermesiyle hesap bilgileri Aydınlatma Metni'ndeki sürelere uygun olarak silinir veya anonim hale getirilir. Yayınlanmış ve başka üyelerin cevaplarıyla bütünleşmiş içerikler, kişiyi tanımlayan bilgiler çıkarılarak yerinde bırakılabilir.

## 12. Sözleşme değişiklikleri
HasTürk bu Sözleşme'yi gerektiğinde güncelleyebilir. Güncel metin bu sayfada yayınlanır ve sayfanın başındaki "Son güncelleme" tarihi değiştirilir. Üye'nin haklarını önemli ölçüde etkileyen değişiklikler ayrıca kayıtlı e-posta adresine bildirilir. Değişiklikten sonra Blog'u kullanmaya devam eden Üye güncel metni kabul etmiş sayılır; kabul etmeyen Üye üyeliğini sona erdirebilir.

## 13. Delil sözleşmesi
Taraflar, bu Sözleşme'den doğan uyuşmazlıklarda HasTürk'ün elektronik kayıtlarının ve sistem kayıtlarının 6100 sayılı Hukuk Muhakemeleri Kanunu'nun 193. maddesi uyarınca delil niteliği taşıdığını kabul eder. Üye'nin karşı delil getirme hakkı saklıdır.

## 14. Uygulanacak hukuk ve yetki
Bu Sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda, Üye'nin tüketici sayıldığı hallerde parasal sınırlar dahilinde tüketici hakem heyetleri ve tüketici mahkemeleri, diğer hallerde Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir.

## 15. Yürürlük
Bu Sözleşme 15 maddeden oluşur ve Üye'nin elektronik ortamda onay vermesiyle yürürlüğe girer. Üye, Sözleşme'yi okuduğunu, anladığını ve kabul ettiğini beyan eder. Sözleşme metnine bu sayfadan her zaman ulaşılabilir ve yazdırılabilir.`,

  kvkk: `{unvan} ("HasTürk") olarak kişisel verilerinizin güvenliğine önem veriyoruz. Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, {site} adresindeki HasTürk Blog'u ("Blog") kullanırken işlenen kişisel verileriniz hakkında sizi bilgilendirmek için hazırlanmıştır.

## 1. Veri sorumlusu
${KIMLIK}

## 2. Hangi kişisel verileri işliyoruz?
| Veri kategorisi | Veriler | Kimden |
|---|---|---|
| Kimlik | Sitede görünen ad (ad soyad veya takma ad) | Üyeler |
| İletişim | E-posta adresi | Üyeler ve bülten aboneleri |
| Müşteri işlem | Yorum, soru ve cevaplarınız, verdiğiniz oylar, paylaşımlarınızın onay durumu | Üyeler |
| İşlem güvenliği | Tek yönlü şifrelenmiş şifre, oturum bilgisi, IP adresinizden üretilen ve geri çevrilemeyen özet değer, giriş ve kayıt deneme sayıları | Üyeler ve ziyaretçiler |
| Pazarlama | Bülten aboneliği ve abonelik tarihi | Bülten aboneleri |

Blog'da ad soyad dışında kimlik numarası, telefon, adres, ödeme bilgisi veya özel nitelikli kişisel veri istenmez. Lütfen paylaşımlarınızda bu tür bilgilere yer vermeyin; fark ettiğimiz bu tür bilgiler gizlenir.

Sayfa görüntüleme ve ürün bağlantısı tıklama sayıları kişiyle ilişkilendirilmeden, yalnızca toplam sayı olarak tutulur.

## 3. Kişisel verilerinizi hangi amaçlarla işliyoruz?
- Üyelik hesabınızı oluşturmak, giriş yapmanızı sağlamak ve hesabınızı yönetmek
- Yorum, soru ve cevaplarınızı yayınlamak, topluluk kurallarına uygunluğunu kontrol etmek
- Taleplerinize, sorularınıza ve şikâyetlerinize cevap vermek
- Hizmetin güvenliğini sağlamak; sahte hesap, spam, kaba kuvvet saldırısı ve kötüye kullanımı önlemek
- Onay vermeniz halinde bülten ve yeni içerik duyurularını göndermek
- Hukuki yükümlülüklerimizi yerine getirmek ve yetkili kurumların taleplerini karşılamak
- Olası uyuşmazlıklarda haklarımızı kullanmak ve korumak

## 4. Hukuki sebepler
Kişisel verileriniz Kanun'un 5. maddesinde yer alan şu hukuki sebeplere dayanılarak işlenir:
- **Sözleşmenin kurulması ve ifası (md. 5/2-c):** üyelik hesabının açılması, yönetilmesi ve paylaşımlarınızın yayınlanması
- **Hukuki yükümlülük (md. 5/2-ç):** 5651 sayılı Kanun başta olmak üzere mevzuattan doğan yükümlülükler ve yetkili makamların talepleri
- **Bir hakkın tesisi, kullanılması veya korunması (md. 5/2-e):** olası uyuşmazlıklarda delil olarak kullanılması
- **Meşru menfaat (md. 5/2-f):** hizmet güvenliğinin sağlanması, kötüye kullanımın önlenmesi ve topluluk denetimi
- **Açık rıza (md. 5/1) ve 6563 sayılı Kanun kapsamında onay:** bülten ve duyuru e-postalarının gönderilmesi; bu onayı dilediğiniz zaman geri alabilirsiniz

## 5. Toplama yöntemi
Kişisel verileriniz; Blog'daki üyelik, giriş, yorum, soru, cevap ve bülten formları ile Blog'u kullanırken sunucularımıza iletilen teknik bilgiler ve zorunlu çerezler aracılığıyla, tamamen veya kısmen otomatik yollarla elektronik ortamda toplanır.

## 6. Kişisel verilerin aktarılması
Kişisel verileriniz satılmaz, kiralanmaz ve reklam amacıyla üçüncü kişilerle paylaşılmaz. Verileriniz yalnızca yukarıdaki amaçlar için gerekli olduğu ölçüde şu alıcılara aktarılabilir:
- **Barındırma ve altyapı hizmet sağlayıcıları:** Blog, sunucuları yurt dışında (Avrupa Birliği bölgesinde) bulunan bir bulut altyapı sağlayıcısı üzerinde çalışır ve veriler bu altyapıda saklanır. Bu aktarım Kanun'un 9. maddesinde öngörülen güvencelere uygun olarak yapılır.
- **E-posta gönderim hizmeti sağlayıcıları:** bülten ve bildirim e-postalarının iletilmesi için
- **Yetkili kamu kurum ve kuruluşları ile yargı mercileri:** hukuken yetkili oldukları talepler ve mevzuatın gerektirdiği durumlarda

## 7. Saklama süreleri
- **Üyelik bilgileri:** üyeliğiniz devam ettiği sürece; üyelik sona erdikten sonra olası uyuşmazlıklar için genel zamanaşımı süresi boyunca saklanır, ardından silinir veya anonim hale getirilir.
- **Yorum, soru ve cevaplar:** yayında kaldığı sürece; üyelik sona erdiğinde kişiyi tanımlayan bilgilerden arındırılarak saklanabilir.
- **Oturum bilgisi:** en fazla 30 gün; çıkış yaptığınızda hemen silinir.
- **Giriş ve kayıt deneme kayıtları:** yaklaşık 24 saat.
- **Bülten aboneliği:** abonelikten ayrılana kadar.

Saklama süresi dolan veriler, Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik'e uygun olarak periyodik şekilde silinir, yok edilir veya anonim hale getirilir.

## 8. Veri güvenliği
Şifreler tek yönlü şifreleme ile saklanır ve kimse tarafından okunamaz. Site trafiği şifreli bağlantı (HTTPS) üzerinden taşınır, oturum çerezi tarayıcı betiklerince okunamayacak şekilde ayarlanır ve IP adresleri ham hâliyle saklanmaz. Yönetim paneline erişim yetkili personelle sınırlıdır.

## 9. Kanun'un 11. maddesi kapsamındaki haklarınız
Veri sahibi olarak HasTürk'e başvurarak:
- Kişisel verilerinizin işlenip işlenmediğini öğrenme,
- İşlenmişse buna ilişkin bilgi talep etme,
- İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,
- Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,
- Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme,
- Kanun'un 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,
- Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,
- İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,
- Kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme

haklarına sahipsiniz.

## 10. Başvuru yöntemi
Haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e uygun olarak; kimliğinizi tespit etmemize yarayacak bilgilerle birlikte yazılı olarak veri sorumlusu bölümünde belirtilen adrese, KEP adresimize ya da Blog'a kayıtlı e-posta adresinizden aynı bölümdeki e-posta adresimize iletebilirsiniz. Başvurularınız talebin niteliğine göre en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu'nca belirlenen tarife uygulanabilir. Başvurunuzun reddedilmesi, cevabın yetersiz bulunması veya süresinde cevap verilmemesi halinde Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz.

Çerezlerle ilgili ayrıntılar için [Çerez Politikası](/cerez-politikasi) sayfasına bakabilirsiniz.`,

  cerez: `Bu Çerez Politikası, {unvan} ("HasTürk") tarafından işletilen {site} adresindeki HasTürk Blog'da hangi çerezlerin kullanıldığını ve bunları nasıl yönetebileceğinizi açıklar.

## 1. Çerez nedir?
Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Siteye tekrar girdiğinizde sizi tanımaya veya oturumunuzu açık tutmaya yarar.

## 2. Kullandığımız çerezler
Blog, yalnızca sitenin çalışması için zorunlu olan çerezi kullanır. Reklam veya sizi başka sitelerde takip eden çerez kullanılmaz.

| Çerez | Türü | Amacı | Süresi |
|---|---|---|---|
| hb_s | Zorunlu, birinci taraf | Üye girişinizi açık tutar; giriş yapmayan ziyaretçilere yerleştirilmez | En fazla 30 gün, çıkış yapınca silinir |

Bu çerez yalnızca HasTürk Blog alan adına aittir, tarayıcıdaki betikler tarafından okunamaz ve yalnızca şifreli bağlantı (HTTPS) üzerinden gönderilir. Zorunlu çerezler, Kanun'un 5/2-c ve 5/2-f maddeleri kapsamında açık rıza gerekmeden kullanılır.

İleride ziyaret istatistikleri için analiz çerezi kullanılmaya başlanırsa, bu çerezler yalnızca onayınız alınarak etkinleştirilir ve bu sayfa güncellenir.

## 3. Çerezleri nasıl yönetebilirsiniz?
Tarayıcınızın ayarlarından çerezleri görüntüleyebilir, silebilir veya engelleyebilirsiniz. Zorunlu çerezi engellemeniz halinde yazıları okumaya devam edebilirsiniz; ancak giriş yapma, yorum yazma ve soru sorma özellikleri çalışmaz.

- **Chrome:** Ayarlar › Gizlilik ve güvenlik › Çerezler ve diğer site verileri
- **Safari:** Ayarlar › Safari › Gelişmiş › Web Sitesi Verileri
- **Firefox:** Ayarlar › Gizlilik ve Güvenlik › Çerezler ve Site Verileri
- **Edge:** Ayarlar › Çerezler ve site izinleri

## 4. Haklarınız ve iletişim
Kişisel verilerinizle ilgili haklarınız ve başvuru yöntemi için [Gizlilik ve KVKK Aydınlatma Metni](/gizlilik)'ni inceleyebilirsiniz.

${KIMLIK}`,

  kurallar: `Saygılı ve nazik olun; farklı görüşlere de saygı gösterin.
Kendinizin veya başkalarının telefon, adres, kimlik numarası gibi kişisel bilgilerini paylaşmayın.
Başka site ya da mağaza bağlantısı, reklam veya tanıtım paylaşmayın.
Zirai ilaç dozu ve karışım tarifi yazmayın; ürün etiketine ve yetkili kişilere yönlendirin.
Sorunuzu ve deneyiminizi açık yazın: bitkinin türü, yaşı, saksı boyu, sulama sıklığı ve ışık durumu iyi cevap almanızı sağlar.
Başkalarına ait yazı ve fotoğrafları izinsiz paylaşmayın.
Yeni hesapların ilk paylaşımları ve bağlantı içeren paylaşımlar kısa bir kontrolden sonra yayınlanır.
Kurallara uymayan paylaşımlar kaldırılır; tekrarında hesap askıya alınabilir veya kapatılabilir.`,
};

// Yer tutucuları panel ayarlarıyla doldur; değeri olmayan satırı tamamen çıkar
export function hukukDoldur(metin, A) {
  const d = {
    unvan: A.sirket_unvan || 'HasTürk Gübre', adres: A.sirket_adres, eposta: A.iletisim_eposta, telefon: A.iletisim_tel,
    kep: A.sirket_kep, mersis: A.sirket_mersis, site: String(A.site_url || '').replace(/^https?:\/\//, ''),
    magaza: String(A.magaza_url || '').replace(/^https?:\/\//, ''), tarih: A.hukuk_tarih || '',
  };
  return String(metin || '').split('\n').filter((s) => !/\{(\w+)\}/.test(s) || [...s.matchAll(/\{(\w+)\}/g)].every((m) => !(m[1] in d) || String(d[m[1]] || '').trim()))
    .map((s) => s.replace(/\{(\w+)\}/g, (m, k) => (k in d ? String(d[k]).trim() : m))).join('\n');
}

// Sürüm 2 (Google Analytics, yalnızca onayla): metinlere uygulanan yamalar.
// Aynı yamalar canlı veritabanındaki metinlere de uygulanır; panelden değiştirilmiş ve eski cümleyi içermeyen metne dokunulmaz.
export const HUKUK_YAMA = [
  ['cerez', 'Blog, yalnızca sitenin çalışması için zorunlu olan çerezi kullanır. Reklam veya sizi başka sitelerde takip eden çerez kullanılmaz.',
    'Blog\'da iki tür çerez vardır: sitenin çalışması için zorunlu olan oturum çerezi ve varsayılan olarak çalışan, dilediğinizde reddedebileceğiniz analiz çerezleri. Reklam veya sizi başka sitelerde takip eden çerez kullanılmaz.'],
  ['cerez', '| hb_s | Zorunlu, birinci taraf | Üye girişinizi açık tutar; giriş yapmayan ziyaretçilere yerleştirilmez | En fazla 30 gün, çıkış yapınca silinir |',
    '| hb_s | Zorunlu, birinci taraf | Üye girişinizi açık tutar; giriş yapmayan ziyaretçilere yerleştirilmez | En fazla 30 gün, çıkış yapınca silinir |\n| _ga, _ga_* | Analiz, Google Analytics (varsayılan açık, reddedilebilir) | Hangi sayfaların okunduğunu ve sitenin nasıl kullanıldığını toplu olarak ölçer | 2 yıla kadar |'],
  ['cerez', 'İleride ziyaret istatistikleri için analiz çerezi kullanılmaya başlanırsa, bu çerezler yalnızca onayınız alınarak etkinleştirilir ve bu sayfa güncellenir.',
    '## Analiz çerezleri ve tercihiniz\nSiteyi geliştirmek için Google Ireland Limited / Google LLC tarafından sağlanan Google Analytics hizmetini kullanıyoruz; bu hizmet sayfa görüntüleme, cihaz ve tarayıcı türü, yaklaşık konum (ülke ve şehir) gibi bilgileri toplu istatistik olarak işler ve bu bilgiler yurt dışındaki sunucularda işlenebilir. Analiz çerezleri varsayılan olarak çalışır. İstemiyorsanız sayfanın alt bölümündeki "Çerez Tercihleri" bağlantısından reddedebilirsiniz; reddettiğinizde analiz çerezleri silinir ve ölçüm durur. Tercihiniz tarayıcınızda saklanır.'],
  ['kvkk', '| Pazarlama | Bülten aboneliği ve abonelik tarihi | Bülten aboneleri |',
    '| Pazarlama | Bülten aboneliği ve abonelik tarihi | Bülten aboneleri |\n| Kullanım bilgisi (varsayılan açık, reddedilebilir) | Ziyaret edilen sayfalar, cihaz ve tarayıcı türü, yaklaşık konum, analiz çerezi kimliği | Analiz çerezini reddetmeyen ziyaretçiler |'],
  ['kvkk', '- Onay vermeniz halinde bülten ve yeni içerik duyurularını göndermek',
    '- Onay vermeniz halinde bülten ve yeni içerik duyurularını göndermek\n- Reddetmediğiniz sürece sitenin nasıl kullanıldığını toplu istatistiklerle ölçmek ve içerikleri geliştirmek'],
  ['kvkk', '- **Açık rıza (md. 5/1) ve 6563 sayılı Kanun kapsamında onay:** bülten ve duyuru e-postalarının gönderilmesi; bu onayı dilediğiniz zaman geri alabilirsiniz',
    '- **Açık rıza (md. 5/1) ve 6563 sayılı Kanun kapsamında onay:** bülten ve duyuru e-postalarının gönderilmesi; bu onayı dilediğiniz zaman geri alabilirsiniz\n- **Meşru menfaat (md. 5/2-f):** sitenin nasıl kullanıldığını toplu istatistiklerle ölçmek için analiz çerezleri; bu çerezleri dilediğiniz zaman reddedebilirsiniz'],
  ['kvkk', '- **E-posta gönderim hizmeti sağlayıcıları:** bülten ve bildirim e-postalarının iletilmesi için',
    '- **E-posta gönderim hizmeti sağlayıcıları:** bülten ve bildirim e-postalarının iletilmesi için\n- **Analiz hizmeti sağlayıcısı (Google Analytics):** sitenin kullanımını ölçmek için; veriler yurt dışındaki sunucularda işlenebilir. Analiz çerezlerini "Çerez Tercihleri"nden reddedebilirsiniz'],
];
for (const [k, a, b] of HUKUK_YAMA) HUKUK[k] = HUKUK[k].replace(a, b);
