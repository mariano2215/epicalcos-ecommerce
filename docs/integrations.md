# INTEGRATIONS — EPICALCOS

Servicios externos conectados, verificados contra el código el 11/8/2026.

---

## 0. Mapa

| Servicio | Para qué | Crítico | Estado |
|---|---|---|---|
| **Mercado Pago** | cobro online | 🔴 sí | activo |
| **Netlify** | hosting, functions, blobs, cron | 🔴 sí | activo |
| **Notion** | CRM de pedidos y leads | 🟡 no bloquea | activo |
| **Resend** | mails transaccionales | 🟡 no bloquea | activo |
| **Cloudinary** | subida de archivos del cliente | 🟡 con fallback | activo |
| **Meta (Pixel + CAPI)** | tracking y catálogo | 🟢 no bloquea | activo |
| **Google Analytics 4** | analítica | 🟢 no bloquea | activo |
| **Microsoft Clarity** | mapas de calor, grabaciones | 🟢 no bloquea | activo |
| **CRM interno** (`app.epicalcos.com`) | gestión propia | 🟢 opcional | no-op si falta config |
| **Google Tag Manager** | contenedor de tags | 🟢 opcional | **no activo** |
| **Google Ads** | — | — | **no hay tag en el repo** |

**Principio transversal**: ninguna integración puede bloquear una venta. Todas
capturan sus errores, tienen timeout y siguen adelante.

---

## 1. Mercado Pago 🔴

SDK `mercadopago@^3.2.0`. Modalidad **Checkout Pro** (redirect a MP).

### Flujo
```
POST /api/create-preference
  → validateAndPriceOrder()          reprecio total en el servidor
  → preferenceClient.create({ … })
  → devuelve init_point              el navegador redirige a MP

MP cobra → redirect a /pago-exitoso|pendiente|error
        → POST /api/mercadopago-webhook   (notification_url)
```

### Configuración de la preferencia
- `external_reference` = `EPI-{ts}-{rand}` (clave de todo el sistema)
- `back_urls` → `/pago-exitoso`, `/pago-error`, `/pago-pendiente`
- `auto_return: 'approved'` — **solo si el site es https**
- `metadata` — datos del comprador, envío y `notion_page_id`, recortados a
  900 chars (fallback si el lead de Notion no se llegó a crear)
- `notification_url` → `${siteUrl}/api/mercadopago-webhook`
- El envío viaja como **un ítem más** llamado `shipping`

### Webhook y firma
`netlify/functions/lib/mpSignature.js`

MP firma con HMAC-SHA256 sobre el manifest
`id:{data.id};request-id:{x-request-id};ts:{ts};`

Detalle importante ya resuelto: el `data.id` de las notificaciones **reales**
viaja solo en el **body**, no en el querystring. Leerlo solo de la query armaba
el manifest sin el segmento `id:` y **rechazaba el 100 % de los pagos**
(la web estuvo ~2 semanas sin registrar conversiones por esto).

Hoy se prueban todos los orígenes posibles del id (query, body, y la variante
sin id de las IPN viejas), todos exigiendo un HMAC válido.

| `MP_WEBHOOK_SECRET` | Header `x-signature` | Resultado |
|---|---|---|
| ausente | — | se procesa (`no_secret`) |
| presente | ausente | se procesa, salvo `MP_WEBHOOK_STRICT=1` |
| presente | inválido | **401** |
| presente | válido | ✅ |

⚠️ **Pendiente**: activar `MP_WEBHOOK_STRICT=1` cuando los logs muestren "firma
ok" de forma consistente.

El webhook **siempre devuelve 200** (MP reintenta si demorás o fallás), y trae
el pago desde la API en vez de confiar en el body.

### Variables
```
MERCADOPAGO_ACCESS_TOKEN     🔴 obligatoria (sin ella → 503 con mensaje claro)
MP_WEBHOOK_SECRET            (alias: MERCADOPAGO_WEBHOOK_SECRET)
MP_WEBHOOK_STRICT            opcional, "1" para modo estricto
```

⚠️ **`.mcp.json` (gitignoreado) contiene un access token de MP en texto plano**
para el servidor MCP de Mercado Pago. No está versionado, pero conviene rotarlo
si alguna vez se compartió.

---

## 2. Netlify 🔴

Hosting, serverless, KV y cron — todo en la misma plataforma.

| Capacidad | Uso |
|---|---|
| CDN | sirve `frontend/dist` |
| Functions | Node 20, esbuild, `../netlify/functions` |
| Blobs | 3 stores (ver `docs/database.md`) |
| Scheduled Functions | `abandoned-cart.js`, `@hourly` |
| Redirects | `/api/*`, 301 de anuncios, SPA fallback |
| Headers | HSTS, CSP (report-only), etc. |
| Env vars | todos los secretos |

**Variables inyectadas por Netlify**: `URL`, `SITE_ID`.
**Variables `VITE_*`**: se hornean en el bundle en build-time → tienen que estar
cargadas **en Netlify**, no solo en `.env.local`. (GA4 estuvo sin instalar hasta
el 11/8/2026 justamente porque `VITE_GA4_ID` nunca llegó a Netlify.)

---

## 3. Notion — CRM 🟡

`netlify/functions/_notion.js` (el prefijo `_` evita que Netlify lo despliegue
como función propia). Usa la **API REST directa** con `fetch`, no el SDK, para
no depender de versiones y mantener el bundle chico.

- API version `2022-06-28`
- Base por defecto: `a2e218a7fa0a422a9d03a8efd965670b` ("CRM EPICALCOS")
- **Timeout de 5 s** — Notion lento no puede bloquear el checkout
- Token: `NOTION_TOKEN` o el alias `NOTION_KEY`

### Qué escribe
| Momento | Acción |
|---|---|
| Checkout iniciado | crea la página, devuelve `pageId` |
| Webhook de MP | actualiza esa página con el estado (Pagado / Pendiente / Rechazado) |
| Sin `pageId` | la crea desde los datos del pago (`fallback`) |
| Popup de bienvenida | crea un lead "Lead 10% OFF" |

### Detalles resueltos
- **Fecha en hora Argentina** (`-03:00`) con `Intl.DateTimeFormat`, para que
  Notion muestre la hora del negocio y no la UTC de Netlify.
- **`richText()` parte el texto en chunks de 2.000** (hasta 10 = 20.000 chars):
  un pedido con 50-100 archivos manda esa cantidad de links de Cloudinary en las
  observaciones, y con un solo elemento Notion se quedaba con los primeros ~8.
- Si la base rechaza la propiedad `Fecha`, **reintenta sin ella**: preferible una
  fila sin fecha a perder el pedido entero.
- `crearLeadEnCRM` **nunca lanza**.

`UNKNOWN / REQUIRES CONFIRMATION`: el schema exacto de la base (nombres y tipos
de las propiedades) no está en el repo.

---

## 4. Resend — mails 🟡

`netlify/functions/lib/notify.js`

| Mail | Cuándo | Para |
|---|---|---|
| Aviso interno de pedido | pago aprobado / pedido por transferencia | EPICALCOS |
| Confirmación de pedido | pago aprobado / pedido por transferencia | cliente |
| Aviso de lead | alguien deja el mail en el popup | EPICALCOS |
| Cupón de bienvenida | idem | cliente |
| Recordatorio de carrito | cron, si está habilitado | cliente |

```
RESEND_API_KEY      🟡 sin ella, no se manda nada (loguea y sigue)
NOTIFY_EMAIL_TO     default: epicalcos@gmail.com  (admite varios, separados por coma)
NOTIFY_EMAIL_FROM   default: EPICALCOS <onboarding@resend.dev>
```

⚠️ El `from` por defecto es el sandbox de Resend. **Para escribirle a clientes
hace falta un dominio verificado** y setear `NOTIFY_EMAIL_FROM`.

El mail de carrito abandonado incluye `List-Unsubscribe-Post` (RFC 8058), por eso
`/api/unsubscribe` acepta POST además de GET.

**Entrega de archivos digitales** (`lib/digital.js`): el link se configura con
`DIGITAL_LINK_{PACK_ID}` (ej. `DIGITAL_LINK_PACK_STICKERS`). Si no está cargada,
no se rompe nada: el cliente recibe "te lo mandamos a este mismo mail" y el aviso
interno arranca con "📩 ENVIAR ARCHIVO" para hacerlo a mano.
⚠️ **Hoy no está configurada → la entrega es manual.**

---

## 5. Cloudinary — subida de archivos 🟡

`frontend/src/services/uploadService.js` — **unsigned upload directo desde el
navegador** (el archivo no pasa por las Functions).

```
VITE_CLOUDINARY_CLOUD_NAME              público
VITE_CLOUDINARY_UPLOAD_PRESET           preset default (personalizados)
VITE_CLOUDINARY_UPLOAD_PRESET_POLAROID
VITE_CLOUDINARY_UPLOAD_PRESET_TATUAJES
VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO
```

**Un preset por destino**: en unsigned upload la carpeta la define el *preset*,
no el request (`folder` se ignora). Por eso hay cuatro.

- Sin configurar → `uploadEnabled = false` y `uploadDesign()` resuelve `null`:
  el configurador sigue funcionando y el cliente manda el archivo por WhatsApp.
- Las URLs resultantes viajan en `shipping.comments` hasta el mail y el CRM
  (por eso el tope de comentarios es de 20 KB).
- `scripts/cloudinary-create-preset.mjs` crea presets (usa
  `CLOUDINARY_API_KEY`/`SECRET`, **solo server-side**).

⚠️ **Riesgo conocido**: un preset unsigned permite que cualquiera suba a esa
carpeta. Es la contrapartida aceptada del upload directo.

---

## 6. Meta — Pixel, CAPI y catálogo 🟢

### Pixel (navegador)
Inyectado desde `main.jsx` si hay `VITE_META_PIXEL_ID`. Con advanced matching si
el usuario ya pasó por el checkout en esa sesión.

⚠️ El `<noscript>` de `index.html` tiene el pixel id **hardcodeado**
(`2255395355265661`), mientras el resto usa la env var.

Todo llamado a `fbq` va envuelto en `try/catch`: `fbevents.js` tira excepciones
sincrónicas dentro del navegador embebido de Instagram, y sin la guarda **abortaba
el checkout** (era el bug de "No pudimos registrar tu pedido" al entrar desde una
publicidad).

### Conversions API (servidor)
`netlify/functions/lib/metaCapi.js` — manda `Purchase` desde el webhook de MP
cuando el pago queda aprobado. Recupera las compras que el píxel pierde
(bloqueadores, iOS, gente que cierra antes de `/pago-exitoso`).

- **Dedup**: `event_id = purchase-{orderId}`, el mismo que dispara el navegador.
- **PII hasheada** con SHA-256 (email, teléfono, nombre, ciudad, provincia, CP),
  normalizada igual que en el frontend (`lib/advancedMatching.js`).
- **Señales en claro**: `fbp`, `fbc`, `client_ip_address`, `client_user_agent`.
  Se capturan en `create-preference` (la IP del **comprador**, no la de MP) y
  viajan con el pedido a Blobs.
- **`event_time` = hora real del pago**, no la del envío: si el webhook se
  reintenta, Meta tiene que atribuirlo a cuándo ocurrió (rechaza eventos de más
  de 7 días).

```
META_CAPI_TOKEN       🟢 sin él es no-op
META_PIXEL_ID         cae a VITE_META_PIXEL_ID
META_CAPI_TEST_CODE   opcional — quitar en producción
```

### Catálogo (Commerce Manager)
`scripts/build-meta-feed.mjs` genera `frontend/public/data/meta-catalog.csv`
(2,3 MB) con SKUs **estables y append-only** (`000001`+) y `stock: 50` fijo.

Los `content_ids` del píxel usan el `catalogSku` para que Meta matchee las
interacciones con el catálogo (`config/metaCatalog.js`). Sin eso, la proporción
de coincidencias queda en 0 % y Advantage+ no puede segmentar.

`UNKNOWN / REQUIRES CONFIRMATION`: si el feed programado está creado en Commerce
Manager (según memoria del proyecto, quedaba pendiente).

Verificación de dominio: `<meta name="facebook-domain-verification">` en
`index.html`.

---

## 7. Google Analytics 4 🟢

`G-04CJ1WQRSJ` — snippet de `gtag.js` **inline y hardcodeado** en `index.html`.

Va hardcodeado a propósito: el measurement ID es público (viaja en cada request)
y así no depende de una env var. La versión anterior lo leía de `VITE_GA4_ID`,
que nunca se cargó en Netlify, y GA4 estuvo sin instalar mientras el código
empujaba eventos al dataLayer.

Ver `docs/analytics.md` para los eventos.

---

## 8. Google Tag Manager 🟢 — **no activo**

El código lo soporta (`VITE_GTM_ID` → `main.jsx` inyecta el contenedor), pero
**la variable está vacía**: no hay contenedor.

⚠️ **Si algún día se prende GTM, hay que SACAR el snippet de `gtag.js` de
`index.html`**: el contenedor lee el mismo dataLayer y cada compra se contaría
dos veces. El guard `usaGtagDirecto()` en `analytics.js` ya apaga el reenvío
automáticamente, pero el `gtag('config')` del HTML seguiría mandando pageviews.

---

## 9. Google Ads — **no integrado**

**No hay ninguna etiqueta de Google Ads ni conversión de Ads en el código.**
La CSP contempla `td.doubleclick.net` y `stats.g.doubleclick.net`, pero no hay
tag instalado.

`UNKNOWN / REQUIRES CONFIRMATION`: si se hace remarketing o conversiones de Ads
por fuera del repo (importando conversiones desde GA4, por ejemplo).

---

## 10. Microsoft Clarity 🟢

Proyecto `xt45d8xn75`, inline en `index.html`. Mapas de calor y grabaciones.

El snippet se registra en el `<head>` para no perder eventos del arranque, pero
**la carga del tag se difiere a `window.load`**: antes competía por ancho de
banda con el hero y el bundle justo durante el LCP. La cola `clarity.q` se llena
igual desde el primer momento.

---

## 11. CRM interno (`app.epicalcos.com`) 🟢

`netlify/functions/lib/crmWebhook.js` — integración con el repo hermano
`epicalcos-app`.

**Desactivada por defecto**: sin `CRM_WEBHOOK_URL` + `CRM_WEBHOOK_SECRET` es
no-op. Rollback = borrar las dos variables, sin revertir código.

### Protocolo
```
POST {CRM_WEBHOOK_URL}
X-EPICALCOS-Signature        HMAC-SHA256 hex de `${timestamp}.${body}`
X-EPICALCOS-Timestamp        epoch en segundos
X-EPICALCOS-Event            order.created | order.paid | order.rejected | lead.created
X-EPICALCOS-Idempotency-Key  evita duplicados en los reintentos
```
Timeout **3 s**. Nunca lanza. Importes en pesos.

| Evento | Cuándo |
|---|---|
| `order.created` | checkout iniciado (MP) o pedido por transferencia |
| `order.paid` | webhook con pago aprobado |
| `order.rejected` | rejected / cancelled / refunded / charged_back |
| `lead.created` | popup de bienvenida |

Los pedidos por transferencia van con `paymentStatus: 'pending_transfer'`.

---

## 12. Fuentes: Google Fonts

Inter + Montserrat, con carga **no bloqueante** (`media="print"` →
`onload="this.media='all'"`) y `<noscript>` de respaldo. Preconnect a
`fonts.googleapis.com` y `fonts.gstatic.com`.

---

## 13. Variables de entorno — inventario completo

### Servidor (Netlify → Environment variables) 🔒
```
MERCADOPAGO_ACCESS_TOKEN     🔴 obligatoria
MP_WEBHOOK_SECRET            (o MERCADOPAGO_WEBHOOK_SECRET)
MP_WEBHOOK_STRICT            opcional

NOTION_TOKEN                 (o NOTION_KEY)
NOTION_CRM_DATABASE_ID       opcional, hay default en el código

RESEND_API_KEY
NOTIFY_EMAIL_TO
NOTIFY_EMAIL_FROM            ⚠️ dominio verificado para escribirle a clientes

META_CAPI_TOKEN
META_PIXEL_ID
META_CAPI_TEST_CODE          opcional

CRM_WEBHOOK_URL              opcional (no-op si falta)
CRM_WEBHOOK_SECRET

ABANDONED_CART_ENABLED       "true" para prender
ABANDONED_CART_SECRET        openssl rand -hex 32
ABANDONED_CART_HOURS         default 4
ABANDONED_CART_MAX_HOURS     default 72
ABANDONED_CART_MAX_PER_RUN   default 25
ABANDONED_CART_TEST_EMAIL    modo prueba

DIGITAL_LINK_PACK_STICKERS   ⚠️ no configurada → entrega manual

NETLIFY_BLOBS_SITE_ID        opcional (fallback si Netlify no inyecta)
NETLIFY_BLOBS_TOKEN
URL / SITE_ID                inyectadas por Netlify
```

### Cliente (`VITE_*`) — ⚠️ públicas, se hornean en el bundle
```
VITE_META_PIXEL_ID
VITE_GTM_ID                          hoy vacía
VITE_API_URL                         solo dev
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
VITE_CLOUDINARY_UPLOAD_PRESET_POLAROID
VITE_CLOUDINARY_UPLOAD_PRESET_TATUAJES
VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO
```

**Nunca poner un secreto en una `VITE_*`.**

### Solo scripts locales
```
CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET / CLOUDINARY_CLOUD_NAME
```

### Legacy `backend/` (no desplegado)
```
PORT · FRONTEND_URL · BACKEND_URL · NOTION_DATABASE_ID
```

---

## 14. Qué pasa si cada servicio se cae

| Servicio caído | Impacto |
|---|---|
| **Mercado Pago** | 🔴 no se puede cobrar online. Transferencia sigue funcionando. |
| **Netlify** | 🔴 el sitio no existe. |
| **Netlify Blobs** | 🟡 el pedido se crea igual; el mail pierde comentarios y links de Cloudinary. |
| **Notion** | 🟢 el checkout sigue; el pedido no queda en el CRM (el webhook reintenta con `fallback`). |
| **Resend** | 🟡 nadie recibe mails; el pedido no se marca notificado y el reintento de MP lo vuelve a intentar. |
| **Cloudinary** | 🟡 el configurador cae al fallback de WhatsApp. |
| **Meta / GA4 / Clarity** | 🟢 se pierde tracking, la compra no se afecta. |
| **CRM interno** | 🟢 no-op, timeout de 3 s. |

---

## 15. Preguntas abiertas

`UNKNOWN / REQUIRES CONFIRMATION`

1. **Google Ads**: ¿hay campañas? ¿Las conversiones se importan desde GA4?
2. **`NOTIFY_EMAIL_FROM`**: ¿está seteado con dominio verificado en Resend, o los
   mails al cliente siguen saliendo del sandbox?
3. **Feed de Meta programado**: ¿está creado en Commerce Manager?
4. **`MP_WEBHOOK_STRICT`**: ¿los logs ya muestran "firma ok" consistente como
   para activarlo?
5. **Schema de la base de Notion**: nombres y tipos exactos de las propiedades.
6. **`.mcp.json`**: ¿ese access token de MP se usó en algún lado compartido?
   Conviene rotarlo por las dudas.
7. **CRM interno**: ¿está activo en producción hoy (variables cargadas)?
