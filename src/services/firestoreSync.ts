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
  VirtualQueueItem,
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
 * Remove um Agendamento do Firestore.
 */
export async function deleteAppointmentFromFirestore(appId: string): Promise<boolean> {
  const docPath = `appointments/${appId}`;
  try {
    await deleteDoc(doc(db, 'appointments', appId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover agendamento do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
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
 * Remove um Cliente do Firestore.
 */
export async function deleteClientFromFirestore(clientId: string): Promise<boolean> {
  const docPath = `clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'clients', clientId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover cliente do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
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
 * Remove uma Comanda do Firestore.
 */
export async function deleteComandaFromFirestore(cmdId: string): Promise<boolean> {
  const docPath = `comandas/${cmdId}`;
  try {
    await deleteDoc(doc(db, 'comandas', cmdId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover comanda do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
    return false;
  }
}

/**
 * Exclui um estabelecimento (Tenant) e seus dados correlatos do Firestore.
 */
export async function deleteBusinessFromFirestore(businessId: string): Promise<boolean> {
  const docPath = `businesses/${businessId}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId));

    // Remove sub-recursos pertencentes a este businessId
    const collectionsToClean = ['professionals', 'services', 'appointments', 'clients', 'comandas', 'reviews', 'virtualQueue'];
    for (const colName of collectionsToClean) {
      try {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (data.businessId === businessId || data.tenant_id === businessId) {
            await deleteDoc(doc(db, colName, docSnap.id)).catch(console.warn);
          }
        }
      } catch (colErr) {
        console.warn(`Erro ao limpar ${colName} do business ${businessId}:`, colErr);
      }
    }
    return true;
  } catch (err) {
    console.warn('Erro ao excluir business do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
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

/**
 * Salva ou atualiza um Item da Fila Virtual no Firestore.
 */
export async function syncQueueItemToFirestore(item: VirtualQueueItem): Promise<boolean> {
  const docPath = `virtualQueue/${item.id}`;
  try {
    const cleanDoc: Record<string, any> = { ...item };
    Object.keys(cleanDoc).forEach((key) => {
      if (cleanDoc[key] === undefined) {
        delete cleanDoc[key];
      }
    });
    if (!cleanDoc.tenant_id && cleanDoc.businessId) {
      cleanDoc.tenant_id = cleanDoc.businessId;
    }
    await setDoc(doc(db, 'virtualQueue', item.id), cleanDoc, { merge: true });
    return true;
  } catch (err) {
    console.warn('Erro ao salvar item da fila virtual no Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return false;
  }
}

/**
 * Remove um Item da Fila Virtual do Firestore.
 */
export async function deleteQueueItemFromFirestore(itemId: string): Promise<boolean> {
  const docPath = `virtualQueue/${itemId}`;
  try {
    await deleteDoc(doc(db, 'virtualQueue', itemId));
    return true;
  } catch (err) {
    console.warn('Erro ao remover item da fila virtual do Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, docPath);
    return false;
  }
}

/**
 * Remove todos os dados de mock / demonstração legados do Firestore.
 * Garante que a base permaneça limpa e sem dados simulados.
 */
export async function purgeAllMockDataFromFirestore(): Promise<{
  deletedClients: number;
  deletedAppointments: number;
  deletedComandas: number;
  deletedBusinesses: number;
  deletedServices: number;
  deletedProfessionals: number;
}> {
  const result = {
    deletedClients: 0,
    deletedAppointments: 0,
    deletedComandas: 0,
    deletedBusinesses: 0,
    deletedServices: 0,
    deletedProfessionals: 0,
  };

  // Nomes de clientes mock conhecidos de seeds anteriores
  const mockClientNames = [
    'camila rodrigues',
    'lucas mendes',
    'mariana souza',
    'rafael costa',
    'amanda silveira',
    'juliana paiva',
    'rodrigo medeiros',
    'demo',
    'teste mock',
  ];

  // 1. Clientes
  try {
    const clientsSnap = await getDocs(collection(db, 'clients'));
    for (const d of clientsSnap.docs) {
      const data = d.data();
      const docId = d.id.toLowerCase();
      const name = (data.name || '').toLowerCase();
      const isMock =
        docId.startsWith('cli_biz_') ||
        docId.includes('demo') ||
        docId.includes('mock') ||
        mockClientNames.some((m) => name.includes(m));

      if (isMock) {
        await deleteDoc(doc(db, 'clients', d.id)).catch(console.warn);
        result.deletedClients++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar clientes mock:', err);
  }

  // 2. Agendamentos
  try {
    const appSnap = await getDocs(collection(db, 'appointments'));
    for (const d of appSnap.docs) {
      const data = d.data();
      const docId = d.id.toLowerCase();
      const clientName = (data.clientName || '').toLowerCase();
      const isMock =
        docId.startsWith('app_') && (
          docId.includes('demo') ||
          docId.includes('mock') ||
          data.businessId === 'biz_clinica_lumina' ||
          data.businessId === 'biz_barbearia_navalha' ||
          mockClientNames.some((m) => clientName.includes(m))
        );

      if (isMock) {
        await deleteDoc(doc(db, 'appointments', d.id)).catch(console.warn);
        result.deletedAppointments++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar agendamentos mock:', err);
  }

  // 3. Comandas
  try {
    const cmdSnap = await getDocs(collection(db, 'comandas'));
    for (const d of cmdSnap.docs) {
      const data = d.data();
      const docId = d.id.toLowerCase();
      const clientName = (data.clientName || '').toLowerCase();
      const isMock =
        docId.includes('demo') ||
        docId.includes('mock') ||
        data.businessId === 'biz_clinica_lumina' ||
        mockClientNames.some((m) => clientName.includes(m));

      if (isMock) {
        await deleteDoc(doc(db, 'comandas', d.id)).catch(console.warn);
        result.deletedComandas++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar comandas mock:', err);
  }

  // 4. Estabelecimentos Mock Legados
  try {
    const bizSnap = await getDocs(collection(db, 'businesses'));
    const mockBizIds = ['biz_clinica_lumina', 'biz_barbearia_navalha', 'biz_studio_glamour', 'biz_demo'];
    for (const d of bizSnap.docs) {
      const docId = d.id.toLowerCase();
      const name = (d.data().name || '').toLowerCase();
      if (mockBizIds.includes(docId) || docId.includes('demo') || docId.includes('mock') || name.includes('lumina')) {
        await deleteDoc(doc(db, 'businesses', d.id)).catch(console.warn);
        result.deletedBusinesses++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar estabelecimentos mock:', err);
  }

  // 5. Profissionais Mock Legados
  try {
    const proSnap = await getDocs(collection(db, 'professionals'));
    const mockProIds = ['pro_dra_patricia', 'pro_amanda', 'pro_marcos', 'pro_demo_1', 'pro_demo_2', 'pro_demo_3', 'pro_demo_4'];
    for (const d of proSnap.docs) {
      const docId = d.id.toLowerCase();
      if (mockProIds.includes(docId) || docId.includes('demo_') || d.data().businessId === 'biz_clinica_lumina') {
        await deleteDoc(doc(db, 'professionals', d.id)).catch(console.warn);
        result.deletedProfessionals++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar profissionais mock:', err);
  }

  // 6. Serviços Mock Legados
  try {
    const srvSnap = await getDocs(collection(db, 'services'));
    for (const d of srvSnap.docs) {
      const docId = d.id.toLowerCase();
      if (docId.includes('demo') || d.data().businessId === 'biz_clinica_lumina') {
        await deleteDoc(doc(db, 'services', d.id)).catch(console.warn);
        result.deletedServices++;
      }
    }
  } catch (err) {
    console.warn('Erro ao purgar serviços mock:', err);
  }

  return result;
}

/**
 * Zera todos os dados operacionais (clientes, agendamentos, comandas e serviços) de um tenant específico.
 */
export async function resetTenantDataToZero(businessId: string): Promise<void> {
  const collections = ['appointments', 'comandas', 'clients', 'reviews', 'virtualQueue'];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      for (const d of snap.docs) {
        const data = d.data();
        if (data.businessId === businessId || data.tenant_id === businessId) {
          await deleteDoc(doc(db, col, d.id)).catch(console.warn);
        }
      }
    } catch (e) {
      console.warn(`Erro ao zerar ${col} do tenant ${businessId}:`, e);
    }
  }
}
