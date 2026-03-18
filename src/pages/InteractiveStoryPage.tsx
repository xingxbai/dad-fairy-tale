import { useState } from 'react';
import { StoryGenerator } from '../components/StoryGenerator';
import { StoryDisplay } from '../components/StoryDisplay';
import { InteractiveOptions } from '../components/InteractiveOptions';
import { generateTTS } from '../services/ttsService';
import type { Story, UserState } from '../types';
import { BookOpen, ArrowLeft, Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';
import { VoiceSelector } from '../components/VoiceSelector';

export function InteractiveStoryPage() {
  const [userState, setUserState] = useState<UserState>({
    voiceId: null,
    currentStory: null,
  });
  const { dadVoiceId, voiceId } = useVoice();

  // Streaming state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingStory, setStreamingStory] = useState<{title: string, content: string, reasoning: string} | null>(null);
  
  // Interaction State
  const [interaction, setInteraction] = useState<{
    data: { question: string, options: any[] },
    submit: (choice: string) => void
  } | null>(null);

  const handleGenerationStart = (title: string) => {
      setIsGenerating(true);
      setStreamingStory({ title: title, content: '', reasoning: '' });
      setInteraction(null);
  };

  const handleStreamUpdate = (content: string) => {
      setStreamingStory(prev => prev ? { ...prev, content } : { title: '', content, reasoning: '' });
  };
  
  const handleReasoningUpdate = (reasoning: string) => {
      setStreamingStory(prev => prev ? { ...prev, reasoning } : null);
  };

  const handleInteraction = (data: any, submit: (c: string) => void) => {
    setInteraction({ data, submit });
    // Optional: Auto-play TTS for the question if needed
    // generateTTS(data.question, voiceId).then(url => { ... });
  };

  const onOptionSelected = (option: any) => {
      if (interaction) {
          interaction.submit(option.value); 
          setInteraction(null); 
      }
  };

  const handleStoryGenerated = (story: Story) => {
    setUserState(prev => ({ ...prev, currentStory: story }));
    setIsGenerating(false);
    setStreamingStory(null);
    setInteraction(null);
  };

  return (
    <div className="min-h-screen bg-primary-50 text-gray-800 font-sans pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Gamepad2 className="w-6 h-6 text-primary-600 mr-2" />
            <h1 className="text-lg font-bold text-primary-900">互动故事</h1>
          </div>
          <VoiceSelector />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        <div className="space-y-8">
            {/* 1. Generating Mode (Streaming & Interaction) */}
            {isGenerating && streamingStory && (
              <div className="space-y-6 animate-fade-in">
                <StoryDisplay 
                  title={streamingStory.title} 
                  content={streamingStory.content} 
                  reasoning={streamingStory.reasoning}
                  isStreaming={true}
                />
                
                {interaction && (
                  <InteractiveOptions 
                    question={interaction.data.question}
                    options={interaction.data.options}
                    onSelect={onOptionSelected}
                  />
                )}
              </div>
            )}

            {/* 2. Finished Mode (Review) */}
            {!isGenerating && userState.currentStory && (
              <div className="space-y-6 animate-fade-in">
                 <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">故事结束啦</h2>
                    <p className="text-gray-600">宝宝真棒，完成了一次精彩的冒险！</p>
                 </div>

                <StoryDisplay 
                  title={userState.currentStory.title}
                  content={userState.currentStory.content} 
                />
                
                <button 
                  onClick={() => {
                      setUserState(prev => ({ ...prev, currentStory: null }));
                      setStreamingStory(null);
                  }}
                  className="w-full py-3 text-primary-600 font-medium hover:bg-primary-50 rounded-xl transition-colors border border-primary-100"
                >
                  再玩一次
                </button>
              </div>
            )}

            {/* 3. Story Generator (Topic Selection) */}
            <div className={isGenerating || userState.currentStory ? 'hidden' : 'block'}>
              <StoryGenerator 
                mode="interactive"
                onStoryGenerated={handleStoryGenerated}
                onStreamUpdate={handleStreamUpdate}
                onReasoningUpdate={handleReasoningUpdate}
                onGenerationStart={handleGenerationStart}
                onInteraction={handleInteraction}
              />
            </div>
        </div>
      </main>
    </div>
  );
}
