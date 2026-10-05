# WHOLESALE-MIGRATION — Plan por fases

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Fecha** | 05/10/2026 |

Cómo pasar EPICALCOS a "calcos para negocios" **sin dejar de vender
mientras tanto**. Cada fase se aprueba por separado (*"Implementá la spec 031
— Fase N"*), se deploya sola, tiene su forma de apagarse y una señal de que
funcionó.

---

## Por qué este orden y no el del pedido

El pedido pone el Home en la Fase 1. Acá el Home B2B sale en la **Fase 3**, por
tres motivos verificados en el repo:

1. **El CTA principal del Home B2B es "Cotizar"** — y el cotizador es la Fase
   2. Un hero que dice "cotizá" y lleva a un formulario de una promo de 6 cm
   promete algo que la página siguiente no cumple.
2. **La spec 030 está implementándose sobre los mismos archivos** que usa
   cualquier sección nueva del Home (`index.css`, `Reveal.jsx`). Arrancar el
   Home ahora es pisar trabajo en curso (AUDIT R-5).
3. **El Home de hoy es el que vende.** El reposicionamiento se prueba primero
   donde no hay nada que perder (`/negocio`, que recibe el tráfico de negocio y
   los anuncios), y el Home cambia con datos (A/B) y no a ciegas.

Lo que **sí** se adelanta a la Fase 1 es todo lo que comunica el cambio sin
depender del cotizador: navegación, CTA en el header, footer, tira, y el hero
nuevo de `/negocio`.

---

## Fase 0 — Decisiones y prerrequisitos *(sin código)*

| | |
|---|---|
| **Objetivo** | Tener los datos que el copy y el cotizador no pueden inventar |
| **Entregables** | Respuestas a N-1, N-2, N-3, N-8, N-9, N-10, N-11 de `BUSINESS-TODOS.md`. Turno para la sesión de fotos (N-6). Decidir quick wins Q-1…Q-3 |
| **Depende de** | Mariano |
| **Puede ir en paralelo** | Fase 1 (no depende de ninguna de estas respuestas salvo N-3 para el plazo, que tiene valor por defecto en el config) |

---

## Fase 1 — Posicionamiento

| | |
|---|---|
| **Objetivo** | Que el sitio diga "negocios" donde se mira primero, sin tocar precios ni el Home |
| **Entregables** | `config/negocios.js` y `data/negociosFotos.js` · nav B2B + botón **Cotizar** (→ `/negocio`) · footer en 4 grupos · tira de anuncios con "Calcos con tu logo desde 100 unidades" en páginas B2B · `/negocio` con hero B2B, barra de confianza, marcas, cómo funciona, CTA final y **la Promo Negocio de siempre** como compra · `hero_cta_click` · títulos y descripciones de `/negocio` y `/mayorista` |
| **Depende de** | Aprobación. No depende de la 030 (no toca `index.css` ni el Home) |
| **No toca** | Precios, carrito, checkout, Home, popup |
| **Gate (acceptance)** | AC-N*, AC-H*, AC-T1, AC-P*, AC-CO* · 375 px · `npm test` verde |
| **Rollback** | Revert del commit; la Promo Negocio nunca deja de estar comprable |
| **Señal** | `wholesale_click` y visitas a `/negocio` desde el nav suben; la conversión de `/negocio` no baja |

---

## Fase 2 — Conversión

| | |
|---|---|
| **Objetivo** | Que un negocio vea su precio y compre o pida presupuesto sin hablar con nadie |
| **Entregables** | `lib/cotizadorNegocio.js` + **test de paridad contra el servidor** · `Cotizador` en `/negocio` (cantidad → tamaño → material → diseños → precio → subir → carrito) · tabla suelta vs. desde 100 · banda de pedidos grandes · `FormularioPresupuesto` + `POST /api/presupuesto` (mail + CRM, falla cerrado) · WhatsApp con mensaje por página y desde el cotizador · barra fija móvil en `/negocio` · eventos `cotizador_*`, `presupuesto_start`, `generate_lead` (`presupuesto_negocio`) |
| **Depende de** | Fase 1. Respuestas N-2, N-8, N-9, N-10, N-11 (con las recomendadas como default si no hay respuesta, avisando). Que `netlify.toml` no tenga WIP de la 030 sin commitear |
| **No toca** | `config/pricing.js`, servidor de pagos, `CartContext` |
| **Gate** | AC-C*, AC-E1, AC-L*, AC-W*, AC-B*, paridad 100 % (todas las filas × cantidades × MP/transferencia × promo x100 on/off) |
| **Rollback** | `cotizador.activo = false` en `config/negocios.js`: `/negocio` vuelve a la Promo Negocio sola |
| **Señal** | % de visitas de `/negocio` que completan el cotizador; pedidos con líneas de negocio; presupuestos por semana |

---

## Fase 3 — B2B completo y Home

| | |
|---|---|
| **Objetivo** | La experiencia B2B entera, y el Home B2B a prueba contra el actual |
| **Entregables** | `/negocio` completa (usos, materiales, preguntas de negocio con JSON-LD, recurrentes si N-4, galería si hay fotos) · `/mayorista` con banda de pedidos grandes y presupuesto · `HomeB2B` lazy + experimento `home_b2b` (apagado) · camino a la tienda en la variante B2B · QA forzando `?exp_home_b2b=b2b` · **encender** el A/B |
| **Depende de** | Fase 2 · **spec 030 cerrada** · spec 028 con QA hecho (es el control) |
| **Gate** | AC-HO*, AC-NE*, AC-F*, AC-S1, ANF-2 (LCP de la variante B2B ≤ control) |
| **Rollback** | `home_b2b.active = false` |
| **Lectura del A/B** | 14 días mínimo o el volumen que dé el informe; métrica principal: **facturación por sesión**; secundarias: leads de presupuesto, `add_to_cart` de líneas de negocio, compras B2C. Si la variante B2B no pierde facturación y suma leads, se la deja al 100 %; si pierde, se apaga y el B2B sigue viviendo en `/negocio` |

---

## Fase 4 — SEO

| | |
|---|---|
| **Objetivo** | Que Google entienda que EPICALCOS hace calcos personalizados para negocios |
| **Entregables** | Prerender de `/negocio` y `/mayorista` (título, descripción, canonical, OG, Twitter, JSON-LD, contenido) · alias 301 (RF-SEO4) en `netlify.toml` **y** `_redirects` · landing `/calcos-para-packaging` con contenido propio + cotizador · sitemap · links internos (Home → `/negocio`, landings de uso → `/negocio`, `/personalizados` → `/negocio` para 100+) · si se elige, `/preguntas-frecuentes` con FAQPage |
| **Depende de** | Fase 2 (las landings llevan el cotizador). Si el Home B2B gana, el `<title>` del Home se cambia **después** de cerrar el A/B (RF-SEO7) |
| **Gate** | AC-SEO* (`curl` sin JS a cada URL; validador de datos estructurados; 301 con `curl -I`) |
| **Rollback** | Borrar alias; `HIDDEN_SECTIONS` para la landing; el prerender nunca corta el build |
| **Señal** | Impresiones y clics en Search Console para "calcos personalizados para negocios", "calcos con logo", "stickers para emprendimientos" (4–8 semanas) |

---

## Fase 5 — Tracking

Los eventos **se implementan dentro de cada fase** (regla 13 del `CLAUDE.md`:
una feature del funnel no sale sin su medición). Esta fase es la capa de
lectura:

| Entregable | Detalle |
|---|---|
| Embudos en GA4 | Negocio: `page_view /negocio` → `cotizador_start` → `cotizador_complete` → `add_to_cart (cotizador_negocio)` → `begin_checkout` → `purchase`. Presupuesto: `cotizador_complete` → `presupuesto_start` → `generate_lead (presupuesto_negocio)` |
| Conversiones | `generate_lead` con `lead_source = presupuesto_negocio` marcado como conversión clave en GA4; en Meta, `Lead` ya sale por el Píxel |
| Audiencias | Visitantes de `/negocio` sin compra (remarketing B2B), separados de la audiencia B2C |
| Documentación | `docs/analytics.md`: eventos nuevos, cómo leer el A/B, qué no se mide y por qué (PII) |

**Depende de**: acceso a GA4 y Meta (es configuración en sus paneles, no en el
repo). Lo que se configura afuera se deja escrito paso a paso para Mariano.

---

## Fase 6 — Optimización

| Entregable | Detalle |
|---|---|
| Performance | Arnés CDP headless con GPU (375 px, CPU ×4): LCP, CLS, INP de `/negocio` y del Home B2B vs. baseline |
| Mobile real | Safari iOS, Chrome Android, navegador de Instagram (ANF de la 028 todavía pendiente) |
| A/B siguientes | Solo de presentación: H1 alternativo ("Calcos personalizados para negocios, desde 100 unidades"), orden cotizador vs. marcas, barra móvil sí/no |
| Fotos | Encender galería, materiales y hero con contexto a medida que llegan (sin código: se cargan en `data/negociosFotos.js`) |
| Siguiente iteración | Escalera de precios (N-1, spec propia) · "Repetir pedido" (`design.md` §9) · lista de precios por mail (N-16) · que el configurador de `/personalizados` arme packs con varios diseños (hallazgo para la 023) |

---

## Calendario sugerido

| Semana | Qué |
|---|---|
| 1 | Fase 0 (respuestas) en paralelo con Fase 1 |
| 2 | Fase 2 |
| 3 | Fase 3 con la 030 cerrada; A/B encendido al final de la semana |
| 3–5 | Fase 4; corre el A/B |
| 5 | Lectura del A/B y decisión del Home · Fase 6 |

Es una referencia, no un compromiso: cada fase arranca con la frase de
Mariano.
