
import { Router, Request, Response, NextFunction } from 'express';
import { TranscriptionController } from '../controllers/transcription.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();
const controller = new TranscriptionController();


function handleUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (err) => {
    if (err) return next(err);
    next();
  });
}

router.get('/health',         controller.healthCheck.bind(controller));
router.post('/sync',          handleUpload, controller.transcribeSync.bind(controller));
router.post('/async',         handleUpload, controller.transcribeAsync.bind(controller));
router.get('/jobs/:jobId',    controller.getJobStatus.bind(controller));

export default router;