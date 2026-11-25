# liste.json'daki ürünler için hedef mağazanın açıklama/meta dosyalarını (icerik-tarim.json, icerik-hasturk.json) üretir.
# Kaynaklar: profimod Tarım metinleri (veri/profimod/cikti/tarim.json), Bahçe Kulesi Tarım metinleri
# (veri/yeni-urunler/cikti/tarim.json), elle yazılanlar (elle-tarim.py, elle-hasturk.py).
# Paket (set) ürünler ve görselsiz fideler atlanır: paket içeriği API'den okunamıyor, fidelerin görseli/açıklaması yok.
# Kullanım: python3 veri/magaza-esitle/icerik-olustur.py
import json, re, sys
from pathlib import Path

K = Path('veri/magaza-esitle')
L = json.load(open(K / 'liste.json', encoding='utf-8'))
ns = {}
exec(open(K / 'elle-tarim.py', encoding='utf-8').read(), ns)
exec(open(K / 'elle-hasturk.py', encoding='utf-8').read(), ns)
ELLE = {'tarim': {k.strip(): v for k, v in ns['T'].items()}, 'hasturk': {k.strip(): v for k, v in ns['H'].items()}}
PROFI = {u['ad']: u for u in json.load(open('veri/profimod/cikti/tarim.json', encoding='utf-8'))['urunler']}
BKD = json.load(open('veri/yeni-urunler/cikti/tarim.json', encoding='utf-8'))
BK = {u['ad']: u for u in BKD['urunler']}

ATLA = {
    'Biber Fidesi': 'görseli ve açıklaması yok, stok 0',
    'Domates Fidesi': 'görseli ve açıklaması yok, stok 0',
    'Çilek Fidesi': 'görseli ve açıklaması yok, stok 0',
    'Ekim Ayı Sebze Tohumu Seti – 6 Çeşit Kışlık Sebze Tohumu': 'paket (set) ürün; içeriği elle kurulmalı',
    'Eylül Ayı Sebze Tohumu Seti – 8 Çeşit Kışlık Sebze Tohumu': 'paket (set) ürün; içeriği elle kurulmalı',
    'HasTürk Mükemmel Üçlü Set': 'paket (set) ürün; içeriği elle kurulmalı',
    'Heşerelere Etkili Çözüm Seti': 'paket (set) ürün; içeriği elle kurulmalı',
    'Çiçek Toprağı Bakım Seti': 'paket (set) ürün; içeriği elle kurulmalı',
    "5'li Profesyonel Toprak Düzenleyici Set": 'paket (set) ürün; içeriği elle kurulmalı',
    'Florist İkili Bakım Seti — Zararlılara ve Mantar Hastalıklarına Karşıtı Sprey Paketi': 'paket (set) ürün; içeriği elle kurulmalı',
}
TR = str.maketrans('çğıöşüÇĞİÖŞÜâÂ', 'cgiosuCGIOSUaA')
def slugla(s):
    s = s.replace('İ', 'i').replace('I', 'ı').lower().translate(TR)
    s = s.replace('×', 'x').replace('²', '2').replace('°', '').replace('&', ' ')
    s = re.sub(r'(\d),(\d)', r'\1-\2', s)
    return re.sub('-+', '-', re.sub(r'[^a-z0-9]+', '-', s).strip('-'))

def kategori_meta_tarim():
    # Galvaniz Modüler Yapılar ve Bahçe Kulesi alt kategorileri için hazır Tarım Dünyası metaları
    out = {}
    def gez(liste, yol):
        for c in liste:
            y = yol + [c['name']]
            out[' > '.join(y)] = {'pageTitle': c['pageTitle'], 'description': c['description']}
            gez(c.get('children', []), y)
    gez(BKD['kategoriler'], [])
    return out

hata = []
for site in ('tarim', 'hasturk'):
    urunler = []
    for l in L[site]:
        ad = l['ad'].strip()
        if ad in ATLA: urunler.append({'id': l['id'], 'ad': ad, 'atla': ATLA[ad]}); continue
        u = {'id': l['id'], 'ad': ad}
        if site == 'tarim' and ad in PROFI:
            x = PROFI[ad]; u['aciklama'] = x['aciklama']; u['metaData'] = x['metaData']
        elif site == 'tarim' and ad in BK:
            x = BK[ad]; u['aciklama'] = x['aciklama']; u['metaData'] = x['metaData']
            u['kategoriler'] = [['Galvaniz Modüler Yapılar', k] for k in x['kategoriler']]
        elif ad in ELLE[site]:
            x = ELLE[site][ad]
            u['aciklama'] = x['html'].strip()
            u['metaData'] = {'slug': l['slug'] if site == 'tarim' else slugla(ad), 'pageTitle': x['pageTitle'], 'description': x['description']}
            if 'kategoriler' in x: u['kategoriler'] = x['kategoriler']
            if 'marka' in x: u['marka'] = x['marka']
        else:
            hata.append(f'{site}: metin yok: {ad}'); continue
        t, m = u['metaData']['pageTitle'], u['metaData']['description']
        if not 30 <= len(t) <= 60: hata.append(f'{site} başlık {len(t)}: {t}')
        if not 120 <= len(m) <= 158: hata.append(f'{site} açıklama {len(m)}: {m}')
        urunler.append(u)
    sluglar = [u['metaData']['slug'] for u in urunler if 'metaData' in u]
    if len(sluglar) != len(set(sluglar)): hata.append(f'{site}: tekrarlanan slug')
    out = {'site': site, 'kategoriMeta': kategori_meta_tarim() if site == 'tarim' else {}, 'urunler': urunler}
    json.dump(out, open(K / f'icerik-{site}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{site}: {sum(1 for u in urunler if not u.get("atla"))} ürün, {sum(1 for u in urunler if u.get("atla"))} atlanacak')
for h in hata: print('HATA', h)
sys.exit(1 if hata else 0)
