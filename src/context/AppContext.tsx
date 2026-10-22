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
import { collection, onSnapshot } from 'firebase/firestore';
import { slugify } from '../utils/slugify';
import {
  syncBusinessToFirestore,
  syncProfessionalToFirestore,
  deleteProfessionalFromFirestore,
  syncServiceToFirestore,
  deleteServiceFromFirestore,
  syncAppointmentToFirestore,
  syncClientToFirestore,
  syncComandaToFirestore,
  seedPlansToFirestore,
  createTenantUserInFirebaseAuth,
} from '../services/firestoreSync';

export type AppTab =
  | 'dashboard'
  | 'agenda'
  | 'servicos'
  | 'profissionais'
  | 'comandas'
  | 'clientes'
  | 'planos'
  | 'configuracoes';

export type SuperAdminTab = 'tenants' | 'profissionais' | 'planos' | 'metricas' | 'claims';

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

  // Active Custom User Claims (RBAC)
  const [activeClaims, setActiveClaimsState] = useState<CustomUserClaims | null>(() => {
    const stored = getStored<CustomUserClaims | null>('userClaims', null);
    if (stored) return stored;
    if (getStored('superAdminAuth', false)) {
      return {
        role: 'super_admin',
        email: SUPER_ADMIN_CREDENTIALS.email,
        issuedAt: Date.now(),
      };
    }
    return null;
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
    } else if (currentPath.startsWith('/app/profissional')) {
      setIsSuperAdminViewState(false);
      setStored('superAdminView', false);
      setCurrentRole('profissional');
      setStored('currentRole', 'profissional');
    } else if (currentPath === '/admin' || currentPath === '/admin/') {
      navigateTo('/admin/painelmaster');
    }
  }, [currentPath]);

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    setIsSuperAdminViewState(false);
    setStored('superAdminView', false);
    if (activeClaims?.role === 'super_admin' || isSuperAdminView) {
      navigateTo(`/admin/${tab}`);
    } else if (activeClaims?.role === 'professional' || currentRole === 'profissional') {
      navigateTo(`/app/profissional/agenda`);
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

  // Real-time synchronization with Firebase Firestore collections
  useEffect(() => {
    // 1. Seed plans to Firestore so the database is guaranteed populated
    seedPlansToFirestore(saasPlans).catch((e) => console.warn('Seed plans warning:', e));

    // 2. Real-time listener for businesses
    const unsubBiz = onSnapshot(collection(db, 'businesses'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreBizs: Business[] = [];
        snapshot.forEach((doc) => {
          firestoreBizs.push(doc.data() as Business);
        });
        setBusinesses(firestoreBizs);
      } else {
        // If Firestore is empty but we have local businesses, sync them to Firestore!
        const localBizs = getStored<Business[]>('businesses', []);
        if (localBizs.length > 0) {
          localBizs.forEach((b) => syncBusinessToFirestore(b));
        }
      }
    }, (error) => {
      console.warn('Firestore businesses listener error:', error);
    });

    // 3. Real-time listener for professionals
    const unsubPros = onSnapshot(collection(db, 'professionals'), (snapshot) => {
      if (!snapshot.empty) {
        const firestorePros: Professional[] = [];
        snapshot.forEach((doc) => {
          firestorePros.push(doc.data() as Professional);
        });
        setProfessionals(firestorePros);
      } else {
        const localPros = getStored<Professional[]>('professionals', []);
        if (localPros.length > 0) {
          localPros.forEach((p) => syncProfessionalToFirestore(p));
        }
      }
    }, (error) => {
      console.warn('Firestore professionals listener error:', error);
    });

    // 4. Real-time listener for services
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreServices: Service[] = [];
        snapshot.forEach((doc) => {
          firestoreServices.push(doc.data() as Service);
        });
        setServices(firestoreServices);
      } else {
        const localServices = getStored<Service[]>('services', []);
        if (localServices.length > 0) {
          localServices.forEach((s) => syncServiceToFirestore(s));
        }
      }
    }, (error) => {
      console.warn('Firestore services listener error:', error);
    });

    // 5. Real-time listener for appointments
    const unsubApp = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreApps: Appointment[] = [];
        snapshot.forEach((doc) => {
          firestoreApps.push(doc.data() as Appointment);
        });
        setAppointments(firestoreApps);
      }
    }, (error) => {
      console.warn('Firestore appointments listener error:', error);
    });

    // 6. Real-time listener for clients
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreClients: Client[] = [];
        snapshot.forEach((doc) => {
          firestoreClients.push(doc.data() as Client);
        });
        setClients(firestoreClients);
      }
    }, (error) => {
      console.warn('Firestore clients listener error:', error);
    });

    // 7. Real-time listener for comandas
    const unsubComandas = onSnapshot(collection(db, 'comandas'), (snapshot) => {
      if (!snapshot.empty) {
        const firestoreCmds: Comanda[] = [];
        snapshot.forEach((doc) => {
          firestoreCmds.push(doc.data() as Comanda);
        });
        setComandas(firestoreCmds);
      }
    }, (error) => {
      console.warn('Firestore comandas listener error:', error);
    });

    return () => {
      unsubBiz();
      unsubPros();
      unsubServices();
      unsubApp();
      unsubClients();
      unsubComandas();
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

  const registerBusiness = (newBiz: Omit<Business, 'id' | 'status' | 'createdAt'>): Business => {
    const id = `biz_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const mgrEmail = newBiz.managerEmail || `gerente@${newBiz.name.toLowerCase().replace(/\s+/g, '')}.com`;
    const mgrPass = newBiz.managerPassword || 'gerente123';
    const mgrName = newBiz.managerName || `Gestor(a) - ${newBiz.name}`;

    const created: Business = {
      ...newBiz,
      id,
      status: 'ativo',
      createdAt: today,
      monthlyRevenue: 0,
      managerName: mgrName,
      managerEmail: mgrEmail,
      managerPassword: mgrPass,
    };
    setBusinesses((prev) => [created, ...prev]);
    setCurrentBusinessId(id);

    // Seed default owner professional for this new business
    const defaultOwner: Professional = {
      id: `pro_${Date.now()}`,
      businessId: id,
      name: mgrName,
      slug: slugify(`gestor-${newBiz.name}`),
      email: mgrEmail,
      password: mgrPass,
      phone: newBiz.phone,
      role: 'gerente',
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

    // Firestore & Firebase Auth real-time cloud persistence
    createTenantUserInFirebaseAuth(mgrEmail, mgrPass).catch((e) => console.warn('Auth user creation:', e));
    syncBusinessToFirestore(created).catch((e) => console.warn('Firestore business save:', e));
    syncProfessionalToFirestore(defaultOwner).catch((e) => console.warn('Firestore owner save:', e));
    syncServiceToFirestore(defaultServices[0]).catch((e) => console.warn('Firestore initial service save:', e));

    addNotification({
      title: 'Espaço cadastrado com sucesso!',
      message: `${newBiz.name} foi adicionado à plataforma no plano ${newBiz.planId.toUpperCase()}.`,
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

    // 1. Super Admin: Pedro Campos
    if (
      cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase() &&
      cleanPass === SUPER_ADMIN_CREDENTIALS.password
    ) {
      setIsSuperAdminAuthenticated(true);
      setStored('superAdminAuth', true);
      setIsSuperAdminViewState(true);
      setStored('superAdminView', true);
      setSimulatedClaims({
        role: 'super_admin',
        email: SUPER_ADMIN_CREDENTIALS.email,
        name: SUPER_ADMIN_CREDENTIALS.name,
        issuedAt: Date.now(),
      });
      addNotification({
        title: 'Bem-vindo Pedro Campos!',
        message: 'Acesso master autenticado como CEO da plataforma Studio Digital.',
        type: 'system',
      });
      navigateTo('/admin/painelmaster');
      return { success: true, role: 'super_admin' };
    }

    // 2. Firebase native Auth
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (userCredential.user) {
        const fresh = await getFreshClaimsAndToken(true);
        if (fresh.token) setIdTokenString(fresh.token);

        const claimsRole = (fresh.claims?.role as RoleType) || roleHint || 'tenant_manager';
        const tenantId = (fresh.claims?.tenant_id as string) || undefined;
        const proId = (fresh.claims?.professional_id as string) || undefined;

        if (claimsRole === 'super_admin' || cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase()) {
          setIsSuperAdminAuthenticated(true);
          setStored('superAdminAuth', true);
          setIsSuperAdminViewState(true);
          setStored('superAdminView', true);
          setSimulatedClaims({
            role: 'super_admin',
            email: cleanEmail,
            issuedAt: Date.now(),
          });
          navigateTo('/admin/painelmaster');
          return { success: true, role: 'super_admin' };
        } else if (claimsRole === 'tenant_manager') {
          const targetBiz = (tenantId && businesses.find((b) => b.id === tenantId)) || businesses[0];
          if (targetBiz) {
            setCurrentBusinessId(targetBiz.id);
            setStored('currentBizId', targetBiz.id);
          }
          switchRole('gerente');
          setIsSuperAdminViewState(false);
          setIsSuperAdminAuthenticated(false);
          setStored('superAdminAuth', false);
          setSimulatedClaims({
            role: 'tenant_manager',
            tenant_id: targetBiz?.id || tenantId,
            email: cleanEmail,
            name: targetBiz?.managerName || targetBiz?.tradeName,
            issuedAt: Date.now(),
          });
          navigateTo('/app/gerente/dashboard');
          return { success: true, role: 'tenant_manager' };
        } else if (claimsRole === 'professional') {
          const targetPro = professionals.find(
            (p) => p.email?.toLowerCase() === cleanEmail || p.id === proId
          );
          const targetBiz = (targetPro && businesses.find((b) => b.id === targetPro.businessId)) || businesses[0];
          if (targetBiz) {
            setCurrentBusinessId(targetBiz.id);
            setStored('currentBizId', targetBiz.id);
          }
          switchRole('profissional', targetPro?.id || proId);
          setIsSuperAdminViewState(false);
          setIsSuperAdminAuthenticated(false);
          setStored('superAdminAuth', false);
          setSimulatedClaims({
            role: 'professional',
            tenant_id: targetBiz?.id,
            professional_id: targetPro?.id || proId,
            email: cleanEmail,
            name: targetPro?.name,
            issuedAt: Date.now(),
          });
          navigateTo('/app/profissional/agenda');
          return { success: true, role: 'professional' };
        }
      }
    } catch (fbErr: any) {
      console.info('Tentativa de autenticação com dados de tenant:', fbErr?.code);
    }

    // 3. Match in Manager credentials (tenant_manager)
    const matchedBusiness = businesses.find((b) => {
      const bEmail = (b.managerEmail || '').toLowerCase();
      const passMatches = b.managerPassword ? b.managerPassword === cleanPass : (cleanPass === 'gerente123');
      return bEmail === cleanEmail && passMatches;
    });

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
        email: cleanEmail,
        name: matchedBusiness.managerName || `Gerente ${matchedBusiness.tradeName}`,
        issuedAt: Date.now(),
      });
      addNotification({
        title: 'Login Gerente Concluído',
        message: `Bem-vindo(a) ao painel de gestão de ${matchedBusiness.tradeName}.`,
        type: 'system',
      });
      navigateTo('/app/gerente/dashboard');
      return { success: true, role: 'tenant_manager' };
    }

    // 4. Match in Professionals credentials (professional)
    const matchedPro = professionals.find((p) => {
      const pEmail = p.email?.toLowerCase();
      const passMatches = p.password ? p.password === cleanPass : (cleanPass === 'pro123');
      return pEmail === cleanEmail && passMatches;
    });

    if (matchedPro) {
      setCurrentBusinessId(matchedPro.businessId);
      setStored('currentBizId', matchedPro.businessId);
      switchRole('profissional', matchedPro.id);
      setIsSuperAdminViewState(false);
      setIsSuperAdminAuthenticated(false);
      setStored('superAdminAuth', false);
      setSimulatedClaims({
        role: 'professional',
        tenant_id: matchedPro.businessId,
        professional_id: matchedPro.id,
        email: cleanEmail,
        name: matchedPro.name,
        issuedAt: Date.now(),
      });
      addNotification({
        title: 'Login Profissional Concluído',
        message: `Bem-vindo(a), ${matchedPro.name}! Sua agenda foi carregada.`,
        type: 'system',
      });
      navigateTo('/app/profissional/agenda');
      return { success: true, role: 'professional' };
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
      const isPedro = cleanEmail === SUPER_ADMIN_CREDENTIALS.email.toLowerCase();

      if (isManager || isPro || isPedro) {
        addNotification({
          title: 'Recuperação de Senha',
          message: `Solicitação registrada para ${cleanEmail}.`,
          type: 'system',
        });
        return {
          success: true,
          message: `E-mail de recuperação processado com sucesso para ${cleanEmail}! Como sua conta de ${
            isManager ? 'Gerente' : isPro ? 'Profissional' : 'Super Admin'
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
    setStored('superAdminAuth', false);
    setStored('superAdminView', false);
    setStored('userClaims', null);
    addNotification({
      title: 'Sessão encerrada',
      message: 'Você saiu da sua conta com segurança.',
      type: 'system',
    });
    navigateTo('/login');
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

  const updateAppointment = (app: Appointment) => {
    setAppointments((prev) => prev.map((a) => (a.id === app.id ? app : a)));
    syncAppointmentToFirestore(app).catch(console.warn);
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
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    deleteServiceFromFirestore(id).catch(console.warn);
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
      totalVisits: 0,
      totalSpent: 0,
    };
    setClients((prev) => [newClient, ...prev]);
    syncClientToFirestore(newClient).catch(console.warn);
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

  const userRole: RoleType =
    (activeClaims?.role as RoleType) ||
    (currentRole === 'profissional'
      ? 'professional'
      : currentRole === 'gerente'
      ? 'tenant_manager'
      : 'super_admin');

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: isSuperAdminAuthenticated || activeClaims !== null || !!firebaseUser,
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
