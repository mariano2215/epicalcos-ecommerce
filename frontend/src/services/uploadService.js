/**
 * Subida de diseños a Cloudinary (unsigned upload directo desde el navegador).
 *
 * Se activa cuando están seteadas las env vars:
 *   VITE_CLOUDINARY_CLOUD_NAME    (nombre de la cuenta)
 *   VITE_CLOUDINARY_UPLOAD_PRESET (un upload preset "unsigned")
 *
 * Si NO están, `uploadEnabled` es false y `uploadDesign` resuelve a null: el
 * configurador sigue funcionando (el cliente manda el archivo por WhatsApp).
 *
 * La CARPETA de destino la define el preset (no el request): en unsigned, un
 * preset con carpeta fija ignora cualquier `folder` que mandemos. Por eso, para
 * separar destinos (ej. personalizados/ vs polaroid/) se usa UN PRESET POR
 * DESTINO y se elige con el parámetro `preset` de `uploadDesign`.
 *
 * Nota CSP: cuando se enforce la CSP (hoy report-only), agregar
 *   connect-src https://api.cloudinary.com ; img-src https://res.cloudinary.com
 */
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const uploadEnabled = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Sube un archivo y devuelve su URL pública (secure_url) o null si no hay upload
 * configurado. Rechaza si el upload falla (el llamador cae al fallback de WhatsApp).
 * @param {File} file
 * @param {{ onProgress?: (pct:number) => void, preset?: string }} [opts] `preset`
 *        elige el upload preset (y con él la carpeta); si es falsy usa el default.
 * @returns {Promise<string|null>}
 */
export function uploadDesign(file, { onProgress, preset } = {}) {
  return new Promise((resolve, reject) => {
    if (!uploadEnabled) {
      resolve(null);
      return;
    }
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset || UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url || null);
        } catch {
          reject(new Error('Respuesta inválida de Cloudinary'));
        }
      } else {
        reject(new Error(`Cloudinary respondió ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo'));
    xhr.send(form);
  });
}
