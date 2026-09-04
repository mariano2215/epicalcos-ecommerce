# Requirements — Rediseño de la Home (Gestalt, jerarquía y conversión)

| | |
|---|---|
| **Spec** | `014-rediseno-home-gestalt` |
| **Estado** | `EN IMPLEMENTACIÓN` |
| **Fecha** | 04/09/2026 |
| **Autor** | Mariano (brief) + Claude (redacción) |

---

## 1. Problema

La Home intenta comunicar **todo al mismo tiempo**. Arriba del fold, un visitante
de celular recibe en simultáneo:

- el ticker de anuncios con **7 promesas distintas** (dos umbrales de envío,
  +5.000 clientes, +120.000 calcos, producción, personalizados, pago seguro),
- a veces además un banner de promo dorado encima del ticker,
- una card de promo/envío dentro del hero,
- un titular que **rota entre 5 frases** con animación permanente,
- un H1 distinto del titular,
- una tira de 4 badges de confianza,
- 14 calcos flotando animadas de fondo,
- y recién ahí el buscador.

Ningún elemento gana: todos compiten. No hay figura y fondo, no hay una sola
idea por sección, y la carga cognitiva del primer scroll es máxima justo donde
llega el tráfico pago de Instagram.

Más abajo el problema se repite en otra forma: los números de marca
(+120.000 / +5.000) viven **escondidos dentro de una marquesina en movimiento**,
los beneficios del producto están sólo como píldoras de 12 px, el mismo mensaje
comercial (10% por transferencia) aparece en tres lugares distintos, y no hay
ninguna sección que muestre el producto **aplicado en un objeto real**, que es
lo único que explica en un segundo qué se compra acá.

Con 61 categorías y 3.397 diseños, el buscador es el mecanismo de navegación más
importante del sitio — y hoy es un input chico al final del hero, invisible en
el header y ausente del resto de la página.

---

## 2. Objetivo

Que la Home cuente **una idea por sección**, en un recorrido descendente
—deseo → descubrimiento → producto → confianza → oferta → compra— y que el
buscador sea un protagonista visible en todo el scroll.

**Cómo se sabrá que funcionó:** sube el uso del buscador (evento `search`) y el
`search → product_view`, sube el CTR del hero y el add-to-cart en mobile, sin
caída de la conversión ni del tráfico orgánico.

---

## 3. Scope

Sí entra (P0 → P2 del brief):

- [x] Barra superior: **un solo mensaje comercial por vez**
- [x] Header con **búsqueda en mobile** y header reducido al hacer scroll
- [x] Hero simplificado: un H1 dominante, subtítulo, 2 CTAs
- [x] Buscador como sección propia, con búsquedas sugeridas y recientes
- [x] Modal de búsqueda a pantalla completa en mobile
- [x] Nueva arquitectura y orden de secciones de la Home
- [x] Segmentación por intención (3 cards de misma estructura)
- [x] Más vendidos y Categorías destacadas con cards consistentes
- [x] Antes / Después con foto real
- [x] Métricas de confianza fuera de la marquesina
- [x] Beneficios (máximo 4)
- [x] Una sola oferta principal + el 10% por transferencia cerca del precio
- [x] Testimonios con la imagen dominante y carrusel en mobile
- [x] Galería UGC con fotos reales
- [x] Cómo comprar, FAQ y CTA final
- [x] Eventos de GA4 que faltaban

No entra:

- [ ] Precios, promos, cupones y umbrales — **no se toca ni un número**
- [ ] Carrito, checkout, pricing espejado, webhook, Pixel/CAPI
- [ ] Rutas, URLs y redirects existentes
- [ ] Landing pages propias por categoría (§30 del brief) — feature aparte
- [ ] Tests A/B del hero y del CTA (P3) — se declaran, no se prenden
- [ ] Recomendaciones personalizadas (P3)
- [ ] Reemplazar el buscador de categorías por búsqueda por diseño suelto:
      los 3.397 archivos no tienen nombre ni tags (ver `searchCatalog.js`)

---

## 4. Usuarios

1. **Tráfico frío de Instagram, en celular** (mayoría). Llega de un anuncio,
   no conoce la marca, decide en segundos.
2. **Visitante que vuelve**: ya miró categorías, quiere retomar.
3. **Negocio / mayorista**: busca cantidad y su propio diseño.

---

## 5. User stories

- Como visitante nuevo quiero **entender en 3 segundos qué se vende acá** y qué
  puedo hacer con eso.
- Como visitante con un gusto concreto ("Taylor Swift") quiero **buscarlo desde
  cualquier punto de la página**, no sólo arriba de todo.
- Como visitante indeciso quiero **ver el producto puesto en un objeto real**
  antes de decidir.
- Como comprador quiero **una sola oferta clara**, no siete promesas mezcladas.
- Como cliente que vuelve quiero **retomar donde estaba**.

---

## 6. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-1 | La barra superior muestra **un** mensaje comercial por vez. Si hay un banner de promo activo, la barra no muestra nada más. |
| RF-2 | La barra superior **no** mezcla métricas de marca, producción, personalizados, pago seguro ni mayorista con la promesa comercial. |
| RF-3 | En mobile el header muestra logo, **buscar**, carrito y menú, en ese orden de importancia. Buscar pesa más que el menú. |
| RF-4 | Tocar buscar en mobile abre una pantalla completa con autofocus, búsquedas sugeridas, búsquedas recientes y resultados instantáneos. |
| RF-5 | El hero tiene **un solo** elemento dominante: el H1. Debajo, subtítulo de una línea y exactamente 2 CTAs (principal y secundario). |
| RF-6 | El hero no contiene promociones, ni titular rotante, ni tira de badges. |
| RF-7 | Existe una sección de buscador con título propio, placeholder con ejemplos reales y chips de búsquedas sugeridas. |
| RF-8 | Cada chip de búsqueda sugerida lleva a un resultado real del catálogo (ninguno cae en "sin resultados"). |
| RF-9 | La sección de intención tiene 3 cards con **estructura visual idéntica**; se diferencian por contenido, no por forma. |
| RF-10 | Las cards de producto muestran imagen dominante, nombre, tamaño, precio y un CTA de agregar. Como máximo **un** badge por card. |
| RF-11 | Las categorías destacadas muestran entre 6 y 10 categorías, con un CTA final a las 61. Nunca las 61 juntas. |
| RF-12 | Existe una sección Antes / Después con foto **real** (no mockup) y un CTA. |
| RF-13 | Las métricas de confianza tienen sección propia, con números grandes y fuera de cualquier marquesina. |
| RF-14 | Los beneficios son **máximo 4**, cada uno con título y una línea de texto. |
| RF-15 | Se muestra **una** promoción principal por vez. El 10% por transferencia aparece cerca del precio o del carrito, no repetido en tres secciones. |
| RF-16 | Los testimonios dan a la imagen 70–80% de la card; en mobile son un carrusel con swipe. |
| RF-17 | Existe una galería de fotos reales de producto aplicado (UGC). |
| RF-18 | La Home cierra con un CTA final que incluye un buscador. |
| RF-19 | El orden de secciones sigue el recorrido definido en el brief §3. |
| RF-20 | Se registran los eventos `search_results_view`, `category_click`, `custom_sticker_click`, `wholesale_click`, `promo_unlock` y `testimonial_interaction`, además de los que ya existen. |

---

## 7. Requisitos no funcionales

| ID | Requisito |
|---|---|
| ANF-1 | **Mobile-first**: a 375 px no hay scroll horizontal y todo control táctil mide ≥ 44 px. |
| ANF-2 | **Performance**: el Home sigue siendo la única ruta eager; ninguna imagen nueva arriba del fold salvo la del hero; sin scripts bloqueantes; sin librerías nuevas. |
| ANF-3 | **Animación**: ninguna animación permanente compitiendo con el producto. Se respeta `prefers-reduced-motion`. |
| ANF-4 | **Accesibilidad**: headings jerarquizados (un solo H1), `aria-label` en todo control sin texto propio, foco visible, navegación por teclado en el modal de búsqueda. |
| ANF-5 | **SEO**: se mantienen title, meta description, JSON-LD y todas las URLs. El H1 sigue conteniendo el término principal del negocio. |
| ANF-6 | **Compatibilidad**: carrito, checkout, precios, promos y eventos existentes siguen funcionando sin cambios. |
| ANF-7 | Los 210 tests existentes siguen pasando. |

---

## 8. Reglas de negocio

- **Los precios, promos y umbrales no se tocan.** Todo texto comercial se lee de
  `config/site.js`, `config/pricing.js` y `config/brandStats.js`.
- El 10% por transferencia **nunca** se anuncia a secas: siempre con su
  condición (desde 10 calcos **y** pagando por transferencia).
- El envío gratis es **sólo por umbral**. Ninguna sección nueva puede sugerir
  que una promo lo regala.
- Sólo testimonios y fotos reales. No se inventan reseñas, ratings ni UGC.
- `HIDDEN_SECTIONS` sigue mandando: una sección despublicada no aparece en
  ninguna card, chip ni CTA nuevo.

---

## 9. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| `/data/catalog.json` no baja | Las secciones que dependen del catálogo caen a su estado alternativo, sin huecos ni imágenes rotas |
| Una categoría sugerida deja de existir | El chip no rompe: cae en el buscador con resultados |
| Promo activa | El banner de promo manda y la barra de anuncios se calla |
| `prefers-reduced-motion` | Sin rotación de mensajes, sin reveals, sin ticker |
| Visitante sin historial | La sección de recientes no se renderiza |
| Sin JS de IntersectionObserver | Todo el contenido visible |

---

## 10. Analytics

Eventos nuevos, todos vía `lib/analytics.js` y envueltos en `try/catch`:

| Evento | Parámetros | Dónde |
|---|---|---|
| `search_results_view` | `search_term`, `results_count` | Autocomplete con resultados |
| `category_click` | `category_name`, `position` | Card de categoría destacada |
| `custom_sticker_click` | `origen` | CTA de personalizados |
| `wholesale_click` | `origen` | CTA de mayorista / negocio |
| `promo_unlock` | `promo`, `umbral` | Cuando el carrito desbloquea el 10% |
| `testimonial_interaction` | `nombre`, `accion` | Interacción con testimonios / UGC |

Los que ya existen y se conservan: `search`, `view_item_list`, `select_item`,
`view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`,
`purchase`.
