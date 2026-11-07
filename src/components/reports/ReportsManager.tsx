import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Scissors,
  Crown,
  Building2,
  ChevronRight,
  ArrowUpRight,
  Percent,
  BarChart3,
  BarChart2,
  PieChart as PieChartIcon,
  CalendarDays,
  Sparkles,
  Filter,
  Download,
  Printer,
  Receipt,
  UserCheck,
  Activity,
  Layers,
  Flame,
  Briefcase,
  HelpCircle,
  RefreshCw,
  Search,
  ArrowDownRight,
  Eye,
  Check,
  Tv,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  PieChart,
  Pie,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { Appointment, Comanda, Professional, Service, Client } from '../../types';
import { getTodayDateString } from '../../utils/date';
import { formatCurrency } from '../../utils/availability';
import { QueueVsAppointmentsReport } from './QueueVsAppointmentsReport';

type PeriodOption = 'hoje' | '7d' | '30d' | 'mes' | '90d' | 'ano' | 'customizado';
type ActiveSubView = 'visao_geral' | 'fila_vs_agendados' | 'profissionais' | 'servicos' | 'receita' | 'horarios_retencao';

export interface ProfessionalMetricItem {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  appointmentsCount: number;
  completedCount: number;
  cancelledCount: number;
  occupancyRate: number;
  hoursBooked: number;
  totalHoursAvailable: number;
  revenue: number;
  commission: number;
  studioNet: number;
  ticketMedio: number;
  commissionRate: number;
}

export interface ServiceMetricItem {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  appointmentsCount: number;
  revenue: number;
  commission: number;
  ticketMedio: number;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'];

export const ReportsManager: React.FC = () => {
  const {
    currentBusiness,
    activeAppointments,
    activeProfessionals,
    activeServices,
    activeComandas,
    activeClients,
    activeQueueItems,
    currentRole,
    currentProfessional,
    openNewAppointmentModal,
    setActiveTab,
  } = useApp();

  // Estados dos Filtros
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedProId, setSelectedProId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeSubView, setActiveSubView] = useState<ActiveSubView>('visao_geral');
  const [useSimulatedFallback, setUseSimulatedFallback] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Calcula limites de data com base no período selecionado
  const { startDate, endDate, dateRangeLabel, dayCount } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    let days = 30;

    switch (selectedPeriod) {
      case 'hoje':
        days = 1;
        break;
      case '7d':
        days = 7;
        start.setDate(end.getDate() - 6);
        break;
      case '30d':
        days = 30;
        start.setDate(end.getDate() - 29);
        break;
      case 'mes': {
        start.setDate(1);
        days = end.getDate();
        break;
      }
      case '90d':
        days = 90;
        start.setDate(end.getDate() - 89);
        break;
      case 'ano': {
        start.setMonth(0, 1);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        break;
      }
      case 'customizado': {
        if (customStartDate && customEndDate) {
          const s = new Date(customStartDate + 'T00:00:00');
          const e = new Date(customEndDate + 'T23:59:59');
          const diff = Math.max(1, Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
          const fmtDisplay = (d: Date) =>
            `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          return {
            startDate: customStartDate,
            endDate: customEndDate,
            dateRangeLabel: `${fmtDisplay(s)} até ${fmtDisplay(e)}`,
            dayCount: diff,
          };
        }
        break;
      }
    }

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const fmtDisplay = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    return {
      startDate: fmt(start),
      endDate: fmt(end),
      dateRangeLabel: `${fmtDisplay(start)} até ${fmtDisplay(end)}`,
      dayCount: days,
    };
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Lista de Categorias de Serviços cadastradas
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    activeServices.forEach((s) => {
      if (s.category) set.add(s.category.trim());
    });
    return Array.from(set).sort();
  }, [activeServices]);

  // 1. Filtragem Real de Agendamentos
  const filteredAppointments = useMemo(() => {
    return activeAppointments.filter((a) => {
      if (a.date < startDate || a.date > endDate) return false;
      if (selectedProId !== 'all' && a.professionalId !== selectedProId) return false;
      if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;

      if (selectedCategory !== 'all') {
        const srv = activeServices.find((s) => s.id === a.serviceId);
        if (!srv || srv.category !== selectedCategory) return false;
      }

      return true;
    });
  }, [activeAppointments, startDate, endDate, selectedProId, selectedCategory, selectedStatus, activeServices]);

  // 2. Filtragem Real de Comandas
  const filteredComandas = useMemo(() => {
    return activeComandas.filter((c) => {
      const dateStr = (c.closedAt || c.createdAt || '').slice(0, 10);
      if (dateStr && (dateStr < startDate || dateStr > endDate)) return false;
      if (selectedProId !== 'all' && c.professionalId !== selectedProId) return false;
      return true;
    });
  }, [activeComandas, startDate, endDate, selectedProId]);

  const hasRealData = filteredAppointments.length > 0 || filteredComandas.length > 0;

  // Gerador de Dados Simulados Realistas para estúdios novos/recém-criados
  const simulatedData = useMemo(() => {
    if (hasRealData || !useSimulatedFallback) return null;

    const basePros = activeProfessionals.length > 0
      ? activeProfessionals
      : [
          { id: 'pro_1', name: 'Ana Beatriz', role: 'profissional', commissionPercentage: 40, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop' },
          { id: 'pro_2', name: 'Carlos Ramos', role: 'profissional', commissionPercentage: 45, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
          { id: 'pro_3', name: 'Juliana Costa', role: 'profissional', commissionPercentage: 50, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop' },
        ];

    const baseServices = activeServices.length > 0
      ? activeServices
      : [
          { id: 'srv_1', name: 'Corte & Escova Modeladora', category: 'Cabelo', price: 120, durationMinutes: 50, commissionPercentage: 40 },
          { id: 'srv_2', name: 'Coloração & Mechas', category: 'Cabelo', price: 280, durationMinutes: 90, commissionPercentage: 45 },
          { id: 'srv_3', name: 'Barba & Toalha Quente', category: 'Barbearia', price: 65, durationMinutes: 30, commissionPercentage: 50 },
          { id: 'srv_4', name: 'Limpeza de Pele Profunda', category: 'Estética', price: 180, durationMinutes: 60, commissionPercentage: 45 },
          { id: 'srv_5', name: 'Manicure & Spa dos Pés', category: 'Unhas', price: 85, durationMinutes: 45, commissionPercentage: 40 },
        ];

    // Curva diária realista
    const timeline = [];
    const now = new Date();
    const count = Math.min(dayCount, 30);

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];

      const isWeekend = d.getDay() === 5 || d.getDay() === 6;
      const volume = isWeekend ? Math.floor(10 + Math.random() * 8) : Math.floor(4 + Math.random() * 6);
      const ticket = 95 + Math.floor(Math.random() * 40);
      const faturamento = volume * ticket;
      const faturamentoRealizado = Math.round(faturamento * 0.92);

      timeline.push({
        date: dateStr,
        label: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`,
        faturamento,
        faturamentoRealizado,
        volume,
        ticketMedio: Math.round(faturamento / (volume || 1)),
      });
    }

    // Métricas por profissional
    const proBreakdown: ProfessionalMetricItem[] = basePros.map((p, idx) => {
      const totalHoursAvailable = Math.round(dayCount * 7.5);
      const occupancyRate = [82, 74, 65, 55, 48][idx % 5] || 65;
      const hoursBooked = Math.round((totalHoursAvailable * occupancyRate) / 100);
      const appointmentsCount = Math.round(hoursBooked * 1.3);
      const completedCount = Math.round(appointmentsCount * 0.92);
      const cancelledCount = Math.max(0, appointmentsCount - completedCount);
      const revenue = appointmentsCount * (90 + idx * 25);
      const commissionRate = (p as any).commissionPercentage || 40;
      const commission = Math.round((revenue * commissionRate) / 100);
      const studioNet = revenue - commission;

      return {
        id: p.id,
        name: p.name,
        role: (p as any).role || 'Profissional',
        avatar: (p as any).avatar,
        appointmentsCount,
        completedCount,
        cancelledCount,
        occupancyRate,
        hoursBooked,
        totalHoursAvailable,
        revenue,
        commission,
        studioNet,
        ticketMedio: Math.round(revenue / (appointmentsCount || 1)),
        commissionRate,
      };
    });

    // Métricas por serviço
    const serviceBreakdown: ServiceMetricItem[] = baseServices.map((s, idx) => {
      const appointmentsCount = [34, 26, 21, 18, 14][idx % 5] || 12;
      const revenue = appointmentsCount * s.price;
      const commission = Math.round((revenue * (s.commissionPercentage || 40)) / 100);

      return {
        id: s.id,
        name: s.name,
        category: s.category || 'Geral',
        price: s.price,
        durationMinutes: s.durationMinutes,
        appointmentsCount,
        revenue,
        commission,
        ticketMedio: s.price,
      };
    });

    return { timeline, proBreakdown, serviceBreakdown };
  }, [hasRealData, useSimulatedFallback, activeProfessionals, activeServices, dayCount]);

  // =========================================================================
  // 1. CÁLCULO DE AGENDAMENTOS POR PROFISSIONAL
  // =========================================================================
  const professionalMetrics = useMemo(() => {
    if (simulatedData) {
      const totalAppointments = simulatedData.proBreakdown.reduce((acc, p) => acc + p.appointmentsCount, 0);
      const totalRevenue = simulatedData.proBreakdown.reduce((acc, p) => acc + p.revenue, 0);
      const totalCommission = simulatedData.proBreakdown.reduce((acc, p) => acc + p.commission, 0);
      const totalStudioNet = totalRevenue - totalCommission;

      const ranking: ProfessionalMetricItem[] = [...simulatedData.proBreakdown].sort((a, b) => b.appointmentsCount - a.appointmentsCount);

      return {
        ranking,
        totalAppointments,
        totalRevenue,
        totalCommission,
        totalStudioNet,
        topPerformer: ranking[0] || null,
      };
    }

    // Cálculo com dados reais
    const map = new Map<string, ProfessionalMetricItem>();

    // Inicializa todos os profissionais ativos
    activeProfessionals.forEach((pro) => {
      const dailyHours = pro.workHours
        ? (() => {
            const [sh, sm] = (pro.workHours.start || '09:00').split(':').map(Number);
            const [eh, em] = (pro.workHours.end || '19:00').split(':').map(Number);
            return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
          })()
        : 8;

      const workingDaysCount = Math.max(1, Math.round(dayCount * (6 / 7)));
      const totalHoursAvailable = Math.round(dailyHours * workingDaysCount);

      map.set(pro.id, {
        id: pro.id,
        name: pro.name,
        role: pro.role || 'Profissional',
        avatar: pro.avatar,
        appointmentsCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        hoursBooked: 0,
        totalHoursAvailable,
        occupancyRate: 0,
        revenue: 0,
        commission: 0,
        studioNet: 0,
        ticketMedio: 0,
        commissionRate: pro.commissionPercentage || 40,
      });
    });

    // Acumula os agendamentos filtrados
    filteredAppointments.forEach((a) => {
      let entry = map.get(a.professionalId);
      if (!entry) {
        entry = {
          id: a.professionalId,
          name: a.professionalName || 'Profissional',
          role: 'Profissional',
          appointmentsCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          hoursBooked: 0,
          totalHoursAvailable: Math.round(8 * dayCount),
          occupancyRate: 0,
          revenue: 0,
          commission: 0,
          studioNet: 0,
          ticketMedio: 0,
          commissionRate: 40,
        };
        map.set(a.professionalId, entry);
      }

      entry.appointmentsCount += 1;
      if (a.status === 'concluido' || a.paymentStatus === 'pago') {
        entry.completedCount += 1;
      } else if (a.status === 'cancelado') {
        entry.cancelledCount += 1;
      }

      if (a.status !== 'cancelado') {
        entry.hoursBooked += (a.durationMinutes || 45) / 60;
        entry.revenue += a.price || 0;
        const comm = Math.round(((a.price || 0) * entry.commissionRate) / 100);
        entry.commission += comm;
      }
    });

    // Finaliza médias e ocupação
    const ranking = Array.from(map.values()).map((p) => {
      const hours = Math.round(p.hoursBooked * 10) / 10;
      const occ = p.totalHoursAvailable > 0
        ? Math.min(100, Math.round((hours / p.totalHoursAvailable) * 100))
        : 0;
      const tm = p.appointmentsCount > 0 ? Math.round(p.revenue / p.appointmentsCount) : 0;
      const net = Math.max(0, p.revenue - p.commission);

      return {
        ...p,
        hoursBooked: hours,
        occupancyRate: occ,
        ticketMedio: tm,
        studioNet: net,
      };
    }).sort((a, b) => b.appointmentsCount - a.appointmentsCount);

    const totalAppointments = ranking.reduce((acc, p) => acc + p.appointmentsCount, 0);
    const totalRevenue = ranking.reduce((acc, p) => acc + p.revenue, 0);
    const totalCommission = ranking.reduce((acc, p) => acc + p.commission, 0);
    const totalStudioNet = totalRevenue - totalCommission;

    return {
      ranking,
      totalAppointments,
      totalRevenue,
      totalCommission,
      totalStudioNet,
      topPerformer: ranking[0] || null,
    };
  }, [simulatedData, activeProfessionals, filteredAppointments, dayCount]);

  // =========================================================================
  // 2. CÁLCULO DOS SERVIÇOS MAIS PROCURADOS
  // =========================================================================
  const servicesMetrics = useMemo(() => {
    if (simulatedData) {
      const totalServicesSold = simulatedData.serviceBreakdown.reduce((acc, s) => acc + s.appointmentsCount, 0);
      const totalServicesRevenue = simulatedData.serviceBreakdown.reduce((acc, s) => acc + s.revenue, 0);

      const ranking: ServiceMetricItem[] = [...simulatedData.serviceBreakdown].sort((a, b) => b.appointmentsCount - a.appointmentsCount);

      // Agrupamento por Categoria
      const catMap = new Map<string, { category: string; count: number; revenue: number }>();
      simulatedData.serviceBreakdown.forEach((s) => {
        if (!catMap.has(s.category)) {
          catMap.set(s.category, { category: s.category, count: 0, revenue: 0 });
        }
        const item = catMap.get(s.category)!;
        item.count += s.appointmentsCount;
        item.revenue += s.revenue;
      });

      const categoriesRanking = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);

      return {
        ranking,
        totalServicesSold,
        totalServicesRevenue,
        categoriesRanking,
        topService: ranking[0] || null,
      };
    }

    // Dados Reais
    const map = new Map<string, ServiceMetricItem>();

    // Inicializa todos os serviços ativos
    activeServices.forEach((srv) => {
      map.set(srv.id, {
        id: srv.id,
        name: srv.name,
        category: srv.category || 'Geral',
        price: srv.price,
        durationMinutes: srv.durationMinutes,
        appointmentsCount: 0,
        revenue: 0,
        commission: 0,
        ticketMedio: srv.price,
      });
    });

    // Contabiliza cada agendamento
    filteredAppointments.forEach((a) => {
      if (a.status === 'cancelado') return;
      let srv = map.get(a.serviceId);
      if (!srv) {
        srv = {
          id: a.serviceId,
          name: a.serviceName || 'Serviço',
          category: 'Geral',
          price: a.price || 0,
          durationMinutes: a.durationMinutes || 45,
          appointmentsCount: 0,
          revenue: 0,
          commission: 0,
          ticketMedio: a.price || 0,
        };
        map.set(a.serviceId, srv);
      }
      srv.appointmentsCount += 1;
      srv.revenue += a.price || 0;
      const commRate = 40;
      srv.commission += Math.round(((a.price || 0) * commRate) / 100);
    });

    const ranking = Array.from(map.values())
      .filter((s) => s.appointmentsCount > 0 || activeServices.some((as) => as.id === s.id))
      .sort((a, b) => b.appointmentsCount - a.appointmentsCount);

    const totalServicesSold = ranking.reduce((acc, s) => acc + s.appointmentsCount, 0);
    const totalServicesRevenue = ranking.reduce((acc, s) => acc + s.revenue, 0);

    // Agrupamento por Categoria
    const catMap = new Map<string, { category: string; count: number; revenue: number }>();
    ranking.forEach((s) => {
      const cat = s.category || 'Outros';
      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, count: 0, revenue: 0 });
      }
      const item = catMap.get(cat)!;
      item.count += s.appointmentsCount;
      item.revenue += s.revenue;
    });

    const categoriesRanking = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      ranking,
      totalServicesSold,
      totalServicesRevenue,
      categoriesRanking,
      topService: ranking[0] || null,
    };
  }, [simulatedData, activeServices, filteredAppointments]);

  // =========================================================================
  // 3. CÁLCULO DE RECEITA TOTAL, FORMAS DE PAGAMENTO & CAIXA
  // =========================================================================
  const revenueMetrics = useMemo(() => {
    if (simulatedData) {
      const totalGrossRevenue = simulatedData.timeline.reduce((acc, d) => acc + d.faturamento, 0);
      const totalRealizedRevenue = simulatedData.timeline.reduce((acc, d) => acc + d.faturamentoRealizado, 0);
      const totalVolume = simulatedData.timeline.reduce((acc, d) => acc + d.volume, 0);
      const overallTicketMedio = totalVolume > 0 ? totalGrossRevenue / totalVolume : 0;
      const totalCommissions = simulatedData.proBreakdown.reduce((acc, p) => acc + p.commission, 0);
      const netProfit = totalGrossRevenue - totalCommissions;

      const paymentMethods = [
        { name: 'PIX Instantâneo', value: 48, amount: totalGrossRevenue * 0.48, color: '#10b981' },
        { name: 'Cartão de Crédito', value: 34, amount: totalGrossRevenue * 0.34, color: '#3b82f6' },
        { name: 'Cartão de Débito', value: 12, amount: totalGrossRevenue * 0.12, color: '#8b5cf6' },
        { name: 'Dinheiro em Espécie', value: 6, amount: totalGrossRevenue * 0.06, color: '#f59e0b' },
      ];

      return {
        totalGrossRevenue,
        totalRealizedRevenue,
        pendingRevenue: totalGrossRevenue - totalRealizedRevenue,
        totalVolume,
        overallTicketMedio,
        totalCommissions,
        netProfit,
        paymentMethods,
        timeline: simulatedData.timeline,
      };
    }

    // Dados Reais
    const closedComandas = filteredComandas.filter((c) => c.status === 'fechada');
    const comandaRevenue = closedComandas.reduce((acc, c) => acc + (c.total || 0), 0);

    const nonCancelledApps = filteredAppointments.filter((a) => a.status !== 'cancelado');
    const scheduledRevenue = nonCancelledApps.reduce((acc, a) => acc + (a.price || 0), 0);
    const realizedAppsRevenue = filteredAppointments
      .filter((a) => a.status === 'concluido' || a.paymentStatus === 'pago')
      .reduce((acc, a) => acc + (a.price || 0), 0);

    const totalGrossRevenue = comandaRevenue > 0 ? comandaRevenue : scheduledRevenue;
    const totalRealizedRevenue = comandaRevenue > 0 ? comandaRevenue : realizedAppsRevenue;
    const pendingRevenue = Math.max(0, totalGrossRevenue - totalRealizedRevenue);
    const totalVolume = nonCancelledApps.length || filteredComandas.length;
    const overallTicketMedio = totalVolume > 0 ? totalGrossRevenue / totalVolume : 0;

    // Comissões reais
    const totalCommissions = professionalMetrics.totalCommission;
    const netProfit = Math.max(0, totalGrossRevenue - totalCommissions);

    // Formas de pagamento reais
    const counts: Record<string, number> = {
      pix: 0,
      cartao_credito: 0,
      cartao_debito: 0,
      dinheiro: 0,
    };

    filteredComandas.forEach((c) => {
      if (c.status === 'fechada' && c.paymentMethod) {
        counts[c.paymentMethod] = (counts[c.paymentMethod] || 0) + (c.total || 0);
      }
    });

    const hasComandaPayments = Object.values(counts).some((v) => v > 0);
    const paymentMethods = hasComandaPayments
      ? [
          { name: 'PIX Instantâneo', value: Math.round(((counts.pix || 0) / (totalGrossRevenue || 1)) * 100), amount: counts.pix || 0, color: '#10b981' },
          { name: 'Cartão de Crédito', value: Math.round(((counts.cartao_credito || 0) / (totalGrossRevenue || 1)) * 100), amount: counts.cartao_credito || 0, color: '#3b82f6' },
          { name: 'Cartão de Débito', value: Math.round(((counts.cartao_debito || 0) / (totalGrossRevenue || 1)) * 100), amount: counts.cartao_debito || 0, color: '#8b5cf6' },
          { name: 'Dinheiro em Espécie', value: Math.round(((counts.dinheiro || 0) / (totalGrossRevenue || 1)) * 100), amount: counts.dinheiro || 0, color: '#f59e0b' },
        ].filter((item) => item.amount > 0 || item.value > 0)
      : [];

    // Linha do tempo real diária
    const map = new Map<string, { faturamento: number; faturamentoRealizado: number; volume: number }>();
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const curr = new Date(start);

    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      map.set(dateStr, { faturamento: 0, faturamentoRealizado: 0, volume: 0 });
      curr.setDate(curr.getDate() + 1);
    }

    filteredComandas.forEach((c) => {
      const d = (c.closedAt || c.createdAt || '').slice(0, 10);
      if (d && map.has(d)) {
        const item = map.get(d)!;
        item.faturamento += c.total || 0;
        if (c.status === 'fechada') item.faturamentoRealizado += c.total || 0;
        item.volume += 1;
      }
    });

    if (filteredComandas.length === 0) {
      filteredAppointments.forEach((a) => {
        if (a.date && map.has(a.date) && a.status !== 'cancelado') {
          const item = map.get(a.date)!;
          item.faturamento += a.price || 0;
          if (a.status === 'concluido' || a.paymentStatus === 'pago') item.faturamentoRealizado += a.price || 0;
          item.volume += 1;
        }
      });
    }

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const timeline = Array.from(map.entries()).map(([date, val]) => {
      const dObj = new Date(date + 'T00:00:00');
      const dayName = dayNames[dObj.getDay()] || '';
      return {
        date,
        label: `${dayName} ${dObj.getDate()}/${dObj.getMonth() + 1}`,
        faturamento: val.faturamento,
        faturamentoRealizado: val.faturamentoRealizado,
        volume: val.volume,
        ticketMedio: val.volume > 0 ? Math.round(val.faturamento / val.volume) : 0,
      };
    });

    return {
      totalGrossRevenue,
      totalRealizedRevenue,
      pendingRevenue,
      totalVolume,
      overallTicketMedio,
      totalCommissions,
      netProfit,
      paymentMethods,
      timeline,
    };
  }, [simulatedData, filteredComandas, filteredAppointments, professionalMetrics.totalCommission, startDate, endDate]);

  // =========================================================================
  // 4. HORÁRIOS DE PICO & RETENÇÃO DE CLIENTES
  // =========================================================================
  const timeAndRetentionMetrics = useMemo(() => {
    // Horários de 08:00 às 20:00
    const hourSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    const hourlyCounts: Record<string, number> = {};
    hourSlots.forEach((h) => (hourlyCounts[h] = 0));

    filteredAppointments.forEach((a) => {
      if (a.status === 'cancelado' || !a.startTime) return;
      const hPrefix = a.startTime.slice(0, 2) + ':00';
      if (hourlyCounts[hPrefix] !== undefined) {
        hourlyCounts[hPrefix] += 1;
      }
    });

    const hasRealHourly = Object.values(hourlyCounts).some((v) => v > 0);
    const hourlyData = hasRealHourly
      ? hourSlots.map((h) => ({ hora: h, atendimentos: hourlyCounts[h] || 0 }))
      : [
          { hora: '08:00', atendimentos: 3 },
          { hora: '09:00', atendimentos: 8 },
          { hora: '10:00', atendimentos: 17 },
          { hora: '11:00', atendimentos: 15 },
          { hora: '12:00', atendimentos: 11 },
          { hora: '13:00', atendimentos: 9 },
          { hora: '14:00', atendimentos: 19 },
          { hora: '15:00', atendimentos: 16 },
          { hora: '16:00', atendimentos: 18 },
          { hora: '17:00', atendimentos: 23 },
          { hora: '18:00', atendimentos: 25 },
          { hora: '19:00', atendimentos: 14 },
          { hora: '20:00', atendimentos: 4 },
        ];

    // Dias da semana (Seg a Dom)
    const weekDays = [
      { key: 1, name: 'Segunda', count: 0 },
      { key: 2, name: 'Terça', count: 0 },
      { key: 3, name: 'Quarta', count: 0 },
      { key: 4, name: 'Quinta', count: 0 },
      { key: 5, name: 'Sexta', count: 0 },
      { key: 6, name: 'Sábado', count: 0 },
      { key: 0, name: 'Domingo', count: 0 },
    ];

    filteredAppointments.forEach((a) => {
      if (a.status === 'cancelado' || !a.date) return;
      const d = new Date(a.date + 'T00:00:00').getDay();
      const item = weekDays.find((x) => x.key === d);
      if (item) item.count += 1;
    });

    const hasRealDays = weekDays.some((d) => d.count > 0);
    const dayOfWeekData = hasRealDays
      ? weekDays.map((d) => ({ dia: d.name, atendimentos: d.count }))
      : [
          { dia: 'Segunda', atendimentos: 14 },
          { dia: 'Terça', atendimentos: 19 },
          { dia: 'Quarta', atendimentos: 24 },
          { dia: 'Quinta', atendimentos: 30 },
          { dia: 'Sexta', atendimentos: 42 },
          { dia: 'Sábado', atendimentos: 48 },
          { dia: 'Domingo', atendimentos: 8 },
        ];

    // Retenção: Clientes Recorrentes vs Novos
    const clientVisitMap = new Map<string, number>();
    filteredAppointments.forEach((a) => {
      if (!a.clientId) return;
      clientVisitMap.set(a.clientId, (clientVisitMap.get(a.clientId) || 0) + 1);
    });

    let recurringCount = 0;
    let newCount = 0;

    activeClients.forEach((c) => {
      if (c.totalVisits > 1) {
        recurringCount += 1;
      } else {
        newCount += 1;
      }
    });

    if (activeClients.length === 0) {
      recurringCount = 38;
      newCount = 14;
    }

    const totalClientsBase = recurringCount + newCount || 1;
    const retentionRate = Math.round((recurringCount / totalClientsBase) * 100);

    return {
      hourlyData,
      dayOfWeekData,
      recurringCount,
      newCount,
      retentionRate,
    };
  }, [filteredAppointments, activeClients]);

  // =========================================================================
  // EXPORTAÇÃO CSV PROFISSIONAL
  // =========================================================================
  const exportToCSV = () => {
    try {
      const headers = [
        'ID_Agendamento',
        'Data',
        'Horario_Inicio',
        'Cliente',
        'Telefone_Cliente',
        'Profissional',
        'Servico',
        'Valor_R$',
        'Status',
        'Status_Pagamento',
      ];

      const rows = filteredAppointments.map((a) => [
        a.id,
        a.date,
        a.startTime,
        `"${a.clientName.replace(/"/g, '""')}"`,
        `"${(a.clientPhone || '').replace(/"/g, '""')}"`,
        `"${(a.professionalName || '').replace(/"/g, '""')}"`,
        `"${a.serviceName.replace(/"/g, '""')}"`,
        (a.price || 0).toFixed(2),
        a.status,
        a.paymentStatus || 'pendente',
      ]);

      // Adiciona resumo de profissionais
      const proRows = professionalMetrics.ranking.map((p) => [
        `"RESUMO_PRO"`,
        `"${dateRangeLabel}"`,
        `"-"`,
        `"-"`,
        `"-"`,
        `"${p.name}"`,
        `"Total Atendimentos: ${p.appointmentsCount}"`,
        p.revenue.toFixed(2),
        `"Comissao: ${p.commission.toFixed(2)}"`,
        `"Ocupacao: ${p.occupancyRate}%"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(',')), '', '--- RESUMO POR PROFISSIONAL ---', ...proRows.map((r) => r.join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_studio_digital_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportNotice('Relatório CSV gerado e baixado com sucesso!');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Notificação Temporária de Exportação */}
      {exportNotice && (
        <div className="p-3 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-white hover:opacity-80">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Período Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider font-mono">
                Módulo de Relatórios & Business Intelligence
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {currentBusiness?.tradeName || 'Studio Digital'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Relatórios de Gestão & Indicadores do Studio
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Análise completa de agendamentos por profissional, serviços mais procurados, faturamento bruto e líquido, comissões apuradas e fluxo de clientes.
            </p>
          </div>

          {/* Quick Action Buttons (Export CSV & Print) */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center print:hidden">
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              title="Baixar planilha de dados em formato CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros: Período, Profissional, Categoria e Status */}
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 print:hidden">
          {/* Seletor Rápido de Períodos */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5" /> Período:
              </span>
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '7d', label: 'Últimos 7 dias' },
                { id: '30d', label: '30 dias' },
                { id: 'mes', label: 'Este Mês' },
                { id: '90d', label: 'Trimestre' },
                { id: 'ano', label: 'Este Ano' },
                { id: 'customizado', label: 'Customizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id as PeriodOption)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                    selectedPeriod === p.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Indicador de Range Ativo */}
            <div className="text-xs font-mono font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              📅 {dateRangeLabel} ({dayCount} {dayCount === 1 ? 'dia' : 'dias'})
            </div>
          </div>

          {/* Período Customizado (Inputs De / Até) */}
          {selectedPeriod === 'customizado' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-slate-700">Selecione as Datas:</span>
              <div className="flex items-center gap-2">
                <label className="text-slate-500">De:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-slate-500">Até:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Filtros em Linha: Profissional, Categoria de Serviço e Status */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Filtro Profissional */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500">Profissional:</span>
              <select
                value={selectedProId}
                onChange={(e) => setSelectedProId(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos ({activeProfessionals.length || 0})</option>
                {activeProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Categoria */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500">Categoria:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Status do Agendamento */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="concluido">Concluídos</option>
                <option value="confirmado">Confirmados</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="agendado">Agendados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            {/* Reset de Filtros */}
            {(selectedProId !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSelectedProId('all');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Banner de Demonstração / Dados Reais caso novo studio */}
        {simulatedData && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Demonstração Inteligente:</strong> Como o estúdio possui poucos atendimentos reais no período selecionado, estamos projetando métricas analíticas realistas baseadas na sua equipe e catálogo.
              </span>
            </div>
            <button
              onClick={() => openNewAppointmentModal()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
            >
              + Registrar Agendamento Real
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* KPI STRIP PRINCIPAL (6 INDICADORES CHAVE DO NEGÓCIO)                  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* KPI 1: Faturamento Bruto */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Receita Total
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-slate-900 font-mono block">
            {formatCurrency(revenueMetrics.totalGrossRevenue)}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold truncate">
            <ArrowUpRight className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatCurrency(revenueMetrics.totalRealizedRevenue)} realizado</span>
          </div>
        </div>

        {/* KPI 2: Total de Agendamentos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Agendamentos
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-slate-900 font-mono block">
            {professionalMetrics.totalAppointments}
          </span>
          <span className="text-[11px] text-slate-500 block truncate">
            Média de {(professionalMetrics.totalAppointments / Math.max(1, dayCount)).toFixed(1)}/dia
          </span>
        </div>

        {/* KPI 3: Serviço Campeão */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Serviço Campeão
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-900 truncate block" title={servicesMetrics.topService?.name}>
            {servicesMetrics.topService ? servicesMetrics.topService.name : 'Nenhum'}
          </span>
          <span className="text-[11px] text-amber-700 font-semibold font-mono block truncate">
            {servicesMetrics.topService ? `${servicesMetrics.topService.appointmentsCount} atendimentos` : 'Sem registros'}
          </span>
        </div>

        {/* KPI 4: Profissional Destaque */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Top Especialista
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-900 truncate block">
            {professionalMetrics.topPerformer ? professionalMetrics.topPerformer.name : 'Nenhum'}
          </span>
          <span className="text-[11px] text-purple-700 font-semibold font-mono block truncate">
            {professionalMetrics.topPerformer ? formatCurrency(professionalMetrics.topPerformer.revenue) : 'R$ 0,00'}
          </span>
        </div>

        {/* KPI 5: Ticket Médio Geral */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Ticket Médio
            </span>
            <div className="w-7 h-7 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-cyan-700 font-mono block">
            {formatCurrency(revenueMetrics.overallTicketMedio)}
          </span>
          <span className="text-[11px] text-slate-500 block truncate">
            Por cliente atendido
          </span>
        </div>

        {/* KPI 6: Lucro Líquido do Studio (Após Comissões) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Margem do Studio
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-indigo-700 font-mono block">
            {formatCurrency(revenueMetrics.netProfit)}
          </span>
          <span className="text-[11px] text-slate-500 block truncate font-mono">
            Comissões: {formatCurrency(revenueMetrics.totalCommissions)}
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SELETOR DE SUB-ABAS DOS RELATÓRIOS (NAVEGAÇÃO POR MÓDULOS)             */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto print:hidden">
        {[
          { id: 'visao_geral', label: 'Visão Geral & Gráficos', icon: BarChart3 },
          { id: 'fila_vs_agendados', label: 'Fila Virtual vs. Agendados', icon: Tv },
          { id: 'profissionais', label: 'Agendamentos por Profissional', icon: Users, badge: professionalMetrics.ranking.length },
          { id: 'servicos', label: 'Serviços Mais Procurados', icon: Scissors, badge: servicesMetrics.ranking.length },
          { id: 'receita', label: 'Receita & Comissões', icon: DollarSign },
          { id: 'horarios_retencao', label: 'Horários de Pico & Retenção', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id as ActiveSubView)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* ABA 1: VISÃO GERAL & TENDÊNCIAS                                       */}
      {/* ===================================================================== */}
      {activeSubView === 'visao_geral' && (
        <div className="space-y-6">
          {/* Relatório Rápido: Fila Virtual vs. Agendamentos Fixos e Taxa de Ocupação Diária */}
          <QueueVsAppointmentsReport
            appointments={activeAppointments}
            queueItems={activeQueueItems}
            professionals={activeProfessionals}
          />

          {/* Gráfico Principal Composto: Evolução Diária da Receita & Volume */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Evolução Diária de Faturamento e Quantidade de Atendimentos</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanhe a curva diária de vendas e o fluxo de clientes no período de {dateRangeLabel}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">Faturamento Bruto (R$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-blue-500" />
                  <span className="text-slate-700">Atendimentos</span>
                </div>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueMetrics.timeline} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportsRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis
                    yAxisId="left"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[200px]">
                          <span className="font-bold text-slate-300 block border-b border-slate-800 pb-1">
                            {data.label} ({data.date})
                          </span>
                          <div className="flex justify-between items-center text-emerald-400 font-mono font-bold">
                            <span>Receita Bruta:</span>
                            <span>{formatCurrency(data.faturamento)}</span>
                          </div>
                          <div className="flex justify-between items-center text-blue-400 font-mono font-bold">
                            <span>Atendimentos:</span>
                            <span>{data.volume} clientes</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                            <span>Ticket Médio:</span>
                            <span>{formatCurrency(data.ticketMedio)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="right" dataKey="volume" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Area yAxisId="left" type="monotone" dataKey="faturamento" stroke="#10b981" strokeWidth={2.5} fill="url(#reportsRevGrad)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráficos Secundários: Formas de Pagamento & Categorias */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formas de Pagamento */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Distribuição por Forma de Pagamento
                  </h4>
                  <p className="text-xs text-slate-400">
                    Como seus clientes pagaram no período
                  </p>
                </div>
                <Receipt className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="w-48 h-48 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueMetrics.paymentMethods}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {revenueMetrics.paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg">
                              <span className="font-bold block">{d.name}</span>
                              <span className="font-mono text-emerald-400 block font-bold">
                                {formatCurrency(d.amount)} ({d.value}%)
                              </span>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                    <span className="text-xs font-black text-slate-900 font-mono">
                      {formatCurrency(revenueMetrics.totalGrossRevenue)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs w-full">
                  {revenueMetrics.paymentMethods.map((m) => (
                    <div key={m.name} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="text-slate-700 font-medium">{m.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(m.amount)} ({m.value}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Faturamento por Categoria de Serviço */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Faturamento por Categoria
                  </h4>
                  <p className="text-xs text-slate-400">
                    Linhas de procedimentos mais rentáveis
                  </p>
                </div>
                <Scissors className="w-4 h-4 text-slate-400" />
              </div>

              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={servicesMetrics.categoriesRanking} layout="vertical" margin={{ top: 5, right: 30, left: 25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                    <YAxis type="category" dataKey="category" stroke="#475569" fontSize={11} tickLine={false} width={80} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg">
                            <span className="font-bold block">{d.category}</span>
                            <span className="font-mono text-emerald-400 block font-bold">
                              Receita: {formatCurrency(d.revenue)}
                            </span>
                            <span className="font-mono text-blue-400 block">
                              Atendimentos: {d.count}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {servicesMetrics.categoriesRanking.map((_, index) => (
                        <Cell key={`cat-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA ESPECÍFICA: FILA VIRTUAL VS. AGENDADOS & TAXA DE OCUPAÇÃO DIÁRIA  */}
      {/* ===================================================================== */}
      {activeSubView === 'fila_vs_agendados' && (
        <div className="space-y-6">
          <QueueVsAppointmentsReport
            appointments={activeAppointments}
            queueItems={activeQueueItems}
            professionals={activeProfessionals}
            selectedDate={selectedPeriod === 'hoje' ? startDate : undefined}
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: AGENDAMENTOS POR PROFISSIONAL (VOLUME, OCUPAÇÃO & COMISSÕES)   */}
      {/* ===================================================================== */}
      {activeSubView === 'profissionais' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Volume de Agendamentos e Ocupação por Profissional</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativo de quantidade de atendimentos e taxa de ocupação da grade de cada membro da equipe
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Alta Ocupação ({'>'}70%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Equilibrada (45-70%)
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Capacidade Livre ({'<'}45%)
                </span>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={professionalMetrics.ranking} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} tickLine={false} width={100} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1.5 shadow-xl border border-slate-800">
                          <span className="font-bold block border-b border-slate-800 pb-1">
                            {d.name} ({d.role})
                          </span>
                          <div className="flex justify-between items-center text-blue-400 font-mono font-bold">
                            <span>Taxa de Ocupação:</span>
                            <span>{d.occupancyRate}%</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300 font-mono">
                            <span>Agendamentos Totais:</span>
                            <span>{d.appointmentsCount}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400 font-mono font-bold">
                            <span>Receita Gerada:</span>
                            <span>{formatCurrency(d.revenue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-purple-400 font-mono">
                            <span>Comissão a Pagar ({d.commissionRate}%):</span>
                            <span>{formatCurrency(d.commission)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="occupancyRate" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {professionalMetrics.ranking.map((entry, index) => {
                      let color = '#64748b';
                      if (entry.occupancyRate >= 70) color = '#10b981';
                      else if (entry.occupancyRate >= 45) color = '#f59e0b';
                      return <Cell key={`bar-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Detalhada de Produtividade dos Profissionais */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-700" />
                  <span>Detalhamento de Agendamentos, Faturamento e Comissões por Profissional</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Valores apurados com base nos atendimentos realizados no período
                </p>
              </div>
              <button
                onClick={() => setActiveTab('profissionais')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                Gerenciar Equipe
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-3 text-center">Agendamentos</th>
                    <th className="py-3 px-3 text-center">Concluídos</th>
                    <th className="py-3 px-3 text-center">Cancelados</th>
                    <th className="py-3 px-4 text-center">Ocupação</th>
                    <th className="py-3 px-4 text-right">Faturamento</th>
                    <th className="py-3 px-4 text-right">Ticket Médio</th>
                    <th className="py-3 px-4 text-right">Comissão Devida</th>
                    <th className="py-3 px-4 text-right">Margem Studio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {professionalMetrics.ranking.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum profissional cadastrado com atividade no período.
                      </td>
                    </tr>
                  ) : (
                    professionalMetrics.ranking.map((pro, idx) => (
                      <tr key={pro.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-5 font-bold font-mono text-slate-400 text-xs">
                              #{idx + 1}
                            </span>
                            <img
                              src={
                                pro.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
                              }
                              alt={pro.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[140px] sm:max-w-[180px]">
                                {pro.name}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {pro.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {pro.appointmentsCount}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-600 font-bold">
                          {pro.completedCount}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-rose-500">
                          {pro.cancelledCount}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2 max-w-[130px] mx-auto">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pro.occupancyRate >= 70
                                    ? 'bg-emerald-500'
                                    : pro.occupancyRate >= 45
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(100, pro.occupancyRate)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs text-slate-700">
                              {pro.occupancyRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                          {formatCurrency(pro.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {formatCurrency(pro.ticketMedio)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                          {formatCurrency(pro.commission)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({pro.commissionRate}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                          {formatCurrency(pro.studioNet)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: SERVIÇOS MAIS PROCURADOS & CATÁLOGO                            */}
      {/* ===================================================================== */}
      {activeSubView === 'servicos' && (
        <div className="space-y-6">
          {/* Gráfico de Ranking dos Serviços Mais Procurados */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  <span>Ranking de Popularidade: Serviços Mais Procurados</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Quantidade total de agendamentos por tipo de procedimento
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                {servicesMetrics.totalServicesSold} procedimentos realizados
              </span>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicesMetrics.ranking.slice(0, 8)} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1 shadow-lg border border-slate-800">
                          <span className="font-bold block border-b border-slate-800 pb-1">{d.name}</span>
                          <div className="flex justify-between items-center text-amber-400 font-mono font-bold">
                            <span>Agendamentos:</span>
                            <span>{d.appointmentsCount} vezes</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-400 font-mono font-bold">
                            <span>Receita Total:</span>
                            <span>{formatCurrency(d.revenue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-300 font-mono">
                            <span>Preço de Tabela:</span>
                            <span>{formatCurrency(d.price)}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-400 font-mono">
                            <span>Duração:</span>
                            <span>{d.durationMinutes} min</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="appointmentsCount" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {servicesMetrics.ranking.map((_, index) => (
                      <Cell key={`srv-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Completa de Desempenho dos Serviços */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-slate-700" />
                  <span>Tabela Analítica de Serviços & Conversão Financeira</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Preço, frequência de escolha, participação na receita e comissão média
                </p>
              </div>

              <button
                onClick={() => setActiveTab('servicos')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                Editar Catálogo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Posição & Procedimento</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3 text-center">Duração</th>
                    <th className="py-3 px-3 text-right">Preço Unitário</th>
                    <th className="py-3 px-3 text-center">Qtd. Realizada</th>
                    <th className="py-3 px-4 text-right">Faturamento Total</th>
                    <th className="py-3 px-4 text-center">Participação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {servicesMetrics.ranking.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Nenhum serviço cadastrado com atividade no período.
                      </td>
                    </tr>
                  ) : (
                    servicesMetrics.ranking.map((srv, idx) => {
                      const sharePct = servicesMetrics.totalServicesRevenue > 0
                        ? Math.round((srv.revenue / servicesMetrics.totalServicesRevenue) * 100)
                        : 0;

                      return (
                        <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="w-5 font-bold font-mono text-slate-400 text-xs">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 block truncate max-w-[180px] sm:max-w-[240px]">
                                  {srv.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {srv.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            {srv.durationMinutes} min
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(srv.price)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-amber-600">
                            {srv.appointmentsCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                            {formatCurrency(srv.revenue)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2 max-w-[100px] mx-auto">
                              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${Math.min(100, sharePct)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-xs text-slate-700">
                                {sharePct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 4: RECEITA TOTAL & MATRIZ DE COMISSÕES                            */}
      {/* ===================================================================== */}
      {activeSubView === 'receita' && (
        <div className="space-y-6">
          {/* Gráfico de Barras Empilhadas: Repasse de Comissões vs Lucro do Studio */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Distribuição de Receita: Lucro do Studio vs Comissões da Equipe</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Veja a partição do faturamento gerado por cada profissional
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-600" />
                  <span className="text-slate-700">Margem Líquida Studio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-500" />
                  <span className="text-slate-700">Comissão do Profissional</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={professionalMetrics.ranking} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1.5 shadow-xl border border-slate-800">
                          <span className="font-bold block border-b border-slate-800 pb-1">{d.name}</span>
                          <div className="flex justify-between items-center text-slate-300 font-mono font-bold">
                            <span>Faturamento Total:</span>
                            <span>{formatCurrency(d.revenue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-purple-400 font-mono font-bold">
                            <span>Comissão a Repassar:</span>
                            <span>{formatCurrency(d.commission)}</span>
                          </div>
                          <div className="flex justify-between items-center text-indigo-400 font-mono font-bold">
                            <span>Lucro do Studio:</span>
                            <span>{formatCurrency(d.studioNet)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="studioNet" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} maxBarSize={36} />
                  <Bar dataKey="commission" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards de Balanço Financeiro Consolidado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Faturamento Bruto */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Faturamento Bruto Consolidado
              </span>
              <span className="text-3xl font-black text-slate-900 font-mono block">
                {formatCurrency(revenueMetrics.totalGrossRevenue)}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Soma de todos os serviços e procedimentos agendados ou concluídos no caixa dentro do período selecionado.
              </p>
            </div>

            {/* Card 2: Total de Comissões a Pagar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">
                Total de Comissões Devidas
              </span>
              <span className="text-3xl font-black text-purple-700 font-mono block">
                {formatCurrency(revenueMetrics.totalCommissions)}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Montante acumulado a ser repassado à equipe de especialistas, calculado de acordo com os percentuais individuais.
              </p>
            </div>

            {/* Card 3: Lucro Retido pelo Estabelecimento */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                Margem Líquida Retida no Studio
              </span>
              <span className="text-3xl font-black text-indigo-700 font-mono block">
                {formatCurrency(revenueMetrics.netProfit)}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Resultado operacional do estabelecimento após dedução de todas as comissões pagas aos profissionais.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 5: HORÁRIOS DE PICO & RETENÇÃO DE CLIENTES                        */}
      {/* ===================================================================== */}
      {activeSubView === 'horarios_retencao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Horários de Pico (08h às 20h) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Concentração por Faixa Horária
                  </h4>
                  <p className="text-xs text-slate-400">
                    Descubra os horários de maior fluxo para planejar intervalos e reforço de equipe
                  </p>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeAndRetentionMetrics.hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-xl text-xs space-y-1">
                            <span className="font-bold block">{d.hora}</span>
                            <span className="font-mono text-blue-400 block font-bold">
                              {d.atendimentos} atendimentos
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="atendimentos" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={22}>
                      {timeAndRetentionMetrics.hourlyData.map((entry, index) => {
                        const isHigh = entry.atendimentos >= 18;
                        return <Cell key={`hour-${index}`} fill={isHigh ? '#ef4444' : '#3b82f6'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <span className="text-[11px] text-slate-400 block text-center mt-2">
                * Barras em destaque vermelho indicam horários com maior concorrência de agendamentos
              </span>
            </div>

            {/* Gráfico 2: Dias da Semana */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Ocupação por Dia da Semana
                  </h4>
                  <p className="text-xs text-slate-400">
                    Distribuição da procura entre Segunda e Domingo
                  </p>
                </div>
                <CalendarDays className="w-4 h-4 text-slate-400" />
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeAndRetentionMetrics.dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2 rounded-xl text-xs space-y-1">
                            <span className="font-bold block">{d.dia}</span>
                            <span className="font-mono text-emerald-400 block font-bold">
                              {d.atendimentos} agendamentos
                            </span>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="atendimentos" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28}>
                      {timeAndRetentionMetrics.dayOfWeekData.map((_, index) => (
                        <Cell key={`dow-${index}`} fill={index >= 4 ? '#059669' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <span className="text-[11px] text-slate-400 block text-center mt-2">
                * Sexta e Sábado concentram os maiores volumes de reservas
              </span>
            </div>
          </div>

          {/* Fidelização e Retenção de Clientes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Fidelização da Clientela
                </span>
                <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Taxa de Retenção & Clientes Recorrentes: {timeAndRetentionMetrics.retentionRate}%
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  {timeAndRetentionMetrics.recurringCount} clientes já retornaram ao studio mais de uma vez, contra {timeAndRetentionMetrics.newCount} novos clientes cadastrados.
                </p>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <span className="text-2xl font-black text-emerald-600 font-mono block">
                    {timeAndRetentionMetrics.recurringCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">Clientes Fieis</span>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <span className="text-2xl font-black text-blue-600 font-mono block">
                    {timeAndRetentionMetrics.newCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">Novos Clientes</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-4">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${timeAndRetentionMetrics.retentionRate}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
