# Design — Motion del carrito

## 0. Hallazgos del discovery
- `lib/motion.js` exporta `useReducedMotion`; el repo ya usa CSS para tickers y
  aurora, y `Reveal.jsx` con IntersectionObserver.
- Las demos de las seis piezas están en el Plan de conversión (artifact del
  20/11/2026), hechas con Web Animations API y CSS, sin librerías.
- `CartContext.addSticker` es el punto común de los "+".

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** Web Animations API + CSS | `framer-motion` | regla 10; WAAPI viene en el navegador y pesa 0 |
| **D-2** `lib/vuelaAlCarrito.js`: clona la imagen, anima con `transform` hacia el ícono, se borra al terminar | portal de React | no re-renderiza nada |
| **D-3** View Transitions solo si `document.startViewTransition` existe | polyfill | sin soporte, navega como hoy |
| **D-4** Ícono del carrito con `data-carrito-destino` | buscarlo por clase | un selector estable |

## 2. Componentes afectados
- `components/Header.jsx` (destino y rebote), `StickerCard.jsx`, `routes/Producto.jsx`.
- `FreeShippingProgress.jsx` (sello, con 043), carrito (anillo, con 040).
- `styles/index.css` (keyframes y `@media (prefers-reduced-motion)`).
- ⚠️ `CartContext.jsx` (30 importadores): `addSticker` acepta `opts.origen`
  (el elemento desde el que vuela); sin `origen`, nada cambia.

## 9. Testing
- Unit: `vuelaAlCarrito` no hace nada con reduced-motion ni sin destino.
- Manual: Chrome headless **con GPU** para INP y CLS (sin GPU engaña), 375 px,
  y el navegador de Instagram.

## 10. Dependencias nuevas
Ninguna.
