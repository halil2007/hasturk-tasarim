// Salt okuma: bir ürünün ikas'taki açıklama HTML'ini (ham) yazar. Ürün adı ADLAR ortam değişkeninde (| ile ayrılmış, "içerir" eşleşmesi).
const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const r = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }) });
const TOKEN = JSON.parse(await r.text()).access_token;
const gql = async (q, v) => { const x = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ query: q, variables: v }) }); const j = await x.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data; };
const adlar = (env.ADLAR || 'Kokulu Nane Fidesi Karışık').split('|').map((s) => s.trim().toLowerCase());
console.log('== ' + env.IKAS_STORE);
for (let p = 1; p < 40; p++) {
  const d = (await gql('query($p: Int!) { listProduct(pagination: { page: $p, limit: 100 }) { hasNext data { name description metaData { slug } tags { name } variants { sku prices { sellPrice discountPrice } stocks { stockCount } images { imageId } } } } }', { p })).listProduct;
  for (const u of d.data) if (adlar.some((a) => u.name.toLowerCase().includes(a))) { console.log('--- ÜRÜN: ' + u.name + ' /' + u.metaData.slug + ' (uzunluk ' + (u.description || '').length + ')'); console.log(env.OZET === '1' ? 'ETİKET: ' + (u.tags || []).map((t) => t.name).join(',') + ' | VARYANT: ' + (u.variants || []).map((v) => `${v.sku} ${((v.prices || [])[0] || {}).sellPrice}TL stok ${(v.stocks || []).reduce((a, x) => a + (x.stockCount || 0), 0)} görsel ${(v.images || []).length}`).join(' ; ') : JSON.stringify(u.description)); }
  if (!d.hasNext) break;
}
