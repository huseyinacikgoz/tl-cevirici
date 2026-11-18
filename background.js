// Seçili kaynaktan (TCMB veya ECB/Frankfurter) günlük kurları çeker, 1 saat önbelleğe alır.
const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
// CORS'a açık (Access-Control-Allow-Origin: *), bu yüzden ek host izni gerekmiyor.
const ECB_URL = "https://api.frankfurter.dev/v2/rates?base=TRY&providers=ECB";
const CACHE_KEY = "rates"; // { source, label, rates, date, fetchedAt }
const TTL_MS = 60 * 60 * 1000;

// Service worker'da DOMParser yok; XML'i regex ile ayrıştırıyoruz.
function parseTcmb(xml) {
  const dateMatch = xml.match(/<Tarih_Date[^>]*\bTarih="([^"]+)"/);
  const rates = { TRY: 1 };
  const blocks = xml.match(/<Currency\b[\s\S]*?<\/Currency>/g) || [];
  for (const b of blocks) {
    const code = (b.match(/CurrencyCode="([A-Z]{3})"/) || [])[1];
    const unit = parseFloat((b.match(/<Unit>([\d.]+)<\/Unit>/) || [])[1]);
    const buy = parseFloat((b.match(/<ForexBuying>([\d.]+)<\/ForexBuying>/) || [])[1]);
    const sell = parseFloat((b.match(/<ForexSelling>([\d.]+)<\/ForexSelling>/) || [])[1]);
    const val = [buy, sell].filter(Number.isFinite);
    if (!code || !unit || !val.length) continue;
    const avg = val.reduce((a, c) => a + c, 0) / val.length;
    rates[code] = avg / unit; // 1 birim döviz = kaç TL
  }
  return { rates, date: dateMatch ? dateMatch[1] : null };
}

// Frankfurter v2: [{date:"2026-11-18", base:"TRY", quote:"USD", rate:0.0198}, ...] (1 TL = rate döviz)
function parseFrankfurter(json) {
  const list = JSON.parse(json);
  if (!Array.isArray(list)) throw new Error("Beklenmeyen ECB yanıtı");
  const rates = { TRY: 1 };
  let date = "";
  for (const r of list) {
    if (!r || !/^[A-Z]{3}$/.test(r.quote) || !(r.rate > 0)) continue;
    rates[r.quote] = 1 / r.rate; // 1 birim döviz = kaç TL
    if (typeof r.date === "string" && r.date > date) date = r.date;
  }
  return { rates, date: date ? date.split("-").reverse().join(".") : null };
}

const SOURCES = {
  tcmb: { label: "TCMB", url: TCMB_URL, parse: parseTcmb },
  ecb: { label: "ECB", url: ECB_URL, parse: parseFrankfurter },
};

const inflight = {}; // kaynak başına: aynı anda gelen istekler tek fetch'i paylaşır

async function fetchRates(source) {
  const { label, url, parse } = SOURCES[source];
  let res;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  } catch (e) {
    if (e.name === "TimeoutError") throw new Error(label + " yanıt vermedi (zaman aşımı)");
    throw e;
  }
  if (!res.ok) throw new Error(label + " HTTP " + res.status);
  const data = parse(await res.text());
  if (Object.keys(data.rates).length < 3) throw new Error("Kur verisi boş");
  const fresh = { ...data, source, label, fetchedAt: Date.now() };
  await chrome.storage.local.set({ [CACHE_KEY]: fresh });
  return fresh;
}

// force: önbelleği atla (kullanıcı "kuru güncelle" dedi); başarısızsa eski kuru sessizce verme.
async function getRates(force) {
  const got = await chrome.storage.local.get([CACHE_KEY, "source"]);
  const source = SOURCES[got.source] ? got.source : "tcmb";
  const stored = got[CACHE_KEY] && got[CACHE_KEY].source === source ? got[CACHE_KEY] : null;
  if (!force && stored && Date.now() - stored.fetchedAt < TTL_MS) return stored;
  if (!inflight[source]) inflight[source] = fetchRates(source).finally(() => { delete inflight[source]; });
  try {
    return await inflight[source];
  } catch (e) {
    if (stored && !force) return stored; // internet yoksa eski kuru kullan
    throw e;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getRates") {
    getRates(!!msg.force)
      .then((d) => sendResponse({ ok: true, data: d }))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true; // asenkron cevap
  }
});
