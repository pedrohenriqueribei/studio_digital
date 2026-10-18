import React, { useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  Phone,
  Mail,
  Percent,
  Calendar,
  DollarSign,
  Edit2,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Professional, UserRole } from '../../types';

export const ProfessionalsManager: React.FC = () => {
  const {
    activeProfessionals,
    addProfessional,
    updateProfessional,
    currentBusiness,
    currentRole,
    switchRole,
    setActiveTab,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPro, setEditingPro] = useState<Professional | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
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
    setFormData({
      name: '',
      email: '',
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
    setFormData({
      name: pro.name,
      email: pro.email,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Equipe & Gestão de Profissionais
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de escalas, comissionamento e permissões de acesso (CEO, Gerente e Profissional)
          </p>
        </div>

        {currentRole !== 'profissional' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
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
                      <span
                        className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded border font-semibold ${roleBadge.bg}`}
                      >
                        {roleBadge.label}
                      </span>
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
                    <span>{pro.phone}</span>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-base font-bold text-slate-900">
                {editingPro ? 'Editar Profissional' : 'Cadastrar Membro da Equipe'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Dra. Mariana Ramos ou Diego Navalha"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@studio.com.br"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Perfil / Função no SaaS
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 bg-white"
                  >
                    <option value="profissional">Profissional / Executor</option>
                    <option value="gerente">Gerente Operacional</option>
                    <option value="ceo">CEO / Sócio Proprietário</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Especialidades (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="Ex: Toxina Botulínica, Harmonização, Corte Fade, Mechas..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Início da Jornada
                  </label>
                  <input
                    type="time"
                    value={formData.workStart}
                    onChange={(e) => setFormData({ ...formData, workStart: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Fim da Jornada
                  </label>
                  <input
                    type="time"
                    value={formData.workEnd}
                    onChange={(e) => setFormData({ ...formData, workEnd: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  Salvar Profissional
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
