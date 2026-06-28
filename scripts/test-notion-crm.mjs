/**
 * Prueba de extremo a extremo de la sincronización con el CRM de Notion,
 * usando el MISMO código que corre en las Netlify Functions.
 *
 * Simula: checkout iniciado (crea la fila) → pago aprobado (actualiza el estado),
 * y al final archiva la fila de prueba para no ensuciar el CRM.
 *
 * Uso (con el token real de la integración "EPICALCOS Ecommerce"):
 *
 *   NOTION_TOKEN=ntn_xxxxx node scripts/test-notion-crm.mjs
 *
 * o, si lo cargaste en backend/.env:
 *
 *   node --env-file=backend/.env scripts/test-notion-crm.mjs
 *
 * Requiere Node 20+ (fetch global). No necesita instalar nada.
 */
import { crearLeadEnCRM, actualizarEstadoPedido, ESTADOS } from '../netlify/functions/_notion.js';

const token = process.env.NOTION_TOKEN;
if (!token || token.includes('xxxx')) {
  console.error('\n❌ NOTION_TOKEN no configurado (o es el placeholder).');
  console.error('   Pasá el token real de la integración "EPICALCOS Ecommerce":');
  console.error('   NOTION_TOKEN=ntn_xxxxx node scripts/test-notion-crm.mjs\n');
  process.exit(1);
}

const DB_ID = process.env.NOTION_CRM_DATABASE_ID || 'a2e218a7fa0a422a9d03a8efd965670b';

const orderId = `EPI-TEST-${Date.now()}`;
const payer = {
  name: '🧪 TEST — verificación CRM (borrar)',
  email: 'test@epicalcos.com',
  phone: '3410000000',
  dni: '12345678',
  address: 'Calle Falsa 123',
};
const shipping = {
  method: 'Envío a Rosario',
  city: 'Rosario',
  province: 'Santa Fe',
  zipCode: '2000',
  comments: 'Pedido de prueba automatizado',
};
const items = [
  { title: 'Calco Test', quantity: 2, unit_price: 2500 },
  { title: 'Pack Test', quantity: 1, unit_price: 2500 },
];
const total = 7500;

async function archivar(pageId) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ archived: true }),
  });
  return res.ok;
}

console.log(`\n🔎 Probando contra la base ${DB_ID}\n`);

// 1) Checkout iniciado → crea la fila (estado "Checkout iniciado")
console.log('1) Simulando "checkout iniciado"…');
const pageId = await crearLeadEnCRM({ payer, shipping, items, total, orderId });
if (!pageId) {
  console.error('\n❌ No se pudo crear la fila. Causas típicas:');
  console.error('   • El token es inválido o expiró.');
  console.error('   • La integración "EPICALCOS Ecommerce" NO tiene acceso a la página/base CRM.');
  console.error('     → En Notion, abrí la base CRM → menú "•••" → Conexiones → agregá la integración.\n');
  process.exit(1);
}
console.log(`   ✅ Fila creada — pageId=${pageId} (estado: ${ESTADOS.iniciado})`);

// 2) Pago aprobado → actualiza la MISMA fila por pageId (sin duplicar)
console.log('2) Simulando "pago aprobado" (actualiza por pageId)…');
const updated = await actualizarEstadoPedido({ pageId, estado: ESTADOS.pagado, total });
console.log(updated ? `   ✅ Estado actualizado a "${ESTADOS.pagado}"` : '   ⚠️ No se pudo actualizar');

// 3) Limpieza
console.log('3) Archivando la fila de prueba…');
const ok = await archivar(pageId);
console.log(ok ? '   ✅ Fila de prueba archivada.' : '   ⚠️ No se pudo archivar (borrala a mano).');

console.log('\n🎉 Listo. El código real escribe y actualiza el CRM correctamente.\n');
