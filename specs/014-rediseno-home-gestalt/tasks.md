# Tasks — Rediseño de la Home (Gestalt, jerarquía y conversión)

| | |
|---|---|
| **Spec** | `014-rediseno-home-gestalt` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `COMPLETADA` |

> Autorización: Mariano pidió explícitamente *"ejecutá estos cambios uno por
> uno"* sobre el brief del rediseño (04/09/2026).

---

## P0 — Crítico

- [x] 1. `config/site.js`: `announcements` → 2 mensajes comerciales
- [x] 2. `AnnouncementBar`: un mensaje por vez, con crossfade y reduced-motion
- [x] 3. `Header`: no renderizar el ticker cuando hay promo activa
- [x] 4. `lib/catalogoBusqueda.js`: caché compartida de los manifests
- [x] 5. `lib/busquedasSugeridas.js`: chips + recientes
- [x] 6. `components/BuscadorCalcos.jsx`: motor reutilizable
- [x] 7. `components/BuscadorModal.jsx`: pantalla completa mobile
- [x] 8. `Header`: botón de buscar (mobile y desktop) + header compacto al scroll
- [x] 9. `Hero`: reescrito — H1 dominante, subtítulo, 2 CTAs
- [x] 10. Borrar `RotatingHeadline.jsx` y su CSS
- [x] 11. `components/BuscadorSeccion.jsx`: sección "¿Qué te gusta?"
- [x] 12. `styles/index.css`: `.seccion`, `.chip-busqueda`, estados interactivos

## P1 — Alto impacto

- [x] 13. `IntentSelector`: copy del brief §9, misma estructura en las 3 cards
- [x] 14. `FeaturedStickers`: título "Los más elegidos", un badge máximo
- [x] 15. Categorías destacadas: `category_click` con nombre y posición
- [x] 16. `components/AntesDespues.jsx`
- [x] 17. `components/MetricasConfianza.jsx` + `.metrica`
- [x] 18. `components/Beneficios.jsx` + `beneficios` en `config/brandStats.js`
- [x] 19. `data/ugc.js` + `components/GaleriaUGC.jsx`
- [x] 20. `Testimonials`: imagen dominante + carrusel mobile

## P2 — Conversión

- [x] 21. `components/OfertaPrincipal.jsx` (reemplaza banner + "Packs y servicios")
- [x] 22. `HowToBuy`: copy del brief §19
- [x] 23. `FAQ`: preguntas faltantes del brief §20
- [x] 24. `components/CtaFinal.jsx`
- [x] 25. `routes/Home.jsx`: nueva arquitectura, orden del brief §3
- [x] 26. `lib/analytics.js`: 6 eventos nuevos + `promo_unlock` en el carrito

## Cierre

- [x] 27. Tests nuevos (`busquedasSugeridas`, `anuncios`, `ugc`)
- [x] 28. `npm test` en verde
- [x] 29. Verificación real a 375 px y en desktop sobre el dev server
- [x] 30. Recorrer `acceptance.md` punto por punto

---

## Hallazgos fuera de scope (regla 8 — anotados, no arreglados)

1. **"Los más elegidos" no sale de un dato de ventas.** Son cuatro diseños al
   azar de cuatro categorías, uno por carga. La promesa ya estaba viva ("Los más
   vendidos") y se mantuvo, pero para sostenerla haría falta el ranking real.
   Ver el comentario en `components/FeaturedStickers.jsx`.
2. **Las etiquetas del nav** (`navLinks` en `config/site.js`) no se tocaron: el
   nav aparece en TODAS las páginas y renombrarlo excede el rediseño del Home.
3. **El nombre del calco en la card mide 14 px de alto.** El objetivo táctil
   real es la imagen (≥ 44 px) que lleva al mismo lado. Viene de la spec 013.

## Fuera de scope, arreglado igual (rompían un criterio de esta spec)

- **Los tabs de la FAQ desbordaban la página**: los cuatro en una línea medían
  396 px y a 375 px daban scroll horizontal a TODA la Home (ANF-1). Ahora
  `flex-wrap` y 44 px de alto.
- **El modal de búsqueda quedaba encerrado en el header**: `backdrop-filter`
  convierte al header en bloque contenedor de sus hijos `position: fixed`. El
  modal se movió a hermano del `<header>`.
