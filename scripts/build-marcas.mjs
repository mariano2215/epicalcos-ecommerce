#!/usr/bin/env node
/**
 * build-marcas.mjs — prepara los logos de clientes para el ticker circular
 * de components/MarcasConfiaron.jsx.
 *
 * POR QUÉ EXISTE: los logos llegan como vinieron de cada marca — capturas de
 * Instagram, PNG con alfa, un PDF disfrazado de .png, fotos. Recortarlos a mano
 * cada vez que entra un cliente nuevo termina en tamaños dispares y logos
 * cortados por la máscara circular. Esto lo hace igual siempre.
 *
 * EL PROBLEMA DEL CÍRCULO: una máscara redonda se come las esquinas. Un
 * wordmark ancho ("Shippear.", "MANHATTAN") pegado al borde pierde las puntas.
 * Por eso no se recorta al cuadrado y listo: se recorta el fondo plano, se mide
 * el contenido y se lo escala al RECTÁNGULO MÁS GRANDE DE ESA PROPORCIÓN QUE
 * ENTRA EN EL CÍRCULO (w = D·r/√(1+r²), h = D/√(1+r²), con r = ancho/alto).
 * Una tira ancha y baja usa casi todo el diámetro; un logo cuadrado se queda en
 * el ~70 %. El resto del lienzo se rellena con el color de fondo del propio
 * logo, así el círculo se ve como el fondo del logo y no como un recorte.
 *
 * Los tres modos (columna `recorte` de la tabla):
 *   - `ajustar` (default) → recorta el fondo plano y aplica la fórmula de arriba.
 *   - `circulo`  → el logo YA es un círculo (Sacro, Mentha, Trapitos, LW). Se
 *                  recorta el fondo y se estira al diámetro completo: si se
 *                  "ajustara" quedaría un círculo dentro de otro círculo.
 *   - `cover`    → no hay fondo plano que recortar (fotos, tramas). Se recorta
 *                  al cuadrado central como una foto de perfil. Con `zoom` se
 *                  agranda antes de recortar, para empujar afuera lo que no
 *                  suma (Wens trae la URL impresa abajo del logo).
 *
 * Salida: frontend/public/images/marcas/<slug>.webp de 256×256 (el slot más
 * grande son 96 px, así que cubre pantallas 2,5×) + reescribe
 * frontend/src/data/marcas.js, que es lo que consume el componente.
 *
 * Uso:  node scripts/build-marcas.mjs
 * Requiere `magick` (brew install imagemagick), `cwebp` (brew install webp) y,
 * sólo por strive-1.png, `pdftoppm` (brew install poppler).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = process.env.MARCAS_SRC || '/Users/marianocalandra/Documents/Mariano/Marcas que confiaron';
const OUT_IMG = join(ROOT, 'frontend', 'public', 'images', 'marcas');
const OUT_DATA = join(ROOT, 'frontend', 'src', 'data', 'marcas.js');

/**
 * La tira vieja. De estas 11 marcas NO existe el archivo suelto: el único lugar
 * donde sobrevive su logo es adentro de este collage, en blanco sobre gris.
 * Por eso el archivo no se borra aunque ya no se muestre en ninguna página: es
 * el original. Las coordenadas de cada recorte salieron de un análisis de
 * componentes conexos sobre la imagen umbralizada, no de medir a ojo.
 */
const COLLAGE = join(ROOT, 'frontend', 'public', 'images', 'marcas-clientes.webp');

/** Diámetro del archivo final. El slot más grande del ticker son 96 px. */
const D = 256;
/** Aire entre el contenido y el borde del círculo. 1.0 = pegado al filo. */
const PADDING = 0.92;

/**
 * El orden de esta tabla ES el orden del ticker: va alternando fondos claros y
 * oscuros a propósito, porque ordenadas alfabéticamente se amontonan cinco
 * fondos blancos seguidos y la tira parece un bloque vacío. Las 11 recortadas
 * del collage son todas gris oscuro, así que van repartidas entre las de color
 * y no en bloque.
 *
 * `archivo` es el nombre tal cual está en la carpeta de origen — no se
 * renombran los originales, se mapean acá. `crop` significa que la marca no
 * tiene archivo propio y sale del collage viejo (ver COLLAGE arriba).
 *
 * Quedaron AFUERA a propósito:
 *   - marcasviejas.webp   → es la tira vieja (idéntica a images/marcas-clientes.webp)
 *   - wensredondo.jpeg    → es una captura de la carpeta, no un logo
 */
const MARCAS = [
  { archivo: 'Shippear.jpg', slug: 'shippear', nombre: 'Shippear' },
  { archivo: 'Cilantro.jpg', slug: 'cilantro', nombre: 'Cilantro Espacio Holístico' },
  { crop: '366x184+91+60', slug: 'lo-de-tarpino', nombre: 'Lo de Tarpino' },
  { archivo: 'MedioMedico.jpg', slug: 'medio-medico', nombre: 'Medio Médico' },
  { archivo: 'brutoestudio.jpg', slug: 'bruto-estudio', nombre: 'Bruto Estudio' },
  { archivo: 'emma compleme.jpg', slug: 'emma-complementos', nombre: 'Emma Complementos' },
  { crop: '464x111+520+96', slug: 'goat-brand', nombre: 'Goat Brand' },
  { archivo: 'huella.jpg', slug: 'huella', nombre: 'Huella Tienda de Mascotas' },
  { archivo: 'strive-1.png', slug: 'strive', nombre: 'Strive', pdf: true },
  { archivo: 'Olivia.jpg', slug: 'olivia', nombre: 'Olivia' },
  { crop: '445x107+1023+95', slug: 'fursten', nombre: 'Fursten' },
  { archivo: 'espacioterra.jpg', slug: 'espacio-terra', nombre: 'Espacio Terra' },
  { archivo: 'lwlacteos.jpg', slug: 'lw-lacteos', nombre: 'LW Lácteos', recorte: 'circulo' },
  { archivo: 'fama-automotores.jpeg', slug: 'fama-automotores', nombre: 'Fama Automotores' },
  { crop: '416x173+1504+83', slug: 'elles-rosario', nombre: 'Elles Rosario' },
  { archivo: 'FisioForce.jpg', slug: 'fisioforce', nombre: 'FisioForce' },
  { archivo: 'wens.jpeg', slug: 'wens-sports', nombre: 'Wens Sports', recorte: 'cover', zoom: 1.3 },
  { archivo: 'degani.jpg', slug: 'degani', nombre: 'Degani' },
  { crop: '427x126+78+278', slug: 'positano-vinos', nombre: 'Positano Vinos' },
  { archivo: 'FYF.jpg', slug: 'fyf-gym', nombre: 'FyF Gym' },
  { archivo: 'manhattan cocktails.jpg', slug: 'manhattan-cocktails', nombre: 'Manhattan Cocktails' },
  { archivo: 'trapitosdolls.jpg', slug: 'trapitos-dolls', nombre: 'Trapitos Dolls', recorte: 'circulo' },
  { crop: '466x141+516+257', slug: 'hoopshoes', nombre: 'HoopShoes' },
  { archivo: 'monchito merlo.jpg', slug: 'monchito-merlo', nombre: 'Monchito Merlo' },
  { archivo: 'Boiler.webp', slug: 'boiler', nombre: 'Boiler' },
  { archivo: 'Malte project.jpg', slug: 'malte-project', nombre: 'Malte Project' },
  { crop: '476x121+1027+271', slug: 'vya-store', nombre: 'Vya Store' },
  { archivo: 'epicademy1.jpg', slug: 'epicademy', nombre: 'Epicademy' },
  { crop: '329x205+1547+276', slug: 'iep', nombre: 'iep' },
  { archivo: 'eunoia.jpg', slug: 'eunoia', nombre: 'Eunoia Estudio' },
  { crop: '368x170+224+475', slug: 'poly', nombre: 'Poly' },
  { archivo: 'mentha.jpg', slug: 'mentha', nombre: 'Mentha', recorte: 'circulo' },
  { crop: '459x194+644+460', slug: 'hoopers', nombre: 'Hoopers' },
  { archivo: 'SACRO.png', slug: 'sacro', nombre: 'Sacro', recorte: 'circulo' },
  { crop: '633x86+1155+521', slug: 'balance-fit', nombre: 'Balance Fit' }
];

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

function requiere(bin, args, brew) {
  try {
    execFileSync(bin, args, { stdio: 'ignore' });
  } catch {
    console.error(`[marcas] falta \`${bin}\`. Instalalo con: brew install ${brew}`);
    process.exit(1);
  }
}

/** Color de las cuatro esquinas. Es el fondo del logo salvo que sea una foto. */
function colorDeFondo(file) {
  return sh('magick', [file, '-format', '%[pixel:p{3,3}]', 'info:']);
}

/** Ancho y alto en píxeles. */
function medidas(file) {
  const [w, h] = sh('magick', [file, '-format', '%w %h', 'info:']).split(' ').map(Number);
  return { w, h };
}

/**
 * Rectángulo más grande de proporción `r` que entra en un círculo de diámetro D.
 * Es la única cuenta que importa acá: sin esto, o los logos anchos se cortan,
 * o hay que achicarlos todos al 70 % y la tira queda con más aire que logos.
 */
function cajaInscripta(r) {
  const k = Math.sqrt(1 + r * r);
  return {
    w: Math.round(((D * r) / k) * PADDING),
    h: Math.round((D / k) * PADDING)
  };
}

function procesar(marca, tmp) {
  const origen = marca.crop ? COLLAGE : join(SRC, marca.archivo);
  if (!existsSync(origen)) {
    console.error(`[marcas] ⚠️  no está: ${marca.archivo || marca.slug}`);
    return false;
  }

  const plano = join(tmp, `${marca.slug}-plano.png`);
  const final = join(tmp, `${marca.slug}-final.png`);

  if (marca.crop) {
    sh('magick', [origen, '-crop', marca.crop, '+repage', plano]);
  } else if (marca.pdf) {
    // strive-1.png es un PDF con extensión .png. Sin esto, magick delega en
    // ghostscript (que no está instalado) y el archivo se pierde en silencio.
    sh('pdftoppm', ['-png', '-r', '200', '-singlefile', origen, join(tmp, marca.slug)]);
    sh('magick', [join(tmp, `${marca.slug}.png`), '-background', 'black', '-alpha', 'remove', '-alpha', 'off', plano]);
  } else {
    // El alfa se aplana contra blanco: SACRO.png es RGBA y sin esto el
    // recorte mide el canvas transparente entero en vez del logo.
    sh('magick', [origen, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', plano]);
  }

  const bg = colorDeFondo(plano);
  const modo = marca.recorte || 'ajustar';

  if (modo === 'cover') {
    const lado = Math.round(D * (marca.zoom || 1));
    sh('magick', [plano, '-resize', `${lado}x${lado}^`, '-gravity', 'center', '-extent', `${D}x${D}`, final]);
  } else {
    // El borde de 2 px garantiza que `-trim` tenga contra qué comparar aunque
    // el logo llegue pegado al filo del archivo.
    const recortado = join(tmp, `${marca.slug}-trim.png`);
    sh('magick', [plano, '-bordercolor', bg, '-border', '2', '-fuzz', '6%', '-trim', '+repage', recortado]);

    if (modo === 'circulo') {
      sh('magick', [recortado, '-resize', `${D}x${D}!`, final]);
    } else {
      const { w, h } = medidas(recortado);
      const caja = cajaInscripta(w / h);
      sh('magick', [
        recortado,
        '-resize', `${caja.w}x${caja.h}`,
        '-background', bg,
        '-gravity', 'center',
        '-extent', `${D}x${D}`,
        final
      ]);
    }
  }

  sh('cwebp', ['-quiet', '-q', '86', final, '-o', join(OUT_IMG, `${marca.slug}.webp`)]);
  return true;
}

function escribirData() {
  // JSON.stringify en los dos campos (no comillas simples a mano): un nombre con
  // apóstrofo rompería el archivo generado y el error aparecería en el build.
  const filas = MARCAS.map(
    (m) => `  { slug: ${JSON.stringify(m.slug)}, nombre: ${JSON.stringify(m.nombre)} }`
  ).join(',\n');
  const contenido = `/**
 * Marcas que ya imprimieron con EPICALCOS — las que se ven en el ticker de
 * components/MarcasConfiaron.jsx.
 *
 * ⚠️ GENERADO por scripts/build-marcas.mjs. No editar a mano: el orden y los
 * nombres salen de la tabla de ese script, que también arma los
 * /images/marcas/<slug>.webp. Para agregar una marca, agregala allá y corré:
 *     node scripts/build-marcas.mjs
 *
 * \`nombre\` es el texto alternativo de cada logo, así que tiene que ser el
 * nombre real del cliente: es lo único que lee un lector de pantalla.
 */
export const MARCAS = [
${filas}
];
`;
  writeFileSync(OUT_DATA, contenido);
}

requiere('magick', ['-version'], 'imagemagick');
requiere('cwebp', ['-version'], 'webp');
requiere('pdftoppm', ['-v'], 'poppler');

if (!existsSync(SRC)) {
  console.error(`[marcas] no encuentro la carpeta de origen: ${SRC}`);
  process.exit(1);
}
mkdirSync(OUT_IMG, { recursive: true });

const tmp = join(tmpdir(), `marcas-${Date.now()}`);
mkdirSync(tmp, { recursive: true });

let ok = 0;
for (const marca of MARCAS) if (procesar(marca, tmp)) ok++;
rmSync(tmp, { recursive: true, force: true });

escribirData();
console.log(`[marcas] ${ok}/${MARCAS.length} logos → frontend/public/images/marcas/ (${D}×${D} webp)`);
