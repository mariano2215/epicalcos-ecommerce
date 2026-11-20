# Acceptance — Calcos en la primera pantalla

## 1. Criterios funcionales
- [ ] A 375 × 812, variante `calcos_arriba`: 3 calcos completas con precio y "+"
      visibles sin scroll en el Home
- [ ] El "+" suma 1 en 6 cm sin abrir el carrito y muestra el aviso
- [ ] Dos recargas seguidas muestran los mismos 6 diseños
- [ ] Sin `mas-vendidos.json` (404 forzado) se ve la lista curada con el título
      "Elegidos por nosotros"
- [ ] `/categoria/argentina` a 375 × 812: la primera fila de la grilla se ve
      sin scroll, ordenada por ventas
- [ ] Variante `fichas_40s`: el popup no abre con 60 % de scroll a los 20 s; sí
      abre al ver la segunda ficha
- [ ] El botón de WhatsApp no se cruza con "Buscar" en el Home

## 2. No funcionales
- [ ] LCP del Home en la variante ≤ LCP del control + 100 ms (Chrome headless
      con GPU, 5 corridas)
- [ ] Sin error en consola

## 3. Regresión
- [ ] El control `selector` se ve igual que hoy
- [ ] `npm test` en verde (número ≥ al de la Fase 0)

## 4. Analytics
- [ ] `view_item_list` "Home primera pantalla" y `add_to_cart` con esa lista
- [ ] Los eventos del Home llevan la variante

## 5. Paridad de precios
- [ ] Ningún archivo de pricing modificado (`git diff --stat` lo confirma)

## Definition of Done
Todo lo de arriba tildado, A/B documentado en `docs/CRO-EXPERIMENTS.md` con
fecha de inicio y fecha de lectura (2 semanas o 1.000 sesiones por variante).
