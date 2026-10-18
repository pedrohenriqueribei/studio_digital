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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Service } from '../../types';

export const ServicesManager: React.FC = () => {
  const {
    activeServices,
    activeProfessionals,
    addService,
    updateService,
    deleteService,
    currentBusiness,
    currentRole,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form state
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    activeServices.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [activeServices]);

  const filteredServices = useMemo(() => {
    return activeServices.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.description.toLowerCase().includes(q) &&
          !s.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeServices, categoryFilter, searchTerm]);

  const openAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: categories[0] || 'Geral',
      durationMinutes: 45,
      price: 120,
      commissionPercentage: 50,
      description: '',
      allowedProfessionalIds: activeProfessionals.map((p) => p.id),
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      durationMinutes: service.durationMinutes,
      price: service.price,
      commissionPercentage: service.commissionPercentage,
      description: service.description,
      allowedProfessionalIds: service.allowedProfessionalIds,
      active: service.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingService) {
      updateService({
        ...editingService,
        ...formData,
      });
    } else {
      if (!currentBusiness) {
        alert('Selecione um estabelecimento antes de adicionar serviços.');
        return;
      }
      addService({
        businessId: currentBusiness.id,
        ...formData,
      });
    }
    setIsModalOpen(false);
  };

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

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Catálogo de Serviços & Tabela de Preços
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie duração, valores e percentual de comissão dos profissionais do {currentBusiness?.tradeName || 'Studio'}
          </p>
        </div>

        {currentRole !== 'profissional' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Serviço</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({activeServices.length})
          </button>
          {categories.map((cat) => {
            const count = activeServices.filter((s) => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome ou categoria..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const proNames = service.allowedProfessionalIds.length === 0
            ? 'Todos os profissionais habilitados'
            : activeProfessionals
                .filter((p) => service.allowedProfessionalIds.includes(p.id))
                .map((p) => p.name.split(' ')[0])
                .join(', ');

          const proComissionValue = (service.price * service.commissionPercentage) / 100;

          return (
            <div
              key={service.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {service.durationMinutes} min
                    </span>
                    {currentRole !== 'profissional' && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Editar serviço"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja remover "${service.name}"?`)) {
                              deleteService(service.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mb-1.5 leading-snug">
                  {service.name}
                </h4>

                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {service.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400 font-medium">Preço ao cliente:</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                    R$ {service.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Comissão profissional:</span>
                  <span className="font-semibold text-emerald-700 font-mono tabular-nums">
                    {service.commissionPercentage}% (~R$ {proComissionValue.toFixed(2)})
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-slate-50">
                  <span className="font-medium text-slate-600">Executores: </span>
                  {proNames}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Scissors className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Nenhum serviço encontrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Experimente limpar a busca ou cadastre um novo serviço para este studio.
          </p>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="text-base font-bold text-slate-900">
                {editingService ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
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
                  Nome do Serviço / Procedimento
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Toxina Botulínica, Corte Fade, Mechas..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Cabelo, Barba, Facial..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Duração (Minutos)
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={5}
                    required
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Comissão do Profissional (%)
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
                  Descrição detalhada
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Produtos utilizados, indicações para o cliente..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Profissionais Habilitados a Realizar:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                  {activeProfessionals.map((pro) => {
                    const isChecked = formData.allowedProfessionalIds.includes(pro.id);
                    return (
                      <label
                        key={pro.id}
                        className="flex items-center gap-2 p-1.5 rounded text-xs text-slate-700 cursor-pointer hover:bg-slate-100"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProfessionalSelection(pro.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0"
                        />
                        <span className="truncate">{pro.name}</span>
                      </label>
                    );
                  })}
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
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
