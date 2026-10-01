# Design — Scroll fluido y contenido que aparece rápido

| | |
|---|---|
| **Spec** | `030-scroll-fluido-y-carga-rapida` |
| **Requirements** | [`requirements.md`](requirements.md) |

---

## 0. Cómo se midió (discovery, 1/10/2026)

Arneses propios en el scratchpad (Chrome headless + CDP, Node 26), contra un
`vite build` servido local con gzip y fallback de SPA:

- Celular emulado 375×812 @2x, touch, **CPU ×4**, red ~800 kB/s y 150 ms.
- **Con GPU** (`--use-angle=metal --enable-gpu-rasterization`): sin GPU, el
  headless dibuja por software y exagera justo el pintado; la primera tanda sin
  GPU dio resultados que no se sostenían.
- Scroll real: `Input.synthesizeScrollGesture`, 2.400 px a 1.600 px/s.
- Cuadros medidos DENTRO de la página con `requestAnimationFrame` (las
  lecturas por CDP llegan tarde): % de intervalos > 33 ms y el p95.
- "Variantes": la misma página con un `<style>` que apaga UNA causa, para
  saber cuánto pesa cada una. 3 corridas por variante, se informa la mediana.
- Trazas de Chrome (`devtools.timeline`) para ver en qué se va el tiempo.

### Resultados

| Variante | Home: % trabados · p95 | Categoría Disney: % trabados · p95 |
|---|---|---|
| Tal cual | 18 % · 67 ms | 6,5 % · 50 ms |
| Sin las animaciones que repintan (banner + titular) | **6 %** · 50 ms | 11 % · 100 ms |
| Sin `backdrop-filter` | 13 % · 50 ms | 3,6 % · 33 ms |
| Todo junto (+ fondo de página fijo) | 7 % · 50 ms | **2,4 % · 17 ms** |

Trazas del Home (una corrida, con GPU): con todas las animaciones CSS apagadas,
el `Paint` del hilo principal baja de 197 a 49 ms durante el scroll y los
cuadros entregados suben de 51 a 77.

`document.getAnimations()` en el Home muestra qué corre siempre y qué propiedad
mueve:

| Animación | Propiedad | Dónde | ¿Compositor? |
|---|---|---|---|
| `relampago-dorado` | `background-position` | `.promo-banner` (header, **todas las páginas**) | ❌ repinta |
| `relampago-barrido` | `left` + `opacity` | `.promo-banner::after` | ❌ layout + repinta |
| `gradient-pan` | `background-position` | `.gradient-text` (2 en el Home, 14 componentes) | ❌ repinta |
| `bg-drift` | `background-position` | `.page-gradient` (15 páginas, no el Home) | ❌ repinta la página entera |
| `anuncio-scroll`, `marcas-scroll`, `malla-deriva-*`, `aurora-spin`, `hero-termo-gira`, `hero-calco-flota` | `transform` / `translate` | Home | ✅ |

El repo ya lo advertía en el comentario de `.hero-malla__mancha` (spec 024):
*"NO animar `background-position` (lo que hace `.page-gradient`)… en un
Android de gama media eso se ve como tirones al scrollear"*. El arreglo se hizo
para la malla, pero quedaron las otras cuatro.

**Fundido de entrada** (`Reveal`): `threshold: 0.12` y
`rootMargin: '0px 0px -8% 0px'`, con una transición de 0,7 s. Medido: en el
72 % de los cuadros del scroll del Home hay un `.reveal` con opacidad < 0,5
entre el 10 % y el 90 % de la pantalla.

**Caché** (producción, `curl -I`): `/assets/*.js|css`, `/stickers/*`,
`/images/*` y `/data/*` salen con `cache-control: public,max-age=0,must-revalidate`
(lo que pone Netlify si no se declara nada). Un 304 tarda ~0,4 s.

**Imágenes del catálogo**: 6.757 `.webp`, 19,7 kB de promedio; la mayoría de
600 px, ~700 entre 700 y 2.000 px. Ya llevan `loading="lazy"`,
`decoding="async"` y medidas (sin CLS). Las miniaturas quedan fuera (P-4).

## 1. Arquitectura propuesta

Todo es CSS y configuración, más un ajuste en `Reveal.jsx`. Nada de JS nuevo
corriendo durante el scroll.

1. **Banner** (`.promo-banner`): el degradado dorado pasa a un `::before` del
   doble de ancho que se desplaza con `transform: translateX` (mismo
   recorrido, mismo ritmo). El brillo (`::after`) deja `left` y viaja con
   `transform: translateX(...) skewX(-22deg)`. Igual para la cuenta regresiva
   (`.promo-timebox`: `relampago-dorado` y `relampago-destello`). Se ve igual.
2. **`.gradient-text`**: sin `animation` (P-1). El degradado queda en su
   posición de inicio.
3. **`.page-gradient`**: sin `animation` (P-2).
4. **`.card-glass` y `.btn-secondary`**: sin `backdrop-filter`. El fondo de
   `.card-glass` sube de 0,82 a 0,88 de opacidad y el de `.btn-secondary` de
   0,6 a 0,7, para compensar lo poco que aclaraba el desenfoque.
5. **`Reveal`**: `threshold: 0` y `rootMargin: '0px 0px 25% 0px'` (arranca un
   cuarto de pantalla antes de entrar); transición de 0,7 s a 0,4 s.
6. **`.grid-rise`**: duración 0,55 → 0,35 s; el escalonado se corta en la
   sexta tarjeta (máx. 0,15 s). Las tarjetas que se suman con "Ver más" salen
   sin espera.
7. **Caché** (`netlify.toml`, bloques `[[headers]]`):
   - `/assets/*` → `public, max-age=31536000, immutable` (llevan hash).
   - `/stickers/*`, `/images/*` → `public, max-age=86400, stale-while-revalidate=2592000` (P-3).
   - `/data/*` → `public, max-age=300, stale-while-revalidate=86400`.
   - Lo demás (HTML) sigue como hoy: se consulta siempre.

## 2. Componentes afectados

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/styles/index.css` | puntos 1-4 y 6 | 🟡 compartido por todo el sitio |
| `frontend/src/components/Reveal.jsx` | punto 5 | 🟡 lo usan 14 componentes |
| `netlify.toml` | punto 7 | 🟡 un `for` mal escrito no rompe nada, pero un `immutable` en el HTML dejaría a la gente con un deploy viejo: por eso el HTML no se toca |

**Quién importa lo delicado** (regla 9): `index.css` lo importa `main.jsx`
(todo el sitio). `Reveal` lo usan `Home`, `LandingUso`, `OfertaPrincipal`,
`AntesDespues`, `IntentSelector`, `Beneficios`, `HowToBuy`,
`MetricasConfianza`, `MarcasConfiaron`, `GaleriaUGC`, `FeaturedStickers` y las
tres secciones de `/personalizados`. Ninguno de los módulos espejados
(`pricing.js`, `site.js`, `CartContext`) se toca.

## 3. Datos

Sin cambios.

## 4. APIs

Sin cambios. Las funciones de Netlify no reciben headers de caché nuevos (los
bloques van por ruta estática).

## 5. Integraciones

Netlify (headers). Sin cambios en Mercado Pago, Meta ni GA4.

## 6. Seguridad

Los headers de seguridad de `for = "/*"` siguen; los bloques nuevos solo suman
`Cache-Control`. Netlify combina los headers de todos los bloques que
coinciden.

## 7. Manejo de errores

Nada nuevo: si un navegador no soporta `stale-while-revalidate`, cae a
`max-age` (1 día) y revalida como hoy.

## 8. Estrategia de migración

Un solo deploy. Rollback: revertir el commit. La caché de un año solo se pone
a archivos con hash: un rollback genera hashes distintos y no queda nada viejo
pegado.

## 9. Testing

- Los mismos arneses de §0, antes y después, con las metas de requirements §2.
- Antes/después visual a 375 y 1440: Home, categoría, carrito, checkout y el
  banner del header (con y sin promo).
- Movimiento reducido emulado: sin animaciones.
- Después del deploy, `curl -I` contra producción para cada tipo de archivo.
- `npm test` y `vite build`.
