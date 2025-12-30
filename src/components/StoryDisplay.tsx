import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';

interface StoryDisplayProps {
  title?: string;
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  title, 
  content,
  reasoning,
  isStreaming = false 
}) => {
  const [showReasoning, setShowReasoning] = useState(true);

  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[200px] font-serif leading-relaxed text-gray-800">
      {title && (
        <h3 className="text-xl font-bold mb-4 text-center text-primary-800">{title}</h3>
      )}

      {reasoning && (
        <div className="mb-6 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" />
              <span>AI 思考过程 {isStreaming && !content && "..."}</span>
            </div>
            {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showReasoning && (
            <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-100 font-mono whitespace-pre-wrap bg-gray-50/50 max-h-60 overflow-y-auto">
              {reasoning}
              {isStreaming && !content && (
                <span className="inline-block w-1.5 h-3 ml-1 bg-gray-400 animate-pulse align-middle"/>
              )}
            </div>
          )}
        </div>
      )}

      <div className="whitespace-pre-wrap">
        {content}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-primary-500 animate-pulse align-middle"/>
        )}
      </div>
    </div>
  );
};
