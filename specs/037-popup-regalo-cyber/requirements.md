# Requirements — Popup de regalo para EPICYBER WEEK

| | |
|---|---|
| **Spec** | `037-popup-regalo-cyber` |
| **Estado** | `IN PROGRESS` — publicada el 30/10/2026 por orden de Mariano; se cierra con el primer regalo real |
| **Fecha** | 30/10/2026 |
| **Autor** | Mariano (pedido) · Claude (spec) |

> Mismo criterio que las specs 034 y 036: rama aparte, sin push y con la oferta
> apagada. Es la "spec chica sobre el popup de la 026" que dejó anotada la 025.

---

## 0. El pedido, textual

> *Que salga un POP UP cuando la gente ingrese de "DEJA TU MAIL Y RECIBI UN EXTRA
> PARA LA CYBERWEEK del 2 al 8/11". (1 pack de calcos de regalo si ese mail compra
> después).*

## 1. Problema

- El popup actual ofrece 10 % OFF, que **no se aplica a los packs Cyber**: durante
  la campaña promete algo que el producto principal no recibe.
- Abre a los 12 o 15 segundos, solo en el Home, y quien ya lo vio queda bloqueado
  de 7 a 30 días.
- Los mails van a Notion y al CRM. **Nada consultable al crear un pedido**, así que
  hoy no se puede saber si ese mail compró.

## 2. Objetivo

Captar mails antes y durante la campaña, y que quien compre del 2 al 8/11 con ese
mail reciba un pack de regalo sin que Mariano tenga que cruzar datos a mano.

## 3. Scope

**Adentro:** la oferta nueva del popup, el registro del mail, el cruce al comprar
y el aviso del regalo en mails y CRM.

**Afuera:** mails de recordatorio masivos, una línea de regalo en el carrito, elegir
los diseños del regalo, y cambios de precios o de envío.

## 4. User stories

- Como visitante quiero dejar mi mail y saber qué recibo y con qué condición.
- Como comprador quiero que el regalo se aplique solo si compro con ese mail.
- Como Mariano quiero ver en el aviso del pedido que tengo que sumar el regalo.

## 5. Requisitos funcionales

### Popup

- **RF-1** Desde que se publica hasta el 8/11 a las 23:59:59 reemplaza al popup del
  10 %. Después vuelve el de siempre, sin intervención.
- **RF-2** Abre a los 3 segundos en el Home y en `/epicyber`, no en el armador. No
  abre si la persona está escribiendo, con el carrito abierto o recién agregó algo.
- **RF-3** Tiene su propia memoria: lo ve también quien ya vio el popup del 10 % o
  tiene ese cupón. Una vez por sesión; cerrado, no vuelve solo por 2 días; con el
  mail dejado, no vuelve más.
- **RF-4** Dice el regalo, las fechas y las condiciones antes de pedir el mail.
- **RF-5** Quien lo cerró puede reabrirlo desde el botón flotante "🎁 Regalo Cyber".
- **RF-6** Vista previa: no guarda nada ni manda mails.

### Regalo

- **RF-7** Un pack de 10 calcos sorpresa de 4 cm, por mail.
- **RF-8** Vale para compras del 2 al 8/11, con ese mismo mail, desde $8.000 en
  productos, con cualquier medio de pago. No vale para pedidos de solo archivos.
- **RF-9** El checkout llega precargado con el mail que dejó en ese dispositivo.
- **RF-10** Se aplica una sola vez por mail. Un reintento de Mercado Pago sobre el
  mismo pedido no lo pierde ni lo duplica.
- **RF-11** Por Mercado Pago se aplica con el pago **aprobado**; por transferencia,
  al crear el pedido, porque no hay aviso de pago automático.
- **RF-12** Se compara con el mail del checkout, nunca con el de la cuenta de
  Mercado Pago.

### Avisos

- **RF-13** El mail interno y el CRM dicen qué sumar al pedido; el mail al cliente
  le confirma el regalo.
- **RF-14** Quien deja el mail recibe por mail el regalo y sus condiciones.
- **RF-15** El CRM y Notion marcan esos leads como de EPICYBER.

### Robustez

- **RF-16** Ningún fallo del regalo puede frenar, demorar de más ni cambiar el precio
  de un pedido.
- **RF-17** Si no se pudo consultar la base, el aviso interno lo dice para revisarlo
  a mano. Al cliente no se le promete nada.
- **RF-18** Si no se pudo guardar el mail, el popup lo dice y deja reintentar. No
  confirma un regalo que después no se va a poder reconocer.

## 6. Requisitos no funcionales

- **Mobile:** diseñado para 375 px, con el botón visible aunque abra el teclado.
- **Performance:** el diálogo se carga aparte, como hoy.
- **Reversible:** un interruptor de cada lado.
- **Privacidad:** el registro guarda solo el mail, las fechas y el pedido.

## 7. Reglas de negocio

**Costo del regalo:** 10 × $119 = **$1.190**. Va en la misma caja: no suma costo fijo
ni envío. Valor de lista: $16.000.

**Por qué $8.000:** es el pedido más chico que no pierde plata con el regalo. Con la
fórmula `$5.000 + $119 × calcos`, 5 calcos de 4 cm son $8.000 y dejan $1.215; 4 calcos
($6.400) pierden $266.

| Pedido | Paga | Costo con regalo | Margen |
|---|---|---|---|
| 1 calco de 4 cm, si no hubiera mínimo | $1.600 | $6.309 | −$4.709 |
| 5 calcos de 4 cm | $8.000 | $6.785 | $1.215 |
| x10 por transferencia | $8.991 | $7.380 | $1.611 |
| x10 por Mercado Pago | $9.990 | $7.380 | $2.610 |
| x20 | $12.990 | $8.570 | $4.420 |
| x30 | $15.990 | $9.760 | $6.230 |
| x50 | $21.990 | $12.140 | $9.850 |

**Aprobado por Mariano el 30/10/2026:** pack de 10 calcos sorpresa de 4 cm, con compra desde $8.000.

## 8. Edge cases

- Deja el mail hoy y compra el 31/10 → sin regalo: la compra está fuera de fechas.
- Paga un Rapipago el 9/11 por un pedido del 8/11 → con regalo: cuenta el pedido.
- Mismo mail en dos pedidos → regalo solo en el primero.
- Transferencia que nunca se paga → ese regalo queda usado. Se resuelve a mano.
- Deja el mail dos veces → no pierde el regalo ni se reinicia.
- Tiene EPICA10 activo → lo conserva y también ve este popup.

## 9. Analytics

| Evento | Con qué |
|---|---|
| `popup_view`, `popup_close`, `popup_email_submit` | `popup_variant: cyber_regalo` |
| `generate_lead` | `popup_variant: cyber_regalo`, `promotion_id: epicyber_2026` |
