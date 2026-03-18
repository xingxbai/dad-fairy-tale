import React from 'react';
import { motion } from 'framer-motion';

interface Option {
  label: string;
  value: string;
  emoji: string;
}

interface InteractiveOptionsProps {
  question: string;
  options: Option[];
  onSelect: (option: Option) => void;
}

export const InteractiveOptions: React.FC<InteractiveOptionsProps> = ({ question, options, onSelect }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-primary-200 mt-6"
    >
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-xl shrink-0">
          🤔
        </div>
        <h3 className="text-lg font-bold text-gray-800 leading-snug pt-1">
          {question}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(option)}
            className={`
              flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
              ${index === 0 
                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-800' 
                : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 text-green-800'
              }
            `}
          >
            <span className="text-4xl mb-2 filter drop-shadow-sm">{option.emoji}</span>
            <span className="font-bold text-lg">{option.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};