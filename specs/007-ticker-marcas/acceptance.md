# Acceptance — Ticker circular de marcas que confiaron

| | |
|---|---|
| **Spec** | `007-ticker-marcas` |
| **Estado** | `DONE` |
| **Fecha** | 15/08/2026 |

---

## Cómo se valida

Las capturas del panel de preview volvían **negras** en esta sesión: el
documento estaba en `visibilityState: 'hidden'` y el navegador no pintaba (el
DOM sí estaba armado y medía bien). Así que la validación visual se hizo por dos
caminos que no dependen de esa captura:

1. **Geometría medida en el DOM real**, con JavaScript sobre la página servida
   por Vite en `localhost:5173` (`/` y `/negocio`, a 1280 px y a 375 px).
2. **Composición offline con ImageMagick** de los 35 círculos exactamente como
   los dibuja el navegador: 96 px de diámetro, máscara circular, anillo y fondo
   `#121212`. Es lo que se miró para decidir recortes y contraste.

Queda dicho para que quien lea esto sepa que **no** se validó mirando la página
en un navegador de verdad. Vale una pasada de ojo en producción después del
deploy.

---

## 1. Criterios funcionales

| # | Criterio | Resultado | Cómo se verificó |
|---|---|---|---|
| RF-1 | Las 35 marcas, cada una en un círculo | ✅ | 70 `<img>` en el DOM (35 × 2 copias), 0 rotas, 35 con `alt`. Los 35 `.webp` existen en `public/images/marcas/`. |
| RF-2 | Loop continuo sin salto | ✅ | Pista = 6300 px, grupo = 3150 px a 375 px de viewport. La animación desplaza `-50 %` = exactamente un grupo. Verificado también a 1280 px con la versión de 24 (5760 / 2880). |
| RF-3 | Ancho completo + desvanecido en los extremos | ✅ | `.marcas-ticker` mide 1280 px a 1280 px de viewport y 375 px a 375 px, arrancando en `x = 0`. `mask-image` presente en los estilos computados y en el CSS compilado. |
| RF-4 | Los logos conservan color y fondo | ✅ | Se sacó el `mix-blend-screen` y el `filter: contrast()` de la versión vieja. Confirmado en la composición offline. |
| RF-5 | Ningún logo cortado por el círculo | ✅ | Los 35 revisados uno por uno con la máscara aplicada. Los casos de riesgo (`Shippear.`, `MANHATTAN`, `EUNOIA · ESTUDIO`, `ESPACIO TERRA`, `HOOPSHOES`, `BALANCE FIT`) entran enteros gracias al rectángulo inscripto. |
| RF-6 | El movimiento se detiene con el mouse encima | ✅ | `.marcas-ticker:hover .marcas-ticker__pista{animation-play-state:paused}` presente en el CSS compilado. *No se pudo ejercitar el hover real* — ver §Notas. |
| RF-7 | `prefers-reduced-motion` sin animación y recorrible | ✅ | Las cuatro reglas están dentro del `@media (prefers-reduced-motion: reduce)`, verificadas leyendo `document.styleSheets` en la página servida y en el CSS compilado. *No se ejercitó con la preferencia activada* — ver §Notas. |
| RF-8 | Sumar una marca = una fila + un comando | ✅ | Probado tres veces: sumar las 11 del collage, reemplazar 10 por su logo original, y sumar el de Elles Rosario. **Ninguna de las tres hubo que tocar el componente ni el CSS.** |

---

## 2. Criterios no funcionales

| # | Criterio | Resultado | Cómo se verificó |
|---|---|---|---|
| RNF-1 | Mobile-first, sin scroll horizontal de página | ✅ | A 375 px: en `/negocio`, `scrollWidth == clientWidth` con las 35. En el Home hay 21 px de diferencia **preexistentes**: con la sección entera en `display:none` el `scrollWidth` sigue siendo 396. El ticker no aporta overflow. |
| RNF-2 | No competir con el LCP; peso del mismo orden | ✅ | Los 70 `<img>` van en `loading="lazy"` + `decoding="async"` y son 35 URLs únicas. Peso total 196 KB en 35 archivos (media 5,6 KB) contra 61 KB del archivo único que reemplaza. Mismo orden de magnitud, y ahora se bajan de a poco y por debajo del fold. |
| RNF-3 | Accesibilidad | ✅ | Marcado `<ul>/<li>`. 35 `alt` con el nombre real (`Shippear`, `Cilantro Espacio Holístico`, …, `Poly`); la segunda copia va con `aria-hidden="true"` y `alt=""`. Dos nombres se corrigieron al ver el logo real: *Positano Club de Vinos* y *Vyastore*. |
| RNF-4 | Animación por `transform` | ✅ | `@keyframes marcas-scroll` usa solo `translateX`. Sin `left`, sin `margin` animado. |
| RNF-5 | El `alt` es el nombre real del cliente | ✅ | La tabla de nombres se armó leyendo cada logo, no del nombre de archivo (`emma compleme.jpg` → *Emma Complementos*, `FYF.jpg` → *FyF Gym*, `lwlacteos.jpg` → *LW Lácteos*). |

---

## 3. Edge cases

| Caso | Resultado | Nota |
|---|---|---|
| Wordmark ancho | ✅ | `Shippear.` y `MANHATTAN` usan casi todo el diámetro y entran enteros. |
| El logo ya es un círculo | ✅ | Sacro, Mentha, Trapitos y LW Lácteos van en modo `circulo` y calzan con la máscara. |
| Foto sin fondo plano | ✅ | Monchito Merlo entra completo, con el nombre legible. |
| URL impresa en el logo | ✅ | Wens con `cover` + `zoom: 1.3`: queda la marca, se va la URL. |
| PNG con alfa / PDF disfrazado | ✅ | `SACRO.png` (RGBA, 542×480) y `strive-1.png` (PDF) procesados sin caso especial en el componente. |
| Fondo casi negro | ✅ | 12 logos. `ring-white/20` los separa del fondo de la página. |
| Dos marcas del mismo color | ✅ | Poly llegó verde y quedaba pegado a Eunoia, también verde. Se movió al final de la lista. |
| Marca sin archivo propio | ✅ | Las 11 de la tira vieja se recortaron del collage con caja fija y entraron al mismo pipeline. Las cajas salieron de `-connected-components`, no de medir a ojo. Hoy ninguna marca lo necesita. |
| Llega el logo original de una recortada | ✅ | Pasó con las 11: `crop` → `archivo`, una corrida del script y listo. |
| El logo nuevo invierte claro/oscuro | ✅ | Elles Rosario pasó de gris oscuro a crema y quedaba entre dos blancos. Boiler ocupó ese lugar y Elles bajó al 25. |
| Una imagen falla | ✅ | Queda el círculo con `bg-white/5` y el resto sigue. Ya **no** se esconde la sección entera, como sí hacía la versión vieja con su única imagen. |

---

## 4. Regresión — lo que NO se puede haber roto

| Qué | Resultado | Verificación |
|---|---|---|
| Suite de tests | ✅ | `npm test` → **229/229**, 14 archivos. Corrida de nuevo con los 35 logos originales. |
| Build de producción | ✅ | `npm run build --prefix frontend` → `✓ built in 5.61s`, sin warnings nuevos. |
| El recorte no rompe el collage original | ✅ | El script **lee** `marcas-clientes.webp`, nunca lo escribe. El archivo queda intacto en el repo, ahora sin uso. |
| El CSS del ticker sobrevive al build | ✅ | Las 12 reglas `.marcas-ticker*` y el `@keyframes` están en `dist/assets/index-*.css`. |
| El ticker viejo del header | ✅ | `.announcement-ticker` intacto: no se tocó ni su regla ni su `@keyframes`. Se agregó un bloque nuevo al lado. |
| Home y `/negocio` renderizan | ✅ | Las dos cargan y muestran la sección con las 35 marcas. |
| Camino de precios | ✅ | El diff no toca `config/pricing.js`, `config/site.js`, `CartContext.jsx`, `lib/analytics.js` ni `netlify/functions/**`. |

---

## 5. Analytics

**No aplica.** La sección no está en el funnel y no tiene CTA
(`requirements.md` §11). No se agregó ni se modificó ningún evento.

---

## 6. ⚠️ Paridad de precios

**No aplica.** Ningún archivo del espejo fue tocado. Los tres tests de paridad
(`promoPricing`, `envio`, `precioPersonalizados`) siguen en verde dentro de los
229.

---

## Definition of Done

### Código
- [x] Implementado según `design.md`.
- [x] Sin refactors fuera de scope (regla 8).
- [x] Sin dependencias nuevas en el bundle (regla 10): el ticker es CSS puro.
- [x] Comentarios que explican el **porqué**, no el qué.
- [x] Todo en español.

### Seguridad
- [x] Sin secrets, sin variables `VITE_` nuevas, sin PII.
- [x] Sin input de usuario ni llamadas de red.

### Documentación
- [x] Los cuatro documentos de la spec.
- [x] El script deja escrito de dónde salen los archivos y qué hace cada modo.
- [x] `data/marcas.js` avisa que es generado.

### Proceso
- [x] `npm test` en verde antes de pushear.
- [x] Validación contra este documento, punto por punto (regla 15).

---

## Resultado de la validación

### Resumen

**24 de 24 criterios cumplidos** (8 funcionales + 5 no funcionales + 11 edge
cases). Ninguno incumplido.

### Criterios no cumplidos

Ninguno.

### Notas

1. **Dos criterios se verificaron por código, no por interacción**: la pausa al
   pasar el mouse (RF-6) y el comportamiento con `prefers-reduced-motion`
   (RF-7). En los dos casos se comprobó que la regla existe, es correcta y llega
   al CSS compilado, pero no se ejercitó el hover ni se activó la preferencia
   del sistema, porque el panel del navegador no estaba pintando. Son reglas CSS
   declarativas de una línea, así que el riesgo es bajo — pero *verificado* no
   es lo mismo que *visto funcionando*, y la diferencia queda anotada.
2. **Las 11 marcas de la tira vieja entraron.** La pregunta abierta se resolvió
   dentro de la misma sesión: Mariano eligió recortarlas del collage. La feature
   cerró con **35** marcas, no 24. Que eso se haya hecho tocando sólo la tabla
   del script —sin abrir el componente ni el CSS— es la mejor evidencia de que
   RF-8 se cumple de verdad.
3. **Las 11 terminaron con su logo original a color.** Mariano los fue
   consiguiendo en la misma sesión: primero 10, después el de Elles Rosario. El
   soporte de `crop` quedó sin uso y `/images/marcas-clientes.webp` huérfano —
   se puede borrar, pero no se hizo porque no era el pedido
   (`requirements.md` §12.3).
4. **`HoopShoes` y `Elles Rosario` quedaron como isotipo solo**, sin wordmark,
   porque así llegaron los archivos. No incumplen ningún criterio, pero se
   reconocen menos que el resto a 96 px. Anotado en `requirements.md` §12.5.
