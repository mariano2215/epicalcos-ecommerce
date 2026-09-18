# Requirements — Motion: hero vivo y calcos que responden al cursor

| | |
|---|---|
| **Spec** | `024-motion-hero-y-calcos` |
| **Estado** | `DONE` (18/9/2026) — cards y hero en producción, OK de Mariano |
| **Fecha** | 18/09/2026 |
| **Autor** | Mariano (pedido) + Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

---

## 1. Problema

El pedido, textual:

> *"El fondo gradiente del HERO vamos a hacerlo dinámico (que se vaya moviendo
> el gradiente), que diga BIENVENIDO y otras frases que hagan sentir bien al
> usuario al entrar al sitio web, y vaya apareciendo de a poco el buscador y los
> otros elementos. Hacerla dinámica."*
>
> *"Que cada card de cada sticker que le pases el cursor arriba se AGRANDE y se
> achique de nuevo cuando le saques el cursor de encima."*

Lo que pasa hoy, observado:

- **El hero se siente quieto.** El degradado de colores del fondo es una imagen
  fija. Lo único que se mueve es un velo de color muy difuso (al 55 % de
  opacidad y con un ciclo de casi medio minuto) y las calcos flotantes al 22 %:
  a propósito, son *fondo*. El resultado es que la primera pantalla no saluda:
  aparece entera, de golpe, y ya.
- **No hay bienvenida.** El hero va directo al titular. No hay nada que le diga
  a quien llega "qué bueno que viniste".
- **Las cards de calco casi no responden al cursor, y en la grilla principal no
  se mueven nada.** En los destacados del Home la card sube 4 px al pasar el
  cursor. Pero en la grilla de cada categoría —donde de verdad se recorre el
  catálogo— y en las landings por uso, **la card no se mueve en absoluto**: la
  animación de entrada de la grilla deja "clavada" la posición de cada card y
  anula el efecto (verificado en el navegador el 18/9/2026, ver `design.md` §0).
  Lo único que se ve ahí es un zoom del 5 % de la imagen, y solo si el cursor
  está justo encima de la foto, no del nombre ni del precio.

---

## 2. Objetivo

Que la primera pantalla del Home se sienta **viva y cálida** —fondo en
movimiento, un saludo, los elementos entrando de a uno— **sin demorar el camino
de compra**; y que cada card de calco **responda al cursor** creciendo y
volviendo a su tamaño, igual en todas las grillas del sitio.

**Cómo se sabrá que funcionó**
- Mariano ve el Home y las grillas y dice que es lo que pidió.
- El LCP del Home no empeora (Lighthouse mobile antes/después).
- En las dos semanas siguientes al deploy, el engagement del Home en GA4 no cae
  y los clics en los dos botones del hero no bajan (no hay A/B: es una lectura
  de antes/después, y se dice así).

---

## 3. Scope

Lo que **sí** entra:

- [ ] Fondo del hero del **Home** con el degradado en movimiento continuo.
- [ ] Saludo arriba del titular: "BIENVENIDO" y otras frases, una a la vez.
- [ ] Entrada escalonada del contenido del hero (saludo, titular, subtítulo,
      buscador cuando está en el hero, botones).
- [ ] Card de calco que crece al pasar el cursor y vuelve al sacarlo, en las
      **tres** grillas donde aparece: categoría, landings por uso y destacados
      del Home.

---

## 4. Fuera de scope

- **El texto del titular, del subtítulo y de los botones.** Son variables de
  experimentos en curso (`hero_titular`, `hero_buscador`, `hero_cta` pausado).
  El saludo se **suma** arriba; no reemplaza nada.
- **Las cards de categoría** (portadas de "Encontrá lo que te representa", menú
  de categorías) y las de packs. El pedido dice "card de cada sticker". Si
  Mariano las quiere igual, es una ampliación de esta spec (pregunta abierta Q4).
- **Las pantallas de pago** (éxito, pendiente, error, transferencia): usan el
  mismo degradado de fondo y **quedan quietas**.
- **La sección del buscador debajo del hero** (la variante control de
  `hero_buscador`). Está fuera del hero y, en un celular, debajo del fold: no
  entra animada. El buscador solo "aparece de a poco" cuando la variante lo pone
  dentro del hero.
- **Un equivalente táctil del hover.** En el celular no hay cursor; no se
  inventa un gesto. El botón "+" ya tiene su propia devolución al tocarlo.
- **Cambiar las calcos flotantes o el velo de color** que ya existen en el hero
  (cantidad, opacidad, recorrido).
- **Personalizar el saludo** según si la persona ya compró o vuelve ("¡Qué bueno
  verte de nuevo!"). Queda anotado como idea; necesita decidir qué señal usar.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que llega de un anuncio (celular) | Ve el fondo moverse, el saludo y la entrada. **No** ve el crecimiento de cards (no hay cursor). |
| Cliente en computadora | Todo lo anterior + las cards crecen al pasar el cursor. |
| Cliente con "reducir movimiento" activado | Ve el hero quieto, completo desde el primer cuadro, con el saludo fijo. Las cards no crecen. |
| Cliente que vuelve (carrito guardado) | No afectado. No cambia nada del carrito. |
| Mariano (operación) | Los experimentos del hero tienen un **corte en la serie** el día del deploy (ver §9 y Q1). |
| Sistemas externos (CRM, Meta, MP) | No afectado. |

---

## 6. User stories

- **US-1** — Como persona que entra al sitio desde Instagram, quiero sentir que
  me reciben, para quedarme a mirar en vez de irme.
- **US-2** — Como persona que ya sabe qué quiere, quiero que el buscador y los
  botones estén disponibles enseguida, para no esperar a que termine una
  animación.
- **US-3** — Como persona que recorre la grilla con el mouse, quiero que la card
  sobre la que estoy se destaque, para saber qué estoy mirando y que es
  clickeable.
- **US-4** — Como persona sensible al movimiento, quiero que el sitio respete mi
  preferencia del sistema, para poder navegarlo sin molestias.

---

## 7. Requisitos funcionales

### Hero — fondo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | El degradado de colores del hero del Home se mueve de forma continua: las manchas de color cambian de lugar y se nota a simple vista en menos de 5 segundos de mirar. | 🔴 must |
| RF-2 | El movimiento es **claramente visible** y sin saltos: ciclos de 6 a 9 s y ningún "corte" visible cuando el ciclo vuelve a empezar. *Corregido el 18/9/2026: decía "lento, ningún ciclo de menos de 15 s", y así el fondo parecía quieto (ver `tasks.md`, Hallazgos 6).* | 🔴 must |
| RF-3 | La paleta es la de hoy (azul, violeta, fucsia, rosa, naranja sobre negro) y la franja superior sigue oscura, para que el header y el titular se lean igual que ahora. | 🔴 must |
| RF-4 | Cuando el hero sale de la pantalla (la persona scrolleó hacia abajo), las animaciones de fondo del hero se detienen; vuelven al volver a verlo. | 🟡 should |

### Hero — saludo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-5 | Arriba del titular aparece un saludo. La primera frase es **"BIENVENIDO"** (texto final sujeto a Q2). | 🔴 must |
| RF-6 | Después del saludo pasan otras frases que hagan sentir bien, **una a la vez**. Propuesta de copy en §12, Q2. | 🔴 must |
| RF-7 | Las frases dan **una sola vuelta** y el saludo se queda quieto en la última (sujeto a Q3). | 🔴 must |
| RF-8 | La vuelta completa del saludo termina en **5 segundos o menos** desde que se pinta el hero. | 🔴 must |
| RF-9 | El cambio de frase no mueve nada: el titular, el buscador y los botones no se desplazan ni un píxel mientras rota el saludo. | 🔴 must |
| RF-10 | El saludo es claramente secundario al titular: más chico y menos contrastado. El titular sigue siendo lo dominante de la pantalla. | 🔴 must |
| RF-11 | El saludo no reemplaza ni modifica el titular, el subtítulo ni el texto de los botones en ninguna variante de experimento. | 🔴 must |

### Hero — entrada

| ID | Requisito | Prioridad |
|---|---|---|
| RF-12 | El contenido del hero entra escalonado, en este orden: saludo → titular → subtítulo → buscador (si esa variante lo muestra en el hero) → botones. | 🔴 must |
| RF-13 | Los botones terminan de aparecer en **1,2 s o menos** desde que se pinta el hero. | 🔴 must |
| RF-14 | El titular y el subtítulo **se ven desde el primer cuadro**: pueden deslizarse, pero no aparecen desde la nada (motivo: performance, ver RNF-2). | 🔴 must |
| RF-15 | Los botones aparecen en el **mismo momento** en todas las variantes de experimento, esté o no el buscador en el hero. | 🔴 must |
| RF-16 | La entrada y la rotación del saludo ocurren **una vez por carga de página**. Si la persona vuelve al Home navegando dentro del sitio, ve el hero ya armado y el saludo en su frase final. Recargar la página vuelve a reproducirlo. | 🔴 must |
| RF-17 | Durante la entrada todo lo que se ve es clickeable: tocar un botón que todavía está apareciendo funciona. | 🔴 must |
| RF-18 | Si la persona abre el desplegable del buscador del hero, el desplegable queda por encima de los botones, igual que hoy. | 🔴 must |

### Cards de calco

| ID | Requisito | Prioridad |
|---|---|---|
| RF-19 | Al pasar el cursor sobre una card de calco, **la card entera** (imagen, nombre, precio y botón "+") crece de forma suave, y vuelve a su tamaño al sacar el cursor. | 🔴 must |
| RF-20 | El crecimiento es de alrededor de un 8 % y dura alrededor de un cuarto de segundo (sujeto a Q5). | 🔴 must |
| RF-21 | Funciona igual en las tres grillas: categoría, landings por uso y destacados del Home. | 🔴 must |
| RF-22 | La card agrandada queda por encima de sus vecinas (su sombra no queda tapada) y **no** tapa el botón "+" de una card vecina. | 🔴 must |
| RF-23 | La imagen no hace un segundo zoom propio: hay un solo movimiento, el de la card. | 🟡 should |
| RF-24 | En pantallas táctiles la card **no** crece: tocar "+" no deja una card agrandada. | 🔴 must |
| RF-25 | Con teclado, cuando el foco entra en la card (link o botón "+"), la card crece igual que con el cursor. | 🟡 should |
| RF-26 | Recorrer la grilla rápido con el mouse no produce parpadeos ni saltos: cada card crece y vuelve de forma continua, aunque la animación se interrumpa a la mitad. | 🔴 must |

### Movimiento reducido

| ID | Requisito | Prioridad |
|---|---|---|
| RF-27 | Con "reducir movimiento" activado en el sistema: el fondo del hero queda quieto (con los mismos colores), no hay entrada escalonada, el saludo muestra una sola frase fija y las cards no crecen (mantienen el resaltado del borde). | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | A 375 px: el saludo entra en una línea, sin scroll horizontal, el hero no cambia de alto respecto de hoy más que la línea del saludo. |
| RNF-2 | **Performance** | No empeora el LCP del Home (Lighthouse mobile, antes/después). Nada que pueda ser el elemento LCP arranca invisible. Sin scripts nuevos en el `<head>`. |
| RNF-3 | **Fluidez** | Las animaciones corren a 60 fps en un celular de gama media: se animan solo propiedades que no obligan a repintar el hero en cada cuadro. |
| RNF-4 | **Accesibilidad** | El saludo animado no se lee en voz alta a cada cambio. Foco visible intacto. La rotación termina sola en ≤ 5 s (WCAG 2.2.2). |
| RNF-5 | **Sin dependencias nuevas** | Nada de librerías de animación. |
| RNF-6 | **Compatibilidad** | Navegador embebido de Instagram (iOS y Android): el hero se ve completo aunque alguna animación no corra. Un navegador sin soporte de alguna propiedad nueva muestra el hero quieto, nunca vacío. |

---

## 9. Reglas de negocio

No toca precios, promos, cupones ni envíos.

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Experimentos: una variable por vez | `docs/CRO-EXPERIMENTS.md` — *Cuándo cerrar un test* | no — el cambio es **idéntico en las cuatro celdas** (RF-11, RF-15) |
| Experimentos: cortes en la serie | `docs/CRO-EXPERIMENTS.md` — *corte del 7/9/2026* | se **agrega** un corte con la fecha del deploy del hero |
| El H1 dice el término del negocio en cada variante | spec 015, RF-9 | no — el H1 no se toca |
| Hero: una idea, un elemento dominante | spec 014 | no — el saludo es secundario (RF-10) y deja de moverse (RF-7) |

⚠️ **Precios / envíos**: no aplica.

- [x] ~~Requiere cambio espejado en pricing~~ — no
- [x] ~~Requiere cambio espejado en site.js~~ — no
- [x] ~~Requiere test de paridad~~ — no

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Vuelve al Home con el logo o "atrás" | Hero ya armado, saludo en la frase final, sin entrada (RF-16). |
| Recarga el Home | Entrada y saludo de nuevo. |
| Toca un botón del hero antes de que termine la entrada | Navega normal (RF-17). |
| Variante `en_hero` y abre el desplegable del buscador | El desplegable tapa a los botones, como hoy (RF-18). |
| Pestaña en segundo plano | El navegador frena las animaciones solo; al volver siguen. |
| Scrolleó hasta abajo del Home | El fondo del hero no consume batería (RF-4). |
| Pasa el mouse rápido por 10 cards seguidas | Cada una crece y vuelve sin saltos (RF-26). |
| Pantalla táctil con mouse (tablet con trackpad, notebook táctil) | Si el dispositivo reporta un puntero fino con hover, crece; si no, no. |
| Navegador sin soporte de alguna propiedad nueva | Hero y cards quietos, completos y usables (RNF-6). |
| "Reducir movimiento" activado | RF-27. |
| Zoom del navegador al 200 % | El saludo sigue en una línea o parte en dos sin superponerse al titular. |

---

## 11. Analytics necesarios

**Eventos nuevos: ninguno.** Es un cambio de presentación: no agrega acciones
comerciales ni pasos al funnel (`CLAUDE.md` regla 13 — no aplica).

**Eventos existentes que cambian: ninguno.**

**Lo que sí cambia en la lectura de datos**: el hero es donde corren
`hero_titular` y `hero_buscador`. El día del deploy del hero se anota como
**corte en la serie** en `docs/CRO-EXPERIMENTS.md`, igual que el corte del
7/9/2026. Las cards de calco no están dentro de ningún experimento.

**Qué se quiere poder responder**
- ¿Bajó la interacción con el hero (clics en sus botones, búsquedas desde el
  Home) después del deploy? Lectura antes/después, no causal.

---

## 12. Preguntas abiertas

- [x] **Q1 — ¿Cuándo sale el hero?** ✅ *Por defecto (18/9): cards ya, hero después de leer los tests.* → **Cambiado por Mariano el mismo 18/9: "publicá el hero, que arranquen de 0 esos test".** Corte anotado en `docs/CRO-EXPERIMENTS.md`.
  `hero_titular` y `hero_buscador` están corriendo, y su serie **se reinició el
  7/9** (cambio de promos). Las dos semanas completas se cumplen el **lunes
  21/9/2026**. Cambiar el hero antes corta la serie otra vez con apenas 11 días
  útiles.
  **Recomendación**: implementar todo, pero deployar en **dos tandas**: las
  cards ya (no están en ningún experimento) y el hero **después de leer los dos
  tests** el 21/9 o más adelante.

- [x] **Q2 — El copy del saludo.** ✅ *Por defecto (18/9): "BIENVENIDO" + las tres frases propuestas.*
  Propuesta (voseo, sin prometer nada que no se haga):
  1. **BIENVENIDO**
  2. **QUÉ BUENO VERTE POR ACÁ**
  3. **TUS COSAS, A TU MANERA**
  4. **ESTÁS EN CASA** ← la que queda quieta
  Sobre "BIENVENIDO": es correcto según la RAE como genérico, pero buena parte
  de quien compra calcos para termo y mate son mujeres. Alternativas neutras:
  **"¡HOLA!"** o **"TE DAMOS LA BIENVENIDA"** (22 caracteres: entra en una línea
  a 375 px). Si no hay respuesta, va "BIENVENIDO" tal como se pidió.

- [x] **Q3 — ¿Una vuelta o en loop?** ✅ *Por defecto (18/9): una vuelta.*
  **Recomendación: una vuelta.** Hasta el 4/9 el hero tenía un titular que
  rotaba 5 frases sin parar y se sacó en la spec 014 porque competía con todo lo
  demás. Una sola vuelta da la bienvenida y se aparta. Un loop infinito además
  obliga a poner un botón de pausa para cumplir WCAG 2.2.2.

- [x] **Q4 — ¿También las cards de categoría?** ✅ *Por defecto (18/9): no, solo calcos.* Las portadas de "Encontrá lo que
  te representa" y el menú de categorías tienen su propio hover (suben 4 px).
  El pedido dice "card de cada sticker", así que quedan afuera salvo que se
  pida.

- [x] **Q5 — ¿Cuánto crece la card?** ✅ *Por defecto (18/9): 8 % → implementado a **7,5 %**: al 8 % las cards del Home (281 px) quedaban a 0,8 px de la vecina. Ver `tasks.md`, Hallazgos.* Propuesta 8 %. Con la separación actual
  de las grillas (12 px) el tope sin superponerse a la vecina es ~10 %.
