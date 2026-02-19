# 🎙️ Transcription Pipeline

A REST API built with **Node.js + TypeScript** that accepts audio files and returns timestamped transcriptions using **Groq Whisper Large V3**.

---

## Features

- ✅ **Sync & Async modes** — short files get instant results; long files process in background
- ✅ **Timestamped segments** — every segment has `start`, `end`, and `confidence`
- ✅ **Any audio format** — MP3, WAV, FLAC, OGG, M4A, WEBM, MP4 and more
- ✅ **Long file support** — automatic chunking via ffmpeg, timestamps stitched correctly
- ✅ **Job polling** — async jobs tracked by `jobId`, poll anytime for status
- ✅ **Structured logging** — Winston with file + console transports
- ✅ **Centralised error handling** — consistent JSON error responses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| Framework | Express.js |
| STT Engine | Groq Whisper Large V3 |
| Audio Processing | fluent-ffmpeg |
| File Upload | Multer |
| Logging | Winston |

---

## Project Structure

```
src/
├── config/
│   └── index.ts                      # All env-var config, typed & centralised
├── controllers/
│   └── transcription.controller.ts   # HTTP layer — handles req/res only
├── services/
│   ├── transcription.service.ts      # Core pipeline: chunk → Whisper → merge
│   └── audio.service.ts              # Format detection & conversion logic
├── routes/
│   └── transcription.routes.ts       # Route definitions
├── middleware/
│   ├── upload.middleware.ts           # Multer: file validation & disk storage
│   └── error.middleware.ts            # Global error handler
├── utils/
│   ├── audioChunker.ts               # ffmpeg: probe duration, split, convert
│   └── logger.ts                     # Winston logger
├── types/
│   └── index.ts                      # Shared TypeScript interfaces
├── app.ts                             # Express app setup
└── server.ts                          # Entry point + graceful shutdown
```

---

## Prerequisites

- **Node.js** ≥ 18
- **ffmpeg** installed on your machine
- A **Groq API key** — free at [console.groq.com](https://console.groq.com)

### Install ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt-get install ffmpeg

# Windows — download from https://www.gyan.dev/ffmpeg/builds/ and add to PATH

# Verify
ffmpeg -version
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Moneebbhatti9/Volga-Partner-Assessment.git
cd Volga-Partner-Assessment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add your key:

```env
GROQ_API_KEY=gsk_your_key_here
PORT=3000
```

### 4. Run in development

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 5. Build for production

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `GROQ_API_KEY` | — | **Required** |
| `MAX_FILE_SIZE_MB` | `100` | Max upload size in MB |
| `CHUNK_DURATION_SECONDS` | `600` | Chunk size for long audio |
| `UPLOAD_DIR` | `uploads` | Directory for incoming files |
| `TEMP_DIR` | `temp` | Directory for converted/chunked files |
| `ALLOWED_FORMATS` | `mp3,wav,m4a,ogg,flac,webm,mp4,mpeg` | Comma-separated allowed extensions |

---

## API Reference

### Base URL
```
http://localhost:3000/api/transcriptions
```

---

### `GET /health`

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-07-15T10:30:00.000Z",
  "supportedFormats": ["mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4", "mpeg"]
}
```

---

### `POST /sync`
Synchronous transcription — waits and returns the full result. Best for files under ~10 minutes.

| Property | Value |
|---|---|
| Content-Type | `multipart/form-data` |
| Field name | `audio` |
| Accepted formats | mp3, wav, m4a, ogg, flac, webm, mp4, mpeg |
| Max size | 100 MB |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "completed",
    "language": "english",
    "duration": 45.3,
    "text": "Hello, this is a test of the transcription pipeline.",
    "segments": [
      { "id": 0, "start": 0.0, "end": 4.2, "text": "Hello, this is a test.", "confidence": 0.98 },
      { "id": 1, "start": 4.2, "end": 9.1, "text": "The pipeline is working.", "confidence": 0.97 }
    ],
    "processingTimeMs": 3240,
    "metadata": {
      "originalName": "interview.mp3",
      "mimeType": "audio/mpeg",
      "sizeBytes": 512000,
      "format": "mp3",
      "wasConverted": false,
      "chunksProcessed": 1
    }
  }
}
```

---

### `POST /async`
Asynchronous transcription — returns a `jobId` immediately and processes in the background. Best for files longer than 10 minutes.

Same request body as `/sync`.

**Response `202`**
```json
{
  "success": true,
  "data": { "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479" },
  "message": "Job accepted. Poll GET /api/transcriptions/jobs/f47ac10b-... for status."
}
```

---

### `GET /jobs/:jobId`
Poll the status of an async job.

**Processing**
```json
{ "success": true, "data": { "jobId": "...", "status": "processing" } }
```

**Completed** — `result` has the same shape as the `/sync` response.
```json
{ "success": true, "data": { "jobId": "...", "status": "completed", "result": {} } }
```

**Failed**
```json
{ "success": true, "data": { "jobId": "...", "status": "failed", "error": "Reason" } }
```

---

## Testing with Postman / Thunder Client

### Sync endpoint
1. Method → `POST` | URL → `http://localhost:3000/api/transcriptions/sync`
2. Body → `form-data` → Key: `audio` | Type: **File** → select your audio file
3. Hit **Send**

### Async endpoint
1. Same as above but URL → `.../async`
2. Copy `jobId` from response
3. New request → `GET http://localhost:3000/api/transcriptions/jobs/<jobId>`
4. Keep polling until `status` is `"completed"`

> ⚠️ Never manually set the `Content-Type` header — Postman sets it automatically with the correct `boundary` when using `form-data`. Setting it manually will break the upload.

---

## Design Decisions

### 1. Handling Different Audio Formats

Files are uploaded via `multipart/form-data`. The extension is validated against `ALLOWED_FORMATS` — unsupported formats are rejected with `HTTP 415` before saving to disk. If the format isn't natively supported by Whisper (e.g. `flac`, `ogg`), `ffmpeg` automatically converts it to MP3 before transcription. Temp files are deleted after every request.

```
Upload .ogg ──▶ Validate ✅ ──▶ Convert to .mp3 (ffmpeg) ──▶ Transcribe ──▶ Cleanup
Upload .mp3 ──▶ Validate ✅ ──▶ Native format, skip conversion ──▶ Transcribe
Upload .pdf ──▶ Validate ❌ ──▶ HTTP 415 Unsupported Media Type
```

### 2. Transcription with Timestamps

Groq is called with `response_format: 'verbose_json'` and `timestamp_granularities: ['segment']`, returning each spoken segment with `start`, `end`, and `avg_logprob`. The `avg_logprob` is converted to a human-readable `confidence` score via `Math.exp()`.

### 3. Sync vs Async Modes

| Mode | Endpoint | When to use |
|---|---|---|
| Synchronous | `POST /sync` | Files < 10 min, result returned immediately |
| Asynchronous | `POST /async` | Files > 10 min, avoids HTTP timeout, poll for result |

Job status is tracked in an in-memory `Map` by `jobId`.

### 4. Handling Long Audio Files

1. **Duration Detection** — `ffprobe` reads the file header to get duration without decoding the whole file
2. **Smart Chunking** — if duration exceeds `CHUNK_DURATION_SECONDS` (default 600s), `ffmpeg` splits it into sequential MP3 chunks
3. **Timestamp Stitching** — each chunk's timestamps are offset by `chunk.startSeconds` before merging, giving globally accurate timestamps across the full file

```
60 min audio
    ├──▶ Chunk 0 (0–10 min)   → offset by 0s
    ├──▶ Chunk 1 (10–20 min)  → offset by 600s
    ├──▶ Chunk 2 (20–30 min)  → offset by 1200s
    └──▶ Merge → single response with correct global timestamps
```

---

## License

MIT