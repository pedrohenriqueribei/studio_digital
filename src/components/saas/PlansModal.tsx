import React from 'react';
import { X, Crown, Check, Sparkles, Building2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SAAS_PLANS } from '../../data/mockData';

export const PlansModal: React.FC = () => {
  const { isPlansModalOpen, setIsPlansModalOpen, currentBusiness, addNotification, navigateTo } = useApp();

  if (!isPlansModalOpen) return null;

  const handleUpgrade = (planName: string) => {
    addNotification({
      title: 'Plano atualizado com sucesso!',
      message: `${currentBusiness?.tradeName || 'Estabelecimento'} agora está no plano ${planName}.`,
      type: 'system',
    });
    setIsPlansModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white/95 backdrop-blur-xs sticky top-0 z-10">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Studio Digital SaaS
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Planos & Assinatura para {currentBusiness?.tradeName || 'Estabelecimento'}
            </h3>
            <p className="text-xs text-slate-500">
              Escolha a capacidade ideal para o tamanho da sua equipe e volume de clientes
            </p>
          </div>
          <button
            onClick={() => setIsPlansModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {SAAS_PLANS.map((plan) => {
            const isCurrent = currentBusiness ? currentBusiness.planId === plan.id : false;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                  plan.isPopular
                    ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-full tracking-wide">
                    Mais Escolhido
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                        Seu Plano Atual
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                      R$ {plan.priceMonthly}
                    </span>
                    <span className="text-xs text-slate-500"> / mês</span>
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold cursor-default"
                    >
                      Plano Vigente
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.name)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        plan.isPopular
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      Mudar para {plan.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cobrança transparente sem fidelidade · Teste grátis de 14 dias</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsPlansModalOpen(false);
                navigateTo('/nossos-planos');
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Landing Page Pública (/nossos-planos)</span>
            </button>
            <button
              onClick={() => setIsPlansModalOpen(false)}
              className="text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
