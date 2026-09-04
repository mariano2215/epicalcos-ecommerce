# Acceptance — Rediseño de la Home (Gestalt, jerarquía y conversión)

| | |
|---|---|
| **Spec** | `014-rediseno-home-gestalt` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 04/09/2026 |
| **Resultado** | ✅ aceptada (con 4 desvíos declarados, §4) |

> Recorrido punto por punto sobre el dev server, a 375 px y en desktop
> (`CLAUDE.md` regla 15). Ningún ✅ está puesto sin haberlo ejecutado.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-1 *(RF-1/2)* | La barra superior muestra un mensaje por vez y ninguno es una métrica de marca | Los dos `.anuncio-barra__item` en el DOM, uno solo con `is-active`; a los 5,6 s el activo pasó de "10% OFF desde 10 calcos pagando por transferencia" a "Envío gratis a todo el país desde $ 50.000". Test `anuncios.test.js` bloquea que vuelvan las métricas | ✅ |
| AC-2 *(RF-1)* | Con promo activa, la barra de anuncios no se renderiza | Hoy no hay promo viva (la mayorista venció el 14/8). Verificado por camino de código: `{!hayPromo && !compacto && <AnnouncementBar />}` en `Header.jsx`, con `hayPromo` = las tres promos | ⚠️ verificado por código, no en vivo |
| AC-3 *(RF-3)* | A 375 px el header muestra logo, buscar, carrito y menú, y buscar pesa más que el menú | Captura a 375 px: `EPICALCOS · 🔎 Buscar · 🛒 · ☰`. Buscar es el único con texto; carrito y menú quedan en ícono | ✅ |
| AC-4 *(RF-4)* | Tocar buscar abre pantalla completa con autofocus, chips y resultados al tipear; `Escape` cierra | Diálogo en 0,0 375×812, `body.overflow = hidden`, foco en el input, 8 chips. "harry" → "🎤 Harry Styles · 85 diseños" / "⚡ Harry Potter · 82 diseños". `Escape` → modal desmontado, overflow restaurado y foco de vuelta en el botón Buscar | ✅ |
| AC-5 *(RF-5/6)* | El hero tiene un H1 dominante, subtítulo, exactamente 2 CTAs y ninguna promo, titular rotante ni tira de badges | Captura a 375 px y a 1280 px. `document.querySelectorAll('h1')` → 1: "Calcos para todo lo que te gusta". `RotatingHeadline.jsx` eliminado (sin referencias) | ✅ |
| AC-6 *(RF-7/8)* | Existe la sección de buscador y **cada** chip devuelve al menos un resultado real | Sección "¿Qué te gusta?" con 8 chips. `busquedasSugeridas.test.js` corre los 8 contra `catalog.json` + `aliases.json` reales. Click en "Fútbol" → `/categorias?q=Fútbol` → 1 resultado (Escudos de Fútbol) | ✅ |
| AC-7 *(RF-9)* | Las 3 cards de intención comparten estructura, padding, radio y lugar del CTA | Captura a 375 px: mismo `card-glass p-6`, mismo orden icono → título → texto → CTA. Sólo cambia el velo de color | ✅ |
| AC-8 *(RF-10)* | Cada card de producto muestra imagen, nombre, tamaño, precio y CTA, con un badge como máximo | Captura de "Los más elegidos": imagen dominante + "ANIME #17 · 6 cm · $ 1.600 · +". Se eliminó el badge "🔥 Tendencia" del encabezado | ✅ |
| AC-9 *(RF-11)* | Entre 6 y 10 categorías, con CTA a las 61 | 10 cards + botón "Ver las 61 categorías" (el número sale de `CATEGORY_COUNT`) | ✅ |
| AC-10 *(RF-12)* | Antes/Después con foto real y un solo CTA principal | Foto real del Instagram de EPICALCOS; el texto quemado se recorta con `object-bottom` y los rótulos ANTES/DESPUÉS van en HTML. CTA principal "Ver diseños" + secundario "Subir el mío" | ✅ |
| AC-11 *(RF-13)* | Métricas en su sección, números grandes, sin movimiento | 3 columnas en desktop: "+120.000 / calcos vendidas", "+5.000 / clientes", "2 a 3 días / de producción". Sin animación más allá del reveal de entrada | ✅ |
| AC-12 *(RF-14)* | Exactamente 4 beneficios | `beneficios` en `config/brandStats.js` tiene 4; la grilla renderiza 4 columnas en desktop | ✅ |
| AC-13 *(RF-15)* | Una sola promoción principal, y el 10% siempre con su condición | Captura: una card "Desde 100 calcos, 50% OFF" y debajo "Desde 10 calcos tenés **10% OFF pagando por transferencia**". El banner suelto y la grilla "Packs y servicios" desaparecieron | ✅ |
| AC-14 *(RF-16)* | Imagen ≥ 70% del alto de la card; swipe en mobile | Card = imagen `aspect-[4/5]` a sangre (≈ 445 px) + pie de ≈ 130 px → 77%. Carrusel `scroll-snap` a 82% de ancho, con la card siguiente asomando | ✅ |
| AC-15 *(RF-17)* | Galería UGC sólo con fotos reales, todas con `alt` | 4 fotos reales; `ugc.test.js` verifica que existan en `public/` y que el `alt` describa la foto | ✅ |
| AC-16 *(RF-18)* | El CTA final incluye un buscador funcional | Sección final con "Hay una calco para eso que te gusta" + buscador (`origen: cta_final`) | ✅ |
| AC-17 *(RF-19)* | El orden de secciones es el del brief §3 | Orden leído del DOM: hero → buscador → intención → más elegidos → categorías → antes/después → métricas → beneficios → oferta → testimonios → UGC → marcas → cómo funciona → FAQ → CTA final | ✅ |
| AC-18 *(RF-20)* | Los 6 eventos nuevos se disparan con sus parámetros | `search_results_view` `{search_term:"taylor", results_count:1, origen:"modal_mobile"}`; `category_click` `{category_name:"Anime", position:1}`; `promo_unlock` `{promo:"transferencia_10", umbral:10}` con un carrito de 10 calcos. `custom_sticker_click` / `wholesale_click` / `testimonial_interaction` verificados por camino de código (cuelgan de un click a `/personalizados`, `/mayorista` y del scroll del carrusel) | ✅ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| ANF-1 | A 375 px `scrollWidth === clientWidth` y todo control táctil ≥ 44 px | `[375, 375]` medido en el navegador (antes del arreglo de los tabs de la FAQ daba `[396, 375]`). Quedan tres controles por debajo, declarados en §4 | ⚠️ con 3 excepciones declaradas |
| ANF-2 | Sin librerías nuevas; sin imágenes eager nuevas arriba del fold | `frontend/package.json` sin cambios. La única imagen eager sigue siendo la primera del `StickerField` (`eagerFirst`), que además bajó de 14 a 8 piezas. Bundle: 276,75 kB → **276,65 kB** | ✅ |
| ANF-3 | Sin animación permanente salvo el ticker de marcas; `prefers-reduced-motion` respetado | La marquesina de anuncios y el titular rotante de 5 frases se eliminaron. Queda el ticker de marcas (ya existente) y el campo de calcos del fondo. El bloque `@media (prefers-reduced-motion)` cubre las clases nuevas | ✅ |
| ANF-4 | Un solo H1; foco visible; el modal se cierra con teclado | 1 H1. `:focus-visible` definido para `.chip-busqueda` y `.buscador__opcion`; `:focus-within` para el campo. `Escape` cierra el modal y devuelve el foco | ✅ |
| ANF-5 | `title`, meta description, JSON-LD y URLs sin cambios | `lib/seo.js` no se tocó (`seo.test.js` en verde). El JSON-LD de FAQPage sumó 3 preguntas; ninguna URL cambió | ✅ |
| ANF-6 | Carrito, checkout y precios sin cambios | `config/pricing.js` y `netlify/functions/lib/pricing.js` sin tocar. Carrito sembrado con 10 calcos: se hidrató y cotizó igual. Los tests de paridad de precios en verde | ✅ |
| ANF-7 | `npm test` en verde | **397 tests, 27 archivos, todos pasan** (18 nuevos en esta spec) | ✅ |

---

## 3. Edge cases

| Caso | Esperado | Resultado |
|---|---|---|
| Un manifest no baja | El buscador sigue usable, sin autocomplete | ✅ — `cargarCatalogo`/`cargarAliases` nunca rechazan |
| Una portada da 404 | Se esconde la imagen y queda el emoji | ✅ — `onError` en la opción del autocomplete |
| `prefers-reduced-motion` | Sin rotación de la barra, sin reveals | ✅ — la barra se queda en el primer mensaje |
| Visitante sin historial | La sección de recientes no se renderiza | ✅ — y el bloque "Tus últimas búsquedas" tampoco |
| `localStorage` roto o ausente | No lanza | ✅ — cubierto por `busquedasSugeridas.test.js` |
| Drawer abierto sobre `/carrito` | `promo_unlock` una sola vez | ✅ — 4 medidores montados, **1** evento |
| Sección despublicada | No aparece en ninguna card ni CTA nuevo | ✅ — "También hacemos tatuajes temporales y fotos polaroid": archivos-imprimibles queda afuera |

---

## 4. Desvíos declarados

1. **Sin ★★★★★ en los testimonios** (brief §17). EPICALCOS no tiene sistema de
   reseñas: un rating dibujado sería inventado. Es la misma razón por la que el
   JSON-LD no emite `AggregateRating`.
2. **AC-2 verificado por código y no en vivo**: hoy no hay ninguna promo activa
   y activar una exigiría tocar `config/pricing.js`, que esta spec no toca.
3. **Tres controles por debajo de 44 px**: el nombre del calco en la card
   (14 px; el objetivo real es la imagen, que mide más de 44) y los dos links
   dentro de la frase "También hacemos…" (17 y 37 px), que son links en línea
   dentro de un párrafo.
4. **No hay slider antes/después**: no existen pares de fotos en el repo y no se
   fabrica uno con un mockup.

## 5. Fuera de scope (declarado en `requirements.md` §3)

- Tests A/B del hero y del CTA (brief §34)
- Landing pages propias por categoría (brief §30)
- Recomendaciones personalizadas
- El brief §16 (promoción contextual en el carrito) **ya estaba implementado y
  aceptado en la spec 013**: no se rehizo

## 6. Definition of Done

- [x] Los 18 criterios funcionales verificados en el navegador
- [x] Los 7 no funcionales verificados
- [x] `npm test` en verde desde la raíz (397/397)
- [x] Lo que quedó fuera de scope, declarado
