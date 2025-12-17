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
}

export const StoryGenerator: React.FC<StoryGeneratorProps> = ({ onStoryGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  const generateStory = async (title: string) => {
    setIsGenerating(true);
    setSelectedTitle(title);

    try {
      const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      // 默认使用火山引擎豆包接口 (兼容 OpenAI 格式)
      const BASE_URL = (import.meta.env.VITE_OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
      const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'ep-20240604-xxxxx'; 
      
      if (!API_KEY) {
        console.warn('未检测到 VITE_OPENAI_API_KEY，使用模拟数据生成');
        setTimeout(() => {
          const mockStory: Story = {
            id: Date.now().toString(),
            title: title,
            content: `（提示：请配置 OpenAI API Key 以使用真实 AI 生成功能）\n\n这是关于《${title}》的模拟故事内容。很久很久以前...`,
            coverImage: 'https://images.unsplash.com/photo-1550686041-366ad85a1355?w=800&q=80'
          };
          onStoryGenerated(mockStory);
          setIsGenerating(false);
          setSelectedTitle(null);
        }, 1500);
        return;
      }

      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content:
                '请直接返回JSON格式，包含 title (标题) 和 content (正文) 两个字段，不要包含其他Markdown标记。',
            },
            {
              role: 'user',
              content: `请给我讲一个关于《${title}》的故事，保留原著所有的故事情节，但适合胎教。`,
            },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const contentStr = data.choices[0].message.content;
      let storyData;
      try {
        // 尝试解析 JSON，如果返回的不是纯 JSON，可能需要做一些清理
        const jsonStr = contentStr.replace(/```json\n?|\n?```/g, '').trim();
        storyData = JSON.parse(jsonStr);
      } catch (e) {
        console.warn("Failed to parse JSON from LLM, using raw content", e);
        storyData = {
          title: title,
          content: contentStr
        };
      }

      const newStory: Story = {
        id: Date.now().toString(),
        title: storyData.title || title,
        content: storyData.content,
        coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'
      };

      onStoryGenerated(newStory);

    } catch (error) {
      console.error('Failed to generate story:', error);
      alert('生成故事失败，请检查 API Key 或网络连接');
    } finally {
      setIsGenerating(false);
      setSelectedTitle(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-primary-900 mb-2 flex items-center justify-center gap-2">
          <Book className="w-6 h-6" />
          安徒生童话精选 TOP 50
        </h3>
        <p className="text-sm text-gray-500">点击标签生成故事，播放时自动合成语音</p>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <p className="text-lg text-primary-700">正在为您创作《{selectedTitle}》...</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 justify-center">
          {ANDERSEN_TALES.map((title, index) => (
            <motion.button
              key={title}
              whileHover={{ scale: 1.05, backgroundColor: '#e0f2fe' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => generateStory(title)}
              className="px-4 py-2 bg-white border border-primary-100 rounded-full text-primary-700 text-sm shadow-sm hover:shadow-md transition-all"
            >
              <span className="mr-1 text-primary-300 font-mono text-xs">{index + 1}.</span>
              {title}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
