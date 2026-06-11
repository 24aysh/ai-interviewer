# InterVue.AI

An AI-powered technical interviewer that conducts voice interviews based on a candidate's GitHub profile. The interviewer asks computer science questions tailored to the candidate's projects and evaluates the conversation at the end to produce a score and written feedback.

## How It Works

1. Enter your GitHub profile URL.
2. The backend fetches your public repositories and creates an interview session.
3. A real-time voice call is established using WebRTC and the OpenAI Realtime API.
4. The AI asks technical questions based on your GitHub projects. You respond by speaking.
5. When you end the interview, the full transcript is evaluated by Gemini and a score with feedback is returned.

## Architecture

### System Overview

```mermaid
graph TD
    User["Browser (React)"]
    Backend["Express Backend (port 3001)"]
    DB["PostgreSQL (via Prisma)"]
    GitHub["GitHub REST API"]
    OpenAI["OpenAI Realtime API"]
    Deepgram["Deepgram Transcription API"]
    Gemini["Google Gemini API"]

    User -->|"POST /api/v1/pre-interview\n(GitHub URL)"| Backend
    Backend -->|"Fetch public repos"| GitHub
    Backend -->|"Store interview session"| DB

    User -->|"POST /api/v1/session/:id\n(SDP offer)"| Backend
    Backend -->|"WebRTC signalling\n(SDP answer)"| OpenAI
    Backend -->|"Sideband WebSocket\n(session.update with GitHub context)"| OpenAI
    OpenAI -->|"Audio stream"| User

    User -->|"Microphone audio"| Deepgram
    Deepgram -->|"Transcript"| User
    User -->|"POST /api/v1/session/user/:id\n(transcript chunk)"| Backend
    Backend -->|"Store user messages"| DB

    User -->|"GET /api/v1/results/:id"| Backend
    Backend -->|"Full transcript"| Gemini
    Gemini -->|"Score + feedback"| Backend
    Backend -->|"Return results"| User
```

### Data Model

```mermaid
erDiagram
    Interview {
        String id PK
        Json githubMetaData
        InterviewStatus status
        Int score
        String feedback
    }
    Message {
        String id PK
        String message
        MessageType type
        String interviewId FK
        DateTime createdAt
    }
    Interview ||--o{ Message : "conversations"
```

### Interview Lifecycle

```mermaid
sequenceDiagram
    participant Browser
    participant Backend
    participant OpenAI
    participant Deepgram
    participant Gemini

    Browser->>Backend: POST /pre-interview (GitHub URL)
    Backend->>GitHub API: GET /users/:username/repos
    Backend->>DB: Create Interview record (status: Pre)
    Backend-->>Browser: { id: interviewId }

    Browser->>Backend: POST /session/:interviewId (SDP offer)
    Backend->>OpenAI: POST /v1/realtime/calls (SDP + config)
    OpenAI-->>Backend: SDP answer + callId
    Backend-->>Browser: SDP answer
    Backend->>OpenAI: WebSocket session.update (inject GitHub context)

    Note over Browser,OpenAI: WebRTC audio channel active

    loop During interview
        Browser->>Deepgram: Stream microphone audio (WebSocket)
        Deepgram-->>Browser: Transcript chunk
        Browser->>Backend: POST /session/user/:id (transcript)
        Backend->>DB: Store user message
        OpenAI->>Backend: response.done event (via sideband WebSocket)
        Backend->>DB: Store assistant message
    end

    Browser->>Backend: GET /results/:interviewId
    Backend->>Gemini: Full conversation transcript
    Gemini-->>Backend: Score (0-10) + feedback text
    Backend->>DB: Update interview (status: Done, score, feedback)
    Backend-->>Browser: Transcript + score + feedback
```

## Repository Structure

```
mercor-ai-interviewer/
├── apps/
│   ├── backend/            # Express server
│   │   ├── index.ts        # API routes
│   │   ├── sideband.ts     # OpenAI sideband WebSocket (injects interview context)
│   │   ├── result.ts       # Gemini evaluation logic
│   │   ├── db.ts           # Prisma client instance
│   │   ├── types.ts        # Zod request validation schemas
│   │   └── prisma/
│   │       └── schema.prisma
│   └── frontend/           # React + Bun frontend
│       └── src/
│           ├── App.tsx
│           └── components/
│               ├── Forms.tsx       # GitHub URL entry
│               ├── Interview.tsx   # WebRTC + Deepgram session
│               └── Results.tsx     # Score and feedback display
├── packages/
│   ├── ui/                 # Shared component library
│   ├── eslint-config/
│   └── typescript-config/
└── turbo.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Bun, Tailwind CSS, shadcn/ui |
| Backend | Express 5, Bun runtime |
| Database | PostgreSQL, Prisma ORM |
| Voice AI | OpenAI Realtime API (WebRTC) |
| Transcription | Deepgram |
| Evaluation | Google Gemini |
| Monorepo | Turborepo |

## Local Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- Node.js >= 18
- PostgreSQL running locally (or a remote connection string)
- API keys for OpenAI, Deepgram, and Google Gemini

### 1. Clone and install

```sh
git clone https://github.com/your-username/mercor-ai-interviewer.git
cd mercor-ai-interviewer
bun install
```

### 2. Configure environment variables

Create `apps/backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mercor"
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="AIza..."
```

Create `apps/frontend/src/.env`:

```env
VITE_BACKEND_URL="http://localhost:3001"
```

### 3. Set up the database

```sh
cd apps/backend
bunx prisma migrate dev
```

### 4. Run the development servers

From the repository root:

```sh
bun run dev
```

This starts both the backend (port 3001) and frontend (port 3000) via Turborepo.

To run each individually:

```sh
# Backend only
cd apps/backend
bun --hot index.ts

# Frontend only
cd apps/frontend
bun --hot src/index.ts
```

### 5. Open the app

Visit `http://localhost:3000` in your browser.

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/pre-interview` | Accepts `{ github: string }`, fetches repos, creates an interview session. Returns `{ id }`. |
| `POST` | `/api/v1/session/:interviewId` | Accepts a WebRTC SDP offer, forwards to OpenAI Realtime, returns the SDP answer. |
| `POST` | `/api/v1/session/user/:interviewId` | Stores a user transcript chunk `{ message: string }`. |
| `GET` | `/api/v1/results/:interviewId` | Returns the full transcript, score, and feedback. Triggers evaluation if not already done. |

## Notes

- The Deepgram API key is currently hard-coded in `Interview.tsx`. Move it to an environment variable before deploying.
- The sideband WebSocket in `sideband.ts` connects to OpenAI's Realtime API server-side to inject the system prompt (GitHub context) after the WebRTC call is established. This runs in parallel with the WebRTC audio channel.
- Evaluation is triggered lazily on the first `GET /results` call after the interview ends.
