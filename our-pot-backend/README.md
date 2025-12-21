# OurPot Backend (Cloudflare Workers)

AI Gateway backend for OurPot expense tracker. Handles OpenAI API calls with streaming support.

## Features

- Hono web framework (lightweight, fast)
- Streaming AI responses (compatible with Vercel AI SDK)
- Cloudflare Workers deployment (global edge network)
- CORS support for mobile/web clients
- Environment-based configuration (dev/production)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works fine)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .dev.vars
# Edit .dev.vars and add your OPENAI_API_KEY

# Start development server
npm run dev
```

Server runs at: **http://localhost:8787**

### Test the API

**Health check:**
```bash
curl http://localhost:8787/health
```

**Chat endpoint:**
```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Deployment

### 1. Set Secrets

Secrets are stored securely in Cloudflare Workers and not in the codebase.

```bash
# Required: OpenAI API key
wrangler secret put OPENAI_API_KEY --env production
# Paste your sk-proj-... key when prompted

# Optional: Allowed CORS origins (comma-separated)
wrangler secret put ALLOWED_ORIGINS --env production
# Example: https://your-frontend.vercel.app,capacitor://localhost
```

### 2. Deploy to Production

```bash
npm run deploy:production
```

After deployment, note the worker URL from the output:
```
https://our-pot-backend-production.your-subdomain.workers.dev
```

### 3. Update Frontend

Update your frontend `.env.local` with the deployed backend URL:

```bash
NEXT_PUBLIC_BACKEND_URL=https://our-pot-backend-production.your-subdomain.workers.dev
```

## Project Structure

```
our-pot-backend/
├── src/
│   ├── index.ts              # Main Hono app with CORS
│   ├── routes/
│   │   └── chat.ts           # Streaming chat endpoint
│   ├── middleware/
│   │   └── error-handler.ts  # Global error handling
│   └── lib/
│       └── ai/
│           ├── prompts.ts    # System prompts for AI
│           └── tools.ts      # Tool schemas
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json              # Dependencies & scripts
├── .env.example              # Environment template
└── README.md                 # This file
```

## API Endpoints

### POST /api/chat

Streaming chat endpoint compatible with Vercel AI SDK's `useChat` hook.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "I paid £42 for groceries"}
  ],
  "tools": {
    // Optional: tool schemas (defaults to built-in tools)
  }
}
```

**Response:**
- Content-Type: `text/plain; charset=utf-8`
- Body: Streaming data in Vercel AI SDK format
- Tool calls are sent back to client for execution

### GET /health

Health check endpoint to verify backend is running.

**Response:**
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2025-12-21T12:00:00.000Z"
}
```

## Environment Variables

### Local Development (.dev.vars)

Create `.dev.vars` file in the project root:

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
ALLOWED_ORIGINS=http://localhost:3000,capacitor://localhost
```

**Important:** `.dev.vars` is gitignored and only used locally.

### Production (Cloudflare Secrets)

Set via `wrangler secret put`:

- **OPENAI_API_KEY** (required) - Your OpenAI API key
- **ALLOWED_ORIGINS** (optional) - Comma-separated list of allowed CORS origins

## Troubleshooting

### "OPENAI_API_KEY not configured"

**Problem:** Backend can't find the OpenAI API key.

**Solution:**
```bash
# For production
wrangler secret put OPENAI_API_KEY --env production

# For local development
# Make sure .dev.vars exists and contains:
# OPENAI_API_KEY=sk-proj-...
```

### CORS errors in browser/app

**Problem:** Frontend can't connect due to CORS restrictions.

**Solution:**
```bash
# Set allowed origins for production
wrangler secret put ALLOWED_ORIGINS --env production
# Enter: https://your-frontend.vercel.app,capacitor://localhost

# For local development, update .dev.vars:
# ALLOWED_ORIGINS=http://localhost:3000,capacitor://localhost
```

### Streaming not working locally

**Known Issue:** Wrangler dev may have issues with streaming responses.

**Workaround:** Deploy to staging for testing:
```bash
npm run deploy
```

### TypeScript errors

**Problem:** Import errors or type mismatches.

**Solution:**
```bash
# Regenerate Cloudflare types
npm run cf-typegen

# Check TypeScript compilation
npx tsc --noEmit
```

## Scripts

- `npm run dev` - Start local development server (wrangler dev)
- `npm run deploy` - Deploy to default environment
- `npm run deploy:production` - Deploy to production environment
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare bindings

## Architecture

**Role:** AI Gateway (stateless proxy)

```
Mobile App (Capacitor)
    ↓ HTTPS
Backend (Cloudflare Workers)
    ↓ HTTPS
OpenAI API (GPT-4 Turbo)
```

**Key Design:**
- Backend proxies streaming AI responses
- Tool execution happens **client-side** (in mobile app)
- No data persistence (stateless)
- API key managed centrally (not exposed to client)

## Links

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Cloudflare Workers logs in the dashboard
3. Check browser/app console for error messages
4. Verify environment variables are set correctly
