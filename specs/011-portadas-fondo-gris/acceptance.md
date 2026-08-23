# Acceptance — Portadas de categoría con fondo gris uniforme

| | |
|---|---|
| **Spec** | `011-portadas-fondo-gris` |
| **Estado** | `DONE` |
| **Fecha** | 23/08/2026 |

> **Si no está acá, no es parte de "terminado".**
> Resultado real de cada punto al cerrar la feature (`CLAUDE.md` regla 15).

---

## Criterios

| # | Criterio | Cubre | Resultado |
|---|---|---|---|
| **A-1** | Las 54 categorías con diseños de fondo liso muestran **siempre** uno de esos, en cualquier rotación | RF-1, RF-5 | ✅ test `portadaDe` + `rotacionesSinRepetir` sobre `portadas.json` real, semillas 0/1/7/42/1234/9999; y en el navegador, 61/61 dentro de la lista en dos visitas seguidas |
| **A-2** | El recuadro de la portada es `#F8F8F8` en todas las cards | RF-2 | ✅ `CategoryCard` pinta `PORTADA_BG`, importado del mismo módulo que usa el detector |
| **A-3** | Las 7 categorías sin ningún diseño gris (`animales`, `clubes-rosario`, `formula-1`, `hockey`, `rosa`, `stranger-things`, `the-office`) muestran igual su portada, sobre el gris de la card | RF-3 | ✅ no están en `portadas.json`; `portadaDe` cae al camino de siempre |
| **A-4** | El diseño se ve entero y centrado, sin recortes | RF-4 | ✅ `w-full h-full object-contain` dentro de `grid place-items-center p-4` |
| **A-5** | Dos categorías de la misma grilla no muestran el mismo dibujo | RF-6 | ✅ test de no-repetición, ahora con la lista restringida |
| **A-6** | El contador de diseños se lee sobre el fondo claro | RF-7 | ✅ pill `bg-black/55` con texto blanco (≈ 12:1) |
| **A-7** | Sin `portadas.json` la grilla funciona como antes | RF-8 | ✅ `.catch(() => ({}))` en los dos fetch + tests de `portadaDe` sin lista |
| **A-8** | Todo índice de `portadas.json` existe en su categoría | — | ✅ test de coherencia contra `catalog.json` |
| **A-9** | El dato extra pesa < 10 KB y no agrega una cascada | RNF-2 | ✅ 3,6 KB crudo (1,4 KB gzip), en paralelo con `catalog.json` |
| **A-10** | La grilla no salta a 375 px | RNF-1, RNF-6 | ✅ `aspect-square` + `width`/`height` de 320 sin cambios |
| **A-11** | Sin dependencias nuevas | RNF-5 | ✅ `magick`, que el repo ya usa en `import-catalogo-completo.mjs` |
| **A-12** | `npm test` en verde desde la raíz | — | ✅ 258 tests, 15 archivos (8 nuevos en `portadas.test.js`) |

---

## Definition of Done

- [x] Todos los criterios de arriba verificados con su resultado real escrito.
- [x] `npm test` en verde (es condición del deploy, no un recordatorio).
- [x] Sin refactors fuera de scope: `Hero.jsx` y `PackBuilder.jsx` leen
      `catalog.json` y **no** se tocaron.
- [x] Sin secretos nuevos, sin `VITE_` nuevas.
- [x] Comentarios que explican **por qué**, no qué.
- [x] Spec completa: `requirements` / `design` / `tasks` / `acceptance`.

---

## Verificado

**En el navegador** (`localhost:5173`, dev server):

- `/categorias`: 61 cards, las 61 con recuadro `rgb(248, 248, 248)`, ninguna con
  drop-shadow, **0 diseños fuera de su lista** y 61 `src` distintos (no se repite
  ningún dibujo). Recargado dos veces con semillas distintas: mismo resultado.
- `/` (Home): las 10 destacadas, mismo recuadro, ninguna fuera de lista.
- Consola: los únicos errores son previos y ajenos —un HMR viejo de
  `Benefits.jsx`, que se borró en `5134284`, y los scripts de tracking
  bloqueados en el sandbox.

**A ojo**: contact sheet de las 61 portadas antes y después. Después del ajuste
de dos niveles, los únicos cuadrados que se distinguen del recuadro son los de
`aesthetic`, `gamer`, `newells-old-boys` y `racing` — las 4 que no tienen ningún
diseño en el gris exacto.
