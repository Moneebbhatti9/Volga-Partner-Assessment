# Transcription API

## Prerequisites

- Node.js v18+
- [Groq API Key](https://console.groq.com) (free)
- ffmpeg installed on your machine

**Install ffmpeg:**
```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt-get install ffmpeg

# Windows — download from https://www.gyan.dev/ffmpeg/builds/
# Extract and add to your system PATH
```

---

## Setup & Run

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment**
```bash
cp .env.example .env
```

Open `.env` and add your key:
```env
GROQ_API_KEY=gsk_your_key_here
```

**3. Start development server**
```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## Testing the API

### Health Check
```
GET http://localhost:3000/api/transcriptions/health
```

---

### Synchronous Transcription
Use for short/medium audio files (under 10 min). Request waits and returns the full result.

```
POST http://localhost:3000/api/transcriptions/sync
Content-Type: multipart/form-data

Field: audio → (your audio file)
```

Supported formats: `mp3, wav, m4a, ogg, flac, webm, mp4, mpeg`

**In Thunder Client / Postman:**
1. Method: `POST`
2. URL: `http://localhost:3000/api/transcriptions/sync`
3. Body → `Form` → add field `audio` → type `File` → select your file
4. Hit Send

**Example response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "completed",
    "language": "english",
    "duration": 45.3,
    "text": "Full transcript here...",
    "segments": [
      { "id": 0, "start": 0.0, "end": 4.2, "text": "Hello world.", "confidence": 0.98 }
    ],
    "processingTimeMs": 3200
  }
}
```

---

### Asynchronous Transcription
Use for long audio files (10+ min). Returns a `jobId` immediately — poll separately for the result.

**Step 1 — Submit the file:**
```
POST http://localhost:3000/api/transcriptions/async
Content-Type: multipart/form-data

Field: audio → (your audio file)
```

**Response:**
```json
{
  "success": true,
  "data": { "jobId": "abc-123" }
}
```

**Step 2 — Poll for result:**
```
GET http://localhost:3000/api/transcriptions/jobs/abc-123
```

Keep polling until `status` changes from `processing` to `completed`. The completed response has the same shape as the sync response above.