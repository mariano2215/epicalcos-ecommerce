# Design — Cotizador B2B, mayorista por escala y Home B2B a prueba

| | |
|---|---|
| **Spec** | `034-b2b-cotizador-y-mayorista` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 17/10/2026 |
| **Base** | `main` en `548ae092`, rama `feat/034-b2b-conversion` (worktree propio: la carpeta principal tiene WIP de la spec 030 sin commitear y no se toca) |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe? | La escala (`precioVolumen()` en los dos lados, rama `volumen` en `lineBase()`, `precioVigente` y `plazoProduccion` la conocen) **sí**; ningún componente emite `volumen:` |
| ¿Cómo entra una línea de escala al carrito? | `addNegocio()` (tipo `negocio`, precio fijo, sin cupones, con transferencia) y `meta.qty` hace que el carrito diga "250 calcos". `CartContext` no cambia |
| ¿El resumen del pedido la entiende? | **No.** `groupPackItems()` agarra toda línea `negocio` con `meta.material` y la imprime como pack del configurador (`undefined (undefined, corte undefined…)`). Hay que rotularla aparte |
| ¿El override `?exp_x=y` sirve con el experimento apagado? | **No**: el kill switch se chequea antes (documentado así a propósito para `hero_cta`) |
| ¿Quién llama a `useExperiment`? | Solo `SizeGuide` (`guia_tamano`) y `PackCard` (`ahorro_pack`), los dos activos |
| ¿El presupuesto necesita endpoint? | `/contacto?motivo=cotizar` ya manda mail + CRM, falla cerrado y precarga una consulta (E-1) |
| ¿Prerender? | `lib/prerender.js` es genérico; `scripts/prerender.mjs` solo genera `/personalizados` |
| ¿UTM / `fbclid`? | Nada los guarda. `paymentService.metaTracking()` arma `fbc` solo si la URL **del checkout** trae `fbclid` |

---

## 1. Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D-1 | **Presupuesto = formulario de `/contacto` precargado** con la configuración (sessionStorage, `try/catch`) | Endpoint `/api/presupuesto` propio (031 D-9) | Mismo resultado para Mariano (mail + CRM, falla cerrado) sin función nueva, sin plantilla de mail nueva, sin tocar `netlify.toml` por `/api` (la 030 tiene WIP ahí) y sin depender de que el CRM acepte campos nuevos. El endpoint propio queda para cuando haga falta adjuntar archivo al presupuesto |
| D-2 | El cotizador ofrece los **cuatro escalones** (100 · 250 · 500 · 1.000) + "Más de 1.000" | Cantidad libre | Son los precios que aprobó Mariano; una cantidad libre en `/negocio` obliga a explicar "te llevás 250" en el primer contacto. El armador de `/mayorista` sí acepta cantidad libre (el cliente cuenta diseños) |
| D-3 | **`/negocio` monta el cotizador en lugar de `NegocioForm`**, detrás de `COTIZADOR.activo` | Los dos a la vez | Dos formas de comprar lo mismo en la misma página. 100 · 6 cm · vinilo blanco = $52.999 = Promo Negocio; holográfico = Negocio + tornasolado (verificado en el test). `NegocioForm` queda en el repo para el interruptor |
| D-4 | `PackBuilder` gana un modo **`escala`** (prop) que solo usa `/mayorista` | Componente nuevo | El armador ya resuelve catálogo + diseños propios + subida; lo que cambia es el precio y el tope. `/armar-pack` no pasa la prop y queda igual |
| D-5 | Con la escala, el armador **no deja agregar** una cantidad que cuesta lo mismo que el escalón siguiente: ofrece completarla | Agregar 240 y cobrar 250 | El servidor rechaza un id de 240 a precio de 250 (`cantidadLlevada`), y 10 calcos "de regalo" sin diseño asignado son una duda para el taller |
| D-6 | Experimento `home_b2b` con **`previsualizable: true`**: apagado, el override por URL muestra la variante en esa carga sin guardarla | Prenderlo con 0 % de reparto | El A/B propio no tiene pesos; y "prendido" registraría exposiciones. El resto de los experimentos conserva el kill switch duro |
| D-7 | `useExperiment` no manda `experiment_view` si el experimento está apagado | Dejarlo | Una vista previa no es una exposición. Hoy no cambia nada: los dos que llaman al hook están activos |
| D-8 | `HomeB2B` va en un chunk `lazy()` | En el chunk del Home | 031 D-8: el Home viaja en todas las rutas |
| D-9 | "Cotizar" suma **"Ver el precio ahora"** como primera salida | Dejar E-1 como está | Con un cotizador real, mandar a todos a WhatsApp o a un formulario es esconder el precio. Se mantienen las otras dos (E-1) |
| D-10 | Atribución: el `fbclid` (y los UTM) de la URL de llegada se guardan en `sessionStorage`; `metaTracking()` lo usa si no hay cookie `_fbc`, con el instante de llegada | Mandar los UTM al servidor | Mandarlos cambia `create-preference`, el pedido guardado y el CRM: es camino de pagos. El `fbc` ya viaja en `tracking` |
| D-11 | Usos por **rubro** (gastronomía, tiendas, ecommerce, gimnasios, eventos, emprendimientos), con ícono y sin foto | Usos por objeto (031 RF-U1) | Lo pide el pedido nuevo y conecta con el anuncio por rubro. Sin fotos reales (N-6) no se pone ninguna |

---

## 2. Componentes

### Nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/cotizadorNegocio.js` | `cotizarPedidoNegocio()`, `lineaVolumen()`, `consultaPresupuesto()`, `guardarConsultaCotizar()` / `leerConsultaCotizar()` — puras, sin React |
| `frontend/src/lib/cotizadorNegocio.test.js` | Casos + **paridad contra `validateAndPriceOrder()`** (tamaño × material × escalón × MP/transferencia) + Negocio y Negocio tornasolado cuestan lo mismo + resumen |
| `frontend/src/components/negocios/Cotizador.jsx` | Pasos, precio, datos, subida, carrito, salidas |
| `frontend/src/components/negocios/GrupoOpciones.jsx` | Radio-group accesible (fieldset/legend, 44 px, foco visible) |
| `frontend/src/components/negocios/EscalaVolumen.jsx` | Tabla de escalones (total, por calco, transferencia, etiqueta) |
| `frontend/src/components/negocios/PedidosGrandes.jsx` | Banda +1.000: presupuesto + WhatsApp |
| `frontend/src/components/negocios/UsosNegocio.jsx` | 6 rubros |
| `frontend/src/components/negocios/Materiales.jsx` | Card por material (de `MATERIALES` + copy B2B) |
| `frontend/src/components/negocios/PreguntasNegocio.jsx` | FAQ B2B; JSON-LD `FAQPage` con las mismas preguntas |
| `frontend/src/components/negocios/CaminoTienda.jsx` | Camino B2C en el Home B2B (`id="categorias-destacadas"` para el popup) |
| `frontend/src/routes/HomeB2B.jsx` | Variante B2B del Home |
| `frontend/src/lib/negociosEstatico.js` + test | HTML y JSON-LD estáticos de `/negocio` y `/mayorista` para el prerender |
| `frontend/src/lib/atribucion.js` + test | Captura y lectura de `fbclid`/UTM |
| `frontend/src/lib/whatsapp.test.js` | Mensaje por ruta |

### Modificados

| Archivo | Cambio | Riesgo |
|---|---|---|
| `config/negocios.js` | Copy de todo lo nuevo; nada escrito a mano | 🟢 (lo cubre `negocios.test.js`) |
| `routes/Negocio.jsx` | Orden RF-NE1 con el cotizador | 🟡 |
| `routes/Mayorista.jsx` | Encabezado, condiciones, escala, armador en modo escala, pedidos grandes, FAQ | 🟡 |
| `components/PackBuilder.jsx` | Modo `escala` | 🟡 (lo usa `/armar-pack` sin la prop) |
| `components/BotonCotizar.jsx` | Tercera salida | 🟢 |
| `components/WhatsAppButton.jsx` + `lib/whatsapp.js` | Mensaje por ruta | 🟢 |
| `components/contacto/FormularioContacto.jsx` | Lee la consulta del cotizador; `origen` en `generate_lead` | 🟢 |
| `components/negocios/HeroNegocio.jsx`, `CtaFinalNegocio.jsx` | Copy por prop; CTA al cotizador | 🟢 |
| `lib/resumenPedido.js` | Rama `volumen:` (y fuera de `groupPackItems`) | 🟡 (mail y CRM; con test) |
| `lib/experiments.js` | `home_b2b`, `previsualizable`, D-7 | 🟡 (9 importadores; con test) |
| `routes/Home.jsx` | Elige variante | 🟡 |
| `lib/analytics.js` | `trackCotizadorStart`, `trackCotizadorComplete`, `trackFaqOpen` | 🟡 (solo se agregan funciones) |
| `services/paymentService.js` | `fbc` desde `fbclid` guardado | 🟡 (checkout; en `try/catch`) |
| `main.jsx` | `capturarAtribucion()` al arrancar | 🟢 |
| `components/FAQ.jsx` | RF-16…19 | 🟢 |
| `scripts/prerender.mjs` | `/negocio` y `/mayorista` | 🟢 (nunca corta el build) |
| `netlify.toml` + `public/_redirects` | Alias 301 | 🟡 (la 030 tiene WIP en `netlify.toml`: conflicto de merge posible, en otra sección) |
| `docs/analytics.md`, `docs/business-rules.md` | Eventos; escala (032 tarea 1.7 pendiente) | 🟢 |

### ⚠️ Módulos compartidos (regla 9)

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `config/pricing.js` | **No** (se lee `precioVolumen`, `ESCALA_*`, `TRANSFER_*`) | 47 archivos |
| `netlify/functions/lib/pricing.js` | **No** | `create-preference`, `create-order-transfer`, tests |
| `context/CartContext.jsx` | **No** | 29 archivos |
| `config/site.js` | **No** | 40 archivos |
| `lib/analytics.js` | Sí, solo funciones nuevas | 43 archivos |
| `lib/experiments.js` | Sí: un experimento nuevo + D-6/D-7 | `SizeGuide`, `PackCard`, `WelcomePopup` (`getVariant`, que no cambia para experimentos sin `previsualizable`) |
| `components/personalizados/SubidaArchivo.jsx` | **No** (se usa con sus props) | `NegocioForm`, `PackBuilder`, `FixedProductPage`, `Configurador` |

---

## 3. Datos

### 3.1 Cotizador

```js
cotizarPedidoNegocio({ cantidad, tamano, material, disenos })
// cantidad: 100 | 250 | 500 | 1000 | 'mas'
→ { estado: 'precio', total, cantidadLlevada, escalon, unitario, pct,
    totalTransferencia, unitarioTransferencia }
| { estado: 'presupuesto', motivo: 'mas_de_1000' | 'sin_precio_online' }
```
`totalTransferencia = round(total × (1 − TRANSFER_DISCOUNT))` — la línea es
`quantity 1`, así que es el mismo redondeo que hace el servidor.

### 3.2 La línea

```js
lineaVolumen({ tamano, material, cantidad, total, disenos, archivos, razonSocial, cuit,
               items, customCount, origen, imagen, ts })
→ { id: `volumen:${tamano}:${material}:${cantidad}:${ts}`,
    name: `Calcos para negocio · ${cantidad} u · ${tamanoLabel} · ${materialLabel}`,
    categoryLabel: 'Negocio' | 'Pack Mayorista', image, size: tamano,
    basePrice: total, quantity: 1,
    meta: { qty: cantidad, escala: { tamano, tamanoLabel, material, materialLabel },
            disenos, indicaciones, archivos, razonSocial, cuit, items, customCount, origen } }
```
- **Sin `meta.material`** a propósito (lo leería `groupPackItems`); igual,
  `resumenPedido` excluye los ids `volumen:` de los packs del configurador.
- `name` nunca lleva el nombre de un archivo ni la razón social (va a GA4 como
  `item_name`).

### 3.3 Nota del pedido (mail / CRM)

```
Escala 250u 6 cm Vinilo Blanco | Negocio "Bar La Esquina" (CUIT 20-…) | 3 diseños, reparto a coordinar por WhatsApp | diseños (3): https://res.cloudinary.com/…
Escala 500u 4 cm Vinilo Blanco (armado en /mayorista) → Anime #12 x40, … + 20 diseño(s) propio(s) | archivos (2): …
```

### 3.4 Consulta precargada (D-1)

`consultaPresupuesto({ cantidad, tamano, material, disenos })` arma el texto
("Hola, quiero cotizar calcos para mi negocio.\nCantidad: más de 1.000\nTamaño: 6 cm\n…\nEmpresa / razón social: ") y
`guardarConsultaCotizar()` lo deja en `sessionStorage`
(`epicalcos.consultaCotizar`). `FormularioContacto` lo usa si llega con
`?motivo=cotizar`, y si no, cae a `CONSULTA_COTIZAR` como hoy. Nada de esto va
en la URL (no tiene PII, pero tampoco tiene por qué).

### 3.5 Atribución

`sessionStorage['epicalcos.atribucion'] = { fbclid, fbclidTs, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid }`.
Se escribe al arrancar si la URL trae alguno (la última llegada con
parámetros gana: es la que trajo la visita). `metaTracking()` arma
`fb.1.{fbclidTs}.{fbclid}` solo si no hay cookie `_fbc` ni `fbclid` en la URL
actual.

---

## 4. APIs

Ninguna nueva. `create-preference` y `create-order-transfer` reciben líneas
`volumen:` que ya validan; `tracking.fbc` ya existía.

---

## 5. Seguridad

- Ningún secreto nuevo; la subida sigue siendo unsigned con el preset de
  Negocio (`VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO`, con caída al default).
- Analytics sin PII (RNF-7): `cotizador_*` llevan solo la configuración.
- Razón social y CUIT viajan en `meta` → `comments` → mail/CRM, igual que hoy
  el nombre del negocio.
- `sessionStorage` en `try/catch`; nunca `localStorage` para estos datos.

---

## 6. Manejo de errores

| Falla | Qué ve el cliente |
|---|---|
| Cloudinary no sube | "No se pudo subir — mandalo por WhatsApp" (de `SubidaArchivo`) y puede agregar igual |
| Escala cambia con la página abierta | Checkout: "recargá la página" (flujo de siempre) |
| Storage bloqueado | El formulario arranca con la consulta genérica; sin `fbclid` recordado |
| Chunk de `HomeB2B` no baja | Error de carga de ruta como cualquier `lazy()`; con el experimento apagado no le pasa a nadie |

---

## 7. Migración y rollback

| Pieza | Cómo se apaga |
|---|---|
| Cotizador en `/negocio` | `COTIZADOR.activo = false` en `config/negocios.js` → vuelve `NegocioForm` |
| Escala en `/mayorista` | Revert del commit (o sacar la prop `escala`) |
| Home B2B | Ya apagado; para prenderlo, `home_b2b.active = true` en un commit propio |
| Alias 301 | Borrar las líneas de los dos archivos |
| FAQ | Revert |

Carritos guardados: ninguna línea cambia de forma. Las viejas se siguen
cobrando con sus reglas.

---

## 8. Tests

| Test | Qué verifica |
|---|---|
| `cotizadorNegocio.test.js` | Paridad de cada configuración con el servidor (MP y transferencia); Negocio y Negocio tornasolado = mismo total; `mas` → presupuesto; 9 cm → presupuesto; resumen y consulta |
| `resumenPedido.test.js` | Rama `volumen:` del cotizador y del armador; ninguna línea de escala cae en `groupPackItems` |
| `experiments.test.js` | `home_b2b` apagado → control; con `?exp_home_b2b=b2b` → `b2b` sin guardar; otro experimento apagado sigue ignorando el override |
| `whatsapp.test.js` | Mensaje por ruta |
| `atribucion.test.js` | Captura, lectura, storage roto |
| `negociosEstatico.test.js` | HTML sin JS con H1, precio y preguntas; JSON-LD válido; nada escrito a mano |
| `negocios.test.js` | Las frases prohibidas también en los componentes nuevos |
| `redirects.test.js` | Alias en los dos archivos (existente) |
| PackBuilder | Su lógica de escala vive en `cotizadorNegocio.js` (`lineaVolumen`) y se prueba ahí: el componente no tiene tests de render (la suite no renderiza React) |
