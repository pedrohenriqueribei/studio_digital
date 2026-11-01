import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Calendar,
  Camera,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Heart,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ClientRegistrationData } from '../../types';

// Pre-configured curated stylish avatars that client can pick with one click
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=face',
];

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export const ClientSignupPage: React.FC = () => {
  const { registerClient, loginWithGoogle, navigateTo } = useApp();

  const [formData, setFormData] = useState<ClientRegistrationData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDay: 1,
    birthMonth: 1,
    photoURL: PRESET_AVATARS[0],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useCustomPhoto, setUseCustomPhoto] = useState(false);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone masking: (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setFormData((prev) => ({ ...prev, phone: formatted }));
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Pre-validations
    if (!formData.name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    const rawPhone = formData.phone.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      setErrorMessage('Por favor, informe um telefone/WhatsApp válido com DDD.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const photoToSave = useCustomPhoto && customPhotoInput.trim()
        ? customPhotoInput.trim()
        : formData.photoURL;

      const res = await registerClient({
        ...formData,
        photoURL: photoToSave,
      });

      if (res.success) {
        setSuccessMessage('Conta de cliente criada com sucesso! Redirecionando...');
      } else {
        setErrorMessage(res.error || 'Falha ao criar conta de cliente.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao processar seu cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        setSuccessMessage('Autenticado com Google com sucesso! Redirecionando...');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao autenticar com Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative selection:bg-emerald-500 selection:text-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between z-10 mb-4">
        <button
          onClick={() => navigateTo('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar ao Studio Digital</span>
        </button>

        <span className="text-[11px] font-mono text-emerald-400 bg-slate-900 border border-emerald-500/30 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cadastro de Cliente</span>
        </span>
      </div>

      {/* Main Form Card */}
      <div className="max-w-2xl w-full mx-auto z-10 my-auto py-4">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                Acesso Exclusivo para Clientes
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Crie sua Conta no Studio Digital
              </h1>
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Agende seus cortes, tratamentos estéticos e sessões de beleza com rapidez, receba lembretes e acompanhe seu histórico.
            </p>
          </div>

          {/* Quick Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-sm"
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
            <span>Cadastrar rapidamente com a conta Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              ou preencha seus dados
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome Completo <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setErrorMessage('');
                  }}
                  placeholder="Seu nome completo"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  E-mail <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setErrorMessage('');
                    }}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Telefone / WhatsApp <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 98765-4321"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Birth date (day & month only) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Data de Nascimento (Dia e Mês)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500">Para mensagens de aniversário e mimos</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <select
                    value={formData.birthDay}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDay: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Dia {d.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={formData.birthMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, birthMonth: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Avatar / Photo Selection */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Foto de Perfil</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomPhoto(!useCustomPhoto)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  {useCustomPhoto ? 'Escolher avatar pré-definido' : 'Inserir URL personalizada'}
                </button>
              </div>

              {useCustomPhoto ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={customPhotoInput}
                    onChange={(e) => {
                      setCustomPhotoInput(e.target.value);
                      setFormData({ ...formData, photoURL: e.target.value });
                    }}
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                  {customPhotoInput && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <img
                        src={customPhotoInput}
                        alt="Preview"
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = PRESET_AVATARS[0];
                        }}
                      />
                      <span>Prévia da foto informada</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((av, index) => {
                    const isSelected = formData.photoURL === av;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData({ ...formData, photoURL: av })}
                        className={`relative rounded-full transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 scale-105 shadow-md shadow-emerald-500/30'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={av}
                          alt={`Avatar ${index + 1}`}
                          className="w-11 h-11 rounded-full object-cover border border-slate-700"
                        />
                        {isSelected && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5 font-bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Senha <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setErrorMessage('');
                    }}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Confirmar Senha <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      setErrorMessage('');
                    }}
                    placeholder="Repita sua senha"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Assignment Notice */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Ao cadastrar-se, sua conta receberá automaticamente o perfil <strong>Cliente</strong> com acesso exclusivo à sua área pessoal de agendamentos e histórico, protegido por RBAC.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Criando sua conta...' : 'Concluir Cadastro de Cliente'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Already have an account */}
          <div className="text-center pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Já possui uma conta? </span>
            <button
              type="button"
              onClick={() => navigateTo('/login?role=client')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Fazer login aqui
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center z-10 text-[11px] text-slate-500">
        <span>Studio Digital SaaS · Portal Seguro do Consumidor e Agendamento Online</span>
      </div>
    </div>
  );
};
