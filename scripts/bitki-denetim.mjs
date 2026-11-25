// Bitki adı algılama denetimi: config.json > soilMatch.plants'taki her bitki ve diğer adı, düz ve ekli yazılışlarla
// ("X toprağı", "X'im için…", "X’ın…", "2 tane X için kaç litre…") Bilge Bey'in toprak niyetinde doğru bitkiye gitmeli.
// Ör. "karpuz" Kavun'a, "su bitkisi" Zamioculcas'a düşüyordu. Ayrıca aynı ad iki bitkide olmamalı ve toprak dışı
// sorular ("X nasıl sulanır", "X nasıl beslenir") toprak cevabı almamalı. Sunucu kodu (src/akbilge.js) geçici bir kopyadan yüklenir.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const src = resolve('src'), dir = mkdtempSync(join(tmpdir(), 'bitki-'));
writeFileSync(join(dir, 'ak.mjs'), readFileSync(join(src, 'akbilge.js'), 'utf8')
  .replace("import Anthropic from '@anthropic-ai/sdk';", 'const Anthropic = null;')
  .replace("import HAVUZ_HAM from './akbilge-havuz.json';", `import HAVUZ_HAM from '${join(src, 'akbilge-havuz.json')}' with { type: 'json' };`)
  .replace("import TARIM from './akbilge-tarim.json';", `import TARIM from '${join(src, 'akbilge-tarim.json')}' with { type: 'json' };`)
  .replace("import URUN_KART from './akbilge-urun.json';", `import URUN_KART from '${join(src, 'akbilge-urun.json')}' with { type: 'json' };`)
  .replace("from './toprak.js'", `from '${join(src, 'toprak.js')}'`));
const { toprakNiyet, poolAnswer } = await import(join(dir, 'ak.mjs'));
rmSync(dir, { recursive: true, force: true });
const plants = JSON.parse(readFileSync('config.json', 'utf8')).soilMatch.plants;
const bad = []; let n = 0;
// Aynı ad iki bitkide olamaz (ör. "karpuz" hem Kavun'un diğer adı hem ayrı bitki): hangisine gideceği belirsizleşir
const sahip = new Map(), sade = (x) => x.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
for (const p of plants) for (const a of [p[0], ...String(p[1] || '').split(',').map((x) => x.trim()).filter(Boolean)]) {
  const k = sade(a);
  if (sahip.has(k) && sahip.get(k) !== p[0]) bad.push(`"${a}" iki bitkide: ${sahip.get(k)} ve ${p[0]}`); else sahip.set(k, p[0]);
}
for (const p of plants) {
  for (const a of [p[0], ...String(p[1] || '').split(',').map((x) => x.trim()).filter(Boolean)]) {
    for (const q of [`${a} toprağı`, `${a}'im için hangi toprak`, `${a}’ın toprağı ne olmalı`, `2 tane ${a} için kaç litre toprak lazım`]) {
      n++;
      const t = toprakNiyet(q), got = t && t.e.b.split(',')[0].trim();
      if (got !== p[0]) bad.push(`${q} → ${got || 'bulunamadı'} (beklenen ${p[0]})`);
    }
  }
}
// Konu: toprak dışı bir soru (sulama, budama, gübre…) toprak kartıyla ya da toprak cevabıyla cevaplanmamalı
const KONU = ['nasıl sulanır', 'ne sıklıkla sulanmalı', 'nasıl budanır', 'nasıl çoğaltılır', 'çiçek açmıyor', 'nasıl beslenir', 'zehirli mi', 'yaprakları sararıyor', 'güneş sever mi', 'hangi gübre'];
for (const p of plants) for (const k of KONU) {
  const q = `${p[0].toLocaleLowerCase('tr-TR')} ${k}`, { hit } = poolAnswer(q); n++;
  if (toprakNiyet(q)) bad.push(`${q} → toprak kartı (soru toprakla ilgili değil)`);
  else if (hit && hit.e.t === 'bitki-toprak') bad.push(`${q} → toprak cevabı (soru toprakla ilgili değil)`);
}
console.log(bad.length ? `Bitki algılama: ${n} sorudan ${bad.length} yanlış\n` + bad.join('\n') : `Bitki algılama doğru (${n} soru).`);
process.exit(bad.length ? 1 : 0);
