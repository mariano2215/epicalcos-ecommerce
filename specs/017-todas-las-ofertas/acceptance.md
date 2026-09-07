# Acceptance — Todas las ofertas juntas + cupón con vencimiento por usuario

| | |
|---|---|
| **Spec** | `017-todas-las-ofertas` |
| **Estado** | `DRAFT` |
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

- [ ] **CF-1** — 3 calcos cualesquiera de 6 cm: se paga **$3.200**, no $4.800.
- [ ] **CF-2** — 2 calcos: no hay descuento (no llega al trío).
- [ ] **CF-3** — 6 calcos: 2 gratis.
- [ ] **CF-4** — La unidad regalada es la **más barata** con tamaños mezclados.
- [ ] **CF-5** — Los personalizados (`custom`) participan; los packs, mayorista,
      Negocio, fijos y digitales **no**.

### 2x1 por categoría

- [ ] **CF-6** — 2 calcos de Disney: **1 gratis**.
- [ ] **CF-7** — 1 solo calco de Disney: **sin descuento**, y esa unidad queda
      disponible para la bolsa del 3x2.
- [ ] **CF-8** — 2 de Disney + 2 de anime: las 4 van a la misma bolsa 2x1 → **2 gratis**.
- [ ] **CF-9** — Una categoría fuera de las 4 (ej. `marvel`) **no** entra al 2x1.
- [ ] **CF-10** — ⭐ **El caso aprobado**: 3 Disney + 2 de otra categoría, 6 cm →
      **2 gratis**, total **$4.800**.

### Reparto (el corazón de la spec)

- [ ] **CF-11** — ⭐ Agregar un calco al carrito **nunca** reduce la cantidad de
      calcos gratis. Verificado por test automático de barrido, no a ojo.
- [ ] **CF-12** — ⭐ Agregar un calco al carrito **nunca baja el total**. Es el
      criterio que hizo descartar la primera regla aprobada: el test tiene que
      barrer al menos **50.000 transiciones** (0-7 unidades de categoría × 0-6
      del resto × los tres tamaños) y no encontrar ninguna.
- [ ] **CF-13** — El reparto elegido es el de **mayor descuento posible**,
      comparado contra la enumeración completa de subconjuntos en carritos chicos.
- [ ] **CF-14** — El `keepFraction` es **uno solo** y da precios por unidad
      **positivos** en todas las líneas (Mercado Pago rechaza ≤ 0).
- [ ] **CF-15** — Con dos repartos empatados en descuento, los dos lados del
      espejo eligen **el mismo**. Un desempate distinto da `price_mismatch`.

### Mayorista

- [ ] **CF-16** — 100 calcos a **$39.999** total en `/mayorista`.
- [ ] **CF-17** — El mayorista **no** se mezcla con el 3x2 ni con el 2x1: ya trae
      su precio final.

### Cupón con ventana

- [ ] **CF-18** — Al dejar el mail, el popup entrega el código **y** muestra un
      contador de 10:00.
- [ ] **CF-19** — El checkout muestra el **mismo** contador desde que se entra.
- [ ] **CF-20** — Con el cupón vigente, `EPICA10` descuenta **de verdad** encima
      de la promo (RF-7).
- [ ] **CF-21** — A los 10 minutos, el cupón se saca solo, el total se recalcula
      y **se avisa con un mensaje explícito**.
- [ ] **CF-22** — Al vencer **no se borra ningún dato ya tipeado** en el formulario.
- [ ] **CF-23** — Un pedido con el cupón vencido **se procesa igual**, sin el
      descuento. **No se rechaza.**
- [ ] **CF-24** — Dos navegadores que dejan el mail con 5 min de diferencia
      tienen ventanas **distintas**.

### Acumulación

- [ ] **CF-25** — 3 calcos de 6 cm + transferencia + `EPICA10` = **$2.560**
      (1 gratis, después 20 %).
- [ ] **CF-26** — El tope de 20 % **no se pasa** aunque se sumen volumen + cupón.
- [ ] **CF-27** — `EPI50` sigue siendo `exclusivo`: anula 3x2, 2x1 y todo %.

### Interruptores

- [ ] **CF-28** — Poner `activa: false` en cualquiera de las tres la apaga **a la
      vez** en el sitio y en el servidor, sin tocar nada más.
- [ ] **CF-29** — Las tres arrancan **sin fecha de fin** y no se apagan solas.

---

## 2. Criterios no funcionales

- [ ] **CNF-1** — ⚠️ **Paridad**: `npm test` en verde, incluidos los tests de
      paridad ampliados. **210 tests como piso** más los nuevos.
- [ ] **CNF-2** — El contador es legible a **375 px** y no empuja el botón de
      confirmar fuera de la pantalla.
- [ ] **CNF-3** — Ningún evento de analytics puede tirar una excepción no
      atrapada. Verificado forzando un fallo de `fbq`.
- [ ] **CNF-4** — El contador se anuncia **una vez** a lector de pantalla, no en
      cada tick.
- [ ] **CNF-5** — Sin dependencias nuevas en `package.json`.
- [ ] **CNF-6** — Sin `VITE_*` nuevas y sin secretos en el bundle.
- [ ] **CNF-7** — El peso del bundle no sube más de **3 KB** gzip.

---

## 3. Edge cases

- [ ] **EC-1** — `localStorage` bloqueado: sin cupón ni contador, el resto anda.
- [ ] **EC-2** — Formato viejo del cupón (string suelto): **no tira**, se trata
      como emisión nueva.
- [ ] **EC-3** — Carrito 100 % digital: ninguna promo, ningún contador de promo.
- [ ] **EC-4** — Carrito guardado antes del deploy y retomado después: se
      reprecia solo, sin `price_mismatch`.
- [ ] **EC-5** — Reloj del cliente 30 s adelantado: el pedido **entra igual**
      (tolerancia de 60 s).
- [ ] **EC-6** — `issuedAt` en el futuro: se ignora el cupón, no se rompe el pedido.
- [ ] **EC-7** — Carrito con 40 calcos mezclados: el reparto no se degrada ni
      tarda de forma perceptible.

---

## 4. Regresión — lo que NO se puede haber roto

- [ ] **REG-1** — ⚠️ **Ningún checkout se rechaza con `price_mismatch`.** Es el
      criterio que manda sobre todos los demás.
- [ ] **REG-2** — El 10 % por transferencia desde 10 calcos sigue funcionando.
- [ ] **REG-3** — Los umbrales de envío gratis **no se movieron**
      ($50.000 Rosario / $75.000 país).
- [ ] **REG-4** — El configurador de personalizados cobra lo mismo que antes.
- [ ] **REG-5** — `/mayorista`, `/negocio`, `/tatuajes`, `/polaroid` sin cambios
      de precio.
- [ ] **REG-6** — La barra de envío gratis del drawer y de `/carrito` siguen
      coincidiendo entre sí.
- [ ] **REG-7** — El pedido llega al CRM de Notion y sale el mail de Resend.
- [ ] **REG-8** — `purchase` llega a GA4 y a Meta CAPI con el total **correcto**
      (el que se cobró, no el de lista).
- [ ] **REG-9** — Los experimentos en curso (`hero_titular`, `hero_buscador`)
      siguen asignando y midiendo.

---

## 5. Analytics

- [ ] **AN-1** — `cupon_emitido` se dispara una vez por emisión.
- [ ] **AN-2** — `cupon_vencido` se dispara al llegar a cero sin usarlo.
- [ ] **AN-3** — `cupon_aplicado_en_promo` permite medir el costo de RF-7.
- [ ] **AN-4** — `promo_unlock` distingue `2x1` de `3x2`.
- [ ] **AN-5** — Todo sale **solo** por `lib/analytics.js`. Ni un `gtag`, `fbq` o
      `dataLayer` desde un componente.
- [ ] **AN-6** — El `value` de `purchase` es el total realmente cobrado.

---

## 6. ⚠️ Paridad de precios

> Regla 11. Esta sección sola puede frenar el cierre de la feature.

- [ ] **PP-1** — `CATEGORIAS_2X1` **idéntico** en los dos lados.
- [ ] **PP-2** — `percentCap` / `PROMO_PERCENT_CAP` **idénticos** (0.20).
- [ ] **PP-3** — Los predicados de actividad de las tres promos, idénticos.
- [ ] **PP-4** — `repartoPromos()`: **mismo carrito → mismo `keepFraction`**,
      verificado por test automático sobre al menos 20 carritos distintos.
- [ ] **PP-5** — La ventana del cupón y su tolerancia, idénticas.
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
| **Fecha** | |
| **Criterios cumplidos** | / |
| **Criterios no cumplidos** | |

### Resumen

_(pendiente)_

### Criterios no cumplidos

_(pendiente — si hay alguno, se dice; no se cierra la feature)_

### Notas

_(pendiente)_
