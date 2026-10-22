import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  UserCheck,
  Menu,
  Shield,
  Layers,
  Users,
  Crown,
  BarChart2,
} from 'lucide-react';
import { useApp, AppTab, SuperAdminTab } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/date';

export const MobileBottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSuperAdminView,
    superAdminTab,
    setSuperAdminTab,
    setIsMobileMenuOpen,
    activeAppointments,
    activeComandas,
    navigateTo,
  } = useApp();

  const todayStr = getTodayDateString();
  const todayAppointmentsCount = activeAppointments.filter(
    (a) => a.date === todayStr && a.status !== 'cancelado'
  ).length;
  const openComandasCount = activeComandas.filter((c) => c.status === 'aberta').length;

  if (isSuperAdminView) {
    const adminNav: { id: SuperAdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: 'tenants', label: 'Tenants', icon: Layers },
      { id: 'profissionais', label: 'Equipe', icon: Users },
      { id: 'planos', label: 'Planos', icon: Crown },
      { id: 'metricas', label: 'Métricas', icon: BarChart2 },
    ];

    return (
      <nav
        aria-label="Navegação móvel principal"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        {adminNav.map((item) => {
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
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
                isActive ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-slate-500'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer min-h-[44px]"
          aria-label="Abrir menu completo"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium tracking-tight">Menu</span>
        </button>
      </nav>
    );
  }

  const tenantNav: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      badge: todayAppointmentsCount > 0 ? todayAppointmentsCount : undefined,
    },
    {
      id: 'comandas',
      label: 'Caixa',
      icon: Receipt,
      badge: openComandasCount > 0 ? openComandasCount : undefined,
    },
    { id: 'clientes', label: 'Clientes', icon: UserCheck },
  ];

  return (
    <nav
      aria-label="Navegação móvel principal"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {tenantNav.map((item) => {
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
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-amber-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center leading-none">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* More / Menu Drawer Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all cursor-pointer min-h-[44px]"
        aria-label="Abrir menu de opções e configurações"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium tracking-tight">Mais</span>
      </button>
    </nav>
  );
};
