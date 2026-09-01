import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  ShieldCheck,
  Settings,
  X,
  Check,
  Smartphone
} from 'lucide-react';

interface CustomShieldedVideoPlayerProps {
  url: string;
  title: string;
  onClose?: () => void;
}

// Helper to extract clean YouTube Video ID
export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Standard video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  // URL matching
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : trimmed;
}

// Format seconds into MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const CustomShieldedVideoPlayer: React.FC<CustomShieldedVideoPlayerProps> = ({
  url,
  title,
  onClose
}) => {
  const videoId = extractYouTubeId(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [quality, setQuality] = useState<string>('HD');
  const [centerRipple, setCenterRipple] = useState<'play' | 'pause' | 'forward' | 'backward' | null>(null);
  const [needsUserTouchToPlay, setNeedsUserTouchToPlay] = useState<boolean>(false);

  // Send message directly to YouTube iframe as a resilient fallback
  const sendIframeCommand = useCallback((command: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: command, args }),
          '*'
        );
      } catch (err) {
        console.error('Error sending postMessage to YT iframe:', err);
      }
    }
  }, []);

  // Controls auto-hide timer
  const triggerControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 4000);
  }, [isPlaying]);

  // Initialize YouTube IFrame API with high mobile tolerance
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }

      try {
        playerRef.current = new window.YT.Player(`yt-iframe-${videoId}`, {
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              setIsLoaded(true);
              try {
                const dur = event.target.getDuration() || 0;
                if (dur > 0) setDuration(dur);
              } catch (err) {
                // ignore
              }
              setNeedsUserTouchToPlay(true);
              setIsPlaying(false);
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
              if (event.data === 1) {
                setHasStarted(true);
                setIsPlaying(true);
                setNeedsUserTouchToPlay(false);
                triggerControlsTimeout();
              } else if (event.data === 3) {
                setHasStarted(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
                setShowControls(true);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setShowControls(true);
              }
            }
          }
        });
      } catch (err) {
        console.warn('YT.Player initialization fallback active', err);
        setIsLoaded(true);
      }
    };

    // Load API script if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    // Fallback if onYouTubeIframeAPIReady is delayed on mobile
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !isLoaded) {
        setIsLoaded(true);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [videoId, triggerControlsTimeout]);

  // Sync state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const curr = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          const loaded = playerRef.current.getVideoLoadedFraction() || 0;
          const q = playerRef.current.getPlaybackQuality() || 'hd720';

          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
          setBuffered(loaded * 100);

          if (q.includes('1080') || q.includes('hd1080')) setQuality('1080p');
          else if (q.includes('720') || q.includes('hd720')) setQuality('720p');
          else setQuality('HD');
        } catch (e) {
          // ignore
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Listen for native fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const triggerRipple = (type: 'play' | 'pause' | 'forward' | 'backward') => {
    setCenterRipple(type);
    setTimeout(() => setCenterRipple(null), 600);
  };

  // Play / Pause Action
  const togglePlayPause = () => {
    setNeedsUserTouchToPlay(false);
    if (isPlaying) {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try { playerRef.current.pauseVideo(); } catch (e) {}
      }
      sendIframeCommand('pauseVideo');
      setIsPlaying(false);
      triggerRipple('pause');
    } else {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        try { playerRef.current.playVideo(); } catch (e) {}
      }
      sendIframeCommand('playVideo');
      setIsPlaying(true);
      triggerRipple('play');
    }
    triggerControlsTimeout();
  };

  // Seeking (-10s / +10s)
  const seekRelative = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration || 9999, currentTime + seconds));
    setCurrentTime(newTime);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try { playerRef.current.seekTo(newTime, true); } catch (e) {}
    }
    sendIframeCommand('seekTo', [newTime, true]);
    triggerRipple(seconds > 0 ? 'forward' : 'backward');
    triggerControlsTimeout();
  };

  // Progress Bar Seek
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try { playerRef.current.seekTo(targetTime, true); } catch (e) {}
    }
    sendIframeCommand('seekTo', [targetTime, true]);
    triggerControlsTimeout();
  };

  // Touch double-tap detection for mobile fast-forward / rewind
  const handleTouchCanvas = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const width = rect.width;

    if (now - lastTapRef.current.time < 300) {
      // Double tap detected!
      if (touchX > width * 0.65) {
        seekRelative(10); // forward 10s
      } else if (touchX < width * 0.35) {
        seekRelative(-10); // rewind 10s
      } else {
        togglePlayPause();
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: touchX };
      // Single tap toggles controls visibility or plays
      setShowControls((prev) => !prev);
      if (!showControls) {
        triggerControlsTimeout();
      }
    }
  };

  // Mute Toggle
  const toggleMute = () => {
    if (isMuted) {
      if (playerRef.current && typeof playerRef.current.unMute === 'function') {
        try { playerRef.current.unMute(); } catch (e) {}
      }
      sendIframeCommand('unMute');
      setIsMuted(false);
      if (volume === 0) {
        setVolume(70);
        if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
          try { playerRef.current.setVolume(70); } catch (e) {}
        }
        sendIframeCommand('setVolume', [70]);
      }
    } else {
      if (playerRef.current && typeof playerRef.current.mute === 'function') {
        try { playerRef.current.mute(); } catch (e) {}
      }
      sendIframeCommand('mute');
      setIsMuted(true);
    }
    triggerControlsTimeout();
  };

  // Volume Slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (newVol === 0) {
      setIsMuted(true);
      sendIframeCommand('mute');
    } else {
      setIsMuted(false);
      sendIframeCommand('unMute');
      sendIframeCommand('setVolume', [newVol]);
    }
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try { playerRef.current.setVolume(newVol); } catch (e) {}
    }
  };

  // Speed Change
  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try { playerRef.current.setPlaybackRate(rate); } catch (e) {}
    }
    sendIframeCommand('setPlaybackRate', [rate]);
    triggerControlsTimeout();
  };

  // Robust Fullscreen (Native Fullscreen + Mobile CSS Fallback)
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    const doc: any = document;
    const isCurrentlyFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (isCurrentlyFullscreen) {
      // Exit fullscreen
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    } else {
      // Enter fullscreen: try native API first, fallback to CSS fullscreen
      const requestMethod =
        container.requestFullscreen ||
        (container as any).webkitRequestFullscreen ||
        (container as any).mozRequestFullScreen ||
        (container as any).msRequestFullscreen;

      if (requestMethod) {
        requestMethod.call(container).then(() => {
          setIsFullscreen(true);
          // Try to lock to landscape on phones if allowed
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        }).catch(() => {
          // Native fullscreen rejected (e.g. iOS Safari iPhone), use CSS fullscreen
          setIsFullscreen(true);
        });
      } else {
        // Fallback CSS fullscreen for iPhone Safari
        setIsFullscreen(!isFullscreen);
      }
    }
    triggerControlsTimeout();
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div
      ref={containerRef}
      onMouseMove={() => triggerControlsTimeout()}
      className={`relative bg-black w-full overflow-hidden select-none font-sans ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 rounded-none border-none shadow-none flex flex-col justify-center'
          : 'aspect-video border-4 border-rose-600/90 rounded-2xl shadow-[0_0_40px_rgba(225,29,72,0.4)]'
      }`}
    >
      {/* Loading Spinner */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-30 text-white space-y-3 p-4 text-center">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold tracking-wide text-rose-400">
            جاري تحضير مشغل المحاضرة المحمي...
          </span>
        </div>
      )}

      {/* Embedded YouTube Iframe Target */}
      <div className="w-full h-full relative flex items-center justify-center bg-black">
        <iframe
          id={`yt-iframe-${videoId}`}
          ref={iframeRef}
          className="w-full h-full absolute inset-0 border-0"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&playsinline=1&origin=${encodeURIComponent(
            window.location.origin
          )}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* SHIELD OVERLAYS: Prevents accidental clicks to external YouTube links */}
      {/* Top Banner Shield */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-auto" />
      {/* Bottom YouTube Logo Shield (Left & Right to be safe) */}
      <div className="absolute bottom-0 left-0 w-36 h-20 z-10 pointer-events-auto" />
      <div className="absolute bottom-0 right-0 w-36 h-20 z-10 pointer-events-auto" />

      {/* Interactive Touch/Click Layer */}
      <div
        onClick={(e) => {
          if (hasStarted) {
            togglePlayPause();
          }
        }}
        onTouchEnd={(e) => {
          if (hasStarted) {
            handleTouchCanvas(e);
          }
        }}
        className={`absolute inset-0 z-20 flex items-center justify-center ${
          hasStarted ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Animated Ripple Icon */}
        {centerRipple && (
          <div className="animate-ping p-6 rounded-full bg-rose-600/80 text-white z-30 shadow-2xl">
            {centerRipple === 'play' && <Play className="w-10 h-10 md:w-14 md:h-14 fill-white" />}
            {centerRipple === 'pause' && <Pause className="w-10 h-10 md:w-14 md:h-14" />}
            {centerRipple === 'forward' && <RotateCw className="w-10 h-10 md:w-14 md:h-14" />}
            {centerRipple === 'backward' && <RotateCcw className="w-10 h-10 md:w-14 md:h-14" />}
          </div>
        )}

        {/* Center Big Play Button when paused or waiting for touch */}
        {(!isPlaying || needsUserTouchToPlay) && isLoaded && !centerRipple && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="p-5 md:p-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-400 shadow-[0_0_35px_rgba(225,29,72,0.9)] transform transition active:scale-95 hover:scale-105 cursor-pointer flex items-center justify-center"
            >
              <Play className="w-8 h-8 md:w-12 md:h-12 ml-1 fill-white" />
            </button>
            <span className="bg-black/80 backdrop-blur-md text-white text-xs md:text-sm font-bold px-4 py-1.5 rounded-full border border-rose-500/50 shadow-lg">
              اضغط للتشغيل
            </span>
          </div>
        )}
      </div>

      {/* Top Header Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 p-3 md:p-4 flex justify-between items-center bg-gradient-to-b from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 text-right overflow-hidden mr-2">
          <span className="bg-rose-600 text-white text-[10px] md:text-xs font-black px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 shadow-sm shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
            مشغل آمن
          </span>
          <h3 className="text-white font-black text-xs sm:text-sm md:text-base truncate max-w-[200px] sm:max-w-md drop-shadow">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Dedicated Top Fullscreen Button for mobile convenience */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="bg-black/60 hover:bg-rose-600 active:bg-rose-700 text-white px-2.5 py-1.5 rounded-xl border border-gray-700/80 transition cursor-pointer flex items-center gap-1 text-xs font-bold shadow-md"
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
          </button>

          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="bg-black/60 hover:bg-rose-600 active:bg-rose-700 text-gray-300 hover:text-white p-2 rounded-xl border border-gray-700/80 transition cursor-pointer"
              title="إغلاق الفيديو"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Custom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 p-2.5 sm:p-4 bg-gradient-to-t from-black via-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar & Seek Slider */}
        <div className="relative w-full mb-2 sm:mb-3 group/slider flex items-center">
          {/* Buffer Track */}
          <div className="absolute left-0 right-0 h-1.5 sm:h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-600 transition-all duration-300"
              style={{ width: `${buffered}%` }}
            />
          </div>

          {/* Active Gradient Track */}
          <div className="absolute left-0 right-0 h-1.5 sm:h-2 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-sky-400"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Interactive Range Input */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            className="relative w-full h-5 sm:h-6 opacity-0 cursor-pointer z-10 touch-none"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-1 sm:gap-3 text-white text-xs md:text-sm font-bold">
          {/* Left Controls: Play, Rewind, Forward, Time */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play / Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="p-2 sm:p-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl transition cursor-pointer shadow-md shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px]"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              )}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                seekRelative(-10);
              }}
              className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-200 rounded-lg transition cursor-pointer flex items-center gap-0.5 text-[11px]"
              title="تأخير 10 ثوانٍ"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-mono text-[10px] hidden xs:inline">-10s</span>
            </button>

            {/* Fast Forward +10s */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                seekRelative(10);
              }}
              className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-200 rounded-lg transition cursor-pointer flex items-center gap-0.5 text-[11px]"
              title="تقديم 10 ثوانٍ"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-mono text-[10px] hidden xs:inline">+10s</span>
            </button>

            {/* Time Display */}
            <div className="font-mono text-gray-300 text-[10px] sm:text-xs tracking-wider bg-black/50 px-2 sm:px-2.5 py-1 rounded-lg border border-gray-800 shrink-0">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed Control Button & Popup */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeedMenu(!showSpeedMenu);
                }}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-[11px] sm:text-xs px-2 sm:px-2.5 py-1.5 rounded-lg border border-gray-700/80 transition cursor-pointer flex items-center gap-1 font-mono font-bold"
                title="سرعة التشغيل"
              >
                <span>{playbackRate}x</span>
                <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
              </button>

              {/* Speed Menu Popup */}
              {showSpeedMenu && (
                <div className="absolute bottom-11 left-0 bg-slate-900 border-2 border-rose-600 rounded-xl p-1.5 shadow-2xl z-40 min-w-[110px] space-y-1">
                  <div className="text-[10px] font-black text-rose-400 px-2 py-1 text-right border-b border-gray-800">
                    سرعة التشغيل
                  </div>
                  {speeds.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => {
                        e.stopPropagation();
                        changeSpeed(s);
                      }}
                      className={`w-full text-right px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center justify-between ${
                        playbackRate === s
                          ? 'bg-rose-600 text-white'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{s === 1 ? 'عادية (1x)' : `${s}x`}</span>
                      {playbackRate === s && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control (hidden on mobile phones to save space for Fullscreen) */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="p-1.5 text-gray-300 hover:text-white transition cursor-pointer"
                title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4 text-gray-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-gray-700 accent-rose-500 rounded-lg cursor-pointer"
              />
            </div>

            {/* Prominent High-Contrast Fullscreen Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white px-2.5 py-1.5 rounded-xl border border-rose-400/80 shadow-md transition cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 min-h-[36px]"
              title={isFullscreen ? 'تصغير الشاشة' : 'تكبير ملء الشاشة'}
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-4 h-4" />
                  <span className="hidden sm:inline">تصغير</span>
                </>
              ) : (
                <>
                  <Maximize className="w-4 h-4" />
                  <span className="inline">شاشة كاملة</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
