// HasTürk Blog paneli: menü, onay soruları, editör araçları, canlı SEO kontrolü, ürün arama. Sayfalar betiksiz de çalışır.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var b = $('#burger'), sc = $('#scrim');
  if (b) b.addEventListener('click', function () { document.body.classList.toggle('nav'); });
  if (sc) sc.addEventListener('click', function () { document.body.classList.remove('nav'); });
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-onay]');
    if (o && !confirm(o.getAttribute('data-onay'))) e.preventDefault();
  });
  $$('select[data-oto], input[data-oto]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
  // Telefonda tablolar kart görünümüne geçer: her hücreye sütun başlığı etiket olarak yazılır (CSS: .tw table[data-m])
  $$('.tw table').forEach(function (tb) {
    var bas = $$('thead th', tb).map(function (th) { return th.textContent.trim(); });
    $$('tbody tr', tb).forEach(function (tr) {
      var i = 0;
      $$('td', tr).forEach(function (td) { var sp = +(td.getAttribute('colspan') || 1); if (bas[i] && !td.hasAttribute('data-l')) td.setAttribute('data-l', bas[i]); i += sp; });
    });
    tb.setAttribute('data-m', '1');
  });
  // "/" tuşu: üstteki aramaya odaklan
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && $('#tq')) { e.preventDefault(); $('#tq').focus(); $('#tq').select(); return; }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') && $('#tq')) { e.preventDefault(); $('#tq').focus(); }
  });
  // Canlı kart: son 30 dakika, dakikada bir yenilenir (sekme görünür değilken bekler)
  var ck = $('[data-canli]');
  if (ck) {
    var yukle = function () {
      if (document.hidden) return;
      fetch(location.pathname.replace(/\/panel(\/.*)?$/, '/panel') + '/canli', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (h) { if (h) ck.innerHTML = h; }).catch(function () {});
    };
    yukle(); setInterval(yukle, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) yukle(); });
  }
  // Ayar sekmeleri: tek form, bölümler arasında geçiş (seçilen bölüm adres çubuğunda #bölüm olarak kalır)
  var an = $('[data-ayar]');
  if (an) {
    var ac = function (k) {
      if (!$('[data-bol="' + k + '"]')) return;
      $$('[data-ayar] button').forEach(function (x) { var on = x.getAttribute('data-b') === k; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
      $$('[data-bol]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-bol') === k); });
    };
    an.addEventListener('click', function (e) { var x = e.target.closest('button[data-b]'); if (x) { ac(x.getAttribute('data-b')); history.replaceState(null, '', '#' + x.getAttribute('data-b')); } });
    if (location.hash) ac(location.hash.slice(1));
  }
  var hepsi = $('[data-hepsi]');
  if (hepsi) hepsi.addEventListener('change', function () { $$('input[name=id][form=toplu]').forEach(function (x) { x.checked = hepsi.checked; }); });

  // ---- Ürün arama (editör ve ana sayfa) ----
  var uq = $('#urunq'), us = $('#urunsonuc'), ui = $('#urunler'), t;
  var taban = location.pathname.replace(/\/panel(\/.*)?$/, '/panel');
  function urunListe() { return (ui.value || '').split(/[\s,]+/).filter(Boolean); }
  function urunEkle(s) { var l = urunListe(); if (l.indexOf(s) < 0) l.push(s); ui.value = l.join(', '); ui.dispatchEvent(new Event('input')); }
  if (uq && us && ui) {
    uq.addEventListener('input', function () {
      clearTimeout(t);
      var q = uq.value.trim();
      if (q.length < 2) { us.innerHTML = ''; return; }
      t = setTimeout(function () {
        fetch(taban + '/urun-ara?q=' + encodeURIComponent(q), { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
          us.innerHTML = '';
          (d.l || []).forEach(function (p) {
            var row = document.createElement('div');
            var im = document.createElement('img'); im.src = p.img; im.alt = '';
            var tx = document.createElement('p'); var bb = document.createElement('b'); bb.textContent = p.n; var sm = document.createElement('small'); sm.textContent = p.s + (p.uygun ? '' : ' · otomatik öneride yok');
            tx.appendChild(bb); tx.appendChild(sm);
            var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn btn-l btn-s'; bt.textContent = 'Ekle';
            bt.onclick = function () { urunEkle(p.s); bt.textContent = 'Eklendi'; bt.disabled = true; kartEkle(p); };
            row.appendChild(im); row.appendChild(tx); row.appendChild(bt); us.appendChild(row);
          });
          if (!(d.l || []).length) us.innerHTML = '<p class="muted" style="font-size:12px">Ürün bulunamadı.</p>';
        });
      }, 250);
    });
  }
  var sec = $('#secili');
  function kartEkle(p) {
    if (!sec) return;
    var d = document.createElement('div'); d.className = 'on'; d.setAttribute('data-s', p.s);
    var im = document.createElement('img'); im.src = p.img; im.alt = '';
    var bb = document.createElement('b'); bb.textContent = p.n;
    var sp = document.createElement('span'); sp.textContent = Number(p.p).toLocaleString('tr-TR') + ' TL';
    var x = document.createElement('button'); x.type = 'button'; x.className = 'lnk'; x.textContent = 'Kaldır'; x.setAttribute('data-urunsil', p.s);
    d.appendChild(im); d.appendChild(bb); d.appendChild(sp); d.appendChild(x); sec.appendChild(d);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-urunekle]');
    if (a && ui) { urunEkle(a.getAttribute('data-urunekle')); a.textContent = 'Eklendi'; a.disabled = true; }
    var r = e.target.closest('[data-urunsil]');
    if (r && ui) { var s = r.getAttribute('data-urunsil'); ui.value = urunListe().filter(function (x) { return x !== s; }).join(', '); var k = r.closest('[data-s]'); if (k) k.remove(); }
  });

  // ---- Editör ----
  var f = $('#edform');
  if (!f) return;
  var g = $('#govde');
  function sec2() { return { a: g.selectionStart, b: g.selectionEnd, s: g.value.slice(g.selectionStart, g.selectionEnd) }; }
  function koy(metin, imlec) {
    var x = sec2();
    g.focus();
    g.setRangeText(metin, x.a, x.b, 'end');
    if (imlec != null) g.selectionStart = g.selectionEnd = x.a + imlec;
    g.dispatchEvent(new Event('input'));
  }
  function satirBasi() { var x = g.selectionStart; return x === 0 || g.value[x - 1] === '\n'; }
  f.addEventListener('click', function (e) {
    var k = e.target.closest('button[type=button]');
    if (!k) return;
    var x = sec2();
    if (k.hasAttribute('data-ekle')) koy((satirBasi() ? '' : '\n') + k.getAttribute('data-ekle') + (x.s || ''));
    else if (k.hasAttribute('data-blok')) koy((satirBasi() ? '' : '\n\n') + k.getAttribute('data-blok') + (x.s || '') + '\n');
    else if (k.hasAttribute('data-sar')) { var w = k.getAttribute('data-sar'); koy(w + (x.s || 'metin') + w, x.s ? null : w.length); }
    else if (k.hasAttribute('data-link')) { var u = prompt('Bağlantı adresi (ör. /blog/yazi-adresi ya da https://hasturkgubre.com.tr/…):'); if (u) koy('[' + (x.s || 'bağlantı metni') + '](' + u + ')'); }
    else if (k.hasAttribute('data-gorsel')) { var gu = prompt('Görsel adresi:', '/blog-statik/foto/ortanca.webp'); if (gu) { var al = prompt('Görselin kısa açıklaması (alt metin):', '') || ''; koy('\n\n![' + al + '](' + gu + ' "' + al + '")\n'); } }
    else if (k.hasAttribute('data-urun')) { var us2 = prompt('Ürün adresi (mağazadaki adresin son kısmı, ör. hg-cicek-topragi). Birden fazla için virgül:'); if (us2) koy('\n\n[ürün:' + us2.replace(/\s+/g, '') + ']\n'); }
    else if (k.hasAttribute('data-icekle')) { koy(k.getAttribute('data-icekle')); k.textContent = 'Eklendi'; k.disabled = true; }
    else if (k.hasAttribute('data-foto')) { $('#gorsel').value = k.getAttribute('data-foto'); $('#gorsel').dispatchEvent(new Event('input')); }
    else if (k.hasAttribute('data-onizle')) onizle();
    else if (k.hasAttribute('data-baslik')) basligaGit(k.getAttribute('data-baslik'));
  });
  // İçindekiler (sol sütun): metindeki ## / ### başlıkları; tıklayınca metinde o başlığa gider. Altında kelime ve okuma süresi
  var toc = $('#edtoc'), say = $('#edsay');
  function basligaGit(t) {
    var i = g.value.split('\n').findIndex(function (l) { return /^#{2,3} /.test(l) && l.replace(/^#+\s*/, '') === t; });
    if (i < 0) return;
    var pos = g.value.split('\n').slice(0, i).join('\n').length + (i ? 1 : 0);
    g.focus(); g.setSelectionRange(pos, pos);
    var oran = i / Math.max(1, g.value.split('\n').length); g.scrollTop = Math.max(0, g.scrollHeight * oran - 40);
  }
  function tocGuncel() {
    if (!toc) return;
    var h = g.value.split('\n').filter(function (l) { return /^#{2,3} /.test(l); });
    toc.innerHTML = h.length ? h.map(function (l) { var t = l.replace(/^#+\s*/, ''), e2 = t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); return '<li class="d' + (l.indexOf('### ') === 0 ? 3 : 2) + '"><button type="button" data-baslik="' + e2 + '">' + e2 + '</button></li>'; }).join('') : '<li class="bos">## ile başlık ekledikçe burada görünür.</li>';
    if (say) { var k = (g.value.replace(/[#*>|\-\[\]()!]/g, ' ').match(/\S+/g) || []).length; say.textContent = k.toLocaleString('tr-TR') + ' kelime · ' + Math.max(1, Math.round(k / 200)) + ' dk okuma'; }
  }
  var tocZ; g.addEventListener('input', function () { clearTimeout(tocZ); tocZ = setTimeout(tocGuncel, 400); });
  tocGuncel();
  // Ctrl+B / Ctrl+I
  g.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var w = e.key === 'b' ? '**' : e.key === 'i' ? '*' : null;
    if (w) { e.preventDefault(); var x = sec2(); koy(w + (x.s || '') + w, x.s ? null : w.length); }
  });
  // Görsel önizleme
  var gi = $('#gorsel'), go = $('#gorselon');
  var kulMap = {}; try { kulMap = JSON.parse(($('.fotos') || {}).getAttribute ? $('.fotos').getAttribute('data-kullanilan') || '{}' : '{}'); } catch (e) {}
  var gt = $('#gtekrar');
  function gorselGuncel() {
    go.src = gi.value || '/blog-statik/logo.webp';
    $$('[data-foto]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-foto') === gi.value); });
    // Seçilen görsel başka bir yazıda kullanılıyorsa uyar
    if (gt) { var b = kulMap[gi.value]; gt.hidden = !b; gt.textContent = b ? 'Bu görsel “' + b + '” yazısında da kullanılıyor. Farklı bir görsel seçmenizi öneririz.' : ''; }
  }
  gi.addEventListener('input', gorselGuncel); gorselGuncel();
  // Önizleme
  var oz = $('#onz'), ozf = $('#onzf');
  function onizle() {
    if (!oz.hidden) { oz.hidden = true; return; }
    var fd = new FormData(); ['baslik', 'ozet', 'kisaca', 'govde', 'sss'].forEach(function (n) { fd.append(n, f.elements[n].value); });
    fetch(taban + '/onizle', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) { ozf.srcdoc = d.html; oz.hidden = false; oz.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
  // Sayaçlar, Google önizlemesi, SEO kontrolü
  var el = function (n) { return f.elements[n]; };
  var tr = function (s) { return String(s || '').toLocaleLowerCase('tr-TR'); };
  function duz(s) { return String(s || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[ürün:[^\]]*\]/gi, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^#{2,3}\s+/gm, '').replace(/^>\s?(İpucu|Unutmayın|Dikkat|Not)?\s*:?\s*/gim, '').replace(/[*|]/g, ' ').replace(/^[-]{3,}$/gm, '').replace(/\s+/g, ' ').trim(); }
  function guncelle() {
    var bas = el('seo_baslik').value || el('baslik').value, aci = el('seo_aciklama').value || el('ozet').value;
    $('#serpt').textContent = bas || 'Yazı başlığı';
    $('#serpd').textContent = (aci || 'Meta açıklaması…').slice(0, 160);
    [['seo_baslik', bas.length, 60], ['seo_aciklama', aci.length, 155]].forEach(function (x) {
      var s = $('[data-say="' + x[0] + '"]'); if (s) s.textContent = x[1] + ' / ' + x[2];
      var bar = $('[data-bar="' + x[0] + '"]'); if (bar) { bar.style.setProperty('--w', Math.min(100, x[1] / x[2] * 100) + '%'); bar.style.background = x[1] > x[2] ? '#d8343f' : x[1] < x[2] * 0.6 ? '#e8891c' : ''; }
    });
    var oz2 = $('[data-say="ozet"]'); if (oz2) oz2.textContent = el('ozet').value.length + ' karakter';
    // Ölçütler src/blog/seo-puan.js ile aynı (birlikte güncel tutun)
    var metin = duz(g.value), ml = tr(metin), kel = tr(el('odak').value).trim(), kelS = metin.split(/\s+/).filter(Boolean).length;
    var h2 = (g.value.match(/^##\s+.+$/gm) || []).map(function (h) { return tr(h.replace(/^##\s+/, '')); }), urun = (g.value.match(/\[ürün:/gi) || []).length;
    var icS = {}; (g.value.match(/\]\(\/(blog\/)?[a-z0-9-]+\)/g) || []).forEach(function (x) { icS[x.replace(/^\]\(\/(blog\/)?|\)$/g, '')] = 1; }); var ic = Object.keys(icS).length;
    var sss = el('sss').value.split(/\n\s*\n/).filter(function (b) { return /^\s*S:/m.test(b) && /^\s*C:/m.test(b); }).length;
    var slug = el('slug').value || slugYap(el('baslik').value), kac = 0, i0 = 0;
    if (kel) while ((i0 = ml.indexOf(kel, i0)) >= 0) { kac++; i0 += kel.length; }
    var yog = kelS ? kac * kel.split(/\s+/).length / kelS * 100 : 0, alt = el('gorsel_alt').value.trim(), kis = el('kisaca').value.trim();
    var sc = $('#seochk'), odaklar = []; try { odaklar = JSON.parse(sc.getAttribute('data-odaklar') || '[]'); } catch (e) {}
    var cift = kel && odaklar.indexOf(kel) >= 0;
    var kon = [
      [kel && tr(el('baslik').value).indexOf(kel) >= 0, kel ? 'Odak kelime başlıkta geçiyor' : 'Odak anahtar kelime yazın', 2],
      [kel && ml.slice(0, 400).indexOf(kel) >= 0, 'Odak kelime ilk paragrafta geçiyor', 1],
      [kel && tr(aci).indexOf(kel) >= 0, 'Odak kelime meta açıklamasında geçiyor', 1],
      [kel && h2.some(function (h) { return h.indexOf(kel) >= 0; }), 'Odak kelime en az bir ara başlıkta (##) geçiyor', 1],
      [kel && slug.indexOf(slugYap(kel)) >= 0, 'Odak kelime adreste (slug) geçiyor', 1],
      [kel && kac >= 3 && yog <= 3, 'Odak kelime metinde ' + kac + ' kez geçiyor' + (kac < 3 ? ' · en az 3 olmalı' : yog > 3 ? ' · aşırı tekrar, azaltın' : ''), 1],
      [kel && !cift, cift ? 'Bu odak kelime başka bir yazıda kullanılıyor · farklı bir açı seçin' : 'Odak kelime başka yazıda kullanılmıyor', 1],
      [bas.length >= 35 && bas.length <= 60, 'SEO başlığı 35–60 karakter (' + bas.length + ')', 1],
      [aci.length >= 120 && aci.length <= 158, 'Meta açıklaması 120–158 karakter (' + aci.length + ')', 1],
      [kis.length >= 80 && kis.length <= 360, 'Kısaca kutusu 80–360 karakter (öne çıkan cevap için)', 1],
      [kelS >= 800, 'Metin uzunluğu ' + kelS + ' kelime' + (kelS < 800 ? ' (en az 800)' : ''), 1],
      [h2.length >= 4, h2.length + ' bölüm başlığı (##)' + (h2.length < 4 ? ' · en az 4' : ''), 1],
      [alt.length >= 15, 'Öne çıkan görselin açıklayıcı alt metni var', 1],
      [sss >= 3, sss + ' sık sorulan soru' + (sss < 3 ? ' · en az 3 (FAQ yapısal verisi)' : ''), 1],
      [ic >= 3, ic + ' farklı iç bağlantı' + (ic < 3 ? ' · en az 3' : ''), 1],
      [urun >= 1 || !el('urun_oto') || el('urun_oto').checked, urun ? urun + ' yazı içi ürün kartı' : 'Ürünler otomatik önerilecek', 0],
    ];
    var puan = 0, top = 0;
    $('#seochk').innerHTML = '';
    kon.forEach(function (k) {
      if (k[2]) { top += k[2]; if (k[0]) puan += k[2]; }
      var d = document.createElement('div'), i = document.createElement('i');
      i.className = k[0] ? 'ok' : 'wr'; i.textContent = k[0] ? '✓' : '!';
      d.appendChild(i); d.appendChild(document.createTextNode(k[1])); $('#seochk').appendChild(d);
    });
    var p = Math.round(puan / top * 100), r = $('#seoring');
    r.style.setProperty('--v', p); r.style.setProperty('--c', p >= 80 ? 'var(--green-lt)' : p >= 60 ? '#e8891c' : '#d8343f'); r.firstElementChild.textContent = p;
  }
  f.addEventListener('input', guncelle); f.addEventListener('change', guncelle); guncelle();
  // Kaydedilmemiş değişiklik uyarısı
  var degisti = false;
  f.addEventListener('input', function () { degisti = true; });
  f.addEventListener('submit', function () { degisti = false; });
  window.addEventListener('beforeunload', function (e) { if (degisti) { e.preventDefault(); e.returnValue = ''; } });
  // Başlıktan otomatik adres (yeni yazıda)
  var sl = el('slug');
  if (!sl.value) el('baslik').addEventListener('input', function () { sl.placeholder = slugYap(el('baslik').value) || 'otomatik'; });
  function slugYap(s) { var m = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }; return tr(s).replace(/[çğıöşü]/g, function (c) { return m[c]; }).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90); }
})();
// Grafikler: üzerine gelince (telefonda dokununca) o günün değerleri kutuda görünür (src/blog/panel.js > cizgi / egri)
(function () {
  'use strict';
  var AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var gunAd = function (d) { d = String(d); return +d.slice(8, 10) + ' ' + AY[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4); };
  var bicim = function (v, f) {
    if (v == null) return 'veri yok';
    if (f === 'sira') return v ? v.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + '. sıra' : '—';
    if (f === 'para') return v.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺';
    if (f === 'yuzde') return '%' + v.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
    return v.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  };
  Array.prototype.forEach.call(document.querySelectorAll('.gr[data-g]'), function (g) {
    var d; try { d = JSON.parse(g.getAttribute('data-g')); } catch (e) { return; }
    var p = g.querySelector('.gr-p'), cz = g.querySelector('.gr-cz'), tip = g.querySelector('.gr-tip'), n = d.x.length, mini = g.classList.contains('mini');
    if (!p || !cz || !tip || n < 1) return;
    var noktalar = d.s.map(function (s) { var i = document.createElement('i'); i.className = 'gr-n'; i.style.background = s.r; i.hidden = true; p.appendChild(i); return i; });
    function goster(e) {
      var r = p.getBoundingClientRect(); if (!r.width) return;
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), i = n < 2 ? 0 : Math.round(x * (n - 1)), px = n < 2 ? 50 : i / (n - 1) * 100;
      cz.style.left = px + '%'; cz.hidden = false;
      d.s.forEach(function (s, k) { var v = s.v[i]; if (v == null) { noktalar[k].hidden = true; return; } noktalar[k].hidden = false; noktalar[k].style.left = px + '%'; noktalar[k].style.top = (mini ? (28 - v / s.t * 24) / 30 * 100 : 100 - v / s.t * 100) + '%'; });
      tip.innerHTML = '<b>' + gunAd(d.x[i]) + '</b>' + d.s.map(function (s) { return '<div><span><i style="background:' + s.r + '"></i>' + s.ad + '</span><em>' + bicim(s.v[i], s.f) + '</em></div>'; }).join('');
      tip.hidden = false;
      var w = tip.offsetWidth, sol = px / 100 * r.width + 14;
      if (sol + w > r.width) sol = px / 100 * r.width - w - 14;
      tip.style.left = Math.max(mini ? -r.left + 8 : -40, sol) + 'px';
    }
    function gizle() { cz.hidden = true; tip.hidden = true; noktalar.forEach(function (x) { x.hidden = true; }); }
    p.addEventListener('pointermove', goster);
    p.addEventListener('pointerdown', goster);
    p.addEventListener('pointerleave', gizle);
  });
})();
// Takvim: yazısı olan güne basınca altında o günün yazıları açılır
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('.takvim'), function (k) {
    k.addEventListener('click', function (e) {
      var a = e.target.closest('.cal a[data-gun]'); if (!a) return;
      var l = k.querySelector('.cgun[data-gun="' + a.getAttribute('data-gun') + '"]'); if (!l) return;
      e.preventDefault();
      Array.prototype.forEach.call(k.querySelectorAll('.cgun'), function (x) { x.hidden = x !== l; });
      Array.prototype.forEach.call(k.querySelectorAll('.cal a.sec'), function (x) { x.classList.remove('sec'); });
      a.classList.add('sec');
      if (l.getBoundingClientRect().top > innerHeight - 80) l.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();
// Uzun süren işlem düğmesi (Bilge Bey denetimi): basınca bekleme yazısı, ikinci basış engellenir
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('form[data-yukleniyor]'), function (f) {
    f.addEventListener('submit', function () { var b = f.querySelector('button'); if (b) { b.disabled = true; b.textContent = f.getAttribute('data-yukleniyor'); } });
  });
})();
