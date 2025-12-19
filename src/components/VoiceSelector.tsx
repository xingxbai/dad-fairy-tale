import React from 'react';
import { useVoice } from '../contexts/VoiceContext';

interface VoiceSelectorProps {
  color?: 'blue' | 'purple' | 'amber' | 'indigo' | 'green';
}

const colorMap = {
  blue: 'bg-blue-100 text-blue-800 focus:ring-blue-500',
  purple: 'bg-purple-100 text-purple-800 focus:ring-purple-500',
  amber: 'bg-amber-100 text-amber-800 focus:ring-amber-500',
  indigo: 'bg-indigo-100 text-indigo-800 focus:ring-indigo-500',
  green: 'bg-green-100 text-green-800 focus:ring-green-500',
};

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ color = 'blue' }) => {
  const { voiceType, setVoiceType } = useVoice();

  return (
    <div className="flex items-center">
      <select 
        value={voiceType}
        onChange={(e) => setVoiceType(e.target.value as 'dad' | 'standard')}
        className={`text-sm border-none rounded-lg px-3 py-1 focus:ring-2 outline-none cursor-pointer ${colorMap[color]}`}
      >
        <option value="dad">爸爸的声音</option>
        <option value="standard">标准音色</option>
      </select>
    </div>
  );
};
