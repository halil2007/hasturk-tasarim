# Kendin Tasarla: üretici aracı (Profimod) ile karşılaştırma

Tarih: 20 Kasım 2026 · Dal: `claude/tasarla-karsilastir` · Durum: karşılaştırma tamam, yapı türleri ve bilgi kutuları eşitlendi, fiyat farkları kullanıcı kararına bırakıldı.

Bu belge iki aracı karşılaştırır:

- **Üretici (Profimod)**: `https://www.profimod.com/kendin-tasarla.html` sayfası, içinde `https://www.profimod.com/tasarim/yapi-tasarimi.html` aracını (`?site=pm&tek=…`) bir iframe'de açar.
- **Bizim araç (HasTürk)**: `public/tasarla/` (`motor.js`, `uygulama.js`, `bilgi.js`, `fiyat.js`, `kilavuz.js`, `secenek.json`), `config.json > tasarla`.

## 1. Nasıl okundu (kanıt ve sınırlar)

| Ne | Nasıl | Sonuç |
|---|---|---|
| Üretici sayfası | `curl https://www.profimod.com/kendin-tasarla.html` (proxy engeli yok) | 6,7 KB; `kt.js` (14 kategori → `?tek=` eşlemesi) ve `app.js` modülleri okundu. Araç `iframe#ktFrame` içinde `/tasarim/yapi-tasarimi.html` adresinden yüklenir. |
| Üretici aracı | `curl https://www.profimod.com/tasarim/yapi-tasarimi.html` | Tek dosya, 1.797.632 bayt: 3639 satırlık betik, 21 sekme, parça/konnektör/fiyat/kılavuz kodu hepsi içinde. three.js r128 (cdnjs), bizdeki `three.min.js` ile bayt bayt aynı. |
| Aracın gerçekten çalıştırılması | Sayfa Node'da jsdom içinde çalıştırıldı (3B çizim sahte WebGL ile taklit; `pmLoad(kod)`, `gInfo()`, `gPrice()`, `gCost()` gerçek üretici koduyla) | Yüzlerce tasarım için parça listesi, konnektör listesi, ölçü, kod ve fiyat üreticinin kendi hesabından alındı. |
| Bizim araç | Aynı tasarım kodu `motor.js` / `fiyat.js` ile çalıştırıldı; arayüz (`uygulama.js`) jsdom'da 20 yapı türünün hepsinde tıklanarak denendi | Çıktılar üreticininkiyle satır satır karşılaştırıldı. |
| Gerçek tarayıcıda (Playwright) doğrulama | GitHub Actions'ta denendi (`scripts/tasarla-uretici-canli.mjs` + `.github/workflows/tasarla-uretici.yml`) | **Yapılamadı**: iş 2 saniyede "recent account payments have failed or your spending limit needs to be increased" notuyla başlamadan düştü (annotation: `The job was not started because recent account payments have failed…`). Betik hazır; fatura sorunu çözülünce dal üzerinde otomatik çalışır. |

Bu yüzden iki şey **gerçek tarayıcıda görülmedi** (belirsizlikler bölümüne bakın): üreticinin ekranda gösterdiği kur ve iframe içindeki gerçek fiyat metni. Her ikisi için kaynak koddan ve ağ yanıtlarından çıkarım yapıldı, kanıtlarıyla yazıldı.

## 2. Üretici aracının envanteri

### 2.1 Sayfa (kendin-tasarla.html)

- 14 ürün grubu için `?k=<kategori>` → `?tek=<tür>` eşlemesi (`kt.js`): seralar→sera, kümesler→kumes, odunluklar→odunluk, raflar→raf, masa ve tezgâh iskeletleri→masa, klima ve kompresör kafesleri→klima, kovan sehpası→kovan, kurutma tezgâhları→kurutma, evcil hayvan balkon kafesi→kedi, salma kuş kafesleri→kuskafesi, araç gölgelikleri→golgelik, konteyner iskeletleri→konteyner, çöp konteyneri muhafazaları→cop, hayvan kulübeleri→kopek.
- "Kartla satın al" aracın içinde iframe → üst sayfaya `profimod-buy` mesajı gönderir; sayfa bunu **WhatsApp'a** çevirir (`https://wa.me/905531096024`, metin: ürün adı, ölçü, tasarım kodu, fiyat). "Kartla ödeme henüz yok" (sayfa içi yorum).
- SSS ve JSON-LD (FAQPage): hangi yapılar, fiyat nasıl hesaplanır, gönderim/kurulum.

### 2.2 Araç başlığı ve genel özellikler (`yapi-tasarimi.html`)

| Özellik | Kanıt |
|---|---|
| 21 sekme: S Sera, K Kümes (alt sekmeler: Üretim / Hobi / Hareketli), C Konteyner, Q Salma kuş kafesi, R Raf sistemi, A Arı kovanı sehpası, W Odunluk, F Kedi balkon kafesi, Z Yatak destek (gizli), X Köpek evleri, D Masa, Y Kurutma tezgâhı, G Bahçe kemeri, O Araç gölgeliği, L Klima/kompresör kafesi, U Çöp konteyneri muhafazası, P Güneş paneli sehpası, E Likya (gizli), N Aspendos (gizli), J Hareketli kümes (gizli), V Sebze yatağı (profimod.com içinde gizli) | `#tabs button[data-m]` (gövde HTML); `hidden` öznitelikleri; satır 3490: `tb.hidden = fr \|\| own` (V sekmesi çerçevede ve profimod.com'da gizlenir) |
| Mantar rafı (M) kodu var ama sekmesi yok | `PMV.M`, `#pmz` bölümü var, `data-m="M"` düğmesi yok |
| Dil: TR, EN, AR, RU, DE, RO (`#lang`, `I18N`) | satır 2098 |
| Koyu/açık tema, tam ekran düğmesi | `#thm`, `#fsb` |
| "Kod ile aç" ve tasarım kodu `PM-<harf>1-<değerler>` | `pmCode`, `pmLoad`; `PMV` tablosu (her modülün kod alanları) |
| "Ürün dosyalarını indir (görseller, SEO PDF, Wix CSV)" | `#grnd` yönetici işlevi |
| "Ölçüyü gör": tıklanan profilin/konnektörün kesim boyu (yalnız masaüstü) | satır ~3500 `pick()` |
| Kapı ve pencere kanatlarını 3B'de sürükleyerek taşıma (konteyner kapısı, köpek evi kapısı, sera çatı penceresi) | satır 1980–2008 |
| Ölçek figürü (175 cm insan) | `fig` |
| Her tasarımda: parça listesi, konnektör listesi, **fiyat (kargo ve KDV dahil)**, "WhatsApp'tan sipariş ver", "Kurulum kılavuzu oluştur" (PDF: kapak, adım adım çizimler, ölçüler, uyarılar) | `#gside`, `gInfo`, `gRender` |

### 2.3 Modüller, ayarlar ve sınırlar (üretici)

Sınırlar arayüzde `+/−` düğmelerinin son durumundan (jsdom'da tıklanarak) ve `pmCheck`/`pmSet` kodundan alındı.

| Modül | Ayarlar ve sınırlar | Bilgi çıktıları |
|---|---|---|
| **S Sera** | Model: Olimpos (beşik, 99,5 cm profil, 2,98 m), Pergamon (kesik çatı, 4,23 m), Dar sera (74,5 cm, 1,58 m, tek parça mertek, en çok 4 bölüm). Uzunluk 2–10 bölüm (1,02 m; dar 0,78 m). Kapı var/yok, sadece ön / ön ve arka. Çatı ve yan duvar penceresi (en çok 2×bölüm, sürükle). 15 ürün (domates … karpuz) | Ekim alanı (iç zeminin %70'i), bitki sayısı, m² verim, yıllık ürün, süre, kaynaklı not |
| **K Kümes** | Üretim: hayvan (tavuk/kaz/ördek), 1–10 bölüm, kapı, kapı yeri, pencere (4,23 m sabit). Hobi: konaklama 1–3 bölüm (küçük/orta/büyük), gezinti = 3×, genişlik 2,06 m sabit, hayvan. Hareketli: J | Kapasite, günlük/haftalık/aylık/yıllık yumurta, yıllık et |
| **C Konteyner** | Profil yoğunluğu az/orta/çok (99,5/74,5/59,5 cm; kesit 2/3/4 bölüm), uzunluk 2–9 / 2–12 / 2–16 bölüm, tek veya iki kapı (çift kanatlı; ön, arka veya yan duvara sürüklenir), duvar+çatı kaplaması (4), zemin kaplaması (3) | Kapatılacak alan, kaplama miktarı |
| **Q Kuş kafesi** | Genişlik 1–5, uzunluk 1–5 bölüm (1,025 m), yükseklik 2 m/3 m, kuş türü (16) | Tür başına kuş kapasitesi (Logan Şehir Konseyi tablosu) |
| **R Raf** | Tek raf (1–5 bölüm) ya da odada otomatik yerleşim (oda 200–1200 × 200–1200 cm, tavan 200–350 cm, kapı duvarı ve konumu); profil/kat 29,5–99,5; kat sayısı otomatik veya seçilen | Tabla ihtiyacı (levha sayısı), yük uyarısı |
| **A Arı sehpası** | Kovan yeri 2/4/6, kat 1–2, sehpa 1–12, **bölge (7)** ve **rakım (4)** | Bölge/rakım/sezona göre bal verimi, çiçeklenme takvimi, kurulum rehberi, mevzuat notları |
| **W Odunluk** | Uzunluk 2–6 bölüm, derinlik 3, yükseklik 3, kapı var/yok, çatı beşik/düz, çatı örtüsü (branda/sunta/sac), odun türü (10) | Ster, ağırlık, çatı örtüsü miktarı, rehber |
| **F Kedi kafesi** | Genişlik 1–5, derinlik 1–3, yükseklik 3 seçenek, tünek rafı 0–4 | Kedi kapasitesi, güvenlik uyarısı |
| **X Köpek evi** | Gezinme alanı 0–8 bölüm, L yan kol ±6, kapı yüzeyi | Alan, uyarılar |
| **D/Y** | Uzunluk 60–1000, genişlik 40–150, yükseklik 50–100 cm (10'ar), alt raf / kapak görünümü | Tabla, tel, kapasite, rehber, yük uyarısı |
| **G, O, L, U, P, E, N, J, Z, V, M** | ilgili ayarlar (kemer 1–3 bölüm düz/kesik; gölgelik hatchback/sedan/SUV 3–4 bölüm; 13 cihaz; 6 konteyner; panel 3 tip × 1–4 sehpa; Likya 149,5/199,5 × 1–4; Aspendos 2–3; hareketli kümes 1–3; yatak destek 4 tip × 3 en × 3–9 boy × renk; yatak ekranı; mantar rafı) | ilgili kutular |

### 2.4 Fiyat hesabı (üretici)

Kaynak: `main.js` satır 2284–2335 (`FIYAT`, `gCost`, `gPrice`). Fiyat **seçenek tablosundan değil, maliyet formülünden** çıkar ve ekranda **"kargo ve KDV dahil" TL** olarak yazılır.

- Profil: kg başına 50 TL × 1,085 kg/m × (1 + %5 fire). Konnektör 40 TL, civata seti 2 TL, işçilik 0,10 USD/profil parçası, ambalaj 150 TL + aksesuar 200 TL (sipariş başına), kelebek menteşe bedeli aksesuarın içinde.
- Kargo: her başlayan 15 kg için 5 USD. Hedef net kâr satışın %30'u; formül KDV (%20), POS komisyonu (%4) ve kurumlar vergisini (%25) hesaba katıp kâr oranını geriye çözer. Müşteri fiyatı 10 TL katına **yukarı** yuvarlanır. KDV dahil satış 100 USD altındaysa "küçük sipariş": net kâr %25, ambalaj 100 + aksesuar 100 TL.
- **Kur**: `KUR_URL = ['https://www.profimod.com/_functions/kur', 'https://www.tcmb.gov.tr/kurlar/today.xml']`. Önce yerel önbellek (`pm-kur`), yoksa yedek **50**. Doğrulanan: `profimod.com/_functions/kur` **404** (`MODULE_NOT_FOUND`, Wix işlevi yok), `tcmb.gov.tr/kurlar/today.xml` yanıtında **CORS başlığı yok**. Yani tarayıcıdan okunamaz; üretici ekranındaki fiyat büyük olasılıkla **50 TL/USD** yedek kuruyla hesaplanır (TCMB satış kuru 19.11.2026: 50,4694; fark %1'in altı).
- Yatak destek ünitesinde altlık (30 USD) ve 6 tekerlekli set (30 USD) ayrıca fiyatlanır; sebze yatağının fiyatı ayrı yatak hesabından gelir.

## 3. Bizim aracın envanteri

### 3.1 Önce (main, bu işten önce)

14 yapı türü: S (Olimpos, Pergamon, dar sera), E, N, G, Z (iki tip), J, A, X, D, Y, O, P, L, U. 3B sahne, ölçü çizgileri, ekranda boyutlandırma tutamaçları, 3B görünüm seçimi, tam ekran, tasarım kodu (`HG-…`, `PM-…` kabul), parça ve konnektör listesi, fiyat dökümü, adet, sepete ekleme (ikas `addToCart`), WhatsApp'tan sipariş, paylaş, sıfırla, kurulum kılavuzu PDF'i, paket notları.
Eksik olanlar: Kümes (K), Konteyner (C), Salma kuş kafesi (Q), Raf (R), Odunluk (W), Kedi balkon kafesi (F), Mantar (M), Sebze yatağı ekranı (V); bölge/rakım (A) ve ürün (S) seçimleri vardı ama **sonuç göstermiyordu**; hiçbir modülde kapasite/verim/uyarı kutusu yoktu.

### 3.2 Şimdi (bu dal)

20 yapı türü; K, C, Q, R, W, F eklendi; A ve S sonuç kutuları, J yumurta tablosu, her modülün uyarı ve rehber metinleri eklendi (bölüm 5).

### 3.3 Fiyat mekanizması (bizde)

`public/tasarla/fiyat.js` + `secenek.json` (kaynak: ikas ürün sayfasının seçenek seti, `scripts/tasarla-veri.mjs`, son güncelleme 2026-11-20): **taban 249 TL** + her profil boyu için adet × birim + her konnektör için adet × birim. Civata, menteşe, öneri satırları ve aksesuar fiyata girmez.

| Profil | 59,5 | 74,5 | 99,5 | 119,5 | 149,5 | 29,5 · 39,5 · 199,5 |
|---|---|---|---|---|---|---|
| TL / adet | 175 | 185 | 210 | 230 | 260 | **seçenek yok** |

Konnektör (TL / adet): PC001 125 · PC002 125 · PC003 135 · PC004 145 · PC005 140 · PC006 150 · PC008/009 (-1,-2) 160 · PC010/011/012 (-1,-2) 170. Seçeneği tanımlı olmayan boy, bir üst tanımlı boyun fiyatıyla (199,5 için 2 × 99,5) fiyatlanır; gerçek boy ve adet "Tasarım Kodu" alanında siparişe yazılır (`fiyat.js`, `gecici`).

## 4. Fark tablosu

### 4.1 Özellik farkları

Durum: **Eşit** = üretici çıktısıyla satır satır aynı (test edildi) · **Eklendi** = bu dalda eklendi ve test edildi · **Açık** = bizde yok (neden ve karar bölüm 6'da).

| Özellik / ayar | Üretici (kanıt) | Bizde önce | Bizde şimdi | Durum |
|---|---|---|---|---|
| Sera, Likya, Aspendos, kemer, masa, kurutma, arı sehpası, köpek evi, araç gölgeliği, klima, çöp, güneş paneli, hareketli kümes: parça, konnektör, ölçü, alt yazı, tasarım kodu | `gInfo()` çıktısı | var | var | **Eşit** (sera 300 + masa/kurutma 152'şer + arı 182 + köpek evi 93 (tüm uzay) + diğerleri; fark 0) |
| Sera: özel kesim "41,8 cm" fiyat boyu | `ns()` = `pmFB(len,149.5)` → 39,5 | 59,5 (`CF.smb` sabiti) | 39,5 | **Düzeltildi** (üretici bu kuralı 6 Kasım sonrası değiştirmiş; doğrulama kayıtlarındaki 20 sera kaydı yenilendi) |
| Kümes (üretim ve hobi) | K sekmesi, `buildH`, `kuEnter` | yok | var | **Eklendi** (parça/konnektör/ölçü/kod: 120 tasarımda fark 0) |
| Konteyner (C) | `buildC`, `cqDoors` | yok | var (kapı yeri seçimi) | **Eklendi** (90 tasarım, fark 0) |
| Salma kuş kafesi (Q) | `buildQ` | yok | var | **Eklendi** (200 tasarım, fark 0) |
| Raf sistemi (R): tek raf ve odada yerleşim | `buildRack`, `rackLayout` | yok | var (oda boyutu, kapı duvarı/konumu) | **Eklendi** (160 tasarım, fark 0) |
| Odunluk (W) | `buildW` | yok | var | **Eklendi** (200 tasarım, fark 0) |
| Kedi balkon kafesi (F) | `buildF` | yok | var | **Eklendi** (225 tasarım, fark 0) |
| Arı sehpası: bölge ve rakıma göre bal verimi, çiçeklenme takvimi, kurulum rehberi, mevzuat | `ARR`, `ARALT`, `buildA` | seçim vardı, sonuç yoktu | var | **Eklendi** (14 tasarımda metin satır satır aynı) |
| Sera: yetiştirilecek ürün tablosu (15 ürün) | `CR`, `cropBox` | seçim vardı, sonuç yoktu | var | **Eklendi** (13 tasarım, aynı) |
| Kümes/hareketli kümes yumurta ve et tablosu | `kuEnter`, `hxe1..5` | J'de yalnız kapasite satırı | var | **Eklendi** |
| Kuş türüne göre kapasite, odun ster/ağırlık, kedi kapasitesi, kaplama miktarı, tabla ihtiyacı | `qres`, `odres`, `kfres`, `cqres`, `rfres` | yok | var | **Eklendi** |
| Modül uyarı ve rehber kutuları (sabitleme, yük, hava akışı, kurutma rehberi, odunluk rehberi …) | `.eggs` kutuları | yok | var (kurulum kılavuzu PDF'ine de eklendi) | **Eklendi** (245 tasarımda 0 fark) |
| Eski 4 değerli yatak destek kodu ve üreticinin 5 değerli kodu (`PM-Z1-4_7_b_0_0`) | `PMV.Z` 5 alan (`zdW` tekerlek) | yalnız 4 değer | ikisi de açılır | **Düzeltildi** |
| Yatak destek: **Gölgelikli, Sehpalı** tip, **tekerlek seti**, yatak fiyatı | `zdT` 0–4, `zdW`, `FIYAT.altlikUSD/tekerlekSetUSD` | 2 tip | 2 tip | **Açık** (ikas'ta altlık/tekerlek seçeneği ve yatak fiyatı yok) |
| Sebze yatağı ekranı (V: düz/L/U/T/serbest, çoklu yatak, bahçe krokisi, bitki yerleşimi) | `#pv`, `vGeo`; **profimod.com'da sekmesi gizli**, Bahçe Kulesi modunda (`?site=bk`) açık | motorda var (`vGeo`…), ekran yok | yok | **Açık** (üretici kendi sitesinde sunmuyor; bahcekulesi.com'a özgü) |
| Mantar rafı (M) | kod ve panel var, **sekme yok** | yok | yok | **Açık** (üretici arayüzünde ulaşılamıyor) |
| Dil seçimi (TR, EN, AR, RU, DE, RO) ve koyu tema | `#lang`, `#thm` | yok | yok | **Açık** (HasTürk Türkçe mağaza; karar) |
| "Ölçüyü gör" (tıklanan profilin kesim boyu) | satır ~3500 | yok | yok (parça listesi aynı boyları veriyor) | **Açık** |
| Kapı/pencere kanadını 3B'de sürükleyerek taşıma | satır 1980–2008 | pencere ve kapı yeri `+/−` ve seçimle | aynı (konteyner/yan duvar kapısı için seçim kutusu) | **Açık** (davranış eşdeğer, etkileşim farklı) |
| Kategoriye özel tek modül modu (`?tek=`) | `kt.js` | `?grup=sera`, `config.json > tasarla.kategori` | aynı | **Açık** (yeni türlerin kategori kartları kullanıcı kararı) |
| Ödeme: kart | iframe → WhatsApp | ikas sepeti + WhatsApp | aynı | Farklı ama amaç aynı (bizde sepet var) |
| Yönetici işlevleri (`pmMaliyet()`, ürün dosyası indirme, SEO PDF/Wix CSV) | konsol/`#grnd` | yok | yok | Aktarılmadı (müşteri işlevi değil) |

Ölçü sınırları: D/Y 60–1000 × 40–150 × 50–100 cm, X gezinme 0–8 / yan kol ±6, O 3–4, Z uzunluk 3–9, Likya 1–4, Aspendos 2–3, hareketli kümes 1–3: üreticiyle **aynı** (kod `pmLoad` aralık denetimi ve arayüz sınırları karşılaştırıldı; üretici aralık dışı kodu reddeder, bizim araç en yakın geçerli değere çeker).

### 4.2 Hesap (parça ve konnektör) denkliği

`scripts/tasarla-uretici-karsilastir.mjs` (20 modül × 60 tasarım: parça, konnektör, ölçü, alt yazı ve kod farkı 0) ve geçici ızgara koşuları (üretici aracı jsdom'da, kur 50). Her satır: aynı tasarım kodu iki tarafta açıldı; parça listesi, konnektör listesi, ölçü, alt yazı ve kod karşılaştırıldı.

| Modül | Tasarım | Fark |
|---|---|---|
| D masa · Y kurutma | 152 + 152 (rastgele, uç değerler dahil) | 0 |
| A arı sehpası | 182 | 0 |
| X köpek evi | 93 (tüm xk × xm kombinasyonları) | 0 |
| S sera (Olimpos/Pergamon/dar, kapı, pencere) | 300 | 0 (düzeltmeden önce 60'ta 17 fark vardı: 41,8 cm fiyat boyu) |
| Z yatak destek | 84 (tüm 2 tip × 3 en × 7 boy × 2 renk) | 0 |
| G, O, L, U, P, E, N, J | 6 + 6 + 13 + 12 + 12 + 8 + 2 + 9 (tüm uzay) | 0 |
| Q, F, W, C, K, R (yeni) | 200 + 225 + 200 + 90 + 120 + 160 | 0 |
| Doğrulama kayıtları (`veri/tasarla/kahin-*.json`) | 706 kayıt (524 parça listesi, 40 yatak, 142 bilgi kutusu) | 0 |

Üreticinin 6 Kasım'daki kayıtlarına göre yazılmış 416 doğrulama kaydından **20'si** (hepsi sera, 41,8 cm boyu) üreticinin bugünkü aracıyla uyuşmuyordu; kayıtlar bugünkü araçtan yenilendi. Diğer 396 kayıt bugünkü araçla aynı çıktı.

### 4.3 Fiyat farkları

**Mekanizma farkı** (bölüm 2.4 ve 3.3): üretici maliyet formülüyle (kg, konnektör, civata, işçilik, kargo, kâr, KDV, POS, 10 TL yuvarlama) hesaplar; biz ikas seçenek fiyatlarıyla (taban + profil boyu + konnektör). İki yöntem doğrusal değil, aynı tasarımın toplamı bu yüzden tasarım biçimine göre değişir. Kalem kalem örnek (masa `PM-D1-200_80_75_1`, 31 profil, 16 konnektör, 22 kg, kur 50):

| Üretici (USD, kur 50) | | Bizde (TL) | |
|---|---|---|---|
| Profil (fiyat boylarına göre ağırlık × 50 TL/kg, %5 fire) | 21,98 | Taban (hazırlık/paketleme) | 249 |
| Konnektör (16 × 40 TL) | 12,80 | 99,5 cm × 4 | 840 |
| Civata seti (112 adet × 2 TL) | 4,48 | 74,5 cm × 7 | 1.295 |
| Ambalaj + aksesuar (350 TL) | 7,00 | 59,5 cm × 20 (29,5 cm × 6 dahil: seçenek yok, 59,5 fiyatı) | 3.500 |
| İşçilik (31 × 0,10) | 3,10 | PC003 × 4 | 540 |
| Maliyet | 49,36 | PC004 × 2 · PC005 × 4 · PC006 × 6 | 290 · 560 · 900 |
| Kâr dahil, KDV hariç | 113,90 | Toplam | **8.174** |
| KDV dahil + kargo (10 USD) = satış | 146,68 USD | | |
| × 50, 10 TL'ye yukarı | **7.340 TL** | | |

**Örnek tasarım toplamları** (üretici = kendi formülü; "Üretici 50,47" = TCMB 19.11 satış kuruyla aynı tasarım):

| Tasarım | Kod (üretici kodu) | Ölçü | Profil / konnektör | Üretici (kur 50) | Üretici (kur 50,4694) | Bizde | Fark (TL) | Fark |
|---|---|---|---|---|---|---|---|---|
| Sera Olimpos, 2 bölüm | `PM-S1-C_2_S_F_0_0_0_w` | 2,98 × 2,08 m | 91 / 55 | 25.100 | 25.150 | 26.664 | +1.564 | +6.2% |
| Sera Olimpos, 4 bölüm | `PM-S1-C_4_S_F_0_0_0_w` | 2,98 × 4,13 m | 134 / 79 | 37.020 | 37.090 | 39.069 | +2.049 | +5.5% |
| Sera Pergamon, 6 bölüm | `PM-S1-C_6_S_F_1_0_0_w` | 4,23 × 6,18 m | 212 / 128 | 59.310 | 59.420 | 62.434 | +3.124 | +5.3% |
| Masa | `PM-D1-200_80_75_1` | 2,00 × 0,80 × 0,75 m | 31 / 16 | 7.340 | 7.350 | 8.174 | +834 | +11.4% |
| Masa (4 m) | `PM-D1-400_80_75_1` | 4,00 × 0,80 × 0,75 m | 55 / 28 | 12.050 | 12.080 | 14.274 | +2.224 | +18.5% |
| Kurutma tezgâhı | `PM-Y1-200_100_80_1` | 2,00 × 1,00 × 0,80 m | 27 / 18 | 7.830 | 7.840 | 7.889 | +59 | +0.8% |
| Arı kovanı sehpası | `PM-A1-4_1_2_1_0` | 2 sehpa · 8 kovan | 46 / 20 | 8.980 | 8.990 | 11.219 | +2.239 | +24.9% |
| Bahçe kemeri | `PM-G1-0_1` | 1,58 × 0,81 × 2,34 m | 25 / 18 | 7.310 | 7.320 | 7.284 | -26 | -0.4% |
| Araç gölgeliği | `PM-O1-1_1_4` | 3,76 × 6,13 × 2,64 m | 57 / 34 | 22.000 | 22.040 | 20.069 | -1.931 | -8.8% |
| Klima kafesi | `PM-L1-1` | 1,05 × 0,66 × 0,81 m | 16 / 12 | 5.560 | 5.570 | 4.939 | -621 | -11.2% |
| Çöp muhafazası | `PM-U1-1_0` | 0,81 × 1,05 × 1,25 m | 19 / 16 | 6.870 | 6.880 | 6.274 | -596 | -8.7% |
| Güneş paneli sehpası | `PM-P1-1_1` | 1,05 × 1,38 × 1,23 m | 18 / 12 | 5.650 | 5.660 | 5.769 | +119 | +2.1% |
| Likya sera | `PM-E1-0_3` | 2,23 × 4,61 m | 43 / 24 | 15.990 | 16.020 | 14.589 | -1.401 | -8.8% |
| Aspendos sera | `PM-N1-3` | 2,06 × 3,71 m | 68 / 42 | 20.010 | 20.050 | 20.449 | +439 | +2.2% |
| Hareketli kümes | `PM-J1-1_0` | 2,06 × 1,05 m | 42 / 26 | 11.440 | 11.460 | 12.059 | +619 | +5.4% |
| Köpek evi | `PM-X1-2_0_0` | 1,05 × 3,10 m | 53 / 32 | 14.700 | 14.730 | 15.589 | +889 | +6.0% |
| Yatak destek ünitesi | `PM-Z1-4_7_b_0_0` | 1,12 × 1,90 m | 11 / 6 | 7.240 | 7.240 | 3.514 | -3.726 | -51.5% |
| Salma kuş kafesi | `PM-Q1-1_2_0_0` | 1,05 × 2,08 × 2,08 m | 37 / 24 | 12.010 | 12.030 | 11.339 | -671 | -5.6% |
| Kedi balkon kafesi | `PM-F1-3_2_1_2` | 1,91 × 1,28 × 1,91 m | 92 / 52 | 19.800 | 19.840 | 23.789 | +3.989 | +20.1% |
| Odunluk | `PM-W1-3_1_1_0_2_0_0` | 2,35 × 1,08 × 2,10 m | 71 / 38 | 16.940 | 16.970 | 18.854 | +1.914 | +11.3% |
| Konteyner | `PM-C1-0_4_0_0_0_dF0` | 2,08 × 4,13 × 2,08 m | 90 / 53 | 26.470 | 26.520 | 26.634 | +164 | +0.6% |
| Kümes (üretim) | `PM-K1-U_0_2_t_0_0_0_0_1_1_0_0_F_w` | 4,23 × 2,08 m | 100 / 62 | 28.630 | 28.680 | 29.754 | +1.124 | +3.9% |
| Kümes (hobi) | `PM-K1-H_0_2_t_0_0_0_1_3_1_2_0_F_w` | 2,06 × 4,13 m | 93 / 63 | 25.310 | 25.360 | 27.589 | +2.279 | +9.0% |
| Raf | `PM-R1-1_1_1_0_0_3000_3000_3000_top_650_0_3` | Raf 2,35 × 0,81 × 1,80 m | 50 / 24 | 11.370 | 11.390 | 12.939 | +1.569 | +13.8% |

Bu tablo **tek tasarım başına** sonuçtur; modül başına dağılım (60 rastgele tasarım, kur 50, bizde/üreticide oranı) aşağıdadır:

| Modül | Örnek | Parça/konnektör/ölçü/kod farkı | Bizde/üreticide: en düşük | ortanca | en yüksek |
|---|---|---|---|---|---|
| Masa | 60 | 0 | −20% | +12% | +52% |
| Kurutma tezgâhı | 60 | 0 | −15% | +6% | +29% |
| Arı kovanı sehpası | 60 | 0 | +9% | +24% | +47% |
| Bahçe kemeri | 60 | 0 | −1% | +5% | +8% |
| Araç gölgeliği | 60 | 0 | −10% | −9% | −9% |
| Klima kafesi | 60 | 0 | −14% | −12% | −4% |
| Çöp muhafazası | 60 | 0 | −17% | −11% | −7% |
| Güneş paneli sehpası | 60 | 0 | −3% | −1% | +2% |
| Likya sera | 60 | 0 | −11% | −9% | +2% |
| Hareketli kümes | 60 | 0 | +5% | +5% | +6% |
| Aspendos sera | 60 | 0 | +2% | +2% | +2% |
| Köpek evi | 60 | 0 | +1% | +3% | +7% |
| Sera | 60 | 0 | +3% | +6% | +10% |
| Yatak destek ünitesi | 60 | 0 | −55% | −48% | −39% |
| Salma kuş kafesi | 60 | 0 | −6% | +1% | +4% |
| Kedi balkon kafesi | 60 | 0 | +5% | +19% | +22% |
| Odunluk | 60 | 0 | +9% | +16% | +25% |
| Konteyner | 60 | 0 | 0% | +14% | +25% |
| Kümes | 60 | 0 | +2% | +5% | +9% |
| Raf | 60 | 0 | −1% | +32% | +79% |

Fiyat farkının nedenleri (kanıtla, tahmin değil):

1. **İki ayrı fiyat kuralı.** Üretici fiyatı kg ve USD kuruyla, biz sabit adet fiyatıyla hesaplıyoruz; küçük/ağır tasarımlarda sapma yön değiştirir (örn. arı sehpası 59,5 cm'lik çok sayıda kısa profil: bizde %+24, araç gölgeliği 149,5 cm'lik uzun profil: bizde %−9).
2. **Üretici kısa boylar için ayrı fiyat çıkarır, ikas'ta 29,5 ve 39,5 cm profil seçeneği yok.** Bu boylar bizde 59,5 cm fiyatıyla fiyatlanır (`fiyat.js` geçici kuralı); raf (R) gibi çok sayıda kısa parçalı tasarımlarda sapmanın bir nedeni budur (örnek: raf tasarımlarında bizde üreticinin 1,3 katı ortanca, 1,8 katına kadar). 199,5 cm (Likya) 2 × 99,5 ile fiyatlanır.
3. **Bizde civata, menteşe, öneri satırları (zemin kazığı, yağmur oluğu …) ve aksesuar fiyata girmez**, üreticide girer; ambalaj+aksesuar 350 TL sabiti bizde 249 TL taban fiyatına karşılık gelir.
4. **Yatak destek ünitesinde** üretici sebze yatağını da fiyata katar (örnekte 4.000 TL yatak + 3.240 TL ünite = 7.240 TL); bizde yatak fiyata dahil değil ("Sebze yatağı bu fiyata dahil değildir" notu) → toplam yaklaşık yarısı.
5. **Kargo ve KDV**: üretici ekranı "kargo ve KDV dahil" yazar; bizim araç "kargo/KDV dahil" demiyor. ikas ürün fiyatının KDV ve kargo içerip içermediği bu çalışmada **doğrulanmadı**.
6. **Kur etkisi**: üretici fiyatı TL/USD kuruna bağlı; 50 → 50,47 (%0,9) tasarımın fiyatını yaklaşık %0,2–0,9 oynatır (tabloda iki sütun).

> Bu fark ikas'taki ürün/seçenek fiyatları ile üretici formülü arasındadır; ikas'a hiçbir yazma yapılmadı ve fiyat düzeltmesi **önerilmiyor**, yalnız raporlanıyor (görev yönergesi).

## 5. Bu dalda yapılanlar

| Değişiklik | Dosya | Test |
|---|---|---|
| Sera özel kesim fiyat boyu üreticiyle aynı (`c.smb`/`c.bill` sabitleri yerine `fiyatBoyu(len)`) | `public/tasarla/motor.js` | ızgara 300 sera, fark 0; doğrulama 706 kayıt |
| 6 yeni yapı türü: Kümes (üretim+hobi), Konteyner, Salma kuş kafesi, Raf (tek raf+oda), Odunluk, Kedi balkon kafesi | `motor.js` (`MODUL.K/C/Q/R/W/F`), `uygulama.js` (denetimler, simge, grup, tutamaç, kapı yeri ve oda ayarları), `paket.js` (paket notları) | her biri üreticiyle 90–225 tasarımda parça/konnektör/ölçü/kod fark 0; arayüz jsdom'da 20 türün hepsinde tıklandı, hata yok; 8000 rastgele tasarımda hata 0, kod gidiş-dönüş tutuyor |
| Bilgi kutuları: sera ürün tablosu, arı bölge/rakım verimi ve rehber, kümes/hareketli kümes yumurta-et tablosu, kuş/kedi/odun kapasitesi, kaplama ve tabla hesabı, tüm modüllerin uyarı ve rehber metinleri | yeni `public/tasarla/bilgi.js`, `uygulama.js`, `arayuz.js` (stil) | 245 tasarımda üretici metniyle satır satır aynı; `veri/tasarla/kahin-bilgi.json` (142 kayıt) |
| Kurulum kılavuzu PDF'ine modül uyarıları | `uygulama.js`, `kilavuz.js` | arayüzde |
| Yatak destek kodu 5 değerli (üretici ile aynı), eski 4 değerli kodlar açılıyor | `motor.js` (`zdW`, `eskiKod`) | doğrulama 706 kayıt |
| Doğrulama: 20 sera kaydı yenilendi, 108 yeni modül kaydı ve 142 bilgi kaydı eklendi | `veri/tasarla/kahin-profil.json`, `kahin-bilgi.json`, `scripts/tasarla-dogrula.mjs` | `node scripts/tasarla-dogrula.mjs` → 706 kayıt tuttu, 0 fark |
| Karşılaştırma aracı (jsdom, canlı üretici sayfasını indirir) | `scripts/tasarla-uretici-karsilastir.mjs` | çalıştırıldı; kurulum `npm i --no-save jsdom` |
| Gerçek tarayıcıda (Playwright) üretici okuma | `scripts/tasarla-uretici-canli.mjs`, `.github/workflows/tasarla-uretici.yml` | **çalışmadı: Actions faturalandırma engeli** (bölüm 1) |

`widget/pm-search.js` **değişmedi**, bu yüzden `build-widget` gerekmedi: araç Worker'dan `tasarla/uygulama.js` olarak yüklendiği için yeni türler `#tasarla=K` (ya da herhangi bir tür harfi / `HG-…` kodu) bağlantılarıyla açılır.

## 6. Kullanıcı kararı bekleyenler

1. **Fiyat farkı.** ikas seçenek fiyatları ile üretici formülü arasında bölüm 4.3'teki sapmalar var (modül ortancası −%48 … +%32; tek tasarımda −%20 … +%79; yatak destekte yatak fiyatı yok). Hangisi referans olacak? ikas'a yazılmadı, düzeltme önerilmiyor.
2. **Yeni türlerin sitede açılması.** `config.json > tasarla.kategori` yalnız 8 kategoriyi eşliyor (Sera İskeletleri, Bahçe Kemerleri, Masa, Kurutma, Arı Sehpaları, Gölgelikler, Klima, Çöp). Mağazada Raf (12 ürün), Kümes (9), Konteyner ve Depo (9), Odunluk (8), Evcil Hayvan Balkon Kafesi (5), Salma Kuş Kafesi (4) ve Köpek Kulübeleri (4) kategorileri var. Bunlara "Kendin tasarla" kartı eklemek tek satırlık config değişikliği; **yapılmadı**: ikas'ta 29,5 / 39,5 / 199,5 cm profil seçeneği yok (kısa boylar 59,5 cm fiyatıyla fiyatlanıyor) ve fiyat farkı (1. madde) açık.
3. **ikas seçenek seti.** 29,5 ve 39,5 cm profil seçenekleri tanımlansın mı (üretici bu boyları kullanıyor: masa, raf, güneş paneli, arı sehpası, sera)? Tanımlanana kadar `fiyat.js` bir üst boyla fiyatlar.
4. **Yatak destek (Z) ve sebze yatağı (V).** Gölgelikli/sehpalı tip, tekerlek seti ve yatak fiyatı için ikas'ta karşılık gerekir; V ekranı üreticide yalnız Bahçe Kulesi modunda var. Port istenirse ayrı iş.
5. **Dil/tema, "Ölçüyü gör", sürükleyerek kapı-pencere taşıma**: bu farkların kapatılması isteniyor mu?
6. **Müşteri hizmetleri numarası.** `uygulama.js` ve `kilavuz.js` içinde `+90 553 727 2929` yazıyor; 17 Kasım'daki numara değişikliği (`de1f3179`, `+90 553 942 2961`) yalnız `claude/son-proje-hakkinda-m3mx2j` dalında, `main`'e girmemiş. Hangisi geçerli? Bu dalda dokunulmadı.
7. **GitHub Actions faturalandırması.** Gerçek tarayıcı denemeleri (bu dal ve genel olarak) çalışmıyor.

## 7. Belirsizlikler (emin olunamayanlar)

- **Üretici ekranındaki kur**: kaynak ve ağ kanıtı 50 TL/USD yedek değerini gösteriyor (bölüm 2.4); gerçek tarayıcıda görülmedi (Actions engelli). Fiyat tabloları 50 ve 50,4694 ile verildi.
- **Üretici fiyatı kategori sayfasındaki iframe içinde de aynı mı?** Kod aynı sayfa; `site=pm` yalnız WhatsApp numarası ve başlıkları değiştiriyor (`SITE`), fiyat formülünü değil.
- **ikas fiyatının KDV/kargo durumu** doğrulanmadı.
- **Kurulum kılavuzu** (PDF) iki tarafta var ve benzer yapıda (kapak, adım çizimleri, ölçü, notlar); sayfa sayfa içerik karşılaştırılmadı, yalnız uyarı metinleri eşitlendi.
- **3B görünüm** (dekor: kuşlar, ağaç, bahçe, hayvanlar, araç) karşılaştırılmadı; yeni türlerde yalnız iskelet, kapı kanadı ve insan figürü çizilir (hesap etkilenmez).
- Üretici aracı önümüzdeki günlerde değişebilir (6 Kasım'dan bugüne sera boy fiyatı değişti). Karşılaştırma aracı bunu yakalamak için yazıldı.

## 8. Yeniden üretme

```
npm i --no-save jsdom
node scripts/tasarla-dogrula.mjs                                   # bizim motor ↔ kayıtlı üretici çıktıları (706 kayıt)
node scripts/tasarla-uretici-karsilastir.mjs 60 50                 # canlı üretici aracı ↔ bizim motor + fiyat oranı (60 örnek, kur 50)
node scripts/tasarla-uretici-karsilastir.mjs 40 50.4694 DYASZ      # belirli modüller, TCMB kuru
```

Kaynak dosyaları: üretici `…/tasarim/yapi-tasarimi.html` (satır numaraları bu belgede 20.11.2026 sürümüne göredir), `…/assets/kt.js`, `…/assets/app.js`. Bizde: `public/tasarla/`, `scripts/tasarla-*.mjs`, `veri/tasarla/`.
