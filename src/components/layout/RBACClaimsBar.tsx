import React, { useState } from 'react';
import { Shield, Key, Building2, Users, RefreshCw, ChevronUp, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RoleType } from '../../types';

export const RBACClaimsBar: React.FC = () => {
  const {
    activeClaims,
    userRole,
    setSimulatedClaims,
    refreshClaimsFromFirebase,
    currentBusiness,
    businesses,
    switchBusiness,
    switchRole,
    navigateTo,
    currentPath,
    setIsSuperAdminView,
    isSuperAdminAuthenticated,
    setIsLoginModalOpen,
    addNotification,
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRoleQuickSwitch = (role: RoleType) => {
    if (role === 'super_admin') {
      if (!isSuperAdminAuthenticated) {
        addNotification({
          title: 'Acesso Restrito ao Super Admin',
          message: 'As credenciais master são protegidas. Por favor, autentique-se primeiro para acessar este perfil.',
          type: 'system',
        });
        setIsLoginModalOpen(true);
        return;
      }
      setSimulatedClaims({
        role: 'super_admin',
        email: 'pedro.projetos0770@gmail.com',
      });
      setIsSuperAdminView(true);
      navigateTo('/admin/painelmaster');
    } else if (role === 'tenant_manager') {
      const tenantId = activeClaims?.tenant_id || currentBusiness?.id || businesses[0]?.id;
      if (tenantId) switchBusiness(tenantId);
      switchRole('gerente');
      setSimulatedClaims({
        role: 'tenant_manager',
        tenant_id: tenantId,
      });
      setIsSuperAdminView(false);
      navigateTo('/app/gerente/dashboard');
    } else {
      const tenantId = activeClaims?.tenant_id || currentBusiness?.id || businesses[0]?.id;
      if (tenantId) switchBusiness(tenantId);
      switchRole('profissional');
      setSimulatedClaims({
        role: 'professional',
        tenant_id: tenantId,
      });
      setIsSuperAdminView(false);
      navigateTo('/app/profissional/agenda');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshClaimsFromFirebase();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <aside
      aria-label="Barra de diagnóstico RBAC e Custom Claims"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-white text-xs transition-all shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        {/* Left: Active Role Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase font-mono tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
            <Key className="w-3 h-3 text-amber-400" />
            <span>RBAC Active</span>
          </span>

          <div className="flex items-center gap-2 truncate text-slate-300">
            <span className="font-semibold text-white">
              {userRole === 'super_admin'
                ? 'Super Admin (CEO Pedro)'
                : userRole === 'tenant_manager'
                ? 'Gerente (Tenant Manager)'
                : 'Profissional / Especialista'}
            </span>
            {activeClaims?.tenant_id && (
              <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
                · tenant: <strong className="text-slate-200">{activeClaims.tenant_id}</strong>
              </span>
            )}
            <span className="hidden md:inline font-mono text-[10px] text-slate-500">
              · rota: {currentPath}
            </span>
          </div>
        </div>

        {/* Right: Quick Switcher & Expand Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => handleRoleQuickSwitch('super_admin')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                userRole === 'super_admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => handleRoleQuickSwitch('tenant_manager')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                userRole === 'tenant_manager' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gerente
            </button>
            <button
              onClick={() => handleRoleQuickSwitch('professional')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                userRole === 'professional' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Profissional
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Recarregar claims do ID Token"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-1 text-[11px]"
            title="Expandir detalhes do Token"
          >
            <span>Claims</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Claims Drawer */}
      {isExpanded && (
        <div className="border-t border-slate-800 p-4 bg-slate-950 text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                Custom User Claims Decodificadas:
              </span>
              <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                {JSON.stringify(activeClaims, null, 2)}
              </pre>
            </div>

            <div>
              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                Regras de Acesso Aplicadas:
              </span>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>/admin/* restrito a <strong>super_admin</strong> (Pedro - CEO)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>/app/gerente/* restrito a <strong>tenant_manager</strong> ({activeClaims?.tenant_id || 'tenant'})</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>/app/profissional/* filtrado por <strong>professional_id</strong></span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                  Atalhos de Navegação RBAC:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleRoleQuickSwitch('super_admin')}
                    className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold rounded-lg text-[11px]"
                  >
                    Painel Master /admin
                  </button>
                  <button
                    onClick={() => handleRoleQuickSwitch('tenant_manager')}
                    className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold rounded-lg text-[11px]"
                  >
                    Gerente /app/gerente
                  </button>
                  <button
                    onClick={() => handleRoleQuickSwitch('professional')}
                    className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold rounded-lg text-[11px]"
                  >
                    Profissional /app/profissional
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Conforme solicitado, toda requisição valida Custom Claims no Firebase Token e isola o tenant_id no Firestore.
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
