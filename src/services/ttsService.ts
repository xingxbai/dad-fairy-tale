
export const generateTTS = async (text: string, voiceId: string): Promise<string | null> => {
  const ttsAppId = import.meta.env.VITE_VOLC_TTS_APPID;
  const ttsToken = import.meta.env.VITE_VOLC_TTS_TOKEN;

  if (!ttsAppId || !ttsToken) {
    console.error('TTS AppID or Token missing');
    return null;
  }

  const mediaSource = new MediaSource();
  const audioUrl = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen', () => {
    const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = `${wsProtocol}//${window.location.host}`;
    
    if (import.meta.env.DEV) {
        wsUrl = 'ws://localhost:3000';
    }

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    
    const queue: ArrayBuffer[] = [];

    const processQueue = () => {
      if (queue.length > 0 && !sourceBuffer.updating) {
        try {
          const chunk = queue.shift();
          if (chunk) {
            sourceBuffer.appendBuffer(chunk);
          }
        } catch (e) {
          console.error('SourceBuffer append error', e);
        }
      }
    };

    sourceBuffer.addEventListener('updateend', () => {
      processQueue();
      if (queue.length === 0 && ws.readyState === WebSocket.CLOSED && mediaSource.readyState === 'open' && !sourceBuffer.updating) {
        try {
            mediaSource.endOfStream();
        } catch (e) {
            console.error('endOfStream error', e);
        }
      }
    });

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'tts',
        text: text,
        voiceId: voiceId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'tts_audio') {
            const binaryString = atob(message.data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            queue.push(bytes.buffer);
            processQueue();
        } else if (message.type === 'tts_complete') {
            ws.close();
            if (queue.length === 0 && !sourceBuffer.updating && mediaSource.readyState === 'open') {
                mediaSource.endOfStream();
            }
        } else if (message.type === 'error') {
            console.error('TTS Error:', message.message);
            ws.close();
            if (mediaSource.readyState === 'open') {
                mediaSource.endOfStream('network');
            }
        }
      } catch (e) {
        console.error('Error processing TTS message:', e);
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream('network');
      }
    };

    mediaSource.addEventListener('sourceclose', () => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });
  });

  return audioUrl;
};
