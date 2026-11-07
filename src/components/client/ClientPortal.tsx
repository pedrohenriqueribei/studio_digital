import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Camera,
  MapPin,
  DollarSign,
  Shield,
  LogOut,
  Bell,
  ChevronRight,
  Filter,
  Info,
  CalendarCheck,
  History,
  Scissors,
  Check,
  Star,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Link2,
  FlipHorizontal,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Appointment, Service, Professional, Business, AppointmentStatus } from '../../types';
import { formatCurrency } from '../../utils/availability';
import { maskPhone } from '../../utils/masks';
import { ServiceSearchAutocomplete } from '../services/ServiceSearchAutocomplete';

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

type ClientTab = 'dashboard' | 'agendamentos' | 'novo' | 'historico' | 'perfil' | 'notificacoes';

export const ClientPortal: React.FC = () => {
  const {
    currentClient,
    logoutClient,
    updateClientProfile,
    cancelClientAppointment,
    createClientAppointment,
    submitAppointmentReview,
    appointments,
    services,
    professionals,
    businesses,
    currentBusiness,
    notifications,
    sendPasswordReset,
    navigateTo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ClientTab>('dashboard');

  // Modal states
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // Review Modal State
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] = useState<Appointment | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState(currentClient?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentClient?.phone ? maskPhone(currentClient.phone) : '');
  const [profilePhoto, setProfilePhoto] = useState(currentClient?.photoURL || '');
  const [profileBirthDay, setProfileBirthDay] = useState(currentClient?.birthDay || 1);
  const [profileBirthMonth, setProfileBirthMonth] = useState(currentClient?.birthMonth || 1);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ error?: string; success?: string } | null>(null);

  // Profile Photo & Live Camera State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const [isAutoSavingPhoto, setIsAutoSavingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // New Booking Wizard State
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBizId, setSelectedBizId] = useState<string>(
    currentBusiness?.id || (businesses.length > 0 ? businesses[0].id : '')
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);

  // Filter for appointments list
  const [statusFilter, setStatusFilter] = useState<'all' | 'agendado' | 'concluido' | 'cancelado'>('all');

  // Filter client's own appointments strictly
  const myAppointments = useMemo(() => {
    if (!currentClient) return [];
    return appointments.filter(
      (a) =>
        a.clientId === currentClient.id ||
        (a.clientEmail && a.clientEmail.toLowerCase() === currentClient.email.toLowerCase()) ||
        (a.clientPhone && a.clientPhone === currentClient.phone)
    );
  }, [appointments, currentClient]);

  // Next upcoming appointment
  const nextAppointment = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = myAppointments.filter(
      (a) => a.status === 'agendado' && a.date >= todayStr
    );
    upcoming.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.startTime.localeCompare(b.startTime);
    });
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [myAppointments]);

  // Completed history
  const completedAppointments = useMemo(() => {
    return myAppointments.filter((a) => a.status === 'concluido');
  }, [myAppointments]);

  // Total spent calculation
  const totalSpent = useMemo(() => {
    return completedAppointments.reduce((acc, a) => acc + (a.price || 0), 0);
  }, [completedAppointments]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    if (!profileName.trim()) {
      setProfileFeedback({ error: 'Nome não pode ser vazio.' });
      return;
    }
    setIsSavingProfile(true);
    try {
      const ok = await updateClientProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        photoURL: profilePhoto.trim() || undefined,
        birthDay: Number(profileBirthDay),
        birthMonth: Number(profileBirthMonth),
        birthDateFormatted: `${String(profileBirthDay).padStart(2, '0')}/${String(profileBirthMonth).padStart(2, '0')}`,
      });
      if (ok) {
        setProfileFeedback({ success: 'Perfil atualizado com sucesso!' });
      } else {
        setProfileFeedback({ error: 'Erro ao atualizar dados do perfil.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Keep profile form fields synced when currentClient changes
  useEffect(() => {
    if (currentClient) {
      setProfileName(currentClient.name || '');
      setProfilePhone(currentClient.phone ? maskPhone(currentClient.phone) : '');
      setProfilePhoto(currentClient.photoURL || '');
      setProfileBirthDay(currentClient.birthDay || 1);
      setProfileBirthMonth(currentClient.birthMonth || 1);
    }
  }, [currentClient]);

  // Clean up camera stream
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Attach camera stream to video element when stream is ready
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.warn);
    }
  }, [cameraStream, isCameraModalOpen, capturedImagePreview]);

  // Start device camera
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
      console.warn('Erro ao acessar câmera:', err);
      let msg = 'Não foi possível acessar a câmera do dispositivo.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Permissão de acesso à câmera negada. Habilite a permissão no seu navegador.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera detectada neste aparelho.';
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

  // Automatically save captured photo to client profile
  const handleApplyCapturedPhoto = async () => {
    if (!capturedImagePreview) return;
    setIsAutoSavingPhoto(true);
    const photoToSave = capturedImagePreview;
    setProfilePhoto(photoToSave);
    handleCloseCameraModal();

    try {
      const ok = await updateClientProfile({ photoURL: photoToSave });
      if (ok) {
        setProfileFeedback({ success: 'Foto tirada com a câmera e salva automaticamente no perfil! ✨' });
      } else {
        setProfileFeedback({ error: 'Erro ao salvar a foto capturada no perfil.' });
      }
    } catch (e) {
      console.error(e);
      setProfileFeedback({ error: 'Falha ao salvar foto da câmera no perfil.' });
    } finally {
      setIsAutoSavingPhoto(false);
    }
  };

  // Automatically save photo picked from gallery to client profile
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileFeedback({ error: 'Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).' });
      return;
    }

    setIsAutoSavingPhoto(true);
    setProfileFeedback(null);
    try {
      const compressedDataUrl = await compressAndResizeImage(file, 500, 0.85);
      setProfilePhoto(compressedDataUrl);
      const ok = await updateClientProfile({ photoURL: compressedDataUrl });
      if (ok) {
        setProfileFeedback({ success: 'Foto da galeria selecionada e salva automaticamente no seu perfil! ✨' });
      } else {
        setProfileFeedback({ error: 'Não foi possível salvar a foto no perfil.' });
      }
    } catch (err: any) {
      setProfileFeedback({ error: err.message || 'Falha ao processar imagem da galeria.' });
    } finally {
      setIsAutoSavingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove photo and update profile
  const handleRemovePhoto = async () => {
    setIsAutoSavingPhoto(true);
    setProfilePhoto('');
    try {
      const ok = await updateClientProfile({ photoURL: '' });
      if (ok) {
        setProfileFeedback({ success: 'Foto de perfil removida com sucesso!' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAutoSavingPhoto(false);
    }
  };

  // Handle Password Reset Request
  const handleRequestPasswordReset = async () => {
    if (!currentClient?.email) return;
    setProfileFeedback(null);
    const res = await sendPasswordReset(currentClient.email);
    if (res.success) {
      setProfileFeedback({ success: res.message });
    } else {
      setProfileFeedback({ error: res.error });
    }
  };

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    setIsCancelling(true);
    setCancelFeedback(null);
    try {
      const res = await cancelClientAppointment(appointmentToCancel.id, cancelReason);
      if (res.success) {
        setCancelFeedback({ success: 'Agendamento cancelado com sucesso.' });
        setTimeout(() => {
          setAppointmentToCancel(null);
          setCancelReason('');
          setCancelFeedback(null);
        }, 1200);
      } else {
        setCancelFeedback({ error: res.error || 'Falha ao cancelar agendamento.' });
      }
    } finally {
      setIsCancelling(false);
    }
  };

  // Completed appointments pending evaluation
  const unratedCompleted = useMemo(() => {
    return completedAppointments.filter((a) => !a.rating);
  }, [completedAppointments]);

  const handleOpenReviewModal = (app: Appointment) => {
    setSelectedAppointmentForReview(app);
    setRatingValue(app.rating || 5);
    setHoveredRating(0);
    setReviewComment(app.reviewComment || '');
    setReviewFeedback(null);
  };

  const handleCloseReviewModal = () => {
    setSelectedAppointmentForReview(null);
    setRatingValue(5);
    setHoveredRating(0);
    setReviewComment('');
    setReviewFeedback(null);
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return 'Péssimo';
      case 2:
        return 'Ruim';
      case 3:
        return 'Regular';
      case 4:
        return 'Muito Bom';
      case 5:
        return 'Excelente! ✨';
      default:
        return 'Selecione sua nota';
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentForReview) return;
    if (ratingValue < 1 || ratingValue > 5) {
      setReviewFeedback({ error: 'Por favor, selecione uma nota de 1 a 5 estrelas.' });
      return;
    }

    setIsSubmittingReview(true);
    setReviewFeedback(null);
    try {
      const res = await submitAppointmentReview(
        selectedAppointmentForReview.id,
        ratingValue,
        reviewComment
      );
      if (res.success) {
        setReviewFeedback({ success: 'Avaliação enviada com sucesso! Muito obrigado pelo seu feedback.' });
        setTimeout(() => {
          handleCloseReviewModal();
        }, 1200);
      } else {
        setReviewFeedback({ error: res.error || 'Erro ao registrar avaliação.' });
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Available services for selected business
  const availableServices = useMemo(() => {
    return services.filter((s) => s.businessId === selectedBizId && s.active);
  }, [services, selectedBizId]);

  // Selected service object
  const currentSelectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  // Available professionals qualified for selected service
  const availableProfessionals = useMemo(() => {
    if (!currentSelectedService) return [];
    return professionals.filter((p) => {
      if (p.businessId !== selectedBizId || !p.active) return false;
      if (
        currentSelectedService.allowedProfessionalIds &&
        currentSelectedService.allowedProfessionalIds.length > 0
      ) {
        return currentSelectedService.allowedProfessionalIds.includes(p.id);
      }
      return true;
    });
  }, [professionals, selectedBizId, currentSelectedService]);

  // Selected professional object
  const currentSelectedPro = useMemo(() => {
    return professionals.find((p) => p.id === selectedProfessionalId) || null;
  }, [professionals, selectedProfessionalId]);

  // Generate available time slots based on professional schedule and existing appointments
  const availableSlots = useMemo(() => {
    if (!currentSelectedPro || !currentSelectedService || !selectedDate) return [];

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    // Check if pro works on this day
    const proDays = currentSelectedPro.workHours?.daysOfWeek || [1, 2, 3, 4, 5, 6];
    if (!proDays.includes(dayOfWeek)) {
      return [];
    }

    const startMinutes = 9 * 60; // 09:00
    const endMinutes = 19 * 60;  // 19:00
    const duration = currentSelectedService.durationMinutes || 45;

    // Existing appointments for this professional on this date
    const proDayAppointments = appointments.filter(
      (a) =>
        a.professionalId === currentSelectedPro.id &&
        a.date === selectedDate &&
        a.status !== 'cancelado'
    );

    // Existing appointments for this client on this date
    const clientDayAppointments = myAppointments.filter(
      (a) => a.date === selectedDate && a.status !== 'cancelado'
    );

    const slots: string[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
      const slotStart = `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
      const endM = m + duration;
      const slotEnd = `${Math.floor(endM / 60).toString().padStart(2, '0')}:${(endM % 60).toString().padStart(2, '0')}`;

      // Check past time if today
      if (selectedDate === todayStr && m <= currentMinutesNow + 15) {
        continue;
      }

      // Check conflict with pro
      const proConflict = proDayAppointments.some((a) => {
        const [aStartH, aStartM] = a.startTime.split(':').map(Number);
        const [aEndH, aEndM] = a.endTime.split(':').map(Number);
        const aStart = aStartH * 60 + aStartM;
        const aEnd = aEndH * 60 + aEndM;
        return m < aEnd && endM > aStart;
      });

      if (proConflict) continue;

      // Check conflict with client
      const clientConflict = clientDayAppointments.some((a) => {
        const [aStartH, aStartM] = a.startTime.split(':').map(Number);
        const [aEndH, aEndM] = a.endTime.split(':').map(Number);
        const aStart = aStartH * 60 + aStartM;
        const aEnd = aEndH * 60 + aEndM;
        return m < aEnd && endM > aStart;
      });

      if (clientConflict) continue;

      slots.push(slotStart);
    }

    return slots;
  }, [currentSelectedPro, currentSelectedService, selectedDate, appointments, myAppointments]);

  // Handle Booking Submission
  const handleExecuteBooking = async () => {
    if (!currentSelectedService || !currentSelectedPro || !selectedTimeSlot) return;

    setIsBooking(true);
    setBookingError('');

    const [startH, startM] = selectedTimeSlot.split(':').map(Number);
    const totalMinutes = startH * 60 + startM + (currentSelectedService.durationMinutes || 45);
    const endTime = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;

    try {
      const res = await createClientAppointment({
        serviceId: currentSelectedService.id,
        professionalId: currentSelectedPro.id,
        businessId: selectedBizId,
        date: selectedDate,
        startTime: selectedTimeSlot,
        endTime,
        notes: bookingNotes.trim() || undefined,
      });

      if (res.success && res.appointment) {
        setBookingSuccess(res.appointment);
        setBookingStep(4);
      } else {
        setBookingError(res.error || 'Não foi possível confirmar o agendamento.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'agendado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" />
            <span>Agendado</span>
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Concluído</span>
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Cancelado</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white tracking-tight">Studio Digital</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Cliente
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Portal de Agendamentos e Gestão Pessoal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('novo');
                setBookingStep(1);
                setBookingSuccess(null);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </button>

            {/* Profile Avatar / Menu */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <img
                src={
                  currentClient?.photoURL ||
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                }
                alt={currentClient?.name || 'Cliente'}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
              />
              <div className="hidden md:block text-left">
                <span className="text-xs font-bold text-white block leading-tight">
                  {currentClient?.name?.split(' ')[0] || 'Cliente'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentClient?.email}
                </span>
              </div>
              <button
                onClick={logoutClient}
                title="Sair da conta"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto text-xs py-1.5 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'agendamentos'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Meus Agendamentos</span>
            {myAppointments.filter((a) => a.status === 'agendado').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-bold">
                {myAppointments.filter((a) => a.status === 'agendado').length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('novo');
              setBookingStep(1);
              setBookingSuccess(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'novo'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Agendamento</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historico'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('perfil')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'perfil'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Meu Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('notificacoes')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notificacoes'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificações</span>
            {notifications.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD                                         */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src={
                      currentClient?.photoURL ||
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                    }
                    alt={currentClient?.name || 'Cliente'}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md"
                  />
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Área Exclusiva do Cliente
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                      Olá, {currentClient?.name || 'Cliente'}!
                    </h1>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Bem-vindo(a) ao seu portal no Studio Digital. Gerencie seus agendamentos e reserve novos serviços.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('novo');
                      setBookingStep(1);
                      setBookingSuccess(null);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Fazer Novo Agendamento</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('agendamentos')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Ver Minha Agenda</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Próximos Agendamentos</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {myAppointments.filter((a) => a.status === 'agendado').length}
                </div>
                <span className="text-[11px] text-slate-500">Reservas ativas</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Atendimentos Concluídos</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {completedAppointments.length}
                </div>
                <span className="text-[11px] text-slate-500">Sessões realizadas</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Total Investido</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-400">
                  {formatCurrency(totalSpent)}
                </div>
                <span className="text-[11px] text-slate-500">Histórico de cuidados</span>
              </div>
            </div>

            {/* Pending Reviews Banner */}
            {unratedCompleted.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        Como foi sua experiência no Studio Digital?
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                        {unratedCompleted.length} {unratedCompleted.length === 1 ? 'pendente' : 'pendentes'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Ajude a reconhecer o trabalho de <strong className="text-white">{unratedCompleted[0].professionalName}</strong> avaliando seu atendimento concluído com estrelas e comentário.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenReviewModal(unratedCompleted[0])}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Avaliar Agora</span>
                </button>
              </div>
            )}

            {/* Next Appointment Spotlight */}
            {nextAppointment ? (
              <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <CalendarCheck className="w-4 h-4" />
                    <span>Seu Próximo Atendimento</span>
                  </div>
                  {getStatusBadge(nextAppointment.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Serviço</span>
                    <h3 className="text-lg font-bold text-white">{nextAppointment.serviceName}</h3>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {formatCurrency(nextAppointment.price)} · {nextAppointment.durationMinutes} min
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Profissional & Local</span>
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">
                        {nextAppointment.professionalName}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block">
                      {businesses.find((b) => b.id === nextAppointment.businessId)?.tradeName || 'Studio Digital'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Data e Horário</span>
                    <div className="text-base font-extrabold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>{nextAppointment.date}</span>
                      <span className="text-amber-400">às {nextAppointment.startTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedAppointmentForDetails(nextAppointment)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => setAppointmentToCancel(nextAppointment)}
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar Agendamento
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Você não tem agendamentos futuros</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Agende agora mesmo um horário com seus profissionais favoritos com confirmação imediata.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('novo');
                    setBookingStep(1);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Agendar Agora
                </button>
              </div>
            )}

            {/* Recent Appointments Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Histórico Recente
                </h2>
                <button
                  onClick={() => setActiveTab('agendamentos')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                >
                  <span>Ver todos ({myAppointments.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myAppointments.length === 0 ? (
                <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-center text-xs text-slate-500">
                  Nenhum agendamento registrado até o momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myAppointments.slice(0, 4).map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{app.serviceName}</span>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-xs text-slate-400">
                          {app.professionalName} · {app.date} às {app.startTime}
                        </p>
                        {app.rating && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{app.rating}.0</span>
                            {app.reviewComment && (
                              <span className="text-slate-400 font-normal italic truncate max-w-[160px]">
                                — "{app.reviewComment}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {formatCurrency(app.price)}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          {app.status === 'concluido' && (
                            app.rating ? (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-0.5"
                                title="Ver avaliação"
                              >
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{app.rating}.0</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1"
                              >
                                <Star className="w-3 h-3 fill-current" />
                                <span>Avaliar</span>
                              </button>
                            )
                          )}
                          <button
                            onClick={() => setSelectedAppointmentForDetails(app)}
                            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MEUS AGENDAMENTOS                                 */}
        {/* ========================================================= */}
        {activeTab === 'agendamentos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-white">Meus Agendamentos</h1>
                <p className="text-xs text-slate-400">
                  Acompanhe suas reservas futuras, passadas e canceladas.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                {(['all', 'agendado', 'concluido', 'cancelado'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === s
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s === 'all'
                      ? 'Todos'
                      : s === 'agendado'
                      ? 'Agendados'
                      : s === 'concluido'
                      ? 'Concluídos'
                      : 'Cancelados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtered Appointments List */}
            {(() => {
              const list = myAppointments.filter(
                (a) => statusFilter === 'all' || a.status === statusFilter
              );

              if (list.length === 0) {
                return (
                  <div className="p-12 bg-slate-900/50 rounded-3xl border border-slate-800 text-center space-y-3">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">Nenhum agendamento encontrado</h3>
                    <p className="text-xs text-slate-400">
                      Não há agendamentos cadastrados com o filtro selecionado ({statusFilter}).
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {list.map((app) => (
                    <div
                      key={app.id}
                      className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {app.date.split('-')[1]}
                          </span>
                          <span className="text-base font-extrabold text-white leading-none">
                            {app.date.split('-')[2]}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{app.serviceName}</h3>
                            {getStatusBadge(app.status)}
                          </div>
                          <p className="text-xs text-slate-300">
                            Profissional: <strong className="text-white">{app.professionalName}</strong> · Horário: <strong className="text-white">{app.startTime} às {app.endTime}</strong>
                          </p>
                          <span className="text-[11px] text-slate-400 block">
                            Local: {businesses.find((b) => b.id === app.businessId)?.tradeName || 'Studio Digital'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <div className="text-left md:text-right">
                          <span className="text-sm font-mono font-extrabold text-emerald-400 block">
                            {formatCurrency(app.price)}
                          </span>
                          <span className="text-[10px] text-slate-500">{app.durationMinutes} minutos</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {app.status === 'concluido' && (
                            app.rating ? (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Ver ou editar avaliação"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{app.rating}.0</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenReviewModal(app)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Avaliar</span>
                              </button>
                            )
                          )}

                          <button
                            onClick={() => setSelectedAppointmentForDetails(app)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                          >
                            Detalhes
                          </button>

                          {app.status === 'agendado' && (
                            <button
                              onClick={() => setAppointmentToCancel(app)}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: NOVO AGENDAMENTO (4-STEP WIZARD)                   */}
        {/* ========================================================= */}
        {activeTab === 'novo' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                Reserva Online Rápida
              </span>
              <h1 className="text-2xl font-extrabold text-white">Agendar Novo Atendimento</h1>
              <p className="text-xs text-slate-400">
                Selecione o serviço, profissional, data e horário ideal para você.
              </p>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, label: '1. Estabelecimento & Serviço' },
                { step: 2, label: '2. Profissional' },
                { step: 3, label: '3. Data & Horário' },
                { step: 4, label: '4. Confirmação' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`py-2 px-1 rounded-xl border font-bold transition-all ${
                    bookingStep === s.step
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : bookingStep > s.step
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <span className="text-[11px] block">{s.label}</span>
                </div>
              ))}
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* STEP 1: CHOOSE BUSINESS & SERVICE WITH AUTOCOMPLETE AND LOCATION */}
            {bookingStep === 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>Localizar & Selecionar Serviço</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Pesquise serviços com busca inteligente por nome, categoria ou localize estabelecimentos e unidades mais próximos de você.
                  </p>
                </div>

                <ServiceSearchAutocomplete
                  services={services}
                  businesses={businesses}
                  selectedServiceId={selectedServiceId}
                  selectedBusinessId={selectedBizId}
                  onSelectService={(srv, biz) => {
                    setSelectedServiceId(srv.id);
                    if (biz && biz.id !== selectedBizId) {
                      setSelectedBizId(biz.id);
                      setSelectedProfessionalId(''); // Reseta profissional ao mudar de unidade
                    }
                    setBookingError('');
                  }}
                  onSelectBusiness={(bizId) => {
                    setSelectedBizId(bizId);
                    setSelectedProfessionalId('');
                  }}
                  clientLocation={currentClient}
                  theme="dark"
                  allowCrossBusinessSearch={true}
                  showCategoryFilter={true}
                  showLocationFilter={true}
                  showServiceCardsGrid={true}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    {selectedServiceId ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        Serviço selecionado. Pronto para escolher o profissional habilitado.
                      </span>
                    ) : (
                      <span>Selecione um serviço desejado para avançar</span>
                    )}
                  </div>

                  <button
                    disabled={!selectedServiceId}
                    onClick={() => {
                      setBookingStep(2);
                      setBookingError('');
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <span>Avançar para Profissional</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CHOOSE QUALIFIED PROFESSIONAL */}
            {bookingStep === 2 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Profissionais habilitados para{' '}
                      <strong className="text-white">{currentSelectedService?.name}</strong>:
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {formatCurrency(currentSelectedService?.price || 0)}
                    </span>
                  </div>

                  {availableProfessionals.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                      Nenhum profissional cadastrado para este serviço.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableProfessionals.map((pro) => {
                        const isSelected = selectedProfessionalId === pro.id;
                        return (
                          <div
                            key={pro.id}
                            onClick={() => setSelectedProfessionalId(pro.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <img
                              src={
                                pro.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face'
                              }
                              alt={pro.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                            />
                            <div className="flex-1 space-y-0.5">
                              <h3 className="text-sm font-bold text-white">{pro.name}</h3>
                              <span className="text-[11px] text-slate-400 block">
                                {pro.specialties?.join(', ') || 'Especialista'}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 font-bold" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setBookingStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    disabled={!selectedProfessionalId}
                    onClick={() => {
                      setBookingStep(3);
                      setBookingError('');
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Escolher Data e Horário</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CHOOSE DATE & AVAILABLE SLOT */}
            {bookingStep === 3 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Data do Atendimento:
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Observações / Preferências (Opcional):
                    </label>
                    <input
                      type="text"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Ex: prefiro corte na tesoura, etc."
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Horários Disponíveis em <strong className="text-white">{selectedDate}</strong>:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Duração: {currentSelectedService?.durationMinutes} min
                    </span>
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                      <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-bold text-white">Sem horários livres nesta data</p>
                      <p className="text-[11px] text-slate-500">
                        O profissional não atende neste dia ou todos os horários já estão preenchidos. Por favor, escolha outra data.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => {
                        const isSelected = selectedTimeSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTimeSlot(slot)}
                            className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Summary Box */}
                {selectedTimeSlot && currentSelectedService && currentSelectedPro && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-xs space-y-1.5">
                    <div className="font-bold text-emerald-300">Resumo da Reserva:</div>
                    <div className="text-slate-300">
                      • {currentSelectedService.name} com {currentSelectedPro.name}
                    </div>
                    <div className="text-slate-300">
                      • Dia {selectedDate} às {selectedTimeSlot} ({currentSelectedService.durationMinutes} min)
                    </div>
                    <div className="text-emerald-400 font-mono font-bold">
                      • Valor total: {formatCurrency(currentSelectedService.price)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setBookingStep(2)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    disabled={!selectedTimeSlot || isBooking}
                    onClick={handleExecuteBooking}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <span>{isBooking ? 'Confirmando...' : 'Confirmar Reserva'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {bookingStep === 4 && bookingSuccess && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Reserva Confirmada!
                  </span>
                  <h2 className="text-2xl font-extrabold text-white">
                    Seu agendamento foi realizado com sucesso
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Aguardamos você no horário marcado! Você pode consultar os detalhes ou cancelar a qualquer momento em sua conta.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-slate-400">Serviço:</span>
                    <span className="font-bold text-white">{bookingSuccess.serviceName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-slate-400">Profissional:</span>
                    <span className="font-bold text-white">{bookingSuccess.professionalName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-slate-400">Data e Horário:</span>
                    <span className="font-bold text-white">
                      {bookingSuccess.date} às {bookingSuccess.startTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(bookingSuccess.price)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('agendamentos')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    Ver Meus Agendamentos
                  </button>
                  <button
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedServiceId('');
                      setSelectedProfessionalId('');
                      setSelectedTimeSlot('');
                      setBookingSuccess(null);
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Fazer Outro Agendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: HISTÓRICO DE ATENDIMENTOS                         */}
        {/* ========================================================= */}
        {activeTab === 'historico' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-white">Histórico de Atendimentos</h1>
              <p className="text-xs text-slate-400">
                Consulte todos os serviços já realizados anteriormente no Studio Digital.
              </p>
            </div>

            {completedAppointments.length === 0 ? (
              <div className="p-12 bg-slate-900/50 rounded-3xl border border-slate-800 text-center space-y-3">
                <History className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Nenhum atendimento concluído ainda</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Assim que você concluir sua primeira sessão de atendimento, ela aparecerá registrada aqui com recibo e valor.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-white">{app.serviceName}</h3>
                        <p className="text-xs text-slate-400">
                          {app.professionalName} · {app.date}
                        </p>

                        {/* Rating Display if evaluated */}
                        {app.rating && (
                          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-400 font-semibold">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= (app.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span>{app.rating}.0</span>
                            {app.reviewComment && (
                              <span className="text-slate-400 font-normal italic truncate max-w-xs ml-1">
                                — "{app.reviewComment}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400 block">
                          {formatCurrency(app.price)}
                        </span>
                        <span className="text-[10px] text-emerald-500 font-medium">Concluído</span>
                      </div>

                      {/* Avaliar Atendimento Action */}
                      {app.rating ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(app)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Clique para ver ou editar sua avaliação"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>Ver Avaliação</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(app)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>Avaliar Atendimento</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedAppointmentForDetails(app)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                      >
                        Recibo / Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: MEU PERFIL                                        */}
        {/* ========================================================= */}
        {activeTab === 'perfil' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-white">Meu Perfil de Cliente</h1>
              <p className="text-xs text-slate-400">
                Gerencie suas informações cadastrais e dados de segurança.
              </p>
            </div>

            {profileFeedback?.error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{profileFeedback.error}</span>
              </div>
            )}

            {profileFeedback?.success && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{profileFeedback.success}</span>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              {/* Photo & Role Badge */}
              <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                <div className="relative group shrink-0">
                  <img
                    src={
                      profilePhoto ||
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                    }
                    alt={profileName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                  />
                  <div className="absolute inset-0 bg-slate-950/75 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Escolher da Galeria"
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCameraModal}
                      title="Tirar Foto com a Câmera"
                      className="p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{currentClient?.name}</h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                      Perfil: Cliente
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{currentClient?.email}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(maskPhone(e.target.value))}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Aniversário (Dia / Mês)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={profileBirthDay}
                        onChange={(e) => setProfileBirthDay(Number(e.target.value))}
                        className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Dia {d.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select
                        value={profileBirthMonth}
                        onChange={(e) => setProfileBirthMonth(Number(e.target.value))}
                        className="w-full px-2 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      >
                        {[
                          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                        ].map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* DIV 3 (Targeted focused element): Foto de Perfil com Galeria e Câmera */}
                <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Foto de Perfil</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                          Automático
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Escolha uma foto da galeria ou use a câmera para salvar automaticamente no perfil.
                      </p>
                    </div>

                    {isAutoSavingPhoto && (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                        Salvando foto...
                      </span>
                    )}
                  </div>

                  {/* Input invisível para galeria de fotos */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                    {/* Visualização da foto atual */}
                    <div className="relative group shrink-0">
                      <img
                        src={
                          profilePhoto ||
                          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
                        }
                        alt="Foto do Perfil"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/10"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>

                    {/* Botões de Ação: Galeria, Câmera e Opções */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Botão Escolher da Galeria */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isAutoSavingPhoto}
                          className="w-full px-3.5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500 text-emerald-300 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Escolher da Galeria</span>
                        </button>

                        {/* Botão Tirar Foto com Câmera */}
                        <button
                          type="button"
                          onClick={handleOpenCameraModal}
                          disabled={isAutoSavingPhoto}
                          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 active:from-teal-500/35 active:to-emerald-500/35 border border-teal-500/40 hover:border-teal-400 text-teal-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4 text-teal-400" />
                          <span>Tirar Foto (Câmera)</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{showUrlInput ? 'Ocultar link manual' : 'Inserir link / URL da foto'}</span>
                        </button>

                        {profilePhoto && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            disabled={isAutoSavingPhoto}
                            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover foto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Campo de link manual (se aberto) */}
                  {showUrlInput && (
                    <div className="pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">
                        URL Direta da Foto (Web)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={profilePhoto}
                          onChange={(e) => setProfilePhoto(e.target.value)}
                          placeholder="https://exemplo.com/sua-foto.jpg"
                          className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!profilePhoto.trim()) return;
                            setIsAutoSavingPhoto(true);
                            try {
                              const ok = await updateClientProfile({ photoURL: profilePhoto.trim() });
                              if (ok) {
                                setProfileFeedback({ success: 'Foto de perfil atualizada pelo link com sucesso!' });
                              }
                            } finally {
                              setIsAutoSavingPhoto(false);
                            }
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors shadow-sm"
                        >
                          Salvar Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleRequestPasswordReset}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    Redefinir Senha por E-mail
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: NOTIFICAÇÕES                                      */}
        {/* ========================================================= */}
        {activeTab === 'notificacoes' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-white">Notificações</h1>
              <p className="text-xs text-slate-400">
                Avisos importantes sobre confirmações e cancelamentos de agendamentos.
              </p>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 bg-slate-900/50 rounded-3xl border border-slate-800 text-center text-xs text-slate-500">
                Nenhuma notificação recente.
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: DETALHES DO AGENDAMENTO                            */}
      {/* ========================================================= */}
      {selectedAppointmentForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                Detalhes da Reserva
              </span>
              <button
                onClick={() => setSelectedAppointmentForDetails(null)}
                className="text-slate-400 hover:text-white cursor-pointer text-xs"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Serviço</span>
                <span className="text-base font-bold text-white block">
                  {selectedAppointmentForDetails.serviceName}
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatCurrency(selectedAppointmentForDetails.price)} · {selectedAppointmentForDetails.durationMinutes} min
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Profissional Responsável</span>
                <span className="text-sm font-semibold text-white block">
                  {selectedAppointmentForDetails.professionalName}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Data e Horário</span>
                <span className="text-sm font-semibold text-white block">
                  {selectedAppointmentForDetails.date} das {selectedAppointmentForDetails.startTime} às {selectedAppointmentForDetails.endTime}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">Status da Reserva</span>
                <div>{getStatusBadge(selectedAppointmentForDetails.status)}</div>
              </div>

              {/* Review section if appointment is completed */}
              {selectedAppointmentForDetails.status === 'concluido' && (
                <div className="p-3 bg-slate-950 rounded-xl space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                      Avaliação do Atendimento
                    </span>
                    {selectedAppointmentForDetails.rating ? (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {selectedAppointmentForDetails.rating}.0 de 5.0
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400/80">Pendente de avaliação</span>
                    )}
                  </div>

                  {selectedAppointmentForDetails.rating ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= (selectedAppointmentForDetails.rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      {selectedAppointmentForDetails.reviewComment && (
                        <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-900">
                          "{selectedAppointmentForDetails.reviewComment}"
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedAppointmentForDetails;
                          setSelectedAppointmentForDetails(null);
                          handleOpenReviewModal(target);
                        }}
                        className="text-[11px] text-amber-400 hover:underline pt-1 block cursor-pointer"
                      >
                        Editar minha avaliação
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedAppointmentForDetails;
                        setSelectedAppointmentForDetails(null);
                        handleOpenReviewModal(target);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Avaliar Profissional Agora</span>
                    </button>
                  )}
                </div>
              )}

              {selectedAppointmentForDetails.notes && (
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase">Observações</span>
                  <span className="text-slate-300 block">{selectedAppointmentForDetails.notes}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAppointmentForDetails(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CANCELAR AGENDAMENTO                                */}
      {/* ========================================================= */}
      {appointmentToCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Confirmar Cancelamento</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você tem certeza que deseja cancelar sua reserva de{' '}
                <strong className="text-white">{appointmentToCancel.serviceName}</strong> em{' '}
                <strong className="text-white">{appointmentToCancel.date}</strong> às{' '}
                <strong className="text-white">{appointmentToCancel.startTime}</strong>?
              </p>
            </div>

            {cancelFeedback?.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {cancelFeedback.error}
              </div>
            )}

            {cancelFeedback?.success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {cancelFeedback.success}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 block">
                Motivo do cancelamento (opcional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Imprevisto no trabalho, mudança de data..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setAppointmentToCancel(null);
                  setCancelReason('');
                  setCancelFeedback(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isCancelling ? 'Cancelando...' : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AVALIAÇÃO DO ATENDIMENTO COM ESTRELAS E COMENTÁRIO */}
      {/* ========================================================= */}
      {selectedAppointmentForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Avaliar Atendimento</h3>
                  <span className="text-[10px] text-slate-400 block">Sua opinião é fundamental para nós</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseReviewModal}
                className="text-slate-400 hover:text-white cursor-pointer text-xs p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Informações do Profissional e Atendimento */}
            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center gap-3">
              {(() => {
                const pro = professionals.find((p) => p.id === selectedAppointmentForReview.professionalId);
                const avatar = pro?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face';
                return (
                  <img
                    src={avatar}
                    alt={selectedAppointmentForReview.professionalName || 'Profissional'}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                );
              })()}
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                  {selectedAppointmentForReview.serviceName}
                </span>
                <h4 className="text-sm font-bold text-white truncate">
                  {selectedAppointmentForReview.professionalName}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {selectedAppointmentForReview.date} · {selectedAppointmentForReview.startTime} às {selectedAppointmentForReview.endTime}
                </p>
              </div>
            </div>

            {/* Feedback messages */}
            {reviewFeedback?.error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{reviewFeedback.error}</span>
              </div>
            )}

            {reviewFeedback?.success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{reviewFeedback.success}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating Section */}
              <div className="space-y-2 text-center py-2 bg-slate-950/50 rounded-2xl border border-slate-800/60 p-4">
                <label className="text-xs font-semibold text-slate-300 block">
                  Como foi sua experiência com o profissional?
                </label>

                {/* 5 Interactive Stars */}
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeScore = hoveredRating || ratingValue;
                    const isFilled = star <= activeScore;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingValue(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                        title={`${star} estrela${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-8 h-8 transition-all ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'text-slate-700 hover:text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Label */}
                <div className="h-5 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400 animate-in fade-in font-mono">
                    {getRatingLabel(hoveredRating || ratingValue)}
                  </span>
                </div>
              </div>

              {/* Optional Comment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Comentário (opcional):
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {reviewComment.length}/300
                  </span>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value.slice(0, 300))}
                  placeholder="Conte o que achou do atendimento, resultado, pontualidade ou deixe um elogio..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={handleCloseReviewModal}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingReview || ratingValue === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isSubmittingReview
                      ? 'Salvando...'
                      : selectedAppointmentForReview.rating
                      ? 'Atualizar Avaliação'
                      : 'Enviar Avaliação'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    Posicione o rosto no círculo e capture sua foto
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
            <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-emerald-500/40 shadow-inner flex items-center justify-center">
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
                    <div className="w-48 h-48 rounded-full border-2 border-dashed border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.25)]" />
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
                    disabled={isAutoSavingPhoto}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isAutoSavingPhoto ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>Salvar no Perfil</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    {/* Toggle camera orientation if supported */}
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
                    Aponte a câmera e clique no botão verde para tirar a foto.
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
