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
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WeeklyPerformanceChart } from './WeeklyPerformanceChart';
import { IndicatorSummary } from './IndicatorSummary';
import { getTodayDateString } from '../../utils/date';

export const ExecutiveDashboard: React.FC = () => {
  const {
    currentBusiness,
    currentRole,
    currentProfessional,
    activeAppointments,
    activeProfessionals,
    activeServices,
    activeComandas,
    activeClients,
    setActiveTab,
    setIsNewAppointmentModalOpen,
    setIsNewStudioModalOpen,
    setIsPlansModalOpen,
    updateAppointmentStatus,
  } = useApp();

  const todayStr = getTodayDateString();

  const todayAppointments = useMemo(() => {
    return activeAppointments.filter((a) => a.date === todayStr && a.status !== 'cancelado');
  }, [activeAppointments, todayStr]);

  const inServiceNow = useMemo(() => {
    return todayAppointments.filter((a) => a.status === 'em_atendimento');
  }, [todayAppointments]);

  const nextUpcoming = useMemo(() => {
    return todayAppointments
      .filter((a) => a.status === 'agendado' || a.status === 'confirmado')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [todayAppointments]);

  // Financial aggregates
  const todayRevenue = useMemo(() => {
    return activeComandas
      .filter((c) => c.status === 'fechada')
      .reduce((acc, c) => acc + c.total, 0);
  }, [activeComandas]);

  const monthRevenue = useMemo(() => {
    return activeComandas
      .filter((c) => c.status === 'fechada')
      .reduce((acc, c) => acc + c.total, 0);
  }, [activeComandas]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Role & Business Context */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-mono text-amber-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md">
                Painel {currentRole.toUpperCase()} · {currentBusiness?.tradeName || 'Studio'}
              </span>
              <span className="text-xs text-slate-400">· Hoje, 15 de Outubro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {currentRole === 'ceo'
                ? `Visão Estratégica & Desempenho`
                : currentRole === 'gerente'
                ? `Rotina Operacional & Recepção`
                : `Olá, ${currentProfessional?.name || 'Profissional'}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentRole === 'ceo'
                ? 'Monitore o faturamento consolidado, ocupação de agenda, comissionamento da equipe e expansão da sua rede de studios.'
                : currentRole === 'gerente'
                ? 'Controle o fluxo de clientes na recepção, horários em atendimento e fechamento de comandas do dia.'
                : 'Acompanhe seus horários de atendimento de hoje, clientes confirmados e comissões acumuladas no mês.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewAppointmentModalOpen(true)}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-slate-900" />
              <span>Novo Agendamento</span>
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>Ver Agenda Completa</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Resumo de Indicadores: Total de Agendamentos, Receita Mensal, Taxa de Ocupação e Novos Clientes */}
      <IndicatorSummary
        appointments={activeAppointments}
        comandas={activeComandas}
        clients={activeClients}
        professionals={activeProfessionals}
        currentRole={currentRole}
        currentProfessional={currentProfessional}
        currentBusiness={currentBusiness}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenNewAppointment={() => setIsNewAppointmentModalOpen(true)}
      />

      {/* Recharts Performance Chart: Volume de Atendimentos & Faturamento Semanal */}
      <WeeklyPerformanceChart
        appointments={activeAppointments}
        comandas={activeComandas}
        currentRole={currentRole}
        currentProfessional={currentProfessional}
        tradeName={currentBusiness?.tradeName}
        onNewAppointment={() => setIsNewAppointmentModalOpen(true)}
        onNewComanda={() => setActiveTab('comandas')}
      />

      {/* Main 2-Column Split: Active Operations & Service Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Queue / Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Fluxo de Atendimento de Hoje
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('agenda')}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Abrir Grade Completa →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {todayAppointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhum atendimento na fila para hoje.
                </div>
              ) : (
                todayAppointments.map((app) => {
                  const pro = activeProfessionals.find((p) => p.id === app.professionalId);

                  return (
                    <div
                      key={app.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 text-center shrink-0">
                          <span className="text-xs font-bold font-mono tabular-nums text-slate-900">
                            {app.startTime}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {app.endTime}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {app.clientName}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                app.status === 'em_atendimento'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                  : app.status === 'concluido'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {app.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {app.serviceName} · com {pro?.name || 'Profissional'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-mono tabular-nums text-xs font-bold text-slate-900">
                          R$ {app.price.toFixed(2)}
                        </span>

                        {app.status === 'agendado' && (
                          <button
                            onClick={() => updateAppointmentStatus(app.id, 'confirmado')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer"
                          >
                            Confirmar
                          </button>
                        )}
                        {app.status === 'confirmado' && (
                          <button
                            onClick={() => updateAppointmentStatus(app.id, 'em_atendimento')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <PlayCircle className="w-3 h-3" />
                            <span>Iniciar</span>
                          </button>
                        )}
                        {app.status === 'em_atendimento' && (
                          <button
                            onClick={() => {
                              updateAppointmentStatus(app.id, 'concluido');
                              setActiveTab('comandas');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Fechar Caixa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick SaaS Multi-Tenant Registration Card */}
          <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl border border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-amber-400">Expansão de Negócio SaaS</span>
              <h4 className="text-sm font-bold text-white mt-0.5">
                Deseja gerenciar outra barbearia, clínica ou salão de beleza?
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Cadastre novas unidades no mesmo painel com isolamento de dados, profissionais e tabelas de comissão.
              </p>
            </div>
            <button
              onClick={() => setIsNewStudioModalOpen(true)}
              className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              + Cadastrar Studio
            </button>
          </div>
        </div>

        {/* Right Column: Top Services & Quick Stats */}
        <div className="space-y-4">
          {/* Top Services */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Procedimentos Mais Realizados
              </h3>
              <Scissors className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {activeServices.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhum serviço cadastrado.</p>
              ) : (
                activeServices.slice(0, 4).map((srv) => (
                  <div key={srv.id} className="text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {srv.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-900 font-bold">
                        R$ {srv.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{srv.category} · {srv.durationMinutes} min</span>
                      <span className="text-emerald-600 font-medium font-mono tabular-nums">
                        Comissão {srv.commissionPercentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveTab('servicos')}
              className="mt-4 w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center block"
            >
              Ver Tabela de Serviços Completa
            </button>
          </div>

          {/* Quick Team Roster Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Especialistas em Atividade
              </h3>
              <Users className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2.5">
              {activeProfessionals.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Nenhum profissional cadastrado.</p>
              ) : (
                activeProfessionals.map((pro) => (
                  <div key={pro.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={pro.avatar}
                        alt={pro.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{pro.name}</p>
                        <p className="text-[10px] text-slate-400 truncate capitalize">
                          {pro.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-mono tabular-nums font-semibold shrink-0">
                      R$ {(pro.totalEarningsMonth || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveTab('profissionais')}
              className="mt-4 w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center block"
            >
              Gerenciar Equipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
