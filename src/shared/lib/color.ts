/**
 * Small colour helpers used by the theme contrast test (and later by the
 * canvas particle layer, which reads CSS variables only once per theme).
 *
 * Formulas follow the CSS Color 4 OKLCH -> sRGB conversion and WCAG 2.x
 * relative-luminance definition.
 */

export type Oklch = {
  l: number;
  c: number;
  h: number;
  alpha: number;
};

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

const OKLCH_PATTERN =
  /oklch\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)(?:\s*\/\s*([+-]?\d*\.?\d+))?\s*\)/i;

export function parseOklch(value: string): Oklch | null {
  const match = OKLCH_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, l, c, h, alpha] = match;
  if (l === undefined || c === undefined || h === undefined) return null;

  return {
    l: Number(l),
    c: Number(c),
    h: Number(h),
    alpha: alpha === undefined ? 1 : Number(alpha),
  };
}

function oklabToLinearSrgb(l: number, a: number, b: number): Rgb {
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  };
}

function linearToSrgb(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

export function oklchToRgb(color: Oklch): Rgb {
  const hue = (color.h * Math.PI) / 180;
  const linear = oklabToLinearSrgb(color.l, color.c * Math.cos(hue), color.c * Math.sin(hue));

  return {
    r: linearToSrgb(linear.r),
    g: linearToSrgb(linear.g),
    b: linearToSrgb(linear.b),
  };
}

/** WCAG relative luminance, 0..1. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastRatioOklch(a: Oklch, b: Oklch): number {
  return contrastRatio(oklchToRgb(a), oklchToRgb(b));
}
