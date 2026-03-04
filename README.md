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

## Installation

### Prerequisites
- **Node.js**: 18+ (installed)
- **Docker & Docker Compose**: [Download](https://www.docker.com/products/docker-desktop)
- **Git**: For cloning the repository

### Step 1: Clone the Repository

```bash
git clone https://github.com/Rahi-padwal/linkRecall.git
cd linkRecall
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
linkRecall/
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
DEBUG=linkRecall:*
```

Frontend uses React DevTools; inspect network requests in browser DevTools.

## Deployment

### Docker Production Build

```bash
docker build -t linkrecall:latest .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e OLLAMA_EMBEDDINGS_URL="http://ollama:11434/api/embeddings" \
  linkrecall:latest
```

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository** on GitHub
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Commit changes**: `git commit -m "Add your feature"`
4. **Push to branch**: `git push origin feature/your-feature-name`
5. **Open a Pull Request** with a clear description

### Reporting Issues

Please use [GitHub Issues](https://github.com/yourusername/linkRecall/issues) to report bugs or suggest features. Include:
- A clear title and description
- Steps to reproduce (if applicable)
- Your environment (OS, Node version, Docker version)

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.
