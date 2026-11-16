// Seçim / çift tık / kopyalama olunca TL karşılığını küçük bir balonda gösterir.
(function () {
  let host = null; // balonun Shadow DOM kök elemanı
  let seq = 0; // kur beklenirken balon kapatıldıysa geç gelen cevabı yok saymak için

  function removeTip() {
    seq++;
    if (host) { host.remove(); host = null; }
  }

  const fmtTL = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
  const fmtRate = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const fmtAmount = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

  function getRates() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "getRates" }, (r) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(r);
        });
      } catch (_) { resolve(null); } // eklenti yenilendiyse bağlam geçersiz olabilir
    });
  }

  function showTip(rect, html) {
    removeTip();
    host = document.createElement("div");
    host.style.cssText = "all:initial;position:absolute;z-index:2147483647;";
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        .tip{font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
             background:#111827;color:#f9fafb;padding:8px 12px;border-radius:8px;
             box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:320px;white-space:nowrap}
        .big{font-weight:600;font-size:15px}
        .sub{opacity:.65;font-size:11.5px;margin-top:2px}
        .err{color:#fca5a5}
      </style>
      <div class="tip">${html}</div>`;
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

  async function handle(text, rect) {
    const parsed = parseWithContext(text);
    if (!parsed) { removeTip(); return; }
    const id = ++seq;
    const res = await getRates();
    if (id !== seq) return;
    if (!res || !res.ok) {
      showTip(rect, `<span class="err">Kur alınamadı (TCMB). İnternetini kontrol et.</span>`);
      return;
    }
    const rate = res.data.rates[parsed.currency];
    if (!rate) {
      showTip(rect, `<span class="err">${escapeHtml(parsed.currency)} için kur bulunamadı.</span>`);
      return;
    }
    const tl = parsed.amount * rate;
    showTip(
      rect,
      `<div class="big">${fmtAmount.format(parsed.amount)} ${parsed.currency} ≈ ${fmtTL.format(tl)}</div>` +
        `<div class="sub">1 ${parsed.currency} = ${fmtRate.format(rate)} ₺ · TCMB ${escapeHtml(res.data.date || "")}</div>`
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
    const s = currentSelection();
    if (s) handle(s.text, s.rect); else removeTip();
  }

  // Fare bırakılınca (seçim) ve çift tıklayınca; seçimin oturması için kısa gecikme.
  document.addEventListener("mouseup", (e) => {
    if (host && e.composedPath().includes(host)) return;
    setTimeout(run, 10);
  });
  document.addEventListener("dblclick", () => setTimeout(run, 10));
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
