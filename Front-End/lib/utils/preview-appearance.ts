export type PreviewColors = {
  cardBg?: string;
  cardBorder?: string;
  selectedTier?: string;
  badgeBg?: string;
  badgeText?: string;
  savings?: string;
  titleColor?: string;
};

const FALLBACK: Required<PreviewColors> = {
  cardBg: "#ffffff",
  cardBorder: "#e2e8f0",
  selectedTier: "#f0fdf4",
  badgeBg: "#004d5b",
  badgeText: "#ffffff",
  savings: "#15803d",
  titleColor: "#0f172a",
};

function hexLuminance(hex: string): number | null {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastTextOn(bg?: string): string {
  const lum = bg ? hexLuminance(bg) : null;
  if (lum == null) return FALLBACK.titleColor;
  return lum > 0.45 ? "#0f172a" : "#f8fafc";
}

export function mutedTextOn(bg?: string): string {
  const lum = bg ? hexLuminance(bg) : null;
  if (lum == null) return "#64748b";
  return lum > 0.45 ? "#475569" : "#cbd5e1";
}

export function resolvePreviewColors(colors?: PreviewColors | null) {
  const cardBg = colors?.cardBg || FALLBACK.cardBg;
  const titleColor = colors?.titleColor || contrastTextOn(cardBg);
  return {
    cardBg,
    cardBorder: colors?.cardBorder || FALLBACK.cardBorder,
    selectedTier: colors?.selectedTier || FALLBACK.selectedTier,
    badgeBg: colors?.badgeBg || FALLBACK.badgeBg,
    badgeText: colors?.badgeText || FALLBACK.badgeText,
    savings: colors?.savings || FALLBACK.savings,
    titleColor,
    bodyText: contrastTextOn(cardBg),
    mutedText: mutedTextOn(cardBg),
  };
}

export function previewCardStyle(
  colors?: PreviewColors | null,
  radius = 12,
): {
  borderRadius: string;
  backgroundColor: string;
  border: string;
  color: string;
} {
  const resolved = resolvePreviewColors(colors);
  return {
    borderRadius: `${radius}px`,
    backgroundColor: resolved.cardBg,
    border: `1px solid ${resolved.cardBorder}`,
    color: resolved.bodyText,
  };
}
