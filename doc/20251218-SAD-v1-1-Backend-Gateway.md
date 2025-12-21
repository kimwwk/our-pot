# Software Architecture Document v1.1 - Backend Gateway Addition

**Date:** 2025-12-21
**Version:** 1.1
**Status:** Implemented

---

## Summary

v1.1 introduces a lightweight backend gateway (Hono on Cloudflare Workers) to centralize OpenAI API key management while preserving the local-first, stateless architecture of v1.0. All financial data and tool execution remain client-side. This change is primarily infrastructural with minimal impact on user experience or development workflow.

---

## Changes from v1.0

### 1. System Architecture Update

**v1.0 Architecture:**
```
Mobile App (Capacitor) → OpenAI API directly
└── API key stored in app (BYOK model)
```

**v1.1 Architecture:**
```
Mobile App (Capacitor) → Hono Backend (Cloudflare Workers) → OpenAI API
└── API key managed centrally in backend
```

---

### 2. Component Additions

#### 2.1 New Backend Service (`our-pot-backend`)

**Technology Stack:**
- Hono 4.11.1 (web framework - lightweight, edge-optimized)
- Cloudflare Workers (serverless, global edge deployment)
- Vercel AI SDK 5.x (streaming support)
- Zod 4.2.1 (schema validation)

**Responsibilities:**
- Proxy AI streaming requests to OpenAI
- Manage OpenAI API key centrally (Cloudflare secret)
- Handle CORS for mobile/web clients
- No data persistence (stateless gateway)

**Key Constraints:**
- **Stateless:** No database, no sessions, no user data storage
- **AI Gateway only:** Tool execution remains client-side
- **Local-first preserved:** Maintains v1.0 data sovereignty

**Project Structure:**
```
our-pot-backend/
├── src/
│   ├── index.ts              # Main Hono app with CORS
│   ├── routes/chat.ts        # Streaming chat endpoint
│   ├── middleware/error-handler.ts
│   └── lib/ai/
│       ├── prompts.ts        # System prompt (copied from frontend)
│       └── tools.ts          # Tool schemas (copied from frontend)
├── wrangler.jsonc            # Cloudflare configuration
├── package.json
└── README.md                 # Deployment instructions
```

#### 2.2 Frontend Changes

**Modified Files:**
- `components/features/agent/AgentChatPanel.tsx` (line 44)
  - Changed `api: "/api/chat"` → `api: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/chat"`
  - Removed `headers: { "x-openai-api-key": ... }`
- `.env.local.example` - Replaced `NEXT_PUBLIC_OPENAI_API_KEY` with `NEXT_PUBLIC_BACKEND_URL`
- `.env.local` - Created with `NEXT_PUBLIC_BACKEND_URL=http://localhost:8787`

**Removed Files:**
- `/app/api/chat/route.ts` - No longer needed (backend handles this)

---

### 3. Deployment Model

**v1.0:** Single deployment
- Static Next.js export + Capacitor wrapper

**v1.1:** Two deployments
1. **Backend:** Cloudflare Workers (global edge network)
   - Deploy: `npm run deploy:production` (from `our-pot-backend/`)
   - Secrets: `wrangler secret put OPENAI_API_KEY --env production`
   - URL: `https://our-pot-backend-production.*.workers.dev`

2. **Frontend:** Static Next.js export + Capacitor (unchanged)
   - Deploy: Same as v1.0
   - Environment: Must set `NEXT_PUBLIC_BACKEND_URL` to backend URL

---

### 4. API Key Management

| Aspect | v1.0 (BYOK) | v1.1 (Centralized) |
|--------|-------------|---------------------|
| **Storage** | Frontend env variable (`NEXT_PUBLIC_OPENAI_API_KEY`) | Backend secret (Cloudflare encrypted) |
| **Exposure** | Exposed to client | Not exposed (backend-only) |
| **Ownership** | User provides their own key | Single key managed centrally |
| **Cost** | User pays for their usage | Centralized cost (all users share) |

---

### 5. Security Improvements

**Added:**
- ✅ API key no longer exposed to client code
- ✅ CORS restrictions on backend (configurable via `ALLOWED_ORIGINS`)
- ✅ Environment-based secrets management (Cloudflare Workers secrets)

**Unchanged:**
- ✅ All financial data remains local (SQLite on device)
- ✅ Tool execution still client-side
- ✅ No user authentication (deferred to future version)

---

### 6. Architecture Diagrams

#### System Overview (Updated)

```
┌─────────────────────────────────────────┐
│        User Device (Android)            │
│  ┌───────────────────────────────────┐  │
│  │ Capacitor Native Container        │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Next.js App (Static)        │  │  │
│  │  │  - UI Components            │  │  │
│  │  │  - SQLite Context           │  │  │
│  │  │  - Data Access Layer        │  │  │
│  │  │  - AI Agent (Tool Execution)│  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Capacitor SQLite Plugin     │  │  │
│  │  │  - Native SQLite Database   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           │
           │ HTTPS
           ▼
┌─────────────────────────────────────────┐
│  Backend (Cloudflare Workers - NEW)     │
│  ┌───────────────────────────────────┐  │
│  │ Hono Application                  │  │
│  │  - Chat endpoint (streaming)      │  │
│  │  - CORS middleware                │  │
│  │  - Tool schemas                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           │
           │ HTTPS (with API key)
           ▼
┌─────────────────────────────────────────┐
│        OpenAI API                       │
│  - GPT-4 Turbo                          │
│  - Streaming responses                  │
│  - Tool calls                           │
└─────────────────────────────────────────┘
```

#### Data Flow (Updated)

**AI Agent Interaction (v1.1):**

```
1. User input → AgentChatPanel (client)
2. useChat hook → POST /api/chat (backend)
3. Backend → OpenAI API (with tool schemas + API key)
4. OpenAI → Streaming response with tool calls
5. Backend → Proxy stream to client (transparent)
6. Client onToolCall → Execute tools locally (SQLite)
7. Tool results → Sent to backend
8. Backend → OpenAI (next iteration)
9. Repeat until complete or confirmChangeSet()
```

**Key:** Backend is a **transparent proxy** - tool execution logic unchanged.

---

### 7. Infrastructure Costs

| Component | v1.0 | v1.1 |
|-----------|------|------|
| **Frontend** | Free (static hosting) | Free (static hosting) |
| **Backend** | N/A | Free tier: 100k requests/day |
| **OpenAI API** | User pays (BYOK) | Centralized (you pay) |

**Recommendation:** Monitor OpenAI API usage via platform dashboard. Consider rate limiting if costs grow.

---

### 8. Future Evolution Path

**v1.1 enables (without breaking changes):**
- User authentication (JWT tokens)
- Usage analytics (track API calls per user)
- Rate limiting per user/device
- Alternative AI providers (Anthropic, Gemini, etc.)
- Backend-executed tools (if multi-device sync added later)

**v1.1 does NOT enable (still deferred):**
- Multi-device sync (still local-only)
- Cloud data storage (SQLite remains device-only)
- Backend data persistence (stateless design)

---

### 9. Migration Impact

#### Breaking Changes
- ✅ **Frontend environment variable change:**
  - Old: `NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...`
  - New: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8787`
- ✅ **Deployment sequence:** Backend must be deployed before frontend update

#### Non-Breaking
- ✅ Tool execution logic unchanged (same codebase paths)
- ✅ Database schema unchanged (no migrations needed)
- ✅ User experience unchanged (same AI behavior)

---

### 10. Rollback Plan

If issues occur post-deployment:

**Option 1: Frontend-only rollback** (fastest)
1. Restore `/app/api/chat/route.ts` from git history
2. Revert `AgentChatPanel.tsx` to use `/api/chat`
3. Restore `NEXT_PUBLIC_OPENAI_API_KEY` in `.env.local`
4. Redeploy frontend
5. Backend remains deployed but unused

**Option 2: Full rollback**
1. `git revert <commit-hash>` for all v1.1 changes
2. Delete Cloudflare Worker: `wrangler delete --env production`
3. Redeploy both services

---

## Related SAD Sections

### Updated Sections
- **Section 2: System Overview** - Added backend component to architecture diagram
- **Section 5: AI & Agent Integration** - Updated with backend proxy pattern
- **Section 7: Development & Build Workflow** - Added backend local/deploy instructions

### Unchanged Sections
- **Section 1:** Introduction & Goals
- **Section 3:** Data Layer & Persistence
- **Section 4:** ChangeSet Domain Logic
- **Section 6:** Frontend Architecture
- **Section 8:** Packaging & Distribution
- **Section 9:** Future Evolution

---

## Implementation Files

### Backend (New)
- `our-pot-backend/src/index.ts` - Main Hono app
- `our-pot-backend/src/routes/chat.ts` - Streaming endpoint
- `our-pot-backend/src/middleware/error-handler.ts` - Error handling
- `our-pot-backend/src/lib/ai/prompts.ts` - System prompt
- `our-pot-backend/src/lib/ai/tools.ts` - Tool schemas
- `our-pot-backend/wrangler.jsonc` - Cloudflare config
- `our-pot-backend/README.md` - Setup/deployment guide

### Frontend (Modified)
- `our-pot/components/features/agent/AgentChatPanel.tsx:44` - API endpoint
- `our-pot/.env.local.example` - Environment template
- `our-pot/.env.local` - Local development config

### Frontend (Deleted)
- `our-pot/app/api/chat/route.ts` - Old Next.js API route (removed)

---

## Testing Checklist

### Local Testing
- ✅ Backend health endpoint: `curl http://localhost:8787/health`
- ✅ Backend chat endpoint accepts requests
- ✅ Frontend connects to local backend
- ✅ AI agent responds to user input
- ✅ Tool execution works (getCategories, searchTransactions, etc.)
- ✅ Review widget appears on confirmChangeSet()
- ✅ Approval workflow completes successfully

### Deployment Testing
- [ ] Backend deploys to Cloudflare Workers
- [ ] Secrets set correctly (`OPENAI_API_KEY`)
- [ ] Frontend environment updated with worker URL
- [ ] Production end-to-end test successful
- [ ] CORS works from mobile app (Capacitor)
- [ ] Error handling works (network failures, invalid requests)

---

## References

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- Backend README: `our-pot-backend/README.md`
