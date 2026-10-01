# Requirements — Scroll fluido y contenido que aparece rápido

| | |
|---|---|
| **Spec** | `030-scroll-fluido-y-carga-rapida` |
| **Estado** | 🟡 `APPROVAL` — falta el OK de Mariano a las decisiones de §12 |
| **Fecha** | 01/10/2026 |
| **Autor** | Claude Code, a partir del pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

> **Pedido de Mariano (1/10/2026)**: *"Mejorale la velocidad de carga al sitio
> para que sea más rápido el scroll y no se trabe, y que las imágenes y todo
> aparezca más rápido y sea más amigable el scroll."*

---

## 1. Problema

En el celular el scroll se traba y el contenido aparece tarde. Medido el
1/10/2026 (build de producción, celular emulado 375 px, CPU ×4, con GPU,
scroll real con el dedo, mediana de 3 corridas — detalle en `design.md` §0):

| Página | Cuadros trabados (> 33 ms) | El 5 % más lento |
|---|---|---|
| Home | **18 %** | 67 ms |
| Categoría (Disney, 48 calcos) | 6,5 % | 50 ms |

Y en el Home, **en el 72 % de los cuadros de un scroll hay una sección
todavía invisible en el medio de la pantalla**: las secciones arrancan
transparentes y aparecen con un fundido recién cuando ya entraron. Imágenes sin
cargar en pantalla: 0 % en la medición local; en producción, además, cada
imagen, script y estilo se vuelve a consultar al servidor en cada visita
(~0,4 s por consulta), aunque el navegador ya lo tenga.

Las causas, en orden de peso (cada una medida apagándola sola):

1. **Animaciones que obligan a repintar en cada cuadro, en todas las páginas**:
   el brillo del banner de promo del header, el titular con degradado
   animado y el fondo animado de 15 páginas (incluidos carrito y checkout).
   Apagando las del banner y el titular, el Home pasa de 18 % a 6 % de
   cuadros trabados.
2. **Desenfoque de fondo en las tarjetas y botones** (45 componentes): cada
   tarjeta recalcula su desenfoque sobre el fondo animado. En la categoría,
   sin él y sin lo anterior, el peor 5 % baja de 50 a **17 ms** (60 fps).
3. **El fundido de entrada de las secciones** (14 componentes): aparecen tarde
   aunque ya estén listas.
4. **La entrada escalonada de las grillas**: 48 calcos tardan ~1 s en estar
   todas a la vista.
5. **Caché**: todo se sirve "sin guardar" (`max-age=0`), incluso los archivos
   con huella que nunca cambian.

## 2. Objetivo

Que el scroll vaya **fluido en el celular** y que **el contenido ya esté a la
vista cuando llega a la pantalla**, sin cambiar la cara del sitio más de lo
necesario y sin sumar librerías.

**Cómo se sabrá que funcionó** (mismas condiciones de medición que §1):

| Medida | Hoy | Meta |
|---|---|---|
| Home: cuadros trabados | 18 % | ≤ 8 % |
| Categoría: el 5 % más lento | 50 ms | ≤ 33 ms |
| Home: cuadros con una sección invisible en pantalla | 72 % | ≤ 10 % |
| Segunda visita: imágenes, scripts y estilos ya guardados | se vuelven a consultar | se usan sin consultar |
| LCP del Home | 1,7–1,9 s | no empeora |
| CLS | ≤ 0,05 | sigue ≤ 0,05 |

## 3. Scope

- Las animaciones que repintan: banner de promo del header (y la cuenta
  regresiva, que hoy no se ve pero usa lo mismo), titular con degradado y
  fondo de las páginas.
- El desenfoque de fondo de tarjetas y botones secundarios.
- El momento y la duración del fundido de entrada de las secciones.
- La duración de la entrada escalonada de las grillas.
- Cuánto tiempo guarda el navegador cada tipo de archivo.

## 4. Fuera de scope

- **Miniaturas de las calcos** para las grillas (hoy se bajan de 600 a
  2.000 px para mostrarse a ~150 px). Es la siguiente mejora grande para las
  imágenes, pero suma 6.757 archivos y un paso al proceso del catálogo: va en
  una spec propia si Mariano la quiere (P-4).
- El hero del termo (spec 028): ya medido aparte; su giro y sus calcos corren
  en el compositor.
- El desenfoque del header (un solo elemento; no se midió por separado).
- Cambiar el diseño, los colores o el contenido de las páginas.

## 5. Usuarios afectados

Todos, sobre todo quien entra desde Instagram en el celular (la mayoría del
tráfico, CLAUDE.md regla 12).

## 6. User stories

- Como cliente en el celular, quiero que el scroll no se trabe, para recorrer
  las calcos sin frustrarme.
- Como cliente, quiero que lo que sigue ya esté a la vista cuando bajo, sin
  pantallas vacías que aparecen de a poco.
- Como cliente que vuelve, quiero que el sitio y las calcos que ya vi carguen
  al instante.

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | El banner de promo del header se ve igual que hoy (dorado que se mueve y brillo que lo cruza) pero sin repintar la página en cada cuadro. | 🔴 must |
| RF-2 | El titular con degradado deja de animarse: el degradado queda fijo (P-1). | 🔴 must |
| RF-3 | El fondo de las páginas deja de moverse: queda fijo en el mismo degradado (P-2). | 🔴 must |
| RF-4 | Tarjetas y botones secundarios sin desenfoque de fondo, con el mismo aspecto (el desenfoque casi no se ve: las tarjetas son 82 % opacas). | 🔴 must |
| RF-5 | Las secciones empiezan a aparecer **antes** de entrar en la pantalla y terminan rápido: al llegar, ya se ven. | 🔴 must |
| RF-6 | Las grillas de calcos terminan de aparecer en ≤ 0,5 s; las que se suman con "Ver más" aparecen sin espera. | 🟡 should |
| RF-7 | Los archivos con huella (scripts y estilos) se guardan un año; las imágenes y los datos del catálogo se usan guardados y se actualizan en segundo plano (P-3). La página en sí sigue consultándose siempre, para que cada deploy se vea al toque. | 🔴 must |
| RF-8 | Con movimiento reducido, todo sigue sin animaciones, como hoy. | 🔴 must |

## 8. Requisitos no funcionales

| ID | Tipo | Requisito |
|---|---|---|
| RNF-1 | Rendimiento | Las metas de §2 |
| RNF-2 | Stack | Sin librerías nuevas (regla 10) |
| RNF-3 | Mobile | Se mide y se verifica a 375 px |
| RNF-4 | Conversión | Ningún paso ni texto del camino de compra cambia |

## 9. Reglas de negocio

Sin cambios de precios, promos, envíos ni textos.

## 10. Edge cases

| Caso | Comportamiento |
|---|---|
| Se cambia una imagen del catálogo con el mismo nombre | Quien ya la tenía ve la vieja hasta un día como máximo (P-3) |
| Se deploya una versión nueva | La página se consulta siempre: trae los scripts nuevos al instante |
| Vuelve la promo con cuenta regresiva | La cuenta regresiva también anima sin repintar |
| Navegador sin `IntersectionObserver` | Las secciones se ven directamente (como hoy) |

## 11. Analytics necesarios

Sin eventos nuevos. Se mira en Clarity y GA4, antes y después del deploy: scroll
depth del Home y de las categorías, y `view_item_list` / `select_item` (que no
bajen). Va anotado en `docs/analytics.md`.

## 12. Preguntas abiertas (decisiones de Mariano)

| ID | Pregunta | Propuesta |
|---|---|---|
| P-1 | El titular con degradado (ej. "PIDIENDO CALCOS.") hoy brilla moviéndose. ¿Lo dejamos con el degradado fijo? | Sí: es la animación que más repinta del Home, y fijo se ve igual de vivo |
| P-2 | El fondo de las páginas hoy se desplaza muy despacio (30 s). ¿Lo dejamos fijo? | Sí: el movimiento casi no se percibe y repinta toda la página en cada cuadro |
| P-3 | Imágenes y datos del catálogo: ¿se guardan 1 día y se actualizan solos en segundo plano? | Sí. Una imagen cambiada con el mismo nombre tarda hasta 1 día en verse nueva para quien ya la tenía |
| P-4 | ¿Hacemos después una spec de miniaturas para las grillas? | Recomendado como siguiente paso |
