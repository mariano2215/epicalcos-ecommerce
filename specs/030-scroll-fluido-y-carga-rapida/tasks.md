# Tasks — Scroll fluido y contenido que aparece rápido

| | |
|---|---|
| **Spec** | `030-scroll-fluido-y-carga-rapida` |
| **Design** | [`design.md`](design.md) |

- [x] **0** Discovery con mediciones (design §0)
  - *Verificación*: tabla de variantes con mediana de 3 corridas, con GPU
- [ ] **1** Mariano aprueba P-1 a P-3 → recién ahí se implementa
  - *Verificación*: respuesta en la conversación
- [ ] **2** Banner y cuenta regresiva con `transform` (design §1.1)
  - *Verificación*: `getAnimations()` en el Home sin `background-position` ni `left`; captura antes/después del banner igual
- [ ] **3** `.gradient-text` y `.page-gradient` sin animación (§1.2-1.3)
  - *Verificación*: ninguna animación de `background-position` en Home, categoría, carrito y checkout
- [ ] **4** `.card-glass` y `.btn-secondary` sin `backdrop-filter` (§1.4)
  - *Verificación*: captura antes/después de una grilla y del carrito
- [ ] **5** `Reveal` antes y más corto (§1.5)
  - *Verificación*: arnés de huecos: ≤ 10 % de cuadros con una sección invisible
- [ ] **6** `.grid-rise` más corto; "Ver más" sin espera (§1.6)
  - *Verificación*: 48 calcos a la vista en ≤ 0,5 s
- [ ] **7** Headers de caché en `netlify.toml` (§1.7)
  - *Verificación*: `curl -I` en producción después del deploy
- [ ] **8** Medición después: metas de requirements §2
- [ ] **9** `npm test`, `vite build`, recorrido a 375 px y con movimiento reducido
- [ ] **10** `docs/analytics.md` (qué mirar antes/después) y acceptance
