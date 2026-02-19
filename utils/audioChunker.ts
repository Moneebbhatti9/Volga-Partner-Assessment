
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from './logger';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const ffprobeInstaller = require('@ffprobe-installer/ffprobe') as { path: string; version: string };

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export interface AudioChunk {
  filePath: string;
  startSeconds: number;
  endSeconds: number;
  index: number;
}

/**
 * Get the total duration of an audio file in seconds using ffprobe.
 */
export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`ffprobe failed: ${err.message}`));
      const duration = metadata?.format?.duration;
      if (!duration) return reject(new Error('Could not determine audio duration'));
      resolve(duration);
    });
  });
}

/**
 * Split a long audio file into chunks of `chunkDurationSeconds`.
 * Each chunk is exported as MP3 (Whisper-compatible).
 * Returns array of chunk metadata including their time offsets.
 */
export function splitAudioIntoChunks(
  inputPath: string,
  outputDir: string,
  chunkDurationSeconds = config.audio.chunkDurationSeconds
): Promise<AudioChunk[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const duration = await getAudioDuration(inputPath);
      logger.debug(`Audio duration: ${duration}s, chunk size: ${chunkDurationSeconds}s`);


      if (duration <= chunkDurationSeconds) {
        return resolve([
          {
            filePath: inputPath,
            startSeconds: 0,
            endSeconds: duration,
            index: 0,
          },
        ]);
      }

      const chunks: AudioChunk[] = [];
      const totalChunks = Math.ceil(duration / chunkDurationSeconds);
      let pending = totalChunks;

      for (let i = 0; i < totalChunks; i++) {
        const startSeconds = i * chunkDurationSeconds;
        const endSeconds = Math.min(startSeconds + chunkDurationSeconds, duration);
        const chunkPath = path.join(outputDir, `chunk_${i}.mp3`);

        ffmpeg(inputPath)
          .setStartTime(startSeconds)
          .setDuration(endSeconds - startSeconds)
          .output(chunkPath)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('end', () => {
            chunks.push({ filePath: chunkPath, startSeconds, endSeconds, index: i });
            pending--;
            if (pending === 0) {

              resolve(chunks.sort((a, b) => a.index - b.index));
            }
          })
          .on('error', (err) => reject(new Error(`Chunking failed at chunk ${i}: ${err.message}`)))
          .run();
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Convert any audio format to MP3 (Whisper-compatible).
 * Returns the path to the converted file.
 */
export function convertToMp3(inputPath: string, outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `converted_${Date.now()}.mp3`);
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('end', () => {
        logger.debug(`Converted audio to MP3: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => reject(new Error(`Format conversion failed: ${err.message}`)))
      .run();
  });
}

/**
 * Clean up temporary files after processing.
 */
export function cleanupFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Cleaned up temp file: ${filePath}`);
      }
    } catch (err) {
      logger.warn(`Failed to delete temp file: ${filePath}`, { err });
    }
  }
}
