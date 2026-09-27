# Requirements — Hero con termo y calcos animadas

| | |
|---|---|
| **Spec** | `028-hero-termo-stickers` |
| **Estado** | `IN PROGRESS` — implementada en la rama (27/09/2026); falta QA en dispositivos reales y el deploy desde el 3/10. **Ampliación A (§13): `READY FOR REVIEW`**, con 3 preguntas (Q4-Q6) |
| **Fecha** | 27/09/2026 |
| **Autor** | Mariano (pedido) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

---

## 1. Problema

El pedido, resumido (el original tiene 42 puntos y está en la conversación del
27/9/2026):

> *"Rediseñar el hero principal con una composición visual animada inspirada en
> Relume: un termo en el centro como protagonista, rodeado de calcos que se
> mueven cada una distinto. Divertido, premium, dinámico, sin verse
> sobrecargado. Titular: 'Tu termo está pidiendo calcos.'"*

Lo que pasa hoy, observado:

- **El hero no muestra el producto aplicado.** Es un titular sobre un degradado
  con 8 calcos flotando al 22 % de opacidad, a propósito como fondo. Quien llega
  de un anuncio lee "calcos", pero no ve un objeto con calcos puestas hasta la
  sección Antes/Después, varias pantallas más abajo.
- **El titular no le habla al objeto.** El control de `hero_titular` promete
  catálogo ("Calcos para todo lo que te gusta"). La variante `objeto` ("Tu termo.
  Pero más vos.") ya apostaba a nombrar el objeto, y ese test todavía no tiene
  resultado (ver §9, RN-1).
- **Lo que se mueve hoy es solo fondo.** El degradado, el aurora y las calcos
  flotantes. No hay nada en primer plano que dé profundidad.

---

## 2. Objetivo

Que en los primeros segundos la persona entienda **EPICALCOS = personalizar
objetos con calcos**: ve un termo real con calcos alrededor que llegan de a
una, cada una con su propio movimiento, y el titular lo dice en palabras.

**Cómo se sabrá que funcionó**:
- **Visual:** en 375 px y en 1440 px, el termo es lo más grande del hero, el
  titular se lee sin que nada lo tape y los dos botones están arriba del fold
  (en 375 px, al menos el principal).
- **Negocio:** `view_item_list` y `custom_sticker_click` (con `origen: 'hero'`)
  sobre sesiones que entran por el Home no bajan respecto de las dos semanas
  anteriores al deploy. Son los mismos KPIs que usaba `hero_titular`. No es un
  A/B test: si se quiere medir contra el hero actual, ver Q3.

---

## 3. Scope

Lo que **sí** entra:

- [ ] Un termo como elemento central del hero del Home.
- [ ] Cuatro calcos alrededor, **cada una con un comportamiento distinto**:
  flota lento, está inclinada con flotación mínima, entra desde la derecha y se
  queda, sigue suavemente al cursor.
- [ ] Parallax suave de las otras calcos con intensidades distintas; el termo no
  se mueve con el cursor.
- [ ] Entrada escalonada: titular, bajada, botones, termo y calcos, en ese orden
  aproximado, en menos de 1,5 s.
- [ ] Copy nuevo: titular, bajada y los textos de los dos botones.
- [ ] Composición propia para mobile (no la de desktop achicada).
- [ ] Movimiento reducido: sin loops ni parallax, contenido completo.
- [ ] Qué pasa con los experimentos del hero que están corriendo (RN-1).

---

## 4. Fuera de scope

- [ ] **El marquee opcional (punto 33 del pedido).** Ya hay un ticker de
  confianza (spec 020) y uno de marcas (spec 007); un tercero compite con ellos.
  Si se quiere, va en una spec aparte.
- [ ] **Las páginas de pago** (`PaymentSuccess`, `PaymentPending`, etc.): usan el
  mismo fondo que el hero y no se tocan.
- [ ] **El resto de la Home**: buscador, selector de intención, destacados,
  Antes/Después, etc. quedan igual.
- [ ] **Las cards de calco** (spec 024): su hover sigue igual.
- [ ] **SEO fuera del H1**: `title`, meta description y JSON-LD no cambian.
- [ ] **Producir las fotos.** El termo lo tiene que conseguir Mariano (Q2).
- [ ] **Un A/B test del hero nuevo contra el actual** (se decide en Q3; si se
  hace, va en su propia spec).

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que llega al Home (sobre todo desde Instagram, en celular) | Ve el hero nuevo. Es su primera pantalla. |
| Cliente que vuelve al Home navegando dentro del sitio | Ve el hero armado, sin repetir la entrada (como hoy). |
| Cliente con movimiento reducido | Ve el hero completo y quieto. |
| Cliente que compra (carrito, checkout) | **No afectado.** |
| Cliente con carrito guardado | **No afectado.** No hay datos nuevos. |
| Mariano (operación) | Pierde la lectura de `hero_titular` y `hero_buscador` si se publica antes del 2/10 (RN-1). Tiene que proveer la foto del termo (Q2). |
| Sistemas externos (Meta, GA4, MP, Notion) | **No afectado.** Mismos eventos. |

---

## 6. User stories

- **US-1** — Como persona que llega de un anuncio, quiero ver un termo con
  calcos apenas entro, para entender sin leer que acá se personalizan objetos.
- **US-2** — Como persona que llega de un anuncio, quiero los botones a mano de
  entrada, para ir al catálogo o a los personalizados sin esperar una animación.
- **US-3** — Como persona con movimiento reducido, quiero ver el mismo contenido
  sin nada en loop, para no marearme.
- **US-4** — Como Mariano, quiero que el hero nuevo no rompa el funnel ni las
  lecturas de experimentos sin que yo lo decida, para no perder datos.

---

## 7. Requisitos funcionales

### Composición

| ID | Requisito |
|---|---|
| RF-1 | El termo es el elemento visual más grande del hero, está centrado horizontalmente y conserva su proporción y transparencia. |
| RF-2 | Hay cuatro calcos alrededor del termo: una arriba a la izquierda, una abajo a la izquierda, una arriba a la derecha y una abajo a la derecha. |
| RF-3 | Algunas calcos pasan por delante del termo y otras quedan detrás, para dar profundidad. |
| RF-4 | Ninguna calco tapa el titular, la bajada ni los botones, en ningún ancho entre 360 y 1920 px. |
| RF-5 | Ninguna calco queda cortada por el borde de la pantalla una vez terminada la entrada, y el hero nunca genera scroll horizontal. |
| RF-6 | En desktop el hero ocupa aproximadamente la altura de la pantalla. En mobile la altura la da el contenido. |

### Copy

| ID | Requisito |
|---|---|
| RF-7 | Titular (el H1 de la Home): **"Tu termo está pidiendo calcos."** |
| RF-8 | Bajada: **"Dale personalidad a lo que usás todos los días."** |
| RF-9 | Botón principal: **"VER CALCOS"**, al mismo destino que el botón principal de hoy. |
| RF-10 | Botón secundario: **"HACER LOS MÍOS"**, al mismo destino que el secundario de hoy. Se oculta si la sección de personalizados está despublicada (como hoy). |
| RF-11 | En mobile se ven los **dos** botones (ver §9, RN-4). |

### Movimiento

| ID | Requisito |
|---|---|
| RF-12 | **Termo**: entra con un leve crecimiento y después queda **quieto**. No flota ni sigue al cursor. |
| RF-13 | **Calco 1** (arriba izquierda): después de aparecer, flota arriba y abajo unos 15 px en un ciclo lento (~4 s). No rebota. |
| RF-14 | **Calco 2** (abajo izquierda): aparece girando hasta quedar inclinada unos 8° y flota menos que la 1 (~8 px, ~5 s). |
| RF-15 | **Calco 3** (arriba derecha): entra desde fuera de la pantalla por la derecha, girando, y queda casi quieta. |
| RF-16 | **Calco 4** (abajo derecha): sigue suavemente al cursor, hasta unos 25 px, con inercia. Es la que más se mueve con el cursor. |
| RF-17 | Las calcos 1, 2 y 3 también siguen al cursor, mucho menos (del orden de 3 a 7 px) y cada una con distinta intensidad. |
| RF-18 | Orden de entrada aproximado: titular → bajada → botones → termo → calcos de a una. Todo termina antes de 1,5 s. |
| RF-19 | Los botones se pueden usar **desde el primer cuadro**: la entrada no demora ni bloquea un clic. |
| RF-20 | El titular y la bajada se ven desde el primer cuadro; su entrada es un desplazamiento corto, no una aparición desde invisible (RNF-2). |
| RF-21 | Con puntero fino (mouse), pasar por encima de una calco la agranda apenas y la gira un poco. En pantallas táctiles no hay hover. |
| RF-22 | Las calcos nunca bloquean un clic en lo que tengan debajo. |
| RF-23 | La entrada se reproduce una vez por carga de página. Volver al Home navegando dentro del sitio muestra el hero ya armado. |
| RF-24 | Con el hero fuera de pantalla, los movimientos en loop se pausan. |

### Mobile

| ID | Requisito |
|---|---|
| RF-25 | En mobile el orden vertical es: titular, bajada, botones, y debajo la composición del termo con las calcos. |
| RF-26 | En mobile no hay parallax por cursor ni hover. Los loops de flotación se mantienen. |
| RF-27 | En mobile se puede ocultar una calco si hace falta para que la composición respire (decisión visual al implementar, documentada en la bitácora). |

### Movimiento reducido

| ID | Requisito |
|---|---|
| RF-28 | Con `prefers-reduced-motion`: sin loops, sin parallax, sin entrada desde fuera de pantalla. Todo aparece en su posición final (a lo sumo con un fundido breve), con la misma composición. |

---

## 8. Requisitos no funcionales

| ID | Requisito | Detalle |
|---|---|---|
| RNF-1 | **Sin salto de layout** | La altura del hero no cambia cuando cargan las imágenes. CLS del Home ≤ 0,05 a 375 px. |
| RNF-2 | **LCP** | El LCP del Home a 375 px (Lighthouse mobile, 3 corridas, mediana) no empeora más de 200 ms respecto del hero actual. Nada que pueda ser el elemento LCP arranca invisible. |
| RNF-3 | **Peso** | El termo pesa ≤ 120 kB y cada calco ≤ 30 kB, con transparencia. El JS extra que se suma a la carga inicial del Home está declarado en `design.md` §10 y acotado. |
| RNF-4 | **Fluidez** | Los loops y el parallax no hacen caer los fps al scrollear en un celular de gama media (verificación: perfil de Chrome con CPU ×4). |
| RNF-5 | **Accesibilidad** | Calcos decorativas: sin texto alternativo y ocultas para lectores de pantalla. El termo: texto alternativo descriptivo. Botones con foco visible y targets ≥ 44 px. Contraste AA en titular, bajada y botones. |
| RNF-6 | **Navegadores** | Chrome, Safari, Firefox, Safari iOS y Chrome Android: misma composición, sin transformaciones rotas. |
| RNF-7 | **Sin assets, no se rompe** | Si falta la imagen del termo o de una calco, el hero sigue mostrando copy y botones, sin ícono de imagen rota y sin cambiar de altura. |
| RNF-8 | **Consola limpia** | Sin errores ni warnings nuevos en consola en dev ni en el build. |

---

## 9. Reglas de negocio

| ID | Regla |
|---|---|
| RN-1 | **Experimentos del hero.** `hero_titular` (el H1) y `hero_buscador` (el buscador dentro del hero) están corriendo con la ventana de lectura reiniciada el 18/9. Las dos semanas se cumplen el **viernes 2/10/2026** (`docs/CRO-EXPERIMENTS.md`). El hero nuevo reemplaza el H1, que es la variable de `hero_titular`, así que **ese test termina el día que se publique**. Cuándo publicar lo decide Mariano (Q1). |
| RN-2 | Al publicarse el hero nuevo, `hero_titular` y `hero_buscador` se apagan (todo el mundo ve el control del buscador, en su sección). `hero_cta` ya está pausado y queda así. |
| RN-3 | **Piso de SEO (spec 015).** El H1 de la Home dice "calcos". "Tu termo está pidiendo calcos." lo cumple. |
| RN-4 | **Dos salidas, siempre.** El hero tiene exactamente dos caminos: el catálogo y los personalizados (spec 014). Sacar "HACER LOS MÍOS" en mobile cortaría el camino de más ticket para la mayoría del tráfico, así que se muestra también ahí. |
| RN-5 | Si se vuelve a prender `hero_buscador`, la Home nunca queda con dos buscadores ni con ninguno (invariante de la spec 015). |

---

## 10. Edge cases

| Caso | Qué debe pasar |
|---|---|
| Falta la imagen del termo | El hueco del termo mantiene su tamaño y queda vacío; copy, botones y calcos se ven igual. |
| Falta una calco | Esa calco no se ve (sin ícono roto); las demás igual. |
| Pantalla de 320 px | Sin scroll horizontal, titular legible, botones usables. |
| Pantalla muy ancha (≥ 1920 px) | La composición queda centrada y no se desparrama hasta los bordes. |
| Pantalla baja en desktop (ej. 1366×650) | Los botones siguen arriba del fold; el termo puede quedar cortado abajo, las calcos no. |
| Tablet en vertical (768 px) | Se usa la composición mobile o una intermedia, nunca calcos encima del texto. |
| Cursor sale de la ventana | Las calcos vuelven suavemente al reposo, no quedan desplazadas. |
| Hover sobre una calco que está pasando por delante del termo | Crece sin tapar botones. |
| El JS de animación tarda en cargar (red lenta) | Titular, bajada, botones y termo se ven en su lugar; las calcos aparecen cuando esté listo. |
| Movimiento reducido cambia con la página abierta | Los loops y el parallax se apagan sin recargar. |

---

## 11. Analytics necesarios

### Eventos nuevos
Ninguno.

### Eventos existentes que cambian

| Evento | Cambio |
|---|---|
| `custom_sticker_click` con `origen: 'hero'` (botón secundario) | Ninguno: se mantiene tal cual. |
| `experiment_view` de `hero_titular`, `hero_cta` y `hero_buscador` | Dejan de enviarse desde el Home al apagarse los experimentos (RN-2). Es esperado, no un bug. |

### Qué se quiere poder responder con estos datos

- ¿El hero nuevo manda al menos la misma proporción de visitas al catálogo
  (`view_item_list`) y a personalizados (`custom_sticker_click` con `origen:
  'hero'`) que el de antes? Comparación antes/después, con la fecha del deploy
  como corte en `docs/CRO-EXPERIMENTS.md`. El botón principal no tiene evento
  propio hoy y esta spec no lo agrega: `view_item_list` alcanza para la pregunta.

---

## 12. Preguntas abiertas

| ID | Pregunta | Propuesta |
|---|---|---|
| **Q1** | ¿Cuándo se publica? Publicar antes del 2/10 tira las dos semanas de `hero_titular` y `hero_buscador` (RN-1). | **Implementar ya en la rama y publicar desde el sábado 3/10**, después de leer los dos tests. — ✅ *Aprobada (27/9, "Implementá la spec 028").* |
| **Q2** | ¿De dónde sale la foto del termo? No existe ningún termo recortado en el repo (solo la foto cuadrada de Antes/Después, con fondo). | **Mariano provee** un PNG con fondo transparente, ≥ 800 px de alto, termo con calcos puestas. Sin eso **no se publica**: el hero pierde su protagonista. Las 4 calcos salen del catálogo (hay 60 recortes transparentes de ~12 kB); Mariano elige cuáles o se usan las propuestas en `design.md` §0. — ✅ *Mariano mandó la foto de un termo liso (27/9). Recortado y sin el fondo blanco: 172×516, 7,8 kB. (Una primera versión usó la foto de Antes/Después; ver bitácora de `tasks.md`.)* |
| **Q3** | ¿Se publica como reemplazo o como A/B contra el hero actual? | **Reemplazo**, con corte en la serie de `CRO-EXPERIMENTS.md`. Un A/B obliga a cargar los dos heroes (y la librería de animación) a todo el mundo durante semanas. Si Mariano quiere medirlo, va en una spec aparte. — ✅ *Aprobada.* |

---

## 13. Ampliación A — Pegar las calcos en el termo (27/09/2026)

> **Estado de la ampliación: `READY FOR REVIEW`.** No autoriza a implementarla
> (ver `specs/README.md`). Se implementa en el mismo PR, antes del merge.

### 13.1 Pedido

> *"Que los calcos los puedas seleccionar / clickear con el cursor, pegar en el
> termo y que queden pegados."*

### 13.2 Problema y objetivo

Hoy las cuatro calcos son decoración: se mueven solas, pero no se pueden
agarrar. El hero dice "Tu termo está pidiendo calcos" y muestra un termo liso
con calcos alrededor, pero la persona no puede hacer lo que el titular propone.

**Objetivo**: que la persona pueda **ponerle las calcos al termo** con sus
propias manos, en el primer segundo de la visita. Es la propuesta del negocio
—personalizar objetos con calcos— hecha gesto.

**Cómo se sabrá que funcionó**: `hero_sticker_stick` (§13.8) sobre vistas del
Home dice cuánta gente juega. El KPI de negocio no cambia: `view_item_list` y
`custom_sticker_click` del hero no bajan.

### 13.3 Scope

- [ ] Con mouse: agarrar una calco, arrastrarla y soltarla sobre el termo → queda
      pegada donde se soltó.
- [ ] Con mouse, un clic sin arrastrar → la calco vuela sola al termo y se pega.
- [ ] En pantallas táctiles: tocar una calco → vuela al termo y se pega (Q4).
- [ ] Una calco pegada se ve "puesta" sobre el termo: más chica, apoyada en la
      superficie, sin salirse de la silueta.
- [ ] Una calco pegada se puede volver a arrastrar: a otro lugar del termo, o
      afuera para despegarla (vuelve a su lugar).
- [ ] Una pista corta que diga que se puede hacer (Q6).

### 13.4 Fuera de scope

- [ ] Guardar las calcos pegadas entre visitas (Q5).
- [ ] Elegir otras calcos, subir una propia, cambiarles el tamaño o rotarlas: eso
      es el configurador de personalizados, no el hero.
- [ ] Un botón o mensaje de venta que aparezca al pegar ("¿Te gustó? Comprala").
      Si se quiere, va en otra ampliación.
- [ ] Teclado: ver RN-A3.

### 13.5 Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-A1 | Con mouse, el cursor sobre una calco muestra que se puede agarrar (mano abierta), y mientras se arrastra, mano cerrada. |
| RF-A2 | Mientras se arrastra, la calco sigue al cursor exactamente (sin retraso ni resorte), se ve levantada (un poco más grande y con más sombra) y deja de flotar y de hacer parallax. |
| RF-A3 | Soltada con su centro sobre el cuerpo del termo (no sobre la tapa, la base ni la manija), queda pegada ahí: se achica al tamaño de una calco real sobre ese termo con un pequeño "apretón", y la parte que pase el borde de la silueta no se ve. |
| RF-A4 | Soltada fuera del termo, vuelve sola a su lugar original. |
| RF-A5 | Un clic (mouse) o un toque (pantalla táctil) sin arrastrar hace que la calco vuele al termo y se pegue en un lugar propio de cada calco, sin taparse entre ellas. |
| RF-A6 | Una calco pegada no flota ni hace parallax: está pegada a un termo que no se mueve. |
| RF-A7 | Una calco pegada se puede volver a arrastrar: soltada sobre el termo, se mueve ahí; soltada afuera, se despega y vuelve a su lugar original. |
| RF-A8 | Las calcos pegadas quedan por delante del termo y por detrás de una calco que se esté arrastrando. |
| RF-A9 | Pegar o arrastrar nunca dispara un clic en un botón ni navega. |
| RF-A10 | En pantallas táctiles, empezar a scrollear con el dedo encima de una calco scrollea la página (no pega la calco). |
| RF-A11 | La pista (Q6) aparece cuando termina la entrada y desaparece al pegar la primera calco. |
| RF-A12 | Las calcos se despegan todas al recargar o al volver al Home navegando (Q5). |

### 13.6 Requisitos no funcionales

| ID | Requisito | Detalle |
|---|---|---|
| RNF-A1 | **Peso** | Lo que se sume va en el chunk de las calcos (no en el principal) y no supera 3 kB gzip. |
| RNF-A2 | **Fluidez** | Arrastrar no baja de 50 fps en desktop (Chrome, sin throttling de CPU). |
| RNF-A3 | **Movimiento reducido** | Arrastrar funciona igual (es movimiento que hace la persona); el vuelo al termo y la vuelta a su lugar son instantáneos. |
| RNF-A4 | **Sin salto de layout** | Pegar, despegar o arrastrar no cambia la altura del hero ni de nada. |

### 13.7 Reglas de negocio

| ID | Regla |
|---|---|
| RN-A1 | El juego no puede competir con los botones: la pista es más chica y más apagada que la bajada, y nada del juego se superpone a los botones. |
| RN-A2 | Ninguna interacción con las calcos puede romper la compra: todo el tracking va por `lib/analytics.js` con `try/catch` (regla 13). |
| RN-A3 | Las calcos siguen siendo **decorativas** para lectores de pantalla y teclado: no entran en el orden de tabulación ni se anuncian. No hay información ni función de compra que dependa de ellas. El clic/toque es la alternativa de un solo puntero al arrastre (WCAG 2.5.7). |

### 13.8 Analytics

| Evento | Cuándo | Parámetros |
|---|---|---|
| `hero_sticker_stick` (nuevo) | Cada vez que una calco queda pegada (no al moverla dentro del termo) | `slot` (1-4), `metodo` (`arrastre` / `clic` / `toque`) |

Solo a GA4 (vía `analytics.js`). No va al Píxel de Meta: no es un paso del
embudo y ensuciaría las audiencias.

Qué se quiere poder responder: ¿cuánta gente juega con el hero? ¿Los que
juegan van más al catálogo que los que no?

### 13.9 Edge cases

| Caso | Qué debe pasar |
|---|---|
| Se suelta justo en el borde del termo | Cuenta el centro de la calco: si está en el cuerpo, se pega, corrida hacia adentro lo necesario para que su centro quede en el cuerpo. |
| Se pegan las cuatro con clic | Cada una en su lugar propio, sin taparse. |
| Se arrastra la calco hasta afuera de la ventana y se suelta | Vuelve a su lugar original. |
| Se arrastra durante la entrada (antes de que termine de aparecer) | Se puede: la entrada se corta y la calco queda en la mano. |
| El chunk de las calcos no cargó | No hay calcos ni juego; el hero sigue igual que hoy en ese caso. |
| Falta la imagen de una calco | Esa calco no se ve ni se puede agarrar. |
| Movimiento reducido | Arrastre normal; vuelo y vuelta instantáneos; sin pista animada. |
| Mouse y pantalla táctil a la vez (notebook táctil) | Con el mouse, arrastre; con el dedo, toque. |

### 13.10 Preguntas de la ampliación

| ID | Pregunta | Propuesta |
|---|---|---|
| **Q4** | En el celular, ¿se arrastra con el dedo o se toca para pegar? | **Tocar para pegar.** Arrastrar con el dedo obliga a que la calco "capture" el gesto: si alguien empieza a scrollear con el dedo encima de una calco, en vez de bajar por la página arrastra la calco. En el hero, que es lo primero que se scrollea, eso se siente como un error. Con el toque, scrollear sigue funcionando siempre. |
| **Q5** | ¿Las calcos pegadas se guardan para la próxima visita? | **No.** Al recargar vuelven a su lugar y se repite la entrada. Guardarlas agrega estado en el navegador para algo que es un juego de 5 segundos, y la próxima visita arrancaría con un hero distinto del que se diseñó. |
| **Q6** | ¿Mostrar una pista de que se puede jugar? | **Sí**, una línea chica debajo de los botones: *"Arrastrá una calco al termo"* (con mouse) / *"Tocá una calco para pegarla"* (táctil). Aparece al terminar la entrada y se va al pegar la primera. Sin pista, casi nadie descubre que las calcos se pueden agarrar. |

