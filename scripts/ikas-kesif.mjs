// ikas API keşfi (salt okunur): tasarım uygulamasının izniyle erişilebilen
// vitrin/tema sorgularını listeler, sonucu tarama/ikas-api.md ve .json olarak kaydeder.
// Gerekli: IKAS_STORE, IKAS_CLIENT_ID, IKAS_CLIENT_SECRET (GitHub > Settings > Secrets and variables > Actions)
import { mkdir, writeFile } from 'node:fs/promises';

const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const die = (m) => { console.error('HATA: ' + m); process.exit(1); };
for (const k of ['IKAS_STORE', 'IKAS_CLIENT_ID', 'IKAS_CLIENT_SECRET']) if (!env[k]) die(`${k} tanımlı değil (GitHub Secrets'a ekleyin)`);

const tokRes = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }),
});
const tokBody = await tokRes.text();
if (!tokRes.ok) die(`Token alınamadı (${tokRes.status}): ${tokBody.slice(0, 300)}`);
const TOKEN = JSON.parse(tokBody).access_token || die('access_token yok');
console.log('Token alındı.');

async function gql(query, variables = {}) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ query, variables }) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data, errors: json.errors };
}

const typeRef = (t) => (t.kind === 'NON_NULL' ? typeRef(t.ofType) + '!' : t.kind === 'LIST' ? `[${typeRef(t.ofType)}]` : t.name);
const intro = await gql(`{ __schema {
  queryType { fields { name description args { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }
  mutationType { fields { name description args { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }
} }`);
if (!intro.data) die('Şema okunamadı: ' + JSON.stringify(intro.errors || intro.status).slice(0, 500));

const RE = /storefront|theme|tema|page|sayfa|menu|navigation|domain|sales ?channel|salesChannel|blog|banner|slider|seo|redirect|script|component|html|setting|merchant|campaign|coupon/i;
const pick = (fields) => (fields || []).filter((f) => RE.test(f.name)).map((f) => ({
  name: f.name,
  args: f.args.map((a) => `${a.name}: ${typeRef(a.type)}`).join(', '),
  returns: typeRef(f.type),
  description: (f.description || '').replace(/\s+/g, ' ').trim(),
}));
const queries = pick(intro.data.__schema.queryType?.fields);
const mutations = pick(intro.data.__schema.mutationType?.fields);

// Argümansız (ya da hepsi isteğe bağlı) vitrin sorgularını deneyip izin verilip verilmediğini gör
const probes = [];
for (const q of queries.filter((q) => /storefront|theme|salesChannel|sales ?channel|domain|merchant/i.test(q.name) && !q.args.includes('!'))) {
  const r = await gql(`{ ${q.name} { __typename } }`);
  probes.push({ name: q.name, ok: !r.errors, error: r.errors?.map((e) => e.message).join(' | ').slice(0, 200) });
}

await mkdir('tarama', { recursive: true });
await writeFile('tarama/ikas-api.json', JSON.stringify({ queries, mutations, probes }, null, 1));
const row = (f) => `| \`${f.name}\` | ${f.args || '—'} | \`${f.returns}\` | ${f.description.replace(/\|/g, '/') || ''} |`;
const md = [
  '# ikas API keşfi (tasarım uygulaması)', '',
  `Tarih: ${new Date().toISOString()}`, '',
  '## Erişim denemesi (salt okunur)', '',
  '| Sorgu | Sonuç |', '|---|---|',
  ...probes.map((p) => `| \`${p.name}\` | ${p.ok ? 'izin var' : 'hata: ' + (p.error || '').replace(/\|/g, '/')} |`), '',
  '## İlgili sorgular', '', '| Ad | Argümanlar | Dönen | Açıklama |', '|---|---|---|---|', ...queries.map(row), '',
  '## İlgili değişiklik işlemleri (çalıştırılmadı)', '', '| Ad | Argümanlar | Dönen | Açıklama |', '|---|---|---|---|', ...mutations.map(row), '',
].join('\n');
await writeFile('tarama/ikas-api.md', md);
console.log(`${queries.length} sorgu, ${mutations.length} değişiklik işlemi; deneme: ${probes.map((p) => `${p.name}=${p.ok ? 'ok' : 'hata'}`).join(', ')}`);
