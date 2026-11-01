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
  ChevronUp,
  Info,
  CalendarDays,
  Check,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Play,
  Pause,
  ArrowRight,
  Layers,
  History,
  Timer,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Professional, AvailabilityPeriod, ShiftInterval } from '../../types';
import {
  WEEK_DAYS,
  validateAvailabilityPeriod,
  checkAvailabilityPeriodConflict,
  getPeriodStatus,
  getPeriodCountdown,
  calculatePeriodTotalHours,
  formatWeekDaysLabel,
  AvailabilityValidationError,
  PeriodConflictCheckResult,
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

  // Seleciona o profissional inicial
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

  // Data de referência de hoje (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Períodos cadastrados do profissional selecionado (com fallback e migração retrocompatível)
  const existingPeriods: AvailabilityPeriod[] = useMemo(() => {
    if (!selectedPro) return [];
    if (selectedPro.availabilityPeriods && selectedPro.availabilityPeriods.length > 0) {
      return selectedPro.availabilityPeriods;
    }
    // Migração transparente de availabilityConfig legado se existir
    if (selectedPro.availabilityConfig) {
      const cfg = selectedPro.availabilityConfig;
      const initialShift: ShiftInterval = {
        id: 'shift_init_1',
        startTime: cfg.startTime || '09:00',
        endTime: cfg.endTime || '18:00',
        label: 'Turno Principal',
      };
      return [
        {
          id: cfg.id || `avail_${Date.now()}`,
          title: cfg.title || cfg.notes || 'Escala Padrão Vigente',
          startDate: cfg.startDate || todayStr,
          endDate: cfg.endDate || todayStr,
          daysOfWeek: cfg.daysOfWeek || [1, 2, 3, 4, 5],
          shifts: cfg.shifts && cfg.shifts.length > 0 ? cfg.shifts : [initialShift],
          startTime: cfg.startTime || '09:00',
          endTime: cfg.endTime || '18:00',
          active: cfg.active !== false,
          notes: cfg.notes || '',
          createdAt: cfg.createdAt || new Date().toISOString(),
          updatedAt: cfg.updatedAt || new Date().toISOString(),
        },
      ];
    }
    return [];
  }, [selectedPro, todayStr]);

  // Separação dos períodos por status: Vigente (Atual), Futuros, e Passados (Histórico)
  const { currentPeriods, futurePeriods, pastPeriods } = useMemo(() => {
    const current: AvailabilityPeriod[] = [];
    const future: AvailabilityPeriod[] = [];
    const past: AvailabilityPeriod[] = [];

    existingPeriods.forEach((period) => {
      const status = getPeriodStatus(period, todayStr);
      if (status === 'current') {
        current.push(period);
      } else if (status === 'future') {
        future.push(period);
      } else {
        past.push(period);
      }
    });

    // Ordenação cronológica
    future.sort((a, b) => a.startDate.localeCompare(b.startDate));
    past.sort((a, b) => b.endDate.localeCompare(a.endDate)); // Passados mais recentes primeiro

    return { currentPeriods: current, futurePeriods: future, pastPeriods: past };
  }, [existingPeriods, todayStr]);

  // Controle de estado do formulário
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Campos do formulário
  const [periodTitle, setPeriodTitle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6); // Próximos 7 dias por padrão
    return d.toISOString().split('T')[0];
  });
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Seg a Sex padrão
  const [shifts, setShifts] = useState<ShiftInterval[]>([
    { id: '1', startTime: '08:00', endTime: '12:00', label: '1º Turno (Manhã)' },
    { id: '2', startTime: '14:00', endTime: '18:00', label: '2º Turno (Tarde)' },
  ]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Feedbacks visuais
  const [validationErrors, setValidationErrors] = useState<AvailabilityValidationError[]>([]);
  const [conflictWarning, setConflictWarning] = useState<PeriodConflictCheckResult | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Redefine o formulário para um novo período
  const handleResetFormToNew = () => {
    setEditingPeriodId(null);
    setPeriodTitle('');
    setStartDate(todayStr);
    const d = new Date();
    d.setDate(d.getDate() + 6);
    setEndDate(d.toISOString().split('T')[0]);
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setShifts([
      { id: `shift_${Date.now()}_1`, startTime: '08:00', endTime: '12:00', label: '1º Turno (Manhã)' },
      { id: `shift_${Date.now()}_2`, startTime: '14:00', endTime: '18:00', label: '2º Turno (Tarde)' },
    ]);
    setIsActive(true);
    setNotes('');
    setValidationErrors([]);
    setConflictWarning(null);
    setHasSubmitted(false);
  };

  // Carrega período para edição
  const handleEditPeriod = (period: AvailabilityPeriod) => {
    setEditingPeriodId(period.id);
    setPeriodTitle(period.title || '');
    setStartDate(period.startDate);
    setEndDate(period.endDate);
    setDaysOfWeek(period.daysOfWeek);
    if (period.shifts && period.shifts.length > 0) {
      setShifts(period.shifts);
    } else if (period.startTime && period.endTime) {
      setShifts([
        {
          id: 'shift_legacy_1',
          startTime: period.startTime,
          endTime: period.endTime,
          label: 'Turno Principal',
        },
      ]);
    }
    setIsActive(period.active !== false);
    setNotes(period.notes || '');
    setIsFormOpen(true);
    setValidationErrors([]);
    setConflictWarning(null);
    setHasSubmitted(false);

    // Scroll suave até o formulário
    const formElement = document.getElementById('availability-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Atalho inteligente: Duplica um período para a semana seguinte (+7 dias)
  const handleDuplicateToNextWeek = (period: AvailabilityPeriod) => {
    const [sY, sM, sD] = period.startDate.split('-').map(Number);
    const [eY, eM, eD] = period.endDate.split('-').map(Number);

    const newStart = new Date(sY, sM - 1, sD);
    newStart.setDate(newStart.getDate() + 7);

    const newEnd = new Date(eY, eM - 1, eD);
    newEnd.setDate(newEnd.getDate() + 7);

    const newStartStr = newStart.toISOString().split('T')[0];
    const newEndStr = newEnd.toISOString().split('T')[0];

    setEditingPeriodId(null);
    setPeriodTitle(`Escala Semana Seguinte (${newStartStr.split('-').reverse().slice(0, 2).join('/')})`);
    setStartDate(newStartStr);
    setEndDate(newEndStr);
    setDaysOfWeek([...period.daysOfWeek]);
    setShifts(
      (period.shifts || []).map((s, idx) => ({
        ...s,
        id: `dup_${Date.now()}_${idx}`,
      }))
    );
    setIsActive(true);
    setNotes(`Replicado a partir da escala ${period.title || 'anterior'}`);
    setIsFormOpen(true);
    setValidationErrors([]);
    setConflictWarning(null);

    const formElement = document.getElementById('availability-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Manipulação de turnos
  const handleAddShift = () => {
    const lastShift = shifts[shifts.length - 1];
    let newStart = '14:00';
    let newEnd = '18:00';

    if (lastShift && lastShift.endTime) {
      const [endH] = lastShift.endTime.split(':').map(Number);
      const nextStartH = Math.min(20, endH + 1);
      const nextEndH = Math.min(22, nextStartH + 4);
      newStart = `${String(nextStartH).padStart(2, '0')}:00`;
      newEnd = `${String(nextEndH).padStart(2, '0')}:00`;
    }

    const shiftNum = shifts.length + 1;
    const newShift: ShiftInterval = {
      id: `shift_${Date.now()}`,
      startTime: newStart,
      endTime: newEnd,
      label: `${shiftNum}º Turno`,
    };

    setShifts([...shifts, newShift]);
  };

  const handleRemoveShift = (index: number) => {
    if (shifts.length <= 1) return;
    const updated = shifts.filter((_, i) => i !== index);
    setShifts(updated);
  };

  const handleUpdateShift = (index: number, field: keyof ShiftInterval, val: string) => {
    setShifts((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: val } : s))
    );
  };

  // Toggle de dias da semana
  const handleToggleDay = (dayId: number) => {
    setDaysOfWeek((prev) => {
      const exists = prev.includes(dayId);
      const updated = exists ? prev.filter((d) => d !== dayId) : [...prev, dayId];
      return updated.sort((a, b) => a - b);
    });
  };

  // Atalhos de dias
  const handleSelectWeekdays = () => setDaysOfWeek([1, 2, 3, 4, 5]); // Seg a Sex
  const handleSelectWeekAndSat = () => setDaysOfWeek([1, 2, 3, 4, 5, 6]); // Seg a Sáb
  const handleSelectWeekend = () => setDaysOfWeek([0, 6]); // Sáb e Dom
  const handleSelectAllDays = () => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);

  // Atalhos de períodos de datas
  const handleSetThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(saturday.toISOString().split('T')[0]);
    setPeriodTitle('Escala Desta Semana');
  };

  const handleSetNextWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day) + 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(saturday.toISOString().split('T')[0]);
    setPeriodTitle('Escala da Próxima Semana');
  };

  const handleSetCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    setPeriodTitle(`Mês ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
  };

  const handleSetQuickDays = (days: number) => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days - 1);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setPeriodTitle(`Jornada dos Próximos ${days} Dias`);
  };

  // Presets de turnos rápidos
  const handleApplyShiftPreset = (preset: 'two_shifts' | 'single_shift' | 'morning' | 'afternoon_night') => {
    if (preset === 'two_shifts') {
      setShifts([
        { id: `shift_${Date.now()}_1`, startTime: '08:00', endTime: '12:00', label: '1º Turno (Manhã)' },
        { id: `shift_${Date.now()}_2`, startTime: '14:00', endTime: '18:00', label: '2º Turno (Tarde)' },
      ]);
    } else if (preset === 'single_shift') {
      setShifts([
        { id: `shift_${Date.now()}_1`, startTime: '09:00', endTime: '18:00', label: 'Turno Contínuo' },
      ]);
    } else if (preset === 'morning') {
      setShifts([
        { id: `shift_${Date.now()}_1`, startTime: '08:00', endTime: '13:00', label: 'Turno Matutino' },
      ]);
    } else if (preset === 'afternoon_night') {
      setShifts([
        { id: `shift_${Date.now()}_1`, startTime: '14:00', endTime: '21:00', label: 'Turno Tarde/Noite' },
      ]);
    }
  };

  // Verificação de conflito em tempo real
  const currentConflictCheck = useMemo(() => {
    if (!startDate || !endDate || daysOfWeek.length === 0 || shifts.length === 0) {
      return { hasConflict: false };
    }

    return checkAvailabilityPeriodConflict({
      period: {
        id: editingPeriodId || undefined,
        startDate,
        endDate,
        daysOfWeek,
        shifts,
      },
      existingPeriods,
      excludePeriodId: editingPeriodId || undefined,
    });
  }, [startDate, endDate, daysOfWeek, shifts, existingPeriods, editingPeriodId]);

  // Carga horária calculada para o formulário
  const totalDailyHours = useMemo(() => {
    return calculatePeriodTotalHours(shifts);
  }, [shifts]);

  // Submissão do formulário (Criação ou Edição de Período)
  const handleSubmitPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setSuccessFeedback(null);

    // 1. Validação de campos e regras do período
    const val = validateAvailabilityPeriod({
      startDate,
      endDate,
      daysOfWeek,
      shifts,
    });

    if (!val.isValid) {
      setValidationErrors(val.errors);
      return;
    }

    // 2. Validação contra conflitos e sobreposições de períodos existentes
    const conflict = checkAvailabilityPeriodConflict({
      period: {
        id: editingPeriodId || undefined,
        startDate,
        endDate,
        daysOfWeek,
        shifts,
      },
      existingPeriods,
      excludePeriodId: editingPeriodId || undefined,
    });

    if (conflict.hasConflict) {
      setConflictWarning(conflict);
      return;
    }

    if (!selectedPro) {
      setValidationErrors([{ field: 'general', message: 'Nenhum profissional selecionado.' }]);
      return;
    }

    const defaultTitle = `Escala ${startDate.split('-').reverse().slice(0, 2).join('/')} a ${endDate.split('-').reverse().slice(0, 2).join('/')}`;

    // Monta o período atualizado/novo
    const targetPeriod: AvailabilityPeriod = {
      id: editingPeriodId || `avail_period_${Date.now()}`,
      professionalId: selectedPro.id,
      businessId: currentBusiness?.id,
      tenant_id: currentBusiness?.tenant_id || currentBusiness?.id,
      title: periodTitle.trim() || defaultTitle,
      startDate,
      endDate,
      daysOfWeek,
      shifts,
      startTime: shifts[0]?.startTime || '09:00',
      endTime: shifts[shifts.length - 1]?.endTime || '18:00',
      active: isActive,
      notes: notes.trim(),
      createdAt: editingPeriodId
        ? existingPeriods.find((p) => p.id === editingPeriodId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Atualiza a lista completa de períodos sem sobrescrever o histórico
    let updatedPeriodsList: AvailabilityPeriod[];
    if (editingPeriodId) {
      updatedPeriodsList = existingPeriods.map((p) => (p.id === editingPeriodId ? targetPeriod : p));
    } else {
      updatedPeriodsList = [...existingPeriods, targetPeriod];
    }

    // Identifica o período em vigor (ou o primeiro ativo) para manter retrocompatibilidade com availabilityConfig e workHours
    const activeCurrentPeriod =
      updatedPeriodsList.find((p) => p.active && getPeriodStatus(p, todayStr) === 'current') ||
      updatedPeriodsList.find((p) => p.active) ||
      targetPeriod;

    const primaryShift = activeCurrentPeriod.shifts?.[0] || {
      startTime: activeCurrentPeriod.startTime || '09:00',
      endTime: activeCurrentPeriod.endTime || '18:00',
    };

    const updatedPro: Professional = {
      ...selectedPro,
      availabilityPeriods: updatedPeriodsList,
      availabilityConfig: activeCurrentPeriod,
      workHours: {
        start: primaryShift.startTime,
        end: activeCurrentPeriod.shifts?.[activeCurrentPeriod.shifts.length - 1]?.endTime || primaryShift.endTime,
        daysOfWeek: activeCurrentPeriod.daysOfWeek || selectedPro.workHours.daysOfWeek,
      },
    };

    updateProfessional(updatedPro);

    const isEdit = !!editingPeriodId;
    const msg = isEdit
      ? `Período "${targetPeriod.title}" atualizado com sucesso!`
      : `Novo período "${targetPeriod.title}" cadastrado com sucesso!`;

    setSuccessFeedback(msg);
    setValidationErrors([]);
    setConflictWarning(null);
    setHasSubmitted(false);
    setIsFormOpen(false);
    handleResetFormToNew();

    addNotification({
      title: 'Disponibilidade Atualizada',
      message: `${selectedPro.name}: ${msg}`,
      type: 'system',
    });

    if (onSaved) {
      onSaved(updatedPro);
    }

    setTimeout(() => {
      setSuccessFeedback(null);
    }, 6000);
  };

  // Alternar status ativo/pausado de um período específico da lista
  const handleTogglePeriodActive = (periodId: string) => {
    if (!selectedPro) return;

    const updatedList = existingPeriods.map((p) =>
      p.id === periodId ? { ...p, active: !p.active, updatedAt: new Date().toISOString() } : p
    );

    const activeCurrentPeriod =
      updatedList.find((p) => p.active && getPeriodStatus(p, todayStr) === 'current') ||
      updatedList.find((p) => p.active);

    const updatedPro: Professional = {
      ...selectedPro,
      availabilityPeriods: updatedList,
      availabilityConfig: activeCurrentPeriod || selectedPro.availabilityConfig,
    };

    updateProfessional(updatedPro);

    addNotification({
      title: 'Status do Período Alterado',
      message: `A disponibilidade do período foi atualizada para ${selectedPro.name}.`,
      type: 'system',
    });
  };

  // Excluir um período específico
  const handleDeletePeriod = (periodId: string) => {
    if (!selectedPro) return;
    const period = existingPeriods.find((p) => p.id === periodId);
    const confirmDelete = window.confirm(
      `Deseja realmente remover o período "${period?.title || 'Selecionado'}"? Esta ação removerá as escalas cadastradas para estas datas.`
    );
    if (!confirmDelete) return;

    const updatedList = existingPeriods.filter((p) => p.id !== periodId);

    const activeCurrentPeriod =
      updatedList.find((p) => p.active && getPeriodStatus(p, todayStr) === 'current') ||
      updatedList.find((p) => p.active);

    const updatedPro: Professional = {
      ...selectedPro,
      availabilityPeriods: updatedList,
      availabilityConfig: activeCurrentPeriod,
    };

    updateProfessional(updatedPro);

    if (editingPeriodId === periodId) {
      handleResetFormToNew();
      setIsFormOpen(false);
    }

    addNotification({
      title: 'Período Removido',
      message: `O período de disponibilidade foi removido de ${selectedPro.name}.`,
      type: 'system',
    });
  };

  if (!selectedPro && activeProfessionals.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
        <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Nenhum profissional cadastrado</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Cadastre profissionais na aba &quot;Equipe &amp; Profissionais&quot; para configurar escalas e jornadas flexíveis.
        </p>
      </div>
    );
  }

  const proSlug = selectedPro?.slug || (selectedPro ? slugify(selectedPro.name) : '');

  return (
    <div className="space-y-6">
      {/* 1. SELETOR E CABEÇALHO DO PROFISSIONAL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedPro?.avatar ? (
              <img
                src={selectedPro.avatar}
                alt={selectedPro.name}
                className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <User className="w-7 h-7" />
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
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>{currentBusiness?.tradeName}</span>
                <span>·</span>
                <span>{selectedPro?.specialties.join(', ')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            {/* Se houver mais de 1 profissional, permite alternar */}
            {activeProfessionals.length > 1 && (
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={selectedProId}
                  onChange={(e) => {
                    setSelectedProId(e.target.value);
                    handleResetFormToNew();
                    setIsFormOpen(false);
                  }}
                  className="w-full sm:w-auto pl-3 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer transition-colors"
                >
                  {activeProfessionals.map((pro) => (
                    <option key={pro.id} value={pro.id}>
                      Especialista: {pro.name}
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
                title="Abrir página pública de agendamento online deste especialista"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Perfil Online (/p/{proSlug})</span>
                <span className="md:hidden">Perfil</span>
                <ExternalLink className="w-3 h-3 text-amber-600" />
              </button>
            )}

            {/* Botão de Novo Período */}
            <button
              type="button"
              onClick={() => {
                handleResetFormToNew();
                setIsFormOpen(true);
                const formElement = document.getElementById('availability-form-section');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Novo Período de Atendimento</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MENSAGEM DE SUCESSO GLOBAL */}
      {successFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-emerald-900">Operação Realizada com Sucesso!</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">{successFeedback}</p>
          </div>
        </div>
      )}

      {/* 3. PERÍODO EM VIGOR DESTACADO (DESTAQUE PRINCIPAL / HERO) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Período de Atendimento em Vigor (Atual)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Hoje: {todayStr.split('-').reverse().join('/')}
          </span>
        </div>

        {currentPeriods.length > 0 ? (
          <div className="space-y-3">
            {currentPeriods.map((period) => {
              const countdown = getPeriodCountdown(period, todayStr);
              const hoursInfo = calculatePeriodTotalHours(period.shifts || []);

              return (
                <div
                  key={period.id}
                  className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white border-2 border-emerald-500/40 shadow-md"
                >
                  {/* Glowing backdrop effect */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="space-y-3 flex-1">
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>EM VIGOR HOJE (PERÍODO ATUAL)</span>
                        </span>

                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10">
                          {countdown.label}
                        </span>

                        {period.active ? (
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Agendamentos Abertos</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pausado Temporariamente</span>
                          </span>
                        )}
                      </div>

                      {/* Título & Vigência */}
                      <div>
                        <h4 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <span>{period.title || 'Escala Regular Vigente'}</span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                          <span>
                            Vigência: <strong className="text-emerald-300 font-mono">{period.startDate.split('-').reverse().join('/')}</strong> até <strong className="text-emerald-300 font-mono">{period.endDate.split('-').reverse().join('/')}</strong>
                          </span>
                          <span>·</span>
                          <span className="text-slate-300 font-medium">
                            Dias: <strong className="text-white">{formatWeekDaysLabel(period.daysOfWeek)}</strong>
                          </span>
                        </p>
                      </div>

                      {/* Turnos de Atendimento */}
                      <div className="pt-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                          Turnos de Atendimento ({period.shifts?.length || 1} {period.shifts?.length === 1 ? 'turno' : 'turnos'} · {hoursInfo.formatted}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(period.shifts && period.shifts.length > 0
                            ? period.shifts
                            : [{ id: '1', startTime: period.startTime || '09:00', endTime: period.endTime || '18:00', label: 'Turno Principal' }]
                          ).map((shift, idx) => (
                            <div
                              key={shift.id || idx}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-xs rounded-xl border border-white/15 text-xs text-white font-mono flex items-center gap-2"
                            >
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-bold text-emerald-200">
                                {shift.startTime} às {shift.endTime}
                              </span>
                              {shift.label && (
                                <span className="text-[10px] text-slate-300 font-sans font-medium px-1.5 py-0.5 rounded bg-black/30">
                                  {shift.label}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {period.notes && (
                        <p className="text-xs text-slate-400 italic pt-1">
                          Nota: {period.notes}
                        </p>
                      )}
                    </div>

                    {/* Ações Rápidas no Período Vigente */}
                    <div className="flex flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5">
                      <button
                        type="button"
                        onClick={() => handleEditPeriod(period)}
                        className="flex-1 lg:flex-initial px-4 py-2 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-900" />
                        <span>Editar Período</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateToNextWeek(period)}
                        className="flex-1 lg:flex-initial px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        title="Criar escala para a próxima semana replicando este período"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Replicar p/ Próx. Semana</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePeriodActive(period.id)}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {period.active ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pausar Escala</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ativar Escala</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-bold text-slate-800">
                Nenhum período de disponibilidade configurado para hoje
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                O profissional está atendendo com base no horário padrão (
                {selectedPro?.workHours.start} às {selectedPro?.workHours.end}). Cadastre um período específico para definir turnos e datas personalizadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSetThisWeek();
                setIsFormOpen(true);
                const formElement = document.getElementById('availability-form-section');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Configurar Período para Esta Semana</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. PERÍODOS CADASTRADOS FUTUROS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Períodos Futuros Cadastrados ({futurePeriods.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Escalas programadas para as próximas semanas
          </span>
        </div>

        {futurePeriods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {futurePeriods.map((period) => {
              const countdown = getPeriodCountdown(period, todayStr);
              const hoursInfo = calculatePeriodTotalHours(period.shifts || []);

              return (
                <div
                  key={period.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🔵 {countdown.label}
                          </span>
                          {!period.active && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              Pausado
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">
                          {period.title || 'Escala Futura'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditPeriod(period)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar este período"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateToNextWeek(period)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Duplicar para a semana seguinte"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePeriod(period.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover período"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Datas & Dias */}
                    <div className="text-xs text-slate-600 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          De <strong className="font-mono text-slate-900">{period.startDate.split('-').reverse().join('/')}</strong> até <strong className="font-mono text-slate-900">{period.endDate.split('-').reverse().join('/')}</strong>
                        </span>
                      </p>
                      <p className="text-slate-500 text-[11px] pl-5">
                        Dias: <strong className="text-slate-700">{formatWeekDaysLabel(period.daysOfWeek)}</strong>
                      </p>
                    </div>

                    {/* Turnos */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Turnos ({hoursInfo.formatted}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(period.shifts && period.shifts.length > 0
                          ? period.shifts
                          : [{ id: '1', startTime: period.startTime || '09:00', endTime: period.endTime || '18:00', label: 'Turno Principal' }]
                        ).map((s, idx) => (
                          <span
                            key={s.id || idx}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 flex items-center gap-1.5"
                          >
                            <Clock className="w-3 h-3 text-blue-500" />
                            <strong>{s.startTime} às {s.endTime}</strong>
                            {s.label && <span className="text-[10px] text-slate-400 font-sans">({s.label})</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {period.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        {period.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">
                      Criado em {new Date(period.createdAt || '').toLocaleDateString('pt-BR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePeriodActive(period.id)}
                      className={`font-semibold cursor-pointer ${
                        period.active ? 'text-amber-600 hover:underline' : 'text-emerald-600 hover:underline'
                      }`}
                    >
                      {period.active ? 'Pausar este período' : 'Ativar este período'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            <p>Nenhuma escala futura cadastrada ainda.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Você pode cadastrar com antecedência a escala da próxima semana sem alterar a jornada atual.
            </p>
          </div>
        )}
      </div>

      {/* 5. FORMULÁRIO DE CADASTRO OU EDIÇÃO DE PERÍODO (COMPONENTE PRINCIPAL) */}
      <div id="availability-form-section" className="scroll-mt-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Header do Formulário com toggle */}
          <div
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="p-5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
                {editingPeriodId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {editingPeriodId ? 'Editar Período de Atendimento' : 'Cadastrar Novo Período de Atendimento'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingPeriodId
                    ? 'Altere datas, turnos ou dias da semana deste período específico'
                    : 'Configure flexivelmente datas, turnos e dias da semana sem sobrescrever o passado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
                {isFormOpen ? 'Recolher Formulário' : 'Expandir Formulário'}
              </span>
              {isFormOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </div>

          {/* Corpo do Formulário */}
          {isFormOpen && (
            <form onSubmit={handleSubmitPeriod} className="p-6 space-y-6">
              {/* Alerta de Conflito em Tempo Real */}
              {conflictWarning?.hasConflict && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900">
                      Atenção: Conflito de Horário Detectado
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {conflictWarning.message}
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Dica: Ajuste as datas ou os turnos para evitar jornadas sobrepostas para o mesmo especialista.
                    </p>
                  </div>
                </div>
              )}

              {/* Erros de Validação */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-900">
                      Corrija os seguintes campos para salvar:
                    </h4>
                    <ul className="list-disc list-inside text-xs text-rose-700 space-y-0.5">
                      {validationErrors.map((err, idx) => (
                        <li key={idx} className="font-medium">
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* A. IDENTIFICAÇÃO DO PERÍODO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Identificação da Escala
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome / Título do Período (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Semana 44 - Turno Normal, Plantão Fim de Ano, Jornada Reduzida..."
                      value={periodTitle}
                      onChange={(e) => setPeriodTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:border-slate-400 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Status no Agendamento
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
                        className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{isActive ? 'Ativo na Agenda' : 'Pausado'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* B. INTERVALO DE DATAS (INICIAL E FINAL) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-700" />
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      1. Intervalo de Datas (Vigência)
                    </h5>
                  </div>
                  {/* Atalhos rápidos de datas */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={handleSetThisWeek}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Esta Semana
                    </button>
                    <button
                      type="button"
                      onClick={handleSetNextWeek}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Próxima Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDays(15)}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      15 dias
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
                  {/* Data Inicial */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Data Inicial <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 text-slate-900 transition-colors"
                    />
                  </div>

                  {/* Data Final */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Data Final <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-500 text-slate-900 transition-colors"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Regra: <strong>A data final deve ser igual ou posterior à data de início.</strong> O profissional atenderá dentro desta janela sem alterar seus agendamentos passados.
                  </span>
                </div>
              </div>

              {/* C. DIAS DA SEMANA */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-700" />
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        2. Dias da Semana de Atendimento
                      </h5>
                    </div>
                  </div>

                  {/* Atalhos de dias */}
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                      onClick={handleSelectWeekend}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Finais de Semana
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllDays}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Todos
                    </button>
                  </div>
                </div>

                {/* Grid dos 7 dias */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = daysOfWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => handleToggleDay(day.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[68px] ${
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

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span>
                    Dias selecionados: <strong className="text-slate-900">{formatWeekDaysLabel(daysOfWeek)}</strong>
                  </span>
                </div>
              </div>

              {/* D. HORÁRIOS DE EXPEDIENTE & MÚLTIPLOS TURNOS */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        3. Horários de Expediente (Turnos de Atendimento)
                      </h5>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Defina o horário de início e fim. Adicione um segundo turno (ex: intervalo de almoço)
                    </p>
                  </div>

                  {/* Presets de turnos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">Modelos:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyShiftPreset('two_shifts')}
                      className="px-2 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                      title="08h às 12h e 14h às 18h"
                    >
                      Dois Turnos (08-12h / 14-18h)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyShiftPreset('single_shift')}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="09h às 18h"
                    >
                      Turno Contínuo (09-18h)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyShiftPreset('afternoon_night')}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="14h às 21h"
                    >
                      Tarde/Noite (14-21h)
                    </button>
                  </div>
                </div>

                {/* Lista dinâmica de turnos */}
                <div className="space-y-3">
                  {shifts.map((shift, index) => (
                    <div
                      key={shift.id || index}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span>{shift.label || `Turno ${index + 1}`}</span>
                        </span>

                        {shifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveShift(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                            title="Remover este turno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover Turno</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Horário Início */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Início do Turno <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={shift.startTime}
                            onChange={(e) => handleUpdateShift(index, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:border-slate-500 text-slate-900"
                          />
                        </div>

                        {/* Horário Término */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Término do Turno <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="time"
                            required
                            value={shift.endTime}
                            onChange={(e) => handleUpdateShift(index, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:border-slate-500 text-slate-900"
                          />
                        </div>

                        {/* Rótulo do Turno */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Rótulo / Identificação
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Manhã, Tarde, Plantão..."
                            value={shift.label || ''}
                            onChange={(e) => handleUpdateShift(index, 'label', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-slate-500 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Botão para Adicionar Múltiplos Turnos */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleAddShift}
                      className="px-3.5 py-2 border border-dashed border-slate-300 hover:border-slate-500 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                      <span>+ Adicionar Segundo Turno (ex: 14h às 18h)</span>
                    </button>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Carga horária diária deste período:{' '}
                        <strong className="text-slate-900 font-mono">{totalDailyHours.formatted}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BARRA DE AÇÃO DO FORMULÁRIO */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {editingPeriodId && (
                    <button
                      type="button"
                      onClick={handleResetFormToNew}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Fechar Formulário
                  </button>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingPeriodId ? 'Salvar Alterações no Período' : 'Adicionar Período de Atendimento'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 6. HISTÓRICO DE PERÍODOS PASSADOS / ENCERRADOS (RECOLHÍVEL) */}
      {pastPeriods.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-slate-500" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Histórico de Períodos Passados ({pastPeriods.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Escalas anteriores mantidas intactas para registro histórico e relatórios
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {showHistory ? 'Ocultar' : 'Visualizar'}
              </span>
              {showHistory ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {showHistory && (
            <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pastPeriods.map((period) => (
                  <div
                    key={period.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2 opacity-85 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-slate-900 truncate">
                        {period.title || 'Escala Passada'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono shrink-0">
                        Encerrado
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-mono">
                      {period.startDate.split('-').reverse().join('/')} até {period.endDate.split('-').reverse().join('/')}
                    </p>

                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-600 font-mono">
                      {(period.shifts || []).map((s, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100">
                          {s.startTime}-{s.endTime}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleDuplicateToNextWeek(period)}
                        className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        title="Replicar este modelo para a próxima semana"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Reaproveitar Modelo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePeriod(period.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Excluir do histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
