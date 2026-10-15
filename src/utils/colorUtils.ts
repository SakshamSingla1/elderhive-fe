// Ported straight from Portfolio (portfolio-fe): hexToHsl from contexts/ThemeContext.tsx,
// isColorLight from components/atoms/ColorPicker/ColorPicker.tsx — both pure color-math
// functions, no Portfolio-specific dependencies to strip out.

// Converts a 3- or 6-digit hex color ("#fff" or "#ffffff") to an "H S% L%" triple, the
// exact string shape CSS custom properties like `hsl(var(--primary-500))` expect.
export function hexToHsl(hex: string): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Quick perceptual-brightness check (YIQ-style weighting) used to pick a readable text
// color (dark vs. light) on top of an arbitrary background color — ColorPicker's live
// preview block and swatch checkmarks both rely on this, not the full WCAG contrast
// formula (that one lives on the backend, see ColorThemeSeeder's seeding verification).
export function isColorLight(color: string): boolean {
  const hex = color.replace("#", "");
  const [r, g, b] = hex.match(/.{2}/g)?.map((x) => parseInt(x, 16)) ?? [0, 0, 0];
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}
