// Yazı gövdesi biçimi → HTML. Editörün yazdığı sade işaretler:
//   ## Başlık / ### Alt başlık        > İpucu: …  /  > Unutmayın: …  /  > …   (not kutuları)
//   - madde (onay işaretli liste)    1. madde (numaralı liste)
//   | a | b |  (ilk satır başlık; |---| satırı isteğe bağlı)
//   ![alt metin](görsel-adresi "açıklama")     [ürün:slug] veya [ürün:slug1,slug2]  (mağazadan ürün kartı)
//   Satır içi: **kalın**, *italik*, [metin](adres)
//   Bilgi görselleri (satırlar | ile ayrılır, blok ::: ile kapanır):
//     ::: adimlar   → Başlık | açıklama            (numaralı adım kartları)
//     ::: belirti   → Belirti | Neden | Ne yapılır  (belirti → neden → çözüm şeridi)
//     ::: karisim   → Bileşen | oran (%)           (karışım halkası)
//     ::: takvim    → İş | 2-4 veya 3,9-10 (aylar) (12 aylık takvim şeridi)
//     ::: katman    → Katman | kalınlık (cm)       (üstten alta toprak/katman kesiti)
// Her şey önce kaçışlanır; ham HTML kabul edilmez.
import { esc } from './ortak.js';

const IK = (id) => `<svg><use href="/blog-statik/ikon.svg#${id}"/></svg>`;

function satirIci(s) {
  let t = esc(s);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, h) => {
    const u = h.replace(/&amp;/g, '&');
    if (!/^(https?:\/\/|\/|#)/.test(u)) return a;
    const dis = /^https?:\/\//.test(u) && !/hasturkgubre\.com\.tr/.test(u);
    return `<a href="${esc(u)}"${dis ? ' rel="nofollow noopener" target="_blank"' : ''}>${a}</a>`;
  });
  return t;
}

// ---- Bilgi görselleri: metin HTML'de kalır (aranabilir, erişilebilir); şekiller satır içi SVG ----
const AYK = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const IG_RENK = ['#2e7d43', '#c4673a', '#2c6c8f', '#d9a21b', '#8e6cc9', '#64b257', '#a3531b'];
const KATMAN_RENK = (ad) => /malç|saman/i.test(ad) ? '#c9a66b' : /yaprak/i.test(ad) ? '#94704a' : /kompost|solucan|gübre/i.test(ad) ? '#4a3324' : /perlit|kum|çakıl|drenaj|kil top|ponza/i.test(ad) ? '#d9d4c7'
  : /torf|kokopit|cocopeat|hindistan/i.test(ad) ? '#7d5536' : /dal|odun|kütük/i.test(ad) ? '#8a6142' : /karton|gazete/i.test(ad) ? '#d6c3a0' : '#6e4a2f';
function aylar(s) {
  const a = new Set();
  for (const p of String(s).split(',')) { const m = p.trim().match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?$/); if (!m) continue; let x = +m[1], y = +(m[2] || m[1]); for (let k = 0; k < 12 && x >= 1 && x <= 12; k++) { a.add(x); if (x === y) break; x = x % 12 + 1; } }
  return a;
}
function bilgiGorsel(tur, satirlar) {
  const h = satirlar.map((r) => r.split('|').map((x) => x.trim()));
  if (tur === 'adimlar') return '<ol class="ig ig-adim">' + h.map(([b, a = ''], i) => `<li><span class="n">${i + 1}</span><div><b>${satirIci(b)}</b>${a ? '<p>' + satirIci(a) + '</p>' : ''}</div></li>`).join('') + '</ol>';
  if (tur === 'belirti') return '<div class="ig ig-bel"><div class="bas"><span>Belirti</span><span>Olası neden</span><span>Ne yapılır</span></div>'
    + h.map(([b, n = '', c = '']) => `<div class="sat"><div class="b"><small>Belirti</small>${satirIci(b)}</div><div class="o">${IK('i-arrow')}</div><div class="ne"><small>Olası neden</small>${satirIci(n)}</div><div class="o">${IK('i-arrow')}</div><div class="c"><small>Ne yapılır</small>${satirIci(c)}</div></div>`).join('') + '</div>';
  if (tur === 'karisim') {
    const v = h.map(([ad, o]) => ({ ad, o: Math.max(0, parseFloat(String(o).replace(',', '.')) || 0) })).filter((x) => x.o > 0);
    const top = v.reduce((t, x) => t + x.o, 0) || 1, C = 2 * Math.PI * 70;
    let bas = 0;
    const dilim = v.map((x, i) => { const u = (x.o / top) * C; const d = `<circle r="70" cx="90" cy="90" fill="none" stroke="${IG_RENK[i % IG_RENK.length]}" stroke-width="34" stroke-dasharray="${u.toFixed(2)} ${(C - u).toFixed(2)}" stroke-dashoffset="${(-bas).toFixed(2)}" transform="rotate(-90 90 90)"/>`; bas += u; return d; }).join('');
    return `<figure class="ig ig-kar"><svg viewBox="0 0 180 180" aria-hidden="true">${dilim}</svg><ul>` + v.map((x, i) => `<li><i style="background:${IG_RENK[i % IG_RENK.length]}"></i><span>${satirIci(x.ad)}</span><b>%${Math.round((x.o / top) * 100)}</b></li>`).join('') + '</ul></figure>';
  }
  if (tur === 'takvim') return '<div class="ig ig-tak"><div class="tbas"><span></span>' + AYK.map((a) => `<span>${a}</span>`).join('') + '</div>'
    + h.map(([is, ay = ''], i) => { const a = aylar(ay); return `<div class="tsat"><span class="ad">${satirIci(is)}</span>` + AYK.map((k, j) => `<span class="${a.has(j + 1) ? 'on' : ''}" style="${a.has(j + 1) ? '--c:' + IG_RENK[i % IG_RENK.length] : ''}" title="${a.has(j + 1) ? k : ''}"></span>`).join('') + '</div>'; }).join('') + '</div>';
  if (tur === 'katman') {
    const v = h.map(([ad, cm]) => ({ ad, cm: Math.max(1, parseFloat(String(cm).replace(',', '.')) || 5) }));
    const top = v.reduce((t, x) => t + x.cm, 0);
    v.forEach((x) => { x.h = Math.round(Math.max(44, (x.cm / top) * 300)); });
    let y = 0;
    const dik = v.map((x) => { const r = `<rect x="0" y="${y}" width="120" height="${x.h}" fill="${KATMAN_RENK(x.ad)}"/>`; y += x.h; return r; }).join('');
    return `<figure class="ig ig-kat"><svg viewBox="0 0 120 ${y}" preserveAspectRatio="none" style="height:${y}px" aria-hidden="true">${dik}</svg><ul>` + v.map((x) => `<li style="height:${x.h}px"><span>${satirIci(x.ad)}</span><b>${x.cm} cm</b></li>`).join('') + '</ul></figure>';
  }
  return '';
}

export function sssCoz(s) {
  const out = [];
  String(s || '').split(/\n\s*\n/).forEach((blk) => {
    const m = blk.match(/^\s*S:\s*([\s\S]+?)\n\s*C:\s*([\s\S]+)$/);
    if (m) out.push({ s: m[1].trim(), c: m[2].trim() });
  });
  return out;
}

// urunKart(slugs) → HTML (ürün bulunamazsa boş döner); fig: görseller sırayla sağa yaslanır
export function render(govde, { urunKart = () => '' } = {}) {
  const satirlar = String(govde || '').replace(/\r/g, '').split('\n');
  const out = [], basliklar = [], urunler = [];
  let i = 0, no = 0, fig = 0;
  const para = [];
  const bosalt = () => { if (para.length) { out.push('<p>' + satirIci(para.join(' ')) + '</p>'); para.length = 0; } };
  while (i < satirlar.length) {
    const L = satirlar[i], t = L.trim();
    if (!t) { bosalt(); i++; continue; }
    let m;
    if ((m = t.match(/^(#{2,3})\s+(.+)$/))) {
      bosalt();
      if (m[1] === '##') { no++; const id = 'b' + no; basliklar.push({ id, metin: m[2].replace(/\*+/g, '') }); out.push(`<h2 id="${id}" class="clear">${satirIci(m[2])}</h2>`); }
      else out.push(`<h3>${satirIci(m[2])}</h3>`);
      i++; continue;
    }
    if ((m = t.match(/^\[ürün:([a-z0-9,\s-]+)\]$/i))) {
      bosalt();
      const s = m[1].split(',').map((x) => x.trim()).filter(Boolean);
      urunler.push(...s);
      out.push(urunKart(s));
      i++; continue;
    }
    if ((m = t.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/))) {
      bosalt();
      if (/^(https?:\/\/|\/)/.test(m[2])) {
        out.push(`<figure class="fig${fig++ % 2 ? ' sol' : ''}"><div class="ph"><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy" decoding="async"></div>${m[3] ? '<small>' + esc(m[3]) + '</small>' : ''}</figure>`);
      }
      i++; continue;
    }
    if ((m = t.match(/^:::\s*(adimlar|belirti|karisim|takvim|katman)\s*$/i))) {
      bosalt();
      const blk = []; i++;
      while (i < satirlar.length && satirlar[i].trim() !== ':::') { if (satirlar[i].trim()) blk.push(satirlar[i].trim()); i++; }
      i++;
      out.push(bilgiGorsel(m[1].toLowerCase(), blk));
      continue;
    }
    if (t.startsWith('>')) {
      bosalt();
      const blk = [];
      while (i < satirlar.length && satirlar[i].trim().startsWith('>')) { blk.push(satirlar[i].trim().replace(/^>\s?/, '')); i++; }
      let s = blk.join(' ');
      let tur = 'tipn', ad = 'Bahçıvan İpucu', ik = 'i-bulb';
      if ((m = s.match(/^(İpucu|Bahçıvan İpucu)\s*:\s*/i))) s = s.slice(m[0].length);
      else if ((m = s.match(/^(Unutmayın|Dikkat|Not)\s*:\s*/i))) { s = s.slice(m[0].length); tur = 'rem'; ad = m[1].charAt(0).toUpperCase() + m[1].slice(1); ik = 'i-drop'; }
      out.push(`<div class="note ${tur} clear"><span class="i">${IK(ik)}</span><div><b>${esc(ad)}</b><p>${satirIci(s)}</p></div></div>`);
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      bosalt();
      const li = [];
      while (i < satirlar.length && /^[-*]\s+/.test(satirlar[i].trim())) { li.push(satirlar[i].trim().replace(/^[-*]\s+/, '')); i++; }
      out.push('<ul class="ck">' + li.map((x) => `<li>${IK('i-check')}<span>${satirIci(x)}</span></li>`).join('') + '</ul>');
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      bosalt();
      const li = [];
      while (i < satirlar.length && /^\d+[.)]\s+/.test(satirlar[i].trim())) { li.push(satirlar[i].trim().replace(/^\d+[.)]\s+/, '')); i++; }
      out.push('<ol class="nl2">' + li.map((x) => `<li>${satirIci(x)}</li>`).join('') + '</ol>');
      continue;
    }
    if (t.startsWith('|')) {
      bosalt();
      const rows = [];
      while (i < satirlar.length && satirlar[i].trim().startsWith('|')) { rows.push(satirlar[i].trim()); i++; }
      const hucre = (r) => r.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
      const govdeR = rows.filter((r) => !/^\|[\s:|-]+\|?$/.test(r));
      const [bas, ...kal] = govdeR;
      if (bas) out.push('<div class="tbl"><table><thead><tr>' + hucre(bas).map((x) => `<th>${satirIci(x)}</th>`).join('') + '</tr></thead><tbody>' +
        kal.map((r) => '<tr>' + hucre(r).map((x) => `<td>${satirIci(x)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    para.push(t);
    i++;
  }
  bosalt();
  return { html: out.join('\n'), basliklar, urunler };
}

// Düz metin (arama, özet, okuma süresi, llms.txt için)
export function duz(govde) {
  return String(govde || '').replace(/^:::.*$/gm, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[ürün:[^\]]*\]/gi, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{2,3}\s+/gm, '').replace(/^>\s?(İpucu|Unutmayın|Dikkat|Not)?\s*:?\s*/gim, '').replace(/[*|]/g, ' ').replace(/^[-]{3,}$/gm, '').replace(/\s+/g, ' ').trim();
}
