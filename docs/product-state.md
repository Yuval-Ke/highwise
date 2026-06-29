# HighWise — Product State (as of 2026-06-29)

## Current Release: v0.3

| | |
|---|---|
| Git tag | `v0.3` at commit `e38b27e` |
| Latest commit | `cadc20e` (security + code review fixes) |
| Production | https://highwise.vercel.app |
| Dataset | `v0.3.0-nepal-initial` (15 treks, 322 locations, Nepal only) |
| Tests | 347 passing |

---

## What's Working

### Public app
- Full assessment flow: profile → trek → altitude → symptoms → respiratory → [three-day] → result
- Half-circle risk gauge with colour-coded result (green / yellow / orange / red)
- Hebrew-only, RTL, mobile-first (max 480px)
- Trek selection with searchable dropdown (Nepal, 15 treks)
- Village lookup for altitude inputs (from published dataset)
- Altitude rules page (/altitude-rules) — 9 accordion items
- Offline-capable: bundled dataset fallback if server unreachable
- Privacy consent gate — Hebrew text; blocks all gated routes until accepted
- Assessment logging — anonymised, consent-gated, queued + flushed immediately on result

### Admin panel
- `/admin/login` — Supabase Auth
- `/admin/dataset` — CRUD on countries, treks, locations; publish (owner only)
- `/admin/dataset/[trekId]` — Location-level CRUD
- `/admin/dashboard` — Aggregate stats: risk distribution, trek breakdown, device/browser breakdown. Date-range filter (native GET form) + CSV export. Aggregates DB-side via `get_dashboard_stats` RPC (no row cap); JS fallback if the RPC is unavailable.
- `/admin/audit` — Audit-log viewer (paginated, actor email resolved). All sensitive actions (publish, soft-delete, export) write to `audit_logs` via `writeAuditLog`.
- `/admin/logs` — Lists individual assessment logs (paginated); bulk soft-delete (owner only)
- `/admin/import` — CSV import with conflict resolution (replace / add-only)
- Trek clone tool (copies all locations, marks as needs_review)

### Infrastructure
- Remote config sync (`PublicAppConfig`) — maintenance mode, app disable, consent version, sync interval, feature flags
- Dataset versioning — atomic publish, version propagates to clients via config sync
- Anonymous analytics queue (`highwise_analytics_queue`)
- Admin role system: `owner` > `admin`

---

## Known Issues / Limitations

| Issue | Severity | Notes |
|---|---|---|
| `/api/public/*` and `/api/admin/*` return 404 in Turbopack dev | Low | Pre-existing Next.js 16 dev-mode behaviour. Works in production build. |
| `get_dashboard_stats` migration must be applied | Low | Until applied, the dashboard uses its JS fallback (capped at 5000 rows). Apply `20260629000001_dashboard_stats_fn.sql` to remove the cap. |
| No email notification on publish | Low | Owner publishes manually; no Slack/email trigger. |
| Trek clone copies no altitude-change history | Low | Cloned locations get no audit trail for the originals. |
| Admin import: no dry-run mode | Medium | Import immediately writes to DB. A preview step before commit would reduce errors. |
| `assessment_logs.completed_at` always null | Low | `flowCompleted` and `abandonmentStep` are also always default. These were designed for future tracking. |

---

## Hard Constraints (never change without clinical review)

- `src/lib/riskEngine.ts` — immutable
- `src/lib/calculateLLS.ts` — immutable
- Result logic (level → text → actions) — immutable
- LLS score must never be shown to the public user
- No medication doses in result output
- No GPS / device location — all feature flags false, all location DB fields null
- No PII collection — no name, phone, email, free-text notes
- `nativ_` localStorage namespace — do not rename (breaks existing saved data)
- Service-role key — server-side only, never logged

---

## P4 Candidates (next phase)

These are known directions, not committed roadmap. None is in progress.

**Dataset**
- Add India trekking dataset (Manali, Ladakh, Himachal Pradesh)
- Add Kilimanjaro / Andes datasets
- Admin: dry-run import preview before committing

**Admin** (audit viewer, dashboard date-range + export, bulk soft-delete shipped in P4 — Admin Hardening)
- Wire `writeAuditLog` into remaining sensitive actions (dataset CRUD, config changes)

**App**
- Offline mode indicator (show user when running from cache)
- Result page: share / screenshot export
- PWA install prompt

**Infrastructure**
- Consent version bump flow — remote config `consentVersion` mismatch triggers re-consent screen
- Rate limiting on `/api/public/assessment-log`
- Automated dataset version regression tests (altitude sanity checks on publish)

**Location (gated behind feature flags)**
- `currentAltitudeFromLocationEnabled` — GPS altitude for current position
- `ascentTrackingEnabled` — ascent rate monitoring
- All infrastructure (DB columns, `LocationSource` enum, config flags) already in place; just needs UI + flag flip

---

## Deployment History

| Date | Commit | Note |
|---|---|---|
| 2026-06-29 | `cadc20e` | Security + code review fixes; production deploy `dpl_AiSQibCL1KNKqxkhFPrcGTmf4pfZ` |
| 2026-06-23 | `05ee4d8` | Admin CSV import merged (v0.3.1) |
| 2026-06-23 | `e38b27e` | v0.3 tag — assessment logging flush fix, admin dashboard |
| 2026-06-22 | `0578eb9` | Fix: flush assessment logs immediately after result save |
| 2026-06-22 | `6d557fe` | Fix: admin dataset table horizontal overflow |
