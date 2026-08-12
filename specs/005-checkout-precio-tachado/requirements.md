# Requirements — Precio tachado y % de descuento en el checkout

| | |
|---|---|
| **Spec** | `005-checkout-precio-tachado` |
| **Estado** | `READY FOR REVIEW` |
| **Fecha** | 12/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

El resumen "Tu pedido" del checkout **lista los ítems a precio de lista** y
compensa todo junto abajo, con una sola línea "Descuento −$X".

Con la promo ARGENTINA 50% activa, un calco de $1.600 se ve así:

| Pantalla | Lo que ve el cliente |
|---|---|
| Grilla y ficha | $800 |
| Carrito | ~~$1.600~~ **$800** |
| **Checkout** | **$1.600** + una línea "Descuento −$800" abajo |

El total es correcto. La **presentación** es la que contradice: el precio por
línea *sube* justo en el paso previo a pagar, y el cliente tiene que hacer la
resta él para comprobar que le están cobrando lo que vio.

Esto quedó anotado como hallazgo fuera de scope de la spec 001 (`tasks.md`,
*Hallazgos*), que arregló el carrito pero declaró el checkout fuera de alcance.

### El segundo daño: la transferencia no se ve

El 10 % por transferencia se aplica **por línea** en el cálculo, pero como las
líneas se muestran a precio de lista, cambiar de Mercado Pago a transferencia
**no mueve ningún número visible** salvo el total y la línea de descuento. El
descuento que más margen defiende (no paga comisión de MP) es el que peor se
comunica.

### Qué NO es el problema

Los números que se cobran están bien. `pricedItems` ya calcula el precio real de
cada línea y es **ese** el que viaja al servidor. Esto es un problema de
presentación, no de precios.

---

## 2. Objetivo

Que el checkout muestre por línea el **mismo precio que el carrito**: el de
lista tachado, el real al lado, y el porcentaje de descuento que se aplicó.

**Cómo se sabrá que funcionó**: con la misma promo activa, la cifra por línea
del carrito y la del checkout son idénticas; y elegir transferencia baja los
precios de las líneas a la vista.

---

## 3. Scope

- [ ] El bloque "Tu pedido" del checkout: precio unitario y total por línea
- [ ] El porcentaje de descuento de cada línea con descuento
- [ ] El subtotal y la línea de ahorro, para que sigan siendo coherentes con las
      líneas visibles
- [ ] Que todo lo anterior reaccione al cambio de medio de pago y de cupón

---

## 4. Fuera de scope

- [ ] El carrito y el drawer — ya muestran el tachado (spec 001)
- [ ] La grilla, la ficha y las cards de packs
- [ ] El mail al cliente, el aviso interno y el CRM: siguen mostrando lo que
      muestran hoy
- [ ] **El payload que se manda al servidor**: no se toca ni un campo
- [ ] Mostrar el descuento que los packs y la promo negocio ya traen adentro de
      su precio (hoy no es visible en ninguna pantalla; sería otra spec)
- [ ] Unificar en un componente el precio tachado que hoy está duplicado en el
      carrito y el drawer

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra con una promo activa | Ve el descuento aplicado línea por línea, no como una resta al final |
| Cliente que paga por transferencia | Ve bajar los precios al elegir el medio de pago |
| Cliente sin ningún descuento | No ve ningún cambio |
| Mariano | Un motivo menos de "¿por qué me aparece más caro en el checkout?" por WhatsApp |

---

## 6. User stories

**US-1** — Como cliente que entró por un anuncio de la promo, quiero ver en el
checkout el mismo precio con descuento que vi en el carrito, para no dudar de
que el descuento se aplicó.

**US-2** — Como cliente indeciso entre Mercado Pago y transferencia, quiero ver
cuánto baja cada ítem al elegir transferencia, para decidir con el número a la
vista.

**US-3** — Como cliente al que le aplicaron varias promos, quiero ver el
porcentaje que me quedó en cada línea, para entender qué me descontaron.

---

## 7. Requisitos funcionales

| ID | Requisito |
|---|---|
| **RF-1** | Una línea cuyo precio real sea **menor** al de lista muestra el de lista **tachado** y el real destacado. |
| **RF-2** | Esa misma línea muestra el **porcentaje** de descuento aplicado, redondeado a entero. |
| **RF-3** | Una línea **sin** descuento muestra una sola cifra, exactamente como hoy. |
| **RF-4** | El precio **unitario** que se muestra en la línea también es el real, no el de lista. |
| **RF-5** | La suma de los totales de línea visibles es **igual** al subtotal que se muestra. |
| **RF-6** | El ahorro total se sigue mostrando y **sigue nombrando la promo** que lo generó (3x2, ARGENTINA 50%, cupón, 10 % transf.), como quedó en la spec 001. |
| **RF-7** | Cambiar el medio de pago o aplicar/quitar un cupón actualiza inmediatamente las cifras de todas las líneas. |
| **RF-8** | El **total a pagar** no cambia en ningún caso respecto de hoy. |

---

## 8. Requisitos no funcionales

| ID | Requisito |
|---|---|
| **RNF-1** | El payload que se manda a `create-preference` y `create-order-transfer` no cambia en ningún campo. |
| **RNF-2** | Ningún cálculo de precio se modifica: la feature solo lee lo que ya se calcula. |
| **RNF-3** | En 375 px las dos cifras entran en la línea sin romper el layout ni empujar el botón de pagar. |
| **RNF-4** | Accesibilidad: el lector de pantalla lee **el precio vigente**, no los dos números seguidos. |
| **RNF-5** | Sin dependencias nuevas. |
| **RNF-6** | Sin pasos, campos ni clicks nuevos en el camino de compra (`CLAUDE.md` regla 12). |

---

## 9. Reglas de negocio

- **Precio de lista** es el precio sin promos ni medio de pago: el que ya guarda
  cada línea del carrito.
- **Los archivos imprimibles no tienen descuento nunca** (precio fijo): su línea
  no lleva tachado jamás.
- **Los packs y la promo negocio traen el descuento adentro de su precio de
  lista**: tampoco llevan tachado. Es el comportamiento de hoy en el carrito y
  se mantiene igual, a propósito (fuera de scope).
- **El porcentaje que se muestra es el resultante de la línea**, no la suma de
  las promos: el cálculo real está topeado y las promos N x M se prorratean.
- El descuento por transferencia y el cupón **no se suman**: se aplica el mayor.
  Esta regla no cambia; solo se hace visible.

### ⚠️ Espejo de precios

Esta spec **no toca ninguna regla de precio**, ni del lado del cliente ni del
servidor. Si en la implementación aparece la necesidad de cambiar un cálculo,
**es señal de que el diseño está mal**: hay que volver acá.

---

## 10. Edge cases

| Caso | Qué debe pasar |
|---|---|
| Promo **3x2** activa | El precio por línea es el prorrateado (así se cobra). El % que se muestra es el que resulta de esa línea (≈33 %). |
| Cupón **2x1** (bundle) | Igual que el 3x2: se muestra el prorrateo real, ≈50 %. |
| Promo ARGENTINA 50 % **+** transferencia | Se muestra el porcentaje final resultante, no "50 % + 10 %". |
| Descuento que redondea a $0 de diferencia | No se muestra tachado (no hay descuento que mostrar). |
| Descuento menor a 1 % | El porcentaje redondea a 0: no se muestra el %, pero sí el tachado si el precio bajó. |
| Línea con cantidad > 1 | El tachado y el precio real son los del **total de la línea**; el unitario también se muestra con descuento. |
| Carrito solo de imprimibles | Ninguna línea con tachado y ninguna línea de ahorro. |
| Pack con envío incluido | Sin tachado, como hoy. |
| Carrito vacío | No aplica: el checkout ya redirige. |

---

## 11. Analytics necesarios

### Eventos nuevos
Ninguno. Es un cambio de presentación: no ocurre una acción comercial nueva.

### Eventos existentes que cambian
Ninguno. `begin_checkout` ya se dispara con los ítems **repreciados**
(`pricedItems`), así que el valor que reporta hoy ya es el real. Hay que
verificar que siga saliendo una sola vez y con el mismo valor.

### Qué se quiere poder responder
- ¿Cambió la tasa checkout → compra después del cambio?
- ¿Aumentó la proporción de pedidos por transferencia al hacerse visible el 10 %?

Las dos se responden con los eventos que ya existen (`begin_checkout`,
`purchase`, y el medio de pago que ya viaja al CRM). **No hace falta instrumentar
nada nuevo.**

---

## 12. Preguntas abiertas

1. **¿El subtotal pasa a ser el de lista o el real?** Si las líneas muestran el
   precio con descuento, un "Subtotal" a precio de lista deja de ser la suma de
   lo que se ve (RF-5). La propuesta está en `design.md` §1; **necesita tu OK**
   porque cambia cómo se lee el bloque de totales.
2. **¿El ahorro sigue restándose o pasa a ser informativo?** Va con la anterior.
3. **¿El porcentaje va en la línea o alcanza con el tachado?** El tachado ya
   comunica "esto está rebajado"; el % agrega cuánto. Pedido explícitamente,
   así que entra — pero si en 375 px queda apretado, el % es lo primero que se
   sacrifica.
