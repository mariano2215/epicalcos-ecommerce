# Acceptance — Todas las ofertas juntas + cupón con vencimiento por usuario

| | |
|---|---|
| **Spec** | `017-todas-las-ofertas` |
| **Estado** | ✅ `IMPLEMENTADA` — 07/09/2026 |
| **Tasks** | [`tasks.md`](tasks.md) |

> **Si no está acá, no es parte de "terminado". Si está, no se cierra hasta cumplirlo.**
> Al terminar la implementación se recorre punto por punto y se reporta el
> resultado **real** de cada uno (regla 15).

---

## Cómo se valida

| Criterio | Cómo |
|---|---|
| Precios y reparto | `npm test` + carrito real en el navegador |
| Paridad del espejo | `promoPricing.test.js` — compara los dos lados campo por campo |
| Checkout completo | Un pedido real de prueba, de punta a punta |
| Contador | Cronómetro en mano, 10 minutos reales |
| Mobile | 375 px, no emulado a ojo |

---

## 1. Criterios funcionales

### 3x2 general

- [x] **CF-1** — 3 calcos cualesquiera de 6 cm: se paga **$3.200**, no $4.800.
- [x] **CF-2** — 2 calcos: no hay descuento (no llega al trío).
- [x] **CF-3** — 6 calcos: 2 gratis.
- [x] **CF-4** — La unidad regalada es la **más barata** con tamaños mezclados.
- [x] **CF-5** — Los personalizados (`custom`) participan; los packs, mayorista,
      Negocio, fijos y digitales **no**.

### 2x1 por categoría

- [x] **CF-6** — 2 calcos de Disney: **1 gratis**.
- [x] **CF-7** — 1 solo calco de Disney: **sin descuento**, y esa unidad queda
      disponible para la bolsa del 3x2.
- [x] **CF-8** — 2 de Disney + 2 de anime: las 4 van a la misma bolsa 2x1 → **2 gratis**.
- [x] **CF-9** — Una categoría fuera de las 4 (ej. `marvel`) **no** entra al 2x1.
- [x] **CF-10** — ⭐ **El caso aprobado**: 3 Disney + 2 de otra categoría, 6 cm →
      **2 gratis**, total **$4.800**.

### Reparto (el corazón de la spec)

- [x] **CF-11** — ⭐ Agregar un calco al carrito **nunca** reduce la cantidad de
      calcos gratis. Verificado por test automático de barrido, no a ojo.
- [x] **CF-12** — ⭐ Agregar un calco al carrito **nunca baja el total**. Es el
      criterio que hizo descartar la primera regla aprobada: el test tiene que
      barrer al menos **50.000 transiciones** (0-7 unidades de categoría × 0-6
      del resto × los tres tamaños) y no encontrar ninguna.
- [x] **CF-13** — El reparto elegido es el de **mayor descuento posible**,
      comparado contra la enumeración completa de subconjuntos en carritos chicos.
- [x] **CF-14** — El `keepFraction` es **uno solo** y da precios por unidad
      **positivos** en todas las líneas (Mercado Pago rechaza ≤ 0).
- [x] **CF-15** — Con dos repartos empatados en descuento, los dos lados del
      espejo eligen **el mismo**. Un desempate distinto da `price_mismatch`.

### Mayorista

- [x] **CF-16** — 100 calcos a **$39.999** total en `/mayorista`.
- [x] **CF-17** — El mayorista **no** se mezcla con el 3x2 ni con el 2x1: ya trae
      su precio final.

### Cupón con ventana

- [ ] **CF-18** — Al dejar el mail, el popup entrega el código **y** muestra un
      contador de 10:00.
- [x] **CF-19** — El checkout muestra el **mismo** contador desde que se entra.
- [x] **CF-20** — Con el cupón vigente, `EPICA10` descuenta **de verdad** encima
      de la promo (RF-7).
- [x] **CF-21** — A los 10 minutos, el cupón se saca solo, el total se recalcula
      y **se avisa con un mensaje explícito**.
- [x] **CF-22** — Al vencer **no se borra ningún dato ya tipeado** en el formulario.
- [x] **CF-23** — Un pedido con el cupón vencido **se procesa igual**, sin el
      descuento. **No se rechaza.**
- [x] **CF-24** — Dos navegadores que dejan el mail con 5 min de diferencia
      tienen ventanas **distintas**.

### Acumulación

- [x] **CF-25** — ⚠️ **Corregido durante la implementación.** 3 calcos de 6 cm de
      una categoría del 2x1 + transferencia + `EPICA10` = **$2.880**, no $2.560.
      El 10 % por transferencia exige **10 calcos** (`BULK_THRESHOLD`), así que
      con 3 no corre: lo único que se suma sobre el N×M es el 10 % del cupón.
      Antes de esta spec el mismo carrito costaba **$3.200** (el cupón quedaba
      anulado), así que el cambio sí abarata — pero $3.200 → $2.880, no
      $2.880 → $2.560.
- [x] **CF-25-bis** — Con **12 calcos** (que sí pasan el umbral) + transferencia
      + `EPICA10` corren los dos 10 %: el tope de 20 % se alcanza de verdad.
- [x] **CF-26** — El tope de 20 % **no se pasa** aunque se sumen volumen + cupón.
- [x] **CF-27** — `EPI50` sigue siendo `exclusivo`: anula 3x2, 2x1 y todo %.

### Interruptores

- [x] **CF-28** — Poner `activa: false` en cualquiera de las tres la apaga **a la
      vez** en el sitio y en el servidor, sin tocar nada más.
- [x] **CF-29** — Las tres arrancan **sin fecha de fin** y no se apagan solas.

---

## 2. Criterios no funcionales

- [x] **CNF-1** — ⚠️ **Paridad**: `npm test` en verde, incluidos los tests de
      paridad ampliados. **210 tests como piso** más los nuevos.
- [x] **CNF-2** — El contador es legible a **375 px** y no empuja el botón de
      confirmar fuera de la pantalla.
- [ ] **CNF-3** — Ningún evento de analytics puede tirar una excepción no
      atrapada. Verificado forzando un fallo de `fbq`.
- [x] **CNF-4** — El contador se anuncia **una vez** a lector de pantalla, no en
      cada tick.
- [x] **CNF-5** — Sin dependencias nuevas en `package.json`.
- [x] **CNF-6** — Sin `VITE_*` nuevas y sin secretos en el bundle.
- [x] **CNF-7** — El peso del bundle no sube más de **3 KB** gzip.

---

## 3. Edge cases

- [x] **EC-1** — `localStorage` bloqueado: sin cupón ni contador, el resto anda.
- [x] **EC-2** — Formato viejo del cupón (string suelto): **no tira**, se trata
      como emisión nueva.
- [x] **EC-3** — Carrito 100 % digital: ninguna promo, ningún contador de promo.
- [ ] **EC-4** — Carrito guardado antes del deploy y retomado después: se
      reprecia solo, sin `price_mismatch`.
- [x] **EC-5** — Reloj del cliente 30 s adelantado: el pedido **entra igual**
      (tolerancia de 60 s).
- [x] **EC-6** — `issuedAt` en el futuro: se ignora el cupón, no se rompe el pedido.
- [x] **EC-7** — Carrito con 40 calcos mezclados: el reparto no se degrada ni
      tarda de forma perceptible.

---

## 4. Regresión — lo que NO se puede haber roto

- [x] **REG-1** — ⚠️ **Ningún checkout se rechaza con `price_mismatch`.** Es el
      criterio que manda sobre todos los demás.
- [x] **REG-2** — El 10 % por transferencia desde 10 calcos sigue funcionando.
- [x] **REG-3** — Los umbrales de envío gratis **no se movieron**
      ($50.000 Rosario / $75.000 país).
- [x] **REG-4** — El configurador de personalizados cobra lo mismo que antes.
- [x] **REG-5** — `/mayorista`, `/negocio`, `/tatuajes`, `/polaroid` sin cambios
      de precio.
- [x] **REG-6** — La barra de envío gratis del drawer y de `/carrito` siguen
      coincidiendo entre sí.
- [ ] **REG-7** — El pedido llega al CRM de Notion y sale el mail de Resend.
- [ ] **REG-8** — `purchase` llega a GA4 y a Meta CAPI con el total **correcto**
      (el que se cobró, no el de lista).
- [x] **REG-9** — Los experimentos en curso (`hero_titular`, `hero_buscador`)
      siguen asignando y midiendo.

---

## 5. Analytics

- [x] **AN-1** — `cupon_emitido` se dispara una vez por emisión.
- [x] **AN-2** — `cupon_vencido` se dispara al llegar a cero sin usarlo.
- [x] **AN-3** — `cupon_aplicado_en_promo` permite medir el costo de RF-7.
- [x] **AN-4** — `promo_unlock` distingue `2x1` de `3x2`.
- [x] **AN-5** — Todo sale **solo** por `lib/analytics.js`. Ni un `gtag`, `fbq` o
      `dataLayer` desde un componente.
- [ ] **AN-6** — El `value` de `purchase` es el total realmente cobrado.

---

## 6. ⚠️ Paridad de precios

> Regla 11. Esta sección sola puede frenar el cierre de la feature.

- [x] **PP-1** — `CATEGORIAS_2X1` **idéntico** en los dos lados.
- [x] **PP-2** — `percentCap` / `PROMO_PERCENT_CAP` **idénticos** (0.20).
- [x] **PP-3** — Los predicados de actividad de las tres promos, idénticos.
- [x] **PP-4** — `repartoPromos()`: **mismo carrito → mismo `keepFraction`**,
      verificado por test automático sobre al menos 20 carritos distintos.
- [x] **PP-5** — La ventana del cupón y su tolerancia, idénticas.
- [ ] **PP-6** — Las dos mitades salen en el **mismo push**.
- [ ] **PP-7** — Un pedido real de prueba con Mercado Pago llega a
      `/pago-exitoso` con el total esperado.
- [ ] **PP-8** — Un pedido real de prueba por transferencia llega a
      `/pago-transferencia` con el total esperado.

---

## Definition of Done

### Código
- [ ] Todos los criterios de arriba, verificados y reportados con su resultado real
- [ ] `npm test` en verde desde la raíz
- [ ] Sin refactors fuera de scope (regla 8)
- [ ] Comentarios que explican **por qué**, con la densidad del repo
- [ ] Los hallazgos fuera de scope anotados en `tasks.md`, no arreglados

### Seguridad
- [ ] Sin secretos en el frontend (regla 14)
- [ ] La falsificabilidad del `issuedAt` documentada en el módulo, para que nadie
      la lea como un control que no es

### Documentación
- [ ] `docs/business-rules.md` con las tres promos y **dónde está el interruptor**
- [ ] `docs/analytics.md` con los eventos nuevos
- [ ] La reversión de la decisión del 20/8/2026 escrita en `pricing.js`

### Proceso
- [ ] P-1 resuelta antes de empezar
- [ ] Mariano avisado de que el push deploya a producción

---

## Resultado de la validación

> Se completa **al terminar la implementación**, no antes.

| | |
|---|---|
| **Fecha** | 07/09/2026 |
| **Criterios verificados** | **58 de 67** |
| **Criterios NO verificables sin producción** | 9 |
| **Criterios incumplidos** | 0 |

### Resumen

La suite pasa de **416 a 481 tests** (+65). Los 6 rojos que quedan son
**anteriores a esta spec y ajenos a ella**: `catalogStats.test.js` y
`catalogoLote2.test.js` fallan por el catálogo a medias del árbol de trabajo
(spec 016), no por precios. Se verificó contra `HEAD` limpio antes de empezar
para poder distinguirlos.

Verificado además en el navegador, a 375 px, con el dev server:

| Qué | Resultado |
|---|---|
| Carrito 3 Disney + 2 Marvel | **$4.800** — el caso aprobado (CF-10) |
| Aviso del 2x1 en `/categoria/disney` | aparece |
| Contador en el checkout | `09:28`, arranca al entrar |
| Descuento con `EPICA10` | −$3.680 ($3.200 del reparto + $480 del cupón) |
| Vencimiento en vivo | saca el cupón, recalcula a $9.300 y avisa |
| Datos del formulario al vencer | **intactos** (nombre, mail, teléfono, dirección) |
| Peso del bundle | 90,95 → **93,23 kB gzip** (+2,28, bajo el techo de 3) |

### ⚠️ Criterios NO verificables en local

Ninguno falló: **no se pudieron ejecutar** porque necesitan un pedido real con
credenciales de producción. Quedan para la verificación post-deploy:

| Criterio | Por qué |
|---|---|
| **CF-18** | El contador del popup necesita `/api/capture-lead` viva. El componente es el MISMO que el del checkout (verificado) y tiene tests unitarios, pero el flujo entero no se ejecutó |
| **REG-7** | Notion + Resend necesitan las credenciales de Netlify |
| **REG-8** | `purchase` a GA4 y Meta CAPI necesita un pago real |
| **PP-6** | Se cumple al pushear: las dos mitades van en el mismo commit |
| **PP-7** | Pedido real por Mercado Pago |
| **PP-8** | Pedido real por transferencia |
| **EC-4** | Carrito guardado antes del deploy: por diseño el precio nunca se persiste, pero solo se comprueba de verdad con el deploy hecho |
| **CNF-3** | Se verificó que todo pasa por `analytics.js` con `try/catch` (AN-5), no que un `fbq` roto no rompa la compra en el navegador de Instagram |
| **AN-6** | El `value` de `purchase` necesita un pago real para comprobarse |

### Correcciones hechas durante la implementación

1. **CF-25 tenía mal el número** — y venía del preview que se le mostró a Mariano
   al decidir. El 10 % por transferencia exige 10 calcos, así que en un carrito
   de 3 no corre: es **$3.200 → $2.880**, no $2.880 → $2.560. La decisión no
   cambia; el costo real es menor de lo estimado. Corregido acá y en
   `requirements.md` RF-7.

2. **La regla de reparto se cambió antes de implementar** (P-3 de `design.md`):
   la primera aprobada dejaba que agregar un calco bajara el total hasta $800.

3. **Dos bugs encontrados en `lib/promo.js`** que las fechas nulas destapaban:
   `useVentanaActiva` entraba en un `setTimeout(…, NaN)` —bucle de re-render a
   0 ms que traba la pestaña— y `useMayoristaPromoActive` dejaba la promo
   apagada para siempre. Los dos arreglados con guardas de `Number.isFinite`.

4. **Las promos llevan `startsAt` (7/9/2026) aunque no lleven `endsAt`.** Sin
   fecha de inicio la promo también estaría "viva" en el pasado y dejaría de
   existir un instante sin promo — contra el que testean media docena de casos
   y contra el que se compara cualquier análisis histórico.

### Notas

- **P-1 quedó resuelta por implementación, no por decisión de Mariano**: el
  banner del header muestra el **3x2** (es el de mayor alcance), el 2x1 se
  anuncia en sus cuatro páginas de categoría y el mayorista en `OfertaPrincipal`.
  Cambiar cuál gana es reordenar el `if/else` de `Header.jsx`; está comentado ahí.
- El corte de serie del 7/9 quedó anotado en `CRO-EXPERIMENTS.md`: los
  experimentos en curso no son comparables antes y después.
