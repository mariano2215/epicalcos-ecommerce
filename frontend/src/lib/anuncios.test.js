import { describe, it, expect } from 'vitest';
import { anunciosVigentes, shipping, devoluciones } from '../config/site.js';
import {
  BULK_THRESHOLD,
  PROMO_2X1_START_MS,
  esCategoriaEn2x1,
  isArgentinaPromoActive
} from '../config/pricing.js';
import { formatPrice } from './formato.js';

/**
 * La tira de arriba del sitio (spec 014 → spec 020).
 *
 * Hasta el 4/9/2026 arrastraba SIETE promesas a la vez; la spec 014 la dejó en
 * dos y la spec 020 la llevó a cuatro, todas respuestas a una duda de compra.
 * Estos tests son el guardarraíl de esas decisiones: si alguien vuelve a colgar
 * ahí "+5.000 clientes" o "pagá seguro", escribe un monto a mano o anuncia una
 * promo que no está viva, la suite lo frena antes del deploy.
 */

// Instantes FIJOS alrededor del arranque del 2x1, no `Date.now()`: si mañana
// alguien apaga el 2x1 con su interruptor, estos tests tienen que seguir
// verificando lo mismo —que la tira acompaña a la promo— sin reescribirse.
const ANTES_DEL_2X1 = PROMO_2X1_START_MS - 60_000;
const CON_EL_2X1 = PROMO_2X1_START_MS + 60_000;
const INSTANTES = [ANTES_DEL_2X1, CON_EL_2X1, Date.now()];

describe('tira de anuncios', () => {
  it('lleva entre uno y cinco mensajes', () => {
    for (const now of INSTANTES) {
      const n = anunciosVigentes(now).length;
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('sólo responde dudas de compra — nada de métricas de marca ni de servicio', () => {
    // Lo que se fue de la barra tiene su propia sección: MetricasConfianza
    // (clientes, calcos, producción) y Beneficios (material, resistencia).
    const prohibido = [
      'clientes',
      'calcos vendidas',
      'producción',
      'produccion',
      'personalizados',
      'mercado pago',
      'seguro',
      'mayorista'
    ];
    for (const texto of anunciosVigentes(CON_EL_2X1)) {
      const t = texto.toLowerCase();
      for (const p of prohibido) {
        expect(t.includes(p), `"${texto}" mezcla "${p}" con las dudas de compra`).toBe(false);
      }
    }
  });

  it('el envío gratis dice LOS DOS umbrales, salidos del config', () => {
    const envio = anunciosVigentes().find((t) => t.toLowerCase().includes('envío gratis'));
    expect(envio).toBeTruthy();
    expect(envio).toContain(formatPrice(shipping.freeShippingThresholdRosario));
    expect(envio).toContain(formatPrice(shipping.freeShippingThresholdNational));
    expect(envio.toLowerCase()).toContain('rosario');
  });

  it('el 10% nunca se anuncia sin sus dos condiciones', () => {
    const transferencia = anunciosVigentes().find((t) => t.includes('10%'));
    if (!transferencia) return; // el mensaje es opcional; si está, tiene que estar completo
    expect(transferencia.toLowerCase()).toContain('transferencia');
    expect(transferencia).toContain(String(BULK_THRESHOLD));
  });

  it('el 2x1 de Argentina se anuncia solo mientras está vivo', () => {
    const anuncia2x1 = (now) =>
      anunciosVigentes(now).some((t) => t.includes('2x1') && /argentina/i.test(t));

    // Antes de que arranque la promo, nunca — sin importar el interruptor.
    expect(anuncia2x1(ANTES_DEL_2X1)).toBe(false);
    // Después, exactamente cuando el motor de precios lo aplica.
    for (const now of INSTANTES) {
      expect(anuncia2x1(now)).toBe(esCategoriaEn2x1('argentina', now));
    }
  });

  it('Argentina nunca se anuncia con un % mientras la promo del 50 % esté vencida', () => {
    // El pedido original decía "calcos argentinas al 50% OFF", y ese 50 % venció
    // el 19/8/2026. Lo vivo es el 2x1: prometer un % sería prometer un precio
    // que el checkout no cobra.
    for (const now of INSTANTES) {
      if (isArgentinaPromoActive(now)) continue;
      for (const t of anunciosVigentes(now)) {
        if (!/argentina/i.test(t)) continue;
        expect(t, `"${t}" promete un % en Argentina`).not.toMatch(/%/);
      }
    }
  });

  it('la garantía dice los días del config', () => {
    const garantia = anunciosVigentes().find((t) => t.toLowerCase().includes('garantía'));
    expect(garantia).toBeTruthy();
    expect(garantia).toContain(`${devoluciones.dias} días`);
  });
});
