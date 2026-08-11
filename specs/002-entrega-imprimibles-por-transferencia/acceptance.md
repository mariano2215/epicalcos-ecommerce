# Acceptance — Entrega de archivos imprimibles pagados por transferencia

| | |
|---|---|
| **Spec** | `002-entrega-imprimibles-por-transferencia` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente |

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
| **AC-1** *(RF-1)* | El asunto del aviso interno distingue este pedido de uno común | bandeja de entrada | ⬜ |
| **AC-2** *(RF-1)* | Se distingue también del caso "MP aprobado sin link" | comparar los dos asuntos | ⬜ |
| **AC-3** *(RF-2)* | El aviso interno trae la acción de entrega a un click | abrir el mail | ⬜ |
| **AC-4** *(RF-3)* | Al ejecutarla, el cliente recibe el mail **con el botón de descarga** | casilla del cliente de prueba | ⬜ |
| **AC-5** *(RF-3)* | Ese link abre el archivo | click desde el mail del cliente | ⬜ |
| **AC-6** *(RF-4)* | Con el token alterado en un carácter, se rechaza | editar la URL | ⬜ |
| **AC-7** *(RF-4)* | Sin token, se rechaza | quitar `&t=` | ⬜ |
| **AC-8** *(RF-4)* | El rechazo **no** revela si el pedido existe | comparar mensajes de pedido real vs. inventado | ⬜ |
| **AC-9** *(RF-5)* | Ejecutarla dos veces no rompe nada | doble click | ⬜ |
| **AC-10** *(RF-6)* | El pedido queda marcado como entregado | leer el blob | ⬜ |
| **AC-11** *(RF-7)* | **Sin `DIGITAL_LINK_…`: avisa y NO manda mail** | borrar la var y probar | ⬜ |
| **AC-12** *(RF-8)* | El mail inicial al cliente **no** trae el link | mail recibido al comprar | ⬜ |
| **AC-13** *(RF-9)* | La lógica no nombra `pack-stickers`: sirve para cualquier `digital:` | lectura del código | ⬜ |
| **AC-14** | Un pedido **sin** líneas digitales no dispara entrega | probar con un pedido de calcos | ⬜ |

> **AC-11 es el criterio más importante.** Un mail "acá está tu archivo" sin link
> es peor que no mandar nada: le dice al cliente que ya está resuelto cuando no
> lo está, y hace que deje de reclamarlo.

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| **ANF-1** *(RNF-1)* | Sin `DIGITAL_DELIVERY_SECRET`, el endpoint no hace nada | borrar la var | ⬜ |
| **ANF-2** *(RNF-2)* | El checkout y la creación de pedidos siguen intactos | compra de prueba completa | ⬜ |
| **ANF-3** *(RNF-3)* | La URL no lleva mail ni datos del cliente | mirar la URL | ⬜ |
| **ANF-4** *(RNF-4)* | Sin configurar, se comporta como hoy (entrega manual) | probar sin las vars | ⬜ |
| **ANF-5** *(RNF-5)* | Sin dependencias nuevas | `git diff package.json` | ⬜ |
| **ANF-6** *(RNF-6)* | La acción funciona desde el celular | probar en el teléfono | ⬜ |
| **ANF-7** *(RNF-7)* | `pricing.js` y `config/` sin tocar | `git diff --stat` | ⬜ |
| **ANF-8** | El token no aparece en ningún log | revisar los logs de la Function | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Link de descarga sin configurar | avisa, no manda mail | ⬜ |
| Doble ejecución | reenvía, sin duplicar el pedido | ⬜ |
| Pedido inexistente | error genérico | ⬜ |
| Pedido sin líneas digitales | no hace nada, lo dice | ⬜ |
| Pedido de MP ya entregado | no rompe nada | ⬜ |
| Pedido ausente en Blobs | error claro; la entrega manual sigue siendo posible | ⬜ |
| URL sin firma | rechazo sin pistas | ⬜ |
| Pedido mixto (digital + físico) | entrega el archivo; el físico sigue su curso | ⬜ |
| Resend caído | error reintentable, **sin** marcar entregado | ⬜ |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| **REG-1** | Los 109 tests existentes siguen pasando sin modificarse | ⬜ |
| **REG-2** | Un pedido **físico por transferencia** manda los mismos mails que antes | ⬜ |
| **REG-3** | Un pedido **digital por Mercado Pago** se sigue entregando solo | ⬜ |
| **REG-4** | Un pedido **físico por Mercado Pago** no cambió en nada | ⬜ |
| **REG-5** | El mail de lead y el de carrito abandonado no cambiaron | ⬜ |
| **REG-6** | El asunto de un pedido común sigue siendo el de siempre | ⬜ |
| **REG-7** | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| **REG-8** | El CRM y Notion siguen recibiendo los pedidos igual | ⬜ |

> **REG-2 a REG-6 son el riesgo real de esta spec**: `notify.js` arma **todos**
> los mails del sistema. El cambio tiene que quedar contenido en el camino
> digital.

---

## 5. Analytics

⏭️ **No aplica.** Esta feature es una herramienta interna: no ocurre en el
navegador del cliente y no toca el funnel (ver `requirements.md` §11).

- [ ] Verificar que **no** se agregó ningún evento

---

## 6. ⚠️ Paridad de precios

⏭️ **No aplica.** Esta spec no toca ninguna regla de precio.

- [ ] `netlify/functions/lib/pricing.js` sin tocar
- [ ] `frontend/src/config/` sin tocar
- [ ] `promoPricing.test.js`, `envio.test.js` y `precioPersonalizados.test.js` en verde

---

## Definition of Done

### Prerrequisitos de Mariano
- [ ] `DIGITAL_LINK_PACK_STICKERS` cargada en Netlify
- [ ] `DIGITAL_DELIVERY_SECRET` generada y cargada
- [ ] `IMPRIMIBLES[0].disenos` con el número real

> Sin los dos primeros la feature **no sirve** aunque el código esté bien. El
> tercero es independiente y solo afecta la card.

### Código
- [ ] AC-1 a AC-14 en ✅
- [ ] ANF-1 a ANF-8 en ✅
- [ ] Todos los edge cases de §3 en ✅
- [ ] REG-1 a REG-8 en ✅
- [ ] `npm test --prefix frontend` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope
- [ ] `digitalDeliveryHtml/Text` sin tocar
- [ ] El camino de Mercado Pago sin tocar

### Seguridad
- [ ] Firma comparada en tiempo constante
- [ ] Mensajes genéricos ante firma/pedido inválidos
- [ ] Sin PII en la URL
- [ ] Sin secretos en logs

### Documentación
- [ ] `docs/integrations.md` con la variable nueva
- [ ] `docs/business-rules.md` con la regla de entrega tras confirmar
- [ ] `docs/architecture.md` con la ruta nueva y §9 actualizado
- [ ] `docs/AUTOMATIZACIONES.md` actualizado

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope anotados
- [ ] Este documento recorrido con resultados reales
- [ ] Estado de la spec en `DONE`
- [ ] Revisados los pedidos digitales por transferencia anteriores, si los hubo

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
