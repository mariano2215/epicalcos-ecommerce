# Design — /personalizados: "Hacelo calco"

| | |
|---|---|
| **Spec** | `023-personalizados-hacelo-calco` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 14/09/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Qué hay hoy en la ruta? | `routes/Personalizados.jsx` (22 líneas) monta `Breadcrumbs` + `components/personalizados/Configurador.jsx`: `SocialProof` destacado arriba, `PasoSelector` ×2 (tamaño, corte), `SubidaArchivo` (paso 3, **bloqueado** hasta elegir los dos), textarea de instrucciones, `QueSigue`, `ResumenPedido` (columna sticky) y `BarraResumenMovil`. Ruta `lazy()` en `App.jsx` |
| ¿Cómo entra al carrito? | **Alta automática**: un efecto sincroniza la lista de archivos con el carrito (`addCustom` al subir, `removeItem` al quitar, `patchLine` con la URL de Cloudinary al terminar). Id de línea `custom:{tamano}:{corte}:{fileId}`, `meta = { tipo, tamano, tamanoLabel, corte, corteLabel, cantidad, instrucciones, archivos:[{nombre,pesoMB,url}] }`. Existe desde el 6/8/2026 para arreglar "N archivos → 1 calco" |
| ¿Hay un bug de pérdida de archivos? | **Sí.** El parche de la URL lo hace el componente montado. Si el cliente navega mientras sube, `SubidaArchivo` se desmonta, el `patch` cae en un componente muerto y la línea queda con `url: null` → la nota del pedido dice "(por WhatsApp)" aunque el archivo esté en Cloudinary. Al volver, la lista aparece vacía (el estado vivía en el componente) |
| ¿Quién más usa `SubidaArchivo`? | `NegocioForm.jsx`, `FixedProductPage.jsx` (Polaroid), `PackBuilder.jsx` (mayorista). **No se toca** (regla 8) |
| ¿Toca el camino de precios? | **Solo lectura.** Rama `custom` del server (`lineBase`, `netlify/functions/lib/pricing.js:505`) re-precia con `SIZE_PRICES[parts[1]]`, `discountable: true`. Con el 3x2 vivo (`PROMO_3X2`, sin fin desde el 7/9/2026) el `custom` entra en la bolsa N x M; fuera de promo, ningún % lo toca salvo un cupón `incluyeCustom`. El 10 % por transferencia cuenta **solo** líneas `sticker` (`bulkEligible`) |
| ¿Cómo lo lee Google? | SPA pura, sin prerender. `curl /personalizados` → 200 con `<title>`, description y **`<link rel="canonical" href="https://epicalcos.com/">` del Home**, sin H1. `useSeo` corrige todo recién en el navegador. El `index.html` es el fallback de **todas** las rutas, así que el canonical al Home lo arrastra el sitio entero (fuera de scope, §12) |
| ¿Analytics? | `trackPersonalizadoArchivo(info)` manda `{ nombre, pesoMB }` → **nombre de archivo a GA4 y a Meta**. `nombreLinea()` mete el nombre del archivo en `line.name`, que `toItems()` manda como `item_name` y `trackAddToCart` como `content_name`. `trackPersonalizadoPrecio` lee `material` (no existe) y el configurador le pasa `tamano` (se pierde). `docs/analytics.md` §4 dice que el funnel arranca en `view_item`, que la página nunca dispara |
| ¿Accesibilidad? | La zona de subida es un `<label>` con el `<input type=file className="hidden">` adentro: `display:none` saca el input del orden de tabulación y el label no es enfocable |
| ¿Fotos reales disponibles? | De personalizados, dos: `/testimonials/logo-1.webp` (logo "Pet Friendly" pegado en la puerta de un local, APLICADA) y `/images/negocio-muestra.webp` (plancha de calcos de logo troqueladas, CALCO). **Son logos distintos**: no forman un trío. `/testimonials/personalizados-1.webp` es un termo con calcos **de catálogo** (Homero, Stitch, Vans) — no sirve para esta página. Ningún ORIGINAL, ninguna mascota, foto ni dibujo, ninguna macro, ninguna foto de proceso |
| ¿Comentarios que explican por qué está así? | (1) `QueSigue.jsx`: la card "¿Y si mi archivo no está perfecto?" **se sacó el 15/8/2026 por pedido de Mariano** → P-3. (2) `Configurador.jsx`: una línea por diseño es el arreglo del bug de "N archivos → 1 calco" → **se preserva** (§1, D-1). (3) `SocialProof.jsx`: la foto destacada va arriba en `/personalizados` porque "la prueba no es la frase, es ver el calco puesto" → la idea sube de rango: la página entera se vuelve eso. (4) `config/personalizados.js`: `formatosLegibles()` existe porque el texto de formatos estaba escrito a mano y mentía → el copy nuevo lo sigue usando. (5) `comprimirImagen.js`: nunca pasar PNG a JPEG (el alfa define la silueta) → la conversión de WEBP va a PNG |
| ¿Tests hoy? | 524 en verde (34 archivos). `precioPersonalizados.test.js` corre `validateAndPriceOrder` real contra las líneas del configurador |
| ¿Carritos guardados? | No se rompen: la forma de la línea **no cambia** (§3.2) |

---

## 1. Arquitectura propuesta

```
                        build (Netlify)
  vite build ──► dist/index.html ──► scripts/prerender.mjs ──► dist/personalizados.html
                                        │  (título, canonical, OG, JSON-LD,
                                        │   H1 + contenido estático, modulepreload)
                                        └─ lee: config/personalizadosLanding.js
                                                config/pricing.js · site.js
                        navegador
  /personalizados ─► HTML propio visible ─► React monta ─► routes/Personalizados.jsx
                                                           │
     ┌─────────────────────────────────────────────────────┤
     │ HeroConfigurador                                    │ secciones/* (landing)
     │  ZonaSubida · VistaPrevia · SelectorTamano ·        │  cada una lee
     │  SelectorCantidad · OpcionesExtra · BotonCta        │  personalizadosLanding.js
     │         │ useBorrador()                             │  y data/personalizadosFotos.js
     │         ▼                                           │  (sin fotos → no se monta)
     │  lib/borradorPersonalizado.js  ◄── store de módulo, sobrevive a navegar
     │    · diseños en tanda + config · sessionStorage     │
     │    · cola de subidas (uploadService, 4 en paralelo) │
     │    · construirLineas() ──► cart.addCustom() × N  (una línea por diseño)
     │  lib/precioPersonalizados.js · cotizarTanda()  ◄── promo3x2() de config/pricing.js
     └─ BarraFijaMovil (mismo BotonCta)                    │
                                                           ▼
                         carrito / drawer / checkout — SIN CAMBIOS
```

### Decisiones y alternativas descartadas

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D-1 | **Alta explícita** ("Agregar al carrito") que crea **una línea por diseño** | Mantener el alta automática | El brief pide la secuencia subir → crear → agregar y un "✓ en el carrito". El motivo del alta automática (6/8/2026) era que N diseños no terminaran en 1 línea: eso se preserva porque `construirLineas()` emite una por diseño y tiene test. Además hoy son 4 acciones (tamaño, corte, subir, ir al carrito) y quedan 3 (subir, tamaño, agregar) |
| D-2 | "Agregar" espera a que **terminen las subidas** | Agregar ya y parchear la URL después (hoy) | El parche después es justamente el bug de §0: si el cliente navega, la URL no llega nunca. Esperando, la línea nace completa. Las fotos van comprimidas (~1 MB): la espera es de segundos |
| D-3 | Estado de la tanda en un **store de módulo** (`lib/borradorPersonalizado.js`) + `useSyncExternalStore`, persistido en `sessionStorage` | Estado en el componente (hoy); un Provider global en `App.jsx` | En el componente se pierde al navegar (§0). El módulo vive mientras vive la pestaña: la cola sigue subiendo aunque la página se desmonte (RF-U10). No hace falta tocar `App.jsx` ni `main.jsx`, y la lógica se testea en Node sin React |
| D-4 | Tamaño **sin preselección**; 6 cm con "MÁS ELEGIDO" | Preseleccionar 6 cm (`DEFAULT_SIZE`) | Con 6 cm puesto de entrada, el estado "Crear mi calco" del CTA no existe nunca. Y un personalizado **no se devuelve salvo falla** (D-4 de la política): el tamaño tiene que ser una decisión, no un default que el cliente no vio |
| D-5 | Corte con **default silueta**, plegado en "Más opciones" | Paso obligatorio (hoy) | El brief: primera etapa = imagen, tamaño, cantidad. El corte es especificación, no cambia el precio |
| D-6 | El selector visual de tamaño vive **en el hero** (usos + escala + vista "En un termo") | Sección 5 aparte con otro selector | Dos controles del mismo dato separados por medio scroll: el cliente cambia uno y no ve el otro. El brief pide que el cliente *entienda* el tamaño; se resuelve donde elige |
| D-7 | **Prerender propio en el build**: `scripts/prerender.mjs` escribe `dist/personalizados.html` con head propio + contenido estático dentro de `#root` | SSR con `react-dom/server` + build SSR de Vite; `react-snap` / `vite-plugin-prerender` | Una librería de prerender es una dependencia pesada (Puppeteer) — regla 10. El SSR de toda la app arrastra `window`/`localStorage` en providers y lazy routes: mucho riesgo para una ruta. El HTML estático sale de los **mismos datos** que la página React (`personalizadosLanding.js`), así que no pueden decir cosas distintas. `createRoot().render()` reemplaza el contenido de `#root` al montar |
| D-8 | Archivo `personalizados.html` (no `personalizados/index.html`) | `personalizados/index.html` | Con carpeta, Netlify puede normalizar `/personalizados` → `/personalizados/` con un 301 y contradecir el canonical sin barra. Con `.html`, el sombreado sirve el archivo en `/personalizados` y el fallback SPA no aplica (hay archivo). **Se verifica con `curl` después del deploy** (tasks 9.4); si Netlify redirige, se cambia al otro formato — el fallo en cualquier caso es el comportamiento de hoy |
| D-9 | Si el prerender falla, el script **copia `index.html` tal cual** y avisa; nunca corta el build | Fallar el build | Un problema de SEO no puede frenar el deploy de un arreglo de ventas. Los tests del builder puro son los que frenan (corren antes del build) |
| D-10 | Vista calco dibujada en `<canvas>` sobre una copia reducida (≤ 640 px) | Pedirle a Cloudinary una transformación (`e_outline`, `e_background_removal`) | Cloudinary cobra el add-on y exige red; la vista previa tiene que ser **local e inmediata** (RF-P1). Silueta con PNG transparente: se dibuja la imagen en 24 desplazamientos alrededor de un círculo y se rellena blanco con `source-in` (borde que sigue la forma, costo de GPU, sin librerías). Sin transparencia no se inventa contorno (RF-P3) |
| D-11 | WEBP se **convierte a PNG en el navegador** antes de subir | Agregar `webp` al preset de Cloudinary | El preset solo se edita con `CLOUDINARY_API_SECRET`, que no está ni en el repo ni en Netlify. Y `ARCHIVO.formatos` lo usan también Polaroid/Negocio/mayorista vía `SubidaArchivo`: sumarle `webp` ahí haría que esas páginas acepten un archivo que Cloudinary rechaza. PNG y no JPEG: los WEBP de stickers traen alfa |
| D-12 | `SubidaArchivo` **no se toca**; la página usa su propia zona de subida | Refactorizarlo para que sirva a los dos | Lo usan tres pantallas más; el refactor mezclaría en el diff lo que hay que revisar con lo que hay que confiar (regla 8). Se duplica la cola (~30 líneas) a propósito; unificar queda como hallazgo (§12) |
| D-13 | Sanitizar el nombre en **`lib/analytics.js`** (por prefijo de id `custom:`) | Sacar el nombre de archivo de `line.name` | El nombre en la línea le sirve al cliente en el carrito y a Mariano en la nota del pedido y en Mercado Pago. El problema es solo que viaje a Google/Meta: se corta en el único punto de salida |
| D-14 | Eventos nuevos en GA4 con los nombres del brief; en Meta **se conservan** los nombres custom viejos sin PII | Renombrar todo | Puede haber audiencias de Meta sobre `PersonalizadoInicio`/`PersonalizadoArchivo` (P-12). GA4 no tiene ese costo y los eventos viejos tenían datos rotos |
| D-15 | Botones con el texto en el caso del sitio: "Subir mi diseño", "Crear mi calco", "Agregar al carrito · $X" | Mayúsculas forzadas del brief | `.btn-primary` no fuerza mayúsculas y el brief pide no cambiar el sistema de botones. Los títulos sí van en mayúscula (CSS global) |
| D-16 | Beneficio por cantidad = **3x2 vigente**, calculado con `promo3x2()` y redondeado igual que el server (`round(base × keepFraction)` por unidad) | Tabla de precios por cantidad escrita en el config | "No hardcodear precios" + el servidor rechaza lo que no coincide. Si el 3x2 se apaga, el bloque desaparece solo |

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/routes/Personalizados.jsx` | Compone hero + secciones; `useSeo` con título, descripción, imagen y JSON-LD; `trackPersonalizedView` + `trackViewItem` una vez | 🟢 |
| `frontend/src/lib/analytics.js` | Trackers `personalized_*`; `nombreParaAnalytics()` en `toItems` y en `content_name`; `rangoPeso()`; se retiran `trackPersonalizadoPaso/Archivo/Precio` y `trackPersonalizadoInicio` pasa a ser el `pixelCustom` de `trackPersonalizedView` | 🟡 módulo compartido (ver tabla) |
| `frontend/src/lib/precioPersonalizados.js` | `calcularPrecio()` → `cotizarTanda()` (unitario de lista, unitario con 3x2, total, ahorro, % ahorro, gratis, faltan para la próxima) | 🟡 camino de precios (solo lectura de reglas) |
| `frontend/src/lib/precioPersonalizados.test.js` | Migra los casos de `calcularPrecio`; suma paridad `cotizarTanda` ↔ `validateAndPriceOrder`; suma `construirLineas` ↔ server | 🟢 |
| `frontend/src/config/personalizados.js` | `ARCHIVO.formatosEntrada` (= `formatos` + `webp`) y `ARCHIVO.formatosConvertibles: ['webp']`. `formatos` **no cambia** | 🟢 |
| `frontend/src/data/testimonials.js` | `personalizado: true` en el testimonio de Sofía M. (el único que corresponde, P-2) | 🟢 dato; `Testimonials` y `SocialProof` lo ignoran |
| `frontend/package.json` | `"postbuild": "node ../scripts/prerender.mjs"` | 🟡 corre en cada build de Netlify |
| `scripts/optimize-images.mjs` | Target nuevo `public/images/personalizados/` (WebP, 800 px máx + variante 400 px) | 🟢 |
| `frontend/src/components/WhatsAppButton.jsx` | **Solo el comentario** que nombra `ResumenPedido` (la regla de elevación en `/personalizados` sirve tal cual: la barra nueva mide ≤ 4,25 rem + safe-area y el botón se eleva 6 rem) | 🟢 |
| `docs/analytics.md`, `docs/architecture.md`, `docs/business-rules.md` §7, `docs/database.md` §3, `docs/QA-CHECKLIST.md` | Funnel nuevo, prerender, alta explícita, clave de `sessionStorage`, checklist | 🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/config/personalizadosLanding.js` | **Todo el copy** de la página (claim, hero, qué podés convertir, editorial, beneficios, pasos, FAQ, CTA final, SEO). JS puro: lo importan la página **y** el prerender. Los números salen de `site.js`, `pricing.js`, `personalizados.js`, `brandStats.js`, `usosPorTamano.js` |
| `frontend/src/data/personalizadosFotos.js` | Manifiesto de fotos reales por sección (vacío donde no hay). Una sección con su lista vacía no se monta |
| `frontend/src/lib/borradorPersonalizado.js` | Store de la tanda: diseños, config, cola de subidas, persistencia, `construirLineas()`, `estadoCta()`. Fábrica `crearBorrador({ subir, preparar, medir, storage })` para testear sin red |
| `frontend/src/lib/prepararImagen.js` | WEBP → PNG (canvas) y después `comprimirImagen()`; lectura de transparencia |
| `frontend/src/lib/vistaCalco.js` | Helpers puros (`hayTransparencia`, `margenPx`, `anchoEnTermo`) + `dibujarVistaCalco(ctx, bitmap, corte)` |
| `frontend/src/lib/prerender.js` | Builder **puro** `prerenderRuta(indexHtml, { title, description, canonical, image, jsonLd, cuerpo, modulepreload })` → string. Genérico a propósito (§12) |
| `frontend/src/lib/personalizadosEstatico.js` | Arma `cuerpo` (HTML estático) y `jsonLd` de `/personalizados` desde `personalizadosLanding.js` |
| `scripts/prerender.mjs` | I/O: lee `dist/index.html`, busca `dist/assets/Personalizados-*.js`, escribe `dist/personalizados.html`. Importa el builder con `await import()` **dentro** del `try`, así un error al cargar los módulos también cae en D-9 |

> ⚠️ **Todo lo que importa el prerender corre en Node**, no en Vite:
> `personalizadosLanding.js`, `personalizadosEstatico.js`, `prerender.js`,
> `personalizadosFotos.js` y sus imports **no pueden** leer `import.meta.env`,
> `window` ni importar JSX, `lib/analytics.js` o `services/uploadService.js`.
> Mismo criterio que ya sigue `generate-sitemap.mjs` con `config/site.js`.
| `frontend/src/components/personalizados/useBorrador.js` | Hook `useSyncExternalStore` sobre el store |
| `…/personalizados/HeroConfigurador.jsx` | Layout 2 col / 1 col; claim, H1, subtítulo, config y CTA |
| `…/personalizados/ZonaSubida.jsx` | Dropzone (botón real + input `sr-only`), lista de diseños con miniatura, progreso, Reemplazar / Quitar / Reintentar, `aria-live` |
| `…/personalizados/VistaPrevia.jsx` | ORIGINAL \| VISTA CALCO \| EN UN TERMO; canvas + silueta SVG del termo |
| `…/personalizados/SelectorTamano.jsx` | 3 cards (radio group): precio c/u, "ideal para", MÁS ELEGIDO |
| `…/personalizados/SelectorCantidad.jsx` | − / + / atajos, total, unitario y ahorro con 3x2, "sumá 1 y una te sale gratis", link a Negocio |
| `…/personalizados/OpcionesExtra.jsx` | Corte (reusa `Swatch` de `swatches.jsx`) + instrucciones, plegado |
| `…/personalizados/BotonCta.jsx` | El CTA de tres estados; lo usan el hero y la barra fija |
| `…/personalizados/BarraFijaMovil.jsx` | Barra inferior `lg:hidden`, visible entre el CTA del hero y el CTA final |
| `…/personalizados/secciones/*.jsx` | `BarraConfianza`, `DeImagenACalco`, `QuePodesConvertir`, `Editorial`, `Beneficios`, `ArchivoImperfecto`, `Galeria`, `Proceso`, `Calidad`, `Precios`, `Testimonios`, `Faq`, `CtaFinal` |
| `frontend/public/meta/personalizados.jpg` | Imagen OG (JPG: WhatsApp e Instagram no siempre muestran WebP). Sale de `logo-1.webp` hasta tener la foto de P-1 |
| Tests (§9) | `borradorPersonalizado.test.js`, `vistaCalco.test.js`, `prerender.test.js`, `personalizadosLanding.test.js`, `analyticsPersonalizados.test.js` |

### Archivos que se borran
| Archivo | Por qué |
|---|---|
| `components/personalizados/Configurador.jsx` | Lo reemplazan `HeroConfigurador` + el store |
| `components/personalizados/PasoSelector.jsx` | Solo lo usaba el configurador (verificado con grep) |
| `components/personalizados/ResumenPedido.jsx` | Ídem (el comentario de `WhatsAppButton.jsx` que lo nombra se actualiza) |
| `components/personalizados/QueSigue.jsx` | Su contenido pasa a `secciones/Proceso.jsx` (con su comentario del 15/8) |

`swatches.jsx` y `SubidaArchivo.jsx` **quedan**.

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** (solo se importan `SIZES`, `NEGOCIO`, `PROMO_3X2`, `promo3x2`, `round`) | — |
| `frontend/src/config/site.js` | **No** (solo lectura: `shipping`, `devoluciones`, `contact`, `navLinks`) | — |
| `frontend/src/context/CartContext.jsx` | **No** (se usan `addCustom`, `items`, `openDrawer` como están) | — |
| `netlify/functions/lib/pricing.js` | **No** | — |
| `frontend/src/lib/analytics.js` | **Sí** | `CartContext`, `OfertaPrincipal`, `StickerCard`, `ImprimiblesCard`, `Testimonials`, `FixedProductPage`, `IntentSelector`, `GaleriaUGC`, `GarantiaCheckout`, `FeaturedStickers`, `WhatsAppButton`, `BuscadorCalcos`, `PackBuilder`, `CategoryCard`, `Hero`, `ShippingInfo`, `WelcomePopup`, `contacto/*` (3), `personalizados/Configurador`, rutas `PaymentSuccess`, `LandingUso`, `Cart`, `Checkout`, `Polaroid`, `Producto`, `Category`, `Categorias`, `PaymentTransfer`, `services/cartRecovery` |

Impacto del cambio en `analytics.js`: `toItems()` y el `content_name` de
`trackViewItem`/`trackAddToCart` cambian **solo** para ítems cuyo id empieza con
`custom:`. Ningún otro llamador ve diferencia; lo cubre un test que compara
`toItems` antes/después para un `sticker`, un `pack`, un `fixed` y un `custom`.

```bash
grep -rln "lib/analytics" frontend/src      # 32 archivos, arriba
grep -rln "SubidaArchivo" frontend/src      # NegocioForm, FixedProductPage, PackBuilder — no se tocan
```

---

## 3. Datos

### 3.1 Store de la tanda (`lib/borradorPersonalizado.js`)
```js
{
  disenos: [{
    id: 'f<ts36><n>',            // mismo generador que hoy: viaja al id de la línea
    nombre, ext, pesoMB, ancho, alto,
    huella: `${name}|${size}|${lastModified}`,   // anti-duplicado (RF-U6)
    previewUrl,                  // blob: local (o la URL de Cloudinary al rehidratar)
    transparencia: true|false|null,
    estado: 'preparando'|'en_cola'|'subiendo'|'listo'|'error'|'por_whatsapp',
    progreso: 0..100,
    url: null|'https://res.cloudinary.com/…',
    error: null|{ motivo: 'formato'|'peso'|'red'|'tope'|'duplicado', mensaje },
    aviso: null|'resolución baja…'
  }],
  tamano: null|'4cm'|'6cm'|'9cm',     // D-4: sin preselección
  corte: 'silueta',                     // D-5 / P-8
  copias: 1,                            // CANTIDAD.min..max
  instrucciones: '',
  vista: 'original'|'calco'|'termo',
  activo: id|null,                      // diseño que muestra la vista previa
  agregado: null|{ disenos, unidades, ts }   // confirmación post-alta (se limpia sola)
}
```

`estadoCta(estado, cotizacion)` — puro, lo usan el hero y la barra fija:

| Condición | CTA |
|---|---|
| sin diseños | `subir` — "Subir mi diseño" → abre el selector |
| diseños, sin tamaño | `crear` — "Crear mi calco" → scroll + foco al selector de tamaño |
| tamaño, alguno `preparando/en_cola/subiendo` | `esperando` — "Subiendo tu diseño… 45 %" (deshabilitado) |
| alguno en `error` | `revisar` — "Revisá tus diseños" → scroll a la lista |
| todo `listo`/`por_whatsapp` | `agregar` — "Agregar al carrito · $X" |
| recién agregado | `agregado` — "✓ Tu calco está en el carrito" (4 s) |

### 3.2 Línea del carrito — **NO CAMBIA**
`construirLineas(estado)` emite, **por diseño**, exactamente lo que hoy emite el
efecto del configurador:
```js
{ id: `custom:${tamano}:${corte}:${d.id}`,
  name: `Personalizado · ${tam.label} · ${cor.label} · ${nombreCorto}`,
  categoryLabel: 'Personalizados',
  image: d.url && esRaster ? d.url : customImageDataUri(),
  basePrice: tam.precio, quantity: copias,
  meta: { tipo: 'calcos', tamano, tamanoLabel, corte, corteLabel, cantidad: copias,
          instrucciones: instrucciones.trim() || null,
          archivos: [{ nombre, pesoMB, url }] } }
```
Se agregan con `addCustom(line, { openDrawer: false, silent: true })` y, después
de la última, `openDrawer()` una vez. `resumenPedido.js`, el checkout, el mail,
el CRM y `/pago-exitoso` siguen igual.

### 3.3 Cotización (`cotizarTanda`)
```js
cotizarTanda({ tamano, unidades, promoActiva })
// unidades = disenos × copias (con 0 diseños se cotiza 1 diseño)
// → { unitarioLista, unitario, total, totalLista, ahorro, ahorroPct,
//     gratis, faltanParaGratis, beneficio: '3x2'|null }
// Con promo: keep = promo3x2({ unitBasePrices: Array(unidades).fill(base) }).keepFraction
//            unitario = round(base * keep); total = unitario * unidades   ← mismo redondeo que el server
```
Es una estimación **de la tanda sola**; el carrito calcula el 3x2 sobre todas
las calcos. El copy lo dice ("el 3x2 se aplica en el carrito sobre todas tus
calcos"). `promoActiva` viene de `usePromoActive()` (se entera del cambio de
ventana sin recargar, igual que el carrito).

**Recomendación Negocio (P-9)**: se muestra cuando `NEGOCIO.size === tamano` y
`cotizarTanda({ tamano, unidades: copias }).total >= NEGOCIO.price` para un
diseño — o sea, cuando Negocio da `NEGOCIO.qty` calcos por menos plata. Con los
precios de hoy, desde 38 copias en 6 cm. El número sale de las reglas.

### 3.4 Fotos reales (`data/personalizadosFotos.js`) y lista de tomas (P-1)
```js
export const FOTOS = {
  deImagenACalco: [ /* { original, calco, aplicada: {src,w,h,alt}, etiqueta:'FOTO → CALCO' } */ ],
  queConvertir: { mascota: null, foto: null, dibujo: null, logo: { src:'/testimonials/logo-1.webp', w:800, h:743, alt:'…' } },
  galeria: [ /* {src,w,h,alt,etiqueta?} */ ],
  calidad: null,
  proceso: { subi: null, revisamos: null, producimos: null, recibis: null }
};
```
Hoy se puede cargar: `queConvertir.logo` (Pet Friendly) y en la galería
`logo-1.webp` + `negocio-muestra.webp`. **Con eso, "Qué podés convertir" no se
monta** (necesita las cuatro, RF-L5) y la galería arranca con dos fotos.

Lista de tomas para Mariano (todas en celular, luz natural, fondo neutro):

| Sección | Toma | Cantidad |
|---|---|---|
| De imagen a calco | el archivo que mandó el cliente + la calco suelta en la plancha + la calco pegada (termo/mate/notebook/botella/packaging) — **el mismo diseño en las tres** | 3 tríos (mascota, logo, foto o dibujo) |
| Qué podés convertir | una calco de: mascota, foto de persona/recuerdo, dibujo, logo | 4 |
| Galería | calcos personalizadas pegadas, variadas | 8–12 |
| Calidad | macro del borde troquelado y la superficie del vinilo | 1 |
| Proceso | impresión, corte, empaque | 3 (opcional) |
| Testimonios | captura del mensaje + foto de la calco (P-2) | 2–4 |

Formato de entrega: JPG/PNG a cualquier tamaño; `optimize-images.mjs` los pasa a
WebP 800/400 px.

### Persistencia
| Dónde | Qué | Ref. |
|---|---|---|
| `sessionStorage` `epicalcos.personalizados.borrador.v1` | config + diseños en estado `listo` (con `url`) | `docs/database.md` §3 — **nuevo** |
| `localStorage` `epicalcos.cart.v2` | sin cambios | — |

`sessionStorage` y no `localStorage`: el borrador es de esta visita (una
pestaña nueva arranca limpia), y un archivo subido hace una semana que el
cliente ya no recuerda no debería aparecer solo.

### ⚠️ Compatibilidad con datos existentes
- [x] La forma de las líneas **no cambia** → los carritos en `epicalcos.cart.v2`
      siguen andando. `esCustomViejo()` sigue haciendo lo suyo.
- [x] Los pedidos en Blobs no cambian.

---

## 4. APIs

Ningún endpoint cambia ni se agrega. `create-preference` y
`create-order-transfer` reciben las mismas líneas.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Cloudinary | Mismo preset unsigned `epicalcos_personalizados`. WEBP llega ya convertido a PNG | No: sin config o con error, el diseño va "por WhatsApp" (RF-U7/U8) |
| Mercado Pago | Nada | — |
| Notion / Resend / CRM | Nada: misma nota en `comments` | — |
| GA4 | Eventos `personalized_*`; `item_name` sin nombre de archivo | No (try/catch existente) |
| Meta Pixel | `ViewContent` nuevo (SKU `006574`); custom events con nombres viejos y sin PII (D-14) | No |
| Meta CAPI | Nada (ya manda solo ids) | — |
| Clarity | La lista de diseños y la vista previa llevan `data-clarity-mask="true"` (el nombre y la imagen del cliente no quedan en las grabaciones) | No |

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend (la subida sigue siendo unsigned)
- [x] El servidor no confía en el cliente: precio re-derivado del id (sin cambios)
- [x] Instrucciones: `maxLength=500` como hoy
- [x] Sin PII en logs, URLs ni `dataLayer`: ni nombre, ni URL de archivo, ni
      instrucciones en ningún evento (test)
- [x] SVG del cliente se muestra en `<img>` (el navegador no ejecuta scripts de
      un SVG cargado como imagen), nunca inline
- [ ] CSP: la vista previa usa `blob:` en `img-src`, que la CSP (hoy
      Report-Only) no lista. **Ya pasa hoy** con las miniaturas de
      `SubidaArchivo`. No se toca la CSP en esta spec (está en la lista de "no
      sin pedirlo"); queda anotado para cuando se enforce (§12)

| Riesgo | Mitigación |
|---|---|
| El HTML estático queda con un precio viejo si cambia una regla sin redeploy | Las reglas de precio solo cambian con deploy (están en el código) → el prerender corre en ese mismo build |
| Contenido estático distinto del renderizado (cloaking) | Los dos salen de `personalizadosLanding.js`; test que compara preguntas de la FAQ y H1 |
| JSON-LD con datos falsos | Sin `AggregateRating`/`Review` (test); precios de `SIZES` |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Formato no aceptado | no entra a la tanda; `personalized_upload_error{reason:'formato'}` | "No pudimos subir esta imagen. Probá con JPG, PNG, WEBP, PDF, SVG o AI de hasta 10 MB." (de `formatosLegibles(ARCHIVO.formatosEntrada)` y `pesoMaximoMB`) |
| Pesa > 10 MB comprimido | ídem `peso` | "Esta imagen es demasiado pesada, incluso optimizada. Elegí otra o mandala por WhatsApp después de pagar." |
| Red / Cloudinary 4xx-5xx | `estado:'error'`, `reason:'red'` | "Se cortó la subida." + **Reintentar** + "Agregar igual y mandarlo por WhatsApp" |
| Cloudinary no configurado | `estado:'por_whatsapp'` directo | "Lo recibimos por WhatsApp después de pagar" (hoy) |
| `sessionStorage` bloqueado | el store funciona en memoria | nada (sin persistencia) |
| Canvas no disponible / falla el dibujo | vista calco deshabilitada | solo ORIGINAL |
| `price_mismatch` | imposible por construcción (líneas iguales a hoy; test) | — |
| Falla el prerender | copia `index.html` y avisa en el log | la página como hoy |
| Tracking falla | try/catch existente | nada |

---

## 8. Estrategia de migración

- **Datos existentes**: no hay.
- **Carritos guardados**: compatibles (§3.2).
- **Pedidos ya en Blobs**: no aplica.
- **Eventos**: `personalizado_*` dejan de llegar a GA4 desde el deploy; se anota
  la fecha en `docs/analytics.md` con la tabla viejo → nuevo.
- **Rollback**: revertir el commit de la feature. El prerender es un
  `postbuild`: al revertir desaparece con el resto.
- **Feature flag**: no. La ruta se puede apagar con `HIDDEN_SECTIONS` como
  cualquier sección (el sitemap y el prerender la respetan: si está oculta, el
  script no escribe el archivo).

---

## 9. Testing

### Tests nuevos
| Archivo | Qué verifica |
|---|---|
| `lib/borradorPersonalizado.test.js` | alta de archivos (válidos, formato, peso, tope, duplicado); cola de 4 en paralelo; reemplazar conserva la posición; quitar cancela la subida en cola; `estadoCta` para cada fila de §3.1; "agregar" no se habilita con subidas pendientes; `construirLineas` emite **una línea por diseño** con la forma exacta de §3.2; persistencia y rehidratación (solo `listo`); `sessionStorage` que tira excepción |
| `lib/precioPersonalizados.test.js` (ampliado) | `cotizarTanda` para 4/6/9 cm × {1,2,3,5,10,25,50,100} con y sin 3x2; **paridad**: `validateAndPriceOrder` del server acepta las líneas de `construirLineas` y su `itemsTotal` = `cotizarTanda().total`; umbral de Negocio sale de `NEGOCIO` |
| `lib/vistaCalco.test.js` | `hayTransparencia` sobre `Uint8ClampedArray` sintéticos; `margenPx`; `anchoEnTermo` proporcional (9 cm = ancho del termo) |
| `lib/prerender.test.js` | título, description, canonical y OG reemplazados; **un** `<h1>`; JSON-LD parseable con `Product` + `AggregateOffer` (`lowPrice`/`highPrice` = min/max de `SIZES`), `BreadcrumbList`, `FAQPage`; **sin** `AggregateRating`; `modulepreload` al chunk; idempotente; con `HIDDEN_SECTIONS` no genera |
| `config/personalizadosLanding.test.js` | la FAQ nombra exactamente `formatosEntrada`; ningún precio escrito a mano (todo `$` del copy sale de `SIZES`/`NEGOCIO`); plazos = `shipping`; claim ≤ 3 usos; las preguntas pendientes (P-4/P-5/P-6) no están publicadas mientras su flag esté en `false` |
| `lib/analyticsPersonalizados.test.js` | `toItems` idéntico para `sticker`/`pack`/`fixed`; `custom:` sin nombre de archivo; ningún `personalized_*` lleva `nombre`, `url` ni `instrucciones`; `rangoPeso` |

### ⚠️ Tests de paridad
- [ ] `promoPricing.test.js` — no cambia (no se tocan reglas), tiene que seguir verde
- [ ] `envio.test.js` — no cambia
- [x] `precioPersonalizados.test.js` — ampliado (arriba)

### Verificación manual
- [ ] Recorrido completo a 375 px en el Browser pane: subir PNG transparente,
      JPG, PDF, WEBP; vista calco en los tres cortes; termo; cantidad; agregar;
      drawer; checkout hasta el botón de pagar (sin pagar)
- [ ] Navegar al carrito a mitad de una subida y volver
- [ ] Teclado solo: subir, elegir tamaño, cantidad, agregar
- [ ] `curl` al build local (`vite preview`) y a producción después del deploy
- [ ] **Mariano en su iPhone** (Safari + navegador de Instagram) y en un Android:
      checklist de `docs/QA-CHECKLIST.md` § personalizados

---

## 10. Dependencias nuevas

**Ninguna.** Prerender, canvas, carrusel y cola son código propio.

---

## 11. Preguntas abiertas del diseño

Las de negocio están en `requirements.md` §12. Las técnicas:

- [ ] `UNKNOWN / REQUIRES CONFIRMATION` — **cómo resuelve Netlify
      `/personalizados` con `personalizados.html`** (D-8). No se puede probar
      local (`netlify dev` no corre en este repo). Se confirma con `curl` después
      del deploy; si da 301 o sirve el `index.html`, se cambia a
      `personalizados/index.html` en un commit de un archivo.
- [ ] Parpadeo contenido estático → "Cargando…" → página. El `modulepreload`
      del chunk lo acorta; se mide en la verificación. Si molesta, se evalúa que
      la ruta no pase por el `Suspense` genérico (fuera de esta spec).

---

## 12. Hallazgos fuera de scope

| Hallazgo | Dónde | Propuesta |
|---|---|---|
| **Todo el sitio arranca con el canonical del Home** en el HTML inicial (el `index.html` es el fallback de todas las rutas) | `frontend/index.html` | Spec aparte: usar `lib/prerender.js` (queda genérico) para las rutas estáticas y las 61 categorías; como mínimo, sacar el canonical fijo del fallback |
| Cualquier URL inexistente devuelve 200 con el Home (soft 404) | `netlify.toml` fallback + `<Route path="*" element={<Home/>}>` | Misma spec de SEO |
| `/personalizados/` (con barra) también da 200 | Netlify | Misma spec (el canonical lo cubre) |
| `SubidaArchivo` no se puede usar con teclado (Polaroid, Negocio, mayorista) | `SubidaArchivo.jsx` | Fix chico: input `sr-only` + foco en el label. Y unificar su cola con `borradorPersonalizado` |
| `SocialProof` variante `destacado` queda sin uso | `SocialProof.jsx` | Borrar en una limpieza |
| El 10 % por transferencia no cuenta personalizados y la FAQ general no lo aclara | `FAQ.jsx` | Aclarar el texto |
| La foto `personalizados-1.webp` trae el botón "Play" de la captura de un video | `public/testimonials/` | Recortar o reemplazar |
| La miniatura de un personalizado en el carrito es la imagen completa de Cloudinary (hasta 2400 px) | `construirLineas` (hereda de hoy) | Transformación `w_200,c_limit,f_auto,q_auto` en la URL de la miniatura |
| CSP sin `blob:` en `img-src` | `netlify.toml` | Sumarlo cuando se enforce la CSP |
