# AI Audiobook API

A complete NestJS backend for an AI-powered audiobook application that converts PDF documents to audio summaries using OpenAI and ElevenLabs.

[Backend Repository](https://github.com/elkhayate/audiobook-client)

## 🚀 Features

- **PDF Processing**: Extract text from uploaded PDF files
- **AI Summarization**: Generate concise summaries using OpenAI GPT-4
- **Text-to-Speech**: Convert summaries to high-quality audio using ElevenLabs
- **Secure Storage**: Store audio files in Supabase Storage
- **User Authentication**: JWT-based authentication with Supabase
- **Analytics Dashboard**: Track uploads, listening statistics, and trends
- **File Management**: List files, track listen counts, and manage user content

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database & Auth**: Supabase
- **Storage**: Supabase Storage
- **AI Services**: OpenAI (GPT-4), ElevenLabs TTS
- **PDF Processing**: pdf-parse
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js (v18.19.1 or higher)
- npm or yarn
- Supabase account
- OpenAI API key
- ElevenLabs API key

## 🔄 Audio Duration Estimation

The system estimates audio duration using:
- **Formula**: `word_count × 0.004 seconds`
- **Assumption**: ~15 words per second (600 words per minute)

## 🛡️ Security Features

- JWT token validation via Supabase
- File type validation (PDF only)
- File size limits (50MB max)
- User isolation (users can only access their own files)
- Secure file storage with public URLs


## 📁 Project Structure

```
src/
├── auth/
│   └── supabase.guard.ts          # JWT authentication guard
├── upload/
│   ├── upload.controller.ts       # PDF upload endpoint
│   ├── upload.service.ts          # PDF processing logic
│   └── upload.module.ts
├── files/
│   ├── files.controller.ts        # File listing and tracking
│   ├── files.service.ts
│   └── files.module.ts
├── dashboard/
│   ├── dashboard.controller.ts    # Analytics endpoints
│   ├── dashboard.service.ts
│   └── dashboard.module.ts
├── common/
│   └── utils/
│       ├── openai.ts              # OpenAI integration
│       ├── elevenlabs.ts          # ElevenLabs TTS
│       └── storage.ts             # Supabase storage
└── app.module.ts                  # Main application module
```

