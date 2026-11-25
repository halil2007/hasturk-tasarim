# Ürün içeriği JSON'undan (veri/*/cikti/<site>.json) ikas Excel içe aktarma dosyası üretir.
# Kullanım: python3 scripts/ikas-excel.py <ikas şablonu.xlsx> <cikti/site.json> <çıktı.xlsx> <satış kanalı> <marka>
# Şablon: ikas'tan indirilen ürün Excel'i; başlık satırı korunur, ürün satırları silinip yeniden yazılır.
import sys, json, uuid, openpyxl
from openpyxl.styles import PatternFill

sablon, kaynak, hedef, kanal, marka = sys.argv[1:6]
wb = openpyxl.load_workbook(sablon); ws = wb.active
H = [c.value for c in ws[1]]
ws.delete_rows(2, ws.max_row)
d = json.load(open(kaynak, encoding='utf-8'))
ust = d.get('ust_kategori') or d['kategoriler'][0]['name']
stok_sutun = [h for h in H if h and h.startswith('Stok:')]
sari = PatternFill('solid', fgColor='FFF2A8')
r = 2
for u in d['urunler']:
    grup = str(uuid.uuid4())
    kat = ';'.join(f'{ust}>{k}' for k in u['kategoriler'])
    sec = u.get('secenek')
    for v in (sec['degerler'] if sec else [None]):
        sku = u['sku']
        gorsel = u['gorseller']
        if v:
            sku = f"{sku}-{v.upper().replace('İ', 'I').replace('Ş', 'S').replace('Ç', 'C').replace('Ğ', 'G').replace('Ü', 'U').replace('Ö', 'O')}"
            gorsel = sec.get('gorseller', {}).get(v) or gorsel
        satir = {
            'Ürün Grup ID': grup, 'İsim': u['ad'], 'Açıklama': u['aciklama'],
            'Satış Fiyatı': int(u['fiyat']), 'İndirimli Fiyatı': int(u['indirimli']) if u.get('indirimli') else None,
            'SKU': sku, 'Silindi mi?': False, 'Marka': marka, 'Kategoriler': kat, 'Etiketler': 'kdv_20',
            'Resim URL': ';'.join(gorsel), 'Metadata Başlık': u['metaData']['pageTitle'],
            'Metadata Açıklama': u['metaData']['description'], 'Slug': u['metaData']['slug'], 'Tip': 'PHYSICAL',
            'Varyant Tip 1': sec['ad'] if v else None, 'Varyant Değer 1': v,
            'Stoğu Tükenince Satmaya Devam Et': False, 'Varyant Aktiflik': True,
        }
        for h in H:
            if h and h.startswith('Satış Kanalı:'):
                satir[h] = 'VISIBLE' if h.split(':', 1)[1] == kanal else 'PASSIVE'
        for i, h in enumerate(H, 1):
            ws.cell(r, i, satir.get(h))
            if h in stok_sutun: ws.cell(r, i).fill = sari
        r += 1
wb.save(hedef)
print(hedef, r - 2, 'satır,', len(d['urunler']), 'ürün; stok sütunları:', stok_sutun)
