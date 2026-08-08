# DASHBOARD DE NEGOCIO — EPICALCOS

Qué mirar, dónde, y cómo leerlo sin engañarse. Todo lo de acá se construye con
los eventos que documenta [`ANALYTICS.md`](ANALYTICS.md).

> ⚠️ **Antes de confiar en cualquier número de esta página**: hay que validar en
> producción que el `purchase` llega bien (ver `QA-CHECKLIST.md` §6). El bug del
> valor inflado se arregló en P0 pero **no se pudo probar contra una compra
> real**. Un dashboard sobre datos rotos es peor que no tener dashboard.

---

## 1. Cómo armarlo en GA4

No hace falta ninguna herramienta extra. Con **Explorar → Exploración de embudo**
y **Exploración de formato libre** alcanza para todo lo de abajo.

Dimensiones personalizadas a registrar en GA4 (Administrar → Definiciones
personalizadas → Crear dimensión personalizada, **ámbito: evento**):

| Nombre | Parámetro | Para qué |
|---|---|---|
| Medio de pago | `payment_method` | separar transferencia de Mercado Pago |
| Tamaño de pack | `pack_size` | rendimiento de x10 / x20 / x50 / x100 |
| Unidades del pack | `pack_units` | tamaño real del pack armado |
| Diseños del pack | `pack_designs` | ¿variedad o repetir el mismo? |
| Contexto WhatsApp | `whatsapp_context` | desde qué página se fugan las consultas |
| Zona de envío | `shipping_zone` | Rosario vs. interior |
| Término sin resultados | `search_term` | qué buscan y no tenemos |

> Las dimensiones personalizadas **no son retroactivas**: recién empiezan a
> juntar datos desde que se crean. Crearlas hoy aunque no se miren todavía.

---

## 2. Adquisición

| Métrica | Dónde |
|---|---|
| Sesiones / usuarios | Informes → Adquisición |
| Origen / medio, campaña | Adquisición → Adquisición de tráfico |
| **Landing page** | Interacción → Páginas y pantallas → *Ruta de página* |

**Lo que importa acá**: con las landings de P2 (`/calcos-termo`,
`/calcos-notebook`, `/calcos-auto`) por fin se puede comparar conversión **por
página de entrada**. Antes casi todo el tráfico pago caía en `/` y no había con
qué comparar.

---

## 3. Ecommerce

| Métrica | Evento |
|---|---|
| Vistas de lista | `view_item_list` |
| Clicks a ficha | `select_item` |
| Vistas de producto | `view_item` |
| Agregados al carrito | `add_to_cart` |
| Checkouts iniciados | `begin_checkout` |
| Medio de pago elegido | `add_payment_info` |
| Compras | `purchase` |
| Ingresos | `purchase.value` |
| Ticket promedio | `purchase.value / purchases` |

---

## 4. Ratios (el corazón del tablero)

| Ratio | Fórmula | Qué diagnostica |
|---|---|---|
| **Conversion rate** | `purchase / sesiones` | la salud general |
| Lista → ficha | `select_item / view_item_list` | ¿los diseños atraen? |
| Ficha → carrito | `add_to_cart / view_item` | ¿la ficha convence? |
| Carrito → checkout | `begin_checkout / view_cart` | ¿asusta el envío o el precio? |
| **Checkout → compra** | `purchase / begin_checkout` | fricción del formulario y del pago |
| Ticket promedio | `revenue / purchases` | ¿funcionan los packs? |

**Dónde suele estar la plata**: si `purchase / begin_checkout` está bajo, el
problema es el checkout (formulario, envío, medio de pago). Si el que está bajo
es `add_to_cart / view_item`, el problema es la ficha (precio, confianza,
tamaño). Son dos trabajos completamente distintos — por eso conviene mirar los
ratios antes que el número final.

---

## 5. Armador de packs

| Métrica | Cómo |
|---|---|
| Inicios | `pack_builder_start` |
| Completados | `pack_completed` |
| **Tasa de completado** | `pack_completed / pack_builder_start` |
| Tamaño más elegido | `pack_builder_start` por `pack_size` |
| Variedad vs. repetición | `pack_designs` vs `pack_units` en `pack_completed` |
| Ingreso atribuido | `pack_completed.value` |

**Cómo leerlo**: una tasa de completado baja en el x50 y alta en el x10 dice que
elegir 50 diseños cansa — la respuesta sería un botón de "completar con lo que ya
elegí", no bajar el precio.

---

## 6. Señales de fricción

| Señal | Evento | Qué hacer si sube |
|---|---|---|
| Búsquedas sin resultado | `search_no_results` | son pedidos de catálogo gratis: mirá los términos |
| Clicks a WhatsApp | `whatsapp_click` + `whatsapp_context` | si se disparan en `/checkout`, hay algo que no se entiende ahí |
| Envío calculado | `shipping_calculated` | cruzarlo con `add_to_cart`: ¿el costo espanta? |
| Leads del popup | `generate_lead` | cuántos capturan el cupón y cuántos compran |

---

## 7. Meta (Administrador de eventos)

- **Calidad de coincidencia de eventos** del `Purchase`: tiene que decir
  "Navegador y servidor". Si dice solo uno de los dos, la deduplicación por
  `event_id` no está funcionando (ver `ANALYTICS.md` §3.4).
- **ROAS por campaña**: solo es confiable **después** de validar el `purchase` en
  producción. Hasta entonces, el número que muestra Meta viene del valor viejo.

---

## 8. Revisión semanal sugerida

1. Conversion rate y ticket promedio de la semana contra las 4 anteriores.
2. Los cinco ratios de la sección 4: ¿cuál se movió?
3. Conversión **por landing page** — ¿alguna campaña manda tráfico a `/`?
4. `search_no_results`: los 10 términos más buscados sin resultado.
5. `whatsapp_click` por página: si aparece `/checkout`, entrar y mirar qué falta.
6. Mix de `payment_method`: cuánto se lleva la transferencia (0 % de comisión de
   MP) y si los pedidos por transferencia se están cobrando de verdad — eso
   último **se cruza con el CRM, no con GA4**.
