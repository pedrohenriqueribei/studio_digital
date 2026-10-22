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
} from '../types';

/**
 * Salva ou atualiza um Tenant (Estabelecimento) diretamente no Firestore.
 */
export async function syncBusinessToFirestore(business: Business): Promise<boolean> {
  try {
    const cleanDoc = { ...business };
    // Remove undefined values to avoid Firestore serialization errors
    Object.keys(cleanDoc).forEach((key) => {
      if ((cleanDoc as Record<string, any>)[key] === undefined) {
        delete (cleanDoc as Record<string, any>)[key];
      }
    });
    await setDoc(doc(db, 'businesses', business.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar business no Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um Profissional no Firestore.
 */
export async function syncProfessionalToFirestore(pro: Professional): Promise<boolean> {
  try {
    const cleanDoc = { ...pro };
    Object.keys(cleanDoc).forEach((key) => {
      if ((cleanDoc as Record<string, any>)[key] === undefined) {
        delete (cleanDoc as Record<string, any>)[key];
      }
    });
    await setDoc(doc(db, 'professionals', pro.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar profissional no Firestore:', err);
    return false;
  }
}

/**
 * Remove um Profissional do Firestore.
 */
export async function deleteProfessionalFromFirestore(proId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'professionals', proId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover profissional do Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um Serviço no catálogo do Firestore.
 */
export async function syncServiceToFirestore(srv: Service): Promise<boolean> {
  try {
    const cleanDoc = { ...srv };
    Object.keys(cleanDoc).forEach((key) => {
      if ((cleanDoc as Record<string, any>)[key] === undefined) {
        delete (cleanDoc as Record<string, any>)[key];
      }
    });
    await setDoc(doc(db, 'services', srv.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar serviço no Firestore:', err);
    return false;
  }
}

/**
 * Remove um Serviço do Firestore.
 */
export async function deleteServiceFromFirestore(srvId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'services', srvId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover serviço do Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um Agendamento no Firestore.
 */
export async function syncAppointmentToFirestore(app: Appointment): Promise<boolean> {
  try {
    const cleanDoc = { ...app };
    Object.keys(cleanDoc).forEach((key) => {
      if ((cleanDoc as Record<string, any>)[key] === undefined) {
        delete (cleanDoc as Record<string, any>)[key];
      }
    });
    await setDoc(doc(db, 'appointments', app.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar agendamento no Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um Cliente no Firestore CRM.
 */
export async function syncClientToFirestore(client: Client): Promise<boolean> {
  try {
    const cleanDoc = { ...client };
    Object.keys(cleanDoc).forEach((key) => {
      if ((cleanDoc as Record<string, any>)[key] === undefined) {
        delete (cleanDoc as Record<string, any>)[key];
      }
    });
    await setDoc(doc(db, 'clients', client.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar cliente no Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza uma Comanda no Firestore POS.
 */
export async function syncComandaToFirestore(cmd: Comanda): Promise<boolean> {
  try {
    const cleanDoc = { ...cmd };
    Object.keys(cleanDoc).forEach((key) => {
      if ((cleanDoc as Record<string, any>)[key] === undefined) {
        delete (cleanDoc as Record<string, any>)[key];
      }
    });
    await setDoc(doc(db, 'comandas', cmd.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar comanda no Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um Plano SaaS no Firestore.
 */
export async function syncPlanToFirestore(plan: SaaSPlan): Promise<boolean> {
  try {
    await setDoc(doc(db, 'saasPlans', plan.id), plan, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar plano no Firestore:', err);
    return false;
  }
}

/**
 * Cria a conta de autenticação do usuário no Firebase Authentication.
 */
export async function createTenantUserInFirebaseAuth(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; isExisting?: boolean }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      return { success: true, isExisting: true };
    }
    console.warn('Firebase Auth user creation warning:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Inicializa e sincroniza os planos do SaaS no Firestore se ainda não existirem.
 */
export async function seedPlansToFirestore(plans: SaaSPlan[]): Promise<void> {
  try {
    for (const plan of plans) {
      await syncPlanToFirestore(plan);
    }
  } catch (err) {
    console.warn('Erro ao semear planos no Firestore:', err);
  }
}
