import { Appointment, Comanda, ComandaItem, Professional, Service } from '../types';

export interface ComandaItemBreakdown {
  item: ComandaItem;
  professionalId: string;
  professionalName: string;
  grossAmount: number;
  netAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
}

export interface ProfessionalSplitSummary {
  professionalId: string;
  professionalName: string;
  itemsCount: number;
  grossRevenue: number;
  netRevenue: number;
  commissionAmount: number;
  effectiveCommissionRate: number;
  items: ComandaItemBreakdown[];
}

export interface ComandaSplitResult {
  itemsBreakdown: ComandaItemBreakdown[];
  byProfessional: ProfessionalSplitSummary[];
  totalRevenue: number;
  totalCommissions: number;
  studioNetRevenue: number;
}

/**
 * Resolve o percentual de comissão aplicável a um item da comanda.
 * Prioridade:
 * 1. Percentual explicitamente gravado no item (item.commissionPercentage)
 * 2. Percentual configurado no serviço (service.commissionPercentage)
 * 3. Percentual padrão do profissional executor (professional.commissionPercentage)
 * 4. Para produtos sem profissional atribuído, 0%
 */
export function resolveItemCommissionPercentage(
  item: ComandaItem,
  services: Service[],
  professionals: Professional[],
  fallbackProId?: string
): number {
  if (typeof item.commissionPercentage === 'number' && !Number.isNaN(item.commissionPercentage)) {
    return Math.max(0, Math.min(100, item.commissionPercentage));
  }

  const targetProId = item.professionalId || fallbackProId;

  if (item.type === 'produto' && !item.professionalId) {
    return 0;
  }

  if (item.serviceId) {
    const srv = services.find((s) => s.id === item.serviceId);
    if (srv && typeof srv.commissionPercentage === 'number') {
      return Math.max(0, Math.min(100, srv.commissionPercentage));
    }
  } else if (item.type === 'servico') {
    const srvByName = services.find(
      (s) => s.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );
    if (srvByName && typeof srvByName.commissionPercentage === 'number') {
      return Math.max(0, Math.min(100, srvByName.commissionPercentage));
    }
  }

  if (targetProId) {
    const pro = professionals.find((p) => p.id === targetProId);
    if (pro && typeof pro.commissionPercentage === 'number') {
      return Math.max(0, Math.min(100, pro.commissionPercentage));
    }
  }

  return item.type === 'servico' ? 40 : 0;
}

/**
 * Retorna se determinado profissional participa de uma comanda (seja como titular ou em qualquer item).
 */
export function comandaInvolvesProfessional(comanda: Comanda, professionalId: string): boolean {
  if (!professionalId) return false;
  if (comanda.professionalId === professionalId) return true;
  if (comanda.professionalIds && comanda.professionalIds.includes(professionalId)) return true;
  return (comanda.items || []).some((it) => it.professionalId === professionalId);
}

/**
 * Retorna a lista de IDs distintos de profissionais envolvidos nos itens da comanda.
 */
export function getComandaProfessionalIds(comanda: Comanda): string[] {
  const set = new Set<string>();
  (comanda.items || []).forEach((it) => {
    if (it.professionalId) set.add(it.professionalId);
  });
  if (set.size === 0 && comanda.professionalId) {
    set.add(comanda.professionalId);
  }
  return Array.from(set);
}

/**
 * Formata uma legenda legível com os nomes dos profissionais envolvidos na comanda.
 */
export function getComandaProfessionalsLabel(
  comanda: Comanda,
  professionals: Professional[] = []
): string {
  const namesSet = new Set<string>();
  (comanda.items || []).forEach((it) => {
    if (it.professionalName) {
      namesSet.add(it.professionalName);
    } else if (it.professionalId) {
      const pro = professionals.find((p) => p.id === it.professionalId);
      if (pro) namesSet.add(pro.name);
    }
  });

  if (namesSet.size === 0) {
    return comanda.professionalName || 'Profissional';
  }
  return Array.from(namesSet).join(' + ');
}

/**
 * Calcula o fator proporcional líquido da comanda após descontos.
 * Ex: subtotal 200, desconto 20 -> total 180 -> fator 0.90.
 */
export function getComandaEffectiveFactor(comanda: Comanda): number {
  const subtotal =
    comanda.subtotal > 0
      ? comanda.subtotal
      : (comanda.items || []).reduce((acc, it) => acc + it.price * (it.quantity || 1), 0);

  if (subtotal <= 0) return 1;
  const effectiveTotal = Math.max(0, subtotal - (comanda.discount || 0));
  return Math.max(0, effectiveTotal / subtotal);
}

/**
 * Calcula o rateio completo da comanda: por item, por profissional, total de comissões e receita líquida do estabelecimento.
 */
export function getComandaProfessionalSplit(
  comanda: Comanda,
  services: Service[],
  professionals: Professional[]
): ComandaSplitResult {
  const effectiveFactor = getComandaEffectiveFactor(comanda);
  const items = comanda.items || [];

  const itemsBreakdown: ComandaItemBreakdown[] = items.map((item) => {
    // Itens de produto sem profissional atribuído pertencem diretamente ao estabelecimento ('__studio__')
    const hasExplicitPro = Boolean(item.professionalId);
    const fallbackProId = item.type === 'servico' ? comanda.professionalId : '';
    const resolvedProId = hasExplicitPro ? item.professionalId! : fallbackProId || '__studio__';

    let resolvedProName = 'Estabelecimento (Venda Balcão)';
    if (resolvedProId !== '__studio__') {
      const pro = professionals.find((p) => p.id === resolvedProId);
      resolvedProName =
        item.professionalName || pro?.name || comanda.professionalName || 'Profissional';
    }

    const grossAmount = (item.price || 0) * (item.quantity || 1);
    const netAmount = grossAmount * effectiveFactor;

    const commissionPercentage =
      resolvedProId === '__studio__'
        ? 0
        : resolveItemCommissionPercentage(item, services, professionals, comanda.professionalId);

    const commissionAmount = (netAmount * commissionPercentage) / 100;

    return {
      item,
      professionalId: resolvedProId,
      professionalName: resolvedProName,
      grossAmount,
      netAmount,
      commissionPercentage,
      commissionAmount,
    };
  });

  const proMap = new Map<string, ProfessionalSplitSummary>();

  itemsBreakdown.forEach((bd) => {
    const existing = proMap.get(bd.professionalId);
    if (existing) {
      existing.itemsCount += bd.item.quantity || 1;
      existing.grossRevenue += bd.grossAmount;
      existing.netRevenue += bd.netAmount;
      existing.commissionAmount += bd.commissionAmount;
      existing.items.push(bd);
      existing.effectiveCommissionRate =
        existing.netRevenue > 0 ? (existing.commissionAmount / existing.netRevenue) * 100 : 0;
    } else {
      proMap.set(bd.professionalId, {
        professionalId: bd.professionalId,
        professionalName: bd.professionalName,
        itemsCount: bd.item.quantity || 1,
        grossRevenue: bd.grossAmount,
        netRevenue: bd.netAmount,
        commissionAmount: bd.commissionAmount,
        effectiveCommissionRate: bd.commissionPercentage,
        items: [bd],
      });
    }
  });

  const byProfessional = Array.from(proMap.values()).sort(
    (a, b) => b.netRevenue - a.netRevenue
  );

  const totalRevenue = Math.max(
    0,
    comanda.total ?? Math.max(0, (comanda.subtotal || 0) - (comanda.discount || 0))
  );
  const totalCommissions = itemsBreakdown.reduce((acc, bd) => acc + bd.commissionAmount, 0);
  const studioNetRevenue = Math.max(0, totalRevenue - totalCommissions);

  return {
    itemsBreakdown,
    byProfessional,
    totalRevenue,
    totalCommissions,
    studioNetRevenue,
  };
}

/**
 * Retorna a fatia exata de faturamento e comissão de um profissional específico dentro de uma comanda.
 */
export function getComandaRevenueForProfessional(
  comanda: Comanda,
  professionalId: string,
  services: Service[],
  professionals: Professional[]
): {
  revenue: number;
  commission: number;
  itemsCount: number;
  hasParticipation: boolean;
} {
  if (!professionalId || !comandaInvolvesProfessional(comanda, professionalId)) {
    return { revenue: 0, commission: 0, itemsCount: 0, hasParticipation: false };
  }

  const split = getComandaProfessionalSplit(comanda, services, professionals);
  const match = split.byProfessional.find((p) => p.professionalId === professionalId);

  if (!match) {
    return { revenue: 0, commission: 0, itemsCount: 0, hasParticipation: false };
  }

  return {
    revenue: match.netRevenue,
    commission: match.commissionAmount,
    itemsCount: match.itemsCount,
    hasParticipation: true,
  };
}

/**
 * Verifica se um agendamento já possui uma comanda fechada associada para evitar dupla contagem.
 */
export function isAppointmentCoveredByClosedComanda(
  app: Appointment,
  closedComandas: Comanda[]
): boolean {
  return closedComandas.some(
    (c) =>
      c.status === 'fechada' &&
      (c.id === app.comandaId ||
        c.appointmentId === app.id ||
        (c.appointmentIds && c.appointmentIds.includes(app.id)) ||
        (c.items || []).some((it) => it.appointmentId === app.id))
  );
}

/**
 * Calcula ganhos e volume de atendimentos de um profissional em determinado mês (YYYY-MM).
 */
export function computeProfessionalMonthMetrics(
  professionalId: string,
  comandas: Comanda[],
  appointments: Appointment[],
  services: Service[],
  professionals: Professional[],
  monthPrefix: string = new Date().toISOString().slice(0, 7)
): {
  grossRevenue: number;
  commissionEarnings: number;
  appointmentsCount: number;
} {
  const closedMonthComandas = comandas.filter((c) => {
    if (c.status !== 'fechada') return false;
    const dateRef = (c.closedAt || c.createdAt || '').slice(0, 10);
    return dateRef.startsWith(monthPrefix);
  });

  let grossRevenue = 0;
  let commissionEarnings = 0;

  closedMonthComandas.forEach((cmd) => {
    const share = getComandaRevenueForProfessional(cmd, professionalId, services, professionals);
    if (share.hasParticipation) {
      grossRevenue += share.revenue;
      commissionEarnings += share.commission;
    }
  });

  const proMonthApps = appointments.filter(
    (a) =>
      a.professionalId === professionalId &&
      a.date.startsWith(monthPrefix) &&
      a.status !== 'cancelado'
  );

  // Inclui agendamentos concluídos/pagos que porventura não tenham comanda fechada associada
  proMonthApps.forEach((app) => {
    if (
      (app.status === 'concluido' || app.paymentStatus === 'pago') &&
      !isAppointmentCoveredByClosedComanda(app, closedMonthComandas)
    ) {
      const srv = services.find((s) => s.id === app.serviceId);
      const pro = professionals.find((p) => p.id === professionalId);
      const pct = srv?.commissionPercentage ?? pro?.commissionPercentage ?? 40;
      grossRevenue += app.price || 0;
      commissionEarnings += ((app.price || 0) * pct) / 100;
    }
  });

  return {
    grossRevenue,
    commissionEarnings,
    appointmentsCount: proMonthApps.length,
  };
}
