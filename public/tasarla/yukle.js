// Ürün Bul paketi (ES5) aracı bu küçük modülle açar: modülü yükler, window.__htTasarla'ya bırakır ve haber verir.
import * as arac from './uygulama.js';
window.__htTasarla = arac;
window.dispatchEvent(new Event('ht-tasarla'));
