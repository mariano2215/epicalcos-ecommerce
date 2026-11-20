# Requirements — Fecha límite real para Navidad

| | |
|---|---|
| **Spec** | `042-fecha-limite-navidad` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> ⏰ **Tiene fecha**: para que sirva tiene que estar publicada antes del 1/12/2026.

---

## 1. Problema

En diciembre la pregunta de compra es "¿llega antes del 24?". Hoy el sitio da
plazos genéricos ("2 a 3 días hábiles en Rosario", "5 a 7 al interior") y deja la
cuenta al cliente, con el feriado del 8/12 en el medio.

La única urgencia que el sitio puede decir sin mentir es una fecha límite real.
Al mismo tiempo, la promo de 100 decía "por tiempo limitado" sin fecha (ya
corregido el 20/11/2026): una fecha verdadera reemplaza esa urgencia falsa.

## 2. Objetivo

Que quien compra para regalar sepa, en el anuncio superior, en la ficha y en el
checkout, hasta qué día puede pedir para recibir antes de Navidad en su zona.

**Cómo se sabrá que funcionó**: pedidos web del 1 al 17/12 contra los mismos días
de noviembre, y cero reclamos de "no llegó para Navidad" por pedidos hechos antes
de la fecha publicada.

## 3. Scope

- [ ] Tira de anuncios: una frase con las fechas, mientras alguna esté vigente.
- [ ] Ficha de producto: una línea junto a los plazos de entrega.
- [ ] Checkout: la fecha de la zona elegida, junto al plazo de entrega.
- [ ] Fechas distintas para pedidos de 100 calcos o más (producción de 3 a 5 días).
- [ ] Después de cada fecha, el aviso de esa zona desaparece solo.

## 4. Fuera de scope

- Precios, promos o un pack de Navidad (spec 041).
- Cambiar los plazos publicados de producción o entrega.
- Envío exprés u otra tarifa.

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Quien compra para regalar | Sabe si llega |
| Mariano / producción | Se compromete a fechas concretas en diciembre |

## 6. User stories

- Como comprador del interior, quiero saber hasta cuándo puedo pedir para que
  llegue antes del 24, para no comprar algo que no llega.

## 7. Requisitos funcionales

- **RF-1** Fechas propuestas (P-1), calculadas con los plazos publicados, que ya
  incluyen la producción, más un margen de diciembre:

  | Destino | Plazo publicado | Margen | Pedir hasta |
  |---|---|---|---|
  | Interior | 7 días hábiles | +2 | **jueves 10/12** |
  | Rosario (envío) | 3 días hábiles | +1 | **jueves 17/12** |
  | Retiro en Rosario | 3 días de producción | +0 | **viernes 18/12** |
  | 100+ calcos, interior | 5 de producción + ~4 de correo | +2 | **viernes 4/12** |
  | 100+ calcos, Rosario | 5 de producción + 1 | +1 | **lunes 14/12** |

  Cuenta: días hábiles, sin sábados ni domingos, sin el feriado del 8/12 y, si se
  confirma, sin el día no laborable del 7/12 (P-2). Entrega límite: miércoles 23/12.
- **RF-2** La frase de la tira dice las dos fechas principales: "🎄 Para Navidad:
  pedí hasta el 10/12 al interior y el 17/12 en Rosario".
- **RF-3** En el checkout la fecha corresponde a la zona y a la cantidad de
  calcos del carrito.
- **RF-4** Pasada una fecha, la frase deja de mencionarla; pasadas todas, no hay
  aviso de Navidad.
- **RF-5** Las fechas no se escriben en los componentes: salen de un solo lugar
  de configuración.

## 8. Requisitos no funcionales

- Las fechas se evalúan en hora de Argentina (UTC−3), con corte a las 23:59.
- La frase entra en la tira sin agrandarla.

## 9. Reglas de negocio

- La fecha es un compromiso: si producción no puede cumplirla, se adelanta, nunca
  se atrasa después de publicada.
- La fecha no habilita ningún descuento.

## 10. Edge cases

- Carrito con 99 calcos + 1 personalizado: cuenta como 100 (la regla de
  `produccionVolumenDesde` cuenta calcos, no líneas).
- Productos digitales: sin aviso.
- Visitante que entra el 10/12 a las 23:30: todavía ve la del interior.

## 11. Analytics necesarios

- Sin eventos nuevos. Se lee con pedidos por día del 1 al 24/12 en el CRM.

## 12. Preguntas abiertas

- [ ] **P-1** ¿Confirmás las cinco fechas de RF-1? ¿Las confirmaste con el
      correo para diciembre?
- [ ] **P-2** ¿El 7/12/2026 trabaja el taller y trabaja el correo? (figura como
      día no laborable con fines turísticos; confirmar).
- [ ] **P-3** ¿Hasta qué día se puede retirar en Rosario antes de Navidad?

> Nota: el Plan de conversión del 20/11/2026 decía 9/12 (interior) y 15/12
> (Rosario) porque sumó la producción dos veces. Esas fechas eran más tempranas,
> o sea, ciertas, pero cortaban días de venta.
