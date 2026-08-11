# Tasks — Entrega de archivos imprimibles pagados por transferencia

| | |
|---|---|
| **Spec** | `002-entrega-imprimibles-por-transferencia` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` (11/08/2026) |
| **Estimación** | ~2 h (endpoint nuevo + primeros tests de una Function) |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [x] Mariano aprobó el diseño
- [x] Mariano resolvió la pregunta abierta de `design.md` §11 → **entrega directa**
- [x] **Mariano pidió explícitamente la implementación** (11/08/2026)

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

- [x] **0.1** Releer `lib/notify.js` (las 3 marcas de `needsManualDelivery`),
      `lib/digital.js`, `unsubscribe.js` y `tokenBaja` de `abandonedStore.js`
  - *Verificación*: puedo explicar por qué el prefijo `📩 ENVIAR ARCHIVO ·` no
    aparece hoy en un pedido por transferencia
- [x] **0.2** Suite en verde
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 109/109

---

## Fase 1 — Token de entrega

- [x] **1.1** `tokenEntrega(orderId, secret)` y `tokenEntregaValido(...)` en
      `netlify/functions/lib/digital.js`
  - *Verificación*: comparación con `timingSafeEqual`, igual que `tokenValido`
- [x] **1.2** Comentario explicando **por qué** se firma el `orderId` y no el
      mail (el `orderId` es opaco y no lleva PII)

---

## Fase 2 — Marcar el pedido en el aviso interno (RF-1)

- [x] **2.1** En `notify.js`, distinguir el caso "pedido digital pendiente de
      transferencia" del actual `paymentStatus === 'approved' && needsManualDelivery(o)`
  - *Archivo*: `netlify/functions/lib/notify.js:533` (asunto)
  - *Verificación*: el asunto de un pedido digital por transferencia se
    distingue de uno común **y** del caso de MP sin link
- [x] **2.2** Bloque en el cuerpo del mail interno explicando que hay que
      entregar **al confirmar** el pago
  - *Archivos*: `notify.js:169` (HTML) y `:255` (texto)
  - ⚠️ Mantener el caso actual de MP funcionando igual
- [x] **2.3** Verificar que el mail al **cliente** no cambió
  - *Verificación*: `digitalDeliveryHtml/Text` sin tocar; sigue diciendo "te los
    mandamos apenas confirmemos" (RF-8)

---

## Fase 3 — El endpoint de entrega (RF-2, RF-3, RF-4)

- [x] **3.1** Crear `netlify/functions/entregar-digital.js`
- [x] **3.2** Verificar la firma primero; sin secreto o sin firma válida → 400
      con mensaje genérico
  - *Verificación*: un token alterado en un carácter se rechaza
- [x] **3.3** Leer el pedido de Blobs; inexistente → **el mismo** mensaje genérico
  - *Verificación*: no se puede distinguir "no existe" de "firma inválida"
- [x] **3.4** Sin líneas `digital:` → 400 explicando
- [x] **3.5** **RF-7**: sin link configurado → 409, **sin mandar mail**
  - *Verificación*: el cliente no recibe nada; Mariano lee qué variable falta
- [x] **3.6** Resolver el estado del pedido para que la vista arme el link y no
      el "te lo mandamos cuando confirmemos" (ver `design.md` §4, último bloque)
  - *Verificación*: el mail sale **con** el botón de descarga
- [x] **3.7** Mandar el mail al cliente reusando `sendCustomerEmail`
- [x] **3.8** Marcar `digitalDeliveredAt` **solo si el mail salió** (RF-6)
  - *Verificación*: mismo criterio que `markNotified` del webhook de MP
- [x] **3.9** Respuesta HTML reusando el molde de `unsubscribe.js` (RNF-6)
- [~] **3.10** Página intermedia de confirmación — **NO**: Mariano eligió entrega directa

---

## Fase 4 — Persistencia y routing

- [x] **4.1** `markDigitalDelivered(orderId, info)` en `lib/orderStore.js`
  - *Verificación*: nunca lanza, igual que el resto del módulo
- [x] **4.2** Redirect en `netlify.toml`
  - ⚠️ **antes** del fallback SPA `/*`
- [x] **4.3** Documentar `DIGITAL_DELIVERY_SECRET` en `.env.example`

---

## Fase 5 — Espejo de precios

Esta feature **no toca precios**. Solo hay que probarlo.

- [x] **5.1** `git diff --stat -- netlify/functions/lib/pricing.js` vacío
- [x] **5.2** `git diff --stat -- frontend/src/config/` vacío

---

## Fase 6 — Tests

⚠️ Primer archivo de tests de una Netlify Function en el repo.

- [x] **6.1** Crear `frontend/src/lib/entregaDigital.test.js`
- [x] **6.2** T-1 a T-3 — token determinista, cruzado y malformado
- [x] **6.3** T-4 y T-5 — `digitalDeliveries` / `needsManualDelivery` sin env var
- [x] **6.4** T-6 — pedido sin líneas digitales
- [x] **6.5** T-7 — el asunto marca el pedido digital pendiente
- [x] **6.6** Suite completa
  ```bash
  npm test --prefix frontend
  ```
  - *Verificación*: 109 anteriores + los nuevos, en verde

---

## Fase 7 — Verificación manual

⚠️ Se verificó **sin desplegar**, interceptando la llamada a Resend para capturar
el mail que se habría enviado, y ejercitando el handler con Blobs y Resend
mockeados. Lo que **no** se pudo verificar así queda marcado abajo.

- [x] **7.1** Pedido digital por transferencia → asunto marcado
  - *Resultado*: `📩 ENTREGAR AL CONFIRMAR · 🛒 Nuevo pedido EPI-… — Ana Pérez — $ 5.999`
- [ ] **7.2** Click al botón **desde el celular** (RNF-6) — **NO VERIFICADO**
  - Requiere el deploy y un mail real. La página reusa el molde responsive de
    `unsubscribe.js`, pero eso no reemplaza probarlo.
- [~] **7.3** El cliente recibe el mail **con** el link — *verificado a nivel de
      contenido*, no de recepción real: el HTML capturado incluye el botón
      "Descargar" y el link de Drive. **Falta** confirmar la recepción real.
- [x] **7.4** Repetir el click (RF-5) — test del endpoint: 2 llamadas, 2 envíos
- [x] **7.5** Sin `DIGITAL_LINK_…`: 409 y **cero mails** (RF-7) — test AC-11
- [x] **7.6** Token alterado / ausente / de otro pedido: 400 sin pistas
  - *Resultado*: la respuesta de "pedido inexistente" es **idéntica** a la de
    "firma inválida" (AC-8)
- [x] **7.7** **Regresión**: pedido físico por transferencia → asunto sin prefijo
      y sin bloque de entrega
- [x] **7.8** **Regresión**: digital por MP sin link → sigue con
      `📩 ENVIAR ARCHIVO ·` y el aviso rojo de siempre

---

## Fase 8 — Documentación

- [x] **8.1** `docs/integrations.md` — `DIGITAL_DELIVERY_SECRET` en el inventario
- [x] **8.2** `docs/business-rules.md` §1 — la regla de entrega tras confirmar
- [x] **8.3** `docs/architecture.md` — la ruta `/api/entregar-digital` en el mapa
      y §9 (ya no es cierto que no haya tests de Functions)
- [x] **8.4** `docs/AUTOMATIZACIONES.md` — entrada nueva en §1 y §2.5

---

## Fase 9 — Cierre

- [x] **9.1** Recorrer `acceptance.md` punto por punto con resultados reales
- [x] **9.2** Reportar hallazgos fuera de scope
- [x] **9.3** Commit + push (⚠️ **push a `main` = deploy a producción**)
- [x] **9.4** Marcar la spec como `DONE`
- [x] **9.5** Pedidos digitales por transferencia anteriores: **no hubo ninguno**
      (confirmado por Mariano) — nada que reparar hacia atrás

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| El aviso interno de un pedido digital por **Mercado Pago pendiente** (`in_process`) tampoco lleva marca: solo se marca `approved` (viejo) o transferencia pendiente (nuevo). Es un caso raro —MP suele aprobar o rechazar al instante— pero existe. | `lib/notify.js` | Spec aparte si aparece en la práctica. |
| El endpoint no registra la entrega en el CRM ni en Notion. `notifyCrm` ya existe pero no hay un evento de "entregado" definido del lado del CRM. | `entregar-digital.js` | Anotado en `design.md` §11. |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 11/08/2026 | **Sin pantalla de confirmación** (tarea 3.10 descartada). | Decisión de Mariano: entrega directa. |
| 11/08/2026 | Se trabajó y commiteó sobre `main`, sin rama. | Flujo establecido del proyecto (igual que la spec 001). |
| 11/08/2026 | Los tests del **endpoint** se sumaron sobre lo planeado: el diseño preveía solo funciones puras, pero mockeando `orderStore` y `notify` se pudo cubrir AC-11 —el criterio que yo mismo marqué como más importante— sin desplegar. | Cubrir "no mandar un mail sin link" con un test valía más que dejarlo solo en verificación manual. |
| 11/08/2026 | Se agregó `tieneArchivosDigitales()` a `lib/digital.js`. | `notify.js` necesitaba el predicado y duplicarlo habría desincronizado la regla. |
