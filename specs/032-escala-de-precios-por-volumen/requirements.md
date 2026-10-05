# Requirements — Escala de precios por volumen

| | |
|---|---|
| **Spec** | `032-escala-de-precios-por-volumen` |
| **Estado** | `APPROVED` — tabla (opción B) y preguntas aprobadas por Mariano el 05/10/2026. **Sigue sin autorizar la implementación**: falta el "Implementá la spec 032" |
| **Fecha** | 05/10/2026 |
| **Autor** | Claude Code, a partir de la respuesta de Mariano a la spec 031 (N-1) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

> **Pedido de Mariano (5/10/2026)**, respondiendo a N-1 de la spec 031:
> *"Escala de precios por volumen, sí, tiene que diferenciarse que mientras más
> cantidad, más barato te sale, lo único que se mantiene es la calidad. Poner el
> % de descuento según el monto que se haga por cada cantidad."*

Es la spec de precios que la 031 dejó fuera de su scope a propósito: un cambio
de precio se aprueba con la tabla a la vista **antes** de publicarse
(precedente: specs 027 y 029).

---

## 1. Problema

Desde 100 unidades, una calco cuesta lo mismo con 100, 250, 500 o 1.000: $530
en 4 y 6 cm, $1.325 en 9 cm, $730 en holográfico (spec 031, `AUDIT.md` H-1).
Al que pide 1.000 no se le da ningún motivo para no pedir 100 diez veces, y el
sitio no puede decir "mientras más cantidad, más barato" sin mentir.

Además, cada camino de compra de 100+ cobra con una regla distinta (Promo
Negocio, promo x100, pack mayorista, pack holográfico, configurador). No hay
**una** lista de precios para negocios.

---

## 2. Objetivo

Una lista de precios por volumen, única para todo el sitio, donde **cada
escalón cuesta menos por calco que el anterior** y muestra su % de descuento,
sin tocar el precio de 100 que ya se cobra hoy.

**Cómo se sabrá que funcionó**
- Ningún camino del sitio cobra 250, 500 o 1.000 calcos más caro que la escala.
- El ticket promedio de los pedidos de 100+ sube contra las 4 semanas previas
  (pedidos que pasan de 100 a 250+).
- Ningún checkout rechazado con `price_mismatch` por la escala.

---

## 3. Scope

- [ ] Escalones de **100, 250, 500 y 1.000** calcos, en **4 y 6 cm** y
      material (vinilo blanco, DTF UV, vinilo holográfico). **Sin 9 cm** (§9.4)
- [ ] El precio de **100** es el que se cobra hoy, en cada tamaño y material
- [ ] Cada escalón muestra su **% de descuento** contra el de 100; el de 100
      muestra **MUESTRA GRATIS** (§9.2)
- [ ] Cantidades entre escalones (ej. 300), para los caminos que permiten
      cantidad libre
- [ ] Más de 1.000: sin precio online, se pide presupuesto (spec 031, N-8)
- [ ] Usan la escala: el cotizador de la spec 031, el armador de `/mayorista`
      con 100+ y el configurador de `/personalizados` con 100+
- [ ] Los carritos guardados se re-precian solos si la escala cambia

---

## 4. Fuera de scope

- [ ] El precio de la calco **suelta** (de 1 a 99) y del catálogo
- [ ] El 20 % por transferencia (sigue igual y corre encima de la escala)
- [ ] Envíos y umbrales: la escala paga envío según el umbral, como todo
- [ ] Cupones y promos N×M: no alcanzan a la escala (como hoy a los packs)
- [ ] Más de 1.000 online
- [ ] Borrar la Promo Negocio, la promo x100 o el pack mayorista: siguen
      existiendo para los carritos guardados y sus páginas (§9.3)
- [ ] El diseño de la sección de la escala en la web: lo define la spec 031

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Negocio que compra 250+ | Paga menos por calco que hoy |
| Negocio que compra 100 | Paga lo mismo que hoy |
| Cliente B2C (menos de 100) | No afectado |
| Cliente con carrito guardado | Sus líneas viejas siguen valiendo; si tiene una línea de la escala y la escala cambia, se re-precia sola |
| Mariano | Una sola lista de precios para negocios; el mail y el CRM muestran "Escala · 500 calcos · 6 cm · Vinilo blanco" |
| Mercado Pago / Meta | Un producto más (mismo SKU que Negocio en el catálogo de Meta) |

---

## 6. User stories

- **US-1** — Como negocio, quiero ver que 500 calcos me salen menos por unidad
  que 250, y cuánto menos, para decidir cuántas pedir.
- **US-2** — Como negocio que arma su pedido en `/mayorista`, quiero pagar lo
  mismo que en el cotizador por la misma cantidad.
- **US-3** — Como Mariano, quiero cambiar un escalón tocando un número en un
  solo lugar (más su espejo) y que todo el sitio lo refleje.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Existe una tabla de precios por escalón (100 / 250 / 500 / 1.000) para 4 y 6 cm y cada material, con los valores aprobados en §9.1. **No hay 9 cm** | 🔴 must |
| RF-2 | El precio por calco **baja** en cada escalón, en todos los tamaños y materiales | 🔴 must |
| RF-3 | Cada escalón de 250+ tiene un **% de descuento contra el de 100** calculado a partir de su monto (§9.2), nunca escrito a mano. El de 100 no muestra % | 🔴 must |
| RF-4 | Entre dos escalones se cobra el precio por calco del escalón alcanzado; si llevar el escalón siguiente cuesta lo mismo o menos, se cotiza el siguiente y el cliente se lleva esa cantidad ("pedís 240, te llevás 250 por $X") | 🔴 must |
| RF-5 | Agregar una calco nunca baja el total del pedido (no hay "saltos" donde 249 cuesta más que 250) | 🔴 must |
| RF-6 | Vinilo blanco y DTF UV valen lo mismo; vinilo blanco es el recomendado (§9.3) | 🔴 must |
| RF-7 | El holográfico existe solo en 4 y 6 cm y su precio de escalón ya incluye el recargo del material | 🔴 must |
| RF-8 | Los pedidos se pueden hacer con **uno o varios diseños** al mismo precio de escalón (como la promo x100 de hoy) | 🔴 must |
| RF-9 | El servidor cobra exactamente lo mismo que muestra el sitio, para cada tamaño, material y cantidad de 100 a 1.000; si no coincide, rechaza | 🔴 must |
| RF-10 | El 20 % por transferencia corre encima del precio de la escala | 🔴 must |
| RF-11 | Ni cupones ni promos N×M alcanzan a la escala | 🔴 must |
| RF-12 | El armador de `/mayorista` con 100 o más calcos cobra con la escala y **no ofrece 9 cm** | 🔴 must |
| RF-13 | El configurador de `/personalizados` con 100 o más calcos en 4 o 6 cm (uno o varios diseños) cobra con la escala; en 9 cm se cobra suelta y sugiere 4 o 6 cm | 🔴 must |
| RF-14 | Un carrito guardado con una línea de la escala se re-precia al cargar si la escala cambió | 🔴 must |
| RF-15 | El escalón de 100 queda **debajo** del umbral nacional de envío gratis (regla del 1/10/2026) | 🔴 must |
| RF-16 | En el mail al vendedor y en el CRM, la línea dice escalón, cantidad, tamaño, material y cuántos diseños | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | Paridad | un test recorre todas las cantidades de 100 a 1.000 × tamaño × material y compara cliente y servidor |
| RNF-2 | Compatibilidad | ninguna línea existente cambia de forma ni de precio |
| RNF-3 | Un solo lugar | la escala vive en un objeto del config (más su espejo); ningún componente escribe un monto |
| RNF-4 | Sin dependencias nuevas | — |

---

## 9. Reglas de negocio

### 9.1 La tabla — ✅ aprobada por Mariano el 05/10/2026 ("Opción B")

Base: el precio de 100 que se cobra hoy, que pasa a ser **el precio fijo de
negocio** (P-3). Cada escalón baja el precio **por calco** 10 / 20 / 30 %
contra el de 100. Montos redondeados a …999 (criterio de las specs 027/029).
Precios de Mercado Pago; por transferencia, −20 % encima.

**Solo 4 y 6 cm** (P-6: *"Sacar 9 cm de calcos mayoristas"*).

| Cantidad | 4 y 6 cm (vinilo blanco o DTF UV) | por calco | Se muestra | Por transferencia |
|---|---|---|---|---|
| 100 | **$52.999** | $530 | **MUESTRA GRATIS** (sin %) | $42.399 ($424 c/u) |
| 250 | **$118.999** | $476 | **10 % OFF** | $95.199 ($381 c/u) |
| 500 | **$211.999** | $424 | **20 % OFF** | $169.599 ($339 c/u) |
| 1.000 | **$370.999** | $371 | **30 % OFF** | $296.799 ($297 c/u) |

| Cantidad | Holográfico (4 y 6 cm) | por calco | Se muestra | Por transferencia |
|---|---|---|---|---|
| 100 | **$72.999** | $730 | **MUESTRA GRATIS** (sin %) | $58.399 ($584 c/u) |
| 250 | **$163.999** | $656 | **10 % OFF** | $131.199 ($525 c/u) |
| 500 | **$291.999** | $584 | **20 % OFF** | $233.599 ($467 c/u) |
| 1.000 | **$510.999** | $511 | **30 % OFF** | $408.799 ($409 c/u) |

Descartada: la opción A (−10 / −15 / −20 %).

Verificado con un script sobre esta tabla (5/10/2026): el precio por calco baja
en cada escalón y, de 100 a 1.000, agregar calcos nunca baja el total.

### 9.2 El % que se muestra — ✅ resuelto

**Contra el precio de 100**, derivado del monto de cada escalón:
`round((1 − (total / cantidad) / (total100 / 100)) × 100)` → 10 / 20 / 30 %.
El escalón de 100 **no muestra descuento**: muestra **MUESTRA GRATIS** (la
vista previa digital que define la spec 031). Vale igual para vinilo blanco,
DTF UV y holográfico.

### 9.3 Materiales

- **Vinilo blanco y DTF UV valen lo mismo** (P-4). **Vinilo blanco es el
  recomendado** para calcos: es el que aparece elegido por defecto y con la
  etiqueta "Recomendado".
- Holográfico: su propia fila, recargo incluido, 4 y 6 cm.

### 9.4 Sin 9 cm en la venta por mayor

- La escala no tiene 9 cm: el cotizador no lo ofrece y el servidor rechaza una
  línea de escala en 9 cm.
- El armador de `/mayorista` deja de ofrecer 9 cm.
- La calco de 9 cm **suelta** sigue a la venta como hoy (catálogo y
  `/personalizados`). En `/personalizados`, con 100 copias o más en 9 cm, no
  hay precio por volumen: se cobra suelta y se sugiere 4 o 6 cm.
- El servidor **sigue aceptando** `pack:mayorista:9cm`, para no trabar los
  carritos guardados que la tengan.

### 9.5 Cómo convive con lo que ya existe

| Producto de hoy | Qué pasa |
|---|---|
| Promo Negocio (100, 1 diseño, 6 cm) | Sigue igual: vale lo mismo que el escalón de 100 |
| Promo x100 (100 exactas, 4 y 6 cm) | Ídem. $52.999 por 100 en 4 y 6 cm es el **precio fijo** (P-3): ya no depende del interruptor de la promo |
| Pack mayorista 50 % | El armador pasa a la escala con 100+ (4 y 6 cm) y deja de ofrecer 9 cm |
| Pack holográfico (100, 4 y 6 cm) | Vale lo mismo que el escalón de 100 |
| Configurador con 100+ copias | Pasa a la escala en 4 y 6 cm, con uno o varios diseños (arregla H-2 de la 031) |

### 9.6 Reglas que se respetan

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Precio de la calco suelta (incluida la de 9 cm) | `business-rules.md` §1 | no |
| 20 % por transferencia | §2 | no |
| Ninguna promo regala el envío | §5 | no |
| Envío gratis desde el umbral | §5 | no — 250+ lo cruza solo por monto, que es la regla |
| La promo de 100 y Negocio debajo del umbral nacional | `envio.test.js` | no — se suma el escalón de 100 al test |
| Nunca A/B de precios | §7 | no |

- [x] Requiere cambio espejado en `frontend/src/config/pricing.js` **y** `netlify/functions/lib/pricing.js`
- [ ] ~~Requiere cambio en envíos~~ — no
- [x] Requiere test de paridad nuevo

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| 240 calcos de 6 cm (opción A) | 240 × $530 = $127.198 > $118.999 → se cotiza el escalón de 250 y se lleva 250 |
| 300 calcos de 6 cm | 300 × ($118.999 / 250) = $142.799 (escalón 250, 10 % OFF) |
| 100+ en 9 cm | Sin escala: el cotizador no lo ofrece; el servidor rechaza `volumen:9cm…`; `/personalizados` lo cobra suelto |
| Carrito guardado con `pack:mayorista:9cm` | Se sigue pudiendo pagar |
| 99 calcos | No es escala: precio suelto (como hoy) |
| 1.001 calcos | Sin precio online → presupuesto |
| Escala cambia con un carrito guardado | La línea se re-precia al cargar; el checkout cobra la vigente |
| Un pedido mezcla la escala con calcos sueltas y cupón | El cupón alcanza solo a las sueltas; la transferencia a todo |
| Cliente manda un id de escala con cantidad 50 o 5.000 | El servidor rechaza |

---

## 11. Analytics

Sin eventos nuevos: la escala se ve en los eventos de la spec 031
(`cotizador_complete` con `cantidad` y `value`) y en `add_to_cart` /
`purchase` como cualquier línea. El `item_name` de la línea no lleva nombres
de archivo.

---

## 12. Preguntas

### Respondidas por Mariano el 05/10/2026

- [x] **P-1** — **Opción B** (−10 / −20 / −30 % por calco).
- [x] **P-2** — **No mostrar descuento en 100 calcos; agregar MUESTRA GRATIS.**
      El % se calcula contra el precio de 100.
- [x] **P-3** — **Sí, $52.999 por 100 es el precio fijado.**
- [x] **P-4** — **DTF UV y vinilo blanco salen lo mismo. Recomendar vinilo
      blanco.**
- [x] **P-6** — **Sacar 9 cm de calcos mayoristas** (§9.4).
- [x] "MUESTRA GRATIS" = **vista previa digital por WhatsApp antes de
      producir** (respuesta a la pregunta del 5/10/2026). Se define en la spec
      031.

### Con default (sin respuesta explícita)

- [ ] **P-5** — Precio también entre escalones, con el techo del escalón
      siguiente (RF-4). Si Mariano prefiere solo cantidades exactas, el
      armador y el configurador redondean al escalón.
