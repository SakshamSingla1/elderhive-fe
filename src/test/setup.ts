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

// jsdom doesn't implement IntersectionObserver - needed by framer-motion's
// `whileInView` (Landing.page.tsx's scroll-triggered section animations, theme/). A
// no-op stub is enough: tests assert on content, not on animation timing, so elements
// simply render in their initial/whileInView-merged state without ever "entering view".
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  window.IntersectionObserver = MockIntersectionObserver;
  // framer-motion's viewport feature reads the global, not window's, in some code paths.
  (globalThis as typeof globalThis & { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
    MockIntersectionObserver;
}
