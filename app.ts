
import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import transcriptionRoutes from './routes/transcription.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});


app.use('/api/transcriptions', transcriptionRoutes);


app.get('/', (_req, res) => {
  res.json({
    message: '🎙️ Transcription Pipeline API',
    version: '1.0.0',
    docs: {
      health:    'GET  /api/transcriptions/health',
      syncMode:  'POST /api/transcriptions/sync   (form-data: audio)',
      asyncMode: 'POST /api/transcriptions/async  (form-data: audio)',
      jobStatus: 'GET  /api/transcriptions/jobs/:jobId',
    },
  });
});


app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});


app.use(errorMiddleware);

export default app;
