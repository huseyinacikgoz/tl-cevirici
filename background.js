// TCMB günlük kurlarını çeker, 1 saat önbelleğe alır.
const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
const CACHE_KEY = "tcmbRates";
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

async function getRates() {
  const stored = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];
  if (stored && Date.now() - stored.fetchedAt < TTL_MS) return stored;
  try {
    const res = await fetch(TCMB_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = parseTcmb(await res.text());
    if (Object.keys(data.rates).length < 3) throw new Error("Kur verisi boş");
    const fresh = { ...data, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [CACHE_KEY]: fresh });
    return fresh;
  } catch (e) {
    if (stored) return stored; // internet yoksa eski kuru kullan
    throw e;
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getRates") {
    getRates()
      .then((d) => sendResponse({ ok: true, data: d }))
      .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
    return true; // asenkron cevap
  }
});
