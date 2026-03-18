import React, { useState } from 'react';
import { Book } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Story } from '../types';

const ANDERSEN_TALES = [
  "海的女儿", "丑小鸭", "皇帝的新装", "卖火柴的小女孩", "拇指姑娘",
  "豌豆公主", "冰雪女王", "坚定的锡兵", "夜莺", "红舞鞋",
  "野天鹅", "笨汉汉斯", "打火匣", "飞箱", "小克劳斯和大克劳斯",
  "老头子做事总不会错", "牧羊女和扫烟囱的人", "影子", "一滴水", "母亲的故事",
  "园丁和他的主人", "跳蚤和教授", "老路灯", "邻居们", "香肠栓熬的汤",
  "单身汉的睡帽", "某某", "依卜和小克里斯汀", "梦神", "枞树"
];

interface InteractionData {
  question: string;
  options: Array<{ label: string; value: string; emoji: string; }>;
}

interface StoryGeneratorProps {
  onStoryGenerated: (story: Story) => void;
  onStreamUpdate?: (content: string) => void;
  onReasoningUpdate?: (reasoning: string) => void;
  onGenerationStart?: (title: string) => void;
  onInteraction?: (data: InteractionData, submitChoice: (choice: string) => void) => void;
  voiceId?: string;
  topics?: string[];
  promptTemplate?: (title: string) => string;
  mockContent?: (title: string) => string;
  className?: string;
  mode?: 'classic' | 'interactive';
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ 
  onStoryGenerated, 
  onStreamUpdate,
  onReasoningUpdate,
  onGenerationStart,
  onInteraction,
  topics = ANDERSEN_TALES,
  promptTemplate = (title) => `请给我讲一个关于《${title}》的故事，保留原著所有的故事情节，但适合胎教。`,
  mockContent,
  className = '',
  mode = 'classic'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  // Keep WS reference to send messages later
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);

  const generateStory = async (title: string) => {
    setIsGenerating(true);
    onGenerationStart?.(title);
    let isComplete = false;

    if (mockContent) {
      // ... mock logic ...
      return;
    }

    try {
      // WebSocket implementation
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = `${wsProtocol}//${window.location.host}`;
      if (import.meta.env.DEV) {
          wsUrl = `ws://${window.location.hostname}:3000`;
      }

      const ws = new WebSocket(wsUrl);
      setWsRef(ws);
      
      let currentContent = '';
      let currentReasoning = '';
      let buffer = ''; // Buffer for detecting tags

      ws.onopen = () => {
          try {
            const messageType = mode === 'interactive' ? 'generate_interactive_story' : 'generate_story';
            ws.send(JSON.stringify({
                type: messageType, 
                title: title,
                prompt: promptTemplate(title)
            }));
          } catch (e) {
            console.error('Send failed:', e);
          }
      };

      ws.onmessage = (event) => {
          try {
              const message = JSON.parse(event.data);
              if (message.type === 'welcome') {
                  return;
              }
              if (message.type === 'story_chunk') {
                  const chunk = message.chunk;
                  buffer += chunk;

                  // Check for Interaction Tags
                  // Case 1: Buffer contains complete tag
                  const interactionStart = buffer.indexOf('[INTERACTION]');
                  const interactionEnd = buffer.indexOf('[/INTERACTION]');

                  if (interactionStart !== -1 && interactionEnd !== -1) {
                      // We have a complete interaction block
                      const beforeTag = buffer.substring(0, interactionStart);
                      const interactionJson = buffer.substring(interactionStart + 13, interactionEnd);
                      
                      // Process the text before the tag
                      // Filter out [STORY] tags if present in the text
                      const cleanContent = (currentContent + beforeTag).replace(/\[STORY\]|\[\/STORY\]/g, '');
                      currentContent = cleanContent;
                      onStreamUpdate?.(currentContent);

                      // Process Interaction
                      try {
                          const data = JSON.parse(interactionJson);
                          onInteraction?.(data, (choiceVal) => {
                              ws.send(JSON.stringify({
                                  type: 'continue_story',
                                  choice: choiceVal
                              }));
                          });
                      } catch (e) {
                          console.error('Failed to parse interaction JSON', e);
                      }
                      
                      // Clear buffer after tag (or keep resting text? Usually Interaction is at end)
                      buffer = buffer.substring(interactionEnd + 14); 

                  } else if (interactionStart !== -1) {
                      // We have a start tag, but not end tag yet. 
                      // Render everything BEFORE the start tag
                      const beforeTag = buffer.substring(0, interactionStart);
                      if (beforeTag) {
                           const cleanContent = (currentContent + beforeTag).replace(/\[STORY\]|\[\/STORY\]/g, '');
                           currentContent = cleanContent; 
                           onStreamUpdate?.(currentContent);
                           buffer = buffer.substring(interactionStart); // Keep start tag in buffer
                      }
                  } else {
                      // No start tag, safe to append to content? 
                      // Wait, we can't be sure unless we know we are not IN a tag.
                      // Simple approach: Render everything if buffer length > 200 (tag shouldn't be that long without start)
                      // Or just render immediately and hide tag via CSS later? No, better parsing.
                      // For simplicity: If buffer doesn't contain '[', render it.
                      if (!buffer.includes('[')) {
                           currentContent += buffer;
                           onStreamUpdate?.(currentContent.replace(/\[STORY\]|\[\/STORY\]/g, ''));
                           buffer = '';
                      }
                  }

              } else if (message.type === 'story_reasoning') {
                  currentReasoning += message.chunk;
                  onReasoningUpdate?.(currentReasoning);
              } else if (message.type === 'story_complete') {
                  // ... existing complete logic ...
                  // Ensure buffer is flushed
                  if (buffer) {
                      currentContent += buffer.replace(/\[STORY\]|\[\/STORY\]/g, '');
                      onStreamUpdate?.(currentContent);
                  }
                  
                  isComplete = true;
                  const newStory: Story = {
                      id: Date.now().toString(),
                      title: title,
                      content: currentContent,
                      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'
                  };
                  
                  // Don't close WS here if we want to allow more interactions? 
                  // Actually 'story_complete' usually comes when done. 
                  // But our server sends turn_complete. 
                  // Let's assume 'story_complete' means REALLY done.
                  
                  setTimeout(() => {
                      onStoryGenerated(newStory);
                      setIsGenerating(false);
                  }, 500); 
                  ws.close();
              } else if (message.type === 'story_turn_complete') {
                   // Turn is done, analyze buffer for any missed interactions
                   if (buffer) {
                       const interactionStart = buffer.indexOf('[INTERACTION]');
                       if (interactionStart !== -1) {
                           // Try to parse interaction from whatever is left
                           // Remove start tag, and remove end tag if present
                           let jsonStr = buffer.substring(interactionStart + 13);
                           const endTagIndex = jsonStr.lastIndexOf('[/INTERACTION]');
                           if (endTagIndex !== -1) {
                               jsonStr = jsonStr.substring(0, endTagIndex);
                           }
                           
                           // Clean up markdown code blocks if any
                           jsonStr = jsonStr.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
                           
                           try {
                               const data = JSON.parse(jsonStr);
                               // Flush any text BEFORE the interaction tag first
                               const beforeTag = buffer.substring(0, interactionStart);
                               if (beforeTag.trim()) {
                                   currentContent += beforeTag.replace(/\[STORY\]|\[\/STORY\]/g, '');
                                   onStreamUpdate?.(currentContent);
                               }

                               onInteraction?.(data, (choiceVal) => {
                                  ws.send(JSON.stringify({
                                      type: 'continue_story',
                                      choice: choiceVal
                                  }));
                               });
                           } catch (e) {
                               console.error('Failed to parse final interaction block:', e);
                               // Fallback: Dump everything as text so user sees SOMETHING
                               const cleanText = buffer.replace(/\[STORY\]|\[\/STORY\]/g, '')
                               // Maybe hide the raw interaction block from user? 
                               // No, better to show it if debugging, but for prod maybe hide
                               currentContent += cleanText; 
                               onStreamUpdate?.(currentContent);
                           }
                       } else {
                           // Just normal text remaining
                           if (buffer.trim()) {
                               currentContent += buffer.replace(/\[STORY\]|\[\/STORY\]/g, '');
                               onStreamUpdate?.(currentContent);
                           }
                       }
                       buffer = '';
                   }
              }
              else if (message.type === 'error') {
                  console.error('Story generation error:', message.message);
                  alert(`生成故事失败: ${message.message}`);
                  isComplete = true;
                  setIsGenerating(false);
                  ws.close();
              }
          } catch (e) {
              console.error('Error parsing WebSocket message:', e);
              setIsGenerating(false);
          }
      };

      ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!isComplete) {
             alert('连接服务器失败，请重试');
             setIsGenerating(false);
          }
      };

      ws.onclose = () => {
          if (!isComplete) {
              console.log('WebSocket closed unexpectedly');
              setIsGenerating(false);
          }
      };

    } catch (error) {
      console.error('Failed to initiate story generation:', error);
      alert('生成故事失败，请检查网络连接');
      setIsGenerating(false);
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto p-6 ${className}`}>
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-primary-900 mb-2 flex items-center justify-center gap-2">
          <Book className="w-6 h-6" />
          精选内容
        </h3>
        <p className="text-sm text-gray-500">点击标签生成内容，播放时自动合成语音</p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mb-6">
          {topics.map((title) => (
            <motion.button
              key={title}
              whileHover={{ scale: 1.05, backgroundColor: '#e0f2fe' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => generateStory(title)}
              disabled={isGenerating}
              className={`px-4 py-2 bg-white border border-primary-100 rounded-full text-primary-700 shadow-sm hover:shadow-md transition-all text-sm font-medium ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {title}
            </motion.button>
          ))}
      </div>
    </div>
  );
};
