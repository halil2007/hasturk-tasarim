#!/usr/bin/env python3
"""Bahçe Kulesi bahçe yatakları ve kuleleri: alt kategori planı + SEO metinleri (iki mağaza için ayrı metinler).
Çıktı: scripts/yatak-duzen/plan-hasturk.json, plan-tarim.json  (scripts/ikas-yatak-duzen.mjs girdisi)
Bilgi kaynağı: ürün adları (public/products.json) ve docs/bilgi/urunler-hasturk.json (ölçü, parça adedi, toprak ihtiyacı, kutu içeriği).
Denetim: başlık ≤ 60, meta 120–158, ilk paragraf ≤ 90 kelime, paragraf ≤ 150 kelime, ortalama cümle ≤ 22 kelime, fiyat / satış dili / telefon yok,
mağaza içi bağlantılar var olan adreslere, blog bağlantıları yayımlanmış yazılara, iki mağaza metni birbirinin kopyası değil.
Kullanım: python3 veri/yatak-duzen/uret.py"""
import json, re, os, html, sys, glob, datetime

DEPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
UST = 'Bahçe Yatakları ve Kuleleri'
e = lambda s: html.escape(s, quote=False)
H = json.load(open(os.path.join(DEPO, 'public', 'products.json')))
T = json.load(open(os.path.join(DEPO, 'public', 'tarim', 'products.json')))
DOC = {x['adres']: x for x in json.load(open(os.path.join(DEPO, 'docs', 'bilgi', 'urunler-hasturk.json')))}
cm = {c['id']: c['n'] for c in H['cats']}
mine = [p for p in H['items'] if any(cm.get(c) == UST for c in p['c'])]
tarim_slugs = {p['s'] for p in T['items']}
BLOG = 'https://blog.hasturkgubre.com.tr'
simdi = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3))).strftime('%Y-%m-%d %H:%M')
YAYIN = {}
for f in glob.glob(os.path.join(DEPO, 'veri/blog-paket/*.txt')):
    slug = None
    for satir in open(f, encoding='utf8'):
        if satir.startswith('slug: '): slug = satir[6:].strip()
        elif satir.startswith('yayin: ') and slug: YAYIN[slug] = satir[7:].strip(); slug = None
for f in glob.glob(os.path.join(DEPO, 'src/blog/icerik/*.js')):
    for slug in re.findall(r"slug:\s*['\"]([a-z0-9-]+)['\"]", open(f, encoding='utf8').read()): YAYIN.setdefault(slug, '2000-01-01 00:00')


def kat(p):
    n = p['n']
    if 'Çiçeklik' in n: return 'Çiçeklik Serisi Yataklar'
    if re.search(r'(?:Şekilli|Uzun) Seri No:(\d+)', n): return 'Şekilli Sebze Yatakları' if 'Şekilli' in n else 'Uzun Sebze Yatakları'
    if re.search(r'\((?:Sebze ve Çiçek)\)', n) or 'Uzatma Seti' in n: return 'Klasik Sebze Yatakları'
    if 'Bitki Destek' in n: return 'Bitki Destek Üniteleri'
    if 'Kule' in n or 'Tekerlek Seti' in n: return 'Dikey Tarım Kuleleri'
    if 'Balkon' in n: return 'Balkon ve Teras Sebze Yatakları'
    return None


grup = {}
for p in mine:
    k = kat(p)
    if not k: print('! atanamadı:', p['n']); sys.exit(1)
    grup.setdefault(k, []).append(p)
assert sum(len(v) for v in grup.values()) == len(mine) == 62

# ---- ürün verisi (ad + doküman) ----
def doc(p):
    return re.sub(r'\s+', ' ', DOC.get(p['s'], {}).get('aciklama', ''))

def no_of(p):
    mo = re.search(r'No:\s*(\d+)\s?([vV]2)?', p['n']); return (mo.group(1) + (mo.group(2) or '').upper()) if mo else ''

def olcu(p):
    mo = re.search(r'(\d{2,3})\s?[x×]\s?(\d{2,3})(?:\s?[x×]\s?(\d{2,3}))?\s?cm', p['n']); return '%s × %s' % (mo.group(1), mo.group(2)) if mo else ''

def parca(p):
    mo = re.search(r'Parça Adedi (\d+)', doc(p)); return mo.group(1) if mo else '–'

def alan_toprak(p):
    a = re.search(r'[Ee]kim alanı (?:yaklaşık )?([\d,\.]+) m²', doc(p)); l = re.search(r'(?:yaklaşık )?(\d+) litre toprak', doc(p))
    return (a.group(1) if a else '–', l.group(1) if l else '–')

KLASIK = {108: (1, '60 × 60'), 153: (2, '85 × 60'), 217: (3, '85 × 85'), 198: (4, '110 × 60'), 281: (5, '110 × 85'), 363: (6, '110 × 110'), 357: (7, '140 × 85'), 421: (8, '165 × 85'), 462: (9, '140 × 110'), 545: (10, '165 × 110')}

def klasik_satirlar():
    rows = []
    for p in grup['Klasik Sebze Yatakları']:
        mo = re.search(r'(\d+) Litre', p['n'])
        if mo: no, ol = KLASIK[int(mo.group(1))]; rows.append((no, ol, int(mo.group(1)), p))
    return sorted(rows)

def sirali(k):
    return sorted(grup[k], key=lambda p: int(re.search(r'\d+', no_of(p) or '99').group()))

def link(p, etiket=None): return '<a href="/%s">%s</a>' % (p['s'], e(etiket or p['n']))
def tablo(basliklar, satirlar):
    return '<table><thead><tr>' + ''.join('<th>%s</th>' % e(b) for b in basliklar) + '</tr></thead><tbody>' + \
        ''.join('<tr>' + ''.join('<td>%s</td>' % (c if str(c).startswith('<a ') else e(str(c))) for c in r) + '</tr>' for r in satirlar) + '</tbody></table>'
def ul(items): return '<ul>' + ''.join('<li>%s</li>' % x for x in items) + '</ul>'
def ol(items): return '<ol>' + ''.join('<li>%s</li>' % x for x in items) + '</ol>'
def sss(qa): return '<h2>Sık Sorulan Sorular</h2>' + ''.join('<h3>%s</h3><p>%s</p>' % (q, a) for q, a in qa)
def p_(t): return '<p>%s</p>' % t
def h2(t): return '<h2>%s</h2>' % t

K_ = '/sebze-yatagi'  # üst kategori adresi (Bahçe Yatakları ve Kuleleri)
TOPRAK = '/sebze-ve-meyve-yetistirme-topraklari'
A = lambda adres, etiket: '<a href="/%s">%s</a>' % (adres, etiket)
def B(slug, etiket):
    y = YAYIN.get(slug)
    return ('<a href="%s/%s">%s</a>' % (BLOG, slug, etiket)) if y and y <= simdi else etiket
S_KLASIK, S_SEKILLI, S_UZUN, S_CIC = 'klasik-sebze-yataklari', 'sekilli-sebze-yataklari', 'uzun-sebze-yataklari', 'ciceklik-serisi-yataklar'
S_BALKON, S_KULE, S_DESTEK = 'balkon-ve-teras-sebze-yataklari', 'dikey-tarim-kuleleri', 'bitki-destek-uniteleri'

# ------------------------------------------------------------------ metinler
def metin(site):
    h = site == 'hasturk'
    G = {}

    # ---------- Klasik
    k = 'Klasik Sebze Yatakları'; kl = klasik_satirlar(); uz = [p for p in grup[k] if 'Uzatma' in p['n']][0]
    tb = tablo(['Model', 'Ölçü (cm)', 'Hacim (litre)', 'Ürün'], [(('No:%d' % n), ol_ + ' × 30', l, link(p, 'Ayrıntı')) for n, ol_, l, p in kl]) if h else \
         ul(['%s: %s cm, yaklaşık %d litre' % (link(p, 'No:%d' % n), ol_ + ' × 30', l) for n, ol_, l, p in kl])
    if h:
        govde = (
            p_('<strong>Kısaca:</strong> Klasik sebze yatakları, No:1\'den No:10\'a kadar numaralanan kare ve dikdörtgen modüler yükseltilmiş yataklardır. Ölçüleri 60 × 60 cm ile 165 × 110 cm arasındadır, yükseklikleri 30 cm\'dir ve hacimleri 108 ile 545 litre arasında değişir. Sebze, çiçek ve aromatik bitki yetiştirmek için toprakla doldurulur.') +
            h2('Klasik Yatak Modelleri, Ölçüleri ve Hacimleri') + tb +
            p_('Hacim, yatağı doldurmak için gereken toprağın yaklaşık miktarıdır. Aşağıdaki adımlarla doğru modeli seçebilirsiniz.') +
            h2('Doğru Yatak Ölçüsü Nasıl Seçilir?') + ol([
                'Yatağı koyacağınız zemini ölçün; yatağın etrafında bakım için yürüyecek boşluk bırakın.',
                'Yatağa her yandan ulaşabilmeniz gerekir. Ölçü büyüdükçe yatağın ortasına uzanmak zorlaşır, bu yüzden genişliği buna göre belirleyin.',
                'Tablodaki hacme bakarak toprak miktarını hesaplayın. Örneğin No:6 (110 × 110 cm) yaklaşık 363 litre, No:10 (165 × 110 cm) yaklaşık 545 litre toprak alır.',
                'Yatağa destek ünitesi ya da kemer takmayı düşünüyorsanız, yatağın genişliğine uyan seçeneği önceden belirleyin.',
                'İleride büyütmek istiyorsanız uzatma setini planlayın; set yatağın genişliğine 25 cm ekler.']) +
            h2('Malzeme, Kurulum ve Renk') + ul([
                'Gövde dayanıklı plastik parçalardan oluşur ve modülerdir; yatak gerektiğinde sökülüp yeniden kurulabilir.',
                'Montaj kolaydır ve parçalar birbirine geçecek şekilde tasarlanmıştır.',
                'Renk seçenekleri bej ve gridir.',
                'Her modelin yüksekliği 30 cm\'dir; ekim, sulama ve bakım sırasında yetiştirme alanına erişim kolaylaşır.']) +
            h2('Toprak, Ekim ve Bakım') +
            p_('Yatak toprak olmadan gelir. Yatağı doldurmak için ' + A(TOPRAK[1:], 'sebze ve meyve yetiştirme topraklarına') + ' bakabilirsiniz. Ölçü seçimi ve doldurma ayrıntıları için ' + B('yukseltilmis-yatak-olcusu', 'yükseltilmiş yatak ölçüsü') + ' yazımızı okuyabilirsiniz.') +
            sss([('Hacim ne demek, toprak pakete dahil mi?', 'Hacim, yatağın alacağı yaklaşık toprak miktarıdır. Toprak ürüne dahil değildir; yatağı ayrıca doldurmanız gerekir.'),
                 ('Yatağı sonradan büyütebilir miyim?', 'Evet. Modüler Yükseltilmiş Bahçe Yatağı Uzatma Seti, yatağın genişliğine 25 cm ekler. Set tek başına yatak olarak kullanılmaz; yalnızca modüler yatak sistemini genişletir.'),
                 ('Klasik yataklara bitki destek ünitesi takılır mı?', 'Evet. 60 cm genişlikteki bir ünite 85 × 60 ve 110 × 60 cm yataklara uyar; 85 ve 110 cm genişlikteki üniteler de kendi genişliklerindeki yataklarla kullanılır. Ayrıntı için ' + A(S_DESTEK, 'bitki destek üniteleri') + ' kategorisine bakın.'),
                 ('Hangi renkler var?', 'Yataklar bej ve gri renk seçeneğiyle sunulur.')]) +
            h2('Diğer Yatak Serileri') +
            p_('Daha geniş ya da farklı ölçüler için ' + A(S_SEKILLI, 'şekilli sebze yataklarına') + ', dar şeritler için ' + A(S_UZUN, 'uzun sebze yataklarına') + ', çiçek ve aromatik bitkiler için ' + A(S_CIC, 'çiçeklik serisine') + ' göz atın.'))
        title = 'Klasik Sebze Yatakları: No:1–10, 60×60–165×110 cm'
        meta = 'Modüler yükseltilmiş klasik sebze yatakları No:1–10: 60×60 – 165×110 cm ölçü, 30 cm yükseklik, 108–545 litre hacim. Ölçü ve toprak tablosu.'
    else:
        govde = (
            p_('<strong>Kısaca:</strong> Bu kategorideki on yatak, bahçede ya da terasta sebze ve çiçek yetiştirmek için kurulan klasik modüler yataklardır. No:1 (60 × 60 cm) en küçük, No:10 (165 × 110 cm) en büyük modeldir; hepsi 30 cm yüksekliğindedir ve 108–545 litre toprak alır.') +
            h2('Hangi Model Kaç Litre Toprak Alır?') + tb +
            h2('Kullanım Durumuna Göre Seçim') + ul([
                '<strong>Küçük teras köşesi:</strong> No:1 (60 × 60) ve No:2 (85 × 60) gibi kompakt modeller az yer kaplar.',
                '<strong>Orta boy sebze alanı:</strong> No:5 (110 × 85) ile No:7 (140 × 85) arası ölçüler, iki yandan ulaşılabilen dengeli yüzeyler sunar.',
                '<strong>Geniş ekim yüzeyi:</strong> No:9 (140 × 110) ve No:10 (165 × 110) en büyük klasik modellerdir; yaklaşık 462 ve 545 litre toprak gerekir.']) +
            h2('Yapı ve Montaj') +
            p_('Parçalar dayanıklı plastiktir. Modüler yapı sayesinde yatak elle kurulur, istenirse sökülüp başka bir yere taşınır. Bej ve gri renk seçeneği vardır.') +
            h2('Yatağı Doldurmadan Önce') +
            p_('Toprak pakette yer almaz. Yatağın hacmini yukarıdaki listeden öğrenin ve ' + A(TOPRAK[1:], 'yetiştirme topraklarını') + ' buna göre planlayın. Mevcut yatağın genişliğine 25 cm eklemek için uzatma setini ' + link(uz, 'bu bağlantıdan') + ' inceleyebilirsiniz; set tek başına yatak değildir.') +
            h2('Aklınıza Takılabilecekler') +
            h3_('Bitki destek ünitesi hangi yatağa uyar?', 'Ünite yatağın genişliğine göre seçilir: 60, 85 ya da 110 cm. Uyum ayrıntıları ' + A(S_DESTEK, 'destek üniteleri') + ' sayfalarında yazılıdır.') +
            h3_('Aynı serinin daha büyük ve farklı ölçüleri var mı?', A(S_SEKILLI, 'Şekilli seri') + ' 110 × 110 cm ile 300 × 300 cm arası ölçüler sunar; ' + A(S_UZUN, 'uzun seri') + ' ise dar şeritler içindir.'))
        title = 'Klasik Modüler Sebze Yatakları: 10 Model, 60–165 cm'
        meta = 'No:1–No:10 klasik modüler sebze yatağı modelleri: hangi ölçü kaç litre toprak alır, kime uygun, nasıl kurulur. Hepsi 30 cm yüksekliğinde.'
    G[k] = (S_KLASIK, title, meta, govde)

    # ---------- Şekilli
    k = 'Şekilli Sebze Yatakları'; ps = sirali(k)
    if h:
        tb = tablo(['Model', 'Ölçü (cm)', 'Parça adedi', 'Ürün'], [('No:' + no_of(p), olcu(p) + ' × 30', parca(p), link(p, 'Ayrıntı')) for p in ps])
        govde = (
            p_('<strong>Kısaca:</strong> Şekilli seri, No:11 ile No:29 arasındaki on dokuz modüler yükseltilmiş bahçe yatağını kapsar. Ölçüler 110 × 110 cm ile 300 × 300 cm arasındadır, yükseklik 30 cm\'dir ve yataklar dayanıklı plastik parçalardan, 16 ile 50 parça arasında kurulur.') +
            h2('Şekilli Seri Modelleri ve Ölçüleri') + tb +
            p_('Tabloda parça adedi belirtilmeyen modellerin parça sayısı ürün sayfasında yazılıdır.') +
            h2('Modeli Seçmek İçin Dört Adım') + ol([
                'Yatağın yerleşeceği alanı ölçün ve çevresinde bakım için geçiş payı bırakın.',
                'Hangi bitkileri yetiştireceğinizi düşünün: sebze, çiçek, aromatik bitki ve mevsimlik ürünler için aynı yapı kullanılır.',
                'Ölçü tablosundan alana sığan modelleri ayıklayın. Aynı ölçüde birden fazla model varsa (örneğin 140 × 85 cm için No:11 ve No:13) parça sayısını ve görünümü karşılaştırın.',
                'Kurulum süresini parça adedi belirler; parça sayısı arttıkça birleştirilecek eleman çoğalır.']) +
            h2('Teknik Özellikler') + ul([
                'Ürün tipi: modüler yükseltilmiş bahçe yatağı',
                'Yükseklik: 30 cm',
                'Malzeme: dayanıklı plastik',
                'Kurulum: modüler, kolay montaj; yatak sökülüp yeniden kurulabilir',
                'Renk seçenekleri: bej ve gri',
                'Kullanım alanı: ev bahçesi, hobi bahçesi, teras ve peyzaj alanları']) +
            h2('Yükseltilmiş Yatağın Faydası') +
            p_('Topraktan yükseltilmiş yapı ekim, sulama ve bakımı kolaylaştırır. Sınırları belirli bir yetiştirme alanı oluşturur ve bitkilerin düzenli yerleşmesine yardımcı olur. Doldurma için ' + A(TOPRAK[1:], 'sebze yetiştirme topraklarına') + ', ölçü planı için ' + B('yukseltilmis-yatak-olcusu', 'yükseltilmiş yatak ölçüsü') + ' yazımıza bakabilirsiniz.') +
            sss([('Şekilli seri ile klasik seri arasındaki fark nedir?', 'İkisi de modüler ve 30 cm yüksekliktedir. Şekilli seri No:11–29 numaralarıyla ve 110 × 110 cm ile 300 × 300 cm arası daha geniş ölçülerle sunulur.'),
                 ('Toprak pakette yer alıyor mu?', 'Hayır. Toprak ve bitkiler ürüne dahil değildir.'),
                 ('Yatak sonradan sökülebilir mi?', 'Evet. Modüler sistem sayesinde gerektiğinde sökülerek yeniden kurulabilir.'),
                 ('Hangi renkler mevcut?', 'Bej ve gri renk seçenekleri vardır.')]) +
            p_('Daha küçük ölçüler için ' + A(S_KLASIK, 'klasik sebze yataklarına') + ', dar alanlar için ' + A(S_UZUN, 'uzun sebze yataklarına') + ' bakın.'))
        title = 'Şekilli Sebze Yatakları: No:11–29, 110×110–300×300'
        meta = 'Modüler şekilli seri bahçe yatakları No:11–29: 110×110 – 300×300 cm ölçü, 30 cm yükseklik, 16–50 parçalı yapı. Model ve parça tablosu sayfada.'
    else:
        satir = ['%s: %s cm%s' % (link(p, 'No:' + no_of(p)), olcu(p), (', %s parça' % parca(p)) if parca(p) != '–' else '') for p in ps]
        govde = (
            p_('<strong>Kısaca:</strong> Şekilli seri No:11–29 aralığında on dokuz yatak modeli sunar. En küçük model 110 × 110 cm, en büyüğü 300 × 300 cm ölçüsündedir. Hepsi 30 cm yüksekliğinde, dayanıklı plastik ve modülerdir; sebze, çiçek ve aromatik bitkiler için kullanılır.') +
            h2('Tüm Modeller Bir Bakışta') + ul(satir) +
            h2('Yatak Alanını Planlarken') + ul([
                '<strong>Dar ve orta alanlar:</strong> 110 × 110, 140 × 85 ve 140 × 140 cm ölçüleri küçük bahçeler ve teraslar içindir.',
                '<strong>Geniş bahçe düzenleri:</strong> 220 × 220, 240 × 190 ve 300 × 300 cm gibi modeller geniş yüzeyler için seçilir.',
                '<strong>Aynı ölçü, farklı model:</strong> 140 × 85 cm ölçüsünde No:11 ve No:13, 110 × 110 cm ölçüsünde No:19 ve No:23 bulunur; parça adedi ve yapı ürün sayfasında karşılaştırılabilir.']) +
            h2('Ortak Özellikler') +
            p_('Tüm modellerde yükseklik 30 cm, malzeme dayanıklı plastik ve kurulum modülerdir. Yatak gerektiğinde sökülüp yeniden kurulabilir. Ev bahçesi, hobi bahçesi, teras ve peyzaj alanlarında kullanılır. Renk bej ya da gridir.') +
            h2('Doldurma ve Ekim') +
            p_('Yatağı doldurmak için ' + A(TOPRAK[1:], 'yetiştirme topraklarına') + ' göz atın; toprak ve bitkiler pakete girmez. Yatağın üstünde sarılıcı sebze yetiştirmek isterseniz ' + A(S_DESTEK, 'bitki destek ünitelerini') + ' inceleyebilirsiniz.') +
            h2('Sıkça Sorulanlar') +
            h3_('Parça sayısı neden önemli?', 'Parça adedi montajda birleştirilecek eleman sayısını gösterir; örneğin No:11 16 parçadan, No:27 50 parçadan oluşur.') +
            h3_('Küçük bir yatak arıyorsam ne yapmalıyım?', 'Daha küçük ölçüler ' + A(S_KLASIK, 'klasik seride') + ' (60 × 60 cm\'den başlayan) bulunur.'))
        title = 'Şekilli Seri Modüler Bahçe Yatakları | No:11–29'
        meta = 'Şekilli seri yataklarda 19 model: 110×110 ile 300×300 cm arası ölçü, 30 cm yükseklik, dayanıklı plastik. Tüm modeller ve parça adetleri sayfada.'
    G[k] = (S_SEKILLI, title, meta, govde)

    # ---------- Uzun
    k = 'Uzun Sebze Yatakları'; ps = sirali(k)
    rows = [('No:' + no_of(p), olcu(p) + ' × 30', alan_toprak(p)[0] + ' m²', alan_toprak(p)[1] + ' L') for p in ps]
    if h:
        tb = tablo(['Model', 'Ölçü (cm)', 'Ekim alanı', 'Toprak ihtiyacı', 'Ürün'], [r + (link(p, 'Ayrıntı'),) for r, p in zip(rows, ps)])
        govde = (
            p_('<strong>Kısaca:</strong> Uzun sebze yatakları, çit dibi, duvar kenarı, balkon ve teras kenarı gibi dar alanlara uzun bir ekim şeridi kazandırır. No:30\'dan No:41\'e on iki model vardır; boy 190, 290, 400 ve 500 cm, genişlik 34, 60 ve 85 cm, yükseklik 30 cm\'dir.') +
            h2('Uzun Seri Modelleri, Ekim Alanı ve Toprak İhtiyacı') + tb +
            p_('Ekim alanı ve toprak miktarı yaklaşık değerlerdir ve her ürün sayfasında ayrıca yazılıdır.') +
            h2('Genişlik ve Boy Nasıl Seçilir?') + ol([
                'Yatağın kullanılacağı şeridin genişliğini ölçün. 34 cm genişlik çok dar kenarlar, 60 cm orta genişlikteki şeritler, 85 cm geniş şeritler içindir.',
                'Boyu belirleyin: 190, 290, 400 ve 500 cm seçenekleri vardır.',
                'Tablodan ekim alanını okuyun; örneğin 190 × 34 cm modelde ekim alanı yaklaşık 0,63 m², 500 × 85 cm modelde yaklaşık 4,23 m²\'dir.',
                'Toprak miktarını önceden planlayın: No:30 için yaklaşık 180 litre, No:41 için yaklaşık 1180 litre toprak gerekir.']) +
            h2('Kutu İçeriği ve Kurulum') +
            p_('No:30 kutusunda 12 düz parça, 4 köşe parça, 2 gergi teli (destek mili), 60 adet M6x16 civata ve somun, 1 montaj anahtarı ve resimli kurulum kılavuzu bulunur. Ek alet gerekmez; yatak demonte olarak küçük bir kutuya sığar. Parçalar hava koşullarına dayanıklı, sağlam plastiktir ve renk seçeneği bej ve gridir.') +
            h2('Yatağı Uzatmak') +
            p_('Uzatma setindeki her düz parça yatağın boyuna 26 cm ekler. Böylece yatak ihtiyaca göre uzatılabilir.') +
            sss([('Uzun yatak hangi yerlere uygundur?', 'Çit dibi, duvar kenarı, balkon ve teras kenarı gibi dar alanlara uygundur.'),
                 ('Toprak pakette var mı?', 'Hayır. Yatağı doldurmak için toprağı ayrıca hazırlamanız gerekir; gereken miktar tabloda yazılıdır.'),
                 ('Yatağı sonradan uzatabilir miyim?', 'Evet. Uzatma setindeki her düz parça yatağın boyuna 26 cm ekler.')]) +
            p_('Toprak için ' + A(TOPRAK[1:], 'sebze yetiştirme topraklarına') + ', daha kısa ve kare yataklar için ' + A(S_KLASIK, 'klasik seriye') + ' bakın. Yatağın başında sarılıcı sebze yetiştirmek için ' + A(S_DESTEK, 'bitki destek üniteleri') + ' de bulunur.'))
        title = 'Uzun Sebze Yatakları: No:30–41, 190–500 cm Boy'
        meta = 'Çit dibi, duvar kenarı ve teras için uzun modüler bahçe yatakları No:30–41: 34/60/85 cm genişlik, 190–500 cm boy, ekim alanı ve toprak tablosu.'
    else:
        govde = (
            p_('<strong>Kısaca:</strong> Uzun seri, dar şeritlerde düzenli sebze ve çiçek yetiştirmek için tasarlanmış on iki modüler yataktır (No:30–41). Genişlikler 34, 60 ve 85 cm; uzunluklar 190, 290, 400 ve 500 cm; yükseklik tüm modellerde 30 cm\'dir.') +
            h2('Ölçülere Göre Seçim Tablosu') + tablo(['Model', 'Ölçü (cm)', 'Ekim alanı', 'Toprak ihtiyacı'], [r for r in rows]) +
            h2('Kullanım Örnekleri') + ul([
                '<strong>Çit ya da duvar dibi:</strong> 34 cm genişliğindeki modeller dar kenarlara oturur.',
                '<strong>Balkon ve teras kenarı:</strong> 60 cm genişlik, uzun bir sıra ekimi için denge sağlar.',
                '<strong>Geniş ekim şeridi:</strong> 85 cm genişlik ve 500 cm uzunluktaki No:41, yaklaşık 4,23 m² ekim alanı sunar.']) +
            h2('Kutudan Neler Çıkar?') +
            p_('Örnek olarak No:30 kutusunda 12 düz parça, 4 köşe parça, 2 gergi teli, 60 adet civata ve somun ile bir montaj anahtarı gelir; kurulum için ayrıca alet gerekmez. Kurulum kılavuzu resimlidir.') +
            h2('Ek Bilgiler') + ul([
                'Parçalar sağlam ve hava koşullarına dayanıklı plastiktir.',
                'Renk seçenekleri bej ve gridir.',
                'Uzatma setinin her düz parçası boyu 26 cm artırır.',
                'Toprak ürüne dahil değildir; ' + A(TOPRAK[1:], 'yetiştirme topraklarına') + ' bakabilirsiniz.']) +
            h2('Merak Edilenler') +
            h3_('Hangi yatak serisini seçmeliyim?', 'Dar ve uzun alanlarda uzun seri, kare ve dikdörtgen yüzeylerde ' + A(S_KLASIK, 'klasik seri') + ' ya da ' + A(S_SEKILLI, 'şekilli seri') + ' uygundur.') +
            h3_('Yatak toprak olmadan kurulabilir mi?', 'Evet; yatak kurulduktan sonra toprakla doldurulur. Gereken miktar yukarıdaki tabloda yazılıdır.'))
        title = 'Uzun Modüler Bahçe Yatakları: No:30–41 | Ölçü ve Toprak'
        meta = 'No:30–41 uzun yatak modelleri: 190–500 cm boy, 34/60/85 cm genişlik, ekim alanı ve gereken toprak miktarı tabloda. Dar alanlar için.'
    G[k] = (S_UZUN, title, meta, govde)

    # ---------- Çiçeklik
    k = 'Çiçeklik Serisi Yataklar'; ps = sirali(k)
    if h:
        tb = tablo(['Model', 'Ölçü (cm)', 'Parça adedi', 'Ürün'], [('No:' + no_of(p), olcu(p) + ' × 30', parca(p), link(p, 'Ayrıntı')) for p in ps])
        govde = (
            p_('<strong>Kısaca:</strong> Çiçeklik serisi, çiçek, aromatik bitki, süs bitkisi ve mevsimlik ürünler için tasarlanmış dört modüler yükseltilmiş yataktır (No:0, 1V2, 2V2, 3V2). Genişlik 35 cm, yükseklik 30 cm, boy 60 ile 140 cm arasındadır.') +
            h2('Çiçeklik Modelleri ve Ölçüleri') + tb +
            h2('Çiçeklik Yatağı Ne İşe Yarar?') +
            p_('Yükseltilmiş çiçeklik, sınırları belirlenmiş ve daha düzenli bir yetiştirme alanı oluşturur. 30 cm yüksekliği ekim, sulama ve bakım sırasında erişimi kolaylaştırır. Uygun bir yetiştirme ortamı hazırlandığında yükseltilmiş gövde fazla suyun tahliyesini destekler.') +
            h2('Nerede Kullanılır?') + ul(['Ev bahçesi kenarları', 'Balkon ve teras', 'Peyzaj alanları ve duvar dipleri']) +
            h2('Kurulum ve Doldurma Adımları') + ol([
                'Yatağı koyacağınız zemini düzleyin; yatak yerinde kurulduktan sonra taşınması zordur.',
                'Parçaları modüler sisteme göre birleştirin. Kurulum kolaydır ve ek alet gerektirmeyecek şekilde tasarlanmıştır.',
                'Taban ve gövde kurulduktan sonra uygun bir yetiştirme ortamıyla doldurun; ortam fazla suyun süzülmesine izin vermelidir.',
                'Doldurduktan sonra yatağı sulayın ve toprağın oturmasını bekleyin, gerekirse üstünü tamamlayın.']) +
            h2('Çiçeklikte Neler Yetiştirilir?') +
            p_('Yapı çiçek, aromatik bitki, süs bitkisi ve mevsimlik ürünler için tasarlanmıştır. Fesleğen, nane ve kekik gibi aromatik bitkiler ile mevsimlik çiçekler bu ölçüdeki dar yataklara kolay yerleşir. Yataktaki bitkilerin güneş ve su isteklerini birbirine yakın seçmeniz bakımı kolaylaştırır.') +
            h2('Doğru Boyu Seçmek') + ol([
                'Çiçekliği koyacağınız kenarın uzunluğunu ölçün.',
                '60, 85, 110 ya da 140 cm boylarından kenara sığanı seçin; genişlik her modelde 35 cm\'dir.',
                'Parça adedi ölçüyle birlikte artar: 6, 8, 10 ve 12 parça.',
                'Yatak üstüne sebze için kemer tipi destek takmak istiyorsanız 110 ve 140 cm boylu çiçeklikler uyumludur.']) +
            sss([('Çiçeklik yatağa sebze de dikilir mi?', 'Yapı çiçek, aromatik bitki, süs bitkisi ve mevsimlik ürünler için tasarlanmıştır. Sebze için ' + A(S_KLASIK, 'klasik') + ' ya da ' + A(S_UZUN, 'uzun') + ' seriler daha geniş ekim alanı sunar.'),
                 ('Montajı zor mu?', 'Hayır. Sistem modülerdir ve kolay montajla kurulur; gerektiğinde sökülüp yeniden kurulabilir.'),
                 ('Hangi renkler var?', 'Bej ve gri.')]) +
            p_('Dolduracağınız toprak için ' + A('genel-kullanim-ve-saksi-topraklari', 'genel kullanım ve saksı topraklarına') + ' göz atabilirsiniz. Balkon çiçekliği seçimi için ' + B('balkon-cicekligi-secimi', 'balkon çiçekliği seçimi') + ' yazımız yararlı olacaktır.'))
        title = 'Çiçeklik Serisi Yataklar: No:0, 1V2, 2V2, 3V2'
        meta = 'Çiçek, aromatik bitki ve mevsimlik ürünler için modüler çiçeklik yatakları: 35 cm genişlik, 30 cm yükseklik, 60–140 cm boy. Ölçü ve parça tablosu.'
    else:
        satir = ['%s: %s cm, %s parça' % (link(p, 'No:' + no_of(p)), olcu(p) + ' × 30', parca(p)) for p in ps]
        govde = (
            p_('<strong>Kısaca:</strong> Dört çiçeklik modeli de 35 cm genişliğinde ve 30 cm yüksekliğindedir; boyları 60, 85, 110 ve 140 cm\'dir. Dayanıklı plastik parçalarla kurulur, bej ve gri renk seçeneğiyle gelir ve çiçek, aromatik bitki, süs bitkisi ve mevsimlik ürünler için düzenli bir alan sağlar.') +
            h2('Modeller') + ul(satir) +
            h2('Kullanım Alanları') +
            p_('Çiçeklikler ev bahçesi, balkon, teras ve peyzaj alanları için uygundur. Yerden yüksek duran gövde bakımı kolaylaştırır; sistem sökülüp başka bir yere kurulabilir.') +
            h2('Kurulumdan Ekime') + ul([
                'Yatağı kuracağınız zemini önce düzleyin.',
                'Parçaları modüler yapıya göre birleştirin; kurulum basittir.',
                'Su süzülmesine izin veren bir yetiştirme ortamı doldurun, sulayın ve toprağın oturmasını bekleyin.',
                'Birbirine yakın su ve ışık isteyen bitkileri aynı çiçekliğe dikin.']) +
            h2('Ne Yetişir?') +
            p_('Çiçekler, aromatik bitkiler, süs bitkileri ve mevsimlik ürünler için uygundur. Fesleğen, nane ve kekik gibi aromatik bitkiler dar yatakta rahatça yer bulur.') +
            h2('Seçim İçin Kısa Rehber') + ul([
                'Boy, yerleşeceği kenara göre seçilir: kısa kenarlar için 60–85 cm, uzun kenarlar için 110–140 cm.',
                'Modelin parça sayısı boyla birlikte artar (6 – 12 parça).',
                '110 ve 140 cm boylu çiçeklikler, kemer tipi bitki destek ünitesiyle birlikte kullanılabilir.']) +
            h2('Sorular') +
            h3_('Çiçeklik ile sebze yatağı arasındaki fark nedir?', 'Çiçekliklerin genişliği 35 cm\'dir ve çiçek, aromatik bitki, süs bitkisi gibi bitkiler için düzenli bir alan sağlar. Sebze ekimi için daha geniş yüzeyli ' + A(S_KLASIK, 'sebze yatakları') + ' vardır.') +
            h3_('Toprak gerekir mi?', 'Evet; çiçeklik toprak olmadan gelir. Doldurmak için uygun bir bitki toprağı hazırlanır.'))
        title = 'Modüler Çiçeklik Yatakları 60–140 cm | Bahçe Kulesi'
        meta = 'Çiçeklik serisi dört model: 60, 85, 110 ve 140 cm boy, 35 cm genişlik, 30 cm yükseklik. Balkon, teras ve bahçe için modüler çiçekler yatağı.'
    G[k] = (S_CIC, title, meta, govde)

    # ---------- Balkon ve Teras
    k = 'Balkon ve Teras Sebze Yatakları'; ps = grup[k]
    no4 = [p for p in ps if 'No:4' in p['n']]; sehpa = [p for p in ps if 'Sehpalı' in p['n']]
    if h:
        govde = (
            p_('<strong>Kısaca:</strong> Balkon ve teras sebze yatakları, zemini ıslatmadan ve kirletmeden sebze yetiştirmek için tasarlanmıştır. No:4 serisi 110 × 60 cm ölçüsünde, kapalı tabanlı ve alt tepsilidir; sabit ayaklı ve tekerlekli iki versiyonu vardır. Sehpalı 60 × 112 cm modeller yatağı bel hizasına çıkarır.') +
            h2('No:4 Balkon ve Teras Sebze Yatağı') +
            p_('No:4 serisi, 16 ayak ya da 16 tekerlek üzerinde yükselen kapalı gövdeli bir yetiştirme kasasıdır. Alt tepsisi sulama suyunu tutar; fayans, ahşap, beton ve mermer yüzeylerde iz bırakmaz. Ürünler: ' + ', '.join(link(p, ('Tekerlekli' if 'Tekerlekli' in p['n'] else 'Sabit ayaklı') + ' No:4') for p in no4) + '.') +
            tablo(['Özellik', 'Değer'], [('Ölçü', '110 cm genişlik × 60 cm derinlik × 38 cm toplam yükseklik'), ('Toprak derinliği ve hacmi', '30 cm, yaklaşık 198 litre'), ('Malzeme', 'UV dayanımlı polipropilen (PP)'), ('Drenaj', 'Tabanda drenaj kanalları, köşelerde tahliye çıkışları, alt tepsi'), ('Taşıma kapasitesi', 'Toplam 400 kg'), ('Renk', 'Bej ve gri')]) +
            h2('Sehpalı Balkon Sebze Yatakları (60 × 112 cm)') +
            p_('Sehpalı modellerde 60 × 112 × 30 cm modüler yatak, galvaniz profil sehpanın üstünde bel hizasında durur; bel hizasında ekim ve hasat eğilmeyi azaltır. Yatak altlığı süzülen suyu ve toprağı tutar.') +
            tablo(['Model', 'Toplam yükseklik', 'Fark'], [(link(p, p['n'].split(' – ')[0]), ('1,92 m' if ('Gölgelikli Sehpalı' in p['n'] and 'Tekerlekli' not in p['n']) else '2,00 m' if 'Gölgelikli ve Tekerlekli' in p['n'] else '88 cm' if 'Tekerlekli' in p['n'] else '80 cm'),
                                                  ('gölgelik çerçevesi' if 'Gölgelikli' in p['n'] and 'Tekerlekli' not in p['n'] else 'gölgelik çerçevesi ve 6 frenli tekerlek' if 'Gölgelikli' in p['n'] else '6 frenli tekerlek' if 'Tekerlekli' in p['n'] else 'sabit sehpa')) for p in sehpa]) +
            h2('Hangi Modeli Seçmeli?') + ol([
                'Zeminin ıslanmaması en önemliyse kapalı tabanlı No:4 serisine bakın.',
                'Bel hizasında çalışmak istiyorsanız sehpalı 60 × 112 cm modelleri seçin.',
                'Balkonda yatağı güneşe ya da gölgeye taşımak için tekerlekli versiyonlar frenle sabitlenir.',
                'Yaz güneşinden korumak için gölgelik çerçevesi olan modelde gölge filesi gerilebilir; file, toprak ve bitkiler ürüne dahildir değildir.']) +
            sss([('Balkona sulama suyu sızar mı?', 'No:4 serisinin kapalı gövdesi ve alt tepsisi suyu tutar; zemin temiz kalır.'),
                 ('Tekerlekli yatak sabit durabilir mi?', 'Evet. Tekerlekli sehpalı modellerde 6 frenli tekerlek vardır; yatak frenle sabitlenir. No:4 tekerlekli modelde kutudan çıkan 16 sabit ayakla tekerleksiz de kurulabilir.'),
                 ('Toprak pakette var mı?', 'Hayır. Toprak, gölge filesi ve bitkiler ürüne dahil değildir.')]) +
            p_('Toprak için ' + A(TOPRAK[1:], 'sebze yetiştirme topraklarına') + ', ekim planı için ' + B('balkon-sebze-yatagi', 'balkon sebze yatağı') + ' yazımıza bakın. Büyük yataklar için ' + A(S_KLASIK, 'klasik sebze yatakları') + ' de bulunur.'))
        title = 'Balkon ve Teras Sebze Yatakları: Sabit, Tekerlekli'
        meta = 'Balkon ve teras için kapalı tabanlı No:4 sebze yatağı (sabit ayaklı, tekerlekli) ve bel hizasında sehpalı 60×112 cm modeller. Ölçü ve özellikler.'
    else:
        govde = (
            p_('<strong>Kısaca:</strong> Bu kategorideki yataklar balkon ve terasta yetiştirmek isteyenler içindir. No:4 modelleri 110 × 60 cm taban ölçüsünde ve kapalı gövdelidir: sulama suyu alt tepsiye süzülür, zemin ıslanmaz. 60 × 112 cm sehpalı modeller ise bitkileri bel hizasına taşır.') +
            h2('No:4 Serisi: Temiz Zemin İçin') + ul([
                '16 sabit ayak üzerinde yükselir; tekerlekli versiyonda 16 tekerlek bulunur.',
                'Ölçü: 110 × 60 cm taban, 38 cm toplam yükseklik; toprak derinliği 30 cm, yaklaşık 198 litre toprak.',
                'Gövde UV dayanımlı polipropilen (PP) ve bej ya da gri renktedir.',
                'Tabandaki drenaj kanalları, köşelerdeki tahliye çıkışları ve alt tepsi suyu yönetir; toplam taşıma kapasitesi 400 kg\'dır.']) +
            p_('Ürünler: ' + ', '.join(link(p, ('Tekerlekli' if 'Tekerlekli' in p['n'] else 'Sabit ayaklı') + ' No:4') for p in no4) + '.') +
            h2('60 × 112 cm Sehpalı Yataklar: Bel Hizasında') +
            p_('Yatak galvaniz profil sehpanın üstünde durur ve yatak altlığı süzülen suyu ve toprağı tutar. Dört versiyon vardır:') +
            ul(['%s: toplam yükseklik %s' % (link(p, p['n'].split(' – ')[0]), ('1,92 m' if ('Gölgelikli Sehpalı' in p['n'] and 'Tekerlekli' not in p['n']) else '2,00 m' if 'Gölgelikli ve Tekerlekli' in p['n'] else '88 cm' if 'Tekerlekli' in p['n'] else '80 cm')) for p in sehpa]) +
            h2('Seçim Notları') + ul([
                'Balkonda alan sık değişiyorsa tekerlekli versiyonu seçin; frenle sabitlenir.',
                'Öğle güneşi güçlü bir balkon için gölgelik çerçeveli sehpalı model gölge filesi gerilmesine imkân verir (file ürüne dahil değildir).',
                'Toprak ve bitkiler hiçbir modelde pakete dahil değildir.']) +
            h2('Sorular') +
            h3_('Balkon zemini zarar görür mü?', 'Kapalı gövde ve alt tepsi sulama suyunu zemine akıtmaz; yatak altlığı da süzülen suyu ve toprağı tutar.') +
            h3_('Daha geniş bir yatak istersem?', 'Terasta daha geniş alan varsa ' + A(S_SEKILLI, 'şekilli seri') + ' ya da ' + A(S_KLASIK, 'klasik seri') + ' seçeneklerine bakabilirsiniz.'))
        title = 'Balkon ve Teras İçin Sebze Yatakları | No:4 ve Sehpalı'
        meta = 'Balkonda zemini ıslatmayan kapalı tabanlı sebze yatağı No:4 ve bel hizasında sehpalı 60×112 cm modeller: ölçüler, tekerlek, gölgelik farkları.'
    G[k] = (S_BALKON, title, meta, govde)

    # ---------- Dikey Tarım Kuleleri
    k = 'Dikey Tarım Kuleleri'; ps = grup[k]
    ye = [p for p in ps if 'Yediveren Bahçe Kulesi –' in p['n']][0]; yk = [p for p in ps if 'Yediveren' in p['n'] and 'Kat' in p['n']][0]
    y6 = [p for p in ps if 'Yonca Sabit' in p['n'] and '6 Kat' in p['n']][0]; y8 = [p for p in ps if 'Yonca Sabit' in p['n'] and '8 Kat' in p['n']][0]
    ykt = [p for p in ps if 'Yonca' in p['n'] and 'Kat İlavesi' in p['n']][0]; tk = [p for p in ps if 'Tekerlek Seti' in p['n']][0]
    if h:
        govde = (
            p_('<strong>Kısaca:</strong> Dikey tarım kuleleri, bitkileri geniş bir yüzeye yaymak yerine katlı bir sistemde yetiştirir. İki seri vardır: 42 gözlü Yediveren (100 cm yükseklik, 55 cm genişlik) ve 24 ya da 32 gözlü Yonca (35 cm genişlik). Balkon, teras, bahçe ve sera gibi alanlarda taban alanını verimli kullanırlar.') +
            h2('Yediveren ve Yonca Kulelerinin Karşılaştırması') +
            tablo(['Özellik', 'Yediveren', 'Yonca 6 kat', 'Yonca 8 kat'], [('Dikim gözü', '42', '24', '32'), ('Yükseklik', '100 cm', '75 cm', '100 cm'), ('Genişlik', '55 cm', '35 cm', '35 cm'), ('Yükseltilebilirlik', '20 kata kadar', '15 kata kadar', '15 kata kadar'), ('Ürün', link(ye, 'Yediveren Bahçe Kulesi'), link(y6, 'Yonca 6 Kat'), link(y8, 'Yonca 8 Kat'))]) +
            h2('Kat İlaveleri ve Tekerlek Seti') + ul([
                link(yk, 'Yediveren Kat İlavesi') + ': 55 cm genişlik, 15 cm ilave yükseklik; Yediveren kuleyi 20 kata kadar yükseltir.',
                link(ykt, 'Yonca Kat İlavesi') + ': 35 cm genişlik, 11 cm ilave yükseklik; Yonca kuleyi 15 kata kadar yükseltir.',
                link(tk, 'Tekerlek Seti') + ': 7 adet 11 mm sekmanlı tekerlek, toplam taşıma kapasitesi 175 kg; kuleyi toprak doluyken bile hareket ettirir.']) +
            h2('Kuleye Ne Dikilir?') +
            p_('Kuleler çilek, yeşillik, aromatik bitkiler ve kompakt sebze türleri için katlı bir yetiştirme alanı sunar. Ayrıntılı rehber için ' + B('bahce-kulesine-ne-ekilir', 'bahçe kulesine ne ekilir') + ', ' + B('dikey-tarim-nedir', 'dikey tarım nedir') + ' ve ' + B('bahce-kulesi-secimi', 'bahçe kulesi seçimi') + ' yazılarına bakabilirsiniz.') +
            h2('Kule Nereye Konur?') +
            p_('Kuleyi bitkilerin güneş isteğine uygun, taban alanının sınırlı olduğu bir noktaya yerleştirin: balkon köşesi, teras kenarı ya da sera içi. Tekerlek seti varsa kule toprak doluyken bile yer değiştirebilir; böylece mevsime göre güneşe ya da korunaklı bir alana çekilebilir.') +
            h2('Seçmek İçin Dört Soru') + ol([
                'Ne kadar yeriniz var? Yonca 35 cm, Yediveren 55 cm genişliktedir.',
                'Kaç bitki istiyorsunuz? Dikim gözü sayısı 24, 32 ve 42\'dir.',
                'Kuleyi yükseltmeyi düşünüyor musunuz? Kat ilaveleri yalnızca kendi serisinin kulesiyle uyumludur.',
                'Kuleyi hareket ettirecek misiniz? Tekerlek seti taşıma kapasitesi 175 kg\'dır; kat ilavesi ekleyince toplam ağırlığı kontrol edin.']) +
            sss([('Yediveren kulesinde sulama nasıl yapılır?', 'Tek noktadan sulama sistemi vardır; su üst bölümden verilir ve katlar arasında dağıtılır.'),
                 ('Kuleler hangi malzemeden yapılır?', 'Yediveren kulesi polipropilen (PP) plastiktir.'),
                 ('Kat ilavesi her kuleye takılır mı?', 'Hayır. Her ilave yalnızca kendi serisiyle (Yediveren ya da Yonca) uyumludur.')]) +
            p_('Kuleyi doldurmak için ' + A(TOPRAK[1:], 'sebze yetiştirme topraklarına') + ' ve ' + A('fideler', 'fidelere') + ' göz atabilirsiniz.'))
        title = 'Dikey Tarım Kuleleri: Yediveren ve Yonca Bahçe Kulesi'
        meta = 'Balkon ve bahçe için modüler dikey tarım kuleleri: 42 gözlü Yediveren, 24 ve 32 gözlü Yonca; kat ilaveleri ve tekerlek seti. Karşılaştırma tablosu.'
    else:
        govde = (
            p_('<strong>Kısaca:</strong> Az taban alanında çok bitki yetiştirmek için iki dikey kule serisi vardır. Yediveren kulesi 42 dikim gözü ve 55 cm genişlikle, Yonca kuleleri 24 ya da 32 göz ve 35 cm genişlikle sunulur. Kuleler çilek, yeşillik, aromatik bitki ve kompakt sebzeler içindir.') +
            h2('Seriler') + ul([
                link(ye, 'Yediveren Bahçe Kulesi') + ': 42 dikim gözü, 100 cm yükseklik, 55 cm genişlik; tek noktadan sulama sistemi ve 2 tahliye tapası; uyumlu ilavelerle 20 kata kadar yükseltilebilir.',
                link(y6, 'Yonca 6 katlı kule') + ': 24 göz, 75 cm yükseklik, 35 cm genişlik; 15 kata kadar yükseltilebilir.',
                link(y8, 'Yonca 8 katlı kule') + ': 32 göz, 100 cm yükseklik, 35 cm genişlik; 15 kata kadar yükseltilebilir.']) +
            h2('Aksesuarlar') + ul([
                link(yk, 'Yediveren kat ilavesi') + ' kuleye 15 cm yükseklik katar.',
                link(ykt, 'Yonca kat ilavesi') + ' 11 cm yükseklik katar.',
                link(tk, 'Tekerlek seti') + ' 7 adet sekmanlı tekerlekle 175 kg taşır; ilave eklerseniz toplam ağırlığı bu sınırın altında tutun.']) +
            h2('Yerleşim İçin Pratik Notlar') + ul([
                'Taban alanı en dar olan yerde 35 cm genişlikteki Yonca kuleleri öne çıkar.',
                'Kulenin yerini bitkilerin güneş isteğine göre seçin; tekerlek seti kuleyi mevsime göre taşımayı kolaylaştırır.',
                'Kat ilavesi eklemeden önce toplam yüksekliği ve ağırlığı kontrol edin.']) +
            h2('Kule Nerede ve Nasıl Kullanılır?') +
            p_('Balkon, teras, bahçe, sera ve hobi yetiştiriciliğinde kullanılır. Dikey düzen bitkileri geniş bir alana yaymak yerine katlar halinde yetiştirmeyi sağlar. Yediveren kulesi polipropilen (PP) plastiktir. Doldurma için ' + A(TOPRAK[1:], 'yetiştirme topraklarına') + ' bakın.') +
            h2('Sorular') +
            h3_('Hangi seriyi seçmeliyim?', 'Daha çok dikim gözü istiyorsanız 42 gözlü Yediveren, dar balkon ve köşelerde ise 35 cm genişlikteki Yonca kuleleri daha az yer kaplar.') +
            h3_('Kat ilavesi karışık kullanılır mı?', 'Hayır. İlaveler yalnızca kendi serisinin kulesiyle uyumludur.') +
            h3_('Kulede yetişen fideler nereden alınır?', A('fideler', 'Fideler') + ' kategorisinde çilek, marul ve aromatik bitki fideleri bulunur.'))
        title = 'Dikey Bahçe Kuleleri, Kat İlaveleri ve Tekerlek Seti'
        meta = 'Yediveren (42 göz) ve Yonca (24/32 göz) dikey kuleleri, uyumlu kat ilaveleri ve 7 tekerlekli set: ölçü, yükseltme sınırı ve kullanım bilgileri.'
    G[k] = (S_KULE, title, meta, govde)

    # ---------- Bitki Destek Üniteleri
    k = 'Bitki Destek Üniteleri'; ps = sorted(grup[k], key=lambda p: p['n'])
    if h:
        govde = (
            p_('<strong>Kısaca:</strong> Bitki destek üniteleri, modüler sebze yatağının kısa kenarlarına takılan galvaniz çerçevelerdir. Yatağın üstünden 153 cm yükselir; yaklaşık 20 cm aralıkla gerilen iplere domates, salatalık, fasulye ve bezelye sarılarak yukarı büyür, meyveler toprakla temas etmez.') +
            h2('Üniteler ve Uyumlu Yataklar') +
            tablo(['Ünite', 'Uyumlu yatak genişliği', 'Ürün'], [('60 cm genişlik', '85 × 60 ve 110 × 60 cm yataklar', link([p for p in ps if '60 cm' in p['n']][0], 'Ayrıntı')), ('85 cm genişlik', '85 cm genişlikteki yataklar', link([p for p in ps if '85 cm' in p['n']][0], 'Ayrıntı')), ('110 cm genişlik', '110 cm genişlikteki yataklar', link([p for p in ps if '110 cm' in p['n']][0], 'Ayrıntı')), ('Kemer tipi', 'İki yatağı yeşil tünele çevirir', link([p for p in ps if 'Kemer' in p['n']][0], 'Ayrıntı'))]) +
            h2('Destek Ünitesi Ne İşe Yarar?') + ul([
                'Dikey yetiştirme: aynı yatağa daha çok bitki sığar.',
                'Daha çok hava ve güneş: mantar hastalığı riski azalır.',
                'Meyveler topraktan uzakta olgunlaşır; hasat temiz ve kolay olur.',
                'Galvaniz profil ve plastik konnektörlerle sağlam bir yapı oluşur.']) +
            h2('Hangi Yatağa Hangi Ünite?') +
            p_('Ünite, yatağın kısa kenarına takıldığı için yatağın genişliğine göre seçilir. 60 cm genişlikteki ünite 85 × 60 ve 110 × 60 cm yataklara uyar. 85 cm ve 110 cm genişlikteki üniteler kendi genişliklerindeki yataklarla kullanılır. Kemer tipi ünite ise yan yana duran iki yatağın yola bakan uzun kenarlarına takılır.') +
            h2('Kurulum Sırası') + ol([
                'Yatağı kurun ve 4 adet profil yatak birleştirme aparatını kısa kenarlardaki civatalara takın.',
                'Yatağı toprakla doldurun ve oturmasını bekleyin.',
                'Dikmeleri aparatlara oturtup üst çerçeveyi konnektörlerle tamamlayın.',
                'Çerçeveye yaklaşık 20 cm aralıkla ip gerin.']) +
            sss([('Hangi bitkiler için uygun?', 'Domates (çeri ve iri), salatalık, sırık fasulye, bezelye, küçük meyveli kabak ve kavun ile sarılıcı çiçekler.'),
                 ('Ip nasıl olmalı?', 'Sezon sonunda bitkiyle birlikte kompostlanabilen jüt ya da pamuk ip önerilir.'),
                 ('Yatak ve ip pakete dahil mi?', 'Hayır. Sebze yatağı, ip, toprak ve bitkiler ürüne dahil değildir.')]) +
            p_('Yatak seçimi için ' + A(S_KLASIK, 'klasik sebze yataklarına') + ' ve ' + A(S_CIC, 'çiçeklik serisine') + ' bakın.'))
        title = 'Sebze Yatağı Bitki Destek Üniteleri ve Kemer Tipi'
        meta = 'Sarılıcı sebzeler için galvaniz bitki destek üniteleri: 60, 85 ve 110 cm genişlik ile kemer tipi. Uyumlu yataklar, kurulum sırası ve kullanım.'
    else:
        govde = (
            p_('<strong>Kısaca:</strong> Sebze yatağının üstüne 153 cm yükselen galvaniz bir çerçeve ekleyerek domates, salatalık, fasulye ve bezelye gibi sarılan sebzeleri yukarı taşıyabilirsiniz. Dört seçenek vardır: 60, 85 ve 110 cm genişlikteki yataklar için üç ünite ve iki yatak arasına kurulan kemer tipi ünite.') +
            h2('Seçenekler') + ul([link(p, p['n'].split(' – ')[0] + (' – ' + p['n'].split(' – ')[1].split(' İçin')[0] if ' – ' in p['n'] else '')) for p in ps]) +
            h2('Çalışma Mantığı') +
            p_('Ünite yatağın kısa kenarlarına takılır. Çerçeveye yaklaşık 20 cm arayla ip gerilir ve her bitki kendi ipine sarılarak büyür. Meyveler topraktan uzakta olgunlaşır, bitki çevresinde hava ve güneş dolaşımı artar.') +
            h2('Kemer Tipi Ünite') +
            p_('Yan yana duran iki yatağı yeşil bir tünele çeviren galvaniz kemer, yatakların yola bakan uzun kenarlarına takılır ve aradaki 153 cm genişlikteki yolun üstünden geçer. Ünite 2 adet sebze yatağıyla kullanılır.') +
            h2('Hangi Bitkiler Yukarı Çıkar?') +
            p_('Domates (çeri ve iri), salatalık, sırık fasulye, bezelye, küçük meyveli kabak ve kavun ile sarılıcı çiçekler iplere sarılarak yükselir. Her bitki kendi ipine sarılır; böylece yatak üstü düzenli ve havadar kalır.') +
            h2('Önemli Notlar') + ul([
                'Yatak, ip, toprak ve bitkiler ürüne dahil değildir.',
                'Ünite yatağın boyuna göre seçilir; uyum listesi her ürün sayfasındadır.',
                'Kompostlanabilir jüt ya da pamuk ip tavsiye edilir.']) +
            h2('Sorular') +
            h3_('Hangi yataklarla kullanılır?', A(S_KLASIK, 'Klasik') + ' ve ' + A(S_CIC, 'çiçeklik') + ' serilerindeki modüler yataklarla; hangi ünitenin hangi ölçüye uyduğu ürün sayfasında listelenir.') +
            h3_('Ip aralığı ne kadar olmalı?', 'Yaklaşık 20 cm aralık önerilir.'))
        title = 'Bitki Destek Üniteleri | Sebze Yatağı Aksesuarı'
        meta = 'Domates, salatalık ve fasulye için yatağın üstünde 153 cm yükselen galvaniz çerçeveler: 60, 85, 110 cm genişlik ve iki yatak arası kemer tipi ünite.'
    G[k] = (S_DESTEK, title, meta, govde)
    return G


def h3_(q, a): return '<h3>%s</h3><p>%s</p>' % (q, a)


# ------------------------------------------------------------------ denetim
YASAK = re.compile(r'en iyi|garanti|%\s?100|ucuz|indirim|kampanya|fırsat|şifa|doğal|organik(?! madde)|ücretsiz|kargo|\+90|0553|553|\bTL\b|₺|fiyat|uzman|usta\b|sipariş|satın|sepete|stok|HasTürk|Tarım Dünyası', re.I)
ADRES = set(json.load(open(os.path.join(DEPO, 'veri', 'kategori-seo', 'adresler.json')))) | {'sebze-yatagi', 'fideler', S_KLASIK, S_SEKILLI, S_UZUN, S_CIC, S_BALKON, S_KULE, S_DESTEK} | {p['s'] for p in H['items']} | {p['s'] for p in T['items']}
hata = 0

def denetle(site, k, adres, title, meta, govde):
    global hata
    def kus(m): nonlocal_h[0] += 1; print('!', site, k, m)
    nonlocal_h = [0]
    kus_ = lambda m: (print('!', site, k, m), nonlocal_h.__setitem__(0, nonlocal_h[0] + 1))
    metin_ = re.sub(r'<[^>]+>', ' ', govde)
    if len(title) > 60: kus_('başlık %d' % len(title))
    if not 120 <= len(meta) <= 158: kus_('meta %d' % len(meta))
    if YASAK.search(metin_ + ' ' + title + ' ' + meta): kus_('yasak söz: %s' % YASAK.search(metin_ + title + meta).group(0))
    paras = re.findall(r'<p>(.*?)</p>', govde)
    if paras:
        ilk = len(re.sub(r'<[^>]+>', '', paras[0]).split())
        if ilk > 90: kus_('ilk paragraf %d kelime' % ilk)
    for pp in paras:
        n = len(re.sub(r'<[^>]+>', '', pp).split())
        if n > 150: kus_('paragraf %d kelime' % n)
    bol = re.sub(r'<[^>]+>', ' ', re.sub(r'</(li|h2|h3|th|td|p)>', '. ', govde))
    cum = [c for c in re.split(r'(?<=[.!?])\s+', bol) if len(c.split()) > 2]
    ort = sum(len(c.split()) for c in cum) / max(1, len(cum))
    if ort > 22: kus_('ortalama cümle %.1f' % ort)
    if sum(1 for c in cum if len(c.split()) > 40) > 3: kus_('40+ kelimelik cümle fazla')
    for a in re.findall(r'href="/([^"]+)"', govde):
        if a not in ADRES: kus_('mağazada olmayan adres /' + a)
    for s in re.findall(r'href="%s/([a-z0-9-]+)"' % re.escape(BLOG), govde):
        if s not in YAYIN: kus_('blogda olmayan yazı ' + s)
        elif YAYIN[s] > simdi: kus_('yayımlanmamış yazı ' + s)
    if govde.count('<p>') != govde.count('</p>') or govde.count('<ul>') != govde.count('</ul>') or govde.count('<li>') != govde.count('</li>'): kus_('etiketler dengesiz')
    kelime = len(metin_.split())
    hata += nonlocal_h[0]
    return kelime

planlar = {}
for site, dosya in (('hasturk', 'plan-hasturk.json'), ('tarim', 'plan-tarim.json')):
    G = metin(site)
    yeni = []; atama = {}
    for k, (slug, title, meta, govde) in G.items():
        if site == 'tarim':
            # blog bağlantısı yalnız HasTürk blogundadır: Tarım metinlerinde kullanılmaz
            assert BLOG not in govde, k
        w = denetle(site, k, slug, title, meta, govde)
        yeni.append(dict(name=k, slug=slug, pageTitle=title, description=meta, aciklama=govde))
        for p in grup[k]:
            if site == 'tarim' and p['s'] not in tarim_slugs: print('  Tarım\'da yok:', p['s']); continue
            atama[p['s']] = k
        print('%-8s %-34s kelime %4d  başlık %2d  meta %3d' % (site, k, w, len(title), len(meta)))
    planlar[site] = yeni
    json.dump(dict(apply=False, ust=UST, yeni=yeni, atama=atama, pasif=['Viyoller', 'Dekoratif Saksılar']), open(os.path.join(DEPO, 'scripts', 'yatak-duzen', dosya), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def seg(t):
    w = re.sub(r'<[^>]+>', ' ', t).lower().split(); return {' '.join(w[i:i + 5]) for i in range(len(w) - 4)}
print('İki mağaza metni ortak 5-gram oranı:')
for a, b in zip(planlar['hasturk'], planlar['tarim']):
    x, y = seg(a['aciklama']), seg(b['aciklama']); o = len(x & y) / max(1, min(len(x), len(y)))
    print('  %-34s %.0f%%' % (a['name'], 100 * o))
    if o > 0.30: print('! benzerlik yüksek', a['name']); hata += 1
print('HATA:', hata)
sys.exit(1 if hata else 0)
