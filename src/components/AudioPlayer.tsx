import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
  title: string;
  coverImage?: string;
  audioUrl?: string;
  isPlaying: boolean;
  isLoading?: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title,
  coverImage,
  audioUrl,
  isPlaying,
  isLoading = false,
  onPlayPause,
  onNext,
  onPrev
}) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    onNext();
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}
      {/* Cover Image */}
      <div className="relative w-64 h-64 mb-8 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
        <motion.img
          src={coverImage || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80"}
          alt="Cover"
          className="w-full h-full object-cover"
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 rounded-full border-[12px] border-black/10 pointer-events-none"></div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-primary-900 mb-2">{title}</h2>
      <p className="text-primary-600 mb-8">爸爸讲的故事</p>

      {/* Progress Bar */}
      <div className="w-full px-8 mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="relative h-1 bg-gray-200 rounded-full cursor-pointer group">
          <div 
            className="absolute h-full bg-primary-500 rounded-full"
            style={{ width: `${(progress / duration) * 100}%` }}
          ></div>
          <div 
            className="absolute h-3 w-3 bg-white border-2 border-primary-500 rounded-full top-1/2 -translate-y-1/2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${(progress / duration) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between w-full px-12 mb-8">
        <button className="text-gray-400 hover:text-primary-500 transition-colors">
          <Shuffle className="w-5 h-5" />
        </button>
        <button onClick={onPrev} className="text-primary-800 hover:text-primary-600 transition-colors">
          <SkipBack className="w-8 h-8" />
        </button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onPlayPause}
          disabled={isLoading}
          className={`w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors text-white ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <RefreshCw className="w-8 h-8 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </motion.button>
        <button onClick={onNext} className="text-primary-800 hover:text-primary-600 transition-colors">
          <SkipForward className="w-8 h-8" />
        </button>
        <button className="text-gray-400 hover:text-primary-500 transition-colors">
          <Repeat className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
