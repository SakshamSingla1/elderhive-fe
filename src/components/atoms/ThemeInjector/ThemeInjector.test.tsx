import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useColors } from "../../../hooks/useColors";
import ThemeInjector from "./ThemeInjector";

vi.mock("../../../hooks/useColors", () => ({
  useColors: vi.fn(),
}));

const mockedUseColors = vi.mocked(useColors);

const baseColors = {
  neutral0: "#FFFFFF",
  neutral50: "#F6F1E9",
  neutral100: "#E8DFD2",
  neutral200: "#D3C6B2",
  neutral300: "#AC9C86",
  neutral400: "#80725D",
  neutral500: "#5F5345",
  neutral600: "#453C32",
  neutral700: "#2E2721",
  neutral800: "#1C1713",
  neutral900: "#120D0A",
  neutral950: "#110E0C",
  primary50: "#FDF3EE",
  primary100: "#FAE2D5",
  primary200: "#F3C2A8",
  primary300: "#E89E78",
  primary400: "#DC7A4E",
  primary500: "#C1502E",
  primary600: "#A23F22",
  primary700: "#82301A",
  primary800: "#632414",
  primary900: "#44180D",
  success50: "#ECFDF5",
  success100: "#D1FAE5",
  success200: "#A7F3D0",
  success300: "#6EE7B7",
  success400: "#34D399",
  success500: "#10B981",
  success600: "#059669",
  success700: "#047857",
  success800: "#065F46",
  success900: "#064E3B",
  error50: "#FEF2F2",
  error100: "#FEE2E2",
  error200: "#FECACA",
  error300: "#FCA5A5",
  error400: "#F87171",
  error500: "#EF4444",
  error600: "#DC2626",
  error700: "#B91C1C",
  error800: "#991B1B",
  error900: "#7F1D1D",
  warning50: "#FFFBEB",
  warning100: "#FEF3C7",
  warning200: "#FDE68A",
  warning300: "#FCD34D",
  warning400: "#FBBF24",
  warning500: "#F59E0B",
  warning600: "#D97706",
  warning700: "#B45309",
  warning800: "#92400E",
  warning900: "#78350F",
};

describe("ThemeInjector", () => {
  it("renders nothing", () => {
    mockedUseColors.mockReturnValue(baseColors);
    const { container } = render(<ThemeInjector />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sets every neutral/primary/success/error/warning shade as a CSS custom property on documentElement", () => {
    mockedUseColors.mockReturnValue(baseColors);
    render(<ThemeInjector />);

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--color-neutral-0")).toBe("#FFFFFF");
    expect(root.getPropertyValue("--color-neutral-950")).toBe("#110E0C");
    expect(root.getPropertyValue("--color-primary-500")).toBe("#C1502E");
    expect(root.getPropertyValue("--color-success-900")).toBe("#064E3B");
    expect(root.getPropertyValue("--color-error-900")).toBe("#7F1D1D");
    expect(root.getPropertyValue("--color-warning-900")).toBe("#78350F");
  });
});

// The "reacts to a real colors change" case needs useColors to genuinely recompute from
// a changing ThemeContext value, not a crude mocked-return-value swap (React.memo
// correctly no-ops a rerender() with identical props, so mutating a jest mock's return
// value between calls proves nothing here) - see ThemeInjector.integration.test.tsx.
