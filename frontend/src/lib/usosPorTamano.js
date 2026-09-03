// src/lib/usosPorTamano.js
// Para qué sirve cada tamaño de calco — escrito UNA sola vez.
//
// Esta tabla vivía adentro de SizeGuide.jsx, que sólo se monta en la ficha de
// producto y en las landings. O sea: la respuesta a "¿qué tamaño le va a un
// termo?" existía, pero no estaba en la grilla de categoría, que es la pantalla
// donde efectivamente se toca "+". El SizePicker de ahí arriba mostraba
// "4 cm · $1.200" y nada más.
//
// Ahora la tabla es un módulo y la consumen los dos: la guía (lista larga) y el
// picker de la grilla (`corto`, una línea que entra abajo del precio a 375 px).
// Mismo criterio que DiscountNote con la condición del 10 %: si el dato se
// escribe dos veces, tarde o temprano las dos pantallas dicen cosas distintas.

/**
 * @type {Record<string, { tag: string, corto: string, para: string[] }>}
 * - `tag`   — cómo se llama ese tamaño en la guía ("Mediana · la más elegida")
 * - `corto` — dos usos, para el botón del SizePicker. Se mantiene CORTO a
 *             propósito: a 375 px cada botón mide ~110 px y una tercera palabra
 *             lo parte en tres líneas.
 * - `para`  — la lista completa, para la guía
 */
export const USOS_POR_TAMANO = {
  '4cm': {
    tag: 'Chica',
    corto: 'Celular · llavero',
    para: ['celular', 'llavero', 'detalles', 'objetos chicos']
  },
  '6cm': {
    tag: 'Mediana · la más elegida',
    corto: 'Termo · notebook',
    para: ['termo', 'notebook', 'botella', 'mate']
  },
  '9cm': {
    tag: 'Grande',
    corto: 'Auto · casco',
    para: ['auto', 'casco', 'vidriera', 'objetos grandes']
  }
};

/**
 * Uso de un tamaño. Devuelve `null` si no está declarado en vez de romper: un
 * tamaño nuevo en SIZES tiene que dejar la UI sin la línea de uso, no en blanco.
 * (El test de paridad avisa para que no quede así.)
 */
export const usoDe = (sizeId) => USOS_POR_TAMANO[sizeId] || null;

/** La línea corta del SizePicker, o cadena vacía si ese tamaño no tiene uso declarado. */
export const usoCorto = (sizeId) => usoDe(sizeId)?.corto || '';
