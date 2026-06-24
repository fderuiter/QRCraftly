// Script to check WCAG contrast ratios for various UI elements in QRCraftly.

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

function blendColor(fgRgb, bgRgb, alpha) {
  return fgRgb.map((fg, i) => Math.round(fg * alpha + bgRgb[i] * (1 - alpha)));
}

import fs from "fs";

const colorsJson = JSON.parse(
  fs.readFileSync(new URL("../src/colors.json", import.meta.url), "utf-8"),
);
const colors = colorsJson.ui;
const presets = colorsJson.presets;

const scenarios = [
  // Light Mode
  {
    mode: "Light",
    element: "Page Background",
    bg: "slate-50",
    fg: "slate-900",
    text: "H1 (About QRCraftly)",
    size: "large",
  },
  {
    mode: "Light",
    element: "Page Background",
    bg: "slate-50",
    fg: "slate-600",
    text: "Intro Paragraph",
    size: "normal",
  },
  {
    mode: "Light",
    element: "Card",
    bg: "white",
    fg: "slate-900",
    text: "Card H3",
    size: "normal",
  },
  {
    mode: "Light",
    element: "Card",
    bg: "white",
    fg: "slate-600",
    text: "Card Paragraph",
    size: "normal",
  },
  {
    mode: "Light",
    element: "Icon Teal",
    bg: "teal-100",
    fg: "teal-700",
    text: "Shield Icon",
    size: "large",
  },
  {
    mode: "Light",
    element: "Icon Rose",
    bg: "rose-100",
    fg: "rose-700",
    text: "Database Icon",
    size: "large",
  },
  {
    mode: "Light",
    element: "Icon Indigo",
    bg: "indigo-100",
    fg: "indigo-700",
    text: "Code Icon",
    size: "large",
  },
  {
    mode: "Light",
    element: "License Section",
    bg: "slate-50",
    fg: "slate-900",
    text: "License H2",
    size: "large",
  },
  {
    mode: "Light",
    element: "License Section",
    bg: "slate-50",
    fg: "slate-600",
    text: "License P",
    size: "normal",
  },
  {
    mode: "Light",
    element: "Button",
    bg: "slate-900",
    fg: "white",
    text: "Github Button",
    size: "normal",
  },

  // Dark Mode
  {
    mode: "Dark",
    element: "Page Background",
    bg: "slate-900",
    fg: "white",
    text: "H1 (About QRCraftly)",
    size: "large",
  },
  {
    mode: "Dark",
    element: "Page Background",
    bg: "slate-900",
    fg: "slate-300",
    text: "Intro Paragraph",
    size: "normal",
  },
  {
    mode: "Dark",
    element: "Card",
    bg: "slate-800",
    fg: "white",
    text: "Card H3",
    size: "normal",
  },
  {
    mode: "Dark",
    element: "Card",
    bg: "slate-800",
    fg: "slate-400",
    text: "Card Paragraph",
    size: "normal",
  },
  {
    mode: "Dark",
    element: "Icon Teal",
    bg: ["teal-900", 0.3, "slate-800"],
    fg: "teal-400",
    text: "Shield Icon",
    size: "large",
  },
  {
    mode: "Dark",
    element: "Icon Rose",
    bg: ["rose-900", 0.3, "slate-800"],
    fg: "rose-400",
    text: "Database Icon",
    size: "large",
  },
  {
    mode: "Dark",
    element: "Icon Indigo",
    bg: ["indigo-900", 0.3, "slate-800"],
    fg: "indigo-400",
    text: "Code Icon",
    size: "large",
  },
  {
    mode: "Dark",
    element: "License Section",
    bg: ["slate-800", 0.5, "slate-900"],
    fg: "white",
    text: "License H2",
    size: "large",
  },
  {
    mode: "Dark",
    element: "License Section",
    bg: ["slate-800", 0.5, "slate-900"],
    fg: "slate-300",
    text: "License P",
    size: "normal",
  },
  {
    mode: "Dark",
    element: "Button",
    bg: "white",
    fg: "slate-900",
    text: "Github Button",
    size: "normal",
  },
];

function runCheck() {
  console.log(
    `${"Mode".padEnd(6)} | ${"Element".padEnd(20)} | ${"Contrast".padEnd(8)} | ${"Pass?".padEnd(6)} | ${"Level".padEnd(5)} | Details`,
  );
  console.log("-".repeat(80));

  let allPassed = true;

  for (const s of scenarios) {
    let bgRgb;
    if (Array.isArray(s.bg)) {
      const overlayColor = s.bg[0];
      const opacity = s.bg[1];
      const baseColorName = s.bg[2];

      const overlayRgb = hexToRgb(colors[overlayColor]);
      const baseRgb = hexToRgb(colors[baseColorName]);

      bgRgb = blendColor(overlayRgb, baseRgb, opacity);
    } else {
      bgRgb = hexToRgb(colors[s.bg]);
    }

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

    const bgName = Array.isArray(s.bg) ? `[${s.bg.join(", ")}]` : s.bg;
    console.log(
      `${s.mode.padEnd(6)} | ${s.text.padEnd(20)} | ${ratio.toFixed(2)}:1   | ${(passed ? "YES" : "NO").padEnd(6)} | ${level.padEnd(5)} | ${bgName} vs ${s.fg}`,
    );
  }

  console.log("\nChecking Presets:");
  console.log(
    `${"Preset".padEnd(12)} | ${"Element".padEnd(8)} | ${"Contrast".padEnd(8)} | ${"Pass?".padEnd(6)} | Details`,
  );
  console.log("-".repeat(60));

  for (const p of presets) {
    const bgRgb = hexToRgb(p.bg);
    const fgRgb = hexToRgb(p.fg);
    const eyeRgb = hexToRgb(p.eye);

    const fgRatio = contrastRatio(fgRgb, bgRgb);
    const eyeRatio = contrastRatio(eyeRgb, bgRgb);

    const minRatio = 3.0; // Graphic elements generally require 3.0:1

    const fgPassed = fgRatio >= minRatio;
    const eyePassed = eyeRatio >= minRatio;

    if (!fgPassed || !eyePassed) allPassed = false;

    console.log(
      `${p.label.padEnd(12)} | ${"FG vs BG".padEnd(8)} | ${fgRatio.toFixed(2)}:1   | ${(fgPassed ? "YES" : "NO").padEnd(6)} | ${p.bg} vs ${p.fg}`,
    );
    console.log(
      `${p.label.padEnd(12)} | ${"Eye vs BG".padEnd(8)} | ${eyeRatio.toFixed(2)}:1   | ${(eyePassed ? "YES" : "NO").padEnd(6)} | ${p.bg} vs ${p.eye}`,
    );
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runCheck();
