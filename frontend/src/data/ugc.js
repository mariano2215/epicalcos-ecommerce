/**
 * Las imágenes de producto de la Home.
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

/**
 * La pieza de Antes/Después.
 *
 * ⚠️ NO ES UGC, y por eso vive fuera del array de arriba: es una pieza de marca
 * —un termo partido al medio, liso de un lado y cubierto de calcos del otro—,
 * no la foto espontánea de un cliente. Mezclarla con el UGC sería presentar una
 * composición como si fuera la foto de alguien, que es justo lo que el array de
 * arriba no hace.
 *
 * Acá sí corresponde: la sección no promete "esto le pasó a un cliente", sino
 * "esto es lo que hacen las calcos con tu termo". Y los calcos que se ven son
 * los del catálogo, sobre un termo de verdad.
 *
 * Reemplazó al posteo de Instagram que se usaba antes, que era un recorte
 * cuadrado con el "ANTES"/"DESPUÉS" cortado en los bordes ("ANTES" / "DESPUÉ").
 * Esta trae los dos rótulos enteros y el corte al medio del MISMO objeto, que es
 * lo que hace legible la comparación de un vistazo.
 *
 * ⚠️ Los rótulos están DENTRO de la imagen. No agregarles encima unos en HTML:
 * la versión anterior los necesitaba porque el archivo los traía cortados, y
 * duplicarlos ahora sería escribir "ANTES" dos veces. Por eso el `alt` los dice
 * — es lo único que le llega a un lector de pantalla.
 */
export const ANTES_DESPUES = {
  src: '/images/antes-despues-termo.webp',
  alt:
    'Un mismo termo negro partido al medio: la mitad "antes" lisa y la mitad "después" cubierta de calcos de NASA, Jurassic Park, Goku, Bart Simpson, Messi y la ola de Hokusai',
  width: 1080,
  height: 1080
};
