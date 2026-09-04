# Acceptance — A/B del hero: titular y CTA principal

| | |
|---|---|
| **Spec** | `015-ab-hero` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 04/09/2026 |
| **Resultado** | ✅ aceptada |

> Verificado sobre el dev server a 375 px, forzando las cuatro celdas con el
> override de URL (`CLAUDE.md` regla 15).

---

## 1. Criterios funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | El hero muestra uno de dos titulares | `catalogo` → H1 "Calcos para todo lo que te gusta"; `objeto` → H1 "Tu termo. Pero más vos.", cada uno con su subtítulo | ✅ |
| AC-2 *(RF-2)* | El hero muestra uno de dos CTA | `ver_disenos` → "Ver todos los diseños"; `encontra_calcos` → "Encontrá tus calcos" | ✅ |
| AC-3 *(RF-3)* | Los dos experimentos se asignan de forma independiente | Celda mixta verificada en vivo: H1 "Calcos para todo lo que te gusta" **con** CTA "Encontrá tus calcos". Las 4 celdas renderizan | ✅ |
| AC-4 *(RF-4)* | La variante es estable entre recargas | Asignado `{hero_titular: catalogo, hero_cta: encontra_calcos}`, recarga **sin** override → mismo H1 y mismo CTA, y el estado guardado no cambió | ✅ |
| AC-5 *(RF-5)* | Asignación sincrónica, sin parpadeo ni salto | `useExperiment` asigna en el inicializador de `useState`: la variante está en el primer render. Los hero miden 477 px (`catalogo`) y 444 px (`objeto`) — son alturas **distintas entre visitantes**, no un salto dentro de una sesión | ✅ |
| AC-6 *(RF-6)* | Interruptor de emergencia por experimento | `active: false` manda a control por encima de lo guardado — cubierto por `experiments.test.js` ("el kill switch manda por encima de lo ya guardado") | ✅ |
| AC-7 *(RF-7)* | Se puede forzar una variante desde la URL | `?exp_hero_titular=objeto&exp_hero_cta=encontra_calcos` renderizó esa celda y la dejó guardada | ✅ |
| AC-8 *(RF-8)* | Exposición reportada una vez por experimento y por carga | `dataLayer`: exactamente **2** `experiment_view` por carga — `hero_titular=objeto` y `hero_cta=encontra_calcos` —, cada uno con su `user_properties` (`exp_hero_titular`, `exp_hero_cta`) | ✅ |
| AC-9 *(RF-9)* | Toda variante del titular nombra el producto | `catalogo`: "Calcos" en el H1. `objeto`: "Miles de **calcos** para que tus cosas se parezcan a vos" en el subtítulo. Lo exige `heroVariantes.test.js` para cualquier variante futura | ✅ |
| AC-10 *(RF-10)* | Sólo cambia lo que se mide | En las 4 celdas el CTA secundario siguió siendo "Hacer mis propias calcos"; fondo, espaciado y `StickerField` idénticos | ✅ |

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| ANF-1 | Sin librerías nuevas | `frontend/package.json` sin cambios; se reusa `lib/experiments.js` | ✅ |
| ANF-2 | Sin scripts bloqueantes ni parpadeo | Nada nuevo en el `<head>`. Bundle 276,65 → **278,55 kB** (+1,9 kB: el copy de las variantes) | ✅ |
| ANF-3 | Sin PII | El `_vid` ya existía y es un random propio | ✅ |
| ANF-4 | Con `localStorage` bloqueado cae a control | Cubierto por `experiments.test.js` ("sin localStorage cae a control en vez de tirar"); el hero suma su propio `?? TITULARES.catalogo` | ✅ |
| ANF-5 | SEO: `title`, meta y JSON-LD sin cambios; un solo H1 | `lib/seo.js` intacto (`seo.test.js` en verde). `document.querySelectorAll('h1').length === 1` en las dos variantes | ✅ |
| ANF-6 | Los tests existentes siguen pasando | **407 tests, 28 archivos** (10 nuevos) | ✅ |

## 3. Edge cases

| Caso | Esperado | Resultado |
|---|---|---|
| `localStorage` bloqueado | Cae a control, no lanza | ✅ — `experiments.test.js` |
| Experimento apagado | Todos a control | ✅ — `experiments.test.js` |
| Variante guardada inválida | Se reasigna | ✅ — `getVariant` valida contra `variants` |
| Override con variante inexistente | Se ignora | ✅ — `experiments.test.js` |
| Experimento borrado de `EXPERIMENTS` | El hero no se queda sin titular | ✅ — `?? TITULARES[TITULAR_POR_DEFECTO]` |
| Reparto entre visitantes nuevos | Parejo | ✅ — `experiments.test.js` (400 visitantes, ninguna variante bajo el 35 %) |

## 4. Hallazgos y decisiones tomadas durante la implementación

1. **Colisión de copy.** "Tu termo. Pero más vos." ya era el H2 de
   `AntesDespues` (brief §12). Con la variante `objeto` viva, media Home leía la
   misma frase dos veces. Se cambió ese H2 a **"De liso a inconfundible."** para
   **todo el mundo** (no por variante: un texto que cambia según la celda es una
   segunda variable). Hay un test que impide que la colisión vuelva — verificado
   que **falla** al reintroducirla, no sólo que pasa hoy.
2. **Defecto de accesibilidad arrastrado de la spec 014.** El `<br />` de ese H2
   dejaba `textContent` como "De lisoa inconfundible.": un `<br>` no aporta
   espacio, y eso es lo que leen un lector de pantalla y un buscador. Corregido
   con `{' '}`.
3. **Interacción entre los dos tests.** Corren en paralelo y las asignaciones son
   independientes, así que el efecto principal de cada uno se estima sin sesgo.
   Pero titular y botón se leen juntos: si los dos ganan por poco, hay que mirar
   las cuatro celdas antes de concluir. Para aislar uno, `active: false` en el
   otro — sin deploy de lógica.

## 5. Fuera de scope (declarado en `requirements.md` §3)

- **Test del buscador** (brief §34): "dentro del hero" vs "debajo". Es
  estructural, no de copy — mueve una sección entera arriba del fold.
- **Test de social proof** (brief §34): no es del hero.

## 6. Definition of Done

- [x] Los 10 criterios funcionales verificados en el navegador
- [x] Los 6 no funcionales verificados
- [x] `npm test` en verde desde la raíz (407/407)
- [x] Lo que quedó fuera de scope, declarado
