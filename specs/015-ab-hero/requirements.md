# Requirements — A/B del hero: titular, CTA y ubicación del buscador

| | |
|---|---|
| **Spec** | `015-ab-hero` |
| **Estado** | `EN IMPLEMENTACIÓN` |
| **Fecha** | 04/09/2026 |
| **Ampliada** | 04/09/2026 — se suma el test de ubicación del buscador (§11) |
| **Autor** | Mariano (brief §34) + Claude (redacción) |

---

## 1. Problema

El rediseño de la Home (spec [`014`](../014-rediseno-home-gestalt/requirements.md))
dejó el hero con un solo elemento dominante: el titular. Cuál tiene que ser ese
titular se decidió **por criterio, no por dato**.

Hay dos apuestas razonables y opuestas sobre qué hace entrar a alguien que llega
de un anuncio de Instagram:

- **Catálogo** — *"Calcos para todo lo que te gusta"*: promete amplitud. Dice que
  acá va a encontrar lo suyo, sea lo que sea.
- **Objeto** — *"Tu termo. Pero más vos."*: promete un resultado concreto. Dice
  qué se va a llevar puesto.

Lo mismo con el CTA principal: *"Ver todos los diseños"* describe la acción,
*"Encontrá tus calcos"* describe el resultado.

Hoy no hay forma de saber cuál funciona mejor. El titular y el CTA del hero son
lo primero y lo único que ve la mitad del tráfico antes de decidir si scrollea o
se va: es el lugar del sitio donde una diferencia de copy más se paga.

Los tests A/B quedaron **explícitamente fuera de scope** de la spec 014
(`requirements.md` §3, "se declaran, no se prenden"). Esta spec los prende.

---

## 2. Objetivo

Medir, con tráfico real, cuál de los dos titulares y cuál de los dos CTA del
hero llevan a más gente al catálogo — sin tocar ningún precio y sin que la
persona vea un parpadeo.

**Cómo se sabrá que funcionó:** los informes de GA4 pueden cruzar
`experiment_view` con `search`, `view_item_list` y `purchase`, y las dos
variantes reciben tráfico parejo.

---

## 3. Scope

Sí entra:

- [x] Experimento del **titular** del hero (H1 + subtítulo)
- [x] Experimento del **CTA principal** del hero
- [x] Reparto estable por visitante, sin parpadeo
- [x] Interruptor de emergencia por experimento
- [x] Exposición reportada a GA4 una vez por carga

No entra:

- [x] ~~Test del buscador~~ — **entró por ampliación**, ver §11. Se había
      dejado afuera por ser estructural y no de copy; Mariano lo pidió
      explícitamente después de ver los otros dos andando.
- [ ] **Test de social proof** (brief §34). No es del hero.
- [ ] Cambiar precios, promos o cupones — **prohibido en un experimento**
- [ ] Tocar `title`, meta description o JSON-LD
- [ ] Herramientas externas de A/B testing

---

## 4. Usuarios

Tráfico frío de Instagram en celular, que es el que decide en el hero. El
visitante que vuelve tiene que ver **siempre la misma variante**: si le cambia
entre visitas, el test no mide nada.

---

## 5. User stories

- Como negocio quiero saber **cuál de los dos titulares vende más**, no cuál me
  gusta más.
- Como visitante no quiero ver el titular cambiar delante de mis ojos al cargar
  la página.
- Como visitante que vuelve quiero ver la misma página que la vez anterior.

---

## 6. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-1 | El hero muestra uno de dos titulares (H1 + subtítulo), asignado por visitante. |
| RF-2 | El hero muestra uno de dos textos en el CTA principal, asignado por visitante. |
| RF-3 | Los dos experimentos se asignan de forma **independiente** entre sí. |
| RF-4 | La variante es **estable**: la misma persona ve siempre la misma, entre recargas y entre visitas. |
| RF-5 | La asignación es **sincrónica**: la variante se pinta en el primer frame, sin parpadeo ni salto de layout. |
| RF-6 | Cada experimento tiene un interruptor que manda a todo el mundo a control, sin deploy de lógica. |
| RF-7 | Se puede forzar una variante desde la URL para revisarla (QA). |
| RF-8 | La exposición se reporta a GA4 **una vez por experimento y por carga de página**. |
| RF-9 | **Todas** las variantes del titular nombran el producto ("calco") en el H1 o en el subtítulo. |
| RF-10 | El CTA secundario y el resto del hero **no cambian** entre variantes: lo único que varía es lo que se está midiendo. |

---

## 7. Requisitos no funcionales

| ID | Requisito |
|---|---|
| ANF-1 | **Sin librerías nuevas.** El A/B es propio (ver `lib/experiments.js`). |
| ANF-2 | **Sin scripts bloqueantes** ni parpadeo: nada de anti-flicker en el `<head>`. |
| ANF-3 | **Sin PII.** El id de visitante es un random propio, no un identificador de persona. |
| ANF-4 | **Sin romper la tienda**: en incógnito o con `localStorage` bloqueado, cae a control. |
| ANF-5 | **SEO**: `title`, meta description y JSON-LD no cambian. Sigue habiendo un solo H1. |
| ANF-6 | Los tests existentes siguen pasando. |

---

## 8. Reglas de negocio

- ⚠️ **Un experimento NUNCA toca un precio.** El servidor revalida cada línea
  contra `netlify/functions/lib/pricing.js` y rechaza con `price_mismatch`: un
  A/B de precios dejaría a media tienda sin poder comprar. Esto es sólo copy.
- La variante `variants[0]` es **siempre** el control, y el control es
  exactamente lo que hoy está publicado.
- Nada de lo que promete el hero puede dejar de ser cierto en ninguna variante.

---

## 9. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| `localStorage` bloqueado (incógnito estricto) | Cae a control; no lanza |
| Experimento apagado | Todos a control, aunque tengan otra variante guardada |
| Variante guardada que ya no existe | Se reasigna a una válida |
| Override de URL con una variante inexistente | Se ignora |
| Crawler sin storage | Ve una variante válida; el `title` y la meta description no cambian |

---

## 10. Analytics

No hay evento nuevo: se usa `experiment_view`, que ya existe y ya escribe la
`user_property` `exp_<id>`. Eso es lo que permite segmentar **cualquier** métrica
del funnel por variante sin instrumentar nada más.

| Evento | Parámetros |
|---|---|
| `experiment_view` | `experiment_id`, `experiment_variant`, `user_properties.exp_<id>` |

KPI primario: `search` + `view_item_list` por variante (el hero manda al
catálogo). Secundario: `add_to_cart` y `purchase`.


---

## 11. Ampliación — ubicación del buscador (brief §34, "TEST BUSCADOR")

### Problema

El rediseño puso el buscador en su propia sección **debajo** del hero. La
alternativa —**dentro** del hero, arriba de los CTA— también es defendible: con
61 categorías, buscar es la navegación real del sitio, y cuanto antes aparezca,
antes se usa. Cuál rinde más no se sabe.

### Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-11 | El buscador aparece en **exactamente un** lugar: dentro del hero o en su sección. Nunca en los dos, nunca en ninguno. |
| RF-12 | En la variante `en_hero` el buscador va **arriba** de los CTA del hero. |
| RF-13 | En la variante `en_hero` la sección `¿Qué te gusta?` no se renderiza. |
| RF-14 | El bloque de búsqueda lleva el **mismo** contenido en las dos variantes (campo, chips sugeridos y búsquedas recientes). |
| RF-15 | Los chips y el campo son legibles sobre el degradado del hero. |
| RF-16 | El control es `debajo`: la sección propia, que es lo publicado hoy. |

### Requisitos no funcionales

| ID | Requisito |
|---|---|
| ANF-7 | Sin CLS: la ubicación se decide antes del primer pintado. |
| ANF-8 | A 375 px no aparece scroll horizontal en ninguna de las dos variantes. |

### Lo que este test acepta a cambio

Meter el buscador con sus chips dentro del hero lo agranda de **517 px a
774 px** (visitante nuevo, sin búsquedas recientes). El CTA principal se corre
de ~330 px a **643 px**: sigue entrando en un iPhone de 812 px de alto, pero en
uno de 667 px queda al borde, y con búsquedas recientes guardadas el hero suma
~90 px más y el CTA cae abajo del fold.

**No se compensa achicando el padding del hero en esa variante.** Correr los
CTA es una consecuencia real de poner el buscador arriba, no un efecto colateral
a disimular: la pregunta de negocio es "¿conviene el buscador arriba, aunque los
CTA bajen?", y compensarlo respondería otra pregunta, sobre un hero que no
existe. Lo que sí queda anotado: **si `en_hero` pierde, puede ser por el
desplazamiento de los CTA y no por la ubicación del buscador** — separarlo pide
un tercer brazo con el hero más compacto.
