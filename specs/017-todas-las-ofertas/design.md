# Design — Todas las ofertas juntas + cupón con vencimiento por usuario

| | |
|---|---|
| **Spec** | `017-todas-las-ofertas` |
| **Estado** | ✅ `IMPLEMENTADA` — 07/09/2026 |
| **Fecha** | 07/09/2026 |
| **Requirements** | [`requirements.md`](requirements.md) |

---

## 0. Hallazgos del discovery

Lo que se leyó antes de diseñar (regla 3), y lo que apareció:

### H-1 — El motor soporta UNA sola agrupación N×M

En [`CartContext.jsx:422`](../../frontend/src/context/CartContext.jsx) y en
[`netlify/functions/lib/pricing.js:457`](../../netlify/functions/lib/pricing.js)
hay la misma línea:

```js
const grouping = bundle || (!anulaTodo && promoActive ? PROMO_3X2 : null);
```

**Una** agrupación, **una** bolsa, **un** `keepFraction` uniforme para todas las
líneas elegibles. Un 3x2 global + un 2x1 por categoría son dos bolsas
simultáneas: es el cambio estructural de esta spec.

### H-2 — El `keepFraction` uniforme no es un detalle, es lo que sostiene el espejo

`promo3x2()` no pone en cero unidades puntuales: reparte el descuento
**uniforme** sobre todas las unidades elegibles. Está así a propósito, y el
comentario lo explica: Mercado Pago no admite líneas con precio ≤ 0, y un precio
por unidad positivo es verificable idéntico en el servidor.

**Esto es lo que hace tratable el problema de las dos bolsas**: no hay que
decidir qué línea queda a mitad de precio. Se calcula el descuento total de las
dos bolsas, se suma, y se reparte uniforme sobre el total elegible. La forma en
que se aplica no cambia — solo cambia cómo se calcula el número.

### H-3 — Las 4 categorías están hardcodeadas y no salen de ventas

[`FeaturedStickers.jsx:10`](../../frontend/src/components/FeaturedStickers.jsx):

```js
const FEATURED_CATEGORIES = ['anime', 'argentina', 'disney', 'frases'];
```

El comentario del archivo ya declara el hallazgo: *"ni «más vendidos» ni «más
elegidos» salen de un dato de ventas — son cuatro diseños al azar de cuatro
categorías"*. El 2x1 se define sobre **esas cuatro**, que es lo que pidió
Mariano, pero la lista pasa a ser una constante de precios y no de presentación:
**se mueve a `config/pricing.js` y `FeaturedStickers` la importa de ahí.** Si
quedaran dos listas, cambiar la del Home cambiaría silenciosamente qué está en
promo, y el servidor no se enteraría.

### H-4 — El banner del header muestra una sola promo

[`Header.jsx:58-85`](../../frontend/src/components/Header.jsx) es un `if/else`:
3x2 → mayorista → argentina. Con las tres activas **solo se ve el 3x2**. Ver
pregunta abierta §11.

### H-5 — `EPICA10` viaja al servidor como un string, sin más

El checkout manda `couponCode`. Para un vencimiento por usuario hace falta
mandar **también cuándo se emitió**: es un campo nuevo en el contrato.

### H-6 — `isPromoActive()` exige las dos puntas

```js
return Number.isFinite(PROMO_START_MS) && Number.isFinite(PROMO_END_MS) &&
       now >= PROMO_START_MS && now <= PROMO_END_MS;
```

Sin `endsAt` (RF-8), `Date.parse(null)` da `NaN` y **la promo nunca se
enciende**. Hay que cambiar el predicado de los dos lados, no solo borrar la
fecha.

---

## 1. Arquitectura propuesta

### El reparto en dos bolsas *(regla E — decisión del 07/09/2026)*

Reemplaza al `grouping` único. Se calcula **antes** de aplicar cualquier `%`:

```
unidades elegibles (sticker + custom)
        │
        ├── de anime/argentina/disney/frases ──► se REPARTEN entre las dos bolsas,
        │                                        eligiendo el reparto que da el
        │                                        MAYOR descuento total
        │                                          │
        │                              ┌───────────┴───────────┐
        │                              ▼                       ▼
        │                          BOLSA 2x1               BOLSA 3x2
        └── del resto ──────────────────────────────────────► ┘

descuentoTotal = descuento2x1 + descuento3x2   (del mejor reparto)
keepFraction   = (baseElegibleTotal − descuentoTotal) / baseElegibleTotal
```

El `keepFraction` sigue siendo **uno solo y uniforme**, igual que hoy. Todo lo
que viene después —el `%` topeado, `rateDe`, el redondeo por línea— **no se
toca**. Es lo que hace tratable el problema (ver H-2).

### El algoritmo, exacto

Tiene que dar bit a bit idéntico en los dos lados. Se escribe una vez y se
espeja literal:

```js
/**
 * Reparte las unidades elegibles entre el 2x1 por categoría y el 3x2 general,
 * quedándose con el reparto que MÁS le conviene al cliente.
 *
 * POR QUÉ NO "2x1 primero y el sobrante al 3x2", que es lo obvio: esa regla
 * deja que agregar un calco BAJE el total hasta $800 (1,2 % de los carritos).
 * Pasa porque el sobrante, al irse de la bolsa del 3x2, le saca su unidad más
 * barata: esa bolsa pasa a regalar una más cara, y encima el 2x1 suma la suya.
 * El descuento sube más de lo que sube el carrito. Ver specs/017 design §11.
 *
 * POR QUÉ ESTOS DOS CANDIDATOS POR `k` Y NO TODOS LOS SUBCONJUNTOS: comparado
 * contra la enumeración completa en 6.720 carritos, con las `k` más baratas o
 * las `k` más caras alcanza para dar el óptimo en todos. Enumerar los 2^n
 * subconjuntos sería exponencial sobre un carrito de 100 calcos.
 */
export function repartoPromos({ unidadesCategoria, unidadesResto }) {
  const b = unidadesCategoria.slice().sort((x, y) => x - y);
  let mejor = { discount: 0, freeUnits: 0 };

  for (let k = 0; k <= b.length; k++) {
    for (const pick of [b.slice(0, k), b.slice(b.length - k)]) {
      const rest = [...b];
      for (const v of pick) { const i = rest.indexOf(v); if (i >= 0) rest.splice(i, 1); }
      // Las dos bolsas usan la primitiva que YA existe y ya está espejada.
      const r1 = promo3x2({ unitBasePrices: pick, buy: 2, pay: 1 });
      const r2 = promo3x2({ unitBasePrices: [...unidadesResto, ...rest], buy: 3, pay: 2 });
      const discount = r1.discount + r2.discount;
      if (discount > mejor.discount) {
        mejor = { discount, freeUnits: r1.freeUnits + r2.freeUnits };
      }
    }
  }

  const base = [...unidadesCategoria, ...unidadesResto].reduce((a, c) => a + c, 0);
  return { ...mejor, keepFraction: base > 0 ? (base - mejor.discount) / base : 1 };
}
```

**No se inventa una regla nueva de "cuál es la gratis"**: se llama dos veces a
`promo3x2()`, que es la función que ya está espejada y testeada en los dos lados.

### Resultados verificados

Corridos con la implementación real de `promo3x2()`:

| Caso | Gratis | Base | Total | `keepFraction` |
|---|---|---|---|---|
| ⭐ 3 Disney + 2 otras (6 cm) | **2** | $8.000 | **$4.800** | 0,6000 |
| 2 Disney | 1 | $3.200 | $1.600 | 0,5000 |
| 1 Disney solo | 0 | $1.600 | $1.600 | 1,0000 |
| 1 Disney + 2 otras | 1 | $4.800 | $3.200 | 0,6667 |
| 2 Disney + 2 anime | 2 | $6.400 | $3.200 | 0,5000 |
| 3 otras, sin categoría | 1 | $4.800 | $3.200 | 0,6667 |

### El tope de % sube a 20 %

`PROMO_3X2.percentCap: 0.10` → `0.20`, y se elimina la anulación del cupón
durante la promo (`cuponAnuladoPorPromo`). El comentario que documenta la
decisión del 20/8/2026 **se actualiza, no se borra**: pasa a decir que se
revirtió el 7/9/2026 y por qué.

### El cupón con ventana propia

```
popup: deja el mail
   └─► captureLead() devuelve el código
        └─► localStorage: { code, emitidoEn: Date.now() }
             ├─► popup muestra contador de 10 min
             ├─► checkout precarga el código Y muestra el mismo contador
             └─► al confirmar, el payload lleva { couponCode, couponIssuedAt }
                  └─► el servidor valida la ventana con SU reloj + tolerancia
```

---

## 2. Componentes afectados

### Archivos que se modifican

| Archivo | Qué cambia |
|---|---|
| `frontend/src/config/pricing.js` | ⚠️ Fechas de las 3 promos, `CATEGORIAS_2X1`, `percentCap` 20 %, `repartoPromos()`, ventana de `EPICA10` |
| `netlify/functions/lib/pricing.js` | ⚠️ **Espejo literal de todo lo anterior** + validación de `couponIssuedAt` |
| `frontend/src/context/CartContext.jsx` | ⚠️ `pricedItems` usa `repartoPromos()`; se saca `cuponAnuladoPorPromo` |
| `frontend/src/components/WelcomePopup.jsx` | Guarda `emitidoEn`, muestra el contador |
| `frontend/src/routes/Checkout.jsx` | Contador visible, manda `couponIssuedAt`, maneja el vencimiento en vivo |
| `frontend/src/components/Header.jsx` | Banner sin countdown (RF-8) |
| `frontend/src/components/PromoBanner.jsx` | Camino sin `endMs` |
| `frontend/src/components/FeaturedStickers.jsx` | Importa las 4 categorías de `pricing.js` (H-3) |
| `frontend/src/components/CartDrawer.jsx` · `routes/Cart.jsx` | Copy: hoy dicen "Promo 3x2" a secas |
| `frontend/src/lib/analytics.js` | Eventos de §11 de requirements |
| `docs/business-rules.md` | Las tres promos + el interruptor |

### Archivos nuevos

| Archivo | Para qué |
|---|---|
| `frontend/src/lib/cuponVentana.js` | Emisión, lectura y vencimiento del cupón. Un solo lugar |
| `frontend/src/components/CuponCountdown.jsx` | El contador, reusado por popup y checkout |
| `frontend/src/lib/reparto.test.js` | Tests del reparto en dos bolsas |

### ⚠️ Módulos compartidos

Los cinco de la tabla de la regla 9, y quién los importa:

| Módulo | Lo importan |
|---|---|
| `config/pricing.js` | 23 archivos (`grep -rn "config/pricing" frontend/src` antes de tocar) |
| `context/CartContext.jsx` | Todo el carrito, el drawer, el checkout, las cards |
| `netlify/functions/lib/pricing.js` | `create-preference.js`, `create-order-transfer.js` |
| `lib/analytics.js` | Único punto de salida a GA4 y Meta |

`config/site.js` **no se toca**: los envíos no cambian.

---

## 3. Datos

### Estructuras nuevas

```js
// config/pricing.js — espejado en el server
export const CATEGORIAS_2X1 = ['anime', 'argentina', 'disney', 'frases'];

export const PROMO_2X1_CATEGORIAS = {
  id: 'cat2x1',
  activa: true,          // ← el interruptor de RF-8
  startsAt: null,        // arranca al deployar
  endsAt: null,          // sin fin: se apaga con `activa`
  buy: 2,
  pay: 1,
  titulo: '2x1 EN LAS MÁS ELEGIDAS'
};

export const CUPON_VENTANA_MS = 10 * 60 * 1000;
export const CUPON_TOLERANCIA_MS = 60 * 1000;  // ver §6
```

### Persistencia

`localStorage`, clave existente `epicalcos.welcomeCoupon`. **Cambia de forma**:
hoy guarda un string (el código), pasa a guardar un objeto.

### ⚠️ Compatibilidad con datos existentes

**Hay navegadores con el formato viejo guardado.** Un `JSON.parse` sobre
`"EPICA10"` tira. Hay precedente exacto de este daño en `esCustomViejo()` del
`CartContext`, y la lectura tiene que contemplarlo:

```js
// Formato viejo (string suelto) = cupón emitido antes de esta spec.
// Se le da la ventana completa desde AHORA en vez de descartarlo: el que ya
// tenía su código no se entera de nada raro, y no arranca vencido.
```

Los carritos en `epicalcos.cart.v2` **no cambian de forma**: el precio de la
promo nunca se persiste, se deriva en cada render.

---

## 4. APIs

### Endpoints afectados

`create-preference.js` y `create-order-transfer.js`, ambos vía
`validateAndPriceOrder()`.

### Contrato — campo nuevo

```diff
  {
    items: [...],
    shipping: {...},
    paymentMethod: 'mercadopago' | 'transferencia',
    couponCode: 'EPICA10',
+   couponIssuedAt: 1757260800000   // epoch ms, opcional
  }
```

`couponIssuedAt` **ausente** = el cupón no tiene ventana (`EPI50`, o un código
tipeado a mano). Solo `EPICA10` la tiene.

Sin endpoints nuevos.

---

## 5. Integraciones

Ninguna nueva. Mercado Pago, Notion, Resend y Meta CAPI reciben el total ya
calculado; no se enteran de cómo se compuso.

Sin variables de entorno nuevas.

---

## 6. Seguridad

### El timestamp lo pone el cliente *(decisión de Mariano, 07/09/2026)*

`couponIssuedAt` viene del navegador y **es falsificable**: cualquiera edita
`localStorage` y se queda con el 10 %.

**Por qué se acepta**: hoy `EPICA10` no vence nunca. El que sabe abrir devtools
tiene el 10 % para siempre, ahora mismo, sin esfuerzo. La ventana de 10 minutos
no empeora esa situación — la mejora para todo el mundo salvo para quien ya la
tenía.

**Lo que sí hace el servidor**: valida contra su propio reloj con una tolerancia
de 60 s (`CUPON_TOLERANCIA_MS`), para no rechazar a clientes con el reloj
levemente corrido. Rechaza un `issuedAt` en el futuro. Esto ataja el caso honesto
—cupón realmente vencido— y no pretende atajar el forjado.

Queda documentado en el módulo para que nadie lo lea como un control de
seguridad que no es.

### Sin secretos nuevos

Nada de esto toca `netlify/functions/**` con credenciales. `VITE_*` no cambia
(regla 14).

---

## 7. Manejo de errores

| Situación | Qué hace |
|---|---|
| Cupón vencido al confirmar | El servidor **no rechaza el pedido**: ignora el cupón y cobra sin él. Rechazar dejaría al cliente sin comprar por un descuento |
| ⚠️ El total sube al vencer, en pantalla | Ver mitigación abajo |
| `localStorage` bloqueado | Sin cupón y sin contador; el resto del sitio funciona |
| `JSON.parse` falla (formato viejo) | Se trata como emisión nueva (§3) |
| Reloj del cliente adelantado | El contador llega a cero antes; el servidor igual acepta dentro de su ventana |

### Mitigación del riesgo 1 de requirements §12

El cupón puede vencer **mientras la persona completa el checkout**, y el total
sube solo. Propuesta:

- El checkout muestra el contador **desde que se entra**, no como sorpresa.
- Bajo el minuto restante, el contador cambia de color y aparece un aviso.
- Al llegar a cero: el cupón se saca, el total se recalcula y se muestra un
  mensaje explícito de que la ventana se cerró, **sin borrar ningún dato ya
  tipeado**.

**No se congela el cupón al entrar al checkout**: sería anular la urgencia que
esta spec viene a crear. Es una decisión consciente, con su costo.

---

## 8. Estrategia de migración

Sin migración de datos. El único estado persistido que cambia de forma es la
clave del cupón, y §3 cubre el formato viejo.

**Orden de deploy**: `pricing.js` (front) y `pricing.js` (server) tienen que
salir **en el mismo push**. Salir desfasados = `price_mismatch` en todo checkout
con calcos. Un push es un deploy (regla del `netlify.toml`).

---

## 9. Testing

### Tests nuevos

| Archivo | Qué cubre |
|---|---|
| `lib/reparto.test.js` | El reparto de §1: 0/1/2/3 unidades de categoría, sobrantes, bolsas vacías, el ejemplo de 3 Disney + 2 otras |
| `lib/promoPricing.test.js` (amplía) | Paridad front↔server del reparto, del `percentCap` 20 % y de `CATEGORIAS_2X1` |
| `lib/cuponVentana.test.js` | Emisión, vencimiento, formato viejo, `localStorage` bloqueado, reloj adelantado |

### ⚠️ Tests de paridad

`promoPricing.test.js` ya compara las dos tablas campo por campo. Hay que
extenderlo a:

- `CATEGORIAS_2X1` idéntico de los dos lados
- `percentCap` idéntico
- El reparto: **mismo carrito → mismo `keepFraction`** en front y server
- La ventana del cupón y su tolerancia

**Los tests que hoy verifican los cuatro bordes de la ventana del 3x2 van a
fallar** al sacar `endsAt` (RF-8). No se borran: se reescriben contra el nuevo
predicado (`activa` + `startsAt`).

### Verificación manual

1. Carrito con 2 Disney → 1 gratis.
2. Carrito con 3 Disney + 2 otras → 2 gratis, total $4.800.
3. `EPICA10` + transferencia sobre 3 calcos → 20 % encima del 3x2.
4. Esperar 10 min con el checkout abierto → el cupón se cae y el total sube con aviso.
5. `EPI50` → anula todo, 50 % plano.
6. Carrito 100 % digital → ninguna promo.

---

## 10. Dependencias nuevas

**Ninguna.** El contador es `setInterval` + el `useCountdown` que ya existe en
`lib/promo.js`. El reparto usa `promo3x2()`, que ya está. (Regla 10.)

---

## 11. Preguntas abiertas del diseño

### P-1 — ⚠️ Con las tres promos activas, el banner del header muestra una sola

Es un `if/else` (H-4). Con 3x2, mayorista y 2x1 encendidos, solo se ve el 3x2.

**Recomendación**: dejar el banner en el **3x2** (es el de mayor alcance: toca
todo el catálogo) y darle al 2x1 su superficie propia en las 4 páginas de
categoría y en la sección "Los más elegidos" del Home, que es donde el mensaje
es relevante. El mayorista ya tiene `OfertaPrincipal` en el Home. Así cada
oferta se anuncia donde significa algo, en vez de tres carteles peleando arriba
—que es exactamente lo que la spec 014 vino a arreglar.

**Necesita el OK de Mariano**: es qué oferta se queda con el lugar más caro del
sitio.

### P-2 — Sin `endsAt` no hay cuenta regresiva de promo

Consecuencia aceptada de RF-8, se anota para que no se lea como un olvido. La
única urgencia del sitio pasa a ser el cupón de 10 minutos.

### P-3 — ✅ RESUELTA: se pasó a la regla E

**Encontrado el 07/09/2026 verificando el algoritmo por fuerza bruta, después de
que Mariano aprobara la regla A.** El preview que se le mostró no lo contemplaba.

Se implementaron las reglas candidatas y se barrieron **18.816 carritos** (0 a 5
unidades de categoría × 0 a 5 del resto × los tres tamaños), midiendo qué pasa
al agregar un calco más:

| Regla | Da menos gratis | **Baja el total** | Peor baja | Descuento vs. B |
|---|---|---|---|---|
| **A** — sobrantes al 3x2 *(la aprobada)* | 0 | **217 casos** | **$800** | +12,3 % |
| **B** — separación estricta | 0 | 0 | — | — |
| **C** — sobrante = la más barata | 0 | 166 casos | $800 | +14,3 % |
| **D** — el mejor entre A y B | 0 | 154 casos | $800 | +12,5 % |
| **E** — mejor reparto posible | **0** | **0** | — | **+17,3 %** |

**Ninguna regla da menos calcos gratis** al agregar uno — o sea que el argumento
con el que se descartó B en la pregunta original era más débil de lo que se
presentó: B no *empeora*, simplemente no *mejora* (1 Disney + 2 otras = 0 gratis,
igual que sin el Disney).

**Pero la regla A tiene un defecto peor**, que no se había visto: en el 1,2 % de
los carritos, **agregar un calco hace que el cliente pague menos**. Peor caso
real:

```
Carrito:  1 calco de Disney 4 cm + 3 calcos de 9 cm  →  paga $6.000
Agrega:   1 calco de Disney 4 cm más                 →  paga $5.200

Un calco MÁS, $800 MENOS.
```

**Por qué pasa**: al pasar la bolsa de categoría de 1 a 2 unidades, el sobrante
de $1.200 *sale* de la bolsa del 3x2. Esa bolsa pierde su unidad más barata, así
que ahora regala una de $2.000 en vez de una de $1.200 — y encima el 2x1 suma su
propio descuento de $1.200. El descuento total sube $2.000 mientras el carrito
solo creció $1.200.

### La regla E, que no tiene el problema

`E` estaba descartada en la pregunta original como "la que más superficie de test
necesita". Verificada, esa objeción resultó más chica de lo estimado:

- **Es exacta**: comparada contra la enumeración completa de subconjuntos en
  6.720 carritos, coincide con el óptimo real en **todos**.
- **Es monótona**: 0 anomalías en **60.480 transiciones** (búsqueda ampliada a
  7 unidades de categoría + 6 del resto).
- **No es fuerza bruta exponencial**: es un bucle de `k = 0..n` probando las `k`
  más baratas o las `k` más caras. Diez líneas, determinista, y reusa
  `promo3x2()` igual que A. Espejarla no es más difícil que espejar A.

```js
// Regla E — el mejor reparto para el cliente, determinista.
export function repartoPromos({ cat, resto }) {
  const b = cat.slice().sort((x, y) => x - y);
  let mejor = { discount: 0, freeUnits: 0 };
  for (let k = 0; k <= b.length; k++) {
    // Dos candidatos por k: las k más baratas al 2x1, o las k más caras.
    // Verificado contra enumeración completa: con estos dos alcanza para el óptimo.
    for (const pick of [b.slice(0, k), b.slice(b.length - k)]) {
      const rest = [...b];
      for (const v of pick) { const i = rest.indexOf(v); if (i >= 0) rest.splice(i, 1); }
      const r1 = promo3x2({ unitBasePrices: pick, buy: 2, pay: 1 });
      const r2 = promo3x2({ unitBasePrices: [...resto, ...rest], buy: 3, pay: 2 });
      const discount = r1.discount + r2.discount;
      if (discount > mejor.discount) mejor = { discount, freeUnits: r1.freeUnits + r2.freeUnits };
    }
  }
  return mejor;
}
```

**El costo**: E regala ~4,5 % más que A y 17,3 % más que B. Es la más generosa de
las tres.

**Decisión de Mariano (07/09/2026)**: se pasa a la regla **E**, aceptando que es
la más generosa a cambio de que no tenga anomalías. §1 de este documento ya
describe E; la regla A queda registrada acá solo como el camino que se descartó
y por qué.
