# Design — Reactivar la promo 3x2 (jue 20/8 23:00 → lun 24/8 23:59)

| | |
|---|---|
| **Spec** | `010-reactivar-3x2` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Estado** | `IMPLEMENTADO` — 20/08/2026 |

---

## 1. Idea central

Nada de motor nuevo. El N×M (`promo3x2`) ya existe y está espejado; lo que
faltaba era **una ventana** (inicio + fin) y **una regla de acumulación**.

| Cambio | Cómo |
|---|---|
| Ventana | `PROMO_3X2.startsAt` + `isPromoActive()` mirando las dos puntas — mismo patrón que la promo Argentina |
| Encendido solo | Hook con dos hitos (`useVentanaActiva`), extraído del que ya usaba Argentina |
| Sin cupones | `couponRate = 0` cuando la promo corre y el cupón no es `exclusivo` |
| Con transferencia | Nada: `bulkRate` sigue entrando y `percentCap` (10 %) lo topea |

`EPI50` no necesitó ni una línea: es `exclusivo`, así que ya anulaba la
agrupación N×M por diseño (spec 009). Corre su 50 % y listo.

## 2. Archivos tocados

| Archivo | Cambio |
|---|---|
| `frontend/src/config/pricing.js` | `startsAt`, `PROMO_START_MS`, `isPromoActive()` con ventana |
| `netlify/functions/lib/pricing.js` | Espejo + `couponDiscount = 0` durante la promo |
| `frontend/src/context/CartContext.jsx` | `couponRate = 0` durante la promo · `promoActive` del hook (ver §4) |
| `frontend/src/lib/promo.js` | `useVentanaActiva()` compartido por 3x2 y Argentina |
| `frontend/src/components/Header.jsx` | Fallback del label: "el domingo" → "el lunes" |
| `frontend/src/routes/Checkout.jsx` | Copy de la promo + aviso de cupón que no combina |
| `frontend/src/lib/promoPricing.test.js` | Réplica del cálculo + fechas + 3 tests nuevos |
| `docs/business-rules.md` | §2, §3.1 y §9 |

## 3. La ventana

```js
export const PROMO_3X2 = {
  startsAt: '2026-08-20T23:00:00-03:00',
  endsAt:   '2026-08-24T23:59:59-03:00',
  buy: 3, pay: 2, percentCap: 0.10
};
export function isPromoActive(now = Date.now()) {
  return now >= PROMO_START_MS && now <= PROMO_END_MS;
}
```

Sin `startsAt`, deployar hoy prendería la promo en el acto — que es
exactamente lo que no se quiere: hasta las 23:00 el precio válido es el de
lista, y el servidor tiene que rechazar cualquier payload que traiga 3x2 antes.

## 4. Por qué el carrito usa el HOOK y no `isPromoActive()`

`derived` es un `useMemo([state.items])`. Con la promo decidida adentro del
memo, una pestaña abierta a las 22:59 **seguía calculando precios de lista**
después de las 23:00: el banner del Header se encendía (tiene su propio hook)
pero el carrito no, y el checkout mandaba un precio que el servidor ya no
aceptaba → `price_mismatch`.

Se arregló tomando `promoActive` de `usePromoActive()` en el provider y
poniéndolo en las dependencias del memo. El flip de ventana re-renderiza y
recalcula solo. **Lo encontró la prueba con reloj falso, no un test unitario**:
los hooks no tienen cobertura en este repo (no hay testing-library).

## 5. La regla de acumulación

```js
// cliente y servidor, misma línea
const cuponAnuladoPorPromo = promoActive && !anulaTodo;
const couponRate = bundle || cuponAnuladoPorPromo ? 0 : findCoupon(code)?.discount || 0;
```

`!anulaTodo` es lo que deja pasar a `EPI50`: un cupón exclusivo ya apagó la
promo entera, así que no cae en esta regla y corre su propio %.

El 10 % por transferencia no se toca: entra por `bulkRate`, que es
independiente, y `percentCap = 0.10` lo topea igual que siempre.

## 6. Seguridad y compatibilidad

- El precio final lo sigue decidiendo el servidor desde el id de la línea.
- No cambia la forma de las líneas del carrito: los carritos guardados siguen
  funcionando.
- Sin dependencias nuevas.

## 7. Rollback

Adelantar `endsAt` en los **dos** lados y deployar. La promo se apaga sola en
el instante que diga la fecha, sin tocar nada más.
