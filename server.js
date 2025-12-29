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
  console.log(`Server is running on http://localhost:${PORT}`);
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
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
        
        // Construct Volcengine Request
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
                },
                request: {
                    reqid: reqId,
                    text: text,
                    operation: 'submit',
                },
            };
        }

        // Connect to Volcengine WebSocket
        const volcWs = new WebSocket('wss://openspeech.bytedance.com/api/v1/tts/ws_binary', {
            headers: {
                Authorization: `Bearer;${isClonedVoice ? ttsToken : "ITT5YA2nqX5VIHe97Sjw2dvTlZ7b9GSp"}`
            },
            skipUTF8Validation: true
        });

        volcWs.on('open', () => {
            const payload = zlib.gzipSync(JSON.stringify(requestJson));
            // Protocol version 1 (0x1), Header size 1 (0x1 * 4 = 4 bytes)
            // Message type: Full client request (0x1), No sequence (0x0) => 0x10
            // Serialization: JSON (0x1), Compression: Gzip (0x1) => 0x11
            // Reserved: 0x00
            const header = Buffer.from([0x11, 0x10, 0x11, 0x00]);
            
            // Payload Size (4 bytes)
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
                // If bit 0 of flags is set, there is a 4-byte sequence number
                if (flags & 0x01) { 
                    offset += 4;
                }
                // There is always a 4-byte payload size
                offset += 4; 

                if (offset > data.length) {
                    // Should not happen if protocol is correct, but safety check
                    console.error('TTS Protocol Error: Offset exceeds data length');
                    return;
                }

                let audioData = data.slice(offset);
                
                if (compression === 1) { // Gzip compressed
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

                if (flags & 0x02) { // Last message (bit 1)
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

        volcWs.on('close', () => {
            // console.log('Volcengine connection closed');
        });

      } else if (data.type === 'generate_story') {
        console.log(`[${new Date().toISOString()}] Received generate_story request for: ${data.title}`);
        const { title, prompt, type, ...extraParams } = data;
        
        const API_KEY = process.env.VITE_OPENAI_API_KEY;
        const BASE_URL = (process.env.VITE_OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
        const MODEL = process.env.VITE_OPENAI_MODEL || 'ep-20240604-xxxxx';

        if (!API_KEY) {
            ws.send(JSON.stringify({ type: 'error', message: 'API Key not configured on server' }));
            return;
        }

        try {
            console.log(`[${new Date().toISOString()}] Sending request to LLM API...`);
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                  model: MODEL,
                  messages: [
                    {
                      role: 'system',
                      content: '你是一个会讲故事的爸爸。请直接讲故事内容，不要返回JSON，不要包含标题，不要使用Markdown格式。',
                    },
                    {
                      role: 'user',
                      content: prompt,
                    },
                  ],
                  temperature: 0.8,
                  stream: true,
                  ...extraParams
                }),
            });

            console.log(`[${new Date().toISOString()}] Received response headers from LLM API. Status: ${response.status}`);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error: ${response.status} ${errText}`);
            }

            // Handle streaming response
            const decoder = new TextDecoder();
            let buffer = '';
            let isFirstChunk = true;

            // Use for await loop for Node.js native fetch stream
            // @ts-ignore
            for await (const chunk of response.body) {
                if (isFirstChunk) {
                    console.log(`[${new Date().toISOString()}] Received first chunk of data from LLM API`);
                    isFirstChunk = false;
                }
                const text = decoder.decode(chunk, { stream: true });
                // console.log(`[${new Date().toISOString()}] Received chunk: ${JSON.stringify(text.substring(0, 50))}...`);

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
                        const content = delta?.content;
                        const reasoning = delta?.reasoning_content;
                        
                        if (content) {
                            console.log(`[${new Date().toISOString()}] Sending chunk to client: ${JSON.stringify(content).substring(0, 20)}...`);
                            ws.send(JSON.stringify({ type: 'story_chunk', chunk: content }));
                        } else if (reasoning) {
                            // Skip sending reasoning to client as per user request
                            // console.log(`[${new Date().toISOString()}] Skipping reasoning chunk...`);
                        } else {
                            // Log if we receive a packet but no content (e.g. reasoning or empty delta)
                            console.log(`[${new Date().toISOString()}] Received packet without content. Keys: ${Object.keys(delta || {})}`);
                        }
                    } catch (e) {
                        console.error('Error parsing stream data:', e);
                    }
                }
            }
            
            ws.send(JSON.stringify({ type: 'story_complete' }));

        } catch (error) {
            console.error('API Error:', error);
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
