import math

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def luminance(rgb):
    a = [x / 255.0 for x in rgb]
    a = [((x + 0.055) / 1.055) ** 2.4 if x > 0.03928 else x / 12.92 for x in a]
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]

def contrast_ratio(rgb1, rgb2):
    lum1 = luminance(rgb1)
    lum2 = luminance(rgb2)
    brightest = max(lum1, lum2)
    darkest = min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)

def blend_color(fg_rgb, bg_rgb, alpha):
    return tuple(int(fg * alpha + bg * (1 - alpha)) for fg, bg in zip(fg_rgb, bg_rgb))

# Tailwind Colors (Slate, Teal, Rose, Indigo)
colors = {
    'white': '#ffffff',
    'black': '#000000',
    'slate-50': '#f8fafc',
    'slate-100': '#f1f5f9',
    'slate-200': '#e2e8f0',
    'slate-300': '#cbd5e1',
    'slate-400': '#94a3b8',
    'slate-600': '#475569',
    'slate-700': '#334155',
    'slate-800': '#1e293b',
    'slate-900': '#0f172a',
    'teal-100': '#ccfbf1',
    'teal-400': '#2dd4bf',
    'teal-600': '#0d9488',
    'teal-900': '#134e4a',
    'rose-100': '#ffe4e6',
    'rose-400': '#fb7185',
    'rose-600': '#e11d48',
    'rose-900': '#881337',
    'indigo-100': '#e0e7ff',
    'indigo-400': '#818cf8',
    'indigo-600': '#4f46e5',
    'indigo-900': '#312e81',
}

# Define scenarios
scenarios = [
    # Light Mode
    {'mode': 'Light', 'element': 'Page Background', 'bg': 'slate-50', 'fg': 'slate-900', 'text': 'H1 (About QRCraftly)', 'size': 'large'},
    {'mode': 'Light', 'element': 'Page Background', 'bg': 'slate-50', 'fg': 'slate-600', 'text': 'Intro Paragraph', 'size': 'normal'},
    {'mode': 'Light', 'element': 'Card', 'bg': 'white', 'fg': 'slate-900', 'text': 'Card H3', 'size': 'normal'},
    {'mode': 'Light', 'element': 'Card', 'bg': 'white', 'fg': 'slate-600', 'text': 'Card Paragraph', 'size': 'normal'},
    {'mode': 'Light', 'element': 'Icon Teal', 'bg': 'teal-100', 'fg': 'teal-600', 'text': 'Shield Icon', 'size': 'large'}, # Icons are graphic but good to check
    {'mode': 'Light', 'element': 'Icon Rose', 'bg': 'rose-100', 'fg': 'rose-600', 'text': 'Database Icon', 'size': 'large'},
    {'mode': 'Light', 'element': 'Icon Indigo', 'bg': 'indigo-100', 'fg': 'indigo-600', 'text': 'Code Icon', 'size': 'large'},
    {'mode': 'Light', 'element': 'License Section', 'bg': 'slate-50', 'fg': 'slate-900', 'text': 'License H2', 'size': 'large'},
    {'mode': 'Light', 'element': 'License Section', 'bg': 'slate-50', 'fg': 'slate-600', 'text': 'License P', 'size': 'normal'},
    {'mode': 'Light', 'element': 'Button', 'bg': 'slate-900', 'fg': 'white', 'text': 'Github Button', 'size': 'normal'},

    # Dark Mode (Assuming bg-slate-900 for page background which is standard for dark mode if missing)
    {'mode': 'Dark', 'element': 'Page Background', 'bg': 'slate-900', 'fg': 'white', 'text': 'H1 (About QRCraftly)', 'size': 'large'},
    {'mode': 'Dark', 'element': 'Page Background', 'bg': 'slate-900', 'fg': 'slate-300', 'text': 'Intro Paragraph', 'size': 'normal'},
    {'mode': 'Dark', 'element': 'Card', 'bg': 'slate-800', 'fg': 'white', 'text': 'Card H3', 'size': 'normal'},
    {'mode': 'Dark', 'element': 'Card', 'bg': 'slate-800', 'fg': 'slate-400', 'text': 'Card Paragraph', 'size': 'normal'},
    {'mode': 'Dark', 'element': 'Icon Teal', 'bg': ('teal-900', 0.3, 'slate-800'), 'fg': 'teal-400', 'text': 'Shield Icon', 'size': 'large'},
    {'mode': 'Dark', 'element': 'Icon Rose', 'bg': ('rose-900', 0.3, 'slate-800'), 'fg': 'rose-400', 'text': 'Database Icon', 'size': 'large'},
    {'mode': 'Dark', 'element': 'Icon Indigo', 'bg': ('indigo-900', 0.3, 'slate-800'), 'fg': 'indigo-400', 'text': 'Code Icon', 'size': 'large'},
    {'mode': 'Dark', 'element': 'License Section', 'bg': ('slate-800', 0.5, 'slate-900'), 'fg': 'white', 'text': 'License H2', 'size': 'large'},
    {'mode': 'Dark', 'element': 'License Section', 'bg': ('slate-800', 0.5, 'slate-900'), 'fg': 'slate-300', 'text': 'License P', 'size': 'normal'},
    {'mode': 'Dark', 'element': 'Button', 'bg': 'white', 'fg': 'slate-900', 'text': 'Github Button', 'size': 'normal'},
]

print(f"{'Mode':<6} | {'Element':<20} | {'Contrast':<8} | {'Pass?':<6} | {'Level':<5} | {'Details'}")
print("-" * 80)

for s in scenarios:
    # Resolve BG
    if isinstance(s['bg'], tuple):
        # Blend
        overlay_color = s['bg'][0]
        opacity = s['bg'][1]
        base_color_name = s['bg'][2]

        overlay_rgb = hex_to_rgb(colors[overlay_color])
        base_rgb = hex_to_rgb(colors[base_color_name])

        bg_rgb = blend_color(overlay_rgb, base_rgb, opacity)
    else:
        bg_rgb = hex_to_rgb(colors[s['bg']])

    # Resolve FG
    fg_rgb = hex_to_rgb(colors[s['fg']])

    ratio = contrast_ratio(fg_rgb, bg_rgb)

    # Check WCAG
    # Normal Text: AA >= 4.5, AAA >= 7
    # Large Text (18pt or 14pt bold): AA >= 3, AAA >= 4.5
    # Icons/UI: AA >= 3

    min_ratio = 4.5
    if s['size'] == 'large':
        min_ratio = 3.0

    passed = ratio >= min_ratio

    # AAA check
    aaa_ratio = 7.0
    if s['size'] == 'large':
        aaa_ratio = 4.5
    aaa_passed = ratio >= aaa_ratio

    level = "Fail"
    if aaa_passed:
        level = "AAA"
    elif passed:
        level = "AA"

    print(f"{s['mode']:<6} | {s['text']:<20} | {ratio:.2f}:1   | {'YES' if passed else 'NO':<6} | {level:<5} | {s['bg']} vs {s['fg']}")
