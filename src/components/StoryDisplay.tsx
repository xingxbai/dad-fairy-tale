import React from 'react';

interface StoryDisplayProps {
  title?: string;
  content: string;
  reasoning?: string;
  isStreaming?: boolean;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  title, 
  content,
  isStreaming = false 
}) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[200px] font-serif leading-relaxed text-gray-800">
      {title && (
        <h3 className="text-xl font-bold mb-4 text-center text-primary-800">{title}</h3>
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
