# Design — Menú principal por tipo de compra (Mayorista / Minorista)

| | |
|---|---|
| **Spec** | `033-menu-principal-mayorista-minorista` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 15/10/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | El nav plano `navLinks` de `config/site.js` (spec 031, D-6) que dibuja `components/Header.jsx` dos veces: `<nav>` desde `lg` y el menú hamburguesa debajo de `lg`. No hay submenús en ningún lado del sitio. `components/CategoryMenu.jsx` es un desplegable de categorías **dentro** de páginas (PackBuilder, Categoría), no sirve para el header |
| ¿Quién importa `navLinks`? | `Header.jsx`, el test `config/negocios.test.js` (AC-N1 de la 031) y —encontrado al implementar, ver H-5— `lib/personalizadosEstatico.js` |
| ¿El tornasolado ya existe? | **Sí, entero.** El configurador de /personalizados vende el "pack holográfico" como `negocio:vinilo-holografico:{tamano}:{ts}` (cobrado a `NEGOCIO_PRICE`) + `fixed:material-holografico:{ts}` ($20.000). El servidor valida las dos líneas y su emparejamiento (`recargo_material_faltante`); `CartContext.removeItem` saca el recargo junto con la línea `negocio:`; el carrito no deja editar ni quitar el recargo solo. 6 cm está en `HOLOGRAFICO_TAMANOS` |
| ¿Toca el camino de precios? | **No se cambia ningún precio ni regla.** /negocio va a emitir un id (`negocio:vinilo-holografico:6cm:{ts}`) que el servidor ya acepta. Se agrega un test de paridad para el caso nuevo (§7) |
| ¿Hay comentarios que expliquen por qué está así? | Ver H-1 a H-4 |
| Categorías "destacadas" | No hay ranking de ventas por categoría (`lib/searchCatalog.js` lo dice). El Home usa `FEATURED_SLUGS` (10, curadas a mano) dentro de `routes/Home.jsx` |
| ¿`data/categories.js` pesa en el header? | 8 KB y ya está en el bundle principal (lo importa `Home.jsx`, que es eager). Importarlo desde el header no suma descarga |

### Hallazgos que condicionan el diseño

**H-1 — `meta.material` en una línea `negocio:` cambia cómo se arma la nota del
pedido.** `lib/resumenPedido.js` decide con `it.meta?.material` si una línea de
Negocio es "pack del configurador" (`groupPackItems`: imprime material, tamaño,
**corte** y diseños, e ignora `business`) o "Promo Negocio del formulario"
(imprime `Negocio "X": 100u 6cm (logo…)`). Si /negocio pusiera
`meta.material`, el pedido le llegaría a Mariano como
`Vinilo Holográfico (6 cm, corte undefined, x100)` **sin el nombre del
negocio**. Por eso la línea tornasolada de /negocio lleva `meta.materialLabel`
y **no** `meta.material`, y la rama del formulario aprende a imprimirlo (RF-T6).

**H-2 — El recargo se arma hoy en `components/personalizados/BotonCta.jsx`
(`agregarRecargoHolografico`, no exportada).** Importarla desde /negocio
metería en el chunk de /negocio todo el configurador (`BotonCta` importa el
borrador, el cálculo de tandas, etc.). Se agrega un armador puro de las líneas
de Negocio en `lib/` (§2) y `BotonCta` **no se toca** (regla 8): unificar los
dos queda como propuesta aparte.

**H-3 — El header tiene `backdrop-filter`.** Eso vuelve al `<header>` el bloque
contenedor de sus descendientes `position: fixed` (comentario en
`Header.jsx`: así se rompió el buscador). Los paneles de los submenús van con
`position: absolute` relativos a su `<li>`, que no tiene ese problema, y con
fondo casi opaco propio (un `backdrop-filter` anidado dentro de otro no
desenfoca lo de atrás de forma confiable).

**H-4 — El comentario de `lg` en el `<nav>`** ("con 7 links el nav no entra en
768 px") sigue valiendo: el menú nuevo tiene 5 entradas pero 3 con flecha. Se
mantiene el corte en `lg` y se verifica a 1024 px (RNF-2).

### Hallazgos de la implementación (16/10/2026)

**H-5 — `navLinks` tenía un tercer consumidor.** `lib/personalizadosEstatico.js`
arma con él los links internos del HTML prerenderizado de /personalizados (lo
corre `scripts/prerender.mjs` en Node). Se agregó `navMenuPlano` (todos los
links del menú en una lista, sin categorías) y ese módulo lo usa en su lugar.

**H-6 — A 1024 px el logo se aplastaba.** Menú + Buscar + Cotizar + Carrito
sumaban 1.003 px en 984 de lugar, y el flex le sacaba la diferencia al logo
(quedaba de 25 px de ancho). Arreglo: el logo con `shrink-0` y los ítems del
menú con 0.75rem de padding entre lg y xl (0.9rem desde xl).

**H-7 — Lo que flota abajo pintaba encima del menú del celular.** WhatsApp, el
acceso "🎁 10% OFF" y la barra fija de /personalizados son `fixed` z-40,
después del header en el DOM: con Minorista abierto tapaban opciones y el
Cotizar del final. Se esconden con `[body:has(#menu-movil)_&]:hidden`
(`OCULTO_CON_MENU_MOVIL` en `MenuPrincipal.jsx`); un navegador sin `:has()` los
muestra como antes. La barra de la ficha de producto es z-30 y el menú ya la
tapaba.

**H-8 — El recargo holográfico se veía con imagen rota en el carrito.** La
línea `fixed:material-holografico:…` no tenía `image` desde el 22/9/2026
(también la del configurador). Se agregó `IMAGEN_HOLOGRAFICO` (un degradé, en
`config/personalizados.js`) y la usan /negocio y el configurador. Los carritos
guardados antes siguen sin imagen hasta vaciarse.

---

## 1. Arquitectura propuesta

```
config/site.js                       components/Header.jsx
┌──────────────────────────┐         ┌──────────────────────────────────────┐
│ NAV_CATEGORIAS (8 slugs) │         │ <nav aria-label="Principal">  (≥lg)  │
│ navMenu = [              │ ──────► │   Home · [Mayorista▾] · [Minorista▾] │
│   {Home}, {grupo…},      │         │   · [Otros productos▾] · Contacto    │
│   {Contacto}             │         │   └─ <MenuGrupo> (panel absolute)    │
│ ]  (filtrado por         │         │                                      │
│     HIDDEN_SECTIONS)     │         │ menú hamburguesa (<lg)               │
└──────────────────────────┘         │   Home / acordeones / Contacto /     │
          ▲                          │   Cotizar                            │
data/categories.js ── getCategory ──►└──────────────────────────────────────┘
                                                  │ trackMenu()
                                                  ▼
                                          lib/analytics.js → dataLayer/GA4

NegocioForm.jsx ── lineasNegocio({ business, archivos, tornasolado, ts })
                     (lib/lineasNegocio.js, puro y testeable)
        │  sin tornasolado → [negocio:{ts}]                      (igual que hoy)
        │  con tornasolado → [negocio:vinilo-holografico:6cm:{ts},
        │                     fixed:material-holografico:{ts}]  (ya validadas)
        ▼
   addNegocio / addFixed (CartContext, sin cambios)
```

**Decisiones y alternativas descartadas**

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D-1 | Estructura del menú como **datos** en `config/site.js` (`navMenu`), el header solo la dibuja | Escribir los grupos a mano en el JSX | Igual que hoy: el menú se cambia sin tocar el componente, y `HIDDEN_SECTIONS` lo filtra en un solo lugar |
| D-2 | Las 8 destacadas como **slugs** (`NAV_CATEGORIAS`) en `site.js`; nombre y emoji salen de `data/categories.js` en el header | Importar `FEATURED_SLUGS` de `Home.jsx` / moverlo a config | Importar `Home.jsx` desde el header sería absurdo; moverlo toca el Home (fuera de scope). `site.js` no importa el catálogo para no sumarle dependencias a un módulo con 40 importadores |
| D-3 | Patrón **disclosure** (botón + panel), no `role="menu"` | ARIA menu con flechas | `role="menu"` es para menús de aplicación; para navegación de un sitio, el patrón recomendado es disclosure. Menos código y lo que esperan los lectores de pantalla |
| D-4 | Hover solo con mouse (`pointerType === 'mouse'`), con 150 ms de gracia al salir | Hover para todos / solo click | Solo click es raro en ecommerce de escritorio; hover para todos rompe en tablets táctiles (el tap dispara `mouseenter` + `click` y abre-cierra) |
| D-5 | "Home" literal | "Inicio" | Es lo que pidió Mariano; queda como pregunta abierta en requirements §12 |
| D-6 | La línea tornasolada lleva `meta.materialLabel`, **no** `meta.material` | Reusar `meta.material` | H-1: la nota del pedido perdería el nombre del negocio |
| D-7 | Armador puro `lib/lineasNegocio.js` | Lógica dentro de `NegocioForm.jsx` | Testeable con Vitest sin montar React (no hay testing-library en el repo, regla 10), y el test de paridad lo corre contra `validateAndPriceOrder` del servidor |
| D-8 | `menu_nav` solo a GA4 | También a Meta | No es una señal de compra; ensuciaría las audiencias |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/site.js` | `navLinks` → `navMenu` (grupos) + `NAV_CATEGORIAS`. Se actualiza el comentario de la 031 diciendo qué cambió y por qué | 🟡 módulo compartido; solo cambia el bloque de nav. **Envíos, umbrales y `HIDDEN_SECTIONS` no se tocan** |
| `frontend/src/components/Header.jsx` | Dibuja `MenuEscritorio` y `MenuMovil`; el menú del celular cierra al cambiar de ruta y scrollea por dentro (alto medido); logo con `shrink-0` (H-6) | 🟡 está en todas las páginas |
| `frontend/src/lib/personalizadosEstatico.js` | Usa `navMenuPlano` en lugar de `navLinks` (H-5) | 🟢 |
| `frontend/src/components/WhatsAppButton.jsx`, `popup/AccesoBeneficio.jsx`, `personalizados/BarraFijaMovil.jsx` | `OCULTO_CON_MENU_MOVIL` (H-7) | 🟢 una clase |
| `frontend/src/components/personalizados/BotonCta.jsx` | El recargo lleva `image: IMAGEN_HOLOGRAFICO` (H-8) | 🟢 |
| `frontend/src/config/personalizados.js` | `IMAGEN_HOLOGRAFICO` junto a `RECARGO_HOLOGRAFICO` (H-8). **Precios sin cambios** | 🟢 |
| `frontend/src/components/NegocioForm.jsx` | Opción "tornasolado" + total del resumen; usa `lineasNegocio()` para armar las líneas | 🟡 camino de compra de /negocio |
| `frontend/src/lib/resumenPedido.js` | La rama del Negocio del formulario imprime `meta.materialLabel` si está | 🟢 |
| `frontend/src/lib/analytics.js` | `trackMenu({ accion, grupo, destino, vista })` | 🟢 una función nueva, mismo patrón que `trackCotizar` |
| `frontend/src/config/negocios.test.js` | El test de AC-N1 (nav de la 031) pasa a verificar el menú nuevo; se borra el de "Precios" del nav (el ancla `#precios` y `COTIZAR_FORM_HREF` se siguen verificando) | 🟢 |
| ~~`frontend/src/lib/resumenPedido.test.js`~~ | La nota del Negocio tornasolado se prueba en `lineasNegocio.test.js`, armando las líneas con la misma función que usa el formulario | — |
| `docs/analytics.md` | Sección `menu_nav` | 🟢 (⚠️ tiene WIP ajeno de la spec 030 sin commitear: ver tasks 6.2) |
| `specs/031-calcos-para-negocios/requirements.md` | Nota en RF-N1: reemplazado por la spec 033 | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/components/MenuPrincipal.jsx` | `MenuEscritorio` (paneles, hover solo con mouse, Escape, click afuera, Tab) y `MenuMovil` (acordeones); `grupoActivo()`; `OCULTO_CON_MENU_MOVIL` |
| `frontend/src/lib/lineasNegocio.js` | `lineasNegocio({ business, archivos, tornasolado, ts, imagen })` → `{ linea, recargo }` (recargo `null` sin tornasolado) |
| `frontend/src/lib/lineasNegocio.test.js` | Forma de las líneas + paridad con `validateAndPriceOrder` del servidor (MP y transferencia) |
| `frontend/src/config/navMenu.test.js` | Orden y contenido del menú, filtro por `HIDDEN_SECTIONS`, que las 8 categorías existan |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **no** | — |
| `frontend/src/config/site.js` | sí, solo el bloque de nav | ~40 módulos; `navLinks` solo `Header.jsx` y `negocios.test.js`. Ninguna función de `netlify/` lo importa (los espejos de envío, contacto y banco están copiados a mano y no se tocan) |
| `frontend/src/context/CartContext.jsx` | **no** — se usan `addNegocio` y `addFixed` como están | — |
| `netlify/functions/lib/pricing.js` | **no** | — |
| `frontend/src/lib/analytics.js` | sí, una función nueva | todo el sitio; no cambia ninguna existente |

```bash
grep -rn "navLinks" frontend/src netlify/
grep -rn "meta?.material\|meta\.material" frontend/src netlify/
grep -rn "negocio:vinilo-holografico\|material-holografico" frontend/src netlify/
```

---

## 3. Datos

### `config/site.js`

```js
/** Categorías del grupo Minorista (RF-M7). Las 8 primeras de las destacadas del Home. */
export const NAV_CATEGORIAS = [
  'argentina', 'anime', 'disney', 'escudos-futbol',
  'harry-potter', 'marvel', 'memes', 'los-simpsons'
];

export const navMenu = menuVisible([
  { to: '/', label: 'Home' },
  {
    id: 'mayorista', label: 'Mayorista',
    items: [
      { to: '/mayorista', label: 'Mayorista +100 calcos', detalle: 'Elegí 100 diseños del catálogo o subí los tuyos' },
      { to: '/negocio', label: 'Negocio', detalle: '100 calcos con tu logo, también tornasoladas' }
    ]
  },
  {
    id: 'minorista', label: 'Minorista',
    items: [
      { to: '/personalizados', label: 'Personalizados', detalle: 'Con tu diseño, desde 1 calco' },
      { to: '/categorias', label: 'Ver todas las categorías' }
    ],
    categorias: NAV_CATEGORIAS
  },
  {
    id: 'otros', label: 'Otros productos',
    items: [
      { to: '/polaroid', label: 'Fotos Polaroid' },
      { to: '/tatuajes', label: 'Tatuajes temporales' }
    ]
  },
  { to: '/contacto', label: 'Contacto' }
]);
```

`menuVisible()` aplica `visibles()` (la de hoy) a cada `items` y descarta el
grupo sin `items` (RF-M9). Los textos de `detalle` son propuesta: se ajustan en
la revisión.

### Header — panel de Minorista (compu)

```
┌─────────────────────────────────────────────────────┐
│ ✏️ Personalizados                │ 🇦🇷 Argentina  🌸 Anime   │
│ Con tu diseño, desde 1 calco     │ 🏰 Disney     🛡️ Escudos │
│                                  │ ⚡ Harry P.   🦸 Marvel   │
│                                  │ 😂 Memes      🍩 Simpsons │
│                                  │ Ver todas las categorías →│
└─────────────────────────────────────────────────────┘
```

Categorías: `NAV_CATEGORIAS.map(getCategory).filter(Boolean)` → link a
`/categoria/{slug}`.

### Estado del header

| Estado | Qué guarda |
|---|---|
| `abierto` (compu) | `id` del grupo abierto o `null` (RF-C3) |
| `abiertoPor` | `'mouse'` / `'click'`: si lo abrió el hover, el click en el título no lo cierra (RF-C2) |
| `grupoMovil` | `id` del acordeón abierto en el celular; al abrir el menú arranca con el grupo de la ruta actual (RF-C7) |
| `open` (existente) | menú del celular |

Cambio de `pathname` → cierra todo (RF-C4 / edge case). Escape → cierra y
devuelve el foco al botón del grupo. Click afuera: `pointerdown` en `document`
fuera del `<nav>` (mismo patrón que `CategoryMenu.jsx`). Los paneles abiertos
y el menú del celular llevan `data-popup-bloqueo` (RF-C9).

### Líneas de Negocio — `lib/lineasNegocio.js`

```js
// sin tornasolado (idéntica a la de hoy)
[{ id: `negocio:${ts}`, name: `Negocio · ${business} · 100u 6 cm`, …, basePrice: NEGOCIO.price,
   meta: { business, qty, size, archivos } }]

// con tornasolado
[
  { id: `negocio:${MATERIAL_HOLOGRAFICO_ID}:${NEGOCIO.size}:${ts}`,
    name: `Negocio · ${business} · 100u 6 cm · Holográfico`, …, basePrice: NEGOCIO.price,
    meta: { business, qty, size, archivos, materialLabel: 'Vinilo Holográfico' } },   // SIN meta.material (H-1)
  { recargo: true, id: `${RECARGO_HOLOGRAFICO.id}:${ts}`, name: 'Recargo · Vinilo Holográfico',
    categoryLabel: 'Negocio', price: RECARGO_HOLOGRAFICO.precio }                     // → addFixed → fixed:material-holografico:{ts}
]
```

Implementado como `{ linea, recargo }` en vez de un array (el recargo va a
`addFixed`, no a `addNegocio`), y el recargo lleva `image: IMAGEN_HOLOGRAFICO`
(H-8). `NegocioForm` llama `addNegocio(linea)` y, si hay, `addFixed(recargo, 1)`. El `ts` es el mismo en las dos: es lo que las liga (servidor y
`removeItem`). `materialLabel` sale de `getMaterial(MATERIAL_HOLOGRAFICO_ID).label`,
no escrito a mano.

### Persistencia

| Dónde | Qué | Ref. |
|---|---|---|
| `localStorage` `epicalcos.cart.v2` | Las dos líneas tornasoladas, con formas que **ya existen** | `docs/database.md` §3 |
| Blobs | Sin cambios | — |

### ⚠️ Compatibilidad

- [x] No cambia la forma de ninguna línea existente: `negocio:{ts}` sigue igual;
      `negocio:vinilo-holografico:{tam}:{ts}` y `fixed:material-holografico:{ts}`
      ya existen desde el 26/9/2026.
- [x] Pedidos en Blobs: sin cambios.

---

## 4. APIs

Ningún endpoint cambia. `create-preference` y `create-order-transfer` reciben
las dos líneas que ya saben validar.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | — | no |
| Notion / Resend | La nota del pedido suma el material (texto) | no |
| GA4 | Evento `menu_nav` | no (try/catch) |

---

## 6. Seguridad

Sin secretos ni endpoints nuevos. `destino` del evento es una ruta interna,
sin PII. El precio del tornasolado lo pone el servidor, no el cliente.

---

## 7. Manejo de errores

| Situación | Qué pasa |
|---|---|
| Falla `trackMenu` | `pushDataLayer` ya va en `try/catch`; la navegación sigue |
| Slug de `NAV_CATEGORIAS` que no existe | `getCategory` devuelve `undefined` → se filtra; además lo frena el test |
| El servidor rechaza el pedido tornasolado | No debería: lo cubre el test de paridad. Si pasara, sale el error de siempre del checkout |

---

## 8. Testing

| Test | Qué verifica |
|---|---|
| `config/navMenu.test.js` | Orden Home · Mayorista · Minorista · Otros productos · Contacto; opciones de cada grupo; rutas que existen en `App.jsx`; las 8 categorías existen en `data/categories.js`; ningún texto dice "más vendid"/"popular"; con una ruta en `HIDDEN_SECTIONS` sale del menú y un grupo vacío desaparece (función de filtro probada aparte) |
| `lib/lineasNegocio.test.js` | Sin tornasolado = la línea de hoy; con tornasolado = 2 líneas ligadas por el mismo `ts`, sin `meta.material`; **paridad**: `validateAndPriceOrder` del servidor acepta las dos y cobra `NEGOCIO.price + RECARGO_HOLOGRAFICO.precio` (= `ESCALA_VOLUMEN.holografico[100]`), con MP y con transferencia; sin el recargo → `recargo_material_faltante` |
| `lib/lineasNegocio.test.js` (nota) | La nota dice `Negocio "X": 100u 6cm Vinilo Holográfico (logo…)`; sin tornasolado, igual que antes |
| `config/negocios.test.js` | Se actualiza el caso del nav de la 031 |
| `npm test` | Toda la suite en verde |
| Navegador | 375, 768, 1024, 1440 px; teclado; tap; hover; agregar Negocio tornasolado y llegar al checkout |

---

## 9. Migración y rollback

Sin migración de datos. Rollback = revert del commit: las líneas tornasoladas
que hayan quedado en carritos guardados las sigue aceptando el servidor (son
las del configurador).
