# Requirements — Calcos en la primera pantalla

| | |
|---|---|
| **Spec** | `038-home-producto-primero` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 (auditoría UX/UI en celular) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Quien llega desde un anuncio de Instagram (la mayoría del tráfico, en celular)
no ve **ninguna calco** en la primera pantalla del Home ni de una categoría.

Lo observado el 20/11/2026 a 375 × 812:

- **Home**: banner de la promo de 100, header, tira de envío y un titular con dos
  botones (POR MENOR / POR MAYOR). El primer producto aparece a ~1.100 px, en
  "Los más elegidos". El Home mide ~12.400 px (unas 15 pantallas).
- **"Los más elegidos" no son los más elegidos**: son cuatro diseños al azar de
  cuatro categorías, distintos en cada recarga (Anime #92, después Anime #13).
  El propio código lo anota como hallazgo desde la spec 014.
- **Categoría** (`/categoria/argentina`): la grilla empieza a ~1.000 px. Antes van
  chips de material, un selector de categoría, el aviso del 10 %, un buscador
  "por número de diseño" y el selector de tamaño.
- **Popup del 10 %**: en el celular se abre a los 15 s o con el 50 % de scroll
  del Home, muchas veces antes de que la persona haya visto un producto.
- **Ocupación de la pantalla**: el botón de WhatsApp tapa el botón "Buscar" del
  buscador del Home; con el acceso "10 % OFF" y el header fijo, ~14 % de la
  pantalla queda tapada.

Contexto de negocio (CRM, 20/11/2026): los pedidos web pagos cayeron de ~6 por
semana en septiembre a ~1 por semana desde el 1/10, y los pedidos por lead de
0,30 a 0,13. El Home cambió al selector POR MENOR / POR MAYOR el 5/10, en la
misma ventana que la suba de precios y el fin del 3x2: **no se puede atribuir la
caída al Home sin un test**, y por eso esta spec lo propone como A/B.

## 2. Objetivo

Que en la primera pantalla del Home y de cada categoría haya calcos reales que
se puedan agregar al carrito de un toque, y que "los más elegidos" sean de
verdad los más vendidos.

**Cómo se sabrá que funcionó**: en el A/B `home_producto`, la variante con
calcos arriba tiene más **agregados al carrito por sesión** que el control, con
al menos 2 semanas y 1.000 sesiones por variante, sin bajar los pedidos por
sesión.

## 3. Scope

- [ ] Home: una fila de 6 calcos más vendidos con "+" directo, en la primera
      pantalla del celular, junto al buscador. El selector POR MENOR / POR MAYOR
      pasa a ser dos chips debajo.
- [ ] El cambio del Home corre como A/B contra el Home actual (control).
- [ ] "Los más elegidos" (Home) y el orden por defecto de las categorías salen
      de un ranking real de ventas de los últimos 30 días.
- [ ] Categoría: la grilla empieza en la primera pantalla; los chips de material
      y producción pasan a una línea plegable.
- [ ] Orden por defecto de una categoría: más vendidos primero.
- [ ] Popup del 10 %: se abre después de 2 fichas vistas, 40 s en el sitio o
      intención de salida, como A/B contra el disparo actual.
- [ ] El botón de WhatsApp no tapa el botón "Buscar" del Home.

## 4. Fuera de scope

- Rediseñar el resto del Home (categorías en carrusel, beneficios en una fila,
  FAQ corto): se anota como hallazgo, va en otra spec si el A/B da bien.
- Nombres nuevos para los diseños: spec 046.
- Cambios de precio, promos o cupones. El "+" agrega al precio de hoy.
- Los packs cerrados (spec 041) y la oferta de cantidad (spec 040).

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Visitante de anuncio en celular | Ve calcos y puede agregar sin bajar |
| Comprador mayorista | Llega a /mayorista desde el chip, un toque más abajo que hoy |
| Mariano | Tiene que regenerar el ranking (o dejar que corra solo) |

## 6. User stories

- Como visitante que viene de un anuncio de calcos, quiero ver calcos apenas
  entro, para saber que estoy en el lugar correcto.
- Como comprador indeciso, quiero ver lo que más compra la gente, para elegir
  rápido entre 3.397 diseños.
- Como comprador que arma de a varias, quiero que la grilla empiece arriba, para
  no bajar 1.000 px antes de cada categoría.

## 7. Requisitos funcionales

- **RF-1** En la variante, a 375 × 812, la primera pantalla del Home muestra al
  menos 3 calcos completas con su precio y su "+", sin scroll.
- **RF-2** El "+" agrega en el tamaño por defecto (6 cm) sin abrir el carrito,
  con la misma devolución que la grilla de categorías.
- **RF-3** Los 6 diseños del Home son los primeros 6 del ranking de ventas que
  sigan existiendo en el catálogo. Son los mismos en cada recarga.
- **RF-4** Si el ranking no está disponible, se usa una lista fija curada por
  Mariano; nunca una al azar.
- **RF-5** El ranking cuenta unidades vendidas por diseño en pedidos pagados de
  los últimos 30 días y se actualiza al menos una vez por semana.
- **RF-6** Los diseños con menos de 3 unidades en la ventana no entran al
  ranking (un solo pedido grande no lo define).
- **RF-7** Una categoría se abre ordenada por ventas; lo que no vendió sigue en
  el orden actual.
- **RF-8** En una categoría, a 375 × 812, la primera fila de la grilla se ve sin
  scroll.
- **RF-9** El popup en la variante nueva no se abre por scroll ni antes de 40 s,
  salvo por 2 fichas vistas, búsqueda o intención de salida.
- **RF-10** El botón flotante de WhatsApp no se superpone con ningún botón del
  buscador del Home.

## 8. Requisitos no funcionales

- **Performance**: la fila del Home no puede empeorar el LCP del Home (hoy es
  eager). Las imágenes de la fila llevan tamaño fijo y no empujan el layout.
- **Accesibilidad**: cada "+" con `aria-label` que nombra diseño y tamaño;
  targets de 44 px.
- **Mobile-first**: se diseña a 375 px.

## 9. Reglas de negocio

- El precio que se muestra es el de vidriera de hoy, el mismo que valida el
  servidor. Nada de esta spec cambia precios.
- El ranking no se edita a mano: si un diseño "tiene" que estar, va en la lista
  curada de respaldo, no inflando el ranking.
- "Más vendidos" solo se dice si sale del ranking. Con la lista curada, el
  título es "Elegidos por nosotros".

## 10. Edge cases

- Un diseño del ranking se borró del catálogo → se saltea.
- Ranking con menos de 6 diseños → se completa con la lista curada.
- Visitante con carrito lleno que vuelve al Home → ve la misma fila, con el
  contador de cuántas lleva de cada una.
- `prefers-reduced-motion` → sin animaciones nuevas.
- Navegador embebido de Instagram → todo anda sin depender de APIs nuevas.

## 11. Analytics necesarios

### Eventos nuevos
- Ninguno nuevo: la fila usa `view_item_list` / `add_to_cart` con
  `item_list_name` propio ("Home primera pantalla").

### Eventos existentes que cambian
- `view_item_list` de "Los más vendidos": el nombre de la lista no cambia (la
  serie histórica se mantiene).
- Todos los eventos del Home llevan la variante del A/B `home_producto`.
- El popup reporta la variante del A/B `popup_momento` en `popup_view`.

### Qué se quiere poder responder
- ¿La fila arriba sube los agregados por sesión y los pedidos por sesión?
- ¿El popup más tarde baja los leads? ¿Cuántos, contra cuántos pedidos más?

## 12. Preguntas abiertas

- [ ] **P-1 · Lista curada de respaldo.** ¿Qué 12 diseños elegís para cuando no
      haya ranking? (propuesta: los 12 que más se usan en anuncios).
- [ ] **P-2 · Fuente del ranking.** `design.md` propone los pedidos del store de
      Blobs. ¿Te sirve que corra solo una vez por semana o preferís regenerarlo
      a mano, como el feed de Meta?
- [ ] **P-3 · Popup.** ¿Aceptás perder algunos leads a cambio de no interrumpir
      antes de ver producto? El A/B lo mide, pero arranca con la mitad del
      tráfico en la variante nueva.
