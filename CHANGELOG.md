# HighWise — Changelog & Production Recovery Reference

## v0.3 — Backend, Admin, Consent, Assessment Logging (2026-06-23)

### Production status

| Field | Value |
|---|---|
| Status | **Live on Production** |
| Production URL | https://highwise.vercel.app |
| Deployment ID | `dpl_3sZtdUmXC3iHpyJ6RzJ7ULCfjHLE` |
| Branch | `main` |
| Final main commit | `0578eb9` |
| Git tag | `v0.3` |
| Supabase dataset | `v0.3.0-nepal-initial` (15 treks, 322 locations) |

---

### Features added

**Supabase backend schema**
- Tables: `admin_users`, `countries`, `treks`, `locations`, `assessment_logs`, `sync_logs`, `audit_logs`, `dataset_versions`
- Row Level Security; migrations in `supabase/migrations/`

**Admin authentication**
- Supabase Auth + `admin_users` table (`owner` / `admin` roles)
- `/admin/login` (Server Action), middleware gates all `/admin/*` routes
- `requireAdmin()` / `requireOwner()` in `src/lib/adminAuth.ts`

**Admin dataset CRUD & publish workflow**
- `/admin/dataset` — country + trek management; `/admin/dataset/[trekId]` — locations
- `buildAndValidateSnapshot()` — validates before publish with change summary diff
- `publishDataset()` Server Action — writes to `dataset_versions`, updates `is_current`

**Remote config**
- `GET /api/public/config` — cached 60 s / stale-while-revalidate 5 min
- `AppStatusGuard` — `appDisabled` overlay, `maintenanceMode` banner, `version_too_old` overlay
- Location flags (`locationEnabled`, etc.) all `false` by default

**Dataset sync**
- `GET /api/public/dataset` — full published dataset as JSON
- `SyncInit` fetches config + dataset on mount and on `online` event; version-based cache invalidation
- Bundled fallback when API unavailable

**Nepal dataset live**
- **15 treks, 322 locations**, version `v0.3.0-nepal-initial`

**Mandatory first-use consent gate**
- `/consent` page with full Hebrew medical disclaimer
- `ConsentGuard` in root layout; `nativ_privacy_consent` localStorage key
- Consent preserved by `clearAllData()`

**Trek page hydration fix**
- `useState("") + useEffect` pattern eliminates SSR/CSR mismatch on `/trek`

**Assessment logging**
- `queueAssessmentLog()` / `flushAssessmentQueue()` in `src/lib/assessmentLogger.ts`
- Queue in `nativ_assessment_sync_queue`; consent-gated; flush on mount + online event
- `POST /api/public/assessment-log` inserts to `assessment_logs`
- 33-field payload; all location fields `null`; `altitudeSource: 'none'`; session dedup via `UNIQUE` constraint

**Assessment logging delivery fix**
- `flushAssessmentQueue()` now called immediately after `queueAssessmentLog()` on `/result`
- Fixes race condition where reset could clear the queue before `SyncInit` re-fired the flush in a single-session mobile flow
- Verified: phone smoke-test log appears in Admin Dashboard after reset

**Admin dashboard**
- `/admin/dashboard` — server-rendered aggregate stats
- Risk distribution, by-day (last 14), top treks, dataset versions/sources, device/browser summary

**Admin dataset table overflow fix**
- Admin dataset tables overflow-clipped with `.table-scroll { overflow-x: auto }` wrapper
- Applied to trek list (`dataset/page.tsx`) and locations table (`dataset/[trekId]/page.tsx`)

---

### Safety constraints — all preserved

| Constraint | Verified |
|---|---|
| `riskEngine.ts` unchanged | 0 lines diff from main |
| `calculateLLS.ts` unchanged | 0 lines diff from main |
| Result logic unchanged | Only addition: `queueAssessmentLog` call after `saveCompletedAssessment` |
| LLS score not shown to public | Used only for analytics label and logger; never rendered in UI |
| No medication doses | Absent |
| No user login for public users | Not added |
| No device location / GPS | `navigator.geolocation` absent from all source |
| No PII collected | No name, email, phone, or free-text notes in logs |
| Service role key server-side only | No `NEXT_PUBLIC_` prefix; only in `src/lib/supabase/server.ts` |
| `.env.local` not committed | Confirmed (`.env*` in `.gitignore`) |

---

### Test results (at commit `0578eb9`)

| Check | Result |
|---|---|
| `npm test` | 296 / 296 passed (13 suites) |
| TypeScript (`tsc --noEmit`) | Clean |
| Production build (`next build`) | Clean |
| Production QA | PASS |
| Admin dashboard | PASS |
| Admin dataset table overflow fix | PASS |
| Assessment logging delivery fix | PASS |
| Phone smoke test | PASS |
| Phone logging QA (log in dashboard after reset) | PASS |

---

### Rollback procedure

To roll back to v0.2b:
```bash
git checkout 745ba41
npx vercel deploy --prod
```

---

## v0.2b — Trek Selection & Nepal Dataset (2026-06-21)

### Production status

| Field | Value |
|---|---|
| Status | **Live on Production** |
| Production URL | https://highwise.vercel.app |
| Deployment ID | `dpl_3TCUrP5EuRPqrCkzzyKg6HfpbySP` |
| Commit | `745ba41a0be1125cf18180f9c3f888294730991c` |
| Branch | `main` |
| Git remote | https://github.com/Yuval-Ke/highwise.git |
| Version tag | **Not yet created** — v0.2b tag requires manual review of 15-trek dataset before tagging |

---

### Features added

**New `/trek` page**
- Dedicated screen for trek selection, inserted between `/profile` and `/assessment`
- App flow is now: `/profile` → `/trek` → `/assessment`
- Displays "פרטי הטרק" as screen title; country is always "נפאל" (fixed for this version)
- Searchable dropdown: type-ahead search across trek names (Hebrew and English aliases)
- Treks grouped by: popular treks shortlist, then all treks by region
- "other_or_unsure" option for users whose trek is not listed
- "ללא בחירת טרק" note when no trek is selected — manual altitude entry still works
- On "המשך להזנת גבהים": if trek changed, clears stale `altitudeLocationSelections` before saving

**`/profile` page changes**
- Trek selector removed entirely — profile now collects only medical background
- On submit, navigates to `/trek` (previously went directly to `/assessment`)
- Preserves any existing `tripContext` on re-save (so returning users don't lose trek choice)

**Storage: single source of truth**
- `tripContext` is stored only inside `nativ_user_profile` (`{ countryId, trekId }`)
- No separate trek localStorage key ever created
- All storage keys remain in the `nativ_*` namespace — no new keys added

**Full Nepal dataset (`src/lib/nepalData.ts`)**
- 15 treks with Hebrew and English aliases
- 322 lodging/checkpoint locations
- Each location: `locationId`, `nameEn`, `nameHe`, `altitudeMeters`, `trekId`, `sourceNote`, `needsReview`
- `sourceNote` and `needsReview` are internal metadata — not rendered anywhere in the UI

**Village lookup modal (`src/components/VillageLookupModal.tsx`)**
- Available on `/assessment` when a trek is selected
- Two-step confirm flow: click row to preview → click "השתמש בגובה המשוער הזה" to apply
- Fills altitude field with the selected village's `altitudeMeters`
- Stores `LocationSelection` metadata (`locationId`, `trekId`, `altitudeMeters`, `nameEn`, `nameHe`) in `nativ_current_assessment.altitudeLocationSelections`
- Manual edit of an altitude field clears the associated `LocationSelection` entry

**`/assessment` page changes**
- Label + lookup button wrapped in `.fieldLabelRow` (flexbox, RTL-aware, `space-between`)
- Current altitude field button text: "מצא את הכפר שאני נמצא בו"
- All sleep altitude fields: "חפש כפר במסלול"
- Trek-change detection on load: if saved `tripContext.trekId` differs from `altitudeLocationSelections` entries, clears stale selections and shows `trekChangedAlert`

**Analytics privacy**
- No location names, `locationId`, or exact altitude values sent to analytics
- `trekId` and `altitudeBand` (range string, e.g. `"4000_4499"`) permitted
- `analytics.ts` `sanitize()` enforces an explicit allowlist before every event send

---

### Safety constraints — all preserved

| Constraint | Verified |
|---|---|
| `riskEngine.ts` unchanged | Last touched in `1fa66d1` — not modified this session |
| `result/page.tsx` logic unchanged | Last touched in `e04ca68` — not modified this session |
| LLS score not displayed to user | `llsSeverity` absent from all page SSR HTML |
| No medication doses shown | Absent from `/result` page |
| No backend, user accounts, auth, GPS, payment | Not added |
| No location names / `locationId` / exact altitude to analytics | Enforced by `sanitize()` allowlist in `analytics.ts` |
| `sourceNote` and `needsReview` not visible in UI | Confirmed absent from all rendered HTML |
| `nativ_*` localStorage keys not modified | All existing keys preserved; `altitudeLocationSelections` is a new sub-field of `nativ_current_assessment` |

---

### Test results (at commit `745ba41`)

| Check | Result |
|---|---|
| `npm test` | 172 / 172 passed |
| TypeScript (`tsc --noEmit`) | Clean — 0 errors |
| Production build (`next build`) | Clean — 13 routes, 0 errors, 0 warnings |
| ESLint | 7 pre-existing issues only — 0 new issues introduced |

New test file: `src/__tests__/trek-flow.test.ts` (33 tests, covering 19 spec scenarios)

---

### Production smoke test (2026-06-21)

| # | Check | Result |
|---|---|---|
| 1 | Home loads (`/`) | PASS |
| 2 | `/profile → /trek → /assessment` flow | PASS |
| 3 | `/profile` has no trek selector | PASS |
| 4 | `/trek` shows "פרטי הטרק", "מדינה: נפאל", trek selector | PASS |
| 5 | Select Everest Base Camp | PASS |
| 6 | `/assessment` shows selected trek badge | PASS |
| 7 | Lookup button opens modal | PASS |
| 8 | Select Dingboche → altitude fills (4410 m) | PASS |
| 9 | Current altitude button: "מצא את הכפר שאני נמצא בו" | PASS |
| 10 | No-trek flow works with manual entry | PASS |
| 11 | `other_or_unsure` flow works with manual entry | PASS |
| 12 | Green scenario returns "רמת סיכון: ירוק — סיכון נמוך" | PASS |
| 13 | Below-2500 shows "הכלי מתוכנן לשימוש מעל גובה 2500 מ׳" | PASS |
| 14 | Reset clears data | PASS |
| 15 | Browser console errors | No server-side errors; client-side console not capturable remotely |
| 16 | `sourceNote` / `needsReview` not visible in UI | PASS |

---

### Known remaining tasks before v0.2b tag

1. **Manual dataset review** — all 322 locations across 15 treks must be manually reviewed and approved. Particular attention to `needsReview: true` entries where altitude data was estimated or needs cross-referencing.
2. **Decide on `needsReview` entries** — keep, remove, correct, or flag in UI as "approximate". No code change needed until decision is made.
3. **Test on a real device** — mobile browser (iOS Safari, Android Chrome) in field conditions (slow connection, PWA installed to home screen).
4. **Create `v0.2b` tag** — only after dataset review is explicitly approved.

---

### Rollback procedure

Previous stable production release: **`v0.2a-analytics-feedback`**

To roll back:
```bash
# From the HIGHWISE directory
git checkout v0.2a-analytics-feedback
npx vercel deploy --prod
```

This restores the pre-trek-selection build. The `/trek` route will disappear and `/profile` will navigate directly to `/assessment` as before. Existing `nativ_user_profile` data is backward-compatible — the `tripContext` field is optional and ignored by the old code.

---

## v0.2a — Analytics & Feedback (prior release)

**Tag:** `v0.2a-analytics-feedback`
**Status:** Superseded by v0.2b on 2026-06-21

- PostHog analytics with offline queue
- Privacy-preserving analytics: `altitudeBand` instead of exact altitudes
- Feedback UI added
- riskEngine and result logic unchanged from MVP

---

## v0.1 — MVP (initial release)

**Tag:** (none — initial deployment `e04ca68`)
**Status:** Superseded

- Core altitude illness risk assessment
- Hebrew RTL UI
- `/profile` → `/assessment` → `/result` flow
- Local-only, no backend, no auth
