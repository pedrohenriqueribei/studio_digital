import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Shield,
  Check,
  AlertCircle,
  Sparkles,
  Building2,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPER_ADMIN_CREDENTIALS } from '../../data/mockData';
import { auth, sendPasswordResetEmail } from '../../firebase';
import { RoleType } from '../../types';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    loginSuperAdmin,
    loginWithEmailPassword,
    loginWithGoogle,
    sendPasswordReset,
    businesses,
    professionals,
  } = useApp();

  // Mode: standard login or forgot password view
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password'>('login');

  // Login state
  const [activeTab, setActiveTab] = useState<'gerente' | 'profissional' | 'super_admin'>('gerente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetRoleHint, setResetRoleHint] = useState<'gerente' | 'profissional' | 'super_admin'>('gerente');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  if (!isLoginModalOpen) return null;

  const handleClose = () => {
    setIsLoginModalOpen(false);
    setLoginError('');
    setLoginSuccess('');
    setResetSuccessMsg('');
    setResetErrorMsg('');
    setViewMode('login');
  };

  const switchToForgotPassword = (initialEmail?: string) => {
    setResetEmail(initialEmail || email || '');
    setResetRoleHint(activeTab);
    setResetSuccessMsg('');
    setResetErrorMsg('');
    setViewMode('forgot_password');
  };

  const handleFillCredentials = (role: 'gerente' | 'profissional') => {
    setLoginError('');
    if (role === 'gerente') {
      const biz = businesses[0];
      if (biz) {
        setEmail(biz.managerEmail || `gerente@${biz.tradeName.toLowerCase().replace(/\s+/g, '')}.com`);
        setPassword(biz.managerPassword || 'gerente123');
      }
    } else if (role === 'profissional') {
      const pro = professionals[0];
      if (pro) {
        setEmail(pro.email);
        setPassword(pro.password || 'pro123');
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');
    setIsLoggingIn(true);

    try {
      if (activeTab === 'super_admin') {
        const ok = loginSuperAdmin(email, password);
        if (ok) {
          setLoginSuccess('Autenticado com sucesso como CEO da Plataforma!');
          setTimeout(() => {
            handleClose();
          }, 800);
        } else {
          setLoginError('Credenciais inválidas para Super Admin.');
        }
      } else {
        const roleHint: RoleType = activeTab === 'gerente' ? 'tenant_manager' : 'professional';
        const res = await loginWithEmailPassword(email, password, roleHint);
        if (res.success) {
          const roleLabel = activeTab === 'gerente' ? 'Gerente' : 'Profissional';
          setLoginSuccess(`Autenticado com sucesso como ${roleLabel}! Redirecionando...`);
          setTimeout(() => {
            handleClose();
          }, 800);
        } else {
          setLoginError(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        }
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Falha na autenticação. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    const targetEmail = resetEmail.trim().toLowerCase();
    if (!targetEmail) {
      setResetErrorMsg('Por favor, informe seu e-mail de acesso cadastrado.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setResetErrorMsg('Insira um formato de e-mail válido (ex: nome@dominio.com).');
      return;
    }

    setResetLoading(true);

    try {
      // Direct call to Firebase Auth sendPasswordResetEmail with fallback through AppContext helper
      try {
        await sendPasswordResetEmail(auth, targetEmail);
        setResetSuccessMsg(
          `E-mail de recuperação enviado com sucesso para ${targetEmail}! Verifique sua caixa de entrada e pasta de spam para redefinir sua senha.`
        );
      } catch (fbErr: any) {
        console.warn('sendPasswordResetEmail call exception:', fbErr);
        // Delegate to AppContext helper which provides role detection and tenant account fallbacks
        const contextRes = await sendPasswordReset(targetEmail);
        if (contextRes.success) {
          setResetSuccessMsg(contextRes.message);
        } else {
          let errorFriendly = contextRes.error || 'Não foi possível enviar o e-mail de redefinição.';
          if (fbErr?.code === 'auth/user-not-found') {
            errorFriendly = 'Nenhum usuário cadastrado foi encontrado com este e-mail no Firebase Auth.';
          } else if (fbErr?.code === 'auth/invalid-email') {
            errorFriendly = 'O endereço de e-mail informado é inválido.';
          } else if (fbErr?.code === 'auth/too-many-requests') {
            errorFriendly = 'Muitas tentativas recentes. Aguarde alguns instantes antes de tentar novamente.';
          }
          setResetErrorMsg(errorFriendly);
        }
      }
    } catch (generalErr: any) {
      setResetErrorMsg(generalErr?.message || 'Erro inesperado ao processar redefinição de senha.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                viewMode === 'forgot_password'
                  ? 'bg-amber-600'
                  : activeTab === 'super_admin'
                  ? 'bg-slate-900'
                  : activeTab === 'gerente'
                  ? 'bg-indigo-600'
                  : 'bg-blue-600'
              }`}
            >
              {viewMode === 'forgot_password' ? (
                <KeyRound className="w-4 h-4 text-white" />
              ) : activeTab === 'super_admin' ? (
                <Shield className="w-4 h-4 text-amber-400" />
              ) : activeTab === 'gerente' ? (
                <Building2 className="w-4 h-4 text-white" />
              ) : (
                <Users className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {viewMode === 'forgot_password' ? 'Recuperar Minha Senha' : 'Entrar no Studio Digital'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {viewMode === 'forgot_password'
                  ? 'Firebase Auth · Recuperação Segura de Acesso'
                  : 'Autenticação segura via Firebase Auth'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* ========================================================= */}
          {/* VIEW MODE: FORGOT PASSWORD */}
          {/* ========================================================= */}
          {viewMode === 'forgot_password' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Recuperação de Acesso para Gerentes e Profissionais</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Informe o e-mail cadastrado no seu perfil de <strong>Gerente</strong> ou{' '}
                  <strong>Profissional</strong>. Você receberá um e-mail do <strong>Firebase Auth</strong> com
                  um link seguro para redefinir sua senha imediatamente.
                </p>
              </div>

              {/* Quick pre-fills for testing/demo */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-slate-400 self-center text-[10px] font-semibold">Exemplos rápidos:</span>
                {businesses[0]?.managerEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(businesses[0].managerEmail || '');
                      setResetErrorMsg('');
                    }}
                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 cursor-pointer font-medium"
                  >
                    Gerente: {businesses[0].tradeName}
                  </button>
                )}
                {professionals[0]?.email && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(professionals[0].email);
                      setResetErrorMsg('');
                    }}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 cursor-pointer font-medium"
                  >
                    Profissional: {professionals[0].name.split(' ')[0]}
                  </button>
                )}
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    E-mail cadastrado no sistema
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setResetErrorMsg('');
                      }}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                      autoFocus
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Enviaremos o link de recuperação utilizando sendPasswordResetEmail do Firebase Auth.
                  </span>
                </div>

                {resetErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span className="leading-tight">{resetErrorMsg}</span>
                  </div>
                )}

                {resetSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Link enviado com sucesso!</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">{resetSuccessMsg}</p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setResetSuccessMsg('');
                      setResetErrorMsg('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para o Login</span>
                  </button>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
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
            /* ========================================================= */
            /* VIEW MODE: STANDARD LOGIN */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Role Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('gerente');
                    setLoginError('');
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'gerente'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="text-[11px]">Gerente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profissional');
                    setLoginError('');
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'profissional'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-[11px]">Profissional</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('super_admin');
                    setLoginError('');
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                    activeTab === 'super_admin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px]">Super Admin</span>
                </button>
              </div>

              {/* Google Auth Button */}
              <button
                type="button"
                onClick={async () => {
                  const ok = await loginWithGoogle();
                  if (ok) handleClose();
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
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
                <span>Entrar com Google (Firebase Auth)</span>
              </button>

              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <div className="flex-1 border-t border-slate-200" />
                <span>ou acesse com e-mail e senha</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Pre-fill Helper Banner - ONLY for Gerente and Profissional */}
              {activeTab === 'super_admin' ? (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1.5 text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Acesso Master Restrito · Super Admin</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Credenciais confidenciais do CEO Pedro Campos. O acesso exige autenticação individual com senha master ou conta Google corporativa autorizada.
                  </p>
                </div>
              ) : (
                <div
                  className={`p-2.5 rounded-xl text-xs space-y-1 border ${
                    activeTab === 'gerente'
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {activeTab === 'gerente'
                          ? 'Credenciais de Demonstração (Gerente)'
                          : 'Credenciais de Demonstração (Profissional)'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFillCredentials(activeTab as 'gerente' | 'profissional')}
                      className="px-2 py-0.5 bg-white font-semibold rounded text-[10px] border border-current hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Preencher Demo
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    E-mail de Acesso ({activeTab === 'gerente' ? 'Gerente' : activeTab === 'profissional' ? 'Profissional' : 'Super Admin'})
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Senha</label>
                    {/* ESQUECI MINHA SENHA BUTTON */}
                    <button
                      type="button"
                      onClick={() => switchToForgotPassword(email)}
                      className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3 text-amber-500" />
                      <span>Esqueci minha senha</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {loginSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{loginSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                      activeTab === 'gerente'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : activeTab === 'profissional'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Autenticando...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {activeTab === 'gerente'
                            ? 'Entrar como Gerente'
                            : activeTab === 'profissional'
                            ? 'Entrar como Profissional'
                            : 'Entrar como Super Admin'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
