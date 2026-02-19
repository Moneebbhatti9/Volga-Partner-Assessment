

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface TranscriptionResult {
  jobId: string;
  status: 'completed' | 'failed';
  language?: string;
  duration?: number;
  text: string;
  segments: TranscriptionSegment[];
  processingTimeMs: number;
  metadata: AudioMetadata;
}

export interface AudioMetadata {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  format: string;
  wasConverted: boolean;
  chunksProcessed?: number;
  model?: TranscriptionModel;       // ← track which model was used
}

export interface TranscriptionJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  result?: TranscriptionResult;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}




export type WhisperNativeFormat = 'mp3' | 'mp4' | 'mpeg' | 'mpga' | 'm4a' | 'wav' | 'webm';


export type ConvertibleFormat = 'flac' | 'ogg' | 'aiff' | 'aac' | 'wma';

export type SupportedFormat = WhisperNativeFormat | ConvertibleFormat;



export type TranscriptionModel =
  | 'whisper-large-v3'          // Groq — best quality
  | 'whisper-large-v3-turbo'    // Groq — faster, slightly lower quality
  | 'distil-whisper-large-v2'   // Groq — fastest, English only
  | 'whisper-1';                // OpenAI (legacy, keep for reference)