# TODO — Application Chants Liturgiques

---

# Infrastructure & Setup

## [DONE] Initialize Next.js project with TypeScript, App Router, Tailwind CSS, and ESLint

- `npx create-next-app@latest` with TypeScript + App Router + Tailwind
- Configure `tsconfig.json` paths
- Install and configure shadcn/ui
- Set up project directory structure: `app/`, `lib/`, `components/`, `services/`, `prisma/`

## [DONE] Set up Docker Compose for local development

- `docker-compose.yml` with services: `app` (Next.js), `db` (PostgreSQL + pgvector), `minio`, `ollama`, `redis` (optional)
- `.env.example` with all required environment variables
- `Dockerfile` for the Next.js app (multi-stage build)
- Verify all services start cleanly with `docker compose up`

## [DONE] Configure PostgreSQL with pgvector extension

- PostgreSQL Docker image with pgvector enabled (`pgvector/pgvector:pg16`)
- Verify pgvector extension loads: `CREATE EXTENSION IF NOT EXISTS vector;`
- Health check in Docker Compose

## [DONE] Set up Prisma ORM with initial schema

- Install Prisma, initialize with PostgreSQL provider
- Configure `DATABASE_URL` in `.env`
- Add pgvector support via `prisma-extension-pgvector` or raw SQL for vector columns
- Create initial `prisma/schema.prisma` with all models (see Data Model section below)
- Generate Prisma client, run first migration

## [DONE] Configure MinIO for file storage

- MinIO service in Docker Compose with persistent volume
- Create default buckets: `partitions`, `audio` (future)
- Install MinIO JS SDK (`minio` or `@aws-sdk/client-s3`)
- Create `lib/storage.ts` helper for upload/download/presigned URLs

## [DONE] Set up Ollama for local LLM and embeddings

- Ollama service in Docker Compose with model volume
- Script to pull default models on first run (e.g., `mistral`, `nomic-embed-text`)
- Create `lib/ai/provider.ts` abstraction layer (LLM provider interface)
- Create `lib/ai/embeddings.ts` for embedding generation
- Verify embeddings generation works end-to-end

## [DONE] Configure NextAuth.js authentication

- Install `next-auth` v5 (Auth.js)
- Set up credentials provider (email/password)
- Create auth configuration in `app/api/auth/[...nextauth]/route.ts`
- Password hashing with `bcrypt`
- Session management (JWT strategy)
- Middleware for protected routes (`middleware.ts`)

## [DONE] Set up pre-commit hooks and CI quality gates

- Install `husky` + `lint-staged`
- Pre-commit hook: `eslint --fix`, `prettier --write`, `tsc --noEmit`
- Pre-commit hook: `vitest run` (unit tests)
- Configure Vitest for unit and integration tests
- Configure Playwright for E2E tests
- Ensure commit is blocked on any failure

## [DONE] Set up CI/CD pipeline (GitHub Actions)

- Workflow: lint, type-check, unit tests, build
- Docker image build and push on merge to main
- Database migration step in deployment

---

# Data Model (Prisma Schema)

## [DONE] Define User and authentication models

- `User`: id, name, email, passwordHash, createdAt, updatedAt
- `Account`, `Session`, `VerificationToken` (NextAuth required)
- Seed script for a default admin user

## [DONE] Define Paroisse (parish) and role models

- `Paroisse`: id, nom, lieu, adresse, horairesMessesHabituels (JSON)
- `RoleParoisse`: userId, paroisseId, role (enum: ADMIN, ANIMATEUR, CHORISTE, ORGANISTE, PRETRE)
- Unique constraint on (userId, paroisseId, role)

## [DONE] Define Chant and related content models

- `Chant`: id, titre, auteur, compositeur, cote, annee, statut (enum: BROUILLON, VISIBLE_CREATEUR, VALIDE_GLOBAL), createurId, indicateurCompletude, embedding (vector), createdAt, updatedAt
- `VersionParoles`: id, chantId, label, langue, estVersionPrincipale, auteurModificationId, sections (JSON array of {type, numero, texte, voix, indications}), schemaExecution
- `Partition`: id, chantId, fichierUrl, type (enum: MELODIE, SATB, ACCOMPAGNEMENT), tonalite, format
- `Enregistrement`: id, chantId, fichierUrl, duree, format, typeVoix (enum: TOUTES, SOPRANO, ALTO, TENOR, BASSE)

## [DONE] Define Tag/Characterization and correction models

- `Tag`: id, chantId, tempsLiturgiques (string[]), themes (string[]), momentsCelebration (string[]), source (enum: IA, HUMAIN), statut (enum: AUTO, VALIDE, EN_REVISION)
- `DemandeCorrection`: id, chantId, tagId, auteurId, commentaire, ancienneValeur, nouvelleValeur, statut (enum: EN_ATTENTE, APPROUVE, REJETE), adminId, dateTraitement

## [DONE] Define Celebration, FeuilleDeChants, and LigneFeuille models

- `Celebration`: id, paroisseId, date, type (enum), tempsLiturgique, feteEventuelle, lectures (JSON), animateurId, pretreId, statut (enum: EN_PREPARATION, SOUMISE, VALIDEE, PUBLIEE)
- `FeuilleDeChants`: id, celebrationId, statut (enum: BROUILLON, PUBLIEE), pdfUrl
- `LigneFeuille`: id, feuilleId, chantId, versionParolesId, moment (enum), ordre, notes

## [DONE] Define Notification, HistoriqueChant, and PreferenceAnimateur models

- `Notification`: id, utilisateurId, type, contenu, celebrationId (nullable), lue, date
- `HistoriqueChant`: id, chantId, paroisseId, celebrationId, dateUtilisation
- `PreferenceAnimateur`: utilisateurId, chantId, type (enum: EXCLUSION, COUP_DE_COEUR)

## [DONE] Run and validate full Prisma migration

- `npx prisma migrate dev` with all models
- Verify all relations and constraints
- Create seed script with sample data (parish, users, a few songs)

---

# Core Services (Backend)

## [DONE] Implement Romcal liturgical calendar service

- Install `romcal` npm package
- Create `lib/services/liturgical-calendar.ts`
- Functions: get liturgical season for a date, get feast/solemnity, list upcoming celebrations
- Unit tests for key dates (Christmas, Easter, Ordinary Time boundaries)

## [DONE] Implement AELF readings API integration

- Create `lib/services/aelf.ts`
- Fetch daily readings (1ere lecture, psaume, 2eme lecture, evangile) from AELF API
- Fallback handling if API is unavailable
- Cache readings (Redis or in-memory) to avoid repeated calls
- Unit tests with mocked API responses

## [DONE] Implement embedding generation service

- Create `lib/ai/embeddings.ts`
- Generate embeddings for song lyrics via Ollama (`nomic-embed-text` or similar)
- Store embeddings in pgvector column on `Chant`
- Batch embedding generation for seed/import
- Function: `generateEmbedding(text: string): Promise<number[]>`

## [DONE] Implement semantic search service

- Create `lib/services/search.ts`
- Vector similarity search using pgvector (`<=>` cosine distance)
- Hybrid search: combine semantic results with keyword/tag filtering
- API route: `POST /api/search` with query, filters (tempsLiturgique, moment, theme)
- Unit tests for ranking and filtering

## [DONE] Implement song suggestion engine

- Create `lib/services/suggestions.ts`
- Input: celebration date, parish ID
- Steps: fetch readings (AELF) + liturgical context (Romcal) -> generate query embedding -> vector search -> apply scoring weights (readings > feast > season > moment > history > popularity > known repertoire)
- Filter out excluded songs (PreferenceAnimateur)
- Boost favorites (coups de coeur)
- Return 3-5 suggestions per celebration moment
- Unit tests for scoring logic and filters

## [DONE] Implement file upload/download service (MinIO)

- Create `lib/services/storage.ts`
- Upload partition (PDF/image) -> MinIO -> return URL
- Upload audio file -> MinIO -> return URL
- Generate presigned download URLs
- API routes: `POST /api/upload/partition`, `POST /api/upload/audio`
- File size and type validation

## [DONE] Implement AI chat service (LLM)

- Create `lib/ai/chat.ts`
- Ollama chat completion with system prompt for liturgical assistant
- Context-aware: pass current celebration data, readings, selected songs
- Tool/function calling for actions (search song, add to sheet, generate PDF)
- Streaming response support
- API route: `POST /api/chat`

## [DONE] Implement AI auto-characterization service

- Create `lib/ai/characterize.ts`
- Input: song title + lyrics
- Output: temps liturgiques, themes, moments de celebration, ambiance
- Use Ollama with structured output (JSON)
- Called automatically on song creation
- Tags stored with source=IA, statut=AUTO

## [DONE] Implement notification service

- Create `lib/services/notifications.ts`
- Create notifications in DB for events: feuille prête, modification, chants à préparer
- API route: `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- Web push support (service worker) — Phase 2

---

# API Routes

## [DONE] CRUD API for Chants

- `GET /api/chants` — list with pagination, filters (statut, tempsLiturgique, moment)
- `GET /api/chants/:id` — detail with paroles, partitions, enregistrements, tags
- `POST /api/chants` — create (titre + paroles required, auto-characterize via AI)
- `PATCH /api/chants/:id` — update
- `DELETE /api/chants/:id` — soft delete
- Visibility rules: creator sees own drafts, admin validates for global visibility

## [DONE] CRUD API for VersionParoles

- `GET /api/chants/:id/paroles` — list versions
- `POST /api/chants/:id/paroles` — add version
- `PATCH /api/paroles/:id` — update version
- `DELETE /api/paroles/:id` — delete version
- Set principal version

## [DONE] CRUD API for Partitions and Enregistrements

- `POST /api/chants/:id/partitions` — upload partition to MinIO, create DB record
- `GET /api/chants/:id/partitions` — list partitions
- `DELETE /api/partitions/:id` — delete partition + MinIO file
- Same pattern for `Enregistrement` (audio links/files)

## [DONE] CRUD API for Celebrations

- `GET /api/celebrations` — list by parish, date range
- `GET /api/celebrations/:id` — detail with feuille, lignes, suggestions
- `POST /api/celebrations` — create, auto-populate liturgical context via Romcal/AELF
- `PATCH /api/celebrations/:id` — update status, assign animateur/pretre
- Auto-fetch readings and liturgical season on creation

## [DONE] API for FeuilleDeChants and LigneFeuille

- `GET /api/celebrations/:id/feuille` — get sheet with lines
- `POST /api/celebrations/:id/feuille` — create sheet
- `POST /api/feuilles/:id/lignes` — add line (chant + moment + ordre)
- `PATCH /api/lignes/:id` — reorder, change moment
- `DELETE /api/lignes/:id` — remove line
- `POST /api/feuilles/:id/pdf` — generate PDF

## [DONE] API for Suggestions

- `GET /api/celebrations/:id/suggestions` — get AI suggestions per moment
- Query params: includeHistory (bool), moment filter

## API for Paroisses and Roles

- `GET /api/paroisses` — list user's parishes
- `POST /api/paroisses` — create parish
- `PATCH /api/paroisses/:id` — update parish settings
- `GET /api/paroisses/:id/membres` — list members with roles
- `POST /api/paroisses/:id/membres` — invite/add member
- `PATCH /api/paroisses/:id/membres/:userId` — change role
- `DELETE /api/paroisses/:id/membres/:userId` — remove member

## API for Tags and DemandeCorrection

- `GET /api/chants/:id/tags` — get tags
- `POST /api/chants/:id/corrections` — submit correction request
- `GET /api/admin/corrections` — list pending corrections (admin only)
- `PATCH /api/admin/corrections/:id` — approve/reject correction

## API for User preferences

- `GET /api/preferences` — get user's exclusions and favorites
- `POST /api/preferences` — add exclusion or coup de coeur
- `DELETE /api/preferences/:id` — remove preference

## API for Search

- `POST /api/search` — semantic + keyword search
- Params: query, filters (tempsLiturgique[], moments[], themes[]), mode (semantic/tags/hybrid)

## API for Notifications

- `GET /api/notifications` — list user notifications (paginated)
- `PATCH /api/notifications/:id` — mark as read
- `POST /api/notifications/read-all` — mark all as read

---

# Frontend — Layout & Navigation

## Create app layout with sidebar/header navigation

- Responsive layout: sidebar on desktop, bottom nav on mobile
- Header: app logo, parish selector dropdown, user avatar/menu
- Sidebar links: Dashboard, Celebrations, Chants, Recherche, Chat IA, Admin (if role)
- Auth guard: redirect to login if unauthenticated

## Create login and registration pages

- `/login` — email + password form, NextAuth signIn
- `/register` — name, email, password, confirm password
- `/forgot-password` — email input (future: email reset flow)
- Form validation with `zod` + `react-hook-form`
- Redirect to dashboard on success

---

# Frontend — Dashboard (Feature 0)

## Build dashboard page

- Route: `/dashboard`
- Section: "Prochaines celebrations" — list upcoming celebrations for current parish with status badges
- Section: "Derniers chants ajoutes" — recent songs added to the platform
- Quick action buttons: "Nouvelle celebration", "Rechercher un chant", "Chat IA"
- Fetch data via server components + API routes

---

# Frontend — Chants (Features 1, 3, 4, 5)

## Build song list page with search and filters

- Route: `/chants`
- Search bar (keyword + semantic toggle)
- Filter sidebar/dropdown: temps liturgique, moment, theme, recueil
- Song cards: title, author, cote, completeness indicator, tags
- Pagination
- Link to song detail

## Build song detail page (choriste view)

- Route: `/chants/:id`
- Two-column layout: lyrics (left) + partition viewer (right)
- Lyrics: version selector dropdown, sections with refrain/couplets styled distinctly
- Partition: PDF viewer using `react-pdf`, tabs for melodie/SATB/accompagnement
- Audio player at bottom: play/pause, progress bar, voice selector (toutes/soprano/alto/tenor/basse), speed control (0.5x-1.25x)
- External links (YouTube, SoundCloud embeds)

## Build song preview modal

- Modal triggered from suggestion lists and search results
- Tabs: Paroles, Partition, Les deux
- Quick-listen button
- "Selectionner pour [moment]" action button (context-aware)

## Build song creation/edit form (contributeur)

- Route: `/chants/nouveau` and `/chants/:id/edit`
- Fields: titre\*, auteur, compositeur, recueil + numero, tags
- Lyrics editor: add/remove/reorder sections (refrain, couplet, coda, etc.), rich text per section
- Partition upload: drag-and-drop, preview thumbnail
- Audio/video links: add external URLs
- "Completer avec l'IA" button: triggers AI auto-fill (lyrics, characterization)
- Duplicate detection on title input (debounced search)
- Submit: immediate visibility for creator, pending admin validation for global
- Completeness indicator display

---

# Frontend — Celebrations (Feature 2)

## Build celebration list/calendar page

- Route: `/celebrations`
- Calendar view (month) with celebrations marked
- List view alternative with filters (date range, status, animateur)
- Create button: "Nouvelle celebration"

## Build celebration creation form

- Route: `/celebrations/nouveau`
- Fields: date, type (dropdown: dominicale, fête, mariage, baptême, funérailles...), paroisse (pre-selected)
- Auto-populate: temps liturgique (Romcal), fete (Romcal), lectures (AELF)
- Assign animateur and prêtre from parish members
- Save as "En preparation"

## Build celebration preparation page (animateur)

- Route: `/celebrations/:id`
- Header: date, type, liturgical season, feast, readings summary
- Ordinaire de messe section: global selection dropdown + individual override per piece (Kyrie, Gloria, Sanctus, Agnus)
- Per-moment sections (Entree, Offertoire, Communion, Envoi, Meditation, Psaume):
  - AI suggestions (3-5 cards each with preview/listen/select buttons)
  - Selected song display with reorder capability
  - "Autre chant" search button to manually find songs
- Action buttons: "Soumettre au prêtre", "Publier", "Exporter PDF"
- Drag-and-drop reordering of songs within moments

## Build PDF generation for feuille de chants

- Use `@react-pdf/renderer` to generate printable PDF
- Layout: celebration header (date, type, parish), then per-moment song list with lyrics
- Option to include partition snippets
- API route: `POST /api/feuilles/:id/pdf` -> generate and store in MinIO -> return URL
- Download button on celebration page

---

# Frontend — Search (Feature 1, 8)

## Build search page with semantic and tag-based search

- Route: `/recherche`
- Search input with mode toggle: "Par tags" / "Semantique"
- Tag mode: dropdowns for temps liturgique, moment, theme, recueil
- Semantic mode: free-text input, results ranked by relevance percentage
- Result cards: title, relevance score, tags, preview/listen buttons
- Click to open song detail or preview modal

---

# Frontend — Chat IA (Feature 8)

## Build floating AI chat panel

- Floating button (bottom-right) on all pages
- Expandable chat panel with message history
- User input field with send button
- AI responses with formatted suggestions (song cards inline)
- Action buttons in AI responses: "Appliquer a la feuille", "Voir le chant", etc.
- Context-aware: passes current page context (celebration, search query) to AI
- Streaming response display

---

# Frontend — Parish Management (Feature 7)

## Build parish settings page

- Route: `/paroisse/parametres`
- Edit: nom, lieu, adresse, horaires de messes habituels
- Member management: list members with roles, invite by email, change roles, remove
- Role assignment: admin, animateur, choriste, organiste, pretre

## Build notification center

- Bell icon in header with unread count badge
- Dropdown or page listing notifications
- Mark as read, mark all as read
- Notification types: feuille prête, modifications, chants à préparer

---

# Frontend — Administration (Feature 6)

## Build admin moderation page

- Route: `/admin/moderation`
- Tab: Chants pending validation — list with approve/reject actions, preview
- Tab: Correction requests — list DemandeCorrection with old/new values, approve/reject
- Tab: Reported errors — signalements on existing content

## Build admin user management page

- Route: `/admin/utilisateurs`
- List all users with their parish roles
- Edit roles, deactivate accounts

---

# AI Features (Feature 8)

## Implement AI-assisted song creation flow

- On new song creation, after title input:
  1. Check for duplicates (search by title/author/cote)
  2. If no duplicate: AI searches for lyrics, partitions, recordings online
  3. Pre-fill form with AI findings
  4. User can accept, adjust, ask AI to retry, or fill manually
- AI auto-characterizes the song on submission (tags, themes, moments, liturgical season)

## Implement AI-powered celebration sheet generation

- Chat command: "Cree une feuille de chants pour [date/celebration]"
- AI generates complete sheet proposal based on suggestion engine
- User can apply to current celebration with one click
- AI can adjust based on feedback ("remplace le chant d'entree", "quelque chose de plus joyeux")

## Implement AI tool-use for chat actions

- AI can execute actions via tool/function calling:
  - Search songs
  - Add/remove song from feuille
  - Generate PDF
  - Assign celebration
  - Find partition/recording for a specific voice
- Each action requires user confirmation before execution

---

# Audio & Projection (Features 4, 5)

## Build audio player component with voice isolation

- Custom audio player using Howler.js or WaveSurfer.js
- Controls: play/pause, seek, progress bar, volume
- Voice selector: Toutes, Soprano, Alto, Tenor, Basse (loads corresponding audio file)
- Speed control: 0.5x, 0.75x, 1x, 1.25x
- Waveform display (WaveSurfer.js)

## Build lyrics projection mode

- Fullscreen mode for projector display (`/chants/:id/projection`)
- Large text, high contrast (dark background, light text)
- Navigate between sections (refrain, couplets)
- Auto-scroll option synced with audio playback (future)

---

# Testing

## Write unit tests for core business logic

- Suggestion engine: scoring, filtering, ranking
- Liturgical calendar service (Romcal integration)
- AELF readings service (with mocks)
- Embedding generation and search
- Visibility rules and permission checks
- Song validation (required fields, statut transitions)

## Write integration tests for API routes

- Auth flows: register, login, session, role checks
- CRUD operations: chants, celebrations, feuilles, paroisses
- Search: semantic and keyword
- File upload/download (MinIO)
- AI services: embeddings, characterization, chat

## Write E2E tests for critical user flows (Playwright)

- Login/register flow
- Celebration preparation flow (create -> suggestions -> select -> publish -> PDF)
- Song creation flow (title -> AI assist -> submit -> admin validate)
- Search flow (semantic query -> results -> preview)
- Chat IA flow (ask question -> get suggestion -> apply action)
- Choriste flow (notification -> open celebration -> open song -> partition + audio)

---

# Deployment & Operations

## Configure production Docker Compose

- Production-optimized Dockerfiles (multi-stage, minimal images)
- Caddy reverse proxy with auto-TLS (Let's Encrypt)
- Environment variable management for production secrets
- Volume persistence for PostgreSQL, MinIO, Ollama models

## Set up backup and monitoring

- Automated PostgreSQL backup (pg_dump cron + rotation)
- MinIO backup (rsync or replication)
- Basic monitoring: uptime checks, Docker logs aggregation
- Watchtower for automatic image updates (optional)

## Create deployment documentation

- README with setup instructions
- Environment variables reference
- First-run guide (docker compose up, seed data, create admin)
- Troubleshooting common issues
