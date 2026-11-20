# Design — Reseñas reales con foto

## 0. Hallazgos del discovery
- Mails por Resend (`netlify/functions/lib/notify.js`); dominio verificado y
  `NOTIFY_EMAIL_FROM` requeridos para mails al cliente.
- Cupones ocultos en `COUPONS` (`config/pricing.js`, espejado): hoy son códigos
  fijos, no de un solo uso.
- Fotos: Cloudinary ya está integrado (cloud name público en `VITE_`; firma en
  el servidor).
- `components/Testimonials.jsx` y `GaleriaUGC.jsx` muestran contenido fijo.

## 1. Arquitectura propuesta

| Decisión | Alternativas | Por qué |
|---|---|---|
| **D-1** Store de Blobs `resenas` (pendiente/aprobada) | Notion | Notion es lento dentro de una función y ya se usa para pedidos |
| **D-2** Cupón de un solo uso: prefijo `RES-` + 6 caracteres guardado en Blobs, validado por el servidor | código fijo | uno fijo se comparte y deja de ser un premio |
| **D-3** Publicación como JSON estático regenerado al aprobar | leer Blobs en cada visita | sin costo en la ficha |
| **D-4** Fase 1 sin código: texto para WhatsApp | esperar al sistema | las primeras 5 reseñas valen más que todo el sistema |

## 2. Componentes afectados
- `netlify/functions/resena.js` (nuevo, POST), `lib/resenaStore.js` (nuevo).
- `config/pricing.js` + servidor: validación de `RES-*` (⚠️ regla 11).
- `routes/Producto.jsx`, `components/GaleriaUGC.jsx`.
- Scheduled Function para el mail de los 7 días.

## 5. Texto de la fase 1 (para que Mariano lo mande)
> ¡Hola {nombre}! Somos EPICALCOS 👋 ¿Nos mandás una foto de dónde pegaste tus
> calcos? Con tu permiso la mostramos en la web, y te regalamos un 10 % para tu
> próximo pedido, opines lo que opines.

## 6. Seguridad
Fotos con límite de tamaño y tipo; sin datos de contacto en el JSON publicado;
rate limit por IP como `/api/contacto`.

## 10. Dependencias nuevas
Ninguna.
