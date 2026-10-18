import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Building2,
  Crown,
  ShieldCheck,
  ArrowRight,
  Clock,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessType } from '../../types';

interface LandingSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: string;
  isAnnual?: boolean;
}

export const LandingSignupModal: React.FC<LandingSignupModalProps> = ({
  isOpen,
  onClose,
  initialPlanId = 'pro',
  isAnnual = true,
}) => {
  const { registerBusiness, switchBusiness, navigateTo, saasPlans, addNotification } = useApp();

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [selectedType, setSelectedType] = useState<BusinessType>('clinica_estetica');
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  if (!isOpen) return null;

  const currentPlan = saasPlans.find((p) => p.id === selectedPlanId) || saasPlans[1];
  const monthlyPrice = isAnnual
    ? Math.round(currentPlan.priceMonthly * 0.8)
    : currentPlan.priceMonthly;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const newBiz = registerBusiness({
        name: name.trim(),
        tradeName: tradeName.trim() || name.trim(),
        type: selectedType,
        city,
        state,
        phone,
        planId: selectedPlanId,
        accentColor:
          selectedType === 'clinica_estetica'
            ? '#0ea5e9'
            : selectedType === 'barbearia'
            ? '#d97706'
            : '#8b5cf6',
      });

      switchBusiness(newBiz.id);
      setIsSubmitting(false);
      onClose();

      addNotification({
        title: 'Bem-vindo ao Studio Digital!',
        message: `Seu espaço "${newBiz.tradeName}" foi ativado com sucesso no plano ${currentPlan.name}. Aproveite seus 14 dias de teste grátis!`,
        type: 'system',
      });

      // Navigate to the live tenant dashboard
      navigateTo('/admin/dashboard');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-mono text-amber-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
              Teste Grátis de 14 Dias
            </span>
            <span className="text-xs text-slate-400">· Sem cartão de crédito</span>
          </div>

          <h3 className="text-2xl font-bold tracking-tight text-white">
            Ative o Studio Digital no seu espaço
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Configure sua unidade em menos de 2 minutos e comece a gerenciar agendamentos, comandas e equipe hoje mesmo.
          </p>
        </div>

        {/* Selected Plan Summary Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Crown className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-xs font-bold text-slate-800">
                Plano selecionado: {currentPlan.name}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {isAnnual ? 'Ciclo Anual (20% OFF aplicado)' : 'Ciclo Mensal'} · até {currentPlan.maxProfessionals} especialistas
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-extrabold text-slate-900 font-mono tabular-nums">
              R$ {monthlyPrice}
            </span>
            <span className="text-[10px] text-slate-500 block">/mês após teste</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Segment Selector for Business Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Estabelecimento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedType('clinica_estetica')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  selectedType === 'clinica_estetica'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Clínica Estética
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('salao_beleza')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  selectedType === 'salao_beleza'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-1 ring-purple-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Salão de Beleza
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('barbearia')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                  selectedType === 'barbearia'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-900 ring-1 ring-amber-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Barbearia
              </button>
            </div>
          </div>

          {/* Business & Owner Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Espaço / Clínica *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Belle Studio Jardins"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Responsável / Gestor *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ex: Dra. Juliana Souza"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Comercial *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-8888"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail para Login *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@seustudio.com.br"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UF
              </label>
              <input
                type="text"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="SP"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 text-center uppercase"
              />
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Acesso liberado imediatamente a todas as funções do plano <strong>{currentPlan.name}</strong>.</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Você pode cancelar a qualquer momento sem multas ou burocracia.</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Criando seu espaço...</span>
              ) : (
                <>
                  <span>Ativar Teste Grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
