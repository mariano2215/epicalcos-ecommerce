#!/usr/bin/env node
/**
 * import-lote.mjs — AGREGA un lote de calcos al catálogo ya publicado.
 * Spec 016 (`specs/016-catalogo-lote-2/`).
 *
 * ⚠️ NO CONFUNDIR CON `import-catalogo-completo.mjs`. Aquel es un REEMPLAZO:
 * hace `rmSync` sobre public/stickers y renumera desde 1. Éste es lo contrario
 * —append-only— y existe como archivo aparte a propósito: meterle a aquel un
 * flag "no borres" es la clase de opción que algún día se corre con el valor
 * por defecto equivocado sobre 6.500 diseños y sus SKUs.
 *
 * Qué hace, en orden:
 *   1) Baja de iCloud y convierte a webp 600 px q82 ARCHIVO POR ARCHIVO, en
 *      `.cache/lote2-webp/`, con fallback `sips → png → cwebp` para los JPG en
 *      CMYK que cwebp no lee. Las dos cosas van juntas y en serie a propósito:
 *      ver los comentarios de CONC_ICLOUD y del bucle de conversión.
 *   3) Saca huellas (md5 + dHash + firma de color) de los candidatos Y DE LOS
 *      DISEÑOS YA PUBLICADOS de cada categoría destino.
 *   4) Descarta el candidato que ya esté publicado, o que repita a otro
 *      candidato de la MISMA categoría.
 *   5) Copia los que quedan a continuación del último número de la categoría.
 *   6) Agrega al array CATEGORIES de categories.js las categorías nuevas,
 *      FUSIONANDO con las que ya están.
 *
 * El criterio de "es el mismo diseño" NO se reimplementa acá: se importa de
 * import-catalogo-completo.mjs, con sus umbrales medidos sobre el catálogo real.
 *
 * Resumible: el cache de webp y el deduplicado contra lo publicado hacen que
 * una segunda corrida no duplique nada. Cortarlo a la mitad no cuesta trabajo.
 *
 *   node scripts/import-lote.mjs [--dry] [--solo <slug>]
 */
import {
  readdirSync, statSync, existsSync, mkdirSync, copyFileSync,
  readFileSync, writeFileSync, unlinkSync
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
  md5, dHash, firmaColor, distColor, hamming,
  UMBRAL_DHASH, UMBRAL_COLOR, enParalelo
} from './import-catalogo-completo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
/**
 * Origen del lote. Se puede pisar con `--src <ruta>`.
 *
 * ⚠️ NO ESTÁ CABLEADO POR CAPRICHO: el 4/9/2026 la carpeta se movió de
 * .../EPICALCOS/ a .../Mariano Calandra (Marca Personal)/ EN MEDIO de una
 * corrida, y el importador se comió 1.974 "fallos de conversión" que en
 * realidad eran "el archivo ya no está ahí". De ahí el flag y el chequeo de
 * existencia de abajo.
 */
const SRC_DEFECTO = '/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/Mariano Calandra (Marca Personal)/CALCOS NUEVAS PARA WEB';
const DEST_BASE = join(ROOT, 'frontend', 'public', 'stickers');
const CACHE = join(ROOT, '.cache', 'lote2-webp');
const QUALITY = 82, WIDTH = 600;
/**
 * ⚠️ UNO. No tres.
 *
 * La memoria del pipeline anterior decía que con 3 lectores iCloud rendía
 * ~2,3 archivos/s. El 4/9/2026, con este lote, 3 lectores se colgaron enteros:
 * 15 minutos sin materializar UN archivo, el proceso con 0,22 s de CPU (o sea,
 * bloqueado en I/O, no trabajando). Una lectura suelta funcionaba perfecto en
 * el mismo momento, así que no era iCloud caído: era la concurrencia.
 *
 * En serie va a ~0,8 archivos/s, medido. Es lento y es lo que hay: el
 * importador es resumible justamente por esto.
 */
const CONC_ICLOUD = 1;
const CONC_CPU = 6;

/**
 * Carpeta del lote → categoría destino.
 *
 * `slug` sólo ⇒ la categoría YA existe y esto es un append: su nombre y su
 * emoji viven en categories.js y no se tocan desde acá.
 * `slug + name + emoji` ⇒ categoría nueva.
 *
 * ⚠️ DOS CARPETAS PUEDEN APUNTAR AL MISMO SLUG (CARA-SONRIENTE y SMILEY-FACE;
 * TAYLOR-SWIFT y ERAS-TOUR). Se procesan como UNA sola cola por slug: si no, el
 * deduplicado no las ve juntas y el mismo diseño entra dos veces.
 */
export const CARPETAS_LOTE2 = {
  // ── Coinciden con categorías que ya existen ──────────────────────────────
  'ANIME':             { slug: 'anime' },
  'ARGENTINA':         { slug: 'argentina' },
  'BOB-ESPONJA':       { slug: 'bob-esponja' },
  'BOCA-JUNIORS':      { slug: 'boca-juniors' },
  'BREAKING-BAD':      { slug: 'breaking-bad' },
  'CORAZONES':         { slug: 'corazones' },
  'DISNEY':            { slug: 'disney' },
  'FEMINISMO':         { slug: 'feminismo' },
  'FLORES':            { slug: 'flores' },
  'FORMULA-1':         { slug: 'formula-1' },
  'FRIENDS':           { slug: 'friends' },
  'GREYS-ANATOMY':     { slug: 'greys-anatomy' },
  'HARRY-POTTER':      { slug: 'harry-potter' },
  'LILO-Y-STITCH':     { slug: 'lilo-y-stitch' },
  'MARADONA':          { slug: 'maradona' },
  'MARVEL':            { slug: 'marvel' },
  'MEMES':             { slug: 'memes' },
  'MESSI':             { slug: 'messi' },
  'NBA':               { slug: 'nba' },
  'NEWELLS':           { slug: 'newells-old-boys' },
  'RIVER-PLATE':       { slug: 'river-plate' },
  'ROSARIO-CENTRAL':   { slug: 'rosario-central' },
  'SCALONETA':         { slug: 'scaloneta' },
  'SIMPSONS':          { slug: 'los-simpsons' },
  'STRANGER-THINGS':   { slug: 'stranger-things' },
  'TAYLOR-SWIFT':      { slug: 'taylor-swift' },
  'VSCO':              { slug: 'vsco' },

  // ── Fusiones acordadas con Mariano (4/9/2026) ────────────────────────────
  // El Eras Tour ES Taylor Swift: dos categorías competirían entre sí.
  'ERAS-TOUR':         { slug: 'taylor-swift' },
  // "Rock argentino" y "rock nacional" son el mismo género con otro nombre.
  'ROCK-ARGENTINO':    { slug: 'rock-nacional' },
  // La categoría ya existe con ese nombre.
  'GOOD-VIBES':        { slug: 'shaka-good-vibes' },
  // Lo mismo en dos idiomas: separadas parten el catálogo al medio.
  'CARA-SONRIENTE':    { slug: 'caras-sonrientes' },
  'SMILEY-FACE':       { slug: 'caras-sonrientes' },

  // ── Categorías nuevas ────────────────────────────────────────────────────
  // El slug es la URL pública y la clave de los SKUs: elegido, no se cambia.
  // Inglés donde la marca es inglesa (igual que breaking-bad, stranger-things);
  // el nombre de vidriera en español, que es como se busca acá.
  'ARTE':              { slug: 'arte',              name: 'Arte',                   emoji: '🖼️' },
  'AURA':              { slug: 'aura',              name: 'Aura',                   emoji: '🔮' },
  'BAD-BUNNY':         { slug: 'bad-bunny',         name: 'Bad Bunny',              emoji: '🐰' },
  'LORD-OF-THE-RINGS': { slug: 'lord-of-the-rings', name: 'El Señor de los Anillos', emoji: '💍' },
  'MODA':              { slug: 'moda',              name: 'Moda',                   emoji: '👗' },
  'PIXAR':             { slug: 'pixar',             name: 'Pixar',                  emoji: '💡' },
  'REY-LEON':          { slug: 'rey-leon',          name: 'El Rey León',            emoji: '🦁' },
  'SHREK':             { slug: 'shrek',             name: 'Shrek',                  emoji: '🧅' },
  'TAROT':             { slug: 'tarot',             name: 'Tarot',                  emoji: '🃏' },
  'VERANO':            { slug: 'verano',            name: 'Verano',                 emoji: '🌴' },
  'WEED':              { slug: 'weed',              name: 'Weed',                   emoji: '🍃' }
};

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const SOLO = argv.includes('--solo') ? argv[argv.indexOf('--solo') + 1] : null;
const SRC_BASE = argv.includes('--src') ? argv[argv.indexOf('--src') + 1] : SRC_DEFECTO;

if (!existsSync(SRC_BASE)) {
  console.error(`✗ No existe el origen:\n  ${SRC_BASE}\nPasá la ruta con --src <carpeta>.`);
  process.exit(1);
}
console.log(`Origen: ${SRC_BASE}`);

const correr = (cmd, args) =>
  new Promise((res) => {
    const chunks = [];
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    p.stdout.on('data', (c) => chunks.push(c));
    p.on('close', (code) => res({ code, out: Buffer.concat(chunks) }));
    p.on('error', () => res({ code: 1, out: Buffer.alloc(0) }));
  });

/**
 * Modo recuperación: SÓLO actualiza categories.js, sin bajar ni comparar nada.
 *
 * Existe porque pasó: una corrida escribió los 3.359 webp y abortó justo antes
 * del merge. Volver a correr el importador entero para escribir 11 líneas son
 * ~25 minutos de huellas al pedo. Acá alcanza con mirar qué carpetas del mapa
 * existen y tienen contenido.
 */
const SOLO_CATEGORIAS = argv.includes('--solo-categorias');

// ── 1. Inventario: una cola por SLUG, no por carpeta ────────────────────────
const colas = new Map(); // slug -> { slug, nueva, name, emoji, origenes: [] }
for (const [carpeta, cfg] of Object.entries(CARPETAS_LOTE2)) {
  const dir = join(SRC_BASE, carpeta);
  if (!existsSync(dir)) { console.warn(`⚠️  falta la carpeta ${carpeta}`); continue; }
  if (SOLO && cfg.slug !== SOLO) continue;
  if (!colas.has(cfg.slug)) {
    colas.set(cfg.slug, {
      slug: cfg.slug, nueva: Boolean(cfg.name), name: cfg.name, emoji: cfg.emoji, origenes: []
    });
  }
  const cola = colas.get(cfg.slug);
  if (cfg.name && !cola.name) { cola.nueva = true; cola.name = cfg.name; cola.emoji = cfg.emoji; }
  for (const f of readdirSync(dir).sort()) {
    if (/\.jpe?g$/i.test(f)) cola.origenes.push(join(dir, f));
  }
}

const totalOrigen = [...colas.values()].reduce((n, c) => n + c.origenes.length, 0);
console.log(`Origen: ${totalOrigen} archivos en ${colas.size} categorías destino`);

if (SOLO_CATEGORIAS) {
  // Una categoría "cuenta" si su carpeta existe y tiene al menos un webp: es la
  // misma condición que usa el merge normal (`cola.aceptados.length`), leída
  // desde el disco en vez de desde lo que se acaba de importar.
  for (const cola of colas.values()) {
    const dir = join(DEST_BASE, cola.slug);
    const n = existsSync(dir) ? readdirSync(dir).filter((f) => /\.webp$/i.test(f)).length : 0;
    cola.aceptados = new Array(n);
  }
  fusionarCategories();
  process.exit(0);
}

// ── 2+3. Materializar y convertir, ARCHIVO POR ARCHIVO ─────────────────────
//
// ⚠️ LAS DOS FASES VAN JUNTAS A PROPÓSITO. La versión anterior bajaba los 3.463
// originales primero y convertía después: para cuando llegaba a convertir,
// macOS ya había expulsado los primeros y no quedaba nada. Este Mac tiene
// "Optimizar almacenamiento" prendido (`defaults read com.apple.bird
// optimize-storage` → 1), así que iCloud recupera espacio en cuanto puede —
// medido: 1.857 archivos bajados volvieron a 0 bloques solos.
//
// Bajando y convirtiendo de a uno, cada original sólo tiene que sobrevivir el
// tiempo de una copia. Y el webp queda en .cache/, que es local: lo que ya se
// convirtió no se vuelve a bajar nunca.

// ── 3. Conversión a webp (cacheada ⇒ resumible) ─────────────────────────────
/** Convierte a webp. Fallback sips para los JPG en CMYK que cwebp no lee. */
async function aWebp(src, target) {
  try { if (statSync(target).size > 0) return true; } catch { /* no está: hay que hacerlo */ }
  mkdirSync(dirname(target), { recursive: true });

  // Copia LOCAL primero. Copiar fuerza la bajada de iCloud (leer es lo único
  // que la garantiza; `brctl download` es asíncrono) y, sobre todo, deja los
  // bytes fuera de iCloud: a partir de acá el original puede ser expulsado en
  // cualquier momento y no nos importa.
  //
  // ⚠️ CON REINTENTOS. Un fallo de iCloud acá es TRANSITORIO —el demonio está
  // ocupado o expulsando— y sin reintentar se pierde el archivo para toda la
  // corrida: así se acumularon 1.974 "fallos" en el primer pase. Tres intentos
  // con espera creciente recuperan casi todos.
  const local = join(tmpdir(), `lote2-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  let copiado = false;
  for (let intento = 0; intento < 3 && !copiado; intento++) {
    if (intento) await new Promise((r) => setTimeout(r, 400 * intento));
    try {
      copyFileSync(src, local);
      copiado = statSync(local).size > 0;
    } catch { copiado = false; }
  }
  if (!copiado) {
    try { unlinkSync(local); } catch { /* ignore */ }
    return false;
  }

  let r = await correr('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', local, '-o', target]);
  let ok = false;
  try { ok = r.code === 0 && statSync(target).size > 0; } catch { ok = false; }

  // Fallback para los JPG en CMYK que cwebp no lee (pasó con 13 en el lote 1).
  if (!ok) {
    const png = join(tmpdir(), `lote2-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
    const sp = await correr('sips', ['-s', 'format', 'png', local, '--out', png]);
    if (sp.code === 0) {
      r = await correr('cwebp', ['-quiet', '-q', String(QUALITY), '-resize', String(WIDTH), '0', png, '-o', target]);
      try { ok = r.code === 0 && statSync(target).size > 0; } catch { ok = false; }
    }
    try { unlinkSync(png); } catch { /* ignore */ }
  }

  try { unlinkSync(local); } catch { /* ignore */ }
  return ok;
}

const fallos = [];
const pendientes = [];
for (const cola of colas.values()) {
  cola.candidatos = [];
  for (const src of cola.origenes) {
    const target = join(CACHE, cola.slug, `${basename(src).replace(/\.jpe?g$/i, '')}.webp`);
    let hecho = false;
    try { hecho = statSync(target).size > 0; } catch { /* falta */ }
    if (hecho) cola.candidatos.push({ src, webp: target });
    else pendientes.push({ cola, src, target });
  }
}
console.log(`Ya convertidos: ${[...colas.values()].reduce((n, c) => n + c.candidatos.length, 0)} · a convertir: ${pendientes.length}`);

if (pendientes.length) {
  const t0 = Date.now();
  let n = 0;
  // Serie: con 3 lectores concurrentes iCloud se colgó entero (15 min sin bajar
  // un archivo, el proceso en 0,22 s de CPU). En serie va a ~1/s, medido.
  await enParalelo(pendientes, CONC_ICLOUD, async ({ cola, src, target }) => {
    if (await aWebp(src, target)) cola.candidatos.push({ src, webp: target });
    else fallos.push(src);
    if (++n % 50 === 0) {
      const seg = (Date.now() - t0) / 1000;
      console.log(`  ${n}/${pendientes.length} · ${(n / seg).toFixed(2)}/s · faltan ~${Math.round((pendientes.length - n) / (n / seg) / 60)} min`);
    }
  });
}
for (const cola of colas.values()) cola.candidatos.sort((a, b) => a.src.localeCompare(b.src, 'es'));
console.log(`Convertidos: ${[...colas.values()].reduce((n, c) => n + c.candidatos.length, 0)} · fallos: ${fallos.length}`);

// ── 4. Huellas ──────────────────────────────────────────────────────────────
async function huella(webp) {
  return {
    md5: md5(readFileSync(webp)),
    dhash: await dHash(webp),
    color: await firmaColor(webp)
  };
}
/** ¿Son el mismo diseño? Mismo criterio que import-catalogo-completo.mjs. */
const mismo = (a, b) =>
  a.md5 === b.md5 ||
  (a.dhash !== null && b.dhash !== null &&
   hamming(a.dhash, b.dhash) <= UMBRAL_DHASH &&
   distColor(a.color, b.color) <= UMBRAL_COLOR);

for (const cola of colas.values()) {
  const dir = join(DEST_BASE, cola.slug);
  const publicados = existsSync(dir)
    ? readdirSync(dir).filter((f) => /\.webp$/i.test(f)).map((f) => join(dir, f))
    : [];
  console.log(`\n${cola.slug}: ${cola.candidatos.length} candidatos · ${publicados.length} publicados`);

  cola.huellasPublicados = [];
  await enParalelo(publicados, CONC_CPU, async (f) => {
    cola.huellasPublicados.push(await huella(f));
  });
  await enParalelo(cola.candidatos, CONC_CPU, async (c) => {
    Object.assign(c, await huella(c.webp));
  });
}

// ── 5. Selección ────────────────────────────────────────────────────────────
let totalNuevos = 0, totalRepetidos = 0;
for (const cola of colas.values()) {
  const aceptados = [];
  let repes = 0;
  for (const c of cola.candidatos) {
    if (cola.huellasPublicados.some((p) => mismo(c, p))) { repes++; continue; }
    if (aceptados.some((a) => mismo(c, a))) { repes++; continue; }
    aceptados.push(c);
  }
  cola.aceptados = aceptados;
  totalNuevos += aceptados.length;
  totalRepetidos += repes;
  console.log(`  → ${aceptados.length} nuevos, ${repes} descartados por repetidos`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TOTAL a agregar: ${totalNuevos} · descartados: ${totalRepetidos} · fallos de conversión: ${fallos.length}`);
const nuevasCats = [...colas.values()].filter((c) => c.nueva && c.aceptados.length);
console.log(`Categorías nuevas: ${nuevasCats.length ? nuevasCats.map((c) => c.slug).join(', ') : '—'}`);
if (fallos.length) console.log('Fallaron:', fallos.slice(0, 10).map((f) => basename(f)).join(', '), fallos.length > 10 ? `… +${fallos.length - 10}` : '');

if (DRY) { console.log('\n--dry: no se escribió nada.'); process.exit(0); }

// ── 6. Append ───────────────────────────────────────────────────────────────
for (const cola of colas.values()) {
  if (!cola.aceptados.length) continue;
  const dir = join(DEST_BASE, cola.slug);
  mkdirSync(dir, { recursive: true });
  const existentes = readdirSync(dir)
    .filter((f) => /\.webp$/i.test(f))
    .map((f) => parseInt(f, 10))
    .filter((n) => !Number.isNaN(n));
  let next = (existentes.length ? Math.max(...existentes) : 0) + 1;
  for (const c of cola.aceptados) copyFileSync(c.webp, join(dir, `${next++}.webp`));
}

// ── 7. categories.js: FUSIONAR, nunca reemplazar ────────────────────────────
/**
 * ⚠️ `escribirCategories()` del otro importador reescribe el array entero desde
 * SU mapa. Si acá hiciéramos lo mismo, borraríamos las 61 categorías del primer
 * lote. Se lee lo que hay, se agrega lo que falta y se reordena.
 */
function fusionarCategories() {
  const ARCHIVO = join(ROOT, 'frontend', 'src', 'data', 'categories.js');
  const INICIO = '// <<< CATEGORIES: generado por scripts/import-catalogo-completo.mjs >>>';
  const FIN = '// <<< fin CATEGORIES >>>';
  const src = readFileSync(ARCHIVO, 'utf8');
  const i = src.indexOf(INICIO), j = src.indexOf(FIN);
  if (i < 0 || j < 0) { console.error(`No encontré las marcas de CATEGORIES en ${ARCHIVO}`); process.exit(1); }

  const bloque = src.slice(i + INICIO.length, j);
  const actuales = [...bloque.matchAll(/\{\s*slug:\s*'([^']+)',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*emoji:\s*'([^']*)'\s*\}/g)]
    .map((m) => ({ slug: m[1], name: m[2], emoji: m[3] }));
  const porSlug = new Map(actuales.map((c) => [c.slug, c]));

  // ⚠️ SEGURO. Si el regex deja de matchear (alguien reformatea el array, o
  // `escribirCategories` del otro importador cambia el formato), `actuales`
  // vendría vacío y esto reescribiría categories.js con SOLO las categorías
  // nuevas: 61 categorías borradas de un saque, en silencio, con los .webp
  // todavía en disco. Antes que eso, cortar.
  // ⚠️ SEGURO. Si el regex deja de matchear (alguien reformatea el array), este
  // merge reescribiría categories.js con MENOS categorías de las que había:
  // borradas en silencio, con los .webp todavía en disco.
  //
  // La verificación se valida CONTRA SÍ MISMA —cuántos `slug:` hay en el bloque
  // vs. cuántos sacó el regex— y no contra public/stickers. Compararlo con las
  // carpetas era una premisa equivocada: es perfectamente válido tener 72
  // carpetas y 61 entradas (pasa justo cuando una corrida escribió los archivos
  // y abortó antes de actualizar el array).
  const crudas = (bloque.match(/slug:/g) || []).length;
  if (actuales.length !== crudas || crudas === 0) {
    console.error(
      `\n✗ ABORTO: el bloque CATEGORIES tiene ${crudas} entradas pero el regex ` +
      `parseó ${actuales.length}. Reescribir borraría categorías. No se tocó nada.`
    );
    process.exit(1);
  }

  let sumadas = 0;
  for (const cola of colas.values()) {
    if (!cola.nueva || !cola.aceptados.length || porSlug.has(cola.slug)) continue;
    porSlug.set(cola.slug, { slug: cola.slug, name: cola.name, emoji: cola.emoji });
    sumadas++;
  }

  const cats = [...porSlug.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );
  const nuevo =
    `${INICIO}\n` +
    cats.map((c) => `  { slug: '${c.slug}', name: '${c.name}', emoji: '${c.emoji}' },`).join('\n') +
    `\n  `;
  writeFileSync(ARCHIVO, src.slice(0, i) + nuevo + src.slice(j));
  console.log(`categories.js → ${cats.length} categorías (+${sumadas} nuevas)`);
}
fusionarCategories();

console.log(`\nEscrito en ${DEST_BASE}`);
console.log('Ahora: node scripts/build-catalog.mjs && node scripts/build-duplicados.mjs && node scripts/build-portadas.mjs && node scripts/build-meta-feed.mjs');
