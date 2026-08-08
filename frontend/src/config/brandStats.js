/**
 * Números de marca — una sola fuente para todo el sitio.
 *
 * Antes vivían solo como strings sueltos dentro del ticker de anuncios
 * (`announcements` en config/site.js). Al centralizarlos, el hero, los bloques
 * de confianza y el ticker no pueden quedar diciendo cifras distintas.
 *
 * ⚠️ Son datos REALES del negocio: si cambian, se cambian acá y en ningún otro lado.
 */
export const brandStats = {
  calcosVendidas: { value: '+120.000', label: 'calcos vendidas' },
  clientes: { value: '+5.000', label: 'clientes' }
};

/**
 * Señales de producto que se pueden sostener (material, resistencia, plazo).
 * No agregar acá nada que EPICALCOS no pueda cumplir.
 */
export const trustPoints = [
  { icon: '💧', text: 'Resistentes al agua' },
  { icon: '☀️', text: 'Resistentes al sol' },
  { icon: '🛡️', text: 'Vinilo premium' },
  { icon: '👥', text: `${brandStats.clientes.value} ${brandStats.clientes.label}` }
];
