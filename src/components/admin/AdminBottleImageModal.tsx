import React, { useState, useRef } from 'react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import {
  X,
  Upload,
  Sparkles,
  Camera,
  Save,
  Trash2,
  Check,
  Star,
  Plus,
  ExternalLink,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import {
  BOTTLE_IMAGE_PRESETS,
  DEFAULT_BOTTLE_IMAGE,
  isDeadOrDoctorImage
} from '../../data/bottlePresets';
import { compressImageToDataUrl } from '../../lib/imageCompressor';

interface Props {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBottleImageModal: React.FC<Props> = ({ product, isOpen, onClose }) => {
  const { updateProduct, showToast } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialPrimary = isDeadOrDoctorImage(product.image)
    ? DEFAULT_BOTTLE_IMAGE
    : (product.image || DEFAULT_BOTTLE_IMAGE);

  const initialImages: string[] = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(img => (isDeadOrDoctorImage(img) ? DEFAULT_BOTTLE_IMAGE : img))
    : [initialPrimary];

  const [primaryImage, setPrimaryImage] = useState<string>(initialPrimary);
  const [imagesList, setImagesList] = useState<string[]>(initialImages);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      showToast('Compressing Photo', `Optimizing ${files.length} bottle photo(s)...`, 'info');

      const addedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImageToDataUrl(file, 1000, 1000, 0.82);
        addedList.push(compressed);
      }

      if (addedList.length > 0) {
        setImagesList(prev => [...prev, ...addedList]);
        setPrimaryImage(addedList[0]);
        showToast('Photo Added', 'Bottle photo loaded. Click "Save & Update Bottle" to publish.', 'success');
      }
    } catch (err) {
      console.error('File compression error:', err);
      showToast('Upload Error', 'Could not compress image. Please try another file.', 'error');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleAddCustomUrl = () => {
    if (!customUrlInput.trim()) {
      showToast('URL Required', 'Please enter a valid image URL.', 'warning');
      return;
    }
    const url = customUrlInput.trim();
    setImagesList(prev => [...prev, url]);
    setPrimaryImage(url);
    setCustomUrlInput('');
    showToast('Image Added', 'URL image added as primary angle.', 'info');
  };

  const handleSelectPreset = (url: string) => {
    setPrimaryImage(url);
    if (!imagesList.includes(url)) {
      setImagesList(prev => [url, ...prev]);
    }
    showToast('Preset Selected', 'Bottle angle set to preset.', 'info');
  };

  const handleSetAsPrimary = (imgUrl: string) => {
    setPrimaryImage(imgUrl);
    setImagesList(prev => [imgUrl, ...prev.filter(u => u !== imgUrl)]);
  };

  const handleRemoveImage = (imgUrl: string) => {
    if (imagesList.length <= 1) {
      showToast('Keep at Least One', 'Bottle must have at least one image.', 'warning');
      return;
    }
    const remaining = imagesList.filter(u => u !== imgUrl);
    setImagesList(remaining);
    if (primaryImage === imgUrl) {
      setPrimaryImage(remaining[0]);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const cleanImages = imagesList.length > 0 ? imagesList : [primaryImage || DEFAULT_BOTTLE_IMAGE];
      const updatedProduct: Product = {
        ...product,
        image: primaryImage || cleanImages[0] || DEFAULT_BOTTLE_IMAGE,
        images: cleanImages
      };

      await updateProduct(updatedProduct);
      showToast('Bottle Images Updated', `Updated visual for ${product.name}. All customers see this now.`, 'success');
      onClose();
    } catch (err) {
      console.error('Save product error:', err);
      showToast('Save Error', 'Failed to update bottle images.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-[#C5A059]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#222222] bg-[#171717]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C5A059] to-[#DFC283] flex items-center justify-center text-black shadow-md">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm sm:text-base text-white truncate max-w-[260px] sm:max-w-none">
                  Edit Bottle Image: {product.name} ({product.size})
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#C5A059]/20 text-[#DFC283] border border-[#C5A059]/40 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Shown to all customers across product cards, catalog, 360 viewer, and cart.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Primary View & Angles Strip */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-[#262626] p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-28 h-36 rounded-xl bg-[#181818] border border-[#C5A059]/40 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner">
              <img
                src={primaryImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain filter drop-shadow-[0_8px_16px_rgba(197,160,89,0.25)]"
              />
              <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-[#C5A059] text-black px-1.5 py-0.5 rounded font-mono">
                PRIMARY
              </span>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center gap-1.5 text-xs text-[#DFC283] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Customer Catalog Display</span>
              </div>
              <p className="text-xs text-neutral-400">
                Current angles in customer 360 spin &amp; gallery ({imagesList.length} image{imagesList.length > 1 ? 's' : ''}):
              </p>

              {/* Gallery Thumbnails List */}
              <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                {imagesList.map((imgUrl, idx) => {
                  const isPrimary = primaryImage === imgUrl;
                  return (
                    <div
                      key={idx}
                      className={`relative group/thumb w-12 h-14 rounded-lg border p-1 bg-[#161616] flex items-center justify-center ${
                        isPrimary ? 'border-[#C5A059] ring-1 ring-[#C5A059]' : 'border-[#333333]'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Angle ${idx + 1}`}
                        className="max-h-full max-w-full object-contain cursor-pointer"
                        onClick={() => setPrimaryImage(imgUrl)}
                      />
                      {/* Delete Angle Button */}
                      {imagesList.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(imgUrl);
                          }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer shadow"
                          title="Remove this angle"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {/* Star Primary Indicator */}
                      {isPrimary && (
                        <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#C5A059] text-black flex items-center justify-center">
                          <Star className="w-2 h-2 fill-current" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-[#222222] gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'border-[#C5A059] text-[#DFC283]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Certified Bottle Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'border-[#C5A059] text-[#DFC283]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Upload from Device</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'url'
                  ? 'border-[#C5A059] text-[#DFC283]'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Add Image URL</span>
            </button>
          </div>

          {/* Presets Content */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Select an authentic mineral water bottle image matching this product&apos;s format:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BOTTLE_IMAGE_PRESETS.map((preset) => {
                  const isCurrent = primaryImage === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#C5A059] bg-[#1a170e] ring-1 ring-[#C5A059] shadow-md'
                          : 'border-[#262626] hover:border-[#C5A059]/40 bg-[#141414] hover:bg-[#181818]'
                      }`}
                    >
                      <div className="w-10 h-12 rounded-xl bg-[#0a0a0a] p-1 flex items-center justify-center shrink-0 border border-[#2a2a2a]">
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white truncate">
                            {preset.title}
                          </p>
                          {isCurrent && (
                            <span className="w-4 h-4 rounded-full bg-[#C5A059] text-black flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                          {preset.desc}
                        </p>
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/5 text-[#DFC283]">
                          {preset.size}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload Content */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#C5A059]/40 hover:border-[#C5A059] rounded-2xl p-8 text-center bg-[#141414] hover:bg-[#171717] transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/15 text-[#DFC283] flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Upload photos of {product.name} ({product.size})
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Select 1 or more images (front view, label detail, side angle). Automatically compressed.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isCompressing}
                  className="px-4 py-2 rounded-xl bg-[#C5A059] text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer"
                >
                  {isCompressing ? 'Optimizing Images...' : 'Choose Image Files'}
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>
          )}

          {/* URL Content */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-400">
                Paste any direct image link to add as an angle:
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/bottle-angle.jpg"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 bg-[#161616] border border-[#333333] focus:border-[#C5A059] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomUrl}
                  className="px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] border border-[#C5A059]/40 text-[#DFC283] text-xs font-bold cursor-pointer transition-all shrink-0"
                >
                  Add Angle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#222222] bg-[#171717] flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            Visible to: <span className="text-[#DFC283] font-bold">Every Customer</span> • Editable by:{' '}
            <span className="text-white font-bold">Admin Only</span>
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving || isCompressing}
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] via-[#DFC283] to-[#C5A059] hover:brightness-110 text-black font-black text-xs shadow-lg shadow-[#C5A059]/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-black" />
              <span>{isSaving ? 'Updating Storefront...' : 'Save & Update Bottle'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
