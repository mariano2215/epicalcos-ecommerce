#!/usr/bin/env node
/**
 * gen-categories.mjs — agrega a frontend/src/data/categories.js las categorías nuevas
 * que están en catalog.json pero todavía no figuran en CATEGORIES.
 * name = nombre literal de la carpeta de origen; emoji = mapa abajo (fallback 🔥).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/marianocalandra/Documents/Mariano/epicalcos-ecommerce';
const SRC = '/Users/marianocalandra/Library/Mobile Documents/com~apple~CloudDocs/Documents/Mariano/EPICALCOS/Stickers/Stickers CATALOGO/Stickers';
const CATS_FILE = join(ROOT, 'frontend/src/data/categories.js');

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EMOJI = {
  'caras-sonrientes': '😊', 'comida-y-bebida': '🍔', 'deportes-autos': '🏁', 'deportes-nba': '🏀',
  'disenos-aesthetic': '🎨', 'disenos-falopa': '🍄', 'disenos-muerte': '💀', 'disenos-shaka': '🤙',
  'disenos-universo': '🌌', 'disenos-vsco': '📷', 'disenos-videojuegos': '🕹️', 'escritura-frases': '✍️',
  'feminismo': '♀️', 'futbol-boca': '💙', 'futbol-dioses-futbol': '🐐', 'futbol-escudos': '🛡️',
  'futbol-jugadores': '⚽', 'futbol-maradona': '🙌', 'futbol-messi': '🐐', 'futbol-nob': '🔴',
  'futbol-racing': '🩵', 'futbol-river': '🤍', 'futbol-rosario-central': '💛', 'futbol-scaloneta': '🏆',
  'futbol-scaloneta-qatar': '🏆', 'marcas-coca-cola-pepsi': '🥤', 'marcas-nike': '✔️', 'marcas-santa-cruz': '🛹',
  'marcas-starbucks': '☕', 'marcas-vans': '👟', 'musica-bts': '💜', 'musica-harry-styles': '🎤',
  'musica-latinoamerica': '🎶', 'musica-pop-internacional': '🎵', 'musica-rock-internacional': '🎸',
  'musica-rock-nacional': '🎸', 'musica-taylor-swift': '🩷', 'naturaleza': '🌿', 'naturaleza-agua': '💧',
  'naturaleza-arcoiris': '🌈', 'naturaleza-corazones': '❤️', 'naturaleza-flores': '🌸', 'naturaleza-mandalas': '🌀',
  'naturaleza-mariposas': '🦋', 'tv-anime': '🎌', 'tv-bob-esponja': '🧽', 'tv-breaking-bad': '🧪',
  'tv-cartoon-network': '📺', 'tv-disney': '🏰', 'tv-friends': '🛋️', 'tv-gossip-girl': '👑',
  'tv-greys-anatomy': '🩺', 'tv-harry-potter': '🧙', 'tv-los-simpsons': '🍩', 'tv-marvel': '🦸',
  'tv-nickelodeon': '🟠', 'tv-padrinos-magicos': '🪄', 'tv-rick-y-morty': '🛸', 'tv-series': '🎬',
  'tv-varios': '📺', 'travel-travel': '🌍', 'travel-van-life': '🚐',
};

// slug -> nombre literal de carpeta
const slugToName = {};
for (const name of readdirSync(SRC)) {
  try { if (statSync(join(SRC, name)).isDirectory()) slugToName[slugify(name)] = name; } catch {}
}

const catalog = JSON.parse(readFileSync(join(ROOT, 'frontend/public/data/catalog.json'), 'utf8'));
const src = readFileSync(CATS_FILE, 'utf8');
const existing = new Set([...src.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]));

const toAdd = catalog
  .map((c) => c.slug)
  .filter((slug) => !existing.has(slug))
  .map((slug) => ({ slug, name: slugToName[slug] || slug, emoji: EMOJI[slug] || '🔥' }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const missingEmoji = toAdd.filter((c) => !EMOJI[c.slug]).map((c) => c.slug);
if (missingEmoji.length) console.log('⚠️  sin emoji (uso 🔥):', missingEmoji.join(', '));

const esc = (s) => s.replace(/'/g, "\\'");
const lines = toAdd.map((c) => `  { slug: '${c.slug}', name: '${esc(c.name)}', emoji: '${c.emoji}' },`).join('\n');

const ANCHOR = "  { slug: 'weed-creepy', name: 'Weed & Creepy', emoji: '🌿' }\n";
if (!src.includes(ANCHOR)) { console.error('No encontré el ancla weed-creepy'); process.exit(1); }
const block =
  "  { slug: 'weed-creepy', name: 'Weed & Creepy', emoji: '🌿' },\n" +
  '  // --- Lote "Stickers CATALOGO" (importado 2026-06-27) ---\n' +
  lines + '\n';
const out = src.replace(ANCHOR, block);
writeFileSync(CATS_FILE, out);

console.log(`Agregadas ${toAdd.length} categorías a categories.js:`);
for (const c of toAdd) console.log(`  ${c.emoji}  ${c.slug}  «${c.name}»`);
