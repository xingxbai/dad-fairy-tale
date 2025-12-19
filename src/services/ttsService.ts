
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
    let ttsAppId = import.meta.env.VITE_VOLC_TTS_APPID;
    let ttsToken = import.meta.env.VITE_VOLC_TTS_TOKEN;

    // 如果是标准音色（非 S_ 开头的克隆音色），使用独立配置的鉴权信息
    // 文档: https://www.volcengine.com/docs/6561/1257584?lang=zh#http
    /* 
    if (voiceId && !voiceId.startsWith('S_')) {
      ttsAppId = '4286079913';
      ttsToken = 'ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp';
    }
    */

    if (!ttsAppId || !ttsToken) {
      console.error('TTS AppID or Token missing');
      return null;
    }


    // 只有当 voiceId 是 S_ 开头，且不是默认的标准音色 ID (S_pkpEVvSN1) 时，才认为是克隆音色（爸爸音色）
    const isClonedVoice = localStorage.english_voice_type === 'dad' ? true : false;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer;${ttsToken}`,
    };
    // 文本生成音频请求体 
    let body = JSON.stringify({
      "app": {
        "appid": "4286079913",
        "token": "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp",
        "cluster": "volcano_tts"
      },
      "user": {
        "uid": "user_1"
      },
      "audio": {
        "voice_type": "zh_female_xueayi_saturn_bigtts",
        "encoding": "mp3",
        "speed_ratio": 0.8
      },
      "request": {
        "reqid": "uuid",
        text: text.substring(0, 1000),
        "operation": "query"
      }
    })
    if (isClonedVoice) {
      headers['Resource-Id'] = 'seed-icl-2.0'; 
      body = JSON.stringify({
        app: {
          appid: ttsAppId,
          token: ttsToken,
          cluster: 'volcano_icl',
        },
        user: {
          uid: 'user_1',
        },
        audio: {
          voice_type: 'S_pkpEVvSN1',
          encoding: 'mp3',
          speed_ratio: 0.8,
        },
        request: {
          reqid: generateUUID(),
          text: text.substring(0, 1000),
          // text_type: 'plain',
          operation: 'query',
        },
      })
    }
    

    const response = await fetch('/api/v1/tts', {
      method: 'POST',
      headers,
      body: body
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
