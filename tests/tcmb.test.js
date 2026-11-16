// background.js'teki parseTcmb'yi çıkarıp örnek TCMB XML'iyle sınar.
const fs = require("fs");
const assert = require("assert");
const src = fs.readFileSync(__dirname + "/../background.js", "utf8");
const fn = src.match(/function parseTcmb[\s\S]*?\n}\n/)[0];
const parseTcmb = new Function(fn + "; return parseTcmb;")();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="16.11.2026" Date="11/16/2026" Bulten_No="2026/220">
<Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
<Isim>ABD DOLARI</Isim><CurrencyName>US DOLLAR</CurrencyName>
<Unit>1</Unit><ForexBuying>42.5000</ForexBuying><ForexSelling>42.5800</ForexSelling>
<BanknoteBuying>42.4700</BanknoteBuying><BanknoteSelling>42.6500</BanknoteSelling>
</Currency>
<Currency CrossOrder="9" Kod="JPY" CurrencyCode="JPY">
<Isim>JAPON YENI</Isim><CurrencyName>JAPENESE YEN</CurrencyName>
<Unit>100</Unit><ForexBuying>27.4000</ForexBuying><ForexSelling>27.4500</ForexSelling>
</Currency>
<Currency CrossOrder="0" Kod="XDR" CurrencyCode="XDR">
<Unit>1</Unit><ForexBuying>58.0000</ForexBuying><ForexSelling></ForexSelling>
</Currency>
</Tarih_Date>`;

const { rates, date } = parseTcmb(xml);
assert.strictEqual(date, "16.11.2026");
assert.strictEqual(rates.TRY, 1);
assert.ok(Math.abs(rates.USD - 42.54) < 1e-9);
assert.ok(Math.abs(rates.JPY - 0.27425) < 1e-9, "Unit=100 bölünmeli");
assert.ok(Math.abs(rates.XDR - 58) < 1e-9, "boş satış kuru atlanmalı, alış kullanılmalı");
console.log("TCMB ayrıştırma testi geçti.");
