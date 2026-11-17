import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Store,
  Layers,
  TrendingUp,
  Users,
  Calendar,
  Receipt,
  Tv,
  Scissors,
  Check,
  ArrowRight,
  MapPin,
  Phone,
  Search,
  Filter,
  Crown,
  Sparkles,
  BarChart3,
  Edit2,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Business, BusinessType } from '../../types';
import { formatCurrency } from '../../utils/availability';

interface MultiUnitsManagerProps {
  onOpenNewUnit?: () => void;
}

export const MultiUnitsManager: React.FC<MultiUnitsManagerProps> = ({ onOpenNewUnit }) => {
  const {
    managedBusinesses,
    businesses,
    currentBusiness,
    switchBusiness,
    appointments,
    comandas,
    professionals,
    services,
    queueItems,
    setIsNewStudioModalOpen,
    setIsNewUnitModalOpen,
    setActiveTab,
    addNotification,
    updateBusiness,
    currentRole,
    activeClaims,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedHierarchy, setSelectedHierarchy] = useState<'all' | 'matriz' | 'filial'>('all');

  // Quick edit modal state
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editIsHeadquarters, setEditIsHeadquarters] = useState(false);

  const monthPrefix = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute unit metrics for each business in the network
  const unitsData = useMemo(() => {
    return managedBusinesses.map((biz) => {
      // Comandas fechadas no mês para esta unidade
      const bizComandas = comandas.filter((c) => {
        const d = (c.closedAt || c.createdAt || '').slice(0, 10);
        return (c.businessId === biz.id || (c as any).tenant_id === biz.id) &&
          d.startsWith(monthPrefix) &&
          c.status === 'fechada';
      });
      const comandaRev = bizComandas.reduce((sum, c) => sum + (c.total || 0), 0);

      // Agendamentos pagos / concluídos do mês
      const bizApps = appointments.filter((a) => {
        return (a.businessId === biz.id || (a as any).tenant_id === biz.id) &&
          a.date.startsWith(monthPrefix) &&
          (a.status === 'concluido' || a.paymentStatus === 'pago');
      });
      const appsRev = bizApps.reduce((sum, a) => sum + (a.price || 0), 0);

      // Faturamento da unidade
      const revenue = comandaRev > 0 ? comandaRev : appsRev;

      // Atendimentos do mês e de hoje
      const totalAppsMonth = appointments.filter((a) => {
        return (a.businessId === biz.id || (a as any).tenant_id === biz.id) &&
          a.date.startsWith(monthPrefix) &&
          a.status !== 'cancelado';
      }).length;

      const totalAppsToday = appointments.filter((a) => {
        return (a.businessId === biz.id || (a as any).tenant_id === biz.id) &&
          a.date === todayStr &&
          a.status !== 'cancelado';
      }).length;

      // Profissionais alocados nesta unidade
      const prosCount = professionals.filter(
        (p) => p.businessId === biz.id || (p as any).tenant_id === biz.id
      ).length;

      // Serviços no catálogo desta unidade
      const servicesCount = services.filter(
        (s) => s.businessId === biz.id || (s as any).tenant_id === biz.id
      ).length;

      // Fila de espera agora
      const queueWaitingCount = queueItems.filter(
        (q) => (q.businessId === biz.id || (q as any).tenant_id === biz.id) &&
          (q.status === 'aguardando' || q.status === 'chamado')
      ).length;

      // Comandas abertas no momento
      const openComandasCount = comandas.filter(
        (c) => (c.businessId === biz.id || (c as any).tenant_id === biz.id) && c.status === 'aberta'
      ).length;

      return {
        business: biz,
        revenue,
        totalAppsMonth,
        totalAppsToday,
        prosCount,
        servicesCount,
        queueWaitingCount,
        openComandasCount,
        isCurrent: currentBusiness ? currentBusiness.id === biz.id : false,
      };
    });
  }, [managedBusinesses, comandas, appointments, professionals, services, queueItems, currentBusiness, monthPrefix, todayStr]);

  // Consolidated Totals across the network
  const networkSummary = useMemo(() => {
    const totalUnits = unitsData.length;
    const totalHeadquarters = unitsData.filter((u) => u.business.isHeadquarters).length;
    const totalBranches = totalUnits - totalHeadquarters;
    const totalRevenue = unitsData.reduce((acc, u) => acc + u.revenue, 0);
    const totalAppointmentsMonth = unitsData.reduce((acc, u) => acc + u.totalAppsMonth, 0);
    const totalAppointmentsToday = unitsData.reduce((acc, u) => acc + u.totalAppsToday, 0);
    const totalPros = unitsData.reduce((acc, u) => acc + u.prosCount, 0);
    const totalQueueWaiting = unitsData.reduce((acc, u) => acc + u.queueWaitingCount, 0);
    const totalOpenComandas = unitsData.reduce((acc, u) => acc + u.openComandasCount, 0);

    return {
      totalUnits,
      totalHeadquarters,
      totalBranches,
      totalRevenue,
      totalAppointmentsMonth,
      totalAppointmentsToday,
      totalPros,
      totalQueueWaiting,
      totalOpenComandas,
    };
  }, [unitsData]);

  // Filtered units list
  const filteredUnits = useMemo(() => {
    return unitsData.filter(({ business }) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        business.tradeName.toLowerCase().includes(q) ||
        business.name.toLowerCase().includes(q) ||
        business.city.toLowerCase().includes(q) ||
        business.state.toLowerCase().includes(q) ||
        (business.unitCode || '').toLowerCase().includes(q);

      const matchType = selectedType === 'all' || business.type === selectedType;

      const matchHierarchy =
        selectedHierarchy === 'all' ||
        (selectedHierarchy === 'matriz' && business.isHeadquarters) ||
        (selectedHierarchy === 'filial' && !business.isHeadquarters);

      return matchSearch && matchType && matchHierarchy;
    });
  }, [unitsData, searchQuery, selectedType, selectedHierarchy]);

  // Switch and navigate helper
  const handleSwitchAndGo = (businessId: string, tab?: 'agenda' | 'fila' | 'profissionais' | 'comandas') => {
    switchBusiness(businessId);
    if (tab) {
      setActiveTab(tab);
    }
    const target = managedBusinesses.find((b) => b.id === businessId);
    addNotification({
      title: 'Unidade Alternada',
      message: `Você agora está gerenciando: ${target?.tradeName || 'Estabelecimento'}.`,
      type: 'system',
    });
  };

  const handleOpenEdit = (biz: Business) => {
    setEditingBusiness(biz);
    setEditName(biz.tradeName || biz.name);
    setEditCity(biz.city || '');
    setEditState(biz.state || 'SP');
    setEditPhone(biz.phone || '');
    setEditAddress(biz.address || '');
    setEditUnitCode(biz.unitCode || '');
    setEditIsHeadquarters(Boolean(biz.isHeadquarters));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;

    updateBusiness({
      ...editingBusiness,
      name: editName.trim(),
      tradeName: editName.trim(),
      city: editCity.trim(),
      state: editState.trim().toUpperCase(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
      unitCode: editUnitCode.trim() || undefined,
      isHeadquarters: editIsHeadquarters,
    });

    addNotification({
      title: 'Unidade Atualizada',
      message: `Os dados da unidade ${editName} foram atualizados com sucesso.`,
      type: 'system',
    });
    setEditingBusiness(null);
  };

  const getSegmentBadge = (type: BusinessType) => {
    switch (type) {
      case 'barbearia':
        return { label: 'Barbearia', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'clinica_estetica':
        return { label: 'Clínica de Estética', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'salao_beleza':
        return { label: 'Salão de Beleza', bg: 'bg-pink-50 text-pink-800 border-pink-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Central Executive Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Gestão Centralizada de Multi-Estabelecimentos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
              Rede Multi-Unidades
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Painel consolidado para proprietários e gestores. Acompanhe a performance geral de todas as unidades e alterne entre filiais em 1 clique mantendo agendas, catálogos e profissionais totalmente isolados.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={() => (setIsNewUnitModalOpen ? setIsNewUnitModalOpen(true) : setIsNewStudioModalOpen(true))}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-98 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Cadastrar Nova Unidade / Filial</span>
          </button>
        </div>
      </div>

      {/* 2. Consolidated Network KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total de Unidades */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Total na Rede
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {networkSummary.totalUnits}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {networkSummary.totalUnits === 1 ? 'estabelecimento' : 'unidades'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Matrizes: <strong>{networkSummary.totalHeadquarters}</strong></span>
            <span>Filiais: <strong>{networkSummary.totalBranches}</strong></span>
          </div>
        </div>

        {/* KPI 2: Faturamento Consolidado */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Faturamento Consolidado
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {formatCurrency(networkSummary.totalRevenue)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
            Soma de todas as unidades no mês
          </div>
        </div>

        {/* KPI 3: Atendimentos da Rede */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              Atendimentos no Mês
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {networkSummary.totalAppointmentsMonth}
            </span>
            <span className="text-xs text-slate-500 font-medium">realizados</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Hoje na rede:</span>
            <strong className="text-blue-700 font-mono">{networkSummary.totalAppointmentsToday} agendamentos</strong>
          </div>
        </div>

        {/* KPI 4: Profissionais na Rede */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Equipe da Rede
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-900 font-mono tracking-tight">
              {networkSummary.totalPros}
            </span>
            <span className="text-xs text-slate-500 font-medium">especialistas</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 truncate">
            Distribuídos entre as unidades
          </div>
        </div>

        {/* KPI 5: Fila de Espera em Tempo Real */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Fila em Espera (Rede)
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 font-mono tracking-tight">
              {networkSummary.totalQueueWaiting}
            </span>
            <span className="text-xs text-slate-500 font-medium">clientes aguardando</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Comandas abertas:</span>
            <strong className="text-slate-800 font-mono">{networkSummary.totalOpenComandas}</strong>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por unidade, código, cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Segment Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">Todos os Segmentos</option>
            <option value="barbearia">Barbearias</option>
            <option value="clinica_estetica">Clínicas de Estética</option>
            <option value="salao_beleza">Salões de Beleza</option>
          </select>

          {/* Hierarchy Filter */}
          <select
            value={selectedHierarchy}
            onChange={(e) => setSelectedHierarchy(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">Matrizes & Filiais</option>
            <option value="matriz">Apenas Matrizes</option>
            <option value="filial">Apenas Filiais</option>
          </select>
        </div>
      </div>

      {/* 4. Units Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map(({ business, revenue, totalAppsMonth, totalAppsToday, prosCount, servicesCount, queueWaitingCount, openComandasCount, isCurrent }) => {
          const segBadge = getSegmentBadge(business.type);

          return (
            <div
              key={business.id}
              className={`bg-white rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-sm ${
                isCurrent
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Accent Header Bar */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: business.accentColor || '#0f172a' }}
                />

                <div className="p-5 space-y-4">
                  {/* Top Unit Tags */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${segBadge.bg}`}>
                        {segBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                        business.isHeadquarters
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {business.isHeadquarters ? 'MATRIZ' : (business.unitCode || 'FILIAL')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(business)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar dados da unidade"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Location */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug flex items-center gap-2">
                      <span>{business.tradeName}</span>
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Unidade atualmente selecionada" />
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {business.address ? `${business.address}, ` : ''}{business.city} - {business.state}
                      </span>
                    </div>
                    {business.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{business.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Operational Metrics (Isoladas desta Unidade) */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                        Faturamento Mês
                      </span>
                      <span className="text-sm font-bold text-emerald-700 font-mono block">
                        {formatCurrency(revenue)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                        Atendimentos
                      </span>
                      <span className="text-sm font-bold text-slate-900 font-mono block">
                        {totalAppsMonth} <span className="text-[11px] font-normal text-slate-500">({totalAppsToday} hoje)</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                        Equipe Alocada
                      </span>
                      <span className="text-sm font-bold text-indigo-900 font-mono block">
                        {prosCount} <span className="text-[11px] font-normal text-slate-500">profissionais</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-0.5">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                        Fila Virtual Agora
                      </span>
                      <span className="text-sm font-bold text-amber-800 font-mono block flex items-center gap-1">
                        <span>{queueWaitingCount}</span>
                        <span className="text-[11px] font-normal text-slate-500">aguardando</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions for the Unit */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-2.5">
                {isCurrent ? (
                  <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Unidade Ativa em Operação</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSwitchAndGo(business.id)}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <span>Acessar e Gerenciar Esta Unidade</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                )}

                {/* Direct Sub-View Links */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    onClick={() => handleSwitchAndGo(business.id, 'agenda')}
                    className="py-1 px-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/80 rounded-lg transition-colors text-center cursor-pointer truncate"
                    title="Abrir agenda da unidade"
                  >
                    Agenda
                  </button>
                  <button
                    onClick={() => handleSwitchAndGo(business.id, 'fila')}
                    className="py-1 px-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/80 rounded-lg transition-colors text-center cursor-pointer truncate"
                    title="Abrir fila virtual da unidade"
                  >
                    Fila & TV
                  </button>
                  <button
                    onClick={() => handleSwitchAndGo(business.id, 'profissionais')}
                    className="py-1 px-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/80 rounded-lg transition-colors text-center cursor-pointer truncate"
                    title="Gerenciar equipe da unidade"
                  >
                    Equipe
                  </button>
                  <button
                    onClick={() => handleSwitchAndGo(business.id, 'comandas')}
                    className="py-1 px-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200/80 rounded-lg transition-colors text-center cursor-pointer truncate"
                    title="Abrir caixa da unidade"
                  >
                    Caixa
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUnits.length === 0 && (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
          <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">Nenhuma unidade encontrada</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não há estabelecimentos correspondentes aos filtros selecionados.
          </p>
        </div>
      )}

      {/* 5. Quick Edit Unit Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 w-full max-w-lg max-h-[85vh] flex flex-col my-auto overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white/95 backdrop-blur-xs shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-2xs">
                  <Store className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Editar Dados da Unidade
                  </h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Atualize os dados operacionais e cadastrais desta unidade
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingBusiness(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain [overscroll-behavior:contain]">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome da Unidade / Fantasia
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Código / Sigla da Filial
                  </label>
                  <input
                    type="text"
                    value={editUnitCode}
                    onChange={(e) => setEditUnitCode(e.target.value.toUpperCase())}
                    placeholder="Ex: FILIAL-02"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    required
                    value={editState}
                    onChange={(e) => setEditState(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 uppercase text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Endereço / Logradouro
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Ex: Av. Ibirapuera, 1200"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsHeadquarters"
                  checked={editIsHeadquarters}
                  onChange={(e) => setEditIsHeadquarters(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="editIsHeadquarters" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Marcar como Matriz da rede
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-md z-10 -mx-6 -mb-6 px-6 pb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-98"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
