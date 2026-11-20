# Design — Calco sorpresa a mitad de camino

## 0. Hallazgos del discovery
- `netlify/functions/lib/regaloCyber.js` (spec 037) ya resolvió un regalo que
  **no es línea del pedido**: viaja como nota en `shipping.comments`, que el
  mail interno y el CRM muestran, y nada de ese archivo puede frenar un pedido.
- `components/FreeShippingProgress.jsx` arma la barra con los dos umbrales.
- El servidor calcula `physicalTotal` después de la transferencia para el envío.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** `REGALO_HITO = { activo, umbral: 20000, texto }` en `config/site.js` y espejo en `netlify/functions/lib/regaloHito.js`, con test de paridad | en `pricing.js` | no es un precio; queda fuera del espejo de precios a propósito (precedente: spec 037) |
| **D-2** Nota en `shipping.comments` como el regalo de EPICYBER | línea de precio $0 | Mercado Pago no admite precios ≤ 0 |

## 2. Componentes afectados
- `config/site.js` (⚠️ 41 importadores, solo se agrega), `FreeShippingProgress.jsx`.
- `netlify/functions/lib/regaloHito.js` (nuevo) y la creación de pedido
  (`create-preference` y pedido por transferencia): una llamada que no lanza.
- `lib/analytics.js`: `hito_regalo_alcanzado`.

## 9. Testing
Paridad del umbral; 19.999 / 20.000 / 20.001 en los dos lados; pedido digital.

## 10. Dependencias nuevas
Ninguna.
