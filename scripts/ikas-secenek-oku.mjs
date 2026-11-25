// Salt okuma: ikas'ta "5 Lt" değeri olan seçenek türlerini ve "HG Antoryum Çiçeği Toprağı" ürününün yapısını yazar (yeni ürün için şablon).
const env = process.env;
const API = 'https://api.myikas.com/api/v1/admin/graphql';
const r = await fetch(`https://${env.IKAS_STORE}.myikas.com/api/admin/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }) });
const TOKEN = JSON.parse(await r.text()).access_token;
const gql = async (q) => { const x = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ query: q }) }); const j = await x.json(); if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data; };
const listOf = (d, k) => (Array.isArray(d[k]) ? d[k] : (d[k] && d[k].data) || []);
console.log('== ' + env.IKAS_STORE);
let tt = [];
for (const q of ['{ listVariantType { id name values { id name } } }', '{ listVariantType { data { id name values { id name } } } }']) { try { tt = listOf(await gql(q), 'listVariantType'); break; } catch (e) { console.log('tür sorgusu: ' + e.message); } }
for (const t of tt) if ((t.values || []).some((v) => /^\s*(5|10|20|40)\s*l/i.test(v.name))) console.log('SEÇENEK TÜRÜ:', t.name, '|', t.values.map((v) => v.name).join(', '));
for (const q of [
  '{ listProduct(metaData: { slug: { eq: "hg-antoryum-cicegi-topragi" } }) { data { name brandId categoryIds salesChannelIds metaData { slug pageTitle description } variants { sku sellIfOutOfStock weight prices { sellPrice discountPrice buyPrice } } } } }',
  '{ listProduct(metaData: { slug: { eq: "hg-antoryum-cicegi-topragi" } }) { data { name brandId categoryIds metaData { slug pageTitle description } variants { sku sellIfOutOfStock weight prices { sellPrice } } } } }',
]) { try { const p = listOf(await gql(q), 'listProduct')[0]; console.log('ANTORYUM ŞABLON:', JSON.stringify(p)); break; } catch (e) { console.log('ürün sorgusu: ' + e.message); } }
