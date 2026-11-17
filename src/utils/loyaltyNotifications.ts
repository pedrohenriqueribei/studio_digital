import {
  Client,
  LoyaltyMilestoneNotification,
  LoyaltyNotificationChannel,
} from '../types';

export interface MilestoneDetectionResult {
  milestoneToTrigger: 50 | 90 | null;
  updatedTracker: {
    cycle: number;
    milestonesSent: number[];
    lastNotifiedAt?: string;
  };
}

/**
 * Detecta se o cliente atingiu os marcos de 50% ou 90% no ciclo atual do Cartão Fidelidade.
 * Garante deduplicação por ciclo (reseta automaticamente quando um prêmio é resgatado).
 */
export function detectLoyaltyMilestonesCrossed(
  prevPoints: number,
  nextPoints: number,
  threshold: number,
  cycle: number,
  existingTracker?: Client['loyaltyNotifiedMilestones']
): MilestoneDetectionResult {
  const safeThreshold = Math.max(2, Math.round(threshold || 10));
  const safeCycle = Math.max(0, Math.floor(cycle || 0));

  const currentSent =
    existingTracker && existingTracker.cycle === safeCycle
      ? Array.from(new Set(existingTracker.milestonesSent || []))
      : [];

  if (nextPoints <= prevPoints || nextPoints <= 0) {
    return {
      milestoneToTrigger: null,
      updatedTracker: {
        cycle: safeCycle,
        milestonesSent: currentSent,
        lastNotifiedAt: existingTracker?.lastNotifiedAt,
      },
    };
  }

  // Se já completou 100% do cartão, não envia alerta de "quase lá"; foca no prêmio liberado
  if (nextPoints >= safeThreshold) {
    return {
      milestoneToTrigger: null,
      updatedTracker: {
        cycle: safeCycle,
        milestonesSent: currentSent,
        lastNotifiedAt: existingTracker?.lastNotifiedAt,
      },
    };
  }

  const nextRatio = nextPoints / safeThreshold;
  const nowIso = new Date().toISOString();

  // Verifica primeiro 90% (ex: 9/10, 18/20)
  if (nextRatio >= 0.9 && !currentSent.includes(90)) {
    const nextSent = Array.from(new Set([...currentSent, 50, 90])).sort((a, b) => a - b);
    return {
      milestoneToTrigger: 90,
      updatedTracker: {
        cycle: safeCycle,
        milestonesSent: nextSent,
        lastNotifiedAt: nowIso,
      },
    };
  }

  // Verifica 50% (ex: 5/10, 3/5)
  if (nextRatio >= 0.5 && !currentSent.includes(50)) {
    const nextSent = Array.from(new Set([...currentSent, 50])).sort((a, b) => a - b);
    return {
      milestoneToTrigger: 50,
      updatedTracker: {
        cycle: safeCycle,
        milestonesSent: nextSent,
        lastNotifiedAt: nowIso,
      },
    };
  }

  return {
    milestoneToTrigger: null,
    updatedTracker: {
      cycle: safeCycle,
      milestonesSent: currentSent,
      lastNotifiedAt: existingTracker?.lastNotifiedAt,
    },
  };
}

export function buildLoyaltyMilestoneCopy(params: {
  clientName: string;
  businessName: string;
  milestonePercent: 50 | 90;
  points: number;
  threshold: number;
  rewardTitle: string;
}): {
  title: string;
  message: string;
  emailSubject: string;
  emailBody: string;
} {
  const firstName = (params.clientName || 'Cliente').trim().split(/\s+/)[0];
  const remaining = Math.max(0, params.threshold - params.points);
  const actualPercent = Math.min(99, Math.round((params.points / Math.max(1, params.threshold)) * 100));

  if (params.milestonePercent === 90) {
    const title = `Falta muito pouco! Você atingiu ${actualPercent}% do Cartão Fidelidade`;
    const message =
      `Oi, ${firstName}! Você já acumulou ${params.points} de ${params.threshold} pontos no ${params.businessName}. ` +
      `Falta apenas ${remaining} ${remaining === 1 ? 'ponto' : 'pontos'} para desbloquear "${params.rewardTitle}". ` +
      `Agende seu próximo atendimento agora e garanta seu benefício!`;
    const emailSubject = `[${params.businessName}] Falta só ${remaining} ${remaining === 1 ? 'ponto' : 'pontos'} para o seu prêmio (${actualPercent}%)`;
    const emailBody =
      `Você está a um passo de completar seu Cartão Fidelidade no ${params.businessName}!\n\n` +
      `Progresso atual: ${params.points} de ${params.threshold} pontos (${actualPercent}%)\n` +
      `Prêmio aguardando por você: ${params.rewardTitle}\n\n` +
      `Que tal aproveitar o embalo e agendar seu próximo serviço hoje mesmo? Estamos esperando por você!`;

    return { title, message, emailSubject, emailBody };
  }

  const title = 'Metade do caminho concluída! 50% do seu Cartão Fidelidade';
  const message =
    `Parabéns, ${firstName}! Você completou ${params.points} de ${params.threshold} pontos (50%) no ${params.businessName} rumo a "${params.rewardTitle}". ` +
    `Que tal agendar seu próximo serviço e ficar ainda mais perto da recompensa?`;
  const emailSubject = `[${params.businessName}] Você chegou a 50% do seu Cartão Fidelidade!`;
  const emailBody =
    `Ótima notícia! Você já atingiu a metade do seu Cartão Fidelidade no ${params.businessName}.\n\n` +
    `Progresso atual: ${params.points} de ${params.threshold} pontos\n` +
    `Seu prêmio ao completar: ${params.rewardTitle}\n\n` +
    `Agende seu próximo serviço para continuar acumulando pontos rumo ao seu benefício exclusivo!`;

  return { title, message, emailSubject, emailBody };
}

export function isBrowserPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserPushPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserPushSupported()) return 'unsupported';
  try {
    return window.Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export async function requestBrowserPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserPushSupported()) return 'unsupported';
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
}

const PUSH_SEEN_STORAGE_KEY = 'studio_digital_delivered_loyalty_push_ids';

export function hasLocalPushDelivered(notificationId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PUSH_SEEN_STORAGE_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(notificationId);
  } catch {
    return false;
  }
}

export function markLocalPushDelivered(notificationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PUSH_SEEN_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.from(new Set([notificationId, ...(Array.isArray(existing) ? existing : [])])).slice(0, 100);
    window.localStorage.setItem(PUSH_SEEN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage error cleanly
  }
}

export function triggerBrowserPushNotification(
  title: string,
  body: string,
  tag: string,
  onClick?: () => void
): boolean {
  if (!isBrowserPushSupported()) return false;
  try {
    if (window.Notification.permission !== 'granted') return false;
    const notification = new window.Notification(title, {
      body,
      tag,
      requireInteraction: false,
    });
    if (onClick) {
      notification.onclick = () => {
        try {
          window.focus();
          onClick();
        } catch {
          // Ignore focus errors in iframe contexts
        }
      };
    }
    return true;
  } catch {
    return false;
  }
}

export async function dispatchLoyaltyMilestoneEmail(params: {
  to?: string;
  subject: string;
  body: string;
  clientName: string;
  studioName: string;
  milestonePercent: 50 | 90;
  bookingUrl?: string;
}): Promise<{
  emailStatus: LoyaltyMilestoneNotification['emailStatus'];
  emailStatusDetail: string;
}> {
  const email = (params.to || '').trim();
  if (!email || !email.includes('@')) {
    return {
      emailStatus: 'sem_email',
      emailStatusDetail: 'Cliente sem e-mail cadastrado na ficha.',
    };
  }

  try {
    const response = await fetch('/api/loyalty-notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: params.subject,
        body: params.body,
        clientName: params.clientName,
        studioName: params.studioName,
        milestonePercent: params.milestonePercent,
        bookingUrl: params.bookingUrl,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      delivered?: boolean;
      reason?: string;
      detail?: string;
      provider?: string;
    };

    if (response.ok && data.delivered) {
      return {
        emailStatus: 'enviado',
        emailStatusDetail: data.detail || `Enviado para ${email}`,
      };
    }

    if (data.reason === 'smtp_not_configured') {
      return {
        emailStatus: 'configurar_smtp',
        emailStatusDetail:
          data.detail || 'Provedor SMTP/Resend não configurado no servidor. E-mail pronto para envio.',
      };
    }

    return {
      emailStatus: 'erro_envio',
      emailStatusDetail: data.detail || `Falha no envio (HTTP ${response.status}).`,
    };
  } catch {
    return {
      emailStatus: 'configurar_smtp',
      emailStatusDetail: 'Endpoint de e-mail indisponível neste ambiente. E-mail pronto no histórico.',
    };
  }
}

export function buildMailtoHref(toEmail: string, subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${toEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}

export function formatChannelLabel(channel: LoyaltyNotificationChannel): string {
  if (channel === 'push') return 'Push';
  if (channel === 'email') return 'E-mail';
  return 'Push + E-mail';
}
