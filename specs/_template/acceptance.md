# Acceptance — [NOMBRE DE LA FEATURE]

| | |
|---|---|
| **Spec** | `NNN-nombre-corto` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente / ✅ aceptada / ❌ rechazada |

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

**No se marca ✅ nada que no se haya verificado.** Si algo no se pudo probar, se
dice que no se pudo probar.

---

## 1. Criterios funcionales

Uno por cada RF de `requirements.md` §7.

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* | | ⬜ |
| AC-2 | *(RF-2)* | | ⬜ |
| AC-3 | *(RF-3)* | | ⬜ |

Cada criterio se escribe de forma que **otra persona pueda verificarlo sin
preguntar nada**.

> ❌ *"El carrito funciona bien"*
> ✅ *"Con un calco de `argentina` de 6 cm en el carrito durante la ventana de
> promo, el carrito muestra $800 y el subtotal es $800 — el mismo número que la
> grilla y que el checkout."*

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — funciona a 375 px sin scroll horizontal | DevTools, iPhone SE | ⬜ |
| ANF-2 | **Performance** — no empeora el LCP del Home | Lighthouse antes/después | ⬜ |
| ANF-3 | **Accesibilidad** — controles con `aria-label`, targets de 44 px, foco visible | inspección + teclado | ⬜ |
| ANF-4 | **Compatibilidad** — un carrito guardado antes del cambio sigue funcionando | `localStorage` con datos viejos | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff package.json` | ⬜ |
| ANF-6 | **Sin secretos en el bundle** | `grep` sobre `frontend/dist` | ⬜ |

Ajustar según la feature.

---

## 3. Edge cases

Uno por cada caso de `requirements.md` §10.

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| | | ⬜ |

---

## 4. Regresión — lo que NO se puede haber roto

Estos criterios se verifican **siempre**, sin importar la feature.

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los 100 tests existentes siguen pasando | ⬜ |
| REG-2 | Se puede completar una compra por **Mercado Pago** de punta a punta | ⬜ |
| REG-3 | Se puede completar una compra por **transferencia** de punta a punta | ⬜ |
| REG-4 | El envío se calcula bien en las tres zonas (Rosario / próxima / interior) | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| REG-6 | El carrito sobrevive al refresh de la página | ⬜ |
| REG-7 | El evento `purchase` se dispara **una sola vez** (refrescar la pantalla de gracias no lo repite) | ⬜ |
| REG-8 | El `value` del `purchase` es lo que el cliente realmente pagó (con descuento y con envío) | ⬜ |

---

## 5. Analytics

Uno por cada evento de `requirements.md` §11.

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| | | | ⬜ |

**Verificación**
```js
// en la consola del navegador
window.dataLayer.filter(e => e.event === 'nombre_del_evento')
```
- [ ] GA4 DebugView lo recibe
- [ ] Meta → Administrador de eventos → Probar eventos lo recibe (si aplica)
- [ ] No viaja PII

---

## 6. ⚠️ Paridad de precios *(si la feature toca el camino de precios)*

Marcar ⏭️ si no aplica.

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | El cambio está aplicado en `frontend/src/config/pricing.js` | ⬜ |
| PAR-2 | El **mismo** cambio está en `netlify/functions/lib/pricing.js` | ⬜ |
| PAR-3 | `promoPricing.test.js` pasa | ⬜ |
| PAR-4 | `envio.test.js` pasa | ⬜ |
| PAR-5 | `precioPersonalizados.test.js` pasa | ⬜ |
| PAR-6 | Un pedido real con el precio nuevo **no** se rechaza con `price_mismatch` | ⬜ |
| PAR-7 | El precio es el mismo en grilla, ficha, carrito y checkout | ⬜ |

---

## Definition of Done

La feature está terminada **solo** cuando todo esto es cierto:

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅
- [ ] Todos los criterios de regresión (§4) en ✅
- [ ] `npm test --prefix frontend` en verde
- [ ] Sin dependencias nuevas (o justificadas y aprobadas en `design.md`)
- [ ] Sin refactors fuera de scope en el diff
- [ ] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [ ] Ningún secreto en el frontend ni en el bundle
- [ ] El servidor no confía en ningún valor del cliente
- [ ] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/business-rules.md` actualizado si cambió una regla comercial
- [ ] `docs/architecture.md` actualizado si cambió la arquitectura
- [ ] `docs/integrations.md` actualizado si hay integración o env var nueva
- [ ] `docs/analytics.md` actualizado si cambió el tracking

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados y reportados
- [ ] Este documento recorrido punto por punto, con resultados reales
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|

### Notas
