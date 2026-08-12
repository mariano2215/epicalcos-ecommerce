# ARCHITECTURE — EPICALCOS

Arquitectura **real** del repositorio, verificada contra el código el 11/8/2026.
Lo que no se pudo determinar leyendo el repo está marcado como
`UNKNOWN / REQUIRES CONFIRMATION`.

---

## 1. Qué es

Ecommerce de calcos/stickers con producción propia en Rosario, Argentina.
SPA en React servida como estático, con lógica de servidor en Netlify Functions.
Moneda única: **ARS**.

No hay base de datos relacional, no hay autenticación de usuarios y no hay panel
administrativo dentro de este repo. Ver §7 y §8.

---

## 2. Stack

| Capa | Tecnología | Versión |
|---|---|---|
| UI | React | ^18.3.1 |
| Routing | react-router-dom | ^6.26.2 (`BrowserRouter`) |
| Build | Vite | ^5.4.8 |
| Estilos | Tailwind CSS | ^3.4.13 + PostCSS + Autoprefixer |
| Tests | Vitest | ^2.1.9 (`environment: 'node'`) |
| Servidor | Netlify Functions | Node 20, bundler `esbuild` |
| Pagos | mercadopago (SDK) | ^3.2.0 (raíz) |
| Persistencia | @netlify/blobs | ^8.1.0 |

**Sin TypeScript. Sin linter configurado. Sin state manager.** El estado global
es un único `CartContext` con `useReducer`.

Hay **tres** `package.json`:
- `/package.json` — solo deps de las Functions (`mercadopago`, `@netlify/blobs`)
- `/frontend/package.json` — la SPA
- `/backend/package.json` — legacy, ver §8

---

## 3. Estructura de carpetas

```
/
├── CLAUDE.md                  constitución técnica (SDD)
├── netlify.toml               build, redirects, headers de seguridad
├── package.json               deps de las Functions
│
├── frontend/                  base del build de Netlify
│   ├── index.html             GA4 + Clarity inline, JSON-LD, noscript del Pixel
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   ├── data/              catálogo en JSON estático (99 archivos + índices)
│   │   ├── stickers/          6.600 imágenes .webp
│   │   ├── stickers-cutout/   recortes de portada por categoría
│   │   ├── sitemap.xml        generado en prebuild
│   │   └── robots.txt
│   └── src/
│       ├── main.jsx           bootstrap + init de GTM/Meta Pixel
│       ├── App.jsx            tabla de rutas
│       ├── config/            ★ reglas comerciales (pricing, site, landings…)
│       ├── context/           CartContext — único estado global
│       ├── routes/            26 páginas
│       ├── components/        43 componentes
│       ├── lib/               lógica pura + los 8 archivos de test
│       ├── services/          clientes HTTP (pagos, leads, upload, carrito)
│       ├── data/              categorías y testimonios
│       └── styles/
│
├── netlify/functions/         ★ el backend real
│   ├── create-preference.js       POST — checkout Mercado Pago
│   ├── create-order-transfer.js   POST — checkout transferencia
│   ├── mercadopago-webhook.js     POST — confirmación de pago
│   ├── capture-lead.js            POST — popup de bienvenida
│   ├── track-cart.js              POST — registro de carrito abandonado
│   ├── abandoned-cart.js          CRON @hourly — envío del recordatorio
│   ├── unsubscribe.js             GET/POST — baja de recordatorios
│   ├── entregar-digital.js        GET — entrega de archivos (link firmado)
│   ├── _notion.js                 helper (el "_" evita que se despliegue)
│   └── lib/                       pricing, notify, stores, firmas, CAPI…
│
├── scripts/                   herramientas de build/catálogo (Node, manuales)
├── docs/                      esta documentación
├── specs/                     specs de features (SDD)
└── backend/                   ⚠️ LEGACY NO DESPLEGADO — ver §8
```

---

## 4. Arquitectura de ejecución

```
Navegador (SPA React, estático en el CDN de Netlify)
     │
     │  fetch /api/*   →  redirect 200 en netlify.toml
     ▼
Netlify Functions (Node 20, serverless, sin estado)
     │
     ├─→ Mercado Pago      (crear preferencia · leer pago)
     ├─→ Netlify Blobs     (pedidos · carritos abandonados · opt-out)
     ├─→ Notion API        (CRM)
     ├─→ Resend            (mails)
     ├─→ CRM interno       (webhook HMAC, app.epicalcos.com)
     └─→ Meta CAPI         (Purchase server-side)
```

**No hay servidor propio corriendo.** Todo es CDN + funciones efímeras.

### Rutas `/api/*`
Definidas como redirects `status = 200` en `netlify.toml`:

| Ruta pública | Function |
|---|---|
| `/api/create-preference` | `create-preference.js` |
| `/api/create-order-transfer` | `create-order-transfer.js` |
| `/api/capture-lead` | `capture-lead.js` |
| `/api/mercadopago-webhook` | `mercadopago-webhook.js` |
| `/api/track-cart` | `track-cart.js` |
| `/api/unsubscribe` | `unsubscribe.js` |
| `/api/entregar-digital` | `entregar-digital.js` |

`abandoned-cart.js` no tiene ruta: se dispara por cron (`schedule: '@hourly'`,
formato v2 de Netlify).

### Build
```
base = "frontend"
command = "npm ci && npm ci --prefix .. && npm test --prefix .. && npm run build"
ignore = "exit 1"        # fuerza build en TODO push
functions.directory = "../netlify/functions"
```
`npm test` es una **barrera**: si falla, no se publica (ver §11).
El `prebuild` corre `scripts/generate-sitemap.mjs`.

`ignore = "exit 1"` está puesto a propósito: sin eso, un push que solo toca
`netlify/functions/**` (fuera de `base`) quedaba *"Canceled — no content change"*
y no se deployaba.

---

## 5. Frontend

### Rutas (`App.jsx`)
`Home` es **eager** (LCP); todas las demás son `lazy()`.

| Grupo | Rutas |
|---|---|
| Catálogo | `/`, `/categorias`, `/categoria/:slug`, `/producto/:slug/:num` |
| Productos | `/personalizados`, `/armar-pack`, `/mayorista`, `/negocio`, `/archivos-imprimibles`, `/tatuajes`, `/polaroid` |
| Landings | `/calcos-termo`, `/calcos-notebook`, `/calcos-auto` (desde `config/landings.js`) |
| Compra | `/carrito`, `/checkout` |
| Post-pago | `/pago-exitoso`, `/pago-transferencia`, `/pago-pendiente`, `/pago-error` |
| Institucional | `/contacto`, `/politicas/{envios,cambios,privacidad}`, `/terminos-y-condiciones` |

`*` cae en `Home` (no hay 404 propio). Las secciones listadas en
`HIDDEN_SECTIONS` (`config/site.js`) redirigen a `/categorias` en vez de 404,
para no perder tráfico de anuncios ni links viejos.

Hay redirects 301 en `netlify.toml` para URLs "bonitas" de anuncios
(`/calcos-personalizadas` → `/personalizados`, etc.): se eligió 301 en vez de
crear páginas gemelas para no generar contenido duplicado.

### Estado
Un solo contexto: `CartContext`.
- Hidratación **síncrona** desde `localStorage` en el primer render (evita el
  race con el efecto de persistencia).
- Persiste en `localStorage` bajo `epicalcos.cart.v2`.
- Descarta al hidratar las líneas del configurador viejo (`esCustomViejo()`),
  que el servidor rechazaría y trabarían todo el checkout.
- Expone `derived` (subtotales, promos, envío incluido) y `pricedItems(método,
  cupón)` — el cálculo final que se manda al servidor.

### Capa `config/` — la fuente de verdad comercial
| Archivo | Contenido |
|---|---|
| `pricing.js` | tamaños, descuentos, cupones, las 3 promos, packs, digitales |
| `site.js` | envíos y zonas, provincias, contacto, banco, nav, `HIDDEN_SECTIONS` |
| `personalizados.js` | configurador: tamaños, cortes, reglas de archivo |
| `landings.js` | landings por caso de uso |
| `metaCatalog.js` | SKUs de Meta para las líneas que no son catálogo |
| `brandStats.js` | números de marca (+120.000 calcos, +5.000 clientes) |

---

## 6. Backend (Netlify Functions)

### Los dos caminos de compra

**Mercado Pago** — `create-preference.js`
1. CORS restringido + tope de body (200 KB)
2. Valida `payer` (nombre + email con formato)
3. **`validateAndPriceOrder()`** — reprecia todo desde cero
4. Crea el lead en Notion ("Checkout iniciado") y guarda su `pageId`
5. Crea la preferencia en MP (con `external_reference = EPI-{ts}-{rand}`)
6. Guarda el pedido completo en Blobs
7. Borra el carrito abandonado
8. Notifica al CRM interno (`order.created`)
9. Devuelve `init_point`

**Transferencia** — `create-order-transfer.js`
Igual hasta el paso 3, pero sin MP: manda los mails **de inmediato** (no hay
webhook que confirme) y marca el pedido `pendiente_transferencia`. El
comprobante llega por WhatsApp y se registra a mano.

**Confirmación** — `mercadopago-webhook.js`
1. Verifica la firma HMAC de MP (`lib/mpSignature.js`) → 401 si es inválida
2. Trae el pago real desde la API de MP (no confía en el body)
3. Actualiza el estado en Notion
4. Notifica al CRM interno (`order.paid` / `order.rejected`)
5. Si `approved`: manda el Purchase a Meta CAPI, el mail interno y el mail al
   cliente, y marca `notifiedAt` para deduplicar los reintentos de MP

### Seguridad del checkout — el espejo de precios

El cliente manda `unit_price`, pero **el servidor nunca le cree**:
`validateAndPriceOrder()` recalcula el precio de cada línea a partir de su `id`
y rechaza el pedido con `price_mismatch` si no coincide.

Los ids tienen estructura fija y son el único input confiable:
```
sticker:{stickerId}:{size}
pack:{tipo}:{size}:{ts}
negocio:{ts}
fixed:{productId}
digital:{packId}
custom:{tamano}:{corte}:{ts}
```

También se derivan del `id`, nunca de flags del cliente:
- si la línea es un pack con envío incluido (`packIncludesShipping`)
- si entra en la promo de Argentina (`esPromoArgentina`)
- si el pedido es solo digital (`isDigitalOnly`)

El costo de envío **siempre** se recalcula en el servidor.

Límites anti-abuso: 130 líneas, 1.000 u/línea, títulos de 150 chars, body 200 KB,
comentarios 20 KB (ahí viajan los links de Cloudinary de los archivos subidos).

**Esto obliga a que `frontend/src/config/pricing.js` y
`netlify/functions/lib/pricing.js` digan exactamente lo mismo.** Ver
`docs/business-rules.md` §8.

---

## 7. Lo que NO existe en este repositorio

| Pedido en la auditoría | Estado real |
|---|---|
| **Base de datos** | No hay. Persistencia = Netlify Blobs (KV) + JSON estáticos. Ver `docs/database.md`. |
| **Autenticación** | No hay. Ni usuarios, ni sesiones, ni login. El único "token" es el HMAC del link de baja de mails. |
| **Panel administrativo** | No hay en este repo. La gestión ocurre en **Notion** (CRM) y en el CRM interno externo `app.epicalcos.com` (repo hermano `epicalcos-app`). |
| **ERP** | No hay. No hay stock real, ni compras, ni producción, ni facturación. El `stock: 50` de los JSON es un valor fijo **solo para el feed de Meta**, no un inventario. |
| **Google Ads** | No hay ninguna etiqueta de Google Ads ni conversión de Ads en el código. La CSP contempla `td.doubleclick.net`, pero no hay tag instalado. `UNKNOWN / REQUIRES CONFIRMATION`: si se gestiona por fuera del repo. |
| **GTM** | El código lo soporta (`VITE_GTM_ID`) pero **no hay contenedor activo**: la variable está vacía. Ver `docs/analytics.md`. |
| **TypeScript / linter / CI** | No hay. Tampoco GitHub Actions. |
| **Tests de componentes o E2E** | No hay. Solo tests unitarios de `lib/` (ver §9). |

---

## 8. `backend/` — legacy no desplegado

`backend/` es un servidor Express con `server.js`, `routes/payments.js` y
`services/notion.js`. **No está desplegado y no participa del flujo de
producción**: Netlify sirve `frontend/dist` y las Functions.

Último commit que lo tocó: `f5a1c26`, 28/6/2026.

⚠️ **`backend/routes/payments.js` toma `unit_price` directo del cliente y no
revalida precios.** Como código muerto es inofensivo; si alguien lo levantara,
sería un agujero de manipulación de precios. Está anotado como deuda técnica.

**Decisión (Mariano, 11/8/2026): NO se borra.** El criterio del proyecto es no
eliminar nada salvo que sea necesario o entorpezca el funcionamiento de la
tienda. `backend/` no se despliega ni participa del build, así que no estorba.

Queda entonces como **código archivado, no como código vivo**: nadie debe
levantarlo ni tomarlo como referencia de cómo se procesan pagos hoy — el camino
real es `netlify/functions/`. Si alguna vez se lo quisiera reactivar, primero
hay que portarle `validateAndPriceOrder()`.

---

## 9. Testing

```bash
npm test --prefix frontend      # vitest run
```
**12 archivos, 210 tests, todos pasan** (verificado el 11/8/2026).

| Archivo | Qué cubre |
|---|---|
| `promoPricing.test.js` | 38 tests — paridad frontend↔servidor de promos, cupones y precios |
| `precioPersonalizados.test.js` | 13 — precios del configurador |
| `envio.test.js` | umbrales y costos de envío en ambos lados |
| `resumenPedido.test.js` | armado del resumen |
| `searchCatalog.test.js` | buscador |
| `experiments.test.js` | asignación de variantes A/B |
| `seo.test.js` | helpers de SEO |
| `carritoAbandonado.test.js` | 24 — el cron real, con el store y los mails mockeados |
| `entregaDigital.test.js` | 22 — token firmado y endpoint de entrega (spec 002) |
| `mpSignature.test.js` | 20 — firma de los webhooks de MP (spec 003) |
| `abandonedStore.test.js` | 21 — opt-out, persistencia y token de baja (spec 003) |
| `metaMatching.test.js` | 15 — espejo de normalización Píxel ↔ CAPI (spec 003) |

**Cobertura conceptual**: fuerte en el camino de precios, en la entrega digital
(spec 002) y —desde la spec 003— en los módulos del servidor cuya falla es
**silenciosa**: la firma de los webhooks de MP, el opt-out de los carritos y el
espejo de normalización de Meta.

Los dos bugs que ya habían roto producción tienen ahora un test que los atrapa,
y se verificó reintroduciéndolos a mano (spec 003, `acceptance.md` §4).

Sigue **sin cobertura**: componentes, rutas, los 7 handlers completos,
`_notion.js`, `crmWebhook.js` y `notify.js`.

---

## 10. Seguridad — estado actual

**Implementado**
- Revalidación total de precios y envío en el servidor
- Firma HMAC de los webhooks de Mercado Pago
- Firma HMAC saliente hacia el CRM interno + idempotency key
- HMAC en el link de baja de mails, comparado en tiempo constante
- CORS restringido a orígenes propios (antes era `*`)
- Topes de tamaño y longitud en todos los payloads
- Headers: HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy,
  Permissions-Policy
- Los secretos solo se leen desde Functions; en el bundle solo hay IDs públicos

**Pendiente / riesgo**
| Tema | Estado |
|---|---|
| **CSP** | `Content-Security-Policy-Report-Only`. No bloquea nada todavía. |
| **Firma de MP no estricta** | Sin `MP_WEBHOOK_STRICT=1`, una notificación **sin** header de firma se procesa igual. Con firma inválida sí se rechaza. |
| **`.mcp.json`** | Contiene un access token de Mercado Pago en texto plano. Está en `.gitignore` (no versionado), pero vive en el disco del proyecto. |
| **`backend/` sin validación de precios** | Ver §8. |
| **Upload de Cloudinary unsigned** | Cualquiera con el preset puede subir a esa carpeta. Es la contrapartida conocida del upload directo desde el navegador. |

---

## 11. Deploy

- **Trigger**: push a `main`. No hay staging ni preview branch declarado.
- **Deploy garantizado**: `ignore = "exit 1"` fuerza el build en todo push.
- **Consecuencia**: *un push a `main` es un deploy a producción.*
- **Gate de tests** (spec 004): el `command` corre `npm test` **antes** de
  `npm run build`. Suite en rojo ⇒ build cortado ⇒ **no se publica** y la
  versión anterior sigue viva. Verificado: con un test roto la cadena devuelve
  1 y `vite build` no llega a ejecutarse.
- **Hook opcional** `pre-push` (`.githooks/`, se activa con
  `git config core.hooksPath .githooks`): avisa antes de pushear. Es comodidad
  —se saltea con `--no-verify`—, no la barrera.
- Rollback: desde el dashboard de Netlify (deploys anteriores).

`UNKNOWN / REQUIRES CONFIRMATION`: nombre exacto del site en Netlify y si hay
deploy previews habilitados para PRs.

---

## 12. Deuda técnica relevante

Ordenada por impacto, con lo verificado en el código.

### Resuelta

1. ~~**Promo Argentina: el carrito muestra precio de lista.**~~
   ✅ **RESUELTO el 11/8/2026** — spec
   [`001-fix-precio-carrito-promo-categoria`](../specs/001-fix-precio-carrito-promo-categoria/).

   El carrito mostraba `basePrice` (precio de lista) mientras la grilla, la ficha
   y el total del checkout ya mostraban la promo por categoría. Se agregó
   `precioVidrieraLinea()` en `config/pricing.js` y `derived.items`
   (`CartContext.jsx`) lo usa: el precio se deriva en cada render desde
   `Date.now()` y **nunca** se persiste, así que un carrito guardado durante la
   promo sigue siendo válido después.

   Cubierto por 9 tests nuevos en `promoPricing.test.js` (bloque *"el carrito
   muestra lo que el cliente paga"*), incluido el que faltaba: **lo que el
   cliente ve == lo que el servidor cobra**.

### Alta

2. **Duplicación obligatoria de reglas de precio.**
   Dos archivos que hay que editar juntos, sostenidos solo por convención y
   tests. Funciona, pero es la fuente estructural de riesgo del proyecto.

3. **`backend/` sin validación de precios** (§8).

### Media

4. **`PROMO_3X2` vencida sigue en el código** (`endsAt` 26/7/2026). Está
   documentado por qué: es el único consumidor del motor N×M y la base de los
   tests de paridad. Sacarla es un refactor del camino de precios, no una
   limpieza.

5. ~~**`analytics.js` reporta `add_to_cart` con precio de lista.**~~
   ✅ **RESUELTO el 11/8/2026** junto con el punto 1 (misma spec): los `track*`
   del `CartContext` usan `precioVidrieraLinea()`.

6. **CSP en Report-Only** desde hace tiempo, sin fecha de enforce.

7. ~~**Casi sin tests de las Netlify Functions.**~~ ✅ **muy mejorado** por las
   specs 002 y 003: 131 → 210 tests, con los módulos de falla silenciosa
   cubiertos. Queda pendiente lo listado arriba (handlers, Notion, CRM, notify).

8. ~~**`IMPRIMIBLES[0].disenos` es `null`**~~ ✅ resuelto el 11/8/2026
   (`disenos: 7000`). La entrega digital dejó de ser un agujero con la spec 002,
   pero **sigue pendiente cargar `DIGITAL_LINK_PACK_STICKERS`**: sin esa variable
   no se entrega nada por ningún camino.

### Baja

9. Meta Pixel ID hardcodeado en el `noscript` de `index.html`
   (`2255395355265661`) mientras el resto usa `VITE_META_PIXEL_ID`: si se
   cambiara la env var, el `noscript` quedaría apuntando al pixel viejo.
10. `frontend/Alias de index.html` — archivo suelto de macOS en el repo.
11. Sin 404 real (`*` → `Home`), lo que puede confundir a los crawlers.
12. `deno.lock` sin trackear en la raíz, sin uso aparente de Deno.
13. Tres `package.json` con `mercadopago` en dos versiones distintas
    (`^3.2.0` en raíz, `^3.1.0` en frontend, `^2.0.15` en backend).
