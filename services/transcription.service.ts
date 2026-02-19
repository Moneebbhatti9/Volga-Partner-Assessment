import fs from 'fs';
import Groq from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { splitAudioIntoChunks, cleanupFiles, AudioChunk } from '../utils/audioChunker';
import { AudioService } from './audio.service';
import {
  TranscriptionResult,
  TranscriptionSegment,
  AudioMetadata,
  TranscriptionJob,
} from '../types';

export class TranscriptionService {
  private groq: Groq;
  private audioService: AudioService;

  private jobStore: Map<string, TranscriptionJob> = new Map();

  constructor() {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
    this.audioService = new AudioService();
    this.audioService.ensureDirectories();
  }



  async transcribeSync(
    filePath: string,
    originalName: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<TranscriptionResult> {
    const jobId = uuidv4();
    const startTime = Date.now();

    logger.info(`[${jobId}] Starting synchronous transcription: ${originalName}`);

    const { processedPath, metadata, duration } = await this.audioService.prepareAudio(
      filePath,
      originalName,
      mimeType,
      sizeBytes,
      config.paths.tempDir
    );

    const tempFilesToCleanup: string[] = [];
    if (metadata.wasConverted) tempFilesToCleanup.push(processedPath);

    try {
      const { segments, fullText, language, chunksProcessed } = await this.runTranscriptionPipeline(
        processedPath,
        jobId,
        tempFilesToCleanup
      );

      const result: TranscriptionResult = {
        jobId,
        status: 'completed',
        language,
        duration,
        text: fullText,
        segments,
        processingTimeMs: Date.now() - startTime,
        metadata: { ...metadata, chunksProcessed },
      };

      logger.info(`[${jobId}] Transcription completed in ${result.processingTimeMs}ms`);
      return result;
    } finally {
      cleanupFiles([filePath, ...tempFilesToCleanup]);
    }
  }

  async transcribeAsync(
    filePath: string,
    originalName: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<{ jobId: string }> {
    const jobId = uuidv4();

    const job: TranscriptionJob = {
      jobId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobStore.set(jobId, job);

    this.processJobInBackground(jobId, filePath, originalName, mimeType, sizeBytes).catch(
      (err) => logger.error(`[${jobId}] Background job failed: ${err.message}`)
    );

    return { jobId };
  }

  getJob(jobId: string): TranscriptionJob | undefined {
    return this.jobStore.get(jobId);
  }



  private async processJobInBackground(
    jobId: string,
    filePath: string,
    originalName: string,
    mimeType: string,
    sizeBytes: number
  ): Promise<void> {
    const startTime = Date.now();
    this.updateJob(jobId, { status: 'processing' });

    const tempFilesToCleanup: string[] = [];

    try {
      const { processedPath, metadata, duration } = await this.audioService.prepareAudio(
        filePath,
        originalName,
        mimeType,
        sizeBytes,
        config.paths.tempDir
      );
      if (metadata.wasConverted) tempFilesToCleanup.push(processedPath);

      const { segments, fullText, language, chunksProcessed } = await this.runTranscriptionPipeline(
        processedPath,
        jobId,
        tempFilesToCleanup
      );

      const result: TranscriptionResult = {
        jobId,
        status: 'completed',
        language,
        duration,
        text: fullText,
        segments,
        processingTimeMs: Date.now() - startTime,
        metadata: { ...metadata, chunksProcessed },
      };

      this.updateJob(jobId, { status: 'completed', result });
      logger.info(`[${jobId}] Background job completed in ${result.processingTimeMs}ms`);
    } catch (err: any) {
      this.updateJob(jobId, { status: 'failed', error: err.message });
      logger.error(`[${jobId}] Background job failed: ${err.message}`);
    } finally {
      cleanupFiles([filePath, ...tempFilesToCleanup]);
    }
  }

  private async runTranscriptionPipeline(
    processedPath: string,
    jobId: string,
    tempFilesToCleanup: string[]
  ): Promise<{
    segments: TranscriptionSegment[];
    fullText: string;
    language: string;
    chunksProcessed: number;
  }> {
    const chunks = await splitAudioIntoChunks(processedPath, config.paths.tempDir);
    logger.info(`[${jobId}] Processing ${chunks.length} chunk(s)...`);

    if (chunks.length > 1) {
      chunks.forEach((c) => tempFilesToCleanup.push(c.filePath));
    }

    const allSegments: TranscriptionSegment[] = [];
    let detectedLanguage = 'unknown';
    let segmentIdOffset = 0;

    for (const chunk of chunks) {
      const { segments, language } = await this.transcribeChunk(chunk, jobId);
      detectedLanguage = language;

      const adjustedSegments: TranscriptionSegment[] = segments.map((seg, idx) => ({
        ...seg,
        id: segmentIdOffset + idx,
        start: seg.start + chunk.startSeconds,
        end: seg.end + chunk.startSeconds,
      }));

      allSegments.push(...adjustedSegments);
      segmentIdOffset += segments.length;
    }

    const fullText = allSegments.map((s) => s.text.trim()).join(' ');

    return {
      segments: allSegments,
      fullText,
      language: detectedLanguage,
      chunksProcessed: chunks.length,
    };
  }

  private async transcribeChunk(
    chunk: AudioChunk,
    jobId: string
  ): Promise<{ segments: TranscriptionSegment[]; language: string }> {
    logger.debug(
      `[${jobId}] Transcribing chunk ${chunk.index}: ${chunk.startSeconds}s → ${chunk.endSeconds}s`
    );

    const fileStream = fs.createReadStream(chunk.filePath);


    const response = await this.groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const segments: TranscriptionSegment[] = (response.segments ?? []).map((seg, idx) => ({
      id: idx,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      confidence: seg.avg_logprob !== undefined
        ? parseFloat(Math.exp(seg.avg_logprob).toFixed(4))
        : undefined,
    }));

    if (segments.length === 0 && response.text) {
      segments.push({
        id: 0,
        start: 0,
        end: chunk.endSeconds - chunk.startSeconds,
        text: response.text,
      });
    }

    return { segments, language: response.language ?? 'unknown' };
  }

  private updateJob(jobId: string, updates: Partial<TranscriptionJob>): void {
    const existing = this.jobStore.get(jobId);
    if (existing) {
      this.jobStore.set(jobId, { ...existing, ...updates, updatedAt: new Date() });
    }
  }
}