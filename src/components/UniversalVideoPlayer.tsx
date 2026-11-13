import React, { useMemo, useRef, useEffect } from 'react';
import { parseVideoInput, ParsedVideo } from '../lib/videoUtils';

interface UniversalVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  className?: string;
  showControls?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onError?: () => void;
  onLoadedData?: () => void;
}

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  src,
  poster,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  className = 'w-full h-full object-cover',
  showControls = false,
  videoRef: externalVideoRef,
  onError,
  onLoadedData,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoRef = externalVideoRef || internalVideoRef;

  const parsed: ParsedVideo = useMemo(() => {
    return parseVideoInput(src);
  }, [src]);

  // Keep muted state synced
  useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.muted = muted;
    }
  }, [muted, activeVideoRef]);

  if (!src) {
    if (poster) {
      return (
        <img
          src={poster}
          alt="Video thumbnail"
          className={className}
          loading="lazy"
        />
      );
    }
    return null;
  }

  // If YouTube, Vimeo, or Google Drive iframe embed
  if (parsed.isIframe && parsed.embedUrl) {
    // Append autoplay/mute flags if needed
    let iframeUrl = parsed.embedUrl;
    if (parsed.type === 'youtube') {
      const separator = iframeUrl.includes('?') ? '&' : '?';
      iframeUrl = `${iframeUrl}${separator}autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=${showControls ? 1 : 0}`;
    } else if (parsed.type === 'vimeo') {
      const separator = iframeUrl.includes('?') ? '&' : '?';
      iframeUrl = `${iframeUrl}${separator}autoplay=${autoPlay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}`;
    }

    return (
      <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center pointer-events-auto">
        <iframe
          src={iframeUrl}
          title={parsed.title || 'Video Player'}
          className={`${className} border-0 pointer-events-auto`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  // Native HTML5 Video for direct files (MP4, WebM, MOV, blob:, data:, /uploads/videos/...)
  return (
    <video
      ref={activeVideoRef}
      src={parsed.streamUrl || src}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      poster={poster}
      controls={showControls}
      preload="auto"
      onError={onError}
      onLoadedData={onLoadedData}
      className={className}
    />
  );
};
