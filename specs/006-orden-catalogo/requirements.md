# Requirements — Orden del catálogo y portadas de categoría

| | |
|---|---|
| **Spec** | `006-orden-catalogo` |
| **Estado** | `DONE` |
| **Fecha** | 15/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

> ⚠️ **Spec escrita después de implementar.** Mariano pidió los tres cambios en
> una sola frase y eligió explícitamente implementar directo (la pregunta se le
> hizo antes de tocar código, con la regla 2 del `CLAUDE.md` a la vista). Este
> documento es el registro de lo que se hizo, no el contrato previo. El orden
> del workflow no se cumplió y queda dicho acá para que no parezca que sí.

---

## 1. Problema

La página `/categorias` tenía tres cosas distintas mal, todas visibles en la
misma pantalla.

### 1.1 Los calcos decorativos se comían el texto del encabezado

El `header` de la página dibuja calcos flotantes de fondo. Pasaban **por detrás
del título y de la bajada**: en la captura que motivó el pedido, un mate y una
bandera cruzaban justo las tres líneas de texto.

No era un problema de color. La bajada estaba a 5,5:1 de contraste sobre el
fondo violeta —arriba del mínimo de WCAG AA— y aun así no se leía, porque
detrás de cada línea había un dibujo con sus propios brillos.

### 1.2 El catálogo salía ordenado por tamaño, sin forma de cambiarlo

El listado completo se ordenaba por **cantidad de diseños**, de la categoría más
gorda a la más chica: Disney (396), Infantil (388), Weed & Creepy (328)… Ese
orden es útil para descubrir, pero es inútil para **buscar algo puntual**: el
que entra sabiendo que quiere "Naruto" tiene que barrer 94 cards en un orden que
no puede predecir.

No había ningún control para cambiarlo.

### 1.3 La portada de cada categoría era siempre la misma

La imagen de cada card salía de un hash del slug, fija para siempre: la misma
categoría mostraba **el mismo dibujo en todas las visitas, para siempre**. Fue
una decisión deliberada en su momento (memoria visual del catálogo, sin saltos
entre recargas) y está documentada en el código.

Dos consecuencias:

- una categoría de 396 diseños se presentaba siempre con el mismo, y el resto
  del catálogo no se veía nunca sin entrar;
- nada garantizaba que dos categorías no mostraran **el mismo dibujo**. Son
  archivos distintos en carpetas distintas, así que la grilla no tenía forma de
  saber que son el mismo diseño.

---

## 2. Objetivo

Que la grilla de categorías se pueda **leer** (texto legible), **recorrer** (un
orden previsible y otro alternativo) y **mirar** (portadas que cambian y nunca
se repiten entre categorías).

**Cómo se sabrá que funcionó**: entrando a `/categorias` dos veces seguidas, el
texto del encabezado se lee entero, las categorías salen de la A a la Z, hay un
control para pasar a "Más diseños", y las 94 portadas son 94 dibujos distintos —
distintos también de los de la visita anterior.

---

## 3. Scope

- [x] Los calcos decorativos del encabezado de `/categorias` dejan de pisar el texto
- [x] El listado completo sale en orden alfabético por defecto
- [x] Un control para cambiar el orden, con el orden por tamaño como alternativa
- [x] El orden elegido sobrevive al refresh y a compartir el link
- [x] Las portadas de las cards cambian en cada visita
- [x] Dos categorías nunca muestran el mismo diseño en la misma grilla
- [x] Analítica del cambio de orden

---

## 4. Fuera de scope

- [x] El orden de los resultados **de búsqueda**: con query manda la relevancia,
      no el selector
- [x] La grilla de categorías destacadas del **Home** (usa la misma card, pero su
      rotación la maneja el Home y no se tocó)
- [x] El campo de calcos del **Hero** y del **PromoBanner**: mismo componente,
      pero ahí el texto tiene su propio fondo y nadie se quejó
- [x] Un orden por **ventas reales**: no hay dato de ventas por categoría en el
      repo (ver §12)
- [x] Deduplicar los archivos repetidos del catálogo: se **detectan** para no
      mostrarlos dos veces, no se borran
- [x] Las categorías duplicadas del catálogo (`disney` / `tv-disney`,
      `anime` / `tv-anime`, `nba` / `deportes-nba`…): es un problema de
      contenido, no de esta pantalla

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que entra a buscar algo puntual | Lo encuentra por abecedario en vez de barrer 94 cards |
| Cliente que entra a curiosear | Puede pasar al orden por tamaño, y ve dibujos distintos en cada visita |
| Cliente en celular | El encabezado se lee; además se ahorra 9 imágenes decorativas |
| Cliente que vuelve | **Ya no reconoce la categoría por su dibujo**: es el costo aceptado del cambio |
| Mariano (operación) | Un script más que correr al regenerar el catálogo |
| Sistemas externos | No afectados: no cambia el catálogo, ni los precios, ni el checkout |

---

## 6. User stories

**US-1** — Como cliente que entra al catálogo, quiero leer de qué se trata la
página sin que un calco de fondo me tape el texto.

**US-2** — Como cliente que ya sabe qué busca, quiero las categorías en orden
alfabético, para ir directo a la letra.

**US-3** — Como cliente que viene a curiosear, quiero poder ordenar por las
categorías con más diseños, para ver primero dónde hay más para elegir.

**US-4** — Como cliente que comparte el link del catálogo ordenado como lo dejó,
quiero que al abrirlo se vea igual.

**US-5** — Como cliente que vuelve a entrar, quiero ver dibujos distintos a los
de la vez anterior, para descubrir que hay más de lo que vi.

**US-6** — Como cliente que mira la grilla, quiero que cada categoría se presente
con un dibujo distinto, para no pensar que dos categorías son la misma.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| **RF-1** | Los calcos decorativos del encabezado no se dibujan sobre el texto del título ni de la bajada. | 🔴 must |
| **RF-2** | En pantallas donde el texto ocupa todo el ancho, los calcos del encabezado no se dibujan. | 🔴 must |
| **RF-3** | Sin búsqueda, el listado completo sale **alfabético** por nombre de categoría. | 🔴 must |
| **RF-4** | Hay un control visible con dos órdenes: alfabético y por cantidad de diseños. | 🔴 must |
| **RF-5** | El orden elegido viaja en la URL y se restituye al recargar o abrir el link. | 🔴 must |
| **RF-6** | Un valor de orden inválido en la URL cae en el orden por defecto sin romper la página. | 🔴 must |
| **RF-7** | El orden no cambia **qué** categorías se muestran, solo la secuencia. | 🔴 must |
| **RF-8** | Con una búsqueda activa, los resultados salen por relevancia y el control de orden no se muestra. | 🔴 must |
| **RF-9** | Las portadas de la grilla cambian entre una visita y otra. | 🔴 must |
| **RF-10** | Las portadas **no** cambian mientras el cliente está en la página (tipear en el buscador no las mueve). | 🔴 must |
| **RF-11** | Dos categorías nunca muestran el mismo diseño en la misma grilla, aun cuando el dibujo esté repetido en dos carpetas del catálogo. | 🔴 must |
| **RF-12** | Cambiar el orden se registra en analytics. | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| **RNF-1** | **Mobile-first** | funciona a 375 px sin scroll horizontal; el control de orden entra en una fila |
| **RNF-2** | **Performance** | cada card pide **una sola** imagen (no una y después la rotada) |
| **RNF-3** | **Accesibilidad** | el control es un grupo con etiqueta, botones de 44 px y estado `pressed` legible por lector de pantalla |
| **RNF-4** | **Sin dependencias nuevas** | ninguna |
| **RNF-5** | **Robustez** | si falla el fetch del mapa de duplicados, la grilla funciona igual (se pierde solo la garantía) |
| **RNF-6** | **Sin tocar precios** | esta feature no entra al camino de precios por ningún lado |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Precios, promos, cupones, envíos | `business-rules.md` | **no** — no se toca nada del camino de precios |
| Secciones publicadas / despublicadas | `config/site.js` → `HIDDEN_SECTIONS` | no |
| El catálogo es estático y se versiona en el repo | `docs/database.md` §2 | no |

### ⚠️ Espejo de precios

**No aplica.** Esta spec no toca `config/pricing.js`, ni el bloque de envío, ni
el servidor. Si en la implementación hubiera aparecido la necesidad de tocar un
precio, era señal de que el diseño estaba mal.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Categoría con **un solo** diseño | Muestra el único que tiene; no participa del reparto |
| Categoría sin catálogo cargado | No se lista (ya era así: el listado filtra por catálogo presente) |
| El mismo dibujo en dos carpetas | Cuenta como **un** diseño: la segunda categoría corre al siguiente |
| Todos los diseños de una categoría ya tomados por otras | Se queda con el último probado: mostrar algo repetido es mejor que no mostrar nada |
| `?orden=` con un valor inventado | Cae en alfabético |
| `?orden=az` explícito en la URL | Vale igual; el default no se escribe en la URL |
| Búsqueda activa + `?orden=` en la URL | El parámetro se conserva pero no se aplica: manda la relevancia |
| Falla el fetch de `duplicados.json` | La grilla anda; se pierde la garantía de no repetir |
| Falla el fetch del catálogo | "Cargando catálogo…", como antes |
| Navegación con el botón "atrás" del navegador | Vuelve al orden anterior (el orden vive en la URL) |

---

## 11. Analytics necesarios

### Eventos nuevos

| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `catalogo_orden` | El cliente cambia el orden de la grilla | `orden`: `az` \| `disenos` | GA4 (dataLayer) |

No va a Meta: no es una acción de conversión, es una señal de navegación.

### Eventos existentes que cambian

Ninguno. `search` y `search_no_results` siguen igual.

### Qué se quiere poder responder con estos datos

- ¿Al que llega al catálogo le alcanza el orden alfabético, o busca otra cosa?
- ¿Cuál de los dos órdenes termina en más clicks a una categoría?

---

## 12. Preguntas abiertas

1. **~~¿De dónde sale "más vendidas"?~~** — resuelta el 15/08/2026. **No hay dato
   de ventas por categoría en el repo**: "Los más vendidos" del Home son cuatro
   categorías hardcodeadas con un sticker al azar. Mariano eligió usar la
   **cantidad de diseños** como criterio, y la etiqueta del control dice
   "Más diseños" para no prometer lo que no es.
2. **Queda pendiente si alguna vez se quiere el orden real de ventas**: lo
   natural es una lista curada a mano en config (como `FEATURED_SLUGS`), o
   exportar ventas por categoría del CRM al build. **No se hizo.**
3. **La memoria visual que se perdió**: la portada fija existía a propósito. Si
   aparece que los clientes se perdían más con las portadas rotando, se vuelve
   atrás con un solo cambio (semilla fija en vez de aleatoria).
