# Requirements — A/B del hero: titular y CTA principal

| | |
|---|---|
| **Spec** | `015-ab-hero` |
| **Estado** | `EN IMPLEMENTACIÓN` |
| **Fecha** | 04/09/2026 |
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

- [ ] **Test del buscador** (brief §34, "dentro del hero" vs "debajo"). Es un
      cambio estructural, no de copy: mueve una sección entera, arriesga CLS
      arriba del fold y contradice una decisión que se acaba de tomar en la
      spec 014. Se propone aparte.
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
