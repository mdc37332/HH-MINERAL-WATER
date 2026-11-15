import firebaseConfig from '../../../firebase-applet-config.json';
import { getAdminFirestore } from '../../lib/firebase-admin.ts';
import type {
  AiAgentMessageRecord,
  AiApprovalRecord,
  AiTaskRecord,
  FirestoreBridgeStatus,
} from './types.ts';
import type { Order, Product } from '../../types.ts';

let cachedAdminReachable: boolean | null = null;
let lastProbeAt = 0;
let lastSyncAt: string | null = null;
let lastProbeError: string | null = null;

function sanitizeForAdminFirestore<T>(val: T): T {
  if (val === undefined || val === null) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(val, (_k, v) => (v === undefined ? null : v))
  );
}

/**
 * Checks if server-side Firebase Admin SDK has IAM permissions to read/write Firestore.
 * Falls back cleanly to CLIENT_REALTIME_SYNC when ADC lacks GCP IAM credentials,
 * allowing authenticated Admin sessions in the browser to sync AI collections to Firestore.
 */
async function canUseAdminFirestore(): Promise<boolean> {
  const now = Date.now();
  // Re-probe at most once every 5 minutes if previously unreachable
  if (cachedAdminReachable === false && now - lastProbeAt < 5 * 60 * 1000) {
    return false;
  }
  if (cachedAdminReachable === true && now - lastProbeAt < 5 * 60 * 1000) {
    return true;
  }

  lastProbeAt = now;
  const fs = getAdminFirestore();
  if (!fs) {
    cachedAdminReachable = false;
    lastProbeError = 'Admin Firestore instance unavailable';
    return false;
  }

  try {
    await fs.collection('products').limit(1).get();
    cachedAdminReachable = true;
    lastProbeError = null;
    return true;
  } catch (err: any) {
    cachedAdminReachable = false;
    lastProbeError = err?.message || String(err);
    return false;
  }
}

export async function getFirestoreBridgeHealth(): Promise<FirestoreBridgeStatus> {
  const reachable = await canUseAdminFirestore();
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (reachable) {
    return {
      projectId: firebaseConfig.projectId,
      databaseId,
      mode: 'ADMIN_SDK_CONNECTED',
      status: 'CONNECTED',
      detail: `Server Admin SDK + Client SDK both connected to Firestore database "${databaseId}".`,
      lastSyncAt,
    };
  }
  return {
    projectId: firebaseConfig.projectId,
    databaseId,
    mode: 'CLIENT_REALTIME_SYNC',
    status: 'SYNC_READY',
    detail: `Cloud SQL primary + Authenticated Admin Client Firestore sync active for "${databaseId}" (${lastProbeError ? 'Server ADC IAM unconfigured' : 'Client bridge mode'}).`,
    lastSyncAt,
  };
}

export async function mirrorTaskToFirestore(task: AiTaskRecord): Promise<boolean> {
  try {
    if (!(await canUseAdminFirestore())) return false;
    const fs = getAdminFirestore();
    if (!fs) return false;
    const docData = sanitizeForAdminFirestore({
      id: task.id,
      agentId: task.agentId,
      agentName: task.agentName,
      eventSource: task.eventSource.slice(0, 200),
      taskDescription: task.taskDescription.slice(0, 500),
      authorizationLevel: task.authorizationLevel,
      status: task.status,
      verificationStatus: task.verificationStatus,
      tokensUsed: task.tokensUsed || 0,
      startedAt: task.startedAt,
      completedAt: task.completedAt || null,
      createdAt: task.createdAt,
    });
    await fs.collection('ai_tasks').doc(task.id).set(docData, { merge: true });
    lastSyncAt = new Date().toISOString();
    return true;
  } catch {
    return false;
  }
}

export async function mirrorCrossAgentMessageToFirestore(
  msg: AiAgentMessageRecord
): Promise<boolean> {
  try {
    if (!(await canUseAdminFirestore())) return false;
    const fs = getAdminFirestore();
    if (!fs) return false;
    const docData = sanitizeForAdminFirestore({
      id: msg.id,
      correlationId: msg.correlationId,
      taskId: msg.taskId || null,
      fromAgentId: msg.fromAgentId,
      fromAgentName: msg.fromAgentName,
      toAgentId: msg.toAgentId,
      toAgentName: msg.toAgentName,
      intent: msg.intent,
      subject: msg.subject.slice(0, 300),
      payload: msg.payload || {},
      status: msg.status,
      priority: msg.priority,
      createdAt: msg.createdAt,
    });
    await fs.collection('ai_agent_messages').doc(msg.id).set(docData, { merge: true });
    lastSyncAt = new Date().toISOString();
    return true;
  } catch {
    return false;
  }
}

export async function mirrorApprovalToFirestore(
  approval: AiApprovalRecord
): Promise<boolean> {
  try {
    if (!(await canUseAdminFirestore())) return false;
    const fs = getAdminFirestore();
    if (!fs) return false;
    const docData = sanitizeForAdminFirestore({
      id: approval.id,
      taskId: approval.taskId || null,
      agentId: approval.agentId,
      agentName: approval.agentName,
      actionType: approval.actionType,
      title: approval.title.slice(0, 200),
      reason: approval.reason.slice(0, 800),
      expectedImpact: approval.expectedImpact.slice(0, 800),
      status: approval.status,
      ownerEmail: approval.ownerEmail || null,
      decidedAt: approval.decidedAt || null,
      executedAt: approval.executedAt || null,
      createdAt: approval.createdAt,
    });
    await fs.collection('ai_approvals').doc(approval.id).set(docData, { merge: true });
    lastSyncAt = new Date().toISOString();
    return true;
  } catch {
    return false;
  }
}

export async function syncOrderToFirestoreFromServer(
  orderId: string,
  patch: Partial<Pick<Order, 'status' | 'statusHistory' | 'paymentStatus' | 'invoiceNumber' | 'invoiceId'>>
): Promise<boolean> {
  try {
    if (!(await canUseAdminFirestore())) return false;
    const fs = getAdminFirestore();
    if (!fs) return false;
    await fs.collection('orders').doc(orderId).set(sanitizeForAdminFirestore(patch), { merge: true });
    lastSyncAt = new Date().toISOString();
    return true;
  } catch {
    return false;
  }
}

export async function syncProductStockToFirestoreFromServer(
  product: Pick<Product, 'id' | 'stockCount' | 'stockStatus' | 'inStock' | 'price' | 'discountPercent' | 'isVisible'>
): Promise<boolean> {
  try {
    if (!(await canUseAdminFirestore())) return false;
    const fs = getAdminFirestore();
    if (!fs) return false;
    await fs
      .collection('products')
      .doc(product.id)
      .set(
        sanitizeForAdminFirestore({
          stockCount: product.stockCount,
          stockStatus: product.stockStatus,
          inStock: product.inStock,
          ...(product.isVisible !== undefined ? { isVisible: product.isVisible } : {}),
          price: product.price,
          discountPercent: product.discountPercent,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    lastSyncAt = new Date().toISOString();
    return true;
  } catch {
    return false;
  }
}
