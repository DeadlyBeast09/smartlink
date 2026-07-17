# shrtn — URL Management Platform

A production-style URL shortener built in phases, with documentation
detailed enough to revise from before interviews. Phase 1 (core
shortening + redirects + click tracking) is complete and runnable below;
Authentication, Dashboard, Analytics, Custom Aliases, QR Codes, and
Security hardening follow in subsequent phases.

## Quick start

```bash
npm install
cp .env.example .env     # then edit MONGO_URI if not using local default
npm run dev               # nodemon, http://localhost:3000
```

Requires a running MongoDB instance reachable at `MONGO_URI` (local
install, Docker, or MongoDB Atlas — see docs/14-deployment.md, added
later, for Atlas setup).

## Run tests

```bash
npm test
```

Uses `mongodb-memory-server` — no real database needed for tests.

## Project status

| Phase | Feature | Status |
|---|---|---|
| 1 | Core shortener (create, redirect, click tracking) | ✅ |
| 2 | Authentication (JWT + cookies) | ⏳ next |
| 3 | User dashboard | planned |
| 4 | Analytics | planned |
| 5 | Custom aliases | planned |
| 6 | QR codes | planned |
| 7 | Security hardening | planned |

## Documentation

Full topic-based docs live in [`docs/`](docs/) — start with
[`docs/01-project-overview.md`](docs/01-project-overview.md). Architecture,
database design, and URL-shortening internals are documented in depth
there, not repeated here.

## Tech stack

Node.js, Express, MongoDB, Mongoose, EJS, vanilla CSS/JS — no Docker,
no microservices, intentionally kept to what a single backend service
actually needs at this scale (see docs/01-project-overview.md for the
reasoning).
