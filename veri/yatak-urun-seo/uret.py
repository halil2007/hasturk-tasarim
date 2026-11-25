# Bahçe yatağı ve kule ürün sayfaları: ad (üretici adıyla neredeyse aynı), açıklama düzeltmeleri, meta düzeltmeleri.
# Girdi: dump-<site>.json (ikas'tan okunan hali), /tmp/bk/urunler.json (bahcekulesi.com taraması, üretici adları)
# Çıktı: plan-hasturk.json / plan-tarim.json  (apply: false; uygulamak için true yapılır)
import json, re, sys
URET = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/bk/urunler.json', encoding='utf8'))

def their_key(v):
    n = v['ad']
    if 'ciceklik-serisi-yataklar' in v['kat'] and 'Çiçeklik' in n: return 'cic' + re.search(r'No:([0-9]+(?:v2)?)', n).group(1).lower()
    if 'Balkon Ve Teras Sabit' in n: return 'balkon-sabit'
    if 'Balkon Ve Teras Tekerlekli' in n: return 'balkon-tek'
    m = re.search(r'Sebze Yatağı No:(\d+) \(', n)
    if m: return 'no' + m.group(1)
    if 'Uzatma Seti' in n: return 'uzatma'
    if 'Bitki Destek' in n:
        m = re.search(r'(\d+) cm', n); return 'destek' + (m.group(1) if m else 'kemer')
    if 'Tekerlek Seti' in n: return 'tekerlek'
    if 'Kat İlavesi' in n: return 'yed-kat'
    if n.startswith('Yediveren Bahçe kulesi'): return 'yediveren'
    if n.startswith('Tekerlekli Sehpalı Sebze Yatağı'): return 'set-tek'
    if n.startswith('Gölgelikli Tekerlekli Sehpalı'): return 'set-gt'
    if n.startswith('Gölgelikli Sehpalı'): return 'set-g'
    if n.startswith('Sehpalı Sebze Yatağı 60'): return 'set-s'
    return None
TH = {}
for u, v in URET.items():
    if v.get('hata'): continue
    k = their_key(v)
    if k: TH[k] = v['ad'].replace('®', '').replace('kulesi', 'Kulesi').replace(' Ve ', ' ve ').strip()

def mine_key(n):
    if 'Çiçeklik' in n: return 'cic' + re.search(r'No:\s*([0-9]+(?:\s?[vV]2)?)', n).group(1).replace(' ', '').lower()
    m = re.search(r'(?:Şekilli|Uzun) Seri No:(\d+)', n)
    if m: return 'no' + m.group(1)
    if 'Yatağı No:1 (Sebze' in n: return 'no1'
    m = re.search(r'\(Sebze ve Çiçek\) (\d+) Litre', n)
    if m: return 'no' + str({'153': 2, '217': 3, '198': 4, '281': 5, '363': 6, '357': 7, '421': 8, '462': 9, '545': 10}[m.group(1)])
    if 'Balkon ve Teras Sebze Yatağı No:4' in n: return 'balkon-tek' if 'Tekerlekli' in n else 'balkon-sabit'
    if 'Uzatma Seti' in n: return 'uzatma'
    if 'Bitki Destek' in n:
        m = re.search(r'(\d+) cm', n); return 'destek' + (m.group(1) if m else 'kemer')
    if 'Tekerlek Seti' in n: return 'tekerlek'
    if 'Kat İlavesi' in n: return 'yed-kat' if 'Yediveren' in n else 'yon-kat'
    if 'Yediveren Bahçe Kulesi –' in n: return 'yediveren'
    if 'Yonca Sabit Bahçe Kulesi 6' in n: return 'yonca6'
    if 'Yonca Sabit Bahçe Kulesi 8' in n: return 'yonca8'
    if 'Sehpalı Balkon' in n:
        g, t = 'Gölgelikli' in n, 'Tekerlekli' in n
        return 'set-gt' if g and t else 'set-g' if g else 'set-tek' if t else 'set-s'
    raise SystemExit('anahtar yok: ' + n)

# Üretici adında olmayan ya da tek ürünün birden çok seçeneği olan kalemler: üretici adı + kısa ayırt edici
EK = {'yediveren': 'Yediveren Bahçe Kulesi 42 Gözlü', 'yonca6': 'Yonca Bahçe Kulesi 6 Kat 24 Gözlü', 'yonca8': 'Yonca Bahçe Kulesi 8 Kat 32 Gözlü',
      'yed-kat': 'Yediveren Kat İlavesi 1 Adet - 55 cm', 'tekerlek': 'Bahçe Kulesi Yediveren Tekerlek Seti - 7 Adet'}
def yeni_ad(k, eski):
    if k in EK: return EK[k]
    if k == 'yon-kat': return eski          # üreticide karşılığı yok: değişmez
    return TH[k]

TEL = re.compile(r' ?\(\+90 553 727 2929\)')
def duzelt_olcu(k, s):
    # Çiçeklik genişliği üretici adında 34 cm
    if not k.startswith('cic'): return s
    s = re.sub(r'(\d+)(\s*[x×]\s*)35(\s*[x×]\s*30)', r'\g<1>\g<2>34\g<3>', s)
    s = re.sub(r'(\d+)(\s*[x×]\s*)35(\s*cm)', r'\g<1>\g<2>34\g<3>', s)
    return s

def tum_metin(d):
    return {x['slug']: x for x in d}

def uret(site):
    d = json.load(open(f'veri/yatak-urun-seo/dump-{site}.json', encoding='utf8'))
    H = {mine_key(x['ad']): x for x in json.load(open('veri/yatak-urun-seo/dump-hasturk.json', encoding='utf8'))}
    out = []; adlar = set()
    for x in d:
        k = mine_key(x['ad']); ad = yeni_ad(k, x['ad'])
        assert ad not in adlar, ('ad tekrarı', ad); adlar.add(ad)
        ac = x['aciklama'] or ''
        if not ac.strip():
            # boş açıklama: aynı ölçüdeki / en yakın kardeşin açıklaması (HasTürk) uyarlanır
            kard = {'no18': ('no17', [('No:17', 'No:18'), ('220x220x30', '300x300x30'), ('220 x 220 x 30', '300 x 300 x 30'), ('220x220', '300x300'), ('220 x 220', '300 x 300'), ('>32<', '>44<'), ('>17<', '>18<'), ('32 Parçalı', '44 Parçalı'), ('32 parçalı', '44 parçalı'), ('32 parçadan', '44 parçadan')]),
                    'no25': ('no15', [('No:15', 'No:25'), ('>32<', '>40<'), ('>15<', '>25<'), ('32 Parçalı', '40 Parçalı'), ('32 parçalı', '40 parçalı'), ('32 parçadan', '40 parçadan')])}[k]
            ac = H[kard[0]]['aciklama']
            ac = ac.replace(H[kard[0]]['ad'], x['ad'])
            for a, b in kard[1]: ac = ac.replace(a, b)
        ac = ac.replace(x['ad'], ad)
        taban = re.sub(r' \([0-9x]+\)$', '', ad)
        if k.startswith('no') or k.startswith('uzatma') is False and k in ('no1',):
            pass
        if re.fullmatch(r'no\d+', k):
            for pat in [r'Modüler Yükseltilmiş Bahçe Yatağı (?:Şekilli Seri |Uzun Seri )?No:\d+',
                        r'Modüler Yükseltilmiş Bahçe Yatağı (?:No:\d+ )?\(Sebze ve Çiçek\) \d+ Litre',
                        r'Modüler Yükseltilmiş Bahçe Yatağı \d+\s*x\s*\d+\s*x\s*\d+ ?cm(?: [–-] \d+ ?L)?']:
                ac = re.sub(pat, taban, ac)
        ac = ac.replace('Yonca Sabit Bahçe Kulesi', 'Yonca Bahçe Kulesi')
        ac = TEL.sub('', ac)
        ac = duzelt_olcu(k, ac)
        pt = duzelt_olcu(k, x['pageTitle'] or '')
        md = duzelt_olcu(k, x['metaAciklama'] or '')
        out.append({'slug': x['slug'], 'ad': ad, 'aciklama': ac, 'pageTitle': pt, 'metaAciklama': md, '_eski': x['ad'], '_k': k})
    return out

if __name__ == '__main__':
    for site in ['hasturk', 'tarim']:
        p = uret(site)
        # meta düzeltmeleri (özel durumlar)
        for u in p:
            m = u['metaAciklama']
            if m.endswith(' ya.'): u['metaAciklama'] = re.sub(r'bej ya\.$', 'bej ve gri.', m).replace('Çit dibi, duvar kenarı, balkon ve teras kenarı gibi', 'Çit dibi, duvar ve balkon kenarı gibi')
            if u['_k'] == 'set-s' and site == 'hasturk':
                u['metaAciklama'] = 'Sehpalı balkon sebze yatağı 60×112×30 cm: galvaniz sehpa ve yatak altlığı, toplam yükseklik 80 cm. Bel hizasında çalışmaya uygun; bej ve gri seçenekleri.'
            if 114 <= len(u['metaAciklama']) < 120 and u['metaAciklama'].endswith('kolay kurulum.'): u['metaAciklama'] = u['metaAciklama'][:-1] + '; demonte gönderilir.'
            if 119 == len(u['metaAciklama']): u['metaAciklama'] = u['metaAciklama'][:-1] + '; demonte gönderilir.'
        json.dump({'apply': False, 'urunler': [{k: v for k, v in u.items() if not k.startswith('_')} for u in p]}, open(f'veri/yatak-urun-seo/plan-{site}.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print(site, len(p))
        for u in p:
            L = len(u['metaAciklama']); T = len(u['pageTitle'])
            flag = '' if 120 <= L <= 158 and T <= 60 else '  <<< meta/başlık sınırı'
            if u['ad'] != u['_eski'] or flag: print(f"  {u['_eski'][:62]:62} ⇒ {u['ad']}{flag} [{T}/{L}]")
