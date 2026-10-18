import { Business, Professional, Service, Appointment, Client, Comanda, SaaSPlan, NotificationItem } from '../types';

export const SAAS_PLANS: SaaSPlan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    priceMonthly: 129,
    maxProfessionals: 3,
    maxUnits: 1,
    features: [
      'Até 3 profissionais',
      'Agenda online inteligente',
      'Controle básico de serviços',
      'Comprovante digital por WhatsApp',
      'Suporte via e-mail',
    ],
  },
  {
    id: 'pro',
    name: 'Studio Pro',
    priceMonthly: 249,
    maxProfessionals: 10,
    maxUnits: 2,
    isPopular: true,
    features: [
      'Até 10 profissionais',
      'Multi-unidades (2 unidades)',
      'Fechamento de Comandas & Caixa (POS)',
      'Cálculo automático de comissões',
      'Acesso diferenciado (CEO, Gerente, Profissional)',
      'Relatórios e métricas de faturamento',
      'Notificações e lembretes automáticos',
    ],
  },
  {
    id: 'prime',
    name: 'Enterprise Prime',
    priceMonthly: 489,
    maxProfessionals: 999,
    maxUnits: 10,
    features: [
      'Profissionais ilimitados',
      'Até 10 filiais / franquias',
      'Módulo financeiro avançado DRE',
      'Gestão multi-nível de comissões',
      'API aberta & integração contábil',
      'Gerente de conta exclusivo 24/7',
    ],
  },
];

export const SUPER_ADMIN_CREDENTIALS = {
  name: 'Pedro Campos',
  email: 'pedro.projetos0770@gmail.com',
  password: 'asdfghjk',
  title: 'CEO da Plataforma Studio Digital',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
};

// All mock data cleared - production-ready empty initial states
export const INITIAL_BUSINESSES: Business[] = [];
export const INITIAL_PROFESSIONALS: Professional[] = [];
export const INITIAL_SERVICES: Service[] = [];
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_COMANDAS: Comanda[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
