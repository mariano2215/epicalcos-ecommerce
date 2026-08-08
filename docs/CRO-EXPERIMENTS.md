# CRO EXPERIMENTS — EPICALCOS

Backlog de hipótesis. **Nada se da por ganado sin medirlo**: varios cambios de
P0 fueron correcciones de errores objetivos (una promesa falsa, un `value` mal
calculado) y esos no se testean — se arreglan. Lo que sigue sí es opinable.

> ⚠️ **Antes de correr cualquier experimento**: hay que validar en producción que
> el `purchase` llega bien (ver `QA-CHECKLIST.md` §6). Hasta ese momento el KPI
> principal no es confiable, y un test leído sobre datos rotos es peor que no
> testear.

---

## Formato

```
CRO-000
Problema:    qué se observa en los datos
Hipótesis:   qué creemos que lo causa y qué lo cambiaría
Cambio:      la intervención concreta
KPI:         métrica primaria
KPI 2°:      métrica de control (que no empeore)
Resultado:   Pendiente | Gana A | Gana B | Sin diferencia
```

---

## CRO-001 · Selector de intención vs. catálogo directo
**Problema.** El Home arrancaba con catálogo; personalizados y negocio no tenían
puerta de entrada propia.
**Hipótesis.** Bifurcar por intención antes del catálogo aumenta la tasa de
llegada a `/personalizados` y `/negocio`, que tienen ticket más alto.
**Cambio.** `IntentSelector` después del hero *(ya implementado en P0)*.
**KPI.** Sesiones que llegan a `/personalizados` + `/negocio` / sesiones.
**KPI 2°.** Add-to-cart rate del catálogo — **que no baje**.
**Riesgo.** Un paso más antes del catálogo puede enfriar al que ya venía decidido.
**Resultado.** Pendiente.

## CRO-002 · Sticky Add to Cart en mobile
**Hipótesis.** Mantener el CTA visible al scrollear la ficha sube el add-to-cart.
**Cambio.** `StickyMobileBar` en `/producto/*` *(ya implementado en P0)*.
**KPI.** `add_to_cart / view_item` en mobile.
**Resultado.** Pendiente.

## CRO-003 · Guía visual de tamaños
**Problema.** "¿Qué tamaño elijo?" no estaba resuelto en ninguna pantalla.
**Hipótesis.** Comparar los tres tamaños a escala reduce la duda y sube el
add-to-cart; además puede correr el mix hacia 6 y 9 cm (ticket más alto).
**Cambio.** `SizeGuide` *(ya implementado en P0)*.
**KPI.** `add_to_cart / view_item`.
**KPI 2°.** Mix de tamaños y AOV.
**Resultado.** Pendiente.

## CRO-004 · Calculadora de envío en la ficha
**Hipótesis.** Saber el costo de envío antes del checkout baja el abandono en el
paso de pago.
**Cambio.** `ShippingInfo` con calculadora *(ya implementado en P0)*.
**KPI.** `purchase / begin_checkout`.
**KPI 2°.** `shipping_calculated` → `add_to_cart` (¿el costo espanta o tranquiliza?).
**Resultado.** Pendiente.

## CRO-005 · Barra de progreso de envío gratis en el carrito
**Problema.** El gap a $50.000 / $75.000 solo aparece en el checkout, cuando ya
es incómodo agregar productos.
**Hipótesis.** Mostrarlo en el carrito sube el AOV.
**Cambio.** `FreeShippingProgress` en `/carrito` **(P1)**.
**KPI.** AOV.
**KPI 2°.** `begin_checkout / view_cart` — que no baje por distracción.
**Resultado.** Pendiente.

## CRO-006 · Packs x10 / x20 / x50
**Problema.** El salto de 1 calco a 100 (mayorista) no tiene escalones.
**Hipótesis.** Un pack de entrada con precio por unidad y ahorro visibles sube el
AOV más de lo que canibaliza la compra suelta.
**Cambio.** `PackCard` + presets sobre el `PackBuilder` existente **(P1)**.
**KPI.** AOV.
**KPI 2°.** Conversion rate general.
**Resultado.** Pendiente.

## CRO-007 · Ahorro en pesos vs. en porcentaje
**Hipótesis.** "Ahorrás $12.000" pesa más que "50 % off" en tickets altos
(mayorista, negocio); al revés en tickets chicos.
**Cambio.** A/B del label de descuento en `PackBuilder` y `/mayorista`.
**KPI.** Conversion rate de la página de pack.
**Resultado.** Pendiente.

## CRO-008 · Prueba social pegada al CTA
**Problema.** Los testimonios reales solo están en Home y `/negocio`.
**Hipótesis.** Un testimonio cerca del botón de compra sube el add-to-cart.
**Cambio.** `SocialProof` en ficha y carrito **(P1)**.
**KPI.** `add_to_cart / view_item`.
**Resultado.** Pendiente.

## CRO-009 · Landings por intención vs. Home para tráfico pago
**Problema.** Los anuncios caen en Home o en páginas genéricas: el message match
se rompe entre el anuncio y la página.
**Hipótesis.** Una landing que continúa exactamente la promesa del anuncio
convierte mejor que Home.
**Cambio.** `/calcos-para-negocios`, `/pack-100-calcos`, `/calcos-personalizadas` **(P2)**.
**KPI.** Conversion rate por landing page (GA4 · dimensión Landing Page).
**KPI 2°.** CPA en Meta.
**Resultado.** Pendiente.

## CRO-010 · Transferencia como opción destacada
**Problema.** El 10 % off vive detrás de una tarjeta de medio de pago que recién
se ve al final del checkout.
**Hipótesis.** Anticipar "pagando por transferencia, 10 % off" en el carrito
corre el mix hacia transferencia (0 % de comisión de MP) sin bajar la conversión.
**Cambio.** Bloque de medios de pago en `/carrito` **(P1)**.
**KPI.** % de pedidos por transferencia.
**KPI 2°.** `purchase / begin_checkout` — **que no baje**.
**Riesgo real.** La transferencia exige un paso manual (mandar comprobante):
empujarla de más puede aumentar los pedidos registrados que nunca se cobran.
Medir contra el CRM, no contra GA4.
**Resultado.** Pendiente.

---

## Cómo leer los resultados

- **Tamaño de muestra.** Con el volumen de EPICALCOS, un test de conversión
  necesita semanas. Un cambio que "se ve mejor" a los 3 días no probó nada.
- **Una variable por vez.** Si se sube el add-to-cart y al mismo tiempo se cambia
  el checkout, no se sabe cuál movió la aguja.
- **Segmentar mobile / desktop.** El grueso del tráfico es mobile; un promedio
  mezclado esconde el resultado.
- **El KPI final es `purchase`, no el clic.** Un cambio que sube el add-to-cart y
  baja la compra es una pérdida.
