# profimod.com ürünlerinden HasTürk Gübre için ürün içeriği üretir.
# Ad, kategori, görsel ve fiyat kaynakla aynı; açıklama ve meta özgün yazılır, sayısal bilgiler kaynaktan alınır.
# Kullanım: python3 scripts/profimod-icerik.py [hasturk]
import json, re, sys, html as H
from collections import OrderedDict

SITE = sys.argv[1] if len(sys.argv) > 1 else 'hasturk'
KAYNAK = 'veri/profimod/kaynak.json'
CIKTI = f'veri/profimod/cikti/{SITE}.json'
UST = 'Galvaniz Modüler Yapılar'
TEL = '+90 553 727 2929'

# HasTürk'te zaten olan ürünler (28 Ekim'de bahcekulesi.com kaynağıyla Excel'den yüklendi)
MEVCUT = {'P0001', 'P0002', 'P0003', 'P0004', 'P0005', 'P0006', 'P0007'}

# Profimod mağaza kategorisi → mağazada görünen ad (gruplama profimod.com menüsüyle aynı, adlar daha açıklayıcı)
KATEGORI = {
    'Konteyner İskeletleri': 'Konteyner ve Depo İskeletleri',
    'Salma Kuş Kafesleri': 'Salma Kuş Kafesleri',
    'araç gölgelikleri': 'Araç Garaj Gölgelikleri',
    'Raflar': 'Galvaniz Raf İskeletleri',
    'Masa ve Tezgah İskeletleri': 'Çalışma Masası ve Sera Tezgahları',
    'Kovan Sehpası': 'Arı Kovanı Sehpaları',
    'Kurutma Tezgâhları': 'Sebze ve Meyve Kurutma Tezgahları',
    'Odunluklar': 'Galvaniz Odunluklar',
    'Klima ve Kompresör Kafesleri': 'Klima ve Kompresör Koruma Kafesleri',
    'Evcil Hayvan Balkon Kafesi': 'Evcil Hayvan Balkon Kafesi',
    'Çöp Konteyneri Muhafazaları': 'Çöp Konteyneri ve Kova Muhafazaları',
    'Konnektörler': 'Profil Bağlantı Konnektörleri',
    'Galvaniz Kutu Profiller': 'Galvaniz Kutu Profiller',
}
KAT_SLUG = {
    'Konteyner ve Depo İskeletleri': 'konteyner-ve-depo-iskeletleri',
    'Salma Kuş Kafesleri': 'salma-kus-kafesleri',
    'Araç Garaj Gölgelikleri': 'arac-garaj-golgelikleri',
    'Galvaniz Raf İskeletleri': 'galvaniz-raf-iskeletleri',
    'Çalışma Masası ve Sera Tezgahları': 'calisma-masasi-ve-sera-tezgahlari',
    'Arı Kovanı Sehpaları': 'ari-kovani-sehpalari',
    'Sebze ve Meyve Kurutma Tezgahları': 'sebze-ve-meyve-kurutma-tezgahlari',
    'Galvaniz Odunluklar': 'galvaniz-odunluklar',
    'Klima ve Kompresör Koruma Kafesleri': 'klima-ve-kompresor-koruma-kafesleri',
    'Evcil Hayvan Balkon Kafesi': 'evcil-hayvan-balkon-kafesi',
    'Çöp Konteyneri ve Kova Muhafazaları': 'cop-konteyneri-ve-kova-muhafazalari',
    'Profil Bağlantı Konnektörleri': 'profil-baglanti-konnektorleri',
    'Galvaniz Kutu Profiller': 'galvaniz-kutu-profiller',
}

# ---------- yardımcılar ----------
def bolumler(h):
    out = OrderedDict([('_giris', [])]); son = '_giris'
    for s in h.split('\n'):
        m = re.match(r'<h\d>(.*)</h\d>', s)
        if m: son = m.group(1); out[son] = []; continue
        if s.startswith('<ul>'): out[son].extend(re.findall(r'<li>(.*?)</li>', s))
        elif s.strip(): out[son].append(re.sub('<[^>]+>', '', s))
    return out

def bilgi(x, baslik):
    for t, d in x['bilgi']:
        if t == baslik: return [re.sub('<[^>]+>', '', p).strip() for p in d.split('\n') if re.sub('<[^>]+>', '', p).strip()]
    return []

def bul(items, anahtar):
    for it in items:
        if it.startswith(anahtar):
            return it.split(':', 1)[1].strip() if ':' in it else it
    return None

def say(metin, desen, varsayilan=None):
    m = re.search(desen, metin or '')
    return m.group(1) if m else varsayilan

def kucuk(s): return s.replace('I', 'ı').replace('İ', 'i').lower()
def ul(items): return '<ul>' + ''.join(f'<li>{H.escape(i, quote=False)}</li>' for i in items if i) + '</ul>'
def p(t): return f'<p>{t}</p>'
def h2(t): return f'<h2>{t}</h2>'
def sss(ciftler):
    return h2('Sık Sorulan Sorular') + ''.join(f'<h3>{s}</h3><p>{c}</p>' for s, c in ciftler)

def diger_modeller(b, baslik='Hangi model?'):
    for k in (baslik, 'Hangi model?', 'Hangi ölçü?', 'Hangi tip?'):
        if k in b: return [i for i in b[k] if not i.startswith('✔')]
    return []

def paket(x):
    return [i for i in bilgi(x, 'Paket İçeriği') if 'dahil değildir' not in i]

def kurulum_ortak(ek=''):
    return f'Kaynak, kesim ya da delme gerekmez; tüm parçalar civata ve somunla birleşir. Kurulum anahtarı ve resimli kurulum kılavuzu kutudan çıkar.{ek}'

DANIS = f'Ölçü ya da uygunluk konusunda emin olamazsanız siparişten önce müşteri hizmetlerimize ({TEL}) danışabilirsiniz.'

TR = str.maketrans('çğıöşüÇĞİÖŞÜâÂ', 'cgiosuCGIOSUaA')
def slugla(s):
    s = s.replace('İ', 'i').replace('I', 'ı').lower().translate(TR)
    s = s.replace('×', 'x').replace('²', '2').replace('°', '')
    s = re.sub(r'(\d),(\d)', r'\1-\2', s)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return re.sub('-+', '-', s)

def sigdir(adaylar, en, boy):
    for a in adaylar:
        if en <= len(a) <= boy: return a
    a = adaylar[-1]
    if len(a) > boy: a = a[:boy - 1].rsplit(' ', 1)[0].rstrip(',;:–-') + '.'
    return a

def baslik_meta(kisa):
    return sigdir([f'{kisa} | HasTürk Gübre', f'{kisa} | HasTürk', kisa], 30, 60)

def temiz_ad(ad):
    return ad.replace('Profimod® ', '').replace('Profimod®', '').strip()

# ---------- aileler ----------
def odunluk(x, b):
    ol = b['Ölçüler']; odun = b['Ne kadar odun alır?']
    dis = bul(ol, 'Dış ölçü').split(' (')[0]
    bolum = say(bul(ol, 'Bölüm'), r'(\d+) ×')
    ster = say(odun[0], r'([\d,]+) ster')
    mese = say(bul(odun, 'Meşe'), r'yaklaşık ([\d.]+) kg')
    besik = 'beşik' in x['ad'].lower(); kapili = 'Kapılı' in x['ad']
    catı = 'beşik (iki yana eğimli) çatılı' if besik else 'düz çatılı'
    giris = (f'{dis} ölçüsündeki bu galvaniz odunluk iskeleti {bolum} bölümden oluşur ve {ster} ster istif odun alır; '
             f'bu yaklaşık {mese} kg kuru meşe odununa denk gelir. Ev duvarına yaslanarak kurulur, {catı} yapısıyla istifi yağmurdan korurken '
             f'açık yanlarından giren hava odunun kurumasına yardımcı olur.')
    if kapili: giris += ' Önde her bölümde menteşeli bir kafes kapı kanadı vardır; yan yana iki kanat çift kapı gibi açılır, odunu yüklemek kolaylaşır.'
    elif besik: giris += ' Ön yüz tamamen açıktır; odunu kolayca dizer, kolayca alırsınız.'
    else: giris += ' Düz çatılı ekonomik model kar yağmayan, yağışı az bölgeler için uygundur.'
    oz = ['Üç yanı açık iskelet havayı dolaştırır; odun daha çabuk kurur, küflenmez ve daha iyi yanar',
          'Çatı istifin her yanından yaklaşık 15 cm taşar, yağmur suyunu odundan uzak tutar',
          'Galvaniz kaplı profil açık havada paslanmaya karşı dayanıklıdır',
          'Kaynaksız, civatalı sistem: kendiniz kurar, gerektiğinde söküp taşırsınız']
    if besik: oz.insert(2, 'Beşik çatı karı ve yağmuru iki yana atar; kar yağan bölgeler için uygundur')
    if kapili: oz.insert(0, 'Her bölümde kelebek menteşeli kafes kapı kanadı')
    catı_ortu = [i for i in b.get('Çatı örtüsü (pakete dahil değildir)', [])]
    a = [p(giris),
         p('<strong>Pakete dahil olmayanlar:</strong> çatı örtüsü (sac, branda ya da OSB), duvar ve zemin sabitleme malzemesi, yağmur oluğu ve odun. Kutudan yalnızca galvaniz profil iskelet çıkar; görsellerdeki örtü ve odun fikir vermek içindir.'),
         h2('Öne Çıkan Özellikler'), ul(oz),
         h2('Ölçüler'), ul(ol),
         h2('Ne Kadar Odun Alır?'), ul(odun),
         h2('Çatı Örtüsü İçin Malzeme Hesabı'), p('Örtü pakete dahil değildir; aşağıdaki miktarlar malzeme alırken size yol gösterir.'), ul(catı_ortu),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Kurulum Önerileri'), ul(['Odunluğu ev duvarına dübelle bağlayın; dolu istif ve rüzgâr altında devrilmeyi önlemenin en güvenli yolu budur',
                                      'Beton, stabilize ya da çakıl zemin tercih edin; toprak zeminde en alt sıranın altına palet koyun',
                                      'Açık yüzü hâkim rüzgârın tersine çevirin, duvarla iskelet arasında birkaç santimetre hava boşluğu bırakın',
                                      'Çatıya çıkmayın, örtünün üzerinde kar ve su birikmesine izin vermeyin; azami taşıma yükü test edilmemiştir']),
         h2('Bu Serideki Diğer Ölçüler'), ul(diger_modeller(b)),
         sss([('Odunluğa kaç ster odun sığar?', f'Bu model {ster} ster istif odun alır. 1,08 m derinlikte 33 cm’lik soba odunu üç sıra, 50 cm’lik şömine odunu iki sıra dizilir.'),
              ('Çatı örtüsü gönderiliyor mu?', 'Hayır. Galvaniz trapez sac, UV dayanımlı branda ya da OSB levha ile kendiniz kaplarsınız; gereken miktarlar yukarıdaki malzeme hesabında yazılıdır.'),
              ('Odunluğu duvara sabitlemek gerekir mi?', 'Evet. Dolu odunluk ağırdır ve rüzgâra maruz kalır; arka yüzü ev duvarına dübelle bağlamanız gerekir.')]),
         p(DANIS)]
    kisa = f'Galvaniz {"Kapılı " if kapili else ""}Odunluk {dis.replace(" ", "")} {"Beşik" if besik else "Düz"} Çatı'
    md = sigdir([f'{dis} galvaniz odunluk iskeleti, {ster} ster odun alır. {"Beşik" if besik else "Düz"} çatılı, duvara yaslanır, kaynaksız kurulur. Örtü dahil değildir.',
                 f'{dis} galvaniz odunluk, {ster} ster kapasite. {"Beşik" if besik else "Düz"} çatı, kaynaksız civatalı kurulum. Çatı örtüsü pakete dahil değildir.'], 120, 158)
    return a, kisa, md

def golgelik(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]
    alan = bul(ol, 'Gölge alanı'); uzun = 'Uzun' in x['ad']
    arac = 'sedan, SUV ve uzun gövdeli araçlar' if uzun else 'hatchback ve kompakt araçlar'
    giris = (f'{dis} ölçüsünde, tek araçlık kesik çatılı galvaniz araç gölgeliği (carport) iskeleti; {arac} için tasarlandı. '
             f'{alan} gölge alanı aracınızı güneşten, yağmurdan ve kuş pisliğinden korur. Önü tamamen açıktır, araç rahat girer ve iki yanda kapı açacak boşluk kalır.')
    oz = ['Kabin serin kalır; boya ve iç döşeme güneşte solmaz',
          'Polikarbon ya da branda örtüyle araç yağmurda ve çiyde kuru kalır',
          'Aracın her iki yanında yaklaşık 0,95 m boşluk',
          'Galvaniz kaplı profil açık havada paslanmaya karşı dayanıklıdır',
          'Kaynaksız, civatalı sistem; kurulum anahtarı ve resimli kılavuz pakette',
          'Bahçe oturma alanı, motosiklet, bisiklet ya da bahçe makineleri için de gölgelik olarak kullanılır']
    a = [p(giris),
         p('<strong>Pakete dahil olmayanlar:</strong> örtü (gölge filesi, branda, polikarbon), örtü bağlama ve zemin sabitleme malzemesi. Yalnızca galvaniz profil iskelet gönderilir; görsellerdeki örtü ve araç temsilîdir.'),
         h2('Öne Çıkan Özellikler'), ul(oz), h2('Ölçüler'), ul(ol),
         h2('Aracım Sığar mı?'), p('Araç sınıflarının ortalama ölçülerine göre hesaplanmıştır; kendi aracınızın boyunu ve aynalar dahil genişliğini mutlaka kontrol edin.'),
         ul([i for i in b['Aracım sığar mı? (sınıf ortalaması)'] if ':' in i]),
         h2('Örtü Seçimi'), ul(['Çatı örtüsü ihtiyacı: ' + say(' '.join(b['Örtü seçenekleri (pakete dahil değildir)']), r'yaklaşık ([\d,]+ m²)') + ' (%10 pay dahil)',
                               'Gölge filesi: %70-90 gölge verir, rüzgârı geçirir, en hafif çözümdür',
                               'PVC branda: yağmur geçirmez ve tam gölge sağlar; rüzgârı tuttuğu için sağlam sabitleme ister',
                               'Polikarbon levha: dolu ve yağmura karşı korur, ışığı geçirir; 4-6 mm UV korumalı levha seçin',
                               'Örtüyü kuşgözü, UV dayanımlı kelepçe ya da pullu vidayla 40-50 cm arayla bağlayın']),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Sabitleme ve Güvenlik'), ul(['8 dikmenin tamamını zemine sabitleyin; örtülü gölgelik rüzgârı yelken gibi tutar',
                                          'Beton ya da karo zeminde dübel ve L plaka, toprak zeminde uzun kazık ya da beton papuç kullanın',
                                          'Kar yükü ve fırtına için test edilmemiştir; kışın ve fırtına uyarılarında örtüyü sökün',
                                          'Çatıya çıkmayın, üzerine yük koymayın, örtüde su ve kar biriktirmeyin']),
         h2('Bu Serideki Diğer Ölçüler'), ul(diger_modeller(b)),
         sss([('Hangi araçlar için uygun?', f'Bu model {arac} için uygundur. İç genişlik {bul(ol, "İç genişlik")}, giriş yüksekliği {bul(ol, "Giriş yüksekliği")}.'),
              ('Örtü gönderiliyor mu?', 'Hayır, yalnızca galvaniz iskelet gönderilir. Gölge filesi, branda ya da polikarbon levhayla kendiniz kaplarsınız.'),
              ('Kurulum için kaynak gerekir mi?', kurulum_ortak())]),
         p(DANIS)]
    kisa = f'Galvaniz Araç Gölgeliği {dis.replace(" ", "")} {"Uzun" if uzun else "Kompakt"}'
    md = sigdir([f'{dis} galvaniz araç gölgeliği (carport) iskeleti, {alan} gölge alanı. {arac.capitalize()} için. Kaynaksız kurulum, örtü dahil değil.',
                 f'{dis} galvaniz carport iskeleti, {alan} gölge. Kaynaksız, civatalı kurulum. Örtü pakete dahil değildir.'], 120, 158)
    return a, kisa, md

def kovan(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]
    kap = say(bul(ol, 'Kapasite'), r'(\d+)'); iki = '2 Katlı' in x['ad']
    tip = say(x['ad'], r"Sehpası (\d'l[ıiüu])")
    giris = (f'{kap} kovan alan, {"iki katlı" if iki else "tek katlı"} galvaniz arı kovanı sehpası ({dis}). '
             'Kovanı yerden yaklaşık 50 cm yükseğe kaldırır; kovan tabanı nemden, karıncadan ve kemirgenlerden uzak kalır, alttan hava alır. '
             + ('Üst kat 1,52 m yükseklikte olduğundan aynı taban alanında iki kat kovan dizersiniz; yer darlığında, kışlatmada ve çoğaltma çalışmalarında işinizi kolaylaştırır.' if iki
                else 'Eğilmeden çalıştığınız için bel ve diz yükü azalır.'))
    oz = ['30×30×1,2 mm galvaniz kutu profil ve %30 cam elyaf takviyeli PA konnektör',
          'Galvaniz kaplama açık arazide paslanmaya karşı dayanıklıdır',
          'Kovan iki kuşağın üstüne oturur; altı havalanır, nem tutmaz',
          'Çalışma yüksekliği bel ve diz yükünü azaltır',
          'Kaynaksız, civatalı kurulum; kurulum anahtarı ve resimli kılavuz pakette']
    if iki: oz.insert(3, 'Üst kat çoğaltma ve ana arı kovanları için uygundur')
    kurulum = ['Kovan girişlerini güneye ya da doğuya çevirin; sabah güneşi arıları erken harekete geçirir',
               'Arılığın 800 m içinde su kaynağı yoksa suluk koyun',
               'Sehpaları 1 m arayla dizin; dört sehpadan sonra 3 m geride yeni sıra açın ve girişleri aynı yöne çevirin',
               'Kovan önlerini farklı renklere boyamak arıların kovan karıştırmasını azaltır',
               'Yağmur suyu içeri girmesin diye kovanın önü hafif öne eğik dursun',
               'Arıcılık Yönetmeliği’ne göre arılık köy ve mahalle yollarına en az 50 m uzakta olmalıdır']
    if iki: kurulum.insert(0, 'Ağır, ballıklı kovanları alt kata; hafif kovanları üst kata yerleştirin')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> kovanlar ve arıcılık ekipmanı. Yalnızca sehpa iskeleti gönderilir.'),
         h2('Öne Çıkan Özellikler'), ul(oz), h2('Ölçüler ve Uyumlu Kovanlar'), ul(ol),
         h2('Kullanım Alanları'), ul(b.get('Kullanım alanları', [])),
         h2('Paket İçeriği'), ul(paket(x)), h2('Arılık Kurulum Önerileri'), ul(kurulum),
         h2('Bu Serideki Diğer Modeller'), ul(diger_modeller(b)),
         sss([('Hangi kovanlar bu sehpaya uyar?', 'Langstroth (41,3 × 50,5 cm) ve 10 çerçeveli Dadant (yaklaşık 43 × 50 cm) kovanlar, 41 cm arayla yerleştirilmiş iki kuşağın üzerine oturur.'),
              ('Sehpa kaç kovan taşır?', f'Bu model {kap} kovanlıktır. Azami taşıma yükü test edilmemiştir; ağır kovanları alt kata koyun.'),
              ('Nasıl kurulur?', kurulum_ortak(' Sehpayı düz ve sağlam bir zemine kurun.'))]),
         p(DANIS)]
    kisa = f'Galvaniz Arı Kovanı Sehpası {tip} {"2 Katlı" if iki else "Tek Katlı"} {kap} Kovan'
    md = sigdir([f'{kap} kovanlık {"2 katlı" if iki else "tek katlı"} galvaniz arı kovanı sehpası, {dis}. Langstroth ve Dadant kovana uygun, kaynaksız kurulum.',
                 f'{kap} kovanlık galvaniz kovan sehpası, {dis}. Langstroth ve Dadant uyumlu, kaynaksız civatalı kurulum.'], 120, 158)
    return a, kisa, md

def masa(x, b):
    ol = b['Ölçüler']; tabla = bul(ol, 'Tabla ölçüsü').split(' (')[0]
    ad = temiz_ad(x['ad']); tur = re.sub(r'^Galvaniz | İskeleti.*$', '', ad)
    kul = b.get('Kullanım alanları', [])
    neden = [i for i in b.get('Neden bu masa?', []) if not i.startswith(('Kaynaksız', '30×30', 'Ayak tapaları', 'Yerden yaklaşık 25'))]
    giris_kaynak = b['_giris'][0]
    # ürün özel cümle: viyol / kişi / koli bilgisi kaynaktaki sayılardan
    ozel = {'Atölye': '250 × 85 cm yüzey uzun malzemeyi tek parça taşır, iki kişi yan yana rahat çalışır.',
            'Bahçe Çalışma': '130 × 85 cm yüzey saksı doldurma, fide şaşırtma ve alet bakımı için iki ayrı çalışma alanı sunar.',
            'Kargo': '160 × 85 cm yüzeyde koli kurarken bant, tartı ve etiket yazıcısı da yanınızda durur.',
            'Sera Tezgahı': '70 cm derinlik standart köpük viyolün (66,5 × 32,8 cm) enine tam oturmasını sağlar; yüzeye 3 viyol sığar.',
            'Sera Orta': '110 cm genişlik sayesinde iki taraftan da çalışılır; yüzeye 9 standart köpük viyol sığar.',
            'Uzun Sera': '210 cm boy ve 70 cm derinlikle 6 standart köpük viyol yan yana oturur, seranın bir kenarını boydan boya değerlendirir.'}
    cumle = next(v for k, v in ozel.items() if k in ad)
    giris = (f'{tabla} tabla ölçüsüne göre üretilmiş galvaniz {kucuk(tur)} iskeleti; 25 mm tablayla çalışma yüksekliği 80 cm olur. {cumle} '
             'Yerden yaklaşık 25 cm yükseklikteki alt kuşak hem gövdeyi sağlamlaştırır hem de raf olarak kullanılır.')
    kesim = b.get('Tabla ve raf kesim talimatı', [])
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> üst tabla ve alt raf levhası. Yalnızca galvaniz iskelet gönderilir; tablayı istediğiniz malzemeden kestirirsiniz.'),
         h2('Öne Çıkan Özellikler'), ul(neden + ['30×30×1,2 mm galvaniz kutu profil, %30 cam elyaf takviyeli PA konnektör',
                                                 'Ayak tapaları pakette: zemini çizmez, profilin içine toz ve su girmez',
                                                 'Kaynak, kesim ya da delme gerektirmeyen civatalı kurulum']),
         h2('Ölçüler'), ul(ol), h2('Kullanım Alanları'), ul(kul),
         h2('Tabla ve Raf Kesim Ölçüleri'), ul(kesim),
         h2('Paket İçeriği'), ul(paket(x)), h2('Bu Serideki Diğer Modeller'), ul(diger_modeller(b)),
         sss([('Tabla pakete dahil mi?', 'Hayır. Kesim ölçüleri yukarıda verilmiştir; kontrplak, MDF, OSB ya da masif ahşap kullanabilirsiniz.'),
              ('Masa ne kadar yük taşır?', 'Azami taşıma yükü test edilmemiştir. Ağır yükleri yüzeye yayarak koyun, masanın üzerine çıkmayın.'),
              ('Kurulum nasıl yapılır?', kurulum_ortak(' Masayı düz ve sağlam bir zemine kurun.'))]),
         p(DANIS)]
    kisa = f'Galvaniz {tur} İskeleti {tabla.replace(" ", "")}'
    md = sigdir([f'{tabla} galvaniz {kucuk(tur)} iskeleti, 80 cm çalışma yüksekliği ve alt raf kuşağı. Kaynaksız civatalı kurulum, tabla dahil değildir.',
                 f'{tabla} galvaniz {kucuk(tur)} iskeleti, alt raflı. Kaynaksız kurulum, tabla pakete dahil değildir.'], 120, 158)
    return a, kisa, md

def cop(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; ic = bul(ol, 'İç ölçü')
    hacim = say(x['ad'], r'Muhafazası ([\d–]+ L)'); kapakli = 'Kapaklı' in x['ad']
    kova = 'Kovası' in x['ad']; nesne = 'çöp kovası' if kova else 'çöp konteyneri'
    kanat = 'tek kanatlı' if kova else 'çift kanatlı'
    uyum_k = 'Uyumlu kovalar' if kova else 'Uyumlu konteynerler'
    uyum = b.get(uyum_k, [])
    giris = (f'{hacim} {nesne} için galvaniz profil muhafaza ({dis}). Önde kilitlenebilir {kanat} kapı vardır; önde alt kayıt olmadığı için '
             f'{"kova" if kova else "konteyner"} tekerlekleri üzerinde kolayca içeri girip çıkar. Kedi, köpek ve kuşların çöpü dağıtmasını, rüzgârda devrilmeyi ve izinsiz kullanımı önler; '
             'apartman, site, iş yeri ve bahçeler için uygundur.'
             + (' Üst kapak yağmur ve güneşi keser.' if kapakli else ' Üst kısmı açıktır; çöp yukarıdan atılır.'))
    dahil_degil = f'{nesne}, tel ya da delikli sac kaplama{", kapak sacı" if kapakli else ""}, asma kilit ve zemin sabitleme malzemesi'
    a = [p(giris), p(f'<strong>Pakete dahil olmayanlar:</strong> {dahil_degil}. Galvaniz iskelet ve ön kapı{" ile üst kapak çerçevesi" if kapakli else ""} gönderilir.'),
         h2('Ölçüler'), ul(ol),
         h2('Uyumlu ' + ('Kovalar' if kova else 'Konteynerler')), ul(uyum),
         h2('Kaplama Seçenekleri'), p('Kaplama pakete dahil değildir; iskeleti istediğiniz görünüme göre kaplarsınız.'),
         ul(['Galvaniz kaynaklı kafes teli: hava geçirir, koku birikmez', 'Delikli sac: daha kapalı ve düzgün bir görünüm verir',
             'Ahşap çıta ya da kompozit levha da kullanılabilir', 'Kaplamayı galvaniz tel, kelepçe ya da pullu vidayla 20-30 cm arayla profillere bağlayın']
            + (['Üst kapak için düz galvaniz sac, kompozit levha ya da ahşap önerilir'] if kapakli else [])),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Kurulum'), ul(['Civatalı sistemdir, kaynak gerekmez; kurulum anahtarı ve resimli kılavuz pakettedir',
                            'Muhafazayı zemine sabitleyin; rüzgârda devrilmesini önler', 'Kapının önünde açılma payı bırakın',
                            'Azami taşıma yükü test edilmemiştir; üstüne yük koymayın, çıkmayın']),
         h2('Bu Serideki Diğer Ölçüler'), ul(diger_modeller(b)),
         sss([(f'{nesne.capitalize()}m muhafazaya sığar mı?', f'Muhafazanın iç ölçüsü {ic}. Satın almadan önce kendi {"kovanızın" if kova else "konteynerinizin"} ölçüsünü kontrol edin; markaya göre ölçüler değişebilir.'),
              ('Kaplama ve kilit gönderiliyor mu?', f'Hayır. {dahil_degil.capitalize()} ayrıca temin edilir; kaplanacak alan ölçüler bölümünde yazılıdır.'),
              ('Muhafaza nasıl kurulur?', kurulum_ortak(' Kurduktan sonra zemine sabitleyin.'))]),
         p(DANIS)]
    kisa = f'Galvaniz Çöp {"Kovası" if kova else "Konteyneri"} Muhafazası {hacim} {"Kapaklı" if kapakli else "Açık"}'
    md = sigdir([f'{hacim} {nesne} için galvaniz muhafaza, {dis}. Kilitlenebilir ön kapı{", üst kapaklı" if kapakli else ", üstü açık"}. Kaynaksız kurulum, kaplama dahil değil.',
                 f'{hacim} {nesne} muhafazası, {dis}. Kilitlenebilir kapı, kaynaksız kurulum. Kaplama dahil değildir.'], 120, 158)
    return a, kisa, md

def raf(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]
    katbol = next((i for i in ol if 'kat,' in i), ''); ad = temiz_ad(x['ad'])
    tur = re.sub(r'^Galvaniz | İskeleti.*$', '', ad)
    neden = [i.rstrip('.') for i in b.get('Neden bu raf?', []) if not i.startswith(('Galvaniz profil', 'Kaynaksız', '30×30', 'Sökülüp'))]
    kul = b.get('Kullanım alanları', [])
    giris = (f'{dis} ölçüsünde, {kucuk(katbol)} galvaniz {kucuk(tur)} iskeleti. {neden[0] if neden else ""}. '
             f'{", ".join(kul[:3]).capitalize()} gibi alanlarda eşyaları yerden kaldırır ve düzenli tutar. '
             'Tablaları istediğiniz malzemeden kestirerek rafı ihtiyacınıza göre tamamlarsınız.')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> raf tablaları. Yalnızca galvaniz iskelet gönderilir; tabla kesim ölçüleri aşağıda yer alır.'),
         h2('Öne Çıkan Özellikler'), ul(neden + ['30×30×1,2 mm galvaniz kutu profil, %30 cam elyaf takviyeli PA konnektör',
                                                 'Galvaniz kaplama nemli ortamda paslanmaya karşı dayanıklıdır',
                                                 'Sökülüp taşınabilir; aynı profil ve konnektörlerle genişletilebilir',
                                                 'Kaynaksız, civatalı kurulum; kurulum anahtarı ve resimli kılavuz pakette']),
         h2('Ölçüler'), ul(ol), h2('Kullanım Alanları'), ul(kul),
         h2('Tabla Kesim Ölçüleri'), ul(b.get('Tabla kesim talimatı', [])),
         h2('Paket İçeriği'), ul(paket(x)), h2('Bu Serideki Diğer Modeller'), ul(diger_modeller(b)),
         sss([('Raf tablaları pakete dahil mi?', 'Hayır. OSB, kontrplak ya da MDF tablaları yukarıdaki ölçülere göre kestirirsiniz; banyo, balkon ve serada suya dayanıklı tabla önerilir.'),
              ('Raf ne kadar yük taşır?', 'Azami taşıma yükü test edilmemiştir. Ağır yükleri alt katlara koyun, yükü katlara eşit dağıtın ve rafa çıkmayın.'),
              ('Kurulum nasıl yapılır?', kurulum_ortak(' Rafı düz ve sağlam bir zemine kurun.'))]),
         p(DANIS)]
    kisa = f'Galvaniz {tur} {dis.replace(" ", "")}'
    md = sigdir([f'{dis} galvaniz {kucuk(tur)} iskeleti, {kucuk(katbol)}. Kaynaksız civatalı kurulum, nemli ortama dayanıklı. Tabla pakete dahil değildir.',
                 f'{dis} galvaniz {kucuk(tur)} iskeleti. Kaynaksız civatalı kurulum, tabla pakete dahil değildir.'], 120, 158)
    return a, kisa, md

def kedi(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]
    kac = say(bul(ol, 'Kaç kedi'), r'^([\d–]+ kedi)'); model = bul(ol, 'Model'); taban = bul(ol, 'Taban alanı')
    tel = b['File / tel ihtiyacı (pakete dahil değildir)']
    giris = (f'{dis} ölçüsünde kapılı galvaniz kedi balkon kafesi iskeleti ({kucuk(model)}). Kediniz evden çıkmadan güneşlenir, temiz hava alır ve sokağı izler; '
             f'her yanı kapalı olduğu için balkondan düşme ve kaçma riski ortadan kalkar. {taban} taban alanı {kac} için uygundur.')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> file ya da tel, ahşap tünek rafları, kilit. Yalnızca galvaniz profil iskelet ve kapı gönderilir; görsellerdeki file, raflar ve kediler temsilîdir.'),
         h2('Öne Çıkan Özellikler'), ul(['Dört yanı ve tavanı kapalı alan: kedi balkondan düşmez, kaçamaz',
                                         'Dışarı açılan tam boy kapı (1,86 m açıklık): içeri girip temizlik yaparsınız',
                                         'Galvaniz kaplı profil açık havada paslanmaya karşı dayanıklıdır',
                                         'Kaynaksız, civatalı kurulum; kurulum anahtarı ve resimli kılavuz pakette']),
         h2('Ölçüler'), ul(ol),
         h2('File ve Tel İhtiyacı'), p('File ya da tel pakete dahil değildir; aşağıdaki miktarlar malzeme alırken yol gösterir.'), ul(tel),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Güvenli Kurulum'), ul(['İskeleti civatalarla kurun', 'Arka yüzü bina duvarına, alt kenarı balkon zeminine dübelle sabitleyin; kafesin kendi ağırlığıyla durmasına güvenmeyin',
                                    'File ya da teli tüm yüzlere ve kapı kanadına boşluk kalmayacak şekilde gerin', 'Kapıya kedinin açamayacağı bir sürgü ya da kilit takın',
                                    'Azami taşıma yükü test edilmemiştir; kafese çıkmayın, üzerine yük koymayın']),
         h2('Bu Serideki Diğer Ölçüler'), ul(diger_modeller(b, 'Hangi ölçü?')),
         sss([('Bu kafes kaç kedi için uygun?', f'Bu ölçü {kac} içindir (2–4 tünek rafıyla; ilk kedi için 1,5 m², her ek kedi için 0,9 m² etkin alan varsayımıyla hesaplanmıştır, resmî bir standart değildir).'),
              ('Hangi file kullanılmalı?', 'UV dayanımlı ip kedi filesi, PVC kaplı kaynaklı tel ya da kaynaklı galvaniz tel kullanılabilir; tel kullanacaksanız göz aralığı en fazla 2,5 cm olmalıdır.'),
              ('Kafesi sabitlemek zorunlu mu?', 'Evet. Kafes kedinin düşmesini önlemek içindir; bina duvarına ve balkon zeminine mutlaka sabitlenmelidir. Sabitlemeden montajı yapan kişi sorumludur.')]),
         p(DANIS)]
    kisa = f'Galvaniz Kedi Balkon Kafesi {dis.replace(" ", "")} Kapılı'
    md = sigdir([f'{dis} kapılı galvaniz kedi balkon kafesi iskeleti, {kac} için. Düşme ve kaçmaya karşı kapalı alan, kaynaksız kurulum. File dahil değil.',
                 f'{dis} galvaniz kedi balkon kafesi, {kac} için. Kaynaksız kurulum, file pakete dahil değildir.'], 120, 158)
    return a, kisa, md

def klima(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; ic = bul(ol, 'İç ölçü')
    tip = say(x['ad'], r'Tip ([A-G])')
    sec = next(i[2:] for i in b['Hangi tip?'] if i.startswith('✔'))
    cihaz = sec.split(', ', 1)[1]
    uyum = b['Uyumlu cihazlar']
    giris = (f'{cihaz} için galvaniz profil koruma kafesi (Tip {tip}, {dis}). Cihazı hırsızlığa, darbeye, çocuk ve evcil hayvanlara karşı korur. '
             'Önde menteşeli, kilitlenebilir bakım kapağı vardır; servis için kafesi sökmeniz gerekmez.')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> cihaz, tel ya da delikli sac kaplama, asma kilit, zemin ve duvar sabitleme malzemesi. Galvaniz iskelet ve ön kapak gönderilir.'),
         h2('Ölçüler'), ul(ol), h2('Uyumlu Cihazlar'), ul(uyum),
         h2('Kaplama Seçimi'), p('Cihazın soğutma verimi için kaplamanın havayı serbestçe geçirmesi gerekir:'),
         ul(['En az 5 cm göz aralıklı galvaniz kaynaklı seyrek tel', 'En az %40 açıklıklı, geniş delikli galvaniz sac',
             'Sık tel, file, düz sac ya da branda kullanmayın; hava akışı kesilir, cihaz ısınır ve verimi düşer',
             'Kaplamayı galvaniz tel, kelepçe ya da pullu vidayla 20-30 cm arayla profillere bağlayın']),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Kurulum'), ul(['Civatalı sistemdir, kaynak gerekmez; kurulum anahtarı ve resimli kılavuz pakettedir', 'Kafesi zemine ya da duvara sabitleyin',
                            'Fan önünü kapatmayın; bakım için kapağın önünde boşluk bırakın', 'Azami taşıma yükü test edilmemiştir; kafesin üstüne yük koymayın, çıkmayın']),
         h2('Diğer Kafes Tipleri'), ul(diger_modeller(b, 'Hangi tip?')),
         sss([('Cihazım bu kafese sığar mı?', f'Kafesin iç ölçüsü {ic}. Cihazın her yanında, önünde, arkasında ve üstünde en az 10 cm boşluk kalmalıdır; satın almadan önce cihazınızı ölçün.'),
              ('Bakım için kafesi sökmek gerekir mi?', 'Hayır. Ön bakım kapağı menteşelidir; kapağı açarak cihaza servis yapılır.'),
              ('Kaplama ve kilit gönderiliyor mu?', 'Hayır. Seyrek tel ya da geniş delikli sac ile asma kilidi ayrıca temin edersiniz.')]),
         p(DANIS)]
    kisa = sigdir([f'Galvaniz {temiz_ad(x["ad"]).replace("Galvaniz ", "").split(" Tip")[0]} Tip {tip} {dis.replace(" ", "")}',
                   f'Galvaniz Klima ve Kompresör Kafesi Tip {tip}'], 20, 48)
    md = sigdir([f'{cihaz} için galvaniz koruma kafesi Tip {tip}, {dis}. Kilitlenebilir bakım kapağı, kaynaksız kurulum. Kaplama dahil değil.',
                 f'Galvaniz kafes Tip {tip}, {dis}: {cihaz}. Kilitlenebilir kapak, kaynaksız kurulum.'], 120, 158)
    return a, kisa, md

def konteyner(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; taban = bul(ol, 'Taban alanı')
    seri = 'Ultra Sağlam' if 'Ultra' in x['ad'] else ('Sağlam' if 'Sağlam' in x['ad'] else 'Standart')
    feet = say(b['_giris'][0], r'(\d+) feet'); yan = 'Yan Kapılı' in x['ad']
    kapi = bul(ol, 'Kapı')
    seri_acik = {'Standart': 'depo, bahçe deposu, barınak ve sundurma iskeleti olarak tasarlanmıştır; yaşam ya da oturma amaçlı değildir',
                 'Sağlam': 'daha sık ızgarasıyla daha rijit bir gövde sunar; depo, atölye, garaj ve hobi alanı için uygundur',
                 'Ultra Sağlam': 'en sık ızgaralı ve en sağlam seridir; atölye, bahçe ofisi ve hobi odası iskeleti için uygundur'}[seri]
    giris = (f'{feet} feet konteyner boyunda, {dis} ölçüsünde {kucuk(seri)} seri galvaniz konteyner iskeleti; taban alanı {taban}. '
             f'30×30×1,2 mm galvaniz kutu profil ve %30 cam elyaf takviyeli konnektörlerle civatalı kurulur; kaynak gerekmez, söküp başka yere taşıyabilirsiniz. '
             f'{"Uzun yanda" if yan else "Kısa kenarda"} çift kanatlı kapı bulunur. {seri} seri {seri_acik}.')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> duvar, çatı ve zemin kaplaması, yalıtım, kilit, elektrik ve su tesisatı, zemin sabitleme malzemesi. Galvaniz iskelet ve çift kanatlı kapı iskeleti gönderilir.'),
         h2('Ölçüler'), ul(ol),
         h2('Kaplama ve Zemin Malzeme Hesabı'), p('Malzemeler pakete dahil değildir; aşağıdaki hesap alışveriş listenizi hazırlamanıza yardımcı olur.'),
         ul(b['Kaplama ve zemin hesabı (malzemeler dahil değildir)']),
         h2('Seri Farkları'), ul([i.lstrip('✔ ') for i in b['Seri farkları']]),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Kurulum'), ul(['Civatalı sistemdir, kaynak gerekmez; kurulum anahtarı ve resimli kılavuz pakettedir',
                            'Düz ve sağlam bir zemine (beton, sıkıştırılmış dolgu ya da ayaklı kaide) kurup zemine sabitleyin',
                            'Çatı eğimi, su yalıtımı ve tesisatı kurulum yerine göre ayrıca planlayın',
                            'Azami taşıma, kar ve rüzgâr yükü test edilmemiştir; çatıya çıkmayın',
                            'Kurulum yerindeki imar, yapı ve izin kurallarına uymak alıcının sorumluluğundadır']),
         h2('Bu Serideki Diğer Modeller'), ul(diger_modeller(b)),
         sss([('Kaplama malzemesi ne kadar gerekir?', b['Kaplama ve zemin hesabı (malzemeler dahil değildir)'][0] + '. Sandviç panel ya da trapez sac ve zemin levhası miktarları yukarıda yazılıdır.'),
              ('Kapı nerede?', f'{kapi}.'),
              ('Konteyner iskeleti yaşam alanı olarak kullanılabilir mi?', 'Standart seri yaşam ya da oturma amaçlı değildir. Sağlam ve Ultra Sağlam seriler atölye, hobi alanı ve bahçe ofisi iskeleti olarak kullanılır; yalıtım ve tesisatı ayrıca planlamanız gerekir.')]),
         p(DANIS)]
    kisa = f'Galvaniz Konteyner İskeleti {seri} {"Uzun" if "Uzun" in x["ad"] else "Kısa"}{" Yan Kapılı" if yan else ""}'
    md = sigdir([f'{feet} feet boyunda {kucuk(seri)} seri galvaniz konteyner iskeleti, {dis}, {taban} taban. Kaynaksız civatalı kurulum, kaplama dahil değil.',
                 f'{seri} seri galvaniz konteyner iskeleti, {dis}. Kaynaksız civatalı kurulum, kaplama dahil değildir.'], 120, 158)
    return a, kisa, md

def kurutma(x, b):
    ol = b['Ölçüler ve kapasite']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; alan = bul(ol, 'Kurutma alanı')
    kg = say(bul(ol, 'Tek seferde'), r'yaklaşık (\d+ kg)'); kapak = say(x['ad'], r'(\d) Bölmeli')
    giris = (f'{dis} ölçüsünde kapaklı galvaniz kurutma tezgâhı iskeleti. {alan} kurutma alanına bir seferde yaklaşık {kg} taze dilimlenmiş domates ya da elma serilir (tahmini). '
             'Ürün yerden 78,5 cm yükseklikte, toprak ve tozla temas etmeden güneşte kurur; alttan da hava aldığı için eşit kurur. '
             f'Arka kenardan menteşeli {kapak} adet sinek telli kapak böcek ve kuşları uzak tutar.')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> alt tel, sinek teli ve kurutulacak ürünler. Yalnızca galvaniz iskelet ve kapak çerçeveleri gönderilir.'),
         h2('Öne Çıkan Özellikler'), ul(['Ürün toprağa ve toza değmez; küf ve aflatoksin riski azalır', 'Kedi, tavuk ve köpek ürüne ulaşamaz',
                                         '78,5 cm çalışma yüksekliği: ürünü eğilmeden serer, eğilmeden toplarsınız',
                                         'Gündüz kapak kapalı tutulur, ürün böcek ve kuştan korunur',
                                         'Galvaniz kaplı profil açık havaya dayanıklıdır; kaynaksız, civatalı kurulum']),
         h2('Ölçüler ve Kapasite'), ul(ol),
         h2('Tel İhtiyacı'), p('Tel pakete dahil değildir. Ürüne değen alt telde paslanmaz çelik ya da gıdaya uygun tel kullanın; galvanizli tel, bakır ve alüminyum kullanmayın.'),
         ul([i for i in b['Tel ihtiyacı (pakete dahil değildir)'] if 'kullanmayın' not in i]),
         h2('Neler Kurutulur?'), ul(b['Neler kurutulur?']),
         h2('Kurutma Önerileri'), ul(['Tezgâhı güneş alan, rüzgârlı ve yol tozundan uzak bir yere kurun', 'Ürünü tek kat ve birbirine değmeyecek şekilde serin, günde bir kez çevirin',
                                      'Akşam çiyinden korumak için ürünü içeri alın ya da üzerini örtün', 'Süre havaya bağlıdır: domates yaklaşık 5-10, elma 3-5 güneşli gün sürer (tahmini)',
                                      'Teli her sezon yıkayın; tezgâha oturmayın ve çıkmayın']),
         h2('Paket İçeriği'), ul(paket(x)), h2('Bu Serideki Diğer Ölçüler'), ul(diger_modeller(b, 'Hangi ölçü?')),
         sss([('Tezgâha bir seferde ne kadar ürün serilir?', f'Yaklaşık {kg} taze dilimlenmiş domates ya da elma (tahmini); kurutma alanı {alan}.'),
              ('Tel gönderiliyor mu?', 'Hayır. Alt tel için 1-2 cm gözlü paslanmaz çelik ya da gıdaya uygun tel, kapak için sinek teli alırsınız; miktarlar yukarıda yazılıdır.'),
              ('Hangi ürünler kurutulabilir?', 'Domates, biber, isot, patlıcan, bamya, kayısı, incir, üzüm, dut, elma, nane, kekik, tarhana ve erişte kurutulabilir.')]),
         p(DANIS)]
    kisa = f'Galvaniz Kurutma Tezgâhı {dis.replace(" ", "")} Kapaklı'
    md = sigdir([f'{dis} kapaklı galvaniz kurutma tezgâhı, {alan} alan, yaklaşık {kg} ürün. Domates, biber, meyve kurutma. Tel dahil değildir.',
                 f'{dis} galvaniz kurutma tezgâhı, {alan} kurutma alanı. Kapaklı, kaynaksız kurulum. Tel dahil değildir.'], 120, 158)
    return a, kisa, md

def kus(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; taban = bul(ol, 'İç taban'); model = bul(ol, 'Model')
    sec = next(i[2:] for i in b['Hangi model?'] if i.startswith('✔'))
    muh = say(sec, r'(\d+) muhabbet')
    tel = [i for i in b['Tel önerileri (pakete dahil değildir)']]
    giris = (f'{dis} ölçüsünde, içine girilebilen kapılı galvaniz salma kuş kafesi (kuşhane) iskeleti; {kucuk(model)}. '
             f'{taban} iç tabanda kuşlar gerçekten uçar, dala konar ve güneşlenir; 2,04 m açıklıklı kapıdan içeri girip yem, su ve temizlik işlerini rahatça yaparsınız. '
             f'Bu model {muh} muhabbet kuşuna kadar uygundur.')
    a = [p(giris), p('<strong>Pakete dahil olmayanlar:</strong> tel örgü, dallar, yuva, yemlik, suluk, çatı örtüsü ve kilit. Yalnızca galvaniz iskelet ve kapı gönderilir; görsellerdeki tel, dallar ve kuşlar temsilîdir.'),
         h2('Öne Çıkan Özellikler'), ul(['Gerçek uçuş alanı: kuşlar kanat çırpıp uçabilir', 'İçine girilebilir: dışarı açılan 2,04 m kapı',
                                         'Galvaniz kaplı profil açık havada paslanmaya karşı dayanıklıdır', 'Kargoyla gelir, kaynaksız ve civatalı olarak kendiniz kurarsınız']),
         h2('Ölçüler'), ul(ol),
         h2('Hangi Kuştan Kaç Adet?'), ul([i for i in b['Hangi kuştan kaç adet?'] if ':' in i]),
         p('Sayılar tek tür için, bir çifte gereken asgari taban alanı ve her ek kuş için eklenen alan esas alınarak hesaplanmıştır.'),
         h2('Tel Seçimi'), ul(tel),
         h2('Paket İçeriği'), ul(paket(x)),
         h2('Kurulum ve Bakım'), ul(['Düz bir zemine kurun, tabana çakıl ya da kum serin', 'Rüzgâra karşı kafesi duvara ve zemine sabitleyin',
                                     'Tüm açık yüzleri ve kapıyı boşluk kalmayacak şekilde telle kaplayın',
                                     'Bir bölmeye yağmur ve güneş örtüsü koyun; kuşların sığınacağı korunaklı bir köşe olsun',
                                     'Kapıya sürgü ya da kilit takın; kuş sesiyle ilgili site ve belediye kurallarını önceden kontrol edin']),
         h2('Bu Serideki Diğer Ölçüler'), ul(diger_modeller(b)),
         sss([('Bu kafese kaç kuş konur?', f'Bu model {muh} muhabbet kuşuna kadar uygundur; diğer türler için sayılar yukarıdaki tabloda yer alır.'),
              ('Hangi tel kullanılmalı?', 'Küçük kuşlar için 12-13 mm gözlü, en az 1 mm kalınlıkta kaynaklı galvaniz tel uygundur. Yeni galvaniz teli kullanmadan önce sirkeli suyla fırçalayıp durulayın.'),
              ('Kafes nasıl kurulur?', kurulum_ortak(' Kurduktan sonra duvara ve zemine sabitleyin.'))]),
         p(DANIS)]
    kisa = f'Galvaniz Salma Kuş Kafesi {dis.replace(" ", "")} Kapılı'
    md = sigdir([f'{dis} içine girilebilen galvaniz salma kuş kafesi (kuşhane), {muh} muhabbet kuşuna kadar. Kaynaksız kurulum, tel dahil değildir.',
                 f'{dis} galvaniz salma kuş kafesi, kapılı. Kaynaksız kurulum, tel pakete dahil değildir.'], 120, 158)
    return a, kisa, md

def konnektor(x, b):
    ad = x['ad']; no = say(ad, r'No:([\w-]+)')
    if '180' in ad: tur, gorev, kol = '180° profil ekleme konnektörü', 'iki profili aynı doğrultuda uç uca birleştirerek daha uzun bir hat elde etmenizi sağlar', 2
    elif '90' in ad: tur, gorev, kol = '90° dirsek profil konnektörü', 'iki profili dik açıyla birleştirerek köşe dönüşü oluşturur', 2
    else:
        kol = {'Üç': 3, 'Dört': 4, 'Beş': 5}[say(ad, r'(Üç|Dört|Beş) Kollu')]
        tur = f'{["", "", "", "üç", "dört", "beş"][kol]} kollu profil konnektörü'
        gorev = f'{kol} profili tek bir düğüm noktasında birleştirir'
    giris = (f'No:{no} {tur}, 30 × 30 × 1,2 mm galvaniz kutu profillerle kaynaksız montaj için üretilmiş bir bağlantı parçasıdır; {gorev}. '
             'Profil uçlarındaki kare deliklerden M6 civatayla bağlanır.')
    a = [p(giris),
         p('Kutu profil ve konnektörlerle raf, sera tezgâhı, gölgelik, kuş kafesi ya da fotoğraf çekim kabini gibi iskeletleri kendi ölçünüze göre, kaynak yapmadan kurabilirsiniz. '
           'Mağazamızdaki galvaniz kutu profiller bu konnektörlerle tam uyumludur.'),
         h2('Teknik Bilgiler'), ul([f'Parça numarası: No:{no}' + (f' ({x["sku"]})' if x.get('sku') else ''), f'Bağlantı: {kol} profil',
                                    'Uyumlu profil: 30 × 30 mm kutu profil, 1,2 mm et kalınlığı', 'Bağlantı elemanı: M6 dibi dört köşe civata (delikli profillerle)']),
         h2('Sipariş Öncesi Kontrol'), ul(['Profilinizin 30 × 30 × 1,2 mm ölçüsünde olduğunu kontrol edin',
                                           'Kol yönlerini görsellerden karşılaştırın; aynı kol sayısındaki konnektörler farklı açılarda ve yönlerde olabilir',
                                           f'Parça numarasını (No:{no}) kurulum kılavuzunuzdaki numarayla eşleştirin']),
         sss([('Bu konnektör hangi profillerle uyumludur?', '30 × 30 mm ölçüsünde, 1,2 mm et kalınlığındaki kutu profillerle uyumludur. Delikli galvaniz profillerimizle doğrudan kullanılır.'),
              ('Kaynak gerekir mi?', 'Hayır. Profiller konnektöre civatayla bağlanır; kaynak, kesim ya da delme gerekmez.'),
              ('Hangi numarayı almam gerektiğini nasıl anlarım?', f'Kol sayısına ve kolların yönüne bakın; görsellerdeki parça şekliyle projenizdeki birleşim noktasını karşılaştırın. {DANIS}')])]
    kisa = f'Profil Konnektörü No:{no} {"180° Ekleme" if "180" in ad else ("90° Dirsek" if "90" in ad else str(kol) + " Kollu")} 30x30'
    md = sigdir([f'30x30x1,2 mm kutu profiller için No:{no} {tur}; {gorev}. Kaynaksız modüler raf, gölgelik ve kafes projeleri için.',
                 f'30x30 mm kutu profiller için No:{no} {tur}. Kaynaksız, civatalı modüler iskelet projeleri için bağlantı parçası.'], 120, 158)
    return a, kisa, md

def profil(x, b):
    boy = say(x['ad'], r'(\d+) Cm')
    giris = (f'{boy} cm boyunda, 30 × 30 mm kesitli ve 1,2 mm et kalınlığında galvaniz kaplı kutu profil. Modüler raf, tezgâh, gölgelik ve kafes gibi kaynaksız yapı projelerinde '
             'eksik parçayı tamamlamak, iskeleti genişletmek ya da kendi tasarımınızı kurmak için kullanılır.')
    a = [p(giris),
         h2('Delikli mi, Deliksiz mi?'),
         ul(['Delikli: profilin iki ucunda 4+4 adet kare delik bulunur. Delikler M6 dibi dört köşe civata ile konnektör sistemine tam oturacak şekilde işlenmiştir',
             'Deliksiz: delikleri kendiniz açacağınız ya da farklı bir bağlantı yöntemi kullanacağınız projeler içindir']),
         h2('Teknik Bilgiler'), ul([f'Boy: {boy} cm', 'Kesit: 30 × 30 mm kutu profil', 'Et kalınlığı: 1,2 mm', 'Yüzey: galvaniz kaplama',
                                    'Seçenek: delikli ya da deliksiz (fiyat aynı)']),
         p('Mağazamızdaki profil konnektörleri delikli profillerle birlikte kullanılarak kaynak yapmadan sağlam bir iskelet kurulur.'),
         sss([('Delikli profil hangi konnektörlerle uyumlu?', 'Delikli profiller 30 × 30 × 1,2 mm kutu profil için üretilen konnektörlerle M6 dibi dört köşe civata kullanılarak birleşir.'),
              ('Farklı boylar var mı?', '10 cm’den 150 cm’ye kadar 10 cm aralıklarla 15 farklı boy bulunur.'),
              ('Profil paslanır mı?', 'Galvaniz kaplama profili korozyona karşı korur; açık havada ve nemli ortamda kullanılabilir.')]),
         p(DANIS)]
    kisa = f'Galvaniz Kutu Profil 30x30x1,2 mm {boy} cm'
    md = sigdir([f'{boy} cm galvaniz kutu profil, 30x30 mm kesit ve 1,2 mm et kalınlığı. Delikli ya da deliksiz seçenekli, kaynaksız modüler yapılar için.',
                 f'{boy} cm galvaniz kutu profil 30x30x1,2 mm. Delikli ya da deliksiz, kaynaksız modüler iskelet projeleri için.'], 120, 158)
    return a, kisa, md

AILE = {'Odunluklar': odunluk, 'araç gölgelikleri': golgelik, 'Kovan Sehpası': kovan, 'Masa ve Tezgah İskeletleri': masa,
        'Çöp Konteyneri Muhafazaları': cop, 'Raflar': raf, 'Evcil Hayvan Balkon Kafesi': kedi, 'Klima ve Kompresör Kafesleri': klima,
        'Konteyner İskeletleri': konteyner, 'Kurutma Tezgâhları': kurutma, 'Salma Kuş Kafesleri': kus, 'Konnektörler': konnektor,
        'Galvaniz Kutu Profiller': profil}

def urun_adi(x):
    ad = temiz_ad(x['ad'])
    if 'Galvaniz Profil' in ad and ad.startswith('30 x 30'):
        boy = say(ad, r'(\d+) Cm')
        return f'Galvaniz Kutu Profil 30x30x1,2 mm – {boy} cm'
    if ad.startswith('Konteyner İskeleti'): ad = 'Galvaniz ' + ad
    return ad

def main():
    d = json.load(open(KAYNAK, encoding='utf-8'))
    urunler, atlanan, kats = [], [], []
    for x in d['urunler']:
        if (x.get('sku') or '').upper() in MEVCUT: atlanan.append(urun_adi(x)); continue
        k0 = x['kategoriler'][0]
        a, kisa, md = AILE[k0](x, bolumler(x['aciklama']))
        ad = urun_adi(x); kat = KATEGORI[k0]
        if kat not in kats: kats.append(kat)
        u = {'kaynak': 'https://www.profimod.com/product-page/' + x['dosya'], 'sku': x.get('sku') or '', 'ad': ad,
             'kategoriler': [kat], 'fiyat': x['fiyat'], 'indirimli': x['indirimli'] if x['indirimli'] != x['fiyat'] else None,
             'gorseller': x['gorseller'], 'aciklama': ''.join(a),
             'metaData': {'slug': slugla(ad), 'pageTitle': baslik_meta(kisa), 'description': md}}
        if x['secenekler']:
            s = x['secenekler'][0]
            u['secenek'] = {'ad': s['ad'], 'degerler': [v[0] for v in s['degerler']], 'gorseller': s.get('gorseller', {})}
        if not u['sku'] and k0 == 'Galvaniz Kutu Profiller':
            boy = int(say(ad, r'– (\d+) cm'))
            u['sku'] = f'PM-PR-{boy:03d}'
        urunler.append(u)
    # denetim
    hata = []
    sluglar = [u['metaData']['slug'] for u in urunler]
    if len(set(sluglar)) != len(sluglar): hata.append('tekrarlanan slug')
    for u in urunler:
        t, m = u['metaData']['pageTitle'], u['metaData']['description']
        if not 30 <= len(t) <= 60: hata.append(f'başlık {len(t)}: {t}')
        if not 120 <= len(m) <= 158: hata.append(f'açıklama {len(m)}: {m}')
        if re.search(r'usta|uzman|bize yazın', u['aciklama'], re.I): hata.append('yasak ifade: ' + u['ad'])
        if not u['gorseller']: hata.append('görsel yok: ' + u['ad'])
    import os; os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
    json.dump({'site': SITE, 'ust_kategori': UST, 'kategoriler': [{'name': k, 'slug': KAT_SLUG[k]} for k in kats],
               'atlanan_mevcut': atlanan, 'urunler': urunler}, open(CIKTI, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(urunler)} ürün, {len(kats)} kategori, atlanan (mevcut) {len(atlanan)} → {CIKTI}')
    for h in hata: print('HATA', h)
    sys.exit(1 if hata else 0)

main()
