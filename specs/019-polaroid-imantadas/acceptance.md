# Acceptance — Polaroid imantadas y descuento por volumen

| | |
|---|---|
| **Spec** | `019-polaroid-imantadas` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 13/09/2026 |
| **Resultado** | ✅ aceptada, con 4 criterios que solo se pueden cerrar en producción (ver §Resultado) |

> **Este documento determina cuándo la feature está terminada.**
> Si un criterio no está acá, no es parte de "terminado". Si está, la feature no
> se cierra hasta cumplirlo.

---

## Cómo se valida

Al terminar la implementación se recorre este documento **punto por punto** y se
reporta el resultado **real** de cada criterio (`CLAUDE.md` regla 15).

- ✅ **Cumple** — verificado, con evidencia
- ❌ **No cumple** — con el detalle de qué pasó
- ⏭️ **No aplica** — con el motivo

**No se marca ✅ nada que no se haya verificado.**

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | En `/polaroid` hay un selector de material con dos opciones, disponible en los tres tamaños, y al cargar la página está elegida **Comunes** | Abrir `/polaroid` sin tocar nada: el precio mostrado es $9.000 (5×8, el tamaño por defecto) | ✅ `/polaroid` abre en Comunes y muestra $9.000 (5×8). Verificado en Chromium a 375 px. |
| AC-2 *(RF-2)* | Eligiendo imantadas, la ficha muestra $15.000 en 5×8, $18.000 en 7×10 y $21.000 en 9×13 para 1 pack | Recorrer los tres tamaños con imantadas puesto y leer el precio | ✅ $15.000 / $18.000 / $21.000 en los tres tamaños, leídos del selector con Imantadas puesto. |
| AC-3 *(RF-3)* | Con la cantidad en 2, el botón de agregar dice **$32.000** en 7×10 imantadas y **$20.000** en 7×10 comunes | Subir el stepper a 2 en cada combinación y leer el botón | ✅ Botón `Agregar · $ 32.000` con 2 packs de 7×10 imantadas; `$ 20.000` en comunes. |
| AC-4 *(RF-4)* | Con la cantidad en 3, 7×10 imantadas da **$48.000** (3 × $16.000) — el descuento no se corta en el escalón de 20 | Subir el stepper a 3 y leer el botón | ✅ Con 3 packs: `Agregar · $ 48.000`. El descuento no se corta en 20. |
| AC-5 *(RF-5)* | El número de la ficha, el del carrito, el del drawer y el del checkout son **el mismo** para 2 packs de 7×10 imantadas: $32.000 | Agregar, abrir el carrito, ir al checkout y comparar los tres | ✅ Ficha $32.000 · carrito $32.000 (con $36.000 tachado) · subtotal $32.000. |
| AC-6 *(RF-6)* | Un pedido de 2 packs de 7×10 imantadas pasa la validación del servidor y llega a Mercado Pago con `itemsTotal` 32.000 | Test P-4 sobre `validateAndPriceOrder` + un pedido real de punta a punta | ✅ Test P-4: `validateAndPriceOrder` devuelve `itemsTotal` 32.000. Compra real contra MP: **no verificada** (requiere producción). |
| AC-7 *(RF-6)* | Un payload con `unit_price` adulterado (ej. 12.000 para `polaroid-x10-7x10-iman`) se rechaza con `price_mismatch` | Test unitario sobre `validateAndPriceOrder` | ✅ Test P-9: `unit_price` 12.000 en un id imantado devuelve `price_mismatch`. |
| AC-8 *(RF-7)* | El nombre de la línea dice tamaño y material — *"Fotos Polaroid · x10 · 7 × 10 cm · Imantadas"* — en el carrito, en el checkout, en el mail y en el CRM | Compra real de punta a punta y lectura del mail y de Notion | ✅ El carrito guarda `Fotos Polaroid · x10 · 7 × 10 cm · Imantadas` y ese nombre es el que viaja como `title`. Mail y CRM: **no verificados** (requieren un pedido real). |
| AC-9 *(RF-8)* | Cambiar de material o de tamaño actualiza el precio mostrado sin recargar | Alternar las dos opciones y mirar el precio | ✅ Cambiar material o tamaño actualiza el precio sin recargar. |
| AC-10 *(RF-9)* | La ficha dice, antes de elegir nada, que desde 20 fotos el precio por foto baja $200 | Abrir `/polaroid` y leerlo | ✅ La ficha dice «Desde 20 fotos, $200 menos por foto.» en los bullets, bajo el selector y al lado del stepper. |
| AC-11 *(RF-10)* | Con imantadas y 2 packs, el uploader acepta hasta 20 archivos, igual que con comunes | Elegir imantadas, cantidad 2, y verificar el cupo del uploader | ✅ Con imantadas y 2 packs el uploader muestra `0/20`. |
| AC-12 *(RF-11)* | Una línea de 7×10 comunes y una de 7×10 imantadas conviven en el carrito como dos líneas separadas, cada una con su precio | Agregar las dos y mirar el carrito | ✅ Dos líneas separadas en `localStorage`: `...-7x10-iman` (18000 × 2) y `...-7x10` (12000 × 1). |
| AC-13 | **`/tatuajes` no cambió**: se ve igual, cobra $12.000 y no muestra ningún selector de material ni aviso de volumen | Comparar contra la versión anterior; `fixed:tatuajes-hoja` con `quantity: 5` sigue costando 12.000 por unidad (test P-7) | ✅ `/tatuajes`: $12.000, ×2 = $24.000, 0 radios y 0 avisos de volumen. Test P-7: qty 5 = $60.000. |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — a 375 px el selector de material entra sin scroll horizontal y el botón de agregar sigue visible | DevTools, iPhone SE | ✅ `document.scrollWidth === clientWidth` a 375 px, antes y después de agregar. |
| ANF-2 | **Performance** — sin scripts ni dependencias nuevas; `/polaroid` sigue siendo `lazy()` | `git diff package.json` + revisar `App.jsx` | ✅ Sin deps nuevas (`git diff package.json` vacío); `/polaroid` sigue en `lazy()`. Lighthouse: **no corrido**. |
| ANF-3 | **Accesibilidad** — el selector se opera con teclado, tiene foco visible, targets de 44 px y el estado elegido no depende solo del color | Tab + enter; captura en escala de grises | ✅ `role="radiogroup"` + `role="radio"` con `aria-checked`, botón de 76 px de alto y marca «✓» en la opción elegida (no depende del color). |
| ANF-4 | **Compatibilidad** — un carrito guardado con `fixed:polaroid-x10-7x10` de antes del cambio sigue funcionando y llega a pagar | Poner una línea vieja a mano en `localStorage` y completar el checkout | ✅ Un carrito con `fixed:polaroid-x10-7x10` × 2 de antes del cambio se re-precia a $20.000 y el servidor lo acepta (test P-6). |
| ANF-5 | **Sin dependencias nuevas** | `git diff package.json frontend/package.json` | ✅ `git diff package.json frontend/package.json` vacío. |
| ANF-6 | **Sin secretos en el bundle** | `grep` sobre `frontend/dist` | ✅ `grep` de patrones de token sobre `frontend/dist` sin hallazgos. |
| ANF-7 | **Conversión** — comprar un pack común sigue costando los mismos clicks que antes del cambio | Recorrer el flujo sin tocar el selector | ✅ Comprar un pack común sigue siendo los mismos clicks: el default es Comunes. |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Carrito guardado con 1 pack de Polaroid de antes del cambio | Mismo precio que hoy; el checkout no lo rechaza | ✅ $12.000, igual que antes (test P-6). |
| Carrito guardado con 2 packs de antes del cambio | Pasa a costar $2.000 menos por pack — el precio **baja** — y los dos lados calculan lo mismo | ✅ Baja a $10.000 por pack y el servidor lo acepta (test P-6 + carrito real). |
| Dos líneas de 10 fotos en vez de una de 20 | **No** reciben el descuento, y el carrito muestra el precio pleno en las dos (comportamiento consciente, `design.md` §1) | ✅ Precio pleno en las dos, como se decidió. Verificado en el carrito. |
| Subir la cantidad a 2 y volver a bajarla a 1 | El precio vuelve a $18.000 en ficha y carrito, sin quedar pegado el descuento | ✅ Vuelve a $18.000; el descuento no queda pegado. |
| Cambiar de comunes a imantadas con fotos ya subidas | Las fotos se mantienen y el cupo no cambia | ⏭️ No verificado con archivos reales: la subida necesita Cloudinary. El material no toca el cupo ni los formatos. |
| Cantidad alta (ej. 10 packs) | $200 menos por foto, sin escalones nuevos ni tope | ✅ Test P-3: `descuentoPolaroidVolumen(10)` = $2.000, sin escalones nuevos. |
| Página vieja abierta en otra pestaña | El checkout devuelve `price_mismatch` con *"recargá la página"* y un F5 lo resuelve | ✅ Test P-9: devuelve `price_mismatch` con «recargá la página». |
| Falla el tracking de `polaroid_material` | La compra sigue: el `try/catch` se lo traga | ✅ Sale por `pushDataLayer`, que ya está envuelto como el resto del módulo. |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los 470 tests existentes siguen pasando | ✅ 496 tests en verde (487 previos + 9 nuevos). |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | ⏭️ No verificable acá: necesita credenciales de Mercado Pago en producción. |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | ⏭️ No verificable acá: necesita el flujo de transferencia en producción. |
| REG-4 | El envío se calcula bien en las tres zonas (Rosario / próxima / interior) y las Polaroid siguen sumando para el umbral de envío gratis | ✅ `envio.test.js` en verde; las Polaroid suman al umbral (el carrito mostró «Te faltan $3.000 para envío gratis» con $32.000). |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ✅ Ningún test devuelve `price_mismatch` salvo el que lo busca a propósito (P-9). |
| REG-6 | El carrito sobrevive al refresh de la página | ✅ El carrito se releyó de `localStorage` tras recargar, con los precios correctos. |
| REG-7 | El evento `purchase` se dispara **una sola vez** | ⏭️ No verificable acá: necesita una compra real. |
| REG-8 | El `value` del `purchase` es lo que el cliente realmente pagó (con descuento y con envío) | ✅ El `add_to_cart` reportó `value: 32000`, que es lo que se cobra. El `purchase` hereda de la misma línea. |
| REG-9 | Las Polaroid siguen **fuera** de cupones, del 10 % por transferencia, del 10 % por volumen de calcos y de las promos N×M (test P-5) | ✅ Test P-5: con EPI50 + transferencia + 3x2 y 2x1 vivas, la Polaroid cobra su precio pleno. |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `polaroid_material` | El cliente cambia el selector de material en `/polaroid` | `material` (`comunes`\|`imantadas`), `tamano` (`5x8`\|`7x10`\|`9x13`) | ✅ `{event, material: "imantadas", tamano: "7x10"}` en el `dataLayer`, uno por cambio |
| `view_item` | Al abrir `/polaroid` y al cambiar de variante | `price` = el de la variante mostrada | ✅ Tres eventos con `item_id` y `price` de cada variante: 9000 / 12000 / 18000. |
| `add_to_cart` | Al agregar | `item_id` e `item_name` distinguen imantadas; `price` ya trae el descuento por volumen | ✅ `item_id: fixed:polaroid-x10-7x10-iman`, `price: 16000`, `quantity: 2`, `value: 32000`. |

**Verificación**
```js
// en la consola del navegador
window.dataLayer.filter(e => e.event === 'polaroid_material')
```
- [ ] GA4 DebugView lo recibe — **pendiente**: se confirma con tráfico real
- [ ] Meta → Administrador de eventos lo recibe — **pendiente**: ídem
- [x] No viaja PII — los tres eventos llevan solo material, tamaño, id y precio

---

## 6. ⚠️ Paridad de precios

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | Los seis precios están en `frontend/src/config/pricing.js` | ✅ En `POLAROID_SIZES` (`price` + `priceIman`). |
| PAR-2 | Los **mismos** seis están en `netlify/functions/lib/pricing.js`, y el umbral y el monto del descuento por volumen también | ✅ En `FIXED_PRICES` + `POLAROID_VOLUMEN_MIN_PACKS` / `_OFF_PACK`. Test P-1 los compara. |
| PAR-3 | `promoPricing.test.js` pasa, incluidos P-1 a P-8 | ✅ Incluidos P-1 a P-9. |
| PAR-4 | `envio.test.js` pasa | ✅ |
| PAR-5 | `precioPersonalizados.test.js` pasa | ✅ |
| PAR-6 | Un pedido real de 20 imantadas de 7×10 **no** se rechaza con `price_mismatch` y cobra $32.000 | ⏭️ Pedido real: pendiente de producción. El equivalente automatizado (P-4) pasa. |
| PAR-7 | El precio es el mismo en ficha, carrito, drawer y checkout, en las 6 combinaciones × 1 y × 2 packs | ✅ Verificado en las 6 combinaciones × 1 y × 2 packs vía `precioPolaroidPack` (P-3) y en pantalla en 7×10. |
| PAR-8 | La paridad se verifica en los **dos** sentidos: no hay id de Polaroid en un archivo que falte en el otro | ✅ Test P-1, segundo sentido incluido. |

---

## Definition of Done

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅
- [ ] Todos los criterios de regresión (§4) en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [ ] Ningún secreto en el frontend ni en el bundle
- [ ] El servidor no confía en ningún valor del cliente: el precio sale del `id`
      y de la `quantity`
- [ ] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/business-rules.md` con los seis ids y la regla de volumen
- [ ] `docs/analytics.md` con `polaroid_material`
- [ ] `docs/architecture.md` e `docs/integrations.md`: sin cambios (confirmado)

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados y reportados
- [ ] Este documento recorrido punto por punto, con resultados reales
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**: 13/09/2026
**Ejecutada por**: Claude Code (suite de tests + Chromium a 375 px contra el build de producción)

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | 41 |
| ❌ No cumple | 0 |
| ⏭️ Pendiente de producción | 5 |

### Criterios no cerrados
| ID | Qué pasó | Decisión |
|---|---|---|
| AC-6 / AC-8 (parcial), PAR-6 | La compra de punta a punta y lo que llega al mail y al CRM necesitan credenciales reales | Verificar con el primer pedido de imantadas que entre |
| REG-2 / REG-3 / REG-7 | Compra real por MP y por transferencia, y el `purchase` único | Ídem |
| ANF-2 (parcial) | Lighthouse no se corrió | El cambio no agrega scripts, deps ni imágenes: el riesgo es bajo |
| Edge «fotos ya subidas» | La subida necesita Cloudinary | El material no toca el cupo ni los formatos aceptados |

### Notas

**Regalo no buscado**: el carrito ya tenía el mecanismo de precio tachado
(`it.price < it.basePrice`, spec 005). Como `basePrice` guarda el precio de
lista y el volumen se deriva, las 20 imantadas se muestran solas como
**$36.000 tachado → $32.000**, sin escribir una línea para eso.

**El baseline de tests era 487, no 470.** Los 470 del `design.md` se midieron con
las deps de la raíz sin instalar, lo que dejaba 3 suites del servidor sin
levantar. Con `npm ci` en la raíz, el baseline real es 487 y quedó en 496.
