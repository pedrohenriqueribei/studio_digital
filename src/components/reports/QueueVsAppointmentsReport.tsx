import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Tv,
  Clock,
  TrendingUp,
  Percent,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  BarChart2,
  PieChart as PieIcon,
  Info,
} from 'lucide-react';
import { Appointment, Professional, VirtualQueueItem } from '../../types';
import { getTodayDateString } from '../../utils/date';

interface QueueVsAppointmentsReportProps {
  appointments: Appointment[];
  queueItems: VirtualQueueItem[];
  professionals: Professional[];
  selectedDate?: string;
  onSelectProfessional?: (proId: string) => void;
}

export const QueueVsAppointmentsReport: React.FC<QueueVsAppointmentsReportProps> = ({
  appointments,
  queueItems,
  professionals,
  selectedDate,
  onSelectProfessional,
}) => {
  const [dateFilter, setDateFilter] = useState<string>(selectedDate || getTodayDateString());
  const [selectedProFilter, setSelectedProFilter] = useState<string>('all');

  const todayStr = getTodayDateString();

  // Métricas consolidadas por profissional no dia selecionado
  const reportData = useMemo(() => {
    const activePros = professionals.filter((p) => p.active !== false);

    const proMetrics = activePros.map((pro) => {
      // 1. Agendamentos fixos no dia (exclui cancelados)
      const proApps = appointments.filter((a) => {
        if (a.date !== dateFilter || a.professionalId !== pro.id || a.status === 'cancelado') {
          return false;
        }
        return true;
      });

      const fixedCount = proApps.length;
      const fixedCompletedCount = proApps.filter((a) => a.status === 'concluido' || a.paymentStatus === 'pago').length;
      const fixedDurationMinutes = proApps.reduce((acc, a) => acc + (a.durationMinutes || 35), 0);
      const fixedRevenue = proApps.reduce((acc, a) => acc + (a.price || 0), 0);

      // 2. Atendimentos via Fila Virtual (Encaixes presenciais)
      const proQueue = queueItems.filter((q) => {
        const itemDate = q.joinedAt ? q.joinedAt.slice(0, 10) : '';
        if (itemDate !== dateFilter) return false;

        const isAssigned = q.assignedProfessionalId === pro.id || q.professionalId === pro.id;
        if (!isAssigned) return false;

        // Considera atendimentos ativos ou finalizados
        return q.status === 'em_atendimento' || q.status === 'concluido';
      });

      const queueCount = proQueue.length;
      const queueCompletedCount = proQueue.filter((q) => q.status === 'concluido').length;
      const queueDurationMinutes = proQueue.reduce((acc, q) => acc + (q.serviceDuration || 30), 0);
      const queueRevenue = proQueue.reduce((acc, q) => acc + (q.servicePrice || 0), 0);

      // 3. Totais e Proporção
      const totalAttendances = fixedCount + queueCount;
      const totalRevenue = fixedRevenue + queueRevenue;
      const totalMinutesBusy = fixedDurationMinutes + queueDurationMinutes;

      // Horas disponíveis diárias estimadas (com base no turno ou padrão de 8 horas = 480 min)
      let availableMinutes = 8 * 60; // 480 min
      if (pro.workHours?.start && pro.workHours?.end) {
        const [sh, sm] = pro.workHours.start.split(':').map(Number);
        const [eh, em] = pro.workHours.end.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        if (diff > 0) availableMinutes = diff;
      }

      // Taxa de ocupação diária
      const dailyOccupancyRate = Math.min(100, Math.round((totalMinutesBusy / availableMinutes) * 100));

      const fixedPct = totalAttendances > 0 ? Math.round((fixedCount / totalAttendances) * 100) : 0;
      const queuePct = totalAttendances > 0 ? 100 - fixedPct : 0;

      return {
        professional: pro,
        fixedCount,
        fixedCompletedCount,
        fixedDurationMinutes,
        fixedRevenue,
        queueCount,
        queueCompletedCount,
        queueDurationMinutes,
        queueRevenue,
        totalAttendances,
        totalRevenue,
        totalMinutesBusy,
        availableMinutes,
        dailyOccupancyRate,
        fixedPct,
        queuePct,
      };
    });

    // Filtra por profissional se selecionado
    const filteredPros =
      selectedProFilter === 'all'
        ? proMetrics
        : proMetrics.filter((p) => p.professional.id === selectedProFilter);

    // Totais gerais do estúdio
    const studioTotals = proMetrics.reduce(
      (acc, curr) => {
        acc.totalFixed += curr.fixedCount;
        acc.totalQueue += curr.queueCount;
        acc.totalAttendances += curr.totalAttendances;
        acc.totalRevenue += curr.totalRevenue;
        acc.totalMinutesBusy += curr.totalMinutesBusy;
        acc.totalMinutesAvailable += curr.availableMinutes;
        return acc;
      },
      {
        totalFixed: 0,
        totalQueue: 0,
        totalAttendances: 0,
        totalRevenue: 0,
        totalMinutesBusy: 0,
        totalMinutesAvailable: 0,
      }
    );

    const overallFixedPct =
      studioTotals.totalAttendances > 0
        ? Math.round((studioTotals.totalFixed / studioTotals.totalAttendances) * 100)
        : 0;

    const overallQueuePct = studioTotals.totalAttendances > 0 ? 100 - overallFixedPct : 0;

    const overallOccupancyRate =
      studioTotals.totalMinutesAvailable > 0
        ? Math.min(
            100,
            Math.round((studioTotals.totalMinutesBusy / studioTotals.totalMinutesAvailable) * 100)
          )
        : 0;

    return {
      professionalsMetrics: filteredPros,
      studioTotals,
      overallFixedPct,
      overallQueuePct,
      overallOccupancyRate,
    };
  }, [appointments, queueItems, professionals, dateFilter, selectedProFilter]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-6">
      {/* Header com Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Análise de Ocupação & Encaixes
            </span>
            <span className="text-xs text-slate-400">
              {dateFilter === todayStr ? 'Hoje' : dateFilter}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            <span>Fila Virtual vs. Agendamentos Fixos por Profissional</span>
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Acompanhe a proporção de clientes que chegam via grade agendada versus encaixes presenciais na fila virtual,
            com a taxa de ocupação diária de cada especialista.
          </p>
        </div>

        {/* Date and Pro Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />

          <select
            value={selectedProFilter}
            onChange={(e) => setSelectedProFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os Especialistas</option>
            {professionals
              .filter((p) => p.active !== false)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* KPI Banners Globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Atendimentos */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Atendimentos</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {reportData.studioTotals.totalAttendances}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span className="font-semibold text-indigo-700">{reportData.studioTotals.totalFixed} fixos</span>
            <span>•</span>
            <span className="font-semibold text-amber-700">{reportData.studioTotals.totalQueue} encaixes</span>
          </div>
        </div>

        {/* Proporção Agendamentos Fixos */}
        <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between text-indigo-800 text-xs mb-1">
            <span>Agendamentos Fixos</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-900 tabular-nums">
            {reportData.overallFixedPct}%
          </div>
          <div className="text-[11px] text-indigo-600 mt-0.5">
            Grade regular confirmada
          </div>
        </div>

        {/* Proporção Fila Virtual (Encaixes) */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/70">
          <div className="flex items-center justify-between text-amber-800 text-xs mb-1">
            <span>Fila Virtual (Encaixes)</span>
            <Tv className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 tabular-nums">
            {reportData.overallQueuePct}%
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">
            Presencial sem agendamento prévio
          </div>
        </div>

        {/* Taxa de Ocupação Diária */}
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1">
            <span>Taxa Média de Ocupação</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900 tabular-nums">
            {reportData.overallOccupancyRate}%
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Tempo em atendimento vs. disponível
          </div>
        </div>
      </div>

      {/* Tabela Comparativa Detalhada por Profissional */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Detalhamento da Ocupação Diária por Profissional
        </h4>

        {reportData.professionalsMetrics.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Nenhum profissional cadastrado ou ativo para este estabelecimento.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Profissional</th>
                  <th className="py-3 px-3 text-center">Agendados Fixos</th>
                  <th className="py-3 px-3 text-center">Fila Virtual (Encaixes)</th>
                  <th className="py-3 px-4 min-w-[200px]">Proporção (Fixo vs. Fila)</th>
                  <th className="py-3 px-3 text-center">Tempo Ocupado</th>
                  <th className="py-3 px-3 text-right">Taxa de Ocupação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reportData.professionalsMetrics.map((item) => (
                  <tr key={item.professional.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Profissional */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden">
                          {item.professional.avatar ? (
                            <img
                              src={item.professional.avatar}
                              alt={item.professional.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            item.professional.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {item.professional.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block leading-tight">
                            {item.professional.specialties?.slice(0, 2).join(', ') || 'Especialista'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Agendados Fixos */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-xs">
                        {item.fixedCount}
                      </span>
                    </td>

                    {/* Fila Virtual */}
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                        {item.queueCount}
                      </span>
                    </td>

                    {/* Proporção Barra Dupla */}
                    <td className="py-3.5 px-4">
                      {item.totalAttendances === 0 ? (
                        <span className="text-[11px] text-slate-400">Sem atendimentos hoje</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-indigo-700 font-semibold">{item.fixedPct}% Fixo</span>
                            <span className="text-amber-700 font-semibold">{item.queuePct}% Fila</span>
                          </div>

                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${item.fixedPct}%` }}
                              className="bg-indigo-600 h-full transition-all duration-300"
                              title={`Agendamentos Fixos: ${item.fixedCount}`}
                            />
                            <div
                              style={{ width: `${item.queuePct}%` }}
                              className="bg-amber-500 h-full transition-all duration-300"
                              title={`Fila Virtual: ${item.queueCount}`}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Tempo Ocupado */}
                    <td className="py-3.5 px-3 text-center font-mono tabular-nums text-slate-700">
                      {Math.floor(item.totalMinutesBusy / 60)}h{' '}
                      {item.totalMinutesBusy % 60 > 0 ? `${item.totalMinutesBusy % 60}m` : ''}
                      <span className="block text-[10px] text-slate-400">
                        de {Math.floor(item.availableMinutes / 60)}h disp.
                      </span>
                    </td>

                    {/* Taxa de Ocupação Diária */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-md ${
                            item.dailyOccupancyRate >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.dailyOccupancyRate >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : item.dailyOccupancyRate > 0
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.dailyOccupancyRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
