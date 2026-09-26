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
| ¿Fotos reales disponibles? | De personalizados, dos: `/testimonials/logo-1.webp` (logo "Pet Friendly" pegado en la puerta de un local, APLICADA) y `/images/negocio-muestra.webp` (plancha de calcos de logo troqueladas, CALCO). **Son logos distintos**: no forman un trío. `/testimonials/personalizados-1.webp` es un termo con calcos **de catálogo** (Homero, Stitch, Vans) — no sirve para esta página. Ningún ORIGINAL, ninguna mascota, foto ni dibujo, ninguna macro, ninguna foto de proceso. **P-1 (Mariano, 14/9/2026): no hay más, y para esta página vale solo la que ya está en ella** (`logo-1.webp`, vía el testimonio) — y no se dice |
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
| D-17 | Con el manifiesto vacío, el **testimonio con foto va tercero** (lugar de "De imagen a calco") y baja a su lugar cuando haya tríos | Respetar el orden del brief (testimonios en el lugar 12) | Es la única foto real de la página y hoy está arriba de todo a propósito (comentario de `SocialProof.jsx`: *la prueba no es la frase, es ver el calco puesto*). Mandarla al fondo dejaría la página sin ninguna imagen hasta el final |
| D-18 | La vista calco de una imagen opaca en silueta **no dice nada** del contorno ni del fondo | "El contorno lo prepara nuestro equipo" / "¿Necesita fondo transparente?" | P-4 sin respuesta (no se promete recorte) y P-3: no se plantea un problema en el momento de subir |

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/routes/Personalizados.jsx` | Compone hero + secciones; `useSeo` con título, descripción, imagen y JSON-LD; `trackPersonalizedView` + `trackViewItem` una vez | 🟢 |
| `frontend/src/lib/analytics.js` | Trackers `personalized_*`; `nombreParaAnalytics()` en `toItems` y en `content_name`; `rangoPeso()`; se retiran `trackPersonalizadoPaso/Archivo/Precio` y `trackPersonalizadoInicio` pasa a ser el `pixelCustom` de `trackPersonalizedView` | 🟡 módulo compartido (ver tabla) |
| `frontend/src/lib/precioPersonalizados.js` | `calcularPrecio()` → `cotizarTanda()` (unitario de lista, unitario con 3x2, total, ahorro, % ahorro, gratis, faltan para la próxima) | 🟡 camino de precios (solo lectura de reglas) |
| `frontend/src/lib/precioPersonalizados.test.js` | Migra los casos de `calcularPrecio`; suma paridad `cotizarTanda` ↔ `validateAndPriceOrder`; suma `construirLineas` ↔ server | 🟢 |
| `frontend/src/config/personalizados.js` | `ARCHIVO.formatosEntrada` (= `formatos` + `webp`) y `ARCHIVO.formatosConvertibles: ['webp']`. `formatos` **no cambia**. *(Enmienda 22/9/2026)* suma `MATERIALES`, `MATERIAL_POR_DEFECTO`, `getMaterial()`, `RECARGO_HOLOGRAFICO` | 🟢 |
| `frontend/src/components/personalizados/swatches.jsx` *(enmienda 22/9/2026)* | Suma `Swatch({ kind: 'material', id })`: un ícono por material, mismo `LIENZO`/paleta que tamaño y corte | 🟢 |
| `frontend/src/lib/borradorPersonalizado.js` *(enmienda 22/9/2026)* | Suma `material` al estado (`inicial()`, `serializar()`/`hidratar()`), `setMaterial()`, y el id/meta de `construirLineas()` — ver §3.2 | 🟡 forma de la línea del carrito |
| `frontend/src/components/personalizados/HeroConfigurador.jsx` *(enmienda)* | Monta `SelectorMaterial` entre `SelectorTamano` y `SelectorCantidad`; pasa `material` a `cotizarTanda` | 🟢 |
| `frontend/src/components/personalizados/BarraFijaMovil.jsx` *(enmienda)* | Tiene su PROPIO `cotizarTanda()` (no comparte el del hero) — hay que pasarle `material`/`disenos` también, o la barra fija muestra un total distinto al del CTA del hero. Encontrado recorriendo la UI en el Browser pane, no por los tests (no hay test de componente para esta barra) | 🟡 detectado en QA manual |
| `frontend/src/components/personalizados/BotonCta.jsx` *(enmienda)* | `useAgregarAlCarrito()` agrega, además de la línea `custom`, la línea de recargo (`addFixed`) cuando el material es holográfico | 🟡 toca `CartContext` |
| `frontend/src/context/CartContext.jsx` *(enmienda)* | `esCustomViejo()` deja de contar segmentos y pasa a validar el tamaño (§3.2); `removeItem()` quita también el recargo acoplado | 🟡 módulo compartido (ver tabla) |
| `frontend/src/routes/Cart.jsx`, `frontend/src/components/CartDrawer.jsx` *(enmienda)* | La línea de recargo no es editable (sin selector de cantidad ni botón de quitar propio): se agrega/quita siempre junto con su diseño | 🟢 |
| `netlify/functions/lib/pricing.js` *(enmienda)* | Rama `custom` lee el material opcional del id; nueva entrada en `FIXED_PRICES['material-holografico']`; validación cruzada holográfico ↔ recargo | 🟡 módulo compartido (ver tabla) — **la regla más importante del repo** |
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
| `…/personalizados/SelectorMaterial.jsx` *(enmienda 22/9/2026)* | 3 cards (radio group), mismo patrón que `SelectorTamano`: ícono (`Swatch kind="material"`), nombre, "+$15.000" en Vinilo Holográfico y nada en las otras dos |
| `…/personalizados/SelectorCantidad.jsx` | − / + / atajos, total, unitario y ahorro con 3x2, "sumá 1 y una te sale gratis", link a Negocio |
| `…/personalizados/OpcionesExtra.jsx` | Corte (reusa `Swatch` de `swatches.jsx`) + instrucciones, plegado |
| `…/personalizados/BotonCta.jsx` | El CTA de tres estados; lo usan el hero y la barra fija |
| `…/personalizados/BarraFijaMovil.jsx` | Barra inferior `lg:hidden`, visible entre el CTA del hero y el CTA final |
| `…/personalizados/secciones/*.jsx` | `BarraConfianza`, `DeImagenACalco`, `QuePodesConvertir`, `Editorial`, `Beneficios`, `Galeria`, `Proceso`, `Calidad`, `Precios`, `Testimonios`, `Faq`, `CtaFinal` |
| `frontend/public/meta/personalizados.jpg` | Imagen OG (JPG: WhatsApp e Instagram no siempre muestran WebP). Sale de `logo-1.webp` hasta tener la foto de P-1 |
| Tests (§9) | `borradorPersonalizado.test.js`, `vistaCalco.test.js`, `prerender.test.js`, `personalizadosLanding.test.js`, `analyticsPersonalizados.test.js` |

### Archivos que se borran
| Archivo | Por qué |
|---|---|
| `components/personalizados/Configurador.jsx` | Lo reemplazan `HeroConfigurador` + el store |
| `components/personalizados/PasoSelector.jsx` | Solo lo usaba el configurador (verificado con grep) |
| `components/personalizados/ResumenPedido.jsx` | Ídem (el comentario de `WhatsAppButton.jsx` que lo nombra se actualiza) |
| `components/personalizados/QueSigue.jsx` | Su contenido pasa a `secciones/Proceso.jsx`, **con su comentario del 15/8** más la ratificación del 14/9/2026 (P-3): es lo que evita que alguien vuelva a proponer la card |

`swatches.jsx` y `SubidaArchivo.jsx` **quedan**.

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** (solo se importan `SIZES`, `NEGOCIO`, `PROMO_3X2`, `promo3x2`, `round`) | — |
| `frontend/src/config/site.js` | **No** (solo lectura: `shipping`, `devoluciones`, `contact`, `navLinks`) | — |
| `frontend/src/context/CartContext.jsx` *(enmienda 22/9/2026, ampliada 22/9/2026 con el tope a Negocio)* | **Sí, acotado**: `esCustomViejo()` (§3.2), `removeItem()` (acopla la línea de recargo — ahora también para `negocio:`, §3.6) y `addNegocio()` **se empieza a llamar** desde `personalizados/BotonCta.jsx` además de `NegocioForm.jsx` (la función en sí no cambia). Se usan `addCustom`, `addFixed`, `addNegocio`, `items`, `removeItem`, `openDrawer` como están — nada de esto cambia su firma | `Cart.jsx`, `CartDrawer.jsx`, `Checkout.jsx`, `services/cartRecovery`, `NegocioForm.jsx` (dueño original de `addNegocio`/`negocio:{ts}` — su comportamiento no cambia, ver la prueba manual de §9), y todo lo de la fila de `analytics.js` de abajo |
| `netlify/functions/lib/pricing.js` *(enmienda 22/9/2026, ampliada 22/9/2026 con el tope a Negocio)* | **Sí, acotado**: rama `custom` de `lineBase()`, rama `negocio` de `lineBase()` (parsea un material opcional, §3.6 — `negocio:{ts}` de siempre sigue validando igual), una entrada nueva en `FIXED_PRICES` y una pasada de validación cruzada al final de `validateAndPriceOrder()` (§3.5/§3.6/§6, ahora también puebla `requierenRecargo` desde líneas `negocio:`). Nada de lo existente (sticker, pack, digital, Polaroid, promos, ni el `negocio:{ts}` de 2 segmentos) cambia de comportamiento | `create-preference.js`, `create-order-transfer.js`, y los tests de `promoPricing.test.js` / `precioPersonalizados.test.js` |
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
  material: 'vinilo-blanco',            // enmienda 22/9/2026 (RF-MAT4): SÍ arranca con default
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

### 3.2 Línea del carrito (enmienda 22/9/2026: gana el material)

Hasta el 22/9/2026 esta sección decía "NO CAMBIA". El pedido de material la
revierte: `construirLineas(estado)` emite, **por diseño**:
```js
{ id: `custom:${tamano}:${corte}:${material}:${d.id}`,
  name: `Personalizado · ${tam.label} · ${cor.label} · ${nombreCorto}`,
  categoryLabel: 'Personalizados',
  image: d.url && esRaster ? d.url : customImageDataUri(),
  basePrice: tam.precio, quantity: copias,
  meta: { tipo: 'calcos', tamano, tamanoLabel, corte, corteLabel, material, materialLabel,
          cantidad: copias, instrucciones: instrucciones.trim() || null,
          archivos: [{ nombre, pesoMB, url }] } }
```
Se agregan con `addCustom(line, { openDrawer: false, silent: true })`, igual
que hoy. Si `material === 'vinilo-holografico'`, **además** se agrega una línea
de recargo con `addFixed()` — ver §3.5. Después de la última línea (custom +
recargos), `openDrawer()` una vez. `resumenPedido.js`, el checkout, el mail, el
CRM y `/pago-exitoso` siguen igual: ninguno de esos lee `meta.material`, así
que no hace falta tocarlos para que el pedido llegue completo (`meta` ya viaja
entero a todos ellos).

**Por qué se agrega el material y no un campo aparte**: el servidor re-precia
cada línea **solo por su id** (nunca confía en `meta` — payload real, ver
§comentario de `lineBase`), y la única forma de que rechace un pedido que se
quedó sin el recargo del holográfico (RF-MAT7) es que el id de la línea
`custom` le diga qué material tiene. Ponerlo en `meta` habría sido más simple,
pero un `meta` manipulado con devtools no lo revisa nadie: el `price_mismatch`
solo lo dispara lo que compara contra el id.

**Por qué NO va primero, como en el modelo viejo** (`custom:{material}:{tamano}:{corte}:{ts}`,
commits `1a32e6c`…`ce6a9fa`): `esCustomViejo()` (`CartContext.jsx`) purga
cualquier línea `custom:` de 5 segmentos por asumir que es de ese modelo. Si el
material fuera el primer segmento otra vez, sería indistinguible de una línea
realmente vieja y el purgado la comería. Poniéndolo **antes del id del diseño y
después de tamaño/corte** (que no se tocan), la migración es: "¿`parts[1]` es
un tamaño válido?" — ver §8.

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

**Recomendación Negocio (P-9, confirmada)**: se muestra cuando
`cotizarTanda({ tamano, unidades: copias }).total >= NEGOCIO.price` para **un**
diseño, en cualquier tamaño — el texto dice el tamaño de Negocio
(`NEGOCIO.size`), así que el de 9 cm sabe que la promo es en 6. Con los precios
y el 3x2 de hoy (calculado con las funciones reales): **38 copias en 6 cm, 31 en
9 cm, 50 en 4 cm**. Mariano, 14/9/2026: *la Promo Negocio se puede tomar aunque
el cliente quiera menos de 100* — no baja el ticket, porque se paga el monto de
la promo. El umbral no se escribe en ningún lado: sale de `NEGOCIO` y del 3x2.

### 3.4 Fotos reales (`data/personalizadosFotos.js`) y lista de tomas (P-1)
```js
export const FOTOS = {
  deImagenACalco: [ /* { original, calco, aplicada: {src,w,h,alt}, etiqueta:'FOTO → CALCO' } */ ],
  queConvertir: { mascota: null, foto: null, dibujo: null, logo: null },
  galeria: [ /* {src,w,h,alt,etiqueta?} */ ],
  calidad: null,
  proceso: { subi: null, revisamos: null, producimos: null, recibis: null }
};
```
**Hoy (P-1) todo el manifiesto va vacío**: ninguna de las cuatro secciones con
foto se monta, y ningún texto lo dice. La única foto real llega a la página por
el testimonio de Sofía M. (`data/testimonials.js`, `personalizado: true`), que
mientras `deImagenACalco` esté vacío ocupa ese lugar — tercera sección (D-17).
`negocio-muestra.webp` es real pero no se usa acá: la respuesta fue "solo la que
está en la página".

La galería se monta desde **4** fotos; "Qué podés convertir", con las cuatro.

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

### 3.5 Material y el recargo del holográfico (enmienda 22/9/2026)

**Por qué una línea aparte y no un precio distinto por unidad**: el recargo es
"fijo por diseño" (Mariano, 22/9/2026) — $15.000 una sola vez, no importa si el
diseño pide 1 copia o 500. El modelo de precio de todo el sistema es
`unit_price × quantity`; forzar un monto que NO escala con `quantity` dentro de
esa misma línea obliga a repartir $15.000 entre las copias (`round(15000/7) × 7
≠ 15000`), lo que puede desviar $1-2 del total esperado y el checkout se
rechazaría con `price_mismatch` — exactamente lo que esta regla existe para
evitar. Una línea propia, cantidad fija en 1, no tiene ese problema.

**La línea de recargo** (una por diseño en Vinilo Holográfico, agregada con el
`addFixed()` que ya existe para tatuajes/Polaroid — no es un mecanismo nuevo):
```js
addFixed({
  id: `material-holografico:${d.id}`,   // → línea `fixed:material-holografico:{d.id}`
  name: 'Recargo · Vinilo Holográfico',
  categoryLabel: 'Personalizados',
  price: RECARGO_HOLOGRAFICO.precio,    // 15000
}, 1)
```
`addFixed` arma el id como `fixed:{product.id}` (sin `meta`, no lleva
timestamp): queda `fixed:material-holografico:{d.id}`, con el id del DISEÑO
como último segmento — el mismo `d.id` que ya es el último segmento de su línea
`custom:` hermana. Esa coincidencia es lo que permite acoplarlas sin inventar
una relación nueva entre líneas.

**Por qué no reutiliza el path del 3x2/cupón**: `PROMO_ELIGIBLE_TYPES` (front)
y `discountable` (server) ya excluyen todo lo que no sea `sticker`/`custom`.
Una línea `fixed` cae afuera de las dos automáticamente (RF-MAT6) — cero código
nuevo para "que no se descuente".

**Acoplamiento en el carrito** (`CartContext.jsx`):
- `removeItem(id)`: si `id` empieza con `custom:`, además borra la línea
  `fixed:material-holografico:{mismo último segmento}` si existe. Sin esto,
  quitar el diseño dejaría el recargo huérfano cobrándose solo.
- `Cart.jsx` (`EDITABLE`): la línea de recargo no entra en el set de líneas con
  selector de cantidad — no tiene sentido "2 recargos" para 1 diseño, y
  editarla independiente del diseño rompería el acople.
- El envío gratis y el resto de los totales del carrito (`subtotal`,
  `physicalSubtotal`) ya suman cualquier línea `fixed` como plata real del
  pedido (mismo criterio que Polaroid/tatuajes) — no hace falta tocar nada ahí.

**Validación cruzada en el servidor** (`validateAndPriceOrder`, DESPUÉS de
pricear cada línea individualmente, RF-MAT7):
1. Por cada línea `custom:` aceptada cuyo material (parsed de §3.2) sea
   `vinilo-holografico`, guardar su `disenoId` (último segmento del id) en un
   set `requierenRecargo`.
2. Por cada línea `fixed:material-holografico:{disenoId}`, exigir
   `quantity === 1` y `unit_price === RECARGO_HOLOGRAFICO` (ya lo hace
   `lineBase` como cualquier `fixed`); guardar su `disenoId` en
   `recargosPresentes`.
3. Si `requierenRecargo` tiene un id que no está en `recargosPresentes` →
   `{ ok: false, error: 'recargo_material_faltante' }`. Es la única forma real
   de manipular el pedido para ahorrarse el recargo (borrar esa línea del
   payload antes de pagar), y es exactamente lo que este paso corta.
4. Un `recargosPresentes` sin `custom:` holográfico correspondiente (huérfano)
   también se rechaza (`item_invalid`) — no es explotable a la baja, pero un
   payload así no debería pasar nunca por el flujo normal.

### Constantes espejadas (nuevas)
| Frontend (`config/personalizados.js`) | Servidor (`netlify/functions/lib/pricing.js`) |
|---|---|
| `MATERIALES` = `[{id:'vinilo-blanco',...},{id:'dtf-uv',...},{id:'vinilo-holografico',...}]` | allowlist de materiales válidos en la rama `custom` de `lineBase` |
| `RECARGO_HOLOGRAFICO = { id: 'material-holografico', precio: 15000 }` | `FIXED_PRICES['material-holografico'] = 15000` |

### 3.6 Tope a la Promo Negocio (enmienda 22/9/2026, "topear el precio en $39.999")

**Por qué NO es un ajuste al precio por unidad**: el modelo entero de
`custom:` es `unit_price × quantity`. Negocio da hasta 100 calcos por un
precio FIJO que no escala con la cantidad — igual que el recargo del
holográfico (§3.5), forzar eso dentro del `unit_price` de una línea `custom:`
obliga a repartir $39.999 entre las copias, y `round($39.999 / 38) × 38 ≠
$39.999`: exactamente el desvío de unos pesos que dispara `price_mismatch`.

**La solución reutiliza el producto Negocio que ya existe y está probado**
(`negocio:{ts}`, `addNegocio()`, `NegocioForm.jsx`) en vez de inventar una
fórmula de precio nueva: cuando conviene, `useAgregarAlCarrito()`
(`BotonCta.jsx`) agrega ESA línea —con el diseño ya subido en
`meta.archivos`, igual que si el cliente hubiera pasado por `/negocio`— en
vez de la línea `custom:` de siempre. RF-MAT8/9: solo con **un** diseño y
**tamaño 6 cm** (`NEGOCIO.size`) — Negocio entrega específicamente 6 cm, así
que con otro tamaño el cliente recibiría algo distinto de lo que configuró;
ahí sigue siendo, como hasta ahora, una recomendación con link.

**`precioEfectivoTanda()`** (`lib/precioPersonalizados.js`) es la ÚNICA
función que decide "¿topea o no?" — la usan `HeroConfigurador.jsx`,
`BarraFijaMovil.jsx` (el total que se MUESTRA) y `useAgregarAlCarrito()` (lo
que se COBRA), así que no puede pasar de nuevo lo que ya pasó una vez con el
material: dos componentes calculando el mismo precio por separado y
mostrando números distintos (ver la Bitácora de `tasks.md`, 22/9/2026 — pasó
una vez con el material y `BarraFijaMovil.jsx`). Es `cotizarTanda()` sin cambios, salvo que devuelve
`{ ...total: NEGOCIO.price (+ recargo), unidades: NEGOCIO.qty, esNegocio: true }`
cuando corresponde.

**El cartel "¿Son para tu negocio?"** (`NEGOCIO_COPY`, el link a `/negocio`)
se sigue mostrando SOLO cuando `precioEfectivoTanda()` NO topeó (más de un
diseño, u otro tamaño): si ya topeó, mostrarlo además sería redundante —el
total de arriba ya lo tiene adentro.

**Vinilo Holográfico + Negocio** (RF-MAT10, Mariano 22/9/2026): el recargo se
SUMA arriba de Negocio, nunca lo reemplaza. Igual que con `custom:`, viaja en
su propia línea `fixed:material-holografico:{id}`, pero acá `{id}` es el
mismo timestamp que la línea `negocio:` (no hay un "id de diseño" en
`negocio:`) — y el id de la línea Negocio gana el material como segundo
segmento para que el servidor sepa que tiene que exigir el recargo:
`negocio:{ts}` (de siempre, sin material) → `negocio:{material}:{ts}`
(enmienda, SOLO cuando el material es holográfico). El servidor (`lineBase`,
rama `negocio`) parsea ese segmento opcional igual que hace con `custom:`, y
la validación cruzada de §3.5 se extiende para poblar `requierenRecargo`
también desde líneas `negocio:` con material holográfico — el mismo mecanismo,
una sola vez, sin duplicar la lógica de rechazo.

**PII**: la línea `negocio:` auto-agregada NO lleva el nombre del archivo en
`name` (a diferencia de una `custom:`, que sí, a propósito, para que el
cliente distinga sus líneas). Acá hay una sola línea de Negocio, no hace
falta distinguirla de nada, y `nombreParaAnalytics()` no sabe limpiar un
`negocio:` — meterle el nombre del archivo habría sido el mismo error que
esta spec ya corrigió una vez (1.6, nombre de archivo a GA4/Meta). El archivo
real sigue viajando en `meta.archivos`, que es lo que lee el mail/CRM.

**Acoplamiento en el carrito** (`CartContext.jsx`, `removeItem`): la misma
regla de §3.5 (sacar el diseño saca su recargo) se extiende a
`id.startsWith('negocio:')`, derivando el id ligado del ÚLTIMO segmento —
funciona sin cambios para las dos formas (`negocio:{ts}` → ningún recargo que
encontrar, no-op; `negocio:{material}:{ts}` → lo encuentra y lo saca).

### 3.7 Holográfico en packs de 100 (enmienda 26/9/2026, RF-MAT11…15)

**La regla**: todo pedido holográfico es un pack de 100 calcos en 4 o 6 cm,
repartidas entre los diseños de la tanda, a `NEGOCIO.price` ($39.999) +
`RECARGO_HOLOGRAFICO.precio` ($15.000). Ya no existe la calco holográfica
suelta: el precio por unidad del holográfico no está definido.

**Reutiliza la línea que ya existe y ya se valida** (`negocio:{material}:…` de
§3.6 + `fixed:material-holografico:{ts}`), en vez de un tipo de línea nuevo.
El servidor ya sabe cobrarla a $39.999, exigir su recargo y rechazar un
recargo huérfano; `removeItem` ya las acopla; `Cart.jsx` ya no la hace
editable. Lo que cambia es el alcance: deja de ser "1 diseño en 6 cm que
topeó" y pasa a ser **el único camino** del holográfico.

| Pieza | Cambio |
|---|---|
| Id de la línea | `negocio:vinilo-holografico:{tamano}:{ts}` — gana el TAMAÑO como tercer segmento para que el servidor valide 4/6 cm (el precio es el mismo en los dos, pero sin el tamaño en el id el servidor no podría rechazar un 9 cm). El id ligado sigue siendo el último segmento. La forma de 3 segmentos de §3.6 (`negocio:vinilo-holografico:{ts}`, 6 cm implícito) se sigue aceptando: es exactamente un pack de 100 y puede haber carritos guardados con ella |
| `meta` | `{ qty: 100, size, tamanoLabel, material, materialLabel, corte, corteLabel, disenos, instrucciones, archivos: [todos los diseños] }` — lo que el taller necesita para producir. `name` = `Holográfico · 100u {tamaño}`, sin nombre de archivo (PII, mismo criterio que §3.6) |
| `config/personalizados.js` | `PACK_HOLOGRAFICO = { qty: NEGOCIO.qty, precio: NEGOCIO.price, tamanos: ['4cm','6cm'] }` y `tamanoPermitido(tamano, material)`. El precio SALE de `NEGOCIO` a propósito: la línea es `negocio:` y el servidor la cobra con `NEGOCIO_PRICE`; una constante propia podría desincronizarse de lo que el servidor cobra |
| `lib/precioPersonalizados.js` | `cotizarTanda()` pierde `material`/`disenos` (ya no hay recargo por unidad; `recargo` queda en 0 en la forma). `precioEfectivoTanda()` con holográfico devuelve `cotizarPackHolografico()`: `{ total: 54.999, unidades: 100, recargo: 15.000, esHolografico: true, ahorro: 0 }`, sin importar copias, diseños ni 3x2. 9 cm → `configuracionCompleta: false`. **Sin "ahorrás"**: no hay un precio de lista holográfico contra el cual comparar, y un % inventado sería una promesa sin respaldo |
| `lib/borradorPersonalizado.js` | `construirLineaHolografica(e, { ts })` (pura, testeable en Node). `construirLineas()` devuelve `[]` con holográfico: nunca emite una `custom:` holográfica. `setMaterial(holo)` con 9 cm → `tamano: null`; `setTamano('9cm')` con holo → se ignora; `hidratar` hace lo mismo con un borrador guardado |
| `BotonCta.jsx` | Rama holográfica PRIMERO: `addNegocio(linea)` + recargo ligado por `ts`. La rama de Negocio pierde su caso holográfico (ya no puede llegar ahí) |
| `SelectorMaterial.jsx` | La card dice "+$15.000" y "Pack de 100 calcos" |
| `SelectorTamano.jsx` | Recibe `material`: con holo, 9 cm queda `disabled` ("No disponible en holográfico") y las flechas lo saltean; 4/6 cm muestran el precio del pack en vez del "c/u" |
| `SelectorCantidad.jsx` | Con holo: sin −/+ ni atajos; texto fijo "Pack de 100 calcos" (+ "repartidas entre tus N diseños" si hay más de uno); total con etiqueta "Pack holográfico" y el renglón del recargo; sin nada del 3x2 |
| `HeroConfigurador.jsx` | Pasa `material` a `SelectorTamano`; el cartel de Negocio no aparece con holo |
| `CartContext.jsx` | `purgarLineasRetiradas()` al hidratar: `esCustomViejo` + `custom:` holográficas + el recargo ligado a cada una. `removeItem` sin cambios |
| `lib/resumenPedido.js` | Rama propia para el pack: `Holográfico (4 cm, corte Silueta, x100 entre 3 diseños) \| diseños (3): links \| notas: …`. La rama `Negocio "…"` de siempre imprimiría `Negocio "undefined"` y perdería corte y notas |
| `netlify/functions/lib/pricing.js` | Rama `custom`: material holográfico → `item_invalid` ("el Vinilo Holográfico va en packs de 100"). Rama `negocio`: 4 segmentos → material tiene que ser holográfico y `parts[2]` ∈ `HOLOGRAFICO_TAMANOS` (`['4cm','6cm']`, espejo de `PACK_HOLOGRAFICO.tamanos`) |
| `personalizadosLanding.js` | `PRECIOS.bajada` deja de decir "sin mínimo" a secas: el holográfico va en packs de 100 (la cantidad sale de `PACK_HOLOGRAFICO.qty`) |

**Módulos compartidos que toca** (regla 9): `netlify/functions/lib/pricing.js`
(lo importan `create-preference.js`, `create-order-transfer.js` y los tests
de paridad) — el cambio es solo en las ramas `custom` y `negocio`, y solo
para el material holográfico; `CartContext.jsx` — solo la hidratación.
`config/pricing.js` no se toca.

**Carritos guardados** (regla 11): una `custom:` holográfica del 22–26/9 no
es un pack de 100, así que el servidor la rechaza. Se purga al hidratar junto
con su recargo (mismo precedente que `esCustomViejo`): si no, el checkout se
trabaría con un "recargá la página" que no se arregla recargando.

**Constantes espejadas (nuevas)**:
| Frontend | Servidor |
|---|---|
| `PACK_HOLOGRAFICO.tamanos = ['4cm','6cm']` | `HOLOGRAFICO_TAMANOS = ['4cm','6cm']` |
| `PACK_HOLOGRAFICO.precio = NEGOCIO.price` | `NEGOCIO_PRICE` (ya espejado) |

**Analytics**: sin eventos nuevos. `personalized_add_to_cart` manda
`units: 100` y `value: 54999` para el pack; `items` lleva la línea `negocio:`
real (nunca el recargo como ítem, igual que §3.6).

### Persistencia
| Dónde | Qué | Ref. |
|---|---|---|
| `sessionStorage` `epicalcos.personalizados.borrador.v1` | config + diseños en estado `listo` (con `url`) | `docs/database.md` §3 — **nuevo** |
| `localStorage` `epicalcos.cart.v2` | sin cambios | — |

`sessionStorage` y no `localStorage`: el borrador es de esta visita (una
pestaña nueva arranca limpia), y un archivo subido hace una semana que el
cliente ya no recuerda no debería aparecer solo.

### ⚠️ Compatibilidad con datos existentes
- [ ] *(hasta el 22/9/2026)* ~~La forma de las líneas no cambia~~ — la enmienda
      de material SÍ le agrega un segmento a `custom:`. Ver §3.2 y §8.
- [x] Los pedidos en Blobs no cambian.
- [x] Una línea `custom:{tamano}:{corte}:{ts}` de 4 segmentos (formato de ANTES
      de esta enmienda — nunca llegó a producción, spec 023 sigue sin
      commitear) sigue siendo válida: se interpreta como material por defecto
      (Vinilo Blanco, sin recargo). No hay carritos reales con esa forma
      todavía, pero los tests de paridad la siguen cubriendo (ANF-4).

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
- [x] *(enmienda 22/9/2026, RF-MAT7)* El servidor no confía en `meta.material`
      (nadie lo revisa — un `meta` manipulado no dispara nada): el material
      vive en el id de la línea `custom:`, y la validación cruzada de §3.5
      rechaza cualquier pedido donde falte el recargo de un diseño holográfico.
      Test dedicado: armar un pedido con una línea `custom:...:vinilo-holografico:x1`
      y **sin** su `fixed:material-holografico:x1` → `ok: false`
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
| *(enmienda 22/9/2026)* `recargo_material_faltante` — falta el recargo de un diseño holográfico | `validateAndPriceOrder` rechaza antes de crear la preferencia (§3.5) | Mismo mensaje genérico de error de pago que un `price_mismatch` — no se le explica al cliente el mecanismo interno |
| Falla el prerender | copia `index.html` y avisa en el log | la página como hoy |
| Tracking falla | try/catch existente | nada |

---

## 8. Estrategia de migración

- **Datos existentes**: no hay.
- **Carritos guardados**: compatibles (§3.2).
- **Pedidos ya en Blobs**: no aplica.
- *(enmienda 22/9/2026)* **`esCustomViejo()`**: pasa de `parts.length > 4` a
  `!getTamano(parts[1])`. Es un cambio de criterio, no solo de número: purga
  por "¿el segundo campo es un tamaño real?" en vez de "¿tiene más de 4
  segmentos?", así que sigue reconociendo el formato viejo real
  (`custom:{material-viejo}:{tamano}:{corte}:{ts}`, donde `parts[1]` NUNCA es
  un tamaño) y ahora también acepta el formato nuevo de 5 segmentos con
  material (`parts[1]` SÍ es un tamaño). Test: los 4 ids de material del
  modelo viejo (`vinilo-blanco`, `transparente`, `holografico`, `dtf-uv` —
  commit `1a32e6c`) siguen purgándose; una línea nueva con material no.
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
| `config/personalizadosLanding.test.js` | la FAQ nombra exactamente `formatosEntrada`; ningún precio escrito a mano (todo `$` del copy sale de `SIZES`/`NEGOCIO`); plazos = `shipping`; claim ≤ 3 usos y escrito `HACELO` (P-11); las preguntas pendientes (P-4/P-6) no están publicadas mientras su flag esté en `false`; **guarda de lo que no se dice** (RF-L18): ningún string del módulo matchea `/boceto|prueba de impresi|próximamente|perfect/i` |
| `lib/analyticsPersonalizados.test.js` | `toItems` idéntico para `sticker`/`pack`/`fixed`; `custom:` sin nombre de archivo; ningún `personalized_*` lleva `nombre`, `url` ni `instrucciones`; `rangoPeso` |
| *(enmienda 22/9/2026)* `lib/precioPersonalizados.test.js` / `promoPricing.test.js` | Vinilo Blanco y DTF UV: mismo precio que hoy, con y sin 3x2. Vinilo Holográfico: `construirLineas` emite la línea `custom:` + la de recargo; el servidor acepta ambas y `itemsTotal` incluye el recargo exactamente una vez por diseño (no por copia); **rechaza** un payload con la `custom:` holográfica y sin su `fixed:material-holografico:*` (`recargo_material_faltante`); rechaza un recargo huérfano; el recargo no se mueve con el 3x2/cupón vivos |
| *(enmienda)* `context/CartContext` (vía `promoPricing.test.js` o un test dedicado) | `esCustomViejo` sigue purgando los 4 ids de material del modelo viejo y acepta el nuevo formato con material (§8); `removeItem` de una línea `custom:` holográfica quita también su recargo |

### ⚠️ Tests de paridad
- [ ] `promoPricing.test.js` — no cambia en lo existente (no se tocan reglas previas), tiene que seguir verde; **suma** los casos de material de arriba
- [ ] `envio.test.js` — no cambia
- [x] `precioPersonalizados.test.js` — ampliado (arriba, incluye material)

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
