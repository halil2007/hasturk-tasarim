// HasTürk Blog: küçük etkileşimler (vitrin kaydırma, paylaş, yorum yanıtla, sıralama). Sayfa betiksiz de çalışır.
(function () {
  'use strict';
  // Vitrin (öne çıkan yazılar)
  var sl = document.querySelector('.slider');
  if (sl) {
    var hs = sl.querySelectorAll('.hero'), i = 0, t;
    var git = function (n) {
      hs[i].classList.remove('on'); hs[i].setAttribute('aria-hidden', 'true');
      i = (n + hs.length) % hs.length;
      hs[i].classList.add('on'); hs[i].removeAttribute('aria-hidden');
    };
    sl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-yon]');
      if (!b) return;
      git(i + parseInt(b.getAttribute('data-yon'), 10));
      clearInterval(t);
    });
    if (hs.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) t = setInterval(function () { if (!document.hidden) git(i + 1); }, 7000);
  }
  // Paylaş bağlantıları
  var sh = document.querySelector('[data-paylas]');
  if (sh) {
    var u = encodeURIComponent(location.href.split('#')[0].split('?')[0]), tt = encodeURIComponent(document.title);
    sh.querySelectorAll('[data-p]').forEach(function (a) {
      var p = a.getAttribute('data-p');
      if (p === 'fb') a.href += u;
      else if (p === 'x') a.href += u + '&text=' + tt;
      else if (p === 'pin') a.href += u + '&description=' + tt;
      else if (p === 'wa') a.href += tt + '%20' + u;
      else if (p === 'kopya') a.addEventListener('click', function (e) {
        e.preventDefault();
        var tam = location.href.split('#')[0].split('?')[0];
        (navigator.clipboard ? navigator.clipboard.writeText(tam) : Promise.reject()).then(function () { a.setAttribute('aria-label', 'Kopyalandı'); a.classList.add('ok'); setTimeout(function () { a.classList.remove('ok'); }, 1500); }, function () { prompt('Bağlantı:', tam); });
      });
    });
  }
  // Yorum yanıtla
  var f = document.getElementById('yorumform');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-yanit]');
    if (!b || !f) return;
    f.querySelector('[name=ust_id]').value = b.getAttribute('data-yanit');
    var n = f.querySelector('.yanit-not');
    n.hidden = false;
    n.innerHTML = '';
    n.appendChild(document.createTextNode(b.getAttribute('data-ad') + ' kişisine yanıt yazıyorsunuz · '));
    var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Vazgeç';
    x.onclick = function () { f.querySelector('[name=ust_id]').value = ''; n.hidden = true; };
    n.appendChild(x);
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    f.querySelector('textarea').focus({ preventScroll: true });
  });
  // Giriş / üye ol: sekmeler (sayfadaki ve penceredeki kartlarda)
  function sekme(kart, ad) {
    kart.querySelectorAll('[data-sekme]').forEach(function (b) { var on = b.getAttribute('data-sekme') === ad; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    kart.querySelectorAll('[data-form]').forEach(function (f) { f.hidden = f.getAttribute('data-form') !== ad; });
  }
  // Dokunmatik ekranda alanlara kendiliğinden odaklanma: klavye açılıp pencereyi kapatmasın
  var ince = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  function ilkAlan(kart) { return kart.querySelector('[data-form]:not([hidden]) input:not([type=hidden]):not([tabindex]):not([type=checkbox])'); }
  function hataGoster(f, m) {
    var k = f.querySelector('.flash.err');
    if (!k) { k = document.createElement('div'); k.className = 'flash err'; k.setAttribute('role', 'alert'); f.insertBefore(k, f.firstChild); }
    k.textContent = m; k.hidden = !m;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sekme]');
    if (b) {
      var kart = b.closest('.gkart'); sekme(kart, b.getAttribute('data-sekme'));
      kart.querySelectorAll('.flash.err').forEach(function (x) { x.hidden = true; });
      if (ince) { var i = ilkAlan(kart); if (i) i.focus(); }
    }
    var g = e.target.closest('[data-goster]');
    if (g) {
      var inp = g.parentNode.querySelector('input'), ac = inp.type === 'password';
      inp.type = ac ? 'text' : 'password'; g.textContent = ac ? 'Gizle' : 'Göster'; g.setAttribute('aria-label', ac ? 'Şifreyi gizle' : 'Şifreyi göster');
    }
  });
  // Telefonda üç çizgili menü (soldan açılan çekmece)
  var ckm = document.getElementById('ckm'), ckmBtnler = document.querySelectorAll('[data-ckm]'), ckmBtn = ckmBtnler[0], ckmGecmis = false;
  function ckmAcik() { return ckm && ckm.classList.contains('acik'); }
  function ckmKapat(geriTusu) {
    if (!ckmAcik()) return;
    ckm.classList.remove('acik'); ckm.setAttribute('aria-hidden', 'true'); ckmBtnler.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (!(gp && gp.classList.contains('acik'))) document.documentElement.classList.remove('kilit');
    if (ckmGecmis && !geriTusu) { ckmGecmis = false; history.back(); } else ckmGecmis = false;
  }
  // Çekmeceden giriş penceresi açılırsa geçmiş kaydı pencereye devredilir (geri tuşu yine yalnız pencereyi kapatır)
  function ckmDevret() { if (!ckmAcik()) return false; var g = ckmGecmis; ckmGecmis = false; ckmKapat(true); return g; }
  if (ckm && ckmBtn) {
    ckmBtnler.forEach(function (b) { b.addEventListener('click', function () {
      ckm.classList.add('acik'); ckm.setAttribute('aria-hidden', 'false'); b.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('kilit');
      try { history.pushState({ ckm: 1 }, ''); ckmGecmis = true; } catch (x) {}
      var k = ckm.querySelector('.ckm-x'); if (k && ince) k.focus();
    }); });
    ckm.addEventListener('click', function (e) { if (e.target === ckm || e.target.closest('[data-ckm-kapat]')) ckmKapat(); });
    window.addEventListener('popstate', function () { if (ckmAcik()) ckmKapat(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ckmAcik()) ckmKapat(); });
  }
  // Telefonda arama kutusu büyüteç simgesiyle açılır
  var araBtn = document.querySelector('[data-ara]'), bas_ = document.querySelector('.head');
  if (araBtn && bas_) araBtn.addEventListener('click', function () {
    var ac = !bas_.classList.contains('ara-acik'); bas_.classList.toggle('ara-acik', ac); araBtn.setAttribute('aria-expanded', ac ? 'true' : 'false');
    if (ac) { var q = document.getElementById('q'); if (q) q.focus(); }
  });
  // Masaüstünde açılan arama: Esc ya da dışarı tıklayınca kapanır
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bas_ && bas_.classList.contains('ara-acik')) { bas_.classList.remove('ara-acik'); if (araBtn) araBtn.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('click', function (e) { if (bas_ && bas_.classList.contains('ara-acik') && window.innerWidth > 1180 && !e.target.closest('.search, [data-ara]')) { bas_.classList.remove('ara-acik'); if (araBtn) araBtn.setAttribute('aria-expanded', 'false'); } });
  // Giriş penceresi: "Giriş yap" bağlantıları ayrı sayfaya gitmeden aynı sayfada açar
  var gp = document.getElementById('gpen'), onceki = null, gecmis = false;
  function kapat(geriTusu) {
    if (!gp || !gp.classList.contains('acik')) return;
    gp.classList.remove('acik'); document.documentElement.classList.remove('kilit');
    if (gecmis && !geriTusu) { gecmis = false; history.back(); } else gecmis = false;
    if (onceki && ince) onceki.focus();
  }
  if (gp) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-giris], a[href*="/giris"], a[href*="/kayit"]');
      if (a && !e.ctrlKey && !e.metaKey && !a.closest('.gkart')) {
        e.preventDefault();
        onceki = a;
        var geri = null;
        try { geri = new URL(a.href, location.href).searchParams.get('geri'); } catch (x) {}
        gp.querySelectorAll('[name=geri]').forEach(function (i) { i.value = geri || (location.pathname + location.search); });
        var kart = gp.querySelector('.gkart');
        sekme(kart, /\/kayit/.test(a.getAttribute('href') || '') ? 'kayit' : 'giris');
        kart.querySelectorAll('.flash.err').forEach(function (x) { x.hidden = true; });
        gp.classList.add('acik'); document.documentElement.classList.add('kilit');
        kart.scrollTop = 0;
        // telefonda geri tuşu sayfadan çıkmasın, pencereyi kapatsın
        if (ckmDevret()) gecmis = true; else { try { history.pushState({ gpen: 1 }, ''); gecmis = true; } catch (x) {} }
        if (ince) { var i = ilkAlan(kart); if (i) setTimeout(function () { i.focus(); }, 30); }
        return;
      }
      if (e.target === gp || e.target.closest('[data-kapat]')) kapat();
    });
    window.addEventListener('popstate', function () { if (gp.classList.contains('acik')) kapat(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && gp.classList.contains('acik')) kapat(); });
    // Pencere içindeki formlar sayfa değiştirmeden gönderilir; hata olursa pencerede yazılır
    gp.addEventListener('submit', function (e) {
      var f = e.target; e.preventDefault(); e.stopPropagation();
      if (f.dataset.gonderiliyor) return;
      var kayit = f.getAttribute('data-form') === 'kayit', v = function (n) { var x = f.querySelector('[name=' + n + ']'); return x ? x : {}; };
      var ep = (v('eposta').value || '').trim(), sf = v('sifre').value || '';
      var hata = kayit && (v('ad').value || '').trim().length < 2 ? 'Lütfen adınızı yazın.'
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ep) ? 'Geçerli bir e-posta adresi yazın.'
        : !sf ? 'Şifrenizi yazın.'
        : kayit && sf.length < 8 ? 'Şifre en az 8 karakter olmalı.'
        : kayit && !v('kvkk').checked ? 'Devam etmek için Üyelik Sözleşmesi\'ni onaylayın.' : '';
      if (hata) { hataGoster(f, hata); return; }
      hataGoster(f, '');
      var btn = f.querySelector('button:not([type=button])'), yazi = btn.textContent;
      f.dataset.gonderiliyor = '1'; btn.disabled = true; btn.textContent = 'Lütfen bekleyin…';
      var bitir = function () { delete f.dataset.gonderiliyor; btn.disabled = false; btn.textContent = yazi; };
      fetch(f.action, { method: 'POST', body: new URLSearchParams(new FormData(f)), credentials: 'same-origin' }).then(function (r) {
        if (r.redirected) { location.href = r.url; return; }
        return r.text().then(function (h) {
          var d = new DOMParser().parseFromString(h, 'text/html'), m = d.querySelector('.gkart .flash.err');
          hataGoster(f, m ? m.textContent : 'Bir sorun oluştu. Lütfen tekrar deneyin.'); bitir();
        });
      }).catch(function () { hataGoster(f, 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'); bitir(); });
    });
  }
  // İçindekiler: okunan bölümü işaretle
  var toc = document.querySelectorAll('.yz-toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    var hs = Array.prototype.map.call(toc, function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) toc.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); }); });
    }, { rootMargin: '0px 0px -70% 0px' });
    hs.forEach(function (h) { io.observe(h); });
  }
  // Sıralama kutusu seçilince gönder
  document.querySelectorAll('select[data-oto]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
  // Fotoğraf yükleme: tarayıcıda küçültülür ve WebP/JPEG'e çevrilir (konum bilgisi de böylece silinir); önizleme gösterilir
  var kucult = function (dosya, kare, boy) {
    return createImageBitmap(dosya).then(function (bm) {
      var w = bm.width, h = bm.height, sx = 0, sy = 0, sw = w, sh = h;
      if (kare) { var m = Math.min(w, h); sx = (w - m) / 2; sy = (h - m) / 2; sw = sh = m; w = h = Math.min(m, boy); }
      else { var o = Math.min(1, boy / Math.max(w, h)); w = Math.round(w * o); h = Math.round(h * o); }
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(bm, sx, sy, sw, sh, 0, 0, w, h);
      return new Promise(function (ok) {
        cv.toBlob(function (b) {
          if (b && b.type === 'image/webp') return ok(b);
          cv.toBlob(function (j) { ok(j); }, 'image/jpeg', 0.85);
        }, 'image/webp', 0.82);
      });
    });
  };
  document.querySelectorAll('input[type=file][data-foto]').forEach(function (inp) {
    var profil = inp.getAttribute('data-foto') === 'profil', max = parseInt(inp.getAttribute('data-max') || '1', 10);
    var on = inp.closest('.fld, form').querySelector('.foto-on');
    inp.addEventListener('change', function () {
      var tum = Array.prototype.slice.call(inp.files || []).filter(function (f) { return /^image\//.test(f.type); }), liste = tum.slice(0, max);
      if (!liste.length || !window.createImageBitmap || !window.DataTransfer) { if (profil && liste.length) inp.form.submit(); return; }
      inp.disabled = true;
      Promise.all(liste.map(function (f) { return kucult(f, profil, profil ? 400 : 1600).catch(function () { return f; }); })).then(function (bloblar) {
        var dt = new DataTransfer();
        bloblar.forEach(function (b, i) { dt.items.add(new File([b], 'foto-' + (i + 1) + (b.type === 'image/webp' ? '.webp' : '.jpg'), { type: b.type })); });
        inp.disabled = false; inp.files = dt.files;
        if (on) {
          on.innerHTML = '';
          bloblar.forEach(function (b) { var im = document.createElement('img'); im.alt = ''; im.src = URL.createObjectURL(b); on.appendChild(im); });
          if (tum.length > max) on.insertAdjacentHTML('beforeend', '<small>En fazla ' + max + ' fotoğraf eklenir.</small>');
        }
        if (profil) inp.form.submit();
      });
    });
  });
  // Form çift gönderimini engelle
  document.addEventListener('submit', function (e) {
    var b = e.target.querySelector('button:not([type=button])');
    if (e.target.dataset.gonderildi) { e.preventDefault(); return; }
    e.target.dataset.gonderildi = '1';
    if (b) setTimeout(function () { b.disabled = true; }, 0);
  });
  // Google Analytics: varsayılan olarak arka planda yüklenir (ölçüm); ziyaretçi alttaki "Çerez Tercihleri"nden reddederse yüklenmez/çerezleri silinir (opt-out)
  var gaM = document.querySelector('meta[name="hb-ga"]'), cz = document.getElementById('cerez');
  if (gaM) {
    var gaId = gaM.getAttribute('content'), ANAHTAR = 'hb_cerez';
    var karar = function () { try { return localStorage.getItem(ANAHTAR); } catch (x) { return null; } };
    var gaYukle = function () {
      if (window.__hbGa) return; window.__hbGa = 1;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', gaId);
      var sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId); document.head.appendChild(sc);
    };
    var gaSil = function () {
      document.cookie.split(';').forEach(function (c) {
        var ad = c.split('=')[0].trim(); if (!/^_ga/.test(ad)) return;
        var parca = location.hostname.split('.');
        for (var i = 0; i < parca.length - 1; i++) document.cookie = ad + '=; Max-Age=0; path=/; domain=.' + parca.slice(i).join('.');
        document.cookie = ad + '=; Max-Age=0; path=/';
      });
    };
    if (karar() !== 'hayir') gaYukle();
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cerez]');
      if (b) {
        var k = b.getAttribute('data-cerez'); try { localStorage.setItem(ANAHTAR, k); } catch (x) {}
        if (cz) cz.hidden = true;
        if (k === 'evet') gaYukle(); else if (window.__hbGa) { gaSil(); location.reload(); } else gaSil();
      }
      if (e.target.closest('[data-cerez-ayar]') && cz) { cz.hidden = false; var g = cz.querySelector('[data-cerez="evet"]'); if (g) g.focus(); }
    });
  }
  // Ürün kartları: bağlantı doğrudan mağazadaki ürün sayfasıdır (arama motorları için); tıklanınca sayaçlı
  // yönlendirme adresine çevrilir, böylece tık sayılır ve mağazaya kaynak bilgisiyle (UTM) gidilir
  function gitCevir(e) {
    var a = e.target.closest && e.target.closest('a[data-git]');
    if (a && a.getAttribute('href') !== a.getAttribute('data-git')) a.setAttribute('href', a.getAttribute('data-git'));
  }
  document.addEventListener('pointerdown', gitCevir, true);
  document.addEventListener('click', gitCevir, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter') gitCevir(e); }, true);
  // Yazı içindeki ürün bağlantıları doğrudan mağazaya gider; tıklama sayısı arka planda bildirilir
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-urun]');
    if (!a || !navigator.sendBeacon) return;
    var yol = location.pathname.indexOf('/blog/') === 0 || location.pathname === '/blog' ? '/blog' : '';
    try { navigator.sendBeacon(yol + '/api/tik', new Blob([a.getAttribute('data-urun')], { type: 'text/plain' })); } catch (x) {}
  });
  // Bağlantının üzerine gelinince önceden yüklenen yazı sunucuda sayılmaz; gerçekten açılınca burada bildirilir
  var ok = document.querySelector('meta[name="hb-okunma"]');
  if (ok && navigator.sendBeacon) {
    var yolO = location.pathname.indexOf('/blog/') === 0 || location.pathname === '/blog' ? '/blog' : '';
    try { navigator.sendBeacon(yolO + '/api/okunma', new Blob([ok.getAttribute('content')], { type: 'text/plain' })); } catch (x) {}
  }
})();
// Yazarken arama önerisi: data-oneri olan kutularda ilk yazılar ve sorular açılır listede gösterilir.
// data-oneri="soru" yalnız soruları gösterir (soru-cevap araması ve soru sorma formu). Ok tuşları + Enter ile seçilir.
(function () {
  'use strict';
  var kutular = document.querySelectorAll('input[data-oneri]');
  if (!kutular.length || !window.fetch) return;
  var rss = document.querySelector('link[rel=alternate][type="application/rss+xml"]');
  var kok = rss ? rss.getAttribute('href').replace(/\/feed\.xml$/, '') : '';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (h) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[h]; }); };
  kutular.forEach(function (inp, no) {
    var tur = inp.getAttribute('data-oneri') || '', baslik = inp.getAttribute('data-oneri-baslik') || '';
    var kap = inp.closest('form') || inp.parentNode;
    var liste = document.createElement('div');
    liste.className = 'oneri'; liste.id = 'oneri' + no; liste.setAttribute('role', 'listbox'); liste.hidden = true;
    (tur === 'soru' && baslik ? inp.parentNode : kap).appendChild(liste);
    inp.setAttribute('aria-controls', liste.id); inp.setAttribute('aria-autocomplete', 'list');
    var zaman, son = '', secili = -1, istek = 0;
    function kapat() { liste.hidden = true; secili = -1; inp.setAttribute('aria-expanded', 'false'); }
    function isaretle(n) {
      var ogeler = liste.querySelectorAll('a');
      if (!ogeler.length) return;
      secili = (n + ogeler.length) % ogeler.length;
      ogeler.forEach(function (a, i) { a.classList.toggle('on', i === secili); a.setAttribute('aria-selected', i === secili ? 'true' : 'false'); });
    }
    function goster(j, q) {
      var h = '';
      if (j.s.length) h += '<div class="oneri-bas">' + esc(baslik || 'Soru-Cevap') + '</div>' + j.s.map(function (s) { return '<a role="option" href="' + esc(s.u) + '"><span class="oneri-ik' + (s.z ? ' ok' : '') + '">' + (s.z ? '✓' : '?') + '</span><span><b>' + esc(s.b) + '</b><small>' + (s.z ? 'Çözüldü · ' : '') + s.n + ' cevap</small></span></a>'; }).join('');
      if (j.y.length) h += '<div class="oneri-bas">Yazılar</div>' + j.y.map(function (y) { return '<a role="option" href="' + esc(y.u) + '">' + (y.g ? '<img src="' + esc(y.g) + '" alt="" loading="lazy">' : '<span class="oneri-ik">▤</span>') + '<span><b>' + esc(y.b) + '</b>' + (y.k ? '<small>' + esc(y.k) + '</small>' : '') + '</span></a>'; }).join('');
      if (!h) { if (tur === 'soru' && baslik) { kapat(); return; } h = '<div class="oneri-yok">“' + esc(q) + '” için öneri yok. Enter ile tüm sonuçlarda arayın.</div>'; }
      else if (!(tur === 'soru' && baslik)) h += '<a class="oneri-tum" role="option" href="' + esc(kok + (tur === 'soru' ? '/soru-cevap' : '/ara') + '?q=' + encodeURIComponent(q)) + '">Tüm sonuçları göster →</a>';
      liste.innerHTML = h; liste.hidden = false; secili = -1; inp.setAttribute('aria-expanded', 'true');
    }
    inp.addEventListener('input', function () {
      var q = inp.value.trim();
      clearTimeout(zaman);
      if (q.length < 2) { kapat(); son = ''; return; }
      zaman = setTimeout(function () {
        if (q === son) { liste.hidden = false; return; }
        son = q; var benim = ++istek;
        fetch(kok + '/ara/oneri?q=' + encodeURIComponent(q) + (tur === 'soru' ? '&tur=soru' : ''), { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : { y: [], s: [] }; })
          .then(function (j) { if (benim === istek && inp.value.trim() === q) goster(j, q); })
          .catch(function () {});
      }, 180);
    });
    inp.addEventListener('keydown', function (e) {
      if (liste.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); isaretle(secili + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); isaretle(secili - 1); }
      else if (e.key === 'Escape') { kapat(); }
      else if (e.key === 'Enter' && secili >= 0) { var a = liste.querySelectorAll('a')[secili]; if (a) { e.preventDefault(); location.href = a.href; } }
    });
    inp.addEventListener('focus', function () { if (liste.innerHTML && inp.value.trim().length >= 2) liste.hidden = false; });
    document.addEventListener('click', function (e) { if (!liste.contains(e.target) && e.target !== inp) kapat(); });
  });
})();
// Ana sayfa vitrini: parmakla/fareyle kaydırılır, 6 saniyede bir sıradaki yazıya geçer; dokununca ya da üzerine
// gelince bekler. Hareket azaltma tercihi olanlarda kendiliğinden dönmez.
(function () {
  'use strict';
  var s = document.querySelector('[data-slayt]');
  if (!s) return;
  var iz = s.querySelector('.yn-iz'), sl = iz.children, n = sl.length, nk = s.querySelectorAll('[data-git]');
  if (n < 2) return;
  var i = 0, t = null, dur = false, az = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function git(k) { i = (k + n) % n; iz.scrollTo({ left: i * iz.clientWidth, behavior: az ? 'auto' : 'smooth' }); }
  function isaret() { nk.forEach(function (b, j) { b.classList.toggle('on', j === i); b.setAttribute('aria-current', j === i ? 'true' : 'false'); }); }
  var z;
  iz.addEventListener('scroll', function () { clearTimeout(z); z = setTimeout(function () { var k = Math.round(iz.scrollLeft / Math.max(1, iz.clientWidth)); if (k !== i) { i = k; } isaret(); }, 60); }, { passive: true });
  function bas() { if (az) return; clearInterval(t); t = setInterval(function () { if (!dur && !document.hidden) git(i + 1); }, 6000); }
  s.addEventListener('click', function (e) {
    var b = e.target.closest('[data-yon]'), d = e.target.closest('[data-git]');
    if (b) { e.preventDefault(); git(i + parseInt(b.getAttribute('data-yon'), 10)); bas(); }
    else if (d) { e.preventDefault(); git(parseInt(d.getAttribute('data-git'), 10)); bas(); }
  });
  s.addEventListener('mouseenter', function () { dur = true; });
  s.addEventListener('mouseleave', function () { dur = false; });
  s.addEventListener('touchstart', function () { dur = true; }, { passive: true });
  s.addEventListener('touchend', function () { setTimeout(function () { dur = false; }, 4000); bas(); }, { passive: true });
  iz.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); git(i + 1); bas(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); git(i - 1); bas(); } });
  window.addEventListener('resize', function () { iz.scrollLeft = i * iz.clientWidth; });
  bas();
})();
