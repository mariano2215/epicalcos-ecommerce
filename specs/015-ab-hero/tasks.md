# Tasks — A/B del hero: titular y CTA principal

| | |
|---|---|
| **Spec** | `015-ab-hero` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` |

> Autorización: Mariano pidió explícitamente *"ahora hacé los tests A/B del
> hero (P3)"* (04/09/2026).

---

- [x] 1. `lib/heroVariantes.js`: copy de las dos variantes de titular y de CTA
- [x] 2. `lib/experiments.js`: declarar `hero_titular` y `hero_cta`
- [x] 3. `components/Hero.jsx`: consumir los dos experimentos
- [x] 4. `components/AntesDespues.jsx`: resolver la colisión de copy (§3 del design)
- [x] 5. `lib/heroVariantes.test.js`: guardarraíles del copy
- [x] 6. `npm test` en verde
- [x] 7. Verificar las 4 celdas en el navegador con el override de URL
- [x] 8. Verificar `experiment_view` (uno por experimento, una vez por carga)
- [x] 9. Recorrer `acceptance.md`
