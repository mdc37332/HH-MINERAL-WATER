import React, { useState, useRef, useEffect } from 'react';
import { useStore, isProductVisibleInStore } from '../context/StoreContext';
import { Product, Order, OrderStatus, AdminSettings, ProductAuditLog, Invoice, CustomerInfo } from '../types';
import { AuditLogItem } from '../lib/api';
import {
  Key,
  KeyRound,
  LayoutDashboard,
  Package,
  Sparkles,
  ShoppingBag,
  Users,
  Settings,
  Edit3,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  MessageCircle,
  FileDown,
  Search,
  Plus,
  Trash2,
  Droplet,
  Save,
  DollarSign,
  TrendingUp,
  Filter,
  Eye,
  RefreshCw,
  Phone,
  Printer,
  Image as ImageIcon,
  Upload,
  Camera,
  RotateCcw,
  Check,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  LogOut,
  History,
  Shield,
  Smartphone,
  AlertTriangle,
  Receipt,
  FileText,
  Building2,
  Percent,
  Copy,
  Zap,
  CheckCheck,
  XCircle,
  Ban,
  Play,
  Pause,
  FastForward,
  Sliders,
  Info,
  Video,
  Volume2,
  VolumeX,
  Film,
  ChevronUp,
  ChevronDown,
  Layers,
  Bell,
  BellRing,
  Send,
  EyeOff,
  ExternalLink,
  MapPin,
  Navigation,
  Scale,
  BookOpen,
  QrCode,
  ScanLine,
  Cpu
} from 'lucide-react';
import { DriverNavigationModal } from './DriverNavigationModal';
import { getWhatsAppDirectUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';
import { BulkInquiriesTab } from './admin/BulkInquiriesTab';
import { WaterQualityTab } from './admin/WaterQualityTab';
import { FleetDispatchTab } from './admin/FleetDispatchTab';
import { PlantExpensesTab } from './admin/PlantExpensesTab';
import { AccountingAuditTab } from './admin/AccountingAuditTab';
import { DeliveryChallanModal } from './admin/DeliveryChallanModal';
import { OrderDispatchQrModal } from './admin/OrderDispatchQrModal';
import { DispatchQrUtilityTab } from './admin/DispatchQrUtilityTab';
import { DispatchBoardTab } from './admin/DispatchBoardTab';
import { QuickDispatchScannerModal } from './admin/QuickDispatchScannerModal';
import { AddCustomerModal } from './admin/AddCustomerModal';
import { OfflineInvoiceModal } from './admin/OfflineInvoiceModal';
import { CustomDesignStudioTab } from './admin/CustomDesignStudioTab';
import { AdminFactoryLocationEditor } from './admin/AdminFactoryLocationEditor';
import { InventoryStockTab } from './admin/InventoryStockTab';
import { AiCommandCenterTab } from './admin/AiCommandCenterTab';
import { DEFAULT_ADMIN_SETTINGS, INITIAL_PRODUCTS, INITIAL_PLANT_EXPENSES } from '../data/initialProducts';
import { compressImageToDataUrl } from '../lib/imageCompressor';
import { safeStorage } from '../lib/storage';
import { uploadVideoFile, parseVideoInput, formatFileSize } from '../lib/videoUtils';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import {
  BOTTLE_IMAGE_PRESETS,
  DEFAULT_HERO_IMAGE,
  DEFAULT_BOTTLE_IMAGE
} from '../data/bottlePresets';

const BOTTLE_VIDEO_PRESETS = [
  {
    title: 'HD Crystal Ocean Water & Waves',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    desc: 'High-definition crystal water waves & fluid mineral motion'
  },
  {
    title: 'Fluid Motion Stream Demo',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    desc: 'High-speed fluid motion showcase reel'
  }
];


export const AdminPanel: React.FC = () => {
  const {
    products,
    orders,
    invoices,
    fetchInvoices,
    openInvoiceForOrder,
    openInvoiceById,
    setActiveInvoice,
    setActiveInvoiceAutoPrint,
    deleteInvoice,
    deleteAllInvoices,
    adminSettings,
    updateAdminSettings,
    updateProduct,
    toggleProductVisibility,
    setSelectedProductsVisibility,
    toggleAllProductsSellingPrice,
    deleteProduct,
    deleteAllProducts,
    resetProductsToDefault,
    updateOrderStatus,
    cancelOrder,
    deleteOrder,
    deleteAllOrders,
    deleteAllCustomOrders,
    autoAdvanceOrder,
    autoAdvanceAllEligibleOrders,
    toggleAutoProgressOrders,
    triggerWhatsAppNotification,
    isAdminUnlocked,
    adminEmail,
    adminLoginStep1,
    adminResendOtp,
    adminVerifyOtp,
    adminDirectUnlock,
    adminLogout,
    adminLogoutAll,
    fetchAuditLogs,
    productAuditLogs,
    fetchProductAuditLogs,
    clearProductAuditLogs,
    soundAlertEnabled,
    toggleSoundAlert,
    testSoundAlert,
    browserNotificationEnabled,
    toggleBrowserNotification,
    latestIncomingOrder,
    clearIncomingOrderAlert,
    testWhatsAppCloudApi,
    sendOrderViaCloudApi,
    triggerAdminOrderEmail,
    sendAdminTestEmail,
    showToast,
    isFactoryStaffUnlocked,
    factoryStaffLogin,
    factoryStaffLogout,
    updateFactoryStaffPin,
    rawMaterials,
    lowStockSummary,
    sendLowStockAlertToWhatsApp,
    isLowStockBannerDismissed,
    dismissLowStockBanner,
    resetLowStockBannerDismissal,
    pendingDispatchScan
  } = useStore();

  // Role discriminator: Factory Staff Mode is active when staff is logged in and master admin is not unlocked
  const isFactoryStaffMode = isFactoryStaffUnlocked && !isAdminUnlocked;

  // Option 2 & 4 State
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [testWhatsAppResult, setTestWhatsAppResult] = useState<{ success: boolean; message?: string; error?: string; mode?: string; directWhatsAppUrl?: string; targetPhone?: string } | null>(null);
  const [showTokenSecret, setShowTokenSecret] = useState(false);
  const [showStaffPinPlain, setShowStaffPinPlain] = useState(false);
  const [isUpdatingStaffPin, setIsUpdatingStaffPin] = useState(false);
  const [dispatchingOrderCloudId, setDispatchingOrderCloudId] = useState<string | null>(null);

  // Admin Email State
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; mode?: string; targetEmails?: string[]; error?: string } | null>(null);
  const [emailingOrderId, setEmailingOrderId] = useState<string | null>(null);


  // Login States (Factory Staff PIN, Admin Credentials 2FA, or Admin Master PIN)
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  const [loginMode, setLoginMode] = useState<'staff' | 'credentials' | 'pin'>('staff');
  const [staffPinInput, setStaffPinInput] = useState('');
  const [masterPinInput, setMasterPinInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>('mdh***07@gmail.com');
  const [targetPhone, setTargetPhone] = useState<string>('+91 8017341130');
  const [whatsappOtpUrl, setWhatsappOtpUrl] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Timers for OTP
  const [otpTimeRemaining, setOtpTimeRemaining] = useState<number>(600); // 10 min
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<
    'dashboard' |
    'orders' |
    'dispatch-board' |
    'dispatch-qr' |
    'inventory' |
    'bulk-inquiries' |
    'water-quality' |
    'fleet-dispatch' |
    'expenses' |
    'invoices' |
    'accounting-audit' |
    'custom-orders' |
    'products' |
    'visuals' |
    'customers' |
    'settings' |
    'security-audit' |
    'ai-command-center'
  >('dashboard');
  const [focusedInvoiceIdForAccounting, setFocusedInvoiceIdForAccounting] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Audit Logs State
  const [auditLogsList, setAuditLogsList] = useState<AuditLogItem[]>([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

  // Product Edit Modal & Selective Visibility state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModal, setIsNewProductModal] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productVisibilityFilter, setProductVisibilityFilter] = useState<'all' | 'shown' | 'hidden'>('all');
  const [showProductAuditModal, setShowProductAuditModal] = useState(false);
  const [productAuditSearchQuery, setProductAuditSearchQuery] = useState('');
  const [productAuditProductFilter, setProductAuditProductFilter] = useState('all');

  const toggleSelectAdminProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // Product Deletion & Action Confirmation Modals
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isConfirmDeleteAllProductsOpen, setIsConfirmDeleteAllProductsOpen] = useState(false);
  const [isConfirmResetDefaultsOpen, setIsConfirmResetDefaultsOpen] = useState(false);
  const [isConfirmClearProductAuditOpen, setIsConfirmClearProductAuditOpen] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Invoice Delete Modal
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [isConfirmDeleteAllInvoicesOpen, setIsConfirmDeleteAllInvoicesOpen] = useState(false);

  // Delivery Challan Modal, Dispatch QR Modal, Quick Scanner Modal, Add Customer Modal & Driver Navigation Modal
  const [selectedChallanOrder, setSelectedChallanOrder] = useState<Order | null>(null);
  const [selectedQrOrder, setSelectedQrOrder] = useState<Order | null>(null);
  const [isQuickDeliverScannerOpen, setIsQuickDeliverScannerOpen] = useState(false);
  const [selectedNavOrder, setSelectedNavOrder] = useState<Order | null>(null);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isOfflineInvoiceModalOpen, setIsOfflineInvoiceModalOpen] = useState(false);
  const [selectedCustomerForOfflineInvoice, setSelectedCustomerForOfflineInvoice] = useState<CustomerInfo | null>(null);
  const [offlineCustomerFilter, setOfflineCustomerFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [offlineOrderFilter, setOfflineOrderFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [offlineInvoiceFilter, setOfflineInvoiceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [registeredOfflineCustomers, setRegisteredOfflineCustomers] = useState<CustomerInfo[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('hh_registered_offline_customers') || '[]');
    } catch {
      return [];
    }
  });
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);

  // Order Cancel & Delete Modals
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>('Customer requested cancellation');
  const [customCancelReasonText, setCustomCancelReasonText] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [isBatchProgressing, setIsBatchProgressing] = useState(false);

  // Batch & Tab-wide Delete Modals
  const [isConfirmDeleteAllOrdersOpen, setIsConfirmDeleteAllOrdersOpen] = useState(false);
  const [isConfirmDeleteAllCustomOrdersOpen, setIsConfirmDeleteAllCustomOrdersOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ name: string; phone: string; totalSpent: number; orderCount: number; lastOrder: string } | null>(null);
  const [isConfirmDeleteAllCustomersOpen, setIsConfirmDeleteAllCustomersOpen] = useState(false);
  const [isConfirmClearAuditLogsOpen, setIsConfirmClearAuditLogsOpen] = useState(false);
  const [isConfirmResetSettingsOpen, setIsConfirmResetSettingsOpen] = useState(false);
  const [isConfirmDeleteHeroVisualOpen, setIsConfirmDeleteHeroVisualOpen] = useState(false);
  const [isConfirmDeleteAllExpensesOpen, setIsConfirmDeleteAllExpensesOpen] = useState(false);
  const [isConfirmMasterPurgeOpen, setIsConfirmMasterPurgeOpen] = useState(false);
  const [deleteSectionModal, setDeleteSectionModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Settings State
  const [settingsForm, setSettingsForm] = useState<AdminSettings>(adminSettings || DEFAULT_ADMIN_SETTINGS);

  // Keep settingsForm in sync with global adminSettings from StoreContext
  useEffect(() => {
    if (adminSettings) {
      setSettingsForm(adminSettings);
      if (adminSettings.heroBannerImage) {
        setHeroImageInput(adminSettings.heroBannerImage);
      }
      if (adminSettings.heroBannerVideo !== undefined) {
        setHeroVideoInput(adminSettings.heroBannerVideo || '');
      }
      if (adminSettings.heroMediaType) {
        setHeroMediaTypeInput(adminSettings.heroMediaType);
      }
    }
  }, [adminSettings]);

  // Hero visual & video state
  const [heroImageInput, setHeroImageInput] = useState<string>(adminSettings?.heroBannerImage || DEFAULT_HERO_IMAGE);
  const [heroVideoInput, setHeroVideoInput] = useState<string>(adminSettings?.heroBannerVideo || '');
  const [heroMediaTypeInput, setHeroMediaTypeInput] = useState<'video' | 'image'>(
    adminSettings?.heroMediaType || (adminSettings?.heroBannerVideo ? 'video' : 'image')
  );
  const [isUploadingHeroVideo, setIsUploadingHeroVideo] = useState<boolean>(false);
  const [heroUploadProgress, setHeroUploadProgress] = useState<number>(0);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const heroVideoInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const productVideoInputRef = useRef<HTMLInputElement>(null);
  const [newProductImageUrlInput, setNewProductImageUrlInput] = useState<string>('');

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loginStep === 'otp' && otpTimeRemaining > 0) {
      interval = setInterval(() => {
        setOtpTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loginStep, otpTimeRemaining]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Redirect inventory tab if previously active
  useEffect(() => {
    if ((activeTab as string) === 'inventory') {
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  // Staff Access Rights Boundary Guard:
  // Staff has access to: Dashboard Overview, Orders Management, Dispatch Board, Dispatch QR Counter, Bulk & Events, Water Quality & Lab Logs, GST Invoices, Custom Design Studio, and Hero & Bottle Images.
  // Staff is NOT granted access to: Inventory & Stock, Product Catalog, Expenses, Accounting & CA Audit, Settings, Customers, or Security Audit.
  useEffect(() => {
    if (isFactoryStaffMode) {
      const staffAllowedTabs = ['dashboard', 'orders', 'dispatch-board', 'dispatch-qr', 'bulk-inquiries', 'water-quality', 'invoices', 'custom-orders', 'visuals'];
      if (!staffAllowedTabs.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [isFactoryStaffMode, activeTab]);

  // Auto-open Dispatch QR Counter tab when a dispatch QR verification URL is scanned
  useEffect(() => {
    if (pendingDispatchScan && (isAdminUnlocked || isFactoryStaffUnlocked)) {
      setActiveTab('dispatch-qr');
    }
  }, [pendingDispatchScan, isAdminUnlocked, isFactoryStaffUnlocked]);

  // Load audit logs when switching to security tab
  useEffect(() => {
    if (isAdminUnlocked && activeTab === 'security-audit') {
      loadAuditLogs();
    }
  }, [isAdminUnlocked, activeTab]);

  const loadAuditLogs = async () => {
    setIsLoadingAuditLogs(true);
    try {
      const logs = await fetchAuditLogs();
      setAuditLogsList(logs);
    } catch (e) {
      console.warn('Could not load audit logs:', e);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  // Step 1: Submit Credentials
  const handleStep1Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    if (!emailInput.trim() || !passwordInput) {
      setAuthError('Please enter both administrator username/email and password.');
      return;
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPw = passwordInput.trim();

    // STRICT VALIDATION: AUTHORIZED ADMINISTRATOR EMAILS
    const allowedAdminEmails = ['mdhussain170707@gmail.com', 'mdc37332@gmail.com', 'admin', 'owner'];
    if (!allowedAdminEmails.includes(cleanEmail)) {
      setAuthError('Access Denied: Invalid administrator username or email.');
      return;
    }

    // STRICT VALIDATION: PASSWORD IS HUSSAIN@170707 ONLY
    if (cleanPw !== 'HUSSAIN@170707' && cleanPw.toLowerCase() !== 'hussain@170707') {
      setAuthError('Access Denied: Invalid administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 2-Step Verification: Request OTP dispatch to Email & WhatsApp
      const res = await adminLoginStep1(cleanEmail, cleanPw);
      if (res.success && res.step === 'otp_required') {
        setChallengeId(res.challengeId || 'master_challenge');
        setMaskedEmail(res.maskedEmail || 'mdh***07@gmail.com');
        setTargetPhone(res.targetPhone || '+91 8017341130');
        if (res.whatsappUrl) {
          setWhatsappOtpUrl(res.whatsappUrl);
        }
        setLoginStep('otp');
        setOtpTimeRemaining(res.expiresInSeconds || 600);
        showToast('2-Step Verification Active', 'A 6-digit OTP has been sent to your Admin Email and WhatsApp.', 'info');
      } else {
        setAuthError(res.error || 'Authentication error.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Server error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Factory Staff PIN Submit (4-Digit PIN for counter dispatch & offline billing)
  const handleStaffPinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    const cleanPin = staffPinInput.trim();
    if (!cleanPin || cleanPin.length !== 4) {
      setAuthError('Please enter the 4-digit Factory Staff PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await factoryStaffLogin(cleanPin);
      if (res.success) {
        setStaffPinInput('');
        setActiveTab('dashboard');
        return;
      } else {
        setAuthError(res.error || 'Access Denied: Invalid 4-digit Factory Staff PIN.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Staff authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Master PIN Submit (Manual verification - NO auto-fill)
  const handleMasterPinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    const cleanPin = masterPinInput.trim();
    if (!cleanPin || cleanPin.length !== 6) {
      setAuthError('Please enter your complete 6-digit Master PIN.');
      return;
    }

    // VALIDATION: MASTER PIN 170707 OR CONFIGURED ADMIN PIN
    const validPins = ['170707'];
    if (adminSettings?.adminPin) validPins.push(adminSettings.adminPin.trim());
    if (!validPins.includes(cleanPin)) {
      setAuthError('Access Denied: Invalid Master PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminDirectUnlock(cleanPin);
      setMasterPinInput('');
      return;
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit OTP
  const handleStep2Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    const codeToVerify = otpInput.trim();
    if (!codeToVerify || codeToVerify.length !== 6) {
      setAuthError('Please enter the complete 6-digit verification code sent to your email or phone.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (codeToVerify === '170707') {
        await adminDirectUnlock('170707');
        setLoginStep('credentials');
        setEmailInput('');
        setPasswordInput('');
        setOtpInput('');
        setChallengeId(null);
        return;
      }

      const res = await adminVerifyOtp(challengeId || 'master-bypass', codeToVerify);
      if (res.success) {
        showToast('Access Granted', 'Two-step authentication verified. Welcome, Administrator!', 'success');
        setLoginStep('credentials');
        setEmailInput('');
        setPasswordInput('');
        setOtpInput('');
        setChallengeId(null);
      } else {
        setAuthError(res.error || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (!challengeId || resendCooldown > 0) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const res = await adminResendOtp(challengeId);
      if (res.success) {
        setOtpTimeRemaining(600);
        setResendCooldown(30);
        setOtpInput('');
        if (res.whatsappUrl) {
          setWhatsappOtpUrl(res.whatsappUrl);
          try {
            window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
          } catch (err) {
            console.warn('Auto-open WhatsApp popup notice on resend:', err);
          }
        }
        showToast('New Code Generated', res.message || 'Fresh verification code dispatched to WhatsApp & Email.', 'success');
      } else {
        setAuthError(res.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error requesting new code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please upload a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setHeroImageInput(dataUrl);
      showToast('Image Loaded', 'New hero bottle image loaded. Click "Save & Publish Hero Media" to apply.', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processHeroVideoFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(file.name);
    if (!isVideo) {
      showToast('Invalid File', 'Please select a valid video file (MP4, WebM, MOV, MKV, AVI).', 'error');
      return;
    }

    setIsUploadingHeroVideo(true);
    setHeroUploadProgress(10);
    showToast('Processing Video', `Uploading ${file.name} (${formatFileSize(file.size)})... Supports KB, MB, and GB files.`, 'info');

    // Fast local preview immediately
    try {
      const localBlob = URL.createObjectURL(file);
      setHeroVideoInput(localBlob);
      setHeroMediaTypeInput('video');
    } catch {
      // ignore
    }

    try {
      const res = await uploadVideoFile(file, (percent) => {
        setHeroUploadProgress(percent);
      });
      setHeroVideoInput(res.url);
      setHeroMediaTypeInput('video');
      setHeroUploadProgress(100);
      showToast('Hero Video Loaded', `${file.name} (${res.sizeFormatted}) ready! Click "Save & Broadcast Hero Media" to publish live.`, 'success');
    } catch (err) {
      console.error('Video upload failed:', err);
      showToast('Upload Notice', 'Video loaded in browser session. Click "Save & Broadcast Hero Media" to apply.', 'info');
    } finally {
      setIsUploadingHeroVideo(false);
    }
  };

  const handleHeroVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processHeroVideoFile(file);
    e.target.value = '';
  };

  const handleHeroVideoPaste = (pastedText: string) => {
    if (!pastedText.trim()) return;
    const parsed = parseVideoInput(pastedText);
    setHeroVideoInput(parsed.streamUrl || parsed.rawUrl);
    setHeroMediaTypeInput('video');
    showToast(
      'Video URL Pasted',
      `Attached ${parsed.type.toUpperCase()} video (${parsed.title || 'Direct Stream'}). Click "Save & Broadcast Hero Media" to publish.`,
      'success'
    );
  };

  const handleClearHeroVideo = () => {
    setHeroVideoInput('');
    setHeroMediaTypeInput('image');
    showToast('Hero Video Cleared', 'Hero showcase set to bottle photo showcase.', 'info');
  };

  const handleProductFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingProduct) return;

    showToast('Uploading Images', `Processing ${files.length} product image(s)...`, 'info');
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImageToDataUrl(file, 1000, 1000, 0.82);
        newImages.push(compressed);
      } catch {
        try {
          const raw = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          newImages.push(raw);
        } catch (err) {
          console.warn('Failed to read file:', file.name, err);
        }
      }
    }

    if (newImages.length > 0) {
      const existing = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
        ? editingProduct.images
        : (editingProduct.image ? [editingProduct.image] : []);
      const merged = [...existing, ...newImages];
      setEditingProduct({
        ...editingProduct,
        image: merged[0] || editingProduct.image,
        images: merged
      });
      showToast('Images Added', `Added ${newImages.length} image(s). Total: ${merged.length} vertical angle(s). Save product to broadcast.`, 'success');
    }
    e.target.value = '';
  };

  const handleProductVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(file.name);
    if (!isVideo) {
      showToast('Invalid File', 'Please upload a valid video file (MP4, WebM, MOV, MKV, AVI).', 'error');
      return;
    }

    showToast('Uploading Bottle Video', `Processing ${file.name} (${formatFileSize(file.size)})... Supports KB, MB, and GB files.`, 'info');

    // Instant local preview
    try {
      const localBlob = URL.createObjectURL(file);
      setEditingProduct({ ...editingProduct, videoUrl: localBlob });
    } catch {
      // ignore
    }

    try {
      const res = await uploadVideoFile(file);
      setEditingProduct({ ...editingProduct, videoUrl: res.url });
      showToast('Bottle Video Attached', `Showcase video (${res.sizeFormatted}) attached! Click "Save Product" to broadcast to catalog.`, 'success');
    } catch (err) {
      console.error('Failed to upload product video:', err);
      showToast('Video Attached Locally', 'Video attached for this editing session. Click "Save Product" to save.', 'info');
    }
    e.target.value = '';
  };

  const handleSaveHeroMedia = async () => {
    const updated: AdminSettings = {
      ...adminSettings,
      heroBannerImage: heroImageInput,
      heroBannerVideo: heroVideoInput,
      heroMediaType: heroMediaTypeInput
    };
    await updateAdminSettings(updated);
    setSettingsForm(updated);
    showToast('Hero Media Live', 'Hero showcase video, bottle imagery, and mode are now updated live on the storefront!', 'success');
  };

  const handleSaveHeroImage = handleSaveHeroMedia;

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    setIsSubmittingCancel(true);
    try {
      const finalReason = cancelReasonPreset === 'Other (Custom reason)'
        ? (customCancelReasonText.trim() || 'Admin cancellation')
        : (customCancelReasonText.trim() ? `${cancelReasonPreset} — ${customCancelReasonText.trim()}` : cancelReasonPreset);
      
      await cancelOrder(orderToCancel.id, finalReason);
      setOrderToCancel(null);
      setCustomCancelReasonText('');
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to cancel order.', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsSubmittingDelete(true);
    try {
      await deleteOrder(orderToDelete.id);
      setOrderToDelete(null);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to delete order.', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleConfirmDeleteAllOrders = async () => {
    setIsSubmittingDelete(true);
    try {
      await deleteAllOrders();
      setIsConfirmDeleteAllOrdersOpen(false);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to delete orders.', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleConfirmDeleteAllCustomOrders = async () => {
    setIsSubmittingDelete(true);
    try {
      await deleteAllCustomOrders();
      setIsConfirmDeleteAllCustomOrdersOpen(false);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to delete custom orders.', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsSubmittingDelete(true);
    try {
      const custOrders = orders.filter(o => o.customer.phone === customerToDelete.phone);
      for (const ord of custOrders) {
        await deleteOrder(ord.id);
      }
      try {
        const rawManual = safeStorage.getItem('hh_manual_customers');
        if (rawManual) {
          const list = JSON.parse(rawManual);
          const updated = list.filter((m: any) => m.phone !== customerToDelete.phone);
          safeStorage.setItem('hh_manual_customers', JSON.stringify(updated));
        }
      } catch {}

      showToast('Customer Removed', `Deleted profile and order records for ${customerToDelete.name}.`, 'info');
      setCustomerToDelete(null);
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to delete customer.', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleConfirmDeleteAllCustomers = async () => {
    setIsSubmittingDelete(true);
    try {
      await deleteAllOrders();
      try {
        safeStorage.removeItem('hh_manual_customers');
      } catch {}
      setIsConfirmDeleteAllCustomersOpen(false);
      showToast('Directory Cleared', 'All customer profiles and order histories removed.', 'info');
    } catch (e: any) {
      showToast('Error', e.message || 'Failed to clear customer directory.', 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleConfirmClearAuditLogs = () => {
    setAuditLogsList([]);
    try {
      safeStorage.removeItem('hh_admin_audit_logs');
    } catch {}
    setIsConfirmClearAuditLogsOpen(false);
    showToast('Audit Trail Cleared', 'All administrative and security audit events have been cleared.', 'info');
  };

  const handleConfirmResetSettings = async () => {
    const defaultSettings = { ...DEFAULT_ADMIN_SETTINGS };
    await updateAdminSettings(defaultSettings);
    setSettingsForm(defaultSettings);
    setIsConfirmResetSettingsOpen(false);
    showToast('Settings Reset', 'Store and GST tax configuration restored to factory defaults.', 'success');
  };

  const handleDeleteAllExpenses = () => {
    try {
      safeStorage.setItem('hh_plant_expenses', JSON.stringify([]));
      window.dispatchEvent(new Event('hh_plant_expenses_updated'));
      showToast('Expenses Deleted', 'All plant expenses and purchase records have been purged.', 'info');
    } catch (e: any) {
      showToast('Error', e?.message || 'Failed to clear expenses', 'error');
    } finally {
      setIsConfirmDeleteAllExpensesOpen(false);
    }
  };

  const handleMasterFactoryPurge = async () => {
    setIsSubmittingDelete(true);
    try {
      await deleteAllOrders();
      await deleteAllCustomOrders();
      await deleteAllInvoices();
      try {
        safeStorage.setItem('hh_plant_expenses', JSON.stringify([]));
        safeStorage.setItem('hh_manual_vouchers_v1', JSON.stringify([]));
        safeStorage.setItem('hh_accounting_wiped_v1', 'true');
        safeStorage.setItem('hh_accounting_wiped_before_v1', String(Date.now()));
        window.dispatchEvent(new Event('hh_plant_expenses_updated'));
      } catch {}
      try {
        safeStorage.setItem('hh_registered_offline_customers', JSON.stringify([]));
        setRegisteredOfflineCustomers([]);
      } catch {}
      try {
        safeStorage.removeItem('hh_admin_audit_logs');
        setAuditLogsList([]);
      } catch {}
      const defaultSettings = { ...DEFAULT_ADMIN_SETTINGS };
      await updateAdminSettings(defaultSettings);
      setSettingsForm(defaultSettings);
      showToast('Master Reset Complete', 'All orders, invoices, expenses, customers, and custom settings have been purged.', 'success');
    } catch (e: any) {
      showToast('Purge Error', e?.message || 'Failed to complete full system reset.', 'error');
    } finally {
      setIsSubmittingDelete(false);
      setIsConfirmMasterPurgeOpen(false);
    }
  };

  const handleConfirmDeleteHeroVisual = async () => {
    const defaultHero = DEFAULT_HERO_IMAGE;
    setHeroImageInput(defaultHero);
    setHeroVideoInput('');
    setHeroMediaTypeInput('image');
    const updated: AdminSettings = {
      ...adminSettings,
      heroBannerImage: defaultHero,
      heroBannerVideo: '',
      heroMediaType: 'image'
    };
    await updateAdminSettings(updated);
    setSettingsForm(updated);
    setIsConfirmDeleteHeroVisualOpen(false);
    showToast('Visuals Reset', 'Storefront hero showcase media restored to default mineral water bottle.', 'info');
  };

  const handleBatchAutoProgress = async () => {
    setIsBatchProgressing(true);
    try {
      await autoAdvanceAllEligibleOrders();
    } finally {
      setIsBatchProgressing(false);
    }
  };

  // Metrics - Delivery charges are pass-through shipping costs (not profit) and are excluded from revenue.
  // Selling prices are 18% GST-inclusive.
  const activeOrders = orders.filter(o => o.status !== 'Cancelled' && o.status !== 'Failed');
  const totalRevenue = activeOrders.reduce(
    (acc, o) => acc + Math.max(0, (o.totalAmount || 0) - (o.deliveryCharge || 0)),
    0
  );
  const totalDeliveryCollected = activeOrders.reduce(
    (acc, o) => acc + (o.deliveryCharge || 0),
    0
  );
  const totalGrossInvoiced = activeOrders.reduce(
    (acc, o) => acc + (o.totalAmount || 0),
    0
  );

  const onlineOrders = activeOrders.filter(o => !o.isOfflineSale && !o.customer.isOfflineCustomer);
  const offlineOrders = activeOrders.filter(o => o.isOfflineSale || o.customer.isOfflineCustomer);

  const onlineRevenue = onlineOrders.reduce(
    (acc, o) => acc + Math.max(0, (o.totalAmount || 0) - (o.deliveryCharge || 0)),
    0
  );
  const offlineRevenue = offlineOrders.reduce(
    (acc, o) => acc + Math.max(0, (o.totalAmount || 0) - (o.deliveryCharge || 0)),
    0
  );

  const newOrdersCount = orders.filter(o => o.status === 'New').length;
  const processingOrdersCount = orders.filter(o => o.status === 'Processing' || o.status === 'Confirmed' || o.status === 'Ready').length;
  const deliveredOrdersCount = orders.filter(o => o.status === 'Delivered').length;
  const customOrdersCount = orders.filter(o => o.isCustomOrder).length;

  // Filtered Orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch =
      ord.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customer.name.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      ord.customer.phone.includes(orderSearchQuery);

    const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;
    const isOffline = Boolean(ord.isOfflineSale || ord.customer.isOfflineCustomer);
    const matchesChannel =
      offlineOrderFilter === 'all' ||
      (offlineOrderFilter === 'offline' && isOffline) ||
      (offlineOrderFilter === 'online' && !isOffline);

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const customOrdersOnly = orders.filter(o => o.isCustomOrder);

  // Customer List extraction - revenue spent on products vs gross paid including logistics
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    totalSpent: number;
    totalProductRevenue: number;
    orderCount: number;
    lastOrder: string;
    isOffline?: boolean;
    address?: string;
    gstin?: string;
  }>();

  // Populate registered walk-in customers first
  registeredOfflineCustomers.forEach(rc => {
    const key = rc.phone;
    customerMap.set(key, {
      name: rc.name,
      phone: rc.phone,
      totalSpent: 0,
      totalProductRevenue: 0,
      orderCount: 0,
      lastOrder: 'Direct Registered',
      isOffline: true,
      address: rc.address,
      gstin: rc.gstin
    });
  });

  orders.forEach(o => {
    const key = o.customer.phone;
    const orderProductRevenue = Math.max(0, (o.totalAmount || 0) - (o.deliveryCharge || 0));
    const isOffline = Boolean(o.isOfflineSale || o.customer.isOfflineCustomer);
    if (customerMap.has(key)) {
      const exist = customerMap.get(key)!;
      exist.totalSpent += o.totalAmount;
      exist.totalProductRevenue += orderProductRevenue;
      exist.orderCount += 1;
      if (isOffline) exist.isOffline = true;
      if (o.customer.gstin && !exist.gstin) exist.gstin = o.customer.gstin;
      if (o.customer.address && !exist.address) exist.address = o.customer.address;
      exist.lastOrder = o.createdAt;
    } else {
      customerMap.set(key, {
        name: o.customer.name,
        phone: o.customer.phone,
        totalSpent: o.totalAmount,
        totalProductRevenue: orderProductRevenue,
        orderCount: 1,
        lastOrder: o.createdAt,
        isOffline,
        address: o.customer.address,
        gstin: o.customer.gstin
      });
    }
  });

  const customersList = Array.from(customerMap.values());
  const filteredCustomersList = customersList.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery) ||
      (c.gstin && c.gstin.toLowerCase().includes(customerSearchQuery.toLowerCase()));

    const matchesChannel =
      offlineCustomerFilter === 'all' ||
      (offlineCustomerFilter === 'offline' && c.isOffline) ||
      (offlineCustomerFilter === 'online' && !c.isOffline);

    return matchesSearch && matchesChannel;
  });

  const handleSaveProduct = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingProduct || isSavingProduct) return;
    
    const name = editingProduct.name?.trim();
    if (!name) {
      showToast('Validation Error', 'Please provide a valid product name.', 'warning');
      return;
    }

    const size = editingProduct.size?.trim();
    if (!size) {
      showToast('Validation Error', 'Please provide a bottle size (e.g. 500ml, 1L).', 'warning');
      return;
    }

    const price = Number(editingProduct.price);
    if (isNaN(price) || price <= 0) {
      showToast('Validation Error', 'Please specify a positive selling price.', 'warning');
      return;
    }

    const customDesignPrice = editingProduct.customDesignPrice !== undefined && Number(editingProduct.customDesignPrice) > 0
      ? Number(editingProduct.customDesignPrice)
      : price * 2;

    const rawMrp = Number(editingProduct.mrp);
    const mrpValue = isNaN(rawMrp) || rawMrp < price ? price : rawMrp;
    const discountPercent = mrpValue > price ? Math.round(((mrpValue - price) / mrpValue) * 100) : 0;

    const currentImages = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
      ? editingProduct.images.filter(img => Boolean(img && img.trim()))
      : [editingProduct.image || DEFAULT_BOTTLE_IMAGE];

    const primaryImage = currentImages[0] || (editingProduct.image && editingProduct.image.trim()) || DEFAULT_BOTTLE_IMAGE;

    const sanitizedProduct: Product = {
      ...editingProduct,
      id: editingProduct.id || `prod-${Date.now()}`,
      name,
      size,
      price,
      mrp: mrpValue,
      discountPercent: editingProduct.discountPercent !== undefined ? Number(editingProduct.discountPercent) : discountPercent,
      gstRate: editingProduct.gstRate !== undefined ? Number(editingProduct.gstRate) : 18,
      hsnCode: editingProduct.hsnCode?.trim() || '2201',
      stockCount: editingProduct.stockCount !== undefined ? Number(editingProduct.stockCount) : 500,
      stockStatus: editingProduct.inStock === false ? 'Out of Stock' : (editingProduct.stockStatus || 'In Stock'),
      isVisible: editingProduct.isVisible !== false,
      showSellingPrice: editingProduct.showSellingPrice !== false,
      tags: (() => {
        const raw = Array.isArray(editingProduct.tags) && editingProduct.tags.length > 0
          ? [...editingProduct.tags]
          : ['Pure Mineral', 'Natural Source', 'UV Treated'];
        let next = editingProduct.showSellingPrice === false
          ? (raw.includes('selling_price_off') ? raw : [...raw, 'selling_price_off'])
          : raw.filter(t => t !== 'selling_price_off');
        next = editingProduct.isVisible === false
          ? (next.includes('hidden_not_show') ? next : [...next, 'hidden_not_show'])
          : next.filter(t => t !== 'hidden_not_show');
        return next;
      })(),
      customDesignPrice,
      image: primaryImage,
      images: currentImages,
      videoUrl: editingProduct.videoUrl?.trim() || undefined,
      shortDesc: editingProduct.shortDesc?.trim() || `${size} Pure Natural Mineral Water`,
      description: editingProduct.description?.trim() || 'Pure 7-stage filtration mineral water enriched with essential minerals.',
      inStock: editingProduct.inStock !== false,
      minOrderQty: Math.max(1, Number(editingProduct.minOrderQty) || 1),
      category: editingProduct.category || 'Standard',
      casePackSize: Math.max(1, Number(editingProduct.casePackSize) || 24),
      badge: editingProduct.badge?.trim() || undefined,
      features: Array.isArray(editingProduct.features) && editingProduct.features.length > 0
        ? editingProduct.features
        : ['7-stage UV & Ozonation', 'BPA-Free PET', 'Touchless Bottling'],
      mineralInfo: editingProduct.mineralInfo || {
        calcium: '20 mg/L',
        magnesium: '10 mg/L',
        potassium: '4 mg/L',
        sodium: '7 mg/L',
        bicarbonate: '60 mg/L',
        silica: '14 mg/L',
        tds: '125 ppm',
        ph: '7.4'
      }
    };

    setIsSavingProduct(true);
    try {
      await updateProduct(sanitizedProduct);
      setEditingProduct(null);
      setIsNewProductModal(false);
    } catch (err: any) {
      showToast('Save Failed', err?.message || 'Could not save product. Please try again.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = (prod: Product) => {
    setProductToDelete(prod);
  };

  const handleToggleStock = async (prod: Product) => {
    const updated = { ...prod, inStock: !prod.inStock };
    await updateProduct(updated);
    showToast('Stock Status Changed', `${prod.name} is now ${updated.inStock ? 'In Stock' : 'Out of Stock'}.`, 'info');
  };

  const handleToggleSellingPrice = async (prod: Product) => {
    const isCurrentlyOff = prod.showSellingPrice === false || (prod.tags || []).includes('selling_price_off');
    const nextShowSellingPrice = isCurrentlyOff; // If currently OFF, turn ON; if currently ON, turn OFF
    let updatedTags = Array.isArray(prod.tags) ? [...prod.tags] : [];
    if (nextShowSellingPrice) {
      updatedTags = updatedTags.filter(t => t !== 'selling_price_off');
    } else {
      if (!updatedTags.includes('selling_price_off')) {
        updatedTags.push('selling_price_off');
      }
    }
    const updated: Product = {
      ...prod,
      showSellingPrice: nextShowSellingPrice,
      tags: updatedTags
    };
    await updateProduct(updated);
    showToast(
      nextShowSellingPrice ? 'Selling Price Active' : 'Selling Price Turned OFF',
      nextShowSellingPrice
        ? `Discounted selling price enabled for ${prod.name} (₹${prod.price}/bottle). Storefront shows discounted rate & % OFF.`
        : `Selling price turned OFF for ${prod.name}. Storefront will sell at standard MRP (₹${prod.mrp}/bottle) with no discount.`,
      nextShowSellingPrice ? 'success' : 'info'
    );
  };

  const exportOrdersCsv = () => {
    if (orders.length === 0) {
      showToast('No Orders', 'There are no order records to export.', 'info');
      return;
    }
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Email', 'Address', 'Pincode', 'Items Summary', 'Subtotal (INR)', 'Delivery Fee (INR)', 'Total (INR)', 'Status', 'Payment Method', 'Payment Status', 'Invoice Number'];
    const rows = orders.map(o => [
      `"${o.id}"`,
      `"${new Date(o.createdAt).toLocaleString()}"`,
      `"${(o.customer?.name || '').replace(/"/g, '""')}"`,
      `"${o.customer?.phone || ''}"`,
      `"${(o.customer?.email || '').replace(/"/g, '""')}"`,
      `"${(o.customer?.address || '').replace(/"/g, '""')}"`,
      `"${o.customer?.pincode || ''}"`,
      `"${o.items.map(i => `${i.product.name} (${i.product.size}) x${i.quantity}`).join('; ').replace(/"/g, '""')}"`,
      o.subtotal,
      o.deliveryCharge,
      o.totalAmount,
      `"${o.status}"`,
      `"${o.paymentMethod || ''}"`,
      `"${o.paymentStatus}"`,
      `"${o.invoiceNumber || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Orders Exported', 'Orders CSV successfully downloaded.', 'success');
  };

  const exportInvoicesCsv = () => {
    if (invoices.length === 0) {
      showToast('No Invoices', 'There are no GST invoices to export.', 'info');
      return;
    }
    const headers = ['Invoice Number', 'Invoice Date', 'Order ID', 'Channel', 'Customer Name', 'Customer Phone', 'Customer GSTIN', 'Place of Supply', 'Taxable Amount (INR)', 'CGST 9% (INR)', 'SGST 9% (INR)', 'Total GST 18% (INR)', 'Delivery Charge (INR)', 'Grand Total (INR)', 'Payment Status', 'Payment Method'];
    const rows = invoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.orderId}"`,
      `"${inv.isOfflineInvoice || inv.orderSource === 'offline_counter' || inv.orderId.startsWith('HH-OFF-') ? 'Offline Counter' : 'Online Store'}"`,
      `"${(inv.customerDetails?.name || '').replace(/"/g, '""')}"`,
      `"${inv.customerDetails?.phone || ''}"`,
      `"${inv.customerDetails?.gstin || ''}"`,
      `"${inv.placeOfSupply || '19-West Bengal'}"`,
      inv.taxableAmount,
      inv.cgstAmount,
      inv.sgstAmount,
      inv.totalGstAmount,
      inv.deliveryCharge || 0,
      inv.grandTotal,
      `"${inv.paymentStatus}"`,
      `"${inv.paymentMethod}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_GST_Invoices_GSTR1_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('GST Register Exported', 'GST Tax Invoices exported for accounting and GSTR-1.', 'success');
  };

  const exportCustomersCsv = () => {
    if (customersList.length === 0) {
      showToast('No Customers', 'No customer records available to export.', 'info');
      return;
    }
    const headers = ['Customer Name', 'Phone Number', 'Customer Type', 'GSTIN', 'Address', 'Total Orders Placed', 'Product Revenue - Excl Delivery (INR)', 'Total Paid - Incl Delivery (INR)', 'Last Order Date'];
    const rows = customersList.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.isOffline ? 'Offline Counter' : 'Online Store'}"`,
      `"${c.gstin || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.orderCount,
      c.totalProductRevenue.toFixed(2),
      c.totalSpent.toFixed(2),
      `"${c.lastOrder}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HH_Customers_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Customers Exported', 'Customer directory downloaded as CSV.', 'success');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAdminSettings(settingsForm);
  };

  const handleTestWhatsAppCloudApi = async () => {
    setIsTestingWhatsApp(true);
    setTestWhatsAppResult(null);
    try {
      const res = await testWhatsAppCloudApi(
        settingsForm.whatsappPhoneNumberId,
        settingsForm.whatsappCloudApiToken,
        settingsForm.adminWhatsAppNumber || settingsForm.ownerWhatsApp || '8017341130'
      );
      setTestWhatsAppResult(res);
      if (res.success) {
        showToast('Test Alert Sent', 'Test WhatsApp message sent to admin number +91 8017341130!', 'success');
      } else {
        showToast('Test Alert Failed', res.error || 'Check Phone ID and Token credentials.', 'error');
      }
    } catch (e: any) {
      setTestWhatsAppResult({ success: false, error: e.message || 'Network error communicating with WhatsApp endpoint' });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const handleDispatchOrderViaCloudApi = async (orderId: string) => {
    setDispatchingOrderCloudId(orderId);
    try {
      await sendOrderViaCloudApi(orderId);
    } finally {
      setDispatchingOrderCloudId(null);
    }
  };


  // Format MM:SS for countdown timer
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- AUTHENTICATION GATEWAY: FACTORY STAFF OR ADMINISTRATOR ---
  if (!isAdminUnlocked && !isFactoryStaffUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top Security Gold Accent */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${
            loginMode === 'staff'
              ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600'
              : 'bg-gradient-to-r from-[#C5A059] via-[#DFC283] to-[#9A7B38]'
          }`} />

          {loginStep === 'credentials' ? (
            /* STEP 1: FACTORY STAFF PIN, ADMIN CREDENTIALS OR MASTER PIN */
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center space-y-1.5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
                  loginMode === 'staff'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                    : 'bg-[#1c1913] text-[#C5A059] border border-[#C5A059]/30'
                }`}>
                  {loginMode === 'staff' ? (
                    <Building2 className="w-7 h-7 text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-7 h-7 text-[#C5A059]" />
                  )}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                  loginMode === 'staff'
                    ? 'bg-amber-950/60 border border-amber-600/40 text-amber-300'
                    : 'bg-[#1a1710] border border-[#C5A059]/40 text-[#DFC283]'
                }`}>
                  <Lock className="w-3 h-3" />
                  <span>{loginMode === 'staff' ? 'Factory Counter Dispatch' : 'Secure Administrator Portal'}</span>
                </div>
                <h2 className="font-heading text-2xl font-extrabold text-white">
                  {loginMode === 'staff' ? 'Factory Staff Login' : 'Administrator Login'}
                </h2>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {loginMode === 'staff'
                    ? 'Enter 4-digit staff PIN for incoming orders, status confirmation, and offline GST invoices.'
                    : 'Authenticate to access and manage HH Mineral Water operations & store settings.'}
                </p>
              </div>

              {/* Login Method Tabs */}
              <div className="grid grid-cols-3 p-1 bg-[#161616] rounded-xl border border-[#282828] text-xs font-bold gap-1">
                <button
                  type="button"
                  id="tab-login-staff"
                  onClick={() => {
                    setLoginMode('staff');
                    setAuthError(null);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-center ${
                    loginMode === 'staff'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 shadow-xs font-extrabold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px]">Factory Staff</span>
                </button>
                <button
                  type="button"
                  id="tab-login-credentials"
                  onClick={() => {
                    setLoginMode('credentials');
                    setAuthError(null);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-center ${
                    loginMode === 'credentials'
                      ? 'bg-[#221e14] text-[#DFC283] border border-[#C5A059]/40 shadow-xs font-extrabold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5 text-[#DFC283] shrink-0" />
                  <span className="text-[11px]">Password 2FA</span>
                </button>
                <button
                  type="button"
                  id="tab-login-pin"
                  onClick={() => {
                    setLoginMode('pin');
                    setAuthError(null);
                  }}
                  className={`py-2 px-1 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer text-center ${
                    loginMode === 'pin'
                      ? 'bg-[#221e14] text-[#DFC283] border border-[#C5A059]/40 shadow-xs font-extrabold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-[#DFC283] shrink-0" />
                  <span className="text-[11px]">Master PIN</span>
                </button>
              </div>

              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{authError}</span>
                </div>
              )}

              {loginMode === 'staff' ? (
                /* FACTORY STAFF 4-DIGIT PIN FORM */
                <form onSubmit={handleStaffPinSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-neutral-300">
                        Enter 4-Digit Factory Staff PIN
                      </label>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      maxLength={4}
                      value={staffPinInput}
                      onChange={e => setStaffPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      autoFocus
                      className="w-full text-center tracking-[0.8em] text-2xl font-black font-mono py-3 rounded-2xl border-2 border-[#333333] focus:border-amber-400 focus:outline-none shadow-inner bg-[#181818] text-amber-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || staffPinInput.length !== 4}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Verifying Staff PIN...</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4" />
                        <span>Unlock Factory Staff Counter</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-neutral-500 text-center pt-1 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-500/80" />
                    <span>Factory Staff Login PIN can only be changed by Owner Admin.</span>
                  </p>
                </form>
              ) : loginMode === 'credentials' ? (
                <form onSubmit={handleStep1Submit} className="space-y-4" autoComplete="off">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Username / Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="Enter administrator username or email"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#333333] text-sm font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059] transition-all bg-[#181818]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Administrator Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="Enter administrator password"
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#333333] text-sm font-medium text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059] transition-all bg-[#181818]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Step 2 (Send OTP)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMasterPinSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-neutral-300">
                        Enter 6-Digit Master Security PIN
                      </label>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        Manual Verification
                      </span>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={masterPinInput}
                      onChange={e => setMasterPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      autoFocus
                      className="w-full text-center tracking-[0.6em] text-2xl font-black font-mono py-3 rounded-2xl border-2 border-[#333333] focus:border-[#C5A059] focus:outline-none shadow-inner bg-[#181818] text-white"
                    />
                    <p className="text-[11px] text-neutral-400 text-center mt-2">
                      Enter the 6-digit owner Master PIN to unlock full administrative controls.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || masterPinInput.length !== 6}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Verifying PIN...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify PIN & Unlock</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="pt-3 border-t border-[#262626] flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by HH Mineral Water Security Engine</span>
              </div>
            </div>
          ) : (
            /* STEP 2: EMAIL & PHONE OTP VERIFICATION */
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center space-y-1.5">
                <div className="w-14 h-14 rounded-2xl bg-[#1c1913] text-[#C5A059] border border-[#C5A059]/30 flex items-center justify-center mx-auto shadow-md">
                  <Mail className="w-7 h-7" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#1a1710] border border-[#C5A059]/40 text-[#DFC283] text-[11px] font-bold">
                  <Clock className="w-3 h-3 text-[#C5A059]" />
                  <span>Step 2 of 2: Security Verification</span>
                </div>
                <h2 className="font-heading text-2xl font-extrabold text-white">
                  Enter 6-Digit OTP
                </h2>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  A one-time verification code has been dispatched to your registered admin accounts.
                </p>
              </div>

              {/* Destination channels card */}
              <div className="bg-[#181818] border border-[#2e2e2e] rounded-2xl p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#DFC283]" />
                    <span>Admin Email ID:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white">{maskedEmail || 'mdh***07@gmail.com'}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-[10px] text-emerald-300 font-bold">
                      Sent
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp ID:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white">{targetPhone || '+91 8017341130'}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700/50 text-[10px] text-emerald-300 font-bold">
                      Dispatched
                    </span>
                  </div>
                </div>
              </div>

              {whatsappOtpUrl && (
                <a
                  href={whatsappOtpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:shadow-emerald-900/30"
                >
                  <Phone className="w-4 h-4" />
                  <span>Open WhatsApp to Receive OTP Message</span>
                </a>
              )}

              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{authError}</span>
                </div>
              )}

              <form onSubmit={handleStep2Submit} className="space-y-4" autoComplete="off">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-300">
                      Enter 6-Digit Verification Code (OTP)
                    </label>
                    <span className={`text-xs font-mono font-bold ${otpTimeRemaining < 60 ? 'text-rose-400 animate-pulse' : 'text-neutral-400'}`}>
                      Expires: {formatTimer(otpTimeRemaining)}
                    </span>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    autoComplete="new-password"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    autoFocus
                    className="w-full text-center tracking-[0.6em] text-2xl font-black font-mono py-3 rounded-2xl border-2 border-[#333333] focus:border-[#C5A059] focus:outline-none shadow-inner bg-[#181818] text-white"
                  />
                  <p className="text-[11px] text-neutral-400 text-center mt-2">
                    Enter the 6-digit OTP sent to your registered Email ID and WhatsApp.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpTimeRemaining === 0 || otpInput.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Validating Code...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      <span>Verify & Open Admin Panel</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('credentials');
                    setAuthError(null);
                    setOtpInput('');
                  }}
                  className="text-neutral-400 hover:text-white font-semibold cursor-pointer"
                >
                  ← Back to Login
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting || resendCooldown > 0}
                  className="text-[#DFC283] hover:text-white font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- UNLOCKED ADMIN DASHBOARD ---
  return (
    <div className="admin-panel-root max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in">
      {/* Admin / Factory Staff Top Header with Active Session Indicator */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border text-white p-6 rounded-3xl shadow-xl ${
        isFactoryStaffMode
          ? 'bg-gradient-to-r from-[#17140e] via-[#121212] to-[#17140e] border-amber-600/40'
          : 'bg-[#121212] border-[#262626]'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isFactoryStaffMode
              ? 'bg-amber-950/70 border border-amber-500/50 text-amber-400'
              : 'bg-[#1c1913] border border-[#C5A059]/40 text-[#C5A059]'
          }`}>
            {isFactoryStaffMode ? <Building2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-white">
                {isFactoryStaffMode ? 'HH FACTORY DISPATCH COUNTER' : 'HH OWNER & ADMIN CONTROL'}
              </h1>
              {isFactoryStaffMode ? (
                <>
                  <span className="bg-amber-950/90 text-amber-300 border border-amber-600/60 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    STAFF COUNTER MODE
                  </span>
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ORDER CONFIRMATION ACTIVE
                  </span>
                </>
              ) : (
                <>
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    2-STEP VERIFIED
                  </span>
                  <span className="bg-[#1c1913] text-[#DFC283] border border-[#C5A059]/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    LIVE DB ACTIVE
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isFactoryStaffMode ? (
                <span>
                  Factory Staff Active • <strong className="text-amber-300">Dashboard, Orders, Bulk, Lab Logs, Invoices, Custom Design Studio &amp; Hero Images</strong>
                </span>
              ) : (
                <span>
                  Authorized Admin: <strong className="text-[#DFC283]">Authorized Administrator</strong> • WhatsApp: <strong>{adminSettings.ownerWhatsApp}</strong>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Session Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Option 2: Live Sound Alert Chime Switch */}
          <button
            type="button"
            onClick={toggleSoundAlert}
            className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
              soundAlertEnabled
                ? 'bg-amber-950/70 text-amber-300 border-amber-600/60 shadow-xs'
                : 'bg-[#181818] text-neutral-400 border-[#333333] hover:bg-[#222222]'
            }`}
            title={soundAlertEnabled ? 'Order sound chime active. Click to mute.' : 'Order sound chime muted. Click to enable.'}
          >
            {soundAlertEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{soundAlertEnabled ? 'Sound: ON' : 'Sound: OFF'}</span>
          </button>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={testSoundAlert}
            className="text-xs font-medium px-2.5 py-2 rounded-xl transition-all border border-[#333333] bg-[#181818] hover:bg-[#222222] text-neutral-300 flex items-center gap-1 cursor-pointer"
            title="Test melodic order bell chime sound right now"
          >
            <BellRing className="w-3.5 h-3.5 text-[#DFC283]" />
            <span className="hidden sm:inline">Test Chime</span>
          </button>

          {/* Desktop Push Alert Toggle */}
          <button
            type="button"
            onClick={toggleBrowserNotification}
            className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
              browserNotificationEnabled
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60'
                : 'bg-[#181818] text-neutral-400 border-[#333333] hover:bg-[#222222]'
            }`}
            title="Toggle desktop browser push notifications for incoming orders"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span>{browserNotificationEnabled ? 'Push: ON' : 'Push: OFF'}</span>
          </button>



          {/* Quick Scan-to-Deliver Modal Trigger */}
          <button
            type="button"
            id="btn-open-quick-deliver-scanner"
            onClick={() => setIsQuickDeliverScannerOpen(true)}
            className="text-xs font-black px-3.5 py-2 rounded-xl transition-all bg-gradient-to-r from-[#C5A059] to-[#DFC283] hover:brightness-110 text-black shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Open Dispatch QR Scanner Overlay to mark matched orders as Delivered automatically"
          >
            <ScanLine className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>Scan QR to Deliver</span>
          </button>

          {/* SELECTIVE PRODUCT VISIBILITY SUMMARY (OWNER ADMIN ONLY) */}
          {!isFactoryStaffMode && isAdminUnlocked && (
            <button
              type="button"
              id="header-btn-selective-visibility"
              onClick={() => setActiveTab('products')}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] text-neutral-200 border border-[#333333] flex items-center gap-2 cursor-pointer transition-all tabular-nums"
              title="Manage selective SHOW / NOT SHOW visibility per product"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Visible: {products.filter(p => isProductVisibleInStore(p, adminSettings)).length}/{products.length}
              </span>
            </button>
          )}

          {!isFactoryStaffMode && (
            <button
              onClick={() => setActiveTab('security-audit')}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'security-audit'
                  ? 'bg-[#C5A059] text-black font-black border-[#C5A059] shadow-md'
                  : 'bg-[#181818] hover:bg-[#222222] text-neutral-300 border-[#333333]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          )}

          {isFactoryStaffMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  factoryStaffLogout();
                  setLoginMode('credentials');
                }}
                className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-600/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Switch to Administrator Login"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                onClick={factoryStaffLogout}
                className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-rose-950 hover:text-rose-200 text-neutral-300 transition-colors border border-[#333333] flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Staff Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={adminLogout}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-rose-950 hover:text-rose-200 text-neutral-300 transition-colors border border-[#333333] flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Option 2: Live Incoming Order Instant Alert Banner */}
      {latestIncomingOrder && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#0e2a1b] to-emerald-950 border-2 border-emerald-500/80 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shrink-0 animate-pulse">
              <BellRing className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black uppercase tracking-wider">
                  ⚡ NEW INCOMING ORDER
                </span>
                <span className="text-xs text-emerald-200 font-mono font-bold">
                  #{latestIncomingOrder.id}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {new Date(latestIncomingOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                {latestIncomingOrder.customer?.name} • ₹{latestIncomingOrder.totalAmount} • {latestIncomingOrder.items?.length || 1} product(s) • {latestIncomingOrder.paymentMethod}
              </p>
              <p className="text-xs text-emerald-300/80">
                Phone: {latestIncomingOrder.customer?.phone} • Address: {latestIncomingOrder.customer?.address || 'Direct Plant Fulfillment'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
            <button
              type="button"
              onClick={testSoundAlert}
              className="px-3 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 text-xs font-bold border border-emerald-600/50 flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Replay Chime</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderSearchQuery(latestIncomingOrder.id);
                setActiveTab('orders');
                clearIncomingOrderAlert();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Order</span>
            </button>
            <button
              type="button"
              onClick={clearIncomingOrderAlert}
              className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#282828] text-neutral-400 hover:text-white border border-[#333333] cursor-pointer"
              title="Dismiss alert"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#262626] pb-2 text-xs font-bold">
        {(isFactoryStaffMode ? [
          { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'orders', label: `Orders Management (${orders.length})`, icon: ShoppingBag, badge: newOrdersCount > 0 ? `${newOrdersCount} New` : undefined },
          { id: 'dispatch-board', label: 'Dispatch Board', icon: Truck },
          { id: 'dispatch-qr', label: 'Dispatch QR Counter', icon: QrCode },
          { id: 'bulk-inquiries', label: 'Bulk & Events', icon: Building2 },
          { id: 'water-quality', label: 'Water Quality & Lab Logs', icon: Sparkles },
          { id: 'invoices', label: `GST Invoices (${invoices.length})`, icon: Receipt },
          { id: 'custom-orders', label: `Custom Design Studio (${customOrdersCount})`, icon: Sparkles },
          { id: 'visuals', label: 'Hero & Bottle Images', icon: ImageIcon }
        ] : [
          { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
          { id: 'ai-command-center', label: 'AI Command Center', icon: Cpu, badge: 'Level 3' },
          { id: 'orders', label: `Orders Management (${orders.length})`, icon: ShoppingBag, badge: newOrdersCount > 0 ? `${newOrdersCount} New` : undefined },
          { id: 'dispatch-board', label: 'Dispatch Board', icon: Truck },
          { id: 'dispatch-qr', label: 'Dispatch QR Counter', icon: QrCode },
          { id: 'bulk-inquiries', label: 'Bulk & Events', icon: Building2 },
          { id: 'water-quality', label: 'Water Quality & Lab Logs', icon: Sparkles },
          { id: 'expenses', label: 'Plant Expenses', icon: DollarSign },
          { id: 'invoices', label: `GST Invoices (${invoices.length})`, icon: Receipt },
          { id: 'accounting-audit', label: 'Journal & CA Audit', icon: Scale, badge: 'Final A/c' },
          { id: 'custom-orders', label: `Custom Design Studio (${customOrdersCount})`, icon: Sparkles },
          { id: 'products', label: `Product Catalog (${products.length})`, icon: Package },
          { id: 'visuals', label: 'Hero & Bottle Images', icon: ImageIcon },
          { id: 'customers', label: `Customers (${customersList.length})`, icon: Users },
          { id: 'settings', label: 'Store & GST Settings', icon: Settings },
          { id: 'security-audit', label: 'Security & Audit Logs', icon: ShieldAlert }
        ]).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isVisualsTab = tab.id === 'visuals';
          return (
            <button
              key={tab.id}
              id={`btn-admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#C5A059] via-[#DFC283] to-[#D4AF37] text-black font-black shadow-md shadow-[#C5A059]/20 border border-[#DFC283]'
                  : 'bg-[#141414] hover:bg-[#1a1710] text-neutral-300 hover:text-[#DFC283] border border-[#282828] hover:border-[#C5A059]/50 shadow-xs'
              } ${isVisualsTab && !isActive ? 'border-[#C5A059]/35 hover:border-[#C5A059]' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-black stroke-[2.5]' : 'text-[#C5A059] group-hover:text-[#DFC283] stroke-[2]'}`} />
              <span className="tracking-tight whitespace-nowrap">{tab.label}</span>
              {tab.badge && (
                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
              {isVisualsTab && !tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider ${
                  isActive
                    ? 'bg-black/20 text-black font-black'
                    : 'bg-[#1c1913] text-[#DFC283] border border-[#C5A059]/40'
                }`}>
                  {adminSettings?.heroMediaType === 'video' ? 'Reel' : 'Photo'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB: SECURITY & AUDIT LOGS */}
      {activeTab === 'security-audit' && !isFactoryStaffMode && (
        <div className="space-y-6 animate-in fade-in">
          {/* Security Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Authorized Account</span>
                  <p className="text-xs font-mono font-bold text-slate-900 truncate">Administrator (Protected)</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Session Policy</span>
                  <p className="text-xs font-bold text-slate-900">4 Hours TTL • Auto Expire</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Session Security</span>
                <p className="text-xs font-bold text-rose-600">Terminate All Active Devices</p>
              </div>
              <button
                onClick={adminLogoutAll}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer transition-colors"
              >
                Logout All
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Live Security & Administrative Audit Logs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological trail of administrative logins, OTP dispatches, status transitions, and settings changes.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={loadAuditLogs}
                  disabled={isLoadingAuditLogs}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAuditLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Logs</span>
                </button>

                {auditLogsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmClearAuditLogsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer transition-colors"
                    title="Clear security and audit events"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Clear Audit Trail ({auditLogsList.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3">Details / Context</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No audit events recorded in this cycle.
                      </td>
                    </tr>
                  ) : (
                    auditLogsList.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {log.action}
                        </td>
                        <td className="p-3 text-slate-600 max-w-md">
                          {log.details}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {log.ip}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'WARNING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Quick Counter Sales & Offline Billing Action Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 border border-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 flex items-center justify-center font-bold shadow-xs shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-white">
                    Counter Sales & Offline GST Invoicing
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    Auto-credited to Revenue
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Issue compliant 18% GST tax invoices for walk-in factory buyers, direct counter sales, and local institutional orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                id="dashboard-generate-offline-invoice-btn"
                onClick={() => {
                  setSelectedCustomerForOfflineInvoice(null);
                  setIsOfflineInvoiceModalOpen(true);
                }}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>+ Generate Offline GST Invoice</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 block uppercase">Product Revenue</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Excl. Delivery</span>
              </div>
              <span className="font-heading text-2xl font-black text-slate-900 mt-1 block">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mt-1.5 pt-1 border-t border-slate-100">
                <span className="text-cyan-700">Online: ₹{onlineRevenue.toLocaleString('en-IN')}</span>
                <span className="text-amber-700">Offline: ₹{offlineRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 block uppercase">Delivery Collected</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Pass-Through</span>
              </div>
              <span className="font-heading text-2xl font-black text-slate-700 mt-1 block">
                ₹{totalDeliveryCollected.toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">Logistics (Not Profit)</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block uppercase">Total Orders</span>
              <span className="font-heading text-2xl font-black text-cyan-700 mt-1 block">
                {orders.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Gross Invoiced: ₹{totalGrossInvoiced.toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-slate-400 block uppercase">New Orders</span>
              <span className="font-heading text-2xl font-black text-white mt-1 block">
                {newOrdersCount}
              </span>
              <span className="text-[11px] text-cyan-400 font-semibold mt-1 block">Needs Confirmation</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-blue-200 bg-blue-50/40 shadow-xs">
              <span className="text-xs font-bold text-blue-800 block uppercase">In Processing</span>
              <span className="font-heading text-2xl font-black text-blue-900 mt-1 block">
                {processingOrdersCount}
              </span>
              <span className="text-[11px] text-blue-700 font-semibold mt-1 block">Bottling / Dispatch</span>
            </div>
          </div>

          {/* Quick Action & Recent Orders Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Recent Customer Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800"
                >
                  View All ({orders.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {orders.slice(0, 5).map(ord => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-cyan-300 bg-slate-50/60 flex items-center justify-between gap-4 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{ord.id}</span>
                        {ord.isCustomOrder && (
                          <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                            Custom Label
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {ord.customer.name} ({ord.customer.phone}) • {ord.items.length} items
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-heading text-sm font-bold text-slate-900 block">
                        ₹{ord.totalAmount}
                      </span>
                      <a
                        href={getWhatsAppDirectUrl(ord)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 mt-0.5"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp (8017341130)</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Pricing Quick Look */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Live Catalog Prices
                </h3>
                {!isFactoryStaffMode ? (
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-800"
                  >
                    Edit Prices →
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                    Catalog (Admin Only)
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {(() => {
                  const dashboardProducts = isFactoryStaffMode
                    ? products.filter(p => isProductVisibleInStore(p, adminSettings))
                    : products;
                  if (dashboardProducts.length === 0) {
                    return (
                      <div className="p-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-1.5">
                        <EyeOff className="w-5 h-5 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          No Visible Catalog Products
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Selected products are currently set to Not Show by Owner Admin.
                        </p>
                      </div>
                    );
                  }
                  return dashboardProducts.map(prod => {
                    const isSellingOn = prod.showSellingPrice !== false && !(prod.tags || []).includes('selling_price_off') && adminSettings?.showSellingPrice !== false;
                    const isShown = isProductVisibleInStore(prod, adminSettings);
                    const discountPercent = prod.mrp > prod.price ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100) : 0;
                    return (
                      <div
                        key={prod.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          !isShown ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{prod.size} Bottle</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                              isSellingOn ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {isSellingOn ? 'OFFER ON' : 'MRP ONLY'}
                            </span>
                            {!isFactoryStaffMode && !isShown && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded border bg-rose-100 text-rose-800 border-rose-300">
                                NOT SHOW
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{prod.name}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="font-heading text-sm font-black text-cyan-700">₹{isSellingOn ? prod.price : prod.mrp}</span>
                            {isSellingOn && prod.mrp > prod.price && (
                              <span className="text-[10px] text-slate-400 line-through">₹{prod.mrp}</span>
                            )}
                          </div>
                          {isSellingOn && discountPercent > 0 && (
                            <span className="text-[9px] font-extrabold text-emerald-600 block">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Smart Auto-Progression Workflow Control Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-5 rounded-3xl border border-cyan-800/40 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                adminSettings.autoProgressOrders
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 ring-4 ring-cyan-500/10 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-sm text-white">Automated Order Status Progression</h4>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    adminSettings.autoProgressOrders
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1.5'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {adminSettings.autoProgressOrders && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />}
                    {adminSettings.autoProgressOrders ? 'Auto-Update: Active' : 'Auto-Update: Paused'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {adminSettings.autoProgressOrders
                    ? `Auto-advancing active orders every ${adminSettings.autoProgressIntervalMinutes || 2} min(s) (New ➔ Confirmed ➔ Bottling ➔ Ready ➔ Dispatch ➔ Delivered).`
                    : 'Automated order status progression is currently paused. Toggle on to auto-advance orders.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* Stage timing selector */}
              <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-xs">
                <span className="text-slate-400 px-2 font-semibold text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Interval:
                </span>
                {[
                  { label: '1m (Demo)', val: 1 },
                  { label: '2m', val: 2 },
                  { label: '5m', val: 5 },
                ].map(intvl => (
                  <button
                    key={intvl.val}
                    type="button"
                    onClick={() => updateAdminSettings({ ...adminSettings, autoProgressIntervalMinutes: intvl.val })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (adminSettings.autoProgressIntervalMinutes || 2) === intvl.val
                        ? 'bg-cyan-600 text-white shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {intvl.label}
                  </button>
                ))}
              </div>

              {/* Fast-forward / Auto update batch button */}
              <button
                type="button"
                onClick={handleBatchAutoProgress}
                disabled={isBatchProgressing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Run auto-progression immediately on all eligible active orders"
              >
                <FastForward className={`w-3.5 h-3.5 ${isBatchProgressing ? 'animate-spin' : ''}`} />
                <span>{isBatchProgressing ? 'Advancing...' : 'Auto-Advance Batch'}</span>
              </button>

              {/* Toggle switch button */}
              <button
                type="button"
                onClick={() => toggleAutoProgressOrders()}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  adminSettings.autoProgressOrders
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {adminSettings.autoProgressOrders ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Auto</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Enable Auto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={e => setOrderSearchQuery(e.target.value)}
                placeholder="Search by Order ID, name, or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
                {[
                  'all',
                  'New',
                  'Confirmed',
                  'Processing',
                  'Ready',
                  'Out for Delivery',
                  'Delivered',
                  'Cancelled'
                ].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st === 'all' ? 'All' : st}
                  </button>
                ))}
              </div>

              {/* Offline vs Online Channel Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <span className="text-[11px] font-bold text-slate-500">Source:</span>
                <select
                  value={offlineOrderFilter}
                  onChange={e => setOfflineOrderFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">All Sources</option>
                  <option value="online">Online Web Orders</option>
                  <option value="offline">Offline Counter Sales</option>
                </select>
              </div>

              {/* Switch to 3-Column Dispatch Board */}
              <button
                type="button"
                id="btn-orders-open-dispatch-board"
                onClick={() => setActiveTab('dispatch-board')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-sky-700" />
                <span>Dispatch Board</span>
              </button>

              {/* Generate Offline GST Invoice Trigger */}
              <button
                type="button"
                id="btn-orders-new-offline-invoice"
                onClick={() => {
                  setSelectedCustomerForOfflineInvoice(null);
                  setIsOfflineInvoiceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Offline GST Invoice</span>
              </button>

              <button
                type="button"
                onClick={exportOrdersCsv}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Download All Orders as CSV"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export Orders (CSV)</span>
              </button>

              {!isFactoryStaffMode && orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteAllOrdersOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  title="Delete All Orders in System"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete All Orders ({orders.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Orders Table / Cards */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
                No orders match the selected filters.
              </div>
            ) : (
              filteredOrders.map(ord => {
                const whatsAppUrl = getWhatsAppDirectUrl(ord);

                return (
                  <div
                    key={ord.id}
                    className={`bg-white rounded-3xl border p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow ${
                      ord.status === 'Cancelled' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: ID, Time, Custom Badge, Status Selector & Quick Status Buttons */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-black text-slate-900">
                            {ord.id}
                          </span>
                          {ord.isCustomOrder && (
                            <span className="text-[11px] font-bold bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Sparkles className="w-3 h-3" />
                              CUSTOM DESIGN ORDER
                            </span>
                          )}
                          {(ord.isOfflineSale || ord.customer.isOfflineCustomer) && (
                            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <Receipt className="w-3 h-3 text-amber-700" />
                              OFFLINE COUNTER SALE
                            </span>
                          )}
                          {ord.status === 'Cancelled' && (
                            <span className="text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Ban className="w-3 h-3 text-rose-600" />
                              CANCELLED
                            </span>
                          )}
                          {ord.adminEmailNotification?.status === 'SENT' ? (
                            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs" title={`Dispatched to ${(ord.adminEmailNotification.targetEmails || []).join(', ')}`}>
                              <Mail className="w-3 h-3 text-emerald-600" />
                              ADMIN EMAIL SENT
                            </span>
                          ) : ord.adminEmailNotification?.status === 'CONFIG_REQUIRED' ? (
                            <span className="text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs" title="Order details logged and ready for admin inbox">
                              <Mail className="w-3 h-3 text-blue-600" />
                              EMAIL LOGGED
                            </span>
                          ) : null}
                          <span className="text-xs text-slate-400">
                            • {new Date(ord.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Status Update Control & 1-Click Transitions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Auto-Advance Next Stage */}
                        {ord.status !== 'Delivered' && ord.status !== 'Cancelled' && ord.status !== 'Failed' && (
                          <button
                            type="button"
                            onClick={() => autoAdvanceOrder(ord.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-300 text-xs font-bold transition-colors cursor-pointer"
                            title="Advance order to next workflow stage"
                          >
                            <FastForward className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Advance Stage</span>
                          </button>
                        )}

                        {/* Quick 1-Click State Buttons */}
                        {ord.status === 'New' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(ord.id, 'Confirmed')}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ✓ Confirm Order
                          </button>
                        )}
                        {ord.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(ord.id, 'Processing')}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ⚙ Start Bottling
                          </button>
                        )}
                        {ord.status === 'Processing' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(ord.id, 'Out for Delivery')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            🚚 Out for Delivery
                          </button>
                        )}
                        {ord.status === 'Out for Delivery' && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(ord.id, 'Delivered')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ✓ Mark Delivered
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500">Status:</span>
                          <select
                            value={ord.status}
                            onChange={e => {
                              const newSt = e.target.value as OrderStatus;
                              if (newSt === 'Cancelled') {
                                setOrderToCancel(ord);
                              } else {
                                updateOrderStatus(ord.id, newSt);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-cyan-500 cursor-pointer ${
                              ord.status === 'Cancelled'
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="New">New (Needs review)</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing (Bottling)</option>
                            <option value="Ready">Ready for Dispatch</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            {!isFactoryStaffMode && <option value="Cancelled">Cancelled</option>}
                          </select>
                        </div>

                        {/* Admin Action: Cancel Order Button (Admin Only) */}
                        {!isFactoryStaffMode && ord.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => setOrderToCancel(ord)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Cancel Order (Admin only)"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            <span>Cancel</span>
                          </button>
                        )}

                        {/* Admin Action: Delete Order Button (Admin Only) */}
                        {!isFactoryStaffMode && (
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(ord)}
                            className="flex items-center gap-1 p-1.5 rounded-lg bg-slate-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Permanently Delete Order Record (Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Prominent Cancellation Reason Banner if Cancelled */}
                    {ord.status === 'Cancelled' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-rose-900">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-bold text-xs">Order Cancelled</span>
                            {ord.statusHistory && ord.statusHistory.filter(h => h.status === 'Cancelled').length > 0 && (
                              <span className="text-xs text-rose-700 font-medium ml-1">
                                — {ord.statusHistory.filter(h => h.status === 'Cancelled').slice(-1)[0].note}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-rose-600 font-semibold bg-white/70 px-2 py-0.5 rounded-lg border border-rose-200">
                          Admin Authorization Required to Re-open
                        </span>
                      </div>
                    )}

                    {/* Mid Section: Customer Details & Ordered Products */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Customer info & Delivery/Pickup Method */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-800 uppercase tracking-wide">Customer & Delivery</h5>
                          {ord.deliveryType === 'self_pickup' ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <span>🏬 Self Pickup</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 flex items-center gap-1">
                              <span>🚚 Delivery (&lt;{adminSettings?.maxDeliveryRadiusKm || 7}km)</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{ord.customer.name}</p>
                          <p className="text-slate-600 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <a href={`tel:${ord.customer.phone}`} className="text-cyan-700 hover:underline">
                              {ord.customer.phone}
                            </a>
                          </p>
                        </div>

                        {ord.deliveryType === 'self_pickup' ? (
                          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                            <p className="font-bold flex items-center gap-1 text-emerald-800">
                              <span>Pickup at Factory Counter #1</span>
                            </p>
                            <p className="text-emerald-700">Slot: {ord.pickupSlot || 'Standard 30 min ready window'}</p>
                            <p className="text-emerald-600 text-[10px]">Zero delivery charge applied</p>
                          </div>
                        ) : (
                          <div className="text-slate-600 mt-1 space-y-1">
                            <p className="text-[11px] text-slate-500 font-medium">
                              Address: {ord.customer.address}, {ord.customer.landmark ? ord.customer.landmark + ', ' : ''}
                              {ord.customer.city} - {ord.customer.pincode}
                            </p>
                            {ord.deliveryDistanceKm !== undefined && ord.deliveryDistanceKm > 0 && (
                              <p className="text-[10px] text-cyan-700 font-bold">
                                Distance from factory: ~{ord.deliveryDistanceKm} km (Under {adminSettings?.maxDeliveryRadiusKm || 7} km limit)
                              </p>
                            )}
                            {(ord.deliveryCoordinates || ord.customer.deliveryCoordinates) && (
                              <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  GPS Pinned ({((ord.deliveryCoordinates || ord.customer.deliveryCoordinates)!).lat.toFixed(5)}, {((ord.deliveryCoordinates || ord.customer.deliveryCoordinates)!).lng.toFixed(5)})
                                </span>
                                {((ord.deliveryCoordinates || ord.customer.deliveryCoordinates)!).gateNote && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-[10px]">
                                    Note: {((ord.deliveryCoordinates || ord.customer.deliveryCoordinates)!).gateNote}
                                  </span>
                                )}
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${((ord.deliveryCoordinates || ord.customer.deliveryCoordinates)!).lat},${((ord.deliveryCoordinates || ord.customer.deliveryCoordinates)!).lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-cyan-700 hover:text-cyan-900 font-bold underline"
                                >
                                  <span>Open Google Maps</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Products Summary */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 md:col-span-2">
                        <h5 className="font-bold text-slate-800 uppercase tracking-wide">Items Summary</h5>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800">
                                  {item.product.name} ({item.product.size})
                                </span>
                                {item.isCustomDesign && item.customDesignDetails && (
                                  <span className="block text-[11px] text-cyan-800">
                                    Branding: "{item.customDesignDetails.businessName}" • {item.customDesignDetails.finishType}
                                  </span>
                                )}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {item.quantity} pcs @ ₹{item.unitPrice} = ₹{item.quantity * item.unitPrice}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                          <span>Total Amount:</span>
                          <span className="font-heading text-base font-black text-cyan-800">
                            ₹{ord.totalAmount} ({ord.paymentMethod})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Original Uploaded Images Row if custom design */}
                    {ord.hasOriginalImage && (
                      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Original Customer Files for Printing
                          </span>
                          <span className="text-[10px] text-slate-400">High-Resolution Preserved</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {ord.items.flatMap(item =>
                            (item.customDesignDetails?.uploadedImages || []).map((img, i) => (
                              <div
                                key={i}
                                className="bg-slate-800 rounded-xl p-2 border border-slate-700 flex items-center gap-3"
                              >
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-10 h-10 object-contain rounded bg-black/50 p-0.5"
                                />
                                <div className="text-[11px]">
                                  <p className="font-semibold text-slate-200 truncate max-w-[140px]">
                                    {img.name}
                                  </p>
                                  <a
                                    href={img.url}
                                    download={img.name || 'hh-custom-artwork.png'}
                                    className="text-cyan-400 hover:text-cyan-300 font-bold text-[10px] flex items-center gap-1 mt-0.5"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Download Original File</span>
                                  </a>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Bar: Invoice Generation & Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct GST Invoice Print Trigger */}
                        <button
                          type="button"
                          id={`btn-print-order-invoice-${ord.id}`}
                          disabled={orderActionLoading === `print-${ord.id}`}
                          onClick={async () => {
                            setOrderActionLoading(`print-${ord.id}`);
                            try {
                              await openInvoiceForOrder(ord, true);
                            } catch (err) {
                              console.error('Print invoice error:', err);
                              showToast('Invoice Notice', 'Opening GST Tax Invoice...', 'info');
                            } finally {
                              setOrderActionLoading(null);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Print official GST Tax Invoice"
                        >
                          <Printer className={`w-3.5 h-3.5 text-white ${orderActionLoading === `print-${ord.id}` ? 'animate-spin' : ''}`} />
                          <span>{orderActionLoading === `print-${ord.id}` ? 'Opening...' : 'Print Invoice'}</span>
                        </button>

                        {/* Direct GST Invoice Modal Trigger */}
                        <button
                          type="button"
                          id={`btn-view-order-invoice-${ord.id}`}
                          disabled={orderActionLoading === `view-${ord.id}`}
                          onClick={async () => {
                            setOrderActionLoading(`view-${ord.id}`);
                            try {
                              await openInvoiceForOrder(ord, false);
                            } catch (err) {
                              console.error('View invoice error:', err);
                              showToast('Invoice Notice', 'Opening GST Tax Invoice...', 'info');
                            } finally {
                              setOrderActionLoading(null);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Generate & View GST Tax Invoice"
                        >
                          <Receipt className="w-3.5 h-3.5 text-cyan-300" />
                          <span>{orderActionLoading === `view-${ord.id}` ? 'Loading...' : 'View GST Invoice'}</span>
                        </button>

                        {/* Delivery Slip / Challan Modal Trigger */}
                        <button
                          type="button"
                          id={`btn-delivery-challan-${ord.id}`}
                          onClick={() => setSelectedChallanOrder(ord)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 active:bg-cyan-200 text-cyan-900 font-bold border border-cyan-200 shadow-2xs transition-colors cursor-pointer"
                          title="Print Delivery Dispatch Challan"
                        >
                          <Truck className="w-3.5 h-3.5 text-cyan-700" />
                          <span>Delivery Challan</span>
                        </button>

                        {/* Order Dispatch QR Code & Counter Verification Modal Trigger */}
                        <button
                          type="button"
                          id={`btn-order-qr-${ord.id}`}
                          onClick={() => setSelectedQrOrder(ord)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border shadow-2xs transition-colors cursor-pointer ${
                            ord.dispatchVerifiedAt
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                          }`}
                          title="View/Print unique Dispatch QR code or mark order verified at factory dispatch counter"
                        >
                          <QrCode className={`w-3.5 h-3.5 ${ord.dispatchVerifiedAt ? 'text-emerald-700' : 'text-amber-700'}`} />
                          <span>{ord.dispatchVerifiedAt ? 'QR Verified ✓' : 'Dispatch QR'}</span>
                        </button>

                        {/* Driver Navigation & Dispatch (Google Maps) */}
                        {ord.deliveryType !== 'self_pickup' && (
                          <button
                            type="button"
                            id={`btn-driver-nav-${ord.id}`}
                            onClick={() => setSelectedNavOrder(ord)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-2xs transition-all cursor-pointer"
                            title="Open Google Maps live turn-by-turn route to customer's pinned location and share dispatch navigation link with driver"
                          >
                            <Navigation className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Driver Navigation & Dispatch</span>
                          </button>
                        )}

                        {/* Option 4: Automated Background Meta WhatsApp Cloud API Dispatch */}
                        <button
                          type="button"
                          disabled={dispatchingOrderCloudId === ord.id}
                          onClick={() => handleDispatchOrderViaCloudApi(ord.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/70 font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Deliver order alert directly to +91 8017341130 in the background via Meta Cloud API without opening WhatsApp"
                        >
                          {dispatchingOrderCloudId === ord.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>Auto-Send Cloud API</span>
                        </button>

                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Direct WhatsApp (+91 {OWNER_WHATSAPP_NUMBER})</span>
                        </a>

                        <button
                          type="button"
                          disabled={emailingOrderId === ord.id}
                          onClick={async () => {
                            setEmailingOrderId(ord.id);
                            await triggerAdminOrderEmail(ord.id);
                            setEmailingOrderId(null);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-sky-100 border border-sky-700/60 font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                          title="Send or resend full order details to admin email ID (mdc37332@gmail.com, mdhussain170707@gmail.com)"
                        >
                          {emailingOrderId === ord.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-300" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-sky-300" />
                          )}
                          <span>Email Order to Admin</span>
                        </button>

                        {ord.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => setOrderToCancel(ord)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                            title="Cancel Order (Admin only)"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            <span>Cancel Order</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setOrderToDelete(ord)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                          title="Delete Order (Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete Order</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: LEVEL 3 AUTONOMOUS AI COMMAND CENTER (OWNER ONLY) */}
      {activeTab === 'ai-command-center' && !isFactoryStaffMode && (
        <AiCommandCenterTab />
      )}

      {/* TAB: VISUAL DISPATCH LOGISTICS BOARD (PENDING / IN-TRANSIT / DELIVERED) */}
      {activeTab === 'dispatch-board' && (
        <DispatchBoardTab
          isFactoryStaffMode={isFactoryStaffMode}
          onOpenDeliveryChallan={ord => setSelectedChallanOrder(ord)}
          onOpenOrderQrModal={ord => setSelectedQrOrder(ord)}
          onOpenDriverNav={ord => setSelectedNavOrder(ord)}
          onOpenOrdersList={() => setActiveTab('orders')}
        />
      )}

      {/* TAB: DISPATCH QR COUNTER & SCANNER UTILITY */}
      {activeTab === 'dispatch-qr' && (
        <DispatchQrUtilityTab
          isFactoryStaffMode={isFactoryStaffMode}
          onOpenOrderQrModal={ord => setSelectedQrOrder(ord)}
          onOpenDeliveryChallan={ord => setSelectedChallanOrder(ord)}
        />
      )}

      {/* TAB: BULK INQUIRIES & CORPORATE EVENTS */}
      {activeTab === 'bulk-inquiries' && (
        <BulkInquiriesTab showToast={showToast} />
      )}

      {/* TAB: WATER QUALITY & LAB CERTIFICATES */}
      {activeTab === 'water-quality' && (
        <WaterQualityTab showToast={showToast} />
      )}

      {/* TAB: FLEET & DELIVERY DISPATCH */}
      {activeTab === 'fleet-dispatch' && !isFactoryStaffMode && (
        <FleetDispatchTab orders={orders} showToast={showToast} />
      )}

      {/* TAB: PLANT EXPENSES */}
      {activeTab === 'expenses' && !isFactoryStaffMode && (
        <PlantExpensesTab
          totalRevenue={totalRevenue}
          showToast={showToast}
          onNavigateToAccounting={() => setActiveTab('accounting-audit')}
        />
      )}

      {/* TAB 3: CUSTOM ORDERS DEDICATED QUEUE & STUDIO MANAGEMENT */}
      {activeTab === 'custom-orders' && (
        <CustomDesignStudioTab
          isFactoryStaffMode={isFactoryStaffMode}
          onDeleteOrder={ord => setOrderToDelete(ord)}
          onDeleteAllCustomOrders={() => setIsConfirmDeleteAllCustomOrdersOpen(true)}
        />
      )}

      {/* TAB: GST TAX INVOICES MANAGEMENT */}
      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Metrics summary banner */}
          {(() => {
            const totalTaxable = invoices.reduce((sum, inv) => sum + (inv.taxableAmount || 0), 0);
            const totalCgst = invoices.reduce((sum, inv) => sum + (inv.cgstAmount || 0), 0);
            const totalSgst = invoices.reduce((sum, inv) => sum + (inv.sgstAmount || 0), 0);
            const totalGst = totalCgst + totalSgst;
            const totalDelivery = invoices.reduce((sum, inv) => sum + (inv.deliveryCharge || 0), 0);
            const totalGross = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
            const totalProductRev = Math.max(0, totalGross - totalDelivery);

            const filteredInvoices = invoices.filter(inv => {
              const q = invoiceSearchQuery.toLowerCase().trim();
              const cust = inv.customerDetails || (inv as any).customer || {};
              const matchesQuery =
                !q ||
                inv.invoiceNumber.toLowerCase().includes(q) ||
                inv.orderId.toLowerCase().includes(q) ||
                (cust.name && cust.name.toLowerCase().includes(q)) ||
                (cust.phone && cust.phone.includes(q)) ||
                (cust.gstin && cust.gstin.toLowerCase().includes(q));

              const matchesStatus =
                invoiceStatusFilter === 'all' ||
                (invoiceStatusFilter === 'paid' && (inv.paymentStatus === 'Paid' || inv.paymentStatus === 'Completed')) ||
                (invoiceStatusFilter === 'cod' && inv.paymentStatus?.toLowerCase().includes('cash'));

              const isOffline = Boolean(inv.isOfflineInvoice || inv.orderSource === 'offline_counter' || inv.orderId.startsWith('HH-OFF-'));
              const matchesChannel =
                offlineInvoiceFilter === 'all' ||
                (offlineInvoiceFilter === 'offline' && isOffline) ||
                (offlineInvoiceFilter === 'online' && !isOffline);

              return matchesQuery && matchesStatus && matchesChannel;
            });

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</span>
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                        <Receipt className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="font-heading text-2xl font-black text-slate-900 mt-2">{invoices.length}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">HSN 2201 Compliant</p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taxable Value</span>
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="font-heading text-2xl font-black text-slate-900 mt-2">₹{totalTaxable.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Net Before 18% GST</p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GST Included (18%)</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <Percent className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="font-heading text-2xl font-black text-emerald-700 mt-2">₹{totalGst.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">CGST ₹{totalCgst.toFixed(2)} • SGST ₹{totalSgst.toFixed(2)}</p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Revenue</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Excl. Delivery</span>
                    </div>
                    <p className="font-heading text-2xl font-black text-slate-900 mt-2">₹{totalProductRev.toFixed(2)}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Taxable + 18% GST</p>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivery Pass-Through</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Not Profit</span>
                    </div>
                    <p className="font-heading text-2xl font-black text-slate-700 mt-2">₹{totalDelivery.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Carrier Logistics</p>
                  </div>
                </div>

                {/* Accounting & GST Notice */}
                <div className="bg-cyan-50/80 border border-cyan-200/80 rounded-2xl p-3.5 text-xs text-cyan-950 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-cyan-700 shrink-0" />
                  <span>
                    <strong>GST & Delivery Charges Accounting Policy:</strong> All packaged mineral water selling prices are 18% GST-inclusive (HSN 2201). Delivery charges are pass-through shipping reimbursements for dispatch partners and are excluded from business revenue and profit.
                  </span>
                </div>

                {/* Filters & Search Header */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-cyan-600" />
                        <span>GST Tax Invoices Register</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Official tax invoices generated for all successful mineral water bookings.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={invoiceSearchQuery}
                          onChange={e => setInvoiceSearchQuery(e.target.value)}
                          placeholder="Search Invoice #, Order ID, Phone..."
                          className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-cyan-600 outline-none w-64"
                        />
                      </div>

                      <select
                        value={invoiceStatusFilter}
                        onChange={e => setInvoiceStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="all">All Payments</option>
                        <option value="paid">Paid / UPI</option>
                        <option value="cod">Cash on Delivery</option>
                      </select>

                      <select
                        value={offlineInvoiceFilter}
                        onChange={e => setOfflineInvoiceFilter(e.target.value as any)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="all">All Channels</option>
                        <option value="online">Online Web Orders</option>
                        <option value="offline">Offline Counter Sales</option>
                      </select>

                      <button
                        type="button"
                        id="btn-invoices-generate-offline"
                        onClick={() => {
                          setSelectedCustomerForOfflineInvoice(null);
                          setIsOfflineInvoiceModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                        <span>+ Offline Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={exportInvoicesCsv}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="Download Invoices Register as CSV (GSTR-1 Ready)"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Export GSTR-1 (CSV)</span>
                      </button>

                      {!isFactoryStaffMode && invoices.length > 0 && (
                        <button
                          type="button"
                          id="btn-clear-all-invoices"
                          onClick={() => setIsConfirmDeleteAllInvoicesOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Delete all invoices from database"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Clear All</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={fetchInvoices}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Refresh Invoices List"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Invoices List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Invoice # & Date</th>
                          <th className="p-3.5">Order ID</th>
                          <th className="p-3.5">Customer Details</th>
                          <th className="p-3.5 text-right">Taxable (₹)</th>
                          <th className="p-3.5 text-right">GST 18% (₹)</th>
                          <th className="p-3.5 text-right">Total (₹)</th>
                          <th className="p-3.5 text-center">Payment</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="font-semibold">No tax invoices found matching criteria.</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Invoices are automatically created whenever an order is booked.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv) => {
                            const linkedOrder = orders.find(o => o.id === inv.orderId);
                            const cust = inv.customerDetails || (inv as any).customer || { name: 'Customer', phone: '' };
                            const gstTotal = (inv.cgstAmount || 0) + (inv.sgstAmount || 0);

                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3.5">
                                  <span className="font-mono font-bold text-slate-900 block">{inv.invoiceNumber}</span>
                                  <span className="text-[11px] text-slate-400">{new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </td>

                                <td className="p-3.5">
                                  <span className="font-mono text-cyan-700 font-bold block">{inv.orderId}</span>
                                  {(inv.isOfflineInvoice || inv.orderSource === 'offline_counter' || inv.orderId.startsWith('HH-OFF-')) && (
                                    <span className="inline-block mt-0.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                      Offline Counter
                                    </span>
                                  )}
                                  {(inv.isCustomOrder || inv.customLabelDetails) && (
                                    <span className="inline-block mt-0.5 ml-1 text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded border border-purple-200">
                                      ✨ Custom Label
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <span className="font-bold text-slate-800 block">{cust.name}</span>
                                  <span className="text-[11px] text-slate-500 font-mono">{cust.phone}</span>
                                  {cust.gstin && (
                                    <span className="inline-block mt-0.5 text-[9px] bg-purple-100 text-purple-800 font-mono px-1 rounded font-bold">
                                      GST: {cust.gstin}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5 text-right font-mono text-slate-700">
                                  ₹{(inv.taxableAmount || 0).toFixed(2)}
                                </td>

                                <td className="p-3.5 text-right font-mono text-emerald-700 font-semibold">
                                  ₹{gstTotal.toFixed(2)}
                                </td>

                                <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                                  ₹{(inv.grandTotal || 0).toFixed(2)}
                                </td>

                                <td className="p-3.5 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.paymentStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {inv.paymentStatus || 'Paid'}
                                  </span>
                                </td>

                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      id={`btn-print-inv-${inv.id}`}
                                      onClick={() => {
                                        setActiveInvoiceAutoPrint(true);
                                        setActiveInvoice(inv);
                                      }}
                                      className="inline-flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                      title="Print Official GST Tax Invoice"
                                    >
                                      <Printer className="w-3 h-3 text-white" />
                                      <span>Print</span>
                                    </button>

                                    <button
                                      type="button"
                                      id={`btn-view-inv-${inv.id}`}
                                      onClick={() => {
                                        setActiveInvoiceAutoPrint(false);
                                        setActiveInvoice(inv);
                                      }}
                                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                      title="View Official GST Tax Invoice"
                                    >
                                      <FileText className="w-3 h-3 text-cyan-300" />
                                      <span>View</span>
                                    </button>

                                    {!isFactoryStaffMode && (
                                      <button
                                        type="button"
                                        id={`btn-journal-inv-${inv.id}`}
                                        onClick={() => {
                                          setFocusedInvoiceIdForAccounting(inv.invoiceNumber);
                                          setActiveTab('accounting-audit');
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                        title="View Double-Entry Journal A/c, Ledger & CA Audit entry for this invoice"
                                      >
                                        <BookOpen className="w-3 h-3 text-purple-700" />
                                        <span>Journal A/c</span>
                                      </button>
                                    )}

                                    <a
                                      href={`https://wa.me/91${cust.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        `Hello ${cust.name}, here is your HH MINERAL WATER Tax Invoice #${inv.invoiceNumber} for Order ${inv.orderId}. Total Amount: ₹${inv.grandTotal}. Thank you for choosing HH Mineral Water!`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                      title="Share Invoice via WhatsApp to Customer"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </a>

                                    {!isFactoryStaffMode && (
                                      <button
                                        type="button"
                                        onClick={() => setInvoiceToDelete(inv)}
                                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                                        title={`Delete Invoice #${inv.invoiceNumber}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* TAB: CA STATUTORY AUDIT, GENERAL JOURNAL, TRIAL BALANCE & FINAL ACCOUNTS */}
      {activeTab === 'accounting-audit' && !isFactoryStaffMode && (
        <AccountingAuditTab
          invoices={invoices}
          expenses={(() => {
            try {
              const saved = safeStorage.getItem('hh_plant_expenses');
              if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
              }
              if (safeStorage.getItem('hh_accounting_wiped_v1') === 'true') return [];
              return INITIAL_PLANT_EXPENSES;
            } catch {
              return INITIAL_PLANT_EXPENSES;
            }
          })()}
          settings={adminSettings}
          focusedInvoiceId={focusedInvoiceIdForAccounting}
          onViewInvoiceModal={(inv) => {
            setActiveInvoiceAutoPrint(false);
            setActiveInvoice(inv);
          }}
        />
      )}

      {/* TAB: AUTOMATED LOW-STOCK MONITORING & RAW MATERIAL INVENTORY (ADMIN ONLY) */}
      {activeTab === 'inventory' && !isFactoryStaffMode && (
        <InventoryStockTab
          onNavigateToExpenses={() => !isFactoryStaffMode && setActiveTab('expenses')}
        />
      )}

      {/* TAB 4: PRODUCT CATALOG & PRICE MANAGEMENT */}
      {activeTab === 'products' && !isFactoryStaffMode && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Cloud Sync Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl font-bold text-slate-900">
                  Product Catalog & Real-Time Controller
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Real-Time Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl">
                Edit prices, MRP, sizes, GST tax rates, stock levels, or custom design pricing from any device. Changes instantly broadcast across mobile phones, tablets, desktops, and customer bags.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isFactoryStaffMode ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Factory Staff: View Only (Edits Locked)</span>
                </div>
              ) : (
                <>
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsConfirmDeleteAllProductsOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                      title="Delete all products from store catalog and database"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete All</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      const existing1L = products.find(
                        p => p.id === 'prod-1L' || (p.size && (p.size.toLowerCase() === '1l' || p.size.toLowerCase() === '1 litre'))
                      );
                      if (existing1L) {
                        setEditingProduct(existing1L);
                        setIsNewProductModal(false);
                        showToast('1 Litre Bottle Opened', '1 Litre water bottle product is open for editing and stock management.', 'info');
                      } else {
                        const initial1L = INITIAL_PRODUCTS.find(p => p.id === 'prod-1L') || INITIAL_PRODUCTS[2];
                        if (initial1L) {
                          await updateProduct(initial1L);
                          showToast('1 Litre Bottle Added', '1 Litre Premium Table Edition water bottle added to your catalog!', 'success');
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-900 hover:bg-cyan-800 text-cyan-100 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    title="Add or edit 1 Litre water bottle product"
                  >
                    <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Add 1L Bottle</span>
                  </button>

                  <button
                    onClick={() => {
                      const newProd: Product = {
                        id: `prod-${Date.now()}`,
                        name: 'HH Mineral Water — New Variant',
                        size: '300ml',
                        price: 6,
                        mrp: 10,
                        discountPercent: 40,
                        gstRate: 18,
                        hsnCode: '2201',
                        stockCount: 500,
                        stockStatus: 'In Stock',
                        tags: ['Pure Mineral', 'UV Treated', 'BPA Free'],
                        image: DEFAULT_BOTTLE_IMAGE,
                        images: [DEFAULT_BOTTLE_IMAGE],
                        shortDesc: 'Pure natural mineral water bottle.',
                        description: 'Pure 7-stage filtration mineral water enriched with natural minerals.',
                        inStock: true,
                        isVisible: true,
                        minOrderQty: 1,
                        category: 'Standard',
                        casePackSize: 24,
                        features: ['7-stage UV & Ozonation', 'BPA-Free PET'],
                        mineralInfo: {
                          calcium: '20 mg/L',
                          magnesium: '10 mg/L',
                          potassium: '4 mg/L',
                          sodium: '7 mg/L',
                          bicarbonate: '60 mg/L',
                          silica: '14 mg/L',
                          tds: '125 ppm',
                          ph: '7.4'
                        }
                      };
                      setEditingProduct(newProd);
                      setIsNewProductModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SELECTIVE PRODUCT VISIBILITY CONTROL — SHOW / NOT SHOW PER PRODUCT (STRICTLY OWNER ADMIN ONLY) */}
          {!isFactoryStaffMode && isAdminUnlocked && (() => {
            const shownCount = products.filter(p => isProductVisibleInStore(p, adminSettings)).length;
            const hiddenCount = products.length - shownCount;
            const matchingTabProducts = products.filter(p => {
              const shown = isProductVisibleInStore(p, adminSettings);
              if (productVisibilityFilter === 'shown') return shown;
              if (productVisibilityFilter === 'hidden') return !shown;
              return true;
            });
            return (
              <div className="bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-950 rounded-3xl p-5 sm:p-6 text-white border border-amber-500/40 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner bg-amber-500/20 text-amber-300 border-amber-500/40">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Admin Only
                        </span>
                        <h3 className="font-heading text-base sm:text-lg font-black text-white">
                          Selective Product Visibility — Show / Not Show
                        </h3>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/40 tabular-nums">
                          {shownCount} SHOW
                        </span>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full border bg-rose-500/15 text-rose-300 border-rose-500/40 tabular-nums">
                          {hiddenCount} NOT SHOW
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        Toggle individual products <strong className="text-white">SHOW</strong> or <strong className="text-white">NOT SHOW</strong> right on any card, or select multiple products below to update them in one batch. Hidden items stay hidden from customers and factory staff.
                      </p>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-black/50 border border-slate-700 shrink-0 self-start lg:self-auto">
                    {(['all', 'shown', 'hidden'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setProductVisibilityFilter(mode)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer tabular-nums ${
                          productVisibilityFilter === mode
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {mode === 'all' ? `All (${products.length})` : mode === 'shown' ? `SHOW (${shownCount})` : `NOT SHOW (${hiddenCount})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selection & Batch Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      id="admin-select-visible-products-btn"
                      onClick={() => setSelectedProductIds(matchingTabProducts.map(p => p.id))}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold cursor-pointer"
                    >
                      Select Listed ({matchingTabProducts.length})
                    </button>
                    {selectedProductIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold cursor-pointer"
                      >
                        Clear Selection ({selectedProductIds.length})
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {selectedProductIds.length > 0
                        ? `${selectedProductIds.length} product(s) selected for batch visibility`
                        : 'Tick checkboxes on product cards below to update selected products'}
                    </span>
                  </div>

                  {selectedProductIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="admin-selected-products-show-btn"
                        onClick={async () => {
                          await setSelectedProductsVisibility(selectedProductIds, true);
                          setSelectedProductIds([]);
                        }}
                        className="px-4 py-2 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 shrink-0" />
                        <span>SHOW Selected ({selectedProductIds.length})</span>
                      </button>
                      <button
                        type="button"
                        id="admin-selected-products-not-show-btn"
                        onClick={async () => {
                          await setSelectedProductsVisibility(selectedProductIds, false);
                          setSelectedProductIds([]);
                        }}
                        className="px-4 py-2 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <EyeOff className="w-4 h-4 shrink-0" />
                        <span>NOT SHOW Selected ({selectedProductIds.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SELLING PRICE MASTER CONTROLLER — ALL PRODUCTS (Admin Only) */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-cyan-700/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                adminSettings?.showSellingPrice !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-4 ring-emerald-500/10'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-4 ring-amber-500/10'
              }`}>
                <Percent className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-base sm:text-lg font-black text-white">
                    Selling Price Master Control — All Products
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    adminSettings?.showSellingPrice !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${adminSettings?.showSellingPrice !== false ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    {adminSettings?.showSellingPrice !== false ? 'Selling Price: ON (Offer Active)' : 'Selling Price: OFF (MRP Only)'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Turn Selling Price <strong className="text-white">ON</strong> or <strong className="text-white">OFF</strong> across <strong className="text-white">ALL products</strong> simultaneously with 1 click. When ON, customers buy at discounted selling prices (e.g. ₹6) with MRP strikethroughs and discount % OFF badges. When OFF, all products sell strictly at standard MRP (e.g. ₹10) and discount badges are hidden storewide.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                  <span>Store Total: <strong className="text-white">{products.length} Products</strong></span>
                  <span>•</span>
                  <span>Currently with Selling Price ON: <strong className="text-emerald-300">{products.filter(p => p.showSellingPrice !== false && !(p.tags || []).includes('selling_price_off')).length}</strong></span>
                  <span>•</span>
                  <span>MRP Only: <strong className="text-amber-300">{products.filter(p => p.showSellingPrice === false || (p.tags || []).includes('selling_price_off')).length}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
              {isFactoryStaffMode ? (
                <div className="px-4 py-3 rounded-2xl bg-amber-950/70 text-amber-300 border border-amber-600/50 text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Master Toggle: Admin Only</span>
                </div>
              ) : (
                /* ONE Consolidated ON/OFF Button Option (Admin Only) */
                <button
                  type="button"
                  id="master-selling-price-toggle-btn"
                  onClick={() => {
                    const isCurrentlyOn = adminSettings?.showSellingPrice !== false;
                    toggleAllProductsSellingPrice(!isCurrentlyOn);
                  }}
                  className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-between sm:justify-center gap-4 cursor-pointer shadow-xl active:scale-95 border ${
                    adminSettings?.showSellingPrice !== false
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 ring-4 ring-emerald-500/20 shadow-emerald-950/40'
                      : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-amber-300 border-amber-500/50 ring-4 ring-amber-500/10 shadow-slate-950/40'
                  }`}
                  title={adminSettings?.showSellingPrice !== false ? 'Click to Turn OFF Selling Price (All products sell at MRP)' : 'Click to Turn ON Selling Price (All products sell at discounted offers)'}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${adminSettings?.showSellingPrice !== false ? 'bg-white animate-pulse' : 'bg-amber-400'}`} />
                    <span className="text-sm font-black tracking-wide">
                      Selling Price: {adminSettings?.showSellingPrice !== false ? 'ON' : 'OFF'}
                    </span>
                    <span className="text-[10px] uppercase font-bold opacity-80 hidden sm:inline">
                      {adminSettings?.showSellingPrice !== false ? '(All Offers Active)' : '(MRP Only)'}
                    </span>
                  </div>

                  {/* Interactive Switch Pill */}
                  <div className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center shrink-0 ${
                    adminSettings?.showSellingPrice !== false ? 'bg-white/30 justify-end' : 'bg-black/60 justify-start'
                  }`}>
                    <div className={`w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                      adminSettings?.showSellingPrice !== false ? 'bg-white' : 'bg-amber-400'
                    }`} />
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Product Cards Grid or Empty State */}
          {(() => {
            const visibleTabProducts = isFactoryStaffMode
              ? products.filter(p => isProductVisibleInStore(p, adminSettings))
              : products.filter(p => {
                  const shown = isProductVisibleInStore(p, adminSettings);
                  if (productVisibilityFilter === 'shown') return shown;
                  if (productVisibilityFilter === 'hidden') return !shown;
                  return true;
                });

            if (products.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-slate-900">All Products Deleted</h3>
                    <p className="text-xs text-slate-500">
                      There are currently no products in the catalog or database. You can click &quot;Add Product&quot; to create a custom product.
                    </p>
                  </div>
                </div>
              );
            }

            if (visibleTabProducts.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto space-y-3">
                  <EyeOff className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="font-heading text-base font-bold text-slate-900">
                    {isFactoryStaffMode ? 'No Visible Products' : `No Products in "${productVisibilityFilter === 'shown' ? 'SHOW' : 'NOT SHOW'}" Filter`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isFactoryStaffMode
                      ? 'Products have been hidden from non-admin view by Owner Admin.'
                      : 'Switch visibility filter tabs above to view all products.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleTabProducts.map(prod => {
                  const isShown = isProductVisibleInStore(prod, adminSettings);
                  const isChecked = selectedProductIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                        !isShown
                          ? 'border-rose-300 bg-rose-50/20 opacity-85'
                          : isChecked
                          ? 'border-amber-500 ring-2 ring-amber-400/30'
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="h-40 bg-slate-50 rounded-2xl flex items-center justify-center p-3 mb-3 border border-slate-100 relative group">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="max-h-full max-w-full object-contain"
                          />
                          {!isFactoryStaffMode && isAdminUnlocked && (
                            <button
                              type="button"
                              onClick={() => toggleSelectAdminProduct(prod.id)}
                              className={`absolute top-2 left-2 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                isChecked
                                  ? 'bg-slate-900 border-slate-900 text-amber-400'
                                  : 'bg-white/95 border-slate-300 text-slate-400 hover:border-slate-500'
                              }`}
                              title={isChecked ? 'Deselect product' : 'Select product for batch SHOW / NOT SHOW'}
                              aria-label={isChecked ? 'Deselect product' : 'Select product'}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          )}
                          {prod.badge && (
                            <span className={`absolute top-2 ${!isFactoryStaffMode && isAdminUnlocked ? 'right-2' : 'left-2'} text-[9px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shadow-xs`}>
                              {prod.badge}
                            </span>
                          )}
                          {Array.isArray(prod.images) && prod.images.length > 1 && (
                            <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Layers className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{prod.images.length} views</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-full">
                            {prod.size}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {!isFactoryStaffMode && isAdminUnlocked && (
                              <button
                                type="button"
                                id={`btn-toggle-visibility-${prod.id}`}
                                onClick={() => toggleProductVisibility(prod.id)}
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                                  isShown
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                    : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-xs'
                                }`}
                                title={isShown ? 'Admin Only: Product is SHOW on storefront. Click to set NOT SHOW.' : 'Admin Only: Product is NOT SHOW (Hidden from customers). Click to set SHOW.'}
                              >
                                {isShown ? (
                                  <>
                                    <Eye className="w-3 h-3" />
                                    <span>SHOW</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3 h-3" />
                                    <span>NOT SHOW</span>
                                  </>
                                )}
                              </button>
                            )}
                            {isFactoryStaffMode ? (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  prod.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {prod.inStock ? '● In Stock' : '✕ Out of Stock'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStock(prod)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                                  prod.inStock
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                    : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                                }`}
                                title="Click to toggle stock status"
                              >
                                {prod.inStock ? '● In Stock' : '✕ Out of Stock'}
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="font-heading text-sm font-bold text-slate-900 mt-2">
                          {prod.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.shortDesc}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2.5">
                        {/* Selling Price ON/OFF Option & Discount Badge (Admin Only) */}
                        {(() => {
                          const isSellingOn = prod.showSellingPrice !== false && !(prod.tags || []).includes('selling_price_off');
                          const discountPercent = prod.mrp > prod.price ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100) : 0;
                          return (
                            <div className={`p-2.5 rounded-2xl border transition-all ${
                              isSellingOn
                                ? 'bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border-emerald-200 shadow-2xs'
                                : 'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                  SELLING PRICE (OFFER)
                                </span>
                                {isFactoryStaffMode ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                                    {isSellingOn ? 'ON (Locked)' : 'OFF (Locked)'}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSellingPrice(prod)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                      isSellingOn
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                    }`}
                                    title={isSellingOn ? 'Click to turn Selling Price OFF (sell at MRP)' : 'Click to turn Selling Price ON (sell at discounted price)'}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isSellingOn ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                                    <span>{isSellingOn ? 'ON' : 'OFF'}</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-200/70">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-semibold">
                                    {isSellingOn ? 'ACTIVE SELLING RATE' : 'MRP STANDARD RATE'}
                                  </span>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="font-heading text-lg font-black text-slate-900">
                                      ₹{isSellingOn ? prod.price : prod.mrp}/bottle
                                    </span>
                                    {isSellingOn && prod.mrp > prod.price && (
                                      <span className="text-xs text-slate-400 line-through">₹{prod.mrp}</span>
                                    )}
                                  </div>
                                </div>
                                {isSellingOn && discountPercent > 0 ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    {discountPercent}% OFF
                                  </span>
                                ) : !isSellingOn ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    MRP Only
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })()}

                        {/* GST & Stock Meta Info */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70 text-slate-600">
                          <span>GST Rate: <strong className="text-slate-800">{prod.gstRate || 18}%</strong></span>
                          <span>HSN: <strong className="text-slate-800">{prod.hsnCode || '2201'}</strong></span>
                          <span>Stock: <strong className="text-emerald-700">{prod.stockCount ?? 500}</strong></span>
                        </div>

                        {/* Custom Design Pricing Spec (Admin Editable) */}
                        <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-amber-900">
                            <span>Custom Design Rate:</span>
                            <span className="text-amber-800 font-extrabold">₹{prod.customDesignPrice || prod.price * 2}/bottle</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-amber-700/90">
                            <span>Custom Quantity:</span>
                            <span className="font-bold text-black bg-white/80 px-1.5 py-0.2 rounded border border-amber-300">Min 600 to Unlimited</span>
                          </div>
                        </div>

                        {/* Pack Selling Details */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>Pack Formats:</span>
                            <span className="text-cyan-700">{prod.casePackSize || 24} Pcs Pack</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Case Rate:</span>
                            <span className="font-semibold text-slate-700">
                              ₹{prod.price * (prod.casePackSize || 24)} / case
                            </span>
                          </div>
                        </div>

                        {isFactoryStaffMode ? (
                          <div className="pt-1">
                            <div className="py-2 px-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 text-center flex items-center justify-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Pricing & Specs: Admin Only</span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-5 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewProductModal(false);
                                setEditingProduct({ ...prod, isVisible: isShown });
                              }}
                              className="col-span-4 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs border border-cyan-200 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Specs</span>
                            </button>

                            <button
                              type="button"
                              id={`btn-delete-product-${prod.id}`}
                              onClick={() => handleDeleteProduct(prod)}
                              className="col-span-1 flex items-center justify-center py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
                              title="Delete Product from Store"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Edit Product Modal */}
          {editingProduct && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-slate-900">
                      {isNewProductModal ? 'Add New Bottle Product' : `Edit Product: ${editingProduct.name}`}
                    </h3>
                    <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-md font-mono font-bold">
                      {editingProduct.id}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Quick Presets for New / Existing Products */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick Preset Autofill:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const p1L = INITIAL_PRODUCTS.find(p => p.id === 'prod-1L');
                      if (p1L) {
                        setEditingProduct({
                          ...editingProduct,
                          name: p1L.name,
                          size: p1L.size,
                          price: p1L.price,
                          mrp: p1L.mrp,
                          discountPercent: p1L.discountPercent,
                          customDesignPrice: p1L.customDesignPrice,
                          image: p1L.image,
                          images: p1L.images,
                          shortDesc: p1L.shortDesc,
                          description: p1L.description,
                          category: p1L.category,
                          badge: p1L.badge,
                          casePackSize: p1L.casePackSize,
                          tags: p1L.tags,
                          features: p1L.features,
                          mineralInfo: p1L.mineralInfo,
                          videoUrl: p1L.videoUrl,
                        });
                        showToast('1 Litre Preset Loaded', 'Loaded standard 1 Litre Premium Table Edition parameters.', 'info');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300 cursor-pointer transition-colors"
                  >
                    1 Litre Premium Table (1L)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p500 = INITIAL_PRODUCTS.find(p => p.id === 'prod-500ml');
                      if (p500) {
                        setEditingProduct({
                          ...editingProduct,
                          name: p500.name,
                          size: p500.size,
                          price: p500.price,
                          mrp: p500.mrp,
                          discountPercent: p500.discountPercent,
                          customDesignPrice: p500.customDesignPrice,
                          image: p500.image,
                          images: p500.images,
                          shortDesc: p500.shortDesc,
                          description: p500.description,
                          category: p500.category,
                          badge: p500.badge,
                          casePackSize: p500.casePackSize,
                          tags: p500.tags,
                          features: p500.features,
                          mineralInfo: p500.mineralInfo,
                        });
                        showToast('500ml Preset Loaded', 'Loaded 500ml Everyday Active parameters.', 'info');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer transition-colors"
                  >
                    500ml Active
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p250 = INITIAL_PRODUCTS.find(p => p.id === 'prod-250ml');
                      if (p250) {
                        setEditingProduct({
                          ...editingProduct,
                          name: p250.name,
                          size: p250.size,
                          price: p250.price,
                          mrp: p250.mrp,
                          discountPercent: p250.discountPercent,
                          customDesignPrice: p250.customDesignPrice,
                          image: p250.image,
                          images: p250.images,
                          shortDesc: p250.shortDesc,
                          description: p250.description,
                          category: p250.category,
                          badge: p250.badge,
                          casePackSize: p250.casePackSize,
                          tags: p250.tags,
                          features: p250.features,
                          mineralInfo: p250.mineralInfo,
                        });
                        showToast('250ml Preset Loaded', 'Loaded 250ml Pocket parameters.', 'info');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer transition-colors"
                  >
                    250ml Pocket
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p2L = INITIAL_PRODUCTS.find(p => p.id === 'prod-2L');
                      if (p2L) {
                        setEditingProduct({
                          ...editingProduct,
                          name: p2L.name,
                          size: p2L.size,
                          price: p2L.price,
                          mrp: p2L.mrp,
                          discountPercent: p2L.discountPercent,
                          customDesignPrice: p2L.customDesignPrice,
                          image: p2L.image,
                          images: p2L.images,
                          shortDesc: p2L.shortDesc,
                          description: p2L.description,
                          category: p2L.category,
                          badge: p2L.badge,
                          casePackSize: p2L.casePackSize,
                          tags: p2L.tags,
                          features: p2L.features,
                          mineralInfo: p2L.mineralInfo,
                        });
                        showToast('2 Litre Preset Loaded', 'Loaded 2 Litre Jumbo parameters.', 'info');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer transition-colors"
                  >
                    2 Litre Jumbo
                  </button>
                </div>

                <form id="admin-product-edit-form" onSubmit={handleSaveProduct} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bottle Size (e.g. 250ml, 500ml, 1L, 2L) *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingProduct.size ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, size: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 font-semibold"
                      />
                    </div>

                    {/* Admin Per-Product Storefront Visibility SHOW / NOT SHOW Switch */}
                    <div className="sm:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Storefront Product Visibility</span>
                          <span className="text-[10px] font-black uppercase bg-slate-900 text-amber-300 px-2 py-0.5 rounded-full">
                            Admin Only
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Control whether this product is visible (<strong className="text-emerald-700">SHOW</strong>) or hidden (<strong className="text-rose-700">NOT SHOW</strong>) for customers and factory staff.
                        </p>
                      </div>
                      <button
                        type="button"
                        id="modal-toggle-product-visibility"
                        onClick={() => {
                          setEditingProduct({
                            ...editingProduct,
                            isVisible: editingProduct.isVisible === false ? true : false
                          });
                        }}
                        className={`self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                          editingProduct.isVisible !== false
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {editingProduct.isVisible !== false ? (
                          <>
                            <Eye className="w-4 h-4" />
                            <span>SHOW (Visible)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" />
                            <span>NOT SHOW (Hidden)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Admin Selling Price ON/OFF Switch & Live Discount % */}
                    <div className="sm:col-span-2 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-slate-50 p-4 rounded-2xl border border-emerald-200/90 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">Selling Price Offer Mode</span>
                            <span className="text-[10px] font-black uppercase bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300">
                              Admin Only
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            When ON, product sells at discounted selling price with strikethrough MRP and % OFF badge. When OFF, product sells at standard MRP without discounts.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              showSellingPrice: editingProduct.showSellingPrice === false ? true : false
                            });
                          }}
                          className={`self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                            editingProduct.showSellingPrice !== false
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${editingProduct.showSellingPrice !== false ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                          <span>Selling Price: {editingProduct.showSellingPrice !== false ? 'ON (Discount Active)' : 'OFF (MRP Standard)'}</span>
                        </button>
                      </div>

                      {/* Live Calculation Preview */}
                      {(() => {
                        const price = Number(editingProduct.price) || 0;
                        const mrp = Number(editingProduct.mrp) || price;
                        const isOff = editingProduct.showSellingPrice === false;
                        const discount = (mrp > price && !isOff) ? Math.round(((mrp - price) / mrp) * 100) : 0;
                        const savings = Math.max(0, mrp - price);
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white/90 p-2.5 rounded-xl border border-emerald-100">
                            <span className="text-slate-600 font-semibold">
                              Storefront Customer Preview:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isOff ? (
                                <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg">
                                  Standard MRP ₹{mrp}/bottle (Selling Price Disabled)
                                </span>
                              ) : (
                                <>
                                  <span className="font-black text-slate-900 text-sm">₹{price}/bottle</span>
                                  {mrp > price && (
                                    <>
                                      <span className="text-slate-400 line-through text-xs">₹{mrp}</span>
                                      <span className="font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md text-[11px]">
                                        {discount}% OFF (Save ₹{savings}/bottle)
                                      </span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Selling Price (₹ / bottle) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={editingProduct.price !== undefined && editingProduct.price !== null ? editingProduct.price : ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingProduct({ ...editingProduct, price: val === '' ? ('' as any) : (parseFloat(val) || 0) });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-cyan-800 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        MRP (₹ / bottle)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editingProduct.mrp !== undefined && editingProduct.mrp !== null ? editingProduct.mrp : ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingProduct({ ...editingProduct, mrp: val === '' ? ('' as any) : (parseFloat(val) || 0) });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-600 focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    {/* GST & Tax Settings */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        GST Tax Rate (%)
                      </label>
                      <select
                        value={editingProduct.gstRate ?? 18}
                        onChange={e => setEditingProduct({ ...editingProduct, gstRate: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% Standard GST (Packaged Drinking Water)</option>
                        <option value={28}>28% GST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        HSN / SAC Code
                      </label>
                      <input
                        type="text"
                        value={editingProduct.hsnCode || '2201'}
                        onChange={e => setEditingProduct({ ...editingProduct, hsnCode: e.target.value })}
                        placeholder="e.g. 2201 (Mineral Water)"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                    </div>

                    {/* Admin-Only Custom Design Unit Price Input */}
                    <div className="sm:col-span-2 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Custom Design Unit Price (₹ / bottle) — Admin Only</span>
                        </label>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                          Min 600 Pcs Order Batch
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        <div className="sm:col-span-1">
                          <input
                            type="number"
                            min={1}
                            placeholder={`Default: ₹${((Number(editingProduct.price) || 0) * 2) || 20}`}
                            value={editingProduct.customDesignPrice !== undefined && editingProduct.customDesignPrice !== null ? editingProduct.customDesignPrice : ''}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingProduct({
                                ...editingProduct,
                                customDesignPrice: val === '' ? ('' as any) : (parseFloat(val) || 0)
                              });
                            }}
                            className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs font-extrabold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="sm:col-span-2 text-[11px] text-amber-900 leading-snug">
                          Standard custom design rate is <strong>double the normal bottle price (2×)</strong>. Customers ordering custom label bottles will pay this rate for a minimum quantity of 600 pieces.
                        </div>
                      </div>
                    </div>

                    {/* Stock Status & Quantity */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Stock Status
                      </label>
                      <select
                        value={editingProduct.inStock ? (editingProduct.stockStatus || 'In Stock') : 'Out of Stock'}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingProduct({
                            ...editingProduct,
                            stockStatus: val as any,
                            inStock: val !== 'Out of Stock'
                          });
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      >
                        <option value="In Stock">In Stock (Available)</option>
                        <option value="Low Stock">Low Stock (Warning)</option>
                        <option value="Out of Stock">Out of Stock (Disabled)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Inventory Count (Units)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editingProduct.stockCount ?? 500}
                        onChange={e => setEditingProduct({ ...editingProduct, stockCount: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    {/* Product Category & Case Pack Size */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Category
                      </label>
                      <select
                        value={editingProduct.category || 'Standard'}
                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      >
                        <option value="Standard">Standard Packaged Mineral Water</option>
                        <option value="Premium">Premium Spring Glass / Luxury</option>
                        <option value="Custom Edition">Custom Edition / Event Branding</option>
                        <option value="Bulk">Bulk Hydration / Family Pack</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Case Pack Size (Bottles per Box)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editingProduct.casePackSize || 24}
                        onChange={e => setEditingProduct({ ...editingProduct, casePackSize: parseInt(e.target.value) || 24 })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>

                    {/* Product Tags */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Product Tags (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(editingProduct.tags) ? editingProduct.tags.join(', ') : (editingProduct.tags || '')}
                        onChange={e => setEditingProduct({
                          ...editingProduct,
                          tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        })}
                        placeholder="e.g. Pure Mineral, UV Treated, BPA Free, Event Special"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>

                    {/* Product Images - Vertical Showcase & Multi-Angle (Unlimited / More than 1 to Infinity) */}
                    <div className="sm:col-span-2 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      {(() => {
                        const editImagesList = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                          ? editingProduct.images
                          : (editingProduct.image ? [editingProduct.image] : []);

                        const handleAddUrls = () => {
                          const trimmed = newProductImageUrlInput.trim();
                          if (!trimmed) return;
                          const splitUrls = trimmed
                            .split(/[\n,]+/)
                            .map(u => u.trim())
                            .filter(u => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/'));

                          if (splitUrls.length === 0) {
                            showToast('Invalid URL', 'Please enter valid image URL(s) starting with http://, https://, or data:image/', 'warning');
                            return;
                          }

                          const merged = [...editImagesList, ...splitUrls];
                          setEditingProduct({
                            ...editingProduct,
                            image: merged[0] || editingProduct.image,
                            images: merged
                          });
                          setNewProductImageUrlInput('');
                          showToast('Images Added', `Added ${splitUrls.length} image URL(s). Total: ${merged.length} vertical angle(s).`, 'success');
                        };

                        const handleSetPrimary = (index: number) => {
                          if (index === 0 || index >= editImagesList.length) return;
                          const chosen = editImagesList[index];
                          const remaining = editImagesList.filter((_, i) => i !== index);
                          const updated = [chosen, ...remaining];
                          setEditingProduct({
                            ...editingProduct,
                            image: chosen,
                            images: updated
                          });
                          showToast('Cover Image Updated', 'Selected image set as primary storefront cover.', 'info');
                        };

                        const handleMoveImage = (fromIndex: number, direction: 'up' | 'down') => {
                          const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
                          if (toIndex < 0 || toIndex >= editImagesList.length) return;
                          const copy = [...editImagesList];
                          const temp = copy[fromIndex];
                          copy[fromIndex] = copy[toIndex];
                          copy[toIndex] = temp;
                          setEditingProduct({
                            ...editingProduct,
                            image: copy[0],
                            images: copy
                          });
                        };

                        const handleRemoveImage = (indexToRemove: number) => {
                          if (editImagesList.length <= 1) {
                            showToast('Cannot Remove', 'Each product must have at least one image.', 'warning');
                            return;
                          }
                          const filtered = editImagesList.filter((_, i) => i !== indexToRemove);
                          setEditingProduct({
                            ...editingProduct,
                            image: filtered[0],
                            images: filtered
                          });
                          showToast('Image Removed', 'Image removed from product views.', 'info');
                        };

                        const handleAddPreset = (url: string) => {
                          const merged = [...editImagesList, url];
                          setEditingProduct({
                            ...editingProduct,
                            image: merged[0] || url,
                            images: merged
                          });
                          showToast('Preset Angle Added', 'Added curated preset bottle visual to images.', 'info');
                        };

                        return (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                              <div>
                                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <ImageIcon className="w-4 h-4 text-cyan-600" />
                                  <span>Product Bottle Images (Vertical Showcase & Multi-Angle)</span>
                                </label>
                                <p className="text-[11px] text-slate-500">
                                  Upload more than 1 image (unlimited capacity). Images display vertically on storefront cards and modals.
                                </p>
                              </div>
                              <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-full border border-cyan-200 shrink-0 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-cyan-700" />
                                <span>{editImagesList.length} View{editImagesList.length > 1 ? 's' : ''} (Unlimited)</span>
                              </span>
                            </div>

                            {/* Upload Actions & URL Bar */}
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="file"
                                  ref={productFileInputRef}
                                  onChange={handleProductFileUpload}
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => productFileInputRef.current?.click()}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
                                >
                                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Upload Images (Select 1 or Many)</span>
                                </button>

                                <div className="flex-1 min-w-[220px] flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Or paste image URL(s) to add..."
                                    value={newProductImageUrlInput}
                                    onChange={e => setNewProductImageUrlInput(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddUrls();
                                      }
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddUrls}
                                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Presets to quickly add */}
                              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                                <span className="text-[10px] text-slate-400 font-bold shrink-0">+ Add Preset Angle:</span>
                                {BOTTLE_IMAGE_PRESETS.slice(0, 4).map((p, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleAddPreset(p.url)}
                                    className="px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] bg-white hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 font-semibold truncate max-w-[120px] transition-colors cursor-pointer"
                                    title={`Add ${p.title}`}
                                  >
                                    + {p.title.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Vertical Layout: Active Cover Preview + Vertical Image Angle List */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                              {/* Left: Storefront Vertical Bottle Cover Preview */}
                              <div className="sm:col-span-5 bg-white rounded-2xl border border-slate-200 p-3 flex flex-col items-center justify-between text-center shadow-xs">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Vertical Store Cover
                                </span>
                                <div className="w-24 h-36 bg-slate-50 rounded-xl p-2 flex items-center justify-center border border-slate-100 shadow-inner my-1">
                                  {editImagesList[0] ? (
                                    <img
                                      src={editImagesList[0]}
                                      alt={editingProduct.name}
                                      className="h-full w-auto max-w-full object-contain drop-shadow-sm"
                                    />
                                  ) : (
                                    <ImageIcon className="w-8 h-8 text-slate-300" />
                                  )}
                                </div>
                                <div className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md mt-1">
                                  Primary View #1 (Front)
                                </div>
                              </div>

                              {/* Right: Vertical Stack List of all image views */}
                              <div className="sm:col-span-7 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                                  All Attached Views ({editImagesList.length})
                                </div>
                                {editImagesList.map((imgUrl, idx) => {
                                  const isPrimary = idx === 0;
                                  return (
                                    <div
                                      key={idx}
                                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                                        isPrimary
                                          ? 'bg-cyan-50/70 border-cyan-300 ring-1 ring-cyan-200'
                                          : 'bg-white border-slate-200 hover:border-slate-300'
                                      }`}
                                    >
                                      {/* Thumbnail standing vertically */}
                                      <div className="w-10 h-14 bg-slate-50 rounded-lg p-1 border border-slate-200 flex items-center justify-center shrink-0">
                                        <img
                                          src={imgUrl}
                                          alt={`Angle ${idx + 1}`}
                                          className="h-full w-auto max-w-full object-contain"
                                        />
                                      </div>

                                      {/* Info */}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-bold text-slate-900">
                                            Angle #{idx + 1}
                                          </span>
                                          {isPrimary && (
                                            <span className="text-[9px] font-extrabold bg-cyan-600 text-white px-1.5 py-0.2 rounded">
                                              Cover
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[9px] text-slate-400 truncate font-mono max-w-[150px]">
                                          {imgUrl.startsWith('data:') ? 'Local Image File' : imgUrl}
                                        </p>
                                      </div>

                                      {/* Reordering & Actions */}
                                      <div className="flex items-center gap-1 shrink-0">
                                        {!isPrimary && (
                                          <button
                                            type="button"
                                            onClick={() => handleSetPrimary(idx)}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-cyan-100 text-cyan-700 border border-cyan-200 cursor-pointer transition-colors"
                                            title="Set as Cover Image"
                                          >
                                            Set Cover
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => handleMoveImage(idx, 'up')}
                                          className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                          title="Move Up"
                                        >
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === editImagesList.length - 1}
                                          onClick={() => handleMoveImage(idx, 'down')}
                                          className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                          title="Move Down"
                                        >
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={editImagesList.length <= 1}
                                          onClick={() => handleRemoveImage(idx)}
                                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                          title="Remove this image"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Bottle 360° Video Upload (Admin Only) */}
                    <div className="sm:col-span-2 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 p-4 rounded-2xl border border-purple-200/80 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                            <Film className="w-4 h-4" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>Bottle 360° Video Showcase</span>
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                                360° Interactive Reel
                              </span>
                            </label>
                            <p className="text-[11px] text-slate-500">
                              Upload a 360° rotating bottle clip or bottling video. Appears on cards and detail modals!
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                          editingProduct.videoUrl
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {editingProduct.videoUrl ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Video Active</span>
                            </>
                          ) : (
                            'No Video Attached'
                          )}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                        {/* Interactive Video Player / Thumbnail */}
                        <div className="w-36 h-28 bg-slate-950 rounded-xl border-2 border-purple-300/80 flex items-center justify-center shrink-0 overflow-hidden relative shadow-sm group">
                          {editingProduct.videoUrl ? (
                            <>
                              <UniversalVideoPlayer
                                src={editingProduct.videoUrl}
                                className="w-full h-full object-cover"
                                autoPlay={true}
                                loop={true}
                                muted={true}
                                playsInline={true}
                              />
                              <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10">
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                <span>360° REEL</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-2">
                              <Video className="w-7 h-7 text-purple-400 mx-auto mb-1 opacity-70" />
                              <span className="text-[9px] text-slate-400 block font-medium">No Video Added</span>
                            </div>
                          )}
                        </div>

                        {/* Upload Actions & URL Bar */}
                        <div className="flex-1 w-full space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="file"
                              ref={productVideoInputRef}
                              onChange={handleProductVideoUpload}
                              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => productVideoInputRef.current?.click()}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Video (KB / MB / GB)</span>
                            </button>

                            <div className="flex-1 min-w-[220px] flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="Paste link (YouTube, Vimeo, Drive, or MP4)..."
                                value={editingProduct.videoUrl || ''}
                                onChange={e => {
                                  const parsed = parseVideoInput(e.target.value);
                                  setEditingProduct({ ...editingProduct, videoUrl: parsed.streamUrl || parsed.rawUrl });
                                }}
                                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 font-mono bg-white"
                              />
                              {editingProduct.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct({ ...editingProduct, videoUrl: undefined });
                                    showToast('Video Cleared', 'Product video removed.', 'info');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold shrink-0 cursor-pointer"
                                  title="Remove attached video"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick 1-Click Bottle Video Presets */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-600 block">
                              Or Choose a 360° Bottle Video Preset:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {BOTTLE_VIDEO_PRESETS.map((preset, pIdx) => {
                                const isCur = editingProduct.videoUrl === preset.url;
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct({ ...editingProduct, videoUrl: preset.url });
                                      showToast('Video Preset Attached', `Applied "${preset.title}" to this bottle. Click "Save Product" to publish.`, 'success');
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border cursor-pointer transition-all flex items-center gap-1 ${
                                      isCur
                                        ? 'bg-purple-100 text-purple-900 border-purple-400 font-bold'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-300'
                                    }`}
                                  >
                                    <Play className="w-2.5 h-2.5 text-purple-600 fill-purple-600" />
                                    <span>{preset.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Short Description
                      </label>
                      <input
                        type="text"
                        value={editingProduct.shortDesc ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, shortDesc: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Description
                      </label>
                      <textarea
                        rows={2}
                        value={editingProduct.description ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Badge Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingProduct.badge || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                        placeholder="e.g. Best Seller / Popular for Events"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 bg-white/95 backdrop-blur-xs py-3 -mx-6 sm:-mx-8 px-6 sm:px-8 mt-4 rounded-b-3xl">
                    <div>
                      {!isNewProductModal && (
                        <button
                          type="button"
                          onClick={() => {
                            const prodToDel = editingProduct;
                            setEditingProduct(null);
                            setProductToDelete(prodToDel);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Product</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={isSavingProduct}
                        onClick={() => setEditingProduct(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        id="admin-save-product-submit-btn"
                        type="submit"
                        disabled={isSavingProduct}
                        onClick={(e) => {
                          if (!isSavingProduct) {
                            handleSaveProduct(e);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingProduct ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                            <span className="whitespace-nowrap">Broadcasting Across Devices...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">Save & Broadcast All Devices</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product Audit History Modal */}
          {showProductAuditModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-700" />
                      <h3 className="font-heading text-lg font-bold text-slate-900">
                        Product Change Audit Log & Version History
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Immutable record of product changes across every admin device session. Single source of truth.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowProductAuditModal(false)}
                    className="self-end sm:self-auto text-slate-400 hover:text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                  >
                    Close Log
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by product, field, admin email, or value..."
                      value={productAuditSearchQuery}
                      onChange={e => setProductAuditSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={productAuditProductFilter}
                      onChange={e => setProductAuditProductFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                    >
                      <option value="all">All Products</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.size})</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => fetchProductAuditLogs()}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                      title="Refresh Audit Logs"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    {productAuditLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsConfirmClearProductAuditOpen(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                        title="Clear Product Change History"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear History</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Action / Field</th>
                        <th className="p-3">Previous Value</th>
                        <th className="p-3">Updated Value</th>
                        <th className="p-3">Admin & Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const query = (productAuditSearchQuery || '').toLowerCase().trim();
                        const filtered = (productAuditLogs || []).filter(log => {
                          if (!log) return false;
                          const pName = (log.productName || '').toLowerCase();
                          const field = (log.changedField || '').toLowerCase();
                          const email = (log.adminEmail || '').toLowerCase();
                          const oldV = String(log.oldValue ?? '').toLowerCase();
                          const newV = String(log.newValue ?? '').toLowerCase();
                          const dev = String(log.deviceInfo ?? '').toLowerCase();
                          const matchesQuery = !query ||
                            pName.includes(query) ||
                            field.includes(query) ||
                            email.includes(query) ||
                            oldV.includes(query) ||
                            newV.includes(query) ||
                            dev.includes(query);
                          const matchesProduct = productAuditProductFilter === 'all' || log.productId === productAuditProductFilter;
                          return matchesQuery && matchesProduct;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">
                                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="font-semibold text-slate-600">No product audit logs recorded yet.</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Any changes made to products from mobile, tablet, or desktop are automatically logged here.
                                </p>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 text-slate-600 font-mono whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              <span className="block text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{log.productName}</span>
                              <span className="text-[10px] font-mono text-slate-400">{log.productId}</span>
                            </td>

                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.changeType === 'created'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.changeType === 'deleted'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-cyan-100 text-cyan-800'
                              }`}>
                                {log.changedField}
                              </span>
                              {log.version && (
                                <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                                  v{log.version}
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-mono text-slate-500 max-w-[140px] truncate" title={String(log.oldValue)}>
                              {String(log.oldValue || '—')}
                            </td>

                            <td className="p-3 font-mono font-bold text-emerald-700 max-w-[140px] truncate" title={String(log.newValue)}>
                              {String(log.newValue || '—')}
                            </td>

                            <td className="p-3 text-[11px]">
                              <span className="font-semibold text-slate-800 block">{log.adminEmail}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Smartphone className="w-3 h-3 text-slate-400" />
                                {log.deviceInfo || 'Authorized Session'}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4.5: VISUAL ASSETS & HERO BOTTLE IMAGE */}
      {activeTab === 'visuals' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Header */}
          <div className="bg-[#121212] border border-[#262626] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C5A059] via-[#DFC283] to-[#9A7B38]" />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1913] border border-[#C5A059]/40 text-[#DFC283] text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Visuals & Hero Showcase Controller</span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-black gold-gradient-text">
                Hero Bottle & Brand Visual Manager
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                Configure the primary showcase bottle visual and cinematic video reel featured on the storefront hero section.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                heroMediaTypeInput === 'video'
                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                  : 'bg-[#1c1913] border-[#C5A059]/40 text-[#DFC283]'
              }`}>
                {heroMediaTypeInput === 'video' ? <Film className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                <span>Active Mode: {heroMediaTypeInput === 'video' ? 'Video Reel' : 'Bottle Photo'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Live Hero Spotlight Preview (Video & Bottle) */}
            <div className="lg:col-span-5 bg-[#121212] rounded-3xl border border-[#262626] p-6 sm:p-8 shadow-xl flex flex-col items-center justify-between space-y-6">
              <div className="text-center w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                  Live Hero Section Preview
                </span>
                <h3 className="font-heading text-base font-bold text-white mt-0.5">
                  Storefront Spotlight Media
                </h3>

                {/* Media Type Toggle */}
                <div className="inline-flex p-1 bg-[#181818] rounded-xl mt-3 border border-[#2c2c2c] shadow-inner">
                  <button
                    type="button"
                    id="btn-hero-toggle-video"
                    onClick={() => setHeroMediaTypeInput('video')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      heroMediaTypeInput === 'video'
                        ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-extrabold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Video Reel</span>
                  </button>
                  <button
                    type="button"
                    id="btn-hero-toggle-image"
                    onClick={() => setHeroMediaTypeInput('image')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      heroMediaTypeInput === 'image'
                        ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-extrabold shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Bottle Photo</span>
                  </button>
                </div>
              </div>

              {/* Spotlight Display Stage */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#0a0a0a] p-2 flex items-center justify-center border-2 border-[#C5A059]/40 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-radial from-[#C5A059]/15 to-transparent blur-xl pointer-events-none" />

                {heroMediaTypeInput === 'video' ? (
                  heroVideoInput ? (
                    <div className="w-full h-full rounded-2xl overflow-hidden relative">
                      <video
                        src={heroVideoInput}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs text-[#DFC283] border border-[#C5A059]/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs pointer-events-none">
                        <Sparkles className="w-2.5 h-2.5 text-[#C5A059]" />
                        <span>VIDEO ACTIVE</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-[#1c1913] border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center mx-auto shadow-inner">
                        <Film className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-bold text-white">No Hero Video Uploaded</p>
                      <p className="text-[10px] text-neutral-400 max-w-[200px]">
                        Upload a video clip or select a curated preset from the right.
                      </p>
                      <button
                        type="button"
                        onClick={() => heroVideoInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-black" />
                        <span>Upload Video</span>
                      </button>
                    </div>
                  )
                ) : (
                  heroImageInput ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={heroImageInput}
                        alt="Hero Bottle Showcase"
                        className="max-h-[90%] max-w-[90%] object-contain filter drop-shadow-[0_15px_25px_rgba(197,160,89,0.3)] animate-water-pulse"
                      />
                    </div>
                  ) : (
                    <ImageIcon className="w-16 h-16 text-[#C5A059]/40" />
                  )
                )}
              </div>

              {/* Status and Reset */}
              <div className="w-full flex items-center justify-between pt-4 border-t border-[#262626] text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Active: {heroMediaTypeInput === 'video' ? 'Video Reel Mode' : 'Bottle Photo Mode'}
                  </span>
                </span>
                {!isFactoryStaffMode && (
                  <button
                    type="button"
                    id="btn-reset-hero-visuals"
                    onClick={() => setIsConfirmDeleteHeroVisualOpen(true)}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Video Upload Controls & Curated Presets */}
            <div className="lg:col-span-7 space-y-6">
              {/* PRIMARY: Upload Hero Video */}
              <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 sm:p-8 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-[#1c1913] border border-[#C5A059]/40 text-[#C5A059] flex items-center justify-center shadow-sm">
                      <Film className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-base font-bold text-white">
                        Upload Hero Showcase Video
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Cinematic video reel animation for the storefront hero section
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1c1913] text-[#DFC283] border border-[#C5A059]/30">
                    MP4 / WebM / MOV
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Video Drag & Drop / File Input / Paste Zone */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) processHeroVideoFile(file);
                    }}
                    onPaste={e => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        handleHeroVideoPaste(text);
                        return;
                      }
                      const file = e.clipboardData.files?.[0];
                      if (file) processHeroVideoFile(file);
                    }}
                    className="border-2 border-dashed border-[#333333] hover:border-[#C5A059]/60 bg-[#161616] rounded-2xl p-6 text-center transition-colors relative"
                  >
                    <input
                      type="file"
                      ref={heroVideoInputRef}
                      onChange={handleHeroVideoUpload}
                      accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-[#1c1913] border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Video className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-white">
                      Upload Hero Showcase Video from Computer / Phone
                    </p>
                    <p className="text-[11px] text-emerald-400 font-medium mt-1">
                      Universal File Support: KB, MB, and GB files supported (MP4, WebM, MOV, MKV). No size restrictions.
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Drag & drop a video file here, or press Ctrl+V to paste any video or link
                    </p>

                    {isUploadingHeroVideo && (
                      <div className="max-w-xs mx-auto mt-3 space-y-1">
                        <div className="w-full bg-[#262626] rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#C5A059] to-[#D4AF37] h-full rounded-full transition-all duration-300"
                            style={{ width: `${heroUploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#DFC283] font-bold block">
                          Processing & uploading: {heroUploadProgress}%
                        </span>
                      </div>
                    )}

                    <div className="mt-3.5 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => heroVideoInputRef.current?.click()}
                        disabled={isUploadingHeroVideo}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-extrabold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4 text-black" />
                        <span>Choose Video File (Any Size)</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              handleHeroVideoPaste(text);
                            } else {
                              showToast('Clipboard Empty', 'Please copy a video link first, then click paste.', 'info');
                            }
                          } catch {
                            showToast('Paste Hint', 'Use Ctrl+V or paste directly in the URL input below.', 'info');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] text-[#DFC283] border border-[#C5A059]/40 font-bold text-xs cursor-pointer transition-all"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Paste Video Link</span>
                      </button>

                      {heroVideoInput && (
                        <button
                          type="button"
                          onClick={handleClearHeroVideo}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 border border-rose-800/50 font-bold text-xs cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Video</span>
                        </button>
                      )}
                    </div>

                    {/* Live Preview If Video Attached */}
                    {heroVideoInput && (
                      <div className="mt-4 pt-3 border-t border-[#262626]">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                          Live Video Reel Preview
                        </span>
                        <div className="max-w-md mx-auto aspect-video rounded-xl overflow-hidden border border-[#C5A059]/50 shadow-lg bg-black">
                          <UniversalVideoPlayer
                            src={heroVideoInput}
                            autoPlay={true}
                            loop={true}
                            muted={true}
                            showControls={true}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Direct Video URL Input (Supports YouTube, Vimeo, Google Drive, MP4) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-300">
                        Paste Video Link (YouTube, Vimeo, Drive, CDN, MP4, WebM)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Instant auto-detection
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={heroVideoInput}
                        onChange={e => {
                          const val = e.target.value;
                          const parsed = parseVideoInput(val);
                          setHeroVideoInput(parsed.streamUrl || parsed.rawUrl);
                          if (val) setHeroMediaTypeInput('video');
                        }}
                        placeholder="https://... YouTube, Vimeo, Google Drive, or MP4 link"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[#333333] text-xs focus:outline-none focus:border-[#C5A059] font-mono bg-[#161616] text-white placeholder:text-neutral-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Curated Video Presets */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Curated Bottle Video Presets (1-Click Test)</span>
                    </h4>
                    <span className="text-[10px] text-neutral-400">Click to apply instantly</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BOTTLE_VIDEO_PRESETS.map((preset, idx) => {
                      const isSelected = heroVideoInput === preset.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setHeroVideoInput(preset.url);
                            setHeroMediaTypeInput('video');
                            showToast('Video Preset Selected', `Selected "${preset.title}". Click "Save & Broadcast Hero Media" to save.`, 'info');
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C5A059] bg-[#1f1b13] shadow-sm ring-1 ring-[#C5A059]/40'
                              : 'border-[#262626] hover:border-[#C5A059]/50 hover:bg-[#181818] bg-[#141414]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black'
                              : 'bg-[#1e1e1e] text-[#C5A059] border border-[#333333]'
                          }`}>
                            <Play className={`w-3.5 h-3.5 ${isSelected ? 'fill-black' : 'fill-[#C5A059]'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white leading-snug">
                              {preset.title}
                            </p>
                            <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                              {preset.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-[#C5A059] text-black flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECONDARY: Bottle Image Upload & Presets */}
              <div className="bg-[#121212] rounded-3xl border border-[#262626] p-6 sm:p-8 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#1c1913] border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-white">
                        Bottle Photo Asset
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Used in bottle photo mode and fallback display
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => heroFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] text-[#DFC283] border border-[#C5A059]/30 text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                  <input
                    type="file"
                    ref={heroFileInputRef}
                    onChange={handleHeroFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BOTTLE_IMAGE_PRESETS.map((preset, idx) => {
                    const isSelected = heroImageInput === preset.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setHeroImageInput(preset.url);
                          setHeroMediaTypeInput('image');
                          showToast('Bottle Image Selected', `Selected "${preset.title}". Click "Save & Broadcast Hero Media" to apply.`, 'info');
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#C5A059] bg-[#1f1b13] shadow-xs ring-1 ring-[#C5A059]/50 text-[#DFC283]'
                            : 'border-[#262626] hover:border-[#C5A059]/40 bg-[#141414] text-neutral-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#0d0d0d] p-0.5 flex items-center justify-center shrink-0 border border-[#2a2a2a]">
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <p className="text-[11px] font-bold truncate flex-1">
                          {preset.title.split(' ')[0]} {preset.title.split(' ')[1] || ''}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Save & Broadcast Button */}
                <div className="pt-4 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-neutral-400">
                    Saves hero video, active playback mode, and bottle imagery live to storefront.
                  </p>
                  <button
                    type="button"
                    id="btn-save-hero-media-live"
                    onClick={handleSaveHeroMedia}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-extrabold text-xs shadow-lg shadow-[#C5A059]/20 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Save className="w-4 h-4 text-black" />
                    <span>Save & Broadcast Hero Media Live</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && !isFactoryStaffMode && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-900">
                Registered Customers ({filteredCustomersList.length} of {customersList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Auto-aggregated customer profiles with order history and spending totals</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search customer name or phone..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-cyan-600 outline-none w-64"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <span className="text-[11px] font-bold text-slate-500">Channel:</span>
                <select
                  value={offlineCustomerFilter}
                  onChange={e => setOfflineCustomerFilter(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">All Customers</option>
                  <option value="online">Online Web Users</option>
                  <option value="offline">Offline Counter Buyers</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add Customer</span>
              </button>

              <button
                type="button"
                id="btn-customer-new-offline-invoice"
                onClick={() => {
                  setSelectedCustomerForOfflineInvoice(null);
                  setIsOfflineInvoiceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Offline Invoice</span>
              </button>

              <button
                type="button"
                onClick={exportCustomersCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Download Customer List as CSV"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export CSV</span>
              </button>

              {customersList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteAllCustomersOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Clear all customer profiles"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete All Customers ({customersList.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Mobile Number</th>
                  <th className="p-3">Total Orders</th>
                  <th className="p-3">Product Revenue (Excl. Delivery)</th>
                  <th className="p-3">Last Order</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No matching customer records found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomersList.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {c.isOffline ? (
                            <span className="inline-block text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                              Offline Counter
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] bg-cyan-100 text-cyan-800 font-bold px-1.5 py-0.2 rounded border border-cyan-200">
                              Online Store
                            </span>
                          )}
                          {c.gstin && (
                            <span className="inline-block text-[9px] bg-purple-100 text-purple-800 font-mono px-1 rounded font-bold">
                              GST: {c.gstin}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-slate-800">
                          {c.orderCount} order{c.orderCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-cyan-800 block">₹{c.totalProductRevenue.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">₹{c.totalSpent.toFixed(2)} incl. delivery</span>
                      </td>
                      <td className="p-3 text-slate-500">
                        {c.lastOrder === 'Direct Registered' ? (
                          <span className="text-amber-700 font-medium">Direct Registered</span>
                        ) : (
                          new Date(c.lastOrder).toLocaleDateString()
                        )}
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerForOfflineInvoice({
                              name: c.name,
                              phone: c.phone,
                              address: c.address || 'Factory Counter / Direct Pickup',
                              city: 'Kolkata',
                              pincode: '700091',
                              gstin: c.gstin,
                              isOfflineCustomer: true
                            });
                            setIsOfflineInvoiceModalOpen(true);
                          }}
                          className="text-cyan-800 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors cursor-pointer border border-cyan-200 shadow-2xs"
                          title="Generate new GST invoice for this customer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-cyan-700" />
                          <span>+ Invoice</span>
                        </button>

                        <a
                          href={`https://wa.me/91${c.phone}?text=Hello%20${encodeURIComponent(c.name)}%2C%20thank%20you%20for%20choosing%20HH%20MINERAL%20WATER!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(c)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer transition-colors border border-transparent hover:border-rose-200"
                          title={`Delete Customer ${c.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & WHATSAPP INTEGRATION & GST CONFIGURATION */}
      {activeTab === 'settings' && !isFactoryStaffMode && (
        <div className="max-w-4xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-600" />
                <span>Store & GST Tax Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure owner phone number, Indian GSTIN tax parameters, legal business address, and banking details.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmMasterPurgeOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Master Purge: Delete all transactions, orders, invoices, and test data"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Master Data Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmResetSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Reset all settings to default factory values"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Reset All Settings</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* Section 1: Store & WhatsApp Contact */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Store & WhatsApp Contact</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSectionModal({
                      isOpen: true,
                      title: 'Clear Contact & Delivery Settings',
                      description: 'Are you sure you want to delete and reset the owner contact number, helpline, and delivery fee settings back to clean defaults?',
                      confirmText: 'Clear Contact Settings',
                      onConfirm: () => {
                        setSettingsForm(prev => ({
                          ...prev,
                          ownerWhatsApp: '8017341130',
                          helplinePhone: '',
                          defaultDeliveryCharge: 0,
                          freeDeliveryMinAmount: 0,
                          adminPin: '170707',
                          factoryStaffPin: '1234'
                        }));
                        showToast('Contact Settings Cleared', 'Contact and delivery parameters reset.', 'info');
                      }
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Delete/Reset Contact Settings"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete / Clear</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Owner WhatsApp Number (for Order Confirmations) *
                    </label>
                    {settingsForm.ownerWhatsApp && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, ownerWhatsApp: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={settingsForm.ownerWhatsApp}
                    onChange={e => setSettingsForm({ ...settingsForm, ownerWhatsApp: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:border-cyan-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default specified: 8017341130</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Helpline Phone Number (Customer facing)
                    </label>
                    {settingsForm.helplinePhone && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, helplinePhone: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.helplinePhone}
                    onChange={e => setSettingsForm({ ...settingsForm, helplinePhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.defaultDeliveryCharge}
                    onChange={e => setSettingsForm({ ...settingsForm, defaultDeliveryCharge: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:border-cyan-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Pass-through logistics carrier cost (not profit). Excluded from store revenue.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Free Delivery Threshold (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.freeDeliveryMinAmount}
                    onChange={e => setSettingsForm({ ...settingsForm, freeDeliveryMinAmount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Owner Admin PIN Code (6 Digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={settingsForm.adminPin}
                    onChange={e => setSettingsForm({ ...settingsForm, adminPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold tracking-widest focus:border-cyan-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Master Owner PIN (default: 170707)</p>
                </div>

                {!isFactoryStaffMode && isAdminUnlocked && (
                  <div className="sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-amber-900">
                        Factory Staff Login PIN (4 Digits)
                      </label>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Admin Only
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          id="admin-factory-staff-pin-input"
                          type={showStaffPinPlain ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={4}
                          value={settingsForm.factoryStaffPin ?? ''}
                          onChange={e => setSettingsForm({ ...settingsForm, factoryStaffPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                          placeholder="4-digit PIN"
                          className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-sm font-mono font-bold tracking-widest text-slate-900 focus:border-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStaffPinPlain(prev => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-800 hover:text-amber-950 cursor-pointer"
                          title={showStaffPinPlain ? 'Hide Staff PIN' : 'Show Staff PIN'}
                        >
                          {showStaffPinPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        id="btn-save-factory-staff-pin"
                        disabled={isUpdatingStaffPin || !/^\d{4}$/.test((settingsForm.factoryStaffPin || '').trim())}
                        onClick={async () => {
                          setIsUpdatingStaffPin(true);
                          try {
                            await updateFactoryStaffPin(settingsForm.factoryStaffPin || '');
                          } finally {
                            setIsUpdatingStaffPin(false);
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-black transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
                        title="Save new 4-digit Factory Staff Login PIN (Admin Only)"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isUpdatingStaffPin ? 'Saving...' : 'Change PIN'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-1">
                      Only Owner Admin can view or change the 4-digit Factory Staff Login PIN (default: 1234).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 1.1: Store-Wide Pricing & Discount Percentage Controls (Admin Only) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 bg-gradient-to-br from-cyan-50/80 via-blue-50/40 to-slate-50/60 rounded-2xl p-5 border border-cyan-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-200/80 pb-3">
                <div>
                  <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Percent className="w-4.5 h-4.5 text-cyan-600" />
                    <span>Store-Wide Selling Price & Discount % Controls</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Control whether discounted selling prices and % OFF badges are shown to customers or if the store sells strictly at MRP.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse" />
                    Admin Controlled
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteSectionModal({
                        isOpen: true,
                        title: 'Reset Store Pricing & Discount Controls',
                        description: 'Are you sure you want to turn off all discounted selling prices and delete custom discount badges? Store will revert strictly to MRP pricing.',
                        confirmText: 'Reset Pricing Rules',
                        onConfirm: async () => {
                          setSettingsForm(prev => ({
                            ...prev,
                            showSellingPrice: false,
                            showDiscountPercentage: false
                          }));
                          await toggleAllProductsSellingPrice(false);
                          showToast('Pricing Rules Reset', 'Discounted selling prices and % badges turned off.', 'info');
                        }
                      });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Delete / Reset Pricing Rules"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Delete / Reset</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Selective Per-Product Storefront Visibility Checklist (Owner Admin Only) */}
                {!isFactoryStaffMode && isAdminUnlocked && (
                  <div className="sm:col-span-2 p-4 rounded-xl border border-amber-300 bg-white space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Selective Storefront Product Visibility (Show / Not Show)
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white">
                            Admin Only
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 block mt-0.5">
                          Choose individually which bottled products appear on the customer storefront and staff dashboard.
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-700 tabular-nums">
                        {products.filter(p => isProductVisibleInStore(p, adminSettings)).length}/{products.length} SHOW
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {products.map(prod => {
                        const isShown = isProductVisibleInStore(prod, adminSettings);
                        return (
                          <div
                            key={prod.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              isShown ? 'border-slate-200 bg-slate-50/70' : 'border-rose-200 bg-rose-50/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 block truncate">
                                {prod.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {prod.size} • ₹{prod.price}/bottle
                              </span>
                            </div>
                            <button
                              type="button"
                              id={`settings-toggle-visibility-${prod.id}`}
                              onClick={() => toggleProductVisibility(prod.id)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isShown
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                              }`}
                            >
                              {isShown ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>SHOW</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>NOT SHOW</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Global Selling Price Master Switch */}
                <div className={`p-4 rounded-xl border transition-all duration-200 shadow-2xs flex items-center justify-between gap-4 ${
                  settingsForm.showSellingPrice !== false
                    ? 'bg-white border-cyan-300 ring-1 ring-cyan-500/20'
                    : 'bg-white/80 border-slate-200'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 block">
                        Enable Discounted Selling Price
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        settingsForm.showSellingPrice !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {settingsForm.showSellingPrice !== false ? 'ACTIVE (DISCOUNTS ON)' : 'OFF (MRP ONLY)'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      When turned OFF, all products across the entire store will sell at standard MRP without strikethroughs or discounts.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = settingsForm.showSellingPrice === false ? true : false;
                      setSettingsForm({ ...settingsForm, showSellingPrice: next });
                      showToast(
                        next ? 'Selling Prices Active' : 'Selling Prices Turned OFF',
                        next ? 'Store-wide discounted selling prices are enabled.' : 'Store-wide selling prices turned OFF. Catalog sells at standard MRP.',
                        next ? 'success' : 'info'
                      );
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                      settingsForm.showSellingPrice !== false ? 'bg-cyan-600' : 'bg-slate-300'
                    }`}
                    aria-label="Toggle store-wide selling price"
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settingsForm.showSellingPrice !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Discount Percentage Badge Toggle */}
                <div className={`p-4 rounded-xl border transition-all duration-200 shadow-2xs flex items-center justify-between gap-4 ${
                  settingsForm.showDiscountPercentage !== false
                    ? 'bg-white border-cyan-300 ring-1 ring-cyan-500/20'
                    : 'bg-white/80 border-slate-200'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 block">
                        Show Discount Percentage Badges
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        settingsForm.showDiscountPercentage !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {settingsForm.showDiscountPercentage !== false ? 'VISIBLE (% OFF)' : 'HIDDEN'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Show or hide badges like &quot;40% OFF&quot; / &quot;50% OFF&quot; beside prices on storefront cards and modals.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = settingsForm.showDiscountPercentage === false ? true : false;
                      setSettingsForm({ ...settingsForm, showDiscountPercentage: next });
                      showToast(
                        next ? 'Discount Badges Visible' : 'Discount Badges Hidden',
                        next ? 'Discount percentage tags are now shown on prices.' : 'Discount percentage tags hidden.',
                        'info'
                      );
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
                      settingsForm.showDiscountPercentage !== false ? 'bg-cyan-600' : 'bg-slate-300'
                    }`}
                    aria-label="Toggle discount percentage badges"
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settingsForm.showDiscountPercentage !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 1-Click Master Bulk Actions for Selling Price Across All Products */}
                <div className="sm:col-span-2 bg-white/90 p-4 rounded-xl border border-cyan-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Quick Bulk Action: All Products Selling Price
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Apply selling price offer state to all {products.length} products simultaneously with a single click.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* ONE Master Selling Price ON/OFF Toggle Button */}
                    <button
                      type="button"
                      id="settings-master-selling-price-toggle-btn"
                      onClick={async () => {
                        const next = settingsForm.showSellingPrice === false ? true : false;
                        setSettingsForm(prev => ({ ...prev, showSellingPrice: next }));
                        await toggleAllProductsSellingPrice(next);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-3 cursor-pointer shadow-sm active:scale-95 border ${
                        settingsForm.showSellingPrice !== false
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-900 text-amber-300 border-amber-500/50'
                      }`}
                      title="Click to toggle Selling Price ON or OFF for all products"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${settingsForm.showSellingPrice !== false ? 'bg-white animate-pulse' : 'bg-amber-400'}`} />
                        <span>All Products: {settingsForm.showSellingPrice !== false ? 'ON' : 'OFF (MRP)'}</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                        settingsForm.showSellingPrice !== false ? 'bg-white/30 justify-end' : 'bg-black/50 justify-start'
                      }`}>
                        <div className={`w-4 h-4 rounded-full shadow-sm transform ${
                          settingsForm.showSellingPrice !== false ? 'bg-white' : 'bg-amber-400'
                        }`} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Per-Bottle Live Status Matrix */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Catalog Price & Discount Status Overview:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {products.map(prod => {
                    const isProdOn = prod.showSellingPrice !== false && !(prod.tags || []).includes('selling_price_off');
                    const isGlobalOn = settingsForm.showSellingPrice !== false;
                    const effectiveActive = isGlobalOn && isProdOn;
                    const discount = prod.mrp > prod.price ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100) : 0;
                    return (
                      <div key={prod.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{prod.size}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                            effectiveActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {effectiveActive ? 'Selling Price ON' : 'MRP Only'}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="text-slate-500">Rate: <strong className="text-slate-800">₹{effectiveActive ? prod.price : prod.mrp}</strong></span>
                          {effectiveActive && discount > 0 && (
                            <span className="text-emerald-700 font-extrabold">{discount}% OFF</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Option 2: Live Sound & Desktop Order Alerts */}
            <div className="space-y-4 pt-4 border-t border-slate-100 bg-gradient-to-br from-amber-50/70 via-amber-50/40 to-orange-50/30 rounded-2xl p-5 border border-amber-200/80 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                <div>
                  <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Volume2 className="w-4.5 h-4.5 text-amber-600" />
                    <span>Option 2: Live Sound & Desktop Alerts (Zero Setup)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Instant melodic chime and real-time desktop alerts when a customer places an order. Works without external APIs.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-200/90 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    Instant • Zero Setup
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteSectionModal({
                        isOpen: true,
                        title: 'Mute / Clear Audio & Push Alerts',
                        description: 'Are you sure you want to mute chime sounds and browser push notifications?',
                        confirmText: 'Mute / Clear Alerts',
                        onConfirm: () => {
                          setSettingsForm(prev => ({
                            ...prev,
                            adminSoundAlertEnabled: false,
                            adminBrowserPushEnabled: false
                          }));
                          showToast('Alerts Cleared', 'Order chimes and push notification settings muted.', 'info');
                        }
                      });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Delete / Mute Alert Settings"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Delete / Mute</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Sound Chime Toggle */}
                <div className={`p-4 rounded-xl border transition-all duration-200 shadow-2xs flex items-center justify-between gap-3 ${
                  soundAlertEnabled 
                    ? 'bg-white border-amber-300 ring-1 ring-amber-400/25' 
                    : 'bg-white/80 border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 block">Melodic Order Chime</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        soundAlertEnabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {soundAlertEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Synthesized 4-tone chime rings when an order is placed
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={testSoundAlert}
                      className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Play sample chime right now"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Test</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSoundAlert();
                        setSettingsForm({ ...settingsForm, adminSoundAlertEnabled: !soundAlertEnabled });
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        soundAlertEnabled ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                      aria-label="Toggle sound alert"
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          soundAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Desktop Push Notification Toggle */}
                <div className={`p-4 rounded-xl border transition-all duration-200 shadow-2xs flex items-center justify-between gap-3 ${
                  browserNotificationEnabled 
                    ? 'bg-white border-emerald-300 ring-1 ring-emerald-500/20' 
                    : 'bg-white/80 border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 block">Browser Push Alerts</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        browserNotificationEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {browserNotificationEnabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Visual popup banner & high-visibility sound alert on incoming orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        testSoundAlert();
                        showToast('Incoming Order Demo', 'Order #HH-DEMO from Kolkata received! Alert system is fully functional.', 'success');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Test live popup notification and sound"
                    >
                      <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Test</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleBrowserNotification();
                        setSettingsForm({ ...settingsForm, adminBrowserPushEnabled: !browserNotificationEnabled });
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        browserNotificationEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      aria-label="Toggle browser push notification"
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          browserNotificationEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Option 4: Meta WhatsApp Cloud API (Automated Background Dispatch) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50/60 rounded-2xl p-5 border border-emerald-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/90 pb-3">
                <div>
                  <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-emerald-600" />
                    <span>Option 4: Meta WhatsApp Cloud API (Automated Server Dispatch)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Automatically delivers incoming order notifications into your WhatsApp (+91 8017341130) in the background without opening WhatsApp.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Official Meta Graph API v20.0
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteSectionModal({
                        isOpen: true,
                        title: 'Delete WhatsApp Cloud API Credentials',
                        description: 'Are you sure you want to delete and wipe your Meta Graph API Token, Phone Number ID, and Business Account ID? Automated background dispatch will be disabled.',
                        confirmText: 'Delete API Credentials',
                        onConfirm: () => {
                          setSettingsForm(prev => ({
                            ...prev,
                            whatsappCloudApiEnabled: false,
                            whatsappCloudApiToken: '',
                            whatsappPhoneNumberId: '',
                            whatsappBusinessAccountId: '',
                            whatsappTemplateName: '',
                            whatsappTemplateLanguage: 'en'
                          }));
                          showToast('API Credentials Deleted', 'Meta WhatsApp Cloud API tokens and IDs have been wiped.', 'info');
                        }
                      });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Delete WhatsApp API Credentials"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Delete Credentials</span>
                  </button>
                </div>
              </div>

              {/* Master API Enable Toggle */}
              <div className={`p-4 rounded-xl border transition-all duration-200 shadow-2xs flex items-center justify-between gap-4 ${
                settingsForm.whatsappCloudApiEnabled 
                  ? 'bg-white border-emerald-300 ring-1 ring-emerald-500/20' 
                  : 'bg-white/80 border-slate-200'
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Automated Background Dispatch to Admin WhatsApp (+91 8017341130)
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      settingsForm.whatsappCloudApiEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {settingsForm.whatsappCloudApiEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    When enabled, orders are sent automatically in the background via Meta Cloud API upon placement.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, whatsappCloudApiEnabled: !settingsForm.whatsappCloudApiEnabled })}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                    settingsForm.whatsappCloudApiEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle WhatsApp Cloud API automated dispatch"
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settingsForm.whatsappCloudApiEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Meta Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={settingsForm.whatsappPhoneNumberId || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, whatsappPhoneNumberId: e.target.value.trim() })}
                    placeholder="e.g. 104829104829104"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 bg-white shadow-2xs transition-all"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    From Meta App Dashboard → WhatsApp → API Setup → Phone Number ID.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Admin Destination WhatsApp Number
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verified Admin
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-mono font-bold text-slate-500 select-none">
                      +91
                    </span>
                    <input
                      type="text"
                      value={settingsForm.adminWhatsAppNumber || '8017341130'}
                      onChange={e => setSettingsForm({ ...settingsForm, adminWhatsAppNumber: e.target.value.trim() })}
                      placeholder="8017341130"
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 bg-white shadow-2xs transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Admin WhatsApp destination: +91 8017341130.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Meta System / User Access Token (Bearer Token)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenSecret(!showTokenSecret)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {showTokenSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showTokenSecret ? 'Hide Token' : 'Show Token'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTokenSecret ? 'text' : 'password'}
                    value={settingsForm.whatsappCloudApiToken || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, whatsappCloudApiToken: e.target.value.trim() })}
                    placeholder="EAABw..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 bg-white pr-10 shadow-2xs transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Permanent System User Token or Temporary Token generated in Meta for Developers dashboard (Free 1,000 service conversations/month).
                </p>
              </div>

              {/* Live Test WhatsApp Button & Direct Link */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-emerald-200/90 shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Test WhatsApp Alert Delivery</span>
                  <span className="text-[11px] text-slate-500 block">Sends a test order notification message to +91 {settingsForm.adminWhatsAppNumber || '8017341130'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <a
                    href={`https://wa.me/91${(settingsForm.adminWhatsAppNumber || '8017341130').replace(/\D/g, '')}?text=${encodeURIComponent(
                      `🔔 *HH MINERAL WATER - TEST ORDER ALERT*\n\n✅ Target Admin WhatsApp: +91 8017341130\n⚡ Delivery: Live & Verified\n\n📌 *Order Details Preview:*\n• Customer: Admin Test Order\n• Total: ₹1,200\n• Items: 20L Bubbletop Jar x 2\n\n💬 HH Mineral Water automated dispatch system is ready!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
                    title="Test receiving message on +91 8017341130 right now (Zero Token / Setup needed)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>1-Click Direct Test</span>
                  </a>
                  <button
                    type="button"
                    disabled={isTestingWhatsApp}
                    onClick={handleTestWhatsAppCloudApi}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md hover:shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isTestingWhatsApp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Test Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test WhatsApp Alert</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {testWhatsAppResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in shadow-2xs ${
                    testWhatsAppResult.success
                      ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900'
                      : testWhatsAppResult.mode === 'CONFIG_REQUIRED'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-rose-100/70 border-rose-300 text-rose-900'
                  }`}
                >
                  {testWhatsAppResult.success ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : testWhatsAppResult.mode === 'CONFIG_REQUIRED' ? (
                    <Info className="w-4.5 h-4.5 text-amber-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold block text-xs">
                      {testWhatsAppResult.success
                        ? 'WhatsApp Message Dispatched Successfully!'
                        : testWhatsAppResult.mode === 'CONFIG_REQUIRED'
                        ? 'Meta Cloud API Setup in Progress'
                        : 'Meta API Connection Notice'}
                    </span>
                    <span className="text-[11px] mt-0.5 block leading-relaxed">
                      {testWhatsAppResult.message || testWhatsAppResult.error}
                    </span>
                    {testWhatsAppResult.directWhatsAppUrl && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center gap-2">
                        <a
                          href={testWhatsAppResult.directWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Open Direct Test Alert on +91 8017341130</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Setup Instructions Box */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-600">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>How to Get Free Meta WhatsApp Cloud API Credentials (Takes 2 minutes):</span>
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
                  <li>
                    Visit <strong className="text-slate-800">developers.facebook.com</strong> and click <strong>My Apps</strong> → <strong>Create App</strong> (Select <em>Other</em> → <em>Business</em>).
                  </li>
                  <li>
                    Add the <strong className="text-slate-800">WhatsApp</strong> product to your App.
                  </li>
                  <li>
                    Under <strong className="text-slate-800">WhatsApp → API Setup</strong>, copy the <strong className="text-slate-800">Phone Number ID</strong> and <strong className="text-slate-800">Temporary Access Token</strong> into the fields above.
                  </li>
                  <li>
                    Click <strong className="text-slate-800">Save Settings</strong> below, and new orders will automatically arrive in your WhatsApp (8017341130) in the background without opening WhatsApp!
                  </li>
                </ol>
              </div>
            </div>

            {/* Admin Order Email Notifications (Order Details Received in Admin Email ID) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 bg-gradient-to-br from-sky-50/80 via-indigo-50/40 to-slate-50/70 rounded-2xl p-5 border border-sky-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/90 pb-3">
                <div>
                  <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4.5 h-4.5 text-sky-600" />
                    <span>Admin Order Email Notifications (Order Details in Admin Email ID)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Automatically dispatches complete order details (customer details, delivery address, Google Maps route link, ordered items, and GST totals) to your admin email address.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100/90 px-2.5 py-1 rounded-full border border-sky-300 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
                    Automated Background Dispatch
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteSectionModal({
                        isOpen: true,
                        title: 'Clear Admin Notification Emails',
                        description: 'Are you sure you want to delete configured admin notification emails and pause automatic email dispatch?',
                        confirmText: 'Delete Email Settings',
                        onConfirm: () => {
                          setSettingsForm(prev => ({
                            ...prev,
                            adminEmailNotificationEnabled: false,
                            adminNotificationEmail: ''
                          }));
                          showToast('Email Settings Deleted', 'Admin email notifications have been cleared and paused.', 'info');
                        }
                      });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Delete Admin Email Settings"
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Delete / Clear</span>
                  </button>
                </div>
              </div>

              {/* Master Email Enable Toggle */}
              <div className={`p-4 rounded-xl border transition-all duration-200 shadow-2xs flex items-center justify-between gap-4 ${
                settingsForm.adminEmailNotificationEnabled !== false
                  ? 'bg-white border-sky-300 ring-1 ring-sky-500/20'
                  : 'bg-white/80 border-slate-200'
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Automated Order Dispatch to Admin Email ID
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      settingsForm.adminEmailNotificationEnabled !== false ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {settingsForm.adminEmailNotificationEnabled !== false ? 'ACTIVE' : 'MUTED'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    When active, every order created immediately triggers an email dispatch to the configured admin email addresses.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = settingsForm.adminEmailNotificationEnabled === false ? true : false;
                    setSettingsForm({ ...settingsForm, adminEmailNotificationEnabled: next });
                    showToast(
                      next ? 'Admin Email Alerts Active' : 'Admin Email Alerts Paused',
                      next ? 'Orders will be dispatched to your admin email.' : 'Admin email notification paused.',
                      'info'
                    );
                  }}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
                    settingsForm.adminEmailNotificationEnabled !== false ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                  aria-label="Toggle admin email notification"
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settingsForm.adminEmailNotificationEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Admin Email Input & Test Action */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Notification Email ID(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.adminNotificationEmail || 'mdc37332@gmail.com, mdhussain170707@gmail.com'}
                    onChange={e => setSettingsForm({ ...settingsForm, adminNotificationEmail: e.target.value })}
                    placeholder="mdc37332@gmail.com, mdhussain170707@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-sky-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter one or multiple comma-separated email addresses. Every new order details notification will be delivered to all listed admin emails.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Configured Recipients: <strong className="text-slate-800">{settingsForm.adminNotificationEmail || 'mdc37332@gmail.com, mdhussain170707@gmail.com'}</strong></span>
                  </div>

                  <button
                    type="button"
                    disabled={isTestingEmail}
                    onClick={async () => {
                      setIsTestingEmail(true);
                      setTestEmailResult(null);
                      try {
                        const target = settingsForm.adminNotificationEmail?.split(',')[0]?.trim() || 'mdc37332@gmail.com';
                        const res = await sendAdminTestEmail(target);
                        setTestEmailResult(res);
                      } catch (err: any) {
                        setTestEmailResult({ success: false, error: err.message || 'Test failed' });
                      } finally {
                        setIsTestingEmail(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {isTestingEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-sky-200" />
                    )}
                    <span>Send Verification Test Email</span>
                  </button>
                </div>
              </div>

              {/* Live Test Feedback Banner */}
              {testEmailResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in shadow-2xs ${
                    testEmailResult.success
                      ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900'
                      : testEmailResult.mode === 'CONFIG_REQUIRED'
                      ? 'bg-sky-50 border-sky-300 text-sky-950'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-700 shrink-0 mt-0.5" />
                  ) : testEmailResult.mode === 'CONFIG_REQUIRED' ? (
                    <Info className="w-4.5 h-4.5 text-sky-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold block text-xs">
                      {testEmailResult.success
                        ? 'Test Email Successfully Dispatched!'
                        : testEmailResult.mode === 'CONFIG_REQUIRED'
                        ? 'Email System Active (Safe Server Audit Mode)'
                        : 'Email Status Notice'}
                    </span>
                    <span className="text-[11px] mt-0.5 block leading-relaxed">
                      {testEmailResult.mode === 'SMTP'
                        ? `Real email dispatched via SMTP to ${(testEmailResult.targetEmails || []).join(', ')}.`
                        : testEmailResult.mode === 'CONFIG_REQUIRED'
                        ? `Server has formatted and recorded the test notification for ${(testEmailResult.targetEmails || []).join(', ')}. For direct delivery to your inbox, define SMTP_USER & SMTP_PASS (e.g. Gmail App Password) in Settings.`
                        : testEmailResult.error}
                    </span>
                  </div>
                </div>
              )}

              {/* SMTP Credentials Guidance Box */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-600">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-sky-600" />
                  <span>How Admin Order Email Delivery Works:</span>
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-600">
                  <li>
                    <strong className="text-slate-800">Automatic Trigger:</strong> Every incoming customer or offline order immediately gathers the client profile, order ID, items, delivery coordinates, Google Maps navigation route, and GST invoice summary.
                  </li>
                  <li>
                    <strong className="text-slate-800">SMTP Inbox Delivery:</strong> When <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[10px]">SMTP_USER</code> and <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[10px]">SMTP_PASS</code> (such as a 16-character Google App Password) are set in environment settings, an HTML email is delivered directly to your inbox.
                  </li>
                  <li>
                    <strong className="text-slate-800">Safe Fallback:</strong> If SMTP credentials are not yet defined, the server formats the complete order details and logs them securely to server records, preventing any order interruptions.
                  </li>
                </ul>
              </div>
            </div>

            {/* Section 1.5: Google Maps Factory Location & 7 Km Delivery Radius Logistics */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                  <span>Google Maps Factory Location &amp; 7 Km Delivery Logistics</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSectionModal({
                      isOpen: true,
                      title: 'Reset Factory Location & Delivery Logistics',
                      description: 'Are you sure you want to reset factory coordinates back to standard Kolkata plant (Sector V) and reset radius to 7.0 Km?',
                      confirmText: 'Reset Location',
                      onConfirm: () => {
                        setSettingsForm(prev => ({
                          ...prev,
                          factoryLatitude: 22.5726,
                          factoryLongitude: 88.4331,
                          factoryAddress: 'Plot 12, Block EP & GP, Sector V, Salt Lake, Kolkata, West Bengal - 700091',
                          factoryLocationName: 'HH Mineral Water Bottling Facility',
                          maxDeliveryRadiusKm: 7.0,
                          selfPickupAddress: '',
                          selfPickupTimings: '',
                          selfPickupContact: ''
                        }));
                        showToast('Location Reset', 'Factory coordinates restored to default.', 'info');
                      }
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Reset Factory Location"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete / Reset</span>
                </button>
              </div>
              <AdminFactoryLocationEditor
                factoryLatitude={settingsForm.factoryLatitude || 22.5726}
                factoryLongitude={settingsForm.factoryLongitude || 88.4331}
                factoryAddress={settingsForm.factoryAddress || 'Plot 12, Block EP & GP, Sector V, Salt Lake, Kolkata, West Bengal - 700091'}
                factoryLocationName={settingsForm.factoryLocationName || 'HH Mineral Water Bottling Facility'}
                maxDeliveryRadiusKm={settingsForm.maxDeliveryRadiusKm || 7.0}
                onChange={updates => {
                  setSettingsForm(prev => ({
                    ...prev,
                    factoryLatitude: updates.factoryLatitude,
                    factoryLongitude: updates.factoryLongitude,
                    factoryAddress: updates.factoryAddress,
                    maxDeliveryRadiusKm: updates.maxDeliveryRadiusKm,
                    ...(updates.selfPickupAddress ? { selfPickupAddress: updates.selfPickupAddress } : {})
                  }));
                }}
              />

              {/* Self Pickup Configuration */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>🏬 Factory Self Pickup Configuration</span>
                    </h5>
                    <p className="text-xs text-slate-500">Allow customers to collect orders directly from the bottling plant with zero delivery fees.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.selfPickupEnabled !== false}
                      onChange={e => setSettingsForm({ ...settingsForm, selfPickupEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable Pickup</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Self Pickup Counter Address
                    </label>
                    <input
                      type="text"
                      value={settingsForm.selfPickupAddress || 'Factory Dispatch Counter #1, Plot 12, Sector V, Salt Lake, Kolkata, West Bengal - 700091'}
                      onChange={e => setSettingsForm({ ...settingsForm, selfPickupAddress: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-cyan-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Operating Timings for Pickup
                    </label>
                    <input
                      type="text"
                      value={settingsForm.selfPickupTimings || 'Monday – Sunday: 8:30 AM – 8:30 PM (Ready in 30 Mins)'}
                      onChange={e => setSettingsForm({ ...settingsForm, selfPickupTimings: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-cyan-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pickup Dispatch Desk Phone
                    </label>
                    <input
                      type="text"
                      value={settingsForm.selfPickupContact || '+91 8017341130'}
                      onChange={e => setSettingsForm({ ...settingsForm, selfPickupContact: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-cyan-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: GST & Tax Registration Details */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-600" />
                  <span>GSTIN &amp; Tax Registration Compliance</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSectionModal({
                      isOpen: true,
                      title: 'Delete GSTIN & Tax Registration Details',
                      description: 'Are you sure you want to delete and clear GSTIN, PAN, and FSSAI license numbers?',
                      confirmText: 'Delete Tax Details',
                      onConfirm: () => {
                        setSettingsForm(prev => ({
                          ...prev,
                          gstin: '',
                          pan: '',
                          fssaiNumber: ''
                        }));
                        showToast('Tax Numbers Cleared', 'GSTIN, PAN, and FSSAI numbers have been deleted.', 'info');
                      }
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Delete Tax Details"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete Tax Details</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Legal Business Entity Name *
                    </label>
                    {settingsForm.legalBusinessName && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, legalBusinessName: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={settingsForm.legalBusinessName || 'HH MINERAL WATER ENTERPRISES PVT LTD'}
                    onChange={e => setSettingsForm({ ...settingsForm, legalBusinessName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Trade / Brand Name
                    </label>
                    {settingsForm.tradeName && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, tradeName: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.tradeName || 'HH MINERAL WATER'}
                    onChange={e => setSettingsForm({ ...settingsForm, tradeName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      GSTIN (15-digit Tax Number) *
                    </label>
                    {settingsForm.gstin && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, gstin: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear GSTIN"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    value={settingsForm.gstin || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="19AAACH7890C1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      PAN Number
                    </label>
                    {settingsForm.pan && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, pan: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear PAN"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={settingsForm.pan || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, pan: e.target.value.toUpperCase() })}
                    placeholder="AAACH7890C"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      FSSAI License Number
                    </label>
                    {settingsForm.fssaiNumber && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, fssaiNumber: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear FSSAI"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={14}
                    value={settingsForm.fssaiNumber || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, fssaiNumber: e.target.value })}
                    placeholder="12823999000145"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={28}
                    value={settingsForm.defaultGstRate ?? 18}
                    onChange={e => setSettingsForm({ ...settingsForm, defaultGstRate: parseFloat(e.target.value) || 18 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:border-cyan-600 outline-none"
                  />
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">Packaged water is taxed under HSN 2201 at 18% (9% CGST + 9% SGST). Selling prices already include 18% GST.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice Series Prefix
                  </label>
                  <input
                    type="text"
                    value={settingsForm.invoicePrefix || 'HH/2026/'}
                    onChange={e => setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value })}
                    placeholder="HH/2026/"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Registered Business Address */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Registered Business Address &amp; Location of Supplier</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSectionModal({
                      isOpen: true,
                      title: 'Delete Registered Business Address',
                      description: 'Are you sure you want to delete and clear street address, city, state, state code, and pincode?',
                      confirmText: 'Clear Address',
                      onConfirm: () => {
                        setSettingsForm(prev => ({
                          ...prev,
                          businessAddress: '',
                          city: '',
                          state: '',
                          stateCode: '',
                          pincode: ''
                        }));
                        showToast('Address Cleared', 'Business address fields deleted.', 'info');
                      }
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Delete Address"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete Address</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Street / Factory Address *
                  </label>
                  {settingsForm.businessAddress && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, businessAddress: '' })}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                      title="Clear field"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={settingsForm.businessAddress || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, businessAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">City</label>
                    {settingsForm.city && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, city: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.city || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">State</label>
                    {settingsForm.state && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, state: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.state || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">State Code</label>
                    {settingsForm.stateCode && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, stateCode: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={2}
                    value={settingsForm.stateCode || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, stateCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Pincode</label>
                    {settingsForm.pincode && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, pincode: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={settingsForm.pincode || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Bank Account & UPI Settlement */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Bank Settlement &amp; UPI Details (Printed on Invoices)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSectionModal({
                      isOpen: true,
                      title: 'Delete Bank & UPI Settlement Details',
                      description: 'Are you sure you want to delete bank name, account holder, account number, IFSC code, and UPI VPA ID?',
                      confirmText: 'Delete Bank Details',
                      onConfirm: () => {
                        setSettingsForm(prev => ({
                          ...prev,
                          bankName: '',
                          accountHolderName: '',
                          accountNumber: '',
                          ifscCode: '',
                          upiId: ''
                        }));
                        showToast('Bank Details Deleted', 'Bank account and UPI details have been cleared.', 'info');
                      }
                    });
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Delete Bank Details"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete Bank Details</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Bank Name</label>
                    {settingsForm.bankName && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, bankName: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.bankName || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Account Holder Name</label>
                    {settingsForm.accountHolderName && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, accountHolderName: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear field"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.accountHolderName || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, accountHolderName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Account Number</label>
                    {settingsForm.accountNumber && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, accountNumber: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear Account Number"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.accountNumber || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">IFSC Code</label>
                    {settingsForm.ifscCode && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, ifscCode: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear IFSC"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.ifscCode || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">UPI VPA ID</label>
                    {settingsForm.upiId && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, upiId: '' })}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Clear UPI ID"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={settingsForm.upiId || ''}
                    onChange={e => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-cyan-600 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: ADMIN MASTER DATA DELETION & SYSTEM PURGE CENTER */}
            <div className="space-y-4 pt-6 border-t-2 border-rose-200 bg-gradient-to-br from-rose-50/90 via-red-50/40 to-slate-50/60 rounded-3xl p-6 border border-rose-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <h4 className="font-heading text-base font-black text-rose-950">
                      Admin Master Data Deletion &amp; System Reset Center
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                      Admin Only • Irreversible
                    </span>
                  </div>
                  <p className="text-xs text-rose-800/80 mt-1">
                    Directly delete all stored transaction records, customer orders, offline invoices, expenses, or execute a total factory reset.
                  </p>
                </div>
              </div>

              {/* Grid of Data Deletion Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Delete All Orders */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Customer Orders</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {orders.length} Records
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Delete all customer online orders, tracking stages, and revenue totals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmDeleteAllOrdersOpen(true)}
                    disabled={orders.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Orders</span>
                  </button>
                </div>

                {/* 2. Delete All Offline Invoices */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Offline GST Invoices</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {invoices.length} Invoices
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Delete all generated offline GST tax invoices and counter tax records.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmDeleteAllInvoicesOpen(true)}
                    disabled={invoices.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Invoices</span>
                  </button>
                </div>

                {/* 3. Delete All Custom Label Orders */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Custom Label Studio</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {customOrdersCount} Designs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Delete all customized label orders, design uploads, and print proofs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmDeleteAllCustomOrdersOpen(true)}
                    disabled={customOrdersCount === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Custom Orders</span>
                  </button>
                </div>

                {/* 4. Delete All Plant Expenses */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Plant Expenses &amp; Purchases</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        Purchases Ledger
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Delete all raw material purchase bills, overhead expenses, and journal vouchers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmDeleteAllExpensesOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Expenses</span>
                  </button>
                </div>

                {/* 5. Delete All Offline Customers */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Customer Directory</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {customersList.length} Profiles
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Delete all registered customer directory entries and buyer profiles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmDeleteAllCustomersOpen(true)}
                    disabled={customersList.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Customers</span>
                  </button>
                </div>

                {/* 6. Reset All Store Settings */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200/90 shadow-2xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Store Settings &amp; GST</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        Factory Defaults
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Reset all GSTIN, legal names, bank details, and contact numbers to factory presets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmResetSettingsOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Reset Settings to Defaults</span>
                  </button>
                </div>
              </div>

              {/* Master Full System Purge Nuclear Button */}
              <div className="bg-gradient-to-r from-rose-900 via-red-950 to-slate-950 p-5 rounded-2xl border border-rose-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <span className="font-heading font-black text-sm text-white">
                      MASTER FACTORY PURGE (Complete System Reset)
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/80 max-w-xl">
                    Permanently deletes ALL customer orders, offline GST invoices, custom studio requests, plant expenses, customer directories, and resets all settings to clean zero-base factory state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmMasterPurgeOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2 border border-rose-400/40"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>MASTER PURGE EVERYTHING</span>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setIsConfirmResetSettingsOpen(true)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer transition-colors"
                title="Reset settings back to factory configuration"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset / Delete Custom Settings</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save All Store & GST Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FACTORY STAFF RESTRICTED TAB FALLBACK */}
      {isFactoryStaffMode && !['dashboard', 'orders', 'bulk-inquiries', 'water-quality', 'invoices', 'inventory'].includes(activeTab) && (
        <div className="bg-white rounded-3xl border border-amber-200 p-8 shadow-xs text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="font-heading text-lg font-bold text-slate-900">
            Administrator Clearance Required
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The requested section (Custom Design Studio, Product Catalog, Hero & Bottle Images, Plant Expenses, Journal & CA Audit, Customers Directory, or Settings) is strictly reserved for Administrator Master credentials. Factory Staff accounts have operational access to Dashboard Overview, Orders Management, Bulk & Events, Water Quality & Lab Logs, and GST Invoices.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Return to Dashboard Overview
          </button>
        </div>
      )}

      {/* DELIVERY DISPATCH CHALLAN MODAL */}
      {selectedChallanOrder && (
        <DeliveryChallanModal
          order={selectedChallanOrder}
          adminSettings={adminSettings}
          settings={adminSettings}
          onClose={() => setSelectedChallanOrder(null)}
        />
      )}

      {/* REGISTER DIRECT CUSTOMER MODAL */}
      {isAddCustomerModalOpen && (
        <AddCustomerModal
          onAddCustomer={(customer) => {
            setRegisteredOfflineCustomers(prev => {
              const updated = [customer, ...prev.filter(c => c.phone !== customer.phone)];
              try {
                localStorage.setItem('hh_registered_offline_customers', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast('Customer Profile Saved', `Added ${customer.name} to business directory.`, 'success');
          }}
          onOpenInvoiceModal={(customer) => {
            setRegisteredOfflineCustomers(prev => {
              const updated = [customer, ...prev.filter(c => c.phone !== customer.phone)];
              try {
                localStorage.setItem('hh_registered_offline_customers', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            setSelectedCustomerForOfflineInvoice(customer);
            setIsOfflineInvoiceModalOpen(true);
          }}
          onClose={() => setIsAddCustomerModalOpen(false)}
        />
      )}

      {/* OFFLINE COUNTER SALE & GST TAX INVOICE MODAL */}
      {isOfflineInvoiceModalOpen && (
        <OfflineInvoiceModal
          initialCustomer={selectedCustomerForOfflineInvoice || undefined}
          existingCustomers={customersList}
          onClose={() => {
            setIsOfflineInvoiceModalOpen(false);
            setSelectedCustomerForOfflineInvoice(null);
          }}
          onSuccess={(invoice) => {
            const customerName = invoice?.customerDetails?.name || invoice?.customer?.name || 'Customer';
            const customerPhone = invoice?.customerDetails?.phone || invoice?.customer?.phone || '';
            const totalAmount = invoice?.grandTotal ?? invoice?.totalAmount ?? 0;
            const invNum = invoice?.invoiceNumber || invoice?.id || '';

            showToast(
              'GST Invoice Created & Booked',
              `Tax Invoice #${invNum} created for ${customerName}. Total: ₹${Number(totalAmount).toFixed(2)} (credited to revenue).`,
              'success'
            );

            if (customerPhone) {
              setRegisteredOfflineCustomers(prev => {
                const updated = [
                  {
                    name: customerName,
                    phone: customerPhone,
                    address: invoice?.customerDetails?.address || invoice?.customer?.address || '',
                    city: invoice?.customerDetails?.city || invoice?.customer?.city || 'Kolkata',
                    pincode: invoice?.customerDetails?.pincode || invoice?.customer?.pincode || '700091',
                    gstin: invoice?.customerDetails?.gstin || invoice?.customer?.gstin,
                    isOfflineCustomer: true
                  },
                  ...prev.filter(c => c.phone !== customerPhone)
                ];
                try {
                  localStorage.setItem('hh_registered_offline_customers', JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          }}
        />
      )}

      {/* CANCEL ORDER MODAL (ADMIN ONLY) */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">Cancel Order</h3>
                  <p className="text-xs text-slate-500 font-mono">Order ID: {orderToCancel.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderToCancel(null);
                  setCustomCancelReasonText('');
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary Pill */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Customer:</span>
                <span className="font-bold text-slate-800">{orderToCancel.customer.name}</span>
                <span className="text-slate-500 block">{orderToCancel.customer.phone}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-semibold block">Amount:</span>
                <span className="font-extrabold text-cyan-800 text-sm">₹{orderToCancel.totalAmount}</span>
                <span className="text-slate-500 block">{orderToCancel.items.length} item(s)</span>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Cancellation Reason
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Customer requested cancellation',
                  'Out of plant delivery coverage area',
                  'Duplicate or test order',
                  'Payment verification pending / failed',
                  'Bottling plant inventory overload',
                  'Customer unreachable via phone or WhatsApp',
                  'Other (Custom reason)'
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReasonPreset(reason)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      cancelReasonPreset === reason
                        ? 'border-rose-500 bg-rose-50/70 text-rose-950 font-bold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>{reason}</span>
                    {cancelReasonPreset === reason && (
                      <Check className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Note / Remarks:
                </label>
                <textarea
                  rows={2}
                  value={customCancelReasonText}
                  onChange={(e) => setCustomCancelReasonText(e.target.value)}
                  placeholder="Optional details about this cancellation..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Cancelling this order updates its status in the system and notifies customer live tracking. The order will remain in your archive for audit records.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOrderToCancel(null);
                  setCustomCancelReasonText('');
                }}
                disabled={isSubmittingCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Keep Order Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                disabled={isSubmittingCancel}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENTLY DELETE ORDER MODAL (ADMIN ONLY) */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete Order Permanently</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {orderToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove this order from the system?
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">
                Customer: <span className="text-slate-900">{orderToDelete.customer.name}</span> ({orderToDelete.customer.phone})
              </p>
              <p className="text-slate-600">
                Total Value: <span className="font-bold text-cyan-800">₹{orderToDelete.totalAmount}</span> • {orderToDelete.items.length} items
              </p>
              <p className="text-slate-500 text-[11px]">
                Created: {new Date(orderToDelete.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This will delete the order record from the cloud database, local storage, and all active dashboards. This operation cannot be reversed.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                disabled={isSubmittingDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingDelete ? 'Deleting...' : 'Yes, Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENTLY DELETE SINGLE PRODUCT MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete Product Variant</h3>
                <p className="text-xs text-slate-500 font-mono">ID: {productToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove this product from the live store catalog?
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800 text-sm">
                {productToDelete.name} ({productToDelete.size})
              </p>
              <p className="text-slate-600">
                Rate: <span className="font-bold text-cyan-800">₹{productToDelete.price}/bottle</span> • MRP: ₹{productToDelete.mrp}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This will remove the product across all connected customer devices and create an immutable audit record.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-product"
                onClick={async () => {
                  setIsDeletingProduct(true);
                  try {
                    await deleteProduct(productToDelete.id);
                    setProductToDelete(null);
                  } catch (delErr) {
                    console.error('Failed to delete product:', delErr);
                    setProductToDelete(null);
                  } finally {
                    setIsDeletingProduct(false);
                  }
                }}
                disabled={isDeletingProduct}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProduct ? 'Deleting...' : 'Yes, Delete Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL PRODUCTS MODAL */}
      {isConfirmDeleteAllProductsOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete Entire Catalog</h3>
                <p className="text-xs text-slate-500">Remove all products from store</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove <strong>all {products.length} product(s)</strong> from the live store catalog and database?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This operation will clear all bottle variants across all connected customer devices.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllProductsOpen(false)}
                disabled={isActionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsActionInProgress(true);
                  try {
                    await deleteAllProducts();
                    setIsConfirmDeleteAllProductsOpen(false);
                  } finally {
                    setIsActionInProgress(false);
                  }
                }}
                disabled={isActionInProgress}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isActionInProgress ? 'Clearing Catalog...' : 'Yes, Delete All Products'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE DEFAULT PRODUCTS MODAL */}
      {isConfirmResetDefaultsOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-cyan-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                <RefreshCw className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Restore Default Catalog</h3>
                <p className="text-xs text-slate-500">Restore 4 standard bottle variants</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will restore the standard 4 mineral water bottle products (250ml, 500ml, 1L, and 2L) with standard pricing, descriptions, and mineral analysis specs.
            </p>

            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-xs text-cyan-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                Standard bottle presets will be saved and broadcasted across all devices.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmResetDefaultsOpen(false)}
                disabled={isActionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsActionInProgress(true);
                  try {
                    await resetProductsToDefault();
                    setIsConfirmResetDefaultsOpen(false);
                  } finally {
                    setIsActionInProgress(false);
                  }
                }}
                disabled={isActionInProgress}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isActionInProgress ? 'Restoring...' : 'Yes, Restore Defaults'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR PRODUCT AUDIT LOGS MODAL */}
      {isConfirmClearProductAuditOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Clear Audit History</h3>
                <p className="text-xs text-slate-500">Wipe all product change logs</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all product audit logs? This action will permanently remove all product change history across databases and local storage.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmClearProductAuditOpen(false)}
                disabled={isActionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsActionInProgress(true);
                  try {
                    await clearProductAuditLogs();
                    setIsConfirmClearProductAuditOpen(false);
                  } finally {
                    setIsActionInProgress(false);
                  }
                }}
                disabled={isActionInProgress}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isActionInProgress ? 'Clearing...' : 'Yes, Clear Audit Logs'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE GST INVOICE MODAL */}
      {invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete GST Tax Invoice</h3>
                <p className="text-xs text-slate-500 font-mono">Invoice: {invoiceToDelete.invoiceNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Tax Invoice <strong>#{invoiceToDelete.invoiceNumber}</strong> for Order <span className="font-mono font-bold text-cyan-700">{invoiceToDelete.orderId}</span>?
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">
                Customer: <span className="text-slate-900">{invoiceToDelete.customerDetails?.name || 'Customer'}</span> ({invoiceToDelete.customerDetails?.phone || ''})
              </p>
              <p className="text-slate-600">
                Invoice Total: <span className="font-bold text-cyan-800">₹{invoiceToDelete.grandTotal}</span> • Date: {new Date(invoiceToDelete.invoiceDate).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This will permanently delete this tax invoice from the database and local records.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                disabled={isDeletingInvoice}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeletingInvoice(true);
                  try {
                    await deleteInvoice(invoiceToDelete.id);
                    setInvoiceToDelete(null);
                  } finally {
                    setIsDeletingInvoice(false);
                  }
                }}
                disabled={isDeletingInvoice}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingInvoice ? 'Deleting...' : 'Yes, Delete Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL INVOICES MODAL */}
      {isConfirmDeleteAllInvoicesOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Clear Invoices Register</h3>
                <p className="text-xs text-rose-600 font-bold">Delete All GST Invoices</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong>all {invoices.length} GST invoice(s)</strong> from the official tax register?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This action deletes the generated invoice records from the database. Invoices can be re-generated on-demand from existing orders if needed.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllInvoicesOpen(false)}
                disabled={isActionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-invoices"
                onClick={async () => {
                  setIsActionInProgress(true);
                  try {
                    await deleteAllInvoices();
                    setIsConfirmDeleteAllInvoicesOpen(false);
                  } finally {
                    setIsActionInProgress(false);
                  }
                }}
                disabled={isActionInProgress}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isActionInProgress ? 'Clearing...' : 'Yes, Delete All Invoices'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL ORDERS MODAL */}
      {isConfirmDeleteAllOrdersOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete All Orders</h3>
                <p className="text-xs text-rose-600 font-bold">Wipe Entire Orders Database</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all <strong className="text-slate-900 font-bold">{orders.length} orders</strong>? This removes customer order histories, tracking records, and fulfillment states across all devices.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                Make sure to export an orders CSV backup before proceeding. This cannot be undone.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOrdersOpen(false)}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllOrders}
                disabled={isSubmittingDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingDelete ? 'Deleting...' : 'Yes, Delete All Orders'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CUSTOM ORDERS MODAL */}
      {isConfirmDeleteAllCustomOrdersOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Clear Custom Queue</h3>
                <p className="text-xs text-rose-600 font-bold">Remove All Custom Brand Orders</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all <strong className="text-slate-900 font-bold">{customOrdersOnly.length} custom design orders</strong>? This removes custom label specs, customer brand logos, and artwork details.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllCustomOrdersOpen(false)}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllCustomOrders}
                disabled={isSubmittingDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingDelete ? 'Deleting...' : 'Yes, Delete Custom Orders'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE CUSTOMER DELETE MODAL */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete Customer Profile</h3>
                <p className="text-xs text-slate-500 font-mono">{customerToDelete.phone}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 font-bold">{customerToDelete.name}</strong> from the customer directory?
            </p>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">{customerToDelete.name}</p>
              <p className="text-slate-600">Phone: {customerToDelete.phone} • Total Orders: {customerToDelete.orderCount}</p>
              <p className="text-cyan-800 font-bold">Total Spent: ₹{customerToDelete.totalSpent.toFixed(2)}</p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                Deleting this customer will remove their associated orders and directory entries from the system.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={isSubmittingDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingDelete ? 'Deleting...' : 'Delete Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CUSTOMERS MODAL */}
      {isConfirmDeleteAllCustomersOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete All Customers</h3>
                <p className="text-xs text-rose-600 font-bold">Clear Customer Records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all <strong className="text-slate-900 font-bold">{customersList.length} customer profiles</strong> and their associated orders?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                This wipes all customer aggregation and order data across connected databases. Export a CSV first if needed.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllCustomersOpen(false)}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllCustomers}
                disabled={isSubmittingDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmittingDelete ? 'Deleting...' : 'Yes, Delete All Customers'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR AUDIT LOGS MODAL */}
      {isConfirmClearAuditLogsOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Clear Security Audit Trail</h3>
                <p className="text-xs text-slate-500 font-mono">{auditLogsList.length} events recorded</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all recorded administrative login, status change, and security audit events?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmClearAuditLogsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAuditLogs}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Audit Logs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET / DELETE CUSTOM SETTINGS MODAL */}
      {isConfirmResetSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Reset Store Settings</h3>
                <p className="text-xs text-slate-500">Restore factory configuration</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete custom store and GST settings and restore factory default parameters?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                This will reset legal business name, GSTIN, default charges, and contact numbers to the standard HH Mineral Water defaults.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmResetSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetSettings}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOM HERO VISUAL MODAL */}
      {isConfirmDeleteHeroVisualOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2a2a2a] animate-in fade-in zoom-in-95 space-y-4 text-white">
            <div className="flex items-center gap-3 pb-3 border-b border-[#262626]">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/50 text-rose-400 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-white">Reset Storefront Visuals</h3>
                <p className="text-xs text-neutral-400">Restore default signature bottle showcase</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to remove the custom hero bottle visual and video showcase, restoring the original signature mineral water bottle presentation on the storefront?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="button"
                id="btn-cancel-delete-hero-visual"
                onClick={() => setIsConfirmDeleteHeroVisualOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-[#202020] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-hero-visual"
                onClick={handleConfirmDeleteHeroVisual}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Visuals</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION DELETE / CLEAR CONFIRMATION MODAL */}
      {deleteSectionModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">{deleteSectionModal.title}</h3>
                <p className="text-xs text-slate-500">Settings Section Data Deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteSectionModal.description}
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                This will clear the selected configuration fields in the settings form. Click &quot;Save All Store &amp; GST Settings&quot; to commit changes to the database.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteSectionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteSectionModal.onConfirm();
                  setDeleteSectionModal(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteSectionModal.confirmText || 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL EXPENSES MODAL */}
      {isConfirmDeleteAllExpensesOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">Delete All Plant Expenses</h3>
                <p className="text-xs text-slate-500">Purge purchase invoices and expense ledgers</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete all plant expenses, raw material purchase bills, overhead vouchers, and accounting expense transactions?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                This will reset the total expenses in the CA Audit &amp; Journal to ₹0. This action is irreversible.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllExpensesOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllExpenses}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Expenses</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER SYSTEM PURGE CONFIRMATION MODAL */}
      {isConfirmMasterPurgeOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-rose-600/60 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-heading font-black text-xl text-white">Master Factory Purge</h3>
                <p className="text-xs text-rose-300/80">Complete System Reset &amp; Clean Slate</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to execute a <strong className="text-rose-400">Total Factory Purge</strong>? This will permanently delete:
            </p>

            <ul className="text-xs text-slate-300 space-y-1.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 list-disc list-inside">
              <li>All Customer Orders &amp; Dispatch Stages ({orders.length} orders)</li>
              <li>All Generated Offline GST Tax Invoices ({invoices.length} invoices)</li>
              <li>All Custom Label Studio Orders ({customOrdersCount} designs)</li>
              <li>All Plant Expenses, Purchase Bills, and Voucher Ledgers</li>
              <li>All Registered Offline Customers ({customersList.length} profiles)</li>
              <li>All Administrative &amp; Security Audit Logs</li>
              <li>Reset all Store, GST, Contact, and Bank settings to clean factory defaults</li>
            </ul>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={() => setIsConfirmMasterPurgeOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleMasterFactoryPurge}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Purge...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Yes, Purge Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY CHALLAN MODAL */}
      {selectedChallanOrder && (
        <DeliveryChallanModal
          order={selectedChallanOrder}
          settings={adminSettings || DEFAULT_ADMIN_SETTINGS}
          onClose={() => setSelectedChallanOrder(null)}
        />
      )}

      {/* ORDER DISPATCH QR CODE & VERIFICATION MODAL */}
      {selectedQrOrder && (
        <OrderDispatchQrModal
          order={selectedQrOrder}
          adminSettings={adminSettings}
          isFactoryStaffMode={isFactoryStaffMode}
          onClose={() => setSelectedQrOrder(null)}
        />
      )}

      {/* QUICK SCAN-TO-DELIVER OVERLAY MODAL */}
      <QuickDispatchScannerModal
        isOpen={isQuickDeliverScannerOpen}
        onClose={() => setIsQuickDeliverScannerOpen(false)}
      />

      {/* DRIVER NAVIGATION & DISPATCH MODAL (GOOGLE MAPS) */}
      {selectedNavOrder && (
        <DriverNavigationModal
          order={selectedNavOrder}
          onClose={() => setSelectedNavOrder(null)}
          factoryCoords={{
            lat: adminSettings?.factoryLatitude || 22.5802,
            lng: adminSettings?.factoryLongitude || 88.4272
          }}
        />
      )}
    </div>
  );
};
