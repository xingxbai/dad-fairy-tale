
// Simple UUID generator fallback for non-secure contexts
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateTTS = async (text: string, voiceId: string): Promise<string | null> => {
  try {
    const ttsAppId = import.meta.env.VITE_VOLC_TTS_APPID;
    const ttsToken = import.meta.env.VITE_VOLC_TTS_TOKEN;

    if (!ttsAppId || !ttsToken) {
      console.error('TTS AppID or Token missing');
      return null;
    }

    console.log(`Sending TTS request. AppID: ${ttsAppId}`);
    
    const response = await fetch('/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer;${ttsToken}`,
        'Resource-Id': 'seed-icl-2.0',
      },
      body: JSON.stringify({
        app: {
          appid: ttsAppId,
          token: ttsToken,
          cluster: voiceId?.startsWith('S_') ? 'volcano_icl' : 'volcano_tts',
        },
        user: {
          uid: 'user_1',
        },
        audio: {
          voice_type: voiceId || 'BV002_streaming',
          encoding: 'mp3',
          speed_ratio: 1.0,
        },
        request: {
          reqid: generateUUID(),
          text: text.substring(0, 1000), // Limit text length for safety
          text_type: 'plain',
          operation: 'query',
        },
      }),
    });

    const data = await response.json();
    console.log('TTS Response:', data);

    if (data.data) {
      const audioBlob = await fetch(`data:audio/mp3;base64,${data.data}`).then(r => r.blob());
      return URL.createObjectURL(audioBlob);
    } else {
      console.warn('TTS response missing data:', data);
      return null;
    }
  } catch (error) {
    console.error('TTS Generation failed:', error);
    return null;
  }
};
