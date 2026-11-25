// Yazı içi otomatik bağlantılar (iç linkleme): metinde geçen başka bir yazının odak kelimesine o yazının,
// yazıda önerilen bir mağaza ürününün adına da ürün sayfasının bağlantısı verilir.
// Her hedef yalnız ilk geçtiği yerde, yalnız paragraf ve madde içinde (başlık, mevcut bağlantı, ürün kartı dışında) bağlanır.

const HARF = 'a-zçğıöşüâîû0-9';
const kucuk = (s) => s.toLocaleLowerCase('tr');

// Ürün adından metinde aranacak sade ifadeler: marka, ölçü ve ek açıklamalar atılır; önce tam ad, sonra son iki kelime
const MARKA = /\b(hastürk|hasturk|hg|gartengold|florist|arzuman|has türk)\b/g;
export function urunIfadeleri(ad) {
  let t = kucuk(String(ad || '')).split(/[–|(\-]/)[0];
  t = t.replace(MARKA, ' ').replace(/\b\d+[.,]?\d*\s*(lt|l|kg|gr|g|ml|cm|adet|li|lu|lü)\b/g, ' ').replace(/[^a-zçğıöşüâîû0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const k = t.split(' ').filter(Boolean);
  const out = [];
  if (k.length >= 2) out.push(k.join(' '));
  if (k.length > 2) out.push(k.slice(-2).join(' '), k[0] + ' ' + k[k.length - 1]); // "kaktüs ve sukulent toprağı" → "kaktüs toprağı"
  return out.filter((x) => x.length >= 8);
}

// Arama dizini: ifadeler ilk üç harflerine göre gruplanır; metinde yalnız kelime başlarında, o harflerle başlayan ifadeler denenir.
// (Her istekte yüzlerce RegExp kurmak yazı sayısı arttıkça Worker'ın işlemci sınırını aşıyordu.)
const HARF_RE = new RegExp(`[${HARF}]`);
function dizin(kalan) {
  const d = new Map();
  kalan.forEach((h, sira) => h.ifadeler.forEach((ifade, j) => {
    if (ifade.length < 3) return;
    const k = ifade.slice(0, 3);
    if (!d.has(k)) d.set(k, []);
    d.get(k).push({ ifade, h, sira, j });
  }));
  // Aynı yerde birden çok hedef eşleşirse: listedeki ilk hedef, onun da ilk ifadesi
  for (const l of d.values()) l.sort((a, b) => a.sira - b.sira || a.j - b.j);
  return d;
}

// hedefler: [{ ifadeler: ['kaktüs bakımı'], url: '/kaktus-…', ek: ' data-…' }]
export function icLink(html, hedefler, enCok = 6) {
  const varOlan = new Set([...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]));
  const kalan = hedefler.filter((h) => h.ifadeler.length && !varOlan.has(h.url));
  if (!kalan.length) return html;
  const D = dizin(kalan), bitti = new Set();
  const parca = html.split(/(<[^>]+>)/);
  let derin = { a: 0, h: 0, atla: 0, metin: 0 }, sayi = 0;
  for (let i = 0; i < parca.length; i++) {
    const p = parca[i];
    if (p.startsWith('<')) {
      const m = p.match(/^<(\/?)([a-z0-9]+)/i); if (!m) continue;
      const kapa = m[1] === '/', t = m[2].toLowerCase(), d = kapa ? -1 : 1;
      if (t === 'a') derin.a += d;
      else if (/^h[1-6]$/.test(t)) derin.h += d;
      else if (t === 'figure' || t === 'button' || (t === 'div' && /class="(inprod|ip|note-urun)/.test(p))) derin.atla += d;
      else if (t === 'p' || t === 'li' || t === 'td') derin.metin += d;
      continue;
    }
    if (!p.trim() || derin.a > 0 || derin.h > 0 || derin.atla > 0 || derin.metin <= 0 || sayi >= enCok) continue;
    // Metinde en önce geçen hedef bağlanır, arama bağlantıdan sonraki kısımla sürer (bağlantı içine bağlantı konmaz).
    // İfade kelime başında başlamalı; sonuna gelen ek (bakımında, domatesler) bağlantıya dahil edilir.
    const kl = kucuk(p);
    let cikti = '', son = 0;
    for (let k = 0; k < kl.length && sayi < enCok; k++) {
      if (!HARF_RE.test(kl[k]) || (k > 0 && HARF_RE.test(kl[k - 1]))) continue;
      const aday = D.get(kl.slice(k, k + 3));
      if (!aday) continue;
      const e = aday.find((x) => !bitti.has(x.h) && kl.startsWith(x.ifade, k));
      if (!e) continue;
      let bit = k + e.ifade.length;
      while (bit < kl.length && HARF_RE.test(kl[bit])) bit++;
      cikti += p.slice(son, k) + `<a href="${e.h.url}"${e.h.ek || ''}>${p.slice(k, bit)}</a>`;
      bitti.add(e.h); sayi++; son = bit; k = bit - 1;
    }
    parca[i] = cikti + p.slice(son);
  }
  return parca.join('');
}
