import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Video,
  Film,
  Play,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle,
  Sparkles,
  Maximize2,
  X,
  Link as LinkIcon,
  Download,
  Check,
  QrCode
} from 'lucide-react';

export interface UploadedImageData {
  id: string;
  url: string; // Base64 data URL or video URL
  name: string;
  sizeKb: number;
  type: string;
  mediaType?: 'image' | 'video';
  durationSec?: number;
  thumbnailUrl?: string;
  labelPosition?: 'front' | 'back' | 'wrap';
}

interface Props {
  images: UploadedImageData[];
  onImagesChange: (images: UploadedImageData[]) => void;
  maxFiles?: number;
  labelPositionDefault?: 'front' | 'back' | 'wrap';
  allowMultiple?: boolean;
  onLinkVideoToQr?: (videoUrl: string) => void;
}

export const OriginalImageUploader: React.FC<Props> = ({
  images,
  onImagesChange,
  maxFiles = 4,
  labelPositionDefault = 'front',
  allowMultiple = true,
  onLinkVideoToQr
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'upload_image' | 'upload_video' | 'video_url'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Video URL Input State
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoNameInput, setVideoNameInput] = useState('');

  // Preview Modals
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    name: string;
    durationSec?: number;
    sizeKb?: number;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [linkedQrId, setLinkedQrId] = useState<string | null>(null);

  // Helper to extract video duration and frame thumbnail
  const extractVideoMetadata = (videoUrl: string): Promise<{ duration: number; thumbnail: string }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ duration: 0, thumbnail: '' });
        }
      }, 5000);

      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration || 0);
        video.currentTime = Math.min(1, Math.max(0.5, duration / 4));
      };

      video.onseeked = () => {
        if (resolved) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth || 320, 480);
          canvas.height = Math.min(video.videoHeight || 180, 270);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
            resolved = true;
            clearTimeout(timeoutId);
            resolve({ duration: Math.round(video.duration || 0), thumbnail });
            return;
          }
        } catch {
          // Canvas capture might fail on CORS; resolve with duration
        }
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ duration: Math.round(video.duration || 0), thumbnail: '' });
      };

      video.onerror = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ duration: 0, thumbnail: '' });
      };
    });
  };

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

    if (!isImage && !isVideo) {
      setErrorMsg('Please upload a valid image (PNG, JPG, WEBP, SVG) or video file (MP4, WEBM, MOV).');
      return;
    }

    if (isImage && file.size > 20 * 1024 * 1024) {
      setErrorMsg('Image file size must be below 20MB.');
      return;
    }

    if (isVideo && file.size > 50 * 1024 * 1024) {
      setErrorMsg('Video file size exceeds 50MB. For larger videos, please enter a cloud or streaming URL.');
      return;
    }

    if (images.length >= maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} original media items allowed.`);
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setProcessingStatus(isVideo ? 'Reading and generating video preview...' : 'Reading image file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Url = e.target?.result as string;
        let durationSec = 0;
        let thumbnailUrl = '';

        if (isVideo) {
          setProcessingStatus('Extracting video duration and poster frame...');
          const meta = await extractVideoMetadata(base64Url);
          durationSec = meta.duration;
          thumbnailUrl = meta.thumbnail;
        }

        const newMedia: UploadedImageData = {
          id: `${isVideo ? 'vid' : 'img'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          url: base64Url,
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          mediaType: isVideo ? 'video' : 'image',
          durationSec: durationSec > 0 ? durationSec : undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          labelPosition: (labelPositionDefault as 'front' | 'back' | 'wrap') || 'front'
        };

        if (!allowMultiple) {
          onImagesChange([newMedia]);
        } else {
          onImagesChange([...images, newMedia]);
        }
      } catch (err) {
        setErrorMsg('Failed to process uploaded file. Please try again.');
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file. Please check file permissions.');
      setIsProcessing(false);
      setProcessingStatus('');
    };

    reader.readAsDataURL(file);
  };

  const handleAddVideoByUrl = async () => {
    if (!videoUrlInput.trim()) {
      setErrorMsg('Please enter a valid video URL.');
      return;
    }

    if (images.length >= maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} original media items allowed.`);
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setProcessingStatus('Analyzing video stream metadata...');

    try {
      const url = videoUrlInput.trim();
      const meta = await extractVideoMetadata(url);
      const name = videoNameInput.trim() || `Video Clip (${new URL(url).hostname || 'Online Stream'})`;

      const newMedia: UploadedImageData = {
        id: `vid-url-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url,
        name,
        sizeKb: 1024,
        type: 'video/mp4',
        mediaType: 'video',
        durationSec: meta.duration > 0 ? meta.duration : undefined,
        thumbnailUrl: meta.thumbnail || undefined,
        labelPosition: 'front'
      };

      if (!allowMultiple) {
        onImagesChange([newMedia]);
      } else {
        onImagesChange([...images, newMedia]);
      }

      setVideoUrlInput('');
      setVideoNameInput('');
      setActiveTab('all');
    } catch {
      setErrorMsg('Could not verify video URL. Make sure it is directly accessible.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file: File) => processFile(file));
      e.target.value = '';
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

  const removeMedia = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
    if (linkedQrId === id) setLinkedQrId(null);
  };

  const handleConnectQr = (item: UploadedImageData) => {
    setLinkedQrId(item.id);
    if (onLinkVideoToQr) {
      onLinkVideoToQr(item.url);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '0:30';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const imageCount = images.filter(i => i.mediaType !== 'video' && !i.type.startsWith('video/')).length;
  const videoCount = images.filter(i => i.mediaType === 'video' || i.type.startsWith('video/')).length;

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
        multiple={allowMultiple}
        onChange={handleFileInput}
        className="hidden"
        id="media-image-upload-input"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg,video/*"
        multiple={allowMultiple}
        onChange={handleFileInput}
        className="hidden"
        id="media-video-upload-input"
      />

      {/* Upload Action Switcher Tabs & Quick Buttons */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200/80">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={images.length >= maxFiles}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-cyan-50 text-slate-800 hover:text-cyan-700 text-xs font-bold transition-all shadow-xs border border-slate-200/60 cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4 text-cyan-600" />
          <span>+ Upload Image / Logo</span>
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={images.length >= maxFiles}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Video className="w-4 h-4 text-purple-200" />
          <span>+ Upload Video Clip</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'video_url' ? 'all' : 'video_url')}
          disabled={images.length >= maxFiles}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            activeTab === 'video_url'
              ? 'bg-purple-100 border-purple-300 text-purple-800'
              : 'bg-white hover:bg-slate-50 border-slate-200/60 text-slate-700'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Video URL</span>
        </button>
      </div>

      {/* Video URL Input Dropdown Panel */}
      {activeTab === 'video_url' && images.length < maxFiles && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <Film className="w-4 h-4 text-purple-700" />
              <span>Attach Video via Streaming / Cloud Link</span>
            </h4>
            <span className="text-[10px] text-purple-700 font-semibold">Supports Direct MP4, WebM, Cloudinary, AWS S3</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="e.g. Wedding Highlight Reel / Brand Story"
              value={videoNameInput}
              onChange={e => setVideoNameInput(e.target.value)}
              className="px-3 py-2 bg-white rounded-xl border border-purple-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrlInput}
                onChange={e => setVideoUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-white rounded-xl border border-purple-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleAddVideoByUrl}
                disabled={!videoUrlInput.trim() || isProcessing}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                Add Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag and Drop Unified Zone */}
      {images.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all duration-200 ${
            dragActive
              ? 'border-purple-500 bg-purple-50/80 scale-[0.99]'
              : 'border-slate-300 hover:border-cyan-400 bg-slate-50/70 hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-inner">
                <Video className="w-6 h-6" />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Drag & drop your <span className="text-cyan-600 font-bold">Image / Logo</span> or{' '}
                <span className="text-purple-600 font-bold">Video Clip</span> here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Images (PNG, JPG, SVG, WEBP up to 20MB) • Videos (MP4, WEBM, MOV up to 50MB)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Browse Images</span>
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-purple-700 hover:bg-purple-50 shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Browse Videos</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              <span>Full Print & 1080p Video Master Stored with Order</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center gap-3 text-cyan-900 text-xs animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 shrink-0" />
          <span className="font-semibold">{processingStatus}</span>
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </p>
      )}

      {/* Uploaded Media Items List */}
      {images.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>
                Attached Media Assets ({images.length}/{maxFiles})
              </span>
              <span className="text-[10px] font-semibold text-slate-400 normal-case">
                • {imageCount} Image{imageCount !== 1 ? 's' : ''}, {videoCount} Video{videoCount !== 1 ? 's' : ''}
              </span>
            </h4>
            {images.length < maxFiles && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-800 cursor-pointer"
                >
                  + Add Image
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  + Add Video
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {images.map((item) => {
              const isVideo = item.mediaType === 'video' || item.type.startsWith('video/');

              return (
                <div
                  key={item.id}
                  className={`group relative bg-white border rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5 ${
                    isVideo ? 'border-purple-200 hover:border-purple-400' : 'border-slate-200 hover:border-cyan-400'
                  }`}
                >
                  {/* Thumbnail Preview Stage */}
                  <div className="relative w-16 h-16 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {isVideo ? (
                      item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-purple-400">
                          <Film className="w-6 h-6" />
                        </div>
                      )
                    ) : (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-contain p-1 bg-slate-50"
                      />
                    )}

                    {/* Overlay Action Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMedia({
                          url: item.url,
                          type: isVideo ? 'video' : 'image',
                          name: item.name,
                          durationSec: item.durationSec,
                          sizeKb: item.sizeKb
                        })
                      }
                      className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all cursor-pointer"
                      title={isVideo ? 'Play Video' : 'Zoom Image'}
                    >
                      {isVideo ? (
                        <div className="w-7 h-7 rounded-full bg-purple-600/90 flex items-center justify-center shadow-md">
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        </div>
                      ) : (
                        <Maximize2 className="w-4 h-4 opacity-80 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          isVideo
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}
                      >
                        {isVideo ? 'Video' : 'Image'}
                      </span>
                      <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <span>{item.sizeKb > 1024 ? `${(item.sizeKb / 1024).toFixed(1)} MB` : `${item.sizeKb} KB`}</span>
                      {isVideo && item.durationSec && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-purple-700">{formatDuration(item.durationSec)}</span>
                        </>
                      )}
                    </p>

                    {/* QR Code link button for video */}
                    {isVideo && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={() => handleConnectQr(item)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                            linkedQrId === item.id
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                          }`}
                          title="Set this video as the destination for the bottle's dynamic QR code"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>{linkedQrId === item.id ? '✓ Linked to Bottle QR' : 'Link to Bottle QR Code'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMedia({
                          url: item.url,
                          type: isVideo ? 'video' : 'image',
                          name: item.name,
                          durationSec: item.durationSec,
                          sizeKb: item.sizeKb
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                      title={isVideo ? 'Play Video' : 'View'}
                    >
                      {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMedia(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full HD Media Player / Lightbox Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2.5">
                {previewMedia.type === 'video' ? (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold truncate max-w-md">{previewMedia.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {previewMedia.type === 'video' ? 'Full HD Video Playback' : 'Original Print-Ready Image'}
                    {previewMedia.durationSec ? ` • ${formatDuration(previewMedia.durationSec)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewMedia.url}
                  download={previewMedia.name}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Content Stage */}
            <div className="p-4 sm:p-6 flex-1 flex items-center justify-center bg-black/40 overflow-hidden min-h-[300px]">
              {previewMedia.type === 'video' ? (
                <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
                  <video
                    src={previewMedia.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[60vh] w-full object-contain"
                  >
                    Your browser does not support playing this video format.
                  </video>
                </div>
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg"
                />
              )}
            </div>

            {/* Footer */}
            {previewMedia.type === 'video' && onLinkVideoToQr && (
              <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Want bottle scanners to watch this video?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onLinkVideoToQr) onLinkVideoToQr(previewMedia.url);
                    setPreviewMedia(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Assign to Dynamic Bottle QR Code</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
