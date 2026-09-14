# Design — Ticker de confianza + devolución a 30 días

| | |
|---|---|
| **Spec** | `020-ticker-de-confianza` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 14/09/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí.** `components/AnnouncementBar.jsx` es la barra de arriba: rota **dos** mensajes de `announcements` (`config/site.js`) con un crossfade cada 5 s. Antes de la spec 014 era una marquesina con 7 mensajes. |
| ¿Se ve hoy? | **No.** `Header.jsx:204` la renderiza con `!hayPromo && !compacto`, y `hayPromo` es verdadero desde el 7/9/2026 porque el 3x2 (spec 017) no tiene fecha de fin. **Hace una semana que el header no anuncia el envío gratis.** |
| ¿Hay una marquesina reusable? | Sí: `.marcas-ticker*` en `styles/index.css` (spec 007). Dos grupos iguales, `translateX(-50%)`, pausa al hover, y en `prefers-reduced-motion` se entrega quieta y sin la copia. La técnica se reusa; los estilos no (aquello son logos, esto es texto). |
| ¿Qué dice hoy la política? | *"No se aceptan cambios ni devoluciones"* en `routes/legal/Cambios.jsx:17`, `routes/legal/Terminos.jsx:51-55` (§6) y `components/FAQ.jsx:102`. Fallas: 7 días. Errores de pedido: 48 h. La descripción SEO de `Cambios.jsx:7` dice "garantía de fabricación". |
| ¿Quién más habla de la política? | `CheckoutForm.jsx:343` (comentario: *"Nada de garantías inventadas — la política está en /politicas/cambios"*) y `docs/CRO-AUDIT.md:209` / `docs/CRO-IMPLEMENTATION.md:116` (*"la garantía no se inventa"*). Con la política nueva la garantía deja de ser inventada; esos textos **no se tocan** (el comentario sigue siendo cierto y los CRO son un registro histórico). |
| ¿Argentina 50 %? | `PROMO_ARGENTINA` venció el 19/8/2026. Lo vivo es el 2x1: `CATEGORIAS_2X1 = ['anime', 'argentina', 'disney', 'frases']` (`config/pricing.js:295`). Existe `esCategoriaEn2x1(slug, now)`, que es la misma función que decide el precio. |
| ¿Hay tests que lo cubran hoy? | `lib/anuncios.test.js`: ≤ 2 mensajes, sin métricas de marca, monto de envío salido del config, el 10 % con sus dos condiciones. **El primer test choca con este pedido** y se reescribe (§9). |
| ¿Toca el camino de precios? | **No.** Solo *lee* `esCategoriaEn2x1`, `isArgentinaPromoActive` y `BULK_THRESHOLD`. Ninguno de los dos espejos cambia. |
| Umbrales de envío vigentes | Rosario **$35.000**, resto del país **$50.000** (`config/site.js`). |

### Comentarios que se contradicen — y por qué su razón ya no aplica

| Comentario | Qué protegía | Por qué se cambia |
|---|---|---|
| `AnnouncementBar.jsx` — *"siete promesas simultáneas no dejan ninguna en la cabeza; el movimiento permanente compite con el producto; para leer la última había que esperar toda la tira"* | Que la barra no fuera ruido | **(1)** Pasan a ser 4 mensajes, y los 4 responden una duda de compra (no hay métricas de marca ni atributos del producto). **(2)** El movimiento es un pedido explícito de Mariano; se atenúa con un estilo sobrio (§1) y pausa al hover. **(3)** El loop completo tarda ~35 s: sigue siendo cierto, es el costo aceptado de pedir un ticker. |
| `Header.jsx:38-41` — *"Una promo viva es EL mensaje comercial de la página. La barra se calla: dos tiras de colores compitiendo se anulan"* | Que el banner dorado no compitiera con el degradado rosa-naranja | El problema eran **dos tiras de colores**. La tira nueva es oscura y el color queda solo en el banner de promo: una se lee como *oferta*, la otra como *información*. Si la tira se callara, hoy no se vería nunca (el 3x2 no vence). |
| `config/site.js:198` — *"UNO POR VEZ — no es una marquesina"* | Ídem primera fila | Ídem. El comentario se reescribe contando las dos decisiones y sus fechas, no se borra. |
| `anuncios.test.js` — *"no muestra más de dos mensajes"* | Que no volvieran las 7 promesas | El tope pasa a **5**, y se suman guardas nuevas (§9). Los otros tres tests se conservan. |

---

## 1. Arquitectura propuesta

```
config/pricing.js ── esCategoriaEn2x1(), isArgentinaPromoActive(), BULK_THRESHOLD
        │ (solo lectura)
        ▼
config/site.js
  ├─ shipping.freeShippingThreshold{Rosario,National}   (ya existe)
  ├─ devoluciones = { dias: 30 }                         (NUEVO)
  └─ anunciosVigentes(now) → string[]                    (NUEVO, reemplaza `announcements`)
        │
        ├──► components/AnnouncementBar.jsx   (reescrito: marquesina CSS)
        │         └─ Header.jsx: se renderiza con o sin promo; se recoge al scrollear
        │
        └─ devoluciones.dias ──► routes/legal/Cambios.jsx
                              ├► routes/legal/Terminos.jsx (§6)
                              └► components/FAQ.jsx
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Reescribir `AnnouncementBar` en su lugar | Un componente nuevo al lado de la barra | Una sola tira arriba. Dos es exactamente lo que la spec 014 sacó. |
| Animación **CSS** (`@keyframes`, dos grupos, `-50%`) | JS con `requestAnimationFrame` o `setInterval` | Cero JS por frame, anda en el navegador de Instagram, se pausa con una línea de CSS y ya está probada en `.marcas-ticker`. |
| `anunciosVigentes(now)` (función) | Mantener `announcements` como array fijo | El mensaje del 2x1 depende de si la promo está viva. Un array armado al cargar el módulo seguiría anunciando una promo apagada. Se recalcula en cada render del header, que ya re-renderiza al scrollear. |
| Mensajes de **texto**, sin links | Cada mensaje linkea a su página (envíos, cambios, categoría) | Un blanco táctil que se mueve es imposible de acertar en el celular, y los links son lo único que podría recibir foco dentro de la tira. La política ya está enlazada desde la ficha (`Producto.jsx:345`), el footer y el FAQ. |
| **Estilo sobrio** (fondo oscuro translúcido, texto blanco, separador rosa) siempre | Mantener el degradado rosa→naranja→amarillo | Con el banner dorado arriba, dos tiras de color compiten (hallazgo de la spec 014). El color queda para la oferta; la tira informa. |
| Un solo mensaje de envío con **los dos** umbrales | Dos mensajes (Rosario / país) | Dos frases casi iguales seguidas se leen como repetición. |
| Seguir recogiéndose al scrollear | Dejarla fija | Decisión vigente de la spec 014: pasado el primer scroll esos ~33 px valen más para el producto. |
| Con `prefers-reduced-motion`: todos los mensajes quietos, en varias líneas | Solo el primero (lo que hacía la barra) | Mostrar solo el primero le esconde la garantía a quien no puede ver movimiento. |

### Los mensajes

Salen de `anunciosVigentes(now)`, en este orden:

```
🚚 Envío gratis desde $ 35.000 en Rosario y desde $ 50.000 al resto del país
🇦🇷 2x1 en calcos de Argentina                    ← solo si esCategoriaEn2x1('argentina', now)
🔄 30 días de garantía y devolución
💸 10% OFF desde 10 calcos pagando por transferencia
```

Los montos, el 30 y el 10 salen del config: ninguno se escribe a mano.

### Accesibilidad

- `<section aria-label="Envíos, promos y garantía">` con un `<ul>`: el primer
  grupo se lee; el segundo (la copia del loop) va con `aria-hidden="true"`.
- **Sin `aria-live`**: el contenido no cambia, se mueve. La barra actual usa
  `role="status"` porque rota; acá lo haría leer en loop.
- Pausa al hover. **Limitación aceptada**: en el celular no hay forma de
  pausarla (WCAG 2.2.2 pide un mecanismo para contenido que se mueve más de
  5 s). Es el mismo compromiso que ya tomó `.marcas-ticker`; quien tiene
  activado `prefers-reduced-motion` la recibe quieta.

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/site.js` | `+ devoluciones`, `announcements` → `anunciosVigentes(now)`; comentario reescrito | 🟡 compartido (ver abajo) |
| `frontend/src/components/AnnouncementBar.jsx` | Reescrito: rotación → marquesina | 🟢 |
| `frontend/src/components/Header.jsx` | `{!hayPromo && !compacto && …}` → `{!compacto && …}`; se va `hayPromo` y se reescribe su comentario | 🟢 |
| `frontend/src/styles/index.css` | `.anuncio-barra*` → `.anuncio-ticker*` + reglas en el `@media (prefers-reduced-motion)` | 🟢 |
| `frontend/src/routes/legal/Cambios.jsx` | Política nueva (§3) + `useSeo` + `lastUpdated` | 🔴 texto legal |
| `frontend/src/routes/legal/Terminos.jsx` | §6 reescrito | 🟡 texto legal |
| `frontend/src/components/FAQ.jsx` | Respuesta de *"¿Puedo cambiar o devolver el pedido?"* | 🟢 |
| `frontend/src/lib/anuncios.test.js` | Reescrito (§9) | 🟢 |
| `docs/business-rules.md` | Sección nueva *"Cambios y devoluciones"* en §7 | 🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/politicaDevoluciones.test.js` | Que la política publicada diga lo mismo que la tira (§9) |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | **No** (solo se importan dos funciones más desde `site.js`) | — |
| `frontend/src/config/site.js` | **Sí** | 37 módulos del front + `scripts/build-meta-feed.mjs` y `scripts/generate-sitemap.mjs`. **`announcements` lo importan solo `AnnouncementBar.jsx` y `anuncios.test.js`**; nadie más se entera del cambio de nombre. `site.js` ya importa `BULK_THRESHOLD` de `./pricing.js`, así que sumar `esCategoriaEn2x1` no crea una dependencia nueva ni un ciclo (`pricing.js` solo importa `lib/formato.js`). |
| `frontend/src/context/CartContext.jsx` | No | — |
| `netlify/functions/lib/pricing.js` | No | — |
| `frontend/src/lib/analytics.js` | No | — |

```bash
grep -rn "announcements" frontend/src netlify scripts
grep -rln "config/site.js" frontend/src netlify scripts
```

---

## 3. Datos

### Estructuras nuevas o modificadas

```js
// config/site.js
export const devoluciones = {
  /** Días corridos desde que el cliente RECIBE el pedido (D-1). */
  dias: 30
};

/**
 * Mensajes vigentes de la tira. `now` se inyecta para poder testear los bordes
 * de la promo sin mockear el reloj (mismo criterio que `esActiva()`).
 * @returns {string[]}
 */
export function anunciosVigentes(now = Date.now()) {
  return [
    `🚚 Envío gratis desde ${formatPrice(shipping.freeShippingThresholdRosario)} en Rosario y desde ${formatPrice(shipping.freeShippingThresholdNational)} al resto del país`,
    esCategoriaEn2x1('argentina', now) && '🇦🇷 2x1 en calcos de Argentina',
    `🔄 ${devoluciones.dias} días de garantía y devolución`,
    `💸 10% OFF desde ${BULK_THRESHOLD} calcos pagando por transferencia`
  ].filter(Boolean);
}
```

### Texto de `/politicas/cambios`

Con las opciones recomendadas de `requirements.md` §12, **aprobadas el
14/9/2026**.

```
Cambios y devoluciones
Intro: Tenés 30 días para devolver tu compra, por el motivo que sea.

## Devolución por cualquier motivo
- 30 días corridos desde que recibís el pedido, aunque sea porque no te gustó.
- Las calcos tienen que estar sin pegar: pegadas, el adhesivo se activa y no
  se pueden volver a usar.
- Escribinos por WhatsApp o mail con tu número de pedido y te decimos cómo
  mandarlas. El envío de vuelta corre por tu cuenta.
- Cuando las recibimos, te devolvemos lo que pagaste por los productos, por el
  mismo medio de pago, dentro de los 10 días hábiles. El costo del envío
  original no se devuelve.

## Desperfectos de fabricación
- Impresión defectuosa, corte mal terminado, adhesivo que no pega: te lo
  reponemos sin costo, envío incluido.
- Mandanos foto o video dentro de los 30 días de recibido el pedido.

## Errores en el pedido
- Si te llegó algo distinto, avisanos dentro de los 30 días con foto del
  paquete y del contenido. Te mandamos lo correcto sin costo.

## Productos hechos con tu archivo
- Personalizados, Promo Negocio, fotos Polaroid y tatuajes temporales se
  producen con tu archivo o tus fotos: entran en la garantía por desperfecto de
  fabricación, pero no en la devolución por arrepentimiento.
- (se conserva el párrafo actual: sin vista previa, revisá antes de pagar,
  archivo no apto → te escribimos)

## Archivos imprimibles
- Son un producto digital: no se devuelven. Si el archivo no abre o llega
  dañado, te lo reenviamos.

## Cancelación de pedidos
- (sin cambios)
```

`useSeo.description`: *"Política de cambios y devoluciones de EPICALCOS: 30
días para devolver tu compra por cualquier motivo."* — `lastUpdated`:
`"septiembre 2026"`.

**Términos §6**: *"Tenés {dias} días desde que recibís el pedido para
devolverlo por cualquier motivo, con las condiciones de la Política de
cambios. Los productos hechos con tu archivo solo se cambian por desperfecto de
fabricación."*

**FAQ**: *"Sí. Tenés {dias} días desde que lo recibís para devolverlo por
cualquier motivo, con las calcos sin pegar. Los personalizados se cambian solo
si vienen con una falla de fábrica. Todo el detalle está en Cambios y
devoluciones."*

### Persistencia
No aplica: nada se guarda.

### ⚠️ Compatibilidad con datos existentes
- [x] No cambia la forma de las líneas del carrito
- [x] No cambia la forma del pedido guardado en Blobs

---

## 4. APIs

No aplica: ningún endpoint cambia.

---

## 5. Integraciones

Ninguna. Los reembolsos se hacen a mano desde el panel de Mercado Pago o por
transferencia, como cualquier devolución de dinero hoy.

### Variables de entorno nuevas
Ninguna.

---

## 6. Seguridad

- [x] Ningún secreto en el frontend
- [x] No hay valores del cliente que el servidor tenga que validar
- [x] Sin PII
- [x] No afecta la CSP

| Riesgo | Mitigación |
|---|---|
| La tira promete algo que la política no dice | El número sale de `devoluciones.dias` en los cuatro lugares + test que renderiza la política (§9) |
| La tira anuncia una promo apagada | El mensaje depende de `esCategoriaEn2x1` + test con `now` fuera de la promo |
| La tira anuncia "50 %" en Argentina | Test que lo prohíbe mientras `isArgentinaPromoActive` sea falso |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| `anunciosVigentes()` devuelve `[]` | `AnnouncementBar` devuelve `null` (como hoy) | No hay tira |
| El navegador no soporta `mask-image` | Los bordes no se desvanecen | La tira se corta seca contra el borde; se sigue leyendo |

---

## 8. Estrategia de migración

- **Datos / carritos / pedidos**: no aplica.
- **Política**: rige para todo pedido recibido en los últimos 30 días al publicarla (`requirements.md` §9 D-11).
- **Rollback**: revertir el commit. Para sacar **solo** el mensaje del 2x1 no
  hace falta nada: se apaga con la promo.
- **Feature flag**: no hay. Vaciar la lista de `anunciosVigentes` apaga la tira
  entera (un deploy).

---

## 9. Testing

### Tests nuevos / reescritos

| Archivo | Qué verifica |
|---|---|
| `lib/anuncios.test.js` | **(1)** entre 1 y 5 mensajes · **(2)** sin métricas de marca ni atributos de servicio (lista de prohibidos actual, sin cambios) · **(3)** el mensaje de envío contiene los **dos** umbrales formateados desde `shipping` · **(4)** el 10 % con sus dos condiciones · **(5)** con `now` dentro del 2x1 aparece "2x1" + "Argentina"; con `now` anterior a `PROMO_2X1.startsAt`, no · **(6)** ningún mensaje junta "argentina" con un "%" mientras `isArgentinaPromoActive(now)` sea falso · **(7)** el mensaje de garantía contiene `${devoluciones.dias} días` |
| `lib/politicaDevoluciones.test.js` | Renderiza `Cambios`, `Terminos` y `FAQ` con `react-dom/server` dentro de un `MemoryRouter` (entorno `node`, sin librería nueva) y verifica: **(1)** los tres dicen `${devoluciones.dias} días` · **(2)** ninguno dice "no aceptamos cambios ni devoluciones" ni "No se aceptan cambios ni devoluciones" |

### ⚠️ Tests de paridad
No aplica: no se toca ningún precio, promo, cupón ni envío.

### Verificación manual
- [ ] 375 × 812 con el 3x2 vivo: banner + nav + tira; el titular del hero sigue
      arriba del fold.
- [ ] 1920 px: el loop no deja hueco.
- [ ] `prefers-reduced-motion` (DevTools → Rendering): tira quieta y completa.
- [ ] Lector de pantalla (VoiceOver): lee 4 mensajes una vez.
- [ ] Scroll > 80 px: la tira se recoge.

---

## 10. Dependencias nuevas

Ninguna. `react-dom/server` y `react-router-dom` ya están en el proyecto.

---

## 11. Preguntas abiertas del diseño

- [ ] **Estilo sobrio vs. degradado** — decidido sobrio por lo de §1. Si Mariano
      prefiere el degradado de siempre cuando *no* hay promo, es un modificador
      de clase; no cambia nada más.
- [ ] **Alto del header en 375 px con el 3x2 vivo**: banner (~58 px) + nav
      (~76 px) + tira (~33 px) ≈ 167 px antes del primer scroll. Si al medirlo
      el hero queda tapado, la salida es bajar el `padding` de la tira, no
      sacarla.
