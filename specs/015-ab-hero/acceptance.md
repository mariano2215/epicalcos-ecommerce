# Acceptance — A/B del hero: titular, CTA y ubicación del buscador

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

## 5. Ampliación — ubicación del buscador (validada el 04/09/2026)

| ID | Criterio | Cómo se verificó | Resultado |
|---|---|---|---|
| AC-11 *(RF-11)* | Exactamente un buscador, nunca dos ni ninguno | `en_hero`: buscador en el hero, sin sección `¿Qué te gusta?`, **1** bloque con chips. `debajo`: sin buscador en el hero, sección presente, **1** bloque con chips. (El tercer `.buscador` de la página es el del CTA final, que no lleva chips y no entra en el experimento) | ✅ |
| AC-12 *(RF-12)* | En `en_hero` el buscador va arriba de los CTA | A 375 px: campo en 346 px, CTA principal en 643 px | ✅ |
| AC-13 *(RF-13)* | En `en_hero` la sección no se renderiza | `seccionQueTeGusta: false` | ✅ |
| AC-14 *(RF-14)* | Mismo contenido en las dos variantes | El mismo `BuscadorCalcos` con `chips`: 8 chips sugeridos + búsquedas recientes en ambas | ✅ |
| AC-15 *(RF-15)* | Chips y campo legibles sobre el degradado | `.buscador--sobre-hero` con fondo opaco y blur; verificado en captura a 375 px | ✅ |
| AC-16 *(RF-16)* | El control es `debajo` | `EXPERIMENTS.hero_buscador.variants[0] === 'debajo'`, con test | ✅ |
| ANF-7 | Sin CLS | La ubicación sale de `useExperiment`, sincrónico: el primer render ya trae la variante | ✅ |
| ANF-8 | Sin scroll horizontal a 375 px | `scrollWidth === clientWidth === 375` en las dos variantes | ✅ |

### El costo medido de `en_hero`

| | `debajo` (control) | `en_hero` |
|---|---|---|
| Alto del hero (375 px, visitante nuevo) | 517 px | **774 px** |
| Campo de búsqueda | — (en la sección de abajo) | 346 px |
| CTA principal | ~330 px | **643 px** |
| CTA visible en un iPhone de 812 px | sí | sí, con ~170 px de aire |
| CTA visible en uno de 667 px | sí | **al borde** (643 de 667) |
| Con búsquedas recientes guardadas | — | el hero suma ~90 px y el CTA cae abajo del fold |

En desktop (1280×900) no hay problema: hero 762 px, campo en 412 px, CTA en
657 px, chips en 2 filas.

> ⚠️ **Al leer los resultados.** Si `en_hero` pierde, puede ser por el
> desplazamiento de los CTA y no por la ubicación del buscador. No se compensó
> achicando el padding a propósito (ver `requirements.md` §11): separar las dos
> cosas pide un tercer brazo con el hero compacto.

### Estado de los experimentos (04/09/2026)

| Experimento | Estado | Por qué |
|---|---|---|
| `hero_titular` | **vivo** | — |
| `hero_cta` | **pausado** | `en_hero` + `encontra_calcos` dejaba un botón que promete lo mismo que el campo de búsqueda que tiene arriba. Se apagó para poder leer `hero_buscador` |
| `hero_buscador` | **vivo** | — |

Quedan **cuatro celdas**, no ocho.

**El kill switch, verificado en el peor caso**: con `encontra_calcos` guardado
en `localStorage` **y** pedido por URL (`?exp_hero_cta=encontra_calcos`), el
hero renderizó *"Ver todos los diseños"* y `experiment_view` reportó
`hero_cta=ver_disenos`. El `active: false` se chequea antes que la variante
guardada y antes que el override.

La asignación previa **queda intacta en `epicalcos.exp.v1`**: al volver a
`active: true` cada visitante recupera su variante en vez de rebarajarse, así
que el test se reanuda donde estaba.

Detalle menor de analítica: un experimento pausado **sigue emitiendo**
`experiment_view`, con el 100 % en control. Es correcto —describe lo que la
gente ve— pero conviene saberlo antes de mirar el informe.

## 6. Fuera de scope

- **Test de social proof** (brief §34): no es del hero.

## 7. Definition of Done

- [x] Los 16 criterios funcionales verificados en el navegador
- [x] Los 8 no funcionales verificados
- [x] `npm test` en verde desde la raíz (411/411)
- [x] Lo que quedó fuera de scope, declarado
