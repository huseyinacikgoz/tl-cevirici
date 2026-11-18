// Seçim / çift tık / kopyalama olunca TL karşılığını küçük bir balonda gösterir.
(function () {
  const CACHE_KEY = "rates"; // background.js ile aynı anahtar ve süre
  const TTL_MS = 60 * 60 * 1000;
  const SPINNER_DELAY_MS = 150; // kur bundan hızlı gelirse yükleme animasyonu hiç görünmez

  let host = null; // balonun Shadow DOM kök elemanı
  let seq = 0; // kur beklenirken balon kapatıldıysa geç gelen cevabı yok saymak için
  let cached = null; // son alınan kur; her seçimde servis çalışanını uyandırmamak için
  let enabled = true;
  let theme = "auto";
  let source = "tcmb";

  try {
    chrome.storage.local.get(["enabled", "theme", "source"]).then((r) => {
      enabled = r.enabled !== false;
      theme = r.theme || "auto";
      source = r.source || "tcmb";
    }, () => {});
    chrome.storage.onChanged.addListener((c, area) => {
      if (area !== "local") return;
      if (c.enabled) enabled = c.enabled.newValue !== false;
      if (c.theme) theme = c.theme.newValue || "auto";
      if (c.source) source = c.source.newValue || "tcmb";
    });
  } catch (_) {}

  function clearTip() {
    if (host) { host.remove(); host = null; }
  }

  function removeTip() {
    seq++;
    clearTip();
  }

  const fmtTL = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
  const fmtRate = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const fmtAmount = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

  const isFresh = (d) => d && d.source === source && Date.now() - d.fetchedAt < TTL_MS;

  // Eklenti yeniden yüklenince/güncellenince bu sekmedeki eski betiğin bağlantısı kopar: ayar
  // değişikliklerini artık duyamaz. Eski ayarla balon göstermek yerine sayfayı yenilemesini söyle.
  const orphaned = () => { try { return !chrome.runtime || !chrome.runtime.id; } catch (_) { return true; } };

  async function getRates(force) {
    const stale = { ok: false, error: "Eklenti güncellendi, sayfayı yenile (F5)." };
    if (orphaned()) return stale;
    if (!force) {
      if (isFresh(cached)) return { ok: true, data: cached };
      try {
        const s = (await chrome.storage.local.get(CACHE_KEY))[CACHE_KEY];
        if (isFresh(s)) { cached = s; return { ok: true, data: s }; }
      } catch (_) {}
    }
    const res = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "getRates", force }, (r) => {
          if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
          resolve(r);
        });
      } catch (_) { resolve(stale); }
    });
    if (res && res.ok) cached = res.data;
    return res;
  }

  // actions: { refresh, off } verilirse balonun altında düğme çubuğu çıkar.
  function showTip(rect, html, actions) {
    clearTip();
    host = document.createElement("div");
    host.style.cssText = "all:initial;position:absolute;z-index:2147483647;";
    const shadow = host.attachShadow({ mode: "closed" });
    const bar = actions
      ? `<div class="bar">
           <button type="button" data-act="refresh" title="Kuru güncelle" aria-label="Kuru güncelle">${TLUI.ICONS.refresh}</button>
           <button type="button" data-act="off" title="Balonu kapat" aria-label="Balonu kapat">${TLUI.ICONS.power}</button>
           <a href="${TLUI.REPO_URL}" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub">${TLUI.ICONS.github}</a>
         </div>`
      : "";
    shadow.innerHTML = `
      <style>
        .tip{${TLUI.css(theme)}font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
             background:var(--bg);color:var(--fg);padding:8px 12px;border-radius:8px;border:1px solid var(--line);
             box-shadow:0 4px 16px rgba(0,0,0,.35);width:max-content;max-width:300px}
        .big{font-weight:600;font-size:15px}
        .sub{color:var(--mute);font-size:11.5px;margin-top:2px}
        .err{color:var(--err)}
        .bar{display:flex;gap:4px;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid var(--line)}
        .bar button,.bar a{all:unset;cursor:pointer;display:inline-flex;color:var(--mute);padding:4px;border-radius:4px}
        .bar svg{width:14px;height:14px}
        .bar a{margin-left:auto}
        .bar button:hover,.bar a:hover{background:var(--line);color:var(--fg)}
        .bar button:focus-visible,.bar a:focus-visible{outline:2px solid var(--acc)}
        .spin{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px;
              border:2px solid var(--line);border-top-color:var(--fg);border-radius:50%;animation:r .7s linear infinite}
        @keyframes r{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.spin{animation-duration:2s}}
      </style>
      <div class="tip">${html}${bar}</div>`;
    if (actions) {
      shadow.querySelector('[data-act="refresh"]').addEventListener("click", actions.refresh);
      shadow.querySelector('[data-act="off"]').addEventListener("click", actions.off);
    }
    const top = window.scrollY + rect.bottom + 8;
    const left = window.scrollX + Math.max(8, Math.min(rect.left, window.innerWidth - 340));
    host.style.top = top + "px";
    host.style.left = left + "px";
    document.documentElement.appendChild(host);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Seçim tek başına tutar+birim içermiyorsa (örn. çift tık sadece "1,100" seçti),
  // seçimin çevresindeki metne bakar; yalnızca seçimle kesişen eşleşmeyi kabul eder.
  function parseWithContext(text) {
    if (text.trim().length > 80) return null; // uzun seçim tutar değildir; büyük metni tarama
    const direct = window.TLParser.parseAmount(text);
    if (direct) return direct;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    const node = r.startContainer;
    if (node !== r.endContainer || node.nodeType !== Node.TEXT_NODE) return null;
    const data = node.data;
    const from = Math.max(0, r.startOffset - 20);
    const to = Math.min(data.length, r.endOffset + 20);
    return window.TLParser.parseAmount(data.slice(from, to), {
      overlap: [r.startOffset - from, r.endOffset - from],
    });
  }

  function turnOff(rect) {
    try { chrome.storage.local.set({ enabled: false }); } catch (_) {}
    enabled = false;
    showTip(rect, "Balon kapatıldı. Açmak için araç çubuğundaki TL Çevirici simgesine tıkla.");
    const id = ++seq;
    setTimeout(() => { if (id === seq) removeTip(); }, 3000);
  }

  async function convert(parsed, rect, force) {
    const id = ++seq;
    const timer = setTimeout(() => {
      if (id === seq) showTip(rect, `<span class="spin" aria-hidden="true"></span>Kur alınıyor…`);
    }, force ? 0 : SPINNER_DELAY_MS);
    const res = await getRates(force);
    clearTimeout(timer);
    if (id !== seq) return;
    const actions = { refresh: () => convert(parsed, rect, true), off: () => turnOff(rect) };
    if (!res || !res.ok) {
      showTip(rect, `<span class="err">Kur alınamadı: ${escapeHtml((res && res.error) || "bilinmeyen hata")}</span>`, actions);
      return;
    }
    const rate = res.data.rates[parsed.currency];
    if (!rate) {
      showTip(rect, `<span class="err">${escapeHtml(res.data.label || "")} ${escapeHtml(parsed.currency)} kuru yayımlamıyor.</span>`, actions);
      return;
    }
    const tl = parsed.amount * rate;
    showTip(
      rect,
      `<div class="big">${fmtAmount.format(parsed.amount)} ${parsed.currency} ≈ ${fmtTL.format(tl)}</div>` +
        `<div class="sub">1 ${parsed.currency} = ${fmtRate.format(rate)} ₺ · ${escapeHtml(res.data.label || "")} ${escapeHtml(res.data.date || "")} · ${TLUI.timeOf(res.data.fetchedAt)}</div>`,
      actions
    );
  }

  function currentSelection() {
    // getSelection() input/textarea içindeki seçimi görmez; şifre alanlarına dokunma.
    const el = document.activeElement;
    if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type !== "password"))) {
      let a = null, b = null;
      try { a = el.selectionStart; b = el.selectionEnd; } catch (_) {}
      if (a !== null && b > a) return { text: el.value.slice(a, b), rect: el.getBoundingClientRect() };
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const text = sel.toString();
    if (!text.trim()) return null;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    return { text, rect };
  }

  function run() {
    if (!enabled) return;
    const s = currentSelection();
    const parsed = s && parseWithContext(s.text);
    if (parsed) convert(parsed, s.rect, false); else removeTip();
  }

  // Fare bırakılınca (seçim) ve çift tıklayınca; seçimin oturması için kısa gecikme.
  document.addEventListener("mouseup", (e) => {
    if (host && e.composedPath().includes(host)) return;
    setTimeout(run, 10);
  });
  document.addEventListener("dblclick", (e) => {
    if (host && e.composedPath().includes(host)) return;
    setTimeout(run, 10);
  });
  // Kopyalama: Ctrl+C anında seçili metni dönüştür.
  document.addEventListener("copy", () => setTimeout(run, 0));
  // Klavye ile seçim (Shift+oklar) için
  document.addEventListener("keyup", (e) => {
    if (e.key === "Escape") removeTip();
    else if (e.shiftKey) run();
  });
  // Başka yere tıklayınca / kaydırınca kapat
  document.addEventListener("mousedown", (e) => {
    if (host && !e.composedPath().includes(host)) removeTip();
  });
  window.addEventListener("scroll", () => removeTip(), { passive: true });
})();
