# CRO EXPERIMENTS — EPICALCOS

Backlog de hipótesis. **Nada se da por ganado sin medirlo**: varios cambios de
P0 fueron correcciones de errores objetivos (una promesa falsa, un `value` mal
calculado) y esos no se testean — se arreglan. Lo que sigue sí es opinable.

> ✅ El `purchase` fue **validado en producción** (8/8/2026). Los KPIs de esta
> página ya son confiables.

---

## Cómo se corre un experimento acá

La infraestructura es propia y vive en `frontend/src/lib/experiments.js`
(sin dependencias, sin script bloqueante, sin parpadeo).

### 1. Declararlo

```js
// frontend/src/lib/experiments.js
export const EXPERIMENTS = {
  mi_experimento: {
    active: true,
    variants: ['control', 'variante'],  // variants[0] es SIEMPRE el control
    descripcion: 'Qué cambia, en una línea'
  }
};
```

### 2. Usarlo en el componente

```jsx
const variante = useExperiment('mi_experimento');
return variante === 'variante' ? <Nuevo /> : <Actual />;
```

`useExperiment` devuelve la variante de forma **sincrónica** (ya en el primer
render) y manda `experiment_view` una sola vez por carga de página.

### 3. Revisarlo antes de publicarlo

Forzá cada variante con un query param, sin tocar código:

```
/armar-pack?exp_ahorro_pack=monto
/producto/anime/1?exp_guia_tamano=abierta
```

### 4. Leerlo en GA4

Crear la dimensión personalizada (ámbito **usuario**) `exp_mi_experimento` →
parámetro `exp_mi_experimento`. Después, cualquier informe se puede segmentar por
variante, incluido `purchase`.

Exposiciones: evento `experiment_view` con `experiment_id` y `experiment_variant`.

### 5. Apagarlo

`active: false` manda a **todos** a control al instante, aunque tengan otra
variante guardada. Es el freno de mano: no hace falta tocar los componentes.

---

## ⚠️ Regla dura: nunca testear un PRECIO

Los experimentos son **solo de presentación**.

El servidor revalida cada línea del carrito contra
`netlify/functions/lib/pricing.js` y rechaza el pedido con `price_mismatch` si el
precio no coincide. Un A/B de precios dejaría a **media tienda sin poder
comprar**, y el error aparecería recién al pagar.

Se puede testear **cómo se muestra** un precio (monto vs porcentaje, dónde va el
tachado, qué se destaca). Nunca **cuánto vale**.

---

## Cuándo cerrar un test

| Regla | Por qué |
|---|---|
| **Mínimo 2 semanas completas** | menos que eso mezcla días de semana con fines de semana y sesgos de campaña |
| **Mínimo ~200 conversiones por variante** | con menos, la diferencia que ves es ruido |
| **No mirar todos los días** | mirar y parar cuando "va ganando" es la forma más común de creerse un resultado falso |
| **Una variable por vez** | si cambiás la ficha y el checkout juntos, no sabés cuál movió la aguja |
| **Segmentar mobile / desktop** | el grueso del tráfico es mobile; el promedio esconde el resultado |
| **El KPI final es `purchase`** | un cambio que sube el add-to-cart y baja la compra es una pérdida |

Con el volumen de EPICALCOS, un test de conversión honesto tarda **semanas**. Un
resultado a los 3 días no probó nada.

---

## Experimentos EN CURSO

| Id | Qué compara | KPI | Estado |
|---|---|---|---|
| `ahorro_pack` | `PackCard`: "10% off" (control) vs "Ahorrás $3.200" | `pack_builder_start` / vistas de `/armar-pack` · 2°: `purchase` | 🟢 corriendo desde 8/8/2026 |
| `guia_tamano` | `SizeGuide` en la ficha: colapsada (control) vs abierta | `add_to_cart` / `view_item` · 2°: mix de tamaños | 🟢 corriendo desde 8/8/2026 |

> La `SizeGuide` de las landings de uso queda **fuera** del test a propósito
> (ahí va siempre abierta por diseño): mezclarla ensuciaría la muestra de la ficha.

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
**Cambio.** A/B `ahorro_pack` en `PackCard` *(🟢 corriendo desde 8/8/2026)*.
**KPI.** `pack_builder_start` / vistas de `/armar-pack`.
**KPI 2°.** `purchase` y ticket promedio — si sube el interés pero baja la
compra, el monto grande está asustando en vez de atraer.
**Resultado.** Pendiente.

## CRO-011 · Guía de tamaños abierta de entrada
**Problema.** "No sé qué tamaño elegir" es la objeción #1 de la ficha, y hoy la
respuesta está detrás de un click que hay que decidir dar.
**Hipótesis.** Resolverla sin que la pidan sube el add-to-cart más de lo que
molesta un bloque abierto de más.
**Cambio.** A/B `guia_tamano` en la ficha *(🟢 corriendo desde 8/8/2026)*.
**KPI.** `add_to_cart / view_item`.
**KPI 2°.** Mix de tamaños y AOV — si además corre la elección hacia 6 y 9 cm,
gana dos veces.
**Riesgo.** Empuja el CTA hacia abajo en mobile. Si el add-to-cart baja, es eso.
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
