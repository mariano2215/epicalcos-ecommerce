# Requirements — Carrito y checkout sin sorpresas

| | |
|---|---|
| **Spec** | `039-carrito-y-checkout-sin-sorpresas` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

El precio final aparece tarde y por partes. Observado el 20/11/2026 en celular:

- **Ficha y grilla**: el 10 % por transferencia está escrito como texto; el
  número ($1.890 para una calco de 6 cm) no aparece en ninguna parte antes del
  carrito. En Argentina el precio con transferencia se lee como un precio.
- **Carrito lateral**: muestra la barra de envío gratis ("te faltan $32.900")
  pero no cuánto cuesta el envío si no se llega. El costo aparece recién en el
  checkout.
- **Checkout**: en el celular el resumen "Tu pedido" con envío y total está a
  ~2.100 px, **después** de los 9 campos. Con 1 calco: $2.100 + $4.500 de envío
  = $6.600, y la persona se entera al final del formulario.
- **Ciudad y provincia** vienen precargadas como Rosario / Santa Fe: el cliente
  del interior (21 % de los pedidos) tiene que corregirlas, y si no lo hace, el
  envío calculado es el de Rosario.
- **Mercado Pago** se describe sin mencionar cuotas.

Evidencia: el 40 % de los que abandonan un checkout lo hace por costos extra que
no esperaba y el 12 % porque no vio el total antes (Baymard 2026).

## 2. Objetivo

Que la persona vea el precio con transferencia desde la ficha y el total con
envío antes de completar datos.

**Cómo se sabrá que funcionó**: sube `purchase / begin_checkout` en GA4 en las 4
semanas siguientes contra las 4 anteriores, sin que suba la proporción de
pedidos del interior cobrados con tarifa de Rosario.

## 3. Scope

- [ ] Precio doble en ficha y grilla: lista y con transferencia, como números.
- [ ] Carrito lateral: costo de envío estimado según la zona, debajo del subtotal.
- [ ] Checkout en celular: resumen plegable arriba con el total con envío.
- [ ] Ciudad y provincia sin precargar.
- [ ] Mercado Pago: mencionar cuotas solo si están confirmadas (P-2).
- [ ] A/B `carrito_primer_add`: desde la ficha, el carrito se abre solo en el
      primer agregado de la sesión; después, solo el aviso y el contador.

## 4. Fuera de scope

- Tarifas y umbrales de envío: no cambian (decisión del 11/8/2026).
- El hito de regalo en el carrito: spec 043.
- El tachado de $127.999 de Promo Negocio: se anota como hallazgo (es otra
  pantalla y otra decisión comercial).
- Animación de la calco que vuela al carrito: spec 045.

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Comprador en celular | Ve el total antes de escribir sus datos |
| Cliente del interior | No tiene que borrar "Rosario" |
| Quien paga por transferencia | Ve su precio desde la ficha |

## 6. User stories

- Como comprador, quiero ver cuánto pago por transferencia en la ficha, para
  decidir el medio antes de llegar al checkout.
- Como comprador del interior, quiero saber cuánto sale el envío antes de llenar
  el formulario, para no sentirme engañado al final.

## 7. Requisitos funcionales

- **RF-1** Ficha: debajo del precio de lista, "$1.890 con transferencia" (el
  número calculado con la misma regla de redondeo que el servidor).
- **RF-2** Grilla: el precio con transferencia como segunda línea chica.
- **RF-3** Productos donde la transferencia no aplica (si los hay, o una promo
  que la anula) no muestran el precio doble.
- **RF-4** Carrito lateral: "Envío: $4.500 en Rosario · $8.500 al resto del país
  · gratis desde $35.000 / $55.000", con los valores del config, sin pedir datos.
- **RF-5** Checkout en celular: arriba del formulario, una barra "Tu pedido ·
  $6.600 con envío" que se despliega con el detalle. Se actualiza al cambiar
  zona y medio de pago.
- **RF-6** Mientras no hay zona elegida, el total arriba dice "+ envío según
  zona" con el rango, nunca un número que después cambie sin aviso.
- **RF-7** Ciudad y provincia vacías; provincia como lista. El envío se calcula
  cuando hay provincia y ciudad.
- **RF-8** Retiro en Rosario sigue disponible y sigue sin costo.

## 8. Requisitos no funcionales

- El precio doble no puede aumentar el alto de la tarjeta de la grilla en más de
  una línea.
- El resumen plegable es accesible con teclado y anuncia su estado
  (`aria-expanded`).

## 9. Reglas de negocio

- El precio con transferencia es `redondeo(lista × (1 − 10 %))` por unidad, igual
  que la revalidación del servidor. Si cambia `TRANSFER_DISCOUNT`, cambia solo.
- Con cupón activo (EPICA10) el total del checkout lo dice; la ficha muestra solo
  lista y transferencia.
- No se promete cuotas sin interés si no están configuradas en Mercado Pago.

## 10. Edge cases

- Carrito 100 % digital: sin línea de envío.
- Pedido que cruza el umbral solo con transferencia: el resumen lo muestra al
  elegir transferencia.
- Ciudad próxima de Santa Fe (Funes, etc.): tarifa intermedia de $6.500.
- Carritos guardados en `localStorage`: no cambia la forma de las líneas.

## 11. Analytics necesarios

### Eventos nuevos
- `resumen_checkout_abierto` (despliega el resumen arriba).

### Eventos existentes que cambian
- `add_shipping_info` sin cambios; `begin_checkout` lleva la variante de
  `carrito_primer_add`.

### Qué se quiere poder responder
- ¿Baja el abandono entre `begin_checkout` y `purchase`?
- ¿Sube la proporción de pagos por transferencia?

## 12. Preguntas abiertas

- [ ] **P-1** ¿Querés el precio con transferencia también en los packs y el x100?
- [ ] **P-2** ¿Mercado Pago tiene cuotas habilitadas en la cuenta? ¿Con o sin
      interés y desde qué monto? Sin respuesta, no se menciona.
- [ ] **P-3** ¿Te sirve "Envío desde $4.500" en el carrito o preferís las dos
      tarifas siempre visibles?
