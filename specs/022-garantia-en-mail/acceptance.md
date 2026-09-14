# Acceptance — Garantía en el mail de confirmación

| | |
|---|---|
| **Spec** | `022-garantia-en-mail` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> **Este documento determina cuándo la feature está terminada.**

Los mails se verifican con `fetch` mockeado (la suite no manda mails reales) y
mirando el HTML armado en el navegador. El envío real a una casilla solo se hace
con el OK de Mariano.

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | Pedido de **solo calcos**: el bloque dice "{dias} días desde que lo recibís para devolverlo", "sin pegar", y no trae la exclusión | Test + HTML armado | ⬜ |
| AC-2 *(RF-2)* | Pedido de **solo un personalizado**: dice la falla y la exclusión, y **no** contiene "devolverlo" ni "devolver las" | Test + HTML armado | ⬜ |
| AC-3 *(RF-3)* | Pedido **mixto**: "devolver las calcos de catálogo" + falla + exclusión | Test | ⬜ |
| AC-4 *(RF-4)* | Pedido con **pack mayorista**: "devolver las calcos de catálogo" + falla, sin exclusión | Test | ⬜ |
| AC-5 *(RF-5)* | Todo pedido con algo físico trae la frase de falla con los días | Test | ⬜ |
| AC-6 *(RF-6)* | Pedido **solo digital**: sin "Tu garantía"; la línea `shipping` no cuenta | Test | ⬜ |
| AC-7 *(RF-7)* | La frase de cómo pedirla trae el número de pedido del mail | Test | ⬜ |
| AC-8 *(RF-8)* | El link apunta a `/politicas/cambios` con `utm_source=email`, `utm_medium=confirmacion`, `utm_campaign=garantia` | Test | ⬜ |
| AC-9 *(RF-9)* | `DEVOLUCIONES_DIAS` del servidor es igual a `devoluciones.dias`, y el test **falla** si se desalinean | Test + mutación | ⬜ |
| AC-10 *(RF-10)* | Cada criterio de AC-1 a AC-8 se cumple en `html` **y** en `text` | Test | ⬜ |
| AC-11 *(RF-11)* | El bloque sale en el mail de pago aprobado y en el de transferencia pendiente (según P-1) | Test | ⬜ |
| AC-12 *(RF-12)* | Con items que harían fallar el bloque, el mail **sale igual** (se llama a `fetch`) | Test | ⬜ |
| AC-13 | Coherencia con el checkout: donde `garantiaDelCarrito` da `falla`, el mail no promete devolución; donde da `devolucion`/`mixto`, sí | Test | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Confiabilidad** — el bloque no agrega llamadas externas; un error adentro no produce `build_failed` | Lectura + test | ⬜ |
| ANF-2 | **Clientes de mail** — estilos inline, igual que el resto del mail | Lectura del HTML | ⬜ |
| ANF-3 | **Mobile** — el HTML armado se lee a 375 px sin scroll horizontal | Navegador | ⬜ |
| ANF-4 | **Sin PII** en el link | Test (la URL es fija salvo la base) | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff frontend/package.json` vacío | ⬜ |
| ANF-6 | **Compatibilidad** — un pedido rearmado desde Mercado Pago (items del pago) arma el bloque igual | Test con `buildOrderView(null, pago)` | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Pedido sin items | Sin bloque; el mail sale | ⬜ |
| Id desconocido | Falla sí, devolución no | ⬜ |
| Digital + físico | Bloque según lo físico, y la descarga como hoy | ⬜ |
| Reenvío desde `entregar-digital` | Mismo mail, mismo bloque | ⬜ |

---

## 4. Regresión

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Todos los tests existentes siguen pasando (incluidos `envioAviso`, `avisoPedido`, `entregaDigital`) | ⬜ |
| REG-2 | El resto del mail al cliente queda igual (estado del pago, descarga, pedido, transferencia, entrega, contactos) | ⬜ |
| REG-3 | El mail interno a EPICALCOS no cambia | ⬜ |
| REG-4 | Ningún checkout se rechaza con `price_mismatch` (sin diff en los espejos de precio) | ⬜ |

---

## 5. Analytics

| Qué | Cómo se verifica | Resultado |
|---|---|---|
| Visitas desde el mail en GA4 con `utm_campaign=garantia` | Después del deploy, con el primer mail real: *Adquisición → Tráfico* | ⬜ (post-deploy) |

---

## 6. Paridad

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | `netlify/functions/lib/garantia.js → DEVOLUCIONES_DIAS` = `frontend/src/config/site.js → devoluciones.dias` | ⬜ |
| PAR-2 | El test de paridad pasa | ⬜ |

Precios: ⏭️ no aplica.

---

## Definition of Done

### Código
- [ ] §1, §2 y §3 en ✅ (o ⚠️ con el motivo)
- [ ] §4 y §6 en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope

### Documentación
- [ ] `docs/NOTIFICACIONES.md` y `docs/analytics.md` actualizados

### Proceso
- [ ] P-1 y P-2 resueltas
- [ ] `tasks.md` completo
- [ ] Hallazgos reportados
- [ ] Este documento recorrido punto por punto
- [ ] Estado `DONE`

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

| | Cantidad |
|---|---|
| ✅ Cumple | |
| ⚠️ Verificado de forma indirecta o parcial | |
| ❌ No cumple | |
| ⏭️ No aplica | |
