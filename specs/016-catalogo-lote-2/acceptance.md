# Acceptance — Segundo lote del catálogo

| | |
|---|---|
| **Spec** | `016-catalogo-lote-2` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Estado** | `PENDIENTE DE VALIDACIÓN` |

---

## 1. Criterios funcionales

| ID | Criterio | Resultado |
|---|---|---|
| AC-1 *(RF-1)* | Ningún `.webp` publicado antes del lote cambió de nombre, de número ni de contenido | |
| AC-2 *(RF-2)* | Los diseños nuevos arrancan en `max(existente) + 1` de su categoría | |
| AC-3 *(RF-3)* | Un diseño del lote que ya estaba publicado en esa categoría no se agregó | |
| AC-4 *(RF-4)* | Dentro del lote, los repetidos por contenido entraron una sola vez por categoría | |
| AC-5 *(RF-5)* | El mismo diseño sigue pudiendo estar en dos categorías distintas | |
| AC-6 *(RF-6)* | Las 11 categorías nuevas están en el listado, el buscador y el sitemap | |
| AC-7 *(RF-7)* | Cada alias de una categoría nueva la devuelve **primera** | |
| AC-8 *(RF-8)* | Todos los SKUs previos siguen apuntando al mismo diseño | |
| AC-9 *(RF-9)* | `weed` no está en `meta-catalog.csv` ni consumió SKUs | |
| AC-10 *(RF-10)* | Las portadas se recalcularon y el test de coherencia pasa | |
| AC-11 *(RF-11)* | Correr el importador dos veces no agrega nada la segunda vez | |

## 2. Criterios no funcionales

| ID | Criterio | Resultado |
|---|---|---|
| ANF-1 | La bajada de iCloud no se colgó (concurrencia 3) | |
| ANF-2 | Los webp nuevos son 600 px / q82, como el lote actual | |
| ANF-3 | Sin dependencias nuevas de npm | |
| ANF-4 | El peso agregado al repo queda declarado | |
| ANF-5 | `npm test` en verde, incluido `portadas.test.js` | |
| ANF-6 | `CATEGORY_COUNT` coincide con las categorías publicadas | |

## 3. Verificación en el navegador

| Qué | Resultado |
|---|---|
| `/categorias` lista las 72 y el conteo es correcto | |
| Una categoría nueva abre y muestra su grilla | |
| Buscar "señor de los anillos" / "pixar" / "porro" lleva a la categoría correcta | |
| Una ficha de producto nueva abre y se puede agregar al carrito | |
| Una categoría vieja sigue mostrando los mismos diseños que antes | |

## 4. Definition of Done

- [ ] Los 11 criterios funcionales verificados
- [ ] Los 6 no funcionales verificados
- [ ] Recorrido en el navegador
- [ ] `npm test` en verde
- [ ] Lo que quedó fuera de scope, declarado
