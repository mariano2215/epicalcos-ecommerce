import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import WelcomePopup from './components/WelcomePopup.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import Home from './routes/Home.jsx'; // Home eager (LCP)
import { isSectionHidden } from './config/site.js';
import { LANDING_SLUGS } from './config/landings.js';

// Resto lazy: bajan el initial bundle
const Categorias = lazy(() => import('./routes/Categorias.jsx'));
const Category = lazy(() => import('./routes/Category.jsx'));
const Producto = lazy(() => import('./routes/Producto.jsx'));
const Personalizados = lazy(() => import('./routes/Personalizados.jsx'));
const ArmaTuPack = lazy(() => import('./routes/ArmaTuPack.jsx'));
const LandingUso = lazy(() => import('./routes/LandingUso.jsx'));
const Mayorista = lazy(() => import('./routes/Mayorista.jsx'));
const Negocio = lazy(() => import('./routes/Negocio.jsx'));
const Imprimibles = lazy(() => import('./routes/Imprimibles.jsx'));
const Tatuajes = lazy(() => import('./routes/Tatuajes.jsx'));
const Polaroid = lazy(() => import('./routes/Polaroid.jsx'));
const Cart = lazy(() => import('./routes/Cart.jsx'));
const Checkout = lazy(() => import('./routes/Checkout.jsx'));
const PaymentSuccess = lazy(() => import('./routes/PaymentSuccess.jsx'));
const PaymentTransfer = lazy(() => import('./routes/PaymentTransfer.jsx'));
const PaymentPending = lazy(() => import('./routes/PaymentPending.jsx'));
const PaymentError = lazy(() => import('./routes/PaymentError.jsx'));
const Contact = lazy(() => import('./routes/Contact.jsx'));
const Envios = lazy(() => import('./routes/legal/Envios.jsx'));
const Cambios = lazy(() => import('./routes/legal/Cambios.jsx'));
const Privacidad = lazy(() => import('./routes/legal/Privacidad.jsx'));
const Terminos = lazy(() => import('./routes/legal/Terminos.jsx'));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-white/40 text-sm">
      Cargando…
    </div>
  );
}

/**
 * Scrollea a la sección del hash (ej. /#faq). Reintenta unos frames por si el
 * destino todavía no montó al venir de otra página.
 */
function ScrollToHash() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    let tries = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (tries++ < 12) setTimeout(tryScroll, 60);
    };
    tryScroll();
  }, [hash, pathname]);
  return null;
}

/**
 * Fade corto entre páginas (spec 024).
 *
 * ⚠️ POR QUÉ NO ES UN `<div key={pathname}>`, que sería lo obvio: keyear el
 * contenedor obliga a React a DESMONTAR y volver a montar el árbol entero de la
 * ruta en cada navegación. Entre dos categorías eso tira el estado del
 * componente y vuelve a correr todos sus efectos —incluida la carga del
 * catálogo— para conseguir un fade de 180 ms. Acá se reinicia la animación del
 * contenedor a mano y los hijos ni se enteran: el `void offsetWidth` fuerza el
 * reflow que el navegador necesita para volver a arrancar un `animation` que ya
 * corrió (sin eso, quitar y poner la clase en el mismo tick no hace nada).
 *
 * ⚠️⚠️ ESTE FADE ES **SOLO OPACIDAD**, Y NO SE PUEDE CONVERTIR EN UN
 * DESLIZAMIENTO. Adentro de las rutas hay barras `position: fixed` que son CTA
 * de compra: `StickyMobileBar` (ficha de producto, /tatuajes, /polaroid) y la
 * barra mobile de `ResumenPedido` (/personalizados).
 *
 * Un elemento con `transform` o `filter` se convierte en el bloque contenedor de
 * sus descendientes `position: fixed` — `opacity` NO. La diferencia está medida
 * sobre esta misma app (Chromium, ficha de producto a 375 px, barra anclada a
 * `bottom: 0` con el viewport en 812 px):
 *
 *     sin nada                    → la barra queda en bottom 812 px ✅
 *     opacity: 0.5                → la barra queda en bottom 812 px ✅
 *     transform: translateY(10px) → la barra se va a bottom 2972 px ❌
 *     filter: blur(1px)           → la barra se va a bottom 2962 px ❌
 *
 * O sea: agregarle un `translateY` de 20 px a este fade —que es lo que uno
 * "mejoraría" sin pensarlo— despegaría el botón de comprar del viewport durante
 * los 180 ms de cada navegación, en las pantallas de más intención de compra del
 * sitio. Es la misma familia de trampa que ya está documentada en `Header.jsx`
 * con el `backdrop-filter` y el modal de búsqueda.
 *
 * Si algún día hace falta que la transición se mueva, el movimiento va en los
 * hijos que NO son fixed, nunca en este contenedor.
 */
function PageFade({ children }) {
  const { pathname } = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('motion-page');
    void el.offsetWidth; // fuerza el reflow que reinicia la animación
    el.classList.add('motion-page');
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToHash />
      <Header />
      <CartDrawer />
      <WelcomePopup />
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
        <PageFade>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/categoria/:slug" element={<Category />} />
            <Route path="/producto/:slug/:num" element={<Producto />} />
            {/* Despublicada: la ruta redirige en vez de 404 para no perder los links
                viejos ni el tráfico de anuncios. Ver HIDDEN_SECTIONS en config/site.js. */}
            <Route
              path="/personalizados"
              element={isSectionHidden('personalizados') ? <Navigate to="/categorias" replace /> : <Personalizados />}
            />
            <Route
              path="/armar-pack"
              element={isSectionHidden('armar-pack') ? <Navigate to="/categorias" replace /> : <ArmaTuPack />}
            />
            {/* Landings por caso de uso para el tráfico de anuncios. Las URLs
                "bonitas" que apuntan a páginas que YA existen (/personalizados,
                /negocio, /mayorista) son 301 en netlify.toml, no rutas de acá:
                duplicar esas páginas sería contenido duplicado. */}
            {LANDING_SLUGS.map((s) => (
              <Route key={s} path={`/${s}`} element={<LandingUso slug={s} />} />
            ))}
            <Route path="/mayorista" element={<Mayorista />} />
            <Route path="/negocio" element={<Negocio />} />
            <Route
              path="/archivos-imprimibles"
              element={isSectionHidden('archivos-imprimibles') ? <Navigate to="/categorias" replace /> : <Imprimibles />}
            />
            <Route path="/tatuajes" element={<Tatuajes />} />
            <Route path="/polaroid" element={<Polaroid />} />
            <Route path="/carrito" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pago-exitoso" element={<PaymentSuccess />} />
            <Route path="/pago-transferencia" element={<PaymentTransfer />} />
            <Route path="/pago-pendiente" element={<PaymentPending />} />
            <Route path="/pago-error" element={<PaymentError />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/politicas/envios" element={<Envios />} />
            <Route path="/politicas/cambios" element={<Cambios />} />
            <Route path="/politicas/privacidad" element={<Privacidad />} />
            <Route path="/terminos-y-condiciones" element={<Terminos />} />
            {/* Redirects de rutas viejas */}
            <Route path="/productos" element={<Navigate to="/categorias" replace />} />
            <Route path="/producto/:id" element={<Navigate to="/categorias" replace />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </PageFade>
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
