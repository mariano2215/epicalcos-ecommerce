import { describe, it, expect } from 'vitest';
import { announcements, shipping } from '../config/site.js';
import { BULK_THRESHOLD } from '../config/pricing.js';
import { formatPrice } from './formato.js';

/**
 * La barra superior del sitio (spec 014).
 *
 * Hasta el 4/9/2026 arrastraba SIETE promesas a la vez. Estos tests son el
 * guardarraíl de la decisión: la barra dice una cosa comercial, con su monto
 * salido del config, y nada más. Si alguien vuelve a colgar ahí "+5.000
 * clientes" o "pagá seguro", la suite lo frena antes del deploy.
 */
describe('barra de anuncios', () => {
  it('no muestra más de dos mensajes', () => {
    expect(announcements.length).toBeGreaterThan(0);
    expect(announcements.length).toBeLessThanOrEqual(2);
  });

  it('sólo lleva promesas comerciales — nada de métricas de marca ni de servicio', () => {
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
    for (const texto of announcements) {
      const t = texto.toLowerCase();
      for (const p of prohibido) {
        expect(t.includes(p), `"${texto}" mezcla "${p}" con la promesa comercial`).toBe(false);
      }
    }
  });

  it('los montos salen del config, no escritos a mano', () => {
    const envio = announcements.find((t) => t.toLowerCase().includes('envío gratis'));
    expect(envio).toBeTruthy();
    expect(envio).toContain(formatPrice(shipping.freeShippingThresholdNational));
  });

  it('el 10% nunca se anuncia sin sus dos condiciones', () => {
    const transferencia = announcements.find((t) => t.includes('10%'));
    if (!transferencia) return; // el mensaje es opcional; si está, tiene que estar completo
    expect(transferencia.toLowerCase()).toContain('transferencia');
    expect(transferencia).toContain(String(BULK_THRESHOLD));
  });
});
