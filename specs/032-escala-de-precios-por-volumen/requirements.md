# Requirements — Escala de precios por volumen

| | |
|---|---|
| **Spec** | `032-escala-de-precios-por-volumen` |
| **Estado** | `READY FOR REVIEW` — falta que Mariano apruebe la tabla de §9.1 (opción A, B u otros %) y las preguntas de §12 |
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

- [ ] Escalones de **100, 250, 500 y 1.000** calcos, por tamaño (4, 6, 9 cm) y
      material (vinilo blanco, DTF UV, vinilo holográfico)
- [ ] El precio de **100** es el que se cobra hoy, en cada tamaño y material
- [ ] Cada escalón muestra su **% de descuento** (§9.2)
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
| RF-1 | Existe una tabla de precios por escalón (100 / 250 / 500 / 1.000) para cada tamaño y material que se vende, con los valores aprobados en §9.1 | 🔴 must |
| RF-2 | El precio por calco **baja** en cada escalón, en todos los tamaños y materiales | 🔴 must |
| RF-3 | Cada escalón tiene un **% de descuento** calculado a partir de su monto (§9.2), nunca escrito a mano | 🔴 must |
| RF-4 | Entre dos escalones se cobra el precio por calco del escalón alcanzado; si llevar el escalón siguiente cuesta lo mismo o menos, se cotiza el siguiente y el cliente se lleva esa cantidad ("pedís 240, te llevás 250 por $X") | 🔴 must |
| RF-5 | Agregar una calco nunca baja el total del pedido (no hay "saltos" donde 249 cuesta más que 250) | 🔴 must |
| RF-6 | Vinilo blanco y DTF UV valen lo mismo en todos los tamaños (como en la calco suelta) | 🔴 must |
| RF-7 | El holográfico existe solo en 4 y 6 cm y su precio de escalón ya incluye el recargo del material | 🔴 must |
| RF-8 | Los pedidos se pueden hacer con **uno o varios diseños** al mismo precio de escalón (como la promo x100 de hoy) | 🔴 must |
| RF-9 | El servidor cobra exactamente lo mismo que muestra el sitio, para cada tamaño, material y cantidad de 100 a 1.000; si no coincide, rechaza | 🔴 must |
| RF-10 | El 20 % por transferencia corre encima del precio de la escala | 🔴 must |
| RF-11 | Ni cupones ni promos N×M alcanzan a la escala | 🔴 must |
| RF-12 | El armador de `/mayorista` con 100 o más calcos cobra con la escala | 🔴 must |
| RF-13 | El configurador de `/personalizados` con 100 o más calcos (uno o varios diseños) cobra con la escala | 🔴 must |
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

### 9.1 La tabla — ⛔ requiere aprobación de Mariano antes de implementar

Base: el precio de 100 que se cobra **hoy** en cada tamaño (no cambia). Cada
escalón baja el precio **por calco** un % contra el de 100. Los montos se
redondean a …999 (criterio de las specs 027/029); el 100 de 9 cm se deja en el
valor de hoy. Precios de Mercado Pago; debajo, por transferencia (−20 %).

**Opción A — escalones de −10 % / −15 % / −20 % por calco** *(conservadora)*

| Cantidad | 4 y 6 cm | por calco | 9 cm | por calco | Holográfico (4 y 6 cm) | por calco |
|---|---|---|---|---|---|---|
| 100 | **$52.999** | $530 | **$132.500** | $1.325 | **$72.999** | $730 |
| 250 | **$118.999** | $476 | **$297.999** | $1.192 | **$163.999** | $656 |
| 500 | **$224.999** | $450 | **$562.999** | $1.126 | **$309.999** | $620 |
| 1.000 | **$423.999** | $424 | **$1.059.999** | $1.060 | **$583.999** | $584 |
| *1.000 por transferencia* | *$339.199* | *$339* | *$847.999* | *$848* | *$467.199* | *$467* |

**Opción B — escalones de −10 % / −20 % / −30 % por calco** *(más agresiva)*

| Cantidad | 4 y 6 cm | por calco | 9 cm | por calco | Holográfico (4 y 6 cm) | por calco |
|---|---|---|---|---|---|---|
| 100 | **$52.999** | $530 | **$132.500** | $1.325 | **$72.999** | $730 |
| 250 | **$118.999** | $476 | **$297.999** | $1.192 | **$163.999** | $656 |
| 500 | **$211.999** | $424 | **$529.999** | $1.060 | **$291.999** | $584 |
| 1.000 | **$370.999** | $371 | **$926.999** | $927 | **$510.999** | $511 |
| *1.000 por transferencia* | *$296.799* | *$297* | *$741.599* | *$742* | *$408.799* | *$409* |

> ⚠️ Desde acá no se puede validar el margen: los costos de producción no están
> en el repo (`business-rules.md` §10). La elección entre A, B u otros % es de
> Mariano. Cada escalón es **un** número en el config: cambiarlo después es
> barato.

> ⚠️ 4 y 6 cm valen lo mismo porque hoy la promo x100 cobra los dos a $52.999.
> Si se quiere que 4 cm sea más barato, es otra fila.

> ⚠️ 9 cm arranca en $132.500 (el pack mayorista de hoy, 50 % OFF): 2,5 veces el
> de 6 cm. Es lo que se cobra hoy; se señala porque en la tabla salta a la vista.

### 9.2 El % que se muestra

"El % de descuento según el monto de cada cantidad" admite dos lecturas. Las
dos salen del monto, ninguna se escribe a mano:

| Escalón (4 y 6 cm, opción A) | Contra la calco suelta ($2.100 en 6 cm) | Contra el precio de 100 |
|---|---|---|
| 100 | 75 % OFF | — (precio base) |
| 250 | 77 % OFF | 10 % menos por calco |
| 500 | 79 % OFF | 15 % menos por calco |
| 1.000 | 80 % OFF | 20 % menos por calco |

- **Contra la suelta** (recomendado): todos los escalones tienen un %, es la
  misma referencia que ya usa el configurador (la "suelta" es un precio real del
  sitio) y da los números más grandes. Contra: entre escalones el % se mueve
  pocos puntos, así que lo que muestra la escala es el **precio por calco**
  bajando.
- **Contra el precio de 100**: la escalera se lee sola (−10 / −15 / −20 %) y
  vale igual para todos los materiales, pero el de 100 no muestra ningún
  descuento.

Con la referencia "suelta", el holográfico es la excepción: no existe
holográfico suelto, así que muestra su % contra su escalón de 100, y lo dice el
texto.

### 9.3 Cómo convive con lo que ya existe

| Producto de hoy | Qué pasa |
|---|---|
| Promo Negocio (100, 1 diseño, 6 cm) | Sigue igual: vale lo mismo que el escalón de 100. Los carritos guardados siguen andando |
| Promo x100 (100 exactas, 4 y 6 cm) | Ídem. ⚠️ Con la escala, $52.999 por 100 en 4 y 6 cm pasa a ser **precio de lista permanente**, no "promo": apagar la x100 ya no lo sube (P-3) |
| Pack mayorista 50 % (9 cm, o 4/6 sin la x100) | Con 100+ el armador pasa a la escala. Hasta 249 en 9 cm cobra igual que hoy |
| Pack holográfico (100, 4 y 6 cm) | Ídem Negocio: el escalón de 100 vale lo mismo |
| Configurador con 100+ copias | Pasa a la escala, con uno o varios diseños (arregla el hallazgo H-2 de la 031) |

### 9.4 Reglas que se respetan

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Precio de la calco suelta | `business-rules.md` §1 | no |
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
| 300 calcos de 6 cm | 300 × ($118.999 / 250) = $142.799 (escalón 250) |
| 99 calcos | No es escala: precio suelto (como hoy) |
| 1.001 calcos | Sin precio online → presupuesto |
| Holográfico 9 cm | No se puede pedir; el servidor lo rechaza |
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

## 12. Preguntas abiertas

- [ ] **P-1** ¿Opción **A**, **B** u otros % por escalón? *(bloquea)*
- [ ] **P-2** ¿El % que se muestra es **contra la calco suelta** (recomendado) o **contra el precio de 100**? *(bloquea el copy, no el precio)*
- [ ] **P-3** Con la escala, $52.999 por 100 en 4 y 6 cm deja de ser "promo" y pasa a ser el precio de lista de negocio. ¿OK? *(si no, el escalón de 100 de 4 cm tendría que ser el del pack mayorista sin promo: $80.000)*
- [ ] **P-4** ¿DTF UV en **todos** los tamaños al precio del vinilo blanco (como en la suelta)? Hoy con 100+ solo existe en 6 cm con un diseño
- [ ] **P-5** ¿Precio también entre escalones (RF-4, para el armador y el configurador) o **solo** 100 / 250 / 500 / 1.000 exactos? Recomendado: entre escalones, con el techo del escalón siguiente
