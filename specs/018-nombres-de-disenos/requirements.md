# Requirements — Nombres para los 6.757 diseños

| | |
|---|---|
| **Spec** | `018-nombres-de-disenos` |
| **Estado** | `DRAFT` |
| **Fecha** | 07/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

---

## 1. Problema

**Ningún diseño del catálogo tiene nombre.** Los 6.757 se llaman por su número:

```json
{"id":"anime-4","file":"/stickers/anime/4.webp"}   →  se muestra "ANIME #4"
```

Ese diseño es **Majin Buu**. Nadie lo sabe salvo mirándolo.

Rompe tres cosas a la vez:

| Canal | Qué pasa hoy |
|---|---|
| **Buscador del sitio** | `aliases.json` mapea términos a **categorías**, no a diseños. Quien escribe "Goku" cae en la grilla de anime con 118 diseños y tiene que cazarlo con el ojo |
| **SEO** | 6.757 páginas de producto indexables sin una sola palabra única. No pueden rankear para "calco de goku" ni "sticker positive energy" — que es el long tail de alta intención, y es tráfico gratis |
| **Feed de Meta** | 6.680 filas tituladas `Anime · Calco #4` con la **misma descripción copiada**. Advantage+ y el retargeting dinámico no tienen ninguna señal para matchear intención |

El catálogo **duplicó** el 7/9/2026 (3.397 → 6.757), así que el costo de no
tener nombres también duplicó.

---

## 2. Objetivo

Que cada diseño tenga un nombre que describa **lo que se ve**, y que ese nombre
llegue a las tres superficies donde hoy falta: la pantalla, el feed de Meta y el
`<title>` de la página.

**Cómo se sabrá que funcionó**: aparecen impresiones en Search Console para
consultas de diseño ("calco goku", "sticker choose happy") que hoy no existen, y
el CTR del catálogo de Meta sube.

---

## 3. Scope

- [ ] Un campo `name` por diseño en `/data/<slug>.json`.
- [ ] Ese nombre se muestra en la grilla, la ficha, el carrito y el checkout.
- [ ] Va al `<title>`, al `<h1>`, a la meta description y al JSON-LD.
- [ ] Va al **feed de Meta** como `title`, y alimenta una `description` por diseño.
- [ ] El buscador **dentro** de una categoría filtra por nombre (hoy filtra por
      "Anime #4", o sea por número).
- [ ] Un **piloto de 2 categorías** (`frases` + `anime`, ~200 diseños) que Mariano
      revisa **antes** de correr el resto.

---

## 4. Fuera de scope

- **Cambiar las URLs.** `/producto/anime/4` se queda como está (decisión de
  Mariano, 7/9/2026). Ver RN-2.
- **Buscador global por diseño** — que "Goku" desde el Home lleve al diseño y no
  a la categoría. Es la consecuencia natural de tener nombres y el mayor premio
  de UX, pero es una feature aparte: necesita un índice cargado aparte del
  bundle. Se diseña en `design.md` §8 como **fase 2** y no entra acá.
- **Descripción larga por diseño.** El manifest ya soporta `description` y la
  ficha ya la lee; se llena con una plantilla derivada del nombre, no con texto
  escrito diseño por diseño.
- **Renombrar archivos o carpetas.** Los `.webp` y los ids no se tocan.
- **Tocar los SKUs.** Meta trackea por id: renumerar rompe el catálogo.

---

## 5. Usuarios

| Usuario | Qué gana |
|---|---|
| El que busca en Google | Encuentra "calco de goku" y llega a la ficha, no a nada |
| El que ya está en la categoría | Filtra 118 diseños escribiendo "goku" en vez de scrollear |
| Meta / Advantage+ | Una señal real para matchear intención con producto |
| Mariano | Poder decir de qué es un diseño sin abrir la imagen |

---

## 6. Requisitos funcionales

### RF-1 — Un nombre por diseño
Cada entrada de `/data/<slug>.json` gana un `name`. **Es opcional**: un diseño
sin `name` sigue mostrándose como hoy (`Anime #4`), así que el catálogo puede
nombrarse por partes sin que nada quede roto en el medio.

### RF-2 — Qué dice el nombre
Describe **lo que se ve**, en este orden de preferencia:

1. **Si hay texto en el diseño, el texto ES el nombre.** `"Choose happy"`.
2. **Si hay un personaje reconocible, su nombre propio.** `"Majin Buu"`.
3. **Personaje + texto, si hay los dos.** `"Mudkip drink more water"`.
4. **Si no hay ninguno, descripción corta de lo que se ve.**
   `"Aura arcoíris figura abierta"`.

### RF-3 — Largo y forma
- Entre 2 y 6 palabras. Máximo 60 caracteres.
- Sin la categoría adentro (`"Majin Buu"`, no `"Anime Majin Buu"`): la categoría
  ya se muestra al lado y repetirla come el ancho de la card, que a 375 px no
  sobra.
- Sin "calco", "sticker" ni "diseño": es lo único que TODOS tienen.
- Primera letra en mayúscula, el resto natural.

### RF-4 — Piloto antes del catálogo
Primero corren `frases` y `anime`. Mariano revisa una tabla con imagen y nombre
propuesto. **Recién con su OK corre el resto.**

### RF-5 — El feed de Meta se regenera
`title` pasa de `Anime · Calco #4` a `Majin Buu`, y la `description` deja de ser
idéntica en las 6.680 filas. **Los SKUs no se tocan.**

### RF-6 — Reversible
Los nombres viven en los manifests, que son generados. Se puede volver atrás
borrando el campo, sin tocar código.

---

## 7. Requisitos no funcionales

- **RNF-1 — Peso.** Los manifests ya se bajan por categoría (fetch on-demand);
  sumar un nombre por diseño no puede empeorar de forma perceptible la carga de
  una categoría. **El bundle no crece**: los nombres no se hornean.
- **RNF-2 — Los SKUs sobreviven.** Igual que en el segundo lote: se relee el
  manifest antes de escribirlo.
- **RNF-3 — Idempotente.** Correr el nombrado dos veces no cambia lo ya nombrado
  salvo que se pida explícitamente.
- **RNF-4 — Sin dependencias nuevas** (regla 10). La llamada a la API va por
  `fetch`, que ya está.

---

## 8. Reglas de negocio

| Regla | Valor |
|---|---|
| **RN-1 — Nombres propios de marca** | **SÍ** (decisión de Mariano, 7/9/2026). "Majin Buu", "Sulley y Boo", "Taylor Swift". Es lo que la gente busca y el 80 % del valor. Ver §10 |
| **RN-2 — URLs** | **No cambian.** `/producto/anime/4` sigue igual: no rompe links indexados, ni el feed de 6.680 filas ya vivo, ni el sitemap |
| **RN-3 — Alcance del primer pase** | Piloto `frases` + `anime`, revisión, después el resto |
| **RN-4 — Nombre ausente** | Se muestra `Categoría #N`, como hoy |

---

## 9. Edge cases

| Caso | Qué tiene que pasar |
|---|---|
| Dos diseños con el mismo nombre en una categoría | **Se permite.** El id sigue siendo único y la URL no depende del nombre (RN-2). Si molesta visualmente, se desempata mostrando el `#N` al lado |
| Un diseño que el modelo no reconoce | Devuelve descripción genérica, o nada. Sin `name` se muestra `#N` (RF-1) |
| Texto en el diseño en otro idioma | Se transcribe **tal cual**: "choose happy" se busca en inglés, que es como está escrito |
| Diseño con texto ilegible o recortado | Descripción de lo que se ve, no una transcripción inventada |
| El manifest se regenera (`build-catalog`) | **Los nombres tienen que sobrevivir**, igual que los SKUs |
| Categoría no homogénea | `frases/1` NO es una frase: es un monigote con dos "peace". El criterio es lo que se VE, no lo que promete la carpeta |

---

## 10. Riesgos declarados

1. **6.757 títulos con marcas de terceros salen al feed de Meta y a Google.**
   Es lo que Mariano decidió y es donde está el valor. El sitio ya nombra las
   categorías así (`harry-potter`, `taylor-swift`, `bad-bunny`), así que no es
   una superficie nueva — pero sí mucho más grande. **Vale saber que el volumen
   cambia la exposición aunque el criterio no cambie.**

2. **Un nombre equivocado es peor que ningún nombre.** "Goku" en un diseño que
   es Vegeta manda tráfico que rebota, y en el feed de Meta le enseña al
   algoritmo una asociación falsa. De ahí el piloto (RF-4) y el criterio de
   preferir descripción antes que adivinar (§9).

3. **El costo de rehacerlo crece con el catálogo.** Hoy son 6.757; el próximo
   lote lo va a hacer más caro. Conviene que el nombrado quede como paso del
   pipeline, no como una corrida única.
