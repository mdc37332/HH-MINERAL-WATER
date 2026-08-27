import { Product, Order, AdminSettings, Invoice, ProductAuditLog } from '../types';
import { auth } from './firebase';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

async function getAuthHeader(customAdminToken?: string | null): Promise<Record<string, string>> {
  if (customAdminToken) {
    return { Authorization: `Bearer ${customAdminToken}` };
  }
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }
  return {};
}

// --- ADMIN 2-STEP AUTHENTICATION APIS ---

export async function adminLoginStep1Api(email: string, password: string): Promise<{
  success: boolean;
  step?: string;
  challengeId?: string;
  maskedEmail?: string;
  targetEmail?: string;
  targetPhone?: string;
  whatsappUrl?: string;
  liveOtp?: string;
  masterPin?: string;
  emailDelivery?: string;
  emailDeliveryReason?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/login-step1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Login verification failed.' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network connection failed.' };
  }
}

export async function adminResendOtpApi(challengeId: string): Promise<{
  success: boolean;
  whatsappUrl?: string;
  liveOtp?: string;
  masterPin?: string;
  emailDelivery?: string;
  emailDeliveryReason?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to resend code.' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error while resending OTP.' };
  }
}

export async function adminVerifyOtpApi(challengeId: string, otp: string): Promise<{
  success: boolean;
  token?: string;
  adminEmail?: string;
  expiresIn?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, otp })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Invalid OTP code.' };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Verification failed.' };
  }
}

export async function adminVerifySessionApi(adminToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/verify-session', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminLogoutApi(adminToken: string): Promise<void> {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  } catch (err) {
    console.warn('Logout API error:', err);
  }
}

export async function adminLogoutAllApi(adminToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/logout-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminAuditLogsApi(adminToken: string): Promise<AuditLogItem[]> {
  try {
    const res = await fetch('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return await res.json();
  } catch (err) {
    console.warn('fetchAdminAuditLogsApi error:', err);
    return [];
  }
}

export async function fetchProductAuditLogsApi(adminToken?: string | null): Promise<ProductAuditLog[]> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch('/api/products/audit-logs', { headers });
    if (!res.ok) throw new Error('Failed to fetch product audit logs');
    return await res.json();
  } catch (err) {
    console.warn('fetchProductAuditLogsApi fallback:', err);
    return [];
  }
}

// --- STORE APIS ---

export async function fetchProductsApi(): Promise<Product[]> {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    return await res.json();
  } catch (err) {
    console.warn('API fetchProducts fallback:', err);
    return [];
  }
}

export async function saveProductApi(product: Product, adminToken?: string | null): Promise<Product | null> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch('/api/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Failed to save product to Cloud SQL');
    return await res.json();
  } catch (err) {
    console.warn('API saveProduct fallback:', err);
    return null;
  }
}

export async function deleteProductApi(productId: string, adminToken?: string | null): Promise<boolean> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('API deleteProduct fallback:', err);
    return false;
  }
}

export async function deleteAllProductsApi(adminToken?: string | null): Promise<boolean> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch('/api/products', {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('API deleteAllProducts fallback:', err);
    return false;
  }
}

export async function fetchOrdersApi(): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Failed to fetch orders');
    return await res.json();
  } catch (err) {
    console.warn('API fetchOrders fallback:', err);
    return [];
  }
}

export async function createOrderApi(order: Order): Promise<Order | null> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader()),
    };
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Failed to create order in Cloud SQL');
    return await res.json();
  } catch (err) {
    console.warn('API createOrder fallback:', err);
    return null;
  }
}

export async function updateOrderStatusApi(
  orderId: string,
  status: Order['status'],
  statusHistory?: Order['statusHistory'],
  adminToken?: string | null
): Promise<boolean> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, statusHistory }),
    });
    return res.ok;
  } catch (err) {
    console.warn('API updateOrderStatus fallback:', err);
    return false;
  }
}

export async function deleteOrderApi(
  orderId: string,
  adminToken?: string | null
): Promise<boolean> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE',
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn('API deleteOrder fallback:', err);
    return false;
  }
}

export async function fetchSettingsApi(): Promise<AdminSettings | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return await res.json();
  } catch (err) {
    console.warn('API fetchSettings fallback:', err);
    return null;
  }
}

export async function saveSettingsApi(settings: AdminSettings, adminToken?: string | null): Promise<boolean> {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(await getAuthHeader(adminToken)),
    };
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch (err) {
    console.warn('API saveSettings fallback:', err);
    return false;
  }
}

// --- GST INVOICES APIS ---

export async function fetchInvoicesApi(): Promise<Invoice[]> {
  try {
    const res = await fetch('/api/invoices');
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return await res.json();
  } catch (err) {
    console.warn('API fetchInvoices fallback:', err);
    return [];
  }
}

export async function fetchInvoiceByIdApi(id: string): Promise<Invoice | null> {
  try {
    const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API fetchInvoiceById fallback:', err);
    return null;
  }
}

export async function fetchInvoiceByOrderIdApi(orderId: string): Promise<Invoice | null> {
  try {
    const res = await fetch(`/api/invoices/order/${encodeURIComponent(orderId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API fetchInvoiceByOrderId fallback:', err);
    return null;
  }
}

export async function generateInvoiceApi(order: Order, sequenceNumber?: number | string): Promise<Invoice | null> {
  try {
    const res = await fetch('/api/invoices/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, sequenceNumber }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API generateInvoice fallback:', err);
    return null;
  }
}


