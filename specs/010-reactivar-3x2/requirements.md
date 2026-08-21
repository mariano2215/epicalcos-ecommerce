# Requirements — Reactivar la promo 3x2 (jue 20/8 23:00 → lun 24/8 23:59)

| | |
|---|---|
| **Spec** | `010-reactivar-3x2` |
| **Estado** | `IMPLEMENTADA` — 20/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> ⚠️ **Esta spec se escribió junto con la implementación, no antes.** Mariano
> pidió la promo para las 23:00 del mismo día, con menos de una hora de
> margen: esperar el ciclo de aprobación de `specs/README.md` habría perdido la
> ventana. Queda documentado acá para que el repo no pierda el hilo, y el
> desvío del proceso es explícito y no un olvido.

---

## 1. Problema y objetivo

La 3x2 venció el 26/7/2026 y quedó apagada. Mariano quiere reactivarla para el
fin de semana largo, arrancando **hoy jueves 20/8 a las 23:00** y cerrando el
**lunes 24/8 a las 23:59**, con contador a la vista.

La promo tiene que **encenderse sola** a las 23:00: el deploy es antes y nadie
va a estar publicando a esa hora.

## 2. Scope

- [x] 3x2 en **todas las calcos minoristas**: catálogo (`sticker`) +
      personalizados (`custom`). Cada 3, la más barata gratis.
- [x] Ventana con **inicio y fin**, en hora Argentina.
- [x] **Contador** visible hasta el cierre.
- [x] **Se combina con el 10 % por transferencia.**
- [x] **No se combina con otros cupones**: durante la promo un cupón de %
      (`EPICA10`) no descuenta nada.
- [x] **EPI50 sigue activo** y sin cambios: es `exclusivo`, así que reemplaza a
      la promo — quien tiene el código ve 50 %, no 3x2.

## 3. Fuera de scope

- [x] Packs, mayorista, Negocio, precio fijo y digitales: ya traen su precio
      final y no entran en la promo (es el alcance que la 3x2 ya tenía).
- [x] Cambiar el % del 10 % por transferencia, umbrales o envíos.
- [x] Tocar `EPI50`, `EPICA10` o el popup de bienvenida.
- [x] Un interruptor manual (`activa`) para la promo: se apaga sola el lunes, y
      adelantar el cierre es cambiar la misma línea que el interruptor.

## 4. Requisitos funcionales

| ID | Requisito | Resultado |
|---|---|---|
| RF-1 | Cada 3 calcos elegibles, la más barata gratis, entre `startsAt` y `endsAt` | ✅ |
| RF-2 | **Antes** de las 23:00 el precio válido sigue siendo el de lista | ✅ |
| RF-3 | La promo se enciende y se apaga **sola**, sin recargar y sin deploy | ✅ |
| RF-4 | Banner con contador hasta el lunes 24/8 | ✅ |
| RF-5 | Se combina con el 10 % por transferencia, topeado en `percentCap` | ✅ |
| RF-6 | Un cupón de % **no** descuenta nada durante la promo | ✅ |
| RF-7 | El checkout **avisa** que el cupón no se combina | ✅ |
| RF-8 | `EPI50` sigue dando 50 % y reemplaza a la promo | ✅ |
| RF-9 | El servidor revalida y rechaza precios de 3x2 fuera de la ventana | ✅ |
| RF-10 | Packs, negocio, fijos y digitales intactos | ✅ |

## 5. Reglas de negocio que cambian

| Regla | Ref. | ¿Cambia? |
|---|---|---|
| Cupones de %: acumulables con transferencia | `business-rules.md` §2 | **sí** — no corren durante una promo N×M por fecha |
| Promo 3x2: vencida | `business-rules.md` §3.1 | **sí** — viva, y ahora con ventana |
| Orden de aplicación de descuentos | `business-rules.md` §9 | **sí** — `cupón = 0` con la promo corriendo |
| Alcance de la 3x2 (sticker + custom) | `business-rules.md` §3.1 | no |
| Envíos | `business-rules.md` §5 | no |

- [x] Cambio espejado en `frontend/src/config/pricing.js` **y** `netlify/functions/lib/pricing.js`
- [x] Tests de paridad nuevos (ventana + no acumulación)

## 6. Edge cases

| Caso | Esperado | Resultado |
|---|---|---|
| Pestaña abierta a las 22:59 que cruza las 23:00 | Precios y banner se actualizan **sin recargar** | ✅ (ver §7) |
| Payload con precios de 3x2 mandado a las 22:59 | `price_mismatch` | ✅ |
| `EPICA10` durante la promo | Solo 3x2; el cupón no suma; se avisa | ✅ |
| `EPICA10` **después** del lunes | Vuelve a dar su 10 % de siempre | ✅ |
| `EPI50` durante la promo | 50 %, sin 3x2 | ✅ |
| Transferencia + 12 calcos durante la promo | 3x2 **y** 10 % encima | ✅ |
| Carrito de solo packs | Sin cambios | ✅ |

## 7. Hallazgo — el bug que casi se deploya

La verificación en navegador con reloj falso mostró que, al cruzar las 23:00
con la pestaña abierta, **el banner se encendía pero los precios del carrito
no**. `derived` es un `useMemo` sobre `state.items` y decidía la promo con
`isPromoActive()` adentro: sin cambio de items, no se recalculaba.

Consecuencia real: esa pestaña habría mandado precios de **lista** cuando el
servidor ya esperaba precios de **3x2** → `price_mismatch` y **checkout
trabado**, justo en el minuto de arranque de la promo.

Corregido: el provider toma `promoActive` del hook `usePromoActive()` y lo pone
en las dependencias del memo, así el flip de ventana re-renderiza y recalcula.

## 8. Analytics

Sin eventos nuevos. `add_payment_info` y `purchase` ya reportan lo realmente
pagado; `couponApplied` viaja en `null` cuando el cupón no descontó nada, que
es lo correcto.

## 9. Verificación

- **243 tests** en verde (240 previos + 3 nuevos: ventana en los cuatro bordes,
  rechazo antes del inicio, y 3x2 + 10 % por transferencia).
- Navegador real (Chromium, 375 px) con reloj falso a las 22:58 → 23:01:
  banner, contador, precios, EPI50, EPICA10 y el aviso de no-combinación.

## 10. Pendiente

- [ ] Ver la promo encendida en producción a las 23:00 y hacer una compra real.
