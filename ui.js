// Popup ve balonun ortak temaları ve ikonları.
(function (root) {
  const THEMES = {
    beyaz: { scheme: "light", bg: "#ffffff", fg: "#111827", mute: "#6b7280", line: "#d1d5db", acc: "#2563eb", err: "#b91c1c" },
    lacivert: { scheme: "dark", bg: "#111827", fg: "#f9fafb", mute: "#9ca3af", line: "#374151", acc: "#60a5fa", err: "#fca5a5" },
  };
  const NAMES = { auto: "Otomatik", beyaz: "Beyaz", lacivert: "Lacivert" };
  const dark = matchMedia("(prefers-color-scheme: dark)");

  // "auto" (veya bilinmeyen ad) sistem temasına göre beyaz/lacivert olur.
  function css(name) {
    const t = THEMES[name] || THEMES[dark.matches ? "lacivert" : "beyaz"];
    return `color-scheme:${t.scheme};--bg:${t.bg};--fg:${t.fg};--mute:${t.mute};--line:${t.line};--acc:${t.acc};--err:${t.err};`;
  }

  const svg = (body, attrs = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
    `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" ${attrs}>${body}</svg>`;
  const ICONS = {
    refresh: svg('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>'),
    power: svg('<path d="M12 2v10"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>'),
    swap: svg('<path d="M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4"/>'),
    github: `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`,
  };

  const timeOf = (ms) => (ms ? new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");

  root.TLUI = { THEMES, NAMES, css, dark, ICONS, timeOf, REPO_URL: "https://github.com/huseyinacikgoz/tl-cevirici" };
})(self);
