// Metinden "tutar + para birimi" ayrıştırır. Hem tarayıcıda hem Node'da çalışır.
(function (root) {
  // Sembol / kısa yazım -> ISO kodu. Uzun olanlar önce denenir.
  const SYMBOLS = [
    ["US$", "USD"], ["CA$", "CAD"], ["C$", "CAD"], ["AU$", "AUD"], ["A$", "AUD"],
    ["$", "USD"], ["€", "EUR"], ["£", "GBP"], ["¥", "JPY"],
  ];
  const WORDS = {
    dolar: "USD", dollar: "USD", dollars: "USD",
    euro: "EUR", avro: "EUR", euros: "EUR",
    sterlin: "GBP", pound: "GBP", pounds: "GBP",
    frank: "CHF", yen: "JPY",
  };
  // Türkçe ek alabilen kelimeler: "100 dolara", "50 dolarlık", "20 euroya".
  // "yen"/"frank" hariç: "5 yeni ürün" JPY sayılmasın.
  // Uzun adlar ("ABD Doları", "Kanada Doları") ek alabilen kök olarak yazılır: "ABD dolarına" da tutar.
  const TR_STEMS = [
    ["abd dolar", "USD"], ["amerikan dolar", "USD"], ["us dollar", "USD"], ["dolar", "USD"],
    ["euro", "EUR"], ["avro", "EUR"],
    ["ingiliz sterlin", "GBP"], ["british pound", "GBP"], ["sterlin", "GBP"],
    ["isviçre frang", "CHF"], ["swiss franc", "CHF"],
    ["japon yen", "JPY"], ["japanese yen", "JPY"],
    ["kanada dolar", "CAD"], ["canadian dollar", "CAD"],
    ["avustralya dolar", "AUD"], ["australian dollar", "AUD"],
    ["isveç kron", "SEK"], ["norveç kron", "NOK"], ["danimarka kron", "DKK"],
    ["suudi arabistan riyal", "SAR"], ["suudi riyal", "SAR"], ["katar riyal", "QAR"],
    ["kuveyt dinar", "KWD"],
    ["rus ruble", "RUB"], ["ruble", "RUB"],
    ["çin yuan", "CNY"], ["yuan", "CNY"],
    ["azerbaycan yeni manat", "AZN"], ["azerbaycan manat", "AZN"], ["manat", "AZN"],
    ["rumen ley", "RON"], ["pakistan rupi", "PKR"],
    ["güney kore won", "KRW"], ["kore won", "KRW"],
    ["birleşik arap emirlikleri dirhem", "AED"], ["bae dirhem", "AED"], ["dirhem", "AED"],
    ["kazakistan tenge", "KZT"], ["tenge", "KZT"],
  ].sort((a, b) => b[0].length - a[0].length);
  // JS'nin /i bayrağı i/İ/ı/I'yı eşlemez ("ABD DOLARI", "İsviçre"); karşılaştırmada hepsini i yap.
  const fold = (s) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ");
  const stemRe = (s) => s.replace(/[iı]/g, "[iıİI]").replace(/ /g, "\\s+");
  // Yalnızca TCMB'nin today.xml'de yayımladığı kodlar (kuru olmayan kod hata balonu verir).
  const CODES = [
    "USD","EUR","GBP","CHF","JPY","CAD","AUD","SEK","NOK","DKK","SAR","KWD",
    "RUB","CNY","AZN","RON","PKR","QAR","KRW","AED","KZT",
  ];

  // Bir sayı dizgisini (1.299,99 / 1,299.99 / 1299.99 / 1.299 ...) float'a çevirir.
  function parseNumber(raw) {
    let s = raw.replace(/\s/g, "");
    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastDot !== -1 && lastComma !== -1) {
      // İkisi de var: sonuncusu ondalık ayırıcı.
      const dec = lastDot > lastComma ? "." : ",";
      const thou = dec === "." ? "," : ".";
      s = s.split(thou).join("").replace(dec, ".");
    } else if (lastDot !== -1 || lastComma !== -1) {
      const sep = lastDot !== -1 ? "." : ",";
      const parts = s.split(sep);
      const last = parts[parts.length - 1];
      if (parts.length > 2) {
        // 1.234.567 -> binlik
        s = parts.join("");
      } else if (last.length === 3 && parts[0].length >= 1 && parts[0].length <= 3 && parts[0] !== "0") {
        // 1.299 / 1,299 -> binlik (fiyatlarda 3 haneli ondalık nadirdir)
        s = parts.join("");
      } else {
        s = parts[0] + "." + last;
      }
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  // Binlik ayırıcı olarak düz boşluk kabul edilmez ("10 100 USD" -> 100 USD); yalnızca
  // Intl'in kullandığı bölünmez boşluk (parseAmount ince boşlukları buna çevirir).
  const NUM = "\\d{1,3}(?:[.,\\u00a0]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d+)?";

  // "$1.5k", "1,5 milyon dolar", "2 bin euro", "$3M"
  const MULTS = {
    k: 1e3, bin: 1e3, thousand: 1e3,
    m: 1e6, mn: 1e6, milyon: 1e6, million: 1e6,
    bn: 1e9, milyar: 1e9, billion: 1e9,
  };
  const MULT = `(?:\\s?(${Object.keys(MULTS).join("|")})(?![A-Za-zÀ-ÿçğıöşü]))?`;

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  const symAlt = SYMBOLS.map(([s]) => escapeRe(s)).join("|");
  const codeAlt = CODES.join("|");
  const wordAlt = Object.keys(WORDS).join("|");
  const curAlt = `${symAlt}|(?<![A-Za-zÀ-ÿ])(?:${codeAlt})(?![A-Za-zÀ-ÿ])|(?<![A-Za-zÀ-ÿ])(?:${TR_STEMS.map(([s]) => stemRe(s)).join("|")})['’]?[a-zçğıöşüİ]*|(?<![A-Za-zÀ-ÿ])(?:${wordAlt})(?![A-Za-zÀ-ÿ])`;

  const RE_PREFIX = new RegExp(`(${curAlt})\\s?(${NUM})${MULT}`, "gi");
  const RE_SUFFIX = new RegExp(`(${NUM})${MULT}\\s?(${curAlt})`, "gi");

  function toCode(token) {
    const t = token.trim();
    for (const [sym, code] of SYMBOLS) if (t === sym) return code;
    const up = t.toUpperCase();
    if (CODES.includes(up)) return up;
    const low = fold(t);
    if (WORDS[low]) return WORDS[low];
    const stem = TR_STEMS.find(([s]) => low.startsWith(fold(s)));
    return stem ? stem[1] : null;
  }

  // Metindeki tüm "tutar + para birimi" eşleşmelerini konumlarıyla döndürür.
  function findAll(text) {
    const out = [];
    for (const [re, curIdx, numIdx, multIdx] of [[RE_PREFIX, 1, 2, 3], [RE_SUFFIX, 3, 1, 2]]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const currency = toCode(m[curIdx]);
        const amount = parseNumber(m[numIdx]);
        if (currency && amount !== null) {
          const mult = m[multIdx] ? MULTS[m[multIdx].toLowerCase()] : 1;
          out.push({ amount: amount * mult, currency, start: m.index, end: m.index + m[0].length });
        }
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // opts.overlap = [başlangıç, bitiş]: yalnızca bu aralıkla kesişen eşleşmeyi kabul et.
  // Dönüş: { amount, currency } veya null
  function parseAmount(text, opts) {
    if (!text) return null;
    text = text.replace(/[\u202f\u2009]/g, "\u00a0"); // uzunluk de\u011fi\u015fmez, overlap konumlar\u0131 korunur
    if (!(opts && opts.overlap) && text.trim().length > 80) return null;
    let found = findAll(text);
    if (opts && opts.overlap) {
      const [a, b] = opts.overlap;
      found = found.filter((f) => f.start < b && f.end > a);
    }
    return found.length ? { amount: found[0].amount, currency: found[0].currency } : null;
  }

  const api = { parseAmount, parseNumber };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TLParser = api;
})(typeof self !== "undefined" ? self : this);
