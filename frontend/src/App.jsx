import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import Home from './routes/Home.jsx'; // Home eager (LCP)

// Resto lazy: bajan el initial bundle
const Categorias = lazy(() => import('./routes/Categorias.jsx'));
const Category = lazy(() => import('./routes/Category.jsx'));
const Producto = lazy(() => import('./routes/Producto.jsx'));
const Personalizados = lazy(() => import('./routes/Personalizados.jsx'));
const Mayorista = lazy(() => import('./routes/Mayorista.jsx'));
const Negocio = lazy(() => import('./routes/Negocio.jsx'));
const Tatuajes = lazy(() => import('./routes/Tatuajes.jsx'));
const Polaroid = lazy(() => import('./routes/Polaroid.jsx'));
const Cart = lazy(() => import('./routes/Cart.jsx'));
const Checkout = lazy(() => import('./routes/Checkout.jsx'));
const PaymentSuccess = lazy(() => import('./routes/PaymentSuccess.jsx'));
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

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/categoria/:slug" element={<Category />} />
            <Route path="/producto/:slug/:num" element={<Producto />} />
            <Route path="/personalizados" element={<Personalizados />} />
            <Route path="/mayorista" element={<Mayorista />} />
            <Route path="/negocio" element={<Negocio />} />
            <Route path="/tatuajes" element={<Tatuajes />} />
            <Route path="/polaroid" element={<Polaroid />} />
            <Route path="/carrito" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pago-exitoso" element={<PaymentSuccess />} />
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
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
