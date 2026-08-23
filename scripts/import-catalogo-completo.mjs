#!/usr/bin/env node
/**
 * import-catalogo-completo.mjs
 * Reconstruye TODO frontend/public/stickers/ desde la carpeta fuente en iCloud.
 *
 * Reemplaza a import-stickers.sh (apuntaba a "Stickers PNG para ClaudeCode",
 * que ya no existe) y a import-category-full.mjs (importaba de a una categoría
 * y dedupeaba por NÚMERO de archivo, asumiendo que 7.jpg y 7.png son el mismo
 * diseño en dos formatos — en varias carpetas son diseños DISTINTOS).
 *
 * Qué hace, en orden:
 *   1) Recorre la carpeta fuente. Cada subcarpeta de primer nivel es una
 *      categoría; sus subcarpetas ("Nuevas CATALOGO", "Mickey Mouse"…) entran
 *      como parte de la misma categoría. Se saltean las "Sin Fondo" (son los
 *      mismos diseños recortados) y todo lo que no sea imagen.
 *   2) Convierte a webp 600 px q82 en una CACHÉ (--cache). Es resumible: si el
 *      webp ya está, no vuelve a tocar el archivo de iCloud. Importa porque los
 *      originales son dataless y bajarlos es lo caro del proceso.
 *   3) Deduplica DENTRO de cada categoría por contenido, no por nombre: md5
 *      exacto + dHash perceptual (tolera el mismo dibujo guardado como png y
 *      como jpg, que es el caso de "Harry ST" y "Rosario Central/Mickey Mouse").
 *      Entre categorías NO deduplica: un mismo diseño puede estar en dos
 *      categorías temáticas a propósito (de eso se ocupa build-duplicados.mjs).
 *   4) Borra frontend/public/stickers/ y lo reescribe con <slug>/<n>.webp
 *      renumerado 1..N.
 *
 * ⚠️ Renumera: el N.webp de una categoría NO conserva el diseño que tenía
 * antes. Las claves de SKU de data/skus.json son "<slug>/<n>", así que un SKU
 * ya asignado va a quedar apuntando a otro dibujo. Es inevitable en un
 * reemplazo total del catálogo y el registro sigue siendo append-only (ver
 * build-meta-feed.mjs), pero conviene saberlo antes de correrlo.
 *
 * Uso:
 *   node scripts/import-catalogo-completo.mjs [--cache <dir>] [--dry]
 *
 * Requiere `cwebp` (brew install webp) y `magick` (brew install imagemagick).
 */
import { readdirSync, statSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SRC_BASE =
  '/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/EPICALCOS/Stickers/Stickers CATALOGO/Stickers';
const DEST_BASE = join(ROOT, 'frontend', 'public', 'stickers');

const QUALITY = 82;
const WIDTH = 600;
const JOBS = 8;

/** Subcarpetas que NO entran: son los mismos diseños de la carpeta madre, recortados. */
const SUBCARPETAS_EXCLUIDAS = [/^sin fondo$/i];

const EXT_OK = /\.(png|jpe?g|jfif|webp|gif)$/i;
/** Desempate cuando dos archivos son el mismo diseño: gana el de mejor origen. */
const EXT_RANK = { png: 4, jpeg: 3, jpg: 3, jfif: 2, webp: 2, gif: 1 };

/**
 * Carpeta de origen → slug + nombre de vidriera.
 *
 * Está escrito a mano y no derivado con un slugify a propósito: la carpeta se
 * llama "Harry ST" pero la categoría es Harry Styles, "Nikei" es Nike y
 * "Breaking BAd" tiene una mayúscula de más. El slug es la URL pública
 * (/categoria/<slug>) y la clave de los SKUs: una vez elegido, no se cambia.
 */
export const CARPETAS = {
  'Aesthetic':          { slug: 'aesthetic',          name: 'Aesthetic',           emoji: '🎨' },
  'Animales':           { slug: 'animales',           name: 'Animales',            emoji: '🐾' },
  'Anime':              { slug: 'anime',              name: 'Anime',               emoji: '🌸' },
  'Arcoiris':           { slug: 'arcoiris',           name: 'Arcoíris',            emoji: '🌈' },
  'Argentina':          { slug: 'argentina',          name: 'Argentina',           emoji: '🇦🇷' },
  'BTS':                { slug: 'bts',                name: 'BTS',                 emoji: '💜' },
  'Bob Esponja':        { slug: 'bob-esponja',        name: 'Bob Esponja',         emoji: '🧽' },
  'Boca Juniors':       { slug: 'boca-juniors',       name: 'Boca Juniors',        emoji: '💙' },
  'Breaking BAd':       { slug: 'breaking-bad',       name: 'Breaking Bad',        emoji: '🧪' },
  'Caras Sonrientes':   { slug: 'caras-sonrientes',   name: 'Caras Sonrientes',    emoji: '😊' },
  'Cartoon Network':    { slug: 'cartoon-network',    name: 'Cartoon Network',     emoji: '📺' },
  'Clubes Rosario':     { slug: 'clubes-rosario',     name: 'Clubes de Rosario',   emoji: '🏟️' },
  'Cocapepsi':          { slug: 'coca-cola-pepsi',    name: 'Coca-Cola y Pepsi',   emoji: '🥤' },
  'Comida y Bebida':    { slug: 'comida-y-bebida',    name: 'Comida y Bebida',     emoji: '🍔' },
  'Corazones':          { slug: 'corazones',          name: 'Corazones',           emoji: '❤️' },
  'Disney':             { slug: 'disney',             name: 'Disney',              emoji: '🏰' },
  'Escudos Fútbol':     { slug: 'escudos-futbol',     name: 'Escudos de Fútbol',   emoji: '🛡️' },
  'Feminismo':          { slug: 'feminismo',          name: 'Feminismo',           emoji: '♀️' },
  'Flores':             { slug: 'flores',             name: 'Flores',              emoji: '🌸' },
  'Formula 1':          { slug: 'formula-1',          name: 'Fórmula 1',           emoji: '🏁' },
  'Frases':             { slug: 'frases',             name: 'Frases',              emoji: '✍️' },
  'Friends':            { slug: 'friends',            name: 'Friends',             emoji: '🛋️' },
  'Gamer':              { slug: 'gamer',              name: 'Gamer',               emoji: '🎮' },
  'Greys Anatomy':      { slug: 'greys-anatomy',      name: "Grey's Anatomy",      emoji: '🩺' },
  'Harry Potter':       { slug: 'harry-potter',       name: 'Harry Potter',        emoji: '⚡' },
  'Harry ST':           { slug: 'harry-styles',       name: 'Harry Styles',        emoji: '🎤' },
  'Hockey':             { slug: 'hockey',             name: 'Hockey',              emoji: '🏑' },
  'Lilo Y Stitch':      { slug: 'lilo-y-stitch',      name: 'Lilo y Stitch',       emoji: '💙' },
  'Los Simpsons':       { slug: 'los-simpsons',       name: 'Los Simpsons',        emoji: '🍩' },
  'Mandalas':           { slug: 'mandalas',           name: 'Mandalas',            emoji: '🌀' },
  'Maradona':           { slug: 'maradona',           name: 'Maradona',            emoji: '🙌' },
  'Marcas':             { slug: 'marcas',             name: 'Marcas',              emoji: '™️' },
  'Mariposas':          { slug: 'mariposas',          name: 'Mariposas',           emoji: '🦋' },
  'Marvel':             { slug: 'marvel',             name: 'Marvel',              emoji: '🦸' },
  'Memes':              { slug: 'memes',              name: 'Memes',               emoji: '😂' },
  'Messi':              { slug: 'messi',              name: 'Messi',               emoji: '🐐' },
  'Música Latina':      { slug: 'musica-latina',      name: 'Música Latina',       emoji: '🎶' },
  'NBA':                { slug: 'nba',                name: 'NBA',                 emoji: '🏀' },
  'Naturaleza':         { slug: 'naturaleza',         name: 'Naturaleza',          emoji: '🌿' },
  'Newells Old Boys':   { slug: 'newells-old-boys',   name: "Newell's Old Boys",   emoji: '🔴' },
  'Nikei':              { slug: 'nike',               name: 'Nike',                emoji: '✔️' },
  'Pop Internacional':  { slug: 'pop-internacional',  name: 'Pop Internacional',   emoji: '🎵' },
  'Racing':             { slug: 'racing',             name: 'Racing',              emoji: '🩵' },
  'Rick y Morty':       { slug: 'rick-y-morty',       name: 'Rick y Morty',        emoji: '🛸' },
  'River Plate':        { slug: 'river-plate',        name: 'River Plate',         emoji: '🤍' },
  'Rock Internacional': { slug: 'rock-internacional', name: 'Rock Internacional',  emoji: '🎸' },
  'Rock Nacional':      { slug: 'rock-nacional',      name: 'Rock Nacional',       emoji: '🎸' },
  'Rosario Central':    { slug: 'rosario-central',    name: 'Rosario Central',     emoji: '💛' },
  'SantaCruz':          { slug: 'santa-cruz',         name: 'Santa Cruz',          emoji: '🛹' },
  'Scaloneta':          { slug: 'scaloneta',          name: 'Scaloneta',           emoji: '🏆' },
  'Shaka Good VIbes':   { slug: 'shaka-good-vibes',   name: 'Shaka Good Vibes',    emoji: '🤙' },
  'Starbucks':          { slug: 'starbucks',          name: 'Starbucks',           emoji: '☕' },
  // No son rosas la flor: son calcos ROSAS, el color (luna, labios, rayo…).
  'Stickers Rosas':     { slug: 'rosa',               name: 'Rosa',                emoji: '🩷' },
  'Stranger Things':    { slug: 'stranger-things',    name: 'Stranger Things',     emoji: '🔦' },
  'T-Swift':            { slug: 'taylor-swift',       name: 'Taylor Swift',        emoji: '🩷' },
  'The Office':         { slug: 'the-office',         name: 'The Office',          emoji: '📎' },
  'Universo':           { slug: 'universo',           name: 'Universo',            emoji: '🌌' },
  'VSCO':               { slug: 'vsco',               name: 'VSCO',                emoji: '📷' },
  'Vans':               { slug: 'vans',               name: 'Vans',                emoji: '👟' },
  'Viajes Van Life':    { slug: 'van-life',           name: 'Van Life',            emoji: '🚐' },
  'Viajes':             { slug: 'viajes',             name: 'Viajes',              emoji: '✈️' }
};

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n, def) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : def;
};
const CACHE = flag('--cache', join(ROOT, '.cache', 'catalogo-webp'));
const DRY = argv.includes('--dry');

// ── 1. Inventario de la fuente ──────────────────────────────────────────────

/** Archivos de una categoría, incluyendo subcarpetas salvo las excluidas. */
function listarCategoria(dir, sub = '') {
  const out = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === '.DS_Store') continue;
    const full = join(dir, nombre);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SUBCARPETAS_EXCLUIDAS.some((re) => re.test(nombre))) continue;
      out.push(...listarCategoria(full, sub ? `${sub}/${nombre}` : nombre));
      continue;
    }
    if (!EXT_OK.test(nombre)) continue;
    out.push({ path: full, sub, nombre });
  }
  return out;
}

/**
 * Orden dentro de la categoría: primero lo suelto en la raíz, después cada
 * subcarpeta; y adentro de cada grupo, orden natural (2 antes que 10).
 */
const stemDe = (n) => n.replace(/\.[^.]+$/, '');
const natural = (a, b) =>
  String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });

function ordenar(archivos) {
  return [...archivos].sort(
    (a, b) => natural(a.sub, b.sub) || natural(stemDe(a.nombre), stemDe(b.nombre))
  );
}

// ── 2. Conversión a webp (cacheada) ─────────────────────────────────────────

/** Ruta del webp cacheado para un original. Única por categoría+subcarpeta+nombre. */
function rutaCache(carpeta, a) {
  const dir = join(CACHE, carpeta);
  const plano = (a.sub ? `${a.sub}/${a.nombre}` : a.nombre).replace(/\//g, '@');
  const ext = a.nombre.split('.').pop().toLowerCase();
  return join(dir, `${stemDe(plano)}.[${ext}].webp`);
}

function convertir(src, target) {
  mkdirSync(dirname(target), { recursive: true });
  // Materializar el dataless de iCloud: leerlo fuerza la descarga. `brctl
  // download` es asíncrono y no alcanza.
  try { readFileSync(src); } catch { /* si falla, igual probamos */ }
  let r = spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', src, '-o', target]);
  try { if (r.status === 0 && statSync(target).size > 0) return true; } catch {}
  // Fallback para CMYK, perfiles raros y gif: pasar por PNG con sips.
  const png = join(tmpdir(), `imp-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  if (spawnSync('sips', ['-s', 'format', 'png', src, '--out', png]).status !== 0) return false;
  r = spawnSync('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', png, '-o', target]);
  spawnSync('rm', ['-f', png]);
  try { return r.status === 0 && statSync(target).size > 0; } catch { return false; }
}

// ── 3. Huellas: md5 exacto + dHash perceptual ───────────────────────────────

const md5 = (buf) => createHash('md5').update(buf).digest('hex');

/**
 * Normalización previa a cualquier huella: aplanar sobre blanco y RECORTAR el
 * margen. Sin el trim, el mismo dibujo exportado con dos márgenes distintos da
 * huellas distintas — es el caso real de las dos gorras de Nike, idénticas
 * salvo por el aire alrededor.
 */
const NORMALIZAR = [
  '-background', 'white', '-alpha', 'remove', '-alpha', 'off',
  '-fuzz', '6%', '-trim', '+repage'
];

/**
 * dHash de 64 bits: gris 9×8 y un bit por cada par de píxeles vecinos ("¿el de
 * la izquierda es más claro?"). Sobrevive al cambio de formato y de compresión,
 * que es justo lo que necesitamos: el mismo dibujo guardado como png y como jpg
 * da la misma huella (re-encodearlo da distancia 0, medido).
 */
async function dHash(file) {
  const { code, out } = await correr('magick', [
    file, ...NORMALIZAR, '-colorspace', 'Gray', '-resize', '9x8!', '-depth', '8', 'gray:-'
  ]);
  if (code !== 0 || out.length < 72) return null;
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits = (bits << 1n) | (out[y * 9 + x] > out[y * 9 + x + 1] ? 1n : 0n);
    }
  }
  return bits;
}

/**
 * Firma de color: RGB de una miniatura de 4×4 (48 bytes).
 *
 * El dHash es en escala de grises y por eso es CIEGO al color: el Jordan azul y
 * el Jordan rojo —dos productos distintos— quedan a distancia 3, más cerca que
 * varios duplicados de verdad. Sin este segundo chequeo, deduplicar por
 * parecido borraría media paleta de varias categorías.
 */
async function firmaColor(file) {
  const { code, out } = await correr('magick', [
    file, ...NORMALIZAR, '-resize', '4x4!', '-depth', '8', 'rgb:-'
  ]);
  return code === 0 && out.length >= 48 ? out.subarray(0, 48) : null;
}

/** Diferencia media por canal entre dos firmas de color (0-255). */
function distColor(a, b) {
  if (!a || !b) return 255;
  let suma = 0;
  for (let i = 0; i < 48; i++) suma += Math.abs(a[i] - b[i]);
  return suma / 48;
}

/** Bits distintos entre dos dHash. */
function hamming(a, b) {
  let x = a ^ b, n = 0;
  while (x) { x &= x - 1n; n++; }
  return n;
}

// Umbrales medidos sobre el catálogo real (ver la carpeta Nike): el duplicado
// verdadero da dHash 2 / color 3, y el par distinto más parecido que se
// encontró da dHash 3 / color 26. Dos diseños se consideran el mismo sólo si
// pasan LOS DOS filtros.
const UMBRAL_DHASH = 2;
const UMBRAL_COLOR = 8;

// ── Pool de concurrencia mínimo (no hay dependencias en este repo) ──────────
async function enParalelo(items, n, fn) {
  const it = items[Symbol.iterator]();
  let hechos = 0;
  const worker = async () => {
    for (;;) {
      const { value, done } = it.next();
      if (done) return;
      await fn(value);
      if (++hechos % 200 === 0) process.stdout.write(`  ${hechos}/${items.length}\n`);
    }
  };
  await Promise.all(Array.from({ length: n }, worker));
}

const correr = (cmd, args) =>
  new Promise((res) => {
    const chunks = [];
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('close', (code) => res({ code, out: Buffer.concat(chunks) }));
    p.on('error', () => res({ code: 1, out: Buffer.alloc(0) }));
  });


/**
 * Reescribe el array CATEGORIES de frontend/src/data/categories.js entre sus
 * marcas, en orden alfabético por nombre. La fuente de verdad del slug, el
 * nombre y el emoji es CARPETAS (arriba): tenerlos en dos lados era la forma
 * de que se desincronizaran.
 */
function escribirCategories() {
  const ARCHIVO = join(ROOT, 'frontend', 'src', 'data', 'categories.js');
  const INICIO = '// <<< CATEGORIES: generado por scripts/import-catalogo-completo.mjs >>>';
  const FIN = '// <<< fin CATEGORIES >>>';

  const cats = Object.values(CARPETAS).sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );
  const esc = (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const bloque =
    `${INICIO}\n` +
    cats
      .map((c) => `  { slug: '${c.slug}', name: '${esc(c.name)}', emoji: '${c.emoji}' },`)
      .join('\n') +
    `\n  ${FIN}`;

  const src = readFileSync(ARCHIVO, 'utf8');
  const i = src.indexOf(INICIO);
  const j = src.indexOf(FIN);
  if (i < 0 || j < 0) {
    console.error(`No encontré las marcas de CATEGORIES en ${ARCHIVO}`);
    process.exit(1);
  }
  writeFileSync(ARCHIVO, src.slice(0, i) + bloque + src.slice(j + FIN.length));
  console.log(`categories.js → ${cats.length} categorías (alfabético)`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const carpetas = readdirSync(SRC_BASE)
    .filter((d) => { try { return statSync(join(SRC_BASE, d)).isDirectory(); } catch { return false; } })
    .sort();

  // macOS devuelve los nombres en NFD (la tilde de "Música" viene como
  // carácter aparte), y los literales de CARPETAS están en NFC: sin normalizar,
  // ninguna carpeta con acento matchea.
  const meta = (c) => CARPETAS[c.normalize('NFC')];
  const desconocidas = carpetas.filter((c) => !meta(c));
  if (desconocidas.length) {
    console.error('Carpetas sin entrada en CARPETAS (agregalas al mapa antes de seguir):');
    for (const c of desconocidas) console.error('  ', c);
    process.exit(1);
  }

  const resumen = [];
  const plan = [];

  for (const carpeta of carpetas) {
    const { slug, name } = meta(carpeta);
    const archivos = ordenar(listarCategoria(join(SRC_BASE, carpeta)));
    process.stdout.write(`\n==> ${carpeta} → ${slug} (${archivos.length} archivos)\n`);

    // Convertir lo que falte (resumible gracias a la caché).
    const pendientes = archivos.filter((a) => {
      const t = rutaCache(carpeta, a);
      try { return statSync(t).size === 0; } catch { return true; }
    });
    if (pendientes.length) {
      process.stdout.write(`  convirtiendo ${pendientes.length}…\n`);
      await enParalelo(pendientes, JOBS, async (a) => {
        if (!convertir(a.path, rutaCache(carpeta, a))) {
          console.warn('  FALLO:', a.sub ? `${a.sub}/${a.nombre}` : a.nombre);
        }
      });
    }

    // Huellas.
    const conHuella = [];
    await enParalelo(archivos, JOBS, async (a) => {
      const webp = rutaCache(carpeta, a);
      let buf;
      try { buf = readFileSync(webp); } catch { return; }
      conHuella.push({
        ...a,
        webp,
        md5: md5(buf),
        dhash: await dHash(webp),
        color: await firmaColor(webp),
        rank: EXT_RANK[a.nombre.split('.').pop().toLowerCase()] ?? 0
      });
    });
    conHuella.sort((a, b) => natural(a.sub, b.sub) || natural(stemDe(a.nombre), stemDe(b.nombre)));

    // Dedupe dentro de la categoría: se queda el PRIMERO en el orden de arriba,
    // salvo que uno posterior venga de un formato mejor (png sobre jpg).
    const elegidos = [];
    const descartados = [];
    for (const a of conHuella) {
      const igual = elegidos.find(
        (e) =>
          e.md5 === a.md5 ||
          (e.dhash !== null &&
            a.dhash !== null &&
            hamming(e.dhash, a.dhash) <= UMBRAL_DHASH &&
            distColor(e.color, a.color) <= UMBRAL_COLOR)
      );
      if (!igual) { elegidos.push(a); continue; }
      descartados.push({ dup: a, canon: igual });
      if (a.rank > igual.rank) igual.webp = a.webp; // mismo diseño, mejor origen
    }

    resumen.push({ carpeta, slug, name, origen: archivos.length, final: elegidos.length, descartados });
    plan.push({ slug, elegidos });
  }

  // Reporte antes de tocar nada.
  console.log('\n\n=== RESUMEN ===');
  let totalOrigen = 0, totalFinal = 0;
  for (const r of resumen) {
    totalOrigen += r.origen;
    totalFinal += r.final;
    const menos = r.origen - r.final;
    console.log(
      `${r.slug.padEnd(22)} ${String(r.final).padStart(4)} diseños` +
      (menos ? `   (-${menos} repetidos)` : '')
    );
  }
  console.log(`\n${resumen.length} categorías · ${totalFinal} diseños (de ${totalOrigen} archivos, -${totalOrigen - totalFinal} repetidos)`);

  const detalle = resumen.flatMap((r) =>
    r.descartados.map((d) => ({
      slug: r.slug,
      descartado: d.dup.sub ? `${d.dup.sub}/${d.dup.nombre}` : d.dup.nombre,
      canonico: d.canon.sub ? `${d.canon.sub}/${d.canon.nombre}` : d.canon.nombre,
      exacto: d.dup.md5 === d.canon.md5
    }))
  );
  writeFileSync(join(CACHE, 'descartados.json'), JSON.stringify(detalle, null, 2));
  console.log(`Detalle de repetidos → ${join(CACHE, 'descartados.json')}`);

  if (DRY) { console.log('\n--dry: no se tocó frontend/public/stickers/'); return; }

  // Reemplazo. Se borra TODO: las categorías viejas que no están en la fuente
  // dejan de existir, que es el punto de este script.
  rmSync(DEST_BASE, { recursive: true, force: true });
  mkdirSync(DEST_BASE, { recursive: true });
  for (const { slug, elegidos } of plan) {
    const dir = join(DEST_BASE, slug);
    mkdirSync(dir, { recursive: true });
    elegidos.forEach((e, i) => copyFileSync(e.webp, join(dir, `${i + 1}.webp`)));
  }
  escribirCategories();
  console.log(`\nEscrito en ${DEST_BASE}`);
  console.log('Ahora: node scripts/build-catalog.mjs && node scripts/build-duplicados.mjs && node scripts/build-meta-feed.mjs');
}

// Sólo cuando se invoca directamente: este módulo también exporta CARPETAS,
// y un `import` no tiene por qué disparar un reimport del catálogo entero.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
