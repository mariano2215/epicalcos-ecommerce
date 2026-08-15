# Acceptance — Orden del catálogo y portadas de categoría

| | |
|---|---|
| **Spec** | `006-orden-catalogo` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 15/08/2026 |
| **Resultado** | ✅ aceptada, con dos criterios no verificados (§7) |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se validó

Recorrido punto por punto sobre el dev server (`localhost:5173`, commit
`dc1db60`), con capturas, lectura del DOM, el `dataLayer`, la Performance API y
la suite de tests. **Nada marcado ✅ sin evidencia.** Lo que no se probó está en
⬜ y explicado, no escondido.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| **AC-1** *(RF-1)* | En 1280 px, el título y la bajada del encabezado se leen enteros; los calcos quedan a la derecha | Captura del encabezado: la columna del texto está limpia, los calcos se ven del lado derecho | ✅ |
| **AC-2** *(RF-2)* | En 375 px el encabezado no dibuja ningún calco | Captura a 375 px: encabezado sin imágenes de fondo | ✅ |
| **AC-3** *(RF-3)* | Sin búsqueda, las categorías salen alfabéticas | Captura: Anime → Argentina → Autos y Motos → Bob Esponja → Buenas Vibras → Calcos Especiales → Campeones → Caras Sonrientes → Ciencia → Comida y Bebida → Cute → Deportes… Además `searchCatalog.test.js`: la lista es igual a sí misma ordenada | ✅ |
| **AC-4** *(RF-4)* | Hay un control con "A-Z" y "Más diseños" | Visible arriba de la grilla; al tocar "Más diseños" el listado pasa a Disney (396) → Infantil (388) → Weed & Creepy (328) → Anime (254) | ✅ |
| **AC-5** *(RF-5)* | El orden viaja en la URL | Tras el click: `location.search === '?orden=disenos'`. Abriendo esa URL directo, la grilla sale por cantidad | ✅ |
| **AC-6** *(RF-6)* | Un `?orden=` inválido no rompe nada | `searchCatalog.test.js`: `orden='lo-que-sea'` devuelve exactamente lo mismo que `'az'` | ✅ |
| **AC-7** *(RF-7)* | El orden no cambia qué categorías se muestran | `searchCatalog.test.js`: los dos órdenes contienen el mismo conjunto | ✅ |
| **AC-8** *(RF-8)* | Con búsqueda manda la relevancia y el selector no está | `?q=futbol&orden=disenos` → Fútbol, Rosario Central, NOB, Maradona, Escudos, Messi… y `document.querySelector('[aria-label="Ordenar categorías"]') === null`. Test: con query, `az` y `disenos` dan idéntico resultado | ✅ |
| **AC-9** *(RF-9)* | Las portadas cambian entre visitas | Tres cargas seguidas de `/categorias`: `anime/15` → `anime/9` → `anime/243`. Test con dos semillas: las grillas difieren | ✅ |
| **AC-10** *(RF-10)* | Las portadas no se mueven mientras el cliente está en la página | Se tipeó `dis` en el buscador (9 resultados) y se borró: las 8 primeras portadas son **byte a byte las mismas** antes y después | ✅ |
| **AC-11** *(RF-11)* | Ninguna categoría muestra el diseño de otra | En el navegador, sobre las 94 cards y colapsando duplicados con `duplicados.json`: **94 cards → 94 diseños únicos, 0 repetidos**. Test: se repite con 6 semillas distintas | ✅ |
| **AC-12** *(RF-12)* | Cambiar el orden se registra | `window.dataLayer.filter(e => e.event === 'catalogo_orden')` → `{ event: 'catalogo_orden', orden: 'disenos' }` | ✅ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| **ANF-1** | **Mobile** — 375 px sin scroll horizontal; el selector entra en una fila | Captura a 375 px: "ORDENAR · A-Z · Más diseños" en una sola línea | ✅ |
| **ANF-2** | **Performance** — cada card pide una sola imagen | Performance API en una carga limpia: 20 categorías con imagen, **20 pedidos, ninguna categoría pidió dos**. Muestra parcial (20 de 94): el resto no se pidió porque la pestaña estaba oculta y el lazy-load no dispara | ✅ (muestra parcial) |
| **ANF-3** | **Accesibilidad** — grupo etiquetado, 44 px, estado legible | DOM: `role="group"`, `aria-label="Ordenar categorías"`; botones de **44 px** de alto con `aria-pressed` `true`/`false` según el orden activo | ✅ |
| **ANF-4** | **Foco visible** al navegar con teclado | **No verificado.** No se agregó estilo de foco propio y el repo no tiene una regla global `:focus-visible`: los botones quedan con el anillo por defecto del navegador. No se probó con teclado | ⬜ |
| **ANF-5** | **Compatibilidad** — carritos guardados siguen funcionando | No se toca la forma de las líneas ni `CartContext`; el diff no incluye ningún archivo del carrito | ✅ |
| **ANF-6** | **Sin dependencias nuevas** | `git show --stat dc1db60`: `package.json` no aparece en el diff | ✅ |
| **ANF-7** | **Sin secretos en el bundle** | La feature solo lee JSON públicos ya servidos; no se agregó ninguna `VITE_*` | ✅ |
| **ANF-8** | **Robustez** — si falla `duplicados.json` la grilla anda igual | Por construcción: el `fetch` tiene `catch` y arranca con `{}`. **Verificado leyendo el código, no simulando la falla** | ✅ (por código) |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Cómo se verificó | Resultado |
|---|---|---|---|
| Categoría con un solo diseño | Muestra el que tiene, no participa del reparto | Test: dos categorías de 1 diseño devuelven la semilla sin colgarse | ✅ |
| El mismo dibujo en dos carpetas | Cuenta como un diseño | Test sobre `duplicados.json` real | ✅ |
| Todos los diseños ya tomados | Se queda con el último probado | Por construcción (el bucle corta en `total` intentos) | ✅ (por código) |
| `?orden=` inventado | Cae en alfabético | Test | ✅ |
| Búsqueda activa + `?orden=` | El parámetro queda pero no se aplica | `?q=futbol&orden=disenos` → resultados por relevancia | ✅ |
| Falla `duplicados.json` | La grilla anda, se pierde la garantía | Código | ✅ (por código) |
| Falla `catalog.json` | "Cargando catálogo…" | Sin cambios respecto de antes | ⏭️ no tocado |
| Botón "atrás" del navegador | Vuelve al orden anterior | **No verificado.** El orden vive en la URL con `replace: true`, así que el "atrás" puede saltear estados intermedios | ⬜ |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | La suite sigue en verde | ✅ **229 tests, 14 archivos** (214 antes; +15 nuevos) |
| **REG-2** | Compra por Mercado Pago de punta a punta | ⬜ **No ejecutado.** El diff no toca el checkout, el carrito, `pricing.js` ni las functions |
| **REG-3** | Compra por transferencia de punta a punta | ⬜ **No ejecutado.** Misma razón |
| **REG-4** | Envío en las tres zonas | ⏭️ No aplica: no se tocó `site.js` ni el bloque de envío |
| **REG-5** | Ningún checkout con `price_mismatch` | ⏭️ No aplica: ningún cálculo de precio se modificó |
| **REG-6** | El carrito sobrevive al refresh | ⏭️ No aplica: no se tocó `localStorage` |
| **REG-7** | `purchase` una sola vez | ⏭️ No aplica |
| **REG-8** | El `value` del `purchase` es lo pagado | ⏭️ No aplica |
| **REG-9** | El Home sigue mostrando sus categorías destacadas igual | ✅ Captura del Home: la grilla de destacadas y el Hero sin cambios. `CategoryCard` arranca en `rotation=0`, que es lo que pasaba el Home |
| **REG-10** | El autocompletado del buscador del Hero no cambió | ✅ `suggest()` llama a `searchCatalog` sin `orden`; con query el orden no participa (cubierto por test) |
| **REG-11** | El campo de calcos del Hero y del PromoBanner intacto | ✅ La clase nueva solo se aplica en `/categorias`; captura del Home con los calcos completos |
| **REG-12** | Sin errores de consola | ✅ Pestaña limpia: sin errores. (En una pestaña con HMR aparecieron errores de `useCart` por recarga en caliente del contexto; desaparecen en una pestaña nueva) |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `catalogo_orden` | Se toca un orden distinto al activo | `{ orden: 'disenos' }` — sin PII | ✅ |

```js
window.dataLayer.filter(e => e.event === 'catalogo_orden')
// → [{ event: 'catalogo_orden', orden: 'disenos', 'gtm.uniqueEventId': 16 }]
```

- [x] Sale por `analytics.js`; la página no llama a `gtag`/`fbq`/`dataLayer` directo
- [x] No viaja PII
- [ ] **GA4 DebugView**: no verificado — solo se comprobó el `dataLayer` local
- [x] Meta: no aplica, el evento no va al pixel
- [ ] **`docs/analytics.md`**: no documenta todavía el evento

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica.** Esta feature no toca precios, promos, cupones ni envíos. Los
archivos del espejo (`frontend/src/config/pricing.js`,
`netlify/functions/lib/pricing.js`, `config/site.js`) **no aparecen en el diff**.
`promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` siguen
pasando como parte de los 229.

---

## 7. Lo que quedó sin verificar

| Qué | Por qué | Riesgo |
|---|---|---|
| Foco de teclado en el selector (ANF-4) | No se probó con teclado y no hay estilo de foco propio | Bajo: el navegador pone su anillo por defecto; nada lo suprime |
| Botón "atrás" con varios cambios de orden | No se probó | Bajo: se usa `replace: true`, así que el historial no acumula un estado por click |
| Costo real de ancho de banda de la rotación | No se midió | **Medio**: con portadas fijas el que volvía reusaba la caché; ahora cada visita trae imágenes nuevas. En celular son ~20 KB por card visible |
| Recepción en GA4 DebugView | No se probó | Bajo: usa el mismo `pushDataLayer` que el resto |
| Comportamiento en producción post-deploy | Solo se validó en dev | Bajo: el build de producción compila y la suite es gate del deploy |

---

## Definition of Done

### Código
- [x] Criterios de §1 en ✅ (12 de 12)
- [x] §2 en ✅ salvo ANF-4, declarado sin verificar
- [x] §3 en ✅ salvo el "atrás", declarado sin verificar
- [x] Regresión: lo aplicable en ✅; las compras de punta a punta **no se ejecutaron** y está dicho
- [x] `npm test` en verde — 229
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope: mover `coverFor` a `lib/portadas.js` **no** es de oportunidad — sin un módulo compartido no hay forma de que la grilla vea todas las portadas juntas (`design.md` §1)
- [x] Comentarios que explican el porqué, incluido el que documenta la decisión que se revirtió

### Seguridad
- [x] Ningún secreto en el frontend ni en el bundle
- [x] El servidor no participa de esta feature
- [x] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [x] `business-rules.md` — no aplica
- [x] `architecture.md` — no aplica
- [x] `integrations.md` — no aplica
- [ ] **`analytics.md` — pendiente**: falta documentar `catalogo_orden`
- [x] `database.md` — `duplicados.json` y `build-duplicados.mjs` documentados

### Proceso
- [x] `tasks.md` con los pasos marcados y la bitácora
- [x] Hallazgos fuera de scope anotados (`tasks.md`)
- [x] Este documento recorrido punto por punto con resultados reales
- [x] Estado de la spec en `DONE`
- [x] ⚠️ La spec se escribió **después** de implementar, a pedido explícito. El
      workflow del `README.md` no se cumplió y está dicho en `requirements.md`

---

## Resultado de la validación

**Fecha**: 15/08/2026
**Ejecutada por**: Claude, sobre el commit `dc1db60`

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | 30 |
| ⬜ No verificado | 5 |
| ❌ No cumple | 0 |
| ⏭️ No aplica | 7 |

### Criterios no cumplidos
Ninguno.

### Notas

1. **La memoria visual se perdió a propósito.** Era el trade-off explícito de
   que las portadas cambien. Si aparece que confunde, se vuelve atrás poniendo
   la semilla en `0` (una línea en `Categorias.jsx`).
2. **`build-duplicados.mjs` es manual.** Hay que correrlo después de regenerar
   el catálogo. Si queda viejo no rompe nada: se pierde la garantía de no
   repetir, que es lo que pasaba antes de esta spec.
3. **No hay orden por ventas.** El control dice "Más diseños" porque es lo que
   ordena. Si algún día hay dato de ventas por categoría, es una spec nueva.
