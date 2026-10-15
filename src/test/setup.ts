import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement window.matchMedia at all - harmless for most of the suite
// until ThemeContext (Prompt 48) started calling it unconditionally on every mount
// (system-color-scheme fallback for isDark), which then crashed every test rendering
// anything under <App /> or <ThemeProvider />, not just component-specific tests.
// Defaults to "no preference matches" (prefers light mode) - individual test files can
// still override this per test the same way DashboardLayout.test.tsx already did
// locally before this existed.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
