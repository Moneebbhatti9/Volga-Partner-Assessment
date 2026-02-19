import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';
import { convertToMp3, getAudioDuration } from '../utils/audioChunker';
import { AudioMetadata,SupportedFormat } from '../types';

export class AudioService {

  async prepareAudio(
    filePath: string,
    originalName: string,
    mimeType: string,
    sizeBytes: number,
    tempDir: string
  ): Promise<{ processedPath: string; metadata: AudioMetadata; duration: number }> {
    const ext= path.extname(originalName).toLowerCase().replace('.', '') ;
    const isNativeFormat = config.audio.whisperNativeFormats.includes(ext);

    logger.info(`Preparing audio: format=${ext}, native=${isNativeFormat}, size=${sizeBytes} bytes`);

    let processedPath = filePath;
    let wasConverted = false;

    if (!isNativeFormat) {
      logger.info(`Format '${ext}' not natively supported by Whisper, converting to MP3...`);
      processedPath = await convertToMp3(filePath, tempDir);
      wasConverted = true;
    }

    const duration = await getAudioDuration(processedPath);

    const metadata: AudioMetadata = {
      originalName,
      mimeType,
      sizeBytes,
      format: ext,
      wasConverted,
    };

    return { processedPath, metadata, duration };
  }

  isFormatAllowed(originalName: string): boolean {
    const ext = path.extname(originalName).toLowerCase().replace('.', '');
    return config.audio.allowedFormats.includes(ext);
  }

  ensureDirectories(): void {
    [config.paths.uploadDir, config.paths.tempDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    });
  }
}
