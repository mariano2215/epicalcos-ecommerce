#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 * Genera frontend/public/sitemap.xml desde la fuente real de datos:
 *   - rutas estáticas indexables
 *   - una URL por cada categoría de frontend/public/data/catalog.json
 *
 * Los PRODUCTOS no se incluyen todavía: hoy son "#1, #2…" sin nombre real
 * (thin content). Se suman en Fase 2, cuando tengan metadata.
 *
 * Corre en el prebuild de Netlify (npm run build en base=frontend). Las rutas
 * se resuelven contra este archivo (import.meta.url), no contra el cwd.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'frontend', 'public');
const CATALOG = join(PUBLIC, 'data', 'catalog.json');
const OUTPUT = join(PUBLIC, 'sitemap.xml');

const BASE = 'https://epicalcos.com';

// Rutas estáticas indexables (excluye checkout, pago-* y búsqueda interna).
const STATIC_ROUTES = [
  { path: '/', priority: 1.0 },
  { path: '/categorias', priority: 0.9 },
  { path: '/personalizados', priority: 0.9 },
  { path: '/negocio', priority: 0.8 },
  { path: '/mayorista', priority: 0.8 },
  { path: '/tatuajes', priority: 0.8 },
  { path: '/polaroid', priority: 0.8 },
  { path: '/contacto', priority: 0.5 },
  { path: '/politicas/envios', priority: 0.4 },
  { path: '/politicas/cambios', priority: 0.4 },
  { path: '/politicas/privacidad', priority: 0.3 },
  { path: '/terminos-y-condiciones', priority: 0.3 }
];

const escapeXml = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));

const routes = [
  ...STATIC_ROUTES,
  ...catalog.map((c) => ({ path: `/categoria/${c.slug}`, priority: 0.8 }))
];

// Deduplicar por loc por las dudas.
const seen = new Set();
const unique = routes.filter((r) => (seen.has(r.path) ? false : seen.add(r.path)));

const urlEntry = (r) =>
  ['  <url>', `    <loc>${escapeXml(BASE + r.path)}</loc>`, `    <priority>${r.priority.toFixed(1)}</priority>`, '  </url>'].join('\n');

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...unique.map(urlEntry),
  '</urlset>',
  ''
].join('\n');

writeFileSync(OUTPUT, xml);
console.log(`[sitemap] ${OUTPUT} → ${unique.length} URLs (${catalog.length} categorías + ${STATIC_ROUTES.length} estáticas)`);
