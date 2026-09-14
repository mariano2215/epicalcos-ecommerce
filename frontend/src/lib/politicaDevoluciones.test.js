import { describe, it, expect } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Cambios from '../routes/legal/Cambios.jsx';
import Terminos from '../routes/legal/Terminos.jsx';
import FAQ from '../components/FAQ.jsx';
import { devoluciones, anunciosVigentes } from '../config/site.js';

/**
 * La tira de arriba promete "{dias} días de garantía y devolución" en TODAS las
 * páginas (spec 020). Estos tests verifican que la política publicada diga lo
 * mismo que la promesa.
 *
 * Por qué hace falta: hasta el 14/9/2026 /politicas/cambios, los Términos y el
 * FAQ decían "no aceptamos cambios ni devoluciones". Si alguien restaura uno de
 * esos textos —o escribe un plazo a mano que después queda viejo—, la tira
 * seguiría prometiendo una devolución que la política niega, y eso lo lee un
 * cliente antes que nadie.
 *
 * Se renderiza con `react-dom/server` (ya viene con react-dom): la suite corre
 * en entorno `node`, sin DOM ni librería de testing. `useSeo` usa `useEffect`,
 * que en el render de servidor no corre, así que no toca `document`.
 */
const texto = (componente) =>
  renderToStaticMarkup(h(MemoryRouter, null, h(componente)))
    // Sin etiquetas y con espacios normalizados: el JSX parte las frases en
    // varias líneas y mete nodos (<strong>, {dias}) en el medio.
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

const paginas = { Cambios, Terminos, FAQ };

describe('la política de devoluciones dice lo que promete la tira', () => {
  it('la tira promete los días del config', () => {
    expect(anunciosVigentes().some((t) => t.includes(`${devoluciones.dias} días`))).toBe(true);
  });

  for (const [nombre, componente] of Object.entries(paginas)) {
    it(`${nombre} dice el mismo plazo (${devoluciones.dias} días)`, () => {
      expect(texto(componente)).toContain(`${devoluciones.dias} días`);
    });

    it(`${nombre} ya no niega las devoluciones`, () => {
      const t = texto(componente).toLowerCase();
      expect(t).not.toContain('no aceptamos cambios ni devoluciones');
      expect(t).not.toContain('no se aceptan cambios ni devoluciones');
    });
  }

  it('la política exige las calcos sin pegar', () => {
    // Es la condición que hace sostenible la garantía: pegada, una calco no
    // sirve más y no hay nada que devolver.
    expect(texto(Cambios).toLowerCase()).toContain('sin pegar');
  });
});
