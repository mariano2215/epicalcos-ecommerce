# Design — Popup de regalo para EPICYBER WEEK

| | |
|---|---|
| **Spec** | `037-popup-regalo-cyber` |
| **Rama** | `feat/037-popup-regalo-cyber`, sobre `main` en `68ccaea1` |

## 1. Decisión central

**Un registro por mail en Blobs, consultado al confirmar el pedido.**

El store `cyber-regalo` guarda `{ email, creadoEn, orderId, canjeadoEn }`, con el mail
normalizado como clave. Notion y el CRM no sirven para esto: son lentos para consultar
dentro del presupuesto de 10 s de la función, y el CRM dedupea por mail.

**El regalo no es una línea del carrito.** No toca `pricing.js` ni el espejo: viaja
como nota en `shipping.comments`, que el mail interno y el CRM ya muestran. Una línea
a $0 no se puede: Mercado Pago no admite precio ≤ 0.

## 2. Servidor

`netlify/functions/lib/regaloCyber.js`:

| Función | Qué hace |
|---|---|
| `regaloVigente(ahora)` | ¿Se pueden anotar mails? Hasta el fin de la campaña |
| `registrarRegalo(email)` | Idempotente: no pisa un registro existente |
| `evaluarRegalo(args)` | Pura. Decide con el registro, el pedido y la fecha |
| `reclamarRegalo(args)` | Lee y marca, con límite de tiempo. **Nunca lanza** |
| `sumarNota(comments, regalo)` | La línea para el aviso del pedido |

Cada acceso a Blobs corta a los 800 ms: el peor caso son 1,6 s sobre los 6 s del mail
de transferencia. Si la lectura falla devuelve `{ verificar: true }` (RF-17).

**Puntos de enganche:**

- `create-order-transfer.js`: antes del mail, que es la única constancia del pedido.
- `mercadopago-webhook.js`: con el pago aprobado, antes de armar el aviso. El mail sale
  de `stored.payer.email`, no de `payment.payer.email` (la trampa documentada en
  `buildOrderView`). La fecha es `stored.createdAt`: el pago puede llegar después.
- `capture-lead.js`: con `oferta: 'cyber'` y vigente, registra y no entrega cupón. Si
  la oferta venció con la pestaña abierta, cae al 10 %: nadie se queda sin nada.

`create-preference.js` **no cambia**: un pago no aprobado no consume el regalo.

## 3. Frontend

| Archivo | Cambio |
|---|---|
| `config/popup.js` | `POPUP_CYBER`: interruptor, regalo y disparo |
| `config/epicyber.js` | `RANGO_CORTO` y textos del popup |
| `lib/popupReglas.js` | `popupCyberVigente`, `popupCyberPermitido`, `puedeAbrirCyber` |
| `lib/popupEstado.js` | Memoria propia y mail guardado para el checkout |
| `components/WelcomePopup.jsx` | Elige la oferta |
| `components/popup/PopupDialogo.jsx` | Oferta Cyber y vista previa sin red |
| `components/popup/PopupCaptura.jsx` | Textos opcionales: mismo formulario |
| `components/popup/PopupCyberExito.jsx` | **Nuevo.** El paso 2 |
| `components/popup/AccesoBeneficio.jsx` | Etiqueta opcional |
| `components/popup/usePopupDisparo.js` | `config` opcional |
| `components/CheckoutForm.jsx` | Mail precargado |
| `services/leadService.js` | `oferta` opcional |

Sin `POPUP_CYBER.activo`, todo se comporta como hoy.

## 4. Importadores analizados (regla 9)

`capture-lead.js` lo usa solo el popup. `create-order-transfer` y el webhook se tocan
en un punto, con una función que nunca lanza. `notify.js`: dos funciones nuevas o con
parámetro opcional. `pricing.js` no se toca.

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| El regalo demora un pedido | Límite de 800 ms por acceso y cortes antes de leer |
| Blobs caído | Aviso interno para revisar a mano; el pedido sigue |
| Compra con otro mail | Checkout precargado y aviso en el popup y el mail |
| Un test frena un deploy en la semana | Suite con el reloj en la ventana |
| Abuso con varios mails | Cada uno exige una compra de $8.000 o más |

## 6. Activación

`POPUP_CYBER.activo` y `REGALO_CYBER.activo` en `true`, en el mismo commit.
