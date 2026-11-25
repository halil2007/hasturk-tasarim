// Bilge Bey konuşma anlama testi: müşterinin farklı yazış biçimleri, önceki mesaja bağlı sorular, bitki / ürün değiştirme,
// düzeltme, birden çok dert, teşekkür / selam, mağaza soruları. Her örnek bir sohbettir (g: önceki mesajlar, su: son
// cevapta önerilen ürünler, q: son mesaj); cevapta geçmesi / geçmemesi gerekenlerle puanlanır. Sorular uydurmadır
// (gerçek müşteri metni yoktur).
//   node scripts/anlama-testi.mjs --canli [adres]      yayındaki Bilge Bey'e sorar (X-Ak-Test: kayda geçmez)
//   node scripts/anlama-testi.mjs --modul <ak.mjs>      yerel kopyayla (yapay zekâ taklidiyle) dener
const K = [
  // ---- A. yazım hatası, ağız, kısaltma ----
  ['A', [], 'monsteram sararıyo napcam', { icer: ['monstera', 'sar'] }],
  ['A', [], 'limon agacima ne gubre atiyim', { icer: ['limon', 'solucan'] }],
  ['A', [], 'kaktusumun dibi curudu', { icer: ['çürü'] }],
  ['A', [], 'orkidem cicek acmiyo neden', { icer: ['orkide', 'ışık'] }],
  ['A', [], 'zeytin fidanı kaç yılda meyve verir', { icer: ['zeytin', 'yıl'] }],
  ['A', [], 'gül budaması ne zmn yapılır', { icer: ['gül', 'buda'] }],
  ['A', [], 'begonvil kışın dışarda kalırmı', { icer: ['begonvil'] }],
  ['A', [], 'lavanta kaç günde bir sulanır', { icer: ['lavanta', 'sula'] }],
  ['A', [], 'deve tabanının yaprakları sararıyor', { icer: ['monstera', 'sar'] }],
  ['A', [], 'kaynana dili ne kadar su ister', { icer: ['paşa kılıcı', 'sula'] }],
  ['A', [], 'paşa kılıcı kediye zararlımı', { icer: ['saponin'] }],
  ['A', [], 'domates fidelerimin yaprakları kıvrılıyor', { icer: ['kıvrıl'] }],
  ['A', [], 'saksida minik sinekler uçuşuyor', { icer: ['sinek'] }],
  ['A', [], 'fesleğenim boyun büktü', { icer: ['fesleğen'] }],
  ['A', [], 'yaprak döküyor bitkim ne yapmalıyım', { icer: ['dökül'] }],
  ['A', [], 'kac litre toprak lazim 40 cm saksiya', { icer: ['litre'] }],
  ['A', [], 'solucan gübresi nasıl kullanılıyor', { icer: ['solucan', 'saksı'] }],
  ['A', [], 'ikilim yaprakları sarardı', { icer: ['sar'] }],
  // ---- B. önceki mesaja bağlı soru ----
  ['B', ['monstera aldım salona koydum'], 'ne sıklıkla sulayayım', { icer: ['monstera', 'sula'] }],
  ['B', ['limon ağacım var balkonda'], 'kışın içeri alayım mı', { icer: ['limon', 'don'] }],
  ['B', ['gül için toprak'], 'peki gübresi', { icer: ['solucan'], icermez: ['monstera'] }],
  ['B', ['kaktüs aldım'], 'güneş sever mi', { icer: ['kaktüs', 'güneş'] }],
  ['B', ['monsteramın yaprakları sarardı'], 'neden olur bu', { icer: ['monstera', 'sula'] }],
  ['B', ['zeytin fidanı diktim bahçeye'], 'ne zaman budamalıyım', { icer: ['zeytin', 'buda'] }],
  ['B', ['orkidem var'], 'saksısını değiştirmem lazım mı', { icer: ['orkide'] }],
  ['B', ['limon ağacına hangi gübre'], 'ne zaman vereyim', { icer: ['limon'] }],
  ['B', ['bahçeye domates diktim'], 'yaprakları sararıyor', { icer: ['domates', 'sar'] }],
  ['B', ['çilek yetiştiriyorum'], 'hangi toprak iyi olur', { icer: ['çilek', 'toprak'] }],
  ['B', ['lavantam var'], 'kedime zararı olur mu', { icer: ['lavanta'] }],
  ['B', ['incir fidanım var'], 'nasıl çoğaltırım', { icer: ['incir', 'çelik'] }],
  ['B', ['kauçuk bitkim var', 'yaprakları dökülüyor'], 'ne yapmam lazım', { icer: ['dökül'] }],
  ['B', ['monstera nasıl sulanır'], 'peki güneşe koyayım mı', { icer: ['monstera', 'ışık'] }],
  ['B', ['ortancam var'], 'çiçek açmıyor', { icer: ['ortanca'] }],
  // ---- C. bitki değiştirme (yalnız bitki adı, konu öncekinden) ----
  ['C', ['monstera nasıl sulanır'], 'peki kauçuk?', { icer: ['kauçuk', 'sula'] }],
  ['C', ['gül ne zaman budanır'], 'ya ortanca', { icer: ['ortanca', 'buda'] }],
  ['C', ['limon ağacına hangi gübre'], 'portakal için de aynı mı', { icer: ['portakal'] }],
  ['C', ['kaktüs zehirli mi'], 'peki aloe vera', { icer: ['aloe'] }],
  ['C', ['domates ne zaman dikilir'], 'biber için', { icer: ['biber', 'dik'] }],
  ['C', ['monstera için toprak'], 'bir de paşa kılıcı için', { icer: ['paşa kılıcı'] }],
  ['C', ['orkide nasıl sulanır'], 'antoryum da aynı mı', { icer: ['antoryum', 'sula'] }],
  // ---- D. ürüne gönderme, ürün değiştirme ----
  ['D', ['monstera yaprakları sararıyor'], 'bunu nasıl kullanırım', { su: ['tarim-perliti'], icer: ['perlit'] }],
  ['D', ['limon için hangi gübre'], 'ikisini birlikte nasıl kullanayım', { su: ['hasturk-kati-solucan-gubresi', 'hasturk-sivi-solucan-gubresi'], icer: ['solucan', 'sıvı'] }],
  ['D', ['limon ağacına hangi gübre', 'peki nasıl sulayayım'], 'solucan gübresi nasıl kullanılır', { icer: ['solucan', 'saksı'] }],
  ['D', ['monstera sararıyor'], 'perlit ne işe yarar', { icer: ['perlit'] }],
  ['D', ['akülü pompa şarjı kaç saat gider'], 'peki manuel olanı kaç litre', { icer: ['manuel'], icermez: ['şarj süre'] }],
  ['D', ['monstera yaprak döküyor'], 'solucan gübresi de alayım mı bunun için', { icer: ['solucan', 'monstera'] }],
  ['D', ['gül için toprak'], 'o toprağı nasıl kullanacağım', { icer: ['gül'] }],
  ['D', [], 'florist orkide besini nasıl kullanılır', { icer: ['orkide', 'şase'] }],
  // ---- E. başka / alternatif ----
  ['E', ['monsteranın yaprakları sararıyor'], 'başka ne önerirsin', { su: ['hg-monstera-deve-tabani-topragi', 'tarim-perliti', 'florist-yesil-yaprakli-bitkiler-sivi-konsantre-besini'], icer: ['solucan'] }],
  ['E', ['limon ağacım var'], 'başka ürün var mı', { su: ['limon-agaci-topragi-ozel-organik-karisim'], icer: ['solucan'] }],
  ['E', ['orkidem çiçek açmıyor'], 'alternatif bir şey var mı', { su: ['florist-konsantre-orkide-besini'], icer: ['besin'] }],
  ['E', ['bitkim yaprak döküyor'], 'başka ne yapabilirim', { su: ['tarim-perliti'], icer: ['aydınlık'] }],
  // ---- F. birden çok bitki / konu ----
  ['F', [], 'monstera ve limonun yaprakları sararıyor', { icer: ['monstera', 'limon'] }],
  ['F', [], 'orkide ile antoryum nasıl sulanır', { icer: ['orkide', 'antoryum'] }],
  ['F', [], 'kaktüs ve paşa kılıcı için toprak', { icer: ['kaktüs', 'paşa kılıcı'] }],
  ['F', [], 'monstera nasıl sulanır ve hangi gübre verilir', { icer: ['sula', 'solucan'] }],
  ['F', ['zeytin ve incir fidanım var'], 'ikisini nasıl budayayım', { icer: ['zeytin', 'incir'] }],
  ['F', ['monsteram var', 'limon ağacım da var', 'kaktüs de aldım'], 'hepsine hangi toprak', { icer: ['monstera', 'limon', 'kaktüs'] }],
  ['F', [], 'gül lavanta ve biberiye için hangi gübre', { icer: ['lavanta'] }],
  ['F', [], 'kedim var monstera ve paşa kılıcı zehirli mi', { icer: ['monstera', 'paşa kılıcı'] }],
  // ---- G. düzeltme / olumsuzlama ----
  ['G', ['monsteranın yaprakları sararıyor'], 'pardon kauçuk demek istedim', { icer: ['kauçuk'], icermez: ['monstera —'] }],
  ['G', ['limon ağacına hangi gübre'], 'limon değil mandalina', { icer: ['mandalina'] }],
  ['G', ['orkide nasıl sulanır'], 'yok yanlış yazdım menekşe', { icer: ['menekşe'] }],
  ['G', ['gül için toprak'], 'toprak değil gübre soruyorum', { icer: ['gül', 'solucan'] }],
  // ---- H. selam, teşekkür, mağaza, konu dışı ----
  ['H', [], 'merhaba', { icer: ['yardım'] }],
  ['H', ['monstera nasıl sulanır'], 'teşekkür ederim çok sağol', { icer: ['rica'] }],
  ['H', [], 'siparişim nerede kaldı', { icer: ['müşteri hizmetleri'] }],
  ['H', [], 'iade nasıl yapılır', { icer: ['müşteri hizmetleri'] }],
  ['H', [], 'kargo kaç günde gelir', { icer: ['kargo'] }],
  ['H', [], 'yarın hava yağmurlu mu', { icer: ['yardımcı'] }],
  ['H', ['limon ağacına hangi gübre'], 'tamam anladım', { icer: [] , icermez: ['müşteri hizmetlerimizden destek alabilirsiniz'] }],
  // ---- I. miktar / litre ----
  ['I', ['monstera için toprak'], '30 cm saksı için kaç litre lazım', { icer: ['litre'] }],
  ['I', [], '2 tane 20 cm saksıya kaç litre toprak gider', { icer: ['litre'] }],
  ['I', [], '20 litrelik saksıya ne kadar toprak lazım', { icer: ['litre'] }],
  ['I', ['limon ağacına hangi gübre'], 'saksıdaki limon için kaç gram', { icer: ['limon'] }],
  // ---- J. noktalamasız uzun anlatım (sesle yazdırma) ----
  ['J', [], 'benim balkonda limon var yaprakları sararıyor bir de gül var onda da böcek var ne yapayım', { icer: ['limon', 'gül'] }],
  ['J', [], 'geçen hafta aldığım monsteranın yaprakları kahverengi oldu sulamayı haftada iki yapıyorum acaba fazla mı', { icer: ['monstera', 'sula'] }],
  ['J', [], 'abi bahçede zeytin ağaçlarım var gübre atmak istiyorum hangisini önerirsin bir de ne zaman atayım', { icer: ['zeytin', 'solucan'] }],
  ['J', [], 'kızım orkide hediye etti çiçekleri döküldü şimdi ne yapacağım tekrar açar mı', { icer: ['orkide'] }],
  // ---- K. tanınmayan bitki / genel ----
  ['K', [], 'jakaranda için nasıl bir toprak almam lazım', { icer: ['jakaranda'] }],
  ['K', [], 'bu ay ne ekebilirim', { icer: ['ek'] }],
  ['K', [], 'kedim var zararsız bitki önerir misin', { icer: ['zehirli'] }],
  // ---- L. önerilen toprağın kullanımı / dikim (toprak kartı tekrar verilmez, başka ürünün içeriği verilmez) ----
  ['L', ['limon için toprak'], 'bu toprağa limonu nasıl dikmem lazım direkt mi kullanıyoruz yoksa karıştırıyor muyuz', { su: ['limon-agaci-topragi-ozel-organik-karisim'], icer: ['doğrudan', 'can suyu'], icermez: ['perlit:'] }],
  ['L', ['monstera için hangi toprak'], 'bunu mevcut toprağımla karıştırmam mı lazım', { icer: ['eski saksı toprağını'] }],
  ['L', ['gül için toprak önerir misin'], 'eski toprağı atmam mı lazım', { icer: ['eski saksı toprağını'] }],
  ['L', ['orkide toprağı'], 'direkt saksıya mı dolduruyoruz', { icer: ['şeffaf'] }],
  ['L', ['kaktüs için toprak'], 'peki nasıl kullanılıyor', { icer: ['doğrudan'] }],
  ['L', ['monstera için toprak'], '30 cm saksı için kaç litre lazım', { icer: ['litre'] }],
  ['L', ['kaktüsüm var'], 'kışın ne kadar sulamalıyım', { icer: ['kaktüs'], icermez: ['galvaniz'] }],
  ['L', [], 'ücretsiz kargo var mı', { icer: ['kargo'], icermez: ['saksı'] }],
];
// İkinci set: kurallar bunlara bakılarak düzeltilmedi (genelleme ölçüsü)
const K2 = [
  ['A', [], 'yucca nın yaprak uçları kuruyor', { icer: ['yuka'] }],
  ['A', [], 'benjaminim sürekli yaprak döküyo', { icer: ['dökül'] }],
  ['A', [], 'sardunya ne sıklıkla sulanmalı', { icer: ['sardunya', 'sula'] }],
  ['A', [], 'aloevera kac gunde bi su verilir', { icer: ['aloe', 'sula'] }],
  ['A', [], 'çam ağacı ne zaman dikilir', { icer: ['çam', 'dik'] }],
  ['A', [], 'yasemin kışa dayanır mı', { icer: ['yasemin'] }],
  ['A', [], 'nane nasıl çoğaltılır', { icer: ['nane'] }],
  ['A', [], 'ortancamın çiçekleri kurudu', { icer: ['ortanca'] }],
  ['A', [], 'salon sarmaşığı güneşte durur mu', { icer: ['sarmaşı'] }],
  ['A', [], 'domatesime ne gübre vereyim', { icer: ['domates', 'solucan'] }],
  ['B', ['bir tane kauçuk aldım'], 'nereye koymalıyım', { icer: ['kauçuk'] }],
  ['B', ['bahçemde ceviz ağacı var'], 'ne zaman budanır', { icer: ['ceviz', 'buda'] }],
  ['B', ['çilek ektim saksıya'], 'ne zaman meyve verir', { icer: ['çile', 'meyve'] }],
  ['B', ['kaktüsüm var'], 'kışın ne kadar sulamalıyım', { icer: ['kaktüs', 'kış'] }],
  ['B', ['biberlerim var balkonda'], 'yaprakları kıvrılıyor neden', { icer: ['biber', 'kıvrıl'] }],
  ['B', ['gardenya aldım'], 'nasıl bir toprak istiyor', { icer: ['gardenya', 'toprak'] }],
  ['B', ['annem bir orkide verdi'], 'nasıl bakmalıyım sulama falan', { icer: ['orkide', 'sula'] }],
  ['B', ['limon ağacım var', 'yaprakları sararıyor'], 'neden olur', { icer: ['limon', 'sar'] }],
  ['C', ['kaktüs nasıl sulanır'], 'peki sukulentler', { icer: ['sukulent', 'sula'] }],
  ['C', ['gül ne zaman dikilir'], 'peki lavanta ne zaman', { icer: ['lavanta', 'dik'] }],
  ['C', ['monstera zehirli mi'], 'ya zamioculcas', { icer: ['zamioculcas'] }],
  ['C', ['domatese hangi gübre'], 'salatalık için', { icer: ['salatalık'] }],
  ['D', ['limon yaprakları sararıyor'], 'sıvı olanı nasıl kullanacağım', { su: ['hasturk-kati-solucan-gubresi', 'hasturk-sivi-solucan-gubresi'], icer: ['sıvı'] }],
  ['D', ['monstera toprağı'], 'perlit karıştırmam gerekir mi', { icer: ['perlit'] }],
  ['D', [], 'hümik asit ne işe yarar', { icer: ['hümik'] }],
  ['D', ['saksıda küçük sinekler var'], 'bu spreyi nasıl uygulayacağım', { su: ['florist-sinek-ve-unlu-bit-onleyici-bitki-spreyi'], icer: ['sprey'] }],
  ['E', ['ortanca için toprak'], 'başka seçenek var mı', { su: ['yaban-mersini-ve-ortanca-topragi'], icer: ['ortanca'] }],
  ['E', ['domates için gübre'], 'başka ne alabilirim', { su: ['hasturk-kati-solucan-gubresi', 'hasturk-sivi-solucan-gubresi', 'hasturk-humix-sivi-humik-asit'], icer: ['domates'] }],
  ['F', [], 'biber ve patlıcan ne zaman dikilir', { icer: ['biber', 'patlıcan'] }],
  ['F', [], 'nane fesleğen ve kekik güneş sever mi', { icer: ['nane', 'fesleğen', 'kekik'] }],
  ['F', [], 'kauçuk nasıl sulanır ve nereye koymalıyım', { icer: ['kauçuk', 'sula', 'ışık'] }],
  ['G', ['zeytin ne zaman budanır'], 'zeytin değil incir', { icer: ['incir', 'buda'] }],
  ['G', ['monstera güneş sever mi'], 'yanlış yazdım kauçuk', { icer: ['kauçuk'] }],
  ['G', ['limon nasıl sulanır'], 'sulama değil budama soruyorum', { icer: ['limon', 'buda'] }],
  ['H', [], 'iyi akşamlar', { icer: ['yardım'] }],
  ['H', ['domates ne zaman dikilir'], 'çok teşekkürler eline sağlık', { icer: ['rica'] }],
  ['H', [], 'kargom gelmedi', { icer: ['müşteri hizmetleri'] }],
  ['H', [], 'ürünü iade etmek istiyorum', { icer: ['müşteri hizmetleri'] }],
  ['H', [], 'ücretsiz kargo var mı', { icer: ['kargo'] }],
  ['I', [], '25 cm saksı kaç litre toprak alır', { icer: ['litre'] }],
  ['I', ['kaktüs toprağı'], '3 tane küçük saksım var 15 cm kaç litre lazım', { icer: ['litre'] }],
  ['J', [], 'merhaba benim monsteram var yaprakları sarı oluyor ayrıca limon ağacımda da beyaz böcekler var ne yapmam lazım', { icer: ['monstera', 'limon'] }],
  ['J', [], 'bahçeye domates biber ve salatalık ekeceğim hangi gübreyi kullanayım', { icer: ['domates'] }],
  ['J', [], 'kaktüsümü saksı değiştirdim sonra yumuşamaya başladı çürüyor mu acaba', { icer: ['çürü'] }],
  ['K', [], 'bougainvillea için toprak', { icer: ['begonvil'] }],
  ['K', [], 'kasım ayında ne ekilir', { icer: ['kasım'] }],
];

const KAT = { A: 'Yazım hatası / ağız', B: 'Önceki mesaja bağlı', C: 'Bitki değiştirme', D: 'Ürüne gönderme', E: 'Başka / alternatif', F: 'Çok bitki / konu', G: 'Düzeltme', H: 'Selam / mağaza', I: 'Miktar / litre', J: 'Uzun anlatım', K: 'Tanınmayan / genel', L: 'Toprak kullanımı / dikim' };
const kucuk = (s) => String(s || '').toLocaleLowerCase('tr-TR');
export function puanla(d, b) {
  const c = kucuk((d && (d.dinamik === 'toprak' ? `${d.bitki || ''} toprak ${d.cevap || ''}` : d.cevap)) || '');
  if (!c) return { ok: false, neden: 'cevap yok (' + ((d && (d.neden || d.kaynak)) || 'hata') + ')' };
  const eksik = (b.icer || []).filter((x) => !c.includes(kucuk(x)));
  const fazla = (b.icermez || []).filter((x) => c.includes(kucuk(x)));
  return { ok: !eksik.length && !fazla.length, neden: [eksik.length ? 'eksik: ' + eksik.join(', ') : '', fazla.length ? 'olmamalı: ' + fazla.join(', ') : ''].filter(Boolean).join(' · ') };
}
export const ORNEKLER = K;
export const ORNEKLER2 = K2;

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv.slice(2);
  let sor;
  if (arg[0] === '--canli') {
    const W = arg[1] || 'https://hasturk-arama.halilc2007.workers.dev';
    sor = async (q, g, su) => {
      for (let i = 0; i < 2; i++) {
        try {
          const r = await fetch(W + '/ak', { method: 'POST', headers: { Origin: 'https://hasturkgubre.com.tr', 'Content-Type': 'application/json', 'X-Ak-Test': '1' }, body: JSON.stringify({ q, g, su, s: 'hasturk', n: 'Bilge Bey' }) });
          return await r.json();
        } catch (e) { if (i) return { ok: false, neden: String(e.message) }; }
      }
    };
  } else {
    const ak = await import(arg[1]);
    const P = JSON.parse((await import('node:fs')).readFileSync(new URL('../public/products.json', import.meta.url))).items.map((p) => ({ s: p.s, n: p.n, st: p.st }));
    const db = { exec: async () => {}, batch: async () => {}, prepare: (sql) => ({ bind: () => ({ first: async () => (/ak_gun/.test(sql) ? { n: 1 } : null), run: async () => {}, all: async () => ({ results: [] }) }), first: async () => null, all: async () => ({ results: [] }) }) };
    sor = async (q, g, su) => (await ak.handle(new Request('https://x/ak', { method: 'POST', body: JSON.stringify({ q, g, su }) }), { DB: db }, { waitUntil() {} }, { aiKey: 'k', originOk: true, products: async () => P, formul: null })).json();
  }
  const set = arg.includes('--set2') ? K2 : arg.includes('--hepsi') ? K.concat(K2) : K;
  const say = {}, kotu = [];
  let t = 0, yz = 0;
  for (const [kat, g, q, b] of set) {
    const t0 = Date.now(), d = await sor(q, g, b.su);
    t += Date.now() - t0;
    if (d && d.kaynak === 'ai') yz++;
    const p = puanla(d, b);
    (say[kat] = say[kat] || [0, 0])[p.ok ? 0 : 1]++;
    if (!p.ok) kotu.push(`✗ [${kat}] ${g.length ? '[' + g.join(' / ') + '] → ' : ''}${q}  —  ${p.neden}  |  ${String((d && d.cevap) || '').replace(/\s+/g, ' ').slice(0, 110)}`);
  }
  const top = Object.values(say).reduce((a, x) => [a[0] + x[0], a[1] + x[1]], [0, 0]);
  console.log('## Konuşma anlama testi');
  for (const [k, [o, h]] of Object.entries(say)) console.log(`${KAT[k].padEnd(22)} ${o}/${o + h}`);
  console.log(`TOPLAM: ${top[0]}/${top[0] + top[1]} (%${Math.round((top[0] / (top[0] + top[1])) * 100)}) · yapay zekâ cevabı ${yz} · ortalama ${Math.round(t / set.length)} ms`);
  console.log(kotu.join('\n'));
}
