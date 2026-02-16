# Mapleins – Full Flow & Project Onboarding

## V1: 7 hero cities
Toronto, Brampton, Montreal, Calgary, Edmonton, Vancouver, Surrey

## Plain-text flow: auth → onboarding → app → rooms → chat → guides

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LANDING (/)                                                                │
│  - Links to /auth/sign-in                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTH SIGN-IN/SIGN-UP (/auth/sign-in)                                        │
│  - signInWithPassword / signUp                                               │
│  - handlePostAuthRedirect:                                                   │
│      - no user     → stay /auth/sign-in                                      │
│      - no profile  → /onboarding                                             │
│      - has profile → /app                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ No profile       │   │ Has profile      │   │ Auth callback    │
│ → /onboarding    │   │ → /app           │   │ (/auth/callback) │
└──────────────────┘   └──────────────────┘   │ → /onboarding    │
                                              └──────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ONBOARDING (/onboarding)                                                    │
│  - Modes: profile → start → moving | local                                   │
│  - profile: username, full_name, display_name, date_of_birth                 │
│  - start: "moving" or "already local"                                        │
│  - moving: from_country, from_province (hometown), to_country, to_province,  │
│            to_city (V1 cities by province), role → auto-join 3 rooms         │
│  - local:  phone, role, intent (no location) → no auto-join                  │
│  - Upserts profiles                                                          │
│  - AUTO-JOIN: picks target (to_* or current_*), finds rooms by:              │
│      country + type='country' → 1 row                                        │
│      province + type='province' + province match → 1 row                     │
│      city + type='city' + province + city match → 1 row                      │
│  - Inserts room_memberships for country, province, city (max 3)              │
│  - Redirects → /app                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  APP HOME (/app)                                                             │
│  - Requires auth + profile; else → sign-in or onboarding                     │
│  - Links: /rooms, /guides, (Services coming soon)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ ROOMS (/rooms)   │   │ GUIDES (/guides) │   │ WAITLIST         │
│ - Lists groups   │   │ - Location-based │   │ /waitlist        │
│   from           │   │   checklists     │   │ - TODO: wire DB  │
│   room_memberships│   │ - 6 hero cities │   │ - 6 cities       │
│ - Link to        │   │   Montreal, TO,  │   │   dropdown       │
│   /rooms/[id]    │   │   Brampton, CGY, │   └──────────────────┘
└──────────────────┘   │   Van, Surrey    │
              │         └──────────────────┘
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHAT ROOM (/rooms/[id])                                                     │
│  - Checks: user, membership, room exists                                     │
│  - Loads messages, subscribes Realtime (postgres_changes on messages)        │
│  - Send message → insert; Realtime → new rows appear for others              │
│  - Notification sound for messages from others                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DB structure: rooms & room_memberships

### rooms

| Column   | Description                                         |
|----------|-----------------------------------------------------|
| id       | uuid PK                                             |
| type     | 'country' \| 'province' \| 'city'                   |
| country  | e.g. 'Canada'                                       |
| province | NULL for country; e.g. 'Ontario', 'Quebec' for rest  |
| city     | NULL for country/province; e.g. 'Toronto' for city   |
| name     | Display name                                        |
| is_active| boolean, default true                               |

### Canonical rooms (from 20250214100000_normalize_rooms_3_max.sql)

- **1 country:** Canada (country='Canada', province=NULL, city=NULL)
- **4 provinces:** Quebec, Ontario, Alberta, British Columbia
- **6 cities:** Montreal (QC), Toronto (ON), Brampton (ON), Calgary (AB), Vancouver (BC), Surrey (BC)

### room_memberships

| Column   | Description    |
|----------|----------------|
| id       | uuid PK        |
| room_id  | FK → rooms     |
| user_id  | FK → profiles  |
| joined_at| timestamptz    |

### Onboarding auto-join logic (from onboarding/page.tsx)

1. Get target: `(to_country, to_province, to_city)` from moving, or `(current_country, current_province, current_city)` from local.
2. Query `rooms` where `country = targetCountry`, `is_active = true`.
3. Match:
   - `type='country'` → country room
   - `type='province'` and `province = targetProvince` → province room
   - `type='city'` and `province = targetProvince` and `city = targetCity` → city room
4. Insert `room_memberships` for each matched room not already joined.
5. Result: **at most 3 memberships** (1 country + 1 province + 1 city).

---

## Mismatches between code and DB

### 1. supabase_schema.sql is stale

- **File:** `supabase_schema.sql`
- **Issue:** Defines `profiles` with `name` only; no `display_name`, `full_name`, `date_of_birth`, `username`, `from_state`.
- **Code expects:** `display_name`, `full_name`, `date_of_birth`, `username`, `from_country`, `from_state`, `to_*`, `current_*`, `role`, `reasons`.
- **Action:** Update schema file or add migration to align.

### 2. Onboarding cities vs canonical rooms

- **Onboarding dropdowns (provinceCities):**
  - Quebec: Montreal, Quebec City, Laval, Gatineau, Sherbrooke
  - Ontario: Toronto, Ottawa, Brampton, Mississauga, London
  - Alberta: Calgary, Edmonton, Red Deer, Lethbridge
  - BC: Vancouver, Surrey, Burnaby, Richmond, Victoria
- **Canonical rooms (6 V1 cities only):** Montreal, Toronto, Brampton, Calgary, Vancouver, Surrey
- **Effect:** User picks Edmonton, Ottawa, Quebec City, Laval, etc. → **no city room exists** → auto-join gets only country + province (2 groups).
- **Task A fix:** Ensure Calgary flow gives 3 groups. Calgary is canonical; if rooms exist, it should work.

### 3. Local mode: free-text city

- **Code:** `currentCity` is an `<input>` (placeholder "e.g. Montreal"), not a dropdown.
- **Effect:** Typos (e.g. "Cairo" vs "Calgary") or alternate spellings won't match `rooms.city`.
- **Recommendation:** Use the same province/city dropdown as moving mode for consistency.

### 4. Auth callback always → onboarding

- **Code:** `/auth/callback` always does `router.push('/onboarding')`.
- **Note:** Used for OAuth/magic link; sign-in page uses `handlePostAuthRedirect` which goes to `/app` if profile exists. Callback could be updated to mirror that logic.

### 5. Waitlist not wired to DB

- **Code:** Waitlist form logs to console; Supabase insert is commented out.
- **Schema:** No `waitlist` table in supabase_schema.sql.
- **Action:** Add `waitlist` table and wire the form.

### 6. Guides: no DB content

- **Code:** Guides page is static; content is hardcoded.
- **Schema:** `guides` table exists (country, province, title, content) but is unused.
- **Action:** Optional; can remain static for V1.

---

## RLS & Realtime

- **Migration:** `20250216000000_realtime_messages_rls.sql`
- **room_memberships:** SELECT for own rows
- **messages:** SELECT and INSERT for room members only
- **Realtime:** `messages` in `supabase_realtime` publication; room members receive INSERT events.

---

## Tasks Summary

### Task A – Calgary/Alberta flow
- **Local mode city:** Switched from free-text input to dropdown (same as moving mode) so Calgary matches exactly.
- **Ensure hero rooms:** Run `supabase/migrations/20250216000001_ensure_hero_rooms.sql` so Canada, Alberta, Calgary rooms exist.
- **Result:** User onboarding with Canada → Alberta → Calgary gets exactly 3 groups.

### Task B – Realtime chat
- **Realtime subscription:** `postgres_changes` on `messages` with `room_id` filter; ping sound for messages from others.
- **RLS:** Run `supabase/migrations/20250216000000_realtime_messages_rls.sql` so room members receive INSERT events.
- **Verify:** Two browsers/devices in same room; messages appear live and play ping.

### Task C – Audit 6 hero cities
- **Migration:** `20250216000001_ensure_hero_rooms.sql` ensures Montreal, Toronto, Brampton, Calgary, Vancouver, Surrey each have country + province + city rooms.
- **Run:** `supabase db push` or paste migration in Supabase SQL Editor.

---

## DB access rules (for Cursor)

- **Allowed:** Read queries; insert/update on rooms, room_memberships, waitlist, profiles.
- **Show SQL first** for any write.
- **Never** drop tables or alter RLS without explicit confirmation.
