import { describe, it, expect } from 'vitest';
import { buildDesignSummary, groupCustomItems } from './resumenPedido.js';

/** Línea de personalizado como la emite el configurador: UN diseño por línea. */
const linea = (archivo, { url = null, copias = 1, tamanoLabel = '4 cm', corteLabel = 'Silueta', instrucciones = null } = {}) => ({
  id: `custom:4cm:silueta:${archivo}`,
  type: 'custom',
  name: `Personalizado · ${tamanoLabel} · ${corteLabel} · ${archivo}`,
  quantity: copias,
  basePrice: 1200,
  meta: {
    tipo: 'calcos',
    tamanoLabel,
    corteLabel,
    cantidad: copias,
    instrucciones,
    archivos: [{ nombre: archivo, pesoMB: 1, url }]
  }
});

describe('nota del pedido con personalizados', () => {
  it('la cantidad de la nota es la de los diseños subidos (el bug: 3 diseños, 1 calco)', () => {
    const items = [
      linea('uno.png', { url: 'https://cdn/uno.png' }),
      linea('dos.png', { url: 'https://cdn/dos.png' }),
      linea('tres.png', { url: 'https://cdn/tres.png' })
    ];
    const [grupo] = groupCustomItems(items);
    expect(grupo.unidades).toBe(3);
    expect(grupo.archivos).toHaveLength(3);

    const nota = buildDesignSummary(items);
    expect(nota).toContain('Personalizado (4 cm, corte Silueta, x3)');
    expect(nota).toContain('diseños (3)');
    expect(nota).toContain('https://cdn/tres.png');
    // Un solo bloque, aunque sean 3 líneas del carrito.
    expect(nota.match(/Personalizado \(/g)).toHaveLength(1);
  });

  it('las copias de cada diseño se anotan por archivo y suman al total', () => {
    const items = [
      linea('uno.png', { url: 'https://cdn/uno.png', copias: 5 }),
      linea('dos.png', { url: 'https://cdn/dos.png', copias: 1 })
    ];
    const nota = buildDesignSummary(items);
    expect(nota).toContain('x6)');
    expect(nota).toContain('https://cdn/uno.png (x5)');
    expect(nota).toContain('https://cdn/dos.png');
    expect(nota).not.toContain('https://cdn/dos.png (x');
  });

  it('separa los grupos por tamaño, corte y notas', () => {
    const items = [
      linea('uno.png', { url: 'https://cdn/uno.png' }),
      linea('dos.png', { url: 'https://cdn/dos.png', tamanoLabel: '9 cm' }),
      linea('tres.png', { url: 'https://cdn/tres.png', instrucciones: 'sin fondo' })
    ];
    expect(groupCustomItems(items)).toHaveLength(3);
    expect(buildDesignSummary(items)).toContain('| notas: sin fondo');
  });

  it('sin Cloudinary avisa que los diseños van por WhatsApp', () => {
    const nota = buildDesignSummary([linea('uno.png'), linea('dos.png')]);
    expect(nota).toContain('diseños (2): uno.png, dos.png — se envían por WhatsApp');
  });

  it('una línea vieja con varios archivos no inventa copias por archivo', () => {
    const vieja = {
      id: 'custom:4cm:silueta:1700000000000',
      type: 'custom',
      quantity: 10,
      meta: {
        tamanoLabel: '4 cm',
        corteLabel: 'Silueta',
        cantidad: 10,
        instrucciones: null,
        archivos: [
          { nombre: 'a.png', url: 'https://cdn/a.png' },
          { nombre: 'b.png', url: 'https://cdn/b.png' }
        ]
      }
    };
    const nota = buildDesignSummary([vieja]);
    expect(nota).toContain('x10)');
    expect(nota).toContain('https://cdn/a.png , https://cdn/b.png');
    expect(nota).not.toContain('(x10)');
  });

  it('el pack holográfico dice material, tamaño, corte, x100 entre N diseños, links y notas (enmienda 26/9/2026)', () => {
    const nota = buildDesignSummary([
      {
        id: 'negocio:vinilo-holografico:4cm:1',
        type: 'negocio',
        name: 'Holográfico · 100u 4 cm',
        quantity: 1,
        meta: {
          qty: 100,
          size: '4cm',
          tamanoLabel: '4 cm',
          material: 'vinilo-holografico',
          materialLabel: 'Vinilo Holográfico',
          corte: 'circulo',
          corteLabel: 'Círculo',
          disenos: 2,
          instrucciones: '70 del logo',
          archivos: [
            { nombre: 'logo.png', url: 'https://cdn/logo.png' },
            { nombre: 'gato.png', url: 'https://cdn/gato.png' }
          ]
        }
      },
      { id: 'fixed:material-holografico:1', type: 'fixed', name: 'Recargo · Vinilo Holográfico', quantity: 1 }
    ]);
    expect(nota).toBe(
      'PEDIDO: Vinilo Holográfico (4 cm, corte Círculo, x100 entre 2 diseños) | diseños (2): https://cdn/logo.png , https://cdn/gato.png | notas: 70 del logo'
    );
  });

  it('el pack holográfico de un diseño no dice "entre 1 diseños", y sin Cloudinary avisa WhatsApp', () => {
    const nota = buildDesignSummary([
      {
        type: 'negocio',
        name: 'Holográfico · 100u 6 cm',
        meta: {
          qty: 100,
          tamanoLabel: '6 cm',
          material: 'vinilo-holografico',
          materialLabel: 'Vinilo Holográfico',
          corteLabel: 'Silueta',
          instrucciones: null,
          archivos: [{ nombre: 'logo.png', url: null }]
        }
      }
    ]);
    expect(nota).toBe('PEDIDO: Vinilo Holográfico (6 cm, corte Silueta, x100) | diseños (1): logo.png — se envían por WhatsApp');
  });

  it('no toca packs, negocio ni productos fijos', () => {
    const nota = buildDesignSummary([
      { type: 'fixed', name: 'Polaroid x10', meta: { archivos: [{ nombre: 'foto.jpg', url: 'https://cdn/foto.jpg' }] } }
    ]);
    expect(nota).toBe('PEDIDO: Polaroid x10 | archivos (1): https://cdn/foto.jpg');
  });
});
