import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Plus,
  ChevronDown,
  Building2,
  Shield,
  Check,
  User,
  LogOut,
  Sparkles,
  Lock,
  Menu,
  Clock,
  X,
  ExternalLink,
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
    logoutAll,
    isAuthenticated,
    activeClaims,
    userRole,
    currentClient,
    navigateTo,
    setIsMobileMenuOpen,
  } = useApp();

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const unitRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (unitRef.current && !unitRef.current.contains(target)) {
        setIsUnitDropdownOpen(false);
      }
      if (roleRef.current && !roleRef.current.contains(target)) {
        setIsRoleDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus mobile search when expanded
  useEffect(() => {
    if (isMobileSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobileSearchExpanded]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 w-full h-14 sm:h-16 px-2.5 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all">
      {/* Mobile Expanded Search Bar View (when user taps search on mobile) */}
      {isMobileSearchExpanded ? (
        <div className="h-full flex items-center gap-2 animate-in fade-in duration-150">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isSuperAdminView
                  ? 'Buscar tenants, planos, equipe...'
                  : 'Buscar agendamentos, clientes, serviços...'
              }
              className="w-full h-10 pl-9 pr-8 bg-slate-100/80 focus:bg-white text-xs text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="min-h-[44px] min-w-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsMobileSearchExpanded(false);
              setSearchQuery('');
            }}
            className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      ) : (
        /* Normal Header Navigation Bar (One-row, 3-zone architecture) */
        <div className="h-full flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Zone 1: Mobile Hamburger, Brand & Context Selector */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {/* Mobile Drawer Trigger (min 44x44px touch target) */}
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shrink-0"
              aria-label="Abrir menu de navegação"
              title="Menu principal"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name (visible when space permits) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight hidden lg:inline">
                Studio Digital
              </span>
            </div>

            {/* Context Display / Tenant Unit Switcher */}
            {isSuperAdminView ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 font-bold text-xs truncate">
                  <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Painel Master</span>
                </span>
                <span className="text-[11px] text-slate-500 hidden xl:inline font-mono">
                  ({businesses.length} tenants)
                </span>
              </div>
            ) : (
              <div className="relative min-w-0" ref={unitRef}>
                <button
                  onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                  className="min-h-[44px] max-w-[145px] xs:max-w-[180px] sm:max-w-[220px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 text-xs font-semibold text-slate-800 transition-all cursor-pointer active:scale-98"
                  aria-label="Alternar estabelecimento"
                  title={currentBusiness?.tradeName || 'Estabelecimento'}
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate text-left">
                    {currentBusiness ? currentBusiness.tradeName : 'Selecionar Studio'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Popover */}
                {isUnitDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Alternar Estabelecimento
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {businesses.map((biz) => {
                        const isSelected = currentBusiness ? biz.id === currentBusiness.id : false;
                        return (
                          <button
                            key={biz.id}
                            onClick={() => {
                              switchBusiness(biz.id);
                              setIsUnitDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer min-h-[44px] ${
                              isSelected ? 'bg-slate-50/80 font-bold text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="truncate font-semibold text-slate-900">{biz.tradeName}</span>
                              <span className="text-[11px] text-slate-400 truncate">
                                {biz.city || 'Matriz'}
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1.5 px-2">
                      <button
                        onClick={() => {
                          setIsUnitDropdownOpen(false);
                          setIsNewStudioModalOpen(true);
                        }}
                        className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50/80 rounded-xl transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Cadastrar Novo Studio</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zone 2: Desktop Search & Quick Filter */}
          <div className="flex-1 max-w-xs md:max-w-md hidden md:block">
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
                className="w-full pl-9 pr-8 py-2 bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Limpar"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Zone 3: Mobile Search Trigger, Quick Action CTA, Notifications & User */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mobile Search Icon Button (min 44x44px touch target) */}
            <button
              onClick={() => setIsMobileSearchExpanded(true)}
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              aria-label="Abrir busca"
              title="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Action Primary Button */}
            {isSuperAdminView ? (
              <button
                onClick={() => setIsNewStudioModalOpen(true)}
                className="min-h-[44px] px-3 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Cadastrar Novo Tenant"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Novo Tenant</span>
              </button>
            ) : (
              <button
                onClick={() => setIsNewAppointmentModalOpen(true)}
                className="min-h-[44px] px-3 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Novo Agendamento"
              >
                <Plus className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="hidden xs:inline">Agendar</span>
              </button>
            )}

            {/* Tenant Role Switcher (Hidden on narrow mobile, available in drawer/profile) */}
            {!isSuperAdminView && (
              <div className="relative hidden lg:block" ref={roleRef}>
                <button
                  onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                  className="min-h-[44px] flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer"
                  title="Mudar papel de usuário para testar permissões"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block leading-tight">Papel:</span>
                    <span className="font-semibold text-slate-900 leading-tight">
                      {currentRole === 'ceo' ? 'CEO' : currentRole === 'gerente' ? 'Gerente' : 'Profissional'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Alternar Papel (RBAC)
                    </div>
                    {[
                      { id: 'gerente', label: 'Gerente do Studio (/app/gerente)' },
                      { id: 'profissional', label: 'Profissional (/app/profissional)' },
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
                          className={`w-full min-h-[44px] text-left px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50/60 font-semibold text-indigo-950' : 'text-slate-700'
                          }`}
                        >
                          <span>{item.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Popover (min 44x44px touch target) */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer relative"
                title="Notificações"
                aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lidas)` : ''}`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Notificações</span>
                    <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {unreadCount} novas
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-xs text-center text-slate-400">Nenhuma notificação</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                            !n.read ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar / Context Menu (min 44x44px touch target) */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl p-1 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer text-left"
                aria-label="Abrir menu de perfil de usuário"
              >
                {isSuperAdminAuthenticated ? (
                  <img
                    src={superAdminUser.avatar}
                    alt={superAdminUser.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow-2xs"
                  />
                ) : currentClient?.photoURL ? (
                  <img
                    src={currentClient.photoURL}
                    alt={currentClient.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                  />
                ) : currentProfessional?.avatar ? (
                  <img
                    src={currentProfessional.avatar}
                    alt={currentProfessional.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {isSuperAdminAuthenticated
                        ? superAdminUser.name
                        : currentClient?.name ||
                          activeClaims?.name ||
                          currentBusiness?.managerName ||
                          currentProfessional?.name ||
                          'Usuário'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {isSuperAdminAuthenticated
                        ? superAdminUser.email
                        : currentClient?.email ||
                          activeClaims?.email ||
                          currentBusiness?.managerEmail ||
                          currentProfessional?.email ||
                          ''}
                    </p>
                    <div className="mt-1.5">
                      <span className="text-[10px] font-bold text-slate-600">
                        {isSuperAdminAuthenticated
                          ? 'CEO Master da Plataforma'
                          : userRole === 'client' || currentRole === 'client'
                          ? 'Cliente Cadastrado'
                          : userRole === 'professional'
                          ? 'Profissional Credenciado'
                          : `Gerente · ${currentBusiness?.tradeName || 'Studio'}`}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {(userRole === 'client' || currentRole === 'client') && (
                      <button
                        onClick={() => {
                          navigateTo('/app/cliente');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Minha Área de Cliente (/app/cliente)</span>
                      </button>
                    )}

                    {isSuperAdminAuthenticated && (
                      <button
                        onClick={() => {
                          setIsSuperAdminView(true);
                          navigateTo('/admin/painelmaster');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-amber-600" />
                        <span>Painel Master Super Admin</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSettingsSubTab('disponibilidade');
                        setActiveTab('configuracoes');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Horários & Disponibilidade</span>
                    </button>

                    <button
                      onClick={() => {
                        navigateTo('/nossos-planos');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Ver Planos SaaS Públicos</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    {isAuthenticated ? (
                      <button
                        onClick={() => {
                          logoutAll();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Encerrar Sessão</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsLoginModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-indigo-500" />
                        <span>Fazer Login</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
