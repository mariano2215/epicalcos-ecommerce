#!/usr/bin/env node
/**
 * build-instagram.mjs — prepara las miniaturas de los posteos que se ven en
 * components/contacto/CardInstagram.jsx (spec 012).
 *
 * POR QUÉ EXISTE: la grilla de /contacto son archivos del propio sitio, no un
 * feed. La spec descartó las tres alternativas "automáticas" (embed oficial,
 * API de Meta, widget de terceros) porque todas compran "se actualiza solo" con
 * kilobytes, cookies de terceros o un token que vence cada 60 días. Ver
 * specs/012-contacto-formulario-y-canales/design.md §11.
 *
 * DE DÓNDE SALE LA IMAGEN: del `og:image` del propio posteo, que es la
 * miniatura que Instagram usa en la grilla del perfil (FEED.best_image_urlgen).
 * Por eso la card queda igual que el perfil real.
 *
 * ⚠️ NO SE PUEDE PEDIR EL ORIGINAL SIN RECORTAR: la URL del CDN viene firmada y
 * la firma cubre el parámetro `stp`. Tocarlo para pedir la imagen entera
 * devuelve un 403 con el cuerpo vacío (probado el 25/8/2026). Si algún día se
 * quiere otro encuadre, poné el archivo a mano en SRC_LOCAL con el nombre del
 * posteo (<id>.jpg) y el script lo usa en lugar de bajarlo.
 *
 * ⚠️ EL `alt` SE ESCRIBE A MANO, acá abajo. Instagram ya no sirve
 * `og:description` a un cliente sin sesión, y la bajada de un posteo tampoco
 * sería un buen texto alternativo. Sin esto son tres imágenes mudas para un
 * lector de pantalla.
 *
 * Salida: frontend/public/images/instagram/<id>.webp de 640×640 (el slot más
 * grande son ~200 px, así que cubre pantallas 3×) + reescribe
 * frontend/src/data/instagram.js, que es lo que consume el componente.
 *
 * Uso:  node scripts/build-instagram.mjs
 * Requiere `magick` y `cwebp` — los mismos que build-marcas.mjs.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_IMG = join(ROOT, 'frontend', 'public', 'images', 'instagram');
const OUT_DATA = join(ROOT, 'frontend', 'src', 'data', 'instagram.js');
/** Carpeta opcional para pisar una miniatura con un encuadre propio. */
const SRC_LOCAL = process.env.INSTAGRAM_SRC || join(ROOT, '..', 'Instagram EPICALCOS');

/** Lado del archivo final. El slot más grande de la grilla son ~200 px. */
const LADO = 640;
/** Calidad de cwebp. 80 es el punto donde una foto deja de mejorar a simple vista. */
const CALIDAD = 80;

/**
 * LOS POSTEOS. Para cambiar la grilla: cambiá esta tabla y corré el script.
 * El orden de acá es el orden en que se ven.
 */
const POSTS = [
  {
    id: 'Db_1H4ZRmgX',
    permalink: 'https://www.instagram.com/p/Db_1H4ZRmgX/',
    alt: 'Mate de calabaza con bombilla y el logo de EPICALCOS pegado al frente'
  },
  {
    id: 'DaTgGq3xNBQ',
    permalink: 'https://www.instagram.com/p/DaTgGq3xNBQ/',
    alt: 'Antes y después de un termo: liso a la izquierda, cubierto de calcos de montañas, Messi y frases a la derecha'
  },
  {
    id: 'DcHcd6NRUzw',
    permalink: 'https://www.instagram.com/p/DcHcd6NRUzw/',
    alt: 'Posteo "Mis dos moods" con dos monigotes dibujados y un termo negro decorado con calcos'
  }
];

/** Instagram solo devuelve las meta og: a un cliente que se identifica como bot. */
const UA = 'facebookexternalhit/1.1';

async function ogImage(permalink) {
  const res = await fetch(permalink, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${permalink} respondió ${res.status}`);
  const html = await res.text();
  const m = html.match(/property="og:image" content="([^"]+)"/);
  if (!m) throw new Error(`sin og:image en ${permalink} (¿el posteo es público?)`);
  return m[1].replace(/&amp;/g, '&');
}

const tmp = join(tmpdir(), `epicalcos-ig-${Date.now()}`);
mkdirSync(tmp, { recursive: true });
mkdirSync(OUT_IMG, { recursive: true });

// Se limpia la carpeta antes: si mañana la grilla baja de 3 a 2 posteos, el
// tercero no puede quedar suelto en /public sirviéndose a nadie.
for (const f of readdirSync(OUT_IMG)) {
  if (f.endsWith('.webp')) rmSync(join(OUT_IMG, f));
}

let fallos = 0;

for (const post of POSTS) {
  const destino = join(OUT_IMG, `${post.id}.webp`);
  const local = join(SRC_LOCAL, `${post.id}.jpg`);
  const crudo = join(tmp, `${post.id}.jpg`);

  try {
    if (existsSync(local)) {
      console.log(`· ${post.id}: usando el archivo local de ${SRC_LOCAL}`);
      execFileSync('magick', [local, crudo]);
    } else {
      const url = await ogImage(post.permalink);
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      writeFileSync(crudo, buf);
    }

    // Recorte al cuadrado desde el centro + resize. El og:image ya viene
    // cuadrado (640×639 por redondeo), así que esto casi siempre es un no-op:
    // está para que un archivo local con otra proporción no rompa la grilla.
    execFileSync('magick', [
      crudo,
      '-auto-orient',
      '-resize', `${LADO}x${LADO}^`,
      '-gravity', 'center',
      '-extent', `${LADO}x${LADO}`,
      join(tmp, `${post.id}-cuadrado.png`)
    ]);
    execFileSync('cwebp', [
      '-q', String(CALIDAD),
      '-quiet',
      join(tmp, `${post.id}-cuadrado.png`),
      '-o', destino
    ]);
    console.log(`✓ ${post.id}.webp`);
  } catch (err) {
    fallos++;
    console.error(`✗ ${post.id}: ${err.message}`);
  }
}

rmSync(tmp, { recursive: true, force: true });

if (fallos) {
  console.error(`\n${fallos} posteo(s) fallaron. NO se reescribe instagram.js para no dejar la grilla con imágenes que no existen.`);
  process.exit(1);
}

const data = `/**
 * Posteos de Instagram que se ven en la card de /contacto.
 *
 * ⚠️ GENERADO por scripts/build-instagram.mjs. No editar a mano: las imágenes
 * de /images/instagram/ salen del mismo script. Para cambiar la grilla, editá
 * la tabla POSTS de allá y corré:
 *     node scripts/build-instagram.mjs
 *
 * \`alt\` es lo único que lee un lector de pantalla, así que describe la foto.
 */
export const instagramPosts = ${JSON.stringify(
  POSTS.map((p) => ({ src: `/images/instagram/${p.id}.webp`, permalink: p.permalink, alt: p.alt })),
  null,
  2
)};
`;
writeFileSync(OUT_DATA, data);
console.log(`\n✓ ${POSTS.length} posteos → ${OUT_DATA}`);
