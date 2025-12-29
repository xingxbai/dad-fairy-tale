import { useState } from 'react';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { StoryGenerator } from '../components/StoryGenerator';
import { AudioPlayer } from '../components/AudioPlayer';
import { StoryDisplay } from '../components/StoryDisplay';
import { generateTTS } from '../services/ttsService';
import type { Story, UserState } from '../types';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { VoiceSelector } from '../components/VoiceSelector';

export function FairyTalePage() {
  const [userState, setUserState] = useState<UserState>({
    voiceId: null,
    currentStory: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const { dadVoiceId, voiceId } = useVoice();

  // Streaming state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingStory, setStreamingStory] = useState<{title: string, content: string, reasoning: string} | null>(null);

  const handleGenerationStart = (title: string) => {
      setIsGenerating(true);
      setStreamingStory({ title, content: '', reasoning: '' });
      // We don't clear currentStory yet to avoid UI flash if we were replacing, 
      // but since we switch view based on isGenerating, it's fine.
  };

  const handleStreamUpdate = (content: string) => {
      setStreamingStory(prev => prev ? { ...prev, content } : null);
  };
  
  const handleReasoningUpdate = (reasoning: string) => {
      setStreamingStory(prev => prev ? { ...prev, reasoning } : null);
  };

  const handleStoryGenerated = (story: Story) => {
    setUserState(prev => ({ ...prev, currentStory: story }));
    setIsGenerating(false);
    setStreamingStory(null);
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
    <div className="min-h-screen bg-primary-50 text-gray-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <BookOpen className="w-6 h-6 text-primary-600 mr-2" />
            <h1 className="text-lg font-bold text-primary-900">安徒生童话</h1>
          </div>
          <VoiceSelector color="purple" />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        {!dadVoiceId ? (
          <VoiceRecorder />
        ) : (
          <div className="space-y-8">
            {/* 
               Logic:
               1. If generating, show Display (streaming) + Hidden Generator (to keep connection).
               2. If NOT generating and NO story, show Generator (centered).
               3. If NOT generating and HAS story, show Audio + Display (static) + Generator (bottom).
            */}

            {isGenerating ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    {streamingStory && (
                        <StoryDisplay 
                            title={streamingStory.title}
                            content={streamingStory.content}
                            reasoning={streamingStory.reasoning}
                            isStreaming={true}
                        />
                    )}
                    {/* Keep mounted but hidden to maintain WebSocket connection */}
                    <div className="hidden">
                        <StoryGenerator 
                            onStoryGenerated={handleStoryGenerated}
                            onGenerationStart={handleGenerationStart}
                            onStreamUpdate={handleStreamUpdate}
                            onReasoningUpdate={handleReasoningUpdate}
                            voiceId={voiceId || undefined}
                        />
                    </div>
                </div>
            ) : !userState.currentStory ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <StoryGenerator 
                        onStoryGenerated={handleStoryGenerated}
                        onGenerationStart={handleGenerationStart}
                        onStreamUpdate={handleStreamUpdate}
                        onReasoningUpdate={handleReasoningUpdate}
                        voiceId={voiceId || undefined}
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
                    
                    <StoryDisplay 
                        content={userState.currentStory.content} 
                        // No reasoning stored in Story type currently, but that's fine for final display
                    />
                    
                    <div className="flex justify-center pt-4">
                        <StoryGenerator 
                            onStoryGenerated={handleStoryGenerated}
                            onGenerationStart={handleGenerationStart}
                            onStreamUpdate={handleStreamUpdate}
                            onReasoningUpdate={handleReasoningUpdate}
                            voiceId={voiceId || undefined}
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
