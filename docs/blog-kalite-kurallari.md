# HasTürk Blog: içerik ve SEO kalite kuralları

Kullanıcı isteği (Kasım 2026): SEO kuralları en sert biçimde uygulanır. Hedef, Google'ın ve yapay zekâ arama araçlarının içeriği "yararlı, güvenilir, öne çıkarılabilir" saymasıdır. Yazılar ticari amaçlı değildir: **önce bilgi verilir, sonra ürün önerilir.** Okur ürün almadan da sorusunun cevabını eksiksiz bulur; ürün, işine yarıyorsa yanında durur. Bu, okurla bizim aramızda bir kazan-kazan ilişkisidir.

Kurallar kodda denetlenir. Bir yazı bu kapılardan geçmeden paketlenmez ve yayına girmez:

- `src/blog/seo-puan.js`: SEO puanı 100 olmalı.
- `src/blog/kalite.js`: içerik kalite kapısı.
- `scripts/blog-paket.mjs --kontrol`: ikisini ve paket kurallarını birlikte uygular.
- `scripts/blog-kopya-kontrol.mjs` ve `scripts/blog-plan-kontrol.mjs`: aynı arama niyetine ikinci yazı (yamyamlık) çıkmasını engeller.

## 1. İnsan için yararlı içerik (Google: helpful, people-first content)

- Her yazı tek bir arama niyetine eksiksiz cevap verir. Aynı niyete ikinci yazı yazılmaz. Aynı bitkinin farklı niyetleri (bakım, toprak, gübre, budama, hastalık) ayrı yazı olabilir.
- **Doğrudan cevap:** "Kısaca" kutusu sorunun cevabıyla başlar ve konuyu adıyla anar. "Bu yazıda…", "Günümüzde…" gibi girişlerle başlamaz. Giriş paragrafı en fazla 90 kelimedir. Öne çıkan sonuçlar ve yapay zekâ özetleri bu ilk cevabı alıntılar.
- **Özgün katkı:** Her yeni yazıda okura düz metinden fazlasını veren en az bir yapı bulunur: tablo, numaralı adımlar ya da bilgi görseli. Bilgi görselleri şunlardır: adım kartları, belirti → neden → ne yapılır, karışım halkası, takvim şeridi, katman kesiti.
- **Okunabilirlik:** Hiçbir paragraf 150 kelimeyi geçmez. Ortalama cümle 22 kelimeyi aşmaz. 40 kelimeden uzun cümle en fazla 3 tanedir.
- **Uzunluk ve yapı:** En az 800 kelime, 4–12 ara başlık (##), en az 3 SSS. Ara başlıklar birbirini tekrarlamaz.
- **Hız sınırı:** Günde 5–7 yazı yalnızca her yazı bu kapıdan geçtiği sürece geçerlidir. Kapıdan geçmeyen yazı o gün çıkmaz; sayıyı doldurmak için kalite düşürülmez. Google'ın "ölçekli içerik kötüye kullanımı" politikası çok yazıyı değil, değersiz seri üretimi cezalandırır.

## 2. Önce bilgi, sonra ürün (ticari olmayan dil)

- Giriş bölümüne ürün kartı konmaz. İlk kart en az bir bölüm bilgiden sonra ve metnin %20'sinden sonra gelir.
- **Kart sınırı:** Yaklaşık her 400 kelimeye bir kart düşer. 1000 kelimenin altındaki yazıda en fazla 2, daha uzun yazıda en fazla 3 kart olur. Yazı içindeki toplam ürün sayısı 6'yı geçmez. Yazı sonunda konuya uygun 4 ürün ayrıca önerilir (`src/blog/urun.js`).
- **Satış dili yasak:** "hemen satın alın", "sipariş verin", "sepete ekle", "indirim kampanyası", "ücretsiz kargo", "stoklarla sınırlı", "en uygun fiyat", "piyasanın en…", "garantili sonuç", "%100 etkili", "mucize gübre", "en iyi gübredir" gibi ifadeler kullanılmaz.
- **Fiyat yazılmaz:** Fiyat değişir; güncel fiyat mağazada görünür.
- **Marka adı:** Metinde "HasTürk" en fazla 2 kez geçer.
- **Ürün bilgisi:** Yalnızca `docs/bilgi/urunler-hasturk.json` açıklamasındaki bilgi kullanılır. Abartı ve kıyaslamalı üstünlük iddiası yoktur.
- Budama makası yalnızca budama başlıklı yazılarda önerilir (az stok).

## 3. Güven: E-E-A-T

- **Yazar:** Her yazının gerçek bir yazarı vardır. Yazar sayfasında unvan ve sosyal hesap bilgileri bulunur (Person şeması). Deneyim uydurulmaz.
- **Kaynak:** "Araştırmalara göre", "bilimsel olarak kanıtlanmış", "uzmanlara göre" gibi otorite iddiaları kaynak bağlantısı olmadan yazılmaz. Ya güvenilir bir kaynağa bağlanır ya da cümle somut bilgiye çevrilir.
- **Güvenilir dış kaynaklar:** gov.tr ve edu.tr alan adları, Tarım ve Orman Bakanlığı, TARSİM, MGM, TÜİK, Resmî Gazete, e-Devlet, FAO, AB, RHS, üniversite yayım servisleri ve Vikipedi. Başka ticari sitelere bağlantı verilmez.
- **Mevzuat konuları:** Destek, hibe, sigorta, ÇKS, sertifika, kooperatif ve sözleşmeli üretim yazıları resmî kaynağa (gov.tr) bağlanır. Tarih, tutar ve şart verilmez; okur güncel bilgi için resmî kaynağa ve il/ilçe tarım müdürlüğüne yönlendirilir.
- **Sağlık ve güvenlik:** İlaç adı ve dozu yazılmaz; okur ziraat mühendisine ve il/ilçe tarım müdürlüğüne yönlendirilir. Hayvan sağlığı konusunda veterinere yönlendirilir. "Usta" ve "uzman" sözcükleri kullanılmaz; destek için müşteri hizmetleri (+90 553 727 2929) önerilir.

## 4. Teknik SEO (her sayfada otomatik)

- **Başlık:** SEO başlığı 35–60 karakterdir ve tıklama tuzağı içermez ("şok", "inanamayacaksınız", "!!", büyük harfle bağırma).
- **Meta açıklaması:** 120–158 karakterdir. Hem meta açıklaması hem SEO başlığı bütün sitede tekildir.
- **Odak kelime:** Başlıkta, ilk paragrafta, meta açıklamasında, bir ara başlıkta ve adreste geçer. Metinde en az 3 kez geçer, yoğunluğu en fazla %3'tür. Ara başlıklara doldurulmaz.
- **İç bağlantılar:** En az 3 farklı iç bağlantı bulunur ve yayın anında açık yazılara gider. Bağlantı metni açıklayıcıdır ("buraya tıklayın", "bu yazı" kullanılmaz).
- **Görsel:** Kapak görseli telifsiz fotoğraftır, yazısız, ambalajsız ve insansızdır; hiçbir görsel iki yazıda kullanılmaz. Alt metin görseli anlatır, en fazla 125 karakterdir ve başlığın kopyası değildir. Paylaşım etiketleri (og:image ölçüsü ve açıklaması) otomatik eklenir.
- **Yapısal veri:** BlogPosting veya NewsArticle, BreadcrumbList, FAQPage, Person (yazar) ve Organization (HasTürk Gübre). Yayın ve güncelleme tarihleri hem şemada hem `article:published_time` ve `article:modified_time` etiketlerinde bulunur.
- **Taranma:** Site haritası, RSS ve llms.txt vardır. Arama motoru ve yapay zekâ tarayıcılarına (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot vb.) robots.txt'te izin verilir.
- **Kopya içerik:** Kaldırılan kopya yazılar 301 ile asıl yazıya yönlenir. Taslaklar ve yayın tarihi gelmemiş yazılar noindex olur.

## 5. Yapay zekâ aramalarında görünürlük

- Her yazının başında tek paragraflık net bir tanım ya da cevap bulunur (Kısaca kutusu).
- Sayılar, oranlar, aylar ve ölçüler tablo veya bilgi görseliyle verilir. Metin olarak kaldıkları için alıntılanabilirler.
- SSS soruları okurun kendi cümlesiyle sorulur ve "?" ile biter. Cevaplar 40–420 karakter arasıdır, kendi başına anlamlıdır ve FAQPage şemasına girer.
- Bölge farkı belirtilir (ılık kıyılar ve iç bölgeler). Genel geçer ve tarihsiz iddialardan kaçınılır.

## Denetim komutları

```
node scripts/blog-paket.mjs --kontrol        # SEO 100 + kalite kapısı + paket kuralları (hata varsa paket yazılmaz)
node scripts/blog-kopya-kontrol.mjs --plan docs/<plan>.txt
node scripts/blog-plan-kontrol.mjs docs/<plan>.txt --hedef N --gun a-b --onceki ...
node scripts/blog-urun-yerlestir.mjs [--dene]  # ürün kartlarını kurala uydurur (erken kartı taşır, fazlayı çıkarır)
```

## Mevcut yazıların durumu (Kasım 2026 denetimi, 1034 yazı)

- Ürün kartı yerleşimi düzeltildi: 467 yazıda erken kartlar bilginin arkasına taşındı, fazla kartlar çıkarıldı.
- 7 mevzuat yazısına resmî kaynak bağlantısı eklendi. 1 abartılı ifade düzeltildi.
- Engelleyici kalite hatası kalmadı.
- İyileştirme listesi: 331 eski yazıda tablo, numaralı adım ya da bilgi görseli yok. Bu kural yeni yazılarda zorunludur; eski yazılar güncellenirken eklenir. 266 eski yazının giriş paragrafı 90 kelimeden uzun (uyarı).
