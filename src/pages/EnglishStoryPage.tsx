import { useState } from 'react';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { StoryGenerator } from '../components/StoryGenerator';
import { AudioPlayer } from '../components/AudioPlayer';
import { StoryDisplay } from '../components/StoryDisplay';
import { generateTTS } from '../services/ttsService';
import type { Story, UserState } from '../types';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ENGLISH_STORIES } from '../data/topics';
import { useVoice } from '../contexts/VoiceContext';
import { VoiceSelector } from '../components/VoiceSelector';

export function EnglishStoryPage() {
  const [userState, setUserState] = useState<UserState>({
    voiceId: null,
    currentStory: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const { voiceId } = useVoice();

  const handleStoryGenerated = (story: Story) => {
    setUserState(prev => ({ ...prev, currentStory: story }));
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (userState.currentStory?.audioUrl) {
      setIsPlaying(true);
      return;
    }

    if (userState.currentStory && voiceId) {
      setIsGeneratingAudio(true);
      const audioUrl = await generateTTS(userState.currentStory.content, voiceId);
      setIsGeneratingAudio(false);

      if (audioUrl) {
        setUserState(prev => ({ ...prev, currentStory: { ...prev.currentStory!, audioUrl } }));
        setIsPlaying(true);
      } else {
        alert("语音生成失败，请重试");
      }
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 text-gray-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-gray-600 hover:text-blue-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
            <h1 className="text-lg font-bold text-blue-900">英文启蒙</h1>
          </div>
          
          <div className="flex items-center">
            <VoiceSelector color="blue" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        { false ? (
          <VoiceRecorder />
        ) : (
          <div className="space-y-8">
            {!userState.currentStory ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <StoryGenerator 
                  onStoryGenerated={handleStoryGenerated} 
                  voiceId={voiceId || undefined}
                  topics={ENGLISH_STORIES}
                  promptTemplate={(title) => `Please tell me a simple story about "${title}" in English, suitable for prenatal education. Keep it short and sweet.`}
                />
              </div>
            ) : (
              <>
                <AudioPlayer 
                  title={userState.currentStory.title}
                  coverImage={userState.currentStory.coverImage}
                  audioUrl={userState.currentStory.audioUrl}
                  isPlaying={isPlaying}
                  isLoading={isGeneratingAudio}
                  onPlayPause={handlePlayPause}
                  onNext={() => {}}
                  onPrev={() => {}}
                />
                
                <StoryDisplay content={userState.currentStory.content} />
                
                <div className="flex justify-center pt-4">
                  <StoryGenerator 
                    onStoryGenerated={handleStoryGenerated} 
                    voiceId={userState.voiceId || undefined}
                    topics={ENGLISH_STORIES}
                    promptTemplate={(title) => `Please tell me a simple story about "${title}" in English, suitable for prenatal education. Keep it short and sweet.`}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
