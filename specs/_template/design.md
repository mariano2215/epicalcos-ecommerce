# Design — [NOMBRE DE LA FEATURE]

| | |
|---|---|
| **Spec** | `NNN-nombre-corto` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | DD/MM/AAAA |

> **Este documento define CÓMO se implementará.**
> Acá sí van rutas de archivo, nombres de función y formas de payload.

---

## 0. Hallazgos del discovery

Qué se encontró al leer el código **antes** de diseñar. Esta sección se llena
primero.

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | |
| ¿Qué archivos están involucrados? | |
| ¿Hay tests que lo cubran hoy? | |
| ¿Toca el camino de precios? | |
| ¿Hay comentarios en el código que expliquen por qué está así? | |

> Los comentarios de este repo suelen documentar un error ya cometido. Si vas a
> cambiar algo que tiene un comentario explicando por qué es así, **decí acá por
> qué esa razón ya no aplica**.

---

## 1. Arquitectura propuesta

Cómo encaja en lo que ya existe. Un diagrama de flujo si aclara.

```
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|

---

## 2. Componentes afectados

### Archivos que se modifican
| Archivo | Cambio | Riesgo |
|---|---|---|
| | | 🔴/🟡/🟢 |

### Archivos nuevos
| Archivo | Responsabilidad |
|---|---|

### ⚠️ Módulos compartidos

`CLAUDE.md` regla 9: **no se modifican sin analizar dependencias.**

Si esta feature toca alguno de estos, completar la tabla:

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | | |
| `frontend/src/config/site.js` | | |
| `frontend/src/context/CartContext.jsx` | | |
| `netlify/functions/lib/pricing.js` | | |
| `frontend/src/lib/analytics.js` | | |

Comando usado para verificar:
```bash
grep -rn "nombreDelModulo" frontend/src netlify/
```

---

## 3. Datos

### Estructuras nuevas o modificadas
```js
```

### Persistencia
| Dónde | Qué | Ref. |
|---|---|---|
| Netlify Blobs (`orders` / `abandoned-carts` / `abandoned-optout`) | | `docs/database.md` §1 |
| `localStorage` / `sessionStorage` | | `docs/database.md` §3 |
| JSON estáticos del catálogo | | `docs/database.md` §2 |

### ⚠️ Compatibilidad con datos existentes
- [ ] ¿Cambia la forma de las líneas del carrito? → los carritos guardados en
      `epicalcos.cart.v2` tienen que seguir funcionando o descartarse
      explícitamente (precedente: `esCustomViejo()` en `CartContext`)
- [ ] ¿Cambia la forma del pedido guardado en Blobs? → los pedidos viejos tienen
      que seguir leyéndose desde el webhook

---

## 4. APIs

### Endpoints afectados
| Endpoint | Method | Cambio |
|---|---|---|
| `/api/create-preference` | POST | |
| `/api/create-order-transfer` | POST | |
| `/api/capture-lead` | POST | |
| `/api/track-cart` | POST | |
| `/api/mercadopago-webhook` | POST | |
| `/api/unsubscribe` | GET/POST | |

### Endpoints nuevos
Si hay uno nuevo, declarar también:
- redirect en `netlify.toml`
- orígenes CORS permitidos
- tope de body y de cada campo de texto
- qué devuelve ante error

### Contratos
```js
// Request

// Response OK

// Response error
```

---

## 5. Integraciones

Qué servicios externos toca. Ver `docs/integrations.md`.

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| Mercado Pago | | |
| Notion | | |
| Resend | | |
| Cloudinary | | |
| Meta (Pixel / CAPI) | | |
| CRM interno | | |

**Regla**: ninguna integración puede bloquear una venta. Toda llamada externa
va con `try/catch`, timeout, y un camino de fallback.

### Variables de entorno nuevas
| Variable | Dónde | ¿Secreto? |
|---|---|---|

⚠️ Las `VITE_*` **se hornean en el bundle y son públicas**. Los secretos van solo
en Netlify y se leen únicamente desde `netlify/functions/**`.

---

## 6. Seguridad

`CLAUDE.md` regla 14.

- [ ] Ningún secreto en el frontend
- [ ] El servidor no confía en ningún valor del cliente (precio, envío, flags):
      todo se deriva del `id` de la línea
- [ ] Payloads con tope de tamaño y campos de texto con tope de longitud
- [ ] Inputs validados en el servidor, no solo en la UI
- [ ] Sin PII en logs, URLs ni `dataLayer`
- [ ] Si hay un endpoint nuevo: CORS restringido a orígenes propios
- [ ] Si recibe webhooks: verificación de firma
- [ ] ¿Afecta la CSP de `netlify.toml`? (hoy Report-Only)

**Riesgos identificados y cómo se mitigan**

| Riesgo | Mitigación |
|---|---|

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Falla de red | | |
| Timeout de un servicio externo | | |
| Precio desactualizado (`price_mismatch`) | | |
| Payload inválido | | |
| Blobs no disponible | | |

**Principios del repo**
- El tracking nunca rompe la compra.
- Las integraciones nunca bloquean el checkout.
- Los mensajes de error son **accionables** para el cliente
  (ej. *"recargá la página"*), y **diagnosticables** en los logs.
- Fallar cerrado cuando el error afecta a un tercero (ej. no mandar un mail si
  no se puede confirmar el opt-out).

---

## 8. Estrategia de migración

Solo si aplica. Si no, escribir *"No aplica: no hay datos ni comportamiento
previo que migrar"*.

- **Datos existentes**:
- **Carritos guardados**:
- **Pedidos ya en Blobs**:
- **Compatibilidad hacia atrás**:
- **Rollback**: cómo se vuelve atrás si sale mal (idealmente: revertir el commit,
  o borrar una env var)
- **Feature flag**: ¿se puede apagar sin redeployar?

---

## 9. Testing

### Tests nuevos
| Archivo | Qué verifica |
|---|---|

### ⚠️ Tests de paridad
Si esta feature toca precios, promos, cupones o envíos, es **obligatorio**
actualizar o agregar:

- [ ] `frontend/src/lib/promoPricing.test.js` — paridad de precios y promos
- [ ] `frontend/src/lib/envio.test.js` — umbrales y costos de envío
- [ ] `frontend/src/lib/precioPersonalizados.test.js` — configurador

### Verificación manual
Lo que no se puede cubrir con tests automáticos:
- [ ]

---

## 10. Dependencias nuevas

`CLAUDE.md` regla 10: **no se agregan librerías innecesariamente.**

| Librería | Versión | Qué resuelve | Peso | Por qué no alcanza código propio |
|---|---|---|---|---|

Si no hay ninguna: *"Ninguna."* ← el caso esperado.

---

## 11. Preguntas abiertas del diseño

- [ ] `UNKNOWN / REQUIRES CONFIRMATION` —
