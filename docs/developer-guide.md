# HighWise — Developer Guide

## Prerequisites

- Node.js 20+
- Vercel CLI: `npm i -g vercel`
- Access to the Supabase project (ask the owner for credentials)
- `.env.local` — get from the owner; never commit it

## Local Setup

```bash
git clone https://github.com/Yuval-Ke/highwise.git
cd highwise
npm install
# Copy .env.local from owner, then:
npm run dev
```

App runs at http://localhost:3000.

**Known dev limitation:** `/api/public/*` routes return 404 in Turbopack dev mode (Next.js 16 behavior). They compile correctly in production build. The public app works from bundled data in dev — this is pre-existing and expected.

## Environment Variables

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server (session) | Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Secret — never log or expose |

## Running Tests

```bash
npm test              # all 340 tests
npm test -- --watch   # watch mode
npm test publishService   # single suite
```

Tests use Jest + ts-jest. All tests are in `src/__tests__/`. No test database — Supabase is fully mocked.

## Type Check + Build

```bash
npx tsc --noEmit   # TypeScript — must be clean before merge
npm run build      # Next.js build — must succeed before deploy
```

Definition of done before any commit: `tsc --noEmit` clean + `npm run build` clean + all tests pass.

## Deploying

Deploys are **manual CLI only** — GitHub integration is not connected.

```bash
cd HIGHWISE
vercel deploy --prod --yes
```

After deploy, `vercel promote <deployment-url> --yes` if the CLI doesn't auto-promote to production (it usually does with `--prod`).

## Adding a New Admin User

1. Create a Supabase Auth user at https://supabase.com → Authentication → Users.
2. Note the UUID.
3. Insert into `admin_users`:
   ```sql
   INSERT INTO admin_users (id, role, is_active, email, display_name)
   VALUES ('<uuid>', 'admin', true, '<email>', '<name>');
   ```
4. The user can now sign in at /admin/login.

## Publishing a Dataset Update

1. Sign in at /admin/login as `owner`.
2. Edit countries / treks / locations at /admin/dataset or import via /admin/import.
3. Click "Publish" — requires `confirmed=true` in the form.
4. The new version propagates to clients on next SyncInit (config poll interval, default 60s).

## CSV Import Format

Route: `/admin/import`. Required columns (header row must match exactly):

```
location_id,name_en,name_he,altitude_m,route_order,section,location_type,aliases,needs_review
```

- `section`: `on_route` | `acclimatization` | `side_trip`
- `location_type`: `village` | `camp` | `pass` | `peak` | `junction`
- `aliases`: semicolon-separated (`Namche;Namche Bazaar`)
- `needs_review`: `true` | `yes` | `1` → flagged. Anything else (including empty) → false.
- `altitude_m` and `route_order` are required; blank rows are rejected server-side.

Conflict resolution options: **Replace** (upsert existing + delete orphans) or **Add only** (skip existing location_ids).

## Admin Auth Rules

`requireAdmin()` — accepts `role = 'admin'` or `'owner'`.  
`requireOwner()` — accepts `role = 'owner'` only.

All Server Actions call one of these at the top. A missing or failed auth check logs `console.error` and returns early — it does not throw.

## Code Conventions

- **Server Components** by default. Add `'use client'` only when using hooks or browser APIs.
- **Server Actions** in `actions.ts` files co-located with the page. They use `FormData` and return `void` (errors are logged, not surfaced to the form — use `useActionState` if you need to surface them).
- **CSS Modules** — one `.module.css` per component. No Tailwind, no styled-components.
- **No comments** unless the reason is non-obvious (a hidden constraint, a workaround, a subtle invariant).
- **No broad refactors** during feature work.

## File Layout

```
src/
  app/
    (public)          — public user pages
    admin/            — admin panel pages + actions.ts
    api/
      public/         — unauthenticated API routes
      admin/          — authenticated API routes
  components/         — shared UI components
  lib/
    riskEngine.ts     — DO NOT TOUCH
    calculateLLS.ts   — DO NOT TOUCH
    publishService.ts — dataset build + commit
    adminAuth.ts      — requireAdmin / requireOwner
    assessmentLogger.ts — client-side log queue
    trekCsvImport.ts  — CSV parse + validate
    supabase/
      server.ts       — service-role client
      serverSession.ts — anon session client
      browserClient.ts — browser client (admin login only)
  types/
    index.ts          — public domain types (RiskEngineInput, etc.)
    backend.ts        — API contracts + DB row types
  __tests__/          — Jest tests
```

## Git Workflow

- Branch: `main` — only stable, tested code.
- Feature branches: `feature/<name>` or `fix/<name>`.
- Commit messages: specific and descriptive. Example: `fix: wrap JSON.parse in try/catch on result page`.
- No force-push to main.
- No `--no-verify`.

## Known Quirks

- Turbopack dev: `/api/public/*` → 404. Expected. Use production build to test API routes.
- `ConsentGuard` and `AppStatusGuard` start with `allowed = true` and gate in `useEffect`. This is intentional — prevents hydration mismatch from localStorage reads during SSR.
- React programmatic events in browser automation: use `element.__reactProps$xxx.onChange({ target: { value } })` + await ~150ms before triggering `onSubmit`.
- `nativ_` localStorage prefix is intentional — do not rename.
