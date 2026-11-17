import React, { useMemo, useState } from 'react';
import {
  History,
  Search,
  Award,
  Gift,
  Scissors,
  SlidersHorizontal,
  ArrowUpRight,
  Download,
  Calendar,
  User,
} from 'lucide-react';
import { Appointment, Client, LoyaltyConfig, LoyaltyTransaction } from '../../types';
import { DEFAULT_LOYALTY_CONFIG, getClientLoyaltyStatus } from '../../utils/loyalty';
import { formatCurrency } from '../../utils/availability';

interface LoyaltyPointsHistoryViewProps {
  /** Pass a single client for per-client history (Client Portal or Client Details modal) */
  client?: Client | null;
  /** Pass full client list for studio-wide management audit log */
  clients?: Client[];
  appointments: Appointment[];
  config?: LoyaltyConfig;
  theme?: 'light' | 'dark';
  /** Optional click handler to open a client's details in management view */
  onSelectClient?: (client: Client) => void;
  /** Optional CTA when user has no points yet */
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
}

type TxTypeFilter = 'all' | 'earn' | 'redeem' | 'adjust';

interface EnrichedLoyaltyEntry {
  id: string;
  client: Client;
  tx: LoyaltyTransaction;
  serviceLabel: string;
  originLabel: string;
  appointment?: Appointment;
  balanceAfter: number;
  createdTimestamp: number;
  dateFormatted: string;
  timeFormatted: string;
  appointmentDateFormatted?: string;
}

function formatDatePart(iso?: string): { dateFormatted: string; timeFormatted: string; ts: number } {
  if (!iso) return { dateFormatted: '—', timeFormatted: '', ts: 0 };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateFormatted: iso.slice(0, 10), timeFormatted: '', ts: 0 };
  }
  return {
    dateFormatted: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    timeFormatted: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    ts: d.getTime(),
  };
}

function formatYmdBr(ymd?: string): string | undefined {
  if (!ymd) return undefined;
  const parts = ymd.slice(0, 10).split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function extractServiceLabel(tx: LoyaltyTransaction, appointment?: Appointment): string {
  if (tx.serviceName && tx.serviceName.trim()) {
    return tx.serviceName.trim();
  }
  if (appointment?.serviceName) {
    return appointment.serviceName;
  }
  const desc = (tx.description || '').trim();
  const prefixes = [
    'Serviço realizado (Fila):',
    'Serviço realizado:',
    'Resgate de Prêmio:',
  ];
  for (const prefix of prefixes) {
    if (desc.startsWith(prefix)) {
      const stripped = desc.slice(prefix.length).trim();
      if (stripped) return stripped;
    }
  }
  return desc || (tx.type === 'redeem' ? 'Resgate de Prêmio' : 'Movimentação de Pontos');
}

function resolveOriginLabel(tx: LoyaltyTransaction): string {
  if (tx.type === 'redeem') return 'Resgate de Benefício';
  if (tx.type === 'adjust' || tx.points < 0) return 'Ajuste Manual';
  if (tx.appointmentId && tx.comandaId) return 'Atendimento e Caixa';
  if (tx.comandaId) return 'Comanda / Caixa';
  if (tx.appointmentId) return 'Serviço Concluído';
  return 'Bônus / Carimbo Manual';
}

export const LoyaltyPointsHistoryView: React.FC<LoyaltyPointsHistoryViewProps> = ({
  client,
  clients,
  appointments,
  config = DEFAULT_LOYALTY_CONFIG,
  theme = 'light',
  onSelectClient,
  onEmptyAction,
  emptyActionLabel,
}) => {
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isDark = theme === 'dark';
  const isSingleClient = Boolean(client);

  const clientPool = useMemo(() => {
    if (client) return [client];
    return clients || [];
  }, [client, clients]);

  const appointmentsMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach((a) => map.set(a.id, a));
    return map;
  }, [appointments]);

  // Build enriched chronological entries with exact running balance per client
  const { allEntries, summary } = useMemo(() => {
    const entries: EnrichedLoyaltyEntry[] = [];
    let totalEarnedPts = 0;
    let totalRedeemedCount = 0;
    let totalRedeemedPts = 0;
    let serviceCreditsCount = 0;
    let activeBalanceSum = 0;

    clientPool.forEach((cli) => {
      const st = getClientLoyaltyStatus(cli, config);
      activeBalanceSum += st.points;

      // Sort newest-first so we can walk backwards from current balance
      const sortedHistory = [...(cli.loyaltyHistory || [])].sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );

      let runningBalance = st.points;

      sortedHistory.forEach((tx) => {
        const balanceAfter = Math.max(0, runningBalance);
        runningBalance = Math.max(0, runningBalance - (tx.points || 0));

        const linkedApp = tx.appointmentId ? appointmentsMap.get(tx.appointmentId) : undefined;
        const { dateFormatted, timeFormatted, ts } = formatDatePart(tx.createdAt);
        const appDateBr = formatYmdBr(linkedApp?.date);
        const serviceLabel = extractServiceLabel(tx, linkedApp);
        const originLabel = resolveOriginLabel(tx);

        if (tx.type === 'earn' || (tx.type === 'adjust' && tx.points > 0)) {
          totalEarnedPts += Math.max(0, tx.points);
          if (tx.serviceName || tx.appointmentId || tx.comandaId) {
            serviceCreditsCount += 1;
          }
        } else if (tx.type === 'redeem') {
          totalRedeemedCount += 1;
          totalRedeemedPts += Math.abs(tx.points);
        }

        entries.push({
          id: `${cli.id}_${tx.id}`,
          client: cli,
          tx,
          serviceLabel,
          originLabel,
          appointment: linkedApp,
          balanceAfter,
          createdTimestamp: ts,
          dateFormatted,
          timeFormatted,
          appointmentDateFormatted: appDateBr,
        });
      });
    });

    entries.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

    // Fallback totals when client has pre-existing lifetime numbers
    if (isSingleClient && client) {
      const st = getClientLoyaltyStatus(client, config);
      totalEarnedPts = Math.max(totalEarnedPts, st.totalEarned);
      totalRedeemedCount = Math.max(totalRedeemedCount, st.rewardsRedeemed);
    }

    return {
      allEntries: entries,
      summary: {
        activeBalanceSum,
        totalEarnedPts,
        totalRedeemedCount,
        totalRedeemedPts,
        serviceCreditsCount,
        totalEntriesCount: entries.length,
      },
    };
  }, [clientPool, appointmentsMap, config, isSingleClient, client]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (typeFilter === 'earn') {
        if (!(entry.tx.type === 'earn' || (entry.tx.type === 'adjust' && entry.tx.points > 0))) {
          return false;
        }
      } else if (typeFilter === 'redeem') {
        if (entry.tx.type !== 'redeem') return false;
      } else if (typeFilter === 'adjust') {
        if (!(entry.tx.type === 'adjust' && entry.tx.points < 0)) return false;
      }

      if (q) {
        const haystacks = [
          entry.serviceLabel,
          entry.tx.description,
          entry.tx.authorName || '',
          entry.originLabel,
          entry.client.name || '',
          entry.client.phone || '',
          entry.appointment?.professionalName || '',
        ];
        if (!haystacks.some((h) => h.toLowerCase().includes(q))) {
          return false;
        }
      }

      return true;
    });
  }, [allEntries, typeFilter, searchTerm]);

  const handleExportCSV = () => {
    try {
      const headers = [
        ...(isSingleClient ? [] : ['Cliente', 'Telefone']),
        'Data_Movimentacao',
        'Horario',
        'Servico_ou_Motivo',
        'Origem',
        'Data_Atendimento',
        'Profissional_Responsavel',
        'Pontos',
        'Saldo_Apos',
      ];

      const rows = filteredEntries.map((e) => [
        ...(isSingleClient
          ? []
          : [
              `"${(e.client.name || '').replace(/"/g, '""')}"`,
              `"${(e.client.phone || '').replace(/"/g, '""')}"`,
            ]),
        e.dateFormatted,
        e.timeFormatted || '-',
        `"${e.serviceLabel.replace(/"/g, '""')}"`,
        `"${e.originLabel}"`,
        e.appointmentDateFormatted || '-',
        `"${(e.appointment?.professionalName || e.tx.authorName || '-').replace(/"/g, '""')}"`,
        e.tx.points > 0 ? `+${e.tx.points}` : `${e.tx.points}`,
        e.balanceAfter,
      ]);

      const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        isSingleClient && client
          ? `historico_pontos_${client.name.toLowerCase().replace(/\s+/g, '_')}.csv`
          : 'historico_pontos_fidelidade.csv'
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar histórico de pontos:', err);
    }
  };

  const countsByType = useMemo(() => {
    let earn = 0;
    let redeem = 0;
    let adjust = 0;
    allEntries.forEach((e) => {
      if (e.tx.type === 'redeem') redeem++;
      else if (e.tx.type === 'adjust' && e.tx.points < 0) adjust++;
      else earn++;
    });
    return { all: allEntries.length, earn, redeem, adjust };
  }, [allEntries]);

  return (
    <div className="space-y-4">
      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isSingleClient ? 'Saldo Atual' : 'Saldo Ativo na Base'}
          </span>
          <span
            className={`text-xl font-extrabold font-mono tabular-nums mt-0.5 block ${
              isDark ? 'text-amber-400' : 'text-slate-900'
            }`}
          >
            {summary.activeBalanceSum} pts
          </span>
          <span className={`text-[11px] font-mono tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Meta do cartão: {config.rewardThreshold} pts
          </span>
        </div>

        <div
          className={`p-3.5 sm:p-4 rounded-2xl border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pontos Acumulados
          </span>
          <span
            className={`text-xl font-extrabold font-mono tabular-nums mt-0.5 block ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            +{summary.totalEarnedPts} pts
          </span>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            +{config.pointsPerService} pt por serviço
          </span>
        </div>

        <div
          className={`p-3.5 sm:p-4 rounded-2xl border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Serviços Pontuados
          </span>
          <span className="text-xl font-extrabold font-mono tabular-nums mt-0.5 block">
            {summary.serviceCreditsCount}
          </span>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Registros vinculados a serviços
          </span>
        </div>

        <div
          className={`p-3.5 sm:p-4 rounded-2xl border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Prêmios Resgatados
          </span>
          <span className="text-xl font-extrabold font-mono tabular-nums mt-0.5 block">
            {summary.totalRedeemedCount}
          </span>
          <span className={`text-[11px] truncate block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {summary.totalRedeemedPts > 0 ? `${summary.totalRedeemedPts} pts utilizados` : config.rewardTitle}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          isDark
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `Todos (${countsByType.all})` },
              { id: 'earn', label: `Pontos Ganhos (${countsByType.earn})` },
              { id: 'redeem', label: `Resgates (${countsByType.redeem})` },
              ...(countsByType.adjust > 0
                ? [{ id: 'adjust' as const, label: `Ajustes (${countsByType.adjust})` }]
                : []),
            ] as Array<{ id: TxTypeFilter; label: string }>
          ).map((tab) => {
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? isDark
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-white'
                    : isDark
                    ? 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isSingleClient
                  ? 'Buscar serviço ou profissional...'
                  : 'Buscar cliente, serviço ou profissional...'
              }
              className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none w-full sm:w-60 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:bg-white'
              }`}
            />
          </div>

          {filteredEntries.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Exportar CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Points Ledger Table / Timeline */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        {filteredEntries.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <History className={`w-9 h-9 mx-auto ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {allEntries.length === 0
                ? 'Nenhuma movimentação de pontos registrada ainda'
                : 'Nenhum registro encontrado para este filtro'}
            </h4>
            <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {allEntries.length === 0
                ? 'Cada serviço concluído no agendamento, na fila virtual ou no fechamento de comanda gera automaticamente um registro com data, serviço e pontos acumulados.'
                : 'Tente limpar a busca ou selecionar outro tipo de movimentação.'}
            </p>
            {allEntries.length === 0 && onEmptyAction && emptyActionLabel && (
              <button
                type="button"
                onClick={onEmptyAction}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <span>{emptyActionLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                      : 'bg-slate-50/80 border-slate-100 text-slate-500'
                  }`}
                >
                  <th className="py-3 px-4">Data e Hora</th>
                  {!isSingleClient && <th className="py-3 px-3">Cliente</th>}
                  <th className="py-3 px-4">Serviço / Origem da Pontuação</th>
                  <th className="py-3 px-3">Profissional / Registro</th>
                  <th className="py-3 px-4 text-right">Pontos</th>
                  <th className="py-3 px-4 text-right">Saldo Após</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {filteredEntries.map((entry) => {
                  const isEarn = entry.tx.points > 0;
                  const isRedeem = entry.tx.type === 'redeem';
                  const proName = entry.appointment?.professionalName || entry.tx.authorName;

                  return (
                    <tr
                      key={entry.id}
                      onClick={
                        !isSingleClient && onSelectClient
                          ? () => onSelectClient(entry.client)
                          : undefined
                      }
                      className={`transition-colors ${
                        !isSingleClient && onSelectClient ? 'cursor-pointer' : ''
                      } ${
                        isDark
                          ? 'hover:bg-slate-800/50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Data e Hora */}
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5 font-mono tabular-nums font-bold">
                          <Calendar
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          />
                          <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                            {entry.dateFormatted}
                          </span>
                        </div>
                        {entry.timeFormatted && (
                          <span
                            className={`text-[11px] font-mono tabular-nums block pl-5 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            às {entry.timeFormatted}
                          </span>
                        )}
                      </td>

                      {/* Cliente (somente na visão geral da gestão) */}
                      {!isSingleClient && (
                        <td className="py-3 px-3 align-top">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-900 truncate max-w-[160px]">
                              {entry.client.name}
                            </span>
                          </div>
                          {entry.client.phone && (
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 block pl-5">
                              {entry.client.phone}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Serviço / Origem */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isRedeem
                                ? isDark
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-amber-50 text-amber-600'
                                : isEarn
                                ? isDark
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : isDark
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isRedeem ? (
                              <Gift className="w-3.5 h-3.5" />
                            ) : entry.tx.serviceName || entry.appointment ? (
                              <Scissors className="w-3.5 h-3.5" />
                            ) : isEarn ? (
                              <Award className="w-3.5 h-3.5" />
                            ) : (
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <span
                              className={`font-bold block ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {entry.serviceLabel}
                            </span>
                            <span
                              className={`text-[11px] block ${
                                isDark ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              {entry.originLabel}
                              {entry.appointmentDateFormatted &&
                              entry.appointmentDateFormatted !== entry.dateFormatted
                                ? ` · Atendimento em ${entry.appointmentDateFormatted}`
                                : ''}
                              {entry.appointment?.price
                                ? ` · ${formatCurrency(entry.appointment.price)}`
                                : ''}
                            </span>
                            {entry.tx.description &&
                              entry.tx.description !== entry.serviceLabel &&
                              !entry.tx.description.endsWith(entry.serviceLabel) && (
                                <span
                                  className={`text-[11px] block truncate max-w-md ${
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                  }`}
                                >
                                  {entry.tx.description}
                                </span>
                              )}
                          </div>
                        </div>
                      </td>

                      {/* Profissional / Autor */}
                      <td className="py-3 px-3 align-top">
                        <span className={isDark ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium'}>
                          {proName || 'Sistema automático'}
                        </span>
                      </td>

                      {/* Variação de Pontos */}
                      <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                        <span
                          className={`font-mono tabular-nums font-extrabold ${
                            isRedeem
                              ? isDark
                                ? 'text-amber-400'
                                : 'text-amber-700'
                              : isEarn
                              ? isDark
                                ? 'text-emerald-400'
                                : 'text-emerald-700'
                              : isDark
                              ? 'text-rose-400'
                              : 'text-rose-700'
                          }`}
                        >
                          {isEarn ? `+${entry.tx.points}` : entry.tx.points} pts
                        </span>
                      </td>

                      {/* Saldo Após */}
                      <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {entry.balanceAfter} pts
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
