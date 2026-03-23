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

export function EnglishStoryPage() {
  const [userState, setUserState] = useState<UserState>({
    voiceId: null,
    currentStory: null,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const { voiceId } = useVoice();

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
    console.log("EnglishStoryPage handlePlayPause", { isPlaying, audioUrl: userState.currentStory?.audioUrl, voiceId });
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (userState.currentStory?.audioUrl) {
      setIsPlaying(true);
      return;
    }

    if (userState.currentStory && (voiceId || true)) {
      setIsGeneratingAudio(true);
      console.log("Generating English TTS...");
      const audioUrl = await generateTTS(userState.currentStory.content, voiceId || 'zh-CN-XiaoxiaoNeural');
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
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        { false ? (
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
                            topics={ENGLISH_STORIES}
                            promptTemplate={(title) => `Roleplay as a native English teacher. Tell a bedtime story about "${title}" for 0-5 year old kids. IMPORTANT: STRICTLY ONLY ENGLISH. NO CHINESE characters. Use simple vocabulary and warm tone.`}
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
                  topics={ENGLISH_STORIES}
                  promptTemplate={(title) => `Roleplay as a native English teacher. Tell a bedtime story about "${title}" for 3-5 year old kids. IMPORTANT: STRICTLY ONLY ENGLISH. NO CHINESE characters. Use simple vocabulary and warm tone.`}
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
                    voiceId={userState.voiceId || undefined}
                    topics={ENGLISH_STORIES}
                    promptTemplate={(title) => `Roleplay as a native English teacher. Tell a bedtime story about "${title}" for 3-5 year old kids. IMPORTANT: STRICTLY ONLY ENGLISH. NO CHINESE characters. Use simple vocabulary and warm tone.`}
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
