import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { db, auth } from '../firebase';
import {
  Business,
  Professional,
  Service,
  Appointment,
  Client,
  Comanda,
  SaaSPlan,
  Review,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Salva ou atualiza um Tenant (Estabelecimento) diretamente no Firestore.
 */
export async function syncBusinessToFirestore(business: Business): Promise<boolean> {
  const docPath = `businesses/${business.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...business };
    // Remove undefined values to avoid Firestore serialization errors
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    // Ensure tenant_id is set
    if (!cleanDoc.tenant_id) {
      cleanDoc.tenant_id = cleanDoc.id;
    }
    await setDoc(doc(db, 'businesses', business.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar business no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Salva ou atualiza um Profissional no Firestore.
 */
export async function syncProfessionalToFirestore(pro: Professional): Promise<boolean> {
  const docPath = `professionals/${pro.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...pro };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'professionals', pro.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar profissional no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Remove um Profissional do Firestore.
 */
export async function deleteProfessionalFromFirestore(proId: string): Promise<boolean> {
  const docPath = `professionals/${proId}`;
  try {
    await deleteDoc(doc(db, 'professionals', proId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover profissional do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
    return false;
  }
}

/**
 * Salva ou atualiza um Serviço no catálogo do Firestore.
 */
export async function syncServiceToFirestore(srv: Service): Promise<boolean> {
  const docPath = `services/${srv.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...srv };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'services', srv.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar serviço no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Remove um Serviço do Firestore.
 */
export async function deleteServiceFromFirestore(srvId: string): Promise<boolean> {
  const docPath = `services/${srvId}`;
  try {
    await deleteDoc(doc(db, 'services', srvId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover serviço do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
    return false;
  }
}

/**
 * Salva ou atualiza um Agendamento no Firestore.
 */
export async function syncAppointmentToFirestore(app: Appointment): Promise<boolean> {
  const docPath = `appointments/${app.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...app };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'appointments', app.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar agendamento no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Salva ou atualiza um Cliente no Firestore CRM.
 */
export async function syncClientToFirestore(client: Client): Promise<boolean> {
  const docPath = `clients/${client.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...client };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'clients', client.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar cliente no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Salva ou atualiza uma Comanda no Firestore POS.
 */
export async function syncComandaToFirestore(cmd: Comanda): Promise<boolean> {
  const docPath = `comandas/${cmd.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...cmd };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'comandas', cmd.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar comanda no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Salva ou atualiza um Plano SaaS no Firestore.
 */
export async function syncPlanToFirestore(plan: SaaSPlan): Promise<boolean> {
  const docPath = `saasPlans/${plan.id}`;
  try {
    await setDoc(doc(db, 'saasPlans', plan.id), plan, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar plano no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Cria a conta de autenticação do usuário no Firebase Authentication.
 */
export async function createTenantUserInFirebaseAuth(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: any; error?: string; isExisting?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    return { success: true, user: cred.user };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        return { success: true, user: cred.user, isExisting: true };
      } catch (signInErr: any) {
        return { success: true, isExisting: true };
      }
    }
    console.warn('Firebase Auth user creation warning:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Cria ou registra um novo Cliente no Firebase Authentication.
 */
export async function createClientUserInFirebaseAuth(
  email: string,
  pass: string,
  displayName?: string,
  photoURL?: string
): Promise<{ success: boolean; user?: any; error?: string; isExisting?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    if (displayName || photoURL) {
      try {
        await updateProfile(cred.user, {
          displayName: displayName || undefined,
          photoURL: photoURL || undefined,
        });
      } catch (profileErr) {
        console.warn('Erro ao atualizar perfil do cliente no Firebase Auth:', profileErr);
      }
    }
    return { success: true, user: cred.user };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Este e-mail já está cadastrado na plataforma.', isExisting: true };
    }
    return { success: false, error: err?.message || 'Erro ao registrar usuário no Firebase Auth.' };
  }
}

/**
 * Inicializa e sincroniza os planos do SaaS no Firestore se ainda não existirem.
 */
export async function seedPlansToFirestore(plans: SaaSPlan[]): Promise<void> {
  try {
    const existing = await getDocs(collection(db, 'saasPlans'));
    if (!existing.empty) {
      return;
    }
    for (const plan of plans) {
      await syncPlanToFirestore(plan);
    }
  } catch (err) {
    console.warn('Erro ao semear planos no Firestore:', err);
  }
}

/**
 * Salva ou atualiza uma Avaliação de Atendimento (Review) no Firestore.
 */
export async function syncReviewToFirestore(review: Review): Promise<boolean> {
  const docPath = `reviews/${review.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...review };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'reviews', review.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar avaliação no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}
