# Stashly

Stashly is a personal link memory system for saving pages, extracting page metadata, generating embeddings, and finding content by meaning instead of exact keywords. The repository is a monorepo with a NestJS backend, a Next.js web app, and a browser extension that shares the same backend API.

## What Stashly Does

Stashly lets a signed-in user save a URL, fetches metadata from that page, stores the content in PostgreSQL, and creates a vector embedding so the link can later be found with semantic search. The web app supports email/password auth and Google sign-in. The browser extension mirrors the same core flows and can be used to save or search without opening the web dashboard.

## Current Implementation Notes

The repository has evolved beyond the earlier Ollama-based design in some of the older docs. The current embedding service uses the Google Gemini embeddings API and requires a Gemini API key. PostgreSQL with pgvector is still the storage layer for vectors, and the application still uses local scraping, local scoring, and local persistence for the rest of the pipeline.

## Major Capabilities

- Save URLs with automatic metadata extraction from Open Graph, Twitter, title, description, keyword meta tags, and the page body.
- Store links per user with JWT-protected access and cascade deletion from the user relationship.
- Generate 768-dimensional embeddings for each link and for each search query.
- Search by concept, not just text match, with blended semantic and keyword scoring.
- View all saved links, delete a single link, delete all links, and reprocess saved links.
- Sign in with email and password or through Google OAuth.
- Use a browser extension as an alternate client for the same backend.
- Run locally with Docker for PostgreSQL and pgvector, and with Docker Compose production orchestration for backend and web.

## How The System Fits Together

User authentication is handled by the NestJS auth module. Email/password accounts are stored in PostgreSQL with hashed passwords, while Google sign-in creates or reuses a user record and returns a JWT. Protected link routes use JWT guards, and the frontend stores the access token and user identity in browser local storage.

When a link is saved, the backend verifies the user, prevents duplicate URLs for the same user, scrapes the target page, stores the link, and then asynchronously generates an embedding. Search works by embedding the query, calculating vector similarity with pgvector, blending that with keyword relevance, and returning the best matches for the current user. Query enrichment exists for a few short abbreviations such as dsa, cp, ml, and os.

## Repository Layout

- apps/backend: NestJS API, Prisma schema, auth, link management, and embedding service.
- apps/web: Next.js dashboard and auth pages.
- apps/extension: Chrome or Edge extension that talks to the deployed backend by default.
- docker: Database bootstrap scripts, including pgvector initialization.
- docker-compose.yml: Development services for PostgreSQL and Ollama.
- docker-compose.prod.yml: Production-style stack for PostgreSQL, backend, and web.
- docs and support files: JWT guides, semantic search fix references, verification notes, and implementation summaries.

## Technology Stack

| Area | Stack | Purpose |
|---|---|---|
| Frontend | Next.js 16.2.2, React 19.2.3, TypeScript | User dashboard and auth flows |
| Backend | NestJS 10, Passport, JWT, class-validator, Prisma | REST API, auth, validation, persistence |
| Database | PostgreSQL 16, pgvector, Prisma | User and link storage with vector search |
| Embeddings | Google Gemini embeddings API | Create 768-dimensional vectors |
| Browser Extension | Manifest V3 extension | Alternate lightweight client |
| Containerization | Docker and Docker Compose | Local and production orchestration |

## Key User Flows

### Authentication

Users can create an account with email and password, sign in with existing credentials, or authenticate with Google. The web app stores the JWT, user ID, and email in local storage. The extension does the same through its popup flow and Google OAuth redirect handling.

### Saving a Link

The frontend or extension sends the URL to the backend. The backend checks that the user exists, prevents duplicates for the same user and URL, scrapes metadata from the page, stores the record, and queues embedding generation. The saved record includes the original URL, optional title and summary, extracted keywords, raw extracted text, and user association.

### Searching

Search accepts a freeform query string. The service embeds the query, evaluates similarity against stored link embeddings, mixes in keyword relevance, applies result filtering, and returns the top matches for the active user.

### Viewing and Cleaning Up

Users can fetch all saved links, delete a single saved link, or delete every link in their own account. There is also an admin reprocess route that can refresh metadata and embeddings for a user’s saved links if the request satisfies the admin guard.

## API Surface

### Health

- GET /health: returns service status.

### Auth

- GET /auth: auth service health check.
- POST /auth/register: create a new email/password account.
- POST /auth/login: exchange credentials for a JWT.
- GET /auth/me: read the current JWT identity.
- GET /auth/google: begin Google OAuth.
- GET /auth/google/callback: finish Google OAuth and redirect back to the frontend or extension.

### Links

- POST /links: save a new URL for the current user.
- GET /links: list saved links for the current user.
- GET /links/search?q=...: semantic search for the current user.
- DELETE /links/:id: delete one link.
- DELETE /links: delete all links for the current user.
- POST /links/admin/reprocess: re-scrape and re-embed the current user’s links when the admin guard allows it.

## Data Model

### User

- id: UUID primary key.
- email: unique email address.
- passwordHash: optional hash for local login users.
- createdAt: creation timestamp.
- links: one-to-many relation to saved links.

### Link

- id: UUID primary key.
- userId: owner reference.
- originalUrl: source URL.
- title: extracted or user-supplied title.
- summary: extracted or user-supplied description.
- keywords: normalized keyword array.
- rawExtractedText: trimmed body or article text used for enrichment and reprocessing.
- embedding: pgvector column with 768 dimensions.
- createdAt: creation timestamp.

## Configuration

The repository uses environment variables rather than hard-coded secrets. The most important values are listed below.

| Variable | Used By | Purpose |
|---|---|---|
| DATABASE_URL | Backend and Prisma | PostgreSQL connection string |
| PORT | Backend | API listen port, defaults to 3000 |
| FRONTEND_ORIGIN | Backend | CORS allowlist origin for the web app |
| NEXT_PUBLIC_API_BASE_URL | Web app and extension | Base URL for API requests |
| JWT_SECRET | Auth module | Signs and verifies access tokens |
| GOOGLE_CLIENT_ID | Google strategy | OAuth client identifier |
| GOOGLE_CLIENT_SECRET | Google strategy | OAuth client secret |
| GOOGLE_CALLBACK_URL | Google strategy | OAuth callback URL |
| GEMINI_API_KEY | Embedding service | Generates embeddings with Gemini |
| GEMINI_EMBEDDING_MODEL | Embedding service | Optional primary model override |
| NODE_ENV | Docker and app config | Runtime mode |

The top-level development compose file also expects a PostgreSQL user, password, and database name of postgres, postgres, and stashly respectively.

## Local Development

1. Start the development services with the root Docker Compose file so PostgreSQL is available. The development stack also includes Ollama because the repository still carries that container in the compose file, but the current embedding implementation uses Gemini instead.
2. Install dependencies at the monorepo root.
3. Run the Prisma migration command from the root scripts to create or update the database schema.
4. Start the backend and web app either separately or together with the root scripts.

The default local ports are 3000 for the backend, 3001 for the web app, 5432 for PostgreSQL, and 11434 for the Ollama container declared in development compose.

## Root Scripts

| Script | Purpose |
|---|---|
| start:dev | Runs backend and frontend together in parallel |
| start:backend | Starts the NestJS backend in watch mode |
| start:frontend | Starts the Next.js web app on port 3001 |
| build | Builds backend and web workspaces |
| lint | Lints backend and web workspaces |
| format | Formats backend and web workspaces |
| prisma:generate | Generates Prisma client code |
| prisma:migrate:dev | Creates and applies a development migration |
| prisma:migrate:deploy | Applies migrations in a production-style environment |
| test | Runs backend unit tests |
| test:e2e | Runs backend end-to-end tests |

## Frontend Details

The web app is a Next.js App Router application with three main pages: the home dashboard, the auth page, and the OAuth callback page. The dashboard provides save, search, view-all, and delete actions. The auth page handles login, registration, and Google sign-in. The callback page reads the token returned from Google auth, stores it, and returns the user to the dashboard.

The UI currently uses browser local storage for session persistence and redirects unauthenticated users back to the auth page.

## Browser Extension Details

The extension is a Manifest V3 popup that supports local credential sign-in, Google sign-in through the browser identity flow, saving the active page URL, semantic search, viewing all saved items, deleting items, and a simple theme toggle. By default it targets the deployed backend URL configured in popup.js and in the manifest host permissions.

If you self-host the backend, both the popup API base URL and the extension host permissions need to match the backend origin.

## Docker Setup

### Development Compose

The development compose file brings up PostgreSQL with pgvector and an Ollama container. The database container initializes pgvector support through the sql script in docker/initdb.

### Production Compose

The production compose file adds the backend and web services on top of PostgreSQL. It wires the backend to PostgreSQL, exposes the backend on port 3000, and exposes the web app on port 3001.

## Operational Notes

- Search results are capped and filtered by score so the system prefers fewer, stronger matches over large noisy result sets.
- The backend enforces validation globally and throttles requests to protect the public search route.
- Duplicate link saves are idempotent for the same user and original URL.
- Link deletion is user-scoped, so one user cannot remove another user’s data.
- Reprocessing existing links can be useful after embedding or scraping changes.
- The admin reprocess endpoint expects an isAdmin property on the authenticated user object, while the current JWT strategy only maps userId and email. That endpoint is therefore a special-case path and should be treated accordingly if you extend auth.

## Troubleshooting

- If authentication fails, confirm JWT_SECRET is set and that the backend can read the Google OAuth variables.
- If link saving works but search returns poor results, reprocess the links after changing scraping or embedding behavior.
- If the frontend cannot talk to the backend, check FRONTEND_ORIGIN on the server side and NEXT_PUBLIC_API_BASE_URL on the client side.
- If the extension cannot sign in, confirm the backend origin matches the extension’s host permissions and OAuth redirect handling.
- If PostgreSQL extensions are missing, make sure the initialization script in docker/initdb actually ran on a fresh volume.
- If embeddings fail, confirm GEMINI_API_KEY is present and the model name is valid for your account.

## Documentation Map

The repository contains several supporting documents beyond this README.

- IMPLEMENTATION_SUMMARY.md: high-level summary of the JWT auth implementation.
- JWT_IMPLEMENTATION.md: detailed auth implementation guide.
- QUICKSTART_JWT.md: JWT quick-start instructions.
- SEMANTIC_SEARCH_FIXES.md: deeper notes on semantic search behavior and fixes.
- SEMANTIC_FIXES_QUICKREF.md: compact semantic search troubleshooting reference.
- VERIFICATION_CHECKLIST.md: verification and validation checklist.
- privacy-policy.md: privacy policy content for the project.
- test-jwt-auth.ps1, test-jwt-auth.sh, test-jwt-auth.bat: test helpers for auth flows.
- test-semantic-fixes.ps1, test-semantic-fixes.sh: test helpers for semantic search scenarios.

## License

The repository metadata currently marks the project as UNLICENSED.
