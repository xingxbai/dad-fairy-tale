import { useState } from 'react';
import { AudioPlayer } from '../components/AudioPlayer';
import { generateTTS } from '../services/ttsService';
import { ArrowLeft, Mic, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { VoiceSelector } from '../components/VoiceSelector';

export function CustomTextPage() {
  const [text, setText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { voiceId } = useVoice();

  const handleGenerateAndPlay = async () => {
    if (!text.trim()) return;
    
    // 如果已经有音频且文本没变，直接播放？这里简化逻辑，每次点击都重新生成，或者如果url存在且文本没变就不生成
    // 为了简单，假设用户点击就是想重新生成或播放。
    // 如果当前正在播放，先暂停
    setIsPlaying(false);
    
    setIsGenerating(true);
    try {
      const url = await generateTTS(text, voiceId);
      if (url) {
        setAudioUrl(url);
        setIsPlaying(true);
      } else {
        alert('生成语音失败');
      }
    } catch (error) {
      console.error(error);
      alert('生成语音出错');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-primary-50 text-gray-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Mic className="w-6 h-6 text-primary-600 mr-2" />
            <h1 className="text-lg font-bold text-primary-900">自定义播放</h1>
          </div>
          <VoiceSelector color="purple" />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            输入你想听的内容
          </label>
          <textarea
            className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none mb-4"
            placeholder="在这里输入故事内容..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <button
            onClick={handleGenerateAndPlay}
            disabled={isGenerating || !text.trim()}
            className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="animate-pulse">生成中...</span>
            ) : (
              <>
                <PlayCircle className="w-5 h-5 mr-2" />
                生成并播放
              </>
            )}
          </button>
        </div>

        {audioUrl && (
          <AudioPlayer
            title="自定义故事"
            audioUrl={audioUrl}
            isPlaying={isPlaying}
            isLoading={isGenerating}
            onPlayPause={handlePlayPause}
            onNext={() => {}}
            onPrev={() => {}}
          />
        )}
      </main>
    </div>
  );
}
