# Requirements — [NOMBRE DE LA FEATURE]

| | |
|---|---|
| **Spec** | `NNN-nombre-corto` |
| **Estado** | `DRAFT` |
| **Fecha** | DD/MM/AAAA |
| **Autor** | |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

---

## 1. Problema

Qué está pasando hoy que no debería, o qué falta.

Describir la situación **actual y observable**, no la solución. Si hay un dato
que lo respalde (una métrica, un mensaje de un cliente, un log), va acá.

> Ejemplo: *"Durante la promo por categoría, el cliente ve $800 en la grilla,
> $1.600 en el carrito y $800 en el checkout. El carrito contradice a las otras
> dos pantallas justo en el paso previo a la compra."*

---

## 2. Objetivo

Qué tiene que ser verdad cuando esto esté terminado. Una o dos frases.

**Cómo se sabrá que funcionó** — la señal concreta que lo confirma.

---

## 3. Scope

Lo que **sí** entra:

- [ ]
- [ ]

---

## 4. Fuera de scope

Lo que **no** entra, aunque esté cerca y sea tentador.

Ser explícito acá es lo que protege de los refactors de oportunidad
(`CLAUDE.md` regla 8).

- [ ]
- [ ]

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra | |
| Cliente que vuelve (carrito guardado) | |
| Mariano (operación) | |
| Sistemas externos (CRM, Meta, MP) | |

Marcar los que no apliquen como *no afectado*.

---

## 6. User stories

```
Como [rol]
quiero [acción]
para [beneficio]
```

- **US-1** —
- **US-2** —

---

## 7. Requisitos funcionales

Numerados, verificables, uno por línea. Cada uno tiene que poder responderse con
sí o no.

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | | 🔴 must |
| RF-2 | | 🟡 should |
| RF-3 | | 🟢 could |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | funciona a 375 px sin scroll horizontal |
| RNF-2 | **Performance** | no agrega scripts bloqueantes; no empeora el LCP del Home |
| RNF-3 | **Accesibilidad** | `aria-label` en controles sin texto propio, targets de 44 px, foco visible |
| RNF-4 | **Compatibilidad** | los carritos ya guardados en `localStorage` siguen funcionando |
| RNF-5 | **Seguridad** | ningún secreto en el bundle; el servidor no confía en el cliente |
| RNF-6 | **Sin dependencias nuevas** | o justificar en `design.md` |

Agregar / quitar según la feature.

---

## 9. Reglas de negocio

Las reglas que esta feature **respeta** o **modifica**.

Referenciar `docs/business-rules.md` por sección en vez de reescribirlas.

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| | `business-rules.md` §X | no |

⚠️ **Si esta feature toca precios, promos, cupones o envíos**, marcar acá:

- [ ] Requiere cambio espejado en `frontend/src/config/pricing.js` **y**
      `netlify/functions/lib/pricing.js`
- [ ] Requiere cambio espejado en `frontend/src/config/site.js` **y** el bloque
      de envío del servidor
- [ ] Requiere test de paridad nuevo o actualizado

Ver `CLAUDE.md` regla 11 y `docs/business-rules.md` §8.

---

## 10. Edge cases

Qué pasa cuando las cosas no vienen como se espera.

| Caso | Comportamiento esperado |
|---|---|
| Carrito vacío | |
| Carrito guardado con formato viejo | |
| La promo vence mientras el cliente está comprando | |
| El cliente vuelve de Mercado Pago y refresca | |
| Falla una integración externa (Notion, Resend, Blobs, Cloudinary) | |
| Sin conexión / navegador embebido de Instagram | |
| Cantidad máxima (1.000/línea, 130 líneas) | |

Borrar los que no apliquen y agregar los propios.

---

## 11. Analytics necesarios

`CLAUDE.md` regla 13: toda acción comercial relevante se mide.

### Eventos nuevos
| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| | | | GA4 / Meta / ambos |

### Eventos existentes que cambian
| Evento | Qué cambia | Por qué |
|---|---|---|

### Qué se quiere poder responder con estos datos
-

**Recordatorios**
- Todo sale por `frontend/src/lib/analytics.js`. Nunca `gtag`/`fbq`/`dataLayer`
  directo desde un componente.
- El tracking va en `try/catch` — nunca puede romper la compra.
- **Nunca PII** en el `dataLayer`.
- Ver `docs/analytics.md`.

---

## 12. Preguntas abiertas

Todo lo que no se pueda determinar desde el repo:

- [ ] `UNKNOWN / REQUIRES CONFIRMATION` —
