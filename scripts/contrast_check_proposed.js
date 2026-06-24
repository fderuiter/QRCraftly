// Script to check WCAG contrast ratios for proposed UI color changes.

function hexToRgb(hexColor) {
  hexColor = hexColor.replace(/^#/, "");
  if (hexColor.length === 3) {
    hexColor = hexColor
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return [
    parseInt(hexColor.slice(0, 2), 16),
    parseInt(hexColor.slice(2, 4), 16),
    parseInt(hexColor.slice(4, 6), 16),
  ];
}

function luminance(rgb) {
  const a = rgb.map((x) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(rgb1, rgb2) {
  const lum1 = luminance(rgb1);
  const lum2 = luminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const colors = {
  white: "#ffffff",
  black: "#000000",
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "teal-100": "#ccfbf1",
  "teal-400": "#2dd4bf",
  "teal-600": "#0d9488",
  "teal-700": "#0f766e",
  "teal-900": "#134e4a",
  "rose-100": "#ffe4e6",
  "rose-400": "#fb7185",
  "rose-600": "#e11d48",
  "rose-700": "#be123c",
  "rose-900": "#881337",
  "indigo-100": "#e0e7ff",
  "indigo-400": "#818cf8",
  "indigo-600": "#4f46e5",
  "indigo-700": "#4338ca",
  "indigo-900": "#312e81",
};

const scenarios = [
  // Proposed Light Mode Improvements
  {
    mode: "Light",
    element: "Icon Teal (Proposed)",
    bg: "teal-100",
    fg: "teal-700",
    text: "Shield Icon",
    size: "large",
  },
  {
    mode: "Light",
    element: "Icon Rose (Proposed)",
    bg: "rose-100",
    fg: "rose-700",
    text: "Database Icon",
    size: "large",
  },
  {
    mode: "Light",
    element: "Icon Indigo (Existing)",
    bg: "indigo-100",
    fg: "indigo-600",
    text: "Code Icon",
    size: "large",
  }, // Existing is 5.10
];

function runCheck() {
  console.log(
    `${"Mode".padEnd(6)} | ${"Element".padEnd(20)} | ${"Contrast".padEnd(8)} | ${"Pass?".padEnd(6)} | ${"Level".padEnd(5)} | Details`,
  );
  console.log("-".repeat(80));

  let allPassed = true;

  for (const s of scenarios) {
    const bgRgb = hexToRgb(colors[s.bg]);
    const fgRgb = hexToRgb(colors[s.fg]);

    const ratio = contrastRatio(fgRgb, bgRgb);

    let minRatio = 4.5;
    if (s.size === "large") {
      minRatio = 3.0;
    }

    const passed = ratio >= minRatio;
    if (!passed) allPassed = false;

    let aaaRatio = 7.0;
    if (s.size === "large") {
      aaaRatio = 4.5;
    }
    const aaaPassed = ratio >= aaaRatio;

    let level = "Fail";
    if (aaaPassed) {
      level = "AAA";
    } else if (passed) {
      level = "AA";
    }

    console.log(
      `${s.mode.padEnd(6)} | ${s.text.padEnd(20)} | ${ratio.toFixed(2)}:1   | ${(passed ? "YES" : "NO").padEnd(6)} | ${level.padEnd(5)} | ${s.bg} vs ${s.fg}`,
    );
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runCheck();
