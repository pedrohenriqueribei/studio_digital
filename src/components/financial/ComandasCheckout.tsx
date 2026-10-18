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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Comanda, ComandaItem } from '../../types';

export const ComandasCheckout: React.FC = () => {
  const {
    activeComandas,
    createOrUpdateComanda,
    closeComanda,
    currentBusiness,
    activeServices,
    currentRole,
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<'todas' | 'aberta' | 'fechada'>('todas');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'>('pix');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // New item addition inside modal
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(50);
  const [newItemType, setNewItemType] = useState<'servico' | 'produto'>('produto');

  const filteredComandas = useMemo(() => {
    return activeComandas.filter((c) => {
      if (filterStatus !== 'todas' && c.status !== filterStatus) return false;
      return true;
    });
  }, [activeComandas, filterStatus]);

  // Aggregate metrics
  const financialMetrics = useMemo(() => {
    const closed = activeComandas.filter((c) => c.status === 'fechada');
    const totalRevenue = closed.reduce((acc, c) => acc + c.total, 0);
    const count = closed.length;
    const avgTicket = count > 0 ? totalRevenue / count : 0;
    const estimatedCommissions = totalRevenue * 0.48; // approximate 48% average
    const studioNet = totalRevenue - estimatedCommissions;

    return { totalRevenue, avgTicket, estimatedCommissions, studioNet, count };
  }, [activeComandas]);

  const handleOpenComanda = (c: Comanda) => {
    setSelectedComanda(c);
    setDiscountAmount(c.discount || 0);
    setPaymentMethod(c.paymentMethod || 'pix');
  };

  const handleAddItemToComanda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda || !newItemName.trim() || newItemPrice <= 0) return;

    const newItem: ComandaItem = {
      id: `item_${Date.now()}`,
      name: newItemName.trim(),
      type: newItemType,
      price: newItemPrice,
      quantity: 1,
    };

    const updatedItems = [...selectedComanda.items, newItem];
    const newSubtotal = updatedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount);

    const updatedComanda: Comanda = {
      ...selectedComanda,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    };

    setSelectedComanda(updatedComanda);
    createOrUpdateComanda(updatedComanda);

    setNewItemName('');
    setNewItemPrice(50);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedComanda) return;
    const updatedItems = selectedComanda.items.filter((i) => i.id !== itemId);
    const newSubtotal = updatedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount);

    const updatedComanda: Comanda = {
      ...selectedComanda,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
    };

    setSelectedComanda(updatedComanda);
    createOrUpdateComanda(updatedComanda);
  };

  const handleFinalizePayment = () => {
    if (!selectedComanda) return;
    closeComanda(selectedComanda.id, paymentMethod, discountAmount);
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
            R$ {financialMetrics.estimatedCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Repasse para a equipe</span>
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

      {/* Comandas Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1">
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
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Abertas ({activeComandas.filter((c) => c.status === 'aberta').length})
          </button>
          <button
            onClick={() => setFilterStatus('fechada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStatus === 'fechada'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Fechadas ({activeComandas.filter((c) => c.status === 'fechada').length})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Clique em uma comanda para adicionar produtos, desconto ou fechar pagamento
        </span>
      </div>

      {/* Comandas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComandas.map((cmd) => {
          const isOpen = cmd.status === 'aberta';

          return (
            <div
              key={cmd.id}
              onClick={() => handleOpenComanda(cmd)}
              className={`bg-white rounded-xl border shadow-2xs p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-slate-400 ${
                isOpen ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    Comanda #{cmd.id.replace('cmd_', '')}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                      isOpen
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isOpen ? 'Aberta no Caixa' : 'Paga'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 truncate mb-0.5">
                  {cmd.clientName}
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Atendido por <span className="font-medium text-slate-700">{cmd.professionalName}</span>
                </p>

                {/* Items summary */}
                <div className="space-y-1 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {cmd.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 truncate max-w-[170px]">{it.name}</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        R$ {it.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total a Pagar</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                    R$ {cmd.total.toFixed(2)}
                  </span>
                </div>

                {isOpen ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenComanda(cmd);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Fechar Caixa
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
          <p className="text-sm font-semibold text-slate-800">Nenhuma comanda nesta lista</p>
          <p className="text-xs text-slate-500 mt-1">
            Novas comandas são geradas automaticamente ao criar agendamentos.
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
                <span className="text-[11px] font-mono text-slate-400">
                  Comanda #{selectedComanda.id.replace('cmd_', '')}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedComanda.clientName}
                </h3>
                <span className="text-xs text-slate-500">
                  Profissional: {selectedComanda.professionalName}
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
              {/* Itemized List */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Itens Consumidos (Serviços & Produtos)
                </label>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {selectedComanda.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {it.type}
                        </span>
                        <span className="font-semibold text-slate-800">{it.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          R$ {it.price.toFixed(2)}
                        </span>
                        {selectedComanda.status === 'aberta' && (
                          <button
                            onClick={() => handleRemoveItem(it.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add item inline (Home care product or add-on service) */}
              {selectedComanda.status === 'aberta' && (
                <form
                  onSubmit={handleAddItemToComanda}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                >
                  <span className="font-semibold text-slate-700 block">
                    + Adicionar Produto ou Serviço Extra na Comanda
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Pomada Matte / Óleo / Café"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    />
                    <select
                      value={newItemType}
                      onChange={(e) => setNewItemType(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="produto">Produto Home Care</option>
                      <option value="servico">Serviço Adicional</option>
                    </select>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min={1}
                        placeholder="R$ Valor"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(Number(e.target.value))}
                        className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                      />
                      <button
                        type="submit"
                        className="flex-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold"
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
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Comanda Paga e Fechada</span>
                    <span>Forma de pagamento: {selectedComanda.paymentMethod?.toUpperCase()}</span>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-emerald-600">
                    {selectedComanda.closedAt}
                  </span>
                </div>
              )}

              {/* Totals Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums">
                    R$ {selectedComanda.subtotal.toFixed(2)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto concedido:</span>
                    <span className="font-mono tabular-nums">
                      - R$ {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Final:</span>
                  <span className="font-mono tabular-nums text-base">
                    R$ {(selectedComanda.subtotal - discountAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setSelectedComanda(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>

              {selectedComanda.status === 'aberta' ? (
                <button
                  type="button"
                  onClick={handleFinalizePayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Recebimento (R$ {(selectedComanda.subtotal - discountAmount).toFixed(2)})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    alert(`Comprovante emitido com sucesso para ${selectedComanda.clientName}!`);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Enviar Recibo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
