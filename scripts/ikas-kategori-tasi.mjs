// ikas'ta bir ana kategorinin alt kategorilerini başka bir ana kategorinin altına taşır; boş kalan eski ana kategoriyi siler.
// Ürünler alt kategorilerinde kalır, yalnız alt kategorinin üst kategorisi (parentId) değişir.
// APPLY=1 değilse kuru çalıştırmadır: hiçbir şey değişmez, ne yapılacağı özet sayfasına yazılır.
// Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, KAYNAK (eski ana kategori adı), HEDEF (yeni ana kategori adı), APPLY
import { appendFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const out = [];
const log = (s) => { out.push(s); console.log(s); };
async function summary() { if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, '```\n' + out.join('\n') + '\n```\n'); }
const die = async (msg) => { log('HATA: ' + msg); await summary(); process.exit(1); };

async function token() {
  const r = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }),
  });
  const t = await r.text();
  if (!r.ok) await die(`Token alınamadı (${r.status}): ${t.slice(0, 200)}`);
  return JSON.parse(t).access_token;
}
let TOKEN;
async function gql(query, variables = {}) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ query, variables }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 500)}`);
  return j.data;
}
const T = 'fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const tname = (t) => (t ? t.name || tname(t.ofType) : '');
const leaf = (t) => { while (t.ofType) t = t.ofType; return t.kind === 'SCALAR' || t.kind === 'ENUM'; };
const typeOf = async (name) => (await gql(`${T} query($n: String!) { __type(name: $n) { fields { name type { ...T } } inputFields { name type { ...T } } } }`, { n: name })).__type || {};
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
const fold = (s) => String(s || '').toLocaleLowerCase('tr-TR').trim();

const apply = env.APPLY === '1';
TOKEN = await token();
log(`Mağaza: ${env.IKAS_STORE} · ${apply ? 'UYGULAMA' : 'KURU ÇALIŞTIRMA (hiçbir şey değişmez)'}`);
log(`"${env.KAYNAK}" altındaki kategoriler → "${env.HEDEF}" altına`);

// saveCategory girdisi ve listCategory çıktısı: güncellemede kategorinin tüm alanları aynen geri gönderilir, yalnız parentId değişir
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } queryType { fields { name type { ...T } } } } }`);
const saveCat = sch.__schema.mutationType.fields.find((f) => f.name === 'saveCategory');
if (!saveCat) await die('saveCategory mutasyonu yok');
const inName = tname(saveCat.args.find((a) => a.name === 'input').type);
const inT = await typeOf(inName);
let outName = tname(sch.__schema.queryType.fields.find((f) => f.name === 'listCategory').type);
let outT = await typeOf(outName);
if (outT.fields && outT.fields.some((f) => f.name === 'data') && !outT.fields.some((f) => f.name === 'parentId')) {
  outName = tname(outT.fields.find((f) => f.name === 'data').type); outT = await typeOf(outName);
}
const sel = [];
for (const f of inT.inputFields) {
  const o = (outT.fields || []).find((x) => x.name === f.name);
  if (!o) continue;
  if (leaf(o.type)) { sel.push(f.name); continue; }
  const sub = await typeOf(tname(o.type)), subIn = await typeOf(tname(f.type));
  const ks = (sub.fields || []).filter((x) => leaf(x.type) && (subIn.inputFields || []).some((y) => y.name === x.name)).map((x) => x.name);
  if (ks.length) sel.push(`${f.name} { ${ks.join(' ')} }`);
}
if (!sel.includes('id')) sel.unshift('id');
log(`saveCategory(${inName}) alanları: ${inT.inputFields.map((f) => f.name).join(', ')}`);

let cats;
const q = `{ listCategory { ${sel.join(' ')} } }`;
try { cats = listOf(await gql(q), 'listCategory'); }
catch { cats = listOf(await gql(`{ listCategory { data { ${sel.join(' ')} } } }`), 'listCategory'); }
const kok = (n) => cats.filter((c) => !c.parentId && fold(c.name) === fold(n));
const [kaynak] = kok(env.KAYNAK), [hedef] = kok(env.HEDEF);
if (!kaynak) await die(`"${env.KAYNAK}" ana kategorisi bulunamadı (zaten taşınmış olabilir)`);
if (!hedef) await die(`"${env.HEDEF}" ana kategorisi bulunamadı`);
const cocuk = cats.filter((c) => c.parentId === kaynak.id);
const hedefCocuk = cats.filter((c) => c.parentId === hedef.id).map((c) => fold(c.name));
log(`Kaynak id ${kaynak.id}, hedef id ${hedef.id}; taşınacak ${cocuk.length} alt kategori`);

for (const c of cocuk) {
  if (hedefCocuk.includes(fold(c.name))) await die(`"${env.HEDEF}" altında zaten "${c.name}" var; aynı adda iki kategori olmasın diye durdu`);
  if (!apply) { log(`  → TAŞINACAK: ${c.name} (/${c.metaData && c.metaData.slug})`); continue; }
  const inp = { ...c, parentId: hedef.id };
  for (const k of Object.keys(inp)) if (inp[k] === null) delete inp[k];
  try { await gql(`mutation($input: ${inName}!) { saveCategory(input: $input) { id name parentId } }`, { input: inp }); }
  catch (e) { await die(`${c.name} taşınamadı: ${e.message}`); }
  log(`  → TAŞINDI: ${c.name}`);
}

// Eski ana kategori: doğrudan ona bağlı ürün yoksa silinir (ürünler alt kategorilerde)
let dogrudan = null;
for (const pq of [
  `{ listProduct(categoryIds: { in: ["${kaynak.id}"] }, pagination: { limit: 50 }) { data { name categoryIds } } }`,
  `{ listProduct(categoryIds: { eq: "${kaynak.id}" }) { data { name categoryIds } } }`,
]) {
  try { dogrudan = listOf(await gql(pq), 'listProduct').filter((p) => (p.categoryIds || []).includes(kaynak.id)); break; } catch (e) { log('not: ürün sorgusu: ' + e.message.slice(0, 160)); }
}
if (dogrudan === null) log(`Eski ana kategoriye doğrudan bağlı ürün sayısı öğrenilemedi; "${env.KAYNAK}" silinmedi, ikas panelinden silinebilir.`);
else if (dogrudan.length) {
  log(`"${env.KAYNAK}" kategorisine doğrudan bağlı ${dogrudan.length} ürün var (ör. ${dogrudan.slice(0, 3).map((p) => p.name).join('; ')}); silinmedi.`);
  log('Bu ürünler alt kategorilerinde de duruyorsa eski ana kategori ikas panelinden silinebilir.');
} else if (!apply) log(`  ✕ SİLİNECEK: boş kalan "${env.KAYNAK}"`);
else {
  const del = sch.__schema.mutationType.fields.find((f) => /^deleteCategor/.test(f.name));
  if (!del) log(`Silme mutasyonu bulunamadı; "${env.KAYNAK}" ikas panelinden silinebilir.`);
  else {
    const a = del.args[0], tn = a.type.kind === 'NON_NULL' ? a.type.ofType : a.type;
    const isList = tn.kind === 'LIST' || (tn.ofType && tn.ofType.kind === 'LIST');
    try {
      await gql(`mutation($v: ${isList ? '[String!]!' : 'String!'}) { ${del.name}(${a.name}: $v) }`, { v: isList ? [kaynak.id] : kaynak.id });
      log(`  ✕ SİLİNDİ: "${env.KAYNAK}"`);
    } catch (e) { log(`"${env.KAYNAK}" silinemedi (${e.message.slice(0, 200)}); ikas panelinden silinebilir.`); }
  }
}
await summary();
