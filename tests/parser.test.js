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
