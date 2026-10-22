import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { AgendaView } from './components/agenda/AgendaView';
import { ServicesManager } from './components/services/ServicesManager';
import { ProfessionalsManager } from './components/professionals/ProfessionalsManager';
import { ComandasCheckout } from './components/financial/ComandasCheckout';
import { ClientsManager } from './components/clients/ClientsManager';
import { StudioSettings } from './components/settings/StudioSettings';
import { NewAppointmentModal } from './components/agenda/NewAppointmentModal';
import { NewStudioModal } from './components/saas/NewStudioModal';
import { PlansModal } from './components/saas/PlansModal';
import { LoginModal } from './components/auth/LoginModal';
import { RBACRouteGuard } from './components/auth/RBACRouteGuard';
import { UnifiedLoginPage } from './components/auth/UnifiedLoginPage';
import { ProfessionalPortal } from './components/professional/ProfessionalPortal';
import { RBACClaimsBar } from './components/layout/RBACClaimsBar';
import { PlansLandingPage } from './components/landing/PlansLandingPage';
import { ProfessionalProfilePage } from './components/public/ProfessionalProfilePage';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Crown, Check, ExternalLink, Sparkles, Building2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    activeTab,
    currentBusiness,
    setIsPlansModalOpen,
    setIsNewStudioModalOpen,
    isSuperAdminView,
    setIsSuperAdminView,
    saasPlans,
    navigateTo,
    currentPath,
    userRole,
    isSuperAdminAuthenticated,
    setIsLoginModalOpen,
  } = useApp();

  const isProfessionalWorkspace =
    currentPath.startsWith('/app/profissional') || (userRole === 'professional' && !isSuperAdminView);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50/60 pb-10">
      <Header />

      <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-28 md:pb-16 max-w-7xl w-full mx-auto">
        {/* If in Platform Master Mode (Super Admin - Pedro Campos) */}
        {isSuperAdminView || currentPath === '/admin/painelmaster' || currentPath === '/admin' || currentPath === '/admin/' ? (
          <SuperAdminDashboard />
        ) : isProfessionalWorkspace ? (
          /* Dedicated Professional Workspace (/app/profissional/*) */
          <ProfessionalPortal />
        ) : !currentBusiness ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Nenhum Estabelecimento Cadastrado
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Todos os dados mock foram apagados. Para começar a operar ou testar a plataforma, cadastre seu primeiro estabelecimento ou acesse o painel de Super Admin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsNewStudioModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>+ Cadastrar Primeiro Estabelecimento</span>
              </button>
              <button
                onClick={() => {
                  if (isSuperAdminAuthenticated) {
                    setIsSuperAdminView(true);
                    navigateTo('/admin/painelmaster');
                  } else {
                    setIsLoginModalOpen(true);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Painel Super Admin (Pedro Campos)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Tenant Manager Workspace (/app/gerente/* or /dashboard/*) */
          <>
            {activeTab === 'dashboard' && <ExecutiveDashboard />}
            {activeTab === 'agenda' && <AgendaView />}
            {activeTab === 'servicos' && <ServicesManager />}
            {activeTab === 'profissionais' && <ProfessionalsManager />}
            {activeTab === 'comandas' && <ComandasCheckout />}
            {activeTab === 'clientes' && <ClientsManager />}
            {activeTab === 'configuracoes' && <StudioSettings />}

            {activeTab === 'planos' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      Assinatura & Upgrades
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Planos de Contratação do Studio Digital
                    </h2>
                    <p className="text-xs text-slate-500">
                      Plano ativo em {currentBusiness?.tradeName || 'Estabelecimento'}:{' '}
                      <span className="font-bold text-slate-800 uppercase">
                        {currentBusiness?.planId || 'pro'}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => navigateTo('/nossos-planos')}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Ver Landing Page Pública (/nossos-planos)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {saasPlans.map((plan) => {
                    const isCurrent = currentBusiness ? currentBusiness.planId === plan.id : false;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-6 border flex flex-col justify-between transition-all bg-white ${
                          plan.isPopular
                            ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-sm'
                            : 'border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                            {isCurrent && (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                Ativo
                              </span>
                            )}
                          </div>

                          <div className="mb-4">
                            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                              R$ {plan.priceMonthly}
                            </span>
                            <span className="text-xs text-slate-500"> / mês</span>
                          </div>

                          <div className="space-y-2.5 mb-6">
                            {plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => setIsPlansModalOpen(true)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-slate-100 text-slate-600'
                              : plan.isPopular
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isCurrent ? 'Gerenciar Plano Atual' : `Contratar ${plan.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <NewAppointmentModal />
      <NewStudioModal />
      <PlansModal />
      <LoginModal />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />

      {/* RBAC Custom Claims Diagnostic & Quick Switcher Bar */}
      <RBACClaimsBar />
    </div>
  );
};

const RootRouter: React.FC = () => {
  const { currentPath, isSuperAdminAuthenticated } = useApp();

  // Route: /login -> Unified Login Page
  if (currentPath === '/login') {
    return <UnifiedLoginPage />;
  }

  // Route: /nossos-planos -> Public SaaS pricing landing page
  if (currentPath === '/nossos-planos') {
    return <PlansLandingPage />;
  }

  // Route: /p/:slugOrId -> Public Professional Profile & Online Booking Page
  if (currentPath.startsWith('/p/')) {
    return <ProfessionalProfilePage />;
  }

  // Protected Routes:
  // - /admin/* (Restricted to super_admin)
  // - /app/gerente/* (Restricted to tenant_manager)
  // - /app/profissional/* (Restricted to professional)
  // - /dashboard/*
  if (
    currentPath.startsWith('/admin') ||
    currentPath.startsWith('/app/gerente') ||
    currentPath.startsWith('/app/profissional') ||
    currentPath.startsWith('/dashboard')
  ) {
    return (
      <RBACRouteGuard>
        <div className="min-h-screen flex bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
          <Sidebar />
          <MainContent />
        </div>
      </RBACRouteGuard>
    );
  }

  // Root URL ('/' or ''):
  // If user is already authenticated, show the workspace guarded by RBAC
  if (isSuperAdminAuthenticated) {
    return (
      <RBACRouteGuard>
        <div className="min-h-screen flex bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
          <Sidebar />
          <MainContent />
        </div>
      </RBACRouteGuard>
    );
  }

  // Default public visitor landing page
  return <PlansLandingPage />;
};

export default function App() {
  return (
    <AppProvider>
      <RootRouter />
    </AppProvider>
  );
}

