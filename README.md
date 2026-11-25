# HasTürk Tasarım

Sitenin yeni tasarım çalışmaları.

## Site taraması
GitHub Actions (`Siteyi tara`) `tara.txt` içindeki sayfaları masaüstü (1440px) ve telefon (390px) boyutunda açar; ekran görüntülerini, HTML ve sayfa yapısı özetini `tarama/` klasörüne kaydeder. `tara.txt` değişince kendiliğinden çalışır; Actions sekmesinden elle de çalıştırılabilir.

---

## Mağaza yönetimi (HasTürk Gübre ve Tarım Dünyası)

Bu depo aynı zamanda iki ikas mağazasının **site yönetimini** tutar. Eskiden `halil2007/hasturk` deposundaydı; Kasım 2026'da buraya ayrıldı. Satış paneli (HasTürk CRM), tanıtım sitesi ve Android uygulaması **bu depoda değildir**, `halil2007/hasturk` deposunda kalır.

| Klasör / dosya | İçerik |
|---|---|
| `widget/`, `public/pm-search.js` | Menü, arama, Ürün Bul, Bilge Bey, kampanya penceresi (widget kaynağı ve yayınlanan hali) |
| `config.json`, `config.tarim.json` | HasTürk ve Tarım Dünyası menü, renk, kampanya ve diğer site ayarları |
| `public/` | Ürün ve menü verisi (`menu.json`, `products.json`, `tarim/`), görseller, Kendin Tasarla (`tasarla/`), blog statik dosyaları |
| `src/`, `blog-pages/`, `wrangler.jsonc` | Cloudflare Worker `hasturk-arama` (arama, eğilimler, Bilge Bey, blog.hasturkgubre.com.tr) |
| `scripts/`, `.github/workflows/` | ikas eşitleme ve ürün işlemleri, blog paketleri, denetimler |
| `veri/`, `docs/`, `bilgi/` | Blog paketleri, plan ve raporlar, Bilge Bey bilgi havuzu |
| `CLAUDE.md` | Çalışma notları ve blog kuralları |
| `tarama/`, `taslak/`, `tara.txt` | Yeni site tasarımı çalışması (site taraması ve ana sayfa taslağı) |

Ayrıntılı kurulum: [docs/MAGAZA-KURULUM.md](docs/MAGAZA-KURULUM.md).

