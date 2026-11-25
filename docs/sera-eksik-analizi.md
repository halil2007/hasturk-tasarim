# Sera tasarlama sistemi: üreticiyle eksik analizi

Tarih: 20 Kasım 2026 · Dal: `claude/sera-eksik-alan` · Kapsam: yalnız sera (Olimpos, dar Olimpos, Pergamon, Likya, Aspendos). Yalnız okuma ve analiz yapıldı; ikas'a ve üreticiye hiçbir şey yazılmadı, GitHub Actions kullanılmadı (jsdom ve `curl` ile yerelde çalışıldı).

Bu belge `docs/tasarla-profimod-karsilastirma.md` belgesini tamamlar. Orada kanıtlanan şeyler (parça, konnektör, ölçü, kod ve bilgi kutusu eşitliği, fiyat mekanizması farkı) burada yalnız bugün yeniden doğrulanarak anılır; asıl odak o belgede **kapsanmayanlardır**: arayüz davranışı, ürün katalogu, ürün ile araç arasındaki tutarlılık.

## 1. Özet: en önemli bulgular

1. **Hesap tarafı bugün de eşit.** Üreticinin bugünkü aracı (`yapi-tasarimi.html`, 1.974.122 bayt; önceki belgede 1.797.632 bayt yazılı, yani sayfa arada değişmiş) jsdom'da çalıştırıldı. 20 modülün her biri 40 rastgele tasarımda parça, konnektör, ölçü, alt yazı ve kod farkı **0**. Sera ürün kutusu (15 ürün × 13 model/uzunluk = 195 kombinasyon) satır satır aynı. Likya ve Aspendos bilgi metinleri aynı. `node scripts/tasarla-dogrula.mjs` 717 kayıt, 0 fark.
2. **Mağazadaki 11 sera ürünü, üreticinin 11 sera ürünüyle ad dışında aynı**: ölçü, taban alanı, saçak/mahya, giriş, profil adedi ve ağırlığı, paket içeriği, fiyat ve stok. Üstelik aracın ürettiği parça listesi, 11 ürünün de "Paket İçeriği" ile birebir tutuyor (profil boyları ve adetleri, menteşe, civata seti).
3. **Gerçek hata (düzeltildi): ürün sayfasındaki "Kendin tasarla" kartı yanlış ölçüde açılıyordu.** Olimpos 2,98 × 4,13 m ürününden araç 2,98 × 2,08 m açılıyordu; Pergamon 9,26 m → 2,08 m; Likya 2,94 × 8,13 → 2,23 × 3,08; Aspendos 2,48 → 3,71. Sebep: `uygulama.js > tahmin()` yalnız eski "Medium/Large/XLarge" adreslerini tanıyordu (bu adlar katalogda artık yok) ve Pergamon için config'teki sabit kod kullanılıyordu. Artık adresteki seri ve ölçüden ürünün kendi tasarımı açılıyor (bölüm 5).
4. **En büyük açık iş kararı: aynı yapı, mağazadaki iki yoldan farklı fiyatta.** Hazır ürün fiyatı ile aynı yapının Kendin Tasarla fiyatı −%9,8 ile +%8,3 arasında ayrışıyor. Likya 2,23 × 6,13 m: ürün 20.790 TL, araç 18.889 TL (müşteri aracı kullanarak 1.901 TL ucuza alabilir). Olimpos 1,58 × 2,35 m: ürün 17.620, araç 19.089 TL. Nedeni fiyat mekanizması (ikas seçenek toplamı) ve ikas'ta olmayan 39,5 / 29,5 / 199,5 cm seçenekleri. Karar bekliyor (bölüm 6).
5. **Üreticinin kendi ürün fiyatı da kendi aracıyla her yerde tutmuyor.** 11 üründen 8'inde (Aspendos 2, Likya 5, Olimpos 1,58) üreticinin aracı kur 50'de ürün fiyatına en çok 10 TL yakın; Olimpos 2,98 × 4,13 ürün fiyatı, üreticinin 6 Kasım öncesi özel kesim fiyat kuralıyla hesaplanmış gibi duruyor (37.510 hesap / 37.500 ürün; bugünkü aracı 37.020); Pergamon'da araç ürünün 1.100–1.640 TL altında ve bunun nedeni **kanıtlanamadı**.
6. **Arayüz tarafında gerçek eksikler** (hepsi büyük iş, bu dalda yapılmadı): pencere yerini seçme/sürükleme, kapı kanadını 3B'de açık gösterme (üreticide 45° açık, bizde kapalı çizim), "Ölçüyü gör", WhatsApp'ta PDF'li akış, çok dillilik ve koyu tema. Mobil için karşılaştırma gerçek cihazda yapılamadı.
7. **Üreticide olup bizde olmayan sera özelliği olarak bölge/rakım uyarısı yok**: üretici bunu yalnız arı sehpasında sunuyor (`ARR`, `ARALT`); sera aracında yok. Dolayısıyla bizde de eksik sayılmaz.

## 2. Nasıl okundu

| Ne | Nasıl | Sonuç |
|---|---|---|
| Üretici aracı | `curl https://www.profimod.com/tasarim/yapi-tasarimi.html` (4198 satır, betik sayfanın 559. satırında başlar; aşağıda "betik s.N" bu betiğin satırıdır) | jsdom'da gerçek kodla çalıştırıldı (`pmLoad`, `gInfo`, `gPrice`, `gCost`); sera panelinin DOM metni, alt sekmeler, ürün kutusu, kılavuz ve WhatsApp kodu okundu |
| Üretici ürünleri | `sitemap-profimod.xml` → 11 sera ürün sayfası + `kategori/seralar.html` + `rehber-hobi-serasi-secimi-ve-kurulumu.html`; bahcekulesi.com `store-products-sitemap.xml` (190 ürün) ve aynı 11 sera sayfası | JSON-LD (ad, fiyat, SKU), açıklama ve paket içeriği ayrıştırıldı. profimod.com ve bahcekulesi.com'da 11 sera ürününün fiyatı aynı |
| Bizim araç | `public/tasarla/*` (jsdom'da arayüz tıklanarak denendi: 5 sera kodu × 3 tur, 180 tıklama, hata 0) | |
| Bizim katalog | `public/products.json` (fiyat, stok, kategori), `docs/bilgi/urunler-hasturk.json` (açıklama) | 826 ürün; Sera İskeletleri kategorisinde 11 ürün |
| Gerçek tarayıcı | Yok (Actions faturası, yerelde Chromium da yok) | Mobil görünüm ve 3B çizim **görülmedi** |

## 3. Tasarım aracı: seçenek seçenek karşılaştırma

Durum: **AYNI** = çıktı satır satır aynı (test edildi) · **FARKLI** = aynı amaç, farklı davranış · **EKSİK** = bizde yok · **FAZLA** = bizde var, üreticide yok.

| # | Konu | Üretici (kanıt) | Bizde (kanıt) | Durum |
|---|---|---|---|---|
| 1 | Sera modelleri | Alt sekmeler Olimpos / Pergamon / Likya / Aspendos (`#subtabs [data-sr=0..3]`); dar Olimpos, "Ana profil boyu 74,5 cm" düğmesiyle | Tür kartları S, E, N (`uygulama.js:17-18`) + Model düğmeleri Olimpos / Pergamon / Dar sera (`:64`) | **AYNI** (arayüz düzeni farklı; ürün adı "Olimpos 1,58 m", araçta "Dar sera" görünüyor, bkz. bölüm 6 madde 13) |
| 2 | Ölçü sınırları | Olimpos/Pergamon 2–10 bölüm (1,025 m), dar 2–4 (0,775 m), Likya 1–4 × 1,5 / 2 m, Aspendos 2–3 × 1,2 m; genişlik sabit (betik s.100-144, `syncSN` s.1957) | `MODUL.S/E/N` (`motor.js:554,285,335`), `nSinir` (`uygulama.js:65`) | **AYNI** (300 sera + E/N tüm uzay, fark 0) |
| 3 | Aralık dışı kod | `pmLoad` `C_0`, `C_1`, çatı `2`, kapı `X`, kapı yeri `B` değerlerini kabul eder (n=0 gibi bozuk yapı kurar) | `kodAc/hesapla` en yakın geçerli değere çeker | **FARKLI** (bizde daha sağlam; üretici kusuru, uyarlanmaz). Geçerli aralıkta kod gidiş-dönüş aynı |
| 4 | Çatı tipleri | Beşik (Olimpos), kesik 4,23 m (Pergamon), 45° tünel (Likya), kesik (Aspendos) | aynı (`MODEL`, `E`, `N`) | **AYNI** |
| 5 | Kapı sayısı ve yeri | Kapı var/yok; "Sadece ön" / "Ön ve arka"; her kapı = kanat + 2 menteşe; Likya kapısız; Aspendos önde sabit (`#psel`, `#dchk`) | `ses('dr')`, `ses('pl2')` (`uygulama.js:48`); Likya/Aspendos sabit | **AYNI** (kapı başına "kanat + 2 menteşe" notu bu dalda eklendi) |
| 6 | Kapı kanadının 3B görünümü | `vis()` kanadı menteşe etrafında 45° açık çizer (betik s.101); Aspendos'ta "Kapı ve pencereyi açık göster" onay kutusu (`#asoc`) | Kapı üyeleri düzlemde kapalı (`motor.js:516`; test: S, dar S ve N'de kapı üyeleri yalnız kapı düzleminde, z = 0 ya da uzunluk); pencere açık çizilir | **FARKLI** (yalnız görsel; parça listesini etkilemez) |
| 7 | Pencere / havalandırma: sayı | Tek sayaç, en çok 4×bölüm (çatı ve yan duvar, sağ/sol) (`sWinUI` s.81) | İki sayaç (çatı, yan duvar), her biri en çok 2×bölüm → toplam yine 4×bölüm (`uygulama.js:93,203`) | **AYNI** |
| 8 | Pencere / havalandırma: yer | Pencereyi 3B'de basılı tutup başka bölmeye sürükleme (`sWinPick`, pointermove s.2013); not: "sürükleyerek taşıyın" | Yer otomatik: ortadaki bölümden, önce bir yan (`uygulama.js:203-205`); seçilemez | **EKSİK** |
| 9 | Pencere kanadı ölçüsü | Kanat çerçeveye 35 mm içeride, standarda 1 mm yakınsa standart boy (`sWinLeaf` s.73) | `kanat()` (`motor.js`) aynı kural; parça farkı 0 | **AYNI** |
| 10 | Kaplama / örtü | Araçta örtü seçimi yok; yalnız paket notu ("örtü dahil değil") | Örtü düğmesi `#tOrtu` (3B'de saydam örtüyü aç/kapa, `uygulama.js:341`) + paket notu | **FAZLA** (bizde); paket notu bu dalda ürün açıklamasıyla eşitlendi |
| 11 | Ayak / ankraj / zemin sabitleme | Araçta seçenek yok; ürün sayfası ve kılavuzda "zemine sabitleyin" | Paket notu + kılavuz "Rüzgâr alan yerlerde yapıyı zemine sabitleyin" (`kilavuz.js`) | **AYNI** (seçenek ikisinde de yok) |
| 12 | Bölge / rakım uyarısı | Yalnız arı sehpası (`ARR`, `ARALT`); sera aracında yok | Yok | **AYNI** (sera için ikisinde de yok) |
| 13 | Yetiştirilecek ürün tablosu | 15 ürün; liste `<optgroup>` ile "Yeşillikler ve yapraklı sebzeler" grubu (betik s.37-58, s.101) | 15 ürün, sayılar ve metinler aynı (195 kombinasyon fark 0); grup yoktu | **AYNI** (grup bu dalda eklendi) |
| 14 | Bilgi ve uyarı kutuları | Sera: "Ölçüler DWG verisinden…"; Likya ve Aspendos notları | `bilgi.js` (S, E, N) | **AYNI** |
| 15 | Ayar altı açıklamaları | "74,5 cm: 1,58 m genişlik, tek parça mertek, en fazla 4 bölüm, kesik çatı yok." · "Giriş, alın çerçevesinin yan bölmesine açılır; mahya kolonu zemine kadar iner." (`#spfn`, `ps` paneli) | Yoktu | **AYNI** (bu dalda eklendi) |
| 16 | Parça listesi, konnektör listesi, ölçü, alt yazı | `gInfo()` | `hesapla()` | **AYNI** (0 fark) |
| 17 | Ayrı "kesim listesi" çıktısı | Yok; parça listesi + kılavuzda numaralı "Profil numaraları" tablosu | Parça listesi + kılavuz (numaralı profil tablosu) + yazdırma düzeni (`@media print`, `#foy`) | **AYNI** (yazdırma bizde fazla) |
| 18 | Kurulum kılavuzu PDF | Kapak, paket içeriği, profil numaraları, aletler, "Civataları en son takın", adım adım görsel, kapı/pencere adımı, ölçü çizimi, notlar, telefon (`gDoc` s.2512, `gCapture` s.2420) | Aynı iskelet, adım mantığı aynı port (`kilavuz.js > adimlar`); ölçü sayfası daha zengin (önden/yandan/üstten) | **AYNI** (yapı). Metin farkları: üretici pencere adımında "35 mm boşluk" ve Aspendos'a özel metin yazar, bizde "eşit boşluk"; üretici "kapı en son adımda", bizde "son adımlarda"; kılavuz yalnız Türkçe |
| 19 | Tasarım kodu | `PM-S1-…`; "Kod ile aç" penceresi (`#kodd`) | `HG-S1-…`, `PM-…` da açılır (`kodAc`); kod kutusu "Parça listesi" sekmesinde | **AYNI** |
| 20 | Paylaşım | Adres karması `#PM-…&do=pdf\|wa\|img` | Adres karması `#HG-…~adet`, "Paylaş" düğmesi kodu bağlantı olarak kopyalar (`uygulama.js:229`) | **AYNI** (bizde düğme var) |
| 21 | Kayıt | Hesap/kayıt yok; yalnız tema, dil ve kur `localStorage`'da | Kayıt yok | **AYNI** ("tasarım kaydedilir" ifadesi üreticide yalnız kod+WhatsApp demek) |
| 22 | WhatsApp | PDF'i indirir, sonra `whatsapp://` ile uygulamayı açar, metin: ürün, ölçü, kod, bağlantı, parçalar, konnektörler, fiyat, "kılavuz telefonuma indi, ekliyorum" (`waOpen`/`gWaText` s.2758-2770) | `wa.me` metni: ürün, ölçü, adet, kod, bağlantı, parçalar, konnektörler, fiyat (`uygulama.js:222-228`); PDF eklenmez | **FARKLI**. Metin içeriği aynı; PDF akışı yok |
| 23 | Sipariş | "Kartla satın al": iframe → üst sayfaya `profimod-buy` mesajı; üstte ödeme, yoksa WhatsApp (betik s.3547) | ikas sepetine seçenekli tek ürün olarak ekler (`sepeteEkle`, `uygulama.js:156`) | **FARKLI** (bizde gerçek sepet var; üstün) |
| 24 | Fiyat | Kg ve kurla maliyet formülü; "kargo ve KDV dahil" (betik s.2285-2336) | ikas seçenek toplamı (`fiyat.js`) | **FARKLI** (bkz. bölüm 4.3 ve önceki belgede 4.3) |
| 25 | "Ölçüyü gör" | Gözlük düğmesi: ölçü çizgileri + profil renkleri (standart gri / özel kesim turuncu / konnektör / kapı), tıklanan profilin kesim boyu (betik s.1961, s.3504) | Ölçüler düğmesi yalnız ölçü çizgilerini açar (`#tOlcu`); renk ayrımı ve kesim boyu yok | **EKSİK** |
| 26 | Mobil | `html.m` sınıfı, hızlı ayar çubuğu `#qbar` + alttan açılan "Tüm ayarlar" paneli (betik s.3584) | Tek sütuna iner, 44vh görünüm, yapışkan fiyat + WhatsApp + Sepete ekle çubuğu (`arayuz.js` `@media (max-width:860px)`) | **FARKLI** (gerçek cihazda **doğrulanamadı**) |
| 27 | Çok dillilik | TR, EN, AR (sağdan sola), RU, DE, RO (`I18N`, betik s.2098; PDF dahil) | Yalnız Türkçe | **EKSİK** (mağaza Türkçe; öncelik düşük) |
| 28 | Koyu tema, tam ekran | Koyu tema (`#thm`), tam ekran (iframe için) | Tam ekran var (`#tTam`), koyu tema yok | **EKSİK** (koyu tema), tam ekran **AYNI** |
| 29 | Ölçek figürü, görünüm düğmeleri | Figür 175 cm, "Görünümü sıfırla" | Figür var; 3B/Önden/Yandan/Üstten, Sıfırla, tam ekran | **AYNI** (görünüm seçimi bizde fazla) |
| 30 | Ürün sayfasından araca geçiş | `kt.js`: kategoriden `?tek=sera`; hazır modeller için "Ölçün yok mu? Kendin Tasarla" kartı | `tsKart` ürün sayfasına kart ekler (`widget/pm-search.js:5826`), `config.json > tasarla.eslesme` | **FARKLI**; ölçü eşleşmesi hatalıydı, düzeltildi (bölüm 5) |
| 31 | Kendin Tasarla açılış/SSS sayfası | `kendin-tasarla.html`: açıklama, hangi yapılar, fiyat nasıl hesaplanır, gönderim; FAQPage JSON-LD | Araç sayfası `noindex`; `/kendi-serani-tasarla` doğrudan araca yönlenir; SSS yok | **EKSİK** (içerik/SEO) |

## 4. Mağaza ürünleri ile üretici kataloğu

### 4.1 Katalog eşleşmesi

Üreticinin (profimod.com, bahcekulesi.com) sera ürünü sayısı 11, bizim "Sera İskeletleri" kategorimizde 11. Eksik ürün ya da eksik ölçü **yok**. Kullanıcının andığı "Medium / Large / XLarge" adları katalogda artık geçmiyor (eski adlar; yalnız eski kodda `tahmin()` içinde kalmıştı).

| Üretici ürünü (profimod.com) | Ölçü, taban alanı | Üretici fiyatı | Bizde fiyat | Stok | SKU (üretici) | Araç kodu | Parça listesi = ürün paketi |
|---|---|---|---|---|---|---|---|
| Olimpos Sera 1,58 × 2,35 m | 3,7 m² | 17.620 | 17.620 | var | PM-SR-OL-02 | `HG-S1-F_3_S_F_0_0_0_w` | evet |
| Olimpos Sera 2,98 × 4,13 m | 12,3 m² | 37.500 | 37.500 | var | PM-SR-OL-01 | `HG-S1-C_4_S_F_0_0_0_w` | evet |
| Pergamon Sera 4,23 × 6,18 m | 26,1 m² | 60.950 | 60.950 | var | PM-SR-PG-01 | `HG-S1-C_6_S_F_1_0_0_w` | evet |
| Pergamon Sera 4,23 × 9,26 m | 39,1 m² | 82.640 | 82.640 | var | PM-SR-PG-02 | `HG-S1-C_9_S_F_1_0_0_w` | evet |
| Aspendos Sera 2,06 × 2,48 m | 5,1 m² | 16.730 | 16.730 | var | PM-SR-AS-01 | `HG-N1-2` | evet |
| Aspendos Sera 2,06 × 3,71 m | 7,6 m² | 20.010 | 20.010 | var | PM-SR-AS-02 | `HG-N1-3` | evet |
| Likya Sera 2,23 × 3,08 m | 6,9 m² | 12.710 | 12.710 | var | PM-SR-LK-01 | `HG-E1-0_2` | evet |
| Likya Sera 2,23 × 4,61 m | 10,3 m² | 15.990 | 15.990 | var | PM-SR-LK-02 | `HG-E1-0_3` | evet |
| Likya Sera 2,23 × 6,13 m | 13,7 m² | 20.790 | 20.790 | var | PM-SR-LK-03 | `HG-E1-0_4` | evet |
| Likya Sera 2,94 × 6,11 m | 17,9 m² | 20.140 | 20.140 | var | PM-SR-LK-04 | `HG-E1-1_3` | evet |
| Likya Sera 2,94 × 8,13 m | 23,9 m² | 26.370 | 26.370 | var | PM-SR-LK-05 | `HG-E1-1_4` | evet |

Kontrol: `node scripts/sera-urun-karsilastir.mjs` (üretici sayfalarını indirir) ve `node scripts/tasarla-dogrula.mjs` (ürün açıklamasındaki paket içeriği ↔ araç, çevrimdışı).

### 4.2 Ad, açıklama ve spec farkı

- **Ad.** Üretici: "Profimod® Olimpos Sera 2,98 × 4,13 m – Hobi Bahçe Serası İskeleti" (bahcekulesi.com'da "Bahçe Kulesi®"). Bizde: "Galvaniz Modüler Sera İskeleti Olimpos 2,98 × 4,13 m (12,3 m²) – Hobi bahçe serası". Marka yok, m² başlıkta, "Galvaniz Modüler" önde. Fark kasıtlı (kendi SEO başlığımız) görünüyor; düzeltme önerilmez.
- **Spec satırları (ölçü, taban alanı, saçak, mahya, giriş, profil adedi, kg, paket içeriği, "Neler yapabilirsiniz", örtü seçenekleri)**: 11 ürünün 11'inde aynı.
- **Üreticide olup bizim açıklamamızda olmayanlar**: "Pakete dahil / dahil olmayanlar" kutusu (kilit, tel ve file, raf-masa yüzeyleri), "Kurulum" bölümü, "serideki diğer ölçüler" listesi, "Kargo ve ödeme" (aynı gün DHL, ücretsiz kargo, 12 taksit), garanti ("5 yıl, 15 gün iade"), kurulum videosu, "Seranızın içini donatın" öneri ürünleri, seri rehberi ve 4 soruluk SSS, JSON-LD (Product, FAQPage, BreadcrumbList). Bizim açıklamamızda 2 soruluk SSS ve bir danışma notu var (üreticinin sayfalarında 4 soru profimod.com'da, 8 soru bahcekulesi.com'da). Kargo, garanti ve iade bilgisinin ikas sayfasında ayrıca olup olmadığı **doğrulanamadı**.
- **Üreticinin kendi içindeki tutarsızlık.** Seri rehberi "Pergamon: ön ve arka kapı ile çatı pencereleri standarttır" diyor; aynı seranın ürün sayfası "Giriş: Menteşeli kapı", paket 2 menteşe, rehber tablosu "Menteşeli kapı". Bu iddia kopyalanmamalı.
- **Seri ve ürün adı.** Üretici 1,58 m'lik ürüne "Olimpos" diyor (aracında "Olimpos, ana profil 74,5 cm"); bizim araçta aynı yapı "Dar sera" adıyla görünüyor.

### 4.3 Fiyat: ürün, bizim araç ve üreticinin aracı

"Araç" = bizim Kendin Tasarla fiyatı (ikas seçenek toplamı, `secenek.json` 2026-11-20). "Üretici aracı" = üreticinin kendi aracı, kur 50 (bölüm 2.4 önceki belgede; `profimod.com/_functions/kur` bugün de 404, TCMB yanıtında CORS yok).

| Ürün | Ürün fiyatı | Bizim araç | Araç − ürün | Üretici aracı (kur 50) | Üretici aracı − ürün |
|---|---|---|---|---|---|
| Olimpos 1,58 × 2,35 | 17.620 | 19.089 | +1.469 (+%8,3) | 17.630 | +10 |
| Olimpos 2,98 × 4,13 | 37.500 | 39.069 | +1.569 (+%4,2) | 37.020 | −480 |
| Pergamon 4,23 × 6,18 | 60.950 | 62.434 | +1.484 (+%2,4) | 59.310 | −1.640 |
| Pergamon 4,23 × 9,26 | 82.640 | 85.774 | +3.134 (+%3,8) | 81.540 | −1.100 |
| Aspendos 2,06 × 2,48 | 16.730 | 17.054 | +324 (+%1,9) | 16.730 | 0 |
| Aspendos 2,06 × 3,71 | 20.010 | 20.449 | +439 (+%2,2) | 20.010 | 0 |
| Likya 2,23 × 3,08 | 12.710 | 11.469 | −1.241 (−%9,8) | 12.710 | 0 |
| Likya 2,23 × 4,61 | 15.990 | 14.589 | −1.401 (−%8,8) | 15.990 | 0 |
| Likya 2,23 × 6,13 | 20.790 | 18.889 | −1.901 (−%9,1) | 20.790 | 0 |
| Likya 2,94 × 6,11 | 20.140 | 20.369 | +229 (+%1,1) | 20.140 | 0 |
| Likya 2,94 × 8,13 | 26.370 | 26.959 | +589 (+%2,2) | 26.370 | 0 |

Okuma:

- Üreticinin **ürün fiyatı, kendi aracının fiyatından türetilmiş** (Aspendos ve Likya'da kuruşu kuruşuna, kur 50). Bizim ürün fiyatlarımız üreticininkiyle aynı, ama **bizim aracımız farklı mekanizma** kullanıyor; bu yüzden aynı yapı iki yoldan farklı fiyatta (müşteri açısından tutarsızlık, Likya 2,23 serisinde araç yoluyla ucuz).
- Olimpos 2,98 × 4,13: ürün fiyatı, özel kesim 41,8 cm profilin fiyat boyunun 59,5 cm sayıldığı eski kuralla hesapla uyuşuyor (hesap 37.510, ürün 37.500); üretici 6 Kasım sonrası kuralı 39,5 cm yaptığı için bugünkü aracı 37.020 veriyor. Yani üretici kendi ürün fiyatını yeni kurala göre güncellememiş görünüyor (çıkarım; üreticiden teyit edilmedi).
- Pergamon: araç 1 kapı ve pencere yok için 59.310 veriyor; ürün 60.950. 6,18 m için 1 kapı + 1 çatı penceresi tasarımı 60.960 verir (ürünle 10 TL fark), ama 9,26 m için aynı eşleşme denenmedi ve paket listesinde pencere kanadı yok. Nedeni **belirsiz**.
- Bizim aracın sapmasının sebepleri önceki belgede (4.3): ikas'ta 29,5 / 39,5 / 199,5 cm seçeneği yok (Olimpos 2,98 ve Pergamon'daki 41,8 cm profiller 59,5 fiyatıyla; Likya 2,94'teki 199,5 cm 2 × 99,5 ile fiyatlanıyor), civata ve menteşe fiyata girmiyor.

### 4.4 Sera ile ilgili diğer ürünler

| Ürün | Üretici | Bizde | Fark |
|---|---|---|---|
| Sera Tezgahı 110×70×80 | 3.610 | 3.610 | yok |
| Uzun Sera Tezgahı 210×70×80 | 7.190 | 7.190 | yok |
| Sera Orta Tezgahı 210×110×80 | 7.590 | 7.590 | yok |
| Küçük Sera Rafı 88×46×111 | 6.980 (bahcekulesi.com'da başlık "Sera Rafı – Küçük Sera ve Balkon Rafı") | 6.980 | yok (ad farklı) |
| Sera Fide Rafı 131×46×111 | 8.710 | 8.710 | yok |
| Saksı ve Şaşırtma Tezgâhı 128×66×88 | 5.830 | 5.830 | yok |
| Sera + U yatak seti 3,8 m² | bahcekulesi.com: **20.000** (üstü çizili 21.700, "%8 indirim"); profimod.com'da yok | **21.700** | üreticide kampanyalı fiyat; bizde liste fiyatı |

Set açıklamamızda ayrıca tutarsızlıklar var: sera "3,8 m² (160x235 cm)" deniyor, aynı yapının ürün sayfası "1,58 × 2,35 m (3,7 m²)"; "Sera tek başına satılıyor mu?" cevabı artık var olmayan "Galvaniz Modüler Sera ve Kümes İskeleti 3,8 m² (160x235 cm)" adını anıyor. İkas'a yazma gerektirdiği için dokunulmadı (bölüm 6).

## 5. Bu dalda yapılanlar

| Değişiklik | Dosya | Test |
|---|---|---|
| Sera ürün adresinden ürünün kendi tasarımını bulan `urunTasarimi(slug)` (seri + dış ölçü → tasarım uzayında eşleşen ilk tasarım); `ac()` bunu kullanıyor, eski `tahmin()` içindeki geçersiz Likya satırı kaldırıldı | `public/tasarla/motor.js`, `uygulama.js` | 11 ürün adresi → 11 doğru kod; eski kodla denenen 6 adresin 6'sı yanlış ölçüde açılıyordu (jsdom, kart açılışı). `widget/pm-search.js` değişmedi (zaten adresi gönderiyordu), `build-widget` gerekmedi |
| Ürün ↔ araç denetimi: ürün açıklamasındaki "Paket İçeriği" ile aracın parça listesi (profil boyları ve adetleri, menteşe, civata) ve başlıktaki ölçü karşılaştırılıyor; 11 kayıt | `scripts/tasarla-dogrula.mjs` | `node scripts/tasarla-dogrula.mjs` → 717 kayıt, 0 fark (bir paket satırı bozulunca 1 fark verdi) |
| Üretici sera ürünlerini indirip bizim katalogla, açıklamayla ve araçla karşılaştıran betik | `scripts/sera-urun-karsilastir.mjs` (yeni) | bugün: 11/11 fiyat, stok, paket aynı |
| "Yetiştirilecek ürün" listesi üreticideki gibi "Yeşillikler ve yapraklı sebzeler" grubuyla; liste adı tek kaynaktan (`CR`), "Hıyar (Salatalık)" yazımı üreticiyle aynı | `bilgi.js`, `uygulama.js` | jsdom: 15 seçenek, 1 grup (6 öğe); 195 ürün kutusu kombinasyonu fark 0 |
| Sera ayar altı açıklamaları: kapıda "Her kapı için kapı kanadı ve 2 menteşe gelir.", kapı yerinde "Giriş, alın çerçevesinin yan bölmesine açılır; mahya kolonu zemine kadar iner.", dar seraya "74,5 cm profil, 1,58 m genişlik, tek parça mertek, en fazla 4 bölüm, kesik çatı yok." | `uygulama.js`, `arayuz.js` (stil) | jsdom: üç sera modelinde notlar görünüyor, 180 tıklama hatasız |
| Paket notları ürün açıklamasıyla eşitlendi (S, E, N): "örtü bağlantı klipsleri" ve "zemine sabitleme malzemesi" eklendi, örtü listesi "gölge filesi, branda" ile tamamlandı. Kaynak: `docs/bilgi/urunler-hasturk.json` sera açıklamaları | `paket.js` (araçta "Bilmeniz gerekenler" ve kılavuzun paket cümlesi) | |

## 6. Eksikler, önerilen iş, büyüklük, öncelik

Büyüklük: S ≤ yarım gün, M 1–3 gün, L > 3 gün. Öncelik: 1 en yüksek.

| # | Eksik | Önerilen iş | Büyüklük | Öncelik |
|---|---|---|---|---|
| 1 | Aynı yapı, ürün ve araç yolunda farklı fiyat (−%9,8 … +%8,3; Likya 2,23 serisinde araç ucuz) | Karar: referans hangisi? Seçenek A: ikas'ta 29,5 / 39,5 / 199,5 cm profil seçenekleri tanımlanır ve fiyatlar üretici formülüne yaklaştırılır; B: ürün fiyatları araç fiyatına çekilir; C: araç, hazır ölçülerde ürün fiyatını kullanır. İkas'a yazma gerektirir, **yapılmadı** | M (ikas verisi) | 1 |
| 2 | Pergamon ve Olimpos 2,98'de üreticinin ürün fiyatı kendi aracıyla tutmuyor | Üreticiden fiyat kuralının hangisi olduğunu öğren; kendi referansımızı seçerken bunu hesaba kat | S (yazışma) | 2 |
| 3 | Pencere yerini seçememe (üreticide sürükleme) | Önce ucuz yol: "Pencere yeri" listesi (bölüm, sağ/sol, çatı/duvar); motor `swn` kodunu zaten alıyor, yalnız arayüz. Sonra isteğe bağlı 3B'de sürükleme (`sWinPick` benzeri üçgen seçim yüzeyi + pointer olayları) | S (liste) · M (sürükleme) | 2 |
| 4 | Kapı kanadı 3B'de kapalı çiziliyor; Aspendos'ta "kapı ve pencereyi açık göster" yok | Yalnız 3B sahnede kanat üyelerini menteşe etrafında 45° döndür (üreticideki `vis()`), kılavuz geometrisine dokunma; Aspendos için onay kutusu | M | 3 |
| 5 | "Ölçüyü gör": profil renkleri (özel kesim turuncu, konnektör, kapı) ve tıklanan profilin kesim boyu | `gor[].k` zaten `g/o/d` ayrımı taşıyor; malzeme rengi + renk açıklaması + ışın seçimiyle boy etiketi | M | 3 |
| 6 | WhatsApp'ta PDF'li akış yok | "Sipariş" düğmesi önce kılavuzu indirsin, mesaja "kılavuz telefonuma indi, ekliyorum" cümlesi eklensin (`gWaText` benzeri). Mobilde `wa.me` çalışıyor, uygulama açma akışı gerekmez | S | 3 |
| 7 | Kendin Tasarla açılış/SSS sayfası yok | Sera için kısa açıklama + SSS (üreticinin sayfa yapısı örnek alınarak, kendi cümlelerimizle); `docs/blog-kalite-kurallari.md` kurallarına uyulmalı | M | 3 |
| 8 | Ürün sayfası açıklamasında kargo, teslimat, garanti, seri rehberi, "serideki diğer ölçüler" yok (üreticide var) | İkas açıklamasına eklenecek metin hazırlanabilir; ikas'a yazma gerektirir, **yapılmadı**. Kargo ve garanti bilgisinin ikas'ta ayrıca olup olmadığı önce doğrulanmalı | S (metin) | 3 |
| 9 | Set ürünü: fiyat 21.700 (üreticide 20.000 kampanya), "3,8 m²" ile "3,7 m²" ve eski ürün adı | Fiyat kararı + açıklama düzeltmesi (ikas) | S | 3 |
| 10 | Kılavuz metinleri üreticiden hafif farklı (pencerede 35 mm boşluk, Aspendos'a özel pencere metni, "kapı en son adımda") | `kilavuz.js` pencere adımına Aspendos ve 35 mm metni; geometri zaten aynı | S | 4 |
| 11 | Mobilde hızlı ayar çubuğu ve alttan açılan panel (üreticide var) | Önce gerçek cihazda bizim akışı ölç (Playwright çalışabildiğinde `scripts/tasarla-canli.mjs`); eksik görülürse hızlı ayar çubuğu | M | 3 |
| 12 | Çok dillilik (TR, EN, AR, RU, DE, RO) ve koyu tema | Mağaza Türkçe; **önerilmez**. İhracat düşünülürse ayrı proje | L | 4 |
| 13 | Ürün "Olimpos 1,58 m" iken araçta "Dar sera" | Model düğmesine ve `R.ad`'a "Olimpos (dar)" gibi bir ad; kullanıcı onayı gerekir | S | 4 |
| 14 | Üretici sayfası her gün değişebiliyor (bugün 176 KB büyüdü) | `tasarla-uretici-karsilastir.mjs` ve `sera-urun-karsilastir.mjs` haftalık çalıştırılmalı. Actions faturası çözülünce workflow'a bağlanabilir; şimdilik elle | S | 3 |

## 7. Kullanıcı kararı bekleyenler

1. **Fiyat referansı (madde 1).** Ürün mü, araç mı, üretici formülü mü? Likya 2,23 serisinde müşteri aracı kullanarak aynı yapıyı 1.241–1.901 TL ucuza alabiliyor; Olimpos 1,58 ve Pergamon'da tersi.
2. **Set ürünü (madde 9).** 21.700 mi 20.000 mi? Açıklama düzeltmesi yapılsın mı?
3. **Ürün açıklamasına kargo/garanti/seri rehberi eklensin mi (madde 8)?** İkas'a yazma izni gerekir.
4. **Pencere yeri ve kapı kanadı görünümü (madde 3, 4)** yapılsın mı, hangi sırayla?
5. **Model adı (madde 13).**
6. **Müşteri hizmetleri numarası.** Araçta `+90 553 727 2929` yazıyor (`uygulama.js:222`, `kilavuz.js`); önceki belgede anılan değişiklik hâlâ `main`'de yok. Üreticinin WhatsApp numarası `+90 553 109 60 24` (kendi sitesi, bizi ilgilendirmez).

## 8. Belirsizlikler

- **Gerçek tarayıcı görülmedi**: 3B çizim, mobil düzen, kılavuz PDF'inin görsel kalitesi. Tüm sonuçlar kod okuma ve jsdom'dan.
- **Üretici ürün fiyatının nedeni** (Olimpos 2,98 ve Pergamon) çıkarım ve kısmen belirsiz (bölüm 4.3).
- **İkas fiyatının KDV ve kargo içerip içermediği** hâlâ doğrulanmadı; üreticinin ekranı "kargo ve KDV dahil" diyor, bizim araç bunu yazmıyor. Bu yüzden araç metnine "kargo ve KDV dahil" **yazılmadı**.
- **Üreticinin sitesi sürekli değişiyor.** Bu belgedeki satır numaraları 20.11.2026 16:00 sürümüne göredir.
- **Aralık dışı kod davranışı** (madde 3 tablo 3.) yalnız `pmLoad` çağrılarıyla gözlendi; üreticinin arayüzünden bu koda ulaşılabildiği kanıtlanmadı.

## 9. Yeniden üretme

```
npm i --no-save jsdom
node scripts/tasarla-dogrula.mjs                       # araç ↔ kayıtlı üretici çıktıları + mağaza sera ürünleri paket içeriği (717 kayıt)
node scripts/tasarla-uretici-karsilastir.mjs 40 50 S   # canlı üretici aracı ↔ bizim motor (sera, 40 örnek, kur 50)
node scripts/sera-urun-karsilastir.mjs                 # profimod.com sera ürünleri ↔ mağaza ↔ araç fiyatı
```
