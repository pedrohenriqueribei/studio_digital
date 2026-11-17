import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Check,
  Gift,
  History,
  PartyPopper,
  Sparkles,
  Trophy,
  X,
  BellRing,
  Calendar,
} from 'lucide-react';
import { Client, LoyaltyConfig } from '../../types';
import {
  DEFAULT_LOYALTY_CONFIG,
  getClientLoyaltyStatus,
  getClientLoyaltyTier,
  getLoyaltyMilestones,
  LoyaltyMilestone,
} from '../../utils/loyalty';
import {
  getBrowserPushPermission,
  requestBrowserPushPermission,
} from '../../utils/loyaltyNotifications';
import { LoyaltyConfettiBurst } from '../clients/LoyaltyConfettiBurst';

interface ClientLoyaltyPanelProps {
  client: Client;
  config?: LoyaltyConfig;
  businessName?: string;
  onOpenPointsHistory?: () => void;
  onQuickBookService?: () => void;
}

interface StoredCelebrationState {
  threshold: number;
  lastCelebratedTarget: number;
  lastRewardsRedeemed: number;
  lastTierName: string;
}

export const ClientLoyaltyPanel: React.FC<ClientLoyaltyPanelProps> = ({
  client,
  config = DEFAULT_LOYALTY_CONFIG,
  businessName = 'Studio Digital',
  onOpenPointsHistory,
  onQuickBookService,
}) => {
  const [pushPerm, setPushPerm] = useState(() => getBrowserPushPermission());
  const status = useMemo(() => getClientLoyaltyStatus(client, config), [client, config]);
  const milestonesSummary = useMemo(
    () => getLoyaltyMilestones(status.points, status.threshold),
    [status.points, status.threshold]
  );
  const tierInfo = useMemo(() => getClientLoyaltyTier(status.totalEarned), [status.totalEarned]);
  const history = client.loyaltyHistory || [];

  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiIntensity, setConfettiIntensity] = useState<'milestone' | 'reward'>('milestone');
  const [celebrationBanner, setCelebrationBanner] = useState<{
    title: string;
    subtitle: string;
    isReward: boolean;
  } | null>(null);

  const storageKey = `studio_loyalty_celebration_${client.id}`;
  const hasCheckedInitialRef = useRef(false);

  const triggerConfetti = useCallback(
    (intensity: 'milestone' | 'reward', title: string, subtitle: string) => {
      setConfettiIntensity(intensity);
      setConfettiKey((prev) => prev + 1);
      setConfettiActive(true);
      setCelebrationBanner({
        title,
        subtitle,
        isReward: intensity === 'reward',
      });
    },
    []
  );

  // Detect newly completed milestones (on mount or when Firestore updates points in real time)
  useEffect(() => {
    if (!config.enabled) return;

    let stored: StoredCelebrationState | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        stored = JSON.parse(raw) as StoredCelebrationState;
      }
    } catch {
      stored = null;
    }

    const currentTarget = milestonesSummary.currentMilestone?.targetPoints || 0;
    const prevTarget =
      stored && stored.threshold === status.threshold ? stored.lastCelebratedTarget : 0;
    const prevRedeemed = stored ? stored.lastRewardsRedeemed : 0;
    const prevTier = stored ? stored.lastTierName : 'Bronze';

    // Handle cycle reset after reward redemption
    const redeemedNewReward = status.rewardsRedeemed > prevRedeemed;
    const crossedNewMilestone = currentTarget > prevTarget;
    const upgradedTier = tierInfo.name !== prevTier && tierInfo.minPoints > 0 && status.totalEarned >= tierInfo.minPoints;

    if (crossedNewMilestone && milestonesSummary.currentMilestone) {
      const m = milestonesSummary.currentMilestone;
      const isReward = m.isFinal || status.isRewardReady;
      const title = isReward
        ? 'Cartão Completo! Prêmio Liberado'
        : `Marco Alcançado: ${m.label} (${m.percent}%)`;
      const subtitle = isReward
        ? `Você atingiu ${status.threshold} pontos e desbloqueou: ${config.rewardTitle}. Apresente este cartão na recepção do ${businessName}.`
        : `Você já acumulou ${status.points} de ${status.threshold} pontos. Faltam apenas ${status.remainingToReward} ${
            status.remainingToReward === 1 ? 'serviço' : 'serviços'
          } para ganhar ${config.rewardTitle}!`;

      triggerConfetti(isReward ? 'reward' : 'milestone', title, subtitle);
    } else if (redeemedNewReward && hasCheckedInitialRef.current) {
      triggerConfetti(
        'reward',
        'Prêmio Resgatado com Sucesso!',
        `Parabéns pelo resgate de "${config.rewardTitle}". Um novo ciclo de pontos começou no seu Cartão Fidelidade.`
      );
    } else if (upgradedTier) {
      triggerConfetti(
        'milestone',
        `Novo Nível Alcançado: Cliente ${tierInfo.name}!`,
        `Você ultrapassou ${tierInfo.minPoints} pontos acumulados no ${businessName}. Obrigado pela sua preferência contínua!`
      );
    }

    hasCheckedInitialRef.current = true;

    try {
      const nextStored: StoredCelebrationState = {
        threshold: status.threshold,
        lastCelebratedTarget: currentTarget,
        lastRewardsRedeemed: status.rewardsRedeemed,
        lastTierName: tierInfo.name,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(nextStored));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [
    config.enabled,
    config.rewardTitle,
    businessName,
    storageKey,
    status.threshold,
    status.points,
    status.isRewardReady,
    status.remainingToReward,
    status.rewardsRedeemed,
    status.totalEarned,
    milestonesSummary.currentMilestone,
    tierInfo.name,
    tierInfo.minPoints,
    triggerConfetti,
  ]);

  const handleReplayMilestone = (milestone?: LoyaltyMilestone | null) => {
    const targetMilestone = milestone || milestonesSummary.currentMilestone;
    if (!targetMilestone) return;
    const isReward = targetMilestone.isFinal || status.isRewardReady;
    triggerConfetti(
      isReward ? 'reward' : 'milestone',
      isReward
        ? 'Cartão Completo! Prêmio Liberado'
        : `Marco Alcançado: ${targetMilestone.label} (${targetMilestone.percent}%)`,
      isReward
        ? `Você completou ${status.threshold} pontos e garantiu: ${config.rewardTitle}.`
        : `Você alcançou ${targetMilestone.targetPoints} de ${status.threshold} pontos no Cartão Fidelidade.`
    );
  };

  if (!config.enabled) {
    return null;
  }

  const stampGridCount = Math.min(status.threshold, 20);

  return (
    <section aria-label="Cartão Fidelidade e Marcos de Progresso" className="space-y-4">
      {/* Confetti Canvas Overlay */}
      <LoyaltyConfettiBurst
        active={confettiActive}
        burstKey={confettiKey}
        intensity={confettiIntensity}
        onComplete={() => setConfettiActive(false)}
      />

      {/* Celebratory Milestone Banner */}
      <AnimatePresence>
        {celebrationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
              celebrationBanner.isReward
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-50'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  celebrationBanner.isReward
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                <PartyPopper className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-extrabold text-white">
                  {celebrationBanner.title}
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
                  {celebrationBanner.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleReplayMilestone(milestonesSummary.currentMilestone)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  celebrationBanner.isReward
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Soltar Confete</span>
              </button>
              <button
                type="button"
                onClick={() => setCelebrationBanner(null)}
                aria-label="Fechar aviso de conquista"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Loyalty Card Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-semibold">
              <Award className="w-4 h-4 shrink-0" />
              <span>Cartão Fidelidade Virtual</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-300">{businessName}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-emerald-400">Nível {tierInfo.name}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {client.name}
            </h2>
            <p className="text-xs text-slate-400">
              +{config.pointsPerService} {config.pointsPerService === 1 ? 'ponto' : 'pontos'} por serviço concluído · Prêmio: <strong className="text-slate-200">{config.rewardTitle}</strong>
            </p>
          </div>

          <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-2 shrink-0">
            <span className="text-[11px] text-slate-400">Saldo do Cartão</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-extrabold font-mono tabular-nums ${
                  status.isRewardReady ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {String(status.points).padStart(2, '0')}
              </span>
              <span className="text-sm font-mono tabular-nums text-slate-400">
                / {status.threshold} pts
              </span>
            </div>
          </div>
        </div>

        {/* Visual Milestone Progress Bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200 font-mono tabular-nums">
              Progresso da Meta: {status.progressPercent}% ({status.points}/{status.threshold} pts)
            </span>
            {milestonesSummary.nextMilestone ? (
              <span className="text-slate-400">
                Próximo marco: <strong className="text-amber-400">{milestonesSummary.nextMilestone.label}</strong> ({milestonesSummary.nextMilestone.targetPoints} pts)
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">
                Todos os marcos concluídos ({status.availableRewardsCount}x prêmio disponível)
              </span>
            )}
          </div>

          {/* Progress Bar Track + Interactive Milestone Nodes */}
          <div className="relative pt-2 pb-1">
            <div className="h-3.5 w-full rounded-full bg-slate-800 border border-slate-700/80 overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(0, Math.min(1, status.progressPercent / 100)) }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left' }}
                className={`h-full w-full rounded-full ${
                  status.isRewardReady
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400'
                }`}
              />
            </div>

            {/* Milestone Markers Along Track */}
            <div className="relative h-5 mt-1.5">
              {milestonesSummary.milestones.map((m) => {
                const leftPct = Math.min(100, Math.max(4, Math.round((m.targetPoints / status.threshold) * 100)));
                const alignClass =
                  leftPct >= 92 ? '-translate-x-full' : leftPct <= 10 ? 'translate-x-0' : '-translate-x-1/2';

                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.reached}
                    onClick={() => m.reached && handleReplayMilestone(m)}
                    style={{ left: `${leftPct}%` }}
                    title={
                      m.reached
                        ? `${m.label} concluído — clique para celebrar`
                        : `${m.label} aos ${m.targetPoints} pontos`
                    }
                    className={`absolute top-0 ${alignClass} flex items-center gap-1 text-[11px] font-mono tabular-nums transition-colors ${
                      m.reached
                        ? 'text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer'
                        : 'text-slate-500 cursor-default'
                    }`}
                  >
                    {m.isFinal ? (
                      <Gift className="w-3 h-3 shrink-0" />
                    ) : m.reached ? (
                      <Check className="w-3 h-3 stroke-[3] shrink-0" />
                    ) : null}
                    <span>{m.targetPoints}pt</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Milestone Cards Strip (Visual Checkpoints) */}
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(4, milestonesSummary.milestones.length)}, minmax(0, 1fr))`,
            }}
          >
            {milestonesSummary.milestones.map((m) => {
              const remaining = Math.max(0, m.targetPoints - status.points);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!m.reached}
                  onClick={() => m.reached && handleReplayMilestone(m)}
                  className={`min-h-[44px] text-left p-2.5 sm:p-3 rounded-xl border transition-colors ${
                    m.reached
                      ? m.isFinal
                        ? 'bg-emerald-950/60 border-emerald-500/50 hover:border-emerald-400 cursor-pointer'
                        : 'bg-slate-800/90 border-amber-500/40 hover:border-amber-400 cursor-pointer'
                      : 'bg-slate-950/50 border-slate-800/90 cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-[11px] font-bold font-mono tabular-nums ${
                        m.reached
                          ? m.isFinal
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {m.percent}% · {m.targetPoints} pts
                    </span>
                    {m.reached ? (
                      m.isFinal ? (
                        <Gift className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3] shrink-0" />
                      )
                    ) : null}
                  </div>
                  <span
                    className={`text-xs font-semibold block truncate ${
                      m.reached ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {m.reached
                      ? 'Concluído · Celebrar'
                      : `Faltam ${remaining} ${remaining === 1 ? 'pt' : 'pts'}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Stamp Matrix (up to 20 slots) */}
        {status.threshold <= 20 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Carimbos Acumulados</span>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {status.filledStamps}/{status.threshold} selos
              </span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: stampGridCount }).map((_, idx) => {
                const isFilled = idx < status.filledStamps;
                const isFinalSlot = idx === stampGridCount - 1;
                return (
                  <div
                    key={idx}
                    className={`h-11 rounded-xl flex items-center justify-center font-mono tabular-nums transition-transform duration-150 ${
                      isFilled
                        ? status.isRewardReady
                          ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-xs'
                          : 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                        : isFinalSlot
                        ? 'bg-slate-800/80 border border-dashed border-amber-400/70 text-amber-300'
                        : 'bg-slate-800/50 border border-dashed border-slate-700 text-slate-500'
                    }`}
                  >
                    {isFilled ? (
                      isFinalSlot && status.isRewardReady ? (
                        <Gift className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[3]" />
                      )
                    ) : isFinalSlot ? (
                      <Gift className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Secondary Progress Bars: Next Milestone Segment + VIP Tier Progression */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          {/* Sub-progress 1: Próximo Marco */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-200">
                {milestonesSummary.nextMilestone
                  ? `Rumo ao marco: ${milestonesSummary.nextMilestone.label}`
                  : 'Prêmio Pronto para Resgate'}
              </span>
              <span className="font-mono tabular-nums font-bold text-amber-400">
                {milestonesSummary.nextMilestoneSegmentPercent}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: milestonesSummary.nextMilestoneSegmentPercent / 100 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left' }}
                className={`h-full w-full rounded-full ${
                  status.isRewardReady ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {milestonesSummary.nextMilestone
                ? `Falta(m) ${milestonesSummary.pointsToNextMilestone} ${
                    milestonesSummary.pointsToNextMilestone === 1 ? 'ponto' : 'pontos'
                  } para completar este marco.`
                : `Apresente seu cartão na recepção para resgatar: ${config.rewardTitle}.`}
            </p>
          </div>

          {/* Sub-progress 2: Nível VIP Histórico */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Nível {tierInfo.name}
                  {tierInfo.nextTierName ? ` · Próximo: ${tierInfo.nextTierName}` : ' · Nível Máximo'}
                </span>
              </span>
              <span className="font-mono tabular-nums font-bold text-emerald-400">
                {tierInfo.tierProgressPercent}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: tierInfo.tierProgressPercent / 100 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left' }}
                className="h-full w-full rounded-full bg-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              Total acumulado: {status.totalEarned} pts · Resgates realizados: {status.rewardsRedeemed}
              {tierInfo.nextTierName ? ` · Faltam ${tierInfo.remainingToNextTier} pts` : ''}
            </p>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Gift
              className={`w-4 h-4 shrink-0 ${
                status.isRewardReady ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            {status.isRewardReady ? (
              <span className="text-emerald-300 font-bold">
                Prêmio liberado ({status.availableRewardsCount}x): {config.rewardTitle}
              </span>
            ) : (
              <span>
                Faltam{' '}
                <strong className="text-amber-400 font-mono tabular-nums">
                  {status.remainingToReward}
                </strong>{' '}
                {status.remainingToReward === 1 ? 'ponto' : 'pontos'} para ganhar{' '}
                <strong className="text-white">{config.rewardTitle}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {config.milestoneNotificationsEnabled !== false && pushPerm === 'default' && (
              <button
                type="button"
                onClick={async () => {
                  const res = await requestBrowserPushPermission();
                  setPushPerm(res);
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ativar Alertas Push</span>
              </button>
            )}

            {onQuickBookService && status.progressPercent >= 50 && !status.isRewardReady && (
              <button
                type="button"
                onClick={onQuickBookService}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Novo Serviço</span>
              </button>
            )}

            {milestonesSummary.currentMilestone && (
              <button
                type="button"
                onClick={() => handleReplayMilestone(milestonesSummary.currentMilestone)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                <span>Celebrar Conquista</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loyalty Ledger History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Extrato do Cartão Fidelidade ({history.length})</span>
          </h3>
          {onOpenPointsHistory && (
            <button
              type="button"
              onClick={onOpenPointsHistory}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver Histórico de Pontos →
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {history.slice(0, 10).map((tx) => {
              const isEarn = tx.points > 0;
              const isRedeem = tx.type === 'redeem';
              return (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">
                      {tx.description}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleString('pt-BR')}
                      {tx.authorName ? ` · ${tx.authorName}` : ''}
                    </p>
                  </div>

                  <span
                    className={`font-mono tabular-nums font-bold text-xs shrink-0 ${
                      isRedeem
                        ? 'text-amber-400'
                        : isEarn
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {isEarn ? `+${tx.points}` : tx.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Seus pontos acumulados e resgates aparecerão aqui conforme você realiza atendimentos.
          </div>
        )}
      </div>
    </section>
  );
};
