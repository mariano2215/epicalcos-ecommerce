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
| **Recordatorio de carrito** | cada hora, carritos de +4 h sin compra | `functions/abandoned-cart.js` ⚠️ apagada |
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

### 2.1 Recuperación de carrito abandonado — ✅ **implementada, apagada por defecto**

#### Cómo prenderla

Cargar en **Netlify → Environment variables**:

| Variable | Valor | Obligatoria |
|---|---|---|
| `ABANDONED_CART_ENABLED` | `true` | ✅ |
| `ABANDONED_CART_SECRET` | string largo al azar (firma el link de baja) | ✅ |
| `RESEND_API_KEY` | ya está cargada | ✅ |
| `NOTIFY_EMAIL_FROM` | dirección de **tu dominio verificado** en Resend | ✅ |
| `ABANDONED_CART_HOURS` | horas para considerarlo abandonado (default `4`) | — |
| `ABANDONED_CART_MAX_HOURS` | pasado esto no se escribe (default `72`) | — |
| `ABANDONED_CART_MAX_PER_RUN` | tope de mails por corrida (default `25`) | — |

> Sin `ABANDONED_CART_ENABLED=true` **no manda ni guarda nada**. Está apagada a
> propósito: manda mails a clientes reales y eso se prende a mano, no por
> deployar.
>
> `NOTIFY_EMAIL_FROM` no puede ser `onboarding@resend.dev` — Resend no deja
> escribirle a terceros desde ahí y la función se auto-cancela si lo detecta.

Para generar el secreto:

```bash
openssl rand -hex 32
```

#### Cómo funciona

| Paso | Dónde |
|---|---|
| 1. Escribe un mail válido en el checkout → se registra el carrito | `CheckoutForm` (blur) → `services/cartRecovery.js` → `POST /api/track-cart` |
| 2. Crea un pedido (MP o transferencia) → **se borra el registro** | `create-preference.js` y `create-order-transfer.js` |
| 3. Cada hora se buscan carritos de +4 h sin compra | `abandoned-cart.js` (`@hourly`) |
| 4. Se manda **un** mail con link de baja | `lib/notify.js` → `sendAbandonedCartEmail` |
| 5. Baja en un click | `GET/POST /api/unsubscribe` |

Se registra **en el blur del campo mail** y no antes: ahí ya mostró intención
real de comprar. Y el carrito se guarda con los **precios del medio de pago
elegido**, así el mail muestra lo que va a pagar de verdad, no el de lista.

#### Las salvaguardas, y por qué está cada una

| Salvaguarda | Contra qué protege |
|---|---|
| Borrado en los **dos** caminos de creación de pedido | escribirle a alguien que ya compró — el error más caro |
| `notifiedAt` = **un solo mail por carrito** | convertir un recordatorio en una secuencia de hostigamiento |
| Clave = mail normalizado | una persona con dos carritos recibe un mail, no dos |
| `ABANDONED_CART_MAX_HOURS` (72 h) | un "te quedó el carrito" de hace 4 días no recuerda nada, molesta |
| Opt-out chequeado **también al registrar** | ni siquiera guardar a quien pidió no recibir más |
| `estaDadoDeBaja` devuelve `true` si falla Blobs | ante la duda, no mandar |
| Token de baja firmado (HMAC) | que nadie dé de baja a otro escribiendo su mail en la URL |
| `List-Unsubscribe` + `List-Unsubscribe-Post` | baja desde el propio Gmail; evita que te marquen como spam |
| Solo se marca notificado **si el mail salió** | si Resend falla, la próxima corrida reintenta |
| Purga a los 30 días | no acumular carritos viejos indefinidamente |
| Tope por corrida | que un pico no dispare cientos de mails de una |

#### Lo que NO hace, a propósito

- **No es una secuencia.** Un mail y listo. El que no vuelve con uno tampoco
  vuelve con tres, y la diferencia entre recordar y hostigar es esa.
- **No persigue pedidos por transferencia sin comprobante.** Esos ya crearon el
  pedido y los ves en el CRM como pendientes: no son abandonos.
- **No guarda dirección ni teléfono.** Solo mail, nombre e ítems: lo mínimo para
  armar el mail.

#### Antes de prenderla

1. Verificá que `NOTIFY_EMAIL_FROM` sea de tu dominio verificado en Resend.
2. Prendela y **mandate el mail a vos**: agregá algo al carrito, escribí tu mail
   en el checkout, no compres, y esperá el umbral.
3. Probá el link de baja y confirmá que el segundo intento ya no te escribe.
4. Recién ahí dejala corriendo.

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
