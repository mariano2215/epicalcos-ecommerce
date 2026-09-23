import { useSyncExternalStore } from 'react';
import { crearBorrador } from '../../lib/borradorPersonalizado.js';
import { uploadDesign, uploadEnabled } from '../../services/uploadService.js';
import { prepararImagen } from '../../lib/prepararImagen.js';
import { trackPersonalizedUploadComplete, trackPersonalizedUploadError } from '../../lib/analytics.js';

/** `sessionStorage` si el navegador lo deja usar (en algunos embebidos tira al tocarlo). */
function sesion() {
  try {
    const s = window.sessionStorage;
    s.getItem('epicalcos.probe');
    return s;
  } catch {
    return null;
  }
}

let store = null;

/**
 * El borrador de /personalizados con los servicios reales. Es UNO por pestaña y
 * se crea recién la primera vez que alguien lo pide: vive fuera del árbol de
 * React a propósito, para que la cola de subidas siga andando aunque la página
 * se desmonte (ver el docblock de `lib/borradorPersonalizado.js`).
 */
export function borrador() {
  if (!store) {
    store = crearBorrador({
      subir: (file, { onProgress }) => uploadDesign(file, { onProgress }),
      preparar: prepararImagen,
      subidaHabilitada: uploadEnabled,
      storage: sesion(),
      crearUrl: (file) => {
        try {
          return URL.createObjectURL(file);
        } catch {
          return null; // algunos navegadores embebidos lo bloquean: queda sin miniatura
        }
      },
      revocarUrl: (url) => {
        try {
          if (String(url).startsWith('blob:')) URL.revokeObjectURL(url);
        } catch {
          /* nada que liberar */
        }
      },
      onEvento: (tipo, datos) =>
        tipo === 'subido' ? trackPersonalizedUploadComplete(datos) : trackPersonalizedUploadError(datos?.motivo)
    });
  }
  return store;
}

/** `[estado, acciones]` del borrador, re-renderizando con cada cambio. */
export function useBorrador() {
  const s = borrador();
  const estado = useSyncExternalStore(s.suscribir, s.leer, s.leer);
  return [estado, s];
}
