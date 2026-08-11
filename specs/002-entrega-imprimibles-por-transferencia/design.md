# Design — Entrega de archivos imprimibles pagados por transferencia

| | |
|---|---|
| **Spec** | `002-entrega-imprimibles-por-transferencia` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 11/08/2026 |

---

## 0. Hallazgos del discovery

Código leído: `netlify/functions/lib/digital.js`, `lib/notify.js` (completo),
`lib/orderStore.js`, `create-order-transfer.js`, `mercadopago-webhook.js`,
`unsubscribe.js`, `lib/abandonedStore.js`, `config/pricing.js` (`IMPRIMIBLES`),
`components/ImprimiblesCard.jsx`, `components/CheckoutForm.jsx`.

| Pregunta | Hallazgo |
|---|---|
| ¿La entrega automática existe? | **Sí, y funciona** — para Mercado Pago. `digitalDeliveries()` lee la env var y `digitalDeliveryHtml/Text` arma el botón de descarga en el mail al cliente. |
| ¿Qué falta entonces? | El camino de **transferencia**. Ver abajo. |
| ¿Se puede pagar el pack digital por transferencia? | **Sí.** `PAYMENT_METHODS` (`CheckoutForm.jsx:14-15`) ofrece los dos medios y **no** filtra por `digitalOnly`. |
| ¿Hay precedente de link firmado? | **Sí**: `unsubscribe.js` + `tokenBaja`/`tokenValido` (HMAC + `timingSafeEqual`). Es el molde a copiar. |
| ¿Toca el camino de precios? | **No**, en ningún punto. |

### El agujero, en el código

```js
// notify.js:169, :255, :533 — las tres marcas de "hay que mandar el archivo"
o.paymentStatus === 'approved' && needsManualDelivery(o)
```

```js
// notify.js:104 — un pedido por transferencia NUNCA está 'approved'
function isPendingTransfer(o) {
  return o.paymentMethod === 'transferencia' && o.paymentStatus !== 'approved';
}
```

`create-order-transfer.js` guarda `status: 'pendiente_transferencia'` y llama a
`notifyOrder()` **una sola vez**. No hay ningún otro punto del sistema que vuelva
a tocar ese pedido: la confirmación del pago ocurre por WhatsApp, fuera del
software.

Resultado: para un pedido digital por transferencia,
- el mail al cliente dice *"te los mandamos apenas confirmemos"* (correcto), y
- el aviso interno **no lleva ninguna marca** (el prefijo `📩 ENVIAR ARCHIVO ·`
  está detrás de `=== 'approved'`),
- y **nada** vuelve a ejecutarse nunca.

### Lo que NO hay que tocar

`digitalDeliveryHtml()` ya distingue el caso pendiente y **no** muestra el link
antes de confirmar el pago. Eso es RF-8 y ya está bien resuelto: **no se toca**.

---

## 1. Arquitectura propuesta

Dos piezas, deliberadamente chicas:

```
1) MARCAR                          2) ENTREGAR (un click)
   create-order-transfer              mail interno
        │                                  │  link firmado
        ▼                                  ▼
   sendOrderEmail                    GET /api/entregar-digital?o=…&t=…
   asunto: "📩 ENTREGAR AL           │
            CONFIRMAR · …"           ├─ verifica HMAC (timingSafeEqual)
   cuerpo: botón "Enviar             ├─ lee el pedido de Blobs
           archivos ahora"           ├─ ¿tiene líneas digital:?  si no → aviso
                                     ├─ ¿hay link configurado?   si no → aviso (RF-7)
                                     ├─ marca entregado en Blobs
                                     └─ sendCustomerEmail(...) con el link
```

**Por qué un link firmado en el mail y no un panel**: no hay autenticación en
este proyecto (ver `docs/architecture.md` §7) y agregarla para esto sería
desproporcionado. El mail interno **ya es el canal privado** de Mariano, y
`unsubscribe.js` ya usa exactamente este patrón.

### Decisiones y alternativas descartadas

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Entregar **después** de confirmar, a pedido | Mandar el link al crear el pedido por transferencia | 🔴 Es regalar el producto. Un archivo entregado no se puede "des-entregar" si la transferencia nunca llega. |
| Link firmado en el mail interno | Panel de administración | No hay auth en el repo; construirla para un botón es desproporcionado. |
| Link firmado en el mail interno | Webhook de entrada desde el CRM | Cruza dos repos y necesita un endpoint entrante nuevo. Mejor beneficio/costo con el click. Queda anotado en `requirements.md` §12. |
| Secreto **propio** (`DIGITAL_DELIVERY_SECRET`) | Reusar `ABANDONED_CART_SECRET` | Acoplaría la entrega de un producto pagado a una feature **apagada por defecto**; rotar uno rompería el otro en silencio. |
| `GET` con confirmación visual | `POST` desde el mail | Los clientes de mail no mandan POST con un click. `unsubscribe.js` ya resuelve GET así. |
| Marcar la entrega en Blobs | No registrar nada | Sin registro no se puede saber qué pedidos quedaron sin entregar (RF-6). |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `netlify/functions/lib/notify.js` | marcar los pedidos digitales pendientes de transferencia + botón de entrega | 🟡 toca el armado de los mails |
| `netlify/functions/lib/orderStore.js` | helper para marcar el pedido como entregado | 🟢 aditivo |
| `netlify/functions/lib/digital.js` | helper del token de entrega | 🟢 aditivo |
| `netlify.toml` | redirect de la ruta nueva | 🟢 |
| `.env.example` | documentar `DIGITAL_DELIVERY_SECRET` | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `netlify/functions/entregar-digital.js` | verifica la firma, valida el pedido y dispara el mail de entrega |

### Archivos que NO se modifican

| Archivo | Por qué |
|---|---|
| `netlify/functions/lib/pricing.js` y todo `config/` | ninguna regla de precio cambia |
| `create-preference.js` / `mercadopago-webhook.js` | el camino de MP ya funciona |
| `digitalDeliveryHtml/Text` | ya resuelven bien el caso pendiente (RF-8) |
| Todo el frontend | esta feature no tiene UI de cliente |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `lib/notify.js` | **sí** | `mercadopago-webhook`, `create-order-transfer`, `capture-lead`, `abandoned-cart` |
| `lib/orderStore.js` | **sí** (aditivo) | `create-preference`, `create-order-transfer`, `mercadopago-webhook` |
| `lib/digital.js` | **sí** (aditivo) | `lib/notify.js` |
| `config/pricing.js` | **no** | — |

⚠️ `notify.js` arma **todos** los mails del sistema. El cambio tiene que quedar
contenido en el camino digital y no alterar el resto — lo verifica REG-2 a REG-5
de `acceptance.md`.

---

## 3. Datos

### Token de entrega — `lib/digital.js`

Mismo molde que `tokenBaja` de `abandonedStore.js`:

```js
export function tokenEntrega(orderId, secret) {
  return createHmac('sha256', secret).update(String(orderId)).digest('hex').slice(0, 32);
}

export function tokenEntregaValido(orderId, token, secret) {
  const esperado = tokenEntrega(orderId, secret);
  const a = Buffer.from(esperado);
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Se firma **el `orderId`**, que ya es opaco (`EPI-{ts}-{random}`) y **no contiene
PII** (RNF-3).

### Marca de entrega — `lib/orderStore.js`

```js
export async function markDigitalDelivered(orderId, info = {}) { … }
```
Escribe `digitalDeliveredAt` (ISO) sobre el pedido guardado, con el mismo
criterio de `markNotified`: **nunca lanza**.

### Forma del pedido — sin cambios de esquema

Solo se **agrega** un campo opcional:
```js
{ …pedido…, digitalDeliveredAt: "2026-08-11T18:00:00.000Z" }
```
Los pedidos viejos no lo tienen; ausente = no entregado. Compatible hacia atrás.

---

## 4. APIs

### Endpoint nuevo

```
GET /api/entregar-digital?o={orderId}&t={token}
```

| Situación | Respuesta |
|---|---|
| Firma inválida / faltante / sin secreto | **400**, página con mensaje genérico |
| Pedido inexistente o ilegible | 400, mismo mensaje genérico |
| Pedido sin líneas `digital:` | 400, "este pedido no tiene archivos" |
| Link de descarga sin configurar (RF-7) | **409**, "cargá primero `DIGITAL_LINK_…`" — **no** manda mail |
| Resend falla | 502, reintentable, **sin** marcar como entregado |
| OK | 200, "listo, se lo mandamos a {mail}" |

Mensaje genérico ante firma inválida **y** pedido inexistente: distinguirlos le
diría a quien prueba tokens cuál está más cerca (mismo criterio que
`unsubscribe.js`).

Devuelve **HTML**, no JSON: se abre desde un cliente de mail, en el celular
(RNF-6). Se reusa el molde de página de `unsubscribe.js`.

### Redirect — `netlify.toml`
```toml
[[redirects]]
  from   = "/api/entregar-digital"
  to     = "/.netlify/functions/entregar-digital"
  status = 200
```

### El detalle que hace falta resolver

`sendCustomerEmail(buildOrderView(stored, null))` sobre un pedido con
`status: 'pendiente_transferencia'` da `isPendingTransfer === true`, y entonces
`digitalDeliveryHtml` muestra *"te lo mandamos cuando confirmemos"* **en vez del
link** — justo lo contrario de lo que se quiere.

**Solución**: el endpoint marca el pedido como confirmado antes de armar la
vista (o `buildOrderView` recibe un override explícito). El pago **ya** está
confirmado en ese momento: por eso Mariano tocó el botón. La opción exacta se
decide al implementar; lo que **no** se puede es dejar que la vista se arme con
el estado pendiente.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| **Resend** | un mail más, con la misma función que ya existe | no: ocurre después de la venta |
| **Netlify Blobs** | lectura + una escritura de marca | no |
| Mercado Pago / Notion / CRM / Meta | **sin cambios** | — |

### Variables de entorno nuevas

| Variable | Dónde | ¿Secreto? |
|---|---|---|
| `DIGITAL_DELIVERY_SECRET` | Netlify (Functions) | **sí** — `openssl rand -hex 32` |

Sin ella, el endpoint responde 400 siempre y el mail interno **no** muestra el
botón (pero **sí** la marca del asunto): degradación segura, se comporta como
hoy (RNF-4).

⚠️ No es `VITE_`: no se hornea en el bundle.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend — esta feature no tiene frontend
- [x] Firma HMAC comparada en **tiempo constante** (`timingSafeEqual`)
- [x] Se firma el `orderId`, que no contiene PII (RNF-3)
- [x] Mensajes de error genéricos ante firma/pedido inválidos
- [x] Sin secretos en logs (nunca loguear el token)
- [x] Sin CORS: no se llama desde el navegador del cliente
- [x] Sin cambios en la CSP

| Riesgo | Mitigación |
|---|---|
| Alguien dispara entregas ajenas | Necesita el HMAC, que solo viaja en el mail interno |
| El token queda en el historial del navegador | Es de un solo pedido y solo reenvía un mail que el cliente ya tiene derecho a recibir |
| Entregar un pedido impago | Solo se dispara desde el mail interno, después de que Mariano confirme |
| Fuerza bruta sobre el token | 32 hex; y el `orderId` también hay que adivinarlo |

**El peor caso realista es un reenvío de mail a un cliente que ya pagó** — molesto,
no peligroso. No hay camino de escalada: el endpoint no borra, no cobra y no
expone datos.

---

## 7. Manejo de errores

| Escenario | Sistema | Mariano ve |
|---|---|---|
| Sin `DIGITAL_DELIVERY_SECRET` | endpoint 400; el mail no muestra el botón | la marca en el asunto igual: entrega manual como hoy |
| Sin `DIGITAL_LINK_…` | 409, **no** manda mail | "cargá primero la variable X" |
| Blobs caído | 400 genérico | puede mandarlo a mano |
| Resend caído | 502, **sin** marcar entregado | puede reintentar |
| Doble click | manda de nuevo, sin duplicar el pedido | "listo" otra vez |

**Fallar cerrado**: ante cualquier duda **no se manda** el mail y no se marca
como entregado. Un mail sin link es peor que no mandarlo — le dice al cliente que
ya está resuelto cuando no lo está.

---

## 8. Estrategia de migración

**No aplica**: no hay datos que migrar. `digitalDeliveredAt` es un campo nuevo y
opcional; los pedidos viejos siguen leyéndose igual.

- **Rollback**: revertir el commit **o** simplemente borrar
  `DIGITAL_DELIVERY_SECRET` — sin la variable, el sistema vuelve al
  comportamiento actual sin redeployar.
- **Feature flag**: la propia env var.

---

## 9. Testing

⚠️ **Este es el primer código del repo con tests de una Netlify Function.** Hoy
no existe ninguno (`docs/architecture.md` §9), así que hay que crear el archivo.
Va acotado a lo que se puede probar sin red: **el token y la lógica de decisión**.

### Tests nuevos — `frontend/src/lib/entregaDigital.test.js`

Vive en `frontend/src/lib/` porque es donde corre Vitest y desde donde ya se
importa el servidor (lo hace `promoPricing.test.js` con `../../../netlify/...`).

| # | Test | Verifica |
|---|---|---|
| T-1 | `tokenEntrega` es determinista para el mismo `orderId` + secreto | firma |
| T-2 | Un token de otro `orderId` no valida | RF-4 |
| T-3 | Token vacío / de largo distinto no valida y no explota | RF-4 |
| T-4 | `digitalDeliveries` devuelve `url: null` sin la env var | RF-7 |
| T-5 | `needsManualDelivery` es true con líneas digitales sin link | RF-7 |
| T-6 | Un pedido **sin** líneas `digital:` no dispara nada | edge case |
| T-7 | El asunto del aviso interno marca el pedido digital pendiente | RF-1 |

### Verificación manual
- [ ] Pedido digital de prueba por transferencia → revisar asunto y botón
- [ ] Click en el botón desde el **celular** (RNF-6)
- [ ] Repetir el click (RF-5)
- [ ] Probar sin `DIGITAL_LINK_…` cargada (RF-7)
- [ ] Alterar un carácter del token → rechazo

---

## 10. Dependencias nuevas

**Ninguna.** `node:crypto` ya se usa en `abandonedStore.js`, `mpSignature.js` y
`crmWebhook.js`.

---

## 11. Preguntas abiertas del diseño

- [ ] **¿El botón manda el mail directo o pide confirmación?** Un click desde el
      mail podría dispararse por un preview del cliente de correo.
      **Recomendación**: página intermedia con un botón de confirmar. Los
      pre-fetchers hacen GET, no clicks. Cuesta una pantalla y evita entregas
      accidentales.
- [ ] **¿Marcarlo también en el CRM?** `notifyCrm` ya existe y sería barato,
      pero el CRM no tiene hoy un evento de "entregado". Queda para cuando se
      defina de ese lado.
