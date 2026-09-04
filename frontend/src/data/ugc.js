/**
 * Fotos REALES de calcos de EPICALCOS puestas en objetos.
 *
 * Todo lo que hay acá salió del Instagram de la marca o de un cliente. **No se
 * agregan mockups ni renders**: la sección existe para responder "¿cómo queda
 * de verdad?", y una foto generada la responde mal justo donde más importa. Es
 * la misma regla que ya rige `data/testimonials.js`.
 *
 * Los archivos se comparten con otras pantallas a propósito (los de
 * /testimonials/ los usa `SocialProof`, los de /images/instagram/ la card de
 * /contacto): son los mismos bytes, ya cacheados, y no hay que subir nada nuevo.
 *
 * `alt` describe la FOTO, que es lo único que lee un lector de pantalla. Nada de
 * "foto 1".
 */
export const UGC = [
  {
    src: '/testimonials/personalizados-1.webp',
    alt: 'Termo blanco con calcos de Homero, una margarita, Stitch y Vans, al lado de un mate en el pasto'
  },
  {
    src: '/testimonials/logo-1.webp',
    alt: 'Calco circular "Pet Friendly" con un perro y un gato pegada en la puerta vidriada de un local'
  },
  {
    src: '/testimonials/anime-1.webp',
    alt: 'Calco de Goku de chico pegada en un termo verde'
  },
  {
    src: '/images/negocio-muestra.webp',
    alt: 'Plancha de calcos troqueladas con el logo rojo y blanco de un negocio'
  },
];

/**
 * ⚠️ SON CUATRO Y NO SEIS A PROPÓSITO. Entraron y salieron dos posteos más del
 * Instagram (el mate con el logo y "Mis dos moods"): en la grilla se leían como
 * placas de campaña —ilustración, texto grande, producto chico— al lado de
 * cuatro fotos donde el calco está PUESTO y se ve. La sección promete "así
 * quedan en la vida real"; una pieza de marketing ahí adentro desmiente al
 * resto. Siguen publicados en la card de /contacto, que es su lugar.
 */
