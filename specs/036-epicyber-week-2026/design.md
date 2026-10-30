# Design — EPICYBER WEEK 2026

| | |
|---|---|
| **Spec** | `036-epicyber-week-2026` |
| **Estado** | `IN PROGRESS` |
| **Rama** | `feat/036-epicyber-week-2026`, sobre `main` en `548ae092` |

---

## 1. Decisión central: una línea de pack con precio por fecha

`pack:cyber:{tamano}:{cantidad}:{ts}`, con `quantity: 1`.

**Por qué un pack y no un precio automático por cantidad sobre calcos sueltas:**
$10.990 / 15 da $732,67. El precio unitario redondeado multiplicado por 15 da
$10.995, y el cartel dice $10.990. Una línea única cobra el número exacto; es el
mismo motivo por el que existe `pack:mayorista100`.

**Por qué no se rompe al vencer:** el precio se deriva de la línea y la fecha, y
fuera de ventana vale el **habitual**. Nada se persiste:

```
vigente y aprobado → precio Cyber
cualquier otro caso → habitual (lista × cantidad; escala 032 desde 100)
```

`basePrice` guarda el habitual y `price` lo calcula `precioVidrieraLinea`. Así
`Cart` y `CartDrawer` muestran el tachado sin tocarlos (ya comparan esos dos).

El servidor rechaza 9 cm, cantidades fuera de tabla y `quantity ≠ 1`.

## 2. Precios (espejo)

| Frontend `config/pricing.js` | Servidor `netlify/functions/lib/pricing.js` |
|---|---|
| `CYBER` | `CYBER` |
| `isCyberActive()` | `isCyberActive()` |
| `precioHabitualPack()` | `precioHabitualPack()` |
| `precioPackCyber()` | `precioPackCyber()` |

Los dos `CYBER` son objetos (no constantes sueltas) para que el test pueda
prenderlos sin mocks y correr el flujo completo.

`packCyberDeLinea(id)` parsea el id. `packsCyberVigentes(now)` devuelve los packs
vendibles. `setCyberPreview()` es el único estado del módulo: lo escribe
`lib/cyberPreview.js` en el arranque, antes del primer render.

Tocar `pricing.js` de los dos lados afecta a todo checkout: por eso los packs
existentes no cambian y la rama nueva solo atiende `parts[1] === 'cyber'`.

**Importadores analizados (regla 9):** `CartContext`, `precioVigente`, `PackBuilder`,
`Mayorista`, `plazoProduccion` (dos lados), `create-preference`,
`create-transfer-order` y los tests de paridad.

## 3. Componentes

| Archivo | Cambio |
|---|---|
| `config/epicyber.js` | **Nuevo.** Copy y promos pendientes |
| `lib/cyberPreview.js` | **Nuevo.** `?epicyber=preview` y `?epicyber=off` |
| `components/cyber/*` | **Nuevo.** Banner, card, secciones, armador, upsell, avisos |
| `routes/Epicyber.jsx` | **Nuevo.** `/epicyber`, lazy. Sin campaña → `/categorias` |
| `lib/promo.js` | `useCyberActive`, `usePacksCyber` |
| `context/CartContext.jsx` | El hook en las dependencias de `derived` |
| `lib/precioVigente.js` | Rama `cyber` |
| `lib/plazoProduccion.js` + servidor | Cuenta las calcos del id |
| `lib/analytics.js` | `trackViewPromotion`, `trackSelectPromotion`, campos en `toItems` |
| `components/PackBuilder.jsx` | Ver §4 |
| `components/Header.jsx` | La barra Cyber gana el if/else |
| `routes/Home.jsx` | Banner eager; secciones lazy |
| `routes/Mayorista.jsx` | Durante la campaña, `promo` = pack Cyber |
| `routes/Checkout.jsx` | Corta el pago en vista previa |
| `routes/Cart.jsx`, `CartDrawer.jsx` | Upsell |
| `routes/Producto.jsx`, `Negocio.jsx`, `Personalizados.jsx` | Aviso de una línea |
| `data/categories.js`, `config/selectorCompra.js` | Precio del x100 vigente |

No se toca `styles/index.css`: tiene trabajo sin commitear de otra spec. Se usan
clases de Tailwind y las de siempre (`card-glass`, `gradient-text`, `badge-hot`).

## 4. PackBuilder

Reusa la `promo` que ya existe. Campos opcionales nuevos, con el comportamiento
actual por defecto:

- `promo.tipo`: tipo de línea (default `mayorista100`).
- `promo.habitualDe(size)`: el tachado real (default lista × cantidad).
- `promo.nota`: reemplaza el texto del 9 cm.
- `soloTamanos`: limita el selector de tamaño.
- `semilla`: diseños iniciales y líneas a reemplazar al confirmar.

Se agrega "Completar al azar", que toma diseños de la categoría abierta.

## 5. Vista previa

`?epicyber=preview` guarda la marca en `sessionStorage` y `?epicyber=off` la
borra. Fuerza la campaña **solo en el navegador** y muestra todos los packs con
"SIN APROBAR" y las promos pendientes.

Es segura en producción porque el servidor no sabe de vista previa: un pack a
precio Cyber se rechaza con `price_mismatch`. Para que no llegue a ese error,
`handleSubmit` corta antes con un mensaje claro.

## 6. Home

```
Banner (eager) → Packs chicos (lazy) → HeroSelector → … → Mayoristas (lazy) en el
lugar de OfertaPrincipal → Prueba → Acción
```

Con la campaña apagada el Home renderiza lo mismo que hoy. El banner va en el
chunk principal para no saltar al cargar: es texto, no compite con el LCP.

## 7. Upsell

Sin popups: un texto y un link.

- **Pack en el carrito:** muestra el siguiente y la diferencia. El link abre el
  armador con los diseños sembrados y al confirmar reemplaza la línea. Las líneas
  con diseños propios quedan afuera: `SubidaArchivo` no recibe archivos ya
  subidos, y sembrarlas los perdería.
- **Calcos sueltas:** con el pack más chico que las contiene, compara lo que paga
  hoy contra el pack. Siembra las del tamaño mayoritario.

## 8. Analytics

GA4 tiene eventos recomendados para esto: `view_promotion` y `select_promotion`.
En `toItems`, una línea de campaña suma `promotion_id`, `promotion_name`,
`item_variant` (`x30`), `item_category2` (`pack_chico`/`pack_mayorista`),
`pack_units` y `discount`. `purchaseTracking` guarda los ítems de `pricedItems`:
el descuento incluye la transferencia.

El Pixel no cambia, para no alterar los eventos que ya optimizan los anuncios.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Desincronizar el espejo | Test de paridad campo por campo |
| Aprobar un precio con tachado falso | Test: precio < habitual y > costo |
| Conflicto con la rama 034 (`PackBuilder`, `Mayorista`) | Se resuelve al mergear; la 034 no está en `main` |
| Conflicto con el WIP de `docs/analytics.md` | Sección nueva al final |
| Capacidad de producción con muchos pedidos chicos | Operativo: revisar el plazo de 2 a 3 días |

## 10. Activación y reversión

1. Cargar precio y `aprobado: true` de cada pack en los dos `CYBER`. Hecho con los
   11 packs: es lo que no publica nada.
2. Poner `activa: true` de los dos lados, en el mismo commit: esa es la orden de
   publicar.
3. `npm test`, merge y push a `main` antes del 2/11.

Para bajarla: `activa: false` de los dos lados.

## 11. Cambios durante la implementación

- **La barra va sin contador.** Con los dos, en 375 px los packs quedaban en la
  segunda pantalla. El contador real vive en el banner.
- **`PERSONALIZAR MI PEDIDO` va una vez por sección** y no en cada card: no entra.
- **`selectorCompra.test.js` lee el precio vigente.** Con `$530` a mano habría
  frenado todo deploy del 2 al 8/11: `npm test` es una barrera y corre con el
  reloj real.
- **Los tests de la campaña apagan a mano.** Exigir "viene apagada" habría frenado
  el push que la prende.
- **El texto del banner depende de lo que se vende:** sin mayoristas aprobados no
  nombra "packs para tu marca".
- **Pack de 100 viejo en el carrito:** `sugerenciaCyber` lo manda al armador con sus
  diseños. Con diseños propios no se sugiere, por el mismo motivo que en los packs.
