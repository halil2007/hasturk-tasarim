// Verilen adreslerdeki (slug) ürünlerin varyantlarını, fiyatlarını, stoklarını ve görsellerini listeler. Mağazaya dokunmaz.
// Ortam: STORE, ID, SECRET, SLUGLAR (virgülle)
const env = process.env;
const tr = await fetch(`https://${env.STORE}.myikas.com/api/admin/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.ID, client_secret: env.SECRET }) });
const TOK = (await tr.json()).access_token;
const gql = async (query, variables = {}) => { const r = await fetch('https://api.myikas.com/api/v1/admin/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK }, body: JSON.stringify({ query, variables }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data; };
const sluglar = (env.SLUGLAR || '').split(',').map((s) => s.trim()).filter(Boolean);
for (let page = 1; page < 30; page++) {
  const d = await gql(`query($p:Int!){ listProduct(pagination:{page:$p,limit:100}){ hasNext data { id name metaData { slug } variants { id sku sellIfOutOfStock prices { sellPrice buyPrice } stocks { stockCount } images { isMain order } } } } }`, { p: page });
  for (const u of d.listProduct.data) {
    if (!sluglar.includes(u.metaData && u.metaData.slug)) continue;
    console.log(`## ${u.name} (/${u.metaData.slug})`);
    for (const v of u.variants) console.log(`   ${v.sku} · ${v.prices.map((p) => p.sellPrice + ' TL / alış ' + p.buyPrice).join(',')} · stok ${(v.stocks || []).map((s) => s.stockCount).join('+') || 0} · stoksuz satış ${v.sellIfOutOfStock} · ${v.images.length} görsel, ana: ${v.images.filter((i) => i.isMain).length}`);
  }
  if (!d.listProduct.hasNext) break;
}
