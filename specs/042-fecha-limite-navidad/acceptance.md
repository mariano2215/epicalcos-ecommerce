# Acceptance — Fecha límite real para Navidad

- [x] 25/11: la tira muestra las dos fechas
- [x] 11/12 a las 00:00 (hora AR): la tira ya no menciona el interior
- [x] Checkout con 1 calco a Córdoba el 5/12: "Pedí hasta el 10/12"
- [x] Checkout con 100 calcos a Córdoba el 5/12: no promete Navidad
- [x] 19/12: no hay aviso de Navidad en ninguna pantalla
- [x] Ningún archivo de pricing modificado; `npm test` en verde

## Definition of Done
Publicada antes del 1/12/2026 y con las fechas confirmadas por Mariano.

## Resultado de la validación (20/11/2026)

Vista previa a 375 × 812, con el reloj de la página adelantado:

| Criterio | Resultado |
|---|---|
| 25/11: la tira muestra las dos fechas | ✅ "🎄 Para Navidad: pedí hasta el 10/12 al interior y el 17/12 en Rosario" (también hoy, 20/11) |
| 11/12 00:00: la tira ya no menciona el interior | ✅ cubierto por `navidad.test.js` ("Para Navidad en Rosario: pedí hasta el 17/12") |
| Checkout 1 calco a Córdoba el 5/12 | ✅ "Para recibirlo antes de Navidad, pedí hasta el 10/12." (Rosario: 17/12) |
| Checkout 100 calcos a Córdoba el 5/12 | ✅ sin aviso; el 3/12 dice 4/12 |
| 19/12: sin aviso en ninguna pantalla | ✅ checkout con retiro: vacío; tira: test |
| Ningún archivo de pricing modificado; `npm test` en verde | ✅ 970 pasan, `git diff --stat` sin `pricing.js` |

Extra: retiro el 18/12 a las 20 h → "Para retirarlo antes de Navidad, pedí hasta
el 18/12."; carrito con 100 calcos el 3/12 → "Con 100 calcos o más, llega antes
del 24 si pedís hasta el 4/12 al interior o el 14/12 en Rosario."; sin errores en
consola; sin scroll horizontal.
