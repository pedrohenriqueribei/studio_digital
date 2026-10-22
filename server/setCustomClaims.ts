/**
 * Firebase Admin SDK - Gestão de Custom User Claims e RBAC Multi-Tenant
 * Studio Digital SaaS
 *
 * Este arquivo contém as funções de backend para atribuir e validar
 * Custom Claims no Firebase Authentication para os 3 perfis da plataforma:
 *  1. super_admin     -> CEO / Gestor da Plataforma (Pedro Campos)
 *  2. tenant_manager  -> Gerente do Estabelecimento / Tenant
 *  3. professional    -> Profissional / Prestador de Serviço
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Request, Response, NextFunction } from 'express';

export type RoleType = 'super_admin' | 'tenant_manager' | 'professional';

export interface CustomUserClaims {
  role: RoleType;
  tenant_id?: string;
  professional_id?: string;
  email?: string;
  updatedAt?: number;
}

// Inicialização segura do Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0073661067',
      // Em produção, configure a variável GOOGLE_APPLICATION_CREDENTIALS ou serviceAccount key
    });
  } catch (error) {
    console.warn('Firebase Admin SDK inicializado sem credenciais de serviço explícitas:', error);
  }
}

/**
 * Atribui Custom Claims a um usuário por UID
 */
export async function setUserRoleClaims(
  uid: string,
  claims: CustomUserClaims
): Promise<{ success: boolean; uid: string; claims: CustomUserClaims }> {
  try {
    const claimsToSet: CustomUserClaims = {
      ...claims,
      updatedAt: Date.now(),
    };

    await getAuth().setCustomUserClaims(uid, claimsToSet);
    console.log(`[RBAC] Custom Claims atribuídas com sucesso ao usuário ${uid}:`, claimsToSet);

    return {
      success: true,
      uid,
      claims: claimsToSet,
    };
  } catch (error) {
    console.error(`[RBAC Erro] Falha ao atribuir claims para ${uid}:`, error);
    throw error;
  }
}

/**
 * Atribui a função de SUPER ADMIN (CEO da Plataforma - Pedro)
 */
export async function assignSuperAdmin(uid: string, email?: string) {
  return setUserRoleClaims(uid, {
    role: 'super_admin',
    email: email || 'pedro.projetos0770@gmail.com',
  });
}

/**
 * Atribui a função de GERENTE DO ESTABELECIMENTO (Tenant Manager)
 * Vincula estritamente ao tenant_id correspondente
 */
export async function assignTenantManager(uid: string, tenantId: string, email?: string) {
  if (!tenantId) {
    throw new Error('tenant_id é obrigatório para perfil tenant_manager.');
  }

  return setUserRoleClaims(uid, {
    role: 'tenant_manager',
    tenant_id: tenantId,
    email,
  });
}

/**
 * Atribui a função de PROFISSIONAL / PRESTADOR DE SERVIÇO
 * Vincula estritamente ao tenant_id e ao professional_id
 */
export async function assignProfessional(
  uid: string,
  tenantId: string,
  professionalId: string,
  email?: string
) {
  if (!tenantId || !professionalId) {
    throw new Error('tenant_id e professional_id são obrigatórios para perfil professional.');
  }

  return setUserRoleClaims(uid, {
    role: 'professional',
    tenant_id: tenantId,
    professional_id: professionalId,
    email,
  });
}

/**
 * Consulta as Custom Claims atuais de um usuário
 */
export async function getUserClaims(uid: string): Promise<CustomUserClaims | null> {
  try {
    const user = await getAuth().getUser(uid);
    return (user.customClaims as CustomUserClaims) || null;
  } catch (error) {
    console.error(`[RBAC Erro] Falha ao buscar claims para ${uid}:`, error);
    throw error;
  }
}

/**
 * Revoga as Custom Claims e invalida refresh tokens
 */
export async function revokeUserClaims(uid: string) {
  await getAuth().setCustomUserClaims(uid, null);
  await getAuth().revokeRefreshTokens(uid);
  console.log(`[RBAC] Claims revogadas e tokens invalidados para ${uid}`);
}

/**
 * MIDDLEWARE EXPRESS PARA BACKEND (Validação do ID Token e Claims)
 *
 * Valida o header `Authorization: Bearer <ID_TOKEN>`, decodifica as Custom Claims
 * e autoriza apenas se o usuário tiver a Role exigida e corresponder ao Tenant solicitado.
 */
export function requireRole(allowedRoles: RoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Não autenticado',
          message: 'Token de autenticação do Firebase ausente no header Authorization.',
        });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await getAuth().verifyIdToken(idToken);

      const userRole = (decodedToken.role as RoleType) || null;
      const userTenantId = decodedToken.tenant_id as string | undefined;

      // Super Admin bypass: o CEO tem permissão global
      if (userRole === 'super_admin' || decodedToken.email === 'pedro.projetos0770@gmail.com') {
        (req as any).user = decodedToken;
        return next();
      }

      // Validação de Role
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Acesso Proibido (403 Forbidden)',
          message: `Sua role atual [${userRole || 'nenhuma'}] não tem permissão para esta rota. Permissões requeridas: ${allowedRoles.join(', ')}.`,
          claims: {
            role: userRole,
            tenant_id: userTenantId,
          },
        });
      }

      // Validação de isolamento Multi-tenant (para parâmetros ou headers que requerem tenantId)
      const requestedTenantId = req.params.tenantId || req.query.tenantId || req.body?.tenantId;
      if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
        return res.status(403).json({
          error: 'Isolamento Multi-Tenant Violado',
          message: `Acesso negado: seus dados pertencem ao tenant [${userTenantId}], tentativa de acesso ao tenant [${requestedTenantId}].`,
        });
      }

      (req as any).user = decodedToken;
      return next();
    } catch (error: any) {
      console.error('[Middleware Auth Erro]:', error);
      return res.status(401).json({
        error: 'Token Inválido ou Expirado',
        message: error.message || 'Falha na validação do Firebase ID Token.',
      });
    }
  };
}
