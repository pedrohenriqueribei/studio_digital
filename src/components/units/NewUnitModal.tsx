import React, { useState } from 'react';
import {
  X,
  Building2,
  Sparkles,
  Phone,
  MapPin,
  Store,
  Layers,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessType } from '../../types';
import { MaskedInput } from '../ui/MaskedInput';

interface NewUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewUnitModal: React.FC<NewUnitModalProps> = ({ isOpen, onClose }) => {
  const {
    currentBusiness,
    registerBusiness,
    activeClaims,
    userRole,
    switchBusiness,
    addNotification,
  } = useApp();

  const currentLoggedEmail = (
    activeClaims?.email ||
    currentBusiness?.managerEmail ||
    currentBusiness?.ownerEmail ||
    ''
  ).trim();

  const currentLoggedName = (
    activeClaims?.name ||
    currentBusiness?.managerName ||
    'Gestor'
  ).trim();

  const [tradeName, setTradeName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [type, setType] = useState<BusinessType>(currentBusiness?.type || 'barbearia');
  const [isHeadquarters, setIsHeadquarters] = useState(false);
  const [city, setCity] = useState(currentBusiness?.city || '');
  const [state, setState] = useState(currentBusiness?.state || 'SP');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [accentColor, setAccentColor] = useState(currentBusiness?.accentColor || '#0f172a');

  // Gerente local ou herdar gestor atual
  const [useCurrentManager, setUseCurrentManager] = useState(true);
  const [branchManagerName, setBranchManagerName] = useState('');
  const [branchManagerEmail, setBranchManagerEmail] = useState('');
  const [branchManagerPassword, setBranchManagerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim() || !city.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      const mgrName = useCurrentManager
        ? currentLoggedName
        : (branchManagerName.trim() || `Gerente - ${tradeName.trim()}`);

      const mgrEmail = useCurrentManager
        ? (currentLoggedEmail || `gerente@${tradeName.trim().toLowerCase().replace(/\s+/g, '')}.com`)
        : (branchManagerEmail.trim() || `gerente@${tradeName.trim().toLowerCase().replace(/\s+/g, '')}.com`);

      const mgrPass = useCurrentManager
        ? (currentBusiness?.managerPassword || 'gerente123')
        : (branchManagerPassword.trim() || 'gerente123');

      const created = await registerBusiness({
        name: tradeName.trim(),
        tradeName: tradeName.trim(),
        type,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        phone: phone.trim(),
        cnpj: cnpj.trim() || undefined,
        address: address.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        planId: currentBusiness?.planId || 'pro',
        accentColor,
        isHeadquarters,
        unitCode: unitCode.trim() || (isHeadquarters ? 'MATRIZ' : `FILIAL-${Date.now().toString().slice(-3)}`),
        parentId: currentBusiness?.id,
        ownerEmail: currentLoggedEmail || mgrEmail,
        ownerName: currentLoggedName || mgrName,
        managerName: mgrName,
        managerEmail: mgrEmail,
        managerPassword: mgrPass,
        monthlyRevenue: 0,
        monthlyRevenueGoal: 0,
        totalAppointmentsCount: 0,
        totalClientsCount: 0,
        totalServicesCount: 0,
        totalComandasCount: 0,
        totalRevenueRealized: 0,
      });

      addNotification({
        title: 'Unidade Adicionada à Rede!',
        message: `${created.tradeName} foi cadastrada com sucesso e vinculada à sua gestão multi-unidades.`,
        type: 'system',
      });

      onClose();
    } catch (err) {
      console.error('Erro ao cadastrar unidade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetColors = [
    { label: 'Slate Escuro', value: '#0f172a' },
    { label: 'Âmbar / Couro', value: '#b45309' },
    { label: 'Esmeralda', value: '#059669' },
    { label: 'Azul Marinho', value: '#1d4ed8' },
    { label: 'Violeta / Glamour', value: '#7c3aed' },
    { label: 'Rosa / Estética', value: '#db2777' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 w-full max-w-xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white/95 backdrop-blur-xs shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cadastrar Nova Unidade / Filial
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Expanda sua rede mantendo agendas e equipes isoladas sob sua conta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Unidade vs Matriz */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="flex-1">
              <span className="text-xs font-semibold text-slate-800 block">
                Tipo do Estabelecimento na Rede
              </span>
              <span className="text-[11px] text-slate-500 block">
                Define se esta unidade atuará como Matriz administrativa ou Filial operacional
              </span>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => setIsHeadquarters(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isHeadquarters
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Filial
              </button>
              <button
                type="button"
                onClick={() => setIsHeadquarters(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isHeadquarters
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Matriz
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome da Unidade / Fantasia <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Capitão Navalha - Moema ou Studio Glam Jardins"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Código / Sigla
              </label>
              <input
                type="text"
                placeholder="Ex: MOEMA-02"
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Segmento de Atuação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'barbearia', label: 'Barbearia' },
                { id: 'clinica_estetica', label: 'Clínica de Estética' },
                { id: 'salao_beleza', label: 'Salão de Beleza' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as BusinessType)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    type === item.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Cidade <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                UF <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={2}
                required
                placeholder="SP"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 uppercase text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Endereço / Logradouro
              </label>
              <input
                type="text"
                placeholder="Ex: Av. Ibirapuera, 1200"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Bairro
              </label>
              <input
                type="text"
                placeholder="Ex: Moema"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MaskedInput
              maskType="phone"
              label="Telefone / WhatsApp da Unidade"
              required
              value={phone}
              leftIcon={<Phone className="w-3.5 h-3.5 text-slate-400" />}
              onValueChange={(cleanVal) => setPhone(cleanVal)}
              helperText="DDD + 8 ou 9 dígitos"
            />
            <MaskedInput
              maskType="cnpj"
              label="CNPJ da Filial (opcional)"
              value={cnpj}
              onValueChange={(cleanVal) => setCnpj(cleanVal)}
              helperText="Formato 00.000.000/0000-00"
            />
          </div>

          {/* Cor de Identificação da Unidade */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Cor de Destaque da Unidade
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {presetColors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAccentColor(c.value)}
                  className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center cursor-pointer ${
                    accentColor === c.value ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {accentColor === c.value && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0"
                title="Personalizar cor"
              />
            </div>
          </div>

          {/* Vínculo de Gestão */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gestão da Unidade</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Conta Proprietária: {currentLoggedEmail || 'Ativa'}
              </span>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentManager}
                onChange={(e) => setUseCurrentManager(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="font-medium">
                Vincular diretamente ao meu usuário atual ({currentLoggedName})
              </span>
            </label>

            {!useCurrentManager && (
              <div className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Nome do Gerente Local desta Filial
                  </label>
                  <input
                    type="text"
                    required={!useCurrentManager}
                    placeholder="Ex: Roberto Oliveira"
                    value={branchManagerName}
                    onChange={(e) => setBranchManagerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      E-mail do Gerente Local
                    </label>
                    <input
                      type="email"
                      required={!useCurrentManager}
                      placeholder="gerente.moema@studiodigital.com"
                      value={branchManagerEmail}
                      onChange={(e) => setBranchManagerEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Senha de Acesso
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!useCurrentManager}
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        value={branchManagerPassword}
                        onChange={(e) => setBranchManagerPassword(e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-md z-10 -mx-6 -mb-6 px-6 pb-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isSubmitting ? 'Cadastrando Unidade...' : 'Salvar e Ativar Unidade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
