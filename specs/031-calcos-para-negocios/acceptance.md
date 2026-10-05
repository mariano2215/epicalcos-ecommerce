# Acceptance — Calcos para negocios

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> **Este documento determina cuándo la feature está terminada.**
> Se valida **por fase**: la columna "Fase" dice en cuál se cierra cada criterio.
> Una fase no se da por terminada con un criterio suyo en ⬜ o ❌.

---

## Cómo se valida

Al terminar cada fase se recorre este documento **punto por punto** y se
reporta el resultado **real** (`CLAUDE.md` regla 15).

- ✅ **Cumple** — verificado, con evidencia (captura, salida de comando, test)
- ❌ **No cumple** — con el detalle
- ⏭️ **No aplica** — con el motivo (ej. "N-4 sin responder: la sección de recurrentes no se monta")

**No se marca ✅ nada que no se haya verificado.**

---

## 1. Criterios funcionales

### Navegación y copy

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-N1 | *(RF-N1)* El nav dice Para negocios · Precios · Con tu diseño · Tienda · Preguntas + Cotizar | Inspección a 1024 y 1440 px | 1 | ⬜ |
| AC-N2 | *(RF-N3)* A 1024 px el nav entra en una línea; a 375 px "Cotizar" está en el menú | Captura | 1 | ⬜ |
| AC-N3 | *(RF-N4)* Footer en 4 grupos; una sección agregada a `HIDDEN_SECTIONS` desaparece del footer | Agregar `negocio` a mano en local y mirar | 1 | ⬜ |
| AC-N4 | *(RF-N5)* En `/negocio` la tira suma "Calcos con tu logo desde 100 unidades" y conserva envío gratis, garantía y transferencia | Inspección | 1 | ⬜ |
| AC-CTA1 | *(RF-CTA1/2)* En las páginas B2B solo aparecen los 5 CTAs con nombre fijo y nunca dos primarios en la misma pantalla | Recorrido + `grep` de textos de botón en `components/negocios/` | 1–3 | ⬜ |
| AC-CO1 | *(RF-CO1/2)* El test de copy prohibido está en verde y falla al introducir una frase prohibida | Correr el test con y sin la frase | 1 | ⬜ |
| AC-CO2 | *(RF-CO3)* Ningún monto, %, plazo ni cifra escrito a mano en `config/negocios.js` ni en `components/negocios/` | `grep` de tasks 1.1 | 1 | ⬜ |

### Hero y confianza

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-H1 | *(RF-H1/2/3)* Eyebrow, H1 y bajada como en `design.md` §11 | Inspección | 1 | ⬜ |
| AC-H2 | *(RF-H4)* El "desde" del hero es el menor precio por calco vigente y la suelta, ambos del config: cambiar `NEGOCIO.price` en local cambia el hero | Prueba local | 1 | ⬜ |
| AC-H3 | *(RF-H6)* La imagen del hero es una foto real listada en `data/negociosFotos.js` | Revisión del archivo | 1 | ⬜ |
| AC-H4 | *(RF-H7)* A 375 × 667, H1 + precio + CTA primario sin scroll | Captura | 1 | ⬜ |
| AC-T1 | *(RF-T1)* Los 4 datos: desde 100 unidades, muestra gratis antes de producir, 3 a 5 días hábiles (de `shipping.produccionVolumen`) y la cuenta de `data/marcas.js` | Revisión + cambiar uno en local | 1 | ⬜ |

### Cotizador

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-C1 | *(RF-C2/3/4)* Opciones: 100 · 250 · 500 · 1.000 · Más de 1.000; **4 y 6 cm** (sin 9 cm); vinilo blanco preseleccionado y "Recomendado", DTF UV y holográfico | Inspección | 2 | ⬜ |
| AC-C2 | *(RF-C8)* Para cada tamaño × material × cantidad del cotizador, el total **es igual al peso** al que calcula `validateAndPriceOrder()` con MP y con transferencia | `cotizadorNegocio.test.js` | 2 | ⬜ |
| AC-C3 | *(RF-C8)* Los totales del cotizador son los de la tabla aprobada en la spec 032 §9.1 para cada escalón (y 240 → "te llevás 250") | Test + pantalla | 2 | ⬜ |
| AC-C4 | *(RF-C6)* Se ven total, precio por calco y precio por transferencia | Inspección | 2 | ⬜ |
| AC-C5 | *(RF-C7)* 250 / 500 / 1.000 muestran 10 / 20 / 30 % OFF derivados del monto; 100 muestra MUESTRA GRATIS y ningún % | Test | 2 | ⬜ |
| AC-C6 | *(RF-C9)* "Más de 1.000" muestra **Pedir presupuesto**, sin precio; DTF UV con varios diseños cotiza igual que vinilo blanco | Inspección + test | 2 | ⬜ |
| AC-C7 | *(RF-C10)* Subir 3 archivos y agregar: el carrito tiene las líneas de §3.3 y el checkout por MP **no** devuelve `price_mismatch` | Recorrido local con `create-preference` | 2 | ⬜ |
| AC-C8 | *(RF-C10)* Las URLs de Cloudinary llegan al mail/CRM una sola vez, en un bloque | `resumenPedido.test.js` + pedido de prueba | 2 | ⬜ |
| AC-C9 | *(RF-C11)* Formatos, peso y cantidad de archivos iguales a `/personalizados`; "✓ archivo cargado", nombre y "Cambiar archivo" | Subir PNG, PDF, un .txt (rechazado) y uno de 11 MB (rechazado) | 2 | ⬜ |
| AC-C10 | *(RF-C12)* Sin subir archivos, se puede agregar al carrito y el resumen dice que el diseño llega por WhatsApp | Recorrido | 2 | ⬜ |
| AC-C11 | *(RF-C13)* "Hablar por WhatsApp" abre `wa.me` con cantidad, tamaño, material y diseños en el texto | Revisar el `href` | 2 | ⬜ |
| AC-C12 | *(RF-C14)* Se completa con teclado solo; el lector de pantalla anuncia el precio al cambiar | Teclado + VoiceOver | 2 | ⬜ |
| AC-C13 | *(RF-C15)* Cambiar un escalón en local (los dos lados) cambia el precio del cotizador sin tocar otro archivo | Prueba local | 2 | ⬜ |
| AC-C15 | *(RF-C16)* Sin razón social no se puede agregar al carrito; con razón social y CUIT, los dos llegan al mail y al CRM | Recorrido + pedido de prueba | 2 | ⬜ |
| AC-P2 | *(RF-P3)* Pedido de 100+ calcos (cualquier producto): checkout, mail y FAQ dicen 3 a 5 días hábiles; con menos de 100, 2 a 3 | Pedido de prueba de 120 sueltas, de 30 y de una línea de escala | 1 | ⬜ |
| AC-C14 | *(D-11)* Agregar dos veces seguidas no duplica el pedido sin querer | Recorrido | 2 | ⬜ |

### Precios y contenido

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-E1 | *(RF-E1)* La escala muestra 100 · 250 · 500 · 1.000 con total, por calco y transferencia; etiquetas **MUESTRA GRATIS / 10 % OFF / 20 % OFF / 30 % OFF**; titular "Mientras más cantidad, más barato te sale. Lo único que no cambia es la calidad." | Cambiar un escalón en local | 2 | ⬜ |
| AC-E2 | *(RF-E2/3)* La suelta aparece como referencia; no hay "MÁS ELEGIDO" | Inspección | 2 | ⬜ |
| AC-U1 | *(RF-U1)* 6 usos; ninguna imagen de stock | Inspección | 3 | ⬜ |
| AC-G1 | *(RF-G1)* Con la lista de fotos vacía, la galería no está ni en el DOM ni en el HTML | `curl` + DOM | 3 | ⬜ |
| AC-M1 | *(RF-M1/2/3)* Una card por material de `MATERIALES`; el holográfico dice packs de 100 en 4 y 6 cm | Inspección | 3 | ⬜ |
| AC-P1 | *(RF-P1/2, RF-F3)* 4 pasos con la vista previa gratis en el paso 3; plazo del config; "muestra" siempre aclarada como vista previa digital; `/personalizados` y la tienda no mencionan la vista previa | Test de copy + inspección | 1 | ⬜ |
| AC-R1 | *(RF-R1)* "¿Pedís calcos todos los meses?" no se monta sin N-4 resuelto | Inspección | 3 | ⬜ |
| AC-S1 | *(RF-S1)* Marcas, cifras y testimonios reales; un componente sin datos no se monta | Inspección | 1–3 | ⬜ |
| AC-K1 | *(RF-K1)* Banda de pedidos grandes con Pedir presupuesto y Hablar por WhatsApp | Inspección | 2 | ⬜ |
| AC-F1 | *(RF-F1/2)* Solo se ven (y van al JSON-LD) las preguntas con `publicar: true`; "¿Puedo pedir factura?" responde "Sí, emitimos factura C." | DOM + JSON-LD | 3 | ⬜ |

### Presupuesto

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-L1 | *(RF-L1)* Obligatorios: nombre y apellido, razón social / empresa, mail y teléfono; el resto opcional | Enviar vacío y de a un campo | 2 | ⬜ |
| AC-L2 | *(RF-L2)* Abierto desde el cotizador, llega con cantidad, tamaño, material y diseños cargados | Recorrido | 2 | ⬜ |
| AC-L3 | *(RF-L3)* Mariano recibe el mail con todos los campos y el link del archivo; el CRM recibe `lead.created` con `fuente: presupuesto_negocio` | Envío real a la casilla de prueba + log del CRM | 2 | ⬜ |
| AC-L4 | *(RF-L4)* Con el mail caído (local, sin `RESEND_API_KEY`), el cliente ve error + WhatsApp con su pedido escrito, nunca "listo" | Test del handler + prueba local | 2 | ⬜ |
| AC-L5 | *(RF-L5)* Honeypot lleno → no se manda; doble tap → un solo envío | Test + prueba | 2 | ⬜ |
| AC-L6 | El endpoint rechaza URLs de archivo que no son del Cloudinary del sitio | Test | 2 | ⬜ |

### WhatsApp y barra móvil

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-W1 | *(RF-W1)* Un solo botón flotante en toda página | Inspección | 2 | ⬜ |
| AC-W2 | *(RF-W2)* Mensaje precargado correcto en `/negocio`, `/mayorista`, Home B2B, ficha de producto; sin mensaje en el resto (como hoy) | `lib/whatsapp.test.js` | 2 | ⬜ |
| AC-B1 | *(RF-B1)* La barra móvil aparece pasado el hero y se esconde con el cotizador a la vista | Scroll a 375 px | 2 | ⬜ |
| AC-B2 | *(RF-B2, RF-W3)* No tapa contenido, ni al botón de WhatsApp, ni aparece con carrito, menú o modal abiertos | Recorrido | 2 | ⬜ |

### Home y páginas

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-HO1 | *(RF-HO1/3)* `?exp_home_b2b=b2b` muestra la variante B2B y `?exp_home_b2b=control` el Home de hoy idéntico; `active: false` manda a todos al control | Recorrido | 3 | ⬜ |
| AC-HO2 | *(RF-HO2)* Orden de secciones de la variante B2B; "Ver tienda" lleva a `/categorias` | Inspección | 3 | ⬜ |
| AC-HO3 | *(RF-HO4)* El popup abre igual en las dos variantes | Prueba con los disparadores de la spec 026 | 3 | ⬜ |
| AC-NE1 | *(RF-NE1/2)* `/negocio` con el orden de secciones; la Promo Negocio (1 logo, 100, 6 cm) se compra desde el cotizador | Recorrido de compra | 3 | ⬜ |
| AC-MA1 | *(RF-MA1)* `/mayorista` mantiene el armador y suma pedidos grandes + presupuesto | Recorrido | 3 | ⬜ |

### SEO

| ID | Criterio | Cómo se verifica | Fase | Resultado |
|---|---|---|---|---|
| AC-SEO1 | *(RF-SEO1/2)* `curl` sin JS a `/negocio` y `/mayorista` devuelve su título, descripción, canonical, OG y Twitter propios | `curl -s … \| grep` | 4 | ⬜ |
| AC-SEO2 | *(RF-SEO3)* Rich Results Test sin errores; FAQPage solo con preguntas visibles; un solo Organization | Herramienta de Google | 4 | ⬜ |
| AC-SEO3 | *(RF-SEO4)* Cada alias responde `301` a su destino | `curl -sI` por alias | 4 | ⬜ |
| AC-SEO4 | *(RF-SEO5)* `/calcos-para-packaging` con contenido propio, prerenderizada y en el sitemap | `curl` + sitemap | 4 | ⬜ |
| AC-SEO5 | *(RF-SEO6)* Toda URL del sitemap anterior sigue respondiendo 200 o 301 | Script sobre el sitemap viejo | 4 | ⬜ |
| AC-SEO6 | *(RF-SEO7)* El `<title>` del Home no cambia mientras el A/B no tenga ganador | `curl` | 3–4 | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — todo a 375 px sin scroll horizontal; targets ≥ 44 px | DevTools + iPhone SE real | ⬜ |
| ANF-2 | **Performance** — LCP de `/negocio` y del Home B2B ≤ LCP del Home actual; chunk principal +≤ 1 kB gzip | Arnés CDP con GPU, mediana de 3 · `vite build` | ⬜ |
| ANF-3 | **Accesibilidad** — `aria-label`, foco visible, AA, `prefers-reduced-motion` | Teclado + Lighthouse a11y ≥ el actual | ⬜ |
| ANF-4 | **Compatibilidad** — un carrito guardado antes sigue andando y llega al checkout | `localStorage` con un carrito de producción | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff -- '*package.json'` vacío | ⬜ |
| ANF-6 | **Sin secretos en el bundle** | `grep` de claves sobre `frontend/dist` | ⬜ |
| ANF-7 | **Rollback** — cada interruptor de `design.md` §8 apaga su pieza sin otro cambio | Probar cada uno en local | ⬜ |
| ANF-8 | **Navegadores reales** — Safari iOS, Chrome Android, navegador de Instagram | Dispositivos | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| 250 de un diseño en 6 cm | Escalón de 250 | ⬜ |
| 100 con 3 diseños en 4 cm | Escalón de 100; reparto según N-9 en el resumen | ⬜ |
| DTF UV con varios diseños | Escala si P-4 de la 032 = sí; si no, presupuesto | ⬜ |
| La escala cambia con la página abierta | Checkout pide recargar; al recargar cobra la vigente | ⬜ |
| 40 archivos para 100 calcos | Se aceptan; resumen correcto | ⬜ |
| Falla Cloudinary | Seguir sin archivo o reintentar | ⬜ |
| Falla el mail del presupuesto | Error + WhatsApp, nunca "listo" | ⬜ |
| Instagram sin storage | Cotizador y formulario andan; A/B en control | ⬜ |
| 1.000 de un diseño | Una línea `volumen:` de 1.000, checkout OK | ⬜ |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | La suite completa sigue pasando (anotar el número) | ⬜ |
| REG-2 | Compra por **Mercado Pago** de punta a punta, B2C y B2B | ⬜ |
| REG-3 | Compra por **transferencia** de punta a punta, B2C y B2B | ⬜ |
| REG-4 | Envío bien calculado en las tres zonas, y la promo de 100 sigue pagando envío fuera de Rosario | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| REG-6 | El carrito sobrevive al refresh | ⬜ |
| REG-7 | `purchase` se dispara una sola vez | ⬜ |
| REG-8 | El `value` del `purchase` es lo pagado | ⬜ |
| REG-9 | El Home **control** es idéntico al de hoy (captura antes/después) | ⬜ |
| REG-10 | `/personalizados`, `/mayorista` (armador), tienda y popup funcionan como antes | ⬜ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `hero_cta_click` | Click en un CTA del hero B2B | `pagina`, `cta` | ⬜ |
| `cotizador_start` | Primera interacción con el cotizador (una vez por vista) | `pagina` | ⬜ |
| `cotizador_complete` | Precio visible con todo elegido (una vez por combinación) | `cantidad`, `tamano`, `material`, `disenos`, `value`, `producto` | ⬜ |
| `personalized_upload_start/complete` | Subida desde el cotizador | `origen: 'cotizador'`, sin nombre de archivo | ⬜ |
| `add_to_cart` | Agregar desde el cotizador | `item_list_name: 'cotizador_negocio'`, `value` = total del cotizador | ⬜ |
| `presupuesto_start` | Primer campo tocado del formulario | `origen` | ⬜ |
| `generate_lead` | Presupuesto enviado con éxito (no antes) | `lead_source: 'presupuesto_negocio'`, `rango_cantidad`; Pixel `Lead` | ⬜ |
| `whatsapp_click` | Click a WhatsApp en contextos nuevos | `whatsapp_context` | ⬜ |
| `faq_open` | Abrir una pregunta de negocio | `pregunta_id`, `pagina` | ⬜ |
| `experiment_view` | Exposición al A/B del Home | `id: 'home_b2b'`, `variant` | ⬜ |

- [ ] GA4 DebugView recibe cada uno
- [ ] Meta "Probar eventos" recibe `Lead`
- [ ] **No viaja PII**: `window.dataLayer` sin nombre, negocio, mail, teléfono, archivo u observaciones

---

## 6. Paridad de precios

Esta spec **no cambia** precios (los define la 032): la paridad que se verifica
es la del cotizador contra el servidor.

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | Esta spec no toca `config/pricing.js` ni `netlify/functions/lib/pricing.js` (la escala la agrega la 032) | ⬜ |
| PAR-2 | `cotizadorNegocio.test.js` (paridad con `validateAndPriceOrder`) en verde | ⬜ |
| PAR-3 | `promoPricing.test.js`, `envio.test.js`, `precioPersonalizados.test.js` en verde | ⬜ |
| PAR-4 | Un pedido B2B real (o de prueba en MP) no se rechaza con `price_mismatch` | ⬜ |
| PAR-5 | El precio es el mismo en cotizador, carrito y checkout | ⬜ |

---

## Definition of Done

### Por fase
- [ ] Todos los criterios de la fase en ✅ o ⏭️ con motivo
- [ ] Regresión (§4) en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Comentarios que explican el **por qué**
- [ ] Docs actualizados (`analytics.md`, `architecture.md`, `business-rules.md` según la fase)
- [ ] El WIP ajeno del árbol sigue sin publicar después del push

### De la spec
- [ ] Fases 1 a 4 cerradas
- [ ] A/B del Home leído y decidido con Mariano
- [ ] `BUSINESS-TODOS.md` con cada ítem resuelto o pasado a una spec nueva
- [ ] Estado `DONE` en `requirements.md`
