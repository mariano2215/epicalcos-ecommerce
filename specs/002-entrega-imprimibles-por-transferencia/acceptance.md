# Acceptance — Entrega de archivos imprimibles pagados por transferencia

| | |
|---|---|
| **Spec** | `002-entrega-imprimibles-por-transferencia` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 11/08/2026 |
| **Resultado** | ✅ **aceptada**, con 3 puntos pendientes de deploy |

> **Este documento determina cuándo la feature está terminada.**

---

## Cómo se valida

Recorrer punto por punto y reportar el resultado **real**.
✅ cumple (verificado) · ❌ no cumple (con detalle) · ⏭️ no aplica (con motivo).

**No se marca ✅ nada que no se haya verificado.**

### Escenario de referencia

Pedido de prueba: **1 × Pack de stickers imprimibles ($5.999)**, pagado por
**transferencia bancaria**, con `DIGITAL_LINK_PACK_STICKERS` y
`DIGITAL_DELIVERY_SECRET` cargadas.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **AC-1** *(RF-1)* | El asunto del aviso interno distingue este pedido de uno común | bandeja de entrada | ✅ `📩 ENTREGAR AL CONFIRMAR ·` (mail capturado) |
| **AC-2** *(RF-1)* | Se distingue también del caso "MP aprobado sin link" | comparar los dos asuntos | ✅ el de MP sin link sigue siendo `📩 ENVIAR ARCHIVO ·` |
| **AC-3** *(RF-2)* | El aviso interno trae la acción de entrega a un click | abrir el mail | ✅ botón "Enviarle los archivos ahora" en HTML y URL en texto plano |
| **AC-4** *(RF-3)* | Al ejecutarla, el cliente recibe el mail **con el botón de descarga** | casilla del cliente de prueba | ~ HTML capturado con el botón de descarga; **falta** confirmar recepción real |
| **AC-5** *(RF-3)* | Ese link abre el archivo | click desde el mail del cliente | ⏭️ requiere el archivo subido (P-1) |
| **AC-6** *(RF-4)* | Con el token alterado en un carácter, se rechaza | editar la URL | ✅ 400, mensaje genérico |
| **AC-7** *(RF-4)* | Sin token, se rechaza | quitar `&t=` | ✅ 400, mensaje genérico |
| **AC-8** *(RF-4)* | El rechazo **no** revela si el pedido existe | comparar mensajes de pedido real vs. inventado | ✅ **respuestas byte a byte idénticas** |
| **AC-9** *(RF-5)* | Ejecutarla dos veces no rompe nada | doble click | ✅ test: 2 llamadas → 2 envíos, sin duplicar el pedido |
| **AC-10** *(RF-6)* | El pedido queda marcado como entregado | leer el blob | ✅ test: `markDigitalDelivered` con el mail del cliente |
| **AC-11** *(RF-7)* | **Sin `DIGITAL_LINK_…`: avisa y NO manda mail** | borrar la var y probar | ✅ **test dedicado: 409 y `sendCustomerEmail` NO se llama** |
| **AC-12** *(RF-8)* | El mail inicial al cliente **no** trae el link | mail recibido al comprar | ✅ el mail inicial dice "apenas confirmemos tu transferencia", sin link |
| **AC-13** *(RF-9)* | La lógica no nombra `pack-stickers`: sirve para cualquier `digital:` | lectura del código | ✅ T-7: `digital:pack-navidad` → `DIGITAL_LINK_PACK_NAVIDAD` |
| **AC-14** | Un pedido **sin** líneas digitales no dispara entrega | probar con un pedido de calcos | ✅ test: 400 y ningún mail |

> **AC-11 es el criterio más importante.** Un mail "acá está tu archivo" sin link
> es peor que no mandar nada: le dice al cliente que ya está resuelto cuando no
> lo está, y hace que deje de reclamarlo.

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | Sin `DIGITAL_DELIVERY_SECRET`, el endpoint no hace nada | borrar la var | ✅ sin el secreto: 400 y el botón no aparece en el mail |
| **ANF-2** *(RNF-2)* | El checkout y la creación de pedidos siguen intactos | compra de prueba completa | ✅ no se tocó ningún camino de creación de pedidos |
| **ANF-3** *(RNF-3)* | La URL no lleva mail ni datos del cliente | mirar la URL | ✅ test: la URL no contiene `@` ni "mail" |
| **ANF-4** *(RNF-4)* | Sin configurar, se comporta como hoy (entrega manual) | probar sin las vars | ✅ sin las vars: asunto marcado + entrega manual, como antes |
| **ANF-5** *(RNF-5)* | Sin dependencias nuevas | `git diff package.json` | ✅ `package.json` sin cambios (solo `node:crypto`) |
| **ANF-6** *(RNF-6)* | La acción funciona desde el celular | probar en el teléfono | ⏭️ **NO VERIFICADO** — requiere deploy y mail real |
| **ANF-7** *(RNF-7)* | `pricing.js` y `config/` sin tocar | `git diff --stat` | ✅ `pricing.js` intacto; en `config/` solo cambió `disenos` |
| **ANF-8** | El token no aparece en ningún log | revisar los logs de la Function | ✅ los logs registran el rechazo pero nunca el token |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Link de descarga sin configurar | avisa, no manda mail | ✅ 409, cero mails (AC-11) |
| Doble ejecución | reenvía, sin duplicar el pedido | ✅ test RF-5 |
| Pedido inexistente | error genérico | ✅ 400 genérico |
| Pedido sin líneas digitales | no hace nada, lo dice | ✅ 400, sin mail |
| Pedido de MP ya entregado | no rompe nada | ✅ reenvía sin romper |
| Pedido ausente en Blobs | error claro; la entrega manual sigue siendo posible | ✅ 400 genérico (getOrder devuelve null) |
| URL sin firma | rechazo sin pistas | ✅ 400 |
| Pedido mixto (digital + físico) | entrega el archivo; el físico sigue su curso | ✅ T-6b: cuenta como digital |
| Resend caído | error reintentable, **sin** marcar entregado | ✅ test: 502 y **no** se marca entregado |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 109 tests existentes siguen pasando sin modificarse | ✅ 109 → 131, ninguno modificado |
| **REG-2** | Un pedido **físico por transferencia** manda los mismos mails que antes | ✅ asunto sin prefijo, sin bloque de entrega |
| **REG-3** | Un pedido **digital por Mercado Pago** se sigue entregando solo | ✅ `📩 ENVIAR ARCHIVO ·` y aviso rojo intactos |
| **REG-4** | Un pedido **físico por Mercado Pago** no cambió en nada | ✅ sin cambios en ese camino |
| **REG-5** | El mail de lead y el de carrito abandonado no cambiaron | ✅ `sendLeadEmail` / `sendAbandonedCartEmail` sin tocar |
| **REG-6** | El asunto de un pedido común sigue siendo el de siempre | ✅ `🛒 Nuevo pedido EPI-… — Ana Pérez — $ 5.999` |
| **REG-7** | Ningún checkout se rechaza con `price_mismatch` | ✅ suite de precios en verde; `pricing.js` sin tocar |
| **REG-8** | El CRM y Notion siguen recibiendo los pedidos igual | ✅ `_notion.js` y `crmWebhook.js` sin tocar |

> **REG-2 a REG-6 son el riesgo real de esta spec**: `notify.js` arma **todos**
> los mails del sistema. El cambio tiene que quedar contenido en el camino
> digital.

---

## 5. Analytics

⏭️ **No aplica.** Esta feature es una herramienta interna: no ocurre en el
navegador del cliente y no toca el funnel (ver `requirements.md` §11).

- [x] Verificar que **no** se agregó ningún evento

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica.** Esta spec no toca ninguna regla de precio.

- [x] `netlify/functions/lib/pricing.js` sin tocar
- [x] `frontend/src/config/` sin tocar
- [x] `promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` en verde

---

## Definition of Done

### Prerrequisitos de Mariano
- [ ] `DIGITAL_LINK_PACK_STICKERS` cargada en Netlify — **PENDIENTE (P-1)**
- [ ] `DIGITAL_DELIVERY_SECRET` generada y cargada — **PENDIENTE (P-3)**
- [x] `IMPRIMIBLES[0].disenos` con el número real → **7.000** ✅

> Sin los dos primeros la feature **no sirve** aunque el código esté bien. El
> tercero es independiente y solo afecta la card.

### Código
- [~] AC-1 a AC-14: 12 ✅, AC-4 parcial, AC-5 pendiente de P-1
- [~] ANF-1 a ANF-8: 7 ✅, ANF-6 (celular) pendiente de deploy
- [x] Todos los edge cases de §3 en ✅
- [x] REG-1 a REG-8 en ✅
- [x] `npm test --prefix frontend` en verde
- [x] Sin dependencias nuevas
- [x] Sin refactors fuera de scope
- [x] `digitalDeliveryHtml/Text` sin tocar
- [x] El camino de Mercado Pago sin tocar

### Seguridad
- [x] Firma comparada en tiempo constante
- [x] Mensajes genéricos ante firma/pedido inválidos
- [x] Sin PII en la URL
- [x] Sin secretos en logs

### Documentación
- [x] `docs/integrations.md` con la variable nueva
- [x] `docs/business-rules.md` con la regla de entrega tras confirmar
- [x] `docs/architecture.md` con la ruta nueva y §9 actualizado
- [x] `docs/AUTOMATIZACIONES.md` actualizado

### Proceso
- [x] `tasks.md` con todos los pasos marcados
- [x] Hallazgos fuera de scope anotados
- [x] Este documento recorrido con resultados reales
- [x] Estado de la spec en `DONE`
- [x] Revisados los pedidos digitales por transferencia anteriores, si los hubo

---

## Resultado de la validación

**Fecha**: 11/08/2026
**Ejecutada por**: Claude, con autorización explícita de Mariano

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | 41 |
| ❌ No cumple | 0 |
| ~ Parcial | 1 (AC-4) |
| ⏭️ Pendiente de deploy o de P-1 | 2 (AC-5, ANF-6) |

### Cómo se verificó, sin desplegar
1. **131 tests** (109 previos + 22 nuevos), incluidos 6 que ejercitan el handler
   con Blobs y Resend mockeados.
2. **Mails capturados**: se interceptó la llamada a Resend para leer el asunto y
   el HTML que se habrían enviado, en 5 escenarios (digital+transferencia,
   físico+transferencia, digital+MP sin link, y el mail al cliente antes y
   después de tocar el botón).
3. **Link firmado**: se extrajo el `href` del HTML, se des-escapó `&amp;` y se
   validó el token con el secreto correcto (`true`) y con otro (`false`).
4. **Rechazos del endpoint**: 7 variantes de firma inválida, todas 400 con la
   **misma** respuesta.

### Lo que NO se verificó
| ID | Motivo |
|---|---|
| **AC-4** (recepción real del mail) | Se verificó el **contenido** del mail, no que llegue a una casilla. Requiere `RESEND_API_KEY` y un envío real. |
| **AC-5** (el link abre el archivo) | Depende de P-1: el archivo todavía no está subido. |
| **ANF-6** (funciona desde el celular) | Requiere el deploy y un mail real. La página reusa el molde responsive de `unsubscribe.js`, pero eso no reemplaza probarlo. |

**Después del deploy y de cargar las variables, hacer un pedido digital de prueba
por transferencia y tocar el botón desde el celular** cierra los tres.

### Notas
- El número de diseños (**7.000**) es dato de Mariano. La carpeta de origen tiene
  **4.796 archivos**: el número mayor solo cierra si las plantillas A4 traen
  varios diseños por hoja. Se usó el dato de Mariano por ser suyo el criterio
  comercial, pero conviene confirmarlo porque va público en la card.
- Mariano señaló que hace los envíos personalmente y que no se le escapa ningún
  archivo. La feature se implementó igual: el botón le ahorra el trabajo manual
  aunque nunca se olvide, y la marca `digitalDeliveredAt` deja registro.
