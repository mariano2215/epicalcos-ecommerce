import { useEffect, useRef, useState } from 'react';
import { staggerDelay } from '../lib/motion.js';

/**
 * Envuelve contenido y lo anima (fade + subida) cuando entra en viewport.
 * Si no hay IntersectionObserver, muestra el contenido directamente.
 *
 * La duración y la curva salen de los tokens (`--motion-reveal`,
 * `--motion-ease`): ver el bloque MOTION de styles/index.css. Acá solo vive el
 * *cuándo*.
 *
 * `delay` sigue aceptando un número de milisegundos como siempre. `indice` es la
 * forma preferida para una lista: pasa la posición y el escalonado lo calcula
 * `staggerDelay()`, que además lo topea — sin eso, una grilla de 61 categorías
 * dejaría a la última entrando casi cuatro segundos después de la primera.
 *
 * ⚠️ Dispara UNA sola vez (`io.disconnect()` en cuanto entra). Volver a animar
 * cada vez que algo cruza el viewport convierte un scroll de vuelta en un
 * parpadeo de la página entera — es lo que el brief §7 pide evitar y lo que este
 * componente ya hacía bien desde la spec 014.
 */
export default function Reveal({ children, as: Tag = 'div', delay = 0, indice, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const espera = indice != null ? staggerDelay(indice) : delay;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={espera ? { transitionDelay: `${espera}ms` } : undefined}
      className={`reveal ${shown ? 'reveal--in' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}
