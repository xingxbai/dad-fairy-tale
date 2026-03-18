import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import zlib from 'zlib';

// Load env vars from .env.local if it exists, otherwise .env
dotenv.config({ path: '.env.local' });
dotenv.config(); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// TTS Stream Cache
const streamRequests = new Map();

// Endpoint for initializing a TTS stream
app.post('/api/tts-stream/init', express.json(), (req, res) => {
    const { text, voiceId } = req.body;
    if (!text || !voiceId) {
        return res.status(400).json({ error: 'Missing text or voiceId' });
    }

    const streamId = uuidv4();
    streamRequests.set(streamId, { text, voiceId, createdAt: Date.now() });

    // Cleanup old requests every time (simple cleanup)
    const now = Date.now();
    for (const [id, data] of streamRequests.entries()) {
        if (now - data.createdAt > 30000) { // 30 seconds expiration
            streamRequests.delete(id);
        }
    }

    res.json({ streamId });
});

// Endpoint for streaming TTS audio
app.get('/api/tts-stream/:streamId', (req, res) => {
    const { streamId } = req.params;
    const requestData = streamRequests.get(streamId);

    if (!requestData) {
        return res.status(404).send('Stream not found or expired');
    }

    streamRequests.delete(streamId); // One-time use

    const { text, voiceId } = requestData;
    const ttsAppId = process.env.VITE_VOLC_TTS_APPID;
    const ttsToken = process.env.VITE_VOLC_TTS_TOKEN;
    const isClonedVoice = voiceId?.startsWith('S_');
    const reqId = uuidv4();

    let requestJson = {
        app: {
            appid: "4286079913",
            token: "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp",
            cluster: "volcano_tts"
        },
        user: { uid: "user_1" },
        audio: {
            voice_type: "zh_female_xueayi_saturn_bigtts", // Default, will be overridden
            encoding: "mp3",
            speed_ratio: 0.9,
            emotion: "neutral" // Default
        },
        request: {
            reqid: reqId,
            text: text,
            operation: "submit"
        }
    };

    if (isClonedVoice) {
        requestJson = {
            app: {
                appid: ttsAppId,
                token: ttsToken,
                cluster: 'volcano_icl',
            },
            user: { uid: "user_1" },
            audio: {
                voice_type: voiceId,
                encoding: "mp3",
                speed_ratio: 0.9,
            },
            request: {
                reqid: reqId,
                text: text,
                operation: "submit"
            }
        };
    } else {
        // Update voiceId only, keep other defaults from initialization
        requestJson.audio.voice_type = voiceId;
    }

    // Response Header
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Connect to Volcengine WebSocket
    const volcWs = new WebSocket('wss://openspeech.bytedance.com/api/v1/tts/ws_binary', {
        headers: {
            Authorization: `Bearer;${isClonedVoice ? ttsToken : "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp"}`
        },
        skipUTF8Validation: true
    });

    volcWs.on('open', () => {
        const payload = zlib.gzipSync(JSON.stringify(requestJson));
        const header = Buffer.from([0x11, 0x10, 0x11, 0x00]);
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(payload.length, 0);
        const packet = Buffer.concat([header, sizeBuffer, payload]);
        volcWs.send(packet);
    });

    volcWs.on('message', (data) => {
        const msgType = (data[1] >> 4) & 0x0F;
        const compression = data[2] & 0x0F;
        
        if (msgType === 0xB) { // Audio response
            const headerSize = (data[0] & 0x0F) * 4;
            let offset = headerSize;
            const flags = data[1] & 0x0F;
            if (flags & 0x01) offset += 4; // seq
            offset += 4; // payload size

            if (offset <= data.length) {
                let audioData = data.slice(offset);
                if (compression === 1) { // Gzip compressed
                    try {
                        audioData = zlib.gunzipSync(audioData);
                    } catch (e) {
                        console.error('Gunzip error', e);
                        return;
                    }
                }
                if (audioData.length > 0) {
                    res.write(audioData);
                }
                if (flags & 0x02) { // Last message
                    res.end();
                    volcWs.close();
                }
            }
        } else if (msgType === 0xF) { // Error
            const headerSize = (data[0] & 0x0F) * 4;
            const errorPayload = data.slice(headerSize).toString();
            console.error('Volcengine TTS Error:', errorPayload);
            // Don't res.end() here immediately if we want to send error status, but since headers are sent...
            // better to just close connection
            res.end(); 
            volcWs.close();
        }
    });

    volcWs.on('error', (err) => {
        console.error('Volcengine WS Error:', err);
        res.end();
    });

    volcWs.on('close', () => {
        if (!res.writableEnded) {
            res.end();
        }
    });
    
    // Handle client disconnect
    req.on('close', () => {
        if (volcWs.readyState === WebSocket.OPEN) {
            volcWs.close();
        }
    });
});

// Proxy configuration
const proxyOptions = {
  target: 'https://openspeech.bytedance.com',
  changeOrigin: true,
  secure: false,
};

app.use('/api/v1/tts', createProxyMiddleware(proxyOptions));
app.use('/api/v1/mega_tts', createProxyMiddleware(proxyOptions));

// Handle SPA routing: return index.html for all non-API requests
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server 1 is running on http://localhost:${PORT}`);
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected from ${clientIp}`);
  console.log('Headers:', JSON.stringify(req.headers));

  // Send a welcome message to verify downlink
  try {
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to server' }));
  } catch (e) {
    console.error('Error sending welcome message:', e);
  }

  ws.on('error', (err) => {
    console.error(`WebSocket error with ${clientIp}:`, err);
  });

  // Helper function to call LLM and stream response
  async function streamStoryFromLLM(ws, messages) {
      const API_KEY = 'sk-dzmbqursqauctwedlliqflvcjndhsaebsyculmcnfetshpbt';
      const BASE_URL = 'https://api.siliconflow.cn/v1';
      
      const MODELS = [
          // 'Qwen/Qwen2.5-7B-Instruct',
          'Qwen/Qwen3-8B',
          'THUDM/glm-4-9b-chat',
          'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B'
      ];

      let success = false;
      let lastError = null;
      let fullResponseText = '';

      for (const model of MODELS) {
          try {
              console.log(`[${new Date().toISOString()}] Attempting to generate story with model: ${model}...`);
              const response = await fetch(`${BASE_URL}/chat/completions`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: true,
                    temperature: 0.7, 
                    max_tokens: 512   
                  }),
              });

              if (!response.ok) {
                  const errText = await response.text();
                  throw new Error(`API Error (${model}): ${response.status} ${errText}`);
              }

              const decoder = new TextDecoder();
              let buffer = '';
              
              // @ts-ignore
              for await (const chunk of response.body) {
                  const text = decoder.decode(chunk, { stream: true });
                  buffer += text;
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                      const trimmedLine = line.trim();
                      if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
                      
                      const data = trimmedLine.slice(6);
                      if (data === '[DONE]') continue;

                      try {
                          const json = JSON.parse(data);
                          const delta = json.choices[0]?.delta;
                          
                          if (delta?.content) {
                              fullResponseText += delta.content;
                              ws.send(JSON.stringify({ type: 'story_chunk', chunk: delta.content }));
                          }
                          if (delta?.reasoning_content) {
                              ws.send(JSON.stringify({ type: 'story_reasoning', chunk: delta.reasoning_content }));
                          }
                      } catch (e) {
                          // ignore
                      }
                  }
              }
              
              ws.send(JSON.stringify({ type: 'story_turn_complete' }));
              return fullResponseText;

          } catch (error) {
              console.error(`Error with model ${model}:`, error.message);
              lastError = error;
          }
      }

      if (!success) {
          console.error('All models failed.');
          ws.send(JSON.stringify({ type: 'error', message: lastError ? lastError.message : 'All models failed.' }));
      }
      return null;
  }

  ws.on('message', async (message) => {
    console.log(`Received message from ${clientIp}: ${typeof message === 'string' ? message.slice(0, 50) : 'binary'}`);
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'tts') {
        const { text, voiceId } = data;
        const ttsAppId = process.env.VITE_VOLC_TTS_APPID;
        const ttsToken = process.env.VITE_VOLC_TTS_TOKEN;

        if (!ttsAppId || !ttsToken) {
            ws.send(JSON.stringify({ type: 'error', message: 'TTS credentials missing on server' }));
            return;
        }

        const isClonedVoice = voiceId?.startsWith('S_');
        const reqId = uuidv4();
        
        let requestJson = {
            app: {
                appid: "4286079913",
                token: "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp",
                cluster: "volcano_tts"
            },
            user: { uid: "user_1" },
            audio: {
                voice_type: "zh_female_xueayi_saturn_bigtts",
                encoding: "mp3",
                speed_ratio: 0.9
            },
            request: {
                reqid: reqId,
                text: text,
                operation: "submit"
            }
        };

        if (isClonedVoice) {
            requestJson = {
                app: {
                    appid: ttsAppId,
                    token: ttsToken,
                    cluster: 'volcano_icl',
                },
                user: { uid: 'user_1' },
                audio: {
                    voice_type: voiceId,
                    encoding: "mp3",
                    speed_ratio: 0.9,
                    emotion: "neutral"
                },
                request: {
                    reqid: reqId,
                    text: text,
                    operation: 'submit',
                },
            };
        }

        const volcWs = new WebSocket('wss://openspeech.bytedance.com/api/v1/tts/ws_binary', {
            headers: {
                Authorization: `Bearer;${isClonedVoice ? ttsToken : "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp"}`
            },
            skipUTF8Validation: true
        });

        volcWs.on('open', () => {
            const payload = zlib.gzipSync(JSON.stringify(requestJson));
            const header = Buffer.from([0x11, 0x10, 0x11, 0x00]);
            
            const sizeBuffer = Buffer.alloc(4);
            sizeBuffer.writeUInt32BE(payload.length, 0);

            const packet = Buffer.concat([header, sizeBuffer, payload]);
            volcWs.send(packet);
        });

        volcWs.on('message', (data) => {
            const msgType = (data[1] >> 4) & 0x0F;
            const compression = data[2] & 0x0F;
            
            if (msgType === 0xB) { // Audio-only server response
                const headerSize = (data[0] & 0x0F) * 4;
                let offset = headerSize;
                
                const flags = data[1] & 0x0F;
                if (flags & 0x01) {
                    offset += 4;
                }
                offset += 4; 

                if (offset > data.length) {
                    return;
                }

                let audioData = data.slice(offset);
                if (compression === 1) { 
                    try {
                        audioData = zlib.gunzipSync(audioData);
                    } catch (e) {
                        console.error('TTS Audio Gunzip error:', e);
                        return;
                    }
                }

                if (audioData.length > 0) {
                    ws.send(JSON.stringify({ 
                        type: 'tts_audio', 
                        data: audioData.toString('base64') 
                    }));
                }

                if (flags & 0x02) { 
                    ws.send(JSON.stringify({ type: 'tts_complete' }));
                    volcWs.close();
                }
            } else if (msgType === 0xF) { // Error
                const headerSize = (data[0] & 0x0F) * 4;
                const errorPayload = data.slice(headerSize).toString();
                console.error('Volcengine TTS Error:', errorPayload);
                ws.send(JSON.stringify({ type: 'error', message: `TTS Error: ${errorPayload}` }));
                volcWs.close();
            }
        });

        volcWs.on('error', (err) => {
            console.error('Volcengine WebSocket Error:', err);
            ws.send(JSON.stringify({ type: 'error', message: 'TTS Connection Error' }));
        });

      } else if (data.type === 'generate_story') {
        const { title } = data;
        ws.storyHistory = [
            {
                role: 'system',
                content: `你是专为0-5岁宝宝设计的“故事爸爸”。
请讲一个关于《${title}》的睡前故事。
要求：
1. 语气亲切、温柔，多用叠词（如“大大的”、“红红的”），充满童趣。
2. 故事要完整，逻辑通顺，适合哄睡。
3. 不需要互动，请一次性把故事讲完，字数控制在500字左右。`
            },
            {
                role: 'user',
                content: "请开始讲故事。"
            }
        ];
        console.log(`[${new Date().toISOString()}] Starting classic story: ${title}`);
        const response = await streamStoryFromLLM(ws, ws.storyHistory);
        if (response) {
            ws.storyHistory.push({ role: 'assistant', content: response });
        }
        // Send completion signal for classic mode so frontend knows to show "Play" button
        ws.send(JSON.stringify({ type: 'story_complete' }));

      } else if (data.type === 'generate_interactive_story') {
        const { title, prompt } = data;
        
        ws.storyHistory = [
            {
                role: 'system',
                content: `你是专为0-5岁宝宝设计的“故事爸爸”。
请讲一个关于《${title}》的互动故事。

【核心人设与风格】
1. **身份**：你是一个温暖、耐心的爸爸，正在给0-5岁的宝宝讲睡前故事。
2. **语言**：
   - 语气亲切、温柔，充满爱意。
   - 多使用叠词（如“红红的”、“高高的”、“慢慢地”）。
   - 多使用拟声词（如“呼呼”、“通通通”）。
   - 句式简单，避免使用长句和复杂的逻辑词。

【故事结构与互动要求】
1. **分段讲述**：每次只讲一小段情节（约100字左右），确保宝宝能跟上。
2. **必须互动**：讲完一段后，**必须**停下来，向宝宝提问，让宝宝参与决定接下来的故事发展。
3. **选项逻辑**：
   - 选项必须**紧扣刚才的剧情**，符合故事的逻辑线索。
   - 选项内容可以是**决定主角的行动**（如“往左走”还是“往右走”）。
   - 选项内容也可以是**猜测原因或感受**（如“他是不是饿了？”还是“他是不是想找妈妈？”），但必须要符合常理。
   - **重要**：对于经典童话（如皇帝的新装），选项要符合原著逻辑或简单的儿童逻辑（如“被骗子骗了”），**严禁**出现“害羞”、“调皮”等不符合剧情语境的莫名其妙的选项。

【输出格式规范】
每次回复末尾**必须**且**只能**包含一个JSON数据块（不要使用Markdown代码块，直接输出文本），格式如下：

[INTERACTION]
{
  "question": "（这里填入根据刚才情节设计的引导性问题，语气要像爸爸在问宝宝）",
  "options": [
    { "label": "（选项1：简短、行动或回答）", "value": "（选项1代表的故事走向简述）", "emoji": "（匹配的Emoji）" },
    { "label": "（选项2：简短、行动或回答）", "value": "（选项2代表的故事走向简述）", "emoji": "（匹配的Emoji）" }
  ]
}
[/INTERACTION]
`
            },
            {
                role: 'user',
                content: "开始讲故事吧！"
            }
        ];

        console.log(`[${new Date().toISOString()}] Starting new story: ${title}`);
        const response = await streamStoryFromLLM(ws, ws.storyHistory);
        if (response) {
            ws.storyHistory.push({ role: 'assistant', content: response });
        }

      } else if (data.type === 'continue_story') {
          const { choice } = data;
          console.log(`[${new Date().toISOString()}] Continuing story with choice: ${choice}`);
          
          if (!ws.storyHistory) {
              ws.send(JSON.stringify({ type: 'error', message: 'Story session expired. Please restart.' }));
              return;
          }

          ws.storyHistory.push({
              role: 'user',
              content: `我选择：${choice}。请继续讲故事！记得讲完一段后再次给出互动选项。`
          });
          
          const response = await streamStoryFromLLM(ws, ws.storyHistory);
          if (response) {
              ws.storyHistory.push({ role: 'assistant', content: response });
          }
      }

    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  const keepAliveInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(keepAliveInterval);
  });
}); 
