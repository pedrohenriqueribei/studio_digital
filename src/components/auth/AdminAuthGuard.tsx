import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPER_ADMIN_CREDENTIALS } from '../../data/mockData';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children }) => {
  const {
    isSuperAdminAuthenticated,
    loginSuperAdmin,
    loginWithGoogle,
    navigateTo,
    superAdminUser,
    currentPath,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated as Super Admin, render the protected admin children directly
  if (isSuperAdminAuthenticated) {
    return <>{children}</>;
  }

  const handleFillCredentials = () => {
    setEmail(SUPER_ADMIN_CREDENTIALS.email);
    setPassword(SUPER_ADMIN_CREDENTIALS.password);
    setErrorMsg('');
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const success = loginSuperAdmin(email, password);
      if (!success) {
        setErrorMsg('Credenciais inválidas. Verifique o e-mail e a senha do Super Admin Master.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const success = await loginWithGoogle();
      if (!success) {
        setErrorMsg('Esta conta Google não possui permissões de Super Admin Master.');
      }
    } catch {
      setErrorMsg('Falha na autenticação via Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Return link */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between z-10">
        <button
          onClick={() => navigateTo('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para o Studio Digital (Início)</span>
        </button>

        <span className="text-[11px] font-mono text-amber-400/90 bg-slate-900 border border-amber-500/30 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-2xs">
          <Lock className="w-3 h-3 text-amber-400" />
          <span>{currentPath.startsWith('/admin') ? currentPath : '/admin/painelmaster'}</span>
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 font-bold">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                Área Administrativa Restrita
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
                Acesso Autenticado
              </h1>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Todas as páginas administrativas exigem autenticação prévia. Entre com as credenciais master ou conta Google autorizada.
            </p>
          </div>

          {/* Quick-Fill Helper for Tester/Demo */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Credenciais do CEO Master:</span>
              </span>
              <button
                type="button"
                onClick={handleFillCredentials}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                Preencher Campos
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
              <p>Email: <span className="text-slate-200">{SUPER_ADMIN_CREDENTIALS.email}</span></p>
              <p>Senha: <span className="text-slate-200">••••••••</span></p>
            </div>

            <button
              type="button"
              onClick={() => {
                loginSuperAdmin(SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
              }}
              className="w-full mt-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Entrar Direto como Pedro Campos (CEO Master)</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                E-mail do Administrador
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pedro.projetos0770@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Senha de Acesso Master
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Autenticando...' : 'Acessar Área Administrativa'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              ou
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
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
            <span>Entrar com Google (Firebase Auth)</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-md w-full mx-auto text-center z-10 text-[11px] text-slate-500">
        <span>Studio Digital SaaS · Sistema Multi-Tenant Seguro</span>
      </div>
    </div>
  );
};
