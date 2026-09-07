# Acceptance — Nombres para los 6.757 diseños

| | |
|---|---|
| **Spec** | `018-nombres-de-disenos` |
| **Estado** | `DRAFT` |
| **Tasks** | [`tasks.md`](tasks.md) |

> **Si no está acá, no es parte de "terminado".**
> Al terminar se recorre punto por punto y se reporta el resultado **real** (regla 15).

---

## 1. Criterios funcionales

### El helper y el fallback

- [ ] **CF-1** — ⭐ Con `nombres.json` **vacío**, el sitio se ve **exactamente
      igual que hoy**. Es lo que permite nombrar por partes sin romper nada.
- [ ] **CF-2** — Un diseño sin `name` muestra `Categoría #N`.
- [ ] **CF-3** — Un `name` vacío o de solo espacios cae al fallback, no deja la
      card en blanco.
- [ ] **CF-4** — El fallback vive en **un solo lugar**: no quedan copias de la
      plantilla en `Producto`, `Category` ni `FeaturedStickers`.

### Los nombres

- [ ] **CF-5** — Ningún nombre pasa de **60 caracteres**.
- [ ] **CF-6** — Ningún nombre contiene "calco", "sticker" ni "diseño".
- [ ] **CF-7** — Ningún nombre empieza repitiendo su categoría (`"Anime Majin Buu"`).
- [ ] **CF-8** — Todo id de `nombres.json` **existe** en el catálogo.
- [ ] **CF-9** — Cuando el diseño tiene texto, el nombre **es** ese texto
      (`frases/60` → "Choose happy").
- [ ] **CF-10** — Cuando hay personaje reconocible, aparece su nombre propio
      (`anime/4` → contiene "Majin Buu").

### El pipeline

- [ ] **CF-11** — ⚠️ Después de correr `build-catalog`, **los SKUs siguen
      intactos**: `anime-1` → `000001`.
- [ ] **CF-12** — ⚠️ Después de correr `build-catalog`, **los nombres siguen
      ahí**. Es el mismo mecanismo que protege a los SKUs; si falla, el próximo
      lote de catálogo borra todo este trabajo.
- [ ] **CF-13** — El feed de Meta usa el nombre como `title`.
- [ ] **CF-14** — La `description` del feed deja de ser idéntica en todas las filas.
- [ ] **CF-15** — El feed **no renumera** ningún SKU.
- [ ] **CF-16** — Correr el script dos veces no cambia los nombres ya escritos
      ni gasta tokens (idempotencia).
- [ ] **CF-17** — `--dry` no escribe nada ni llama a la API.

### Las pantallas

- [ ] **CF-18** — La ficha muestra el nombre en el `<h1>` y el `#N` al lado.
- [ ] **CF-19** — El `<title>`, la meta description y el JSON-LD llevan el nombre.
- [ ] **CF-20** — ⭐ El buscador **dentro** de la categoría encuentra "goku"
      entre los 118 diseños de anime.
- [ ] **CF-21** — La grilla, el carrito y el checkout muestran el nombre.
- [ ] **CF-22** — La URL **no cambia**: `/producto/anime/4` sigue resolviendo.

---

## 2. Criterios no funcionales

- [ ] **CNF-1** — El **bundle no crece**: los nombres viven en los manifests, que
      se bajan por categoría, no se hornean.
- [ ] **CNF-2** — A 375 px un nombre largo no rompe la card ni empuja el precio
      fuera de la fila.
- [ ] **CNF-3** — Sin dependencias nuevas en `package.json`.
- [ ] **CNF-4** — `ANTHROPIC_API_KEY` **no** aparece en el bundle, ni se
      commitea, ni es una `VITE_*`.
- [ ] **CNF-5** — El manifest de una categoría no crece de forma perceptible
      (medir `anime.json` antes y después).

---

## 3. Edge cases

- [ ] **EC-1** — Sin `ANTHROPIC_API_KEY` el script corta con un mensaje útil y
      **no escribe nada**.
- [ ] **EC-2** — Un lote que falla dos veces se saltea: esos diseños quedan sin
      nombre y el resto se guarda.
- [ ] **EC-3** — Una respuesta que no es JSON descarta el lote entero; **no se
      guarda basura** en el registro.
- [ ] **EC-4** — Dos diseños con el mismo nombre en una categoría no rompen nada
      (la URL no depende del nombre).
- [ ] **EC-5** — Texto en otro idioma se transcribe tal cual ("choose happy").
- [ ] **EC-6** — Un carrito guardado antes del nombrado sigue funcionando: la
      línea muestra el nombre viejo y **el precio no cambia**.
- [ ] **EC-7** — `nombres.json` inexistente se crea vacío.

---

## 4. Regresión — lo que NO se puede haber roto

- [ ] **REG-1** — ⚠️ **Ningún checkout se rechaza con `price_mismatch`.** Esta
      spec no toca el camino de precios; si esto falla, algo se salió de scope.
- [ ] **REG-2** — Las tres promos de la spec 017 siguen aplicando igual.
- [ ] **REG-3** — Las 72 categorías siguen renderizando con sus 6.757 diseños.
- [ ] **REG-4** — Los SKUs del feed no se movieron (CF-11/CF-15).
- [ ] **REG-5** — `add_to_cart` y `view_item` siguen llegando a GA4 y a Meta —
      ahora con `item_name` de verdad.
- [ ] **REG-6** — El sitemap sigue generando las mismas URLs.
- [ ] **REG-7** — `npm test` en verde: **487 como piso**, más los nuevos.

---

## 5. El piloto *(la puerta de la fase 4)*

- [ ] **PIL-1** — ⭐ Mariano revisó la tabla de `frases` + `anime` y dio el OK
      **explícito**.
- [ ] **PIL-2** — La tabla muestra la **imagen al lado del nombre**, no un JSON.
- [ ] **PIL-3** — Sobre la muestra revisada, los nombres son correctos en una
      proporción que Mariano considere aceptable. **Ese número lo pone él**, no
      la spec.
- [ ] **PIL-4** — Los casos de la calibración (design §1) salen como ahí:
      `frases/25` → "Positive energy", `anime/4` → contiene "Majin Buu",
      `frases/1` **NO** se nombra como si fuera una frase.

---

## Definition of Done

### Código
- [ ] Todos los criterios de arriba, con su resultado real reportado
- [ ] `npm test` en verde
- [ ] Sin refactors fuera de scope (regla 8)
- [ ] Comentarios que explican **por qué**, con la densidad del repo

### Seguridad
- [ ] La API key solo en el entorno local, nunca en el repo ni en el bundle
- [ ] `.env.example` documenta que es una variable de **build**, no de runtime

### Documentación
- [ ] `architecture.md` con el paso de nombrado en el pipeline
- [ ] `integrations.md` aclarando que la API de Claude es herramienta de build

### Proceso
- [ ] El piloto se revisó **antes** de correr las 70 categorías restantes
- [ ] Mariano avisado de que un push a `main` es un deploy

---

## Resultado de la validación

_(se completa al terminar la implementación, no antes)_

| | |
|---|---|
| **Fecha** | |
| **Criterios cumplidos** | / |
| **Criterios no cumplidos** | |
| **Diseños nombrados** | / 6.757 |
| **Costo real de la API** | |
