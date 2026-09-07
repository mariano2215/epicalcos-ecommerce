# Tasks — Nombres para los 6.757 diseños

| | |
|---|---|
| **Spec** | `018-nombres-de-disenos` |
| **Estado** | `DRAFT` — esperando "Implementá la spec 018" |
| **Design** | [`design.md`](design.md) |

---

## ⛔ Antes de tocar una sola línea

- [ ] Mariano dijo explícitamente **"Implementá la spec 018"**
- [ ] `ANTHROPIC_API_KEY` disponible en el entorno (ver design §5)
- [ ] `npm test` en verde antes de empezar (hoy: 487/487)
- [ ] Leído `build-catalog.mjs`, sobre todo el bloque que preserva `sku`

---

## Fase 1 — El helper del nombre *(sin API, sin costo)*

Va primero **a propósito**: centraliza las 5 copias de la plantilla ANTES de que
haya nombres. Así el fallback se prueba con el catálogo actual, donde todavía no
hay ningún nombre y todo tiene que verse exactamente igual que hoy.

- [ ] 1.1 `lib/nombreDiseno.js`: recibe `{ id, name }` + la categoría, devuelve
      el nombre real o `Categoría #N`
- [ ] 1.2 `nombreDiseno.test.js`: con nombre, sin nombre, vacío, solo espacios
- [ ] 1.3 Reemplazar las 5 copias (H-2): `Producto.jsx` ×2, `Category.jsx` ×2,
      `FeaturedStickers.jsx`
- [ ] 1.4 **Verificación**: el sitio se ve EXACTAMENTE igual que antes. Sin
      nombres cargados, este paso no puede cambiar un solo pixel

---

## Fase 2 — El script de nombrado

- [ ] 2.1 `scripts/nombrar-disenos.mjs` con `--categoria`, `--dry`, `--limite`,
      `--rehacer`, `--modelo`
- [ ] 2.2 System prompt con las reglas de RF-2 y RF-3, y **el aviso de que la
      carpeta no dice el tipo** (`frases/1` no es una frase)
- [ ] 2.3 Lotes de 15, imágenes en base64
- [ ] 2.4 Reintento con backoff; lote que falla dos veces se saltea y se anota
- [ ] 2.5 Validación de la respuesta: JSON o se descarta el lote entero
- [ ] 2.6 Limpieza: recorte a 60, sacar "calco"/"sticker", sacar la categoría
- [ ] 2.7 Escritura **append-only** en `nombres.json`
- [ ] 2.8 `--dry` imprime sin gastar tokens ni escribir

---

## Fase 3 — ⭐ El piloto *(acá se frena y se espera a Mariano)*

- [ ] 3.1 Correr sobre `frases` (~135) y `anime` (~118)
- [ ] 3.2 Generar una **tabla de revisión** con la imagen al lado del nombre
      propuesto — que se pueda mirar de un scroll, no un JSON
- [ ] 3.3 **PARAR.** Mariano revisa
- [ ] 3.4 Ajustar el prompt con lo que salga y volver a correr el piloto si hace falta

> ⛔ **No seguir a la fase 4 sin el OK del piloto.** Es la razón por la que
> Mariano eligió este alcance: 6.757 nombres mal escritos van al feed de Meta y
> a Google, y sacarlos de ahí cuesta más que ponerlos.

---

## Fase 4 — El resto del catálogo

- [ ] 4.1 Correr las 70 categorías restantes (~6.500 diseños, ~$4)
- [ ] 4.2 Revisar por muestreo: 10 al azar de 10 categorías distintas
- [ ] 4.3 Anotar en `nombres.json` el modelo y la fecha

---

## Fase 5 — El pipeline

- [ ] 5.1 `build-catalog.mjs`: meter `name` en el mismo bloque que preserva `sku`
- [ ] 5.2 Correrlo y verificar que **los SKUs sigan intactos** (`anime-1` → `000001`)
- [ ] 5.3 `build-meta-feed.mjs`: `title` = nombre, `description` con el nombre adentro
- [ ] 5.4 Verificar que el feed **no renumere** ningún SKU
- [ ] 5.5 Ampliar `catalogoLote2.test.js`: `build-catalog` preserva `name`

---

## Fase 6 — Las pantallas

- [ ] 6.1 Ficha: `<h1>` con el nombre, `#N` chiquito al lado (design P-2)
- [ ] 6.2 `lib/seo.js`: `title`, meta description y JSON-LD con el nombre
- [ ] 6.3 Verificar que el buscador dentro de la categoría filtre por nombre
      (H-5: debería funcionar solo)
- [ ] 6.4 Grilla, carrito y checkout muestran el nombre
- [ ] 6.5 375 px: que un nombre largo no rompa la card ni empuje el precio

---

## Fase 7 — Tests y documentación

- [ ] 7.1 `catalogNombres.test.js` (design §9)
- [ ] 7.2 `npm test` en verde
- [ ] 7.3 `docs/architecture.md`: el paso de nombrado en el pipeline del catálogo
- [ ] 7.4 `docs/integrations.md`: la API de Claude como herramienta de build
      (NO es una integración de runtime — no corre en Netlify ni en el navegador)
- [ ] 7.5 `.env.example`: `ANTHROPIC_API_KEY` con el comentario de que es de build

---

## Fase 8 — Cierre

- [ ] 8.1 Recorrer `acceptance.md` y reportar el resultado real (regla 15)
- [ ] 8.2 Verificar en el navegador: grilla, ficha, buscador de categoría, carrito
- [ ] 8.3 Avisar que un push a `main` es un deploy

---

## Hallazgos fuera de scope

- **El buscador global por diseño** (design §8) — la consecuencia natural de
  tener nombres y el mayor premio de UX. Spec propia.
- **Los nombres repetidos dentro de una categoría** (design P-1) — se mira con
  datos del piloto.
- **`frases` no es homogénea**: tiene monigotes además de frases. Si eso se
  repite en otras categorías, hay un trabajo de recategorización que no es éste.

---

## Bitácora

| Fecha | Qué pasó |
|---|---|
| 07/09/2026 | Spec redactada. 3 decisiones de Mariano: nombres propios de marca SÍ, URLs sin cambios, piloto de 2 categorías primero. Calibrada mirando 7 diseños reales del catálogo. Esperando autorización. |
