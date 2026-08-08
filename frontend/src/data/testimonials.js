/**
 * Testimonios REALES de clientes — una sola fuente.
 *
 * Estaban embebidos en components/Testimonials.jsx, así que no se podían
 * reusar cerca de los puntos de decisión (ficha, carrito). Ahora los consumen
 * `Testimonials` (bloque grande del Home) y `SocialProof` (versión compacta).
 *
 * ⚠️ Solo testimonios reales. No inventar reseñas ni ratings: no hay sistema de
 * reviews, y por eso tampoco se emite `AggregateRating` en el JSON-LD.
 */
export const TESTIMONIALS = [
  {
    name: 'Martin C.',
    text: 'Me encantó la calidad, esta calco de Gokú es genial',
    image: '/testimonials/anime-1.png',
    label: 'Calcos anime'
  },
  {
    name: 'Sofía M.',
    text: 'Tenia que hacer un sticker para la puerta de mi local de mascotas y me quedó re lindo',
    image: '/testimonials/logo-1.png',
    label: 'Logo personalizado'
  },
  {
    name: 'Giuliana S.',
    text: 'Lo lindo que es tomar mates con un termo así de decorado',
    image: '/testimonials/personalizados-1.png',
    label: 'Termo personalizado'
  }
];
