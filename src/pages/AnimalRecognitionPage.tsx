import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ANIMALS } from '../data/animals';

export function AnimalRecognitionPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResources, setAiResources] = useState<Record<string, { image: string, sound: string }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentAnimal = ANIMALS[currentIndex];
  // Determine final image and sound: Prefer AI, then fallback to mock data
  const finalImage = aiResources[currentAnimal.id]?.image || currentAnimal.image;
  const finalSound = aiResources[currentAnimal.id]?.sound || currentAnimal.sound;

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % ANIMALS.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + ANIMALS.length) % ANIMALS.length);
  };

  const generateWithAI = async () => {
    setIsLoadingAI(true);
    try {
      const response = await fetch('/api/animal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: currentAnimal.name, 
          englishName: currentAnimal.englishName 
        }),
      });
      const data = await response.json();
      if (data.image && data.sound) {
        setAiResources(prev => ({
          ...prev,
          [currentAnimal.id]: { image: data.image, sound: data.sound }
        }));
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("AI 生成资源时遇到了点小麻烦");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const playSound = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.load(); // Reload the asset before playing
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => {
            console.error("Audio play failed detailed:", e);
            if (e.name === 'NotSupportedError') {
              alert("音频加载失败，请再次点击刷新 AI 资源后再试");
            }
          });
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen bg-green-50 text-gray-800 font-sans pb-20 overflow-hidden">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-gray-600 hover:text-green-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-bold text-green-900">看图片认动物 (AI)</h1>
          </div>
          {/* AI Generator Button */}
          <button 
            onClick={generateWithAI}
            disabled={isLoadingAI}
            className={`p-2 rounded-full bg-green-100 text-green-600 active:scale-90 transition-all ${isLoadingAI ? 'animate-spin' : ''}`}
            title="使用 AI 重新生成当前动物图片和声音"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md relative flex flex-col items-center">
        <div className="relative w-full aspect-[4/5] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute w-full h-full flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-white"
            >
              <div className="relative h-2/3 w-full">
                {isLoadingAI ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <RefreshCw className="w-12 h-12 text-green-500 animate-spin" />
                  </div>
                ) : (
                  <img 
                    src={finalImage} 
                    alt={currentAnimal.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-4xl font-black text-green-700 mb-1">{currentAnimal.name}</h2>
                  <p className="text-xl font-bold text-green-400 uppercase tracking-widest">{currentAnimal.englishName}</p>
                </div>
                <p className="text-gray-600 text-center px-4 font-medium italic">
                  "{currentAnimal.description}"
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="w-full flex justify-between items-center mt-8 px-4">
          <button 
            onClick={handlePrev}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md text-green-600 active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={playSound}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg text-white active:scale-90 transition-transform relative group"
          >
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20 hidden group-active:block"></div>
            <Volume2 className="w-10 h-10" />
          </button>

          <button 
            onClick={handleNext}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md text-green-600 active:scale-95 transition-transform"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Hidden Audio Element */}
        <audio 
          ref={audioRef}
          src={finalSound}
          key={finalSound}
          onEnded={() => setIsPlaying(false)}
        />

        <div className="mt-8 text-green-800/40 text-sm font-medium text-center">
          点击右上角刷新图标，由 AI 实时生成
          <br />当前动物的精美图片和生动解说
        </div>
      </main>
    </div>
  );
}
