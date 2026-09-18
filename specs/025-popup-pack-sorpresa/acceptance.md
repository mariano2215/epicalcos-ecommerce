# Acceptance — Popup: pack de stickers sorpresa gratis con tu compra

| | |
|---|---|
| **Spec** | `025-popup-pack-sorpresa` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> Se recorre punto por punto al terminar (`CLAUDE.md` regla 15). No se marca ✅
> nada que no se haya verificado; lo que no se pudo probar se dice.

Para forzar tiempos sin esperar, en la consola del navegador:
```js
// ventana con 5 s restantes
localStorage.setItem('epicalcos.regaloBienvenida',
  JSON.stringify({ regalo: 'pack_sorpresa', emitidoEn: Date.now() - (10 * 60 - 5) * 1000 }))
```

---

## 1. Criterios funcionales

### Popup
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | El popup ofrece un pack de stickers sorpresa gratis con la compra, válido por 10 minutos, y **no** dice "10%" en ninguna parte | Borrar `epicalcos.welcomePopup.seen`, disparar el popup, leer el texto | ⬜ |
| AC-2 *(RF-2)* | Al dejar un mail válido, el popup muestra el pack reservado y un contador que arranca en 10:00 (o 09:59) y baja | Dejar un mail, mirar el contador 5 s | ⬜ |
| AC-3 *(RF-3)* | Con la pestaña 60 s en segundo plano, al volver el contador muestra ~1 minuto menos | Cambiar de pestaña, volver | ⬜ |
| AC-4 *(RF-4)* | Con productos en el carrito, el botón del popup lleva a `/checkout`; con el carrito vacío, cierra el popup | Probar los dos casos | ⬜ |
| AC-5 *(RF-5)* | El lead se registra en Notion y en el CRM interno, y llega el aviso interno por mail diciendo "pack sorpresa" | Un mail de prueba real; mirar Notion y la casilla | ⬜ |
| AC-6 *(RF-6)* | El mail de prueba **no** recibe un mail con el código EPICA10 | Casilla del mail de prueba | ⬜ |

### Checkout
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-7 *(RF-7)* | Con la ventana abierta, "Tu pedido" muestra "Pack de stickers sorpresa · x1 · GRATIS", visible sin scrollear la lista de productos aunque el carrito tenga 10 líneas | Carrito con 10 líneas + regalo | ⬜ |
| AC-8 *(RF-8)* | La línea tiene un contador que baja | Mirar 5 s | ⬜ |
| AC-9 *(RF-9)* | A 375 px, el contador del regalo se ve **arriba del formulario** al entrar al checkout, sin scrollear | Viewport 375×812 | ⬜ |
| AC-10 *(RF-10)* | Subtotal, descuento, envío y total son **idénticos** con y sin regalo, para el mismo carrito, envío y medio de pago | Anotar los 4 números; borrar el key del regalo, recargar, comparar | ⬜ |
| AC-11 *(RF-11)* | Con 5 s restantes, al llegar a cero la línea desaparece sola y aparece el aviso de que se terminó el tiempo | Snippet de arriba + esperar | ⬜ |
| AC-12 *(RF-12)* | Con nombre, mail, teléfono, dirección, envío "interior" y transferencia ya elegidos, el vencimiento no cambia ninguno | Completar todo, forzar el vencimiento, revisar cada campo | ⬜ |
| AC-13 *(RF-13)* | Con `emitidoEn` de hace 12 minutos, el checkout no muestra línea ni aviso | Setear el key a −12 min, entrar | ⬜ |
| AC-14 *(RF-14)* | Recargando el checkout a mitad de ventana, el regalo sigue y el contador continúa (no vuelve a 10:00) | F5 | ⬜ |

### Pedido
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-15 *(RF-15)* | `validateAndPriceOrder` con `regaloEmitidoEn` de hace 10:30 → `regalo: 'pack_sorpresa'`; de hace 11:30 → `regalo: null` | Test | ⬜ |
| AC-16 *(RF-16)* | `regaloEmitidoEn` vencido, futuro, `'abc'` u objeto → `ok: true`, `regalo: null`, nunca un 400 | Test | ⬜ |
| AC-17 *(RF-17)* | Un pedido real con regalo muestra "Pack de stickers sorpresa — GRATIS" en el mail interno, el mail al cliente, la fila de Notion y el CRM interno | Compra real por transferencia (monto mínimo); revisar los 4 | ⬜ |
| AC-18 *(RF-18)* | El mail interno de ese pedido trae "🎁 Incluir pack sorpresa" arriba de la tabla de ítems | Mismo pedido | ⬜ |
| AC-19 *(RF-19)* | `buildOrderView(null, payment)` con `metadata.regalo` repone la línea exactamente una vez | Test | ⬜ |
| AC-20 *(RF-20)* | Pedido solo digital con ventana abierta → `regalo: null` | Test | ⬜ |
| AC-21 *(RF-21)* | Un pedido de 30 líneas con regalo tiene **una** `LINEA_REGALO` con `quantity: 1` | Test | ⬜ |
| AC-22 *(RF-22)* | El regalo sale con Mercado Pago y con transferencia, con envío y con retiro | Tests de los dos endpoints + la compra de AC-17 | ⬜ |
| AC-23 | La preferencia de MP **no** contiene ningún ítem `regalo:` y cobra lo mismo que sin regalo | Test de `create-preference` o log de `mpItems` en una preferencia de prueba | ⬜ |
| AC-24 | El Purchase de la API de conversiones de Meta no incluye la línea del regalo en `contents` | Test en `metaMatching.test.js` | ⬜ |

### Interruptor
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-25 *(RF-23)* | Con `activa: false` en los dos `pricing.js`: el popup es el de 10 % OFF de hoy y entrega EPICA10 con su contador; el checkout no muestra regalos; el servidor devuelve `regalo: null` aunque llegue un `regaloEmitidoEn` fresco | Build local con el flag apagado + test | ⬜ |
| AC-26 | `capture-lead` **sin** `oferta` devuelve `code: 'EPICA10'` (compatibilidad con el bundle viejo) | Test o `curl` a la función | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile**: popup y checkout a 375 px sin scroll horizontal | `document.documentElement.scrollWidth <= 375` | ⬜ |
| ANF-2 | **Performance**: sin requests nuevos al cargar el Home | Network del Home antes/después | ⬜ |
| ANF-3 | **Accesibilidad**: el contador visible es `aria-hidden`; hay un `role="status"` que se anuncia al montar y al vencer; los botones miden ≥ 44 px de alto | Inspección | ⬜ |
| ANF-4 | **Compatibilidad**: un carrito guardado antes del cambio se abre igual; un `epicalcos.welcomeCoupon = "EPICA10"` (formato viejo) sigue aplicando el 10 % en el checkout | Setear los dos keys a mano | ⬜ |
| ANF-5 | **Storage bloqueado**: con `localStorage.setItem` tirando, dejar el mail y navegar al checkout sin recargar muestra el regalo | Test de `regaloBienvenida.js` + prueba manual pisando `setItem` | ⬜ |
| ANF-6 | **Sin dependencias nuevas** | `git diff frontend/package.json` sin cambios propios | ⬜ |
| ANF-7 | **Sin secretos en el bundle** | `grep` de tokens conocidos sobre `frontend/dist` | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Paga a los 10:30 habiendo entrado al checkout a los 9:50 | La línea salió de la pantalla a las 10:00, pero el pedido lleva el pack (tolerancia) | ⬜ |
| Preferencia creada con regalo, pago en MP a los 20 min | El aviso del pago aprobado muestra el pack | ⬜ |
| Pago de MP fallido, reintento con la ventana cerrada | El pedido nuevo no lleva el pack | ⬜ |
| Retiro en mano | Lleva el pack | ⬜ |
| Cliente con EPICA10 guardado (formato nuevo, ventana vencida) | Mismo comportamiento que hoy: se aplica, vence y se olvida | ⬜ |
| Blobs caído al confirmar el pago de MP | El mail interno igual dice "Incluir pack sorpresa" | ⬜ |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando (N de la Fase 0) | ⬜ |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | ⬜ |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | ⬜ |
| REG-4 | El envío se calcula igual en las tres zonas | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch`, con o sin regalo | ⬜ |
| REG-6 | El carrito sobrevive al refresh | ⬜ |
| REG-7 | `purchase` se dispara una sola vez | ⬜ |
| REG-8 | El `value` del `purchase` es lo que se pagó (el regalo no suma nada) | ⬜ |
| REG-9 | El mail de carrito abandonado sigue mostrando los precios de sus líneas (no "GRATIS") | ⬜ |
| REG-10 | La entrega de archivos digitales no cambia | ⬜ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `regalo_emitido` | se deja el mail en el popup con el regalo activo | `regalo: 'pack_sorpresa'`, `ventana_ms: 600000` | ⬜ |
| `regalo_vencido` | el contador llega a 0 en el popup | `donde: 'popup'` | ⬜ |
| `regalo_vencido` | el contador llega a 0 en el checkout | `donde: 'checkout'`, **una sola vez** | ⬜ |
| `purchase` | compra con regalo | `regalo: 'pack_sorpresa'` | ⬜ |
| `purchase` | compra sin regalo | sin el parámetro `regalo` | ⬜ |
| `generate_lead` | igual que hoy | `lead_source: 'welcome_popup'` | ⬜ |

```js
window.dataLayer.filter(e => /^regalo_|^purchase$/.test(e.event))
```
- [ ] Ningún evento lleva el mail ni datos del lead

---

## 6. Paridad

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | `REGALO_BIENVENIDA` (`activa`, `id`, `ventanaMs`) idéntico en los dos `pricing.js` — test | ⬜ |
| PAR-2 | Mismo pedido con y sin regalo → `items`, `itemsTotal` y `shippingCost` idénticos — test | ⬜ |
| PAR-3 | `promoPricing`, `envio` y `precioPersonalizados` pasan sin cambios | ⬜ |

---

## Definition of Done

- [ ] §1, §2 y §3 en ✅ (o ⏭️ con motivo)
- [ ] §4 completo en ✅
- [ ] `npm test` en verde y build de producción sin errores
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff; **sin WIP ajeno** en el commit (`git diff --cached`)
- [ ] Sin PII en logs, URLs ni `dataLayer`
- [ ] `docs/business-rules.md`, `docs/database.md` y `docs/analytics.md` actualizados
- [ ] `tasks.md` con todos los pasos marcados y la Bitácora completa
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |
