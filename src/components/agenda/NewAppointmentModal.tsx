import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  Phone,
  UserCheck,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/date';
import { checkAppointmentConflict, timeToMinutes, minutesToTime } from '../../utils/availability';
import { MaskedInput } from '../ui/MaskedInput';
import { maskCurrency } from '../../utils/masks';
import { findDuplicateClientByPhone } from '../../utils/clientValidation';

interface DraftServiceItem {
  rowId: string;
  serviceId: string;
  professionalId: string;
}

export const NewAppointmentModal: React.FC = () => {
  const {
    isNewAppointmentModalOpen,
    setIsNewAppointmentModalOpen,
    newAppointmentInitialSlot,
    setNewAppointmentInitialSlot,
    activeServices,
    activeProfessionals,
    activeClients,
    activeAppointments,
    addMultiServiceAppointment,
    addClient,
    currentBusiness,
    currentRole,
    currentProfessional,
  } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);

  const [serviceItems, setServiceItems] = useState<DraftServiceItem[]>([]);
  const [serviceFilterText, setServiceFilterText] = useState('');
  const [date, setDate] = useState<string>(getTodayDateString);
  const [startTime, setStartTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string>('');

  // Helper: profissionais habilitados para um serviço
  const getAllowedProfessionals = (srvId: string) => {
    const srv = activeServices.find((s) => s.id === srvId);
    if (!srv || !srv.allowedProfessionalIds || srv.allowedProfessionalIds.length === 0) {
      return activeProfessionals;
    }
    const filtered = activeProfessionals.filter((p) => srv.allowedProfessionalIds.includes(p.id));
    return filtered.length > 0 ? filtered : activeProfessionals;
  };

  // Sync initial slot & default first row when modal opens
  useEffect(() => {
    if (!isNewAppointmentModalOpen) return;

    if (newAppointmentInitialSlot?.date) {
      setDate(newAppointmentInitialSlot.date);
    } else {
      setDate(getTodayDateString());
    }

    if (newAppointmentInitialSlot?.startTime) {
      setStartTime(newAppointmentInitialSlot.startTime);
    } else {
      setStartTime('11:00');
    }

    const preferredProId =
      newAppointmentInitialSlot?.professionalId ||
      (currentRole === 'profissional' && currentProfessional ? currentProfessional.id : '') ||
      activeProfessionals[0]?.id ||
      '';

    // Escolhe o primeiro serviço compatível com o profissional inicial, se possível
    const compatibleService =
      activeServices.find(
        (s) =>
          !s.allowedProfessionalIds ||
          s.allowedProfessionalIds.length === 0 ||
          s.allowedProfessionalIds.includes(preferredProId)
      ) || activeServices[0];

    const initialServiceId = compatibleService?.id || '';
    const allowedForInitial = getAllowedProfessionals(initialServiceId);
    const resolvedInitialProId = allowedForInitial.some((p) => p.id === preferredProId)
      ? preferredProId
      : allowedForInitial[0]?.id || preferredProId;

    setServiceItems((prev) => {
      if (prev.length > 0 && !newAppointmentInitialSlot?.professionalId) {
        return prev;
      }
      return [
        {
          rowId: `row_${Date.now()}`,
          serviceId: initialServiceId,
          professionalId: resolvedInitialProId,
        },
      ];
    });
  }, [
    isNewAppointmentModalOpen,
    newAppointmentInitialSlot,
    activeServices,
    activeProfessionals,
    currentRole,
    currentProfessional,
  ]);

  const handleClose = () => {
    setIsNewAppointmentModalOpen(false);
    setNewAppointmentInitialSlot(null);
    setSelectedClientId('');
    setNewClientName('');
    setNewClientPhone('');
    setIsCreatingNewClient(false);
    setServiceItems([]);
    setServiceFilterText('');
    setNotes('');
    setFormError('');
  };

  // Identificação do cliente selecionado ou em digitação
  const resolvedClient = useMemo(() => {
    if (isCreatingNewClient || !selectedClientId) {
      return {
        id: undefined,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
      };
    }
    const existing = activeClients.find((c) => c.id === selectedClientId);
    return {
      id: existing?.id,
      name: existing?.name || '',
      phone: existing?.phone || '',
      email: existing?.email || '',
    };
  }, [isCreatingNewClient, selectedClientId, newClientName, newClientPhone, activeClients]);

  // Verificação em tempo real de telefone duplicado no "Novo cliente rápido"
  const duplicateClientByPhone = useMemo(() => {
    if (!isCreatingNewClient || !newClientPhone) return null;
    return findDuplicateClientByPhone(activeClients, newClientPhone);
  }, [isCreatingNewClient, newClientPhone, activeClients]);

  // Cálculo sequencial contínuo + validação de conflito por etapa
  const computedSteps = useMemo(() => {
    let cursorMin = timeToMinutes(startTime || '11:00');

    return serviceItems.map((row, idx) => {
      const srv = activeServices.find((s) => s.id === row.serviceId);
      const allowedPros = getAllowedProfessionals(row.serviceId);
      const pro =
        allowedPros.find((p) => p.id === row.professionalId) ||
        activeProfessionals.find((p) => p.id === row.professionalId) ||
        allowedPros[0];

      const duration = srv?.durationMinutes || 45;
      const stepStart = minutesToTime(cursorMin);
      const stepEnd = minutesToTime(cursorMin + duration);
      cursorMin += duration;

      const conflict =
        date && stepStart && stepEnd && pro?.id
          ? checkAppointmentConflict({
              appointments: activeAppointments,
              professionals: activeProfessionals,
              date,
              startTime: stepStart,
              endTime: stepEnd,
              professionalId: pro.id,
              client: resolvedClient,
            })
          : null;

      const commissionPct = srv?.commissionPercentage ?? pro?.commissionPercentage ?? 40;
      const price = srv?.price || 0;
      const commissionValue = (price * commissionPct) / 100;

      return {
        ...row,
        index: idx + 1,
        service: srv,
        professional: pro,
        allowedPros,
        duration,
        stepStart,
        stepEnd,
        price,
        commissionPct,
        commissionValue,
        conflict: conflict?.hasConflict ? conflict : null,
      };
    });
  }, [
    serviceItems,
    startTime,
    date,
    activeServices,
    activeProfessionals,
    activeAppointments,
    resolvedClient,
  ]);

  const summary = useMemo(() => {
    const totalPrice = computedSteps.reduce((acc, s) => acc + s.price, 0);
    const totalDuration = computedSteps.reduce((acc, s) => acc + s.duration, 0);
    const totalCommission = computedSteps.reduce((acc, s) => acc + s.commissionValue, 0);
    const finalEndTime =
      computedSteps.length > 0 ? computedSteps[computedSteps.length - 1].stepEnd : startTime;
    const distinctProsCount = new Set(
      computedSteps.map((s) => s.professional?.id).filter(Boolean)
    ).size;
    const firstConflict = computedSteps.find((s) => s.conflict !== null) || null;

    return {
      totalPrice,
      totalDuration,
      totalCommission,
      finalEndTime,
      distinctProsCount,
      firstConflict,
    };
  }, [computedSteps, startTime]);

  // Manipulação da lista de serviços
  const handleAddServiceRow = () => {
    if (activeServices.length === 0) return;

    // Tenta sugerir um serviço ainda não adicionado na lista
    const usedIds = new Set(serviceItems.map((it) => it.serviceId));
    const nextService =
      activeServices.find((s) => !usedIds.has(s.id)) || activeServices[0];

    const allowedForNext = getAllowedProfessionals(nextService.id);
    const lastProId = serviceItems[serviceItems.length - 1]?.professionalId;
    const defaultProId = allowedForNext.some((p) => p.id === lastProId)
      ? lastProId
      : allowedForNext[0]?.id || activeProfessionals[0]?.id || '';

    setServiceItems((prev) => [
      ...prev,
      {
        rowId: `row_${Date.now()}_${prev.length}`,
        serviceId: nextService.id,
        professionalId: defaultProId,
      },
    ]);
    if (formError) setFormError('');
  };

  const handleRemoveServiceRow = (rowId: string) => {
    if (serviceItems.length <= 1) return;
    setServiceItems((prev) => prev.filter((r) => r.rowId !== rowId));
    if (formError) setFormError('');
  };

  const handleMoveServiceRow = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= serviceItems.length) return;
    setServiceItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleChangeRowService = (rowId: string, newServiceId: string) => {
    const allowedPros = getAllowedProfessionals(newServiceId);
    setServiceItems((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        const keepsPro = allowedPros.some((p) => p.id === row.professionalId);
        return {
          ...row,
          serviceId: newServiceId,
          professionalId: keepsPro ? row.professionalId : allowedPros[0]?.id || '',
        };
      })
    );
    if (formError) setFormError('');
  };

  const handleChangeRowProfessional = (rowId: string, newProId: string) => {
    setServiceItems((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, professionalId: newProId } : row))
    );
    if (formError) setFormError('');
  };

  // Serviços filtrados pelo campo opcional de busca rápida
  const filteredServicesForDropdown = useMemo(() => {
    const q = serviceFilterText.trim().toLowerCase();
    if (!q) return activeServices;
    return activeServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
    );
  }, [activeServices, serviceFilterText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentBusiness) {
      setFormError('Cadastre um estabelecimento antes de criar agendamentos.');
      return;
    }

    let clientName = '';
    let clientPhone = '';
    let clientEmail = '';
    let clientId = selectedClientId;

    if (isCreatingNewClient) {
      if (!newClientName.trim() || !newClientPhone.trim()) {
        setFormError('Por favor informe o nome e telefone do cliente.');
        return;
      }

      const existingClientWithPhone = findDuplicateClientByPhone(activeClients, newClientPhone);
      if (existingClientWithPhone) {
        setFormError(
          `Não é possível concluir o cadastro: O telefone informado já está cadastrado para o cliente "${existingClientWithPhone.name}". Selecione o cliente existente ou informe outro telefone.`
        );
        return;
      }

      const createdClient = addClient({
        businessId: currentBusiness.id,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: '',
        status: 'A Completar',
        profileStatus: 'A Completar',
      });
      clientId = createdClient.id;
      clientName = createdClient.name;
      clientPhone = createdClient.phone;
    } else {
      if (!selectedClientId) {
        setFormError('Por favor selecione um cliente na lista ou crie um novo cliente.');
        return;
      }
      const existing = activeClients.find((c) => c.id === selectedClientId);
      clientName = existing ? existing.name : 'Cliente';
      clientPhone = existing ? existing.phone : '';
      clientEmail = existing?.email || '';
    }

    if (computedSteps.length === 0) {
      setFormError('Adicione pelo menos um serviço.');
      return;
    }

    for (const step of computedSteps) {
      if (!step.service || !step.professional) {
        setFormError(`Verifique o serviço e profissional selecionados na Etapa ${step.index}.`);
        return;
      }
      if (step.conflict) {
        setFormError(
          `Etapa ${step.index} (${step.service.name} com ${step.professional.name}): ${step.conflict.message}`
        );
        return;
      }
    }

    const result = addMultiServiceAppointment({
      businessId: currentBusiness.id,
      clientId,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      date,
      startTime,
      notes: notes.trim() || undefined,
      status: 'confirmado',
      items: computedSteps.map((step) => ({
        serviceId: step.service!.id,
        professionalId: step.professional!.id,
      })),
    });

    if (result && !result.success) {
      setFormError(result.error || 'Não foi possível concluir o agendamento.');
      return;
    }

    handleClose();
  };

  if (!isNewAppointmentModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-xs sticky top-0 z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">Novo Agendamento</h3>
            <p className="text-xs text-slate-500">
              {currentBusiness?.tradeName || 'Studio'} · Sequência de serviços & comanda unificada
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Cliente</label>
              <button
                type="button"
                onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {isCreatingNewClient ? 'Selecionar cadastrado' : '+ Novo cliente rápido'}
              </button>
            </div>

            {isCreatingNewClient || activeClients.length === 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do cliente"
                    value={newClientName}
                    onChange={(e) => {
                      setNewClientName(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
                  />
                  <MaskedInput
                    maskType="phone"
                    required
                    placeholder="WhatsApp / Telefone"
                    value={newClientPhone}
                    leftIcon={<Phone className="w-3.5 h-3.5" />}
                    onValueChange={(cleanVal) => {
                      setNewClientPhone(cleanVal);
                      if (formError) setFormError('');
                    }}
                    showValidationFeedback={true}
                  />
                </div>

                {duplicateClientByPhone && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-amber-950">Telefone já cadastrado no sistema!</p>
                      <p className="text-[11px] text-amber-900">
                        Este número já está registrado para{' '}
                        <strong>{duplicateClientByPhone.name}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(duplicateClientByPhone.id);
                          setIsCreatingNewClient(false);
                          setNewClientName('');
                          setNewClientPhone('');
                          setFormError('');
                        }}
                        className="mt-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Selecionar {duplicateClientByPhone.name}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  if (formError) setFormError('');
                }}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
              >
                <option value="">Selecione um cliente cadastrado...</option>
                {activeClients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} · {cli.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date & Initial Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Data do Atendimento
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Horário Inicial (Etapa 1)
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white font-mono tabular-nums"
              />
            </div>
          </div>

          {/* Services & Professionals Sequence Builder */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Serviços &amp; Profissionais ({computedSteps.length})</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Os horários são encadeados em sequência contínua a partir de {startTime}.
                </p>
              </div>

              {activeServices.length > 6 && (
                <input
                  type="text"
                  value={serviceFilterText}
                  onChange={(e) => setServiceFilterText(e.target.value)}
                  placeholder="Filtrar serviços..."
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-400 sm:w-44"
                />
              )}
            </div>

            <div className="space-y-2.5">
              {computedSteps.map((step, idx) => {
                const hasConflict = Boolean(step.conflict);
                const listForSelect =
                  serviceFilterText.trim() &&
                  !filteredServicesForDropdown.some((s) => s.id === step.serviceId) &&
                  step.service
                    ? [step.service, ...filteredServicesForDropdown]
                    : filteredServicesForDropdown;

                return (
                  <div
                    key={step.rowId}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      hasConflict
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200/70 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-800">Etapa {step.index}</span>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 font-semibold">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {step.stepStart} – {step.stepEnd}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                          ({step.duration} min)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {maskCurrency(step.price)}
                        </span>

                        {computedSteps.length > 1 && (
                          <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
                            <button
                              type="button"
                              onClick={() => handleMoveServiceRow(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                              title="Subir etapa"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveServiceRow(idx, 1)}
                              disabled={idx === computedSteps.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                              title="Descer etapa"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceRow(step.rowId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Remover serviço"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Service & Professional Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-1">
                          Serviço / Procedimento
                        </label>
                        <select
                          value={step.serviceId}
                          onChange={(e) => handleChangeRowService(step.rowId, e.target.value)}
                          required
                          className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white text-slate-900 font-medium"
                        >
                          {listForSelect.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.name} ({srv.durationMinutes} min · {maskCurrency(srv.price)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-500">
                            Profissional Responsável
                          </label>
                          <span className="text-[10px] font-mono tabular-nums text-slate-400">
                            Comissão: {step.commissionPct}% ({maskCurrency(step.commissionValue)})
                          </span>
                        </div>
                        <select
                          value={step.professional?.id || step.professionalId}
                          onChange={(e) =>
                            handleChangeRowProfessional(step.rowId, e.target.value)
                          }
                          required
                          className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white text-slate-900 font-medium"
                        >
                          {step.allowedPros.map((pro) => (
                            <option key={pro.id} value={pro.id}>
                              {pro.name} ({pro.specialties[0] || 'Especialista'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Step-specific conflict detail */}
                    {step.conflict && (
                      <div className="mt-2.5 flex items-start gap-2 text-[11px] text-rose-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{step.conflict.message}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddServiceRow}
              disabled={activeServices.length === 0}
              className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar outro serviço ao atendimento</span>
            </button>
          </div>

          {/* Consolidated Summary Banner */}
          {computedSteps.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>Janela total:</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {startTime} às {summary.finalEndTime} ({summary.totalDuration} min)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {computedSteps.length}{' '}
                    {computedSteps.length === 1 ? 'serviço' : 'serviços'} ·{' '}
                    {summary.distinctProsCount}{' '}
                    {summary.distinctProsCount === 1
                      ? 'profissional'
                      : 'profissionais diferentes'}{' '}
                    · Comanda unificada com rateio automático
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Total da Comanda</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-base">
                    {maskCurrency(summary.totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente tem preferência por café expresso, primeira vez..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Real-time Conflict Summary Banner */}
          {summary.firstConflict && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p className="font-bold text-rose-900">
                  Conflito detectado na Etapa {summary.firstConflict.index} (
                  {summary.firstConflict.stepStart} – {summary.firstConflict.stepEnd})
                </p>
                <p className="mt-0.5 text-rose-700">
                  {summary.firstConflict.conflict?.message}
                </p>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {formError && !summary.firstConflict && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="flex-1 font-medium">{formError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(summary.firstConflict) || Boolean(duplicateClientByPhone)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                summary.firstConflict || duplicateClientByPhone
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
              }`}
            >
              {computedSteps.length > 1
                ? `Confirmar ${computedSteps.length} Serviços`
                : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
