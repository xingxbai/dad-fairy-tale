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

interface StoryGeneratorProps {
  onStoryGenerated: (story: Story) => void;
  onStreamUpdate?: (content: string) => void;
  onReasoningUpdate?: (reasoning: string) => void;
  onGenerationStart?: (title: string) => void;
  voiceId?: string;
  topics?: string[];
  promptTemplate?: (title: string) => string;
  mockContent?: (title: string) => string;
  className?: string;
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ 
  onStoryGenerated, 
  onStreamUpdate,
  onReasoningUpdate,
  onGenerationStart,
  topics = ANDERSEN_TALES,
  promptTemplate = (title) => `请给我讲一个关于《${title}》的故事，保留原著所有的故事情节，但适合胎教。`,
  mockContent,
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStory = async (title: string) => {
    setIsGenerating(true);
    onGenerationStart?.(title);

    if (mockContent) {
      // ... mock logic ...
      return;
    }

    try {
      // WebSocket implementation
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = `${wsProtocol}//${window.location.host}`;
      if (import.meta.env.DEV) {
          wsUrl = 'ws://localhost:3000';
      }

      const ws = new WebSocket(wsUrl);
      let currentContent = '';
      let currentReasoning = '';

      ws.onopen = () => {
          ws.send(JSON.stringify({
              type: 'generate_story',
              title: title,
              prompt: promptTemplate(title)
          }));
      };

      ws.onmessage = (event) => {
          try {
              const message = JSON.parse(event.data);
              if (message.type === 'story_chunk') {
                  currentContent += message.chunk;
                  onStreamUpdate?.(currentContent);
              } else if (message.type === 'story_reasoning') {
                  currentReasoning += message.chunk;
                  onReasoningUpdate?.(currentReasoning);
              } else if (message.type === 'story_complete') {
                  const newStory: Story = {
                      id: Date.now().toString(),
                      title: title,
                      content: currentContent,
                      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'
                  };
                  
                  setTimeout(() => {
                      onStoryGenerated(newStory);
                      setIsGenerating(false);
                  }, 500); // Short delay to ensure last chunk is rendered
                  ws.close();
              } else if (message.type === 'error') {
                  console.error('Story generation error:', message.message);
                  alert(`生成故事失败: ${message.message}`);
                  setIsGenerating(false);
                  ws.close();
              }
          } catch (e) {
              console.error('Error parsing WebSocket message:', e);
          }
      };

      ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          alert('连接服务器失败，请检查网络或服务器状态');
          setIsGenerating(false);
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
