# Design — Calcos para negocios

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 05/10/2026 |

---

## 0. Hallazgos del discovery

El detalle con evidencia está en [`AUDIT.md`](AUDIT.md). Lo que decide el diseño:

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | Sí, en partes: Promo Negocio (`NegocioForm`), pack x100 y pack mayorista (`PackBuilder` en `/mayorista`), pack holográfico y tope a Negocio en el configurador (`lib/precioPersonalizados.js`), formulario que falla cerrado (`/contacto`), subida a Cloudinary (`SubidaArchivo`), ticker de marcas, A/B propio con override por URL (`?exp_<id>=<variante>`) |
| ¿Qué archivos están involucrados? | §2 |
| ¿Hay tests que lo cubran hoy? | El precio de cada producto sí (`promoPricing`, `precioPersonalizados`, `envio`). La **combinación** de productos para un pedido de negocio no existe y no tiene test |
| ¿Toca el camino de precios? | **Lo lee, no lo cambia.** El cotizador combina productos con ids que el servidor ya acepta. Ni `config/pricing.js` ni `netlify/functions/lib/pricing.js` cambian |
| ¿Comentarios que expliquen por qué está así? | Sí, y mandan: `NEGOCIO` "1 unidad por línea" (el servidor rechaza `quantity ≠ 1`), ids con sufijo `-{i}` para varios packs en el mismo milisegundo (`construirLineasNegocio`), holográfico con un recargo **por pack** emparejado por id (`pricing.js` del servidor, `requierenRecargo`), "ninguna promo regala el envío", "ningún monto escrito a mano" |

---

## 1. Arquitectura propuesta

```
                     ┌──────────────────────────────┐
config/pricing.js ──▶│ lib/cotizadorNegocio.js      │  función PURA
config/personalizados│  cotizarPedidoNegocio()      │  (sin React, testeable contra el servidor)
lib/precioPersonaliz.│  lineasPedidoNegocio()       │
                     └──────────────┬───────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────────┐
         ▼                          ▼                              ▼
components/negocios/        components/negocios/            scripts/prerender.mjs
Cotizador.jsx               SueltaVsPack.jsx                (HTML estático de /negocio,
 + SubidaArchivo (reuso)     (tabla de precios)              /mayorista, landings)
 + useCart().addNegocio/addPack/addFixed
         │
         ├── "Agregar al carrito" ──▶ CartContext (sin cambios) ──▶ checkout de siempre
         └── "Pedir presupuesto" ──▶ FormularioPresupuesto ──▶ POST /api/presupuesto
                                                                  ├─▶ Resend (mail a Mariano)  ← falla cerrado
                                                                  └─▶ CRM interno (lead)        ← best-effort
```

Las páginas se arman con **secciones chicas y reutilizables** en
`components/negocios/`, y el texto vive en un archivo de config
(`config/negocios.js`), igual que `/personalizados` con
`config/personalizadosLanding.js`. Así el mismo dato alimenta la página React
y el HTML prerenderizado, y no pueden decir cosas distintas.

### Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D-1 | El cotizador **combina productos existentes** y emite sus líneas de siempre | Un precio por volumen nuevo para el cotizador | Un segundo motor de precios es exactamente lo que el pedido pide no hacer (§21) y lo que el servidor rechazaría (`price_mismatch`) |
| D-2 | Elige la combinación **más barata** que el servidor acepta | Mandar a cada cliente a "su" página (`/negocio`, `/mayorista`, `/personalizados`) | Hoy esa derivación le cobra $630.000 a quien la tienda le podría cobrar $158.997 (AUDIT H-2) |
| D-3 | Subida y "Agregar al carrito" **dentro** del cotizador | Link a `/personalizados` con datos precargados | El link agrega una página, y el configurador de la 023 no arma packs con varios diseños. Además tocaría código de una spec en curso |
| D-4 | `CartContext` **no se toca** | Una acción nueva "reemplazar el pedido del cotizador" | Es el módulo de mayor radio de impacto. El doble agregado se evita en el componente (D-11) |
| D-5 | `/negocio` es la landing B2B; **la URL no cambia** | `/para-negocios` nueva + 301 desde `/negocio` | `/negocio` está indexada, en anuncios y en el ticker. Los nombres lindos son alias 301 |
| D-6 | Nav: Para negocios · Precios · Con tu diseño · Tienda · Preguntas + **Cotizar** | El nav literal del pedido (sin "Con tu diseño") | `/personalizados` es el camino del negocio que necesita menos de 100 y tiene tráfico propio; sacarlo del nav lo esconde. "Cómo funciona" es un ancla de `/negocio`: queda en la página y en el footer |
| D-7 | El Home B2B es **variante de un A/B** (`home_b2b`), apagado hasta lanzar | Reemplazar el Home | Riesgo R-1: el Home de hoy es el que vende. Con el A/B, el rollback es un `active: false` |
| D-8 | La variante B2B se baja **lazy**; el control no cambia de peso | Las dos variantes en el chunk del Home | El chunk del Home viaja en TODAS las rutas (lección de la spec 028 con `framer-motion`) |
| D-9 | Formulario de presupuesto con endpoint propio que **falla cerrado** | Reusar `/api/contacto` con un campo "tipo" | Son datos distintos (cantidad, tamaño, material, archivo) y un destino distinto en el CRM; mezclarlos ensucia las dos cosas. El patrón sí se copia de `contacto.js` |
| D-10 | Secciones con fotos leen una lista y **no se montan** si está vacía | Placeholders o imágenes de stock | Regla vigente de Mariano; patrón de `data/personalizadosFotos.js` |
| D-11 | Tras agregar, el CTA pasa a "Ver carrito"; cambiar la configuración muestra "Agregar este pedido también" | Reemplazar automáticamente lo agregado | Sin tocar `CartContext` (D-4) y sin que un cliente pierda un pedido que quería sumar |
| D-12 | Sin librerías nuevas | `react-hook-form`, una lib de A/B, `framer-motion` en las secciones | Regla 10. El formulario es el de `/contacto`; el A/B es `lib/experiments.js`; el movimiento es CSS |

---

## 2. Componentes afectados

### Archivos nuevos

| Archivo | Responsabilidad | Fase |
|---|---|---|
| `frontend/src/lib/cotizadorNegocio.js` | `cotizarPedidoNegocio()` y `lineasPedidoNegocio()` (§3) | 2 |
| `frontend/src/lib/cotizadorNegocio.test.js` | Tabla de casos + **paridad contra `validateAndPriceOrder()` real**, MP y transferencia, con la promo x100 prendida y apagada | 2 |
| `frontend/src/config/negocios.js` | Todo el copy B2B: cantidades del cotizador, usos, pasos, preguntas (con `publicar: false` las que dependen de un TODO), mensajes de WhatsApp, SEO | 1 |
| `frontend/src/data/negociosFotos.js` | Fotos reales B2B por sección (hoy: solo `negocio-muestra.webp`) | 1 |
| `frontend/src/components/negocios/HeroNegocio.jsx` | Hero B2B (pedido: *WholesaleHero*) | 1 |
| `…/negocios/BarraConfianza.jsx` | 4 datos verificables (*TrustBar*) | 1 |
| `…/negocios/Cotizador.jsx` | El cotizador (*BulkCalculator*): pasos, precio, subida, carrito, salida a presupuesto/WhatsApp | 2 |
| `…/negocios/GrupoOpciones.jsx` | Radio-group accesible genérico para cantidad / tamaño / material / diseños (*QuantitySelector*, *SizeSelector*, *MaterialSelector*). Se reusa `SelectorTamano`/`SelectorMaterial` de personalizados **solo** si sus props lo permiten sin tocarlos | 2 |
| `…/negocios/PrecioPedido.jsx` | Total, precio por calco, transferencia, ahorro (*PricePerUnit*, *BulkDiscount*) | 2 |
| `…/negocios/SueltaVsPack.jsx` | Tabla suelta vs. desde 100 por tamaño (*WholesaleTable*). La escalera 100/250/500/1.000 solo si N-1 = B | 2 |
| `…/negocios/UsosNegocio.jsx` | 6 cards de uso (*UseCaseCard*); foto si existe | 3 |
| `…/negocios/Materiales.jsx` | Card por material (*MaterialCard*) desde `MATERIALES` | 3 |
| `…/negocios/ComoFunciona.jsx` | Timeline de 4 pasos (*HowItWorks*) | 1 |
| `…/negocios/Recurrentes.jsx` | "¿Pedís calcos todos los meses?" (*BusinessCTA*); se monta con N-4 resuelto | 3 |
| `…/negocios/PedidosGrandes.jsx` | Banda +1.000 | 2 |
| `…/negocios/FormularioPresupuesto.jsx` | *QuoteForm* | 2 |
| `…/negocios/PreguntasNegocio.jsx` | FAQ B2B + JSON-LD con las preguntas **publicadas** | 3 |
| `…/negocios/GaleriaNegocios.jsx` | *ProductGallery* / antes-después; no se monta sin fotos | 3 |
| `…/negocios/CaminoTienda.jsx` | "¿Buscás calcos para vos?" + categorías + Ver tienda (camino B) | 3 |
| `…/negocios/BarraNegocioMovil.jsx` | *StickyMobileCTA* | 2 |
| `…/negocios/CtaFinalNegocio.jsx` | CTA final | 1 |
| `frontend/src/routes/HomeB2B.jsx` | Variante B2B del Home (lazy) | 3 |
| `frontend/src/lib/whatsapp.js` | `mensajeWhatsapp(pathname, contexto)` y `hrefWhatsapp(mensaje)` + test | 2 |
| `frontend/src/lib/presupuesto.js` | Validación compartida del formulario (espejo del servidor, como `lib/contacto.js`) + test | 2 |
| `frontend/src/services/presupuestoService.js` | `POST /api/presupuesto` con timeout | 2 |
| `netlify/functions/presupuesto.js` | Endpoint (§4) | 2 |
| `frontend/src/lib/negociosEstatico.js` | HTML + JSON-LD estáticos para el prerender, desde `config/negocios.js` | 4 |
| `frontend/src/routes/LandingPackaging.jsx` | `/calcos-para-packaging` (o entrada nueva en `config/landings.js` si su componente lo soporta) | 4 |

Los nombres en cursiva son los del pedido (§20), para que se puedan encontrar.
Los nombres de archivo siguen la convención del repo: en español.

**Se reutilizan sin cambios**: `MarcasConfiaron` (*ClientLogos*),
`Testimonials`/`SocialProof` (*SocialProof*), `SubidaArchivo` + `uploadService`
(subida), `Breadcrumbs`, `Reveal`, `useSeo`, `formatPrice`.

### Archivos que se modifican

| Archivo | Cambio | Riesgo | Fase |
|---|---|---|---|
| `frontend/src/config/site.js` | `navLinks` nuevo (D-6); `footerLinks` en 4 grupos; `anunciosVigentes(now, { negocio })` suma "Calcos con tu logo desde 100 unidades" en páginas B2B. **El bloque de envíos no se toca** | 🟡 (módulo compartido, 40 importadores; el bloque espejado queda intacto) | 1 |
| `frontend/src/components/Header.jsx` | Botón **Cotizar** (→ `/negocio#cotizador`), `negocio` a la tira según la ruta | 🟡 | 1 |
| `frontend/src/components/Footer.jsx` | Renderiza los 4 grupos | 🟢 | 1 |
| `frontend/src/routes/Negocio.jsx` | Pasa a landing B2B (RF-NE1). `NegocioForm.jsx` queda en el repo sin montar (criterio: no se borra) | 🟡 | 1–3 |
| `frontend/src/routes/Mayorista.jsx` | Banda de pedidos grandes + presupuesto arriba del armador | 🟢 | 3 |
| `frontend/src/routes/Home.jsx` | `useExperiment('home_b2b')` → control (el de hoy, intacto) o `<HomeB2B/>` lazy | 🟡 | 3 |
| `frontend/src/lib/experiments.js` | `home_b2b: { active: false, variants: ['control', 'b2b'] }` | 🟢 | 3 |
| `frontend/src/components/WhatsAppButton.jsx` | `href` con mensaje según `mensajeWhatsapp(pathname)`; se eleva con `var(--barra-inferior)` cuando hay barra B2B | 🟡 | 2 |
| `frontend/src/lib/analytics.js` | `trackHeroCta`, `trackCotizadorStart`, `trackCotizadorComplete`, `trackPresupuestoStart`, `trackFaqOpen`; `generate_lead` con `lead_source: 'presupuesto_negocio'` vía `trackLeadCapture` existente | 🟡 (salida única a GA4/Meta) | 1–3 |
| `frontend/src/lib/resumenPedido.js` | Agrupa las líneas de un mismo pedido del cotizador (`meta.pedidoNegocio.grupo`) en un solo bloque para el mail/CRM | 🟡 (tiene tests) | 2 |
| `netlify/functions/lib/notify.js` | `sendPresupuestoEmail()` (mismo formato que `sendContactEmail`) | 🟡 | 2 |
| `netlify.toml` + `frontend/public/_redirects` | `/api/presupuesto` (200) y los alias 301 (RF-SEO4), **en los dos archivos** | 🟡 (la spec 030 tiene WIP en `netlify.toml`) | 2, 4 |
| `scripts/prerender.mjs` | Genera `negocio.html`, `mayorista.html`, `calcos-para-packaging.html` | 🟡 (nunca corta el build) | 4 |
| `scripts/generate-sitemap.mjs` | Suma la landing nueva | 🟢 | 4 |
| `docs/analytics.md`, `docs/architecture.md`, `docs/business-rules.md` | Eventos, endpoint, cómo cotiza el cotizador | 🟢 | cada fase |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** (solo se lee) | 47 archivos |
| `frontend/src/config/site.js` | Sí: nav, footer, tira. **No** envíos | 40 archivos, incluido `scripts/generate-sitemap.mjs` |
| `frontend/src/context/CartContext.jsx` | **No** | 29 archivos |
| `netlify/functions/lib/pricing.js` | **No** | `create-preference`, `create-order-transfer`, tests |
| `frontend/src/lib/analytics.js` | Sí: funciones nuevas, ninguna existente cambia | 43 archivos |
| `frontend/src/lib/experiments.js` | Sí: un experimento nuevo apagado | 9 archivos |
| `frontend/src/lib/precioPersonalizados.js` | **No** (se importa `repartoNegocio`) | 5 archivos |
| `components/personalizados/SubidaArchivo.jsx` | **No** (se usa con sus props) | `NegocioForm`, `PackBuilder`, `FixedProductPage` |

---

## 3. Datos — el cotizador

### 3.1 Entrada y salida

```js
cotizarPedidoNegocio({
  cantidad,        // 100 | 250 | 500 | 1000 | 'mas' (N-8)
  tamano,          // '4cm' | '6cm' | '9cm'
  material,        // 'vinilo-blanco' | 'dtf-uv' | 'vinilo-holografico'
  disenos,         // entero ≥ 1
  now = Date.now() // para isMayoristaPromoActive(): testeable sin mockear el reloj
}) → {
  estado: 'precio' | 'presupuesto' | 'incompleto',
  motivo,                 // si 'presupuesto': 'mas_de_1000' | 'sin_precio_online'
  producto,               // 'negocio' | 'mayorista100' | 'mayorista' | 'holografico'
  packs,                  // packs de 100 (0 en 'mayorista')
  unidades,               // lo que se lleva (≥ cantidad: puede redondear a packs)
  total, unitario,                        // Mercado Pago
  totalTransferencia, unitarioTransferencia,
  referenciaSuelta, ahorro, ahorroPct     // según N-2; ahorro 0 si no es positivo
}
```

Nada de esto se persiste: se recalcula en cada render desde el config, igual
que `precioVidrieraLinea()`. Si una promo se apaga, el próximo render ya cotiza
sin ella (RF-C15).

### 3.2 Tabla de decisión (con las reglas al 5/10/2026)

El orden importa: la primera fila que aplica gana. Cada fila usa **solo**
constantes que ya existen.

| # | Material | Tamaño | Diseños | Producto | Cómo se calcula | Por calco hoy |
|---|---|---|---|---|---|---|
| 1 | cualquiera | — | — | — | `cantidad === 'mas'` → `presupuesto / mas_de_1000` | — |
| 2 | holográfico | 4 / 6 cm | ≥ 1 | Pack holográfico | `packs = ceil(cantidad / 100)`; `total = packs × (NEGOCIO.price + RECARGO_HOLOGRAFICO.precio)` | $730 |
| 3 | holográfico | 9 cm | — | — | no se puede elegir (RF-C4) | — |
| 4 | vinilo blanco o DTF UV | 6 cm | 1 | Promo Negocio | `repartoNegocio({ tamano, copias: cantidad })` → packs (+ sueltas si alguna vez conviene) | $530 |
| 5 | vinilo blanco | 4 / 6 cm | ≥ 2 (o 4 cm con 1) | Promo x100 si `isMayoristaPromoActive(now)` | `packs = ceil(cantidad / 100)` (salvo que sueltas sean más baratas: no pasa con 50) ; `total = packs × PROMO_MAYORISTA_100.price` | $530 |
| 6 | vinilo blanco | 4 / 6 cm | ≥ 1 | Pack mayorista (promo x100 apagada) | `total = cantidad × round(SIZE.price × (1 − WHOLESALE_DISCOUNT))` | $800 / $1.050 |
| 7 | vinilo blanco | 9 cm | ≥ 1 | Pack mayorista | ídem fila 6 | $1.325 |
| 8 | DTF UV | 4 / 9 cm, o ≥ 2 diseños | — | — | `presupuesto / sin_precio_online` (N-10) | — |

`totalTransferencia` se calcula **por línea con el mismo redondeo que el
servidor** (unitario × (1 − `TRANSFER_DISCOUNT`), redondeado por unidad). No se
redondea el total: un "ahorrás" que no coincide con el checkout es una promesa
rota (comentario de `precioPersonalizados.js`).

> ⚠️ Si Mariano elige N-1 = B (escalera nueva), la escalera entra como **otra
> regla de precio espejada** en una spec propia, y esta tabla suma una fila.
> El cotizador no inventa la escalera.

### 3.3 De la cotización a las líneas del carrito

`lineasPedidoNegocio(cotizacion, { archivos, negocio, notas, ts })` devuelve
las líneas que ya existen hoy, con ids únicos por pedido:

| Producto | Líneas | Precedente |
|---|---|---|
| Promo Negocio | `packs` × `negocio:{material}:{ts}-{i}` (`quantity 1`), vinilo blanco sin material: `negocio:{ts}-{i}` | `construirLineasNegocio()` |
| Promo x100 | `packs` × `pack:mayorista100:{size}:{ts}-{i}` (`quantity 1`, `meta.qty 100`) | `PackBuilder` |
| Pack mayorista | 1 × `pack:mayorista:{size}:{ts}` (`quantity = cantidad`) | `PackBuilder` |
| Holográfico | `packs` × (`negocio:vinilo-holografico:{size}:{ts}-{i}` + `fixed:material-holografico:{ts}-{i}`) — **un recargo por pack, emparejado por id** | `construirLineaHolografica()` + `agregarRecargoHolografico()` |

- Los **archivos** van en `meta.archivos` de la **primera** línea; todas llevan
  `meta.pedidoNegocio = { grupo: ts, parte: i, de: n, disenos, reparto }`.
  `buildDesignSummary()` agrupa por `grupo`: un solo bloque en el mail con los
  links una vez (los comentarios tienen tope de 20 KB).
- `meta.reparto` = "partes iguales salvo indicación" (N-9).
- `name` **nunca** lleva el nombre del archivo (va a GA4/Meta): "Calcos para
  negocio · 300 u · 6 cm · Vinilo blanco".
- **El servidor no cambia.** Lo prueba el test de paridad: arma las líneas,
  las pasa por `validateAndPriceOrder()` real con `mercadopago` y con
  `transferencia`, y compara el total con el que muestra el cotizador, para
  cada fila de §3.2 y cada cantidad, con la promo x100 prendida y apagada.

### 3.4 Persistencia y compatibilidad

- No hay estructura persistida nueva. Las líneas son de forma conocida: un
  carrito guardado de antes no cambia, y uno guardado después lo entiende
  cualquier versión del sitio.
- El estado del cotizador (opciones elegidas) vive en el componente. Si se
  quiere sobrevivir a una recarga, `sessionStorage` en `try/catch` —nunca
  `localStorage` (no es un borrador que deba durar días).

---

## 4. APIs

### Endpoints afectados
Ninguno de pago. `create-preference` y `create-order-transfer` reciben líneas
que ya conocen.

### Endpoint nuevo: `POST /api/presupuesto`

`netlify/functions/presupuesto.js`, copiado del patrón de `contacto.js`:

```json
// request
{
  "nombre": "string ≤120 (obligatorio)",
  "whatsapp": "string ≤40, ≥8 dígitos (obligatorio)",
  "email": "string ≤254 (obligatorio si N-11 = mail obligatorio)",
  "negocio": "string ≤120",
  "cantidad": "100 | 250 | 500 | 1000 | 'mas' | número ≤ 1.000.000 (obligatorio)",
  "tamano": "'4cm'|'6cm'|'9cm'|'no-se'",
  "material": "'vinilo-blanco'|'dtf-uv'|'vinilo-holografico'|'no-se'",
  "disenos": "entero 1–1000",
  "observaciones": "string ≤2000",
  "archivos": [{ "nombre": "≤150", "url": "https://res.cloudinary.com/<cloud>/…" }],  // ≤10
  "origen": "'negocio'|'mayorista'|'home'|'packaging'|'cotizador'",
  "website": "honeypot, tiene que venir vacío"
}
// 200 { ok: true }   ·   400 { error: 'invalid', campos: [...] }   ·   502 { error: 'not_sent' }
```

- CORS a orígenes propios, body ≤ 10 KB, `OPTIONS` y método distinto de `POST`
  rechazados — igual que `contacto.js`.
- Las URLs de archivo se aceptan **solo** si son de `res.cloudinary.com` con el
  cloud name del sitio: el endpoint no es un relay de links arbitrarios.
- Topes espejados en `lib/presupuesto.js` (frontend) con un test que compara
  los dos, como `contacto`.

---

## 5. Integraciones

| Servicio | Uso | Cambio |
|---|---|---|
| Resend | Mail a Mariano con el presupuesto | Plantilla nueva en `notify.js`. **Falla cerrado** |
| CRM interno | `lead.created` con `lead.fuente = 'presupuesto_negocio'` y los datos del pedido | Best-effort. ⚠️ Hoy descarta leads sin mail (N-11). Verificar en `epicalcos-app` que acepte los campos nuevos o que los guarde en notas |
| Cloudinary | Archivos del cotizador y del presupuesto | Reusa el preset de Negocio (`VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO`, con caída al default como hoy) |
| GA4 / Meta Pixel | Eventos de §11 de requirements | Solo vía `lib/analytics.js` |
| Notion | — | No se toca: los presupuestos no son pedidos |
| Mercado Pago | — | No se toca |

### Variables de entorno nuevas
Ninguna obligatoria. Opcional: `PRESUPUESTO_EMAIL_TO` si Mariano quiere los
presupuestos en otra casilla que las consultas (N-12); sin ella, va al mismo
destino que `/contacto`.

---

## 6. Seguridad

- Ningún secreto nuevo en el frontend; el upload sigue siendo unsigned con el
  preset (contrapartida ya conocida, `architecture.md` §10).
- El endpoint revalida todo lo que valida el navegador, tiene honeypot y topes
  de tamaño, y **nunca** loguea el body (PII).
- Analytics sin PII: ni nombre, ni negocio, ni mail, ni teléfono, ni nombre de
  archivo, ni observaciones. La cantidad del lead va en rango
  (`100-499`, `500-999`, `1000+`).
- El precio sigue validado por el servidor: si el cotizador se equivocara, el
  checkout rechaza (`price_mismatch`) en vez de cobrar mal. El test de paridad
  existe para que eso no llegue a producción.
- CSP: el formulario postea al mismo origen; Cloudinary ya está en
  `connect-src`.

---

## 7. Manejo de errores

| Falla | Qué ve el cliente | Qué pasa por atrás |
|---|---|---|
| Cloudinary no sube | "No pudimos subir el archivo" + reintentar o seguir sin archivo ("lo mandás por WhatsApp después de pagar") | Evento `personalized_upload_error` existente con `origen: 'cotizador'` |
| `/api/presupuesto` 502/red | "No pudimos registrar tu pedido" + **WhatsApp con el pedido escrito** | `trackContactoFormError`-equivalente, sin datos |
| Validación | Error junto al campo, foco al primero | — |
| La promo x100 se apaga con la página abierta | El precio cambia al próximo render y se muestra el nuevo | El checkout cobra el vigente |
| `/api/presupuesto` responde 200 pero el CRM falla | "Listo" (el mail salió) | Log sin PII; el lead está en el mail |
| El A/B no puede leer `localStorage` (Instagram) | Ve el control | Sin exposición registrada (como hoy) |

---

## 8. Estrategia de migración y rollback

Las fases y sus gates están en [`WHOLESALE-MIGRATION.md`](WHOLESALE-MIGRATION.md).
Lo técnico:

| Pieza | Cómo se publica | Cómo se apaga |
|---|---|---|
| Nav, footer, tira | Deploy normal | Revert del commit (cambia solo `site.js`/`Header`/`Footer`) |
| `/negocio` nueva | Deploy normal; la URL no cambia | Revert; la Promo Negocio sigue comprable en todo momento |
| Cotizador | Dentro de `/negocio` | `config/negocios.js → cotizador.activo = false` vuelve a mostrar la Promo Negocio sola |
| Home B2B | `home_b2b.active = true` | `active: false` (todos al control). Forzar para QA: `?exp_home_b2b=b2b` |
| Alias 301 | `netlify.toml` + `_redirects` | Borrar las líneas |
| Landing de packaging | Ruta + prerender + sitemap | `HIDDEN_SECTIONS` |

Orden de deploy dentro de una fase: primero lo que no se ve (lib + tests),
después la página. Nada de esta spec necesita migrar datos.

---

## 9. Recompra — cómo se haría después (no se implementa)

El pedido pide preparar "Mis pedidos → Repetir pedido → Cambiar cantidad →
Comprar". Sin cuentas de usuario no hay "Mis pedidos", **pero se puede repetir
un pedido sin cuentas**, con piezas que ya existen:

1. Cada pedido ya se guarda completo en Netlify Blobs (`orderStore.saveOrder`)
   con sus líneas y `meta` (incluidos los links de Cloudinary). **Verificar** la
   retención de ese store antes de prometer "repetí cuando quieras".
2. El mail de confirmación suma **"Repetir este pedido"**: un link firmado
   (HMAC, mismo esquema que `entregar-digital` y la baja de mails)
   `/repetir?o=EPI-…&t=…`.
3. `GET /api/repetir` verifica la firma, lee el pedido y devuelve sus líneas con
   ids nuevos. El frontend las carga al carrito; `lib/precioVigente.js` ya
   refresca precios de líneas guardadas, así que se cobra el precio de hoy.
4. El cliente cambia la cantidad en el carrito o en el cotizador y compra.

Costo estimado: un endpoint, una ruta y un link en un mail; sin base de datos.
Riesgos: retención de Blobs, archivos borrados de Cloudinary, precios que
cambiaron (se avisa). Es una spec propia cuando el B2B tenga clientes que
repitan.

---

## 10. Performance

| Medida | Cómo |
|---|---|
| El Home control no engorda | `HomeB2B` y todo `components/negocios/` en chunks lazy; se mide el tamaño del chunk principal antes/después |
| LCP de `/negocio` y del Home B2B | Hero con **una** foto real en WebP, `fetchpriority="high"`, `width`/`height` declarados; sin animación JS. Meta: ≤ LCP del Home actual en el mismo arnés (CDP headless con GPU, 375 px, CPU ×4) |
| CLS | Reserva de alto para la barra móvil y el precio del cotizador (el precio no empuja el CTA al cambiar de 5 a 6 dígitos) |
| INP | El cotizador calcula en el mismo tick, sin efectos en cascada; la función pura cuesta microsegundos |
| Imágenes | `scripts/optimize-images.mjs` (WebP 800 + 400 px, ya existe). AVIF no: el pipeline no lo genera y no vale una dependencia |
| Motion | CSS, respeta `prefers-reduced-motion`; nada de `framer-motion` fuera del hero del termo |

---

## 11. Copy propuesto

Todo vive en `config/negocios.js`; los montos se interpolan del config.

| Lugar | Texto |
|---|---|
| Eyebrow | PARA MARCAS Y NEGOCIOS |
| H1 | Calcos con tu logo para tu negocio. |
| Bajada | Desde {100} unidades. Mandanos tu logo o tu diseño y te llegan las calcos listas para pegar en tus pedidos, tu packaging o tus productos. |
| Precio en el hero | Desde **{$530}** por calco · suelta, {$2.100} |
| CTAs | Cotizar mis calcos · Ver precios |
| Cotizador | ¿Cuántas calcos necesitás? — Elegí cantidad, tamaño y material: el precio es el que pagás. |
| Suelta vs. pack | Suelta o desde 100: la misma calco, otro precio. |
| Usos | Un detalle chico que hace que tu marca aparezca en todas partes. |
| Cómo funciona | Pedir tus calcos es así: 1 Elegí cantidad y tamaño · 2 Subí tu diseño · 3 Revisamos tu archivo y te escribimos si hay algo para ajustar · 4 Producimos en {2 a 3 días hábiles} y te lo mandamos (o lo retirás en Rosario) |
| Pedidos grandes | ¿Necesitás 1.000, 5.000 o más? Contanos qué necesitás y te armamos una propuesta. |
| Recurrentes | ¿Pedís calcos todos los meses? — (beneficios según N-4) |
| CTA final | Tu marca también puede ser calco. — Empezá tu pedido desde 100 unidades. |
| Barra móvil | Desde 100 unidades · **Cotizar** |
| Hooks para anuncios/secciones | "Pegá tu marca en cada pedido." · "Tu packaging también habla de tu negocio." · "¿Mandás pedidos todos los días? Mandá tu marca con ellos." · "Calcos para negocios que necesitan más de diez." |

Verificado contra RF-CO2: ninguna frase dice "archivo perfecto", boceto,
muestra ni aprobación previa. El "100" del H1 alternativo y de la barra sale de
`NEGOCIO.qty`.
