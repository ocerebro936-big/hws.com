const DESIGN_ARCHETYPES: Record<string, {
  bg: string;
  cardBg: string;
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  shadow: string;
}> = {
  luxury: {
    bg: "#0B0C10",
    cardBg: "#14151A",
    primary: "#66FCF1",
    accent: "#45A29E",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    border: "#1F2937",
    fontHeading: "'Playfair Display', serif",
    fontBody: "'Inter', sans-serif",
    borderRadius: "16px",
    shadow: "0 8px 32px rgba(102, 252, 241, 0.08)",
  },
  tech: {
    bg: "#0d1117",
    cardBg: "#161B22",
    primary: "#58a6ff",
    accent: "#79c0ff",
    text: "#F0F6FC",
    textMuted: "#8B949E",
    border: "#21262D",
    fontHeading: "'Inter', sans-serif",
    fontBody: "'Space Grotesk', monospace",
    borderRadius: "12px",
    shadow: "0 4px 24px rgba(88, 166, 255, 0.06)",
  },
  streetwear: {
    bg: "#121212",
    cardBg: "#1A1A1A",
    primary: "#FF0055",
    accent: "#FFFFFF",
    text: "#FFFFFF",
    textMuted: "#A0A0A0",
    border: "#2A2A2A",
    fontHeading: "'Impact', sans-serif",
    fontBody: "'Inter', sans-serif",
    borderRadius: "8px",
    shadow: "0 4px 16px rgba(255, 0, 85, 0.12)",
  },
};

const DEFAULT_ARCHETYPE = DESIGN_ARCHETYPES.tech;

export function getDesignTokens(niche?: string) {
  return DESIGN_ARCHETYPES[niche?.toLowerCase() ?? ""] ?? DEFAULT_ARCHETYPE;
}

export function generateStoreCSS(storeId: string, niche?: string): string {
  const t = getDesignTokens(niche);
  const css = `/* HWS Store Design — ${niche || "default"} archetype */
:root {
  --store-${storeId}-bg: ${t.bg};
  --store-${storeId}-card-bg: ${t.cardBg};
  --store-${storeId}-primary: ${t.primary};
  --store-${storeId}-accent: ${t.accent};
  --store-${storeId}-text: ${t.text};
  --store-${storeId}-text-muted: ${t.textMuted};
  --store-${storeId}-border: ${t.border};
  --store-${storeId}-font-heading: ${t.fontHeading};
  --store-${storeId}-font-body: ${t.fontBody};
  --store-${storeId}-radius: ${t.borderRadius};
  --store-${storeId}-shadow: ${t.shadow};
}
.store-${storeId} {
  background: ${t.bg};
  color: ${t.text};
  font-family: ${t.fontBody};
}
.store-${storeId} h1, .store-${storeId} h2, .store-${storeId} h3 {
  font-family: ${t.fontHeading};
}
.store-${storeId} .card {
  background: ${t.cardBg};
  border: 1px solid ${t.border};
  border-radius: ${t.borderRadius};
  box-shadow: ${t.shadow};
}
.store-${storeId} .btn-primary {
  background: ${t.primary};
  color: ${t.bg};
  border-radius: calc(${t.borderRadius} / 2);
}
.store-${storeId} .btn-accent {
  background: transparent;
  border: 1px solid ${t.accent};
  color: ${t.accent};
}
.store-${storeId} a {
  color: ${t.primary};
}
.store-${storeId} .badge {
  background: color-mix(in srgb, ${t.primary} 15%, transparent);
  color: ${t.primary};
  border: 1px solid color-mix(in srgb, ${t.primary} 25%, transparent);
}`;
  return css;
}

export function buildImagePrompt(
  productName: string,
  category: string,
  niche?: string,
  extra?: string
): string {
  const nicheModifiers: Record<string, string> = {
    luxury: "High-end commercial product photography, cinematic studio lighting, 8K detail, professional color grading, minimalist luxury background, sleek reflections, shallow depth of field, editorial style",
    tech: "Futuristic tech product shot, neon accent lighting, dark studio background, sharp focus, holographic elements, 8K resolution, cyberpunk aesthetic, clean geometric composition",
    streetwear: "Urban street style product photography, dramatic shadows, vibrant color pop, gritty texture, high contrast, fashion editorial lighting, authentic raw aesthetic, 8K detail",
  };
  const base = nicheModifiers[niche?.toLowerCase() ?? ""]
    ?? "Professional e-commerce product photography, well-lit studio, clean background, 8K resolution, commercial quality";

  const prompt = `Product: ${productName} | Category: ${category} | Style: ${base} | Negative: blurry, low quality, distorted text, deformed shapes, cheap look, watermarks, signatures, bad anatomy${extra ? ` | ${extra}` : ""}`;
  return prompt;
}
