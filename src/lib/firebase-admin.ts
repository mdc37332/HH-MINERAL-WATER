import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let adminAppInstance: App | null = null;
let adminAuthInstance: Auth | null = null;

export function getAdminAuth(): Auth | null {
  try {
    if (!adminAuthInstance) {
      if (!getApps().length) {
        adminAppInstance = initializeApp({
          projectId: firebaseConfig.projectId,
        });
      } else {
        adminAppInstance = getApps()[0];
      }
      adminAuthInstance = getAuth(adminAppInstance);
    }
    return adminAuthInstance;
  } catch (err) {
    console.warn('Firebase Admin SDK initialization skipped or unavailable:', err);
    return null;
  }
}

