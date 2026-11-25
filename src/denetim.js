// Bilge Bey haftalık denetimi: geçen haftanın soru-cevapları yapay zekâyla tek tek değerlendirilir.
//   • Karar: dogru / eksik (konuyu tutturmuş ama asıl soruyu tam cevaplamamış) / yanlis (yanlış bilgi, yanlış bitki ya da ürün) /
//     alakasiz (başka bir soruya cevap vermiş).
//   • yanlis / alakasiz bulunan hazır cevap (havuz kaydı) o soruya (normalize hâli) bir daha verilmez (ak_engel); kayıttan tekrar
//     verilen yapay zekâ cevabı tekrar kullanılmaz (durum 'denetim-red'). Elle onaylanmış cevaplara dokunulmaz, yalnız işaretlenir.
//   • Her hatalı cevap için önerilen düzeltme şifreli inceleme sayfasında (/ak/inceleme → Denetim) onaya sunulur; onaylanan
//     düzeltme hazır cevaplara katılır.
//   • Herkese açık haftalık rapora (docs/bilge-bey-rapor.md) yalnız sayılar ve kısa konu etiketleri gider; müşteri metni gitmez.
// Çalışma: her pazartesi 07:17 (TR) Cloudflare zamanlayıcısı (wrangler.jsonc > triggers) ya da inceleme sayfasından elle.
// Maliyet sınırı: bir çalışmada en çok AZAMI soru, PAKET'li istekler.
import Anthropic from '@anthropic-ai/sdk';
import { initDb, MODEL } from './akbilge.js';

// Açık (6 Kasım 2026, mağaza sahibinin isteği; haftada ~160 soru ≈ 0,5 $). false yapılırsa zamanlayıcı bir şey yapmaz.
export const DENETIM_ACIK = true;
const AZAMI = 160, PAKET = 8, PARALEL = 3;

const SISTEM = `Sen HasTürk Gübre'nin (toprak, gübre, tohum, saksı, bahçe ürünleri satan bir mağaza) müşteri asistanı "Bilge Bey"in verdiği cevapları denetleyen kıdemli bir ziraat mühendisisin.
Her kayıtta müşterinin sorusu, varsa ondan önceki son mesajı (takip sorularını anlamak için) ve Bilge Bey'in cevabı var.
Her kayıt için şunları değerlendir:
1. Müşteri tam olarak ne istedi? (niyet) Takip sorularında önceki mesajı dikkate al ("bu toprağa nasıl dikerim" önceki mesajdaki toprağı sorar).
2. Cevap bu niyete cevap veriyor mu, doğru bitki / ürün / konu hakkında mı?
3. Cevapta bariz yanlış, bitkiye zarar verecek ya da yanıltıcı bilgi var mı?
Kararlar:
- dogru: soruyu doğru ve yeterli cevaplıyor (mağazanın kendi ürününü önermesi doğaldır).
- eksik: doğru konuda ama müşterinin asıl sorusunu (ör. "direkt mi kullanılır, karıştırılır mı") cevaplamıyor ya da önemli bir kısmını atlıyor.
- yanlis: yanlış bilgi, yanlış bitki / ürün ya da zarar verebilecek öneri içeriyor.
- alakasiz: başka bir soruya cevap vermiş (ör. kullanım sorusuna ürünün içerik listesi, kargo sorusuna saksı).
Kurallar: Mağazanın ürün fiyatlarını ve stok durumunu bilemezsin; bunları değerlendirme. Rakamları (doz, litre) yalnız açıkça mantıksızsa yanlış say. Şüphede kalırsan "dogru" de; amaç gerçek hataları bulmak.
Alanlar (hepsi Türkçe, kısa):
- neden: tek cümle, neden bu karar.
- niyet: müşterinin istediği, genel ifadeyle (en çok 12 kelime). Müşterinin cümlesini aynen kopyalama; ad, telefon, adres gibi kişisel bilgi yazma.
- oneri: karar dogru değilse müşteriye verilmesi gereken daha iyi cevap (en çok 5 cümle, sade Türkçe; fiyat yazma, başka mağaza/site önerme, ürün adı uydurma; mağazanın ürünü gerekiyorsa "uygun ürünümüz" gibi genel söyle). Karar dogru ise boş bırak.
- konu: 2–4 kelimelik konu etiketi (ör. "toprak kullanımı", "sulama sıklığı", "ürün kullanımı: hortum", "kargo süresi"). Kişisel bilgi yok.`;

const SEMA = {
  type: 'object',
  properties: {
    sonuc: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          karar: { type: 'string', enum: ['dogru', 'eksik', 'yanlis', 'alakasiz'] },
          neden: { type: 'string' }, niyet: { type: 'string' }, oneri: { type: 'string' }, konu: { type: 'string' },
        },
        required: ['id', 'karar', 'neden', 'niyet', 'oneri', 'konu'],
        additionalProperties: false,
      },
    },
  },
  required: ['sonuc'],
  additionalProperties: false,
};

const kisa = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };

async function paketDenetle(client, model, kayitlar) {
  const metin = kayitlar.map((r) => `### Kayıt ${r.id}\n${r.onceki ? 'Önceki müşteri mesajı: ' + kisa(r.onceki, 300) + '\n' : ''}Müşteri: ${kisa(r.q, 600)}\nBilge Bey (${r.kaynak === 'havuz' ? 'hazır cevap' : 'yapay zekâ'}): ${kisa(r.cevap, 1100)}`).join('\n\n');
  const msg = await client.beta.messages.create({
    model,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SEMA } },
    system: [{ type: 'text', text: SISTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Aşağıdaki ${kayitlar.length} kaydı değerlendir; her kayıt için bir sonuç ver (id aynı kalsın).\n\n${metin}` }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let out = null;
  try { out = JSON.parse(text); } catch { out = null; }
  return { sonuc: out && Array.isArray(out.sonuc) ? out.sonuc : [], usage: msg.usage || {} };
}

// env: DB + Anthropic anahtarı. { zorla } elle çalıştırmada DENETIM_ACIK kapalı olsa da çalışır (inceleme sayfasından, şifreyle).
export async function denetle(env, key, { gun = 7, azami = AZAMI, zorla = false } = {}) {
  if (!DENETIM_ACIK && !zorla) return { ok: false, why: 'kapali' };
  const db = env.DB;
  if (!db || !key) return { ok: false, why: !db ? 'db' : 'anahtar' };
  await initDb(db);
  const bas = new Date(Date.now() - gun * 864e5).toISOString();
  const { results } = await db.prepare(
    "SELECT s.id, s.q, s.qn, s.onceki, s.kaynak, s.havuz, s.cevap, s.durum, " +
    "(SELECT COUNT(*) FROM ak_oy o WHERE o.q = s.q AND o.oy = 0) AS hayir FROM ak_soru s " +
    "LEFT JOIN ak_denetim d ON d.soru_id = s.id WHERE d.soru_id IS NULL AND s.ts >= ? AND s.kaynak IN ('havuz', 'ai', 'havuz-ai') " +
    "AND s.cevap IS NOT NULL AND length(s.cevap) >= 20 AND (s.havuz IS NULL OR s.havuz NOT LIKE 'niyet:%') ORDER BY s.id DESC LIMIT 1500").bind(bas).all();
  // Aynı soru + aynı cevap kaynağı bir kez değerlendirilir; karar gruptaki bütün kayıtlara yazılır.
  // Öncelik: "işime yaramadı" denenler, takip soruları (önceki mesajı olan), kayıttan tekrar verilen yapay zekâ cevapları.
  const grup = new Map();
  for (const r of results) {
    const k = r.qn + '|' + (r.havuz || r.kaynak) + '|' + String(r.onceki || '').toLocaleLowerCase('tr-TR').slice(0, 40);
    if (grup.has(k)) grup.get(k).ids.push(r.id); else grup.set(k, { ...r, ids: [r.id] });
  }
  const sira = [...grup.values()].sort((a, b) => (b.hayir > 0) - (a.hayir > 0) || (!!b.onceki) - (!!a.onceki) || (b.kaynak === 'havuz-ai') - (a.kaynak === 'havuz-ai') || b.ids.length - a.ids.length).slice(0, azami);
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 90000 });
  const model = env.AK_DENETIM_MODEL || env.AK_MODEL || MODEL;
  const paketler = [];
  for (let i = 0; i < sira.length; i += PAKET) paketler.push(sira.slice(i, i + PAKET));
  const say = { dogru: 0, eksik: 0, yanlis: 0, alakasiz: 0 }, ts = new Date().toISOString();
  let giris = 0, cikis = 0, hata = 0, engel = 0, red = 0;
  for (let i = 0; i < paketler.length; i += PARALEL) {
    const parti = paketler.slice(i, i + PARALEL);
    const sonuclar = await Promise.all(parti.map((p) => paketDenetle(client, model, p).catch(() => { hata++; return { sonuc: [], usage: {} }; })));
    for (let j = 0; j < parti.length; j++) {
      const { sonuc, usage } = sonuclar[j];
      giris += (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
      cikis += usage.output_tokens || 0;
      const byId = new Map(parti[j].map((r) => [r.id, r]));
      const yaz = [];
      for (const s of sonuc) {
        const r = byId.get(s.id);
        if (!r || !say.hasOwnProperty(s.karar)) continue;
        say[s.karar]++;
        const kotu = s.karar === 'yanlis' || s.karar === 'alakasiz';
        for (const id of r.ids) yaz.push(db.prepare('INSERT OR REPLACE INTO ak_denetim (soru_id, ts, karar, neden, niyet, oneri, konu, durum) VALUES (?,?,?,?,?,?,?,?)')
          .bind(id, ts, s.karar, kisa(s.neden, 300), kisa(s.niyet, 160), s.karar === 'dogru' ? null : kisa(s.oneri, 1500), kisa(s.konu, 60), s.karar === 'dogru' ? 'kapandi' : 'acik'));
        if (!kotu) continue;
        // Hazır cevap (havuz kaydı): bu soruya bir daha verilmez
        if (r.kaynak === 'havuz' && /^h\d+$/.test(r.havuz || '')) { yaz.push(db.prepare('INSERT OR IGNORE INTO ak_engel (qn, havuz, ts) VALUES (?,?,?)').bind(r.qn, r.havuz, ts)); engel++; }
        // Yapay zekâ cevabı: kayıttan tekrar verilmez (elle onaylanmışlara dokunulmaz)
        if (r.kaynak === 'ai') { yaz.push(db.prepare("UPDATE ak_soru SET durum = 'denetim-red' WHERE id = ? AND durum = 'onay-bekliyor'").bind(r.id)); red++; }
        const m = /^a(\d+)$/.exec(r.havuz || '');
        if (r.kaynak === 'havuz-ai' && m) { yaz.push(db.prepare("UPDATE ak_soru SET durum = 'denetim-red' WHERE id = ? AND durum = 'onay-bekliyor'").bind(+m[1])); red++; }
      }
      if (yaz.length) await db.batch(yaz).catch(() => { hata++; });
    }
  }
  const usd = +((giris * 4 + cikis * 20) / 1e6).toFixed(3);
  await db.prepare('INSERT INTO ak_gun (d, n) VALUES (?, ?) ON CONFLICT (d) DO UPDATE SET n = n + excluded.n').bind('denetim-' + ts.slice(0, 10), sira.length).run().catch(() => {});
  return { ok: true, incelenen: sira.length, karar: say, engellenen: engel, tekrar_kapali: red, hata, tahmini_usd: usd };
}
