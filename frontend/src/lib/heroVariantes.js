/**
 * El copy de las dos variantes del hero (spec 015).
 *
 * Vive acá y no adentro de `Hero.jsx` por dos motivos. Uno práctico: los tests
 * corren en `environment: node`, y el guardarraíl de este copy no tiene por qué
 * arrastrar React ni el router para leer dos strings. Y uno de fondo: el copy de
 * un experimento se juzga mejor con las dos variantes una al lado de la otra
 * que repartido entre los `? :` del JSX.
 *
 * LAS DOS APUESTAS
 *
 * `catalogo` (CONTROL, lo que hoy está publicado) promete AMPLITUD: "hay algo de
 * lo tuyo acá adentro". Le habla al que todavía no sabe qué quiere.
 *
 * `objeto` promete un RESULTADO: "así te va a quedar el termo". Le habla al que
 * ya se imagina el objeto y necesita verlo.
 *
 * ⚠️ EL PISO DE SEO (RF-9). El H1 de `objeto` no dice "calcos" —es justamente
 * lo que se está probando—, así que su subtítulo lo dice. La regla vale para
 * cualquier variante que se agregue en el futuro y la verifica
 * `heroVariantes.test.js`: el hero es el H1 de la home, y ninguna variante puede
 * dejar a Google sin la palabra del negocio. El `title`, la meta description y
 * el JSON-LD son la señal fuerte y quedan FUERA del experimento (`lib/seo.js`
 * no se toca).
 *
 * El `h1` viaja partido en dos porque el hero resalta la segunda mitad con
 * `gradient-text`. Se parte acá y no en el JSX para no meter markup en los datos.
 */
export const TITULARES = {
  catalogo: {
    h1: ['Calcos para todo', 'lo que te gusta'],
    subtitulo:
      'Miles de diseños para personalizar tu termo, mate, notebook o botella. Y si querés el tuyo, hacemos stickers personalizados con tu propio diseño.'
  },
  objeto: {
    h1: ['Tu termo.', 'Pero más vos.'],
    subtitulo:
      'Miles de calcos para que tus cosas se parezcan a vos: termo, mate, notebook, botella. Y si querés el tuyo, lo hacemos con tu propio diseño.'
  }
};

/**
 * Texto del CTA principal.
 *
 * `ver_disenos` (CONTROL) describe LA ACCIÓN; `encontra_calcos` describe EL
 * RESULTADO. Los dos tienen que funcionar debajo de CUALQUIERA de los dos
 * titulares —son experimentos independientes y las cuatro celdas existen—, así
 * que ninguno puede depender de lo que diga el H1 de arriba.
 */
export const CTA_PRINCIPAL = {
  ver_disenos: 'Ver todos los diseños',
  encontra_calcos: 'Encontrá tus calcos'
};

/** Variante que se muestra si el experimento está apagado o no existe. */
export const TITULAR_POR_DEFECTO = 'catalogo';
export const CTA_POR_DEFECTO = 'ver_disenos';
