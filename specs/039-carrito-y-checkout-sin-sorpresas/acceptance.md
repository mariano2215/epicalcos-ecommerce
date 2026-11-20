# Acceptance — Carrito y checkout sin sorpresas

## 1. Funcionales
- [ ] Ficha de 6 cm: "$2.100" y "$1.890 con transferencia"
- [ ] Grilla: el mismo número que la ficha
- [ ] Carrito con 1 calco: se lee el costo de envío sin ir al checkout
- [ ] Checkout a 375 px, carrito de 1 calco, provincia Córdoba: el total con
      envío ($10.600) se ve arriba sin scroll
- [ ] Ciudad y provincia arrancan vacías
- [ ] Retiro en Rosario: total sin envío
- [ ] Variante `carrito_primer_add`: el segundo "Agregar al carrito" de la ficha
      no abre el drawer

## 2. Paridad de precios
- [ ] Test de paridad de `precioConTransferencia` en verde
- [ ] Un checkout real por transferencia en la vista previa no da `price_mismatch`

## 3. Regresión
- [ ] `npm test` en verde
- [ ] Carritos viejos en `localStorage` cargan igual

## Definition of Done
Todo tildado y `docs/analytics.md` actualizado.
