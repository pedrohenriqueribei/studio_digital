/**
 * Sintetizador Web Audio API para campainha/chime de chamada de senhas no Painel TV da Recepção.
 * Não depende de arquivos de áudio externos, evitando falhas de carregamento e CORS.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Toca um chime agradável de recepção de 2 tons (Dó maior -> Sol maior com decaimento suave).
 */
export function playReceptionChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primeiro tom (Mi5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.46);

    // Segundo tom (Lá5 - 880 Hz) - clássico tom de atenção hospitalar/aeroporto/clínica
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.22);

    gain2.gain.setValueAtTime(0.001, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.26);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.22);
    osc2.stop(now + 0.96);
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
}

/**
 * Anúncio de voz sintetizado em Português para chamada de senhas no Painel de TV.
 */
export function announceTicketVoice(
  ticketNumber: string,
  clientName: string,
  professionalName?: string
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const proText = professionalName ? `com ${professionalName}` : 'ao atendimento';
    const utterance = new SpeechSynthesisUtterance(
      `Senha ${ticketNumber}. ${clientName}, dirigir-se ${proText}.`
    );
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis notice:', err);
  }
}
