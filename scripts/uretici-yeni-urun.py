# Üretici sitelerinde olup mağazada olmayan ürünler için iki mağazaya (HasTürk Gübre, Tarım Dünyası) ürün dosyası üretir.
# Kaynak: veri/uretici-yeni/kaynak.json (ürün sayfalarındaki ölçü, paket, fiyat, seçenek ve görseller; 6 Kasım 2026).
# Ad, fiyat, görsel ve sayısal bilgiler kaynakla aynı; açıklama ve meta iki mağaza için ayrı ve özgün yazılır.
# Üretici adı hiçbir metinde geçmez; üretici adı yazılı görseller alınmaz.
# Çıktı: veri/yeni-urunler/cikti/uretici-hasturk.json, uretici-tarim.json  (scripts/ikas-urun-ekle.mjs ile eklenir)
# Kullanım: python3 scripts/uretici-yeni-urun.py
import json, re, html as H

KAYNAK = 'veri/uretici-yeni/kaynak.json'
TEL = '+90 553 727 2929'
MARKA = 'Bahçe Kulesi'

TR = str.maketrans('çğıöşüÇĞİÖŞÜâÂ', 'cgiosuCGIOSUaA')
def slugla(s):
    s = s.replace('İ', 'i').replace('I', 'ı').lower().translate(TR)
    s = s.replace('×', 'x').replace('²', '2').replace('°', '')
    s = re.sub(r'(\d),(\d)', r'\1-\2', s)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return re.sub('-+', '-', s)

def esc(s): return H.escape(s, quote=False)
def p(t): return f'<p>{t}</p>'
def h2(t): return f'<h2>{t}</h2>'
def ul(items): return '<ul>' + ''.join(f'<li>{esc(i)}</li>' for i in items if i) + '</ul>'
def tablo(satirlar): return '<table><tbody>' + ''.join(f'<tr><th>{esc(a)}</th><td>{esc(b)}</td></tr>' for a, b in satirlar if b) + '</tbody></table>'
def sss(ciftler): return h2('Sık Sorulan Sorular') + ''.join(f'<h3>{s}</h3><p>{c}</p>' for s, c in ciftler)
def danis(site):
    return p(f'Ölçü ya da uygunluk konusunda emin olamazsanız siparişten önce müşteri hizmetlerimize ({TEL}) danışabilirsiniz.' if site == 'hasturk'
             else f'Hangi modelin size uygun olduğundan emin değilseniz müşteri hizmetlerimiz ({TEL}) yardımcı olur.')

def say(t, desen, v=None):
    m = re.search(desen, t or '')
    return m.group(1).strip() if m else v

def bolum(t, bas, sonlar):
    a = t.find('\n' + bas + '\n')
    if a < 0: return []
    t2 = t[a + len(bas) + 2:]
    b = min([i for i in (t2.find('\n' + s + '\n') for s in sonlar) if i >= 0] or [len(t2)])
    return [x.strip() for x in t2[:b].split('\n') if x.strip()]

def sigdir(adaylar, en, boy):
    for a in adaylar:
        if en <= len(a) <= boy: return a
    a = adaylar[-1]
    if len(a) > boy: a = a[:boy - 1].rsplit(' ', 1)[0].rstrip(',;:–-') + '.'
    return a

def meta(kisa, site):
    son = ' | HasTürk Gübre' if site == 'hasturk' else ' | Tarım Dünyası'
    kis = ' | HasTürk' if site == 'hasturk' else ' | Tarım Dünyası'
    return sigdir([kisa + son, kisa + kis, kisa], 30, 60)

def aciklama_meta(adaylar): return sigdir(adaylar, 110, 160)

def paket_temiz(liste):
    return [x for x in liste if 'kılavuz' not in x.lower() or True]

# Mağazadaki ilgili ürünler (iç bağlantılar)
YATAK = {  # ölçü → (ad, adres)
    '60x60': ('60×60 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-108-litre'),
    '85x60': ('85×60 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-153-litre'),
    '85x85': ('85×85 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-217-litre'),
    '110x60': ('110×60 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-198-litre'),
    '110x85': ('110×85 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-281-litre'),
    '110x110': ('110×110 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-363-litre'),
    '140x85': ('140×85 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-357-litre'),
    '165x85': ('165×85 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-421-litre'),
    '140x110': ('140×110 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-462-litre'),
    '165x110': ('165×110 cm yatak', 'moduler-yukseltilmis-bahce-yatagi-545-litre'),
    '110x35': ('110×35 cm çiçeklik', 'bahce-yatagi-ciceklik-no-2v2-110x35x30-cm'),
    '140x35': ('140×35 cm çiçeklik', 'bahce-yatagi-ciceklik-140x35x30cm-140-litre'),
}
def link(ad, slug): return f'<a href="/{slug}">{esc(ad)}</a>'
def uzun_slug(no, a, b): return f'moduler-yukseltilmis-bahce-yatagi-uzun-seri-no-{no}-{a}x{b}'

# Bitki destek ünitesi ve kemer: kaynak seçenek adları ("85 cm - No:3 ile uyumlu") mağazada yatak ölçüsüyle yazılır
NO_OLCU = {'1': '60x60', '2': '85x60', '3': '85x85', '4': '110x60', '5': '110x85', '6': '110x110', '7': '140x85', '8': '165x85', '9': '140x110', '10': '165x110',
           '2v2': '110x35', '3v2': '140x35', '30': '190x34', '34': '190x60', '38': '190x85'}
def olcu_ad(o):
    a, b = o.split('x'); return f'{a}×{b}'

# ------------------------------------------------------------------ aileler
def kopek(k, site):
    t = k['metin']; gez = 'Gezinmeli' in k['ad_kaynak']
    dis = say(t, r'Genişlik × uzunluk: ([^\n]+)'); alan = say(t, r'Taban alanı: ([^\n]+)')
    sacak, mahya = re.search(r'Saçak / mahya: ([\d,]+ m) / ([\d,]+ m)', t).groups()
    gezinme = say(t, r'Gezinme alanı: ([^\n]+)')
    adet, kg = re.search(r'(\d+) adet galvaniz profil, profil ağırlığı (\d+) kg', t).groups()
    paket = bolum(t, 'Paket içeriği', ['Köpek kulübesi ölçüleri', 'Kargo ve ödeme'])
    tamam = bolum(t, 'Kulübe nasıl tamamlanır?', ['Paket içeriği'])
    gez_m = say(gezinme or '', r'^([\d,]+ m)')
    ad = (f'Galvaniz Gezinmeli Köpek Kulübesi İskeleti {dis}, Raflı Kulübe ve Tel Alan' if gez else f'Galvaniz Köpek Kulübesi İskeleti {dis}, Yerden Raflı')
    kisa = f'{"Gezinmeli " if gez else ""}Köpek Kulübesi İskeleti {dis}'
    if site == 'hasturk':
        g = (f'{dis} ölçüsünde galvaniz profil köpek kulübesi iskeleti. 1,05 × 1,05 m kulübe bölümünde zeminden 30 cm yüksekte bir yatak rafı vardır; '
             f'köpeğiniz soğuk ve nemli zeminden uzakta yatar.' + (f' Kulübenin önünde {gez_m} uzunluğunda, 1,50 m yüksekliğinde gezinme alanı bulunur; tel ile çevrildiğinde köpek zincire bağlanmadan dolaşır.' if gez else ' İleride önüne gezinme bölümü eklenerek büyütülebilir.'))
    else:
        g = (f'Köpeğiniz için yerden yüksek, kuru bir yatak ve {"önünde tel çevrili bir gezinme alanı" if gez else "beşik çatılı bir kulübe"}: {dis} galvaniz iskelet, '
             f'kulübe bölümü 1,05 × 1,05 m, yatak rafı zeminden 30 cm yukarıda.' + (f' Gezinme bölümü {gez_m} uzunluğunda ve 1,50 m yüksekliğindedir; üstü açıktır.' if gez else ''))
    dahil_degil = 'Tel kafes, kulübe duvar kaplaması, raf tablası, çatı örtüsü ve zemin sabitleme malzemesi pakete dahil değildir; kutudan galvaniz iskelet, menteşeli kapı kanadı ve bağlantı parçaları çıkar.'
    oz = ['Yatak rafı zeminden 30 cm yukarıda: soğuk ve nemden uzak', 'Beşik çatı iskeleti: kiremit, shingle ya da trapez sac örtüye uygun',
          'Ön yüzde kelebek menteşeli kapı; temizlik için tamamen açılır', 'Galvaniz kaplı 30 × 30 × 1,2 mm kutu profil, civatalı kaynaksız kurulum']
    if gez: oz.insert(1, f'Kulübenin önünde {gez_m} uzunluğunda, 1,50 m yüksekliğinde gezinme alanı; tel ile çevrilince zincir ya da tasma gerekmez')
    else: oz.append('İleride gezinme bölümü eklenerek büyütülebilir')
    olc = [('Dış ölçü (genişlik × uzunluk)', dis), ('Taban alanı', alan), ('Kulübe bölümü', '1,05 × 1,05 m, raf 30 cm yükseklikte'),
           ('Gezinme alanı', gezinme), ('Saçak yüksekliği', sacak), ('Mahya yüksekliği', mahya), ('Profil', f'{adet} adet galvaniz profil, toplam {kg} kg')]
    s = [('Kulübenin duvarları ve çatısı pakette mi?', 'Hayır. Pakette galvaniz iskelet, kapı kanadı ve bağlantı parçaları vardır. Duvarlar ahşap, OSB ya da sandviç panelle, çatı kiremit, shingle ya da trapez sacla kaplanır.'),
         ('Kurulum için kaynak gerekir mi?', 'Gerekmez. Profiller konnektörlere civata ve somunla bağlanır; kurulum anahtarı ve resimli kılavuz kutudan çıkar.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Pakete dahil olmayanlar:</strong> ' + dahil_degil), h2('Öne Çıkan Özellikler'), ul(oz), h2('Ölçüler'), tablo(olc),
             h2('Kulübe Nasıl Tamamlanır?'), ul(tamam), h2('Paket İçeriği'), ul(paket), sss(s), danis(site)]
    else:
        a = [p(g), h2('Teknik Bilgiler'), tablo(olc), h2('Neden Bu Kulübe?'), ul(oz), h2('Kutudan Çıkanlar'), ul(paket),
             p('<strong>Not:</strong> ' + dahil_degil), h2('Kurulumdan Sonra Yapılacaklar'), ul(tamam), sss(s[::-1]), danis(site)]
    md = aciklama_meta([f'{dis} galvaniz köpek kulübesi iskeleti: 30 cm yüksek yatak rafı, beşik çatı, menteşeli kapı{", tel çevrili gezinme alanı" if gez else ""}. Kaynaksız kurulum.',
                        f'{dis} galvaniz köpek kulübesi iskeleti, yerden 30 cm raf ve menteşeli kapı.'])
    if site == 'tarim':
        md = aciklama_meta([f'Yerden yüksek raflı{", gezinme alanlı" if gez else ""} galvaniz köpek kulübesi: {dis}, beşik çatı iskeleti, kapı kanadı dahil, kaynak gerektirmez.', md])
    return dict(ad=ad, kategori='Köpek Kulübeleri', kisa=kisa, aciklama=''.join(a), md=md)

def mentese(k, site):
    if 'Menteşe' in k['ad_kaynak']:
        ad = 'Yaprak Menteşe, 6 Vidalı – Galvaniz Yapı Kapı ve Pencere Kanatları İçin'
        kisa = 'Yaprak Menteşe 6 Vidalı'
        g = ('Sarı çinko kaplı yaprak (kelebek) menteşe; 6 adet vidası pakettedir. Galvaniz profil kümes, sera, kulübe ve kafeslerdeki kapı ve pencere kanatlarını taşır; '
             'yıpranan menteşeyi değiştirmek ya da yapıya yeni bir kanat eklemek için kullanılır.')
        if site == 'tarim': g = ('Kümes, sera ya da kafes kapınızın menteşesi mi yıprandı? Bu yaprak menteşe 6 vidasıyla birlikte gelir; her kanadında 3 vida deliği vardır. Sarı çinko kaplama paslanmaya karşı korur.')
        bil = [('Paket', '1 adet menteşe, 6 adet vida'), ('Kaplama', 'Sarı çinko'), ('Vida deliği', '6 (her kanatta 3)')]
        kul = ['Kümes ve sera kapıları', 'Üretim kümesi çatı pencereleri', 'Galvaniz profil kulübe, kafes ve diğer yapılardaki kanatlar']
        md = aciklama_meta(['Galvaniz profil kümes, sera ve kafes kapıları için sarı çinko kaplı yaprak menteşe; 6 vidası pakette. Fiyat 1 menteşe içindir.'])
        if site == 'tarim': md = aciklama_meta(['Kümes, sera ve kafes kapı kanatları için yedek yaprak menteşe. Sarı çinko kaplama, 6 vida dahil, her kanatta 3 delik.'])
        s = [('Fiyat kaç menteşe için?', 'Fiyat 1 menteşe ve 6 vida içindir; ihtiyacınız kadar adet seçebilirsiniz.')]
    else:
        ad = 'M6 × 35 Bombe Başlı Civata ve Flanşlı Somun Seti – Galvaniz Profil Bağlantısı'
        kisa = 'M6 × 35 Civata ve Flanşlı Somun'
        g = ('30 × 30 mm galvaniz kutu profil ve konnektörleri birbirine bağlayan standart bağlantı seti: 1 adet M6 × 35 mm bombe başlı, kare boyunlu civata ve 1 adet M6 flanşlı somun. '
             'Kare boyun sıkarken civatanın dönmesini engeller, tek anahtarla sıkarsınız; flanşlı somun ayrıca pul gerektirmez.')
        if site == 'tarim': g = ('Kaybolan ya da eksik civataları tamamlamak veya profil yapınıza ek bağlantı yapmak için: M6 × 35 mm bombe başlı kare boyunlu civata ve tırtıllı flanşlı somun. Somun 10 mm anahtarla sıkılır.')
        bil = [('Civata', 'M6 × 35 mm, bombe başlı, kare boyunlu (DIN 603)'), ('Somun', 'M6 flanşlı, tırtıllı altıgen (DIN 6923)'), ('Diş', 'Metrik M6, adım 1,0 mm'),
               ('Baş / boyun', 'Ø 16 mm bombe baş, 6 × 6 mm kare boyun'), ('Kaplama', 'Çinko'), ('Anahtar', '10 mm')]
        kul = ['Galvaniz profil sera, kümes, raf ve kafeslerin bağlantıları', '30 × 30 mm kutu profille kurulan bütün yapılar', 'Kayıp ya da eksik civataların tamamlanması']
        md = aciklama_meta(['30×30 mm galvaniz profil ve konnektörler için M6 × 35 bombe başlı kare boyunlu civata ve flanşlı somun. Fiyat 1 set içindir.'])
        if site == 'tarim': md = aciklama_meta(['Profil yapılar için yedek bağlantı: M6×35 kare boyunlu bombe başlı civata + tırtıllı flanşlı somun, çinko kaplı, 10 mm anahtarla sıkılır.'])
        s = [('Fiyat kaç adet için?', 'Fiyat 1 set (1 civata ve 1 somun) içindir; ihtiyacınız kadar adet seçebilirsiniz.')]
    if site == 'hasturk': a = [p(g), h2('Teknik Bilgiler'), tablo(bil), h2('Nerelerde Kullanılır?'), ul(kul), sss(s), danis(site)]
    else: a = [p(g), h2('Kullanım Alanları'), ul(kul), h2('Özellikler'), tablo(bil), sss(s), danis(site)]
    return dict(ad=ad, kategori='Yedek Parça ve Bağlantı Elemanları', kisa=kisa, aciklama=''.join(a), md=md, gorsel_sinir=2)

def uretim_kumesi(k, site):
    t = k['metin']
    dis = say(t, r'Genişlik × uzunluk: ([\d,]+ × [\d,]+ m)'); bolum_s = say(t, r'Genişlik × uzunluk: [^\n]*\((\d+) bölüm\)')
    alan = say(t, r'Taban alanı: ([^\n]+)'); sacak, mahya = re.search(r'Saçak / mahya: ([\d,]+ m) / ([\d,]+ m)', t).groups()
    kap = say(t, r'Kapasite: (\d+) tavuk'); adet, kg = re.search(r'(\d+) adet galvaniz profil, profil ağırlığı (\d+) kg', t).groups()
    pencere = say(t, r'toplam (\d+) menteşeli çatı penceresi')
    yum = say(t, r'Yumurta: ([^\n]+)'); et = say(t, r'Yıllık et \(karkas\): ([^\n]+)')
    paket = bolum(t, 'Paket içeriği', ['Üretim kümesi ölçüleri', 'Kargo ve ödeme'])
    ad = f'Galvaniz Üretim Kümesi İskeleti {dis}, {kap} Tavuk – Ön ve Arka Kapılı'
    kisa = f'Üretim Kümesi İskeleti {dis} {kap} Tavuk'
    if site == 'hasturk':
        g = (f'Yumurta ve et üretimi yapan işletmeler için {dis} ölçüsünde, {alan} tabanlı galvaniz kümes iskeleti; {kap} tavuğa kadar uygundur (m²ye 3 tavuk). '
             f'Saçak {sacak}, mahya {mahya} yüksekliğindedir. İki uçta menteşeli kapı ve her bölümde çatı penceresi standarttır.')
    else:
        g = (f'{kap} tavukluk ticari kümes kurmak için {dis} galvaniz iskelet: {bolum_s} bölüm, {pencere} çatı penceresi, iki uçta yaklaşık 1,0 × 2,0 m kapı. '
             f'Taban alanı {alan}, mahya yüksekliği {mahya}; el arabasıyla bir kapıdan girip öbüründen çıkarsınız.')
    oz = ['İki uçta menteşeli kapı (yaklaşık 1,0 × 2,0 m): el arabasıyla girip çıkılır, gübre çıkarmak kolaylaşır',
          'İki kapı açıkken boydan boya hava akımı', f'{bolum_s} bölümde toplam {pencere} menteşeli çatı penceresi: sıcak ve nemli hava çatıdan çıkar, amonyak kokusu azalır',
          'Galvaniz kaplı 30 × 30 × 1,2 mm kutu profil, civatalı kaynaksız kurulum']
    olc = [('Dış ölçü', f'{dis} ({bolum_s} bölüm)'), ('Taban alanı', alan), ('Saçak / mahya', f'{sacak} / {mahya}'), ('Kapasite', f'{kap} tavuk (m²ye 3 tavuk)'),
           ('Çatı penceresi', f'{pencere} adet, menteşeli'), ('Profil', f'{adet} adet galvaniz profil, toplam {kg} kg')]
    uret = [f'Yumurta: {yum}' if yum else None, f'Yıllık et (karkas): {et}' if et else None,
            'Hesap tavuk başına günde yaklaşık 0,7 yumurta ve yıl sonunda kuş başına yaklaşık 1,5 kg karkas varsayımıyla yapılmıştır; ırk, mevsim ve beslenmeye göre değişir.']
    dd = 'Tel kafes, çatı örtüsü ya da brandası, pencere kanadı örtüsü, zemin malzemesi, yemlik, suluk ve hayvanlar pakete dahil değildir; kutudan galvaniz iskelet, iki kapı kanadı ve pencere kanatları çıkar.'
    s = [('Kaç tavuk sığar?', f'Bu ölçüde {kap} tavuk önerilir; hesap metrekareye 3 tavuktur.'), ('Çatı örtüsü pakette mi?', 'Hayır. Çatıya branda, trapez sac ya da kümes örtüsü, yanlara tel kafes ayrıca alınır.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Pakete dahil olmayanlar:</strong> ' + dd), h2('Öne Çıkan Özellikler'), ul(oz), h2('Ölçüler ve Kapasite'), tablo(olc),
             h2(f'Tahmini Üretim ({kap} Tavukla)'), ul(uret), h2('Paket İçeriği'), ul(paket), sss(s), danis(site)]
    else:
        a = [p(g), h2('Teknik Bilgiler'), tablo(olc), h2('Kapılar ve Havalandırma'), ul(oz), h2('Ne Kadar Üretim Beklenir?'), ul(uret),
             h2('Kutudan Çıkanlar'), ul(paket), p('<strong>Not:</strong> ' + dd), sss(s), danis(site)]
    alan = alan.split(' (')[0]
    md = aciklama_meta([f'{dis} galvaniz üretim kümesi iskeleti, {kap} tavuk kapasite. Ön ve arka kapı, {pencere} çatı penceresi, {mahya} mahya. Kaynaksız civatalı kurulum.'])
    if site == 'tarim': md = aciklama_meta([f'{kap} tavukluk ticari kümes iskeleti: {dis}, {alan} taban, iki uçta kapı ve {pencere} çatı penceresi. Galvaniz profil, kaynak gerekmez.'])
    return dict(ad=ad, kategori='Kümes İskeletleri', kisa=kisa, aciklama=''.join(a), md=md)

def hareketli_kumes(k, site):
    t = k['metin']
    dis = say(t, r'Genişlik × uzunluk: ([\d,]+ × [\d,]+ m)'); alan = say(t, r'Taban alanı: ([^\n]+)')
    sacak, mahya = re.search(r'Saçak / mahya: ([\d,]+ m) / ([\d,]+ m)', t).groups()
    kap = say(t, r'Kapasite: (\d+) tavuk'); kapi = say(t, r'Kapı: [^\n]*?([\d,]+ × [\d,]+ m)')
    adet, kg = re.search(r'(\d+) adet galvaniz profil, profil ağırlığı (\d+) kg', t).groups()
    yum = re.search(r'(Günlük ≈[^\n]+)', t).group(1)
    paket = bolum(t, 'Paket içeriği', ['Hareketli kümes ölçüleri', 'Kargo ve ödeme'])
    ad = f'Galvaniz Hareketli Tavuk Kümesi İskeleti {dis}, {kap} Tavuk – Çekilebilir, Tabansız'
    kisa = f'Hareketli Tavuk Kümesi {dis} {kap} Tavuk'
    if site == 'hasturk':
        g = (f'Çimin üstüne kurulan, tabansız ve hafif galvaniz kümes iskeleti. {dis} ölçüsünde ({alan.split(" (")[0]} taban), {kap} tavuğa kadar uygundur. '
             'Kümesi 1–2 günde bir boyu kadar ileri çektiğinizde tavuklar taze çimde otlar, böcek arar; geride kalan alan gübrelenmiş olur ve kısa sürede yeniden yeşerir.')
    else:
        g = (f'Tavuklarınız her gün yeni bir çim parçasında otlasın: {dis} tabansız hareketli kümes iskeleti iki kişiyle bir boy ileri çekilir. '
             f'{kap} tavuğa göre tasarlanmıştır; ön alında tavana kadar uzanan {kapi} menteşeli kapıdan eğilmeden girersiniz.')
    oz = ['Tabansız ve tekerleksiz: zemine tam oturur, alttan kaçış boşluğu kalmaz', 'Hafif iskelet: iki kişi rahatça çekip yerini değiştirir',
          f'Tavana kadar uzanan {kapi} menteşeli kapı', 'Bozulacak ya da paslanacak tekerlek yok', 'Galvaniz kaplı 30 × 30 × 1,2 mm kutu profil, civatalı kaynaksız kurulum']
    nasil = ['Köşe sabitlemelerini (kazık ya da ağırlık) çıkarın', 'Kümesi bir boy ileri çekin', 'Yeniden sabitleyin; işlemi 1–2 günde bir tekrarlayın']
    olc = [('Dış ölçü', dis), ('Taban alanı', alan), ('Saçak / mahya', f'{sacak} / {mahya}'), ('Kapasite', f'{kap} tavuk (m²ye 3 tavuk)'), ('Kapı', f'{kapi}, tavana kadar, menteşeli'),
           ('Profil', f'{adet} adet galvaniz profil, toplam {kg} kg'), ('Tahmini yumurta', yum)]
    dd = 'Tel kafes, çatı örtüsü ya da brandası, zemin sabitleme malzemesi, yemlik, suluk ve hayvanlar pakete dahil değildir; kutudan galvaniz iskelet ve kapı kanadı çıkar.'
    s = [('Neden tekerleği yok?', 'Tekerleksiz kümes zemine tam oturur, alttan tavuk kaçmaz; daha hafif ve ekonomiktir. İki kişi kolayca çekebilir.'),
         ('Tahmini yumurta nasıl hesaplandı?', 'Tavuk başına günde yaklaşık 0,7 yumurta varsayılmıştır; ırk, mevsim ve beslenmeye göre değişir.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Pakete dahil olmayanlar:</strong> ' + dd), h2('Öne Çıkan Özellikler'), ul(oz), h2('Nasıl Gezdirilir?'), ul(nasil),
             h2('Ölçüler ve Kapasite'), tablo(olc), h2('Paket İçeriği'), ul(paket), sss(s), danis(site)]
    else:
        a = [p(g), h2('Teknik Bilgiler'), tablo(olc), h2('Neden Hareketli Kümes?'), ul(oz), h2('Yer Değiştirme'), ul(nasil),
             h2('Kutudan Çıkanlar'), ul(paket), p('<strong>Not:</strong> ' + dd), sss(s[::-1]), danis(site)]
    md = aciklama_meta([f'{dis} çekilebilir, tabansız hareketli tavuk kümesi iskeleti; {kap} tavuk, tavana kadar kapı. Galvaniz profil, kaynaksız kurulum.'])
    if site == 'tarim': md = aciklama_meta([f'Tavuklar her gün taze çimde: {dis} hareketli kümes iskeleti, {kap} tavuk kapasite, iki kişiyle çekilir. Galvaniz, kaynak gerekmez.'])
    return dict(ad=ad, kategori='Kümes İskeletleri', kisa=kisa, aciklama=''.join(a), md=md)

SERI = {
    'Olimpos': ('hobi bahçe serası', 'Geniş bahçede raf, masa ve sebze yatağıyla hobi tarımı yapmak isteyenler için'),
    'Aspendos': ('villa ve ev bahçesi serası', 'Ev ya da villa bahçesine derli toplu bir sera kurmak isteyenler için'),
    'Pergamon': ('üretim serası', 'Tarlada uzun sıralar, geniş koridor ve yüksek mahyayla büyük ölçekli üretim için'),
    'Likya': ('kapısız tarla serası', 'Gölge filesi ya da brandayla örtülüp yalnızca ürün yetiştirmek için sade, kapısız model'),
}
def sera(k, site):
    t = k['metin']; seri = re.search(r'(Olimpos|Aspendos|Pergamon|Likya)', k['ad_kaynak']).group(1)
    dis = say(t, r'Genişlik × uzunluk: ([\d,]+ × [\d,]+ m)'); alan = say(t, r'Taban alanı: ([^\n]+)')
    sacak = say(t, r'Saçak yüksekliği: ([\d,]+ m)'); mahya = say(t, r'Mahya yüksekliği: ([\d,]+ m)')
    giris = say(t, r'Giriş: ([^\n]+)'); adet, kg = re.search(r'(\d+) adet galvaniz profil, profil ağırlığı (\d+) kg', t).groups()
    yap = bolum(t, 'Neler yapabilirsiniz?', ['Örtü seçenekleri (dahil değildir)'])
    ortu = bolum(t, 'Örtü seçenekleri (dahil değildir)', ['Paket içeriği'])
    paket = bolum(t, 'Paket içeriği', ['Kurulum', 'Sera ölçüleri', f'{seri} serisindeki ölçüler', 'Kargo ve ödeme'])
    kurulum = bolum(t, 'Kurulum', [f'{seri} serisindeki ölçüler', 'Kargo ve ödeme'])
    sabitle = next((x for x in kurulum if 'zemine sabitleyin' in x), None)
    paket = [x for x in paket if not re.match(r'^[✔]|^[\d,]+ × [\d,]+ m ·', x)]
    tur, kim = SERI[seri]
    ad = f'Galvaniz Modüler Sera İskeleti {seri} {dis} ({alan}) – {tur[0].upper() + tur[1:]}'
    kisa = f'{seri} Sera İskeleti {dis}'
    kapisiz = 'Kapısız' in (giris or '')
    if site == 'hasturk':
        g = (f'{seri} serisi {tur}: {dis} ölçüsünde, {alan} tabanlı galvaniz sera iskeleti. Saçak yüksekliği {sacak}, mahya {mahya}. {kim}. '
             '30 × 30 × 1,2 mm galvaniz kutu profiller cam elyaf takviyeli konnektörlerle civatayla birleşir; kaynak gerekmez, sökülüp taşınabilir.')
    else:
        g = (f'{kim}: {seri} serisinden {dis} sera iskeleti. {alan} ekim alanı, {mahya} mahya yüksekliği' + (', iki ucu açık kapısız gövde.' if kapisiz else f', giriş: {giris.lower()}.') +
             ' Örtüyü ihtiyacınıza göre siz seçersiniz: naylon, polikarbon, gölge filesi ya da branda.')
    olc = [('Dış ölçü (genişlik × uzunluk)', dis), ('Taban alanı', alan), ('Saçak yüksekliği', sacak), ('Mahya yüksekliği', mahya), ('Giriş', giris),
           ('Profil', f'{adet} adet galvaniz profil, toplam {kg} kg'), ('Bağlantı', 'Cam elyaf takviyeli konnektör, M6 civata')]
    dd = 'Örtü (sera naylonu, polikarbon, gölge filesi, branda), örtü bağlantı klipsleri, zemin, sulama ve bitkiler pakete dahil değildir; kutudan ' + ('yalnızca galvaniz iskelet çıkar.' if kapisiz else 'galvaniz iskelet ve kapı kanadı çıkar.')
    if sabitle: dd += ' Serayı düz bir zemine kurun ve rüzgâra karşı zemine sabitleyin; sabitleme malzemesi ayrıca alınır.'
    s = [('Sera örtüsü pakette mi?', 'Hayır. İskelete sera naylonu, polikarbon levha, gölge filesi ya da branda takılır. Naylon ve file profillere sera klipsi ya da kelepçeyle, polikarbon vidayla tutturulur.'),
         ('Kurulum için kaynak gerekir mi?', 'Gerekmez. Bütün bağlantılar civata ve somunla yapılır; kurulum anahtarı ve resimli kılavuz kutudan çıkar.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Pakete dahil olmayanlar:</strong> ' + dd), h2('Ölçüler'), tablo(olc), h2('Neler Yapabilirsiniz?'), ul(yap),
             h2('Örtü Seçenekleri (Ayrıca Alınır)'), ul(ortu), h2('Paket İçeriği'), ul(paket), sss(s), danis(site)]
    else:
        a = [p(g), h2('Bu Serada Neler Yetişir?'), ul(yap), h2('Teknik Bilgiler'), tablo(olc), h2('Hangi Örtüyü Seçmeli?'), ul(ortu),
             h2('Kutudan Çıkanlar'), ul(paket), p('<strong>Not:</strong> ' + dd), sss(s[::-1]), danis(site)]
    md = aciklama_meta([f'{seri} {dis} galvaniz sera iskeleti, {alan} taban, {mahya} mahya. {tur[0].upper() + tur[1:]}; kaynaksız, sökülüp taşınabilir. Örtü dahil değildir.'])
    if site == 'tarim': md = aciklama_meta([f'{tur[0].upper() + tur[1:]} için {seri} {dis} sera iskeleti: {alan}, mahya {mahya}, galvaniz profil, civatalı kurulum. Örtüyü siz seçersiniz.'])
    return dict(ad=ad, kategori='Sera İskeletleri', kisa=kisa, aciklama=''.join(a), md=md)

def sehpali(k, site):
    t = k['metin']; tek = 'Tekerlekli' in k['ad_kaynak']; golge = 'Gölgelikli' in k['ad_kaynak']
    ol = bolum(t, 'Ölçüler', ['Neden sehpalı sebze yatağı?'])
    pak = bolum(t, 'Pakette neler var?', ['Ölçüler'])
    pak = [x.replace(' (8 düz + 4 köşe parça, 48 civata-somun)', ': 8 düz ve 4 köşe parça, 48 civata-somun') for x in pak]
    top = say(t, r'Toplam yükseklik: ([^\n]+)'); seh = say(t, r'Sehpa yüksekliği: ([^\n]+)')
    on = ('Gölgelikli ve Tekerlekli ' if golge and tek else 'Gölgelikli ' if golge else 'Tekerlekli ' if tek else '')
    ad = f'{on}Sehpalı Balkon Sebze Yatağı 60×112 cm – Bel Hizasında Yükseltilmiş Yatak'
    kisa = f'{on}Sehpalı Sebze Yatağı 60×112'
    ek = []
    if tek: ek.append('6 frenli tekerlek sayesinde yatağı balkonda güneşe ya da gölgeye kaydırıp frenle sabitlersiniz')
    if golge: ek.append('yatağın 1,12 m üstündeki gölgelik çerçevesine yazın gölge filesi gererek fide ve yeşillikleri öğle güneşinden korursunuz')
    if site == 'hasturk':
        g = (f'Balkon ve terasta eğilmeden sebze yetiştirmek için 60 × 112 × 30 cm modüler sebze yatağı, galvaniz profil sehpanın üstünde bel hizasında durur. '
             f'Toplam yükseklik {top}.' + (' ' + '; '.join(ek)[0].upper() + '; '.join(ek)[1:] + '.' if ek else '') + ' Yatak altlığı süzülen suyu ve toprağı tutar, balkon zemini temiz kalır.')
    else:
        g = (f'Ekim, çapa ve hasat diz çökmeden, bel hizasında: {seh} yüksekliğindeki galvaniz sehpa ve üstündeki 60 × 112 cm, 30 cm derin sebze yatağıyla toplam yükseklik {top}.' +
             (' Bu modelde ' + ' ve '.join(ek) + '.' if ek else ' Balkon ve teras için en sade model.'))
    oz = ['Bel hizasında ekim ve hasat: diz ve bel yorulmaz', 'Yatak altlığı yataktan süzülen suyu ve toprağı tutar', 'Galvaniz 30 × 30 × 1,2 mm profil sehpa, civatalı kaynaksız kurulum',
          'Bej ve gri renk seçeneği']
    if tek: oz.insert(1, '6 frenli tekerlek: balkonda kolayca yer değiştirir, frenle sabitlenir')
    if golge: oz.insert(1, 'Gölgelik çerçevesi (61 × 115 cm): gölge filesi gerilir; gölgeliği yatak toprakla dolup oturduktan sonra takmanız önerilir')
    dd = ('Gölge filesi, toprak ve bitkiler ürüne dahil değildir.' if golge else 'Toprak ve bitkiler ürüne dahil değildir.')
    s = [('Kaç litre toprak gerekir?', '60 × 112 × 30 cm yatağın hacmi yaklaşık 200 litredir; sebze yetiştirmeye uygun, süzek bir toprak karışımı önerilir.'),
         ('Hangi bitkiler yetişir?', 'Marul, roka, maydanoz gibi yeşillikler; domates, biber, çilek ve fasulye gibi kökü 30 cm derinliğe sığan sebzeler.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Not:</strong> ' + dd), h2('Öne Çıkan Özellikler'), ul(oz), h2('Ölçüler'), ul(ol), h2('Paket İçeriği'), ul(pak), sss(s), danis(site)]
    else:
        a = [p(g), h2('Teknik Bilgiler'), ul(ol), h2('Neden Sehpalı Yatak?'), ul(oz), h2('Kutudan Çıkanlar'), ul(pak), p('<strong>Not:</strong> ' + dd), sss(s[::-1]), danis(site)]
    md = aciklama_meta([f'{on}sehpalı sebze yatağı 60×112×30 cm: galvaniz sehpa, yatak altlığı{", frenli tekerlek" if tek else ""}{", gölgelik çerçevesi" if golge else ""}. Toplam yükseklik {top}. Bej ve gri.'])
    if site == 'tarim': md = aciklama_meta([f'Balkonda bel hizasında bostan: {on.lower()}sehpalı 60×112 cm sebze yatağı, {top} toplam yükseklik, yatak altlığı dahil. Bej ya da gri renk.'])
    return dict(ad=ad, kategori='Bahçe Yatakları ve Kuleleri', kisa=kisa, aciklama=''.join(a), md=md)

def destek(k, site):
    t = k['metin']; gen = say(k['ad_kaynak'], r'(\d+) cm Genişlik')
    uy = [(say(v['deger'], r'^(\d+) cm'), say(v['deger'], r'No:(\w+)')) for v in k['varyant']]
    yat = [(u, NO_OLCU[n]) for u, n in uy]
    linkler = [link(f'{YATAK[o][0]}', YATAK[o][1]) + f' – {u} cm seçeneği' for u, o in yat]
    kutu = bolum(t, 'Kutu içeriği', ['Bu üniteyle uyumlu sebze yatakları'])
    kutu = [x for x in kutu if 'jüt veya pamuk' not in x]
    ad = f'Sebze Yatağı Bitki Destek Ünitesi – {gen} cm Genişlikteki Yataklar İçin'
    kisa = f'Bitki Destek Ünitesi {gen} cm Yatak'
    if site == 'hasturk':
        g = (f'{gen} cm genişlikteki modüler sebze yataklarının kısa kenarlarına takılan galvaniz bitki destek ünitesi. Yatağın üstünden 153 cm yükselen çerçeveye '
             'yaklaşık 20 cm arayla ip gerersiniz; domates, salatalık, fasulye ve bezelye ipe sarılarak yukarı büyür, yere yatmaz, meyveler topraktan uzakta olgunlaşır.')
    else:
        g = (f'Domates ve salatalığınız yere değil yukarı büyüsün: {gen} cm genişlikteki sebze yatağınıza takılan, 149,5 cm dikmeli galvaniz destek ünitesi. '
             'Yapraklar arasından hava geçer, ıslanan yaprak çabuk kurur; hasat göz ve bel hizasında olur.')
    secim = p('Ünite yatağın boyuna göre seçilir. Seçenekler ve uyumlu yataklar:') + '<ul>' + ''.join(f'<li>{x}</li>' for x in linkler) + '</ul>'
    oz = ['Dikey yetiştirme: aynı yatağa daha çok bitki sığar', 'Daha çok hava ve güneş: mantar hastalığı riski azalır', 'Meyveler topraktan uzakta: temiz ve kolay hasat',
          'Galvaniz profil ve plastik konnektörlerle sağlam, sade görünüm']
    kur = ['Yatağı kurun ve 4 adet profil yatak birleştirme aparatını kısa kenarlardaki civatalara takın', 'Yatağı toprakla doldurun ve oturmasını bekleyin',
           'Dikmeleri aparatlara oturtup üst çerçeveyi konnektörlerle tamamlayın; toprakla dolup oturan yatakta ünite daha sağlam durur']
    dd = 'Sebze yatağı, ip, toprak ve bitkiler ürüne dahil değildir. İp olarak sezon sonunda bitkiyle birlikte kompostlanabilen jüt ya da pamuk ip önerilir.'
    s = [('Hangi bitkiler için uygun?', 'Domates (çeri ve iri), salatalık, sırık fasulye, bezelye, küçük meyveli kabak ve kavun ile sarılıcı çiçekler.'),
         ('İpler hangi aralıkla gerilir?', 'Yaklaşık 20 cm aralık önerilir; her bitki kendi ipine sarılarak büyür.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Not:</strong> ' + dd), h2('Hangi Yatağa Uyumlu?'), secim, h2('Öne Çıkan Özellikler'), ul(oz), h2('Önerilen Kurulum Sırası'), ul(kur),
             h2('Kutu İçeriği'), ul(kutu), sss(s), danis(site)]
    else:
        a = [p(g), h2('Doğru Uzunluğu Seçin'), secim, h2('Kurulum'), ul(kur), h2('Kutudan Çıkanlar'), ul(kutu), h2('Neden Destek Ünitesi?'), ul(oz),
             p('<strong>Not:</strong> ' + dd), sss(s[::-1]), danis(site)]
    md = aciklama_meta([f'{gen} cm genişlikteki sebze yatakları için galvaniz bitki destek ünitesi; yataktan 153 cm yükseklik, ip gerilerek domates ve salatalık dikey büyür.'])
    if site == 'tarim': md = aciklama_meta([f'Domates, salatalık ve fasulyeyi yukarı büyütün: {gen} cm genişlikteki yataklara takılan galvaniz destek ünitesi, yatak boyuna göre seçenekli.'])
    degerler = [f'{u} cm – {olcu_ad(o)} cm yatak' for u, o in yat]
    return dict(ad=ad, kategori='Bahçe Yatakları ve Kuleleri', kisa=kisa, aciklama=''.join(a), md=md, degerler=degerler)

KEMER_UYUM = {'110': ['110x60', '110x85', '110x110', '110x35'], '140': ['140x85', '140x110', '140x35'], '165': ['165x85', '165x110'], '190': ['190x34', '190x60', '190x85']}
def kemer_destek(k, site):
    t = k['metin']
    kutu = bolum(t, 'Kutu içeriği', ['Bu kemerle uyumlu sebze yatakları', 'Bu üniteyle uyumlu sebze yatakları', 'Uyumlu sebze yatakları'])
    kutu = [x for x in kutu if 'jüt veya pamuk' not in x]
    boylar = [say(v['deger'], r'^(\d+) cm') for v in k['varyant']]
    def yatak_link(o):
        if o in YATAK: return link(YATAK[o][0], YATAK[o][1])
        a, b = o.split('x'); no = {'190x34': 30, '190x60': 34, '190x85': 38}[o]
        return link(f'{a}×{b} cm uzun yatak', uzun_slug(no, a, b))
    secim = '<ul>' + ''.join(f'<li>{b} cm ({"3" if b == "190" else "2"} kemer): ' + ', '.join(yatak_link(o) for o in KEMER_UYUM[b]) + '</li>' for b in boylar) + '</ul>'
    ad = 'Sebze Yatağı Kemer Tipi Bitki Destek Ünitesi – İki Yatak Arasına Yeşil Tünel'
    kisa = 'Kemer Tipi Bitki Destek Ünitesi'
    if site == 'hasturk':
        g = ('Yan yana duran iki modüler sebze yatağını yeşil bir tünele çeviren galvaniz kemer. Kemer, yatakların yola bakan uzun kenarlarına takılır ve aradaki 153 cm genişlikteki yolun üstünden geçer; '
             'saçak kuşaklarından toprağa gerdiğiniz iplere sarılan domates, salatalık ve fasulye kemeri kaplar, siz altından rahatça geçersiniz.')
    else:
        g = ('İki yatak, tek ünite, yolun üstü de ekim alanı: kemer tipi destek ünitesi iki sebze yatağının arasındaki yolu 2,02 m tepe yüksekliğinde bir tünele dönüştürür. '
             'Yatakların genişliği farklı olabilir (örneğin 85 cm ile 60 cm yan yana); boyları aynı olmalıdır.')
    ol = [('Geçiş genişliği', '153 cm (iki yatak arasındaki yol)'), ('Saçak / tepe yüksekliği', '156 cm / 202 cm (zeminden)'), ('Kemer aralığı', '78 cm'),
          ('Kemer dış genişliği', '159 cm'), ('Boy seçenekleri', ', '.join(f'{b} cm' for b in boylar)), ('Profil', '30 × 30 × 1,2 mm galvaniz')]
    kur = ['İki yatağı aralarında 153 cm geçiş kalacak şekilde paralel kurun; profil yatak birleştirme aparatlarını yola bakan uzun kenarlara takın',
           'Yatakları toprakla doldurun, yerine oturmasını bekleyin', 'Kemeri kurup dikmeleri aparatlara oturtun, ipleri gerin']
    dd = 'Ünite 2 adet sebze yatağıyla kullanılır. Sebze yatakları, ip, toprak ve bitkiler ürüne dahil değildir.'
    s = [('Farklı genişlikteki iki yatakla kullanılır mı?', 'Evet. İki yatağın boyu aynı olmalıdır; genişlikleri farklı olabilir.'),
         ('Kemerin altından geçilebilir mi?', 'Evet. Tepe yüksekliği zeminden 202 cm, geçiş genişliği 153 cm’dir.')]
    if site == 'hasturk':
        a = [p(g), p('<strong>Not:</strong> ' + dd), h2('Hangi Yataklara Uyumlu?'), secim, h2('Ölçüler'), tablo(ol), h2('Önerilen Kurulum Sırası'), ul(kur),
             h2('Kutu İçeriği'), ul(kutu), sss(s), danis(site)]
    else:
        a = [p(g), h2('Teknik Bilgiler'), tablo(ol), h2('Boy Seçimi ve Uyumlu Yataklar'), secim, h2('Kurulum'), ul(kur), h2('Kutudan Çıkanlar'), ul(kutu),
             p('<strong>Not:</strong> ' + dd), sss(s[::-1]), danis(site)]
    md = aciklama_meta(['İki sebze yatağı arasına galvaniz kemer tünel: 153 cm geçiş, 202 cm tepe yüksekliği. Domates, salatalık ve fasulye için; 110–190 cm boy seçenekleri.'])
    if site == 'tarim': md = aciklama_meta(['Yolun üstünü de ekin: iki yatağı birleştiren kemer tipi bitki destek ünitesi, 2,02 m tepe, altından geçilir. Yatak boyuna göre 4 seçenek.'])
    degerler = [f'{b} cm boy – {"3" if b == "190" else "2"} kemer' for b in boylar]
    return dict(ad=ad, kategori='Bahçe Yatakları ve Kuleleri', kisa=kisa, aciklama=''.join(a), md=md, degerler=degerler)

def uzun_yatak(k, site):
    t = k['metin']; no, a_, b_ = re.search(r'No:(\d+) \((\d+)x(\d+)\)', k['ad_kaynak']).groups()
    alan = say(t, r'Ekim alanı: ([^\n]+)'); toprak = say(t, r'Toprak ihtiyacı: (yaklaşık [\d.]+ litre)')
    kutu = bolum(t, 'Kutu İçeriği', ['Hemen sipariş verin, kendi taze ürünlerinizi yetiştirmenin keyfini çıkarın!', 'Bahçenizi tamamlayın'])
    ad = f'Modüler Yükseltilmiş Bahçe Yatağı Uzun Seri No:{no} - {a_}x{b_}x30 cm'
    kisa = f'Uzun Sebze Yatağı No:{no} {a_}x{b_} cm'
    dar = b_ == '34'
    yer = 'çit dibi, duvar kenarı, balkon ve teras kenarı gibi dar alanlar' if dar else ('bahçe yolu ve çit boyu' if b_ == '60' else 'bahçede uzun ekim sıraları')
    if site == 'hasturk':
        g = (f'{a_} cm uzunluğu ve {b_} cm genişliğiyle {yer} için uzun ve düzenli bir ekim alanı. Yüksekliği 30 cm, ekim alanı {alan}, '
             f'doldurmak için {toprak} toprak gerekir. Demonte olarak küçük bir kutuya sığar; uzatma setiyle her düz parça yatağa 26 cm ekler.')
    else:
        g = (f'Uzun Seri No:{no}: {a_} × {b_} cm, 30 cm yüksek modüler sebze yatağı. {alan[0].upper() + alan[1:]} ekim alanı sunar ve {toprak} toprak alır; '
             f'{yer} boyunca sıralı ekim yapmak isteyenler için uygundur.')
    oz = ['Hava koşullarına dayanıklı, sağlam plastik parçalar', 'Kutu içeriğinde civata, somun, gergi telleri ve montaj anahtarı; ek alet gerekmez',
          'Uzatma setiyle uyumlu: her düz parça yatağa 26 cm ekler', 'Bej ve gri renk seçeneği']
    ol = [('Uzunluk', f'{a_} cm'), ('Genişlik', f'{b_} cm'), ('Yükseklik', '30 cm'), ('Ekim alanı', alan), ('Toprak ihtiyacı', f'{toprak} (toprak dahil değildir)')]
    s = [('Toprak pakette mi?', f'Hayır. Yatağı doldurmak için {toprak} toprak gerekir.'), ('Yatağı sonradan uzatabilir miyim?', 'Evet. Uzatma setindeki her düz parça yatağın boyuna 26 cm ekler.')]
    if site == 'hasturk':
        a = [p(g), h2('Öne Çıkan Özellikler'), ul(oz), h2('Ölçüler'), tablo(ol), h2('Kutu İçeriği'), ul(kutu), sss(s), danis(site)]
    else:
        a = [p(g), h2('Teknik Bilgiler'), tablo(ol), h2('Kutudan Çıkanlar'), ul(kutu), h2('Özellikler'), ul(oz), sss(s[::-1]), danis(site)]
    md = aciklama_meta([f'Uzun seri modüler sebze yatağı No:{no}, {a_}×{b_}×30 cm, {alan} ekim alanı, {toprak} toprak. Bej ve gri; uzatma setiyle büyütülür.'])
    if site == 'tarim': md = aciklama_meta([f'{yer[0].upper() + yer[1:]} için {a_}×{b_} cm uzun sebze yatağı (No:{no}): 30 cm yükseklik, {alan} ekim alanı, bej ya da gri renk.'])
    return dict(ad=ad, kategori='Bahçe Yatakları ve Kuleleri', kisa=kisa, aciklama=''.join(a), md=md, slug=uzun_slug(no, a_, b_), tukendi=True)

def aile(k):
    n = k['ad_kaynak']
    if 'Köpek' in n: return kopek
    if 'Menteşe' in n or 'Civata' in n: return mentese
    if 'Üretim Kümesi' in n: return uretim_kumesi
    if 'Hareketli Kümes' in n: return hareketli_kumes
    if 'Sera ' in n and re.search('Olimpos|Aspendos|Pergamon|Likya', n): return sera
    if 'Sehpalı' in n: return sehpali
    if 'Kemer Tipi' in n: return kemer_destek
    if 'Bitki Destek' in n: return destek
    if 'Sebze Yatağı No:' in n: return uzun_yatak
    raise SystemExit('aile bulunamadı: ' + n)

KATEGORILER = {
    'hasturk': [
        {'name': 'Galvaniz Modüler Yapılar', 'slug': 'galvaniz-moduler-yapilar', 'children': [
            {'name': 'Sera İskeletleri', 'slug': 'sera-iskeleti'}, {'name': 'Kümes İskeletleri', 'slug': 'kumes-iskeleti'},
            {'name': 'Köpek Kulübeleri', 'slug': 'galvaniz-kopek-kulubesi', 'pageTitle': 'Galvaniz Köpek Kulübesi İskeleti | HasTürk Gübre',
             'description': 'Yerden 30 cm raflı, beşik çatılı galvaniz köpek kulübesi iskeletleri; 1,05 m kulübeden 4,13 m gezinme alanlı modellere. Kaynaksız civatalı kurulum.'},
            {'name': 'Yedek Parça ve Bağlantı Elemanları', 'slug': 'galvaniz-yapi-yedek-parca', 'pageTitle': 'Galvaniz Yapı Yedek Parça ve Civata | HasTürk',
             'description': 'Galvaniz profil sera, kümes, raf ve kafesler için yedek yaprak menteşe ile M6 × 35 bombe başlı civata ve flanşlı somun setleri.'}]},
        {'name': 'Saksılar ve Bahçe Yatakları', 'slug': 'saksilar-ve-bahce-yataklari', 'children': [{'name': 'Bahçe Yatakları ve Kuleleri', 'slug': 'bahce-yataklari-ve-kuleleri'}]},
    ],
    'tarim': [
        {'name': 'Galvaniz Modüler Yapılar', 'slug': 'galvaniz-moduler-yapilar', 'children': [
            {'name': 'Sera İskeletleri', 'slug': 'sera-iskeleti'}, {'name': 'Kümes İskeletleri', 'slug': 'kumes-iskeleti'},
            {'name': 'Köpek Kulübeleri', 'slug': 'galvaniz-kopek-kulubesi', 'pageTitle': 'Köpek Kulübesi İskeleti Modelleri | Tarım Dünyası',
             'description': 'Bahçe için galvaniz köpek kulübesi iskeletleri: yerden yüksek yatak rafı, menteşeli kapı, isteğe göre tel çevrili gezinme alanı. Kaynak gerekmez.'},
            {'name': 'Yedek Parça ve Bağlantı Elemanları', 'slug': 'galvaniz-yapi-yedek-parca', 'pageTitle': 'Profil Yapı Yedek Parçaları | Tarım Dünyası',
             'description': 'Kümes, sera ve kafes kapıları için yedek menteşe; 30×30 mm galvaniz profil bağlantıları için M6 civata ve flanşlı somun.'}]},
        {'name': 'Saksılar ve Bahçe Yatakları', 'slug': 'saksilar-ve-bahce-yataklari', 'children': [{'name': 'Bahçe Yatakları ve Kuleleri', 'slug': 'bahce-yataklari-ve-kuleleri'}]},
    ],
}

def uret(site):
    K = json.load(open(KAYNAK, encoding='utf8'))
    urunler = []
    for k in K:
        r = aile(k)(k, site)
        gor = k['gorseller'][:r.get('gorsel_sinir', 10)]
        u = {'kaynak': k['kaynak'], 'ad': r['ad'], 'kategoriler': [r['kategori']], 'marka': MARKA, 'fiyat': k['liste'],
             'indirimli': k['satis'] if k['satis'] and k['satis'] < k['liste'] else None, 'gorseller': gor, 'aciklama': r['aciklama'],
             'stoksuzSat': not r.get('tukendi'),
             'metaData': {'slug': r.get('slug') or slugla(r['ad']), 'pageTitle': meta(r['kisa'], site), 'description': r['md']}}
        if k['secenek']:
            degerler = r.get('degerler') or [v['deger'] for v in k['varyant']]
            u['secenek'] = {'ad': k['secenek'], 'degerler': degerler}
            u['varyantlar'] = [{'deger': d, 'fiyat': v['fiyat'], 'indirimli': v['indirimli'] if v['indirimli'] and v['indirimli'] < v['fiyat'] else None,
                                'stok': 0 if r.get('tukendi') else None, 'gorseller': [k['renk_gorsel'][v['deger']]] if v['deger'] in k['renk_gorsel'] else []}
                               for d, v in zip(degerler, k['varyant'])]
            if not r.get('tukendi'):
                for v in u['varyantlar']: v.pop('stok')
        urunler.append(u)
    return {'site': site, 'kategoriler': KATEGORILER[site], 'urunler': urunler}

YASAK = re.compile(r'(?i)profimod|kozhan|bursa|bahçe kulesi|bahcekulesi|₺|indirim|sepete ekle|tükendi|bayi')
if __name__ == '__main__':
    for site in ('hasturk', 'tarim'):
        d = uret(site)
        for u in d['urunler']:
            m = YASAK.search(u['aciklama'] + u['ad'] + json.dumps(u['metaData'], ensure_ascii=False))
            if m: raise SystemExit(f'{site}: {u["ad"]}: metinde olmaması gereken ifade: {m.group(0)!r} … {u["aciklama"][max(0, m.start() - 120):m.start() + 40]}')
            if '<ul></ul>' in u['aciklama'] or 'None' in u['aciklama']: raise SystemExit(f'{site}: {u["ad"]}: boş liste ya da eksik bilgi')
        json.dump(d, open(f'veri/yeni-urunler/cikti/uretici-{site}.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(site, len(d['urunler']), 'ürün')
