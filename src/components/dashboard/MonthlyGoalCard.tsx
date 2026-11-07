import React, { useState, useMemo, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit3,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Zap,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/availability';

interface MonthlyGoalCardProps {
  className?: string;
  onNavigateTab?: (tab: any) => void;
}

export const MonthlyGoalCard: React.FC<MonthlyGoalCardProps> = ({
  className = '',
  onNavigateTab,
}) => {
  const { currentBusiness, updateBusiness, activeComandas, activeAppointments, currentRole } = useApp();

  // Mês e dias de referência
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0 a 11
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const remainingDays = Math.max(0, totalDaysInMonth - currentDay);
  const monthPrefix = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthNames[currentMonthIdx];

  // Recupera ou define a meta padrão
  // Recupera ou define a meta padrão
  const storageKey = `studiodigital_goal_${currentBusiness?.id || 'default'}_${monthPrefix}`;
  const initialGoal = useMemo(() => {
    if (typeof currentBusiness?.monthlyRevenueGoal === 'number') {
      return currentBusiness.monthlyRevenueGoal;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    }
    return 0; // Novos estabelecimentos iniciam com meta zerada até que o gestor a defina
  }, [currentBusiness?.id, currentBusiness?.monthlyRevenueGoal, storageKey]);

  const [monthlyGoal, setMonthlyGoal] = useState<number>(initialGoal);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState<string>(String(initialGoal));
  const [inputError, setInputError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Sincroniza se a meta mudar no negócio
  useEffect(() => {
    if (typeof currentBusiness?.monthlyRevenueGoal === 'number') {
      setMonthlyGoal(currentBusiness.monthlyRevenueGoal);
      setGoalInputValue(String(currentBusiness.monthlyRevenueGoal));
    }
  }, [currentBusiness?.monthlyRevenueGoal]);

  // 1. Faturamento Realizado no Mês
  const realizedRevenue = useMemo(() => {
    // Primeiro tenta somar comandas fechadas no mês
    const closedThisMonth = activeComandas.filter((c) => {
      const dateStr = (c.closedAt || c.createdAt || '').slice(0, 10);
      return dateStr.startsWith(monthPrefix) && c.status === 'fechada';
    });

    const comandaTotal = closedThisMonth.reduce((acc, c) => acc + (c.total || 0), 0);
    if (comandaTotal > 0) return comandaTotal;

    // Se ainda não houver comandas fechadas no mês, soma agendamentos realizados/concluídos
    const appsThisMonth = activeAppointments.filter((a) => {
      return a.date.startsWith(monthPrefix) && (a.status === 'concluido' || a.paymentStatus === 'pago');
    });

    const appsTotal = appsThisMonth.reduce((acc, a) => acc + (a.price || 0), 0);
    if (appsTotal > 0) return appsTotal;

    // Se for um estúdio recém-criado sem atendimentos ou comandas, retorna estritamente 0
    return 0;
  }, [activeComandas, activeAppointments, monthPrefix]);

  // 2. Cálculos Comparativos entre Realizado e Esperado
  const metrics = useMemo(() => {
    const isGoalDefined = monthlyGoal > 0;
    const goal = isGoalDefined ? monthlyGoal : 0;
    // Progresso percentual da meta
    const progressPct = isGoalDefined ? Math.round((realizedRevenue / goal) * 100) : 0;

    // Ritmo esperado até o dia atual (Pacing): dia atual / total de dias do mês
    const expectedPacingPct = Math.min(100, Math.round((currentDay / totalDaysInMonth) * 100));
    const expectedRevenueUpToToday = isGoalDefined ? Math.round((goal * currentDay) / totalDaysInMonth) : 0;

    // Diferença em relação ao esperado para hoje
    const pacingDifference = isGoalDefined ? realizedRevenue - expectedRevenueUpToToday : 0;
    const isPacingAhead = pacingDifference >= 0;

    // Faltante para a meta
    const remainingToGoal = isGoalDefined ? Math.max(0, goal - realizedRevenue) : 0;
    const isGoalReached = isGoalDefined && realizedRevenue >= goal;

    // Projeção de faturamento no fechamento do mês baseado na média diária atual
    const dailyAverage = realizedRevenue / Math.max(1, currentDay);
    const projectedEndOfMonth = Math.round(dailyAverage * totalDaysInMonth);
    const projectedPct = isGoalDefined ? Math.round((projectedEndOfMonth / goal) * 100) : 0;

    // Faturamento diário necessário nos dias restantes para bater a meta
    const neededDaily = isGoalDefined && remainingDays > 0 ? Math.round(remainingToGoal / remainingDays) : 0;

    return {
      goal,
      realizedRevenue,
      progressPct,
      expectedPacingPct,
      expectedRevenueUpToToday,
      pacingDifference,
      isPacingAhead,
      remainingToGoal,
      isGoalReached,
      dailyAverage,
      projectedEndOfMonth,
      projectedPct,
      neededDaily,
    };
  }, [monthlyGoal, realizedRevenue, currentDay, totalDaysInMonth, remainingDays]);

  // Salvar Meta
  const handleSaveGoal = (newGoalValue: number) => {
    if (isNaN(newGoalValue) || newGoalValue <= 0) {
      setInputError('Por favor, informe um valor de meta maior que zero.');
      return;
    }

    setMonthlyGoal(newGoalValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(newGoalValue));
    }

    if (currentBusiness) {
      updateBusiness({
        ...currentBusiness,
        monthlyRevenueGoal: newGoalValue,
      });
    }

    setIsEditModalOpen(false);
    setInputError(null);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  const handlePresetSelect = (val: number) => {
    setGoalInputValue(String(val));
    handleSaveGoal(val);
  };

  return (
    <>
      <div className={`bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5 relative overflow-hidden ${className}`}>
        {/* Notificação Temporária de Meta Atualizada */}
        {saveSuccessNotice && (
          <div className="absolute top-3 right-3 z-20 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-md flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Meta de faturamento atualizada com sucesso!</span>
          </div>
        )}

        {/* Cabeçalho do Card de Metas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Meta Mensal · {currentMonthName} de {currentYear}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                Dia {currentDay} de {totalDaysInMonth} ({remainingDays} {remainingDays === 1 ? 'dia restante' : 'dias restantes'})
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Desempenho de Faturamento vs Meta</span>
              {metrics.isGoalReached && (
                <span className="text-xs bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" /> Meta Batida!
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento em tempo real do faturamento realizado em relação ao objetivo estipulado para o mês.
            </p>
          </div>

          {/* Botão de Ajustar / Definir Meta */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setGoalInputValue(String(monthlyGoal));
                setInputError(null);
                setIsEditModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Definir ou alterar a meta de faturamento deste mês"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Definir Meta</span>
            </button>
          </div>
        </div>

        {/* Destaque Principal dos Valores: Realizado vs Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Card 1: Faturamento Realizado */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Faturamento Realizado
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(metrics.realizedRevenue)}
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold block">
              {metrics.progressPct}% da meta concluída
            </span>
          </div>

          {/* Card 2: Meta Estabelecida */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Meta do Mês (Esperado)
              </span>
              <button
                onClick={() => {
                  setGoalInputValue(String(monthlyGoal));
                  setIsEditModalOpen(true);
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                Ajustar
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono tracking-tight">
                {metrics.goal > 0 ? formatCurrency(metrics.goal) : 'R$ 0,00'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              {metrics.goal > 0 ? (
                <>Esperado para hoje (dia {currentDay}): <strong>{formatCurrency(metrics.expectedRevenueUpToToday)}</strong></>
              ) : (
                'Meta ainda não definida para este mês'
              )}
            </span>
          </div>

          {/* Card 3: Ritmo e Pacing */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Ritmo de Vendas (Pacing)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight flex items-center gap-1 ${
                  metrics.isPacingAhead ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {metrics.isPacingAhead ? (
                  <ArrowUpRight className="w-6 h-6 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-6 h-6 shrink-0" />
                )}
                {formatCurrency(Math.abs(metrics.pacingDifference))}
              </span>
            </div>
            <span
              className={`text-[11px] font-semibold block ${
                metrics.isPacingAhead ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {metrics.isPacingAhead
                ? 'Acima do ritmo previsto para hoje!'
                : 'Abaixo do ritmo ideal para a data atual'}
            </span>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BARRA DE PROGRESSO COMPARATIVA: REALIZADO VS ESPERADO                 */}
        {/* ===================================================================== */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-slate-800 font-bold">Progresso da Meta:</span>
              <span
                className={`font-mono font-extrabold px-2 py-0.5 rounded-md text-xs ${
                  metrics.isGoalReached
                    ? 'bg-emerald-100 text-emerald-800'
                    : metrics.progressPct >= metrics.expectedPacingPct
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {metrics.progressPct}% Atingido
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Realizado: <strong>{formatCurrency(metrics.realizedRevenue)}</strong>
              </span>
              <span className="hidden sm:inline-block">·</span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-400" />
                Meta Total: <strong>{formatCurrency(metrics.goal)}</strong>
              </span>
            </div>
          </div>

          {/* Container da Barra com Marcador de Pacing */}
          <div className="relative w-full bg-slate-100 h-5 rounded-xl overflow-visible p-0.5 border border-slate-200/90 shadow-inner">
            {/* Barra de Progresso Realizado */}
            <div
              className={`h-full rounded-lg transition-all duration-700 shadow-xs relative overflow-hidden ${
                metrics.isGoalReached
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400'
                  : metrics.isPacingAhead
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, metrics.progressPct))}%` }}
            >
              {/* Efeito de brilho animado */}
              <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
            </div>

            {/* Marcador Vertical do Ritmo Esperado para a Data Atual (Pacing) */}
            {metrics.expectedPacingPct > 0 && metrics.expectedPacingPct < 100 && (
              <div
                className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-slate-900 z-10 pointer-events-none transition-all duration-500"
                style={{ left: `${metrics.expectedPacingPct}%` }}
                title={`Ritmo esperado para hoje: ${metrics.expectedPacingPct}% (${formatCurrency(metrics.expectedRevenueUpToToday)})`}
              >
                {/* Marcador triangular no topo */}
                <div className="absolute -top-1.5 -left-1 w-2.5 h-2 bg-slate-900 clip-triangle" />
              </div>
            )}
          </div>

          {/* Legenda Explicativa da Barra de Pacing */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-slate-900 shrink-0" />
              Linha preta vertical marca o <strong>ritmo esperado para hoje ({metrics.expectedPacingPct}%)</strong>
            </span>
            <span className="font-mono text-slate-500">
              {metrics.isGoalReached ? (
                <strong className="text-emerald-700">Meta ultrapassada em {metrics.progressPct - 100}%! Parabéns!</strong>
              ) : (
                <span>Faltam <strong>{formatCurrency(metrics.remainingToGoal)}</strong> para o objetivo</span>
              )}
            </span>
          </div>
        </div>

        {/* Rodapé de Projeção & Metas Diárias */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Projeção ao fim do mês */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Projeção p/ fim do mês</span>
              <span className="font-mono font-bold text-slate-800 text-xs truncate block">
                {formatCurrency(metrics.projectedEndOfMonth)} ({metrics.projectedPct}% da meta)
              </span>
            </div>
          </div>

          {/* Média diária necessária */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Diária restante necessária</span>
              <span className="font-mono font-bold text-slate-800 text-xs truncate block">
                {metrics.isGoalReached ? 'Meta alcançada!' : `${formatCurrency(metrics.neededDaily)} / dia`}
              </span>
            </div>
          </div>

          {/* Média diária atual */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Média diária atual</span>
              <span className="font-mono font-bold text-slate-800 text-xs truncate block">
                {formatCurrency(metrics.dailyAverage)} / dia
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL PARA DEFINIR OU AJUSTAR META MENSAL                              */}
      {/* ===================================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Definir Meta de Faturamento
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentBusiness?.tradeName || 'Studio Digital'} · {currentMonthName} de {currentYear}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Valor da Meta Mensal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="500"
                    min="1000"
                    value={goalInputValue}
                    onChange={(e) => {
                      setGoalInputValue(e.target.value);
                      setInputError(null);
                    }}
                    placeholder="Ex: 35000"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-extrabold text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                    autoFocus
                  />
                </div>
                {inputError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    {inputError}
                  </p>
                )}
              </div>

              {/* Botões de Metas Rápidas Sugeridas */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Sugestões Rápidas:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[15000, 25000, 35000, 50000, 75000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handlePresetSelect(val)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                        monthlyGoal === val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {formatCurrency(val)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
                💡 <strong>Dica de Gestão:</strong> Uma meta realista geralmente considera o histórico do mês anterior acrescido de 10% a 20%, levando em conta a quantidade de profissionais na equipe.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveGoal(Number(goalInputValue))}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Salvar Meta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
