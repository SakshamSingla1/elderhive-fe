/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
