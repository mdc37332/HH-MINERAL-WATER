import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Droplets,
  Sparkles,
  ShieldCheck,
  Award,
  Truck,
  CheckCircle2,
  Phone,
  Layers,
  Heart,
  Edit3,
  Camera,
  Package,
  ArrowRight,
  Play,
  Pause,
  RotateCw,
  Video,
  Volume2,
  VolumeX,
  Upload
} from 'lucide-react';
import { getCustomerSupportWhatsAppUrl, OWNER_WHATSAPP_NUMBER } from '../lib/whatsapp';
import { AdminHeroImageModal } from './admin/AdminHeroImageModal';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import {
  DEFAULT_HERO_IMAGE,
  STUDIO_BOTTLE_SVG_FALLBACK,
  isDeadOrDoctorImage
} from '../data/bottlePresets';

export const HeroSection: React.FC = () => {
  const { setCurrentSection, adminSettings, isAdminUnlocked, isFactoryStaffUnlocked } = useStore();

  const isAdmin = Boolean(isAdminUnlocked && !isFactoryStaffUnlocked);

  const fallbackHeroImage = DEFAULT_HERO_IMAGE;
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);

  const rawImage = adminSettings.heroBannerImage;
  const isStaleDeadImage = isDeadOrDoctorImage(rawImage);
  const heroImage = (!heroImgFailed && rawImage && !isStaleDeadImage)
    ? rawImage
    : fallbackHeroImage;

  const rawVideo = adminSettings.heroBannerVideo;
  const isDeadVideoUrl = Boolean(rawVideo && rawVideo.includes('coverr.co'));
  const heroVideo = (!heroVideoFailed && rawVideo && !isDeadVideoUrl)
    ? rawVideo
    : '';

  const [activeMedia, setActiveMedia] = useState<'video' | 'photo'>(() => {
    if (adminSettings.heroMediaType === 'image') return 'photo';
    if (adminSettings.heroMediaType === 'video' && adminSettings.heroBannerVideo) return 'video';
    return 'photo';
  });
  const [isPlayingMotion, setIsPlayingMotion] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [motionSpeed, setMotionSpeed] = useState<'cinematic' | 'smooth'>('cinematic');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset failure states when admin updates settings
  useEffect(() => {
    setHeroImgFailed(false);
  }, [adminSettings.heroBannerImage]);

  useEffect(() => {
    setHeroVideoFailed(false);
  }, [adminSettings.heroBannerVideo]);

  // Keep media type in sync when admin updates hero settings
  useEffect(() => {
    if (adminSettings.heroMediaType === 'image') {
      setActiveMedia('photo');
    } else if (adminSettings.heroMediaType === 'video' && heroVideo) {
      setActiveMedia('video');
    } else if (!heroVideo) {
      setActiveMedia('photo');
    }
  }, [adminSettings.heroMediaType, heroVideo]);

  // Ensure seamless autoplay on mobile devices (iOS Safari, Android Chrome)
  useEffect(() => {
    if (activeMedia === 'video' && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = isMuted;
      videoRef.current.playsInline = true;
      if (isPlayingMotion) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay permitted upon touch
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [activeMedia, heroVideo, isMuted, isPlayingMotion]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#000000] via-[#0c0c0c] to-[#121212] text-white py-8 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8 border-b border-[#222222]">
      {/* Background Decorative Rings & Ambient Gold Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[1000px] h-[350px] sm:h-[600px] bg-gradient-to-tr from-[#C5A059]/12 to-amber-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#C5A059]/8 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#DFC283] text-[11px] sm:text-xs font-bold uppercase tracking-widest shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
              <span>Certified Pristine Natural Mineral Water</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
              Purity in Every Drop. <br />
              <span className="gold-gradient-text">
                Crafted for Every Occasion.
              </span>
            </h1>

            <p className="text-xs sm:text-base text-neutral-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Experience ultra-pure mineral water purified through our signature <strong className="text-white">7-Stage UV & Ozonated</strong> filtration with balanced <strong className="text-[#DFC283]">7.4 pH alkaline</strong> minerals. Available in 250ml, 500ml, 1L, and 2L packaged formats.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              <button
                onClick={() => {
                  setCurrentSection('products');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#C5A059] via-[#DFC283] to-[#C5A059] hover:brightness-110 text-black font-black text-xs sm:text-sm shadow-lg shadow-[#C5A059]/20 active:scale-95 transition-all cursor-pointer"
              >
                <Package className="w-4 h-4 text-black" />
                <span>Explore Bottle Catalog</span>
                <ArrowRight className="w-4 h-4 ml-0.5 text-black" />
              </button>

              <button
                onClick={() => {
                  setCurrentSection('custom-design');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#C5A059]/40 text-[#DFC283] font-bold text-xs sm:text-sm backdrop-blur-md active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>Custom Logo Printing</span>
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-[#262626] max-w-lg mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <span className="font-heading text-lg sm:text-2xl font-black text-[#DFC283]">7.4 pH</span>
                <span className="block text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">Alkaline Balance</span>
              </div>
              <div className="text-center lg:text-left">
                <span className="font-heading text-lg sm:text-2xl font-black text-[#DFC283]">7-Stage</span>
                <span className="block text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">UV & Ozonation</span>
              </div>
              <div className="text-center lg:text-left">
                <span className="font-heading text-lg sm:text-2xl font-black text-[#DFC283]">100% Pure</span>
                <span className="block text-[10px] sm:text-[11px] text-neutral-400 mt-0.5">Natural Minerals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase with Video Upload & Animation */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center group w-full">
            {/* Top Interactive Video & Media Controls - Visible Only to Admin */}
            {isAdmin && (
              <div className="flex items-center justify-center sm:justify-end gap-2 bg-[#141414]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C5A059]/60 shadow-[0_4px_24px_rgba(0,0,0,0.6)] ring-1 ring-[#C5A059]/30 mb-3 sm:mb-0 sm:absolute sm:-top-8 sm:right-6 z-20 animate-in fade-in duration-200">
                <span className="text-[9px] font-black uppercase tracking-wider text-black bg-gradient-to-r from-[#C5A059] to-[#DFC283] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                  Admin
                </span>

                {heroVideo ? (
                  <div className="flex items-center gap-1.5 pr-2 border-r border-[#333333]">
                    <button
                      type="button"
                      onClick={() => setActiveMedia(activeMedia === 'video' ? 'photo' : 'video')}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        activeMedia === 'video'
                          ? 'bg-[#C5A059] text-black shadow-xs font-black'
                          : 'bg-[#222222] text-[#DFC283] hover:bg-[#2c2c2c] hover:text-white'
                      }`}
                      title="Switch between Video showcase and Bottle photo"
                    >
                      <Video className="w-3 h-3" />
                      <span>{activeMedia === 'video' ? 'Video Reel' : 'Bottle Photo'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center pr-2 border-r border-[#333333]">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSection('admin');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#DFC283] hover:text-white transition-colors cursor-pointer"
                      title="Upload hero video in Admin Panel"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Upload Video</span>
                    </button>
                  </div>
                )}

                {/* Play / Pause Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeMedia === 'video' && videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        setIsPlayingMotion(true);
                      } else {
                        videoRef.current.pause();
                        setIsPlayingMotion(false);
                      }
                    } else {
                      setIsPlayingMotion(!isPlayingMotion);
                    }
                  }}
                  className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isPlayingMotion ? 'Pause' : 'Play'}
                >
                  {isPlayingMotion ? <Pause className="w-3 h-3 text-[#DFC283]" /> : <Play className="w-3 h-3 text-emerald-400" />}
                </button>

                {/* Audio Mute Toggle for Video */}
                {activeMedia === 'video' && heroVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                      }
                    }}
                    className="p-1 rounded-full text-neutral-300 hover:text-[#DFC283] transition-colors cursor-pointer"
                    title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                )}

                {/* Speed / Pace Toggle */}
                {activeMedia === 'photo' && (
                  <button
                    type="button"
                    onClick={() => setMotionSpeed(prev => (prev === 'cinematic' ? 'smooth' : 'cinematic'))}
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#222222] hover:bg-[#2e2e2e] text-[#DFC283] border border-[#C5A059]/30 transition-colors cursor-pointer"
                    title="Toggle animation pace"
                  >
                    {motionSpeed === 'cinematic' ? '60fps' : 'Flow'}
                  </button>
                )}
              </div>
            )}

            {/* Spotlight Glow & Showcase Stage */}
            <div
              className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-md aspect-square bg-gradient-to-b from-[#C5A059]/15 via-[#161616]/85 to-[#101010] rounded-full p-4 sm:p-8 flex items-center justify-center border border-[#C5A059]/35 shadow-[0_20px_60px_-15px_rgba(197,160,89,0.3)] transition-all duration-300"
            >
              {/* Dynamic Caustic Background Aura */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#C5A059]/20 via-cyan-500/10 to-transparent blur-xl pointer-events-none animate-caustic" />

              {/* Concentric Expanding Water Ripples under the stage */}
              {isPlayingMotion && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none w-72 h-20 flex items-center justify-center z-0">
                  <div className="absolute w-48 h-48 rounded-full border border-[#C5A059]/50 animate-liquid-ripple-1" />
                  <div className="absolute w-48 h-48 rounded-full border border-[#DFC283]/35 animate-liquid-ripple-2" />
                  <div className="w-36 h-8 bg-gradient-to-r from-transparent via-[#C5A059]/35 to-transparent rounded-full blur-md" />
                </div>
              )}

              {/* Floating Ambient Water Droplets */}
              {isPlayingMotion && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full z-10">
                  <div className="absolute bottom-16 left-14 w-2 h-2 rounded-full bg-[#DFC283]/70 blur-[0.5px] animate-[dropletFloat_4s_infinite]" />
                  <div className="absolute bottom-20 right-16 w-2.5 h-2.5 rounded-full bg-cyan-300/60 blur-[0.5px] animate-[dropletFloat_5s_infinite_1.2s]" />
                  <div className="absolute bottom-12 left-1/2 w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px] animate-[dropletFloat_3.5s_infinite_2s]" />
                </div>
              )}

              {/* Central Media Container: Real Video Player OR Hydro Animated Bottle */}
              <div className="relative h-full w-full flex items-center justify-center z-10">
                {activeMedia === 'video' && heroVideo ? (
                  <div className="relative h-[88%] w-[88%] rounded-3xl overflow-hidden shadow-2xl border-2 border-[#C5A059]/50 bg-black flex items-center justify-center">
                    <UniversalVideoPlayer
                      videoRef={videoRef}
                      src={heroVideo}
                      autoPlay={isPlayingMotion}
                      loop={true}
                      muted={isMuted}
                      playsInline={true}
                      poster={heroImage}
                      onError={() => {
                        console.warn('Hero video failed to load, gracefully falling back to bottle photo.');
                        setHeroVideoFailed(true);
                        setActiveMedia('photo');
                      }}
                      className="h-full w-full object-cover"
                    />
                    {/* Light sweep overlay */}
                    {isPlayingMotion && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20 flex items-center justify-center">
                        <div className="w-1/3 h-[180%] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-xs animate-light-sweep" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`relative h-full w-full flex items-center justify-center ${
                    isPlayingMotion
                      ? motionSpeed === 'cinematic'
                        ? 'animate-hydro-levitate'
                        : 'animate-water-pulse'
                      : ''
                  }`}>
                    {/* Studio Specular Light Ray Sweep passing across the bottle glass */}
                    {isPlayingMotion && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20 flex items-center justify-center">
                        <div className="w-1/3 h-[180%] bg-gradient-to-r from-transparent via-white/30 to-transparent blur-xs animate-light-sweep" />
                      </div>
                    )}

                    {/* Primary Bottle Image */}
                    <img
                      src={heroImage}
                      alt="HH Mineral Water Premium Bottle"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== fallbackHeroImage) {
                          setHeroImgFailed(true);
                          target.src = fallbackHeroImage;
                        } else {
                          target.src = STUDIO_BOTTLE_SVG_FALLBACK;
                        }
                      }}
                      className="max-h-[86%] object-contain filter drop-shadow-[0_25px_40px_rgba(197,160,89,0.35)] transition-all duration-300"
                    />

                    {/* Studio Liquid Pedestal Water Reflection */}
                    {isPlayingMotion && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-44 h-10 overflow-hidden opacity-30 blur-[2px] pointer-events-none -scale-y-100">
                        <img
                          src={heroImage}
                          alt="Bottle Reflection"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== fallbackHeroImage) {
                              target.src = fallbackHeroImage;
                            } else {
                              target.src = STUDIO_BOTTLE_SVG_FALLBACK;
                            }
                          }}
                          className="w-full h-full object-contain filter brightness-90"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Admin Video / Image Edit Button - Accessible ONLY to Admin */}
              {isAdmin && (
                <div className="absolute inset-x-auto top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex flex-col gap-2 z-30 transition-all">
                  <button
                    type="button"
                    onClick={() => setIsHeroModalOpen(true)}
                    className="bg-[#121212]/95 hover:bg-[#C5A059] hover:text-black border border-[#C5A059] text-[#DFC283] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
                    title="Change or upload Hero Bottle Image / Video"
                  >
                    <Edit3 className="w-4 h-4 text-[#C5A059] group-hover:text-black" />
                    <span>Edit Hero Image (Admin)</span>
                  </button>
                </div>
              )}

              {/* Floating Feature Pills (Hidden on mobile to avoid obscuring bottle/video, visible on tablet & desktop) */}
              <div className="hidden sm:flex absolute top-6 left-2 bg-[#121212]/95 backdrop-blur-md border border-[#C5A059]/30 px-3.5 py-2 rounded-2xl shadow-xl items-center gap-2 z-20">
                <div className="w-7 h-7 rounded-xl bg-[#C5A059]/15 text-[#DFC283] flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-[#C5A059]" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold">Natural Minerals</p>
                  <p className="text-xs font-bold text-white">Magnesium & Calcium</p>
                </div>
              </div>

              <div className="hidden sm:flex absolute bottom-6 right-2 bg-[#121212]/95 backdrop-blur-md border border-[#C5A059]/30 px-3.5 py-2 rounded-2xl shadow-xl items-center gap-2 z-20">
                <div className="w-7 h-7 rounded-xl bg-[#C5A059]/15 text-[#DFC283] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold">BIS & FSSAI</p>
                  <p className="text-xs font-bold text-[#DFC283]">100% Lab Certified</p>
                </div>
              </div>
            </div>

            {/* Mobile Feature Highlights below stage */}
            <div className="sm:hidden grid grid-cols-2 gap-2 w-full max-w-[280px] xs:max-w-[320px] mt-3">
              <div className="bg-[#121212]/95 border border-[#C5A059]/30 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                <Droplets className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="text-[10px] font-bold text-neutral-200 truncate">Natural Minerals</span>
              </div>
              <div className="bg-[#121212]/95 border border-[#C5A059]/30 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="text-[10px] font-bold text-[#DFC283] truncate">100% Certified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Hero Image & Media Editor Modal */}
      {isAdmin && (
        <AdminHeroImageModal
          isOpen={isHeroModalOpen}
          onClose={() => setIsHeroModalOpen(false)}
        />
      )}
    </section>
  );
};
