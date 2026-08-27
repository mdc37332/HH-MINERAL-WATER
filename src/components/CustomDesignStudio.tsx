import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CustomDesignDetails } from '../types';
import { OriginalImageUploader, UploadedImageData } from './OriginalImageUploader';
import {
  Sparkles,
  ShoppingBag,
  UploadCloud,
  CheckCircle2,
  Palette,
  FileText,
  Calendar,
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
  Package,
  AlertCircle
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
    showToast
  } = useStore();

  // State
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedProductForCustom?.id || products[0]?.id || 'prod-250ml'
  );

  const [eventType, setEventType] = useState<CustomDesignDetails['eventType']>('Wedding');
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [customText, setCustomText] = useState('');
  const [dateOrVenue, setDateOrVenue] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
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
      setSelectedProductId(selectedProductForCustom.id);
    }
  }, [selectedProductForCustom]);

  const fallbackDefaultBottle: Product = {
    id: 'prod-custom-default',
    name: 'HH Mineral Water Bottle',
    size: '500ml',
    price: 8,
    mrp: 12,
    customDesignPrice: 16,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
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

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0] || fallbackDefaultBottle;
  const customUnitPrice = activeProduct.customDesignPrice || (activeProduct.price * 2) || 16;
  const isQuantityValid = quantity >= 600 && Number.isInteger(quantity);
  const totalCalculated = customUnitPrice * (isQuantityValid ? quantity : Math.max(0, quantity));

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

  const handleAddToCart = () => {
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

    const customDetails: CustomDesignDetails = {
      eventType,
      businessName: businessName.trim() || 'Custom Label Brand',
      tagline: tagline.trim(),
      customText: customText.trim(),
      dateOrVenue: dateOrVenue.trim(),
      specialInstructions: specialInstructions.trim(),
      labelThemeColor,
      labelTextColor,
      finishType,
      bottleCapColor,
      uploadedImages: uploadedImages.map(img => ({
        id: img.id,
        url: img.url,
        name: img.name,
        sizeKb: img.sizeKb,
        type: img.type,
        labelPosition: img.labelPosition || 'front'
      }))
    };

    addToCart(activeProduct, quantity, customDetails);
    setIsCartOpen(true);
    showToast('Custom Order Added', `${activeProduct.name} custom order added to your cart.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-extrabold uppercase tracking-widest border border-slate-700 shadow-sm mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Custom Design Bottling • Minimum Order: 600 Pieces • Maximum: Unlimited</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          CUSTOM DESIGN <span className="text-cyan-600">ORDER STUDIO</span>
        </h1>
        <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
          Create bespoke, luxury bottled mineral water with your original high-resolution logo, event date, personalized typography, and luxury finish. Order <strong>from 600 pieces to unlimited bulk event volumes</strong> with custom design bottling priced at <strong>double the normal bottle price</strong> (or configured admin custom rate).
        </p>

        {/* Pricing & Policy Badge Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="px-3 py-1 bg-black text-white font-bold rounded-full border border-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Minimum Order: 600 Pieces (Unlimited Max)
          </span>
          <span className="px-3 py-1 bg-cyan-50 text-cyan-900 font-bold rounded-full border border-cyan-200 flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-cyan-600" />
            Rate: ₹{customUnitPrice} / bottle
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Step Workflow (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8">
          {/* Step Progress Indicators */}
          <div className="grid grid-cols-4 gap-2 pb-6 border-b border-slate-100">
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
                    ? 'bg-cyan-50 text-cyan-800 font-bold border border-cyan-200'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                    activeStep === step.num
                      ? 'bg-cyan-600 text-white'
                      : activeStep > step.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-600'
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
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Select Bottle Size
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose the bottle format. Custom design rate is double standard price with minimum order of 600 pieces and unlimited bulk capacity.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {products.map(prod => {
                  const isSelected = prod.id === selectedProductId;
                  const prodCustomPrice = prod.customDesignPrice || (prod.price * 2);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${
                        isSelected
                          ? 'border-cyan-600 bg-cyan-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-cyan-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{prod.size}</span>
                      <div className="h-20 w-full flex items-center justify-center my-2">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="max-h-full object-contain"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-heading text-sm font-extrabold text-cyan-700">₹{prodCustomPrice}/bottle</div>
                        <div className="text-[10px] text-slate-400 font-medium">Custom (2× ₹{prod.price})</div>
                      </div>
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900 mt-2 mb-2">
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
                            ? 'border-cyan-600 bg-cyan-50/70 text-cyan-900 font-semibold shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold">{preset.type}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
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
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Original Image Upload & Branding Details
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload your high-res logo or artwork. Stored in pristine original quality for HH bottling plant.
                </p>
              </div>

              {/* Login check alert if not signed in */}
              {!currentUser && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    <span>Sign in to save and link your high-res images to your customer account.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login', 'Sign in to upload and link custom images')}
                    className="font-bold underline text-white hover:text-cyan-300 cursor-pointer shrink-0 ml-2"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Original Image Uploader Component */}
              <OriginalImageUploader
                images={uploadedImages}
                onImagesChange={setUploadedImages}
                maxFiles={3}
                allowMultiple={true}
              />

              {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business / Event / Couple Name *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Royal Bengal Hotel / Aarav & Priya"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tagline / Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="e.g. Celebrating 25 Years of Elegance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Date / Location / Venue
                  </label>
                  <input
                    type="text"
                    value={dateOrVenue}
                    onChange={e => setDateOrVenue(e.target.value)}
                    placeholder="e.g. 14th Feb 2026 • Kolkata Palace"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Back Label Message or QR Code info
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="e.g. Scan for Wedding Gallery / Table No. 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← Back to Size
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
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
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  Label Aesthetics & Luxury Finish
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Customize the backdrop color and high-grade foil textures for the bottle label.
                </p>
              </div>

              {/* Label Theme Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
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
                          ? 'border-slate-900 ring-2 ring-cyan-500 shadow-xs'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500">Custom:</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-2">
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
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <span className="text-xs block">{fin}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {fin.includes('Foil') ? 'Metallic Emboss' : 'Waterproof PET'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Instructions for HH Bottling Plant (Optional)
                </label>
                <textarea
                  rows={3}
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Please align logo strictly in the center, deliver 2 days before event date, need 20 extra loose caps."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← Back to Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
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
                <h3 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                  Batch Quantity & Final Order Preview
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select your quantity (Minimum 600 pieces, no maximum limit). Custom design printing is produced with zero plate setup charges!
                </p>
              </div>

              {/* DEDICATED QUANTITY SELECTION SYSTEM */}
              <div className="bg-gradient-to-br from-cyan-50/70 via-white to-slate-50 p-5 rounded-3xl border-2 border-cyan-300 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cyan-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-cyan-900 bg-cyan-100 px-2.5 py-1 rounded-lg border border-cyan-200">
                        Custom Design Quantity
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Minimum Order: 600 Pieces
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Customers can order 600, 601, 602, 603, 1,000, 5,000, 10,000, 50,000, 100,000+ or any higher unlimited quantity.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Dynamic Total</span>
                    <span className="font-heading text-xl font-black text-cyan-800">
                      ₹{totalCalculated.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Clean Stepper: − Quantity + and Direct Numeric Input */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    Select or Enter Quantity (Min: 600 Pieces, No Upper Limit)
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Stepper with − Quantity + */}
                    <div className={`flex items-center bg-white rounded-2xl p-1.5 border-2 shadow-xs transition-all ${
                      quantity < 600 ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setQuantity(prev => Math.max(0, prev - 1))}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
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
                          className="w-full text-center text-xl font-black text-slate-900 border-0 focus:outline-none focus:ring-0 p-0"
                          placeholder="600"
                        />
                        <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">Pieces</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuantity(prev => (prev < 600 ? 600 : prev + 1))}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
                        title="Increase quantity by 1"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Step Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Add:</span>
                      {[+1, +10, +100, +500, +1000, +5000, +10000].map(delta => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => setQuantity(prev => Math.max(600, (prev < 600 ? 600 : prev) + delta))}
                          className="px-2.5 py-2 rounded-xl bg-white hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          +{delta.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Validation Warning Alert if quantity < 600 */}
                  {quantity < 600 && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold animate-in fade-in">
                      <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-black">Minimum custom design order is 600 pieces.</p>
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                          Please enter at least 600 pieces to enable order checkout.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(600)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                      >
                        Set to 600
                      </button>
                    </div>
                  )}

                  {/* Popular Batch Presets Grid (600 to 100,000+) */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
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
                                ? 'border-cyan-600 bg-cyan-600 text-white shadow-md font-bold'
                                : 'border-slate-200 hover:border-cyan-300 text-slate-700 bg-white hover:bg-cyan-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black tracking-tight">{preset.qty.toLocaleString('en-IN')} pcs</span>
                              {isSelected && <span className="text-xs">✓</span>}
                            </div>
                            <span className={`block text-xs font-semibold mt-0.5 ${isSelected ? 'text-cyan-100' : 'text-slate-800'}`}>
                              {preset.label}
                            </span>
                            <span className={`block text-[10px] mt-0.5 ${isSelected ? 'text-cyan-200' : 'text-slate-400'}`}>
                              {preset.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Breakdown Summary Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="font-bold text-slate-800">Product:</span>
                  <span className="text-slate-700 font-semibold">{activeProduct.name} ({activeProduct.size})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Branding:</span>
                  <span className="font-bold text-slate-900">{businessName || 'Your Custom Logo Brand'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Event / Type:</span>
                  <span className="text-slate-800">{eventType} • {finishType}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Original Images:</span>
                  <span className="text-emerald-700 font-bold">
                    {uploadedImages.length > 0 ? `${uploadedImages.length} High-Res File(s) Attached` : 'No Image (Text Only)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600 font-medium">Custom Bottle Rate:</span>
                    <span className="text-[10px] text-slate-400 block font-normal">(Double Standard Rate of ₹{activeProduct.price})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-900 font-bold text-sm">₹{customUnitPrice} / bottle</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Total Quantity:</span>
                  <span className="text-slate-900 font-bold">{quantity.toLocaleString('en-IN')} Pieces</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div>
                    <span className="font-heading text-sm font-bold text-slate-900 block">Total Custom Order Price:</span>
                    <span className="text-[10px] text-slate-500">₹{customUnitPrice} × {quantity.toLocaleString('en-IN')} pcs</span>
                  </div>
                  <span className="font-heading text-2xl font-black text-cyan-700">₹{totalCalculated.toLocaleString('en-IN')}</span>
                </div>

                {/* Admin-only custom pricing notice */}
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Custom design unit rates are set at double normal price and can only be modified by HH Admin.</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Back to Theme
                </button>
                <button
                  type="button"
                  disabled={quantity < 600}
                  onClick={handleAddToCart}
                  className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all ${
                    quantity < 600
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-cyan-600/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {quantity < 600
                      ? 'Minimum 600 Pieces Required'
                      : `Add CUSTOM DESIGN ORDER to Bag (₹${totalCalculated.toLocaleString('en-IN')})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Clean & Professional 2D Product & Label Production Specification (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-slate-900">
                    Label & Product Preview
                  </h3>
                  <p className="text-[11px] text-slate-500">Real-time label composition</p>
                </div>
              </div>
              <span className="text-xs font-extrabold bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-full">
                {activeProduct.size}
              </span>
            </div>

            {/* Realistic Product Image & Label Presentation Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-40 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src={activeProduct.image}
                  alt={activeProduct.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-1.5 text-xs w-full">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{activeProduct.name}</span>
                </div>
                <div className="flex items-baseline justify-between bg-white p-2 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">CUSTOM DESIGN RATE</span>
                    <span className="text-cyan-700 font-extrabold text-sm">₹{customUnitPrice}/bottle</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">STANDARD RATE</span>
                    <span className="text-slate-500 line-through text-xs">₹{activeProduct.price}/bottle</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold px-1">
                  <span>Order Quantity:</span>
                  <span className="text-slate-900 font-bold">{quantity.toLocaleString('en-IN')} Pieces</span>
                </div>
                <div className="pt-1 flex flex-wrap gap-1.5">
                  <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {finishType}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {eventType}
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Label Layout Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Custom Label Design Details</span>
                <span className="text-[11px] text-slate-500">Theme: {labelThemeColor}</span>
              </div>

              <div
                className="rounded-2xl p-5 border transition-all duration-200 shadow-xs relative overflow-hidden"
                style={{
                  backgroundColor: labelThemeColor,
                  color: labelThemeColor === '#ffffff' ? '#0f172a' : '#ffffff',
                  borderColor: labelThemeColor === '#ffffff' ? '#cbd5e1' : 'transparent'
                }}
              >
                {/* Finish Badge */}
                {finishType.includes('Foil') && (
                  <div className="absolute top-2 right-2 bg-black text-white border border-slate-700 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    ★ Foil Accent
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {/* Uploaded Logo or Brand Icon */}
                  {uploadedImages.length > 0 ? (
                    <div className="w-16 h-16 rounded-xl bg-white/15 backdrop-blur-xs p-1 flex items-center justify-center border border-white/30 shrink-0 overflow-hidden">
                      <img
                        src={uploadedImages[0].url}
                        alt="Uploaded logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center border border-white/20 shrink-0">
                      <Droplet className="w-8 h-8 opacity-80" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black tracking-tight leading-snug truncate">
                      {businessName || 'YOUR BRAND / EVENT'}
                    </p>
                    {tagline ? (
                      <p className="text-xs opacity-90 truncate mt-0.5">{tagline}</p>
                    ) : (
                      <p className="text-[11px] opacity-70 italic mt-0.5">Custom Tagline Here</p>
                    )}
                    {dateOrVenue && (
                      <p className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">{dateOrVenue}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-current/20 flex items-center justify-between text-[10px] font-semibold opacity-85">
                  <span>HH PURE MINERAL WATER</span>
                  <span>{activeProduct.size} • ZERO SODIUM</span>
                </div>
              </div>
            </div>

            {/* Uploaded High-Res Attachments Summary */}
            {uploadedImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Original High-Resolution Image Files ({uploadedImages.length})</span>
                </span>
                <div className="space-y-1.5">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={img.url} alt={img.name} className="w-7 h-7 object-contain bg-white rounded border border-slate-200 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate text-[11px]">{img.name}</p>
                          <p className="text-[10px] text-slate-400">{img.sizeKb} KB • {img.type.split('/')[1]?.toUpperCase() || 'IMG'}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        High-Res Original
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality and Dispatch Guarantee */}
            <div className="bg-cyan-50/80 rounded-2xl p-4 border border-cyan-200 text-cyan-950 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-cyan-900">Original High-Definition Printing</p>
                <p className="text-slate-600 mt-0.5">
                  Your full-resolution images are preserved without lossy compression and directly transferred to HH Bottling Plant for precise offset cylinder printing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
