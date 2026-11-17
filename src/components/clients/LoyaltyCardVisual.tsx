import React, { useState } from 'react';
import {
  Award,
  Check,
  Gift,
  Plus,
  Minus,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Client, LoyaltyConfig } from '../../types';
import { getClientLoyaltyStatus, DEFAULT_LOYALTY_CONFIG } from '../../utils/loyalty';

interface LoyaltyCardVisualProps {
  client: Client;
  config?: LoyaltyConfig;
  businessName?: string;
  variant?: 'compact' | 'full';
  editable?: boolean;
  onQuickAddPoint?: () => void;
  onAdjustPoints?: (delta: number, reason?: string) => void;
  onRedeemReward?: () => { success: boolean; error?: string } | void;
  onOpenDetails?: () => void;
}

export const LoyaltyCardVisual: React.FC<LoyaltyCardVisualProps> = ({
  client,
  config = DEFAULT_LOYALTY_CONFIG,
  businessName = 'Studio Digital',
  variant = 'compact',
  editable = false,
  onQuickAddPoint,
  onAdjustPoints,
  onRedeemReward,
  onOpenDetails,
}) => {
  const [customReason, setCustomReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const status = getClientLoyaltyStatus(client, config);
  const history = client.loyaltyHistory || [];

  const handleRedeemClick = () => {
    if (!onRedeemReward || !status.isRewardReady) return;
    const res = onRedeemReward();
    if (res && !res.success) {
      setActionFeedback({ type: 'error', message: res.error || 'Não foi possível resgatar o prêmio.' });
    } else {
      setActionFeedback({
        type: 'success',
        message: `Prêmio "${config.rewardTitle}" resgatado com sucesso (-${status.threshold} pts).`,
      });
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleManualAdjust = (delta: number) => {
    if (!onAdjustPoints) return;
    const reasonText =
      customReason.trim() ||
      (delta > 0 ? 'Carimbo adicionado manualmente' : 'Ajuste manual de pontos');
    onAdjustPoints(delta, reasonText);
    setCustomReason('');
    setActionFeedback({
      type: 'success',
      message: `${delta > 0 ? `+${delta}` : delta} ponto(s) registrado(s).`,
    });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  if (!config.enabled && variant === 'compact') {
    return null;
  }

  // ============================================================================
  // COMPACT VARIANT: Visual Counter & Stamp Strip on Client Management Cards
  // ============================================================================
  if (variant === 'compact') {
    const showVisualStamps = status.threshold <= 12;

    return (
      <div
        onClick={onOpenDetails}
        role={onOpenDetails ? 'button' : undefined}
        tabIndex={onOpenDetails ? 0 : undefined}
        onKeyDown={(e) => {
          if (onOpenDetails && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpenDetails();
          }
        }}
        className={`rounded-xl border p-3 transition-colors ${
          status.isRewardReady
            ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
            : 'bg-slate-50/90 border-slate-200 hover:border-slate-300'
        } ${onOpenDetails ? 'cursor-pointer' : ''}`}
      >
        {/* Top Row: Title + Tabular Counter + Quick +1 Stamp */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Award
              className={`w-3.5 h-3.5 shrink-0 ${
                status.isRewardReady ? 'text-emerald-600' : 'text-amber-600'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-800 truncate">
              Cartão Fidelidade
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-xs font-extrabold font-mono tabular-nums ${
                status.isRewardReady ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              {status.points}/{status.threshold} pts
            </span>

            {editable && onQuickAddPoint && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddPoint();
                }}
                title="Adicionar +1 ponto ao Cartão Fidelidade"
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-amber-400 text-[10px] font-bold font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
                <span>1 pt</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Stamp Counter */}
        {showVisualStamps ? (
          <div
            className="grid gap-1.5 mb-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(status.threshold, 10)}, minmax(0, 1fr))`,
            }}
            aria-label={`${status.points} de ${status.threshold} carimbos acumulados`}
          >
            {Array.from({ length: status.threshold }).map((_, idx) => {
              const isFilled = idx < status.filledStamps;
              const isLast = idx === status.threshold - 1;
              return (
                <div
                  key={idx}
                  className={`h-6 rounded-md flex items-center justify-center text-[10px] font-mono tabular-nums font-bold transition-transform duration-150 ${
                    isFilled
                      ? status.isRewardReady
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-900 text-amber-400 shadow-2xs'
                      : isLast
                      ? 'bg-white border border-dashed border-amber-400 text-amber-600'
                      : 'bg-white border border-dashed border-slate-300 text-slate-400'
                  }`}
                >
                  {isFilled ? (
                    isLast && status.isRewardReady ? (
                      <Gift className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )
                  ) : isLast ? (
                    <Gift className="w-3 h-3" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                status.isRewardReady ? 'bg-emerald-600' : 'bg-slate-900'
              }`}
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
        )}

        {/* Bottom Status Text (Unboxed metadata) */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          {status.isRewardReady ? (
            <span className="font-bold text-emerald-700 flex items-center gap-1 truncate">
              <Gift className="w-3 h-3 shrink-0" />
              <span className="truncate">Prêmio liberado: {config.rewardTitle}</span>
            </span>
          ) : (
            <span className="text-slate-500 truncate">
              Faltam <strong className="text-slate-800 font-mono tabular-nums">{status.remainingToReward}</strong> pts · {config.rewardTitle}
            </span>
          )}

          {status.rewardsRedeemed > 0 && (
            <span className="text-[10px] font-mono tabular-nums text-slate-500 shrink-0">
              {status.rewardsRedeemed} {status.rewardsRedeemed === 1 ? 'resgate' : 'resgates'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // FULL VARIANT: Complete Virtual Loyalty Card + Controls + Ledger
  // ============================================================================
  const stampGridCount = Math.min(status.threshold, 20);

  return (
    <div className="space-y-4">
      {!config.enabled && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            O Programa de Fidelidade está pausado nas configurações do estabelecimento. Os pontos existentes permanecem preservados.
          </span>
        </div>
      )}

      {/* Virtual Loyalty Card */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-md space-y-5">
        {/* Card Top Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Award className="w-4 h-4 shrink-0" />
              <span>Cartão Fidelidade Virtual · {businessName}</span>
            </div>
            <h4 className="text-lg font-extrabold text-white tracking-tight">
              {client.name}
            </h4>
            <p className="text-xs text-slate-400">
              +{config.pointsPerService} {config.pointsPerService === 1 ? 'ponto' : 'pontos'} por serviço realizado · Meta: {status.threshold} pts
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">Saldo Atual</span>
            <div className="flex items-baseline sm:justify-end gap-1.5">
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

        {/* Stamp Matrix */}
        {status.threshold <= 20 ? (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {Array.from({ length: stampGridCount }).map((_, idx) => {
              const isFilled = idx < status.filledStamps;
              const isFinalRewardSlot = idx === stampGridCount - 1;
              return (
                <div
                  key={idx}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center font-mono tabular-nums transition-transform duration-150 ${
                    isFilled
                      ? status.isRewardReady
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-xs'
                        : 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                      : isFinalRewardSlot
                      ? 'bg-slate-800/80 border border-dashed border-amber-400/70 text-amber-300'
                      : 'bg-slate-800/60 border border-dashed border-slate-700 text-slate-500'
                  }`}
                >
                  {isFilled ? (
                    isFinalRewardSlot && status.isRewardReady ? (
                      <Gift className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )
                  ) : isFinalRewardSlot ? (
                    <Gift className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  status.isRewardReady ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
                style={{ width: `${status.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
              <span>Progresso: {status.progressPercent}%</span>
              <span>{status.points} / {status.threshold} carimbos</span>
            </div>
          </div>
        )}

        {/* Reward Goal & Lifetime Stats */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
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
              <span className="text-slate-300">
                Prêmio: <strong className="text-white">{config.rewardTitle}</strong> · Faltam{' '}
                <strong className="text-amber-400 font-mono tabular-nums">
                  {status.remainingToReward}
                </strong>{' '}
                {status.remainingToReward === 1 ? 'serviço' : 'serviços'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
            <span>Acumulado: {status.totalEarned} pts</span>
            <span aria-hidden="true">·</span>
            <span>Resgates: {status.rewardsRedeemed}</span>
          </div>
        </div>
      </div>

      {/* Feedback Message */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Interactive Staff Controls */}
      {editable && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-bold text-slate-900">
                Gerenciar Carimbos e Resgate
              </h5>
              <p className="text-[11px] text-slate-500">
                Os pontos acumulam automaticamente ao concluir atendimentos ou fechar comandas. Use os controles abaixo para ajustes ou resgate.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Motivo opcional (ex: Bônus indicação, Corte avulso)..."
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-slate-500"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleManualAdjust(1)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+1 Ponto</span>
              </button>

              <button
                type="button"
                disabled={status.points <= 0}
                onClick={() => handleManualAdjust(-1)}
                className="px-3 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>-1 pt</span>
              </button>

              <button
                type="button"
                disabled={!status.isRewardReady}
                onClick={handleRedeemClick}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  status.isRewardReady
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Resgatar Prêmio (-{status.threshold} pts)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Transaction History */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Histórico de Pontos e Resgates ({history.length})</span>
          </h5>
        </div>

        {history.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
            {history.slice(0, 15).map((tx) => {
              const isEarn = tx.points > 0;
              const isRedeem = tx.type === 'redeem';
              return (
                <div
                  key={tx.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
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
                        ? 'text-amber-700'
                        : isEarn
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {isEarn ? `+${tx.points}` : tx.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
            <Award className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">
              Nenhuma movimentação no cartão ainda
            </p>
            <p className="text-[11px] text-slate-500">
              Quando o cliente concluir um serviço ou receber um carimbo, o registro aparecerá aqui.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
