# 🏥 Healthcare Appointment API

> Production-ready REST API for managing healthcare appointments — built with **Node.js, TypeScript, Express, PostgreSQL, Docker, and GitHub Actions CI**.

[![CI](https://github.com/arrowprime/healthcare-api/actions/workflows/ci.yml/badge.svg)](https://github.com/arrowprime/healthcare-api/actions/workflows/ci.yml)

---

## Highlights

| | |
|---|---|
| 🔐 **JWT Authentication** | Stateless auth with 7-day tokens |
| 🛡️ **Role-Based Access Control** | `patient` · `doctor` · `admin` — each with scoped permissions |
| 📅 **Conflict-safe scheduling** | Prevents double-booking at the DB query level |
| ✅ **Validated inputs** | Zod schemas on every endpoint |
| 🐳 **One-command setup** | `docker compose up` — API + Postgres, fully wired |
| 🔄 **CI/CD** | GitHub Actions: type-check → tests → Docker build on every push |
| 📚 **Swagger/OpenAPI 3.0** | Interactive docs at `/docs` |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 (strict mode) |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Validation | Zod |
| Testing | Jest + Supertest (DB mocked — no DB needed to run tests) |
| DevOps | Docker · docker-compose · GitHub Actions |
| Docs | Swagger UI / OpenAPI 3.0 |

---

## Quick Start

### Docker (recommended — no local Postgres needed)

```bash
git clone https://github.com/arrowprime/healthcare-api.git
cd healthcare-api
cp .env.example .env        # edit JWT_SECRET
docker compose up
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger docs | http://localhost:3000/docs |
| Health check | http://localhost:3000/health |

### Local development

```bash
npm install
cp .env.example .env        # fill DATABASE_URL + JWT_SECRET
npm run migrate             # apply DB migrations
npm run dev                 # hot-reload via ts-node-dev
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account (patient / doctor / admin) |
| `POST` | `/api/auth/login` | — | Login → receive JWT |
| `GET` | `/api/auth/me` | ✓ | Current user profile |

### Appointments

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/api/appointments` | patient | Book an appointment |
| `GET` | `/api/appointments` | all | List (auto-scoped by role) |
| `GET` | `/api/appointments/:id` | all | Appointment detail |
| `PATCH` | `/api/appointments/:id/status` | doctor · admin | Confirm / cancel / complete |
| `DELETE` | `/api/appointments/:id` | patient · admin | Remove appointment |

### Doctors

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/doctors` | — | Browse all doctors |
| `GET` | `/api/doctors/:id` | — | Doctor profile + availability |

---

## RBAC Matrix

| Action | patient | doctor | admin |
|---|:---:|:---:|:---:|
| Register / Login | ✅ | ✅ | ✅ |
| Book appointment | ✅ | ❌ | ❌ |
| View own appointments | ✅ | ✅ | ✅ |
| View **all** appointments | ❌ | ❌ | ✅ |
| Confirm · Complete | ❌ | ✅ | ✅ |
| Cancel own pending | ✅ | ❌ | ✅ |

---

## Running Tests

```bash
npm test                  # all tests + coverage report
npm test -- --watchAll    # watch mode during development
```

Tests use **Jest + Supertest** with the database layer mocked — no Postgres instance required.

---

## Project Structure

```
src/
├── controllers/          # Thin HTTP handlers — parse, delegate, respond
│   ├── auth.controller.ts
│   ├── appointments.controller.ts
│   └── doctors.controller.ts
├── db/
│   ├── index.ts          # pg Pool + query helper
│   ├── migrate.ts        # Migration runner
│   └── migrations/
│       └── 001_init.sql  # Schema: users, doctors, appointments + indexes
├── middleware/
│   ├── auth.middleware.ts   # JWT extraction + verification
│   ├── rbac.middleware.ts   # Role guard factory
│   └── error.middleware.ts  # Global error handler
├── routes/               # Express routers
├── services/             # Business logic (auth, appointments, doctors)
├── types/                # Shared TypeScript interfaces
├── app.ts                # Express setup (no side-effects — testable)
└── server.ts             # Entry point (listen only)

tests/
├── setup.ts              # Env vars for Jest
├── auth.test.ts          # Auth endpoint tests
└── appointments.test.ts  # Appointment + doctor endpoint tests
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | ✅ | Long random string — keep secret |
| `PORT` | — | HTTP port (default `3000`) |
| `NODE_ENV` | — | `development` · `production` · `test` |

---

## License

MIT — built by [Sheikh Waqas Kamran](https://linkedin.com/in/sheikh-waqas-kamran-183aa415b)
