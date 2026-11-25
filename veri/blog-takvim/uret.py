# 18 Ocak – 24 Nisan 2027 yayın takvimi (günde 5–7 yazı): planlardaki yazılmamış konuları günlere ve saatlere yerleştirir.
# Girdi: docs/blog-ocak-subat-plani.txt, docs/blog-60gun-plani-2.txt, docs/blog-nisan-plani.txt  Çıktı: docs/blog-3ay-takvim.txt
import re, datetime, glob
G0 = datetime.date(2027, 1, 18) - datetime.timedelta(days=85)       # gün 85 = 18 Ocak
def tarih(g): return G0 + datetime.timedelta(days=g)
tr = lambda s: s.lower().strip()
yazilan = set()
for f in [x for x in glob.glob('veri/blog-paket/*.txt') if not x.endswith('p27-1.txt')]:
    for m in re.finditer(r'^odak:\s*(.*)$', open(f, encoding='utf8').read(), re.M): yazilan.add(tr(m.group(1)))
def oku(f):
    out = []
    for l in open(f, encoding='utf8'):
        if re.match(r'^[A-Z0-9]\|', l):
            r = [x.strip() for x in l.rstrip('\n').split('|')]
            r += [''] * (5 - len(r))
            if r[0] != '0' and tr(r[2]) not in yazilan: out.append(r)
    return out
konu = oku('docs/blog-ocak-subat-plani.txt') + oku('docs/blog-60gun-plani-2.txt') + oku('docs/blog-nisan-plani.txt')
# ocak-subat planında gün aralığı yok ya da dar; 60gun-2'de 116-151 arası; nisan'da tek gün
GBAS, GSON = 85, 181
# günlük kapasite: Nisan (152-181) günde 5 (150 yazı, planda tek güne sabit); önceki dönemde hafta sonu 5, hafta içi 6 (ve gerekirse 7)
nis = [k for k in konu if k[4] and int(k[4].split('-')[0]) >= 152]
onc = [k for k in konu if k not in nis]
kap = {}
gun_onc = list(range(85, 152))
hs = [g for g in gun_onc if tarih(g).weekday() >= 5]
hi = [g for g in gun_onc if tarih(g).weekday() < 5]
for g in hs: kap[g] = 5
rest = len(onc) - 5 * len(hs)
tab = rest // len(hi); ek = rest - tab * len(hi)          # hafta içi tab ya da tab+1
for i, g in enumerate(hi): kap[g] = tab + (1 if i < ek else 0)
for g in range(152, 182): kap[g] = 5
assert all(5 <= v <= 7 for v in kap.values()), kap
atama = {}
bos = dict(kap)
def aralik(k):
    g = k[4]
    if not g: return (85, 151)
    a, b = (g.split('-') + [g])[:2]
    a, b = int(a), int(b or a)
    return (max(a, GBAS), min(b, GSON))
# 1) aralığı olan konular dar aralıktan başlayarak, aralığındaki en boş güne
sirali = sorted([k for k in konu if k[4]], key=lambda k: (aralik(k)[1] - aralik(k)[0], aralik(k)[0]))
for k in sirali:
    a, b = aralik(k)
    adaylar = [g for g in range(a, b + 1) if bos.get(g, 0) > 0]
    if not adaylar:
        # aralık dolu: en yakın boş günü ara (aralığın sonunu aşmadan yalnız ileri değil, iki yöne)
        adaylar = sorted([g for g in bos if bos[g] > 0], key=lambda g: min(abs(g - a), abs(g - b)))[:1]
    g = max(adaylar, key=lambda g: bos[g]) if len(adaylar) > 1 and aralik(k)[1] - aralik(k)[0] > 0 else adaylar[0]
    atama[id(k)] = g; bos[g] -= 1
# 2) aralığı olmayan konular dosya sırasıyla boş yerlere
for k in [k for k in konu if not k[4]]:
    g = min(g for g in sorted(bos) if bos[g] > 0)
    atama[id(k)] = g; bos[g] -= 1
assert all(v == 0 for v in bos.values()), {g: v for g, v in bos.items() if v}
KAT = {'bb': 'bitki-bakimi', 'ci': 'cicekler', 'tr': 'toprak-rehberi', 'gu': 'gubreleme', 'sm': 'sebze-meyve', 'bi': 'bahce-ipuclari', 'et': 'ekim-takvimi', 'gd': 'gundem'}
SAAT = {5: ['09:10', '11:35', '14:05', '16:40', '19:30'], 6: ['08:45', '10:20', '12:10', '14:30', '16:55', '19:40'], 7: ['08:30', '09:55', '11:25', '13:10', '15:05', '17:20', '19:50']}
YAZAR = ['Halil İbrahim Çelik', 'Mehmet Fatih Çelik', 'Mikdat Çelik', 'Rümeysa Altınova', 'Ahmet Sacit Çelik', 'Hatice Kübra Çelik', 'Muhammed Hamza Çelik']
satir = ['# HasTürk Blog: 18 Ocak – 24 Nisan 2027 yayın takvimi (günde 5–7 yazı, toplam %d yazı)' % len(konu),
         '# Biçim: tarih saat | kategori | odak | çalışma başlığı | plan dosyası | yazar | durum (yazıldı:pNN-N ya da boş)',
         '# Kaynak: docs/blog-ocak-subat-plani.txt, docs/blog-60gun-plani-2.txt, docs/blog-nisan-plani.txt (üretici: veri/blog-takvim/uret.py)', '']
gunler = {}
for k in konu: gunler.setdefault(atama[id(k)], []).append(k)
sayac = 0
for g in sorted(gunler):
    L = gunler[g]; saat = SAAT[len(L)]
    satir.append('## %s (%d yazı)' % (tarih(g).strftime('%d.%m.%Y'), len(L)))
    for i, k in enumerate(L):
        kat = KAT[k[1].split()[-1]]; sayac += 1
        kaynak = 'ocak-subat' if k in onc[:len([x for x in onc if x in oku('docs/blog-ocak-subat-plani.txt')])] else ''
        satir.append('%s %s | %s | %s | %s | %s | %s |' % (tarih(g).isoformat(), saat[i], kat, k[2], k[3], 'plan', YAZAR[(sayac - 1) % 7]))
    satir.append('')
open('docs/blog-3ay-takvim.txt', 'w', encoding='utf8').write('\n'.join(satir))
print(len(konu), 'yazı,', len(gunler), 'gün; günlük sayılar:', sorted(set(len(v) for v in gunler.values())))
