import React, { useMemo, useState } from 'react';
import {
  Award,
  Gift,
  TrendingUp,
  Repeat,
  Clock,
  DollarSign,
  Users,
  Search,
  Download,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Appointment, Business, Client, Comanda, LoyaltyTransaction, Professional } from '../../types';
import { formatCurrency } from '../../utils/availability';
import { getBusinessLoyaltyConfig, getClientLoyaltyStatus } from '../../utils/loyalty';
import { comandaInvolvesProfessional, isAppointmentCoveredByClosedComanda } from '../../utils/commissions';

interface LoyaltyAnalyticsReportProps {
  clients: Client[];
  appointments: Appointment[];
  comandas: Comanda[];
  professionals: Professional[];
  business: Business | null;
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
  selectedProId?: string;
  onNavigateToClients?: () => void;
  onExportSuccess?: (message: string) => void;
}

type ClientSegmentFilter = 'all' | 'ready' | 'redeemed' | 'recurring' | 'in_progress';
type ClientSortOption = 'points_desc' | 'visits_desc' | 'revenue_desc' | 'redeemed_desc' | 'recent_desc';

interface ClientPerformanceRow {
  client: Client;
  visitsCount: number;
  periodVisitsCount: number;
  totalSpent: number;
  periodRevenue: number;
  avgTicket: number;
  avgReturnDays: number | null;
  lastVisitDate: string | null;
  points: number;
  threshold: number;
  totalEarned: number;
  rewardsRedeemed: number;
  availableRewardsCount: number;
  isRewardReady: boolean;
  progressPercent: number;
  remainingToReward: number;
  isRecurring: boolean;
  isLoyaltyEngaged: boolean;
  preferredProName?: string;
}

interface RedemptionEvent {
  id: string;
  clientId: string;
  clientName: string;
  description: string;
  points: number;
  createdAt: string;
  authorName?: string;
}

const SEGMENT_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#94a3b8'];

function formatDateBr(isoOrDate?: string | null): string {
  if (!isoOrDate) return '—';
  const clean = isoOrDate.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function normalizePhone(phone?: string): string {
  return (phone || '').replace(/\D/g, '');
}

export const LoyaltyAnalyticsReport: React.FC<LoyaltyAnalyticsReportProps> = ({
  clients,
  appointments,
  comandas,
  professionals,
  business,
  startDate,
  endDate,
  dateRangeLabel,
  selectedProId = 'all',
  onNavigateToClients,
  onExportSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<ClientSegmentFilter>('all');
  const [sortBy, setSortBy] = useState<ClientSortOption>('points_desc');
  const [showAllRows, setShowAllRows] = useState(false);

  const loyaltyConfig = useMemo(() => getBusinessLoyaltyConfig(business), [business]);

  const analytics = useMemo(() => {
    const proMap = new Map<string, Professional>();
    professionals.forEach((p) => proMap.set(p.id, p));

    // Build fast client lookup indices
    const clientById = new Map<string, Client>();
    const clientByPhone = new Map<string, Client>();
    const clientByName = new Map<string, Client>();

    clients.forEach((c) => {
      clientById.set(c.id, c);
      const phone = normalizePhone(c.phone);
      if (phone.length >= 8) {
        clientByPhone.set(phone, c);
        clientByPhone.set(phone.slice(-8), c);
      }
      const nameKey = (c.name || '').trim().toLowerCase();
      if (nameKey) {
        clientByName.set(nameKey, c);
      }
    });

    const resolveClientId = (criteria: { clientId?: string; clientPhone?: string; clientName?: string }): string | null => {
      if (criteria.clientId && clientById.has(criteria.clientId)) {
        return criteria.clientId;
      }
      const phone = normalizePhone(criteria.clientPhone);
      if (phone.length >= 8) {
        const matched = clientByPhone.get(phone) || clientByPhone.get(phone.slice(-8));
        if (matched) return matched.id;
      }
      const nameKey = (criteria.clientName || '').trim().toLowerCase();
      if (nameKey) {
        const matched = clientByName.get(nameKey);
        if (matched) return matched.id;
      }
      return null;
    };

    // Group non-cancelled appointments by resolved client
    const apptsByClient = new Map<string, Appointment[]>();
    const scopedAppointments = appointments.filter((a) => {
      if (a.status === 'cancelado') return false;
      if (selectedProId !== 'all' && a.professionalId !== selectedProId) return false;
      return true;
    });

    scopedAppointments.forEach((a) => {
      const cId = resolveClientId({
        clientId: a.clientId,
        clientPhone: a.clientPhone,
        clientName: a.clientName,
      });
      if (!cId) return;
      const list = apptsByClient.get(cId) || [];
      list.push(a);
      apptsByClient.set(cId, list);
    });

    // Group closed comandas by resolved client
    const comandasByClient = new Map<string, Comanda[]>();
    const scopedComandas = comandas.filter((c) => {
      if (c.status !== 'fechada') return false;
      if (selectedProId !== 'all' && !comandaInvolvesProfessional(c, selectedProId)) return false;
      return true;
    });

    scopedComandas.forEach((cmd) => {
      const cId = resolveClientId({
        clientPhone: cmd.clientPhone,
        clientName: cmd.clientName,
      });
      if (!cId) return;
      const list = comandasByClient.get(cId) || [];
      list.push(cmd);
      comandasByClient.set(cId, list);
    });

    // Filter clients if professional filter is active (only clients who have activity or preferred pro match)
    const activeClientPool =
      selectedProId === 'all'
        ? clients
        : clients.filter(
            (c) =>
              c.preferredProfessionalId === selectedProId ||
              (apptsByClient.get(c.id)?.length || 0) > 0 ||
              (comandasByClient.get(c.id)?.length || 0) > 0
          );

    const returnIntervalsAll: number[] = [];
    const redemptionEvents: RedemptionEvent[] = [];

    let periodPointsEarned = 0;
    let periodPointsRedeemed = 0;
    let periodRedemptionsCount = 0;
    let periodReturnVisits = 0;
    let periodNewClientVisits = 0;

    // Daily/Timeline buckets map
    const timelineMap = new Map<
      string,
      {
        date: string;
        pointsEarned: number;
        pointsRedeemed: number;
        redemptionsCount: number;
        returnVisits: number;
      }
    >();

    const ensureBucket = (dateKey: string) => {
      let existing = timelineMap.get(dateKey);
      if (!existing) {
        existing = {
          date: dateKey,
          pointsEarned: 0,
          pointsRedeemed: 0,
          redemptionsCount: 0,
          returnVisits: 0,
        };
        timelineMap.set(dateKey, existing);
      }
      return existing;
    };

    const rows: ClientPerformanceRow[] = activeClientPool.map((client) => {
      const status = getClientLoyaltyStatus(client, loyaltyConfig);
      const clientAppts = [...(apptsByClient.get(client.id) || [])].sort((a, b) =>
        `${a.date}_${a.startTime}`.localeCompare(`${b.date}_${b.startTime}`)
      );
      const clientComandas = comandasByClient.get(client.id) || [];

      // Unique visit dates from appointments + comandas
      const visitDateSet = new Set<string>();
      clientAppts.forEach((a) => {
        if (a.date) visitDateSet.add(a.date.slice(0, 10));
      });
      clientComandas.forEach((c) => {
        const d = (c.closedAt || c.createdAt || '').slice(0, 10);
        if (d) visitDateSet.add(d);
      });
      const sortedUniqueDates = Array.from(visitDateSet).sort();

      // Calculate return intervals (days between consecutive unique visits)
      const clientIntervals: number[] = [];
      for (let i = 1; i < sortedUniqueDates.length; i++) {
        const prev = new Date(`${sortedUniqueDates[i - 1]}T00:00:00`).getTime();
        const curr = new Date(`${sortedUniqueDates[i]}T00:00:00`).getTime();
        const diffDays = Math.round((curr - prev) / 86400000);
        if (diffDays > 0) {
          clientIntervals.push(diffDays);
          returnIntervalsAll.push(diffDays);
        }
      }
      const avgReturnDays =
        clientIntervals.length > 0
          ? Math.round(clientIntervals.reduce((acc, v) => acc + v, 0) / clientIntervals.length)
          : null;

      // Visits count & period return visits
      const visitsCount = Math.max(client.totalVisits || 0, sortedUniqueDates.length, clientAppts.length > 0 ? clientAppts.length : 0);
      const periodAppts = clientAppts.filter((a) => a.date >= startDate && a.date <= endDate);
      const periodVisitsCount = periodAppts.length;

      const firstVisitDate = sortedUniqueDates[0] || client.createdAt?.slice(0, 10) || null;
      periodAppts.forEach((a) => {
        const isReturnInPeriod =
          (firstVisitDate && a.date > firstVisitDate) ||
          (client.totalVisits || 0) >= 2 ||
          (client.loyaltyTotalEarned || 0) >= 2;
        if (isReturnInPeriod) {
          periodReturnVisits += 1;
          ensureBucket(a.date).returnVisits += 1;
        } else {
          periodNewClientVisits += 1;
        }
      });

      // Revenue (avoid double counting appointments already in closed comandas)
      const derivedClosedComandasTotal = clientComandas.reduce((sum, c) => sum + (c.total || 0), 0);
      const uncoveredApptsTotal = clientAppts
        .filter((a) => !isAppointmentCoveredByClosedComanda(a, clientComandas) && (a.status === 'concluido' || a.paymentStatus === 'pago'))
        .reduce((sum, a) => sum + (a.price || 0), 0);
      const derivedRevenue = derivedClosedComandasTotal + uncoveredApptsTotal;

      const periodClosedComandas = clientComandas.filter((c) => {
        const d = (c.closedAt || c.createdAt || '').slice(0, 10);
        return d >= startDate && d <= endDate;
      });
      const periodUncoveredAppts = periodAppts.filter(
        (a) => !isAppointmentCoveredByClosedComanda(a, periodClosedComandas) && (a.status === 'concluido' || a.paymentStatus === 'pago')
      );
      const periodRevenue =
        periodClosedComandas.reduce((sum, c) => sum + (c.total || 0), 0) +
        periodUncoveredAppts.reduce((sum, a) => sum + (a.price || 0), 0);

      const totalSpent = selectedProId === 'all' ? Math.max(client.totalSpent || 0, derivedRevenue) : derivedRevenue;
      const avgTicket = visitsCount > 0 ? totalSpent / visitsCount : totalSpent;

      const lastVisitDate =
        sortedUniqueDates.length > 0
          ? sortedUniqueDates[sortedUniqueDates.length - 1]
          : client.lastVisit
          ? client.lastVisit.slice(0, 10)
          : null;

      // Loyalty history aggregation within period + lifetime redemption ledger
      const history: LoyaltyTransaction[] = client.loyaltyHistory || [];
      let redeemHistoryCount = 0;

      history.forEach((tx) => {
        const txDate = (tx.createdAt || '').slice(0, 10);
        const inRange = txDate >= startDate && txDate <= endDate;

        if (tx.type === 'earn' || (tx.type === 'adjust' && tx.points > 0)) {
          const pts = Math.max(0, tx.points);
          if (inRange) {
            periodPointsEarned += pts;
            ensureBucket(txDate).pointsEarned += pts;
          }
        } else if (tx.type === 'redeem') {
          redeemHistoryCount += 1;
          const ptsAbs = Math.abs(tx.points);
          redemptionEvents.push({
            id: tx.id,
            clientId: client.id,
            clientName: client.name,
            description: tx.description,
            points: ptsAbs,
            createdAt: tx.createdAt,
            authorName: tx.authorName,
          });
          if (inRange) {
            periodRedemptionsCount += 1;
            periodPointsRedeemed += ptsAbs;
            const bucket = ensureBucket(txDate);
            bucket.redemptionsCount += 1;
            bucket.pointsRedeemed += ptsAbs;
          }
        }
      });

      const rewardsRedeemed = Math.max(status.rewardsRedeemed, redeemHistoryCount);
      const isRecurring = visitsCount >= 2;
      const isLoyaltyEngaged = status.totalEarned > 0 || status.points > 0 || rewardsRedeemed > 0;
      const preferredProName =
        client.preferredProfessionalName ||
        (client.preferredProfessionalId ? proMap.get(client.preferredProfessionalId)?.name : undefined);

      return {
        client,
        visitsCount,
        periodVisitsCount,
        totalSpent,
        periodRevenue,
        avgTicket,
        avgReturnDays,
        lastVisitDate,
        points: status.points,
        threshold: status.threshold,
        totalEarned: status.totalEarned,
        rewardsRedeemed,
        availableRewardsCount: status.availableRewardsCount,
        isRewardReady: status.isRewardReady,
        progressPercent: status.progressPercent,
        remainingToReward: status.remainingToReward,
        isRecurring,
        isLoyaltyEngaged,
        preferredProName,
      };
    });

    // Aggregate KPIs
    const totalClientsCount = rows.length;
    const recurringClients = rows.filter((r) => r.isRecurring);
    const singleVisitClients = rows.filter((r) => !r.isRecurring);
    const loyalEngagedClients = rows.filter((r) => r.isRecurring || r.isLoyaltyEngaged);
    const nonLoyalClients = rows.filter((r) => !r.isRecurring && !r.isLoyaltyEngaged);

    const returningClientsCount = recurringClients.length;
    const returnRate = totalClientsCount > 0 ? Math.round((returningClientsCount / totalClientsCount) * 100) : 0;

    const avgReturnDays =
      returnIntervalsAll.length > 0
        ? Math.round(returnIntervalsAll.reduce((acc, v) => acc + v, 0) / returnIntervalsAll.length)
        : null;

    const avgVisitsPerLoyal =
      returningClientsCount > 0
        ? Number((recurringClients.reduce((acc, r) => acc + r.visitsCount, 0) / returningClientsCount).toFixed(1))
        : 0;

    const totalBaseRevenue = rows.reduce((acc, r) => acc + r.totalSpent, 0);
    const loyalRevenueTotal = loyalEngagedClients.reduce((acc, r) => acc + r.totalSpent, 0);
    const nonLoyalRevenueTotal = nonLoyalClients.reduce((acc, r) => acc + r.totalSpent, 0);
    const loyalRevenueShare = totalBaseRevenue > 0 ? Math.round((loyalRevenueTotal / totalBaseRevenue) * 100) : 0;

    const loyalTotalVisits = loyalEngagedClients.reduce((acc, r) => acc + Math.max(1, r.visitsCount), 0);
    const nonLoyalTotalVisits = nonLoyalClients.reduce((acc, r) => acc + Math.max(1, r.visitsCount), 0);
    const loyalTicketMedio = loyalTotalVisits > 0 ? loyalRevenueTotal / loyalTotalVisits : 0;
    const singleTicketMedio = nonLoyalTotalVisits > 0 ? nonLoyalRevenueTotal / nonLoyalTotalVisits : 0;

    const loyalAvgVisits =
      loyalEngagedClients.length > 0
        ? Number((loyalEngagedClients.reduce((acc, r) => acc + r.visitsCount, 0) / loyalEngagedClients.length).toFixed(1))
        : 0;
    const nonLoyalAvgVisits =
      nonLoyalClients.length > 0
        ? Number((nonLoyalClients.reduce((acc, r) => acc + r.visitsCount, 0) / nonLoyalClients.length).toFixed(1))
        : 0;

    // Loyalty program usage metrics
    const totalRewardsRedeemedLifetime = rows.reduce((acc, r) => acc + r.rewardsRedeemed, 0);
    const clientsWithRedemptionCount = rows.filter((r) => r.rewardsRedeemed > 0).length;
    const clientsReadyCount = rows.filter((r) => r.isRewardReady).length;
    const totalReadyRewardsCount = rows.reduce((acc, r) => acc + r.availableRewardsCount, 0);
    const activePointsBalance = rows.reduce((acc, r) => acc + r.points, 0);
    const totalPointsEarnedLifetime = rows.reduce((acc, r) => acc + r.totalEarned, 0);
    const participatingClientsCount = rows.filter((r) => r.totalEarned > 0 || r.points > 0 || r.rewardsRedeemed > 0).length;
    const loyaltyAdoptionRate = totalClientsCount > 0 ? Math.round((participatingClientsCount / totalClientsCount) * 100) : 0;

    const totalUnlockedRewards = totalRewardsRedeemedLifetime + totalReadyRewardsCount;
    const redemptionUtilizationRate =
      totalUnlockedRewards > 0 ? Math.round((totalRewardsRedeemedLifetime / totalUnlockedRewards) * 100) : 0;

    // Tier distribution for pie chart
    const readyTier = rows.filter((r) => r.isRewardReady).length;
    const nearRewardTier = rows.filter((r) => !r.isRewardReady && r.progressPercent >= 50).length;
    const startingTier = rows.filter((r) => !r.isRewardReady && r.points > 0 && r.progressPercent < 50).length;
    const zeroPointsTier = rows.filter((r) => r.points === 0).length;

    const distributionData = [
      { name: 'Prêmio Disponível', value: readyTier, color: SEGMENT_COLORS[0] },
      { name: 'Quase lá (50%–99%)', value: nearRewardTier, color: SEGMENT_COLORS[1] },
      { name: 'Iniciando (1–49%)', value: startingTier, color: SEGMENT_COLORS[2] },
      { name: 'Sem Pontos (0 pts)', value: zeroPointsTier, color: SEGMENT_COLORS[3] },
    ].filter((d) => d.value > 0);

    // Build continuous timeline series within [startDate, endDate]
    const timelineSeries: Array<{
      label: string;
      date: string;
      pointsEarned: number;
      pointsRedeemed: number;
      redemptionsCount: number;
      returnVisits: number;
    }> = [];

    const startObj = new Date(`${startDate}T00:00:00`);
    const endObj = new Date(`${endDate}T00:00:00`);
    const totalDaysSpan = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / 86400000) + 1);

    if (totalDaysSpan <= 35) {
      // Daily granularity
      for (let i = 0; i < totalDaysSpan; i++) {
        const d = new Date(startObj);
        d.setDate(startObj.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const bucket = timelineMap.get(key);
        timelineSeries.push({
          date: key,
          label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          pointsEarned: bucket?.pointsEarned || 0,
          pointsRedeemed: bucket?.pointsRedeemed || 0,
          redemptionsCount: bucket?.redemptionsCount || 0,
          returnVisits: bucket?.returnVisits || 0,
        });
      }
    } else {
      // Weekly or Monthly aggregation for long spans
      const useMonthly = totalDaysSpan > 120;
      const grouped = new Map<
        string,
        { label: string; date: string; pointsEarned: number; pointsRedeemed: number; redemptionsCount: number; returnVisits: number }
      >();

      for (let i = 0; i < totalDaysSpan; i++) {
        const d = new Date(startObj);
        d.setDate(startObj.getDate() + i);
        const dayKey = d.toISOString().slice(0, 10);
        const groupKey = useMonthly
          ? dayKey.slice(0, 7)
          : `${dayKey.slice(0, 4)}-S${String(Math.floor(i / 7) + 1).padStart(2, '0')}`;
        const label = useMonthly
          ? `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
          : `Sem ${Math.floor(i / 7) + 1}`;

        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, {
            label,
            date: dayKey,
            pointsEarned: 0,
            pointsRedeemed: 0,
            redemptionsCount: 0,
            returnVisits: 0,
          });
        }
        const entry = grouped.get(groupKey)!;
        const bucket = timelineMap.get(dayKey);
        if (bucket) {
          entry.pointsEarned += bucket.pointsEarned;
          entry.pointsRedeemed += bucket.pointsRedeemed;
          entry.redemptionsCount += bucket.redemptionsCount;
          entry.returnVisits += bucket.returnVisits;
        }
      }
      grouped.forEach((v) => timelineSeries.push(v));
    }

    redemptionEvents.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return {
      rows,
      totalClientsCount,
      returningClientsCount,
      singleVisitCount: singleVisitClients.length,
      loyalEngagedCount: loyalEngagedClients.length,
      nonLoyalCount: nonLoyalClients.length,
      returnRate,
      avgReturnDays,
      avgVisitsPerLoyal,
      totalBaseRevenue,
      loyalRevenueTotal,
      nonLoyalRevenueTotal,
      loyalRevenueShare,
      loyalTicketMedio,
      singleTicketMedio,
      loyalAvgVisits,
      nonLoyalAvgVisits,
      periodPointsEarned,
      periodPointsRedeemed,
      periodRedemptionsCount,
      periodReturnVisits,
      periodNewClientVisits,
      totalRewardsRedeemedLifetime,
      clientsWithRedemptionCount,
      clientsReadyCount,
      totalReadyRewardsCount,
      activePointsBalance,
      totalPointsEarnedLifetime,
      participatingClientsCount,
      loyaltyAdoptionRate,
      redemptionUtilizationRate,
      distributionData,
      timelineSeries,
      redemptionEvents,
    };
  }, [clients, appointments, comandas, professionals, loyaltyConfig, startDate, endDate, selectedProId]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = analytics.rows.filter((row) => {
      if (query) {
        const matchesName = row.client.name.toLowerCase().includes(query);
        const matchesPhone = (row.client.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) return false;
      }

      switch (segmentFilter) {
        case 'ready':
          return row.isRewardReady;
        case 'redeemed':
          return row.rewardsRedeemed > 0;
        case 'recurring':
          return row.isRecurring;
        case 'in_progress':
          return row.points > 0 && !row.isRewardReady;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points_desc':
          return b.points - a.points || b.totalEarned - a.totalEarned || b.totalSpent - a.totalSpent;
        case 'visits_desc':
          return b.visitsCount - a.visitsCount || b.totalSpent - a.totalSpent;
        case 'revenue_desc':
          return b.totalSpent - a.totalSpent || b.visitsCount - a.visitsCount;
        case 'redeemed_desc':
          return b.rewardsRedeemed - a.rewardsRedeemed || b.points - a.points;
        case 'recent_desc':
          return (b.lastVisitDate || '').localeCompare(a.lastVisitDate || '');
        default:
          return 0;
      }
    });
  }, [analytics.rows, searchTerm, segmentFilter, sortBy]);

  const displayedRows = showAllRows ? filteredRows : filteredRows.slice(0, 15);

  const handleExportLoyaltyCSV = () => {
    try {
      const headers = [
        'Cliente',
        'Telefone',
        'Visitas_Totais',
        'Visitas_Periodo',
        'Ciclo_Medio_Retorno_Dias',
        'Receita_Total_R$',
        'Ticket_Medio_R$',
        'Pontos_Atuais',
        'Meta_Premio',
        'Total_Pontos_Acumulados',
        'Beneficios_Resgatados',
        'Premio_Disponivel',
        'Ultima_Visita',
      ];

      const csvRows = filteredRows.map((r) => [
        `"${(r.client.name || '').replace(/"/g, '""')}"`,
        `"${(r.client.phone || '').replace(/"/g, '""')}"`,
        r.visitsCount,
        r.periodVisitsCount,
        r.avgReturnDays !== null ? r.avgReturnDays : '-',
        r.totalSpent.toFixed(2),
        r.avgTicket.toFixed(2),
        r.points,
        r.threshold,
        r.totalEarned,
        r.rewardsRedeemed,
        r.isRewardReady ? 'Sim' : 'Nao',
        r.lastVisitDate || '-',
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `fidelidade_retorno_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExportSuccess?.('Relatório de Cartão Fidelidade exportado em CSV com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar CSV de fidelidade:', err);
    }
  };

  const hasTimelineActivity = analytics.timelineSeries.some(
    (d) => d.pointsEarned > 0 || d.pointsRedeemed > 0 || d.returnVisits > 0
  );

  const ticketLiftPercent =
    analytics.singleTicketMedio > 0 && analytics.loyalTicketMedio > 0
      ? Math.round(((analytics.loyalTicketMedio - analytics.singleTicketMedio) / analytics.singleTicketMedio) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho Contextual do Programa de Fidelidade */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Desempenho de Clientes Fiéis & Cartão Fidelidade
            </span>
            <span className="text-slate-300">·</span>
            <span className={loyaltyConfig.enabled ? 'text-emerald-700 font-semibold' : 'text-slate-500 font-semibold'}>
              Programa {loyaltyConfig.enabled ? 'Ativo' : 'Pausado'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Regra atual: <strong className="text-slate-700">+{loyaltyConfig.pointsPerService} pt</strong> por serviço concluído · Meta de resgate:{' '}
            <strong className="text-slate-700 font-mono tabular-nums">{loyaltyConfig.rewardThreshold} pts</strong> · Prêmio:{' '}
            <strong className="text-slate-700">{loyaltyConfig.rewardTitle}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportLoyaltyCSV}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar CSV Fidelidade</span>
          </button>

          {onNavigateToClients && (
            <button
              type="button"
              onClick={onNavigateToClients}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Gerenciar Cartões</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip: 4 Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Taxa de Retorno */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Taxa de Retorno da Base
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {analytics.returnRate}%
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
              {analytics.returningClientsCount}/{analytics.totalClientsCount} clientes
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {analytics.periodReturnVisits} atendimentos de retorno no período
          </p>
        </div>

        {/* KPI 2: Intervalo & Frequência Média */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ciclo Médio de Retorno
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {analytics.avgReturnDays !== null ? `${analytics.avgReturnDays} dias` : '—'}
            </span>
            {analytics.avgVisitsPerLoyal > 0 && (
              <span className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                {analytics.avgVisitsPerLoyal} visitas/fiel
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {analytics.avgReturnDays !== null
              ? 'Intervalo médio entre retornos consecutivos'
              : 'Aguardando 2ª visita em datas distintas'}
          </p>
        </div>

        {/* KPI 3: Impacto Financeiro dos Clientes Fiéis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Receita de Clientes Fiéis
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {analytics.loyalRevenueShare}%
            </span>
            <span className="text-xs font-mono tabular-nums text-indigo-700 font-semibold">
              {formatCurrency(analytics.loyalRevenueTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate font-mono tabular-nums">
            Ticket fiel: {formatCurrency(analytics.loyalTicketMedio)}
            {ticketLiftPercent !== null && ticketLiftPercent > 0 ? ` (+${ticketLiftPercent}% vs avulso)` : ''}
          </p>
        </div>

        {/* KPI 4: Uso de Benefícios do Cartão Fidelidade */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Benefícios Resgatados
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {analytics.totalRewardsRedeemedLifetime}
            </span>
            <span className="text-xs font-mono tabular-nums text-amber-700 font-semibold">
              +{analytics.periodRedemptionsCount} no período
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate font-mono tabular-nums">
            {analytics.clientsReadyCount} prontos p/ resgate · {analytics.redemptionUtilizationRate}% uso dos liberados
          </p>
        </div>
      </div>

      {/* Gráficos Analíticos: Evolução no Período + Distribuição dos Cartões */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolução de Pontos, Resgates e Retornos */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Pontuação, Resgates e Retornos no Período</span>
              </h3>
              <p className="text-xs text-slate-500">
                Movimentação do Cartão Fidelidade e atendimentos de retorno em {dateRangeLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Pontos ganhos
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Resgates
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Visitas retorno
              </span>
            </div>
          </div>

          {hasTimelineActivity ? (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.timelineSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[190px]">
                          <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1">
                            {d.label}
                          </span>
                          <div className="flex justify-between items-center text-emerald-400 font-mono tabular-nums font-bold">
                            <span>Pontos Acumulados:</span>
                            <span>+{d.pointsEarned} pts</span>
                          </div>
                          <div className="flex justify-between items-center text-amber-400 font-mono tabular-nums font-bold">
                            <span>Prêmios Resgatados:</span>
                            <span>{d.redemptionsCount} ({d.pointsRedeemed} pts)</span>
                          </div>
                          <div className="flex justify-between items-center text-indigo-300 font-mono tabular-nums font-bold">
                            <span>Visitas de Retorno:</span>
                            <span>{d.returnVisits}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="pointsEarned" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="redemptionsCount" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={24} />
                  <Line type="monotone" dataKey="returnVisits" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: '#4f46e5' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center p-6">
              <Sparkles className="w-7 h-7 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Sem movimentações de pontos ou retornos neste intervalo
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Ao concluir serviços ou registrar pontos no Cartão Fidelidade, a evolução diária aparecerá aqui automaticamente.
              </p>
            </div>
          )}

          {/* Resumo Numérico do Período */}
          <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pontos no Período
              </span>
              <span className="text-sm font-black text-emerald-700 font-mono tabular-nums">
                +{analytics.periodPointsEarned} pts
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pontos Resgatados
              </span>
              <span className="text-sm font-black text-amber-700 font-mono tabular-nums">
                -{analytics.periodPointsRedeemed} pts
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Saldo em Circulação
              </span>
              <span className="text-sm font-black text-slate-900 font-mono tabular-nums">
                {analytics.activePointsBalance} pts
              </span>
            </div>
          </div>
        </div>

        {/* Distribuição dos Cartões Fidelidade */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Estágio dos Cartões Fidelidade
                </h3>
                <p className="text-xs text-slate-500">
                  Distribuição da base por proximidade da meta ({loyaltyConfig.rewardThreshold} pts)
                </p>
              </div>
              <Award className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {analytics.distributionData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
                <div className="w-44 h-44 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.distributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {analytics.distributionData.map((entry, idx) => (
                          <Cell key={`seg-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          const pct =
                            analytics.totalClientsCount > 0
                              ? Math.round((d.value / analytics.totalClientsCount) * 100)
                              : 0;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg">
                              <span className="font-bold block">{d.name}</span>
                              <span className="font-mono tabular-nums text-emerald-400 font-bold">
                                {d.value} clientes ({pct}%)
                              </span>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Adesão</span>
                    <span className="text-base font-black text-slate-900 font-mono tabular-nums">
                      {analytics.loyaltyAdoptionRate}%
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-2 text-xs">
                  {analytics.distributionData.map((item) => {
                    const pct =
                      analytics.totalClientsCount > 0
                        ? Math.round((item.value / analytics.totalClientsCount) * 100)
                        : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700 font-medium truncate">{item.name}</span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">
                          {item.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-44 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                Nenhum cliente cadastrado para distribuir.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Clientes Participantes
              </span>
              <span className="text-base font-black text-slate-900 font-mono tabular-nums">
                {analytics.participatingClientsCount}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {analytics.totalPointsEarnedLifetime} pts emitidos ao todo
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Prêmios Acumulados Hoje
              </span>
              <span className="text-base font-black text-emerald-700 font-mono tabular-nums">
                {analytics.totalReadyRewardsCount} disponíveis
              </span>
              <span className="text-[11px] text-slate-500 block">
                Em {analytics.clientsReadyCount} clientes elegíveis
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativo de Comportamento & Histórico de Benefícios Resgatados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparativo: Clientes Fiéis vs Avulsos */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Comparativo: Clientes Fiéis vs. Visita Única</span>
              </h3>
              <p className="text-xs text-slate-500">
                Impacto da fidelização em visitas médias e ticket médio gerado
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 pr-3">Indicador</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700">Clientes Fiéis / Retorno</th>
                  <th className="py-2.5 pl-3 text-right text-slate-500">Visita Única</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-3 pr-3 text-slate-700 font-semibold">Quantidade na Base</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {analytics.loyalEngagedCount} clientes
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-600">
                    {analytics.nonLoyalCount} clientes
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-3 text-slate-700 font-semibold">Receita Total Gerada</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                    {formatCurrency(analytics.loyalRevenueTotal)} ({analytics.loyalRevenueShare}%)
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-600">
                    {formatCurrency(analytics.nonLoyalRevenueTotal)} ({Math.max(0, 100 - analytics.loyalRevenueShare)}%)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-3 text-slate-700 font-semibold">Ticket Médio por Visita</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatCurrency(analytics.loyalTicketMedio)}
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-600">
                    {formatCurrency(analytics.singleTicketMedio)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-3 text-slate-700 font-semibold">Média de Visitas / Cliente</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-indigo-700">
                    {analytics.loyalAvgVisits} visitas
                  </td>
                  <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-600">
                    {analytics.nonLoyalAvgVisits} visitas
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico Recente de Uso de Benefícios */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-500" />
                <span>Histórico de Benefícios Resgatados</span>
              </h3>
              <p className="text-xs text-slate-500">
                Últimos prêmios utilizados pelos clientes no Cartão Fidelidade
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-bold text-slate-600">
              {analytics.clientsWithRedemptionCount} clientes já resgataram
            </span>
          </div>

          {analytics.redemptionEvents.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {analytics.redemptionEvents.slice(0, 12).map((evt) => (
                <div key={evt.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">{evt.clientName}</span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {evt.description} · {formatDateBr(evt.createdAt)}
                      {evt.authorName ? ` · por ${evt.authorName}` : ''}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-amber-700 shrink-0">
                    -{evt.points} pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-[160px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center p-5">
              <CheckCircle2 className="w-6 h-6 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Nenhum prêmio resgatado até o momento
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                {analytics.clientsReadyCount > 0
                  ? `${analytics.clientsReadyCount} cliente(s) já atingiram ${loyaltyConfig.rewardThreshold} pts e podem resgatar o benefício na área de Clientes.`
                  : `Quando um cliente atingir ${loyaltyConfig.rewardThreshold} pontos e resgatar o benefício, o registro aparecerá aqui.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabela Analítica Individual dos Clientes Fiéis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Ranking de Desempenho & Fidelidade por Cliente
            </h3>
            <p className="text-xs text-slate-500">
              Visitas, frequência de retorno, receita acumulada, pontuação e benefícios usados ({filteredRows.length} exibidos)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente ou telefone..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-48 sm:w-56"
              />
            </div>

            {/* Filtro de Segmento */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as ClientSegmentFilter)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos ({analytics.rows.length})</option>
              <option value="ready">Com Prêmio Disponível ({analytics.clientsReadyCount})</option>
              <option value="redeemed">Já Resgataram ({analytics.clientsWithRedemptionCount})</option>
              <option value="recurring">Recorrentes 2+ ({analytics.returningClientsCount})</option>
              <option value="in_progress">Em Progresso</option>
            </select>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ClientSortOption)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="points_desc">Maior Pontuação</option>
                <option value="visits_desc">Mais Visitas</option>
                <option value="revenue_desc">Maior Receita</option>
                <option value="redeemed_desc">Mais Resgates</option>
                <option value="recent_desc">Visita Mais Recente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-3 text-center">Visitas & Retorno</th>
                <th className="py-3 px-4 text-right">Receita & Ticket</th>
                <th className="py-3 px-4">Cartão Fidelidade</th>
                <th className="py-3 px-4 text-right">Uso de Benefícios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                    Nenhum cliente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, idx) => (
                  <tr key={row.client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="w-5 font-mono tabular-nums font-bold text-slate-400 text-xs shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate max-w-[180px] sm:max-w-[230px]">
                            {row.client.name}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {row.client.phone || 'Sem telefone'}
                            {row.preferredProName ? ` · Pref: ${row.preferredProName}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-mono tabular-nums font-bold text-slate-900 block">
                        {row.visitsCount} {row.visitsCount === 1 ? 'visita' : 'visitas'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums block">
                        {row.avgReturnDays !== null
                          ? `Ciclo ${row.avgReturnDays}d`
                          : row.lastVisitDate
                          ? `Última ${formatDateBr(row.lastVisitDate)}`
                          : 'Sem visita datada'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono tabular-nums font-extrabold text-slate-900 block">
                        {formatCurrency(row.totalSpent)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums block">
                        Ticket {formatCurrency(row.avgTicket)}
                      </span>
                    </td>

                    <td className="py-3 px-4 min-w-[180px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {row.points}/{row.threshold} pts
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          Total: {row.totalEarned} pts
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.isRewardReady ? 'bg-emerald-500' : row.points > 0 ? 'bg-amber-500' : 'bg-slate-300'
                          }`}
                          style={{ width: `${row.progressPercent}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono tabular-nums font-bold text-slate-900 block">
                        {row.rewardsRedeemed} {row.rewardsRedeemed === 1 ? 'resgate' : 'resgates'}
                      </span>
                      <span
                        className={`text-[11px] font-semibold block ${
                          row.isRewardReady ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {row.isRewardReady
                          ? `${row.availableRewardsCount} prêmio disponível`
                          : `Faltam ${row.remainingToReward} pts`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 15 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono tabular-nums">
              Mostrando {displayedRows.length} de {filteredRows.length} clientes
            </span>
            <button
              type="button"
              onClick={() => setShowAllRows((prev) => !prev)}
              className="font-bold text-slate-900 hover:text-amber-600 transition-colors cursor-pointer"
            >
              {showAllRows ? 'Mostrar apenas Top 15' : `Ver todos os ${filteredRows.length} clientes`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
