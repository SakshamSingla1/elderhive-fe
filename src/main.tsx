import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthenticatedUserProvider } from './contexts/AuthenticatedUserContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Registers public/service-worker.js — see that file's own comment for why this exists
// (the Push API only ever delivers to a registered service worker, and
// navigator.serviceWorker.ready in hooks/useWebPushSubscription.ts never resolves without
// one). Guarded the same way isPushSupported() is: jsdom (tests) and older browsers have no
// navigator.serviceWorker at all.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(() => {
    // Best-effort — a failed registration just means "Enable push notifications" won't
    // work on this device; nothing else in the app depends on it.
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthenticatedUserProvider>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </AuthenticatedUserProvider>
    </BrowserRouter>
  </StrictMode>,
);
