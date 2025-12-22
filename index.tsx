import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// PERMANENT FIX: Sanitize URL before app mount.
// This catches stray UUID paths (from Supabase/Stripe redirects) that cause "No routes matched" errors.
const path = window.location.pathname;
// Regex matches a standard UUID (8-4-4-4-12 hex characters) at the start of the path
if (path.length > 1 && /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(path)) {
  console.log('Sanitizing stray redirect path:', path);
  window.history.replaceState(null, '', '/');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);