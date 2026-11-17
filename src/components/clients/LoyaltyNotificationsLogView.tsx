import React, { useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Mail,
  Send,
  Search,
  Sparkles,
  User,
  ExternalLink,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Client,
  LoyaltyConfig,
  LoyaltyMilestoneNotification,
  LoyaltyNotificationChannel,
} from '../../types';
import {
  buildMailtoHref,
  formatChannelLabel,
} from '../../utils/loyaltyNotifications';

interface LoyaltyNotificationsLogViewProps {
  notifications: LoyaltyMilestoneNotification[];
  clients: Client[];
  config: LoyaltyConfig;
  onSendManualNotification: (
    clientId: string,
    milestonePercent: 50 | 90,
    options?: { channelOverride?: LoyaltyNotificationChannel; isManualOrTest?: boolean }
  ) => Promise<LoyaltyMilestoneNotification | null>;
  onSelectClient?: (client: Client) => void;
}

export const LoyaltyNotificationsLogView: React.FC<LoyaltyNotificationsLogViewProps> = ({
  notifications,
  clients,
  config,
  onSendManualNotification,
  onSelectClient,
}) => {
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | '50' | '90'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [manualMilestone, setManualMilestone] = useState<50 | 90>(50);
  const [manualChannel, setManualChannel] = useState<LoyaltyNotificationChannel>(
    config.notificationChannels || 'both'
  );
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stats = useMemo(() => {
    const total = notifications.length;
    const count50 = notifications.filter((n) => n.milestonePercent === 50).length;
    const count90 = notifications.filter((n) => n.milestonePercent === 90).length;
    const readCount = notifications.filter((n) => n.status === 'lida').length;
    return { total, count50, count90, readCount };
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return notifications.filter((n) => {
      if (milestoneFilter !== 'all' && String(n.milestonePercent) !== milestoneFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (n.clientName || '').toLowerCase().includes(q) ||
        (n.clientEmail || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, milestoneFilter, searchTerm]);

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedClientId || clients[0]?.id;
    if (!targetId) {
      setFeedback({ type: 'error', text: 'Selecione um cliente para disparar a notificação.' });
      return;
    }
    setIsSending(true);
    setFeedback(null);
    try {
      const created = await onSendManualNotification(targetId, manualMilestone, {
        channelOverride: manualChannel,
        isManualOrTest: true,
      });
      if (created) {
        setFeedback({
          type: 'success',
          text: `Alerta de ${manualMilestone}% disparado para ${created.clientName} (${formatChannelLabel(created.channel)}).`,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (notif: LoyaltyMilestoneNotification) => {
    setIsSending(true);
    setFeedback(null);
    try {
      const created = await onSendManualNotification(notif.clientId, notif.milestonePercent, {
        channelOverride: notif.channel,
        isManualOrTest: true,
      });
      if (created) {
        setFeedback({
          type: 'success',
          text: `Reenvio de ${notif.milestonePercent}% registrado para ${notif.clientName}.`,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Alertas Disparados</span>
            <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {stats.total}
            </p>
            <span className="text-[11px] text-slate-500">
              {config.milestoneNotificationsEnabled !== false ? 'Disparo automático ativo' : 'Disparo pausado'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Marcos de 50%</span>
            <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {stats.count50}
            </p>
            <span className="text-[11px] text-slate-500">Metade do cartão</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Marcos de 90%</span>
            <p className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums mt-0.5">
              {stats.count90}
            </p>
            <span className="text-[11px] text-slate-500">Reta final para prêmio</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Lidas no Portal</span>
            <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums mt-0.5">
              {stats.readCount}
            </p>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              Canal padrão: {formatChannelLabel(config.notificationChannels || 'both')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Manual Dispatch / Test Tool */}
      <form
        onSubmit={handleManualDispatch}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Disparo Manual / Teste de Notificação de Marco (50% ou 90%)
            </h3>
            <p className="text-[11px] text-slate-500">
              Envia imediatamente uma notificação Push para o Portal do Cliente e registra/dispara o e-mail de incentivo ao agendamento.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Cliente
            </label>
            <select
              value={selectedClientId || clients[0]?.id || ''}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-slate-500"
            >
              {clients.length === 0 ? (
                <option value="">Nenhum cliente cadastrado</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.loyaltyPoints || 0}/{config.rewardThreshold} pts)
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Marco de Progresso
            </label>
            <select
              value={manualMilestone}
              onChange={(e) => setManualMilestone(Number(e.target.value) === 90 ? 90 : 50)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-slate-500"
            >
              <option value={50}>50% — Metade do Cartão</option>
              <option value={90}>90% — Quase no Prêmio</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Canal de Envio
            </label>
            <select
              value={manualChannel}
              onChange={(e) => setManualChannel(e.target.value as LoyaltyNotificationChannel)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-slate-500"
            >
              <option value="both">Push + E-mail</option>
              <option value="push">Apenas Push</option>
              <option value="email">Apenas E-mail</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSending || clients.length === 0}
            className="min-h-[38px] px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isSending ? 'Disparando...' : 'Disparar Alerta Agora'}</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </form>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar disparos por cliente, e-mail ou mensagem..."
            className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', '50', '90'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMilestoneFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                milestoneFilter === m
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'all' ? `Todos (${notifications.length})` : m === '50' ? `Marco 50% (${stats.count50})` : `Marco 90% (${stats.count90})`}
            </button>
          ))}
        </div>
      </div>

      {/* Dispatch List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2">
          <BellRing className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            Nenhum alerta de fidelidade registrado ainda
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Quando um cliente atingir 50% ou 90% dos pontos do Cartão Fidelidade, a notificação Push e/ou E-mail será disparada automaticamente e listada aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const clientObj = clients.find((c) => c.id === n.clientId);
            const hasEmail = Boolean(n.clientEmail && n.clientEmail.includes('@'));

            return (
              <div
                key={n.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums border ${
                          n.milestonePercent === 90
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        Marco {n.milestonePercent}%
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {n.clientName}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500">
                        {n.pointsAtDispatch}/{n.rewardThreshold} pts
                      </span>
                      {n.isManualOrTest && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Disparo manual
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-1">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 flex items-center sm:justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString('pt-BR')}
                    </span>
                    <div className="text-[11px] font-semibold text-slate-700">
                      Canal: {formatChannelLabel(n.channel)}
                    </div>
                  </div>
                </div>

                {/* Delivery Channels & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-3 text-slate-600">
                    {n.pushStatus === 'enviado' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Push {n.status === 'lida' ? 'lido pelo cliente' : 'enviado ao Portal'}
                        </span>
                      </span>
                    )}
                    {n.emailStatus !== 'nao_aplicavel' && (
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          n.emailStatus === 'enviado'
                            ? 'text-emerald-700'
                            : n.emailStatus === 'erro_envio' || n.emailStatus === 'sem_email'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>
                          {n.emailStatus === 'enviado'
                            ? `E-mail enviado (${n.clientEmail})`
                            : n.emailStatusDetail || 'E-mail pendente de SMTP'}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {hasEmail && n.emailStatus !== 'enviado' && (
                      <a
                        href={buildMailtoHref(n.clientEmail!, n.emailSubject, n.emailBody)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Enviar pelo App de E-mail</span>
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => handleResend(n)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>Reenviar</span>
                    </button>
                    {clientObj && onSelectClient && (
                      <button
                        type="button"
                        onClick={() => onSelectClient(clientObj)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <User className="w-3 h-3" />
                        <span>Ver Cartão</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
