/**
 * Copia el código al portapapeles. Si el navegador no deja (el de Instagram,
 * o un contexto sin permiso), lo deja SELECCIONADO para que la persona lo
 * copie con el menú del sistema. Nunca tira.
 *
 * @returns {Promise<'ok'|'manual'>}
 */
export async function copiarCodigo(texto, elemento) {
  try {
    await navigator.clipboard.writeText(texto);
    return 'ok';
  } catch {
    try {
      const rango = document.createRange();
      rango.selectNodeContents(elemento);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(rango);
    } catch {
      /* sin selección tampoco: el código igual está a la vista */
    }
    return 'manual';
  }
}
