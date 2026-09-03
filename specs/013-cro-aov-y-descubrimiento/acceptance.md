# Acceptance — CRO: ticket promedio y fricción de descubrimiento

| | |
|---|---|
| **Spec** | `013-cro-aov-y-descubrimiento` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 03/09/2026 |
| **Resultado** | ✅ aceptada (con 3 puntos del plan original fuera de scope, §7) |

> Recorrido punto por punto sobre el dev server, a 375 px y en desktop
> (`CLAUDE.md` regla 15). Ningún ✅ está marcado sin haberlo ejecutado.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | Con 7 calcos de 6 cm ($11.200) el drawer dice **"Te faltan $ 23.800 para envío gratis en Rosario"** con la barra al 32 % | Drawer a 375 px, captura | ✅ |
| AC-2 *(RF-2)* | Con un carrito 100 % digital el drawer **no** muestra barra de envío: muestra "📩 Te llega por mail — sin envío" | Carrito sembrado con una línea `digital:`; `barras: 0` en el drawer y en `/carrito` | ✅ |
| AC-3 *(RF-3)* | Con 7 de 10 calcos, drawer y `/carrito` muestran el medidor al 70 % con "Te faltan 3 calcos" | Drawer (compacto) y `/carrito` (con párrafo de ayuda) | ✅ |
| AC-4 *(RF-4)* | El medidor **nunca** dice "10% off" a secas | Texto literal: *"para 10% off pagando por transferencia"* / *"✓ Llegaste a 10 calcos — 10% off por transferencia · ahorrás $ 1.600"* | ✅ |
| AC-5 *(RF-5)* | Un click en el order bump agrega la línea sin cerrar el drawer, en el tamaño ya elegido | Click real: `sticker:anime-33:6cm`, `drawerSigueAbierto: true`, carrito 7 → 8 | ✅ |
| AC-6 *(RF-6)* | El bump nunca ofrece algo que ya está en el carrito, y desaparece si no queda nada | Tras agregar #33 ofreció #22; con 10 líneas, `bumpOfreceAlgoQueYaEsta: false`. Carrito vacío → sin bump | ✅ |
| AC-7 *(RF-7)* | El bump prioriza las categorías del carrito | Con sólo Anime en el carrito, ofreció Anime #33 / #22 / #10 | ✅ |
| AC-8 *(RF-8)* | El autocomplete muestra la miniatura de cada categoría | "anime" → `/stickers/anime/1.webp` + "🌸 Anime · 36 diseños". "ar" → 6 filas, las 6 con miniatura | ✅ |
| AC-9 *(RF-9)* | Si la miniatura falla, la fila sigue usable | `error` sobre el `<img>` → `display: none`; quedan emoji, nombre, conteo y el botón clickeable | ✅ |
| AC-10 *(RF-10)* | El `SizePicker` de la grilla dice el uso de cada tamaño | "Celular · llavero" / "Termo · notebook" / "Auto · casco" | ✅ |
| AC-11 *(RF-11)* | El uso está escrito una sola vez | `lib/usosPorTamano.js`; `SizeGuide` y `SizePicker` lo importan. Test de paridad con `SIZES` | ✅ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — 375 px sin scroll horizontal, y el botón "Ir al checkout" visible con las dos barras + el bump | Viewport 375×812. `scrollWidth === clientWidth`; captura del drawer con el CTA visible | ✅ |
| ANF-2 | **Performance** — sin scripts bloqueantes; los manifests no se bajan dos veces | Cache compartido verificado: abrir el drawer sobre `/carrito` disparó **1** fetch nuevo (`frases.json`); `anime/argentina/aesthetic/gamer` se reusaron. Cada archivo, 1 vez | ✅ |
| ANF-3 | **Accesibilidad** — `role="progressbar"` con valores, `aria-label` en controles, targets ≥ 44 px | Labels: *"Progreso hacia el 10% de descuento por transferencia: 7 de 10 calcos"*, *"Agregar Anime #33 en 6 cm por $ 1.600"*, *"6 cm, $ 1.600, ideal para Termo o notebook"*. Botones del picker: 57,25 px | ✅ |
| ANF-4 | **Compatibilidad** — carritos guardados siguen funcionando | La forma de la línea no cambió; carritos sembrados a mano con el formato viejo se hidratan y cotizan igual | ✅ |
| ANF-5 | **Sin dependencias nuevas** | `frontend/package.json` sin cambios | ✅ |
| ANF-6 | **Sin secretos en el bundle** | No se agregó ninguna env var; el build no incorpora nada nuevo | ✅ |

> ⚠️ **ANF-3, un defecto encontrado y corregido durante esta validación**: con 32
> calcos el medidor anunciaba *"32 de 10 calcos"*. Pasado el umbral el progreso
> deja de tener sentido; ahora dice *"10% de descuento por transferencia
> alcanzado con 32 calcos"*.

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Carrito vacío | Estado vacío de siempre, sin barras ni bump | ✅ — `barras: 0`, `bump: false` |
| Carrito 100 % digital | Sin barra de envío ni medidor del 10 %, sin bump | ✅ |
| Carrito sin calcos de catálogo (sólo pack) | El medidor del 10 % sigue mostrándose en 0, como hacía `/carrito` antes | ✅ — se sacó a propósito la guarda que lo escondía |
| Ya alcanzó los dos umbrales | Las dos barras al 100 %, en verde, con el ahorro | ✅ — 32 calcos: "✓ Tenés envío gratis a todo el país" + "✓ Llegaste a 10 calcos … ahorrás $ 1.600" |
| Un manifest no baja | El bump no se muestra; el drawer funciona | ✅ — `cargarManifest` devuelve `[]` en el `.catch`; con `elegirUno → null` el componente no renderiza |
| Miniatura 404 | Se esconde la imagen, queda el emoji | ✅ |
| Promo 3x2 vigente | El mensaje de la promo se mantiene y las barras conviven | ⏭️ **No verificado en vivo**: la ventana de la 3x2 venció el 28/8/2026, así que hoy no se puede reproducir sin mover fechas del config. El código de la promo en el drawer **no se tocó** (sólo se reemplazaron las dos líneas del 10 %) |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los tests existentes siguen pasando | ✅ — **374 pasan** (341 antes + 33 nuevos), 24 archivos |
| REG-2 | Compra por Mercado Pago de punta a punta | ⏭️ **No ejecutada**: exige un pago real contra producción. Mitigación: el payload del checkout no cambió — el order bump produce la misma línea `sticker:{id}:{size}` que la grilla |
| REG-3 | Compra por transferencia de punta a punta | ⏭️ Igual que REG-2 |
| REG-4 | Envío bien calculado en las tres zonas | ✅ — `envio.test.js` pasa sin modificar |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ✅ — `promoPricing.test.js` pasa sin modificar; no se tocó ningún precio |
| REG-6 | El carrito sobrevive al refresh | ✅ — verificado en cada recarga de la validación |
| REG-7 | `purchase` se dispara una sola vez | ⏭️ No aplica: no se tocó `purchaseTracking.js` ni las pantallas de gracias |
| REG-8 | El `value` del `purchase` es lo pagado | ⏭️ No aplica: no se tocó el cálculo |
| **REG-9** | **El upsell de `/checkout` sigue andando tras extraer `lib/sugerencias.js`** | ✅ — 4 cards, categorías mezcladas (Anime del carrito + Argentina/Aesthetic/Gamer), agrega 1 línea, **no** abre el drawer, y su `add_to_cart` sigue **sin** `item_list_name` |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `add_to_cart` (order bump) | Click en "Agregar" del carrito lateral | `item_id: "sticker:anime-33:6cm"`, `price: 1600`, `quantity: 1`, `item_list_name: "order_bump_drawer"` | ✅ |
| `add_to_cart` (resto) | Sin cambios | **Sin** `item_list_name` | ✅ |

- [x] Sale por `lib/analytics.js`; ningún componente toca `gtag`/`fbq`/`dataLayer`
- [x] En `try/catch` (ya lo estaban `pushDataLayer` y `pixel`)
- [x] Sin PII — `item_list_name` es una constante
- [ ] GA4 DebugView / Meta *Probar eventos*: ⏭️ **no verificado** — requiere el
      sitio publicado. En dev se comprobó el `dataLayer` directamente.

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica** — la feature no toca precios, promos, cupones ni envíos.

La verificación de que **no** se tocó el espejo es que los tres tests de paridad
pasan **sin haber sido modificados**:

| ID | Criterio | Resultado |
|---|---|---|
| PAR-3 | `promoPricing.test.js` pasa | ✅ sin cambios |
| PAR-4 | `envio.test.js` pasa | ✅ sin cambios |
| PAR-5 | `precioPersonalizados.test.js` pasa | ✅ sin cambios |
| PAR-7 | Mismo precio en grilla, ficha, carrito y checkout | ✅ — el bump cotiza con `precioVidriera()`, la misma función que la grilla |

`git diff` no toca `frontend/src/config/pricing.js`, `frontend/src/config/site.js`
ni `netlify/functions/lib/pricing.js`.

---

## 7. Lo que quedó fuera — requiere decisión de Mariano

Tres puntos del plan original **no se implementaron**, y no por falta de tiempo:

| Punto del plan | Por qué no | Qué haría falta |
|---|---|---|
| "Pack de 3 calcos sorpresa por $2.500" | Inventa un **precio nuevo**. Hay que espejarlo en `netlify/functions/lib/pricing.js` o el checkout se rechaza (regla 11), y fijar precios es decisión tuya | Decidir precio y contenido; después es una spec chica |
| Packs temáticos ("Pack Termo Matero x20") | Precio nuevo + **curaduría** de qué diseños entran + **republicar `/armar-pack`**, que despublicaste el 26/8/2026 | Decidir los tres puntos |
| Doofinder / Algolia | Servicio externo pago para 61 JSON estáticos; `CLAUDE.md` regla 10. El motor propio ya resuelve acentos, alias e intención | Nada: la miniatura, que era lo que faltaba, ya está |

Además, un hallazgo del discovery que conviene saber: **"filtrar por tamaño" no
existe como filtro** porque los diseños no tienen tamaño — se elige al comprar y
todos salen en 4, 6 y 9 cm. Lo que el plan buscaba ("ideal para termo") se
resolvió llevando esa información al selector de la grilla.

---

## Definition of Done

### Código
- [x] Criterios de §1, §2 y §3 en ✅ (salvo la promo 3x2, no reproducible hoy)
- [x] Regresión en ✅ salvo las dos compras de punta a punta, que exigen producción
- [x] `npm test` en verde — 374 tests
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope (los hallazgos están anotados en `tasks.md`)
- [x] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [x] Ningún secreto en el frontend ni en el bundle
- [x] El servidor no confía en ningún valor nuevo del cliente
- [x] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [x] `docs/analytics.md` actualizado (`item_list_name`)
- [ ] `docs/business-rules.md` — sin cambios: ninguna regla comercial se movió
- [ ] `docs/architecture.md` — sin cambios
- [ ] `docs/integrations.md` — sin cambios

### Proceso
- [x] `tasks.md` con todos los pasos marcados
- [x] Hallazgos fuera de scope anotados y reportados
- [x] Este documento recorrido punto por punto, con resultados reales
- [x] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: 03/09/2026
**Ejecutada por**: Claude, sobre el dev server (375 px y desktop)

| | Cantidad |
|---|---|
| ✅ Cumple | 32 |
| ❌ No cumple | 0 |
| ⏭️ No aplica / no verificable en dev | 7 |

### Criterios no cumplidos
Ninguno.

### Notas
Un defecto se encontró y se corrigió **durante** la validación, no antes: el
`aria-label` del medidor decía "32 de 10 calcos" pasado el umbral. Está en §2.
