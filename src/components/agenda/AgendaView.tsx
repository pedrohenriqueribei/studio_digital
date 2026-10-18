import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  PlayCircle,
  CalendarDays,
  Plus,
  MessageCircle,
  Filter,
  Columns,
  ListFilter,
  DollarSign,
  AlertCircle,
  CheckCheck,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';

export const AgendaView: React.FC = () => {
  const {
    activeAppointments,
    activeProfessionals,
    activeServices,
    updateAppointmentStatus,
    setIsNewAppointmentModalOpen,
    searchQuery,
    currentRole,
    currentProfessional,
    setActiveTab,
  } = useApp();

  // Selected date state (defaults to today in sample data: 2026-10-15)
  const [selectedDate, setSelectedDate] = useState('2026-10-15');
  const [viewMode, setViewMode] = useState<'columns' | 'list'>('columns');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProFilter, setSelectedProFilter] = useState<string>(
    currentRole === 'profissional' && currentProfessional ? currentProfessional.id : 'all'
  );
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Time grid slots from 08:30 to 19:30
  const timeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
    '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  // Adjust date helper
  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const formattedDateHeader = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayAndMonth = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayAndMonth}`;
  }, [selectedDate]);

  // Status badges config with dedicated colors, borders and icons
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmado':
        return {
          label: 'Confirmado',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          cardBorder: 'border-blue-200 hover:border-blue-300 bg-blue-50/15',
          icon: CheckCircle2,
        };
      case 'agendado':
        return {
          label: 'Pendente',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          cardBorder: 'border-amber-200 hover:border-amber-300 bg-amber-50/20',
          icon: Clock,
        };
      case 'em_atendimento':
        return {
          label: 'Em Atendimento',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500 animate-pulse',
          cardBorder: 'border-purple-300 bg-purple-50/25',
          icon: PlayCircle,
        };
      case 'concluido':
        return {
          label: 'Concluído',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          cardBorder: 'border-emerald-200 hover:border-emerald-300 bg-emerald-50/20',
          icon: CheckCheck,
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          cardBorder: 'border-rose-200 hover:border-rose-300 bg-rose-50/20 opacity-80',
          icon: XCircle,
        };
    }
  };

  // Status counts for selected date
  const statusCounts = useMemo(() => {
    const dayAppointments = activeAppointments.filter((a) => {
      if (a.date !== selectedDate) return false;
      if (currentRole === 'profissional' && currentProfessional) {
        return a.professionalId === currentProfessional.id;
      }
      if (selectedProFilter !== 'all') {
        return a.professionalId === selectedProFilter;
      }
      return true;
    });

    return {
      all: dayAppointments.length,
      confirmado: dayAppointments.filter((a) => a.status === 'confirmado').length,
      pendente: dayAppointments.filter((a) => a.status === 'agendado').length,
      em_atendimento: dayAppointments.filter((a) => a.status === 'em_atendimento').length,
      concluido: dayAppointments.filter((a) => a.status === 'concluido').length,
      cancelado: dayAppointments.filter((a) => a.status === 'cancelado').length,
    };
  }, [activeAppointments, selectedDate, currentRole, currentProfessional, selectedProFilter]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return activeAppointments.filter((app) => {
      // Date filter
      if (app.date !== selectedDate) return false;

      // Role isolation: if role is 'profissional', default to seeing own appointments
      if (currentRole === 'profissional' && currentProfessional) {
        if (app.professionalId !== currentProfessional.id) return false;
      } else if (selectedProFilter !== 'all' && app.professionalId !== selectedProFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pendente' && app.status !== 'agendado') return false;
        if (statusFilter !== 'pendente' && app.status !== statusFilter) return false;
      }

      // Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = app.clientName.toLowerCase().includes(q);
        const matchesService = app.serviceName.toLowerCase().includes(q);
        const matchesPhone = app.clientPhone.includes(q);
        if (!matchesClient && !matchesService && !matchesPhone) return false;
      }

      return true;
    });
  }, [activeAppointments, selectedDate, currentRole, currentProfessional, selectedProFilter, statusFilter, searchQuery]);

  // Professionals to display in column view
  const displayProfessionals = useMemo(() => {
    if (currentRole === 'profissional' && currentProfessional) {
      return [currentProfessional];
    }
    if (selectedProFilter !== 'all') {
      return activeProfessionals.filter((p) => p.id === selectedProFilter);
    }
    return activeProfessionals;
  }, [currentRole, currentProfessional, selectedProFilter, activeProfessionals]);

  const getNextStatusAction = (currentStatus: AppointmentStatus) => {
    switch (currentStatus) {
      case 'agendado':
        return { label: 'Confirmar', next: 'confirmado' as AppointmentStatus, icon: CheckCircle2 };
      case 'confirmado':
        return { label: 'Iniciar Atendimento', next: 'em_atendimento' as AppointmentStatus, icon: PlayCircle };
      case 'em_atendimento':
        return { label: 'Finalizar', next: 'concluido' as AppointmentStatus, icon: CheckCheck };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Date Navigator, Views, Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {/* Date Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => changeDate(-1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate('2026-10-15')}
              className="px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={() => changeDate(1)}
              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-semibold text-slate-900 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
            />
            <span className="text-xs text-slate-400 hidden sm:inline">
              ({formattedDateHeader})
            </span>
          </div>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Professional Selector (only when not in isolated professional role) */}
          {currentRole !== 'profissional' && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedProFilter}
                onChange={(e) => setSelectedProFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Especialistas</option>
                {activeProfessionals.map((pro) => (
                  <option key={pro.id} value={pro.id}>
                    {pro.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('columns')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'columns'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Colunas por Especialista"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Colunas</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Lista de Atendimentos"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lista</span>
            </button>
          </div>

          {/* Quick Schedule Button */}
          <button
            onClick={() => setIsNewAppointmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar</span>
          </button>
        </div>
      </div>

      {/* Visual Status Badges Indicator Bar & Filter Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {/* All */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Todos os Atendimentos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                statusFilter === 'all' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {statusCounts.all}
            </span>
          </button>

          {/* Confirmado Badge Filter */}
          <button
            onClick={() => setStatusFilter('confirmado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'confirmado'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmados</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                statusFilter === 'confirmado' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {statusCounts.confirmado}
            </span>
          </button>

          {/* Pendente Badge Filter */}
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'pendente'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendentes</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                statusFilter === 'pendente' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {statusCounts.pendente}
            </span>
          </button>

          {/* Em Atendimento */}
          <button
            onClick={() => setStatusFilter('em_atendimento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'em_atendimento'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Em Atendimento</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                statusFilter === 'em_atendimento' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
              }`}
            >
              {statusCounts.em_atendimento}
            </span>
          </button>

          {/* Concluído */}
          <button
            onClick={() => setStatusFilter('concluido')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'concluido'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Concluídos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                statusFilter === 'concluido' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {statusCounts.concluido}
            </span>
          </button>

          {/* Cancelado Badge Filter */}
          <button
            onClick={() => setStatusFilter('cancelado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              statusFilter === 'cancelado'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelados</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                statusFilter === 'cancelado' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {statusCounts.cancelado}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden lg:inline">
          Legenda de status com cores e ícones visuais
        </span>
      </div>

      {/* Main Agenda Area */}
      {viewMode === 'columns' ? (
        activeProfessionals.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">Nenhum profissional cadastrado neste estabelecimento</p>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre especialistas para habilitar a visualização da agenda e grade de horários.
            </p>
            <button
              onClick={() => setActiveTab('profissionais')}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>+ Cadastrar Profissional</span>
            </button>
          </div>
        ) : (
          /* Multi-Professional Column Matrix View */
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {displayProfessionals.length > 1 && (
              <div className="md:hidden px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Deslize para os lados para ver mais especialistas</span>
                <span className="font-mono font-bold text-slate-700">{displayProfessionals.length} colunas</span>
              </div>
            )}
            <div className="overflow-x-auto">
              {/* Header Row: Professional Columns */}
              <div className="grid border-b border-slate-200 bg-slate-50/80 sticky top-16 z-10"
              style={{
                gridTemplateColumns: `80px repeat(${Math.max(1, displayProfessionals.length)}, minmax(240px, 1fr))`,
              }}
            >
            <div className="p-3 text-xs font-semibold text-slate-400 text-center border-r border-slate-200 flex items-center justify-center">
              Horário
            </div>
            {displayProfessionals.map((pro) => {
              const proAppointmentsCount = filteredAppointments.filter(
                (a) => a.professionalId === pro.id
              ).length;
              return (
                <div
                  key={pro.id}
                  className="p-3 border-r border-slate-200 last:border-r-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={pro.avatar}
                      alt={pro.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{pro.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {pro.specialties[0] || 'Especialista'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {proAppointmentsCount} atend.
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Slots Rows */}
          <div className="max-h-[720px] overflow-y-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `80px repeat(${Math.max(1, displayProfessionals.length)}, minmax(240px, 1fr))`,
              }}
            >
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  {/* Time label cell */}
                  <div className="py-3 px-2 border-b border-r border-slate-100 text-[11px] font-mono tabular-nums text-slate-400 text-center bg-slate-50/40 select-none">
                    {time}
                  </div>

                  {/* Professional slots for this time */}
                  {displayProfessionals.map((pro) => {
                    const matchingApps = filteredAppointments.filter(
                      (app) => app.professionalId === pro.id && app.startTime === time
                    );

                    return (
                      <div
                        key={`${pro.id}-${time}`}
                        className="p-1 border-b border-r border-slate-100 last:border-r-0 min-h-[60px] relative group hover:bg-slate-50/50 transition-colors"
                      >
                        {matchingApps.length > 0 ? (
                          matchingApps.map((app) => {
                            const badge = getStatusBadge(app.status);
                            const nextAction = getNextStatusAction(app.status);
                            const BadgeIcon = badge.icon;
                            const isCancelled = app.status === 'cancelado';

                            return (
                              <div
                                key={app.id}
                                onClick={() => setSelectedAppointment(app)}
                                className={`p-2.5 rounded-lg border text-xs cursor-pointer shadow-2xs hover:shadow-sm transition-all relative ${badge.cardBorder}`}
                              >
                                {/* Header with Client Name and Status Badge */}
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <span
                                    className={`font-bold text-slate-900 truncate ${
                                      isCancelled ? 'line-through text-slate-400' : ''
                                    }`}
                                  >
                                    {app.clientName}
                                  </span>

                                  {/* Visual Status Badge with icon */}
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase shrink-0 shadow-2xs ${badge.bg}`}
                                  >
                                    <BadgeIcon className="w-3 h-3 shrink-0" />
                                    <span>{badge.label}</span>
                                  </span>
                                </div>

                                <p
                                  className={`text-[11px] truncate mb-1.5 ${
                                    isCancelled ? 'text-slate-400 line-through' : 'text-slate-600'
                                  }`}
                                >
                                  {app.serviceName}
                                </p>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100/80">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="font-mono tabular-nums">
                                      {app.startTime} - {app.endTime}
                                    </span>
                                  </div>
                                  <span
                                    className={`font-mono tabular-nums font-bold ${
                                      isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                                    }`}
                                  >
                                    R$ {app.price.toFixed(2)}
                                  </span>
                                </div>

                                {nextAction && !isCancelled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateAppointmentStatus(app.id, nextAction.next);
                                    }}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <nextAction.icon className="w-3 h-3" />
                                    <span>{nextAction.label}</span>
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <button
                            onClick={() => setIsNewAppointmentModalOpen(true)}
                            className="w-full h-full min-h-[44px] flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100/60 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            title={`Agendar com ${pro.name} às ${time}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      )
    ) : (
        /* List / Daily Queue View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
          <div className="p-4 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Atendimentos agendados para a data selecionada</span>
            <span className="font-mono tabular-nums">
              Total: {filteredAppointments.length} agendamentos
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                Nenhum agendamento encontrado para esta data ou filtro de status
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Experimente selecionar outro filtro de status ou clique em "+ Novo Agendamento".
              </p>
              <button
                onClick={() => setIsNewAppointmentModalOpen(true)}
                className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento</span>
              </button>
            </div>
          ) : (
            filteredAppointments.map((app) => {
              const badge = getStatusBadge(app.status);
              const pro = activeProfessionals.find((p) => p.id === app.professionalId);
              const nextAction = getNextStatusAction(app.status);
              const BadgeIcon = badge.icon;
              const isCancelled = app.status === 'cancelado';

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppointment(app)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer hover:bg-slate-50/70 ${
                    isCancelled ? 'bg-rose-50/10' : ''
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 text-center shrink-0">
                      <p
                        className={`text-sm font-bold font-mono tabular-nums ${
                          isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {app.startTime}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-400">
                        {app.endTime}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-sm font-bold text-slate-900 ${
                            isCancelled ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {app.clientName}
                        </span>

                        {/* Visual Status Badge with icon */}
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase shadow-2xs ${badge.bg}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span
                          className={`font-medium ${
                            isCancelled ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {app.serviceName}
                        </span>
                        <span>·</span>
                        <span>Com {pro?.name || 'Profissional'}</span>
                        <span>·</span>
                        <span>{app.clientPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold font-mono tabular-nums ${
                          isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        R$ {app.price.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {app.paymentStatus === 'pago' ? 'Comanda Paga' : 'Pagamento Pendente'}
                      </p>
                    </div>

                    {nextAction && !isCancelled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAppointmentStatus(app.id, nextAction.next);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        <nextAction.icon className="w-3.5 h-3.5" />
                        <span>{nextAction.label}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Appointment Detail Modal Drawer with Full Status Controller */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header with Current Status Badge */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs text-slate-400 font-medium">Detalhes do Agendamento</span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{selectedAppointment.clientName}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Status Showcase Banner */}
            {(() => {
              const currentBadge = getStatusBadge(selectedAppointment.status);
              const CurrentIcon = currentBadge.icon;
              return (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between mb-4 ${currentBadge.bg}`}
                >
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="font-bold text-xs uppercase tracking-wide block">
                        Status Atual: {currentBadge.label}
                      </span>
                      <span className="text-[11px] opacity-90">
                        {selectedAppointment.status === 'confirmado'
                          ? 'Cliente com presença confirmada no horário.'
                          : selectedAppointment.status === 'agendado'
                          ? 'Aguardando confirmação do cliente ou recepção.'
                          : selectedAppointment.status === 'cancelado'
                          ? 'Atendimento cancelado no sistema.'
                          : selectedAppointment.status === 'em_atendimento'
                          ? 'Procedimento em andamento na cabine/cadeira.'
                          : 'Procedimento finalizado e liberado para caixa.'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Serviço:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedAppointment.serviceName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Valor:</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    R$ {selectedAppointment.price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Horário:</span>
                  <span className="font-medium text-slate-800 font-mono tabular-nums">
                    {selectedAppointment.startTime} às {selectedAppointment.endTime} ({selectedAppointment.date})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Especialista:</span>
                  <span className="font-medium text-slate-800">
                    {activeProfessionals.find((p) => p.id === selectedAppointment.professionalId)?.name || 'Designado'}
                  </span>
                </div>
              </div>

              {/* Client WhatsApp direct touch */}
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800">{selectedAppointment.clientPhone}</p>
                  <p className="text-slate-400 text-[11px]">Contato direto do cliente</p>
                </div>
                <a
                  href={`https://wa.me/55${selectedAppointment.clientPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {selectedAppointment.notes && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <span className="font-semibold text-amber-900 block mb-0.5">Observações:</span>
                  <p className="text-amber-800">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Status Update Quick Buttons: Confirmado, Pendente, Cancelado, Em Atendimento, Concluído */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Alterar Status do Atendimento:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'confirmado' as AppointmentStatus, label: 'Confirmado', icon: CheckCircle2, color: 'text-blue-700 hover:bg-blue-50 border-blue-200' },
                    { id: 'agendado' as AppointmentStatus, label: 'Pendente', icon: Clock, color: 'text-amber-700 hover:bg-amber-50 border-amber-300' },
                    { id: 'em_atendimento' as AppointmentStatus, label: 'Em Atendimento', icon: PlayCircle, color: 'text-purple-700 hover:bg-purple-50 border-purple-200' },
                    { id: 'concluido' as AppointmentStatus, label: 'Concluído', icon: CheckCheck, color: 'text-emerald-700 hover:bg-emerald-50 border-emerald-200' },
                    { id: 'cancelado' as AppointmentStatus, label: 'Cancelado', icon: XCircle, color: 'text-rose-700 hover:bg-rose-50 border-rose-200' },
                  ].map((item) => {
                    const isCurrent = selectedAppointment.status === item.id;
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          updateAppointmentStatus(selectedAppointment.id, item.id);
                          setSelectedAppointment((prev) => (prev ? { ...prev, status: item.id } : null));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : `bg-white ${item.color}`
                        }`}
                      >
                        <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link to POS / Comanda */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    updateAppointmentStatus(selectedAppointment.id, 'cancelado');
                    setSelectedAppointment((prev) => (prev ? { ...prev, status: 'cancelado' } : null));
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Marcar como Cancelado</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setActiveTab('comandas');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Ir para Caixa & Comanda</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
