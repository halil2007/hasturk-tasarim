// Verilen site adreslerinin durumunu yazar: HTTP kodu, sayfa başlığı, "sepete ekle" düğmesi ve "tükendi" ibaresi var mı.
// Kullanım: ADRESLER="adres1,adres2" node scripts/sayfa-durum.mjs  (adres: tam URL ya da hasturkgubre.com.tr altındaki yol)
const adresler = (process.env.ADRESLER || '').split(',').map((s) => s.trim()).filter(Boolean);
for (const a of adresler) {
  const url = /^https?:/.test(a) ? a : 'https://hasturkgubre.com.tr/' + a.replace(/^\//, '');
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (HasTurk sayfa kontrol)' }, redirect: 'manual' });
    const h = r.status === 200 ? await r.text() : '';
    const baslik = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    console.log(`${r.status} ${r.headers.get('location') ? '→ ' + r.headers.get('location') + ' ' : ''}${url}\n    başlık: ${baslik.slice(0, 90)} · sepete ekle: ${/sepete ekle/i.test(h) ? 'var' : 'yok'} · tükendi: ${/tükendi|stokta yok/i.test(h) ? 'var' : 'yok'}`);
  } catch (e) { console.log(`HATA ${url}: ${e.message}`); }
}
