
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import multer from 'multer';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });


  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(<ApiResponse<null>>{
        success: false,
        error: `File too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 100}MB.`,
      });
      return;
    }
    res.status(400).json(<ApiResponse<null>>{ success: false, error: `Upload error: ${err.message}` });
    return;
  }


  if (err.message.startsWith('Unsupported audio format')) {
    res.status(415).json(<ApiResponse<null>>{ success: false, error: err.message });
    return;
  }


  if (err.message.includes('API key')) {
    res.status(500).json(<ApiResponse<null>>{ success: false, error: 'Transcription service misconfigured.' });
    return;
  }

  res.status(500).json(<ApiResponse<null>>{
    success: false,
    error: 'Internal server error. Please try again.',
  });
}