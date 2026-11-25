// İçerik kalite kapısı: Google'ın "insan için yararlı içerik", E-E-A-T ve spam politikalarıyla yapay zekâ aramalarında
// alıntılanabilirlik ölçütlerinin yazıya çevrilmiş hali. SEO puanının (seo-puan.js) üstüne eklenir.
// Seviye 'hata' → yeni yazı paketlenmez / yayına alınmaz. Seviye 'uyari' → yazar düzeltir ya da bilerek bırakır.
// İlke: önce bilgi, sonra ürün. Okur ürün almadan da sorusunun cevabını eksiksiz bulmalı.
import { duz } from './md.js';

const tr = (x) => String(x || '').toLocaleLowerCase('tr-TR');
const kelimeler = (s) => String(s || '').split(/\s+/).filter(Boolean);

// Satış dili: bilgi yazısında yeri yok (ürün kartı zaten satışı yapar)
const TICARI = [
  /(hemen|şimdi|bugün) (satın alın|sipariş (verin|edin)|sepete ekleyin)/, /sipariş (verin|verebilirsiniz|için tıklayın)/, /sepet(e|inize) ekle/, /indirim(li)? (fırsat|kampanya|kod)|indirimde(ki)?\b/,
  /\bkampanya(lı|da|mız)\b/, /ücretsiz kargo/, /stoklarla sınırlı/, /fırsatı kaçırma/, /kaçırılmayacak/, /en uygun fiyat/, /uygun fiyatlı/, /piyasanın en/, /rakipsiz/,
  /garantili (sonuç|verim|ürün)/, /%\s?100 (doğal|organik|etkili|sonuç|garanti|başarı)/, /(?<!["“])mucize (etki|gübre|ürün|formül)/, /mucizevi (etki|sonuç|gübre)/,
  /(en iyi|en etkili|en kaliteli) (gübre|toprak|ürün)(dür|dir|ümüz|lerimiz)\b/, /ürün(ümüz|lerimiz) ile\b/, /mağazamız(dan|da) (alabilir|bulabilir|sipariş)/,
];
// Kanıtsız otorite iddiası: kaynak bağlantısı olmadan yazılmaz
const KANITSIZ = [/bilimsel olarak kanıtlan/, /araştırmalar (gösteriyor|göstermiştir|kanıtlamıştır)/, /araştırmalara göre/, /çalışmalar(a göre| gösteriyor)/, /uzmanlar(a göre)? /, /doktorlar /];
// Tıklama tuzağı
const TUZAK = [/inanamayacaksınız/, /\bşok\b/, /bunu kimse söylemiyor/, /sırrı ortaya çıktı/, /!!/, /\?\?/];
// Güvenilir dış kaynak alan adları (resmî kurum, üniversite, uluslararası kuruluş, ansiklopedik kaynak)
export const GUVENILIR = /^https?:\/\/([a-z0-9-]+\.)*(gov\.tr|edu\.tr|edu|tarimorman\.gov\.tr|tagem|mgm\.gov\.tr|tuik\.gov\.tr|resmigazete\.gov\.tr|turkiye\.gov\.tr|tarsim\.gov\.tr|fao\.org|who\.int|europa\.eu|oecd\.org|usda\.gov|rhs\.org\.uk|extension\.[a-z.]+|[a-z]+\.wikipedia\.org|wikipedia\.org|kew\.org|missouribotanicalgarden\.org|hasturkgubre\.com\.tr)(\/|$)/i;
const ZAYIF_CAPA = /^(buraya|burada|şuraya|şurada|tıkla(yın)?|bu yazı(ya)?|bu yazıda|bu rehber(e)?|devamı|detaylar|link|bağlantı|incele(yin)?)$/i;

// y: yazı alanları (baslik, seo_baslik, seo_aciklama|ozet, odak, kisaca, govde, sss, gorsel_alt, kategori)
// ctx.aciklamaKim / ctx.baslikKim: tüm yazılarda meta açıklaması ve SEO başlığı → slug (tekillik)
export function kaliteKontrol(y, ctx = {}) {
  const govde = String(y.govde || ''), t = duz(govde), tl = tr(t);
  const kel = tr(y.odak).trim(), kis = String(y.kisaca || '').trim(), sss = String(y.sss || '');
  const bas = y.seo_baslik || y.baslik || '', aci = y.seo_aciklama || y.ozet || '';
  const out = [];
  const ekle = (kod, ok, mesaj, seviye = 'hata') => out.push({ kod, ok: !!ok, mesaj, seviye });
  const satirlar = govde.replace(/\r/g, '').split('\n');

  // 1) Önce bilgi, sonra ürün: giriş bölümünde kart yok; ilk kart en az bir bölüm bilgiden ve metnin %20'sinden sonra
  let h2 = 0, kelOnce = 0, ilkUrun = null;
  for (const s of satirlar) {
    if (/^##\s/.test(s)) h2++;
    if (/^\s*\[ürün:/i.test(s)) { if (!ilkUrun) ilkUrun = { h2, kel: kelOnce }; continue; }
    kelOnce += kelimeler(duz(s)).length;
  }
  const topKel = kelimeler(t).length || 1;
  ekle('urun-sira', !ilkUrun || (ilkUrun.h2 >= 1 && ilkUrun.kel / topKel >= 0.2),
    ilkUrun ? `İlk ürün kartı ${ilkUrun.h2 ? ilkUrun.h2 + '. bölümde' : 'girişte'}, metnin %${Math.round((ilkUrun.kel / topKel) * 100)}'inden sonra (en erken ilk bölümün bilgisinden ve %20'den sonra)` : 'Yazı içinde ürün kartı yok (ürünler yazı sonunda)');
  const urunSay = [...govde.matchAll(/\[ürün:([^\]]+)\]/gi)].reduce((a, m) => a + m[1].split(',').filter((x) => x.trim()).length, 0);
  const kartSay = (govde.match(/\[ürün:/gi) || []).length;
  const kartSinir = Math.min(3, Math.max(2, Math.round(topKel / 400)));
  ekle('urun-sayi', kartSay <= kartSinir && urunSay <= 6, `${kartSay} yazı içi kart, ${urunSay} ürün (bu uzunlukta en fazla ${kartSinir} kart, toplam 6 ürün; her 400 kelimeye 1 kart)`);

  // 2) Satış dili ve marka yoğunluğu
  const metinTum = tr([y.baslik, bas, aci, kis, t, sss].join(' \n '));
  const tic = TICARI.filter((r) => r.test(metinTum)).map((r) => (metinTum.match(r) || [''])[0].trim());
  ekle('ticari-dil', !tic.length, tic.length ? 'Satış dili: ' + [...new Set(tic)].join(', ') : 'Satış dili yok');
  ekle('fiyat', !/\b\d[\d.]*\s?(tl|₺)\b|₺\s?\d/.test(metinTum), 'Fiyat yazılmamış (fiyat değişir, mağazada görünür)');
  const marka = (t.match(/hastürk/gi) || []).length;
  ekle('marka', marka <= 2, `Metinde "HasTürk" ${marka} kez (en fazla 2)`);

  // 3) Doğrudan cevap (öne çıkan sonuç ve yapay zekâ alıntısı için)
  const kisL = tr(kis);
  const SORU = /^(nedir|nasıl|neden|niçin|hangi|hangisi|zaman|kadar|nelerdir|yapılır|edilir|için|ile|olur|mı|mi|mu|mü|ve)$/;
  const anaKok = kel.split(/\s+/).filter((w) => w.length > 2 && !SORU.test(w)).map((w) => w.slice(0, 5));
  ekle('kisaca-cevap', !/^(bu (yazı|rehber|makale)|merhaba|günümüzde|hepimiz)/.test(kisL) && (!anaKok.length || anaKok.some((k) => kisL.includes(k))),
    'Kısaca kutusu doğrudan cevapla başlar ve konuyu adlandırır');
  const ilkPar = (govde.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^(#|\[|!|>|:::|-|\d+\.|\|)/.test(p)) || '');
  ekle('giris', !/^(bu (yazıda|rehberde|makalede)|merhaba|günümüzde|hepimiz bilir)/i.test(tr(ilkPar)) && kelimeler(ilkPar).length <= 90,
    'Giriş paragrafı doğrudan konuya girer, 90 kelimeyi aşmaz (' + kelimeler(ilkPar).length + ')', 'uyari');

  // 4) Okunabilirlik
  const paragraflar = govde.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^(#|\[|!|>|:::|\||-|\d+\.)/.test(p));
  const uzunPar = paragraflar.filter((p) => kelimeler(p).length > 150).length;
  ekle('paragraf', !uzunPar, uzunPar ? `${uzunPar} paragraf 150 kelimeyi aşıyor (bölün)` : 'Paragraflar kısa');
  const cumle = t.split(/(?<=[.!?])\s+/).map((c) => kelimeler(c).length).filter((n) => n > 2);
  const ort = cumle.length ? cumle.reduce((a, b) => a + b, 0) / cumle.length : 0, cokUzun = cumle.filter((n) => n > 40).length;
  ekle('cumle', ort <= 22 && cokUzun <= 3, `Ortalama cümle ${ort.toFixed(1)} kelime, 40+ kelimelik ${cokUzun} cümle (ortalama ≤22, uzun ≤3)`, 'uyari');

  // 5) Özgün katkı: okura metinden fazlasını veren en az bir yapı (tablo, adımlar, bilgi görseli)
  ekle('yapi', /^\s*\|.+\|/m.test(govde) || /^\s*\d+[.)]\s/m.test(govde) || /^:::\s*\w+/m.test(govde), 'Tablo, numaralı adım ya da bilgi görseli var');

  // 6) Başlık yapısı
  const h2ler = (govde.match(/^##\s+.+$/gm) || []).map((h) => tr(h.replace(/^##\s+/, '').trim()));
  ekle('h2-tekil', new Set(h2ler).size === h2ler.length, 'Ara başlıklar birbirini tekrarlamıyor');
  ekle('h2-sayi', h2ler.length <= 12, `${h2ler.length} ara başlık (en fazla 12)`, 'uyari');
  const h2Odak = kel ? h2ler.filter((h) => h.includes(kel)).length : 0;
  ekle('h2-doldurma', h2Odak < 4 || h2Odak <= h2ler.length * 0.6, `Odak kelime ${h2Odak}/${h2ler.length} ara başlıkta (doğal dağılım)`, 'uyari');

  // 7) Başlık ve açıklama: tuzaksız, tekil
  const basTum = tr([y.baslik, bas].join(' '));
  ekle('baslik-tuzak', !TUZAK.some((r) => r.test(basTum)) && !/\b[A-ZÇĞİÖŞÜ]{5,}\b/.test(String(y.baslik || '').replace(/\b(TARSİM|ÇKS|TKDK|EC|pH|NFT|DWC|LED|TÜİK|MGM|ÇAYKUR|FAO|ABD|AB)\b/g, '')), 'Başlıkta tıklama tuzağı ve büyük harfle bağırma yok');
  if (ctx.aciklamaKim) ekle('aciklama-tekil', !ctx.aciklamaKim[tr(aci).trim()] || ctx.aciklamaKim[tr(aci).trim()] === y.slug, 'Meta açıklaması başka yazıda yok');
  if (ctx.baslikKim) ekle('baslik-tekil', !ctx.baslikKim[tr(bas).trim()] || ctx.baslikKim[tr(bas).trim()] === y.slug, 'SEO başlığı başka yazıda yok');

  // 8) SSS: gerçek soru, kısa ve tam cevap
  const sb = sss.split(/\n\s*\n/).map((b) => b.match(/^\s*S:\s*([\s\S]+?)\n\s*C:\s*([\s\S]+)$/)).filter(Boolean);
  const kotuS = sb.filter((m) => !/\?\s*$/.test(m[1].trim())).length, kotuC = sb.filter((m) => m[2].trim().length < 40 || m[2].trim().length > 420).length;
  ekle('sss', !kotuS && !kotuC, `SSS: ${kotuS} soru "?" ile bitmiyor, ${kotuC} cevap 40–420 karakter dışında`);

  // 9) Bağlantılar: açıklayıcı bağlantı metni, güvenilir dış kaynak
  const baglar = [...govde.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].filter((m) => !/^ürün:/i.test(m[1]));
  const zayif = baglar.filter((m) => ZAYIF_CAPA.test(m[1].trim()) || m[1].trim().length < 3);
  ekle('capa', !zayif.length, zayif.length ? 'Zayıf bağlantı metni: ' + zayif.map((m) => m[1]).join(', ') : 'Bağlantı metinleri açıklayıcı');
  const dis = baglar.filter((m) => /^https?:\/\//.test(m[2]));
  const kotuDis = dis.filter((m) => !GUVENILIR.test(m[2]));
  ekle('dis-kaynak', !kotuDis.length, kotuDis.length ? 'Güvenilir listesinde olmayan dış bağlantı: ' + kotuDis.map((m) => m[2]).join(', ') : 'Dış bağlantılar güvenilir kaynaklara');
  const kanitsiz = KANITSIZ.filter((r) => r.test(tl));
  ekle('kanit', !kanitsiz.length || dis.length > 0, kanitsiz.length && !dis.length ? 'Kaynaksız otorite iddiası ("araştırmalara göre" vb.): kaynak bağlantısı verin ya da cümleyi somutlaştırın' : 'Otorite iddiaları kaynaklı');
  // Mevzuat, destek, sigorta ve kayıt yazıları resmî kaynağa bağlanır
  const resmi = /(tarım(sal)?|kırsal|çiftçi) (destek|kredi|hibe)|\bhibe|tarım sigortası|tarsim|\bçks\b|çiftçi kayıt|mevzuat|yönetmelik|ruhsat|teşvik|kooperatif|üretici birliği|sözleşmeli üretim|sertifikalı tohum|organik (tarım )?sertifika/.test(tr(y.odak + ' ' + y.baslik));
  ekle('resmi-kaynak', !resmi || dis.some((m) => /gov\.tr/.test(m[2])), 'Mevzuat/destek konusu resmî kaynağa (gov.tr) bağlanıyor');

  // 10) Görsel alt metni
  const alt = String(y.gorsel_alt || '').trim();
  ekle('alt', alt.length <= 125 && tr(alt) !== tr(y.baslik) && !/^(resim|görsel|fotoğraf|foto)\b/i.test(alt), 'Alt metin görseli anlatıyor (≤125 karakter, başlığın kopyası değil)', 'uyari');

  return out;
}

export const kaliteHatalari = (y, ctx) => kaliteKontrol(y, ctx).filter((k) => !k.ok && k.seviye === 'hata');

// Ürün kartlarını kurala uydurur: erken kartları bilginin arkasına (2. bölüm sonrası ve metnin %35'i) taşır,
// uzunluğa göre fazla kartları ve toplam 6'yı aşan ürünleri çıkarır. Metni değiştirmez, yalnız [ürün:…] satırlarını.
export function urunYerlestir(govde) {
  const L = String(govde).replace(/\r/g, '').split('\n');
  const kart = (s) => /^\s*\[ürün:[^\]]+\]\s*$/i.test(s);
  const metin = L.filter((s) => !kart(s));
  const kelS = (s) => kelimeler(duz(s)).length;
  const top = metin.reduce((a, s) => a + kelS(s), 0) || 1;
  const sinir = Math.min(3, Math.max(2, Math.round(top / 400)));
  // Uygun sınırlar: bir ## başlığından hemen önce (en az bir bölüm bitmiş ve %20 aşılmış) ya da metnin sonu
  let h2 = 0, kel = 0; const uygun = [];
  for (let i = 0; i < metin.length; i++) {
    if (/^##\s/.test(metin[i])) { if (h2 >= 1 && kel / top >= 0.2) uygun.push(i); h2++; }
    kel += kelS(metin[i]);
  }
  // SSS benzeri son bölüme kart koymamak için son sınır metnin sonu
  uygun.push(metin.length);
  // Kartların metin içindeki yerleri (kendinden önceki metin satırı sayısı)
  const kartlar = []; let m = 0, hb = 0, kb = 0;
  for (const s of L) {
    if (kart(s)) { kartlar.push({ s: s.trim(), yer: m, gecerli: hb >= 1 && kb / top >= 0.2 }); continue; }
    if (/^##\s/.test(s)) hb++;
    kb += kelS(s); m++;
  }
  const ilk = uygun[0];
  for (const k of kartlar) if (!k.gecerli && k.yer < ilk) { k.yer = ilk; k.tasindi = 1; }
  // Fazla kart: önce taşınanlar, sonra sondakiler çıkar
  let kal = [...kartlar];
  while (kal.length > sinir) { const i = kal.findIndex((k) => k.tasindi); kal.splice(i >= 0 ? i : kal.length - 1, 1); }
  // Aynı yere düşen kartlar birleşir; toplam ürün 6
  const yerde = new Map();
  for (const k of kal) { const sl = k.s.replace(/^\[ürün:|\]$/gi, '').split(',').map((x) => x.trim()).filter(Boolean); yerde.set(k.yer, [...(yerde.get(k.yer) || []), ...sl]); }
  let say = 0; const gorulen = new Set();
  for (const [yer, sl] of [...yerde.entries()].sort((a, b) => a[0] - b[0])) {
    const tek = sl.filter((x) => !gorulen.has(x) && say < 6 && (gorulen.add(x), ++say));
    if (tek.length) yerde.set(yer, tek.slice(0, 3)); else yerde.delete(yer);
  }
  const out = [];
  for (let i = 0; i <= metin.length; i++) {
    if (yerde.has(i)) { if (out.length && out[out.length - 1].trim()) out.push(''); out.push(`[ürün:${yerde.get(i).join(',')}]`, ''); }
    if (i < metin.length) out.push(metin[i]);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + (String(govde).endsWith('\n') ? '\n' : '');
}
