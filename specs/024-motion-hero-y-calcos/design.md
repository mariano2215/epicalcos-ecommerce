# Design — Motion: hero vivo y calcos que responden al cursor

| | |
|---|---|
| **Spec** | `024-motion-hero-y-calcos` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 18/09/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, a medias.** El hero ya tiene `.hero-aurora` (cónico difuso que gira en 28 s, al 55 %), `StickerField` (8 calcos flotando al 22 %) y `.gradient-text` en la segunda mitad del H1. Lo que está **quieto** es el degradado principal: `.hero-gradient` son 6 `radial-gradient` fijos. No hay saludo ni entrada. Las cards de calco ya tienen `card-glass-hover` (sube 4 px) y la imagen hace `hover:scale-105`. |
| ¿Qué archivos están involucrados? | `components/Hero.jsx`, `components/StickerCard.jsx`, `styles/index.css`. Nuevo: `lib/heroSaludo.js` + test. Docs: `docs/CRO-EXPERIMENTS.md`. |
| ¿Hay tests que lo cubran hoy? | `lib/heroVariantes.test.js` cubre el copy del experimento (no se toca). Nada cubre animaciones: los tests corren en `environment: node`. |
| ¿Toca el camino de precios? | **No.** `StickerCard` importa `CartContext` y `config/pricing.js`, pero solo se le cambian clases CSS. |
| ¿Hay comentarios que expliquen por qué está así? | Tres, y los tres condicionan el diseño (ver abajo). |

### Lo que dicen los comentarios y cómo se respeta

1. **`Hero.jsx` — "un titular que rotaba entre 5 frases con animación
   permanente" se sacó el 4/9/2026 (spec 014).** Competía con todo. El saludo
   de esta spec **no es el titular** (no es el H1, es más chico y menos
   contrastado) y **deja de moverse** a los ≤ 5 s. El H1 queda intacto.
2. **`Hero.jsx` — "Lo ÚNICO que cambia entre variantes es eso".** Corren
   `hero_titular` y `hero_buscador`. Todo lo nuevo es **idéntico en las cuatro
   celdas**; el único punto donde podía filtrarse una diferencia —cuándo
   aparecen los botones, según haya o no buscador arriba— se resuelve con
   retrasos **por rol**, no por posición (§1.3).
3. **`Hero.jsx` — "`eagerFirst` … define el LCP".** Nada que pueda ser el
   elemento LCP (H1, subtítulo, primera calco) arranca con `opacity: 0`: Chrome
   no cuenta como candidato a un elemento invisible, así que un fade-in del H1
   **correría el LCP** lo que dure la animación. El H1 y el subtítulo solo se
   deslizan.

### 🐛 Hallazgo: el hover de las cards está muerto en las grillas de categoría

`.grid-rise > *` anima la entrada de cada card con `animation: rise … both`. El
`fill-mode: both` deja aplicado el último keyframe (`transform: none`) **para
siempre**, y un valor de animación le gana en la cascada a cualquier
declaración normal, `:hover` incluido.

Verificado en el navegador el 18/9/2026 en `/categoria/anime`:

```
card.style.transform = 'translateY(-4px)'
getComputedStyle(card).transform   →  matrix(1, 0, 0, 1, 0, 0)    ← ignorado
card.style.animation = 'none'
getComputedStyle(card).transform   →  matrix(1, 0, 0, 1, 0, -4)   ← recién ahí
```

Consecuencia: **el "sube 4 px" de `card-glass-hover` nunca funcionó en
`Category.jsx` ni en `LandingUso.jsx`**, solo en los destacados del Home (que
no usan `grid-rise`). Si el crecimiento se hiciera con `transform: scale()`,
nacería muerto en la grilla principal del sitio.

**Cómo se evita**: la card crece con la propiedad individual **`scale`**, que es
independiente de `transform` y que `rise` no toca. Verificado en el mismo
navegador: `card.style.scale = '1.07'` → la card pasa de 154 a 164,8 px de ancho
**con** la animación aplicada.

No se toca `grid-rise` (regla 8): arreglarlo cambia la entrada de todas las
grillas. Queda como hallazgo en §8.

---

## 1. Arquitectura propuesta

Todo es CSS + clases. **Cero JS de animación**: ningún `setInterval`, ningún
`requestAnimationFrame`. React solo decide *si* se reproduce la entrada y
pausa el fondo cuando no se ve.

```
<section.hero-gradient.hero-gradient--vivo[.hero--entrada][data-pausado]>
  ├─ .hero-malla (aria-hidden)          ← NUEVO: 5 manchas que se mueven
  │    ├─ .hero-malla__mancha ×5
  │    └─ ::after  (franja oscura superior, fija)
  ├─ .hero-aurora                        (existe)
  ├─ <StickerField>                      (existe)
  └─ .container-app
       ├─ p.hero-saludo (aria-hidden)   ← NUEVO: frases apiladas en una celda
       ├─ h1.hero-pieza--titular         ← sube (sin fade)
       ├─ p.hero-pieza--subtitulo        ← sube (sin fade)
       ├─ BuscadorCalcos.hero-pieza--buscador   (solo en_hero; sube + aparece)
       └─ div.hero-pieza--botones        ← sube + aparece
```

### 1.1 El fondo en movimiento

`.hero-gradient` **no se toca**: también lo usan `PaymentSuccess`,
`PaymentPending`, `PaymentError` y `PaymentTransfer`. El Home suma el modificador
`.hero-gradient--vivo`, que deja solo el negro de base (`#111`), y las manchas
de color pasan a una capa propia.

- **5 manchas**, una por cada `radial-gradient` de color de hoy (azul, violeta,
  fucsia, rosa, naranja), en las **mismas coordenadas** de reposo (20 % 45 %,
  55 % 52 %, 78 % 55 %, 30 % 85 %, 60 % 95 %) y los mismos colores.
- Cada mancha es un `<span>` absoluto con
  `radial-gradient(circle closest-side, <color>, transparent)`. **Sin
  `filter: blur()`**: el degradado a transparente ya es difuso, y un blur de
  90 px sobre 5 capas en un celular es justo lo que hace caer los fps.
- Tamaño: `width: max(60%, 320px); aspect-ratio: 1`. Con eso el radio queda
  cerca del que hoy da el `transparent 36%` (≈160 px a 375, ≈310 px a 1024).
- Se mueven con `transform` (compositor, sin repintar): 3 recorridos
  `malla-deriva-a|b|c` que combinan `translate3d` de ±10–18 % y `scale` 0,9–1,15.
  Duraciones distintas (17, 19, 21, 23, 24 s) y `animation-delay` negativos para
  que nunca se sincronicen. **`alternate`**: el ciclo vuelve por el mismo camino,
  así que no hay salto al reiniciar (RF-2).
- El centrado va en la propiedad `translate: -50% -50%` y el movimiento en
  `transform`, para que no se pisen.
- La franja oscura superior (el primer `radial-gradient` de hoy, `circle at 50%
  0%`) va en `.hero-malla::after`, **quieta** y por encima de las manchas: es lo
  que mantiene legible el header y el H1 (RF-3).
- En reposo (movimiento reducido, o navegador que no anima) la capa se ve igual
  que el degradado de hoy. Los valores finos se ajustan mirando la captura de
  antes contra la de después.

**Por qué no animar `background-position`** (lo que hace `.page-gradient`):
obliga a repintar el hero entero en cada cuadro. En un Android de gama media es
exactamente el tipo de cosa que se nota como tirón al scrollear.

**Costo**: 5 capas compuestas. Si Lighthouse o la prueba en celular muestran
tirones, se baja a 3 manchas (azul+violeta, fucsia+rosa, naranja) antes que
volver a un fondo quieto.

### 1.2 El saludo

- Copy en `lib/heroSaludo.js` (datos puros, testeables en node — mismo criterio
  que `lib/heroVariantes.js`):
  ```js
  export const FRASES_SALUDO = ['Bienvenido', 'Qué bueno verte por acá', 'Tus cosas, a tu manera', 'Estás en casa'];
  export const DURACION_FRASE_MS = 1500;   // cada frase de paso
  export const ENTRADA_FINAL_MS = 500;     // la última entra y se queda
  export function duracionSaludoMs(frases = FRASES_SALUDO) {
    return (frases.length - 1) * DURACION_FRASE_MS + ENTRADA_FINAL_MS;
  }
  ```
  4 frases → 3 × 1500 + 500 = **5000 ms** (RF-8, justo en el límite de WCAG
  2.2.2). El test lo exige: si alguien agrega una quinta frase sin acortar la
  duración, se pone rojo.
- Mayúsculas por CSS (`text-transform`), como el resto de los títulos: el copy
  se escribe normal y con tildes.
- **Todas las frases están en el DOM a la vez**, apiladas en la **misma celda de
  grid** (`grid-area: 1 / 1`). La altura del `<p>` es la de la frase más alta
  **desde el primer cuadro**, así que rotar no mueve nada (RF-9). Sin posiciones
  absolutas ni alturas mágicas.
- El orden de cada frase viaja como custom property inline: `style={{ '--i': i }}`,
  y los tiempos como `--saludo-dur` / `--saludo-entrada` en el `<p>`, leídos de
  las constantes. **El CSS no sabe cuántas frases hay**: agregar una es tocar
  un array, no reescribir `nth-child`.
- Keyframes:
  - `saludo-pasa` (todas menos la última): entra desde abajo, queda, sale hacia
    arriba. `fill-mode: both` → invisible antes de su turno y después.
  - `saludo-queda` (la última): entra y **se queda**. `fill-mode: backwards` →
    al terminar la animación deja de aplicarse y manda el estilo base.
- **Estado quieto** (sin `.hero--entrada`): las frases de paso con `opacity: 0`,
  la última con `opacity: 1`. Es lo que ve quien vuelve al Home y quien tiene
  movimiento reducido (RF-16, RF-27).
- Estilo: `var(--fuente-titulos)`, 600, `0.8rem` (`md:` `0.95rem`),
  `letter-spacing: 0.28em`, `rgba(255,255,255,0.75)`. Más chico y más apagado
  que el H1 (RF-10). A 375 px, 24 caracteres ocupan ~315 px de los 343
  disponibles: el test fija el tope en **24** por frase.
- **`aria-hidden="true"`**: un lector de pantalla leería las 4 frases seguidas
  (están todas en el DOM) o, con `aria-live`, anunciaría cada cambio. Es un
  saludo decorativo; el contenido es el H1 (RNF-4).

### 1.3 La entrada escalonada

```css
@keyframes hero-sube    { from { transform: translateY(16px); }              to { transform: none; } }
@keyframes hero-aparece { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
```

| Pieza | Animación | Retraso | Termina |
|---|---|---|---|
| saludo (1.ª frase) | `saludo-pasa` | 0 ms | — |
| H1 | `hero-sube` — **sin fade** | 0 ms | 600 ms |
| subtítulo | `hero-sube` — **sin fade** | 120 ms | 720 ms |
| buscador (`en_hero`) | `hero-aparece` | 300 ms | 900 ms |
| botones | `hero-aparece` | **450 ms, fijo** | **1050 ms** (RF-13 ≤ 1200) |

- **Retraso por rol, no por índice** (RF-15). Con un `nth-child` o un contador,
  en la celda `en_hero` los botones serían la 4.ª pieza y en `debajo` la 3.ª:
  aparecerían en momentos distintos según la variante, y eso es una segunda
  variable colada en `hero_buscador`. Con el retraso atado al rol, los botones
  salen a los 450 ms en las cuatro celdas.
- **`animation-fill-mode: backwards`, nunca `both`.** Es la lección del hallazgo
  de §0: con `both` el último keyframe queda aplicado para siempre. En el hero
  eso además dejaría al buscador y a los botones con un contexto de apilamiento
  propio, y el **desplegable del buscador quedaría debajo de los botones**
  (RF-18). Con `backwards` la animación deja de existir al terminar.
  - Único efecto residual: si alguien abre el desplegable **en el primer
    segundo**, mientras los botones todavía se están animando, éstos lo tapan
    ese instante. Aceptado.
- Opacidad 0 no bloquea clics: un botón a mitad de su fade responde (RF-17).
- Las clases de pieza se agregan siempre; los keyframes solo corren bajo
  `.hero--entrada`. Sin esa clase, todo está en su lugar y visible.

### 1.4 Una vez por carga de página

```js
// Fuera del componente: vive lo que vive la pestaña, no lo que vive el Home.
let heroYaSeMostro = false;

const reducedMotion = useReducedMotion();
const [entrada] = useState(() => !heroYaSeMostro && !reducedMotion);
useEffect(() => { heroYaSeMostro = true; }, []);
```

- El initializer de `useState` es **puro** (solo lee la bandera); la escritura
  va en el effect. Así el doble render de `React.StrictMode` (está activo en
  `main.jsx`) no se come la entrada en desarrollo.
- Volver al Home con el router desmonta y remonta `Hero` → la bandera ya está en
  `true` → hero armado (RF-16). Recargar reinicia el módulo → entrada de nuevo.
- **Sin `sessionStorage`**: no hace falta, y es un `try/catch` menos.

### 1.5 Pausar el fondo fuera de pantalla

```js
useEffect(() => {
  const el = heroRef.current;
  if (!el || typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) delete el.dataset.pausado;
    else el.dataset.pausado = '';
  });
  io.observe(el);
  return () => io.disconnect();
}, []);
```

```css
.hero-gradient--vivo[data-pausado] .hero-malla__mancha,
.hero-gradient--vivo[data-pausado] .hero-aurora,
.hero-gradient--vivo[data-pausado] .sticker-float { animation-play-state: paused; }
```

- **`data-pausado` y no una clase**: React reescribe `className` cuando cambia
  el string del prop; un `classList.toggle` hecho a mano podría desaparecer en
  un re-render. Un atributo que React no maneja no lo toca nunca.
- Pausa también el aurora y las calcos flotantes **de este hero**: ya se movían
  fuera de pantalla sin que nadie los viera, y esta spec suma 5 capas más. Es la
  compensación de performance, no un refactor. Si Mariano prefiere acotarlo a
  lo nuevo, se saca de la regla y listo.

### 1.6 La card de calco

```css
.sticker-card {
  position: relative;
  transition:
    scale 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}
@media (hover: hover) and (pointer: fine) {
  .sticker-card:hover { scale: 1.08; z-index: 2; border-color: …; box-shadow: …; }
}
/* Regla APARTE: un selector que el navegador no entiende invalida la lista
   entera. Si `:has()` fuera en la misma regla que `:hover`, un navegador sin
   `:has()` perdería también el hover. */
.sticker-card:has(:focus-visible) { scale: 1.08; z-index: 2; border-color: …; }
```

- **`scale`, no `transform`** — por el hallazgo de §0.
- **`@media (hover: hover) and (pointer: fine)`**: en un celular el `:hover` se
  "pega" después de tocar. Sin esta guarda, tocar "+" dejaría la card agrandada
  hasta tocar otra cosa (RF-24).
- `:has(:focus-visible)`: la card crece cuando el foco de **teclado** entra al
  link o al "+", no con el foco que deja un clic de mouse (RF-25).
- `z-index: 2` + `position: relative`: la sombra de la card agrandada queda sobre
  las vecinas (RF-22). Con `scale: 1.08`, una card de 154 px (grilla de 6
  columnas) crece 6 px por lado y una de 220 px (Home, 4 columnas) 9 px; la
  separación es 12 px (`gap-3`), así que **no llega a pisar a la vecina**.
- Una `transition` sobre `scale` se revierte desde donde esté si el cursor sale
  a mitad de camino: no hay salto (RF-26).
- `StickerCard` deja `card-glass-hover` (el resaltado de borde y sombra pasa a
  `.sticker-card`) y la imagen pierde `transition-transform duration-500
  hover:scale-105`: un solo movimiento (RF-23). **`card-glass-hover` no se
  modifica**: la usan `CategoryCard`, las cards de fallback del Home y otras.
- El comentario de la imagen sobre `p-2` ("8 px por lado, más que los 4 px que
  se come el `scale-105`") se reescribe: el zoom de la imagen ya no existe, y el
  padding queda como aire alrededor del calco.

### 1.7 Movimiento reducido

Doble guarda:
1. JS: con `useReducedMotion()` en `true`, `.hero--entrada` nunca se pone.
2. CSS, en el bloque `@media (prefers-reduced-motion: reduce)` que ya existe al
   final de `index.css`:
   ```css
   .hero-malla__mancha,
   .hero--entrada .hero-pieza,
   .hero--entrada .hero-saludo__frase { animation: none !important; }
   .sticker-card { transition: border-color 0.25s ease, box-shadow 0.25s ease; }
   .sticker-card:hover { scale: none; }
   .sticker-card:has(:focus-visible) { scale: none; }
   ```
   (el `:hover` y el `:has()` van en reglas separadas por el mismo motivo de §1.6).

Sin animación, el estado base ya es el final: frase final visible, piezas en su
lugar, fondo con los colores de hoy.

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Saludo en una línea **arriba** del H1 | Que el H1 diga "BIENVENIDO" | Rompe `hero_titular` (el H1 es la variable) y el piso de SEO de la spec 015: `heroVariantes.test.js` exige "calcos" en el H1 o el subtítulo de cada variante. |
| Entrada ≤ 1,2 s, H1 visible desde el cuadro 1 | Splash "BIENVENIDO" a pantalla completa y después el sitio | Demora el CTA y el LCP varios segundos para tráfico de anuncios en celular: fricción en el camino de compra (regla 12). |
| Una vuelta de frases (≤ 5 s) | Loop infinito | Spec 014 sacó el titular rotante por competir; WCAG 2.2.2 pediría un botón de pausa. |
| CSS puro con custom properties | `setInterval` + estado en React | Cero re-renders del hero cada 1,5 s; el CSS se apaga solo con reduced-motion. |
| Manchas con `transform` | Animar `background-position` | Repinta el hero entero cada cuadro. |
| Propiedad `scale` | `transform: scale()` | Muerta bajo `grid-rise` (§0). |
| Librería de animación (Framer Motion, GSAP) | — | Regla 10: CSS alcanza para todo lo pedido, y cualquiera de las dos suma decenas de kB al bundle del Home, que es eager. |

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/components/Hero.jsx` | `ref` + modificador `--vivo` + capa `.hero-malla` + saludo + clases de pieza + bandera de "una vez" + IntersectionObserver. Comentario de cabecera: sumar el porqué del saludo y de la entrada. | 🟡 es el componente de los experimentos: no se toca `TITULARES`, `CTA_PRINCIPAL` ni `useExperiment` |
| `frontend/src/components/StickerCard.jsx` | `card-glass-hover` → `sticker-card`; la imagen pierde su zoom; comentario de `p-2` actualizado | 🟢 solo clases |
| `frontend/src/styles/index.css` | Bloques nuevos en "Motion graphics": `.hero-gradient--vivo`, `.hero-malla*`, keyframes `malla-deriva-*`, `.hero-saludo*`, `saludo-*`, `.hero-pieza*`, `hero-sube/aparece`, `[data-pausado]`, `.sticker-card`. Suma al bloque final de reduced-motion. | 🟡 archivo grande y compartido; solo se **agregan** reglas, no se edita ninguna existente |
| `docs/CRO-EXPERIMENTS.md` | Corte en la serie con la fecha del deploy del hero | 🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/heroSaludo.js` | Frases del saludo y sus tiempos; `duracionSaludoMs()` |
| `frontend/src/lib/heroSaludo.test.js` | Guardarraíles del copy y del tope de 5 s |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** | — |
| `frontend/src/config/site.js` | **No** (Hero solo lee `isSectionHidden`, como hoy) | — |
| `frontend/src/context/CartContext.jsx` | **No** (StickerCard lo usa igual que hoy) | — |
| `netlify/functions/lib/pricing.js` | **No** | — |
| `frontend/src/lib/analytics.js` | **No** (además tiene WIP ajeno de la spec 023: no se stagea) | — |

Otros compartidos que sí se miraron:

| Pieza | Quién la usa | Qué se hace |
|---|---|---|
| `.hero-gradient` | `Hero`, `PaymentSuccess`, `PaymentPending`, `PaymentError`, `PaymentTransfer` | **No se edita**; el Home usa un modificador |
| `.card-glass-hover` | `StickerCard`, `CategoryCard`, fallback de categorías del Home, otros | **No se edita**; `StickerCard` deja de usarla |
| `StickerCard` | `Category.jsx`, `LandingUso.jsx`, `FeaturedStickers.jsx` | Las tres grillas reciben el hover (RF-21) |
| `.grid-rise` | `Category.jsx`, `LandingUso.jsx`, otros | **No se toca** (hallazgo §8) |

```bash
grep -rn "hero-gradient\|card-glass-hover\|StickerCard\|grid-rise" frontend/src
```

---

## 3. Datos

Nada persistente. Ni `localStorage`, ni `sessionStorage`, ni forma de carrito.
La única "memoria" es una variable de módulo que dura lo que dura la pestaña.

---

## 4. APIs e integraciones

Ninguna.

---

## 5. Seguridad

Sin superficie nueva: no hay input, ni red, ni secretos.

---

## 6. Manejo de errores

| Falla | Qué pasa |
|---|---|
| Navegador sin `scale` (Chrome < 104, Safari < 14.1) | La card no crece; el resto igual. |
| Navegador sin `:has()` | No crece con teclado; con mouse sí (reglas separadas). |
| Sin `IntersectionObserver` | El fondo no se pausa fuera de pantalla; todo lo demás igual. |
| Sin `aspect-ratio` | Las manchas quedan con alto 0 → fondo negro liso. Soporte desde Safari 15 / Chrome 88: aceptable. |
| La animación no corre (ahorro de batería, WebView viejo) | Estado base = estado final: hero completo y quieto. |

---

## 7. Estrategia de migración y deploy

- Sin datos que migrar.
- **Dos commits**, para poder deployarlos por separado (Q1):
  1. `feat(ui): la card de calco crece al pasar el cursor (spec 024)` —
     `StickerCard.jsx` + bloque `.sticker-card` de `index.css`.
  2. `feat(home): hero en movimiento con saludo y entrada (spec 024)` — el
     resto + el corte en `CRO-EXPERIMENTS.md`.
- Si Q1 se contesta "esperar", el commit 1 se pushea y el 2 queda **local** hasta
  el OK.
- Rollback: `git revert` del commit que corresponda. Nada queda guardado en el
  navegador de nadie.
- ⚠️ El árbol tiene WIP de la spec 023 sin commitear (`lib/analytics.js`,
  `routes/Personalizados.jsx`, `components/personalizados/*`, etc.). **Se stagea
  archivo por archivo**; `Hero.jsx`, `StickerCard.jsx` e `index.css` hoy no
  tienen cambios ajenos, pero se revisa con `git diff` antes de cada `add`.

---

## 8. Hallazgos fuera de scope

- **`grid-rise` usa `fill-mode: both`** y congela `transform` y `opacity` de cada
  hijo para siempre. Mata el hover de cualquier card que se ponga en esas
  grillas (hoy: el "sube 4 px"). Arreglo probable: `backwards`. Se propone
  aparte porque cambia la entrada de todas las grillas del sitio.
- **El comentario de `Hero.jsx` sobre el LCP** dice que la primera calco del
  campo "es la que define el LCP". Por tamaño de área, en desktop el H1 le gana
  seguro y en mobile el H1 y el subtítulo compiten. No cambia nada de esta spec
  (ninguno de los tres se esconde), pero el comentario puede estar desactualizado.
  Se mide en la validación con Lighthouse y, si corresponde, se corrige el
  comentario en esta misma spec (es documentación del archivo que se toca).
