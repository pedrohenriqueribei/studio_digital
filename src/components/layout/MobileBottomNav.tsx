import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  UserCheck,
  Menu,
  Shield,
  Building2,
  Users,
  Crown,
  Scissors,
  Settings,
  Plus,
  X,
  Sparkles,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Lock,
  Info,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useApp, AppTab, SuperAdminTab } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/date';
import {
  resolveCurrentUserProfile,
  getRoleBasedDestination,
  getUserProfileLabel,
  BottomNavTabId,
  ResolvedUserProfile,
} from '../../utils/rbacNavigation';
import { slugify } from '../../utils/slugify';

export const MobileBottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSuperAdminView,
    superAdminTab,
    setSuperAdminTab,
    activeAppointments,
    activeComandas,
    navigateTo,
    currentPath,
    setIsNewAppointmentModalOpen,
    setIsNewStudioModalOpen,
    setIsPlansModalOpen,
    openNewAppointmentModal,
    currentRole,
    userRole,
    activeClaims,
    firebaseUser,
    isAuthenticated,
    isSuperAdminAuthenticated,
    setIsSuperAdminView,
    setIsLoginModalOpen,
    currentBusiness,
    currentProfessional,
    setSettingsSubTab,
  } = useApp();

  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [restrictedNoticeModal, setRestrictedNoticeModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // 1. Identificação precisa do perfil do usuário logado na sessão/estado atual
  const profile: ResolvedUserProfile = useMemo(() => {
    return resolveCurrentUserProfile({
      isAuthenticated,
      isSuperAdminAuthenticated,
      userRole,
      activeClaims,
      currentRole,
      firebaseUser,
    });
  }, [
    isAuthenticated,
    isSuperAdminAuthenticated,
    userRole,
    activeClaims,
    currentRole,
    firebaseUser,
  ]);

  const isSuperAdmin = profile === 'super_admin';
  const isProfessional = profile === 'professional';
  const isManager = profile === 'tenant_manager';
  const isGuest = profile === 'client_or_guest';

  // Contadores e métricas contextuais
  const todayStr = getTodayDateString();

  // Agendamentos de hoje do estabelecimento (para gerente / superadmin)
  const todayAppointmentsCount = useMemo(() => {
    return activeAppointments.filter(
      (a) => a.date === todayStr && a.status !== 'cancelado'
    ).length;
  }, [activeAppointments, todayStr]);

  // Agendamentos de hoje exclusivos do profissional logado
  const myTodayAppointmentsCount = useMemo(() => {
    if (!currentProfessional) return 0;
    return activeAppointments.filter(
      (a) =>
        a.professionalId === currentProfessional.id &&
        a.date === todayStr &&
        a.status !== 'cancelado'
    ).length;
  }, [activeAppointments, currentProfessional, todayStr]);

  // Comandas abertas no caixa (para gerente / superadmin)
  const openComandasCount = useMemo(() => {
    return activeComandas.filter((c) => c.status === 'aberta').length;
  }, [activeComandas]);

  // Taxa de comissão do profissional logado
  const proCommissionRate = currentProfessional?.commissionPercentage || 50;

  // 2. Função de redirecionamento condicional dinâmica baseada no perfil
  const handleNavClick = (tabId: BottomNavTabId) => {
    const destination = getRoleBasedDestination(tabId, profile, isSuperAdminView);

    if (!destination.allowed && destination.reason) {
      if (profile === 'client_or_guest') {
        setIsLoginModalOpen(true);
        setIsMoreSheetOpen(false);
        return;
      }
      setRestrictedNoticeModal({
        title: 'Acesso Restrito pelo Perfil',
        message: destination.reason,
      });
      return;
    }

    if (destination.tabState) {
      setActiveTab(destination.tabState);
    }

    navigateTo(destination.path);
    setIsMoreSheetOpen(false);
  };

  // Botão Central FAB: Ação contextual
  const handleCenterFabClick = () => {
    if (isSuperAdmin && isSuperAdminView) {
      setIsNewStudioModalOpen(true);
      return;
    }
    if (isProfessional && currentProfessional) {
      openNewAppointmentModal({ professionalId: currentProfessional.id });
      return;
    }
    if (isGuest) {
      setIsLoginModalOpen(true);
      return;
    }
    setIsNewAppointmentModalOpen(true);
  };

  // Determinar se o botão Início está ativo
  const isInicioActive = useMemo(() => {
    if (isSuperAdmin && isSuperAdminView) return superAdminTab === 'tenants';
    if (isProfessional) return currentPath.startsWith('/app/profissional');
    if (isManager) return activeTab === 'dashboard' || currentPath === '/app/gerente/dashboard';
    if (isSuperAdmin) return activeTab === 'dashboard' || currentPath === '/admin/dashboard';
    return currentPath === '/' || currentPath === '/nossos-planos';
  }, [isSuperAdmin, isSuperAdminView, superAdminTab, isProfessional, currentPath, isManager, activeTab]);

  // Determinar se o botão Agenda está ativo
  const isAgendaActive = useMemo(() => {
    if (isProfessional) return currentPath.startsWith('/app/profissional');
    if (isSuperAdmin && isSuperAdminView) return false;
    return activeTab === 'agenda' || currentPath.includes('/agenda');
  }, [isProfessional, currentPath, isSuperAdmin, isSuperAdminView, activeTab]);

  // Determinar se o botão Caixa/Comissões está ativo
  const isCaixaActive = useMemo(() => {
    if (isProfessional) return currentPath.startsWith('/app/profissional');
    if (isSuperAdmin && isSuperAdminView) return false;
    return activeTab === 'comandas' || currentPath.includes('/comandas');
  }, [isProfessional, currentPath, isSuperAdmin, isSuperAdminView, activeTab]);

  const proSlug = currentProfessional?.slug || (currentProfessional ? slugify(currentProfessional.name) : '');

  return (
    <>
      {/* 1. Native Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação móvel principal adaptativa"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {isSuperAdmin && isSuperAdminView ? (
            /* Super Admin Platform Master Navigation Tabs */
            <>
              {/* Tab 1: Tenants */}
              <button
                onClick={() => {
                  setSuperAdminTab('tenants');
                  navigateTo('/admin/painelmaster');
                }}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  superAdminTab === 'tenants' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                title="Lista de Tenants do SaaS"
              >
                <div className={`p-1 rounded-lg transition-colors ${superAdminTab === 'tenants' ? 'bg-amber-50 text-amber-700' : ''}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate">Tenants</span>
              </button>

              {/* Tab 2: Equipe */}
              <button
                onClick={() => {
                  setSuperAdminTab('profissionais');
                  navigateTo('/admin/painelmaster');
                }}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  superAdminTab === 'profissionais' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                title="Gestão de Especialistas Master"
              >
                <div className={`p-1 rounded-lg transition-colors ${superAdminTab === 'profissionais' ? 'bg-amber-50 text-amber-700' : ''}`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate">Equipe</span>
              </button>

              {/* Center FAB: Quick Action (Novo Tenant) */}
              <div className="flex-1 flex justify-center -mt-3">
                <button
                  onClick={handleCenterFabClick}
                  className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 shadow-lg shadow-slate-900/25 flex items-center justify-center cursor-pointer active:scale-90 transition-transform ring-4 ring-white"
                  title="Cadastrar Novo Tenant"
                  aria-label="Cadastrar novo tenant"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* Tab 3: Planos */}
              <button
                onClick={() => {
                  setSuperAdminTab('planos');
                  navigateTo('/admin/painelmaster');
                }}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  superAdminTab === 'planos' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                title="Planos de Assinatura"
              >
                <div className={`p-1 rounded-lg transition-colors ${superAdminTab === 'planos' ? 'bg-amber-50 text-amber-700' : ''}`}>
                  <Crown className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate">Planos</span>
              </button>

              {/* Tab 4: Mais */}
              <button
                onClick={() => setIsMoreSheetOpen(true)}
                className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl text-slate-500 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
                aria-label="Abrir mais opções"
              >
                <div className="p-1 rounded-lg">
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 font-medium">Mais</span>
              </button>
            </>
          ) : (
            /* Role-Aware Dynamic Navigation (Gerente, Profissional, Cliente, SuperAdmin em Studio) */
            <>
              {/* 1. Botão INÍCIO - Roteamento dinâmico sem erro 403 */}
              <button
                onClick={() => handleNavClick('inicio')}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  isInicioActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                title={isProfessional ? 'Meu Portal de Especialista' : 'Visão Geral / Início'}
              >
                <div className={`p-1 rounded-lg transition-colors ${isInicioActive ? 'bg-slate-100 text-slate-900' : ''}`}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate">
                  {isProfessional ? 'Portal' : 'Início'}
                </span>
              </button>

              {/* 2. Botão AGENDA - Roteamento dinâmico adaptado ao papel */}
              <button
                onClick={() => handleNavClick('agenda')}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                  isAgendaActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
                title={isProfessional ? 'Minha Agenda de Atendimentos' : 'Agenda de Atendimentos'}
              >
                <div className={`p-1 rounded-lg relative transition-colors ${isAgendaActive ? 'bg-slate-100 text-slate-900' : ''}`}>
                  <Calendar className="w-5 h-5" />
                  {/* Badge de agendamentos de hoje: exclusivo do profissional para o seu total, ou do estúdio para o gerente */}
                  {isProfessional ? (
                    myTodayAppointmentsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-4 px-1 rounded-full bg-indigo-600 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                        {myTodayAppointmentsCount}
                      </span>
                    )
                  ) : (
                    todayAppointmentsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-4 px-1 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                        {todayAppointmentsCount}
                      </span>
                    )
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate">
                  {isProfessional ? 'Minha Agenda' : 'Agenda'}
                </span>
              </button>

              {/* 3. Center FAB: Ação Rápida adaptada ao papel */}
              <div className="flex-1 flex justify-center -mt-3">
                <button
                  onClick={handleCenterFabClick}
                  className="w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/25 flex items-center justify-center cursor-pointer active:scale-90 transition-transform ring-4 ring-white"
                  title={isProfessional ? 'Novo Agendamento Comigo' : 'Novo Agendamento Rápido'}
                  aria-label="Criar novo agendamento"
                >
                  <Plus className="w-6 h-6 stroke-[2.5] text-amber-400" />
                </button>
              </div>

              {/* 4. Botão CAIXA / COMISSÕES - Adaptado dinamicamente */}
              {isProfessional ? (
                /* Para Profissionais: exibe "Comissões" (sua versão financeira permitida, evitando o erro 403 do Caixa Geral) */
                <button
                  onClick={() => handleNavClick('comissoes')}
                  className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                    isCaixaActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                  title="Minhas Comissões e Ganhos"
                >
                  <div className={`p-1 rounded-lg relative transition-colors ${isCaixaActive ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-emerald-600 text-white font-mono text-[8px] font-bold flex items-center justify-center ring-1 ring-white">
                      {proCommissionRate}%
                    </span>
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 truncate text-indigo-950 font-semibold">
                    Comissões
                  </span>
                </button>
              ) : isGuest ? (
                /* Para visitantes/clientes sem login: botão desabilitado com cadeado */
                <button
                  onClick={() => handleNavClick('caixa')}
                  className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl text-slate-400 cursor-not-allowed opacity-60"
                  title="Acesso restrito ao Caixa (Faça Login)"
                >
                  <div className="p-1 rounded-lg relative">
                    <Receipt className="w-5 h-5 text-slate-400" />
                    <Lock className="w-2.5 h-2.5 text-slate-500 absolute -top-0.5 -right-0.5" />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 truncate">Caixa</span>
                </button>
              ) : (
                /* Para Gerente e Super Admin: Caixa completo do Studio */
                <button
                  onClick={() => handleNavClick('caixa')}
                  className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 cursor-pointer ${
                    isCaixaActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                  title="Caixa & Comandas do Estabelecimento"
                >
                  <div className={`p-1 rounded-lg relative transition-colors ${isCaixaActive ? 'bg-slate-100 text-slate-900' : ''}`}>
                    <Receipt className="w-5 h-5" />
                    {openComandasCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-4 px-1 rounded-full bg-emerald-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                        {openComandasCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 truncate">Caixa</span>
                </button>
              )}

              {/* 5. Tab MAIS: Gaveta de Opções */}
              <button
                onClick={() => setIsMoreSheetOpen(true)}
                className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl text-slate-500 hover:text-slate-900 active:scale-95 transition-all cursor-pointer"
                aria-label="Abrir mais opções e menu"
              >
                <div className="p-1 rounded-lg">
                  <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 font-medium">Mais</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* 2. "Mais" Native Bottom Sheet Drawer com RBAC Adaptativo */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMoreSheetOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Bottom Sheet Card */}
          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-4 sm:p-6 overflow-y-auto z-10 animate-in slide-in-from-bottom duration-250 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

            {/* Cabeçalho com Perfil do Usuário Logado */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
                  {isSuperAdmin ? (
                    <Shield className="w-4 h-4 text-amber-400" />
                  ) : isProfessional ? (
                    <Users className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Building2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900">Navegação & Opções</h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {getUserProfileLabel(profile)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                    {currentBusiness?.tradeName || 'Studio Digital SaaS'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar gaveta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid de Navegação Condicional por Perfil */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                  {isProfessional ? 'Módulos do Especialista' : 'Módulos de Gestão'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {/* Clientes */}
                  <button
                    onClick={() => handleNavClick('clientes')}
                    className={`min-h-[50px] p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                      activeTab === 'clientes'
                        ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold'
                        : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="text-xs truncate">
                      {isProfessional ? 'Meus Clientes' : 'Clientes'}
                    </span>
                  </button>

                  {/* Serviços */}
                  {isProfessional ? (
                    <button
                      onClick={() => {
                        setRestrictedNoticeModal({
                          title: 'Catálogo de Serviços',
                          message:
                            'O cadastro e precificação de serviços é exclusivo da Gerência do Studio. Você executa os serviços atribuídos a você.',
                        });
                      }}
                      className="min-h-[50px] p-3 rounded-xl border border-slate-200/60 bg-slate-50/70 flex items-center justify-between text-left opacity-75 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Scissors className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500 truncate">Serviços</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                        Gerência
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNavClick('servicos')}
                      className={`min-h-[50px] p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                        activeTab === 'servicos'
                          ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold'
                          : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Scissors className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="text-xs truncate">Serviços</span>
                    </button>
                  )}

                  {/* Equipe / Profissionais */}
                  {isProfessional ? (
                    <button
                      onClick={() => {
                        setRestrictedNoticeModal({
                          title: 'Gestão de Equipe',
                          message:
                            'O gerenciamento de profissionais e comissões gerais é restrito à Gerência do Studio.',
                        });
                      }}
                      className="min-h-[50px] p-3 rounded-xl border border-slate-200/60 bg-slate-50/70 flex items-center justify-between text-left opacity-75 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500 truncate">Equipe</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                        Gerência
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNavClick('profissionais')}
                      className={`min-h-[50px] p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                        activeTab === 'profissionais'
                          ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold'
                          : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Users className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="text-xs truncate">Equipe</span>
                    </button>
                  )}

                  {/* Configurações ou Disponibilidade */}
                  <button
                    onClick={() => {
                      if (isProfessional) {
                        setSettingsSubTab('disponibilidade');
                        handleNavClick('configuracoes');
                      } else {
                        handleNavClick('configuracoes');
                      }
                    }}
                    className={`min-h-[50px] p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                      activeTab === 'configuracoes'
                        ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold'
                        : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="text-xs truncate">
                      {isProfessional ? 'Horários & Agenda' : 'Configurações'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Seção Exclusiva para Profissionais: Link Público e Ganhos */}
              {isProfessional && currentProfessional && (
                <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Seu Link de Agendamento Online</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${proSlug}`}
                      className="flex-1 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono truncate"
                    />
                    <button
                      onClick={() => {
                        navigateTo(`/p/${proSlug}`);
                        setIsMoreSheetOpen(false);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Governança & Modos da Plataforma */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                  Governança & SaaS
                </span>
                <div className="space-y-1.5">
                  {isSuperAdminAuthenticated ? (
                    <button
                      onClick={() => {
                        if (isSuperAdminView) {
                          setIsSuperAdminView(false);
                          navigateTo('/admin/' + activeTab);
                        } else {
                          setIsSuperAdminView(true);
                          navigateTo('/admin/painelmaster');
                        }
                        setIsMoreSheetOpen(false);
                      }}
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span>
                          {isSuperAdminView ? 'Voltar para Workspace Studio' : 'Painel Master Super Admin'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold">Alternar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsLoginModalOpen(true);
                        setIsMoreSheetOpen(false);
                      }}
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span>Acessar Login Master (Super Admin)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigateTo('/nossos-planos');
                      setIsMoreSheetOpen(false);
                    }}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Ver Planos SaaS Públicos (/nossos-planos)</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Informações Institucionais */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-center text-xs text-slate-500">
                <div className="flex items-center justify-center gap-3 text-[11px] font-medium text-slate-600">
                  <a
                    href="#suporte"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('https://wa.me/?text=Olá,%20preciso%20de%20suporte%20no%20Studio%20Digital', '_blank');
                    }}
                    className="hover:text-slate-900"
                  >
                    Suporte WhatsApp
                  </a>
                  <span>·</span>
                  <span>Termos & Privacidade</span>
                  <span>·</span>
                  <span>Central de Ajuda</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  © 2026 Studio Digital SaaS · RBAC Dinâmico
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Informativo Amigável quando uma seção for restrita ao perfil */}
      {restrictedNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {restrictedNoticeModal.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {restrictedNoticeModal.message}
              </p>
            </div>
            <button
              onClick={() => setRestrictedNoticeModal(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
