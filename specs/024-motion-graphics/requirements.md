# Requirements — Sistema de motion graphics

| | |
|---|---|
| **Spec** | `024-motion-graphics` |
| **Estado** | `DONE` |
| **Fecha** | 14/09/2026 |
| **Autor** | Mariano (pedido) + Claude Code (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

EPICALCOS ya tiene movimiento, pero **no tiene un sistema de movimiento**. Lo que
hay hoy creció por spec: el reveal de la spec 014, los tickers de la 007 y la
020, el relámpago del contador de la 017, las calcos flotantes del hero. Cada uno
eligió su propia duración y su propia curva a mano — conviven `0.15s`, `0.2s`,
`0.25s`, `0.4s`, `0.5s`, `0.55s` y `0.7s` con `ease`, `ease-out`,
`cubic-bezier(0.2, 0.8, 0.2, 1)` y `linear`, sin que ninguna de esas diferencias
signifique nada.

La consecuencia observable, recorriendo el sitio:

1. **El camino de compra no devuelve nada al tocar.** `btn-primary` y
   `btn-secondary` reaccionan al hover (que en celular no existe) pero **no al
   `:active`**. En mobile —la mayoría del tráfico, que viene de anuncios de
   Instagram— tocar "Comprar", "Ir al checkout" o "Agregar al carrito" no produce
   ninguna respuesta visual hasta que la pantalla siguiente termina de montar.
2. **El carrito aparece de golpe.** El drawer hace `if (!drawerOpen) return null`:
   entra y sale sin transición, ocupando media pantalla de un frame al otro. Es
   la pantalla más vista de la compra (se abre en cada "+" de la grilla).
3. **Agregar un calco no se confirma en el lugar donde se tocó.** El único aviso
   es un toast abajo a la izquierda del centro, a ~600 px del botón "+" que se
   tocó en la grilla. El contador sobre la imagen cambia de número sin que nada
   llame la atención sobre el cambio.
4. **El contador del carrito del header cambia en silencio.** El número pasa de 2
   a 3 sin ningún movimiento: no hay forma de saber que la acción funcionó
   mirando el header.
5. **El hero aparece entero de una.** El H1, el subtítulo y los dos CTA se pintan
   en el mismo frame que el fondo: no hay jerarquía temporal que dirija la
   mirada, y es la primera pantalla que ve el tráfico de anuncios.
6. **El menú mobile abre sin transición** (`{open && <div>}`), igual que el
   popup de bienvenida, la búsqueda a pantalla completa y la guía de tamaños.
7. **El scroll reveal está en 10 de 50 componentes**, y su duración (700 ms) está
   fuera del rango que se siente moderno.
8. **No hay ningún feedback de paso completado** en el configurador de
   personalizados, que es la sección comercialmente más importante después del
   catálogo: elegir tamaño y corte no confirma nada.

---

## 2. Objetivo

Que EPICALCOS se sienta **cuidada**: que cada acción del camino de compra devuelva
una respuesta inmediata, que la mirada llegue al producto y al CTA en el orden
correcto, y que el movimiento salga de **un solo sistema** en vez de decidirse de
nuevo en cada componente.

**Cómo se sabrá que funcionó**
- Tocar cualquier CTA del camino de compra devuelve feedback en menos de 250 ms,
  también en celular sin hover.
- Toda duración y toda curva del sitio salen de un token; no queda ningún
  `0.37s` escrito a mano en un componente nuevo.
- El Home no empeora su LCP ni su CLS.
- Con `prefers-reduced-motion: reduce` el sitio se puede usar completo y no se
  mueve nada que no sea imprescindible.

---

## 3. Scope

- [x] Sistema central de tokens de motion (duración, easing, distancia) accesible
      desde CSS y desde JS.
- [x] Microinteracciones de presión (`:active`) en todos los CTA del camino de
      compra.
- [x] Confirmación de "agregado" **en el botón que se tocó**, además del toast.
- [x] Pulso del contador del carrito cuando cambia la cantidad.
- [x] Entrada y salida animadas del drawer del carrito y de los modales.
- [x] Secuencia de entrada del hero (título → subtítulo → CTA).
- [x] Scroll reveal extendido, con stagger, a las secciones que hoy no lo tienen.
- [x] Feedback de paso completado en el configurador de personalizados.
- [x] Feedback de arrastre y de archivo cargado en la subida de archivos.
- [x] Transición corta entre páginas.
- [x] Header con transición de sombra al volverse compacto.
- [x] Menú mobile con apertura animada y stagger de sus ítems.
- [x] Respeto de `prefers-reduced-motion` en todo lo anterior.

---

## 4. Fuera de scope

- [ ] **Cambiar la identidad visual.** Ni colores, ni tipografías, ni textos, ni
      imágenes, ni precios, ni promociones, ni la estructura comercial.
- [ ] **Count-up en los números de `MetricasConfianza`.** El componente tiene una
      decisión escrita: *"un número que se mueve no se puede leer, y estos tres
      son el argumento"*. Animar esos números contradice el motivo por el que la
      sección existe. Ver `tasks.md` → Hallazgos.
- [ ] **Tocar el camino de precios.** Ninguna animación entra a `pricing.js`, a
      `netlify/functions/lib/pricing.js` ni al cálculo del carrito.
- [ ] **Rehacer los tickers, el relámpago del contador o las calcos flotantes.**
      Ya cumplen y ya respetan reduced-motion; se los adopta al sistema de tokens
      solo donde no cambia su resultado visual.
- [ ] **Parallax nuevo.** El único que hay (puntero sobre `StickerField`) se
      mantiene como está; no se agrega parallax de scroll.
- [ ] **Scroll progress bar.** Evaluado y descartado: ver `design.md` §1.
- [ ] **Agregar una librería de animación.**
- [ ] Refactors de oportunidad en los componentes que se tocan.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra | Recibe respuesta inmediata a cada toque; el orden de lectura del hero y de cada sección queda dirigido |
| Cliente que vuelve (carrito guardado) | No afectado: no cambia la forma de las líneas ni la persistencia |
| Cliente con `prefers-reduced-motion` | Ve el sitio completo y quieto; ningún contenido depende de una animación para aparecer |
| Mariano (operación) | No afectado |
| Sistemas externos (CRM, Meta, MP) | No afectados: no se toca ningún evento, ningún payload ni ningún endpoint |

---

## 6. User stories

- **US-1** — Como cliente en celular, quiero que el botón me responda al tocarlo,
  para saber que la app registró mi toque antes de que cambie la pantalla.
- **US-2** — Como cliente que agrega calcos desde la grilla, quiero ver la
  confirmación en el botón que toqué, para no tener que buscar un aviso en otra
  parte de la pantalla.
- **US-3** — Como cliente que llega de un anuncio, quiero que el hero me diga en
  qué orden mirar, para entender qué se vende antes de decidir si me quedo.
- **US-4** — Como cliente que abre el carrito, quiero que entre desde el costado,
  para entender de dónde salió y cómo se cierra.
- **US-5** — Como cliente que configura un calco personalizado, quiero ver cada
  paso confirmado, para saber cuánto me falta.
- **US-6** — Como persona sensible al movimiento, quiero poder comprar sin que
  nada se mueva, para no marearme.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Existe un único sistema de tokens de motion (duración, easing, distancia) del que sale toda animación nueva | 🔴 must |
| RF-2 | Todo CTA del camino de compra responde al `:active` con una compresión perceptible, sin depender de hover | 🔴 must |
| RF-3 | Agregar un calco desde la grilla confirma la acción **en el propio botón** durante ~1 s, sin bloquear toques siguientes | 🔴 must |
| RF-4 | El contador del carrito del header pulsa cuando cambia la cantidad, y solo cuando cambia | 🔴 must |
| RF-5 | El drawer del carrito entra desde la derecha y sale con la animación inversa; el overlay hace fade | 🔴 must |
| RF-6 | Cerrar el drawer no deja contenido montado ni bloquea el botón "atrás" del navegador | 🔴 must |
| RF-7 | El hero entra en secuencia título → subtítulo → CTA en ≤ 800 ms, sin bloquear la interacción durante la animación | 🔴 must |
| RF-8 | Las secciones informativas y las grillas entran con reveal + stagger al aparecer en viewport, una sola vez | 🟡 should |
| RF-9 | El header transiciona sombra y fondo al compactarse | 🟡 should |
| RF-10 | El menú mobile abre y cierra con animación, con stagger corto en sus ítems | 🟡 should |
| RF-11 | Los modales (bienvenida, búsqueda, guía de tamaños) entran con fade + escala | 🟡 should |
| RF-12 | Cada paso completado del configurador muestra un check animado | 🟡 should |
| RF-13 | La zona de subida de archivos reacciona al arrastre y confirma cada archivo cargado | 🟡 should |
| RF-14 | El cambio de página hace un fade corto sin loader artificial | 🟢 could |
| RF-15 | Las cards de producto y de categoría suben y ganan sombra en hover de desktop | 🟢 could |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | todo verificado a 375 / 390 / 430 px, sin scroll horizontal |
| RNF-2 | **Performance** | solo `transform`, `opacity` y `filter`; ningún script bloqueante; sin animar `width`/`height`/`top`/`left` |
| RNF-3 | **CLS** | ninguna animación cambia el layout; nada reserva menos espacio del que ocupa |
| RNF-4 | **Accesibilidad** | `prefers-reduced-motion` respetado; ningún contenido depende de JS de animación para ser visible; foco visible intacto |
| RNF-5 | **Compatibilidad** | los carritos guardados en `localStorage` siguen funcionando |
| RNF-6 | **Sin dependencias nuevas** | el `package.json` no cambia |
| RNF-7 | **Degradación** | si falla el JS de animación, el contenido se ve igual |
| RNF-8 | **No invasivo** | ningún `addEventListener('scroll')` nuevo sin throttle; se prefiere `IntersectionObserver` |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Precios, promos, cupones | `business-rules.md` §1–§7 | **no** |
| Umbrales y costos de envío | `business-rules.md` §8 | **no** |
| Espejo de precios cliente/servidor | `CLAUDE.md` regla 11 | **no se toca** |

- [ ] ~~Requiere cambio espejado en `pricing.js`~~ — **no aplica**
- [ ] ~~Requiere cambio espejado en `site.js`~~ — **no aplica**
- [ ] ~~Requiere test de paridad nuevo~~ — **no aplica**

Esta feature **no toca el camino de precios**. Es puramente de presentación.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| `prefers-reduced-motion: reduce` | Todo el contenido visible y quieto; el drawer y los modales abren y cierran sin transición pero siguen funcionando |
| El usuario cambia la preferencia con el sitio abierto | Se aplica sin recargar |
| Sin `IntersectionObserver` (navegador viejo) | El contenido del reveal se muestra directamente, no queda invisible |
| JS deshabilitado o roto | El contenido no depende de una clase que agregue JS para ser visible |
| Toques repetidos rápidos en "+" de la grilla | Cada toque agrega; la confirmación se reinicia sin perder ningún agregado |
| Drawer abierto y navegación a otra ruta | El drawer se cierra sin dejar overlay huérfano ni scroll bloqueado |
| Carrito vacío | El drawer entra igual y muestra el estado vacío |
| Navegador embebido de Instagram | Ninguna animación depende de una API que ese navegador no tenga |

---

## 11. Analytics necesarios

### Eventos nuevos
Ninguno.

### Eventos existentes que cambian
Ninguno.

Esta feature **no toca `frontend/src/lib/analytics.js`**. Es un cambio de
presentación: no agrega ni modifica ninguna acción comercial medible.

⚠️ Lo que sí es un requisito: **ninguna animación puede interponerse entre el
click y el `track*` que ese click dispara.** El feedback visual es un efecto
secundario del handler que ya existe, nunca un paso previo que lo demore.

---

## 12. Preguntas abiertas

Ninguna. El pedido llegó con el detalle suficiente y el resto se resolvió leyendo
el repo.
