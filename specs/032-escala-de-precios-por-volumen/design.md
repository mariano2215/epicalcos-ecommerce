# Design — Escala de precios por volumen

| | |
|---|---|
| **Spec** | `032-escala-de-precios-por-volumen` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 05/10/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | Precio fijo por 100 (`NEGOCIO`, `PROMO_MAYORISTA_100`, pack holográfico) y por % (`WHOLESALE_DISCOUNT`). Ninguno escalona. `repartoNegocio()` ya implementa "si el siguiente pack cuesta igual o menos, llevate el pack": es el precedente de RF-4 |
| ¿Cómo cobra el carrito una línea de precio fijo? | `precioVidrieraLinea()` devuelve `basePrice` para todo lo que no es Polaroid ni promo Argentina; `addNegocio()` la agrega con `type: 'negocio'` (fuera de cupones y N×M, dentro de la transferencia). **Una línea de la escala puede entrar por `addNegocio` sin tocar `CartContext`** |
| ¿Cómo la cobra el servidor? | `lineBase()` deriva el precio **solo del id**. Una rama nueva por prefijo no toca las demás |
| ¿Carritos guardados? | `lib/precioVigente.js` re-precia por id al hidratar; un id que no reconoce lo deja como está |
| ¿Tests que lo cubran? | `promoPricing`, `precioPersonalizados`, `envio` (incluido "la promo de 100 y Negocio debajo del umbral nacional") |
| ¿Envíos? | El mail al cliente escribe los plazos a mano (`notify.js → customerTimeline`): no depende de esta spec: el plazo de 3 a 5 días hábiles para pedidos de 100+ lo implementa la spec 031 (RF-P3), contando calcos desde los ids, incluida la línea `volumen:` |

---

## 1. Arquitectura

```
frontend/src/config/pricing.js                 netlify/functions/lib/pricing.js
  ESCALA_VOLUMEN (tabla aprobada §9.1)  ◀═══▶   ESCALA_VOLUMEN (espejo)
  precioVolumen({ tamano, material, cantidad })  precioVolumen(...)  (misma función)
            │                                            │
            ├─ cotizador (spec 031)                       └─ lineBase(): rama 'volumen'
            ├─ PackBuilder (/mayorista) con 100+
            ├─ configurador (/personalizados) con 100+
            └─ lib/precioVigente.js (carritos guardados)
```

### Decisiones

| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| D-1 | **Línea nueva** `volumen:{tamano}:{material}:{cantidad}:{ts}`, `quantity: 1` | Re-preciar `pack:mayorista` con la escala | Cambiaría el precio de líneas que ya están en carritos guardados; una línea nueva deja intacto todo lo viejo |
| D-2 | La cantidad viaja **en el id** | En `quantity` | El precio depende de la cantidad total (no es unitario × cantidad) y el servidor solo confía en el id. Precedente: el tamaño del pack holográfico va en el id por lo mismo |
| D-3 | Entra al carrito por `addNegocio()` (`type: 'negocio'`) | Un `type` nuevo en `CartContext` | Mismo comportamiento que necesita (precio fijo, sin cupones ni N×M, con transferencia) y cero cambios en el módulo de mayor radio de impacto |
| D-4 | Holográfico con su propio precio de escalón (recargo incluido) | Línea de escala + línea de recargo por cada 100 | Una línea, un precio. El emparejado de recargos (`requierenRecargo`) no se extiende a la escala |
| D-5 | Una función `precioVolumen()` idéntica en los dos lados | Que el servidor reciba el precio | Regla 11 |
| D-6 | Los productos viejos no se borran | Migrar todo a la escala | Carritos guardados, páginas y tests que los usan |

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/src/config/pricing.js` | `ESCALA_VOLUMEN`, `ESCALA_ESCALONES = [100, 250, 500, 1000]`, `precioVolumen()`, `pctEscalon()` | 🔴 camino de precios (47 importadores; solo se **agrega**) |
| `netlify/functions/lib/pricing.js` | Espejo de la tabla y la función; rama `volumen` en `lineBase()` | 🔴 revalida todos los checkouts (solo se agrega una rama) |
| `frontend/src/lib/precioVigente.js` | Re-precia `volumen:` | 🟡 |
| `frontend/src/components/PackBuilder.jsx` | Con 100+ emite `volumen:` en vez de `pack:mayorista`/`mayorista100`; en `/mayorista` deja de ofrecer 9 cm (prop `tamanos`, el armador de `/armar-pack` no cambia) | 🟡 `/mayorista` |
| `frontend/src/lib/precioPersonalizados.js` + `lib/borradorPersonalizado.js` + `components/personalizados/BotonCta.jsx` | Con 100+ unidades en 4 o 6 cm (uno o varios diseños), cotiza y emite `volumen:`; en 9 cm sigue suelta y sugiere 4 o 6 cm | 🟡 código de la spec 023 en curso — coordinar |
| `frontend/src/lib/resumenPedido.js` | Rótulo de la línea de escala para mail/CRM | 🟢 |
| `frontend/src/config/metaCatalog.js` | Nada: usa el SKU de Negocio por `addNegocio` | 🟢 |
| `docs/business-rules.md` | Sección nueva "Escala por volumen" y tabla del §8 (espejo) | 🟢 |

### ⚠️ Módulos compartidos

| Módulo | ¿Se toca? | Quién lo importa |
|---|---|---|
| `config/pricing.js` | Sí, solo agrega | 47 archivos |
| `netlify/functions/lib/pricing.js` | Sí, solo agrega | `create-preference`, `create-order-transfer`, tests |
| `context/CartContext.jsx` | **No** (D-3) | 29 archivos |
| `config/site.js` | **No** | 40 archivos |

---

## 3. Datos

```js
// config/pricing.js — ⚠️ ESPEJO en netlify/functions/lib/pricing.js
// Montos TOTALES por escalón (Mercado Pago). Opción B, aprobada el 5/10/2026.
// SIN 9 cm: Mariano sacó el 9 cm de la venta por mayor (requirements §9.4).
export const ESCALA_VOLUMEN = {
  '4cm': { 100: 52999, 250: 118999, 500: 211999, 1000: 370999 },
  '6cm': { 100: 52999, 250: 118999, 500: 211999, 1000: 370999 },
  holografico: { 100: 72999, 250: 163999, 500: 291999, 1000: 510999 } // 4 y 6 cm
};
```

```js
precioVolumen({ tamano, material, cantidad }) → null | {
  total,             // lo que se cobra (MP)
  cantidadLlevada,   // ≥ cantidad: sube al escalón siguiente si cuesta igual o menos (RF-4)
  escalon,           // 100 | 250 | 500 | 1000
  unitario,          // total / cantidadLlevada, redondeado
  pct                // % contra el escalón de 100, derivado del total; 0 en el de 100
                     // (ahí la web muestra MUESTRA GRATIS, no un %)
}
```

1. `null` si `cantidad < 100`, `cantidad > 1000`, o el tamaño no es 4 ni 6 cm
   (9 cm no se vende por mayor, con ningún material).
2. Fila: `holografico` si el material es holográfico; si no, el tamaño (vinilo
   blanco y DTF UV comparten fila).
3. `escalon` = el mayor escalón ≤ `cantidad`.
4. `total = round(cantidad × fila[escalon] / escalon)`.
5. Si hay escalón siguiente y `fila[siguiente] ≤ total` → `total =
   fila[siguiente]`, `cantidadLlevada = siguiente`.

Con la opción B, el total es **no decreciente** de 100 a 1.000 (RF-5): lo
verifica un test que recorre todas las cantidades. Si una tabla futura lo
rompiera, el test frena el deploy.

**Transferencia**: el servidor descuenta por línea (`round(base × 0,8)` con
`quantity 1`), igual que a Negocio. El sitio usa el mismo cálculo.

**Línea**:
```js
{ id: `volumen:${tamano}:${material}:${cantidadLlevada}:${ts}`,
  type: 'negocio', quantity: 1, basePrice: total, size: tamano,
  name: `Calcos para negocio · ${cantidadLlevada} u · ${tamanoLabel} · ${materialLabel}`,
  meta: { qty: cantidadLlevada, material, disenos, archivos, items /* catálogo, si viene del armador */, reparto } }
```

`meta.qty` hace que carrito y drawer muestren "500 calcos" y no "1 unidad"
(precedente de la promo x100).

---

## 4. Servidor

Rama nueva en `lineBase()`:

```js
if (kind === 'volumen') {
  if (quantity !== 1) return { error: 'escala: 1 unidad por línea' };
  const [, tamano, material, cantidadTxt] = parts;
  if (!CUSTOM_MATERIALES.includes(material)) return { error: `material inválido en "${id}"` };
  const cantidad = Number(cantidadTxt);
  if (!Number.isInteger(cantidad)) return { error: `cantidad inválida en "${id}"` };
  const p = precioVolumen({ tamano, material, cantidad });
  if (!p || p.cantidadLlevada !== cantidad) return { error: 'escala: cantidad fuera de la escala — recargá la página' };
  return { base: p.total, kind, discountable: false };
}
```

- `p.cantidadLlevada !== cantidad` rechaza un id con una cantidad que el sitio
  nunca emitiría (ej. 240: el sitio manda 250).
- `discountable: false` → fuera de cupones y N×M; la transferencia corre igual
  (`transferRate` alcanza a todo producto desde la spec 027).
- El envío se calcula por umbral, sin cambios.

---

## 5. Tests

| Test | Qué verifica |
|---|---|
| `promoPricing.test.js` (o `escalaVolumen.test.js` nuevo) | Las dos tablas son idénticas; `precioVolumen` da lo mismo en los dos lados para **cada** cantidad 100–1.000 × tamaño × material |
| ídem | Precio por calco estrictamente decreciente entre escalones (RF-2); total no decreciente en todo el rango (RF-5) |
| ídem | `validateAndPriceOrder()` acepta cada línea emitida, con MP y con transferencia, y rechaza: cantidad 99, 1.001, 240 (no emitible), **cualquier 9 cm**, material inválido, `quantity 2`. Sigue aceptando `pack:mayorista:9cm` (carritos guardados) |
| ídem | `pct` = 0 / 10 / 20 / 30 en los cuatro escalones de cada fila |
| ídem | Un cupón (`EPICA10`) no descuenta la línea; la transferencia sí |
| `envio.test.js` | El escalón de 100 queda debajo del umbral nacional (se suma al test existente) |
| `precioVigente` | Un carrito guardado con una línea de escala vieja se re-precia |
| `precioPersonalizados.test.js` | Con 100+ copias, uno o varios diseños, el configurador cotiza con la escala y su línea pasa por el servidor |

---

## 6. Seguridad y errores

- El precio sale solo del id; un cliente que manda otro `unit_price` recibe
  `price_mismatch`, como siempre.
- Si la tabla cambia con la página abierta, el checkout rechaza con "recargá la
  página" y `precioVigente` la arregla al recargar (mismo flujo que una suba de
  precios).

---

## 7. Migración y rollback

- Deploy en un solo commit con los dos lados del espejo (si no, el test frena).
- Orden: (1) tabla + función + rama del servidor + tests — nada la emite
  todavía; (2) cotizador de la 031; (3) `PackBuilder`; (4) configurador (con la
  023).
- Rollback: dejar de emitir `volumen:` (revert de los pasos 2–4). La rama del
  servidor queda para los carritos que ya la tengan.
- Después: regenerar el feed de Meta (`scripts/build-meta-feed.mjs`) si se
  decide publicar la escala como producto.
