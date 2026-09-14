# Tasks — Sistema de motion graphics

| | |
|---|---|
| **Spec** | `024-motion-graphics` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETA` |

---

## ⛔ Antes de tocar una sola línea

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] **Mariano pidió explícitamente la implementación** — *"Analizá el
      repositorio, implementá los cambios directamente, ejecutá el proyecto,
      testealos y corregí los errores"* (pedido del 14/09/2026, §38 y cierre)

---

## Fase 0 — Preparación

- [x] **0.1** Leer `styles/index.css` entero, `lib/motion.js`, `Reveal.jsx` y los
      componentes del camino de compra
  - *Verificación*: quedó documentado en `design.md` §0 qué movimiento ya existe
- [x] **0.2** Correr la suite y confirmar verde de partida
  - *Verificación*: **524 tests en 34 archivos, todos pasan**
- [x] **0.3** Rama de trabajo
  - *Verificación*: `claude/epicalcos-motion-graphics-ibccqi`

---

## Fase 1 — Sistema de tokens (RF-1)

- [x] **1.1** Declarar los tokens en `:root`
  - *Archivo*: `frontend/src/styles/index.css`
  - *Verificación*: existen `--motion-fast/quick/normal/slow/lento`,
    `--motion-ease`, `--motion-ease-out`, `--motion-spring`, `--motion-stagger`,
    `--motion-distance`
- [x] **1.2** Espejar los tokens en JS
  - *Archivo*: `frontend/src/lib/motion.js` → `MOTION`
  - *Verificación*: cada número de `MOTION` tiene su token en el CSS
- [x] **1.3** Helpers puros: `staggerDelay()` y `varStagger()`
  - *Verificación*: `staggerDelay(0)` = 0; escala con el índice; topea en `staggerMax`
- [x] **1.4** Test de paridad CSS ↔ JS
  - *Archivo*: `frontend/src/lib/motion.test.js`
  - *Verificación*: el test **lee `index.css`** y compara contra `MOTION`; si
    alguien cambia un lado, la suite se pone roja

---

## Fase 2 — Microinteracciones (PRIORIDAD 1 — RF-2, RF-3, RF-4, RF-15)

- [x] **2.1** `:active` en `.btn-primary`, `.btn-secondary`, `.btn-ghost`
  - *Archivo*: `styles/index.css`
  - *Verificación*: comprimen a 0.97–0.98 en `:active`; anulado en reduced-motion
- [x] **2.2** Clase `.motion-press` para los botones que no usan `.btn-*`
  - *Verificación*: aplicable a cualquier control sin heredar el estilo de los `btn-*`
- [x] **2.3** Confirmación "✓" en el botón "+" de `StickerCard`
  - *Archivo*: `components/StickerCard.jsx` + hook `useFlash()`
  - *Verificación*: `addSticker()` corre **antes** del `setState`; el "+" pasa a
    "✓" ~1,1 s y vuelve; toques repetidos reinician el timer sin perder agregados
- [x] **2.4** Pulso del contador del carrito en el header
  - *Archivo*: `components/Header.jsx` + hook `usePulseOnChange()`
  - *Verificación*: pulsa al cambiar `totalItems`; **no** pulsa en el primer
    render (carrito restaurado de `localStorage`)
- [x] **2.5** Lift del contador sobre la imagen en `StickerCard`
  - *Verificación*: el badge de cantidad entra con `scale` cuando aparece
- [x] **2.6** Hover de `CategoryCard`: texto que sube + overlay
  - *Verificación*: sin tocar el `scale-110` de la imagen, que ya estaba

---

## Fase 3 — Carrito y capas (RF-5, RF-6, RF-11)

- [x] **3.1** Hook `useMontajeAnimado()` — monta al abrir, desmonta al terminar la salida
  - *Archivo*: `lib/motion.js`
  - *Verificación*: con reduced-motion el desmontaje es inmediato; el timer se
    limpia al desmontar
- [x] **3.2** Drawer del carrito con entrada/salida
  - *Archivo*: `components/CartDrawer.jsx`
  - *Verificación*: `translateX(100%) → 0` + overlay en fade; al cerrar, inversa;
    no queda nada montado después
- [x] **3.3** Entrada del modal de búsqueda
  - *Archivo*: `components/BuscadorModal.jsx`
  - *Verificación*: el panel entra con fade + subida; la trampa de foco, el
    `Escape` y el bloqueo de scroll **siguen intactos**
- [x] **3.4** Entrada del popup de bienvenida
  - *Archivo*: `components/WelcomePopup.jsx`
  - *Verificación*: overlay en fade + card con `scale`
- [x] **3.5** Despliegue de la guía de tamaños
  - *Archivo*: `components/SizeGuide.jsx`
  - *Verificación*: abre con fade + subida, sin animar `height` (no hay CLS)

---

## Fase 4 — Scroll reveal y stagger (PRIORIDAD 2 y 4 — RF-8)

- [x] **4.1** `Reveal` con duración del token y soporte de `stagger`
  - *Archivo*: `components/Reveal.jsx`
  - *Verificación*: la duración sale de `--motion-reveal`; `stagger` escalona los
    hijos sin agregar nodos
- [x] **4.2** Clase `.motion-stagger` por `--i`
  - *Archivo*: `styles/index.css`
  - *Verificación*: funciona más allá del ítem 11 (donde `.grid-rise` se corta)
- [x] **4.4** Primitivo `.reveal-hijo` — stagger disparado por el viewport
  - *Archivo*: `styles/index.css` + `components/Testimonials.jsx`
  - *Verificación*: UN observer por bloque; los hijos escalonan con
    `transition-delay` (medido: 0 / 60 / 120 ms); funciona adentro de un carrusel
    horizontal, donde un observer por card no dispara nunca
- [x] **4.3** Pasar los delays a `staggerDelay()` en los consumidores de `Reveal`
  - *Archivos*: `Beneficios.jsx`, `HowToBuy.jsx`, `Testimonials.jsx`,
    `IntentSelector.jsx`, `FeaturedStickers.jsx`, `MetricasConfianza.jsx`,
    `routes/Home.jsx`
  - *Verificación*: ningún delay escrito a mano queda en esos archivos

---

## Fase 5 — Hero y navegación (PRIORIDAD 3 — RF-7, RF-9, RF-10, RF-14)

- [x] **5.1** Secuencia de entrada del hero
  - *Archivo*: `components/Hero.jsx` + `.hero-entra-*` en el CSS
  - *Verificación*: H1 → subtítulo → CTA, total ≤ 800 ms; los CTA son
    clickeables desde el frame 0 (`animation-fill-mode: both`, sin `pointer-events`)
- [x] **5.2** Header: sombra y fondo al compactar
  - *Archivo*: `components/Header.jsx`
  - *Verificación*: transición de ~200 ms; **no** cambia el alto (no hay CLS)
- [x] **5.3** Menú mobile animado con stagger
  - *Archivo*: `components/Header.jsx`
  - *Verificación*: abre con fade + subida; los ítems entran escalonados
- [x] **5.4** Transición de página
  - *Archivo*: `App.jsx`
  - *Verificación*: fade de 180 ms **solo de opacidad**, reiniciado sin remontar
    el árbol de la ruta; sin loader nuevo; el `Suspense` de las rutas lazy sigue
    igual; las barras `position: fixed` siguen pegadas al viewport (medido)

---

## Fase 6 — Personalizados (RF-12, RF-13)

- [x] **6.1** Check animado en la opción elegida de `PasoSelector`
  - *Archivo*: `components/personalizados/PasoSelector.jsx`
  - *Verificación*: el check entra con `scale`; el badge del paso se marca como
    cumplido; `aria-pressed` intacto
- [x] **6.3** Zoom sutil en la imagen de la ficha de producto (brief §10)
  - *Archivo*: `routes/Producto.jsx` + `.motion-zoom`
  - *Verificación*: `scale(1.035)` en hover con `overflow: hidden`; el padding del
    contenedor garantiza que el recorte no toque el calco
- [x] **6.2** Zona de arrastre animada + confirmación por archivo
  - *Archivo*: `components/personalizados/SubidaArchivo.jsx`
  - *Verificación*: el borde y el fondo cambian en drag-over con transición; cada
    archivo entra con animación y el "subido ✓" aparece con un `pop`

---

## Fase 7 — Accesibilidad y performance (RNF-2, RNF-3, RNF-4)

- [x] **7.1** Ampliar el bloque `prefers-reduced-motion`
  - *Archivo*: `styles/index.css`
  - *Verificación*: **toda** clase `.motion-*` nueva está cubierta
- [x] **7.2** Confirmar que solo se animan `transform`, `opacity` y `filter`
  - *Verificación*: `grep` de `transition:` sobre las clases nuevas
- [x] **7.3** Confirmar que no se agregó ningún listener de scroll
  - *Verificación*: el único `scroll` del repo sigue siendo el del header, con `{ passive: true }`

---

## Fase 8 — Tests y cierre

- [x] **8.1** Suite completa en verde
  - *Verificación*: **529 tests en 35 archivos** (524 previos + 5 nuevos)
- [x] **8.2** Build de producción en verde
  - *Verificación*: `npm run build --prefix frontend`
- [x] **8.3** Validar contra `acceptance.md` punto por punto
- [x] **8.4** Commit + push a la rama de la feature
- [x] **8.5** Marcar la spec como `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| El brief §16 pide count-up en los números del negocio, pero el componente tiene escrito por qué **no** se mueven (*"un número que se mueve no se puede leer, y estos tres son el argumento"*) | `components/MetricasConfianza.jsx` | **No se hizo.** Si se quiere, va como decisión comercial explícita, no como efecto |
| `.grid-rise` resuelve el stagger con 11 reglas `nth-child` y se aplana a partir del ítem 11 | `styles/index.css` | Reemplazable por `.motion-stagger` (ya implementada). Son 4 archivos: `SuggestedStickers`, `LandingUso`, `Categorias`, `Category`. Se dejó como está — regla 8 |
| `Reveal` observa un `IntersectionObserver` por instancia; en `/categorias` hay ~61 | `components/Reveal.jsx` | Un observer compartido bajaría el costo. No se tocó: no hay evidencia de que hoy moleste |
| El `.toast` vive en un solo lugar del árbol y sale a 2.200 ms fijos, sin animación de salida | `context/CartContext.jsx` | Se dejó intacto a propósito: es un módulo compartido (30 importadores) y el pedido se cubre con el "✓" en el botón |
| `CategoryCard` hace un crossfade con `setTimeout(200)` escrito a mano | `components/CategoryCard.jsx` | Podría salir de `MOTION.quick`. No se tocó: cambiar ese número cambia el timing de la precarga de imágenes, que es otra cosa |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 14/09/2026 | Se agregó `useMountedFlag()`, no previsto en `design.md` §2 | El hero necesita distinguir el primer montaje de una re-renderización para no repetir su entrada cuando cambia una variante de experimento |
| 14/09/2026 | El test de paridad lee `index.css` con `readFileSync` en vez de comparar constantes | Comparar dos constantes de JS no prueba nada: el token del CSS es el que usa el navegador |
| 14/09/2026 | El fade de página arrancó con una lista de rutas excluidas (las que tienen barra fija) y terminó aplicándose en TODAS | Se midió en el navegador: `opacity` no crea bloque contenedor para `position: fixed`; `transform` y `filter` sí. La exclusión no hacía falta. El motivo quedó escrito en `App.jsx` con los números, porque la "mejora" obvia —sumarle un `translateY`— sí rompería las barras de compra |
| 14/09/2026 | Los testimonios no usan `<Reveal>` por card sino `.reveal-hijo`, un primitivo nuevo | Un observer por card no dispara nunca para las cards que arrancan fuera del viewport en un carrusel horizontal: las tres quedaban invisibles. Además el wrapper por card rompía el alto parejo (437/457/437) |
| 14/09/2026 | `onScroll` se quedó en el div del carrusel en vez de pasar al `<Reveal>` | `Reveal` no reenvía props sueltas: ahí se habría perdido `trackTestimonialInteraction` en silencio. Una animación no puede llevarse puesto un evento de analytics |
