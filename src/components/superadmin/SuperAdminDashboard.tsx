import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  Crown,
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Shield,
  DollarSign,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Business, BusinessType, Professional, SaaSPlan, TenantStatus, UserRole } from '../../types';
import { slugify } from '../../utils/slugify';
import { SuperAdminClaimsManager } from './SuperAdminClaimsManager';

export const SuperAdminDashboard: React.FC = () => {
  const {
    superAdminUser,
    logoutSuperAdmin,
    superAdminTab,
    setSuperAdminTab,
    businesses,
    updateBusiness,
    setTenantStatus,
    changeTenantPlan,
    deleteBusiness,
    switchBusiness,
    professionals,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    saasPlans,
    addSaasPlan,
    updateSaasPlan,
    deleteSaasPlan,
    setIsNewStudioModalOpen,
    setIsSuperAdminView,
    appointments,
    navigateTo,
  } = useApp();

  // Tenant filters and search
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>('all');
  const [tenantTypeFilter, setTenantTypeFilter] = useState<string>('all');

  // Password visibility states
  const [showTenantManagerPassword, setShowTenantManagerPassword] = useState(false);
  const [showProPassword, setShowProPassword] = useState(false);

  // Tenant Edit Modal state
  const [editingTenant, setEditingTenant] = useState<Business | null>(null);
  const [tenantFormData, setTenantFormData] = useState<Partial<Business>>({});

  // Professional filters and modal state
  const [proSearch, setProSearch] = useState('');
  const [proTenantFilter, setProTenantFilter] = useState<string>('all');
  const [isNewProModalOpen, setIsNewProModalOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<Professional | null>(null);
  const [proFormData, setProFormData] = useState({
    businessId: '',
    name: '',
    email: '',
    password: 'pro123',
    phone: '',
    role: 'profissional' as UserRole,
    specialties: 'Atendimento',
    commissionPercentage: 50,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
    workStart: '09:00',
    workEnd: '19:00',
  });

  // SaaS Plan Edit / Create Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    priceMonthly: 199,
    maxProfessionals: 5,
    maxUnits: 1,
    features: '',
    isPopular: false,
    description: '',
  });

  // Filtered Tenants
  const filteredTenants = useMemo(() => {
    return businesses.filter((b) => {
      if (tenantStatusFilter !== 'all' && b.status !== tenantStatusFilter) return false;
      if (tenantTypeFilter !== 'all' && b.type !== tenantTypeFilter) return false;
      if (tenantSearch.trim()) {
        const q = tenantSearch.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.tradeName.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          (b.cnpj && b.cnpj.includes(q))
        );
      }
      return true;
    });
  }, [businesses, tenantStatusFilter, tenantTypeFilter, tenantSearch]);

  // Filtered Professionals across all tenants
  const filteredProfessionals = useMemo(() => {
    return professionals.filter((p) => {
      if (proTenantFilter !== 'all' && p.businessId !== proTenantFilter) return false;
      if (proSearch.trim()) {
        const q = proSearch.toLowerCase();
        const bizName = businesses.find((b) => b.id === p.businessId)?.tradeName || '';
        return (
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          bizName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [professionals, proTenantFilter, proSearch, businesses]);

  // Global Platform Metrics
  const platformStats = useMemo(() => {
    const totalTenants = businesses.length;
    const activeTenants = businesses.filter((b) => b.status === 'ativo').length;
    const totalPros = professionals.length;
    const totalAppointmentsMonth = appointments.length;

    // Monthly Recurring Revenue calculated from active tenants and their SaaS plan price
    const mrr = businesses.reduce((acc, b) => {
      if (b.status === 'suspenso') return acc;
      const plan = saasPlans.find((p) => p.id === b.planId);
      return acc + (plan?.priceMonthly || 199);
    }, 0);

    return { totalTenants, activeTenants, totalPros, totalAppointmentsMonth, mrr };
  }, [businesses, professionals, appointments, saasPlans]);

  // Handle Tenant Edit
  const openEditTenant = (b: Business) => {
    setEditingTenant(b);
    setTenantFormData({ ...b });
  };

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant && tenantFormData) {
      updateBusiness({ ...editingTenant, ...tenantFormData } as Business);
      setEditingTenant(null);
    }
  };

  // Handle Global Professional Submit
  const handleSavePro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proFormData.name.trim() || !proFormData.businessId) {
      alert('Selecione o estabelecimento e preencha o nome do profissional.');
      return;
    }

    const specs = proFormData.specialties.split(',').map((s) => s.trim()).filter(Boolean);

    if (editingPro) {
      updateProfessional({
        ...editingPro,
        businessId: proFormData.businessId,
        name: proFormData.name,
        email: proFormData.email,
        password: proFormData.password || editingPro.password || 'pro123',
        phone: proFormData.phone,
        role: proFormData.role,
        avatar: proFormData.avatar || editingPro.avatar,
        specialties: specs.length > 0 ? specs : ['Especialista'],
        commissionPercentage: proFormData.commissionPercentage,
        workHours: {
          start: proFormData.workStart,
          end: proFormData.workEnd,
          daysOfWeek: [1, 2, 3, 4, 5, 6],
        },
      });
      setEditingPro(null);
    } else {
      addProfessional({
        businessId: proFormData.businessId,
        name: proFormData.name,
        email: proFormData.email,
        password: proFormData.password || 'pro123',
        phone: proFormData.phone,
        role: proFormData.role,
        avatar: proFormData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
        specialties: specs.length > 0 ? specs : ['Especialista'],
        commissionPercentage: proFormData.commissionPercentage,
        active: true,
        workHours: {
          start: proFormData.workStart,
          end: proFormData.workEnd,
          daysOfWeek: [1, 2, 3, 4, 5, 6],
        },
      });
      setIsNewProModalOpen(false);
    }
  };

  // Handle SaaS Plan Save
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormData.name.trim()) return;

    const featureList = planFormData.features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    if (editingPlan) {
      updateSaasPlan({
        ...editingPlan,
        name: planFormData.name,
        priceMonthly: planFormData.priceMonthly,
        maxProfessionals: planFormData.maxProfessionals,
        maxUnits: planFormData.maxUnits,
        features: featureList,
        isPopular: planFormData.isPopular,
        description: planFormData.description,
      });
    } else {
      addSaasPlan({
        name: planFormData.name,
        priceMonthly: planFormData.priceMonthly,
        maxProfessionals: planFormData.maxProfessionals,
        maxUnits: planFormData.maxUnits,
        features: featureList,
        isPopular: planFormData.isPopular,
        description: planFormData.description,
      });
    }
    setIsPlanModalOpen(false);
    setEditingPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Top Banner & CEO Status */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-slate-800/90 px-3 py-1 rounded-md border border-slate-700">
                Super Admin Master · CEO da Plataforma
              </span>
              <span className="text-xs text-slate-400">· Sessão Autorizada</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Painel de Gestão Multi-Tenant & SaaS
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Autenticado como <strong className="text-white font-semibold">{superAdminUser.name}</strong> ({superAdminUser.email}).
              Você possui controle irrestrito sobre estabelecimentos cadastrados, equipes e planos de contratação.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewStudioModalOpen(true)}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              <span>+ Cadastrar Estabelecimento</span>
            </button>

            <button
              onClick={() => {
                setIsSuperAdminView(false);
                navigateTo('/app/gerente/dashboard');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Ver Workspace de um Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global SaaS Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>MRR da Plataforma (Mensal)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            R$ {platformStats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Assinaturas SaaS recorrentes</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Tenants Cadastrados</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {platformStats.totalTenants}
          </p>
          <span className="text-[11px] text-slate-500">
            {platformStats.activeTenants} em operação ativa
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total de Profissionais</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {platformStats.totalPros}
          </p>
          <span className="text-[11px] text-slate-500">Distribuição entre os studios</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Planos SaaS Disponíveis</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {saasPlans.length} planos
          </p>
          <button
            onClick={() => setSuperAdminTab('planos')}
            className="text-[11px] text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-1 mt-1"
          >
            <span>Gerenciar preços e limites</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Super Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'tenants', label: 'Gestão de Tenants (Estabelecimentos)', icon: Building2, count: businesses.length },
          { id: 'profissionais', label: 'Gestão Global de Profissionais', icon: Users, count: professionals.length },
          { id: 'planos', label: 'Planos de Contratação SaaS', icon: Crown, count: saasPlans.length },
          { id: 'metricas', label: 'Visão Geral & Métricas da Plataforma', icon: TrendingUp },
          { id: 'claims', label: 'Custom Claims & RBAC', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = superAdminTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setSuperAdminTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono tabular-nums ${
                    isActive ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GESTÃO DE TENANTS */}
      {superAdminTab === 'tenants' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Buscar tenant por nome, cidade ou CNPJ..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
                />
              </div>

              <select
                value={tenantStatusFilter}
                onChange={(e) => setTenantStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="degustacao">Degustação / Trial</option>
                <option value="suspenso">Suspenso</option>
              </select>

              <select
                value={tenantTypeFilter}
                onChange={(e) => setTenantTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">Todos os Segmentos</option>
                <option value="clinica_estetica">Clínica de Estética</option>
                <option value="barbearia">Barbearia</option>
                <option value="salao_beleza">Salão de Beleza</option>
              </select>
            </div>

            <button
              onClick={() => setIsNewStudioModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-stretch md:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Tenant</span>
            </button>
          </div>

          {/* Tenants Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Estabelecimento / Razão Social</th>
                    <th className="py-3 px-4">Segmento</th>
                    <th className="py-3 px-4">Localização & Contato</th>
                    <th className="py-3 px-4">Plano Contratado</th>
                    <th className="py-3 px-4">Equipe Vinculada</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTenants.map((b) => {
                    const plan = saasPlans.find((p) => p.id === b.planId);
                    const teamCount = professionals.filter((p) => p.businessId === b.id).length;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                              style={{ backgroundColor: b.accentColor || '#0f172a' }}
                            >
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {b.tradeName}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {b.name} {b.cnpj ? `· CNPJ ${b.cnpj}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 capitalize">
                          {b.type === 'clinica_estetica'
                            ? 'Clínica de Estética'
                            : b.type === 'barbearia'
                            ? 'Barbearia'
                            : 'Salão de Beleza'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div>{b.city} - {b.state}</div>
                          <div className="text-[11px] text-slate-400">{b.phone}</div>
                          {b.managerEmail && (
                            <div className="text-[11px] text-indigo-600 font-medium truncate max-w-[180px]" title={`Gerente: ${b.managerName || ''} (${b.managerEmail})`}>
                              👤 {b.managerName || b.managerEmail}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 uppercase font-mono block">
                            {plan?.name || b.planId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                            R$ {plan?.priceMonthly || 199}/mês
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 font-mono tabular-nums">
                            {teamCount} profissionais
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                              b.status === 'ativo'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : b.status === 'degustacao'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {b.status || 'ativo'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => switchBusiness(b.id)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Acessar painel do studio"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => openEditTenant(b)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar dados cadastrais e plano"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {b.status === 'ativo' ? (
                              <button
                                onClick={() => setTenantStatus(b.id, 'suspenso')}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Suspender tenant"
                              >
                                <PauseCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setTenantStatus(b.id, 'ativo')}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Ativar tenant"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (confirm(`Deseja realmente remover o tenant "${b.tradeName}" da plataforma?`)) {
                                  deleteBusiness(b.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir tenant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredTenants.length === 0 && (
              <div className="p-12 text-center text-xs text-slate-500">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-800 text-sm">Nenhum estabelecimento cadastrado na plataforma</p>
                <p className="text-slate-400 mt-1">Todos os dados mock foram apagados. Cadastre o primeiro estabelecimento para começar.</p>
                <button
                  onClick={() => setIsNewStudioModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Cadastrar Primeiro Estabelecimento</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GESTÃO GLOBAL DE PROFISSIONAIS */}
      {superAdminTab === 'profissionais' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={proSearch}
                  onChange={(e) => setProSearch(e.target.value)}
                  placeholder="Buscar profissional por nome ou e-mail..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
                />
              </div>

              <select
                value={proTenantFilter}
                onChange={(e) => setProTenantFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none"
              >
                <option value="all">Todos os Estabelecimentos</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tradeName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setEditingPro(null);
                setProFormData({
                  businessId: businesses[0]?.id || '',
                  name: '',
                  email: '',
                  password: 'pro123',
                  phone: '',
                  role: 'profissional',
                  specialties: 'Atendimento',
                  commissionPercentage: 50,
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
                  workStart: '09:00',
                  workEnd: '19:00',
                });
                setIsNewProModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-stretch md:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cadastrar Profissional em um Studio</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-4">Estabelecimento Vinculado</th>
                    <th className="py-3 px-4">Função no Sistema</th>
                    <th className="py-3 px-4">Especialidades</th>
                    <th className="py-3 px-4">Comissão Padrão</th>
                    <th className="py-3 px-4">Ganhos no Mês</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProfessionals.map((pro) => {
                    const tenant = businesses.find((b) => b.id === pro.businessId);

                    return (
                      <tr key={pro.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={pro.avatar}
                              alt={pro.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <span className="font-bold text-slate-900 block truncate">
                                {pro.name}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {pro.email} · {pro.phone}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">
                            {tenant?.tradeName || 'Não vinculado'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 capitalize">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${
                              pro.role === 'ceo'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : pro.role === 'gerente'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {pro.role === 'ceo' ? 'CEO do Studio' : pro.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                          {pro.specialties.join(', ')}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {pro.commissionPercentage}%
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          R$ {(pro.totalEarningsMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(() => {
                              const pSlug = pro.slug || slugify(pro.name);
                              return (
                                <button
                                  onClick={() => navigateTo(`/p/${pSlug}`)}
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold border border-amber-200"
                                  title={`Ver página pública exclusiva de agendamento (/p/${pSlug})`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="hidden xl:inline">Ver Perfil</span>
                                </button>
                              );
                            })()}

                            <button
                              onClick={() => {
                                setEditingPro(pro);
                                setProFormData({
                                  businessId: pro.businessId,
                                  name: pro.name,
                                  email: pro.email,
                                  password: pro.password || 'pro123',
                                  phone: pro.phone,
                                  role: pro.role,
                                  specialties: pro.specialties.join(', '),
                                  commissionPercentage: pro.commissionPercentage,
                                  avatar: pro.avatar,
                                  workStart: pro.workHours.start,
                                  workEnd: pro.workHours.end,
                                });
                                setIsNewProModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar profissional"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Remover "${pro.name}" da equipe?`)) {
                                  deleteProfessional(pro.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir profissional"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GESTÃO DE PLANOS DE CONTRATAÇÃO SAAS */}
      {superAdminTab === 'planos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gestão dos Planos de Contratação SaaS
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina preços mensais, limites de profissionais cadastrados e recursos habilitados
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanFormData({
                  name: '',
                  priceMonthly: 199,
                  maxProfessionals: 5,
                  maxUnits: 1,
                  features: 'Agenda online inteligente\nComandas & Caixa POS\nNotificações WhatsApp',
                  isPopular: false,
                  description: '',
                });
                setIsPlanModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Novo Plano SaaS</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {saasPlans.map((plan) => {
              const activeCount = businesses.filter((b) => b.planId === plan.id).length;
              const subtotalMRR = activeCount * plan.priceMonthly;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
                    plan.isPopular
                      ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-sm'
                      : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-full tracking-wide">
                      Destaque na Plataforma
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingPlan(plan);
                            setPlanFormData({
                              name: plan.name,
                              priceMonthly: plan.priceMonthly,
                              maxProfessionals: plan.maxProfessionals,
                              maxUnits: plan.maxUnits,
                              features: plan.features.join('\n'),
                              isPopular: !!plan.isPopular,
                              description: plan.description || '',
                            });
                            setIsPlanModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                          title="Editar plano"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {saasPlans.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover o plano "${plan.name}"?`)) {
                                deleteSaasPlan(plan.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Remover plano"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
                        R$ {plan.priceMonthly}
                      </span>
                      <span className="text-xs text-slate-500"> / mês por estabelecimento</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-4 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Limite de Profissionais:</span>
                        <span className="font-bold text-slate-900 font-mono tabular-nums">
                          {plan.maxProfessionals >= 999 ? 'Ilimitado' : `Até ${plan.maxProfessionals}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Limite de Filiais/Unidades:</span>
                        <span className="font-bold text-slate-900 font-mono tabular-nums">
                          {plan.maxUnits} {plan.maxUnits > 1 ? 'unidades' : 'unidade'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Studios Assinantes:</span>
                        <span className="font-bold text-indigo-700 font-mono tabular-nums">
                          {activeCount} ({subtotalMRR > 0 ? `R$ ${subtotalMRR}/mês` : 'R$ 0'})
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                        Recursos Inclusos:
                      </span>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanFormData({
                        name: plan.name,
                        priceMonthly: plan.priceMonthly,
                        maxProfessionals: plan.maxProfessionals,
                        maxUnits: plan.maxUnits,
                        features: plan.features.join('\n'),
                        isPopular: !!plan.isPopular,
                        description: plan.description || '',
                      });
                      setIsPlanModalOpen(true);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Editar Configurações do Plano
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: VISÃO GERAL & MÉTRICAS DA PLATAFORMA */}
      {superAdminTab === 'metricas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Distribuição por Segmento</span>
              </h3>
              <div className="space-y-2 text-xs">
                {['clinica_estetica', 'barbearia', 'salao_beleza'].map((type) => {
                  const count = businesses.filter((b) => b.type === type).length;
                  const label =
                    type === 'clinica_estetica'
                      ? 'Clínicas de Estética'
                      : type === 'barbearia'
                      ? 'Barbearias'
                      : 'Salões de Beleza';
                  const pct = Math.round((count / Math.max(1, businesses.length)) * 100);

                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>{label}</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-900 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Assinantes por Plano SaaS</span>
              </h3>
              <div className="space-y-2 text-xs">
                {saasPlans.map((plan) => {
                  const count = businesses.filter((b) => b.planId === plan.id).length;
                  const pct = Math.round((count / Math.max(1, businesses.length)) * 100);

                  return (
                    <div key={plan.id} className="space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Plano {plan.name}</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {count} studios
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Super Administrador da Plataforma</span>
              </h3>
              <div className="text-xs space-y-2 text-slate-600">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <img
                    src={superAdminUser.avatar}
                    alt={superAdminUser.name}
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{superAdminUser.name}</span>
                    <span className="text-[11px] text-slate-500 block">{superAdminUser.email}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">{superAdminUser.title}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Conta autorizada com permissão root para provisionar tenants, suspender contas e editar tabelas de preços do software.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CUSTOM CLAIMS & RBAC MANAGER */}
      {superAdminTab === 'claims' && <SuperAdminClaimsManager />}

      {/* MODAL: EDIT TENANT */}
      {editingTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">
                Gerenciar Tenant: {editingTenant.tradeName}
              </h3>
              <button
                onClick={() => setEditingTenant(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  required
                  value={tenantFormData.tradeName || ''}
                  onChange={(e) =>
                    setTenantFormData({ ...tenantFormData, tradeName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Segmento
                  </label>
                  <select
                    value={tenantFormData.type}
                    onChange={(e) =>
                      setTenantFormData({
                        ...tenantFormData,
                        type: e.target.value as BusinessType,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
                  >
                    <option value="clinica_estetica">Clínica de Estética</option>
                    <option value="barbearia">Barbearia</option>
                    <option value="salao_beleza">Salão de Beleza</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Plano de Contratação SaaS
                  </label>
                  <select
                    value={tenantFormData.planId}
                    onChange={(e) =>
                      setTenantFormData({ ...tenantFormData, planId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white uppercase font-mono font-semibold"
                  >
                    {saasPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (R$ {p.priceMonthly}/mês)
                      </option>
                    ))}
                  </select>
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
                    value={tenantFormData.city || ''}
                    onChange={(e) =>
                      setTenantFormData({ ...tenantFormData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
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
                    value={tenantFormData.state || ''}
                    onChange={(e) =>
                      setTenantFormData({ ...tenantFormData, state: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 uppercase text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Status do Tenant
                  </label>
                  <select
                    value={tenantFormData.status}
                    onChange={(e) =>
                      setTenantFormData({
                        ...tenantFormData,
                        status: e.target.value as TenantStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="degustacao">Degustação / Trial</option>
                    <option value="suspenso">Suspenso</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={tenantFormData.phone || ''}
                    onChange={(e) =>
                      setTenantFormData({ ...tenantFormData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Manager Profile & Firebase Auth Credentials */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Acesso do Gerente (Firebase Auth)
                  </span>
                </div>
                <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Nome do Gerente
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo do gerente"
                      value={tenantFormData.managerName || ''}
                      onChange={(e) =>
                        setTenantFormData({ ...tenantFormData, managerName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        E-mail de Login
                      </label>
                      <input
                        type="email"
                        placeholder="gerente@studio.com"
                        value={tenantFormData.managerEmail || ''}
                        onChange={(e) =>
                          setTenantFormData({ ...tenantFormData, managerEmail: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Senha de Acesso
                      </label>
                      <div className="relative">
                        <input
                          type={showTenantManagerPassword ? 'text' : 'password'}
                          placeholder="Senha de acesso"
                          value={tenantFormData.managerPassword || ''}
                          onChange={(e) =>
                            setTenantFormData({ ...tenantFormData, managerPassword: e.target.value })
                          }
                          className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTenantManagerPassword(!showTenantManagerPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showTenantManagerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER / EDIT PROFESSIONAL (CROSS-TENANT) */}
      {isNewProModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">
                {editingPro ? 'Editar Profissional' : 'Cadastrar Profissional em um Studio'}
              </h3>
              <button
                onClick={() => {
                  setIsNewProModalOpen(false);
                  setEditingPro(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePro} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Estabelecimento / Tenant de Destino
                </label>
                <select
                  required
                  value={proFormData.businessId}
                  onChange={(e) => setProFormData({ ...proFormData, businessId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white font-semibold"
                >
                  <option value="">Selecione o Studio...</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.tradeName} ({b.type.replace('_', ' ')}) - {b.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do especialista"
                  value={proFormData.name}
                  onChange={(e) => setProFormData({ ...proFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    E-mail (Login Firebase Auth)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@studio.com.br"
                    value={proFormData.email}
                    onChange={(e) => setProFormData({ ...proFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showProPassword ? 'text' : 'password'}
                      required
                      placeholder="Senha de acesso"
                      value={proFormData.password}
                      onChange={(e) => setProFormData({ ...proFormData, password: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProPassword(!showProPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showProPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={proFormData.phone}
                    onChange={(e) => setProFormData({ ...proFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Papel no Studio
                  </label>
                  <select
                    value={proFormData.role}
                    onChange={(e) =>
                      setProFormData({ ...proFormData, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
                  >
                    <option value="profissional">Profissional / Atendente</option>
                    <option value="gerente">Gerente Operacional</option>
                    <option value="ceo">CEO / Sócio do Studio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Comissão Padrão (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={proFormData.commissionPercentage}
                    onChange={(e) =>
                      setProFormData({
                        ...proFormData,
                        commissionPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Especialidades
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Corte Degradê, Mechas..."
                    value={proFormData.specialties}
                    onChange={(e) =>
                      setProFormData({ ...proFormData, specialties: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewProModalOpen(false);
                    setEditingPro(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAAS PLAN CREATE / EDIT */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlan ? `Editar Plano: ${editingPlan.name}` : 'Criar Novo Plano de Assinatura SaaS'}
              </h3>
              <button
                onClick={() => {
                  setIsPlanModalOpen(false);
                  setEditingPlan(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Studio Plus, Barber Gold, Estética Diamond..."
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Preço Mensal (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    required
                    value={planFormData.priceMonthly}
                    onChange={(e) =>
                      setPlanFormData({ ...planFormData, priceMonthly: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Máx. Profissionais
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planFormData.maxProfessionals}
                    onChange={(e) =>
                      setPlanFormData({
                        ...planFormData,
                        maxProfessionals: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Máx. Filiais/Unidades
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planFormData.maxUnits}
                    onChange={(e) =>
                      setPlanFormData({ ...planFormData, maxUnits: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Recursos Inclusos (um por linha)
                </label>
                <textarea
                  rows={4}
                  required
                  value={planFormData.features}
                  onChange={(e) => setPlanFormData({ ...planFormData, features: e.target.value })}
                  placeholder="Agenda online inteligente&#10;Controle de comandas e caixa&#10;Notificações via WhatsApp"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planFormData.isPopular}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, isPopular: e.target.checked })
                  }
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span className="font-semibold">Destacar como "Mais Popular" na contratação</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlanModalOpen(false);
                    setEditingPlan(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Salvar Plano SaaS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
