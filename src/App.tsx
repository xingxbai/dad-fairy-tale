import { useState } from 'react';
import { VoiceRecorder } from './components/VoiceRecorder';
import { StoryGenerator } from './components/StoryGenerator';
import { AudioPlayer } from './components/AudioPlayer';
import { StoryDisplay } from './components/StoryDisplay';
import { generateTTS } from './services/ttsService';
import type { Story, UserState } from './types';
import { BookOpen } from 'lucide-react';

function App() {
  const [userState, setUserState] = useState<UserState>({
    voiceId: 'S_pkpEVvSN1',
    currentStory: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const handleVoiceRecorded = (voiceId: string) => {
    localStorage.setItem('dad_voice_id', voiceId);
    setUserState(prev => ({ ...prev, voiceId }));
  };

  const handleStoryGenerated = (story: Story) => {
    setUserState(prev => ({ ...prev, currentStory: story }));
    setIsPlaying(false); // Don't auto play, wait for user action
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

    // Generate Audio if missing
    if (userState.currentStory && userState.voiceId) {
      setIsGeneratingAudio(true);
      const audioUrl = await generateTTS(userState.currentStory.content, userState.voiceId);
      setIsGeneratingAudio(false);

      if (audioUrl) {
        setUserState(prev => ({
          ...prev,
          currentStory: { ...prev.currentStory!, audioUrl }
        }));
        setIsPlaying(true);
      } else {
        alert("语音生成失败，请重试");
      }
    }
  };

  console.log("User State:", userState);
  return (
    <div className="min-h-screen bg-primary-50 text-gray-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary-600 mr-2" />
          <h1 className="text-lg font-bold text-primary-900">爸爸的童话时间</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        {!userState.voiceId ? (
          <VoiceRecorder onVoiceRecorded={handleVoiceRecorded} />
        ) : (
          <div className="space-y-8">
            {!userState.currentStory ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                {/* <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-primary-900 mb-2">欢迎回来，爸爸</h2>
                  <p className="text-gray-600">准备好给宝宝讲故事了吗？</p>
                </div> */}
                <StoryGenerator 
                  onStoryGenerated={handleStoryGenerated} 
                  voiceId={userState.voiceId || undefined}
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

export default App;
