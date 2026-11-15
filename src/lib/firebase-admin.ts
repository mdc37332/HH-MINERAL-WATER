import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let adminAppInstance: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminFirestoreInstance: Firestore | null = null;

export function getAdminApp(): App | null {
  try {
    if (!adminAppInstance) {
      if (!getApps().length) {
        adminAppInstance = initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } else {
        adminAppInstance = getApps()[0];
      }
    }
    return adminAppInstance;
  } catch (err) {
    console.warn('Firebase Admin App initialization skipped or unavailable:', err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    if (!adminAuthInstance) {
      const app = getAdminApp();
      if (!app) return null;
      adminAuthInstance = getAuth(app);
    }
    return adminAuthInstance;
  } catch (err) {
    console.warn('Firebase Admin Auth initialization skipped or unavailable:', err);
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  try {
    if (!adminFirestoreInstance) {
      const app = getAdminApp();
      if (!app) return null;
      const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      adminFirestoreInstance = getFirestore(app, databaseId);
    }
    return adminFirestoreInstance;
  } catch (err) {
    console.warn('Firebase Admin Firestore initialization skipped or unavailable:', err);
    return null;
  }
}
