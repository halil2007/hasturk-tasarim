// SEO kontrolü: panel (sunucu), editördeki canlı kontrol (public/blog-statik/panel.js) ve yazı paketi denetimi aynı ölçütleri kullanır.
// İkisini birlikte güncel tutun. Ağırlığı 0 olan maddeler bilgi amaçlıdır, puana girmez.
import { duz } from './md.js';
import { slugYap } from './ortak.js';

export const SEO_ESIK = 80; // Bu puanın altındaki yeni yazı yayına alınmaz, taslak olarak kaydedilir

const tr = (x) => String(x || '').toLocaleLowerCase('tr-TR');
const kac = (metin, k) => { if (!k) return 0; let n = 0, i = 0; while ((i = metin.indexOf(k, i)) >= 0) { n++; i += k.length; } return n; };

// y: yazı alanları; digerOdak: diğer yazıların odak kelimeleri (küçük harf), verilirse tekrar kontrolü yapılır
export function seoKontrol(y, digerOdak = null) {
  const govde = String(y.govde || ''), t = duz(govde), tl = tr(t), kel = tr(y.odak).trim();
  const bas = y.seo_baslik || y.baslik || '', aci = y.seo_aciklama || y.ozet || '';
  const kelS = t.split(/\s+/).filter(Boolean).length;
  const h2 = (govde.match(/^##\s+.+$/gm) || []).map((h) => tr(h.replace(/^##\s+/, '')));
  const ic = new Set((govde.match(/\]\(\/(blog\/)?[a-z0-9-]+\)/g) || []).map((x) => x.replace(/^\]\(\/(blog\/)?|\)$/g, ''))).size;
  const sss = String(y.sss || '').split(/\n\s*\n/).filter((b) => /^\s*S:/m.test(b) && /^\s*C:/m.test(b)).length;
  const slug = y.slug || slugYap(y.baslik || '');
  const tekrar = kel ? kac(tl, kel) : 0, yog = kelS ? tekrar * kel.split(/\s+/).length / kelS * 100 : 0;
  const alt = String(y.gorsel_alt || '').trim(), kis = String(y.kisaca || '').trim();
  const urun = (govde.match(/\[ürün:/gi) || []).length;
  return [
    [!!kel && tr(y.baslik).includes(kel), kel ? 'Odak kelime başlıkta geçiyor' : 'Odak anahtar kelime yazın', 2],
    [!!kel && tl.slice(0, 400).includes(kel), 'Odak kelime ilk paragrafta geçiyor', 1],
    [!!kel && tr(aci).includes(kel), 'Odak kelime meta açıklamasında geçiyor', 1],
    [!!kel && h2.some((h) => h.includes(kel)), 'Odak kelime en az bir ara başlıkta (##) geçiyor', 1],
    [!!kel && slug.includes(slugYap(kel)), 'Odak kelime adreste (slug) geçiyor', 1],
    [!!kel && tekrar >= 3 && yog <= 3, `Odak kelime metinde ${tekrar} kez geçiyor` + (tekrar < 3 ? ' · en az 3 olmalı' : yog > 3 ? ' · aşırı tekrar, azaltın' : ''), 1],
    [!!kel && (!digerOdak || !digerOdak.includes(kel)), digerOdak && kel && digerOdak.includes(kel) ? 'Bu odak kelime başka bir yazıda kullanılıyor · farklı bir açı seçin' : 'Odak kelime başka yazıda kullanılmıyor', 1],
    [bas.length >= 35 && bas.length <= 60, 'SEO başlığı 35–60 karakter (' + bas.length + ')', 1],
    [aci.length >= 120 && aci.length <= 158, 'Meta açıklaması 120–158 karakter (' + aci.length + ')', 1],
    [kis.length >= 80 && kis.length <= 360, 'Kısaca kutusu 80–360 karakter (öne çıkan cevap için)', 1],
    [kelS >= 800, 'Metin uzunluğu ' + kelS + ' kelime' + (kelS < 800 ? ' (en az 800)' : ''), 1],
    [h2.length >= 4, h2.length + ' bölüm başlığı (##)' + (h2.length < 4 ? ' · en az 4' : ''), 1],
    [alt.length >= 15, 'Öne çıkan görselin açıklayıcı alt metni var', 1],
    [sss >= 3, sss + ' sık sorulan soru' + (sss < 3 ? ' · en az 3 (FAQ yapısal verisi)' : ''), 1],
    [ic >= 3, ic + ' farklı iç bağlantı' + (ic < 3 ? ' · en az 3' : ''), 1],
    [urun >= 1 || !!y.urun_oto, urun ? urun + ' yazı içi ürün kartı' : 'Ürünler otomatik önerilecek', 0],
  ];
}

export function seoPuan(y, digerOdak = null) {
  const kon = seoKontrol(y, digerOdak);
  const top = kon.reduce((a, k) => a + k[2], 0);
  return Math.round(kon.reduce((a, k) => a + (k[0] ? k[2] : 0), 0) / top * 100);
}
