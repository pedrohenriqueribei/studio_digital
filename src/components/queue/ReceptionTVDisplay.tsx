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
  Mic,
  MicOff,
  Radio,
  Building2,
  ChevronDown,
  Timer,
  Play,
  RotateCcw,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';
import { playReceptionChime, announceTicketVoice } from '../../utils/audioChime';
import { handleFirestoreError, OperationType } from '../../services/firestoreSync';
import { VirtualQueueItem, Professional, Business } from '../../types';

export const ReceptionTVDisplay: React.FC = () => {
  const {
    currentBusiness: contextBusiness,
    businesses: contextBusinesses,
    navigateTo,
    activeProfessionals: contextProfessionals,
  } = useApp();

  // Estado de dados em tempo real direto do Firestore
  const [firestoreQueue, setFirestoreQueue] = useState<VirtualQueueItem[]>([]);
  const [firestorePros, setFirestorePros] = useState<Professional[]>([]);
  const [firestoreBusinesses, setFirestoreBusinesses] = useState<Business[]>([]);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Seleção de Tenant (permite escolher via URL ?businessId=... ou dropdown)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBiz = params.get('businessId') || params.get('biz');
      if (urlBiz) return urlBiz;
    }
    return contextBusiness?.id || '';
  });

  // Relógio em tempo real
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showBusinessSelect, setShowBusinessSelect] = useState(false);

  // Referência para controlar o último ticket chamado e não repetir áudio
  const lastCalledIdRef = useRef<string | null>(null);
  const lastCalledTimestampRef = useRef<string | null>(null);

  // Relógio de segundos
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. SINCRONIZAÇÃO EM TEMPO REAL: Fila Virtual do Firestore
  useEffect(() => {
    const path = 'virtualQueue';
    const unsub = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items: VirtualQueueItem[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as VirtualQueueItem);
        });
        setFirestoreQueue(items);
        setIsFirestoreConnected(true);
        setLastSyncTime(new Date());
      },
      (error) => {
        console.warn('Erro na sincronização em tempo real da fila:', error);
        setIsFirestoreConnected(false);
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Captura para não travar o painel da TV
        }
      }
    );

    return () => unsub();
  }, []);

  // 2. SINCRONIZAÇÃO EM TEMPO REAL: Profissionais do Firestore (para fotos e especialidades)
  useEffect(() => {
    const path = 'professionals';
    const unsub = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const pros: Professional[] = [];
        snapshot.forEach((doc) => {
          pros.push(doc.data() as Professional);
        });
        setFirestorePros(pros);
      },
      (error) => {
        console.warn('Erro ao sincronizar profissionais no painel:', error);
      }
    );

    return () => unsub();
  }, []);

  // 3. SINCRONIZAÇÃO EM TEMPO REAL: Estabelecimentos do Firestore
  useEffect(() => {
    const path = 'businesses';
    const unsub = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const bizs: Business[] = [];
        snapshot.forEach((doc) => {
          bizs.push(doc.data() as Business);
        });
        setFirestoreBusinesses(bizs);

        // Se ainda não tiver estabelecimento selecionado, define o primeiro disponível
        if (!selectedBusinessId && bizs.length > 0) {
          setSelectedBusinessId(bizs[0].id);
        }
      },
      (error) => {
        console.warn('Erro ao sincronizar estabelecimentos no painel:', error);
      }
    );

    return () => unsub();
  }, [selectedBusinessId]);

  // Lista de estabelecimentos combinando Firestore e Contexto
  const businessesList = useMemo(() => {
    if (firestoreBusinesses.length > 0) return firestoreBusinesses;
    return contextBusinesses;
  }, [firestoreBusinesses, contextBusinesses]);

  // Estabelecimento ativo
  const currentBusiness = useMemo(() => {
    if (selectedBusinessId) {
      const found = businessesList.find((b) => b.id === selectedBusinessId);
      if (found) return found;
    }
    return contextBusiness || businessesList[0] || null;
  }, [selectedBusinessId, businessesList, contextBusiness]);

  // Atualiza selectedBusinessId se o contextBusiness mudar e nada tiver sido selecionado
  useEffect(() => {
    if (!selectedBusinessId && currentBusiness?.id) {
      setSelectedBusinessId(currentBusiness.id);
    }
  }, [currentBusiness?.id, selectedBusinessId]);

  // Profissionais da unidade ativa
  const professionalsMap = useMemo(() => {
    const list = firestorePros.length > 0 ? firestorePros : contextProfessionals;
    const map = new Map<string, Professional>();
    list.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [firestorePros, contextProfessionals]);

  // Itens da fila pertencentes ao estabelecimento selecionado
  const activeQueueItems = useMemo(() => {
    if (!currentBusiness) return firestoreQueue;
    return firestoreQueue.filter(
      (q) => q.businessId === currentBusiness.id || q.tenant_id === currentBusiness.id
    );
  }, [firestoreQueue, currentBusiness]);

  // 1. Senhas com status 'chamado' ordenadas pela mais recente
  const calledTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'chamado')
      .sort((a, b) => (b.calledAt || '').localeCompare(a.calledAt || ''));
  }, [activeQueueItems]);

  const activeCalledTicket = calledTickets[0] || null;

  // 2. Senhas em atendimento atual ('em_atendimento') com os profissionais atendendo
  const attendingTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'em_atendimento')
      .sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  }, [activeQueueItems]);

  // 3. Próximas senhas aguardando na fila ('aguardando')
  const upcomingTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'aguardando')
      .sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || ''))
      .slice(0, 8);
  }, [activeQueueItems]);

  // 4. Últimas senhas concluídas hoje ('concluido')
  const completedTickets = useMemo(() => {
    return activeQueueItems
      .filter((q) => q.status === 'concluido')
      .sort((a, b) => (b.completedAt || b.joinedAt || '').localeCompare(a.completedAt || a.joinedAt || ''))
      .slice(0, 6);
  }, [activeQueueItems]);

  // EFEITO SONORO E ANÚNCIO DE VOZ AUTOMÁTICO QUANDO UMA NOVA SENHA FOR CHAMADA
  useEffect(() => {
    if (activeCalledTicket) {
      const callId = activeCalledTicket.id;
      const callTimestamp = activeCalledTicket.calledAt || '';

      // Toca se for um ticket diferente ou se o chamado tiver sido renovado/repetido
      if (callId !== lastCalledIdRef.current || callTimestamp !== lastCalledTimestampRef.current) {
        lastCalledIdRef.current = callId;
        lastCalledTimestampRef.current = callTimestamp;

        if (!isMuted) {
          playReceptionChime();
          if (isVoiceEnabled) {
            const proName =
              activeCalledTicket.assignedProfessionalName ||
              activeCalledTicket.professionalName ||
              undefined;
            announceTicketVoice(
              activeCalledTicket.ticketNumber,
              activeCalledTicket.clientName,
              proName
            );
          }
        }
      }
    }
  }, [activeCalledTicket, isMuted, isVoiceEnabled]);

  // Testar alerta sonoro manualmente
  const handleTestChime = () => {
    playReceptionChime();
    if (isVoiceEnabled) {
      announceTicketVoice('T01', 'Teste da Recepção', 'Equipe de Atendimento');
    }
  };

  // Repetir chamada da senha em destaque
  const handleRepeatCurrentCall = () => {
    if (activeCalledTicket) {
      playReceptionChime();
      if (isVoiceEnabled) {
        const proName =
          activeCalledTicket.assignedProfessionalName ||
          activeCalledTicket.professionalName ||
          undefined;
        announceTicketVoice(
          activeCalledTicket.ticketNumber,
          activeCalledTicket.clientName,
          proName
        );
      }
    }
  };

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

  // Calcula tempo decorrido do atendimento em minutos
  const getElapsedMinutes = (startedAt?: string): number => {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    const now = currentTime.getTime();
    const diff = Math.max(0, Math.floor((now - start) / 60000));
    return diff;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top Banner da TV com Relógio e Indicador de Sincronização ao Vivo */}
      <header className="px-6 sm:px-10 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-xl backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Tv className="w-6 h-6 text-indigo-400" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {currentBusiness?.tradeName || currentBusiness?.name || 'Studio Digital'}
              </h1>

              {/* Seletor rápido de unidade/estabelecimento se houver mais de um */}
              {businessesList.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBusinessSelect(!showBusinessSelect)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  >
                    <Building2 className="w-3 h-3 text-indigo-400" />
                    <span>Trocar Unidade</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showBusinessSelect && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50">
                      {businessesList.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedBusinessId(b.id);
                            setShowBusinessSelect(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                            b.id === currentBusiness?.id
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{b.tradeName || b.name}</span>
                          {b.id === currentBusiness?.id && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-widest hidden sm:inline-flex">
                Painel Recepção TV
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="capitalize">{formattedDate}</span>
              <span className="text-slate-600">•</span>
              {/* Indicador de Conexão em Tempo Real com o Firestore */}
              <div className="inline-flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isFirestoreConnected
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-300">
                  {isFirestoreConnected ? 'Ao vivo via Firestore' : 'Conectando ao banco...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Relógio de Precisão & Controles da Recepção */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-amber-400 tabular-nums">
              {formattedTime}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Brasília (DF)
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            {/* Botão de Voz Sintetizada (TTS) */}
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isVoiceEnabled
                  ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              title={isVoiceEnabled ? 'Voz de chamada ativada (clique para desativar)' : 'Ativar voz de chamada'}
            >
              {isVoiceEnabled ? <Mic className="w-4 h-4 text-indigo-400" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden xl:inline text-[11px]">Voz</span>
            </button>

            {/* Botão de Som da Campainha */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isMuted ? 'Ativar Campainha Sonora' : 'Mutar Som'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>

            {/* Testar Áudio */}
            <button
              onClick={handleTestChime}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer hidden md:flex items-center gap-1.5 text-xs font-medium"
              title="Testar Campainha e Voz"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-[11px]">Testar Som</span>
            </button>

            {/* Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Voltar ao Sistema */}
            <button
              onClick={() => navigateTo('/app/gerente/fila')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Painel */}
      <div className="flex-1 p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch overflow-hidden">
        {/* LADO ESQUERDO / CENTRAL (Col 1 a 8):
            1. Destaque de Senha Chamada (Spotlight)
            2. Grade de Senhas Atuais em Atendimento com o Profissional que está Atendendo
        */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto">
          {/* 1. DESTAQUE: SENHA CHAMADA (SE HOUVER SENHA NO STATUS 'CHAMADO') */}
          {activeCalledTicket ? (
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border-3 border-amber-400 rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(251,191,36,0.25)] relative overflow-hidden flex flex-col items-center justify-center text-center animate-pulse">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

              {/* Tag Chamando Agora */}
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-amber-500/25 border border-amber-400 text-amber-300 text-sm sm:text-base font-black uppercase tracking-widest mb-4 shadow-md">
                <Bell className="w-5 h-5 animate-bounce text-amber-400" />
                <span>Chamando no Atendimento</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              </div>

              {/* Número da Senha Gigante */}
              <div className="text-8xl sm:text-9xl font-black font-mono tracking-tight text-amber-400 drop-shadow-[0_4px_16px_rgba(251,191,36,0.4)] mb-3 tabular-nums">
                {activeCalledTicket.ticketNumber}
              </div>

              {/* Nome do Cliente */}
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-sm">
                {activeCalledTicket.clientName}
              </h2>

              {/* Procedimento e Profissional Designado */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm sm:text-lg text-slate-200 mb-6 max-w-2xl">
                <span className="flex items-center gap-2 bg-slate-800/90 px-4 py-2.5 rounded-xl border border-slate-700 shadow-md">
                  <Scissors className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold">{activeCalledTicket.serviceName}</span>
                </span>

                <span className="flex items-center gap-2.5 bg-slate-800/90 px-4 py-2.5 rounded-xl border border-emerald-500/40 shadow-md">
                  {/* Foto do Profissional se disponível */}
                  {(() => {
                    const pro =
                      professionalsMap.get(activeCalledTicket.assignedProfessionalId || '') ||
                      professionalsMap.get(activeCalledTicket.professionalId || '');
                    return pro?.avatar ? (
                      <img
                        src={pro.avatar}
                        alt="Profissional"
                        className="w-7 h-7 rounded-full object-cover border border-emerald-400"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-600/40 flex items-center justify-center text-emerald-400 border border-emerald-500">
                        <User className="w-4 h-4" />
                      </div>
                    );
                  })()}
                  <span>
                    Profissional:{' '}
                    <strong className="text-emerald-300 font-bold">
                      {activeCalledTicket.assignedProfessionalName ||
                        activeCalledTicket.professionalName ||
                        'Bancada Disponível'}
                    </strong>
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm sm:text-base text-slate-300 font-medium">
                  Por favor, dirija-se à bancada ou sala de atendimento indicada.
                </p>

                <button
                  onClick={handleRepeatCurrentCall}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Repetir som de chamada"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Repetir Chamada</span>
                </button>
              </div>
            </div>
          ) : (
            /* Banner Standby Elegante quando não há senha sendo chamada no exato momento */
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                    <span>Recepção Digital • {currentBusiness?.tradeName || 'Studio Digital'}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Acompanhe o Status do Seu Atendimento
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                    Sua senha será chamada com sinal sonoro e voz neste monitor. Fique atento às próximas senhas.
                  </p>
                </div>
              </div>

              {upcomingTickets.length > 0 && (
                <div className="hidden md:flex flex-col items-end text-right bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Próxima da Fila
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {upcomingTickets[0].ticketNumber}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold truncate max-w-[150px]">
                    {upcomingTickets[0].clientName}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. SEÇÃO: SENHAS ATUAIS EM ATENDIMENTO (PROFISSIONAL QUE ESTÁ ATENDENDO) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Senhas em Atendimento</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Profissionais e procedimentos em andamento nas bancadas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
                  {attendingTickets.length} em atendimento
                </span>
              </div>
            </div>

            {/* Grade de Profissionais Atendendo */}
            {attendingTickets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <Clock className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
                <p className="text-sm font-semibold text-slate-400">
                  Nenhum atendimento em andamento no momento.
                </p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Assim que um profissional iniciar um atendimento pela recepção, a bancada e a senha aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
                {attendingTickets.map((ticket) => {
                  const pro =
                    professionalsMap.get(ticket.assignedProfessionalId || '') ||
                    professionalsMap.get(ticket.professionalId || '');
                  const elapsedMin = getElapsedMinutes(ticket.startedAt);
                  const duration = ticket.serviceDuration || 30;
                  const progressPct = Math.min(100, Math.round((elapsedMin / duration) * 100));

                  return (
                    <div
                      key={ticket.id}
                      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4 shadow-md flex flex-col justify-between transition-all relative overflow-hidden"
                    >
                      {/* Barra superior de status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                          {ticket.ticketNumber}
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Em Atendimento
                        </span>
                      </div>

                      {/* Dados do Cliente e Serviço */}
                      <div className="mb-3">
                        <h4 className="text-base font-bold text-white truncate">
                          {ticket.clientName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                          <Scissors className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{ticket.serviceName}</span>
                        </div>
                      </div>

                      {/* Profissional que está atendendo */}
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3 mb-3">
                        {pro?.avatar ? (
                          <img
                            src={pro.avatar}
                            alt={ticket.assignedProfessionalName || 'Profissional'}
                            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Profissional Responsável
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                            {ticket.assignedProfessionalName || ticket.professionalName || pro?.name || 'Profissional'}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-medium truncate">
                            {pro?.specialties?.[0] || 'Especialista'}
                          </div>
                        </div>
                      </div>

                      {/* Tempo Decorrido & Barra de Progresso */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3 text-amber-400" />
                            <span>Iniciado há {elapsedMin} min</span>
                          </span>
                          <span className="font-mono text-slate-300 font-semibold">
                            ~{duration} min
                          </span>
                        </div>

                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO (Col 9 a 12):
            1. Próximas Senhas na Fila (Aguardando)
            2. Últimos Atendimentos Concluídos Hoje
        */}
        <div className="lg:col-span-4 flex flex-col gap-6 justify-between overflow-y-auto">
          {/* Próximas Senhas na Fila */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Próximas Senhas
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/40 px-2.5 py-0.5 rounded-md">
                {upcomingTickets.length} na fila
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {upcomingTickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs py-10">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mb-2" />
                  <span>Fila de espera vazia.</span>
                </div>
              ) : (
                upcomingTickets.map((t, idx) => (
                  <div
                    key={t.id}
                    className="bg-slate-800/60 hover:bg-slate-800/90 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-mono font-black text-sm shrink-0">
                        {t.ticketNumber}
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {t.clientName}
                        </span>
                        <div className="text-[11px] text-slate-400 truncate">
                          {t.serviceName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Pref: {t.professionalName || 'Qualquer profissional'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 block">
                        ~{t.estimatedWaitMinutes} min
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5 block">
                        Espera
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Últimos Atendimentos Concluídos */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Últimos Atendimentos
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Hoje
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {completedTickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs py-8">
                  <span>Nenhum atendimento finalizado hoje ainda.</span>
                </div>
              ) : (
                completedTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-emerald-400 shrink-0">
                        {t.ticketNumber}
                      </span>
                      <span className="text-slate-200 font-semibold truncate">
                        {t.clientName}
                      </span>
                    </div>

                    <div className="text-right shrink-0 text-[11px] text-slate-400">
                      <span className="text-slate-300 font-medium">
                        {t.assignedProfessionalName || t.professionalName || 'Atendido'}
                      </span>
                    </div>
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
