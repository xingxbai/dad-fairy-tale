import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onInput: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onInput, 
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!isSupported) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Safari。');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError('听不清，请再试一次');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setError('启动语音识别失败');
    }
  };

  const stopListening = () => {
    // formatting hack to stop, commonly just waiting for end or refreshing instance
    // but simplified state management here handle it via onend
    setIsListening(false);
  };

  if (!isSupported) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={toggleListening}
        className={`p-3 rounded-full transition-all duration-300 ${
          isListening 
            ? 'bg-red-100 text-red-600 animate-pulse shadow-lg ring-4 ring-red-50' 
            : 'bg-primary-50 text-primary-600 hover:bg-primary-100 hover:shadow-md'
        }`}
        title="语音输入"
      >
        {isListening ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>
      {isListening && (
        <div className="absolute left-full ml-3 whitespace-nowrap px-3 py-1 bg-gray-800 text-white text-xs rounded-lg animate-fade-in z-20">
          正在聆听...
        </div>
      )}
      {error && !isListening && (
        <div className="absolute left-full ml-3 whitespace-nowrap px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg animate-fade-in z-20">
          {error}
        </div>
      )}
    </div>
  );
};