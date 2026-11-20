# Tablero semanal de conversión

Plan de conversión del 20/11/2026. Se completa **una vez por semana** (lunes),
con la semana anterior de lunes a domingo. El objetivo es volver a ~6 pedidos web
por semana, que era el ritmo de la segunda quincena de septiembre.

Antes de cambiar el Home o lanzar una oferta, se mira esta tabla de las 8
semanas anteriores y las 8 posteriores al 1/10/2026: la caída coincide con la
suba de precios, el fin del 3x2, la transferencia de 20 a 10 %, el Home nuevo
(5/10) y el menú nuevo (16/10), y con menos leads. **Si bajó la pauta, reponerla
es la palanca número uno.**

| Métrica | Base | De dónde sale | Para leerla |
|---|---|---|---|
| Pedidos web pagos | ~6/sem (sep) · ~1/sem (oct–nov) | CRM Notion, pedidos `EPI-` pagados | La que manda |
| Pedidos por lead | 0,30 (sep) · 0,13 (oct–nov) | CRM: pagados / leads "Lead 10% OFF" | Conversión sin depender del tráfico |
| Sesiones | a medir | GA4 → Informes → Adquisición | Si cae junto con los leads, el problema es tráfico |
| Gasto y CPM de Meta | a medir | Administrador de anuncios, por semana | Explica las sesiones |
| Agregados por sesión | a medir | GA4 `add_to_cart` / sesiones | Mide Home y grilla (spec 038) |
| Checkout por carrito | a medir | GA4 `begin_checkout` / `add_to_cart` | "No se anima" |
| Compra por checkout | a medir | GA4 `purchase` / `begin_checkout` | "Se asusta con el total" (spec 039) |
| Calcos por pedido | a medir | GA4 `items` en `purchase` | Oferta de cantidad y packs (040, 041) |
| % de pedidos que cruzan el umbral | a medir | CRM: envío = 0 | Hito y packs (041, 043) |
| % de pedidos fuera de Santa Fe | 21 % | CRM: provincia | Si el resto del país se anima |
| Reseñas acumuladas | 0 | Spec 044 | 5 en 30 días, 50 en 90 |

## A/B abiertos

Ver [`CRO-EXPERIMENTS.md`](CRO-EXPERIMENTS.md). Pendiente de lectura:
`guia_tamano` (abierto desde el 8/8/2026). Propuestos: `home_producto` y
`popup_momento` (spec 038), `carrito_primer_add` (spec 039).

**Nunca un A/B de precio**: el servidor rechaza lo que no coincide.
