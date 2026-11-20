# Requirements — Catálogo con nombre, escala y colecciones

| | |
|---|---|
| **Spec** | `046-catalogo-con-nombre-y-escala` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

- **Sin nombre**: los diseños se llaman "Argentina #1" aunque sea un sello del
  Aconcagua 6960. Sin nombre no hay deseo, ni búsqueda en Google, ni forma de
  pedirlo por WhatsApp.
- **Sin escala**: la ficha tiene una sola imagen sobre blanco; no se entiende
  cuánto mide una calco de 4, 6 o 9 cm puesta en un termo o un celular.
- **Buscador por número**: en la categoría dice "Buscar por número de diseño";
  nadie busca "Argentina 59".
- **Categorías flacas**: Hockey (1), Animales (2), Racing (2), Rosa (5), Gamer
  (6), Clubes de Rosario (8), contra Boca (125). Una hinchada grande con 2
  diseños se lee como que no hay.
- **Pensadas por tema, no por uso**: las landings de termo y notebook existen,
  pero no hay colecciones de celular, casco, regalo ni temporada.

## 2. Objetivo

Que los 300 diseños más vendidos tengan nombre, que toda ficha muestre la escala
real y que el catálogo se pueda recorrer por uso y por temporada.

**Cómo se sabrá que funcionó**: sesiones orgánicas a fichas (Search Console),
búsquedas con resultado y `select_item` por sesión.

## 3. Scope
- [ ] Nombre propio para los 300 más vendidos (empezando por los de anuncios).
- [ ] Segunda imagen en toda ficha: foto real de escala por tamaño (4, 6 y 9 cm
      sobre un termo y un celular), una por tamaño, reutilizada.
- [ ] Buscador por nombre y tema en la categoría.
- [ ] Categorías con menos de 12 diseños: completarlas o esconderlas del listado.
- [ ] Colecciones por uso (termo, notebook, celular, casco) y de temporada
      (Verano, Viajes, Van Life, Vuelta a clases), con diseños que ya existen.

## 4. Fuera de scope
- Cambiar URLs: la ficha sigue en `/producto/{categoria}/{n}`.
- Diseños nuevos (salvo para completar categorías flacas, P-3).

## 7. Requisitos funcionales
- **RF-1** El nombre se ve en la ficha, la tarjeta, el carrito, el mail y el feed
  de Meta; el número sigue en la ficha como referencia.
- **RF-2** Los diseños sin nombre siguen como hoy.
- **RF-3** La foto de escala es una foto real (nada de renders presentados como
  foto) y dice el tamaño.
- **RF-4** Una categoría escondida sigue accesible por su URL.

## 9. Reglas de negocio
- Nombres sin marcas registradas ajenas en el texto (un diseño de un club se
  llama por lo que muestra, no "Escudo oficial de…").

## 11. Analytics necesarios
- `search` con `search_term` y cantidad de resultados (si no existe ya).

## 12. Preguntas abiertas
- [ ] **P-1** ¿Quién pone los nombres? (propuesta: Claude propone en tandas de 50
      mirando cada imagen y Mariano aprueba)
- [ ] **P-2** ¿Podés sacar las 6 fotos de escala (3 tamaños × termo y celular)?
- [ ] **P-3** Categorías flacas: ¿completar (Racing, Independiente, San Lorenzo…)
      o esconder?
