# Tasks — Garantía en el mail de confirmación

| | |
|---|---|
| **Spec** | `022-garantia-en-mail` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano respondió P-1 y P-2 de `requirements.md` §12
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación** (*"Implementá la spec 022"*)

---

## Fase 0 — Preparación

- [ ] **0.1** Volcar P-1 y P-2 en `design.md` §1
- [ ] **0.2** Releer `notify.js` (armado del mail al cliente y el comentario de
      "Envío resiliente"), `envioAviso.test.js` y `business-rules.md` §7
- [ ] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: anotar el número (hoy, 524)

---

## Fase 1 — La clasificación en el servidor

- [ ] **1.1** `netlify/functions/lib/garantia.js`: `DEVOLUCIONES_DIAS` con su
      comentario de espejo, y `garantiaDelPedido(items)`
  - *Verificación*: no importa nada de `frontend/`
- [ ] **1.2** Tests de paridad y clasificación en `garantiaMail.test.js`

---

## Fase 2 — El bloque del mail

- [ ] **2.1** `garantiaHtml(o)` y `garantiaText(o)` en `notify.js`, al lado de
      `digitalDeliveryHtml/Text`, con `try/catch` propio que devuelve `''`
- [ ] **2.2** Insertarlos en `buildCustomerEmailHtml` y `buildCustomerEmailText`,
      después de "Entrega" y antes de "¿Dudas o cambios?"
  - *Verificación*: el resto del mail queda idéntico (diff acotado a la inserción)
- [ ] **2.3** Tests del mail armado, robustez y coherencia con el checkout
      (`design.md` §9)

---

## Fase 3 — Espejo

- [ ] **3.1** El test de paridad `DEVOLUCIONES_DIAS === devoluciones.dias` pasa
- [ ] **3.2** Mutación: con `devoluciones.dias` en otro número el test de
      paridad **falla** (el espejo avisa), y vuelve a verde al igualarlos

---

## Fase 4 — Analytics

- [ ] **4.1** `docs/analytics.md`: la UTM del mail y qué responde

---

## Fase 5 — Tests y verificación

- [ ] **5.1** Suite completa en verde
- [ ] **5.2** `npm run build --prefix frontend` sin errores (restaurar el
      `sitemap.xml` que regenera el `prebuild`)
- [ ] **5.3** Mirar el HTML armado de los cinco tipos de pedido (guardarlo a un
      archivo y abrirlo en el navegador), a 375 px
- [ ] **5.4** Pedirle a Mariano el mail real de prueba (`design.md` §9) — no se
      manda sin su OK

---

## Fase 6 — Documentación

- [ ] **6.1** `docs/NOTIFICACIONES.md`: qué dice ahora el mail al cliente
- [ ] **6.2** Comentarios con el **por qué** en `garantia.js` y en los bloques
      de `notify.js`

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
| El mail interno no dice qué garantía tiene el pedido | `notify.js → buildEmailHtml` | Una línea con los flags de `garantiaDelPedido`: sirve al atender un reclamo |
| El servidor no sabe si un pack mayorista trae archivos del cliente | `lib/pricing.js`, checkout | Si algún día hace falta precisarlo (ej. para el CRM), hacer viajar `customCount` validado como entero en `[0, cantidad]` |
| La pantalla de gracias no menciona la garantía | `routes/PaymentSuccess.jsx` | Ya anotado en la spec 021 |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
