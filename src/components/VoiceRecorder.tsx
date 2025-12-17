import React, { useState, useRef } from 'react';
import { Loader2, Wand2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
  onVoiceRecorded: (voiceId: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onVoiceRecorded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 10MB as per docs)
    if (file.size > 10 * 1024 * 1024) {
      alert("文件大小不能超过 10MB");
      return;
    }

    setIsProcessing(true);
    setStatusMessage('正在读取文件...');

    try {
      const base64Audio = await fileToBase64(file);
      await uploadToVolcengine(base64Audio);
    } catch (error) {
      console.error(error);
      setStatusMessage('处理失败: ' + (error as any).message);
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:audio/mp3;base64, prefix
        // Note: The API expects base64 encoded bytes. 
        // readAsDataURL returns "data:audio/mp3;base64,XXXXX"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const uploadToVolcengine = async (audioBase64: string) => {
    const appid = import.meta.env.VITE_VOLC_TTS_APPID;
    const token = import.meta.env.VITE_VOLC_TTS_TOKEN;
    
    if (!appid || !token) {
      throw new Error("请配置 VITE_VOLC_TTS_APPID 和 VITE_VOLC_TTS_TOKEN");
    }

    // 使用指定的 speaker_id
    // const speakerId = 'S_j3ikxeLN1';
    const speakerId = `S_pkpEVvSN1`;
    setStatusMessage('正在上传音频...');

    console.log("Uploading audio...", { appid, speakerId });

    // 尝试将 appid 拼接到 URL 中，防止某些网关层校验丢失
    const response = await fetch(
      `/api/v1/mega_tts/audio/upload?appid=${appid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer; ${token}`,
          'Resource-Id': 'seed-icl-2.0',
        },
        body: JSON.stringify({
          appid: appid,
          speaker_id: speakerId,
          audios: [
            {
              audio_bytes: audioBase64,
              audio_format: 'm4a',
              speed_ratio: 0.5
            },
          ],
          source: 2,
          language: 0,
          model_type: 4,
          extra_params: '{"voice_clone_denoise_model_id": ""}',
        }),
      },
    );

    const data = await response.json();
    
    // Check for API errors
    if (data.BaseResp?.StatusCode !== 0) {
      throw new Error(`上传失败: ${data.BaseResp?.StatusMessage} (${data.BaseResp?.StatusCode})`);
    }

    setStatusMessage('上传成功，正在训练音色...');
    pollStatus(appid, speakerId, token);
  };

  const pollStatus = async (appid: string, speakerId: string, token: string) => {
    const check = async () => {
      try {
        // 保持与 upload 接口一致的鉴权格式和 URL 参数
        const response = await fetch(`/api/v1/mega_tts/status?appid=${appid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer;${token}`,
            'Resource-Id': 'seed-icl-2.0'
          },
          body: JSON.stringify({
            appid: appid,
            speaker_id: speakerId
          })
        });
        
        const data = await response.json();
        // status: 0=NotFound, 1=Training, 2=Success, 3=Failed, 4=Active
        const status = data.status;

        if (status === 2 || status === 4) {
          setStatusMessage('音色复刻成功！');
          setIsProcessing(false);
          onVoiceRecorded(speakerId);
        } else if (status === 3) {
          setStatusMessage('音色复刻失败');
          setIsProcessing(false);
        } else {
          // Keep polling
          setStatusMessage(`正在训练音色... (状态: ${status})`);
          setTimeout(check, 2000);
        }
      } catch (e) {
        console.error(e);
        setStatusMessage('查询状态失败，正在重试...');
        setTimeout(check, 2000);
      }
    };
    
    check();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold text-primary-800 mb-4">上传爸爸的声音</h2>
      <p className="text-gray-600 text-center mb-8">
        请上传一段 10秒~60秒 的 MP3 录音，<br />我们将为您复刻专属的讲故事声音。
      </p>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".m4a" 
        className="hidden" 
      />

      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={isProcessing ? undefined : handleFileClick}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-colors ${
            isProcessing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-white" />
          )}
        </motion.button>
      </div>

      {isProcessing && (
        <div className="mt-6 flex flex-col items-center text-primary-600">
          <div className="flex items-center mb-2">
            <Wand2 className="w-4 h-4 mr-2 animate-pulse" />
            <span className="text-sm font-medium">AI 正在处理中...</span>
          </div>
          <span className="text-xs text-gray-500">{statusMessage}</span>
        </div>
      )}

      {!isProcessing && (
        <p className="mt-6 text-sm text-gray-500">
          点击按钮上传 MP3 文件
        </p>
      )}
    </div>
  );
};
