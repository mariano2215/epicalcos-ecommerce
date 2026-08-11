# Tasks — Entrega de archivos imprimibles pagados por transferencia

| | |
|---|---|
| **Spec** | `002-entrega-imprimibles-por-transferencia` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |
| **Estimación** | ~2 h (endpoint nuevo + primeros tests de una Function) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano aprobó el diseño
- [ ] Mariano resolvió la pregunta abierta de `design.md` §11 (¿confirmación
      intermedia antes de mandar?)
- [ ] **Mariano pidió explícitamente la implementación**
      (*"Implementá la spec 002"*)

---

## Prerrequisitos de Mariano (no son código)

Estas tres cosas **no bloquean la implementación**, pero sí que la feature sirva
de algo. Ver `requirements.md` §0.

- [ ] **P-1** Subir el archivo del pack y cargar `DIGITAL_LINK_PACK_STICKERS`
      en Netlify, en modo "cualquiera con el enlace puede ver"
- [ ] **P-2** Pasar el número real de diseños del pack (hoy `IMPRIMIBLES[0].disenos`
      está en `null` y la card no promete cantidad)
- [ ] **P-3** Generar el secreto y cargarlo en Netlify:
      ```bash
      openssl rand -hex 32
      ```
      → `DIGITAL_DELIVERY_SECRET`

---

## Reglas de esta implementación

1. **Fallar cerrado**: ante cualquier duda, no mandar el mail y no marcar como
   entregado. Un mail sin link es peor que ningún mail.
2. **No tocar `digitalDeliveryHtml/Text`**: ya resuelven bien el caso pendiente.
3. **No tocar el camino de Mercado Pago**: ya funciona.
4. **No tocar `pricing.js`** de ningún lado.
5. Sin refactors de oportunidad: lo que aparezca va a *Hallazgos*.

---

## Fase 0 — Preparación

- [ ] **0.1** Releer `lib/notify.js` (las 3 marcas de `needsManualDelivery`),
      `lib/digital.js`, `unsubscribe.js` y `tokenBaja` de `abandonedStore.js`
  - *Verificación*: puedo explicar por qué el prefijo `📩 ENVIAR ARCHIVO ·` no
    aparece hoy en un pedido por transferencia
- [ ] **0.2** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 109/109

---

## Fase 1 — Token de entrega

- [ ] **1.1** `tokenEntrega(orderId, secret)` y `tokenEntregaValido(...)` en
      `netlify/functions/lib/digital.js`
  - *Verificación*: comparación con `timingSafeEqual`, igual que `tokenValido`
- [ ] **1.2** Comentario explicando **por qué** se firma el `orderId` y no el
      mail (el `orderId` es opaco y no lleva PII)

---

## Fase 2 — Marcar el pedido en el aviso interno (RF-1)

- [ ] **2.1** En `notify.js`, distinguir el caso "pedido digital pendiente de
      transferencia" del actual `paymentStatus === 'approved' && needsManualDelivery(o)`
  - *Archivo*: `netlify/functions/lib/notify.js:533` (asunto)
  - *Verificación*: el asunto de un pedido digital por transferencia se
    distingue de uno común **y** del caso de MP sin link
- [ ] **2.2** Bloque en el cuerpo del mail interno explicando que hay que
      entregar **al confirmar** el pago
  - *Archivos*: `notify.js:169` (HTML) y `:255` (texto)
  - ⚠️ Mantener el caso actual de MP funcionando igual
- [ ] **2.3** Verificar que el mail al **cliente** no cambió
  - *Verificación*: `digitalDeliveryHtml/Text` sin tocar; sigue diciendo "te los
    mandamos apenas confirmemos" (RF-8)

---

## Fase 3 — El endpoint de entrega (RF-2, RF-3, RF-4)

- [ ] **3.1** Crear `netlify/functions/entregar-digital.js`
- [ ] **3.2** Verificar la firma primero; sin secreto o sin firma válida → 400
      con mensaje genérico
  - *Verificación*: un token alterado en un carácter se rechaza
- [ ] **3.3** Leer el pedido de Blobs; inexistente → **el mismo** mensaje genérico
  - *Verificación*: no se puede distinguir "no existe" de "firma inválida"
- [ ] **3.4** Sin líneas `digital:` → 400 explicando
- [ ] **3.5** **RF-7**: sin link configurado → 409, **sin mandar mail**
  - *Verificación*: el cliente no recibe nada; Mariano lee qué variable falta
- [ ] **3.6** Resolver el estado del pedido para que la vista arme el link y no
      el "te lo mandamos cuando confirmemos" (ver `design.md` §4, último bloque)
  - *Verificación*: el mail sale **con** el botón de descarga
- [ ] **3.7** Mandar el mail al cliente reusando `sendCustomerEmail`
- [ ] **3.8** Marcar `digitalDeliveredAt` **solo si el mail salió** (RF-6)
  - *Verificación*: mismo criterio que `markNotified` del webhook de MP
- [ ] **3.9** Respuesta HTML reusando el molde de `unsubscribe.js` (RNF-6)
- [ ] **3.10** Página intermedia de confirmación, **si** Mariano lo pidió
      (`design.md` §11)

---

## Fase 4 — Persistencia y routing

- [ ] **4.1** `markDigitalDelivered(orderId, info)` en `lib/orderStore.js`
  - *Verificación*: nunca lanza, igual que el resto del módulo
- [ ] **4.2** Redirect en `netlify.toml`
  - ⚠️ **antes** del fallback SPA `/*`
- [ ] **4.3** Documentar `DIGITAL_DELIVERY_SECRET` en `.env.example`

---

## Fase 5 — Espejo de precios

Esta feature **no toca precios**. Solo hay que probarlo.

- [ ] **5.1** `git diff --stat -- netlify/functions/lib/pricing.js` vacío
- [ ] **5.2** `git diff --stat -- frontend/src/config/` vacío

---

## Fase 6 — Tests

⚠️ Primer archivo de tests de una Netlify Function en el repo.

- [ ] **6.1** Crear `frontend/src/lib/entregaDigital.test.js`
- [ ] **6.2** T-1 a T-3 — token determinista, cruzado y malformado
- [ ] **6.3** T-4 y T-5 — `digitalDeliveries` / `needsManualDelivery` sin env var
- [ ] **6.4** T-6 — pedido sin líneas digitales
- [ ] **6.5** T-7 — el asunto marca el pedido digital pendiente
- [ ] **6.6** Suite completa
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 109 anteriores + los nuevos, en verde

---

## Fase 7 — Verificación manual

- [ ] **7.1** Pedido digital de prueba por transferencia → asunto marcado
- [ ] **7.2** Click al botón **desde el celular** (RNF-6)
- [ ] **7.3** El cliente recibe el mail **con** el link de descarga
- [ ] **7.4** Repetir el click (RF-5): no rompe nada
- [ ] **7.5** Sin `DIGITAL_LINK_…`: avisa y **no** manda mail (RF-7)
- [ ] **7.6** Token alterado: rechazo sin pistas
- [ ] **7.7** **Regresión**: un pedido físico normal por transferencia manda los
      mismos mails que antes
- [ ] **7.8** **Regresión**: un pedido digital por **Mercado Pago** sigue
      entregándose solo

---

## Fase 8 — Documentación

- [ ] **8.1** `docs/integrations.md` — `DIGITAL_DELIVERY_SECRET` en el inventario
- [ ] **8.2** `docs/business-rules.md` §1 — la regla de entrega tras confirmar
- [ ] **8.3** `docs/architecture.md` — la ruta `/api/entregar-digital` en el mapa
      y §9 (ya no es cierto que no haya tests de Functions)
- [ ] **8.4** `docs/AUTOMATIZACIONES.md` — qué corre solo y qué no

---

## Fase 9 — Cierre

- [ ] **9.1** Recorrer `acceptance.md` punto por punto con resultados reales
- [ ] **9.2** Reportar hallazgos fuera de scope
- [ ] **9.3** Commit + push (⚠️ **push a `main` = deploy a producción**)
- [ ] **9.4** Marcar la spec como `DONE`
- [ ] **9.5** Si hubo pedidos digitales por transferencia anteriores
      (`requirements.md` §12), revisar que hayan recibido su archivo

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| | | |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
