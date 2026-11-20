# Tasks — Calcos en la primera pantalla

## ⛔ Antes de tocar una sola línea
La implementación arranca solo cuando Mariano dice *"Implementá la spec 038"*.
- [ ] Respuestas a P-1, P-2 y P-3 escritas en `requirements.md` §12

## Fase 0 — Preparación
- [ ] **0.1** Suite en verde (`npm test`), anotar el número
- [ ] **0.2** Releer Home, HeroSelector, FeaturedStickers, Category, WelcomePopup
      y sus tests

## Fase 1 — Ranking
- [ ] **1.1** `lib/masVendidos.js` con `rankear(pedidos, {dias, minimo})` y test
- [ ] **1.2** `scripts/build-mas-vendidos.mjs` escribe `public/data/mas-vendidos.json`
      sin datos personales (verificación: `grep -E "@|email|nombre" ` da vacío)
- [ ] **1.3** `config/masVendidos.js` con la lista de P-1

## Fase 2 — Home
- [ ] **2.1** `home_producto` en `lib/experiments.js` (control `selector`)
- [ ] **2.2** `FilaMasVendidos.jsx` con 6 `StickerCard` y `openDrawer:false`
- [ ] **2.3** `HeroSelector` compacto en la variante
- [ ] **2.4** `FeaturedStickers` lee el ranking; título según la fuente
- [ ] **2.5** WhatsApp no tapa "Buscar" (verificación: rectángulos sin cruce a 375 px)

## Fase 3 — Categoría
- [ ] **3.1** Orden por ranking
- [ ] **3.2** Chips de material y producción plegables; la grilla se ve a 375 × 812

## Fase 4 — Popup
- [ ] **4.1** Variante `fichas_40s` en `POPUP_VARIANTES` y `popup_momento` activo
- [ ] **4.2** `popup_view` lleva la variante

## Fase 5 — Cierre
- [ ] **5.1** `npm test` en verde
- [ ] **5.2** Verificación en la vista previa (375 px y escritorio)
- [ ] **5.3** `docs/CRO-EXPERIMENTS.md`: alta de los dos A/B con fecha de inicio
- [ ] **5.4** Recorrer `acceptance.md`

## Hallazgos fuera de scope
- Categorías del Home en carrusel, beneficios en una fila, FAQ del Home en 6.
