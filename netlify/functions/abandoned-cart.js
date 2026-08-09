/**
 * Netlify Scheduled Function — recordatorio de carrito abandonado.
 *
 * Corre 1 vez por hora, busca carritos con más de `ABANDONED_CART_HOURS` horas
 * sin compra y manda UN solo mail. Ver lib/abandonedStore.js y lib/notify.js.
 *
 * APAGADA POR DEFECTO. Sin `ABANDONED_CART_ENABLED=true` no manda nada y solo
 * loguea. Manda mails a clientes reales: se prende a propósito.
 *
 * Variables de entorno:
 *   ABANDONED_CART_ENABLED=true    (obligatoria) prende el envío
 *   ABANDONED_CART_SECRET          (obligatoria) firma el link de baja
 *   RESEND_API_KEY                 (obligatoria) ya está para los otros mails
 *   NOTIFY_EMAIL_FROM              (obligatoria) dominio verificado en Resend
 *   ABANDONED_CART_HOURS           (opcional, default 4) horas para considerarlo abandonado
 *   ABANDONED_CART_MAX_HOURS       (opcional, default 72) pasado esto ya no se escribe
 *   ABANDONED_CART_MAX_PER_RUN     (opcional, default 25) tope de mails por corrida
 *   ABANDONED_CART_TEST_EMAIL      (opcional) MODO PRUEBA: solo se le escribe a
 *                                  esa dirección; al resto se lo saltea sin tocar
 *                                  su registro. Sirve para probar el flujo en
 *                                  producción sin escribirle a ningún cliente.
 *                                  Quitar la variable = sale en vivo para todos.
 *
 * Formato v2 de Netlify (`export default` + `export const config`): es el que
 * admite `schedule` sin dependencias extra.
 */
import {
  listarCarritos, marcarNotificado, purgar, estaDadoDeBaja, tokenBaja, normalizarEmail
} from './lib/abandonedStore.js';
import { sendAbandonedCartEmail } from './lib/notify.js';

const HORA_MS = 60 * 60 * 1000;

/** Días que se conserva un registro antes de purgarlo (ya notificado o no). */
const RETENCION_DIAS = 30;

const num = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

export default async () => {
  const habilitado = process.env.ABANDONED_CART_ENABLED === 'true';
  const secret = process.env.ABANDONED_CART_SECRET;
  const base = (process.env.URL || 'https://epicalcos.com').replace(/\/$/, '');

  const horas = num(process.env.ABANDONED_CART_HOURS, 4);
  const maxHoras = num(process.env.ABANDONED_CART_MAX_HOURS, 72);
  const maxPorCorrida = num(process.env.ABANDONED_CART_MAX_PER_RUN, 25);

  /**
   * MODO PRUEBA: con `ABANDONED_CART_TEST_EMAIL` seteada, solo se le escribe a
   * esa dirección. Existe porque prender esto sin filtro NO es una prueba: es
   * salir en vivo para todos los clientes al mismo tiempo. Los demás carritos
   * se saltean SIN marcarlos como notificados, así al quitar la variable
   * reciben su recordatorio normalmente.
   */
  const soloA = normalizarEmail(process.env.ABANDONED_CART_TEST_EMAIL || '') || null;
  if (soloA) console.log('[abandoned] MODO PRUEBA: solo se escribe a', soloA);

  if (!habilitado || !secret) {
    console.log('[abandoned] apagado (falta ABANDONED_CART_ENABLED o ABANDONED_CART_SECRET)');
    return new Response(JSON.stringify({ ok: true, enabled: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const ahora = Date.now();
  const carritos = await listarCarritos();

  let enviados = 0;
  let purgados = 0;
  let salteados = 0;

  for (const c of carritos) {
    const edadMs = ahora - Date.parse(c.updatedAt || 0);

    // Purga: registros viejos, ya notificados o no. No hace falta guardar el
    // carrito de alguien que pasó por acá hace un mes.
    if (!Number.isFinite(edadMs) || edadMs > RETENCION_DIAS * 24 * HORA_MS) {
      await purgar(c.email);
      purgados++;
      continue;
    }

    // Tope duro: un mail por carrito. `notifiedAt` solo se limpia si la persona
    // vuelve y arma un carrito nuevo (ver guardarCarrito).
    if (c.notifiedAt) { salteados++; continue; }

    // Todavía puede estar comprando.
    if (edadMs < horas * HORA_MS) { salteados++; continue; }

    // Demasiado viejo: un recordatorio de hace tres días ya no recuerda nada,
    // molesta. Se purga sin escribir.
    if (edadMs > maxHoras * HORA_MS) {
      await purgar(c.email);
      purgados++;
      continue;
    }

    // Modo prueba: al resto ni se lo toca (no se marca notificado), así al
    // quitar la variable reciben su recordatorio como corresponde.
    if (soloA && c.email !== soloA) { salteados++; continue; }

    if (await estaDadoDeBaja(c.email)) { salteados++; continue; }
    if (enviados >= maxPorCorrida) break;

    const token = tokenBaja(c.email, secret);
    const unsubscribeUrl = `${base}/api/unsubscribe?e=${encodeURIComponent(c.email)}&t=${token}`;

    const res = await sendAbandonedCartEmail({
      email: c.email,
      nombre: c.nombre,
      items: c.items || [],
      total: c.total || 0,
      unsubscribeUrl,
      cartUrl: `${base}/carrito?utm_source=email&utm_medium=recordatorio&utm_campaign=carrito_abandonado`
    });

    // Solo se marca si SALIÓ. Si Resend falló, la próxima corrida reintenta en
    // vez de perder el recordatorio para siempre (mismo criterio que el webhook
    // de Mercado Pago con markNotified).
    if (res.sent) {
      await marcarNotificado(c.email);
      enviados++;
    } else {
      console.error('[abandoned] no se pudo enviar:', res.reason, res.detail || '');
      salteados++;
    }
  }

  const resumen = { ok: true, enabled: true, modoPrueba: soloA, total: carritos.length, enviados, purgados, salteados };
  console.log('[abandoned]', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { headers: { 'Content-Type': 'application/json' } });
};

export const config = {
  // Cada hora: con `ABANDONED_CART_HOURS=4`, el recordatorio sale entre las 4 y
  // las 5 horas del abandono. Un cron diario mandaría el mail hasta un día
  // después, cuando ya no recuerda nada.
  schedule: '@hourly'
};
