# Design — Ticker circular de marcas que confiaron

| | |
|---|---|
| **Spec** | `007-ticker-marcas` |
| **Estado** | `DONE` |
| **Fecha** | 15/08/2026 |

> **Este documento define CÓMO se implementa.**

---

## 0. Hallazgos del discovery

- `components/MarcasConfiaron.jsx` lo usan **dos** rutas: `routes/Home.jsx:171`
  y `routes/Negocio.jsx:21`. El pedido llegó por `/negocio`, pero el cambio se
  ve en las dos. En las dos está muy por debajo del fold.
- El componente ya se cuidaba del LCP: la imagen estaba en `lazy` con un
  comentario que explica que era **la única** imagen del sitio que se pedía con
  prioridad y competía con el hero. Esa lección se conserva.
- El repo ya tiene un marquee resuelto: `.announcement-ticker` en
  `styles/index.css`, con `@keyframes ticker-scroll` a `translateX(-50%)`. La
  técnica se reusa; los estilos no, porque aquel es texto en una línea y este
  son cajas con separación.
- Hay precedente de script que lee una carpeta fuera del repo y escribe dentro
  de `frontend/src/data/`: `scripts/gen-categories.mjs`.
- La carpeta de origen trae **26** archivos, no 24. Dos no son logos:
  `marcasviejas.webp` es byte a byte la tira vieja
  (`frontend/public/images/marcas-clientes.webp`) y `wensredondo.jpeg` es una
  captura de pantalla de la propia carpeta. Se descartan.
- La tira vieja tiene **11 marcas que no están en la carpeta**: su logo no
  existe en ningún otro lado. Mariano pidió recuperarlas, así que el collage
  pasa de ser "la imagen que se reemplaza" a ser **una fuente más** del
  pipeline.
- `strive-1.png` **no es un PNG**: es un PDF con la extensión cambiada.
- `SACRO.png` es RGBA y no es cuadrado (542×480).

---

## 1. Arquitectura propuesta

Tres piezas, cada una con una responsabilidad:

```
carpeta de origen (fuera del repo)      images/marcas-clientes.webp
   24 archivos sueltos                    la tira vieja: 11 recortes
        │                                          │
        └──────────────┬───────────────────────────┘
                       │  node scripts/build-marcas.mjs
                       ▼
frontend/public/images/marcas/<slug>.webp   (35 archivos, 256×256)
frontend/src/data/marcas.js                 (lista {slug, nombre}, GENERADA)
                       │
                       │  import
                       ▼
components/MarcasConfiaron.jsx  +  .marcas-ticker* en styles/index.css
```

El script es la única pieza que sabe de recortes, colores y proporciones. El
componente solo mapea una lista.

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio |
|---|---|
| `frontend/src/components/MarcasConfiaron.jsx` | Reescrito: de `<img>` única a lista de círculos. |
| `frontend/src/styles/index.css` | Bloque nuevo `.marcas-ticker*` + reglas en el `@media (prefers-reduced-motion)` existente. |

### Archivos nuevos

| Archivo | Qué es |
|---|---|
| `scripts/build-marcas.mjs` | Prepara los logos y genera la lista. |
| `frontend/src/data/marcas.js` | **Generado.** Lista de `{ slug, nombre }` en orden de pasarela. |
| `frontend/public/images/marcas/*.webp` | 35 logos de 256×256. |

### ⚠️ Módulos compartidos

`MarcasConfiaron.jsx` es compartido entre Home y `/negocio`. Quién lo importa:

```
frontend/src/routes/Home.jsx:8      → <MarcasConfiaron /> en :171
frontend/src/routes/Negocio.jsx:2   → <MarcasConfiaron /> en :21
```

En las dos se invoca **sin props** y fuera de un `container-app`, así que el
cambio a ancho completo funciona igual en ambas. No hay ningún otro consumidor.

**No se toca** ninguno de los módulos de la tabla de la regla 9: esta feature no
roza precios, envíos, carrito ni analytics.

---

## 3. Datos

### Estructuras nuevas o modificadas

`frontend/src/data/marcas.js`:

```js
export const MARCAS = [
  { slug: "shippear", nombre: "Shippear" },
  // …35 en total
];
```

`slug` es el nombre del archivo en `public/images/marcas/`; `nombre` es el texto
alternativo. El **orden del array es el orden de la pasarela**.

La tabla completa (archivo de origen, slug, nombre y modo de recorte) vive en
`scripts/build-marcas.mjs`. `data/marcas.js` se genera desde ahí y lleva el
aviso de "no editar a mano".

### Persistencia

Ninguna. No hay estado, ni `localStorage`, ni servidor.

### ⚠️ Compatibilidad con datos existentes

No aplica: no hay datos guardados de esta sección.

---

## 4. El problema geométrico (el centro del diseño)

Una máscara circular se come las esquinas. Recortar cada logo al cuadrado y
redondearlo con CSS le corta las puntas a todo wordmark ancho: `Shippear.` se
convierte en `hippea`.

La salida fácil es escalar todo al cuadrado inscripto (70,7 % del diámetro),
pero entonces los logos quedan chicos y la tira es más aire que marca.

Lo que hace el script: **mide el contenido después de recortarle el fondo plano
y lo escala al rectángulo más grande DE ESA PROPORCIÓN que entra en el
círculo.**

Para un contenido de proporción `r = ancho / alto` en un círculo de diámetro
`D`:

```
w = D · r / √(1 + r²)
h = D     / √(1 + r²)
```

- Un wordmark ancho y bajo (`r ≈ 5`) usa el **98 %** del diámetro.
- Un logo cuadrado (`r = 1`) se queda en el 70,7 %.

Sobre eso, un factor de `PADDING = 0.92` para que nada quede pegado al filo.

Tres modos, porque no todos los archivos son el mismo problema:

| Modo | Cuándo | Qué hace |
|---|---|---|
| `ajustar` (default) | Logo sobre fondo plano | Recorta el fondo y aplica la fórmula. |
| `circulo` | El logo **ya es** un círculo (Sacro, Mentha, Trapitos, LW Lácteos) | Recorta el fondo y lo estira al diámetro completo. Con `ajustar` quedaría un círculo dentro de otro. |
| `cover` | No hay fondo plano que recortar (Wens: trama de galones) | Recorte cuadrado central, como foto de perfil. `zoom` opcional para empujar afuera lo que sobra. |

El lienzo se rellena con el **color de fondo del propio logo** (muestreado en la
esquina), así el círculo se lee como el fondo de la marca y no como un recorte.

### Las 11 del collage

No tienen archivo propio: se recortan de `images/marcas-clientes.webp` con una
caja fija por marca (campo `crop`) y de ahí siguen por el modo `ajustar` como
cualquier otra. El fondo que muestrea es el gris `#242424` del collage, así que
quedan 11 círculos gris oscuro con el wordmark blanco — coherentes entre sí y
repartidos en el orden para que no caigan en bloque.

Las cajas **no se midieron a ojo**: se umbralizó la imagen, se dilataron las
letras hasta que cada wordmark quedó como una mancha sola y se leyeron los
bounding boxes con `-connected-components`. Dos marcas necesitaron unir dos
manchas (`GOAT BRAND` + su isotipo, y `BALANCE` + `FIT`, separados por un
espacio más ancho que el kernel de dilatación).

---

## 5. Integraciones

Ninguna nueva. El script depende de tres binarios que ya se usan o son
estándar en la máquina de trabajo:

| Binario | Para qué | Instalación |
|---|---|---|
| `magick` (ImageMagick) | Medir, recortar y componer | `brew install imagemagick` |
| `cwebp` | Codificar a WebP — ya lo usa `scripts/optimize-images.mjs` | `brew install webp` |
| `pdftoppm` (poppler) | Solo por `strive-1.png`, que es un PDF | `brew install poppler` |

Si falta alguno, el script avisa cuál y con qué comando se instala, y corta
antes de escribir nada.

### Variables de entorno nuevas

Ninguna. La carpeta de origen se puede cambiar con `MARCAS_SRC=...` pero tiene
un default hardcodeado, igual que `scripts/gen-categories.mjs`.

---

## 6. Seguridad

No aplica: no hay input de usuario, ni credenciales, ni llamadas de red. Los
archivos son estáticos y se sirven desde `public/`.

---

## 7. Manejo de errores

| Falla | Qué pasa |
|---|---|
| Falta un binario | El script corta con el comando de `brew` exacto. No escribe nada. |
| Falta la carpeta de origen | Corta con la ruta que buscó. |
| Falta un archivo de la tabla | Avisa cuál, sigue con el resto y el contador final lo delata (`23/24`). |
| Una imagen no carga en el navegador | Queda el círculo con `bg-white/5`; el resto de la tira sigue andando. **No** se esconde la sección entera como hacía la versión vieja: ahí una sola imagen rota dejaba la sección vacía, ahora sería absurdo tirar 23 logos porque falló uno. |

---

## 8. La animación

```css
@keyframes marcas-scroll { from { translateX(0) } to { translateX(-50%) } }
```

La pista contiene **dos copias idénticas** de la lista y mide `max-content`.
Desplazar `-50 %` es exactamente el ancho de una copia: al terminar, la segunda
está donde arrancó la primera y el reinicio no se ve.

Dos detalles que parecen menores y no lo son:

1. **La separación va como `margin-right` del item, no como `gap` del
   contenedor.** Un `gap` agregaría un hueco *entre las dos copias* que no está
   dentro del ciclo, y cada vuelta daría un tirón.
2. **El desvanecido de los extremos es `mask-image`, no un degradado encima.**
   Un degradado pintado arriba tendría que coincidir con el color de fondo de la
   página, que en `/negocio` es `page-gradient` (animado). La máscara recorta el
   contenido y funciona sobre cualquier fondo.

`animation-play-state: paused` en `:hover` para poder mirar una marca.

Con `prefers-reduced-motion: reduce`: sin animación, `overflow-x: auto` para
recorrerla a mano, y la copia de relleno oculta con
`.marcas-ticker__grupo[aria-hidden='true'] { display: none }` — si no, las
marcas aparecerían dos veces al scrollear.

---

## 9. Accesibilidad

- Marcado como `<ul>` / `<li>`: es una lista de marcas, no decoración.
- `alt` = nombre real de la marca **solo en la primera copia**.
- La segunda copia va con `aria-hidden="true"` y `alt=""`: es relleno visual, y
  sin eso un lector de pantalla leería las 35 marcas dos veces.
- El anillo `ring-white/20` no es adorno: 18 de los 35 logos tienen fondo casi
  negro y sin él no se distinguen del fondo de la página.

---

## 10. Testing

### Tests nuevos

Ninguno. No hay lógica que testear: el componente mapea un array a `<img>`, y lo
que hay que verificar (que un logo no quede cortado, que el loop no salte) es
visual y no lo cubre Vitest. Meter un test de render acá daría una sensación de
cobertura sobre lo único que no falla.

### ⚠️ Tests de paridad

No aplica. Esta feature **no toca** el camino de precios: ni
`config/pricing.js`, ni `config/site.js`, ni `netlify/functions/lib/pricing.js`.
La suite completa se corre igual antes de pushear (regla 15 y gate del deploy).

### Verificación manual

Ver `acceptance.md`.

---

## 11. Dependencias nuevas

**Ninguna** en el bundle. El ticker es CSS puro: sin librería de carrusel, sin
`framer-motion`, sin JS de animación. Es exactamente el caso que la regla 10
quiere evitar — un carrusel de logos no justifica una dependencia.

Las tres herramientas de imagen del script son de línea de comandos y no entran
en el bundle ni en el build de Netlify: los `.webp` se commitean ya generados.

---

## 12. Preguntas abiertas del diseño

Las de `requirements.md` §12. Ninguna bloquea lo implementado.
