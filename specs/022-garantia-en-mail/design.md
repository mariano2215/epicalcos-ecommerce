# Design — Garantía en el mail de confirmación

| | |
|---|---|
| **Spec** | `022-garantia-en-mail` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 14/09/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Dónde se arma el mail? | `netlify/functions/lib/notify.js`: `buildCustomerEmailHtml(o)` (l. 481) y `buildCustomerEmailText(o)` (l. 578), llamados por `sendCustomerEmail(o)` (l. 789). |
| ¿Quién lo manda? | Tres caminos, el mismo mail: `mercadopago-webhook.js:183` (pago aprobado), `create-order-transfer.js:129` vía `notifyOrder` (transferencia pendiente, **su único mail**) y `entregar-digital.js:130` (reenvío con los archivos imprimibles). |
| ¿Qué sabe el servidor de cada línea? | **Solo el id**, el título, la cantidad y el precio: `validateAndPriceOrder` (`lib/pricing.js`) devuelve `{ id, title, quantity, unit_price, currency_id }`. Sin `type` ni `meta`. Con Blobs caído, `buildOrderView` rearma los items desde `payment.additional_info.items`, con los mismos ids. |
| ¿Alcanza el id para clasificar? | Casi. El prefijo dice el tipo: `sticker:`, `custom:`, `negocio:`, `fixed:`, `digital:`, `pack:{mayorista|mayorista100|personalizados}:`, más `shipping`. **Lo que no dice** es si un pack mayorista trae calcos con archivo del cliente: `meta.customCount` vive en el carrito y no viaja. El detalle del pack va como texto libre en `shipping.comments` (`buildDesignSummary`), recortado y mezclado con lo que escribió el cliente: no sirve para decidir nada. |
| ¿El servidor importa código del frontend? | **No**, en ningún archivo de `netlify/functions`. Todo lo compartido está **espejado** (`CONTACT`, `BANK_TRANSFER` y el cronograma de entrega en `notify.js`; precios en `lib/pricing.js`). Los tests sí importan de los dos lados (`promoPricing.test.js`). |
| Comentarios que importan | `notify.js:9-14` — *los mails de pedido son el único registro de una venta con Blobs caído; se llaman antes que cualquier otra integración.* Y `sendCustomerEmail`: si el armado lanza, **el cliente no recibe nada** (`build_failed`), porque un mail roto es peor que ninguno. **Consecuencia para el diseño**: un error en el bloque nuevo no puede propagarse al armado. |
| ¿Hay tests? | `envioAviso.test.js` llama a `sendCustomerEmail` con `fetch` mockeado y lee `html`/`text` del payload (patrón a seguir). `avisoPedido.test.js` cubre `buildOrderView`. `entregaDigital.test.js` cubre el reenvío. |
| ¿Toca precios? | **No.** |

---

## 1. Arquitectura propuesta

```
netlify/functions/lib/garantia.js (NUEVO, puro)
  DEVOLUCIONES_DIAS = 30         ← espejo de frontend/src/config/site.js → devoluciones.dias
  garantiaDelPedido(items) → { catalogo, archivo, packMayorista, fisico }
        │
        ▼
netlify/functions/lib/notify.js
  garantiaHtml(o) / garantiaText(o)   (nuevos, junto a digitalDeliveryHtml/Text)
    → '' si no hay nada físico, o si algo falla (try/catch propio)
  buildCustomerEmailHtml / Text: insertan el bloque después de "Entrega" y
  antes de "¿Dudas o cambios?"
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Frases **acotadas** (*"las calcos de catálogo"*, *"lo hecho con tu archivo"*) que son ciertas sin saber la composición del pack | Hacer viajar `customCount` del checkout al servidor | Obliga a tocar el payload del checkout, `create-preference`, `create-order-transfer` y `validateAndPriceOrder` (`lib/pricing.js`, el módulo más delicado del repo) para decidir **un texto**. Las frases acotadas llegan al mismo lugar sin tocar nada del camino de compra. |
| No usar los tres tipos del checkout (`devolucion` / `mixto` / `falla`) sino tres **flags** | Portar `garantiaDelCarrito` al servidor | El checkout tiene `type` y `meta`; el servidor no. Con flags, cada frase se muestra solo si es cierta, y el pack mayorista no obliga a adivinar. |
| Espejo de `DEVOLUCIONES_DIAS` + test de paridad | Importar `frontend/src/config/site.js` desde la función | Ninguna función importa del frontend hoy; no se inaugura esa dependencia (bundling de Netlify con `base = frontend`) por un número. Mismo patrón que `CONTACT` y `BANK_TRANSFER`. |
| `try/catch` **dentro** de `garantiaHtml`/`garantiaText`, que devuelven `''` | Dejar que el `try` de `sendCustomerEmail` lo ataje | Ese `try` cancela el mail entero (`build_failed`). Un bug en el bloque de garantía no puede costar la confirmación del pedido. |
| Bloque **después de "Entrega"** y antes de los contactos | Arriba de todo | Arriba van el estado del pago y, si hay, la descarga de los archivos: es lo que el cliente necesita primero. La garantía es para después, y queda pegada al "¿Dudas? Escribinos", que es por donde se pide. |
| Link a la política **con UTM** y `https://epicalcos.com` fijo si falta `process.env.URL` | Sin link | Única forma de medir lectura. Mismo criterio de base que `linkEntrega` (`lib/digital.js`). |

### La clasificación (servidor)

```js
// netlify/functions/lib/garantia.js
export const DEVOLUCIONES_DIAS = 30; // ⚠️ espejo de frontend/src/config/site.js → devoluciones.dias

export function garantiaDelPedido(items) {
  const r = { catalogo: false, archivo: false, packMayorista: false, fisico: false };
  for (const it of Array.isArray(items) ? items : []) {
    const id = String(it?.id || '');
    if (!id || id === 'shipping' || id.startsWith('digital:')) continue;
    r.fisico = true;
    if (id.startsWith('sticker:')) r.catalogo = true;
    else if (/^pack:mayorista(100)?:/.test(id)) { r.catalogo = true; r.packMayorista = true; }
    else if (/^(custom|negocio|fixed):/.test(id) || id.startsWith('pack:personalizados:')) r.archivo = true;
    // cualquier otro id: físico, pero sin devolución por cualquier motivo
  }
  return r;
}
```

### Qué frase sale con qué flag

| Frase | Se muestra si | Texto |
|---|---|---|
| **Devolución** | `catalogo` | 🔄 Tenés **{dias} días desde que lo recibís** para **devolverlo** por el motivo que sea, con las calcos sin pegar. — si además hay `archivo` o `packMayorista`: *"para devolver **las calcos de catálogo**"* |
| **Falla** | `fisico` | 🛠️ Si algo llega con una **falla de fabricación**, te lo reponemos gratis: avisanos con foto o video dentro de los {dias} días. |
| **Exclusión** | `archivo` | Lo hecho con tu archivo (personalizados, Negocio, Polaroid, tatuajes) se repone por falla, pero no entra en la devolución por cualquier motivo: se produce a tu medida. |
| **Cómo pedirla** | `fisico` | Para pedirla, escribinos por WhatsApp o mail con tu número de pedido: **{orderId}**. Condiciones completas: *link* |
| *(nada)* | `!fisico` | — (solo digital, o sin items) |

El link: `${URL || 'https://epicalcos.com'}/politicas/cambios?utm_source=email&utm_medium=confirmacion&utm_campaign=garantia`.

Resultado por pedido:

| Pedido | Devolución | Falla | Exclusión |
|---|---|---|---|
| Solo calcos | *"devolverlo"* | ✅ | — |
| Solo personalizados | — | ✅ | ✅ |
| Calcos + personalizado | *"las calcos de catálogo"* | ✅ | ✅ |
| Pack mayorista (con o sin archivos) | *"las calcos de catálogo"* | ✅ | — |
| Solo digital | — | — | — |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `netlify/functions/lib/notify.js` | `+ garantiaHtml(o)`, `+ garantiaText(o)`; se insertan en `buildCustomerEmailHtml` y `buildCustomerEmailText` | 🟡 arma **todos** los mails de pedido al cliente |
| `docs/NOTIFICACIONES.md` | Contenido del mail al cliente | 🟢 |
| `docs/analytics.md` | La UTM del mail | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `netlify/functions/lib/garantia.js` | `DEVOLUCIONES_DIAS` (espejo) y `garantiaDelPedido` |
| `frontend/src/lib/garantiaMail.test.js` | Clasificación, mail armado, paridad (§9) |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | No | — |
| `frontend/src/config/site.js` | No (el test **lee** `devoluciones.dias`) | — |
| `frontend/src/context/CartContext.jsx` | No | — |
| `netlify/functions/lib/pricing.js` | **No** — decisión explícita de §1 | — |
| `frontend/src/lib/analytics.js` | No | — |
| `netlify/functions/lib/notify.js` *(no está en la tabla de `CLAUDE.md`, pero es de radio grande)* | **Sí** | `mercadopago-webhook.js`, `create-order-transfer.js`, `entregar-digital.js`, `capture-lead.js`, `contacto.js`, `abandoned-cart.js`, `canario-blobs.js` — solo los tres primeros usan el mail al cliente |

```bash
grep -rln "lib/notify.js" netlify/functions
```

---

## 3. Datos

Nada nuevo se guarda. El bloque se deriva de `o.items` y `o.orderId`, que
`buildOrderView` ya arma para todos los caminos (incluido el rearmado desde
Mercado Pago).

### ⚠️ Compatibilidad
- [x] No cambia la forma del pedido en Blobs ni del carrito
- [x] Pedidos viejos: solo se necesita `id` por línea, que tienen todos

---

## 4. APIs

Ningún endpoint cambia. El payload a Resend es el mismo, con más contenido en
`html` y `text`.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Resend | el mail al cliente trae un bloque más | No: sin llamadas nuevas; el bloque no puede hacer fallar el armado (§1) |
| GA4 | visitas con UTM | No |

Sin variables de entorno nuevas (`URL` ya la usa `linkEntrega`).

---

## 6. Seguridad

- [x] Sin secretos
- [x] Sin PII en el link (solo UTM fijas)
- [x] El texto no incluye nada que escriba el cliente salvo lo que el mail ya
      muestra; el número de pedido pasa por `esc()` en el HTML

| Riesgo | Mitigación |
|---|---|
| El mail promete por escrito una devolución que la política no da | Frases acotadas y un test por tipo de pedido: un pedido solo de personalizados no puede decir "devolver" |
| El plazo del mail se desincroniza del sitio | Espejo + test de paridad contra `devoluciones.dias` |
| Un error en el bloque cancela la confirmación | `try/catch` propio → `''`; test con items raros |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| El bloque lanza por un item inesperado | `garantiaHtml`/`garantiaText` devuelven `''` y lo loguean | El mail de siempre, sin el bloque |
| `items` no es una lista | El bloque devuelve `''`; el resto del armado se comporta como hoy | Igual que hoy |
| Sin `process.env.URL` | Base `https://epicalcos.com` | Link correcto |

---

## 8. Estrategia de migración

No aplica: no hay datos que migrar. Los mails ya enviados no se reenvían.
**Rollback**: revertir el commit.

---

## 9. Testing

### Tests nuevos — `frontend/src/lib/garantiaMail.test.js`

| Grupo | Qué verifica |
|---|---|
| **Paridad** | `DEVOLUCIONES_DIAS === devoluciones.dias` |
| **Clasificación** | `sticker` → catálogo · `custom` / `negocio` / `fixed` / `pack:personalizados` → archivo · `pack:mayorista` y `pack:mayorista100` → catálogo + `packMayorista` · `digital` y `shipping` → no cuentan · id desconocido → físico sin catálogo · items no-lista / `null` → todo en `false` |
| **Mail armado** (`sendCustomerEmail` con `fetch` mockeado, como `envioAviso.test.js`) | Solo calcos: *"devolverlo"* y sin exclusión · solo personalizado: **no** contiene "devolverlo" ni "devolver las", sí la falla y la exclusión · mixto: *"las calcos de catálogo"* + exclusión · pack mayorista: *"las calcos de catálogo"*, sin exclusión · solo digital: sin "Tu garantía" · transferencia pendiente: con el bloque *(según P-1)* · el número de pedido en la frase de cómo pedirla · el link con las tres UTM · todo lo anterior **en `html` y en `text`** |
| **Robustez** | Items con entradas `null` o sin id: el mail sale (`fetch` llamado) |
| **Coherencia con el checkout** | Para carritos armados con las líneas del `CartContext`, si `garantiaDelCarrito` (spec 021) da `falla`, el mail no promete devolución; si da `devolucion` o `mixto`, el mail sí |

### Verificación manual
- [ ] Mandar el mail de un pedido de prueba a una casilla propia (Resend) y
      mirarlo en Gmail web y en el celular. ⚠️ Requiere las credenciales de
      Resend: lo hace Mariano, o se hace con su OK explícito.

---

## 10. Dependencias nuevas

Ninguna.

---

## 11. Preguntas abiertas del diseño

Ninguna propia: P-1 y P-2 de `requirements.md` cambian solo si el bloque sale en
el mail de transferencia y si lleva link.
