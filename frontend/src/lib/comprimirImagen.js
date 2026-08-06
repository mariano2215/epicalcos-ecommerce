/**
 * Compresión de imágenes EN EL NAVEGADOR, antes de subirlas a Cloudinary.
 *
 * Con el tope de 100 archivos, un pedido de fotos de celular puede ser ~1 GB de
 * subida. Acá se reescalan y se recomprimen en el cliente, así el checkout no
 * depende de la paciencia (ni de los datos) del comprador.
 *
 * Reglas pensadas para NO arruinar la impresión:
 * - Solo toca JPG y PNG. PDF, SVG y AI (los vectoriales, los que mejor cortan)
 *   se suben tal cual.
 * - `maxLado` es 2400 px = 20 cm a 300 DPI. El calco más grande que vendemos es
 *   de 9 cm (≈1063 px a 300 DPI), así que nunca se baja de la resolución útil.
 * - El PNG se re-encoda SOLO si además hay que reescalar: un PNG ya optimizado
 *   suele salir más grande del canvas. La transparencia se mantiene (nunca se
 *   pasa un PNG a JPEG: los cortes en silueta dependen del alfa).
 * - Si el resultado no es más chico que el original, se sube el original.
 */

export const COMPRESION = {
  /** Lado máximo en px (20 cm a 300 DPI). */
  maxLado: 2400,
  /** Calidad del JPEG re-encodado. 0.9 no deja artefactos visibles al imprimir. */
  calidadJpeg: 0.9,
  /** Por debajo de este peso no vale la pena tocar el archivo. */
  minMB: 1.5
};

const TIPOS_SOPORTADOS = ['image/jpeg', 'image/png'];

/** Decodifica el archivo a algo dibujable (bitmap o <img>), respetando el EXIF. */
async function decodificar(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      // `from-image` aplica la orientación del EXIF: al re-encodar se pierde, así
      // que hay que hornearla ahora o las fotos de celular salen giradas.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* seguimos con <img> */
    }
  }
  const url = crearObjectUrl(file);
  if (!url) return null;
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('no se pudo decodificar'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Devuelve una versión más liviana del archivo, o el MISMO archivo si no hay
 * nada que ganar (formato vectorial, imagen chica, o el resultado pesa igual o
 * más). Nunca lanza: ante cualquier error se sube el original.
 * @param {File} file
 * @param {{ maxMB?: number }} [opts] `maxMB` = tope de peso del formulario. Si el
 *        archivo lo supera se intenta re-encodar igual, aunque no haya que
 *        reescalar (último recurso antes de rechazarlo).
 * @returns {Promise<File>}
 */
export async function comprimirImagen(file, { maxMB } = {}) {
  try {
    if (typeof document === 'undefined') return file;
    if (!TIPOS_SOPORTADOS.includes(file.type)) return file;
    const mb = file.size / (1024 * 1024);
    const pasadoDeTope = typeof maxMB === 'number' && mb > maxMB;
    if (mb < COMPRESION.minMB) return file;

    const fuente = await decodificar(file);
    const ancho = fuente?.width;
    const alto = fuente?.height;
    if (!ancho || !alto) return file;

    const escala = Math.min(1, COMPRESION.maxLado / Math.max(ancho, alto));
    const esPng = file.type === 'image/png';
    // Re-encodar un PNG del mismo tamaño casi nunca ayuda: solo se intenta si el
    // archivo ya está pasado del tope y es la única chance de que entre.
    if (esPng && escala === 1 && !pasadoDeTope) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);
    if (typeof fuente.close === 'function') fuente.close();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, file.type, esPng ? undefined : COMPRESION.calidadJpeg)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** `URL.createObjectURL` tolerante (algunos navegadores embebidos lo bloquean). */
function crearObjectUrl(file) {
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}
