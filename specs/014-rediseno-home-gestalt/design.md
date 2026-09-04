# Design — Rediseño de la Home (Gestalt, jerarquía y conversión)

| | |
|---|---|
| **Spec** | `014-rediseno-home-gestalt` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 04/09/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, mucho.** `IntentSelector` (§9 del brief) ya está. `FeaturedStickers` ("Los más vendidos") ya está. Categorías destacadas con CTA a las 61 ya está. `HowToBuy`, `FAQ`, `Testimonials`, `MarcasConfiaron` ya están. El autocomplete con miniaturas ya está (`suggest()` en `lib/searchCatalog.js`). **La promoción contextual en el carrito (§16 del brief) ya está implementada y aceptada en la spec 013** (`BulkProgress` + `FreeShippingProgress`): no se toca. |
| ¿Qué archivos están involucrados? | `routes/Home.jsx`, `components/{Hero,Header,AnnouncementBar,IntentSelector,FeaturedStickers,Testimonials,HowToBuy,FAQ,TrustBadges,CategoryCard,StickerCard}.jsx`, `config/site.js` (sólo `announcements`), `lib/analytics.js`, `styles/index.css`, `data/`. |
| ¿Hay tests que lo cubran hoy? | `searchCatalog.test.js`, `sugerencias.test.js`, `seo.test.js`, `catalogStats.test.js`. Ninguno cubre la Home (no hay jsdom: vitest corre en `node`, sin testing-library). Los tests nuevos tienen que ser **de lógica pura**. |
| ¿Toca el camino de precios? | **No.** No se modifica `config/pricing.js` ni `netlify/functions/lib/pricing.js`. Los montos que se muestran se leen de `config/site.js` y `config/pricing.js` como hoy. |
| ¿Comentarios que expliquen por qué está así? | Varios, y mandan (ver §1). |

### Comentarios existentes que hay que respetar o desactivar explícitamente

| Comentario | Qué decía | Qué se hace |
|---|---|---|
| `Hero.jsx` — *"H1 real, único y estable para SEO… sin 'en Rosario' por decisión de Mariano"* | El H1 chico (`Calcos y stickers personalizados`) existía para no meter 5 frases rotantes dentro del H1 | El titular rotante **se elimina**, así que la razón desaparece: el H1 pasa a ser el titular grande. La señal SEO se conserva porque el subtítulo y el `title` siguen diciendo "calcos", "stickers" y "personalizados", y `lib/seo.js` no cambia |
| `Hero.jsx` — *"eagerFirst: la primera calco del hero es la única imagen arriba del fold"* | Cuidado del LCP | Se mantiene: el `StickerField` sigue existiendo pero con menos piezas y menor opacidad, y sigue siendo el único elemento con imagen eager |
| `Header.jsx` — *"El ticker va ÚLTIMO… dos tiras de colores compitiendo arriba se anulaban entre sí"* | Ya se había detectado el problema de §4 del brief | Se profundiza: con promo activa el ticker **no se renderiza**, y sin promo muestra un mensaje por vez |
| `AnnouncementBar.jsx` — *"6 copias: la animación mueve -50%"* | Mecánica del ticker infinito | El ticker infinito se reemplaza por rotación de un mensaje; el CSS del ticker queda para `MarcasConfiaron`, que lo sigue usando |
| `StickerCard.jsx` — *"la card es la IMAGEN, que es lo que vende un calco"* | Ya cumple §10 del brief | **No se toca.** Ya tiene imagen dominante, precio asociado y CTA de 44 px |
| `site.js` — *"NINGÚN texto del sitio escribe estos montos a mano"* | Umbrales centralizados | Se respeta: toda sección nueva importa de `config/site.js` |
| `experiments.js` — *"los experimentos son SOLO DE PRESENTACIÓN, nunca un precio"* | Regla dura | Los A/B del brief (§34) quedan fuera de scope en esta spec |

---

## 1. Arquitectura de la Home

Orden final de `routes/Home.jsx` (el brief §3, adaptado a lo que el repo ya tiene):

| # | Sección | Componente | Estado |
|---|---|---|---|
| 1 | Barra superior | `AnnouncementBar` (en `Header`) | modificado |
| 2 | Header | `Header` | modificado |
| 3 | Hero | `Hero` | reescrito |
| 4 | Buscador | `BuscadorSeccion` | **nuevo** |
| 5 | Segmentación por intención | `IntentSelector` | ajustes de copy |
| 6 | Seguí donde estabas | `RecentCategories` | sin cambios |
| 7 | Más vendidos | `FeaturedStickers` | ajuste de título/badges |
| 8 | Categorías destacadas | inline en `Home` + `CategoryCard` | ajustes |
| 9 | Antes / Después | `AntesDespues` | **nuevo** |
| 10 | Métricas de confianza | `MetricasConfianza` | **nuevo** |
| 11 | Beneficios | `Beneficios` | **nuevo** |
| 12 | Oferta principal | `OfertaPrincipal` | **nuevo** (reemplaza el banner suelto + "Packs y servicios") |
| 13 | Testimonios | `Testimonials` | reescrito |
| 14 | UGC | `GaleriaUGC` | **nuevo** |
| 15 | Cómo comprar | `HowToBuy` | copy del brief §19 |
| 16 | FAQ | `FAQ` | preguntas del brief §20 |
| 17 | CTA final | `CtaFinal` | **nuevo** |
| 18 | Footer | `Footer` | sin cambios |

`MarcasConfiaron` (ticker de logos) se mantiene, pegado al UGC: es prueba social
real y ya está construida. Es el **único** movimiento permanente que queda en la
página.

⚠️ El `id="categorias-destacadas"` **no se puede renombrar**: `WelcomePopup` se
dispara cuando esa sección entra en viewport (`TRIGGER_ID`).

---

## 2. Componentes nuevos

### `components/BuscadorCalcos.jsx`
Motor de búsqueda reutilizable, extraído de `Hero.jsx`. Un solo lugar con la
carga diferida de `/data/catalog.json` + `/data/aliases.json`, el autocomplete
(`suggest()`), el submit a `/categorias?q=` y el tracking.

```
props: { autoFocus, placeholder, size: 'md'|'lg', onNavigate, mostrarChips, origen }
```

Se usa en tres lugares: sección buscador, modal mobile y CTA final. No duplica
lógica: es exactamente la que hoy vive dentro del `Hero`.

Carga de datos: `fetch` en el primer `focus` (como hoy) **o** al montar si
`autoFocus` (el modal necesita resultados instantáneos). Los dos manifests se
cachean en un módulo (`lib/catalogoBusqueda.js`) para que abrir el modal después
de haber usado el buscador de la página no vuelva a bajarlos.

### `lib/busquedasSugeridas.js`
Lista de chips del brief §7 (`Argentina`, `Disney`, `Fútbol`, `Anime`,
`Harry Potter`, `Taylor Swift`, `Los Simpsons`, `Marvel`) + helpers de
búsquedas recientes en `localStorage` (`epicalcos.busquedas.v1`, máximo 5).

Se testea que **cada chip encuentre algo** contra `CATEGORIES` + los alias
reales, para que ninguno caiga en "sin resultados" (RF-8).

### `components/BuscadorModal.jsx`
Pantalla completa en mobile. `role="dialog"`, `aria-modal`, cierre con `Escape`
y con el botón; bloquea el scroll del `body` mientras está abierto; devuelve el
foco al botón que lo abrió.

### `components/MetricasConfianza.jsx`
3 números de `config/brandStats.js` + `config/site.js` (`shipping.production`).
Nada escrito a mano.

### `components/Beneficios.jsx`
4 beneficios, de `config/brandStats.js` (`trustPoints` se amplía a
`beneficios`, con título + una línea). `TrustBadges` **sigue existiendo**: lo
usan la ficha de producto y otras rutas; sólo se saca del hero.

### `components/AntesDespues.jsx`
Usa `/images/instagram/DaTgGq3xNBQ.webp`, que es una foto **real** de un termo
liso a la izquierda y cubierto de calcos a la derecha. No hay pares
antes/después en el repo, así que **no se hace un slider falso**: se muestra la
foto real con las dos mitades rotuladas ("ANTES" / "DESPUÉS") por CSS sobre la
imagen, más el copy y el CTA del brief §12.

### `components/OfertaPrincipal.jsx`
Una sola oferta: el Pack Mayorista x100 con su 50%, leído de
`PACK_TIERS`/`config/pricing.js` como ya lo hace `/mayorista`. Debajo, una línea
con la condición del 10% por transferencia. Reemplaza el banner de descuento
suelto y la grilla "Packs y servicios" de 4 emojis (esos servicios siguen
accesibles desde el footer y el nav, que no cambian).

### `components/GaleriaUGC.jsx`
Grid de fotos reales: las 3 de `/images/instagram/` + las 3 de
`/testimonials/`. Datos en `data/ugc.js`, con `alt` real por foto.

### `components/CtaFinal.jsx`
Título, texto y `BuscadorCalcos` en tamaño grande.

---

## 3. Componentes modificados

### `components/Hero.jsx`
Queda: fondo (`hero-gradient` + `StickerField` reducido a 8 piezas y opacidad
0.22), **H1** grande, subtítulo, 2 CTAs (`Ver todos los diseños` →
`/categorias`, `Hacer mis propias calcos` → `/personalizados`, respetando
`isSectionHidden`).

Se va: la card de promo/envío (pasa a la barra superior y a `OfertaPrincipal`),
`RotatingHeadline`, `TrustBadges`, el badge de arriba, el párrafo largo y el
buscador chico (pasa a su propia sección, más grande).

`RotatingHeadline.jsx` queda huérfano; se borra junto a su CSS
(`.rotating-headline*`). Es el único consumidor.

### `components/Header.jsx`
- Mobile: `logo | 🔎 Buscar | 🛒 | ☰`. El botón de buscar abre `BuscadorModal`.
- Desktop: se agrega el botón de buscar antes del carrito.
- Al hacer scroll (> 80 px) el header se compacta: el padding baja y el ticker
  se oculta, dejando `logo | buscar | carrito` (§8 del brief). Se implementa con
  un `useEffect` + `scroll` pasivo y una clase, sin librerías.

### `components/AnnouncementBar.jsx`
De marquesina de 7 mensajes a **un mensaje por vez** con crossfade cada 5 s
entre los dos mensajes comerciales. Con `prefers-reduced-motion`, muestra sólo
el primero. Con promo activa, el `Header` no lo renderiza.

### `config/site.js`
`announcements` pasa de 7 entradas a 2, y sólo comerciales:
envío gratis nacional y 10% por transferencia (con su condición). Las métricas
que se van de acá **no se pierden**: son exactamente las que ahora tienen
sección propia (`MetricasConfianza`) y las que ya viven en `Beneficios`.

### `components/Testimonials.jsx`
Card con la foto ocupando ~75% del alto (`aspect-[4/5]` a sangre) y el texto
sobre el pie. En mobile, carrusel horizontal con `snap-x` (sin librería).

### `components/HowToBuy.jsx` y `components/FAQ.jsx`
Copy del brief §19 y §20. En la FAQ se agregan sólo las preguntas que faltan
(¿puedo elegir distintos diseños?, ¿dónde puedo pegarlas?, ¿cómo aplico una
calco?); las demás ya existen. Las respuestas siguen leyendo `config/site.js`.

### `lib/analytics.js`
Seis funciones nuevas (RF-20), todas con la misma forma que las existentes:
`pushDataLayer` + `try/catch`, sin llamar a `gtag`/`fbq` desde componentes.

---

## 4. Datos

| Archivo | Qué guarda |
|---|---|
| `data/ugc.js` | Fotos reales de producto aplicado (`src`, `alt`, `link?`) |
| `lib/busquedasSugeridas.js` | Chips sugeridos + recientes en `localStorage` |
| `config/brandStats.js` | Se agrega `beneficios` (4). `brandStats` y `trustPoints` quedan igual |

**Nada de esto toca `localStorage` del carrito** (`epicalcos.cart.v2`). La clave
nueva `epicalcos.busquedas.v1` es independiente y tolera JSON inválido.

---

## 5. Estilos

Se agregan a `styles/index.css`:

- `.seccion` — ritmo vertical estándar (`py-16 md:py-24`) para el espacio
  negativo del brief §24. Todas las secciones de la Home lo usan: la
  consistencia de espaciado es lo que hace legible la jerarquía.
- `.chip-busqueda` — píldora de búsqueda sugerida, con `:hover`, `:focus-visible`
  y `:active` (§28).
- `.metrica` — número grande + label.
- `.antes-despues__rotulo` — rótulos sobre la foto.
- `.carrusel-snap` — carrusel horizontal con `scroll-snap`, usado por
  testimonios y UGC en mobile.

Se eliminan: `.rotating-headline*` (queda sin consumidores).
Se conservan: `.announcement-ticker` **no**, pero sí `.marcas-ticker*`
(`MarcasConfiaron` lo usa).

Todos los estados interactivos nuevos incluyen `:focus-visible` (ANF-4).

---

## 6. Seguridad

No se agrega ninguna variable de entorno, ningún endpoint y ningún dato de
cliente. No hay secretos involucrados.

---

## 7. Manejo de errores

- `fetch` de manifests: `.catch(() => …)` con estado alternativo, como hoy.
- Imágenes: `onError` que esconde la imagen y deja el fallback (patrón ya usado
  en `Hero` y `CategoryCard`).
- Tracking: `try/catch` en `lib/analytics.js` — nunca puede romper la compra.
- `localStorage`: lectura envuelta en `try/catch`, como `lib/recientes.js`.

---

## 8. Migración

No hay migración de datos. El despliegue es un push a `main` como cualquier
otro. Ningún carrito guardado cambia de forma.

---

## 9. Tests nuevos

| Archivo | Qué verifica |
|---|---|
| `lib/busquedasSugeridas.test.js` | Cada chip sugerido encuentra al menos una categoría real; las recientes toleran JSON roto y no pasan de 5 |
| `lib/anuncios.test.js` | La barra superior tiene ≤ 2 mensajes, todos comerciales, y ningún monto escrito a mano (los montos coinciden con `config/site.js`) |
| `data/ugc.test.js` | Toda foto de UGC tiene `alt` no vacío y una ruta que existe en `public/` |
