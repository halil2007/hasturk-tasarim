# profimod.com ürünleri için Tarım Dünyası açıklama ve metalarını üretir (HasTürk'tekilerden farklı metin).
# Sayısal bilgiler (ölçü, kapasite, paket içeriği, uyumlu cihazlar) aynı kaynaktan (veri/profimod/kaynak.json) gelir;
# giriş metni, başlıklar, öneriler, sorular ve meta Tarım Dünyası için ayrıca yazılmıştır. Kaynakta olmayan bilgi eklenmez.
# Kullanım: python3 scripts/profimod-icerik-tarim.py  → veri/profimod/cikti/tarim.json
import json, re, sys, os

# HasTürk üreticisindeki yardımcılar ve kaynak ayrıştırma aynen kullanılır (main çalıştırılmadan)
_ns = {'__name__': 'profimod_ortak'}
sys.argv = ['x', 'tarim']
exec(open('scripts/profimod-icerik.py', encoding='utf-8').read().rsplit('\nmain()', 1)[0], _ns)
g = _ns
bolumler, bilgi, bul, say, kucuk, ul, p, h2 = g['bolumler'], g['bilgi'], g['bul'], g['say'], g['kucuk'], g['ul'], g['p'], g['h2']
paket, diger_modeller, sigdir, slugla, temiz_ad, urun_adi = g['paket'], g['diger_modeller'], g['sigdir'], g['slugla'], g['temiz_ad'], g['urun_adi']
KATEGORI, KAT_SLUG, MEVCUT, TEL = g['KATEGORI'], g['KAT_SLUG'], g['MEVCUT'], g['TEL']

CIKTI = 'veri/profimod/cikti/tarim.json'
ILETISIM = f'Ölçü seçimi ya da kurulum hakkında sorunuz olursa Tarım Dünyası müşteri hizmetlerine {TEL} numarasından ulaşabilirsiniz.'

def merak(ciftler):
    return h2('Merak Edilenler') + ''.join(f'<p><strong>{s}</strong><br>{c}</p>' for s, c in ciftler)

def dahil_degil(metin):
    return p(f'<strong>Kutuda olmayanlar:</strong> {metin}')

def baslik(kisa):
    return sigdir([f'{kisa} | Tarım Dünyası', f'{kisa} | Tarım', kisa], 30, 60)

CIVATALI = 'Bütün parçalar civata-somunla birleşir; kaynak makinesi, kesme ya da delme işi gerekmez. Kurulum anahtarı ve resimli kılavuz kutudadır.'

# ---------- aileler ----------
def odunluk(x, b):
    ol = b['Ölçüler']; odun = b['Ne kadar odun alır?']
    dis = bul(ol, 'Dış ölçü').split(' (')[0]; bolum = say(bul(ol, 'Bölüm'), r'(\d+) ×')
    ster = say(odun[0], r'([\d,]+) ster'); mese = say(bul(odun, 'Meşe'), r'yaklaşık ([\d.]+) kg')
    besik = 'beşik' in x['ad'].lower(); kapili = 'Kapılı' in x['ad']
    giris = (f'Kışlık odununuzu yağmurdan uzak ve havadar tutmak için {bolum} bölmeli galvaniz odunluk iskeleti. '
             f'Toplam {ster} ster istif alanı sunar; kuru meşe hesabıyla bu, yaklaşık {mese} kg oduna karşılık gelir. '
             f'{"İki yana eğimli beşik çatı karı ve yağmuru yanlara akıtır." if besik else "Düz çatılı bu ekonomik model, kışı ılıman ve kar almayan bölgelere uygundur."} '
             'Arka yüzü ev ya da bahçe duvarına yaslanır, açık kalan yüzlerden geçen hava odunun kurumasını hızlandırır.')
    if kapili: giris += ' Her bölmenin önünde menteşeli kafes kanat bulunur; kanatlar birlikte açıldığında odun yüklemek kolaylaşır.'
    a = [p(giris),
         dahil_degil('çatı örtüsü (trapez sac, branda ya da OSB), sabitleme dübelleri, oluk ve odun. Gönderilen ürün galvaniz profil iskelettir; fotoğraflardaki örtü ve odun örnek amaçlıdır.'),
         h2('Boyutlar'), ul(ol),
         h2('İstif Kapasitesi ve Odun Ağırlığı'), ul(odun),
         h2('Çatıyı Kaplamak İçin Gerekenler'), ul(b.get('Çatı örtüsü (pakete dahil değildir)', [])),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Yerleştirirken'), ul(['Arka yüzü duvara dübelle bağlayın; dolu odunluk ağırdır ve rüzgâr alır',
                                   'Zemin beton, stabilize ya da çakıl olsun; toprak zeminde ilk sıranın altına palet koyun',
                                   'Açık yüzü hâkim rüzgârın aksine çevirin',
                                   'Çatıya çıkmayın, üstünde kar ve su biriktirmeyin; azami yük testi yapılmamıştır']),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Bu odunluğa ne kadar odun sığar?', f'{ster} ster istif odun alır; kuru meşe için yaklaşık {mese} kg demektir.'),
                ('Çatı kaplaması kutudan çıkıyor mu?', 'Hayır, yalnız iskelet gönderilir. Sac, branda ya da OSB ile kaplamak için gereken miktarlar yukarıda yazılıdır.')]),
         p(ILETISIM)]
    kisa = f'{ster} Ster {"Kapılı " if kapili else ""}Odunluk {dis.replace(" ", "")} {"Beşik" if besik else "Düz"} Çatı'
    md = sigdir([f'{ster} ster kapasiteli galvaniz odunluk iskeleti, {dis}. {"Beşik" if besik else "Düz"} çatı, duvara yaslanan model; civatalı kurulum, örtü hariç.',
                 f'{ster} ster galvaniz odunluk, {dis}. Civatalı kurulum, çatı örtüsü hariç.'], 120, 158)
    return a, kisa, md

def golgelik(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; alan = bul(ol, 'Gölge alanı'); uzun = 'Uzun' in x['ad']
    arac = 'sedan, SUV ve uzun gövdeli araçlara' if uzun else 'hatchback ve kompakt araçlara'
    giris = (f'Tek araçlık park yeri için kesik çatılı galvaniz gölgelik (carport) iskeleti; {arac} göre ölçülendirildi. '
             f'{dis} ölçüsü {alan} gölge alanı oluşturur. Önü açık olduğu için araç rahat girer, iki yanda kapı açacak boşluk kalır. '
             'Yaz güneşinde kabini serin tutmak, yağmur ve kuş pisliğinden korumak için seçtiğiniz örtüyle tamamlanır.')
    a = [p(giris),
         dahil_degil('gölge filesi, branda ya da polikarbon örtü, bağlama ve zemin sabitleme malzemeleri. Fotoğraflardaki örtü ve araç örnek amaçlıdır.'),
         h2('Boyutlar'), ul(ol),
         h2('Araç Sınıflarına Göre Uygunluk'), ul([i for i in b['Aracım sığar mı? (sınıf ortalaması)'] if ':' in i]),
         p('Bu değerler sınıf ortalamasıdır; aynalar dahil kendi aracınızın ölçüsünü kontrol edin.'),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Kurarken'), ul(['Bütün dikmeleri zemine sabitleyin; örtülü gölgelik rüzgârı tutar',
                             'Fırtına ve kar uyarılarında örtüyü sökün; kar ve rüzgâr yükü testi yapılmamıştır',
                             'Çatıya çıkmayın, örtüde su biriktirmeyin']),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Örtü olarak ne kullanabilirim?', 'Gölge filesi, PVC branda ya da UV korumalı polikarbon levha kullanılabilir; örtü kutudan çıkmaz.'),
                ('Kaynak gerekir mi?', CIVATALI)]),
         p(ILETISIM)]
    kisa = f'Araç Gölgeliği Carport {dis.replace(" ", "")} {"Uzun" if uzun else "Kompakt"}'
    md = sigdir([f'Tek araçlık galvaniz carport iskeleti, {dis} ve {alan} gölge alanı. {arac.capitalize().replace(" göre", "")} uygun; civatalı kurulum, örtü hariç.',
                 f'Galvaniz carport iskeleti {dis}, {alan} gölge alanı. Civatalı kurulum, örtü hariç.'], 120, 158)
    return a, kisa, md

def kovan(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; kap = say(bul(ol, 'Kapasite'), r'(\d+)'); iki = '2 Katlı' in x['ad']
    tip = say(x['ad'], r"Sehpası (\d'l[ıiüu])")
    giris = (f'Arılıkta {kap} kovanı yerden yükseltmek için {"iki katlı" if iki else "tek katlı"} galvaniz kovan sehpası ({dis}). '
             'Kovan tabanı yerden yaklaşık 50 cm yukarıda durur; nemden, karıncadan ve kemirgenden uzak kalır, altından hava alır. '
             + ('İkinci kat aynı alana iki sıra kovan koymanızı sağlar; yeri dar arılıklarda ve çoğaltma döneminde işe yarar.' if iki
                else 'Bakım ve bal hasadında eğilme ihtiyacı azalır.'))
    a = [p(giris), dahil_degil('kovan ve arıcılık malzemeleri; yalnız sehpa iskeleti gönderilir.'),
         h2('Boyutlar ve Uyumlu Kovanlar'), ul(ol),
         h2('Nerelerde Kullanılır?'), ul(b.get('Kullanım alanları', [])),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Arılıkta Yerleşim'), ul(['Sehpayı düz ve sağlam zemine kurun',
                                      'Kovan uçuş deliklerini güneye ya da doğuya bakacak şekilde dizin',
                                      'Kovanın ön tarafını hafif eğik tutun, yağmur suyu içeri dolmasın'] + (['Dolu ve ağır kovanları alt kata koyun'] if iki else [])),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Langstroth ve Dadant kovan oturur mu?', 'Evet. Langstroth ve 10 çerçeveli Dadant kovanlar 41 cm aralıklı iki kuşağın üzerine yerleşir.'),
                ('Sehpanın taşıma sınırı nedir?', f'Model {kap} kovanlıktır; azami yük testi yapılmamıştır, ağır kovanları alt sıraya koyun.')]),
         p(ILETISIM)]
    kisa = f'Arı Kovanı Sehpası {tip} {"2 Katlı" if iki else "Tek Kat"} Galvaniz'
    md = sigdir([f'{kap} kovan alan {"2 katlı" if iki else "tek katlı"} galvaniz kovan sehpası, {dis}. Kovanı nem ve karıncadan uzak tutar, Langstroth ve Dadant uyumlu.',
                 f'{kap} kovanlık galvaniz kovan sehpası {dis}. Langstroth ve Dadant uyumlu, civatalı kurulum.'], 120, 158)
    return a, kisa, md

def masa(x, b):
    ol = b['Ölçüler']; tabla = bul(ol, 'Tabla ölçüsü').split(' (')[0]
    ad = temiz_ad(x['ad']); tur = re.sub(r'^Galvaniz | İskeleti.*$', '', ad)
    ozel = {'Atölye': 'Uzun yüzeyi sayesinde iki kişi yan yana çalışabilir, uzun malzeme tek parça halinde serilir.',
            'Bahçe Çalışma': 'Saksı doldurmak, fide şaşırtmak ve aletleri temizlemek için ayakta rahat bir çalışma yüzeyi verir.',
            'Kargo': 'Koli hazırlarken bant, tartı ve etiket yazıcısı aynı yüzeyde durur.',
            'Sera Tezgahı': '70 cm derinlik standart köpük viyolün enine oturmasını sağlar; yüzeye 3 viyol sığar.',
            'Sera Orta': '110 cm genişlik iki yandan çalışmaya imkân verir; yüzeye 9 standart köpük viyol sığar.',
            'Uzun Sera': '210 cm boyda 6 standart köpük viyol yan yana dizilir.'}
    cumle = next(v for k, v in ozel.items() if k in ad)
    giris = (f'{tur} için galvaniz iskelet; {tabla} tablaya göre hazırlandı ve 25 mm tabla ile 80 cm çalışma yüksekliği verir. {cumle} '
             'Alttaki kuşak gövdeyi sağlamlaştırır ve raf olarak da kullanılır.')
    a = [p(giris), dahil_degil('üst tabla ve alt raf levhası; ölçülere göre dilediğiniz malzemeden kestirebilirsiniz.'),
         h2('Boyutlar'), ul(ol), h2('Nerelerde Kullanılır?'), ul(b.get('Kullanım alanları', [])),
         h2('Tabla ve Raf İçin Kesim Listesi'), ul(b.get('Tabla ve raf kesim talimatı', [])),
         h2('Kutudan Çıkanlar'), ul(paket(x)), h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Hangi tabla malzemesi kullanılabilir?', 'Kontrplak, MDF, OSB ya da masif ahşap kullanılabilir; serada suya dayanıklı levha tercih edin.'),
                ('Taşıma kapasitesi nedir?', 'Azami yük testi yapılmamıştır; yükü yüzeye yayarak koyun ve üzerine çıkmayın.')]),
         p(ILETISIM)]
    kisa = f'{tabla.replace(" ", "")} {tur} İçin Galvaniz İskelet'
    md = sigdir([f'{tur} için galvaniz iskelet, {tabla} tabla ölçüsü, 80 cm çalışma yüksekliği ve alt raf kuşağı. Civatalı kurulum, tabla hariç.',
                 f'Galvaniz {kucuk(tur)} iskeleti {tabla}. Civatalı kurulum, tabla hariç.'], 120, 158)
    return a, kisa, md

def cop(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; ic = bul(ol, 'İç ölçü')
    hacim = say(x['ad'], r'Muhafazası ([\d–]+ L)'); kapakli = 'Kapaklı' in x['ad']; kova = 'Kovası' in x['ad']
    nesne = 'çöp kovası' if kova else 'çöp konteyneri'
    uyum = b.get('Uyumlu kovalar' if kova else 'Uyumlu konteynerler', [])
    giris = (f'{hacim} {nesne} etrafına kurulan galvaniz muhafaza iskeleti ({dis}). Kedi, köpek ve kuşların çöpü dağıtmasını, '
             'rüzgârda devrilmeyi ve izinsiz kullanımı engeller. Ön kapı kilitlenebilir; önde alt kayıt olmadığı için '
             f'{"kova" if kova else "konteyner"} tekerlekleri üzerinde kolayca girip çıkar.'
             + (' Üst kapak yağmuru ve güneşi keser.' if kapakli else ' Üst kısım açıktır, çöp yukarıdan atılır.'))
    a = [p(giris), dahil_degil(f'{nesne}, tel ya da delikli sac kaplama{", kapak levhası" if kapakli else ""}, asma kilit ve zemin sabitleme malzemesi.'),
         h2('Boyutlar'), ul(ol), h2('Hangi ' + ('Kovalara' if kova else 'Konteynerlere') + ' Uyar?'), ul(uyum),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Kurarken'), ul(['Muhafazayı zemine sabitleyin, rüzgârda devrilmesin', 'Kapı önünde açılma payı bırakın',
                             'Kaplamayı tel, kelepçe ya da pullu vidayla profillere bağlayın', 'Üstüne yük koymayın; azami yük testi yapılmamıştır']),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([(f'{nesne.capitalize()}m içine sığar mı?', f'İç ölçü {ic}; markaya göre ölçüler değiştiği için kendi {"kovanızı" if kova else "konteynerinizi"} ölçüp karşılaştırın.'),
                ('Nasıl kurulur?', CIVATALI)]),
         p(ILETISIM)]
    kisa = f'{"Çöp Kovası" if kova else "Çöp Konteyneri"} Muhafazası {hacim} {"Kapaklı" if kapakli else "Açık"} Galvaniz'
    md = sigdir([f'{hacim} {nesne} için galvaniz muhafaza iskeleti, {dis}. Kilitli ön kapı{", üst kapaklı" if kapakli else ""}; hayvan ve rüzgâra karşı. Kaplama hariç.',
                 f'{hacim} {nesne} galvaniz muhafazası {dis}. Kilitli kapı, civatalı kurulum, kaplama hariç.'], 120, 158)
    return a, kisa, md

def raf(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; katbol = next((i for i in ol if 'kat,' in i), '')
    ad = temiz_ad(x['ad']); tur = re.sub(r'^Galvaniz | İskeleti.*$', '', ad); kul = b.get('Kullanım alanları', [])
    giris = (f'{tur} için galvaniz iskelet: {dis}, {kucuk(katbol)}. '
             f'{(kul[0] if kul else "Depo").capitalize()}{" ve " + kucuk(kul[1]) if len(kul) > 1 else ""} gibi yerlerde malzemeleri yerden kaldırır, düzen sağlar. '
             'Galvaniz kaplama nemli ortamlarda paslanmaya karşı dayanıklıdır; tablaları ihtiyacınıza göre kestirip yerleştirirsiniz.')
    a = [p(giris), dahil_degil('raf tablaları; kesim ölçüleri aşağıda yer alır.'),
         h2('Boyutlar'), ul(ol), h2('Nerelerde Kullanılır?'), ul(kul),
         h2('Tabla Kesim Listesi'), ul(b.get('Tabla kesim talimatı', [])),
         h2('Kutudan Çıkanlar'), ul(paket(x)), h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Tabla için ne önerirsiniz?', 'OSB, kontrplak ya da MDF kullanılabilir; balkon, banyo ve serada suya dayanıklı levha seçin.'),
                ('Raf ne kadar yük taşır?', 'Azami yük testi yapılmamıştır; ağır malzemeyi alt katlara koyup yükü eşit dağıtın.')]),
         p(ILETISIM)]
    kisa = f'{tur} {dis.replace(" ", "")} Galvaniz Profil'
    md = sigdir([f'{tur} için galvaniz iskelet, {dis}, {kucuk(katbol)}. Neme dayanıklı, civatalı kurulum; tablalar hariç.',
                 f'Galvaniz {kucuk(tur)} iskeleti {dis}, {kucuk(katbol)}. Civatalı kurulum, nemli ortama dayanıklı; tablalar hariç.',
                 f'Galvaniz {kucuk(tur)} iskeleti {dis}. Civatalı kurulum, nemli ortama dayanıklı galvaniz kaplama; raf tablaları hariç.'], 120, 158)
    return a, kisa, md

def kedi(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]
    kac = say(bul(ol, 'Kaç kedi'), r'^([\d–]+ kedi)'); model = bul(ol, 'Model'); taban = bul(ol, 'Taban alanı')
    giris = (f'Kedinizin balkonda güvenle vakit geçirmesi için kapılı galvaniz kafes iskeleti ({dis}, {kucuk(model)}). '
             f'Dört yanı ve üstü kapandığında düşme ve kaçma endişesi olmadan güneşlenir, dışarıyı izler. {taban} taban alanı {kac} için yeterlidir; '
             'tam boy kapıdan içeri girip temizlik yapabilirsiniz.')
    a = [p(giris), dahil_degil('file ya da tel, tünek rafları ve kilit; fotoğraflardaki file, raf ve kediler örnek amaçlıdır.'),
         h2('Boyutlar'), ul(ol),
         h2('Kaplama İçin Gereken File / Tel'), ul(b['File / tel ihtiyacı (pakete dahil değildir)']),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Güvenlik İçin'), ul(['Kafesi bina duvarına ve balkon zeminine dübelle sabitleyin', 'File ya da teli boşluk kalmayacak şekilde bütün yüzlere gerin',
                                  'Kapıya kedinin açamayacağı bir sürgü takın', 'Kafesin üstüne çıkmayın, yük koymayın']),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b, 'Hangi ölçü?')),
         merak([('Kaç kedi için uygun?', f'Bu ölçü {kac} için hesaplanmıştır (tünek raflarıyla birlikte; resmî bir standart değildir).'),
                ('Hangi file uygun?', 'UV dayanımlı kedi filesi ya da kaynaklı tel kullanılabilir; telde göz aralığı en fazla 2,5 cm olmalıdır.')]),
         p(ILETISIM)]
    kisa = f'Kedi Balkon Kafesi Galvaniz {dis.replace(" ", "")}'
    md = sigdir([f'Balkon için kapılı galvaniz kedi kafesi iskeleti, {dis}, {kac} için. Düşme ve kaçmayı önler; civatalı kurulum, file hariç.',
                 f'Galvaniz kedi balkon kafesi {dis}, {kac} için. Civatalı kurulum, file hariç.'], 120, 158)
    return a, kisa, md

def klima(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; ic = bul(ol, 'İç ölçü'); tip = say(x['ad'], r'Tip ([A-G])')
    sec = next(i[2:] for i in b['Hangi tip?'] if i.startswith('✔')); cihaz = sec.split(', ', 1)[1]
    giris = (f'Tip {tip} galvaniz koruma kafesi ({dis}); {cihaz} için uygundur. Dış ünite ya da kompresörü hırsızlığa, darbeye, '
             'çocuk ve hayvanlara karşı korur. Önde kilitlenebilir, menteşeli bakım kapağı vardır; servis sırasında kafesi sökmeye gerek kalmaz.')
    a = [p(giris), dahil_degil('cihaz, kaplama teli ya da delikli sac, asma kilit ve sabitleme malzemesi.'),
         h2('Boyutlar'), ul(ol), h2('Hangi Cihazlara Uyar?'), ul(b['Uyumlu cihazlar']),
         h2('Kaplamada Dikkat'), ul(['Havayı serbest geçiren seyrek tel (en az 5 cm göz) ya da en az %40 açıklıklı delikli sac kullanın',
                                     'Sık tel, file, düz sac ya da branda hava akışını keser; cihaz ısınır']),
         h2('Kutudan Çıkanlar'), ul(paket(x)), h2('Diğer Tipler'), ul(diger_modeller(b, 'Hangi tip?')),
         merak([('Cihazım sığar mı?', f'İç ölçü {ic}; cihazın her yanında en az 10 cm boşluk kalmalıdır. Satın almadan önce cihazı ölçün.'),
                ('Kurulum nasıl?', CIVATALI + ' Kafesi zemine ya da duvara sabitleyin.')]),
         p(ILETISIM)]
    kisa = sigdir([f'Klima Kompresör Koruma Kafesi Tip {tip} {dis.replace(" ", "")}', f'Klima ve Kompresör Kafesi Tip {tip}'], 20, 46)
    md = sigdir([f'Tip {tip} galvaniz koruma kafesi, {dis}: {cihaz}. Kilitli bakım kapağı, civatalı kurulum; kaplama hariç.',
                 f'Tip {tip} galvaniz klima ve kompresör koruma kafesi, {dis}. Kilitli bakım kapağı, civatalı kurulum; kaplama hariç.',
                 f'Galvaniz koruma kafesi Tip {tip}, {dis}. Kilitli bakım kapağı, civatalı kurulum.'], 120, 158)
    return a, kisa, md

def konteyner(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; taban = bul(ol, 'Taban alanı')
    seri = 'Ultra Sağlam' if 'Ultra' in x['ad'] else ('Sağlam' if 'Sağlam' in x['ad'] else 'Standart')
    feet = say(b['_giris'][0], r'(\d+) feet'); yan = 'Yan Kapılı' in x['ad']
    kullanim = {'Standart': 'bahçe deposu, barınak ve sundurma gibi depolama amaçlı yapılar içindir; yaşam alanı olarak tasarlanmamıştır',
                'Sağlam': 'sık ızgarasıyla depo, atölye, garaj ve hobi alanı iskeleti olarak kullanılır',
                'Ultra Sağlam': 'en sık ızgaralı seridir; atölye, bahçe ofisi ve hobi odası iskeleti olarak kullanılır'}[seri]
    giris = (f'{feet} feet konteyner boyunda {kucuk(seri)} seri galvaniz iskelet: {dis}, {taban} taban alanı. '
             f'Çift kanatlı kapı {"uzun yan yüzdedir" if yan else "kısa kenardadır"}. Bu seri {kullanim}. '
             'Kaynak gerektirmeden civatayla kurulur, gerektiğinde sökülüp taşınır.')
    a = [p(giris), dahil_degil('duvar, çatı ve zemin kaplaması, yalıtım, kilit, elektrik-su tesisatı ve sabitleme malzemesi.'),
         h2('Boyutlar'), ul(ol),
         h2('Kaplama ve Zemin İçin Malzeme Listesi'), ul(b['Kaplama ve zemin hesabı (malzemeler dahil değildir)']),
         h2('Seriler Arasındaki Fark'), ul([i.lstrip('✔ ') for i in b['Seri farkları']]),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Kurulum Yeri'), ul(['Beton, sıkıştırılmış dolgu ya da ayaklı kaide gibi düz ve sağlam zemine kurup sabitleyin',
                                 'Çatı eğimi, yalıtım ve tesisatı yerine göre ayrıca planlayın',
                                 'Çatıya çıkmayın; kar, rüzgâr ve taşıma yükü testi yapılmamıştır',
                                 'İmar ve izin kurallarına uymak alıcının sorumluluğundadır']),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Kapı hangi tarafta?', f'{bul(ol, "Kapı")}.'), ('Yaşam alanı yapılabilir mi?', 'Standart seri yaşam amaçlı değildir; Sağlam ve Ultra Sağlam seriler atölye, hobi alanı ve bahçe ofisi iskeleti olarak kullanılır.')]),
         p(ILETISIM)]
    kisa = f'Konteyner İskeleti {seri} {feet} Feet{" Yan Kapılı" if yan else ""}'
    md = sigdir([f'{seri} seri {feet} feet galvaniz konteyner iskeleti, {dis}, {taban} taban. Civatayla kurulur, söküp taşınır; kaplama hariç.',
                 f'{seri} seri galvaniz konteyner iskeleti {dis}. Civatalı kurulum, kaplama hariç.'], 120, 158)
    return a, kisa, md

def kurutma(x, b):
    ol = b['Ölçüler ve kapasite']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; alan = bul(ol, 'Kurutma alanı')
    kg = say(bul(ol, 'Tek seferde'), r'yaklaşık (\d+ kg)'); kapak = say(x['ad'], r'(\d) Bölmeli')
    giris = (f'Domates, biber, meyve ve otları güneşte temiz kurutmak için kapaklı galvaniz tezgâh iskeleti ({dis}). '
             f'{alan} yüzeye tek seferde yaklaşık {kg} dilimlenmiş ürün serilir (tahmini). Ürün 78,5 cm yükseklikte toprak ve tozla temas etmeden, '
             f'altından da hava alarak kurur; {kapak} sinek telli kapak böcek ve kuşları uzak tutar.')
    a = [p(giris), dahil_degil('alt tel, sinek teli ve ürün; iskelet ve kapak çerçeveleri gönderilir.'),
         h2('Boyutlar ve Kapasite'), ul(ol),
         h2('Tel Seçimi'), p('Ürüne değen alt telde paslanmaz çelik ya da gıdaya uygun tel kullanın.'),
         ul([i for i in b['Tel ihtiyacı (pakete dahil değildir)'] if 'kullanmayın' not in i]),
         h2('Bu Tezgâhta Kurutabilecekleriniz'), ul(b['Neler kurutulur?']),
         h2('Kutudan Çıkanlar'), ul(paket(x)), h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b, 'Hangi ölçü?')),
         merak([('Bir seferde ne kadar ürün kurutulur?', f'Yaklaşık {kg} dilimlenmiş domates ya da elma (tahmini).'),
                ('Kurutma ne kadar sürer?', 'Havaya bağlıdır; domates yaklaşık 5-10, elma 3-5 güneşli gün sürer (tahmini).')]),
         p(ILETISIM)]
    kisa = f'Sebze Meyve Kurutma Tezgâhı {dis.replace(" ", "")}'
    md = sigdir([f'Kapaklı galvaniz kurutma tezgâhı {dis}, {alan} alan, tek seferde yaklaşık {kg} ürün. Domates, biber ve meyve için; tel hariç.',
                 f'Galvaniz kurutma tezgâhı {dis}, {alan}. Kapaklı, civatalı kurulum, tel hariç.'], 120, 158)
    return a, kisa, md

def kus(x, b):
    ol = b['Ölçüler']; dis = bul(ol, 'Dış ölçü').split(' (')[0]; taban = bul(ol, 'İç taban'); model = bul(ol, 'Model')
    sec = next(i[2:] for i in b['Hangi model?'] if i.startswith('✔')); muh = say(sec, r'(\d+) muhabbet')
    giris = (f'Kuşlarınızın gerçekten uçabileceği, içine girilebilen galvaniz salma kafes (kuşhane) iskeleti: {dis}, {kucuk(model)}. '
             f'{taban} iç taban kuşlara kanat çırpacak alan bırakır; 2,04 m açıklıklı kapıdan girip yem, su ve temizlik işlerini ayakta yaparsınız. '
             f'Muhabbet kuşu için {muh} adede kadar uygundur.')
    a = [p(giris), dahil_degil('tel örgü, dallar, yuva, yemlik, suluk, çatı örtüsü ve kilit; fotoğraflardaki tel ve kuşlar örnek amaçlıdır.'),
         h2('Boyutlar'), ul(ol),
         h2('Türlere Göre Kuş Sayısı'), ul([i for i in b['Hangi kuştan kaç adet?'] if ':' in i]),
         h2('Tel Önerileri'), ul(b['Tel önerileri (pakete dahil değildir)']),
         h2('Kutudan Çıkanlar'), ul(paket(x)),
         h2('Kurulum ve Bakım'), ul(['Düz zemine kurup tabana çakıl ya da kum serin', 'Kafesi duvara ve zemine sabitleyin',
                                     'Bir bölümü yağmur ve güneşe karşı örtün', 'Kapıya sürgü takın']),
         h2('Serideki Diğer Seçenekler'), ul(diger_modeller(b)),
         merak([('Kaç kuş konabilir?', f'Muhabbet kuşu için {muh} adede kadar; diğer türler yukarıdaki listede.'),
                ('Kurulum nasıl?', CIVATALI)]),
         p(ILETISIM)]
    kisa = f'Salma Kuş Kafesi Kuşhane {dis.replace(" ", "")}'
    md = sigdir([f'İçine girilebilen galvaniz salma kuş kafesi (kuşhane) {dis}, {muh} muhabbet kuşuna kadar. Civatalı kurulum, tel hariç.',
                 f'Galvaniz salma kuş kafesi {dis}, kapılı. Civatalı kurulum, tel hariç.'], 120, 158)
    return a, kisa, md

def konnektor(x, b):
    ad = x['ad']; no = say(ad, r'No:([\w-]+)')
    if '180' in ad: tur, gorev, kol = '180° düz ekleme parçası', 'iki profili aynı hizada uç uca bağlar', 2
    elif '90' in ad: tur, gorev, kol = '90° köşe (dirsek) parçası', 'iki profili dik açıyla birleştirip köşe oluşturur', 2
    else:
        kol = {'Üç': 3, 'Dört': 4, 'Beş': 5}[say(ad, r'(Üç|Dört|Beş) Kollu')]
        tur = f'{["", "", "", "üç", "dört", "beş"][kol]} kollu bağlantı parçası'; gorev = f'{kol} profili aynı noktada buluşturur'
    giris = (f'30 × 30 × 1,2 mm galvaniz kutu profiller için No:{no} {tur}; {gorev}. Profil uçlarındaki kare deliklere M6 civatayla bağlanır, kaynak gerekmez. '
             'Raf, sera tezgâhı, gölgelik ya da kafes gibi iskeletleri kendi ölçünüzde kurarken kullanılır.')
    a = [p(giris),
         h2('Teknik Bilgi'), ul([f'Parça no: No:{no}' + (f' ({x["sku"]})' if x.get('sku') else ''), f'Kol sayısı: {kol}',
                                  'Profil: 30 × 30 mm kutu, 1,2 mm et kalınlığı', 'Bağlantı: M6 dibi dört köşe civata']),
         h2('Sipariş Vermeden Önce'), ul(['Kol yönlerini fotoğraflardan kontrol edin; aynı kol sayısında farklı açılar bulunur',
                                          f'Kurulum kılavuzunuzdaki parça numarasıyla No:{no} numarasını eşleştirin']),
         merak([('Hangi profillerle çalışır?', '30 × 30 mm, 1,2 mm et kalınlığındaki delikli galvaniz kutu profillerle doğrudan kullanılır.')]),
         p(ILETISIM)]
    kisa = f'Kutu Profil Bağlantı Parçası No:{no} {"180°" if "180" in ad else ("90°" if "90" in ad else str(kol) + " Kollu")} 30x30'
    md = sigdir([f'30x30x1,2 mm galvaniz kutu profil için No:{no} {tur}; {gorev}. M6 civatayla kaynaksız iskelet kurulumu.',
                 f'30x30 mm galvaniz kutu profil için No:{no} {tur}; {gorev}. Kaynaksız iskelet kurulumu.',
                 f'30x30 mm kutu profil için No:{no} {tur}. Civatalı, kaynaksız modüler iskelet projelerine.'], 120, 158)
    return a, kisa, md

def profil(x, b):
    boy = say(x['ad'], r'(\d+) Cm')
    giris = (f'Kaynaksız modüler yapılarda kullanılan {boy} cm galvaniz kutu profil; 30 × 30 mm kesit, 1,2 mm et kalınlığı. '
             'Var olan bir iskeleti uzatmak, eksik parçayı tamamlamak ya da kendi tasarımınızı kurmak için uygundur. Delikli ve deliksiz seçenekleri aynı fiyattadır.')
    a = [p(giris),
         h2('Teknik Bilgi'), ul([f'Boy: {boy} cm', 'Kesit: 30 × 30 mm', 'Et kalınlığı: 1,2 mm', 'Yüzey: galvaniz kaplama']),
         h2('Seçenekler'), ul(['Delikli: iki uçta 4+4 kare delik; M6 dibi dört köşe civatayla bağlantı parçalarına doğrudan oturur',
                               'Deliksiz: deliği kendiniz açacağınız ya da farklı bağlantı kullanacağınız projeler için']),
         merak([('Hangi boylar var?', '10 cm’den 150 cm’ye kadar 10 cm aralıkla 15 boy bulunur.'),
                ('Açık havada kullanılır mı?', 'Galvaniz kaplama profili korozyona karşı korur; açık havada ve nemli ortamda kullanılabilir.')]),
         p(ILETISIM)]
    kisa = f'{boy} cm Galvaniz Profil 30x30 Kutu, Delikli/Deliksiz'
    md = sigdir([f'{boy} cm galvaniz kutu profil, 30x30 mm kesit, 1,2 mm et. Delikli ya da deliksiz seçenekli; kaynaksız raf ve iskelet projeleri için.',
                 f'{boy} cm galvaniz kutu profil 30x30x1,2 mm. Delikli ya da deliksiz, kaynaksız projeler için.'], 120, 158)
    return a, kisa, md

AILE = {'Odunluklar': odunluk, 'araç gölgelikleri': golgelik, 'Kovan Sehpası': kovan, 'Masa ve Tezgah İskeletleri': masa,
        'Çöp Konteyneri Muhafazaları': cop, 'Raflar': raf, 'Evcil Hayvan Balkon Kafesi': kedi, 'Klima ve Kompresör Kafesleri': klima,
        'Konteyner İskeletleri': konteyner, 'Kurutma Tezgâhları': kurutma, 'Salma Kuş Kafesleri': kus, 'Konnektörler': konnektor,
        'Galvaniz Kutu Profiller': profil}

def main():
    d = json.load(open(g['KAYNAK'], encoding='utf-8'))
    has = {u['ad']: u for u in json.load(open('veri/profimod/cikti/hasturk.json', encoding='utf-8'))['urunler']}
    urunler, hata = [], []
    for x in d['urunler']:
        if (x.get('sku') or '').upper() in MEVCUT: continue
        k0 = x['kategoriler'][0]
        a, kisa, md = AILE[k0](x, bolumler(x['aciklama']))
        ad = urun_adi(x)
        u = {'ad': ad, 'aciklama': ''.join(a), 'metaData': {'slug': slugla(ad), 'pageTitle': baslik(kisa), 'description': md}}
        h = has.get(ad)
        if h:
            kok = lambda t: t.split(' | ')[0].replace(' ', '').lower()
            if h['aciklama'] == u['aciklama'] or h['metaData']['description'] == md or kok(h['metaData']['pageTitle']) == kok(u['metaData']['pageTitle']):
                hata.append('HasTürk ile aynı metin: ' + ad)
        urunler.append(u)
    for u in urunler:
        t, m = u['metaData']['pageTitle'], u['metaData']['description']
        if not 30 <= len(t) <= 60: hata.append(f'başlık {len(t)}: {t}')
        if not 120 <= len(m) <= 158: hata.append(f'açıklama {len(m)}: {m}')
        if re.search(r'\busta\b|uzman|bize yazın', u['aciklama'], re.I): hata.append('yasak ifade: ' + u['ad'])
    os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
    json.dump({'site': 'tarim', 'urunler': urunler}, open(CIKTI, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(urunler)} ürün → {CIKTI}')
    for e in hata: print('HATA', e)
    sys.exit(1 if hata else 0)

main()
