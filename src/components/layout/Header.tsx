import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Plus,
  ChevronDown,
  Building,
  Shield,
  Check,
  User,
  LogOut,
  Sparkles,
  Layers,
  ArrowRight,
  Lock,
  Menu,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const Header: React.FC = () => {
  const {
    currentBusiness,
    businesses,
    switchBusiness,
    currentRole,
    switchRole,
    currentProfessional,
    activeProfessionals,
    notifications,
    markNotificationRead,
    setIsNewAppointmentModalOpen,
    setIsNewStudioModalOpen,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    setSettingsSubTab,
    isSuperAdminAuthenticated,
    superAdminUser,
    isSuperAdminView,
    setIsSuperAdminView,
    setIsLoginModalOpen,
    logoutSuperAdmin,
    navigateTo,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unitRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (unitRef.current && !unitRef.current.contains(e.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 px-3 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20">
      {/* Zone 1: Mobile Menu Toggle + Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menu lateral"
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isSuperAdminView ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Painel Master Plataforma</span>
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">
              Gestão de {businesses.length} estabelecimentos cadastrados
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            {/* Establishment Switcher Dropdown */}
            <div className="relative" ref={unitRef}>
              <button
                onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {currentBusiness ? currentBusiness.tradeName : 'Nenhum Studio'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUnitDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Alternar Estabelecimento
                  </div>

                  {businesses.map((biz) => {
                    const isSelected = currentBusiness ? biz.id === currentBusiness.id : false;
                    return (
                      <button
                        key={biz.id}
                        onClick={() => {
                          switchBusiness(biz.id);
                          setIsUnitDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-slate-900 font-medium">{biz.tradeName}</span>
                          <span className="text-[11px] text-slate-400 capitalize">
                            {biz.type.replace('_', ' ')} · {biz.city}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}

                  <div className="border-t border-slate-100 my-1 pt-1 px-2">
                    <button
                      onClick={() => {
                        setIsUnitDropdownOpen(false);
                        setIsNewStudioModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Novo Studio / Unidade</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Jump to Master Platform button for Super Admin */}
            {isSuperAdminAuthenticated && (
              <button
                onClick={() => {
                  setIsSuperAdminView(true);
                  navigateTo('/admin/painelmaster');
                }}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Voltar para a gestão master de todos os tenants"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Gestão Global SaaS</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: Global Search */}
      <div className="flex-1 max-w-xs md:max-w-md hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isSuperAdminView
                ? 'Buscar por tenants, planos ou profissionais...'
                : 'Buscar agendamento, cliente ou serviço...'
            }
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: Actions, Role & User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Toggle Mode Button */}
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
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSuperAdminView
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">
              {isSuperAdminView ? 'Ver Workspace Studio' : 'Painel Master (CEO)'}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Login Super Admin</span>
          </button>
        )}

        {/* Tenant Role Switcher (visible in tenant mode) */}
        {!isSuperAdminView && (
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
              title="Mudar papel de usuário para testar permissões"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <div className="text-left hidden md:block">
                <span className="text-[10px] text-slate-400 block leading-tight">Papel Studio:</span>
                <span className="font-semibold text-slate-900 leading-tight">
                  {currentRole === 'ceo' ? 'CEO' : currentRole === 'gerente' ? 'Gerente' : 'Profissional'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Alternar Papel (RBAC)
                </div>

                {[
                  { id: 'gerente', label: 'Gerente do Studio (/app/gerente)', roleType: 'tenant_manager' },
                  { id: 'profissional', label: 'Profissional (/app/profissional)', roleType: 'professional' },
                ].map((item) => {
                  const isSelected = currentRole === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        switchRole(item.id as UserRole);
                        setIsRoleDropdownOpen(false);
                        if (item.id === 'profissional') {
                          navigateTo('/app/profissional/agenda');
                        } else {
                          navigateTo('/app/gerente/dashboard');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-indigo-50/60 font-medium' : ''
                      }`}
                    >
                      <span className="text-slate-900 font-medium">{item.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
            title="Notificações"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Notificações</span>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {unreadCount} novas
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-center text-slate-400">Nenhuma notificação</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                        !n.read ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button (New Appointment or New Tenant) */}
        {isSuperAdminView ? (
          <button
            onClick={() => setIsNewStudioModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Tenant</span>
          </button>
        ) : (
          <button
            onClick={() => setIsNewAppointmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agendar</span>
          </button>
        )}

        {/* Platform CEO / Super Admin Profile Pill */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer text-left"
          >
            {isSuperAdminAuthenticated ? (
              <img
                src={superAdminUser.avatar}
                alt={superAdminUser.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow-2xs"
              />
            ) : currentProfessional?.avatar ? (
              <img
                src={currentProfessional.avatar}
                alt={currentProfessional.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
            )}

            <div className="hidden xl:block">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                {isSuperAdminAuthenticated ? superAdminUser.name : currentProfessional?.name || 'Usuário'}
              </p>
              <p className="text-[10px] text-amber-600 font-semibold truncate">
                {isSuperAdminAuthenticated ? 'CEO da Plataforma' : currentRole}
              </p>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{superAdminUser.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{superAdminUser.email}</p>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                  {superAdminUser.title}
                </span>
              </div>

              <div className="py-1">
                {isSuperAdminAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setIsSuperAdminView(true);
                        navigateTo('/admin/painelmaster');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>Ir para Painel Master Super Admin</span>
                    </button>
                    <button
                      onClick={() => {
                        logoutSuperAdmin();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Encerrar Sessão de Super Admin</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsLoginModalOpen(true);
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Login Super Admin (CEO)</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setSettingsSubTab('disponibilidade');
                    setActiveTab('configuracoes');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Configurar Minha Disponibilidade</span>
                </button>
                <button
                  onClick={() => {
                    navigateTo('/nossos-planos');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Ver Landing Page Pública (/nossos-planos)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
