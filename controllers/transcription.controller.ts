
import { Request, Response, NextFunction } from 'express';
import { TranscriptionService } from '../services/transcription.service';
import { ApiResponse, TranscriptionResult, TranscriptionJob } from '../types';
import { logger } from '../utils/logger';

const transcriptionService = new TranscriptionService();

export class TranscriptionController {
  /**
   * POST /api/transcriptions/sync
   * Upload an audio file and receive the transcription in one request.
   * Use for files shorter than ~10 minutes.
   */
  async transcribeSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json(<ApiResponse<null>>{
          success: false,
          error: 'No audio file uploaded. Use form-data with key "audio".',
        });
        return;
      }

      logger.info(`Sync transcription request: ${req.file.originalname} (${req.file.size} bytes)`);

      const result = await transcriptionService.transcribeSync(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

      res.status(200).json(<ApiResponse<TranscriptionResult>>{
        success: true,
        data: result,
        message: 'Transcription completed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/transcriptions/async
   * Upload an audio file and receive a jobId. Poll /jobs/:jobId for result.
   * Use for files longer than ~10 minutes.
   */
  async transcribeAsync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json(<ApiResponse<null>>{
          success: false,
          error: 'No audio file uploaded. Use form-data with key "audio".',
        });
        return;
      }

      logger.info(`Async transcription request: ${req.file.originalname} (${req.file.size} bytes)`);

      const { jobId } = await transcriptionService.transcribeAsync(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

      res.status(202).json(<ApiResponse<{ jobId: string }>>{
        success: true,
        data: { jobId },
        message: `Job accepted. Poll GET /api/transcriptions/jobs/${jobId} for status.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/transcriptions/jobs/:jobId
   * Check the status of an async transcription job.
   */
  getJobStatus(req: Request, res: Response, next: NextFunction): void {
    try {
      const { jobId } = req.params;
      const job = transcriptionService.getJob(jobId);

      if (!job) {
        res.status(404).json(<ApiResponse<null>>{
          success: false,
          error: `Job not found: ${jobId}`,
        });
        return;
      }

      res.status(200).json(<ApiResponse<TranscriptionJob>>{
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/transcriptions/health
   * Simple health check endpoint.
   */
  healthCheck(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      service: 'Transcription Pipeline',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supportedFormats: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'mp4', 'mpeg'],
    });
  }
}
