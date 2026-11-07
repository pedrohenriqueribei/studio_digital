import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Scissors,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Tag,
  Star,
  PlusCircle,
} from 'lucide-react';
import { Appointment, Professional, Service, Comanda } from '../../types';
import { formatCurrency } from '../../utils/availability';

interface TopPerformersRankingProps {
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  comandas?: Comanda[];
  onNavigateTab?: (tab: 'agenda' | 'servicos' | 'profissionais' | 'comandas' | 'relatorios') => void;
  onOpenNewAppointment?: () => void;
  className?: string;
}

export const TopPerformersRanking: React.FC<TopPerformersRankingProps> = ({
  appointments,
  professionals,
  services,
  comandas = [],
  onNavigateTab,
  onOpenNewAppointment,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<'both' | 'professionals' | 'services'>('both');
  const [monthOffset, setMonthOffset] = useState<number>(0); // 0 = mês atual, -1 = mês anterior

  // Calcula o mês de referência
  const { currentMonthPrefix, monthLabel, isCurrentMonth } = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    return {
      currentMonthPrefix: `${yyyy}-${mm}`,
      monthLabel: `${monthNames[d.getMonth()]} de ${yyyy}`,
      isCurrentMonth: monthOffset === 0,
    };
  }, [monthOffset]);

  // Filtra agendamentos do mês de referência (não cancelados)
  const monthAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.date && a.date.startsWith(currentMonthPrefix) && a.status !== 'cancelado'
    );
  }, [appointments, currentMonthPrefix]);

  // Se não houver dados reais no mês (ex: estúdio recém-criado), gera dados demonstrativos inteligentes
  const hasRealMonthData = monthAppointments.length > 0;

  // =========================================================================
  // 1. RANKING DOS 5 PROFISSIONAIS COM MAIOR VOLUME DE ATENDIMENTOS DO MÊS
  // =========================================================================
  const top5Professionals = useMemo(() => {
    if (hasRealMonthData) {
      // Contabiliza volume e faturamento por profissional
      const map = new Map<
        string,
        {
          professional: Professional;
          volume: number;
          completedVolume: number;
          revenue: number;
        }
      >();

      // Inicializa profissionais cadastrados
      professionals.forEach((pro) => {
        if (pro.active !== false) {
          map.set(pro.id, {
            professional: pro,
            volume: 0,
            completedVolume: 0,
            revenue: 0,
          });
        }
      });

      monthAppointments.forEach((a) => {
        if (!a.professionalId) return;
        let item = map.get(a.professionalId);
        if (!item) {
          const pro = professionals.find((p) => p.id === a.professionalId) || {
            id: a.professionalId,
            name: a.professionalName || 'Profissional',
            role: 'profissional' as const,
            avatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
            specialties: ['Especialista'],
            commissionPercentage: 40,
            businessId: a.businessId,
            email: '',
            phone: '',
            active: true,
            workHours: { start: '09:00', end: '19:00', daysOfWeek: [1, 2, 3, 4, 5, 6] },
            totalEarningsMonth: 0,
            appointmentsCountMonth: 0,
          };
          item = { professional: pro, volume: 0, completedVolume: 0, revenue: 0 };
          map.set(a.professionalId, item);
        }

        item.volume += 1;
        if (a.status === 'concluido' || a.paymentStatus === 'pago') {
          item.completedVolume += 1;
        }
        item.revenue += a.price || 0;
      });

      const list = Array.from(map.values())
        .sort((a, b) => b.volume - a.volume || b.revenue - a.revenue)
        .slice(0, 5);

      const maxVolume = list[0]?.volume || 1;
      const totalAppointmentsInMonth = monthAppointments.length || 1;

      return list.map((item, idx) => ({
        rank: idx + 1,
        professional: item.professional,
        volume: item.volume,
        completedVolume: item.completedVolume,
        revenue: item.revenue,
        commission: (item.revenue * (item.professional.commissionPercentage || 40)) / 100,
        percentageOfTotal: Math.round((item.volume / totalAppointmentsInMonth) * 100),
        relativeProgress: Math.min(100, Math.round((item.volume / maxVolume) * 100)),
        isSimulated: false,
      }));
    }

    // Se ainda não houver agendamentos cadastrados no mês, exibe profissionais cadastrados com métricas zeradas
    if (professionals.length === 0) {
      return [];
    }

    return professionals.slice(0, 5).map((pro, idx) => ({
      rank: idx + 1,
      professional: pro,
      volume: 0,
      completedVolume: 0,
      revenue: 0,
      commission: 0,
      percentageOfTotal: 0,
      relativeProgress: 0,
      isSimulated: false,
    }));
  }, [hasRealMonthData, monthAppointments, professionals]);

  // =========================================================================
  // 2. RANKING DOS 5 SERVIÇOS MAIS PROCURADOS DO MÊS
  // =========================================================================
  const top5Services = useMemo(() => {
    if (hasRealMonthData) {
      const map = new Map<
        string,
        {
          service: Service;
          volume: number;
          revenue: number;
        }
      >();

      // Inicializa serviços cadastrados
      services.forEach((srv) => {
        if (srv.active !== false) {
          map.set(srv.id, {
            service: srv,
            volume: 0,
            revenue: 0,
          });
        }
      });

      monthAppointments.forEach((a) => {
        if (!a.serviceId) return;
        let item = map.get(a.serviceId);
        if (!item) {
          const srv = services.find((s) => s.id === a.serviceId) || {
            id: a.serviceId,
            name: a.serviceName || 'Serviço',
            category: 'Geral',
            price: a.price || 0,
            durationMinutes: 45,
            commissionPercentage: 40,
            businessId: a.businessId,
            description: '',
            allowedProfessionalIds: [],
            active: true,
          };
          item = { service: srv, volume: 0, revenue: 0 };
          map.set(a.serviceId, item);
        }

        item.volume += 1;
        item.revenue += a.price || 0;
      });

      const list = Array.from(map.values())
        .sort((a, b) => b.volume - a.volume || b.revenue - a.revenue)
        .slice(0, 5);

      const maxVolume = list[0]?.volume || 1;
      const totalAppointmentsInMonth = monthAppointments.length || 1;

      return list.map((item, idx) => ({
        rank: idx + 1,
        service: item.service,
        volume: item.volume,
        revenue: item.revenue,
        percentageOfTotal: Math.round((item.volume / totalAppointmentsInMonth) * 100),
        relativeProgress: Math.min(100, Math.round((item.volume / maxVolume) * 100)),
        isSimulated: false,
      }));
    }

    // Se ainda não houver agendamentos cadastrados no mês, exibe serviços cadastrados com métricas zeradas
    if (services.length === 0) {
      return [];
    }

    return services.slice(0, 5).map((srv, idx) => ({
      rank: idx + 1,
      service: srv,
      volume: 0,
      revenue: 0,
      percentageOfTotal: 0,
      relativeProgress: 0,
      isSimulated: false,
    }));
  }, [hasRealMonthData, monthAppointments, services]);

  // Renderizador do selo de pódio (1º, 2º, 3º lugar e demais)
  const renderRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/20 ring-2 ring-amber-300/60 shrink-0">
            <Crown className="w-4 h-4 fill-slate-950 text-slate-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-900 font-extrabold text-xs flex items-center justify-center shadow-xs ring-1 ring-slate-400/40 shrink-0">
            <span>2º</span>
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-700 via-amber-600 to-amber-800 text-amber-100 font-extrabold text-xs flex items-center justify-center shadow-xs ring-1 ring-amber-600/40 shrink-0">
            <span>3º</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
            <span>{rank}º</span>
          </div>
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header do Componente com Seletor de Mês e Filtro de Visualização */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Destaques & Liderança Mensal</span>
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <strong>{monthLabel}</strong>
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Top 5 Especialistas & Serviços Mais Procurados
          </h3>
          <p className="text-xs text-slate-500">
            Métricas de maior volume de atendimentos e procedimentos líderes de demanda no mês.
          </p>
        </div>

        {/* Controles de Visão e Navegação de Mês */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Seletor Mês Atual / Mês Anterior */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setMonthOffset(0)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                isCurrentMonth
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Vigente
            </button>
            <button
              onClick={() => setMonthOffset(-1)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                monthOffset === -1
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Anterior
            </button>
          </div>

          {/* Toggle de Abas */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveView('both')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'both'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setActiveView('professionals')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'professionals'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Profissionais</span>
            </button>
            <button
              onClick={() => setActiveView('services')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'services'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Serviços</span>
            </button>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('relatorios')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Abrir Módulo de Relatórios Completo"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ver Relatórios</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid com os 2 Rankings Lado a Lado */}
      <div
        className={`grid gap-6 ${
          activeView === 'both'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* =================================================================== */}
        {/* BLOCO 1: TOP 5 PROFISSIONAIS COM MAIOR VOLUME DE ATENDIMENTOS       */}
        {/* =================================================================== */}
        {(activeView === 'both' || activeView === 'professionals') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header do Card de Profissionais */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center font-bold">
                    <Trophy className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Top 5 Profissionais por Volume
                    </h4>
                    <p className="text-xs text-slate-500">
                      Especialistas mais requisitados em {monthLabel}
                    </p>
                  </div>
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('profissionais')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Ver Equipe</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Lista dos 5 Profissionais */}
              <div className="divide-y divide-slate-100 p-2">
                {top5Professionals.map((item) => {
                  const isGold = item.rank === 1;

                  return (
                    <div
                      key={item.professional.id}
                      className={`p-3.5 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isGold
                          ? 'bg-amber-50/40 hover:bg-amber-50/70 border border-amber-200/60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Posição / Medalha */}
                        {renderRankBadge(item.rank)}

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={
                              item.professional.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face'
                            }
                            alt={item.professional.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          {isGold && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-[9px] shadow-2xs">
                              ★
                            </span>
                          )}
                        </div>

                        {/* Nome & Especialidades */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {item.professional.name}
                            </h5>
                            {isGold && (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 tracking-wider">
                                Líder do Mês
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {item.professional.specialties?.slice(0, 2).join(', ') ||
                              (item.professional.role === 'profissional'
                                ? 'Especialista'
                                : item.professional.role)}
                          </p>
                        </div>
                      </div>

                      {/* Métricas de Volume & Faturamento */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        {/* Barra de Progresso Relativa */}
                        <div className="w-24 sm:w-28 space-y-1 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                              {item.volume}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              atendimentos
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isGold
                                  ? 'bg-amber-500'
                                  : item.rank === 2
                                  ? 'bg-blue-600'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${item.relativeProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {item.percentageOfTotal}% da demanda total
                          </span>
                        </div>

                        {/* Faturamento Gerado */}
                        <div className="text-right min-w-[90px]">
                          <span className="text-xs font-mono font-extrabold text-emerald-700 block tabular-nums">
                            {formatCurrency(item.revenue)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Comissão: {formatCurrency(item.commission)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rodapé informativo */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>
                Total de especialistas listados: <strong>{top5Professionals.length}</strong>
              </span>
              {top5Professionals[0]?.isSimulated && (
                <span className="text-amber-700 font-medium">
                  * Projeção demonstrativa enquanto o estúdio registra novos atendimentos
                </span>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* BLOCO 2: TOP 5 SERVIÇOS MAIS PROCURADOS DO MÊS                      */}
        {/* =================================================================== */}
        {(activeView === 'both' || activeView === 'services') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header do Card de Serviços */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 flex items-center justify-center font-bold">
                    <Scissors className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Top 5 Serviços Mais Procurados
                    </h4>
                    <p className="text-xs text-slate-500">
                      Procedimentos mais agendados em {monthLabel}
                    </p>
                  </div>
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('servicos')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Ver Serviços</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Lista dos 5 Serviços */}
              <div className="divide-y divide-slate-100 p-2">
                {top5Services.map((item) => {
                  const isGold = item.rank === 1;

                  return (
                    <div
                      key={item.service.id}
                      className={`p-3.5 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isGold
                          ? 'bg-purple-50/40 hover:bg-purple-50/70 border border-purple-200/60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Posição / Medalha */}
                        {renderRankBadge(item.rank)}

                        {/* Detalhes do Serviço */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {item.service.name}
                            </h5>
                            {item.service.category && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {item.service.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{item.service.durationMinutes} min</span>
                            <span>·</span>
                            <span>Valor unitário: <strong>{formatCurrency(item.service.price)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas de Volume & Receita do Serviço */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        {/* Barra de Progresso de Volume */}
                        <div className="w-24 sm:w-28 space-y-1 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
                              {item.volume}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              reservas
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isGold
                                  ? 'bg-purple-600'
                                  : item.rank === 2
                                  ? 'bg-blue-600'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${item.relativeProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {item.percentageOfTotal}% da procura
                          </span>
                        </div>

                        {/* Total em R$ gerado pelo serviço */}
                        <div className="text-right min-w-[90px]">
                          <span className="text-xs font-mono font-extrabold text-emerald-700 block tabular-nums">
                            {formatCurrency(item.revenue)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            faturado no mês
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rodapé informativo */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>
                Total de serviços no ranking: <strong>{top5Services.length}</strong>
              </span>
              {onOpenNewAppointment && (
                <button
                  onClick={onOpenNewAppointment}
                  className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Novo Agendamento</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
