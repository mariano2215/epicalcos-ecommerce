# AUTOMATIZACIONES — EPICALCOS

Qué corre solo hoy, y qué falta. Escrito al cerrar P3 (8/8/2026).

---

## 1. Lo que ya corre solo

| Automatización | Dispara | Dónde vive |
|---|---|---|
| **Pedido → mail interno** | pago aprobado en MP | `functions/lib/notify.js` |
| **Pedido → mail al cliente** | pago aprobado en MP | `functions/lib/notify.js` |
| **Pedido → CRM Notion** | cualquier cambio de estado del pago | `functions/_notion.js` |
| **Pedido → CRM interno** | pago aprobado o rechazado | `functions/lib/crmWebhook.js` |
| **Purchase → Meta CAPI** | pago aprobado | `functions/lib/metaCapi.js` |
| **Planilla PEDIDOS → CRM** | edición en la planilla | webhook `sheet-order` + Apps Script |
| **Lead del popup → CRM** | mail dejado en el popup | `functions/capture-lead.js` |
| **Sitemap** | cada build | `scripts/generate-sitemap.mjs` |
| **Feed de catálogo Meta** | manual (`build-meta-feed.mjs`) | pendiente de programar en Meta |
| **Promos que se apagan solas** | por fecha, sin cron | `config/pricing.js` |
| **Imágenes optimizadas** | manual, idempotente | `scripts/optimize-images.mjs` |

> Las promos que vencen por fecha (`PROMO_3X2`, `PROMO_MAYORISTA_100`, cupones)
> **no necesitan que nadie las apague**: pasado `endsAt`, el precio, el banner y
> el contador vuelven solos, y el servidor deja de aceptar esas líneas. Es la
> automatización más barata del repo y conviene mantener ese patrón.

---

## 2. Lo que falta, en orden de valor

### 2.1 Recuperación de carrito abandonado — **especificado, NO implementado**

El agujero más grande. Hoy, quien deja el mail en el popup y después abandona el
carrito no recibe nada.

**Por qué no lo implementé**: mandar mails a tus clientes es una acción hacia
afuera y en tu nombre. Un bug de segmentación acá no es un bug de UI — es
spamear a tu base. Necesita tu visto bueno explícito antes de existir.

**Lo que haría falta**:

1. **Persistir el carrito con el mail.** Hoy `capture-lead` guarda el mail y el
   carrito vive solo en `localStorage`. Hay que asociarlos: una Netlify Function
   que reciba `{ email, items, total }` en `begin_checkout` y lo guarde en Blobs
   con un TTL.
2. **Marcar los que compraron.** El webhook de MP y `create-order-transfer` tienen
   que borrar el registro, o vas a mailear a gente que ya compró — el error más
   caro de este flujo.
3. **Un job programado** (Netlify Scheduled Function, 1×/día) que busque
   carritos de más de 24 h sin compra y mande **un solo** mail con Resend.
4. **Baja en un click** y tope de un mail por carrito. Nunca una secuencia de tres.

**Riesgos concretos a cubrir antes de prenderlo**: pedidos por transferencia que
tardan en confirmarse (no son abandonos), la misma persona con varios carritos, y
el consentimiento — el popup dice "novedades y promos", que alcanza, pero
conviene que el mail lo diga.

### 2.2 Feed de Meta programado

El CSV ya se genera y está deployado. Falta **crear el feed programado en
Commerce Manager** apuntando a `/meta-catalog.csv`. Es configuración en el panel
de Meta, no código. Sin esto el catálogo de Meta se desactualiza solo.

### 2.3 Optimización de imágenes en el build

`optimize-images.mjs` hoy se corre a mano. Se puede sumar al `prebuild` junto al
sitemap para que ninguna imagen nueva entre sin optimizar. **Ojo**: requiere
`cwebp` en el entorno de build de Netlify, que no está garantizado — habría que
verificarlo o usar una alternativa en JS antes de meterlo al build.

### 2.4 Purchase de transferencia → cobrado

Hoy `/pago-transferencia` dispara `purchase` cuando el pedido se **registra**,
no cuando se cobra (ver `ANALYTICS.md` §3.2). Cerrar el círculo requiere que,
al confirmar el comprobante en el CRM, se mande el evento real. Es trabajo del
lado del CRM (`epicalcos-app`), no de la tienda.

---

## 3. Lo que NO conviene automatizar

- **La revisión de archivos de personalizados.** Es el diferencial del producto y
  lo que promete `QueSigue` ("miramos cada diseño antes de producir"). Un
  validador automático de resolución ya existe como **aviso**, y así debe
  quedarse: bloquear automáticamente rechazaría pedidos que un ojo humano
  aprobaría.
- **Respuestas de WhatsApp.** `whatsapp_click` muestra que la consulta es parte
  del cierre de venta. Un bot ahí es más riesgo que ahorro.
