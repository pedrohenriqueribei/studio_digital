import React, { useState } from 'react';
import { X, Building2, Sparkles, Check, Crown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessType } from '../../types';

export const NewStudioModal: React.FC = () => {
  const { isNewStudioModalOpen, setIsNewStudioModalOpen, registerBusiness } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('clinica_estetica');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [planId, setPlanId] = useState<'essencial' | 'pro' | 'prime'>('pro');

  if (!isNewStudioModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !phone.trim()) return;

    let accentColor = '#0f172a';
    if (type === 'clinica_estetica') accentColor = '#0d9488';
    if (type === 'barbearia') accentColor = '#b45309';
    if (type === 'salao_beleza') accentColor = '#db2777';

    registerBusiness({
      name: name.trim(),
      type,
      tradeName: name.trim(),
      city: city.trim(),
      state,
      phone: phone.trim(),
      cnpj: cnpj.trim() || undefined,
      planId,
      accentColor,
    });

    setIsNewStudioModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cadastrar Novo Studio / Estabelecimento
              </h3>
              <p className="text-xs text-slate-500">
                Integração SaaS multi-tenant instantânea
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNewStudioModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nome do Estabelecimento / Razão Social
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Clínica Bella Pele, Barbearia Real, Studio Glam..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Segmento de Atuação
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'clinica_estetica', label: 'Clínica de Estética' },
                { id: 'barbearia', label: 'Barbearia' },
                { id: 'salao_beleza', label: 'Salão de Beleza' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as BusinessType)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    type === item.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
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
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
                placeholder="SP"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 uppercase text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                required
                placeholder="(11) 99999-8888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                CNPJ (opcional)
              </label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Escolha do Plano Inicial SaaS
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'essencial', title: 'Essencial', price: 'R$ 129/mês', limit: '3 Profissionais' },
                { id: 'pro', title: 'Studio Pro', price: 'R$ 249/mês', limit: '10 Profissionais', popular: true },
                { id: 'prime', title: 'Enterprise', price: 'R$ 489/mês', limit: 'Ilimitado' },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPlanId(p.id as any)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                    planId === p.id
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-slate-900 block">{p.title}</span>
                  <span className="text-[11px] font-mono text-slate-700 block font-semibold">{p.price}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{p.limit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewStudioModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Criar Estabelecimento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
