# Acceptance — Popup de regalo para EPICYBER WEEK

| | |
|---|---|
| **Spec** | `037-popup-regalo-cyber` |

## Popup

- [x] CA-1 · Con la oferta apagada, el popup del 10 % funciona igual que hoy. — *navegador y suite*
- [x] CA-2 · Prendida, reemplaza al del 10 % y abre en el Home y en `/epicyber`. — *navegador, en vista previa*
- [x] CA-3 · No abre en el armador (`/epicyber?n=`) ni en el checkout. — *navegador y test*
- [x] CA-4 · Lo ve quien ya vio el popup del 10 % o tiene EPICA10. — *test*
- [x] CA-5 · Cerrado no vuelve solo por 2 días; con el mail dejado, no vuelve más. — *test*
- [x] CA-6 · Después del 8/11 a las 23:59:59 vuelve el del 10 % solo. — *test con reloj; el servidor cae al 10 %*
- [x] CA-7 · Sin scroll horizontal a 375 px, con condiciones y fechas visibles. — *navegador: 432 px de alto, 375 de ancho, también con un mail largo*
- [x] CA-8 · En vista previa no se llama al servidor. — *navegador: cero llamadas*

## Regalo

- [x] CA-9 · Mail registrado, compra en fecha y desde el mínimo: hay regalo. — *test contra los dos handlers*
- [x] CA-10 · Sin registro, abajo del mínimo, fuera de fecha o solo archivos: no hay. — *test*
- [x] CA-11 · Un mail ya usado en otro pedido no recibe otro. — *test*
- [x] CA-12 · El mismo pedido reintentado conserva el regalo. — *test*
- [x] CA-13 · Mercado Pago lo aplica solo con el pago aprobado. — *test con `pending`, `in_process` y `rejected`*
- [x] CA-14 · Se compara con el mail del checkout, no con el de Mercado Pago. — *test*
- [x] CA-15 · Los precios del pedido no cambian. — *test*

## Avisos

- [x] CA-16 · El mail interno y el CRM dicen qué sumar. — *test del mail interno; el CRM recibe la misma nota en `notes`*
- [x] CA-17 · La confirmación al cliente menciona el regalo. — *test, en HTML y texto*
- [x] CA-18 · El lead recibe el mail del regalo y queda marcado como EPICYBER. — *test del mail; **el CRM y Notion, sin probar contra el servicio real***

## Robustez

- [x] CA-19 · Con Blobs caído el pedido entra y el aviso interno pide revisar. — *test, con Blobs caído y colgado*
- [x] CA-20 · Si no se guardó el mail, el popup da error y deja reintentar. — *test*

## Definition of Done

- [x] `npm test` en verde: 959 pasan y 17 se saltean, apagada y prendida con el reloj en 6 fechas.
- [x] Build de producción sin errores.
- [ ] **Sin verificar:** un registro real en Blobs y un mail real de Resend. Se prueban con la primera carga en producción.
- [x] Mariano aprobó y dio la orden de publicar, 30/10/2026.
