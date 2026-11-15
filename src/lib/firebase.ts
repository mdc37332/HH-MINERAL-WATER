import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDocFromServer,
  arrayUnion
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  User
} from 'firebase/auth';
import { Product, Order, OrderStatus, AdminSettings, CustomerProfile, CustomerAddress, ProductAuditLog, Invoice, WhatsAppNotificationState } from '../types';
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS } from '../data/initialProducts';
import { DEFAULT_BOTTLE_IMAGE } from '../data/bottlePresets';
import { safeStorage } from './storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Initialize Firebase
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// If a specific database ID was created
const databaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);

// Test Firestore Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local storage fallback keys
const LS_PRODUCTS_KEY = 'hh_mineral_products_v1';
const LS_ORDERS_KEY = 'hh_mineral_orders_v1';
const LS_SETTINGS_KEY = 'hh_mineral_settings_v1';
const LS_PROFILE_KEY = 'hh_mineral_profile_v1';

// Recursive Sanitizer to remove all undefined values (which Firestore rejects)
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value === undefined) return null;
      return value;
    })
  );
}

// Dedicated sanitizer for orders in Firestore to protect against the 1MB document limit
export function sanitizeOrderForFirestore(order: Order): Order {
  if (!order || typeof order !== 'object') return order;
  const copy: Order = JSON.parse(JSON.stringify(order));

  if (Array.isArray(copy.items)) {
    copy.items = copy.items.map(item => {
      if (!item || typeof item !== 'object') return item;
      const itemCopy = { ...item };

      // Replace oversized base64 product images inside items (>80KB)
      if (
        itemCopy.product?.image &&
        typeof itemCopy.product.image === 'string' &&
        itemCopy.product.image.startsWith('data:') &&
        itemCopy.product.image.length > 80000
      ) {
        itemCopy.product = {
          ...itemCopy.product,
          image: DEFAULT_BOTTLE_IMAGE
        };
      }

      // Safeguard custom design attachments (keep full copy in PostgreSQL, store lightweight token in Firestore)
      if (itemCopy.customDesignDetails) {
        const cd = { ...itemCopy.customDesignDetails };
        if (Array.isArray(cd.uploadedImages)) {
          cd.uploadedImages = cd.uploadedImages.map((img: any) => {
            if (typeof img?.url === 'string' && img.url.startsWith('data:') && img.url.length > 80000) {
              return {
                ...img,
                url: `[Stored in Cloud SQL - ${img.name || 'Custom Image'} (${Math.round(img.sizeKb || img.url.length / 1333)} KB)]`
              };
            }
            return img;
          });
        }
        itemCopy.customDesignDetails = cd;
      }

      return itemCopy;
    });
  }

  // Ensure byte size remains comfortably under the 1MB Firestore boundary
  try {
    const serialized = JSON.stringify(copy);
    if (new TextEncoder().encode(serialized).length > 850000) {
      console.warn(`[FIRESTORE GUARD] Order ${copy.id} exceeds 850KB payload. Trimming history for Firestore.`);
      if (Array.isArray(copy.statusHistory) && copy.statusHistory.length > 8) {
        copy.statusHistory = copy.statusHistory.slice(-8);
      }
    }
  } catch {}

  return sanitizeForFirestore(copy);
}

// Dedicated sanitizer for invoices in Firestore
export function sanitizeInvoiceForFirestore(invoice: Invoice): Invoice {
  if (!invoice || typeof invoice !== 'object') return invoice;
  return sanitizeForFirestore(invoice);
}

// ----------------------------------------------------
// Customer Authentication Functions
// ----------------------------------------------------

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  // Ensure profile doc exists in Firestore
  await ensureCustomerProfileDoc(user);
  return user;
}

export async function registerWithEmail(
  email: string,
  pass: string,
  fullName: string,
  mobileNumber: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const user = cred.user;
  
  // Set display name in Firebase Auth
  await updateProfile(user, { displayName: fullName });

  const isAuthorizedAdmin = Boolean(
    user.emailVerified &&
      email &&
      ['mdhussain170707@gmail.com', 'mdc37332@gmail.com'].includes(email.toLowerCase())
  );

  // Save full profile in Firestore
  const newProfile: CustomerProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: fullName,
    phone: mobileNumber,
    addresses: [],
    createdAt: new Date().toISOString(),
    role: isAuthorizedAdmin ? 'admin' : 'customer'
  };

  try {
    await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
    safeStorage.setItem(LS_PROFILE_KEY, JSON.stringify(newProfile));
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
    console.warn('Firestore register user profile save error:', err);
  }

  return user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const user = cred.user;
  await ensureCustomerProfileDoc(user);
  return user;
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function changeCustomerPassword(newPass: string): Promise<void> {
  if (!auth.currentUser) throw new Error('No authenticated customer found');
  await updatePassword(auth.currentUser, newPass);
}

export async function logoutCustomer(): Promise<void> {
  await signOut(auth);
  safeStorage.removeItem(LS_PROFILE_KEY);
}

// ----------------------------------------------------
// Customer Profile & Address Management
// ----------------------------------------------------

export async function ensureCustomerProfileDoc(user: User): Promise<CustomerProfile> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    const isAuthorizedAdmin = Boolean(
      user.emailVerified &&
        user.email &&
        ['mdhussain170707@gmail.com', 'mdc37332@gmail.com'].includes(user.email.toLowerCase())
    );

    if (snap.exists()) {
      const data = snap.data() as CustomerProfile;
      if (isAuthorizedAdmin && data.role !== 'admin') {
        data.role = 'admin';
        await setDoc(userDocRef, { role: 'admin' }, { merge: true });
      }
      safeStorage.setItem(LS_PROFILE_KEY, JSON.stringify(data));
      return data;
    } else {
      const defaultProfile: CustomerProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (isAuthorizedAdmin ? 'Authorized Admin' : 'Customer'),
        phone: user.phoneNumber || '',
        addresses: [],
        createdAt: new Date().toISOString(),
        role: isAuthorizedAdmin ? 'admin' : 'customer'
      };
      await setDoc(userDocRef, defaultProfile, { merge: true });
      safeStorage.setItem(LS_PROFILE_KEY, JSON.stringify(defaultProfile));
      return defaultProfile;
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }
    console.warn('Error fetching or creating user profile in Firestore:', err);
    const fallbackProfile: CustomerProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Customer',
      phone: '',
      addresses: [],
      createdAt: new Date().toISOString(),
      role: 'customer'
    };
    return fallbackProfile;
  }
}

export function subscribeToCustomerProfile(
  uid: string,
  onProfileChange: (profile: CustomerProfile | null) => void
): () => void {
  try {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as CustomerProfile;
          safeStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profileData));
          onProfileChange(profileData);
        } else {
          onProfileChange(null);
        }
      },
      (error) => {
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('insufficient'))) {
          handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        }
        console.warn('Customer profile listener error:', error);
        const cached = safeStorage.getItem(LS_PROFILE_KEY);
        if (cached) {
          try {
            onProfileChange(JSON.parse(cached));
          } catch {
            onProfileChange(null);
          }
        }
      }
    );
  } catch {
    return () => {};
  }
}

export async function updateCustomerProfileInDb(
  uid: string,
  data: Partial<Pick<CustomerProfile, 'displayName' | 'phone' | 'email'>>
): Promise<void> {
  // Update in Firestore
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, data);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
    console.warn('Firestore user profile update error:', err);
  }

  // Update local cache
  try {
    const cached = safeStorage.getItem(LS_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const updated = { ...parsed, ...data };
      safeStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  // Update auth display name if displayName changed
  if (data.displayName && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
    } catch {
      // ignore
    }
  }
}

export async function saveCustomerAddressInDb(
  uid: string,
  currentAddresses: CustomerAddress[],
  addressToSave: CustomerAddress
): Promise<CustomerAddress[]> {
  let updatedList = [...currentAddresses];
  const existingIdx = updatedList.findIndex(a => a.id === addressToSave.id);

  if (addressToSave.isDefault) {
    // Set all others to non-default
    updatedList = updatedList.map(a => ({ ...a, isDefault: false }));
  } else if (updatedList.length === 0) {
    // First address is always default
    addressToSave.isDefault = true;
  }

  if (existingIdx >= 0) {
    updatedList[existingIdx] = addressToSave;
  } else {
    updatedList.push(addressToSave);
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { addresses: updatedList });
  } catch (e) {
    if (e instanceof Error && (e.message.includes('permission') || e.message.includes('insufficient'))) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
    console.warn('Error updating address in Firestore:', e);
  }

  // Update local cache
  try {
    const cached = safeStorage.getItem(LS_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.addresses = updatedList;
      safeStorage.setItem(LS_PROFILE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }

  return updatedList;
}

export async function deleteCustomerAddressInDb(
  uid: string,
  currentAddresses: CustomerAddress[],
  addressId: string
): Promise<CustomerAddress[]> {
  let updatedList = currentAddresses.filter(a => a.id !== addressId);
  if (updatedList.length > 0 && !updatedList.some(a => a.isDefault)) {
    updatedList[0].isDefault = true;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, { addresses: updatedList });
  } catch (e) {
    if (e instanceof Error && (e.message.includes('permission') || e.message.includes('insufficient'))) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
    console.warn('Error deleting address in Firestore:', e);
  }

  return updatedList;
}

// Seed Initial Products
export async function seedInitialProductsIfNeeded(): Promise<Product[]> {
  try {
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    const hasBeenInitialized = safeStorage.getItem('hh_catalog_initialized_v1') === 'true';

    if (snapshot.empty && !hasBeenInitialized && INITIAL_PRODUCTS.length > 0) {
      for (const prod of INITIAL_PRODUCTS) {
        const clean = sanitizeForFirestore(prod);
        await setDoc(doc(db, 'products', prod.id), clean, { merge: true });
      }
      safeStorage.setItem('hh_catalog_initialized_v1', 'true');
      return INITIAL_PRODUCTS;
    } else {
      const prods: Product[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data() as Product;
        if (item && item.id) prods.push(item);
      });
      prods.sort((a, b) => (a.price || 0) - (b.price || 0));
      return prods;
    }
  } catch (err) {
    console.warn('Firestore seeding check notice, using local cache fallback:', err);
    const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  }
}

// Subscribe to real-time products
export function subscribeToProducts(onProductsChange: (products: Product[]) => void): () => void {
  try {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsCol,
      async snapshot => {
        try {
          if (snapshot.empty) {
            const initStatus = safeStorage.getItem('hh_catalog_initialized_v1');
            if (initStatus) {
              // Store has already been initialized in the past; empty means products were deleted
              safeStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify([]));
              onProductsChange([]);
              return;
            }

            // First-time setup on a fresh instance only:
            try {
              for (const prod of INITIAL_PRODUCTS) {
                const clean = sanitizeForFirestore(prod);
                await setDoc(doc(db, 'products', prod.id), clean, { merge: true });
              }
              safeStorage.setItem('hh_catalog_initialized_v1', 'true');
            } catch (seedErr) {
              console.warn('Firestore auto seeding notice:', seedErr);
            }

            // Check if we have valid cached products
            const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  onProductsChange(parsed);
                  return;
                }
              } catch {
                // ignore
              }
            }

            safeStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
            onProductsChange(INITIAL_PRODUCTS);
            return;
          }

          const prods: Product[] = [];
          snapshot.forEach(docSnap => {
            const item = docSnap.data() as Product;
            if (item && item.id) {
              const normalizedVisible = item.isVisible !== false && !(Array.isArray(item.tags) && item.tags.includes('hidden_not_show'));
              prods.push({
                ...item,
                isVisible: normalizedVisible
              });
            }
          });

          // Sort by price ascending
          prods.sort((a, b) => (a.price || 0) - (b.price || 0));

          safeStorage.setItem('hh_catalog_initialized_v1', 'true');
          safeStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(prods));
          onProductsChange(prods);
        } catch (err) {
          console.warn('Error inside products snapshot callback:', err);
        }
      },
      error => {
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('insufficient'))) {
          handleFirestoreError(error, OperationType.GET, 'products');
        }
        console.warn('Firestore products listener fallback to local storage:', error);
        const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              onProductsChange(parsed);
              return;
            }
          } catch {
            // ignore
          }
        }
        onProductsChange(INITIAL_PRODUCTS);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Error setting up product subscription:', e);
    const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
    try {
      const parsed = cached ? JSON.parse(cached) : null;
      onProductsChange(Array.isArray(parsed) ? parsed : INITIAL_PRODUCTS);
    } catch {
      onProductsChange(INITIAL_PRODUCTS);
    }
    return () => {};
  }
}

// Local storage fallback key for product audit logs
const LS_PRODUCT_AUDIT_LOGS_KEY = 'hh_mineral_prod_audit_v1';

// Update Product in DB with versioning & audit logging
export async function saveProductToDb(
  product: Product,
  adminEmail: string = 'mdhussain170707@gmail.com',
  adminName: string = 'Authorized Admin'
): Promise<Product> {
  const now = new Date().toISOString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server';
  const deviceInfo = /Mobile|Android|iPhone/i.test(userAgent) ? 'Mobile Device' : /Tablet|iPad/i.test(userAgent) ? 'Tablet' : 'Desktop Browser';

  // Check previous product version to record audit diff
  let existingProduct: Product | undefined;
  try {
    const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
    if (cached) {
      const list: Product[] = JSON.parse(cached);
      existingProduct = list.find(p => p.id === product.id);
    }
  } catch {
    // ignore
  }

  const nextVersion = (product.version || existingProduct?.version || 0) + 1;
  const normalizedIsVisible = product.isVisible !== false && !(Array.isArray(product.tags) && product.tags.includes('hidden_not_show'));
  const enrichedProduct: Product = {
    ...product,
    isVisible: normalizedIsVisible,
    version: nextVersion,
    updatedAt: now,
    updatedBy: adminEmail,
    lastModifiedDevice: deviceInfo
  };

  // Always update local cache first for instant feedback
  try {
    const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
    let list: Product[] = cached ? JSON.parse(cached) : [...INITIAL_PRODUCTS];
    const idx = list.findIndex(p => p.id === enrichedProduct.id);
    if (idx >= 0) {
      list[idx] = enrichedProduct;
    } else {
      list.push(enrichedProduct);
    }
    safeStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }

  // Update Firestore with clean sanitized payload
  try {
    const docRef = doc(db, 'products', enrichedProduct.id);
    let cleanDoc: any = sanitizeForFirestore(enrichedProduct);

    // Safeguard Firestore 1 MiB (1,048,576 bytes) hard document limit
    // Downscale or sanitize oversized base64 data URLs if present
    if (cleanDoc.videoUrl && typeof cleanDoc.videoUrl === 'string' && cleanDoc.videoUrl.startsWith('data:') && cleanDoc.videoUrl.length > 250000) {
      console.warn(`[FIRESTORE GUARD] Product ${cleanDoc.id} video data URL exceeds 250KB. Omitted from Firestore document to stay within 1MB limit.`);
      delete cleanDoc.videoUrl;
    }

    if (cleanDoc.image && typeof cleanDoc.image === 'string' && cleanDoc.image.startsWith('data:') && cleanDoc.image.length > 800000) {
      console.warn(`[FIRESTORE GUARD] Product ${cleanDoc.id} image data URL exceeds 800KB. Falling back to official HD image.`);
      const defaultProd = INITIAL_PRODUCTS.find(p => p.id === cleanDoc.id);
      cleanDoc.image = defaultProd?.image || DEFAULT_BOTTLE_IMAGE;
    }

    // Measure total byte size
    const payloadBytes = new TextEncoder().encode(JSON.stringify(cleanDoc)).length;
    if (payloadBytes > 900000) {
      console.warn(`[FIRESTORE GUARD] Product ${cleanDoc.id} payload size is ${payloadBytes} bytes. Sanitizing heavy fields.`);
      if (cleanDoc.image && cleanDoc.image.startsWith('data:')) {
        const defaultProd = INITIAL_PRODUCTS.find(p => p.id === cleanDoc.id);
        cleanDoc.image = defaultProd?.image || DEFAULT_BOTTLE_IMAGE;
      }
      delete cleanDoc.videoUrl;
    }

    cleanDoc = sanitizeForFirestore(cleanDoc);
    await setDoc(docRef, cleanDoc, { merge: true });
    console.log(`[FIRESTORE SUCCESS] Product ${enrichedProduct.name} (${enrichedProduct.size}) synced with ID: ${enrichedProduct.id}`);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.WRITE, `products/${enrichedProduct.id}`);
    }
    console.error('Firestore product update error:', err);
  }

  // Generate audit logs for changed fields
  if (existingProduct) {
    const fieldsToTrack: (keyof Product)[] = [
      'name',
      'price',
      'mrp',
      'customDesignPrice',
      'size',
      'category',
      'inStock',
      'isVisible',
      'stockStatus',
      'stockCount',
      'discountPercent',
      'gstRate',
      'hsnCode',
      'image',
      'shortDesc',
      'description',
      'badge',
      'casePackSize'
    ];

    const auditPromises: Promise<void>[] = [];
    for (const field of fieldsToTrack) {
      const oldVal = existingProduct[field];
      const newVal = enrichedProduct[field];
      if (oldVal !== newVal && (oldVal !== undefined || newVal !== undefined)) {
        let oldStr = oldVal !== undefined ? (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)) : 'None';
        let newStr = newVal !== undefined ? (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)) : 'None';

        // Protect audit logs from giant base64 payloads which blow localStorage quota
        if (oldStr.startsWith('data:') || oldStr.length > 120) {
          oldStr = oldStr.startsWith('data:') ? '[Base64 Image Data]' : (oldStr.substring(0, 110) + '... (truncated)');
        }
        if (newStr.startsWith('data:') || newStr.length > 120) {
          newStr = newStr.startsWith('data:') ? '[Base64 Image Data]' : (newStr.substring(0, 110) + '... (truncated)');
        }

        const auditItem: ProductAuditLog = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          productId: enrichedProduct.id,
          productName: enrichedProduct.name,
          changedField: String(field),
          oldValue: oldStr,
          newValue: newStr,
          adminEmail,
          adminName,
          timestamp: now,
          deviceInfo
        };
        auditPromises.push(recordProductAuditLogInDb(auditItem).catch(e => console.warn('Audit record warning:', e)));
      }
    }
    if (auditPromises.length > 0) {
      Promise.allSettled(auditPromises).catch(() => {});
    }
  } else {
    // Brand new product created
    const auditItem: ProductAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      productId: enrichedProduct.id,
      productName: enrichedProduct.name,
      changedField: 'PRODUCT_CREATED',
      oldValue: 'None (New Product)',
      newValue: `Created variant ${enrichedProduct.size} @ ₹${enrichedProduct.price}`,
      adminEmail,
      adminName,
      timestamp: now,
      deviceInfo
    };
    recordProductAuditLogInDb(auditItem).catch(e => console.warn('Audit record warning:', e));
  }

  return enrichedProduct;
}

// Record Product Audit Log in Firestore and local storage
export async function recordProductAuditLogInDb(log: ProductAuditLog): Promise<void> {
  // Update local cache safely with max 30 items
  try {
    const cached = safeStorage.getItem(LS_PRODUCT_AUDIT_LOGS_KEY);
    const logs: ProductAuditLog[] = cached ? JSON.parse(cached) : [];
    logs.unshift(log);
    safeStorage.setItem(LS_PRODUCT_AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
  } catch {
    // ignore
  }

  // Persist to Firestore
  try {
    const docRef = doc(db, 'product_audit_logs', log.id);
    const cleanLog = sanitizeForFirestore(log);
    await setDoc(docRef, cleanLog);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.CREATE, `product_audit_logs/${log.id}`);
    }
    console.warn('Firestore audit log save error:', err);
  }
}

// Subscribe to Product Audit Logs
export function subscribeToProductAuditLogs(onLogsChange: (logs: ProductAuditLog[]) => void): () => void {
  try {
    const logsCol = collection(db, 'product_audit_logs');
    const unsubscribe = onSnapshot(
      logsCol,
      snapshot => {
        try {
          const logs: ProductAuditLog[] = [];
          snapshot.forEach(docSnap => {
            const item = docSnap.data() as ProductAuditLog;
            if (item && item.id) {
              const cleanOld = typeof item.oldValue === 'string' && (item.oldValue.startsWith('data:') || item.oldValue.length > 150)
                ? (item.oldValue.startsWith('data:') ? '[Base64 Image Data]' : item.oldValue.substring(0, 140) + '...')
                : (item.oldValue || 'None');
              const cleanNew = typeof item.newValue === 'string' && (item.newValue.startsWith('data:') || item.newValue.length > 150)
                ? (item.newValue.startsWith('data:') ? '[Base64 Image Data]' : item.newValue.substring(0, 140) + '...')
                : (item.newValue || 'None');
              logs.push({
                ...item,
                oldValue: cleanOld,
                newValue: cleanNew,
              });
            }
          });
          // Sort newest first
          logs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          // Save max 30 items locally via safeStorage to guarantee quota limits are respected
          safeStorage.setItem(LS_PRODUCT_AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
          onLogsChange(logs);
        } catch (err) {
          console.warn('Error processing audit logs snapshot:', err);
        }
      },
      error => {
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('insufficient'))) {
          handleFirestoreError(error, OperationType.GET, 'product_audit_logs');
        }
        console.warn('Firestore audit logs listener notice, using local cache fallback:', error);
        const cached = safeStorage.getItem(LS_PRODUCT_AUDIT_LOGS_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            onLogsChange(Array.isArray(parsed) ? parsed : []);
          } catch {
            onLogsChange([]);
          }
        } else {
          onLogsChange([]);
        }
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Error setting up product audit logs subscription:', e);
    const cached = safeStorage.getItem(LS_PRODUCT_AUDIT_LOGS_KEY);
    try {
      const parsed = cached ? JSON.parse(cached) : null;
      onLogsChange(Array.isArray(parsed) ? parsed : []);
    } catch {
      onLogsChange([]);
    }
    return () => {};
  }
}

// Delete Product in DB
export async function deleteProductFromDb(
  productId: string,
  adminEmail: string = 'mdhussain170707@gmail.com',
  productName: string = 'Bottle Product'
): Promise<void> {
  // Update local cache
  try {
    const cached = safeStorage.getItem(LS_PRODUCTS_KEY);
    if (cached) {
      const list: Product[] = JSON.parse(cached);
      const filtered = list.filter(p => p.id !== productId);
      safeStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(filtered));
      if (filtered.length === 0) {
        safeStorage.setItem('hh_catalog_initialized_v1', 'cleared');
      }
    }
  } catch {
    // ignore
  }

  // Delete from Firestore
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
    console.warn('Firestore product deletion error:', err);
  }

  // Log product deletion
  const now = new Date().toISOString();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server';
  const deviceInfo = /Mobile|Android|iPhone/i.test(userAgent) ? 'Mobile Device' : /Tablet|iPad/i.test(userAgent) ? 'Tablet' : 'Desktop Browser';
  const auditItem: ProductAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    productId,
    productName,
    changedField: 'PRODUCT_DELETED',
    oldValue: 'Active in Catalog',
    newValue: 'Deleted from Database',
    adminEmail,
    adminName: 'Authorized Admin',
    timestamp: now,
    deviceInfo
  };
  await recordProductAuditLogInDb(auditItem);
}

// Delete All Products in DB
export async function deleteAllProductsFromDb(adminEmail: string = 'mdhussain170707@gmail.com'): Promise<void> {
  try {
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.allSettled(deletes);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.DELETE, 'products');
    }
    console.warn('Firestore delete all products error:', err);
  }

  try {
    safeStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify([]));
    safeStorage.setItem('hh_catalog_initialized_v1', 'cleared');
  } catch {
    // ignore
  }

  const now = new Date().toISOString();
  const auditItem: ProductAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    productId: 'ALL',
    productName: 'ALL_PRODUCTS_CATALOG',
    changedField: 'ALL_PRODUCTS_DELETED',
    oldValue: 'Catalog active',
    newValue: 'All products cleared',
    adminEmail,
    adminName: 'Authorized Admin',
    timestamp: now,
    deviceInfo: 'Admin Session'
  };
  await recordProductAuditLogInDb(auditItem);
}

// Clear all Product Audit Logs in DB
export async function clearProductAuditLogsInDb(): Promise<void> {
  try {
    const logsCol = collection(db, 'product_audit_logs');
    const snapshot = await getDocs(logsCol);
    const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.allSettled(deletes);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.DELETE, 'product_audit_logs');
    }
    console.warn('Firestore clear audit logs error:', err);
  }

  try {
    safeStorage.setItem(LS_PRODUCT_AUDIT_LOGS_KEY, JSON.stringify([]));
  } catch {
    // ignore
  }
}

// Subscribe to Orders
export function subscribeToOrders(onOrdersChange: (orders: Order[]) => void): () => void {
  try {
    const ordersCol = collection(db, 'orders');
    const unsubscribe = onSnapshot(
      ordersCol,
      snapshot => {
        try {
          const orders: Order[] = [];
          snapshot.forEach(docSnap => {
            orders.push(docSnap.data() as Order);
          });
          orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          safeStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders.slice(0, 100)));
          onOrdersChange(orders);
        } catch (err) {
          console.warn('Error processing orders snapshot:', err);
        }
      },
      error => {
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('insufficient'))) {
          handleFirestoreError(error, OperationType.GET, 'orders');
        }
        console.warn('Firestore orders listener fallback to local storage:', error);
        const cached = safeStorage.getItem(LS_ORDERS_KEY);
        if (cached) {
          try {
            onOrdersChange(JSON.parse(cached));
          } catch {
            onOrdersChange([]);
          }
        } else {
          onOrdersChange([]);
        }
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Error setting up orders subscription:', e);
    try {
      const cached = safeStorage.getItem(LS_ORDERS_KEY);
      const parsed = cached ? JSON.parse(cached) : [];
      onOrdersChange(Array.isArray(parsed) ? parsed : []);
    } catch {
      onOrdersChange([]);
    }
    return () => {};
  }
}

// Save New Order
export async function saveNewOrderToDb(order: Order): Promise<void> {
  // Update local storage
  try {
    const cached = safeStorage.getItem(LS_ORDERS_KEY);
    const list: Order[] = cached ? JSON.parse(cached) : [];
    list.unshift(order);
    safeStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.warn('Local storage error saving order:', e);
  }

  // Update Firestore with safeguarded payload
  try {
    const orderDoc = doc(db, 'orders', order.id);
    const cleanDoc = sanitizeOrderForFirestore(order);
    await setDoc(orderDoc, cleanDoc, { merge: true });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}`);
    }
    console.warn('Firestore save order error:', err);
  }
}

// Update Order Status
export async function updateOrderStatusInDb(
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
  updatedBy: string = 'Owner Admin'
): Promise<void> {
  const timestamp = new Date().toISOString();
  const historyItem = {
    status: newStatus,
    timestamp,
    note: note || `Status transitioned to ${newStatus}`,
    updatedBy
  };

  // Update Local Storage
  try {
    const cached = safeStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const idx = list.findIndex(o => o.id === orderId);
      if (idx >= 0) {
        list[idx].status = newStatus;
        if (!list[idx].statusHistory) list[idx].statusHistory = [];
        list[idx].statusHistory.push(historyItem);
        safeStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.warn('Local storage update error:', e);
  }

  // Update Firestore
  try {
    const orderDoc = doc(db, 'orders', orderId);
    await setDoc(orderDoc, {
      status: newStatus,
      statusHistory: arrayUnion(historyItem)
    }, { merge: true });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
    console.warn('Firestore update order status error:', err);
  }
}

// Delete Order from DB & Local Storage (Admin Only)
export async function deleteOrderFromDb(orderId: string): Promise<void> {
  // Update Local Storage
  try {
    const cached = safeStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const filtered = list.filter(o => o.id !== orderId);
      safeStorage.setItem(LS_ORDERS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Local storage error on order deletion:', e);
  }

  // Delete from Firestore
  try {
    const orderDoc = doc(db, 'orders', orderId);
    await deleteDoc(orderDoc);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
    }
    console.warn('Firestore delete order error:', err);
  }
}

// Update Full Order in DB & Local Storage (Admin Custom Design & Price/Photo Editor)
export async function updateFullOrderInDb(order: Order): Promise<void> {
  // Update Local Storage
  try {
    const cached = safeStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const idx = list.findIndex(o => o.id === order.id);
      if (idx >= 0) {
        list[idx] = order;
        safeStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.warn('Local storage update full order error:', e);
  }

  // Update Firestore with safeguarded payload
  try {
    const orderDoc = doc(db, 'orders', order.id);
    const cleanDoc = sanitizeOrderForFirestore(order);
    await setDoc(orderDoc, cleanDoc, { merge: true });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
    console.warn('Firestore update full order error:', err);
  }
}

// Update Order WhatsApp Status
export async function updateOrderWhatsAppStatusInDb(
  orderId: string,
  statusOrNotification: 'SENT' | 'PENDING' | 'FAILED' | 'ACKNOWLEDGED' | WhatsAppNotificationState,
  retryCountIncrement = 0
): Promise<void> {
  const now = new Date().toISOString();

  // Local storage
  try {
    const cached = safeStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const idx = list.findIndex(o => o.id === orderId);
      if (idx >= 0) {
        if (typeof statusOrNotification === 'object') {
          list[idx].whatsAppNotification = {
            ...list[idx].whatsAppNotification,
            ...statusOrNotification,
          };
        } else {
          list[idx].whatsAppNotification.status = statusOrNotification;
          if (statusOrNotification === 'SENT' || statusOrNotification === 'ACKNOWLEDGED') {
            list[idx].whatsAppNotification.sentAt = now;
          }
          list[idx].whatsAppNotification.lastAttempt = now;
          list[idx].whatsAppNotification.retryCount += retryCountIncrement;
        }
        safeStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list));
      }
    }
  } catch {
    // ignore
  }

  // Firestore
  try {
    const orderDoc = doc(db, 'orders', orderId);
    if (typeof statusOrNotification === 'object') {
      await setDoc(
        orderDoc,
        sanitizeForFirestore({ whatsAppNotification: statusOrNotification }),
        { merge: true }
      );
    } else {
      const notificationUpdate: Partial<WhatsAppNotificationState> = {
        status: statusOrNotification,
        lastAttempt: now,
        ...(statusOrNotification === 'SENT' || statusOrNotification === 'ACKNOWLEDGED' ? { sentAt: now } : {}),
      };
      await setDoc(
        orderDoc,
        sanitizeForFirestore({ whatsAppNotification: notificationUpdate }),
        { merge: true }
      );
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
    console.warn('Firestore update WhatsApp status error:', err);
  }
}

// Store Settings
export async function getAdminSettings(): Promise<AdminSettings> {
  // 1. First check local cache for instant zero-latency load
  let cachedSettings: AdminSettings | null = null;
  try {
    const cached = safeStorage.getItem(LS_SETTINGS_KEY);
    if (cached) {
      cachedSettings = JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  // 2. Fetch fresh document from Firestore if online
  try {
    const settingsDoc = doc(db, 'settings', 'general');
    const docSnap = await getDoc(settingsDoc);
    if (docSnap.exists()) {
      const data = docSnap.data() as AdminSettings;
      if (data && typeof data === 'object') {
        const merged = { ...(cachedSettings || DEFAULT_ADMIN_SETTINGS), ...data };
        safeStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('Firestore getAdminSettings notice:', err);
  }

  return cachedSettings || DEFAULT_ADMIN_SETTINGS;
}

export function saveAdminSettings(settings: AdminSettings) {
  try {
    safeStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    const settingsDoc = doc(db, 'settings', 'general');

    // Create a safe copy for Firestore so we don't break Firestore's 1MB hard limit
    const cleanSettings: Record<string, any> = { ...settings };
    if (
      typeof cleanSettings.heroBannerImage === 'string' &&
      cleanSettings.heroBannerImage.startsWith('data:') &&
      cleanSettings.heroBannerImage.length > 750000
    ) {
      console.warn('[Firestore] Omitting heavy base64 hero image from Firestore document to prevent 1MB limit error.');
      cleanSettings.heroBannerImage = DEFAULT_ADMIN_SETTINGS.heroBannerImage;
    }
    if (
      typeof cleanSettings.heroBannerVideo === 'string' &&
      cleanSettings.heroBannerVideo.startsWith('data:') &&
      cleanSettings.heroBannerVideo.length > 250000
    ) {
      console.warn('[Firestore] Omitting heavy base64 hero video from Firestore document to prevent 1MB limit error.');
      cleanSettings.heroBannerVideo = ''; // The full video is safely saved in PostgreSQL via /api/settings
    }
    if (
      typeof cleanSettings.brandLogoImage === 'string' &&
      cleanSettings.brandLogoImage.startsWith('data:') &&
      cleanSettings.brandLogoImage.length > 200000
    ) {
      cleanSettings.brandLogoImage = '';
    }

    const payload = sanitizeForFirestore(cleanSettings);
    setDoc(settingsDoc, payload, { merge: true }).catch(err => {
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/general');
      }
      console.warn('Save settings error:', err);
    });
  } catch (e) {
    console.warn('Save settings error:', e);
  }
}

// Real-time Firestore subscriber for store settings
export function subscribeToAdminSettings(onSettingsChange: (settings: AdminSettings) => void): () => void {
  try {
    const settingsDoc = doc(db, 'settings', 'general');
    const unsub = onSnapshot(
      settingsDoc,
      docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AdminSettings;
          if (data && typeof data === 'object') {
            onSettingsChange(data);
          }
        }
      },
      err => {
        console.warn('Firestore settings subscription notice:', err);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Firestore settings listener error:', err);
    return () => {};
  }
}

// Helper to sanitize Firestore document ID (slashes are not permitted in single-segment doc IDs)
export function getInvoiceDocId(id: string): string {
  return (id || '').replace(/\//g, '_').trim();
}

// GST Invoices Firestore & Local Storage operations
export async function saveInvoiceToDb(invoice: Invoice): Promise<void> {
  // Update local cache
  try {
    const cached = safeStorage.getItem('hh_mineral_invoices_v1');
    const list: Invoice[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(inv => 
      inv.id === invoice.id || 
      inv.invoiceNumber === invoice.invoiceNumber ||
      (Boolean(invoice.orderId) && inv.orderId === invoice.orderId)
    );
    if (idx >= 0) {
      list[idx] = invoice;
    } else {
      list.unshift(invoice);
    }
    // Deduplicate by orderId
    const seenOrders = new Set<string>();
    const deduplicated = list.filter(inv => {
      const key = inv.orderId || inv.id || inv.invoiceNumber;
      if (!key) return true;
      if (seenOrders.has(key)) return false;
      seenOrders.add(key);
      return true;
    });
    safeStorage.setItem('hh_mineral_invoices_v1', JSON.stringify(deduplicated.slice(0, 50)));
  } catch (e) {
    console.warn('Local storage error saving invoice:', e);
  }

  // Update Firestore
  try {
    const docId = getInvoiceDocId(invoice.id || invoice.invoiceNumber);
    const invoiceDoc = doc(db, 'invoices', docId);
    const cleanDoc = sanitizeInvoiceForFirestore(invoice);
    await setDoc(invoiceDoc, cleanDoc, { merge: true });
  } catch (err) {
    const docId = getInvoiceDocId(invoice.id || invoice.invoiceNumber);
    if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${docId}`);
    }
    console.warn('Firestore save invoice error:', err);
  }
}

export function subscribeToInvoices(onInvoicesChange: (invoices: Invoice[]) => void): () => void {
  try {
    const invoicesCol = collection(db, 'invoices');
    const unsubscribe = onSnapshot(
      invoicesCol,
      snapshot => {
        try {
          const rawInvoicesList: Invoice[] = [];
          snapshot.forEach(docSnap => {
            rawInvoicesList.push(docSnap.data() as Invoice);
          });
          rawInvoicesList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          // Deduplicate by orderId: 1 Order = Exactly 1 Invoice
          const seenOrders = new Set<string>();
          const invoicesList: Invoice[] = [];
          const duplicatesToDelete: { id: string; invoiceNumber?: string }[] = [];

          for (const inv of rawInvoicesList) {
            const orderKey = inv.orderId;
            if (orderKey && seenOrders.has(orderKey)) {
              // Found duplicate invoice document in Firestore for the same order
              duplicatesToDelete.push({ id: inv.id, invoiceNumber: inv.invoiceNumber });
            } else {
              if (orderKey) seenOrders.add(orderKey);
              invoicesList.push(inv);
            }
          }

          // Asynchronously clean up any orphaned duplicates found in Firestore
          if (duplicatesToDelete.length > 0) {
            duplicatesToDelete.forEach(dup => {
              deleteInvoiceFromDb(dup.id, dup.invoiceNumber).catch(() => {});
            });
          }

          safeStorage.setItem('hh_mineral_invoices_v1', JSON.stringify(invoicesList.slice(0, 50)));
          onInvoicesChange(invoicesList);
        } catch (err) {
          console.warn('Error processing invoices snapshot:', err);
        }
      },
      error => {
        if (error instanceof Error && (error.message.includes('permission') || error.message.includes('insufficient'))) {
          handleFirestoreError(error, OperationType.GET, 'invoices');
        }
        console.warn('Firestore invoices listener fallback to local cache:', error);
        const cached = safeStorage.getItem('hh_mineral_invoices_v1');
        if (cached) {
          try {
            onInvoicesChange(JSON.parse(cached));
          } catch {
            onInvoicesChange([]);
          }
        } else {
          onInvoicesChange([]);
        }
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Error setting up invoices subscription:', e);
    try {
      const cached = safeStorage.getItem('hh_mineral_invoices_v1');
      const parsed = cached ? JSON.parse(cached) : [];
      onInvoicesChange(Array.isArray(parsed) ? parsed : []);
    } catch {
      onInvoicesChange([]);
    }
    return () => {};
  }
}

// Delete Invoice from Firestore & Local Storage
export async function deleteInvoiceFromDb(invoiceId: string, invoiceNumber?: string): Promise<void> {
  // Update Local Storage
  try {
    const cached = safeStorage.getItem('hh_mineral_invoices_v1');
    if (cached) {
      const list = JSON.parse(cached);
      const filtered = list.filter((inv: any) => 
        inv.id !== invoiceId && 
        inv.invoiceNumber !== invoiceId && 
        inv.orderId !== invoiceId &&
        (!invoiceNumber || inv.invoiceNumber !== invoiceNumber)
      );
      safeStorage.setItem('hh_mineral_invoices_v1', JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Local storage error on invoice deletion:', e);
  }

  // Delete from Firestore
  try {
    const docId = getInvoiceDocId(invoiceId);
    const invoiceDoc = doc(db, 'invoices', docId);
    await deleteDoc(invoiceDoc);
    if (invoiceNumber && invoiceNumber !== invoiceId) {
      const altDocId = getInvoiceDocId(invoiceNumber);
      await deleteDoc(doc(db, 'invoices', altDocId));
    }
  } catch (err) {
    console.warn('Firestore delete invoice error:', err);
  }
}

export async function deleteAllInvoicesFromDb(): Promise<void> {
  try {
    const invoicesCol = collection(db, 'invoices');
    const snapshot = await getDocs(invoicesCol);
    const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.allSettled(deletes);
  } catch (err) {
    console.warn('Firestore clear invoices error:', err);
  }

  try {
    safeStorage.removeItem('hh_mineral_invoices_v1');
  } catch (e) {
    console.warn('Local storage clear invoices error:', e);
  }
}

/**
 * Mirrors Master AI Orchestrator tasks, cross-agent messages, and approvals
 * to Firestore when an authorized verified Admin Firebase session is signed in.
 */
export async function syncAiOrchestratorSnapshotToFirestore(snapshot: {
  tasks?: Array<Record<string, any>>;
  crossAgentMessages?: Array<Record<string, any>>;
  approvals?: Array<Record<string, any>>;
}): Promise<{ syncedCount: number; skippedReason?: string }> {
  const email = auth.currentUser?.email?.toLowerCase();
  const isVerifiedOwner = Boolean(
    auth.currentUser?.emailVerified &&
      email &&
      ['mdhussain170707@gmail.com', 'mdc37332@gmail.com'].includes(email)
  );
  if (!isVerifiedOwner) {
    return { syncedCount: 0, skippedReason: 'Sign in with verified Owner Google/Firebase account to enable client Firestore AI mirror.' };
  }

  let syncedCount = 0;
  const recentTasks = (snapshot.tasks || []).slice(0, 15);
  for (const t of recentTasks) {
    if (!t?.id) continue;
    try {
      await setDoc(
        doc(db, 'ai_tasks', String(t.id)),
        sanitizeForFirestore({
          id: String(t.id),
          agentId: String(t.agentId || 'AGENT_00_ORCHESTRATOR').slice(0, 64),
          agentName: String(t.agentName || 'AI Agent').slice(0, 120),
          eventSource: String(t.eventSource || '').slice(0, 240),
          taskDescription: String(t.taskDescription || '').slice(0, 600),
          authorizationLevel: String(t.authorizationLevel || 'AUTO_LEVEL_3').slice(0, 64),
          status: String(t.status || 'COMPLETED').slice(0, 40),
          verificationStatus: String(t.verificationStatus || 'VERIFIED').slice(0, 40),
          tokensUsed: Number(t.tokensUsed || 0),
          startedAt: String(t.startedAt || t.createdAt || new Date().toISOString()).slice(0, 100),
          completedAt: t.completedAt ? String(t.completedAt).slice(0, 100) : null,
          createdAt: String(t.createdAt || new Date().toISOString()).slice(0, 100),
        }),
        { merge: true }
      );
      syncedCount++;
    } catch (err) {
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
        handleFirestoreError(err, OperationType.WRITE, `ai_tasks/${t.id}`);
      }
    }
  }

  const recentMsgs = (snapshot.crossAgentMessages || []).slice(0, 20);
  for (const m of recentMsgs) {
    if (!m?.id) continue;
    try {
      await setDoc(
        doc(db, 'ai_agent_messages', String(m.id)),
        sanitizeForFirestore({
          id: String(m.id),
          correlationId: String(m.correlationId || 'CORR').slice(0, 128),
          taskId: m.taskId ? String(m.taskId).slice(0, 128) : null,
          fromAgentId: String(m.fromAgentId || 'AGENT_00_ORCHESTRATOR').slice(0, 64),
          fromAgentName: String(m.fromAgentName || '').slice(0, 120),
          toAgentId: String(m.toAgentId || 'AGENT_01_CEO').slice(0, 64),
          toAgentName: String(m.toAgentName || '').slice(0, 120),
          intent: String(m.intent || 'HANDOFF').slice(0, 40),
          subject: String(m.subject || '').slice(0, 300),
          status: String(m.status || 'DELIVERED').slice(0, 40),
          priority: String(m.priority || 'NORMAL').slice(0, 20),
          createdAt: String(m.createdAt || new Date().toISOString()).slice(0, 100),
        }),
        { merge: true }
      );
      syncedCount++;
    } catch (err) {
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
        handleFirestoreError(err, OperationType.WRITE, `ai_agent_messages/${m.id}`);
      }
    }
  }

  const recentApprovals = (snapshot.approvals || []).slice(0, 15);
  for (const a of recentApprovals) {
    if (!a?.id) continue;
    try {
      await setDoc(
        doc(db, 'ai_approvals', String(a.id)),
        sanitizeForFirestore({
          id: String(a.id),
          taskId: a.taskId ? String(a.taskId).slice(0, 128) : null,
          agentId: String(a.agentId || 'AGENT_00_ORCHESTRATOR').slice(0, 64),
          agentName: String(a.agentName || '').slice(0, 120),
          actionType: String(a.actionType || 'OTHER_SENSITIVE_ACTION').slice(0, 64),
          title: String(a.title || '').slice(0, 200),
          reason: String(a.reason || '').slice(0, 1000),
          expectedImpact: String(a.expectedImpact || '').slice(0, 1000),
          status: String(a.status || 'PENDING').slice(0, 40),
          ownerEmail: a.ownerEmail ? String(a.ownerEmail).slice(0, 200) : null,
          createdAt: String(a.createdAt || new Date().toISOString()).slice(0, 100),
        }),
        { merge: true }
      );
      syncedCount++;
    } catch (err) {
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('insufficient'))) {
        handleFirestoreError(err, OperationType.WRITE, `ai_approvals/${a.id}`);
      }
    }
  }

  return { syncedCount };
}


