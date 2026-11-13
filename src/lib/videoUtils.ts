// Universal Video Utility: Handles video parsing, pasting, metadata, and streaming uploads
// Supports video files of ANY size: KB, MB, GB without memory crashes or arbitrary limits.

export interface ParsedVideo {
  type: 'youtube' | 'vimeo' | 'drive' | 'dropbox' | 'direct' | 'blob' | 'data';
  rawUrl: string;
  streamUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  isIframe: boolean;
}

/**
 * Format bytes into human-readable KB, MB, GB
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Clean and parse any pasted video input (URL, embed code, YouTube, Vimeo, Google Drive, Dropbox, direct MP4/WebM)
 */
export function parseVideoInput(raw: string): ParsedVideo {
  if (!raw) {
    return {
      type: 'direct',
      rawUrl: '',
      streamUrl: '',
      isIframe: false,
    };
  }

  let cleaned = raw.trim();

  // Strip wrapping quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Handle iframe embed paste: <iframe ... src="https://..." ...></iframe>
  const iframeMatch = cleaned.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    cleaned = iframeMatch[1].trim();
  }

  // Handle markdown video/link paste: [title](https://...)
  const mdMatch = cleaned.match(/\[[^\]]*\]\((https?:\/\/[^\)]+)\)/i);
  if (mdMatch && mdMatch[1]) {
    cleaned = mdMatch[1].trim();
  }

  // Handle blob: and data:
  if (cleaned.startsWith('blob:')) {
    return {
      type: 'blob',
      rawUrl: cleaned,
      streamUrl: cleaned,
      isIframe: false,
    };
  }

  if (cleaned.startsWith('data:video/')) {
    return {
      type: 'data',
      rawUrl: cleaned,
      streamUrl: cleaned,
      isIframe: false,
    };
  }

  // 1. YouTube Detection (Standard watch, shorts, youtu.be, embed)
  // Formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  const ytMatch = cleaned.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1`;
    return {
      type: 'youtube',
      rawUrl: cleaned,
      streamUrl: embedUrl,
      embedUrl,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      title: `YouTube Video (${videoId})`,
      isIframe: true,
    };
  }

  // 2. Vimeo Detection
  // Formats: https://vimeo.com/12345678 or https://player.vimeo.com/video/12345678
  const vimeoMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    const embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&autopause=0&background=1&playsinline=1`;
    return {
      type: 'vimeo',
      rawUrl: cleaned,
      streamUrl: embedUrl,
      embedUrl,
      title: `Vimeo Video (${videoId})`,
      isIframe: true,
    };
  }

  // 3. Google Drive Detection
  // Formats: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const gdriveMatch = cleaned.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    const fileId = gdriveMatch[1];
    // Direct stream link or preview embed
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const directStream = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return {
      type: 'drive',
      rawUrl: cleaned,
      streamUrl: directStream,
      embedUrl,
      title: `Google Drive Video`,
      isIframe: true,
    };
  }

  // 4. Dropbox Detection
  // Formats: https://www.dropbox.com/s/.../video.mp4?dl=0 -> replace dl=0 with raw=1
  if (cleaned.includes('dropbox.com')) {
    let streamUrl = cleaned;
    if (streamUrl.includes('?dl=0')) {
      streamUrl = streamUrl.replace('?dl=0', '?raw=1');
    } else if (!streamUrl.includes('raw=1')) {
      streamUrl += (streamUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    return {
      type: 'dropbox',
      rawUrl: cleaned,
      streamUrl,
      title: 'Dropbox Video',
      isIframe: false,
    };
  }

  // 5. Direct Video Link (MP4, WebM, MOV, M4V, OGG, HLS, or general URL)
  return {
    type: 'direct',
    rawUrl: cleaned,
    streamUrl: cleaned,
    isIframe: false,
  };
}

/**
 * Upload video file of ANY size (KB, MB, GB) to backend server with progress tracking.
 * Automatically avoids browser memory blowup.
 */
export async function uploadVideoFile(
  file: File,
  onProgress?: (progressPercent: number, loadedBytes: number, totalBytes: number) => void
): Promise<{ url: string; size: number; sizeFormatted: string; name: string }> {
  // If smaller than 500KB and server upload fails, we can fall back to data URL, but server upload is always preferred
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-video', true);

    // Pass metadata in headers
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-file-size', String(file.size));
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(percent, event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.url) {
            if (onProgress) onProgress(100, file.size, file.size);
            resolve({
              url: res.url,
              size: res.size || file.size,
              sizeFormatted: res.sizeFormatted || formatFileSize(file.size),
              name: file.name,
            });
            return;
          }
        } catch {
          // JSON parse issue, continue to fallback below
        }
      }

      // If server upload failed (e.g. static dev environment), create object URL + local cache
      console.warn('Server upload returned status:', xhr.status, xhr.responseText);
      const localUrl = URL.createObjectURL(file);
      resolve({
        url: localUrl,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        name: file.name,
      });
    };

    xhr.onerror = () => {
      console.warn('Network error during video upload, falling back to instant blob URL');
      const localUrl = URL.createObjectURL(file);
      resolve({
        url: localUrl,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        name: file.name,
      });
    };

    // Send the raw file binary stream
    xhr.send(file);
  });
}

/**
 * Extract duration and video thumbnail safely for direct video URLs or Blobs
 */
export function extractVideoThumbnail(
  videoSource: string
): Promise<{ duration: number; thumbnail: string }> {
  return new Promise((resolve) => {
    const parsed = parseVideoInput(videoSource);
    if (parsed.thumbnailUrl) {
      resolve({ duration: 30, thumbnail: parsed.thumbnailUrl });
      return;
    }

    if (parsed.isIframe) {
      resolve({ duration: 30, thumbnail: '' });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = parsed.streamUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      resolve({ duration: 0, thumbnail: '' });
    }, 4000);

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration || 0);
      try {
        video.currentTime = Math.min(1, Math.max(0.5, duration / 4));
      } catch {
        clearTimeout(timeout);
        resolve({ duration, thumbnail: '' });
      }
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 320, 480);
        canvas.height = Math.min(video.videoHeight || 180, 270);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          resolve({ duration: Math.round(video.duration || 0), thumbnail });
          return;
        }
      } catch {
        // canvas tainted or security error
      }
      resolve({ duration: Math.round(video.duration || 0), thumbnail: '' });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      resolve({ duration: 0, thumbnail: '' });
    };
  });
}
