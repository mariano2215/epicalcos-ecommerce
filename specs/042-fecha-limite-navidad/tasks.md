# Tasks — Fecha límite real para Navidad

## ⛔ Antes de tocar una sola línea
La implementación arranca solo cuando Mariano dice *"Implementá la spec 042"*.
- [x] P-1, P-2 y P-3 respondidas; fechas finales en RF-1

## Fase 1
- [x] **1.1** `NAVIDAD_2026` en `config/site.js`
- [x] **1.2** `lib/navidad.js` + test (verificación: 10 casos en verde)
- [x] **1.3** Frase en `anunciosVigentes` + caso en `anuncios.test.js`
- [x] **1.4** Línea en la ficha y en el checkout
## Fase 2 — Cierre
- [x] **2.1** `npm test` en verde
- [x] **2.2** Vista previa a 375 px con la hora forzada al 9/12, 11/12 y 19/12
- [x] **2.3** Publicar antes del 1/12/2026
- [x] **2.4** Recorrer `acceptance.md`

## Bitácora
- 20/11/2026 — Implementada. `NAVIDAD_2026` en `config/site.js`; funciones puras
  en `lib/navidad.js` (sin importar el config, para no armar un ciclo con
  `anunciosVigentes`); `components/AvisoNavidad.jsx` en `ShippingInfo` (ficha,
  carrito, landings) y en `CheckoutForm` (envío y retiro). 11 tests nuevos en
  `navidad.test.js`; suite 970/970.
- La tira pasa de 3 a 4 frases mientras rige: la duración de la animación está
  pensada para 4 (spec 020), así que no se acelera.
- Hallazgo: con la ciudad precargada en Rosario (ver spec 039) el checkout
  arranca mostrando la fecha de Rosario hasta que la persona cambia la ciudad.
