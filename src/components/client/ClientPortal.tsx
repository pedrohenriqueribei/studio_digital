import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Camera,
  MapPin,
  DollarSign,
  Shield,
  LogOut,
  Bell,
  ChevronRight,
  Filter,
  Info,
  CalendarCheck,
  History,
  Scissors,
  Check,
  Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment, Service, Professional, Business, AppointmentStatus } from '../../types';
import { formatCurrency } from '../../utils/availability';

type ClientTab = 'dashboard' | 'agendamentos' | 'novo' | 'historico' | 'perfil' | 'notificacoes';

export const ClientPortal: React.FC = () => {
  const {
    currentClient,
    logoutClient,
    updateClientProfile,
    cancelClientAppointment,
    createClientAppointment,
    submitAppointmentReview,
    appointments,
    services,
    professionals,
    businesses,
    currentBusiness,
    notifications,
    sendPasswordReset,
    navigateTo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ClientTab>('dashboard');

  // Modal states
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // Review Modal State
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] = useState<Appointment | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState(currentClient?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentClient?.phone || '');
  const [profilePhoto, setProfilePhoto] = useState(currentClient?.photoURL || '');
  const [profileBirthDay, setProfileBirthDay] = useState(currentClient?.birthDay || 1);
  const [profileBirthMonth, setProfileBirthMonth] = useState(currentClient?.birthMonth || 1);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // New Booking Wizard State
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBizId, setSelectedBizId] = useState<string>(
    currentBusiness?.id || (businesses.length > 0 ? businesses[0].id : '')
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);

  // Filter for appointments list
  const [statusFilter, setStatusFilter] = useState<'all' | 'agendado' | 'concluido' | 'cancelado'>('all');

  // Filter client's own appointments strictly
  const myAppointments = useMemo(() => {
    if (!currentClient) return [];
    return appointments.filter(
      (a) =>
        a.clientId === currentClient.id ||
        (a.clientEmail && a.clientEmail.toLowerCase() === currentClient.email.toLowerCase()) ||
        (a.clientPhone && a.clientPhone === currentClient.phone)
    );
  }, [appointments, currentClient]);

  // Next upcoming appointment
  const nextAppointment = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = myAppointments.filter(
      (a) => a.status === 'agendado' && a.date >= todayStr
    );
    upcoming.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.startTime.localeCompare(b.startTime);
    });
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [myAppointments]);

  // Completed history
  const completedAppointments = useMemo(() => {
    return myAppointments.filter((a) => a.status === 'concluido');
  }, [myAppointments]);

  // Total spent calculation
  const totalSpent = useMemo(() => {
    return completedAppointments.reduce((acc, a) => acc + (a.price || 0), 0);
  }, [completedAppointments]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    if (!profileName.trim()) {
      setProfileFeedback({ error: 'Nome não pode ser vazio.' });
      return;
    }
    setIsSavingProfile(true);
    try {
      const ok = await updateClientProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        photoURL: profilePhoto.trim() || undefined,
        birthDay: Number(profileBirthDay),
        birthMonth: Number(profileBirthMonth),
        birthDateFormatted: `${String(profileBirthDay).padStart(2, '0')}/${String(profileBirthMonth).padStart(2, '0')}`,
      });
      if (ok) {
        setProfileFeedback({ success: 'Perfil atualizado com sucesso!' });
      } else {
        setProfileFeedback({ error: 'Erro ao atualizar dados do perfil.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Reset Request
  const handleRequestPasswordReset = async () => {
    if (!currentClient?.email) return;
    setProfileFeedback(null);
    const res = await sendPasswordReset(currentClient.email);
    if (res.success) {
      setProfileFeedback({ success: res.message });
    } else {
      setProfileFeedback({ error: res.error });
    }
  };

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    setIsCancelling(true);
    setCancelFeedback(null);
    try {
      const res = await cancelClientAppointment(appointmentToCancel.id, cancelReason);
      if (res.success) {
        setCancelFeedback({ success: 'Agendamento cancelado com sucesso.' });
        setTimeout(() => {
          setAppointmentToCancel(null);
          setCancelReason('');
          setCancelFeedback(null);
        }, 1200);
      } else {
        setCancelFeedback({ error: res.error || 'Falha ao cancelar agendamento.' });
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Completed appointments pending evaluation
  const unratedCompleted = useMemo(() => {
    return completedAppointments.filter((a) => !a.rating);
  }, [completedAppointments]);

  const handleOpenReviewModal = (app: Appointment) => {
    setSelectedAppointmentForReview(app);
    setRatingValue(app.rating || 5);
    setHoveredRating(0);
    setReviewComment(app.reviewComment || '');
    setReviewFeedback(null);
  };

  const handleCloseReviewModal = () => {
    setSelectedAppointmentForReview(null);
    setRatingValue(5);
    setHoveredRating(0);
    setReviewComment('');
    setReviewFeedback(null);
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return 'Péssimo';
      case 2:
        return 'Ruim';
      case 3:
        return 'Regular';
      case 4:
        return 'Muito Bom';
      case 5:
        return 'Excelente! ✨';
      default:
        return 'Selecione sua nota';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentForReview) return;
    if (ratingValue < 1 || ratingValue > 5) {
      setReviewFeedback({ error: 'Por favor, selecione uma nota de 1 a 5 estrelas.' });
      return;
    }

    setIsSubmittingReview(true);
    setReviewFeedback(null);
    try {
      const res = await submitAppointmentReview(
        selectedAppointmentForReview.id,
        ratingValue,
        reviewComment
      );
      if (res.success) {
        setReviewFeedback({ success: 'Avaliação enviada com sucesso! Muito obrigado pelo seu feedback.' });
        setTimeout(() => {
          handleCloseReviewModal();
        }, 1200);
      } else {
        setReviewFeedback({ error: res.error || 'Erro ao registrar avaliação.' });
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Available services for selected business
  const availableServices = useMemo(() => {
    return services.filter((s) => s.businessId === selectedBizId && s.active);
  }, [services, selectedBizId]);

  // Selected service object
  const currentSelectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  // Available professionals qualified for selected service
  const availableProfessionals = useMemo(() => {
    if (!currentSelectedService) return [];
    return professionals.filter((p) => {
      if (p.businessId !== selectedBizId || !p.active) return false;
      if (
        currentSelectedService.allowedProfessionalIds &&
        currentSelectedService.allowedProfessionalIds.length > 0
      ) {
        return currentSelectedService.allowedProfessionalIds.includes(p.id);
      }
      return true;
    });
  }, [professionals, selectedBizId, currentSelectedService]);

  // Selected professional object
  const currentSelectedPro = useMemo(() => {
    return professionals.find((p) => p.id === selectedProfessionalId) || null;
  }, [professionals, selectedProfessionalId]);

  // Generate available time slots based on professional schedule and existing appointments
  const availableSlots = useMemo(() => {
    if (!currentSelectedPro || !currentSelectedService || !selectedDate) return [];

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    // Check if pro works on this day
    const proDays = currentSelectedPro.workHours?.daysOfWeek || [1, 2, 3, 4, 5, 6];
    if (!proDays.includes(dayOfWeek)) {
      return [];
    }

    const startMinutes = 9 * 60; // 09:00
    const endMinutes = 19 * 60;  // 19:00
    const duration = currentSelectedService.durationMinutes || 45;

    // Existing appointments for this professional on this date
    const proDayAppointments = appointments.filter(
      (a) =>
        a.professionalId === currentSelectedPro.id &&
        a.date === selectedDate &&
        a.status !== 'cancelado'
    );

    // Existing appointments for this client on this date
    const clientDayAppointments = myAppointments.filter(
      (a) => a.date === selectedDate && a.status !== 'cancelado'
    );

    const slots: string[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
      const slotStart = `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
      const endM = m + duration;
      const slotEnd = `${Math.floor(endM / 60).toString().padStart(2, '0')}:${(endM % 60).toString().padStart(2, '0')}`;

      // Check past time if today
      if (selectedDate === todayStr && m <= currentMinutesNow + 15) {
        continue;
      }

      // Check conflict with pro
      const proConflict = proDayAppointments.some((a) => {
        const [aStartH, aStartM] = a.startTime.split(':').map(Number);
        const [aEndH, aEndM] = a.endTime.split(':').map(Number);
        const aStart = aStartH * 60 + aStartM;
        const aEnd = aEndH * 60 + aEndM;
        return m < aEnd && endM > aStart;
      });

      if (proConflict) continue;

      // Check conflict with client
      const clientConflict = clientDayAppointments.some((a) => {
        const [aStartH, aStartM] = a.startTime.split(':').map(Number);
        const [aEndH, aEndM] = a.endTime.split(':').map(Number);
        const aStart = aStartH * 60 + aStartM;
        const aEnd = aEndH * 60 + aEndM;
        return m < aEnd && endM > aStart;
      });

      if (clientConflict) continue;

      slots.push(slotStart);
    }

    return slots;
  }, [currentSelectedPro, currentSelectedService, selectedDate, appointments, myAppointments]);

  // Handle Booking Submission
  const handleExecuteBooking = async () => {
    if (!currentSelectedService || !currentSelectedPro || !selectedTimeSlot) return;

    setIsBooking(true);
    setBookingError('');

    const [startH, startM] = selectedTimeSlot.split(':').map(Number);
    const totalMinutes = startH * 60 + startM + (currentSelectedService.durationMinutes || 45);
    const endTime = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;

    try {
      const res = await createClientAppointment({
        serviceId: currentSelectedService.id,
        professionalId: currentSelectedPro.id,
        businessId: selectedBizId,
        date: selectedDate,
        startTime: selectedTimeSlot,
        endTime,
        notes: bookingNotes.trim() || undefined,
      });

      if (res.success && res.appointment) {
        setBookingSuccess(res.appointment);
        setBookingStep(4);
      } else {
        setBookingError(res.error || 'Não foi possível confirmar o agendamento.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'agendado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" />
            <span>Agendado</span>
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Concluído</span>
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Cancelado</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white tracking-tight">Studio Digital</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Cliente
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Portal de Agendamentos e Gestão Pessoal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('novo');
                setBookingStep(1);
                setBookingSuccess(null);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </button>

            {/* Profile Avatar / Menu */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <img
                src={
                  currentClient?.photoURL ||
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                }
                alt={currentClient?.name || 'Cliente'}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
              />
              <div className="hidden md:block text-left">
                <span className="text-xs font-bold text-white block leading-tight">
                  {currentClient?.name?.split(' ')[0] || 'Cliente'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentClient?.email}
                </span>
              </div>
              <button
                onClick={logoutClient}
                title="Sair da conta"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto text-xs py-1.5 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'agendamentos'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Meus Agendamentos</span>
            {myAppointments.filter((a) => a.status === 'agendado').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-bold">
                {myAppointments.filter((a) => a.status === 'agendado').length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('novo');
              setBookingStep(1);
              setBookingSuccess(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'novo'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Agendamento</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historico'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'perfil'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Meu Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('notificacoes')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notificacoes'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificações</span>
            {notifications.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD                                         */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src={
                      currentClient?.photoURL ||
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                    }
                    alt={currentClient?.name || 'Cliente'}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md"
                  />
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Área Exclusiva do Cliente
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                      Olá, {currentClient?.name || 'Cliente'}!
                    </h1>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Bem-vindo(a) ao seu portal no Studio Digital. Gerencie seus agendamentos e reserve novos serviços.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('novo');
                      setBookingStep(1);
                      setBookingSuccess(null);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Fazer Novo Agendamento</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('agendamentos')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Ver Minha Agenda</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Próximos Agendamentos</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {myAppointments.filter((a) => a.status === 'agendado').length}
                </div>
                <span className="text-[11px] text-slate-500">Reservas ativas</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Atendimentos Concluídos</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {completedAppointments.length}
                </div>
                <span className="text-[11px] text-slate-500">Sessões realizadas</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Total Investido</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-400">
                  {formatCurrency(totalSpent)}
                </div>
                <span className="text-[11px] text-slate-500">Histórico de cuidados</span>
              </div>
            </div>

            {/* Pending Reviews Banner */}
            {unratedCompleted.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        Como foi sua experiência no Studio Digital?
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                        {unratedCompleted.length} {unratedCompleted.length === 1 ? 'pendente' : 'pendentes'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Ajude a reconhecer o trabalho de <strong className="text-white">{unratedCompleted[0].professionalName}</strong> avaliando seu atendimento concluído com estrelas e comentário.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenReviewModal(unratedCompleted[0])}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Avaliar Agora</span>
                </button>
              </div>
            )}

            {/* Next Appointment Spotlight */}
            {nextAppointment ? (
              <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <CalendarCheck className="w-4 h-4" />
                    <span>Seu Próximo Atendimento</span>
                  </div>
                  {getStatusBadge(nextAppointment.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Serviço</span>
                    <h3 className="text-lg font-bold text-white">{nextAppointment.serviceName}</h3>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {formatCurrency(nextAppointment.price)} · {nextAppointment.durationMinutes} min
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Profissional & Local</span>
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">
                        {nextAppointment.professionalName}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block">
                      {businesses.find((b) => b.id === nextAppointment.businessId)?.tradeName || 'Studio Digital'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Data e Horário</span>
                    <div className="text-base font-extrabold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>{nextAppointment.date}</span>
                      <span className="text-amber-400">às {nextAppointment.startTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedAppointmentForDetails(nextAppointment)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => setAppointmentToCancel(nextAppointment)}
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar Agendamento
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Você não tem agendamentos futuros</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Agende agora mesmo um horário com seus profissionais favoritos com confirmação imediata.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('novo');
                    setBookingStep(1);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Agendar Agora
                </button>
              </div>
            )}

            {/* Recent Appointments Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Histórico Recente
                </h2>
                <button
                  onClick={() => setActiveTab('agendamentos')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                >
                  <span>Ver todos ({myAppointments.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myAppointments.length === 0 ? (
                <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-center text-xs text-slate-500">
                  Nenhum agendamento registrado até o momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myAppointments.slice(0, 4).map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{app.serviceName}</span>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-xs text-slate-400">
                          {app.professionalName} · {app.date} às {app.startTime}
                        </p>
                        {app.rating && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{app.rating}.0</span>
                            {app.reviewComment && (
                              <span className="text-slate-400 font-normal italic truncate max-w-[160px]">
                                — "{app.reviewComment}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {formatCurrency(app.price)}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          {app.status === 'concluido' && (
                            app.rating ? (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-0.5"
                                title="Ver avaliação"
                              >
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{app.rating}.0</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1"
                              >
                                <Star className="w-3 h-3 fill-current" />
                                <span>Avaliar</span>
                              </button>
                            )
                          )}
                          <button
                            onClick={() => setSelectedAppointmentForDetails(app)}
                            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MEUS AGENDAMENTOS                                 */}
        {/* ========================================================= */}
        {activeTab === 'agendamentos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-white">Meus Agendamentos</h1>
                <p className="text-xs text-slate-400">
                  Acompanhe suas reservas futuras, passadas e canceladas.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                {(['all', 'agendado', 'concluido', 'cancelado'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === s
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s === 'all'
                      ? 'Todos'
                      : s === 'agendado'
                      ? 'Agendados'
                      : s === 'concluido'
                      ? 'Concluídos'
                      : 'Cancelados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtered Appointments List */}
            {(() => {
              const list = myAppointments.filter(
                (a) => statusFilter === 'all' || a.status === statusFilter
              );

              if (list.length === 0) {
                return (
                  <div className="p-12 bg-slate-900/50 rounded-3xl border border-slate-800 text-center space-y-3">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">Nenhum agendamento encontrado</h3>
                    <p className="text-xs text-slate-400">
                      Não há agendamentos cadastrados com o filtro selecionado ({statusFilter}).
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {list.map((app) => (
                    <div
                      key={app.id}
                      className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {app.date.split('-')[1]}
                          </span>
                          <span className="text-base font-extrabold text-white leading-none">
                            {app.date.split('-')[2]}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{app.serviceName}</h3>
                            {getStatusBadge(app.status)}
                          </div>
                          <p className="text-xs text-slate-300">
                            Profissional: <strong className="text-white">{app.professionalName}</strong> · Horário: <strong className="text-white">{app.startTime} às {app.endTime}</strong>
                          </p>
                          <span className="text-[11px] text-slate-400 block">
                            Local: {businesses.find((b) => b.id === app.businessId)?.tradeName || 'Studio Digital'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <div className="text-left md:text-right">
                          <span className="text-sm font-mono font-extrabold text-emerald-400 block">
                            {formatCurrency(app.price)}
                          </span>
                          <span className="text-[10px] text-slate-500">{app.durationMinutes} minutos</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {app.status === 'concluido' && (
                            app.rating ? (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Ver ou editar avaliação"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{app.rating}.0</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Avaliar</span>
                              </button>
                            )
                          )}

                          <button
                            onClick={() => setSelectedAppointmentForDetails(app)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                          >
                            Detalhes
                          </button>

                          {app.status === 'agendado' && (
                            <button
                              onClick={() => setAppointmentToCancel(app)}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: NOVO AGENDAMENTO (4-STEP WIZARD)                   */}
        {/* ========================================================= */}
        {activeTab === 'novo' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                Reserva Online Rápida
              </span>
              <h1 className="text-2xl font-extrabold text-white">Agendar Novo Atendimento</h1>
              <p className="text-xs text-slate-400">
                Selecione o serviço, profissional, data e horário ideal para você.
              </p>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, label: '1. Estabelecimento & Serviço' },
                { step: 2, label: '2. Profissional' },
                { step: 3, label: '3. Data & Horário' },
                { step: 4, label: '4. Confirmação' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`py-2 px-1 rounded-xl border font-bold transition-all ${
                    bookingStep === s.step
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : bookingStep > s.step
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <span className="text-[11px] block">{s.label}</span>
                </div>
              ))}
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* STEP 1: CHOOSE BUSINESS & SERVICE */}
            {bookingStep === 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                {businesses.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Escolha a Unidade / Estabelecimento:
                    </label>
                    <select
                      value={selectedBizId}
                      onChange={(e) => {
                        setSelectedBizId(e.target.value);
                        setSelectedServiceId('');
                        setSelectedProfessionalId('');
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    >
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.tradeName || b.name} - {b.city || 'Brasil'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Selecione o Serviço Desejado:
                  </label>

                  {availableServices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                      Nenhum serviço ativo encontrado para esta unidade.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableServices.map((srv) => {
                        const isSelected = selectedServiceId === srv.id;
                        return (
                          <div
                            key={srv.id}
                            onClick={() => setSelectedServiceId(srv.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <h3 className="text-sm font-bold text-white">{srv.name}</h3>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                                  <Check className="w-3 h-3 font-bold" />
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {srv.description || 'Atendimento de alta qualidade.'}
                            </p>
                            <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-slate-800/80">
                              <span className="text-slate-400">{srv.durationMinutes} min</span>
                              <span className="text-emerald-400 font-bold">
                                {formatCurrency(srv.price)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    disabled={!selectedServiceId}
                    onClick={() => {
                      setBookingStep(2);
                      setBookingError('');
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Avançar para Profissional</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CHOOSE QUALIFIED PROFESSIONAL */}
            {bookingStep === 2 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Profissionais habilitados para{' '}
                      <strong className="text-white">{currentSelectedService?.name}</strong>:
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {formatCurrency(currentSelectedService?.price || 0)}
                    </span>
                  </div>

                  {availableProfessionals.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                      Nenhum profissional cadastrado para este serviço.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableProfessionals.map((pro) => {
                        const isSelected = selectedProfessionalId === pro.id;
                        return (
                          <div
                            key={pro.id}
                            onClick={() => setSelectedProfessionalId(pro.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <img
                              src={
                                pro.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face'
                              }
                              alt={pro.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                            />
                            <div className="flex-1 space-y-0.5">
                              <h3 className="text-sm font-bold text-white">{pro.name}</h3>
                              <span className="text-[11px] text-slate-400 block">
                                {pro.specialties?.join(', ') || 'Especialista'}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 font-bold" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setBookingStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    disabled={!selectedProfessionalId}
                    onClick={() => {
                      setBookingStep(3);
                      setBookingError('');
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Escolher Data e Horário</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE DATE & AVAILABLE SLOT */}
            {bookingStep === 3 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Data do Atendimento:
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Observações / Preferências (Opcional):
                    </label>
                    <input
                      type="text"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Ex: prefiro corte na tesoura, etc."
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Horários Disponíveis em <strong className="text-white">{selectedDate}</strong>:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Duração: {currentSelectedService?.durationMinutes} min
                    </span>
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-bold text-white">Sem horários livres nesta data</p>
                      <p className="text-[11px] text-slate-500">
                        O profissional não atende neste dia ou todos os horários já estão preenchidos. Por favor, escolha outra data.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedTimeSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTimeSlot(slot)}
                            className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Summary Box */}
                {selectedTimeSlot && currentSelectedService && currentSelectedPro && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-xs space-y-1.5">
                    <div className="font-bold text-emerald-300">Resumo da Reserva:</div>
                    <div className="text-slate-300">
                      • {currentSelectedService.name} com {currentSelectedPro.name}
                    </div>
                    <div className="text-slate-300">
                      • Dia {selectedDate} às {selectedTimeSlot} ({currentSelectedService.durationMinutes} min)
                    </div>
                    <div className="text-emerald-400 font-mono font-bold">
                      • Valor total: {formatCurrency(currentSelectedService.price)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setBookingStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    disabled={!selectedTimeSlot || isBooking}
                    onClick={handleExecuteBooking}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <span>{isBooking ? 'Confirmando...' : 'Confirmar Reserva'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {bookingStep === 4 && bookingSuccess && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Reserva Confirmada!
                  </span>
                  <h2 className="text-2xl font-extrabold text-white">
                    Seu agendamento foi realizado com sucesso
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Aguardamos você no horário marcado! Você pode consultar os detalhes ou cancelar a qualquer momento em sua conta.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-slate-400">Serviço:</span>
                    <span className="font-bold text-white">{bookingSuccess.serviceName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-slate-400">Profissional:</span>
                    <span className="font-bold text-white">{bookingSuccess.professionalName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-slate-400">Data e Horário:</span>
                    <span className="font-bold text-white">
                      {bookingSuccess.date} às {bookingSuccess.startTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(bookingSuccess.price)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('agendamentos')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    Ver Meus Agendamentos
                  </button>
                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedServiceId('');
                      setSelectedProfessionalId('');
                      setSelectedTimeSlot('');
                      setBookingSuccess(null);
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Fazer Outro Agendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: HISTÓRICO DE ATENDIMENTOS                         */}
        {/* ========================================================= */}
        {activeTab === 'historico' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-white">Histórico de Atendimentos</h1>
              <p className="text-xs text-slate-400">
                Consulte todos os serviços já realizados anteriormente no Studio Digital.
              </p>
            </div>

            {completedAppointments.length === 0 ? (
              <div className="p-12 bg-slate-900/50 rounded-3xl border border-slate-800 text-center space-y-3">
                <History className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum atendimento concluído ainda</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Assim que você concluir sua primeira sessão de atendimento, ela aparecerá registrada aqui com recibo e valor.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-white">{app.serviceName}</h3>
                        <p className="text-xs text-slate-400">
                          {app.professionalName} · {app.date}
                        </p>

                        {/* Rating Display if evaluated */}
                        {app.rating && (
                          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-400 font-semibold">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= (app.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span>{app.rating}.0</span>
                            {app.reviewComment && (
                              <span className="text-slate-400 font-normal italic truncate max-w-xs ml-1">
                                — "{app.reviewComment}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {formatCurrency(app.price)}
                        </span>
                        <span className="text-[10px] text-emerald-500 font-medium">Concluído</span>
                      </div>

                      {/* Avaliar Atendimento Action */}
                      {app.rating ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(app)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Clique para ver ou editar sua avaliação"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Ver Avaliação</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(app)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>Avaliar Atendimento</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedAppointmentForDetails(app)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                      >
                        Recibo / Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: MEU PERFIL                                        */}
        {/* ========================================================= */}
        {activeTab === 'perfil' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-white">Meu Perfil de Cliente</h1>
              <p className="text-xs text-slate-400">
                Gerencie suas informações cadastrais e dados de segurança.
              </p>
            </div>

            {profileFeedback?.error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{profileFeedback.error}</span>
              </div>
            )}

            {profileFeedback?.success && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{profileFeedback.success}</span>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              {/* Photo & Role Badge */}
              <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                <img
                  src={
                    profilePhoto ||
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                  }
                  alt={profileName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{currentClient?.name}</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                      Perfil: Cliente
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{currentClient?.email}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Aniversário (Dia / Mês)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={profileBirthDay}
                        onChange={(e) => setProfileBirthDay(Number(e.target.value))}
                        className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Dia {d.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select
                        value={profileBirthMonth}
                        onChange={(e) => setProfileBirthMonth(Number(e.target.value))}
                        className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      >
                        {[
                          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                        ].map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    URL da Foto de Perfil
                  </label>
                  <input
                    type="url"
                    value={profilePhoto}
                    onChange={(e) => setProfilePhoto(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleRequestPasswordReset}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    Redefinir Senha por E-mail
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: NOTIFICAÇÕES                                      */}
        {/* ========================================================= */}
        {activeTab === 'notificacoes' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-white">Notificações</h1>
              <p className="text-xs text-slate-400">
                Avisos importantes sobre confirmações e cancelamentos de agendamentos.
              </p>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800 text-center text-xs text-slate-500">
                Nenhuma notificação recente.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: DETALHES DO AGENDAMENTO                            */}
      {/* ========================================================= */}
      {selectedAppointmentForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                Detalhes da Reserva
              </span>
              <button
                onClick={() => setSelectedAppointmentForDetails(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-xs"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Serviço</span>
                <span className="text-base font-bold text-white block">
                  {selectedAppointmentForDetails.serviceName}
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatCurrency(selectedAppointmentForDetails.price)} · {selectedAppointmentForDetails.durationMinutes} min
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Profissional Responsável</span>
                <span className="text-sm font-semibold text-white block">
                  {selectedAppointmentForDetails.professionalName}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Data e Horário</span>
                <span className="text-sm font-semibold text-white block">
                  {selectedAppointmentForDetails.date} das {selectedAppointmentForDetails.startTime} às {selectedAppointmentForDetails.endTime}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Status da Reserva</span>
                <div>{getStatusBadge(selectedAppointmentForDetails.status)}</div>
              </div>

              {/* Review section if appointment is completed */}
              {selectedAppointmentForDetails.status === 'concluido' && (
                <div className="p-3 bg-slate-950 rounded-xl space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                      Avaliação do Atendimento
                    </span>
                    {selectedAppointmentForDetails.rating ? (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {selectedAppointmentForDetails.rating}.0 de 5.0
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400/80">Pendente de avaliação</span>
                    )}
                  </div>

                  {selectedAppointmentForDetails.rating ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= (selectedAppointmentForDetails.rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      {selectedAppointmentForDetails.reviewComment && (
                        <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-900">
                          "{selectedAppointmentForDetails.reviewComment}"
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedAppointmentForDetails;
                          setSelectedAppointmentForDetails(null);
                          handleOpenReviewModal(target);
                        }}
                        className="text-[11px] text-amber-400 hover:underline pt-1 block cursor-pointer"
                      >
                        Editar minha avaliação
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedAppointmentForDetails;
                        setSelectedAppointmentForDetails(null);
                        handleOpenReviewModal(target);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Avaliar Profissional Agora</span>
                    </button>
                  )}
                </div>
              )}

              {selectedAppointmentForDetails.notes && (
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase">Observações</span>
                  <span className="text-slate-300 block">{selectedAppointmentForDetails.notes}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAppointmentForDetails(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CANCELAR AGENDAMENTO                                */}
      {/* ========================================================= */}
      {appointmentToCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Confirmar Cancelamento</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você tem certeza que deseja cancelar sua reserva de{' '}
                <strong className="text-white">{appointmentToCancel.serviceName}</strong> em{' '}
                <strong className="text-white">{appointmentToCancel.date}</strong> às{' '}
                <strong className="text-white">{appointmentToCancel.startTime}</strong>?
              </p>
            </div>

            {cancelFeedback?.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {cancelFeedback.error}
              </div>
            )}

            {cancelFeedback?.success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {cancelFeedback.success}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Motivo do cancelamento (opcional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Imprevisto no trabalho, mudança de data..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setAppointmentToCancel(null);
                  setCancelReason('');
                  setCancelFeedback(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isCancelling ? 'Cancelando...' : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AVALIAÇÃO DO ATENDIMENTO COM ESTRELAS E COMENTÁRIO */}
      {/* ========================================================= */}
      {selectedAppointmentForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Avaliar Atendimento</h3>
                  <span className="text-[10px] text-slate-400 block">Sua opinião é fundamental para nós</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseReviewModal}
                className="text-slate-400 hover:text-white cursor-pointer text-xs p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Informações do Profissional e Atendimento */}
            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center gap-3">
              {(() => {
                const pro = professionals.find((p) => p.id === selectedAppointmentForReview.professionalId);
                const avatar = pro?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face';
                return (
                  <img
                    src={avatar}
                    alt={selectedAppointmentForReview.professionalName || 'Profissional'}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                );
              })()}
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                  {selectedAppointmentForReview.serviceName}
                </span>
                <h4 className="text-sm font-bold text-white truncate">
                  {selectedAppointmentForReview.professionalName}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {selectedAppointmentForReview.date} · {selectedAppointmentForReview.startTime} às {selectedAppointmentForReview.endTime}
                </p>
              </div>
            </div>

            {/* Feedback messages */}
            {reviewFeedback?.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{reviewFeedback.error}</span>
              </div>
            )}

            {reviewFeedback?.success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{reviewFeedback.success}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Section */}
              <div className="space-y-2 text-center py-2 bg-slate-950/50 rounded-2xl border border-slate-800/60 p-4">
                <label className="text-xs font-semibold text-slate-300 block">
                  Como foi sua experiência com o profissional?
                </label>

                {/* 5 Interactive Stars */}
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeScore = hoveredRating || ratingValue;
                    const isFilled = star <= activeScore;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingValue(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                        title={`${star} estrela${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-8 h-8 transition-all ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'text-slate-700 hover:text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Label */}
                <div className="h-5 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400 animate-in fade-in font-mono">
                    {getRatingLabel(hoveredRating || ratingValue)}
                  </span>
                </div>
              </div>

              {/* Optional Comment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Comentário (opcional):
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {reviewComment.length}/300
                  </span>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value.slice(0, 300))}
                  placeholder="Conte o que achou do atendimento, resultado, pontualidade ou deixe um elogio..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={handleCloseReviewModal}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingReview || ratingValue === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isSubmittingReview
                      ? 'Salvando...'
                      : selectedAppointmentForReview.rating
                      ? 'Atualizar Avaliação'
                      : 'Enviar Avaliação'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
