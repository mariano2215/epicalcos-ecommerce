# Requirements — Todas las ofertas juntas + cupón con vencimiento por usuario

| | |
|---|---|
| **Spec** | `017-todas-las-ofertas` |
| **Estado** | ✅ `IMPLEMENTADA` — 07/09/2026 |
| **Fecha** | 07/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

**Hoy la tienda no tiene ninguna oferta viva.** Las tres promos del motor están
vencidas:

| Promo | Venció |
|---|---|
| 3x2 en todas las calcos | 28/8/2026 |
| Mayorista 100 × $39.999 | 14/8/2026 |
| Argentina 50 % | 19/8/2026 |

Lo único vigente es el 10 % por transferencia desde 10 calcos y el 50 % desde
100. Para el visitante frío que llega de un anuncio de Instagram y quiere 1, 2 o
3 calcos —que es la mayoría del tráfico— **no hay ningún incentivo**. La barra
superior le promete envío gratis desde $75.000, que a $1.600 el calco son 47
unidades: lo que lee es *"esto no es para mí"*.

Además, el cupón que entrega el popup de bienvenida (`EPICA10`) **no vence
nunca**: no tiene `endsAt` desde que existe. No genera ninguna urgencia, y el
que deja el mail no tiene motivo para comprar hoy en vez de la semana que viene.

---

## 2. Objetivo

Que la tienda tenga las tres ofertas corriendo a la vez, y que el cupón de
bienvenida tenga una ventana de validez corta y visible que empuje a comprar en
la misma sesión.

**Cómo se sabrá que funcionó**: sube la tasa de conversión del tramo
`lead_capture → purchase` dentro de la misma sesión, y sube la cantidad de
unidades por pedido (el 3x2 y el 2x1 son palancas de AOV, no de tráfico).

---

## 3. Scope

- [ ] **3x2 en todas las calcos** — cada 3 calcos elegibles, la más barata gratis.
      Alcance: catálogo (`sticker`) + personalizados (`custom`).
- [ ] **2x1 en las 4 categorías de "Los más elegidos"** — `anime`, `argentina`,
      `disney`, `frases`. Cada 2 calcos de esas categorías, la más barata gratis.
- [ ] **Mayorista: 100 calcos a $39.999 total**, en los tamaños que ya declara la
      promo mayorista.
- [ ] **El cupón `EPICA10` vence a los 10 minutos** de que la persona deja el
      mail en el popup, y el popup muestra un contador de esos 10 minutos.
- [ ] **`EPICA10` pasa a acumular** sobre las promos N×M, con tope de descuento
      porcentual del 20 %.
- [ ] Las tres promos **arrancan al deployar y no tienen fecha de fin**: se
      apagan a mano con su interruptor.

---

## 4. Fuera de scope

- **Revivir la promo Argentina 50 %.** Queda vencida. La categoría `argentina`
  participa del 2x1 como una más de las cuatro, nada más.
- **Cambiar los precios de lista** ($1.200 / $1.600 / $2.000) ni el 10 % por
  transferencia ni el umbral de envío gratis.
- **Tocar `EPI50`.** Sigue siendo `exclusivo` y sigue anulando todo lo demás.
- **Nombrar los diseños del catálogo**, sumar video, o cualquier otro hallazgo
  del análisis de conversión del 7/9/2026. Se anotan como hallazgos, no entran acá.
- **Prender el carrito abandonado.** Sigue esperando OK aparte.

---

## 5. Usuarios

| Usuario | Qué quiere |
|---|---|
| Visitante frío de Instagram | Comprar 1-3 calcos sin sentir que la oferta es para otro |
| Visitante que deja el mail | Un motivo para comprar ahora y no "después" |
| Negocio / revendedor | Las 100 calcos al precio de la promo |
| Mariano | Poder apagar cualquiera de las tres sin deployar lógica |

---

## 6. User stories

- Como visitante, **al agregar 3 calcos cualesquiera veo que una sale gratis**,
  sin escribir ningún código.
- Como visitante, **al agregar 2 calcos de anime / argentina / disney / frases
  veo que una sale gratis**, que es mejor que el 3x2 general.
- Como visitante que dejó el mail, **veo un contador que me dice cuánto me queda
  para usar mi 10 %**, y ese 10 % se descuenta de verdad encima de la promo.
- Como Mariano, **apago cualquiera de las tres promos cambiando una línea** y
  desaparece a la vez del sitio y del servidor.

---

## 7. Requisitos funcionales

### RF-1 — 3x2 general
Cada 3 unidades elegibles, la más barata gratis. Elegibles: `sticker` + `custom`.
Quedan afuera packs, mayorista, Negocio, precio fijo y digitales: esas líneas ya
traen su precio final.

### RF-2 — 2x1 por categoría
Cada 2 unidades de `anime`, `argentina`, `disney` o `frases`, la más barata
gratis. La categoría se decide por el **id de la línea**, igual que hace hoy la
promo por categoría, para que el servidor mire exactamente el mismo dato.

### RF-3 — Reparto entre las dos promos *(decisión de Mariano, 07/09/2026, revisada el mismo día)*

Un calco de una de las 4 categorías entra en las dos promos. **El reparto es el
que más le conviene al cliente**: se elige cuántas unidades de esas categorías
van al 2x1 y cuántas al 3x2 de modo que el descuento total sea el máximo.

**Por qué así y no "2x1 primero, sobrantes al 3x2"**: esa regla —aprobada
primero y descartada después de verificarla— permite que **agregar un calco baje
el total** hasta $800 en el 1,2 % de los carritos. El detalle de la verificación
está en `design.md` §11 (P-3). Un carrito donde sumar un producto hace pagar
menos es imposible de explicar en una pantalla.

**Garantías que tiene que cumplir el reparto elegido**:

| Propiedad | Estado |
|---|---|
| Agregar un calco nunca da **menos** calcos gratis | ✅ verificado |
| Agregar un calco nunca **baja** el total | ✅ verificado, 60.480 transiciones |
| El resultado es el máximo posible para el cliente | ✅ verificado contra enumeración completa |
| Determinista y espejable línea por línea | ✅ bucle acotado, sin aleatoriedad |

**Ejemplo aprobado** — 3 Disney + 2 de otra categoría, todos de 6 cm:
```
2 Disney al 2x1                        → 1 gratis
1 Disney + 2 otras = 3 calcos al 3x2   → 1 gratis
TOTAL: 2 calcos gratis · $8.000 → $4.800
```

### RF-4 — Mayorista
100 calcos a $39.999 total, en los tamaños que ya declara la promo. Sin cambios
de mecánica respecto de como ya funcionó.

### RF-5 — Cupón `EPICA10` con validez de 10 minutos
- El cupón queda **emitido** en el momento en que la persona deja el mail.
- Vence **10 minutos** después de ese instante, para esa persona.
- Vencido, el checkout **no lo aplica** y lo dice con un mensaje claro.
- El vencimiento es **por usuario**, no global: dos personas que dejan el mail
  con una hora de diferencia tienen ventanas distintas.

### RF-6 — Contador visible
- El popup, después de entregar el código, muestra un contador de 10 minutos.
- El contador tiene que estar también **donde se usa el cupón** (el checkout),
  no solo donde se entrega: un contador que la persona no ve mientras completa
  el formulario no cambia ninguna conducta.

### RF-7 — Acumulación *(decisión de Mariano, 07/09/2026)*
`EPICA10` **acumula** sobre las promos N×M. El tope de descuento porcentual que
puede correr encima de una promo pasa de **10 % a 20 %**.

Esto **revierte** la decisión del 20/8/2026 ("los cupones de % no se combinan con
la promo"), que está documentada en `config/pricing.js`. El comentario tiene que
quedar actualizado, no borrado: dice qué se decidió y cuándo, y ahora dice que
cambió y por qué.

Efecto concreto — ⚠️ **los números de la pregunta original estaban mal** y se
corrigieron al verificarlos contra el motor real: el 10 % por transferencia
exige **10 calcos**, así que en un carrito de 3 no corre.

Con **3 calcos** de una categoría del 2x1, transferencia + `EPICA10`:

| | Cálculo | Total |
|---|---|---|
| Antes | 1 gratis, cupón **anulado** por la promo | $3.200 |
| Ahora | 1 gratis + 10 % del cupón | **$2.880** |

Con **12 calcos** (que sí cruzan el umbral), transferencia + `EPICA10`:

| | Cálculo | Total |
|---|---|---|
| Antes | 4 gratis + 10 % (solo transferencia) | $11.520 |
| Ahora | 4 gratis + 20 % (transferencia + cupón) | **$10.240** |

La decisión no cambia —el cupón ahora acumula y el tope es 20 %—, pero el costo
real por carrito chico es menor de lo estimado.

### RF-8 — Sin fecha de fin *(decisión de Mariano, 07/09/2026)*
Las tres promos arrancan al deployar y **no tienen `endsAt`**. Se apagan con su
interruptor manual.

**Consecuencia aceptada**: sin fecha de fin **no hay cuenta regresiva posible**
en el banner de promos. La urgencia del sitio pasa a estar únicamente en el
cupón de 10 minutos.

---

## 8. Requisitos no funcionales

- **RNF-1 — Paridad de precios.** Todo lo de acá está espejado en
  `netlify/functions/lib/pricing.js`. Un desvío rechaza checkouts con
  `price_mismatch` (regla 11).
- **RNF-2 — Mobile-first.** El contador tiene que ser legible a 375 px y no
  puede empujar el botón de confirmar fuera de la pantalla.
- **RNF-3 — El tracking no puede romper la compra.** Todo evento nuevo va
  envuelto en `try/catch` a través de `lib/analytics.js` (regla 13).
- **RNF-4 — Interruptor de una línea.** Apagar cualquiera de las tres promos
  tiene que ser un cambio de una línea de cada lado del espejo.
- **RNF-5 — Accesibilidad.** El contador se anuncia una sola vez a lector de
  pantalla, no en cada tick (mismo criterio que `AnnouncementBar`).

---

## 9. Reglas de negocio

| Regla | Valor |
|---|---|
| 3x2: alcance | `sticker` + `custom` |
| 2x1: categorías | `anime`, `argentina`, `disney`, `frases` |
| Prioridad de reparto | 2x1 primero; sobrantes al 3x2 |
| Unidad regalada | Siempre la **más barata** de la bolsa (regla vigente del repo) |
| Tope de % sobre promo | **20 %** (era 10 %) |
| `EPICA10` | 10 % · acumula · vence 10 min después de emitido |
| `EPI50` | Sin cambios: `exclusivo`, anula todo |
| Envío gratis | Sin cambios: solo por umbral ($50.000 Rosario / $75.000 país) |
| Fin de las promos | Manual, vía interruptor |

---

## 10. Edge cases

| Caso | Qué tiene que pasar |
|---|---|
| Carrito con 1 calco de una categoría 2x1 | No hay par; esa unidad va a la bolsa del 3x2 |
| Carrito con 2 Disney y nada más | 1 gratis (2x1) |
| Carrito con 2 Disney + 1 anime | Ambas categorías van a la misma bolsa 2x1: 3 unidades → 1 par + 1 sobrante → 1 gratis, y el sobrante va al 3x2 (solo, no alcanza) |
| Carrito 100 % digital | Ninguna promo aplica; ya pasa hoy |
| `EPI50` aplicado | Anula 3x2, 2x1 y el 10 % — corre solo su 50 % |
| Cupón vencido a mitad del checkout | El total sube mientras la persona completa el formulario. **Riesgo de conversión, ver §12** |
| Reloj del cliente adelantado/atrasado | El servidor valida contra su propio reloj con tolerancia; ver `design.md` §6 |
| Carrito guardado en `localStorage` antes de la promo | El precio se deriva en cada render, nunca se persiste. Ya está resuelto así |
| Las tres promos activas a la vez | El banner del header hoy es un `if/else`: muestra **una sola**. Ver pregunta abierta en `design.md` |

---

## 11. Analytics

Eventos nuevos, todos a través de `lib/analytics.js` (regla 13):

| Evento | Cuándo | Para qué |
|---|---|---|
| `cupon_emitido` | El popup entrega el código | Denominador de la ventana de 10 min |
| `cupon_vencido` | El contador llega a cero con el cupón sin usar | Medir cuánta gente pierde la ventana |
| `cupon_aplicado_en_promo` | Se usa `EPICA10` con una promo N×M corriendo | Medir el costo real de la acumulación (RF-7) |
| `promo_unlock` (ya existe) | Se completa un par 2x1 o un trío 3x2 | Distinguir qué promo mueve más |

El evento `promo_unlock` ya existe y recibe `promo` + `umbral`: se reusa
distinguiendo `2x1` de `3x2`, no se crea uno nuevo.

---

## 12. Riesgos declarados

1. **El cupón puede vencer mientras la persona completa el checkout.** Diez
   minutos incluyen elegir diseños, revisar el carrito y tipear nombre, mail,
   teléfono, dirección, ciudad y CP. Si vence a mitad del formulario, el total
   sube solo y la compra se cae. Es el riesgo más concreto de esta spec.
   Mitigación propuesta en `design.md` §7.

2. **La acumulación cuesta margen real.** RF-7 regala $320 más por cada 3 calcos
   de 6 cm frente al esquema de hoy. Está aceptado explícitamente.

3. **Sin fecha de fin, una promo se olvida prendida.** Ya pasó con `EPICA10`,
   que no vence desde que existe. Mitigación: el interruptor tiene que ser
   trivial de encontrar y estar documentado en `business-rules.md`.

4. **El vencimiento por usuario es falsificable.** El timestamp lo guarda el
   navegador. Aceptado: hoy el cupón no vence nunca, así que aun falsificado no
   se queda peor que ahora.
