# Acceptance — Scroll fluido y contenido que aparece rápido

| | |
|---|---|
| **Spec** | `030-scroll-fluido-y-carga-rapida` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | — |
| **Resultado** | ⬜ pendiente de aprobación |

Mediciones en las condiciones de design §0 (375 px, CPU ×4, GPU, mediana de 3).

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 | *(RF-1)* El banner del header se ve igual y no anima `background-position` ni `left` | captura + `getAnimations()` | ⬜ |
| AC-2 | *(RF-2, RF-3)* Ninguna animación de `background-position` en Home, categoría, carrito ni checkout | `getAnimations()` | ⬜ |
| AC-3 | *(RF-4)* Tarjetas y botones sin `backdrop-filter`, mismo aspecto | captura antes/después | ⬜ |
| AC-4 | *(RF-5)* Home: ≤ 10 % de cuadros con una sección invisible en pantalla (hoy 72 %) | arnés de huecos | ⬜ |
| AC-5 | *(RF-6)* Categoría: las 48 calcos a la vista en ≤ 0,5 s; "Ver más" sin espera | medición en la página | ⬜ |
| AC-6 | *(RF-7)* `/assets/*` con `max-age=31536000, immutable`; imágenes y datos con `stale-while-revalidate`; el HTML sigue revalidando | `curl -I` en producción | ⬜ |
| AC-7 | *(RF-8)* Con movimiento reducido, sin animaciones | emulación | ⬜ |
| ANF-1 | Home: cuadros trabados ≤ 8 % (hoy 18 %) | arnés de scroll | ⬜ |
| ANF-2 | Categoría: p95 ≤ 33 ms (hoy 50 ms) | arnés de scroll | ⬜ |
| ANF-3 | LCP del Home no empeora; CLS ≤ 0,05 | arnés de LCP | ⬜ |
| REG-1 | `npm test` en verde, `vite build` OK | local | ⬜ |
| AC-8 | Mariano aprobó P-1 a P-3 | conversación | ⬜ |

## Definition of Done

Todos los criterios en ✅, `docs/analytics.md` con qué mirar antes/después, y el
commit en `main`.
