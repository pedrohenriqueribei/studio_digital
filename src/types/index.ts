export * from './rbac';

export type AppTab =
  | 'dashboard'
  | 'agenda'
  | 'fila'
  | 'servicos'
  | 'profissionais'
  | 'comandas'
  | 'clientes'
  | 'relatorios'
  | 'planos'
  | 'configuracoes';

export type UserRole = 'superadmin' | 'ceo' | 'gerente' | 'profissional' | 'super_admin' | 'tenant_manager' | 'client';

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
  tenant_id?: string;
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
  monthlyRevenueGoal?: number;
  managerName?: string;
  managerEmail?: string;
  managerPassword?: string;
  address?: string;
  neighborhood?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
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

export interface ShiftInterval {
  id: string;
  startTime: string; // "HH:mm" (ex: "08:00")
  endTime: string;   // "HH:mm" (ex: "12:00")
  label?: string;    // "Manhã", "Tarde", "Plantão", etc.
}

export interface AvailabilityPeriod {
  id: string;
  professionalId?: string;
  businessId?: string;
  tenant_id?: string;
  title?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysOfWeek: number[]; // 0 to 6 (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
  shifts: ShiftInterval[]; // Múltiplos turnos no dia (ex: 08:00-12:00 e 14:00-18:00)
  startTime?: string; // Para retrocompatibilidade (1º turno)
  endTime?: string;   // Para retrocompatibilidade (1º turno)
  intervalMinutes?: number;
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilityConfig extends AvailabilityPeriod {
  // Aliased for full backwards compatibility
}


export interface Professional {
  id: string;
  businessId: string;
  tenant_id?: string;
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
  averageRating?: number;
  totalReviews?: number;
  totalEarningsMonth: number;
  appointmentsCountMonth: number;
}

export interface Service {
  id: string;
  businessId: string;
  tenant_id?: string;
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
  tenant_id?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  professionalId: string;
  professionalName?: string;
  serviceId: string;
  serviceName: string;
  durationMinutes?: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  price: number;
  paymentStatus: 'pendente' | 'pago';
  notes?: string;
  rating?: number; // 1 to 5
  reviewComment?: string;
  reviewedAt?: string;
}

export interface Review {
  id: string;
  businessId: string;
  tenant_id?: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  professionalId: string;
  professionalName: string;
  serviceName: string;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: string;
}

export interface ClientNote {
  id: string;
  text: string;
  authorName: string;
  authorRole?: string;
  createdAt: string; // ISO date string
  isAlert?: boolean; // Highlight as health or chemical safety warning
}

export interface ClientPreferences {
  cutTypes?: string[];         // Ex: ["Degradê navalhado", "Long Bob em camadas", "Fade americano"]
  preferredColors?: string[];   // Ex: ["Castanho Iluminado 7.1", "Loiro Pérola", "Esmalte Vermelho Carmim"]
  allergies?: string[];        // Ex: ["Alergia a amônia", "Sensibilidade a esmalte comum", "Látex"]
  generalNotes?: string;       // Ex: "Prefere água morna, café sem açúcar"
}

export type ClientTagPreset = 'VIP' | 'Novo' | 'Recorrente' | 'Com débito';

export type ClientProfileStatus = 'Completo' | 'A Completar';

export interface Client {
  id: string;
  businessId: string;
  tenant_id?: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  photoURL?: string;
  birthDay?: number;   // 1 a 31
  birthMonth?: number; // 1 a 12
  birthDateFormatted?: string; // "DD/MM"
  emailVerified?: boolean;
  totalVisits: number;
  totalSpent: number;
  lastVisit?: string;
  preferredProfessionalId?: string;
  preferredProfessionalName?: string;
  notes?: string;
  tags?: string[]; // Segmentação rápida: 'VIP', 'Novo', 'Recorrente', 'Com débito'
  preferences?: ClientPreferences;
  importantNotes?: ClientNote[];
  status?: ClientProfileStatus | string;
  profileStatus?: ClientProfileStatus;
  createdAt?: string;
  updatedAt?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientRegistrationData {
  name: string;
  email: string;
  phone: string;
  birthDay: number;
  birthMonth: number;
  password: string;
  confirmPassword?: string;
  photoURL?: string;
  businessId?: string;
  existingClientId?: string;
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
  tenant_id?: string;
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

export type VirtualQueueStatus =
  | 'aguardando'      // Na fila de espera
  | 'chamado'         // Chamado no painel / TV
  | 'em_atendimento'  // Procedimento em andamento (comanda aberta)
  | 'concluido'       // Finalizado
  | 'desistiu'        // Cliente desistiu
  | 'cancelado';      // Cancelado pela recepção

export interface VirtualQueueItem {
  id: string;
  businessId: string;
  tenant_id?: string;
  ticketNumber: string;            // Ex: "A01", "B02", "S03"
  clientId?: string;               // Se for cliente cadastrado
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;         // Em minutos
  servicePrice: number;
  professionalId?: string;         // Profissional desejado pelo cliente
  professionalName?: string;
  anyProfessional: boolean;        // Se aceita qualquer profissional disponível
  assignedProfessionalId?: string; // Profissional que efetivamente assumiu o atendimento
  assignedProfessionalName?: string;
  status: VirtualQueueStatus;
  estimatedWaitMinutes: number;
  priorityAlert?: 'normal' | 'gap_curto' | 'proximo_de_agendamento';
  joinedAt: string;                // ISO
  calledAt?: string;               // ISO
  startedAt?: string;              // ISO
  completedAt?: string;            // ISO
  comandaId?: string;              // ID da comanda aberta no Caixa
  notes?: string;
}

