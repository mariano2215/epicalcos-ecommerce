# Design — Fecha límite real para Navidad

| | |
|---|---|
| **Spec** | `042-fecha-limite-navidad` |

## 0. Hallazgos del discovery
- `config/site.js`: `production`, `deliveryRosario`, `deliveryInterior` (los
  `delivery*` son el total con producción) y `produccionVolumen` /
  `produccionVolumenDesde` (100+, espejado en
  `netlify/functions/lib/plazoProduccion.js`).
- `anunciosVigentes(now)` en `config/site.js` arma la tira (`AnnouncementBar`) y
  ya se recalcula con la hora en cada render (precedente: el 2x1 que se apaga).
- `lib/plazoProduccion.js` cuenta calcos del carrito.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** Objeto `NAVIDAD_2026` en `config/site.js` con las fechas ISO con `-03:00` | constantes en cada componente | regla del repo: los textos de envío salen del config |
| **D-2** Función pura `fechaLimiteNavidad({ zona, calcos, ahora })` en `lib/navidad.js` con test | lógica en JSX | se testea sin React |
| **D-3** La frase entra por `anunciosVigentes` | componente aparte en el header | la tira ya existe y ya se apaga por fecha |

## 2. Componentes afectados
- `config/site.js` (agrega `NAVIDAD_2026` y una frase en `anunciosVigentes`).
  ⚠️ 41 importadores: solo se agrega; `anuncios.test.js` cubre la tira.
- `lib/navidad.js` + `lib/navidad.test.js` (nuevos).
- `routes/Producto.jsx` (línea junto a plazos), `components/CheckoutForm.jsx`
  (línea junto al plazo de la zona).
- No toca precios ni el servidor: el mail de confirmación queda igual.

## 3. Datos
```js
export const NAVIDAD_2026 = {
  interior: '2026-12-10T23:59:59-03:00', rosario: '2026-12-17T23:59:59-03:00',
  retiro: '2026-12-18T23:59:59-03:00',
  volumenInterior: '2026-12-04T23:59:59-03:00', volumenRosario: '2026-12-14T23:59:59-03:00'
};
```

## 9. Testing
`navidad.test.js`: cada zona antes y después del corte, 99 vs 100 calcos, hora
de Argentina con el reloj del test en UTC.

## 10. Dependencias nuevas
Ninguna (el formateo de fechas es propio, como en `lib/formato.js`).
