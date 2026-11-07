import React, { useState, useMemo } from 'react';
import {
  Users,
  Tv,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  Receipt,
  UserCheck,
  AlertTriangle,
  Play,
  Check,
  XCircle,
  Eye,
  Sparkles,
  Calculator,
  Zap,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playReceptionChime } from '../../utils/audioChime';
import { getTodayDateString } from '../../utils/date';
import { VirtualQueueItem } from '../../types';
import {
  calculateNewClientWaitTime,
  calculateAllProfessionalsWaitTimes,
  NewClientWaitEstimation,
} from '../../utils/queueWaitCalculator';

export const VirtualQueueManager: React.FC = () => {
  const {
    activeQueueItems,
    activeAppointments,
    activeProfessionals,
    activeServices,
    currentBusiness,
    setIsNewQueueModalOpen,
    callQueueTicket,
    startQueueAttendance,
    finishQueueAttendance,
    cancelQueueTicket,
    navigateTo,
    setActiveTab,
  } = useApp();

  const [selectedProFilter, setSelectedProFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [proModalForQueueItem, setProModalForQueueItem] = useState<VirtualQueueItem | null>(null);
  const [selectedProForStart, setSelectedProForStart] = useState<string>('');

  const todayStr = getTodayDateString();

  // Filtragem de itens da fila
  const filteredQueueItems = useMemo(() => {
    return activeQueueItems.filter((q) => {
      // Filtrar apenas itens de hoje ou que não estejam concluídos/cancelados há mais de 1 dia
      const isToday = q.joinedAt ? q.joinedAt.startsWith(todayStr) : true;
      if (!isToday && (q.status === 'concluido' || q.status === 'cancelado' || q.status === 'desistiu')) {
        return false;
      }

      if (selectedProFilter !== 'all') {
        const matchesPro =
          q.assignedProfessionalId === selectedProFilter ||
          q.professionalId === selectedProFilter ||
          (q.anyProfessional && q.status === 'aguardando');
        if (!matchesPro) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = q.clientName.toLowerCase().includes(term);
        const matchesTicket = q.ticketNumber.toLowerCase().includes(term);
        const matchesService = q.serviceName.toLowerCase().includes(term);
        if (!matchesName && !matchesTicket && !matchesService) return false;
      }

      return true;
    });
  }, [activeQueueItems, todayStr, selectedProFilter, searchTerm]);

  // Agrupamento por colunas
  const waitingList = useMemo(
    () => filteredQueueItems.filter((q) => q.status === 'aguardando'),
    [filteredQueueItems]
  );

  const calledList = useMemo(
    () => filteredQueueItems.filter((q) => q.status === 'chamado'),
    [filteredQueueItems]
  );

  const inProgressList = useMemo(
    () => filteredQueueItems.filter((q) => q.status === 'em_atendimento'),
    [filteredQueueItems]
  );

  const completedTodayList = useMemo(
    () =>
      activeQueueItems.filter(
        (q) =>
          q.status === 'concluido' &&
          (q.completedAt ? q.completedAt.startsWith(todayStr) : q.joinedAt.startsWith(todayStr))
      ),
    [activeQueueItems, todayStr]
  );

  // Agendamentos de hoje para a Coluna de Prioridade
  const todayAppointments = useMemo(() => {
    return activeAppointments
      .filter((a) => a.date === todayStr && a.status !== 'cancelado')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activeAppointments, todayStr]);

  // Média de tempo de espera atual da fila
  const avgWaitMinutes = useMemo(() => {
    if (waitingList.length === 0) return 0;
    const total = waitingList.reduce((acc, curr) => acc + (curr.estimatedWaitMinutes || 15), 0);
    return Math.round(total / waitingList.length);
  }, [waitingList]);

  // Algoritmo simples de cálculo do tempo de espera estimado para novos clientes
  // com base na média de duração dos serviços do profissional selecionado
  const allProsEstimations = useMemo(() => {
    return calculateAllProfessionalsWaitTimes(
      activeProfessionals,
      activeServices,
      activeQueueItems
    );
  }, [activeProfessionals, activeServices, activeQueueItems]);

  const selectedProEstimation = useMemo<NewClientWaitEstimation | null>(() => {
    if (selectedProFilter === 'all') return null;
    return calculateNewClientWaitTime(
      selectedProFilter,
      activeProfessionals,
      activeServices,
      activeQueueItems,
      true
    );
  }, [selectedProFilter, activeProfessionals, activeServices, activeQueueItems]);

  // Chamada de senha com som
  const handleCallTicket = async (id: string) => {
    playReceptionChime();
    await callQueueTicket(id);
  };

  // Rechamar com som e atualizar carimbo de chamada em tempo real no Firestore
  const handleRepeatCall = async (item: VirtualQueueItem) => {
    playReceptionChime();
    await callQueueTicket(item.id);
  };

  // Abrir modal de início de atendimento para escolher profissional se for "Qualquer disponível"
  const handleStartAttendanceClick = (item: VirtualQueueItem) => {
    if (item.anyProfessional && !item.professionalId) {
      setProModalForQueueItem(item);
      setSelectedProForStart(activeProfessionals[0]?.id || '');
    } else {
      startQueueAttendance(item.id, item.professionalId);
    }
  };

  const handleConfirmStartWithPro = async () => {
    if (!proModalForQueueItem) return;
    await startQueueAttendance(proModalForQueueItem.id, selectedProForStart);
    setProModalForQueueItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
              Encaixes Inteligentes
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentBusiness?.tradeName || 'Estabelecimento'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Fila Virtual & Recepção Digital
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Gerencie clientes presenciais sem agendamento prévio preservando os horários marcados,
            com chamada sonora no Painel de TV e abertura automática de comanda no Caixa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigateTo('/painel-tv')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
            title="Abre o painel em tela cheia para a TV da recepção com chamada sonora"
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>Abrir Painel TV Recepção</span>
          </button>

          <button
            onClick={() => setIsNewQueueModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Encaixe / Gerar Senha</span>
          </button>
        </div>
      </div>

      {/* Metric Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Na Fila Agora</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {waitingList.length}
          </div>
          <span className="text-[11px] text-slate-400">Aguardando atendimento</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Chamados no Painel</span>
            <Volume2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {calledList.length}
          </div>
          <span className="text-[11px] text-slate-400">Aguardando sentar</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Em Atendimento</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {inProgressList.length}
          </div>
          <span className="text-[11px] text-slate-400">Comandas em andamento</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">
              {selectedProEstimation ? 'Espera Novo Cliente' : 'Espera Média (Novos)'}
            </span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {selectedProEstimation
              ? selectedProEstimation.isImmediate
                ? 'Imediato'
                : `~${selectedProEstimation.estimatedWaitMinutes} min`
              : `${allProsEstimations.overallAvgWaitMinutes || avgWaitMinutes} min`}
          </div>
          <span className="text-[11px] text-slate-400 truncate block">
            {selectedProEstimation
              ? `Média de ${selectedProEstimation.avgServiceDuration} min/serviço (${selectedProEstimation.professionalName})`
              : `Média calculada entre profissionais ativos`}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por senha, cliente ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 shrink-0">Filtrar Profissional:</span>
          <select
            value={selectedProFilter}
            onChange={(e) => setSelectedProFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-auto cursor-pointer"
          >
            <option value="all">Todos os Profissionais</option>
            {activeProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Painel do Algoritmo: Estimativa de Espera para Novos Clientes */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-900/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-indigo-400" />
                Algoritmo Preditivo de Espera
              </span>
              <span className="text-xs text-indigo-300/70 font-mono">
                Novos Clientes / Walk-in
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <span>Previsão de Espera Baseada na Média de Duração dos Serviços</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-indigo-200/80 max-w-2xl mt-0.5">
              Calcula com precisão o tempo de espera para novos clientes considerando a média aritmética de duração dos serviços do profissional selecionado e a quantidade de atendimentos à frente na fila.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {selectedProEstimation ? (
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] font-medium text-indigo-200 block">
                  Espera Estimada ({selectedProEstimation.professionalName})
                </span>
                <span className="text-xl font-black font-mono text-amber-300 flex items-center justify-end gap-1">
                  {selectedProEstimation.isImmediate ? (
                    <>
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Imediato ⚡</span>
                    </>
                  ) : (
                    `~${selectedProEstimation.estimatedWaitMinutes} min`
                  )}
                </span>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10 text-right">
                <span className="text-[10px] font-medium text-indigo-200 block">
                  Média Geral dos Profissionais
                </span>
                <span className="text-xl font-black font-mono text-emerald-300">
                  ~{allProsEstimations.overallAvgWaitMinutes} min
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Barra de Seleção Rápida de Profissional */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Selecione um profissional para ver o cálculo detalhado:</span>
            </span>
            {selectedProFilter !== 'all' && (
              <button
                onClick={() => setSelectedProFilter('all')}
                className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
              >
                Limpar seleção (ver todos)
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedProFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedProFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-white/10 text-indigo-100 hover:bg-white/15'
              }`}
            >
              <span>Todos ({activeProfessionals.length})</span>
            </button>

            {activeProfessionals.map((pro) => {
              const est = allProsEstimations.byProfessional[pro.id];
              const isSelected = selectedProFilter === pro.id;
              const isImm = est?.isImmediate;
              return (
                <button
                  key={pro.id}
                  onClick={() => setSelectedProFilter(pro.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50 shadow-sm'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="font-semibold">{pro.name}</span>
                  {est && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                        isImm
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
                          : est.estimatedWaitMinutes <= 30
                          ? 'bg-indigo-500/30 text-indigo-200'
                          : 'bg-amber-500/30 text-amber-200'
                      }`}
                    >
                      {isImm ? 'Livre ⚡' : `~${est.estimatedWaitMinutes}m`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Card Detalhado do Profissional Selecionado */}
          {selectedProEstimation ? (
            <div className="mt-3 p-4 rounded-xl bg-slate-800/80 border border-indigo-800/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/70 p-3 rounded-lg border border-white/5">
                  <span className="text-[11px] text-slate-400 block">Profissional Selecionado</span>
                  <span className="font-bold text-white text-sm mt-0.5 block truncate">
                    {selectedProEstimation.professionalName}
                  </span>
                  <span className="text-[10px] text-indigo-300">
                    {selectedProEstimation.matchingServicesCount} serviços vinculados
                  </span>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-white/5">
                  <span className="text-[11px] text-slate-400 block">Média de Duração dos Serviços</span>
                  <span className="font-bold text-indigo-300 text-sm mt-0.5 block font-mono">
                    {selectedProEstimation.avgServiceDuration} min
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">
                    Baseada nos serviços deste profissional
                  </span>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-white/5">
                  <span className="text-[11px] text-slate-400 block">Fila Atual do Profissional</span>
                  <span className="font-bold text-amber-300 text-sm mt-0.5 block font-mono">
                    {selectedProEstimation.totalAheadCount} aguardando
                    {selectedProEstimation.inAttendanceCount > 0 ? ' + 1 na cadeira' : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedProEstimation.waitingCount} na fila • {selectedProEstimation.calledCount} chamado
                  </span>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-white/5">
                  <span className="text-[11px] text-slate-400 block">Previsão para Novo Cliente</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedProEstimation.isImmediate ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" /> Atendimento Imediato
                      </span>
                    ) : (
                      <span className="text-amber-300 font-extrabold text-sm font-mono">
                        ~{selectedProEstimation.estimatedWaitMinutes} minutos
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Estimativa de início do atendimento
                  </span>
                </div>
              </div>

              {/* Explicação Matemática da Fórmula */}
              <div className="p-3 rounded-lg bg-indigo-950/70 border border-indigo-800/40 text-[11px] text-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2 flex-1">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Memória do Algoritmo: </span>
                    <span className="font-mono text-indigo-100">{selectedProEstimation.calculationFormula}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewQueueModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Gerar Senha</span>
                </button>
              </div>
            </div>
          ) : (
            /* Visão Geral quando "all" estiver selecionado */
            <div className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-200">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Selecione um profissional acima para visualizar o detalhamento matemático da estimativa para novos clientes baseado na média dos serviços dele.
                </span>
              </div>
              {allProsEstimations.fastestProfessional && (
                <div className="flex items-center gap-2 text-[11px] shrink-0">
                  <span className="text-slate-400">Menor fila no momento:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProFilter(allProsEstimations.fastestProfessional!.professionalId)}
                    className="font-bold text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-emerald-400" />
                    {allProsEstimations.fastestProfessional.professionalName} (
                    {allProsEstimations.fastestProfessional.isImmediate
                      ? 'Livre ⚡'
                      : `~${allProsEstimations.fastestProfessional.estimatedWaitMinutes} min`}
                    )
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kanban / Multi-Column Workflow Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Coluna 1: Aguardando (Fila) */}
        <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200/80 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Aguardando na Fila
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
              {waitingList.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {waitingList.length === 0 ? (
              <div className="bg-white/80 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-xs">
                Nenhum cliente aguardando no momento.
              </div>
            ) : (
              waitingList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block text-sm font-extrabold text-indigo-700 font-mono tabular-nums bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                        {item.ticketNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{item.clientName}</h4>
                      {item.clientPhone && (
                        <span className="text-[11px] text-slate-400 block">{item.clientPhone}</span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      ~{item.estimatedWaitMinutes} min
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>{item.serviceName}</span>
                      <span className="font-semibold font-mono text-slate-900">
                        R$ {item.servicePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Profissional:</span>
                      <span className="font-medium text-slate-700">
                        {item.anyProfessional ? 'Qualquer disponível' : item.professionalName || 'Não especificado'}
                      </span>
                    </div>
                  </div>

                  {item.priorityAlert === 'gap_curto' && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px] flex items-start gap-1.5 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>Alerta de Gap: Próximo agendamento do profissional inicia em breve.</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      onClick={() => cancelQueueTicket(item.id, 'desistiu')}
                      className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Desistiu
                    </button>

                    <button
                      onClick={() => handleCallTicket(item.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Chamar no Painel</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 2: Chamados (Painel TV) */}
        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/70 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                2. Chamados no Painel
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-amber-200 text-amber-800">
              {calledList.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {calledList.length === 0 ? (
              <div className="bg-white/80 rounded-xl border border-dashed border-amber-200 p-6 text-center text-slate-400 text-xs">
                Nenhuma senha chamada no painel agora.
              </div>
            ) : (
              calledList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3.5 border-2 border-amber-300 shadow-sm transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block text-base font-extrabold text-amber-700 font-mono tabular-nums bg-amber-50 px-3 py-0.5 rounded-md border border-amber-200">
                        {item.ticketNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{item.clientName}</h4>
                    </div>

                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Na TV da Recepção
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Serviço:</span>
                      <span className="font-semibold text-slate-800">{item.serviceName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Atribuição:</span>
                      <span className="font-medium text-slate-700">
                        {item.anyProfessional ? 'Qualquer disponível' : item.professionalName}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2 border-t border-slate-100">
                    <button
                      onClick={() => handleStartAttendanceClick(item)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Iniciar Atendimento (Gera Comanda)</span>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleRepeatCall(item)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Rechamar Som</span>
                      </button>

                      <button
                        onClick={() => cancelQueueTicket(item.id, 'cancelado')}
                        className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        Não compareceu
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 3: Em Atendimento Ativo */}
        <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/70 flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                3. Em Atendimento
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
              {inProgressList.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {inProgressList.length === 0 ? (
              <div className="bg-white/80 rounded-xl border border-dashed border-emerald-200 p-6 text-center text-slate-400 text-xs">
                Nenhum procedimento de encaixe em andamento.
              </div>
            ) : (
              inProgressList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3.5 border border-emerald-200 shadow-2xs transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block text-xs font-bold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.ticketNumber}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{item.clientName}</h4>
                    </div>

                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Em cadeira
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Profissional:</span>
                      <span className="font-semibold text-slate-800">
                        {item.assignedProfessionalName || item.professionalName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Serviço:</span>
                      <span className="font-medium text-slate-700">{item.serviceName}</span>
                    </div>
                    {item.comandaId && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-indigo-500" />
                          Comanda Aberta:
                        </span>
                        <button
                          onClick={() => setActiveTab('comandas')}
                          className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          Ver no Caixa
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                    <button
                      onClick={() => finishQueueAttendance(item.id)}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Concluir Atendimento</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 4: Prioridade dos Agendamentos do Dia (Grade de Proteção) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col min-h-[460px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Prioridade da Grade (Hoje)
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
              {todayAppointments.length} agendados
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3 px-1">
            Clientes com horário marcado têm prioridade garantida na grade dos profissionais.
          </p>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1 divide-y divide-slate-100">
            {todayAppointments.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-xs">
                Nenhum agendamento prévio cadastrado para hoje.
              </div>
            ) : (
              todayAppointments.map((app) => (
                <div key={app.id} className="pt-2.5 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 font-mono tabular-nums">
                      {app.startTime}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        app.status === 'concluido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'em_atendimento'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {app.status === 'concluido'
                        ? 'Concluído'
                        : app.status === 'em_atendimento'
                        ? 'Em cadeira'
                        : 'Agendado'}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-800">{app.clientName}</div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{app.serviceName}</span>
                    <span className="text-indigo-600 font-medium">
                      {app.professionalName || 'Profissional'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal para Escolher Profissional ao Iniciar Atendimento de "Qualquer disponível" */}
      {proModalForQueueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Designar Profissional para Atendimento
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                A senha <strong className="font-mono text-indigo-600">{proModalForQueueItem.ticketNumber}</strong> ({proModalForQueueItem.clientName}) foi registrada para qualquer profissional disponível. Escolha quem assumirá o atendimento para gerar a comanda correta:
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Profissional Responsável</label>
              <select
                value={selectedProForStart}
                onChange={(e) => setSelectedProForStart(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {activeProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.specialties?.length ? `(${p.specialties.join(', ')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProModalForQueueItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStartWithPro}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Confirmar & Iniciar Atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
