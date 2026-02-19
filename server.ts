
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import fs from 'fs';


[config.paths.uploadDir, config.paths.tempDir, 'logs'].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});


if (!config.groq.apiKey) {
  logger.warn('⚠️  OPENAI_API_KEY is not set. Transcription calls will fail.');
}

const server = app.listen(config.server.port, () => {
  logger.info(`🚀 Transcription Pipeline running on http://localhost:${config.server.port}`);
  logger.info(`📂 Upload dir : ${config.paths.uploadDir}`);
  logger.info(`🗂️  Temp dir   : ${config.paths.tempDir}`);
  logger.info(`🎙️  Max file   : ${config.audio.maxFileSizeMb}MB`);
  logger.info(`✂️  Chunk size : ${config.audio.chunkDurationSeconds}s`);
});


process.on('SIGTERM', () => {
  logger.info('SIGTERM received – shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received – shutting down gracefully');
  server.close(() => process.exit(0));
});
