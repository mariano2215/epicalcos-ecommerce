# Notificaciones de pedidos (mail + CRM)

Cuando un cliente paga y Mercado Pago **aprueba** el pago, la tienda ahora
puede mandarte automáticamente:

- 📧 Un **mail a `epicalcos@gmail.com`** con TODOS los datos del cliente, el
  pedido completo y el monto pagado.
- 🗂️ Y/o una **fila en una base de datos de Notion** (CRM).

Las dos opciones son independientes y se activan cargando variables de entorno
en Netlify. Si no cargás nada, no se rompe nada: simplemente no notifica (y
seguís recibiendo el mail genérico de Mercado Pago como hasta ahora).

> Todo se configura en **Netlify → tu sitio → Site configuration →
> Environment variables**. Después de agregar variables hay que hacer un
> **redeploy** (Deploys → Trigger deploy → Deploy site) para que tomen efecto.

---

## Opción A — Mail a tu casilla (recomendado, lo más simple)

Usamos [Resend](https://resend.com), un servicio de envío de mails gratis
hasta 3.000 mails por mes.

1. Entrá a **https://resend.com** y creá una cuenta.
   - 👉 **Importante:** registrate con `epicalcos@gmail.com`. En el plan
     gratis y sin dominio propio, Resend solo deja enviar **a la misma casilla
     con la que te registraste**. Como querés que el mail llegue a
     `epicalcos@gmail.com`, registrándote con ese mail funciona perfecto.
2. En el panel de Resend, andá a **API Keys → Create API Key**, copiá la clave
   (empieza con `re_`).
3. En Netlify, agregá estas variables de entorno:

   | Variable | Valor |
   |---|---|
   | `RESEND_API_KEY` | la clave que copiaste (`re_...`) |
   | `NOTIFY_EMAIL_TO` | `epicalcos@gmail.com` |

4. (Opcional) `NOTIFY_EMAIL_FROM` — déjalo sin setear y usa
   `onboarding@resend.dev` por defecto. Si más adelante verificás tu dominio
   en Resend, podés poner algo como `pedidos@epicalcos.com`.
5. **Redeploy** del sitio.

A partir de ahí, cada pago aprobado te llega como mail con asunto
`🛒 Nuevo pedido EPI-... — Nombre — $ monto`.

---

## Opción B — CRM en Notion

1. Creá una **integración** en
   [notion.so/my-integrations](https://www.notion.so/my-integrations) →
   **New integration** → copiá el **Internal Integration Secret**
   (empieza con `ntn_` o `secret_`).
2. Creá en Notion una **base de datos** (tipo tabla) para los pedidos con
   exactamente estas columnas (respetá los nombres y tipos):

   | Columna | Tipo |
   |---|---|
   | `Pedido` | Title (la que viene por defecto) |
   | `Estado` | Select |
   | `Cliente` | Text |
   | `Email` | Email |
   | `Teléfono` | Phone |
   | `Total` | Number |
   | `Envío` | Text |
   | `Fecha` | Date |

3. En esa base de datos: menú **···** (arriba a la derecha) →
   **Connections / Conexiones → Add connection** → elegí la integración que
   creaste. (Sin este paso, Notion da error de permisos.)
4. Copiá el **ID de la base de datos**: está en la URL de la base, es el
   bloque de 32 caracteres antes del `?`.
   Ej: `notion.so/miworkspace/`**`8a1b2c3d...e9f0`**`?v=...`
5. En Netlify, agregá:

   | Variable | Valor |
   |---|---|
   | `NOTION_TOKEN` | el secret de la integración |
   | `NOTION_DATABASE_ID` | el ID de la base de datos |

6. **Redeploy** del sitio.

Cada pago aprobado crea una fila nueva con los datos del pedido y, dentro de
la página, el detalle completo.

---

## Cómo verificar que funciona

1. Confirmá que en Mercado Pago está cargada la URL del webhook:
   **Panel MP → Tu app → Webhooks** → `https://TU-SITIO.netlify.app/api/mercadopago-webhook`,
   evento **payment**.
2. Hacé una compra de prueba (con credenciales de TEST de Mercado Pago).
3. Si algo no llega, mirá los logs en **Netlify → Functions →
   `mercadopago-webhook` → Logs**. Vas a ver líneas `[mp-webhook]` y
   `[notify]` que indican qué pasó.

---

## Qué datos se envían

- **Cliente:** nombre, email, teléfono.
- **Entrega:** método, dirección, ciudad, provincia, código postal, costo de envío.
- **Pedido:** cada producto/pack con cantidad y subtotal + comentarios/detalle.
- **Pago:** monto pagado, estado, medio de pago, ID de pago de MP y fecha.
