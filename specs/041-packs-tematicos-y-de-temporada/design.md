# Design — Packs por tema y de temporada

| | |
|---|---|
| **Spec** | `041-packs-tematicos-y-de-temporada` |

## 0. Hallazgos del discovery
- EPICYBER (spec 036) dejó una línea de pack de precio cerrado por fecha en los
  dos lados: `CYBER = { activa, startMs, endMs, sizes, packs: { qty: { price,
  aprobado } } }`, `precioPackCyber`, `packsCyberVigentes`, con test de paridad.
- El servidor deja a los packs fuera de cupones y N x M, y les aplica la
  transferencia (`!lb.discountable` en `netlify/functions/lib/pricing.js`).
- `CATALOG_PACKS` y `visibleCatalogPacks` en `config/pricing.js`: los packs de
  /armar-pack (despublicado).
- `PackBuilder.jsx` arma el x100 de /mayorista.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** `PACKS_TEMA` en los dos `pricing.js`: `{ id, qty, size, price, startsAt?, endsAt?, aprobado }`, validado como EPICYBER | reusar `CYBER` con otras fechas | CYBER es por cantidad, no por tema; mezclarlo rompe su test de campaña |
| **D-2** La lista de diseños de cada pack en `config/packsTema.js` (solo cliente) | en el servidor | el servidor valida precio por id de pack, no diseños |
| **D-3** Línea `type: 'pack'`, id `packtema:{id}` | `type: 'sticker'` × 24 | una línea por pack; el carrito ya sabe mostrar packs |
| **D-4** "Completar" usa `lib/masVendidos.js` de la spec 038 | ranking propio | una sola fuente de "más vendidos" |

## 2. Componentes afectados
- `config/pricing.js`, `netlify/functions/lib/pricing.js` (⚠️ regla 11).
- `config/packsTema.js` (nuevo), `components/PackTema.jsx` (nuevo).
- `routes/Producto.jsx` (bloque "Completá el pack"), `components/PackBuilder.jsx`
  (botón completar, categoría por defecto).
- `lib/analytics.js` (3 eventos, con `try/catch`).

## 3. Datos
Línea nueva en `epicalcos.cart.v2`: `{ id: 'packtema:mate-24', type: 'pack',
qty: 24, size: '6cm', designs: [...] }`. Los carritos viejos no la tienen: sin
migración.

## 9. Testing
Paridad de `PACKS_TEMA` (precio, fechas, aprobado) en `promoPricing.test.js`;
pack por transferencia cruza Rosario en `envio.test.js`.

## 10. Dependencias nuevas
Ninguna.
