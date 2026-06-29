# HighWise — Architecture

## Overview

HighWise is a Hebrew-only, RTL, mobile-first PWA (max-width 480px) for evaluating acute mountain sickness (AMS) risk. It has no login for end users. Medical logic runs entirely on the client; the server only stores anonymised assessment logs.

**Production:** https://highwise.vercel.app  
**GitHub:** https://github.com/Yuval-Ke/highwise (branch: `main`)  
**Stack:** Next.js 16.2.9 (App Router, Turbopack) · TypeScript strict · CSS Modules · Supabase · Vercel

---

## Layers

```
┌─────────────────────────────────────────────────────┐
│  Public app (client)                                │
│  Next.js pages — no login, localStorage only         │
│  Risk engine runs in-browser, never sent to server   │
└────────────────┬────────────────────────────────────┘
                 │ GET /api/public/config
                 │ GET /api/public/dataset
                 │ POST /api/public/assessment-log
                 ▼
┌─────────────────────────────────────────────────────┐
│  Next.js API routes (serverless, Vercel Edge-ready)  │
│  Service-role Supabase client (server only)          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Supabase (Postgres + Auth)                          │
│  Tables: app_config, dataset_versions, countries,    │
│  treks, locations, assessment_logs, admin_users,     │
│  audit_logs, sync_logs                              │
└─────────────────────────────────────────────────────┘
                 ▲
                 │ Server Actions + service-role client
┌─────────────────────────────────────────────────────┐
│  Admin panel (/admin/*)                              │
│  Middleware-gated: Supabase Auth cookie session      │
│  Roles: owner > admin (see admin_users table)        │
└─────────────────────────────────────────────────────┘
```

---

## Public App Flow

```
/consent → /profile → /trek → /assessment → /symptoms → /respiratory → [/three-day] → /result
```

- `/consent` — Hebrew privacy consent. `ConsentGuard` in root layout blocks all gated routes until `nativ_privacy_consent` is set.
- `/profile` — Medical background only (no PII: no name, phone, email).
- `/trek` — Trek selection. Country fixed to Nepal.
- `/assessment` — Altitude inputs. Village lookup from published dataset.
- `/symptoms` — LLS symptom score.
- `/respiratory` — Red flags + respiratory illness.
- `/three-day` — Conditional step (only shown when `requiresThreeDayQuestion` is true).
- `/result` — Half-circle SVG gauge. Queues assessment log immediately after save.

All state lives in localStorage. The flow is resumable from any step.

---

## Risk Engine (immutable)

`src/lib/riskEngine.ts` + `src/lib/calculateLLS.ts` — **DO NOT MODIFY.**

Input: `RiskEngineInput { profile: UserProfile; daily: DailyInput }`  
Output: `RiskEngineResult { level: RiskLevel; reasons: string[]; requiresThreeDayQuestion: boolean; specificActions: string[] }`

`level` values: `green | yellow | orange | red`

The engine is the medical core of the product. All changes to it require clinical review.

---

## Dataset Architecture

The app works from a published snapshot, not live DB queries.

```
Admin edits (countries / treks / locations in Supabase)
        ↓ owner clicks "Publish"
publishService.buildAndValidateSnapshot()
        ↓ validates, computes version
publishService.commitSnapshot()
        ↓ INSERTs new dataset_versions row (is_current=true)
        ↓ UPDATEs old rows to is_current=false
        ↓ UPSERTs app_config dataset_version key
        ↓
GET /api/public/config → returns new datasetVersion
GET /api/public/dataset → returns payload_json of current dataset_versions row
        ↓
Client SyncInit detects version mismatch → downloads new dataset → caches in localStorage
```

Dataset versions follow semver: `v0.3.0-nepal-initial`, `v0.3.1`, …

---

## Public API Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/public/config` | None | Returns `PublicAppConfig` from `app_config` table |
| `GET /api/public/dataset` | None | Returns `PublishedDataset` (current `dataset_versions` row) |
| `POST /api/public/assessment-log` | None | Inserts one `assessment_logs` row |

All three are rate-limit-free. The assessment-log route validates consent + schema server-side before writing.

---

## Admin Routes

All `/admin/*` routes are middleware-gated (Supabase Auth cookie). Unauthenticated requests:
- Browser requests → 307 redirect to `/admin/login`
- API requests (`/api/*`) → 401 JSON `{ "error": "Unauthorized" }`

| Route | Role required | Purpose |
|---|---|---|
| `/admin/login` | — | Sign in |
| `/admin/dataset` | admin/owner | CRUD on countries, treks, locations; publish |
| `/admin/dataset/[trekId]` | admin/owner | Location CRUD for a specific trek |
| `/admin/dashboard` | admin/owner | Aggregate stats from assessment_logs; date-range filter + CSV export |
| `/admin/audit` | admin/owner | Paginated audit-log viewer (`audit_logs`); resolves actor email via `auth.admin.listUsers()` |
| `/admin/logs` | admin (view) / owner (delete) | List individual assessment logs; bulk soft-delete is owner-only |
| `/admin/import` | admin/owner | CSV import of trek+locations |

`/api/admin/*` route handlers are **not** covered by the middleware matcher
(`/admin/:path*`), so each self-authenticates with its own cookie-based
`getAuthUser()` + `requireAdmin`/`requireOwner` check:

| Route | Role required | Purpose |
|---|---|---|
| `POST /api/admin/publish` | owner | Validate + commit dataset snapshot (audited: `publish_dataset`) |
| `GET /api/admin/export-logs` | admin/owner | CSV export of non-deleted logs in `?from=&to=` range (audited: `export`) |

### Roles

Defined in `admin_users.role`:
- `owner` — full access including publish, soft-delete, audit log
- `admin` — dataset CRUD, dashboard, import; cannot publish

`requireAdmin()` in `src/lib/adminAuth.ts` enforces `role IN ('admin', 'owner')`.  
`requireOwner()` enforces `role = 'owner'`.

### Audit logging

`src/lib/auditLog.ts` exports `writeAuditLog(params)` — the single writer for the
`audit_logs` table. It uses the service-role client (writes bypass RLS;
`audit_logs` has no insert policy) and is fire-and-forget: on error it
`console.error`s and returns, so an audit failure never breaks the underlying
action. Currently wired into:

- `publishDataset` (`admin/dataset/actions.ts`) and `POST /api/admin/publish` → `publish_dataset`
- `softDeleteLogs` (`admin/logs/actions.ts`) → `soft_delete`
- `GET /api/admin/export-logs` → `export`

The `/admin/audit` viewer reads these rows (newest first, 50/page) and resolves
`performed_by` (an `admin_users.id`) to an email via one `auth.admin.listUsers()`
call (there is no batch `getUserById`).

### Dashboard aggregation

`/admin/dashboard` calls the Postgres function `get_dashboard_stats(p_from, p_to)`
(migration `20260629000001_dashboard_stats_fn.sql`), which aggregates non-deleted
`assessment_logs` DB-side and returns one `jsonb` row shaped like the old JS
`buildStats()`. This removes the previous 5000-row cap and applies the date range
in one round-trip. A JS fallback (`buildStats` over a capped `.range()` pull)
remains in the page and is used automatically if the RPC errors (e.g. before the
migration is applied).

---

## Database Schema (v0.3)

### `app_config`
Key-value store for runtime config. Key `dataset_version` is the trigger for client dataset sync.

### `dataset_versions`
Each publish creates one row. `is_current = true` on the active row. `payload_json` holds the full `PublishedDataset` object.

### `countries`
`id (uuid) · country_code · name_en · name_he · sort_order · is_active`

### `treks`
`id · country_id (FK) · trek_id (slug) · name_en · name_he · aliases[] · region · is_popular · is_active · needs_review · sort_order`

### `locations`
`id · trek_id (FK) · location_id (slug) · name_en · name_he · aliases[] · altitude_m · route_order · section · location_type · needs_review · is_active`

Unique constraint: `(trek_id, location_id)`.

### `assessment_logs`
~40 columns. Key fields:
- `install_id` — anonymous UUID generated once per device (never linked to identity)
- `risk_result` — `green | yellow | orange | red`
- `lls_score` — internal; never shown to public user
- All GPS / location fields are `NULL` in v0.3 (feature flags all false)
- `deleted_at` — soft delete, owner only

### `admin_users`
`id (= Supabase auth user UUID) · role · is_active · email · display_name`

### `audit_logs`
`id · performed_by (admin_users.id) · performed_at (default now()) · action_type · entity_type · entity_id · old_value (jsonb) · new_value (jsonb) · notes`

`action_type` is CHECK-constrained to the `AuditActionType` union. Select is open
to any authenticated admin (RLS); inserts have no policy, so only the service-role
client (`writeAuditLog`) writes.

---

## localStorage Keys

| Key | Content | Survives clearAllData()? |
|---|---|---|
| `nativ_user_profile` | Medical background + trip context | No |
| `nativ_current_assessment` | In-progress assessment | No |
| `nativ_assessments` | Saved history | No |
| `nativ_privacy_consent` | `{ accepted, acceptedAt, consentVersion }` | **Yes** |
| `nativ_assessment_sync_queue` | Unsynced log queue | No |
| `nativ_app_config_cache` | Cached `PublicAppConfig` | No |
| `nativ_dataset_cache` | Cached `PublishedDataset` | No |
| `nativ_dataset_version` | Version string | No |
| `highwise_install_id` | Anonymous analytics UUID | **Yes** |
| `highwise_analytics_queue` | Offline event queue | No |

The `nativ_` prefix is intentional — renamed from "nativ" to "highwise" at the product level but the localStorage namespace was left unchanged to avoid breaking existing saved data.

---

## Supabase Client Strategy

Two clients, both in `src/lib/supabase/`:

| Client | File | Key used | When |
|---|---|---|---|
| Service-role | `server.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Server Actions, API routes — bypasses RLS |
| Anon session | `serverSession.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reading the current auth session in Server Actions |

The service-role key is **never** sent to the client. `NEXT_PUBLIC_*` vars are safe to expose.

---

## Deployment

Manual Vercel CLI deploy (GitHub integration is NOT connected):

```bash
cd HIGHWISE
vercel deploy --prod --yes
```

Environment variables are managed in the Vercel dashboard. Do not commit `.env.local`.

---

## Key Constraints

- **riskEngine.ts / calculateLLS.ts** — immutable. No changes without clinical review.
- **No GPS / location collection** in v0.3. `LocationSource` enum and DB columns exist for future use but all feature flags are `false`.
- **No PII** — no name, phone, email, or free-text notes collected.
- **LLS score** — internal medical value; must never be displayed to the public user.
- **No medication doses** in result output.
- **`nativ_` localStorage namespace** — must not be renamed (breaks existing data).
- **Service-role key** — server-side only. Never log, never expose to client.
