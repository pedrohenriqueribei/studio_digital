import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Scissors,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/masks';
import { getTodayDateString } from '../../utils/date';
import { calculateNewClientWaitTime } from '../../utils/queueWaitCalculator';

export const NewQueueTicketModal: React.FC = () => {
  const {
    isNewQueueModalOpen,
    setIsNewQueueModalOpen,
    activeServices,
    activeProfessionals,
    activeClients,
    activeAppointments,
    activeQueueItems,
    addToQueue,
  } = useApp();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [anyProfessional, setAnyProfessional] = useState<boolean>(true);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-selecionar primeiro serviço se disponível
  React.useEffect(() => {
    if (activeServices.length > 0 && !selectedServiceId) {
      setSelectedServiceId(activeServices[0].id);
    }
  }, [activeServices, selectedServiceId]);

  // Filtragem de clientes para autocomplete
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return [];
    const q = clientSearchQuery.toLowerCase();
    return activeClients
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 5);
  }, [activeClients, clientSearchQuery]);

  const selectedService = useMemo(() => {
    return activeServices.find((s) => s.id === selectedServiceId);
  }, [activeServices, selectedServiceId]);

  // Estimativa baseada no algoritmo simples de média de duração dos serviços do profissional
  const proWaitEstimation = useMemo(() => {
    if (anyProfessional || !selectedProfessionalId) return null;
    return calculateNewClientWaitTime(
      selectedProfessionalId,
      activeProfessionals,
      activeServices,
      activeQueueItems,
      false
    );
  }, [anyProfessional, selectedProfessionalId, activeProfessionals, activeServices, activeQueueItems]);

  // Análise preditiva inteligente da fila e janelas livres (Smart Gaps)
  const queueAnalysis = useMemo(() => {
    if (!selectedService) return { waitMinutes: 0, alert: null, nextAppTime: null };

    const waitingQueue = activeQueueItems.filter(
      (q) => q.status === 'aguardando' || q.status === 'chamado' || q.status === 'em_atendimento'
    );

    const relevantQueue = anyProfessional
      ? waitingQueue
      : waitingQueue.filter(
          (q) =>
            q.assignedProfessionalId === selectedProfessionalId ||
            q.professionalId === selectedProfessionalId
        );

    const waitMinutes = relevantQueue.reduce((acc, curr) => {
      if (curr.status === 'em_atendimento') {
        return acc + Math.max(5, Math.round(curr.serviceDuration / 2));
      }
      return acc + curr.serviceDuration;
    }, 0);

    // Checagem de agendamentos agendados hoje para alertar sobre conflitos de horários
    let alert: string | null = null;
    let nextAppTime: string | null = null;

    if (!anyProfessional && selectedProfessionalId) {
      const todayStr = getTodayDateString();
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const futureApps = activeAppointments
        .filter((a) => {
          if (a.date !== todayStr || a.professionalId !== selectedProfessionalId || a.status === 'cancelado') {
            return false;
          }
          const [h, m] = a.startTime.split(':').map(Number);
          return h * 60 + m >= nowMinutes;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      if (futureApps.length > 0) {
        const nextApp = futureApps[0];
        nextAppTime = nextApp.startTime;
        const [ah, am] = nextApp.startTime.split(':').map(Number);
        const nextAppMinutes = ah * 60 + am;
        const availableWindow = nextAppMinutes - nowMinutes;

        if (availableWindow < selectedService.durationMinutes) {
          alert = `Atenção: ${nextApp.professionalName || 'O profissional'} tem cliente agendado às ${nextApp.startTime} (${nextApp.clientName}). O serviço dura ${selectedService.durationMinutes} min e pode atrasar o agendado. Recomendado escolher "Qualquer disponível".`;
        }
      }
    }

    return { waitMinutes, alert, nextAppTime };
  }, [
    selectedService,
    activeQueueItems,
    anyProfessional,
    selectedProfessionalId,
    activeAppointments,
  ]);

  const handleSelectClient = (c: (typeof activeClients)[0]) => {
    setSelectedClientId(c.id);
    setClientName(c.name);
    setClientPhone(formatPhone(c.phone));
    setClientSearchQuery('');
    setShowClientDropdown(false);
  };

  const handleClose = () => {
    setClientName('');
    setClientPhone('');
    setSelectedClientId(undefined);
    setClientSearchQuery('');
    setNotes('');
    setErrorMsg('');
    setIsNewQueueModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clientName.trim()) {
      setErrorMsg('Informe o nome do cliente.');
      return;
    }

    if (!selectedServiceId) {
      setErrorMsg('Selecione o serviço a ser realizado.');
      return;
    }

    if (!anyProfessional && !selectedProfessionalId) {
      setErrorMsg('Selecione o profissional desejado ou marque "Qualquer disponível".');
      return;
    }

    setIsSubmitting(true);
    try {
      await addToQueue({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        serviceId: selectedServiceId,
        professionalId: anyProfessional ? undefined : selectedProfessionalId,
        anyProfessional,
        clientId: selectedClientId,
        notes: notes.trim(),
      });

      handleClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao emitir senha na fila virtual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isNewQueueModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/30">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Novo Encaixe / Gerar Senha</h3>
              <p className="text-xs text-slate-300">Entrada na Fila Virtual Presencial</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Busca de Cliente ou Digitação */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente</span>
                <span className="text-rose-500">*</span>
              </label>
              {selectedClientId && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Cadastrado
                </span>
              )}
            </div>

            {/* Quick Autocomplete Search */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar cliente cadastrado..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="block text-[11px] text-slate-400">{c.phone}</span>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">
                        Selecionar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <input
                  type="text"
                  placeholder="Nome do cliente presencial"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    setSelectedClientId(undefined);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="WhatsApp / Telefone (opcional)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Seleção do Serviço */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
              <span>Serviço Solicitado</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
              required
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.durationMinutes} min — R$ {s.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Profissional (Qualquer disponível ou Escolha Manual) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Atribuição do Profissional</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAnyProfessional(true);
                  setSelectedProfessionalId('');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  anyProfessional
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">Qualquer Disponível</span>
                  {anyProfessional && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <span className="text-[11px] text-slate-500">Mais ágil • Menor tempo de espera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAnyProfessional(false);
                  if (!selectedProfessionalId && activeProfessionals.length > 0) {
                    setSelectedProfessionalId(activeProfessionals[0].id);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  !anyProfessional
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">Profissional Específico</span>
                  {!anyProfessional && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <span className="text-[11px] text-slate-500">Preferência indicada pelo cliente</span>
              </button>
            </div>

            {!anyProfessional && (
              <div className="pt-1">
                <select
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                >
                  {activeProfessionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.specialties?.length ? `(${p.specialties.join(', ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Banner Preditivo Inteligente de Espera & Alerta de Prioridade de Agendados */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Tempo Estimado de Espera:
              </span>
              <span className="font-bold text-slate-900 font-mono tabular-nums bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                {proWaitEstimation
                  ? proWaitEstimation.isImmediate
                    ? 'Atendimento Imediato'
                    : `~${proWaitEstimation.estimatedWaitMinutes} min`
                  : queueAnalysis.waitMinutes === 0
                  ? 'Atendimento Imediato'
                  : `~${queueAnalysis.waitMinutes} min`}
              </span>
            </div>

            {proWaitEstimation && (
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span>Média dos serviços de {proWaitEstimation.professionalName}:</span>
                <span className="font-semibold text-indigo-700 font-mono">
                  {proWaitEstimation.avgServiceDuration} min/serviço ({proWaitEstimation.totalAheadCount} na fila)
                </span>
              </div>
            )}

            {queueAnalysis.alert && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{queueAnalysis.alert}</span>
              </div>
            )}
          </div>

          {/* Observações / Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Observações adicionais (opcional)</label>
            <textarea
              rows={2}
              placeholder="Ex: Cliente tem preferência por café morno, quer aparar pontas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Gerando Senha...' : 'Emitir Senha na Fila'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
