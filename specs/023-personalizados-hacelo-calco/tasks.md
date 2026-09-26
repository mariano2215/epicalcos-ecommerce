# Tasks — /personalizados: "Hacelo calco"

| | |
|---|---|
| **Spec** | `023-personalizados-hacelo-calco` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `EN CURSO` (desde el 14/09/2026) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

La implementación arranca solo cuando Mariano dice *"Implementá la spec 023"*.
Ver [`specs/README.md`](../README.md).

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] Mariano respondió P-1, P-3, P-5, P-9 y P-11 (14/9/2026); el resto va con su default (`requirements.md` §12)
- [x] **Mariano pidió explícitamente la implementación** — "Implementá la spec 023", 14/09/2026

---

## Cómo usar esta lista

- Los pasos van **en orden**. Cada fase deja el repo en verde.
- Sin refactors de oportunidad (regla 8): lo que aparezca va a *Hallazgos*.
- Si una task resulta mal planteada, **se para y se avisa**.
- Las tasks marcadas **[P-n]** dependen de una respuesta de Mariano: sin
  respuesta se implementa el *default* de `requirements.md` §12 y el flag queda
  apagado.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `Configurador.jsx`, `SubidaArchivo.jsx`, `ResumenPedido.jsx`, `QueSigue.jsx`, `precioPersonalizados.js` + test, `lib/analytics.js`, `lib/seo.js`, `config/personalizados.js` y la rama `custom` de `netlify/functions/lib/pricing.js`
  - *Verificación*: sé qué hace cada uno y por qué (comentarios incluidos)
- [ ] **0.2** Suite en verde
  ```bash
  npm test
  ```
  - *Verificación*: 524 tests pasan (o el número vigente, anotado acá)
- [ ] **0.3** **Medir la línea de base** antes de cambiar nada: `npm run build --prefix frontend` + `vite preview`, `/personalizados` a 375 px, LCP con `PerformanceObserver` (3 corridas, mediana) y peso del chunk `Personalizados-*.js`
  - *Verificación*: los números quedan anotados en la Bitácora
- [ ] **0.4** `git fetch` y rama
  ```bash
  git checkout -b feat/023-personalizados-hacelo-calco
  ```
  - *Verificación*: `git branch --show-current` no dice `main`

---

## Fase 1 — Datos y copy (sin UI)

- [ ] **1.1** `ARCHIVO.formatosEntrada` y `ARCHIVO.formatosConvertibles` en `config/personalizados.js`; `ARCHIVO.formatos` intacto
  - *Verificación*: `grep -n "formatos" frontend/src/config/personalizados.js` muestra los tres; Polaroid/Negocio siguen leyendo `formatos`
- [ ] **1.2** `config/personalizadosLanding.js` con todo el copy de `requirements.md` §7 y la FAQ de §9.2. Flags `publicar` (apagados) para lo que espera respuesta: `faqFondo` / `faqMascota` [P-4], `ladoMayor` [P-6]. **No** existen ni la pieza de P-3 ni la pregunta del boceto de P-5: no se escriben, ni apagadas. Claim `HACELO CALCO.` en una constante [P-11]
  - *Verificación*: el módulo se importa en Node (`node -e "import('./frontend/src/config/personalizadosLanding.js')"` no tira)
- [ ] **1.3** `data/personalizadosFotos.js` con todas las listas **vacías** [P-1]: la única foto real (`logo-1.webp`) llega a la página por el testimonio de Sofía M. (1.4), no por el manifiesto
  - *Verificación*: ninguna entrada apunta a un archivo que no existe (test)
- [ ] **1.4** `personalizado: true` en el testimonio de Sofía M. (`data/testimonials.js`)
  - *Verificación*: `Testimonials` del Home y `SocialProof` se ven igual
- [ ] **1.5** `config/personalizadosLanding.test.js` (design §9)
  - *Verificación*: suite verde

---

## Fase 2 — Lógica pura

- [ ] **2.1** `cotizarTanda()` en `lib/precioPersonalizados.js` (reemplaza `calcularPrecio`), con `promo3x2` y `round` de `config/pricing.js`
  - *Verificación*: para 6 cm × 10 con 3x2 → unitario 1.120, total 11.200, ahorro 30 %
- [ ] **2.2** `lib/borradorPersonalizado.js`: `crearBorrador({ subir, preparar, medir, storage })`, singleton por defecto, cola de 4, `estadoCta`, `construirLineas`, persistencia `epicalcos.personalizados.borrador.v1`
  - *Verificación*: `construirLineas` emite la forma exacta de design §3.2
- [ ] **2.3** `lib/prepararImagen.js` (WEBP → PNG + `comprimirImagen` + transparencia)
  - *Verificación*: un `.webp` sale como `.png` con el mismo nombre base
- [ ] **2.4** `lib/vistaCalco.js` (helpers puros + `dibujarVistaCalco`)
- [ ] **2.5** Tests: `borradorPersonalizado.test.js`, `vistaCalco.test.js`, `precioPersonalizados.test.js` ampliado con la **paridad contra `validateAndPriceOrder`**
  - *Verificación*: ningún caso de 4/6/9 cm × {1,2,3,5,10,25,50,100} da `price_mismatch`, y `itemsTotal` = `cotizarTanda().total`

---

## Fase 3 — Analytics

- [ ] **3.1** Trackers en `lib/analytics.js`: `trackPersonalizedView`, `…UploadStart`, `…UploadComplete`, `…UploadError`, `…Preview`, `…SizeSelected`, `…QuantitySelected`, `…ConfigurationComplete`, `…AddToCart`; `pixelCustom` con los nombres viejos de Meta [P-12]
  - *Verificación*: ningún componente llama a `gtag`/`fbq`/`dataLayer` directo (`grep`)
- [ ] **3.2** `nombreParaAnalytics()` en `toItems` y en `content_name`; `rangoPeso()`
  - *Verificación*: test — `sticker`/`pack`/`fixed` idénticos a hoy; `custom:` sin nombre de archivo
- [ ] **3.3** Retirar `trackPersonalizadoPaso`, `trackPersonalizadoArchivo`, `trackPersonalizadoPrecio`
  - *Verificación*: `grep -rn "trackPersonalizado" frontend/src` solo encuentra lo que se reusa
- [ ] **3.4** `lib/analyticsPersonalizados.test.js`
  - *Verificación*: ningún payload `personalized_*` tiene `nombre`, `url` ni `instrucciones`

---

## Fase 4 — Hero configurador

- [ ] **4.1** `useBorrador.js` (`useSyncExternalStore`)
- [ ] **4.2** `ZonaSubida.jsx`: botón real + input `sr-only`, drag & drop, lista con miniatura/progreso, Reemplazar/Quitar/Reintentar, "Agregar igual y mandarlo por WhatsApp", `aria-live`, `data-clarity-mask`
  - *Verificación*: con teclado solo (Tab + Enter) se abre el selector; el foco se ve
- [ ] **4.3** `VistaPrevia.jsx`: ORIGINAL | VISTA CALCO (| EN UN TERMO); rótulo "vista aproximada"; JPG + silueta → imagen con borde redondeado, sin texto sobre contorno ni fondo (RF-P3/P5); PDF/AI → ícono
  - *Verificación*: PNG transparente muestra borde que sigue la forma en silueta; círculo y cuadrado dibujan su forma
- [ ] **4.4** `SelectorTamano.jsx` (radio group, MÁS ELEGIDO [P-7], usos de `usosPorTamano.js`, precio c/u de `SIZES`); al elegir por primera vez con diseño cargado, la vista pasa a VISTA CALCO
- [ ] **4.5** `SelectorCantidad.jsx`: − / + / 1·5·10·25·50·100, total, unitario y ahorro si hay 3x2, "sumá N y una te sale gratis", recomendación Negocio cuando el total de un diseño alcanza `NEGOCIO.price` [P-9] (`trackWholesaleClick('personalizados')`)
  - *Verificación*: con el 3x2 apagado (`activa:false` en un test local) no aparece ningún "ahorrás"
- [ ] **4.6** `OpcionesExtra.jsx` (corte default silueta [P-8] + instrucciones, plegado)
- [ ] **4.7** `BotonCta.jsx` con los seis estados de design §3.1
- [ ] **4.8** `HeroConfigurador.jsx`: claim (no heading), **H1 único**, subtítulo, texto; 2 columnas `lg:` / 1 columna mobile
- [ ] **4.9** Agregar al carrito: `construirLineas` → `addCustom` × N (silent, sin drawer) → `openDrawer()` una vez → `trackPersonalizedAddToCart` → estado `agregado` → la tanda se vacía
  - *Verificación*: 3 diseños × 2 copias = 3 líneas `custom:…` de cantidad 2 en el carrito, cada una con su `url`
- [ ] **4.10** "Ya tenés N en el carrito · Ver carrito" si hay líneas `custom` [RF-C11]
- [ ] **4.11** `routes/Personalizados.jsx` monta el hero; se borran `Configurador.jsx`, `PasoSelector.jsx`, `ResumenPedido.jsx`, `QueSigue.jsx` (el contenido y el comentario del 15/8 pasan a `Proceso`)
  - *Verificación*: `grep -rn "Configurador\|PasoSelector\|ResumenPedido\|QueSigue" frontend/src` sin resultados vivos; build OK

---

## Fase 5 — Barra fija mobile

- [ ] **5.1** `BarraFijaMovil.jsx` (`lg:hidden`, `z-40`, safe-area) con `BotonCta`; visible entre el CTA del hero y el CTA final (`IntersectionObserver`)
  - *Verificación*: a 375 px no tapa el último elemento de ninguna sección ni el footer
- [ ] **5.2** Comentario de `WhatsAppButton.jsx` actualizado
  - *Verificación*: a 375 px el botón de WhatsApp queda **arriba** de la barra, sin superponerse (medido con `getBoundingClientRect`)

---

## Fase 6 — Secciones de la landing

Cada sección con foto **no se monta** si su entrada en `personalizadosFotos.js`
está vacía (RF-L2).

- [ ] **6.1** `BarraConfianza` (datos de `brandStats`, `shipping`, `trustPoints`; 2×2 en mobile)
- [ ] **6.2** `DeImagenACalco` [P-1] — horizontal `md:`, vertical en mobile
- [ ] **6.3** `QuePodesConvertir` [P-1] — solo si están las cuatro fotos
- [ ] **6.4** `Editorial` (texto + claim + CTA → `abrirSelector('editorial')`)
- [ ] **6.5** `Beneficios` (4 cards del copy)
- ~~**6.6** `ArchivoImperfecto`~~ — descartada (P-3). No se crea el componente
- [ ] **6.7** `Galeria` — masonry con `columns-2 md:columns-3`, rótulos en algunas, "Ni un render"; se monta desde 4 fotos
- [ ] **6.8** `Proceso` — SUBÍ / REVISAMOS / PRODUCIMOS / RECIBÍS con plazos de `shipping`; id `como-funciona` (destino de "Ver cómo funciona")
- [ ] **6.9** `Calidad` [P-1] — 50/50
- [ ] **6.10** `Precios` — tamaños de `SIZES`, "sin mínimo", tabla 10·25·50·100 con `cotizarTanda` solo si hay 3x2; card de Negocio con `NEGOCIO` [P-9]
- [ ] **6.11** `Testimonios` — solo `personalizado: true` [P-2]; va tercera (después de la barra de confianza) mientras `FOTOS.deImagenACalco` esté vacío, y en su lugar del orden completo cuando no
- [ ] **6.12** `Faq` — acordeón accesible (`aria-expanded`), preguntas con flag apagado no se renderizan
- [ ] **6.13** `CtaFinal` — HACER MI CALCO → scroll al hero + `abrirSelector('cta_final')`; plazo de `shipping.production`
- [ ] **6.14** Orden final en `routes/Personalizados.jsx` según `requirements.md` §7.6; claim ≤ 3 veces
  - *Verificación*: `document.querySelectorAll('h1').length === 1`; ningún `<img>` de sección con `loading` distinto de `lazy`

---

## Fase 7 — SEO

- [ ] **7.1** `useSeo` en `Personalizados.jsx`: título, descripción (con `shipping.production`), `image` = `/meta/personalizados.jpg`, `jsonLd` = `@graph` [Product, BreadcrumbList, FAQPage] desde `personalizadosEstatico.js`
- [ ] **7.2** `/meta/personalizados.jpg` desde `logo-1.webp` (`sips`), hasta la foto de P-1
- [ ] **7.3** `lib/prerender.js` + `lib/personalizadosEstatico.js` + `lib/prerender.test.js`
  - *Verificación*: test verde (design §9)
- [ ] **7.4** `scripts/prerender.mjs` + `"postbuild"` en `frontend/package.json`; respeta `HIDDEN_SECTIONS`; ante error copia `index.html` y avisa (D-9)
  - *Verificación*: `npm run build --prefix frontend` deja `dist/personalizados.html`; forzando un error, el build termina igual con el aviso
- [ ] **7.5** `curl` al `vite preview`:
  ```bash
  curl -s http://localhost:4173/personalizados | grep -o '<title>[^<]*</title>\|rel="canonical"[^>]*\|<h1[^>]*>'
  ```
  - *Verificación*: título, canonical y un H1 propios

---

## Fase 8 — Imágenes

- [ ] **8.1** Target `images/personalizados/` en `scripts/optimize-images.mjs` (800 + 400 px)
- [ ] **8.2** Cargar en el manifiesto las fotos que Mariano haya mandado [P-1]; `width`/`height` reales y `alt` que describe la foto
  - *Verificación*: ninguna imagen de la página pesa > 150 KB (`ls -l`)

---

## Fase 9 — Verificación

- [ ] **9.1** Suite completa en verde
  ```bash
  npm test
  ```
- [ ] **9.2** Build + `vite preview` + Browser pane a 375 px: recorrido de design §9 (PNG transparente, JPG, PDF, WEBP; tres cortes; termo; cantidad; agregar; drawer; checkout hasta antes de pagar)
- [ ] **9.3** Navegar al carrito con una subida en curso y volver; refrescar con diseños subidos
- [ ] **9.4** Teclado solo, de punta a punta
- [ ] **9.5** LCP y peso del chunk vs. la línea de base de 0.3
  - *Verificación*: LCP no peor (tolerancia 10 %); chunk anotado
- [ ] **9.6** `window.dataLayer` durante el recorrido: funnel completo y sin PII
- [ ] **9.7** Consola sin errores; ningún scroll horizontal a 375 px (`document.documentElement.scrollWidth <= 375`)
- [ ] **9.8** Regresión: `/polaroid`, `/negocio`, `/mayorista` suben archivos como antes; una compra de catálogo llega al checkout

---

## Fase 10 — Documentación

- [ ] **10.1** `docs/analytics.md`: eventos `personalized_*`, tabla viejo → nuevo con fecha, funnel §4, `item_name` sanitizado
- [ ] **10.2** `docs/architecture.md`: el paso de prerender del build
- [ ] **10.3** `docs/business-rules.md` §7: alta explícita, una línea por diseño, WEBP convertido
- [ ] **10.4** `docs/database.md` §3: `epicalcos.personalizados.borrador.v1`
- [ ] **10.5** `docs/QA-CHECKLIST.md`: checklist de personalizados para iPhone / Instagram / Android
- [ ] **10.6** Comentarios del **por qué** en el código (D-1, D-2, D-4, D-7, D-11, D-13)

---

## Fase 11 — Cierre

- [ ] **11.1** Recorrer `acceptance.md` punto por punto con resultado real
- [ ] **11.2** Commit (archivo por archivo, sin `-A`: puede haber WIP de otras sesiones) + merge a `main` + push
  - ⚠️ **push a `main` = deploy a producción**
- [ ] **11.3** Después del deploy:
  ```bash
  curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://epicalcos.com/personalizados
  curl -s https://epicalcos.com/personalizados | grep -o '<title>[^<]*</title>\|rel="canonical"[^>]*'
  ```
  - *Verificación*: `200` sin redirect, título y canonical propios. Si no: D-8
- [ ] **11.4** Pedirle a Mariano: reindexación en Search Console + checklist en su iPhone y en Instagram + GA4 DebugView
- [ ] **11.5** Estado de la spec en `DONE` (o lo que corresponda según 11.1)

---

## Fase 12 — Material (enmienda 22/9/2026: Vinilo Blanco / DTF UV / Vinilo Holográfico)

- [x] **12.1** `config/personalizados.js`: `MATERIALES` (3 ids), `MATERIAL_POR_DEFECTO = 'vinilo-blanco'`, `MATERIAL_HOLOGRAFICO_ID`, `getMaterial()`, `RECARGO_HOLOGRAFICO = { id: 'material-holografico', precio: 15000 }`
  - *Verificación*: `getMaterial('no-existe')` da `null`; los 3 ids están en la allowlist que después usa el server ✅
- [x] **12.2** `netlify/functions/lib/pricing.js`: `FIXED_PRICES['material-holografico'] = 15000`; rama `custom` de `lineBase` lee material opcional (parts[3] si hay 5 segmentos) contra la misma allowlist; rechaza un material desconocido
  - *Verificación*: `custom:6cm:silueta:x1` (4 segmentos) sigue validando igual que hoy ✅ (test)
- [x] **12.3** Validación cruzada en `validateAndPriceOrder`: por cada `custom:` holográfica exige su `fixed:material-holografico:{disenoId}` (quantity 1, precio 15000); rechaza huérfanos — `recargo_material_faltante` / `item_invalid`
  - *Verificación*: test que arma el pedido SIN la línea de recargo y espera `ok:false` ✅
- [x] **12.4** `swatches.jsx`: `Swatch({ kind: 'material', id })` — un ícono por material, mismo `LIENZO`/paleta que tamaño y corte
- [x] **12.5** `SelectorMaterial.jsx` (mismo patrón que `SelectorTamano.jsx`): 3 cards, radio group, "+$15.000" solo en Vinilo Holográfico; `trackPersonalizedMaterialSelected`
- [x] **12.6** `lib/borradorPersonalizado.js`: `material` en `inicial()` (default `vinilo-blanco`), `setMaterial()`, persistencia (`serializar`/`hidratar`), `construirLineas()` con el id/meta de design.md §3.2
  - *Verificación*: `construirLineas` mete el material en el id (4º segmento) y en `meta` para los 3 materiales ✅ (test). La línea de recargo NO sale de acá — sale de `BotonCta` (§3.5)
- [x] **12.7** `HeroConfigurador.jsx`: monta `SelectorMaterial`; el total mostrado (RF-Q2) suma el recargo cuando corresponde, con su propio renglón en `SelectorCantidad`
- [x] **12.8** `BotonCta.jsx` (`useAgregarAlCarrito`): agrega también la línea de recargo con `addFixed` cuando el material es holográfico
- [x] **12.9** `CartContext.jsx`: `esCustomViejo` → `!getTamano(parts[1])` (design.md §8); `removeItem` acopla el borrado del recargo
  - *Verificación*: los 4 ids de material del modelo viejo (commit `1a32e6c`) se siguen purgando al hidratar ✅ (test)
- [x] **12.10** `Cart.jsx` y `CartDrawer.jsx`: la línea de recargo queda fuera de `EDITABLE` (sin selector de cantidad ni botón de quitar propio)
- [x] **12.11** `lib/analytics.js`: `trackPersonalizedMaterialSelected(material)`; `material` se suma a los parámetros de `trackPersonalizedConfigurationComplete` y `trackPersonalizedAddToCart`
- [x] **12.12** Tests: `precioPersonalizados.test.js` ampliado con los casos de design.md §9 (paridad de los 3 materiales, recargo faltante, recargo huérfano, cantidad ≠ 1, material desconocido, no-descuento con 3x2, `esCustomViejo`); `borradorPersonalizado.test.js` actualizado a la nueva forma del id
  - *Verificación*: `npm test` → 613/613 ✅ (22/9/2026)
- [x] **12.13** `docs/business-rules.md` §1 "Calcos personalizados", `docs/analytics.md`, `docs/database.md` §3: reflejan la regla y el id nuevos
- [x] **12.14** Recorrido manual a 375 px (Browser pane, 22/9/2026): elegir material, ver el total, agregar al carrito, confirmar que el recargo aparece como línea propia y no editable, sacar el diseño y confirmar que el recargo se va con él
  - *Verificación*: ✅ el recorrido encontró y corrigió un bug real — `BarraFijaMovil.jsx` tenía su PROPIO `cotizarTanda()` (no pasaba `material`/`disenos`) y mostraba $1.600 mientras el CTA del hero ya mostraba $16.600 con el holográfico elegido. Corregido; sin errores de consola; carrito queda vacío (sin línea huérfana) al sacar el diseño

---

## Fase 13 — Tope a la Promo Negocio (enmienda 22/9/2026: "topear el precio en $39.999")

- [x] **13.1** `lib/precioPersonalizados.js`: `precioEfectivoTanda()` — igual a `cotizarTanda()` salvo que un solo diseño en 6 cm por encima del umbral de Negocio devuelve `{ total: NEGOCIO.price (+ recargo), unidades: NEGOCIO.qty, esNegocio: true }`
  - *Verificación*: tests — topea en el umbral, sigue en $39.999 hasta 100 copias, no topea con &gt;1 diseño ni en otro tamaño, el holográfico suma el recargo arriba
- [x] **13.2** `HeroConfigurador.jsx` y `BarraFijaMovil.jsx`: `cotizarTanda` → `precioEfectivoTanda` (un solo lugar decide el precio, no dos — ver Bitácora 22/9); el cartel "¿Son para tu negocio?" se oculta cuando `cotizacion.esNegocio` ya topeó
- [x] **13.3** `SelectorCantidad.jsx`: etiqueta "Promo Negocio" junto al total cuando `c.esNegocio`; se ocultan el nudge y el texto del 3x2 (no aplican)
- [x] **13.4** `BotonCta.jsx` (`useAgregarAlCarrito`): con un solo diseño en 6 cm por encima del umbral, agrega la línea `negocio:` (con el diseño en `meta.archivos`) en vez de `custom:`; el recargo holográfico se liga por el mismo timestamp
  - *Verificación*: el `item_name` trackeado es el de la línea REAL agregada (negocio o custom), nunca una fantasma
- [x] **13.5** `netlify/functions/lib/pricing.js`: rama `negocio` de `lineBase` parsea un material opcional (`negocio:{material}:{ts}`); la validación cruzada del recargo (Fase 12) también puebla `requierenRecargo` desde estas líneas
  - *Verificación*: `negocio:{ts}` de siempre sigue validando idéntico (test)
- [x] **13.6** `CartContext.jsx`: `removeItem` acopla también `negocio:` con su recargo
- [x] **13.7** `lib/analytics.js` / `BotonCta.jsx`: la línea `negocio:` auto-agregada NO lleva el nombre del archivo en `name` (PII — ver design.md §3.6); el archivo sigue viajando en `meta.archivos`
- [x] **13.8** Tests: `precioPersonalizados.test.js` ampliado (`precioEfectivoTanda`, `negocio:{material}:{ts}` aceptado/rechazado, recargo faltante en negocio, `negocio:{ts}` de siempre sin cambios)
  - *Verificación*: `npm test` → 623/623 ✅ (22/9/2026)
- [x] **13.9** `docs/business-rules.md`: nueva regla del tope automático
- [x] **13.10** Recorrido manual en el Browser pane (22/9/2026): 100 copias en 6 cm topea a $39.999 (con y sin holográfico → $54.999), el carrito muestra la línea Negocio + recargo, sacar Negocio saca el recargo, y el formulario ESTÁNDAR de `/negocio` (con nombre de negocio) sigue funcionando idéntico
  - *Verificación*: ✅ todo correcto. Errores de consola "`useCart` fuera de `CartProvider`" en el pane resultaron ser entradas viejas acumuladas por HMR de tanto editar en vivo — la página renderiza y funciona bien en cada captura; no reproducen en una recarga real

---

## Fase 14 — Holográfico en packs de 100 (enmienda 26/9/2026, design.md §3.7)

- [x] **14.1** `config/personalizados.js`: `PACK_HOLOGRAFICO` (qty y precio de `NEGOCIO`, tamaños 4/6 cm) y `tamanoPermitido()`
- [x] **14.2** `netlify/functions/lib/pricing.js`: `HOLOGRAFICO_TAMANOS`; rama `custom` rechaza el holográfico; rama `negocio` acepta `negocio:vinilo-holografico:{tamano}:{ts}` solo en 4/6 cm
  - *Verificación*: test — `custom:` holográfica rechazada (aun con 100 copias); pack en 4 y 6 cm aceptado a $54.999; 9 cm rechazado; la forma de 3 segmentos del 22/9 sigue aceptada
- [x] **14.3** `lib/precioPersonalizados.js`: `cotizarPackHolografico()`; `precioEfectivoTanda()` la usa con holo; `cotizarTanda()` sin recargo
  - *Verificación*: test — $54.999 y 100 unidades con 1, 10 o 500 copias, 1 o 3 diseños, con y sin 3x2; 9 cm sin precio
- [x] **14.4** `lib/borradorPersonalizado.js`: `construirLineaHolografica()`; `construirLineas()` → `[]` con holo; `setMaterial`/`setTamano`/`hidratar` no dejan holo + 9 cm
  - *Verificación*: test — la línea del pack la acepta `validateAndPriceOrder` con su recargo, y el total es el mismo que muestra `precioEfectivoTanda()`
- [x] **14.5** `BotonCta.jsx`: rama holográfica (una línea `negocio:` + un recargo por tanda); la rama Negocio pierde el caso holo
- [x] **14.6** `SelectorMaterial.jsx`, `SelectorTamano.jsx`, `SelectorCantidad.jsx`, `HeroConfigurador.jsx`: RF-MAT13 y RF-MAT15
- [x] **14.7** `CartContext.jsx`: `purgarLineasRetiradas()` al hidratar
  - *Verificación*: test — saca la `custom:` holográfica y SU recargo; deja el pack `negocio:` holo con su recargo y las `custom:` de otros materiales
- [x] **14.8** `lib/resumenPedido.js`: rama del pack holográfico
  - *Verificación*: test — la nota dice holográfico, tamaño, corte, x100, cantidad de diseños, links y notas
- [x] **14.9** `personalizadosLanding.js` (`PRECIOS.bajada`) y `docs/business-rules.md`
- [x] **14.10** `npm test` en verde; recorrido del configurador a 375 px (holo con 1 y 3 diseños, 9 cm deshabilitado, carrito con el pack + recargo, sacar el pack saca el recargo)
  - *Verificación*: `npm test` → 705/705 ✅ (26/9/2026). Recorrido con Playwright contra `vite preview` a 375 px ✅: un carrito guardado con `custom:` holográfica + recargo se limpió al abrir la página (quedó solo la de vinilo blanco); 9 cm → holográfico deseleccionó el tamaño, 9 cm quedó deshabilitado ("No disponible en holográfico") y el CTA volvió a "Crear mi calco"; en 4 cm con 3 diseños: sin −/+, "Pack de 100 calcos holográficas. Se reparten entre tus 3 diseños…", total $54.999 con el renglón del recargo; el carrito recibió `negocio:vinilo-holografico:4cm:{ts}` ($39.999, 3 archivos) + `fixed:material-holografico:{ts}` ($15.000), subtotal $54.999; quitar el pack en `/carrito` dejó el carrito vacío. Sin errores de la app en consola (solo recursos externos bloqueados por el sandbox)

---

## Hallazgos fuera de scope

Ver `design.md` §12. Lo nuevo que aparezca durante la implementación va acá:

| Hallazgo | Archivo | Propuesta |
|---|---|---|

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 14/09/2026 | Línea de base (0.3) medida con Chrome headless por CDP (375×812 @2x, Slow 4G, CPU 4×), no con el Browser pane | El pane estaba oculto (`visibilityState: hidden`): sin pintar no hay entradas de LCP. Script en el scratchpad de la sesión, sin dependencias |
| 14/09/2026 | **Línea de base**: LCP mediana **3.292 ms** (5 corridas: 2.740 · 3.372 · 3.404 · 2.872 · 3.292); elemento LCP = `logo-1.webp` (el `SocialProof` destacado). Chunk `Personalizados-*.js` 15,8 kB + `SubidaArchivo-*.js` 9,2 kB. Suite: 524 tests | Tasks 0.2 y 0.3 |
| 22/09/2026 | `BarraFijaMovil.jsx` tenía su PROPIO `cotizarTanda()` — no recibía `material`/`disenos` (enmienda de material) y después tampoco el tope de Negocio (enmienda "topear el precio en $39.999"): mostraba un total distinto al del CTA del hero para la MISMA tanda | Encontrado recorriendo la UI en el Browser pane, no por los tests (ninguna suite renderiza este componente). Corregido reemplazando su cálculo por `precioEfectivoTanda()`, la MISMA función que usan `HeroConfigurador.jsx` y `useAgregarAlCarrito()` — un solo lugar que decide el precio, no tres |

---

## Fase 15 — Fixes del 26/9/2026 (design.md §3.8)

- [x] **15.1** `lib/resumenPedido.js`: material en `groupCustomItems` y en la nota; `groupPackItems()`; `Negocio` sin `"undefined"`; `especificacionDisenos()` (usada por `Checkout.jsx`)
  - *Verificación*: tests — nota con material y grupos separados por material; 2 packs = un renglón x200; spec de WhatsApp con material
- [x] **15.2** `routes/PaymentSuccess.jsx`: renglón y mensaje de WhatsApp con el material (y sin el " · " suelto cuando no hay)
- [x] **15.3** `lib/precioPersonalizados.js`: `repartoNegocio()`; `precioEfectivoTanda()` con `packsNegocio`/`sueltas`/`unitarioSueltas`
  - *Verificación*: tests — tabla de repartos (37 → sueltas, 38 → 1 pack, 137 → 1 + 37, 138 → 2, 237 → 2 + 37); para 1…1000 copias con y sin 3x2 nunca menos calcos que las pedidas ni más caro que el 3x2 puro o que tomar packs
- [x] **15.4** `lib/borradorPersonalizado.js`: `construirLineasNegocio()` con material, corte y notas en `meta`; `BotonCta.jsx` la usa con los números de la cotización
  - *Verificación*: test de paridad — el servidor acepta las líneas y cobra el total mostrado para 30…1000 copias, con y sin 3x2
- [x] **15.5** `SelectorCantidad.jsx`: etiqueta "2 packs Promo Negocio + 37 sueltas"
- [x] **15.6** `HeroConfigurador.jsx`: el aviso cuenta calcos de `custom` y `negocio`
- [x] **15.7** `npm test` en verde + recorrido a 375 px
  - *Verificación*: `npm test` → 717/717 ✅ (26/9/2026). Recorrido con Playwright contra `vite preview` a 375 px ✅: 1 diseño en 6 cm, DTF UV, 237 copias → "Total · 237 calcos · 2 packs Promo Negocio + 37 sueltas · $119.995"; 200 copias → "2 packs Promo Negocio · $79.998"; el carrito recibió `negocio:{ts}-1`, `negocio:{ts}-2` (DTF UV, Silueta en meta) + `custom:6cm:silueta:dtf-uv:…` × 37; el aviso dice "Ya tenés 237 calcos personalizadas en el carrito". Sin errores de la app en consola
  - ⚠️ *Hallazgo, fuera de scope*: `/carrito` muestra el 3x2 como "unidades gratis × precio de lista" (37 sueltas: −$19.200 → $40.000), mientras el checkout y el servidor redondean por unidad (37 × $1.081 = $39.997). El carrito puede mostrar unos pesos MÁS que lo que se cobra. Pasa igual sin packs (37 calcos sueltas) — no es de este cambio

