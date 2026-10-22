import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Scissors,
  CheckCircle2,
  User,
  Phone,
  Mail,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { Professional, Service, Business, Appointment } from '../../types';
import { getProfessionalScheduleForDate } from '../../utils/availability';

interface OnlineBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  professional: Professional;
  business: Business;
  services: Service[];
  initialServiceId?: string;
  appointments: Appointment[];
  onConfirmBooking: (appointmentData: {
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    date: string;
    startTime: string;
    endTime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    notes?: string;
  }) => void;
}

export const OnlineBookingModal: React.FC<OnlineBookingModalProps> = ({
  isOpen,
  onClose,
  professional,
  business,
  services,
  initialServiceId,
  appointments,
  onConfirmBooking,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || (services[0]?.id ?? '')
  );

  // Default to tomorrow or today if within work hours
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Client info form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Confirmed booking state for step 4
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    serviceName: string;
    date: string;
    time: string;
    price: number;
  } | null>(null);

  // Sync initial service
  useEffect(() => {
    if (initialServiceId) {
      setSelectedServiceId(initialServiceId);
      setStep(2); // Skip directly to date/time selection if service was preselected
    } else if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [initialServiceId, services]);

  // Reset modal state when closed/opened
  useEffect(() => {
    if (isOpen) {
      if (!initialServiceId) setStep(1);
      setFormError('');
    }
  }, [isOpen, initialServiceId]);

  const selectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0];
  }, [services, selectedServiceId]);

  // Generate next 14 available days for the picker
  const availableDays = useMemo(() => {
    const days: {
      dateStr: string;
      dayOfWeek: number;
      dayName: string;
      dayNumber: number;
      monthName: string;
      isAvailable: boolean;
    }[] = [];

    const now = new Date();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];

      // Computa disponibilidade real considerando períodos configurados e jornada base
      const schedule = getProfessionalScheduleForDate(professional, dateStr);

      days.push({
        dateStr,
        dayOfWeek,
        dayName: weekDays[dayOfWeek],
        dayNumber: d.getDate(),
        monthName: months[d.getMonth()],
        isAvailable: schedule.isAvailable,
      });
    }

    return days;
  }, [professional]);

  // Calculate available time slots for selectedDate
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];

    const schedule = getProfessionalScheduleForDate(professional, selectedDate);
    if (!schedule.isAvailable) return [];

    const duration = selectedService.durationMinutes || 45;
    const [startH, startM] = schedule.start.split(':').map(Number);
    const [endH, endM] = schedule.end.split(':').map(Number);

    const startTotal = (startH ?? 9) * 60 + (startM ?? 0);
    const endTotal = (endH ?? 19) * 60 + (endM ?? 0);

    const slots: { time: string; available: boolean; end: string }[] = [];

    // Existing active appointments on that date for this professional
    const existing = appointments.filter(
      (a) =>
        a.professionalId === professional.id &&
        a.date === selectedDate &&
        a.status !== 'cancelado'
    );

    for (let t = startTotal; t + duration <= endTotal; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const endT = t + duration;
      const endH = Math.floor(endT / 60);
      const endM = endT % 60;

      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // Check collision
      const isTaken = existing.some((app) => {
        const [appStartH, appStartM] = app.startTime.split(':').map(Number);
        const [appEndH, appEndM] = app.endTime.split(':').map(Number);
        const appStart = (appStartH ?? 0) * 60 + (appStartM ?? 0);
        const appEnd = (appEndH ?? 0) * 60 + (appEndM ?? 0);

        return t < appEnd && endT > appStart;
      });

      slots.push({
        time: timeStr,
        end: endTimeStr,
        available: !isTaken,
      });
    }

    return slots;
  }, [selectedDate, selectedService, professional, appointments]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedServiceId) {
        setFormError('Por favor, selecione um serviço.');
        return;
      }
      setFormError('');
      setStep(2);
    } else if (step === 2) {
      if (!selectedDate) {
        setFormError('Por favor, escolha uma data.');
        return;
      }
      if (!selectedTimeSlot) {
        setFormError('Por favor, escolha um horário disponível.');
        return;
      }
      setFormError('');
      setStep(3);
    } else if (step === 3) {
      if (!clientName.trim()) {
        setFormError('Por favor, informe seu nome completo.');
        return;
      }
      if (!clientPhone.trim() || clientPhone.trim().length < 8) {
        setFormError('Por favor, informe um WhatsApp ou telefone de contato válido.');
        return;
      }

      setFormError('');

      // Find slot end
      const slot = timeSlots.find((s) => s.time === selectedTimeSlot);
      const endTime = slot?.end || '10:00';

      onConfirmBooking({
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: selectedDate,
        startTime: selectedTimeSlot,
        endTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        notes: clientNotes.trim() || undefined,
      });

      setConfirmedBookingData({
        serviceName: selectedService.name,
        date: selectedDate,
        time: selectedTimeSlot,
        price: selectedService.price,
      });

      setStep(4);
    }
  };

  const whatsappUrl = useMemo(() => {
    if (!confirmedBookingData) return '#';

    const formattedDate = confirmedBookingData.date.split('-').reverse().join('/');
    const phoneClean = professional.phone.replace(/\D/g, '') || business.phone.replace(/\D/g, '');

    const message = encodeURIComponent(
      `Olá ${professional.name}! Acabei de solicitar um agendamento online através da sua página no Studio Digital:\n\n` +
        `👤 Cliente: ${clientName}\n` +
        `✂️ Serviço: ${confirmedBookingData.serviceName}\n` +
        `📅 Data: ${formattedDate} às ${confirmedBookingData.time}\n` +
        `💰 Valor: R$ ${confirmedBookingData.price.toFixed(2)}\n` +
        `📍 Local: ${business.tradeName} (${business.city} - ${business.state})\n\n` +
        `Poderia confirmar meu horário? Obrigado!`
    );

    return phoneClean
      ? `https://wa.me/55${phoneClean}?text=${message}`
      : `https://wa.me/?text=${message}`;
  }, [confirmedBookingData, professional, business, clientName]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-900 border border-amber-300 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Agendamento Online
              </h3>
              <p className="text-xs text-slate-500">
                com <span className="font-semibold text-slate-700">{professional.name}</span> · {business.tradeName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator */}
        {step !== 4 && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 1 ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                1
              </span>
              <span className={step === 1 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                Serviço
              </span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 2
                    ? 'bg-slate-900 text-white'
                    : step > 2
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </span>
              <span className={step === 2 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                Data & Hora
              </span>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </span>
              <span className={step === 3 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                Seus Dados
              </span>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <span className="font-bold">Atenção:</span> {formError}
            </div>
          )}

          {/* STEP 1: Seleção de Serviço */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Escolha o serviço desejado
                </h4>
                <p className="text-xs text-slate-500">
                  Valores e durações praticados por {professional.name}
                </p>
              </div>

              <div className="space-y-2.5">
                {services.map((srv) => {
                  const isSelected = srv.id === selectedServiceId;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-400 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-900 truncate">
                            {srv.name}
                          </h5>
                          <span className="text-[11px] text-slate-400 font-medium">
                            · {srv.durationMinutes} min
                          </span>
                        </div>
                        {srv.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {srv.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                          R$ {srv.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Seleção de Data e Horário */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Service header reminder */}
              <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-900">{selectedService.name}</span>
                  <span className="text-slate-500 font-mono">({selectedService.durationMinutes} min)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-slate-900">
                    R$ {selectedService.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => setStep(1)}
                    className="text-amber-600 font-semibold hover:underline cursor-pointer text-[11px]"
                  >
                    Trocar
                  </button>
                </div>
              </div>

              {/* Day horizontal picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  1. Escolha o Dia de Atendimento
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {availableDays.map((d) => {
                    const isSelected = d.dateStr === selectedDate;
                    if (!d.isAvailable) {
                      return (
                        <div
                          key={d.dateStr}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-slate-300 opacity-60 min-w-[62px] shrink-0 select-none cursor-not-allowed"
                          title="Profissional não atende neste dia"
                        >
                          <span className="text-[10px] uppercase font-bold">{d.dayName}</span>
                          <span className="text-base font-bold font-mono">{d.dayNumber}</span>
                          <span className="text-[9px]">{d.monthName}</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSelectedTimeSlot('');
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all min-w-[62px] shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                          {d.dayName}
                        </span>
                        <span className="text-base font-extrabold font-mono mt-0.5">
                          {d.dayNumber}
                        </span>
                        <span className="text-[10px] opacity-80">{d.monthName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-800">
                    2. Escolha o Horário Disponível
                  </label>
                  <span className="text-slate-400">
                    Jornada: {professional.workHours.start} às {professional.workHours.end}
                  </span>
                </div>

                {timeSlots.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    Nenhum horário livre encontrado nesta data. Escolha outro dia acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {timeSlots.map((slot) => {
                      const isSelected = slot.time === selectedTimeSlot;
                      if (!slot.available) {
                        return (
                          <div
                            key={slot.time}
                            className="py-2.5 px-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-300 text-xs font-mono font-medium text-center line-through select-none cursor-not-allowed"
                            title="Horário já ocupado"
                          >
                            {slot.time}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTimeSlot(slot.time)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs ring-1 ring-amber-400'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Dados do Cliente e Revisão */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Preencha seus dados para confirmação
                </h4>
                <p className="text-xs text-slate-500">
                  O profissional receberá o agendamento em tempo real
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Especialista</span>
                  <span className="font-bold text-slate-900">{professional.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Serviço</span>
                  <span className="font-bold text-slate-900">{selectedService.name} ({selectedService.durationMinutes} min)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Data e Hora</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedDate.split('-').reverse().join('/')} às {selectedTimeSlot}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Local</span>
                  <span className="font-bold text-slate-900">{business.tradeName} ({business.city} - {business.state})</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-slate-900 text-sm">Valor Total</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    R$ {selectedService.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Seu Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Gabriela Santos"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    WhatsApp / Telefone para Confirmação *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="(11) 98765-4321"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    E-mail (opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Observações ou Preferências (opcional)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      placeholder="Ex: Primeira vez fazendo esse procedimento, prefiro atendimento pontual..."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmação Concluída */}
          {step === 4 && confirmedBookingData && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                  Agendamento Registrado!
                </span>
                <h4 className="text-xl font-extrabold text-slate-900">
                  Horário Reservado com Sucesso
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {clientName}, sua solicitação foi confirmada na agenda de {professional.name}.
                </p>
              </div>

              {/* Receipt Ticket */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Serviço:</span>
                  <span className="font-bold text-slate-900">{confirmedBookingData.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Especialista:</span>
                  <span className="font-bold text-slate-900">{professional.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data e Horário:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {confirmedBookingData.date.split('-').reverse().join('/')} às {confirmedBookingData.time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local:</span>
                  <span className="font-bold text-slate-900">{business.tradeName}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                  <span>Valor Estimado:</span>
                  <span className="font-mono text-emerald-700">R$ {confirmedBookingData.price.toFixed(2)}</span>
                </div>
              </div>

              {/* WhatsApp direct confirmation button */}
              <div className="pt-2 flex flex-col gap-2 max-w-md mx-auto">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Confirmação no WhatsApp do Profissional</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        {step !== 4 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span>{step === 3 ? 'Confirmar Agendamento' : 'Avançar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
