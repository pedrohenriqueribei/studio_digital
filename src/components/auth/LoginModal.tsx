import React, { useState } from 'react';
import { X, Lock, Mail, Shield, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPER_ADMIN_CREDENTIALS } from '../../data/mockData';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, loginSuperAdmin, superAdminUser, loginWithGoogle } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isLoginModalOpen) return null;

  const handleFillCredentials = () => {
    setEmail(SUPER_ADMIN_CREDENTIALS.email);
    setPassword(SUPER_ADMIN_CREDENTIALS.password);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const ok = loginSuperAdmin(email, password);
    if (ok) {
      setSuccessMsg('Autenticado com sucesso como CEO da Plataforma!');
      setTimeout(() => {
        setIsLoginModalOpen(false);
        setSuccessMsg('');
      }, 1000);
    } else {
      setErrorMsg('Credenciais inválidas. Verifique o e-mail e a senha do Super Admin.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Acesso Master · Super Admin
              </h3>
              <p className="text-xs text-slate-500">CEO da Plataforma Studio Digital</p>
            </div>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Firebase Google Auth Button */}
          <button
            type="button"
            onClick={async () => {
              await loginWithGoogle();
              setIsLoginModalOpen(false);
            }}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer"
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

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <div className="flex-1 border-t border-slate-200" />
            <span>ou utilize a senha master</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Credential Pre-fill Badge */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Credenciais do CEO Pedro Campos</span>
              </span>
              <button
                type="button"
                onClick={handleFillCredentials}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] cursor-pointer transition-colors"
              >
                Preencher Auto
              </button>
            </div>
            <p className="text-amber-800 text-[11px]">
              <strong>E-mail:</strong> {SUPER_ADMIN_CREDENTIALS.email}<br />
              <strong>Senha:</strong> {SUPER_ADMIN_CREDENTIALS.password}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="pedro.projetos0770@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Senha Master
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Entrar como Super Admin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
};
