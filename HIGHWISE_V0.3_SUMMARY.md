# HighWise v0.3 Release Summary

## Release metadata

| Field | Value |
|---|---|
| Version | v0.3 |
| Branch | `v0.3-backend-admin` |
| Final branch commit | `f446c2aeecac53f02c4ae68fa245b39fc756a0e5` |
| Main merge commit | _to fill after merge_ |
| Production URL | https://highwise.vercel.app |
| Production deployment URL | _to fill after deploy_ |
| Production deployment ID | _to fill after deploy_ |
| Supabase dataset version | `v0.3.0-nepal-initial` |
| Release date | 2026-06-22 |

---

## Major features

### Backend infrastructure (Supabase)
- Full Supabase schema: `admin_users`, `countries`, `treks`, `locations`, `assessment_logs`, `sync_logs`, `audit_logs`, `dataset_versions` tables
- Row Level Security on all admin tables
- Migrations in `supabase/migrations/`

### Admin authentication
- Supabase Auth + `admin_users` table with `owner` / `admin` roles
- Admin login at `/admin/login` (Server Action)
- Middleware gates all `/admin/*` routes
- `requireAdmin()` / `requireOwner()` helpers in `src/lib/adminAuth.ts`
- Logout server action

### Admin dataset CRUD
- `/admin/dataset` — country + trek management, locations per trek at `/admin/dataset/[trekId]`
- Create country, create trek, create/edit locations via Server Actions
- `is_active`, `is_popular`, `needs_review` flags per trek

### Dataset publish workflow
- `buildAndValidateSnapshot()` — validates before publish, blocks on validation errors, warns on non-blocking issues
- Change summary diff (treks added/removed, altitude changes, locations added/removed)
- `publishDataset()` Server Action — writes to `dataset_versions`, updates `is_current`
- `/api/admin/publish` — restricted to `owner` role

### Remote config
- App config stored in Supabase `app_config` table
- `GET /api/public/config` — served to clients, cached 60 s / stale-while-revalidate 5 min
- Config fields: `appDisabled`, `maintenanceMode`, `maintenanceMessage`, `minSupportedVersion`, `syncEnabled`, `consentVersion`, location flags (all `false` by default)
- `AppStatusGuard` client component reads cached config, blocks on `appDisabled`, shows banner on `maintenanceMode`, blocks on `version_too_old`

### Dataset sync
- `GET /api/public/dataset` — publishes full dataset as JSON
- `SyncInit` component fetches config + dataset on mount and on `online` event
- Version-based cache invalidation: downloads only when remote `datasetVersion` differs from cached
- Bundled fallback when API unavailable

### Nepal dataset — live
- **15 treks, 322 locations**
- Dataset version: `v0.3.0-nepal-initial`
- Treks include: Everest Base Camp, Annapurna Circuit, Langtang Valley, Manaslu Circuit, and 11 more

### Mandatory first-use consent gate
- `/consent` page with full Hebrew medical disclaimer
- `ConsentGuard` in root layout; all gated paths redirect to `/consent` without valid consent
- Consent stored in `nativ_privacy_consent` localStorage key: `{ accepted, acceptedAt, consentVersion }`
- `clearAllData()` preserves consent; installId survives reset
- Consent version upgrades re-prompt on mismatch

### Trek page hydration fix
- `/trek` no longer hydration-mismatches on SSR/CSR
- `useState("")` + read localStorage in `useEffect` pattern

### Assessment logging
- `queueAssessmentLog()` in `src/lib/assessmentLogger.ts`
- Queue stored in `nativ_assessment_sync_queue` localStorage key
- `flushAssessmentQueue()` — consent-gated, online-gated, called by SyncInit on mount and online event
- `POST /api/public/assessment-log` — inserts to `assessment_logs` table
- 33-field payload; all location-ready fields `null`; `altitudeSource: 'none'`; `flowCompleted: true`
- Session deduplication via `session_id` UNIQUE constraint (409 → 200, treated as success)
- Max 5 attempts per entry; dropped after that

### Admin dashboard
- `/admin/dashboard` — server-rendered aggregate stats (`force-dynamic`)
- Auth: `createSessionClient()` + `requireAdmin()`
- Aggregates: total assessments, avg LLS score, risk distribution (green/yellow/orange/red), by-day (last 14), top treks, dataset versions/sources, device/browser summary
- Graceful "No data yet." for empty sections

---

## What is NOT in v0.3

- No medical logic change (riskEngine, calculateLLS, result logic — unchanged from v0.2b)
- No medication doses
- No user login for public users
- No payment or premium features
- No device location collection
- No GPS request or `navigator.geolocation`
- No new countries (Nepal only)
- No PII collection (no name, phone, email, free-text notes)
- No change to dataset contents after publish

---

## QA summary

| Check | Result |
|---|---|
| Jest (292 tests, 13 suites) | PASS |
| TypeScript strict (`--noEmit`) | Clean |
| Production build (`next build`) | Clean |
| Preview QA (https://highwise-bifmcs0uk-highwise.vercel.app) | PASS |
| Production QA | _to fill after deploy_ |
| Phone smoke test | _to fill after phone test_ |

---

## Security / privacy summary

| Item | Status |
|---|---|
| `.env.local` not committed | Confirmed (in `.gitignore` via `.env*`) |
| `SUPABASE_SERVICE_ROLE_KEY` server-side only | Confirmed (no `NEXT_PUBLIC_` prefix, only in `src/lib/supabase/server.ts`) |
| No secrets in public API responses | Confirmed |
| No PII fields in assessment logs | Confirmed (installId only, no name/email/phone) |
| Location fields all null/false | Confirmed (`altitudeSource: 'none'`, `deviceLatitude: null`, etc.) |
| LLS score not shown to public users | Confirmed (only used for analytics label and logger) |
| Admin routes require authentication | Confirmed (middleware + `requireAdmin()`) |

---

## Known notes

- Turbopack dev server (`npm run dev`) initially returns 404 for `/api/public/*` routes due to lazy compilation. Routes compile on first access during the session. Production builds (`next build` / Vercel) compile all routes correctly as `ƒ` dynamic.
- Preview auth on Vercel requires `npx vercel curl` (not plain curl) for HTTP smoke checks.
