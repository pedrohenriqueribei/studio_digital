import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Business,
  Professional,
  Service,
  Appointment,
  Client,
  Comanda,
  UserRole,
  AppointmentStatus,
  NotificationItem,
  SaaSPlan,
  TenantStatus,
  PlatformAdminUser,
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_PROFESSIONALS,
  INITIAL_SERVICES,
  INITIAL_APPOINTMENTS,
  INITIAL_CLIENTS,
  INITIAL_COMANDAS,
  INITIAL_NOTIFICATIONS,
  SAAS_PLANS,
  SUPER_ADMIN_CREDENTIALS,
} from '../data/mockData';
import { auth, googleProvider, signInWithPopup, fbSignOut } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export type AppTab =
  | 'dashboard'
  | 'agenda'
  | 'servicos'
  | 'profissionais'
  | 'comandas'
  | 'clientes'
  | 'planos'
  | 'configuracoes';

export type SuperAdminTab = 'tenants' | 'profissionais' | 'planos' | 'metricas';

interface AppContextType {
  // Super Admin / Platform CEO
  superAdminUser: PlatformAdminUser;
  isSuperAdminAuthenticated: boolean;
  loginSuperAdmin: (email: string, pass: string) => boolean;
  logoutSuperAdmin: () => void;
  isSuperAdminView: boolean;
  setIsSuperAdminView: (val: boolean) => void;
  superAdminTab: SuperAdminTab;
  setSuperAdminTab: (tab: SuperAdminTab) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;

  // Firebase integration
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logoutFirebase: () => Promise<void>;

  // Tenants / Businesses
  businesses: Business[];
  currentBusiness: Business | null;
  switchBusiness: (businessId: string) => void;
  registerBusiness: (newBiz: Omit<Business, 'id' | 'status' | 'createdAt'>) => Business;
  updateBusiness: (biz: Business) => void;
  setTenantStatus: (businessId: string, status: TenantStatus) => void;
  changeTenantPlan: (businessId: string, planId: string) => void;
  deleteBusiness: (businessId: string) => void;

  // SaaS Plans Management
  saasPlans: SaaSPlan[];
  addSaasPlan: (plan: Omit<SaaSPlan, 'id'>) => SaaSPlan;
  updateSaasPlan: (plan: SaaSPlan) => void;
  deleteSaasPlan: (planId: string) => void;

  // Tenant Workspace
  currentRole: UserRole;
  currentProfessional: Professional | null;
  switchRole: (role: UserRole, specificProId?: string) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  professionals: Professional[];
  activeProfessionals: Professional[];
  addProfessional: (pro: Omit<Professional, 'id' | 'totalEarningsMonth' | 'appointmentsCountMonth'>) => void;
  updateProfessional: (pro: Professional) => void;
  deleteProfessional: (id: string) => void;

  services: Service[];
  activeServices: Service[];
  addService: (srv: Omit<Service, 'id'>) => void;
  updateService: (srv: Service) => void;
  deleteService: (id: string) => void;

  appointments: Appointment[];
  activeAppointments: Appointment[];
  addAppointment: (app: Omit<Appointment, 'id'>) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointment: (app: Appointment) => void;

  clients: Client[];
  activeClients: Client[];
  addClient: (cli: Omit<Client, 'id' | 'totalVisits' | 'totalSpent'>) => Client;

  comandas: Comanda[];
  activeComandas: Comanda[];
  createOrUpdateComanda: (comanda: Comanda) => void;
  closeComanda: (
    id: string,
    paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro',
    discount?: number
  ) => void;

  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'read' | 'time'>) => void;

  // Search filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Navigation & Routing
  currentPath: string;
  navigateTo: (path: string) => void;
  selectedPlanForCheckout: string | null;
  setSelectedPlanForCheckout: (planId: string | null) => void;

  // Global modals
  isNewAppointmentModalOpen: boolean;
  setIsNewAppointmentModalOpen: (open: boolean) => void;
  isNewStudioModalOpen: boolean;
  setIsNewStudioModalOpen: (open: boolean) => void;
  isPlansModalOpen: boolean;
  setIsPlansModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persistence helpers
  const getStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`studiodigital_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const setStored = (key: string, value: unknown) => {
    try {
      localStorage.setItem(`studiodigital_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  };

  // Super Admin state: Pedro Campos (CEO da Plataforma)
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean>(() =>
    getStored('superAdminAuth', false) // Protected: requires explicit authentication
  );

  // Routing and URL state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [isSuperAdminView, setIsSuperAdminViewState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path === '/admin/painelmaster' || path.startsWith('/admin/painelmaster/')) {
        return true;
      }
    }
    return getStored('superAdminView', false);
  });

  const [activeTab, setActiveTabState] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path.startsWith('/admin/') && path !== '/admin/painelmaster') {
        const sub = path.replace('/admin/', '').split('/')[0] as AppTab;
        const valid: AppTab[] = [
          'dashboard',
          'agenda',
          'servicos',
          'profissionais',
          'comandas',
          'clientes',
          'planos',
          'configuracoes',
        ];
        if (valid.includes(sub)) return sub;
      }
    }
    return 'dashboard';
  });

  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('tenants');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<string | null>(null);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname || '/';
      setCurrentPath(newPath);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Bi-directional synchronization between currentPath and state
  useEffect(() => {
    if (!currentPath) return;

    if (currentPath === '/admin/painelmaster' || currentPath.startsWith('/admin/painelmaster/')) {
      setIsSuperAdminViewState(true);
      setStored('superAdminView', true);
    } else if (currentPath.startsWith('/admin/')) {
      const tabName = currentPath.replace('/admin/', '').split('/')[0] as AppTab;
      const validTabs: AppTab[] = [
        'dashboard',
        'agenda',
        'servicos',
        'profissionais',
        'comandas',
        'clientes',
        'planos',
        'configuracoes',
      ];
      if (validTabs.includes(tabName)) {
        setActiveTabState(tabName);
        setIsSuperAdminViewState(false);
        setStored('superAdminView', false);
      }
    } else if (currentPath === '/admin' || currentPath === '/admin/') {
      navigateTo('/admin/painelmaster');
    }
  }, [currentPath]);

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    setIsSuperAdminViewState(false);
    setStored('superAdminView', false);
    navigateTo(`/admin/${tab}`);
  };

  const setIsSuperAdminView = (val: boolean) => {
    setIsSuperAdminViewState(val);
    setStored('superAdminView', val);
    const target = val ? '/admin/painelmaster' : `/admin/${activeTab}`;
    navigateTo(target);
  };

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && user.email?.toLowerCase() === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
        setIsSuperAdminAuthenticated(true);
        setStored('superAdminAuth', true);
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setIsSuperAdminAuthenticated(true);
      setStored('superAdminAuth', true);
      if (res.user.email?.toLowerCase() === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
        setIsSuperAdminViewState(true);
        setStored('superAdminView', true);
        addNotification({
          title: 'Google Login Autorizado!',
          message: `Conectado como ${res.user.displayName || res.user.email} (CEO da Plataforma).`,
          type: 'system',
        });
      } else {
        addNotification({
          title: 'Conectado com Google',
          message: `Login realizado com sucesso: ${res.user.email}.`,
          type: 'system',
        });
      }
      if (
        !currentPath.startsWith('/admin/') ||
        currentPath === '/admin' ||
        currentPath === '/admin/' ||
        currentPath === '/'
      ) {
        navigateTo('/admin/painelmaster');
      }
      return true;
    } catch (e: any) {
      console.warn('Firebase Google Auth:', e);
      addNotification({
        title: 'Login Google',
        message: e?.message || 'Falha ao autenticar com Google.',
        type: 'system',
      });
      return false;
    }
  };

  const logoutFirebase = async () => {
    try {
      await fbSignOut(auth);
      setFirebaseUser(null);
    } catch (e) {
      console.warn(e);
    }
  };

  const superAdminUser: PlatformAdminUser = {
    id: 'user_pedro_campos',
    name: firebaseUser?.displayName || SUPER_ADMIN_CREDENTIALS.name,
    email: firebaseUser?.email || SUPER_ADMIN_CREDENTIALS.email,
    role: 'superadmin',
    title: SUPER_ADMIN_CREDENTIALS.title,
    avatar: firebaseUser?.photoURL || SUPER_ADMIN_CREDENTIALS.avatar,
    authenticated: isSuperAdminAuthenticated,
  };

  const loginSuperAdmin = (email: string, pass: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (
      cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase() &&
      cleanPass === SUPER_ADMIN_CREDENTIALS.password
    ) {
      setIsSuperAdminAuthenticated(true);
      setStored('superAdminAuth', true);

      addNotification({
        title: 'Bem-vindo Pedro Campos!',
        message: 'Acesso master autenticado como CEO da plataforma Studio Digital.',
        type: 'system',
      });
      if (
        !currentPath.startsWith('/admin/') ||
        currentPath === '/admin' ||
        currentPath === '/admin/' ||
        currentPath === '/'
      ) {
        setIsSuperAdminViewState(true);
        setStored('superAdminView', true);
        navigateTo('/admin/painelmaster');
      }
      return true;
    }
    return false;
  };

  const logoutSuperAdmin = () => {
    logoutFirebase();
    setIsSuperAdminAuthenticated(false);
    setIsSuperAdminViewState(false);
    setStored('superAdminAuth', false);
    setStored('superAdminView', false);
    navigateTo('/');
  };

  // SaaS Plans state
  const [saasPlans, setSaasPlans] = useState<SaaSPlan[]>(() =>
    getStored('saasPlans', SAAS_PLANS)
  );

  // Businesses / Tenants (purged from legacy mock entries)
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const stored = getStored<Business[]>('businesses', INITIAL_BUSINESSES);
    return stored.filter(
      (b) =>
        b.id !== 'biz_estetica' &&
        b.id !== 'biz_barbearia' &&
        b.id !== 'biz_salao'
    );
  });
  const [currentBusinessId, setCurrentBusinessId] = useState<string>(() =>
    getStored('currentBizId', '')
  );

  const [currentRole, setCurrentRole] = useState<UserRole>(() =>
    getStored('currentRole', 'ceo')
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    getStored('sidebarCollapsed', false)
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [professionals, setProfessionals] = useState<Professional[]>(() => {
    const stored = getStored<Professional[]>('professionals', INITIAL_PROFESSIONALS);
    return stored.filter(
      (p) =>
        p.businessId !== 'biz_estetica' &&
        p.businessId !== 'biz_barbearia' &&
        p.businessId !== 'biz_salao'
    );
  });
  const [services, setServices] = useState<Service[]>(() => {
    const stored = getStored<Service[]>('services', INITIAL_SERVICES);
    return stored.filter(
      (s) =>
        s.businessId !== 'biz_estetica' &&
        s.businessId !== 'biz_barbearia' &&
        s.businessId !== 'biz_salao'
    );
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const stored = getStored<Appointment[]>('appointments', INITIAL_APPOINTMENTS);
    return stored.filter(
      (a) =>
        a.businessId !== 'biz_estetica' &&
        a.businessId !== 'biz_barbearia' &&
        a.businessId !== 'biz_salao'
    );
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const stored = getStored<Client[]>('clients', INITIAL_CLIENTS);
    return stored.filter(
      (c) =>
        c.businessId !== 'biz_estetica' &&
        c.businessId !== 'biz_barbearia' &&
        c.businessId !== 'biz_salao'
    );
  });
  const [comandas, setComandas] = useState<Comanda[]>(() => {
    const stored = getStored<Comanda[]>('comandas', INITIAL_COMANDAS);
    return stored.filter(
      (c) =>
        c.businessId !== 'biz_estetica' &&
        c.businessId !== 'biz_barbearia' &&
        c.businessId !== 'biz_salao'
    );
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    getStored('notifications', INITIAL_NOTIFICATIONS)
  );

  // Global modals
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isNewStudioModalOpen, setIsNewStudioModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  // Sync to storage
  useEffect(() => setStored('superAdminAuth', isSuperAdminAuthenticated), [isSuperAdminAuthenticated]);
  useEffect(() => setStored('superAdminView', isSuperAdminView), [isSuperAdminView]);
  useEffect(() => setStored('saasPlans', saasPlans), [saasPlans]);
  useEffect(() => setStored('businesses', businesses), [businesses]);
  useEffect(() => setStored('currentBizId', currentBusinessId), [currentBusinessId]);
  useEffect(() => setStored('currentRole', currentRole), [currentRole]);
  useEffect(() => setStored('sidebarCollapsed', sidebarCollapsed), [sidebarCollapsed]);
  useEffect(() => setStored('professionals', professionals), [professionals]);
  useEffect(() => setStored('services', services), [services]);
  useEffect(() => setStored('appointments', appointments), [appointments]);
  useEffect(() => setStored('clients', clients), [clients]);
  useEffect(() => setStored('comandas', comandas), [comandas]);
  useEffect(() => setStored('notifications', notifications), [notifications]);

  const currentBusiness: Business | null =
    businesses.find((b) => b.id === currentBusinessId) || businesses[0] || null;

  const activeProfessionals = currentBusiness
    ? professionals.filter((p) => p.businessId === currentBusiness.id)
    : [];

  // Current logged in professional representation based on role
  const [currentProId, setCurrentProId] = useState<string>('');

  useEffect(() => {
    if (!currentBusiness) {
      setCurrentProId('');
      return;
    }
    const matching = activeProfessionals.find((p) => p.role === currentRole);
    if (matching) {
      setCurrentProId(matching.id);
    } else if (activeProfessionals.length > 0) {
      setCurrentProId(activeProfessionals[0].id);
    } else {
      setCurrentProId('');
    }
  }, [currentBusiness?.id, currentRole, activeProfessionals.length]);

  const currentProfessional =
    activeProfessionals.find((p) => p.id === currentProId) ||
    activeProfessionals[0] ||
    null;

  const activeServices = currentBusiness
    ? services.filter((s) => s.businessId === currentBusiness.id)
    : [];
  const activeAppointments = currentBusiness
    ? appointments.filter((a) => a.businessId === currentBusiness.id)
    : [];
  const activeClients = currentBusiness
    ? clients.filter((c) => c.businessId === currentBusiness.id)
    : [];
  const activeComandas = currentBusiness
    ? comandas.filter((c) => c.businessId === currentBusiness.id)
    : [];

  const switchBusiness = (businessId: string) => {
    setCurrentBusinessId(businessId);
    setStored('currentBizId', businessId);
    setIsSuperAdminView(false); // Entering the tenant dashboard
    navigateTo('/admin/dashboard');
  };

  const registerBusiness = (newBiz: Omit<Business, 'id' | 'status' | 'createdAt'>): Business => {
    const id = `biz_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const created: Business = {
      ...newBiz,
      id,
      status: 'ativo',
      createdAt: today,
      monthlyRevenue: 0,
    };
    setBusinesses((prev) => [created, ...prev]);
    setCurrentBusinessId(id);

    // Seed default owner professional for this new business
    const defaultOwner: Professional = {
      id: `pro_${Date.now()}`,
      businessId: id,
      name: `Gestor(a) - ${newBiz.name}`,
      email: `contato@${newBiz.name.toLowerCase().replace(/\s+/g, '')}.com.br`,
      phone: newBiz.phone,
      role: 'ceo',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
      specialties: ['Gestão Estratégica', 'Atendimento'],
      commissionPercentage: 50,
      active: true,
      workHours: { start: '09:00', end: '19:00', daysOfWeek: [1, 2, 3, 4, 5, 6] },
      totalEarningsMonth: 0,
      appointmentsCountMonth: 0,
    };
    setProfessionals((prev) => [...prev, defaultOwner]);

    // Add default initial service
    const defaultServices: Service[] = [
      {
        id: `srv_${Date.now()}_1`,
        businessId: id,
        name: newBiz.type === 'barbearia' ? 'Corte Clássico' : newBiz.type === 'clinica_estetica' ? 'Limpeza de Pele Essencial' : 'Corte & Escova Modeladora',
        category: 'Principal',
        durationMinutes: 45,
        price: newBiz.type === 'barbearia' ? 70 : newBiz.type === 'clinica_estetica' ? 220 : 150,
        commissionPercentage: 50,
        description: 'Serviço padrão de alta satisfação.',
        allowedProfessionalIds: [defaultOwner.id],
        active: true,
      },
    ];
    setServices((prev) => [...prev, ...defaultServices]);

    setIsSuperAdminAuthenticated(true);
    setStored('superAdminAuth', true);

    addNotification({
      title: 'Tenant cadastrado com sucesso!',
      message: `${newBiz.name} foi adicionado à plataforma no plano ${newBiz.planId.toUpperCase()}.`,
      type: 'system',
    });

    return created;
  };

  const updateBusiness = (biz: Business) => {
    setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? biz : b)));
    addNotification({
      title: 'Estabelecimento atualizado',
      message: `Dados de ${biz.tradeName} foram alterados pelo Super Admin.`,
      type: 'system',
    });
  };

  const setTenantStatus = (businessId: string, status: TenantStatus) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, status } : b))
    );
    const target = businesses.find((b) => b.id === businessId);
    addNotification({
      title: 'Status do Tenant alterado',
      message: `${target?.tradeName || 'Tenant'} agora está: ${status.toUpperCase()}.`,
      type: 'system',
    });
  };

  const changeTenantPlan = (businessId: string, planId: string) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, planId } : b))
    );
    const target = businesses.find((b) => b.id === businessId);
    addNotification({
      title: 'Plano do Tenant atualizado',
      message: `${target?.tradeName || 'Tenant'} migrado para o plano ${planId.toUpperCase()}.`,
      type: 'system',
    });
  };

  const deleteBusiness = (businessId: string) => {
    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    // Clean related
    setProfessionals((prev) => prev.filter((p) => p.businessId !== businessId));
    setServices((prev) => prev.filter((s) => s.businessId !== businessId));
    setAppointments((prev) => prev.filter((a) => a.businessId !== businessId));
    setComandas((prev) => prev.filter((c) => c.businessId !== businessId));
    setClients((prev) => prev.filter((c) => c.businessId !== businessId));

    if (currentBusinessId === businessId) {
      const remaining = businesses.filter((b) => b.id !== businessId);
      if (remaining.length > 0) {
        setCurrentBusinessId(remaining[0].id);
      }
    }
  };

  // SaaS Plans CRUD
  const addSaasPlan = (plan: Omit<SaaSPlan, 'id'>): SaaSPlan => {
    const id = `plan_${Date.now()}`;
    const newPlan: SaaSPlan = { ...plan, id, active: true };
    setSaasPlans((prev) => [...prev, newPlan]);
    addNotification({
      title: 'Novo Plano SaaS criado',
      message: `Plano ${plan.name} cadastrado com valor de R$ ${plan.priceMonthly}/mês.`,
      type: 'system',
    });
    return newPlan;
  };

  const updateSaasPlan = (plan: SaaSPlan) => {
    setSaasPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
    addNotification({
      title: 'Plano SaaS atualizado',
      message: `Valores e limites do plano ${plan.name} foram atualizados.`,
      type: 'system',
    });
  };

  const deleteSaasPlan = (planId: string) => {
    setSaasPlans((prev) => prev.filter((p) => p.id !== planId));
    addNotification({
      title: 'Plano SaaS removido',
      message: `O plano foi desativado da plataforma.`,
      type: 'system',
    });
  };

  const switchRole = (role: UserRole, specificProId?: string) => {
    setCurrentRole(role);
    if (specificProId) {
      setCurrentProId(specificProId);
    } else {
      const match = activeProfessionals.find((p) => p.role === role);
      if (match) setCurrentProId(match.id);
    }
  };

  const addAppointment = (app: Omit<Appointment, 'id'>) => {
    const id = `app_${Date.now()}`;
    const newAppointment: Appointment = { ...app, id };
    setAppointments((prev) => [newAppointment, ...prev]);

    const newComanda: Comanda = {
      id: `cmd_${Date.now()}`,
      businessId: app.businessId,
      appointmentId: id,
      clientName: app.clientName,
      clientPhone: app.clientPhone,
      professionalId: app.professionalId,
      professionalName:
        professionals.find((p) => p.id === app.professionalId)?.name || 'Profissional',
      items: [
        {
          id: `item_${Date.now()}`,
          name: app.serviceName,
          type: 'servico',
          price: app.price,
          quantity: 1,
        },
      ],
      subtotal: app.price,
      discount: 0,
      total: app.price,
      status: 'aberta',
      createdAt: `${app.date} ${app.startTime}`,
    };
    setComandas((prev) => [newComanda, ...prev]);

    setClients((prev) =>
      prev.map((c) =>
        c.id === app.clientId
          ? {
              ...c,
              totalVisits: c.totalVisits + 1,
              lastVisit: app.date,
            }
          : c
      )
    );

    addNotification({
      title: 'Agendamento confirmado',
      message: `${app.clientName} com ${newComanda.professionalName} às ${app.startTime}.`,
      type: 'booking',
    });
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    if (status === 'concluido') {
      setComandas((prev) =>
        prev.map((c) =>
          c.appointmentId === id && c.status === 'aberta'
            ? { ...c, total: c.subtotal - c.discount }
            : c
        )
      );
    }
  };

  const updateAppointment = (app: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === app.id ? app : a)));
  };

  const addService = (srv: Omit<Service, 'id'>) => {
    const id = `srv_${Date.now()}`;
    setServices((prev) => [...prev, { ...srv, id }]);
    addNotification({
      title: 'Serviço cadastrado',
      message: `${srv.name} adicionado com valor de R$ ${srv.price.toFixed(2)}.`,
      type: 'system',
    });
  };

  const updateService = (srv: Service) => {
    setServices((prev) => prev.map((s) => (s.id === srv.id ? srv : s)));
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const addProfessional = (
    pro: Omit<Professional, 'id' | 'totalEarningsMonth' | 'appointmentsCountMonth'>
  ) => {
    const id = `pro_${Date.now()}`;
    const newPro: Professional = {
      ...pro,
      id,
      totalEarningsMonth: 0,
      appointmentsCountMonth: 0,
    };
    setProfessionals((prev) => [...prev, newPro]);
    addNotification({
      title: 'Novo membro na equipe',
      message: `${pro.name} foi cadastrado(a) em ${businesses.find((b) => b.id === pro.businessId)?.tradeName || 'Studio'}.`,
      type: 'system',
    });
  };

  const updateProfessional = (pro: Professional) => {
    setProfessionals((prev) => prev.map((p) => (p.id === pro.id ? pro : p)));
  };

  const deleteProfessional = (id: string) => {
    setProfessionals((prev) => prev.filter((p) => p.id !== id));
  };

  const addClient = (cli: Omit<Client, 'id' | 'totalVisits' | 'totalSpent'>): Client => {
    const id = `cli_${Date.now()}`;
    const newClient: Client = {
      ...cli,
      id,
      totalVisits: 0,
      totalSpent: 0,
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const createOrUpdateComanda = (comanda: Comanda) => {
    setComandas((prev) => {
      const idx = prev.findIndex((c) => c.id === comanda.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = comanda;
        return copy;
      }
      return [comanda, ...prev];
    });
  };

  const closeComanda = (
    id: string,
    paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro',
    discount: number = 0
  ) => {
    const now = new Date();
    const closedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setComandas((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const finalTotal = Math.max(0, c.subtotal - discount);
          return {
            ...c,
            discount,
            total: finalTotal,
            paymentMethod,
            status: 'fechada',
            closedAt: `${now.toISOString().split('T')[0]} ${closedTime}`,
          };
        }
        return c;
      })
    );

    const targetComanda = comandas.find((c) => c.id === id);
    if (targetComanda?.appointmentId) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === targetComanda.appointmentId
            ? { ...a, status: 'concluido', paymentStatus: 'pago' }
            : a
        )
      );
    }

    addNotification({
      title: 'Comanda recebida',
      message: `Recebimento de R$ ${(targetComanda?.total || 0).toFixed(2)} via ${paymentMethod.toUpperCase()} confirmado.`,
      type: 'payment',
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const addNotification = (item: Omit<NotificationItem, 'id' | 'read' | 'time'>) => {
    const newItem: NotificationItem = {
      ...item,
      id: `notif_${Date.now()}`,
      read: false,
      time: 'Agora',
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        superAdminUser,
        isSuperAdminAuthenticated,
        loginSuperAdmin,
        logoutSuperAdmin,
        isSuperAdminView,
        setIsSuperAdminView,
        superAdminTab,
        setSuperAdminTab,
        isLoginModalOpen,
        setIsLoginModalOpen,

        firebaseUser,
        isFirebaseConnected,
        loginWithGoogle,
        logoutFirebase,

        businesses,
        currentBusiness,
        switchBusiness,
        registerBusiness,
        updateBusiness,
        setTenantStatus,
        changeTenantPlan,
        deleteBusiness,

        saasPlans,
        addSaasPlan,
        updateSaasPlan,
        deleteSaasPlan,

        currentRole,
        currentProfessional,
        switchRole,
        sidebarCollapsed,
        setSidebarCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        activeTab,
        setActiveTab,

        professionals,
        activeProfessionals,
        addProfessional,
        updateProfessional,
        deleteProfessional,

        services,
        activeServices,
        addService,
        updateService,
        deleteService,

        appointments,
        activeAppointments,
        addAppointment,
        updateAppointmentStatus,
        updateAppointment,

        clients,
        activeClients,
        addClient,

        comandas,
        activeComandas,
        createOrUpdateComanda,
        closeComanda,

        notifications,
        markNotificationRead,
        addNotification,

        searchQuery,
        setSearchQuery,

        // Routing & Landing
        currentPath,
        navigateTo,
        selectedPlanForCheckout,
        setSelectedPlanForCheckout,

        isNewAppointmentModalOpen,
        setIsNewAppointmentModalOpen,
        isNewStudioModalOpen,
        setIsNewStudioModalOpen,
        isPlansModalOpen,
        setIsPlansModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
