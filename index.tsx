import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mount = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

// Service Worker Logic
setTimeout(async () => {
  if ('serviceWorker' in navigator) {
    try {
      if (document.readyState !== 'complete') {
        await new Promise((resolve) => {
          window.addEventListener('load', resolve, { once: true });
        });
      }

      // Unregister old SWs to prevent stale cache issues
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations) {
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
      } catch (e) {
        console.debug('SW cleanup skipped');
      }

      // Register new SW
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        console.debug('SW registration skipped');
      }
    } catch (e) {
      console.debug('SW setup skipped');
    }
  }
}, 2000);