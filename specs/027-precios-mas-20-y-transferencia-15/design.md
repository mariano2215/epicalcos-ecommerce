# Design — Precios +20 % y 15 % OFF por transferencia

| | |
|---|---|
| **Spec** | `027-precios-mas-20-y-transferencia-15` |
| **Requirements** | [`requirements.md`](requirements.md) |

---

## 0. Hallazgos del discovery

| Pregunta | Respuesta |
|---|---|
| ¿Dónde viven los precios? | Cliente: `config/pricing.js` (SIZES, MAYORISTA100, NEGOCIO, TATUAJES, POLAROID_SIZES, POLAROID_IMAN_POR_FOTO, POLAROID_VOLUMEN_OFF_POR_FOTO, IMPRIMIBLES) y `config/personalizados.js` (RECARGO_HOLOGRAFICO). Servidor: `netlify/functions/lib/pricing.js` (SIZE_PRICES, MAYORISTA100_PRICE, NEGOCIO_PRICE, FIXED_PRICES, POLAROID_VOLUMEN_OFF_PACK, DIGITAL_PRICES) |
| ¿Precios escritos a mano fuera de config? | Tres descripciones SEO: `routes/Negocio.jsx`, `routes/Polaroid.jsx`, `routes/Tatuajes.jsx` |
| ¿Cómo corre hoy la transferencia? | `BULK_*` en los dos lados: 10 % solo si hay ≥ 10 líneas `sticker:` y `paymentMethod === 'transferencia'`, dentro de `percentRate` (que solo toca líneas `discountable`). Packs/negocio/fijos/digitales nunca tienen % |
| ¿Tope? | `PROMO_3X2.percentCap` / `PROMO_PERCENT_CAP` = 0,20 con promo N x M; `MAX_STICKER_DISCOUNT` = 0,90 sin |
| ⚠️ ¿Carritos guardados? | Cada línea guarda `basePrice` en localStorage y **nada lo refresca**: tras el aumento, un carrito viejo mandaría el precio viejo y el servidor lo rechazaría (`price_mismatch`) — el cliente no podría comprar sin vaciar el carrito |
| Copy del 10 % | 16 archivos (DiscountNote, BulkProgress, CheckoutForm, Cart, Checkout, OfertaPrincipal, PackBuilder, ArmaTuPack, LandingUso, site.js, landings.js, FAQ, Categorias, CATALOG_PACKS, promoUnlock, popup) |

## 1. Arquitectura propuesta

Tres piezas, las dos primeras espejadas:

1. **Precios**: se cambian los números en las constantes de los dos lados
   (§9.1 de requirements). Todo lo derivado se mueve solo.
2. **Transferencia** (`TRANSFER_DISCOUNT = 0.15`, reemplaza a `BULK_*`):
   `transferRate = !anulaTodo && paymentMethod === 'transferencia' ? 0.15 : 0`.
   - Líneas **no** `discountable` (pack, negocio, fixed, digital):
     `round(base × (1 − transferRate))`.
   - Líneas `discountable` (sticker, custom): el `percentRate` de siempre, que
     ahora suma `transferRate` sin umbral: `min(transferRate + cupón, tope)`.
     Fuera de promo N x M, un `custom:` sin `incluyeCustom` recibe solo
     `transferRate` (antes, nada).
   - Tope con promo N x M: 0,25.
3. **Precio vigente del carrito**: `precioBaseVigente(line)` recalcula el
   `basePrice` de LISTA desde el id (mismo criterio que `lineBase` del
   servidor) y se aplica al hidratar el carrito. Un carrito viejo pasa a los
   precios nuevos sin tocar nada más.

## 2. Componentes afectados

| Archivo | Cambio | Riesgo |
|---|---|---|
| `config/pricing.js` | precios; `TRANSFER_DISCOUNT`/`TRANSFER_PAYMENT_METHOD` (sale `BULK_*`); `percentCap` 0,25; tagline del x10 | 🔴 espejo |
| `config/personalizados.js` | `RECARGO_HOLOGRAFICO.precio` 18.000 | 🔴 espejo |
| `netlify/functions/lib/pricing.js` | precios; transferencia 15 % a todo producto sin umbral; `PROMO_PERCENT_CAP` 0,25 | 🔴 revalida todos los checkouts |
| `context/CartContext.jsx` | `pricedItems` espejo; `precioBaseVigente` al hidratar; `transferSavings` (antes `bulkSavings`) para todo carrito; sale `bulkUnits`/`bulkEligible`/`unitsToBulk` | 🔴 |
| `lib/precioVigente.js` *(nuevo)* | `precioBaseVigente(line)` | 🟡 |
| `components/BulkProgress.jsx` | pasa a ser el aviso "15 % OFF pagando por transferencia · ahorrás $X", sin barra (no hay umbral) | 🟢 |
| `components/DiscountNote.jsx`, `CheckoutForm.jsx`, `routes/Cart.jsx`, `routes/Checkout.jsx`, `OfertaPrincipal.jsx`, `PackBuilder.jsx`, `PackCard.jsx`, `routes/ArmaTuPack.jsx`, `routes/LandingUso.jsx`, `routes/Categorias.jsx`, `config/site.js`, `config/landings.js`, `components/FAQ.jsx`, `lib/promoUnlock.js`, popup | copy del 15 %, derivado de `TRANSFER_DISCOUNT` | 🟢 |
| `routes/Negocio.jsx`, `Polaroid.jsx`, `Tatuajes.jsx` | SEO con `formatPrice()` de la constante, no a mano | 🟢 |

**Quién importa lo delicado** (regla 9): `config/pricing.js` lo importa casi
todo el sitio; `netlify/functions/lib/pricing.js` lo importan
`create-preference.js`, `create-order-transfer.js` y los tests de paridad;
`CartContext.jsx`, todo componente con `useCart()`.

## 3. Datos

Sin cambios de forma. `basePrice` de cada línea guardada se recalcula al
hidratar (§1.3); si el id no es reconocible se deja el guardado.

## 4. APIs

Sin cambios. `create-order-transfer` ya manda `paymentMethod: 'transferencia'`.

## 5. Integraciones

- **Mercado Pago**: recibe los precios nuevos (sin transferencia).
- **Catálogo de Meta**: `scripts/build-meta-feed.mjs` deriva de `pricing.js`;
  hay que volver a correrlo y subir el feed (Mariano) para que los anuncios
  muestren el precio nuevo.

## 6. Seguridad

El servidor sigue recalculando todo precio; el 15 % se decide por
`paymentMethod`, que el endpoint fija (no el cliente).

## 7. Manejo de errores

Una pestaña abierta durante el deploy manda el precio viejo → `price_mismatch`
→ "recargá la página" → al recargar, el carrito se refresca (§1.3).

## 8. Estrategia de migración

Deploy único (cliente + servidor juntos). Rollback: revertir el merge.

## 9. Testing

- Paridad de todas las constantes nuevas (tests existentes, con los números
  nuevos derivados de las constantes).
- Transferencia: 1 calco; custom sin promo; pack/negocio/fijo/digital; Polaroid
  con volumen; 3x2 + transferencia; EPICA10 + transferencia (tope 25 %); EPI50 +
  transferencia (sin 15 %); envío sin descuento.
- `precioBaseVigente` para cada tipo de línea y paridad con el servidor.
