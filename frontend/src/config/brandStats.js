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

/**
 * Los cuatro beneficios del producto, con título y una línea.
 *
 * `trustPoints` (arriba) son PÍLDORAS: texto de 12 px para meter al lado de un
 * CTA sin robarle espacio. Sirven de recordatorio, no de argumento — y hasta el
 * 4/9/2026 eran la única forma en que la Home decía por qué el producto es
 * bueno. Un argumento de venta escrito en 12 px no es un argumento.
 *
 * Esto es la versión que se lee: título propio, una línea de explicación y
 * sección propia. Los dos conviven a propósito y comparten fuente de verdad —
 * las píldoras siguen en la ficha de producto y en /personalizados.
 *
 * ⚠️ Máximo CUATRO. Una lista de ocho ventajas no se lee: se saltea.
 * ⚠️ Nada que EPICALCOS no pueda cumplir.
 */
export const beneficios = [
  {
    icon: '💧',
    titulo: 'Resistentes al agua',
    texto: 'Para termo, mate, botella y uso diario.'
  },
  {
    icon: '☀️',
    titulo: 'Resistentes al sol',
    texto: 'Pensadas para acompañarte mucho tiempo, también en el auto.'
  },
  {
    icon: '🛡️',
    titulo: 'Vinilo premium',
    texto: 'Buena adherencia, corte prolijo y terminación pareja.'
  },
  {
    icon: '🔎',
    titulo: 'Miles de diseños',
    texto: 'Hay algo de casi cualquier cosa que te guste.'
  }
];
