import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, User, Scissors, DollarSign, AlertTriangle, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getTodayDateString } from '../../utils/date';
import { checkAppointmentConflict } from '../../utils/availability';
import { MaskedInput } from '../ui/MaskedInput';

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
    addAppointment,
    addClient,
    currentBusiness,
    currentRole,
    currentProfessional,
  } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);

  const [serviceId, setServiceId] = useState<string>('');
  const [professionalId, setProfessionalId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString);
  const [startTime, setStartTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string>('');

  // Sync date, time, professional when modal opens or initial slot is provided
  useEffect(() => {
    if (isNewAppointmentModalOpen) {
      if (newAppointmentInitialSlot?.date) {
        setDate(newAppointmentInitialSlot.date);
      } else {
        setDate(getTodayDateString());
      }

      if (newAppointmentInitialSlot?.startTime) {
        setStartTime(newAppointmentInitialSlot.startTime);
      }

      if (newAppointmentInitialSlot?.professionalId) {
        setProfessionalId(newAppointmentInitialSlot.professionalId);
      } else if (currentRole === 'profissional' && currentProfessional) {
        setProfessionalId(currentProfessional.id);
      } else if (activeProfessionals.length > 0 && !professionalId) {
        setProfessionalId(activeProfessionals[0].id);
      }

      if (activeServices.length > 0 && !serviceId) {
        setServiceId(activeServices[0].id);
      }
    }
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
    setFormError('');
  };

  const selectedService = activeServices.find((s) => s.id === serviceId);

  // Profissionais habilitados para o serviço selecionado
  const availableProfessionalsForService = useMemo(() => {
    if (
      !selectedService ||
      !selectedService.allowedProfessionalIds ||
      selectedService.allowedProfessionalIds.length === 0
    ) {
      return activeProfessionals;
    }
    const filtered = activeProfessionals.filter((pro) =>
      selectedService.allowedProfessionalIds.includes(pro.id)
    );
    return filtered.length > 0 ? filtered : activeProfessionals;
  }, [selectedService, activeProfessionals]);

  // Se o profissional selecionado não estiver habilitado para este serviço, sincroniza com o primeiro válido
  useEffect(() => {
    if (isNewAppointmentModalOpen && availableProfessionalsForService.length > 0) {
      const isCurrentAllowed = availableProfessionalsForService.some((p) => p.id === professionalId);
      if (!isCurrentAllowed) {
        setProfessionalId(availableProfessionalsForService[0].id);
      }
    }
  }, [isNewAppointmentModalOpen, availableProfessionalsForService, professionalId]);

  // Compute end time based on start time + service duration
  const calculateEndTime = (start: string, durationMin: number) => {
    if (!start) return '11:45';
    const [h, m] = start.split(':').map(Number);
    const totalMin = h * 60 + m + (durationMin || 45);
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const calculatedEndTime = calculateEndTime(
    startTime,
    selectedService?.durationMinutes || 45
  );

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

  // Verificação em tempo real de conflitos:
  // 1. Mesmo profissional com mais de 1 cliente no mesmo dia e horário
  // 2. Mesmo cliente agendado com profissionais diferentes no mesmo dia e horário
  const activeConflict = useMemo(() => {
    if (!date || !startTime || !calculatedEndTime) return null;
    const targetProId = professionalId || activeProfessionals[0]?.id || '';
    if (!targetProId) return null;

    const result = checkAppointmentConflict({
      appointments: activeAppointments,
      professionals: activeProfessionals,
      date,
      startTime,
      endTime: calculatedEndTime,
      professionalId: targetProId,
      client: resolvedClient,
    });

    return result.hasConflict ? result : null;
  }, [
    activeAppointments,
    activeProfessionals,
    date,
    startTime,
    calculatedEndTime,
    professionalId,
    resolvedClient,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentBusiness) {
      setFormError('Cadastre um estabelecimento antes de criar agendamentos.');
      return;
    }

    let clientName = '';
    let clientPhone = '';
    let clientId = selectedClientId;

    if (isCreatingNewClient || !selectedClientId) {
      if (!newClientName.trim() || !newClientPhone.trim()) {
        setFormError('Por favor informe o nome e telefone do cliente.');
        return;
      }
      const createdClient = addClient({
        businessId: currentBusiness.id,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: '',
      });
      clientId = createdClient.id;
      clientName = createdClient.name;
      clientPhone = createdClient.phone;
    } else {
      const existing = activeClients.find((c) => c.id === selectedClientId);
      clientName = existing ? existing.name : 'Cliente';
      clientPhone = existing ? existing.phone : '';
    }

    if (!selectedService) {
      setFormError('Selecione um serviço.');
      return;
    }

    const targetProId = professionalId || activeProfessionals[0]?.id || 'pro_1';

    if (
      selectedService.allowedProfessionalIds &&
      selectedService.allowedProfessionalIds.length > 0 &&
      !selectedService.allowedProfessionalIds.includes(targetProId)
    ) {
      setFormError('O profissional selecionado não está habilitado para realizar este serviço.');
      return;
    }

    // Bloqueio rigoroso de conflitos antes do envio
    const conflictCheck = checkAppointmentConflict({
      appointments: activeAppointments,
      professionals: activeProfessionals,
      date,
      startTime,
      endTime: calculatedEndTime,
      professionalId: targetProId,
      client: {
        id: clientId,
        name: clientName,
        phone: clientPhone,
      },
    });

    if (conflictCheck.hasConflict) {
      setFormError(conflictCheck.message || 'Conflito de agendamento detectado.');
      return;
    }

    const result = addAppointment({
      businessId: currentBusiness.id,
      clientId,
      clientName,
      clientPhone,
      professionalId: targetProId,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date,
      startTime,
      endTime: calculatedEndTime,
      status: 'confirmado',
      price: selectedService.price,
      paymentStatus: 'pendente',
      notes: notes.trim() || undefined,
    });

    if (result && !result.success) {
      setFormError(result.error || 'Não foi possível concluir o agendamento.');
      return;
    }

    handleClose();
    // Reset form
    setNewClientName('');
    setNewClientPhone('');
    setIsCreatingNewClient(false);
    setNotes('');
    setFormError('');
  };

  if (!isNewAppointmentModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-xs sticky top-0 z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">Novo Agendamento</h3>
            <p className="text-xs text-slate-500">
              {currentBusiness?.tradeName || 'Studio'} · Adicionar à agenda
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome completo do cliente"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
                />
                <MaskedInput
                  maskType="phone"
                  required
                  placeholder="WhatsApp / Telefone"
                  value={newClientPhone}
                  leftIcon={<Phone className="w-3.5 h-3.5" />}
                  onValueChange={(cleanVal) => setNewClientPhone(cleanVal)}
                  showValidationFeedback={true}
                />
              </div>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
              >
                <option value="">Selecione um cliente...</option>
                {activeClients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} ({cli.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Serviço & Procedimento
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
            >
              {activeServices.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} — R$ {srv.price.toFixed(2)} ({srv.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Professional Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Profissional Responsável
              </label>
              {selectedService?.allowedProfessionalIds &&
                selectedService.allowedProfessionalIds.length > 0 && (
                  <span className="text-[10px] text-indigo-600 font-medium">
                    ({availableProfessionalsForService.length} habilitados p/ este serviço)
                  </span>
                )}
            </div>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
            >
              {availableProfessionalsForService.map((pro) => (
                <option key={pro.id} value={pro.id}>
                  {pro.name} ({pro.specialties[0] || 'Especialista'})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Grid */}
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
                Horário de Início
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

          {/* Calculation summary banner */}
          {selectedService && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Término previsto: </span>
                <span className="font-bold text-slate-800 font-mono tabular-nums">
                  {calculatedEndTime} ({selectedService.durationMinutes} min)
                </span>
              </div>
              <div>
                <span className="text-slate-500">Valor: </span>
                <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                  R$ {selectedService.price.toFixed(2)}
                </span>
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

          {/* Real-time Conflict Alert Banner */}
          {activeConflict && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p className="font-bold text-rose-900">
                  {activeConflict.conflictType === 'professional_conflict'
                    ? 'Horário Ocupado para este Profissional'
                    : 'Conflito de Horário do Cliente'}
                </p>
                <p className="mt-0.5 text-rose-700">{activeConflict.message}</p>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  💡 Escolha outro horário ou profissional para continuar.
                </p>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {formError && !activeConflict && (
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
              disabled={Boolean(activeConflict)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                activeConflict
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
              }`}
            >
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
