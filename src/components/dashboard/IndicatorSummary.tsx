import React, { useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  PieChart,
  UserPlus,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Appointment, Comanda, Client, Professional, UserRole, Business } from '../../types';

interface IndicatorSummaryProps {
  appointments: Appointment[];
  comandas: Comanda[];
  clients: Client[];
  professionals: Professional[];
  currentRole: UserRole;
  currentProfessional: Professional | null;
  currentBusiness: Business | null;
  onNavigateTab?: (tab: 'agenda' | 'comandas' | 'clientes' | 'profissionais') => void;
  onOpenNewAppointment?: () => void;
}

export const IndicatorSummary: React.FC<IndicatorSummaryProps> = ({
  appointments,
  comandas,
  clients,
  professionals,
  currentRole,
  currentProfessional,
  currentBusiness,
  onNavigateTab,
  onOpenNewAppointment,
}) => {
  // Current month reference (ex: 2026-10)
  const currentMonthPrefix = '2026-10';

  // Filter appointments by role if professional
  const scopedAppointments = useMemo(() => {
    if (currentRole === 'profissional' && currentProfessional) {
      return appointments.filter((a) => a.professionalId === currentProfessional.id);
    }
    return appointments;
  }, [appointments, currentRole, currentProfessional]);

  // Appointments in the current month
  const monthAppointments = useMemo(() => {
    return scopedAppointments.filter(
      (a) => a.date.startsWith(currentMonthPrefix) && a.status !== 'cancelado'
    );
  }, [scopedAppointments, currentMonthPrefix]);

  // 1. Total de Agendamentos
  const appointmentsMetric = useMemo(() => {
    const total = monthAppointments.length;
    const concluidos = monthAppointments.filter((a) => a.status === 'concluido').length;
    const confirmados = monthAppointments.filter((a) => a.status === 'confirmado').length;
    const emAtendimento = monthAppointments.filter((a) => a.status === 'em_atendimento').length;
    const pendentes = monthAppointments.filter((a) => a.status === 'agendado').length;

    return {
      total,
      concluidos,
      confirmados,
      emAtendimento,
      pendentes,
      completionRate: total > 0 ? Math.round((concluidos / total) * 100) : 0,
    };
  }, [monthAppointments]);

  // 2. Receita Mensal
  const revenueMetric = useMemo(() => {
    // Comandas closed in current month
    const scopedComandas = currentRole === 'profissional' && currentProfessional
      ? comandas.filter((c) => c.professionalId === currentProfessional.id)
      : comandas;

    const monthComandas = scopedComandas.filter((c) => {
      if (c.status !== 'fechada') return false;
      const date = c.closedAt || c.createdAt;
      return date ? date.startsWith(currentMonthPrefix) : true;
    });

    const closedComandaRevenue = monthComandas.reduce((sum, c) => sum + (c.total || 0), 0);

    // Sum scheduled non-cancelled appointments in current month
    const scheduledRevenue = monthAppointments.reduce((sum, a) => sum + (a.price || 0), 0);

    // If comandas closed exist, use them + non-concluded scheduled appointments
    const totalRevenue = closedComandaRevenue > 0 ? closedComandaRevenue : scheduledRevenue;
    const ticketMedio = monthAppointments.length > 0 ? totalRevenue / monthAppointments.length : 0;

    return {
      total: totalRevenue,
      ticketMedio,
      comandasCount: monthComandas.length,
      realizedRevenue: closedComandaRevenue,
    };
  }, [comandas, currentRole, currentProfessional, monthAppointments, currentMonthPrefix]);

  // 3. Taxa de Ocupação da Agenda
  const occupancyMetric = useMemo(() => {
    const effectivePros = Math.max(1, professionals.length);
    // Typical working month: 22 days * 8 hours = 176 hours capacity per professional
    const capacityHoursPerMonth = effectivePros * 176;

    // Estimate duration for each appointment in hours
    const bookedHours = monthAppointments.reduce((sum, a) => {
      if (a.startTime && a.endTime) {
        try {
          const [sh, sm] = a.startTime.split(':').map(Number);
          const [eh, em] = a.endTime.split(':').map(Number);
          const diffMinutes = eh * 60 + em - (sh * 60 + sm);
          if (diffMinutes > 0) return sum + diffMinutes / 60;
        } catch {
          // fallback
        }
      }
      return sum + 0.75; // default 45 min per appointment
    }, 0);

    const rate = capacityHoursPerMonth > 0
      ? Math.min(100, Math.round((bookedHours / capacityHoursPerMonth) * 100))
      : 0;

    return {
      rate,
      bookedHours: Math.round(bookedHours),
      totalCapacityHours: capacityHoursPerMonth,
      effectivePros,
    };
  }, [professionals, monthAppointments]);

  // 4. Novos Clientes
  const clientsMetric = useMemo(() => {
    const totalClients = clients.length;
    // Clients who visited once or recently
    const newClients = clients.filter(
      (c) => (c.totalVisits || 0) <= 1 || (c.lastVisit && c.lastVisit.startsWith(currentMonthPrefix))
    ).length;

    const recurringClients = clients.filter((c) => (c.totalVisits || 0) > 1).length;
    const recurrenceRate = totalClients > 0 ? Math.round((recurringClients / totalClients) * 100) : 0;

    return {
      total: totalClients,
      newCount: newClients,
      recurringCount: recurringClients,
      recurrenceRate,
    };
  }, [clients, currentMonthPrefix]);

  return (
    <div className="space-y-3">
      {/* Component Title & Subtitle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Resumo de Indicadores · Mês Atual (Outubro 2026)
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          {currentBusiness?.tradeName || 'Studio'}
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Agendamentos */}
        <div
          onClick={() => onNavigateTab?.('agenda')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-600 text-xs uppercase tracking-wider">
              Total de Agendamentos
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {appointmentsMetric.total}
            </span>
            <span className="text-xs text-slate-500 font-medium">agendados no mês</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{appointmentsMetric.concluidos} concluídos</span>
            </span>
            <span className="font-mono font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center">
              <span>{appointmentsMetric.confirmados} confirmados</span>
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Receita Mensal */}
        <div
          onClick={() => onNavigateTab?.('comandas')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-emerald-700 text-xs uppercase tracking-wider">
              {currentRole === 'profissional' ? 'Comissão no Mês' : 'Receita Mensal'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tabular-nums">
              R$ {revenueMetric.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Ticket Médio:</span>
            </div>
            <span className="font-mono font-bold text-slate-800">
              R$ {revenueMetric.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Card 3: Taxa de Ocupação */}
        <div
          onClick={() => onNavigateTab?.('agenda')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wider">
              Taxa de Ocupação
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono tabular-nums">
              {occupancyMetric.rate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({occupancyMetric.bookedHours}h/{occupancyMetric.totalCapacityHours}h)
            </span>
          </div>

          {/* Occupancy Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyMetric.rate >= 80
                    ? 'bg-emerald-500'
                    : occupancyMetric.rate >= 40
                    ? 'bg-indigo-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(4, occupancyMetric.rate)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>{occupancyMetric.effectivePros} especialista{occupancyMetric.effectivePros > 1 ? 's' : ''}</span>
              <span className="font-medium text-slate-600">
                {occupancyMetric.rate >= 70
                  ? 'Alta Ocupação'
                  : occupancyMetric.rate > 0
                  ? 'Horários Livres'
                  : 'Agenda Disponível'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Novos Clientes */}
        <div
          onClick={() => onNavigateTab?.('clientes')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-purple-700 text-xs uppercase tracking-wider">
              Novos Clientes
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {clientsMetric.newCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              de {clientsMetric.total} cadastrados
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-slate-500">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>Recorrência:</span>
            </div>
            <span className="font-mono font-bold text-purple-600">
              {clientsMetric.recurrenceRate}% recorrentes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
