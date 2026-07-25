# PrepRoute — Test Management

An admin application for building MCQ tests end to end: log in, create a test, configure its
marking scheme, attach questions, preview the result and publish it live.

Built as the frontend assignment for **Preproute** by **Niranjan Kushwaha**.

| | |
| --- | --- |
| Live app | _add deployment URL_ |
| Repository | _add repository URL_ |
| Walkthrough | _add video URL_ |

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Application flow](#application-flow)
- [Project structure](#project-structure)
- [API integration](#api-integration)
- [Technical decisions](#technical-decisions)
- [Deployment](#deployment)

---

## Features

- **JWT authentication** with validated credentials, persisted session, protected routes and
  automatic sign-out on a `401`.
- **Dashboard** listing every test with live/draft counts, search, and view, edit and delete
  actions guarded by a confirmation dialog.
- **Test builder** with cascading Subject → Topics → Sub-topics selects, difficulty, duration
  and a full marking scheme.
- **Question editor** for MCQs: four options, correct answer, optional explanation, difficulty
  and media URL, with add, edit and delete on the working list.
- **Preview and publish** showing the whole test with the correct option highlighted.
- **Light and dark themes**, remembered across visits.
- **Responsive** from mobile to desktop, with loading, empty and error states on every screen.

## Tech stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | React 19 + TypeScript on TanStack Start | Type safety end to end, with SSR available |
| Routing | TanStack Router | Type-safe, file-based routes |
| Server state | TanStack Query | Caching, refetching and request states without a store |
| Forms | react-hook-form | Uncontrolled inputs, minimal re-renders |
| Validation | Zod | Schemas double as the inferred TypeScript types |
| Styling | Tailwind CSS v4 + shadcn/ui | Semantic design tokens over Radix primitives |
| HTTP | `fetch` in a typed wrapper | No extra dependency for the small surface needed |
| Notifications | Sonner | Accessible toasts |

## Getting started

**Prerequisites:** Node.js 22.12 or newer.

```sh
git clone <repository-url>
cd test-architect-main
npm install
npm run dev
```

The app runs at **http://localhost:8080**.

Sign in with the credentials supplied for the assignment:

| Field | Value |
| --- | --- |
| User ID | `vedant-admin` |
| Password | `vedant123` |

## Environment variables

Every variable exposed to the client must be prefixed with `VITE_`. Vite picks the file from
the build mode, so `npm run build` reads `.env.production` and `npm run build:staging` reads
`.env.staging`.

| File | Mode | Used by |
| --- | --- | --- |
| `.env.production` | `production` (default) | `npm run build` |
| `.env.staging` | `staging` | `npm run build:staging` |
| `.env.example` | — | Template; copy to `.env.local` for local overrides |

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | No | Backend base URL, no trailing slash. Defaults to the staging API. |

Because `API_BASE_URL` falls back to the staging API, a fresh clone runs with no env setup at
all. `.env.local` overrides everything and is git-ignored; the two environment files are
committed deliberately since they contain no secrets.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build (`.env.production`) |
| `npm run build:staging` | Staging build (`.env.staging`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | Format with Prettier |

## Application flow

| # | Page | Route | What it does |
| --- | --- | --- | --- |
| 1 | Login | `/login` | Validates credentials, stores the JWT, redirects to the dashboard |
| 2 | Dashboard | `/dashboard` | Lists all tests with search and row actions |
| 3 | Create / Edit test | `/tests/create`, `/tests/:id/edit` | Test details, topics and marking scheme |
| 4 | Add questions | `/tests/:id/questions` | Builds the MCQ list, then saves it in bulk |
| 5 | Preview & publish | `/tests/:id/preview` | Full review, then sets the test live |

Unauthenticated visits to any protected route redirect to the login page; `/` forwards to the
dashboard or login depending on the stored token.

## Project structure

```
src/
├── components/
│   ├── common/      Brand, Breadcrumbs, ThemeToggle
│   ├── layout/      AppLayout — auth guard, sidebar, header
│   ├── tests/       TestForm — shared by create and edit
│   └── ui/          shadcn/ui primitives
├── constants/       API base URL, storage keys, routes, select options
├── hooks/           useAuth, useTheme, use-mobile
├── interfaces/      Shared API and domain types
├── lib/             Utilities and error handling
├── routes/          File-based pages (routeTree.gen.ts is generated)
├── services/        API layer
└── styles.css       Design tokens and Tailwind setup
```

## API integration

Every endpoint from the specification is wired through `src/services`.

| Service | Method | Endpoint |
| --- | --- | --- |
| `authService` | `POST` | `/auth/login` |
| `subjectService` | `GET` | `/subjects` |
| `subjectService` | `GET` | `/topics/subject/:subjectId` |
| `subjectService` | `GET` | `/sub-topics/topic/:topicId` |
| `subjectService` | `POST` | `/sub-topics/multi-topics` |
| `testService` | `GET` | `/tests` |
| `testService` | `GET` | `/tests/:id` |
| `testService` | `POST` | `/tests` |
| `testService` | `PUT` | `/tests/:id` |
| `testService` | `PUT` | `/tests/:id` (publish, `status: "live"`) |
| `testService` | `DELETE` | `/tests/:id` |
| `questionService` | `POST` | `/questions/bulk` |
| `questionService` | `POST` | `/questions/fetchBulk` |

## Technical decisions

**One HTTP client.** `src/services/rest.service.ts` attaches the bearer token, unwraps the
`{ success, data }` envelope, raises a typed `ApiError`, and clears stored credentials on a
`401`. Every feature service builds on it, so auth and error handling live in exactly one place.

**Services separated from components.** Each API area has its own module (`auth`, `subject`,
`test`, `question`). Components never construct URLs, which keeps the endpoint surface easy to
audit against the API documentation.

**TanStack Query instead of a global store.** Most state in this app is server state, and Query
already handles caching, refetching and request status. The only genuinely client-side state is
the auth token and the in-progress question drafts, so Redux or Zustand would have added
ceremony without solving a real problem.

**Questions are drafted locally and saved once.** Adding a question does not hit the network.
The list is edited freely and committed through `POST /questions/bulk`, after which the returned
IDs are written back to the test. This avoids orphaned questions from abandoned sessions and
matches the bulk endpoint the API provides.

**Zod schemas as the single source of truth.** Form types are inferred from the schema with
`z.infer`, so validation rules and TypeScript types cannot drift apart.

**Semantic design tokens.** Colours are declared once in `src/styles.css` as oklch custom
properties and consumed through Tailwind utilities (`bg-background`, `text-primary`, …). That is
what makes the dark theme work without duplicating a single style.

**Tolerant API types.** The backend returns some fields in more than one shape — a subject may be
an ID string or a nested object. Small normalisers at the read boundary absorb the difference so
pages stay simple.

**Configuration through env files.** The API base URL is read from `VITE_API_BASE_URL` with a
safe fallback, so promoting the app between staging and production is a build-mode change rather
than a code change.

## Deployment

`npm run build` produces a Nitro server bundle in `.output`, defaulting to the
`cloudflare-module` preset. Nitro auto-detects most hosts, so the same build works on Cloudflare,
Vercel or Netlify.

```sh
npm run build
npm run preview   # verify locally first
```

Set `VITE_API_BASE_URL` in the host's environment settings if it should differ from
`.env.production`.

---

Built by **Niranjan Kushwaha**.
