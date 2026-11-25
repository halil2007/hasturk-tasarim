#!/usr/bin/env python3
"""HasTürk kategori SEO metinlerini (galvaniz.py, diger.py) denetleyip hasturk.json'ı üretir.

Kullanım: python3 veri/kategori-seo/hazirla.py [kategoriler.json]
  kategoriler.json: kategori-seo.yml "oku" çıktısı (kategori-seo-veri dalı). Verilmezse kimlikler
  mevcut hasturk.json'dan alınır.

Denetimler: başlık ≤ 60, meta 120–158 karakter; mağaza içi bağlantılar var olan kategori adreslerine;
blog bağlantıları yayımlanmış yazılara gider. Henüz yayımlanmamış yazıya bağlantı içeren paragraf çıkarılır
(yazılar yayımlandıktan sonra bu betik yeniden çalıştırılıp yazılırsa bağlantılar eklenir).
"""
import json, re, sys, glob, datetime, os

KOK = os.path.dirname(os.path.abspath(__file__))
DEPO = os.path.abspath(os.path.join(KOK, '..', '..'))
sys.path.insert(0, KOK)
import galvaniz, diger  # noqa: E402

CIKTI = os.path.join(KOK, 'hasturk.json')

# Kategori kimlikleri (adres → id)
if len(sys.argv) > 1:
    d = json.load(open(sys.argv[1]))
    liste = d['liste'] if isinstance(d, dict) else d
    ID = {c['metaData']['slug']: c['id'] for c in liste if c.get('metaData')}
    ADRESLER = set(ID)
else:
    eski = json.load(open(CIKTI))
    ID = {k['adres']: k['id'] for k in eski}
    ADRESLER = set(ID) | set(json.load(open(os.path.join(KOK, 'adresler.json'))))

# Blog yazılarının yayın tarihleri
simdi = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3))).strftime('%Y-%m-%d %H:%M')
YAYIN = {}
for f in glob.glob(os.path.join(DEPO, 'veri/blog-paket/*.txt')):
    slug = None
    for satir in open(f, encoding='utf8'):
        if satir.startswith('slug: '):
            slug = satir[6:].strip()
        elif satir.startswith('yayin: ') and slug:
            YAYIN[slug] = satir[7:].strip()
            slug = None
for f in glob.glob(os.path.join(DEPO, 'src/blog/icerik/*.js')):
    for slug in re.findall(r"slug:\s*['\"]([a-z0-9-]+)['\"]", open(f, encoding='utf8').read()):
        YAYIN.setdefault(slug, '2000-01-01 00:00')

hata, bekleyen = [], set()


def blog_temizle(adres, html):
    paras = re.split(r'(?=<p>|<h2>|<ul>)', html)
    kalan = []
    for p in paras:
        sluglar = re.findall(r'href="https://blog\.hasturkgubre\.com\.tr/([a-z0-9-]+)"', p)
        bilinmez = [s for s in sluglar if s not in YAYIN]
        if bilinmez:
            hata.append(f'{adres}: blogda olmayan yazı {bilinmez}')
        gelecek = [s for s in sluglar if s in YAYIN and YAYIN[s] > simdi]
        if gelecek:
            bekleyen.update(f'{s} ({YAYIN[s]})' for s in gelecek)
            if re.search(r'href="/', p) or not p.startswith('<p>'):
                hata.append(f'{adres}: yayımlanmamış yazı {gelecek} mağaza bağlantısıyla aynı paragrafta')
            # Birden çok yazı varsa yalnız yayımlanmamış olanların bağlantısını düz metne çevir
            elif len(gelecek) < len(sluglar):
                for s in gelecek:
                    p = re.sub(r'<a href="https://blog\.hasturkgubre\.com\.tr/' + s + r'">([^<]*)</a>', r'\1', p)
            else:
                continue
        kalan.append(p)
    return ''.join(kalan).strip()


def denetle(adres, html):
    for a in re.findall(r'href="/([^"]+)"', html):
        if a not in ADRESLER:
            hata.append(f'{adres}: mağazada olmayan kategori bağlantısı /{a}')
    if re.search(r'\b(uzman|usta)', html, re.I):
        hata.append(f'{adres}: "uzman/usta" geçiyor')
    if html.count('<p>') != html.count('</p>') or html.count('<ul>') != html.count('</ul>') or html.count('<li>') != html.count('</li>'):
        hata.append(f'{adres}: etiketler dengesiz')


cikti = []
for kaynak in (galvaniz.K, diger.K):
    for adres, (baslik, meta, html) in kaynak.items():
        if adres not in ID:
            hata.append(f'{adres}: kategori bulunamadı')
            continue
        if len(baslik) > 60:
            hata.append(f'{adres}: başlık {len(baslik)} karakter')
        if not 120 <= len(meta) <= 158:
            hata.append(f'{adres}: meta {len(meta)} karakter')
        html = blog_temizle(adres, html.replace('{B}', 'https://blog.hasturkgubre.com.tr'))
        denetle(adres, html)
        cikti.append({'id': ID[adres], 'adres': adres, 'pageTitle': baslik, 'description': meta, 'aciklama': html})
for adres, html in diger.YALNIZ_ACIKLAMA.items():
    if adres not in ID:
        hata.append(f'{adres}: kategori bulunamadı')
        continue
    html = blog_temizle(adres, html)
    denetle(adres, html)
    cikti.append({'id': ID[adres], 'adres': adres, 'aciklama': html})

if len({k['adres'] for k in cikti}) != len(cikti):
    hata.append('aynı kategori iki kez')
for k in cikti:
    k['kelime'] = len(re.sub(r'<[^>]+>', ' ', k['aciklama']).split())
if hata:
    print('\n'.join('HATA: ' + h for h in hata))
    sys.exit(1)
json.dump(cikti, open(CIKTI, 'w'), ensure_ascii=False, indent=1)
if len(sys.argv) > 1:
    json.dump(sorted(ADRESLER), open(os.path.join(KOK, 'adresler.json'), 'w'), ensure_ascii=False, indent=0)
print(f'{len(cikti)} kategori yazıldı ({sum(1 for k in cikti if "pageTitle" in k)} başlık+meta+açıklama, '
      f'{sum(1 for k in cikti if "pageTitle" not in k)} yalnız açıklama)')
print('Kelime: en az', min(k['kelime'] for k in cikti), 'en çok', max(k['kelime'] for k in cikti))
if bekleyen:
    print('Henüz yayımlanmadığı için bağlantısı şimdilik çıkarılan yazılar:', ', '.join(sorted(bekleyen)))
