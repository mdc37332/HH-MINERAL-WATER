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
  HelpCircle
} from 'lucide-react';

export const CustomDesignStudio: React.FC = () => {
  const {
    products,
    selectedProductForCustom,
    setSelectedProductForCustom,
    addToCart,
    setIsCartOpen,
    setCurrentSection,
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
  const [quantity, setQuantity] = useState(50); // Default custom batch
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Sync if context set selectedProductForCustom
  useEffect(() => {
    if (selectedProductForCustom) {
      setSelectedProductId(selectedProductForCustom.id);
    }
  }, [selectedProductForCustom]);

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

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
  };

  const totalCalculated = activeProduct.price * quantity;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-100/80 text-cyan-800 text-xs font-extrabold uppercase tracking-widest border border-cyan-200 shadow-2xs mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span>Exclusive Custom Label Bottling</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          CUSTOM DESIGN <span className="text-cyan-600">ORDER STUDIO</span>
        </h1>
        <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
          Create bespoke, premium bottled mineral water with your original high-resolution logo, event date, personalized typography, and luxury matte or gold foil finish.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Step Workflow (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
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
                <p className="text-xs text-slate-500 mt-1">Choose the perfect bottle format for your occasion</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {products.map(prod => {
                  const isSelected = prod.id === selectedProductId;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center ${
                        isSelected
                          ? 'border-cyan-600 bg-cyan-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-cyan-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{prod.size}</span>
                      <div className="h-20 w-full flex items-center justify-center my-2">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="max-h-full object-contain filter drop-shadow-sm"
                        />
                      </div>
                      <span className="font-heading text-sm font-extrabold text-cyan-700">₹{prod.price} / bottle</span>
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
                <h3 className="font-heading text-sm font-bold text-slate-900 mt-4 mb-2">
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
                  Select your quantity. Custom design printing is produced with zero plate setup charges!
                </p>
              </div>

              {/* Quantity Preset Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Custom Batch Quantity (Bottles)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[24, 50, 100, 250, 500, 1000].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        quantity === qty
                          ? 'border-cyan-600 bg-cyan-600 text-white shadow-xs'
                          : 'border-slate-200 hover:border-cyan-300 text-slate-700 bg-slate-50'
                      }`}
                    >
                      {qty} pcs
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-slate-600">Custom Quantity:</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-500">bottles</span>
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
                  <span className="text-slate-600">Unit Price:</span>
                  <span className="text-slate-900 font-semibold">₹{activeProduct.price} / bottle</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="font-heading text-sm font-bold text-slate-900">Total Custom Order Price:</span>
                  <span className="font-heading text-xl font-black text-cyan-700">₹{totalCalculated}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← Back to Theme
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-cyan-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add CUSTOM DESIGN ORDER to Bag (₹{totalCalculated})</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive 3D Bottle Mockup Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-cyan-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
            {/* Background Light Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Live 3D Bottle Preview
              </span>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                {activeProduct.size}
              </span>
            </div>

            {/* Bottle Mockup Stage */}
            <div className="relative h-80 sm:h-96 w-full flex items-center justify-center">
              {/* Bottle Outline Container */}
              <div className="relative w-48 h-full flex flex-col items-center justify-center">
                {/* Bottle Cap */}
                <div
                  className="w-10 h-7 rounded-t-md border border-white/20 shadow-md transition-colors duration-300 z-10"
                  style={{ backgroundColor: labelThemeColor === '#ffffff' ? '#0284c7' : labelThemeColor }}
                >
                  <div className="w-full h-1 bg-white/30 mt-1" />
                </div>

                {/* Bottle Neck */}
                <div className="w-8 h-8 bg-gradient-to-r from-white/30 via-white/50 to-white/20 border-x border-white/30" />

                {/* Bottle Shoulder */}
                <div className="w-36 h-10 bg-gradient-to-r from-cyan-100/40 via-white/60 to-cyan-100/30 rounded-t-3xl border-t border-x border-white/40 shadow-inner" />

                {/* Bottle Body & Custom Label */}
                <div className="relative w-40 h-48 bg-gradient-to-r from-cyan-50/30 via-white/50 to-cyan-50/20 border-x border-white/40 flex items-center justify-center overflow-hidden shadow-2xl">
                  {/* Water Shimmer Highlight */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />

                  {/* CUSTOM LABEL AREA */}
                  <div
                    className="w-36 py-3 px-2.5 rounded-md shadow-lg border border-white/30 flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden"
                    style={{
                      backgroundColor: labelThemeColor,
                      color: labelThemeColor === '#ffffff' ? '#0f172a' : '#ffffff'
                    }}
                  >
                    {/* Finish overlay badge */}
                    {finishType.includes('Foil') && (
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-300/20 via-yellow-100/40 to-amber-300/20 pointer-events-none" />
                    )}

                    {/* Logo Image if uploaded */}
                    {uploadedImages.length > 0 ? (
                      <div className="w-14 h-10 mb-1 flex items-center justify-center overflow-hidden rounded bg-white/10 backdrop-blur-xs p-0.5">
                        <img
                          src={uploadedImages[0].url}
                          alt="Custom logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-1">
                        <Droplet className="w-4 h-4" />
                      </div>
                    )}

                    {/* Custom Text */}
                    <p className="text-[11px] font-black tracking-tight leading-tight line-clamp-1">
                      {businessName || 'YOUR BRAND HERE'}
                    </p>

                    {tagline && (
                      <p className="text-[8px] opacity-90 line-clamp-1 mt-0.5">
                        {tagline}
                      </p>
                    )}

                    <div className="mt-1 pt-1 border-t border-current/20 w-full flex items-center justify-between text-[7px] font-semibold opacity-80">
                      <span>HH NATURAL</span>
                      <span>{activeProduct.size}</span>
                    </div>
                  </div>
                </div>

                {/* Bottle Base */}
                <div className="w-36 h-6 bg-gradient-to-r from-cyan-100/40 via-white/60 to-cyan-100/30 rounded-b-2xl border-b border-x border-white/40 shadow-md" />
              </div>
            </div>

            {/* Live Spec Tags */}
            <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="block text-[10px] text-slate-400">Finish</span>
                <span className="font-semibold text-cyan-300">{finishType}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Resolution</span>
                <span className="font-semibold text-emerald-400">300 DPI High-Res</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Estimated Total</span>
                <span className="font-bold text-white text-sm">₹{totalCalculated}</span>
              </div>
            </div>
          </div>

          {/* Value proposition pill */}
          <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-200 text-cyan-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold">Original High-Quality Files Preserved</p>
              <p className="text-slate-600 mt-0.5">
                Your full-resolution images are directly delivered to the HH Owner (8017341130) for precision printing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
