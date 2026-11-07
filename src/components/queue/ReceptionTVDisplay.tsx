import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Sparkles,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { playReceptionChime } from '../../utils/audioChime';

export const ReceptionTVDisplay: React.FC = () => {
  const { activeQueueItems, currentBusiness, navigateTo } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const lastCalledIdRef = useRef<string | null>(null);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Senhas com status 'chamado' ordenadas pela mais recente
  const calledTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'chamado')
      .sort((a, b) => (b.calledAt || '').localeCompare(a.calledAt || ''));
  }, [activeQueueItems]);

  const activeCalledTicket = calledTickets[0] || null;

  // Efeito sonoro automático quando uma nova senha entra em 'chamado'
  useEffect(() => {
    if (activeCalledTicket && activeCalledTicket.id !== lastCalledIdRef.current) {
      lastCalledIdRef.current = activeCalledTicket.id;
      if (!isMuted) {
        playReceptionChime();
      }
    }
  }, [activeCalledTicket, isMuted]);

  // Próximas senhas na fila
  const upcomingTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'aguardando')
      .slice(0, 6);
  }, [activeQueueItems]);

  // Últimas senhas atendidas / chamadas recentemente
  const recentTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'em_atendimento' || q.status === 'concluido')
      .slice(0, 5);
  }, [activeQueueItems]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top Banner da TV */}
      <header className="px-6 sm:px-10 py-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Tv className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{currentBusiness?.tradeName || 'Studio Digital'}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-widest">
                Painel Recepção
              </span>
            </h1>
            <p className="text-xs text-slate-400 capitalize">{formattedDate}</p>
          </div>
        </div>

        {/* Real-Time Clock & TV Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-amber-400 tabular-nums">
              {formattedTime}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Horário de Brasília</div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? 'Ativar Som da Chamada' : 'Mutar Som'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={() => navigateTo('/app/gerente/fila')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Sistema</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body: Spotlight vs Queue Grids */}
      <div className="flex-1 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch overflow-hidden">
        {/* Left / Center Spotlight: Senha Chamada */}
        <div className="lg:col-span-8 flex flex-col justify-center">
          {activeCalledTicket ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 border-2 border-amber-400/80 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center animate-pulse">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Tag Chamando */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-sm font-black uppercase tracking-widest mb-6">
                <Bell className="w-4 h-4 animate-bounce" />
                <span>Chamando no Atendimento</span>
              </div>

              {/* Número da Senha Gigante */}
              <div className="text-8xl sm:text-9xl font-black font-mono tracking-tight text-amber-400 drop-shadow-md mb-4 tabular-nums">
                {activeCalledTicket.ticketNumber}
              </div>

              {/* Nome do Cliente */}
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
                {activeCalledTicket.clientName}
              </h2>

              {/* Serviço e Profissional */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm sm:text-lg text-slate-300 mb-8">
                <span className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                  <Scissors className="w-5 h-5 text-indigo-400" />
                  <span>{activeCalledTicket.serviceName}</span>
                </span>

                <span className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span>
                    Profissional:{' '}
                    <strong className="text-white">
                      {activeCalledTicket.assignedProfessionalName ||
                        activeCalledTicket.professionalName ||
                        'Bancada Disponível'}
                    </strong>
                  </span>
                </span>
              </div>

              <p className="text-sm sm:text-base text-slate-400 font-medium">
                Por favor, dirija-se à bancada de atendimento indicada.
              </p>
            </div>
          ) : (
            /* Standby Elegante quando nenhuma senha está no ar */
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-14 shadow-2xl flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
                <Sparkles className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2">
                Recepção {currentBusiness?.tradeName || 'Studio Digital'}
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg mb-8 leading-relaxed">
                Aguarde a chamada da sua senha neste monitor. Em caso de dúvidas, consulte nossa equipe na recepção.
              </p>

              {upcomingTickets.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                  <Clock className="w-4 h-4" />
                  <span>
                    Próxima senha na fila:{' '}
                    <strong className="font-mono text-white">
                      {upcomingTickets[0].ticketNumber} ({upcomingTickets[0].clientName})
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Próximas Senhas e Últimas Chamadas */}
        <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
          {/* Próximas Senhas */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Próximas Senhas
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-md">
                {upcomingTickets.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {upcomingTickets.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  Nenhuma senha aguardando.
                </div>
              ) : (
                upcomingTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-base font-extrabold font-mono text-indigo-400 tabular-nums">
                        {t.ticketNumber}
                      </span>
                      <span className="text-xs font-bold text-white block">{t.clientName}</span>
                      <span className="text-[11px] text-slate-400">{t.serviceName}</span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                      ~{t.estimatedWaitMinutes} min
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Últimas Senhas Chamadas */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Últimos Atendimentos
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {recentTickets.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  Nenhum atendimento anterior hoje.
                </div>
              ) : (
                recentTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-300 mr-2">
                        {t.ticketNumber}
                      </span>
                      <span className="text-slate-200 font-semibold">{t.clientName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {t.assignedProfessionalName || t.professionalName || 'Atendido'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
