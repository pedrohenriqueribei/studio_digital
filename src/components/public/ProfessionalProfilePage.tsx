import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Scissors,
  CheckCircle2,
  Sparkles,
  Share2,
  ExternalLink,
  MessageCircle,
  Building2,
  ArrowRight,
  ShieldCheck,
  Star,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { findProfessionalBySlugOrId, slugify } from '../../utils/slugify';
import { formatWeekDaysLabel } from '../../utils/availability';
import { OnlineBookingModal } from './OnlineBookingModal';
import { Professional, Service } from '../../types';

export const ProfessionalProfilePage: React.FC = () => {
  const {
    currentPath,
    navigateTo,
    professionals,
    businesses,
    services,
    appointments,
    addAppointment,
    addNotification,
  } = useApp();

  // Extract slug or id from path: /p/[identifier]
  const identifier = useMemo(() => {
    return currentPath.replace('/p/', '').split('/')[0] || '';
  }, [currentPath]);

  // Resolve professional
  const professional = useMemo(() => {
    return findProfessionalBySlugOrId(professionals, identifier);
  }, [professionals, identifier]);

  // Resolve corresponding business
  const business = useMemo(() => {
    if (!professional) return businesses[0] || null;
    return businesses.find((b) => b.id === professional.businessId) || businesses[0] || null;
  }, [businesses, professional]);

  // Services offered by this professional
  const professionalServices = useMemo(() => {
    if (!professional || !business) return [];
    return services.filter(
      (s) =>
        s.businessId === business.id &&
        s.active &&
        (s.allowedProfessionalIds.length === 0 || s.allowedProfessionalIds.includes(professional.id))
    );
  }, [services, professional, business]);

  // Modal and service selection state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServiceIdForModal, setSelectedServiceIdForModal] = useState<string | undefined>();
  const [copiedLink, setCopiedLink] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Copy Profile Link handler
  const handleCopyProfileLink = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = window.location.href;
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleOpenBooking = (serviceId?: string) => {
    setSelectedServiceIdForModal(serviceId);
    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = (appointmentData: {
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
  }) => {
    if (!professional || !business) return;

    addAppointment({
      businessId: business.id,
      clientId: `cli_${Date.now()}`,
      clientName: appointmentData.clientName,
      clientPhone: appointmentData.clientPhone,
      clientEmail: appointmentData.clientEmail,
      professionalId: professional.id,
      serviceId: appointmentData.serviceId,
      serviceName: appointmentData.serviceName,
      date: appointmentData.date,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      status: 'agendado',
      price: appointmentData.servicePrice,
      paymentStatus: 'pendente',
      notes: appointmentData.notes,
    });

    addNotification({
      title: 'Novo Agendamento Online!',
      message: `${appointmentData.clientName} agendou ${appointmentData.serviceName} com ${professional.name} para o dia ${appointmentData.date} às ${appointmentData.startTime}.`,
      type: 'booking',
    });
  };

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    professionalServices.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [professionalServices]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return professionalServices.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (
        serviceSearch &&
        !s.name.toLowerCase().includes(serviceSearch.toLowerCase()) &&
        !s.description?.toLowerCase().includes(serviceSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [professionalServices, selectedCategory, serviceSearch]);

  // Format week days label and schedule
  const activeAvailability = useMemo(() => {
    if (!professional) return { daysLabel: 'Segunda a Sábado', start: '09:00', end: '19:00', periodText: null };
    const cfg = professional.availabilityConfig;
    if (cfg && cfg.active) {
      const [sY, sM, sD] = cfg.startDate.split('-');
      const [eY, eM, eD] = cfg.endDate.split('-');
      return {
        daysLabel: formatWeekDaysLabel(cfg.daysOfWeek),
        start: cfg.startTime,
        end: cfg.endTime,
        periodText: `${sD}/${sM} a ${eD}/${eM}`,
      };
    }
    return {
      daysLabel: formatWeekDaysLabel(professional.workHours?.daysOfWeek || [1, 2, 3, 4, 5, 6]),
      start: professional.workHours?.start || '09:00',
      end: professional.workHours?.end || '19:00',
      periodText: null,
    };
  }, [professional]);

  // If professional was not found: friendly discovery fallback
  if (!professional || !business) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-white tracking-tight">
              Studio Digital
            </span>
          </div>
          <button
            onClick={() => navigateTo('/')}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Voltar para o Início
          </button>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-12 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Scissors className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Perfil não encontrado</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              O link informado (<span className="font-mono text-amber-400">/p/{identifier}</span>) não corresponde a nenhum profissional ativo no momento.
            </p>
          </div>

          {professionals.length > 0 && (
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                Profissionais disponíveis para agendamento:
              </span>
              <div className="space-y-2">
                {professionals.slice(0, 4).map((p) => {
                  const pSlug = p.slug || slugify(p.name);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigateTo(`/p/${pSlug}`)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex items-center justify-between text-xs text-white hover:border-amber-500/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <span className="text-[11px] text-amber-400 font-mono">/p/{pSlug}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <span>Ir para Página Principal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </main>

        <footer className="max-w-4xl w-full mx-auto text-center py-4 text-xs text-slate-600">
          Studio Digital SaaS · Plataforma de Gestão e Agendamento Online
        </footer>
      </div>
    );
  }

  // Cover image: either custom or refined aesthetic backdrop
  const coverBannerUrl =
    professional.coverImage ||
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1400&h=450&fit=crop&crop=center';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP ANNOUNCEMENT & BRAND NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Establishment badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                {business.tradeName}
              </span>
              <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{business.city} - {business.state}</span>
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={handleCopyProfileLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              title="Copiar link deste perfil para compartilhar"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Compartilhar Perfil</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleOpenBooking()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Agendar Horário</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. COVER BANNER & HERO PROFILE SECTION */}
      <section className="relative bg-white border-b border-slate-200 pb-8">
        {/* Cover Graphic / Photo */}
        <div className="h-44 sm:h-56 md:h-64 w-full relative overflow-hidden bg-slate-900">
          <img
            src={coverBannerUrl}
            alt="Capa do perfil"
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          {/* URL identifier pill */}
          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 px-3 py-1 rounded-full text-[11px] font-mono text-amber-300 flex items-center gap-1.5 shadow-sm">
            <span>/p/{professional.slug || slugify(professional.name)}</span>
          </div>
        </div>

        {/* Profile Card Overlay */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-2">
            {/* Avatar & Identidade */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5">
              <div className="relative">
                <img
                  src={professional.avatar}
                  alt={professional.name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white shadow-xl bg-slate-100 ring-1 ring-slate-200/80"
                />
                <div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-sm"
                  title="Disponível para agendamento online"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {professional.name}
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200/60 capitalize">
                    {professional.role === 'ceo' ? 'Diretor & Especialista' : professional.role}
                  </span>
                </div>

                {/* Metadata row */}
                <p className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-800">{business.tradeName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{business.city}, {business.state}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Profissional Verificado</span>
                  </span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => handleOpenBooking()}
                className="flex-1 md:flex-initial px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Agendar Horário Online</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCopyProfileLink}
                className="px-3.5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Copiar link do perfil"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>

              <a
                href={`https://wa.me/55${professional.phone.replace(/\D/g, '') || business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${professional.name}! Encontrei seu perfil no Studio Digital e gostaria de tirar uma dúvida.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Bio & Specialties */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sobre o Especialista
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                {professional.bio ||
                  `Especialista dedicado(a) em procedimentos de alta performance no ${business.tradeName}. Atendimento personalizado com foco em resultados impecáveis, pontualidade rigorosa e satisfação garantida para cada cliente.`}
              </p>

              {/* Specialties badges */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-500 mr-2">Especialidades:</span>
                <div className="inline-flex flex-wrap gap-1.5 mt-1">
                  {professional.specialties.map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Horários de Atendimento</span>
                </div>
                {activeAvailability.periodText && (
                  <span className="text-[10px] font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    {activeAvailability.periodText}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Dias:</span>
                  <span className="font-semibold text-slate-800">{activeAvailability.daysLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expediente:</span>
                  <span className="font-semibold font-mono text-slate-800">
                    {activeAvailability.start} às {activeAvailability.end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                    {business.tradeName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE-PILLAR INFORMATION CARDS */}
      <section className="py-8 bg-slate-100/60 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Local de Atendimento */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Local de Atendimento
                </h3>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  {business.tradeName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {business.city} · {business.state} · Tel: {business.phone}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.tradeName} ${business.city} ${business.state}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors pt-1"
              >
                <span>Ver no Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card 2: Agendamento Garantido */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reserva Instantânea Online
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Sem necessidade de ligação ou espera. Escolha data e horário livre em tempo real com confirmação imediata.
                </p>
              </div>
              <button
                onClick={() => handleOpenBooking()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors pt-1 cursor-pointer"
              >
                <span>Escolher Horário</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Compromisso & Pontualidade */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pontualidade & Segurança
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Lembretes automáticos via WhatsApp, ambiente higienizado e atendimento dedicado sem atrasos.
                </p>
              </div>
              <span className="inline-block text-[11px] font-mono font-semibold text-emerald-700 pt-1">
                Satisfação 100% Garantida
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SERVICES & PRICING CATALOG */}
      <section className="py-12 bg-white flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Tabela de Procedimentos
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                Serviços Realizados por {professional.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha o serviço abaixo para agendar diretamente seu horário
              </p>
            </div>

            {/* Search input */}
            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* Category Tabs */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Todos ({professionalServices.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Services Cards Grid */}
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200 max-w-md mx-auto space-y-3">
              <Scissors className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum serviço encontrado</h4>
              <p className="text-xs text-slate-500">
                Tente ajustar o termo de busca ou selecione outra categoria.
              </p>
              <button
                onClick={() => {
                  setServiceSearch('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {service.category || 'Procedimento'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                          {service.name}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                          R$ {service.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                      {service.description || 'Atendimento de alta excelência com produtos profissionais e acabamento minucioso.'}
                    </p>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 pt-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Duração aproximada: <strong className="text-slate-800 font-mono">{service.durationMinutes} minutos</strong></span>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Horários imediatos
                    </span>

                    <button
                      onClick={() => handleOpenBooking(service.id)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Agendar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. ESTABLISHMENT INFO BANNER */}
      <section className="py-10 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                Estabelecimento Oficial
              </span>
              <h3 className="text-xl font-extrabold text-white">
                {business.tradeName}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Localizado em {business.city} - {business.state}. Espaço equipado com estrutura premium, biossegurança, estacionamento e conforto para sua melhor experiência com {professional.name}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleOpenBooking()}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Reservar com {professional.name}</span>
              </button>

              <button
                onClick={() => navigateTo('/nossos-planos')}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Conhecer o Studio Digital</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. QUIET FOOTER */}
      <footer className="py-6 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-800">{professional.name}</span> · Atendimentos em {business.tradeName}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Página Exclusiva gerada via Studio Digital SaaS
          </div>
        </div>
      </footer>

      {/* 7. MOBILE STICKY BOTTOM ACTION BAR (Capped <= 15% Viewport) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={professional.avatar}
            alt={professional.name}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{professional.name}</p>
            <p className="text-[10px] text-emerald-700 font-semibold">Horários livres hoje</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenBooking()}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Agendar</span>
        </button>
      </div>

      {/* Interactive Booking Modal */}
      <OnlineBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        professional={professional}
        business={business}
        services={professionalServices}
        initialServiceId={selectedServiceIdForModal}
        appointments={appointments}
        onConfirmBooking={handleConfirmBooking}
      />
    </div>
  );
};
