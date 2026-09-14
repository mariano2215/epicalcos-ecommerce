# Acceptance — /personalizados: "Hacelo calco"

| | |
|---|---|
| **Spec** | `023-personalizados-hacelo-calco` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | |
| **Resultado** | ⬜ pendiente |

> Si un criterio no está acá, no es parte de "terminado". Si está, la feature no
> se cierra hasta cumplirlo — o hasta que se diga, con el motivo, que no se pudo
> probar.

- ✅ **Cumple** — verificado, con evidencia
- ❌ **No cumple** — con el detalle
- ⏭️ **No aplica** — con el motivo (p. ej. sección sin fotos todavía)
- 👤 **Lo verifica Mariano** — no se puede probar desde acá (iPhone real, Search Console, GA4 DebugView)

---

## 1. Criterios funcionales

### SEO
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-S1 | *(RF-S1, S3, S4)* El HTML sin JS de `/personalizados` trae `<title>Stickers y Calcos Personalizados con tu Diseño \| EPICALCOS</title>`, la description propia (≤ 160 caracteres, con el plazo de `shipping.production`) y `<link rel="canonical" href="https://epicalcos.com/personalizados">` | `curl` a producción (tasks 11.3) y al `vite preview` | ⬜ |
| AC-S2 | *(RF-S2, S5)* Ese HTML tiene **exactamente un** `<h1>` con "Calcos personalizadas con tu propio diseño", el claim, la lista de qué se puede convertir, los tres tamaños con precio, el proceso, las preguntas de la FAQ y links a `/categorias`, `/negocio`, `/contacto` | `curl … \| grep -c '<h1'` = 1 + lectura | ⬜ |
| AC-S3 | *(RF-S6)* El JSON-LD parsea y contiene `Product` (con `brand`, `image` absoluta, `AggregateOffer` ARS con `lowPrice` 1200 y `highPrice` 2000 — o los valores vigentes de `SIZES`), `BreadcrumbList` y `FAQPage`; **no** contiene `AggregateRating` ni `Review` | test + Rich Results Test de Google sobre la URL | ⬜ |
| AC-S4 | *(RF-S8)* `/personalizados` responde `200` sin redirect por URL directa, y después de F5 la página se ve completa | `curl -w '%{http_code} %{redirect_url}'` + Browser pane | ⬜ |
| AC-S5 | *(RF-S8)* Sigue en `sitemap.xml`; `robots.txt` no la bloquea | `grep personalizados frontend/dist/sitemap.xml frontend/dist/robots.txt` | ⬜ |
| AC-S6 | *(RF-S9)* Con un error forzado en el builder, `npm run build` termina OK, avisa en el log y `dist/personalizados.html` es copia de `index.html` | prueba local, revertida | ⬜ |
| AC-S7 | *(RF-S7)* Los precios del HTML inicial coinciden con `SIZES` del mismo build | test | ⬜ |
| AC-S8 | Search Console: URL inspeccionada y reindexación pedida | 👤 | ⬜ |

### Hero y configurador
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-C1 | *(RF-C1)* A 375 × 812, sin scrollear, se ven: claim, H1, subtítulo y la zona de subida; con un scroll corto, tamaño, cantidad, precio y CTA. En desktop (1280) todo en una pantalla, dos columnas | screenshots 375 y 1280 | ⬜ |
| AC-C2 | *(RF-C2)* Sin tocar nada más, se puede subir una imagen y aparece su vista previa | Browser pane | ⬜ |
| AC-C3 | *(RF-C3)* Corte e instrucciones están plegados en "Más opciones", con silueta por defecto | inspección | ⬜ |
| AC-C4 | *(RF-C4, C5)* Ningún tamaño viene elegido; 6 cm muestra "MÁS ELEGIDO"; cada card muestra precio c/u de `SIZES` y su "ideal para" | inspección | ⬜ |
| AC-C5 | *(RF-C6)* El CTA dice "Subir mi diseño" sin archivo (y abre el selector), "Crear mi calco" con archivo y sin tamaño (y lleva el foco al selector de tamaño), "Agregar al carrito · $X" con archivo subido y tamaño | recorrido | ⬜ |
| AC-C6 | *(RF-C7)* 3 diseños × 2 copias en 6 cm silueta → 3 líneas `custom:6cm:silueta:{id}` de cantidad 2, cada una con `meta.archivos[0].url` de Cloudinary | `JSON.parse(localStorage['epicalcos.cart.v2'])` | ⬜ |
| AC-C7 | *(RF-C8)* Con una subida en curso, "Agregar" está deshabilitado y muestra el % | recorrido con red lenta (throttling) | ⬜ |
| AC-C8 | *(RF-C9)* Al agregar: "✓ Tu calco está en el carrito", se abre el drawer una vez y la zona queda lista para otro diseño | recorrido | ⬜ |
| AC-C9 | *(RF-C10)* Se pueden cargar 5 archivos de una; tamaño y copias se aplican a los 5 | recorrido | ⬜ |
| AC-C10 | *(RF-C11)* Con personalizados en el carrito, la página muestra "Ya tenés N en el carrito" | recorrido | ⬜ |

### Subida
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-U1 | *(RF-U1, U2)* La zona dice "Subí tu diseño / Arrastrá tu imagen acá / Elegir archivo", los formatos que lista son `formatosLegibles(ARCHIVO.formatosEntrada)` y el `accept` del input es la misma lista | inspección + test | ⬜ |
| AC-U2 | *(RF-U3, U7)* Un `.gif` muestra "No pudimos subir esta imagen. Probá con …"; un PNG de 40 MB sin comprimir posible muestra el mensaje de peso; ningún mensaje contiene un código HTTP, "MIME" ni "payload" | recorrido | ⬜ |
| AC-U3 | *(RF-U4)* Cada archivo muestra su progreso | recorrido con throttling | ⬜ |
| AC-U4 | *(RF-U5)* "Reemplazar" cambia el archivo conservando el lugar en la lista; "Quitar" lo saca | recorrido | ⬜ |
| AC-U5 | *(RF-U6)* El mismo archivo dos veces → se ignora el segundo con aviso | recorrido | ⬜ |
| AC-U6 | *(RF-U7)* Con la red cortada durante la subida: error + "Reintentar" (que sube al volver la red) + "Agregar igual y mandarlo por WhatsApp" (que agrega la línea sin `url`) | DevTools offline | ⬜ |
| AC-U7 | *(RF-U8)* Sin `VITE_CLOUDINARY_*` en el build, se puede agregar y la línea va sin `url` | build local sin las env | ⬜ |
| AC-U8 | *(RF-U9)* Con 2 diseños subidos sin agregar: ir a `/carrito`, volver → siguen con su configuración; F5 → siguen | recorrido | ⬜ |
| AC-U9 | *(RF-U10)* Ir a `/carrito` con una subida al ~40 % y volver a los 10 s → el diseño está subido | recorrido con throttling | ⬜ |
| AC-U10 | *(RF-U11)* Solo con teclado: Tab llega a la zona, el foco se ve, Enter abre el selector; un lector de pantalla anuncia "Diseño cargado" | teclado + inspección de `aria-live` | ⬜ |
| AC-U11 | *(RF-U12)* Un `.webp` se acepta y llega a Cloudinary como `.png` | recorrido + URL resultante | ⬜ |
| AC-U12 | *(RF-U13)* Una imagen de 200 × 200 px en 9 cm muestra el aviso de resolución y **se puede agregar igual** | recorrido | ⬜ |

### Vista previa
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-P1 | *(RF-P1)* La vista previa aparece antes de que termine la subida | throttling | ⬜ |
| AC-P2 | *(RF-P2, P3)* PNG transparente + silueta → borde blanco que sigue la forma; + círculo → recorte circular; + cuadrado → cuadrado con margen; todas rotuladas "vista aproximada" | screenshots | ⬜ |
| AC-P3 | *(RF-P3)* JPG sin transparencia + silueta → recuadro + "El contorno lo prepara nuestro equipo" | screenshot | ⬜ |
| AC-P4 | *(RF-P4)* Con diseño cargado, elegir el tamaño por primera vez pasa la vista a VISTA CALCO | recorrido | ⬜ |
| AC-P5 | *(RF-P5)* No existe ningún botón "Quitar fondo"; está el texto de revisión humana | inspección | ⬜ |
| AC-P6 | *(RF-P6)* EN UN TERMO: el diseño de 9 cm ocupa ~el ancho del termo y el de 4 cm ~0,44 de ese ancho; cambia al cambiar el tamaño | medición en el DOM | ⬜ |
| AC-P7 | *(RF-P7)* Un PDF muestra ícono + nombre, sin vista calco | recorrido | ⬜ |

### Cantidad y precio
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-Q1 | *(RF-Q1)* − / + y los atajos 1 · 5 · 10 · 25 · 50 · 100 funcionan; el mínimo es 1 y el máximo 1.000 | recorrido | ⬜ |
| AC-Q2 | *(RF-Q2, Q3)* Con el 3x2 vivo: 1 diseño, 6 cm, 10 copias → total **$11.200**, "$1.120 por unidad", "Ahorrás 30 %" | recorrido | ⬜ |
| AC-Q3 | *(RF-Q4)* Con el 3x2 apagado (`activa: false` en local, sin commitear): 10 × 6 cm → $16.000, sin "ahorrás" | local | ⬜ |
| AC-Q4 | *(RF-Q5)* Con 2 copias: "Sumá 1 y una te sale gratis" | recorrido | ⬜ |
| AC-Q5 | *(RF-Q6)* Ningún número de precio escrito a mano en los componentes nuevos | `grep -rnE '\$ ?[0-9]\.?[0-9]{3}' frontend/src/components/personalizados` sin resultados | ⬜ |
| AC-Q6 | *(RF-Q7)* El total del configurador = el subtotal del carrito (con el 3x2) para un carrito vacío al que se agregan esos diseños; el checkout **no** da `price_mismatch` | recorrido hasta el botón de pagar + test de paridad | ⬜ |

### Secciones
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-L1 | *(RF-L1)* La barra de confianza muestra +120.000, +5.000, "2 a 3 días", vinilo premium y resistente al agua, desde el config; a 375 px ocupa ≤ 1 pantalla | inspección | ⬜ |
| AC-L2 | *(RF-L2)* Con el manifiesto de fotos vacío para una sección, esa sección no está en el DOM | test + inspección | ⬜ |
| AC-L3 | *(RF-L3)* Hay un solo selector de tamaño en la página | `querySelectorAll('[role=radiogroup]')` | ⬜ |
| AC-L4 | *(RF-L4, L5, L9, L11)* Cada sección con fotos reales: se ve bien a 375 y 1280, fotos lazy, WebP, `alt` descriptivo | screenshots (⏭️ si todavía no hay fotos, con el motivo) | ⬜ |
| AC-L5 | *(RF-L6, L7, L10, L12)* Editorial, beneficios, proceso y precios presentes con el copy de la spec y los datos del config | inspección | ⬜ |
| AC-L6 | *(RF-L8)* "¿Tu archivo no está perfecto?" presente **solo** si P-3 = sí | inspección | ⬜ |
| AC-L7 | *(RF-L13)* Con 38+ copias de un diseño en 6 cm (3x2 vivo) aparece el link a Negocio con la oferta de `NEGOCIO`; con 37, no (si P-9 = sí) | recorrido | ⬜ |
| AC-L8 | *(RF-L14)* Solo aparecen testimonios marcados `personalizado` | inspección | ⬜ |
| AC-L9 | *(RF-L15)* La FAQ no muestra las preguntas pendientes (P-4/P-5/P-6) hasta tener respuesta | inspección | ⬜ |
| AC-L10 | *(RF-L16)* "Hacer mi calco" del CTA final sube al hero y abre el selector | recorrido | ⬜ |
| AC-L11 | *(RF-L17)* El claim aparece ≤ 3 veces | `document.body.innerText.match(/HACELO CALCO/gi).length` | ⬜ |

### Barra fija y microinteracciones
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-M1 | *(RF-M1, M2)* A 375 px la barra aparece al pasar el CTA del hero, con el mismo texto que él, y se va al llegar al CTA final | recorrido | ⬜ |
| AC-M2 | *(RF-M3)* La barra no tapa contenido; el botón de WhatsApp queda arriba de la barra sin tocarla (`rectWA.bottom < rectBarra.top`) | `getBoundingClientRect` | ⬜ |
| AC-M3 | *(RF-M3)* Safe-area: el `padding-bottom` de la barra incluye `env(safe-area-inset-bottom)` | inspección + 👤 iPhone | ⬜ |
| AC-I1 | *(RF-I1, I2)* ✓ Diseño cargado, cambio de vista y ✓ en el carrito se ven; con *reduced motion* no hay animación | recorrido + emulación | ⬜ |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| ANF-1 | **Mobile** — 375 px sin scroll horizontal (`scrollWidth <= 375`), sin modales, targets ≥ 44 px en todos los controles nuevos | Browser pane + medición | ⬜ |
| ANF-2 | **Performance** — LCP de `/personalizados` no peor que la línea de base de tasks 0.3 (±10 %); ninguna foto de sección con `loading` ≠ `lazy`; ruta sigue `lazy` | medición antes/después | ⬜ |
| ANF-3 | **Accesibilidad** — subida, tamaño, cantidad, vista y CTA operables con teclado; foco visible; `aria-live` en estados | teclado | ⬜ |
| ANF-4 | **Compatibilidad** — un carrito con una línea `custom:6cm:silueta:fxxx` guardada antes del cambio llega al checkout sin `price_mismatch` | `localStorage` con dato viejo | ⬜ |
| ANF-5 | **Sin dependencias nuevas** | `git diff main -- package.json frontend/package.json` solo muestra `postbuild` | ⬜ |
| ANF-6 | **Sin secretos en el bundle** | `grep -r "api_secret\|CLOUDINARY_API" frontend/dist` vacío | ⬜ |
| ANF-7 | **Identidad** — header, footer, fuentes, botones y colores iguales al resto del sitio | screenshots vs Home | ⬜ |
| ANF-8 | **Navegadores** — Safari iOS, navegador de Instagram, Chrome Android | 👤 checklist de `docs/QA-CHECKLIST.md` | ⬜ |
| ANF-9 | **Consola** — sin errores durante el recorrido completo | `read_console_messages` | ⬜ |

---

## 3. Edge cases

| Caso | Comportamiento esperado | Resultado |
|---|---|---|
| Refresco a mitad de subida | Los terminados vuelven; el cortado no | ⬜ |
| El 3x2 se apaga con la página abierta | Desaparece el "ahorrás" sin recargar | ⬜ (test con reloj simulado) |
| PDF / AI / SVG | Ícono / ícono / imagen | ⬜ |
| 100 diseños | El 101 no entra, con aviso | ⬜ (test) |
| Cantidad 5000 tipeada | Queda en 1.000 | ⬜ |
| `sessionStorage` bloqueado | La página funciona sin persistencia | ⬜ (test) |
| `HIDDEN_SECTIONS` con `personalizados` | No se genera `personalizados.html` y la ruta redirige como hoy | ⬜ (test) |

---

## 4. Regresión — lo que NO se puede haber roto

| ID | Criterio | Resultado |
|---|---|---|
| REG-1 | Los tests existentes (524 al 14/9/2026) siguen pasando, más los nuevos | ⬜ |
| REG-2 | Compra por **Mercado Pago** con personalizados hasta el pago | ⬜ (👤 el pago real) |
| REG-3 | Compra por **transferencia** con personalizados de punta a punta | ⬜ |
| REG-4 | El envío se calcula igual en las tres zonas | ⬜ |
| REG-5 | Ningún checkout se rechaza con `price_mismatch` | ⬜ |
| REG-6 | El carrito sobrevive al refresh | ⬜ |
| REG-7 | `purchase` se dispara una sola vez | ⬜ |
| REG-8 | El `value` del `purchase` es lo pagado | ⬜ |
| REG-9 | La nota del pedido (mail + CRM) trae tamaño, corte, copias, instrucciones y el **link** de cada diseño | ⬜ |
| REG-10 | `/pago-exitoso` arma el WhatsApp con la especificación | ⬜ |
| REG-11 | `/polaroid`, `/negocio` y `/mayorista` suben archivos igual que antes | ⬜ |
| REG-12 | El Home y las demás rutas no cambiaron (`git diff --stat` solo toca lo listado en `design.md` §2) | ⬜ |

---

## 5. Analytics

| Evento | Se dispara cuando | Parámetros correctos | Resultado |
|---|---|---|---|
| `personalized_view` + `view_item` | una vez al entrar | `view_item.items[0].item_id` = id de personalizados; Meta `ViewContent` con `006574` | ⬜ |
| `personalized_upload_start` | abrir el selector / soltar archivos | `origen` ∈ hero/sticky/editorial/cta_final | ⬜ |
| `personalized_upload_complete` | cada archivo subido | `file_type`, `file_size_range`; **sin** `nombre` | ⬜ |
| `personalized_upload_error` | formato / peso / red / duplicado / tope | `reason` | ⬜ |
| `personalized_preview` | cambio de vista | `view` | ⬜ |
| `personalized_size_selected` | elegir tamaño | `size` | ⬜ |
| `personalized_quantity_selected` | atajo o cantidad asentada | `quantity` | ⬜ |
| `personalized_configuration_complete` | una vez por tanda | `size`, `quantity`, `designs`, `value` | ⬜ |
| `personalized_add_to_cart` + `add_to_cart` ×N | "Agregar" | ecommerce; `item_name` = "Personalizado · 6 cm · Silueta" (sin archivo) | ⬜ |
| `begin_checkout` / `purchase` con personalizados | checkout | `item_name` sin nombre de archivo | ⬜ |
| `wholesale_click` | link a Negocio | `origen: 'personalizados'` | ⬜ |

**Verificación**
```js
window.dataLayer.filter(e => String(e.event || '').startsWith('personalized_'))
JSON.stringify(window.dataLayer).includes('<nombre del archivo de prueba>')   // false
```
- [ ] GA4 DebugView lo recibe (👤)
- [ ] Meta → Probar eventos recibe `ViewContent` y los custom (👤)
- [ ] No viaja PII: ni nombre, ni URL de archivo, ni instrucciones

---

## 6. ⚠️ Paridad de precios

La feature **no cambia** reglas de precio; solo muestra una estimación.

| ID | Criterio | Resultado |
|---|---|---|
| PAR-1 | `frontend/src/config/pricing.js` sin cambios | ⬜ (`git diff`) |
| PAR-2 | `netlify/functions/lib/pricing.js` sin cambios | ⬜ (`git diff`) |
| PAR-3 | `promoPricing.test.js` pasa | ⬜ |
| PAR-4 | `envio.test.js` pasa | ⬜ |
| PAR-5 | `precioPersonalizados.test.js` pasa, con la paridad `cotizarTanda` ↔ `validateAndPriceOrder` | ⬜ |
| PAR-6 | Un pedido real con personalizados **no** se rechaza con `price_mismatch` | ⬜ (👤 primer pedido después del deploy) |
| PAR-7 | El precio es el mismo en configurador, carrito y checkout | ⬜ |

---

## Definition of Done

### Código
- [ ] §1, §2 y §3 en ✅ (o ⏭️ / 👤 con motivo)
- [ ] §4 en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Comentarios con el **por qué** (D-1, D-2, D-4, D-7, D-11, D-13)

### Seguridad
- [ ] Ningún secreto en el bundle
- [ ] El servidor no confía en el cliente (sin cambios)
- [ ] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/analytics.md`, `docs/architecture.md`, `docs/business-rules.md`,
      `docs/database.md`, `docs/QA-CHECKLIST.md` actualizados

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope reportados
- [ ] Este documento recorrido con resultados reales
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

**Fecha**:
**Ejecutada por**:

### Resumen
| | Cantidad |
|---|---|
| ✅ Cumple | |
| ❌ No cumple | |
| ⏭️ No aplica | |
| 👤 Pendiente de Mariano | |

### Criterios no cumplidos
| ID | Qué pasó | Decisión |
|---|---|---|

### Notas
