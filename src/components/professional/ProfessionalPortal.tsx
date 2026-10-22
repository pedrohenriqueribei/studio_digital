import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Phone,
  Scissors,
  ChevronRight,
  Shield,
  Layers,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';
import { getTodayDateString } from '../../utils/date';
import { slugify } from '../../utils/slugify';

export const ProfessionalPortal: React.FC = () => {
  const {
    currentBusiness,
    currentProfessional,
    activeAppointments,
    updateAppointmentStatus,
    openNewAppointmentModal,
    navigateTo,
    activeServices,
    userRole,
  } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'week' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const todayStr = getTodayDateString();

  // Calculate tomorrow
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter appointments for THIS professional only
  const myAppointments = useMemo(() => {
    if (!currentProfessional) return [];
    return activeAppointments.filter((app) => {
      // Must belong to this professional
      if (app.professionalId !== currentProfessional.id) return false;

      // Date filtering
      if (dateFilter === 'today' && app.date !== todayStr) return false;
      if (dateFilter === 'tomorrow' && app.date !== tomorrowStr) return false;

      // Status filtering
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;

      return true;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activeAppointments, currentProfessional, dateFilter, statusFilter, todayStr, tomorrowStr]);

  // Performance and Commission metrics for this professional
  const stats = useMemo(() => {
    if (!currentProfessional) {
      return { totalAppointments: 0, completed: 0, grossRevenue: 0, myCommissions: 0, rate: 0 };
    }

    const proApps = activeAppointments.filter((a) => a.professionalId === currentProfessional.id);
    const completedApps = proApps.filter((a) => a.status === 'concluido');
    const grossRevenue = completedApps.reduce((acc, a) => acc + (a.price || 0), 0);
    const rate = currentProfessional.commissionPercentage || 50;
    const myCommissions = (grossRevenue * rate) / 100;

    return {
      totalAppointments: proApps.length,
      completed: completedApps.length,
      grossRevenue,
      myCommissions,
      rate,
    };
  }, [activeAppointments, currentProfessional]);

  const proSlug = currentProfessional?.slug || (currentProfessional ? slugify(currentProfessional.name) : '');
  const publicBookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${proSlug}`
    : `/p/${proSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmado':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Confirmado',
          icon: CheckCircle2,
        };
      case 'em_atendimento':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
          label: 'Em Atendimento',
          icon: PlayCircle,
        };
      case 'concluido':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Concluído',
          icon: Check,
        };
      case 'cancelado':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Cancelado',
          icon: AlertCircle,
        };
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Agendado',
          icon: Clock,
        };
    }
  };

  if (!currentProfessional) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Nenhum Profissional Selecionado
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Não foi possível identificar o perfil de especialista vinculado ao seu usuário neste studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Professional Identity & Scope */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src={currentProfessional.avatar}
            alt={currentProfessional.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600 shadow-sm shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Perfil: Profissional / Especialista
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentBusiness?.tradeName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Olá, {currentProfessional.name}!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>{currentProfessional.specialties.join(' · ')}</span>
              <span>·</span>
              <span>Horário: {currentProfessional.workHours.start} às {currentProfessional.workHours.end}</span>
            </p>
          </div>
        </div>

        {/* Public Booking Link Card */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex flex-col gap-2 shrink-0 md:max-w-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sua Página de Agendamento:</span>
            </span>
            <button
              onClick={() => navigateTo(`/p/${proSlug}`)}
              className="text-[11px] text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              <span>Abrir</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 truncate">
            <span className="truncate">/p/{proSlug}</span>
            <button
              onClick={handleCopyLink}
              className="p-1 hover:text-indigo-600 text-slate-400 shrink-0 cursor-pointer ml-auto"
              title="Copiar link público"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Commission & Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Minhas Comissões (Mês)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            R$ {stats.myCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
            <span>{stats.rate}% de comissão cadastrada</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Atendimentos Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {stats.completed}
          </p>
          <span className="text-[11px] text-slate-500">
            De {stats.totalAppointments} agendamentos totais
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Faturamento Gerado</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            R$ {stats.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Valor bruto dos serviços</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Agendamentos para Hoje</span>
            <CalendarDays className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {activeAppointments.filter((a) => a.professionalId === currentProfessional.id && a.date === todayStr).length}
          </p>
          <span className="text-[11px] text-slate-500">Na sua agenda pessoal</span>
        </div>
      </div>

      {/* Main Agenda Section for this Specialist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Toolbar & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Minha Agenda de Atendimentos
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie seus clientes e atualize o status conforme for atendendo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter pills */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setDateFilter('tomorrow')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  dateFilter === 'tomorrow' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Amanhã
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Status filter dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="agendado">Agendados</option>
              <option value="confirmado">Confirmados</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>

            <button
              onClick={() => openNewAppointmentModal({ professionalId: currentProfessional.id })}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              + Novo Encaixe
            </button>
          </div>
        </div>

        {/* Appointment Cards / Table */}
        <div className="divide-y divide-slate-100">
          {myAppointments.map((app) => {
            const badge = getStatusBadge(app.status);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={app.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Time Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 font-mono text-center shrink-0 min-w-[70px]">
                    <span className="text-xs font-bold block">{app.startTime}</span>
                    <span className="text-[10px] text-slate-500 block">até {app.endTime}</span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {app.clientName}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${badge.bg}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-indigo-700">
                        <Scissors className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{app.serviceName}</span>
                      </span>
                      <span>·</span>
                      <span className="text-slate-500">{app.date}</span>
                      {app.clientPhone && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{app.clientPhone}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <div className="text-right mr-2 hidden sm:block">
                    <span className="text-xs font-bold text-slate-900 font-mono block">
                      R$ {app.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Sua comissão: R$ {((app.price * (currentProfessional.commissionPercentage || 50)) / 100).toFixed(2)}
                    </span>
                  </div>

                  {app.status === 'agendado' && (
                    <button
                      onClick={() => updateAppointmentStatus(app.id, 'confirmado')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Confirmar
                    </button>
                  )}

                  {app.status === 'confirmado' && (
                    <button
                      onClick={() => updateAppointmentStatus(app.id, 'em_atendimento')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Iniciar Atendimento</span>
                    </button>
                  )}

                  {app.status === 'em_atendimento' && (
                    <button
                      onClick={() => updateAppointmentStatus(app.id, 'concluido')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Concluir</span>
                    </button>
                  )}

                  {app.status !== 'cancelado' && app.status !== 'concluido' && (
                    <button
                      onClick={() => {
                        if (confirm('Deseja marcar este agendamento como cancelado?')) {
                          updateAppointmentStatus(app.id, 'cancelado');
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Cancelar agendamento"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {myAppointments.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhum agendamento encontrado para este filtro.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Compartilhe o link do seu perfil público ({publicBookingUrl}) para receber agendamentos online!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
