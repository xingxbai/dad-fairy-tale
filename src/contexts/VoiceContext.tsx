import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type VoiceType = 'dad' | 'standard';

const STANDARD_VOICE = 'S_pkpEVvSN1';

interface VoiceContextValue {
  dadVoiceId: string | null;
  setDadVoiceId: (id: string) => void;
  voiceType: VoiceType;
  setVoiceType: (t: VoiceType) => void;
  voiceId: string; // computed current voice id
  STANDARD_VOICE: string;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dadVoiceId, setDadVoiceIdState] = useState<string | null>(() => {
    return 'S_pkpEVvSN1';
  });
  const [voiceType, setVoiceTypeState] = useState<VoiceType>(() => {
    return (localStorage.getItem('english_voice_type') as VoiceType) || 'dad';
  });

  useEffect(() => {
    if (dadVoiceId) {
      localStorage.setItem('dad_voice_id', dadVoiceId);
    }
  }, [dadVoiceId]);

  useEffect(() => {
    localStorage.setItem('english_voice_type', voiceType);
  }, [voiceType]);

  const setDadVoiceId = (id: string) => {
    setDadVoiceIdState(id);
  };

  const setVoiceType = (t: VoiceType) => {
    setVoiceTypeState(t);
  };

  const voiceId = useMemo(() => {
    return voiceType === 'dad' ? (dadVoiceId || STANDARD_VOICE) : STANDARD_VOICE;
  }, [dadVoiceId, voiceType]);

  const value: VoiceContextValue = {
    dadVoiceId,
    setDadVoiceId,
    voiceType,
    setVoiceType,
    voiceId,
    STANDARD_VOICE,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

export const useVoice = () => {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
};

export type { VoiceType };
export { STANDARD_VOICE };
