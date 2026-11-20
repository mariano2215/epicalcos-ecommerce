# Design — Oferta de cantidad permanente

| | |
|---|---|
| **Spec** | `040-oferta-de-cantidad` |

## 0. Hallazgos del discovery

- El motor N x M está parametrizado: `promo3x2(unitBasePrices, buy, pay)` y
  `repartoPromos` en los dos `pricing.js`, con `PROMO_3X2 = { activa, startsAt,
  endsAt, buy: 3, pay: 2, percentCap: 0.3 }` en el cliente y `PROMO_ACTIVA`,
  `PROMO_BUY`, `PROMO_PAY`, `PROMO_PERCENT_CAP` en el servidor.
- `promoPricing.test.js` prueba la paridad en las 4 combinaciones de 3x2/2x1.
- Textos con "3x2" escrito: `CartDrawer.jsx` L144 (`' (3x2).'`),
  `CartContext.jsx` L482 (`'3x2'` como etiqueta) y L544 (`'nxm_3x2'` para
  analytics), `Header.jsx` L147 (`ariaLabel`), `personalizadosLanding.js` L197,
  `SelectorCantidad.jsx` L155.

## 1. Arquitectura propuesta (opción A)

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** Reusar `PROMO_3X2` con `buy: 12, pay: 10`, renombrando solo textos | promo nueva con su propio objeto | el motor, el reparto, el tope y los tests ya existen; una promo paralela duplicaría la paridad |
| **D-2** Etiqueta derivada: `` `${buy}x${pay}` `` en vez de `'3x2'` escrito | dejar literales | si mañana es 10x8, cambia en un solo lugar |
| **D-3** `nxm_3x2` en analytics pasa a `nxm_${buy}x${pay}` | mantener | la serie histórica se corta igual porque cambia la mecánica |

## 2. Componentes afectados
- `frontend/src/config/pricing.js` y `netlify/functions/lib/pricing.js`:
  `activa`/`PROMO_ACTIVA` true, `buy`/`PROMO_BUY` 12, `pay`/`PROMO_PAY` 10,
  `startsAt`/`PROMO_START_MS` = fecha del deploy. ⚠️ regla 11.
- Textos: los 6 lugares de §0.
- Tests: `promoPricing.test.js` (tabla de RF-1 como casos), `envio.test.js`
  (24 × 6 cm con transferencia cruza Rosario).

### ⚠️ Módulos compartidos
`config/pricing.js` (50 importadores), `netlify/functions/lib/pricing.js`
(revalida todos los checkouts), `CartContext.jsx` (30). Solo cambian valores y
literales; ninguna firma.

## 7. Manejo de errores
`price_mismatch` si un lado queda distinto: el test lo frena antes del deploy.

## 8. Migración
Se prende cambiando valores en los dos lados en el mismo commit. Se apaga con
`activa: false` en los dos lados.

## 9. Testing
Cada fila de la tabla de RF-1 es un caso en los dos lados.

## 10. Dependencias nuevas
Ninguna.
