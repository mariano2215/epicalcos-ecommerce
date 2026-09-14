# Tasks — Garantía en el checkout

| | |
|---|---|
| **Spec** | `021-garantia-en-checkout` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano respondió P-1 y P-2 de `requirements.md` §12
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación** (*"Implementá la spec 021"*)

---

## Fase 0 — Preparación

- [ ] **0.1** Volcar las respuestas de P-1 y P-2 en la tabla de mensajes de
      `design.md` §1
  - *Verificación*: no queda ninguna **P-n** abierta
- [ ] **0.2** Releer `CheckoutForm.jsx`, `routes/Checkout.jsx`, `lib/analytics.js`
      y `business-rules.md` §7 (política)
- [ ] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: anotar el número (hoy, 507)

---

## Fase 1 — La lógica

- [ ] **1.1** `lib/garantia.js`: `grupoDeLinea`, `garantiaDelCarrito` y los
      textos de los tres tipos, con `devoluciones.dias`
  - *Verificación*: no importa React ni el `CartContext`
- [ ] **1.2** `lib/garantia.test.js` con los casos de `design.md` §9
  - *Verificación*: pasan todos

---

## Fase 2 — La UI

- [ ] **2.1** `components/GarantiaCheckout.jsx`: `<li>` de ancho completo,
      mensaje, `<details>`/`<summary>` "Ver condiciones" con target de 44 px y
      foco visible; `null` si el tipo es `null`
  - *Verificación*: no hay links ni `window.open` en el componente
- [ ] **2.2** `CheckoutForm.jsx`: leer `items` de `useCart()`, calcular el tipo y
      renderizar `<GarantiaCheckout>` como primer ítem de la lista de confianza;
      reescribir el comentario de la lista (spec 021, por qué ya no es "una
      garantía inventada")
  - *Verificación*: los otros cuatro ítems quedan idénticos

---

## Fase 3 — Espejo de precios

⏭️ **No aplica.**

---

## Fase 4 — Analytics

- [ ] **4.1** `trackGarantiaCondiciones(tipo)` en `lib/analytics.js` →
      `garantia_condiciones_ver` con `{ tipo }`, por `pushDataLayer`
- [ ] **4.2** Se dispara solo al **abrir** (`onToggle` con `open === true`)
  - *Verificación*: abrir-cerrar-abrir = 2 eventos, cerrar = 0
- [ ] **4.3** Sin PII
- [ ] **4.4** `docs/analytics.md`: el evento y qué responde

---

## Fase 5 — Tests y verificación

- [ ] **5.1** Suite completa en verde
- [ ] **5.2** `npm run build --prefix frontend` sin errores (y restaurar el
      `sitemap.xml` que regenera el `prebuild`, que no es parte del cambio)
- [ ] **5.3** Verificación manual de `design.md` §9 en el dev server, a 375 px

---

## Fase 6 — Documentación

- [ ] **6.1** Comentarios con el **por qué** en `garantia.js`, `GarantiaCheckout.jsx`
      y la lista de `CheckoutForm.jsx`

---

## Fase 7 — Cierre

- [ ] **7.1** Validar contra `acceptance.md`, punto por punto
- [ ] **7.2** Reportar hallazgos
- [ ] **7.3** Commit + push — ⚠️ **push a `main` = deploy a producción**.
      `git fetch` antes; stagear archivo por archivo.
- [ ] **7.4** Estado de la spec → `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| La tira de arriba (spec 020) dice "30 días de garantía y devolución" también a quien solo compra personalizados | `config/site.js → anunciosVigentes` | Aceptable como promesa general de la tienda; si se quiere precisar, *"30 días de devolución en calcos de catálogo"* |
| La garantía no aparece en el carrito ni en el carrito lateral | `routes/Cart.jsx`, `components/CartDrawer.jsx` | Reusar `lib/garantia.js` en otra spec, si los datos muestran que la duda aparece antes del checkout |
| El mail de confirmación y la pantalla de gracias no dicen cómo pedir una devolución | `netlify/functions/lib/notify.js`, `routes/PaymentSuccess.jsx` | Una línea con el plazo y el WhatsApp: baja consultas y no cuesta conversión (la compra ya está hecha) |
| El formulario del checkout no guarda lo tipeado | `components/CheckoutForm.jsx` | Guardarlo en `sessionStorage` permitiría linkear a las políticas sin miedo, y además salva al que vuelve de Mercado Pago con un error |
| Sin tráfico para un A/B del mensaje | `lib/experiments.js` | Retomarlo cuando termine alguno de los 4 experimentos activos |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
