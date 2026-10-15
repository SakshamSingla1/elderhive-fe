import type { ColorPalette } from "../services/useColorThemeService";

// Mirrors the exact palette com.elderhive.seed.ColorThemeSeeder (Prompt 45) seeds as
// "ElderHive Classic" — 4 colorGroups (primary/secondary/accent/neutral), 10 colorShades
// each, suffixed 50-900 Tailwind-style. Used as the blank-form starting point for a new
// theme in the admin Theme Builder (Prompt 49) so an admin building a brand-new theme
// starts from ElderHive's own warm, WCAG-AA-checked palette rather than an empty one or
// Portfolio's cool gold-and-grey DEFAULT_PALETTE. If the seeder's hex values ever change,
// update this to match — the two are independent copies (FE starting point vs. BE seed
// data), not read from a single shared source.
export const DEFAULT_PALETTE: ColorPalette = {
  colorGroups: [
    {
      groupName: "primary",
      colorShades: [
        { colorName: "primary50", colorCode: "#FDF3EE" },
        { colorName: "primary100", colorCode: "#FAE2D5" },
        { colorName: "primary200", colorCode: "#F3C2A8" },
        { colorName: "primary300", colorCode: "#E89E78" },
        { colorName: "primary400", colorCode: "#DC7A4E" },
        { colorName: "primary500", colorCode: "#C1502E" },
        { colorName: "primary600", colorCode: "#A23F22" },
        { colorName: "primary700", colorCode: "#82301A" },
        { colorName: "primary800", colorCode: "#632414" },
        { colorName: "primary900", colorCode: "#44180D" },
      ],
    },
    {
      groupName: "secondary",
      colorShades: [
        { colorName: "secondary50", colorCode: "#F6EEE7" },
        { colorName: "secondary100", colorCode: "#E8D4C2" },
        { colorName: "secondary200", colorCode: "#CFAE8B" },
        { colorName: "secondary300", colorCode: "#B2875F" },
        { colorName: "secondary400", colorCode: "#946A45" },
        { colorName: "secondary500", colorCode: "#6B4226" },
        { colorName: "secondary600", colorCode: "#58351D" },
        { colorName: "secondary700", colorCode: "#452917" },
        { colorName: "secondary800", colorCode: "#331D10" },
        { colorName: "secondary900", colorCode: "#21120A" },
      ],
    },
    {
      groupName: "accent",
      colorShades: [
        { colorName: "accent50", colorCode: "#FDF6E3" },
        { colorName: "accent100", colorCode: "#FBE8B8" },
        { colorName: "accent200", colorCode: "#F6D27E" },
        { colorName: "accent300", colorCode: "#F0BB48" },
        { colorName: "accent400", colorCode: "#E9A52C" },
        { colorName: "accent500", colorCode: "#C9820F" },
        { colorName: "accent600", colorCode: "#A6690C" },
        { colorName: "accent700", colorCode: "#82510A" },
        { colorName: "accent800", colorCode: "#5F3A07" },
        { colorName: "accent900", colorCode: "#3D2404" },
      ],
    },
    {
      groupName: "neutral",
      colorShades: [
        { colorName: "neutral50", colorCode: "#FFFDF9" },
        { colorName: "neutral100", colorCode: "#F6F1E9" },
        { colorName: "neutral200", colorCode: "#E8DFD2" },
        { colorName: "neutral300", colorCode: "#D3C6B2" },
        { colorName: "neutral400", colorCode: "#AC9C86" },
        { colorName: "neutral500", colorCode: "#80725D" },
        { colorName: "neutral600", colorCode: "#5F5345" },
        { colorName: "neutral700", colorCode: "#453C32" },
        { colorName: "neutral800", colorCode: "#2E2721" },
        { colorName: "neutral900", colorCode: "#1C1713" },
      ],
    },
  ],
};
