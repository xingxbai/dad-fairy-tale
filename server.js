import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
