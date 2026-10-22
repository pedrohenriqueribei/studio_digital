import { Professional, AvailabilityConfig } from '../types';

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
  field: 'startTime' | 'endTime' | 'startDate' | 'endDate' | 'daysOfWeek' | 'general';
  message: string;
}

/**
 * Valida as regras de negócio de configuração de disponibilidade:
 * - O horário de término deve ser posterior ao horário de início.
 * - A data final não pode ser menor que a data de início.
 * - Ao menos um dia da semana deve ser selecionado.
 */
export function validateAvailability(config: {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}): { isValid: boolean; errors: AvailabilityValidationError[] } {
  const errors: AvailabilityValidationError[] = [];

  // Validação de datas
  if (!config.startDate) {
    errors.push({ field: 'startDate', message: 'A data de início é obrigatória.' });
  }

  if (!config.endDate) {
    errors.push({ field: 'endDate', message: 'A data final é obrigatória.' });
  }

  if (config.startDate && config.endDate) {
    if (config.endDate < config.startDate) {
      errors.push({
        field: 'endDate',
        message: 'A data final não pode ser menor que a data de início.',
      });
    }
  }

  // Validação de horários
  if (!config.startTime) {
    errors.push({ field: 'startTime', message: 'O horário de início é obrigatório.' });
  }

  if (!config.endTime) {
    errors.push({ field: 'endTime', message: 'O horário de término é obrigatório.' });
  }

  if (config.startTime && config.endTime) {
    const [startH, startM] = config.startTime.split(':').map(Number);
    const [endH, endM] = config.endTime.split(':').map(Number);
    const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);

    if (endMinutes <= startMinutes) {
      errors.push({
        field: 'endTime',
        message: 'O horário de término deve ser posterior ao horário de início.',
      });
    }
  }

  // Validação de dias da semana
  if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
    errors.push({
      field: 'daysOfWeek',
      message: 'Selecione ao menos um dia da semana para atendimento.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Retorna o horário e disponibilidade do profissional para uma data específica (YYYY-MM-DD),
 * priorizando a configuração por período (availabilityConfig) se a data estiver dentro da vigência,
 * ou recorrendo ao workHours padrão.
 */
export function getProfessionalScheduleForDate(
  professional: Professional,
  dateStr: string
): { isAvailable: boolean; start: string; end: string; source: 'period' | 'default' } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();

  // Verifica se há configuração de disponibilidade por período ativa
  const config = professional.availabilityConfig;
  if (config && config.active) {
    const isWithinPeriod = dateStr >= config.startDate && dateStr <= config.endDate;
    if (isWithinPeriod) {
      const isDayAllowed = config.daysOfWeek.includes(dayOfWeek);
      return {
        isAvailable: isDayAllowed,
        start: config.startTime,
        end: config.endTime,
        source: 'period',
      };
    }
  }

  // Fallback para o horário de trabalho base (workHours)
  const baseDays = professional.workHours?.daysOfWeek || [1, 2, 3, 4, 5, 6];
  const isBaseDayAllowed = baseDays.includes(dayOfWeek);

  return {
    isAvailable: isBaseDayAllowed,
    start: professional.workHours?.start || '09:00',
    end: professional.workHours?.end || '19:00',
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
