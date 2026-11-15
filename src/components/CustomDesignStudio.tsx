import React, { useState, useEffect, useMemo } from 'react';
import { useStore, isProductVisibleInStore } from '../context/StoreContext';
import { Product, CustomDesignDetails, CustomFeatureItem } from '../types';
import { OriginalImageUploader, UploadedImageData } from './OriginalImageUploader';
import { DEFAULT_BOTTLE_IMAGE } from '../data/bottlePresets';
import {
  Sparkles,
  ShoppingBag,
  UploadCloud,
  CheckCircle2,
  Palette,
  FileText,
  Layers,
  ArrowRight,
  Eye,
  Info,
  Droplet,
  Crown,
  Heart,
  Briefcase,
  Building2,
  Gift,
  HelpCircle,
  ShieldCheck,
  Image as ImageIcon,
  Check,
  Lock,
  Minus,
  Plus,
  AlertCircle,
  Edit3,
  Camera,
  DollarSign,
  Settings,
  X,
  QrCode,
  Tag,
  Sliders,
  Percent,
  Trash2,
  PlusCircle,
  RefreshCw,
  Zap,
  ExternalLink,
  Video,
  Play,
  Upload,
  Calendar,
  Clock
} from 'lucide-react';

export const CustomDesignStudio: React.FC = () => {
  const {
    products,
    selectedProductForCustom,
    setSelectedProductForCustom,
    addToCart,
    setIsCartOpen,
    setCurrentSection,
    currentUser,
    openAuthModal,
    showToast,
    isAdminUnlocked,
    isFactoryStaffUnlocked,
    adminSettings,
    addProduct,
    updateProduct,
    orders
  } = useStore();

  const isOwnerAdminOnly = Boolean(isAdminUnlocked && !isFactoryStaffUnlocked);
  const visibleStudioProducts = useMemo(() => {
    if (isOwnerAdminOnly) return products;
    return products.filter(p => isProductVisibleInStore(p, adminSettings));
  }, [products, adminSettings, isOwnerAdminOnly]);

  // State
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedProductForCustom?.id || visibleStudioProducts[0]?.id || products[0]?.id || 'prod-250ml'
  );

  const [eventType, setEventType] = useState<CustomDesignDetails['eventType']>('Wedding');
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [customText, setCustomText] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [dateOrVenue, setDateOrVenue] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // 1-Week Advance Notice Lead Time Calculation (Minimum 7 days before event)
  const minLeadDays = 7;
  const today = new Date();
  const minLeadDate = new Date(today.getTime() + minLeadDays * 24 * 60 * 60 * 1000);
  const minEventDateStr = minLeadDate.toISOString().split('T')[0];
  const minLeadDateFormatted = minLeadDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getDaysUntilDate = (dStr: string): number | null => {
    if (!dStr) return null;
    const target = new Date(dStr);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysUntilEvent = eventDate ? getDaysUntilDate(eventDate) : null;
  const isLeadTimeValid = daysUntilEvent === null || daysUntilEvent >= 7;
  const [labelThemeColor, setLabelThemeColor] = useState('#0284c7'); // Cyan 600
  const [labelTextColor, setLabelTextColor] = useState('#ffffff');
  const [finishType, setFinishType] = useState<CustomDesignDetails['finishType']>('Matte Luxury');
  const [bottleCapColor, setBottleCapColor] = useState('#0284c7');
  const [uploadedImages, setUploadedImages] = useState<UploadedImageData[]>([]);
  const [quantity, setQuantity] = useState(600); // Minimum 600 pieces, unlimited max
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Sync if context set selectedProductForCustom
  useEffect(() => {
    if (selectedProductForCustom) {
      if (isOwnerAdminOnly || isProductVisibleInStore(selectedProductForCustom, adminSettings)) {
        setSelectedProductId(selectedProductForCustom.id);
      }
    }
  }, [selectedProductForCustom, isOwnerAdminOnly, adminSettings]);

  // Keep selectedProductId valid if current selection becomes hidden for non-owners
  useEffect(() => {
    if (visibleStudioProducts.length > 0 && !visibleStudioProducts.some(p => p.id === selectedProductId)) {
      setSelectedProductId(visibleStudioProducts[0].id);
    }
  }, [visibleStudioProducts, selectedProductId]);

  // Default Custom Features & Add-ons Suite
  const DEFAULT_CUSTOM_FEATURES: CustomFeatureItem[] = [
    {
      id: 'feat-cap-seal',
      name: 'Holographic Tamper-Evident Cap Seal',
      description: 'Laser-etched holographic security shrink band around the bottle neck',
      pricePerBottle: 0.5,
      enabled: false,
      category: 'cap'
    },
    {
      id: 'feat-cap-emboss',
      name: 'Embossed Crown / Monogram on Cap',
      description: 'Custom hot-stamped branding embossed on top of the bottle cap',
      pricePerBottle: 0.75,
      enabled: false,
      category: 'cap'
    },
    {
      id: 'feat-qr-dynamic',
      name: 'Dynamic QR Code on Back Label',
      description: 'Live scannable QR linking to wedding gallery, company portal, or venue map',
      pricePerBottle: 0,
      enabled: true,
      category: 'label'
    },
    {
      id: 'feat-foil-accent',
      name: 'Metallic Gold / Silver Foil Stamping',
      description: 'Reflective metallic foil embossing for luxury brand crest and typography',
      pricePerBottle: 1.0,
      enabled: false,
      category: 'label'
    },
    {
      id: 'feat-soft-touch',
      name: 'Scratch-Proof Soft-Touch Velvet Matte',
      description: 'Silky smooth tactile finish with waterproof UV resistance',
      pricePerBottle: 0.8,
      enabled: false,
      category: 'label'
    },
    {
      id: 'feat-alkaline-infusion',
      name: 'Alkaline pH 8.5+ Ionized Infusion',
      description: 'Electrolyte-balanced alkaline mineral water formulation',
      pricePerBottle: 1.5,
      enabled: false,
      category: 'water'
    },
    {
      id: 'feat-rock-salt',
      name: 'Natural Himalayan Rock Salt Minerals',
      description: 'Micro-dose Himalayan pink salt trace minerals for crisp palate freshness',
      pricePerBottle: 0.5,
      enabled: false,
      category: 'water'
    },
    {
      id: 'feat-master-carton',
      name: 'Custom Branded Master Cartons',
      description: 'Heavy-duty corrugated outer cases custom printed with your logo',
      pricePerBottle: 1.0,
      enabled: false,
      category: 'packaging'
    },
    {
      id: 'feat-satin-ribbon',
      name: 'Individual Satin Ribbon & Neck Tag',
      description: 'Hand-tied luxury satin bow or welcome gift neck tag on each bottle',
      pricePerBottle: 1.5,
      enabled: false,
      category: 'packaging'
    },
    {
      id: 'feat-rush-bottling',
      name: 'Priority 48-Hour Plant Bottling Rush',
      description: 'Expedited fast-track cylinder printing and bottling line priority',
      pricePerBottle: 1.5,
      enabled: false,
      category: 'custom'
    }
  ];

  const CAP_COLOR_PRESETS = [
    { name: 'Royal Cyan', hex: '#0284c7' },
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Midnight Black', hex: '#0f172a' },
    { name: 'Imperial Gold', hex: '#d97706' },
    { name: 'Sapphire Blue', hex: '#1d4ed8' },
    { name: 'Emerald Green', hex: '#059669' },
    { name: 'Ruby Wine', hex: '#be123c' },
    { name: 'Silver Chrome', hex: '#94a3b8' }
  ];

  // Custom Features & Smart QR State
  const [customFeatures, setCustomFeatures] = useState<CustomFeatureItem[]>(DEFAULT_CUSTOM_FEATURES);
  const [qrCodeEnabled, setQrCodeEnabled] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('https://hhmineralwater.com/custom');
  const [qrCodeType, setQrCodeType] = useState<'website' | 'gallery' | 'location' | 'menu' | 'custom'>('website');

  // Price Edit & Discount State
  const [customPricePerBottleOverride, setCustomPricePerBottleOverride] = useState<number | null>(null);
  const [plateSetupCharge, setPlateSetupCharge] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; percent: number } | null>(null);

  // Modals
  const [isPriceEditModalOpen, setIsPriceEditModalOpen] = useState(false);
  const [targetProductForPriceEdit, setTargetProductForPriceEdit] = useState<Product | null>(null);
  const [isAddBottleModalOpen, setIsAddBottleModalOpen] = useState(false);
  const [isAddFeatureModalOpen, setIsAddFeatureModalOpen] = useState(false);

  // Add Bottle Format fields
  const [newBottleName, setNewBottleName] = useState('');
  const [newBottleSize, setNewBottleSize] = useState('300ml');
  const [newBottleStdPrice, setNewBottleStdPrice] = useState<number>(10);
  const [newBottleCustomPrice, setNewBottleCustomPrice] = useState<number>(20);
  const [newBottleMrp, setNewBottleMrp] = useState<number>(15);
  const [newBottleCasePack, setNewBottleCasePack] = useState<number>(24);
  const [newBottlePhoto, setNewBottlePhoto] = useState<string>(DEFAULT_BOTTLE_IMAGE);
  const [newBottleDesc, setNewBottleDesc] = useState('');

  // Add Custom Feature fields
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState<CustomFeatureItem['category']>('label');
  const [newFeaturePrice, setNewFeaturePrice] = useState<number>(1.0);
  const [newFeatureDesc, setNewFeatureDesc] = useState('');

  // Active Product & Price Calculation
  const fallbackDefaultBottle: Product = {
    id: 'prod-custom-default',
    name: 'HH Mineral Water Bottle',
    size: '500ml',
    price: 8,
    mrp: 12,
    customDesignPrice: 16,
    image: DEFAULT_BOTTLE_IMAGE,
    shortDesc: 'Custom print luxury bottle',
    description: 'Custom event bottle',
    inStock: true,
    minOrderQty: 600,
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

  const activeProduct =
    visibleStudioProducts.find(p => p.id === selectedProductId) ||
    visibleStudioProducts[0] ||
    fallbackDefaultBottle;
  
  // Base bottle custom price (or manual override)
  const baseBottleCustomPrice = customPricePerBottleOverride !== null
    ? customPricePerBottleOverride
    : (activeProduct.customDesignPrice || (activeProduct.price * 2) || 16);

  // Custom features total per bottle
  const featuresExtraPerBottle = customFeatures
    .filter(f => f.enabled && f.pricePerBottle > 0)
    .reduce((sum, f) => sum + f.pricePerBottle, 0);

  const featuresFlatTotal = customFeatures
    .filter(f => f.enabled && (f.flatPrice || 0) > 0)
    .reduce((sum, f) => sum + (f.flatPrice || 0), 0);

  const subtotalRatePerBottle = baseBottleCustomPrice + featuresExtraPerBottle;
  const isQuantityValid = quantity >= 600 && Number.isInteger(quantity);
  const orderQuantity = isQuantityValid ? quantity : Math.max(0, quantity);

  const grossTotal = (subtotalRatePerBottle * orderQuantity) + featuresFlatTotal + plateSetupCharge;
  const discountValue = (grossTotal * discountPercent / 100) + discountAmount;
  const totalCalculated = Math.max(0, Math.round(grossTotal - discountValue));
  const customUnitPrice = orderQuantity > 0 ? Number((totalCalculated / orderQuantity).toFixed(2)) : subtotalRatePerBottle;

  const eventPresets = [
    { type: 'Wedding', icon: Heart, desc: 'Bride & Groom Names, Wedding Date & Royal Monogram' },
    { type: 'Corporate', icon: Briefcase, desc: 'Company Logo, Annual Summit & Business Branding' },
    { type: 'Hotel & Restaurant', icon: Building2, desc: 'Hotel Logo, Cafe Branding & Table Water Service' },
    { type: 'Birthday & Party', icon: Gift, desc: 'Birthday Celebrations, Anniversaries & VIP Events' },
    { type: 'Personal Branding', icon: Crown, desc: 'Private Estates, Influencers & Custom Gifts' },
    { type: 'Other', icon: Sparkles, desc: 'Custom Marketing Campaigns & Non-Profit Events' }
  ] as const;

  const colorPresets = [
    { name: 'Royal Cyan', hex: '#0284c7' },
    { name: 'Pure White', hex: '#ffffff' },
    { name: 'Midnight Navy', hex: '#0f172a' },
    { name: 'Imperial Gold', hex: '#d97706' },
    { name: 'Emerald Forest', hex: '#059669' },
    { name: 'Ruby Wine', hex: '#e11d48' },
    { name: 'Rose Quartz', hex: '#f43f5e' }
  ];

  // One-Click Event Presets Loader
  const handleLoadEventPreset = (presetName: string) => {
    if (presetName === 'wedding') {
      setEventType('Wedding');
      setLabelThemeColor('#d97706'); // Imperial Gold
      setBottleCapColor('#ffffff'); // White cap
      setFinishType('Gold Foil Accent');
      setBusinessName(prev => prev || 'Aarav & Priya');
      setTagline(prev => prev || 'Celebrating Our Eternal Union');
      setEventDate('2026-12-14');
      setEventVenue('Royal Palace, Jaipur');
      setDateOrVenue('14th December 2026 • Royal Palace, Jaipur');
      setCustomText(prev => prev || 'Scan for Wedding Gallery & Table Greetings');
      setQrCodeUrl('https://photos.app.goo.gl/wedding-demo');
      setQrCodeType('gallery');
      // Enable gold foil and QR
      setCustomFeatures(prev => prev.map(f => {
        if (f.id === 'feat-foil-accent' || f.id === 'feat-qr-dynamic' || f.id === 'feat-satin-ribbon') return { ...f, enabled: true };
        return f;
      }));
      showToast('Wedding Preset Loaded', 'Imperial Gold theme, foil finish, satin ribbon & wedding QR gallery loaded.', 'info');
    } else if (presetName === 'corporate') {
      setEventType('Corporate');
      setLabelThemeColor('#0f172a'); // Midnight Navy
      setBottleCapColor('#0f172a'); // Black cap
      setFinishType('Matte Luxury');
      setBusinessName(prev => prev || 'Apex Global Tech Summit');
      setTagline(prev => prev || 'Pioneering Sustainable Futures');
      setEventDate('2026-11-20');
      setEventVenue('Convention Centre');
      setDateOrVenue(prev => prev || '20th November 2026 • Convention Centre');
      setCustomText(prev => prev || 'Scan for Event Agenda & Speaker Schedule');
      setQrCodeUrl('https://apextechsummit.com/agenda');
      setQrCodeType('website');
      setCustomFeatures(prev => prev.map(f => {
        if (f.id === 'feat-soft-touch' || f.id === 'feat-qr-dynamic' || f.id === 'feat-master-carton') return { ...f, enabled: true };
        return f;
      }));
      showToast('Corporate Preset Loaded', 'Matte finish, midnight theme, master cartons & agenda QR loaded.', 'info');
    } else if (presetName === 'hotel') {
      setEventType('Hotel & Restaurant');
      setLabelThemeColor('#0284c7');
      setBottleCapColor('#d97706'); // Gold cap
      setFinishType('Glossy Crystal');
      setBusinessName(prev => prev || 'The Grand Imperial Luxury Hotel');
      setTagline(prev => prev || 'Table Spring Mineral Water Service');
      setEventDate('2026-10-30');
      setEventVenue('Grand Imperial Ballroom');
      setDateOrVenue(prev => prev || '30th October 2026 • Grand Imperial Ballroom');
      setQrCodeUrl('https://thegrandimperial.com/in-room-dining');
      setQrCodeType('menu');
      setCustomFeatures(prev => prev.map(f => {
        if (f.id === 'feat-alkaline-infusion' || f.id === 'feat-cap-seal' || f.id === 'feat-qr-dynamic') return { ...f, enabled: true };
        return f;
      }));
      showToast('Hotel & Dining Preset', 'Crystal gloss, Gold cap, Alkaline pH 8.5+ & Dining Menu QR loaded.', 'info');
    }
  };

  // Custom Feature Handlers
  const handleToggleFeature = (id: string) => {
    setCustomFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const handleDeleteFeature = (id: string) => {
    setCustomFeatures(prev => prev.filter(f => f.id !== id));
    showToast('Feature Removed', 'Custom feature removed from active list.', 'info');
  };

  const handleCreateCustomFeature = () => {
    if (!newFeatureName.trim()) {
      showToast('Name Required', 'Please enter a name for the custom feature.', 'warning');
      return;
    }
    const feat: CustomFeatureItem = {
      id: `feat-custom-${Date.now()}`,
      name: newFeatureName.trim(),
      category: newFeatureCategory,
      pricePerBottle: Math.max(0, newFeaturePrice),
      description: newFeatureDesc.trim() || 'Custom bespoke bottling requirement',
      enabled: true
    };
    setCustomFeatures(prev => [...prev, feat]);
    setIsAddFeatureModalOpen(false);
    setNewFeatureName('');
    setNewFeatureDesc('');
    showToast('Feature Added', `"${feat.name}" (+₹${feat.pricePerBottle}/bottle) added and activated!`, 'success');
  };

  // Add Bottle Format
  const handleCreateNewBottleFormat = async () => {
    if (!isAdminUnlocked) {
      showToast('Admin Access Required', 'Only administrators can add new bottle formats.', 'error');
      return;
    }
    if (!newBottleName.trim()) {
      showToast('Name Required', 'Please enter a bottle format name.', 'warning');
      return;
    }
    const newProd: Product = {
      id: `prod-${newBottleSize.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
      name: newBottleName.trim(),
      size: newBottleSize.trim() || '300ml',
      price: Math.max(1, newBottleStdPrice),
      customDesignPrice: Math.max(1, newBottleCustomPrice),
      mrp: Math.max(1, newBottleMrp),
      image: newBottlePhoto.trim() || DEFAULT_BOTTLE_IMAGE,
      description: newBottleDesc.trim() || `Custom bottling format in ${newBottleSize}`,
      shortDesc: `${newBottleSize} custom event bottle`,
      inStock: true,
      minOrderQty: 600,
      category: 'Standard',
      casePackSize: newBottleCasePack || 24,
      features: ['Offset Cylinder Print', 'BPA-Free PET Container', 'Natural Mineral Water'],
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
    await addProduct(newProd);
    setSelectedProductId(newProd.id);
    setIsAddBottleModalOpen(false);
    showToast('Bottle Format Added', `${newProd.name} (${newProd.size}) added to catalog & selected!`, 'success');
  };

  // Price Edit & Coupon Handlers
  const handleOpenPriceEdit = (prod?: Product) => {
    if (!isAdminUnlocked) {
      showToast('Admin Access Required', 'Editing bottle rates and catalog specs is restricted to administrators.', 'error');
      return;
    }
    const target = prod || activeProduct;
    setTargetProductForPriceEdit(target);
    setAdminBottlePrice(target.customDesignPrice || (target.price * 2));
    setAdminBottleStdPrice(target.price);
    setAdminBottleMrp(target.mrp);
    setAdminBottlePhoto(target.image);
    setAdminBottleVideo(target.videoUrl || '');
    setIsPriceEditModalOpen(true);
  };

  const handleSavePriceEdit = async (saveToCatalog: boolean) => {
    const target = targetProductForPriceEdit || activeProduct;
    if (saveToCatalog && isAdminUnlocked) {
      const updated: Product = {
        ...target,
        customDesignPrice: Math.max(1, adminBottlePrice),
        price: Math.max(1, adminBottleStdPrice),
        mrp: Math.max(1, adminBottleMrp),
        image: adminBottlePhoto.trim() || target.image,
        videoUrl: adminBottleVideo.trim() || undefined
      };
      await updateProduct(updated);
      showToast('Catalog Updated', `${target.size} custom design price set to ₹${updated.customDesignPrice}/bottle permanently.`, 'success');
    }

    if (target.id === activeProduct.id) {
      setCustomPricePerBottleOverride(adminBottlePrice);
      showToast('Price Applied', `Custom design rate set to ₹${adminBottlePrice}/bottle for this order.`, 'info');
    }
    setIsPriceEditModalOpen(false);
  };

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'WEDDING10' || code === 'BULK10' || code === 'VIP10') {
      setCouponApplied({ code, percent: 10 });
      setDiscountPercent(10);
      showToast('Coupon Applied!', `Promo code ${code} applied: 10% discount on order.`, 'success');
    } else if (code === 'ROYAL15' || code === 'HH15') {
      setCouponApplied({ code, percent: 15 });
      setDiscountPercent(15);
      showToast('Coupon Applied!', `Royal code ${code} applied: 15% discount on order.`, 'success');
    } else if (code === 'HH5' || code === 'FIRST5') {
      setCouponApplied({ code, percent: 5 });
      setDiscountPercent(5);
      showToast('Coupon Applied!', `Promo code ${code} applied: 5% discount on order.`, 'success');
    } else {
      showToast('Invalid Code', 'Coupon code not found. Try WEDDING10, BULK10, or ROYAL15.', 'warning');
    }
  };

  const handleAddToCart = () => {
    if (!quantity || quantity < 600) {
      showToast(
        'Minimum Quantity Required',
        'Minimum quantity for Custom Design Orders is 600 pieces.',
        'error'
      );
      setActiveStep(4);
      return;
    }

    if (!currentUser) {
      openAuthModal('login', 'Please sign in or create an account to save your custom design order.');
      return;
    }

    if (!businessName.trim() && uploadedImages.length === 0) {
      showToast(
        'Design Incomplete',
        'Please enter a Business/Event name or upload your original logo image.',
        'warning'
      );
      setActiveStep(2);
      return;
    }

    // Enforce 1-week advance booking policy for Custom Design Orders
    if (!eventDate && !dateOrVenue.trim()) {
      showToast(
        'Event Date Required',
        `Please select your event date. Custom design orders must be booked at least 1 week (7 days) before your event date.`,
        'warning'
      );
      setActiveStep(2);
      return;
    }

    if (eventDate) {
      const days = getDaysUntilDate(eventDate);
      if (days !== null && days < 7) {
        showToast(
          '1-Week Advance Notice Required',
          `Custom design orders must be booked at least 1 week (7 days) before your event date to allow for label foil printing and bottling. Please choose an event date on or after ${minLeadDateFormatted}.`,
          'error'
        );
        setActiveStep(2);
        return;
      }
    }

    const resolvedDateOrVenue = (eventDate && eventVenue.trim())
      ? `${eventDate} • ${eventVenue.trim()}`
      : (eventDate || eventVenue.trim() || dateOrVenue.trim());

    const customDetails: CustomDesignDetails = {
      eventType,
      businessName: businessName.trim() || 'Custom Label Brand',
      tagline: tagline.trim(),
      customText: customText.trim(),
      dateOrVenue: resolvedDateOrVenue,
      eventDate: eventDate || undefined,
      eventVenue: eventVenue.trim() || undefined,
      specialInstructions: specialInstructions.trim(),
      labelThemeColor,
      labelTextColor,
      finishType,
      bottleCapColor,
      customFeatures: customFeatures.filter(f => f.enabled),
      qrCodeUrl: qrCodeEnabled ? qrCodeUrl : undefined,
      qrCodeType: qrCodeEnabled ? qrCodeType : undefined,
      customPricePerBottle: baseBottleCustomPrice,
      plateSetupCharge: plateSetupCharge > 0 ? plateSetupCharge : undefined,
      discountAmount: discountValue > 0 ? discountValue : undefined,
      uploadedImages: uploadedImages.map(img => ({
        id: img.id,
        url: img.url,
        name: img.name,
        sizeKb: img.sizeKb,
        type: img.type,
        labelPosition: img.labelPosition || 'front',
        mediaType: img.mediaType || (img.type.startsWith('video/') ? 'video' : 'image'),
        durationSec: img.durationSec,
        thumbnailUrl: img.thumbnailUrl
      })),
      uploadedVideos: uploadedImages
        .filter(img => img.mediaType === 'video' || img.type.startsWith('video/'))
        .map(v => ({
          id: v.id,
          url: v.url,
          name: v.name,
          sizeKb: v.sizeKb,
          durationSec: v.durationSec,
          type: v.type,
          thumbnailUrl: v.thumbnailUrl
        }))
    };

    if (!isOwnerAdminOnly && (visibleStudioProducts.length === 0 || !isProductVisibleInStore(activeProduct, adminSettings))) {
      showToast(
        'Bottle Unavailable',
        'No visible bottle format is currently available for custom orders.',
        'warning'
      );
      return;
    }

    addToCart(activeProduct, quantity, customDetails);
    setIsCartOpen(true);
    showToast('Custom Order Added', `${activeProduct.name} custom order added to your cart.`, 'success');
  };

  // Admin Quick Price & Photo Editing State (Legacy bridge)
  const [isAdminQuickEditOpen, setIsAdminQuickEditOpen] = useState(false);
  const [adminBottlePrice, setAdminBottlePrice] = useState<number>(16);
  const [adminBottleStdPrice, setAdminBottleStdPrice] = useState<number>(8);
  const [adminBottleMrp, setAdminBottleMrp] = useState<number>(12);
  const [adminBottlePhoto, setAdminBottlePhoto] = useState<string>('');
  const [adminBottleVideo, setAdminBottleVideo] = useState<string>('');

  const handleOpenAdminEdit = () => {
    handleOpenPriceEdit(activeProduct);
  };

  const handleBottlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setAdminBottlePhoto(ev.target?.result as string);
      showToast('Photo Loaded', 'Bottle photo loaded into preview.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleBottleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Invalid File', 'Please upload a valid MP4 or WebM video file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setAdminBottleVideo(ev.target?.result as string);
      showToast('Video Loaded', 'Showcase video loaded for bottle format.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const customOrdersCount = orders.filter(o => o.items.some(i => i.isCustomDesign)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Admin Quick Control Bar if logged in as Owner Admin */}
      {isOwnerAdminOnly && (
        <div className="mb-6 bg-[#121212] text-white rounded-2xl p-4 border border-[#C5A059]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1c1c1c] text-[#DFC283] border border-[#C5A059]/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#DFC283] uppercase tracking-wider">Admin Studio Controls</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40 font-bold">Active</span>
              </div>
              <p className="text-xs text-neutral-300">
                Format: <strong className="text-white">{activeProduct.name} ({activeProduct.size})</strong> • Custom Rate: <strong className="text-[#DFC283]">₹{customUnitPrice}/bottle</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenAdminEdit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs shadow-sm cursor-pointer transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-black" />
              <span>Edit {activeProduct.size} Price & Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSection('admin')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e1e1e] hover:bg-[#282828] text-white font-bold text-xs border border-[#333333] cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span>Admin Queue ({customOrdersCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141414] text-[#DFC283] text-xs font-black uppercase tracking-widest border border-[#C5A059]/30 shadow-sm mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Custom Design Bottling • Minimum Order: 600 Pieces • Maximum: Unlimited</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          CUSTOM DESIGN <span className="text-[#DFC283] gold-gradient-text">ORDER STUDIO</span>
        </h1>
        <p className="mt-3 text-neutral-400 text-sm sm:text-base leading-relaxed">
          Create bespoke, luxury bottled mineral water with your original high-resolution logo, event date, personalized typography, and luxury finish. Order <strong className="text-white">from 600 pieces to unlimited bulk event volumes</strong> with custom design bottling priced at <strong className="text-white">double the normal bottle price</strong> (or configured admin custom rate).
        </p>

        {/* Pricing & Policy Badge Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="px-3 py-1 bg-[#141414] text-[#DFC283] font-bold rounded-full border border-[#C5A059]/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
            Minimum Order: 600 Pieces (Unlimited Max)
          </span>
          <span className="px-3 py-1 bg-amber-950/40 text-amber-300 font-bold rounded-full border border-amber-500/40 flex items-center gap-1.5 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Advance Booking: Minimum 1 Week (7 Days) Before Event
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Step Workflow (7 cols) */}
        <div className="lg:col-span-7 bg-[#121212] text-white rounded-3xl border border-[#262626] p-6 sm:p-8 shadow-xl space-y-8">
          {/* Step Progress Indicators */}
          <div className="grid grid-cols-4 gap-2 pb-6 border-b border-[#222222]">
            {[
              { num: 1, label: 'Bottle Size' },
              { num: 2, label: 'Upload & Text' },
              { num: 3, label: 'Theme & Finish' },
              { num: 4, label: 'Quantity & Order' }
            ].map(step => (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(step.num as any)}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all cursor-pointer ${
                  activeStep === step.num
                    ? 'bg-[#1e1e1e] text-[#DFC283] font-bold border border-[#C5A059]/40 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                    activeStep === step.num
                      ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-black'
                      : activeStep > step.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#222222] text-neutral-400 border border-[#333333]'
                  }`}
                >
                  {activeStep > step.num ? '✓' : step.num}
                </span>
                <span className="text-[11px] font-medium hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>

          {/* STEP 1: Select Bottle Size & Event Type */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs flex items-center justify-center font-black">1</span>
                    Select Bottle Size & Format
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Choose your bottle format for your custom bespoke bottling order.
                  </p>
                </div>
                {isOwnerAdminOnly && (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#C5A059]/10 text-[#DFC283] text-[10px] font-bold border border-[#C5A059]/30">
                      <ShieldCheck className="w-3 h-3 text-[#C5A059]" />
                      Admin
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenPriceEdit(activeProduct)}
                      className="px-3 py-1.5 rounded-xl bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#333333]"
                      title="Edit bottle custom rate (Admin)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Edit Price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddBottleModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Add a new bottle format (Admin)"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Add Bottle Size</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Event Presets Bar */}
              <div className="bg-[#181818] rounded-2xl p-3.5 border border-[#2a2a2a] space-y-2">
                <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider block">
                  ⚡ Quick Bespoke Event Presets:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadEventPreset('wedding')}
                    className="p-2.5 rounded-xl border border-[#C5A059]/30 bg-[#141414] hover:bg-[#1a1a1a] text-left transition-all cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40 flex items-center justify-center shrink-0">
                      <Heart className="w-4 h-4 text-[#C5A059]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#DFC283] block truncate">Royal Wedding</span>
                      <span className="text-[10px] text-neutral-400 block truncate">Imperial Gold • Foil • QR Gallery</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadEventPreset('corporate')}
                    className="p-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] hover:bg-[#1a1a1a] text-left transition-all cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#222222] text-[#DFC283] border border-[#383838] flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-neutral-200 block truncate">Corporate Summit</span>
                      <span className="text-[10px] text-neutral-400 block truncate">Midnight Black • Matte • Agenda</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadEventPreset('hotel')}
                    className="p-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] hover:bg-[#1a1a1a] text-left transition-all cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#222222] text-[#DFC283] border border-[#383838] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-neutral-200 block truncate">Hotel & Lounge</span>
                      <span className="text-[10px] text-neutral-400 block truncate">Crystal Gloss • Alkaline pH • Menu QR</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bottle Formats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {visibleStudioProducts.length === 0 ? (
                  <div className="col-span-full bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 text-center text-xs text-neutral-400">
                    All bottle formats are currently hidden from public view. Please check back shortly.
                  </div>
                ) : (
                  visibleStudioProducts.map(prod => {
                    const isSelected = prod.id === selectedProductId;
                    const prodCustomPrice = prod.customDesignPrice || (prod.price * 2);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedProductId(prod.id)}
                        className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center group ${
                          isSelected
                            ? 'border-[#C5A059] bg-[#1a1a1a] shadow-lg ring-1 ring-[#C5A059]/40'
                            : 'border-[#262626] hover:border-[#383838] bg-[#161616]'
                        }`}
                      >
                        {/* Price Edit Icon Button - Owner Admin Only */}
                        {isOwnerAdminOnly && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenPriceEdit(prod);
                            }}
                            className="absolute top-2 left-2 p-1 rounded-lg bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-[#DFC283] border border-[#333333] shadow-xs opacity-90 group-hover:opacity-100 transition-all cursor-pointer z-10"
                            title="Edit price & details (Admin Only)"
                          >
                            <Edit3 className="w-3 h-3 text-[#C5A059]" />
                          </button>
                        )}

                        <span className="text-xs font-bold text-white">{prod.size}</span>
                        <div className="h-20 w-full flex items-center justify-center my-2">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="max-h-full object-contain group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="space-y-0.5 w-full">
                          <div className="font-heading text-sm font-extrabold text-[#DFC283]">₹{prodCustomPrice}/bottle</div>
                          <div className="text-[10px] text-neutral-400 font-medium">Custom (Std: ₹{prod.price})</div>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-black flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Add New Bottle Format Card - Owner Admin Only */}
                {isOwnerAdminOnly && (
                  <div
                    onClick={() => setIsAddBottleModalOpen(true)}
                    className="p-3.5 rounded-2xl border-2 border-dashed border-[#C5A059]/40 hover:border-[#C5A059] bg-[#181818]/60 hover:bg-[#1f1f1f] transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[160px] group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40 group-hover:bg-[#C5A059] group-hover:text-black flex items-center justify-center transition-colors mb-2">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[#DFC283] block">+ Add Bottle Size</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5 font-medium">Admin Catalog Tool</span>
                  </div>
                )}
              </div>

              {/* Target Batch Quantity Selection in Step 1 */}
              <div className="bg-[#181818] rounded-2xl p-4 border border-[#2a2a2a] shadow-xs space-y-3">
                {/* Direct Numeric Input with Stepper Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <div className="flex items-center bg-[#121212] rounded-xl border border-[#333333] shadow-xs p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(600, prev - (prev > 5000 ? 500 : prev > 1000 ? 100 : 50)))}
                      className="w-9 h-9 rounded-lg bg-[#202020] hover:bg-[#282828] text-neutral-300 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="relative flex-1 sm:w-32 px-2">
                      <input
                        type="number"
                        min={600}
                        step={10}
                        value={quantity === 0 ? '' : quantity}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setQuantity(isNaN(val) ? 0 : val);
                        }}
                        className="w-full text-center font-heading font-black text-base text-[#DFC283] bg-transparent focus:outline-none"
                        placeholder="600"
                      />
                      <span className="text-[9px] text-neutral-400 font-extrabold uppercase block text-center -mt-0.5">
                        Pieces
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => (prev < 600 ? 600 : prev + (prev >= 5000 ? 500 : prev >= 1000 ? 100 : 50)))}
                      className="w-9 h-9 rounded-lg bg-[#202020] hover:bg-[#282828] text-neutral-300 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Quantity Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {[600, 1000, 2500, 5000, 10000, 25000, 50000].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          quantity === q
                            ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black font-black shadow-xs'
                            : 'bg-[#141414] text-neutral-300 border border-[#2a2a2a] hover:border-[#C5A059]/40 hover:bg-[#1a1a1a]'
                        }`}
                      >
                        {q.toLocaleString('en-IN')} pcs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-sm font-bold text-white mt-2 mb-2">
                  Select Event / Purpose
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {eventPresets.map(preset => {
                    const Icon = preset.icon;
                    const isSelected = eventType === preset.type;
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => setEventType(preset.type as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#C5A059] bg-[#1a1a1a] text-[#DFC283] font-semibold shadow-xs ring-1 ring-[#C5A059]/40'
                            : 'border-[#262626] hover:border-[#383838] text-neutral-300 bg-[#161616]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C5A059]' : 'text-neutral-400'}`} />
                          <span className="text-xs font-bold">{preset.type}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <span>Continue to Upload & Text</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Upload Original Image & Custom Text */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs flex items-center justify-center font-black">2</span>
                  Original Image Upload & Branding Details
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Upload your high-res logo or artwork. Stored in pristine original quality for HH bottling plant.
                </p>
              </div>

              {/* Login check alert if not signed in */}
              {!currentUser && (
                <div className="p-3 bg-[#181818] border border-[#2a2a2a] rounded-2xl flex items-center justify-between text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#DFC283]" />
                    <span>Sign in to save and link your high-res images to your customer account.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login', 'Sign in to upload and link custom images')}
                    className="font-bold underline text-[#DFC283] hover:text-[#f3d99e] cursor-pointer shrink-0 ml-2"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Media Uploader Component: Images, Logos & Video Clips */}
              <OriginalImageUploader
                images={uploadedImages}
                onImagesChange={setUploadedImages}
                maxFiles={Infinity}
                allowMultiple={true}
                onLinkVideoToQr={(videoUrl) => {
                  setQrCodeEnabled(true);
                  setQrCodeType('video');
                  setQrCodeUrl(videoUrl);
                  showToast('Video Linked to QR Code', 'Guests scanning your bottle QR code will watch your video reel!', 'success');
                }}
              />

              {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Business / Event / Couple Name *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Royal Bengal Hotel / Aarav & Priya"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#161616] text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Tagline / Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="e.g. Celebrating 25 Years of Elegance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#161616] text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
                  />
                </div>

                {/* Event Booking Card with 1-Week Advance Lead Time Enforcement */}
                <div className="bg-[#181818] rounded-2xl p-4 sm:p-5 border border-[#2a2a2a] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#222222] text-[#DFC283] border border-[#383838] flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-[#C5A059]" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Event Date & Production Lead Time
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Minimum 1 week (7 days) advance booking required
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      7-Day Lead Time
                    </span>
                  </div>

                  {/* 1-Week Notice Informational Callout */}
                  <div className="rounded-xl p-3 bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-300">
                        Orders Must Be Booked At Least 1 Week Before Your Event
                      </p>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        High-precision label printing, custom foil finishes, and hygienic bottling require a minimum 7 days preparation time. Earliest available booking date: <strong className="text-amber-200 underline">{minLeadDateFormatted}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Scheduled Event Date <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="date"
                        min={minEventDateStr}
                        value={eventDate}
                        onChange={e => {
                          const val = e.target.value;
                          setEventDate(val);
                          if (val && eventVenue) {
                            setDateOrVenue(`${val} • ${eventVenue}`);
                          } else if (val) {
                            setDateOrVenue(val);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#161616] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1">
                        Event Venue / City / Location
                      </label>
                      <input
                        type="text"
                        value={eventVenue}
                        onChange={e => {
                          const val = e.target.value;
                          setEventVenue(val);
                          if (eventDate && val) {
                            setDateOrVenue(`${eventDate} • ${val}`);
                          } else if (val) {
                            setDateOrVenue(val);
                          }
                        }}
                        placeholder="e.g. Royal Palace Banquet, Kolkata"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#161616] text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
                      />
                    </div>
                  </div>

                  {/* Dynamic Status Feedback */}
                  {eventDate && (
                    <div className={`text-xs px-3 py-2 rounded-xl flex items-center gap-2 ${
                      isLeadTimeValid
                        ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/30 border border-rose-500/40 text-rose-300'
                    }`}>
                      {isLeadTimeValid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Event date confirmed: <strong>{new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> ({daysUntilEvent} days from today). Meets the 1-week booking window ✓
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            Selected date is in {daysUntilEvent} days. Please book at least 7 days ahead (on or after {minLeadDateFormatted}) so our plant can bottle and ship in time.
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Custom Back Label Message or Tag
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="e.g. Scan for Wedding Gallery / Table No. 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#161616] text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Dynamic QR Code Configuration Card */}
              <div className="bg-[#181818] rounded-2xl p-4 border border-[#2a2a2a] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#222222] text-[#DFC283] border border-[#383838] flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-[#C5A059]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Smart Dynamic QR Code on Back Label
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Direct your guests or customers to your digital portal or gallery (Included FREE)
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qrCodeEnabled}
                      onChange={e => setQrCodeEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#333333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C5A059]"></div>
                  </label>
                </div>

                {qrCodeEnabled && (
                  <div className="pt-2 border-t border-[#2a2a2a] space-y-2.5 animate-in fade-in">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {[
                        { type: 'wedding', label: '💍 Wedding Gallery' },
                        { type: 'video', label: '🎬 Uploaded Video Reel' },
                        { type: 'website', label: '🏢 Company Website' },
                        { type: 'location', label: '📍 Google Maps Venue' },
                        { type: 'menu', label: '🍽️ Dining Menu' },
                        { type: 'custom', label: '✨ Custom Link' }
                      ].map(item => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setQrCodeType(item.type as any);
                            if (item.type === 'video') {
                              const firstVideo = uploadedImages.find(i => i.mediaType === 'video' || i.type.startsWith('video/'));
                              if (firstVideo) setQrCodeUrl(firstVideo.url);
                              else showToast('Tip', 'Upload a video clip above to connect it to this QR code.', 'info');
                            }
                            if (item.type === 'wedding' && !qrCodeUrl.includes('gallery')) setQrCodeUrl('https://photos.app.goo.gl/wedding-demo');
                            if (item.type === 'website' && !qrCodeUrl.includes('http')) setQrCodeUrl('https://yourbrand.com');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            qrCodeType === item.type
                              ? 'bg-[#C5A059] text-black font-bold shadow-xs'
                              : 'bg-[#141414] border border-[#2a2a2a] text-neutral-300 hover:bg-[#202020]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="url"
                        value={qrCodeUrl}
                        onChange={e => setQrCodeUrl(e.target.value)}
                        placeholder="https://yourwebsite.com or Google Photos album URL"
                        className="flex-1 px-3 py-2 rounded-xl border border-[#333333] bg-[#141414] text-xs font-mono text-neutral-200 focus:outline-none focus:border-[#C5A059]"
                      />
                      <span className="text-[10px] bg-emerald-950/70 text-emerald-300 font-bold px-2 py-1 rounded-md border border-emerald-700/50 whitespace-nowrap">
                        Live QR Active
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  ← Back to Size
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <span>Continue to Theme & Finish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Theme, Finish & Special Instructions */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs flex items-center justify-center font-black">3</span>
                  Label Aesthetics & Luxury Finish
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Customize the backdrop color and high-grade foil textures for the bottle label.
                </p>
              </div>

              {/* Label Theme Color */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Label Background Accent Color
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {colorPresets.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setLabelThemeColor(c.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        labelThemeColor === c.hex
                          ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40 bg-[#1e1e1e] text-[#DFC283]'
                          : 'border-[#2a2a2a] bg-[#161616] text-neutral-300 hover:border-[#383838]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 bg-[#181818] px-2.5 py-1 rounded-xl border border-[#2a2a2a]">
                    <span className="text-[11px] text-neutral-400">Custom:</span>
                    <input
                      type="color"
                      value={labelThemeColor}
                      onChange={e => setLabelThemeColor(e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Finish Type */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Label Print Material Finish
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Matte Luxury', 'Glossy Crystal', 'Gold Foil Accent', 'Silver Metallic'] as const).map(fin => (
                    <button
                      key={fin}
                      type="button"
                      onClick={() => setFinishType(fin)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        finishType === fin
                          ? 'border-[#C5A059] bg-[#1c1c1c] text-[#DFC283] font-bold shadow-xs ring-1 ring-[#C5A059]/40'
                          : 'border-[#262626] hover:border-[#383838] text-neutral-300 bg-[#161616]'
                      }`}
                    >
                      <span className="text-xs block">{fin}</span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {fin.includes('Foil') ? 'Metallic Emboss' : 'Waterproof PET'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottle Cap Color Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Bottle Cap Color
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {CAP_COLOR_PRESETS.map(cap => (
                    <button
                      key={cap.hex}
                      type="button"
                      onClick={() => setBottleCapColor(cap.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        bottleCapColor === cap.hex
                          ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40 bg-[#1e1e1e] text-[#DFC283]'
                          : 'border-[#2a2a2a] hover:border-[#383838] bg-[#161616] text-neutral-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: cap.hex }}
                      />
                      <span>{cap.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 bg-[#181818] px-2.5 py-1 rounded-xl border border-[#2a2a2a]">
                    <span className="text-[11px] text-neutral-400">Custom:</span>
                    <input
                      type="color"
                      value={bottleCapColor}
                      onChange={e => setBottleCapColor(e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Bespoke Custom Features & Formulation Suite */}
              <div className="bg-[#161616] rounded-2xl p-4 sm:p-5 border border-[#2a2a2a] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262626]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-[#C5A059]" />
                        Custom Features & Add-ons
                      </span>
                      {featuresExtraPerBottle > 0 && (
                        <span className="bg-[#C5A059]/20 text-[#DFC283] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#C5A059]/40">
                          +₹{featuresExtraPerBottle.toFixed(2)}/bottle extra
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Toggle premium tamper seals, foil accents, mineral infusions, or add your own custom specification.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddFeatureModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#C5A059] hover:bg-[#d4af37] text-black text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Custom Feature</span>
                  </button>
                </div>

                {/* Features List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {customFeatures.map(feat => {
                    return (
                      <div
                        key={feat.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          feat.enabled
                            ? 'bg-[#1c1c1c] border-[#C5A059]/50 shadow-xs'
                            : 'bg-[#141414] border-[#262626] opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={feat.enabled}
                            onChange={() => handleToggleFeature(feat.id)}
                            className="mt-1 w-4 h-4 text-[#C5A059] rounded border-[#333333] focus:ring-[#C5A059] cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{feat.name}</span>
                              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-[#222222] text-neutral-300 border border-[#333333]">
                                {feat.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                              {feat.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg whitespace-nowrap ${
                            feat.pricePerBottle === 0
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                              : 'bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40'
                          }`}>
                            {feat.pricePerBottle === 0 ? 'FREE' : `+₹${feat.pricePerBottle}/btl`}
                          </span>

                          {feat.id.startsWith('feat-custom-') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFeature(feat.id)}
                              className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete custom feature"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Special Instructions for HH Bottling Plant (Optional)
                </label>
                <textarea
                  rows={3}
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Please align logo strictly in the center, deliver 2 days before event date, need 20 extra loose caps."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#333333] bg-[#161616] text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  ← Back to Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <span>Continue to Quantity & Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Quantity & Order Confirmation */}
          {activeStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black text-xs flex items-center justify-center font-black">4</span>
                  Batch Quantity & Final Order Preview
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Select your quantity (Minimum 600 pieces, no maximum limit). Custom design printing is produced with zero plate setup charges!
                </p>
              </div>

              {/* DEDICATED QUANTITY SELECTION SYSTEM */}
              <div className="bg-[#161616] p-5 rounded-3xl border border-[#2a2a2a] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#242424]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#DFC283] bg-[#C5A059]/15 px-2.5 py-1 rounded-lg border border-[#C5A059]/30">
                        Custom Design Quantity
                      </span>
                      <span className="text-xs font-extrabold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                        Minimum Order: 600 Pieces
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Customers can order 600, 601, 602, 603, 1,000, 5,000, 10,000, 50,000, 100,000+ or any higher unlimited quantity.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block font-bold uppercase">Dynamic Total</span>
                    <span className="font-heading text-xl font-black text-[#DFC283]">
                      ₹{totalCalculated.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Clean Stepper: − Quantity + and Direct Numeric Input */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-neutral-300">
                    Select or Enter Quantity (Min: 600 Pieces, No Upper Limit)
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Stepper with − Quantity + */}
                    <div className={`flex items-center bg-[#101010] rounded-2xl p-1.5 border transition-all ${
                      quantity < 600 ? 'border-rose-500/60 ring-2 ring-rose-500/20' : 'border-[#333333] focus-within:border-[#C5A059] focus-within:ring-1 focus-within:ring-[#C5A059]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                        className="w-10 h-10 rounded-xl bg-[#202020] hover:bg-[#2a2a2a] text-neutral-200 flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
                        title="Decrease quantity by 1"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="flex-1 px-3 text-center min-w-[130px]">
                        <input
                          type="number"
                          id="custom-design-quantity-input"
                          min={600}
                          step={1}
                          value={quantity === 0 ? '' : quantity}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                            setQuantity(isNaN(val) ? 0 : val);
                          }}
                          className="w-full text-center text-xl font-black text-[#DFC283] bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                          placeholder="600"
                        />
                        <span className="text-[10px] font-bold text-neutral-400 block -mt-0.5">Pieces</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuantity(prev => (prev < 600 ? 600 : prev + 1))}
                        className="w-10 h-10 rounded-xl bg-[#202020] hover:bg-[#2a2a2a] text-neutral-200 flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
                        title="Increase quantity by 1"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Step Buttons */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-neutral-400 mr-1">Fine Tune:</span>
                        {[-500, -100, -10].map(delta => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => setQuantity(prev => Math.max(600, prev + delta))}
                            className="px-2 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-neutral-300 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            {delta}
                          </button>
                        ))}
                        {[+10, +100, +500, +1000, +5000, +10000, +50000].map(delta => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => setQuantity(prev => Math.max(600, (prev < 600 ? 600 : prev) + delta))}
                            className="px-2.5 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] hover:text-[#DFC283] hover:border-[#C5A059]/40 border border-[#2a2a2a] text-neutral-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            +{delta.toLocaleString('en-IN')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Batch Production Capacity & Carton Calculation */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2.5 bg-[#121212] rounded-xl border border-[#262626]">
                      <span className="text-[10px] text-neutral-400 block font-bold uppercase">Estimated Cartons</span>
                      <span className="font-extrabold text-[#DFC283] text-sm">
                        {Math.ceil(quantity / (activeProduct.casePackSize || 24))} Cases
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        ({activeProduct.casePackSize || 24} btls/case)
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#121212] rounded-xl border border-[#262626]">
                      <span className="text-[10px] text-neutral-400 block font-bold uppercase">Total Batch Volume</span>
                      <span className="font-extrabold text-[#DFC283] text-sm">
                        {Math.round(quantity * (activeProduct.size === '250ml' ? 0.25 : activeProduct.size === '500ml' ? 0.5 : activeProduct.size === '1L' ? 1.0 : activeProduct.size === '2L' ? 2.0 : 0.5)).toLocaleString('en-IN')} Litres
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Natural Mineral Water
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#121212] rounded-xl border border-[#262626] col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-neutral-400 block font-bold uppercase">Plate Setup Charge</span>
                      <span className="font-extrabold text-emerald-300 text-sm">
                        ₹0 (FREE)
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Included in 2× unit rate
                      </span>
                    </div>
                  </div>

                  {/* Validation Warning Alert if quantity < 600 */}
                  {quantity < 600 && (
                    <div className="p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-2xl flex items-center gap-3 text-rose-200 text-xs font-bold animate-in fade-in">
                      <div className="w-7 h-7 rounded-xl bg-rose-900 text-rose-300 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-black">Minimum quantity for Custom Design Orders is 600 pieces.</p>
                        <p className="text-[11px] text-rose-300 font-medium mt-0.5">
                          Please enter at least 600 pieces to enable order checkout.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(600)}
                        className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                      >
                        Set to 600
                      </button>
                    </div>
                  )}

                  {/* Popular Batch Presets Grid (600 to 100,000+) */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                      Popular Event & Wholesale Quantities:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { qty: 600, label: '600 Pieces', sub: 'Minimum Order' },
                        { qty: 1000, label: '1,000 Pieces', sub: 'Wedding / Gala' },
                        { qty: 2500, label: '2,500 Pieces', sub: 'Exhibition / Fair' },
                        { qty: 5000, label: '5,000 Pieces', sub: 'Corporate Summit' },
                        { qty: 10000, label: '10,000 Pieces', sub: 'Stadium / Mega Event' },
                        { qty: 25000, label: '25,000 Pieces', sub: 'State Convention' },
                        { qty: 50000, label: '50,000 Pieces', sub: 'Mass Festival' },
                        { qty: 100000, label: '100,000+ Pieces', sub: 'Wholesale Unlimited' }
                      ].map(preset => {
                        const isSelected = quantity === preset.qty;
                        return (
                          <button
                            key={preset.qty}
                            type="button"
                            onClick={() => setQuantity(preset.qty)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#C5A059] bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black shadow-md font-bold'
                                : 'border-[#282828] hover:border-[#3a3a3a] text-neutral-300 bg-[#141414] hover:bg-[#1a1a1a]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black tracking-tight">{preset.qty.toLocaleString('en-IN')} pcs</span>
                              {isSelected && <span className="text-xs">✓</span>}
                            </div>
                            <span className={`block text-xs font-semibold mt-0.5 ${isSelected ? 'text-black font-extrabold' : 'text-white'}`}>
                              {preset.label}
                            </span>
                            <span className={`block text-[10px] mt-0.5 ${isSelected ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                              {preset.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Price, Volume Discount & Promo Negotiation Module */}
              <div className="bg-[#161616] text-white rounded-3xl p-5 sm:p-6 border border-[#2a2a2a] shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#202020] text-[#DFC283] border border-[#333333] flex items-center justify-center font-bold">
                      <Tag className="w-4 h-4 text-[#C5A059]" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-[#DFC283] block">
                        Price & Volume Discounts
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        Base custom bottling rate with bulk discounts & promo coupon deduction
                      </span>
                    </div>
                  </div>

                  {isAdminUnlocked && (
                    <button
                      type="button"
                      onClick={() => handleOpenPriceEdit(activeProduct)}
                      className="px-3 py-1.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#333333] self-start sm:self-auto"
                      title="Edit base price (Admin Only)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Edit Base Price (₹{baseBottleCustomPrice})</span>
                    </button>
                  )}
                </div>

                {/* Bulk Volume Tiers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-300">Volume Discount Tier:</span>
                    <span className="text-[11px] text-[#DFC283] font-semibold">
                      {discountPercent > 0 ? `${discountPercent}% Applied Discount` : 'Standard Volume'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { min: 600, label: '600+ pcs', disc: 0, sub: 'Standard' },
                      { min: 1000, label: '1,000+ pcs', disc: 5, sub: '5% Off' },
                      { min: 5000, label: '5,000+ pcs', disc: 10, sub: '10% Off' },
                      { min: 10000, label: '10,000+ pcs', disc: 15, sub: '15% Off VIP' }
                    ].map(tier => (
                      <button
                        key={tier.min}
                        type="button"
                        onClick={() => {
                          setDiscountPercent(tier.disc);
                          showToast('Discount Updated', `${tier.label} ${tier.disc}% discount applied to order.`, 'info');
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          discountPercent === tier.disc
                            ? 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-black border-[#C5A059] font-black shadow-md'
                            : 'bg-[#121212] hover:bg-[#1a1a1a] text-neutral-200 border-[#2a2a2a]'
                        }`}
                      >
                        <span className="text-xs font-bold block">{tier.label}</span>
                        <span className="text-[10px] opacity-80 block">{tier.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Promo Code Input */}
                <div className="pt-2 border-t border-[#262626] space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      placeholder="Promo / Coupon Code (e.g. WEDDING10, BULK10)"
                      className="flex-1 px-3 py-2 rounded-xl bg-[#121212] border border-[#333333] text-xs text-white placeholder:text-neutral-500 font-mono uppercase focus:outline-none focus:border-[#C5A059]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#d4af37] text-black text-xs font-black cursor-pointer transition-colors shadow-xs"
                    >
                      Apply Code
                    </button>
                  </div>

                  {couponApplied && (
                    <div className="flex items-center justify-between text-xs bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-300 font-medium">
                      <span>✓ Code <strong>{couponApplied.code}</strong> applied ({couponApplied.percent}% discount)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponApplied(null);
                          setDiscountPercent(0);
                          setCouponCode('');
                        }}
                        className="text-neutral-400 hover:text-white ml-2 cursor-pointer font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Breakdown Summary Box */}
              <div className="bg-[#161616] rounded-2xl p-5 border border-[#2a2a2a] space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#262626] text-xs">
                  <span className="font-bold text-neutral-300">Selected Bottle:</span>
                  <span className="text-white font-semibold">{activeProduct.name} ({activeProduct.size})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Branding & Event:</span>
                  <span className="font-bold text-white">{businessName || 'Your Custom Logo Brand'} ({eventType})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Scheduled Event Date:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {eventDate ? (
                      <>
                        <span>{new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {isLeadTimeValid ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                            ✓ 1-Wk Lead Time Met
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 bg-rose-950/60 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold">
                            ⚠️ &lt; 7 Days Notice
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-400 font-semibold">{dateOrVenue || 'Not Selected (Min 1-Wk Required)'}</span>
                    )}
                  </span>
                </div>
                {eventVenue && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Event Venue / City:</span>
                    <span className="text-neutral-200">{eventVenue}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Finish & Cap:</span>
                  <span className="text-neutral-200">{finishType} • {bottleCapColor} Cap</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Attached Artwork:</span>
                  <span className="text-emerald-400 font-bold">
                    {uploadedImages.length > 0 ? `${uploadedImages.length} High-Res File(s) Attached` : 'No Image (Text Only)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Dynamic QR Code:</span>
                  <span className={qrCodeEnabled ? 'text-[#DFC283] font-bold' : 'text-neutral-500'}>
                    {qrCodeEnabled ? `Active (${qrCodeType})` : 'Disabled'}
                  </span>
                </div>

                {/* Itemized pricing breakdown */}
                <div className="pt-2 border-t border-[#262626] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Base Bottle Rate ({activeProduct.size}):</span>
                    <span className="font-mono font-bold text-neutral-200">₹{baseBottleCustomPrice.toFixed(2)}/btl</span>
                  </div>

                  {featuresExtraPerBottle > 0 && (
                    <div className="flex items-center justify-between text-[#DFC283]">
                      <span>Add-on Features & Minerals ({customFeatures.filter(f => f.enabled).length} active):</span>
                      <span className="font-mono font-bold">+₹{featuresExtraPerBottle.toFixed(2)}/btl</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Gross Unit Subtotal:</span>
                    <span className="font-mono font-bold text-white">₹{subtotalRatePerBottle.toFixed(2)}/btl</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Total Order Quantity:</span>
                    <span className="font-bold text-white">{quantity.toLocaleString('en-IN')} Pieces</span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Plate & Cylinder Setup Fee:</span>
                    <span className="font-bold text-emerald-400">₹0 (FREE)</span>
                  </div>

                  {discountValue > 0 && (
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>Volume & Coupon Discount ({discountPercent}%):</span>
                      <span className="font-mono">-₹{Math.round(discountValue).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                  <div>
                    <span className="font-heading text-sm font-bold text-white block">Net Custom Order Price:</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      ₹{customUnitPrice}/btl × {quantity.toLocaleString('en-IN')} pcs
                    </span>
                  </div>
                  <span className="font-heading text-2xl font-black text-[#DFC283]">₹{totalCalculated.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* 1-Week Advance Notice Lead Time Alert if violated */}
              {eventDate && !isLeadTimeValid && (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Selected event date is within {daysUntilEvent} days. Minimum 1 week (7 days) booking is required before your event. Earliest date: <strong>{minLeadDateFormatted}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-3 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    Change Date
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="text-xs font-semibold text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  ← Back to Theme
                </button>
                <button
                  type="button"
                  disabled={quantity < 600 || (eventDate !== '' && !isLeadTimeValid)}
                  onClick={handleAddToCart}
                  className={`flex items-center gap-2 font-black text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg transition-all ${
                    quantity < 600 || (eventDate !== '' && !isLeadTimeValid)
                      ? 'bg-[#222222] text-neutral-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black shadow-[#C5A059]/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {quantity < 600
                      ? 'Minimum 600 Pieces Required'
                      : (eventDate !== '' && !isLeadTimeValid)
                      ? 'Select Date ≥ 1 Week in Advance'
                      : `Add CUSTOM DESIGN ORDER to Bag (₹${totalCalculated.toLocaleString('en-IN')})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Clean & Professional 2D Product & Label Production Specification (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-[#141414] rounded-3xl p-6 sm:p-7 border border-[#262626] shadow-xs space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#242424] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#202020] text-[#DFC283] border border-[#333333] flex items-center justify-center">
                  <Palette className="w-4 h-4 text-[#C5A059]" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-white">
                    Label & Product Preview
                  </h3>
                  <p className="text-[11px] text-neutral-400">Real-time label composition</p>
                </div>
              </div>
              <span className="text-xs font-extrabold bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40 px-2.5 py-1 rounded-full">
                {activeProduct.size}
              </span>
            </div>

            {/* Realistic Product Image & Label Presentation Card */}
            <div className="bg-[#181818] rounded-2xl p-4 border border-[#2a2a2a] flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-40 bg-[#121212] rounded-xl border border-[#2e2e2e] p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={activeProduct.image}
                  alt={activeProduct.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-1.5 text-xs w-full">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{activeProduct.name}</span>
                </div>
                <div className="flex items-baseline justify-between bg-[#121212] p-2 rounded-xl border border-[#2a2a2a]">
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-semibold">CUSTOM DESIGN RATE</span>
                    <span className="text-[#DFC283] font-extrabold text-sm">₹{customUnitPrice}/bottle</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block font-semibold">STANDARD RATE</span>
                    <span className="text-neutral-500 line-through text-xs">₹{activeProduct.price}/bottle</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-semibold px-1">
                  <span>Order Quantity:</span>
                  <span className="text-white font-bold">{quantity.toLocaleString('en-IN')} Pieces</span>
                </div>

                {/* Quick Interactive Quantity Stepper in Preview */}
                <div className="pt-1 bg-[#121212] p-2 rounded-xl border border-[#2a2a2a] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-neutral-300">Quick Quantity:</span>
                    <span className="text-[#DFC283] font-extrabold">₹{(customUnitPrice * quantity).toLocaleString('en-IN')} Total</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(600, prev - (prev > 5000 ? 500 : prev > 1000 ? 100 : 50)))}
                      className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-[#282828] text-neutral-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={600}
                      value={quantity === 0 ? '' : quantity}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        setQuantity(isNaN(val) ? 0 : val);
                      }}
                      className="flex-1 text-center font-black text-xs text-[#DFC283] bg-[#161616] py-1 px-1 rounded-lg border border-[#333333] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                      placeholder="600"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => (prev < 600 ? 600 : prev + (prev >= 5000 ? 500 : prev >= 1000 ? 100 : 50)))}
                      className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-[#282828] text-neutral-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap gap-1.5">
                  <span className="bg-[#1a1a1a] border border-[#2e2e2e] text-neutral-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {finishType}
                  </span>
                  <span className="bg-[#1a1a1a] border border-[#2e2e2e] text-neutral-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {eventType}
                  </span>
                </div>
              </div>
            </div>

            {/* Uploaded High-Res Attachments Summary */}
            {uploadedImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#242424]">
                <span className="font-bold text-xs text-neutral-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Attached Original Artwork & Video Files ({uploadedImages.length})</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">Preserved in Original 100% Quality</span>
                </span>
                <div className="space-y-1.5">
                  {uploadedImages.map((img) => {
                    const isVid = img.mediaType === 'video' || img.type.startsWith('video/');
                    return (
                      <div
                        key={img.id}
                        className={`p-2 rounded-xl flex items-center justify-between text-xs border ${
                          isVid ? 'bg-purple-950/40 border-purple-800/50' : 'bg-[#181818] border-[#2a2a2a]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isVid ? (
                            <div className="w-7 h-7 rounded-lg bg-purple-900 text-purple-200 flex items-center justify-center shrink-0">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <img src={img.url} alt={img.name} className="w-7 h-7 object-contain bg-[#121212] rounded border border-[#2e2e2e] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate text-[11px]">{img.name}</p>
                            <p className="text-[10px] text-neutral-400">
                              {img.sizeKb > 1024 ? `${(img.sizeKb / 1024).toFixed(1)} MB` : `${img.sizeKb} KB`}
                              {isVid && img.durationSec ? ` • ${Math.floor(img.durationSec / 60)}:${(img.durationSec % 60).toString().padStart(2, '0')}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isVid ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                        }`}>
                          {isVid ? 'HD Video Reel' : 'High-Res Original'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1-Week Advance Notice & Event Production Guarantee */}
            <div className="bg-[#181818] rounded-2xl p-4 border border-amber-500/30 text-neutral-200 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-amber-300">1-Week Event Booking Lead Time</p>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Min 7 Days
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">
                  Custom cylinder engraving, luxury label foil stamping, and natural mineral bottling require at least 1 week lead time before your event date.
                </p>
                {eventDate && (
                  <div className="mt-2 pt-2 border-t border-[#262626] flex items-center justify-between">
                    <span className="text-neutral-400">Your Event Date:</span>
                    <span className="font-bold text-[#DFC283]">
                      {new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {daysUntilEvent !== null && ` (${daysUntilEvent} days ahead)`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quality and Dispatch Guarantee */}
            <div className="bg-[#181818] rounded-2xl p-4 border border-[#2a2a2a] text-neutral-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-[#DFC283]">Original High-Definition Printing</p>
                <p className="text-neutral-400 mt-0.5">
                  Your full-resolution images are preserved without lossy compression and directly transferred to HH Bottling Plant for precise offset cylinder printing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. PRICE & PHOTO EDIT MODAL - Admin Only */}
      {(isPriceEditModalOpen || isAdminQuickEditOpen) && isAdminUnlocked && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#2a2a2a] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFC283] block">
                  Price & Photo Management
                </span>
                <h3 className="font-heading text-lg font-bold text-white">
                  Edit {(targetProductForPriceEdit || activeProduct).name} ({(targetProductForPriceEdit || activeProduct).size})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPriceEditModalOpen(false);
                  setIsAdminQuickEditOpen(false);
                }}
                className="p-1.5 rounded-xl text-neutral-400 hover:bg-[#222222] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bottle Photo Preview & Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-neutral-300">Showcase Bottle Photo:</label>
                <label className="text-[#DFC283] hover:text-white cursor-pointer font-bold flex items-center gap-1 transition-colors">
                  <UploadCloud className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBottlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-16 h-20 bg-[#121212] rounded-xl border border-[#2e2e2e] p-1.5 flex items-center justify-center shrink-0">
                  <img
                    src={adminBottlePhoto || (targetProductForPriceEdit || activeProduct).image}
                    alt="Bottle"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="url"
                    placeholder="Photo URL (https://...)"
                    value={adminBottlePhoto}
                    onChange={e => setAdminBottlePhoto(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#333333] bg-[#121212] text-xs font-mono text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-neutral-400 block">Or upload a photo directly from your device</span>
                </div>
              </div>
            </div>

            {/* Bottle Showcase / 360° Video Upload */}
            <div className="space-y-1.5 pt-3 border-t border-[#262626]">
              <div className="flex items-center justify-between">
                <label className="font-bold text-neutral-300 flex items-center gap-1.5 text-xs">
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  <span>Showcase / 360° Video (Optional)</span>
                </label>
                <label className="text-[11px] font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>Upload Video</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    onChange={handleBottleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste Video URL (https://... or direct MP4)"
                  value={adminBottleVideo}
                  onChange={e => setAdminBottleVideo(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#333333] bg-[#121212] text-xs font-mono text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-purple-500"
                />
                {adminBottleVideo && (
                  <button
                    type="button"
                    onClick={() => setAdminBottleVideo('')}
                    className="px-2 py-1 bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Pricing Fields */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-neutral-300 block mb-1">Custom Rate (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={adminBottlePrice}
                  onChange={e => setAdminBottlePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-bold text-[#DFC283] focus:outline-none focus:border-[#C5A059]"
                />
                <span className="text-[10px] text-neutral-400 block mt-0.5">Per bottle custom</span>
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">Standard (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={adminBottleStdPrice}
                  onChange={e => setAdminBottleStdPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-medium text-white focus:outline-none focus:border-[#C5A059]"
                />
                <span className="text-[10px] text-neutral-400 block mt-0.5">Store retail price</span>
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">MRP (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={adminBottleMrp}
                  onChange={e => setAdminBottleMrp(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-medium text-white focus:outline-none focus:border-[#C5A059]"
                />
                <span className="text-[10px] text-neutral-400 block mt-0.5">Label printed MRP</span>
              </div>
            </div>

            {/* Calculation Preview */}
            <div className="bg-[#121212] rounded-xl p-3 border border-[#2a2a2a] text-xs flex justify-between items-center">
              <div>
                <span className="text-neutral-400 block text-[10px]">Min. Batch (600 pcs) Subtotal:</span>
                <span className="font-mono text-[#DFC283] font-bold">600 pcs × ₹{adminBottlePrice}</span>
              </div>
              <span className="font-heading text-base font-black text-[#DFC283]">
                ₹{(600 * adminBottlePrice).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => {
                  setIsPriceEditModalOpen(false);
                  setIsAdminQuickEditOpen(false);
                }}
                className="px-4 py-2 rounded-xl border border-[#333333] text-neutral-300 hover:bg-[#222222] text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSavePriceEdit(false);
                    setIsAdminQuickEditOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-neutral-200 font-bold text-xs cursor-pointer transition-colors border border-[#333333]"
                >
                  Apply to This Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSavePriceEdit(true);
                    setIsAdminQuickEditOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Catalog & Live</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD NEW BOTTLE FORMAT MODAL - Owner Admin Only */}
      {isAddBottleModalOpen && isOwnerAdminOnly && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#2a2a2a] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFC283] block">
                  Catalog Expansion
                </span>
                <h3 className="font-heading text-lg font-bold text-white">
                  + Add New Bottle Format
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBottleModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:bg-[#222222] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Product / Bottle Name *</label>
                  <input
                    type="text"
                    value={newBottleName}
                    onChange={e => setNewBottleName(e.target.value)}
                    placeholder="e.g. Himalayan Prestige Glass"
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] text-white placeholder:text-neutral-500 font-medium focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Bottle Size / Volume *</label>
                  <input
                    type="text"
                    value={newBottleSize}
                    onChange={e => setNewBottleSize(e.target.value)}
                    placeholder="e.g. 300ml, 750ml, 330ml Can"
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] text-white placeholder:text-neutral-500 font-medium focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Custom Rate (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={newBottleCustomPrice}
                    onChange={e => setNewBottleCustomPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-bold text-[#DFC283] focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-neutral-400">Min. order 600 pcs</span>
                </div>
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Standard Rate (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={newBottleStdPrice}
                    onChange={e => setNewBottleStdPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-medium text-white focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-neutral-400">Regular retail</span>
                </div>
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Pack Size (btls)</label>
                  <input
                    type="number"
                    min="1"
                    value={newBottleCasePack}
                    onChange={e => setNewBottleCasePack(parseInt(e.target.value, 10) || 24)}
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-medium text-white focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-neutral-400">Per carton/case</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">Bottle Photo URL</label>
                <input
                  type="url"
                  value={newBottlePhoto}
                  onChange={e => setNewBottlePhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/... or leave blank for default"
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] text-white placeholder:text-neutral-500 font-mono text-[11px] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">Description / Packaging Notes</label>
                <textarea
                  rows={2}
                  value={newBottleDesc}
                  onChange={e => setNewBottleDesc(e.target.value)}
                  placeholder="e.g. Premium heavy flint glass bottle with crown cap option for luxury hotels and VIP banquets."
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setIsAddBottleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#333333] text-neutral-300 hover:bg-[#222222] text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewBottleFormat}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create & Select Format</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADD BESPOKE FEATURE MODAL */}
      {isAddFeatureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2a2a2a] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFC283] block">
                  Bespoke Specification
                </span>
                <h3 className="font-heading text-lg font-bold text-white">
                  + Add Custom Feature
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFeatureModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:bg-[#222222] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-300 block mb-1">Feature / Requirement Name *</label>
                <input
                  type="text"
                  value={newFeatureName}
                  onChange={e => setNewFeatureName(e.target.value)}
                  placeholder="e.g. 24K Gold Foil Leafing, Hologram Neck Seal"
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] text-white placeholder:text-neutral-500 font-medium focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Category</label>
                  <select
                    value={newFeatureCategory}
                    onChange={e => setNewFeatureCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] font-medium bg-[#121212] text-white focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="Cap">Cap & Seal</option>
                    <option value="Label">Label & Print</option>
                    <option value="Water">Water Formulation</option>
                    <option value="Packaging">Packaging & Outer</option>
                    <option value="Special">Special Handling</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-neutral-300 block mb-1">Extra Price / Bottle (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={newFeaturePrice}
                    onChange={e => setNewFeaturePrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] font-bold text-[#DFC283] focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-neutral-400">Set 0 for included/free</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-300 block mb-1">Feature Description</label>
                <textarea
                  rows={2}
                  value={newFeatureDesc}
                  onChange={e => setNewFeatureDesc(e.target.value)}
                  placeholder="Briefly describe the visual or production specification..."
                  className="w-full px-3 py-2 rounded-xl border border-[#333333] bg-[#121212] text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setIsAddFeatureModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#333333] text-neutral-300 hover:bg-[#222222] text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomFeature}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Add Feature to Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
