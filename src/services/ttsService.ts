export const generateTTS = async (text: string, voiceId: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/tts-stream/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to initialize TTS stream:', response.status, errorText);
      return null;
    }

    const { streamId } = await response.json();
    return `/api/tts-stream/${streamId}`;
  } catch (error) {
    console.error('Error generating TTS:', error);
    return null;
  }
};
