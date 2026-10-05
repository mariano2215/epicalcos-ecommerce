# Tasks — Calcos para negocios

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `EN CURSO` — Fase 1 implementada el 05/10/2026 |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

Cada fase arranca solo cuando Mariano dice *"Implementá la spec 031 — Fase N"*.
Aprobar una fase no aprueba la siguiente. Ver [`specs/README.md`](../README.md).

- [x] `requirements.md`, `design.md`, `AUDIT.md`, `BUSINESS-TODOS.md` y `WHOLESALE-MIGRATION.md` completos
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la fase que se va a implementar**

---

## Cómo usar esta lista

- Los pasos van **en orden** dentro de cada fase. Cada uno deja el repo
  coherente y con la suite en verde.
- **Sin refactors de oportunidad** (regla 8). Lo que aparezca va a *Hallazgos*.
- Si una task resulta mal planteada, **se para y se avisa**.
- ⚠️ **Push a `main` = deploy.** En esta carpeta trabajan otras sesiones: no
  cambiar de rama, stagear **archivo por archivo** y commitear con
  `git commit -m "…" -- rutas`. Verificar después que el WIP ajeno sigue en el
  disco sin publicar.

---

## Fase 0 — Preparación (al arrancar cada fase)

- [x] **0.1** `git fetch` y `git status`: anotar el WIP ajeno que haya en el árbol y no tocarlo
  - *Verificación*: la lista de archivos ajenos está escrita en la Bitácora
- [x] **0.2** Releer los archivos de la fase y sus tests
- [x] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: pasan todos (anotar el número)
- [x] **0.4** Pasar a `requirements.md` §12 las respuestas de `BUSINESS-TODOS.md` que haya, con fecha. Las que falten se implementan con la opción recomendada **solo** si no publican un dato inventado; si no, la pieza queda apagada

---

## Fase 1 — Posicionamiento

- [x] **1.1** `config/negocios.js`: copy de `design.md` §11, cantidades del cotizador, usos, pasos, preguntas (`publicar: false` en las que dependen de un TODO), mensajes de WhatsApp, SEO de `/negocio` y `/mayorista`. Montos interpolados de `config/pricing.js`
  - *Verificación*: `grep -nE '\$[0-9]|[0-9]+ ?%' frontend/src/config/negocios.js` no encuentra montos ni porcentajes escritos a mano
- [x] **1.2** Test de copy prohibido: falla si `config/negocios.js` o `components/negocios/**` contienen "archivo perfecto", "boceto", "muestra" sin "vista previa" en la misma frase, un código de cupón o las frases genéricas de RF-CO1; y si las páginas de menos de 100 (`/personalizados`, tienda) mencionan la vista previa
  - *Verificación*: el test falla al agregar a mano "No hace falta que tu archivo esté perfecto" y pasa al sacarlo
- [x] **1.3** `data/negociosFotos.js` con `negocio-muestra.webp` (dimensiones reales y `alt`) y el resto de las listas vacías
- [x] **1.4** `config/site.js`: `navLinks` (D-6), `footerLinks` en 4 grupos, `anunciosVigentes(now, { negocio })`, `shipping.produccionVolumen = '3 a 5 días hábiles'` y `produccionVolumenDesde = 100` (N-3/N-19). **No** tocar costos ni umbrales
  - *Verificación*: `git diff frontend/src/config/site.js` no toca ningún costo ni umbral de envío; `anuncios.test.js` actualizado y en verde
- [x] **1.5** `Header.jsx`: botón **Cotizar** (→ `/negocio`; en Fase 2 → `#cotizador`) y la tira con `negocio` en `/negocio` y `/mayorista`
  - *Verificación*: a 1024 px el nav entra en una línea; a 375 px "Cotizar" está en el menú
- [x] **1.6** `Footer.jsx`: 4 grupos; las secciones de `HIDDEN_SECTIONS` siguen sin aparecer
- [x] **1.7** `components/negocios/HeroNegocio.jsx`, `BarraConfianza.jsx`, `ComoFunciona.jsx`, `CtaFinalNegocio.jsx`
  - *Verificación*: 375 × 667: H1, precio "desde" y CTA visibles sin scroll (captura)
- [x] **1.8** `routes/Negocio.jsx`: hero → confianza → marcas → **Promo Negocio** (`NegocioForm` tal cual) → cómo funciona → CTA final. `useSeo` con el título nuevo
- [x] **1.8b** Plazo de 100+ (RF-P3): `CheckoutForm` muestra `produccionVolumen` con 100+ calcos en el carrito; FAQ general con la línea de 100+; `notify.js → customerTimeline()` cuenta calcos desde los ids + test del mail
  - *Verificación*: pedido de 120 calcos sueltas → "3 a 5 días hábiles"; pedido de 30 → "2 a 3 días hábiles"; una línea de Negocio (100) → "3 a 5"
- [x] **1.9** `analytics.js`: `trackHeroCta({ pagina, cta })`; los CTAs del hero lo llaman
- [x] **1.10** Documentar en `docs/analytics.md` el evento nuevo
- [x] **1.11** Validar Fase 1 contra `acceptance.md` y reportar · commit + push

---

## Fase 2 — Conversión

### Motor
- [ ] **2.0** Confirmar que la **Fase 1 de la spec 032** (escala en el config y en el servidor) está en `main`; si no, **parar**
- [ ] **2.1** `lib/cotizadorNegocio.js`: `cotizarPedidoNegocio()` (§3.1) sobre `precioVolumen()`
- [ ] **2.2** `lineaPedidoNegocio()` (§3.2): una línea `volumen:`, `meta` con razón social, CUIT, diseños, reparto y archivos; sin nombre de archivo en `name`
- [ ] **2.3** `lib/cotizadorNegocio.test.js`: casos + **paridad** (la línea pasa por `validateAndPriceOrder()` real con `mercadopago` y `transferencia` y el total coincide al peso)
  - *Verificación*: el test falla si se cambia a mano un escalón en un solo lado del espejo
- [ ] **2.4** `lib/resumenPedido.js`: la línea muestra escalón, razón social, CUIT, diseños, reparto y los links una vez + test

### Interfaz
- [ ] **2.5** `GrupoOpciones.jsx` (radio-group accesible, 44 px, foco visible, `aria-live` para el precio)
- [ ] **2.6** `PrecioPedido.jsx`: total, por calco, % del escalón (referencia de P-2 de la 032), transferencia, "te llevás N" cuando sube de escalón
- [ ] **2.7** `Cotizador.jsx`: tamaños 4 y 6 cm, vinilo blanco preseleccionado con "Recomendado"; pasos → precio → **Subir diseño y continuar** (`SubidaArchivo` con el preset de Negocio) → razón social (obligatoria) y CUIT (opcional) → **Agregar al carrito** con `addNegocio` → CTA "Ver carrito" (D-11). Salidas a presupuesto (+1.000 y sin precio) y a WhatsApp
  - *Verificación*: 3 diseños × 250 en 6 cm → una línea `volumen:` con el precio del escalón → checkout MP sin `price_mismatch` (local)
- [ ] **2.8** `EscalaVolumen.jsx` (RF-E1)
- [ ] **2.9** `PedidosGrandes.jsx`

### Presupuesto
- [ ] **2.10** `lib/presupuesto.js` (validación + topes) + test de espejo con el servidor
- [ ] **2.11** `netlify/functions/presupuesto.js` (§4 de design) + `sendPresupuestoEmail()` en `notify.js` + `notifyCrmLead` con `fuente: 'presupuesto_negocio'`
- [ ] **2.12** Test del handler: 200 con mail OK; 502 si el mail falla aunque el CRM ande; 400 con campos inválidos; honeypot; URL de archivo que no es de Cloudinary rechazada; el log no contiene el body
- [ ] **2.13** `/api/presupuesto` en `netlify.toml` **y** `public/_redirects`
  - *Verificación*: `git diff netlify.toml` muestra solo esta línea (el WIP de la 030 queda fuera del commit)
- [ ] **2.14** `services/presupuestoService.js` + `FormularioPresupuesto.jsx` (precarga desde el cotizador, candado con `ref` contra el doble tap, error con WhatsApp precargado)

### WhatsApp y móvil
- [ ] **2.15** `lib/whatsapp.js` (`mensajeWhatsapp(pathname, contexto)`) + test por ruta
- [ ] **2.16** `WhatsAppButton.jsx` usa el mensaje y se eleva con `var(--barra-inferior)`
- [ ] **2.17** `BarraNegocioMovil.jsx`: aparece después del hero, se esconde con el cotizador a la vista, el carrito, el menú o un modal; reserva su alto
- [ ] **2.18** Montar en `/negocio`: cotizador (reemplaza a `NegocioForm` en la página; el archivo queda), suelta vs. pack, pedidos grandes, presupuesto. Interruptor `cotizador.activo`
  - *Verificación*: con `activo: false` la página vuelve a mostrar la Promo Negocio
- [ ] **2.19** Botón **Cotizar** del header → `/negocio#cotizador`

### Analytics y cierre
- [ ] **2.20** `trackCotizadorStart`, `trackCotizadorComplete`, `trackPresupuestoStart`; `generate_lead` con `lead_source: 'presupuesto_negocio'` y `rango_cantidad`; `origen: 'cotizador'` en los eventos de subida; contextos nuevos de `whatsapp_click`
  - *Verificación*: `window.dataLayer` no contiene nombre, mail, teléfono, negocio ni nombre de archivo
- [ ] **2.21** `docs/analytics.md`, `docs/architecture.md` (endpoint), `docs/business-rules.md` (cómo cotiza el cotizador)
- [ ] **2.22** Validar Fase 2 contra `acceptance.md` · commit + push

---

## Fase 3 — B2B completo y Home

- [ ] **3.0** Confirmar que la spec 030 está cerrada y su WIP commiteado; si no, **parar**
- [ ] **3.1** `UsosNegocio.jsx`, `Materiales.jsx` (desde `MATERIALES`; holográfico: packs de 100 en 4 y 6 cm), `PreguntasNegocio.jsx` (solo `publicar: true`, JSON-LD con esas mismas), `GaleriaNegocios.jsx` (no monta sin fotos), `Recurrentes.jsx` (solo con N-4), `trackFaqOpen`
- [ ] **3.2** `/negocio` completa en el orden de RF-NE1
- [ ] **3.3** `/mayorista`: banda de pedidos grandes + presupuesto arriba del armador
- [ ] **3.4** `CaminoTienda.jsx` + `routes/HomeB2B.jsx` en el orden de RF-HO2, cargada con `lazy()`
- [ ] **3.5** `lib/experiments.js`: `home_b2b` con `active: false`; `Home.jsx` elige variante
  - *Verificación*: el chunk principal no crece más de 1 kB gzip (medido con `vite build`)
- [ ] **3.6** QA con `?exp_home_b2b=b2b`: 375 px, 1024 px, 1440 px; popup igual en las dos variantes; WhatsApp y barra móvil no se tapan
- [ ] **3.7** Medir LCP de la variante B2B contra el control (arnés CDP con GPU)
- [ ] **3.8** Validar Fase 3 contra `acceptance.md` · commit + push con el A/B **apagado**
- [ ] **3.9** Con OK de Mariano: `home_b2b.active = true` en un commit propio, anotando la fecha de inicio en `docs/CRO-EXPERIMENTS.md`

---

## Fase 4 — SEO

- [ ] **4.1** `lib/negociosEstatico.js` + `scripts/prerender.mjs` genera `negocio.html` y `mayorista.html` (patrón `.html`, no carpeta) + tests en `prerender.test.js`
  - *Verificación*: `curl -s https://epicalcos.com/negocio | grep -o '<title>[^<]*'` devuelve el título de `/negocio`, no el del Home
- [ ] **4.2** Alias 301 de RF-SEO4 en `netlify.toml` y `_redirects`; test de que ninguno pisa una ruta existente
  - *Verificación*: `curl -sI https://epicalcos.com/para-negocios` → `301` a `/negocio`
- [ ] **4.3** `/calcos-para-packaging`: contenido propio (tamaño por tipo de packaging, superficies, cantidad por pedido) + cotizador + prerender + sitemap
- [ ] **4.4** Links internos: landings de uso y `/personalizados` → `/negocio` para 100+
- [ ] **4.5** Validar datos estructurados (Rich Results Test) y Fase 4 contra `acceptance.md` · commit + push

---

## Fase 5 — Tracking (lectura)

- [ ] **5.1** Dejar escrito en `docs/analytics.md` cómo armar en GA4 los dos embudos y marcar `generate_lead (presupuesto_negocio)` como conversión clave
- [ ] **5.2** Dejar escrito cómo separar la audiencia B2B en Meta
- [ ] **5.3** Verificar en DebugView y en "Probar eventos" de Meta cada evento nuevo

---

## Fase 6 — Optimización

- [ ] **6.1** QA en dispositivos reales (iOS Safari, Android Chrome, navegador de Instagram)
- [ ] **6.2** Lectura del A/B `home_b2b` (métrica principal: facturación por sesión) y decisión con Mariano
- [ ] **6.3** Cargar fotos a medida que lleguen (sin código) y verificar que cada sección se enciende
- [ ] **6.4** Marcar la spec `DONE` con lo que quedó fuera de scope

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| El configurador cotiza varios diseños × 100 como sueltas ($630.000 vs. $158.997) | `lib/precioPersonalizados.js:226` | Lo resuelve la spec 032 (RF-13): el configurador usa la escala con 100+ |
| FAQ con la frase prohibida "archivo perfecto" | `components/FAQ.jsx:75` | Quick win Q-1 |
| FAQ general sin el plazo de 100+ (el mayorista ya dice 3 a 5, que es el correcto) | `components/FAQ.jsx:84` | Se resuelve en la tarea 1.8b |
| FAQ promete beneficios por recompra y ajuste de logos sin confirmar | `components/FAQ.jsx:126,136` | Q-3 tras N-4 y N-5 |
| Dos referencias de ahorro para Negocio (59 % vs. 75 %) | `NegocioForm.jsx:15` | Unificar con la referencia que se elija en P-2 de la 032 |
| Los Términos muestran en producción una nota "[REVISAR] … (CUIL persona humana)" que no cuadra con la factura C | `routes/legal/Terminos.jsx:100-104`, `site.taxIdType` | Texto: actualizar con la condición fiscal real (N-20) |
| El mail al cliente escribe los plazos a mano (2–3 / 5–7 días) | `netlify/functions/lib/notify.js` `customerTimeline()` | Se resuelve en la tarea 1.8b (100+ desde los ids) |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 05/10/2026 | WIP ajeno al arrancar la Fase 1: `docs/analytics.md`, `Reveal.jsx`, `index.css`, `netlify.toml` y `specs/030/requirements.md` (spec 030, otra sesión) | No se tocaron; `analytics.md` se commiteó solo con la sección propia |
| 05/10/2026 | Hero: el segundo CTA es "Hablar por WhatsApp" y no "Ver precios" | Hasta la Fase 2 los precios están en el mismo bloque que "Cotizar": dos botones al mismo lugar |
| 05/10/2026 | "Cotizar" lleva a `/negocio#cotizar` (no `#cotizador`) y "Precios" a `/negocio#precios` | Las dos anclas ya existen sobre el bloque de compra y la Fase 2 las reusa: los links no cambian |
| 05/10/2026 | Nav "Preguntas" → `/#faq` (el FAQ del Home) | El FAQ de negocio es de la Fase 3 |
| 05/10/2026 | `config/negocios.js` sin usos, preguntas ni cantidades del cotizador | Se suman cuando se usan (Fases 2 y 3), para no publicar datos muertos |
| 05/10/2026 | El test 1.2 no revisa "vista previa" en `/personalizados` | El configurador tiene un componente `VistaPrevia` (la calco en pantalla) que no es la muestra: daría falso positivo. Verificado a mano: `/personalizados` no menciona la muestra gratis |
| 05/10/2026 | El mail de 100+ dice el plazo pero no promete la vista previa | Un pedido de 120 calcos de catálogo no tiene diseño propio que previsualizar: prometerla en todo mail de 100+ sería falso |
| 05/10/2026 | Paso 1 de "Cómo funciona" sin "cuantas más pedís, mejor el precio" | Recién es verdad con la escala de la spec 032; hoy el precio es plano desde 100. Lo frena un test |
| 05/10/2026 | Migas de pan ocultas en el celular | Le devuelven al hero los ~50 px que hacen que el CTA termine en 611 px (RF-H7) |
| 05/10/2026 | `NegocioForm`: prop `conFoto` y su título pasa de `h1` a `h2` | La foto ya está en el hero y la página tiene un solo `h1` |
| 05/10/2026 | Arreglo fuera de plan: `/mayorista` mostraba "Promo hasta el null." en la página y en la descripción para Google | Mismas líneas que la tarea de SEO; verificado en producción antes de tocarlo |
| 05/10/2026 | Se agregó un `vite build` a la verificación | Un error de compilación propio en `Checkout.jsx` (variable `items` duplicada) pasó la suite —no hay tests de componentes— y lo atrapó el navegador |
