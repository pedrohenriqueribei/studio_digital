import React from 'react';
import {
  Calendar,
  Users,
  Scissors,
  Receipt,
  UserCheck,
  LayoutDashboard,
  Crown,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Building2,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { useApp, AppTab, SuperAdminTab } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    activeTab,
    setActiveTab,
    currentBusiness,
    activeAppointments,
    activeComandas,
    setIsNewStudioModalOpen,
    setIsPlansModalOpen,
    currentRole,
    isSuperAdminView,
    setIsSuperAdminView,
    superAdminTab,
    setSuperAdminTab,
    isSuperAdminAuthenticated,
    superAdminUser,
    setIsLoginModalOpen,
    businesses,
    professionals,
    saasPlans,
    navigateTo,
  } = useApp();

  const todayStr = '2026-10-15';
  const todayAppointmentsCount = activeAppointments.filter(
    (a) => a.date === todayStr && a.status !== 'cancelado'
  ).length;
  const openComandasCount = activeComandas.filter((c) => c.status === 'aberta').length;

  const tenantNavItems: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Visão Geral',
      icon: LayoutDashboard,
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      badge: todayAppointmentsCount > 0 ? todayAppointmentsCount : undefined,
    },
    {
      id: 'servicos',
      label: 'Serviços',
      icon: Scissors,
    },
    {
      id: 'profissionais',
      label: 'Equipe & Profissionais',
      icon: Users,
    },
    {
      id: 'comandas',
      label: 'Caixa & Comandas',
      icon: Receipt,
      badge: openComandasCount > 0 ? openComandasCount : undefined,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: UserCheck,
    },
    {
      id: 'planos',
      label: 'Planos SaaS',
      icon: Crown,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: Settings,
    },
  ];

  const superAdminNavItems: {
    id: SuperAdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'tenants',
      label: 'Gestão de Tenants',
      icon: Building2,
      badge: businesses.length,
    },
    {
      id: 'profissionais',
      label: 'Profissionais Globais',
      icon: Users,
      badge: professionals.length,
    },
    {
      id: 'planos',
      label: 'Planos de Contratação',
      icon: Crown,
      badge: saasPlans.length,
    },
    {
      id: 'metricas',
      label: 'Métricas da Plataforma',
      icon: TrendingUp,
    },
  ];

  const getBusinessCategoryLabel = (type: string) => {
    switch (type) {
      case 'clinica_estetica':
        return 'Clínica de Estética';
      case 'barbearia':
        return 'Barbearia';
      case 'salao_beleza':
        return 'Salão de Beleza';
      default:
        return 'Studio';
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out select-none shrink-0 z-50 md:z-30 h-full ${
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } w-72 md:w-auto ${
          isMobileMenuOpen
            ? 'translate-x-0 shadow-2xl md:shadow-none'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 text-base tracking-tight truncate">
                  Studio Digital
                </span>
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  {isSuperAdminView ? 'Super Admin Master' : 'Plataforma SaaS'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={`p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer hidden md:block ${
                sidebarCollapsed ? 'hidden' : 'block'
              }`}
              title="Recolher barra lateral"
              aria-label="Recolher barra lateral"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Fechar menu"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Switch between Super Admin Mode and Tenant Mode */}
      {isSuperAdminAuthenticated && (
        <div className="p-3 border-b border-slate-100">
          {!sidebarCollapsed ? (
            <button
              onClick={() => {
                if (isSuperAdminView) {
                  setIsSuperAdminView(false);
                  navigateTo('/admin/' + activeTab);
                } else {
                  setIsSuperAdminView(true);
                  navigateTo('/admin/painelmaster');
                }
              }}
              className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSuperAdminView
                  ? 'bg-amber-500/10 text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-500/15'
                  : 'bg-slate-900 text-white shadow-xs hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">
                  {isSuperAdminView ? 'Ir p/ Modo Studio' : 'Painel Master (CEO)'}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (isSuperAdminView) {
                    setIsSuperAdminView(false);
                    navigateTo('/admin/' + activeTab);
                  } else {
                    setIsSuperAdminView(true);
                    navigateTo('/admin/painelmaster');
                  }
                }}
                className="p-2 rounded-lg bg-slate-900 text-amber-400 hover:bg-slate-800 cursor-pointer"
                title={isSuperAdminView ? 'Ir para Modo Studio' : 'Painel Master (Super Admin)'}
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Context Box */}
      {!isSuperAdminView ? (
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          {!currentBusiness ? (
            !sidebarCollapsed ? (
              <button
                onClick={() => setIsNewStudioModalOpen(true)}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-dashed border-slate-300 hover:border-slate-400 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Criar Studio</span>
                </div>
              </button>
            ) : null
          ) : !sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 text-xs font-semibold"
                  style={{ backgroundColor: currentBusiness.accentColor || '#0f172a' }}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentBusiness.tradeName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {getBusinessCategoryLabel(currentBusiness.type)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewStudioModalOpen(true)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer shrink-0"
                title="Cadastrar novo Studio / Unidade"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center text-white text-xs font-semibold shadow-2xs"
                style={{ backgroundColor: currentBusiness.accentColor || '#0f172a' }}
                title={`${currentBusiness.tradeName} (${getBusinessCategoryLabel(currentBusiness.type)})`}
              >
                <Building2 className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 border-b border-slate-100 bg-amber-50/40">
          {!sidebarCollapsed ? (
            <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-0.5">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Gestão da Plataforma</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Pedro Campos · CEO Master
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* If in Super Admin View */}
        {isSuperAdminView ? (
          <>
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu Master
              </div>
            )}
            {superAdminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = superAdminTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSuperAdminTab(item.id);
                    navigateTo('/admin/painelmaster');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer relative group ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`} />

                  {!sidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-mono tabular-nums ${
                            isActive
                              ? 'bg-slate-800 text-amber-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </>
        ) : (
          /* Normal Tenant Navigation */
          <>
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu do Studio
              </div>
            )}
            {tenantNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    navigateTo('/admin/' + item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer relative group ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`} />

                  {!sidebarCollapsed && (
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-mono tabular-nums ${
                            isActive
                              ? 'bg-slate-800 text-amber-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                      {item.badge !== undefined && ` (${item.badge})`}
                    </div>
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* Subscription SaaS Plan Banner in Sidebar (when in tenant view) */}
      {!isSuperAdminView && currentBusiness && (
        !sidebarCollapsed ? (
          <div className="p-3 mx-3 mb-3 bg-linear-to-b from-slate-50 to-slate-100/90 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-800">
                Plano {currentBusiness.planId.toUpperCase()}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Ativo</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              {currentBusiness.planId === 'prime'
                ? 'Multi-unidades e equipe ilimitada'
                : currentBusiness.planId === 'pro'
                ? 'Multi-unidades e até 10 profissionais'
                : 'Até 3 profissionais e agenda online'}
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setIsPlansModalOpen(true)}
                className="w-full py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Gerenciar Assinatura
              </button>
              <button
                onClick={() => navigateTo('/nossos-planos')}
                className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                title="Abrir Landing Page Pública de Vendas"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Landing Page (/nossos-planos)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 mb-2 flex flex-col items-center gap-1">
            <button
              onClick={() => setIsPlansModalOpen(true)}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
              title="Ver Planos SaaS"
            >
              <Crown className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateTo('/nossos-planos')}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Landing Page Pública (/nossos-planos)"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        )
      )}

      {/* Collapse/Expand Toggle Footer */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Perfil:</span>
            <span className="font-semibold text-slate-800 capitalize truncate max-w-[120px]">
              {isSuperAdminView ? 'Pedro Campos (CEO)' : currentRole}
            </span>
          </div>
        ) : null}

        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className={`p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
            sidebarCollapsed ? 'w-full flex justify-center' : ''
          }`}
          title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
    </>
  );
};
