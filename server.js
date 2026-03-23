import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';


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


// Helper to map old Volcengine voices to Edge TTS voices
function mapVoiceId(voiceId) {
    if (!voiceId) return 'zh-CN-XiaoxiaoNeural'; // Default female
    
    // Check if it's already an Edge TTS voice (heuristic: contains Neural)
    if (voiceId.includes('Neural')) return voiceId;

    // Map specific Volcengine IDs
    // S_pkpEVvSN1 (Dad voice/Cloned) -> zh-CN-YunxiNeural (Male)
    if (voiceId.startsWith('S_')) return 'zh-CN-YunxiNeural';
    
    // zh_female_xueayi_saturn_bigtts (Standard female) -> zh-CN-XiaoxiaoNeural
    if (voiceId.includes('female')) return 'zh-CN-XiaoxiaoNeural';
    
    // Default fallback
    return 'zh-CN-XiaoxiaoNeural';
}

// Endpoint for initializing a TTS stream
app.post('/api/tts-stream/init', express.json(), (req, res) => {
    const { text, voiceId } = req.body;
    console.log(`[TTS Init] Session started. Voice: ${voiceId}, Text: ${text?.slice(0, 20)}...`);
    if (!text) {
        return res.status(400).json({ error: 'Missing text' });
    }

    const streamId = uuidv4();
    // Resolve voiceId to Edge TTS format immediately
    const edgeVoiceId = mapVoiceId(voiceId);
    
    streamRequests.set(streamId, { text, voiceId: edgeVoiceId, createdAt: Date.now() });

    // Cleanup old requests every time (simple cleanup)
    const now = Date.now();
    for (const [id, data] of streamRequests.entries()) {
        if (now - data.createdAt > 300000) { // Extended to 5 minutes for stability
            streamRequests.delete(id);
        }
    }

    console.log(`[TTS Init] Stream prepared: ${streamId}. Store size: ${streamRequests.size}`);
    res.json({ streamId });
});

// Endpoint for streaming TTS audio
app.get('/api/tts-stream/:streamId', async (req, res) => {
    const { streamId } = req.params;
    console.log(`[TTS Stream] Request received for ID: ${streamId}`);
    const requestData = streamRequests.get(streamId);

    if (!requestData) {
        console.warn(`[TTS Stream] Stream ID ${streamId} not found.`);
        return res.status(404).send('Stream not found or expired');
    }

    const { text, voiceId } = requestData;
    console.log(`[TTS Stream] Loading full buffer for stability...`);

    try {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        
        // 关键修改：改回 Buffer 模式。
        // 虽然初始点击到播放会有 3-5 秒延迟，但它能提供 Content-Length，
        // 彻底解决移动端因 Range 请求不连贯导致的“7-8秒断连”和“无法拖动进度条”的问题。
        const buffer = await tts.toBuffer(text, { 
            rate: "-15%",
        });
        
        console.log(`[TTS Stream] Buffer ready: ${buffer.length} bytes. Sending to client...`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        res.end(buffer);

    } catch (error) {
        console.error('[TTS Stream] Edge TTS Error:', error);
        if (!res.headersSent) {
            res.status(500).send('TTS Generation Failed');
        }
    }
});

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

  // Helper function to generate Image
  async function generateImage(ws, prompt) {
      const API_KEY = 'sk-dzmbqursqauctwedlliqflvcjndhsaebsyculmcnfetshpbt';
      // Use SiliconFlow's correct endpoint for Images
      // Note: SiliconFlow API is OpenAI Compatible, but sometimes specific models need different paths.
      // Standard OpenAI: /v1/images/generations
      const BASE_URL = 'https://api.siliconflow.cn/v1';

      try {
          console.log(`[${new Date().toISOString()}] Generating image for prompt: ${prompt}`);
          const response = await fetch(`${BASE_URL}/images/generations`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${API_KEY}`,
              },
              body: JSON.stringify({
                  model: "black-forest-labs/FLUX.1-schnell", 
                  prompt: `(masterpiece), (best quality), children's book illustration for 0-5 year olds, cute, soft lighting, warm colors, watercolor style, simple composition, detailed character. Scene description: ${prompt}`,
                  image_size: "1024x1024",
                  seed: Math.floor(Math.random() * 10000000) // Random seed to ensure variety
              }),
          });


          if (!response.ok) {
              const errText = await response.text();
              console.error('Image Generation API Error:', errText);
              return;
          }

          const data = await response.json();
          if (data.data && data.data[0]?.url) {
              console.log('Image generated successfully');
              ws.send(JSON.stringify({ 
                  type: 'story_image', 
                  url: data.data[0].url 
              }));
          }

      } catch (error) {
          console.error('Image generation failed:', error);
      }
  }

  ws.on('message', async (message) => {
    const rawMessage = message.toString();
    console.log(`Received message from ${clientIp}: ${rawMessage.slice(0, 50)}`);
    try {
      // Ensure message is parsed as string, sometimes it comes as Buffer
      const data = JSON.parse(rawMessage);
      
      if (data.type === 'tts') {
        const { text, voiceId } = data;
        const edgeVoiceId = mapVoiceId(voiceId);

        try {
            const tts = new MsEdgeTTS();
            await tts.setMetadata(edgeVoiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            const { audioStream } = await tts.toStream(text, { 
                rate: "-15%",   // Slower speed for kids
            });
            
            audioStream.on('data', (chunk) => {
                 ws.send(JSON.stringify({ 
                    type: 'tts_audio', 
                    data: chunk.toString('base64') 
                }));
            });
            
            // Wait for stream to end before sending completion
            audioStream.on('end', () => {
                ws.send(JSON.stringify({ type: 'tts_complete' }));
            });
            
            audioStream.on('error', (err) => {
                console.error('Edge TTS Stream Error:', err);
                ws.send(JSON.stringify({ type: 'error', message: 'TTS Generation Error' }));
            });
            
        } catch (error) {
            console.error('Edge TTS Error:', error);
            // Only send if WS is open
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: `TTS Error: ${error.message}` }));
            }
        }

      } else if (data.type === 'generate_story') {
        const { title, prompt } = data;
        
        // Default Chinese System Prompt
        let systemContent = `你是专为0-5岁宝宝设计的“故事爸爸”。
请讲一个关于《${title}》的睡前故事。
要求：
1. 语气亲切、温柔，多用叠词（如“大大的”、“红红的”），充满童趣。
2. 故事要完整，逻辑通顺，适合哄睡。
3. 不需要互动，请一次性把故事讲完，字数控制在500字左右。
4. **重要**：直接开始讲故事内容，不要输出任何开场白、介绍语或“好的，下面是...”之类的废话。`;

        // Override if custom prompt is provided (e.g. for English stories)
        if (prompt) {
            systemContent = `${prompt} IMPORTANT: Start the story directly. NO introductory remarks like "Sure, here is..." or "Okay...".`;
        }

        ws.storyHistory = [
            {
                role: 'system',
                content: systemContent
            },
            {
                role: 'user',
                content: prompt ? "Start now." : "请开始讲故事。"
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
        ws.storyTitle = title; // Store title for later use
        
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
        
        // Trigger Image Generation in Parallel
        generateImage(ws, `Close-up of main character in the story "${title}". Cute, friendly, fairy tale style.`);

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
          
          // Retrieve previous context
          const lastStorySegment = ws.storyHistory.filter(m => m.role === 'assistant').pop()?.content || ws.storyTitle;
          const cleanSegment = lastStorySegment.replace(/\[INTERACTION\][\s\S]*?\[\/INTERACTION\]/g, '').slice(-300);

          // Trigger Image Generation in Parallel based on choice and context
          generateImage(ws, `Story: "${ws.storyTitle}". Action: The character chooses to ${choice}. Previous context: ${cleanSegment}`);
          
          const response = await streamStoryFromLLM(ws, ws.storyHistory);

          if (response) {
              ws.storyHistory.push({ role: 'assistant', content: response });
          }
      }

    } catch (error) {
      console.error('WebSocket error:', error);
      // Only send error if we can construct a valid JSON
      try {
          ws.send(JSON.stringify({ type: 'error', message: `Invalid message format: ${error.message}` }));
      } catch (e) {
          console.error('Failed to send error message:', e);
      }
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
