export * from './rbac';

export type UserRole = 'superadmin' | 'ceo' | 'gerente' | 'profissional' | 'super_admin' | 'tenant_manager';

export type BusinessType = 'clinica_estetica' | 'salao_beleza' | 'barbearia';

export type TenantStatus = 'ativo' | 'degustacao' | 'suspenso';

export interface SaaSPlan {
  id: string;
  name: string;
  priceMonthly: number;
  maxProfessionals: number;
  maxUnits: number;
  features: string[];
  isPopular?: boolean;
  description?: string;
  active?: boolean;
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  tradeName: string;
  city: string;
  state: string;
  phone: string;
  cnpj?: string;
  planId: string;
  accentColor: string;
  avatarUrl?: string;
  status: TenantStatus;
  createdAt: string;
  monthlyRevenue?: number;
  managerName?: string;
  managerEmail?: string;
  managerPassword?: string;
}

export interface PlatformAdminUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin';
  title: string;
  avatar: string;
  authenticated: boolean;
}

export interface AvailabilityConfig {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysOfWeek: number[]; // 0 to 6 (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  intervalMinutes?: number;
  notes?: string;
  active: boolean;
  updatedAt?: string;
}

export interface Professional {
  id: string;
  businessId: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  avatar: string;
  specialties: string[];
  commissionPercentage: number;
  bio?: string;
  slug?: string;
  coverImage?: string;
  instagram?: string;
  active: boolean;
  workHours: {
    start: string; // "09:00"
    end: string;   // "19:00"
    daysOfWeek: number[]; // 1 to 6 (Seg a Sab)
  };
  availabilityConfig?: AvailabilityConfig;
  availabilityPeriods?: AvailabilityConfig[];
  totalEarningsMonth: number;
  appointmentsCountMonth: number;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  commissionPercentage: number;
  description: string;
  allowedProfessionalIds: string[]; // empty means all
  active: boolean;
}

export type AppointmentStatus = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado';

export interface Appointment {
  id: string;
  businessId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  professionalId: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  price: number;
  paymentStatus: 'pendente' | 'pago';
  notes?: string;
}

export interface Client {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit?: string;
  preferredProfessionalId?: string;
  notes?: string;
}

export interface ComandaItem {
  id: string;
  name: string;
  type: 'servico' | 'produto';
  price: number;
  quantity: number;
}

export interface Comanda {
  id: string;
  businessId: string;
  appointmentId?: string;
  clientName: string;
  clientPhone: string;
  professionalId: string;
  professionalName: string;
  items: ComandaItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  status: 'aberta' | 'fechada';
  createdAt: string;
  closedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'payment' | 'system' | 'reminder';
}
