# Design — Precios +10 % y 20 % OFF por transferencia

| | |
|---|---|
| **Spec** | `029-precios-mas-10-y-transferencia-20` |
| **Requirements** | [`requirements.md`](requirements.md) |

---

## 0. Hallazgos del discovery

| Pregunta | Respuesta |
|---|---|
| ¿Dónde viven los precios? | Igual que en la 027. Cliente: `config/pricing.js` (`SIZES`, `MAYORISTA100_PRICE`, `NEGOCIO`, `TATUAJES`, `POLAROID_SIZES`, `POLAROID`, `POLAROID_IMAN_POR_FOTO`, `POLAROID_VOLUMEN_OFF_POR_FOTO`, `IMPRIMIBLES`) y `config/personalizados.js` (`RECARGO_HOLOGRAFICO`). Servidor: `netlify/functions/lib/pricing.js` (`SIZE_PRICES`, `MAYORISTA100_PRICE`, `NEGOCIO_PRICE`, `FIXED_PRICES`, `POLAROID_VOLUMEN_OFF_PACK`, `DIGITAL_PRICES`) |
| ¿Precios escritos a mano en el copy? | **No.** La 027 los pasó todos a `formatPrice()` de la constante (grep de `$N.NNN` en `.jsx`/`.js`: solo un comentario histórico) |
| ¿El 15 % escrito a mano? | **No.** Todo el copy sale de `TRANSFER_PCT` / `TRANSFER_OFF`, derivados de `TRANSFER_DISCOUNT` (14 archivos lo importan). Cambiar la constante cambia todos los textos |
| ¿Tope? | `PROMO_3X2.percentCap` / `PROMO_PERCENT_CAP` = 0,25 con promo N x M; `MAX_STICKER_DISCOUNT` = 0,90 sin. Hoy corre el de 0,90: las N x M están apagadas desde el 1/10/2026 |
| ¿Carritos guardados? | Resuelto por la 027: `lib/precioVigente.js` recalcula el `basePrice` desde el id al hidratar el carrito. No hace falta código nuevo, solo verificarlo con los precios nuevos |
| `PACK_HOLOGRAFICO` | Deriva de `NEGOCIO.price` + `RECARGO_HOLOGRAFICO`: se mueve solo |
| Feed de Meta | `scripts/build-meta-feed.mjs` lee `config/pricing.js` y escribe `frontend/public/data/meta-catalog.csv`; Commerce Manager lo lee de https://epicalcos.com/data/meta-catalog.csv |

## 1. Arquitectura propuesta

Sin código nuevo: es la misma maquinaria de la 027 con otros números.

1. **Precios**: los números de la tabla §9.1 en las constantes de los dos lados.
2. **Transferencia**: `TRANSFER_DISCOUNT` 0,15 → 0,20 en los dos lados. El copy
   se actualiza solo.
3. **Tope N x M**: `percentCap` / `PROMO_PERCENT_CAP` 0,25 → 0,30 (20 % + 10 %
   de EPICA10). Hoy no cambia ningún cobro; evita que el día que vuelva una N x M
   el cupón deje de sumar.
4. **Feed de Meta**: regenerar el CSV y commitearlo.

## 2. Componentes afectados

| Archivo | Cambio | Riesgo |
|---|---|---|
| `config/pricing.js` | precios §9.1; `TRANSFER_DISCOUNT` 0,20; `percentCap` 0,30 | 🔴 espejo |
| `config/personalizados.js` | `RECARGO_HOLOGRAFICO.precio` 20.000 (y el comentario de precios del encabezado) | 🔴 espejo |
| `netlify/functions/lib/pricing.js` | precios §9.1; `TRANSFER_DISCOUNT` 0,20; `PROMO_PERCENT_CAP` 0,30 | 🔴 revalida todos los checkouts |
| Tests con montos o porcentajes fijos (`transferencia.test.js`, `promoPricing.test.js`, `ofertasSimultaneas.test.js`, `precioPersonalizados.test.js`, Polaroid) | números nuevos, derivados de las constantes donde se pueda | 🟡 |
| `frontend/public/data/meta-catalog.csv` (+ `skus.json`) | regenerado | 🟢 |
| `docs/business-rules.md` | tabla de precios y transferencia | 🟢 |

**Quién importa lo delicado** (regla 9): `config/pricing.js` lo importa casi
todo el sitio (y `scripts/build-meta-feed.mjs`); `netlify/functions/lib/pricing.js`
lo importan `create-preference.js`, `create-order-transfer.js` y los tests de
paridad. No cambia la forma de ninguna exportación, solo valores.

## 3. Datos

Sin cambios de forma. Los carritos guardados se refrescan al hidratar
(`precioBaseVigente`, spec 027).

## 4. APIs

Sin cambios.

## 5. Integraciones

- **Mercado Pago**: recibe los precios nuevos.
- **Catálogo de Meta**: feed regenerado; Commerce Manager lo toma en su próxima
  lectura programada.

## 6. Seguridad

Sin cambios: el servidor recalcula todo precio y decide el 20 % por
`paymentMethod`, que fija el endpoint.

## 7. Manejo de errores

Una pestaña abierta durante el deploy manda el precio viejo → `price_mismatch`
→ "recargá la página" → al recargar, el carrito se refresca.

## 8. Estrategia de migración

Deploy único (cliente + servidor juntos, un solo commit). Rollback: revertir el
commit.

## 9. Testing

- Paridad de todas las constantes (tests existentes, con los números nuevos).
- Transferencia: 1 calco; pack/Negocio/fijo/digital; Polaroid con volumen;
  EPICA10 + transferencia (30 %); EPI50 + transferencia (sin 20 %); envío sin
  descuento.
- Con el 3x2 prendido en el test (`con3x2`): tope 30 %.
- Carrito guardado con los precios de hoy → se cobra al nuevo.
- Las cuatro combinaciones de los interruptores 3x2/2x1, como en el apagado del
  1/10/2026.
