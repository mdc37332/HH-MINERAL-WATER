import React, { useRef, useState } from 'react';
import { uploadVideoFile, parseVideoInput, formatFileSize, extractVideoThumbnail } from '../lib/videoUtils';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
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
  maxFiles = Infinity,
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

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setErrorMsg(null);
    setIsProcessing(true);
    setProcessingStatus(`Processing ${files.length} file${files.length > 1 ? 's' : ''}...`);

    const newMediaItems: UploadedImageData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(file.name);

      if (!isImage && !isVideo) continue;

      setProcessingStatus(`Uploading ${i + 1}/${files.length}: ${file.name} (${formatFileSize(file.size)})`);

      try {
        let mediaUrl = '';
        let durationSec = 0;
        let thumbnailUrl = '';

        if (isVideo) {
          // For video files of ANY size (KB, MB, GB), upload via streaming engine
          const uploadRes = await uploadVideoFile(file, (percent) => {
            setProcessingStatus(`Uploading ${file.name} (${formatFileSize(file.size)}): ${percent}%`);
          });
          mediaUrl = uploadRes.url;
          try {
            const meta = await extractVideoThumbnail(mediaUrl);
            durationSec = meta.duration;
            thumbnailUrl = meta.thumbnail;
          } catch {
            // video meta fallback
          }
        } else {
          // For image files
          mediaUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        newMediaItems.push({
          id: `${isVideo ? 'vid' : 'img'}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          url: mediaUrl,
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          mediaType: isVideo ? 'video' : 'image',
          durationSec: durationSec > 0 ? durationSec : undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          labelPosition: (labelPositionDefault as 'front' | 'back' | 'wrap') || 'front'
        });
      } catch (err) {
        console.warn('Failed to process file:', file.name, err);
      }
    }

    if (newMediaItems.length > 0) {
      if (!allowMultiple) {
        onImagesChange([newMediaItems[0]]);
      } else {
        onImagesChange([...images, ...newMediaItems]);
      }
    } else {
      setErrorMsg('No valid image or video files could be processed.');
    }

    setIsProcessing(false);
    setProcessingStatus('');
  };

  const handleAddVideoByUrl = async () => {
    if (!videoUrlInput.trim()) {
      setErrorMsg('Please enter a valid video URL.');
      return;
    }

    if (images.length >= maxFiles && maxFiles !== Infinity) {
      setErrorMsg(`Maximum ${maxFiles} original media items allowed.`);
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setProcessingStatus('Analyzing video stream metadata...');

    try {
      const rawUrl = videoUrlInput.trim();
      const parsed = parseVideoInput(rawUrl);
      const url = parsed.streamUrl || parsed.rawUrl;
      const meta = await extractVideoThumbnail(url);
      const name = videoNameInput.trim() || parsed.title || `Video Clip (${parsed.type.toUpperCase()})`;

      const newMedia: UploadedImageData = {
        id: `vid-url-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url,
        name,
        sizeKb: 1024,
        type: 'video/mp4',
        mediaType: 'video',
        durationSec: meta.duration > 0 ? meta.duration : undefined,
        thumbnailUrl: meta.thumbnail || parsed.thumbnailUrl || undefined,
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
    } catch (err) {
      console.warn('Video URL parse notice:', err);
      // Even if metadata extraction was partial, still attach the parsed video URL!
      const parsed = parseVideoInput(videoUrlInput.trim());
      const newMedia: UploadedImageData = {
        id: `vid-url-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        url: parsed.streamUrl || parsed.rawUrl,
        name: videoNameInput.trim() || parsed.title || 'Online Video Stream',
        sizeKb: 1024,
        type: 'video/mp4',
        mediaType: 'video',
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
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files) as File[];
      processFiles(files);
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
      const files: File[] = Array.from(e.dataTransfer.files) as File[];
      processFiles(files);
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
      <div className="bg-[#141414] p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-[#262626]">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={images.length >= maxFiles}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#1c1913] hover:bg-[#252015] text-[#DFC283] hover:text-[#f3dfa9] text-xs font-bold transition-all shadow-xs border border-[#C5A059]/30 cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4 text-[#C5A059]" />
          <span>+ Upload Image / Logo</span>
        </button>

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={images.length >= maxFiles}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-white text-xs font-bold transition-all shadow-xs border border-[#333333] cursor-pointer disabled:opacity-50"
        >
          <Video className="w-4 h-4 text-[#C5A059]" />
          <span>+ Upload Video Clip</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'video_url' ? 'all' : 'video_url')}
          disabled={images.length >= maxFiles}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            activeTab === 'video_url'
              ? 'bg-[#2a2416] border-[#C5A059] text-[#DFC283]'
              : 'bg-[#181818] hover:bg-[#222222] border-[#333333] text-neutral-300'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Video URL</span>
        </button>
      </div>

      {/* Video URL Input Dropdown Panel */}
      {activeTab === 'video_url' && images.length < maxFiles && (
        <div className="p-4 bg-[#161616] border border-[#2e2e2e] rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Film className="w-4 h-4 text-[#C5A059]" />
              <span>Attach Video via Streaming / Cloud Link</span>
            </h4>
            <span className="text-[10px] text-neutral-400 font-semibold">Supports Direct MP4, WebM, Cloudinary, AWS S3</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="e.g. Wedding Highlight Reel / Brand Story"
              value={videoNameInput}
              onChange={e => setVideoNameInput(e.target.value)}
              className="px-3 py-2 bg-[#1c1c1c] rounded-xl border border-[#333333] text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
            />
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrlInput}
                onChange={e => setVideoUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#1c1c1c] rounded-xl border border-[#333333] text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
              />
              <button
                type="button"
                onClick={handleAddVideoByUrl}
                disabled={!videoUrlInput.trim() || isProcessing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
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
              ? 'border-[#C5A059] bg-[#1a1710] scale-[0.99]'
              : 'border-[#2e2e2e] hover:border-[#C5A059]/60 bg-[#121212] hover:bg-[#151515]'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1c1913] border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#181818] border border-[#333333] text-[#DFC283] flex items-center justify-center shadow-inner">
                <Video className="w-6 h-6" />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Drag & drop your <span className="text-[#DFC283] font-bold">Image / Logo</span> or{' '}
                <span className="text-[#DFC283] font-bold">Video Clip</span> here
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Images (PNG, JPG, SVG, WEBP up to 20MB) • Videos (MP4, WEBM, MOV up to 50MB)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-full bg-[#1c1913] border border-[#C5A059]/40 text-xs font-semibold text-[#DFC283] hover:bg-[#252015] shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Browse Images</span>
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-full bg-[#181818] border border-[#333333] text-xs font-semibold text-neutral-200 hover:text-white hover:bg-[#242424] shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Browse Videos</span>
              </button>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#161616] rounded-full border border-[#2a2a2a] text-[11px] font-medium text-neutral-300 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#C5A059]" />
              <span>Full Print & 1080p Video Master Stored with Order</span>
            </div>
          </div>
        </div>
      )}

      {/* Processing Loader */}
      {isProcessing && (
        <div className="p-3 bg-[#1c1913] border border-[#C5A059]/40 rounded-xl flex items-center gap-3 text-[#DFC283] text-xs animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059] shrink-0" />
          <span className="font-semibold">{processingStatus}</span>
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <p className="text-xs text-rose-400 font-medium bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </p>
      )}

      {/* Uploaded Media Items List */}
      {images.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>
                Attached Media Assets ({images.length} {maxFiles === Infinity || maxFiles >= 999 ? '• Unlimited' : `/${maxFiles}`})
              </span>
              <span className="text-[10px] font-semibold text-neutral-500 normal-case">
                • {imageCount} Image{imageCount !== 1 ? 's' : ''}, {videoCount} Video{videoCount !== 1 ? 's' : ''}
              </span>
            </h4>
            {(maxFiles === Infinity || images.length < maxFiles) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-xs font-bold text-[#DFC283] hover:text-white cursor-pointer"
                >
                  + Add More Images
                </button>
                <span className="text-neutral-600">•</span>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
                >
                  + Add Video
                </button>
              </div>
            )}
          </div>

          {/* Media Items Displayed Vertically */}
          <div className="flex flex-col gap-2.5 max-h-[540px] overflow-y-auto pr-1 scrollbar-thin">
            {images.map((item) => {
              const isVideo = item.mediaType === 'video' || item.type.startsWith('video/');

              return (
                <div
                  key={item.id}
                  className="group relative bg-[#161616] border border-[#282828] hover:border-[#C5A059]/60 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex items-center gap-3.5"
                >
                  {/* Thumbnail Preview Stage */}
                  <div className="relative w-16 h-16 rounded-xl bg-black border border-[#2e2e2e] overflow-hidden shrink-0 flex items-center justify-center">
                    {isVideo ? (
                      item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#DFC283]">
                          <Film className="w-6 h-6" />
                        </div>
                      )
                    ) : (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-contain p-1 bg-[#121212]"
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
                      className="absolute inset-0 bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-all cursor-pointer"
                      title={isVideo ? 'Play Video' : 'Zoom Image'}
                    >
                      {isVideo ? (
                        <div className="w-7 h-7 rounded-full bg-[#C5A059] flex items-center justify-center shadow-md">
                          <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                        </div>
                      ) : (
                        <Maximize2 className="w-4 h-4 text-[#DFC283] opacity-80 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          isVideo
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                            : 'bg-[#1c1913] text-[#DFC283] border border-[#C5A059]/40'
                        }`}
                      >
                        {isVideo ? 'Video' : 'Image'}
                      </span>
                      <p className="text-xs font-bold text-white truncate" title={item.name}>
                        {item.name}
                      </p>
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                      <span>{item.sizeKb > 1024 ? `${(item.sizeKb / 1024).toFixed(1)} MB` : `${item.sizeKb} KB`}</span>
                      {isVideo && item.durationSec && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-[#DFC283]">{formatDuration(item.durationSec)}</span>
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
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                              : 'bg-[#1e1e1e] text-neutral-300 hover:text-white border border-[#333333]'
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
                      className="p-1.5 text-neutral-400 hover:text-[#DFC283] hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
                      title={isVideo ? 'Play Video' : 'View'}
                    >
                      {isVideo ? <Play className="w-3.5 h-3.5 fill-current" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMedia(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full bg-[#141414] rounded-3xl overflow-hidden shadow-2xl border border-[#282828] flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262626] text-white">
              <div className="flex items-center gap-2.5">
                {previewMedia.type === 'video' ? (
                  <div className="w-7 h-7 rounded-lg bg-purple-950 text-purple-300 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#1c1913] text-[#C5A059] flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold truncate max-w-md">{previewMedia.name}</h4>
                  <p className="text-[11px] text-neutral-400">
                    {previewMedia.type === 'video' ? 'Full HD Video Playback' : 'Original Print-Ready Image'}
                    {previewMedia.durationSec ? ` • ${formatDuration(previewMedia.durationSec)}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewMedia.url}
                  download={previewMedia.name}
                  className="px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  className="w-8 h-8 rounded-xl bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Content Stage */}
            <div className="p-4 sm:p-6 flex-1 flex items-center justify-center bg-black/60 overflow-hidden min-h-[300px]">
              {previewMedia.type === 'video' ? (
                <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#282828] flex items-center justify-center aspect-video">
                  <UniversalVideoPlayer
                    src={previewMedia.url}
                    showControls={true}
                    autoPlay={true}
                    muted={false}
                    playsInline={true}
                    className="w-full h-full object-contain"
                  />
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
              <div className="px-5 py-3 bg-[#121212] border-t border-[#262626] flex items-center justify-between text-xs">
                <span className="text-neutral-400">Want bottle scanners to watch this video?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onLinkVideoToQr) onLinkVideoToQr(previewMedia.url);
                    setPreviewMedia(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-black" />
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
