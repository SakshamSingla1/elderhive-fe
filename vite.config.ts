/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // sockjs-client (WebSocketContext.tsx's realtime notification transport) references
  // Node's `global` at module-load time - Vite doesn't polyfill that for the browser on
  // its own (unlike webpack), so without this every authenticated page load throws
  // "ReferenceError: global is not defined" the moment WebSocketProvider's effect
  // instantiates `new SockJS(...)`. globalThis is the standard browser-safe stand-in.
  // Both entries are required: the top-level `define` only rewrites our own source during
  // transform/build, while sockjs-client is pre-bundled by esbuild in dev (node_modules/.vite/deps)
  // which reads `optimizeDeps.esbuildOptions.define` instead - without it the dev pre-bundle
  // still ships the raw `global` reference even though app code looks fixed.
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Split third-party vendor code out of the main entry chunk, mirroring
        // ElderSphere's approach — these libraries change far less often than app code,
        // so a normal app-code deploy doesn't invalidate the (larger, better-cached)
        // vendor chunks for returning users. Grow this list as later phases add
        // axios/dayjs (vendor-data), @stomp/stompjs + sockjs-client (vendor-realtime), etc.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': [
            '@mui/material',
            '@emotion/react',
            '@emotion/styled',
          ],
          // Icons are sourced from react-icons exclusively (never @mui/icons-material or
          // any other icon package) — see src/hooks/useSidebarNavItems.ts and the
          // Authentication pages for the convention.
          'vendor-icons': ['react-icons'],
          // Split out separately from vendor-mui — @mui/x-date-pickers alone is large
          // enough to push that chunk well past a reasonable single-chunk size.
          'vendor-datepickers': ['@mui/x-date-pickers'],
          'vendor-motion': ['framer-motion'],
          'vendor-forms': ['formik', 'yup'],
          'vendor-realtime': ['@stomp/stompjs', 'sockjs-client'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
