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
(escala, spec 032)   │  cotizarPedidoNegocio()      │  (sin React, testeable contra el servidor)
config/personalizados│  lineaPedidoNegocio()        │
                     └──────────────┬───────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────────┐
         ▼                          ▼                              ▼
components/negocios/        components/negocios/            scripts/prerender.mjs
Cotizador.jsx               SueltaVsPack.jsx                (HTML estático de /negocio,
 + SubidaArchivo (reuso)     (tabla de precios)              /mayorista, landings)
 + useCart().addNegocio (línea volumen:)
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
| D-1 | El cotizador **lee la escala por volumen de la spec 032** (config espejado en el servidor) | Un motor de precios propio del cotizador | Un segundo motor de precios es lo que el pedido pide no hacer (§21) y lo que el servidor rechazaría (`price_mismatch`). La escala es UNA tabla que usan todos los caminos de 100+ |
| D-2 | **Una** línea `volumen:` por pedido, con uno o varios diseños | Combinar Negocio / x100 / pack mayorista (versión del 5/10 a la mañana) | Con la escala ya no hace falta combinar: una línea, un precio, y deja de existir el caso de AUDIT H-2 ($630.000 vs. $158.997) |
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
| `frontend/src/lib/cotizadorNegocio.js` | `cotizarPedidoNegocio()` y `lineaPedidoNegocio()` sobre `precioVolumen()` de la spec 032 (§3) | 2 |
| `frontend/src/lib/cotizadorNegocio.test.js` | Casos + **paridad contra `validateAndPriceOrder()` real**, MP y transferencia (§3.3) | 2 |
| `frontend/src/config/negocios.js` | Todo el copy B2B: cantidades del cotizador, usos, pasos, preguntas (con `publicar: false` las que dependen de un TODO), mensajes de WhatsApp, SEO | 1 |
| `frontend/src/data/negociosFotos.js` | Fotos reales B2B por sección (hoy: solo `negocio-muestra.webp`) | 1 |
| `frontend/src/components/negocios/HeroNegocio.jsx` | Hero B2B (pedido: *WholesaleHero*) | 1 |
| `…/negocios/BarraConfianza.jsx` | 4 datos verificables (*TrustBar*) | 1 |
| `…/negocios/Cotizador.jsx` | El cotizador (*BulkCalculator*): pasos, precio, subida, carrito, salida a presupuesto/WhatsApp | 2 |
| `…/negocios/GrupoOpciones.jsx` | Radio-group accesible genérico para cantidad / tamaño / material / diseños (*QuantitySelector*, *SizeSelector*, *MaterialSelector*). Se reusa `SelectorTamano`/`SelectorMaterial` de personalizados **solo** si sus props lo permiten sin tocarlos | 2 |
| `…/negocios/PrecioPedido.jsx` | Total, precio por calco, % de descuento del escalón, transferencia (*PricePerUnit*, *BulkDiscount*) | 2 |
| `…/negocios/EscalaVolumen.jsx` | "Mientras más cantidad, más barato te sale": 100 · 250 · 500 · 1.000 con total, por calco, % y transferencia, más la suelta como referencia (*WholesaleTable*) | 2 |
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
| `frontend/src/config/site.js` → `shipping` | Suma `produccionVolumen: '3 a 5 días hábiles'` y `produccionVolumenDesde: 100` (calcos del pedido) **sin tocar** costos ni umbrales (lo espejado) | 🟡 | 1 |
| `frontend/src/components/CheckoutForm.jsx` + `components/FAQ.jsx` | Con 100+ calcos en el carrito, el checkout muestra `produccionVolumen`; la FAQ general suma "Pedidos de 100 calcos o más: 3 a 5 días hábiles" (RF-P3) | 🟡 camino de compra, solo texto | 1 |
| `netlify/functions/lib/notify.js` → `customerTimeline()` | Cuenta las calcos del pedido **desde los ids** (`sticker`/`custom`/`pack:mayorista` = `quantity`; `negocio`/`mayorista100` = 100; `volumen` = la cantidad del id; fijos y digitales no cuentan) y con 100+ escribe "Tu pedido entra en producción: 3 a 5 días hábiles desde que se confirma el pago. Antes te mandamos la vista previa por WhatsApp" + el envío. Hoy los plazos están escritos a mano ahí | 🟡 mail al cliente | 1 |
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
| `frontend/src/lib/precioPersonalizados.js` | **No** en esta spec (lo cambia la 032 para que el configurador use la escala con 100+) | 5 archivos |
| `components/personalizados/SubidaArchivo.jsx` | **No** (se usa con sus props) | `NegocioForm`, `PackBuilder`, `FixedProductPage` |

---

## 3. Datos — el cotizador

> **Cambió el 5/10/2026.** La primera versión de esta sección combinaba los
> productos de 100 que ya existían (Negocio, x100, pack mayorista, holográfico)
> porque desde 100 el precio era plano. Mariano pidió una escala por volumen
> (N-1), que define la spec 032: el cotizador ahora **lee la escala** y emite
> **una** línea. Es más simple y arregla de raíz el hallazgo H-2.

### 3.1 Entrada y salida

```js
cotizarPedidoNegocio({
  cantidad,        // 100 | 250 | 500 | 1000 | 'mas' (N-8)
  tamano,          // '4cm' | '6cm' | '9cm'
  material,        // 'vinilo-blanco' | 'dtf-uv' | 'vinilo-holografico'
  disenos          // entero ≥ 1 (no cambia el precio: RF-8 de la 032)
}) → {
  estado: 'precio' | 'presupuesto' | 'incompleto',
  motivo,                         // si 'presupuesto': 'mas_de_1000' | 'sin_precio_online'
  ...precioVolumen(...),          // total, cantidadLlevada, escalon, unitario, pct (spec 032)
  totalTransferencia, unitarioTransferencia,   // mismo redondeo que el servidor
  escala                          // las 4 filas del tamaño/material elegidos, para la tabla (RF-E1)
}
```

- `'mas'` → `presupuesto / mas_de_1000`.
- El cotizador no ofrece 9 cm (no se vende por mayor). Si `precioVolumen()`
  devolviera `null` igual, cae en `presupuesto / sin_precio_online`.
- Nada se persiste: se recalcula en cada render desde el config, igual que
  `precioVidrieraLinea()` (RF-C15).
- `totalTransferencia = round(total × (1 − TRANSFER_DISCOUNT))`: la línea es
  `quantity 1`, así que el redondeo por línea del servidor da lo mismo.

### 3.2 La línea

Una sola línea por pedido, definida en la spec 032 (`design.md` §3):

```js
{ id: `volumen:${tamano}:${material}:${cantidadLlevada}:${ts}`,
  type: 'negocio', quantity: 1, basePrice: total,
  name: 'Calcos para negocio · 250 u · 6 cm · Vinilo blanco',   // nunca el nombre de un archivo
  meta: { qty, material, disenos, reparto, archivos, razonSocial, cuit } }
```

- Entra por `addNegocio()`: **`CartContext` no cambia** (D-4).
- `meta.razonSocial` (obligatoria, RF-C16) y `meta.cuit` (opcional) viajan a
  `comments` → mail y CRM, como hoy el "Nombre del negocio" de `NegocioForm`.
- `meta.reparto` = "partes iguales salvo indicación" (N-9).
- `buildDesignSummary()` rotula la línea y lista los links una vez.

### 3.3 Paridad

`cotizadorNegocio.test.js` arma la línea para cada tamaño × material ×
cantidad del cotizador, la pasa por `validateAndPriceOrder()` real con
`mercadopago` y con `transferencia`, y compara el total al peso. La paridad
de la escala en sí (toda cantidad 100–1.000) la cubre la spec 032.

### 3.4 Persistencia y compatibilidad

- La línea `volumen:` la define y la acepta el servidor desde la spec 032; un
  carrito guardado con ella se re-precia con `lib/precioVigente.js`.
- El estado del cotizador vive en el componente. Si se quiere sobrevivir a una
  recarga, `sessionStorage` en `try/catch` —nunca `localStorage`.

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
  "nombre": "nombre y apellido, string ≤120 (obligatorio)",
  "razonSocial": "razón social / empresa, string ≤120 (obligatorio)",
  "email": "string ≤254 (obligatorio)",
  "telefono": "string ≤40, ≥8 dígitos (obligatorio)",
  "cuit": "11 dígitos, con o sin guiones (opcional)",
  "cantidad": "100 | 250 | 500 | 1000 | 'mas' | número ≤ 1.000.000 (opcional)",
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
| La escala cambia con la página abierta | El checkout rechaza con "recargá la página" y al recargar `precioVigente` la arregla | Mismo flujo que una suba de precios |
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
| Cotizador | ¿Cuántas calcos necesitás? — Elegí cantidad, tamaño y material: el precio es el que pagás. Razón social: "La necesitamos para tu factura C." |
| Escala | Mientras más cantidad, más barato te sale. Lo único que no cambia es la calidad. |
| Factura | Emitimos factura C. |
| Usos | Un detalle chico que hace que tu marca aparezca en todas partes. |
| Cómo funciona | Pedir tus calcos es así: 1 Elegí cantidad, tamaño y material · 2 Subí tu diseño · 3 Te mandamos una vista previa gratis por WhatsApp y la aprobás · 4 Producimos en {3 a 5 días hábiles} desde que se confirma y se abona el pedido, y te lo mandamos (o lo retirás en Rosario) |
| Muestra gratis | MUESTRA GRATIS — vista previa digital antes de producir. (En la fila de 100 de la escala, en la barra de confianza y en el paso 3) |
| Material | Vinilo blanco · **Recomendado** — el clásico para calcos, resistente al agua y al sol. DTF UV: mismo precio |
| Pedidos grandes | ¿Necesitás 1.000, 5.000 o más? Contanos qué necesitás y te armamos una propuesta. |
| Recurrentes | ¿Pedís calcos todos los meses? — (beneficios según N-4) |
| CTA final | Tu marca también puede ser calco. — Empezá tu pedido desde 100 unidades. |
| Barra móvil | Desde 100 unidades · **Cotizar** |
| Hooks para anuncios/secciones | "Pegá tu marca en cada pedido." · "Tu packaging también habla de tu negocio." · "¿Mandás pedidos todos los días? Mandá tu marca con ellos." · "Calcos para negocios que necesitan más de diez." |

Verificado contra RF-CO2: ninguna frase dice "archivo perfecto" ni "boceto";
"muestra" aparece siempre como "muestra gratis — vista previa digital". El "100" del H1 alternativo y de la barra sale de
`NEGOCIO.qty`.

---

## 12. Enmienda E-1 — selector del Home y Cotizar (05/10/2026)

| Pieza | Archivo | Cómo |
|---|---|---|
| Selector | `config/selectorCompra.js` + `components/HeroSelector.jsx` | Dos botones `aria-pressed` que muestran sus dos destinos. Textos y precios del config (`SIZES`, `NEGOCIO`, `WHOLESALE_QTY`, `CATEGORY_COUNT`); una opción en `HIDDEN_SECTIONS` no se muestra. La elección se recuerda en `sessionStorage` (con `try/catch`) |
| Home | `routes/Home.jsx` | `HeroSelector` en lugar de `Hero`; sin `IntentSelector`; el buscador va siempre en su sección (ya no lee `hero_buscador`) |
| Diseño propio | `components/DisenoPropioCard.jsx` en `routes/Categorias.jsx` | Card de todo el ancho, `id="diseno-propio"`, antes del buscador y fuera del bloque que espera el catálogo. Precio del blurb de `SPECIALS` |
| Cotizar | `components/BotonCotizar.jsx` | Botón `aria-expanded` que despliega WhatsApp (`hrefWhatsapp`) y "Dejar mis datos" (`COTIZAR_FORM_HREF` = `/contacto?motivo=cotizar#formulario`). Modo flotante (se cierra con Escape, tocando afuera o eligiendo) y en línea (menú del celular) |
| Formulario | `routes/Contact.jsx` (`id="formulario"`), `components/contacto/FormularioContacto.jsx`, `lib/contacto.js` (`CONSULTA_COTIZAR`) | Con `?motivo=cotizar` la consulta arranca armada; el `generate_lead` lleva `motivo: 'cotizar'`. Sin cambios en el servidor |
| Analytics | `lib/analytics.js` | `selector_compra` { paso, opcion } y `cotizar_click` { origen, via } |

**Decisiones**

| # | Decisión | Por qué |
|---|---|---|
| E1-D1 | El hero nuevo es texto y botones sobre `.hero-gradient`, sin las capas animadas | El LCP pasa a ser el H1 (no espera imagen ni chunk) y no hay animación que pausar fuera de pantalla. Framer Motion deja de bajar en el Home |
| E1-D2 | `Hero.jsx`, `HeroCalcos.jsx` e `IntentSelector.jsx` quedan en el repo sin montar | Criterio del proyecto (no se borra) y vuelta atrás con un import |
| E1-D3 | "Dejar mis datos" usa el formulario de /contacto existente, con la consulta precargada | Ya manda mail y CRM y falla cerrado (spec 012). El formulario de presupuesto con campos propios sigue siendo la Fase 2 |
| E1-D4 | La card de Diseño propio se marca al llegar por `#diseno-propio`, sin forzar scroll | Está en la primera pantalla de /categorias; el `ScrollToHash` de App puede no encontrarla si la ruta lazy tarda |

