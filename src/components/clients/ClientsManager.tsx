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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client } from '../../types';

export const ClientsManager: React.FC = () => {
  const {
    activeClients,
    addClient,
    currentBusiness,
    activeProfessionals,
    setIsNewAppointmentModalOpen,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return activeClients;
    const q = searchTerm.toLowerCase();
    return activeClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [activeClients, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    if (!currentBusiness) {
      alert('Selecione ou cadastre um estabelecimento primeiro.');
      return;
    }

    addClient({
      businessId: currentBusiness.id,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      notes: formData.notes.trim() || undefined,
    });

    setFormData({ name: '', phone: '', email: '', notes: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Base de Clientes & CRM
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico de visitas, preferências e canal direto via WhatsApp
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
          />
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline font-mono tabular-nums">
          {filteredClients.length} clientes encontrados
        </span>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const cleanPhone = client.phone.replace(/\D/g, '');
          const preferredPro = activeProfessionals.find(
            (p) => p.id === client.preferredProfessionalId
          );

          return (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {client.name}
                  </h4>
                  <a
                    href={`https://wa.me/55${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-[11px] font-semibold transition-colors shrink-0"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <div className="space-y-1 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {preferredPro && (
                    <div className="text-[11px] text-slate-500 pt-1">
                      <span className="text-slate-400">Preferência:</span> {preferredPro.name}
                    </div>
                  )}
                </div>

                {client.notes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 mb-3">
                    {client.notes}
                  </p>
                )}
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total de Visitas:</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {client.totalVisits} sessões
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Gasto Acumulado:</span>
                  <span className="font-extrabold text-slate-900 font-mono tabular-nums">
                    R$ {client.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Nenhum cliente cadastrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre novos clientes para ter histórico completo de atendimentos.
          </p>
        </div>
      )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-base font-bold text-slate-900">Novo Cliente</h3>
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
                  placeholder="Nome do cliente"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Preferências / Anotações
                </label>
                <textarea
                  rows={2}
                  placeholder="Alergias, preferências de corte, tratamentos..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
