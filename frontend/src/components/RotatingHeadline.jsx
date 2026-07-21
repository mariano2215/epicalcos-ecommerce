import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/motion.js';

/**
 * Titular que va rotando frases (en vez de un texto fijo). Todas las frases
 * se apilan en la misma celda de grid → la altura no salta (sin CLS).
 */
const PHRASES = [
  'Stickers que la rompen',
  'Calcos para el termo',
  'Calcos personalizados',
  'Bienvenido a EPICALCOS',
  'Resistentes al agua y al sol'
];

export default function RotatingHeadline({ interval = 2800 }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setI((v) => (v + 1) % PHRASES.length), interval);
    return () => clearInterval(id);
  }, [reduced, interval]);

  // El contenedor ya va con aria-hidden en el Hero (es decorativo, no es el H1),
  // así que acá no hace falta aria-live ni marcar cada frase.
  return (
    <span className="rotating-headline">
      {PHRASES.map((phrase, idx) => (
        <span
          key={idx}
          className={`rotating-headline__item gradient-text ${idx === i ? 'is-active' : ''}`}
        >
          {phrase}
        </span>
      ))}
    </span>
  );
}
