import { AppTab, RoleType, UserRole } from '../types';

export type ResolvedUserProfile = 'super_admin' | 'tenant_manager' | 'professional' | 'client' | 'client_or_guest';

export interface UserAuthContext {
  isAuthenticated: boolean;
  isSuperAdminAuthenticated: boolean;
  userRole?: string | null;
  activeClaims?: {
    role?: string;
    email?: string;
    tenant_id?: string;
    professional_id?: string;
    client_id?: string;
  } | null;
  currentRole?: UserRole | string | null;
  firebaseUser?: { email?: string | null; displayName?: string | null } | null;
}

/**
 * Identifica com precisão o perfil do usuário logado na sessão/estado atual.
 * Prioridade:
 * 1. Super Admin (CEO Master: Pedro Campos ou claim role super_admin)
 * 2. Tenant Manager (Gerente do Studio ou claim role tenant_manager)
 * 3. Professional (Especialista/Profissional ou claim role professional)
 * 4. Client (Cliente autenticado com claim role client ou registro)
 * 5. Guest (Visitante não autenticado)
 */
export function resolveCurrentUserProfile(ctx: UserAuthContext): ResolvedUserProfile {
  const email = (
    ctx.activeClaims?.email ||
    ctx.firebaseUser?.email ||
    ''
  ).toLowerCase();

  const isPedroCEO = email === 'pedro.projetos0770@gmail.com';

  const isSuperAdmin =
    ctx.isSuperAdminAuthenticated ||
    isPedroCEO ||
    ctx.userRole === 'super_admin' ||
    ctx.userRole === 'superadmin' ||
    ctx.userRole === 'ceo' ||
    ctx.activeClaims?.role === 'super_admin';

  if (isSuperAdmin) {
    return 'super_admin';
  }

  const isClient =
    ctx.userRole === 'client' ||
    ctx.activeClaims?.role === 'client' ||
    ctx.currentRole === 'client';

  if (isClient) {
    return 'client';
  }

  const isProfessional =
    ctx.userRole === 'professional' ||
    ctx.userRole === 'profissional' ||
    ctx.activeClaims?.role === 'professional' ||
    ctx.currentRole === 'profissional';

  if (isProfessional) {
    return 'professional';
  }

  const isManager =
    ctx.userRole === 'tenant_manager' ||
    ctx.userRole === 'gerente' ||
    ctx.activeClaims?.role === 'tenant_manager' ||
    ctx.currentRole === 'gerente';

  if (isManager) {
    return 'tenant_manager';
  }

  if (!ctx.isAuthenticated && !ctx.firebaseUser) {
    return 'client_or_guest';
  }

  // Se estiver autenticado mas sem claim específica definida, assume gerente de studio
  return 'tenant_manager';
}

/**
 * Retorna o rótulo humanizado do perfil para exibição visual no app
 */
export function getUserProfileLabel(profile: ResolvedUserProfile): string {
  switch (profile) {
    case 'super_admin':
      return 'Super Admin (CEO)';
    case 'tenant_manager':
      return 'Gerente do Studio';
    case 'professional':
      return 'Profissional / Especialista';
    case 'client':
      return 'Cliente Cadastrado';
    case 'client_or_guest':
      return 'Cliente / Visitante';
  }
}

export type BottomNavTabId = 'inicio' | 'agenda' | 'caixa' | 'comissoes' | 'clientes' | 'servicos' | 'profissionais' | 'configuracoes' | 'planos' | 'painelmaster';

/**
 * Retorna a rota exata permitida para cada perfil e botão da navegação.
 * NUNCA direciona perfis de Gerente, Profissional ou Cliente para /admin/*,
 * eliminando a causa do erro 403 Acesso Proibido.
 */
export function getRoleBasedDestination(
  tab: BottomNavTabId,
  profile: ResolvedUserProfile,
  isSuperAdminView = false
): { path: string; tabState?: AppTab; allowed: boolean; reason?: string } {
  switch (tab) {
    case 'inicio': {
      if (profile === 'super_admin') {
        if (isSuperAdminView) {
          return { path: '/admin/painelmaster', allowed: true };
        }
        return { path: '/admin/dashboard', tabState: 'dashboard', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/dashboard', tabState: 'dashboard', allowed: true };
      }
      if (profile === 'professional') {
        return { path: '/app/profissional/agenda', allowed: true };
      }
      if (profile === 'client') {
        return { path: '/app/cliente', allowed: true };
      }
      // Convidado
      return { path: '/nossos-planos', allowed: true };
    }

    case 'agenda': {
      if (profile === 'super_admin') {
        return { path: '/admin/agenda', tabState: 'agenda', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/agenda', tabState: 'agenda', allowed: true };
      }
      if (profile === 'professional') {
        return { path: '/app/profissional/agenda', allowed: true };
      }
      if (profile === 'client') {
        return { path: '/app/cliente/agendamentos', allowed: true };
      }
      // Visitante
      return { path: '/login', allowed: false, reason: 'Faça login para acessar sua agenda' };
    }

    case 'caixa': {
      if (profile === 'super_admin') {
        return { path: '/admin/comandas', tabState: 'comandas', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/comandas', tabState: 'comandas', allowed: true };
      }
      if (profile === 'professional') {
        return {
          path: '/app/profissional/agenda',
          allowed: false,
          reason: 'O Caixa Geral é restrito ao Gerente. Você pode consultar suas comissões no seu portal.',
        };
      }
      if (profile === 'client') {
        return {
          path: '/app/cliente',
          allowed: false,
          reason: 'O Caixa Geral é restrito à gerência do studio.',
        };
      }
      return { path: '/login', allowed: false, reason: 'Acesso restrito ao Caixa' };
    }

    case 'comissoes': {
      if (profile === 'professional') {
        return { path: '/app/profissional/agenda', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/dashboard', tabState: 'dashboard', allowed: true };
      }
      if (profile === 'client') {
        return { path: '/app/cliente', allowed: false, reason: 'Acesso restrito a profissionais.' };
      }
      return { path: '/admin/dashboard', tabState: 'dashboard', allowed: true };
    }

    case 'clientes': {
      if (profile === 'super_admin') {
        return { path: '/admin/clientes', tabState: 'clientes', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/clientes', tabState: 'clientes', allowed: true };
      }
      if (profile === 'professional') {
        return { path: '/app/profissional/clientes', tabState: 'clientes', allowed: true };
      }
      if (profile === 'client') {
        return { path: '/app/cliente', allowed: false, reason: 'Acesso restrito à administração do studio.' };
      }
      return { path: '/login', allowed: false };
    }

    case 'servicos': {
      if (profile === 'super_admin') {
        return { path: '/admin/servicos', tabState: 'servicos', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/servicos', tabState: 'servicos', allowed: true };
      }
      if (profile === 'professional') {
        return {
          path: '/app/profissional/agenda',
          allowed: false,
          reason: 'Apenas a gerência pode cadastrar e editar o catálogo de serviços.',
        };
      }
      if (profile === 'client') {
        return { path: '/app/cliente/novo-agendamento', allowed: true };
      }
      return { path: '/nossos-planos', allowed: true };
    }

    case 'profissionais': {
      if (profile === 'super_admin') {
        if (isSuperAdminView) return { path: '/admin/painelmaster', allowed: true };
        return { path: '/admin/profissionais', tabState: 'profissionais', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/profissionais', tabState: 'profissionais', allowed: true };
      }
      if (profile === 'professional') {
        return {
          path: '/app/profissional/agenda',
          allowed: false,
          reason: 'Apenas a gerência pode gerenciar a equipe.',
        };
      }
      if (profile === 'client') {
        return { path: '/app/cliente/novo-agendamento', allowed: true };
      }
      return { path: '/nossos-planos', allowed: true };
    }

    case 'configuracoes': {
      if (profile === 'super_admin') {
        return { path: '/admin/configuracoes', tabState: 'configuracoes', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/configuracoes', tabState: 'configuracoes', allowed: true };
      }
      if (profile === 'professional') {
        return { path: '/app/profissional/agenda', allowed: true };
      }
      if (profile === 'client') {
        return { path: '/app/cliente/perfil', allowed: true };
      }
      return { path: '/login', allowed: false };
    }

    case 'planos': {
      if (profile === 'super_admin') {
        if (isSuperAdminView) return { path: '/admin/painelmaster', allowed: true };
        return { path: '/admin/planos', tabState: 'planos', allowed: true };
      }
      if (profile === 'tenant_manager') {
        return { path: '/app/gerente/planos', tabState: 'planos', allowed: true };
      }
      return { path: '/nossos-planos', allowed: true };
    }

    case 'painelmaster': {
      if (profile === 'super_admin') {
        return { path: '/admin/painelmaster', allowed: true };
      }
      return {
        path: '/app/gerente/dashboard',
        tabState: 'dashboard',
        allowed: false,
        reason: 'O Painel Master é exclusivo para o CEO da Plataforma.',
      };
    }

    default:
      return { path: '/', allowed: true };
  }
}
