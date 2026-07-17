import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { getStoredAdvancedMatching } from './lib/advancedMatching.js';
import './styles/index.css';

// ─── Analytics bootstrap (solo si hay IDs en .env) ───────────────────────────
const GTM_ID = import.meta.env.VITE_GTM_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

if (GTM_ID) {
  // GTM head snippet
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);

  // GTM noscript fallback
  const ns = document.createElement('noscript');
  ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(ns, document.body.firstChild);
}

if (PIXEL_ID) {
  // Meta Pixel
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  // Coincidencias avanzadas: si el usuario ya cargó el checkout en esta sesión,
  // el init las lleva (necesario para el Purchase al volver de Mercado Pago).
  const matching = getStoredAdvancedMatching();
  if (matching) window.fbq('init', PIXEL_ID, matching);
  else window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);
