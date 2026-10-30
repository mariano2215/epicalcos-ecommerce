# Tasks — Popup de regalo para EPICYBER WEEK

| | |
|---|---|
| **Spec** | `037-popup-regalo-cyber` |

## Servidor

- [x] `lib/regaloCyber.js` con evaluación pura y acceso a Blobs que nunca lanza.
- [x] `capture-lead.js` registra con `oferta: 'cyber'`.
- [x] `create-order-transfer.js` y `mercadopago-webhook.js` reclaman el regalo.
- [x] `notify.js`: mail del lead, aviso de lead y bloque en la confirmación.
- [x] `_notion.js`: detalle opcional en el lead.

## Frontend

- [x] `POPUP_CYBER`, reglas y memoria propia.
- [x] `WelcomePopup`, `PopupDialogo`, `PopupCaptura`, `PopupCyberExito`, `AccesoBeneficio`.
- [x] Checkout con el mail precargado.
- [x] Tracking con `cyber_regalo` y `epicyber_2026`.

## Cierre

- [x] Tests: reglas, paridad, servidor y flujo completo con Blobs simulado.
- [x] Suite con el reloj antes, durante y después de la campaña.
- [x] Navegador a 375 px.
- [x] Docs.
- [ ] Aprobación de Mariano y orden de publicar.

## Hallazgos fuera de scope

- `saveOrder` y `getOrder` no tienen tope de tiempo propio en `create-order-transfer`: con Blobs colgado, el handler queda esperando después de mandar el mail. El pedido ya quedó avisado, pero el cliente puede ver un error.
- El popup no abre en `/categorias`, `/mayorista` ni en las landings: se mantuvo Home y `/epicyber`. Antes del 2/11 `/epicyber` redirige, así que abre solo en el Home.
- Nadie les avisa a los leads el 2/11 de que arrancó. Mandarlo a mano desde el CRM (leads "Popup EPICYBER").
