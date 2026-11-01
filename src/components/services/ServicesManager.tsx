import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Plus,
  Clock,
  DollarSign,
  Percent,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Users,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Layers,
  Filter,
  UserCheck,
  Shield,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Service, Professional } from '../../types';
import { MaskedInput } from '../ui/MaskedInput';

// Sugestões de categorias frequentes
const SUGGESTED_CATEGORIES = [
  'Facial',
  'Corporal',
  'Cabelo',
  'Barba',
  'Unhas & Manicure',
  'Sobrancelhas & Cílios',
  'Depilação',
  'Estética Avançada',
  'Massoterapia',
  'Combos & Pacotes',
];

// Presets por segmento para cadastro rápido
const PRESET_PACKAGES: Record<
  string,
  { label: string; description: string; items: Omit<Service, 'id' | 'businessId'>[] }
> = {
  clinica_estetica: {
    label: 'Pacote Estética Avançada & Facial',
    description: 'Procedimentos clínicos de alta procura para clínicas de estética e biomédicas.',
    items: [
      {
        name: 'Limpeza de Pele Profunda',
        category: 'Facial',
        durationMinutes: 60,
        price: 160,
        commissionPercentage: 50,
        description: 'Higienização profunda com extração de comedões, vapor de ozônio, alta frequência e máscara calmante hidroplástica.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Peeling de Diamante + Hidratação',
        category: 'Facial',
        durationMinutes: 45,
        price: 180,
        commissionPercentage: 50,
        description: 'Microdermoabrasão suave para renovação da camada córnea, uniformização do tom e infusão de ácido hialurônico.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Drenagem Linfática Corporal',
        category: 'Corporal',
        durationMinutes: 60,
        price: 150,
        commissionPercentage: 50,
        description: 'Manobras suaves e especializadas no método Vodder para alívio de edemas, retenção líquida e pós-operatório.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Massagem Relaxante com Aromaterapia',
        category: 'Corporal',
        durationMinutes: 50,
        price: 140,
        commissionPercentage: 50,
        description: 'Técnica terapêutica completa com óleos essenciais aquecidos para alívio de estresse muscular e relaxamento profundo.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Aplicação de Toxina Botulínica (3 Áreas)',
        category: 'Estética Avançada',
        durationMinutes: 45,
        price: 680,
        commissionPercentage: 60,
        description: 'Procedimento biomédico minimamente invasivo para atenuação de rugas dinâmicas em testa, glabela e periorbiculares.',
        allowedProfessionalIds: [],
        active: true,
      },
    ],
  },
  barbearia: {
    label: 'Pacote Barbearia Clássica & Moderna',
    description: 'Serviços essenciais para corte masculino, barboterapia e cuidados faciais.',
    items: [
      {
        name: 'Corte Degradê / Fade Moderno',
        category: 'Cabelo',
        durationMinutes: 40,
        price: 55,
        commissionPercentage: 50,
        description: 'Corte personalizado na tesoura e máquina com transição precisa, acabamento em navalhete e alinhamento de pezinho.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Barboterapia com Toalha Quente',
        category: 'Barba',
        durationMinutes: 35,
        price: 45,
        commissionPercentage: 50,
        description: 'Desenho da barba na navalha com hidratação de espuma quente, aplicação de toalha aromatizada e óleo pós-barba.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Combo Master: Corte + Barba',
        category: 'Combos & Pacotes',
        durationMinutes: 65,
        price: 90,
        commissionPercentage: 50,
        description: 'Experiência completa com corte de cabelo trabalhado no navalhete, barboterapia relaxante e lavagem capilar com massagem.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Camuflagem de Barba / Cabelo',
        category: 'Barba',
        durationMinutes: 25,
        price: 40,
        commissionPercentage: 50,
        description: 'Coloração semipermanente suave para disfarce de fios brancos e preenchimento de falhas sem aspecto artificial.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Selagem Térmica Masculina',
        category: 'Cabelo',
        durationMinutes: 50,
        price: 110,
        commissionPercentage: 50,
        description: 'Alinhamento capilar orgânico para redução de frizz e volume, mantendo balanço natural dos fios.',
        allowedProfessionalIds: [],
        active: true,
      },
    ],
  },
  salao_beleza: {
    label: 'Pacote Salão de Beleza & Hair Spa',
    description: 'Tabela de serviços capilares, manicure e embelezamento facial.',
    items: [
      {
        name: 'Corte Feminino & Escova Modelada',
        category: 'Cabelo',
        durationMinutes: 60,
        price: 120,
        commissionPercentage: 50,
        description: 'Diagnóstico de visagismo, lavagem hidratante com massagem craniana, corte na tesoura e escovação modelada.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Mechas Criativas / Morena Iluminada',
        category: 'Cabelo',
        durationMinutes: 180,
        price: 390,
        commissionPercentage: 60,
        description: 'Técnica de descoloração personalizada com protetor plex, matização de nuances e tratamento pós-química.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Tratamento de Nutrição & Cauterização',
        category: 'Cabelo',
        durationMinutes: 50,
        price: 150,
        commissionPercentage: 50,
        description: 'Reposição de massa lipídica e aminoácidos essenciais com selamento de cutículas a quente para brilho espelhado.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Manicure & Pedicure Completa',
        category: 'Unhas & Manicure',
        durationMinutes: 70,
        price: 75,
        commissionPercentage: 50,
        description: 'Cutilagem detalhada, esfoliação com hidratação de parafina, lixamento e esmaltação com acabamento premium.',
        allowedProfessionalIds: [],
        active: true,
      },
      {
        name: 'Design de Sobrancelhas com Henna',
        category: 'Sobrancelhas & Cílios',
        durationMinutes: 35,
        price: 55,
        commissionPercentage: 50,
        description: 'Alinhamento com paquímetro facial, remoção de pelos na pinça e aplicação de pigmento natural para preenchimento.',
        allowedProfessionalIds: [],
        active: true,
      },
    ],
  },
};

export const ServicesManager: React.FC = () => {
  const {
    activeServices,
    activeProfessionals,
    activeAppointments,
    addService,
    updateService,
    deleteService,
    currentBusiness,
    businesses,
    switchBusiness,
    currentRole,
    isSuperAdminAuthenticated,
    addNotification,
  } = useApp();

  // Permissão de administração: Gerente (tenant_manager) ou CEO (super_admin / superadmin)
  const isAdministrator =
    isSuperAdminAuthenticated ||
    currentRole === 'gerente' ||
    currentRole === 'tenant_manager' ||
    currentRole === 'superadmin' ||
    currentRole === 'ceo';

  // Filtros e busca
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [proFilter, setProFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal Principal: Adicionar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    durationMinutes: 45,
    price: 150,
    commissionPercentage: 50,
    description: '',
    allowedProfessionalIds: [] as string[],
    active: true,
  });
  const [associationMode, setAssociationMode] = useState<'all' | 'specific'>('all');
  const [formValidationError, setFormValidationError] = useState('');

  // Modal de Vínculo Rápido de Profissionais
  const [quickAssignService, setQuickAssignService] = useState<Service | null>(null);
  const [quickSelectedProIds, setQuickSelectedProIds] = useState<string[]>([]);

  // Modal de Exclusão Segura (sem window.confirm)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Modal de Presets / Sugestões Prontas
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // Categorias únicas existentes no catálogo
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeServices.forEach((s) => {
      if (s.category && s.category.trim()) set.add(s.category.trim());
    });
    return Array.from(set).sort();
  }, [activeServices]);

  // Métricas do catálogo
  const stats = useMemo(() => {
    const total = activeServices.length;
    const activeCount = activeServices.filter((s) => s.active).length;
    const avgDuration =
      total > 0
        ? Math.round(activeServices.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / total)
        : 0;
    const avgPrice =
      total > 0
        ? activeServices.reduce((acc, s) => acc + (s.price || 0), 0) / total
        : 0;
    return { total, activeCount, avgDuration, avgPrice };
  }, [activeServices]);

  // Lista filtrada
  const filteredServices = useMemo(() => {
    return activeServices.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;

      if (statusFilter === 'active' && !s.active) return false;
      if (statusFilter === 'inactive' && s.active) return false;

      if (proFilter !== 'all') {
        const isAllowed =
          s.allowedProfessionalIds.length === 0 || s.allowedProfessionalIds.includes(proFilter);
        if (!isAllowed) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = (s.description || '').toLowerCase().includes(q);
        const matchesCategory = (s.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }

      return true;
    });
  }, [activeServices, categoryFilter, proFilter, statusFilter, searchTerm]);

  // Abrir Modal de Criação
  const openAddModal = () => {
    setEditingService(null);
    setFormValidationError('');
    setAssociationMode('all');
    setFormData({
      name: '',
      category: categories[0] || 'Facial',
      durationMinutes: 45,
      price: 120,
      commissionPercentage: 50,
      description: '',
      allowedProfessionalIds: [],
      active: true,
    });
    setIsModalOpen(true);
  };

  // Abrir Modal de Edição
  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormValidationError('');
    const hasSpecific = service.allowedProfessionalIds && service.allowedProfessionalIds.length > 0;
    setAssociationMode(hasSpecific ? 'specific' : 'all');
    setFormData({
      name: service.name,
      category: service.category || 'Geral',
      durationMinutes: service.durationMinutes || 45,
      price: service.price || 0,
      commissionPercentage:
        service.commissionPercentage !== undefined ? service.commissionPercentage : 50,
      description: service.description || '',
      allowedProfessionalIds: service.allowedProfessionalIds || [],
      active: service.active !== false,
    });
    setIsModalOpen(true);
  };

  // Salvar Criação ou Edição
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError('');

    if (!formData.name.trim()) {
      setFormValidationError('Por favor informe o nome do serviço.');
      return;
    }
    if (formData.durationMinutes <= 0) {
      setFormValidationError('A duração estimada deve ser de pelo menos 5 minutos.');
      return;
    }
    if (formData.price < 0) {
      setFormValidationError('O preço do serviço não pode ser negativo.');
      return;
    }

    // Se selecionou modo específico, garantir que marcou ao menos 1 profissional
    let finalAllowedIds: string[] = [];
    if (associationMode === 'specific') {
      if (formData.allowedProfessionalIds.length === 0) {
        setFormValidationError(
          'Você escolheu associar profissionais específicos, mas nenhum foi selecionado. Marque ao menos um profissional ou selecione "Todos os profissionais".'
        );
        return;
      }
      finalAllowedIds = formData.allowedProfessionalIds;
    } else {
      finalAllowedIds = []; // vazio = todos habilitados
    }

    if (editingService) {
      updateService({
        ...editingService,
        ...formData,
        name: formData.name.trim(),
        category: formData.category.trim() || 'Geral',
        description: formData.description.trim(),
        allowedProfessionalIds: finalAllowedIds,
      });
    } else {
      if (!currentBusiness) {
        setFormValidationError('Selecione um estabelecimento antes de cadastrar serviços.');
        return;
      }
      addService({
        businessId: currentBusiness.id,
        ...formData,
        name: formData.name.trim(),
        category: formData.category.trim() || 'Geral',
        description: formData.description.trim(),
        allowedProfessionalIds: finalAllowedIds,
      });
    }

    setIsModalOpen(false);
  };

  // Toggle de seleção de profissional no formulário
  const toggleProfessionalSelection = (proId: string) => {
    setFormData((prev) => {
      const exists = prev.allowedProfessionalIds.includes(proId);
      if (exists) {
        return {
          ...prev,
          allowedProfessionalIds: prev.allowedProfessionalIds.filter((id) => id !== proId),
        };
      } else {
        return {
          ...prev,
          allowedProfessionalIds: [...prev.allowedProfessionalIds, proId],
        };
      }
    });
  };

  // Selecionar / Limpar todos os profissionais no form
  const selectAllProsInForm = () => {
    setFormData((prev) => ({
      ...prev,
      allowedProfessionalIds: activeProfessionals.map((p) => p.id),
    }));
  };
  const deselectAllProsInForm = () => {
    setFormData((prev) => ({
      ...prev,
      allowedProfessionalIds: [],
    }));
  };

  // Abrir Vínculo Rápido de Profissionais
  const openQuickAssign = (service: Service) => {
    setQuickAssignService(service);
    setQuickSelectedProIds(
      service.allowedProfessionalIds.length === 0
        ? activeProfessionals.map((p) => p.id)
        : [...service.allowedProfessionalIds]
    );
  };

  // Salvar Vínculo Rápido
  const saveQuickAssign = () => {
    if (!quickAssignService) return;
    const isAll =
      quickSelectedProIds.length === 0 ||
      quickSelectedProIds.length === activeProfessionals.length;

    updateService({
      ...quickAssignService,
      allowedProfessionalIds: isAll ? [] : quickSelectedProIds,
    });

    addNotification({
      title: 'Profissionais Vinculados',
      message: `As permissões de "${quickAssignService.name}" foram atualizadas com sucesso.`,
      type: 'system',
    });

    setQuickAssignService(null);
  };

  // Exclusão Segura
  const confirmDeleteService = () => {
    if (!serviceToDelete) return;
    deleteService(serviceToDelete.id);
    setServiceToDelete(null);
  };

  // Importar pacote de presets sugeridos
  const handleImportPresets = (key: string) => {
    if (!currentBusiness) return;
    const pkg = PRESET_PACKAGES[key];
    if (!pkg) return;

    pkg.items.forEach((item) => {
      addService({
        businessId: currentBusiness.id,
        ...item,
      });
    });

    addNotification({
      title: 'Pacote de Serviços Importado!',
      message: `${pkg.items.length} serviços sugeridos foram adicionados ao catálogo do ${currentBusiness.tradeName}.`,
      type: 'system',
    });

    setIsPresetModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Multi-Role Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Gestão de Catálogo & Preços
            </span>
            {isAdministrator ? (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Permissão de Administrador ({isSuperAdminAuthenticated ? 'CEO' : 'Gerente'})
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Modo Visualização (Profissional)
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Configuração de Serviços & Profissionais Habilitados
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre nomes, descrições, duração estimada, valores e restrinja a execução a especialistas específicos do{' '}
            <strong className="text-slate-700">{currentBusiness?.tradeName || 'Studio'}</strong>.
          </p>
        </div>

        {/* Tenant selector for CEO or actions for admin */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Se for SuperAdmin/CEO e houver múltiplos estabelecimentos, permite alternar o estúdio rapidamente */}
          {isSuperAdminAuthenticated && businesses.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={currentBusiness?.id || ''}
                onChange={(e) => switchBusiness(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent pr-2 py-1 focus:outline-none cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tradeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAdministrator && (
            <>
              <button
                onClick={() => setIsPresetModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                title="Modelos de serviços prontos para clínicas, salões e barbearias"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Modelos Sugeridos</span>
              </button>

              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Serviço</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Serviços Ativos</span>
            <Scissors className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {stats.activeCount}
            </span>
            <span className="text-[11px] text-slate-400">de {stats.total} total</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Duração Média</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {stats.avgDuration}
            </span>
            <span className="text-[11px] text-slate-400">minutos / slot</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ticket Médio</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              R$ {stats.avgPrice.toFixed(0)}
            </span>
            <span className="text-[11px] text-slate-400">por atendimento</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Profissionais</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
              {activeProfessionals.length}
            </span>
            <span className="text-[11px] text-slate-400">disponíveis</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar serviço por nome, descrição ou categoria..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Filter by Professional */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={proFilter}
                onChange={(e) => setProFilter(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Profissionais</option>
                {activeProfessionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    Executado por: {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Somente Ativos</option>
              <option value="inactive">Somente Inativos</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Grade
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Tabela
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todas as Categorias ({activeServices.length})
            </button>
            {categories.map((cat) => {
              const count = activeServices.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Services Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const isAllPros =
              !service.allowedProfessionalIds || service.allowedProfessionalIds.length === 0;

            const assignedPros = isAllPros
              ? activeProfessionals
              : activeProfessionals.filter((p) => service.allowedProfessionalIds.includes(p.id));

            const proCommissionValue = ((service.price || 0) * (service.commissionPercentage || 0)) / 100;

            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  service.active ? 'border-slate-200' : 'border-slate-200/60 bg-slate-50/50 opacity-80'
                }`}
              >
                <div>
                  {/* Category & Status Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                        {service.category || 'Geral'}
                      </span>
                      {!service.active && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Inativo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-slate-500 font-mono text-xs bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{service.durationMinutes} min</span>
                      </div>

                      {isAdministrator && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => openEditModal(service)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar serviço"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setServiceToDelete(service)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir serviço"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-900 mb-1.5 leading-snug">
                    {service.name}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {service.description || 'Nenhuma descrição detalhada cadastrada.'}
                  </p>
                </div>

                {/* Pricing & Commission */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 font-medium">Preço ao Cliente:</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Comissão do Profissional:</span>
                    <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                      {service.commissionPercentage}% (R$ {proCommissionValue.toFixed(2)})
                    </span>
                  </div>

                  {/* Associated Professionals Section */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Profissionais Habilitados:
                      </span>
                      {isAdministrator && (
                        <button
                          onClick={() => openQuickAssign(service)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          Alterar Vínculo
                        </button>
                      )}
                    </div>

                    {isAllPros ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Todos os profissionais habilitados ({activeProfessionals.length})</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {assignedPros.slice(0, 3).map((pro) => (
                            <span
                              key={pro.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-700"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              {pro.name.split(' ')[0]}
                            </span>
                          ))}
                          {assignedPros.length > 3 && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              +{assignedPros.length - 3} mais
                            </span>
                          )}
                          {assignedPros.length === 0 && (
                            <span className="text-[11px] text-rose-600 font-medium">
                              Nenhum profissional associado!
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Services Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Serviço & Categoria</th>
                  <th className="px-4 py-3">Duração</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Comissão</th>
                  <th className="px-4 py-3">Profissionais Vinculados</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdministrator && <th className="px-4 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => {
                  const isAllPros =
                    !service.allowedProfessionalIds || service.allowedProfessionalIds.length === 0;
                  const assignedPros = isAllPros
                    ? activeProfessionals
                    : activeProfessionals.filter((p) =>
                        service.allowedProfessionalIds.includes(p.id)
                      );
                  const proCommissionValue =
                    ((service.price || 0) * (service.commissionPercentage || 0)) / 100;

                  return (
                    <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{service.name}</div>
                        <div className="text-[11px] text-slate-400">{service.category || 'Geral'}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {service.durationMinutes} min
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        R$ {service.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-emerald-700 font-semibold">
                          {service.commissionPercentage}%
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          R$ {proCommissionValue.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {isAllPros ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Todos ({activeProfessionals.length})
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {assignedPros.map((p) => (
                              <span
                                key={p.id}
                                className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700"
                              >
                                {p.name.split(' ')[0]}
                              </span>
                            ))}
                            {assignedPros.length === 0 && (
                              <span className="text-rose-600 font-bold text-[10px]">
                                Nenhum associado
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            service.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {service.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {isAdministrator && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openQuickAssign(service)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Vincular profissionais"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(service)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Editar serviço"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setServiceToDelete(service)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Excluir serviço"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Nenhum serviço encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || categoryFilter !== 'all' || proFilter !== 'all'
              ? 'Nenhum resultado corresponde aos filtros aplicados. Tente limpar os filtros de busca.'
              : 'O catálogo deste estabelecimento ainda não possui serviços cadastrados.'}
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            {searchTerm || categoryFilter !== 'all' || proFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setProFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Limpar Filtros
              </button>
            ) : (
              isAdministrator && (
                <>
                  <button
                    onClick={() => setIsPresetModalOpen(true)}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Carregar Modelos Sugeridos</span>
                  </button>
                  <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Primeiro Serviço</span>
                  </button>
                </>
              )
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRO & EDIÇÃO COMPLETA DE SERVIÇO */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-6 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingService ? `Editar Serviço: ${editingService.name}` : 'Cadastrar Novo Serviço'}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentBusiness?.tradeName || 'Studio'} · Configuração de catálogo
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formValidationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formValidationError}</span>
                </div>
              )}

              {/* Nome do Serviço */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome do Serviço / Procedimento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Limpeza de Pele Profunda, Corte Degradê, Mechas..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Categoria <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Facial, Corporal, Barba, Cabelo..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                />
                {/* Category suggestions */}
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  <span className="text-[10px] text-slate-400">Sugestões:</span>
                  {SUGGESTED_CATEGORIES.slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duração Estimada & Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Duração Estimada (minutos) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min={5}
                      step={5}
                      required
                      value={formData.durationMinutes}
                      onChange={(e) =>
                        setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                      }
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-mono tabular-nums bg-white"
                    />
                  </div>
                  {/* Quick duration chips */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[15, 30, 45, 60, 90, 120].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setFormData({ ...formData, durationMinutes: dur })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          formData.durationMinutes === dur
                            ? 'bg-slate-900 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </div>

                <MaskedInput
                  maskType="currency"
                  label="Preço de Venda (R$)"
                  required
                  value={formData.price}
                  onValueChange={(cleanVal) =>
                    setFormData({ ...formData, price: parseFloat(cleanVal) || 0 })
                  }
                  helperText="Valor bruto cobrado do cliente"
                />
              </div>

              {/* Comissão do Profissional */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Comissão do Profissional (%)
                  </label>
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    R$ {(((formData.price || 0) * (formData.commissionPercentage || 0)) / 100).toFixed(2)} líquido
                  </span>
                </div>
                <div className="relative">
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={formData.commissionPercentage}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionPercentage: Number(e.target.value) })
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-mono tabular-nums bg-white"
                  />
                </div>
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Descrição Detalhada do Procedimento
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explique produtos utilizados, indicações, benefícios e cuidados recomendados para o cliente..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                />
              </div>

              {/* ASSOCIAÇÃO COM PROFISSIONAIS ESPECÍFICOS */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-700" />
                    <span>Associação de Profissionais Habilitados</span>
                  </label>
                  {associationMode === 'specific' && (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 font-mono">
                      {formData.allowedProfessionalIds.length} de {activeProfessionals.length} selecionados
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      associationMode === 'all'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="associationMode"
                      checked={associationMode === 'all'}
                      onChange={() => {
                        setAssociationMode('all');
                        setFormData((prev) => ({ ...prev, allowedProfessionalIds: [] }));
                      }}
                      className="text-emerald-600 focus:ring-0"
                    />
                    <span>Todos os Profissionais</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      associationMode === 'specific'
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="associationMode"
                      checked={associationMode === 'specific'}
                      onChange={() => {
                        setAssociationMode('specific');
                        if (formData.allowedProfessionalIds.length === 0) {
                          setFormData((prev) => ({
                            ...prev,
                            allowedProfessionalIds: activeProfessionals.map((p) => p.id),
                          }));
                        }
                      }}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>Profissionais Específicos</span>
                  </label>
                </div>

                {associationMode === 'specific' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Marque quem tem permissão para realizar este serviço:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllProsInForm}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={deselectAllProsInForm}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          Desmarcar Todos
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {activeProfessionals.map((pro) => {
                        const isChecked = formData.allowedProfessionalIds.includes(pro.id);
                        return (
                          <div
                            key={pro.id}
                            onClick={() => toggleProfessionalSelection(pro.id)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'border-indigo-500 bg-indigo-50/50 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // tratado no onClick do container
                              className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                              <img
                                src={
                                  pro.avatar ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
                                }
                                alt={pro.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">{pro.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {pro.specialties[0] || 'Profissional'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status do Serviço */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">Status no Catálogo</p>
                  <p className="text-[11px] text-slate-500">
                    {formData.active
                      ? 'Serviço visível e disponível para agendamento online e manual.'
                      : 'Serviço pausado. Não aparecerá na página pública nem no catálogo de agendamentos.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {/* Botoes de Acao */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VÍNCULO RÁPIDO DE PROFISSIONAIS (DIRETO DO CARD) */}
      {/* ========================================================================= */}
      {quickAssignService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Profissionais Habilitados
                </h3>
                <p className="text-xs text-slate-500">
                  {quickAssignService.name} · {quickAssignService.durationMinutes} min · R$ {quickAssignService.price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setQuickAssignService(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Selecione quem pode atender este serviço:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickSelectedProIds(activeProfessionals.map((p) => p.id))}
                    className="text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => setQuickSelectedProIds([])}
                    className="text-rose-600 font-semibold hover:text-rose-800 cursor-pointer"
                  >
                    Nenhum
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeProfessionals.map((pro) => {
                  const isChecked = quickSelectedProIds.includes(pro.id);
                  return (
                    <div
                      key={pro.id}
                      onClick={() => {
                        setQuickSelectedProIds((prev) =>
                          prev.includes(pro.id)
                            ? prev.filter((id) => id !== pro.id)
                            : [...prev, pro.id]
                        );
                      }}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                      />
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        <img
                          src={
                            pro.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
                          }
                          alt={pro.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900">{pro.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {pro.specialties.join(', ') || 'Especialista'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Se todos os profissionais forem marcados (ou se nenhum for explicitamente restringido), o sistema
                  considera o serviço disponível para toda a equipe.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setQuickAssignService(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveQuickAssign}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXCLUSÃO SEGURA DE SERVIÇO (SEM WINDOW.CONFIRM) */}
      {/* ========================================================================= */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Excluir Serviço: {serviceToDelete.name}?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Tem certeza que deseja remover o serviço{' '}
              <strong className="text-slate-800 font-bold">"{serviceToDelete.name}"</strong> (R${' '}
              {serviceToDelete.price.toFixed(2)}) do catálogo?
            </p>

            {/* Verificação de Agendamentos Existentes */}
            {(() => {
              const relatedAppointments = activeAppointments.filter(
                (a) => a.serviceId === serviceToDelete.id && a.status !== 'cancelado'
              );
              if (relatedAppointments.length > 0) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Existem <strong>{relatedAppointments.length} agendamento(s)</strong> no histórico associados a
                      este serviço. Os agendamentos existentes serão preservados, mas novos agendamentos não poderão
                      ser realizados.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteService}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MODELOS SUGERIDOS / PRESET PACKAGES */}
      {/* ========================================================================= */}
      {isPresetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Modelos Sugeridos de Serviços
                  </h3>
                  <p className="text-xs text-slate-500">
                    Importe pacotes completos e prontos com durações, valores e descrições otimizadas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {Object.entries(PRESET_PACKAGES).map(([key, pkg]) => {
                const isCurrentBizType = currentBusiness?.type === key;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrentBizType
                        ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{pkg.label}</h4>
                          {isCurrentBizType && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              Recomendado para o seu perfil
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                      </div>

                      <button
                        onClick={() => handleImportPresets(key)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Importar Pacote ({pkg.items.length})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pkg.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.durationMinutes} min · {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 font-mono shrink-0">
                            R$ {item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
