import { Professional, Service, VirtualQueueItem } from '../types';

export interface NewClientWaitEstimation {
  professionalId: string;
  professionalName: string;
  avgServiceDuration: number;
  matchingServicesCount: number;
  servicesSample: string[];
  waitingCount: number;
  calledCount: number;
  inAttendanceCount: number;
  totalAheadCount: number;
  estimatedWaitMinutes: number;
  isImmediate: boolean;
  statusLabel: 'imediato' | 'pouca_espera' | 'espera_moderada' | 'fila_longa';
  statusColor: string;
  calculationFormula: string;
}

/**
 * Algoritmo simples que calcula o tempo de espera estimado para novos clientes
 * com base na média de duração dos serviços do profissional selecionado.
 *
 * Passos do algoritmo:
 * 1. Identifica os serviços que o profissional realiza (allowedProfessionalIds).
 * 2. Calcula a média aritmética da duração (minutos) desses serviços.
 * 3. Identifica a quantidade de clientes que estão na fila à frente (aguardando + chamados).
 * 4. Verifica se há cliente em atendimento no momento com o profissional (tempo residual estimado = 50% da média).
 * 5. Tempo Estimado = (Clientes na Fila * Média de Duração) + (Cliente em Atendimento * Média de Duração / 2).
 */
export function calculateNewClientWaitTime(
  professionalId: string,
  professionals: Professional[],
  services: Service[],
  queueItems: VirtualQueueItem[],
  includeAnyProfessionalInQueue: boolean = true
): NewClientWaitEstimation {
  const professional = professionals.find((p) => p.id === professionalId);
  const professionalName = professional?.name || 'Profissional';

  // 1. Serviços realizados por este profissional
  const matchingServices = services.filter(
    (s) =>
      s.active !== false &&
      (!s.allowedProfessionalIds ||
        s.allowedProfessionalIds.length === 0 ||
        s.allowedProfessionalIds.includes(professionalId))
  );

  // Fallback caso não haja serviços específicos configurados
  const targetServices =
    matchingServices.length > 0
      ? matchingServices
      : services.filter((s) => s.active !== false);

  // 2. Média de duração dos serviços do profissional
  const avgServiceDuration =
    targetServices.length > 0
      ? Math.round(
          targetServices.reduce((sum, s) => sum + (s.durationMinutes || 30), 0) /
            targetServices.length
        )
      : 30;

  const servicesSample = targetServices.map((s) => s.name);

  // 3. Clientes na fila para este profissional
  const waitingItems = queueItems.filter((q) => {
    if (q.status !== 'aguardando') return false;
    const isForThisPro =
      q.assignedProfessionalId === professionalId ||
      q.professionalId === professionalId;
    if (isForThisPro) return true;
    if (includeAnyProfessionalInQueue && q.anyProfessional && !q.assignedProfessionalId) {
      return true;
    }
    return false;
  });

  const calledItems = queueItems.filter(
    (q) =>
      q.status === 'chamado' &&
      (q.assignedProfessionalId === professionalId || q.professionalId === professionalId)
  );

  const inAttendanceItems = queueItems.filter(
    (q) =>
      q.status === 'em_atendimento' &&
      (q.assignedProfessionalId === professionalId || q.professionalId === professionalId)
  );

  const waitingCount = waitingItems.length;
  const calledCount = calledItems.length;
  const inAttendanceCount = inAttendanceItems.length;
  const totalAheadCount = waitingCount + calledCount;

  // 4. Cálculo do tempo estimado
  // Se o profissional está com alguém na cadeira, estima-se que em média metade do tempo médio já transcorreu
  const inAttendanceResidualMinutes =
    inAttendanceCount > 0 ? Math.round(avgServiceDuration / 2) : 0;

  const rawEstimatedWait =
    totalAheadCount * avgServiceDuration + inAttendanceResidualMinutes;

  const isImmediate = totalAheadCount === 0 && inAttendanceCount === 0;
  const estimatedWaitMinutes = isImmediate ? 0 : Math.max(5, rawEstimatedWait);

  // Status visual
  let statusLabel: NewClientWaitEstimation['statusLabel'] = 'imediato';
  let statusColor = 'emerald';
  if (!isImmediate) {
    if (estimatedWaitMinutes <= 20) {
      statusLabel = 'pouca_espera';
      statusColor = 'emerald';
    } else if (estimatedWaitMinutes <= 45) {
      statusLabel = 'espera_moderada';
      statusColor = 'amber';
    } else {
      statusLabel = 'fila_longa';
      statusColor = 'rose';
    }
  }

  // 5. Descrição transparente da fórmula
  let calculationFormula = '';
  if (isImmediate) {
    calculationFormula = `Sem clientes na fila. Atendimento imediato disponível (serviços com média de ${avgServiceDuration} min).`;
  } else {
    const parts: string[] = [];
    if (totalAheadCount > 0) {
      parts.push(
        `${totalAheadCount} cliente${totalAheadCount > 1 ? 's' : ''} na fila × ${avgServiceDuration} min médios`
      );
    }
    if (inAttendanceCount > 0) {
      parts.push(`1 em atendimento (~${inAttendanceResidualMinutes} min restantes)`);
    }
    calculationFormula = `Fórmula: ${parts.join(' + ')} = ~${estimatedWaitMinutes} min de espera estimada.`;
  }

  return {
    professionalId,
    professionalName,
    avgServiceDuration,
    matchingServicesCount: targetServices.length,
    servicesSample,
    waitingCount,
    calledCount,
    inAttendanceCount,
    totalAheadCount,
    estimatedWaitMinutes,
    isImmediate,
    statusLabel,
    statusColor,
    calculationFormula,
  };
}

/**
 * Calcula a estimativa para todos os profissionais ativos
 */
export function calculateAllProfessionalsWaitTimes(
  professionals: Professional[],
  services: Service[],
  queueItems: VirtualQueueItem[]
): {
  byProfessional: Record<string, NewClientWaitEstimation>;
  overallAvgWaitMinutes: number;
  fastestProfessional?: NewClientWaitEstimation;
} {
  const activePros = professionals.filter((p) => p.active !== false);
  const byProfessional: Record<string, NewClientWaitEstimation> = {};

  let totalMinutes = 0;
  let fastest: NewClientWaitEstimation | undefined;

  activePros.forEach((pro) => {
    const est = calculateNewClientWaitTime(pro.id, professionals, services, queueItems, false);
    byProfessional[pro.id] = est;
    totalMinutes += est.estimatedWaitMinutes;

    if (!fastest || est.estimatedWaitMinutes < fastest.estimatedWaitMinutes) {
      fastest = est;
    }
  });

  const overallAvgWaitMinutes =
    activePros.length > 0 ? Math.round(totalMinutes / activePros.length) : 0;

  return {
    byProfessional,
    overallAvgWaitMinutes,
    fastestProfessional: fastest,
  };
}
