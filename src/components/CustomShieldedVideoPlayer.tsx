import React, { useEffect, useRef, useState } from 'react';
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
  Sparkles,
  Check
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
  const playerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const [quality, setQuality] = useState<string>('HD');
  const [centerRipple, setCenterRipple] = useState<'play' | 'pause' | null>(null);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Clear previous player if exists
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }

      playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,          // Hide YouTube default controls
          modestbranding: 1,    // Hide YouTube branding as much as possible
          rel: 0,               // Do not show related videos from other channels
          showinfo: 0,          // Hide video title inside player
          fs: 0,                // Hide default fullscreen button
          disablekb: 1,         // Disable default keyboard shortcuts on iframe
          iv_load_policy: 3,    // Hide annotations
          cc_load_policy: 0,    // Default CC off
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            setIsLoaded(true);
            try {
              event.target.playVideo();
              setIsPlaying(true);
              setDuration(event.target.getDuration() || 0);
              setVolume(event.target.getVolume() || 100);
              setIsMuted(event.target.isMuted() || false);
            } catch (err) {
              console.error(err);
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // YT.PlayerState: PLAYING (1), PAUSED (2), ENDED (0), BUFFERING (3)
            if (event.data === 1) {
              setIsPlaying(true);
              triggerControlsTimeout();
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
    };

    // Load API script if needed
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

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [videoId]);

  // Sync state periodically (current time, duration, buffer)
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
          // ignore transient iframe access errors
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Controls auto-hide timer
  const triggerControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3500);
  };

  const handleMouseMove = () => {
    triggerControlsTimeout();
  };

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        triggerRipple('pause');
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        triggerRipple('play');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerRipple = (type: 'play' | 'pause') => {
    setCenterRipple(type);
    setTimeout(() => setCenterRipple(null), 600);
  };

  // Seeking (-10s / +10s)
  const seekRelative = (seconds: number) => {
    if (!playerRef.current) return;
    try {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      triggerControlsTimeout();
    } catch (e) {
      console.error(e);
    }
  };

  // Progress bar jump
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(targetTime, true);
      } catch (err) {
        console.error(err);
      }
    }
    triggerControlsTimeout();
  };

  // Mute toggle & Volume slider
  const toggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
        if (volume === 0) {
          setVolume(50);
          playerRef.current.setVolume(50);
        }
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(newVol);
        if (newVol === 0) {
          playerRef.current.mute();
          setIsMuted(true);
        } else if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Speed selection
  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(err);
        setIsFullscreen(!isFullscreen);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error(err);
      });
    }
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative bg-black w-full overflow-hidden select-none group font-sans border-4 border-rose-600/80 rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.4)] ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-none' : 'aspect-video'
      }`}
    >
      {/* Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-30 text-white space-y-3">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold tracking-wider text-rose-400">جاري إعداد مشغل مستر أحمد جمال المحمي...</span>
        </div>
      )}

      {/* YouTube Player Target */}
      <div className="w-full h-full pointer-events-none">
        <div id={`yt-player-${videoId}`} className="w-full h-full" />
      </div>

      {/* SHIELD OVERLAYS: Prevents direct clicks to YouTube outward links */}
      {/* Top shield covering top title / share bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-auto" />
      
      {/* Bottom right shield covering YouTube logo */}
      <div className="absolute bottom-12 left-0 w-32 h-16 z-20 pointer-events-auto" />

      {/* Main Transparent Click Shield over Video Canvas */}
      <div
        onClick={togglePlayPause}
        className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
      >
        {/* Animated Ripple Feedback */}
        {centerRipple && (
          <div className="animate-ping p-6 rounded-full bg-rose-600/60 text-white z-30">
            {centerRipple === 'play' ? <Play className="w-12 h-12" /> : <Pause className="w-12 h-12" />}
          </div>
        )}

        {/* Center Big Play Button if Paused */}
        {!isPlaying && isLoaded && !centerRipple && (
          <div className="p-6 rounded-full bg-rose-600/90 text-white border-2 border-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.8)] transform transition duration-300 hover:scale-110">
            <Play className="w-10 h-10 ml-1 fill-white" />
          </div>
        )}
      </div>

      {/* Top Header Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 text-right">
          <span className="bg-rose-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
            شاشة مشفرة
          </span>
          <h3 className="text-white font-black text-sm md:text-base truncate max-w-md drop-shadow">
            {title}
          </h3>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="bg-black/60 hover:bg-rose-600 text-gray-300 hover:text-white p-2 rounded-xl border border-gray-700/80 transition cursor-pointer z-30"
            title="إغلاق الفيديو"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Custom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 p-3 md:p-4 bg-gradient-to-t from-black via-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar & Seek Slider */}
        <div className="relative w-full mb-3 group/slider">
          {/* Buffer Track Background */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-600 transition-all duration-300"
              style={{ width: `${buffered}%` }}
            />
          </div>

          {/* Active Progress Gradient Track */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-sky-400"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Range Slider Control */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            className="relative w-full h-3 opacity-0 cursor-pointer z-10"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 text-white text-xs md:text-sm font-bold">
          {/* Left Controls: Play/Pause, Rewind, Fast Forward, Time Display */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlayPause}
              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition cursor-pointer shadow-md"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-white" />}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition cursor-pointer flex items-center gap-0.5 text-[11px]"
              title="تأخير 10 ثوانٍ"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="font-mono text-[10px] hidden sm:inline">-10s</span>
            </button>

            {/* Fast Forward +10s */}
            <button
              onClick={() => seekRelative(10)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition cursor-pointer flex items-center gap-0.5 text-[11px]"
              title="تقديم 10 ثوانٍ"
            >
              <RotateCw className="w-4 h-4" />
              <span className="font-mono text-[10px] hidden sm:inline">+10s</span>
            </button>

            {/* Time Indicator */}
            <div className="font-mono text-gray-300 text-xs tracking-wider bg-black/40 px-2.5 py-1 rounded-lg border border-gray-800">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality, Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Quality Badge */}
            <span className="hidden sm:inline-block bg-sky-950/60 border border-sky-800/80 text-sky-400 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
              {quality}
            </span>

            {/* Speed Control Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1.5 rounded-lg border border-gray-700/80 transition cursor-pointer flex items-center gap-1 font-mono font-bold"
                title="سرعة التشغيل"
              >
                <span>{playbackRate}x</span>
                <Settings className="w-3.5 h-3.5 text-rose-400" />
              </button>

              {/* Speed Menu Dropdown */}
              {showSpeedMenu && (
                <div className="absolute bottom-10 left-0 bg-slate-900 border-2 border-rose-600 rounded-xl p-1.5 shadow-2xl z-30 min-w-[100px] space-y-1">
                  <div className="text-[10px] font-black text-rose-400 px-2 py-1 text-right border-b border-gray-800">
                    سرعة الفيديو
                  </div>
                  {speeds.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-right px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center justify-between ${
                        playbackRate === s
                          ? 'bg-rose-600 text-white'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{s === 1 ? 'العادية (1x)' : `${s}x`}</span>
                      {playbackRate === s && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
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

              {/* Volume Slider (hidden on tiny screens, expands on hover) */}
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-16 h-1 bg-gray-700 accent-rose-500 rounded-lg cursor-pointer"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition cursor-pointer"
              title="ملء الشاشة"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
