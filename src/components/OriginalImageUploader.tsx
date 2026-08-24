import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle,
  FileText,
  Sparkles,
  Maximize2,
  X
} from 'lucide-react';

export interface UploadedImageData {
  id: string;
  url: string; // Base64 data URL
  name: string;
  sizeKb: number;
  type: string;
  labelPosition?: 'front' | 'back' | 'wrap';
}

interface Props {
  images: UploadedImageData[];
  onImagesChange: (images: UploadedImageData[]) => void;
  maxFiles?: number;
  labelPositionDefault?: 'front' | 'back' | 'wrap';
  allowMultiple?: boolean;
}

export const OriginalImageUploader: React.FC<Props> = ({
  images,
  onImagesChange,
  maxFiles = 3,
  labelPositionDefault = 'front',
  allowMultiple = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image file size must be below 15MB.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = e => {
      const base64Url = e.target?.result as string;
      const newImg: UploadedImageData = {
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: base64Url,
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        type: file.type,
        labelPosition: (labelPositionDefault as 'front' | 'back' | 'wrap') || 'front'
      };

      if (!allowMultiple) {
        onImagesChange([newImg]);
      } else {
        if (images.length >= maxFiles) {
          setErrorMsg(`Maximum ${maxFiles} original images allowed.`);
          return;
        }
        onImagesChange([...images, newImg]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => processFile(file));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file: File) => processFile(file));
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  const replaceImage = (id: string) => {
    removeImage(id);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={allowMultiple}
        onChange={handleFileInput}
        className="hidden"
        id="original-file-upload-input"
      />

      {/* Upload Zone */}
      {images.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-cyan-500 bg-cyan-50/80 scale-[0.99]'
              : 'border-slate-300 hover:border-cyan-400 bg-slate-50/70 hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100/80 text-cyan-600 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                <span className="text-cyan-600 underline">Tap to upload</span> or drag and drop your original image / logo
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports PNG, JPG, JPEG, SVG, WEBP from your phone gallery or computer (High-Res preserved)
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 text-xs font-medium text-slate-600 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Full Print-Quality Stored for HH Owner</span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
          {errorMsg}
        </p>
      )}

      {/* Uploaded Images List & Preview Cards */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Original Uploaded Images ({images.length}/{maxFiles})</span>
            </h4>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-800"
            >
              + Add Another Image
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                className="group relative bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5"
              >
                {/* Thumbnail Preview with Zoom */}
                <div className="relative w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-cyan-400 transition-colors">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewZoomImage(img.url)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    title="Zoom Image"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={img.name}>
                    {img.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{img.sizeKb} KB</span>
                    <span>•</span>
                    <span className="capitalize">{img.labelPosition || 'Front Logo'}</span>
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Original Ready
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => replaceImage(img.id)}
                    className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                    title="Replace Image"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {previewZoomImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-4 border border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Original Upload Preview (Print Ready)
              </h4>
              <button
                onClick={() => setPreviewZoomImage(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewZoomImage}
                alt="High resolution preview"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
