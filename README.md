# Stashly

Build a memory of everything you read using local embeddings and semantic search.


## Features
- **Save Links**: Quickly save URLs with automatic metadata extraction (title, description)
- **Local Embeddings**: Generate 768-dimensional embeddings using Ollama's `nomic-embed-text` model (100% offline)
- **Semantic Search**: Find saved links by concept, not just keywords, using pgvector cosine similarity
- **Privacy-First**: All processing happens locally; no external API calls or data transmission
- **Docker Ready**: One-command setup with `docker-compose` for PostgreSQL, pgvector, and Ollama
- **Modern Stack**: NestJS backend + Next.js frontend with TypeScript and Tailwind CSS

## Architecture Flowchart

<img width="1110" height="384" alt="image" src="https://github.com/user-attachments/assets/5ade2fb3-4f30-48e2-b226-64faeeb85403" />

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS | Dashboard UI for saving/searching links |
| **Backend** | NestJS, TypeScript, class-validator | RESTful API with modular architecture |
| **Database** | PostgreSQL, Prisma, pgvector | Vector storage and similarity search |
| **Embeddings** | Ollama, 768 dimensions | Local embedding generation |
| **Infrastructure** | Docker| Containerized dev/production environment |

## Quick Start (TL;DR)

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Install dependencies (monorepo)
npm install

# 3. Set up database
npm run prisma:migrate:dev

# 4. Start backend (Terminal 1)
npm run start:backend

# 5. Start frontend (Terminal 2)
npm run start:frontend

# Open http://localhost:3001
```

<<<<<<< HEAD
**Key Points:**
- Docker needed (PostgreSQL + Ollama)
- Two terminals: one for backend, one for frontend
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`

## Features

- **Save Links**: Quickly save URLs with automatic metadata extraction (title, description)
- **Local Embeddings**: Generate 768-dimensional embeddings using Ollama's `nomic-embed-text` model (100% offline)
- **Semantic Search**: Find saved links by concept, not just keywords, using pgvector cosine similarity
- **Privacy-First**: All processing happens locally; no external API calls or data transmission
- **Docker Ready**: One-command setup with `docker-compose` for PostgreSQL, pgvector, and Ollama
- **Modern Stack**: NestJS backend + Next.js frontend with TypeScript and Tailwind CSS

## Screenshot

Dashboard UI with save link input (left) and semantic search interface (right), displaying search results with similarity scores.

## Architecture Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                     Stashly Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SAVE LINK FLOW:                                                │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │  User Pastes│───▶│ Extract Metadata │───▶│  Generate    │   │
│  │  Link URL   │    │  (title, desc)   │    │  Embedding   │   │
│  └─────────────┘    │  via Fetch + DOM │    │  (Ollama)    │   │
│                     │  Parser          │    │  768 dims    │   │
│                     └──────────────────┘    └───────┬──────┘   │
│                                                     │           │
│                                            ┌────────▼────────┐  │
│                                            │ Store in DB:    │  │
│                                            │ - URL, title,   │  │
│                                            │ - embedding     │  │
│                                            │ - userId        │  │
│                                            └────────────────┘  │
│                                                                 │
│  SEARCH FLOW:                                                   │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │   User Query │───▶│  Generate Query  │───▶│ pgvector     │  │
│  │              │    │  Embedding       │    │ Cosine Sim   │  │
│  └──────────────┘    │  (Ollama)        │    │ (top 5)      │  │
│                      │  768 dims        │    │ Filter by    │  │
│                      └──────────────────┘    │ userId       │  │
│                                              └───────┬──────┘  │
│                                                      │          │
│                                             ┌────────▼────────┐ │
│                                             │ Return Results  │ │
│                                             │ with Scores     │ │
│                                             └────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16.1+, React 19, TypeScript, Tailwind CSS | Dashboard UI for saving/searching links |
| **Backend** | NestJS 10+, TypeScript 5.1+, class-validator | RESTful API with modular architecture |
| **Database** | PostgreSQL 16, Prisma 5.12+, pgvector | Vector storage and similarity search |
| **Embeddings** | Ollama (nomic-embed-text), 768 dimensions | Local embedding generation |
| **Infrastructure** | Docker, Docker Compose | Containerized dev/production environment |
| **Package Manager** | npm | Dependency management |

=======
>>>>>>> 5b413f236d3245f214f366f42003ff7ef5373b77
## Installation

### Prerequisites
- **Node.js**: 18+ (installed)
- **Docker & Docker Compose**: [Download](https://www.docker.com/products/docker-desktop)
- **Git**: For cloning the repository

### Step 1: Clone the Repository

```bash
<<<<<<< HEAD
git clone https://github.com/yourusername/Stashly.git
cd Stashly
=======
git clone https://github.com/Rahi-padwal/linkRecall.git
cd linkRecall
>>>>>>> 5b413f236d3245f214f366f42003ff7ef5373b77
```

### Step 2: Start Infrastructure (PostgreSQL + Ollama)

```bash
docker-compose up -d
```

Wait ~30 seconds for services to stabilize. Verify with:

```bash
docker-compose ps
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Set Up the Database

```bash
npm run prisma:migrate:dev
```

### Step 5: Start Backend Server

```bash
npm run start:backend
```

Backend runs on `http://localhost:3000`.

### Step 6: Start Frontend (in new terminal)

```bash
npm run start:frontend
```

Frontend runs on `http://localhost:3001`.

**Note**: If ports conflict, update `apps/web/package.json`:

```json
"dev": "next dev -p 3001"
```

## Usage

### Saving a Link

1. Open the dashboard at `http://localhost:3000`
2. Paste a URL in the **"Save a Link"** input field
3. Click **"Save"** button
4. The system:
   - Fetches the page's metadata (title, description)
   - Generates a 768-dimensional embedding via Ollama
   - Stores the link in PostgreSQL

### Searching Links

1. Type a search query in the **"Search your links"** field (e.g., "machine learning", "security", "APIs")
2. Click **"Search"**
3. Results display:
   - **Title**: Extracted from the saved link's page
   - **URL**: Original link
   - **Score**: Cosine similarity (0–1, higher = more relevant)


## Development

### Project Structure

```
Stashly/
├── apps/
│   ├── backend/               # NestJS backend
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── common/
│   │   │   │   ├── embedding/        # Ollama integration
│   │   │   │   └── prisma/           # Database client
│   │   │   ├── links/               # Link save/search logic
│   │   │   └── auth/                # Auth module (stub)
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── migrations/          # DB migrations
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   └── web/                   # Next.js frontend
│       ├── app/
│       │   ├── page.tsx       # Dashboard UI
│       │   └── globals.css
│       └── package.json
├── docker/
│   └── initdb/
│       └── 001_enable_pgvector.sql
├── docker-compose.yml
├── package.json
└── README.md
```

<<<<<<< HEAD
### Key Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/stashly
OLLAMA_EMBEDDINGS_URL=http://127.0.0.1:11434/api/embeddings
PORT=3000
NODE_ENV=development
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Running Tests

```bash
npm run test           # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report
```

=======
>>>>>>> 5b413f236d3245f214f366f42003ff7ef5373b77
### Database Migrations

Create a new migration after updating `prisma/schema.prisma`:

```bash
npm run prisma:migrate:dev -- --name add_new_field
```

Deploy migrations in production:

```bash
npm run prisma:migrate:deploy
```

### Debugging

Enable debug logging in the backend by setting:

```env
DEBUG=Stashly:*
```

Frontend uses React DevTools; inspect network requests in browser DevTools.

## Deployment

### Docker Production Build

```bash
docker build -t stashly:latest .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e OLLAMA_EMBEDDINGS_URL="http://ollama:11434/api/embeddings" \
  stashly:latest
```

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository** on GitHub
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Commit changes**: `git commit -m "Add your feature"`
4. **Push to branch**: `git push origin feature/your-feature-name`
5. **Open a Pull Request** with a clear description

### Reporting Issues

Please use [GitHub Issues](https://github.com/yourusername/Stashly/issues) to report bugs or suggest features. Include:
- A clear title and description
- Steps to reproduce (if applicable)
- Your environment (OS, Node version, Docker version)

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.
<<<<<<< HEAD

## Support

- **Documentation**: See this README and inline code comments
- **Issues**: [GitHub Issues](https://github.com/yourusername/Stashly/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/Stashly/discussions)

---

**Built with ❤️ for semantic recall and offline-first knowledge management.**
=======
>>>>>>> 5b413f236d3245f214f366f42003ff7ef5373b77
