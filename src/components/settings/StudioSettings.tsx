import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Shield,
  Bell,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  CalendarDays,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Key,
  User,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProfessionalAvailabilitySettings } from './ProfessionalAvailabilitySettings';

export const StudioSettings: React.FC = () => {
  const {
    currentBusiness,
    currentRole,
    addNotification,
    updateBusiness,
    settingsSubTab,
    setSettingsSubTab,
    selectedProfessionalForAvailabilityId,
  } = useApp();

  // Se o usuário logado for 'profissional', ativa por padrão a aba de disponibilidade
  useEffect(() => {
    if (currentRole === 'profissional' && settingsSubTab !== 'disponibilidade') {
      setSettingsSubTab('disponibilidade');
    }
  }, [currentRole, settingsSubTab, setSettingsSubTab]);

  if (!currentBusiness) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">Nenhum estabelecimento ativo</p>
        <p className="text-xs text-slate-500 mt-1">
          Cadastre seu primeiro estúdio para configurar opções operacionais.
        </p>
      </div>
    );
  }

  const [tradeName, setTradeName] = useState(currentBusiness.tradeName);
  const [phone, setPhone] = useState(currentBusiness.phone);
  const [city, setCity] = useState(currentBusiness.city);
  const [state, setState] = useState(currentBusiness.state);
  const [cnpj, setCnpj] = useState(currentBusiness.cnpj || '');
  const [managerName, setManagerName] = useState(
    currentBusiness.managerName || `Gerente ${currentBusiness.tradeName}`
  );
  const [managerEmail, setManagerEmail] = useState(
    currentBusiness.managerEmail ||
      `gerente@${currentBusiness.tradeName.toLowerCase().replace(/\s+/g, '')}.com`
  );
  const [managerPassword, setManagerPassword] = useState(
    currentBusiness.managerPassword || 'gerente123'
  );
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [autoWhatsapp, setAutoWhatsapp] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize when current business changes
  useEffect(() => {
    if (currentBusiness) {
      setTradeName(currentBusiness.tradeName);
      setPhone(currentBusiness.phone);
      setCity(currentBusiness.city);
      setState(currentBusiness.state);
      setCnpj(currentBusiness.cnpj || '');
      setManagerName(
        currentBusiness.managerName || `Gerente ${currentBusiness.tradeName}`
      );
      setManagerEmail(
        currentBusiness.managerEmail ||
          `gerente@${currentBusiness.tradeName.toLowerCase().replace(/\s+/g, '')}.com`
      );
      setManagerPassword(currentBusiness.managerPassword || 'gerente123');
    }
  }, [currentBusiness?.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness({
      ...currentBusiness,
      tradeName,
      phone,
      city,
      state,
      cnpj,
      managerName,
      managerEmail,
      managerPassword,
    });
    setSaveSuccess(true);
    addNotification({
      title: 'Configurações e Credenciais salvas',
      message: 'Os dados do estabelecimento e o perfil do gerente foram atualizados.',
      type: 'system',
    });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {settingsSubTab === 'disponibilidade'
                ? 'Configurações de Disponibilidade do Profissional'
                : 'Configurações do Studio'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {settingsSubTab === 'disponibilidade'
                ? 'Defina datas de vigência, múltiplos dias da semana e horários de atendimento da equipe'
                : `Ajuste as preferências operacionais, dados cadastrais e canais de confirmação do ${currentBusiness.tradeName}`}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto shrink-0">
            {currentRole !== 'profissional' && (
              <button
                type="button"
                onClick={() => setSettingsSubTab('studio')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsSubTab === 'studio'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Dados do Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSettingsSubTab('disponibilidade')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                settingsSubTab === 'disponibilidade'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
              <span>Disponibilidade do Profissional</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conditionally Render: Professional Availability OR Studio Settings */}
      {settingsSubTab === 'disponibilidade' ? (
        <ProfessionalAvailabilitySettings
          initialProfessionalId={selectedProfessionalForAvailabilityId || undefined}
        />
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Business Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Dados do Estabelecimento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome de Exibição / Fantasia
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Cidade & Estado
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-16 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 uppercase text-center"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                CNPJ Cadastrado
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Manager Profile & Firebase Auth Credentials */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Perfil do Gerente & Credenciais de Acesso (Firebase Auth)
              </h3>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded font-bold">
              Claim: tenant_manager · tenant_id: {currentBusiness.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome do Gerente Responsável
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Nome do gerente"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                E-mail do Gerente (Login Firebase)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="gerente@studio.com"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Senha de Acesso do Gerente
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showManagerPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowManagerPassword(!showManagerPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showManagerPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showManagerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            O gerente utiliza este e-mail e senha no Portal de Login (/login) com a role <strong>tenant_manager</strong> para gerenciar com exclusividade este estabelecimento, controle de comissões e fechamento de caixa sem ter acesso aos dados de outros estabelecimentos nem à rota de super administrador (/admin/*).
          </p>
        </div>

        {/* Automation & WhatsApp Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Automações de Notificação ao Cliente
            </h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={autoWhatsapp}
                onChange={(e) => setAutoWhatsapp(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Envio Automático de Confirmação por WhatsApp
                </span>
                <span className="text-xs text-slate-500">
                  Envia lembrete 24h e 2h antes com opção do cliente confirmar ou remarcar direto pelo link.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Roles and Security Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Controle de Acesso SaaS (RBAC)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <span className="font-bold text-purple-900 block mb-1">CEO / Proprietário</span>
              <p className="text-purple-800 text-[11px]">
                Acesso a faturamento, balanço financeiro, taxas de comissão, contratação de planos e configurações gerais.
              </p>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="font-bold text-blue-900 block mb-1">Gerente Operacional</span>
              <p className="text-blue-800 text-[11px]">
                Gestão da agenda geral da equipe, abertura e fechamento de comandas no caixa, e cadastro de clientes e serviços.
              </p>
            </div>
            <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-900 block mb-1">Profissional / Executor</span>
              <p className="text-slate-700 text-[11px]">
                Visão restrita da própria agenda, lista de clientes do dia e extrato de suas comissões a receber.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurações salvas com sucesso!</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    )}
  </div>
);
};
