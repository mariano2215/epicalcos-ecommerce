# Design — Garantía en el checkout

| | |
|---|---|
| **Spec** | `021-garantia-en-checkout` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 14/09/2026 |

> **Este documento define CÓMO se implementará.**

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | La **lista de confianza** de `components/CheckoutForm.jsx:343-360`: 4 ítems en `grid-cols-2`, justo arriba del botón de pagar. Ya varía según el pedido (`isTransfer`, `digitalOnly`), así que un ítem condicional encaja en su patrón. |
| ¿Dónde se ve en mobile? | `routes/Checkout.jsx:393`: `grid lg:grid-cols-3`. En mobile el formulario va **primero** y el resumen (`<aside>`) **después del botón de pagar**. Lo único que se ve al lado del botón es la lista de confianza. |
| ¿El formulario guarda lo tipeado? | **No.** `useState(initial)` en `CheckoutForm.jsx:61`, sin `localStorage` ni `sessionStorage`. Salir del checkout (un link a `/politicas/cambios`) borra nombre, mail, teléfono y dirección. Por eso las condiciones se despliegan en el lugar. |
| ¿Cómo se sabe qué hay en el carrito? | Cada línea tiene `type` (`CartContext.jsx`): `sticker`, `pack`, `custom`, `negocio`, `fixed`, `digital`. `CheckoutForm` ya usa `useCart()`. |
| ¿Todo `pack` es de catálogo? | **No.** `/mayorista` usa `PackBuilder` con `allowCustom` (`routes/Mayorista.jsx:81`): el pack puede traer calcos con archivo del cliente. En la línea quedan `meta.items` (diseños de catálogo) y `meta.customCount` (unidades con archivo), desde el primer commit del armador (24/6/2026). Además existen `pack:personalizados:*` (pack de personalizados, `business-rules.md` §4). |
| ¿`fixed` qué es? | Tatuajes y Polaroid (`addFixed`). Los dos se hacen con diseños o fotos del cliente (`Tatuajes.jsx`: *"Subí tus diseños"*). |
| Comentarios que se contradicen | `CheckoutForm.jsx:343-346` — *"Solo afirmaciones verificables… Nada de garantías inventadas — la política de cambios está en /politicas/cambios."* Protegía de prometer algo que no existía. Desde la spec 020 la garantía **existe**, así que deja de ser inventada. El criterio de fondo (solo cosas verificables) se mantiene y es justamente por qué el mensaje cambia según el carrito. El comentario se reescribe, no se borra. |
| ¿Hay tests que lo cubran hoy? | No hay tests de `CheckoutForm`. `lib/politicaDevoluciones.test.js` (spec 020) ata la política a la tira. |
| ¿Toca el camino de precios? | **No.** Solo lee `type` y `meta` de las líneas. |
| Analytics | `lib/analytics.js` usa `pushDataLayer()` con `try/catch` para los eventos propios (ej. `trackCuponVencido`). GA4 los recibe por el reenvío a `gtag`. |

---

## 1. Arquitectura propuesta

```
config/site.js ── devoluciones.dias
        │
        ▼
lib/garantia.js (NUEVO, puro, sin React)
  grupoDeLinea(line)       → { catalogo: bool, archivo: bool } | null (digital)
  garantiaDelCarrito(items) → 'devolucion' | 'mixto' | 'falla' | null
  GARANTIA[tipo]           → { titulo, condiciones[] }   (textos, con los días del config)
        │
        ▼
components/CheckoutForm.jsx
  useCart().items → garantiaDelCarrito() → <GarantiaCheckout tipo=… />
        │
        ▼
components/GarantiaCheckout.jsx (NUEVO)
  <li> ancho completo arriba de la lista de confianza
    mensaje + <details><summary>Ver condiciones</summary> …</details>
    onToggle(abierto) → trackGarantiaCondiciones(tipo)
```

**Decisiones y alternativas descartadas**

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Un ítem **de ancho completo, arriba** de los cuatro de siempre | Sumarlo como quinto chip | Cinco en `grid-cols-2` deja uno huérfano, y la garantía es la duda más cara: tiene que leerse primero, no como un chip más. |
| Condiciones en un `<details>` **plegado** | Siempre visibles | Tres renglones de letra chica entre el formulario y el botón empujan el botón y hacen dudar a quien no tenía la duda. Plegado, está para quien la tiene. |
| `<details>` / `<summary>` nativo | Estado de React + botón | Accesible sin código (teclado, lector de pantalla, `aria-expanded` implícito) y sin JS para abrir. React solo escucha `onToggle` para el evento. |
| **Sin link** a `/politicas/cambios` | Link en la misma pestaña o en una nueva | El formulario no guarda lo tipeado. En la misma pestaña se pierde; `target="_blank"` en el navegador de Instagram (la mayoría del tráfico) no garantiza una pestaña aparte. Las condiciones que importan están en el desplegable; la política completa sigue en el footer. |
| Clasificación en `lib/garantia.js`, pura | Calcularla dentro del componente | Se testea sin React (la suite corre en `node`) y deja en un solo lugar la tabla de §7 de requirements. |
| Línea dudosa → *hecho con tu archivo* | → catálogo | Prometer de menos no le miente a nadie; prometer de más, sí. |
| Textos en `lib/garantia.js` con `devoluciones.dias` | Textos en el JSX | El test puede verificar que el título de *falla* no dice "devol" y que los tres usan los días del config. |

### Los mensajes

Con las opciones recomendadas de `requirements.md` §12:

| Tipo | Mensaje | Condiciones (desplegable) |
|---|---|---|
| `devolucion` | 🔄 **{dias} días para devolverlo**, por el motivo que sea | Las calcos tienen que estar sin pegar · El envío de vuelta lo pagás vos, salvo falla o error nuestro · Te devolvemos lo que pagaste por los productos, por el mismo medio de pago · Se pide por WhatsApp o mail con tu número de pedido |
| `mixto` | 🔄 **{dias} días para devolver las calcos de catálogo** | Las mismas cuatro + *Lo hecho con tu archivo se repone si llega con una falla de fabricación* |
| `falla` | 🛠️ **Si llega con una falla, te lo reponemos gratis** | Avisanos con foto o video dentro de los {dias} días de recibido · Reponemos o reimprimimos sin costo, envío incluido · Lo hecho con tu archivo no entra en la devolución por cualquier motivo: se produce a tu medida |
| `null` | *(nada)* | — |

### La clasificación

```js
// lib/garantia.js
export function grupoDeLinea(line) {
  switch (line?.type) {
    case 'sticker':  return { catalogo: true,  archivo: false };
    case 'custom':
    case 'negocio':
    case 'fixed':    return { catalogo: false, archivo: true };
    case 'digital':  return null;               // no cuenta (RF-5)
    case 'pack': {
      const m = line.meta || {};
      if (m.packType === 'personalizados') return { catalogo: false, archivo: true };
      if (!Array.isArray(m.items))         return { catalogo: false, archivo: true }; // dudosa
      return { catalogo: m.items.length > 0, archivo: Number(m.customCount) > 0 };
    }
    default:         return { catalogo: false, archivo: true };                     // dudosa
  }
}

export function garantiaDelCarrito(items = []) {
  const grupos = items.map(grupoDeLinea).filter(Boolean);
  const catalogo = grupos.some((g) => g.catalogo);
  const archivo = grupos.some((g) => g.archivo);
  if (catalogo && archivo) return 'mixto';
  if (catalogo) return 'devolucion';
  if (archivo) return 'falla';
  return null; // vacío o solo digital
}
```

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/components/CheckoutForm.jsx` | Lee `items` de `useCart()`, renderiza `<GarantiaCheckout>` como primer ítem de la lista; reescribe el comentario de la lista | 🟡 está en el camino de compra (solo presentación) |
| `frontend/src/lib/analytics.js` | `+ trackGarantiaCondiciones(tipo)` | 🟡 compartido (ver abajo) |
| `docs/analytics.md` | Evento nuevo | 🟢 |

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/lib/garantia.js` | Clasificación y textos (puro) |
| `frontend/src/lib/garantia.test.js` | Tests (§9) |
| `frontend/src/components/GarantiaCheckout.jsx` | El ítem: mensaje + desplegable + evento |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `frontend/src/config/pricing.js` | No | — |
| `frontend/src/config/site.js` | No (solo se **lee** `devoluciones`) | — |
| `frontend/src/context/CartContext.jsx` | No (solo se **lee** `items`) | — |
| `netlify/functions/lib/pricing.js` | No | — |
| `frontend/src/lib/analytics.js` | **Sí — solo se agrega una función** | Lo importan la mayoría de las rutas y componentes; agregar una exportación no cambia ninguna existente |

```bash
grep -rln "lib/analytics.js" frontend/src | wc -l
```

---

## 3. Datos

### Estructuras nuevas
Ver §1. No se persiste nada: el tipo se deriva de `items` en cada render.

### ⚠️ Compatibilidad con datos existentes
- [x] No cambia la forma de las líneas del carrito
- [x] Los carritos guardados sirven tal cual: los packs tienen `meta.items` y
      `meta.customCount` desde el primer commit del armador. Si alguno no los
      tuviera, cae en *hecho con tu archivo* (el mensaje más prudente).

---

## 4. APIs

No aplica.

---

## 5. Integraciones

| Servicio | Cambio | ¿Puede bloquear la venta? |
|---|---|---|
| GA4 | evento `garantia_condiciones_ver` | No: `pushDataLayer` en `try/catch` |

Sin variables de entorno nuevas.

---

## 6. Seguridad

- [x] Ningún secreto
- [x] Sin PII en el evento (solo `tipo`)
- [x] No hay valores del cliente que el servidor tenga que validar

| Riesgo | Mitigación |
|---|---|
| El checkout promete una devolución que la política no da | La clasificación sigue la tabla D-4 de la política, línea dudosa → *falla*, y un test prohíbe "devol" en el título de *falla* |
| El plazo del checkout se desincroniza de la política | Sale de `devoluciones.dias`; test lo verifica |

---

## 7. Manejo de errores

| Escenario | Qué hace el sistema | Qué ve el cliente |
|---|---|---|
| Falla el `dataLayer` | `pushDataLayer` lo traga | Nada: el desplegable se abre igual |
| Línea con `type` desconocido | *hecho con tu archivo* | El mensaje de falla |

---

## 8. Estrategia de migración

No aplica: no hay datos ni comportamiento previo que migrar. **Rollback**:
revertir el commit.

---

## 9. Testing

### Tests nuevos

| Archivo | Qué verifica |
|---|---|
| `lib/garantia.test.js` | **Clasificación**: solo `sticker` → `devolucion` · `sticker` + `custom` → `mixto` · solo `custom` / `negocio` / `fixed` → `falla` · pack mayorista sin archivos → `devolucion` · con `customCount > 0` y diseños → `mixto` · solo archivos → `falla` · `pack:personalizados` → `falla` · pack sin `meta` → `falla` · `type` desconocido → `falla` · solo `digital` → `null` · `digital` + `sticker` → `devolucion` · vacío → `null`. **Textos**: los tres dicen `${devoluciones.dias}` · el **título** de `falla` no contiene "devol" (no promete una devolución) y sus condiciones dicen que lo hecho con tu archivo "no entra" · el de `mixto` dice "catálogo" |

### Verificación manual
- [ ] 375 px: con 1 calco de catálogo, 1 personalizado y ambos, el mensaje correcto arriba del botón; sin scroll horizontal
- [ ] "Ver condiciones" con teclado (Tab + Enter) y el evento en `window.dataLayer`
- [ ] Solo digital: la lista queda como hoy
- [ ] Sumar un calco desde el upsell a un carrito de personalizados: pasa a `mixto`

---

## 10. Dependencias nuevas

Ninguna.

---

## 11. Preguntas abiertas del diseño

Ninguna propia: dependen de P-1 y P-2 de `requirements.md`. Si Mariano elige
las alternativas, cambian solo los textos de la tabla de §1 (y en P-2, que
`falla` devuelva `null`).
