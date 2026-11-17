import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  Phone,
  Mail,
  Percent,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Copy,
  Lock,
  Eye,
  EyeOff,
  Key,
  Star,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Professional, UserRole } from '../../types';
import { slugify } from '../../utils/slugify';
import { MaskedInput } from '../ui/MaskedInput';
import { maskPhone } from '../../utils/masks';

export const ProfessionalsManager: React.FC = () => {
  const {
    activeProfessionals,
    addProfessional,
    updateProfessional,
    currentBusiness,
    currentRole,
    switchRole,
    setActiveTab,
    navigateTo,
    setSettingsSubTab,
    setSelectedProfessionalForAvailabilityId,
  } = useApp();

  const [copiedProId, setCopiedProId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<Professional | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-foco imediato no campo Nome ao abrir a modal
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'profissional' as UserRole,
    avatar: '',
    specialties: '',
    commissionPercentage: 50,
    bio: '',
    workStart: '09:00',
    workEnd: '19:00',
  });

  const openAddModal = () => {
    setEditingPro(null);
    setShowPassword(false);
    setFormData({
      name: '',
      email: '',
      password: 'pro' + Math.floor(100 + Math.random() * 900),
      phone: '',
      role: 'profissional',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
      specialties: 'Atendimento, Especialista',
      commissionPercentage: 50,
      bio: '',
      workStart: '09:00',
      workEnd: '19:00',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pro: Professional) => {
    setEditingPro(pro);
    setShowPassword(false);
    setFormData({
      name: pro.name,
      email: pro.email,
      password: pro.password || 'pro123',
      phone: pro.phone,
      role: pro.role,
      avatar: pro.avatar,
      specialties: pro.specialties.join(', '),
      commissionPercentage: pro.commissionPercentage,
      bio: pro.bio || '',
      workStart: pro.workHours.start,
      workEnd: pro.workHours.end,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const specs = formData.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingPro) {
      updateProfessional({
        ...editingPro,
        name: formData.name,
        email: formData.email,
        password: formData.password || 'pro123',
        phone: formData.phone,
        role: formData.role,
        avatar: formData.avatar || editingPro.avatar,
        specialties: specs.length > 0 ? specs : ['Especialista'],
        commissionPercentage: formData.commissionPercentage,
        bio: formData.bio,
        workHours: {
          start: formData.workStart,
          end: formData.workEnd,
          daysOfWeek: [1, 2, 3, 4, 5, 6],
        },
      });
    } else {
      if (!currentBusiness) {
        alert('Selecione um estabelecimento antes de cadastrar profissionais.');
        return;
      }
      addProfessional({
        businessId: currentBusiness.id,
        name: formData.name,
        email: formData.email,
        password: formData.password || 'pro123',
        phone: formData.phone,
        role: formData.role,
        avatar:
          formData.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
        specialties: specs.length > 0 ? specs : ['Especialista'],
        commissionPercentage: formData.commissionPercentage,
        bio: formData.bio,
        active: true,
        workHours: {
          start: formData.workStart,
          end: formData.workEnd,
          daysOfWeek: [1, 2, 3, 4, 5, 6],
        },
      });
    }
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return { label: 'Super Admin Master', bg: 'bg-amber-50 text-amber-900 border-amber-300' };
      case 'ceo':
        return { label: 'CEO / Proprietário', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'gerente':
        return { label: 'Gerente', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'profissional':
      default:
        return { label: 'Profissional', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-5 py-4 sm:px-6 sm:py-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">
              Equipe & Gestão de Profissionais
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
              {activeProfessionals.length} {activeProfessionals.length === 1 ? 'membro' : 'membros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal">
            Controle de escalas, comissionamento e permissões de acesso ao sistema
          </p>
        </div>

        {currentRole !== 'profissional' && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Cadastrar Profissional</span>
          </button>
        )}
      </div>

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeProfessionals.map((pro) => {
          const roleBadge = getRoleBadge(pro.role);

          return (
            <div
              key={pro.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={pro.avatar}
                      alt={pro.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {pro.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${roleBadge.bg}`}
                        >
                          {roleBadge.label}
                        </span>
                        {pro.averageRating !== undefined && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 font-bold">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span>{pro.averageRating.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {currentRole !== 'profissional' && (
                    <button
                      onClick={() => openEditModal(pro)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar profissional"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {pro.specialties.map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{maskPhone(pro.phone) || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{pro.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Jornada: {pro.workHours.start} às {pro.workHours.end} (Seg-Sáb)
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission and Performance Footer */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Comissão Padrão:</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {pro.commissionPercentage}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ganhos no Mês:</span>
                  <span className="font-extrabold text-emerald-700 font-mono tabular-nums text-sm">
                    R$ {pro.totalEarningsMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Switch view to this professional button */}
                <button
                  onClick={() => {
                    switchRole('profissional', pro.id);
                    setActiveTab('agenda');
                  }}
                  className="w-full mt-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ver Agenda Deste Profissional</span>
                </button>

                {/* Configure Availability button */}
                <button
                  onClick={() => {
                    setSelectedProfessionalForAvailabilityId(pro.id);
                    setSettingsSubTab('disponibilidade');
                    setActiveTab('configuracoes');
                  }}
                  className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  title={`Configurar período e disponibilidade de ${pro.name}`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Configurar Disponibilidade</span>
                </button>

                {/* Public Profile Page Link & Share */}
                {(() => {
                  const pSlug = pro.slug || slugify(pro.name);
                  const isCopied = copiedProId === pro.id;

                  const handleCopy = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}/p/${pSlug}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setCopiedProId(pro.id);
                      setTimeout(() => setCopiedProId(null), 2500);
                    });
                  };

                  return (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => navigateTo(`/p/${pSlug}`)}
                        className="flex-1 py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/70 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title={`Acessar página de agendamento exclusiva de ${pro.name}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span className="truncate">Ver Perfil (/p/{pSlug})</span>
                      </button>

                      <button
                        onClick={handleCopy}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        title="Copiar link exclusivo do profissional"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {activeProfessionals.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Nenhum profissional cadastrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre os membros da equipe para organizar escalas e agendas.
          </p>
        </div>
      )}

      {/* Add / Edit Professional Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 w-full max-w-lg max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white/95 backdrop-blur-xs shrink-0 sticky top-0 z-10">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  {editingPro ? 'Editar Profissional' : 'Cadastrar Membro da Equipe'}
                </h3>
                <p className="text-[11px] text-slate-500 font-normal">
                  {editingPro ? 'Atualize os dados e acessos do profissional' : 'Preencha os dados cadastrais e permissões de acesso'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="professionals-modal-form-container p-6 pb-8 space-y-4 overflow-y-auto flex-1 overscroll-contain [overscroll-behavior:contain]"
            >
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  Nome Completo
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Dra. Mariana Ramos ou Diego Navalha"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <MaskedInput
                maskType="phone"
                label="Telefone / WhatsApp"
                required
                value={formData.phone}
                leftIcon={<Phone className="w-3.5 h-3.5 text-slate-400" />}
                onValueChange={(cleanVal) => setFormData({ ...formData, phone: cleanVal })}
                helperText="Formatação dinâmica com DDD (fixo ou celular)"
              />

              {/* Credenciais de Acesso (Login Firebase Auth) */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>Credenciais de Login (Firebase Auth)</span>
                  </span>
                  <span className="text-[10px] bg-slate-200/70 text-slate-700 font-mono px-2 py-0.5 rounded-md font-semibold">
                    RBAC: professional
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1.5">
                      E-mail de Acesso
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="pro@studiodigital.com"
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1.5">
                      Senha de Acesso (Firebase)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all font-mono text-slate-800 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Permite autenticar nativamente no portal e gerenciar sua agenda exclusiva.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Perfil / Função no SaaS
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all bg-white text-slate-800"
                  >
                    <option value="profissional">Profissional / Executor</option>
                    <option value="gerente">Gerente Operacional</option>
                    <option value="ceo">CEO / Sócio Proprietário</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Comissão Padrão (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={formData.commissionPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commissionPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all font-mono tabular-nums bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  Especialidades (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="Ex: Toxina Botulínica, Harmonização, Corte Fade, Mechas..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Início da Jornada
                  </label>
                  <input
                    type="time"
                    value={formData.workStart}
                    onChange={(e) => setFormData({ ...formData, workStart: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all font-mono tabular-nums bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">
                    Fim da Jornada
                  </label>
                  <input
                    type="time"
                    value={formData.workEnd}
                    onChange={(e) => setFormData({ ...formData, workEnd: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-all font-mono tabular-nums bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-md z-10 -mx-6 -mb-8 px-6 pb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  <span>Salvar Profissional</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
