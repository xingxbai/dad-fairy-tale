import { useState } from 'react';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { StoryGenerator } from '../components/StoryGenerator';
import { AudioPlayer } from '../components/AudioPlayer';
import { StoryDisplay } from '../components/StoryDisplay';
import { generateTTS } from '../services/ttsService';
import type { Story, UserState } from '../types';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BEDTIME_STORIES } from '../data/topics';
import { useVoice } from '../contexts/VoiceContext';
import { VoiceSelector } from '../components/VoiceSelector';

export function BedtimeStoryPage() {
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
    <div className="min-h-screen bg-indigo-50 text-gray-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-gray-600 hover:text-indigo-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <BookOpen className="w-6 h-6 text-indigo-600 mr-2" />
            <h1 className="text-lg font-bold text-indigo-900">晚安故事</h1>
          </div>
          <VoiceSelector color="indigo" />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        {!dadVoiceId ? (
          <VoiceRecorder />
        ) : (
          <div className="space-y-8">
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
                    <div className="hidden">
                        <StoryGenerator 
                            onStoryGenerated={handleStoryGenerated}
                            onGenerationStart={handleGenerationStart}
                            onStreamUpdate={handleStreamUpdate}
                            onReasoningUpdate={handleReasoningUpdate}
                            voiceId={voiceId || undefined}
                            topics={BEDTIME_STORIES}
                            promptTemplate={(title) => `请给我讲一个关于《${title}》的睡前故事，语气要非常温柔、舒缓，适合哄睡。`}
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
                  topics={BEDTIME_STORIES}
                  promptTemplate={(title) => `请给我讲一个关于《${title}》的睡前故事，语气要非常温柔、舒缓，适合哄睡。`}
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
                    onGenerationStart={handleGenerationStart}
                    onStreamUpdate={handleStreamUpdate}
                    onReasoningUpdate={handleReasoningUpdate}
                    voiceId={voiceId || undefined}
                    topics={BEDTIME_STORIES}
                    promptTemplate={(title) => `请给我讲一个关于《${title}》的睡前故事，语气要非常温柔、舒缓，适合哄睡。`}
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
