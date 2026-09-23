/**
 * Deja un archivo listo para subir desde el configurador de /personalizados
 * (spec 023): convierte lo que Cloudinary no acepta, comprime y mide.
 *
 * WEBP → PNG (D-11): el preset unsigned de Cloudinary no acepta WEBP y editarlo
 * requiere el API secret, que no está ni en el repo ni en Netlify. PNG y NO
 * JPEG, por la misma razón que `comprimirImagen` nunca pasa un PNG a JPEG: los
 * WEBP de stickers traen transparencia y el corte en silueta depende del alfa.
 *
 * Solo corre en el navegador. Si la conversión falla (archivo roto, navegador
 * sin soporte), LANZA: el borrador lo muestra como "no pudimos leer esta
 * imagen" en vez de subir algo que Cloudinary va a rechazar.
 */
import { ARCHIVO, extension } from '../config/personalizados.js';
import { comprimirImagen } from './comprimirImagen.js';
import { hayTransparencia } from './vistaCalco.js';

/** `logo.webp` → `logo.png`. Puro. */
export const nombreConvertido = (nombre, ext = 'png') =>
  `${String(nombre).replace(/\.[^./]+$/, '') || 'diseño'}.${ext}`;

async function decodificar(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* seguimos con <img> */
    }
  }
  const url = URL.createObjectURL(file);
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

async function aPng(file) {
  const fuente = await decodificar(file);
  const canvas = document.createElement('canvas');
  canvas.width = fuente.width;
  canvas.height = fuente.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sin canvas');
  ctx.drawImage(fuente, 0, 0);
  if (typeof fuente.close === 'function') fuente.close();
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
  );
  return new File([blob], nombreConvertido(file.name), { type: 'image/png', lastModified: file.lastModified });
}

/**
 * Medidas reales del archivo que se sube y, para PNG, si tiene fondo
 * transparente (se mira en una copia de 128 px: alcanza y es instantáneo).
 */
async function medir(file) {
  try {
    const fuente = await decodificar(file);
    const ancho = fuente.width;
    const alto = fuente.height;
    let transparencia = false;
    if (extension(file.name) === 'png') {
      const lado = 128;
      const k = Math.min(1, lado / Math.max(ancho, alto));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(ancho * k));
      c.height = Math.max(1, Math.round(alto * k));
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(fuente, 0, 0, c.width, c.height);
        transparencia = hayTransparencia(ctx.getImageData(0, 0, c.width, c.height).data);
      }
    }
    if (typeof fuente.close === 'function') fuente.close();
    return { ancho, alto, transparencia };
  } catch {
    return { ancho: null, alto: null, transparencia: null };
  }
}

/**
 * @param {File} file
 * @returns {Promise<{ archivo: File, ancho: number|null, alto: number|null, transparencia: boolean|null }>}
 */
export async function prepararImagen(file, { maxMB = ARCHIVO.pesoMaximoMB } = {}) {
  const ext = extension(file.name);
  let archivo = file;
  if (ARCHIVO.formatosConvertibles.includes(ext)) archivo = await aPng(file);
  archivo = await comprimirImagen(archivo, { maxMB });

  if (ARCHIVO.formatosRaster.includes(extension(archivo.name))) return { archivo, ...(await medir(archivo)) };
  // Un SVG casi siempre es un logo sobre fondo transparente; PDF y AI no se ven.
  return { archivo, ancho: null, alto: null, transparencia: ext === 'svg' ? true : null };
}
