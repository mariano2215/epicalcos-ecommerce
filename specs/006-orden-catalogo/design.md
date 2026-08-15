# Design — Orden del catálogo y portadas de categoría

| | |
|---|---|
| **Spec** | `006-orden-catalogo` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 15/08/2026 |
| **Commit** | `dc1db60` |

> **Este documento define CÓMO se implementó.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, a medias.** `CategoryCard` ya tenía una prop `rotation` para mostrar otro diseño de la misma categoría, usada solo por el Home. En `/categorias` se pasaba fija en 0. |
| ¿Qué archivos están involucrados? | `routes/Categorias.jsx`, `components/CategoryCard.jsx`, `components/StickerField.jsx`, `lib/searchCatalog.js`, `styles/index.css` |
| ¿Hay tests que lo cubran hoy? | `lib/searchCatalog.test.js` (7 tests) cubría búsqueda, alias y ruteo. **Ninguno cubría el orden del listado** — por eso cambiar el default no rompió nada. |
| ¿Toca el camino de precios? | **No.** Ni `pricing.js`, ni `site.js`, ni el servidor. |
| ¿Hay comentarios que expliquen por qué está así? | **Sí, y era el corazón del asunto** (ver abajo). |

### El comentario que había que contradecir

`CategoryCard.jsx` decía:

> *"Portada determinística por slug: misma categoría → misma imagen siempre
> (memoria visual del catálogo; sin saltos entre recargas)."*

Es exactamente lo contrario de lo que se pidió. **Por qué esa razón deja de
aplicar**: la memoria visual sirve cuando el catálogo es chico y el cliente
vuelve a la misma card; acá son 94 categorías con hasta 396 diseños cada una, y
el costo de la portada fija es que el 99 % del catálogo no se ve nunca desde la
grilla. Mariano pidió el cambio sabiendo el trade-off (se le planteó como
opción). El comentario **no se borró**: se reescribió para que registre la
decisión nueva y el costo, en vez de desaparecer.

### Dato que decidió el diseño de la deduplicación

Se hashearon (md5) los **6.542** `.webp` del catálogo: **6.527 hashes únicos**,
o sea **15 diseños repetidos**, 8 de ellos entre categorías distintas
(`memes` ↔ `tv-bob-esponja`, `tv-disney` ↔ `tv-marvel`, `naturaleza-flores` ↔
`travel-travel`…).

Consecuencia: como cada categoría toma la imagen de **su propia carpeta**, dos
cards **no pueden** apuntar al mismo archivo. El único caso real de repetición
es el mismo dibujo guardado dos veces. Sin ese dato, "que no se repita" hubiera
sido una garantía de mentira.

---

## 1. Arquitectura propuesta

```
/categorias  (Categorias.jsx)
    │
    ├── ?orden=az|disenos ──► searchCatalog(q, …, orden)
    │                            └─ sin query → ordena el listado
    │                               con query → manda la relevancia (no se toca)
    │
    ├── semilla = random por visita ──┐
    ├── /data/duplicados.json ────────┤
    │                                 ▼
    │                      rotacionesSinRepetir()   ◄── lib/portadas.js
    │                                 │
    │                                 ▼  { slug: rotation }
    └── <CategoryCard rotation> ──► portadaDe(slug, count, rotation)
                                          └─ /stickers/<slug>/<n>.webp
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Máscara CSS que desvanece los calcos sobre la columna del texto | Bajar la opacidad del campo | La opacidad no arregla que el dibujo esté justo detrás de la línea; solo lo hace más pálido |
| " | Poner un velo oscuro (scrim) detrás del texto | Oscurece el fondo y deja el encabezado como un panel más oscuro que el resto de la página |
| " | Sacar el `StickerField` del encabezado | Pierde la decoración entera por un problema que es solo de la zona del texto |
| El orden vive en la URL (`?orden=`) | Estado local del componente | Se pierde al recargar y no se puede compartir |
| " | `localStorage` | Sobrevive de más: el que vuelve en otro contexto no entiende por qué está ordenado así |
| El selector no se muestra con búsqueda activa | Aplicar el orden también a los resultados | Buscar es pedir el mejor match primero; ordenar A-Z los resultados de "futbol" degrada la búsqueda |
| " | Mostrarlo deshabilitado | Un control muerto en pantalla confunde más que su ausencia |
| Etiqueta "Más diseños" | "Más vendidas" | No hay dato de ventas. Prometer un orden que no es, es peor que no ofrecerlo |
| Las portadas se resuelven para la grilla entera | Que cada card elija sola | Una card sola no puede saber qué eligieron las demás; sin eso no hay garantía de no repetir |
| Semilla aleatoria **por visita**, congelada mientras dura | Rotar con el tiempo, como el Home | En una grilla de 94 cards, cambiar imágenes mientras el cliente mira es ruido, no vida |
| Mapa de duplicados generado en build | Hash perceptual en el cliente | Necesita librería de imágenes (regla 10) para 15 casos |
| Script separado (`build-duplicados.mjs`) | Meterlo en `build-catalog.mjs` | Ese script depende de la carpeta de iCloud dataless; tocarlo para esto es riesgo gratis |

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/routes/Categorias.jsx` | Selector de orden, semilla por visita, fetch de duplicados, `rotation` a cada card | 🟡 |
| `frontend/src/components/CategoryCard.jsx` | Usa `portadaDe` del módulo nuevo; el estado inicial arranca en la rotación pedida | 🟡 |
| `frontend/src/lib/searchCatalog.js` | Parámetro `orden` + comparadores; **solo** afecta la rama sin query | 🟡 |
| `frontend/src/lib/analytics.js` | Función nueva `trackOrdenCatalogo` | 🟢 |
| `frontend/src/styles/index.css` | Clase `.sticker-field--lateral` | 🟢 |
| `docs/database.md` | Documenta `duplicados.json` y el script | 🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/portadas.js` | `portadaDe()` y `rotacionesSinRepetir()` |
| `frontend/src/lib/portadas.test.js` | 10 tests |
| `scripts/build-duplicados.mjs` | Genera el mapa de diseños repetidos |
| `frontend/public/data/duplicados.json` | 15 entradas, ~1 KB |

### ⚠️ Módulos compartidos

`CLAUDE.md` regla 9.

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **no** | — |
| `frontend/src/config/site.js` | **no** | — |
| `frontend/src/context/CartContext.jsx` | **no** | — |
| `netlify/functions/lib/pricing.js` | **no** | — |
| `frontend/src/lib/analytics.js` | **sí** | 20+ componentes. Solo se **agrega** una función; ninguna existente cambia |

Otros compartidos de esta feature:

| Módulo | ¿Se toca? | Quién lo importa | Impacto |
|---|---|---|---|
| `components/CategoryCard.jsx` | sí | `routes/Home.jsx`, `routes/Categorias.jsx` | El Home pasa `rotation` empezando en 0 → primer render idéntico al de antes |
| `lib/searchCatalog.js` | sí | `routes/Categorias.jsx`, `components/Hero.jsx` (vía `suggest`) | `orden` tiene default y solo actúa sin query: el autocompletado del Hero no cambia |
| `components/StickerField.jsx` | **no** | `Hero.jsx`, `PromoBanner.jsx`, `Categorias.jsx` | Se usa la prop `className` que ya existía; Hero y PromoBanner intactos |

```bash
grep -rln "CategoryCard\|searchCatalog\|StickerField" frontend/src
```

---

## 3. Datos

### Estructuras nuevas

```js
// frontend/public/data/duplicados.json — archivo duplicado → archivo canónico
{
  "/stickers/tv-bob-esponja/5.webp": "/stickers/memes/234.webp",
  "/stickers/tv-marvel/23.webp":     "/stickers/tv-disney/78.webp"
  // …15 entradas
}
```

```js
// lib/portadas.js
portadaDe(slug, count, rotation, cover) → '/stickers/<slug>/<n>.webp'
rotacionesSinRepetir(categorias, counts, semilla, duplicados) → { [slug]: rotation }
```

### Persistencia

| Dónde | Qué |
|---|---|
| URL (`?orden=`) | El orden elegido. Nada más |
| JSON estáticos del catálogo | `duplicados.json`, nuevo |
| `localStorage` | **No se usa.** La semilla vive en memoria y muere con la pestaña |

### ⚠️ Compatibilidad con datos existentes

- [x] No cambia la forma de las líneas del carrito → los carritos guardados en
      `epicalcos.cart.v2` no se ven afectados
- [x] No cambia la forma del pedido en Blobs
- [x] `catalog.json` y los `<categoria>.json` no se tocan

---

## 4. APIs

**No aplica.** Ningún endpoint nuevo ni modificado. La feature es 100 % del
lado del cliente sobre datos estáticos que ya se servían.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago / Notion / Resend / Cloudinary / CRM | ninguno | no |
| Meta (Pixel / CAPI) | ninguno | no |
| GA4 | evento `catalogo_orden` vía `dataLayer` | no |

### Variables de entorno nuevas

Ninguna.

---

## 6. Seguridad

`CLAUDE.md` regla 14.

- [x] Ningún secreto: la feature solo lee JSON públicos que ya se servían
- [x] El servidor no participa; no hay valor del cliente en que confiar
- [x] `?orden=` se valida contra una lista blanca antes de usarse
- [x] Sin PII en el `dataLayer`: el evento lleva `az` o `disenos` y nada más
- [x] No afecta la CSP

| Riesgo | Mitigación |
|---|---|
| Un `?orden=` arbitrario en la URL | Lista blanca (`esOrdenValido`); cualquier otra cosa cae en el default |
| `duplicados.json` manipulado | Es estático y del mismo origen; en el peor caso una portada se repite |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Falla el fetch de `duplicados.json` | `catch` → mapa vacío | La grilla normal; se pierde solo la garantía |
| Falla el fetch de `catalog.json` | Ya existía: estado de carga | "Cargando catálogo…" |
| Una portada rotada no existe (404) | `onError` de la card vuelve a la portada de `catalog.json` (ya existía) | La portada base |
| `?orden=` inválido | Lista blanca → default | Orden alfabético |
| Falla el tracking | La llamada está aislada del render | Nada |

---

## 8. Estrategia de migración

- **Datos existentes**: nada que migrar. `duplicados.json` es aditivo.
- **Carritos guardados**: no afectados.
- **Compatibilidad hacia atrás**: una URL vieja `/categorias` sigue funcionando;
  una `?q=` también.
- **Rollback**: revertir `dc1db60`. No hay datos que deshacer.
- **Feature flag**: no hay. Para volver a las portadas fijas alcanza con
  cambiar la semilla aleatoria por `0` (una línea en `Categorias.jsx`).

---

## 9. Testing

### Tests nuevos

| Archivo | Qué verifica |
|---|---|
| `lib/portadas.test.js` (10) | Determinismo de `portadaDe`; el índice nunca se sale del rango; fallback sin catálogo; **ninguna categoría repite el diseño de otra con 6 semillas distintas**; los duplicados entre carpetas cuentan como un diseño; la grilla cambia entre visitas y es idéntica con la misma semilla; no se cuelga con categorías de un solo diseño |
| `lib/searchCatalog.test.js` (+5) | Default alfabético; `disenos` de mayor a menor; orden inválido → default; el orden no cambia el conjunto; con búsqueda manda la relevancia |

### ⚠️ Tests de paridad

**No aplica**: la feature no toca precios, promos, cupones ni envíos.

### Verificación manual

- [x] Encabezado legible en 1280 px y en 375 px
- [x] El selector cambia el orden y la URL
- [x] Con `?q=futbol` el selector no está y manda la relevancia
- [x] Dos visitas seguidas dan portadas distintas
- [x] 94 cards → 94 diseños únicos (contado en el navegador)

---

## 10. Dependencias nuevas

**Ninguna.** El hash del script usa `node:crypto`, que ya viene con Node.

---

## 11. Preguntas abiertas del diseño

- [x] ~~De dónde sale el orden "más vendidas"~~ → resuelto: cantidad de diseños,
      con la etiqueta diciendo la verdad (`requirements.md` §12).
- [ ] `build-duplicados.mjs` **no está enganchado** a `build-catalog.mjs`: hay
      que acordarse de correrlo. Engancharlo era tocar el pipeline de iCloud y
      quedó fuera de scope.
