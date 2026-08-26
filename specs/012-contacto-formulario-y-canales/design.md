# Design — Contacto: formulario + canales (WhatsApp e Instagram)

| | |
|---|---|
| **Spec** | `012-contacto-formulario-y-canales` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 25/08/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, y mucho.** `netlify/functions/capture-lead.js` es exactamente la forma de "form del sitio → mail + CRM": CORS con lista blanca, tope de body, validación server-side y `Promise.all` de integraciones que nunca lanzan. El formulario de contacto es ese mismo patrón con más campos |
| ¿Qué archivos están involucrados? | `frontend/src/routes/Contact.jsx` (54 líneas, sin lógica), `frontend/src/config/site.js` (`contact`, `provinces`, `shipping`), `netlify/functions/lib/notify.js` (Resend), `netlify/functions/lib/crmWebhook.js`, `netlify.toml` (redirect `/api/*`) |
| ¿Hay tests que lo cubran hoy? | **No.** `/contacto` no tiene ningún test. La suite (258 tests, 15 archivos) es toda de `src/lib/*.test.js`: **no hay tests de componentes ni infraestructura para renderizarlos** (no hay Testing Library en `frontend/package.json`). Por eso la validación va en un módulo puro y testeable |
| ¿Toca el camino de precios? | **No.** Ni `pricing.js` (ninguno de los dos), ni `CartContext`, ni `localStorage` |
| ¿Hay comentarios que expliquen por qué está así? | `WhatsAppButton.jsx` documenta el `z-40` y el ajuste de `bottom` por las barras fijas — **esta spec no lo toca**. `CheckoutForm.jsx` documenta por qué todos los campos llevan `autoComplete` + `inputMode` + `type`: *"en mobile había que tipear nombre, mail, teléfono y dirección a mano, con el teclado equivocado"*. El formulario de contacto **hereda esa decisión**, no la vuelve a descubrir |
| Precedente de texto pre-cargado en WhatsApp | Ya existe tres veces: `routes/Categorias.jsx:122`, `routes/PaymentTransfer.jsx:68` y `routes/PaymentSuccess.jsx:104`. Todas hacen `${contact.whatsappUrl}?text=${encodeURIComponent(...)}`. `PaymentSuccess` avisa además de un límite real: *"50 fotos generaba un link wa.me de varios KB que WhatsApp corta o rechaza"* |
| Estado de Resend hoy | `sendLeadEmail()` ya manda a `NOTIFY_EMAIL_TO || 'epicalcos@gmail.com'` desde `NOTIFY_EMAIL_FROM || onboarding@resend.dev`. Como el mail de contacto va **a la casilla dueña de la cuenta**, funciona con el default: **no hace falta ninguna env var nueva** |

---

## 1. Arquitectura propuesta

```
/contacto  (React, ya es lazy())
│
├── FormularioContacto ──POST /api/contacto──►  netlify/functions/contacto.js
│                                                 │
│                                                 ├─► notify.js  sendContactEmail()  → Resend → epicalcos@gmail.com
│                                                 │                                     reply_to: mail del cliente
│                                                 └─► crmWebhook.js notifyCrmLead()  → CRM interno   (RF-11, opcional)
│
├── CardWhatsapp ─────────────────────────────►  wa.me/<num>?text=Hola!%20Quiero%20hacer%20una%20consulta...
│
└── CardInstagram ────────────────────────────►  grilla local (6 .webp propios) → instagram.com/p/<id>
                                                  (imágenes del repo: sin token, sin script de terceros)
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| El formulario **postea a una Function** que manda el mail | `mailto:` con el cuerpo pre-armado | Es lo que hay hoy y es justamente el problema: en el navegador embebido de Instagram el `mailto:` no abre nada, y el cliente ya escribió los seis campos cuando se entera. Además no deja lead, no se puede medir y depende de que tenga cliente de correo configurado |
| El formulario **postea a una Function** que manda el mail | Netlify Forms | Es una feature del plan de Netlify con cupo propio, un panel aparte y su propio anti-spam. El repo ya tiene el camino Resend andando y probado (`capture-lead`); sumar un segundo sistema de recepción es una integración más para mantener |
| Validación en un módulo puro `lib/contacto.js` | Validar adentro del componente, como `CheckoutForm` | `CheckoutForm.validate()` no tiene tests porque no se puede importar sin React. Un módulo puro se testea con la infraestructura que ya existe y suma tests a la barrera del deploy |
| La card de Email **desaparece** y la reemplaza el formulario | Dejar las tres cards y sumar el formulario abajo | Un formulario que manda un mail **es** la card de mail, mejorada. Dejar las dos deja dos caminos al mismo lugar, uno peor |
| El mensaje pre-cargado de WhatsApp vive en el componente | Agregarlo a `contact` en `config/site.js` | `site.js` es módulo compartido (29 importadores) y está espejado en el server. El texto lo usa **una** card: no gana nada viviendo en el config y obliga a tocar un archivo de radio grande (regla 9) |
| Ícono de WhatsApp propio de la card | Reusar el `<svg>` de `WhatsAppButton.jsx` | `WhatsAppButton` está en **todas** las páginas; extraerle el ícono es un refactor fuera de scope (regla 8). Se anota como hallazgo para unificarlo aparte |

### Layout

Mobile (375 px), en este orden — **WhatsApp primero porque es el canal que convierte**:

```
[ Título + plazo de respuesta ]
[ Card WhatsApp        ]   ← verde, ícono real, CTA grande
[ Formulario           ]   ← 6 campos, un solo paso
[ Card Instagram       ]
[ Nota: la compra se cierra en la tienda ]
```

Desktop (≥ `lg`): dos columnas — formulario a la izquierda (7/12), stack
WhatsApp + Instagram a la derecha (5/12). Las tres cards dejan de medir lo
mismo: hoy son tres cuadraditos iguales para tres canales que no valen igual.

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/routes/Contact.jsx` | Se reescribe el cuerpo: arma el layout y monta los tres componentes nuevos | 🟢 ruta aislada, sin importadores más allá del router |
| `frontend/src/lib/analytics.js` | **+2 funciones nuevas** (`trackContactoFormError`, `trackInstagramClick`). No se modifica ninguna existente | 🟡 módulo compartido — ver tabla abajo |
| `netlify/functions/lib/notify.js` | **+1 export nuevo** (`sendContactEmail`). No se modifica ninguno existente | 🟡 módulo compartido — ver tabla abajo |
| `netlify.toml` | +1 redirect `/api/contacto` → `/.netlify/functions/contacto` | 🟢 aditivo; va **antes** del fallback SPA |
| `docs/analytics.md` | Documentar los eventos nuevos | 🟢 |
| `docs/integrations.md` | Documentar el uso nuevo de Resend | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/components/contacto/FormularioContacto.jsx` | Los 6 campos, estados (idle / enviando / ok / error), el POST |
| `frontend/src/components/contacto/CardWhatsapp.jsx` | Card + link `wa.me` con texto pre-cargado + tracking |
| `frontend/src/components/contacto/CardInstagram.jsx` | Card con la grilla de 6 posteos + CTA al perfil |
| `frontend/src/data/instagram.js` | Los 6 posteos: `{ src, permalink, alt }`. **Lo escribe el script, no se edita a mano** |
| `frontend/public/images/instagram/*.webp` | Las 6 imágenes optimizadas (salida del script) |
| `scripts/build-instagram.mjs` | Toma las fotos de una carpeta fuera del repo, las recorta al cuadrado y las escribe en `webp` + regenera `data/instagram.js` |
| `frontend/src/lib/contacto.js` | `validarConsulta(form)` puro: recibe el form, devuelve `{ }` o `{ campo: mensaje }`. Sin React, sin fetch |
| `frontend/src/lib/contacto.test.js` | Tests de `validarConsulta` |
| `netlify/functions/contacto.js` | Endpoint: CORS, topes, validación, honeypot, Resend + CRM |

### ⚠️ Módulos compartidos

`CLAUDE.md` regla 9.

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** | — |
| `frontend/src/config/site.js` | **No se modifica** — solo se **lee** (`contact`, `provinces`, `shipping`) | 29 archivos |
| `frontend/src/context/CartContext.jsx` | **No** | — |
| `netlify/functions/lib/pricing.js` | **No** | — |
| `frontend/src/lib/analytics.js` | **Sí, aditivo** (2 exports nuevos) | 21 archivos: `CartContext`, `StickerCard`, `ImprimiblesCard`, `FixedProductPage`, `WhatsAppButton`, `FeaturedStickers`, `Hero`, `PackBuilder`, `WelcomePopup`, `ShippingInfo`, `personalizados/Configurador`, `routes/{Cart,PaymentSuccess,Checkout,LandingUso,Category,Categorias,PaymentTransfer,Producto}`, `services/cartRecovery`, `lib/metaCapi` |
| `netlify/functions/lib/notify.js` | **Sí, aditivo** (1 export nuevo) | 6 archivos: `create-order-transfer`, `abandoned-cart`, `mercadopago-webhook`, `capture-lead`, `entregar-digital`, `lib/digital` |

Los dos cambios son **puramente aditivos**: se agregan funciones, no se
modifica ninguna existente. Ningún importador cambia de comportamiento.

Comando usado:
```bash
grep -rln "lib/analytics" frontend/src netlify/
grep -rln "notify.js" netlify/
```

---

## 3. Datos

### Estructuras nuevas

```js
// Estado del formulario (frontend)
{
  nombre: '',      // nombre y apellido
  email: '',
  telefono: '',
  ciudad: '',
  provincia: 'Santa Fe',   // default, igual que CheckoutForm
  consulta: '',
  website: ''      // honeypot: invisible; si viene con algo, es un bot
}
```

### Persistencia

**Ninguna.** La consulta se manda por mail y (opcionalmente) al CRM; el sitio no
la guarda.

| Dónde | Qué |
|---|---|
| Netlify Blobs | **No se usa** — no hay estado que sobreviva a la request |
| `localStorage` / `sessionStorage` | **No se usa** — no se guarda PII en el navegador |
| JSON del catálogo | No aplica |

### ⚠️ Compatibilidad con datos existentes

- [x] **No** cambia la forma de las líneas del carrito → `epicalcos.cart.v2` intacto
- [x] **No** cambia la forma del pedido en Blobs

---

## 4. APIs

### Endpoints afectados

Ninguno de los existentes se modifica.

### Endpoint nuevo — `POST /api/contacto`

Declarado, como pide la plantilla:

- **Redirect en `netlify.toml`**: `/api/contacto` → `/.netlify/functions/contacto`, `status = 200`, **antes** del fallback SPA
- **CORS**: misma lista blanca que `capture-lead` (`process.env.URL`, `epicalcos.com`, `www.epicalcos.com`, `epicalcos-ecommerce.netlify.app`, `localhost:8888`)
- **Tope de body**: 8.000 bytes *(`capture-lead` usa 2.000, pero acá hay un campo de consulta)*
- **Topes por campo**: nombre 120 · email 254 · teléfono 40 · ciudad 80 · provincia 60 · consulta 2.000
- **Métodos**: `POST` y `OPTIONS`; cualquier otro → `405`

### Contratos

```js
// Request
POST /api/contacto
{
  nombre: 'Juan Pérez',
  email: 'juan@gmail.com',
  telefono: '3410000000',
  ciudad: 'Rosario',
  provincia: 'Santa Fe',
  consulta: 'Quiero 200 calcos con mi logo',
  website: ''            // honeypot, siempre vacío en un humano
}

// Response OK
200 { ok: true }

// Response error
400 { error: 'campos_invalidos', campos: ['email'] }
405 { error: 'method_not_allowed' }
413 { error: 'payload_too_large' }
502 { error: 'no_se_pudo_enviar' }
```

> ⚠️ **Diferencia deliberada con `capture-lead`**: aquel devuelve `200` aunque
> falle todo, porque lo único que le importa al cliente es el cupón. Acá **no**:
> si el mail no salió, la consulta no existe. `502` y el frontend ofrece
> WhatsApp. Prometer un "listo" falso es peor que el error.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | Ninguno | No |
| Notion | Ninguno | No |
| **Resend** | Uso nuevo: `sendContactEmail()`. Reusa `RESEND_API_KEY` y `NOTIFY_EMAIL_TO` | **No** — está fuera del checkout |
| Cloudinary | Ninguno | No |
| Meta (Pixel / CAPI) | Solo el `Lead` que ya dispara `trackLeadCapture` | No |
| CRM interno | `notifyCrmLead()` con `context: 'Formulario de contacto'` (RF-11) | No — ya es no-op si no está configurado |
| **Instagram** | **Ninguna integración técnica.** Las imágenes son archivos propios del sitio; los links salen a `instagram.com` | No |

**Nota sobre el mail**: va **a** `epicalcos@gmail.com`, la casilla dueña de la
cuenta de Resend, así que funciona con el remitente default
`onboarding@resend.dev`. La restricción de dominio verificado aplica al mail
**al cliente**, que está fuera de scope.

### Variables de entorno nuevas

| Variable | Dónde | ¿Secreto? |
|---|---|---|
| — | — | **Ninguna.** Reusa `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM`, `CRM_WEBHOOK_*` |

*(La opción C de §11 —feed por API— hubiera necesitado un `INSTAGRAM_TOKEN`. Se descartó: ver §11.)*

---

## 6. Seguridad

`CLAUDE.md` regla 14.

- [x] Ningún secreto en el frontend: el `RESEND_API_KEY` solo lo lee la Function
- [x] El servidor **revalida los seis campos**: la validación del navegador es UX, no seguridad
- [x] Tope de body (8 KB) y tope por campo (§4)
- [x] El contenido del cliente se escapa antes de armar el HTML del mail — `notify.js` ya tiene `esc()` para esto
- [x] Sin PII en logs (`console.error` sin body), ni en URLs, ni en el `dataLayer`
- [x] CORS restringido a los orígenes propios
- [x] No recibe webhooks: no hay firma que verificar
- [x] **No afecta la CSP** — el POST es a `'self'` y las imágenes de Instagram son archivos propios. `img-src` ya permite `'self'`, y no se agrega ningún `script-src` ni `frame-src` nuevo

**Riesgos y mitigación**

| Riesgo | Mitigación |
|---|---|
| Spam de bots al endpoint | Honeypot `website` + rechazo si `consulta` tiene menos de 10 caracteres. Sin captcha (RNF-4) |
| Inyección de HTML en el mail | `esc()` sobre todos los campos antes de armar el cuerpo |
| Header injection vía `reply_to` | El mail se valida con regex y con el tope de 254 antes de usarse |
| Alguien usa el endpoint para mandar mails a terceros | El destino es **fijo** (`NOTIFY_EMAIL_TO`), no viene del cliente |
| Flood desde un mismo navegador | Cooldown en el cliente (un envío cada 30 s) + tope de body. Un rate-limit real por IP queda anotado como hallazgo |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Falla de red | El `fetch` rechaza; el estado vuelve a editable con los datos puestos | *"No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp"* + botón a WhatsApp |
| Timeout de Resend | La Function devuelve `502` | Igual que el anterior |
| Payload inválido | `400` con los campos que fallan | El error se pinta junto al campo |
| Falla el CRM y el mail salió | Se loguea y se sigue | `200`: la consulta llegó |
| Falla el mail y el CRM salió | `502` | El error, con WhatsApp |
| Blobs no disponible | No aplica: no se usa Blobs | — |
| `price_mismatch` | No aplica: no toca precios | — |

**Principios del repo aplicados**

- El tracking nunca rompe el envío: los tres eventos van en `try/catch` (ya lo
  hace `analytics.js` internamente).
- **Fallar cerrado**: si el mail no salió, no se dice que salió.

---

## 8. Estrategia de migración

**No aplica: no hay datos ni comportamiento previo que migrar.** La página de
hoy son enlaces sin estado.

- **Datos existentes**: ninguno
- **Carritos guardados**: no se tocan
- **Pedidos en Blobs**: no se tocan
- **Compatibilidad hacia atrás**: las URLs `wa.me` y `mailto:` que había siguen
  existiendo (la de mail, ahora dentro de la card del formulario)
- **Rollback**: revertir el commit. La Function nueva queda huérfana y no la
  llama nadie; no hay dato que limpiar
- **Feature flag**: no hace falta uno propio — `HIDDEN_SECTIONS` ya puede
  despublicar `/contacto` entera si hiciera falta

---

## 9. Testing

### Tests nuevos

| Archivo | Qué verifica |
|---|---|
| `frontend/src/lib/contacto.test.js` | `validarConsulta`: campo por campo vacío, mail inválido (`juan@gmail`), teléfono con `+54`/espacios/guiones, teléfono corto, consulta de menos de 10 caracteres, consulta en el tope, provincia fuera de la lista, y el caso feliz (sin errores) |

### ⚠️ Tests de paridad

**No aplican**: la feature no toca precios, promos, cupones ni envíos.

- [ ] ~~`promoPricing.test.js`~~ — no aplica
- [ ] ~~`envio.test.js`~~ — no aplica
- [ ] ~~`precioPersonalizados.test.js`~~ — no aplica

*(Los tres tienen que seguir pasando igual: son parte de la regresión.)*

### Verificación manual

Lo que no cubren los tests (no hay infraestructura para renderizar componentes):

- [ ] Envío real del formulario y **mail recibido** en `epicalcos@gmail.com`
- [ ] **Responder el mail** cae en la casilla del cliente (`reply_to` correcto)
- [ ] La card de WhatsApp abre el chat **con el texto ya escrito**, en Android y en iOS
- [ ] A 375 px: sin scroll horizontal, teclado correcto en cada campo
- [ ] La página funciona dentro del navegador embebido de Instagram

---

## 10. Dependencias nuevas

**Ninguna.** El formulario son seis `<input>`/`<select>`/`<textarea>` y un
`fetch`; la validación es una función pura. `CLAUDE.md` regla 10.

La grilla de Instagram tampoco suma nada: son seis `<img>` y un array. El
script de build usa `magick` y `cwebp`, que ya son requisito de
`build-marcas.mjs` y **no se instalan con npm**: no entran al bundle ni al deploy.

---

## 11. Decisiones cerradas

### ✅ Card de Instagram — **opción A: grilla curada propia** *(25/8/2026)*

*"¿Hay manera de enlazar la cuenta de Instagram con el sitio web?"* — Hay
cuatro, y no cuestan lo mismo. Quedan documentadas porque la decisión se va a
volver a discutir el día que alguien pida "que se actualice solo":

| | Opción | Se actualiza | Costo real | Veredicto |
|---|---|---|---|---|
| **A** | **Grilla curada propia**: fotos del sitio que linkean a cada posteo | A mano, corriendo un script | Cero scripts de terceros, cero tokens, cero cookies. Imágenes `webp` propias | ✅ **ELEGIDA** |
| **B** | **Embed oficial** (`<blockquote class="instagram-media">` + `embed.js`) | El posteo queda fijo; el contenido lo sirve Instagram | Script de Meta + un `iframe` por posteo (cientos de KB), cookies de terceros, y hay que sumar `instagram.com` a `script-src` y `frame-src` de la CSP | ❌ |
| **C** | **Feed por API** (*Instagram API with Instagram Login*) | Solo | App en Meta, cuenta profesional, y **el token de larga duración vence a los 60 días**: sin una función programada que lo refresque, el feed se apaga solo un martes cualquiera | ❌ |
| **D** | **Widget de terceros** (Elfsight, Behold, SnapWidget) | Solo | Script externo pesado, suscripción mensual y un tercero más en el camino. Choca con la regla 10 | ❌ |

**Por qué A**: es la única que no le cuelga nada al navegador del cliente ni
deja una fecha de vencimiento escondida. Las otras tres compran "se actualiza
solo" con kilobytes, cookies de Meta o un token que hay que renovar; para seis
fotos que cambian cuando Mariano quiera, no vale la pena.

**Cómo se implementa** — mismo patrón que el ticker de marcas
(`scripts/build-marcas.mjs`), que ya resolvió este problema exacto:

```
carpeta fuera del repo            scripts/build-instagram.mjs         el sitio
(capturas de los posteos          recorta al cuadrado, 640×640,  ──►  public/images/instagram/*.webp
 + posts.txt con los links)  ──►  convierte a webp                    src/data/instagram.js
```

- `frontend/src/data/instagram.js` exporta `[{ src, permalink, alt }, …]` —
  **generado, no se edita a mano** (igual que `src/data/marcas.js`).
- La card renderiza una grilla 3×2: `aspect-square`, `object-cover`,
  `loading="lazy"`, cada imagen dentro de un `<a>` al posteo con
  `target="_blank" rel="noopener noreferrer"`.
- Abajo, un CTA a `contact.instagramUrl` que dispara `instagram_click`.
- **Degradación**: si una imagen falla (`onError`), esa celda se oculta; si
  fallan las seis, queda la card con el CTA al perfil. Nunca rompe la página.
- El `alt` de cada foto sale del `posts.txt`: sin `alt` útil son seis imágenes
  mudas para un lector de pantalla (RNF-3).

**Para actualizar la grilla** (se documenta en `docs/`):
```bash
node scripts/build-instagram.mjs
```

### ✅ Alta en el CRM (RF-11) — **sí** *(25/8/2026)*

`notifyCrmLead({ email, name, context: 'Formulario de contacto' })`. Ya dedupea
por mail y ya es no-op si `CRM_WEBHOOK_URL` / `CRM_WEBHOOK_SECRET` no están
seteadas. Si el CRM falla, el mail igual sale y la respuesta es `200`.

### ✅ Plazo de respuesta (RF-8) — ***"Te respondemos en el día"*** *(25/8/2026)*

⚠️ Es una promesa explícita al cliente, no un texto de relleno. Si deja de
sostenerse, se baja a *"menos de 24 hs hábiles"*: es un cambio de copy y no
necesita spec.

---

## 12. Preguntas abiertas del diseño

**Ninguna.** El diseño está cerrado y listo para revisión.
