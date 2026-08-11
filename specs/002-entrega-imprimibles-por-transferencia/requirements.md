# Requirements — Entrega de archivos imprimibles pagados por transferencia

| | |
|---|---|
| **Spec** | `002-entrega-imprimibles-por-transferencia` |
| **Estado** | `DONE` (11/08/2026) |
| **Fecha** | 11/08/2026 |
| **Autor** | Claude (discovery sobre el camino digital) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 0. Corrección al plan original

En el informe de auditoría propuse esta spec como *"entrega automática de
imprimibles: cargar el link y el número de diseños"*. **El discovery mostró que
eso estaba mal planteado.**

La entrega automática **ya está construida y funciona**: el mail al cliente
incluye el botón de descarga, y si falta el link el aviso interno llega con el
asunto `📩 ENVIAR ARCHIVO ·`. No hay nada que programar ahí.

Lo que falta es **configuración, no código** — y por la regla 2 de `CLAUDE.md`
eso no necesita spec:

| Pendiente | Quién | Es spec |
|---|---|---|
| Subir el archivo y cargar `DIGITAL_LINK_PACK_STICKERS` en Netlify | Mariano | ❌ config |
| Poner el número real en `IMPRIMIBLES[0].disenos` (hoy `null`) | Mariano da el dato | ❌ valor configurable |

Pero el discovery destapó **un agujero real** que sí necesita spec, y que la
configuración por sí sola no arregla. Es de lo que trata este documento.

---

## 1. Problema

**Un cliente que compra el pack digital por transferencia bancaria puede no
recibir nunca su archivo.**

El camino de Mercado Pago está cerrado: cuando el pago se aprueba, el webhook
manda el mail con el botón de descarga. Pero la transferencia **no tiene
webhook** — el cliente transfiere por su cuenta y manda el comprobante por
WhatsApp, y Mariano lo confirma a mano.

Lo que pasa hoy, paso por paso:

1. El cliente compra el pack y elige transferencia.
2. Recibe un mail que dice: *"Te los mandamos a este mismo mail apenas
   confirmemos tu transferencia"*.
3. Mariano recibe el aviso interno del pedido… **sin ninguna marca** de que hay
   un archivo digital para entregar. El prefijo `📩 ENVIAR ARCHIVO ·` está
   condicionado a `paymentStatus === 'approved'`, y una transferencia pendiente
   nunca lo está.
4. Mariano confirma el pago por WhatsApp.
5. **No se dispara nada.** No hay segundo mail, ni recordatorio, ni mecanismo.

El archivo llega **solo si Mariano se acuerda** y lo manda a mano.

### Por qué importa más que un envío olvidado

Un pedido físico olvidado se nota: queda una caja sin despachar. Un archivo
digital olvidado **no deja rastro** — no hay producción, no hay logística, no
hay nada que sobre en el taller. El único que sabe que falta es el cliente que
lo está esperando.

Y es el producto con la promesa de entrega más rápida de toda la tienda: quien
compra un archivo lo quiere **ahora**, no en dos días.

### Alcance del agujero

No es del pack de stickers: es de **todo producto `digital:`** comprado por
transferencia. Hoy hay uno solo, pero la sección está pensada para crecer.

---

## 2. Objetivo

Que ningún cliente que pagó su archivo se quede sin recibirlo, sin depender de
que alguien se acuerde.

**Cómo se sabrá que funcionó**: cuando Mariano confirma una transferencia de un
pedido digital, mandar el archivo es **una acción visible y de un solo paso** —
y si no la hace, el pedido sigue marcado como pendiente de entrega en vez de
desaparecer entre los mails.

---

## 3. Scope

- [ ] El aviso interno de un pedido **digital por transferencia** se distingue a
      simple vista de uno común, desde el asunto
- [ ] Desde ese mismo aviso, mandar el archivo al cliente es **una sola acción**
- [ ] Esa acción manda al cliente el mail con el link de descarga
- [ ] La acción es segura: nadie que no tenga el mail puede dispararla
- [ ] Se puede repetir sin romper nada (el cliente perdió el mail, rebotó, etc.)
- [ ] El archivo **nunca** se entrega antes de que el pago esté confirmado

---

## 4. Fuera de scope

- [ ] **Cargar `DIGITAL_LINK_PACK_STICKERS` y `disenos`.** Es configuración de
      Mariano (ver §0). Esta spec asume que van a estar cargados, y funciona
      igual si no lo están.
- [ ] **Confirmar transferencias automáticamente.** No hay integración bancaria
      y no es lo que se está resolviendo acá.
- [ ] **Entrega automática al confirmar en el CRM.** Sería lo ideal, pero
      depende del repo `epicalcos-app` y de un webhook entrante que hoy no
      existe. Ver §12.
- [ ] Cambiar el precio, el nombre o las reglas del producto digital.
- [ ] Tocar el camino de Mercado Pago, que ya funciona.
- [ ] Hospedar el archivo dentro del repo o servirlo desde el sitio.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| **Cliente que paga el pack digital por transferencia** | Es quien sufre el problema: pagó y puede quedarse sin el archivo. |
| **Mariano** | Hoy carga con recordarlo de memoria. Pasa a tener el pedido marcado y la entrega a un click. |
| Cliente que paga con Mercado Pago | **No afectado**: su camino ya funciona. |
| Sistemas externos (MP, Notion, CRM, Meta) | **No afectados**. |

---

## 6. User stories

- **US-1** — Como cliente que pagó su archivo por transferencia, quiero
  recibirlo apenas se confirme el pago, para no tener que reclamarlo.

- **US-2** — Como Mariano, quiero que el aviso de un pedido digital por
  transferencia se distinga de los demás, para no enterarme de que faltaba
  entregarlo cuando el cliente escribe.

- **US-3** — Como Mariano, quiero mandar el archivo desde el mail que ya estoy
  leyendo, sin abrir el panel ni escribir un mail a mano.

- **US-4** — Como Mariano, quiero poder reenviarlo si el cliente dice que no le
  llegó, sin depender de mí buscando el link en Drive.

- **US-5** — Como Mariano, quiero estar seguro de que nadie puede dispararle la
  entrega a un pedido impago.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| **RF-1** | El aviso interno de un pedido con línea `digital:` **pendiente de transferencia** se distingue desde el asunto | 🔴 must |
| **RF-2** | Ese aviso incluye una acción de un solo paso para entregarle el archivo al cliente | 🔴 must |
| **RF-3** | Al ejecutarla, el cliente recibe el mail con el link de descarga | 🔴 must |
| **RF-4** | La acción está protegida: no se puede disparar sin el dato secreto que viaja en el mail interno | 🔴 must |
| **RF-5** | Se puede ejecutar más de una vez sin efectos raros (reenvío) | 🟡 should |
| **RF-6** | El pedido queda registrado como entregado, para saber cuáles faltan | 🟡 should |
| **RF-7** | Si el link de descarga no está configurado, la acción **avisa** en vez de mandarle al cliente un mail sin link | 🔴 must |
| **RF-8** | El mail al cliente por transferencia **no** muestra el link de descarga hasta que se confirme el pago | 🔴 must |
| **RF-9** | Vale para cualquier producto `digital:` futuro, no solo el pack de stickers | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| **RNF-1** | **Seguridad** | la acción exige una firma; sin ella no hace nada |
| **RNF-2** | **No bloquea la venta** | si algo de esto falla, el checkout y el pedido siguen intactos |
| **RNF-3** | **Sin PII en la URL** | el identificador que viaje no puede exponer datos del cliente |
| **RNF-4** | **Degradación segura** | sin configurar, el sistema se comporta como hoy (entrega manual), no peor |
| **RNF-5** | **Sin dependencias nuevas** | ninguna |
| **RNF-6** | **Mobile** | Mariano confirma transferencias desde el celular: la acción tiene que funcionar ahí |
| **RNF-7** | **Sin cambios en el camino de precios** | esta spec no toca `pricing.js` en ningún lado |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| El producto digital se entrega por mail, no se despacha | `business-rules.md` §1 | no |
| Precio fijo, sin descuentos, cantidad 1 | `business-rules.md` §1 | no |
| Un pedido solo-digital no tiene envío | `business-rules.md` §5 | no |
| La transferencia se confirma a mano con el comprobante | `business-rules.md` §6 | no |
| **Nueva**: el archivo se entrega **después** de confirmar el pago, nunca antes | — | **se explicita** |

### Espejo de precios

- [x] **NO** toca `frontend/src/config/pricing.js`
- [x] **NO** toca `netlify/functions/lib/pricing.js`
- [x] **NO** toca `frontend/src/config/site.js`
- [x] **NO** requiere tests de paridad

Esta spec vive **entera** del lado del servidor, en el camino de notificación.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| El link de descarga no está configurado | la acción avisa y no manda un mail sin link (RF-7) |
| Se ejecuta dos veces | el cliente recibe el mail de nuevo, sin duplicar el pedido |
| Se ejecuta sobre un pedido que no existe | error claro, sin filtrar si el pedido existe o no |
| Se ejecuta sobre un pedido **sin** líneas digitales | no hace nada y lo dice |
| Se ejecuta sobre un pedido de Mercado Pago ya entregado | no rompe nada (el cliente ya tenía su mail) |
| El pedido no está en Blobs (fallo de persistencia) | error claro; la entrega manual sigue siendo posible |
| Alguien adivina la URL sin la firma | rechazo, sin pistas sobre qué falló |
| Pedido mixto: archivo digital **+** productos físicos | se entrega el archivo; el pedido físico sigue su curso normal |
| Resend caído | error claro y reintentable, sin marcar el pedido como entregado |

---

## 11. Analytics necesarios

**Ninguno.**

Esta feature es una herramienta interna de operación: no ocurre en el navegador
del cliente, no toca el funnel y no hay nada que optimizar con su dato. Agregar
tracking acá sería ruido.

El `purchase` del pedido ya se dispara en `/pago-transferencia` (ver
`docs/analytics.md` §3.2) y **no cambia**.

---

## 12. Preguntas abiertas

- [x] ✅ **¿Entrega directa o con confirmación intermedia?** — **DIRECTA**
      (Mariano, 11/08/2026). Implementado así. Riesgo asumido: un pre-fetcher del
      cliente de mail podría dispararla; el peor caso es que el cliente reciba su
      descarga antes de tiempo o repetida, y solo se le manda a quien ya compró.

- [x] ✅ **¿Hubo pedidos digitales por transferencia hasta hoy?** — **No hubo
      ninguno** (Mariano). No hay nada que reparar hacia atrás.

- [x] ✅ **Nº de diseños del pack** — **7.000** (Mariano). Cargado en
      `IMPRIMIBLES[0].disenos`.
      ⚠️ La carpeta de origen tiene **4.796 archivos**; el número mayor solo
      cierra si las plantillas A4 traen varios diseños por hoja. Se usó el dato
      de Mariano por ser suyo el criterio comercial.

- [ ] **¿Vale la pena la entrega 100 % automática vía CRM?** Cuando Mariano marca
      el pedido como pagado en `app.epicalcos.com`, el CRM podría avisarle al
      sitio y disparar la entrega sin intervención. Hoy el webhook es **de salida
      solamente** (sitio → CRM); esto necesita uno de entrada.
      **Recomendación**: no ahora. Es otra spec, cruza dos repos y el beneficio
      sobre "un click desde el mail" es chico.

- [ ] **¿Cuántos pedidos digitales por transferencia hubo hasta hoy?** No se
      puede saber desde el repo. Si hubo alguno, conviene revisar que haya
      recibido su archivo. `UNKNOWN / REQUIRES CONFIRMATION`

- [ ] **¿Querés además un aviso si un pedido digital lleva N días sin
      entregarse?** Sería una red de seguridad sobre RF-6. Se puede sumar después
      sin rehacer nada.
