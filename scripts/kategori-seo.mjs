// ikas kategori SEO aracı: kategorilerin sayfa başlığı, meta açıklaması ve sayfada görünen açıklama metni.
// MOD=oku → bütün kategorileri (tüm alanlarıyla, yol ve ürün sayısıyla) CIKTI/kategoriler.json'a yazar; mağazaya dokunmaz.
// MOD=yaz → ICERIK dosyasındaki kategorilere [{ id, pageTitle, description, aciklama }] yazar. APPLY=1 değilse kuru çalışır.
//           Kategori olduğu gibi okunur, yalnız bu alanlar değiştirilip kaydedilir; kayıttan sonra yeniden okunur,
//           başka bir alan değiştiyse durur.
// Ortam: STORE, ID, SECRET, MOD, APPLY, ICERIK, CIKTI
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const out = [];
const log = (s) => { out.push(s); console.log(s); };
const summary = async () => { if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n'); };
const die = async (m) => { log('HATA: ' + m); await summary(); process.exit(1); };

const tr = await fetch(`https://${env.STORE}.myikas.com/api/admin/oauth/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.ID, client_secret: env.SECRET }),
});
if (!tr.ok) await die('token alınamadı: ' + tr.status);
const TOK = (await tr.json()).access_token;
async function gql(query, variables = {}) {
  for (let d = 0; ; d++) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 && d < 5) { await new Promise((s) => setTimeout(s, 2000 * (d + 1))); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errors) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 600)}`);
    return j.data;
  }
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const ic = (t) => (t.ofType ? ic(t.ofType) : t);
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const tip = async (n) => (await gql(`${T} query($n: String!) { __type(name: $n) { fields { name type { ...T } } inputFields { name type { ...T } } } }`, { n })).__type || {};

// Şema: saveCategory girdisi ve listCategory çıktısı
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } queryType { fields { name type { ...T } } } } }`);
const girdi = tname(sch.__schema.mutationType.fields.find((f) => f.name === 'saveCategory').args.find((a) => a.name === 'input').type);
const inT = await tip(girdi);
let outT = await tip(tname(sch.__schema.queryType.fields.find((f) => f.name === 'listCategory').type));
if ((outT.fields || []).some((f) => f.name === 'data') && !(outT.fields || []).some((f) => f.name === 'parentId')) outT = await tip(tname(outT.fields.find((f) => f.name === 'data').type));
const duz = (t) => !['OBJECT', 'INPUT_OBJECT'].includes(ic(t).kind);
const sec = [];
for (const f of inT.inputFields) {
  const o = (outT.fields || []).find((x) => x.name === f.name);
  if (!o) continue;
  if (duz(o.type)) { sec.push(f.name); continue; }
  const sub = await tip(tname(o.type)), subIn = await tip(tname(f.type));
  const ks = (sub.fields || []).filter((x) => duz(x.type) && (subIn.inputFields || []).some((y) => y.name === x.name)).map((x) => x.name);
  if (ks.length) sec.push(`${f.name} { ${ks.join(' ')} }`);
}
if (!sec.includes('id')) sec.unshift('id');
log(`saveCategory(${girdi}) alanları: ${inT.inputFields.map((f) => f.name + ':' + tname(f.type)).join(', ')}`);
log(`Okunan alanlar: ${sec.join(' ')}`);
const kategoriler = async () => { try { return listOf(await gql(`{ listCategory { ${sec.join(' ')} } }`), 'listCategory'); } catch { return listOf(await gql(`{ listCategory { data { ${sec.join(' ')} } } }`), 'listCategory'); } };
const tek = async (id) => (await kategoriler()).find((c) => c.id === id);
const yolu = (cats, c) => { const o = []; for (let i = 0; c && i < 8; i++) { o.unshift(c.name); c = cats.find((x) => x.id === c.parentId); } return o.join(' > '); };

// MOD=sema: menü/tema/vitrin ile ilgili sorgu ve işlemleri listeler (mağazaya dokunmaz)
if (env.MOD === 'sema') {
  const ilgili = /menu|navig|theme|tema|storefront|footer|link|page|blog|component|setting/i;
  for (const [ad, tur] of [['Sorgu', sch.__schema.queryType], ['İşlem', sch.__schema.mutationType]]) {
    for (const f of tur.fields.filter((f) => ilgili.test(f.name))) log(`${ad}: ${f.name}(${(f.args || []).map((a) => a.name + ':' + tname(a.type)).join(', ')}) -> ${tname(f.type)}`);
  }
  for (const t of ['StorefrontInput', 'Storefront', 'MenuInput', 'Menu', 'StorefrontMenuInput']) {
    const x = await tip(t);
    if (x.fields || x.inputFields) log(`${t}: ${(x.fields || x.inputFields).map((f) => f.name + ':' + tname(f.type)).join(', ')}`);
  }
  await summary();
  process.exit(0);
}

if (env.MOD === 'oku') {
  const cats = await kategoriler();
  // Ürün sayısı (kendisi ve alt kategorileriyle)
  const say = new Map();
  for (let page = 1; page < 60; page++) {
    const d = await gql(`query($p: Int!) { listProduct(pagination: { page: $p, limit: 100 }) { hasNext data { categoryIds } } }`, { p: page });
    for (const u of d.listProduct.data) {
      const s = new Set();
      for (const id of u.categoryIds || []) { let c = cats.find((x) => x.id === id); for (let i = 0; c && i < 8; i++) { s.add(c.id); c = cats.find((x) => x.id === c.parentId); } }
      s.forEach((id) => say.set(id, (say.get(id) || 0) + 1));
    }
    if (!d.listProduct.hasNext) break;
  }
  const liste = cats.map((c) => ({ yol: yolu(cats, c), urun: say.get(c.id) || 0, ...c })).sort((a, b) => a.yol.localeCompare(b.yol, 'tr'));
  await mkdir(env.CIKTI || 'cikti', { recursive: true });
  await writeFile(`${env.CIKTI || 'cikti'}/kategoriler.json`, JSON.stringify({ girdi: inT.inputFields.map((f) => f.name), liste }, null, 1));
  log(`${liste.length} kategori yazıldı`);
  await summary();
  process.exit(0);
}

if (env.MOD === 'yaz') {
  const icerik = JSON.parse(await readFile(env.ICERIK, 'utf8'));
  const apply = env.APPLY === '1';
  // Sayfadaki açıklama metninin alanı: girdi tipinde "description" (meta dışı) varsa o
  const aciklamaAlani = inT.inputFields.some((f) => f.name === 'description') ? 'description' : null;
  log(`Sayfa açıklaması alanı: ${aciklamaAlani || 'YOK'}`);
  const uyarla = async (v, tn) => {
    if (Array.isArray(v)) return Promise.all(v.map((x) => uyarla(x, tn)));
    if (v === null || typeof v !== 'object') return v;
    const fs = (await tip(tn)).inputFields || [];
    const o = {};
    for (const f of fs) if (v[f.name] != null) o[f.name] = await uyarla(v[f.name], tname(f.type));
    return o;
  };
  let n = 0, hata = 0;
  for (const k of icerik) {
    const once = await tek(k.id);
    if (!once) { log(`! Kategori yok: ${k.id}`); hata++; continue; }
    // Verilmeyen alan korunur (başlığı ve metası önceden yazılmış kategoriye yalnız sayfa açıklaması eklenebilir)
    const yeni = { ...once, metaData: { ...(once.metaData || {}), ...(k.pageTitle ? { pageTitle: k.pageTitle } : {}), ...(k.description ? { description: k.description } : {}) } };
    if (aciklamaAlani && k.aciklama) yeni[aciklamaAlani] = k.aciklama;
    if (!apply) { log(`~ YAZILACAK: ${once.name}\n    başlık: ${k.pageTitle ? k.pageTitle + ' (' + k.pageTitle.length + ')' : '(korunuyor)'}\n    meta: ${k.description ? k.description + ' (' + k.description.length + ')' : '(korunuyor)'}\n    açıklama: ${(k.aciklama || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 140)}…`); continue; }
    try {
      await gql(`mutation($input: ${girdi}!) { saveCategory(input: $input) { id } }`, { input: await uyarla(yeni, girdi) });
      const sonra = await tek(k.id);
      // Kayıt zaman damgaları (kategori ve meta updatedAt) kendiliğinden değişir; karşılaştırmaya girmez
      // Boş liste ile null aynı sayılır (ikas boş translations/canonicals'ı [] olarak geri verir)
      const bos = (k, v) => (Array.isArray(v) && v.length === 0 ? null : v);
      const ozet = (c) => JSON.stringify({ ...c, metaData: { ...(c.metaData || {}), pageTitle: 0, description: 0, updatedAt: 0 }, ...(aciklamaAlani ? { [aciklamaAlani]: 0 } : {}), updatedAt: 0 }, bos);
      if (ozet(once) !== ozet(sonra)) { log(`! DURDU: ${once.name}: başka alan değişti\n  önce: ${ozet(once).slice(0, 800)}\n  sonra: ${ozet(sonra).slice(0, 800)}`); hata++; break; }
      // Yazılan alanlar gerçekten kaydedildi mi
      const tutmadi = [];
      if ((sonra.metaData || {}).pageTitle !== yeni.metaData.pageTitle) tutmadi.push('başlık');
      if ((sonra.metaData || {}).description !== yeni.metaData.description) tutmadi.push('meta');
      if (aciklamaAlani && k.aciklama && sonra[aciklamaAlani] !== k.aciklama) tutmadi.push('açıklama');
      if (tutmadi.length) { log(`! DURDU: ${once.name}: kaydedilmedi/farklı kaydedildi: ${tutmadi.join(', ')}`); hata++; break; }
      n++; log(`~ YAZILDI: ${once.name}`);
    } catch (e) { log(`! HATA: ${once.name}: ${e.message.slice(0, 300)}`); hata++; break; }
  }
  log(`Sonuç (${apply ? 'uygulandı' : 'deneme'}): ${apply ? n : icerik.length} kategori, ${hata} hata`);
  await summary();
  process.exit(hata ? 1 : 0);
}
await die('MOD oku ya da yaz olmalı');
