const assert = require("assert");
const { parseAmount, parseNumber } = require("../parser.js");

const cases = [
  ["$1,299.99", 1299.99, "USD"],
  ["1.299,99 USD", 1299.99, "USD"],
  ["€ 49,90", 49.9, "EUR"],
  ["49.90 EUR", 49.9, "EUR"],
  ["£1,000", 1000, "GBP"],
  ["$5", 5, "USD"],
  ["US$ 12.5", 12.5, "USD"],
  ["1.234.567 USD", 1234567, "USD"],
  ["1 299,50 €", 1299.5, "EUR"],
  ["1 299,50 €", 1299.5, "EUR"],
  ["10 100 USD", 100, "USD"],
  ["$1.5k", 1500, "USD"],
  ["$3M", 3e6, "USD"],
  ["1,5 milyon dolar", 1.5e6, "USD"],
  ["2 bin euro", 2000, "EUR"],
  ["€2 billion", 2e9, "EUR"],
  ["5 mart 20 USD", 20, "USD"],
  ["100 dolar", 100, "USD"],
  ["25 euro", 25, "EUR"],
  ["USD 250", 250, "USD"],
  ["gbp 20.00", 20, "GBP"],
  ["¥1,500", 1500, "JPY"],
  ["C$ 30", 30, "CAD"],
  ["$0.99", 0.99, "USD"],
  ["$1.299", 1299, "USD"],
  ["$12.50", 12.5, "USD"],
  ["1,100 usd", 1100, "USD"],
  ["1,100usd", 1100, "USD"],
  ["90.00usd", 90, "USD"],
  ["1,100\u00a0USD", 1100, "USD"],
  ["12,500 usd", 12500, "USD"],
  ["100 dolara", 100, "USD"],
  ["50 dolarlık", 50, "USD"],
  ["20 euroya", 20, "EUR"],
  ["30 sterline", 30, "GBP"],
  ["100 dolar'a", 100, "USD"],
  ["500 KZT", 500, "KZT"],
  ["29,78 ABD Doları", 29.78, "USD"],
  ["29,78 ABD DOLARI", 29.78, "USD"],
  ["100 ABD dolarına", 100, "USD"],
  ["50 Kanada Doları", 50, "CAD"],
  ["50 Avustralya doları", 50, "AUD"],
  ["10 İsviçre Frangı", 10, "CHF"],
  ["10 ISVIÇRE FRANGI", 10, "CHF"],
  ["10 İngiliz Sterlini", 10, "GBP"],
  ["1.000 Japon Yeni", 1000, "JPY"],
  ["100 İsveç Kronu", 100, "SEK"],
  ["100 Norveç Kronu", 100, "NOK"],
  ["100 Danimarka Kronu", 100, "DKK"],
  ["100 Suudi Arabistan Riyali", 100, "SAR"],
  ["100 Katar Riyali", 100, "QAR"],
  ["100 Kuveyt Dinarı", 100, "KWD"],
  ["100 Rus Rublesi", 100, "RUB"],
  ["100 Çin Yuanı", 100, "CNY"],
  ["100 Azerbaycan Yeni Manatı", 100, "AZN"],
  ["100 Rumen Leyi", 100, "RON"],
  ["100 Pakistan Rupisi", 100, "PKR"],
  ["100 Güney Kore Wonu", 100, "KRW"],
  ["100 Birleşik Arap Emirlikleri Dirhemi", 100, "AED"],
  ["100 Kazakistan Tengesi", 100, "KZT"],
  ["20 US dollars", 20, "USD"],
  ["20 Canadian dollars", 20, "CAD"],
];
for (const [text, amount, currency] of cases) {
  const r = parseAmount(text);
  assert.ok(r, `ayrıştırılamadı: ${text}`);
  assert.strictEqual(r.currency, currency, `para birimi: ${text}`);
  assert.ok(Math.abs(r.amount - amount) < 1e-9, `tutar: ${text} -> ${r.amount}`);
}

// Dönüştürülmemesi gerekenler
for (const text of ["merhaba dünya", "1234", "₺500", "500 TL", "", "Bu bir USDA raporu 2020", "5 yeni ürün","x".repeat(200)]) {
  assert.strictEqual(parseAmount(text), null, `null olmalıydı: ${text}`);
}
// Bağlam (çift tık yalnızca sayıyı seçtiğinde): seçimle kesişen eşleşme alınmalı
const ctx = "Fiyat: 1,100 usd, kargo 20 eur";
let r = parseAmount(ctx, { overlap: [7, 12] });          // "1,100"
assert.deepStrictEqual(r, { amount: 1100, currency: "USD" });
r = parseAmount(ctx, { overlap: [26, 28] });              // "20"
assert.deepStrictEqual(r, { amount: 20, currency: "EUR" });
assert.strictEqual(parseAmount(ctx, { overlap: [0, 5] }), null); // "Fiyat"
console.log("Tüm testler geçti (" + cases.length + " + negatif).");
