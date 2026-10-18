import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
  Layers,
  ArrowUpRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { Appointment, Comanda, UserRole, Professional } from '../../types';

interface WeeklyPerformanceChartProps {
  appointments: Appointment[];
  comandas: Comanda[];
  currentRole: UserRole;
  currentProfessional: Professional | null;
  tradeName?: string;
  onNewAppointment?: () => void;
  onNewComanda?: () => void;
}

type MainChartTab = 'misto' | 'volume' | 'faturamento';
type VolumeSubView = 'total' | 'status';

export const WeeklyPerformanceChart: React.FC<WeeklyPerformanceChartProps> = ({
  appointments,
  comandas,
  currentRole,
  currentProfessional,
  tradeName = 'Studio',
  onNewAppointment,
  onNewComanda,
}) => {
  const [activeTab, setActiveTab] = useState<MainChartTab>('misto');
  const [volumeSubView, setVolumeSubView] = useState<VolumeSubView>('total');
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = prev week, etc.

  // Reference date: standard app date anchor (2026-10-15 or today)
  const baseDate = useMemo(() => {
    const d = new Date('2026-10-15T12:00:00');
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const todayStr = '2026-10-15';

  // Calculate Monday - Sunday for the selected week
  const weekDays = useMemo(() => {
    const currentDay = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const fullDayNames = [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo',
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        name: dayNames[i],
        fullName: fullDayNames[i],
        dateStr,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [baseDate, todayStr]);

  // Filter appointments for the target professional if role is professional
  const scopedAppointments = useMemo(() => {
    if (currentRole === 'profissional' && currentProfessional) {
      return appointments.filter((a) => a.professionalId === currentProfessional.id);
    }
    return appointments;
  }, [appointments, currentRole, currentProfessional]);

  // Filter comandas for the target professional if role is professional
  const scopedComandas = useMemo(() => {
    if (currentRole === 'profissional' && currentProfessional) {
      return comandas.filter((c) => c.professionalId === currentProfessional.id);
    }
    return comandas;
  }, [comandas, currentRole, currentProfessional]);

  // Aggregate daily metrics
  const chartData = useMemo(() => {
    return weekDays.map((day) => {
      // Appointments on this date
      const dayApps = scopedAppointments.filter((a) => a.date === day.dateStr);

      const totalApps = dayApps.length;
      const concluidos = dayApps.filter((a) => a.status === 'concluido').length;
      const confirmados = dayApps.filter((a) => a.status === 'confirmado').length;
      const em_atendimento = dayApps.filter((a) => a.status === 'em_atendimento').length;
      const pendentes = dayApps.filter((a) => a.status === 'agendado').length;
      const cancelados = dayApps.filter((a) => a.status === 'cancelado').length;

      // Comandas closed on this date
      const dayComandas = scopedComandas.filter((c) => {
        if (c.status !== 'fechada') return false;
        if (c.closedAt && c.closedAt.startsWith(day.dateStr)) return true;
        if (c.createdAt && c.createdAt.startsWith(day.dateStr)) return true;
        return false;
      });

      const comandaRevenue = dayComandas.reduce((sum, c) => sum + (c.total || 0), 0);

      // Scheduled appointment revenue (non-cancelled)
      const scheduledRevenue = dayApps
        .filter((a) => a.status !== 'cancelado')
        .reduce((sum, a) => sum + (a.price || 0), 0);

      // Consolidated Revenue: use closed comandas, or if no comanda registered yet, use scheduled revenue
      const faturamento = comandaRevenue > 0 ? comandaRevenue : scheduledRevenue;
      const faturamentoRealizado = comandaRevenue > 0
        ? comandaRevenue
        : dayApps.filter((a) => a.status === 'concluido' || a.paymentStatus === 'pago').reduce((sum, a) => sum + a.price, 0);

      const ticketMedio = totalApps > 0 ? faturamento / totalApps : 0;

      return {
        name: day.name,
        fullName: day.fullName,
        dateStr: day.dateStr,
        displayLabel: `${day.name} ${day.dayNumber}/${day.monthNumber}`,
        isToday: day.isToday,
        total: totalApps,
        concluidos,
        confirmados,
        em_atendimento,
        pendentes,
        cancelados,
        faturamento,
        faturamentoRealizado,
        faturamentoPrevisto: scheduledRevenue,
        ticketMedio,
      };
    });
  }, [weekDays, scopedAppointments, scopedComandas]);

  // Aggregate weekly KPIs
  const weeklySummary = useMemo(() => {
    const totalAppointments = chartData.reduce((acc, d) => acc + d.total, 0);
    const totalRevenue = chartData.reduce((acc, d) => acc + d.faturamento, 0);
    const totalRealizedRevenue = chartData.reduce((acc, d) => acc + d.faturamentoRealizado, 0);
    const avgPerDay = (totalAppointments / 7).toFixed(1);
    const ticketMedioGeral = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    // Peak day
    const peakVolumeDay = [...chartData].sort((a, b) => b.total - a.total)[0];
    const peakRevenueDay = [...chartData].sort((a, b) => b.faturamento - a.faturamento)[0];

    const hasData = totalAppointments > 0 || totalRevenue > 0;

    return {
      totalAppointments,
      totalRevenue,
      totalRealizedRevenue,
      avgPerDay,
      ticketMedioGeral,
      peakVolumeDay,
      peakRevenueDay,
      hasData,
    };
  }, [chartData]);

  // Week label formatting
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.dayNumber}/${start.monthNumber} a ${end.dayNumber}/${end.monthNumber}`;
  }, [weekDays]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header with Navigation and Mode Selectors */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-2xs">
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Desempenho Semanal: Atendimentos & Faturamento
                </h3>
                {weekOffset === 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200/60">
                    Semana Atual
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Acompanhamento em tempo real do fluxo de clientes e receita gerada · {tradeName}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Controls (Tabs + Week Nav) */}
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          {/* Week Offset Navigator */}
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-0.5 text-xs">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 font-mono font-medium text-slate-700 select-none">
              {weekRangeLabel}
            </span>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 hover:bg-white hover:text-slate-900 rounded-lg text-slate-500 transition-colors cursor-pointer"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-[10px] text-blue-600 font-semibold px-2 hover:underline cursor-pointer"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Main Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('misto')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'misto'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visão Mista</span>
            </button>
            <button
              onClick={() => setActiveTab('faturamento')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'faturamento'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Faturamento</span>
            </button>
            <button
              onClick={() => setActiveTab('volume')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'volume'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Volume</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100">
        {/* KPI 1: Volume Semanal */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
              Atendimentos
            </span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {weeklySummary.totalAppointments}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              (média {weeklySummary.avgPerDay}/dia)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            {weeklySummary.peakVolumeDay.total > 0
              ? `Pico: ${weeklySummary.peakVolumeDay.fullName.split('-')[0]} (${weeklySummary.peakVolumeDay.total})`
              : 'Sem atendimentos agendados'}
          </span>
        </div>

        {/* KPI 2: Faturamento Semanal */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-emerald-700 text-[11px] uppercase tracking-wider">
              Faturamento Semanal
            </span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-600 font-mono tabular-nums">
              R$ {weeklySummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            {weeklySummary.totalRealizedRevenue > 0
              ? `R$ ${weeklySummary.totalRealizedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} já faturado`
              : 'Faturamento projetado da semana'}
          </span>
        </div>

        {/* KPI 3: Ticket Médio */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-indigo-700 text-[11px] uppercase tracking-wider">
              Ticket Médio
            </span>
            <Receipt className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-indigo-600 font-mono tabular-nums">
              R$ {weeklySummary.ticketMedioGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            Média por cliente atendido
          </span>
        </div>

        {/* KPI 4: Melhor Dia Financeiro */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-amber-700 text-[11px] uppercase tracking-wider">
              Melhor Dia
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900 truncate">
              {weeklySummary.peakRevenueDay.faturamento > 0
                ? weeklySummary.peakRevenueDay.name
                : 'Em aberto'}
            </span>
            {weeklySummary.peakRevenueDay.faturamento > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-600">
                (R$ {weeklySummary.peakRevenueDay.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0 })})
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
            {weeklySummary.peakRevenueDay.faturamento > 0
              ? weeklySummary.peakRevenueDay.fullName
              : 'Aguardando atendimentos'}
          </span>
        </div>
      </div>

      {/* Sub-view toggle when activeTab === 'volume' */}
      {activeTab === 'volume' && (
        <div className="px-6 pt-4 pb-1 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Modo de visualização do volume:</span>
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => setVolumeSubView('total')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                volumeSubView === 'total'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Volume Total
            </button>
            <button
              onClick={() => setVolumeSubView('status')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                volumeSubView === 'status'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Segmentado por Status
            </button>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div className="p-3 sm:p-6">
        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'misto' ? (
              // Composed Chart: Volume (Bars) + Faturamento (Curved Area/Line) on Dual Axes
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 25, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayLabel"
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  tick={({ x, y, payload }) => {
                    const item = chartData.find((d) => d.displayLabel === payload.value);
                    const isToday = item?.isToday;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="middle"
                          fill={isToday ? '#2563eb' : '#64748b'}
                          fontSize={11}
                          fontWeight={isToday ? 700 : 500}
                        >
                          {payload.value}
                        </text>
                        {isToday && <circle cx={0} cy={24} r={2.5} fill="#2563eb" />}
                      </g>
                    );
                  }}
                />
                {/* Left YAxis: Volume */}
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                  label={{
                    value: 'Atendimentos',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 20,
                    fill: '#94a3b8',
                    fontSize: 10,
                  }}
                />
                {/* Right YAxis: Faturamento (R$) */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#059669', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  label={{
                    value: 'Receita (R$)',
                    angle: 90,
                    position: 'insideRight',
                    offset: 20,
                    fill: '#059669',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[220px]">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                            <span className="font-bold text-slate-100">{data.fullName}</span>
                            {data.isToday && (
                              <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                HOJE
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-slate-200">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                                Volume de Atendimentos:
                              </span>
                              <span className="font-mono font-bold text-white text-xs">
                                {data.total}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                                Faturamento:
                              </span>
                              <span className="font-mono font-bold text-emerald-400 text-xs">
                                R$ {data.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {data.total > 0 && (
                              <div className="flex justify-between items-center text-indigo-300 text-[11px] pt-1 border-t border-slate-800/80">
                                <span>Ticket Médio do dia:</span>
                                <span className="font-mono font-semibold">
                                  R$ {data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                />
                {/* Bar for Appointments volume */}
                <Bar
                  yAxisId="left"
                  dataKey="total"
                  name="Volume (atendimentos)"
                  fill="#1e293b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                  animationDuration={600}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isToday ? '#2563eb' : '#0f172a'}
                    />
                  ))}
                </Bar>
                {/* Area & Line for Revenue */}
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento (R$)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  animationDuration={800}
                />
              </ComposedChart>
            ) : activeTab === 'faturamento' ? (
              // Dedicated Revenue Area / Bar Chart
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pureRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayLabel"
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#059669', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[210px]">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                            <span className="font-bold text-slate-100">{data.fullName}</span>
                            {data.isToday && (
                              <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                HOJE
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 font-mono">
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span className="font-sans">Faturamento Total:</span>
                              <span>R$ {data.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {data.faturamentoRealizado > 0 && (
                              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                                <span className="font-sans">Já Recebido:</span>
                                <span>R$ {data.faturamentoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-indigo-300 text-[11px]">
                              <span className="font-sans">Ticket Médio:</span>
                              <span>R$ {data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-[11px]">
                              <span className="font-sans">Atendimentos:</span>
                              <span>{data.total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  name="Faturamento Diário"
                  stroke="#059669"
                  strokeWidth={3}
                  fill="url(#pureRevenueGradient)"
                  dot={{ r: 4, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#047857', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              // Dedicated Volume Bar Chart (Total or Segmented)
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayLabel"
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[210px]">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                            <span className="font-bold text-slate-100">{data.fullName}</span>
                            {data.isToday && (
                              <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs">
                                HOJE
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex justify-between items-center text-slate-200 font-bold pb-1">
                              <span className="font-sans flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                Volume Total:
                              </span>
                              <span className="text-white text-xs">{data.total} atendimentos</span>
                            </div>
                            {data.concluidos > 0 && (
                              <div className="flex justify-between items-center text-emerald-300">
                                <span className="font-sans flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Concluídos:
                                </span>
                                <span>{data.concluidos}</span>
                              </div>
                            )}
                            {data.confirmados > 0 && (
                              <div className="flex justify-between items-center text-blue-300">
                                <span className="font-sans flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  Confirmados:
                                </span>
                                <span>{data.confirmados}</span>
                              </div>
                            )}
                            {data.em_atendimento > 0 && (
                              <div className="flex justify-between items-center text-purple-300">
                                <span className="font-sans flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                                  Em Atendimento:
                                </span>
                                <span>{data.em_atendimento}</span>
                              </div>
                            )}
                            {data.pendentes > 0 && (
                              <div className="flex justify-between items-center text-amber-300">
                                <span className="font-sans flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Pendentes:
                                </span>
                                <span>{data.pendentes}</span>
                              </div>
                            )}
                            {data.cancelados > 0 && (
                              <div className="flex justify-between items-center text-rose-300">
                                <span className="font-sans flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  Cancelados:
                                </span>
                                <span>{data.cancelados}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {volumeSubView === 'total' ? (
                  <Bar
                    dataKey="total"
                    name="Volume de Atendimentos"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                    animationDuration={600}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isToday ? '#2563eb' : '#0f172a'}
                      />
                    ))}
                  </Bar>
                ) : (
                  <>
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                    />
                    <Bar
                      dataKey="concluidos"
                      name="Concluído"
                      stackId="status"
                      fill="#10b981"
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="confirmados"
                      name="Confirmado"
                      stackId="status"
                      fill="#2563eb"
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="em_atendimento"
                      name="Em Atendimento"
                      stackId="status"
                      fill="#8b5cf6"
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="pendentes"
                      name="Pendente"
                      stackId="status"
                      fill="#f59e0b"
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="cancelados"
                      name="Cancelado"
                      stackId="status"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </>
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Empty State Banner (if 0 appointments & 0 revenue for this week) */}
        {!weeklySummary.hasData && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900">
                <span className="font-bold">Nenhum atendimento ou comanda para esta semana.</span>{' '}
                Cadastre agendamentos ou abra comandas para visualizar as curvas de desempenho.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onNewAppointment && (
                <button
                  onClick={onNewAppointment}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Novo Agendamento</span>
                </button>
              )}
              {onNewComanda && (
                <button
                  onClick={onNewComanda}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Nova Comanda</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Indicator */}
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
            Dia Atual (Hoje)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-900" />
            Demais Dias
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Curva de Faturamento (R$)
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Recharts 3.x · Dados sincronizados com agenda e comandas
        </span>
      </div>
    </div>
  );
};
