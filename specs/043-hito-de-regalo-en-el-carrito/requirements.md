# Requirements — Calco sorpresa a mitad de camino

| | |
|---|---|
| **Spec** | `043-hito-de-regalo-en-el-carrito` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** · 🎁 **es una promo: necesita aprobación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

La única meta del carrito es el envío gratis, y para un carrito chico queda
lejos: con 1 calco la barra dice "te faltan $32.900" y queda al 6 %. El ticket
típico de septiembre fue ~$17.500 (mediana, CRM). Los umbrales no se mueven
(decisión del 11/8/2026), así que falta una meta **alcanzable** antes.

## 2. Objetivo

Que la barra del carrito tenga un premio a mitad de camino, cerca del ticket
típico, que no toque ningún precio ni el envío.

**Cómo se sabrá que funcionó**: sube el % de pedidos entre $20.000 y $35.000 y
las calcos por pedido, 6 semanas contra 6.

## 3. Scope

- [ ] Al pasar $20.000, una calco de 6 cm elegida por EPICALCOS viaja de regalo.
- [ ] La barra del carrito muestra el hito antes del envío gratis.
- [ ] El pedido le avisa a producción que lleva el regalo.

## 4. Fuera de scope
- Envío gratis o cambios de umbral.
- Elegir el diseño del regalo (lo elige EPICALCOS).

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Comprador | Tiene una meta cercana |
| Producción | Suma una calco a los pedidos que califican |

## 7. Requisitos funcionales

- **RF-1** Se mide sobre el total de productos físicos **después** de descuentos
  (igual que el envío), sin contar el envío.
- **RF-2** Barra con dos hitos: "🎁 Calco sorpresa a $20.000" y "🚚 Envío gratis
  a $35.000 / $55.000".
- **RF-3** Al cruzar el hito, una vez por sesión, un aviso corto: "Ganaste una
  calco sorpresa".
- **RF-4** El servidor decide si el pedido califica, con su propia cuenta, y lo
  anota en el pedido (mail interno y CRM). La página no puede forzarlo.
- **RF-5** Ningún precio cambia y el regalo no es una línea con precio.

## 9. Reglas de negocio
- Un regalo por pedido, sin importar cuánto pase del umbral.
- Pedidos 100 % digitales: no aplica.
- No acumula con otro regalo vigente (EPICYBER, ya vencido): si hubiera dos,
  viaja el de mayor valor.

## 10. Edge cases
- Pedido de $19.999 por transferencia que en lista era $22.000: **no** califica
  (RF-1). El carrito tiene que decir "con transferencia te faltan $1".
- Pedido que se cae en Mercado Pago: el regalo no se anota hasta que se paga.

## 11. Analytics necesarios
- `hito_regalo_alcanzado` (monto, calcos). Por `lib/analytics.js`.

## 12. Preguntas abiertas
- [ ] **P-1** ¿Aprobás el regalo y el umbral de $20.000?
- [ ] **P-2** ¿Cuánto cuesta producir y empacar esa calco extra?
- [ ] **P-3** ¿Se mide antes o después de la transferencia? (propuesta: después,
      como el envío, para que el mensaje del carrito sea uno solo)
