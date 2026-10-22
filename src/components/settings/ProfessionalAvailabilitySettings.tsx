import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  RotateCcw,
  User,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Info,
  CalendarDays,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Professional, AvailabilityConfig } from '../../types';
import {
  WEEK_DAYS,
  validateAvailability,
  formatWeekDaysLabel,
  AvailabilityValidationError,
} from '../../utils/availability';
import { slugify } from '../../utils/slugify';

interface ProfessionalAvailabilitySettingsProps {
  /** Opcional: ID de um profissional pré-selecionado */
  initialProfessionalId?: string;
  /** Callback opcional quando a disponibilidade for salva */
  onSaved?: (professional: Professional) => void;
}

export const ProfessionalAvailabilitySettings: React.FC<
  ProfessionalAvailabilitySettingsProps
> = ({ initialProfessionalId, onSaved }) => {
  const {
    activeProfessionals,
    currentProfessional,
    currentRole,
    updateProfessional,
    addNotification,
    navigateTo,
    currentBusiness,
  } = useApp();

  // Seleciona o profissional inicial (prioriza initialProfessionalId, depois currentProfessional, ou o primeiro da lista)
  const [selectedProId, setSelectedProId] = useState<string>(() => {
    if (initialProfessionalId) return initialProfessionalId;
    if (currentProfessional) return currentProfessional.id;
    return activeProfessionals[0]?.id || '';
  });

  // Atualiza se activeProfessionals carregar depois
  useEffect(() => {
    if (!selectedProId && activeProfessionals.length > 0) {
      setSelectedProId(activeProfessionals[0].id);
    }
  }, [activeProfessionals, selectedProId]);

  // Profissional em edição
  const selectedPro = useMemo(() => {
    return activeProfessionals.find((p) => p.id === selectedProId) || currentProfessional || null;
  }, [activeProfessionals, selectedProId, currentProfessional]);

  // Datas padrão: Início hoje, Fim daqui a 30 dias
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Estados do formulário de disponibilidade
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(defaultEndStr);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Seg a Sex padrão
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [periodNotes, setPeriodNotes] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Estados de feedback visual
  const [errors, setErrors] = useState<AvailabilityValidationError[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carrega a disponibilidade existente do profissional quando o profissional selecionado muda
  useEffect(() => {
    if (selectedPro) {
      if (selectedPro.availabilityConfig) {
        const cfg = selectedPro.availabilityConfig;
        setStartDate(cfg.startDate || todayStr);
        setEndDate(cfg.endDate || defaultEndStr);
        setDaysOfWeek(cfg.daysOfWeek && cfg.daysOfWeek.length > 0 ? cfg.daysOfWeek : [1, 2, 3, 4, 5]);
        setStartTime(cfg.startTime || '09:00');
        setEndTime(cfg.endTime || '18:00');
        setPeriodNotes(cfg.notes || '');
        setIsActive(cfg.active !== false);
      } else {
        // Fallback para workHours existentes
        setStartDate(todayStr);
        setEndDate(defaultEndStr);
        setDaysOfWeek(selectedPro.workHours?.daysOfWeek || [1, 2, 3, 4, 5, 6]);
        setStartTime(selectedPro.workHours?.start || '09:00');
        setEndTime(selectedPro.workHours?.end || '18:00');
        setPeriodNotes('Escala Padrão');
        setIsActive(true);
      }
      setErrors([]);
      setSuccessMessage(null);
      setHasSubmitted(false);
    }
  }, [selectedPro?.id, todayStr, defaultEndStr]);

  // Validação em tempo real (quando já tentou submeter ou em digitação)
  const currentValidation = useMemo(() => {
    return validateAvailability({
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek,
    });
  }, [startDate, endDate, startTime, endTime, daysOfWeek]);

  // Se já tiver tentado submeter, reflete a validação nos erros
  useEffect(() => {
    if (hasSubmitted) {
      setErrors(currentValidation.errors);
    }
  }, [currentValidation, hasSubmitted]);

  // Helpers de erro por campo
  const getFieldError = (field: AvailabilityValidationError['field']) => {
    return errors.find((e) => e.field === field)?.message;
  };

  // Toggle de dia individual
  const handleToggleDay = (dayId: number) => {
    setDaysOfWeek((prev) => {
      const exists = prev.includes(dayId);
      const updated = exists ? prev.filter((d) => d !== dayId) : [...prev, dayId];
      return updated.sort((a, b) => a - b);
    });
  };

  // Atalhos de seleção de dias
  const handleSelectWeekdays = () => setDaysOfWeek([1, 2, 3, 4, 5]); // Seg a Sex
  const handleSelectWeekAndSat = () => setDaysOfWeek([1, 2, 3, 4, 5, 6]); // Seg a Sáb
  const handleSelectAllDays = () => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
  const handleClearDays = () => setDaysOfWeek([]);

  // Atalhos de período de datas
  const handleSetQuickPeriod = (days: number) => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleSetCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  // Atalhos de horários rápidos
  const handleSetQuickHours = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  // Submissão com validações rígidas
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setSuccessMessage(null);

    const validation = validateAvailability({
      startDate,
      endDate,
      startTime,
      endTime,
      daysOfWeek,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!selectedPro) {
      setErrors([{ field: 'general', message: 'Nenhum profissional selecionado para salvar.' }]);
      return;
    }

    // Cria a configuração de disponibilidade
    const newConfig: AvailabilityConfig = {
      id: selectedPro.availabilityConfig?.id || `avail_${Date.now()}`,
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
      notes: periodNotes.trim() || 'Disponibilidade de Atendimento',
      active: isActive,
      updatedAt: new Date().toISOString(),
    };

    // Monta o profissional atualizado
    const updatedPro: Professional = {
      ...selectedPro,
      availabilityConfig: newConfig,
      // Sincroniza também o workHours base com os valores definidos para total retrocompatibilidade
      workHours: {
        start: startTime,
        end: endTime,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : selectedPro.workHours.daysOfWeek,
      },
    };

    updateProfessional(updatedPro);

    // Formatação de datas para a mensagem de sucesso
    const [sY, sM, sD] = startDate.split('-');
    const [eY, eM, eD] = endDate.split('-');
    const formattedRange = `${sD}/${sM}/${sY} até ${eD}/${eM}/${eY}`;
    const daysLabel = formatWeekDaysLabel(daysOfWeek);

    const successTxt = `Disponibilidade de ${selectedPro.name} salva com sucesso! Válida de ${formattedRange} (${daysLabel}) das ${startTime} às ${endTime}.`;
    setSuccessMessage(successTxt);
    setErrors([]);

    // Notificação global na central do app
    addNotification({
      title: 'Disponibilidade Atualizada',
      message: successTxt,
      type: 'system',
    });

    if (onSaved) {
      onSaved(updatedPro);
    }

    // Remove feedback de sucesso após alguns segundos
    setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
  };

  // Cálculo da carga horária diária
  const dailyHoursCalculation = useMemo(() => {
    if (!startTime || !endTime) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const diffMin = (eH * 60 + eM) - (sH * 60 + sM);
    if (diffMin <= 0) return null;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} horas`;
  }, [startTime, endTime]);

  if (!selectedPro && activeProfessionals.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
        <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Nenhum profissional cadastrado</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Cadastre profissionais na aba &quot;Profissionais&quot; para configurar escalas e disponibilidades personalizadas.
        </p>
      </div>
    );
  }

  const proSlug = selectedPro?.slug || (selectedPro ? slugify(selectedPro.name) : '');

  return (
    <div className="space-y-6">
      {/* 1. SELETOR E CONTEXTO DO PROFISSIONAL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedPro?.avatar ? (
              <img
                src={selectedPro.avatar}
                alt={selectedPro.name}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <User className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedPro?.name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 capitalize">
                  {selectedPro?.role === 'ceo' ? 'Diretor & Especialista' : selectedPro?.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentBusiness?.tradeName} · {selectedPro?.specialties.join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Se houver mais de 1 profissional, permite alternar */}
            {activeProfessionals.length > 1 && (
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer transition-colors"
                >
                  {activeProfessionals.map((pro) => (
                    <option key={pro.id} value={pro.id}>
                      Configurar: {pro.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Link para o perfil público */}
            {proSlug && (
              <button
                type="button"
                onClick={() => navigateTo(`/p/${proSlug}`)}
                className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Abrir página pública exclusiva deste profissional"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Ver Perfil Público (/p/{proSlug})</span>
                <span className="md:hidden">Perfil</span>
                <ExternalLink className="w-3 h-3 text-amber-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FEEDBACK VISUAL DE SUCESSO OU ERRO (GLOBAL DO FORMULÁRIO) */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-emerald-900">
              Disponibilidade Salva com Sucesso!
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-900">
              Por favor, corrija os seguintes itens para continuar:
            </h4>
            <ul className="list-disc list-inside text-xs text-rose-700 space-y-0.5">
              {errors.map((err, idx) => (
                <li key={idx} className="font-medium">
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. FORMULÁRIO PRINCIPAL DE CONFIGURAÇÃO DE DISPONIBILIDADE */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BLOCO A: PERÍODO DE VIGÊNCIA (DATA INÍCIO E DATA FINAL) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h4 className="text-sm font-bold text-slate-900">
                1. Período de Atendimento (Vigência da Escala)
              </h4>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => handleSetQuickPeriod(15)}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                15 dias
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickPeriod(30)}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                30 dias
              </button>
              <button
                type="button"
                onClick={handleSetCurrentMonth}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Mês Atual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data Início */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Data de Início <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border transition-colors focus:outline-none ${
                    getFieldError('startDate')
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 text-slate-900'
                  }`}
                />
              </div>
              {getFieldError('startDate') && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{getFieldError('startDate')}</span>
                </p>
              )}
            </div>

            {/* Data Final */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Data Final <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border transition-colors focus:outline-none ${
                    getFieldError('endDate')
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500'
                      : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 text-slate-900'
                  }`}
                />
              </div>
              {getFieldError('endDate') && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{getFieldError('endDate')}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Regra: <strong>A data final não pode ser menor que a data de início.</strong> Os agendamentos online deste profissional estarão liberados exclusivamente dentro deste período.
            </span>
          </div>
        </div>

        {/* BLOCO B: DIAS DA SEMANA DE ATENDIMENTO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  2. Dias da Semana de Atendimento
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione os dias em que o profissional estará atendendo no período
              </p>
            </div>

            {/* Atalhos rápidos de dias */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Predefinições:</span>
              <button
                type="button"
                onClick={handleSelectWeekdays}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Seg a Sex
              </button>
              <button
                type="button"
                onClick={handleSelectWeekAndSat}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Seg a Sáb
              </button>
              <button
                type="button"
                onClick={handleSelectAllDays}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={handleClearDays}
                className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Grid de botões dos 7 dias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {WEEK_DAYS.map((day) => {
              const isSelected = daysOfWeek.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => handleToggleDay(day.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[72px] ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs ring-1 ring-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">{day.short}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                  </div>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {day.label}
                  </span>
                </button>
              );
            })}
          </div>

          {getFieldError('daysOfWeek') && (
            <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{getFieldError('daysOfWeek')}</span>
            </p>
          )}

          {/* Resumo textual dos dias selecionados */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>
              Dias selecionados ({daysOfWeek.length} de 7):{' '}
              <strong className="text-slate-900">{formatWeekDaysLabel(daysOfWeek)}</strong>
            </span>
          </div>
        </div>

        {/* BLOCO C: HORÁRIOS DE ATENDIMENTO (INÍCIO E FIM) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  3. Horários de Atendimento no Período
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina o início e o término da jornada diária do especialista
              </p>
            </div>

            {/* Turnos rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Turnos Padrão:</span>
              <button
                type="button"
                onClick={() => handleSetQuickHours('09:00', '18:00')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                09h às 18h
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickHours('08:00', '19:00')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                08h às 19h
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickHours('13:00', '21:00')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                13h às 21h
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Horário Início */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Horário de Início do Atendimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full px-3 py-2 text-xs font-mono rounded-xl border transition-colors focus:outline-none ${
                  getFieldError('startTime')
                    ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 text-slate-900'
                }`}
              />
              {getFieldError('startTime') && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{getFieldError('startTime')}</span>
                </p>
              )}
            </div>

            {/* Horário Término */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Horário de Término do Atendimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full px-3 py-2 text-xs font-mono rounded-xl border transition-colors focus:outline-none ${
                  getFieldError('endTime')
                    ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500'
                    : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 text-slate-900'
                }`}
              />
              {getFieldError('endTime') && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{getFieldError('endTime')}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Regra: <strong>O horário de término deve ser posterior ao horário de início.</strong>
              </span>
            </div>
            {dailyHoursCalculation && (
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                {dailyHoursCalculation} por dia
              </span>
            )}
          </div>
        </div>

        {/* BLOCO D: IDENTIFICAÇÃO E STATUS DA DISPONIBILIDADE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Identificação do Período (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Escala Padrão, Plantão de Fim de Ano, Horário Especial..."
                value={periodNotes}
                onChange={(e) => setPeriodNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Status da Disponibilidade
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{isActive ? 'Ativa no Agendamento' : 'Pausada'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* BLOCO E: PRÉVIA DA ESCALA ATIVA */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Prévia da Escala Ativa
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedPro?.name}
                </span>
              </div>
              <h4 className="text-base font-bold text-white">
                {formatWeekDaysLabel(daysOfWeek)} · {startTime} às {endTime}
              </h4>
              <p className="text-xs text-slate-400">
                Vigência configurada: de <strong className="text-slate-200 font-mono">{startDate.split('-').reverse().join('/')}</strong> até <strong className="text-slate-200 font-mono">{endDate.split('-').reverse().join('/')}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações de Disponibilidade</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
