// Araç çubuğu penceresi: iki tutar alanı arasında TCMB kuruyla çift yönlü çeviri.
const $ = (id) => document.getElementById(id);
const fmtRate = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
// 1'den büyükte hep 2 ondalık: "1,275" gibi 3 haneli ondalık çıkarsa parseNumber onu binlik sanar.
const fmtBig = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSmall = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
const fmtVal = (x) => (Math.abs(x) >= 1 ? fmtBig : fmtSmall).format(x);

let rates = null;
let data = null;
let editing = "amount"; // kullanıcının en son yazdığı alan; diğeri hesaplanır

// Üst alan: "100 dolar" / "100 tl" gibi yazılırsa birimi de oradan al.
function parseTop(text) {
  // parser.js TL'yi bilerek tanımaz (sayfadaki TL fiyatlarında balon çıkmasın); popup'ta ayrıca bak.
  const tl = text.match(/^₺\s*(.+)$|^(.+?)\s*(?:tl|try|₺|(?:türk\s+)?liras?[ıi]?)$/i);
  const parsed = tl
    ? { amount: window.TLParser.parseNumber(tl[1] || tl[2]), currency: "TRY" }
    : window.TLParser.parseAmount(text);
  if (parsed && rates[parsed.currency]) $("from").value = parsed.currency;
  return parsed ? parsed.amount : window.TLParser.parseNumber(text);
}

function convert() {
  if (!rates) return;
  const from = $("from").value, to = $("to").value;
  if (editing === "amount") {
    const text = $("amount").value.trim();
    const amount = text ? parseTop(text) : null;
    $("result").value = amount === null ? "" : fmtVal((amount * rates[$("from").value]) / rates[to]);
  } else {
    const text = $("result").value.trim();
    const amount = text ? window.TLParser.parseNumber(text) : null;
    $("amount").value = amount === null ? "" : fmtVal((amount * rates[to]) / rates[from]);
  }
  const f = $("from").value;
  $("rate").textContent = `1 ${f} = ${fmtRate.format(rates[f] / rates[to])} ${to}`;
}

function showInfo() {
  $("info").className = "";
  const note = data.source === "tcmb" ? " (alış/satış ort.)" : "";
  $("info").textContent = `${data.label || ""} ${data.date || ""} · ${TLUI.timeOf(data.fetchedAt)}${note}`;
}

// force: önbelleği atlayıp kaynaktan yeniden çek. Kur 150 ms'de gelmezse dönen simge göster.
function load(force) {
  const spin = setTimeout(() => {
    $("info").className = "loading";
    $("info").textContent = "Kur alınıyor…";
  }, force ? 0 : 150);
  $("refresh").disabled = true;
  chrome.runtime.sendMessage({ type: "getRates", force }, (res) => {
    clearTimeout(spin);
    $("refresh").disabled = false;
    if (chrome.runtime.lastError || !res || !res.ok) {
      const why = chrome.runtime.lastError ? chrome.runtime.lastError.message : res && res.error;
      $("info").className = "err";
      $("info").textContent = "Kur alınamadı: " + (why || "bilinmeyen hata");
      return;
    }
    data = res.data;
    rates = data.rates;
    // Kaynaklar farklı para birimleri yayımlar; listeyi her yüklemede kur, seçimi koru.
    const top = ["TRY", "USD", "EUR"]; // en çok kullanılanlar üstte
    const codes = [...top, ...Object.keys(rates).filter((c) => !top.includes(c)).sort()];
    for (const [sel, def] of [[$("from"), "USD"], [$("to"), "TRY"]]) {
      const keep = sel.value;
      sel.length = 0;
      for (const c of codes) sel.add(new Option(c, c));
      sel.value = rates[keep] ? keep : def;
    }
    showInfo();
    convert();
  });
}

// --- Tema ---
let theme = "auto";
function applyTheme() {
  document.documentElement.style.cssText = TLUI.css(theme);
  for (const b of $("themes").children) b.setAttribute("aria-checked", String(b.dataset.theme === theme));
}
for (const [name, label] of Object.entries(TLUI.NAMES)) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "sw";
  b.dataset.theme = name;
  b.setAttribute("role", "radio");
  b.title = b.ariaLabel = label;
  b.style.background = name === "auto"
    ? `linear-gradient(135deg, ${TLUI.THEMES.beyaz.bg} 50%, ${TLUI.THEMES.lacivert.bg} 50%)`
    : TLUI.THEMES[name].bg;
  b.addEventListener("click", () => {
    theme = name;
    applyTheme();
    chrome.storage.local.set({ theme });
  });
  $("themes").appendChild(b);
}
TLUI.dark.addEventListener("change", applyTheme);

// --- Balon aç/kapat ---
function setEnabled(on) {
  $("enabled").checked = on;
  $("switch").title = on ? "Sayfadaki balon açık" : "Sayfadaki balon kapalı";
}

$("swap").innerHTML = TLUI.ICONS.swap;
$("refresh").innerHTML = TLUI.ICONS.refresh;
$("github").innerHTML = TLUI.ICONS.github;
$("github").href = TLUI.REPO_URL;

applyTheme();
chrome.storage.local.get(["enabled", "theme", "source"]).then((r) => {
  $("source").value = r.source === "ecb" ? "ecb" : "tcmb";
  theme = TLUI.THEMES[r.theme] ? r.theme : "auto"; // kaldırılan temalar (siyah, kırık beyaz) otomatiğe döner
  applyTheme();
  setEnabled(r.enabled !== false);
});
load(false);

$("amount").addEventListener("input", () => { editing = "amount"; convert(); });
$("result").addEventListener("input", () => { editing = "result"; convert(); });
$("from").addEventListener("change", convert);
$("to").addEventListener("change", convert);
$("swap").addEventListener("click", () => {
  [$("from").value, $("to").value] = [$("to").value, $("from").value];
  convert();
});
$("refresh").addEventListener("click", () => load(true));
$("source").addEventListener("change", (e) => {
  chrome.storage.local.set({ source: e.target.value }).then(() => load(false));
});
$("enabled").addEventListener("change", (e) => {
  setEnabled(e.target.checked);
  chrome.storage.local.set({ enabled: e.target.checked });
});
