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
  where
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
import { Product, Order, OrderStatus, AdminSettings, CustomerProfile, CustomerAddress } from '../types';
import { INITIAL_PRODUCTS, DEFAULT_ADMIN_SETTINGS } from '../data/initialProducts';
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

// Local storage fallback keys
const LS_PRODUCTS_KEY = 'hh_mineral_products_v1';
const LS_ORDERS_KEY = 'hh_mineral_orders_v1';
const LS_SETTINGS_KEY = 'hh_mineral_settings_v1';
const LS_PROFILE_KEY = 'hh_mineral_profile_v1';

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

  // Save full profile in Firestore
  const newProfile: CustomerProfile = {
    uid: user.uid,
    email: user.email || email,
    displayName: fullName,
    phone: mobileNumber,
    addresses: [],
    createdAt: new Date().toISOString(),
    role: 'customer'
  };

  await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(newProfile));

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
  localStorage.removeItem(LS_PROFILE_KEY);
}

// ----------------------------------------------------
// Customer Profile & Address Management
// ----------------------------------------------------

export async function ensureCustomerProfileDoc(user: User): Promise<CustomerProfile> {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as CustomerProfile;
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(data));
      return data;
    } else {
      const defaultProfile: CustomerProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Customer',
        phone: user.phoneNumber || '',
        addresses: [],
        createdAt: new Date().toISOString(),
        role: 'customer'
      };
      await setDoc(userDocRef, defaultProfile, { merge: true });
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(defaultProfile));
      return defaultProfile;
    }
  } catch (err) {
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
          localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profileData));
          onProfileChange(profileData);
        } else {
          onProfileChange(null);
        }
      },
      (error) => {
        console.warn('Customer profile listener error:', error);
        const cached = localStorage.getItem(LS_PROFILE_KEY);
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
    console.warn('Firestore user profile update error:', err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(LS_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const updated = { ...parsed, ...data };
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(updated));
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
    console.warn('Error updating address in Firestore:', e);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(LS_PROFILE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.addresses = updatedList;
      localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(parsed));
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
    console.warn('Error deleting address in Firestore:', e);
  }

  return updatedList;
}

// Seed Initial Products
export async function seedInitialProductsIfNeeded(): Promise<Product[]> {
  try {
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    if (snapshot.empty) {
      for (const prod of INITIAL_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod);
      }
      return INITIAL_PRODUCTS;
    } else {
      const prods: Product[] = [];
      snapshot.forEach(docSnap => {
        prods.push(docSnap.data() as Product);
      });
      return prods;
    }
  } catch (err) {
    console.warn('Firestore seeding failed, using local storage fallback:', err);
    const cached = localStorage.getItem(LS_PRODUCTS_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
}

// Subscribe to real-time products
export function subscribeToProducts(onProductsChange: (products: Product[]) => void): () => void {
  try {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsCol,
      snapshot => {
        if (!snapshot.empty) {
          const prods: Product[] = [];
          snapshot.forEach(docSnap => {
            prods.push(docSnap.data() as Product);
          });
          // Sort by price ascending
          prods.sort((a, b) => a.price - b.price);
          localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(prods));
          onProductsChange(prods);
        } else {
          // If empty in Firestore, seed it
          seedInitialProductsIfNeeded().then(p => onProductsChange(p));
        }
      },
      error => {
        console.warn('Firestore products listener fallback to local storage:', error);
        const cached = localStorage.getItem(LS_PRODUCTS_KEY);
        if (cached) {
          try {
            onProductsChange(JSON.parse(cached));
          } catch {
            onProductsChange(INITIAL_PRODUCTS);
          }
        } else {
          onProductsChange(INITIAL_PRODUCTS);
        }
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Error setting up product subscription:', e);
    const cached = localStorage.getItem(LS_PRODUCTS_KEY);
    onProductsChange(cached ? JSON.parse(cached) : INITIAL_PRODUCTS);
    return () => {};
  }
}

// Update Product in DB
export async function saveProductToDb(product: Product): Promise<void> {
  // Always update local cache first for instant feedback
  try {
    const cached = localStorage.getItem(LS_PRODUCTS_KEY);
    let list: Product[] = cached ? JSON.parse(cached) : [...INITIAL_PRODUCTS];
    const idx = list.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      list[idx] = product;
    } else {
      list.push(product);
    }
    localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }

  // Update Firestore
  try {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, product, { merge: true });
  } catch (err) {
    console.warn('Firestore product update error:', err);
  }
}

// Delete Product in DB
export async function deleteProductFromDb(productId: string): Promise<void> {
  // Update local cache
  try {
    const cached = localStorage.getItem(LS_PRODUCTS_KEY);
    if (cached) {
      const list: Product[] = JSON.parse(cached);
      const filtered = list.filter(p => p.id !== productId);
      localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }

  // Delete from Firestore
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore product deletion error:', err);
  }
}

// Subscribe to Orders
export function subscribeToOrders(onOrdersChange: (orders: Order[]) => void): () => void {
  try {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const orders: Order[] = [];
        snapshot.forEach(docSnap => {
          orders.push(docSnap.data() as Order);
        });
        localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders));
        onOrdersChange(orders);
      },
      error => {
        console.warn('Firestore orders listener fallback to local storage:', error);
        const cached = localStorage.getItem(LS_ORDERS_KEY);
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
    const cached = localStorage.getItem(LS_ORDERS_KEY);
    onOrdersChange(cached ? JSON.parse(cached) : []);
    return () => {};
  }
}

// Save New Order
export async function saveNewOrderToDb(order: Order): Promise<void> {
  // Update local storage
  try {
    const cached = localStorage.getItem(LS_ORDERS_KEY);
    const list: Order[] = cached ? JSON.parse(cached) : [];
    list.unshift(order);
    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage error saving order:', e);
  }

  // Update Firestore
  try {
    const orderDoc = doc(db, 'orders', order.id);
    await setDoc(orderDoc, order);
  } catch (err) {
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
    const cached = localStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const idx = list.findIndex(o => o.id === orderId);
      if (idx >= 0) {
        list[idx].status = newStatus;
        if (!list[idx].statusHistory) list[idx].statusHistory = [];
        list[idx].statusHistory.push(historyItem);
        localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list));
      }
    }
  } catch (e) {
    console.warn('Local storage update error:', e);
  }

  // Update Firestore
  try {
    const orderDoc = doc(db, 'orders', orderId);
    await updateDoc(orderDoc, {
      status: newStatus,
      statusHistory: [historyItem] // or arrayUnion in firestore if preferred
    });
  } catch (err) {
    console.warn('Firestore update order status error:', err);
  }
}

// Delete Order from DB & Local Storage (Admin Only)
export async function deleteOrderFromDb(orderId: string): Promise<void> {
  // Update Local Storage
  try {
    const cached = localStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const filtered = list.filter(o => o.id !== orderId);
      localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Local storage error on order deletion:', e);
  }

  // Delete from Firestore
  try {
    const orderDoc = doc(db, 'orders', orderId);
    await deleteDoc(orderDoc);
  } catch (err) {
    console.warn('Firestore delete order error:', err);
  }
}

// Update Order WhatsApp Status
export async function updateOrderWhatsAppStatusInDb(
  orderId: string,
  status: 'SENT' | 'PENDING' | 'FAILED' | 'ACKNOWLEDGED',
  retryCountIncrement = 0
): Promise<void> {
  const now = new Date().toISOString();

  // Local storage
  try {
    const cached = localStorage.getItem(LS_ORDERS_KEY);
    if (cached) {
      const list: Order[] = JSON.parse(cached);
      const idx = list.findIndex(o => o.id === orderId);
      if (idx >= 0) {
        list[idx].whatsAppNotification.status = status;
        if (status === 'SENT' || status === 'ACKNOWLEDGED') {
          list[idx].whatsAppNotification.sentAt = now;
        }
        list[idx].whatsAppNotification.lastAttempt = now;
        list[idx].whatsAppNotification.retryCount += retryCountIncrement;
        localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(list));
      }
    }
  } catch {
    // ignore
  }

  // Firestore
  try {
    const orderDoc = doc(db, 'orders', orderId);
    await updateDoc(orderDoc, {
      'whatsAppNotification.status': status,
      'whatsAppNotification.lastAttempt': now,
      ...(status === 'SENT' ? { 'whatsAppNotification.sentAt': now } : {})
    });
  } catch (err) {
    console.warn('Firestore update WhatsApp status error:', err);
  }
}

// Store Settings
export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const cached = localStorage.getItem(LS_SETTINGS_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }
  return DEFAULT_ADMIN_SETTINGS;
}

export function saveAdminSettings(settings: AdminSettings) {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    const settingsDoc = doc(db, 'settings', 'general');
    setDoc(settingsDoc, settings, { merge: true }).catch(err => console.warn(err));
  } catch (e) {
    console.warn('Save settings error:', e);
  }
}
