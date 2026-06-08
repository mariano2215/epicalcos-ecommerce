import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import Home from './routes/Home.jsx';
import Products from './routes/Products.jsx';
import Category from './routes/Category.jsx';
import ProductDetail from './routes/ProductDetail.jsx';
import Cart from './routes/Cart.jsx';
import Checkout from './routes/Checkout.jsx';
import PaymentSuccess from './routes/PaymentSuccess.jsx';
import PaymentPending from './routes/PaymentPending.jsx';
import PaymentError from './routes/PaymentError.jsx';
import Contact from './routes/Contact.jsx';
import Envios from './routes/legal/Envios.jsx';
import Cambios from './routes/legal/Cambios.jsx';
import Privacidad from './routes/legal/Privacidad.jsx';
import Terminos from './routes/legal/Terminos.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/categoria/:slug" element={<Category />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
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
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
