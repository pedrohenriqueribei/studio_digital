import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, Shield, HelpCircle, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo, isSuperAdminView, currentBusiness } = useApp();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/60 text-slate-500 text-xs py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand & Status */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-center md:text-left">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <div className="w-5 h-5 rounded-md bg-slate-900 text-amber-400 flex items-center justify-center text-[10px]">
              <Sparkles className="w-3 h-3" />
            </div>
            <span>Studio Digital</span>
          </div>
          <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-slate-500 text-[11px]">
            {isSuperAdminView
              ? 'Ambiente de Governança Master'
              : currentBusiness
              ? `${currentBusiness.tradeName} · Multi-unidade`
              : 'Gestão Inteligente de Estúdios'}
          </span>
          <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
          <span className="text-[11px] text-slate-400 font-mono">
            v2.4 Pro
          </span>
        </div>

        {/* Center/Right: Institutional & Support Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-600">
          <button
            onClick={() => navigateTo('/nossos-planos')}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Nossos Planos
          </button>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <a
            href="#suporte"
            onClick={(e) => {
              e.preventDefault();
              window.open('https://wa.me/?text=Olá,%20preciso%20de%20suporte%20no%20Studio%20Digital', '_blank');
            }}
            className="hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Suporte WhatsApp</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-slate-400">Termos & Privacidade</span>
        </div>

        {/* Right: Copyright */}
        <div className="text-[11px] text-slate-400 text-center md:text-right font-mono">
          © {new Date().getFullYear()} Studio Digital SaaS. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
