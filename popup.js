// Araç çubuğu penceresi: tutar yaz, iki para birimi arasında TCMB kuruyla çevir.
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
let rates = null;

function convert() {
  if (!rates) return;
  const text = $("amount").value.trim();
  // "100 dolar" gibi yazılırsa birimi de oradan al; düz sayıysa seçili birimi kullan.
  // parser.js TL'yi bilerek tanımaz (sayfadaki TL fiyatlarında balon çıkmasın); popup'ta ayrıca bak.
  const tl = text.match(/^₺\s*(.+)$|^(.+?)\s*(?:tl|try|₺|lira)$/i);
  const parsed = tl
    ? { amount: window.TLParser.parseNumber(tl[1] || tl[2]), currency: "TRY" }
    : window.TLParser.parseAmount(text);
  if (parsed && rates[parsed.currency]) $("from").value = parsed.currency;
  const amount = parsed ? parsed.amount : window.TLParser.parseNumber(text);
  const from = $("from").value, to = $("to").value;
  if (amount === null || !text) { $("out").textContent = ""; return; }
  const result = (amount * rates[from]) / rates[to];
  $("out").textContent = `${fmt.format(amount)} ${from} = ${fmt.format(result)} ${to}`;
}

chrome.runtime.sendMessage({ type: "getRates" }, (res) => {
  if (chrome.runtime.lastError || !res || !res.ok) {
    $("info").textContent = "Kur alınamadı (TCMB). İnternetini kontrol et.";
    return;
  }
  rates = res.data.rates;
  const top = ["TRY", "USD", "EUR"]; // en çok kullanılanlar üstte
  const codes = [...top, ...Object.keys(rates).filter((c) => !top.includes(c)).sort()];
  for (const sel of [$("from"), $("to")]) {
    for (const c of codes) sel.add(new Option(c, c));
  }
  $("from").value = "USD";
  $("to").value = "TRY";
  $("info").textContent = `TCMB kuru · ${res.data.date || ""} (alış/satış ortalaması)`;
  convert();
});

$("amount").addEventListener("input", convert);
$("from").addEventListener("change", convert);
$("to").addEventListener("change", convert);
$("swap").addEventListener("click", () => {
  [$("from").value, $("to").value] = [$("to").value, $("from").value];
  convert();
});
