import React from 'react';
import { Shield, AlertCircle, ArrowLeft, ArrowRight, Lock, Key, Building2, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UnifiedLoginPage } from './UnifiedLoginPage';

interface RBACRouteGuardProps {
  children: React.ReactNode;
}

export const RBACRouteGuard: React.FC<RBACRouteGuardProps> = ({ children }) => {
  const {
    currentPath,
    navigateTo,
    isSuperAdminAuthenticated,
    userRole,
    activeClaims,
    currentBusiness,
    currentProfessional,
    logoutSuperAdmin,
  } = useApp();

  // If path is login page
  if (currentPath === '/login') {
    return <UnifiedLoginPage />;
  }

  // PUBLIC ROUTES: Allow without authentication
  if (currentPath === '/nossos-planos' || currentPath.startsWith('/p/')) {
    return <>{children}</>;
  }

  // 1. ADMIN ROUTES (/admin/*): Strictly restricted to Super Admin (CEO Pedro)
  if (currentPath.startsWith('/admin')) {
    // If not authenticated at all
    if (!isSuperAdminAuthenticated) {
      return <UnifiedLoginPage />;
    }

    // Role check: must be super_admin
    const isSuperAdmin =
      userRole === 'super_admin' ||
      activeClaims?.role === 'super_admin' ||
      activeClaims?.email === 'pedro.projetos0770@gmail.com';

    if (!isSuperAdmin) {
      // 403 FORBIDDEN - Custom Claim Missing!
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
          <div className="max-w-xl w-full mx-auto my-auto bg-slate-900 border border-rose-500/30 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase font-bold text-rose-400 tracking-wider">
                Erro 403 · Acesso Proibido (RBAC)
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1">
                Acesso Restrito ao Super Admin (CEO)
              </h1>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              A rota <code className="text-amber-400 font-mono bg-slate-950 px-2 py-0.5 rounded">{currentPath}</code> requer a Custom Claim <strong className="text-white font-mono">role: "super_admin"</strong> exclusiva do CEO e gestor da plataforma (Pedro Campos).
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5 font-mono">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Suas Custom Claims Atuais:</div>
              <div className="text-slate-300">Role: <span className="text-amber-400">{userRole}</span></div>
              {activeClaims?.tenant_id && (
                <div className="text-slate-300">Tenant ID: <span className="text-indigo-400">{activeClaims.tenant_id}</span></div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              {userRole === 'tenant_manager' && (
                <button
                  onClick={() => navigateTo('/app/gerente/dashboard')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Ir para meu Painel de Gerente (/app/gerente)</span>
                </button>
              )}

              {userRole === 'professional' && (
                <button
                  onClick={() => navigateTo('/app/profissional/agenda')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Ir para minha Agenda de Profissional (/app/profissional)</span>
                </button>
              )}

              <button
                onClick={() => {
                  logoutSuperAdmin();
                  navigateTo('/login');
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Trocar de Conta / Autenticar como Super Admin
              </button>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500">
            Studio Digital SaaS · Middleware de Proteção de Rotas com Validação de Claims
          </div>
        </div>
      );
    }
  }

  // 2. GERENTE ROUTES (/app/gerente/*)
  if (currentPath.startsWith('/app/gerente')) {
    if (!isSuperAdminAuthenticated) {
      return <UnifiedLoginPage />;
    }

    if (userRole === 'professional') {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
          <div className="max-w-md w-full mx-auto my-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Área Exclusiva do Gerente</h2>
            <p className="text-xs text-slate-400">
              Profissionais não têm acesso ao painel gerencial ou financeiro completo do studio.
            </p>
            <button
              onClick={() => navigateTo('/app/profissional/agenda')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Ir para Minha Agenda de Atendimentos
            </button>
          </div>
        </div>
      );
    }
  }

  // 3. PROFISSIONAL ROUTES (/app/profissional/*)
  if (currentPath.startsWith('/app/profissional')) {
    if (!isSuperAdminAuthenticated) {
      return <UnifiedLoginPage />;
    }
  }

  // ROOT URL ('/'):
  if (currentPath === '/' || currentPath === '') {
    if (!isSuperAdminAuthenticated) {
      return <>{children}</>;
    }
  }

  return <>{children}</>;
};
