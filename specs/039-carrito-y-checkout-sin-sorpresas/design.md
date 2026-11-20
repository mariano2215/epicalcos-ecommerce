# Design — Carrito y checkout sin sorpresas

| | |
|---|---|
| **Spec** | `039-carrito-y-checkout-sin-sorpresas` |

## 0. Hallazgos del discovery

- El servidor aplica la transferencia por unidad:
  `round(lb.base * (1 - transferRate))` (`netlify/functions/lib/pricing.js`
  ~L869), con `TRANSFER_DISCOUNT = 0.1` espejado en los dos lados.
- `components/AvisoTransferencia.jsx` ya muestra el ahorro en el carrito con
  `transferSavings` de `pricedItems`.
- `components/FreeShippingProgress.jsx` arma la barra; costos en
  `config/site.js` (`costRosario` 4.500, `costNearby` 6.500, `costInterior`
  8.500).
- `components/CheckoutForm.jsx` L23-24 precarga `city: 'Rosario'`,
  `province: 'Santa Fe'`. `routes/Checkout.jsx` L407 pone el `aside` "Tu pedido"
  después del formulario en celular.
- `routes/Producto.jsx` L248 muestra `formatPrice(unit)`.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** `precioConTransferencia(unit)` en `config/pricing.js`, al lado de `TRANSFER_DISCOUNT`, y su gemelo en el servidor con test de paridad | (a) calcularlo en cada componente · (b) en `lib/formato.js` | (a) cada copia del redondeo es un `price_mismatch` en potencia; (b) formato no sabe de precios. El test ata los dos lados |
| **D-2** El resumen arriba reutiliza el mismo cálculo del `aside` (props), en un `<details>` propio | duplicar la cuenta | dos totales distintos en la misma pantalla sería peor que el problema |
| **D-3** Provincia como `<select>` con las 24 jurisdicciones | texto libre | evita "Sta Fe" / "santa fe" y el cálculo de zona falla menos |
| **D-4** `carrito_primer_add` con `sessionStorage` (`epicalcos.cart.primerAdd`) | `localStorage` | es por sesión a propósito |

## 2. Componentes afectados

### Se modifican
- `config/pricing.js` + `netlify/functions/lib/pricing.js` — **solo** la función
  pura de redondeo, sin cambiar ningún valor. ⚠️ regla 11.
- `routes/Producto.jsx`, `components/StickerCard.jsx` (precio doble).
- `components/CartDrawer.jsx` (línea de envío estimado).
- `routes/Checkout.jsx` (resumen arriba), `components/CheckoutForm.jsx`
  (campos vacíos, select).
- `lib/experiments.js` (`carrito_primer_add`).

### ⚠️ Módulos compartidos
- `config/pricing.js` — 50 importadores; se **agrega** una función, no se cambia
  ninguna existente. `promoPricing.test.js` gana un caso de paridad.
- `CartContext.jsx` — 30 importadores; solo cambia cuándo se abre el drawer en
  la variante (`addSticker` lee el experimento).

## 3. Datos
`sessionStorage`: `epicalcos.cart.primerAdd = '1'`. Ningún cambio en
`epicalcos.cart.v2`.

## 4. APIs
Ninguna.

## 6. Seguridad
Sin datos nuevos.

## 7. Manejo de errores
Sin provincia → total con rango (RF-6). Ciudad no reconocida en Santa Fe →
tarifa de interior, igual que hoy.

## 9. Testing
- Paridad de `precioConTransferencia` cliente/servidor en 4, 6 y 9 cm y packs.
- `envio.test.js`: casos con ciudad vacía.
- Manual: 375 px, carrito de 1 calco a Córdoba → el total arriba dice $10.600
  antes de tocar un campo de pago.

## 10. Dependencias nuevas
Ninguna.
