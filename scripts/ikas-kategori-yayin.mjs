// ikas'ta satış kanalına bağlı olmayan (sitede 'sayfa bulunamadı' veren) kategorileri, diğer kategorilerin çoğunun satış kanalı ayarıyla yayına alır.
// Güncellemede kategorinin tüm alanları aynen geri gönderilir; yalnız salesChannels eklenir. APPLY=1 değilse kuru çalıştırmadır.
// Ortam: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET, APPLY, ADLAR (virgülle ayrılmış kategori adları; boşsa satış kanalı olmayan tüm kategoriler)
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
const sch = await gql(`${T} { __schema { mutationType { fields { name args { name type { ...T } } } } queryType { fields { name type { ...T } } } } }`);
const saveCat = sch.__schema.mutationType.fields.find((f) => f.name === 'saveCategory');
if (!saveCat) await die('saveCategory mutasyonu yok');
const inName = tname(saveCat.args.find((a) => a.name === 'input').type);
const inT = await typeOf(inName);
if (!inT.inputFields.some((f) => f.name === 'salesChannels')) await die(`${inName} girdisinde salesChannels alanı yok; satış kanalı ikas panelinden elle açılmalı`);
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
let cats;
try { cats = listOf(await gql(`{ listCategory { ${sel.join(' ')} } }`), 'listCategory'); }
catch { cats = listOf(await gql(`{ listCategory { data { ${sel.join(' ')} } } }`), 'listCategory'); }
const bos = (c) => !c.salesChannels || (Array.isArray(c.salesChannels) && c.salesChannels.length === 0);
const sayac = new Map();
for (const c of cats) if (!bos(c)) { const k = JSON.stringify(c.salesChannels); sayac.set(k, (sayac.get(k) || 0) + 1); }
const enCok = [...sayac].sort((a, b) => b[1] - a[1])[0];
log(`Kategori: ${cats.length}; satış kanalı olmayan: ${cats.filter(bos).length}`);
if (!enCok) await die('Hiçbir kategoride satış kanalı ayarı yok; örnek alınamadı');
log(`Örnek satış kanalı ayarı (${enCok[1]} kategoride): ${enCok[0]}`);
if (env.TANI === '1') { // salt okuma: ADLAR'daki kategorilerin tüm alanlarını yazar, hiçbir şey değiştirmez
  const ad = String(env.ADLAR || '').split(',').map((x) => fold(x)).filter(Boolean);
  for (const c of cats.filter((x) => ad.includes(fold(x.name)))) log('TANI: ' + JSON.stringify(c));
  await summary(); process.exit(0);
}
if (env.GORUNUR === '1') { // ADLAR'daki kategorilerin pasif satış kanallarını VISIBLE yapar; başka alana dokunmaz
  const ad = String(env.ADLAR || '').split(',').map((x) => fold(x)).filter(Boolean);
  for (const c of cats.filter((x) => ad.includes(fold(x.name)))) {
    const pasif = (c.salesChannels || []).filter((k) => k.status !== 'VISIBLE');
    if (!pasif.length) { log(`  = ZATEN GÖRÜNÜR: ${c.name}`); continue; }
    if (!apply) { log(`  → GÖRÜNÜR YAPILACAK: ${c.name} (${pasif.length}/${c.salesChannels.length} kanal pasif)`); continue; }
    const inp = { ...c, salesChannels: c.salesChannels.map((k) => ({ ...k, status: 'VISIBLE' })) };
    for (const k of Object.keys(inp)) if (inp[k] === null) delete inp[k];
    try { await gql(`mutation($input: ${inName}!) { saveCategory(input: $input) { id name } }`, { input: inp }); log(`  → GÖRÜNÜR YAPILDI: ${c.name}`); }
    catch (e) { log(`  ✗ ${c.name} görünür yapılamadı: ${e.message.slice(0, 300)}`); }
  }
  await summary(); process.exit(0);
}
const SC = JSON.parse(enCok[0]);
const adlar = String(env.ADLAR || '').split(',').map((s) => fold(s)).filter(Boolean);
const hedefler = cats.filter((c) => bos(c) && (!adlar.length || adlar.includes(fold(c.name))));
for (const a of adlar) if (!cats.some((c) => fold(c.name) === a)) log(`  ! "${a}" adlı kategori ikas'ta bulunamadı`);
if (!hedefler.length) { log('Yayına alınacak kategori yok (hepsinde satış kanalı var).'); await summary(); process.exit(0); }
for (const c of hedefler) {
  const slug = c.metaData && c.metaData.slug;
  if (!apply) { log(`  → YAYINA ALINACAK: ${c.name} (/${slug})`); continue; }
  const inp = { ...c, salesChannels: SC };
  for (const k of Object.keys(inp)) if (inp[k] === null) delete inp[k];
  try { await gql(`mutation($input: ${inName}!) { saveCategory(input: $input) { id name } }`, { input: inp }); log(`  → YAYINA ALINDI: ${c.name} (/${slug})`); }
  catch (e) { log(`  ✗ ${c.name} yayına alınamadı: ${e.message.slice(0, 300)}`); }
}
await summary();
