import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Trash2,
  Clock,
  Printer,
  X,
  TrendingUp,
  XCircle,
  AlertCircle,
  CalendarX,
  RotateCcw,
  Search,
  Eye,
  Ban,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Comanda, ComandaItem } from '../../types';
import {
  getComandaProfessionalSplit,
  getComandaProfessionalsLabel,
  getComandaProfessionalIds,
  resolveItemCommissionPercentage,
} from '../../utils/commissions';

export const ComandasCheckout: React.FC = () => {
  const {
    activeComandas,
    createOrUpdateComanda,
    closeComanda,
    cancelComanda,
    reopenComanda,
    activeServices,
    activeProfessionals,
    appointments,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<'todas' | 'aberta' | 'fechada' | 'cancelada'>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>('pix');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // New item addition inside modal
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(50);
  const [newItemType, setNewItemType] = useState<'servico' | 'produto'>('produto');
  const [newItemProId, setNewItemProId] = useState<string>('');
  const [newItemServiceId, setNewItemServiceId] = useState<string>('');
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);

  // Counts
  const openCount = useMemo(() => activeComandas.filter((c) => c.status === 'aberta').length, [activeComandas]);
  const closedCount = useMemo(() => activeComandas.filter((c) => c.status === 'fechada').length, [activeComandas]);
  const cancelledCount = useMemo(() => activeComandas.filter((c) => c.status === 'cancelada').length, [activeComandas]);

  const filteredComandas = useMemo(() => {
    return activeComandas.filter((c) => {
      if (filterStatus !== 'todas' && c.status !== filterStatus) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesClient = (c.clientName || '').toLowerCase().includes(query);
        const matchesPro = getComandaProfessionalsLabel(c, activeProfessionals).toLowerCase().includes(query);
        const matchesId = c.id.toLowerCase().includes(query);
        const matchesItems = c.items.some((it) => it.name.toLowerCase().includes(query));
        if (!matchesClient && !matchesPro && !matchesId && !matchesItems) return false;
      }
      return true;
    });
  }, [activeComandas, activeProfessionals, filterStatus, searchTerm]);

  // Aggregate exact metrics from closed comandas & per-item professional commissions
  const financialMetrics = useMemo(() => {
    const closed = activeComandas.filter((c) => c.status === 'fechada');
    const totalRevenue = closed.reduce((acc, c) => acc + (c.total || 0), 0);
    const count = closed.length;
    const avgTicket = count > 0 ? totalRevenue / count : 0;
    const totalCommissions = closed.reduce((acc, c) => {
      return acc + getComandaProfessionalSplit(c, activeServices, activeProfessionals).totalCommissions;
    }, 0);
    const studioNet = Math.max(0, totalRevenue - totalCommissions);

    const cancelledValue = activeComandas
      .filter((c) => c.status === 'cancelada')
      .reduce((acc, c) => acc + (c.total || 0), 0);

    return { totalRevenue, avgTicket, totalCommissions, studioNet, count, cancelledValue };
  }, [activeComandas, activeServices, activeProfessionals]);

  // Breakdown em tempo real da comanda selecionada no modal
  const selectedComandaSplit = useMemo(() => {
    if (!selectedComanda) return null;
    const syncedComanda: Comanda = {
      ...selectedComanda,
      discount: discountAmount,
      total: Math.max(0, selectedComanda.subtotal - discountAmount),
    };
    return getComandaProfessionalSplit(syncedComanda, activeServices, activeProfessionals);
  }, [selectedComanda, discountAmount, activeServices, activeProfessionals]);

  const handleOpenComanda = (c: Comanda) => {
    setSelectedComanda(c);
    setDiscountAmount(c.discount || 0);
    setPaymentMethod(c.paymentMethod || 'pix');
    setNewItemProId(c.professionalId || activeProfessionals[0]?.id || '');
    setNewItemServiceId('');
    setReceiptFeedback(null);
  };

  const handleAddItemToComanda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda || selectedComanda.status !== 'aberta' || !newItemName.trim() || newItemPrice <= 0) return;

    const assignedPro = newItemProId
      ? activeProfessionals.find((p) => p.id === newItemProId)
      : undefined;

    const baseItem: ComandaItem = {
      id: `item_${Date.now()}`,
      name: newItemName.trim(),
      type: newItemType,
      price: newItemPrice,
      quantity: 1,
      ...(newItemServiceId ? { serviceId: newItemServiceId } : {}),
      ...(assignedPro
        ? {
            professionalId: assignedPro.id,
            professionalName: assignedPro.name,
          }
        : {}),
    };

    const commPct = assignedPro
      ? resolveItemCommissionPercentage(baseItem, activeServices, activeProfessionals, assignedPro.id)
      : 0;

    const newItem: ComandaItem = {
      ...baseItem,
      commissionPercentage: commPct,
      commissionValue: (newItemPrice * commPct) / 100,
    };

    const updatedItems = [...selectedComanda.items, newItem];
    const newSubtotal = updatedItems.reduce((acc, it) => acc + it.price * (it.quantity || 1), 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount);

    const draftComanda: Comanda = {
      ...selectedComanda,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    };
    const nextProIds = getComandaProfessionalIds(draftComanda);
    const updatedComanda: Comanda = {
      ...draftComanda,
      professionalIds: nextProIds,
      professionalId: nextProIds[0] || selectedComanda.professionalId,
      professionalName: getComandaProfessionalsLabel(draftComanda, activeProfessionals),
    };

    setSelectedComanda(updatedComanda);
    createOrUpdateComanda(updatedComanda);

    setNewItemName('');
    setNewItemPrice(50);
    setNewItemServiceId('');
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedComanda || selectedComanda.status !== 'aberta') return;
    const updatedItems = selectedComanda.items.filter((i) => i.id !== itemId);
    const newSubtotal = updatedItems.reduce((acc, it) => acc + it.price * (it.quantity || 1), 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount);

    const draftComanda: Comanda = {
      ...selectedComanda,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    };
    const nextProIds = getComandaProfessionalIds(draftComanda);
    const updatedComanda: Comanda = {
      ...draftComanda,
      professionalIds: nextProIds,
      professionalId: nextProIds[0] || selectedComanda.professionalId,
      professionalName: getComandaProfessionalsLabel(draftComanda, activeProfessionals),
    };

    setSelectedComanda(updatedComanda);
    createOrUpdateComanda(updatedComanda);
  };

  const handleFinalizePayment = () => {
    if (!selectedComanda || selectedComanda.status !== 'aberta') return;
    closeComanda(selectedComanda.id, paymentMethod, discountAmount);
    setSelectedComanda(null);
  };

  const handleConfirmCancelComanda = () => {
    if (!selectedComanda) return;
    cancelComanda(selectedComanda.id, cancelReasonInput.trim() || 'Cancelada manualmente no caixa');
    setCancelModalOpen(false);
    setCancelReasonInput('');
    setSelectedComanda(null);
  };

  const handleReopenComanda = (id: string) => {
    reopenComanda(id);
    setSelectedComanda(null);
  };

  return (
    <div className="space-y-4">
      {/* Financial KPI Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Faturamento Fechado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
            R$ {financialMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">
            {financialMetrics.count} comandas recebidas
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Ticket Médio</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
            R$ {financialMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Por atendimento concluído</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Comissões a Repassar</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
            R$ {financialMetrics.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Rateio exato por serviço/profissional</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Receita Líquida Studio</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-700 font-mono tabular-nums">
            R$ {financialMetrics.studioNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Margem operacional do studio</span>
        </div>
      </div>

      {/* Cancellation Informational Banner if any exist */}
      {cancelledCount > 0 && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <CalendarX className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{cancelledCount} comanda(s) cancelada(s)</strong> decorrentes de cancelamentos de agendamentos ou cancelamento no caixa. Elas não computam no caixa nem no faturamento.
            </span>
          </div>
          {filterStatus !== 'cancelada' && (
            <button
              onClick={() => setFilterStatus('cancelada')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline whitespace-nowrap cursor-pointer"
            >
              Ver canceladas
            </button>
          )}
        </div>
      )}

      {/* Comandas Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterStatus('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'todas'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({activeComandas.length})
          </button>
          <button
            onClick={() => setFilterStatus('aberta')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'aberta'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Abertas ({openCount})
          </button>
          <button
            onClick={() => setFilterStatus('fechada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'fechada'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Fechadas ({closedCount})
          </button>
          <button
            onClick={() => setFilterStatus('cancelada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterStatus === 'cancelada'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Canceladas ({cancelledCount})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Comandas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComandas.map((cmd) => {
          const isOpen = cmd.status === 'aberta';
          const isClosed = cmd.status === 'fechada';
          const isCancelled = cmd.status === 'cancelada';

          // Link to appointment check
          const linkedApp = cmd.appointmentId ? appointments.find((a) => a.id === cmd.appointmentId) : null;

          return (
            <div
              key={cmd.id}
              onClick={() => handleOpenComanda(cmd)}
              className={`bg-white rounded-xl border shadow-2xs p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-slate-400 ${
                isOpen
                  ? 'border-amber-200 bg-amber-50/20'
                  : isCancelled
                  ? 'border-rose-200 bg-rose-50/15 opacity-90 hover:opacity-100'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    Comanda #{cmd.id.replace('cmd_', '')}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                      isOpen
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : isCancelled
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isOpen && 'Aberta no Caixa'}
                    {isClosed && (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Paga</span>
                      </>
                    )}
                    {isCancelled && (
                      <>
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Cancelada</span>
                      </>
                    )}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 truncate mb-0.5">
                  {cmd.clientName}
                </h4>
                <p className="text-xs text-slate-500 mb-2 truncate">
                  Atendido por{' '}
                  <span className="font-medium text-slate-700">
                    {getComandaProfessionalsLabel(cmd, activeProfessionals)}
                  </span>
                </p>

                {/* Cancelled badge notice */}
                {isCancelled && (
                  <div className="mb-2.5 p-2 bg-rose-100/70 border border-rose-200 rounded-lg flex items-start gap-1.5 text-[11px] text-rose-800">
                    <CalendarX className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Agendamento Cancelado</span>
                      <span className="text-rose-700">
                        {cmd.cancelReason || (linkedApp?.notes ? linkedApp.notes : 'Cancelamento registrado no sistema')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Items summary */}
                <div className="space-y-1.5 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {cmd.items.map((it) => {
                    const itemProName =
                      it.professionalName ||
                      (it.professionalId
                        ? activeProfessionals.find((p) => p.id === it.professionalId)?.name
                        : undefined);
                    return (
                      <div key={it.id} className="flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className={`text-slate-700 block truncate ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                            {it.name}
                          </span>
                          {itemProName && (
                            <span className="text-[10px] text-slate-500 block truncate">
                              {itemProName}
                            </span>
                          )}
                        </div>
                        <span className={`font-mono tabular-nums font-semibold shrink-0 ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          R$ {it.price.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total & Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {isCancelled ? 'Valor Previsto' : 'Total a Pagar'}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`font-mono tabular-nums ${
                        isCancelled
                          ? 'text-sm font-semibold line-through text-slate-400'
                          : 'text-base font-extrabold text-slate-900'
                      }`}
                    >
                      R$ {cmd.total.toFixed(2)}
                    </span>
                    {isCancelled && (
                      <span className="text-[11px] font-bold text-rose-700">
                        (R$ 0,00)
                      </span>
                    )}
                  </div>
                </div>

                {isOpen ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenComanda(cmd);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    Fechar Caixa
                  </button>
                ) : isCancelled ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenComanda(cmd);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detalhes</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="uppercase">{cmd.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredComandas.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Nenhuma comanda encontrada</p>
          <p className="text-xs text-slate-500 mt-1">
            {filterStatus === 'cancelada'
              ? 'Não há comandas canceladas no momento.'
              : 'Novas comandas são geradas automaticamente ao criar agendamentos ou atendimentos.'}
          </p>
        </div>
      )}

      {/* POS / Comanda Checkout Modal */}
      {selectedComanda && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-xs sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-mono text-slate-400">
                    Comanda #{selectedComanda.id.replace('cmd_', '')}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                      selectedComanda.status === 'aberta'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : selectedComanda.status === 'cancelada'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {selectedComanda.status === 'aberta' && 'Aberta no Caixa'}
                    {selectedComanda.status === 'fechada' && 'Paga e Fechada'}
                    {selectedComanda.status === 'cancelada' && 'Cancelada'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedComanda.clientName}
                </h3>
                <span className="text-xs text-slate-500">
                  Profissionais: {getComandaProfessionalsLabel(selectedComanda, activeProfessionals)}
                </span>
              </div>
              <button
                onClick={() => setSelectedComanda(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* If cancelled, show warning banner */}
              {selectedComanda.status === 'cancelada' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Comanda Cancelada (Atendimento Desconsiderado)</span>
                  </div>
                  <p className="text-rose-700 leading-relaxed">
                    Esta comanda foi cancelada em virtude do cancelamento do agendamento correspondente. Não há cobrança pendente para este cliente no caixa.
                  </p>
                  {selectedComanda.cancelReason && (
                    <div className="pt-1.5 text-slate-800 flex items-start gap-1">
                      <span className="font-bold text-rose-800">Motivo:</span>
                      <span>{selectedComanda.cancelReason}</span>
                    </div>
                  )}
                  {selectedComanda.canceledAt && (
                    <p className="text-[11px] text-rose-600 font-mono">
                      Data do cancelamento: {new Date(selectedComanda.canceledAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              {/* Itemized List */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Itens Consumidos (Serviços & Produtos)
                </label>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {(selectedComandaSplit?.itemsBreakdown || []).map((bd) => {
                    const it = bd.item;
                    return (
                      <div
                        key={it.id}
                        className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {it.type}
                            </span>
                            <span className={`font-semibold truncate ${selectedComanda.status === 'cancelada' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {it.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {bd.professionalName}
                            {bd.commissionPercentage > 0 && selectedComanda.status !== 'cancelada' && (
                              <span className="font-mono tabular-nums text-slate-400">
                                {' '}· Comissão {bd.commissionPercentage.toFixed(0)}% (R$ {bd.commissionAmount.toFixed(2)})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-mono tabular-nums font-bold ${selectedComanda.status === 'cancelada' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            R$ {it.price.toFixed(2)}
                          </span>
                          {selectedComanda.status === 'aberta' && (
                            <button
                              onClick={() => handleRemoveItem(it.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Remover item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add item inline (Home care product or add-on service with professional attribution) */}
              {selectedComanda.status === 'aberta' && (
                <form
                  onSubmit={handleAddItemToComanda}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">
                      + Adicionar Produto ou Serviço Extra na Comanda
                    </span>
                    {newItemType === 'servico' && activeServices.length > 0 && (
                      <select
                        value={newItemServiceId}
                        onChange={(e) => {
                          const srvId = e.target.value;
                          setNewItemServiceId(srvId);
                          const srv = activeServices.find((s) => s.id === srvId);
                          if (srv) {
                            setNewItemName(srv.name);
                            setNewItemPrice(srv.price);
                          }
                        }}
                        className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px] text-slate-700"
                      >
                        <option value="">Preencher do catálogo...</option>
                        {activeServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (R$ {s.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Pomada Matte / Escova / Barba"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <select
                      value={newItemType}
                      onChange={(e) => {
                        const t = e.target.value as 'servico' | 'produto';
                        setNewItemType(t);
                        if (t === 'produto') {
                          setNewItemServiceId('');
                        } else if (!newItemProId) {
                          setNewItemProId(selectedComanda.professionalId || activeProfessionals[0]?.id || '');
                        }
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="produto">Produto Home Care</option>
                      <option value="servico">Serviço Adicional</option>
                    </select>
                    <select
                      value={newItemProId}
                      onChange={(e) => setNewItemProId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Sem profissional (Venda Balcão)</option>
                      {activeProfessionals.map((pro) => (
                        <option key={pro.id} value={pro.id}>
                          Prof.: {pro.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="R$ Valor"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(Number(e.target.value))}
                        className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono tabular-nums"
                      />
                      <button
                        type="submit"
                        className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
                      >
                        Incluir
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Discount and Payment Method Selection */}
              {selectedComanda.status === 'aberta' ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Desconto Cortesia (R$):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setDiscountAmount(val);
                        if (selectedComanda) {
                          setSelectedComanda({
                            ...selectedComanda,
                            discount: val,
                            total: Math.max(0, selectedComanda.subtotal - val),
                          });
                        }
                      }}
                      className="w-28 px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-mono tabular-nums text-right"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-2">
                      Forma de Pagamento:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'pix', label: 'PIX Instantâneo', icon: QrCode },
                        { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                        { id: 'cartao_debito', label: 'Débito', icon: CreditCard },
                        { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as any)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : selectedComanda.status === 'fechada' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Comanda Paga e Fechada</span>
                    <span>Forma de pagamento: {selectedComanda.paymentMethod?.toUpperCase()}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-emerald-600">
                    {selectedComanda.closedAt}
                  </span>
                </div>
              ) : null}

              {/* Rateio por Profissional & Comissões */}
              {selectedComanda.status !== 'cancelada' &&
                selectedComandaSplit &&
                selectedComandaSplit.byProfessional.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Rateio por Profissional &amp; Comissões</span>
                      </span>
                      {discountAmount > 0 && (
                        <span className="text-[10px] text-slate-500">
                          Desconto rateado proporcionalmente
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {selectedComandaSplit.byProfessional.map((proSplit) => (
                        <div
                          key={proSplit.professionalId}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">
                              {proSplit.professionalName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {proSplit.itemsCount} {proSplit.itemsCount === 1 ? 'item' : 'itens'} · Base líquida: R$ {proSplit.netRevenue.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono tabular-nums font-bold text-slate-900 block">
                              R$ {proSplit.commissionAmount.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                              Comissão ({proSplit.effectiveCommissionRate.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">
                        Total Comissões:{' '}
                        <strong className="font-mono tabular-nums text-slate-900">
                          R$ {selectedComandaSplit.totalCommissions.toFixed(2)}
                        </strong>
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        Líquido Studio:{' '}
                        <strong className="font-mono tabular-nums">
                          R$ {selectedComandaSplit.studioNetRevenue.toFixed(2)}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

              {/* Totals Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className={`font-mono tabular-nums ${selectedComanda.status === 'cancelada' ? 'line-through' : ''}`}>
                    R$ {selectedComanda.subtotal.toFixed(2)}
                  </span>
                </div>
                {(discountAmount > 0 || (selectedComanda.discount || 0) > 0) &&
                  selectedComanda.status !== 'cancelada' && (
                    <div className="flex justify-between text-rose-600">
                      <span>Desconto concedido:</span>
                      <span className="font-mono tabular-nums">
                        - R$ {(selectedComanda.status === 'aberta' ? discountAmount : selectedComanda.discount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>
                    {selectedComanda.status === 'cancelada' ? 'Status Financeiro:' : 'Total Final:'}
                  </span>
                  <div className="text-right">
                    {selectedComanda.status === 'cancelada' ? (
                      <span className="text-rose-700 font-extrabold">CANCELADA (R$ 0,00)</span>
                    ) : (
                      <span className="font-mono tabular-nums text-base">
                        R$ {Math.max(0, selectedComanda.subtotal - (selectedComanda.status === 'aberta' ? discountAmount : selectedComanda.discount || 0)).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {receiptFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{receiptFeedback}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComanda(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </button>

                {/* Possibilidade de cancelar a comanda diretamente pelo Caixa */}
                {selectedComanda.status === 'aberta' && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancelar Comanda</span>
                  </button>
                )}
              </div>

              {selectedComanda.status === 'aberta' ? (
                <button
                  type="button"
                  onClick={handleFinalizePayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Recebimento (R$ {(selectedComanda.subtotal - discountAmount).toFixed(2)})</span>
                </button>
              ) : selectedComanda.status === 'fechada' ? (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFeedback(`Comprovante emitido com sucesso para ${selectedComanda.clientName}.`);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Enviar Recibo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReopenComanda(selectedComanda.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reabrir no Caixa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Cancel Comanda */}
      {cancelModalOpen && selectedComanda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Cancelar Comanda #{selectedComanda.id.replace('cmd_', '')}?</h4>
                <p className="text-xs text-slate-500">Cliente: {selectedComanda.clientName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ao cancelar esta comanda, ela será marcada como cancelada e desconsiderada do faturamento e cobrança. O agendamento correspondente também será marcado como cancelado.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motivo do cancelamento (opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Cliente desistiu / Imprevisto"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelReasonInput('');
                }}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelComanda}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
