// Verilen kimliklerdeki ürünleri siler. Güvenlik: ürün adresi ADRES_ONEK ile başlamıyorsa silinmez; APPLY=1 değilse yalnız listeler.
// Ortam: STORE, ID, SECRET, IDLER (virgülle), ADRES_ONEK, APPLY
const env = process.env;
const tr = await fetch(`https://${env.STORE}.myikas.com/api/admin/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.ID, client_secret: env.SECRET }) });
const TOK = (await tr.json()).access_token;
const gql = async (query, variables = {}) => { const r = await fetch('https://api.myikas.com/api/v1/admin/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data; };
const idler = (env.IDLER || '').split(',').map((s) => s.trim()).filter(Boolean);
const onek = env.ADRES_ONEK || '';
if (!idler.length || !onek) { console.log('IDLER ve ADRES_ONEK verilmedi, hiçbir şey yapılmadı'); process.exit(0); }
const bul = async () => { const o = []; for (let page = 1; page < 30; page++) { const d = await gql('query($p:Int!){ listProduct(pagination:{page:$p,limit:100}){ hasNext data { id name metaData { slug } } } }', { p: page }); o.push(...d.listProduct.data); if (!d.listProduct.hasNext) break; } return o; };
const hepsi = await bul();
const sil = hepsi.filter((u) => idler.includes(u.id) && ((u.metaData && u.metaData.slug) || '').startsWith(onek));
for (const id of idler) if (!sil.some((u) => u.id === id)) console.log(`! atlandı (bulunamadı ya da adres "${onek}" ile başlamıyor): ${id}`);
for (const u of sil) console.log(`${env.APPLY === '1' ? '- SİLİNECEK' : '~ silinecek (deneme)'}: ${u.name} (/${u.metaData.slug})`);
if (env.APPLY !== '1' || !sil.length) process.exit(0);
const m = (await gql('{ __schema { mutationType { fields { name } } } }')).__schema.mutationType.fields.map((f) => f.name);
if (!m.includes('deleteProductList')) { console.log('deleteProductList yok: ' + m.filter((x) => /delete.*product/i.test(x)).join(', ')); process.exit(1); }
await gql('mutation($idList:[String!]!){ deleteProductList(idList:$idList) }', { idList: sil.map((u) => u.id) });
const kalan = (await bul()).filter((u) => sil.some((s) => s.id === u.id));
console.log(kalan.length ? `HATA: ${kalan.length} ürün hâlâ duruyor` : `${sil.length} ürün silindi, doğrulandı`);
process.exit(kalan.length ? 1 : 0);
