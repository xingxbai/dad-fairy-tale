import React, { useState } from 'react';
import { RefreshCw, Book } from 'lucide-react';
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
  voiceId?: string;
  topics?: string[];
  promptTemplate?: (title: string) => string;
  mockContent?: (title: string) => string;
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ 
  onStoryGenerated, 
  topics = ANDERSEN_TALES,
  promptTemplate = (title) => `请给我讲一个关于《${title}》的故事，保留原著所有的故事情节，但适合胎教。`,
  mockContent
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [reasoningContent, setReasoningContent] = useState<string>('');

  const generateStory = async (title: string) => {
    setIsGenerating(true);
    setSelectedTitle(title);
    setGeneratedContent('');
    setReasoningContent('');

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
                  setGeneratedContent(currentContent);
              } else if (message.type === 'story_reasoning') {
                  setReasoningContent(prev => prev + message.chunk);
              } else if (message.type === 'story_complete') {
                  const newStory: Story = {
                      id: Date.now().toString(),
                      title: title,
                      content: currentContent,
                      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'
                  };
                  // Give user a moment to read the end before switching? 
                  // Or maybe just switch immediately. 
                  // Let's wait 1s for effect.
                  setTimeout(() => {
                      onStoryGenerated(newStory);
                      setIsGenerating(false);
                      setSelectedTitle(null);
                      // setGeneratedContent('');
                  }, 1000);
                  ws.close();
              } else if (message.type === 'error') {
                  console.error('Story generation error:', message.message);
                  alert(`生成故事失败: ${message.message}`);
                  setIsGenerating(false);
                  setSelectedTitle(null);
                  setGeneratedContent('');
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
          setSelectedTitle(null);
          setGeneratedContent('');
      };

    } catch (error) {
      console.error('Failed to initiate story generation:', error);
      alert('生成故事失败，请检查网络连接');
      setIsGenerating(false);
      setSelectedTitle(null);
      setGeneratedContent('');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-primary-900 mb-2 flex items-center justify-center gap-2">
          <Book className="w-6 h-6" />
          精选内容
        </h3>
        <p className="text-sm text-gray-500">点击标签生成内容，播放时自动合成语音</p>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-12 w-full">
           {reasoningContent && (
              <div className="w-full mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500 font-mono max-h-40 overflow-y-auto">
                <div className="font-bold mb-1 text-gray-400 uppercase text-xs">Thinking Process</div>
                <div className="whitespace-pre-wrap">{reasoningContent}</div>
              </div>
           )}

           {generatedContent ? (
              <div className="text-left w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[200px] whitespace-pre-wrap font-serif leading-relaxed text-gray-800">
                 <h3 className="text-xl font-bold mb-4 text-center text-primary-800">{selectedTitle}</h3>
                 {generatedContent}
                 <span className="inline-block w-2 h-4 ml-1 bg-primary-500 animate-pulse align-middle"/>
              </div>
           ) : (
              <>
                <RefreshCw className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                <p className="text-lg text-primary-700">正在为您创作《{selectedTitle}》...</p>
              </>
           )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {topics.map((title) => (
            <motion.button
              key={title}
              whileHover={{ scale: 1.05, backgroundColor: '#e0f2fe' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => generateStory(title)}
              className="px-4 py-2 bg-white border border-primary-100 rounded-full text-primary-700 shadow-sm hover:shadow-md transition-all text-sm font-medium"
            >
              {title}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
