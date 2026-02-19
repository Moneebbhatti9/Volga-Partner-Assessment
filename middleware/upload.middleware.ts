
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.paths.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (config.audio.allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported audio format: .${ext}. Allowed: ${config.audio.allowedFormats.join(', ')}`
      )
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.audio.maxFileSizeMb * 1024 * 1024,
  },
}).single('audio');