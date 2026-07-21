#!/usr/bin/env node
/**
 * Crea (o actualiza) un upload preset UNSIGNED en Cloudinary con una carpeta fija.
 * Por defecto arma `epicalcos_polaroid` → carpeta `polaroid/` (formatos png/jpg/jpeg),
 * para que las fotos de /polaroid queden separadas de las de /personalizados.
 *
 * En unsigned uploads la carpeta la define el PRESET (el `folder` del request se
 * ignora), así que separar destinos = un preset por destino. Ver
 * frontend/src/services/uploadService.js.
 *
 * Requiere credenciales de Cloudinary (NO viven en el repo ni en el frontend —
 * el secret solo se usa acá, server-side):
 *   CLOUDINARY_CLOUD_NAME   (default: hfcnpe8h)
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 * Se toman de las variables de entorno; también lee frontend/.env.local para el cloud name.
 *
 * Uso:
 *   CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=yyy node scripts/cloudinary-create-preset.mjs
 *
 * Opcionales:
 *   PRESET_NAME=epicalcos_polaroid   PRESET_FOLDER=polaroid   PRESET_FORMATS=png,jpg,jpeg
 *
 * Después de correrlo, seteá en Netlify y en frontend/.env.local:
 *   VITE_CLOUDINARY_UPLOAD_PRESET_POLAROID=epicalcos_polaroid
 */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'hfcnpe8h';
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const name = process.env.PRESET_NAME || 'epicalcos_polaroid';
const folder = process.env.PRESET_FOLDER || 'polaroid';
const formats = process.env.PRESET_FORMATS || 'png,jpg,jpeg';

if (!apiKey || !apiSecret) {
  console.error(
    'Faltan credenciales. Corré:\n' +
      '  CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=yyy node scripts/cloudinary-create-preset.mjs\n' +
      '(las encontrás en cloudinary.com → Settings → API Keys)'
  );
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
const base = `https://api.cloudinary.com/v1_1/${cloudName}/upload_presets`;
const settings = { unsigned: 'true', folder, allowed_formats: formats };

async function main() {
  // 1) Intentar crear.
  let res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name, ...settings })
  });
  let data = await res.json().catch(() => ({}));

  // 2) Si ya existe, actualizarlo (PUT, el nombre va en la URL).
  const yaExiste = !res.ok && /exist/i.test(data?.error?.message || '');
  if (yaExiste) {
    res = await fetch(`${base}/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(settings)
    });
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok) {
    console.error(`Error ${res.status}:`, data?.error?.message || JSON.stringify(data));
    process.exit(1);
  }

  console.log(`✓ Preset "${name}" listo (unsigned, carpeta "${folder}/", formatos ${formats}).`);
  console.log('  Ahora seteá:  VITE_CLOUDINARY_UPLOAD_PRESET_POLAROID=' + name);
  console.log('  en Netlify (context all) y en frontend/.env.local, y redeployá.');
}

main().catch((err) => {
  console.error('Falló:', err.message);
  process.exit(1);
});
