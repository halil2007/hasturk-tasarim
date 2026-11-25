// Pakete neyin girip neyin girmediği (yapı türüne göre). Araçta "Pakette ne var" notu ve kurulum kılavuzunda kullanılır.
export const PAKET = {
  S: 'Sera örtüsü (naylon, polikarbonat, gölge filesi, branda), örtü bağlantı klipsleri, zemin malzemesi, zemine sabitleme malzemesi ve sulama ekipmanı pakete dahil değildir; yalnız iskelet gönderilir.',
  E: 'Örtü malzemesi (naylon, polikarbonat, gölge filesi, branda), örtü bağlantı klipsleri ve zemine sabitleme malzemesi pakete dahil değildir; yalnız iskelet gönderilir.',
  N: 'Örtü malzemesi (naylon, polikarbonat, gölge filesi, branda), örtü bağlantı klipsleri ve zemine sabitleme malzemesi pakete dahil değildir; iskelet, menteşeler ve konnektörler gönderilir.',
  J: 'Tel kafes, örtü malzemesi, bağlantı aparatları ve zemin sabitleme malzemesi pakete dahil değildir; iskelet, menteşeler ve konnektörler gönderilir. Görseldeki hayvanlar temsilidir.',
  D: 'Masa tablası ve alt raf tablası pakete dahil değildir; yalnız iskelet gönderilir. Görseldeki saksılar temsilidir.',
  Y: 'Tel ya da file yüzeyler pakete dahil değildir; iskelet ve menteşeler gönderilir. Görseldeki ürünler temsilidir.',
  A: 'Kovanlar ve arıcılık ekipmanı pakete dahil değildir; yalnız sehpa iskeleti gönderilir.',
  G: 'Bitkiler, taş yol ve zemin sabitleme malzemesi pakete dahil değildir; yalnız iskelet gönderilir. Görseldeki sarmaşık temsilidir.',
  O: 'Araç, örtü (branda ya da gölge filesi) ve zemin sabitleme malzemesi pakete dahil değildir; yalnız iskelet gönderilir. Araç ölçüleri bu sınıftaki yaygın modellerin ortalamasıdır.',
  L: 'Cihaz, kafes teli ya da delikli sac ve zemin sabitleme malzemesi pakete dahil değildir; yalnız iskelet gönderilir. Cihaz ölçüleri yaygın modellerin ortalamasıdır; kendi cihazınızın ölçüsünü kontrol edin.',
  U: 'Çöp kovası ya da konteyner, kaplama malzemesi (tel, delikli sac ya da ahşap çıta) ve zemin sabitleme malzemesi pakete dahil değildir; yalnız iskelet gönderilir.',
  P: 'Güneş paneli, panel kelepçeleri, kablo, akü ve inverter pakete dahil değildir; yalnız sehpa iskeleti gönderilir.',
  X: 'Tel kafes, kulübe kaplaması (duvar ve raf tablası), çatı örtüsü ve zemin sabitleme malzemesi pakete dahil değildir; yalnız iskelet gönderilir.',
  Z: 'İp, bitki ve toprak pakete dahil değildir.',
  K: 'Tel kafes, kulübe kaplaması, çatı örtüsü ve zemin sabitleme malzemesi pakete dahil değildir; iskelet, menteşeler ve konnektörler gönderilir. Görseldeki hayvanlar temsilidir.',
  C: 'Kaplama malzemesi (bordex, sandviç panel, saç ya da lambiri) ve zemin malzemesi pakete dahil değildir; kaplama miktarları tahmindir. İskelet, kapı kanatları, menteşeler ve konnektörler gönderilir.',
  Q: 'Tel örgü kaplama ve zemin sabitleme malzemesi pakete dahil değildir; iskelet, kapı kanadı, menteşeler ve konnektörler gönderilir. Görseldeki kuşlar, ağaç ve bahçe temsilidir.',
  R: 'Raf tablaları (OSB, sunta vb.) pakete dahil değildir; tabla ölçüleri listededir. İskelet ve konnektörler gönderilir. Rafı duvara sabitleyin.',
  W: 'Çatı örtüsü (branda, sunta ya da sac), kütükler, yağmur oluğu ve zemin sabitleme malzemesi pakete dahil değildir; yalnız iskelet, kapı kanatları (seçilirse) ve konnektörler gönderilir.',
  F: 'Tel örgü ve ahşap tünek rafları profil iskelete dahil değildir; rafların ölçü ve adetleri listede ayrıca verilir. İskelet, kapı kanadı, menteşeler ve konnektörler gönderilir.',
};
export const paketNotu = (m) => 'Pakette ne var: ölçüsüne kesilmiş ve delinmiş galvaniz profiller, konnektörler ve civata somun setleri. ' + (PAKET[m] || 'Örtü ve kaplama malzemeleri pakete dahil değildir; yalnız iskelet gönderilir.') + ' Görsellerdeki insan figürü ölçek içindir.';
