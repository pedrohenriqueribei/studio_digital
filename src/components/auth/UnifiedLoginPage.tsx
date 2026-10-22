import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Users,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  Terminal,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RoleType } from '../../types';
import { SUPER_ADMIN_CREDENTIALS } from '../../data/mockData';

export const UnifiedLoginPage: React.FC = () => {
  const {
    loginSuperAdmin,
    loginWithEmailPassword,
    loginWithGoogle,
    sendPasswordReset,
    navigateTo,
    currentPath,
    businesses,
    professionals,
    switchBusiness,
    switchRole,
    setSimulatedClaims,
    setIsSuperAdminView,
    activeClaims,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'super_admin' | 'tenant_manager' | 'professional'>(() => {
    if (typeof window !== 'undefined') {
      const recentRole = localStorage.getItem('recentSignupRole');
      if (recentRole === 'tenant_manager' || recentRole === 'professional') {
        return recentRole;
      }
    }
    return 'tenant_manager';
  });
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const recentEmail = localStorage.getItem('recentSignupEmail');
      if (recentEmail) return recentEmail;
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const recentEmail = localStorage.getItem('recentSignupEmail');
      if (recentEmail) {
        const found = businesses.find(
          (b) => (b.managerEmail || '').toLowerCase() === recentEmail.toLowerCase()
        );
        if (found) return found.id;
      }
    }
    return businesses[0]?.id || '';
  });
  const [selectedProId, setSelectedProId] = useState<string>(professionals[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentSignupNotice, setRecentSignupNotice] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const bizName = localStorage.getItem('recentSignupBizName');
      return bizName
        ? `🎉 Parabéns! O teste grátis de 14 dias para "${bizName}" foi ativado. Digite sua senha pessoal cadastrada para acessar o painel do Gerente.`
        : null;
    }
    return null;
  });

  // Forgot password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSuperAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const success = loginSuperAdmin(email, password);
      if (success) {
        setSimulatedClaims({
          role: 'super_admin',
          email: SUPER_ADMIN_CREDENTIALS.email,
          assignedAt: Date.now(),
        });
        setIsSuperAdminView(true);
        navigateTo('/admin/painelmaster');
      } else {
        setErrorMsg('Credenciais inválidas. Verifique o e-mail e senha de Super Admin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await loginWithEmailPassword(email, password, 'tenant_manager');
      if (!res.success) {
        setErrorMsg(res.error || 'Credenciais de gerente inválidas. Verifique seu e-mail e sua senha pessoal.');
      } else {
        try {
          localStorage.removeItem('recentSignupBizName');
          localStorage.removeItem('recentSignupEmail');
          localStorage.removeItem('recentSignupRole');
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha na autenticação do Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfessionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await loginWithEmailPassword(email, password, 'professional');
      if (!res.success) {
        setErrorMsg(res.error || 'Credenciais de profissional inválidas. Verifique seu e-mail e sua senha.');
      } else {
        try {
          localStorage.removeItem('recentSignupBizName');
          localStorage.removeItem('recentSignupEmail');
          localStorage.removeItem('recentSignupRole');
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha na autenticação do Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        // Automatically route to appropriate dashboard based on claims
        if (activeClaims?.role === 'professional') {
          navigateTo('/app/profissional/agenda');
        } else if (activeClaims?.role === 'tenant_manager') {
          navigateTo('/app/gerente/dashboard');
        } else {
          navigateTo('/admin/painelmaster');
        }
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erro ao conectar com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const targetEmail = resetEmail.trim().toLowerCase();
    if (!targetEmail) {
      setResetError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await sendPasswordReset(targetEmail);
      if (res.success) {
        setResetSuccess(res.message);
      } else {
        setResetError(res.error || 'Falha ao solicitar redefinição.');
      }
    } catch (err: any) {
      setResetError(err?.message || 'Erro ao processar solicitação.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <button
          onClick={() => navigateTo('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para o Studio Digital</span>
        </button>

        <span className="text-[11px] font-mono text-amber-400/90 bg-slate-900 border border-amber-500/30 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-2xs">
          <Key className="w-3 h-3 text-amber-400" />
          <span>Portal RBAC / Firebase Auth</span>
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-xl w-full mx-auto my-auto py-8 z-10">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 font-bold">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                Studio Digital SaaS · Controle de Acesso Baseado em Funções
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                Portal de Autenticação & Acesso
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Selecione o perfil de acesso correspondente à sua função na plataforma ou acesse via Firebase Authentication.
            </p>
          </div>

          {isForgotMode ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Recuperação de Senha (Firebase Auth)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Gerentes & Profissionais</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Informe o e-mail cadastrado no seu perfil de <strong>Gerente</strong> ou{' '}
                  <strong>Profissional</strong>. Você receberá um e-mail do <strong>Firebase Auth</strong> com
                  um link seguro para redefinir sua senha imediatamente.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setResetError('');
                      }}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span className="leading-relaxed">{resetSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setResetSuccess('');
                      setResetError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para o Login</span>
                  </button>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando link...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enviar Link de Recuperação</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* 3 Profile Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                <button
              onClick={() => {
                setActiveTab('super_admin');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === 'super_admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="text-[11px]">Super Admin</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tenant_manager');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === 'tenant_manager'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-[11px]">Gerente</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('professional');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                activeTab === 'professional'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[11px]">Profissional</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: SUPER ADMIN */}
          {activeTab === 'super_admin' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950/90 border border-amber-500/30 rounded-2xl text-xs space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Acesso Restrito · Super Admin (CEO)</span>
                  </span>
                  <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Área Protegida
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Painel confidencial de controle master da plataforma. O acesso exige autenticação individual com senha master ou conta Google vinculada.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 pt-1 border-t border-amber-500/20 font-mono">
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Credenciais protegidas. Acesso público estritamente bloqueado.</span>
                </div>
              </div>

              <form onSubmit={handleSuperAdminLogin} className="space-y-3.5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    E-mail do Administrador
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pedro.projetos0770@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Senha Master
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email || SUPER_ADMIN_CREDENTIALS.email);
                        setResetError('');
                        setResetSuccess('');
                        setIsForgotMode(true);
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3 text-amber-400" />
                      <span>Esqueci minha senha</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <Shield className="w-4 h-4" />
                  <span>Autenticar Credenciais Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: GERENTE DO ESTABELECIMENTO */}
          {activeTab === 'tenant_manager' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gerente de Unidade / Studio</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">Rota: /app/gerente/*</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Gestão completa do seu estabelecimento: controle financeiro (caixa e comandas), equipe, serviços e regras de agendamento (isolado por tenant_id).
                </p>
              </div>

              {recentSignupNotice && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Teste Grátis de 14 Dias Ativado</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecentSignupNotice(null)}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1 py-0.5"
                    >
                      Dispensar
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {recentSignupNotice}
                  </p>
                </div>
              )}

              {businesses.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2 text-xs">
                  <p className="text-slate-400">
                    Nenhum estabelecimento cadastrado no banco de dados.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('super_admin');
                      setEmail('');
                      setPassword('');
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Acessar como Super Admin para cadastrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleManagerLogin} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Selecione o Estabelecimento (Tenant)
                    </label>
                    <select
                      value={selectedTenantId}
                      onChange={(e) => {
                        const tId = e.target.value;
                        setSelectedTenantId(tId);
                        const b = businesses.find((biz) => biz.id === tId);
                        if (b) {
                          setEmail(b.managerEmail || `gerente@${b.tradeName.toLowerCase().replace(/\s+/g, '')}.com`);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    >
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.tradeName} ({b.city} - {b.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        E-mail de Acesso do Gerente
                      </label>
                      {selectedTenantId && (
                        <button
                          type="button"
                          onClick={() => {
                            const b = businesses.find((biz) => biz.id === selectedTenantId);
                            if (b) {
                              setEmail(b.managerEmail || `gerente@${b.tradeName.toLowerCase().replace(/\s+/g, '')}.com`);
                              setPassword(b.managerPassword || 'gerente123');
                            }
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                        >
                          Usar credencial cadastrada
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="gerente@estabelecimento.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Senha de Acesso (Firebase Auth)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setResetError('');
                          setResetSuccess('');
                          setIsForgotMode(true);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3 text-indigo-400" />
                        <span>Esqueci minha senha</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Autenticar Gerente (Firebase Auth)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: PROFISSIONAL / PRESTADOR */}
          {activeTab === 'professional' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Profissional / Prestador de Serviço</span>
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">Rota: /app/profissional/*</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Visualização restrita à própria agenda diária/semanal, marcação de status dos atendimentos e consulta individual de comissões e ganhos.
                </p>
              </div>

              {professionals.length === 0 ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2 text-xs">
                  <p className="text-slate-400">
                    Nenhum profissional cadastrado na base ainda.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Cadastre profissionais pelo painel do gerente com e-mail e senha de acesso.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleProfessionalLogin} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Estabelecimento (Tenant)
                      </label>
                      <select
                        value={selectedTenantId}
                        onChange={(e) => {
                          const tId = e.target.value;
                          setSelectedTenantId(tId);
                          const pros = professionals.filter((p) => p.businessId === tId);
                          if (pros.length > 0) {
                            setSelectedProId(pros[0].id);
                            setEmail(pros[0].email);
                            setPassword(pros[0].password || 'pro123');
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      >
                        {businesses.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.tradeName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Profissional Cadastrado
                      </label>
                      <select
                        value={selectedProId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setSelectedProId(pId);
                          const p = professionals.find((pro) => pro.id === pId);
                          if (p) {
                            setEmail(p.email);
                            setPassword(p.password || 'pro123');
                          }
                        }}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      >
                        {professionals
                          .filter((p) => !selectedTenantId || p.businessId === selectedTenantId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        E-mail de Login do Profissional
                      </label>
                      {selectedProId && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = professionals.find((pro) => pro.id === selectedProId);
                            if (p) {
                              setEmail(p.email);
                              setPassword(p.password || 'pro123');
                            }
                          }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                        >
                          Usar credencial cadastrada
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="pro@studiodigital.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Senha de Acesso (Firebase Auth)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setResetError('');
                          setResetSuccess('');
                          setIsForgotMode(true);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3 text-blue-400" />
                        <span>Esqueci minha senha</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Autenticar Profissional (Firebase Auth)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              ou login seguro
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Entrar com Google (Firebase Authentication)</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center z-10 text-[11px] text-slate-500">
        <span>Studio Digital SaaS · Controle de Acesso Baseado em Funções (RBAC)</span>
      </div>
    </div>
  );
};
