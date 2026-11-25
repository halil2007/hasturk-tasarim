// Yazarlar: yazar sayfası (/yazar/<slug>), yazı altındaki yazar kutusu ve Person yapısal verisi (sameAs = LinkedIn).
// Unvan, kısa biyografi ve bağlantılar panelden (SEO & Ayarlar → Yazarlar) değiştirilebilir; boş alan varsayılana döner.
import { slugYap } from './ortak.js';

export const YAZAR_LISTE = [
  { ad: 'Halil İbrahim Çelik', linkedin: 'https://www.linkedin.com/in/halil-ibrahim-%C3%A7elik-58689a202', instagram: 'https://www.instagram.com/halilclk.29', foto: '/blog-statik/yazar/halil-ibrahim-celik.webp',
    unvan: 'HasTürk Gübre Yöneticisi', memleket: 'Gümüşhane', okul: 'İstanbul Sabahattin Zaim Üniversitesi',
    bio: "Aslen Gümüşhaneli olan Halil İbrahim Çelik, 2023 yılından bu yana HasTürk Gübre bünyesinde yönetici olarak görevini sürdürmektedir. Eğitim hayatına İstanbul Sabahattin Zaim Üniversitesi Uluslararası Ticaret ve Finansman Bölümü'nde devam eden Çelik, aynı zamanda üniversitenin Uluslararası Ticaret ve Finansman Kulübü'nde Başkan Yardımcısı olarak aktif rol almaktadır.\nSaha birikimini ve müşteri tecrübelerini HasTürk Blog üzerinden okurlarla paylaşan Çelik; gübreleme teknikleri, toprak sağlığı ve salon bitkileri üzerine içerikler kaleme almaktadır." },
  { ad: 'Mehmet Fatih Çelik', linkedin: 'https://www.linkedin.com/in/mehmetfatihcelik', foto: '/blog-statik/yazar/mehmet-fatih-celik.webp',
    unvan: 'HasTürk Gübre Kurucusu', memleket: 'Gümüşhane', mezun: ['Sakarya Üniversitesi', 'İstanbul Okan Üniversitesi'],
    bio: "Aslen Gümüşhaneli olan Mehmet Fatih Çelik, 2019 yılında kurduğu HasTürk Gübre'nin kurucusudur. Sakarya Üniversitesi'nde Çevre Teknolojisi eğitimini tamamlayan Çelik, ardından İstanbul Okan Üniversitesi Fen Bilimleri Enstitüsü'nde İş Sağlığı ve Güvenliği alanında yüksek lisans yapmıştır. 2009 yılından bu yana HasTürk Danışmanlık & Platform Kiralama'nın kurucusu olarak faaliyet gösteren Çelik, çevre, iş sağlığı ve güvenliği alanlarında İGA İstanbul Havalimanı, ARBİOGAZ Çevre Teknolojileri ve Proline Bilişim gibi kurumlarda görev almıştır.\nÇevre mühendisliği altyapısını ve biyogaz alanındaki deneyimini toprak ve organik gübre alanına taşıyan Çelik, HasTürk Blog'da bahçe bakımı, sebze ve meyve yetiştiriciliği, toprak ve gübreleme üzerine bilgilendirici içerikler kaleme almaktadır. Yayınlanan tüm yazılar, markanın saha tecrübesine ve ekip içi editoryal kontrol süreçlerine dayanmaktadır." },
  { ad: 'Mikdat Çelik' },
  { ad: 'Ahmet Sacit Çelik' },
  { ad: 'Hatice Kübra Çelik' },
  { ad: 'Rümeysa Altınova' },
  { ad: 'Muhammed Hamza Çelik' },
].map((y) => ({ ...y, slug: slugYap(y.ad) }));

const KAT_KONU = {
  'bitki-bakimi': 'salon bitkileri', cicekler: 'çiçekler', 'toprak-rehberi': 'toprak', gubreleme: 'gübreleme',
  'sebze-meyve': 'sebze ve meyve', 'bahce-ipuclari': 'bahçe bakımı', 'ekim-takvimi': 'ekim takvimi', gundem: 'tarım gündemi',
};
const temizUrl = (v) => (/^https:\/\/[^\s"<>]+$/i.test(String(v || '').trim()) ? String(v).trim().replace(/[?#].*$/, '').replace(/\/$/, '') : '');

// Ad → yazar kaydı (panel ayarlarıyla birleştirilmiş). Listede olmayan ad için null.
export function yazarBul(A, ad) {
  const y = YAZAR_LISTE.find((x) => x.ad === ad || x.slug === ad);
  if (!y) return null;
  const k = (s) => String((A || {})['yazar_' + y.slug + '_' + s] || '').trim();
  const linkedin = temizUrl(k('linkedin')) || y.linkedin || '';
  const web = temizUrl(k('web'));
  const instagram = temizUrl(k('instagram')) || y.instagram || '';
  return { ...y, unvan: k('unvan') || y.unvan || 'HasTürk Gübre Ekibi', unvanOzel: !!(k('unvan') || y.unvan), bio: k('bio') || y.bio || '', linkedin, instagram, web, sameAs: [linkedin, instagram, web].filter(Boolean) };
}

// Biyografi panelde yazılmadıysa yazarın gerçekten yazdığı kategorilerden kısa ve doğru bir tanıtım üretilir
export function yazarTanitim(y, katSay = []) {
  if (y.bio) return y.bio;
  const konular = katSay.filter((k) => KAT_KONU[k.slug]).slice(0, 3).map((k) => KAT_KONU[k.slug]);
  const liste = konular.length > 1 ? konular.slice(0, -1).join(', ') + ' ve ' + konular[konular.length - 1] : konular[0];
  return `${y.ad}, HasTürk Gübre ekibinde yer alıyor${liste ? ` ve HasTürk Blog'da en çok ${liste} üzerine yazıyor` : ''}. Yazılar, HasTürk'ün toprak ve gübre ürünleriyle edinilen uygulama deneyimine dayanır ve yayından önce ekip içinde kontrol edilir.`;
}

export function kisiJsonLd(y, url, ek = {}) {
  return { '@type': 'Person', name: y.ad, url, ...(y.unvanOzel ? { jobTitle: y.unvan } : {}), worksFor: { '@type': 'Organization', name: 'HasTürk Gübre', url: 'https://hasturkgubre.com.tr' }, ...(y.sameAs.length ? { sameAs: y.sameAs } : {}), ...(y.foto ? { image: 'https://blog.hasturkgubre.com.tr' + y.foto } : {}),
    ...(y.memleket ? { homeLocation: { '@type': 'Place', name: y.memleket } } : {}), ...(y.okul ? { affiliation: { '@type': 'EducationalOrganization', name: y.okul } } : {}),
    ...(y.mezun ? { alumniOf: y.mezun.map((name) => ({ '@type': 'EducationalOrganization', name })) } : {}), ...ek };
}
