import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  AlertTriangle,
  Shield,
  Check,
  Search,
  LogIn,
  UserCheck,
  UserX,
  UserPlus,
  Upload,
  RefreshCw,
  X,
  FlipHorizontal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Client, ClientRegistrationData } from '../../types';
import { findDuplicateClientByPhone, isClientProfileComplete } from '../../utils/clientValidation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// Helper to compress and center-crop avatar image into a 500x500 square data URL
const compressAndResizeImage = (fileOrBlob: Blob, maxSize = 500, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao carregar o arquivo da imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        const targetSize = Math.min(maxSize, minSide);
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetSize, targetSize);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
};

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

type VerificationResult =
  | { type: 'complete'; client: Client }
  | { type: 'incomplete'; client: Client }
  | { type: 'not_found'; phone: string }
  | null;

export const ClientSignupPage: React.FC = () => {
  const { registerClient, loginWithGoogle, navigateTo, clients } = useApp();

  const formRef = useRef<HTMLFormElement>(null);

  // States for "Complete seu cadastro" phone verification section
  const [verifyPhone, setVerifyPhone] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult>(null);
  const [verifyError, setVerifyError] = useState('');
  const [completingClient, setCompletingClient] = useState<Client | null>(null);

  // Registration Form State
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

  // Live Camera & Gallery Upload State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Camera cleanup
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.warn);
    }
  }, [cameraStream, isCameraModalOpen, capturedImagePreview]);

  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraError(null);
    setCapturedImagePreview(null);
    setIsStartingCamera(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn('Erro ao abrir câmera:', err);
      let msg = 'Não foi possível acessar a câmera do dispositivo.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Permissão de acesso à câmera negada. Habilite a permissão no navegador.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera detectada neste dispositivo.';
      }
      setCameraError(msg);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleOpenCameraModal = () => {
    setIsCameraModalOpen(true);
    setCapturedImagePreview(null);
    startCamera(cameraFacingMode);
  };

  const handleCloseCameraModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
    setCapturedImagePreview(null);
    setCameraError(null);
  };

  const handleToggleFacingMode = () => {
    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    const minSide = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minSide) / 2;
    const startY = (video.videoHeight - minSide) / 2;

    const targetSize = 500;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (cameraFacingMode === 'user') {
      ctx.translate(targetSize, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, minSide, minSide, 0, 0, targetSize, targetSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImagePreview(dataUrl);
  };

  const handleApplyCapturedPhoto = () => {
    if (!capturedImagePreview) return;
    setFormData((prev) => ({ ...prev, photoURL: capturedImagePreview }));
    setCustomPhotoInput('');
    setUseCustomPhoto(true);
    handleCloseCameraModal();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    try {
      const compressedDataUrl = await compressAndResizeImage(file, 500, 0.85);
      setFormData((prev) => ({ ...prev, photoURL: compressedDataUrl }));
      setCustomPhotoInput('');
      setUseCustomPhoto(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao carregar a imagem da galeria.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Phone masking for verification input
  const handleVerifyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setVerifyPhone(formatted);
    setVerifyError('');
  };

  // Phone masking for main registration form: (XX) XXXXX-XXXX
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

  // Logic for "Verificar" button in "Complete seu cadastro" section
  const handleVerify = async () => {
    setVerifyError('');
    setVerificationResult(null);

    const raw = verifyPhone.replace(/\D/g, '');
    if (raw.length < 8) {
      setVerifyError('Por favor, informe um número de telefone com DDD válido para consultar.');
      return;
    }

    setIsVerifying(true);
    try {
      // 1. Procurar na lista local de clientes em memória
      let found = findDuplicateClientByPhone(clients, verifyPhone);

      // 2. Fallback direto ao Firestore caso a lista em memória ainda não esteja sincronizada
      if (!found) {
        try {
          const snap = await getDocs(collection(db, 'clients'));
          const firestoreClients: Client[] = [];
          snap.forEach((doc) => {
            firestoreClients.push(doc.data() as Client);
          });
          found = findDuplicateClientByPhone(firestoreClients, verifyPhone);
        } catch (dbErr) {
          console.warn('Erro ao consultar Firestore diretamente para verificação:', dbErr);
        }
      }

      if (!found) {
        // Cenário C: Telefone Não Encontrado
        setVerificationResult({
          type: 'not_found',
          phone: verifyPhone,
        });
      } else {
        const isComplete = isClientProfileComplete(found);
        if (isComplete) {
          // Cenário A: Cadastro Completo (todos os campos preenchidos)
          setVerificationResult({
            type: 'complete',
            client: found,
          });
        } else {
          // Cenário B: Cadastro Incompleto (campos pendentes de preenchimento)
          setVerificationResult({
            type: 'incomplete',
            client: found,
          });
        }
      }
    } catch (err: any) {
      setVerifyError('Ocorreu um erro ao consultar a base de dados. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Cenário B: Usuário clica em "Completar cadastro"
  const handleStartCompleteRegistration = (client: Client) => {
    setCompletingClient(client);
    setFormData((prev) => ({
      ...prev,
      name: client.name || prev.name,
      phone: client.phone || verifyPhone || prev.phone,
      email: client.email && !client.email.endsWith('@cliente.local') ? client.email : prev.email,
      birthDay: client.birthDay || prev.birthDay || 1,
      birthMonth: client.birthMonth || prev.birthMonth || 1,
      photoURL: client.photoURL || prev.photoURL || PRESET_AVATARS[0],
    }));
    setErrorMessage('');
    setSuccessMessage('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Cenário C: Usuário clica em "Fazer Cadastro"
  const handleStartNewRegistration = () => {
    navigateTo('/cadastro');
    if (verifyPhone.trim()) {
      setFormData((prev) => ({
        ...prev,
        phone: verifyPhone.trim(),
      }));
    }
    setCompletingClient(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        existingClientId: completingClient ? completingClient.id : undefined,
      });

      if (res.success) {
        setSuccessMessage(
          completingClient
            ? 'Cadastro completado com sucesso! Redirecionando...'
            : 'Conta de cliente criada com sucesso! Redirecionando...'
        );
      } else {
        setErrorMessage(res.error || 'Falha ao processar cadastro de cliente.');
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

          {/* NOVA SEÇÃO: "Complete seu cadastro" */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3.5 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Complete seu cadastro</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Verificação por telefone
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Já realizou um atendimento ou agendou pelo WhatsApp? Informe seu telefone para verificar se já possui cadastro prévio e prosseguir.
            </p>

            {/* Input Telefone & Botão Verificar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={verifyPhone}
                  onChange={handleVerifyPhoneChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerify();
                    }
                  }}
                  placeholder="(11) 98765-4321"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || !verifyPhone.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md shadow-emerald-500/10"
              >
                {isVerifying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Verificar</span>
                  </>
                )}
              </button>
            </div>

            {/* Erro de validação de input de verificação */}
            {verifyError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Card com os Cenários de Resultado ao Clicar em "Verificar" */}
            {verificationResult && (
              <div className="pt-1">
                {/* Cenário A (Cadastro Completo) */}
                {verificationResult.type === 'complete' && (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-white text-xs sm:text-sm">
                          {verificationResult.client.name
                            ? `Cadastro completo encontrado para ${verificationResult.client.name}!`
                            : 'Cadastro completo encontrado!'}
                        </p>
                        <p className="text-emerald-300/90 text-xs leading-relaxed">
                          Seu cadastro já está completo em nossa base de dados com todas as informações preenchidas. Para acessar seus agendamentos, serviços e histórico, clique no botão abaixo para fazer login.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('/login?role=client')}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Fazer login</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVerificationResult(null);
                          setVerifyPhone('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline px-2 py-1 cursor-pointer text-center"
                      >
                        Verificar outro número
                      </button>
                    </div>
                  </div>
                )}

                {/* Cenário B (Cadastro Incompleto) */}
                {verificationResult.type === 'incomplete' && (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-white text-xs sm:text-sm">
                          {verificationResult.client.name
                            ? `Cadastro incompleto para ${verificationResult.client.name}`
                            : 'Cadastro incompleto'}
                        </p>
                        <p className="text-amber-300/90 text-xs leading-relaxed">
                          Localizamos seu registro em nossa base, porém seu cadastro ainda está como a completar (com dados pendentes como e-mail, senha ou data de nascimento). Clique em "Completar cadastro" para finalizar.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartCompleteRegistration(verificationResult.client)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Completar cadastro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVerificationResult(null);
                          setVerifyPhone('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline px-2 py-1 cursor-pointer text-center"
                      >
                        Consultar outro número
                      </button>
                    </div>
                  </div>
                )}

                {/* Cenário C (Telefone Não Encontrado) */}
                {verificationResult.type === 'not_found' && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 text-xs space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-start gap-2.5">
                      <UserX className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-white text-xs sm:text-sm">
                          Telefone não encontrado
                        </p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          Não encontramos nenhum cadastro vinculado ao número informado ({verificationResult.phone}) em nossa base de dados.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStartNewRegistration}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Fazer Cadastro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVerificationResult(null);
                          setVerifyPhone('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline px-2 py-1 cursor-pointer text-center"
                      >
                        Tentar outro telefone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Banner quando estiver completando um cadastro existente (Cenário B) */}
          {completingClient && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Completando o cadastro de <strong>{completingClient.name}</strong>. Preencha os campos pendentes abaixo para ativar sua conta.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompletingClient(null);
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: '',
                    birthDay: 1,
                    birthMonth: 1,
                    photoURL: PRESET_AVATARS[0],
                  });
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

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
                  {useCustomPhoto ? 'Escolher avatar pré-definido' : 'Inserir URL manual'}
                </button>
              </div>

              {/* Botões rápidos: Galeria e Câmera */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Foto da Galeria</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCameraModal}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tirar com a Câmera</span>
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
                  {formData.photoURL && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <img
                        src={formData.photoURL}
                        alt="Preview"
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = PRESET_AVATARS[0];
                        }}
                      />
                      <span>Foto selecionada</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {/* Current custom photo thumbnail if set from gallery or camera */}
                  {formData.photoURL && !PRESET_AVATARS.includes(formData.photoURL) && (
                    <div className="relative rounded-full ring-2 ring-emerald-500 scale-105 shrink-0 shadow-md shadow-emerald-500/30">
                      <img
                        src={formData.photoURL}
                        alt="Sua foto"
                        className="w-11 h-11 rounded-full object-cover border border-slate-700"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-slate-950 rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5 font-bold" />
                      </div>
                    </div>
                  )}

                  {PRESET_AVATARS.map((av, index) => {
                    const isSelected = formData.photoURL === av;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, photoURL: av });
                          setCustomPhotoInput('');
                        }}
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
              <span>
                {isSubmitting
                  ? 'Processando...'
                  : completingClient
                  ? 'Completar Cadastro de Cliente'
                  : 'Concluir Cadastro de Cliente'}
              </span>
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

      {/* Live Camera Capture Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tirar Foto com a Câmera</h3>
                  <p className="text-[11px] text-slate-400">
                    Posicione o rosto no círculo e tire sua foto
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewfinder area */}
            <div className="relative w-full aspect-square max-w-[300px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500/40 shadow-inner flex items-center justify-center">
              {capturedImagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImagePreview}
                    alt="Foto capturada"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Foto capturada</span>
                  </div>
                </div>
              ) : cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(cameraFacingMode)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : isStartingCamera ? (
                <div className="text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Iniciando câmera...</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      cameraFacingMode === 'user' ? '-scale-x-100' : ''
                    }`}
                  />
                  {/* Subtle circular face guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-44 h-44 rounded-full border-2 border-dashed border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]" />
                  </div>
                </>
              )}
            </div>

            {/* Modal actions */}
            <div className="pt-2">
              {capturedImagePreview ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImagePreview(null);
                      startCamera(cameraFacingMode);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tirar Outra</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyCapturedPhoto}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Usar Esta Foto</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    {/* Toggle camera orientation */}
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer"
                      title="Inverter câmera (frontal / traseira)"
                    >
                      <FlipHorizontal className="w-5 h-5" />
                    </button>

                    {/* Main Shutter Button */}
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      disabled={!cameraStream || !!cameraError || isStartingCamera}
                      className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Capturar foto agora"
                    >
                      <Camera className="w-7 h-7" />
                    </button>
                  </div>

                  <p className="text-[11px] text-center text-slate-400">
                    Aponte a câmera e clique no botão verde para fotografar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
