import { useState } from 'react';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { StoryGenerator } from '../components/StoryGenerator';
import { AudioPlayer } from '../components/AudioPlayer';
import { StoryDisplay } from '../components/StoryDisplay';
import { InteractiveOptions } from '../components/InteractiveOptions';
import { generateTTS } from '../services/ttsService';
import type { Story, UserState } from '../types';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVoice } from '../contexts/VoiceContext';

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
  
  // Interaction State
  const [interaction, setInteraction] = useState<{
    data: { question: string, options: any[] },
    submit: (choice: string) => void
  } | null>(null);

  const handleGenerationStart = (title: string) => {
      setIsGenerating(true);
      setStreamingStory({ title, content: '', reasoning: '' });
      setInteraction(null);
  };

  const handleStreamUpdate = (content: string) => {
      setStreamingStory(prev => prev ? { ...prev, content } : null);
  };
  
  const handleReasoningUpdate = (reasoning: string) => {
      setStreamingStory(prev => prev ? { ...prev, reasoning } : null);
  };

  const handleInteraction = (data: any, submit: (c: string) => void) => {
    setInteraction({ data, submit });
  };

  const onOptionSelected = (option: any) => {
      if (interaction) {
          interaction.submit(option.value); // Send the value (description)
          setInteraction(null); // Clear interaction UI
      }
  };

  const handleStoryGenerated = (story: Story) => {
    setUserState(prev => ({ ...prev, currentStory: story }));
    setIsGenerating(false);
    setStreamingStory(null);
    setInteraction(null);
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    console.log("handlePlayPause called", { isPlaying, audioUrl: userState.currentStory?.audioUrl });
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (userState.currentStory?.audioUrl) {
      setIsPlaying(true);
      return;
    }

    if (userState.currentStory && (voiceId || true)) { // Fallback to true if voiceId is missing
      console.log("Starting TTS generation...");
      setIsGeneratingAudio(true);
      const audioUrl = await generateTTS(userState.currentStory.content, voiceId || 'zh-CN-XiaoxiaoNeural');
      setIsGeneratingAudio(false);
      console.log("TTS generation finished", { audioUrl });

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
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 max-w-md">
        {!dadVoiceId ? (
          <VoiceRecorder />
        ) : (
          <div className="space-y-8">
            {/* 1. Generating Mode (Streaming & Interaction) */}
            {isGenerating && (
              <div className="space-y-6 animate-fade-in">
                <StoryDisplay 
                  title={streamingStory?.title} 
                  content={streamingStory?.content || ''} 
                  reasoning={streamingStory?.reasoning}
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

            {/* 2. Finished Mode (Audio Player + Text) */}
            {!isGenerating && userState.currentStory && (
              <div className="space-y-6 animate-fade-in">
                <AudioPlayer 
                  title={userState.currentStory.title}
                  audioUrl={userState.currentStory.audioUrl}
                  isPlaying={isPlaying}
                  isLoading={isGeneratingAudio}
                  onPlayPause={handlePlayPause}
                  onNext={() => {}} 
                  onPrev={() => {}}
                />
                
                <StoryDisplay 
                  content={userState.currentStory.content} 
                />
                
                <button 
                  onClick={() => setUserState(prev => ({ ...prev, currentStory: null }))}
                  className="w-full py-3 text-primary-600 font-medium hover:bg-primary-50 rounded-xl transition-colors border border-primary-100"
                >
                  讲个新故事
                </button>
              </div>
            )}

            {/* 3. Story Generator (Topic Selection) 
                ALWAYS Rendered but hidden when generating/playing to maintain WebSocket state 
            */}
            <div className={isGenerating || (userState.currentStory !== null) ? 'hidden' : 'block'}>
              <StoryGenerator 
                mode="classic"
                onStoryGenerated={handleStoryGenerated}
                onStreamUpdate={handleStreamUpdate}
                onReasoningUpdate={handleReasoningUpdate}
                onGenerationStart={handleGenerationStart}
                onInteraction={handleInteraction}
              />
            </div>
            
            {/* Special Case: If generating, we need StoryGenerator mounted but hidden. 
                The above condition `isGenerating ? 'hidden'` covers it. 
                Wait, if isGenerating is TRUE, className is 'hidden'. Perfect.
            */}

          </div>
        )}
      </main>
    </div>
  );
}
