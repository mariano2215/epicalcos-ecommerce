# Acceptance — EPICYBER WEEK 2026

| | |
|---|---|
| **Spec** | `036-epicyber-week-2026` |
| **Estado** | `IN PROGRESS` |

## Campaña

- [x] CA-1 · Antes de las 00:00 del 2/11 el servidor cobra el habitual; a las 00:00 cobra el Cyber. — *test de bordes*
- [x] CA-2 · A las 23:59:59 del 8/11 cobra el Cyber; un milisegundo después, el habitual. — *test de bordes*
- [x] CA-3 · Un pack sin aprobar vale el habitual con la campaña prendida. — *test*
- [x] CA-4 · Sin packs aprobados no hay barra, banner ni `/epicyber`. — *test y navegador*
- [x] CA-5 · Con la campaña apagada, el Home no cambia. — *navegador: misma barra, sin secciones nuevas*
- [x] CA-6 · `?epicyber=preview` muestra todo con la campaña apagada y el aviso de vista previa; `?epicyber=off` lo saca. — *navegador*
- [x] CA-7 · En vista previa, un pack Cyber no se puede pagar y el mensaje lo explica. — *navegador: mensaje y cero llamadas de pago*

## Precios

- [x] CA-8 · Los dos lados del espejo coinciden campo por campo. — *test*
- [x] CA-9 · Todo pack cuesta menos que su habitual y más que su costo, en 4 y 6 cm. — *test, también con transferencia*
- [x] CA-10 · La escalera baja el precio por calco en cada escalón. — *test*
- [x] CA-11 · 9 cm, cantidad fuera de tabla y `quantity ≠ 1` se rechazan. — *test*
- [x] CA-12 · El pack cobra el número exacto del cartel. — *test, los 11 packs en 4 y 6 cm*
- [x] CA-13 · Transferencia: `round(precio × 0,9)`. — *test*
- [x] CA-14 · EPICA10 no toca el pack; EPI50 solo anula la transferencia. — *test*
- [x] CA-15 · Un carrito guardado con una línea vencida compra al habitual sin error. — *test y navegador*
- [x] CA-16 · De 1 a 9 calcos los precios no cambian. — *test*

## Compra

- [x] CA-17 · Pack chico: elegir, completar, ver el tachado en el carrito. — *navegador: x20, $42.000 tachado, $11.990*
- [x] CA-18 · Pack mayorista con diseños propios. — *navegador con el contador de diseños propios; **sin subir un archivo real a Cloudinary***
- [x] CA-19 · El envío de un x30 en Rosario es $4.500 y un x200 viaja gratis a todo el país. — *test*
- [x] CA-20 · Pasar de x20 a x30 desde el carrito conserva los diseños y deja una sola línea. — *navegador: x20 → x25, una línea*
- [x] CA-21 · Calcos sueltas pasan al pack con sus diseños. — *navegador: 7 sueltas → x10, conservó diseños y tamaño*
- [x] CA-22 · Se puede seguir comprando sin tocar ningún upsell. — *navegador*
- [x] CA-23 · Un pedido de 100 o más lleva el plazo de 3 a 5 días. — *test en los dos lados*

## Mobile y accesibilidad

- [x] CA-24 · Sin scroll horizontal a 375 px. — *medido en Home, /epicyber y /mayorista*
- [x] CA-25 · Los botones de pack miden 44 px y anuncian su estado. — *medido: 45 px, `aria-pressed`*

## Tracking

- [x] CA-26 · `view_promotion` y `select_promotion` llevan `epicyber_2026`, una vez por vista. — *test y navegador*
- [x] CA-27 · `add_to_cart`, `begin_checkout` y `purchase` llevan pack, unidades y descuento en el ítem. — *test*
- [x] CA-28 · Una línea sin campaña no cambia su ítem. — *test*

## Definition of Done

- [x] `npm test` en verde: 906 pasan y 17 se saltean. Simulada prendida y en fecha, solo fallan los 2 tests que dependen de las fechas movidas para simular.
- [x] Build de producción sin errores.
- [x] Vencimiento en vivo: con una pestaña abierta, sin recargar, $13.990 pasó a $48.000 y la barra volvió a la de siempre.
- [ ] **Sin verificar:** un pago real de punta a punta. `netlify dev` no corre en esta máquina, así que el camino del servidor está probado contra `validateAndPriceOrder`, no contra Mercado Pago.
- [ ] Mariano aprobó precios y dio la orden de publicar.
