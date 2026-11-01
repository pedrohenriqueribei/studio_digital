import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MessageCircle,
  Search,
  X,
  AlertTriangle,
  Scissors,
  Palette,
  FileText,
  Clock,
  Check,
  Star,
  Filter,
  ArrowUpDown,
  Sparkles,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client, ClientNote, ClientPreferences, Appointment } from '../../types';
import { MaskedInput } from '../ui/MaskedInput';
import { PRESET_CLIENT_TAGS, getClientTagConfig } from '../../utils/clientTags';

interface ClientsManagerProps {
  isProfessionalView?: boolean;
}

const COMMON_CUT_SUGGESTIONS = [
  'Degradê navalhado',
  'Fade americano',
  'Pompadour clássico',
  'Undercut',
  'Social curto',
  'Barba modelada',
  'Long Bob',
  'Corte em camadas',
  'Chanel de bico',
  'Pixie cut',
  'Franja cortina',
  'Bordado / Pontas',
];

const COMMON_COLOR_SUGGESTIONS = [
  'Castanho Iluminado',
  'Morena Iluminada',
  'Loiro Pérola',
  'Loiro Platinado',
  'Ruivo Acobreado',
  'Louro Mel 7.3',
  'Preto Azulado',
  'Esmalte Nude Chic',
  'Vermelho Carmim',
  'Francesinha Clássica',
];

const COMMON_ALLERGY_SUGGESTIONS = [
  'Amônia (Tintura)',
  'Formaldeído / Formol',
  'Pó Descolorante',
  'PPD (Parafenilenodiamina)',
  'Látex (Luvas)',
  'Tolueno (Esmaltes)',
  'Fragrâncias Fortes',
  'Sensibilidade Couro Cabeludo',
];

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face',
];

export const ClientsManager: React.FC<ClientsManagerProps> = ({ isProfessionalView }) => {
  const {
    activeClients,
    addClient,
    updateClient,
    addClientNote,
    updateClientPreferences,
    updateClientTags,
    toggleClientTag,
    currentBusiness,
    activeProfessionals,
    currentProfessional,
    userRole,
    activeAppointments,
    openNewAppointmentModal,
  } = useApp();

  const isProMode = isProfessionalView || userRole === 'professional';

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'my_clients' | 'tag_vip' | 'tag_novo' | 'tag_recorrente' | 'tag_debito' | 'allergies' | 'recurrent'
  >('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'visits' | 'spent' | 'recent'>('name_asc');

  // Modals state
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [detailsTab, setDetailsTab] = useState<'historico' | 'preferencias' | 'notas'>('historico');

  // New Client Form state
  const [newFormData, setNewFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDay: '',
    birthMonth: '',
    photoURL: AVATAR_OPTIONS[0],
    preferredProfessionalId: currentProfessional?.id || '',
    notes: '',
    tags: ['Novo'] as string[],
    cutTypes: [] as string[],
    preferredColors: [] as string[],
    allergies: [] as string[],
    generalPreferences: '',
  });

  // Custom tag inputs in form
  const [customCutInput, setCustomCutInput] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');
  const [customAllergyInput, setCustomAllergyInput] = useState('');

  // Preference editor inside Client Details Modal
  const [editPreferences, setEditPreferences] = useState<ClientPreferences>({});
  const [prefCutInput, setPrefCutInput] = useState('');
  const [prefColorInput, setPrefColorInput] = useState('');
  const [prefAllergyInput, setPrefAllergyInput] = useState('');

  // Tag editor inside Client Details Modal
  const [customNewTagInput, setCustomNewTagInput] = useState('');

  // New note inside Client Details Modal
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteIsAlert, setNewNoteIsAlert] = useState(false);

  // Sync latest client from activeClients if modal is open
  const currentSelectedClient = useMemo(() => {
    if (!selectedClientForDetails) return null;
    return activeClients.find((c) => c.id === selectedClientForDetails.id) || selectedClientForDetails;
  }, [activeClients, selectedClientForDetails]);

  // Sync edit preferences when client is opened
  const handleOpenClientDetails = (client: Client, tab: 'historico' | 'preferencias' | 'notas' = 'historico') => {
    setSelectedClientForDetails(client);
    setDetailsTab(tab);
    setEditPreferences(client.preferences || {
      cutTypes: [],
      preferredColors: [],
      allergies: [],
      generalNotes: client.notes || '',
    });
    setNewNoteText('');
    setNewNoteIsAlert(false);
    setCustomNewTagInput('');
  };

  // Tag toggling inside Client Details Modal
  const handleToggleTagInDetails = (tagLabel: string) => {
    if (!currentSelectedClient) return;
    const currentTags = currentSelectedClient.tags || [];
    const exists = currentTags.some((t) => t.toLowerCase() === tagLabel.toLowerCase());
    const newTags = exists
      ? currentTags.filter((t) => t.toLowerCase() !== tagLabel.toLowerCase())
      : [...currentTags, tagLabel];

    setSelectedClientForDetails((prev) => (prev ? { ...prev, tags: newTags } : null));
    updateClientTags(currentSelectedClient.id, newTags);
  };

  const handleAddCustomTagInDetails = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customNewTagInput.trim() || !currentSelectedClient) return;
    const tagToAdd = customNewTagInput.trim();
    const currentTags = currentSelectedClient.tags || [];
    if (!currentTags.some((t) => t.toLowerCase() === tagToAdd.toLowerCase())) {
      const newTags = [...currentTags, tagToAdd];
      setSelectedClientForDetails((prev) => (prev ? { ...prev, tags: newTags } : null));
      updateClientTags(currentSelectedClient.id, newTags);
    }
    setCustomNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!currentSelectedClient) return;
    const currentTags = currentSelectedClient.tags || [];
    const newTags = currentTags.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase());
    setSelectedClientForDetails((prev) => (prev ? { ...prev, tags: newTags } : null));
    updateClientTags(currentSelectedClient.id, newTags);
  };

  // Tag counts for quick filters
  const tagCounts = useMemo(() => {
    let vip = 0;
    let novo = 0;
    let recorrente = 0;
    let debito = 0;
    activeClients.forEach((c) => {
      const tags = (c.tags || []).map((t) => t.toLowerCase());
      if (tags.some((t) => t === 'vip')) vip++;
      if (tags.some((t) => t === 'novo')) novo++;
      if (tags.some((t) => t === 'recorrente')) recorrente++;
      if (tags.some((t) => t.includes('débito') || t.includes('debito'))) debito++;
    });
    return { vip, novo, recorrente, debito };
  }, [activeClients]);

  // Filter & Search logic
  const filteredAndSortedClients = useMemo(() => {
    let result = [...activeClients];

    // Filter by Search Term (Nome, Telefone, E-mail)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const cleanQ = q.replace(/\D/g, '');
      result = result.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        const rawPhone = c.phone.replace(/\D/g, '');
        const phoneMatch = c.phone.includes(q) || (cleanQ.length > 0 && rawPhone.includes(cleanQ));
        return nameMatch || emailMatch || phoneMatch;
      });
    }

    // Filter by Chips & Tags
    if (activeFilter === 'my_clients' && currentProfessional) {
      result = result.filter((c) => {
        if (c.preferredProfessionalId === currentProfessional.id) return true;
        // Check if there are appointments with this professional
        return activeAppointments.some(
          (a) => a.clientId === c.id && a.professionalId === currentProfessional.id
        );
      });
    } else if (activeFilter === 'tag_vip') {
      result = result.filter((c) => (c.tags || []).some((t) => t.toLowerCase() === 'vip'));
    } else if (activeFilter === 'tag_novo') {
      result = result.filter((c) => (c.tags || []).some((t) => t.toLowerCase() === 'novo'));
    } else if (activeFilter === 'tag_recorrente') {
      result = result.filter((c) => (c.tags || []).some((t) => t.toLowerCase() === 'recorrente'));
    } else if (activeFilter === 'tag_debito') {
      result = result.filter((c) =>
        (c.tags || []).some((t) => {
          const l = t.toLowerCase();
          return l.includes('débito') || l.includes('debito');
        })
      );
    } else if (activeFilter === 'allergies') {
      result = result.filter(
        (c) => c.preferences?.allergies && c.preferences.allergies.length > 0
      );
    } else if (activeFilter === 'recurrent') {
      result = result.filter((c) => (c.totalVisits || 0) >= 2);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'visits':
          return (b.totalVisits || 0) - (a.totalVisits || 0);
        case 'spent':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'recent':
          return (b.lastVisit || '').localeCompare(a.lastVisit || '');
        case 'name_asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [activeClients, searchTerm, activeFilter, sortBy, currentProfessional, activeAppointments]);

  // Appointments for the selected client
  const clientAppointments = useMemo(() => {
    if (!selectedClientForDetails) return [];
    return activeAppointments
      .filter((a) => a.clientId === selectedClientForDetails.id)
      .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
  }, [selectedClientForDetails, activeAppointments]);

  // Create Client Handler
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormData.name.trim() || !newFormData.phone.trim()) return;

    if (!currentBusiness) {
      alert('Selecione ou cadastre um estabelecimento primeiro.');
      return;
    }

    const birthD = parseInt(newFormData.birthDay, 10);
    const birthM = parseInt(newFormData.birthMonth, 10);

    const initialPreferences: ClientPreferences = {
      cutTypes: newFormData.cutTypes.length > 0 ? newFormData.cutTypes : undefined,
      preferredColors: newFormData.preferredColors.length > 0 ? newFormData.preferredColors : undefined,
      allergies: newFormData.allergies.length > 0 ? newFormData.allergies : undefined,
      generalNotes: newFormData.generalPreferences || undefined,
    };

    const initialImportantNotes: ClientNote[] = [];
    if (newFormData.notes.trim()) {
      initialImportantNotes.push({
        id: `note_${Date.now()}`,
        text: newFormData.notes.trim(),
        authorName: currentProfessional?.name || 'Cadastro Inicial',
        authorRole: userRole,
        createdAt: new Date().toISOString(),
        isAlert: newFormData.allergies.length > 0,
      });
    }

    const createdClient = addClient({
      businessId: currentBusiness.id,
      name: newFormData.name.trim(),
      phone: newFormData.phone.trim(),
      email: newFormData.email.trim() || `${newFormData.name.toLowerCase().replace(/\s+/g, '')}@cliente.local`,
      photoURL: newFormData.photoURL,
      birthDay: !isNaN(birthD) && birthD >= 1 && birthD <= 31 ? birthD : undefined,
      birthMonth: !isNaN(birthM) && birthM >= 1 && birthM <= 12 ? birthM : undefined,
      birthDateFormatted:
        !isNaN(birthD) && !isNaN(birthM)
          ? `${String(birthD).padStart(2, '0')}/${String(birthM).padStart(2, '0')}`
          : undefined,
      preferredProfessionalId: newFormData.preferredProfessionalId || (currentProfessional?.id || undefined),
      preferredProfessionalName:
        activeProfessionals.find((p) => p.id === newFormData.preferredProfessionalId)?.name ||
        currentProfessional?.name ||
        undefined,
      tags: newFormData.tags.length > 0 ? newFormData.tags : ['Novo'],
      notes: newFormData.notes.trim() || undefined,
      preferences: initialPreferences,
      importantNotes: initialImportantNotes,
    });

    // Reset Form
    setNewFormData({
      name: '',
      phone: '',
      email: '',
      birthDay: '',
      birthMonth: '',
      photoURL: AVATAR_OPTIONS[0],
      preferredProfessionalId: currentProfessional?.id || '',
      notes: '',
      tags: ['Novo'],
      cutTypes: [],
      preferredColors: [],
      allergies: [],
      generalPreferences: '',
    });
    setCustomCutInput('');
    setCustomColorInput('');
    setCustomAllergyInput('');
    setIsNewClientModalOpen(false);

    // Open details directly to confirm
    if (createdClient) {
      handleOpenClientDetails(createdClient, 'preferencias');
    }
  };

  // Save Preferences Handler
  const handleSavePreferences = () => {
    if (!selectedClientForDetails) return;

    updateClientPreferences(selectedClientForDetails.id, editPreferences);

    // Update local client object in view
    setSelectedClientForDetails((prev) =>
      prev ? { ...prev, preferences: editPreferences } : null
    );
  };

  // Add Note Handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedClientForDetails) return;

    addClientNote(
      selectedClientForDetails.id,
      newNoteText.trim(),
      currentProfessional?.name || (isProMode ? 'Profissional' : 'Gerência'),
      newNoteIsAlert
    );

    const createdNote: ClientNote = {
      id: `note_${Date.now()}`,
      text: newNoteText.trim(),
      authorName: currentProfessional?.name || (isProMode ? 'Profissional' : 'Gerência'),
      authorRole: userRole,
      createdAt: new Date().toISOString(),
      isAlert: newNoteIsAlert,
    };

    setSelectedClientForDetails((prev) =>
      prev
        ? {
            ...prev,
            importantNotes: [createdNote, ...(prev.importantNotes || [])],
          }
        : null
    );

    setNewNoteText('');
    setNewNoteIsAlert(false);
  };

  // Helper to toggle tag in preferences
  const toggleArrayItem = (list: string[] | undefined, item: string): string[] => {
    const current = list || [];
    if (current.includes(item)) {
      return current.filter((x) => x !== item);
    }
    return [...current, item];
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white">
              {isProMode ? 'Ficha do Cliente & CRM' : 'Base de Clientes & CRM'}
            </span>
            {isProMode && currentProfessional && (
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Especialista: {currentProfessional.name}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Gestão de Clientes e Preferências
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre novos clientes, consulte histórico de serviços, registre cortes, cores e alertas de alergias.
          </p>
        </div>

        <button
          onClick={() => setIsNewClientModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input: Nome, Telefone ou E-mail */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full pl-10 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-slate-50/70 focus:bg-white transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-500 self-end md:self-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="name_asc">Nome (A - Z)</option>
              <option value="name_desc">Nome (Z - A)</option>
              <option value="visits">Mais Visitas Realizadas</option>
              <option value="spent">Maior Gasto Acumulado (R$)</option>
              <option value="recent">Última Visita</option>
            </select>
          </div>
        </div>

        {/* Filter Chips & Fast Tag Segmentation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px] mr-1">
            <Filter className="w-3 h-3" />
            <span>Filtros:</span>
          </span>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({activeClients.length})
          </button>

          {/* Quick Tag Segmentation */}
          <button
            onClick={() => setActiveFilter('tag_vip')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border ${
              activeFilter === 'tag_vip'
                ? 'bg-amber-500 text-amber-950 border-amber-500 shadow-2xs ring-1 ring-amber-300 font-black'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>VIP ({tagCounts.vip})</span>
          </button>

          <button
            onClick={() => setActiveFilter('tag_novo')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border ${
              activeFilter === 'tag_novo'
                ? 'bg-sky-500 text-sky-950 border-sky-500 shadow-2xs ring-1 ring-sky-300 font-black'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
          >
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span>Novo ({tagCounts.novo})</span>
          </button>

          <button
            onClick={() => setActiveFilter('tag_recorrente')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border ${
              activeFilter === 'tag_recorrente'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-1 ring-emerald-300 font-black'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Recorrente ({tagCounts.recorrente})</span>
          </button>

          <button
            onClick={() => setActiveFilter('tag_debito')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border ${
              activeFilter === 'tag_debito'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs ring-1 ring-rose-300 font-black'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Com débito ({tagCounts.debito})</span>
          </button>

          {isProMode && (
            <button
              onClick={() => setActiveFilter('my_clients')}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                activeFilter === 'my_clients'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              Meus Clientes
            </button>
          )}

          <button
            onClick={() => setActiveFilter('allergies')}
            className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'allergies'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>Com Alergias</span>
          </button>

          <span className="ml-auto text-[11px] text-slate-400 font-mono tabular-nums">
            Exibindo {filteredAndSortedClients.length} de {activeClients.length} clientes
          </span>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedClients.map((client) => {
          const cleanPhone = client.phone.replace(/\D/g, '');
          const preferredPro = activeProfessionals.find(
            (p) => p.id === client.preferredProfessionalId
          );
          const hasAllergies = client.preferences?.allergies && client.preferences.allergies.length > 0;
          const hasCuts = client.preferences?.cutTypes && client.preferences.cutTypes.length > 0;
          const hasColors = client.preferences?.preferredColors && client.preferences.preferredColors.length > 0;
          const latestNote = client.importantNotes && client.importantNotes.length > 0 ? client.importantNotes[0] : null;
          const hasDebt = (client.tags || []).some((t) => {
            const l = t.toLowerCase();
            return l.includes('débito') || l.includes('debito');
          });
          const isVip = (client.tags || []).some((t) => t.toLowerCase() === 'vip');

          return (
            <div
              key={client.id}
              className={`bg-white rounded-2xl border transition-all flex flex-col justify-between hover:shadow-md relative overflow-hidden ${
                hasDebt
                  ? 'border-rose-400 ring-2 ring-rose-200/60 shadow-xs'
                  : hasAllergies
                  ? 'border-rose-300 ring-1 ring-rose-200/50'
                  : isVip
                  ? 'border-amber-300 ring-1 ring-amber-200/60'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-5 space-y-3.5">
                {/* Header: Photo + Name + Tags + WhatsApp */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={client.photoURL || AVATAR_OPTIONS[0]}
                      alt={client.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {client.name}
                      </h4>

                      {/* Tags Badges */}
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {client.tags.map((t) => {
                            const config = getClientTagConfig(t);
                            const TagIcon = config.icon;
                            return (
                              <span
                                key={t}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border shadow-2xs ${config.badgeClass}`}
                                title={config.description}
                              >
                                <TagIcon className="w-2.5 h-2.5 shrink-0" />
                                <span>{config.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {client.birthDateFormatted && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Aniversário: {client.birthDateFormatted}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/55${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
                    title="Conversar pelo WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {preferredPro && (
                    <div className="text-[11px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-indigo-100">
                      <User className="w-3 h-3 text-indigo-600" />
                      <span>Especialista preferido: <strong>{preferredPro.name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Financial Debt Notice */}
                {hasDebt && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 font-bold shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>⚠️ Pendência financeira: Cliente com débito em aberto</span>
                  </div>
                )}

                {/* ALERT: Allergies (CRUCIAL HIGHLIGHT) */}
                {hasAllergies && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide text-rose-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 fill-rose-600 shrink-0" />
                      <span>Atenção: Alergias &amp; Restrições</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {client.preferences!.allergies!.map((alg, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white border border-rose-300 text-rose-900 font-bold text-[10px]"
                        >
                          {alg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferences Highlights (Cuts & Colors) */}
                {(hasCuts || hasColors) && (
                  <div className="space-y-1.5 pt-1 text-xs">
                    {hasCuts && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Scissors className="w-3 h-3 text-slate-500" />
                          <span>Corte:</span>
                        </span>
                        {client.preferences!.cutTypes!.map((cut, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[10px]"
                          >
                            {cut}
                          </span>
                        ))}
                      </div>
                    )}

                    {hasColors && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Palette className="w-3 h-3 text-purple-500" />
                          <span>Cor:</span>
                        </span>
                        {client.preferences!.preferredColors!.map((col, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Latest Important Note Preview */}
                {latestNote && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-600">Nota de {latestNote.authorName}:</span>
                      <span>{new Date(latestNote.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="line-clamp-2 italic text-slate-800">
                      &ldquo;{latestNote.text}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer: Metrics & Action Buttons */}
              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Visitas:</span>
                    <span className="font-bold text-slate-900">{client.totalVisits || 0} sessões</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Gasto Total:</span>
                    <span className="font-extrabold text-slate-900">
                      R$ {(client.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenClientDetails(client, 'historico')}
                    className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Histórico</span>
                  </button>

                  <button
                    onClick={() => handleOpenClientDetails(client, 'preferencias')}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ficha do Cliente</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAndSortedClients.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchTerm ? 'Nenhum cliente encontrado para esta busca' : 'Nenhum cliente cadastrado nesta categoria'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? `Nenhum resultado corresponde a "${searchTerm}". Tente buscar por outro nome, telefone ou e-mail.`
              : 'Cadastre seus clientes para gerenciar histórico de atendimentos, cortes favoritos, cores e alergias.'}
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveFilter('all');
              setIsNewClientModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Cadastrar Novo Cliente</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRO DE NOVO CLIENTE (COM PREFERÊNCIAS E ALERGIAS)            */}
      {/* ========================================================================= */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  {isProMode ? 'Cadastro pelo Profissional' : 'Novo Cliente'}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Cadastrar Cliente &amp; Ficha Inicial
                </h3>
              </div>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateClient} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Section 1: Dados Pessoais */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Dados Pessoais &amp; Contato</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Ferreira"
                      value={newFormData.name}
                      onChange={(e) => setNewFormData({ ...newFormData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  <MaskedInput
                    maskType="phone"
                    label="Telefone / WhatsApp *"
                    required
                    value={newFormData.phone}
                    leftIcon={<Phone className="w-3.5 h-3.5" />}
                    onValueChange={(cleanVal) => setNewFormData({ ...newFormData, phone: cleanVal })}
                    helperText="Formatação automática com DDD"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      E-mail (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={newFormData.email}
                      onChange={(e) => setNewFormData({ ...newFormData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                    />
                  </div>

                  {/* Aniversário: Dia e Mês */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Data de Nascimento (Dia / Mês)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={1}
                        max={31}
                        placeholder="Dia (1-31)"
                        value={newFormData.birthDay}
                        onChange={(e) => setNewFormData({ ...newFormData, birthDay: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                      />
                      <input
                        type="number"
                        min={1}
                        max={12}
                        placeholder="Mês (1-12)"
                        value={newFormData.birthMonth}
                        onChange={(e) => setNewFormData({ ...newFormData, birthMonth: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Avatar selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Foto do Perfil (Selecione um avatar)
                  </label>
                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {AVATAR_OPTIONS.map((url, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setNewFormData({ ...newFormData, photoURL: url })}
                        className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                          newFormData.photoURL === url ? 'border-slate-900 ring-2 ring-slate-900/20 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profissional preferido */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Profissional de Preferência
                  </label>
                  <select
                    value={newFormData.preferredProfessionalId}
                    onChange={(e) => setNewFormData({ ...newFormData, preferredProfessionalId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="">Sem preferência específica (Qualquer profissional)</option>
                    {activeProfessionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.specialties.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section 1.5: Etiquetas Iniciais de Segmentação */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-700" />
                    <span>Etiquetas Iniciais de Segmentação (Tags)</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Selecione as etiquetas para categorizar rapidamente o novo cliente:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_CLIENT_TAGS.map((preset) => {
                      const active = newFormData.tags.includes(preset.label);
                      const PresetIcon = preset.icon;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            const exists = newFormData.tags.includes(preset.label);
                            setNewFormData({
                              ...newFormData,
                              tags: exists
                                ? newFormData.tags.filter((t) => t !== preset.label)
                                : [...newFormData.tags, preset.label],
                            });
                          }}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                            active ? preset.pillBtnActiveClass : preset.pillBtnInactiveClass
                          }`}
                        >
                          <PresetIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{preset.label}</span>
                          {active && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: Preferências & Ficha do Cliente */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  <span>2. Preferências de Atendimento (Cortes, Cores e Alergias)</span>
                </h4>

                {/* Alergias / Restrições (Destaque Vermelho) */}
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                      <span>Alergias e Restrições Químicas</span>
                    </label>
                    <span className="text-[10px] text-rose-700 font-semibold">Crítico para segurança</span>
                  </div>

                  {/* Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ALLERGY_SUGGESTIONS.map((alg) => {
                      const selected = newFormData.allergies.includes(alg);
                      return (
                        <button
                          type="button"
                          key={alg}
                          onClick={() =>
                            setNewFormData({
                              ...newFormData,
                              allergies: toggleArrayItem(newFormData.allergies, alg),
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            selected
                              ? 'bg-rose-600 text-white shadow-2xs font-bold'
                              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {selected ? `✓ ${alg}` : `+ ${alg}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Allergy input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Outra alergia ou sensibilidade..."
                      value={customAllergyInput}
                      onChange={(e) => setCustomAllergyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customAllergyInput.trim()) {
                            setNewFormData({
                              ...newFormData,
                              allergies: [...newFormData.allergies, customAllergyInput.trim()],
                            });
                            setCustomAllergyInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-rose-200 rounded-lg bg-white text-rose-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customAllergyInput.trim()) {
                          setNewFormData({
                            ...newFormData,
                            allergies: [...newFormData.allergies, customAllergyInput.trim()],
                          });
                          setCustomAllergyInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Cortes Preferidos */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-slate-700" />
                    <span>Tipos de Corte / Estilo Preferidos</span>
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_CUT_SUGGESTIONS.map((cut) => {
                      const selected = newFormData.cutTypes.includes(cut);
                      return (
                        <button
                          type="button"
                          key={cut}
                          onClick={() =>
                            setNewFormData({
                              ...newFormData,
                              cutTypes: toggleArrayItem(newFormData.cutTypes, cut),
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            selected
                              ? 'bg-slate-900 text-white shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {selected ? `✓ ${cut}` : `+ ${cut}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Outro tipo de corte ou estilo..."
                      value={customCutInput}
                      onChange={(e) => setCustomCutInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customCutInput.trim()) {
                            setNewFormData({
                              ...newFormData,
                              cutTypes: [...newFormData.cutTypes, customCutInput.trim()],
                            });
                            setCustomCutInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCutInput.trim()) {
                          setNewFormData({
                            ...newFormData,
                            cutTypes: [...newFormData.cutTypes, customCutInput.trim()],
                          });
                          setCustomCutInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Cores Preferidas */}
                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-600" />
                    <span>Cores de Preferência (Cabelo / Tintura / Esmaltes)</span>
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_COLOR_SUGGESTIONS.map((col) => {
                      const selected = newFormData.preferredColors.includes(col);
                      return (
                        <button
                          type="button"
                          key={col}
                          onClick={() =>
                            setNewFormData({
                              ...newFormData,
                              preferredColors: toggleArrayItem(newFormData.preferredColors, col),
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            selected
                              ? 'bg-purple-700 text-white shadow-2xs font-bold'
                              : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          {selected ? `✓ ${col}` : `+ ${col}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Outra tonalidade ou cor..."
                      value={customColorInput}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customColorInput.trim()) {
                            setNewFormData({
                              ...newFormData,
                              preferredColors: [...newFormData.preferredColors, customColorInput.trim()],
                            });
                            setCustomColorInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs border border-purple-200 rounded-lg bg-white text-purple-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customColorInput.trim()) {
                          setNewFormData({
                            ...newFormData,
                            preferredColors: [...newFormData.preferredColors, customColorInput.trim()],
                          });
                          setCustomColorInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Nota Importante Inicial */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nota Importante Inicial (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Cabelo fino com luzes antigas, prefere água morna no lavatório..."
                    value={newFormData.notes}
                    onChange={(e) => setNewFormData({ ...newFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Cadastrar Cliente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FICHA DO CLIENTE COMPLETA, HISTÓRICO E PREFERÊNCIAS DO CLIENTE */}
      {/* ========================================================================= */}
      {selectedClientForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header: Client Identity Banner */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedClientForDetails.photoURL || AVATAR_OPTIONS[0]}
                    alt={selectedClientForDetails.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-white/10">
                        Ficha do Cliente
                      </span>
                      {selectedClientForDetails.birthDateFormatted && (
                        <span className="text-[11px] text-slate-300">
                          🎂 Aniversário: {selectedClientForDetails.birthDateFormatted}
                        </span>
                      )}
                      {/* Active Tags in Header */}
                      {(currentSelectedClient?.tags || selectedClientForDetails.tags || []).map((t) => {
                        const config = getClientTagConfig(t);
                        const TagIcon = config.icon;
                        return (
                          <span
                            key={t}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${config.headerBadgeClass}`}
                            title={config.description}
                          >
                            <TagIcon className="w-2.5 h-2.5" />
                            <span>{config.label}</span>
                          </span>
                        );
                      })}
                    </div>
                    <h3 className="text-xl font-extrabold text-white">
                      {selectedClientForDetails.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {selectedClientForDetails.phone}
                      </span>
                      {selectedClientForDetails.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {selectedClientForDetails.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://wa.me/55${selectedClientForDetails.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 fill-slate-950" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setSelectedClientForDetails(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Total de Atendimentos:</span>
                  <span className="font-extrabold text-white text-sm font-mono">
                    {clientAppointments.length || selectedClientForDetails.totalVisits || 0} sessões
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Gasto Acumulado:</span>
                  <span className="font-extrabold text-emerald-300 text-sm font-mono">
                    R$ {(selectedClientForDetails.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Especialista Favorito:</span>
                  <span className="font-bold text-amber-300 truncate block">
                    {activeProfessionals.find((p) => p.id === selectedClientForDetails.preferredProfessionalId)?.name || 'Qualquer um'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Quick Tag Bar */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 shrink-0">
                <Tag className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900">
                  Etiquetas de Segmentação:
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  (Clique para alternar)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_CLIENT_TAGS.map((preset) => {
                  const active = (currentSelectedClient?.tags || selectedClientForDetails.tags || []).some(
                    (t) => t.toLowerCase() === preset.label.toLowerCase()
                  );
                  const PresetIcon = preset.icon;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleToggleTagInDetails(preset.label)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border ${
                        active ? preset.pillBtnActiveClass : preset.pillBtnInactiveClass
                      }`}
                      title={preset.description}
                    >
                      <PresetIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{preset.label}</span>
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}

                {/* Custom Tags already added */}
                {(currentSelectedClient?.tags || selectedClientForDetails.tags || [])
                  .filter((t) => !PRESET_CLIENT_TAGS.some((p) => p.label.toLowerCase() === t.toLowerCase()))
                  .map((customTag) => (
                    <span
                      key={customTag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{customTag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(customTag)}
                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                        title="Remover etiqueta"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                {/* Add Custom Tag Form / Input */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="+ Outra tag..."
                    value={customNewTagInput}
                    onChange={(e) => setCustomNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTagInDetails();
                      }
                    }}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 w-28 sm:w-32"
                  />
                  {customNewTagInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddCustomTagInDetails}
                      className="p-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs cursor-pointer"
                      title="Adicionar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside Details */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={() => setDetailsTab('historico')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  detailsTab === 'historico'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Histórico de Serviços ({clientAppointments.length})</span>
              </button>

              <button
                onClick={() => setDetailsTab('preferencias')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  detailsTab === 'preferencias'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Preferências &amp; Alergias</span>
                {editPreferences.allergies && editPreferences.allergies.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono">
                    {editPreferences.allergies.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDetailsTab('notas')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  detailsTab === 'notas'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notas &amp; Observações ({selectedClientForDetails.importantNotes?.length || 0})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: HISTÓRICO DE SERVIÇOS PRESTADOS */}
              {detailsTab === 'historico' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Histórico Completo de Atendimentos
                      </h4>
                      <p className="text-xs text-slate-500">
                        Serviços realizados, valores, notas de atendimento e avaliações recebidas
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedClientForDetails(null);
                        openNewAppointmentModal({
                          date: new Date().toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Agendar Novo Serviço</span>
                    </button>
                  </div>

                  {clientAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {clientAppointments.map((app) => {
                        const pro = activeProfessionals.find((p) => p.id === app.professionalId);
                        const isCompleted = app.status === 'concluido';
                        const isCanceled = app.status === 'cancelado';

                        return (
                          <div
                            key={app.id}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                                  {app.date} · {app.startTime} às {app.endTime}
                                </span>
                                <h5 className="text-sm font-bold text-slate-900 mt-0.5">
                                  {app.serviceName}
                                </h5>
                                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                                  <span>Profissional: <strong>{app.professionalName || pro?.name || 'Especialista'}</strong></span>
                                  {app.durationMinutes && (
                                    <>
                                      <span>·</span>
                                      <span>{app.durationMinutes} min</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-sm font-extrabold text-slate-900 font-mono">
                                  R$ {app.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <div>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isCompleted
                                        ? 'bg-slate-100 text-slate-700'
                                        : isCanceled
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {app.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Avaliação pós-atendimento (Review estrelas & comentário) */}
                            {app.rating && (
                              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                                <div className="flex items-center gap-1 text-amber-800 font-bold text-[11px]">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3.5 h-3.5 ${
                                          star <= app.rating!
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-slate-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="ml-1">Avaliação do Cliente ({app.rating}/5)</span>
                                </div>
                                {app.reviewComment && (
                                  <p className="text-[11px] text-slate-700 italic">
                                    &ldquo;{app.reviewComment}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Notas do atendimento */}
                            {app.notes && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <strong>Nota do atendimento:</strong> {app.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        Nenhum atendimento registrado anteriormente para este cliente
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Assim que o cliente realizar sessões no studio, o histórico detalhado aparecerá aqui.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PREFERÊNCIAS (CORTES, CORES, ALERGIAS) */}
              {detailsTab === 'preferencias' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Ficha de Preferências &amp; Alergias
                      </h4>
                      <p className="text-xs text-slate-500">
                        Edite os tipos de corte, cores favoritas e alergias químicas para alertar a equipe
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Salvar Preferências</span>
                    </button>
                  </div>

                  {/* 1. Alergias e Restrições de Saúde (CRÍTICO) */}
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4 text-rose-600 fill-rose-600" />
                        <span>Alergias e Sensibilidades Químicas</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                        Alerta de Segurança
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_ALLERGY_SUGGESTIONS.map((alg) => {
                        const selected = (editPreferences.allergies || []).includes(alg);
                        return (
                          <button
                            type="button"
                            key={alg}
                            onClick={() =>
                              setEditPreferences({
                                ...editPreferences,
                                allergies: toggleArrayItem(editPreferences.allergies, alg),
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              selected
                                ? 'bg-rose-600 text-white shadow-2xs font-bold'
                                : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            {selected ? `✓ ${alg}` : `+ ${alg}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Adicionar alergia personalizada (ex: Amônia, Látex, Formol)..."
                        value={prefAllergyInput}
                        onChange={(e) => setPrefAllergyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (prefAllergyInput.trim()) {
                              setEditPreferences({
                                ...editPreferences,
                                allergies: [...(editPreferences.allergies || []), prefAllergyInput.trim()],
                              });
                              setPrefAllergyInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-rose-300 rounded-xl bg-white text-rose-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (prefAllergyInput.trim()) {
                            setEditPreferences({
                              ...editPreferences,
                              allergies: [...(editPreferences.allergies || []), prefAllergyInput.trim()],
                            });
                            setPrefAllergyInput('');
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Adicionar Alergia
                      </button>
                    </div>
                  </div>

                  {/* 2. Tipos de Corte / Estilo */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-slate-700" />
                      <span>Tipos de Corte &amp; Estilo de Preferência</span>
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_CUT_SUGGESTIONS.map((cut) => {
                        const selected = (editPreferences.cutTypes || []).includes(cut);
                        return (
                          <button
                            type="button"
                            key={cut}
                            onClick={() =>
                              setEditPreferences({
                                ...editPreferences,
                                cutTypes: toggleArrayItem(editPreferences.cutTypes, cut),
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              selected
                                ? 'bg-slate-900 text-white shadow-2xs font-bold'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {selected ? `✓ ${cut}` : `+ ${cut}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Adicionar estilo ou corte personalizado..."
                        value={prefCutInput}
                        onChange={(e) => setPrefCutInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (prefCutInput.trim()) {
                              setEditPreferences({
                                ...editPreferences,
                                cutTypes: [...(editPreferences.cutTypes || []), prefCutInput.trim()],
                              });
                              setPrefCutInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (prefCutInput.trim()) {
                            setEditPreferences({
                              ...editPreferences,
                              cutTypes: [...(editPreferences.cutTypes || []), prefCutInput.trim()],
                            });
                            setPrefCutInput('');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* 3. Cores de Preferência */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3">
                    <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-600" />
                      <span>Cores de Preferência (Cabelo / Tintura / Esmaltes)</span>
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_COLOR_SUGGESTIONS.map((col) => {
                        const selected = (editPreferences.preferredColors || []).includes(col);
                        return (
                          <button
                            type="button"
                            key={col}
                            onClick={() =>
                              setEditPreferences({
                                ...editPreferences,
                                preferredColors: toggleArrayItem(editPreferences.preferredColors, col),
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              selected
                                ? 'bg-purple-700 text-white shadow-2xs font-bold'
                                : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-100'
                            }`}
                          >
                            {selected ? `✓ ${col}` : `+ ${col}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Adicionar cor personalizada (ex: Castanho 6.0, Esmalte Nude)..."
                        value={prefColorInput}
                        onChange={(e) => setPrefColorInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (prefColorInput.trim()) {
                              setEditPreferences({
                                ...editPreferences,
                                preferredColors: [...(editPreferences.preferredColors || []), prefColorInput.trim()],
                              });
                              setPrefColorInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs border border-purple-200 rounded-xl bg-white text-purple-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (prefColorInput.trim()) {
                            setEditPreferences({
                              ...editPreferences,
                              preferredColors: [...(editPreferences.preferredColors || []), prefColorInput.trim()],
                            });
                            setPrefColorInput('');
                          }
                        }}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* 4. Preferências Gerais */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Preferências Gerais &amp; Observações de Conforto
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Não gosta de prancha com calor excessivo, gosta de café sem açúcar, pressão suave no lavatório..."
                      value={editPreferences.generalNotes || ''}
                      onChange={(e) => setEditPreferences({ ...editPreferences, generalNotes: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: NOTAS IMPORTANTES & OBSERVACÕES */}
              {detailsTab === 'notas' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Notas Importantes sobre o Cliente
                    </h4>
                    <p className="text-xs text-slate-500">
                      Registre observações de atendimento, histórico de fórmulas e detalhes para a equipe
                    </p>
                  </div>

                  {/* Formulário para Adicionar Nova Nota */}
                  <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-800 block">
                      Adicionar Nova Nota Importante
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Ex: Realizado teste de mecha com 20 volumes. Cabelo reagiu bem, sem quebra..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 bg-white"
                    />

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold select-none">
                        <input
                          type="checkbox"
                          checked={newNoteIsAlert}
                          onChange={(e) => setNewNoteIsAlert(e.target.checked)}
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="flex items-center gap-1 text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          Marcar como Alerta Crítico (Destaque Vermelho)
                        </span>
                      </label>

                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Registrar Nota</span>
                      </button>
                    </div>
                  </form>

                  {/* Lista de Notas Anteriores */}
                  <div className="space-y-2.5">
                    {selectedClientForDetails.importantNotes && selectedClientForDetails.importantNotes.length > 0 ? (
                      selectedClientForDetails.importantNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-3.5 rounded-2xl border transition-all space-y-1 ${
                            note.isAlert
                              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                              : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              {note.isAlert && <AlertTriangle className="w-3 h-3 text-rose-500 fill-rose-500" />}
                              Registrado por: {note.authorName}
                            </span>
                            <span>{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-xs leading-relaxed font-medium">
                            {note.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">
                          Nenhuma nota registrada até o momento
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Adicione lembretes, fórmulas ou observações no formulário acima.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Studio Digital · Ficha do cliente sincronizada com a base de dados
              </span>
              <button
                type="button"
                onClick={() => setSelectedClientForDetails(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Concluir &amp; Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
