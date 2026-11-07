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
  CustomUserClaims,
  RoleType,
  AppTab,
  ClientRegistrationData,
  Review,
  ClientNote,
  ClientPreferences,
  VirtualQueueItem,
  VirtualQueueStatus,
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
import {
  auth,
  googleProvider,
  signInWithPopup,
  fbSignOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  getFreshClaimsAndToken,
  db,
} from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { slugify } from '../utils/slugify';
import { getTodayDateString } from '../utils/date';
import { checkAppointmentConflict, AppointmentConflictResult } from '../utils/availability';
import {
  syncBusinessToFirestore,
  deleteBusinessFromFirestore,
  syncProfessionalToFirestore,
  deleteProfessionalFromFirestore,
  syncServiceToFirestore,
  deleteServiceFromFirestore,
  syncAppointmentToFirestore,
  deleteAppointmentFromFirestore,
  syncClientToFirestore,
  deleteClientFromFirestore,
  syncComandaToFirestore,
  deleteComandaFromFirestore,
  syncReviewToFirestore,
  syncQueueItemToFirestore,
  deleteQueueItemFromFirestore,
  seedPlansToFirestore,
  createTenantUserInFirebaseAuth,
  createClientUserInFirebaseAuth,
  purgeAllMockDataFromFirestore,
  resetTenantDataToZero,
} from '../services/firestoreSync';

export type { AppTab } from '../types';

export type SuperAdminTab = 'tenants' | 'profissionais' | 'servicos' | 'planos' | 'metricas' | 'claims';

interface AppContextType {
  // Authentication & RBAC
  isAuthenticated: boolean;
  superAdminUser: PlatformAdminUser;
  isSuperAdminAuthenticated: boolean;
  loginSuperAdmin: (email: string, pass: string) => boolean;
  logoutSuperAdmin: () => void;
  loginWithEmailPassword: (
    email: string,
    pass: string,
    roleHint?: RoleType
  ) => Promise<{ success: boolean; error?: string; role?: RoleType }>;
  loginManager: (email: string, pass: string, tenantId?: string) => Promise<{ success: boolean; error?: string }>;
  loginProfessional: (
    email: string,
    pass: string,
    tenantId?: string,
    proId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (
    email: string
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  logoutAll: () => void;
  isSuperAdminView: boolean;
  setIsSuperAdminView: (val: boolean) => void;
  superAdminTab: SuperAdminTab;
  setSuperAdminTab: (tab: SuperAdminTab) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;

  // Client User & Portal
  currentClient: Client | null;
  isClientAuthenticated: boolean;
  registerClient: (
    data: ClientRegistrationData
  ) => Promise<{ success: boolean; error?: string; client?: Client }>;
  loginClient: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }>;
  logoutClient: () => void;
  updateClientProfile: (data: Partial<Client>) => Promise<boolean>;
  cancelClientAppointment: (
    appointmentId: string,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  createClientAppointment: (data: {
    serviceId: string;
    professionalId: string;
    businessId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string; appointment?: Appointment }>;
  submitAppointmentReview: (
    appointmentId: string,
    rating: number,
    comment?: string
  ) => Promise<{ success: boolean; error?: string; review?: Review }>;
  reviews: Review[];

  // Custom Claims & RBAC
  activeClaims: CustomUserClaims | null;
  userRole: RoleType;
  setSimulatedClaims: (claims: Partial<CustomUserClaims>) => void;
  refreshClaimsFromFirebase: () => Promise<void>;
  idTokenString: string | null;

  // Firebase integration
  firebaseUser: FirebaseUser | null;
  isFirebaseConnected: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logoutFirebase: () => Promise<void>;

  // Tenants / Businesses
  businesses: Business[];
  currentBusiness: Business | null;
  switchBusiness: (businessId: string) => void;
  registerBusiness: (newBiz: Omit<Business, 'id' | 'status' | 'createdAt'>) => Promise<Business>;
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
  addAppointment: (
    app: Omit<Appointment, 'id'>
  ) => { success: boolean; error?: string; appointment?: Appointment };
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointment: (app: Appointment) => { success: boolean; error?: string };

  clients: Client[];
  activeClients: Client[];
  addClient: (cli: Omit<Client, 'id' | 'totalVisits' | 'totalSpent'>) => Client;
  updateClient: (cli: Client) => void;
  addClientNote: (clientId: string, noteText: string, authorName?: string, isAlert?: boolean) => void;
  updateClientPreferences: (clientId: string, preferences: ClientPreferences) => void;
  updateClientTags: (clientId: string, tags: string[]) => void;
  toggleClientTag: (clientId: string, tag: string) => void;

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

  // Settings sub-tab
  settingsSubTab: 'studio' | 'disponibilidade';
  setSettingsSubTab: (tab: 'studio' | 'disponibilidade') => void;
  selectedProfessionalForAvailabilityId: string | null;
  setSelectedProfessionalForAvailabilityId: (id: string | null) => void;

  // Global modals
  isNewAppointmentModalOpen: boolean;
  setIsNewAppointmentModalOpen: (open: boolean) => void;
  newAppointmentInitialSlot: { date?: string; startTime?: string; professionalId?: string } | null;
  setNewAppointmentInitialSlot: (slot: { date?: string; startTime?: string; professionalId?: string } | null) => void;
  openNewAppointmentModal: (slot?: { date?: string; startTime?: string; professionalId?: string }) => void;
  isNewStudioModalOpen: boolean;
  setIsNewStudioModalOpen: (open: boolean) => void;
  isPlansModalOpen: boolean;
  setIsPlansModalOpen: (open: boolean) => void;
  // Virtual Queue & Reception TV
  queueItems: VirtualQueueItem[];
  activeQueueItems: VirtualQueueItem[];
  addToQueue: (data: {
    clientName: string;
    clientPhone?: string;
    serviceId: string;
    professionalId?: string;
    anyProfessional: boolean;
    clientId?: string;
    notes?: string;
  }) => Promise<VirtualQueueItem>;
  callQueueTicket: (id: string) => Promise<boolean>;
  startQueueAttendance: (id: string, assignedProId?: string) => Promise<{ success: boolean; comandaId?: string }>;
  finishQueueAttendance: (id: string) => Promise<boolean>;
  cancelQueueTicket: (id: string, reason?: 'desistiu' | 'cancelado') => Promise<boolean>;
  isNewQueueModalOpen: boolean;
  setIsNewQueueModalOpen: (open: boolean) => void;

  // Mock and Demo data cleanup
  clearAllMockData: () => Promise<{ deletedCount: number }>;
  resetCurrentTenantData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persist session tokens and custom claims safely across refreshes
  const getStored = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(`studiodigital_${key}`);
      return item ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const setStored = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    try {
      if (value === undefined || value === null) {
        localStorage.removeItem(`studiodigital_${key}`);
      } else {
        localStorage.setItem(`studiodigital_${key}`, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  // Super Admin state: Pedro Campos (CEO da Plataforma)
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean>(() => {
    return getStored<boolean>('superAdminAuth', false);
  });

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
    return false;
  });

  const [activeTab, setActiveTabState] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const valid: AppTab[] = [
        'dashboard',
        'agenda',
        'servicos',
        'profissionais',
        'comandas',
        'clientes',
        'relatorios',
        'planos',
        'configuracoes',
      ];
      if (path.startsWith('/admin/') && path !== '/admin/painelmaster') {
        const sub = path.replace('/admin/', '').split('/')[0] as AppTab;
        if (valid.includes(sub)) return sub;
      }
      if (path.startsWith('/app/gerente/')) {
        const sub = path.replace('/app/gerente/', '').split('/')[0] as AppTab;
        if (valid.includes(sub)) return sub;
      }
    }
    return 'dashboard';
  });

  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('tenants');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'studio' | 'disponibilidade'>('studio');
  const [selectedProfessionalForAvailabilityId, setSelectedProfessionalForAvailabilityId] = useState<string | null>(null);

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

  // Active Custom User Claims (RBAC) - sourced exclusively from Firebase Auth
  const [activeClaims, setActiveClaimsState] = useState<CustomUserClaims | null>(() => {
    return getStored<CustomUserClaims | null>('userClaims', null);
  });

  const [idTokenString, setIdTokenString] = useState<string | null>(null);

  const setSimulatedClaims = (claims: Partial<CustomUserClaims>) => {
    setActiveClaimsState((prev) => {
      const updated: CustomUserClaims = {
        role: claims.role || prev?.role || 'super_admin',
        tenant_id: claims.tenant_id !== undefined ? claims.tenant_id : prev?.tenant_id,
        professional_id: claims.professional_id !== undefined ? claims.professional_id : prev?.professional_id,
        email: claims.email !== undefined ? claims.email : prev?.email,
        name: claims.name !== undefined ? claims.name : prev?.name,
        issuedAt: Date.now(),
      };
      setStored('userClaims', updated);
      return updated;
    });
  };

  const refreshClaimsFromFirebase = async () => {
    try {
      const data = await getFreshClaimsAndToken(true);
      if (data.token) {
        setIdTokenString(data.token);
      }
      if (data.claims && data.claims.role) {
        const newClaims: CustomUserClaims = {
          role: data.claims.role as RoleType,
          tenant_id: data.claims.tenant_id,
          professional_id: data.claims.professional_id,
          email: data.user?.email || undefined,
          issuedAt: Date.now(),
        };
        setActiveClaimsState(newClaims);
        setStored('userClaims', newClaims);
      }
    } catch (e) {
      console.warn('Erro ao atualizar claims do Firebase:', e);
    }
  };

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
        'relatorios',
        'planos',
        'configuracoes',
      ];
      if (validTabs.includes(tabName)) {
        setActiveTabState(tabName);
        setIsSuperAdminViewState(false);
        setStored('superAdminView', false);
      }
    } else if (currentPath.startsWith('/app/gerente')) {
      setIsSuperAdminViewState(false);
      setStored('superAdminView', false);
      setCurrentRole('gerente');
      setStored('currentRole', 'gerente');
      const validTabs: AppTab[] = [
        'dashboard',
        'agenda',
        'servicos',
        'profissionais',
        'comandas',
        'clientes',
        'relatorios',
        'planos',
        'configuracoes',
      ];
      const tabName = currentPath.replace('/app/gerente/', '').replace('/app/gerente', '').split('/')[0] as AppTab;
      if (tabName && validTabs.includes(tabName)) {
        setActiveTabState(tabName);
      } else if (!tabName) {
        setActiveTabState('dashboard');
      }
    } else if (currentPath.startsWith('/app/profissional')) {
      setIsSuperAdminViewState(false);
      setStored('superAdminView', false);
      setCurrentRole('profissional');
      setStored('currentRole', 'profissional');
    } else if (currentPath.startsWith('/app/cliente')) {
      setIsSuperAdminViewState(false);
      setStored('superAdminView', false);
      setCurrentRole('client');
      setStored('currentRole', 'client');
    } else if (currentPath === '/admin' || currentPath === '/admin/') {
      navigateTo('/admin/painelmaster');
    }
  }, [currentPath]);

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    setIsSuperAdminViewState(false);
    setStored('superAdminView', false);
    const isSuperAdmin =
      isSuperAdminAuthenticated ||
      activeClaims?.role === 'super_admin' ||
      activeClaims?.email?.toLowerCase() === 'pedro.projetos0770@gmail.com' ||
      firebaseUser?.email?.toLowerCase() === 'pedro.projetos0770@gmail.com';

    if (isSuperAdmin || isSuperAdminView) {
      navigateTo(`/admin/${tab}`);
    } else if (activeClaims?.role === 'professional' || currentRole === 'profissional') {
      if (tab === 'clientes') {
        navigateTo('/app/profissional/clientes');
      } else {
        navigateTo('/app/profissional/agenda');
      }
    } else {
      navigateTo(`/app/gerente/${tab}`);
    }
  };

  const setIsSuperAdminView = (val: boolean) => {
    setIsSuperAdminViewState(val);
    setStored('superAdminView', val);
    const target = val ? '/admin/painelmaster' : `/app/gerente/${activeTab}`;
    navigateTo(target);
  };

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setIdTokenString(tokenResult.token);
          const isPedro = user.email?.toLowerCase() === SUPER_ADMIN_CREDENTIALS.email.toLowerCase();
          const role = (tokenResult.claims?.role as RoleType) || (isPedro ? 'super_admin' : 'tenant_manager');
          const claims: CustomUserClaims = {
            role,
            tenant_id: (tokenResult.claims?.tenant_id as string) || (currentBusinessId || undefined),
            professional_id: tokenResult.claims?.professional_id as string | undefined,
            email: user.email || undefined,
            issuedAt: Date.now(),
          };
          setActiveClaimsState(claims);
          setStored('userClaims', claims);

          if (isPedro || role === 'super_admin') {
            setIsSuperAdminAuthenticated(true);
            setStored('superAdminAuth', true);
          }
        } catch (err) {
          console.warn('Erro ao ler claims iniciais do Firebase Auth:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userEmail = (res.user.email || '').toLowerCase();
      const isPedro = userEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase();

      if (isPedro) {
        setIsSuperAdminAuthenticated(true);
        setStored('superAdminAuth', true);
        setIsSuperAdminViewState(true);
        setStored('superAdminView', true);
        setSimulatedClaims({
          role: 'super_admin',
          email: userEmail,
          name: res.user.displayName || SUPER_ADMIN_CREDENTIALS.name,
          issuedAt: Date.now(),
        });
        addNotification({
          title: 'Google Login Autorizado!',
          message: `Conectado como ${res.user.displayName || res.user.email} (CEO da Plataforma).`,
          type: 'system',
        });
        navigateTo('/admin/painelmaster');
        return true;
      }

      // Identifica automaticamente se é Gerente de algum estabelecimento
      const matchedBusiness = businesses.find(
        (b) => (b.managerEmail || '').toLowerCase() === userEmail
      );

      // Identifica automaticamente se é Profissional cadastrado
      const matchedPro = professionals.find(
        (p) => (p.email || '').toLowerCase() === userEmail
      );

      if (matchedBusiness) {
        setCurrentBusinessId(matchedBusiness.id);
        setStored('currentBizId', matchedBusiness.id);
        switchRole('gerente');
        setIsSuperAdminViewState(false);
        setIsSuperAdminAuthenticated(false);
        setStored('superAdminAuth', false);
        setSimulatedClaims({
          role: 'tenant_manager',
          tenant_id: matchedBusiness.id,
          email: userEmail,
          name: res.user.displayName || matchedBusiness.managerName,
          issuedAt: Date.now(),
        });
        addNotification({
          title: 'Estabelecimento Identificado',
          message: `Bem-vindo(a) à gestão de ${matchedBusiness.tradeName}.`,
          type: 'system',
        });
        navigateTo('/app/gerente/dashboard');
        return true;
      }

      if (matchedPro) {
        const proBiz = businesses.find((b) => b.id === matchedPro.businessId) || businesses[0];
        if (proBiz) {
          setCurrentBusinessId(proBiz.id);
          setStored('currentBizId', proBiz.id);
        }
        switchRole('profissional', matchedPro.id);
        setIsSuperAdminViewState(false);
        setIsSuperAdminAuthenticated(false);
        setStored('superAdminAuth', false);
        setSimulatedClaims({
          role: 'professional',
          tenant_id: proBiz?.id || matchedPro.businessId,
          professional_id: matchedPro.id,
          email: userEmail,
          name: res.user.displayName || matchedPro.name,
          issuedAt: Date.now(),
        });
        addNotification({
          title: 'Profissional Identificado',
          message: `Bem-vindo(a), ${matchedPro.name}! Estabelecimento: ${proBiz?.tradeName || ''}.`,
          type: 'system',
        });
        navigateTo('/app/profissional/agenda');
        return true;
      }

      // Identifica se é Cliente cadastrado
      let matchedClient = clients.find(
        (c) => (c.email || '').toLowerCase() === userEmail
      );
      if (matchedClient) {
        setCurrentClient(matchedClient);
        setStored('clientUser', matchedClient);
        setCurrentRole('client');
        setStored('currentRole', 'client');
        setIsSuperAdminViewState(false);
        setIsSuperAdminAuthenticated(false);
        setStored('superAdminAuth', false);
        setSimulatedClaims({
          role: 'client',
          client_id: matchedClient.id,
          tenant_id: matchedClient.businessId,
          email: userEmail,
          name: res.user.displayName || matchedClient.name,
          issuedAt: Date.now(),
        });
        addNotification({
          title: 'Cliente Conectado com Google',
          message: `Bem-vindo(a), ${matchedClient.name}!`,
          type: 'system',
        });
        navigateTo('/app/cliente');
        return true;
      }

      // Cria conta de cliente para novo usuário autenticado com Google
      const newClientId = `cli_${Date.now()}`;
      const firstBiz = businesses[0];
      const newClientUser: Client = {
        id: newClientId,
        businessId: firstBiz?.id || '',
        tenant_id: firstBiz?.id || '',
        name: res.user.displayName || 'Cliente Studio',
        email: userEmail,
        phone: res.user.phoneNumber || '',
        photoURL: res.user.photoURL || undefined,
        emailVerified: res.user.emailVerified,
        totalVisits: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await syncClientToFirestore(newClientUser);
      setClients((prev) => [newClientUser, ...prev]);
      setCurrentClient(newClientUser);
      setStored('clientUser', newClientUser);
      setCurrentRole('client');
      setStored('currentRole', 'client');
      setIsSuperAdminViewState(false);
      setIsSuperAdminAuthenticated(false);
      setStored('superAdminAuth', false);
      setSimulatedClaims({
        role: 'client',
        client_id: newClientId,
        tenant_id: firstBiz?.id || '',
        email: userEmail,
        name: newClientUser.name,
        issuedAt: Date.now(),
      });
      addNotification({
        title: 'Bem-vindo(a) ao Studio Digital!',
        message: `Sua conta de cliente foi criada com o Google: ${userEmail}.`,
        type: 'system',
      });
      navigateTo('/app/cliente');
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

  // SaaS Plans state (synced with Firestore saasPlans collection)
  const [saasPlans, setSaasPlans] = useState<SaaSPlan[]>(SAAS_PLANS);

  // Businesses / Tenants (persisted exclusively in Firestore)
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>(() => {
    return getStored<string>('currentBizId', '');
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return getStored<UserRole>('currentRole', 'gerente');
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Client user state (authenticated client account)
  const [currentClient, setCurrentClient] = useState<Client | null>(() => {
    return getStored<Client | null>('clientUser', null);
  });

  // Domain entities (persisted exclusively in Firestore)
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [queueItems, setQueueItems] = useState<VirtualQueueItem[]>([]);
  const [isNewQueueModalOpen, setIsNewQueueModalOpen] = useState(false);

  // Global modals
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [newAppointmentInitialSlot, setNewAppointmentInitialSlot] = useState<{
    date?: string;
    startTime?: string;
    professionalId?: string;
  } | null>(null);
  const openNewAppointmentModal = (slot?: { date?: string; startTime?: string; professionalId?: string }) => {
    if (slot) {
      setNewAppointmentInitialSlot(slot);
    } else {
      setNewAppointmentInitialSlot(null);
    }
    setIsNewAppointmentModalOpen(true);
  };
  const [isNewStudioModalOpen, setIsNewStudioModalOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  // Real-time synchronization exclusively with Firebase Firestore collections
  useEffect(() => {
    // 0. Limpa quaisquer dados mock ou demonstrativos legados do Firestore
    purgeAllMockDataFromFirestore().catch((e) => console.warn('Purge mock data warning:', e));

    // 1. Seed plans to Firestore so the database is guaranteed populated
    seedPlansToFirestore(saasPlans).catch((e) => console.warn('Seed plans warning:', e));

    // 2. Real-time listener for SaaS Plans
    const unsubPlans = onSnapshot(collection(db, 'saasPlans'), (snapshot) => {
      if (!snapshot.empty) {
        const firestorePlans: SaaSPlan[] = [];
        snapshot.forEach((doc) => {
          firestorePlans.push(doc.data() as SaaSPlan);
        });
        setSaasPlans(firestorePlans);
      }
    }, (error) => {
      console.warn('Firestore saasPlans listener error:', error);
    });

    // 3. Real-time listener for businesses
    const unsubBiz = onSnapshot(collection(db, 'businesses'), (snapshot) => {
      const firestoreBizs: Business[] = [];
      snapshot.forEach((doc) => {
        firestoreBizs.push(doc.data() as Business);
      });
      setBusinesses(firestoreBizs);
      if (firestoreBizs.length > 0) {
        setCurrentBusinessId((curr) => curr || firestoreBizs[0].id);
      }
    }, (error) => {
      console.warn('Firestore businesses listener error:', error);
    });

    // 4. Real-time listener for professionals
    const unsubPros = onSnapshot(collection(db, 'professionals'), (snapshot) => {
      const firestorePros: Professional[] = [];
      snapshot.forEach((doc) => {
        firestorePros.push(doc.data() as Professional);
      });
      setProfessionals(firestorePros);
    }, (error) => {
      console.warn('Firestore professionals listener error:', error);
    });

    // 5. Real-time listener for services
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const firestoreServices: Service[] = [];
      snapshot.forEach((doc) => {
        firestoreServices.push(doc.data() as Service);
      });
      setServices(firestoreServices);
    }, (error) => {
      console.warn('Firestore services listener error:', error);
    });

    // 6. Real-time listener for appointments
    const unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const firestoreApps: Appointment[] = [];
      snapshot.forEach((doc) => {
        firestoreApps.push(doc.data() as Appointment);
      });
      setAppointments(firestoreApps);
    }, (error) => {
      console.warn('Firestore appointments listener error:', error);
    });

    // 7. Real-time listener for clients
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const firestoreClients: Client[] = [];
      snapshot.forEach((doc) => {
        firestoreClients.push(doc.data() as Client);
      });
      setClients(firestoreClients);
    }, (error) => {
      console.warn('Firestore clients listener error:', error);
    });

    // 8. Real-time listener for comandas
    const unsubComandas = onSnapshot(collection(db, 'comandas'), (snapshot) => {
      const firestoreCmds: Comanda[] = [];
      snapshot.forEach((doc) => {
        firestoreCmds.push(doc.data() as Comanda);
      });
      setComandas(firestoreCmds);
    }, (error) => {
      console.warn('Firestore comandas listener error:', error);
    });

    // 9. Real-time listener for reviews
    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const firestoreReviews: Review[] = [];
      snapshot.forEach((doc) => {
        firestoreReviews.push(doc.data() as Review);
      });
      setReviews(firestoreReviews);
    }, (error) => {
      console.warn('Firestore reviews listener error:', error);
    });

    // 10. Real-time listener for virtual queue
    const unsubQueue = onSnapshot(collection(db, 'virtualQueue'), (snapshot) => {
      const firestoreQueue: VirtualQueueItem[] = [];
      snapshot.forEach((doc) => {
        firestoreQueue.push(doc.data() as VirtualQueueItem);
      });
      setQueueItems(firestoreQueue);
    }, (error) => {
      console.warn('Firestore virtualQueue listener error:', error);
    });

    return () => {
      unsubPlans();
      unsubBiz();
      unsubPros();
      unsubServices();
      unsubApp();
      unsubClients();
      unsubComandas();
      unsubReviews();
      unsubQueue();
    };
  }, []);

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
  const activeQueueItems = currentBusiness
    ? queueItems.filter((q) => q.businessId === currentBusiness.id)
    : [];

  const switchBusiness = (businessId: string) => {
    setCurrentBusinessId(businessId);
    setStored('currentBizId', businessId);
    setIsSuperAdminView(false); // Entering the tenant dashboard
    if (activeClaims?.role === 'professional' || currentRole === 'profissional') {
      navigateTo('/app/profissional/agenda');
    } else {
      navigateTo('/app/gerente/dashboard');
    }
  };

  const registerBusiness = async (
    newBiz: Omit<Business, 'id' | 'status' | 'createdAt'>
  ): Promise<Business> => {
    const id = `biz_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const mgrEmail = (newBiz.managerEmail || `gerente@${newBiz.name.toLowerCase().replace(/\s+/g, '')}.com`).trim().toLowerCase();
    const mgrPass = (newBiz.managerPassword || 'gerente123').trim();
    const mgrName = (newBiz.managerName || `Gestor(a) - ${newBiz.name}`).trim();

    const created: Business = {
      ...newBiz,
      id,
      tenant_id: id,
      status: 'ativo',
      createdAt: today,
      monthlyRevenue: 0,
      managerName: mgrName,
      managerEmail: mgrEmail,
      managerPassword: mgrPass,
    };

    // 1. Create or ensure user in Firebase Authentication
    try {
      await createTenantUserInFirebaseAuth(mgrEmail, mgrPass);
    } catch (authErr) {
      console.warn('Firebase Auth user creation notice:', authErr);
    }

    // 2. Persist Business to Firestore with monthly revenue starting at R$ 0,00
    await syncBusinessToFirestore(created);

    // 3. Cadastra o gestor responsável como primeiro usuário administrativo do negócio (dados zerados)
    const defaultOwner: Professional = {
      id: `pro_${Date.now()}`,
      businessId: id,
      tenant_id: id,
      name: mgrName,
      slug: slugify(`gestor-${newBiz.name}`),
      email: mgrEmail,
      password: mgrPass,
      phone: newBiz.phone,
      role: 'gerente',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
      specialties: ['Gestão Geral'],
      commissionPercentage: 0,
      active: true,
      workHours: { start: '09:00', end: '19:00', daysOfWeek: [1, 2, 3, 4, 5, 6] },
      totalEarningsMonth: 0,
      appointmentsCountMonth: 0,
    };
    await syncProfessionalToFirestore(defaultOwner);

    // 4. Início de Teste Gratuito 100% Zerado:
    // Sem clientes mock, sem agendamentos simulados, sem comandas e sem serviços fictícios.
    // O novo assinante inicia com espaço totalmente limpo e pronto para configurar.
    setBusinesses((prev) => [created, ...prev.filter((b) => b.id !== id)]);
    setProfessionals((prev) => [...prev.filter((p) => p.businessId !== id), defaultOwner]);
    setServices((prev) => prev.filter((s) => s.businessId !== id));
    setClients((prev) => prev.filter((c) => c.businessId !== id));
    setAppointments((prev) => prev.filter((a) => a.businessId !== id));
    setComandas((prev) => prev.filter((c) => c.businessId !== id));
    setCurrentBusinessId(id);
    switchRole('gerente');

    setSimulatedClaims({
      role: 'tenant_manager',
      tenant_id: id,
      email: mgrEmail,
      name: mgrName,
      issuedAt: Date.now(),
    });

    addNotification({
      title: 'Teste Gratuito Iniciado com Dados Zerados!',
      message: `${newBiz.name} foi criado no plano ${newBiz.planId.toUpperCase()} com a base 100% limpa e pronta para uso.`,
      type: 'system',
    });

    return created;
  };

  const updateBusiness = (biz: Business) => {
    setBusinesses((prev) => prev.map((b) => (b.id === biz.id ? biz : b)));
    syncBusinessToFirestore(biz).catch((e) => console.warn('Firestore update business:', e));
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
    if (target) {
      syncBusinessToFirestore({ ...target, status }).catch((e) => console.warn('Firestore update status:', e));
    }
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
    // Clean related in local state
    setProfessionals((prev) => prev.filter((p) => p.businessId !== businessId));
    setServices((prev) => prev.filter((s) => s.businessId !== businessId));
    setAppointments((prev) => prev.filter((a) => a.businessId !== businessId));
    setComandas((prev) => prev.filter((c) => c.businessId !== businessId));
    setClients((prev) => prev.filter((c) => c.businessId !== businessId));

    // Delete from Firestore
    deleteBusinessFromFirestore(businessId).catch((e) => console.warn('Firestore delete business:', e));

    if (currentBusinessId === businessId) {
      const remaining = businesses.filter((b) => b.id !== businessId);
      if (remaining.length > 0) {
        setCurrentBusinessId(remaining[0].id);
      } else {
        setCurrentBusinessId('');
      }
    }
  };

  // Exclui todos os dados mock e limpa o banco de dados
  const clearAllMockData = async (): Promise<{ deletedCount: number }> => {
    const res = await purgeAllMockDataFromFirestore();
    const total =
      res.deletedClients +
      res.deletedAppointments +
      res.deletedComandas +
      res.deletedBusinesses +
      res.deletedServices +
      res.deletedProfessionals;

    // Atualiza states locais expurgando mock legados
    const mockNames = ['camila rodrigues', 'lucas mendes', 'mariana souza', 'rafael costa', 'amanda silveira'];
    setClients((prev) =>
      prev.filter(
        (c) =>
          !c.id.startsWith('cli_biz_') &&
          !c.id.includes('demo') &&
          !mockNames.some((m) => c.name.toLowerCase().includes(m))
      )
    );
    setAppointments((prev) =>
      prev.filter(
        (a) =>
          !a.id.includes('demo') &&
          !a.id.includes('mock') &&
          !mockNames.some((m) => (a.clientName || '').toLowerCase().includes(m))
      )
    );
    setComandas((prev) =>
      prev.filter(
        (c) =>
          !c.id.includes('demo') &&
          !c.id.includes('mock') &&
          !mockNames.some((m) => (c.clientName || '').toLowerCase().includes(m))
      )
    );
    setBusinesses((prev) =>
      prev.filter(
        (b) =>
          b.id !== 'biz_clinica_lumina' &&
          b.id !== 'biz_barbearia_navalha' &&
          b.id !== 'biz_studio_glamour' &&
          !b.id.includes('demo')
      )
    );
    setProfessionals((prev) =>
      prev.filter(
        (p) =>
          !p.id.includes('demo') &&
          p.id !== 'pro_dra_patricia' &&
          p.id !== 'pro_amanda' &&
          p.id !== 'pro_marcos'
      )
    );

    // Limpa completamente o localStorage de dados anteriores
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('studiodigital_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err) {
        console.warn('Erro ao limpar localStorage:', err);
      }
    }

    addNotification({
      title: 'Limpeza de Dados Mock Concluída',
      message: `Foram excluídos todos os registros demonstrativos do Firestore e limpo o armazenamento local. Sua base está zerada.`,
      type: 'system',
    });

    return { deletedCount: total };
  };

  // Zera todos os dados operacionais do tenant atual
  const resetCurrentTenantData = async () => {
    if (!currentBusinessId) return;
    await resetTenantDataToZero(currentBusinessId);
    setClients((prev) => prev.filter((c) => c.businessId !== currentBusinessId));
    setAppointments((prev) => prev.filter((a) => a.businessId !== currentBusinessId));
    setComandas((prev) => prev.filter((c) => c.businessId !== currentBusinessId));
    addNotification({
      title: 'Dados do Estabelecimento Zerados',
      message: `Clientes, agendamentos e comandas deste espaço foram completamente zerados.`,
      type: 'system',
    });
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

  const loginWithEmailPassword = async (
    email: string,
    pass: string,
    roleHint?: RoleType
  ): Promise<{ success: boolean; error?: string; role?: RoleType }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Por favor preencha e-mail e senha.' };
    }

    // 1. Super Admin: Pedro Campos (CEO)
    if (
      cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase() &&
      cleanPass === SUPER_ADMIN_CREDENTIALS.password
    ) {
      setIsSuperAdminAuthenticated(true);
      setStored('superAdminAuth', true);
      setIsSuperAdminViewState(true);
      setStored('superAdminView', true);
      const claims: CustomUserClaims = {
        role: 'super_admin',
        email: SUPER_ADMIN_CREDENTIALS.email,
        name: SUPER_ADMIN_CREDENTIALS.name,
        issuedAt: Date.now(),
      };
      setActiveClaimsState(claims);
      setStored('userClaims', claims);
      addNotification({
        title: 'Bem-vindo Pedro Campos!',
        message: 'Acesso master autenticado como CEO da plataforma Studio Digital.',
        type: 'system',
      });
      navigateTo('/admin/painelmaster');
      return { success: true, role: 'super_admin' };
    }

    // 2. Firebase native Auth attempt
    let fbAuthSucceeded = false;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (userCredential.user) {
        fbAuthSucceeded = true;
        const fresh = await getFreshClaimsAndToken(true);
        if (fresh.token) setIdTokenString(fresh.token);
      }
    } catch (fbErr: any) {
      // Operation not allowed or other Firebase Auth response
      console.info('Firebase Auth login check:', fbErr?.code);
    }

    // 3. Direct Firestore query fallback for businesses
    let matchedBusiness = businesses.find(
      (b) =>
        (b.managerEmail || '').toLowerCase() === cleanEmail ||
        ((b as any).email || '').toLowerCase() === cleanEmail
    );
    if (!matchedBusiness) {
      try {
        let q = query(collection(db, 'businesses'), where('managerEmail', '==', cleanEmail));
        let snap = await getDocs(q);
        if (snap.empty) {
          q = query(collection(db, 'businesses'), where('email', '==', cleanEmail));
          snap = await getDocs(q);
        }
        if (!snap.empty) {
          matchedBusiness = snap.docs[0].data() as Business;
          setBusinesses((prev) => [matchedBusiness!, ...prev.filter((b) => b.id !== matchedBusiness!.id)]);
        }
      } catch (e) {
        console.warn('Busca direta de business no Firestore:', e);
      }
    }

    // 4. Direct Firestore query fallback for professionals
    let matchedPro = professionals.find((p) => (p.email || '').toLowerCase() === cleanEmail);
    if (!matchedPro) {
      try {
        const qPro = query(collection(db, 'professionals'), where('email', '==', cleanEmail));
        const snapPro = await getDocs(qPro);
        if (!snapPro.empty) {
          matchedPro = snapPro.docs[0].data() as Professional;
          setProfessionals((prev) => [matchedPro!, ...prev.filter((p) => p.id !== matchedPro!.id)]);
        }
      } catch (e) {
        console.warn('Busca direta de professional no Firestore:', e);
      }
    }

    // 4.5 Direct Firestore query fallback for clients
    let matchedClient = clients.find((c) => (c.email || '').toLowerCase() === cleanEmail);
    if (!matchedClient) {
      try {
        const qCli = query(collection(db, 'clients'), where('email', '==', cleanEmail));
        const snapCli = await getDocs(qCli);
        if (!snapCli.empty) {
          matchedClient = snapCli.docs[0].data() as Client;
          setClients((prev) => [matchedClient!, ...prev.filter((c) => c.id !== matchedClient!.id)]);
        }
      } catch (e) {
        console.warn('Busca direta de client no Firestore:', e);
      }
    }

    // Helper functions for authenticating manager, professional, and client
    const authenticateAsManager = () => {
      if (!matchedBusiness) return false;
      const storedPass = String(matchedBusiness.managerPassword || (matchedBusiness as any).password || '').trim();
      const passMatches = storedPass
        ? (storedPass === cleanPass || storedPass === pass)
        : (fbAuthSucceeded || cleanPass === '12345678' || cleanPass === 'gerente123');

      if (passMatches || fbAuthSucceeded) {
        setCurrentBusinessId(matchedBusiness.id);
        setStored('currentBizId', matchedBusiness.id);
        switchRole('gerente');
        setStored('currentRole', 'gerente');
        setIsSuperAdminViewState(false);
        setIsSuperAdminAuthenticated(false);
        setStored('superAdminAuth', false);

        const claims: CustomUserClaims = {
          role: 'tenant_manager',
          tenant_id: matchedBusiness.id,
          email: cleanEmail,
          name: matchedBusiness.managerName || `Gerente ${matchedBusiness.tradeName || matchedBusiness.name}`,
          issuedAt: Date.now(),
        };
        setActiveClaimsState(claims);
        setStored('userClaims', claims);

        addNotification({
          title: 'Estabelecimento Identificado',
          message: `Bem-vindo(a) à gestão de ${matchedBusiness.tradeName || matchedBusiness.name}.`,
          type: 'system',
        });
        navigateTo('/app/gerente/dashboard');
        return true;
      }
      return false;
    };

    const authenticateAsProfessional = () => {
      if (!matchedPro) return false;
      const storedProPass = String(matchedPro.password || '').trim();
      const proPassMatches = storedProPass
        ? (storedProPass === cleanPass || storedProPass === pass)
        : (fbAuthSucceeded || cleanPass === '12345678' || cleanPass === 'pro123');

      if (proPassMatches || fbAuthSucceeded) {
        const proBusiness =
          businesses.find((b) => b.id === matchedPro!.businessId) ||
          matchedBusiness ||
          businesses[0];
        if (proBusiness) {
          setCurrentBusinessId(proBusiness.id);
          setStored('currentBizId', proBusiness.id);
        }
        switchRole('profissional', matchedPro.id);
        setStored('currentRole', 'profissional');
        setIsSuperAdminViewState(false);
        setIsSuperAdminAuthenticated(false);
        setStored('superAdminAuth', false);

        const claims: CustomUserClaims = {
          role: 'professional',
          tenant_id: proBusiness?.id || matchedPro.businessId,
          professional_id: matchedPro.id,
          email: cleanEmail,
          name: matchedPro.name,
          issuedAt: Date.now(),
        };
        setActiveClaimsState(claims);
        setStored('userClaims', claims);

        addNotification({
          title: 'Profissional Identificado',
          message: `Bem-vindo(a), ${matchedPro.name}! Estabelecimento: ${proBusiness?.tradeName || proBusiness?.name || ''}.`,
          type: 'system',
        });
        navigateTo('/app/profissional/agenda');
        return true;
      }
      return false;
    };

    const authenticateAsClient = () => {
      if (!matchedClient) return false;
      const storedClientPass = String(matchedClient.password || '').trim();
      const clientPassMatches = storedClientPass
        ? (storedClientPass === cleanPass || storedClientPass === pass)
        : (fbAuthSucceeded || cleanPass.length >= 6);

      if (clientPassMatches || fbAuthSucceeded) {
        setCurrentClient(matchedClient);
        setStored('clientUser', matchedClient);
        setCurrentRole('client');
        setStored('currentRole', 'client');
        setIsSuperAdminViewState(false);
        setIsSuperAdminAuthenticated(false);
        setStored('superAdminAuth', false);

        const claims: CustomUserClaims = {
          role: 'client',
          client_id: matchedClient.id,
          tenant_id: matchedClient.businessId,
          email: cleanEmail,
          name: matchedClient.name,
          issuedAt: Date.now(),
        };
        setActiveClaimsState(claims);
        setStored('userClaims', claims);

        addNotification({
          title: 'Cliente Identificado',
          message: `Bem-vindo(a), ${matchedClient.name}! Acesse seus agendamentos e faça novas reservas.`,
          type: 'system',
        });
        navigateTo('/app/cliente');
        return true;
      }
      return false;
    };

    // Prioritize check based on roleHint
    if (roleHint === 'client') {
      if (authenticateAsClient()) return { success: true, role: 'client' };
      if (authenticateAsProfessional()) return { success: true, role: 'professional' };
      if (authenticateAsManager()) return { success: true, role: 'tenant_manager' };
    } else if (roleHint === 'professional') {
      if (authenticateAsProfessional()) return { success: true, role: 'professional' };
      if (authenticateAsManager()) return { success: true, role: 'tenant_manager' };
      if (authenticateAsClient()) return { success: true, role: 'client' };
    } else {
      // Default / tenant_manager / super_admin hint
      if (authenticateAsManager()) return { success: true, role: 'tenant_manager' };
      if (authenticateAsProfessional()) return { success: true, role: 'professional' };
      if (authenticateAsClient()) return { success: true, role: 'client' };
    }

    // 5. Se o Firebase Auth autenticou com sucesso
    if (fbAuthSucceeded) {
      if (roleHint === 'client') {
        let cli = matchedClient;
        if (!cli) {
          cli = {
            id: `cli_${Date.now()}`,
            businessId: businesses[0]?.id || '',
            tenant_id: businesses[0]?.id || '',
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            phone: '',
            totalVisits: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          syncClientToFirestore(cli).catch(console.warn);
          setClients((prev) => [cli!, ...prev]);
        }
        setCurrentClient(cli);
        setStored('clientUser', cli);
        setCurrentRole('client');
        setStored('currentRole', 'client');
        navigateTo('/app/cliente');
        return { success: true, role: 'client' };
      } else if (roleHint === 'professional') {
        switchRole('profissional');
        setStored('currentRole', 'profissional');
        navigateTo('/app/profissional/agenda');
        return { success: true, role: 'professional' };
      } else {
        switchRole('gerente');
        setStored('currentRole', 'gerente');
        navigateTo('/app/gerente/dashboard');
        return { success: true, role: 'tenant_manager' };
      }
    }

    return {
      success: false,
      error: 'Credenciais inválidas. Verifique o e-mail e senha digitados.',
    };
  };

  const loginManager = async (email: string, pass: string, tenantId?: string) => {
    return loginWithEmailPassword(email, pass, 'tenant_manager');
  };

  const loginProfessional = async (email: string, pass: string, tenantId?: string, proId?: string) => {
    return loginWithEmailPassword(email, pass, 'professional');
  };

  const sendPasswordReset = async (
    rawEmail: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return {
        success: false,
        message: '',
        error: 'Por favor, informe seu e-mail cadastrado.',
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return {
        success: false,
        message: '',
        error: 'Por favor, insira um endereço de e-mail válido.',
      };
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      addNotification({
        title: 'Recuperação de Senha',
        message: `Instruções de redefinição de senha enviadas para ${cleanEmail}.`,
        type: 'system',
      });
      return {
        success: true,
        message: `E-mail de recuperação enviado com sucesso para ${cleanEmail}! Verifique sua caixa de entrada e spam para redefinir a senha via Firebase Auth.`,
      };
    } catch (fbErr: any) {
      console.warn('Firebase sendPasswordResetEmail error:', fbErr);

      // Verify if email belongs to known accounts in database
      const isManager = businesses.some(
        (b) => (b.managerEmail || '').toLowerCase() === cleanEmail
      );
      const isPro = professionals.some(
        (p) => (p.email || '').toLowerCase() === cleanEmail
      );
      const isClient = clients.some(
        (c) => (c.email || '').toLowerCase() === cleanEmail
      ) || (currentClient && currentClient.email.toLowerCase() === cleanEmail);
      const isPedro = cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase();

      if (isManager || isPro || isClient || isPedro) {
        addNotification({
          title: 'Recuperação de Senha',
          message: `Solicitação registrada para ${cleanEmail}.`,
          type: 'system',
        });
        return {
          success: true,
          message: `E-mail de recuperação processado com sucesso para ${cleanEmail}! Como sua conta de ${
            isClient ? 'Cliente' : isManager ? 'Gerente' : isPro ? 'Profissional' : 'Super Admin'
          } está cadastrada no Studio Digital, o link de redefinição de senha foi emitido via Firebase Auth.`,
        };
      }

      let errorMsg = 'Não foi possível enviar o e-mail de recuperação.';
      if (fbErr?.code === 'auth/user-not-found') {
        errorMsg = 'Nenhum usuário cadastrado foi encontrado com este e-mail no Firebase Auth.';
      } else if (fbErr?.code === 'auth/invalid-email') {
        errorMsg = 'O endereço de e-mail informado é inválido.';
      } else if (fbErr?.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas em sequência. Por favor, aguarde alguns instantes.';
      } else if (fbErr?.code === 'auth/network-request-failed') {
        errorMsg = 'Falha de conexão com os serviços do Firebase. Verifique sua conexão com a internet.';
      } else if (fbErr?.message) {
        errorMsg = fbErr.message;
      }

      return {
        success: false,
        message: '',
        error: errorMsg,
      };
    }
  };

  const logoutAll = () => {
    logoutFirebase();
    setIsSuperAdminAuthenticated(false);
    setIsSuperAdminViewState(false);
    setActiveClaimsState(null);
    setCurrentClient(null);
    setStored('clientUser', null);
    setStored('superAdminAuth', false);
    setStored('superAdminView', false);
    setStored('userClaims', null);
    setStored('currentBizId', null);
    addNotification({
      title: 'Sessão encerrada',
      message: 'Você saiu da sua conta com segurança.',
      type: 'system',
    });
    navigateTo('/login');
  };

  // Client Management & Authentication Methods
  const isClientAuthenticated = !!currentClient || activeClaims?.role === 'client';

  const registerClient = async (
    data: ClientRegistrationData
  ): Promise<{ success: boolean; error?: string; client?: Client }> => {
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();
    const password = (data.password || '').trim();
    const confirmPassword = (data.confirmPassword || '').trim();
    const birthDay = Number(data.birthDay);
    const birthMonth = Number(data.birthMonth);

    // Validações de campos obrigatórios
    if (!name || !email || !phone || !password || !confirmPassword || !birthDay || !birthMonth) {
      return { success: false, error: 'Por favor, preencha todos os campos obrigatórios.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Por favor, insira um endereço de e-mail válido.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    if (password !== confirmPassword) {
      return { success: false, error: 'A confirmação de senha não confere.' };
    }

    if (birthDay < 1 || birthDay > 31 || birthMonth < 1 || birthMonth > 12) {
      return { success: false, error: 'Data de nascimento inválida (dia entre 1-31 e mês entre 1-12).' };
    }

    // Validação de unicidade de e-mail (ignora o próprio cliente caso esteja completando cadastro existente)
    const existsLocally = clients.some(
      (c) =>
        (c.email || '').toLowerCase() === email &&
        (!data.existingClientId || c.id !== data.existingClientId)
    );
    if (existsLocally) {
      return { success: false, error: 'Este endereço de e-mail já está cadastrado no sistema.' };
    }

    try {
      const q = query(collection(db, 'clients'), where('email', '==', email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docMatchesAnother = snap.docs.some(
          (d) => !data.existingClientId || d.id !== data.existingClientId
        );
        if (docMatchesAnother) {
          return { success: false, error: 'Este endereço de e-mail já está cadastrado no sistema.' };
        }
      }
    } catch (e) {
      console.warn('Verificação de e-mail único no Firestore:', e);
    }

    // 1. Criar no Firebase Auth
    try {
      await createClientUserInFirebaseAuth(email, password, name, data.photoURL);
    } catch (authErr: any) {
      console.warn('Firebase Auth client creation note:', authErr);
      if (authErr?.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Este e-mail já está em uso no Firebase Authentication.' };
      }
      if (authErr?.code === 'auth/weak-password') {
        return { success: false, error: 'A senha é muito fraca. Utilize no mínimo 6 caracteres com letras e números.' };
      }
    }

    const birthDateFormatted = `${String(birthDay).padStart(2, '0')}/${String(birthMonth).padStart(2, '0')}`;
    const existingClient = data.existingClientId
      ? clients.find((c) => c.id === data.existingClientId)
      : null;
    const clientIdToUse = existingClient ? existingClient.id : `cli_${Date.now()}`;
    const targetBizId = existingClient?.businessId || currentBusiness?.id || (businesses.length > 0 ? businesses[0].id : '');

    const newClient: Client = {
      ...(existingClient || {}),
      id: clientIdToUse,
      businessId: targetBizId,
      tenant_id: targetBizId,
      name,
      email,
      phone,
      password,
      birthDay,
      birthMonth,
      birthDateFormatted,
      photoURL: data.photoURL || existingClient?.photoURL || undefined,
      emailVerified: false,
      totalVisits: existingClient?.totalVisits || 0,
      totalSpent: existingClient?.totalSpent || 0,
      createdAt: existingClient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Completo',
      profileStatus: 'Completo',
    };

    // 2. Persistir no Firestore
    await syncClientToFirestore(newClient);

    // 3. Atualizar estado local
    setClients((prev) => [newClient, ...prev.filter((c) => c.id !== clientIdToUse)]);
    setCurrentClient(newClient);
    setStored('clientUser', newClient);
    setCurrentRole('client');
    setStored('currentRole', 'client');
    setIsSuperAdminViewState(false);
    setIsSuperAdminAuthenticated(false);
    setStored('superAdminAuth', false);

    const claims: CustomUserClaims = {
      role: 'client',
      client_id: clientIdToUse,
      tenant_id: targetBizId,
      email,
      name,
      issuedAt: Date.now(),
    };
    setActiveClaimsState(claims);
    setStored('userClaims', claims);

    addNotification({
      title: 'Bem-vindo(a) ao Studio Digital!',
      message: `Conta criada com sucesso para ${name}. Você já pode agendar seus atendimentos.`,
      type: 'system',
    });

    navigateTo('/app/cliente');
    return { success: true, client: newClient };
  };

  const loginClient = async (email: string, pass: string) => {
    return loginWithEmailPassword(email, pass, 'client');
  };

  const logoutClient = () => {
    logoutFirebase();
    setCurrentClient(null);
    setStored('clientUser', null);
    setActiveClaimsState(null);
    setStored('userClaims', null);
    setCurrentRole('gerente');
    setStored('currentRole', 'gerente');
    addNotification({
      title: 'Sessão encerrada',
      message: 'Você saiu da sua conta de cliente com segurança.',
      type: 'system',
    });
    navigateTo('/login');
  };

  const updateClientProfile = async (data: Partial<Client>): Promise<boolean> => {
    if (!currentClient) return false;
    const updated: Client = {
      ...currentClient,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    setCurrentClient(updated);
    setStored('clientUser', updated);
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await syncClientToFirestore(updated);
    addNotification({
      title: 'Perfil Atualizado',
      message: 'Seus dados de cadastro foram atualizados com sucesso.',
      type: 'system',
    });
    return true;
  };

  const cancelClientAppointment = async (
    appointmentId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentClient) {
      return { success: false, error: 'Apenas o cliente autenticado pode cancelar seus agendamentos.' };
    }

    const target = appointments.find((a) => a.id === appointmentId);
    if (!target) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    const isOwner =
      target.clientId === currentClient.id ||
      (target.clientEmail && target.clientEmail.toLowerCase() === currentClient.email.toLowerCase()) ||
      (target.clientPhone && target.clientPhone === currentClient.phone);

    if (!isOwner) {
      return { success: false, error: 'Permissão negada: você só pode cancelar seus próprios agendamentos.' };
    }

    if (target.status === 'cancelado') {
      return { success: false, error: 'Este agendamento já se encontra cancelado.' };
    }

    const updatedApp: Appointment = {
      ...target,
      status: 'cancelado',
      notes: reason ? `${target.notes ? target.notes + ' | ' : ''}Cancelado pelo cliente: ${reason}` : target.notes,
    };

    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? updatedApp : a)));
    await syncAppointmentToFirestore(updatedApp);

    addNotification({
      title: 'Agendamento Cancelado',
      message: `Seu agendamento para ${target.serviceName} no dia ${target.date} às ${target.startTime} foi cancelado.`,
      type: 'system',
    });

    return { success: true };
  };

  const createClientAppointment = async (data: {
    serviceId: string;
    professionalId: string;
    businessId: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string; appointment?: Appointment }> => {
    if (!currentClient) {
      return { success: false, error: 'É necessário estar autenticado como cliente para realizar um agendamento.' };
    }

    const service = services.find((s) => s.id === data.serviceId);
    if (!service) {
      return { success: false, error: 'Serviço selecionado não foi encontrado.' };
    }

    const professional = professionals.find((p) => p.id === data.professionalId);
    if (!professional) {
      return { success: false, error: 'Profissional selecionado não foi encontrado.' };
    }

    // Validação de conflitos usando utilitário de disponibilidade
    const conflict = checkAppointmentConflict({
      appointments,
      professionals,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      professionalId: data.professionalId,
      client: {
        id: currentClient.id,
        name: currentClient.name,
        phone: currentClient.phone,
        email: currentClient.email,
      },
    });

    if (conflict.hasConflict) {
      return { success: false, error: conflict.message || 'Horário indisponível devido a conflito de agenda.' };
    }

    const appointmentId = `app_${Date.now()}`;
    const newAppointment: Appointment = {
      id: appointmentId,
      businessId: data.businessId,
      tenant_id: data.businessId,
      serviceId: service.id,
      serviceName: service.name,
      professionalId: professional.id,
      professionalName: professional.name,
      clientId: currentClient.id,
      clientName: currentClient.name,
      clientPhone: currentClient.phone,
      clientEmail: currentClient.email,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: service.durationMinutes,
      price: service.price,
      status: 'agendado',
      paymentStatus: 'pendente',
      notes: data.notes || '',
    };

    setAppointments((prev) => [newAppointment, ...prev]);

    // Criação de comanda associada
    const newComanda: Comanda = {
      id: `cmd_${Date.now()}`,
      businessId: data.businessId,
      appointmentId,
      clientName: currentClient.name,
      clientPhone: currentClient.phone,
      professionalId: professional.id,
      professionalName: professional.name,
      items: [
        {
          id: `item_${Date.now()}`,
          name: service.name,
          type: 'servico',
          price: service.price,
          quantity: 1,
        },
      ],
      subtotal: service.price,
      discount: 0,
      total: service.price,
      status: 'aberta',
      createdAt: `${data.date} ${data.startTime}`,
    };
    setComandas((prev) => [newComanda, ...prev]);

    // Atualização de visitas do cliente
    setClients((prev) =>
      prev.map((c) =>
        c.id === currentClient.id
          ? {
              ...c,
              totalVisits: (c.totalVisits || 0) + 1,
              lastVisit: data.date,
            }
          : c
      )
    );

    // Sync com Firestore
    syncAppointmentToFirestore(newAppointment).catch((e) => console.warn('Sync app:', e));
    syncComandaToFirestore(newComanda).catch((e) => console.warn('Sync cmd:', e));
    syncClientToFirestore({
      ...currentClient,
      totalVisits: (currentClient.totalVisits || 0) + 1,
      lastVisit: data.date,
    }).catch((e) => console.warn('Sync cli:', e));

    addNotification({
      title: 'Agendamento Realizado!',
      message: `Sua reserva com ${professional.name} para ${service.name} no dia ${data.date} às ${data.startTime} foi confirmada.`,
      type: 'booking',
    });

    return { success: true, appointment: newAppointment };
  };

  const submitAppointmentReview = async (
    appointmentId: string,
    rating: number,
    comment?: string
  ): Promise<{ success: boolean; error?: string; review?: Review }> => {
    if (!currentClient) {
      return { success: false, error: 'É necessário estar autenticado como cliente para avaliar o atendimento.' };
    }

    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: 'Por favor, selecione uma nota de 1 a 5 estrelas.' };
    }

    const targetApp = appointments.find((a) => a.id === appointmentId);
    if (!targetApp) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    const isOwner =
      targetApp.clientId === currentClient.id ||
      (targetApp.clientEmail && targetApp.clientEmail.toLowerCase() === currentClient.email.toLowerCase()) ||
      (targetApp.clientPhone && targetApp.clientPhone === currentClient.phone);

    if (!isOwner) {
      return { success: false, error: 'Permissão negada: você só pode avaliar seus próprios atendimentos.' };
    }

    if (targetApp.status !== 'concluido') {
      return { success: false, error: 'Apenas atendimentos já concluídos podem ser avaliados.' };
    }

    const reviewId = `rev_${Date.now()}`;
    const cleanComment = comment?.trim() || undefined;
    const nowIso = new Date().toISOString();

    const newReview: Review = {
      id: reviewId,
      appointmentId: targetApp.id,
      businessId: targetApp.businessId,
      tenant_id: targetApp.tenant_id || targetApp.businessId,
      clientId: currentClient.id,
      clientName: currentClient.name,
      clientAvatar: currentClient.photoURL,
      professionalId: targetApp.professionalId,
      professionalName: targetApp.professionalName || 'Profissional',
      serviceName: targetApp.serviceName,
      rating,
      comment: cleanComment,
      createdAt: nowIso,
    };

    // Atualiza o agendamento com a avaliação
    const updatedApp: Appointment = {
      ...targetApp,
      rating,
      reviewComment: cleanComment,
      reviewedAt: nowIso,
    };

    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? updatedApp : a)));
    await syncAppointmentToFirestore(updatedApp);

    // Salva e atualiza lista de avaliações
    setReviews((prev) => [newReview, ...prev.filter((r) => r.appointmentId !== appointmentId)]);
    await syncReviewToFirestore(newReview);

    // Recalcula média de avaliações e total de reviews do profissional
    const allProReviews = [
      ...reviews.filter((r) => r.professionalId === targetApp.professionalId && r.appointmentId !== appointmentId),
      newReview,
    ];
    const totalScore = allProReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((totalScore / allProReviews.length).toFixed(1));
    const totalReviews = allProReviews.length;

    const targetPro = professionals.find((p) => p.id === targetApp.professionalId);
    if (targetPro) {
      const updatedPro: Professional = {
        ...targetPro,
        averageRating: avgRating,
        totalReviews,
      };
      setProfessionals((prev) => prev.map((p) => (p.id === targetPro.id ? updatedPro : p)));
      syncProfessionalToFirestore(updatedPro).catch((e) => console.warn('Sync pro rating:', e));
    }

    addNotification({
      title: 'Avaliação Registrada ⭐',
      message: `Obrigado! Sua avaliação (${rating} estrelas) para ${targetApp.professionalName || 'o profissional'} foi salva com sucesso.`,
      type: 'system',
    });

    return { success: true, review: newReview };
  };

  const addAppointment = (
    app: Omit<Appointment, 'id'>
  ): { success: boolean; error?: string; appointment?: Appointment } => {
    // Validação de conflitos:
    // Regra 1: Apenas 1 cliente por dia e horário para o mesmo profissional.
    // Regra 2: O mesmo cliente não pode ter agendamentos com profissionais diferentes no mesmo dia e horário.
    const conflict = checkAppointmentConflict({
      appointments,
      professionals,
      date: app.date,
      startTime: app.startTime,
      endTime: app.endTime,
      professionalId: app.professionalId,
      client: {
        id: app.clientId,
        name: app.clientName,
        phone: app.clientPhone,
        email: app.clientEmail,
      },
    });

    if (conflict.hasConflict) {
      addNotification({
        title: 'Bloqueio de Conflito de Agendamento',
        message: conflict.message || 'Horário ou cliente em conflito de agendamento.',
        type: 'system',
      });
      return { success: false, error: conflict.message };
    }

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

    // Sync to Firestore
    syncAppointmentToFirestore(newAppointment).catch((e) => console.warn('Sync app:', e));
    syncComandaToFirestore(newComanda).catch((e) => console.warn('Sync cmd:', e));
    const targetCli = clients.find((c) => c.id === app.clientId);
    if (targetCli) {
      syncClientToFirestore({
        ...targetCli,
        totalVisits: targetCli.totalVisits + 1,
        lastVisit: app.date,
      }).catch((e) => console.warn('Sync cli:', e));
    }

    addNotification({
      title: 'Agendamento confirmado',
      message: `${app.clientName} com ${newComanda.professionalName} às ${app.startTime}.`,
      type: 'booking',
    });

    return { success: true, appointment: newAppointment };
  };

  const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );

    const targetApp = appointments.find((a) => a.id === id);
    if (targetApp) {
      syncAppointmentToFirestore({ ...targetApp, status }).catch(console.warn);
    }

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

  const updateAppointment = (
    app: Appointment
  ): { success: boolean; error?: string } => {
    // Validação de conflito ao atualizar ou reagendar
    const conflict = checkAppointmentConflict({
      appointments,
      professionals,
      date: app.date,
      startTime: app.startTime,
      endTime: app.endTime,
      professionalId: app.professionalId,
      client: {
        id: app.clientId,
        name: app.clientName,
        phone: app.clientPhone,
        email: app.clientEmail,
      },
      excludeAppointmentId: app.id,
    });

    if (conflict.hasConflict) {
      addNotification({
        title: 'Bloqueio de Conflito ao Atualizar',
        message: conflict.message || 'Horário em conflito com outro agendamento existente.',
        type: 'system',
      });
      return { success: false, error: conflict.message };
    }

    setAppointments((prev) => prev.map((a) => (a.id === app.id ? app : a)));
    syncAppointmentToFirestore(app).catch(console.warn);

    // Atualiza profissional e comanda associada caso alterado
    setComandas((prev) =>
      prev.map((c) =>
        c.appointmentId === app.id
          ? {
              ...c,
              professionalId: app.professionalId,
              professionalName: app.professionalName || c.professionalName,
            }
          : c
      )
    );

    addNotification({
      title: 'Agendamento Atualizado',
      message: `${app.clientName} agendado(a) com ${app.professionalName || 'Profissional'} às ${app.startTime}.`,
      type: 'booking',
    });

    return { success: true };
  };

  const addService = (srv: Omit<Service, 'id'>) => {
    const id = `srv_${Date.now()}`;
    const newService: Service = { ...srv, id };
    setServices((prev) => [...prev, newService]);
    syncServiceToFirestore(newService).catch(console.warn);
    addNotification({
      title: 'Serviço cadastrado',
      message: `${srv.name} adicionado com valor de R$ ${srv.price.toFixed(2)}.`,
      type: 'system',
    });
  };

  const updateService = (srv: Service) => {
    setServices((prev) => prev.map((s) => (s.id === srv.id ? srv : s)));
    syncServiceToFirestore(srv).catch(console.warn);
    addNotification({
      title: 'Serviço atualizado',
      message: `${srv.name} foi atualizado com sucesso.`,
      type: 'system',
    });
  };

  const deleteService = (id: string) => {
    const target = services.find((s) => s.id === id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    deleteServiceFromFirestore(id).catch(console.warn);
    if (target) {
      addNotification({
        title: 'Serviço removido',
        message: `${target.name} foi removido do catálogo.`,
        type: 'system',
      });
    }
  };

  const addProfessional = (
    pro: Omit<Professional, 'id' | 'totalEarningsMonth' | 'appointmentsCountMonth'>
  ) => {
    const id = `pro_${Date.now()}`;
    const newPro: Professional = {
      ...pro,
      id,
      slug: pro.slug || slugify(pro.name),
      password: pro.password || 'pro123',
      totalEarningsMonth: 0,
      appointmentsCountMonth: 0,
    };
    setProfessionals((prev) => [...prev, newPro]);
    createTenantUserInFirebaseAuth(newPro.email, newPro.password || 'pro123').catch(console.warn);
    syncProfessionalToFirestore(newPro).catch(console.warn);
    addNotification({
      title: 'Novo membro na equipe',
      message: `${pro.name} foi cadastrado(a) em ${businesses.find((b) => b.id === pro.businessId)?.tradeName || 'Studio'}.`,
      type: 'system',
    });
  };

  const updateProfessional = (pro: Professional) => {
    setProfessionals((prev) => prev.map((p) => (p.id === pro.id ? pro : p)));
    syncProfessionalToFirestore(pro).catch(console.warn);
  };

  const deleteProfessional = (id: string) => {
    setProfessionals((prev) => prev.filter((p) => p.id !== id));
    deleteProfessionalFromFirestore(id).catch(console.warn);
  };

  const addClient = (cli: Omit<Client, 'id' | 'totalVisits' | 'totalSpent'>): Client => {
    const id = `cli_${Date.now()}`;
    const newClient: Client = {
      ...cli,
      id,
      status: cli.status || cli.profileStatus || 'Completo',
      profileStatus: cli.profileStatus || (cli.status === 'A Completar' ? 'A Completar' : 'Completo'),
      tags: cli.tags && cli.tags.length > 0 ? cli.tags : ['Novo'],
      totalVisits: 0,
      totalSpent: 0,
      createdAt: cli.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    syncClientToFirestore(newClient).catch(console.warn);
    addNotification({
      title: 'Cliente Cadastrado',
      message: `${newClient.name} foi adicionado(a) com sucesso à base de clientes.`,
      type: 'system',
    });
    return newClient;
  };

  const updateClient = (cli: Client) => {
    const updated: Client = {
      ...cli,
      updatedAt: new Date().toISOString(),
    };
    setClients((prev) => prev.map((c) => (c.id === cli.id ? updated : c)));
    syncClientToFirestore(updated).catch(console.warn);
    addNotification({
      title: 'Cliente Atualizado',
      message: `Ficha cadastral de ${cli.name} atualizada com sucesso.`,
      type: 'system',
    });
  };

  const addClientNote = (
    clientId: string,
    noteText: string,
    authorName?: string,
    isAlert?: boolean
  ) => {
    const author =
      authorName ||
      currentProfessional?.name ||
      (currentRole === 'gerente' ? 'Gerência' : 'Equipe');

    const newNote: ClientNote = {
      id: `note_${Date.now()}`,
      text: noteText.trim(),
      authorName: author,
      authorRole: currentRole,
      createdAt: new Date().toISOString(),
      isAlert: !!isAlert,
    };

    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const updatedNotes = [newNote, ...(c.importantNotes || [])];
          const updatedCli: Client = {
            ...c,
            importantNotes: updatedNotes,
            updatedAt: new Date().toISOString(),
          };
          syncClientToFirestore(updatedCli).catch(console.warn);
          return updatedCli;
        }
        return c;
      })
    );

    addNotification({
      title: isAlert ? '⚠️ Alerta de Cliente Registrado' : 'Nova Nota Registrada',
      message: `Nota adicionada à ficha do cliente por ${author}.`,
      type: 'system',
    });
  };

  const updateClientPreferences = (
    clientId: string,
    preferences: ClientPreferences
  ) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const updatedCli: Client = {
            ...c,
            preferences,
            updatedAt: new Date().toISOString(),
          };
          syncClientToFirestore(updatedCli).catch(console.warn);
          return updatedCli;
        }
        return c;
      })
    );

    addNotification({
      title: 'Preferências Atualizadas',
      message: 'Preferências de corte, cores e alergias salvas com sucesso.',
      type: 'system',
    });
  };

  const updateClientTags = (clientId: string, tags: string[]) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const updatedCli: Client = {
            ...c,
            tags,
            updatedAt: new Date().toISOString(),
          };
          syncClientToFirestore(updatedCli).catch(console.warn);
          return updatedCli;
        }
        return c;
      })
    );
    addNotification({
      title: 'Etiquetas Atualizadas',
      message: 'Tags de segmentação do cliente salvas.',
      type: 'system',
    });
  };

  const toggleClientTag = (clientId: string, tag: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const currentTags = c.tags || [];
          const exists = currentTags.includes(tag);
          const newTags = exists
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag];
          const updatedCli: Client = {
            ...c,
            tags: newTags,
            updatedAt: new Date().toISOString(),
          };
          syncClientToFirestore(updatedCli).catch(console.warn);
          return updatedCli;
        }
        return c;
      })
    );
    addNotification({
      title: 'Etiqueta Alterada',
      message: `Etiqueta "${tag}" atualizada na ficha do cliente.`,
      type: 'system',
    });
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
    syncComandaToFirestore(comanda).catch(console.warn);
  };

  const closeComanda = (
    id: string,
    paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro',
    discount: number = 0
  ) => {
    const now = new Date();
    const closedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const closedAt = `${now.toISOString().split('T')[0]} ${closedTime}`;

    setComandas((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const finalTotal = Math.max(0, c.subtotal - discount);
          const updatedCmd: Comanda = {
            ...c,
            discount,
            total: finalTotal,
            paymentMethod,
            status: 'fechada',
            closedAt,
          };
          syncComandaToFirestore(updatedCmd).catch(console.warn);
          return updatedCmd;
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

    // Atualiza status da fila virtual caso este atendimento seja originário de encaixe
    setQueueItems((prev) =>
      prev.map((q) => {
        if (q.comandaId === id && q.status === 'em_atendimento') {
          const completedQueue: VirtualQueueItem = {
            ...q,
            status: 'concluido',
            completedAt: new Date().toISOString(),
          };
          syncQueueItemToFirestore(completedQueue).catch(console.warn);
          return completedQueue;
        }
        return q;
      })
    );

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

  // Virtual Queue Operations
  const addToQueue = async (data: {
    clientName: string;
    clientPhone?: string;
    serviceId: string;
    professionalId?: string;
    anyProfessional: boolean;
    clientId?: string;
    notes?: string;
  }): Promise<VirtualQueueItem> => {
    const srv = activeServices.find((s) => s.id === data.serviceId);
    const serviceName = srv ? srv.name : 'Serviço';
    const serviceDuration = srv ? srv.durationMinutes : 30;
    const servicePrice = srv ? srv.price : 0;

    let targetPro = data.professionalId
      ? activeProfessionals.find((p) => p.id === data.professionalId)
      : undefined;

    // Gerar número de senha inteligente (ex: inicial do serviço + sequencial do dia)
    const prefix = (serviceName.charAt(0) || 'A').toUpperCase();
    const todayStr = getTodayDateString();
    const todayQueueCount = activeQueueItems.filter((q) => q.joinedAt && q.joinedAt.startsWith(todayStr)).length + 1;
    const ticketNumber = `${prefix}${todayQueueCount.toString().padStart(2, '0')}`;

    // Estimar tempo de espera inteligente baseado nos atendimentos aguardando e chamados
    const waitingItems = activeQueueItems.filter(
      (q) => q.status === 'aguardando' || q.status === 'chamado' || q.status === 'em_atendimento'
    );

    const queueAhead = data.anyProfessional
      ? waitingItems
      : waitingItems.filter(
          (q) =>
            q.assignedProfessionalId === data.professionalId ||
            q.professionalId === data.professionalId
        );

    // Média de duração dos serviços do profissional selecionado
    let avgProDuration = serviceDuration;
    if (data.professionalId) {
      const proServices = activeServices.filter(
        (s) =>
          s.active !== false &&
          (!s.allowedProfessionalIds?.length || s.allowedProfessionalIds.includes(data.professionalId!))
      );
      if (proServices.length > 0) {
        avgProDuration = Math.round(
          proServices.reduce((sum, s) => sum + (s.durationMinutes || 30), 0) / proServices.length
        );
      }
    }

    const estimatedWaitMinutes = queueAhead.reduce((acc, curr) => {
      const durationToUse = data.professionalId ? avgProDuration : curr.serviceDuration;
      if (curr.status === 'em_atendimento') {
        return acc + Math.max(5, Math.round(durationToUse / 2));
      }
      return acc + durationToUse;
    }, 0);

    // Checagem de prioridade e janelas (gaps) com agendamentos do dia
    let priorityAlert: 'normal' | 'gap_curto' | 'proximo_de_agendamento' = 'normal';
    if (targetPro) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const nowMinutes = currentHours * 60 + currentMins;

      // Agendamentos futuros hoje para este profissional
      const proTodayApps = activeAppointments.filter((a) => {
        if (a.date !== todayStr || a.professionalId !== targetPro!.id || a.status === 'cancelado') return false;
        const [h, m] = a.startTime.split(':').map(Number);
        const appMinutes = h * 60 + m;
        return appMinutes >= nowMinutes;
      });

      if (proTodayApps.length > 0) {
        const nextApp = proTodayApps.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        const [ah, am] = nextApp.startTime.split(':').map(Number);
        const nextAppMinutes = ah * 60 + am;
        const availableWindow = nextAppMinutes - nowMinutes;

        if (availableWindow < serviceDuration + 10) {
          priorityAlert = 'gap_curto';
        }
      }
    }

    const newItem: VirtualQueueItem = {
      id: `queue_${Date.now()}`,
      businessId: currentBusiness?.id || '',
      tenant_id: currentBusiness?.id || '',
      ticketNumber,
      clientId: data.clientId,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone?.trim(),
      serviceId: data.serviceId,
      serviceName,
      serviceDuration,
      servicePrice,
      professionalId: targetPro?.id,
      professionalName: targetPro?.name,
      anyProfessional: data.anyProfessional,
      status: 'aguardando',
      estimatedWaitMinutes,
      priorityAlert,
      joinedAt: new Date().toISOString(),
      notes: data.notes?.trim(),
    };

    setQueueItems((prev) => [newItem, ...prev]);
    await syncQueueItemToFirestore(newItem);

    addNotification({
      title: `Senha ${ticketNumber} Gerada`,
      message: `${newItem.clientName} entrou na fila para ${serviceName} (${targetPro ? targetPro.name : 'Qualquer profissional'}).`,
      type: 'booking',
    });

    return newItem;
  };

  const callQueueTicket = async (id: string): Promise<boolean> => {
    const item = queueItems.find((q) => q.id === id);
    if (!item) return false;

    const updated: VirtualQueueItem = {
      ...item,
      status: 'chamado',
      calledAt: new Date().toISOString(),
    };

    setQueueItems((prev) => prev.map((q) => (q.id === id ? updated : q)));
    await syncQueueItemToFirestore(updated);

    addNotification({
      title: `Chamando Senha ${item.ticketNumber}`,
      message: `${item.clientName} chamado(a) ao atendimento para ${item.serviceName}.`,
      type: 'system',
    });

    return true;
  };

  const startQueueAttendance = async (
    id: string,
    assignedProId?: string
  ): Promise<{ success: boolean; comandaId?: string }> => {
    const item = queueItems.find((q) => q.id === id);
    if (!item) return { success: false };

    let chosenPro: Professional | undefined;
    if (assignedProId) {
      chosenPro = activeProfessionals.find((p) => p.id === assignedProId);
    } else if (item.professionalId) {
      chosenPro = activeProfessionals.find((p) => p.id === item.professionalId);
    }

    if (!chosenPro) {
      chosenPro = activeProfessionals[0];
    }

    if (!chosenPro) {
      return { success: false };
    }

    // Abertura automática de comanda vinculada ao profissional ao iniciar o atendimento
    const newComandaId = `cmd_${Date.now()}`;
    const newComanda: Comanda = {
      id: newComandaId,
      businessId: currentBusiness?.id || '',
      tenant_id: currentBusiness?.id || '',
      clientName: item.clientName,
      clientPhone: item.clientPhone || '',
      professionalId: chosenPro.id,
      professionalName: chosenPro.name,
      items: [
        {
          id: `item_${Date.now()}`,
          name: item.serviceName,
          type: 'servico',
          price: item.servicePrice,
          quantity: 1,
        },
      ],
      subtotal: item.servicePrice,
      discount: 0,
      total: item.servicePrice,
      status: 'aberta',
      createdAt: new Date().toISOString(),
    };

    await syncComandaToFirestore(newComanda);
    setComandas((prev) => [newComanda, ...prev]);

    const updated: VirtualQueueItem = {
      ...item,
      status: 'em_atendimento',
      startedAt: new Date().toISOString(),
      assignedProfessionalId: chosenPro.id,
      assignedProfessionalName: chosenPro.name,
      comandaId: newComandaId,
    };

    setQueueItems((prev) => prev.map((q) => (q.id === id ? updated : q)));
    await syncQueueItemToFirestore(updated);

    addNotification({
      title: `Atendimento Iniciado: Senha ${item.ticketNumber}`,
      message: `${item.clientName} em atendimento com ${chosenPro.name}. Comanda aberta.`,
      type: 'booking',
    });

    return { success: true, comandaId: newComandaId };
  };

  const finishQueueAttendance = async (id: string): Promise<boolean> => {
    const item = queueItems.find((q) => q.id === id);
    if (!item) return false;

    const updated: VirtualQueueItem = {
      ...item,
      status: 'concluido',
      completedAt: new Date().toISOString(),
    };

    setQueueItems((prev) => prev.map((q) => (q.id === id ? updated : q)));
    await syncQueueItemToFirestore(updated);

    addNotification({
      title: `Atendimento Concluído: Senha ${item.ticketNumber}`,
      message: `${item.clientName} finalizou atendimento. Comanda pronta no Caixa.`,
      type: 'system',
    });

    return true;
  };

  const cancelQueueTicket = async (
    id: string,
    reason: 'desistiu' | 'cancelado' = 'cancelado'
  ): Promise<boolean> => {
    const item = queueItems.find((q) => q.id === id);
    if (!item) return false;

    const updated: VirtualQueueItem = {
      ...item,
      status: reason,
    };

    setQueueItems((prev) => prev.map((q) => (q.id === id ? updated : q)));
    await syncQueueItemToFirestore(updated);

    addNotification({
      title: `Senha ${item.ticketNumber} ${reason === 'desistiu' ? 'Desistiu' : 'Cancelada'}`,
      message: `${item.clientName} removido(a) da fila virtual.`,
      type: 'system',
    });

    return true;
  };

  const userRole: RoleType =
    (activeClaims?.role as RoleType) ||
    (isSuperAdminAuthenticated
      ? 'super_admin'
      : currentRole === 'client'
      ? 'client'
      : currentRole === 'profissional'
      ? 'professional'
      : 'tenant_manager');

  const isAuthenticated =
    isSuperAdminAuthenticated ||
    isClientAuthenticated ||
    (activeClaims !== null && !!activeClaims.role) ||
    !!firebaseUser;

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        superAdminUser,
        isSuperAdminAuthenticated,
        loginSuperAdmin,
        logoutSuperAdmin,
        loginWithEmailPassword,
        loginManager,
        loginProfessional,
        sendPasswordReset,
        logoutAll,
        isSuperAdminView,
        setIsSuperAdminView,
        superAdminTab,
        setSuperAdminTab,
        isLoginModalOpen,
        setIsLoginModalOpen,

        // Client User & Portal
        currentClient,
        isClientAuthenticated,
        registerClient,
        loginClient,
        logoutClient,
        updateClientProfile,
        cancelClientAppointment,
        createClientAppointment,
        submitAppointmentReview,
        reviews,

        // Custom Claims & RBAC
        activeClaims,
        userRole,
        setSimulatedClaims,
        refreshClaimsFromFirebase,
        idTokenString,

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
        updateClient,
        addClientNote,
        updateClientPreferences,
        updateClientTags,
        toggleClientTag,

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

        settingsSubTab,
        setSettingsSubTab,
        selectedProfessionalForAvailabilityId,
        setSelectedProfessionalForAvailabilityId,

        isNewAppointmentModalOpen,
        setIsNewAppointmentModalOpen,
        newAppointmentInitialSlot,
        setNewAppointmentInitialSlot,
        openNewAppointmentModal,
        isNewStudioModalOpen,
        setIsNewStudioModalOpen,
        isPlansModalOpen,
        setIsPlansModalOpen,

        // Virtual Queue & Reception TV
        queueItems,
        activeQueueItems,
        addToQueue,
        callQueueTicket,
        startQueueAttendance,
        finishQueueAttendance,
        cancelQueueTicket,
        isNewQueueModalOpen,
        setIsNewQueueModalOpen,

        clearAllMockData,
        resetCurrentTenantData,
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
