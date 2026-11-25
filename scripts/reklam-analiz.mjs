// Reklam ve ürün öneri motoru. Veri: GA4'e bağlı Google Ads (scripts/gsc-rapor.mjs toplar), GA4 ürün satışları, mağaza
// kataloğu (stok) ve mağaza içi aramalar. Her öneri reklam-bilgi.mjs'teki bir ilkeye dayanır ("dayanak") ve rakamlarla
// gerekçelendirilir; dayanağı olmayan öneri üretilmez.
// HİÇBİR işlem yapmaz: bağlantılar yalnız okuma iznindedir, uygulamak ekibin onayıyla Google Ads panelinden yapılır.

import { BILGI } from './reklam-bilgi.mjs';

const TL = (x) => Math.round(x).toLocaleString('tr-TR') + ' ₺';
const TL2 = (x) => x.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const S = (x) => Math.round(x).toLocaleString('tr-TR');
const Y = (x) => '%' + Math.round(x * 100);
const kat = (x) => x.toFixed(1).replace('.', ',') + '×';
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const CIHAZ = { mobile: 'Mobil', desktop: 'Masaüstü', tablet: 'Tablet' };
const MARKA = { hasturk: /has\s?t[üu]rk/i, tarim: /tar[ıi]m\s?d[üu]nyas/i };
const kucuk = (s) => String(s || '').toLocaleLowerCase('tr-TR');
const norm = (s) => kucuk(s).replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]).replace(/[^a-z0-9]+/g, ' ').trim();

// Satır biçimi: [boyut1, (boyut2), maliyet, tıklama, gösterim, oturum, satış, gelir]
const ads = (r, d = 1) => ({ k: r.slice(0, d), cost: r[d], tik: r[d + 1], gos: r[d + 2], ot: r[d + 3], sat: r[d + 4], gel: r[d + 5] });

export function reklamOneri(ozet, katalog = {}) {
  const out = [];
  const ekle = (o) => {
    if (!o.dayanak || !o.dayanak.every((d) => BILGI[d])) throw new Error('dayanaksız öneri: ' + o.tur);
    out.push({ id: o.site + ':' + o.tur + ':' + (o.anahtar || ''), ...o });
  };
  for (const g of ozet.ga || []) {
    const site = g.ad, etiket = g.etiket;
    // Kampanya adı "(" ile başlayan satırlar ((not set), (organic)…) reklam dışı oturumlardır: ayrıntı analizinden çıkarılır
    const reklamli = (rows) => (rows || []).filter((r) => r[0] && !/^\(/.test(r[0]));
    const RD = Object.fromEntries(Object.entries(g.reklamDetay || {}).map(([k, v]) => [k, k === 'onceKamp' ? v : reklamli(v)]));
    // Ürün sözlüğü: katalogdaki ürün adlarının kelimeleri; bu kelimeleri içeren arama terimi "ilgili" sayılır, negatif önerilmez
    const sozluk = new Set(Object.values(katalog).flat().flatMap((i) => norm(i.n).split(' ')).filter((w) => w.length >= 4));
    const ilgili = (q) => norm(q).split(' ').some((w) => w.length >= 4 && (sozluk.has(w) || [...sozluk].some((s) => s.startsWith(w.slice(0, 5)) && w.length >= 5)));
    const reklamVar = g.reklam && g.reklam.some((r) => r[1] > 0);
    if (reklamVar) {
      const kamp = g.reklam.map((r) => ads(r)).filter((x) => x.cost > 0);
      const T = kamp.reduce((a, x) => ({ cost: a.cost + x.cost, tik: a.tik + x.tik, sat: a.sat + x.sat, gel: a.gel + x.gel }), { cost: 0, tik: 0, sat: 0, gel: 0 });
      const ortRoas = T.cost ? T.gel / T.cost : 0;
      const once = new Map((RD.onceKamp || []).map((r) => [r[0], ads(r)]));

      for (const x of kamp) {
        const ad = x.k[0], roas = x.cost ? x.gel / x.cost : 0, cpc = x.tik ? x.cost / x.tik : 0;
        // Harcadığından az getiren kampanya
        if (x.cost >= 1500 && roas < 1) ekle({
          site, etiket, oncelik: 1, tur: 'zararli', anahtar: ad, etki: x.cost - x.gel, dayanak: ['atama', 'troas', 'ogrenme'],
          baslik: `"${ad}" Analytics'e göre harcadığından az getiriyor`,
          neden: `Son 28 günde ${TL(x.cost)} harcandı; Analytics bu kampanyaya ${S(x.sat)} satış ve ${TL(x.gel)} gelir yazdı. Her 1 ₺ reklam ${kat(roas)} döndü (sitenin ortalaması ${kat(ortRoas)}). Tıklama başı ${TL2(cpc)}${x.sat ? `, satış başı maliyet ${TL(x.cost / x.sat)}` : ', hiç satış yok'}. Analytics son tıklamayı saydığı için Ads'teki dönüşüm değeri daha yüksek olabilir; karar o rakamla birlikte verilmeli.${x.sat < 15 ? ` Satış sayısı (${S(x.sat)}) Google'ın hedef ROAS için istediği 30 günde 15 dönüşümün altında; hedef ROAS'a geçmek yerine önce harcama kalitesi düzeltilmeli.` : ''}`,
          yapilacak: ['Google Ads → Kampanyalar\'da bu kampanyanın "Dönüşüm değeri / maliyet" sütununa bakın.', 'Ads\'te de 1\'in altındaysa bütçeyi bir seferde değil %15–20 azaltın ve 7–14 gün sonuçları izleyin.', 'Aşağıdaki arama terimi ve açılış sayfası önerilerini bu kampanya için gözden geçirin.'],
        });
        // İyi dönen kampanya
        if (roas >= 2.5 && x.sat >= 5) ekle({
          site, etiket, oncelik: 2, tur: 'buyut', anahtar: ad, etki: x.gel * 0.15, dayanak: ['butce', 'ogrenme'],
          baslik: `"${ad}" iyi dönüyor: "Bütçe nedeniyle sınırlı" ise bütçe artırılabilir`,
          neden: `${TL(x.cost)} harcamayla ${S(x.sat)} satış ve ${TL(x.gel)} gelir: her 1 ₺ ${kat(roas)} döndü, sitenin ortalaması ${kat(ortRoas)}. Google'a göre bütçe artışı ancak kampanya bütçe yüzünden gösterim kaçırıyorsa ek satış getirir.`,
          yapilacak: ['Google Ads\'te kampanya durumunda "Bütçe nedeniyle sınırlı" yazıyor mu kontrol edin.', 'Yazıyorsa bütçeyi %15–20 artırın, 7–14 gün izleyin; getiri belirgin düşerse geri alın.', 'Yazmıyorsa bütçeyi artırmayın; satan arama terimlerini öne çıkarın (aşağıdaki öneri).'],
        });
        const o = once.get(ad);
        if (o && o.cost > 0) {
          if (x.cost >= o.cost * 1.25 && x.cost - o.cost >= 1000 && x.sat <= o.sat) ekle({
            site, etiket, oncelik: 1, tur: 'artis', anahtar: ad, etki: x.cost - o.cost, dayanak: ['ogrenme', 'atama'],
            baslik: `"${ad}" harcaması arttı ama satış artmadı`,
            neden: `Harcama önceki 28 güne göre ${TL(o.cost)} → ${TL(x.cost)} (+${Y((x.cost - o.cost) / o.cost)}); Analytics'e göre satış ${S(o.sat)} → ${S(x.sat)}, gelir ${TL(o.gel)} → ${TL(x.gel)}. Son değişiklik öğrenme dönemindeyse (1–2 hafta) sonuç henüz oturmamış olabilir; daha eskiyse ek harcama satış getirmemiş demektir.`,
            yapilacak: ['Google Ads → Değişiklik geçmişi\'nden son bütçe/teklif değişikliğinin tarihine bakın.', 'Değişiklik 2 haftadan eskiyse ve Ads\'teki dönüşümler de artmadıysa bütçeyi kademeli olarak eski seviyesine çekin.'],
          });
          const ocpc = o.tik ? o.cost / o.tik : 0;
          if (ocpc && cpc >= ocpc * 1.25 && x.tik >= 100) ekle({
            site, etiket, oncelik: 2, tur: 'tbm', anahtar: ad, etki: (cpc - ocpc) * x.tik, dayanak: ['kalite'],
            baslik: `"${ad}" tıklama maliyeti yükseldi`,
            neden: `Tıklama başı maliyet ${TL2(ocpc)} → ${TL2(cpc)} (+${Y((cpc - ocpc) / ocpc)}); bu dönem aynı tıklama sayısı için yaklaşık ${TL((cpc - ocpc) * x.tik)} fazla ödendi. Rekabet artışı ya da düşük kalite (reklam alaka düzeyi, açılış sayfası) tıklama maliyetini yükseltir.`,
            yapilacak: ['Arama kampanyasıysa Anahtar kelimeler ekranında kalite puanı bileşenlerine bakın ("Ortalamanın altında" olanlar).', 'Reklam metninin aranan ürünle, açılış sayfasının reklamla uyumunu kontrol edin.'],
          });
        }
      }

      // Arama terimleri: kampanyalar arası toplanır (Google: negatif ancak tüm kampanyalarda hedefin altındaysa)
      const maliyetli = !(g.reklamEksik && g.reklamEksik.terim);
      const tm = new Map();
      for (const r of RD.terim || []) {
        const q = r[1]; if (!q || /^\(/.test(q)) continue;
        const x = tm.get(q) || { q, kamp: new Set(), cost: 0, tik: 0, ot: 0, sat: 0, gel: 0, engT: 0 };
        x.kamp.add(r[0]);
        if (maliyetli) { x.cost += r[2]; x.tik += r[3]; x.ot += r[5]; x.sat += r[6]; x.gel += r[7]; } else { x.ot += r[2]; x.engT += r[3] * r[2]; x.sat += r[4]; x.gel += r[5]; }
        tm.set(q, x);
      }
      const terim = [...tm.values()].map((x) => ({ ...x, eng: x.ot ? x.engT / x.ot : 0, kampAd: [...x.kamp].join(', ') }));
      const marka = MARKA[site], herMarka = (q) => Object.values(MARKA).some((m) => m.test(q));
      const satmayan = (maliyetli ? terim.filter((x) => x.cost >= 100 && x.tik >= 8 && x.sat === 0) : terim.filter((x) => x.ot >= 15 && x.sat === 0 && x.eng < 0.4))
        .filter((x) => !herMarka(x.q)).sort((a, b) => (b.cost || b.ot) - (a.cost || a.ot));
      const bosa = satmayan.filter((x) => !ilgili(x.q)).slice(0, 15);
      const ilgiliSatmayan = satmayan.filter((x) => ilgili(x.q)).slice(0, 12);
      if (ilgiliSatmayan.length) ekle({
        site, etiket, oncelik: 2, tur: 'ilgili', etki: ilgiliSatmayan.reduce((a, x) => a + (x.cost || 0), 0) * 0.3, dayanak: ['kalite', 'negatif'],
        baslik: `${ilgiliSatmayan.length} ürünle ilgili arama tıklanıyor ama satışa dönmüyor`,
        neden: `Bu aramalar sattığınız ürünlerle ilgili${maliyetli ? ` ve toplam ${TL(ilgiliSatmayan.reduce((a, x) => a + x.cost, 0))} harcandı` : ''}, ancak hiçbir kampanyada satış getirmedi. İlgili aramayı negatife eklemek müşteriyi keser; sorun genelde reklamın götürdüğü sayfa, fiyat ya da stoktadır. Bu yüzden bunlar negatif değil, kontrol listesidir.`,
        yapilacak: ['Bu aramalarda reklamın hangi sayfaya gittiğine bakın: aranan ürün o sayfada ilk ekranda mı?', 'Fiyat ve kargo rakiplerle kıyaslanabilir mi, ürün stokta mı kontrol edin.', '2–4 hafta sonra hâlâ satış yoksa yalnız o kampanyada teklifi düşürmeyi değerlendirin.'],
        liste: ilgiliSatmayan.map((x) => [x.q, maliyetli ? `${TL(x.cost)} · ${S(x.tik)} tık` : `${S(x.ot)} oturum · etkileşim ${Y(x.eng)}`, x.kampAd]),
      });
      if (bosa.length) {
        const top = bosa.reduce((a, x) => a + (x.cost || 0), 0);
        ekle({
          site, etiket, oncelik: 1, tur: 'negatif', etki: top, dayanak: ['negatif'],
          baslik: `${bosa.length} alakasız görünen arama terimi para harcıyor`,
          neden: maliyetli ? `Bu terimlere tüm kampanyalarda toplam ${TL(top)} harcandı, hiç satış gelmedi. Alakasız olanlar negatif anahtar kelime yapılırsa bu bütçe satan aramalara kalır. Google fazla negatif eklemenin yapay zekânın yeni müşteri bulmasını engelleyebileceğini belirttiği için yalnız gerçekten alakasız olanlar seçilmeli.` : `Bu terimlerden gelen ziyaretçiler sitede kalmıyor (etkileşim %40'ın altında) ve hiçbir kampanyada satış yok. Alakasız olanlar negatife eklenebilir; ürünle ilgili olanlar için önce açılış sayfası düzeltilmeli.`,
          yapilacak: ['Listeden ürünlerinizle gerçekten ilgisiz olanları seçin (ilgili ama satmayanları değil).', 'Google Ads → Anahtar kelimeler → Negatif anahtar kelimeler: arama kampanyasına; Performance Max için kampanya ya da hesap düzeyine ekleyin.', 'Arama terimlerini 1–2 haftada bir yeniden gözden geçirin.'],
          liste: bosa.map((x) => [x.q, maliyetli ? `${TL(x.cost)} · ${S(x.tik)} tık` : `${S(x.ot)} oturum · etkileşim ${Y(x.eng)}`, x.kampAd]),
        });
      }
      // Kendi marka adına ödeme
      const markali = marka ? terim.filter((x) => marka.test(x.q) && (x.cost || 0) >= 50).sort((a, b) => b.cost - a.cost) : [];
      if (markali.length && maliyetli) {
        const gsc = (ozet.siteler || []).find((s) => s.ad === site);
        const orgSira = gsc ? Math.min(...gsc.sorgu.filter((q) => marka.test(q[0])).map((q) => q[3]), 99) : 99;
        ekle({
          site, etiket, oncelik: 3, tur: 'marka', etki: markali.reduce((a, x) => a + x.cost, 0) * 0.3, dayanak: ['marka', 'atama'],
          baslik: `Kendi marka adınızla yapılan aramalara ${TL(markali.reduce((a, x) => a + x.cost, 0))} ödendi`,
          neden: `Markanızı arayan kişi sizi zaten arıyor${orgSira < 99 ? `; Google'da organik sonuçlarda bu aramalarda ortalama ${String(orgSira).replace('.', ',')}. sıradasınız` : ''}. Google bu tür harcamayı önlemek için negatif kelime yerine "marka hariç tutma" önerir. Ancak rakipler marka adınıza reklam veriyorsa marka reklamı korumak için gerekli olabilir; bu yüzden bir deneme olarak düşünülmeli.`,
          yapilacak: ['Google Ads\'te markanızla aramada rakip reklamı çıkıyor mu bakın (Açık artırma analizleri).', 'Çıkmıyorsa Performance Max kampanyasına marka hariç tutma ekleyip 2–4 hafta toplam satışı izleyin; düşerse geri alın.'],
          liste: markali.slice(0, 10).map((x) => [x.q, `${TL(x.cost)} · ${S(x.tik)} tık`, x.kampAd]),
        });
      }
      // Satış getiren terimler
      const kazanan = terim.filter((x) => x.sat >= 2).sort((a, b) => b.gel - a.gel).slice(0, 12);
      if (kazanan.length) ekle({
        site, etiket, oncelik: 2, tur: 'kazanan', etki: kazanan.reduce((a, x) => a + x.gel, 0) * 0.1, dayanak: ['tema'],
        baslik: `${kazanan.length} arama terimi düzenli satış getiriyor`,
        neden: `Bu terimler son 28 günde ${S(kazanan.reduce((a, x) => a + x.sat, 0))} satış ve ${TL(kazanan.reduce((a, x) => a + x.gel, 0))} gelir getirdi. Ayrı anahtar kelime ya da arama teması olarak eklenirse teklif, reklam metni ve açılış sayfası bu aramaya göre ayarlanabilir.`,
        yapilacak: ['Arama kampanyasında bu terimleri [tam eşleme] anahtar kelime olarak ekleyin ve doğrudan ilgili ürüne giden açılış sayfası seçin.', 'Performance Max\'te ilgili öğe grubuna arama teması olarak ekleyin (öğe grubu başına en fazla 50; eş anlamlıları tekrar etmeyin).'],
        liste: kazanan.map((x) => [x.q, `${S(x.sat)} satış · ${TL(x.gel)}${x.cost ? ' · ' + TL(x.cost) + ' harcama' : ''}`, x.kampAd]),
      });
      // Açılış sayfaları
      const sayfa = (RD.sayfa || []).map((r) => ({ kamp: r[0], u: r[1], ot: r[2], eng: r[3], sat: r[4], gel: r[5] })).filter((x) => x.ot >= 40 && x.eng < 0.45 && x.sat === 0 && x.u && !/^\(/.test(x.u)).sort((a, b) => b.ot - a.ot).slice(0, 10);
      if (sayfa.length) ekle({
        site, etiket, oncelik: 2, tur: 'sayfa', dayanak: ['kalite'],
        baslik: `${sayfa.length} açılış sayfası reklam ziyaretçisini tutamıyor`,
        neden: `Reklamdan bu sayfalara gelen ziyaretçilerin yarıdan fazlası etkileşim kurmadan çıkıyor ve hiç satış yok. Google'ın kalite puanında "açılış sayfası deneyimi" bileşeni tam olarak bunu ölçer; zayıf sayfa hem bütçeyi boşa harcar hem tıklama maliyetini yükseltir.`,
        yapilacak: ['Sayfayı telefondan açın: ilk ekranda ürün, fiyat, stok ve "Sepete ekle" görünüyor mu?', 'Reklamdaki ürünle sayfadaki ürün aynı mı? Değilse reklamı doğru ürün/kategori sayfasına yönlendirin.', 'Stokta olmayan ürüne giden reklamları durdurun.'],
        liste: sayfa.map((x) => [x.u, `${S(x.ot)} oturum · etkileşim ${Y(x.eng)}`, x.kamp]),
      });
      // Cihaz
      const cihazMaliyetli = !(g.reklamEksik && g.reklamEksik.cihaz);
      const ch = new Map();
      (RD.cihaz || []).forEach((r) => { const k = r[1]; const x = ch.get(k) || { cost: 0, ot: 0, sat: 0 }; if (cihazMaliyetli) { x.cost += r[2]; x.ot += r[5]; x.sat += r[6]; } else { x.ot += r[2]; x.sat += r[4]; } ch.set(k, x); });
      const oran = [...ch].filter(([, x]) => x.ot >= 50).map(([k, x]) => [k, x.sat / x.ot, x]).sort((a, b) => b[1] - a[1]);
      if (oran.length >= 2) {
        const [iyi, kotu] = [oran[0], oran[oran.length - 1]];
        if (iyi[1] > 0 && kotu[1] < iyi[1] * 0.4 && kotu[2].ot >= 100) ekle({
          site, etiket, oncelik: 3, tur: 'cihaz', anahtar: kotu[0], dayanak: ['ayar', 'kalite'],
          baslik: `${CIHAZ[kotu[0]] || kotu[0]} ziyaretçileri çok daha az satın alıyor`,
          neden: `Reklamdan gelenlerde satış oranı ${CIHAZ[iyi[0]] || iyi[0]} için ${(iyi[1] * 100).toFixed(2).replace('.', ',')}%, ${CIHAZ[kotu[0]] || kotu[0]} için ${(kotu[1] * 100).toFixed(2).replace('.', ',')}%.${cihazMaliyetli && kotu[2].cost ? ` Bu cihaza ${TL(kotu[2].cost)} harcandı.` : ''} Kampanyalar akıllı teklifle çalışıyorsa cihaz teklif ayarı (yüzde) uygulanmaz; bu yüzden çözüm o cihazdaki satın alma deneyimini düzeltmektir.`,
          yapilacak: [`Siteyi ${CIHAZ[kotu[0]] || kotu[0]} cihazdan açıp ürün → sepet → ödeme adımlarını baştan sona deneyin.`, 'Yalnız manuel TBM kullanan bir arama kampanyası varsa orada cihaz teklif ayarı düşünülebilir.'],
        });
      }
      // Günler (akıllı teklif saat/günü kendisi optimize eder; yalnız uzun süre tekrarlarsa reklam planlaması)
      const gn = new Map();
      (RD.gun || []).forEach((r) => { const k = +r[1]; const x = gn.get(k) || { cost: 0, sat: 0 }; x.cost += r[2]; x.sat += r[6]; gn.set(k, x); });
      const olu = [...gn].filter(([, x]) => T.cost && x.cost >= T.cost * 0.1 && x.sat === 0);
      if (olu.length && olu.length <= 2) ekle({
        site, etiket, oncelik: 3, tur: 'gun', anahtar: olu.map(([k]) => k).join(','), dayanak: ['ayar'],
        baslik: `${olu.map(([k]) => GUN[k]).join(' ve ')} günleri satış getirmedi (izlenmeli)`,
        neden: `Son 4 haftada bu ${olu.length > 1 ? 'günlerde' : 'günde'} toplam ${TL(olu.reduce((a, [, x]) => a + x.cost, 0))} harcandı, Analytics'e göre satış yok. Akıllı teklif gün ve saati kendisi optimize ettiği için tek ay yeterli kanıt değildir; durum 2 ay üst üste tekrarlarsa reklam planlaması düşünülebilir.`,
        yapilacak: ['Şimdilik değişiklik yapmayın; bir sonraki ay da aynı tablo çıkarsa reklam planlamasından bu günleri daraltmayı değerlendirin.'],
      });
      // Ölçüm
      const olcum = kamp.filter((x) => (x.sat > 0 && x.gel === 0) || (x.cost >= 500 && x.ot === 0));
      if (olcum.length) ekle({
        site, etiket, oncelik: 1, tur: 'olcum', dayanak: ['olcum'],
        baslik: 'Bazı kampanyalarda ölçüm eksik görünüyor',
        neden: `${olcum.map((x) => `"${x.k[0]}"`).join(', ')}: ${olcum.some((x) => x.ot === 0) ? 'harcama var ama Analytics\'te oturum görünmüyor' : 'satış var ama gelir 0'}. Ölçüm eksikse diğer öneriler yanıltıcı olur; önce bu düzeltilmeli.`,
        yapilacak: ['Google Ads → Yönetici → Hesap ayarları: "Otomatik etiketleme" açık olmalı.', 'Analytics → Yönetici → Ürün bağlantıları: Google Ads bağlantısı etkin olmalı.', 'Satın alma olayında değer (value) ve para birimi gönderildiğini kontrol edin.'],
      });
    }

    // ---- Ürünler (reklam olsun olmasın): çok satanlar, stok, görüntülenip satmayanlar ----
    const kat_ = katalog[site] || null;
    const ara = kat_ ? new Map(kat_.map((i) => [norm(i.n), i])) : null;
    const bul = (ad) => { if (!ara) return null; const n = norm(ad); return ara.get(n) || kat_.find((i) => norm(i.n).startsWith(n) || n.startsWith(norm(i.n))) || null; };
    const urunler = (g.urunler || []).filter((r) => r[0] && !/^\(/.test(r[0]));
    const cok = urunler.filter((r) => r[4] > 0).sort((a, b) => b[4] - a[4]).slice(0, 25);
    const stoksuz = cok.map((r) => ({ r, k: bul(r[0]) })).filter((x) => x.k && !x.k.st);
    if (stoksuz.length) ekle({
      site, etiket, oncelik: 1, tur: 'stok', anahtar: stoksuz.map((x) => x.k.s).join(','), etki: stoksuz.reduce((a, x) => a + x.r[4], 0) / 4, dayanak: ['stok'],
      baslik: `Çok satan ${stoksuz.length} ürün şu an stokta yok`,
      neden: `Bu ürünler son 28 günün en çok satanları arasında (toplam ${TL(stoksuz.reduce((a, x) => a + x.r[4], 0))} ciro) ama mağaza kataloğunda stokta görünmüyor. Stokta olmayan ürüne gelen reklam tıklaması boşa gider; Merchant Center\'da stok bilgisi siteyle uyuşmazsa ürün onaylanmaz.`,
      yapilacak: ['Stok gelecekse tarihini ürün sayfasında belirtin; uzun sürecekse benzer ürünü öne çıkarın.', 'Merchant Center\'da bu ürünlerin "stokta yok" olarak doğru göründüğünü kontrol edin.'],
      liste: stoksuz.map((x) => [x.r[0], `${S(x.r[3])} adet · ${TL(x.r[4])}`, 'stokta yok']),
    });
    if (reklamVar) {
      const reklamla = new Set((RD.urun || []).filter((r) => r[3] > 0).map((r) => norm(r[1])));
      const disarida = cok.slice(0, 15).filter((r) => !reklamla.has(norm(r[0])) && !(bul(r[0]) && !bul(r[0]).st)).slice(0, 8);
      if (reklamla.size && disarida.length >= 3) ekle({
        site, etiket, oncelik: 2, tur: 'reklamsiz', etki: disarida.reduce((a, r) => a + r[4], 0) * 0.05, dayanak: ['stok', 'tema'],
        baslik: `${disarida.length} çok satan ürün reklamdan hiç satılmamış`,
        neden: `Bu ürünler sitenin en çok satanları arasında ama son 28 günde reklamdan gelen ziyaretçilere hiç satılmamış. Ya reklamlarda yeterince gösterilmiyorlar ya da ürün akışında sorun var. Zaten satan bir ürün, reklamda öne çıkarılmaya en uygun adaydır.`,
        yapilacak: ['Merchant Center\'da bu ürünlerin onaylı ve uyarısız olduğunu kontrol edin.', 'Performance Max\'te bu ürünler için görsel/başlıkları öne çıkaran ayrı bir öğe grubu düşünün; arama kampanyasında ürün adlarını anahtar kelime olarak ekleyin.'],
        liste: disarida.map((r) => [r[0], `${S(r[3])} adet · ${TL(r[4])}`, 'reklamdan satış yok']),
      });
    }
    // Çok görüntülenip az satan
    const goruntu = urunler.filter((r) => r[1] >= 80);
    const ortOran = goruntu.reduce((a, r) => a + r[3], 0) / Math.max(1, goruntu.reduce((a, r) => a + r[1], 0));
    const zayif = goruntu.filter((r) => r[3] / r[1] < ortOran / 3).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (ortOran > 0 && zayif.length >= 2) ekle({
      site, etiket, oncelik: 2, tur: 'goruntu', dayanak: ['kalite'],
      baslik: `${zayif.length} ürün çok bakılıyor ama az satılıyor`,
      neden: `Sitede ürün görüntüleme başına satış oranı ortalama ${(ortOran * 100).toFixed(1).replace('.', ',')}%; bu ürünlerde bunun üçte birinin altında. İlgi var ama satın alma yok: genelde fiyat, kargo, stok bilgisi, görsel ya da açıklama karar vermeyi zorlaştırır. Reklamla bu sayfalara getirilen trafik de aynı nedenle satışa dönmez.`,
      yapilacak: ['Ürün sayfasında fiyat, kargo süresi, stok ve kullanım bilgisi ilk ekranda mı kontrol edin.', 'Benzer ürünlerle fiyatı karşılaştırın; yorum ve gerçek fotoğraf ekleyin.'],
      liste: zayif.map((r) => [r[0], `${S(r[1])} görüntüleme · ${S(r[2])} sepete ekleme · ${S(r[3])} satış`, '']),
    });
  }

  // ---- Mağaza içi aramalar (HasTürk Gübre ve Tarım Dünyası widget'ı, ortak kayıt) ----
  const tr = ozet.trend;
  if (tr && tr.q0 && tr.q0.length) {
    const s = tr.q0.filter((r) => r[1] >= 3).slice(0, 15);
    if (s.length >= 3) ekle({
      site: 'hasturk', etiket: 'Mağaza araması', oncelik: 2, tur: 'icarama', dayanak: ['icarama'],
      baslik: `${s.length} arama mağazada sonuç bulamadı`,
      neden: `Müşteriler son 30 günde bu kelimeleri aradı ve sonuç göremedi (toplam ${S(s.reduce((a, r) => a + r[1], 0))} arama). Arayıp bulamayan müşteri genelde siteden çıkar. Ürün varsa farklı adla aranıyordur (eş anlamlı eklenmeli); yoksa talep var demektir.`,
      yapilacak: ['Ürününüz varsa arama motoruna eş anlamlı ekleyin (ör. halk arasındaki adı).', 'Ürününüz yoksa talep sinyali olarak tedarik listesine alın; blog yazısıyla en yakın ürüne yönlendirin.'],
      liste: s.map((r) => [r[0], `${S(r[1])} arama`, 'sonuç yok']),
    });
  }
  return out.sort((a, b) => a.oncelik - b.oncelik || (b.etki || 0) - (a.etki || 0));
}
