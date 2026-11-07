import { Professional, AvailabilityConfig, AvailabilityPeriod, ShiftInterval } from '../types';

export const WEEK_DAYS = [
  { id: 0, label: 'Domingo', short: 'Dom' },
  { id: 1, label: 'Segunda-feira', short: 'Seg' },
  { id: 2, label: 'Terça-feira', short: 'Ter' },
  { id: 3, label: 'Quarta-feira', short: 'Qua' },
  { id: 4, label: 'Quinta-feira', short: 'Qui' },
  { id: 5, label: 'Sexta-feira', short: 'Sex' },
  { id: 6, label: 'Sábado', short: 'Sáb' },
];

export interface AvailabilityValidationError {
  field: 'startTime' | 'endTime' | 'startDate' | 'endDate' | 'daysOfWeek' | 'shifts' | 'general';
  message: string;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

/**
 * Converte string de horário "HH:mm" em total de minutos a partir de 00:00.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Converte total de minutos em string "HH:mm".
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Verifica se dois intervalos de horário [startA, endA) e [startB, endB) se sobrepõem.
 * Regra: startA < endB && endA > startB
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);

  // Intervalo inválido ou zerado
  if (eA <= sA || eB <= sB) return false;

  return sA < eB && eA > sB;
}

/**
 * Valida os turnos internos de um período:
 * 1. Cada turno deve ter início e fim
 * 2. Término deve ser posterior ao início
 * 3. Turnos internos não podem se sobrepor entre si (ex: turno 1 08h-12h e turno 2 11h-15h)
 */
export function validateShiftIntervals(
  shifts: ShiftInterval[]
): { isValid: boolean; errors: AvailabilityValidationError[] } {
  const errors: AvailabilityValidationError[] = [];

  if (!shifts || shifts.length === 0) {
    errors.push({ field: 'shifts', message: 'Defina ao menos um turno de atendimento.' });
    return { isValid: false, errors };
  }

  // Valida cada turno individualmente
  shifts.forEach((shift, index) => {
    const shiftLabel = shift.label || `Turno ${index + 1}`;
    if (!shift.startTime) {
      errors.push({ field: 'shifts', message: `Informe o horário inicial para o ${shiftLabel}.` });
    }
    if (!shift.endTime) {
      errors.push({ field: 'shifts', message: `Informe o horário final para o ${shiftLabel}.` });
    }

    if (shift.startTime && shift.endTime) {
      const startMin = timeToMinutes(shift.startTime);
      const endMin = timeToMinutes(shift.endTime);

      if (endMin <= startMin) {
        errors.push({
          field: 'shifts',
          message: `O horário de término (${shift.endTime}) deve ser posterior ao início (${shift.startTime}) no ${shiftLabel}.`,
        });
      }
    }
  });

  // Valida sobreposição entre os turnos do mesmo período
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const s1 = shifts[i];
      const s2 = shifts[j];
      if (s1.startTime && s1.endTime && s2.startTime && s2.endTime) {
        if (isTimeOverlapping(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
          errors.push({
            field: 'shifts',
            message: `Sobreposição detectada entre turnos: ${s1.label || `Turno ${i + 1}`} (${s1.startTime}-${s1.endTime}) e ${s2.label || `Turno ${j + 1}`} (${s2.startTime}-${s2.endTime}).`,
          });
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Valida as regras de negócio de configuração de um período de disponibilidade:
 * - Data final >= Data início
 * - Ao menos 1 dia da semana
 * - Turnos válidos e sem conflito interno
 */
export function validateAvailabilityPeriod(period: {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  shifts: ShiftInterval[];
  startTime?: string;
  endTime?: string;
}): { isValid: boolean; errors: AvailabilityValidationError[] } {
  const errors: AvailabilityValidationError[] = [];

  // Validação de datas
  if (!period.startDate) {
    errors.push({ field: 'startDate', message: 'A data de início do período é obrigatória.' });
  }

  if (!period.endDate) {
    errors.push({ field: 'endDate', message: 'A data final do período é obrigatória.' });
  }

  if (period.startDate && period.endDate) {
    if (period.endDate < period.startDate) {
      errors.push({
        field: 'endDate',
        message: 'A data final não pode ser menor que a data de início.',
      });
    }
  }

  // Validação de dias da semana
  if (!period.daysOfWeek || period.daysOfWeek.length === 0) {
    errors.push({
      field: 'daysOfWeek',
      message: 'Selecione ao menos um dia da semana para atendimento.',
    });
  }

  // Normaliza turnos (se shifts vazio mas startTime/endTime fornecido)
  const shiftsToValidate: ShiftInterval[] =
    period.shifts && period.shifts.length > 0
      ? period.shifts
      : period.startTime && period.endTime
      ? [{ id: 'default', startTime: period.startTime, endTime: period.endTime, label: 'Turno Principal' }]
      : [];

  const shiftVal = validateShiftIntervals(shiftsToValidate);
  errors.push(...shiftVal.errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validação legada mantida para retrocompatibilidade
 */
export function validateAvailability(config: {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}): { isValid: boolean; errors: AvailabilityValidationError[] } {
  return validateAvailabilityPeriod({
    startDate: config.startDate,
    endDate: config.endDate,
    daysOfWeek: config.daysOfWeek,
    shifts: [{ id: '1', startTime: config.startTime, endTime: config.endTime }],
  });
}

export interface PeriodConflictCheckResult {
  hasConflict: boolean;
  conflictingPeriod?: AvailabilityPeriod;
  message?: string;
  overlappingDays?: number[];
  conflictingShiftInfo?: string;
}

/**
 * Validação rigorosa contra conflito/sobreposição de períodos do mesmo profissional:
 * Dois períodos entram em conflito se:
 * 1. O intervalo de datas se sobrepõe (max(s1, s2) <= min(e1, e2))
 * 2. Compartilham ao menos um dia da semana (daysOfWeek)
 * 3. Qualquer um dos turnos de atendimento se sobrepõe em horário
 */
export function checkAvailabilityPeriodConflict(params: {
  period: {
    id?: string;
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    shifts: ShiftInterval[];
  };
  existingPeriods: AvailabilityPeriod[];
  excludePeriodId?: string;
}): PeriodConflictCheckResult {
  const { period, existingPeriods, excludePeriodId } = params;

  if (!period.startDate || !period.endDate || !period.daysOfWeek || period.daysOfWeek.length === 0) {
    return { hasConflict: false };
  }

  const shiftsA = period.shifts && period.shifts.length > 0
    ? period.shifts
    : [];

  // Filtra períodos ativos do mesmo profissional
  const activeExisting = existingPeriods.filter(
    (p) => p.active !== false && (!excludePeriodId || p.id !== excludePeriodId) && (!period.id || p.id !== period.id)
  );

  for (const existing of activeExisting) {
    // 1. Verifica sobreposição de datas: max(startA, startB) <= min(endA, endB)
    const isDateOverlapping = period.startDate <= existing.endDate && period.endDate >= existing.startDate;
    if (!isDateOverlapping) continue;

    // 2. Verifica interseção de dias da semana
    const sharedDays = period.daysOfWeek.filter((d) => existing.daysOfWeek.includes(d));
    if (sharedDays.length === 0) continue;

    // Normaliza turnos do período existente
    const shiftsB: ShiftInterval[] =
      existing.shifts && existing.shifts.length > 0
        ? existing.shifts
        : existing.startTime && existing.endTime
        ? [{ id: '1', startTime: existing.startTime, endTime: existing.endTime }]
        : [];

    // 3. Verifica se qualquer turno de A se sobrepõe com qualquer turno de B
    for (const sA of shiftsA) {
      for (const sB of shiftsB) {
        if (isTimeOverlapping(sA.startTime, sA.endTime, sB.startTime, sB.endTime)) {
          const formattedDays = formatWeekDaysLabel(sharedDays);
          const periodTitle = existing.title || `Período (${existing.startDate.split('-').reverse().join('/')} a ${existing.endDate.split('-').reverse().join('/')})`;
          const shiftOverlapDesc = `${sA.startTime}-${sA.endTime} conflita com ${sB.startTime}-${sB.endTime}`;

          return {
            hasConflict: true,
            conflictingPeriod: existing,
            overlappingDays: sharedDays,
            conflictingShiftInfo: shiftOverlapDesc,
            message: `Conflito de Disponibilidade: O intervalo de datas (${period.startDate} a ${period.endDate}) e os dias (${formattedDays}) conflitam com o período "${periodTitle}", onde já existe atendimento cadastrado das ${sB.startTime} às ${sB.endTime}.`,
          };
        }
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Classifica um período de atendimento em relação a uma data de referência (padrão hoje):
 * - 'current': Em vigor hoje (startDate <= refDate <= endDate)
 * - 'future': Período futuro (refDate < startDate)
 * - 'past': Período passado/encerrado (refDate > endDate)
 */
export function getPeriodStatus(
  period: AvailabilityPeriod,
  referenceDateStr?: string
): 'current' | 'future' | 'past' {
  const ref = referenceDateStr || new Date().toISOString().split('T')[0];
  if (ref >= period.startDate && ref <= period.endDate) {
    return 'current';
  }
  if (ref < period.startDate) {
    return 'future';
  }
  return 'past';
}

/**
 * Retorna contagem de dias restantes para o término (se vigente) ou dias até o início (se futuro).
 */
export function getPeriodCountdown(period: AvailabilityPeriod, referenceDateStr?: string): {
  status: 'current' | 'future' | 'past';
  days: number;
  label: string;
} {
  const refStr = referenceDateStr || new Date().toISOString().split('T')[0];
  const refParts = refStr.split('-').map(Number);
  const refDate = new Date(refParts[0], refParts[1] - 1, refParts[2]);

  const [sY, sM, sD] = period.startDate.split('-').map(Number);
  const startDate = new Date(sY, sM - 1, sD);

  const [eY, eM, eD] = period.endDate.split('-').map(Number);
  const endDate = new Date(eY, eM - 1, eD);

  const status = getPeriodStatus(period, refStr);

  if (status === 'current') {
    const diffTime = endDate.getTime() - refDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return {
      status,
      days: daysRemaining,
      label: daysRemaining === 0 ? 'Último dia hoje' : `Vigente (mais ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'})`,
    };
  }

  if (status === 'future') {
    const diffTime = startDate.getTime() - refDate.getTime();
    const daysUntil = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return {
      status,
      days: daysUntil,
      label: daysUntil === 1 ? 'Inicia amanhã' : `Inicia em ${daysUntil} dias`,
    };
  }

  const diffTime = refDate.getTime() - endDate.getTime();
  const daysAgo = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  return {
    status,
    days: daysAgo,
    label: `Encerrado há ${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'}`,
  };
}

/**
 * Calcula a carga horária total diária somando todos os turnos de um período.
 */
export function calculatePeriodTotalHours(shifts: ShiftInterval[]): {
  totalMinutes: number;
  formatted: string;
} {
  if (!shifts || shifts.length === 0) {
    return { totalMinutes: 0, formatted: '0h' };
  }

  let totalMinutes = 0;
  for (const s of shifts) {
    if (s.startTime && s.endTime) {
      const diff = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
      if (diff > 0) totalMinutes += diff;
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formatted = minutes > 0 ? `${hours}h ${minutes}min` : `${hours} horas`;

  return { totalMinutes, formatted };
}

/**
 * Retorna o horário e disponibilidade do profissional para uma data específica (YYYY-MM-DD),
 * priorizando múltiplos períodos de disponibilidade (availabilityPeriods), recorrendo
 * ao availabilityConfig individual ou por fim ao workHours base.
 */
export function getProfessionalScheduleForDate(
  professional: Professional,
  dateStr: string
): {
  isAvailable: boolean;
  start: string;
  end: string;
  shifts: ShiftInterval[];
  source: 'period' | 'default';
  period?: AvailabilityPeriod;
} {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();

  // 1. Verifica períodos de disponibilidade múltiplos (availabilityPeriods)
  if (professional.availabilityPeriods && professional.availabilityPeriods.length > 0) {
    const matchingPeriod = professional.availabilityPeriods.find((p) => {
      if (!p.active) return false;
      const withinDate = dateStr >= p.startDate && dateStr <= p.endDate;
      return withinDate && p.daysOfWeek.includes(dayOfWeek);
    });

    if (matchingPeriod) {
      const shifts: ShiftInterval[] =
        matchingPeriod.shifts && matchingPeriod.shifts.length > 0
          ? matchingPeriod.shifts
          : [
              {
                id: '1',
                startTime: matchingPeriod.startTime || '09:00',
                endTime: matchingPeriod.endTime || '18:00',
                label: 'Turno Principal',
              },
            ];

      const firstShift = shifts[0];
      const lastShift = shifts[shifts.length - 1];

      return {
        isAvailable: true,
        start: firstShift?.startTime || '09:00',
        end: lastShift?.endTime || '18:00',
        shifts,
        source: 'period',
        period: matchingPeriod,
      };
    }

    // Se há períodos configurados mas a data cai em um período em que o dia da semana não foi selecionado
    const periodCoveringDate = professional.availabilityPeriods.find(
      (p) => p.active && dateStr >= p.startDate && dateStr <= p.endDate
    );
    if (periodCoveringDate) {
      return {
        isAvailable: false,
        start: '00:00',
        end: '00:00',
        shifts: [],
        source: 'period',
        period: periodCoveringDate,
      };
    }
  }

  // 2. Verifica se há configuração legada única de disponibilidade por período (availabilityConfig)
  const legacyConfig = professional.availabilityConfig;
  if (legacyConfig && legacyConfig.active) {
    const isWithinPeriod = dateStr >= legacyConfig.startDate && dateStr <= legacyConfig.endDate;
    if (isWithinPeriod) {
      const isDayAllowed = legacyConfig.daysOfWeek.includes(dayOfWeek);
      const shifts: ShiftInterval[] =
        legacyConfig.shifts && legacyConfig.shifts.length > 0
          ? legacyConfig.shifts
          : [
              {
                id: '1',
                startTime: legacyConfig.startTime || '09:00',
                endTime: legacyConfig.endTime || '18:00',
                label: 'Turno Principal',
              },
            ];

      return {
        isAvailable: isDayAllowed,
        start: legacyConfig.startTime || '09:00',
        end: legacyConfig.endTime || '18:00',
        shifts: isDayAllowed ? shifts : [],
        source: 'period',
        period: legacyConfig,
      };
    }
  }

  // 3. Fallback para o horário de trabalho base (workHours)
  const baseDays = professional.workHours?.daysOfWeek || [1, 2, 3, 4, 5, 6];
  const isBaseDayAllowed = baseDays.includes(dayOfWeek);
  const baseStart = professional.workHours?.start || '09:00';
  const baseEnd = professional.workHours?.end || '19:00';

  return {
    isAvailable: isBaseDayAllowed,
    start: baseStart,
    end: baseEnd,
    shifts: isBaseDayAllowed
      ? [{ id: 'base', startTime: baseStart, endTime: baseEnd, label: 'Jornada Padrão' }]
      : [],
    source: 'default',
  };
}


/**
 * Formata dias da semana em texto amigável
 * Ex: [1, 2, 3, 4, 5] -> "Segunda a Sexta"
 */
export function formatWeekDaysLabel(days: number[]): string {
  if (!days || days.length === 0) return 'Nenhum dia';
  if (days.length === 7) return 'Todos os dias (Seg a Dom)';

  const sorted = [...days].sort((a, b) => a - b);
  const isSegASex = sorted.length === 5 && [1, 2, 3, 4, 5].every((d) => sorted.includes(d));
  if (isSegASex) return 'Segunda a Sexta';

  const isSegASab = sorted.length === 6 && [1, 2, 3, 4, 5, 6].every((d) => sorted.includes(d));
  if (isSegASab) return 'Segunda a Sábado';

  const isFimDeSemana = sorted.length === 2 && sorted.includes(0) && sorted.includes(6);
  if (isFimDeSemana) return 'Finais de Semana (Sáb e Dom)';

  const dayNames: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb',
  };

  return sorted.map((d) => dayNames[d]).join(', ');
}



/**
 * Limpa e padroniza telefone removendo caracteres não numéricos.
 */
export function normalizePhone(phone?: string): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Identifica se dois registros referem-se ao mesmo cliente por ID, telefone, e-mail ou nome.
 */
export function isSameClient(
  clientA: { id?: string; name?: string; phone?: string; email?: string },
  clientB: { id?: string; name?: string; phone?: string; email?: string }
): boolean {
  // 1. Mesmo ID de cliente cadastrado
  if (clientA.id && clientB.id && clientA.id === clientB.id) {
    return true;
  }

  // 2. Mesmo Telefone / WhatsApp (normalizado)
  const phoneA = normalizePhone(clientA.phone);
  const phoneB = normalizePhone(clientB.phone);
  if (phoneA.length >= 8 && phoneB.length >= 8) {
    if (
      phoneA === phoneB ||
      phoneA.endsWith(phoneB) ||
      phoneB.endsWith(phoneA) ||
      (phoneA.length >= 8 && phoneB.length >= 8 && phoneA.slice(-8) === phoneB.slice(-8))
    ) {
      return true;
    }
  }

  // 3. Mesmo E-mail cadastrado
  const emailA = (clientA.email || '').trim().toLowerCase();
  const emailB = (clientB.email || '').trim().toLowerCase();
  if (emailA && emailB && emailA === emailB) {
    return true;
  }

  // 4. Mesmo nome completo
  const nameA = (clientA.name || '').trim().toLowerCase();
  const nameB = (clientB.name || '').trim().toLowerCase();
  if (nameA && nameB && nameA.length >= 3 && nameA === nameB) {
    if (phoneA && phoneB) {
      return phoneA.slice(-4) === phoneB.slice(-4);
    }
    return true;
  }

  return false;
}

export interface AppointmentConflictCheckParams {
  appointments: Array<{
    id: string;
    businessId?: string;
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    professionalId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  professionals: Array<{
    id: string;
    name: string;
  }>;
  date: string;
  startTime: string;
  endTime: string;
  professionalId: string;
  client: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
  };
  excludeAppointmentId?: string;
}

export interface AppointmentConflictResult {
  hasConflict: boolean;
  conflictType?: 'professional_conflict' | 'client_conflict';
  conflictingAppointment?: any;
  message?: string;
}

/**
 * Validação central contra conflitos de agendamento:
 * Regra 1: Apenas 1 cliente por dia e horário para o mesmo profissional.
 * Regra 2: O mesmo cliente não pode ter agendamentos com profissionais diferentes (ou iguais) no mesmo dia e horário.
 */
export function checkAppointmentConflict(
  params: AppointmentConflictCheckParams
): AppointmentConflictResult {
  const {
    appointments,
    professionals,
    date,
    startTime,
    endTime,
    professionalId,
    client,
    excludeAppointmentId,
  } = params;

  if (!date || !startTime || !endTime) {
    return { hasConflict: false };
  }

  // Filtra agendamentos ativos na mesma data
  const activeOnDate = appointments.filter(
    (app) =>
      app.date === date &&
      app.status !== 'cancelado' &&
      (!excludeAppointmentId || app.id !== excludeAppointmentId)
  );

  for (const app of activeOnDate) {
    const isOverlapping = isTimeOverlapping(
      startTime,
      endTime,
      app.startTime,
      app.endTime
    );

    if (!isOverlapping) {
      continue;
    }

    // REGRA 1: Conflito com o mesmo profissional
    // Apenas 1 cliente pode agendar no mesmo dia e horário para o mesmo profissional
    if (app.professionalId === professionalId) {
      const pro = professionals.find((p) => p.id === professionalId);
      const proName = pro?.name || 'O profissional selecionado';
      return {
        hasConflict: true,
        conflictType: 'professional_conflict',
        conflictingAppointment: app,
        message: `Horário ocupado: ${proName} já possui um agendamento com ${app.clientName} das ${app.startTime} às ${app.endTime}. Apenas 1 cliente é permitido por horário.`,
      };
    }

    // REGRA 2: Conflito do mesmo cliente com profissionais diferentes no mesmo dia e horário
    const matchesClient = isSameClient(
      {
        id: app.clientId,
        name: app.clientName,
        phone: app.clientPhone,
        email: app.clientEmail,
      },
      client
    );

    if (matchesClient) {
      const otherPro = professionals.find((p) => p.id === app.professionalId);
      const otherProName = otherPro?.name || 'outro profissional';
      return {
        hasConflict: true,
        conflictType: 'client_conflict',
        conflictingAppointment: app,
        message: `Conflito de horário do cliente: ${client.name || 'Este cliente'} já possui um agendamento neste dia (${date}) das ${app.startTime} às ${app.endTime} com ${otherProName}. Não é permitido agendar atendimentos simultâneos.`,
      };
    }
  }

  return { hasConflict: false };
}
