# EPICALCOS — Ecommerce

Tienda online de calcomanías, stickers, polaroids y vinilos. Frontend React + Vite + Tailwind con estética dark/gradient. Backend Node/Express con integración Mercado Pago Checkout Pro.

> **Estado actual:** Frontend funcional completo. Backend listo como stub — falta cargar el `MERCADOPAGO_ACCESS_TOKEN` para que el checkout funcione end-to-end.

---

## Estructura

```
epicalcos-ecommerce/
├── frontend/          React + Vite + Tailwind
│   ├── src/
│   │   ├── routes/         Home, Products, Cart, Checkout, etc.
│   │   ├── components/     Header, Hero, ProductCard, CartDrawer…
│   │   ├── context/        CartContext + LocalStorage
│   │   ├── data/products.js  Catálogo (editable)
│   │   ├── services/       paymentService.js (fetch al backend)
│   │   └── styles/index.css  Tailwind + gradientes + componentes
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/           Express + Mercado Pago SDK
│   ├── server.js
│   ├── routes/payments.js   POST /api/create-preference + webhook
│   └── .env.example
└── README.md
```

---

## Correr en local

### 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env       # opcional, el default ya apunta a localhost:3001
npm run dev
```

Abre `http://localhost:5173`.

### 2. Backend (cuando tengas las credenciales)

```bash
cd backend
npm install
cp .env.example .env
# editar .env y cargar MERCADOPAGO_ACCESS_TOKEN
npm run dev
```

Abre `http://localhost:3001/health` para verificar.

> Mientras no haya backend corriendo, la tienda funciona completa (catálogo, carrito, checkout con formulario y validaciones). El botón "Pagar con Mercado Pago" va a mostrar un mensaje de error claro indicando que el backend no responde.

---

## Configurar Mercado Pago

1. Crear cuenta en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers).
2. Crear una aplicación tipo **Checkout Pro**.
3. Copiar el **Access Token** (de test al inicio, de producción cuando quieras vender).
4. Pegarlo en `backend/.env` como `MERCADOPAGO_ACCESS_TOKEN`.
5. (Opcional) Configurar la URL pública del webhook en el panel de Mercado Pago para que `POST /api/webhooks/mercadopago` reciba notificaciones.

⚠️ El `ACCESS_TOKEN` **nunca** va al frontend. Vive solo en el backend.

---

## Editar productos

Tocá `frontend/src/data/products.js`. Cada producto tiene:

```js
{
  id: 'pack-anime-x10',
  name: 'Pack Anime x10',
  category: 'anime',
  categoryLabel: 'Anime',
  price: 8000,
  image: '/ruta-o-data-url.jpg',
  description: '…',
  stock: 50,
  tags: ['anime'],
  featured: true,
  badge: 'Más vendido'   // opcional
}
```

Las imágenes por ahora son placeholders SVG generados in-line. Para usar imágenes reales:
- Colocá los archivos en `frontend/public/images/` y referencialos como `/images/archivo.jpg`.

---

## Cambiar colores y estilo

Paleta y tipografías están en:
- `frontend/tailwind.config.js` — colores con namespace `brand-*` y `bg-*`.
- `frontend/src/styles/index.css` — gradientes (`.hero-gradient`, `.page-gradient`) y componentes (`.btn-primary`, `.card-glass`, etc.).

---

## Deploy

### Frontend (Netlify o Vercel)

- **Vercel:** `vercel --prod` desde `frontend/`. Auto detecta Vite.
- **Netlify:** build command `npm run build`, publish dir `dist`. Agregar redirect SPA en `frontend/public/_redirects`:
  ```
  /*  /index.html  200
  ```

Variable de entorno en producción: `VITE_API_URL=https://tu-backend.onrender.com`.

### Backend (Render, Railway, Vercel/Netlify Functions)

- **Render / Railway:** subir la carpeta `backend/`, configurar variables de entorno (`MERCADOPAGO_ACCESS_TOKEN`, `FRONTEND_URL`, `BACKEND_URL`), comando `npm start`.
- **Vercel/Netlify Functions:** se puede portar `routes/payments.js` a una serverless function. Si querés esta opción, lo armamos en una segunda pasada.

---

## Roadmap próximo

- [ ] Cargar credenciales reales de Mercado Pago y validar end-to-end.
- [ ] Reemplazar imágenes placeholder por fotos reales.
- [ ] Persistir órdenes en base de datos (Supabase, PlanetScale o similar).
- [ ] Webhook completo: validar pago consultando a Mercado Pago + email + notificación interna.
- [ ] Permitir subida de archivos para productos personalizados.
- [ ] Integrar Google Tag Manager / GA4 / Meta Pixel (eventos ya marcados con `TODO analytics`).
- [ ] Panel admin para gestión de pedidos.

---

## Notas

- **Pago mínimo:** la regla de "pedido mínimo de 10 calcos" todavía no está enforced en el frontend — los packs ya vienen con cantidad mínima, pero si querés bloquear cantidades menores hay que agregar validación en `CartContext` o `ProductDetail`.
- **WhatsApp:** dejado solo como canal de soporte secundario en `/contacto`. El cierre principal es vía Mercado Pago.
