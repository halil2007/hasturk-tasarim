// Bilge Bey inceleme sayfası ve haftalık rapor.
//   GET  /ak/inceleme          şifreli sayfa (yalnız mağaza sahibi): beğenilmeyen, cevaplanamayan sorular ve onay bekleyen
//                              Claude cevapları. Onaylanan cevap hazır cevaplara katılır (sonraki aynı soruda ücretsiz).
//   POST /ak/inceleme/veri     {k} → listeler          POST /ak/inceleme/karar {k, id, karar, cevap?}
//   GET  /ak/rapor?gun=7       yalnız sayılar (müşteri metni yok): soru, hazır cevap / Claude, maliyet, oy, sepete ekleme
// Şifre Cloudflare'de gizli değişken olarak durur: AK_PANEL_KEY (tanımlı değilse sayfa kapalıdır). Depo herkese açık
// olduğu için müşteri soruları hiçbir zaman depoya ya da GitHub kayıtlarına yazılmaz.
import { initDb, poolAnswer, havuz, norm } from './akbilge.js';
import { denetle } from './denetim.js';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const gunOnce = (n) => new Date(Date.now() + 3 * 3600e3 - n * 864e5).toISOString().slice(0, 10);
// Havuz ilk kullanımda çözülür (bkz. akbilge.js); kimlik tablosu ilk kullanımda kurulur, sunucu açılışında değil
let HAVUZ_ID_ = null;
const havuzId = () => HAVUZ_ID_ || (HAVUZ_ID_ = new Map(havuz().map((e) => [e.i, e])));

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function yetkili(env, k) {
  const anahtar = String(env.AK_PANEL_KEY || '');
  if (anahtar.length < 8 || typeof k !== 'string' || !k || k.length > 200) return false;
  return (await hash(k)) === (await hash(anahtar));
}

// ---------- Sayılar (herkese açık, müşteri metni yok) ----------
export async function rapor(env, url) {
  if (!env.DB) return json({ ok: false, why: 'db' });
  await initDb(env.DB).catch(() => {});
  const gun = Math.min(90, Math.max(1, parseInt(url.searchParams.get('gun'), 10) || 7)), bas = gunOnce(gun);
  const db = env.DB, al = (sql, ...b) => db.prepare(sql).bind(...b).all().then((r) => r.results).catch(() => []);
  const [satir, oy, ka, kaUrun, havuz, dKarar, dKonu] = await Promise.all([
    al("SELECT kaynak, COALESCE(durum,'') AS durum, COUNT(*) AS n, SUM(COALESCE(giris,0)) AS giris, SUM(COALESCE(cikis,0)) AS cikis FROM ak_soru WHERE substr(ts,1,10) >= ? AND kaynak != 'onay' GROUP BY kaynak, durum", bas),
    al('SELECT oy, COUNT(*) AS n FROM ak_oy WHERE substr(ts,1,10) >= ? GROUP BY oy', bas),
    al("SELECT SUM(n) AS n FROM ev WHERE k = 'ka' AND d >= ?", bas),
    al("SELECT x, SUM(n) AS n FROM ev WHERE k = 'ka' AND d >= ? GROUP BY x ORDER BY n DESC LIMIT 5", bas),
    al("SELECT havuz, COUNT(*) AS n FROM ak_soru WHERE kaynak = 'havuz' AND substr(ts,1,10) >= ? GROUP BY havuz ORDER BY n DESC", bas),
    // Haftalık denetim (yalnız sayılar ve kısa konu etiketleri; müşteri metni yok)
    al('SELECT karar, COUNT(*) AS n FROM ak_denetim WHERE substr(ts,1,10) >= ? GROUP BY karar', bas),
    al("SELECT konu, COUNT(*) AS n FROM ak_denetim WHERE karar != 'dogru' AND substr(ts,1,10) >= ? GROUP BY konu ORDER BY n DESC LIMIT 12", bas),
  ]);
  const ai = satir.filter((r) => r.kaynak === 'ai'), giris = ai.reduce((a, r) => a + r.giris, 0), cikis = ai.reduce((a, r) => a + r.cikis, 0);
  const konu = {};
  for (const r of havuz) { const e = havuzId().get(r.havuz); const t = e ? e.t : 'diger'; konu[t] = (konu[t] || 0) + r.n; }
  return json({
    ok: true, gun, baslangic: bas,
    toplam: satir.reduce((a, r) => a + r.n, 0),
    hazir: satir.filter((r) => r.kaynak === 'havuz' || r.kaynak === 'havuz-ai').reduce((a, r) => a + r.n, 0),
    claude: ai.reduce((a, r) => a + r.n, 0),
    cevapsiz: satir.filter((r) => r.durum === 'cevapsiz' || r.durum === 'emin-degil' || r.durum === 'yonlendir').reduce((a, r) => a + r.n, 0),
    tahmini_usd: +((giris * 4 + cikis * 20) / 1e6).toFixed(3),
    oy: { evet: (oy.find((r) => r.oy === 1) || {}).n || 0, hayir: (oy.find((r) => r.oy === 0) || {}).n || 0 },
    sepete_eklenen: (ka[0] && ka[0].n) || 0, sepete_en_cok: kaUrun.map((r) => ({ urun: r.x, n: r.n })),
    // Soru metni yerine hazır cevabın kendi kalıbı gösterilir (müşterinin yazdığı metin değil)
    en_cok_konular: havuz.slice(0, 10).map((r) => ({ soru: (havuzId().get(r.havuz) || { s: ['(eski kayıt)'] }).s[0], n: r.n })),
    konu_turleri: konu,
    denetim: { karar: Object.fromEntries(dKarar.map((r) => [r.karar, r.n])), sorunlu_konular: dKonu.map((r) => ({ konu: r.konu, n: r.n })) },
  });
}

// ---------- Şifreli inceleme ----------
export async function veri(req, env) {
  let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  // Yanlış şifrede kısa bekleme: deneme-yanılmayı yavaşlatır
  if (!(await yetkili(env, b.k))) { await new Promise((r) => setTimeout(r, 1500)); return json({ ok: false, why: 'sifre' }, 403); }
  if (!env.DB) return json({ ok: false, why: 'db' });
  return json(await veriIc(env));
}
// Liste verisi (yetki kontrolü çağırana aittir: şifreli sayfa ya da blog yönetim paneli > Bilge Bey, yalnız yönetici)
export async function veriIc(env) {
  await initDb(env.DB).catch(() => {});
  const bas = gunOnce(30), db = env.DB, al = (sql, ...x) => db.prepare(sql).bind(...x).all().then((r) => r.results).catch(() => []);
  const [son, bekleyen, hayir, evet, cevapsiz] = await Promise.all([
    al('SELECT id, ts, q, kaynak, durum, havuz, cevap, site FROM ak_soru WHERE substr(ts,1,10) >= ? ORDER BY id DESC LIMIT 150', gunOnce(14)),
    al("SELECT id, ts, q, cevap, urunler FROM ak_soru WHERE kaynak = 'ai' AND durum = 'onay-bekliyor' AND substr(ts,1,10) >= ? ORDER BY id DESC LIMIT 100", bas),
    al('SELECT ts, q, kaynak, havuz FROM ak_oy WHERE oy = 0 AND substr(ts,1,10) >= ? ORDER BY id DESC LIMIT 100', bas),
    al('SELECT ts, q, kaynak, havuz FROM ak_oy WHERE oy = 1 AND substr(ts,1,10) >= ? ORDER BY id DESC LIMIT 100', bas),
    al("SELECT id, ts, q, kaynak, durum, cevap FROM ak_soru WHERE durum IN ('cevapsiz','emin-degil','yonlendir') AND substr(ts,1,10) >= ? ORDER BY id DESC LIMIT 150", bas),
  ]);
  // Haftalık denetimde yanlış / eksik bulunan, henüz karar verilmemiş cevaplar (aynı soru bir kez)
  const denetimH = await al("SELECT d.soru_id AS id, d.karar, d.neden, d.niyet, d.oneri, d.konu, s.ts, s.q, s.onceki, s.kaynak, s.cevap, s.site FROM ak_denetim d JOIN ak_soru s ON s.id = d.soru_id WHERE d.durum = 'acik' ORDER BY CASE d.karar WHEN 'yanlis' THEN 0 WHEN 'alakasiz' THEN 1 ELSE 2 END, d.soru_id DESC LIMIT 400");
  const gorD = new Set(), denetim = denetimH.filter((r) => { const k = norm(r.q); if (gorD.has(k)) return false; gorD.add(k); return true; }).slice(0, 120)
    .map((r) => ({ ...r, cevap: String(r.cevap || '').slice(0, 1200) }));
  // Oylanan cevabın metni kayıttan (aynı sorunun kaydedilen cevabı). Hazır cevap metinleri eskiden kaydedilmiyordu;
  // kimlikleri de havuz yeniden üretilince kaydığı için kimlikten bakmak başka bir cevabı gösterir. Bu eski kayıtlarda
  // Bilge Bey'in aynı soruya bugün verdiği hazır cevap gösterilir (bugun: true).
  const metin = async (list) => {
    const qs = [...new Set(list.map((r) => r.q))].slice(0, 90), m = new Map();
    if (qs.length) (await al(`SELECT q, cevap FROM ak_soru WHERE cevap IS NOT NULL AND q IN (${qs.map(() => '?').join(',')}) ORDER BY id DESC`, ...qs)).forEach((r) => { if (!m.has(r.q)) m.set(r.q, r.cevap); });
    return list.map((r) => {
      let c = m.get(r.q), bugun = false;
      if (!c && (r.kaynak === 'havuz' || r.havuz)) { const h = poolAnswer(r.q).hit; if (h) { c = h.e.c; bugun = true; } }
      return { ts: r.ts, q: r.q, kaynak: r.kaynak, cevap: String(c || '').slice(0, 600), bugun };
    });
  };
  const sonuc = await rapor(env, new URL('http://x/?gun=7')).then((r) => r.json());
  // Son sorular: kayıtlı cevap metniyle; metni saklanmamış eski hazır cevaplarda Bilge Bey'in bugün vereceği cevap
  const sonL = son.map((r) => {
    let c = r.cevap, bugun = false;
    if (!c && r.kaynak === 'havuz') { const h = poolAnswer(r.q).hit; if (h) { c = h.e.c; bugun = true; } }
    return { ts: r.ts, q: r.q, kaynak: r.durum === 'yonlendir' ? 'yonlendir' : r.durum === 'cevapsiz' || r.durum === 'emin-degil' ? 'yok' : r.kaynak, cevap: String(c || '').slice(0, 1500), bugun, site: r.site };
  });
  return { ok: true, ozet: sonuc, son: sonL, bekleyen, hayir: await metin(hayir), evet: await metin(evet), cevapsiz, denetim };
}
export async function karar(req, env) {
  let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  // Yanlış şifrede kısa bekleme: deneme-yanılmayı yavaşlatır
  if (!(await yetkili(env, b.k))) { await new Promise((r) => setTimeout(r, 1500)); return json({ ok: false, why: 'sifre' }, 403); }
  const r = await kararIc(env, b);
  return json(r, r.ok ? 200 : r.status || 400);
}
// Karar (yetki kontrolü çağırana aittir): { d: 1, id, karar: onayla|kapat, cevap } denetim önerisi; { id, karar: onaylandi|reddedildi, cevap } yapay zekâ cevabı
export async function kararIc(env, b) {
  const json = (o, status = 200) => ({ ...o, status });
  // Denetim önerisi: "onayla" düzeltilmiş cevabı hazır cevaplara ekler (aynı soru bundan sonra bu cevabı alır);
  // "kapat" yalnız listeden kaldırır. Aynı sorunun bütün açık denetim kayıtları birlikte kapanır.
  if (b.d === 1) {
    const sid = parseInt(b.id, 10);
    if (!sid || !env.DB || !/^(onayla|kapat)$/.test(b.karar || '')) return json({ ok: false }, 400);
    const r = await env.DB.prepare('SELECT q, qn, site FROM ak_soru WHERE id = ?').bind(sid).first();
    if (!r) return json({ ok: false }, 404);
    const cevap = typeof b.cevap === 'string' && b.cevap.trim().length >= 10 ? b.cevap.trim().slice(0, 3000) : null;
    if (b.karar === 'onayla') {
      if (!cevap) return json({ ok: false, why: 'cevap' }, 400);
      await env.DB.prepare("INSERT INTO ak_soru (ts, q, qn, kaynak, havuz, cevap, urunler, durum, site) VALUES (?,?,?,'onay','denetim',?,'[]','onaylandi',?)")
        .bind(new Date().toISOString(), r.q, r.qn, cevap, r.site || 'hasturk').run();
    }
    await env.DB.prepare("UPDATE ak_denetim SET durum = ? WHERE durum = 'acik' AND soru_id IN (SELECT id FROM ak_soru WHERE qn = ?)").bind(b.karar === 'onayla' ? 'duzeltildi' : 'kapandi', r.qn).run();
    return json({ ok: true });
  }
  const id = parseInt(b.id, 10), k = b.karar === 'onaylandi' ? 'onaylandi' : b.karar === 'reddedildi' ? 'reddedildi' : null;
  if (!id || !k || !env.DB) return json({ ok: false }, 400);
  const cevap = typeof b.cevap === 'string' && b.cevap.trim().length >= 10 ? b.cevap.trim().slice(0, 3000) : null;
  await env.DB.prepare('UPDATE ak_soru SET durum = ?, cevap = COALESCE(?, cevap) WHERE id = ? AND kaynak = \'ai\'').bind(k, k === 'onaylandi' ? cevap : null, id).run();
  return json({ ok: true });
}

// Elle denetim (inceleme sayfasından, şifreyle): son 7 günün değerlendirilmemiş cevapları; en çok 40 soru (maliyet sınırı)
export async function denetimElle(req, env, key) {
  let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  if (!(await yetkili(env, b.k))) { await new Promise((r) => setTimeout(r, 1500)); return json({ ok: false, why: 'sifre' }, 403); }
  const azami = Math.min(40, Math.max(1, parseInt(b.azami, 10) || 40));
  return json(await denetle(env, key, { azami, zorla: true }));
}

export function sayfa(env) {
  const acik = String(env.AK_PANEL_KEY || '').length >= 8;
  return new Response(SAYFA.replace('__ACIK__', acik ? '1' : ''), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' } });
}

const SAYFA = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Bilge Bey inceleme</title><style>
:root{--pr:#0b5d73;--prd:#07404f;--soft:#e8f3f6;--ln:#e3e8eb;--ink:#14212b;--mu:#66737c;--ok:#1f8a5b;--ac:#d7372f}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--ink);background:#f3f6f7}
main{max-width:860px;margin:0 auto;padding:16px}h1{font-size:22px;color:var(--prd);margin:6px 0 4px}h2{font-size:17px;color:var(--prd);margin:26px 0 4px}
.not{color:var(--mu);font-size:14px;margin:0 0 10px}.kart{background:#fff;border:1px solid var(--ln);border-radius:14px;padding:12px 14px;margin:8px 0}
.q{font-weight:700}.ts{font-size:12px;color:var(--mu)}textarea{width:100%;min-height:120px;font:inherit;font-size:14px;border:1px solid var(--ln);border-radius:10px;padding:8px;margin:8px 0}
button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:9px 14px;cursor:pointer}.on{background:var(--ok);color:#fff}.red{background:#fff;border:1.5px solid var(--ln);color:var(--ink);margin-left:6px}
.giris{background:#fff;border:1px solid var(--ln);border-radius:14px;padding:16px;max-width:380px}.giris input{width:100%;font:inherit;padding:10px;border:1px solid var(--ln);border-radius:10px;margin:8px 0}
.giris button{background:var(--pr);color:#fff;width:100%}.oz{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.oz div{background:#fff;border:1px solid var(--ln);border-radius:12px;padding:10px}
.oz b{display:block;font-size:22px;color:var(--prd)}.oz span{font-size:13px;color:var(--mu)}.bos{color:var(--mu);font-size:14px}.hz{font-size:14px;color:#33424c;white-space:pre-wrap;margin-top:8px;background:#f6f8f9;border-radius:10px;padding:8px 10px}.hz b{color:var(--prd)}
.sek{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 6px}.sek button{background:#fff;border:1.5px solid var(--ln);color:var(--ink);padding:10px 12px}.sek button small{color:var(--mu);font-weight:700}.sek .sec{border-color:var(--pr);background:var(--soft);color:var(--prd)}
</style></head><body><main><h1>Bilge Bey inceleme</h1><p class="not">Müşterilerin Bilge Bey'e sorduğu sorular ve verdiği cevaplar yalnız burada görünür.</p><div id="app"></div></main>
<script>
var ACIK='__ACIK__',K='';try{K=sessionStorage.getItem('bb-k')||''}catch(e){}
var app=document.getElementById('app');
function e(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function t(s){try{return new Date(s).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(x){return s}}
function giris(m){app.innerHTML=ACIK?'<form class="giris" id="f"><b>Şifre</b>'+(m?'<p class="not" style="color:var(--ac)">'+e(m)+'</p>':'')+'<input type="password" id="k" autocomplete="current-password" required><button>Gir</button></form>':'<div class="giris"><b>Sayfa kapalı</b><p class="not">Açmak için Cloudflare → Workers → hasturk-arama → Settings → Variables and Secrets bölümüne AK_PANEL_KEY adında, en az 8 karakterli gizli (Secret) bir şifre ekleyin.</p></div>';
var f=document.getElementById('f');if(f)f.onsubmit=function(ev){ev.preventDefault();K=document.getElementById('k').value;try{sessionStorage.setItem('bb-k',K)}catch(x){}yukle()}}
function post(u,o){o.k=K;return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}).then(function(r){return r.json()})}
function yukle(){app.innerHTML='<p class="not">Yükleniyor…</p>';post('/ak/inceleme/veri',{}).then(function(d){if(!d.ok){try{sessionStorage.removeItem('bb-k')}catch(x){}return giris(d.why==='sifre'?'Şifre yanlış.':'Bir sorun oldu.')}ciz(d)},function(){giris('Bağlantı sorunu.')})}
var SEK='son',D=null;
var KAY={havuz:'hazır cevap',ai:'yapay zekâ','havuz-ai':'yapay zekâ (kayıttan)',yok:'cevap verilemedi',yonlendir:'müşteri hizmetlerine yönlendirdi'};
function kart(r,alt){return '<div class="kart"><div class="ts">'+t(r.ts)+(r.site?' · '+(r.site==='tarim'?'Tarım Dünyası':'HasTürk'):'')+(r.kaynak?' · '+e(KAY[r.kaynak]||r.kaynak):'')+'</div><div class="q">Müşteri: '+e(r.q)+'</div>'+(r.cevap?'<div class="hz"><b>Bilge Bey'+(r.bugun?' (bu soruya bugün verdiği cevap)':'')+':</b> '+e(r.cevap)+'</div>':(r.kaynak==='havuz'?'<div class="hz">Cevabın metni bu eski kayıtta saklanmamış.</div>':''))+(alt||'')+'</div>'}
function ciz(d){D=d;var o=d.ozet||{},oy=o.oy||{};
var h='<div class="oz"><div><b>'+e(o.toplam||0)+'</b><span>soru (son 7 gün)</span></div><div><b>👍 '+e(oy.evet||0)+'</b><span>"işime yaradı"</span></div><div><b>👎 '+e(oy.hayir||0)+'</b><span>"işime yaramadı"</span></div><div><b>'+e(o.cevapsiz||0)+'</b><span>cevaplanamayan</span></div></div>';
var S=[['son','🕒 Son sorular',(d.son||[]).length],['hayir','👎 Yaramadı',d.hayir.length],['evet','👍 Yaradı',d.evet.length],['cevapsiz','❓ Cevaplanamayan',d.cevapsiz.length],['bekleyen','✍️ Onay bekleyen',d.bekleyen.length],['denetim','🔎 Denetim',(d.denetim||[]).length]];
h+='<div class="sek">'+S.map(function(x){return '<button data-s="'+x[0]+'" class="'+(SEK===x[0]?'sec':'')+'">'+x[1]+' <small>'+x[2]+'</small></button>'}).join('')+'</div>';
var NOT={son:'Son 14 günde sorulan sorular (en yenisi üstte, en çok 150) ve Bilge Bey’in verdiği cevaplar.',hayir:'Müşterinin "işime yaramadı" dediği cevaplar (son 30 gün). Düzeltilmesini istediğiniz varsa bana sohbette söyleyin, düzeltirim.',evet:'Müşterinin "işime yaradı" dediği cevaplar (son 30 gün).',cevapsiz:'Bilge Bey’in cevap veremeyip müşteriyi size yönlendirdiği sorular. Cevabını bana sohbette söylerseniz eklerim.',bekleyen:'Yapay zekânın verdiği cevaplar. Doğruysa onaylayın (isterseniz önce düzeltin), yanlışsa reddedin.',denetim:'Haftalık denetimde yanlış, alakasız ya da eksik bulunan cevaplar. Yanlış hazır cevap o soruya artık verilmiyor. Önerilen düzeltmeyi kontrol edip onaylarsanız aynı soru bundan sonra bu cevabı alır; gerek yoksa kapatın.'};
h+='<p class="not">'+NOT[SEK]+'</p>';
var L=d[SEK]||[];
if(SEK==='denetim')h+='<p><button class="on" id="dcal">Denetimi şimdi çalıştır (son 7 gün, en çok 40 soru)</button> <span class="ts" id="dsn"></span></p>';
if(!L.length)h+='<p class="bos">Şu an yok.</p>';
else if(SEK==='denetim')h+=L.map(function(r){var KR={yanlis:'❌ yanlış',alakasiz:'↪️ alakasız',eksik:'⚠️ eksik'};return '<div class="kart" id="d'+r.id+'"><div class="ts">'+t(r.ts)+' · '+e(KR[r.karar]||r.karar)+(r.konu?' · '+e(r.konu):'')+'</div>'+(r.onceki?'<div class="ts">Önceki mesajı: '+e(r.onceki)+'</div>':'')+'<div class="q">Müşteri: '+e(r.q)+'</div><div class="hz"><b>Bilge Bey:</b> '+e(r.cevap)+'</div><div class="hz"><b>Denetim:</b> '+e(r.neden)+(r.niyet?'\\n<b>Müşterinin istediği:</b> '+e(r.niyet):'')+'</div><textarea id="o'+r.id+'">'+e(r.oneri||'')+'</textarea><button class="on" data-did="'+r.id+'" data-k="onayla">Düzeltmeyi onayla</button><button class="red" data-did="'+r.id+'" data-k="kapat">Kapat</button></div>'}).join('');
else if(SEK==='bekleyen')h+=L.map(function(r){return '<div class="kart" id="b'+r.id+'"><div class="ts">'+t(r.ts)+'</div><div class="q">Müşteri: '+e(r.q)+'</div><textarea id="c'+r.id+'">'+e(r.cevap)+'</textarea><button class="on" data-id="'+r.id+'" data-k="onaylandi">Onayla</button><button class="red" data-id="'+r.id+'" data-k="reddedildi">Reddet</button></div>'}).join('');
else h+=L.map(function(r){return kart(SEK==='cevapsiz'?{ts:r.ts,q:r.q,kaynak:r.durum==='yonlendir'?'yonlendir':'yok'}:r)}).join('');
app.innerHTML=h;
[].forEach.call(app.querySelectorAll('.sek button'),function(b){b.onclick=function(){SEK=b.getAttribute('data-s');ciz(D)}});
[].forEach.call(app.querySelectorAll('button[data-id]'),function(b){b.onclick=function(){var id=b.getAttribute('data-id'),k=b.getAttribute('data-k'),c=document.getElementById('c'+id);b.disabled=true;post('/ak/inceleme/karar',{id:id,karar:k,cevap:c?c.value:''}).then(function(r){var kt=document.getElementById('b'+id);if(r.ok&&kt)kt.innerHTML='<div class="q">'+(k==='onaylandi'?'Onaylandı ✓ Hazır cevaplara eklendi.':'Reddedildi.')+'</div>';else b.disabled=false})}})}
document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('button[data-did]');if(b){var id=b.getAttribute('data-did'),k=b.getAttribute('data-k'),c=document.getElementById('o'+id);b.disabled=true;post('/ak/inceleme/karar',{d:1,id:id,karar:k,cevap:c?c.value:''}).then(function(r){var kt=document.getElementById('d'+id);if(r.ok&&kt)kt.innerHTML='<div class="q">'+(k==='onayla'?'Düzeltme onaylandı ✓ Aynı soru bundan sonra bu cevabı alır.':'Kapatıldı.')+'</div>';else{b.disabled=false;alert(r.why==='cevap'?'Önce düzeltilmiş cevabı yazın.':'Kaydedilemedi.')}})}
var g=ev.target.closest&&ev.target.closest('#dcal');if(g){g.disabled=true;var sn=document.getElementById('dsn');if(sn)sn.textContent='Çalışıyor… (1–3 dakika)';post('/ak/inceleme/denetim',{azami:40}).then(function(r){if(sn)sn.textContent=r.ok?('İncelenen '+r.incelenen+' · doğru '+r.karar.dogru+' · eksik '+r.karar.eksik+' · yanlış '+r.karar.yanlis+' · alakasız '+r.karar.alakasiz+' · ~$'+r.tahmini_usd):'Çalışmadı ('+(r.why||'hata')+')';yukle()},function(){if(sn)sn.textContent='Bağlantı sorunu.';g.disabled=false})}});
if(K)yukle();else giris();
</script></body></html>`;
