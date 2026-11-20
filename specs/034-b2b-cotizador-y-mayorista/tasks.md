# Tasks — Cotizador B2B, mayorista por escala y Home B2B a prueba

| | |
|---|---|
| **Spec** | `034-b2b-cotizador-y-mayorista` |
| **Design** | [`design.md`](design.md) |
| **Rama** | `feat/034-b2b-conversion` — **sin push** |

---

## ⛔ Antes de tocar una sola línea

- [x] Requirements, design, tasks y acceptance escritos
- [x] Mariano autorizó implementar **en una rama aparte, sin push** (17/10/2026)
- [ ] Mariano revisa la rama y decide qué se mergea a `main` ← la publicación

---

## Motor (lo que no se ve)

- [x] **1** `lib/cotizadorNegocio.js`: cotizar, línea, consulta precargada
- [x] **2** `lib/cotizadorNegocio.test.js` con paridad contra el servidor (MP y transferencia)
- [x] **3** `lib/resumenPedido.js`: rama `volumen:` + test
- [x] **4** `lib/whatsapp.js`: `mensajeWhatsapp(pathname)` + test
- [x] **5** `lib/atribucion.js` + test; `paymentService` usa el `fbclid` guardado; `main.jsx` captura
- [x] **6** `lib/experiments.js`: `home_b2b` previsualizable + D-7 + test
- [x] **7** `lib/analytics.js`: `trackCotizadorStart`, `trackCotizadorComplete`, `trackFaqOpen`

## `/negocio`

- [x] **8** `config/negocios.js`: copy del cotizador, escala, usos, materiales, preguntas, pedidos grandes, Home B2B, `/mayorista`
- [x] **9** `GrupoOpciones`, `Cotizador`, `EscalaVolumen`, `PedidosGrandes`
- [x] **10** `UsosNegocio`, `Materiales`, `PreguntasNegocio`
- [x] **11** `Negocio.jsx` en el orden de RF-NE1; `HeroNegocio`/`CtaFinalNegocio` al cotizador
- [x] **12** `BotonCotizar`: "Ver el precio ahora"; `FormularioContacto` lee la consulta

## `/mayorista`

- [x] **13** `PackBuilder` modo `escala`
- [x] **14** `Mayorista.jsx`: encabezado, condiciones, escala, armador, pedidos grandes, FAQ, link a `/negocio`

## Home B2B

- [x] **15** `CaminoTienda`, `HomeB2B.jsx` (lazy), `Home.jsx` elige variante

## FAQ, SEO y atribución

- [x] **16** `FAQ.jsx`: RF-16…19
- [x] **17** `lib/negociosEstatico.js` + test; `scripts/prerender.mjs` genera `negocio.html` y `mayorista.html`
- [x] **18** Alias 301 en `netlify.toml` y `_redirects`
- [x] **19** `WhatsAppButton` con mensaje

## Cierre

- [x] **20** `npm test` verde; `vite build` sin errores; prerender genera los tres HTML
- [x] **21** Recorrido en el navegador a 375 px y escritorio: `/negocio` (cotizar, agregar, carrito; **sin** subida real a Cloudinary), `/mayorista` (armar 100 y 250, completar), Home con y sin `?exp_home_b2b=b2b`, Cotizar del header, formulario precargado. Sin transacciones reales
- [x] **22** `docs/analytics.md`, `docs/business-rules.md`
- [x] **23** `AUDITORIA_EPICALCOS.md`
- [x] **24** Validar contra `acceptance.md`
- [x] **25** Commits en la rama (por archivo, con rutas). **Sin push**

---

## Bitácora

| Fecha | Desvío o hallazgo | Decisión |
|---|---|---|
| 17/10/2026 | La spec 031 pedía un endpoint `/api/presupuesto` | Se reusa `/contacto` precargado (design D-1) |
| 17/10/2026 | E-1 decía que todo Cotizar despliega dos salidas | Suma una tercera, "Ver el precio ahora" (D-9) |
| 17/10/2026 | El reparto "partes iguales salvo indicación" era la recomendación de N-9, **sin confirmar** por Mariano | No se publica ninguna regla: el cliente escribe cómo repartir (opcional) y, si no, la nota dice "reparto a coordinar por WhatsApp" (RF-4 corregido) |
| 17/10/2026 | El primer build sumó +5 kB gzip al chunk principal: el header y el WhatsApp flotante importaban `config/negocios.js` entero | `config/negociosBase.js` con lo único que leen (mensajes de WhatsApp e interruptor); el FAQ lee la escala de `pricing.js`. Quedó en +0,45 kB |
| 17/10/2026 | `add_to_cart` del cotizador sin `item_list_name` propio | Sale por `addNegocio` del `CartContext`, que no se toca: se reconoce por el `item_id` `volumen:` (docs/analytics.md) |
| 17/10/2026 | `/mayorista`: siete tarjetas de condiciones empujaban el armador ~800 px a 375 px | Una tarjeta con renglones |
| 17/10/2026 | El build regenera `frontend/public/sitemap.xml` (el commiteado está viejo: le faltan 11 categorías) | No se commitea: fuera de scope, y Netlify lo regenera en cada build |
| 30/10/2026 | Merge de `main` con EPICYBER (spec 036, publicada el 30/10): la campaña vende packs cerrados en `/mayorista` y esta spec la pasó a la escala | `/mayorista` tiene dos modos. Con el x100 Cyber vigente: selector de packs + armador de cantidad exacta, sin la tabla de la escala ni la condición "de 100 a 1.000". Sin campaña: la escala. El cambio es solo de presentación: precios, servidor y ventana son los de la 036. Verificado en el navegador con `?epicyber=preview` |
| 30/10/2026 | Un pedido de la escala armado antes de la campaña pagaría de más sin enterarse: `sugerenciaCyber` solo miraba `pack:mayorista100:` | Ahora mira también las `volumen:` de `/mayorista`, contra el pack de esa misma cantidad. Las del cotizador quedan afuera (archivos, razón social): `/negocio` ya tiene el aviso de la campaña. El armador guarda imagen y SKU en esas líneas para poder sembrar el pack |
| 30/10/2026 | Durante la campaña el HTML prerenderizado y el JSON-LD de `/mayorista` siguen mostrando la escala: salen del build | Aceptado: el HTML dura lo que tarda en montar React, y título y descripción sí cambian en el navegador. Con el A/B del Home apagado, la variante B2B no necesita las secciones de la campaña; si se prende antes del 8/11, hay que sumarlas |
