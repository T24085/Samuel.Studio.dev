import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const agentTarget = 'http://127.0.0.1:8787';
const agentProxy = {
  target: agentTarget,
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api/assistant-chat': {
        ...agentProxy,
      },
      '/api/chat-log': {
        ...agentProxy,
      },
    },
  },
  preview: {
    proxy: {
      '/api/assistant-chat': {
        ...agentProxy,
      },
      '/api/chat-log': {
        ...agentProxy,
      },
    },
  },
});
