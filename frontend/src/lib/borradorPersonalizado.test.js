import { describe, it, expect, vi } from 'vitest';
import {
  crearBorrador,
  estadoCta,
  construirLineas,
  avisoResolucion,
  CLAVE_BORRADOR,
  MENSAJES
} from './borradorPersonalizado.js';
import { ARCHIVO, getTamano } from '../config/personalizados.js';

/** Un "archivo" alcanza con nombre, peso y fecha: el store no lee los bytes. */
const archivo = (name, size = 200_000, lastModified = 1) => ({ name, size, lastModified });
const tic = () => new Promise((r) => setTimeout(r, 0));
async function esperar(fn, vueltas = 20) {
  for (let i = 0; i < vueltas && !fn(); i++) await tic();
}

/** `subir` controlable: cada llamada queda pendiente hasta resolverla a mano. */
function subidaManual() {
  const llamadas = [];
  const subir = vi.fn(
    (file, { onProgress }) =>
      new Promise((resolve, reject) => llamadas.push({ file, onProgress, resolve, reject }))
  );
  return { subir, llamadas };
}

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m };
};

describe('borrador — alta de archivos', () => {
  it('un PNG pasa por preparando → en cola → subiendo → listo, con su link', async () => {
    const { subir, llamadas } = subidaManual();
    const onEvento = vi.fn();
    const b = crearBorrador({ subir, onEvento });
    const p = b.agregarArchivos([archivo('logo.png')]);
    expect(b.leer().disenos[0].estado).toBe('preparando');
    await p;
    await esperar(() => llamadas.length === 1);
    expect(b.leer().disenos[0].estado).toBe('subiendo');
    llamadas[0].onProgress(40);
    expect(b.leer().disenos[0].progreso).toBe(40);
    llamadas[0].resolve('https://res.cloudinary.com/x/logo.png');
    await esperar(() => b.leer().disenos[0].estado === 'listo');
    expect(b.leer().disenos[0]).toMatchObject({ estado: 'listo', url: 'https://res.cloudinary.com/x/logo.png' });
    expect(onEvento).toHaveBeenCalledWith('subido', { ext: 'png', pesoMB: 0.19 });
  });

  it('rechaza un formato que no se acepta, sin sumarlo a la lista', async () => {
    const onEvento = vi.fn();
    const b = crearBorrador({ onEvento });
    const r = await b.agregarArchivos([archivo('video.mp4'), archivo('anim.gif')]);
    expect(r.agregados).toBe(0);
    expect(r.avisos).toEqual([{ motivo: 'formato', mensaje: MENSAJES.formato() }]);
    expect(b.leer().disenos).toHaveLength(0);
    expect(onEvento).toHaveBeenCalledWith('error', { motivo: 'formato' });
  });

  it('el mensaje de formato nombra la lista real y no tiene nada técnico', () => {
    expect(MENSAJES.formato()).toContain('JPG, PNG, WEBP, PDF, SVG o AI');
    for (const m of Object.values(MENSAJES)) expect(m()).not.toMatch(/\b[45]\d{2}\b|mime|payload|error/i);
  });

  it('acepta WEBP (se convierte antes de subir)', async () => {
    const b = crearBorrador();
    const r = await b.agregarArchivos([archivo('sticker.webp')]);
    expect(r.agregados).toBe(1);
  });

  it('ignora el mismo archivo elegido dos veces, con aviso (RF-U6)', async () => {
    const b = crearBorrador();
    await b.agregarArchivos([archivo('a.png')]);
    const r = await b.agregarArchivos([archivo('a.png'), archivo('b.png')]);
    expect(r.agregados).toBe(1);
    expect(r.avisos.map((a) => a.motivo)).toEqual(['duplicado']);
    expect(b.leer().disenos.map((d) => d.nombre)).toEqual(['a.png', 'b.png']);
  });

  it('respeta el tope de archivos', async () => {
    const b = crearBorrador({ max: 2 });
    const r = await b.agregarArchivos([archivo('a.png'), archivo('b.png'), archivo('c.png')]);
    expect(r.agregados).toBe(2);
    expect(r.avisos.map((a) => a.motivo)).toEqual(['tope']);
  });

  it('un archivo que sigue pesado después de comprimir queda con error de peso', async () => {
    const preparar = async () => ({ archivo: archivo('foto.jpg', 11 * 1024 * 1024), ancho: 4000, alto: 3000 });
    const b = crearBorrador({ preparar });
    await b.agregarArchivos([archivo('foto.jpg', 30 * 1024 * 1024)]);
    expect(b.leer().disenos[0]).toMatchObject({ estado: 'error', error: { motivo: 'peso' } });
  });

  it('un archivo que no se puede leer queda con error de lectura', async () => {
    const preparar = async () => {
      throw new Error('roto');
    };
    const b = crearBorrador({ preparar });
    await b.agregarArchivos([archivo('roto.webp')]);
    expect(b.leer().disenos[0].error.motivo).toBe('lectura');
  });

  it('sin subida configurada, el diseño va "por WhatsApp" y se puede agregar (RF-U8)', async () => {
    const subir = vi.fn();
    const b = crearBorrador({ subir, subidaHabilitada: false });
    await b.agregarArchivos([archivo('logo.png')]);
    expect(subir).not.toHaveBeenCalled();
    expect(b.leer().disenos[0].estado).toBe('por_whatsapp');
  });

  it('el tracking que falla no rompe la subida', async () => {
    const b = crearBorrador({
      onEvento: () => {
        throw new Error('fbq');
      }
    });
    await expect(b.agregarArchivos([archivo('video.mov')])).resolves.toMatchObject({ agregados: 0 });
  });
});

describe('borrador — cola, errores y reemplazo', () => {
  it('sube de a 4 en paralelo; el resto espera turno', async () => {
    const { subir, llamadas } = subidaManual();
    const b = crearBorrador({ subir });
    await b.agregarArchivos(Array.from({ length: 6 }, (_, i) => archivo(`d${i}.png`)));
    await esperar(() => llamadas.length === 4);
    expect(llamadas).toHaveLength(ARCHIVO.subidasEnParalelo);
    expect(b.leer().disenos.filter((d) => d.estado === 'en_cola')).toHaveLength(2);
    llamadas[0].resolve('https://x/0.png');
    await esperar(() => llamadas.length === 5);
    expect(llamadas).toHaveLength(5);
  });

  it('quitar un diseño en cola hace que nunca se suba', async () => {
    const { subir, llamadas } = subidaManual();
    const b = crearBorrador({ subir, enParalelo: 1 });
    await b.agregarArchivos([archivo('a.png'), archivo('b.png')]);
    await esperar(() => llamadas.length === 1);
    const b2 = b.leer().disenos[1];
    b.quitar(b2.id);
    llamadas[0].resolve('https://x/a.png');
    await esperar(() => b.leer().disenos[0].estado === 'listo');
    await tic();
    expect(subir).toHaveBeenCalledTimes(1);
    expect(b.leer().disenos).toHaveLength(1);
  });

  it('una subida cortada queda con error; Reintentar la vuelve a subir', async () => {
    const { subir, llamadas } = subidaManual();
    const b = crearBorrador({ subir });
    await b.agregarArchivos([archivo('a.png')]);
    await esperar(() => llamadas.length === 1);
    llamadas[0].reject(new Error('Cloudinary respondió 500'));
    await esperar(() => b.leer().disenos[0].estado === 'error');
    const d = b.leer().disenos[0];
    expect(d.error).toEqual({ motivo: 'red', mensaje: MENSAJES.red() });
    expect(estadoCta({ ...b.leer(), tamano: '6cm' }).tipo).toBe('revisar');
    b.reintentar(d.id);
    await esperar(() => llamadas.length === 2);
    llamadas[1].resolve('https://x/a.png');
    await esperar(() => b.leer().disenos[0].estado === 'listo');
    expect(b.leer().disenos[0].url).toBe('https://x/a.png');
  });

  it('"Agregar igual y mandarlo por WhatsApp" deja entrar el diseño sin link', async () => {
    const { subir, llamadas } = subidaManual();
    const b = crearBorrador({ subir });
    b.setTamano('6cm');
    await b.agregarArchivos([archivo('a.png')]);
    await esperar(() => llamadas.length === 1);
    llamadas[0].reject(new Error('red'));
    await esperar(() => b.leer().disenos[0].estado === 'error');
    b.porWhatsapp(b.leer().disenos[0].id);
    expect(estadoCta(b.leer()).tipo).toBe('agregar');
    expect(construirLineas(b.leer())[0].meta.archivos[0].url).toBeNull();
  });

  it('reemplazar conserva el lugar en la lista y sube el archivo nuevo', async () => {
    const { subir, llamadas } = subidaManual();
    const b = crearBorrador({ subir });
    await b.agregarArchivos([archivo('a.png'), archivo('b.png'), archivo('c.png')]);
    await esperar(() => llamadas.length === 3);
    const viejo = b.leer().disenos[1];
    await b.reemplazar(viejo.id, archivo('b2.png'));
    await esperar(() => llamadas.length === 4);
    const lista = b.leer().disenos;
    expect(lista.map((d) => d.nombre)).toEqual(['a.png', 'b2.png', 'c.png']);
    expect(lista[1].id).not.toBe(viejo.id);
    // La respuesta de la subida vieja llega tarde y se descarta.
    llamadas[1].resolve('https://x/b-viejo.png');
    await tic();
    expect(b.leer().disenos[1].url).toBeNull();
  });
});

describe('estadoCta — el CTA de tres estados (RF-C6, design §3.1)', () => {
  it('subir → crear → esperando → agregar → agregado', async () => {
    const { subir, llamadas } = subidaManual();
    const b = crearBorrador({ subir });
    expect(estadoCta(b.leer()).tipo).toBe('subir');
    await b.agregarArchivos([archivo('a.png')]);
    expect(estadoCta(b.leer()).tipo).toBe('crear');
    b.setTamano('6cm');
    await esperar(() => llamadas.length === 1);
    llamadas[0].onProgress(50);
    expect(estadoCta(b.leer())).toEqual({ tipo: 'esperando', progreso: 50 });
    llamadas[0].resolve('https://x/a.png');
    await esperar(() => estadoCta(b.leer()).tipo === 'agregar');
    b.marcarAgregado();
    expect(estadoCta(b.leer()).tipo).toBe('agregado');
    expect(b.leer().agregado).toEqual({ disenos: 1, unidades: 1 });
    expect(b.leer().disenos).toHaveLength(0);
    expect(b.leer().tamano).toBe('6cm'); // la config queda para la próxima tanda
    b.limpiarAgregado();
    expect(estadoCta(b.leer()).tipo).toBe('subir');
  });

  it('elegir el tamaño por primera vez con un diseño cargado pasa la vista a la calco (RF-P4)', async () => {
    const b = crearBorrador();
    await b.agregarArchivos([archivo('a.png')]);
    expect(b.leer().vista).toBe('original');
    b.setTamano('9cm');
    expect(b.leer().vista).toBe('calco');
    b.setVista('original');
    b.setTamano('4cm');
    expect(b.leer().vista).toBe('original'); // solo la primera vez
  });
});

describe('construirLineas — UNA línea por diseño, con la forma de siempre (D-1)', () => {
  it('3 diseños × 2 copias = 3 líneas custom de cantidad 2, cada una con su link', async () => {
    const b = crearBorrador({ subir: async (f) => `https://res.cloudinary.com/x/${f.name}` });
    b.setTamano('6cm');
    b.setCopias(2);
    b.setInstrucciones('  sin fondo  ');
    await b.agregarArchivos([archivo('a.png'), archivo('b.jpg'), archivo('c.pdf')]);
    await esperar(() => b.leer().disenos.every((d) => d.estado === 'listo'));
    const lineas = construirLineas(b.leer(), { imagenGenerica: 'data:generica' });
    expect(lineas).toHaveLength(3);
    const [a, , c] = lineas;
    const d0 = b.leer().disenos[0];
    expect(a).toEqual({
      // Enmienda 22/9/2026: el material (default Vinilo Blanco, sin elegir nada)
      // viaja como 4º segmento del id, antes del id del diseño — ver design.md §3.2.
      id: `custom:6cm:silueta:vinilo-blanco:${d0.id}`,
      name: 'Personalizado · 6 cm · Silueta · a.png',
      categoryLabel: 'Personalizados',
      image: 'https://res.cloudinary.com/x/a.png',
      basePrice: getTamano('6cm').precio, // el de lista, de config (spec 027 los subió)
      quantity: 2,
      meta: {
        tipo: 'calcos',
        tamano: '6cm',
        tamanoLabel: '6 cm',
        corte: 'silueta',
        corteLabel: 'Silueta',
        material: 'vinilo-blanco',
        materialLabel: 'Vinilo Blanco',
        cantidad: 2,
        instrucciones: 'sin fondo',
        archivos: [{ nombre: 'a.png', pesoMB: 0.19, url: 'https://res.cloudinary.com/x/a.png' }]
      }
    });
    // Un PDF no se ve como miniatura: va la genérica, pero el link viaja igual.
    expect(c.image).toBe('data:generica');
    expect(c.meta.archivos[0].url).toBe('https://res.cloudinary.com/x/c.pdf');
    expect(new Set(lineas.map((l) => l.id)).size).toBe(3);
  });

  it('sin tamaño no hay líneas', async () => {
    const b = crearBorrador({ subir: async () => 'https://x/a.png' });
    await b.agregarArchivos([archivo('a.png')]);
    await esperar(() => b.leer().disenos[0].estado === 'listo');
    expect(construirLineas(b.leer())).toEqual([]);
  });

  it('los nombres largos se acotan', () => {
    const e = {
      tamano: '4cm',
      corte: 'circulo',
      copias: 1,
      instrucciones: '',
      disenos: [{ id: 'f1', nombre: `${'x'.repeat(60)}.png`, extSubida: 'png', pesoMB: 1, url: 'u', estado: 'listo' }]
    };
    expect(construirLineas(e)[0].name.length).toBeLessThan(80);
  });
});

describe('borrador — sobrevive a navegar y a refrescar (RF-U9)', () => {
  it('guarda la config y los diseños subidos; una pestaña nueva los recupera', async () => {
    const storage = memoria();
    const b = crearBorrador({ subir: async () => 'https://x/a.png', storage });
    b.setTamano('9cm');
    b.setCopias(5);
    await b.agregarArchivos([archivo('a.png')]);
    await esperar(() => b.leer().disenos[0].estado === 'listo');
    expect(storage.getItem(CLAVE_BORRADOR)).toContain('https://x/a.png');

    const otra = crearBorrador({ storage });
    expect(otra.leer()).toMatchObject({ tamano: '9cm', copias: 5 });
    expect(otra.leer().disenos[0]).toMatchObject({ estado: 'listo', url: 'https://x/a.png', previewUrl: 'https://x/a.png' });
  });

  it('lo que todavía se estaba subiendo NO se persiste', async () => {
    const storage = memoria();
    const { subir } = subidaManual();
    const b = crearBorrador({ subir, storage });
    await b.agregarArchivos([archivo('a.png')]);
    expect(crearBorrador({ storage }).leer().disenos).toHaveLength(0);
  });

  it('con el storage bloqueado funciona igual, en memoria', async () => {
    const roto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      }
    };
    const b = crearBorrador({ subir: async () => 'https://x/a.png', storage: roto });
    b.setTamano('6cm');
    await b.agregarArchivos([archivo('a.png')]);
    await esperar(() => b.leer().disenos[0].estado === 'listo');
    expect(estadoCta(b.leer()).tipo).toBe('agregar');
  });

  it('un borrador guardado con datos inválidos se sanea', () => {
    const storage = memoria();
    storage.setItem(CLAVE_BORRADOR, JSON.stringify({ tamano: '99cm', corte: 'x', copias: 5000, disenos: [{ id: 'f1' }] }));
    const e = crearBorrador({ storage }).leer();
    expect(e).toMatchObject({ tamano: null, corte: 'silueta', copias: 1000, disenos: [] });
  });
});

describe('borrador — Vinilo Holográfico solo en 4 y 6 cm (enmienda 26/9/2026, RF-MAT13)', () => {
  it('pasar a holográfico con 9 cm deselecciona el tamaño (no lo cambia solo: D-4)', async () => {
    const b = crearBorrador({ subir: async () => 'https://x/a.png' });
    await b.agregarArchivos([archivo('a.png')]);
    b.setTamano('9cm');
    b.setMaterial('vinilo-holografico');
    expect(b.leer()).toMatchObject({ material: 'vinilo-holografico', tamano: null });
    expect(estadoCta(b.leer()).tipo).toBe('crear');
  });

  it('con 4 o 6 cm elegido, pasar a holográfico no toca el tamaño', () => {
    const b = crearBorrador();
    b.setTamano('4cm');
    b.setMaterial('vinilo-holografico');
    expect(b.leer().tamano).toBe('4cm');
  });

  it('con holográfico, 9 cm no se puede elegir; con otro material sí', () => {
    const b = crearBorrador();
    b.setMaterial('vinilo-holografico');
    b.setTamano('9cm');
    expect(b.leer().tamano).toBeNull();
    b.setMaterial('dtf-uv');
    b.setTamano('9cm');
    expect(b.leer().tamano).toBe('9cm');
  });

  it('un borrador guardado en holográfico + 9 cm vuelve sin tamaño', () => {
    const storage = memoria();
    storage.setItem(CLAVE_BORRADOR, JSON.stringify({ tamano: '9cm', material: 'vinilo-holografico', corte: 'silueta', copias: 3, disenos: [] }));
    expect(crearBorrador({ storage }).leer()).toMatchObject({ tamano: null, material: 'vinilo-holografico' });
  });

  it('el pack agregado cuenta 100 calcos, no diseños × copias', async () => {
    const b = crearBorrador({ subir: async (f) => `https://x/${f.name}` });
    await b.agregarArchivos([archivo('a.png'), archivo('b.png')]);
    b.setTamano('6cm');
    b.setMaterial('vinilo-holografico');
    b.setCopias(3);
    await esperar(() => estadoCta(b.leer()).tipo === 'agregar');
    b.marcarAgregado();
    expect(b.leer().agregado).toEqual({ disenos: 2, unidades: 100 });
  });
});

describe('avisoResolucion — avisa sin bloquear (RF-U13)', () => {
  it('una imagen chica para 9 cm avisa; para 4 cm no', () => {
    const d = { ancho: 300, alto: 300 };
    expect(avisoResolucion(d, '9cm')).toMatch(/531 px.*Podés agregarla igual/);
    expect(avisoResolucion(d, '4cm')).toBeNull();
    expect(avisoResolucion({ ancho: null }, '9cm')).toBeNull();
    expect(avisoResolucion(d, null)).toBeNull();
  });
});
