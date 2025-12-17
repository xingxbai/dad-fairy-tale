import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryDisplayProps {
  content: string;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-primary-800 font-medium mb-2"
      >
        <span>童话原文</span>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line pt-2">
              {content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
