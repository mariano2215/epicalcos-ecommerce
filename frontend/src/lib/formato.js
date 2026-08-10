/**
 * Formato de precios en pesos, en un módulo sin React.
 *
 * Vivía dentro de CartContext.jsx, que no se puede importar desde `config/`
 * (arrastra React a un archivo de configuración). Como los textos de config
 * —el ticker de anuncios, por ejemplo— tienen que nombrar los umbrales de envío
 * leyéndolos del config y no a mano, el formateador baja acá y CartContext lo
 * re-exporta: los ~20 `import { formatPrice } from '../context/CartContext.jsx'`
 * que ya existen siguen andando igual.
 */
export const formatPrice = (v) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(v);
