# Requirements — Reseñas reales con foto

| | |
|---|---|
| **Spec** | `044-resenas-con-foto` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** · 💲 **incluye un cupón: necesita aprobación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

- El sitio tiene **0 reseñas propias de producto**. La ficha muestra el mismo
  testimonio (Gokú) en todos los diseños, y el Home tres testimonios de texto
  sin foto.
- Pasar de 0 a 5 reseñas sube la probabilidad de compra ~270 % (Spiegel 2017),
  y las fotos de clientes suben la conversión ~2,5 % (PowerReviews, proveedor).
- No hay ningún motivo para volver a comprar: el CRM no tiene segunda compra
  inducida.

## 2. Objetivo

Juntar fotos y reseñas reales de cada pedido entregado y usarlas en la ficha, la
categoría y los anuncios, a cambio de un 10 % para la próxima compra.

**Cómo se sabrá que funcionó**: 5 reseñas con foto en 30 días y 50 en 90; % de
clientes con segunda compra.

## 3. Scope
- [ ] Pedido de reseña a los 7 días de entregado (mail; WhatsApp a mano en la
      fase 1).
- [ ] Formulario simple: foto, estrellas, una frase, permiso para publicar.
- [ ] Moderación por Mariano antes de publicar.
- [ ] Mostrar las reseñas aprobadas en la ficha (del diseño o de la categoría) y
      en "Así quedan".
- [ ] Cupón de 10 % de un solo uso para quien responde, opine lo que opine.
- [ ] Fase 1 inmediata y manual: pedirle una foto a los clientes de septiembre a
      noviembre.

## 4. Fuera de scope
- Estrellas en Google (`AggregateRating`) hasta tener reseñas reales.
- Responder reseñas en público.

## 7. Requisitos funcionales
- **RF-1** El mail sale una sola vez por pedido, 7 días después de "entregado"
  en el CRM, y se puede dar de baja.
- **RF-2** La reseña se guarda sin publicarse; Mariano la aprueba o la descarta.
- **RF-3** El cupón se entrega al enviar, **sin importar la nota** (premiar solo
  las buenas es comprar reseñas y lo prohíbe Lealtad Comercial).
- **RF-4** La ficha muestra hasta 5 reseñas del diseño o, si no hay, de la
  categoría, con foto, nombre de pila e inicial y fecha.
- **RF-5** Nunca se publica una reseña sin el permiso tildado.

## 9. Reglas de negocio
- El cupón es oculto, de un solo uso y con vencimiento (P-2), como EMOJI50 y EPICA10.
- Las fotos se publican tal cual llegan (recorte sí; retoque que cambie el
  producto, no).

## 11. Analytics necesarios
- `resena_pedida`, `resena_enviada` (con foto sí/no), `resena_cupon_usado`.

## 12. Preguntas abiertas
- [ ] **P-1** ¿Mail automático o WhatsApp a mano? ¿Desde qué casilla?
- [ ] **P-2** Cupón: ¿10 %? ¿Vencimiento de 60 días? ¿Acumula con transferencia?
- [ ] **P-3** ¿Se marca "entregado" en el CRM hoy? Sin ese dato el disparo es
      "a los 12 días del pago".
- [ ] **P-4** Fase 1: ¿le escribís vos a los clientes de sep–nov con el texto de
      `design.md` §5? (Claude no manda mensajes a clientes).
