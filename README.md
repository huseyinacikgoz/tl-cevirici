# TL Çevirici

Chrome, Brave, Edge ve Firefox için küçük, açık kaynaklı eklenti. Sayfada bir döviz tutarını **seçtiğinde, çift tıkladığında veya kopyaladığında** yanında küçük bir balonla TL karşılığını gösterir.

Araç çubuğundaki simgeye tıklayınca açılan pencerede tutarı yazıp (`100` veya `100 dolar`) TL ve diğer para birimleri arasında da çevirebilirsin.

- Kurlar **TCMB günlük döviz kurlarından** (`today.xml`) alınır, 1 saat önbelleğe alınır. Alış ve satış kurunun ortalaması kullanılır.
- Veri toplamaz, hiçbir yere göndermez. Tek ağ isteği TCMB'ye gider.
- İzinler: `storage` (kur önbelleği) ve `https://www.tcmb.gov.tr/*`.

## Desteklenen biçimler

`$1,299.99` · `1.299,99 USD` · `€ 49,90` · `49.90 EUR` · `£1,000` · `1 299,50 €` · `100 dolar` · `50 dolarlık` · `20 euroya` · `$1.5k` · `1,5 milyon dolar` · `25 euro` · `US$ 12.5` · `C$ 30` ...

`$ € £ ¥ US$ C$ A$` sembolleri, `USD EUR GBP CHF JPY CAD AUD ...` kodları ve `dolar / euro / avro / sterlin` kelimeleri tanınır. TL tutarları (`₺500`, `500 TL`) dönüştürülmez.

## Kurulum (Brave)

1. Bu depoyu indir (`Code > Download ZIP`) ve klasöre çıkar.
2. Brave'de `brave://extensions` adresini aç.
3. Sağ üstten **Geliştirici modu**nu aç.
4. **Paketlenmemiş uzantı yükle** deyip klasörü seç.

## Kurulum (Firefox ve türevleri: LibreWolf, Zen, Floorp…)

1. `about:debugging#/runtime/this-firefox` adresini aç.
2. **Geçici Eklenti Yükle** deyip klasördeki `manifest.json` dosyasını seç.
3. Geçici eklenti tarayıcı kapanınca silinir; kalıcı kurulum için eklentinin [AMO](https://addons.mozilla.org) üzerinden imzalanması gerekir.

Firefox 128 ve üstü gerekir. Kurulumda "tüm sitelerdeki verilere erişim" izni istenirse onayla; seçimi okuyabilmek için gerekli.

## Geliştirme

```bash
node tests/parser.test.js
node tests/tcmb.test.js
```

## Notlar

- Binlik ayırıcı olarak düz boşluk kabul edilmez (`10 100 USD` → 100 USD); bölünmez boşluk (`1 299,50 €`) kabul edilir.
- Sitedeki bir "kopyala" düğmesiyle panoya yazılan metin yakalanmaz (tarayıcı bunun için olay üretmez); metni seçmen yeterli.
- `1.299` gibi tek ayırıcılı ve ayırıcıdan sonra 3 hane olan sayılar binlik ayırıcı sayılır (1299). Fiyatlarda 3 haneli ondalık nadirdir.
- `¥` işareti JPY kabul edilir (CNY ile karışabilir).
- Hafta sonu ve tatillerde TCMB son yayımlanan kuru gösterir; balonda kurun tarihi yazar.

## Lisans

MIT
