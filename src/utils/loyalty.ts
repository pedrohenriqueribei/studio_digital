import { Business, Client, LoyaltyConfig, LoyaltyTransaction } from '../types';

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerService: 1,
  rewardThreshold: 10,
  rewardTitle: '1 Serviço Grátis à escolha',
  milestoneNotificationsEnabled: true,
  notificationChannels: 'both',
};

export function getBusinessLoyaltyConfig(business?: Business | null): LoyaltyConfig {
  const cfg = business?.loyaltyConfig;
  if (!cfg) {
    return { ...DEFAULT_LOYALTY_CONFIG };
  }
  const channel =
    cfg.notificationChannels === 'push' || cfg.notificationChannels === 'email' || cfg.notificationChannels === 'both'
      ? cfg.notificationChannels
      : 'both';
  return {
    enabled: cfg.enabled !== false,
    pointsPerService:
      typeof cfg.pointsPerService === 'number' && cfg.pointsPerService >= 1
        ? Math.min(100, Math.round(cfg.pointsPerService))
        : DEFAULT_LOYALTY_CONFIG.pointsPerService,
    rewardThreshold:
      typeof cfg.rewardThreshold === 'number' && cfg.rewardThreshold >= 2
        ? Math.min(100, Math.round(cfg.rewardThreshold))
        : DEFAULT_LOYALTY_CONFIG.rewardThreshold,
    rewardTitle:
      typeof cfg.rewardTitle === 'string' && cfg.rewardTitle.trim().length > 0
        ? cfg.rewardTitle.trim()
        : DEFAULT_LOYALTY_CONFIG.rewardTitle,
    milestoneNotificationsEnabled: cfg.milestoneNotificationsEnabled !== false,
    notificationChannels: channel,
  };
}

export interface ClientLoyaltyStatus {
  points: number;
  threshold: number;
  totalEarned: number;
  rewardsRedeemed: number;
  progressPercent: number;
  remainingToReward: number;
  isRewardReady: boolean;
  availableRewardsCount: number;
  filledStamps: number;
}

export function getClientLoyaltyStatus(
  client: Client | null | undefined,
  config: LoyaltyConfig
): ClientLoyaltyStatus {
  const threshold = Math.max(2, config.rewardThreshold || DEFAULT_LOYALTY_CONFIG.rewardThreshold);
  const points = Math.max(0, Math.floor(client?.loyaltyPoints ?? 0));
  const totalEarned = Math.max(points, Math.floor(client?.loyaltyTotalEarned ?? points));
  const rewardsRedeemed = Math.max(0, Math.floor(client?.loyaltyRewardsRedeemed ?? 0));
  const isRewardReady = points >= threshold;
  const availableRewardsCount = Math.floor(points / threshold);
  const remainingToReward = isRewardReady ? 0 : threshold - points;
  const filledStamps = isRewardReady ? threshold : points;
  const progressPercent = Math.min(100, Math.round((points / threshold) * 100));

  return {
    points,
    threshold,
    totalEarned,
    rewardsRedeemed,
    progressPercent,
    remainingToReward,
    isRewardReady,
    availableRewardsCount,
    filledStamps,
  };
}

export function hasLoyaltyCreditForReference(
  client: Client,
  refs: {
    appointmentId?: string;
    comandaId?: string;
    comandaItemId?: string;
  }
): boolean {
  const history = client.loyaltyHistory || [];
  if (history.length === 0) return false;

  return history.some((tx) => {
    if (tx.type !== 'earn') return false;
    if (refs.comandaItemId && tx.comandaItemId === refs.comandaItemId) return true;
    if (refs.appointmentId && tx.appointmentId === refs.appointmentId) return true;
    if (refs.comandaId && !refs.comandaItemId && !refs.appointmentId && tx.comandaId === refs.comandaId) {
      return true;
    }
    return false;
  });
}

export function applyLoyaltyMutation(
  client: Client,
  params: {
    type: 'earn' | 'redeem' | 'adjust';
    pointsDelta: number;
    description: string;
    serviceName?: string;
    appointmentId?: string;
    comandaId?: string;
    comandaItemId?: string;
    authorName?: string;
  }
): { updatedClient: Client; transaction: LoyaltyTransaction } {
  const currentPoints = Math.max(0, Math.floor(client.loyaltyPoints ?? 0));
  const currentTotalEarned = Math.max(currentPoints, Math.floor(client.loyaltyTotalEarned ?? currentPoints));
  const currentRedeemed = Math.max(0, Math.floor(client.loyaltyRewardsRedeemed ?? 0));

  const nextPoints = Math.max(0, currentPoints + params.pointsDelta);
  const nextTotalEarned =
    params.type === 'earn' || (params.type === 'adjust' && params.pointsDelta > 0)
      ? currentTotalEarned + Math.max(0, params.pointsDelta)
      : currentTotalEarned;
  const nextRedeemed = params.type === 'redeem' ? currentRedeemed + 1 : currentRedeemed;

  const transaction: LoyaltyTransaction = {
    id: `loy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: params.type,
    points: params.pointsDelta,
    description: params.description,
    ...(params.serviceName ? { serviceName: params.serviceName } : {}),
    ...(params.appointmentId ? { appointmentId: params.appointmentId } : {}),
    ...(params.comandaId ? { comandaId: params.comandaId } : {}),
    ...(params.comandaItemId ? { comandaItemId: params.comandaItemId } : {}),
    ...(params.authorName ? { authorName: params.authorName } : {}),
    createdAt: new Date().toISOString(),
  };

  const nextHistory = [transaction, ...(client.loyaltyHistory || [])].slice(0, 50);

  const updatedClient: Client = {
    ...client,
    loyaltyPoints: nextPoints,
    loyaltyTotalEarned: nextTotalEarned,
    loyaltyRewardsRedeemed: nextRedeemed,
    loyaltyHistory: nextHistory,
    updatedAt: new Date().toISOString(),
  };

  return { updatedClient, transaction };
}

export function findMatchingClientForRecord(
  clients: Client[],
  businessId: string,
  criteria: {
    clientId?: string;
    clientPhone?: string;
    clientName?: string;
  }
): Client | undefined {
  const scoped = businessId ? clients.filter((c) => c.businessId === businessId) : clients;

  if (criteria.clientId) {
    const byId = scoped.find((c) => c.id === criteria.clientId) || clients.find((c) => c.id === criteria.clientId);
    if (byId) return byId;
  }

  const cleanPhone = (criteria.clientPhone || '').replace(/\D/g, '');
  if (cleanPhone.length >= 8) {
    const byPhone = scoped.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return cPhone === cleanPhone || (cPhone.length >= 8 && cPhone.slice(-8) === cleanPhone.slice(-8));
    });
    if (byPhone) return byPhone;
  }

  const cleanName = (criteria.clientName || '').trim().toLowerCase();
  if (cleanName) {
    const byName = scoped.find((c) => (c.name || '').trim().toLowerCase() === cleanName);
    if (byName) return byName;
  }

  return undefined;
}

export interface LoyaltyMilestone {
  id: string;
  percent: number;
  targetPoints: number;
  label: string;
  reached: boolean;
  isFinal: boolean;
}

export interface LoyaltyMilestonesSummary {
  milestones: LoyaltyMilestone[];
  currentMilestone: LoyaltyMilestone | null;
  nextMilestone: LoyaltyMilestone | null;
  pointsToNextMilestone: number;
  nextMilestoneSegmentPercent: number;
}

export function getLoyaltyMilestones(points: number, threshold: number): LoyaltyMilestonesSummary {
  const safeThreshold = Math.max(2, Math.round(threshold || DEFAULT_LOYALTY_CONFIG.rewardThreshold));
  const safePoints = Math.max(0, Math.floor(points));

  const rawCandidates = [
    { id: 'm25', pct: 25, target: Math.max(1, Math.round(safeThreshold * 0.25)), label: 'Primeiro Passo', isFinal: false },
    { id: 'm50', pct: 50, target: Math.max(1, Math.round(safeThreshold * 0.5)), label: 'Metade da Meta', isFinal: false },
    { id: 'm75', pct: 75, target: Math.max(1, Math.round(safeThreshold * 0.75)), label: 'Reta Final', isFinal: false },
    { id: 'm100', pct: 100, target: safeThreshold, label: 'Prêmio Liberado', isFinal: true },
  ];

  // Deduplicate by targetPoints, always preferring higher percentage / final milestone
  const byTarget = new Map<number, (typeof rawCandidates)[number]>();
  rawCandidates.forEach((cand) => {
    const clampedTarget = Math.min(safeThreshold, cand.target);
    byTarget.set(clampedTarget, { ...cand, target: clampedTarget });
  });

  const milestones: LoyaltyMilestone[] = Array.from(byTarget.values())
    .sort((a, b) => a.target - b.target)
    .map((m) => ({
      id: m.id,
      percent: Math.min(100, Math.round((m.target / safeThreshold) * 100)),
      targetPoints: m.target,
      label: m.label,
      reached: safePoints >= m.target,
      isFinal: m.isFinal,
    }));

  const reachedList = milestones.filter((m) => m.reached);
  const currentMilestone = reachedList.length > 0 ? reachedList[reachedList.length - 1] : null;
  const nextMilestone = milestones.find((m) => !m.reached) || null;

  const prevTarget = currentMilestone ? currentMilestone.targetPoints : 0;
  const pointsToNextMilestone = nextMilestone ? Math.max(0, nextMilestone.targetPoints - safePoints) : 0;
  const segmentSpan = nextMilestone ? Math.max(1, nextMilestone.targetPoints - prevTarget) : 1;
  const nextMilestoneSegmentPercent = nextMilestone
    ? Math.min(100, Math.max(0, Math.round(((safePoints - prevTarget) / segmentSpan) * 100)))
    : 100;

  return {
    milestones,
    currentMilestone,
    nextMilestone,
    pointsToNextMilestone,
    nextMilestoneSegmentPercent,
  };
}

export interface LoyaltyTierInfo {
  name: string;
  nextTierName: string | null;
  minPoints: number;
  nextTierPoints: number | null;
  tierProgressPercent: number;
  remainingToNextTier: number;
}

export function getClientLoyaltyTier(totalEarned: number): LoyaltyTierInfo {
  const safeTotal = Math.max(0, Math.floor(totalEarned));
  const tiers = [
    { name: 'Bronze', min: 0 },
    { name: 'Prata', min: 10 },
    { name: 'Ouro', min: 25 },
    { name: 'Diamante', min: 50 },
  ];

  let currentIdx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (safeTotal >= tiers[i].min) {
      currentIdx = i;
    }
  }

  const current = tiers[currentIdx];
  const next = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : null;

  if (!next) {
    return {
      name: current.name,
      nextTierName: null,
      minPoints: current.min,
      nextTierPoints: null,
      tierProgressPercent: 100,
      remainingToNextTier: 0,
    };
  }

  const span = Math.max(1, next.min - current.min);
  const progress = Math.min(100, Math.max(0, Math.round(((safeTotal - current.min) / span) * 100)));

  return {
    name: current.name,
    nextTierName: next.name,
    minPoints: current.min,
    nextTierPoints: next.min,
    tierProgressPercent: progress,
    remainingToNextTier: Math.max(0, next.min - safeTotal),
  };
}

