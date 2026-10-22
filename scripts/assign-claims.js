#!/usr/bin/env node
/**
 * CLI Tool: Atribuição de Custom User Claims no Firebase Auth
 * Studio Digital SaaS - RBAC Multi-Tenant
 *
 * Uso:
 *   node scripts/assign-claims.js <uid> super_admin
 *   node scripts/assign-claims.js <uid> tenant_manager biz_salao_central
 *   node scripts/assign-claims.js <uid> professional biz_salao_central pro_123
 */

const admin = require('firebase-admin');

// Carrega a configuração do applet
const config = require('../firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.projectId,
  });
}

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
===============================================================
Studio Digital SaaS - Ferramenta de Atribuição de Claims (RBAC)
===============================================================

Uso:
  node scripts/assign-claims.js <UID> <ROLE> [TENANT_ID] [PROFESSIONAL_ID]

Roles permitidas:
  1. super_admin       (CEO da Plataforma - Pedro)
  2. tenant_manager    (Gerente de Unidade / Studio)
  3. professional      (Profissional / Prestador de Serviço)

Exemplos:
  node scripts/assign-claims.js abc123uid super_admin
  node scripts/assign-claims.js def456uid tenant_manager biz_estetica_prime
  node scripts/assign-claims.js ghi789uid professional biz_estetica_prime pro_dr_camila
  `);
  process.exit(1);
}

const [uid, role, tenantId, professionalId] = args;

const validRoles = ['super_admin', 'tenant_manager', 'professional'];
if (!validRoles.includes(role)) {
  console.error(`Erro: Role "${role}" inválida. Use: ${validRoles.join(', ')}`);
  process.exit(1);
}

if (role === 'tenant_manager' && !tenantId) {
  console.error('Erro: tenant_manager exige o parâmetro [TENANT_ID].');
  process.exit(1);
}

if (role === 'professional' && (!tenantId || !professionalId)) {
  console.error('Erro: professional exige os parâmetros [TENANT_ID] e [PROFESSIONAL_ID].');
  process.exit(1);
}

const claims = {
  role,
  ...(tenantId ? { tenant_id: tenantId } : {}),
  ...(professionalId ? { professional_id: professionalId } : {}),
  assignedAt: Date.now(),
};

async function run() {
  try {
    console.log(`Buscando usuário UID: ${uid}...`);
    const user = await admin.auth().getUser(uid);
    console.log(`Usuário encontrado: ${user.email || user.displayName || uid}`);

    console.log(`Aplicando Custom Claims:`, claims);
    await admin.auth().setCustomUserClaims(uid, claims);

    console.log('\nSucesso! Custom Claims aplicadas no Firebase Auth.');
    console.log('O usuário precisará executar `user.getIdToken(true)` no cliente para atualizar o token.');
    process.exit(0);
  } catch (err) {
    console.error('Falha ao atribuir claims:', err.message);
    process.exit(1);
  }
}

run();
