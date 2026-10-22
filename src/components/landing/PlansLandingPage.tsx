import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  Crown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
  TrendingUp,
  Receipt,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Clock,
  Scissors,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LandingSignupModal } from './LandingSignupModal';

export const PlansLandingPage: React.FC = () => {
  const { navigateTo, saasPlans } = useApp();

  // Billing cycle state: true for annual (20% discount), false for monthly
  const [isAnnual, setIsAnnual] = useState(true);

  // ROI Calculator state
  const [proCount, setProCount] = useState(5);
  const [ticketMedio, setTicketMedio] = useState(140);
  const [clientsPerDayPro, setClientsPerDayPro] = useState(5);

  // FAQ Accordion open index
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Feature Comparison Table expansion
  const [showFullComparison, setShowFullComparison] = useState(false);

  // Signup Modal state
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState('pro');

  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Nossos Planos & Preços | Studio Digital SaaS';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const openTrialModal = (planId: string = 'pro') => {
    setSelectedPlanForModal(planId);
    setSignupModalOpen(true);
  };

  // ROI calculations
  const calculatedMetrics = useMemo(() => {
    // 24 business days per month
    const totalAppointmentsMonth = proCount * clientsPerDayPro * 24;
    const grossRevenueMonth = totalAppointmentsMonth * ticketMedio;

    // Time saved: ~15 mins per appointment saved in manual scheduling, WhatsApp confirm and cash close
    const hoursSavedPerMonth = Math.round((totalAppointmentsMonth * 12) / 60);

    // Revenue recovered from eliminating ~85% of typical 15% no-show rate
    const noShowRecovered = Math.round(totalAppointmentsMonth * 0.12 * ticketMedio);

    // Recommended plan
    let recommendedPlan = 'essencial';
    if (proCount > 10) recommendedPlan = 'prime';
    else if (proCount > 3) recommendedPlan = 'pro';

    return {
      totalAppointmentsMonth,
      grossRevenueMonth,
      hoursSavedPerMonth,
      noShowRecovered,
      recommendedPlan,
    };
  }, [proCount, ticketMedio, clientsPerDayPro]);

  // Pricing calculations
  const plansWithPrices = useMemo(() => {
    return saasPlans.map((plan) => {
      const monthly = plan.priceMonthly;
      const annualizedMonthly = Math.round(monthly * 0.8);
      return {
        ...plan,
        displayPrice: isAnnual ? annualizedMonthly : monthly,
        yearlyTotal: annualizedMonthly * 12,
        savingsYearly: (monthly - annualizedMonthly) * 12,
      };
    });
  }, [saasPlans, isAnnual]);

  const faqs = [
    {
      q: 'Como funciona o teste grátis de 14 dias?',
      a: 'Você cria a conta do seu estúdio em menos de 2 minutos e tem acesso irrestrito a todos os recursos do plano escolhido por 14 dias. Não exigimos cartão de crédito no momento do cadastro.',
    },
    {
      q: 'Preciso instalar algum aplicativo no computador ou celular?',
      a: 'Não. O Studio Digital é uma plataforma web 100% em nuvem (SaaS). Você e sua equipe acessam de qualquer navegador no celular, tablet, notebook ou iPad, sem downloads pesados e com dados sempre sincronizados.',
    },
    {
      q: 'Como funciona a divisão de comissões por profissional?',
      a: 'Você define a porcentagem de comissão padrão ou individual por serviço e profissional. Ao fechar a comanda do cliente no POS, o sistema calcula automaticamente a parte da casa e a do profissional, gerando o extrato detalhado da quinzena ou mês.',
    },
    {
      q: 'Posso alterar de plano ou cancelar a qualquer momento?',
      a: 'Sim. Você tem total liberdade. Se sua equipe crescer e você precisar de mais especialistas ou unidades, pode fazer upgrade instantâneo. Não há contratos de fidelidade com multas.',
    },
    {
      q: 'Consigo migrar clientes e serviços do meu sistema anterior ou planilhas?',
      a: 'Sim! Nossa equipe de suporte auxilia no cadastramento em lote de sua tabela de procedimentos e base de clientes para você começar sem perder histórico.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* 1. TOP BAR CONTRACT */}
      {/* [Brand title, one line] — [4-5 nav links, 1-2 word labels, single-line] — [1 primary action] */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              onClick={() => navigateTo('/nossos-planos')}
              className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity"
            >
              Studio Digital
            </span>
          </div>

          {/* Zone 2: 4–5 clean single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#beneficios" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Benefícios
            </a>
            <a href="#planos" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Planos & Preços
            </a>
            <a href="#calculadora" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Simulador ROI
            </a>
            <a href="#depoimentos" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Casos de Sucesso
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
          </nav>

          {/* Zone 3: Primary Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => navigateTo('/login')}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Acessar Painel
            </button>
            <button
              onClick={() => openTrialModal('pro')}
              className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="hidden sm:inline">Testar Grátis 14 Dias</span>
              <span className="sm:hidden">Testar Grátis</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 overflow-hidden border-b border-slate-100 bg-slate-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quiet Kicker metadata */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="font-mono text-slate-900 font-bold uppercase tracking-wider">
                  SaaS para Estética · Salões · Barbearias
                </span>
                <span aria-hidden="true">·</span>
                <span>Multi-Profissional</span>
              </div>

              {/* Dominant Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-5.5xl font-extrabold tracking-tight text-slate-900 leading-[1.12] text-balance">
                O sistema de gestão que multiplica o lucro e organiza o tempo do seu estúdio.
              </h1>

              {/* Concrete Value Proposition */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Centralize agenda inteligente sem faltas, comandas digitais com PIX instantâneo, comissões automatizadas por especialista e relatórios executivos para sua empresa crescer com previsibilidade.
              </p>

              {/* CTA Group */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => openTrialModal('pro')}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Começar Teste de 14 Dias Grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigateTo('/admin/painelmaster')}
                  className="px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Ver Demonstração ao Vivo</span>
                </button>
              </div>

              {/* Unboxed Trust Signals */}
              <div className="pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Sem necessidade de cartão
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Ativação em 2 minutos
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Suporte humanizado via WhatsApp
                </span>
              </div>
            </div>

            {/* Right Media Hero Box (5 Cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xl bg-slate-100 aspect-16/10 lg:aspect-4/3 group">
                <img
                  src="/src/assets/images/landing_hero_studio_1792101814569.jpg"
                  alt="Recepção moderna de clínica e salão de beleza utilizando o sistema Studio Digital"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                {/* Floating Metric Badge Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-lg text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900">Desempenho Médio dos Studios</span>
                    <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      +42% Lucro
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Ocupação Agenda</span>
                      <span className="font-extrabold text-slate-900 text-sm">94.2%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Queda de No-Show</span>
                      <span className="font-extrabold text-blue-600 text-sm">-85%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE CAPABILITIES (BENTO GRID WITH EDITORIAL NUMBERING) */}
      <section id="beneficios" className="py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Arquitetura de Gestão
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
              Tudo o que seu espaço precisa para operar no mais alto padrão.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Desenvolvido ouvindo donos de barbearias, clínicas de estética e salões premium que não aguentam mais perder dinheiro com faltas e planilhas manuais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bento Card 1 (Large 2 Cols) */}
            <div className="md:col-span-2 bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400">01</span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Agenda Multi-Profissional com Prevenção de No-Show
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                  Visualize a grade em tempo real lado a lado por especialista, com status visual de confirmação, horário bloqueado e histórico do cliente. Reduza até 85% das faltas com avisos prévios automáticos.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  Grade simultânea de horários
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  Badges de status visual (Confirmado, Pendente, Atendimento)
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  Histórico e ficha do cliente
                </span>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400">02</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Comandas Eletrônicas & Caixa Rápido POS
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Abra e feche comandas em segundos. Adicione produtos home-care, aplique cortesias e receba via PIX, Cartão ou Dinheiro sem atrito no balcão.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-medium text-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Divisão de pagamentos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Comprovante digital imediato</span>
                </div>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400">03</span>
                <h3 className="text-lg font-bold text-slate-900">
                  Comissões Transparentes por Profissional
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O fim das discussões no final do mês. Cada especialista acessa seu painel e acompanha seus agendamentos, clientes e comissões calculadas automaticamente.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-medium text-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                  <span>Taxas flexíveis por serviço</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                  <span>Extrato individual por login</span>
                </div>
              </div>
            </div>

            {/* Bento Card 4 (2 Cols) */}
            <div className="md:col-span-2 bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400">04</span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Painel Executivo do CEO & Gráficos de Ocupação Semanal
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                  Tome decisões embasadas com métricas de faturamento consolidado, volume de atendimentos por dia da semana com Recharts e ranking de procedimentos mais rentáveis.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-slate-900" />
                  Gráficos Recharts por dia da semana
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-slate-900" />
                  Isolamento de dados por Tenant / Filial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-slate-900" />
                  Níveis de acesso CEO, Gerente e Especialista
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE ROI & SAVINGS CALCULATOR */}
      <section id="calculadora" className="py-20 border-b border-slate-100 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Simulador Financeiro
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
              Calcule quanto o Studio Digital pode gerar de economia e lucro no seu espaço.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Arraste os controles para simular o tamanho da sua equipe e veja o retorno sobre o investimento imediato.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders Input Column (6 Cols) */}
            <div className="lg:col-span-6 bg-slate-800/80 p-6 sm:p-8 rounded-2xl border border-slate-700 space-y-6">
              {/* Slider 1: Professionals */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">
                    Número de especialistas na sua equipe
                  </label>
                  <span className="font-mono text-amber-400 font-bold text-sm">
                    {proCount} profissionais
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={proCount}
                  onChange={(e) => setProCount(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1 especialista</span>
                  <span>10</span>
                  <span>20 especialistas</span>
                </div>
              </div>

              {/* Slider 2: Ticket Médio */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">
                    Ticket médio por atendimento
                  </label>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    R$ {ticketMedio}
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="500"
                  step="10"
                  value={ticketMedio}
                  onChange={(e) => setTicketMedio(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>R$ 40</span>
                  <span>R$ 250</span>
                  <span>R$ 500+</span>
                </div>
              </div>

              {/* Slider 3: Atendimentos por dia */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">
                    Média de clientes atendidos/dia por profissional
                  </label>
                  <span className="font-mono text-blue-400 font-bold text-sm">
                    {clientsPerDayPro} clientes/dia
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={clientsPerDayPro}
                  onChange={(e) => setClientsPerDayPro(Number(e.target.value))}
                  className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>2 clientes</span>
                  <span>7</span>
                  <span>12 clientes</span>
                </div>
              </div>
            </div>

            {/* Results Column (6 Cols) */}
            <div className="lg:col-span-6 bg-slate-800/40 p-6 sm:p-8 rounded-2xl border border-slate-700 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                    Faturamento Bruto Estimado
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-white font-mono tabular-nums">
                    R$ {calculatedMetrics.grossRevenueMonth.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">/mês movimentado</span>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block mb-1">
                    Recuperação de No-Show
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                    +R$ {calculatedMetrics.noShowRecovered.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">com lembretes WhatsApp</span>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 block mb-1">
                    Tempo Economizado
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-blue-400 font-mono tabular-nums">
                    ~{calculatedMetrics.hoursSavedPerMonth} horas
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">sem planilhas e brigas</span>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 block mb-1">
                    Plano Recomendado
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-amber-300 capitalize">
                    {calculatedMetrics.recommendedPlan === 'pro'
                      ? 'Studio Pro'
                      : calculatedMetrics.recommendedPlan === 'prime'
                      ? 'Enterprise Prime'
                      : 'Essencial'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">ideal para seu porte</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Pronto para experimentar este resultado no seu estúdio?
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    O teste de 14 dias é totalmente gratuito e sem compromisso.
                  </p>
                </div>
                <button
                  onClick={() => openTrialModal(calculatedMetrics.recommendedPlan)}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Testar Este Plano Grátis
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING CARDS SECTION */}
      <section id="planos" className="py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header & Annual Toggle */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Planos & Contratação Transparente
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
              Escolha o plano ideal para a escala do seu negócio.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Todos os planos incluem 14 dias de teste grátis, atualizações contínuas de sistema e suporte humanizado.
            </p>

            {/* Billing Toggle (Monthly / Annual) */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isAnnual
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAnnual
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Anual com 20% OFF</span>
                <span className="text-[10px] font-mono bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                  2 MESES GRÁTIS
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plansWithPrices.map((plan) => {
              const isPro = plan.id === 'pro';
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-7 flex flex-col justify-between transition-all relative ${
                    isPro
                      ? 'border-2 border-slate-900 bg-white shadow-xl ring-4 ring-slate-900/5'
                      : 'border border-slate-200 bg-white shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                      Mais Escolhido por Clínicas & Salões
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                        {plan.id === 'essencial'
                          ? 'Perfeito para profissionais autônomos e estúdios iniciantes.'
                          : plan.id === 'pro'
                          ? 'Para clínicas, salões e barbearias consolidadas em expansão.'
                          : 'Para redes, franquias e operações de alta capacidade multilocais.'}
                      </p>
                    </div>

                    <div className="pb-5 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-slate-500">R$</span>
                        <span className="text-4xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                          {plan.displayPrice}
                        </span>
                        <span className="text-xs text-slate-500 font-medium"> / mês</span>
                      </div>
                      {isAnnual ? (
                        <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                          Faturado anualmente (economia de R$ {plan.savingsYearly}/ano)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 block mt-1">
                          Sem fidelidade · Cancele quando quiser
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                        O que está incluído:
                      </span>
                      <ul className="space-y-2.5 text-xs text-slate-600">
                        <li className="flex items-start gap-2 font-semibold text-slate-900">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {plan.maxProfessionals === 999
                              ? 'Especialistas Ilimitados'
                              : `Até ${plan.maxProfessionals} especialistas`}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {plan.maxUnits === 1
                              ? '1 Unidade'
                              : `Até ${plan.maxUnits} unidades gerenciadas`}
                          </span>
                        </li>
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => openTrialModal(plan.id)}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isPro
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      <span>
                        {plan.id === 'prime'
                          ? 'Falar com Consultor Prime'
                          : `Começar Teste do ${plan.name}`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="block text-center text-[10px] text-slate-400 mt-2">
                      14 dias de teste grátis · Ativação imediata
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle Full Comparison Table */}
          <div className="text-center pt-4">
            <button
              onClick={() => setShowFullComparison(!showFullComparison)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <span>{showFullComparison ? 'Ocultar Matriz Comparativa' : 'Ver Comparativo Completo de Recursos'}</span>
              {showFullComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Detailed Feature Comparison Table (Collapsible) */}
          {showFullComparison && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden mt-6 animate-in fade-in duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-4 font-bold">Recurso / Capacidade</th>
                      <th className="p-4 font-bold text-center">Essencial</th>
                      <th className="p-4 font-bold text-center bg-slate-100/60 text-slate-900">
                        Studio Pro
                      </th>
                      <th className="p-4 font-bold text-center">Enterprise Prime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Especialistas incluídos</td>
                      <td className="p-4 text-center font-mono">Até 3</td>
                      <td className="p-4 text-center font-mono font-bold bg-slate-50/50">Até 10</td>
                      <td className="p-4 text-center font-mono">Ilimitados</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Unidades / Filiais</td>
                      <td className="p-4 text-center font-mono">1</td>
                      <td className="p-4 text-center font-mono font-bold bg-slate-50/50">2</td>
                      <td className="p-4 text-center font-mono">Até 10</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Agenda Multi-Profissional</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">✓</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Comandas & Caixa POS com PIX</td>
                      <td className="p-4 text-center text-slate-400">Básico</td>
                      <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">Completo</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">Avançado + DRE</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Cálculo Automático de Comissões</td>
                      <td className="p-4 text-center text-slate-400">—</td>
                      <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">✓</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">✓ (Multi-nível)</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Login Individual por Profissional</td>
                      <td className="p-4 text-center text-slate-400">—</td>
                      <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">✓</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Gráfico de Ocupação Recharts</td>
                      <td className="p-4 text-center text-slate-400">—</td>
                      <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">✓</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Confirmação de Agenda por WhatsApp</td>
                      <td className="p-4 text-center font-mono">Manual</td>
                      <td className="p-4 text-center text-emerald-600 font-bold bg-slate-50/50">Automático</td>
                      <td className="p-4 text-center text-emerald-600 font-bold">Automático + API</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold text-slate-800">Suporte Técnico</td>
                      <td className="p-4 text-center text-slate-600">E-mail (24h)</td>
                      <td className="p-4 text-center text-slate-900 font-bold bg-slate-50/50">WhatsApp Prioritário</td>
                      <td className="p-4 text-center text-slate-900 font-bold">Gerente de Conta 24/7</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. SOCIAL PROOF / CASE STUDIES */}
      <section id="depoimentos" className="py-20 border-b border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Resultados Reais
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
              Quem usa o Studio Digital não volta para o papel.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Depoimentos de fundadores que transformaram a pontualidade e a rentabilidade de seus espaços.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Story 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-emerald-700 font-mono font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                  +38% Faturamento em 3 meses
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "Automatizamos o agendamento de pacotes e o retorno de bioestimulador. Nossos pacientes recebem o lembrete no WhatsApp e nunca mais tivemos horário vago de última hora."
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <img
                  src="/src/assets/images/avatar_aesthetic_dr_1792074706765.jpg"
                  alt="Dra. Camila Ramos"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Dra. Camila Ramos</h4>
                  <p className="text-[11px] text-slate-500">DermaLuxe Estética Jardins · SP</p>
                </div>
              </div>
            </div>

            {/* Story 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-blue-700 font-mono font-bold text-xs bg-blue-50 px-2.5 py-1 rounded-md inline-block">
                  85% menos no-show
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "Barbearia cheia sábado é uma loucura. A comanda digital com PIX facilitou a fila do caixa e os barbeiros conseguem acompanhar suas comissões pelo próprio celular."
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <img
                  src="/src/assets/images/avatar_barber_pro_1792074707155.jpg"
                  alt="Diego Santos Navalha"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Diego Santos "Navalha"</h4>
                  <p className="text-[11px] text-slate-500">Barbearia Dom Navalha · 8 Barbeiros</p>
                </div>
              </div>
            </div>

            {/* Story 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-purple-700 font-mono font-bold text-xs bg-purple-50 px-2.5 py-1 rounded-md inline-block">
                  Zero conflito de comissão
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "Eu perdia todo domingo fechando comissões de mechas e manicure. Hoje o sistema calcula em tempo real com transparência total para a equipe."
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <img
                  src="/src/assets/images/avatar_stylist_pro_1792074707601.jpg"
                  alt="Juliana Duarte"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Juliana Duarte</h4>
                  <p className="text-[11px] text-slate-500">Studio Bella Vita · Hair Stylist & CEO</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-20 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Dúvidas Frequentes
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tudo o que você precisa saber antes de começar.
            </h2>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="py-4">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer gap-4"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-xs text-slate-600 leading-relaxed mt-2.5 pr-8">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. BOTTOM CONVERSION CTA BANNER */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-400">
            14 Dias Sem Compromisso
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
            Pronto para colocar o seu estúdio em outro nível de organização?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Junte-se a centenas de salões, barbearias e clínicas que economizam tempo e aumentam sua lucratividade diária.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openTrialModal('pro')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ativar Meu Teste Grátis de 14 Dias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigateTo('/admin/painelmaster')}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Acessar Plataforma Demo
            </button>
          </div>

          <p className="text-[11px] text-slate-500 pt-2 font-mono">
            Sem cartão de crédito · Ativação imediata · Cancele quando desejar
          </p>
        </div>
      </section>

      {/* 9. QUIET FOOTER */}
      <footer className="py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-slate-900 text-sm">Studio Digital</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Plataforma SaaS de Gestão de Estúdios e Clínicas</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/admin/painelmaster')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Entrar no Sistema
            </button>
            <a href="#planos" className="hover:text-slate-900 transition-colors">
              Nossos Planos
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              Suporte & FAQ
            </a>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            © 2026 Studio Digital SaaS. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* 10. TRIAL SIGNUP MODAL */}
      <LandingSignupModal
        isOpen={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        initialPlanId={selectedPlanForModal}
        isAnnual={isAnnual}
      />
    </div>
  );
};
