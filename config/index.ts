
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
  },

  audio: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),

    chunkDurationSeconds: parseInt(process.env.CHUNK_DURATION_SECONDS || '600', 10),
    allowedFormats: (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,ogg,flac,webm,mp4,mpeg').split(','),

    whisperNativeFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
  },

  paths: {
    uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
    tempDir: path.resolve(process.env.TEMP_DIR || 'temp'),
  },
} as const;
