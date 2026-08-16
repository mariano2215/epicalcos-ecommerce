# Tasks — Ticker circular de marcas que confiaron

| | |
|---|---|
| **Spec** | `007-ticker-marcas` |
| **Estado** | `DONE` |
| **Fecha** | 15/08/2026 |

> ⚠️ Lista reconstruida después de implementar (ver `requirements.md`). Refleja
> el orden real en que se hizo el trabajo, no un plan previo.

---

## Fase 0 — Discovery

- [x] Leer `components/MarcasConfiaron.jsx` y entender por qué la imagen usaba
      `mix-blend-screen` y por qué estaba en `lazy`.
- [x] Listar quién importa el componente: `Home.jsx:171`, `Negocio.jsx:21`.
- [x] Buscar un marquee ya resuelto en el repo → `.announcement-ticker`.
- [x] Inspeccionar los 26 archivos de origen: formato, tamaño, fondo.
- [x] Detectar los tres archivos raros: `marcasviejas.webp` (es la tira vieja),
      `wensredondo.jpeg` (captura de la carpeta), `strive-1.png` (es un PDF).
- [x] Confirmar que `marcasviejas.webp` es idéntico a
      `public/images/marcas-clientes.webp`.

## Fase 1 — Preparación de los assets

- [x] Escribir `scripts/build-marcas.mjs` con la tabla de 24 marcas.
- [x] Resolver el recorte circular sin cortar wordmarks (rectángulo inscripto).
- [x] Modo `circulo` para los 4 logos que ya son circulares.
- [x] Modo `cover` + `zoom` para Wens (trama de fondo + URL impresa).
- [x] Manejar el PDF (`pdftoppm`) y el RGBA (`-alpha remove`).
- [x] Ordenar la tabla alternando fondos claros y oscuros.
- [x] Generar los 24 `.webp` y revisarlos con la máscara circular aplicada.

## Fase 2 — Componente

- [x] Reescribir `MarcasConfiaron.jsx`: lista de círculos, dos copias, `<ul>`.
- [x] `alt` solo en la primera copia; `aria-hidden` en la segunda.
- [x] Mantener `loading="lazy"` (razón de LCP ya documentada en el archivo).
- [x] Sacar la tira del `container-app` para que cruce la pantalla completa.

## Fase 3 — Estilos

- [x] `@keyframes marcas-scroll` + `.marcas-ticker*` en `styles/index.css`.
- [x] Separación como `margin-right` del item (no `gap`) para que el loop cierre.
- [x] Desvanecido de extremos con `mask-image`.
- [x] Pausa en `:hover`.
- [x] Reglas en el `@media (prefers-reduced-motion: reduce)` existente.
- [x] Subir el anillo a `ring-white/20` tras ver los logos de fondo negro.

## Fase 3.5 — Rescate de las 11 marcas del collage *(agregada después)*

Mariano eligió recuperarlas en vez de darlas de baja.

- [x] Ubicar los 11 wordmarks dentro de `marcas-clientes.webp` con
      `-connected-components` sobre la imagen umbralizada y dilatada.
- [x] Unir a mano las dos que quedaron partidas en dos manchas
      (`GOAT BRAND` + isotipo, `BALANCE` + `FIT`).
- [x] Verificar los 11 recortes antes de meterlos al pipeline.
- [x] Soporte de `crop` en el script: la marca sale del collage en vez de la
      carpeta y sigue por el mismo camino.
- [x] Reordenar la tabla repartiendo los 11 (todos gris oscuro) entre las de
      color, para que no caigan en bloque.
- [x] Actualizar los cuatro documentos de la spec, que estaban escritos para 24.

## Fase 3.6 — Los logos originales *(agregada después)*

Mariano mandó a la carpeta los logos reales de 10 de las 11 recortadas.

- [x] Revisar los 12 archivos nuevos antes de tocar la tabla.
- [x] Descartar `472397121_…_n.jpg`: es `poly.jpg` de nuevo, byte a byte
      (mismo md5). Y `wensredondo.jpeg`, que sigue siendo una captura de la
      carpeta.
- [x] Pasar las 10 de `crop` a `archivo`.
- [x] Corregir dos nombres con el logo real a la vista: *Positano Vinos* →
      **Positano Club de Vinos**, *Vya Store* → **Vyastore**.
- [x] Reordenar: Poly llegó verde y quedaba pegado a Eunoia, que también es
      verde. Se mandó al final.
- [x] Elles Rosario queda como único recorte del collage.

## Fase 4 — Espejo de precios

- [x] **No aplica.** La feature no toca `pricing.js` ni `site.js` en ninguno de
      los dos lados. Verificado: el diff no incluye ningún archivo de precios.

## Fase 5 — Analytics

- [x] **No aplica.** Sección sin CTA y fuera del funnel (`requirements.md` §11).

## Fase 6 — Tests

- [x] `npm test` → 229/229 en verde.

## Fase 7 — Documentación

- [x] Los cuatro documentos de esta spec.
- [x] Comentarios en el componente y en el script explicando **por qué**
      (geometría del círculo, por qué `margin` y no `gap`, por qué el anillo).

## Fase 8 — Cierre

- [x] Validar contra `acceptance.md` punto por punto.
- [x] Commit + push a `main`.

---

## Hallazgos fuera de scope

1. **`HoopShoes` quedó como isotipo solo** (el aro, sin el nombre), porque así
   llegó el archivo. Se reconoce menos que el resto a 96 px.
   → `requirements.md` §12.4.
2. **El comentario de `StickerField.jsx:62` menciona `marcas-clientes.webp`.**
   Se dejó como está: es un relato en pasado de un bug de LCP ya corregido, y
   reescribirlo borraría la historia que el comentario existe para conservar.
3. **La carpeta de origen tiene un archivo que es un PDF con extensión `.png`.**
   El script lo maneja, pero conviene arreglar el original la próxima vez que se
   toque.

---

## Bitácora

- **15/08/2026 (3)** — Mariano consiguió los logos originales a color de 10 de
  las 11 recortadas y los puso en la carpeta. Cambiar `crop` por `archivo` fue
  una línea por marca. Segunda vez que la feature crece sin abrir el componente.
- **15/08/2026 (2)** — Después de mostrarle la tira, Mariano eligió recuperar
  las 11 marcas del collage. La feature pasó de 24 a 35 logos sin tocar el
  componente ni el CSS: sólo la tabla del script y una rama de recorte. Eso es
  la prueba de que la separación script ↔ datos ↔ componente estaba bien puesta.
- **15/08/2026** — Implementado de una sola pasada. La verificación visual no se
  pudo hacer con capturas del navegador (el panel de preview devolvía negro
  porque el documento estaba `hidden`), así que se verificó de dos maneras:
  midiendo la geometría real en el DOM con JavaScript, y componiendo aparte, con
  ImageMagick, los 24 círculos exactamente como los va a dibujar el navegador
  (96 px, anillo, fondo `#121212`).
