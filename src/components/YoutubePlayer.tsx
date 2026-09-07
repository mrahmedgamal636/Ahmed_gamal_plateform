import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Maximize, Minimize, RotateCcw, RotateCw, Volume2, VolumeX, X } from 'lucide-react';

export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : url;
}

interface YoutubePlayerProps {
  url: string;
  title: string;
  onClose?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ url, title, onClose }) => {
  const videoId = extractYouTubeId(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Disable native controls to use our custom ones
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1
        },
        events: {
          onReady: (e: any) => {
            setIsLoaded(true);
            setDuration(e.target.getDuration());
          },
          onStateChange: (e: any) => {
            const playing = e.data === 1; // 1 = playing
            setIsPlaying(playing);
            if (playing) {
              setDuration(e.target.getDuration());
              handleUserActivity();
            } else {
              setShowControls(true);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [videoId]);

  // Progress Bar Update Loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
    }
  };

  const seek = (seconds: number) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(time, true);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      playerRef.current?.unMute();
    } else {
      playerRef.current?.mute();
    }
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full bg-black rounded-none md:rounded-2xl overflow-hidden shadow-2xl ${isFullscreen ? 'h-screen' : 'aspect-video border-2 md:border-4 border-rose-600/90'}`}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      {/* Header / Title */}
      <div className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-start transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <h3 className="text-white font-bold text-sm md:text-base truncate pr-8 drop-shadow-md max-w-[85%]">{title}</h3>
        {onClose && !isFullscreen && (
          <button onClick={onClose} className="text-white hover:text-rose-500 bg-black/50 p-2 rounded-xl transition backdrop-blur-md border border-gray-700">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* YouTube Iframe Container */}
      <div className="w-full h-full absolute inset-0 z-0 pointer-events-none">
        <div id={`youtube-player-${videoId}`} className="w-full h-full" />
      </div>

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-rose-500 font-bold text-sm animate-pulse">جاري تحميل المشغل المخصص...</span>
        </div>
      )}

      {/* Main Touch/Click Layer for Play/Pause */}
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay}>
        {/* Big Center Play Button (Visible when paused) */}
        {!isPlaying && isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
            <div className="bg-rose-600/90 p-5 md:p-6 rounded-full shadow-[0_0_30px_rgba(225,29,72,0.6)] transform transition hover:scale-110 border-4 border-white/10 text-white flex items-center justify-center">
              <Play className="w-10 h-10 md:w-12 md:h-12 fill-current ml-2" />
            </div>
          </div>
        )}
      </div>

      {/* Custom Bottom Control Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-3 py-4 md:px-5 md:py-6 flex flex-col gap-3 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()} // Prevent playing/pausing when clicking controls
      >
        {/* Seek Bar */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-white text-[10px] md:text-xs font-mono font-bold bg-black/50 px-2 py-1 rounded-md">{formatTime(currentTime)}</span>
          <div className="relative flex-1 group/slider h-6 flex items-center cursor-pointer">
             <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute z-20 w-full h-full opacity-0 cursor-pointer touch-none"
            />
            <div className="w-full h-1.5 md:h-2 bg-gray-600/80 rounded-full overflow-hidden relative z-10 pointer-events-none">
              <div 
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-100" 
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-gray-400 text-[10px] md:text-xs font-mono font-bold">{formatTime(duration)}</span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between w-full">
          {/* Left Controls */}
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={togglePlay} 
              className="text-white hover:bg-rose-600 transition p-2 md:p-2.5 bg-white/10 rounded-xl"
            >
              {isPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
            </button>
            
            <button 
              onClick={() => seek(-10)} 
              className="text-white hover:text-rose-500 transition flex items-center gap-1 p-2 md:p-2.5 bg-white/5 hover:bg-white/10 rounded-xl"
              title="تأخير 10 ثواني"
            >
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-xs font-bold font-mono">-10</span>
            </button>
            
            <button 
              onClick={() => seek(10)} 
              className="text-white hover:text-rose-500 transition flex items-center gap-1 p-2 md:p-2.5 bg-white/5 hover:bg-white/10 rounded-xl"
              title="تقديم 10 ثواني"
            >
              <RotateCw className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-xs font-bold font-mono">+10</span>
            </button>
            
            <button 
              onClick={toggleMute} 
              className="text-white hover:text-rose-500 transition ml-2 p-2 hidden sm:block"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Right Controls */}
          <button 
            onClick={toggleFullscreen} 
            className="text-white hover:bg-rose-600 transition p-2 md:p-2.5 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-2"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline text-xs font-bold">تصغير</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline text-xs font-bold">ملء الشاشة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
