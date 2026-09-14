# Design — Sistema de motion graphics

| | |
|---|---|
| **Spec** | `024-motion-graphics` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 14/09/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, bastante.** `lib/motion.js` ya exporta `useReducedMotion()`. `components/Reveal.jsx` ya hace scroll reveal con `IntersectionObserver` de un solo disparo. `styles/index.css` ya tiene `.reveal`, `.grid-rise` (stagger por `nth-child`), `.card-glass-hover`, `.sticker-float` + `@keyframes floaty`, `.hero-aurora`, `.gradient-text`, los dos tickers y el relámpago del contador de promo. **Lo que falta no es movimiento: es sistema.** |
| ¿Qué archivos están involucrados? | `styles/index.css` (1.044 líneas, el 40 % ya es animación), `lib/motion.js`, `components/Reveal.jsx`, `App.jsx`, `Header.jsx`, `CartDrawer.jsx`, `Hero.jsx`, `StickerCard.jsx`, `CategoryCard.jsx`, `BuscadorModal.jsx`, `WelcomePopup.jsx`, `SizeGuide.jsx`, `personalizados/PasoSelector.jsx`, `personalizados/SubidaArchivo.jsx` |
| ¿Hay tests que lo cubran hoy? | **No.** La suite corre en `environment: 'node'` (ver `vite.config.js`): no hay jsdom, no hay tests de componentes. Los 524 tests son de lógica pura. Lo que se puede testear de esta feature es la parte pura: los tokens y el cálculo de stagger. |
| ¿Toca el camino de precios? | **No.** Ni `config/pricing.js`, ni `netlify/functions/lib/pricing.js`, ni el cálculo del carrito. |
| ¿Hay comentarios que expliquen por qué está así? | **Sí, y dos son determinantes.** (1) `MetricasConfianza.jsx`: *"Acá no hay animación de ningún tipo (más allá del reveal de entrada): un número que se mueve no se puede leer, y estos tres son el argumento."* → **el count-up del pedido §16 queda fuera de scope**, no por costo sino porque contradice la razón de ser de la sección. (2) `Hero.jsx`: *"un titular que rotaba entre 5 frases con animación permanente"* fue **quitado a propósito** en la spec 014 → el hero recibe una entrada **de una sola vez**, nunca un loop. (3) `StickerCard.jsx` documenta que el `p-2` del contenedor está calculado para que el `scale-105` del hover no desborde: **si se sube el scale, se corta la imagen**. |

> **Nada de lo que tiene un comentario se revierte.** Esta spec agrega sistema
> alrededor de lo que ya está decidido.

---

## 1. Arquitectura propuesta

Una capa de tokens, dos consumidores.

```
          styles/index.css  :root
          ┌──────────────────────────────┐
          │  --motion-fast   140ms       │   ← única fuente de verdad
          │  --motion-quick  200ms       │
          │  --motion-normal 320ms       │
          │  --motion-slow   520ms       │
          │  --motion-ease   cubic-…     │
          │  --motion-spring cubic-…     │
          │  --motion-distance 20px      │
          └──────────┬───────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
   clases .motion-*          lib/motion.js  (MOTION)
   (CSS puro, sin JS)        números para el JS que
        │                     los necesita (timeouts)
        │                          │
   componentes                componentes
   (className)                (useState + setTimeout)
```

**Por qué los números viven duplicados en CSS y en JS**: el JS necesita saber
cuánto dura una salida para desmontar *después* (el drawer), y cuánto dura una
confirmación para volver al estado normal (el botón "+"). Un `getComputedStyle`
por animación sería un reflow por interacción. Se duplican **doce números** en un
solo archivo cada uno, con un test que verifica que no se separen.

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| CSS + `IntersectionObserver` propio | Framer Motion (~34 kB gz), GSAP (~23 kB gz), Motion One (~4 kB gz) | `CLAUDE.md` regla 10. Todo lo que pide el brief se resuelve con `transform`/`opacity`. Ninguna librería paga su peso en un sitio cuyo LCP es una imagen del hero. Motion One era la única defendible por peso, pero no aporta nada que estas clases no hagan |
| Tokens en `:root` del CSS, espejados en `lib/motion.js` | Solo en `tailwind.config.js` | Tailwind no puede darle su valor a un `@keyframes`, y la mitad del movimiento del repo ya vive en CSS plano |
| Clases utilitarias `.motion-*` | Un componente `<Motion>` por animación | El repo no tiene componentes wrapper salvo `Reveal`; una clase no agrega un nodo al árbol ni un render |
| Stagger por variable CSS `--i` | Seguir con `nth-child` como `.grid-rise` | `nth-child` obliga a escribir una regla por posición (hoy hay 11) y se corta en la 11.ª. Con `--i` el índice lo pone el `map()` que ya existe. **`.grid-rise` se mantiene intacto**: lo usan 4 archivos y funciona |
| Desmontaje diferido del drawer | `visibility: hidden` permanente | Dejar el drawer montado deja sus botones en el orden de tabulación y su contenido en el árbol de accesibilidad |
| Reveal a 420 ms (antes 700) | Dejar 700 ms | El brief pide 400–600 ms. 700 ms sobre un `translateY` de 26 px se lee como pesado |
| **Sin scroll progress bar** | Implementarla (brief §24, *"opcional — solo si no genera ruido"*) | Arriba ya conviven banner de promo + nav + tira de anuncios, y el header se compacta al scrollear. Una cuarta barra pelea con las tres. El propio brief la condiciona a que no compita: acá compite |
| **Sin parallax de scroll** | Agregarlo (brief §25) | El hero ya tiene tres capas de movimiento (aurora, calcos flotantes, parallax de puntero). Una cuarta sobre los mismos 600 px es exactamente el *"abuso de parallax"* que el brief §2 prohíbe |
| Transición de página **solo con opacidad**, en todas las rutas | Un fade con `translateY`, que era el plan original | Ver §1.1: está **medido**. Un `transform` o un `filter` en el contenedor de la ruta despega del viewport a las barras `position: fixed` que son CTA de compra; `opacity` no |
| Stagger al scrollear con `.reveal-hijo` | Un `<Reveal>` por card | Ver §1.2: adentro de un carrusel horizontal, un observer por card deja invisibles a las que arrancan fuera de pantalla |

### 1.1 Medición: qué puede animar el contenedor de una ruta

El plan original excluía del fade a las rutas con barra fija. Se midió sobre la
app real (Chromium, ficha de producto a 375 px, viewport de 812 px, barra anclada
a `bottom: 0`) y resultó que la exclusión **no hacía falta** — pero que el motivo
por el que parecía hacer falta es real y hay que dejarlo escrito:

| Sobre el contenedor de la ruta | `bottom` de la barra fija | |
|---|---|---|
| nada | 812 px | ✅ pegada al viewport |
| `opacity: 0.5` | 812 px | ✅ pegada al viewport |
| `transform: translateY(10px)` | **2972 px** | ❌ se despega 2.160 px |
| `filter: blur(1px)` | **2962 px** | ❌ se despega 2.150 px |

`opacity` crea un *stacking context*, pero **no** un bloque contenedor para los
descendientes `position: fixed`; `transform` y `filter` sí. Por eso el fade se
aplica en **todas** las rutas y la lista de exclusión se borró — y por eso el
comentario de `PageFade` en `App.jsx` prohíbe explícitamente convertirlo en un
deslizamiento, que es la "mejora" obvia que alguien va a intentar.

Barras afectadas si se hiciera: `StickyMobileBar` (`/producto/*`, `/tatuajes`,
`/polaroid`) y la barra mobile de `ResumenPedido` (`/personalizados`).

### 1.2 Medición: por qué el stagger al scrollear necesita su propio primitivo

Los testimonios del Home viven en un carrusel horizontal (`.carrusel-snap`).
Envolver cada card en su propio `<Reveal>` —que es lo que hace el resto del
sitio— falló de dos formas, las dos medidas:

1. **Las tres cards quedaban en `opacity: 0` con la sección a la vista.** Las
   cards 2 y 3 arrancan fuera del viewport *hacia la derecha*, así que su
   `IntersectionObserver` no dispara nunca. La prueba social, invisible.
2. **El wrapper por card rompía el alto parejo del flex**: 437 / 457 / 437 px
   donde antes las tres medían igual.

Solución: `.reveal-hijo`. UN observer sobre el contenedor (`<Reveal>`) y los
hijos escalonados con `transition-delay` en vez de un observer cada uno. Medido
después: anchos 275/275/275, altos 457/457/457, delays 0 / 60 / 120 ms, las tres
visibles.

`.motion-stagger` (escalonado al montar) sigue existiendo para grillas que ya
están en pantalla; `.reveal-hijo` es para las que hay que esperar.

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/styles/index.css` | Bloque de tokens en `:root`; clases `.motion-*`; `:active` en los `.btn-*`; entradas de drawer/modal; ampliación del bloque `prefers-reduced-motion` | 🟡 |
| `frontend/src/lib/motion.js` | Agrega `MOTION`, `staggerDelay()`, `varStagger()`, `useMountedFlag()`, `useFlash()`, `usePulseOnChange()`, `useMontajeAnimado()`. **`useReducedMotion()` no se toca** | 🟢 |
| `frontend/src/components/Reveal.jsx` | Usa el token de duración; acepta `stagger` para escalonar hijos | 🟢 |
| `frontend/src/App.jsx` | Envuelve `<Routes>` en un contenedor con fade por `key={pathname}` | 🟡 |
| `frontend/src/components/Header.jsx` | Sombra al compactar; pulso del contador; menú mobile animado | 🟡 |
| `frontend/src/components/CartDrawer.jsx` | Entrada/salida con desmontaje diferido | 🟡 |
| `frontend/src/components/Hero.jsx` | Secuencia de entrada por CSS | 🟢 |
| `frontend/src/components/StickerCard.jsx` | Confirmación "✓" en el botón "+" | 🟡 |
| `frontend/src/components/CategoryCard.jsx` | Lift del texto y overlay en hover | 🟢 |
| `frontend/src/components/BuscadorModal.jsx` | Entrada del panel | 🟢 |
| `frontend/src/components/WelcomePopup.jsx` | Entrada del modal | 🟢 |
| `frontend/src/components/SizeGuide.jsx` | Despliegue animado | 🟢 |
| `frontend/src/components/personalizados/PasoSelector.jsx` | Check animado en la opción elegida | 🟢 |
| `frontend/src/components/personalizados/SubidaArchivo.jsx` | Zona de arrastre animada; confirmación por archivo | 🟢 |
| `frontend/src/components/Beneficios.jsx`, `HowToBuy.jsx`, `Testimonials.jsx`, `IntentSelector.jsx` | Pasan su delay por el helper de stagger | 🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/motion.test.js` | Verifica los tokens y el cálculo de stagger (lo único puro de la feature) |

Clases nuevas del sistema: `.motion-fade-up`, `.motion-fade`, `.motion-scale-in`,
`.motion-stagger`, `.reveal-hijo`, `.motion-press`, `.motion-pop`,
`.motion-check-in`, `.motion-zoom`, `.motion-overlay-in/out`,
`.motion-panel-in/out`, `.motion-page`, `.motion-menu`, `.motion-dropzone`,
`.hero-entra`, `.hero-cta-nudge`, `.header-sombra`.

### ⚠️ Módulos compartidos

`CLAUDE.md` regla 9.

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **NO** | 26 archivos |
| `frontend/src/config/site.js` | **NO** | 21 archivos |
| `frontend/src/context/CartContext.jsx` | **NO** | 30 archivos — se **consume** (`totalItems`, `drawerOpen`), no se modifica |
| `netlify/functions/lib/pricing.js` | **NO** | — |
| `frontend/src/lib/analytics.js` | **NO** | 21 archivos |

`lib/motion.js` pasa a ser compartido. Hoy lo importan 3 archivos:

```bash
grep -rn "lib/motion" frontend/src netlify/
# frontend/src/components/StickerField.jsx
# frontend/src/routes/Home.jsx
# frontend/src/components/Reveal.jsx  (nuevo)
```

**`useReducedMotion()` se deja exactamente como está** — es lo que esos dos
archivos importan. Todo lo nuevo se agrega al lado.

---

## 3. Datos

### Estructuras nuevas o modificadas

```js
// lib/motion.js — espejo en JS de los tokens del CSS
export const MOTION = {
  fast: 140, quick: 200, normal: 320, slow: 520, lento: 800,
  stagger: 60, staggerMax: 480,
  flash: 1100,          // cuánto dura el "✓" del botón
  pulse: 320,           // cuánto dura el pulso del contador
  distance: 20          // px del translateY de las entradas
};
```

### Persistencia
Ninguna. Esta feature **no escribe en `localStorage`, ni en Blobs, ni en el
catálogo.**

### ⚠️ Compatibilidad con datos existentes
- [x] **No** cambia la forma de las líneas del carrito → `epicalcos.cart.v2`
      intacto.
- [x] **No** cambia la forma del pedido en Blobs.

---

## 4. APIs

Ninguna. No se toca ningún endpoint, ningún contrato y ningún redirect de
`netlify.toml`.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | ninguno | no |
| Notion | ninguno | no |
| Resend | ninguno | no |
| Cloudinary | ninguno | no |
| Meta (Pixel / CAPI) | ninguno | no |
| CRM interno | ninguno | no |

**Regla propia de esta spec**: el feedback visual **nunca** se interpone entre el
click y su handler. En `StickerCard`, `addSticker()` y su `trackAddToCart()`
corren primero y el `setState` del "✓" después, en la misma función. Si el estado
del "✓" tirara una excepción, el calco ya está en el carrito y el evento ya se
disparó.

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

`CLAUDE.md` regla 14.

- [x] Ningún secreto: la feature no lee ni una variable de entorno.
- [x] El servidor no participa.
- [x] Sin payloads nuevos.
- [x] Sin PII: no se registra ni una interacción.
- [x] Sin endpoints nuevos → sin CORS que revisar.
- [x] **CSP**: no se agrega ningún `<script>`, ni CSS remoto, ni `eval`. Las
      animaciones son CSS propio y `style` inline con custom properties
      (`--i`, `--motion-delay`), que la CSP actual ya permite —`StickerField` y
      `Reveal` ya lo hacen hoy.

| Riesgo | Mitigación |
|---|---|
| Una animación tapa un CTA y cuesta ventas | Ninguna entrada bloquea `pointer-events`; el hero usa `animation-fill-mode: both` sobre elementos ya interactuables |
| El drawer queda montado y captura el foco | El desmontaje se dispara con `setTimeout` **y** se limpia en el `useEffect`; con reduced-motion el desmontaje es inmediato |
| Un `setTimeout` corre después de desmontar el componente | Todo `setTimeout` de esta feature se limpia en el return del `useEffect` |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Sin `IntersectionObserver` | `Reveal` muestra el contenido de inmediato (ya lo hace hoy) | El contenido, sin animación |
| Sin `matchMedia` | `useReducedMotion()` devuelve `false` (ya lo hace hoy) | Las animaciones corren |
| JS de animación roto | Ninguna clase de entrada oculta contenido de forma permanente: el estado por defecto de `.motion-*` en el HTML entregado es **visible**, y la animación **es** la entrada | El contenido |
| CSS no carga | Sin clases no hay animación; el HTML es legible | El contenido sin estilo |

**El principio que gobierna el punto 3**: ninguna animación de entrada se
implementa como *"opacity: 0 y que el JS lo prenda"* salvo `Reveal`, que ya
maneja los dos fallbacks (sin IO y sin JS, vía el bloque de reduced-motion que
fuerza `opacity: 1`).

---

## 8. Estrategia de migración

No aplica: no hay datos ni comportamiento previo que migrar.

- **Carritos guardados**: intactos, no se toca su forma.
- **Rollback**: `git revert` del commit. No hay estado que quede a medias.
- **Feature flag**: no hay. El interruptor real es del usuario —
  `prefers-reduced-motion`— y apaga todo lo no esencial sin deploy.

---

## 9. Testing

### Tests nuevos
| Archivo | Qué verifica |
|---|---|
| `frontend/src/lib/motion.test.js` | Que `MOTION` tenga los valores esperados y estén en el orden fast < quick < normal < slow; que `staggerDelay()` escale y tope; que `varStagger()` devuelva la custom property; que los valores de `MOTION` coincidan con los tokens declarados en `index.css` (**test de paridad CSS↔JS**) |

El último es el importante: es el mismo patrón que la paridad de precios del repo
—dos archivos que dicen lo mismo y un test que lo exige— aplicado a los tokens.

### ⚠️ Tests de paridad de precios
⏭️ **No aplica.** La feature no toca precios, promos, cupones ni envíos.

### Verificación manual
- [ ] Recorrido completo de compra a 375 px
- [ ] Recorrido completo con `prefers-reduced-motion: reduce`
- [ ] Sin errores de consola en Home, categoría, ficha, carrito y checkout
- [ ] Sin CLS visible al cargar el Home
- [ ] `npm run build` en verde

---

## 10. Dependencias nuevas

**Ninguna.** El `package.json` no cambia — es un criterio de aceptación (ANF-5).

---

## 11. Preguntas abiertas del diseño

Ninguna.
