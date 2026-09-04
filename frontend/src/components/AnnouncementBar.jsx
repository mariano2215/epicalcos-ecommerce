import { useEffect, useState } from 'react';
import { announcements } from '../config/site.js';
import { useReducedMotion } from '../lib/motion.js';

/**
 * Barra superior: **un solo mensaje comercial por vez**.
 *
 * Antes era una marquesina infinita con las siete promesas de `announcements`
 * pegadas una atrás de otra, desplazándose sin parar. Tres problemas juntos:
 * (1) siete promesas simultáneas no dejan ninguna en la cabeza, (2) el
 * movimiento permanente compite con el producto, y (3) para leer la última
 * había que esperar a que pasara toda la tira.
 *
 * Ahora `announcements` trae dos mensajes y acá se alterna entre ellos con un
 * crossfade cada `interval`. Las dos frases se apilan en la misma celda de grid
 * —igual que hacía el titular rotante del hero— así la altura no salta y no hay
 * CLS.
 *
 * Con `prefers-reduced-motion` no rota: se queda con el primero, que es el que
 * más pesa en la decisión (el envío gratis).
 *
 * ⚠️ El texto NO se escribe acá. Sale de `config/site.js`, que a su vez lee los
 * umbrales de `shipping` y `BULK_THRESHOLD`.
 */
export default function AnnouncementBar({ interval = 5000 }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced || announcements.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % announcements.length), interval);
    return () => clearInterval(id);
  }, [reduced, interval]);

  if (!announcements.length) return null;

  return (
    <div
      className="anuncio-barra"
      /* aria-live="polite" y no un texto suelto: el que usa lector de pantalla
         no tiene por qué enterarse de cada rotación, pero sí de lo que dice la
         barra cuando llega a ella. */
      role="status"
      aria-live="polite"
    >
      <div className="container-app anuncio-barra__pista">
        {announcements.map((texto, idx) => (
          <span
            key={texto}
            className={`anuncio-barra__item ${idx === (reduced ? 0 : i) ? 'is-active' : ''}`}
            aria-hidden={idx === (reduced ? 0 : i) ? undefined : 'true'}
          >
            {texto}
          </span>
        ))}
      </div>
    </div>
  );
}
