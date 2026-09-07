# Requirements — Segundo lote del catálogo (CALCOS NUEVAS PARA WEB)

| | |
|---|---|
| **Spec** | `016-catalogo-lote-2` |
| **Estado** | `EN IMPLEMENTACIÓN` |
| **Fecha** | 04/09/2026 |
| **Autor** | Mariano (pedido) + Claude (redacción) |

---

## 1. Problema

Hay **3.463 calcos nuevas** listas en iCloud, en 43 carpetas, sin publicar:

```
…/EPICALCOS/CALCOS NUEVAS PARA WEB/
```

La tienda publica hoy **61 categorías / 3.397 diseños**. El lote nuevo duplica
el catálogo, pero **no se puede usar el importador que ya existe**:
`import-catalogo-completo.mjs` es un REEMPLAZO — borra `public/stickers/` entero
y renumera desde 1. Correrlo contra esta carpeta borraría los 3.397 diseños
publicados y, de paso, dejaría ~4.000 SKUs de Meta apuntando a otro dibujo.

Lo que hace falta es lo contrario: **agregar sin tocar lo que ya está**.

Además, 32 de las 43 carpetas corresponden a categorías que YA existen
(`ARGENTINA`, `MESSI`, `SIMPSONS`…) y hay que hacerlas coincidir, no crear
categorías paralelas.

---

## 2. Objetivo

Que las calcos nuevas queden publicadas y comprables junto a las que ya están,
sin que ningún diseño, SKU, URL o portada existente cambie de significado.

**Cómo se sabrá que funcionó:** `catalog.json` sube de 3.397 a ~6.500 diseños y
de 61 a 72 categorías; los SKUs ya asignados siguen apuntando al mismo dibujo; y
la suite pasa, incluido el test de coherencia de portadas.

---

## 3. Scope

Sí entra:

- [x] Importador **append-only**: no borra, no renumera, resumible
- [x] Mapa carpeta → categoría, con las 32 coincidencias y las fusiones acordadas
- [x] 11 categorías nuevas, con nombre, emoji, slug y alias de búsqueda
- [x] Deduplicado por contenido contra el lote nuevo **y contra lo ya publicado**
- [x] Regenerar catálogo, duplicados, portadas y SKUs
- [x] Excluir `weed` del feed de Meta
- [x] Tests que cubran lo que puede romperse en silencio

No entra:

- [ ] **Usar los nombres de archivo como nombre de producto** — decisión de
      Mariano: el lote entra numerado, igual que los 3.397 actuales
- [ ] Precios, promos, cupones y envíos — no se toca ni un número
- [ ] Rediseñar la grilla, la ficha o el buscador
- [ ] Renumerar o reasignar SKUs existentes
- [ ] Recortes para el fondo del hero (`nuevas-catalogo.json` sigue como está)

---

## 4. Decisiones tomadas por Mariano (04/09/2026)

| Pregunta | Decisión |
|---|---|
| Categoría `WEED` (82 calcos de cannabis) | **Se importa, pero queda fuera del feed de Meta.** La política de comercio de Meta prohíbe drogas y parafernalia, y un rechazo puede arrastrar al catálogo entero o a la cuenta publicitaria |
| Los archivos traen nombre real (`04-gato-negro-comiendo-ramen.jpg`) | **Se importan numerados, como hoy.** Los nombres se descartan; usarlos es una feature aparte |
| 4 carpetas que se superponen | **Fusionar las cuatro** (ver §6) |

---

## 5. Usuarios

El comprador que llega al catálogo: tiene que encontrar los diseños nuevos
mezclados con los viejos, sin duplicados visibles y sin categorías que se pisen.

---

## 6. Mapa de categorías

**Coinciden con una categoría existente (32 carpetas → 30 slugs):**

`ANIME`, `ARGENTINA`, `BOB-ESPONJA`, `BOCA-JUNIORS`, `BREAKING-BAD`,
`CORAZONES`, `DISNEY`, `FEMINISMO`, `FLORES`, `FORMULA-1`, `FRIENDS`,
`GREYS-ANATOMY`, `HARRY-POTTER`, `LILO-Y-STITCH`, `MARADONA`, `MARVEL`,
`MEMES`, `MESSI`, `NBA`, `NEWELLS`→`newells-old-boys`, `RIVER-PLATE`,
`ROSARIO-CENTRAL`, `SCALONETA`, `SIMPSONS`→`los-simpsons`, `STRANGER-THINGS`,
`TAYLOR-SWIFT`, `VSCO`.

**Fusiones acordadas (4 carpetas hacia categorías existentes):**

| Carpeta | Va a | Por qué |
|---|---|---|
| `ERAS-TOUR` | `taylor-swift` | El Eras Tour **es** Taylor Swift; dos categorías competirían entre sí |
| `ROCK-ARGENTINO` | `rock-nacional` | Es el mismo género con otro nombre |
| `GOOD-VIBES` | `shaka-good-vibes` | La categoría ya existe con ese nombre |
| `CARA-SONRIENTE` + `SMILEY-FACE` | `caras-sonrientes` | Son lo mismo en dos idiomas; separadas parten el catálogo |

**Categorías nuevas (11):**

`arte`, `aura`, `bad-bunny`, `lord-of-the-rings`, `moda`, `pixar`, `rey-leon`,
`shrek`, `tarot`, `verano`, `weed`.

---

## 7. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-1 | La importación es **append-only**: ningún `.webp` publicado se borra, se mueve ni cambia de número. |
| RF-2 | Los diseños nuevos se numeran a continuación del último de su categoría. |
| RF-3 | Un diseño nuevo que ya está publicado en esa categoría **no se agrega**. |
| RF-4 | Dentro del lote nuevo, dos archivos con el mismo contenido entran **una sola vez** por categoría. |
| RF-5 | El mismo diseño **sí** puede quedar en dos categorías distintas (es a propósito, como hoy). |
| RF-6 | Las 11 categorías nuevas aparecen en el listado, el buscador, el sitemap y el feed — salvo `weed`, que no va al feed. |
| RF-7 | Cada categoría nueva tiene alias de búsqueda: escribir "señor de los anillos", "tarot", "porro" o "bad bunny" la encuentra. |
| RF-8 | Los SKUs ya asignados siguen apuntando al mismo diseño. Los nuevos toman los siguientes libres. |
| RF-9 | `weed` no aparece en `meta-catalog.csv` ni consume SKUs del registro. |
| RF-10 | Las portadas se recalculan: ningún índice apunta a un dibujo distinto del que apuntaba. |
| RF-11 | El proceso es **resumible**: cortarlo a la mitad y volver a correrlo no duplica ni corrompe nada. |

---

## 8. Requisitos no funcionales

| ID | Requisito |
|---|---|
| ANF-1 | **iCloud**: los originales son *dataless*; se leen con concurrencia baja (3). Con 8 se cuelga — está documentado. |
| ANF-2 | Los `.webp` publicados mantienen el formato del lote actual: 600 px de ancho, calidad 82. |
| ANF-3 | Sin dependencias nuevas de npm (se usan `cwebp` y `magick`, ya en uso). |
| ANF-4 | El peso agregado al repo queda declarado (hoy son ~106 MB). |
| ANF-5 | La suite pasa entera, incluido el test de coherencia de portadas. |
| ANF-6 | `CATEGORY_COUNT` queda sincronizado con las categorías publicadas. |

---

## 9. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Un original no baja de iCloud | Se reporta y se sigue; no queda un `.webp` de 0 bytes |
| Un JPG en CMYK que `cwebp` no lee | Fallback `sips` → PNG → `cwebp`, como ya hace `topup-catalogo.mjs` |
| Correr el importador dos veces | La segunda no agrega nada (todo queda deduplicado contra lo publicado) |
| Una categoría nueva queda vacía | No se crea ni entra en `CATEGORIES` |
| `build-portadas.mjs` no se corre | El test de coherencia lo caza y corta el deploy |
| Alguien corre `import-catalogo-completo.mjs` después | **Borraría este lote.** Queda advertido en el código (§ design) |

---

## 10. Analytics

Ninguno nuevo. Los diseños nuevos usan los mismos eventos que los actuales
(`view_item_list`, `select_item`, `add_to_cart`…) sin cambios.
