#!/usr/bin/env python3
"""Serakülit vermikülit ürünlerini HasTürk ekleme planına çevirir → veri/yeni-urunler/cikti/serakulit.json

Girdi: serakulit-oku iş akışının çıktısı (serakulit-veri dalı, serakulit.json). Kullanım:
  python3 veri/yeni-urunler/serakulit.py <serakulit.json>
Fiyat = Serakülit fiyatı × 1,35 · alış fiyatı = Serakülit fiyatı · stok = Serakülit stoğu ·
seçenek türü "Farklı Paket Seçeneği" (litre) · görseller Serakülit ürün sayfalarındaki galerinin tamamı.
Yalnız vermikülit; kedi çimi ve çim adam ürünleri alınmaz (kullanıcı isteği).
"""
import json, re, sys, os

KAT = 'Vermikülit'
KAR = 1.35
SECENEK = 'Farklı Paket Seçeneği'

ORTAK_ALT = '''<h2>Vermikülit nedir, neden kullanılır?</h2>
<p>Vermikülit, ısıl işlemle genleştirilerek hafif ve gözenekli hâle getirilen doğal bir mineraldir. Gözenekli yapısı sayesinde suyu ve besin maddelerini tutar, toprağı gevşetir ve köklerin hava almasına yardımcı olur. Saksı ve bahçe toprağına karıştırıldığında sulama aralıklarının uzamasına katkı sağlar.</p>
<h2>Teknik bilgiler</h2>
<ul>
<li>Birim hacim ağırlığı: yaklaşık 78 g/L (31,5 g ≈ 400 ml)</li>
<li>1 kg ≈ 12,6 litre · 1 ton ≈ 1.260 litre</li>
<li>Bütün boylar aynı mineraldir; boylar arasında kimyasal fark yoktur, yalnızca tane büyüklüğü farklıdır.</li>
<li>Üretici: Serakülit (yerli vermikülit)</li>
</ul>
<h2>Paket seçenekleri</h2>
<p>Ürün sayfasındaki "Farklı Paket Seçeneği" alanından ihtiyacınız olan litreyi seçebilirsiniz. Hangi boyun ve ne kadar vermikülitin size uygun olduğundan emin olamazsanız müşteri hizmetlerimize (+90 553 727 2929) danışabilirsiniz. Diğer toprak düzenleyiciler için <a href="/toprak-duzenleyiciler-ve-katki-maddeleri">toprak düzenleyiciler ve katkı maddeleri</a> sayfamıza, perlitle birlikte kullanım için <a href="https://blog.hasturkgubre.com.tr/perlit-nedir-nasil-kullanilir">perlit nedir, nasıl kullanılır</a> yazımıza göz atabilirsiniz.</p>'''

BOY = {
 'Premium': dict(
   ad='Serakülit Premium Vermikülit (+11 mm, İri Tane)', slug='serakulit-premium-vermikulit',
   title='Premium Vermikülit +11 mm İri Tane | HasTürk Gübre',
   meta='Serakülit Premium vermikülit: +11 mm iri tane, yanmaz ve yalıtkan doğal mineral. Çatı izolasyonu, ambalaj ve dolgu için 5 – 100 litre paketler.',
   ust='''<p><strong>Serakülit Premium Vermikülit</strong>, +11 mm üzerindeki ham vermikülitin genleştirilip elenmesiyle elde edilen, serinin en iri taneli boyudur. Vermikülitin yanmaz ve yalıtkan yapısından en çok yararlanılan boydur.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li>Evlerde çatı ve tavan arası izolasyonunda dolgu malzemesi olarak</li>
<li>Elektrik motorlarında elektrik aksamını korumak ve oluşabilecek arızaların yangına dönüşmesini önlemek amacıyla</li>
<li>Hassas ürünlerin ve özel lenslerin paketlenmesinde, ambalaj sektöründe darbe ve ısı koruması için</li>
</ul>
<p>Bitki yetiştirmede daha ince boylar tercih edilir; saksı ve fide için <a href="/serakulit-fine-vermikulit">Fine</a> ya da <a href="/serakulit-medium-vermikulit">Medium</a> boyuna bakabilirsiniz.</p>'''),
 'Coarse': dict(
   ad='Serakülit Coarse Vermikülit (+5 mm, Kalın Tane)', slug='serakulit-coarse-vermikulit',
   title='Coarse Vermikülit +5 mm Kalın Tane | HasTürk Gübre',
   meta='Serakülit Coarse vermikülit: +5 mm kalın tane. Açık bahçe ve tarlada toprak havalandırma, köklenme; yalıtım ve yangın paneli dolgusu. 5 – 100 litre.',
   ust='''<p><strong>Serakülit Coarse Vermikülit</strong>, +5 mm üzerindeki ham vermikülitin genleştirilip elenmesiyle üretilen kalın taneli boydur. 5 mm'den büyük tanelerden oluşur.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li><strong>Bahçe ve tarla:</strong> Açık bahçe ve tarlalarda toprağı havalandırmak, bitkiyi beslemek ve köklenmeyi desteklemek için</li>
<li><strong>Ağır topraklar:</strong> Sıkışan, geç süzülen topraklarda iri taneler toprak yapısını gevşetmeye yardımcı olur</li>
<li><strong>Yapı ve izolasyon:</strong> Çatı izolasyonu, inşaatta yalıtım malzemesi ve dolgu tipi yangın paneli imalatı</li>
</ul>'''),
 'Medium': dict(
   ad='Serakülit Medium Vermikülit (Orta Tane)', slug='serakulit-medium-vermikulit',
   title='Medium Vermikülit Orta Tane: Saksı ve Bahçe | HasTürk',
   meta='Serakülit Medium vermikülit: Coarse ile Fine arası orta tane. Saksı ve bahçe toprağını havalandırır, su tutar, köklenmeyi destekler. 5 – 100 litre.',
   ust='''<p><strong>Serakülit Medium Vermikülit</strong>, iri taneli Coarse ile ince taneli Fine arasında yer alan orta boydur. Hem saksı hem bahçe toprağında dengeli bir havalanma ve su tutma sağlamak isteyenler için çok yönlü bir seçimdir.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li><strong>Saksı toprağı:</strong> Salon ve balkon bitkilerinin toprağına karıştırılarak toprağı gevşetir, suyu dengeli tutar</li>
<li><strong>Bahçe ve sebze yatağı:</strong> Toprağın havalanmasına ve köklerin rahat gelişmesine yardımcı olur</li>
<li><strong>Çelik köklendirme ve dikim:</strong> Nemli kalan, gözenekli bir ortam oluşturur</li>
</ul>'''),
 'Fine': dict(
   ad='Serakülit Fine Vermikülit (1 – 2 mm, Fide ve Tohum)', slug='serakulit-fine-vermikulit',
   title='Fine Vermikülit 1–2 mm: Fide ve Tohum İçin | HasTürk',
   meta='Serakülit Fine vermikülit: 1–2 mm, fide yetiştiriciliğinde en çok tercih edilen boy. Tohum kapağı, köklendirme ve toprak havalandırma. 5 – 100 litre.',
   ust='''<p><strong>Serakülit Fine Vermikülit</strong>, 1 mm'den büyük, 2 mm'den küçük ham vermikülitin genleştirilip elenmesiyle üretilir. Ülkemizde en çok kullanılan vermikülit boyudur ve özellikle fide yetiştiricileri tarafından tercih edilir.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li><strong>Fide yetiştiriciliği:</strong> Fide harcına karıştırılarak kökün nemli ve havalı bir ortamda gelişmesine yardımcı olur</li>
<li><strong>Tohum kapağı:</strong> Ekimden sonra tohumun üstüne ince bir tabaka olarak serilir; tohumdan en iyi verimi almak için kullanılır</li>
<li><strong>Sera ve tarla:</strong> Toprağı havalandırmak, bitkiyi beslemek ve köklenmeyi desteklemek için</li>
<li><strong>Endüstri:</strong> İnşaat ve boya sektöründe yalıtım malzemesi ve yanmaz panel yapımı</li>
</ul>
<p>Tohum ekimi için <a href="/saksi-ve-viyoller">fide viyollerimize</a> ve <a href="/sebze-tohumu">sebze tohumlarımıza</a> göz atabilirsiniz.</p>'''),
 'Superfine': dict(
   ad='Serakülit Superfine Vermikülit (0,5 – 1 mm, İnce Tane)', slug='serakulit-superfine-vermikulit',
   title='Superfine Vermikülit 0,5–1 mm İnce Tane | HasTürk Gübre',
   meta='Serakülit Superfine vermikülit: 0,5–1 mm ince tane. Yanmaz boya, macun ve panel üretimi, yalıtım malzemesi; ince dokulu karışımlar için. 5 – 100 litre.',
   ust='''<p><strong>Serakülit Superfine Vermikülit</strong>, 0,5 mm'den büyük, 1 mm'den küçük ham vermikülitin genleştirilip elenmesiyle üretilen ince taneli boydur. Her tane ham maddeden doğrudan genleştirilir; iri tanelerin kırılmasıyla elde edilmez.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li><strong>Yapı ve boya sektörü:</strong> Yalıtım malzemesi, yanmaz boya, yanmaz macun ve yanmaz panel yapımı</li>
<li><strong>Yanmaz kimyasallar:</strong> Isıya dayanıklı karışımların üretiminde dolgu olarak</li>
<li><strong>İnce dokulu karışımlar:</strong> Çok ince tohumların ve küçük çeliklerin ortamında ince bir doku istendiğinde</li>
</ul>'''),
 'Micron': dict(
   ad='Serakülit Micron Vermikülit (300 – 700 Mikron)', slug='serakulit-micron-vermikulit',
   title='Micron Vermikülit 300–700 Mikron | HasTürk Gübre',
   meta='Serakülit Micron vermikülit: 300–700 mikron, 6 kez elenmiş en ince boy. Yanmaz kumaş, yanmaz boya ve yangına dayanıklı ürünlerin üretimi için. 5 – 100 litre.',
   ust='''<p><strong>Serakülit Micron Vermikülit</strong>, 300 mikrondan büyük, 700 mikrondan küçük ham vermikülitin genleştirilip altı kez elenmesiyle üretilen en ince boydur.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li>Yanmaz kumaş ve yanmaz boya üretimi</li>
<li>Yangına dayanıklı ürünlerin üretimi; vermikülit doğal ve yanmaz bir mineraldir</li>
<li>Sanayi ve endüstriyel uygulamalarda dolgu malzemesi</li>
</ul>
<p>Bitki yetiştirme için daha iri boylar uygundur; saksı ve fide için <a href="/serakulit-fine-vermikulit">Fine</a> ya da <a href="/serakulit-medium-vermikulit">Medium</a> boyuna bakabilirsiniz.</p>'''),
 'Agroboy': dict(
   ad='Serakülit Agroboy Vermikülit 100 Litre (1 – 2,5 mm)', slug='serakulit-agroboy-vermikulit-100-litre',
   title='Agroboy Vermikülit 100 Litre, 1–2,5 mm | HasTürk Gübre',
   meta='Serakülit Agroboy vermikülit 100 litre: 1–2,5 mm, Medium ile Fine arası tane. Tarım ve bahçe toprağında havalandırma, su tutma ve köklenme için.',
   ust='''<p><strong>Serakülit Agroboy Vermikülit</strong>, Medium ile Fine boyları arasında, 1 – 2,5 mm tane büyüklüğünde bir vermikülittir. Yoğun talep üzerine tarım kullanımı için ayrıca üretilen bu boy, toprağınızın durumuna göre Medium ve Fine'a bir alternatif olarak kullanılabilir.</p>
<h2>Nerelerde kullanılır?</h2>
<ul>
<li><strong>Tarım ve bahçe:</strong> Toprağı havalandırmak, suyu tutmak ve köklenmeyi desteklemek için</li>
<li><strong>Fide ve dikim:</strong> Fide harcına ve dikim çukuruna karıştırılarak</li>
<li><strong>Saksı toprağı:</strong> Toprağın sıkışmasını azaltmak için</li>
</ul>'''),
}

def main(kaynak):
    d = json.load(open(kaynak))
    urun = {}
    for u in d['urunler']:
        if '/urun/' not in u['adres'] or re.search(r'kedi|cim-adam', u['adres']):
            continue
        m = re.search(r'– (\w+) (\d+) Litre', u.get('h1', ''))
        if not m or m[1] not in BOY:
            continue
        ld = json.loads(u['ld'][0]) if u.get('ld') else {}
        fiyat = float(ld['offers'][0]['price'])
        st = re.search(r'(\d+)\s*adet stokta', u.get('metin', ''))
        # Galeri: sorgu eki atılır, küçük önizlemeler (-100x100) alınmaz, tekrarlar ayıklanır
        gorsel = []
        for g in (u.get('gorsel') or []):
            g = (g or '').split('?')[0]
            if g and not re.search(r'-\d+x\d+\.(jpe?g|png|webp)$', g) and g not in gorsel:
                gorsel.append(g)
        if not gorsel and ld.get('image'):
            gorsel = [ld['image']]
        if any(v['litre'] == int(m[2]) for v in urun.get(m[1], [])):
            continue  # aynı sayfa sonunda / ile ikinci kez okunmuş
        urun.setdefault(m[1], []).append(dict(litre=int(m[2]), fiyat=fiyat, stok=int(st[1]) if st else 0, sku=ld.get('sku'), gorseller=gorsel, kaynak=u['adres']))
    plan = {'site': 'hasturk', 'kategoriler': [], 'urunler': []}
    for boy, b in BOY.items():
        vs = sorted(urun.get(boy, []), key=lambda x: x['litre'])
        if not vs:
            continue
        aciklama = b['ust'] + '\n' + ORTAK_ALT
        x = dict(kaynak=vs[0]['kaynak'], ad=b['ad'], kategoriler=[KAT], gorseller=[], metaData=dict(slug=b['slug'], pageTitle=b['title'], description=b['meta']), aciklama=aciklama)
        assert len(b['title']) <= 60 and 120 <= len(b['meta']) <= 158, (boy, len(b['title']), len(b['meta']))
        if len(vs) == 1:
            v = vs[0]
            x.update(fiyat=round(v['fiyat'] * KAR, 2), alis=v['fiyat'], stok=v['stok'], sku='SK-' + (v['sku'] or ''), gorseller=v['gorseller'])
        else:
            x['fiyat'] = round(vs[0]['fiyat'] * KAR, 2)
            x['secenek'] = {'ad': SECENEK, 'degerler': [f"{v['litre']} Lt" for v in vs]}
            x['varyantlar'] = [dict(deger=f"{v['litre']} Lt", fiyat=round(v['fiyat'] * KAR, 2), alis=v['fiyat'], stok=v['stok'], sku='SK-' + (v['sku'] or ''), gorseller=v['gorseller']) for v in vs]
        plan['urunler'].append(x)
    cikti = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cikti', 'serakulit.json')
    json.dump(plan, open(cikti, 'w'), ensure_ascii=False, indent=1)
    for x in plan['urunler']:
        vs = x.get('varyantlar') or [dict(deger='tek', fiyat=x['fiyat'], alis=x['alis'], stok=x['stok'], gorseller=x['gorseller'])]
        print(x['ad'], '|', ' · '.join(f"{v['deger']} {v['fiyat']} TL (alış {v['alis']}, stok {v['stok']}, {len(v['gorseller'])} görsel)" for v in vs))

if __name__ == '__main__':
    main(sys.argv[1])
